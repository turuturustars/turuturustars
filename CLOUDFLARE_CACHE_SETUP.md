# Cloudflare Cache Configuration Guide

## Why Cache Matters
- Repeat visits: 3,597 KiB saved by using cache (Lighthouse estimate)
- Browser cache: Images/JS/CSS cached for 1 year = instant load on return
- Edge cache: Content cached on Cloudflare servers globally = faster for first-time visitors

---

## Setup Instructions

### Step 1: Enable Caching on Cloudflare Dashboard

1. **Go to:** https://dash.cloudflare.com
2. **Select:** turuturustars.co.ke domain
3. **Navigate:** Caching → Configuration

### Step 2: Create Cache Rules for Static Assets

**Rule 1: Cache All CSS, JS, Images for 1 Year**

Path: **Caching → Rules → Create rule**

```
Name: Cache static assets 1 year
When: URI path contains any of: 
  /assets/
  /src/
  *.js
  *.css
  *.png
  *.jpg
  *.webp
  *.svg

Then:
  Cache → TTL (Browser): 1 year (31536000 seconds)
  Cache → TTL (Edge): 1 year (31536000 seconds)
  Cache → Browser Cache TTL: Respect existing headers
```

**Rule 2: Cache HTML (5 minutes)**

```
Name: Cache HTML 5 minutes
When: URI path ends with:
  .html
  or
  path equals /

Then:
  Cache → TTL (Browser): 5 minutes (300 seconds)
  Cache → TTL (Edge): 30 minutes (1800 seconds)
  Cache Level: Cache everything
  Browser Cache TTL: Respect existing headers
```

**Rule 3: Cache API Responses (if applicable)**

```
Name: Cache API GET requests
When: 
  URI path contains /api/
  AND
  Request method equals GET

Then:
  Cache → TTL (Edge): 5 minutes (300 seconds)
  Cache Level: Cache everything
```

### Step 3: Add Cache Headers (Optional - Advanced)

If using Vercel, Netlify, or custom server:

**Vercel (vercel.json):**
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.css",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300"
        }
      ]
    }
  ]
}
```

**Netlify (netlify.toml):**
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
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=300"
```

---

## Cache Behavior Explained

### Static Assets (1 year = 31,536,000 seconds)
- Applies to: `/assets/`, `*.js`, `*.css`, images
- Why: Vite builds include hash in filename (e.g., `app-abc123.js`)
- If file changes, filename changes → new version served
- Browser keeps old version 1 year = fast loads

### HTML (5 minutes = 300 seconds)
- Why: Updates need to appear within 5 minutes
- Prevent: Users seeing old HTML while JS is cached
- Ensures: New version discovered quickly

### API Responses (5 minutes)
- Cache GET requests only (safe)
- Don't cache POST/PUT/DELETE (mutations)
- Let CMS/database requests stay fresh

---

## Verify Caching is Working

### Using Lighthouse
1. Run Lighthouse (DevTools → Lighthouse)
2. Check: "Use efficient cache lifetimes"
3. Should show green ✅ if configured

### Using curl
```bash
# Check response headers
curl -I https://turuturustars.co.ke

# Look for:
# Cache-Control: public, max-age=31536000, immutable
# CF-Cache-Status: HIT (or MISS on first load)
```

### Using DevTools
1. Open DevTools (F12)
2. Network tab
3. Reload page
4. Check "Size" column:
   - First load: Shows KB (from server)
   - Reload: Shows "disk cache" (from browser cache)
   - Repeat visit: Instant (from cache)

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Return visitor load | 2-3s | < 500ms |
| Cache savings | 0 | 3,597 KiB |
| Network requests | 50+ | 5-10 |
| Time to Interactive | 19s | ~4-5s |

---

## Troubleshooting

### "Cache not working - still seeing slow loads"
- Check: Is CF-Cache-Status "HIT"? (DevTools → Network → Response headers)
- Solution: Verify cache rule was created and saved
- Solution: Clear browser cache (Ctrl+Shift+Delete)

### "Users see old version after deployment"
- Problem: HTML cached too long
- Solution: Verify HTML has short TTL (5 min)
- Solution: Or use hard refresh (Ctrl+F5) to bypass cache

### "I updated CSS but users don't see changes"
- Expected: Vite renames files (e.g., styles-123abc.css)
- Solution: Update HTML entry → forces browser to fetch new styles
- No action needed if using Vite hash-based filenames

---

## Advanced: Cache Purge (If Needed)

To immediately clear cache (e.g., after emergency fix):

**Cloudflare Dashboard:**
1. Caching → Purge cache
2. Select: "Purge everything"
3. Click: Purge

**CLI (if using wrangler):**
```bash
npm install -g @cloudflare/wrangler
wrangler cache purge

# Or purge specific paths:
wrangler cache purge --paths "https://turuturustars.co.ke/index.html"
```

---

## Summary

| Step | Time | Impact |
|------|------|--------|
| Enable Cloudflare | 2 min | 3,597 KiB savings |
| Create cache rules | 5 min | Automatic caching |
| Verify with DevTools | 2 min | Confirm working |
| **Total** | **9 min** | **3,597 KiB savings** |

**This is the easiest Lighthouse fix - does it in <10 minutes!**

