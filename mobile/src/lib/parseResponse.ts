/**
 * Parse API response into an array regardless of shape.
 * Handles: array | { data: [...] } | { data: { items: [...] } } | { items: [...] }
 */
export function parseList<T = any>(data: any, ...keys: string[]): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  // Try common keys
  const allKeys = [...keys, 'items', 'tokens', 'results', 'records', 'list'];
  for (const key of allKeys) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.data?.[key])) return data.data[key];
  }
  return [];
}

/**
 * Parse API response into a single object.
 * Handles: object | { data: {...} }
 */
export function parseObject<T = any>(data: any): T | null {
  if (!data) return null;
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
}
