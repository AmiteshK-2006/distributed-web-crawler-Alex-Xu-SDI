const { generateFingerprint, isDuplicateContent, recordCrawlHistory } = require('./deduplicator');
const { extractLinks } = require('./link-extractor');
const { saveContent } = require('../shared/s3-client');

/**
 * Master function to parse, deduplicate, save, and extract new links.
 */
async function processPage(url, html) {
    // 1. Content Seen Check
    const contentHash = generateFingerprint(html);
    const isDuplicate = await isDuplicateContent(contentHash);

    if (isDuplicate) {
        console.log(`Duplicate content found for ${url}. Skipping processing.`);
        return { links: [], contentHash, saved: false }; 
    }

    // 2. Content Storage (MinIO)
    const saved = await saveContent(contentHash, html);

    // 3. Persist the metadata to PostgreSQL
    if (saved) {
        await recordCrawlHistory(url, contentHash, 200);
    }

    // 4. Link Extraction
    const extractedLinks = extractLinks(html, url);
    
    return { links: extractedLinks, contentHash, saved };
}

module.exports = { processPage };