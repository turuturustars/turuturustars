/**
 * Query Result Caching Utility
 * Provides in-memory caching for database queries to reduce redundant API calls
 * Particularly useful for reference data and dashboard statistics that don't change frequently
 * 
 * Usage:
 * ```typescript
 * const cache = new QueryCache(5 * 60 * 1000); // 5 minute TTL
 * 
 * // Cache a query result
 * cache.set('profiles_list', profilesData);
 * 
 * // Retrieve from cache (returns data if valid, null if expired)
 * const data = cache.get('profiles_list');
 * 
 * // Invalidate cache
 * cache.invalidate('profiles_list');
 * ```
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number; // milliseconds
  private listeners: Set<(key: string) => void> = new Set();

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default 5 minutes
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * Check if a cache entry exists and is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, entry);
    this.notifyListeners(key);
  }

  /**
   * Get a value from the cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Get or set: if key exists and is valid, return it; otherwise set and return
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Check if a key exists in cache and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && this.isValid(entry);
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.notifyListeners(key);
  }

  /**
   * Invalidate entries matching a pattern (prefix)
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.notifyListeners(key);
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Listen for cache invalidations
   */
  onInvalidate(callback: (key: string) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(key: string): void {
    for (const listener of this.listeners) {
      listener(key);
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get the TTL of a cache entry (in ms)
   */
  getTTL(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const remaining = entry.ttl - (Date.now() - entry.timestamp);
    return Math.max(0, remaining);
  }
}

// ============================================================================
// Singleton Cache Instance for Dashboard Stats
// ============================================================================

export const dashboardStatsCache = new QueryCache(10 * 60 * 1000); // 10 minute TTL

export const CACHE_KEYS = {
  // Dashboard stats
  DASHBOARD_STATS: 'dashboard:stats',
  
  // Members
  MEMBERS_LIST: 'members:list',
  MEMBERS_ACTIVE: 'members:active',
  MEMBERS_PENDING: 'members:pending',
  
  // Contributions
  CONTRIBUTIONS_LIST: 'contributions:list',
  CONTRIBUTIONS_PENDING: 'contributions:pending',
  CONTRIBUTIONS_STATS: 'contributions:stats',
  
  // Welfare
  WELFARE_CASES: 'welfare:cases',
  WELFARE_ACTIVE: 'welfare:active',
  
  // Meetings
  MEETINGS_LIST: 'meetings:list',
  MEETINGS_UPCOMING: 'meetings:upcoming',
  
  // Announcements
  ANNOUNCEMENTS_LIST: 'announcements:list',
  ANNOUNCEMENTS_PUBLISHED: 'announcements:published',
  
  // Messages
  MESSAGES_RECENT: 'messages:recent',
  NOTIFICATIONS_UNREAD: 'notifications:unread',
} as const;

// ============================================================================
// Cache Invalidation Helper
// ============================================================================

/**
 * Invalidate related cache entries when data changes
 */
export function invalidateCacheForMutation(
  action: 'create' | 'update' | 'delete',
  resource: 'contribution' | 'member' | 'welfare' | 'meeting' | 'announcement' | 'message'
): void {
  // Invalidate related queries based on resource type
  switch (resource) {
    case 'contribution':
      dashboardStatsCache.invalidate(CACHE_KEYS.CONTRIBUTIONS_LIST);
      dashboardStatsCache.invalidate(CACHE_KEYS.CONTRIBUTIONS_STATS);
      dashboardStatsCache.invalidate(CACHE_KEYS.CONTRIBUTIONS_PENDING);
      dashboardStatsCache.invalidate(CACHE_KEYS.DASHBOARD_STATS);
      break;

    case 'member':
      dashboardStatsCache.invalidate(CACHE_KEYS.MEMBERS_LIST);
      dashboardStatsCache.invalidate(CACHE_KEYS.MEMBERS_ACTIVE);
      dashboardStatsCache.invalidate(CACHE_KEYS.MEMBERS_PENDING);
      dashboardStatsCache.invalidate(CACHE_KEYS.DASHBOARD_STATS);
      break;

    case 'welfare':
      dashboardStatsCache.invalidate(CACHE_KEYS.WELFARE_CASES);
      dashboardStatsCache.invalidate(CACHE_KEYS.WELFARE_ACTIVE);
      dashboardStatsCache.invalidate(CACHE_KEYS.DASHBOARD_STATS);
      break;

    case 'meeting':
      dashboardStatsCache.invalidate(CACHE_KEYS.MEETINGS_LIST);
      dashboardStatsCache.invalidate(CACHE_KEYS.MEETINGS_UPCOMING);
      dashboardStatsCache.invalidate(CACHE_KEYS.DASHBOARD_STATS);
      break;

    case 'announcement':
      dashboardStatsCache.invalidate(CACHE_KEYS.ANNOUNCEMENTS_LIST);
      dashboardStatsCache.invalidate(CACHE_KEYS.ANNOUNCEMENTS_PUBLISHED);
      dashboardStatsCache.invalidate(CACHE_KEYS.DASHBOARD_STATS);
      break;

    case 'message':
      dashboardStatsCache.invalidate(CACHE_KEYS.MESSAGES_RECENT);
      dashboardStatsCache.invalidate(CACHE_KEYS.NOTIFICATIONS_UNREAD);
      break;
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Cache dashboard stats
 * 
 * export async function fetchDashboardStatsWithCache() {
 *   return dashboardStatsCache.getOrSet(
 *     CACHE_KEYS.DASHBOARD_STATS,
 *     async () => {
 *       // Fetch from database
 *       const stats = await fetchDashboardStats();
 *       return stats;
 *     },
 *     15 * 60 * 1000 // 15 minute TTL
 *   );
 * }
 * 
 * // Invalidate when data changes
 * export function updateContribution(data: any) {
 *   // ... update logic ...
 *   invalidateCacheForMutation('update', 'contribution');
 * }
 */
