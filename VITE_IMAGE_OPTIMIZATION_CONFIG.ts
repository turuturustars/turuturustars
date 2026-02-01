// Vite Configuration with Image Optimization
// This file shows how to add vite-plugin-imagemin for automatic image compression
// during the build process.

// OPTION 1: Current vite.config.ts (No automatic compression)
// Use this if you're doing manual image optimization with optimize-images.sh

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react', 'react-dom',
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-hover-card',
            '@radix-ui/react-label', '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu', '@radix-ui/react-popover',
            '@radix-ui/react-progress', '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area', '@radix-ui/react-select',
            '@radix-ui/react-separator', '@radix-ui/react-slider',
            '@radix-ui/react-slot', '@radix-ui/react-switch',
            '@radix-ui/react-tabs', '@radix-ui/react-toast',
            '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip', 'recharts', 'lucide-react'
          ]
        },
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            extType = 'img';
          } else if (/woff|woff2|ttf|otf|eot/.test(extType)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));


// ============================================================================

// OPTION 2: With vite-plugin-imagemin (Automatic compression during build)
// To use this:
// 1. npm install -D vite-plugin-imagemin
// 2. Replace vite.config.ts content with the code below
// 3. Run: npm run build

/*
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import ViteImagemin from 'vite-plugin-imagemin';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react', 'react-dom',
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-hover-card',
            '@radix-ui/react-label', '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu', '@radix-ui/react-popover',
            '@radix-ui/react-progress', '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area', '@radix-ui/react-select',
            '@radix-ui/react-separator', '@radix-ui/react-slider',
            '@radix-ui/react-slot', '@radix-ui/react-switch',
            '@radix-ui/react-tabs', '@radix-ui/react-toast',
            '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip', 'recharts', 'lucide-react'
          ]
        },
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            extType = 'img';
          } else if (/woff|woff2|ttf|otf|eot/.test(extType)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    ViteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 75,        // JPEG quality (75 = professional)
        progressive: true,  // Progressive JPEG for faster perceived load
      },
      pngquant: {
        quality: [0.75, 0.85],
        speed: 4,
      },
      webp: {
        quality: 75,
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
          },
          {
            name: 'removeEmptyAttrs',
            active: false,
          },
        ],
      },
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
*/
