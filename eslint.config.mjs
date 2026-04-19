import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  {
    // Global ignores must be the first object in the array for Flat Config
    ignores: [
      "**/node_modules/**",
      "dist/**",
      ".expo/**",
      "web-build/**",
      "build/**",
      "coverage/**",
      ".git/**",
      "temp/**",
      "etc/**",
      "**/*.min.js"
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
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
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/no-require-imports": ["error", {
        "allow": ["../src/engine/rendering/SkiaRenderer", "@shopify/react-native-skia", "./EntityFactory", "./AsteroidsSkiaVisuals"]
      }],
    },
  },
  {
    files: [
      "**/*.config.{js,cjs}",
      "metro.config.js",
      "babel.config.js"
    ],
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
  {
    files: [
      "**/*.config.mjs",
      "eslint.config.mjs",
      "postcss.config.mjs"
    ],
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
