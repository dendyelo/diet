/**
 * Centralized Collision-Proof Local ID Generator
 * Combines prefix, high-precision timestamp, and random base36 string
 */
export function createLocalId(prefix: string = 'id'): string {
  const cleanPrefix = prefix.trim() || 'id';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 10);
  return `${cleanPrefix}_${timestamp}_${randomStr}`;
}
