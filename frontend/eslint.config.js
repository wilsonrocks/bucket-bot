//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      '@typescript-eslint/array-type': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
    },
  },
]
