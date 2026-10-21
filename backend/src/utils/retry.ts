export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
}

/** How long to wait after failed attempt number `attempt` (1-based). */
export function nextDelay(attempt: number, delayMs: number, backoff: 'linear' | 'exponential' = 'exponential'): number {
  return backoff === 'exponential' ? delayMs * Math.pow(2, attempt - 1) : delayMs * attempt;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs `fn` up to `maxAttempts` times, waiting between attempts, and throws the LAST error when every attempt failed.
 * Used around chain RPC calls, where one dropped request should not skip a block range.
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, delayMs, backoff = 'exponential', onRetry } = options;
  let lastError: Error = new Error('retry: maxAttempts must be at least 1');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) {
        throw lastError;
      }
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      await sleep(nextDelay(attempt, delayMs, backoff));
    }
  }

  throw lastError;
}
