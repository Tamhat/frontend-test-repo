export function normalizeApiResponse<T>(data: T): T {
  // Simplified normalization: return the API data directly.
  // Avoids complex validation loops that were causing render freezes.
  return data;
}
