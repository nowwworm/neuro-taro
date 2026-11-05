const { Pool } = require('pg');

// We connect to the default postgres database since we are rapidly prototyping locally
// For production, this should absolutely be a specific application database
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || process.env.USER,
            database: process.env.DB_NAME || 'postgres',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 5432,
        }
);

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log("Database connected successfully!");

        // Ensure users table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                telegram_id VARCHAR(255) UNIQUE NOT NULL,
                first_name VARCHAR(255),
                avatar_url VARCHAR(1024),
                energy INTEGER DEFAULT 0,
                last_free_refill TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Ensure readings table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS readings (
                id SERIAL PRIMARY KEY,
                telegram_id VARCHAR(255),
                cards_drawn JSONB NOT NULL,
                interpretation TEXT NOT NULL,
                query TEXT,
                spread_type VARCHAR(64),
                city VARCHAR(255),
                reading_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS query TEXT`);
        await client.query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS spread_type VARCHAR(64)`);
        await client.query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS city VARCHAR(255)`);
        await client.query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS reading_date DATE`);
        console.log("Readings table initialized.");
        client.release();
    } catch (err) {
        console.error("Database connection error: Make sure exactly running PostgreSQL service locally.", err.message);
    }
}

testConnection();

module.exports = {
    query: (text, params) => pool.query(text, params),
};
