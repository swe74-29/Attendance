import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built files work when opened from a file:// root inside
// Capacitor/Tauri, not just from a domain root like GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'www', emptyOutDir: true },
});
