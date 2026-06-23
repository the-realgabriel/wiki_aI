import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/rest': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/upload': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true,
      },
      '/api/files': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true,
      },
      '/api/pages': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true,
      },
      '/api/events': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://127.0.0.1:4173',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/realtime': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
      },
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('authorization');
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
})
