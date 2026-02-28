/**
 * Lightweight runtime validators for external API responses.
 * No external dependency — plain type guards.
 */

export function isValidYahooResult(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const chart = (data as Record<string, unknown>).chart;
  if (typeof chart !== 'object' || chart === null) return false;
  const result = (chart as Record<string, unknown>).result;
  return Array.isArray(result) && result.length > 0;
}

export function isValidFredObservations(observations: unknown): boolean {
  if (!Array.isArray(observations)) return false;
  return observations.every(
    (o) =>
      typeof o === 'object' &&
      o !== null &&
      typeof (o as Record<string, unknown>).date === 'string' &&
      typeof (o as Record<string, unknown>).value === 'string',
  );
}

export function isValidFearGreedData(fg: unknown): boolean {
  if (typeof fg !== 'object' || fg === null) return false;
  return typeof (fg as Record<string, unknown>).score === 'number';
}
