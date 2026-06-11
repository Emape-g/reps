module.exports = {
  root: true,
  env: { node: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // Permitir variables/argumentos/errores intencionalmente sin usar con prefijo "_"
    // y descartes por rest-siblings (ej: const { password: _pw, ...rest } = user)
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // Permitir `declare global { namespace Express { ... } }` para augmentar tipos
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
  },
}
