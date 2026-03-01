import { NextRequest, NextResponse } from 'next/server';
import { fetchWithRetry } from './retry';
import { logger } from './logger';
import { allowRequest } from './rateLimit';
import { apiError, type ErrorCode } from './apiError';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DEFAULT_TIMEOUT_MS = 15_000;

interface FetchExternalOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  /** Label for log messages, e.g. '/api/yahoo' */
  label?: string;
}

/**
 * Shared server-side fetch with retry, timeout, and User-Agent.
 */
export async function fetchExternal(
  url: string,
  options: FetchExternalOptions = {},
): Promise<Response> {
  const {
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = 2,
  } = options;

  return fetchWithRetry(url, AbortSignal.timeout(timeoutMs), maxRetries, 500, {
    headers: { 'User-Agent': DEFAULT_USER_AGENT, ...headers },
  });
}

/**
 * Apply rate limiting. Returns a 429 response if the limit is exceeded, or null if allowed.
 */
export function checkRateLimit(
  request: NextRequest,
  maxRequests = 60,
  windowMs = 60_000,
): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const { allowed, retryAfterSec } = allowRequest(ip, windowMs, maxRequests);
  if (!allowed) {
    logger.warn('Rate limit exceeded', { ip });
    return apiError('RATE_LIMITED', 'Too many requests', 429) as NextResponse;
  }
  return null;
}

/**
 * Build a standardised upstream-error response with logging.
 */
export function upstreamError(
  label: string,
  err: unknown,
  meta?: Record<string, unknown>,
): NextResponse {
  logger.error(`${label} upstream fetch failed`, {
    message: err instanceof Error ? err.message : String(err),
    ...meta,
  });
  return apiError('UPSTREAM_ERROR', 'Fetch failed', 502) as NextResponse;
}
