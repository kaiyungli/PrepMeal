/**
 * Dynamic Expo config.
 *
 * The static base lives in `app.json`; Expo loads it first and hands the
 * normalised result here as `config`. This file only layers on the ONE piece
 * of native config that depends on a value we do not have yet: the
 * "Sign in with Google" (non-Firebase "Original" API) iOS URL scheme.
 *
 * `@react-native-google-signin/google-signin`'s config plugin hard-requires an
 * `iosUrlScheme` that starts with `com.googleusercontent.apps.` — the reversed
 * iOS OAuth client id. Until that id exists we simply do NOT add the plugin, so
 * `expo prebuild` / EAS builds keep working and `<SignInScreen>` keeps the
 * Google button hidden (it gates on `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`). When
 * the Google Cloud OAuth clients are created (P3), set
 * `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` and the plugin wires itself in.
 *
 * Apple config is unconditional and stays in `app.json`
 * (`ios.usesAppleSignIn` + the `expo-apple-authentication` plugin).
 */
module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  if (iosUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme },
    ]);
  }

  return { ...config, plugins };
};
