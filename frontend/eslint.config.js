//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      '@typescript-eslint/array-type': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/api/generated/*', '../api/generated/*', '../../api/generated/*', '**/api/generated/*'],
          message: "Import from '@/api/hooks' instead of the generated client directly.",
        }],
      }],
    },
  },
]
