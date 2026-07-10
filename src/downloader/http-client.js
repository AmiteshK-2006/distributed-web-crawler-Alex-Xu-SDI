const { request } = require('undici');
const { isAllowedToCrawl, USER_AGENT } = require('./robots-handler');

const FETCH_TIMEOUT_MS = 5000; 
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; 

async function fetchHTML(url) {
    try {
        const allowed = await isAllowedToCrawl(url);
        if (!allowed) return null;

        // Execute request natively, trusting undici's internal connection pooling
        const { statusCode, headers, body } = await request(url, {
            method: 'GET',
            headers: { 'User-Agent': USER_AGENT },
            headersTimeout: FETCH_TIMEOUT_MS,
            bodyTimeout: FETCH_TIMEOUT_MS,
            maxRedirections: 3
        });

        if (statusCode !== 200) return null;

        const contentType = headers['content-type'] || '';
        if (!contentType.includes('text/html')) return null;

        const contentLength = parseInt(headers['content-length'], 10) || 0;
        if (contentLength > MAX_CONTENT_LENGTH) return null;

        return await body.text();

    } catch (err) {
        return null;
    }
}

module.exports = { fetchHTML };