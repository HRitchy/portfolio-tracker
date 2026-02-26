/**
 * Fetches a URL with automatic exponential backoff retry.
 * @param url - URL to fetch
 * @param signal - AbortSignal for cancellation
 * @param maxRetries - Maximum number of retries (default 2)
 * @param baseDelayMs - Base delay in ms before doubling (default 500)
 */
export async function fetchWithRetry(
  url: string,
  signal: AbortSignal,
  maxRetries = 2,
  baseDelayMs = 500
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (signal.aborted || attempt >= maxRetries) throw err;
      await new Promise<void>((resolve) =>
        setTimeout(resolve, baseDelayMs * Math.pow(2, attempt))
      );
      attempt++;
    }
  }
}
