# First Favorites entry trace

The supplied phone navigation-v1 run reports route completion at 651 ms and settled Favorites data at 1,451 ms. Data readiness follows route completion by 800 ms. These are timeline boundaries, not exclusive work durations: requests can overlap route loading. The desktop screenshot reports 603.1 ms to data readiness but has no route or request breakdown. Neither result identifies the cause of the first-entry delay.

`AuthContext.getAccessToken()` returns the current in-memory session token. It does not issue another authentication request. Initial session hydration and server authentication are separate work; this observation does not establish their duration.

The explicit navigation measurement now exports `prepmeal-navigation-measurement-v2`. Favorites samples include `favorites_trace`:

| Field | Meaning |
| --- | --- |
| `page_token`, `intent_token` | Awaiting the existing token callback on page mount or navigation intent |
| `cache` | Existing full-recipe or ID cache decision; fresh versus stale/missing |
| `read` | An actual existing Favorites GET, not an extra diagnostic request |
| `load_to_headers_ms` | Read initiation through fetch response headers; includes network/server and browser scheduling |
| `body_download_parse_ms` | Headers through `response.json()` completion; includes body transfer, parsing and scheduling |
| `published_offset_ms` | Loaded data published to the shared store, relative to click |
| `publish_to_data_ready_ms` | Publication through the page's settled-state readiness marker; includes React scheduling, not paint |
| `auth_ms`, `db_request_ms`, `handler_ms` | Allowlisted numeric Server-Timing fields from that GET; nested within the browser read duration |

Available server headers also retain numeric `auth_jwks_ms`, `auth_get_user_ms`, `response_prepare_ms` and the fixed REST dispatch/header/body/SDK stages. Absent headers remain absent; these subspans also overlap parent durations.

Enable the existing navigation measurement before entering Favorites. It adds the existing diagnostic GET header while the measurement is enabled, preserves authentication and cancellation, and changes no write requests. It adds no fetch, timer, token callback, cache invalidation or network subscription. Ordinary use retains the existing request options.

The trace only observes operations started after measurement was enabled. It includes completed operations within five seconds before each Favorites click, and earlier operations still pending. Negative offsets mean intent/prefetch work started before the click. Operations in that lookback are contextual and may not be the page's own read. An absent read may mean a fresh cache, an already-running request predating instrumentation, or unavailable coverage. A pending read, unsuccessful response or missing publication must not be interpreted as successful data loading. Spans can overlap and must not be added together; subtracting handler time from browser wait does not isolate network time.

Runs are memory-only, capped at 100 operations and 100 cache decisions, and discarded when measurement ends or its authentication scope changes. Late handles from a retired run cannot write into a new run. Only fixed labels, numeric durations/status and cache state are exported: no token, account ID, URL, response body or raw header.

Existing v1 exports cannot be expanded retroactively. A future v2 run on the same preview/build can distinguish token wait, response-header wait, body handling and publication-to-readiness wait. Device mode is selected by the user; no automated test here measures actual phone or desktop speed.
