const { redisClient } = require('../shared/redis-client');

const BACK_QUEUE_PREFIX = 'crawler:back_queue:';
const DOMAIN_LOCK_PREFIX = 'crawler:lock:';
const POLITENESS_DELAY_MS = 2000; 

async function routeToBackQueue(url, hostname) {
    const queueKey = `${BACK_QUEUE_PREFIX}${hostname}`;
    try {
        await redisClient.lPush(queueKey, url);
        
        // Use ZSET: Score is 0 (ready immediately) if it doesn't already exist (NX)
        await redisClient.zAdd('crawler:active_domains', {
            score: 0,
            value: hostname
        }, { NX: true });
        
    } catch (err) {
        console.error(`Error routing to back queue for ${hostname}:`, err);
    }
}

async function fetchPoliteURL() {
    try {
        const now = Date.now();
        
        // ZRANGEBYSCORE: Get up to 50 domains whose next eligible timestamp is <= right now
        // This is an incredibly fast O(log N) operation
        const readyDomains = await redisClient.zRangeByScore(
            'crawler:active_domains', 
            0, 
            now, 
            { LIMIT: { offset: 0, count: 50 } }
        );
        
        for (const domain of readyDomains) {
            const lockKey = `${DOMAIN_LOCK_PREFIX}${domain}`;
            
            const lockAcquired = await redisClient.set(lockKey, '1', { 
                NX: true, 
                PX: POLITENESS_DELAY_MS 
            });
            
            if (lockAcquired) {
                const queueKey = `${BACK_QUEUE_PREFIX}${domain}`;
                const url = await redisClient.rPop(queueKey);
                
                if (url) {
                    // Update the domain's score to future timestamp (now + delay)
                    await redisClient.zAdd('crawler:active_domains', {
                        score: now + POLITENESS_DELAY_MS,
                        value: domain
                    });
                    return { url, domain };
                } else {
                    // Queue empty: completely remove domain from active routing
                    await redisClient.zRem('crawler:active_domains', domain);
                    await redisClient.del(lockKey);
                }
            }
        }
        return null; 
    } catch (err) {
        console.error('Error fetching polite URL:', err);
        return null;
    }
}

module.exports = { routeToBackQueue, fetchPoliteURL };