/**
 * Unit tests for the pure Apple-nonce helpers. Run with: `npm test`.
 * Pure module — no React, no Expo, no Supabase, no `@/` imports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NONCE_HEX_LENGTH,
  RAW_NONCE_BYTES,
  bytesToHex,
  isSha256Hex,
  isWellFormedRawNonce,
} from './nonce.ts';

test('bytesToHex: known vector, lower-case, zero-padded', () => {
  assert.equal(
    bytesToHex(Uint8Array.from([0x00, 0x01, 0x0f, 0x10, 0xa0, 0xff])),
    '00010f10a0ff',
  );
});

test('bytesToHex: empty array -> empty string', () => {
  assert.equal(bytesToHex(new Uint8Array(0)), '');
});

test('bytesToHex: every byte value round-trips to two chars', () => {
  const all = Uint8Array.from({ length: 256 }, (_, i) => i);
  const hex = bytesToHex(all);
  assert.equal(hex.length, 512);
  assert.match(hex, /^[0-9a-f]+$/);
  assert.equal(hex.slice(0, 6), '000102');
  assert.equal(hex.slice(-6), 'fdfeff');
});

test('bytesToHex of RAW_NONCE_BYTES bytes is a well-formed raw nonce', () => {
  const bytes = Uint8Array.from({ length: RAW_NONCE_BYTES }, (_, i) => (i * 7) % 256);
  const nonce = bytesToHex(bytes);
  assert.equal(nonce.length, NONCE_HEX_LENGTH);
  assert.equal(isWellFormedRawNonce(nonce), true);
});

test('isSha256Hex / isWellFormedRawNonce: accept 64 lower-case hex chars', () => {
  const digest = 'a'.repeat(64);
  assert.equal(isSha256Hex(digest), true);
  assert.equal(isWellFormedRawNonce(digest), true);
});

test('isSha256Hex: reject wrong length, upper-case, non-hex, whitespace', () => {
  assert.equal(isSha256Hex('a'.repeat(63)), false);
  assert.equal(isSha256Hex('a'.repeat(65)), false);
  assert.equal(isSha256Hex('A'.repeat(64)), false);
  assert.equal(isSha256Hex('g'.repeat(64)), false);
  assert.equal(isSha256Hex(` ${'a'.repeat(63)}`), false);
  assert.equal(isSha256Hex(''), false);
});
