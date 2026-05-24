import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Muat file .env dari root direktori
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      emptyOutDir: false, // Jangan bersihkan folder public saat build
      outDir: 'public',
      lib: {
        entry: path.resolve(__dirname, 'src/services/firebase-messaging-sw.ts'),
        name: 'firebaseMessagingSW',
        formats: ['iife'],
        fileName: () => 'firebase-messaging-sw.js',
      },
      rollupOptions: {
        // Jangan lakukan externalize, bungkus (bundle) semua Firebase SDK ke dalam 1 file minified
        external: [],
      },
      minify: 'esbuild',
      sourcemap: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      // Injeksi env variables secara manual agar didukung penuh saat mode bundler library (iife)
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    }
  };
});
