import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UPSTREAM_ERROR'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR';

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}
