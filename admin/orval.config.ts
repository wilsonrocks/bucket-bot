import { defineConfig } from 'orval'

export default defineConfig({
  'bucket-bot': {
    input: '../openapi.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      baseUrl: '/v1',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/custom-instance.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
})
