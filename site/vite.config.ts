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
  build: {
    // Emit referenced source maps so Lighthouse's "Missing source maps for large
    // first-party JavaScript" diagnostic clears and bundle bytes can be attributed.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Keep the ~98KB UK region geometry in its own chunk so the homepage (which
        // only reaches it via a dynamic import in RegionsMapCard) never loads it
        // eagerly. Without this, the static import in the /regions route hoists it into
        // the shared vendor chunk that every page downloads up front.
        manualChunks(id) {
          if (id.includes('/data/ukRegions') || id.includes('/data/uk-regions-geo')) {
            return 'uk-regions-geo'
          }
        },
      },
    },
  },
  plugins: [
    injectedHeadScriptsShim,
    devtools(),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      // Precompress hashed /assets/** at build so they're served gzip/brotli. Prod
      // nginx gzips text/html but not the proxied CSS/JS assets, leaving the
      // render-blocking stylesheet (~19KB) and JS bundles uncompressed. Nitro serves
      // the precompressed variant via Accept-Encoding negotiation.
      compressPublicAssets: { gzip: true, brotli: true },
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
