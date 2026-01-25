import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Hook for debouncing async operations
 */
export function useDebouncedAsync<T, Args extends unknown[]>(
  callback: (...args: Args) => Promise<T>,
  delayMs: number = 500
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (...args: Args) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await callback(...args);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedExecute = (...args: Args) => {
    setIsLoading(true);
    
    const handler = setTimeout(async () => {
      try {
        const result = await callback(...args);
        setData(result);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
      } finally {
        setIsLoading(false);
      }
    }, delayMs);

    return handler;
  };

  return { isLoading, error, data, execute, debouncedExecute };
}
