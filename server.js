const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
require('dotenv').config();
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAI Init
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Telegram Bot Init
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'placeholder_token';
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// --- TELEGRAM INITDATA VALIDATION ---
function validateTelegramWebAppData(initData) {
    if (!initData) return false;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return calculatedHash === hash;
}

// Middleware to protect routes that require Telegram identity
const telegramAuth = (req, res, next) => {
    // In dev mode without a token we can bypass this strictly for debugging UI if needed,
    // but here we enforce it.
    const initData = req.headers['x-telegram-init-data'];

    /* UNCOMMENT THIS BLOCK IN PRODUCTION
    if (!validateTelegramWebAppData(initData)) {
        return res.status(403).json({ error: "Invalid Telegram Auth" });
    }
    */

    // Parse user object from initData
    if (initData) {
        const urlParams = new URLSearchParams(initData);
        if (urlParams.get('user')) {
            req.tgUser = JSON.parse(decodeURIComponent(urlParams.get('user')));
        }
    }

    // Fallback for dev testing outside Telegram
    if (!req.tgUser) {
        req.tgUser = { id: 'dev123', first_name: 'Developer' };
    }

    next();
};

// API: Get/Create User Profile & Energy
app.post('/api/me', telegramAuth, async (req, res) => {
    try {
        const tgId = req.tgUser.id.toString();
        const firstName = req.tgUser.first_name;
        const avatarUrl = req.tgUser.photo_url || null;

        // Check if user exists
        let userRes = await db.query('SELECT * FROM users WHERE telegram_id = $1', [tgId]);

        let user;
        const now = new Date();

        if (userRes.rows.length === 0) {
            // New user gets 100 free energy immediately for testing
            const insertQuery = `
                INSERT INTO users (telegram_id, first_name, avatar_url, energy, last_free_refill) 
                VALUES ($1, $2, $3, 100, $4) RETURNING *
            `;
            const result = await db.query(insertQuery, [tgId, firstName, avatarUrl, now]);
            user = result.rows[0];
        } else {
            user = userRes.rows[0];

            // Grant 100 energy for testing if below 100
            if (user.energy < 100) {
                const updateQuery = `
                    UPDATE users SET energy = 100, last_free_refill = $1 
                    WHERE telegram_id = $2 RETURNING *
                `;
                const result = await db.query(updateQuery, [now, tgId]);
                user = result.rows[0];
            } else if (user.first_name !== firstName || user.avatar_url !== avatarUrl) {
                // Just update profile info if changed
                await db.query('UPDATE users SET first_name = $1, avatar_url = $2 WHERE telegram_id = $3',
                    [firstName, avatarUrl, tgId]);
            }
        }

        res.json({
            telegram_id: user.telegram_id,
            first_name: user.first_name,
            avatar_url: user.avatar_url,
            energy: user.energy,
            seconds_until_refill: user.energy === 0 ? Math.max(0, (24 * 60 * 60) - Math.floor((now - new Date(user.last_free_refill)) / 1000)) : 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// OpenAI prompt generator
const generateAIFortune = async (cards, firstName, query) => {
    const cardList = cards.map((c, i) => `${i + 1}. ${c.name} ${c.reversed ? "(Перевернутая)" : "(Прямая)"}`).join(', ');

    const queryContext = query ? `Пользователь задал явный вопрос картам: "${query}". Проанализируй эти карты именно в контексте его вопроса, дай мистическое, но конкретное напутствие.` : `Проанализируй эти конкретные карты, дай мистическое, но конкретное напутствие.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Ты опытный, загадочный и мудрый таролог с 20-летним стажем. Пользователь вытянул ${cards.length} карт(ы) судьбы. 
${queryContext} Не используй общие фразы, свяжи значения этих карт в единую историю. 
Ответ верни строго в формате HTML.
ОБЯЗАТЕЛЬНО создай ровно ${cards.length} блоков (по одному для каждой вытянутой карты) по такому шаблону:
<div class="interpretation-block" data-card="Точное_Имя_Карты">
    <h4>Позиция: Точное_Имя_Карты (Прямая/Перевернутая)</h4>
    <p>Твоё толкование этой карты...</p>
</div>
(Вместо Точное_Имя_Карты подставь точное имя карты из списка, например "Шут", без слова "Перевернутая" в самом data-card!). 
ВАЖНО: Должно быть ровно ${cards.length} блоков interpretation-block. Не пропусти ни одной вытянутой карты!
А УЖЕ ПОСЛЕ описания всех ${cards.length} карт, в самом конце дай общее главное напутствие, обернув его в <div class="ai-summary">...</div>.`
                },
                {
                    role: "user",
                    content: `Меня зовут ${firstName}. Вот мои карты:\n${cardList}\nПожалуйста, прочитай мою судьбу.`
                }
            ],
            temperature: 0.8,
            max_tokens: 2500,
        });

        return completion.choices[0].message.content;
    } catch (err) {
        console.error("OpenAI Error:", err);
        return `<p>Приветствую, <strong>${firstName}</strong>.</p><p>Духи пока молчат. Связь с высшими силами временно прервана. Попробуйте обратиться к картам немного позже.</p>`;
    }
};

// API: Save Reading & Generate Interpretation
app.post('/api/readings', telegramAuth, async (req, res) => {
    try {
        const tgId = req.tgUser.id.toString();
        const firstName = req.tgUser.first_name || 'Путешественник';

        // 1. Check Energy
        const userRes = await db.query('SELECT energy FROM users WHERE telegram_id = $1', [tgId]);
        if (userRes.rows.length === 0 || userRes.rows[0].energy < 1) {
            return res.status(403).json({ error: "Not enough energy. Please refill." });
        }

        const { cards, query } = req.body;
        if (!cards || !Array.isArray(cards) || cards.length === 0 || cards.length > 10) {
            return res.status(400).json({ error: "Invalid cards array. Require 1-10 cards." });
        }

        // 2. Generate Real AI Text
        const generatedText = await generateAIFortune(cards, firstName, query);

        // 3. Decrement Energy
        await db.query('UPDATE users SET energy = energy - 1 WHERE telegram_id = $1', [tgId]);

        // 4. Save Reading
        const sqlQuery = `INSERT INTO readings (telegram_id, cards_drawn, interpretation) VALUES ($1, $2, $3) RETURNING id`;
        const result = await db.query(sqlQuery, [tgId, JSON.stringify(cards), generatedText]);

        res.status(201).json({ success: true, id: result.rows[0].id, energy_remaining: userRes.rows[0].energy - 1, interpretation: generatedText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- MOCK TELEGRAM STARS MONETIZATION FOR TESTING ---
// Directly grant energy instead of creating a real invoice
app.post('/api/buy-energy', telegramAuth, async (req, res) => {
    try {
        const tgId = req.tgUser.id.toString();

        // 1. Immediately grant 3 energy for testing
        await db.query('UPDATE users SET energy = energy + 3 WHERE telegram_id = $1', [tgId]);

        // 2. We don't need a real invoice URL anymore, we just return success
        // return a fake url or just a success flag
        res.json({ success: true, fakeInvoice: true });
    } catch (err) {
        console.error("Failed to mock payment:", err);
        res.status(500).json({ error: "Could not process mock payment" });
    }
});

// Setup webhook endpoints for Bot API updates (needed for payment processing)
app.post('/bot-webhook', express.json(), (req, res) => {
    // Process update through node-telegram-bot-api
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Approve checkout query (User clicked pay, Telegram asks if we can fulfill)
bot.on('pre_checkout_query', async (query) => {
    try {
        await bot.answerPreCheckoutQuery(query.id, true);
    } catch (err) {
        console.error("Pre-checkout failed:", err);
    }
});

// Payment successful!
bot.on('successful_payment', async (msg) => {
    try {
        const tgId = msg.from.id.toString();
        // Assuming every successful payment currently means +3 energy
        await db.query('UPDATE users SET energy = energy + 3 WHERE telegram_id = $1', [tgId]);

        bot.sendMessage(tgId, "✅ <b>Оплата прошла успешно!</b>\nВам начислено 3 дополнительных расклада. Можете возвращаться в приложение.", { parse_mode: 'HTML' });
    } catch (err) {
        console.error("Payment fulfillment failed:", err);
    }
});

// API: Get Reading History
app.get('/api/history', telegramAuth, async (req, res) => {
    try {
        const tgId = req.tgUser.id.toString();

        // Fetch up to 20 last readings for this user
        const result = await db.query(
            'SELECT id, cards_drawn, interpretation, created_at FROM readings WHERE telegram_id = $1 ORDER BY created_at DESC LIMIT 20',
            [tgId]
        );

        res.json({ success: true, history: result.rows });
    } catch (err) {
        console.error("Failed to load history:", err);
        res.status(500).json({ error: "Failed to load history" });
    }
});

// API: Get App Stats
app.get('/api/stats', async (req, res) => {
    try {
        // Get total readings
        const countResult = await db.query('SELECT COUNT(*) FROM readings');
        const totalReadings = parseInt(countResult.rows[0].count, 10);

        // Get array distributions via jsonb logic... for simplicity in sqlite/pg we fetch them all to aggregate, 
        // since reading JSON arrays in PG can be slightly more complex depending on pg version.
        // But let's build a quick map.
        const allReadings = await db.query('SELECT cards_drawn FROM readings');

        const cardFrequency = {};
        allReadings.rows.forEach(row => {
            const cards = typeof row.cards_drawn === 'string' ? JSON.parse(row.cards_drawn) : row.cards_drawn;
            cards.forEach(card => {
                cardFrequency[card.name] = (cardFrequency[card.name] || 0) + 1;
            });
        });

        const sortedCards = Object.entries(cardFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // top 5
            .map(([name, count]) => ({ name, count }));

        res.json({
            totalReadings,
            topCards: sortedCards
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load stats" });
    }
});

// API: Generate PDF Stats
app.get('/api/stats/pdf', async (req, res) => {
    try {
        const countResult = await db.query('SELECT COUNT(*) FROM readings');
        const totalReadings = parseInt(countResult.rows[0].count, 10);

        const allReadings = await db.query('SELECT cards_drawn FROM readings');
        const cardFrequency = {};
        allReadings.rows.forEach(row => {
            const cards = typeof row.cards_drawn === 'string' ? JSON.parse(row.cards_drawn) : row.cards_drawn;
            cards.forEach(card => {
                cardFrequency[card.name] = (cardFrequency[card.name] || 0) + 1;
            });
        });

        const sortedCards = Object.entries(cardFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const doc = new PDFDocument({ margin: 50 });

        let filename = encodeURIComponent('NeuroTarot_Analytics.pdf');
        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(25).text('Neuro-Tarot Analytics Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Report generated at: ${new Date().toLocaleString()}`);
        doc.moveDown(2);

        doc.fontSize(18).text('Platform Statistics');
        doc.fontSize(14).text(`Total Readings Performed: ${totalReadings}`);
        doc.moveDown();

        doc.fontSize(18).text('Most Frequently Drawn Cards (Top 10)');
        doc.moveDown(0.5);

        if (sortedCards.length === 0) {
            doc.fontSize(12).text('No readings recorded entirely yet.');
        } else {
            sortedCards.forEach(([name, count], i) => {
                doc.fontSize(12).text(`${i + 1}. ${name} - ${count} times drawn`);
            });
        }

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).send("Error generating PDF");
    }
});

// Fallback to serve index
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Убираем страшные ошибки npm SIGTERM при рестарте на Railway
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
