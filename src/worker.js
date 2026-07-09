require('dotenv').config();
const { connectRedis, redisClient } = require('./shared/redis-client');
const { getNextURL, enqueueURL } = require('./frontier');
const { fetchHTML } = require('./downloader/http-client');
const { processPage } = require('./parser');
const metrics = require('./metrics/prometheus-client');

const IDLE_WAIT_MS = 3000;
const CONCURRENCY_LIMIT = 10; // Number of simultaneous URLs processed per container

// State management for graceful shutdown
let isShuttingDown = false;
let activeTasks = 0;

/**
 * Traps OS signals to ensure we don't sever connections mid-write.
 */
async function handleGracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);
    isShuttingDown = true;

    // Wait for all active network/database I/O to finish
    while (activeTasks > 0) {
        console.log(`Waiting for ${activeTasks} active crawl tasks to finish...`);
        await new Promise(res => setTimeout(res, 1000));
    }

    console.log('All tasks drained. Closing Redis connections...');
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
    
    console.log('Worker exited cleanly.');
    process.exit(0);
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

/**
 * A single, asynchronous logical thread.
 */
async function crawlLoop(threadId) {
    while (!isShuttingDown) {
        try {
            const target = await getNextURL();

            if (!target) {
                await new Promise(res => setTimeout(res, IDLE_WAIT_MS));
                continue;
            }

            activeTasks++; // Lock this task to prevent shutdown
            
            const { url, domain } = target;
            console.log(`[Thread-${threadId}] Crawling: ${url}`);

            const html = await fetchHTML(url);
            
            if (!html) {
                metrics.crawlErrorsTotal.labels('network_or_blocked').inc();
                activeTasks--;
                continue;
            }

            const { links, isDuplicate, saved } = await processPage(url, html);

            if (isDuplicate) {
                metrics.duplicateContentTotal.inc();
            } else if (saved) {
                metrics.pagesCrawledTotal.inc();
            }

            let enqueuedCount = 0;
            const parentUrlObj = new URL(url);

            for (const link of links) {
                try {
                    const childUrlObj = new URL(link);
                    let linkPriority = childUrlObj.hostname === parentUrlObj.hostname ? 10 : 30;
                    
                    const added = await enqueueURL(link, linkPriority);
                    if (added) enqueuedCount++;
                } catch (err) {
                    // Ignore malformed links silently
                }
            }
            
            metrics.urlsDiscoveredTotal.inc(enqueuedCount);
            
            // Release the task lock
            activeTasks--; 

        } catch (err) {
            console.error(`[Thread-${threadId}] Loop Error:`, err);
            metrics.crawlErrorsTotal.labels('fatal').inc();
            if (activeTasks > 0) activeTasks--;
            await new Promise(res => setTimeout(res, 5000)); 
        }
    }
}

/**
 * Main application bootstrapper.
 */
async function runWorker() {
    console.log('Worker initializing...');
    await connectRedis();
    metrics.startMetricsServer();

    console.log(`Starting ${CONCURRENCY_LIMIT} concurrent async threads...`);
    
    // Launch N concurrent promises that run infinitely until shutdown
    const threads = [];
    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        threads.push(crawlLoop(i));
    }
    
    await Promise.all(threads);
}

runWorker();