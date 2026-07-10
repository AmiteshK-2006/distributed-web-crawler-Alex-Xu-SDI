const { redisClient } = require('../shared/redis-client');

const FRONT_QUEUE_KEY = 'crawler:front_queue';

/**
 * Adds a URL to the prioritized front queue.
 * @param {string} url - The validated URL to crawl.
 * @param {number} priorityScore - Lower score = higher priority.
 */
async function pushToFrontQueue(url, priorityScore = 10) {
    try {
        await redisClient.zAdd(FRONT_QUEUE_KEY, {
            score: priorityScore,
            value: url
        });
    } catch (err) {
        console.error('Error pushing to Front Queue:', err);
    }
}

/**
 * Fetches the highest priority URLs to be routed to back queues.
 * @param {number} count - Number of URLs to pop.
 */
async function popHighestPriorityURLs(count = 10) {
    try {
        // Pops elements with the lowest score (highest priority)
        const results = await redisClient.zPopMin(FRONT_QUEUE_KEY, count);
        return results.map(res => res.value);
    } catch (err) {
        console.error('Error popping from Front Queue:', err);
        return [];
    }
}

module.exports = { pushToFrontQueue, popHighestPriorityURLs };