import js from '@eslint/js';
import globals from 'globals';
import html from 'eslint-plugin-html';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            html,
        },
        rules: {
            // Erreurs critiques - aide à éviter les bugs
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-use-before-define': ['error', { functions: false }],

            // Bonnes pratiques
            eqeqeq: ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',

            // Naming conventions
            camelcase: [
                'error',
                {
                    properties: 'always',
                    ignoreDestructuring: false,
                    allow: ['^[A-Z][A-Z0-9_]+$'],
                },
            ],
            quotes: ['error', 'single', { allowTemplateLiterals: true }],

            // Style et lisibilité (formatting natif ESLint)
            indent: ['error', 4],
            'no-multiple-empty-lines': ['error', { max: 2 }],
            'no-trailing-spaces': 'error',
            semi: ['error', 'always'],
            'space-infix-ops': 'error',
            'keyword-spacing': 'error',
            'comma-spacing': 'error',
            'block-spacing': 'error',
            'space-before-blocks': 'error',
            'brace-style': ['error', '1tbs', { allowSingleLine: true }],
            'func-call-spacing': ['error', 'never'],
            'no-mixed-spaces-and-tabs': 'error',

            // Autorisations pour le contexte pédagogique
            'no-console': 'off',
        },
    },
    {
        // Configuration spécifique pour les fichiers de test
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
    },
    {
        // Configuration pour les fichiers HTML
        files: ['**/*.html'],
        plugins: {
            html,
        },
    },
    {
        // Ignore les fichiers générés et les fichiers de données brutes
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'app/src/testLevel.js',
        ],
    },
];
