/**
 * Performance monitoring and optimization utilities
 */

import { useEffect, useRef } from 'react';

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  threshold?: number;
  category: 'rendering' | 'network' | 'memory' | 'interaction';
}

// ============================================================================
// Component Render Time Monitoring
// ============================================================================

export function useRenderTime(componentName: string) {
  const renderStartRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartRef.current;

    renderTimesRef.current.push(renderTime);
    renderCountRef.current += 1;

    if (renderTime > 16) {
      console.warn(
        `[Performance] ${componentName} took ${renderTime}ms to render (${renderCountRef.current} renders)`
      );
    }

    renderStartRef.current = Date.now();

    return () => {
      if (renderCountRef.current > 0) {
        const avgTime =
          renderTimesRef.current.reduce((a, b) => a + b, 0) /
          renderCountRef.current;
        if (avgTime > 16) {
          console.warn(
            `[Performance] ${componentName} average render time: ${avgTime.toFixed(2)}ms`
          );
        }
      }
    };
  });
}

// ============================================================================
// API Call Performance Tracking
// ============================================================================

export interface ApiCallMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  size?: number;
}

const apiMetricsStorage: ApiCallMetric[] = [];

export function trackApiCall(metric: ApiCallMetric) {
  apiMetricsStorage.push(metric);

  if (apiMetricsStorage.length > 100) {
    apiMetricsStorage.shift();
  }

  if (metric.duration > 1000) {
    console.warn(
      `[API Performance] ${metric.method} ${metric.endpoint} took ${metric.duration}ms`
    );
  }
}

export function getApiMetrics(): ApiCallMetric[] {
  return [...apiMetricsStorage];
}

export function getAverageApiCallTime(): number {
  if (apiMetricsStorage.length === 0) return 0;
  const total = apiMetricsStorage.reduce((sum, m) => sum + m.duration, 0);
  return total / apiMetricsStorage.length;
}

export function getSlowestApiCalls(count: number = 5): ApiCallMetric[] {
  return [...apiMetricsStorage]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, count);
}

// ============================================================================
// Hook for API Performance Tracking
// ============================================================================

export function useApiPerformance(endpoint: string, method: string = 'GET') {
  const startTimeRef = useRef<number>(0);

  const startTracking = () => {
    startTimeRef.current = performance.now();
  };

  const endTracking = (status: number, size?: number) => {
    const duration = performance.now() - startTimeRef.current;
    trackApiCall({
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
      size,
    });
  };

  return { startTracking, endTracking };
}

// ============================================================================
// Memory Usage Monitoring
// ============================================================================

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export function getMemoryMetrics(): MemoryMetric | null {
  const perfWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };
  
  if (!perfWithMemory.memory) {
    return null;
  }

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    timestamp: Date.now(),
  };
}

export function useMemoryMonitoring(warningThreshold: number = 0.8) {
  useEffect(() => {
    const checkMemory = () => {
      const metrics = getMemoryMetrics();
      if (!metrics) return;

      const usage = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
      if (usage > warningThreshold) {
        console.warn(
          `[Memory] High heap usage: ${(usage * 100).toFixed(2)}%`,
          metrics
        );
      }
    };

    const interval = setInterval(checkMemory, 30000);
    return () => clearInterval(interval);
  }, [warningThreshold]);
}

// ============================================================================
// Web Vitals Monitoring
// ============================================================================

export interface WebVital {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB';
  value: number;
  unit: 'ms' | 'score';
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface LCPEntry extends PerformanceEntry {
  renderTime: number;
  loadTime: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

interface FirstInputEntry extends PerformanceEntry {
  processingDuration: number;
}

export function initWebVitalsMonitoring(callback?: (vital: WebVital) => void) {
  if (!('PerformanceObserver' in globalThis)) return;

  // Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries.at(-1) as LCPEntry | undefined;
      if (lastEntry) {
        const value = lastEntry.renderTime || lastEntry.loadTime;
        const lcp: WebVital = {
          name: 'LCP',
          value,
          unit: 'ms',
          rating: value < 2500 ? 'good' : 'poor',
          timestamp: Date.now(),
        };
        callback?.(lcp);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch {
    // LCP not supported
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutEntry = entry as LayoutShiftEntry;
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value;
          const cls: WebVital = {
            name: 'CLS',
            value: clsValue,
            unit: 'score',
            rating: clsValue < 0.1 ? 'good' : 'poor',
            timestamp: Date.now(),
          };
          callback?.(cls);
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch {
    // CLS not supported
  }

  // First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as FirstInputEntry;
        const fid: WebVital = {
          name: 'FID',
          value: fidEntry.processingDuration,
          unit: 'ms',
          rating: fidEntry.processingDuration < 100 ? 'good' : 'poor',
          timestamp: Date.now(),
        };
        callback?.(fid);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch {
    // FID not supported
  }

  // First Contentful Paint (FCP)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const fcp: WebVital = {
          name: 'FCP',
          value: entries[0].startTime,
          unit: 'ms',
          rating: entries[0].startTime < 1800 ? 'good' : 'poor',
          timestamp: Date.now(),
        };
        callback?.(fcp);
        fcpObserver.disconnect();
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch {
    // FCP not supported
  }
}

// ============================================================================
// Performance Recommendations
// ============================================================================

export interface PerformanceRecommendation {
  category: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
  estimatedImprovement: string;
}

export function getPerformanceRecommendations(): PerformanceRecommendation[] {
  const slowCalls = getSlowestApiCalls(1);
  const memory = getMemoryMetrics();
  
  return [
    ...(slowCalls.length > 0 && slowCalls[0].duration > 2000 ? [{
      category: 'Network',
      issue: 'Slow API calls detected',
      severity: 'high' as const,
      suggestion: `Optimize ${slowCalls[0].endpoint} endpoint or implement caching`,
      estimatedImprovement: '50-70% faster',
    }] : []),
    ...(memory && memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8 ? [{
      category: 'Memory',
      issue: 'High memory usage detected',
      severity: 'high' as const,
      suggestion: 'Check for memory leaks, implement virtualization for large lists',
      estimatedImprovement: '30-50% less memory',
    }] : []),
    {
      category: 'Rendering',
      issue: 'Consider memoizing expensive components',
      severity: 'medium' as const,
      suggestion: 'Use React.memo() for components that receive same props',
      estimatedImprovement: '10-20% faster renders',
    },
    {
      category: 'Data Fetching',
      issue: 'Ensure pagination is implemented',
      severity: 'medium' as const,
      suggestion: 'Load data in chunks instead of entire datasets',
      estimatedImprovement: '5-10x faster initial load',
    },
  ];
}

// ============================================================================
// Performance Report Generator
// ============================================================================

export function generatePerformanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    apiMetrics: {
      totalCalls: apiMetricsStorage.length,
      averageTime: getAverageApiCallTime(),
      slowestCalls: getSlowestApiCalls(5),
    },
    memory: getMemoryMetrics(),
    recommendations: getPerformanceRecommendations(),
  };

  return report;
}

export function logPerformanceReport() {
  const report = generatePerformanceReport();
  console.group('[Performance Report]');
  console.table(report.apiMetrics.slowestCalls);
  console.log('Average API Time:', report.apiMetrics.averageTime.toFixed(2) + 'ms');
  console.log('Memory Metrics:', report.memory);
  console.group('Recommendations');
  report.recommendations.forEach((rec) => {
    console.log(
      `[${rec.severity.toUpperCase()}] ${rec.category}: ${rec.issue}`
    );
    console.log(`  → ${rec.suggestion}`);
  });
  console.groupEnd();
  console.groupEnd();
}

// ============================================================================
// Memoization Utilities
// ============================================================================

export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map();

  return ((...args: unknown[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): T {
  let inThrottle: boolean = false;

  return ((...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
}
