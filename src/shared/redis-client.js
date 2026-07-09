const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Connected to Redis');
        
        // Initialize the Bloom Filter for URL Seen check if it doesn't exist
        try {
            await redisClient.bf.reserve('URL_SEEN_FILTER', 0.001, 1000000);
            console.log('Bloom Filter initialized');
        } catch (err) {
            if (!err.message.includes('item exists')) {
                console.error('Error reserving Bloom Filter:', err);
            }
        }
    }
}

module.exports = { redisClient, connectRedis };