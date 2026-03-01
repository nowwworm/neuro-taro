const { chromium } = require('playwright');
const express = require('express');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
    console.log('Starting local server for Allure Report...');
    const app = express();
    app.use(express.static(path.join(__dirname, '../allure-report')));

    const server = app.listen(0, async () => {
        const port = server.address().port;
        const url = `http://127.0.0.1:${port}/index.html`;
        console.log(`Server running at ${url}`);

        console.log('Launching browser to generate PDF...');
        const browser = await chromium.launch();
        const page = await browser.newPage();

        // Desktop viewport for report
        await page.setViewportSize({ width: 1280, height: 1024 });
        await page.goto(url, { waitUntil: 'networkidle' });

        // Wait for widgets to render
        await page.waitForTimeout(3000);

        const pdfPath = path.join(__dirname, '../allure-report.pdf');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            landscape: true,
            printBackground: true
        });

        console.log(`PDF successfully generated at: ${pdfPath}`);

        await browser.close();
        server.close();
    });
}

generatePDF().catch(console.error);
