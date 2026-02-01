import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  build: {
    // Optimize images during build
    assetsInlineLimit: 4096,
    
    // Smaller chunk size warning to catch bloated modules
    chunkSizeWarningLimit: 1000,
    
    // Disable code splitting to avoid circular dependency issues
    commonjsOptions: {
      transformMixedEsm: true,
    },
    
    rollupOptions: {
      output: {
        // Single bundle initially to avoid initialization issues
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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
