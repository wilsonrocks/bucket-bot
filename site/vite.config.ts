import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// Shim for missing virtual module in @tanstack/start-server-core@1.169.3.
// Remove once TanStack Start registers this module in the Vite plugin.
const injectedHeadScriptsShim: Plugin = {
  name: 'tanstack-start-injected-head-scripts-shim',
  resolveId(id) {
    if (id === 'tanstack-start-injected-head-scripts:v') return id
  },
  load(id) {
    if (id === 'tanstack-start-injected-head-scripts:v')
      return 'export const injectedHeadScripts = null'
  },
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    injectedHeadScriptsShim,
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
})

export default config
