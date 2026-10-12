# Favorites: locating time outside the API handler

## Finding so far

The completed 24-request phone comparison had almost identical GET-to-headers medians (REST 407.5ms, RPC 407ms), despite backend query medians of 26.9ms and 21.035ms. Excluding the first block, paired GET-minus-handler medians were 303.865ms and 373.305ms. The current exports cannot separate browser preparation, network/platform wait and browser delivery/scheduling. They are not evidence that SQL is responsible for that interval.

A separate unauthenticated cloud probe traversed cle1 and syd1 with a handler around 0.02–0.03ms. Its location, connection lifecycle and proxy path differ from the phone; do not use its elapsed times as a phone latency estimate or identify the phone's ingress region from them.

This change adds diagnostics only to the existing 22-read and 24-read runners. It changes no API requests, auth, SQL, cache settings or RPC enablement. Normal favorites reads are untouched.

## New client object

Exports use prepmeal-favorites-benchmark-v3 and prepmeal-favorites-comparison-v2. Each sample adds a fixed client object with version 1 and a coverage label: matched, missing, ambiguous or invalid. Missing measurements are omitted, not set to zero.

A request-scoped PerformanceObserver captures resource entries without clearing or resizing the application's global buffer. After the body has been read, queued observer entries are drained synchronously; a read-only buffer lookup is the fallback. The observer is disconnected on completion, failure, cancellation and timeout.

An entry must match the exact in-memory URL, fetch initiator and current request start window uniquely. Ambiguous concurrent same-URL entries are not guessed. Entry URLs are never exported. API protocol, request count/order, headers and payload checks are unchanged; durations are fixed before diagnostic collection.

| Field | Boundaries / interpretation |
|---|---|
| pre_request_ms | Resource start to requestStart; includes browser preparation and connection work |
| dns_ms | domainLookupStart to domainLookupEnd, only when valid within this request |
| connect_ms | connectStart to connectEnd; may include TLS |
| tls_ms | secureConnectionStart to connectEnd, only when observed and valid |
| wait_response_ms | requestStart to finalResponseHeadersStart when available, otherwise responseStart |
| receive_ms | Same response boundary to responseEnd |
| fetch_resume_gap_ms | Response boundary to JavaScript's fetch-promise continuation |
| body_resume_gap_ms | responseEnd to completion of the runner's JSON body read |
| boundary | final_headers_start or first_byte; the latter may be an interim response boundary |
| protocol | Only h2, h3 or http/1.1 |
| routing_regions | Only whole region-code segments from x-vercel-id; opaque IDs discarded |

These intervals overlap. Do not sum pre_request, DNS, connect and TLS; do not treat resume gaps as pure CPU/main-thread time. Zero connection duration does not establish a new or reused connection; absent TLS information remains unknown. Resource timestamp precision varies by browser.

No URL, arbitrary response headers, Vercel opaque ID, body sizes, token, account or recipe content is added to exports. Routing regions describe the actual request's Vercel path, not a guessed user location.

## How the next result narrows the cause

- High pre_request_ms: investigate browser-side preparation/connection work, then inspect valid DNS/connect/TLS child measurements.
- High fetch_resume_gap_ms or body_resume_gap_ms: browser delivery/processing/scheduling merits attention; these are mixed intervals, not pure JavaScript CPU measurements.
- Low preparation/resume gaps but high wait_response_ms compared with handler: remaining time is in request/response transit and platform/framework handling; routing regions help identify which path was traversed.
- None of those fields alone separates network transit from platform admission/queueing. Further server/edge correlation would still be needed before a region or hosting change.

The original one-second upstream wait after idle remains a separate issue. This enhancement does not claim RPC fixes it.

## Validation and limits

Unit tests cover boundaries, whitelist/privacy, final-header fallback, stale/unrelated/ambiguous entries, invalid/restricted timestamps, unobserved TLS/protocol values, full-buffer observer capture, fallback and cleanup. Existing runner/page tests cover unchanged request counts and safe export/schema, timeout, retirement and cancellation.

Real Safari coverage and diagnosis require a phone export after review/deployment. A local Playwright Chromium run was attempted but the browser binary is unavailable; no real browser validation is claimed. No user browser/session or credentials were accessed.

## References

Resource Timing specification: https://www.w3.org/TR/resource-timing/
Vercel routing-header definition: https://vercel.com/docs/headers/response-headers#x-vercel-id
