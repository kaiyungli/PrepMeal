# Favorites first/idle wait: read-only investigation (2026-10-13)

## Finding

The latest phone exports show a multi-second wait after the server sends its Supabase REST request. A matching-order gateway sequence places a similar duration inside Supabase's gateway/upstream boundary. Existing indexes and PostgreSQL execution statistics do not support adding indexes or treating the entire REST wait as SQL execution time. Exact separation of PostgREST connection acquisition, request planning, schema metadata, PostgreSQL execution and upstream transport remains unavailable.

No application behavior, database data, schema, RLS, connection configuration, statistics setting or production deployment was changed during this investigation. All database statements were SELECT/catalog reads or a SELECT-only EXPLAIN in a READ ONLY transaction rolled back afterward. The report contains no account IDs, request URLs, credentials, recipe data or raw SQL/log messages from users.

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
