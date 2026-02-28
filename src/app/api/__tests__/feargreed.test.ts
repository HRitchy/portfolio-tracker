import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

const makeRequest = () => new NextRequest('http://localhost/api/feargreed');

describe('GET /api/feargreed', () => {
  it('returns fear_and_greed data on success', async () => {
    const fgData = { score: 45, rating: 'Fear' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fear_and_greed: fgData }),
    }));
    const { GET } = await import('../feargreed/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.fear_and_greed).toEqual(fgData);
  });

  it('returns 502 when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('../feargreed/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(502);
    const body = await resp.json();
    expect(body.error.code).toBe('UPSTREAM_ERROR');
    consoleSpy.mockRestore();
  });

  it('returns null when fear_and_greed is missing from response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ other_data: 'something' }),
    }));
    const { GET } = await import('../feargreed/route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.fear_and_greed).toBeNull();
  });

  it('sets Cache-Control header on success', async () => {
    const fgData = { score: 72, rating: 'Greed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fear_and_greed: fgData }),
    }));
    const { GET } = await import('../feargreed/route');
    const resp = await GET(makeRequest());
    expect(resp.headers.get('Cache-Control')).toBe('public, s-maxage=1800, stale-while-revalidate=3600');
  });
});
