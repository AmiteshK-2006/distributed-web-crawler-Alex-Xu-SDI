/**
 * Normalizes a URL to prevent false duplicates.
 * Forces lowercase, removes fragments, and strips trailing slashes.
 */
function normalizeURL(urlStr) {
    try {
        const parsed = new URL(urlStr);
        
        // 1. Lowercase hostname (HTTP specification)
        parsed.hostname = parsed.hostname.toLowerCase();
        
        // 2. Strip fragments (e.g., #section-1)
        parsed.hash = ''; 
        
        let normalized = parsed.href;
        
        // 3. Strip trailing slashes for consistency
        if (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        
        return normalized;
    } catch (err) {
        return null; // Gracefully handle malformed URLs
    }
}

module.exports = { normalizeURL };