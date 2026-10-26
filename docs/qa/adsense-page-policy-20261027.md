# L4-A — Publisher, unit and page policy

Date: 2026-10-27 (Hong Kong). Owner approved the three bounded fixes after read-only L4 verification: unify publisher, stop sample units/empty boxes, and enforce designated public-page placement. Starts from production main 3235fa1; does not include account-recovery PR #125.

## Current behavior

- One public publisher constant: ca-pub-7449807224140811, verified against the owner's actual AdSense account. The incorrect NEXT_PUBLIC_ADSENSE_PUB_ID no longer controls the publisher. No environment values were modified and no secrets were read. Existing ads.txt remains byte-for-byte unchanged.
- The reviewed account had no verifiable real units. VERIFIED_AD_SLOT_IDS is therefore empty, requiring an explicit reviewed code change to authorize an account-owned unit. An env edit alone cannot activate arbitrary units. The known sample 1234567890 is rejected even if accidentally allowlisted. Missing/unreviewed config renders nothing, including no 90px Advertisement placeholder. All real ad SDK/slot requests remain off in the current version.
- Removed the executable global SDK script from _document. Preserves non-executing google-adsense-account meta verification with the correct publisher. Official source: https://support.google.com/adsense/answer/12169212?hl=en (meta verification alternative). Backend verification method/review not clicked or changed; later re-verification may be needed if Google requests it.
- Shared recipe content defaults showAds=false, suppressing quick previews on catalogue, favorites or generator. Only the successful standalone recipe page explicitly opts in, still subject to unit and route gates.
- Route policy uses Next's route-file pathname, with explicit recipe-detail and four public guide routes. Unknown/private/Auth/error/admin/performance routes fail closed. A public route alone does not load an SDK or grant a unit.
- For a future reviewed unit, SDK loading is lazy and deduplicated, waits for load, uses the correct publisher, handles failure, and cancels stale manual pushes after unmount/route change. Query/hash changes do not refresh the same slot; a different recipe remounts.
- Privacy wording now makes advertising data processing conditional on service activation/loading. No CMP/Auto ads/backend settings, recipes, database or user identity flows changed. Auto ads remains off.

## Verification

- Full suite: 2,291 unit +225 component =2,516 PASS. New coverage: 27 policy/loader checks and 18 runtime checks. Covers fail-closed units, malformed/sample IDs, blocked routes, quick-preview suppression, late SDK callbacks, StrictMode deduplication, route switches, no query-only refresh and error collapse/retry.
- TypeScript PASS; new/changed AdSense module, _document/_app, test and privacy ESLint PASS; whitespace PASS. React review: hooks remain unconditional within their component, effect cleanup cancels stale manual requests, no new data subscriptions, stable content/slot keys and no credential persistence. Existing recipe behavior checks pass in the complete component suite.
- Final production build PASS with the observed incorrect publisher env and sample unit env injected only into that build process. This validates rejection despite stale public ad env values, without mutating Vercel configuration.
- Built HTML checked for index, login, auth/callback, generate, my-plans, favorites, profile, 404, privacy, about and 30-minute guide: correct meta, no executable ad SDK, no manual slots, no Advertisement placeholder. ads.txt content matches the verified publisher.
- Attempted an additional local HTTP check against next start. Server reported Ready but separate loopback requests were refused twice; this check is NOT counted as passed. Task-owned server stopped. Dynamic recipe HTML and real-browser navigation remain for the Vercel preview.

## Limits and pending acceptance

No actual paid ad request was generated to test this fix. Runtime tests mock SDK completion; they prove our own manual request lifecycle, not all behavior of Google's opaque SDK. Removing a script cannot revoke code already executed in an old document. The current empty reviewed-unit list prevents that SDK from loading anywhere in a fresh session. Existing open production tabs need a full refresh after release.

Before any later activation, create/verify an actual account-owned unit and re-check browser requests across navigation, including isolation of any already-executing third-party SDK. Do not treat current tests as certification of future live advertising, CMP consent, all device layouts, account approval or AdSense content eligibility.

Pending: preview browser/owner acceptance, merge and production checks. L4-B CMP and L4-C content/review remain separate; L2 inbox tests stay deferred. No re-review submitted.
