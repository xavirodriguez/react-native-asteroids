const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// CSS and Tailwind support for Web
config.isCSSEnabled = true;

// Skia web support
config.resolver.sourceExts.push('skia');

module.exports = config;
