# 🚀 Lighthouse Performance Fixes - Network & Interactive

## Summary of Issues to Fix

| Issue | Est. Savings | Priority | Difficulty |
|-------|--------------|----------|------------|
| Reduce unused JavaScript | 79 KiB | HIGH | Medium |
| Render blocking requests | 150 ms | HIGH | Medium |
| Time to Interactive (TTI) | 14.9 s | CRITICAL | Hard |
| Use efficient cache lifetimes | 3,597 KiB | HIGH | Easy |
| Network dependency tree | - | HIGH | Hard |

**Total Potential Improvement:** ~3.8 MB + 15s faster TTI

---

## Issue 1: Render Blocking Requests (150 ms savings)

### Problem
CSS and JavaScript in `<head>` block page rendering until downloaded/parsed.

### Solution 1A: Defer Non-Critical CSS

**Current index.html:**
```html
<link rel="stylesheet" href="/styles.css">  <!-- Blocks rendering -->
```

**Fixed index.html:**
```html
<!-- Critical CSS (inline in head) -->
<style>
  /* Minimal critical styles for above-the-fold */
  .hero { display: flex; }
  body { font-family: system-ui; }
</style>

<!-- Non-critical CSS (defer with media='print') -->
<link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>
```

### Solution 1B: Defer JavaScript

**Current index.html:**
```html
<script src="/app.js"></script>  <!-- Blocks rendering -->
```

**Fixed index.html:**
```html
<!-- Defer non-critical scripts -->
<script src="/app.js" defer></script>

<!-- Only inline critical initialization -->
<script>
  // Minimal runtime setup (< 10 KB)
  window.__CONFIG__ = {...};
</script>
```

### Solution 1C: Preload Critical Resources

```html
<head>
  <!-- High priority: visible images, fonts -->
  <link rel="preload" as="image" href="/hero.jpg">
  <link rel="preload" as="font" href="/font.woff2" crossorigin>
  
  <!-- Normal priority: rest of resources -->
  <link rel="prefetch" href="/secondary-page.js">
</head>
```

---

## Issue 2: Reduce Unused JavaScript (79 KiB savings)

### Problem
Bundling dependencies you don't use. Common culprits:
- Unused UI library components
- Development-only dependencies
- Polyfills for unsupported browsers

### Solution 2A: Analyze Bundle

```bash
# Install analyzer
npm install -D vite-plugin-visualizer

# Then add to vite.config.ts:
import { visualizer } from 'vite-plugin-visualizer';

plugins: [
  ...
  visualizer({
    open: true,  // Opens report in browser
    gzip: true,
    filename: 'dist/stats.html'
  })
]
```

Run analysis:
```bash
npm run build
# Opens: dist/stats.html
# Shows: Which packages are largest
```

### Solution 2B: Remove Unused Dependencies

Common bloat:
```json
{
  "dependencies": {
    "lodash": "^4.17.21",      // ❌ Use native JS instead
    "moment": "^2.29.0",       // ❌ Use Date API or date-fns tree-shake better
    "axios": "^1.0.0",         // ✅ Keep if used, else use fetch
    "recharts": "^2.0.0"       // ❌ Only if dashboard uses it
  }
}
```

**Fix:**
```bash
# Find what's unused
npm ls lodash  # Check if anything imports it
npm ls moment

# Remove unused
npm uninstall lodash moment

# Replace in code with native APIs:
# lodash.debounce → use: setTimeout + flag
# moment.format → use: date.toLocaleDateString()
```

### Solution 2C: Code Split Large Components

**Before (all bundled together):**
```tsx
import AdminDashboard from './pages/AdminDashboard';  // 45 KB
import UserProfile from './pages/UserProfile';        // 32 KB
import PaymentForm from './pages/PaymentForm';        // 28 KB

export default function App() {
  return <Routes>...</Routes>;
}
```

**After (split by route):**
```tsx
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const PaymentForm = lazy(() => import('./pages/PaymentForm'));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/pay" element={<PaymentForm />} />
      </Routes>
    </Suspense>
  );
}
```

### Solution 2D: Tree-Shake Unused Exports

In your libraries, use named imports:

```tsx
// ❌ Bad - imports entire module
import * as utils from './utils';
utils.formatDate();

// ✅ Good - tree-shakes unused functions
import { formatDate } from './utils';
formatDate();
```

---

## Issue 3: Time to Interactive (TTI) - 14.9s savings

### Problem
Page becomes interactive too late because:
1. JavaScript is large (blocks parsing)
2. JavaScript execution is slow
3. No priority hint on critical scripts

### Solution 3A: Optimize Main Entry Point

**vite.config.ts:**
```typescript
export default defineConfig({
  build: {
    // Smaller initial chunk
    chunkSizeWarningLimit: 500,
    
    // Better code splitting
    rollupOptions: {
      output: {
        // Separate vendor code from app code
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-button'],
          'vendor-charts': ['recharts'],
        }
      }
    }
  }
});
```

### Solution 3B: Defer Heavy Libraries

```tsx
// src/utils/heavyProcessing.ts
// ❌ Don't import at top level
import pandas from 'pandas-js';  // 200 KB

// ✅ Lazy load when needed
async function analyzeData() {
  const { processData } = await import('pandas-js');
  return processData();
}
```

### Solution 3C: Use Web Workers for Heavy Computation

```tsx
// src/workers/imageProcessing.ts
// Run expensive operations off-thread
self.onmessage = (event) => {
  const { imageData } = event.data;
  const result = processImage(imageData);  // Expensive
  self.postMessage({ result });
};

// In component:
const worker = new Worker(
  new URL('../workers/imageProcessing.ts', import.meta.url),
  { type: 'module' }
);

worker.postMessage({ imageData });
worker.onmessage = (event) => {
  setProcessedImage(event.data.result);
};
```

### Solution 3D: Optimize Third-Party Scripts

```html
<!-- ❌ Script blocking rendering -->
<script src="https://third-party.com/analytics.js"></script>

<!-- ✅ Async (doesn't block) -->
<script async src="https://third-party.com/analytics.js"></script>

<!-- ✅ Defer (loads after HTML parse) -->
<script defer src="https://third-party.com/analytics.js"></script>

<!-- ✅ With preload hint -->
<link rel="preload" as="script" href="https://third-party.com/analytics.js">
<script defer src="https://third-party.com/analytics.js"></script>
```

---

## Issue 4: Use Efficient Cache Lifetimes (3,597 KiB savings)

### Problem
Browser cache not configured properly:
- Long-lived assets (JS, CSS, images) cached for 1 hour → should be 1 year
- HTML cached for 1 year → should be 5 minutes (so updates appear quickly)
- API responses not cached at all → should cache successful GET requests

### Solution 4A: Configure Cloudflare Cache

**If using Cloudflare (recommended):**

1. Dashboard → Rules → Cache Rules
2. Create rule:
   ```
   When: URI path contains "/assets/"
   Then: Cache → TTL (Browser): 1 year
         Cache → TTL (Edge): 1 year
   
   When: URI path contains ".js" or ".css"
   Then: Cache → TTL (Browser): 1 year
         Cache → TTL (Edge): 1 year
   ```

3. Create rule for HTML:
   ```
   When: URI path ends with ".html" or path equals "/"
   Then: Cache → TTL (Browser): 5 minutes
         Cache → TTL (Edge): 30 minutes
         Cache → Cache Level: Cache Everything
   ```

### Solution 4B: Configure Vercel/Netlify Cache Headers

**vercel.json:**
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)\\.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)\\.css",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=300" }
      ]
    }
  ]
}
```

**netlify.toml:**
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=300"
```

### Solution 4C: Service Worker Caching (Advanced)

```typescript
// src/service-worker.ts
const CACHE_VERSION = 'v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) return response;
      
      // Fetch fresh version
      return fetch(event.request).then((response) => {
        // Cache for next time
        const cache = caches.open(CACHE_VERSION);
        cache.then(c => c.put(event.request, response.clone()));
        return response;
      });
    })
  );
});
```

---

## Issue 5: Network Dependency Tree

### Problem
Resources load in sequence instead of parallel:
1. HTML loads
2. → Discovers CSS → CSS loads
3. → Discovers JS → JS loads
4. → App renders

Chain = slow

### Solution 5A: Use Resource Hints

```html
<head>
  <!-- Warm up DNS lookup (0-2ms saved per resource) -->
  <link rel="dns-prefetch" href="//cdn.example.com">
  
  <!-- Pre-connect (includes DNS + TLS, 0-100ms saved) -->
  <link rel="preconnect" href="https://api.example.com">
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  
  <!-- Pre-fetch: Resources needed later (not immediately) -->
  <link rel="prefetch" href="/next-page.js">
  
  <!-- Pre-load: Critical resources for current page -->
  <link rel="preload" as="script" href="/app.js">
  <link rel="preload" as="style" href="/styles.css">
  <link rel="preload" as="image" href="/hero.jpg">
</head>
```

### Solution 5B: Inline Critical Path

**index.html - Inline critical CSS:**
```html
<head>
  <style>
    /* Critical above-the-fold styles ONLY (~10 KB max) */
    .hero { background: linear-gradient(...); }
    .hero-text { font-size: 2rem; }
    button { padding: 8px 16px; }
  </style>
  
  <!-- Rest of CSS loads deferred -->
  <link rel="stylesheet" href="/app.css" media="print" onload="this.media='all'">
</head>
```

### Solution 5C: Parallel Downloads with HTTP/2 Server Push

```typescript
// vite.config.ts (for dev server)
export default defineConfig({
  server: {
    middlewareMode: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
});
```

For production, configure reverse proxy (nginx):

```nginx
location / {
  # Push critical resources without waiting for browser request
  http2_push /assets/vendor.js;
  http2_push /assets/app.js;
  http2_push /assets/styles.css;
  
  proxy_pass http://backend;
}
```

---

## Implementation Checklist

### Week 1: Quick Wins (30 minutes)

- [ ] **Cache Headers** (5 min)
  - [ ] Add Cloudflare cache rules OR vercel.json
  - [ ] Set HTML to 5 min, assets to 1 year

- [ ] **Render Blocking** (10 min)
  - [ ] Add `defer` to all `<script>` tags
  - [ ] Defer non-critical CSS

- [ ] **Resource Hints** (5 min)
  - [ ] Add `preconnect` to API/CDN domains
  - [ ] Add `preload` for critical images

- [ ] **Remove Unused JS** (10 min)
  - [ ] Install vite-plugin-visualizer
  - [ ] Run `npm run build`
  - [ ] Identify largest unused packages
  - [ ] Remove lodash, moment, or other bloat

### Week 2: Deeper Optimization (2-3 hours)

- [ ] **Code Splitting** (1 hour)
  - [ ] Convert route imports to lazy()
  - [ ] Test each route loads independently
  - [ ] Check bundle size: `npm run build`

- [ ] **Defer Heavy Libraries** (30 min)
  - [ ] Identify heavy imports (> 50 KB)
  - [ ] Make them async/on-demand

- [ ] **Web Workers** (1 hour - optional)
  - [ ] Move image processing to worker
  - [ ] Verify TTI improvement

- [ ] **Service Worker** (1 hour - advanced)
  - [ ] Implement offline caching
  - [ ] Cache API responses

### Week 3: Validation

- [ ] Re-run Lighthouse
- [ ] Verify improvements:
  - [ ] TTI < 15s (target < 3.5s)
  - [ ] FCP < 1.8s
  - [ ] LCP < 2.5s
- [ ] Test on real device (mobile)
- [ ] Monitor production metrics

---

## Expected Results

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Time to Interactive | ~19s | ~4s | **15s** ✅ |
| Unused JavaScript | ~79 KiB | ~20 KiB | **59 KiB** |
| Render Blocking | 150ms | <50ms | **100ms** |
| Cache Size | 3,597 KiB | 0 KiB | **3,597 KiB** |
| Total Improvement | - | - | **~3.8 MB + 15s** |

---

## Tools & Commands

```bash
# Analyze bundle size
npm install -D vite-plugin-visualizer
npm run build  # Opens stats.html

# Audit dependencies
npm audit
npm outdated

# Test performance locally
npm run build
npm run preview  # Serves dist/ with no optimizations
# Then run Lighthouse on http://localhost:4173

# Monitor TTI improvement
# Use: Chrome DevTools → Performance tab
# Record page load, zoom into "Scripting" section
```

---

## Further Reading

- [Web.dev - Optimize LCP](https://web.dev/optimize-lcp/)
- [Web.dev - First Input Delay](https://web.dev/fid/)
- [Vite - Performance](https://vitejs.dev/guide/performance.html)
- [Cloudflare - Cache](https://developers.cloudflare.com/cache/)

