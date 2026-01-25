/**
 * Comprehensive error handling utilities
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTH_ERROR', message, 401, details);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends AppError {
  constructor(action: string) {
    super('PERMISSION_DENIED', `You don't have permission to ${action}`, 403);
    this.name = 'PermissionError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super('NETWORK_ERROR', message, 0);
    this.name = 'NetworkError';
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Handle Supabase errors
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return error.message || 'An unexpected error occurred';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Get error code for analytics/logging
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }

  if (error instanceof Error) {
    return error.name || 'UNKNOWN_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Log error to console in development
 */
export function logError(
  error: unknown,
  context?: string,
  severity: 'debug' | 'info' | 'warn' | 'error' = 'error'
) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '[Error]';

    console[severity](`${timestamp} ${prefix}:`, error);
  }
}

/**
 * Handle async operations with error handling
 */
export async function handleAsync<T>(
  asyncFn: () => Promise<T>,
  onError?: (error: unknown) => void
): Promise<[T | null, unknown | null]> {
  try {
    const data = await asyncFn();
    return [data, null];
  } catch (error) {
    if (onError) {
      onError(error);
    }
    return [null, error];
  }
}

/**
 * Retry failed operations
 */
export async function retryAsync<T>(
  asyncFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, error);
        }

        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Convert API error to user-friendly format
 */
export function formatApiError(error: unknown): {
  message: string;
  code: string;
  details?: Record<string, any>;
} {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  let details: Record<string, any> | undefined;

  if (error instanceof AppError) {
    details = error.details;
  }

  return { message, code, details };
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('connection')
    );
  }

  return false;
}

/**
 * Check if error is retriable
 */
export function isRetriableError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  if (error instanceof AppError) {
    // Retry on 5xx errors and network errors
    return error.statusCode >= 500 || error.statusCode === 0;
  }

  return false;
}
