const TAROT_DECK = [
    { name: "Шут", emoji: "🃏", meaning: "Новые начинания, спонтанность, прыжок в неизвестность." },
    { name: "Маг", emoji: "✨", meaning: "Могущество, мастерство, созидание, проявление воли." },
    { name: "Жрица", emoji: "🌙", meaning: "Интуиция, тайны, подсознание, скрытые знания." },
    { name: "Императрица", emoji: "👑", meaning: "Изобилие, женственность, природа, забота." },
    { name: "Император", emoji: "🏛️", meaning: "Власть, структура, стабильность, авторитет." },
    { name: "Иерофант (Жрец)", emoji: "⛪", meaning: "Традиции, духовное наставничество, мудрость." },
    { name: "Влюбленные", emoji: "❤️", meaning: "Выбор, союз, гармония, любовь." },
    { name: "Колесница", emoji: "🐎", meaning: "Триумф, контроль, преодоление препятствий." },
    { name: "Сила", emoji: "🦁", meaning: "Внутренняя сила, мужество, терпение." },
    { name: "Отшельник", emoji: "🏮", meaning: "Уединение, самопознание, поиск истины." },
    { name: "Колесо Фортуны", emoji: "🎡", meaning: "Циклы, судьба, переломный момент, удача." },
    { name: "Справедливость", emoji: "⚖️", meaning: "Карма, честность, закон, объективность." },
    { name: "Повешенный", emoji: "🌀", meaning: "Пауза, новый взгляд, жертва ради цели." },
    { name: "Смерть", emoji: "⏳", meaning: "Трансформация, окончание старого, переход." },
    { name: "Умеренность", emoji: "⚖️", meaning: "Баланс, исцеление, золотая середина." },
    { name: "Дьявол", emoji: "⛓️", meaning: "Искушение, зависимость, материализм, ограничения." },
    { name: "Башня", emoji: "⚡", meaning: "Крушение иллюзий, внезапные перемены, очищение." },
    { name: "Звезда", emoji: "⭐", meaning: "Надежда, вдохновение, духовное прозрение, покой." },
    { name: "Луна", emoji: "🐺", meaning: "Иллюзии, страхи, интуиция, подсознательные тревоги." },
    { name: "Солнце", emoji: "☀️", meaning: "Радость, успех, ясность, жизненная сила." },
    { name: "Суд", emoji: "📯", meaning: "Возрождение, прощение, пробуждение, зов." },
    { name: "Мир", emoji: "🌍", meaning: "Завершение цикла, гармония, целостность, успех." }
];

document.addEventListener('DOMContentLoaded', async () => {
    // --- TELEGRAM WEB APP INIT ---
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const startBtn = document.getElementById('start-btn');
    const heroSection = document.getElementById('hero-section');
    const spreadSection = document.getElementById('spread-section');
    const resultSection = document.getElementById('result-section');
    const loadingAi = document.getElementById('loading-ai');
    const aiText = document.getElementById('ai-text');
    const resetBtn = document.getElementById('reset-btn');
    const horsesContainer = document.getElementById('horses-container');
    const historyBtn = document.getElementById('history-btn');
    const historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
    const historyModalEl = document.getElementById('historyModal');
    const historyContent = document.getElementById('history-content');
    const historyLoading = document.getElementById('history-loading');
    const historyAccordion = document.getElementById('historyAccordion');

    const zoomOverlay = document.getElementById('card-zoom-overlay');
    const zoomImg = document.getElementById('zoom-img');
    const zoomTitle = document.getElementById('zoom-title');
    const zoomDesc = document.getElementById('zoom-desc');

    if (zoomOverlay) {
        zoomOverlay.addEventListener('click', () => {
            zoomOverlay.classList.remove('active');
        });
    }

    window.openCardZoom = function (name, imagePath, description, isReversed) {
        zoomImg.src = imagePath;
        if (isReversed) {
            zoomImg.style.transform = 'rotate(180deg)';
            zoomTitle.innerHTML = `${name} <span style="color:#ff6b6b; font-size:0.7em;">(Перевернута)</span>`;
        } else {
            zoomImg.style.transform = 'none';
            zoomTitle.textContent = name;
        }
        zoomDesc.textContent = description;
        zoomOverlay.classList.add('active');
    };

    // --- THEME INIT ---
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('neuro-tarot-theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) themeToggle.checked = true;
    }
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('neuro-tarot-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('neuro-tarot-theme', 'dark');
            }
        });
    }

    // Telegram UI Elements
    const tgUserPanel = document.getElementById('tg-user-panel');
    const tgAvatar = document.getElementById('tg-avatar');
    const tgName = document.getElementById('tg-name');
    const tgEnergy = document.getElementById('tg-energy');

    // Setup MainButton for "Сделать расклад"
    tg.MainButton.text = "Сделать расклад";
    tg.MainButton.color = tg.themeParams.button_color || "#d4af37";
    tg.MainButton.textColor = tg.themeParams.button_text_color || "#1a0f24";
    // We will show/hide it based on screen state
    tg.MainButton.show();

    // Hide HTML button if we use MainButton (optional, but cleaner for mobile)
    if (tg.platform !== "unknown") {
        startBtn.classList.add('d-none');
    }

    let drawnCards = [];
    let animationTimeout;

    // Auth vars
    let userEnergy = 0;
    const initData = tg.initData || ''; // empty string fallback for local browser testing
    const tgUser = tg.initDataUnsafe?.user;

    // Fetch User Profile on Load
    try {
        // Use local user data if available from TG, otherwise fallback to API
        if (tgUser) {
            tgUserPanel.style.setProperty('display', 'flex', 'important');
            tgName.textContent = tgUser.first_name || 'Путешественник';

            // Note: Telegram avatar URLs might require proxying or might not be directly accessible due to CORS or privacy.
            // Still, we try to use it if provided (sometimes it's in photo_url).
            if (tgUser.photo_url) {
                tgAvatar.src = tgUser.photo_url;
                tgAvatar.style.display = 'block';
            }
        }

        const res = await fetch('/api/me', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-telegram-init-data': initData
            }
        });

        if (res.ok) {
            const data = await res.json();
            userEnergy = data.energy;

            // Show panel (if not already shown by local data)
            tgUserPanel.style.setProperty('display', 'flex', 'important');

            // Only overwrite if API has data and TG didn't provide it
            if (!tgUser) {
                tgName.textContent = data.first_name || 'Путешественник';
                if (data.avatar_url) {
                    tgAvatar.src = data.avatar_url;
                    tgAvatar.style.display = 'block';
                }
            }

            updateEnergyUI(userEnergy);

        } else if (window.location.hostname === 'localhost' || window.location.hostname.includes('loca.lt') || window.location.hostname.includes('netlify.app')) {
            // Mock data for local testing
            userEnergy = 9999;
            updateEnergyUI(userEnergy);
        }
    } catch (err) {
        console.error("Failed to authenticate with backend", err);
        // Fallback for local testing
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('loca.lt') || window.location.hostname.includes('netlify.app')) {
            userEnergy = 9999;
            updateEnergyUI(userEnergy);
        }
    }

    function updateEnergyUI(energy) {
        tgEnergy.textContent = `⚡️ ${energy}`;
        // Update both HTML button and TG MainButton
        if (energy > 0) {
            startBtn.innerHTML = 'Сделать расклад';
            startBtn.classList.remove('outline');

            tg.MainButton.text = "Сделать расклад";
            tg.MainButton.enable();
        } else {
            startBtn.innerHTML = 'Купить заряд (50 ⭐️)';
            startBtn.classList.add('outline');

            tg.MainButton.text = "Купить заряд (50 ⭐️)";
            tg.MainButton.enable();
        }
    }

    // Make both buttons do the same thing
    startBtn.addEventListener('click', handleStartSpread);
    tg.MainButton.onClick(handleStartSpread);

    async function handleStartSpread() {
        // ENERGY CHECK LOGIC
        if (userEnergy <= 0) {
            startBtn.innerHTML = 'Соединение...';
            tg.MainButton.text = "Соединение...";
            tg.MainButton.disable();

            try {
                const res = await fetch('/api/buy-energy', {
                    method: 'POST',
                    headers: {
                        'x-telegram-init-data': initData
                    }
                });
                const data = await res.json();
                if (data.fakeInvoice) {
                    // MOCK PAYMENT FLOW
                    if (tg.isVersionAtLeast('6.2')) {
                        tg.showAlert('Тестовый режим: Оплата симулирована успешно! Энергия начислена.');
                    } else {
                        alert('Тестовый режим: Оплата симулирована успешно! Энергия начислена.');
                    }
                    // Simulate loading delay then reload
                    setTimeout(() => window.location.reload(), 2000);
                } else if (data.invoiceUrl) {
                    // REAL PAYMENT FLOW (currently disabled in backend)
                    tg.openInvoice(data.invoiceUrl, (status) => {
                        if (status === 'paid') {
                            if (tg.isVersionAtLeast('6.2')) { tg.showAlert('Оплата успешно завершена! Ожидайте начисления энергии (пару секунд).'); } else { alert('Оплата успешно завершена! Ожидайте начисления энергии (пару секунд).'); }
                            // Polling could be added here to auto-refresh, but we'll instruct them or reload
                            setTimeout(() => window.location.reload(), 3000);
                        } else {
                            updateEnergyUI(userEnergy); // Reset button UI
                        }
                    });
                }
            } catch (err) {
                console.error(err);
                if (tg.isVersionAtLeast('6.2')) { tg.showAlert('Функция оплаты сейчас недоступна. Попробуйте обновить страницу.'); } else { alert('Функция оплаты сейчас недоступна.'); }
                // For local testing, let's just give free energy on error if no backend
                if (window.location.hostname === 'localhost' || window.location.hostname.includes('loca.lt') || window.location.hostname.includes('netlify.app')) {
                    userEnergy = 9999;
                    updateEnergyUI(userEnergy);
                    if (tg.isVersionAtLeast('6.2')) tg.showAlert('Тестовый режим: энергия начислена бесплатно');
                } else {
                    updateEnergyUI(userEnergy);
                }
            }
            return;
        }

        // DECREMENT LOCAL UI ENERGY IMMEDIATELY FOR UX
        userEnergy--;
        updateEnergyUI(userEnergy);

        heroSection.classList.add('hidden');
        tg.MainButton.hide(); // Hide main button during spread
        tg.BackButton.show(); // Show back button to allow returning

        const layout = document.querySelector('input[name="layout-options"]:checked').value;
        if (layout === 'holdem') {
            document.getElementById('holdem-section').classList.remove('hidden');
            dealHoldemCards();
        } else {
            spreadSection.classList.remove('hidden');
            dealCards();
        }
    }

    function resetApp() {
        stopHorseAnimation();
        horsesContainer.innerHTML = '';
        const slots = document.querySelectorAll('.card-slot');
        slots.forEach(slot => slot.innerHTML = '');
        drawnCards = [];
        resultSection.classList.add('hidden');
        spreadSection.classList.add('hidden');
        document.getElementById('holdem-section').classList.add('hidden');
        document.getElementById('holdem-container').innerHTML = '';
        document.getElementById('deck-area').innerHTML = '';
        document.getElementById('holdem-done-btn').classList.add('hidden');

        heroSection.classList.remove('hidden');
        aiText.innerHTML = '';
        aiText.classList.add('hidden');
        loadingAi.classList.remove('hidden');

        tg.BackButton.hide();
        tg.MainButton.text = "Сделать расклад";
        tg.MainButton.show();
    }

    let isHistoryOpen = false;
    historyModalEl.addEventListener('show.bs.modal', () => {
        isHistoryOpen = true;
        tg.BackButton.show();
    });
    historyModalEl.addEventListener('hide.bs.modal', () => {
        isHistoryOpen = false;
        if (heroSection.classList.contains('hidden')) {
            tg.BackButton.show(); // keep it if we are in spread view
        } else {
            tg.BackButton.hide();
        }
    });

    resetBtn.addEventListener('click', resetApp);
    tg.BackButton.onClick(() => {
        if (isHistoryOpen) {
            historyModal.hide();
        } else {
            resetApp();
        }
    });

    // --- HISTORY MODAL LOGIC ---
    historyBtn.addEventListener('click', async () => {
        historyLoading.classList.remove('d-none');
        historyAccordion.innerHTML = '';
        historyModal.show();

        try {
            const res = await fetch('/api/history', {
                headers: {
                    'x-telegram-init-data': initData
                }
            });
            const data = await res.json();

            historyLoading.classList.add('d-none');

            if (data.history && data.history.length > 0) {
                let accordionHtml = '';
                data.history.forEach((reading, idx) => {
                    const dateStr = new Date(reading.created_at).toLocaleString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    const cardsArray = typeof reading.cards_drawn === 'string' ? JSON.parse(reading.cards_drawn) : reading.cards_drawn;
                    const cardsList = cardsArray.map(c => `${c.name} ${c.reversed ? '(П)' : ''}`).join(', ');

                    accordionHtml += `
                        <div class="accordion-item bg-transparent border-0 mb-3">
                            <h2 class="accordion-header" id="heading-${idx}">
                                <button class="accordion-button collapsed glass-panel text-gold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${idx}" aria-expanded="false" aria-controls="collapse-${idx}">
                                    ${dateStr}
                                </button>
                            </h2>
                            <div id="collapse-${idx}" class="accordion-collapse collapse" aria-labelledby="heading-${idx}" data-bs-parent="#historyAccordion">
                                <div class="accordion-body text-light-alpha">
                                    <p style="font-size: 0.85em; color: #aaa;"><strong>Карты:</strong> ${cardsList}</p>
                                    <hr style="border-color: rgba(255,215,0,0.3)">
                                    <div class="history-interpretation">${reading.interpretation}</div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                historyAccordion.innerHTML = accordionHtml;
            } else {
                historyAccordion.innerHTML = '<p class="text-center text-muted mt-3">Ваша Книга Судеб пока пуста. Сделайте свой первый расклад.</p>';
            }
        } catch (err) {
            console.error("Failed to load history", err);
            historyLoading.classList.add('d-none');
            historyAccordion.innerHTML = '<p class="text-center text-danger mt-3">Не удалось загрузить историю. Пожалуйста, попробуйте позже.</p>';
        }
    });

    function getRandomCards(count) {
        const shuffled = [...TAROT_DECK].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function dealCards() {
        drawnCards = getRandomCards(7);
        const slots = document.querySelectorAll('.card-slot');

        slots.forEach((slot, index) => {
            setTimeout(() => {
                const cardData = drawnCards[index];

                // Reversed logic
                const isReversed = Math.random() > 0.7;
                drawnCards[index].isReversed = isReversed;

                const cardEl = document.createElement('div');
                cardEl.className = 'tarot-card dealt';

                const cardIndex = TAROT_DECK.findIndex(c => c.name === cardData.name);
                const imagePath = `cards/${cardIndex.toString().padStart(2, '0')}.jpg`;

                // Calculate dynamic font size to prevent overflow for long strings
                const nameLen = cardData.name.length;
                let nameFontSize = isReversed ? 0.65 : 0.75;
                if (nameLen > 13) nameFontSize = isReversed ? 0.48 : 0.52;
                else if (nameLen > 9) nameFontSize = isReversed ? 0.55 : 0.62;

                cardEl.innerHTML = `
                    <div class="tarot-card-inner">
                        <div class="tarot-card-back"></div>
                        <div class="tarot-card-front" style="transform: rotateY(180deg)">
                            <img src="${imagePath}" alt="${cardData.name}" class="tarot-card-image" onerror="this.onerror=null; this.src='https://placehold.co/100x150/111/d4af37?text=*'; this.style.display='block'; this.nextElementSibling.style.display='none';">
                            <div class="tarot-img-placeholder" style="display:none; font-size:2rem; margin-bottom:5px;">${cardData.emoji}</div>
                            <div class="tarot-name" style="font-size: ${nameFontSize}rem; line-height: 1.1;">${cardData.name}</div>
                            ${isReversed ? '<div style="font-size: 0.50rem; color: #ff6b6b; margin-top: 2px;">(Перевернута)</div>' : ''}
                            <div style="font-size: 0.45rem; margin-top: ${isReversed ? '2px' : '4px'}; padding: 0 4px; line-height: 1.1;">${cardData.meaning}</div>
                        </div>
                    </div>
                `;

                slot.appendChild(cardEl);

                // Add click event to flip manually
                cardEl.addEventListener('click', function () {
                    if (!this.classList.contains('flipped')) {
                        this.classList.add('flipped');
                        checkAllFlipped();
                    } else {
                        window.openCardZoom(cardData.name, imagePath, cardData.meaning, isReversed);
                    }
                });

                // Auto flip after all cards are dealt with a very long reading pause
                setTimeout(() => {
                    if (!cardEl.classList.contains('flipped')) {
                        cardEl.classList.add('flipped');
                        checkAllFlipped();
                    }
                }, 4000 + (index * 1500)); // 1.5s reading time per card

            }, index * 800); // 800ms delay between each card dealing
        });
    }

    function checkAllFlipped() {
        const flippedCards = document.querySelectorAll('.tarot-card.flipped');
        if (flippedCards.length === 7) {
            setTimeout(() => {
                // Automatically show interpretation instead of displaying a button
                resultSection.classList.remove('hidden');
                generateInterpretation();
            }, 800);
        }
    }

    function dealHoldemCards() {
        const deckArea = document.getElementById('deck-area');
        const holdemContainer = document.getElementById('holdem-container');
        deckArea.innerHTML = '';
        holdemContainer.innerHTML = '';

        // Draw cards
        const deckCopy = [...TAROT_DECK];
        for (let i = deckCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
        }
        drawnCards = deckCopy.slice(0, 7).map(c => ({ ...c, isReversed: Math.random() > 0.8 }));

        // 1. Render stacked deck cards
        for (let i = 0; i < 22; i++) {
            const dCard = document.createElement('div');
            dCard.className = 'deck-card';
            dCard.style.top = `-${i * 1.5}px`;
            dCard.style.zIndex = i;
            if (i === 21) dCard.classList.add('top-deck-card');
            deckArea.appendChild(dCard);
        }

        // 2. Deal 7 cards to table
        setTimeout(() => {
            drawnCards.forEach((cardData, index) => {
                const isReversed = cardData.isReversed;
                const cardIndex = TAROT_DECK.findIndex(c => c.name === cardData.name);
                const imageFilename = cardIndex.toString().padStart(2, '0') + '.jpg';
                const imagePath = `cards/${imageFilename}`;

                // Calculate dynamic font size for Holdem Mode
                const nameLen = cardData.name.length;
                let hNameFontSize = isReversed ? 0.45 : 0.55;
                if (nameLen > 13) hNameFontSize = isReversed ? 0.35 : 0.40;
                else if (nameLen > 9) hNameFontSize = isReversed ? 0.40 : 0.48;

                const slot = document.createElement('div');
                slot.className = 'holdem-card-slot';

                const cardEl = document.createElement('div');
                cardEl.className = 'holdem-card';
                cardEl.style.animation = `dealToHoldem 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards ${index * 0.2}s`;
                cardEl.style.opacity = '0'; // hide initially

                cardEl.innerHTML = `
                    <div class="tarot-card-inner">
                        <!-- Back -->
                        <div class="deck-card" style="box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>
                        <!-- Front -->
                        <div class="tarot-card-front" style="transform: rotateY(180deg); position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: #111; border: 1px solid var(--gold); border-radius: 5px; padding: 2px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
                            <img src="${imagePath}" style="width: 100%; height: 60%; object-fit: cover; border-radius: 3px;" onerror="this.onerror=null; this.src='https://placehold.co/100x150/111/d4af37?text=*';">
                            <div style="font-size: ${hNameFontSize}rem; color: var(--gold); font-family: 'Cinzel', serif; text-align: center; margin-top: 3px; font-weight: bold; line-height: 1.1;">${cardData.name}</div>
                            ${isReversed ? '<div style="font-size: 0.38rem; color: #ff6b6b; margin-top: 1px;">(Перевернута)</div>' : ''}
                        </div>
                    </div>
                `;

                const subtitle = document.createElement('div');
                subtitle.className = 'holdem-subtitle';
                subtitle.innerText = "";

                slot.appendChild(cardEl);
                slot.appendChild(subtitle);
                holdemContainer.appendChild(slot);

                // Clicking flips the card on the table
                cardEl.addEventListener('click', function () {
                    if (!this.classList.contains('flipped')) {
                        this.classList.add('flipped');
                        subtitle.innerText = cardData.name + (isReversed ? ' (П)' : '');
                        subtitle.style.opacity = '1';
                        checkHoldemFlipped();
                    } else {
                        window.openCardZoom(cardData.name, imagePath, cardData.meaning, isReversed);
                    }
                });
            });

            // 3. Auto-flip Holdem cards sequentially
            setTimeout(() => {
                const holdemCards = document.querySelectorAll('.holdem-card');
                holdemCards.forEach((card, idx) => {
                    setTimeout(() => {
                        card.click();
                    }, idx * 600);
                });
            }, 1000);
        }, 800);

        function checkHoldemFlipped() {
            const flippedCount = document.querySelectorAll('.holdem-card.flipped').length;
            if (flippedCount === 7) {
                setTimeout(() => {
                    resultSection.classList.remove('hidden');
                    resultSection.scrollIntoView({ behavior: 'smooth' });
                    generateInterpretation();
                }, 800);
            }
        }
    }

    async function generateInterpretation() {
        let loadingInterval;
        try {
            const loadingText = document.getElementById('loading-text');
            const phrases = [
                "Нейросеть считывает нити судьбы...",
                "Вглядываемся в арканы...",
                "Анализируем скрытые смыслы...",
                "Духи нашептывают ответ...",
                "Формируем уникальное толкование..."
            ];
            let phraseIdx = 0;
            if (loadingText) {
                loadingInterval = setInterval(() => {
                    phraseIdx = (phraseIdx + 1) % phrases.length;
                    loadingText.innerText = phrases[phraseIdx];
                }, 1400);
            }

            const userQuery = document.getElementById('user-query')?.value?.trim() || '';
            // Fetch real AI response from backend
            const res = await fetch('/api/readings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-telegram-init-data': initData
                },
                body: JSON.stringify({
                    query: userQuery,
                    cards: drawnCards.map(c => ({ name: c.name, reversed: c.isReversed }))
                })
            });

            const data = await res.json();

            if (loadingInterval) clearInterval(loadingInterval);

            loadingAi.classList.add('hidden');
            aiText.classList.remove('hidden');

            let finalHtml = data.interpretation || "<p>Духи молчат...</p>";

            // Strip out random markdown HTML wrapper blocks if ChatGPT hallucinates them
            finalHtml = finalHtml.replace(/```html\s*/i, '').replace(/```\s*$/i, '');

            // 1. Process structured interpretation blocks
            const parser = new DOMParser();
            const doc = parser.parseFromString(finalHtml, 'text/html');
            const blocks = doc.querySelectorAll('.interpretation-block');

            blocks.forEach(block => {
                let cardName = block.getAttribute('data-card');
                if (!cardName) return;

                // Match with drawnCards (Robust bi-directional substring match for ChatGPT inconsistencies)
                const normalize = str => str.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]/g, '');
                const cNameNormalized = normalize(cardName);

                let cardData = drawnCards.find(c => c.name === cardName);
                if (!cardData) {
                    cardData = drawnCards.find(c => {
                        const dbNameNormalized = normalize(c.name);
                        return dbNameNormalized.includes(cNameNormalized) || cNameNormalized.includes(dbNameNormalized);
                    });
                }

                if (cardData) {
                    const cardIndex = TAROT_DECK.findIndex(c => c.name === cardData.name);
                    const imagePath = `cards/${cardIndex.toString().padStart(2, '0')}.jpg`;

                    // Safely pull in any orphaned paragraphs ChatGPT mistakenly placed outside the div!
                    let nextNode = block.nextSibling;
                    while (nextNode) {
                        if (nextNode.nodeType === Node.ELEMENT_NODE &&
                            (nextNode.classList.contains('interpretation-block') || nextNode.classList.contains('ai-summary'))) {
                            break;
                        }
                        let nodeToMove = nextNode;
                        nextNode = nextNode.nextSibling;
                        block.appendChild(nodeToMove);
                    }

                    const innerHtml = block.innerHTML;

                    const encName = encodeURIComponent(cardData.name);
                    const encDesc = encodeURIComponent(cardData.meaning);

                    block.innerHTML = `
                        <div style="position: relative; display: inline-block; flex-shrink: 0; width: 60px; height: 95px;">
                            <img src="${imagePath}" class="interpretation-img" style="cursor: pointer; position: absolute; top:0; left:0; width: 100%; height: 100%; transition: transform 0.2s; margin: 0;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';" onclick="window.openCardZoom(decodeURIComponent('${encName}'), '${imagePath}', decodeURIComponent('${encDesc}'), ${cardData.isReversed})" onerror="this.onerror=null; this.src='https://placehold.co/100x150/111/d4af37?text=*';">
                            <div style="position: absolute; bottom: -8px; right: -8px; font-size: 1.1rem; pointer-events: none; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">🔍</div>
                        </div>
                        <div class="interpretation-text">
                            ${innerHtml}
                        </div>
                    `;
                }
            });

            if (blocks.length > 0) {
                finalHtml = doc.body.innerHTML;
            } else {
                // Legacy support for ---НАПУТСТВИЕ---
                finalHtml = finalHtml.replace(/<p>---НАПУТСТВИЕ---<\/p>/g, '---НАПУТСТВИЕ---');
                if (finalHtml.includes('---НАПУТСТВИЕ---')) {
                    const parts = finalHtml.split('---НАПУТСТВИЕ---');
                    finalHtml = parts[0].trim() + `\n<div class="ai-summary">
                        <strong style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; display: block; margin-bottom: 10px; opacity: 0.8;">🔮 Главный Итог Расклада:</strong>
                        ${parts[1].trim()}
                    </div>`;
                }
            }

            // Fallback for missing AI summary wrapper
            if (!finalHtml.includes('class="ai-summary"')) {
                finalHtml = finalHtml.replace(/<p>([^<]+)<\/p>$/, '<div class="ai-summary"><strong style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; display: block; margin-bottom: 10px; opacity: 0.8;">🔮 Главный Итог Расклада:</strong><p>$1</p></div>');
            }

            // Wrap in main box if it's not already
            if (!finalHtml.startsWith('<div class="ai-reading-box"')) {
                finalHtml = `<div class="ai-reading-box">${finalHtml}</div>`;
            }

            // Render it
            aiText.innerHTML = finalHtml;

            // Format markdown-like output (bold text)
            aiText.innerHTML = aiText.innerHTML.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gold">$1</strong>');

        } catch (e) {
            if (loadingInterval) clearInterval(loadingInterval);
            console.error(e);
            loadingAi.classList.add('hidden');
            aiText.classList.remove('hidden');
            // stopHorseAnimation(); <- Removed
            aiText.innerHTML = "<p>Произошла мистическая ошибка связи.</p>";
        }
    }

    // Advanced Typewriter Effect supporting HTML Tags
    function typeWriterHTML(htmlString, targetElement, speed = 20) {
        // Create an invisible wrapper to parse the HTML string easily
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const nodes = Array.from(doc.body.childNodes);

        let currentNodeIndex = 0;

        function processNextNode() {
            if (currentNodeIndex >= nodes.length) {
                // Animation finished
                return;
            }

            const node = nodes[currentNodeIndex];

            if (node.nodeType === Node.TEXT_NODE) {
                // It's a text node, type it out
                const text = node.textContent;
                let charIndex = 0;
                const textSpan = document.createElement('span');
                targetElement.appendChild(textSpan);

                function typeChar() {
                    if (charIndex < text.length) {
                        textSpan.textContent += text.charAt(charIndex);
                        charIndex++;
                        // Scroll to bottom automatically while typing
                        targetElement.parentElement.scrollTop = targetElement.parentElement.scrollHeight;
                        setTimeout(typeChar, speed);
                    } else {
                        currentNodeIndex++;
                        processNextNode();
                    }
                }
                typeChar();
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // It's an HTML tag, clone it but empty it, append it to target, and recurse into its children
                const clonedNode = node.cloneNode(false); // shallow clone
                targetElement.appendChild(clonedNode);

                const childNodes = Array.from(node.childNodes);

                if (childNodes.length > 0) {
                    // Typewriter inside this element
                    let localChildIndex = 0;

                    function processLocalChild() {
                        if (localChildIndex >= childNodes.length) {
                            currentNodeIndex++;
                            processNextNode();
                            return;
                        }

                        const child = childNodes[localChildIndex];
                        if (child.nodeType === Node.TEXT_NODE) {
                            const text = child.textContent;
                            let charIndex = 0;
                            const textSpan = document.createElement('span');
                            clonedNode.appendChild(textSpan);

                            function typeChar() {
                                if (charIndex < text.length) {
                                    textSpan.textContent += char.charAt(charIndex) || text.charAt(charIndex);
                                    // small hack, js inner variables closure workaround
                                    charIndex++;
                                    setTimeout(typeChar, speed);
                                } else {
                                    localChildIndex++;
                                    processLocalChild();
                                }
                            }
                            typeChar();
                        } else {
                            // Deep recursion for nested elements (like <strong> inside <p>)
                            clonedNode.appendChild(child.cloneNode(true)); // For simplicity, instantly append nested tags if not pure text
                            localChildIndex++;
                            processLocalChild();
                        }
                    }
                    processLocalChild();
                } else {
                    // Empty element (like <br> or <hr>)
                    currentNodeIndex++;
                    processNextNode();
                }
            } else {
                // Comments or other node types
                currentNodeIndex++;
                processNextNode();
            }
        }

        // Simpler, robust HTML typewriter approach using a library-less technique:
        targetElement.innerHTML = '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        let i = 0;
        let isTag = false;
        let text = htmlString;

        function type() {
            if (i < text.length) {
                const char = text.charAt(i);

                if (char === '<') isTag = true;
                if (char === '>') isTag = false;

                targetElement.innerHTML = text.slice(0, i + 1);
                i++;

                // If we are inside an HTML tag, skip instantly so we don't break rendering
                if (isTag) {
                    type();
                } else {
                    targetElement.parentElement.scrollTop = targetElement.parentElement.scrollHeight;
                    setTimeout(type, speed);
                }
            }
        }

        type();
    }

    // --- GYPSY ANIMATION (REMOVED) ---
    function startHorseAnimation() {
        // horsesContainer.innerHTML = '';
    }

    function stopHorseAnimation() {
        // clearTimeout(animationTimeout);
        // horsesContainer.innerHTML = '';
    }
});
