const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.PG_URL || 'postgres://crawler:crawler_password@localhost:5432/crawler_metadata',
    max: 20, // Max number of connections per worker
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};