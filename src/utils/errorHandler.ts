/**
 * Centralized error handling utilities
 */

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export class AppErrorHandler {
  static parseError(error: unknown): AppError {
    // Handle Supabase errors
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const pgError = error as any;
      return {
        code: pgError.code || 'SUPABASE_ERROR',
        message: pgError.message || 'Database operation failed',
        statusCode: pgError.status,
        details: pgError,
      };
    }

    // Handle custom AppError (check if it has code property)
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return error as AppError;
    }

    // Handle standard Error
    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error,
      };
    }

    // Handle string
    if (typeof error === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        message: error,
      };
    }

    // Handle unknown
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: error,
    };
  }

  static isNetworkError(error: AppError | unknown): boolean {
    if (error instanceof Object && 'message' in error) {
      const msg = (error as any).message?.toLowerCase() || '';
      return msg.includes('network') || msg.includes('offline') || msg.includes('connection');
    }
    return false;
  }

  static isAuthError(error: AppError | unknown): boolean {
    if (error instanceof Object && 'code' in error) {
      const code = (error as AppError).code?.toLowerCase() || '';
      return code.includes('auth') || code.includes('unauthorized') || code.includes('forbidden');
    }
    return false;
  }

  static isValidationError(error: AppError | unknown): boolean {
    if (error instanceof Object && 'code' in error) {
      const code = (error as AppError).code?.toLowerCase() || '';
      return code.includes('validation') || code.includes('invalid');
    }
    return false;
  }

  static getErrorMessage(error: AppError | unknown): string {
    const appError = this.parseError(error);
    
    if (this.isNetworkError(appError)) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (this.isAuthError(appError)) {
      return 'Authentication failed. Please log in again.';
    }
    
    if (this.isValidationError(appError)) {
      return appError.message || 'Please check your input and try again.';
    }

    return appError.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Logger utility for consistent logging
 */
export class Logger {
  static error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const appError = AppErrorHandler.parseError(error);
    console.error(`[ERROR] ${message}`, {
      code: appError.code,
      message: appError.message,
      context,
      details: appError.details,
    });
  }

  static warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, context);
  }

  static info(message: string, context?: Record<string, unknown>) {
    console.info(`[INFO] ${message}`, context);
  }

  static debug(message: string, context?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoffMultiplier = 2 } = options;
  
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
