import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.NEXT_PUBLIC_PAGES_BUILD === 'true' ? process.env.NEXT_PUBLIC_BASE_PATH + '/' : '/',
  define: {
    'process.env.NEXT_PUBLIC_PAGES_BUILD': JSON.stringify(process.env.NEXT_PUBLIC_PAGES_BUILD || ''),
    'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(process.env.NEXT_PUBLIC_BASE_PATH || ''),
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext()],
  server: { proxy: { '/api': 'http://127.0.0.1:3001', '/media': 'http://127.0.0.1:3001' } },
});
