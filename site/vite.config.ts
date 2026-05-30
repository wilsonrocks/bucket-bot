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
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      // Nitro already caches the content-hashed /assets/** bundles immutably. These
      // public/ files are not hashed, so use a shorter (mutable) TTL — long enough to
      // satisfy PageSpeed's cache-policy audit, short enough that swapping a logo or
      // favicon is picked up. To force an instant swap, rename the file.
      routeRules: {
        '/favicon.ico': { headers: { 'cache-control': 'public, max-age=2592000' } },
        '/logo192.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
        '/logo512.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
        '/bucket-bot-logo-original.png': { headers: { 'cache-control': 'public, max-age=2592000' } },
        '/manifest.json': { headers: { 'cache-control': 'public, max-age=2592000' } },
        '/robots.txt': { headers: { 'cache-control': 'public, max-age=2592000' } },
      },
    }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
})

export default config
