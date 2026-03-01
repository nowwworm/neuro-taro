const https = require('https');
const fs = require('fs');
const path = require('path');

const majorArcanaFiles = [
    "File:RWS_Tarot_00_Fool.jpg",
    "File:RWS_Tarot_01_Magician.jpg",
    "File:RWS_Tarot_02_High_Priestess.jpg",
    "File:RWS_Tarot_03_Empress.jpg",
    "File:RWS_Tarot_04_Emperor.jpg",
    "File:RWS_Tarot_05_Hierophant.jpg",
    "File:RWS_Tarot_06_Lovers.jpg",
    "File:RWS_Tarot_07_Chariot.jpg",
    "File:RWS_Tarot_08_Strength.jpg", // Wikipedia sometimes uses 08 for Strength, sometimes 11. 
    "File:RWS_Tarot_09_Hermit.jpg",
    "File:RWS_Tarot_10_Wheel_of_Fortune.jpg",
    "File:RWS_Tarot_11_Justice.jpg", // Wikipedia sometimes uses 11 for Justice
    "File:RWS_Tarot_12_Hanged_Man.jpg",
    "File:RWS_Tarot_13_Death.jpg",
    "File:RWS_Tarot_14_Temperance.jpg",
    "File:RWS_Tarot_15_Devil.jpg",
    "File:RWS_Tarot_16_Tower.jpg",
    "File:RWS_Tarot_17_Star.jpg",
    "File:RWS_Tarot_18_Moon.jpg",
    "File:RWS_Tarot_19_Sun.jpg",
    "File:RWS_Tarot_20_Judgement.jpg",
    "File:RWS_Tarot_21_World.jpg"
];

const cardsDir = path.join(__dirname, 'cards');
if (!fs.existsSync(cardsDir)) {
    fs.mkdirSync(cardsDir);
}

const { exec } = require('child_process');
function downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
        exec(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" -o "${destPath}" "${url}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function getImageUrl(filename) {
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
    return new Promise((resolve, reject) => {
        https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const pages = parsed.query.pages;
                    const pageId = Object.keys(pages)[0];
                    if (pageId === '-1' || !pages[pageId].imageinfo) {
                        reject(new Error('Image not found on Wikipedia'));
                    } else {
                        resolve(pages[pageId].imageinfo[0].url);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log("Starting download of Major Arcana images...");
    for (let i = 0; i < majorArcanaFiles.length; i++) {
        const fileName = majorArcanaFiles[i];
        const destPath = path.join(cardsDir, `${i.toString().padStart(2, '0')}.jpg`);
        try {
            if (!fs.existsSync(destPath)) {
                console.log(`Resolving URL for ${fileName}...`);
                const url = await getImageUrl(fileName);
                console.log(`Downloading ${url} to ${destPath}...`);
                await downloadImage(url, destPath);
            } else {
                console.log(`Already exists: ${destPath}`);
            }
        } catch (error) {
            console.error(`Error downloading ${fileName}:`, error.message);
            // Quick fallback for typical Rider-Waite mapping if wikipedia API fails
        }
    }

    // Fallback: Card back
    const backDest = path.join(cardsDir, 'back.jpg');
    if (!fs.existsSync(backDest)) {
        await downloadImage("https://upload.wikimedia.org/wikipedia/commons/d/d4/Rider-Waite_Tarot_Card_Back.jpg", backDest)
            .catch(() => console.error("Could not download card back"));
    }
    console.log("Download complete.");
}

main();
