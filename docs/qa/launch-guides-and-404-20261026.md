# Launch L1 — Guides and 404

Owner authorized the first launch-readiness package: repair old guides/links and provide Chinese recovery. No new recipes, data/schema/auth/ad configuration or production release in this delivery.

Four existing URLs retain Layout, warm palette, readable lists and their canonical paths. Removed independent stale recipes, cooking/time/price assertions and corrupted text. Recommendations now use the existing complete PUBLIC home catalogue on the server, with five-minute ISR. A failed/incomplete catalogue fetch throws so ISR retains the last good page. No service credential or catalogue loader is shipped to the browser. A loaded catalogue with no matching recipes shows a truthful empty state.

Quick selects up to20 known total times <=30min; classic up to50 Chinese recipes (renamed to family-dish inspiration, no false traditional/top-list claim); week up to7 complete meals, explicitly not personalized nutrition; market up to12 existing Chinese dishes. Actual names/times/slugs drive links and headings; no invented fallback slug. Unknown/malformed rows excluded. Article JSON-LD matches visible content. Longer copied summaries were replaced with planning guidance and links to the canonical recipes rather than another conflicting formula.

404 keeps HTTP404 via Next's custom404 page, has noindex and clear Chinese recipe/home/contact exits, with common header/footer.

Validation: full2264 unit +207 component =2471 passes. Final runtime input-guard/type refinements followed by5 targeted tests and TypeScript. Changed-file ESLint, production build and whitespace pass. Built pages contain20/50/7/12 recipes (89 placements); all link slugs are present in the current300-URL public sitemap; no replacement characters in built HTML. These checks establish catalogue consistency, not independent HTTP/image validation of every detail. Previously shell full-site network checks were interrupted by environment policy; not repeated to bypass it.

Reviewed React: no new client fetching/effects, semantic lists/headings/nav, normal links and no truncation; responsive one/two-column cards. Data boundaries guard types; no DB changes or bypass of public filter. Existing five-minute ISR can retain an older link briefly after an independent recipe retirement; the new404 provides recovery. No permanent redirects that substitute unrelated dishes.

Pending: preview visual/HTTP404 checks, owner mobile acceptance, merge and production deployment. Other launch priorities (password recovery, privacy copy, AdSense/CMP, full account/offline acceptance) remain unstarted.
