const { Pool } = require('pg');

const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT || 5432;
const database = process.env.POSTGRES_DB || 'crawler_db';
const user = process.env.POSTGRES_USER || 'crawler_user';
const password = process.env.POSTGRES_PASSWORD || 'crawler_pass';

const connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;

const pool = new Pool({
    connectionString: process.env.PG_URL || connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
});


pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};