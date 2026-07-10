const crypto = require('crypto');
const db = require('../shared/db-client');

/**
 * Generates a SHA-256 fingerprint of the HTML content.
 */
function generateFingerprint(html) {
    return crypto.createHash('sha256').update(html).digest('hex');
}

/**
 * Checks if the content hash already exists in our datastore.
 */
async function isDuplicateContent(hash) {
    try {
        const result = await db.query(
            'SELECT 1 FROM crawl_history WHERE content_hash = $1 LIMIT 1',
            [hash]
        );
        return result.rowCount > 0;
    } catch (err) {
        console.error('Database error during content seen check:', err);
        // Fail open to allow crawling if DB stutters, favoring availability
        return false; 
    }
}

// persistence recording function
async function recordCrawlHistory(url, hash, statusCode = 200) {
    try {
        await db.query(
            `INSERT INTO crawl_history (url, content_hash, http_status) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (url) DO NOTHING`,
            [url, hash, statusCode]
        );
    } catch (err) {
        console.error('Failed to save crawl history:', err);
    }
}

module.exports = { 
    generateFingerprint, 
    isDuplicateContent, 
    recordCrawlHistory 
};