/**
 * Pure nonce helpers for the native "Sign in with Apple" flow.
 *
 * NO React, NO Expo, NO Supabase import — unit-tested directly by the repo's
 * `node --test` runner (see `nonce.test.ts`). The impure parts (drawing random
 * bytes from `expo-crypto`, SHA-256 hashing) live in `appleAuth.ts`; this module
 * only holds the byte→string encoding and the shape checks that are worth
 * asserting on their own.
 *
 * Contract (Apple + Supabase native id-token flow):
 *  - a RAW nonce = 32 CSPRNG bytes rendered as 64 lower-case hex chars;
 *  - SHA-256(raw nonce) (also 64 hex chars) is what goes to Apple as `nonce`;
 *  - Apple echoes that hash verbatim into the identity token's `nonce` claim;
 *  - the RAW nonce goes to `supabase.auth.signInWithIdToken({ nonce })`, which
 *    re-hashes it and compares — so the raw value must never be sent to Apple.
 */

/** Byte length of a raw nonce before hex encoding. */
export const RAW_NONCE_BYTES = 32;

/** Hex-string length of both a raw nonce and its SHA-256 digest. */
export const NONCE_HEX_LENGTH = 64;

const HEX_64_RE = /^[0-9a-f]{64}$/;

/**
 * Lower-case, zero-padded hex encoding of a byte array. Deterministic and
 * allocation-cheap; `Uint8Array` in, `string` out.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** True for exactly 64 lower-case hex chars (a SHA-256 digest, hex-encoded). */
export function isSha256Hex(value: string): boolean {
  return HEX_64_RE.test(value);
}

/**
 * True when `value` is shaped like a raw nonce this module would produce:
 * `bytesToHex()` of exactly `RAW_NONCE_BYTES` bytes.
 */
export function isWellFormedRawNonce(value: string): boolean {
  return value.length === NONCE_HEX_LENGTH && HEX_64_RE.test(value);
}
