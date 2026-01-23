import { lazy } from 'react';

/**
 * Lazy load a component with a small delay to prevent hydration mismatches
 * Improves performance by code-splitting heavy components
 */
export const lazyLoadComponent = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>,
  delayMs = 0
) => {
  return lazy(() => 
    new Promise(resolve => 
      setTimeout(() => resolve(importFunc()), delayMs)
    )
  );
};

/**
 * Preload an image to ensure it's cached before display
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = reject;
  });
};

/**
 * Preload multiple images in parallel
 */
export const preloadImages = (srcs: string[]): Promise<void[]> => {
  return Promise.all(srcs.map(src => preloadImage(src)));
};
