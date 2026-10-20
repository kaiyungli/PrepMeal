# Editorial recipe-link repair — 2026-10-20

Scope: four existing guides (50 classic recipes, market shopping, seven-day plan and 30-minute dinners). Sitemap and Search Console submissions remain paused.

Compared 104 literal/data recipe references with the 288 public production recipe slugs. Found 59 references to 35 absent slugs. Twelve have verified equivalent published recipes; the other 23 do not have an equivalent published record.

- Equivalent aliases resolve directly to canonical recipe URLs in article links. Next.js permanent redirects preserve old external bookmarks, including wood-ear-salad → cold-black-fungus-xhs. All twelve canonical targets independently returned HTTP 200.
- Unavailable dishes retain their editorial names but render as nonlinks with 食譜暫未提供. Inline 查看食譜 links are replaced by this status. A short guide notice distinguishes published recipes from meal ideas. No unrelated-recipe redirects or new recipe records were created. The absent clay-pot recipe URL intentionally remains 404; its guide references no longer invite users to click a nonexistent recipe.
- Tests cover every actual guide reference against the dated public-catalogue snapshot, redirect destinations/no chains, unavailable-route behavior and rendered link/nonlink markup.
- Full regression: 2,182 unit/API tests + 173 component tests passed. Final copy-only cleanup was followed by the affected reference/render suite, TypeScript and diff checks.

Code review completed. Configured preview build and browser verification are recorded on the PR after deployment.

Separate unresolved infrastructure issue: both HTTP and HTTPS www.eatwhathk.com return 302 to https://eatwhathk-com.l.ink/, whose final response is 404. This occurs before the Next.js application; a Next.js host redirect cannot fix traffic that never reaches it. Vercel is not connected in this session, and the authoritative DNS/registrar configuration has not been inspected. No DNS or domain settings were changed.

This patch repairs navigation. It does not certify all prose cooking times, nutrition claims, or standalone cooking instructions in these legacy guides.
