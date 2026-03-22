const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Skia web support
config.resolver.sourceExts.push('skia');

module.exports = config;
