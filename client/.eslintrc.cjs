module.exports = {
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  globals: {
    __APP_VERSION__: 'readonly',
    process: 'readonly'
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'prettier'],
  settings: {
    react: {
      version: 'detect',
      runtime: 'automatic'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': 'warn'
  }
};
