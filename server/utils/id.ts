/**
 * Generate a unique ID with optional prefix
 * Uses crypto.randomUUID() for uniqueness
 */
export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}
