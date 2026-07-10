const cheerio = require('cheerio');

const MAX_URL_LENGTH = 2048; // Spider trap prevention
const EXCLUDED_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|css|js|mp4|zip|rar|exe)$/i;

/**
 * Extracts and filters valid URLs from the HTML payload.
 */
function extractLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = [];

    $('a[href]').each((_, element) => {
        let href = $(element).attr('href');

        // Strip fragments (e.g., #section) to avoid treating the same page as different URLs
        const hashIndex = href.indexOf('#');
        if (hashIndex !== -1) {
            href = href.substring(0, hashIndex);
        }

        if (!href) return;

        try {
            // Convert relative paths to absolute URLs
            const absoluteUrl = new URL(href, baseUrl).href;
            const parsedUrl = new URL(absoluteUrl);

            // Filter 1: Spider Trap / URL Length Check
            if (absoluteUrl.length > MAX_URL_LENGTH) return;

            // Filter 2: Invalid File Extensions
            if (EXCLUDED_EXTENSIONS.test(parsedUrl.pathname)) return;

            // Filter 3: Restrict to http/https
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return;

            links.push(absoluteUrl);
        } catch (err) {
            // Invalid URL format, gracefully drop it so the worker doesn't crash
        }
    });

    // Return unique links on this specific page to reduce redundant Frontier pushes
    return [...new Set(links)];
}

module.exports = { extractLinks };