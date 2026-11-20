# Admin import preview count validation

Base: c3e44476d6efc1782e7cca7106a30340795251a1. Related backlog: #138 (partial scope only).

The modal previously offered confirmation for 201 or more recipes even though the API rejects every batch above MAX_RECIPES (currently 200) before any lookup or RPC. Preview now uses the same pure parseImportEnvelope validator as the API. The example's format/version also come from that shared contract.

Regression evidence: the new oversized-batch UI test failed on the old code because a confirmation button was offered. It passes after the change. Five runtime cases cover over-limit rejection without fetch, correcting the payload, preserving all 200 entries in an accepted outbound request, unknown format/version and empty arrays. The existing 76 import resolver/API tests passed. TypeScript, scoped ESLint and whitespace checks passed. Code review confirmed the imported helper has no server/environment dependencies; API authorization, RPC dispatch, quantity rules, concurrency and count limits are unchanged.

Validation is local and mocked. No real admin import, database mutation or hosted admin session was used. The admin feature remains disabled as configured. CI/build validation of the published commit is recorded on the PR.

This does not resolve #138's missing metadata, v2 migration or full-catalogue round trip. The existing explicit export refusal above 200 remains in place. Those require separate implementation and database review.
