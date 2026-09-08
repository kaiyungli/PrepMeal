/**
 * 我的 tab — account surface.
 *
 * First consumer of the shared auth session (`useAuthSession`). Signed-in shows
 * the account email + 登出; signed-out shows the reusable `<SignedOutNotice />`
 * with account-specific copy (Plans supplies its own copy in 4b).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { SignedOutNotice, useAuthSession } from '@/features/auth';

export default function ProfileScreen() {
  const { status, user, error, signOut } = useAuthSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Whenever we are not signed in (incl. after a successful SIGNED_OUT), clear
  // any in-flight / failed logout UI state so a later sign-in starts clean.
  useEffect(() => {
    if (status !== 'signedIn') {
      setSigningOut(false);
      setSignOutError(null);
    }
  }, [status]);

  const handleSignOut = async () => {
    if (signingOut) return; // prevent duplicate submissions
    setSignOutError(null);
    setSigningOut(true);
    const result = await signOut();
    if (result.ok) {
      // Stay disabled: the SIGNED_OUT event flips `status` and re-renders this
      // screen into the signed-out branch (this button unmounts). We never set
      // signed-out state here.
      return;
    }
    setSigningOut(false);
    setSignOutError(result.error);
  };

  if (status === 'restoring') {
    return (
      <ScreenContainer scroll={false}>
        <LoadingState label="載入中…" />
      </ScreenContainer>
    );
  }

  if (status === 'error') {
    return (
      <ScreenContainer scroll={false}>
        <ErrorState message={error ?? '發生錯誤，請稍後再試。'} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>我的</Text>

        {status === 'signedIn' ? (
          <>
            <Text style={styles.email}>{user?.email ?? '已登入'}</Text>
            {signOutError != null && (
              <Text style={styles.signOutError}>{signOutError}</Text>
            )}
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel="登出"
              accessibilityState={{ disabled: signingOut, busy: signingOut }}
              hitSlop={spacing.sm}
              style={({ pressed }) => [
                styles.signOut,
                (pressed || signingOut) && styles.signOutPressed,
              ]}
            >
              <Text style={styles.signOutText}>{signingOut ? '登出中…' : '登出'}</Text>
            </Pressable>
          </>
        ) : (
          <SignedOutNotice message="登入後可管理你的帳戶與偏好設定。" />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.text,
  },
  email: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  signOutError: {
    fontSize: typography.body,
    color: colors.danger,
  },
  signOut: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutPressed: {
    opacity: 0.6,
  },
  signOutText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
});
