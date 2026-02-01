import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  quality?: number; // 1-100, default 80
  priority?: boolean; // If true, will preload and use eager loading
  sizes?: string; // Responsive image sizes (e.g., "(max-width: 768px) 100vw, 50vw")
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  webpSrc?: string; // WebP fallback format (modern browsers)
  srcset?: string; // Responsive images (e.g., "img-320w.jpg 320w, img-640w.jpg 640w")
}

/**
 * OptimizedImage Component
 * 
 * Provides automatic image optimization with:
 * - Lazy loading (except for LCP images marked as priority)
 * - Responsive image sizing with srcset support
 * - Proper aspect ratio maintenance
 * - WebP support with JPEG fallback for modern/legacy browsers
 * - Loading state management with skeleton animation
 * - Error handling and fallback UI
 * 
 * Usage Examples:
 * 
 * 1. Basic image (will lazy load):
 *    <OptimizedImage src="/image.jpg" alt="Description" />
 * 
 * 2. Priority image (LCP - will eager load and preload):
 *    <OptimizedImage src="/hero.jpg" alt="Hero" priority={true} />
 * 
 * 3. Responsive with sizes:
 *    <OptimizedImage
 *      src="/image.jpg"
 *      alt="Responsive"
 *      sizes="(max-width: 768px) 100vw, 50vw"
 *      srcset="/img-640w.jpg 640w, /img-1280w.jpg 1280w"
 *    />
 * 
 * 4. With WebP fallback:
 *    <OptimizedImage
 *      src="/image.jpg"
 *      alt="Modern format"
 *      webpSrc="/image.webp"
 *      priority={true}
 *    />
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  sizes,
  objectFit = 'cover',
  webpSrc,
  srcset,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use eager loading for priority images (LCP optimization)
  const loadingMode = priority ? 'eager' : loading;

  // Preload priority images
  useEffect(() => {
    if (priority && (src || webpSrc)) {
      // Preload WebP for modern browsers
      if (webpSrc) {
        const webpLink = document.createElement('link');
        webpLink.rel = 'preload';
        webpLink.as = 'image';
        webpLink.href = webpSrc;
        webpLink.type = 'image/webp';
        if (sizes) {
          webpLink.imagesizes = sizes;
        }
        document.head.appendChild(webpLink);
      }
      
      // Preload JPEG fallback
      const jpegLink = document.createElement('link');
      jpegLink.rel = 'preload';
      jpegLink.as = 'image';
      jpegLink.href = src;
      if (sizes) {
        jpegLink.imagesizes = sizes;
      }
      document.head.appendChild(jpegLink);
      
      return () => {
        if (webpSrc) {
          const webpLinks = document.querySelectorAll(`link[href="${webpSrc}"]`);
          webpLinks.forEach(l => l.parentNode?.removeChild(l));
        }
        const jpegLinks = document.querySelectorAll(`link[href="${src}"]`);
        jpegLinks.forEach(l => l.parentNode?.removeChild(l));
      };
    }
  }, [priority, src, webpSrc, sizes]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
  };

  // Compute aspect ratio
  const aspectRatio = width && height ? (width / height) * 100 : undefined;

  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{
        ...(aspectRatio && { paddingBottom: `${aspectRatio}%` })
      }}
    >
      {/* Use <picture> element for WebP support with fallback */}
      <picture>
        {/* Modern browsers: WebP format (25-35% smaller) */}
        {webpSrc && (
          <source
            srcSet={webpSrc}
            type="image/webp"
            sizes={sizes}
          />
        )}
        
        {/* Responsive image sizes via srcset */}
        {srcset && (
          <source
            srcSet={srcset}
            sizes={sizes}
          />
        )}
        
        {/* Fallback: JPEG for browsers without WebP */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loadingMode}
          sizes={sizes}
          className={`
            w-full h-full absolute inset-0
            transition-opacity duration-300
            ${objectFit === 'cover' ? 'object-cover' : `object-${objectFit}`}
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${error ? 'hidden' : ''}
          `}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
      
      {/* Loading skeleton with animation */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse" />
      )}

      {/* Error state */}
