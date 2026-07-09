// src/router.js
require('dotenv').config();
const { connectRedis } = require('./shared/redis-client');
const { processFrontierRouting } = require('./frontier');

async function runRouter() {
    console.log('Frontier Router initializing...');
    await connectRedis();
    console.log('Router started. Migrating URLs from Front to Back queues...');

    // Single dedicated process handling the routing
    setInterval(processFrontierRouting, 5000);
}

runRouter();