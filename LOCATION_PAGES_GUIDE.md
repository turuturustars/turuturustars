# How to Add Location Pages - Implementation Guide

## Overview
This guide shows how to create location-specific pages for each service area using the SEO infrastructure already in place.

## Quick Start

### Step 1: Create a Location Page Template

```typescript
// Example: src/pages/LocationPages/KigumoPage.tsx
import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { generateLocationSEO } from '@/config/seoConfig';

const KigumoPage = () => {
  const seo = generateLocationSEO('Kigumo');
  
  usePageMeta({
    ...seo,
    canonicalUrl: 'https://turuturustars.co.ke/locations/kigumo',
  });

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={{ name: 'Kigumo - Turuturu Stars CBO' }} type="WebPage" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Turuturu Stars in Kigumo</h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Community welfare and support services in Kigumo, Muranga County
            </p>
          </div>
        </section>

        {/* Add your content here */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            {/* Your location-specific content */}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default KigumoPage;
```

### Step 2: Add Route in App.tsx

```tsx
// In src/App.tsx - Add lazy imports
const KigumoPage = lazy(() => import('./pages/LocationPages/KigumoPage'));
const GithimaPage = lazy(() => import('./pages/LocationPages/GithimaPage'));
const NgukuPage = lazy(() => import('./pages/LocationPages/NgukuPage'));
// ... etc

// Add routes
<Route path="/locations">
  <Route path="kigumo" element={<KigumoPage />} />
  <Route path="githima" element={<GithimaPage />} />
  <Route path="nguku" element={<NgukuPage />} />
  {/* ... other locations */}
</Route>
```

### Step 3: Create Landmark Pages

```typescript
// Example: src/pages/LandmarkPages/KigumoSecondarySchool.tsx
import { generateLandmarkSEO } from '@/config/seoConfig';
import { usePageMeta } from '@/hooks/usePageMeta';

const KigumoSecondaryPage = () => {
  const seo = generateLandmarkSEO('Kigumo Secondary School', 'Kigumo');
  
  usePageMeta({
    ...seo,
    canonicalUrl: 'https://turuturustars.co.ke/landmarks/kigumo-secondary-school',
  });

  // Component content...
};

export default KigumoSecondaryPage;
```

## Available Service Areas

### Primary Area
- Turuturu (primary focus)

### Secondary Areas (Ready for Location Pages)
1. **Githima** - `generateLocationSEO('Githima')`
2. **Gatune** - `generateLocationSEO('Gatune')`
3. **Githeru** - `generateLocationSEO('Githeru')`
4. **Kigumo** - `generateLocationSEO('Kigumo')`
5. **Nguku** - `generateLocationSEO('Nguku')`
6. **Kahariro** - `generateLocationSEO('Kahariro')`
7. **Duka Moja** - `generateLocationSEO('Duka Moja')`

## Using SEO Configuration Functions

### Get Location-Specific SEO
```typescript
import { generateLocationSEO } from '@/config/seoConfig';

const locationSEO = generateLocationSEO('Kigumo');
// Returns: { title, description, keywords, ... }
```

### Get Landmark-Specific SEO
```typescript
import { generateLandmarkSEO } from '@/config/seoConfig';

const landmarkSEO = generateLandmarkSEO('Kigumo Secondary School', 'Kigumo');
// Returns: { title, description, keywords, ... }
```

### Get All Keywords
```typescript
import { SEO_CONFIG } from '@/config/seoConfig';

const allKeywords = SEO_CONFIG.getAllKeywords();
// Returns array of all optimized keywords
```

### Get All Locations
```typescript
const allLocations = SEO_CONFIG.getAllLocations();
// Returns: ['Turuturu', 'Muranga', 'Kenya', 'Githima', ...]
```

### Get All Landmarks
```typescript
const allLandmarks = SEO_CONFIG.getAllLandmarks();
// Returns array of all schools, churches, and landmarks
```

## Recommended Content Structure

### For Location Pages
1. **Hero Section** - Location name and intro
2. **Overview** - About the community in that area
3. **Services** - Available services in that location
4. **Contact** - How to reach out in that area
5. **Nearby Landmarks** - Schools, churches, etc.
6. **Success Stories** - Community testimonials
7. **Call to Action** - Join the community

### For Landmark Pages
1. **Landmark Info** - Brief description
2. **Community Presence** - Turuturu Stars in that area
3. **Services Available** - What we offer nearby
4. **Contact Section** - How to reach us
5. **Nearby Services** - Other nearby landmarks

## SEO Best Practices for Location Pages

1. **Unique Content**
   - Write original content for each location
   - Include local stories and testimonials
   - Mention local landmarks

2. **Internal Linking**
   - Link to main services pages
   - Link to related locations
   - Link to nearby landmarks

3. **Keywords**
   - Use location name in title
   - Include location keywords naturally
   - Mention nearby landmarks

4. **Schema Markup**
   - LocalBusiness schema per location
   - Service area schema
   - Address schema

5. **Meta Tags**
   - Unique title per location
   - Location-specific description
   - Local keywords in meta

## Example Complete Page

```typescript
import Header from '@/components/Header';
import ScrollProgressIndicator from '@/components/ScrollProgressIndicator';
import Footer from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { generateLocationSEO } from '@/config/seoConfig';
import { MapPin, Users, Phone, Mail } from 'lucide-react';

const NgukuPage = () => {
  const seo = generateLocationSEO('Nguku');
  
  usePageMeta({
    ...seo,
    canonicalUrl: 'https://turuturustars.co.ke/locations/nguku',
  });

  const locationSchema = {
    '@type': 'LocalBusiness',
    name: 'Turuturu Stars CBO - Nguku',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nguku',
      addressRegion: 'Muranga',
      addressCountry: 'KE',
    },
    serviceArea: {
      '@type': 'Place',
      name: 'Nguku, Muranga County',
    },
  };

  return (
    <div className="min-h-screen scroll-smooth">
      <StructuredData data={locationSchema} type="LocalBusiness" />
      <ScrollProgressIndicator />
      <Header />
      <main role="main">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">Nguku Community</h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl">
              Turuturu Stars CBO serves the Nguku community in Muranga County with 
              welfare assistance, savings programs, and community support.
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Our Services in Nguku</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Service cards */}
            </div>
          </div>
        </section>

        {/* Nearby Landmarks */}
        <section className="bg-gray-50 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl font-bold mb-6">Nearby Landmarks</h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Nguku Primary and Secondary School
              </li>
            </ul>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl font-bold mb-6">Connect With Us</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <p className="text-gray-600">+254</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-gray-600">support@turuturustars.co.ke</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NgukuPage;
```

## Checklist for New Location Pages

- [ ] Create page component using template
- [ ] Use `generateLocationSEO()` for SEO data
- [ ] Add route in App.tsx
- [ ] Add LocalBusiness schema
- [ ] Include location-specific content
- [ ] Add nearby landmarks
- [ ] Include contact information
- [ ] Add internal links to main pages
- [ ] Test for errors
- [ ] Submit to Google Search Console

## Testing & Validation

### Schema Validation
Use Google's Rich Results Test:
https://search.google.com/test/rich-results

### SEO Testing
- Check page title and meta description
- Verify keywords in content
- Test mobile responsiveness
- Check internal links
- Validate Open Graph tags

---

**Tip**: Use this same pattern to create pages for all 7 secondary locations and 15 landmarks mentioned in the SEO config!
