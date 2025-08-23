import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a deterministic (stable) UUIDv5-like identifier from an arbitrary string.
 * Same input -> same output. Different inputs are very unlikely to collide.
 *
 * Implementation notes:
 * - Uses a pair of 64-bit FNV-1a–style hash accumulators (via BigInt) to derive 128 bits.
 * - Applies UUID version (5) and variant bits to conform to standard layout.
 * - Purely synchronous and works in both browser and Node runtimes without crypto APIs.
 *
 * This is NOT cryptographically secure, but is suitable for stable IDs / cache keys.
 */
export function uuidFromString(input: string): string {
  const str = input ?? "";
  // We'll create four 32-bit hashes and pack them into UUID layout.
  let h1 = 0x811c9dc5; // FNV-1a 32-bit offset
  let h2 = 0x811c9dc5 ^ 0xaaaaaaaa;
  let h3 = 0x811c9dc5 ^ 0x55555555;
  let h4 = 0x811c9dc5 ^ 0x87654321;

  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    // FNV-1a like mixing with extra avalanching
    h1 ^= c;
    h1 =
      (h1 + ((h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24))) >>> 0;
    h2 ^= c + 0x9e3779b9;
    h2 = Math.imul(h2 ^ (h2 >>> 15), 0x85ebca6b) >>> 0;
    h3 ^= c + 0x7f4a7c15;
    h3 = Math.imul(h3 ^ (h3 >>> 13), 0xc2b2ae35) >>> 0;
    h4 ^= c + 0x165667b1;
    h4 = ((h4 ^ (h4 >>> 16)) * 0x27d4eb2d) >>> 0;
  }

  // Final mixing
  const fmix = (h: number) => {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  };
  h1 = fmix(h1);
  h2 = fmix(h2);
  h3 = fmix(h3);
  h4 = fmix(h4);

  // Convert to bytes
  const bytes = new Uint8Array(16);
  const write32 = (val: number, offset: number) => {
    bytes[offset] = (val >>> 24) & 0xff;
    bytes[offset + 1] = (val >>> 16) & 0xff;
    bytes[offset + 2] = (val >>> 8) & 0xff;
    bytes[offset + 3] = val & 0xff;
  };
  write32(h1, 0);
  write32(h2, 4);
  write32(h3, 8);
  write32(h4, 12);

  // Set UUID version (v5 semantics) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const hex = Array.from(bytes, toHex).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Convenience alias
export const deterministicUuid = uuidFromString;
