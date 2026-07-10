const { redisClient } = require('../shared/redis-client');
const { pushToFrontQueue, popHighestPriorityURLs } = require('./priority-queue');
const { routeToBackQueue, fetchPoliteURL } = require('./politeness-manager');
const { normalizeURL } = require('../shared/url-utils'); 

/**
 * Atomically validates against Bloom Filter and adds to Frontier if unseen.
*/
async function enqueueURL(rawUrl, priority = 10) {
    try {
        const url = normalizeURL(rawUrl);
        if (!url) return false;

        // ATOMIC FIX: bf.add returns 1 (true) if added, 0 (false) if already existed.
        // No separate exists call.
        const added = await redisClient.bf.add('URL_SEEN_FILTER', url);
        
        if (added) {
            await pushToFrontQueue(url, priority);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Frontier Enqueue Error:', err);
        return false;
    }
}

/**
 * Moves URLs from Front Queues to Domain-specific Back Queues.
 * This should run periodically in the background.
 */
async function processFrontierRouting() {
    const urls = await popHighestPriorityURLs(50);
    for (const urlStr of urls) {
        try {
            const parsed = new URL(urlStr);
            await routeToBackQueue(urlStr, parsed.hostname);
        } catch (err) {
            console.error(`Malformed URL dropped during routing: ${urlStr}`);
        }
    }
}

module.exports = {
    enqueueURL,
    processFrontierRouting,
    getNextURL: fetchPoliteURL
};