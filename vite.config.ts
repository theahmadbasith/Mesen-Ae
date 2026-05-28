import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
      sourcemap: mode !== 'production',
      target: 'esnext',
      chunkSizeWarningLimit: 2000,
    },
  };
});
