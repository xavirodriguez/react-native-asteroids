/**
 * Utilities for handling game seeds.
 * Seeds are represented as 32-bit unsigned integers.
 */

/**
 * Converts a numeric seed to a readable string format (XXXX-XXXX).
 * @param seed - The numeric seed (32-bit unsigned integer).
 * @returns A formatted string like "A3F9-7B2C".
 */
export function seedToString(seed: number): string {
  const unsignedSeed = seed >>> 0;
  const hex = unsignedSeed.toString(16).toUpperCase().padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

/**
 * Parses a readable string (XXXX-XXXX) back into a numeric seed.
 * @param s - The formatted seed string.
 * @returns The numeric seed.
 * @throws Error if the format is invalid.
 */
export function stringToSeed(s: string): number {
  const clean = s.replace(/-/g, "").trim();
  if (!/^[0-9A-F]{8}$/i.test(clean)) {
    throw new Error(`Invalid seed format: ${s}`);
  }
  return parseInt(clean, 16) >>> 0;
}
