import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"

import {
  defineConfig,
  globalIgnores,
} from "eslint/config"

export default defineConfig([
  globalIgnores([
    "dist",
    "build",
    "coverage",
    "node_modules",
    ".vite",
  ]),

  {
    files: [
      "src/**/*.{js,jsx}",
    ],

    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.browser,
        ...globals.es2024,
      },

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],

      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: [
      "src/context/**/*.{js,jsx}",
    ],

    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  {
    files: [
      "public/sw.js",
    ],

    extends: [
      js.configs.recommended,
    ],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",

      globals: {
        ...globals.serviceworker,
        ...globals.es2024,
      },
    },

    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: [
      "scripts/**/*.js",
      "*.config.js",
    ],

    extends: [
      js.configs.recommended,
    ],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },

    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
])