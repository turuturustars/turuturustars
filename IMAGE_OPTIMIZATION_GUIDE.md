# 🖼️ Image Optimization Guide - Core Web Vitals Improvement

## Current Status

**Baseline Performance:**
- LCP (Largest Contentful Paint): ~3.0s
- Total Image Size: ~3MB (7 carousel images)
- Potential Savings: 2,985 KiB + 3.1s LCP improvement

**Already Implemented:**
✅ HTML preloading of critical images (`<link rel="preload">`)
✅ Image preloading effect in React with `fetchPriority: 'high'`
✅ CSS containment and GPU acceleration (`contain: layout style paint`, `will-change`, `backface-visibility`)
✅ `content-visibility: auto` for first image (LCP optimization)
✅ Vite configuration with asset inlining and organization
✅ OptimizedImage component with lazy loading support

---

## Phase 1: Measure Baseline (Current)

Before optimizing, establish baseline metrics:

### Using Lighthouse (Chrome DevTools)
```bash
# Option A: Manual testing in browser
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Performance" and "Mobile" (LCP is important on mobile)
4. Click "Analyze page load"
5. Note:
   - Largest Contentful Paint (LCP) - should be < 2.5s
   - Cumulative Layout Shift (CLS)
   - First Input Delay (FID)
   - Image sizes in "Opportunities" tab

# Option B: Using Lighthouse CLI
npm install -g @lhci/cli@latest lighthouse
lighthouse https://turuturustars.co.ke --output=json --output-path=./lhci_reports
```

### Manual Image Analysis
```bash
# Check current image sizes
cd src/assets
ls -lh *.jpg *.png

# Expected baseline (approximate):
# gallery-members.png: ~500-600 KB
# turuturu_stars_community_togther_with_senator_veronica_maina.jpg: ~400-500 KB
# turuturustars_community_during_prize_giving_day.jpg: ~400-500 KB
# (Others varying 200-400 KB each)
```

---

## Phase 2: Image Compression (Lossy Optimization)

### 2A. JPEG Quality Reduction (Biggest Impact)

JPEG files can be compressed significantly without visible quality loss.

**Using ImageMagick (Recommended):**
```bash
# Install ImageMagick
# Windows (PowerShell as Admin):
choco install imagemagick

# macOS:
brew install imagemagick

# Then optimize JPEGs:
magick convert turuturu_stars_community_togther_with_senator_veronica_maina.jpg -quality 75 -strip turuturu_stars_community_togther_with_senator_veronica_maina.jpg
magick convert turuturustars_community_during_prize_giving_day.jpg -quality 75 -strip turuturustars_community_during_prize_giving_day.jpg
magick convert best_students_with_student_motivation_team.jpg -quality 75 -strip best_students_with_student_motivation_team.jpg
magick convert motivation_team_and\ mentorsip_program.jpg -quality 75 -strip motivation_team_and\ mentorsip_program.jpg
magick convert veronica_maina_adressing_parents_and_pupils.jpg -quality 75 -strip veronica_maina_adressing_parents_and_pupils.jpg
magick convert lower_grade_pupils.jpg -quality 75 -strip lower_grade_pupils.jpg
magick convert headteacher_with_veronica_maina.jpg -quality 75 -strip headteacher_with_veronica_maina.jpg
```

**Using Online Tool (No Installation):**
1. Visit: https://compressor.io
2. Upload each JPG image
3. Download compressed version
4. Quality 75-80 is usually imperceptible to humans
5. Expected savings: 30-50% per image

**Using FFmpeg:**
```bash
# Install ffmpeg (if not already installed)
# Then optimize JPEGs:
ffmpeg -i input.jpg -q:v 8 output.jpg  # Quality 8 (~75-80% quality)
```

**Expected Results:**
- Before: 400-500 KB per image
- After: 150-250 KB per image
- Savings per image: 50-60%
- Total carousel savings: ~1.5-2 MB

### 2B. PNG Optimization (Smaller Impact)

PNGs are lossless, so compression is more limited.

**Using ImageMagick:**
```bash
magick convert gallery-members.png -quality 95 -strip gallery-members.png
magick convert turuturustarslogo.png -quality 95 -strip turuturustarslogo.png
```

**Using Online Tool:**
Visit: https://tinypng.com
- Upload PNG files
- Download optimized versions
- Expected savings: 20-40% per image

**Or Using pngquant (CLI):**
```bash
# Install pngquant
npm install -g pngquant

# Optimize PNG
pngquant 256 gallery-members.png --output gallery-members-optimized.png --force
```

---

## Phase 3: Modern Image Formats (WebP/AVIF)

### 3A. Convert Images to WebP Format

WebP provides 25-35% better compression than JPEG/PNG.

**Using ImageMagick:**
```bash
# Convert JPEG to WebP
magick convert turuturu_stars_community_togther_with_senator_veronica_maina.jpg turuturu_stars_community_togther_with_senator_veronica_maina.webp

# Convert PNG to WebP
magick convert gallery-members.png gallery-members.webp
```

**Using FFmpeg:**
```bash
ffmpeg -i input.jpg -c:v libwebp -q:v 80 output.webp
```

**Using Online Tool:**
1. Visit: https://convertio.co/jpg-webp/
2. Upload JPEG images
3. Download WebP versions

**Create picture elements for fallback:**

```tsx
// Update HeroSection.tsx to use WebP with JPEG fallback
import galleryMembersWebp from '@/assets/gallery-members.webp';
import galleryMembersJpg from '@/assets/gallery-members.png';

// In JSX:
<picture>
  <source srcSet={galleryMembersWebp} type="image/webp" />
  <img src={galleryMembersJpg} alt="Gallery members" />
</picture>
```

---

## Phase 4: Responsive Images (srcset)

### 4A. Create Multiple Image Sizes

For images that display at different sizes on different devices:

```bash
# Using ImageMagick to create responsive sizes:
magick convert turuturu_stars_community_togther_with_senator_veronica_maina.jpg \
  -resize 1920x1080 turuturu_stars_1920.jpg
magick convert turuturu_stars_community_togther_with_senator_veronica_maina.jpg \
  -resize 1280x720 turuturu_stars_1280.jpg
magick convert turuturu_stars_community_togther_with_senator_veronica_maina.jpg \
  -resize 640x360 turuturu_stars_640.jpg
```

### 4B. Update OptimizedImage Component

```tsx
// src/components/OptimizedImage.tsx
<img
  src={src}
  srcSet={`
    ${src}?w=640 640w,
    ${src}?w=1280 1280w,
    ${src}?w=1920 1920w
  `}
  sizes="(max-width: 640px) 100vw,
          (max-width: 1280px) 100vw,
          1920px"
  alt={alt}
  loading={loadingMode}
/>
```

### 4C. For Hero Section (Background Images)

Since hero uses `backgroundImage` CSS, use media queries instead:

```css
.hero-bg-image {
  background-size: cover;
  background-position: center;
}

@media (max-width: 768px) {
  .hero-bg-image {
    background-image: url('/src/assets/gallery-members-640.jpg');
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .hero-bg-image {
    background-image: url('/src/assets/gallery-members-1280.jpg');
  }
}

@media (min-width: 1025px) {
  .hero-bg-image {
    background-image: url('/src/assets/gallery-members-1920.jpg');
  }
}
```

---

## Phase 5: Build Optimization

### 5A. Install Vite Image Compression Plugin

```bash
npm install -D vite-plugin-imagemin
```

### 5B. Update vite.config.ts

```typescript
import ViteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
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
        quality: 75,  // JPEG quality
        progressive: true,
      },
      pngquant: {
        quality: [0.75, 0.85],
        speed: 4,
      },
      webp: {
        quality: 75,
      },
    }),
  ],
  build: {
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            extType = 'img';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        }
      }
    }
  }
});
```

### 5C. Build and Analyze

```bash
# Build the project
npm run build

# Check output size
du -sh dist/

# Check individual asset sizes
ls -lh dist/assets/img/
```

---

## Phase 6: Lazy Loading for Non-Critical Images

### 6A. Update Components Using OptimizedImage

For images below the fold (not visible on initial load):

```tsx
// Gallery page
import OptimizedImage from '@/components/OptimizedImage';

export function GalleryPage() {
  return (
    <div>
      {/* Below-the-fold images: lazy load by default */}
      <OptimizedImage
        src="/src/assets/best_students.jpg"
        alt="Best students"
        loading="lazy"  // Will lazy load
      />
      
      {/* Critical images: eager load */}
      <OptimizedImage
        src="/src/assets/hero-image.jpg"
        alt="Hero"
        priority={true}  // Will eager load
      />
    </div>
  );
}
```

### 6B. Audit Current Components

```bash
# Find all <img> tags that should use OptimizedImage
grep -r "<img" src/components/ --include="*.tsx"
```

---

## Phase 7: Verification & Metrics

### 7A. Re-run Lighthouse

After optimization, measure improvement:

```bash
# Use Lighthouse CLI
lighthouse https://turuturustars.co.ke --output=json --output-path=./lhci_reports_after

# Or use browser DevTools:
# F12 → Lighthouse → Analyze page load
```

**Target Metrics:**
- LCP: < 2.5s (from ~3.0s)
- FCP (First Contentful Paint): < 1.8s
- Image optimization score: > 90

### 7B. Size Reduction Report

```bash
# Compare sizes before/after
ls -lh src/assets/ > before.txt
ls -lh dist/assets/img/ > after.txt

# Calculate total savings
du -sh src/assets/
du -sh dist/assets/img/
```

**Expected Improvements:**
- JPEG compression (75% quality): 50% reduction
- WebP conversion: 25-35% additional savings
- Responsive images: 40-60% savings on mobile
- **Total: 60-75% combined reduction**

---

## Phase 8: Content Delivery Network (CDN)

### 8A. Cloudflare Image Optimization

If using Cloudflare (free tier available):

1. Add Cloudflare Polish (Image Optimization):
   - Login to Cloudflare Dashboard
   - Speed → Optimization → Polish
   - Select "Lossless" or "Lossy" (lossy recommended)
   - Enable WebP delivery to modern browsers

2. Add Cloudflare Rocket Loader:
   - Speed → Optimization → Rocket Loader
   - This optimizes JavaScript loading

3. Enable Image Resizing (Paid Feature):
   - Can serve images at optimal sizes per device

### 8B. Alternative: Firebase Hosting with Cloud Storage

Firebase provides automatic image optimization:

```typescript
// Use Firebase Storage with Imgix transformation
const imgixUrl = `https://turuturustars.imgix.net/image.jpg?w=${screenWidth}&q=75&auto=format`;
```

---

## Quick Start Action Plan

### This Week:
1. **Measure:** Run Lighthouse, note LCP baseline
2. **Compress:** Use compressor.io to optimize JPEGs (75% quality)
3. **Convert:** Convert JPEGs to WebP using convertio.co
4. **Test Build:** Run `npm run build`, check size reduction

### Next Week:
5. **Automate:** Install vite-plugin-imagemin and update vite.config.ts
6. **Implement:** Update OptimizedImage component usage across site
7. **Verify:** Re-run Lighthouse, measure LCP improvement
8. **Deploy:** Push changes to production, monitor metrics

---

## Useful Tools & Resources

### Online Tools (No Installation):
- **Compression:** https://compressor.io, https://tinypng.com
- **Format Conversion:** https://convertio.co
- **Batch Processing:** https://imgoptimizer.com

### Command-Line Tools:
- **ImageMagick:** Fast, powerful image manipulation
- **FFmpeg:** Video processing, can optimize images
- **pngquant:** PNG-specific optimization

### Browser Tools:
- **Lighthouse:** Built into Chrome DevTools (F12)
- **WebPageTest:** https://www.webpagetest.org (detailed analysis)

### Vite Plugins:
- **vite-plugin-imagemin:** Automatic compression during build
- **vite-plugin-image:** Image processing and optimization
- **@vitejs/plugin-react:** Already installed, good for React

---

## Monitoring & Continuous Improvement

### Set Up Alerts:
- Monitor LCP on prod with tools like:
  - **Web Vitals extension** (Google Chrome)
  - **Sentry** (error tracking + RUM)
  - **LogRocket** (session replay + metrics)

### Regular Audits:
- Run Lighthouse monthly
- Check image file sizes quarterly
- Update compression settings as new tools emerge

### Track Metrics:
- Use Google Analytics 4 to track engagement
- Correlate faster LCP with bounce rate reduction
- Monitor conversion rate improvements

---

## FAQ

**Q: How much quality loss from 75% JPEG?**
A: For photographs, imperceptible at typical viewing distances. 75% = professional quality.

**Q: Should I remove the old images?**
A: Keep originals as backup. Use optimized versions in src/assets/.

**Q: Is WebP supported in all browsers?**
A: No, use `<picture>` tag with JPEG fallback. Modern browsers: ~95% support.

**Q: Will LCP improve just from image compression?**
A: Yes! Smaller files = faster download = earlier paint. Expected: 1-2 seconds improvement.

**Q: What's the easiest quick win?**
A: JPEG quality reduction to 75% with compressor.io. Takes 15 minutes, 50% size reduction.

