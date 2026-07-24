#!/usr/bin/env node
// claim-ui launcher — starts the app and opens the browser
const { exec, spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3001;
const URL = `http://localhost:${PORT}`;

// Start the server
const server = spawn('node', [path.join(__dirname, 'server', 'index.mjs')], {
    stdio: 'inherit',
    cwd: __dirname,
});

// Wait for server to be ready, then open browser
function waitForServer(retries = 30) {
    http.get(URL + '/api/health', (res) => {
        if (res.statusCode === 200) {
            console.log(`\n  Claim UI ready at ${URL}`);
            const platform = process.platform;
            const openCmd = platform === 'darwin' ? 'open' :
                           platform === 'win32' ? 'start' : 'xdg-open';
            exec(`${openCmd} ${URL}`);
        }
    }).on('error', () => {
        if (retries > 0) {
            setTimeout(() => waitForServer(retries - 1), 500);
        }
    });
}

setTimeout(() => waitForServer(), 1000);

// Handle shutdown
process.on('SIGINT', () => {
    server.kill();
    process.exit();
});
