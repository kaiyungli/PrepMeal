/**
 * Email + password sign-up, with the two-step flow:
 *
 *   form  — email / password / confirm password → `signUpWithEmail()`
 *   otp   — 6-digit code → `confirmEmailOtp()`; resend; back to sign-in
 *
 * ANTI-ENUMERATION: after `signUpWithEmail()` resolves `{ next:'otp' }` we show
 * the SAME neutral notice regardless of whether the address is new or already
 * registered — the provider never hands this screen `user`/`identities`
 * (see `signupFlow.ts`).
 *
 * Like `<SignInScreen>`: never dismisses on an action result — it waits for
 * `useAuthSession().status === 'signedIn'` (the `SIGNED_IN` event), guarded by a
 * short watchdog. Concurrency is a synchronous `authLock` shared by every async
 * action; a `mountedRef` blocks post-await state writes after unmount.
 *
 * Reached at `/sign-up`, or `/sign-up?mode=verify&email=…` from `<SignInScreen>`
 * for an existing but unconfirmed account (starts on the OTP step, no password).
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/constants/theme';

import { createAuthLock } from '../authLock';
import { validateOtpToken, validateSignUp } from '../credentials';
import { SIGNUP_OTP_RESENT_NOTICE, type SignUpStep } from '../signupFlow';
import { useAuthSession } from '../useAuthSession';

// If `SIGNED_IN` somehow never arrives after a successful verify, stop blocking.
const SIGNED_IN_WATCHDOG_MS = 8000;

export function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; email?: string }>();
  const verifyMode = params.mode === 'verify';

  const { status, signUpWithEmail, confirmEmailOtp, resendSignupOtp } =
    useAuthSession();

  const [step, setStep] = useState<SignUpStep>(verifyMode ? 'otp' : 'form');
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set once an action succeeded down a path that ends in a session; we then
  // wait for `status === 'signedIn'` before dismissing.
  const [awaitingSignedIn, setAwaitingSignedIn] = useState(false);

  // SYNCHRONOUS single-flight lock shared by submit / verify / resend. `busy`
  // (React state) only updates next render, so a rapid double tap would start
  // two requests; this ref flips immediately.
  const authLockRef = useRef(createAuthLock());
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  }, [router]);

  // The moment the shared session is signed in — for ANY reason — dismiss. Not
  // gated on `awaitingSignedIn`, so no path can leave this screen stuck.
  useEffect(() => {
    if (status !== 'signedIn') return;
    authLockRef.current.release();
    dismiss();
  }, [status, dismiss]);

  // Watchdog: armed only while awaiting SIGNED_IN after a successful action.
  useEffect(() => {
    if (!awaitingSignedIn || status === 'signedIn') return;
    const timer = setTimeout(() => {
      setAwaitingSignedIn(false);
      authLockRef.current.release();
      setError('登入未能完成，請重試。');
    }, SIGNED_IN_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [awaitingSignedIn, status]);

  // Visual/disabled gate only. The real single-flight guard is `authLockRef`.
  const busy = submitting || resending || awaitingSignedIn;

  const onSubmitForm = async () => {
    setError(null);
    setNotice(null);

    const check = validateSignUp(email, password, confirmPassword);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    if (!authLockRef.current.tryAcquire()) return;
    setSubmitting(true);
    const result = await signUpWithEmail(email.trim(), password);

    if (!mountedRef.current) return;
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      authLockRef.current.release();
      return;
    }

    if (result.next === 'session') {
      // Confirmation disabled server-side — a session is coming. Keep the lock
      // HELD until the SIGNED_IN lifecycle.
      setAwaitingSignedIn(true);
      return;
    }

    // next === 'otp': neutral copy, advance. The typed code is a fresh action,
    // so release the lock now.
    setStep('otp');
    setNotice(result.notice);
    setOtpToken('');
    authLockRef.current.release();
  };

  const onVerifyOtp = async () => {
    setError(null);
    setNotice(null);

    const check = validateOtpToken(otpToken);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    if (!authLockRef.current.tryAcquire()) return;
    setSubmitting(true);
    const result = await confirmEmailOtp(email.trim(), otpToken.trim());

    if (!mountedRef.current) return;
    setSubmitting(false);

    if (result.ok) {
      // verifyOtp success → SIGNED_IN → dismiss. Keep the lock HELD.
      setAwaitingSignedIn(true);
    } else {
      setError(result.error);
      authLockRef.current.release();
    }
  };

  const onResend = async () => {
    setError(null);
    setNotice(null);

    if (!authLockRef.current.tryAcquire()) return;
    setResending(true);
    const result = await resendSignupOtp(email.trim());

    if (!mountedRef.current) return;
    setResending(false);
    authLockRef.current.release();

    // Neutral either way: SIGNUP_OTP_RESENT_NOTICE is conditional copy; a genuine
    // failure message from `authErrorMessage` (network / rate limit / service)
    // never reveals whether the address exists.
    if (result.ok) setNotice(SIGNUP_OTP_RESENT_NOTICE);
    else setError(result.error);
  };

  // Verify-mode entry (from <SignInScreen> 「未完成電郵驗證？」): send one code on
  // mount so the user has something to enter. Neutral notice regardless — this
  // never reveals whether the address exists or is already confirmed.
  const autoResentRef = useRef(false);
  useEffect(() => {
    if (!verifyMode || autoResentRef.current) return;
    autoResentRef.current = true;
    void onResend();
    // onResend is stable enough here — the ref guard makes this run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyMode]);

  const goToSignIn = () => {
    if (busy) return;
    router.replace('/sign-in');
  };

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step === 'form' ? (
          <View style={styles.form}>
            <Text style={styles.title}>註冊</Text>
            <Text style={styles.subtitle}>
              建立帳戶以儲存及同步你的餐單。
            </Text>

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
                placeholder="至少 6 個字元"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="password-new"
                editable={!busy}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>確認密碼</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="再次輸入密碼"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="password-new"
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={onSubmitForm}
              />
            </View>

            <Pressable
              onPress={onSubmitForm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="註冊"
              accessibilityState={{ disabled: busy, busy }}
              style={({ pressed }) => [
                styles.submit,
                (pressed || busy) && styles.submitDisabled,
              ]}
            >
              <Text style={styles.submitText}>{busy ? '處理中…' : '註冊'}</Text>
            </Pressable>

            <Pressable
              onPress={goToSignIn}
              disabled={busy}
              accessibilityRole="link"
              accessibilityLabel="已有帳戶？登入"
              hitSlop={spacing.sm}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>已有帳戶？登入</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.title}>輸入驗證碼</Text>
            <Text style={styles.subtitle}>
              請輸入寄到 {email || '你的電郵'} 的 6 位數驗證碼。
            </Text>

            {notice != null && <Text style={styles.notice}>{notice}</Text>}
            {error != null && <Text style={styles.error}>{error}</Text>}

            <View style={styles.field}>
              <Text style={styles.label}>驗證碼</Text>
              <TextInput
                style={styles.input}
                value={otpToken}
                onChangeText={(t) => setOtpToken(t.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={onVerifyOtp}
              />
            </View>

            <Pressable
              onPress={onVerifyOtp}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="驗證"
              accessibilityState={{ disabled: busy, busy: submitting || awaitingSignedIn }}
              style={({ pressed }) => [
                styles.submit,
                (pressed || busy) && styles.submitDisabled,
              ]}
            >
              <Text style={styles.submitText}>
                {submitting || awaitingSignedIn ? '驗證中…' : '驗證'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onResend}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="重新寄出驗證碼"
              accessibilityState={{ disabled: busy, busy: resending }}
              hitSlop={spacing.sm}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                {resending ? '重新寄出中…' : '重新寄出驗證碼'}
              </Text>
            </Pressable>

            <Pressable
              onPress={goToSignIn}
              disabled={busy}
              accessibilityRole="link"
              accessibilityLabel="返回登入"
              hitSlop={spacing.sm}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>返回登入</Text>
            </Pressable>
          </View>
        )}
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
  notice: {
    fontSize: typography.body,
    color: colors.text,
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
});
