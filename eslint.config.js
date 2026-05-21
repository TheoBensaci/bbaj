import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Erreurs critiques - aide à éviter les bugs
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-use-before-define": ["error", { functions: false }],

      // Bonnes pratiques
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",

      // Style et lisibilité
      "no-multiple-empty-lines": ["error", { max: 2 }],
      "no-trailing-spaces": "error",
      semi: ["error", "always"],

      // Autorisations pour le contexte pédagogique
      "no-console": "off",
    },
  },
  {
    // Configuration spécifique pour les fichiers de test
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
  {
    // Ignore les fichiers générés
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
];
