module.exports = {
  env: {
    node: true,
    jest: true
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['jsdoc'],
  rules: {
    'jsdoc/require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: false,
          MethodDefinition: false,
          ClassDeclaration: false
        }
      }
    ]
  }
};
