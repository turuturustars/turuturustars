import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Optimize images during build
    assetsInlineLimit: 4096,
    
    // Smaller chunk size warning to catch bloated modules
    chunkSizeWarningLimit: 500,
    
    rollupOptions: {
      output: {
        // Better code splitting: separate vendor, UI, and business logic
        manualChunks: {
          // Core React (essential for everything)
          'react-core': ['react', 'react-dom'],
          
          // UI Components (radix-ui - large, but split for parallelization)
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
          ],
          
          'ui-forms': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-slider',
          ],
          
          'ui-layout': [
            '@radix-ui/react-separator',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
          ],
          
          'ui-other': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          
          // Charting library (only loaded if dashboard/charts accessed)
          'charts': ['recharts'],
          
          // Icons (frequently used, worth separate chunk for caching)
          'icons': ['lucide-react'],
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
