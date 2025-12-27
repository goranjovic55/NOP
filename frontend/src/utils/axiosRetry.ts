import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
  onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => void;
}

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
  __retryConfig?: RetryConfig;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  retries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    if (!error.response) {
      // Network error (no response)
      return true;
    }
    
    const status = error.response.status;
    // Retry on 5xx errors (server errors) and 429 (rate limiting)
    // Don't retry on 4xx errors (client errors) except 429
    return status >= 500 || status === 429 || status === 408;
  },
  onRetry: () => {},
};

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateRetryDelay(retryCount: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelay);
  return delay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Setup axios retry interceptor
 */
export function setupAxiosRetry(instance: AxiosInstance, config: RetryConfig = {}): void {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  instance.interceptors.response.use(
    // Success response - pass through
    (response) => response,
    
    // Error response - handle retry logic
    async (error: AxiosError) => {
      const requestConfig = error.config as ExtendedAxiosRequestConfig;
      
      if (!requestConfig) {
        return Promise.reject(error);
      }

      // Initialize retry count if not present
      if (requestConfig.__retryCount === undefined) {
        requestConfig.__retryCount = 0;
        requestConfig.__retryConfig = retryConfig;
      }

      const currentRetryCount = requestConfig.__retryCount;
      const maxRetries = requestConfig.__retryConfig?.retries || retryConfig.retries;

      // Check if we should retry
      const shouldRetry = 
        currentRetryCount < maxRetries &&
        (requestConfig.__retryConfig?.retryCondition || retryConfig.retryCondition)(error);

      if (!shouldRetry) {
        // Max retries reached or error is not retryable
        return Promise.reject(error);
      }

      // Increment retry count
      requestConfig.__retryCount = currentRetryCount + 1;

      // Calculate delay with exponential backoff
      const delay = calculateRetryDelay(
        requestConfig.__retryCount,
        requestConfig.__retryConfig?.retryDelay || retryConfig.retryDelay,
        requestConfig.__retryConfig?.maxRetryDelay || retryConfig.maxRetryDelay
      );

      // Call onRetry callback if provided
      const onRetry = requestConfig.__retryConfig?.onRetry || retryConfig.onRetry;
      if (onRetry) {
        onRetry(requestConfig.__retryCount, error, requestConfig);
      }

      // Log retry attempt
      console.log(
        `[Retry ${requestConfig.__retryCount}/${maxRetries}] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`,
        `(delay: ${Math.round(delay)}ms, reason: ${error.message})`
      );

      // Wait before retrying
      await sleep(delay);

      // Retry the request
      return instance(requestConfig);
    }
  );
}

/**
 * Add retry configuration to a specific request
 */
export function withRetry(config: AxiosRequestConfig, retryConfig: RetryConfig): AxiosRequestConfig {
  return {
    ...config,
    __retryConfig: retryConfig,
  } as any;
}

/**
 * Create an axios instance with retry configured
 */
export function createAxiosInstanceWithRetry(
  baseConfig: AxiosRequestConfig = {},
  retryConfig: RetryConfig = {}
): AxiosInstance {
  const instance = axios.create(baseConfig);
  setupAxiosRetry(instance, retryConfig);
  return instance;
}
