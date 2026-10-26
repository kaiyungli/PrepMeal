# L3 — Public information and policy alignment

Date: 2026-10-27 (Hong Kong). Scope approved by owner: fix about, privacy, terms and FAQ together, retaining the warm visual style.

## Result

- About and terms now describe existing catalogue/rule-based matching, removing unsupported AI, open-database/user-submission and absolute accuracy/security claims.
- Privacy describes Email/provider auth, Supabase, Vercel, account data, local/session storage, draft and shopping progress, cross-border provider processing, local versus cloud deletion and manual data requests. Seven days is a read-validity limit, not a promised background deletion job.
- Google advertising disclosure covers partner data technologies and purposes, links to Google's partner-sites information and ad settings, and distinguishes account personalization controls from website consent. No claim that CMP configuration is complete.
- FAQ covers guest versus authenticated features, 3/5/7 days, 1–6 people, missing slots, save versus draft, shopping quantities, partial offline support and nutrition/allergen limitations.
- Contact details, update date, semantic headings and canonical URLs are consistent. Shared InformationPage uses the existing Layout, Header, Footer and SEO.
- Password recovery remains in separate draft PR #125; its real inbox tests were deferred by the owner. This branch starts from main 7c0b3fb and does not include its changes or advertise recovery as available.

## Evidence

Source review: actual about.tsx route (not unused about.js); generate draftStore/useGenerateDraft; shopping offlineStore/useSavedShoppingProgress; Supabase browser auth; generate servings options; current login and generator.

Official Google partner disclosure checked 2026-10-27:
https://policies.google.com/technologies/partner-sites?hl=zh-HK
Google's page supplies https://adssettings.google.com/ as its advertising-controls link. My Ad Center direct retrieval failed; no claim of account-state verification.

Validation: production build PASS, changed-file ESLint PASS, TypeScript PASS after regeneration, whitespace PASS. Initial tsc encountered stale generated .next references to unmerged account-help from the previous branch; fresh production build regenerated types, then tsc passed. No source regression involved.

Built HTML checks for all four routes: one title and H1 each, correct production canonical, date 2026-10-27, no replacement characters, matching mail/tel links, local internal-link targets present, old unsupported claims absent. Privacy disclosure contains Supabase/Vercel/localStorage/sessionStorage, seven-day semantics and verified Google links.

No new tests added for static wording/layout; no full behavior suite rerun for this content-only change. No DB, Auth, advertising config or recipe changes. React review: static content, no new effects/state/fetching, stable FAQ keys and semantic headings/links.

## Pending

Preview/browser visual acceptance, owner acceptance and merge/production verification. L4 CMP, publisher-ID discrepancy, Auto ads and AdSense backend remain separate and unverified. This content update is not a certification of legal compliance, ownership of all recipe media or approval by AdSense.
