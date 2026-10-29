import { canonicalJsonStringify } from '../engine/canonicalJson';

export async function computeSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeChainedHash(
  prevHash: string,
  timestamp: string,
  payload: Record<string, unknown>
): Promise<string> {
  const serialized = canonicalJsonStringify(payload);
  const combined = `${prevHash}|${timestamp}|${serialized}`;
  return computeSha256(combined);
}

export function truncateHash(hash: string, length: number = 12): string {
  if (!hash) return '';
  if (hash.length <= length) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
}
