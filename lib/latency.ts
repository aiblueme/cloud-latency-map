export function computeMedian(values: number[]): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function pingEndpoint(
  url: string,
  timeoutMs = 5000,
): Promise<number> {
  // Cache-bust so every request hits the network
  const bust = `?_cb=${Date.now()}${Math.random().toString(36).slice(2)}`;
  const start = performance.now();
  try {
    await fetch(url + bust, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    // Timeout, network error, or opaque failure — return Infinity
    return Infinity;
  }
  return performance.now() - start;
}
