const TAROT_DECK = [
    { name: "Шут", emoji: "🃏", meaning: "Новые начинания, спонтанность, прыжок в неизвестность." },
    { name: "Маг", emoji: "✨", meaning: "Могущество, мастерство, созидание, проявление воли." },
    { name: "Жрица", emoji: "🌙", meaning: "Интуиция, тайны, подсознание, скрытые знания." },
    { name: "Императрица", emoji: "👑", meaning: "Изобилие, женственность, природа, забота." },
    { name: "Император", emoji: "🏛️", meaning: "Власть, структура, стабильность, авторитет." },
    { name: "Жрец", emoji: "📜", meaning: "Традиции, духовное наставничество, мудрость." },
    { name: "Влюбленные", emoji: "❤️", meaning: "Выбор, союз, гармония, партнерство." },
    { name: "Колесница", emoji: "движение", meaning: "Триумф, контроль, преодоление препятствий." },
    { name: "Сила", emoji: "🦁", meaning: "Внутренняя сила, мужество, терпение, сострадание." },
    { name: "Отшельник", emoji: "🕯️", meaning: "Самоанализ, одиночество, поиск истины." },
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
    startBtn.style.display = 'none';

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
            startBtn.textContent = 'Сделать расклад';
            startBtn.classList.remove('outline');

            tg.MainButton.text = "Сделать расклад";
            tg.MainButton.enable();
        } else {
            startBtn.innerHTML = '<i class="fa-solid fa-star text-gold pe-2"></i>Купить заряд (50 ⭐️)';
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
            startBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Соединение...';
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
        spreadSection.classList.remove('hidden');

        tg.MainButton.hide(); // Hide main button during spread
        tg.BackButton.show(); // Show back button to allow returning

        startHorseAnimation();
        dealCards();
    }

    function resetApp() {
        stopHorseAnimation();
        horsesContainer.innerHTML = '';
        const slots = document.querySelectorAll('.card-slot');
        slots.forEach(slot => slot.innerHTML = '');
        drawnCards = [];
        resultSection.classList.add('hidden');
        spreadSection.classList.add('hidden');
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

                cardEl.innerHTML = `
                    <div class="tarot-card-inner">
                        <div class="tarot-card-back"></div>
                        <div class="tarot-card-front" style="transform: rotateY(180deg) ${isReversed ? 'rotateZ(180deg)' : ''}">
                            <div class="tarot-img-placeholder">${cardData.emoji}</div>
                            <div class="tarot-name">${cardData.name}</div>
                            ${isReversed ? '<div style="font-size: 0.6rem; margin-top: 5px; color: #ff6b6b;">(Перевернута)</div>' : ''}
                            <div style="font-size: 0.55rem; margin-top: 8px; padding: 0 4px; line-height: 1.2;">${cardData.meaning}</div>
                        </div>
                    </div>
                `;

                slot.appendChild(cardEl);

                // Add click event to flip manually
                cardEl.addEventListener('click', function () {
                    if (!this.classList.contains('flipped')) {
                        this.classList.add('flipped');
                        if (isReversed) {
                            setTimeout(() => {
                                const front = this.querySelector('.tarot-card-front');
                                front.style.transition = 'transform 0.6s ease';
                                front.style.transform = 'rotateY(180deg) rotateZ(0deg)';
                            }, 600);
                        }
                        checkAllFlipped();
                    }
                });

                // Auto flip after all cards are dealt
                setTimeout(() => {
                    if (!cardEl.classList.contains('flipped')) {
                        cardEl.classList.add('flipped');
                        if (isReversed) {
                            setTimeout(() => {
                                const front = cardEl.querySelector('.tarot-card-front');
                                front.style.transition = 'transform 0.6s ease';
                                front.style.transform = 'rotateY(180deg) rotateZ(0deg)';
                            }, 600);
                        }
                        checkAllFlipped();
                    }
                }, 2800 + (index * 200));

            }, index * 400); // 400ms delay between each card dealing
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

    async function generateInterpretation() {
        try {
            // Fetch real AI response from backend
            const res = await fetch('/api/readings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-telegram-init-data': initData
                },
                body: JSON.stringify({
                    cards: drawnCards.map(c => ({ name: c.name, reversed: c.isReversed }))
                })
            });

            const data = await res.json();

            loadingAi.classList.add('hidden');
            aiText.classList.remove('hidden');
            aiText.innerHTML = ''; // Setup for typewriter
            stopHorseAnimation();

            const finalHtml = data.interpretation || "<p>Духи молчат...</p>";

            // TYPEWRITER ANIMATION (Parses HTML tags instantly, types text nodes)
            typeWriterHTML(finalHtml, aiText, 15);

        } catch (e) {
            console.error(e);
            loadingAi.classList.add('hidden');
            aiText.classList.remove('hidden');
            stopHorseAnimation();
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

    // --- GYPSY ANIMATION ---
    function startHorseAnimation() {
        horsesContainer.innerHTML = '';

        // Scene 1: Horse is standing
        const horse = document.createElement('img');
        horse.src = 'horse.gif';
        horse.className = 'horse-victim';

        // Scene 2: Gypsy runs in and steals it
        const gypsy = document.createElement('img');
        gypsy.src = 'gypsy.gif';
        gypsy.className = 'gypsy-thief';

        horsesContainer.appendChild(horse);
        horsesContainer.appendChild(gypsy);

        // Remove horse when gypsy reaches it (approx 2s into the 4s animation)
        animationTimeout = setTimeout(() => {
            if (horse.parentNode) horse.remove();
        }, 1800);

        // Scene 3: Campfire cooking
        setTimeout(() => {
            if (gypsy.parentNode) gypsy.remove();

            const campfire = document.createElement('div');
            campfire.className = 'campfire-scene';
            campfire.innerHTML = `
                <img src="https://media.giphy.com/media/l41JUIOzaE8pXhKZW/giphy.gif" alt="Campfire">
                <span>Вкусная конина!</span>
            `;
            horsesContainer.appendChild(campfire);

            // Clean up campfire after it fades out
            setTimeout(() => {
                if (campfire.parentNode) campfire.remove();
            }, 5000);

        }, 4500);
    }

    function stopHorseAnimation() {
        clearTimeout(animationTimeout);
        horsesContainer.innerHTML = '';
    }
});
