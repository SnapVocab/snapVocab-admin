import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode, command, isPreview }) => {
  const env = { ...loadEnv(mode, __dirname, ''), ...process.env };
  const proxyTarget = env.API_PROXY_TARGET?.trim();
  if (command === 'serve' && !isPreview && !env.VITE_API_BASE_URL?.trim() && !proxyTarget) {
    throw new Error('Set API_PROXY_TARGET in .env for the dev proxy, or VITE_API_BASE_URL to call the backend directly.');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: proxyTarget ? {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      } : undefined,
    },
  };
})
