# Launch L2 — Account recovery (implementation, not release)

Owner approved forgot password, reset form, signup-confirmation resend, cooldown/failure handling and real delivery tests. Existing main baseline7c0b3fb remains unchanged. No auth provider, SMTP, redirect allowlist, DB, RLS or password setting has been changed.

## Behavior

- Login links to account-help (reset/resend). Signup/resend use explicit same-origin /auth/callback?flow=signup; reset uses /auth/callback?flow=recovery. Destination continuation rejects network-path, backslash, control-character and encoded unsafe paths.
- Help uses resetPasswordForEmail/resend(type:signup), generic conditional success and sanitized failures. Synchronous pending guard and shared60s session cooldown include failures; server Supabase rate limits still apply. No password, email or token is stored in cooldown state.
- Recovery callback renders a separate reset form. Singleton auth client registers a synchronous early PASSWORD_RECOVERY listener before URL initialization completes. Fifteen-minute per-tab user-bound handoff contains only user ID/expiry, never a credential. A fresh URL attempt clears old handoff. Normal sign-in, signout or user update clears it.
- Handoff is only UI flow context. getSession + server getUser and a repeated account/context check are required before updateUser. Normal signed-in visits and invalid/error/expired links do not unlock the form. Existing SDK URL processing handles recovery tokens; no hand-written JWT acceptance or manual token logging.
- New passwords must match and have at least8characters; configured Supabase strength policies still enforce the server rules. Update failure remains retryable. Success clears password fields and recovery handoff, then attempts local signout; signout failure does not falsely report password-save failure and is separately explained. No claim that every other session is revoked.
- Direct HTML for account-help and auth/callback excludes advertising and uses no-referrer/noindex. Existing non-auth advertising is unchanged. Already-loaded scripts on prior SPA pages are not magically removed; email entry is a fresh document.

## Verification

Full2276 unit+217 component=2493 passed. Twelve unit cases and ten runtime cases cover account-bound handoff/expiry/clear, unsafe redirects, generic errors, request deduplication, cooldown expiry, resend, normal-session rejection, error links, password mismatch, failed update/retry, account change, signout failure and callback routing. Existing login concurrency regression remains green.

TypeScript, new/changed auth-module ESLint, production build and whitespace pass. Built account-help and auth/callback HTML have no adsbygoogle script, noindex and no-referrer; home still has the preexisting advertising script. React review: semantic labels/forms/status, bounded interval cleanup, no async auth calls within auth-event callbacks, no credential persistence, guards for stale account/unmounted responses. Existing broader lint debt remains.

## Required completion before release

Supabase URL Configuration dashboard currently redirects this browser to sign-in. No current live allowlist/SMTP/template settings have been read. Earlier records suggest SiteURL may still be the older Vercel production domain; that is historical evidence, not a fresh diagnosis.

Need authenticated read of URL config and email delivery/template settings, then only exact required callback allowlist changes with action-time approval if missing. Do not allow *.vercel.app or change SiteURL/provider/SMTP indiscriminately. Need production callback https://eatwhathk.com/auth/callback (query flow accepted) plus one exact preview callback if testing there. The actual preview hostname must come from the deployment, never be guessed.

Real inbox delivery, one-time/expired link behavior, password replacement and subsequent login remain pending. Do not create users, send to guessed email addresses, change an owner's actual password, bypass CAPTCHA or log token-bearing email URLs. The user must securely enter any credentials/passwords in browserAuth/manual flow.

Implementation may be reviewed in a draft preview; it is not ready to merge solely because tests/build pass. No production deployment or email request performed in this implementation step.

Official references checked: Supabase JS resetPasswordForEmail, resend, onAuthStateChange, passwords and email templates. Current SDK source confirms implicit URL initialization validates user, saves session and schedules PASSWORD_RECOVERY. Changelog current HTML checked; no related API migration introduced.
