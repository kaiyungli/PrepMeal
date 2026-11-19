# Account recovery — issue #139, implementation review

Date: 2026-11-19. Base: `245de3aea8311fac275250b50165e011b02f42a5`.

## Scope and result

Ported the retained #125 implementation onto current main. Login exposes password-reset and signup-confirmation resend. Requests use Supabase's existing active lightweight `AuthClient`, generic account-safe responses, a synchronous duplicate-request guard and a shared 60-second per-tab cooldown (including failures). Supabase remains responsible for server rate limits.

Signup and resend preserve validated internal continuation. Callback URLs use the current origin and explicit signup/recovery flow. Scheme-relative paths, encoded unsafe paths, backslashes and controls cannot become external return URLs. Recovery is handled separately from ordinary OAuth/signup continuation.

An early synchronous listener on **src/lib/supabase.ts** captures `PASSWORD_RECOVERY`; the old unused full-client module is unchanged. A fresh token/code/error attempt clears an earlier handoff. The user-bound handoff expires after 15 minutes, contains no credentials and is UI context only. Reset checks the live server user before display/update and rejects normal sessions, mismatches, expiration, error links and account switches. The reset form waits for the actual SDK recovery event, with a bounded timeout, instead of assuming zero-delay task ordering. Password mismatch/update failure stay retryable; successful save clears fields/context and distinguishes local sign-out failure.

Current favicon, lightweight auth/session key and fail-closed ad policy are preserved. Auth pages have noindex and no-referrer metadata, including client navigation. Existing third-party scripts from a previously visited page are not removed by this change. No provider, SMTP, allowlist, template, DB/RLS or production setting has changed. No real email request, password update, user creation or production release was performed.

## Validation

- 44 focused unit tests: account recovery/redirect boundaries, active-client early listener and fresh-code clearing, SEO indexing and ad policy.
- 12 runtime tests: reset/resend request de-duplication, generic errors/cooldown and retry, safe continuation/toggle, invalid/error links, normal-session rejection, delayed recovery event, password mismatch, update failure/retry, local sign-out failure and account changes (including while server validation is pending).
- TypeScript, scoped ESLint and whitespace check: passed.
- Production build: `next build --webpack` passed with the public project URL/anon key only. The same anon value filled the legacy server-key environment slot for public read-only prerender; no service-role credential was used. Both generated account-help and auth/callback HTML contain noindex and no-referrer metadata and no advertising SDK script. The existing brandIconVersion JSON named-export warning remains. Earlier attempts failed because Turbopack rejects the worktree's external node_modules symlink, and a synthetic/missing server catalogue environment could not prerender public guides. No product code was changed to bypass these checks. Remote Preview and live inbox validation remain required.
- Source/diff independently reviewed by parent agent. Full repository test suite and remote Preview interaction not executed in this implementation step.

## Required before release — not completed

Issue #139 remains open. Synthetic auth tests do **not** verify delivery or actual hosted configuration.

1. Read current Supabase URL allowlist, SMTP and recovery/signup email templates. The connector does not expose these settings; use authenticated owner access. Verify the exact Production callback and exact Preview callback, with the template's `RedirectTo` behavior. Do not add wildcard Vercel domains or change unrelated auth settings.
2. Use an explicitly designated controlled test inbox to verify actual reset/resend delivery, spam folder and throttling.
3. Verify real valid, expired and reused links; user enters any password securely. Verify login with the replacement password and existing signup/OAuth continuation.
4. Review the concrete Preview and its exact commit. Merge/deploy only after release approval and required validation.

## References checked

- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/reference/javascript/auth-resend
- https://supabase.com/docs/guides/auth/redirect-urls
- Installed @supabase/auth-js 2.98.0 source: URL initialization saves the session then schedules PASSWORD_RECOVERY; the listener must be registered before component effects.

The retained `docs/qa/account-recovery-20261026.md` is historical #125 evidence, not fresh validation of this branch.
