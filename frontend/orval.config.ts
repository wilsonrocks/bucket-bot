import { defineConfig } from 'orval'

export default defineConfig({
  'bucket-bot': {
    input: 'http://localhost:9999/v1/doc',
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
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
