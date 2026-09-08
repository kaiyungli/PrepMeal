/**
 * Email + password sign-in.
 *
 * Constraint (mobile-slice-4a-auth-design.md review): on a successful
 * `signInWithPassword()` this screen does NOT `router.back()` immediately. It
 * waits until `useAuthSession().status === 'signedIn'` — i.e. the `SIGNED_IN`
 * event has actually driven provider state — and only then dismisses. A short
 * watchdog surfaces a retry if that event never lands.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';

import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/constants/theme';

import { createAuthLock } from '../authLock';
import { validateCredentials } from '../credentials';
import { ensureGoogleConfigured, isGoogleSignInAvailable } from '../social/googleAuth';
import { useAuthSession } from '../useAuthSession';

// If `SIGNED_IN` somehow never arrives after a successful call, stop blocking.
const SIGNED_IN_WATCHDOG_MS = 8000;

export function SignInScreen() {
  const router = useRouter();
  const { status, signInWithPassword, signInWithApple, signInWithGoogle } =
    useAuthSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once a sign-in call (password OR social) returned success; we then wait
  // for `status === 'signedIn'` before dismissing.
  const [awaitingSignedIn, setAwaitingSignedIn] = useState(false);
  // Which social provider (if any) has a flow in progress — also the busy gate
  // for the social buttons.
  const [socialInFlight, setSocialInFlight] = useState<null | 'apple' | 'google'>(
    null,
  );

  // Apple: available only on a supported iOS version — probed once.
  const [appleAvailable, setAppleAvailable] = useState(false);
  // Google: shown only when a working sign-in is actually possible on this
  // runtime — never in Expo Go, and iOS needs its native client id + URL scheme,
  // not just a web client id (see `googleAvailability.ts`).
  const googleAvailable = isGoogleSignInAvailable();

  // SYNCHRONOUS single-flight lock shared by password + Apple + Google. `busy`
  // (below) is React state and only updates next render, so a rapid double tap
  // would start two requests; this ref flips immediately.
  const authLockRef = useRef(createAuthLock());
  // Guards post-await state writes: a fast `SIGNED_IN` can dismiss/unmount this
  // screen (via the continuous effect below) before `signInWithPassword()`
  // resolves.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Probe Apple availability once (iOS-only; false everywhere else).
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => {
        if (alive) setAppleAvailable(ok);
      })
      .catch(() => {
        if (alive) setAppleAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Warm the Google native client once, only when a working sign-in is possible.
  // `ensureGoogleConfigured()` itself never imports the native module in Expo Go
  // and never rejects; the extra `.catch` keeps this fire-and-forget provably
  // free of unhandled rejections.
  useEffect(() => {
    if (!googleAvailable) return;
    ensureGoogleConfigured().catch(() => {});
  }, [googleAvailable]);

  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  }, [router]);

  // Continuously observe the shared session: the moment it is signed in — for
  // ANY reason (this screen's login; a background restore that resolved after
  // the screen opened; a deep-link open of an already-signed-in app; a late
  // SIGNED_IN that arrives after the watchdog fired) — dismiss. NOT gated on
  // `awaitingSignedIn`, so none of those paths can leave the screen stuck.
  useEffect(() => {
    if (status !== 'signedIn') return;
    // Success lifecycle end: the attempt that was held open until SIGNED_IN is
    // done — release the single-flight lock.
    authLockRef.current.release();
    dismiss();
  }, [status, dismiss]);

  // Watchdog: armed only while actively awaiting the SIGNED_IN after a
  // successful `signInWithPassword()`. If it fires, stop blocking and show a
  // retry — a later SIGNED_IN still dismisses via the effect above.
  useEffect(() => {
    if (!awaitingSignedIn || status === 'signedIn') return;
    const timer = setTimeout(() => {
      setAwaitingSignedIn(false);
      // SIGNED_IN never landed — end the held attempt and let the user retry.
      authLockRef.current.release();
      setError('登入未能完成，請重試。');
    }, SIGNED_IN_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [awaitingSignedIn, status]);

  // Visual/disabled gate (next-render state). The real single-flight guard is
  // `authLockRef` — acquired synchronously at the top of every handler.
  const busy = submitting || socialInFlight !== null || awaitingSignedIn;

  const onSubmit = async () => {
    setError(null);

    const check = validateCredentials(email, password);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    // Synchronous lock: a rapid second tap (before `busy` re-renders) bails here.
    if (!authLockRef.current.tryAcquire()) return;

    setSubmitting(true);
    const result = await signInWithPassword(email.trim(), password);

    // If a fast `SIGNED_IN` already dismissed/unmounted this screen, do not
    // touch local state. The lock is released by the signed-in/dismiss effect.
    if (!mountedRef.current) return;

    setSubmitting(false);

    if (result.ok) {
      // DO NOT dismiss here — wait for status === 'signedIn' (SIGNED_IN event).
      // Keep the lock HELD until that lifecycle (dismiss effect / watchdog).
      setAwaitingSignedIn(true);
    } else {
      setError(result.error);
      authLockRef.current.release();
    }
  };

  // ALWAYS-available, neutral verification entry. Does NOT depend on the last
  // login error (that would leak account state). Routes to the sign-up screen's
  // OTP step with whatever is in the email field prefilled — no password, no
  // claim that the address exists or is unconfirmed. In-app `router.push` with
  // params — NOT a deep link.
  const goToVerification = () => {
    if (busy) return;
    router.push({
      pathname: '/sign-up',
      params: { mode: 'verify', email: email.trim() },
    });
  };

  const goToSignUp = () => {
    if (busy) return;
    router.push('/sign-up');
  };

  const onSocialPress = async (provider: 'apple' | 'google') => {
    // Same synchronous lock, shared with password + the other provider.
    if (!authLockRef.current.tryAcquire()) return;
    setError(null);
    setSocialInFlight(provider);

    const result =
      provider === 'apple' ? await signInWithApple() : await signInWithGoogle();

    // A fast `SIGNED_IN` can dismiss/unmount this screen before we resolve; the
    // lock is then released by the signed-in/dismiss effect.
    if (!mountedRef.current) return;

    setSocialInFlight(null);

    if (result.status === 'ok') {
      // Keep the lock HELD while awaiting status === 'signedIn'.
      setAwaitingSignedIn(true);
    } else {
      // Cancellation is intentionally silent; only real errors show copy.
      if (result.status === 'error') setError(result.message);
      authLockRef.current.release();
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          <Text style={styles.title}>登入</Text>
          <Text style={styles.subtitle}>登入你的帳戶以查看已儲存的餐單。</Text>

          {error != null && <Text style={styles.error}>{error}</Text>}

          <View style={styles.field}>
            <Text style={styles.label}>電郵</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              editable={!busy}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>密碼</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="登入"
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [
              styles.submit,
              (pressed || busy) && styles.submitDisabled,
            ]}
          >
            <Text style={styles.submitText}>{busy ? '登入中…' : '登入'}</Text>
          </Pressable>

          <Pressable
            onPress={goToSignUp}
            disabled={busy}
            accessibilityRole="link"
            accessibilityLabel="未有帳戶？註冊"
            hitSlop={spacing.sm}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>未有帳戶？註冊</Text>
          </Pressable>

          {/* Always shown — never gated on the login error (that leaks state). */}
          <Pressable
            onPress={goToVerification}
            disabled={busy}
            accessibilityRole="link"
            accessibilityLabel="未完成電郵驗證？"
            hitSlop={spacing.sm}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>未完成電郵驗證？</Text>
          </Pressable>

          {(appleAvailable || googleAvailable) && (
            <View style={styles.socialGroup}>
              <Text style={styles.socialHint}>或使用其他方式</Text>

              {appleAvailable && (
                <View
                  pointerEvents={busy ? 'none' : 'auto'}
                  style={busy ? styles.submitDisabled : undefined}
                >
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={
                      AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={radius.sm}
                    style={styles.appleButton}
                    onPress={() => {
                      void onSocialPress('apple');
                    }}
                  />
                </View>
              )}

              {googleAvailable && (
                <Pressable
                  onPress={() => {
                    void onSocialPress('google');
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="使用 Google 登入"
                  accessibilityState={{
                    disabled: busy,
                    busy: socialInFlight === 'google',
                  }}
                  style={({ pressed }) => [
                    styles.googleButton,
                    (pressed || busy) && styles.submitDisabled,
                  ]}
                >
                  <Text style={styles.googleButtonText}>
                    {socialInFlight === 'google' ? '登入中…' : '使用 Google 登入'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md },
  title: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  error: {
    fontSize: typography.body,
    color: colors.danger,
  },
  field: { gap: spacing.xs },
  label: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  submit: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '600',
  },
  linkRow: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  socialGroup: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  socialHint: {
    fontSize: typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  appleButton: {
    height: 48,
    width: '100%',
  },
  googleButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
