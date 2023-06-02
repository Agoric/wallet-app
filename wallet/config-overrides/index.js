// cribbed from https://www.npmjs.com/package/react-app-rewire-multiple-entry
/* global __dirname, require, module */

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const multiEntry = require('react-app-rewire-multiple-entry');

const bridgeTemplate = path.resolve(
  path.join(__dirname, '..', 'public', 'bridge.html'),
);

const multipleEntry = multiEntry([
  {
    template: 'public/index.html',
    entry: 'src/index.tsx',
  },
  {
    template: 'public/bridge.html',
    entry: 'src/bridge-dapp.tsx',
  },
]);

module.exports = function override(config, _env) {
  config.resolve.fallback = { path: false, crypto: false };
  config.ignoreWarnings = [/Failed to parse source map/];

  const htmlWebpackPlugin = config.plugins.find(
    plugin => plugin.constructor.name === 'HtmlWebpackPlugin',
  );
  if (!htmlWebpackPlugin) {
    throw new Error("Can't find HtmlWebpackPlugin");
  }

  multipleEntry.addMultiEntry(config);

  const bridgeKeys = Object.keys(config.entry).filter(k =>
    k.startsWith('bridge'),
  );
  const opts = {
    ...htmlWebpackPlugin.userOptions,
    template: bridgeTemplate,
    filename: './bridge.html',
    chunks: bridgeKeys,
  };
  htmlWebpackPlugin.userOptions = {
    ...htmlWebpackPlugin.userOptions,
    inject: false, // so the template can customize when the bundle gets loaded
    excludeChunks: bridgeKeys,
  };
  const plug2 = new HtmlWebPackPlugin(opts);
  config.plugins.push(plug2);
  return config;
};
