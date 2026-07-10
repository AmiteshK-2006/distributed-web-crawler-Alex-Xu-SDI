const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = 9091;

// Enable default metrics (CPU, Memory of the Node process)
client.collectDefaultMetrics();

// Custom Metrics
const pagesCrawledTotal = new client.Counter({
    name: 'crawler_pages_crawled_total',
    help: 'Total number of successfully crawled pages (Used to calculate PPS)'
});

const crawlErrorsTotal = new client.Counter({
    name: 'crawler_errors_total',
    help: 'Total number of fetch or processing errors',
    labelNames: ['type'] // e.g., 'timeout', 'parse', 'network'
});

const urlsDiscoveredTotal = new client.Counter({
    name: 'crawler_urls_discovered_total',
    help: 'Total number of valid new links extracted'
});

const duplicateContentTotal = new client.Counter({
    name: 'crawler_duplicate_content_total',
    help: 'Total number of pages dropped due to duplicate hashes'
});

// Expose the metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

function startMetricsServer() {
    app.listen(PORT, () => {
        console.log(`Prometheus metrics server running on port ${PORT}`);
    });
}

module.exports = {
    startMetricsServer,
    pagesCrawledTotal,
    crawlErrorsTotal,
    urlsDiscoveredTotal,
    duplicateContentTotal
};