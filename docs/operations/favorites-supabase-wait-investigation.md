# Favorites first/idle wait: read-only investigation (2026-10-13)

## Finding

The latest phone exports show a multi-second wait after the server sends its Supabase REST request. A matching-order gateway sequence places a similar duration inside Supabase's gateway/upstream boundary. Existing indexes and PostgreSQL execution statistics do not support adding indexes or treating the entire REST wait as SQL execution time. Exact separation of PostgREST connection acquisition, request planning, schema metadata, PostgreSQL execution and upstream transport remains unavailable.

The initial investigation was read-only: database statements were SELECT/catalog reads or a SELECT-only EXPLAIN in a READ ONLY transaction rolled back afterward. A subsequent bounded timing-header experiment, documented below, temporarily changed only the PostgREST timing flag and restored its absent baseline. Application behavior, data, schema, RLS, pool/statistics settings and production deployment were unchanged. The report contains no account IDs, request URLs, credentials, recipe data or raw SQL/log messages from users.

## Export evidence

`PrepMeal_Favorites_Measurement(3).json` is benchmark-v3, complete, with 22 successful GETs. It is not the navigation-v2 trace and has no build identity.

| Phase | Total | Before request | Server auth | Server DB request | Sent-to-REST-headers |
| --- | ---: | ---: | ---: | ---: | ---: |
| First test request | 6,207 ms | 882 ms | 530.26 ms | 3,718.16 ms | 3,700.99 ms |
| After approximately five minutes idle | 2,855 ms | 1,233 ms | 12.67 ms | 1,232.30 ms | 1,205.38 ms |

The first request's browser connect span is 873 ms (TLS 407 ms within it); the idle request's connect span is 1,167 ms (TLS 397 ms within it). Do not add TLS to connect time. Consecutive totals have medians 514.5 ms before idle and 436.5 ms afterward. Runtime region and exported routing regions are syd1; the project is in ap-southeast-2. Module age/request ordinal are hints, not proof of a platform cold start. The after-idle sample is module request 12, not the first request in that module.

`PrepMeal_Favorites_Comparison(2).json` is comparison-v2, complete, with 24 successful GETs in six alternating balanced blocks. After excluding the first block as a sensitivity check, REST/RPC each have ten observations: total medians 445.5/383.5 ms and DB-request medians 103.34/41.76 ms. All five remaining blocks favor RPC on mean total, with differences 13.5–360.5 ms. This is one consecutive run, not evidence of RPC cold/idle performance or a statistically established production benefit. The first REST has DB-request 4,312.71 ms, native sent-to-headers 4,304.15 ms and dispatch 0.26 ms; its following RPC is already later in the warmed sequence.

## Hosted read-only checks

- Project is ACTIVE_HEALTHY, PostgreSQL 17.6, ap-southeast-2. This current status does not exclude earlier transient load.
- Estimated live rows: user_favorites 12, recipes 188. The user_id index, unique (user_id, recipe_id) index, recipe_id index and recipes primary-key index exist. No missing-index evidence was found for this reader.
- The actual API GET uses the shared server service-role client and filters by its verified caller. Hosted service_role has BYPASSRLS. These GET observations therefore do not justify changing ownership policies.
- The diagnostic RPC is STABLE, SECURITY INVOKER, with an empty search_path; anon/authenticated cannot execute it and service_role can. Default reads remain REST.

PostgreSQL pg_stat_statements contains the following service-role PostgREST statement groups at inspection:

| Group | Calls | Mean execution | Maximum execution |
| --- | ---: | ---: | ---: |
| REST with full recipe projection, main group | 435 | 0.369 ms | 12.270 ms |
| REST with full recipe projection, alternate group | 3 | 20.751 ms | 58.845 ms |
| Diagnostic RPC wrapper | 53 | 1.982 ms | 30.059 ms |

These are accumulated statement groups, not per-request SQL traces or a controlled REST/RPC SQL comparison. They must not be paired directly with the phone's HTTP samples. Planning tracking is OFF: zero planning statistics mean unmeasured, not zero planning cost. Do not reset statistics or enable planning tracking as part of a read-only investigation.

A service-role, SELECT-only EXPLAIN ANALYZE of the existing RPC for the largest Favorites owner (selected inside SQL, ID not exported) returned five rows, 7.310 ms planning and 45.941 ms execution. It included selecting that owner and first execution in this diagnostic connection. Shared block reads/writes were zero. This checks current execution only and cannot reproduce the earlier cold upstream state or the exact generated REST statement.

## Gateway evidence and limits

Query window: 2026-10-13 11:50–12:25 UTC (19:50–20:25 Hong Kong). Eighteen gateway GET records were available in the result. Their REST/RPC ordering and durations are consistent with the first eighteen comparison samples. There is no request identifier in the export, so this is sequence/duration correlation, not an exact request-ID join.

| UTC time | Path | Gateway origin_time | Envoy upstream service time | Attempts |
| --- | --- | ---: | ---: | ---: |
| 12:20:42.275 | REST | 4,296 ms | 4,195 ms | 1 |
| 12:20:46.952 | RPC | 265 ms | 187 ms | 1 |
| 12:20:47.572 | RPC | 189 ms | 124 ms | 1 |
| 12:20:48.117 | REST | 918 ms | 908 ms | 1 |

All eighteen observed gateway responses were 200 with attempt count 1. This places the large wait predominantly inside the upstream service boundary; the initial Vercel-to-Supabase dispatch is too small to explain it. The gateway spans are nested in the API REST wait and must not be added to it. They do not isolate SQL, PostgREST queuing, connection acquisition or planning.

PostgREST/Postgres log-source discovery found two events each in the 12:19–12:22 UTC window, but a subsequent safe event-classification query returned a backend error. No usable per-request pool/planning duration was obtained. No absence-of-timeout or no-queueing conclusion is claimed.

## Next bounded step

1. Keep default reads and database configuration unchanged. Preserve the current navigation-v2 build so a later four-step phone run can separately locate page-token, headers, body and publication/readiness time. No repeat of the five-minute benchmark is necessary merely to recover navigation data.
2. For the upstream issue, obtain request-level PostgREST/pool/planning observations before choosing a configuration change. The available gateway and accumulated SQL statistics cannot identify a unique cause. Any temporary logging/statistics configuration change needs its own bounded proposal, rollback and approval.
3. If evaluating RPC as a mitigation, compare independent first/idle runs with REST-first and RPC-first order, preserving authentication, projection, payload equivalence and failure behavior. Current consecutive data alone cannot establish a first-entry fix; do not silently switch default reads.

PostgreSQL statistic semantics: https://www.postgresql.org/docs/17/pgstatstatements.html

## Follow-up: log classification and passive upstream capture

The earlier classification query used the wrong message column. A follow-up using `event_message` succeeded for the same 12:19–12:22 UTC window: 55 PgBouncer events, two PostgreSQL events and two PostgREST events. No matching PGRST003/acquisition, statement-timeout or too-many-connections text was found in that limited window. This is a text check on available logs, not proof that connection acquisition was instantaneous or that logging covers every timeout.

The two PostgREST messages at 12:20:22.751 and 12:21:54.156 UTC are both `Warp server error: Thread killed by timeout manager`. They lack a request ID and do not establish that the successful first REST request timed out. PostgREST's own issue #4799 documents this message occurring under normal operation; it must not be presented as proof of pool saturation or as harmless in every situation.

Read-only configuration observations: pg_stat_statements.track_planning OFF; log_min_duration_statement and log_min_duration_sample both -1; track_io_timing OFF; current diagnostic session statement_timeout 120,000 ms; max_connections 60. The authenticator role has an 8-second statement timeout. These session/role values are different scopes and do not establish the effective timeout of a specific historical request. No role-level PostgREST pool/plan configuration was found in the allowlisted settings inspected; environment/pre-config values remain unknown. No configuration was changed or reloaded.

The draft implementation now passively reads the existing upstream `Server-Timing` response header inside diagnostic Favorites reads. It forwards only finite durations for `jwt`, `parse`, `plan`, `transaction` and `response`, prefixed `pgrst_` to distinguish them from the app's own stages. No new request, Accept/Prefer header, plan endpoint, pool, auth or SQL change is introduced. The original Response, credentials, signal and body-read behavior are preserved.

- `rest.postgrest_timing_count` counts responses with at least one valid upstream timing field. Zero means no valid field was observed; it cannot distinguish disabled timing, a gateway stripping it or malformed/missing headers. Legacy exports without this field have unknown coverage.
- Each `pgrst_*` duration remains optional. Partial upstream headers provide partial coverage, not zero-duration missing stages. Raw headers/descriptions and arbitrary names are never exported.
- PostgREST `plan` is its use of the schema cache to generate the main SQL query; it is not PostgreSQL planner time. `transaction` is the database transaction span, not a separately proven SQL execution or queueing duration. The spans are nested inside REST wait and must not be added to it.
- Upstream Server-Timing must already be supplied by the hosted service. This patch does not enable it. Hosted header availability has not been verified; if absent, further progress requires provider-side metrics or a separately reviewed temporary configuration experiment. A collector alone does not establish the root cause or improve latency.

Validation includes a real local HTTP GET through the installed Supabase SDK, API header forwarding and benchmark/navigation parsing, plus absent/invalid headers, coverage sanitization, concurrent request ownership and unchanged ordinary request behavior. No hosted latency improvement is claimed.

Primary references:

- https://github.com/PostgREST/postgrest/issues/4799
- https://docs.postgrest.org/en/v12/references/observability.html

## Hosted timing availability confirmed; temporary override restored

A direct anonymous, publishable-key REST probe selected IDs with limit=0. It returned HTTP 200 and an empty array, but no Server-Timing header. No personal Favorites, credentials, IDs or response payloads were exported. This probe establishes missing timing on that path, not every authenticated path.

After checking current PostgREST configuration documentation and confirming neither role-wide nor database-specific authenticator timing overrides existed, a short diagnostic enabled only `pgrst.server_timing_enabled=true` on authenticator and notified PostgREST to reload configuration. No SQL plan endpoint, query logging, pool setting, authentication setting, schema or data change was introduced.

Two empty-result GET probes were attempted:

| Probe | Result | Upstream timing |
| --- | --- | --- |
| ID-only, limit=0 | Client transport URLError after approximately 8 seconds; no HTTP response observed | Unknown; this is not evidence of SQL/pool timeout |
| Nested recipe projection, synthetic empty owner, limit=0 | HTTP 200, empty array | jwt 1.2 ms; parse 35.6 ms; plan 10.1 ms; transaction 115.0 ms; response 1.4 ms |

The successful join probe proves that this hosted deployment can emit the supported header and that the existing passive collector can consume its documented numeric format. It does not reproduce the earlier caller's full Favorites read or prove the earlier four-second wait was planning/transaction time. Its approximately 2,584 ms client total includes an independently established HTTP connection and must not be compared as a navigation improvement or decomposed by simply subtracting upstream stage totals.

Immediately after these probes, the temporary role override was RESET, PostgREST was notified again, and catalog checks confirmed both role-wide and database-specific overrides absent, matching preflight. The existing published navigation build still works, but upstream fields may be missing again now that the override has been removed. No configuration change was left enabled.

### Ready protocol for the next actual Favorites trace

Use one short, coordinated capture window rather than another uninstrumented five-minute run:

1. Confirm the intended preview is PR #88's current tested code and the diagnostic is enabled there. Recheck only the timing override's exact role/database scopes; stop if they differ from the recorded absent baseline.
2. Temporarily enable the documented timing flag with the same guarded change below. This affects timing headers on project REST responses during the window; it does not change query plans or data. Do not leave it enabled unattended.
3. Capture the actual four-step navigation-v2 trace or the existing explicit comparison read while the window is open. Require `postgrest_timing_count` greater than zero and preserve the individual optional pgrst fields. The actual owner/full recipe payload matters; a limit=0 probe cannot stand in for it.
4. Restore the prior setting immediately, even on timeout, cancellation, hidden page or failed export. Recheck the role and database scopes and report the restoration. Do not re-enable indefinitely to wait for a user who is unavailable.
5. Interpret PostgREST plan as SQL generation from schema metadata, transaction as a broader DB transaction span, and absent stages as unknown. Pool queuing is still not separately proven by the five timing stages; consult provider pool metrics if the long residual persists.

Guarded temporary enable (only valid for the currently verified absent baseline):

```sql
BEGIN;
DO $diagnostic$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles r
    CROSS JOIN LATERAL unnest(r.rolconfig) AS c(setting)
    WHERE r.rolname = 'authenticator'
      AND split_part(c.setting, '=', 1) = 'pgrst.server_timing_enabled'
  ) OR EXISTS (
    SELECT 1 FROM pg_db_role_setting s JOIN pg_roles r ON r.oid = s.setrole
    CROSS JOIN LATERAL unnest(s.setconfig) AS c(setting)
    WHERE r.rolname = 'authenticator'
      AND split_part(c.setting, '=', 1) = 'pgrst.server_timing_enabled'
  ) THEN
    RAISE EXCEPTION 'Timing setting differs from absent baseline; stop';
  END IF;
  EXECUTE 'ALTER ROLE authenticator SET pgrst.server_timing_enabled = ''true''';
END $diagnostic$;
NOTIFY pgrst, 'reload config';
COMMIT;
```

Restore only this task's unchanged temporary value; an externally changed value needs inspection rather than being overwritten:

```sql
BEGIN;
DO $diagnostic$
BEGIN
  IF (SELECT c.setting FROM pg_roles r
      CROSS JOIN LATERAL unnest(r.rolconfig) AS c(setting)
      WHERE r.rolname = 'authenticator'
        AND split_part(c.setting, '=', 1) = 'pgrst.server_timing_enabled')
      IS DISTINCT FROM 'pgrst.server_timing_enabled=true' THEN
    RAISE EXCEPTION 'Timing setting changed externally; stop automatic reset';
  END IF;
  EXECUTE 'ALTER ROLE authenticator RESET pgrst.server_timing_enabled';
END $diagnostic$;
NOTIFY pgrst, 'reload config';
COMMIT;
```

The enable/probe/reset sequence was executed and verified against the hosted project. This is a temporary runtime diagnostic, not a schema migration to reapply on deployment. Keep keys out of scripts, repository content, command output and exports. Do not reset pg_stat_statements or change its tracking as part of this protocol.

Configuration reference: https://docs.postgrest.org/en/v13/references/configuration.html#server-timing-enabled

## Actual navigation-v2 capture: first Favorites wait located

`PrepMeal_Navigation_phone(1).json` is complete, four ready steps, schema navigation-v2, selected mode phone, viewport 605×671 and build 1c59235d9614c637e92a625a9a4a9c23db625c70. Mode is user-selected; viewport does not certify hardware. This build has the same application code as tested ee59bce; its later commit changed only this report. The coordinated hosted timing flag was restored immediately after receipt, both override scopes were verified absent, and its one-time backup restoration automation was disabled after successful manual restoration.

| Step | Route complete | Data ready |
| --- | ---: | ---: |
| First Favorites | 1,052 ms | 2,004 ms |
| Recipes | 553 ms | 584 ms |
| Return Favorites | 3 ms | 5 ms |
| Home recipe list | 17 ms | 37 ms |

The first Favorites full-recipe read began 77 ms before the click. It took 2,078 ms to fetch response headers, arriving 2,001 ms after the click. Body download/parsing took 1 ms; loaded-store publication was at 2,002 ms; the readiness marker followed 2 ms later. Intent token callbacks took 1/0 ms; the page token callback at 1,055 ms took 0 ms. Page configuration at 1,058 ms reused the existing pending read; only one actual read operation was recorded. Route completion overlaps this request: the 952 ms from route completion to data readiness is not an additional request or an exclusive independent work span.

The same response supplies:

| Nested measurement | Duration |
| --- | ---: |
| App handler | 1,128.96 ms |
| App auth (JWKS subspan 386.40 ms) | 386.53 ms |
| App DB request | 741.93 ms |
| Native REST sent-to-headers | 726.58 ms |
| PostgREST JWT | 15.4 ms |
| PostgREST URL grammar parse | 293.1 ms |
| PostgREST SQL generation (plan) | 19.4 ms |
| PostgREST transaction | 285.9 ms |
| PostgREST response construction | 0 ms |

Upstream timing coverage count is 1. These parent/child spans overlap and must not be summed across layers. The browser load-to-headers minus handler residual is 949.04 ms, containing transport, edge/function admission/framework and scheduling contributions; this trace does not isolate pure network latency. PostgREST parse and transaction are both material, while its plan stage is relatively small in this sample. Transaction is not a separately measured SQL execution/connection-acquisition duration.

Return Favorites uses a fresh cache and no new read operation after its click is recorded. Its trace includes the earlier first-entry GET in the five-second contextual lookback: all that read's offsets are negative. The reported 2,005 ms publication-to-return-readiness interval is elapsed context between pages, not evidence of a two-second React render on return. Return data readiness itself is 5 ms.

This locates the critical first-entry data wait at the pending API response, with negligible token/body/publication-to-readiness delay in this run. Route startup still took 1,052 ms and can be investigated separately, but it is not necessary to add that route duration to the overlapping GET. This is one run, not proof of a speed regression/improvement relative to the earlier different-build 1,451 ms result.

The next focused experiment is a short instrumented REST/RPC comparison to test whether RPC reduces the measured URL-parse span, while retaining verified-caller filtering and identical projection/payload checks. The existing comparison collector already retains these pgrst fields; no additional recorder is needed. Authentication/JWKS first-use and the outside-handler residual remain separate costs that switching query format cannot be assumed to fix. Do not change default reads or add indexes based solely on this single capture.

### RPC comparison readiness verified

A fresh SELECT-only hosted check under service_role compared the REST-equivalent full recipe projection with the existing RPC across all three current Favorites owners / twelve rows: zero mismatched owner scopes. Null and synthetic-empty-owner RPC inputs both returned zero rows. Actual owner IDs and payloads were kept inside SQL; only aggregate counts were returned. This confirms current SQL data equivalence, not PostgREST HTTP parse performance.

Fresh function metadata still shows SECURITY INVOKER/STABLE/empty search_path, service_role EXECUTE allowed, anon/authenticated EXECUTE denied. Thirty targeted API/comparison/projection/transport tests passed (four files). No application change, migration, configuration override or deployment was needed for this readiness check.

The existing browser comparison uses the same verified-caller API, shared reader, selected recipe fields and in-memory response-equivalence checks. It records six balanced alternating blocks and already exports optional pgrst timings. A short coordinated run with upstream timing temporarily enabled can now compare the parse/plan/transaction stages directly, separately from total latency and authentication. No five-minute idle protocol or new recorder is required.

An authenticated HTTP comparison cannot be replaced by the SQL check or an anonymous empty probe. This runtime has neither an authenticated browser session nor a service-role HTTP credential; do not request credentials from the user, bypass the verified-caller endpoint, grant client access to the RPC, or manufacture a token. Use the user's existing signed-in browser when they are ready. Until such a run arrives, a reduction of the measured 293.1 ms parse span remains an unverified hypothesis; default reads remain REST and the upstream timing override remains absent.
