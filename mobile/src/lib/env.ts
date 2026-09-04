/**
 * Centralised access to the mobile app's public environment configuration.
 *
 * Expo inlines any `process.env.EXPO_PUBLIC_*` reference at build time, so these
 * must be referenced by their full static name (no dynamic property access).
 *
 * Values here are PUBLIC (they ship inside the client bundle). Never read a
 * server secret / service-role key through this module.
 */

export type MobileEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

class MissingEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required Expo env var(s): ${missing.join(', ')}. ` +
        'Copy mobile/.env.example to mobile/.env and restart the Expo dev server.',
    );
    this.name = 'MissingEnvError';
  }
}

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns the validated public env, or throws `MissingEnvError` listing exactly
 * which variables are absent. Call this from infrastructure code (e.g. the
 * Supabase client factory), not from presentation components.
 */
export function getMobileEnv(): MobileEnv {
  const missing: string[] = [];
  if (!rawSupabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!rawSupabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }

  return {
    supabaseUrl: rawSupabaseUrl as string,
    supabaseAnonKey: rawSupabaseAnonKey as string,
  };
}

/**
 * Non-throwing check, useful for rendering a friendly "not configured" state in
 * a screen instead of crashing.
 */
export function hasMobileEnv(): boolean {
  return Boolean(rawSupabaseUrl && rawSupabaseAnonKey);
}

export { MissingEnvError };
