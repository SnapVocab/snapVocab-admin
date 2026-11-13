# Shared mission outlook vectors

`mission-outlook-vectors.json` is copied unchanged from
`snap-vocab-backend/src/test/resources/mission/outlook-vectors.json`, backend commit
`814b063e9b2a29fed2a6f58fe912237aa5b79b30` (the production backend checkout on Oracle).

The frontend tests use this snapshot so a fresh clone and Docker build do not require a sibling backend repository. Set `MISSION_OUTLOOK_VECTORS_PATH` to an upstream file to validate a coordinated backend change. Refresh the snapshot only alongside a deliberate update to the shared backend contract.
