const robotsParser = require('robots-parser');
const { request } = require('undici');
const { redisClient } = require('../shared/redis-client');

const ROBOTS_CACHE_PREFIX = 'crawler:robots:';
const ROBOTS_CACHE_TTL = 86400; // Cache for 24 hours
const USER_AGENT = process.env.USER_AGENT || 'Distributed-Resume-Crawler-Bot';

/**
 * Fetches, parses, and caches robots.txt for a given domain.
 * @param {string} origin - The base URL (e.g., https://example.com)
 */
async function getRobotsTxt(origin) {
    const cacheKey = `${ROBOTS_CACHE_PREFIX}${origin}`;
    
    // 1. Check Redis Cache
    const cachedRobots = await redisClient.get(cacheKey);
    if (cachedRobots) {
        return robotsParser(`${origin}/robots.txt`, cachedRobots);
    }

    // 2. Fetch if not cached
    try {
        const { statusCode, body } = await request(`${origin}/robots.txt`, {
            headers: { 'User-Agent': USER_AGENT },
            headersTimeout: 3000,
            bodyTimeout: 3000
        });

        if (statusCode >= 200 && statusCode < 300) {
            const robotsContent = await body.text();
            await redisClient.set(cacheKey, robotsContent, { EX: ROBOTS_CACHE_TTL });
            return robotsParser(`${origin}/robots.txt`, robotsContent);
        }
    } catch (err) {
        // If it fails or times out, we assume no restrictions (fail-open)
        console.warn(`Could not fetch robots.txt for ${origin}. Defaulting to allowed.`);
    }

    // Cache an empty string to prevent repeated failed fetch attempts
    await redisClient.set(cacheKey, '', { EX: ROBOTS_CACHE_TTL });
    return robotsParser(`${origin}/robots.txt`, '');
}

/**
 * Checks if a specific URL is allowed to be crawled based on cached robots.txt.
 */
async function isAllowedToCrawl(urlStr) {
    try {
        const parsedUrl = new URL(urlStr);
        const robots = await getRobotsTxt(parsedUrl.origin);
        return robots.isAllowed(urlStr, USER_AGENT);
    } catch (err) {
        return false;
    }
}

module.exports = { isAllowedToCrawl, USER_AGENT };