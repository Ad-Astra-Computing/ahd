// Narrow retry for the one failure class the CLI-spawn-based Claude
// runners have production evidence for: a 429 surfaced through the
// `claude` CLI's non-zero exit and stderr text. Retries only that
// shape, a small fixed number of times, with increasing backoff.
// Shared by claude-code-cli.ts and critique/critics/claude-code.ts.

const RATE_LIMIT_PATTERN = /\b429\b|rate[\s_-]?limit/i;

export function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return RATE_LIMIT_PATTERN.test(message);
}

export interface RetryOptions {
  maxAttempts?: number; // total attempts including the first, default 3
  baseDelayMs?: number; // delay unit; attempt N waits baseDelayMs * N
  sleep?: (ms: number) => Promise<void>; // injected for tests
}

export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === maxAttempts) {
        throw err;
      }
      await sleep(baseDelayMs * attempt);
    }
  }
  // Unreachable: the loop above always either returns or throws.
  throw lastErr;
}
