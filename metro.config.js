const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// CSS and Tailwind support for Web
config.isCSSEnabled = true;

// Skia web support
config.resolver.sourceExts.push('skia');

// Map ws to a mock in frontend builds to avoid resolving Node-specific stream module using custom resolver
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/utils/ws-mock.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
