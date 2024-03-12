const config = require('frazpress/synpress.config');
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  ...config,
  e2e: {
    ...config.e2e,
    baseUrl: 'http://localhost:3000',
    specPattern: 'test/e2e/specs/**/*spec.{js,jsx,ts,tsx}',
    supportFile: 'test/support.js',
  },
});
