# React Native Asteroids

A modern implementation of the classic Asteroids arcade game built with Expo and React Native, deployable across iOS, Android, and web platforms .

## 🚀 Features

- **Cross-platform compatibility**: Runs on iOS, Android, and web from a single codebase
- **Modern React Native architecture**: Built with React 19.0.0 and React Native 0.79.5
- **TypeScript support**: Full type safety with TypeScript 5.8.3
- **Expo Router**: File-based navigation system for seamless routing
- **Tailwind CSS**: Modern utility-first styling approach

## 🛠️ Tech Stack

| Component  | Technology   | Version |
| ---------- | ------------ | ------- |
| Framework  | Expo         | 53.0.22 |
| Runtime    | React Native | 0.79.5  |
| UI Library | React        | 19.0.0  |
| Language   | TypeScript   | ~5.8.3  |
| Styling    | Tailwind CSS | ^4.1.12 |
| Routing    | expo-router  | ~5.1.5  |

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/xavirodriguez/react-native-asteroids.git
   cd react-native-asteroids
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## 🎮 Running the Game

### Development Mode

Start the development server:

```bash
npm start
```

### Platform-specific Commands

- **iOS**: `npm run ios` [7]
- **Android**: `npm run android`
- **Web**: `npm run web`

## 🧪 Development

### Testing

Run the test suite:

```bash
npm test
```

### Linting

Fix code style issues:

```bash
npm run lint
```

## 🏗️ Project Structure

The application follows a component-based architecture with clear separation of concerns:

- **Entry Point**: Uses `expo-router/entry` for application bootstrapping
- **Game Engine**: Core game logic separated from rendering and UI
- **Cross-platform Support**: Single codebase targeting multiple platforms
- **Modern Styling**: Tailwind CSS with custom design system

## 🎨 Styling

The project uses a comprehensive design system with:

- Light and dark theme support
- Custom color palette with OKLCH color space
- Responsive design principles
- Tailwind CSS utilities for rapid development

## 📱 Platform Support

- **iOS**: Native iOS app with tablet support
- **Android**: Native Android app with adaptive icons
- **Web**: Progressive web app with Metro bundler

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/xavirodriguez/react-native-asteroids)
