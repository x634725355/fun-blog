// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  // Enable stylistic formatting rules
  // stylistic: true,
  // Or customize the stylistic rules
  stylistic: {
    indent: 2, // 4, or 'tab'
    quotes: 'single', // or 'double'
  },

  // TypeScript and Vue are auto-detected, you can also explicitly enable them:
  typescript: true,
  vue: {
    vueVersion: 3,
  },
  // Disable jsonc and yaml support
  jsonc: false,
  yaml: false,

  // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
  ignores: [
    '**/fixtures',
    // ...globs
  ],
  rules: {
    'vue/require-v-for-key': 'off',
    'vue/valid-v-for': 'off',
    'curly': [2, 'all'],
    'no-console': 'off',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name=\'console\'][callee.property.name!=/^(log|warn|error|info|trace)$/]',
        message: 'Unexpected property on console object was called',
      },
    ],
    'n/prefer-global/process': ['error', 'always'],
    'style/max-statements-per-line': ['error', { max: 2 }],
  },
})
