const db = require('./db');
async function giveStars() {
    try {
        const res = await db.query('UPDATE users SET energy = 9999');
        console.log(`Updated ${res.rowCount} users to 9999 energy.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
giveStars();
