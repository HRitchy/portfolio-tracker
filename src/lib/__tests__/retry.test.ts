import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry } from '../retry';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchWithRetry', () => {
  it('returns response on first success', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const controller = new AbortController();
    const result = await fetchWithRetry('/api/test', controller.signal);
    expect(result).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on HTTP error and eventually succeeds', async () => {
    const failResponse = new Response('err', { status: 500 });
    const okResponse = new Response('ok', { status: 200 });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(okResponse);

    const controller = new AbortController();
    const result = await fetchWithRetry('/api/test', controller.signal, 2, 0);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toBe(okResponse);
  });

  it('throws after exhausting all retries', async () => {
    const failResponse = new Response('err', { status: 503 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(failResponse);

    const controller = new AbortController();
    // maxRetries=2, baseDelay=0 so it doesn't slow the test
    await expect(
      fetchWithRetry('/api/test', controller.signal, 2, 0)
    ).rejects.toThrow('HTTP 503');

    expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('stops retrying after abort', async () => {
    const controller = new AbortController();
    controller.abort();

    // The aborted signal makes fetch throw immediately
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      Object.assign(new Error('Aborted'), { name: 'AbortError' })
    );

    await expect(
      fetchWithRetry('/api/test', controller.signal, 2, 0)
    ).rejects.toThrow();

    // Should NOT retry — abort means stop immediately
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
