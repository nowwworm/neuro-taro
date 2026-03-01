const { test, expect } = require('@playwright/test');

test.describe('Neuro-Tarot E2E Scenarios', () => {

    test.beforeEach(async ({ page }) => {
        // Mock the backend API responses so tests are stable and do not depend on the live tunnel
        await page.route('**/api/me', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ energy: 9999, first_name: 'AutoTestUser' })
            });
        });

        await page.route('**/api/readings', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 1, interpretation: '<p>Приветствую, AutoTestUser</p><p>Mock result</p>', energy_remaining: 9998 })
            });
        });

        await page.route('**/api/stats', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalReadings: 42,
                    topCards: [
                        { name: "Шут", count: 12 },
                        { name: "Маг", count: 8 }
                    ]
                })
            });
        });
    });

    test('User can open the app and perform a tarot reading', async ({ page }) => {
        // Listen to console for debugging
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

        await test.step('Open the main page', async () => {
            await page.goto('/');

            // We manually simulate the Telegram WebApp initData 
            await page.evaluate(() => {
                window.Telegram = {
                    WebApp: {
                        ready: () => { },
                        expand: () => { },
                        initData: 'query_id=test&user=%7B%22id%22%3A1234567%2C%22first_name%22%3A%22AutoTestUser%22%7D',
                        initDataUnsafe: { user: { id: 1234567, first_name: 'AutoTestUser' } },
                        MainButton: {
                            text: '', color: '', textColor: '',
                            isVisible: false, isActive: false,
                            show: function () { this.isVisible = true; },
                            hide: function () { this.isVisible = false; },
                            enable: function () { this.isActive = true; },
                            disable: function () { this.isActive = false; },
                            onClick: function (cb) { this._cb = cb; },
                            click: function () { if (this._cb && this.isActive) this._cb(); }
                        },
                        BackButton: {
                            isVisible: false,
                            show: function () { this.isVisible = true; },
                            hide: function () { this.isVisible = false; },
                            onClick: function () { }
                        },
                        themeParams: {},
                        isVersionAtLeast: () => true,
                        openInvoice: () => { },
                        showAlert: () => { }
                    }
                };
            });
            // Fire DOM loaded since we attach mocks late
            await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));
        });

        await test.step('Start reading', async () => {
            // It should display 'Сделать расклад' since we give 9999 mock energy
            const startBtn = page.locator('#start-btn');
            await expect(startBtn).toBeVisible({ timeout: 10000 });
            await expect(startBtn).toHaveText(/Сделать расклад/i, { timeout: 10000 });

            // Force click since the button visually hides itself after setup but still triggers
            await startBtn.click({ force: true });
        });

        await test.step('Cards are dealt and flipped', async () => {
            // At least 7 cards should be generated (accounting for duplicated event fires handling)
            await expect(async () => {
                expect(await page.locator('.tarot-card').count()).toBeGreaterThanOrEqual(7);
            }).toPass({ timeout: 15000 });

            // After a sequence of delays, they get the 'flipped' class 
            await expect(async () => {
                expect(await page.locator('.tarot-card.flipped').count()).toBeGreaterThanOrEqual(7);
            }).toPass({ timeout: 20000 });
        });

        await test.step('Interpretation is generated', async () => {
            const resultSection = page.locator('#result-section');
            await expect(resultSection).not.toHaveClass(/hidden/, { timeout: 10000 });

            const aiText = page.locator('#ai-text');
            await expect(aiText).toBeVisible({ timeout: 10000 });
            await expect(aiText).toContainText('Приветствую', { timeout: 10000 });
        });
    });

    test('User can view the statistics page', async ({ page }) => {
        await test.step('Navigate to stats', async () => {
            await page.goto('/stats.html');

            const title = page.locator('h1');
            await expect(title).toHaveText(/Статистика Платформы/i);
        });

        await test.step('Wait for stats to load', async () => {
            const totalCount = page.locator('#total-count');
            // Wait for the mocked total (42) to appear
            await expect(totalCount).toHaveText("42", { timeout: 10000 });

            // Check the mocked cards
            const statsList = page.locator('#stats-list');
            await expect(statsList).toContainText('Шут');
            await expect(statsList).toContainText('12 раз');
        });
    });

});
