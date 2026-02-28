import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

describe('GET /api/yahoo/[symbol]', () => {
  it('returns 400 for an invalid symbol format', async () => {
    const { GET } = await import('../yahoo/[symbol]/route');
    const req = new NextRequest('http://localhost/api/yahoo/INVALID%20SYMBOL%20WITH%20SPACES');
    const resp = await GET(req, { params: Promise.resolve({ symbol: 'INVALID SYMBOL WITH SPACES' }) });
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('Invalid symbol');
  });

  it('returns 502 and logs when fetch throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const { GET } = await import('../yahoo/[symbol]/route');
    const req = new NextRequest('http://localhost/api/yahoo/BTC-EUR?days=30');
    const resp = await GET(req, { params: Promise.resolve({ symbol: 'BTC-EUR' }) });
    expect(resp.status).toBe(502);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('clamps days above maximum (3650) in the URL sent to Yahoo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ timestamp: [], indicators: { quote: [{ close: [] }] } }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('../yahoo/[symbol]/route');
    const req = new NextRequest('http://localhost/api/yahoo/BTC-EUR?days=99999');
    await GET(req, { params: Promise.resolve({ symbol: 'BTC-EUR' }) });
    const calledUrl: string = fetchMock.mock.calls[0][0];
    const urlObj = new URL(calledUrl);
    const period1 = Number(urlObj.searchParams.get('period1'));
    const minExpected = Math.floor((Date.now() - 86400000 * 3650) / 1000) - 10;
    expect(period1).toBeGreaterThan(minExpected);
  });

  it('uses 500 as default when days is not a valid integer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ timestamp: [], indicators: { quote: [{ close: [] }] } }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('../yahoo/[symbol]/route');
    const req = new NextRequest('http://localhost/api/yahoo/BTC-EUR?days=abc');
    await GET(req, { params: Promise.resolve({ symbol: 'BTC-EUR' }) });
    const calledUrl: string = fetchMock.mock.calls[0][0];
    const urlObj = new URL(calledUrl);
    const period1 = Number(urlObj.searchParams.get('period1'));
    const expected = Math.floor((Date.now() - 86400000 * 500) / 1000);
    // Allow ±5 seconds of tolerance
    expect(Math.abs(period1 - expected)).toBeLessThan(5);
  });
});
