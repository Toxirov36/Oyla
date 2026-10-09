import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { brand, brandTitle, brandDescription } from './src/lib/brand';
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'platform-brand',
      transformIndexHtml: (html: string) =>
        html
          .replace('%BRAND_DESCRIPTION%', brandDescription)
          .replace('%BRAND_TITLE%', brandTitle)
          .replace('%BRAND_FAVICON%', brand.logo.favicon)
          .replace('%BRAND_FAVICON_TYPE%', brand.logo.faviconType)
          .replace('%BRAND_THEME_COLOR%', brand.colors.navy),
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'i18n-vendor': ['i18next', 'react-i18next'],
          'validation-vendor': ['zod', 'zod/v4/locales/uz.js', 'zod/v4/locales/ru.js'],
          'locale-uz': [
            fileURLToPath(new URL('./src/i18n/resources/uz/common.json', import.meta.url)),
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001' },
  },
});
