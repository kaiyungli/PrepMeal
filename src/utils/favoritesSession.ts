// A session identity is used only to invalidate client cache, never authorize data.
export function favoritesSessionIdentity(session: { user?: { id?: string; last_sign_in_at?: string }; access_token?: string } | null): string | null {
  if (!session?.user?.id) return null;
  let sessionId: unknown = null;
  try {
    const encoded = session.access_token?.split('.')[1];
    if (encoded) sessionId = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))).session_id;
  } catch { /* Missing/legacy claims use the user sign-in timestamp instead. */ }
  return JSON.stringify([session.user.id, typeof sessionId === 'string' ? sessionId : session.user.last_sign_in_at || null]);
}
