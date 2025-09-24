import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import { consoleLoggerPlugin } from "./vite-console-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      overlay: true,
      terminal: true,
      enableBuild: false, // Only check in dev mode
    }),
    consoleLoggerPlugin(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    host: true,
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: "http://localhost:8083",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log(
              `🔄 PROXY REQUEST: ${req.method} ${
                req.url
              } -> ${proxyReq.getHeader("host")}${proxyReq.path}`
            );
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log(
              `✅ PROXY RESPONSE: ${proxyRes.statusCode} ${req.method} ${req.url}`
            );
          });
          proxy.on("error", (error, req, res) => {
            console.error(
              `❌ PROXY ERROR: ${error.message} for ${req.method} ${req.url}`
            );
          });
        },
      },
      "/health": {
        target: "http://localhost:8083",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          radix: ["@radix-ui/react-alert-dialog", "@radix-ui/react-dialog"],
          utils: ["class-variance-authority", "clsx", "tailwind-merge"],
        },
      },
    },
  },
});
