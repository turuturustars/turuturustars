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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core vendor chunks - ensure React/React-DOM load first
          if (id.includes('node_modules/react-dom')) {
            return 'vendor-react-dom';
          }
          if (id.includes('node_modules/react') && !id.includes('react-dom')) {
            return 'vendor-react';
          }
          // Radix-UI depends on React, so it goes in its own chunk
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          // Other major vendors
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          
          // Feature-based chunks for dashboard
          if (id.includes('pages/dashboard/') && id.includes('Financial')) {
            return 'dashboard-finance';
          }
          if (id.includes('pages/dashboard/') && id.includes(('Members' || 'Approvals' || 'Welfare'))) {
            return 'dashboard-members';
          }
          if (id.includes('pages/dashboard/') && id.includes(('Chairman' || 'Secretary' || 'Treasurer' || 'Organizing' || 'Patron'))) {
            return 'dashboard-roles';
          }
          if (id.includes('components/dashboard/')) {
            return 'dashboard-components';
          }
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
