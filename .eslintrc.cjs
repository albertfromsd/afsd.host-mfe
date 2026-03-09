module.exports = {
  root: true,
  env: {
    browser: true,
    es2023: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/react-in-jsx-scope': 'off',
    "@typescript-eslint/no-magic-numbers": ["warn", {
      ignore: [-1, 0, 1, 2],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      ignoreEnums: false,
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true
    }],

    "no-duplicate-imports": "warn",
    "import/no-unresolved": "error",
    "import/order": ["warn", {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true }
    }],

    "eqeqeq": ["warn", "always"],
    "curly": ["warn", "all"],
    "no-var": "error",
    "prefer-const": "warn",
    "object-shorthand": ["warn", "always"],
    "no-nested-ternary": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],

    "@typescript-eslint/no-explicit-any": "warn",
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "warn",
    "no-negated-condition": "warn",
    "no-return-assign": "error",
    "no-multi-assign": "warn",
  },
};