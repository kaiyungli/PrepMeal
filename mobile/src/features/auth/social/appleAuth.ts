/**
 * Native "Sign in with Apple" → Supabase, as a single call the provider wraps.
 *
 * Flow (Apple + Supabase native id-token, with replay protection):
 *   1. draw a raw nonce  = 32 CSPRNG bytes (`expo-crypto`) → 64 hex chars;
 *   2. hash it           = SHA-256(raw nonce) → send THIS to Apple as `nonce`;
 *   3. Apple returns an identity token whose `nonce` claim is that same hash;
 *   4. hand the RAW nonce + identity token to
 *      `supabase.auth.signInWithIdToken({ provider:'apple', ... })`, which
 *      re-hashes the raw nonce and checks it against the claim.
 *
 * This module never writes auth/provider state: on success the Supabase
 * `SIGNED_IN` event drives the transition, exactly like password sign-in.
 * User cancellation resolves as `{ status: 'cancelled' }` (never an error).
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { getSupabaseClient } from '@/lib/supabase';

import { authErrorMessage } from '../errorMessages';
import { RAW_NONCE_BYTES, bytesToHex } from './nonce';
import { interpretAppleError, type SocialAuthResult } from './socialResult';

/** `true` only on an iOS version that supports Sign in with Apple. */
export function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

async function generateRawNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(RAW_NONCE_BYTES);
  return bytesToHex(bytes);
}

function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export async function signInWithAppleNative(): Promise<SocialAuthResult> {
  let rawNonce: string;
  let identityToken: string | null;

  try {
    rawNonce = await generateRawNonce();
    const hashedNonce = await sha256Hex(rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    identityToken = credential.identityToken;
  } catch (err) {
    // Cancellation is split from real errors inside `interpretAppleError`.
    return interpretAppleError(err, authErrorMessage);
  }

  if (!identityToken) {
    return {
      status: 'error',
      message: authErrorMessage(new Error('apple sign-in returned no identity token')),
    };
  }

  try {
    const { error } = await getSupabaseClient().auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce,
    });
    if (error) return { status: 'error', message: authErrorMessage(error) };
    // Success: do NOT touch provider state — the SIGNED_IN event owns it.
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: authErrorMessage(err) };
  }
}
