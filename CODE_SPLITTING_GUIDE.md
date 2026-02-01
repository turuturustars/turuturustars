# Code Splitting & Route Lazy Loading Guide

## Why Code Splitting Matters

**Before code splitting:**
- Bundle size: ~250 KB (all pages combined)
- Initial load: 250 KB downloaded before any page renders
- Time to Interactive: ~5s waiting for unnecessary code

**After code splitting:**
- Initial bundle: ~80 KB (only homepage)
- Admin page: 45 KB (loaded on-demand)
- Payment page: 28 KB (loaded when needed)
- Total saved on first visit: 93 KB (~37%)

---

## Implementation: Lazy Load Routes

### Step 1: Identify Your Routes

List all pages in `src/config/routes.ts` or `src/App.tsx`:

```typescript
// Current structure (all imported upfront)
import Home from '@/pages/Home';
import AdminDashboard from '@/pages/AdminDashboard';  // 45 KB
import UserProfile from '@/pages/UserProfile';        // 32 KB
import PaymentForm from '@/pages/PaymentForm';        // 28 KB
import Settings from '@/pages/Settings';              // 18 KB
```

### Step 2: Convert to Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

// Only the page imports change - rest stays the same!
const Home = lazy(() => import('@/pages/Home'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const PaymentForm = lazy(() => import('@/pages/PaymentForm'));
const Settings = lazy(() => import('@/pages/Settings'));

// Loading fallback component
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/payment" element={<PaymentForm />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Step 3: Test Code Splitting

```bash
# Build project
npm run build

# Check bundle size
npm run build -- --analyze  # If using visualizer plugin

# Or manually check:
ls -lh dist/assets/
# You should see separate chunks for each page:
# - app-initial.js (80 KB)
# - admin-xyz123.js (45 KB) - loaded on demand
# - payment-abc456.js (28 KB) - loaded on demand
```

---

## Lazy Load Heavy Components (Within Pages)

### For Dashboard Pages with Multiple Panels

```typescript
// src/pages/AdminDashboard.tsx
import { lazy, Suspense } from 'react';

// Only render loaded components when visible
const UserManagement = lazy(() => import('@/components/dashboard/UserManagement'));
const AnalyticsChart = lazy(() => import('@/components/dashboard/AnalyticsChart'));
const AuditLog = lazy(() => import('@/components/dashboard/AuditLog'));

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Only load UserManagement component when this tab is visible */}
          <Suspense fallback={<div>Loading users...</div>}>
            <UserManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<div>Loading analytics...</div>}>
            <AnalyticsChart />
          </Suspense>
        </TabsContent>

        <TabsContent value="audit">
          <Suspense fallback={<div>Loading audit log...</div>}>
            <AuditLog />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Benefits:**
- Users don't download charts if they never visit Analytics tab
- Users don't download audit log if they never open it
- Initial page load is much faster

---

## Lazy Load Heavy Libraries

### Before (Downloads immediately even if not used)

```typescript
// src/utils/imageProcessing.ts
import Jimp from 'jimp';  // 200 KB library

export async function resizeImage(src: string, size: number) {
  const image = await Jimp.read(src);
  return image.resize(size, size).getBase64Async(Jimp.MIME_PNG);
}
```

### After (Downloads on-demand)

```typescript
// src/utils/imageProcessing.ts

// Lazy import only when function is called
export async function resizeImage(src: string, size: number) {
  const Jimp = await import('jimp');
  const image = await Jimp.default.read(src);
  return image.resize(size, size).getBase64Async(Jimp.default.MIME_PNG);
}
```

**Usage:**
```typescript
// Component
import { resizeImage } from '@/utils/imageProcessing';

export function PhotoEditor() {
  const handleResize = async () => {
    // Jimp library only downloaded when user clicks button
    const resized = await resizeImage(photo, 200);
  };

  return <button onClick={handleResize}>Resize</button>;
}
```

---

## Identify Unused Dependencies

### Using npm-check-updates

```bash
# Install tool
npm install -D npm-check-updates

# Check for unused packages
npx depcheck

# Output shows:
# Unused dependencies:
#   - lodash (unused)
#   - moment (unused)
# 
# Missing in package.json:
#   - (none)
```

### Manual Audit

```bash
# Search for imports of lodash
grep -r "import.*lodash" src/

# If no results, it's unused
npm uninstall lodash
```

### Common Unused Packages

```json
{
  "dependencies": {
    "lodash": "❌ Use native JS",
    "moment": "❌ Use native Date or date-fns",
    "underscore": "❌ Use native JS",
    "jquery": "❌ React replaces it",
    "axios": "✅ Keep if needed, else use fetch()"
  }
}
```

---

## Reduce Unused JavaScript (79 KiB Target)

### Quick Audit Checklist

- [ ] Remove unused npm packages
  ```bash
  npx depcheck
  npm uninstall <unused-package>
  ```

- [ ] Lazy load routes (Admin, Payment, Settings)
  ```tsx
  const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
  ```

- [ ] Lazy load heavy components
  ```tsx
  const AnalyticsChart = lazy(() => import('@/components/AnalyticsChart'));
  ```

- [ ] Lazy load heavy libraries
  ```tsx
  const Jimp = await import('jimp');  // When needed
  ```

- [ ] Tree-shake unused exports
  ```tsx
  import { formatDate } from '@/utils';  // Not: import * as utils
  ```

### Expected Results

| Change | Before | After | Savings |
|--------|--------|-------|---------|
| Unused packages | 95 KiB | 20 KiB | 75 KiB |
| Un-lazy routes | 250 KiB | 80 KiB | 170 KiB |
| Combined | **345 KiB** | **100 KiB** | **245 KiB** |

Lighthouse target: 79 KiB → easily achievable!

---

## Verify with Lighthouse

```bash
# After making changes:
npm run build

# Run Lighthouse
# Chrome DevTools → Lighthouse → Performance → Analyze

# Check: "Reduce unused JavaScript"
# Should show improvement from 79 KiB to < 20 KiB
```

---

## Advanced: Prefetch Next Routes

For better UX, prefetch routes the user is likely to visit next:

```typescript
// src/App.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useRoutePreload() {
  const location = useLocation();

  useEffect(() => {
    // From home page, prefetch common routes
    if (location.pathname === '/') {
      // Warm up imports (not blocking)
      import('@/pages/UserProfile');
      import('@/pages/Settings');
    }

    // From dashboard, prefetch reports
    if (location.pathname === '/admin') {
      import('@/components/dashboard/AnalyticsChart');
      import('@/components/dashboard/AuditLog');
    }
  }, [location.pathname]);
}

export default function App() {
  useRoutePreload();
  // ... rest of app
}
```

---

## Monitoring Bundle Size

### GitHub Actions CI/CD (Automatic)

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm run build
      
      - name: Analyze bundle
        run: |
          SIZE=$(du -sh dist/ | cut -f1)
          echo "Bundle size: $SIZE"
          if [ "$SIZE" -gt "500KB" ]; then
            echo "❌ Bundle too large!"
            exit 1
          fi
```

### Manual Monitoring

```bash
# Track bundle size over time
npm run build
du -sh dist/assets/

# Add to .gitignore:
dist/
node_modules/

# Or use: npm ls --depth=0
# to see what's installed
```

---

## Summary: Hitting 79 KiB Savings

| Action | Savings | Time |
|--------|---------|------|
| Remove unused packages | 40-50 KiB | 10 min |
| Lazy load routes | 60-80 KiB | 20 min |
| Lazy load components | 30-40 KiB | 15 min |
| **Total** | **~130-170 KiB** | **~45 min** |

**Target: 79 KiB** → Easily achievable with lazy loading routes alone!

