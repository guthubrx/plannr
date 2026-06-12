const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: { baseURL: 'http://127.0.0.1:8970' },
    webServer: {
        command: 'python3 -m http.server 8970 --bind 127.0.0.1',
        url: 'http://127.0.0.1:8970/plannr.html',
        reuseExistingServer: !process.env.CI
    }
});
