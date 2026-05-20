import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars so we can use them in proxy config (Node.js context)
  const env = loadEnv(mode, process.cwd(), "");
  const serverKey = env.VITE_MIDTRANS_SERVER_KEY;
  const isProduction = env.VITE_MIDTRANS_IS_PRODUCTION === "true";
  const midtransApiBase = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
  const authBase64 = serverKey
    ? Buffer.from(serverKey + ":").toString("base64")
    : "";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api/midtrans-charge": {
          target: midtransApiBase,
          changeOrigin: true,
          rewrite: () => "/v2/charge",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (authBase64) {
                proxyReq.setHeader("Authorization", `Basic ${authBase64}`);
              }
              proxyReq.setHeader("Accept", "application/json");
              proxyReq.setHeader("Content-Type", "application/json");
            });
          },
        },
        "/api/midtrans-status": {
          target: midtransApiBase,
          changeOrigin: true,
          rewrite: (reqPath) => {
            const match = reqPath.match(/orderId=([^&]+)/);
            const orderId = match ? decodeURIComponent(match[1]) : "";
            return `/v2/${orderId}/status`;
          },
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (authBase64) {
                proxyReq.setHeader("Authorization", `Basic ${authBase64}`);
              }
            });
          },
        },
        "/api/midtrans": {
          target: "https://app.sandbox.midtrans.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/midtrans/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (authBase64) {
                proxyReq.setHeader("Authorization", `Basic ${authBase64}`);
              }
              proxyReq.setHeader("Accept", "application/json");
              proxyReq.setHeader("Content-Type", "application/json");
            });
          },
        },
        "/api/midtrans-prod": {
          target: "https://app.midtrans.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/midtrans-prod/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (authBase64) {
                proxyReq.setHeader("Authorization", `Basic ${authBase64}`);
              }
              proxyReq.setHeader("Accept", "application/json");
              proxyReq.setHeader("Content-Type", "application/json");
            });
          },
        },
      },
    },
    plugins: [
      nodePolyfills(),
      react(),
      mode === "development",
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "MesenAe.png",
          "icon-192.png",
          "icon-512.png",
          "icon-maskable.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "MesenAe - Aplikasi Kasir UMKM",
          short_name: "MesenAe",
          description:
            "Aplikasi kasir untuk UMKM. Offline-first, langsung pakai dari browser.",
          start_url: "/",
          display: "standalone",
          background_color: "#0F172A",
          theme_color: "#F97316",
          orientation: "any",
          icons: [
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icon-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      force: false,
    },
    build: {
      target: 'esnext',
    },
  };
});
