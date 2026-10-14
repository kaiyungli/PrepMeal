# Favorites intent and recipe preload budget

Repeated touch/focus/pointer events now join the same pending Favorites intent operation for the same mounted authentication scope. A fresh full Favorites cache or a pending foreground ID-only read skips speculative token retrieval. Failed operations release their pending slot for retry; retired account leases cannot issue old-account reads. AuthContext already returns a cached token: this reduces duplicate callbacks, not JWKS or network authentication time. The 30-second freshness policy is unchanged.

Recipe-list detail preloads retain their initial idle/fallback delay, 250ms stagger, and eight-item limit, but at most two operations from the batch run concurrently. Slow operations hold the remaining queue. Completion releases a slot; unmount/ID changes discard queued work while leaving issued shared reads available to foreground consumers. This is a per-batch budget, not a global browser/network limit. Other components and automatic Next Link prefetching remain outside this budget. A hung read can hold one batch slot; foreground detail opening is unchanged.

Validation: 2,052 unit and 163 component tests; TypeScript; changed-file lint; diff check; build with synthetic Supabase configuration. Four added regressions cover shared token resolution/fresh cache, retry after token failure, two concurrent slow reads, and retiring queued work on unmount. No measured latency improvement is claimed. Actual desktop/phone first-entry and repeat-entry comparisons remain necessary before promoting preview RPC to ordinary production reads.

Based on PR #89's preview-only RPC candidate. Production still uses REST. No database, RLS, authentication, meal-plan or shopping-list changes.
