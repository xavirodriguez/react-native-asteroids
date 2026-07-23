import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  {
    // Global ignores must be the first object in the array for Flat Config
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "dist/**",
      ".expo/**",
      "web-build/**",
      "build/**",
      "coverage/**",
      ".git/**",
      "temp/**",
      "etc/**",
      "**/*.min.js",
      "web-report/**",
      "expo-env.d.ts",
      "assets/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      "react-hooks": pluginReactHooks,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.reactNative,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "warn",
      "react/jsx-key": "error",
      "react/no-unstable-nested-components": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": [
        "error",
        {
          allow: [
            "@shopify/react-native-skia",
            "./EntityFactory",
            "./AsteroidsSkiaVisuals",
            "./AsteroidSkiaDrawers",
            "expo-audio",
            "react-native",
            "../../../../assets/ship.png",
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/engine/**",
              ],
              message:
                "Please import from '@tiny-aster/core' instead of legacy 'src/engine'.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.config.{js,cjs}", "metro.config.js", "babel.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override estricto para el core (Librería limpia)
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-require-imports": "error",
      // EL GUARDIÁN DE FRONTERAS:
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-native",
                "expo*",
                "@shopify/react-native-skia",
              ],
              message:
                "💥 FRONTERA ROTA: El Core no puede depender de librerías de UI/Plataforma.",
            },
            {
              group: ["@colyseus/*", "colyseus"],
              message:
                "💥 FRONTERA ROTA: El Core no puede depender de implementaciones de red específicas. Usa NetworkTransport.",
            },
            {
              group: ["../../../src/games/*", "**/*Asteroid*", "**/*Pong*"],
              message:
                "💥 FRONTERA ROTA: El Core es agnóstico. No puede importar lógica específica de los juegos.",
            },
          ],
        },
      ],
    },
  },
  // Override estricto para React Native (Fronteras de React Native)
  {
    files: ["packages/react-native/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server/**", "colyseus-server"],
              message: "💥 FRONTERA ROTA: El frontend React Native no puede importar lógica del servidor.",
            },
          ],
        },
      ],
    },
  },
  // Override estricto para Server (Fronteras del Servidor)
  {
    files: ["server/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-native", "expo*"],
              message: "💥 FRONTERA ROTA: El servidor Colyseus no puede importar librerías de UI o del cliente React Native.",
            },
          ],
        },
      ],
    },
  },
  // Añadir a tu configuración:
  {
    files: ["packages/core/src/tests/**/*.ts", "packages/core/tests/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/*.config.mjs", "eslint.config.mjs", "postcss.config.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  }
);
