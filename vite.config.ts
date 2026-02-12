import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          const extType = name.split('.').at(1) || '';
          if (/png|jpe?g|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            return `assets/img/[name]-[hash][extname]`;
          } else if (/woff|woff2|ttf|otf|eot/.test(extType)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        }
      }
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "apple-touch-icon.png",
        "favicon-32x32.png",
        "pwa-64x64.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png",
        "pwa-screenshot-narrow.jpg",
        "pwa-screenshot-wide.jpg",
        "browserconfig.xml",
      ],
      manifest: {
        id: "/",
        name: "Turuturu Stars CBO",
        short_name: "Turuturu Stars",
        description:
          "Turuturu Stars CBO community platform for members, welfare, contributions, announcements, and mobile payments.",
        start_url: "/?source=pwa",
        scope: "/",
        lang: "en",
        orientation: "portrait-primary",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
        background_color: "#ffffff",
        theme_color: "#0d4bb5",
        categories: ["community", "finance", "productivity"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/pwa-screenshot-narrow.jpg",
            sizes: "720x1280",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Member dashboard on mobile",
          },
          {
            src: "/pwa-screenshot-wide.jpg",
            sizes: "1280x720",
            type: "image/jpeg",
            form_factor: "wide",
            label: "Turuturu Stars web app desktop view",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Open your dashboard quickly",
            url: "/dashboard/home",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Contributions",
            short_name: "Contributions",
            description: "Open contributions and payments",
            url: "/dashboard/finance/contributions",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,json,woff,woff2,mp3}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/mkcgkfzltohxagqvsbqk\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "asset-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
