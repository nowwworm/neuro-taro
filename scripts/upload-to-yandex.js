require('dotenv').config();
const fs = require('fs');
const path = require('path');

const YANDEX_DISK_TOKEN = process.env.YANDEX_DISK_TOKEN;
const DEST_FOLDER = 'Neuro-Tarot-Tests';

async function createFolderIfNotExists() {
    const url = `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(DEST_FOLDER)}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `OAuth ${YANDEX_DISK_TOKEN}` }
    });
    if (!res.ok && res.status !== 409) { // 409 means folder already exists
        console.error('Failed to create folder on Yandex Disk', await res.text());
    }
}

async function uploadFile(filePath, fileName) {
    if (!fs.existsSync(filePath)) {
        console.log(`File ${filePath} not found, skipping.`);
        return;
    }

    // 1. Get upload URL
    const uploadPath = `${DEST_FOLDER}/${fileName}`;
    const getUrlReq = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(uploadPath)}&overwrite=true`;

    console.log(`Getting upload link for ${fileName}...`);
    let res = await fetch(getUrlReq, {
        method: 'GET',
        headers: { 'Authorization': `OAuth ${YANDEX_DISK_TOKEN}` }
    });

    if (!res.ok) {
        console.error(`Error requesting upload link: ${await res.text()}`);
        return;
    }

    const uploadData = await res.json();
    const targetUrl = uploadData.href;

    // 2. Upload the actual file
    console.log(`Uploading ${fileName}...`);
    const fileStream = fs.createReadStream(filePath);
    const stat = fs.statSync(filePath);

    const putRes = await fetch(targetUrl, {
        method: 'PUT',
        body: fileStream,
        headers: {
            'Content-Length': stat.size
        },
        duplex: 'half' // required by native fetch for streams
    });

    if (putRes.ok) {
        console.log(`Successfully uploaded ${fileName} to Yandex Disk!`);
    } else {
        console.error(`Failed to upload ${fileName}: ${await putRes.text()}`);
    }
}

async function startUploadProcess() {
    if (!YANDEX_DISK_TOKEN) {
        console.error('ERROR: YANDEX_DISK_TOKEN is not set in .env');
        process.exit(1);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await createFolderIfNotExists();

    // 1. Upload PDF Report
    const pdfPath = path.join(__dirname, '../allure-report.pdf');
    await uploadFile(pdfPath, `Report_${timestamp}.pdf`);

    // 2. Upload Videos from test-results
    const testResultsDir = path.join(__dirname, '../test-results');
    if (fs.existsSync(testResultsDir)) {
        const folders = fs.readdirSync(testResultsDir);
        for (const folder of folders) {
            if (!folder.startsWith('.')) {
                const folderPath = path.join(testResultsDir, folder);
                if (fs.statSync(folderPath).isDirectory()) {
                    const files = fs.readdirSync(folderPath);
                    for (const file of files) {
                        if (file.endsWith('.webm')) {
                            await uploadFile(
                                path.join(folderPath, file),
                                `TestVideo_${folder}_${timestamp}.webm`
                            );
                        }
                    }
                }
            }
        }
    } else {
        console.log('No video records found (test-results missing).');
    }

    console.log('All automated uploads finished.');
}

startUploadProcess().catch(console.error);
