import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

const makeRequest = () => new NextRequest('http://localhost/api/fred');

describe('GET /api/fred', () => {
  it('returns observations from FRED API when api key is set', async () => {
    const observations = [
      { date: '2024-01-15', value: '3.45' },
      { date: '2024-01-14', value: '3.50' },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ observations }),
    }));
    vi.doMock('@/lib/env', () => ({ env: { FRED_API_KEY: 'test-key' } }));
    const { GET } = await import('../fred/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.observations).toEqual(observations);
  });

  it('falls back to CSV when API key fetch fails', async () => {
    const csvData = 'DATE,BAMLH0A0HYM2\n2024-01-14,3.50\n2024-01-15,3.45';
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      // First calls are retries for the FRED API (fail them all)
      if (callCount <= 3) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      // Then CSV fallback succeeds
      return Promise.resolve({ ok: true, text: async () => csvData, headers: new Headers({ 'content-type': 'text/csv' }) });
    }));
    vi.doMock('@/lib/env', () => ({ env: { FRED_API_KEY: 'test-key' } }));
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { GET } = await import('../fred/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.observations).toHaveLength(2);
    expect(body.observations[0].date).toBe('2024-01-15');
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('goes directly to CSV when no API key is set', async () => {
    const csvData = 'DATE,BAMLH0A0HYM2\n2024-01-14,3.50\n2024-01-15,3.45';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csvData,
      headers: new Headers({ 'content-type': 'text/csv' }),
    }));
    vi.doMock('@/lib/env', () => ({ env: { FRED_API_KEY: null } }));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { GET } = await import('../fred/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.observations).toHaveLength(2);
    consoleSpy.mockRestore();
  });

  it('returns 502 when both API and CSV fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    vi.doMock('@/lib/env', () => ({ env: { FRED_API_KEY: 'test-key' } }));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { GET } = await import('../fred/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(502);
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('sets Cache-Control header on success', async () => {
    const csvData = 'DATE,BAMLH0A0HYM2\n2024-01-15,3.45';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csvData,
      headers: new Headers({ 'content-type': 'text/csv' }),
    }));
    vi.doMock('@/lib/env', () => ({ env: { FRED_API_KEY: null } }));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { GET } = await import('../fred/route');
    const resp = await GET(makeRequest());
    expect(resp.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=7200');
    consoleSpy.mockRestore();
  });
});
