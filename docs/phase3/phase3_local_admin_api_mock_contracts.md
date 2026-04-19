# Phase 3 Local Admin API Mock Contracts

## Purpose
- Provide a minimal local backend shape for the Phase 3 admin console and Edge popup.
- Keep the first slice mock-data based while removing hardcoded frontend-only payload definitions.
- Preserve the documented Phase 3 boundary: platform-first, plugin-lightweight, runtime AI advisory only.

## Endpoints

### `GET /health`
- Returns a lightweight health payload for local process checks.

Example response:
```json
{
  "status": "UP"
}
```

### `GET /api/phase3/admin-console`
- Returns the aggregated Phase 3 shell snapshot used by `ui/admin-console`.
- Current payload sections:
  - `summary`
  - `navigation`
  - `stats`
  - `projects`
  - `cases`
  - `workQueue`
  - `reports`
  - `modelConfig`
  - `environmentConfig`
  - `timeline`
  - `constraints`
  - `caseTags`

### `GET /api/phase3/extension-popup`
- Returns the lightweight popup snapshot used by `extension/edge-extension`.
- Current payload sections:
  - `status`
  - `summary`
  - `page`
  - `runtime`
  - `hints`

### `POST /api/phase3/scheduler/requests`
- Appends a normalized run-request entry to `config/phase3/scheduler-requests.json` or an alternate file passed to `local-admin-api`.
- Intended as the first writable local scheduler boundary for Phase 3 shell actions.
- Required request field:
  - `runId`
- Optional request fields:
  - `projectKey`
  - `owner`
  - `environment`
  - `title`
  - `detail`
  - `status`
  - `schedulerId`
  - `position`
  - `requestedAt`
- Missing optional fields are normalized with local defaults, and `requestedAt` defaults to the current server clock.

### `POST /api/phase3/scheduler/events`
- Appends a normalized scheduler event entry to `config/phase3/scheduler-events.json` or an alternate file passed to `local-admin-api`.
- Required request field:
  - `runId`
- Optional request fields:
  - `projectKey`
  - `owner`
  - `environment`
  - `title`
  - `detail`
  - `type`
  - `state`
  - `status`
  - `schedulerId`
  - `position`
  - `total`
  - `failed`
  - `artifacts`
  - `at`
- If no `type`, `state`, or `status` is supplied, the API stores an `INFO` event by default.

### `POST /api/phase3/config/model`
- Upserts one model configuration item in `config/phase3/model-config.json` or an alternate file passed to `local-admin-api`.
- Required request fields:
  - `label`
  - `value`
- If `label` already exists, the API replaces that item in place; otherwise it appends a new item.

### `POST /api/phase3/config/environment`
- Upserts one environment configuration item in `config/phase3/environment-config.json` or an alternate file passed to `local-admin-api`.
- Required request fields:
  - `label`
  - `value`
- If `label` already exists, the API replaces that item in place; otherwise it appends a new item.

### `POST /api/phase3/catalog/project`
- Upserts one project catalog row in `config/phase3/project-catalog.json` or an alternate file passed to `local-admin-api`.
- Required request fields:
  - `key`
  - `name`
  - `scope`
- Optional request fields:
  - `environments`
  - `note`
- `environments` may be sent as a JSON array or a comma-separated string.
- If `key` already exists, the API replaces that project row in place; otherwise it appends a new row.
- Existing `cases` entries are preserved during project-row writes.

### `POST /api/phase3/catalog/case`
- Upserts one case catalog row in `config/phase3/project-catalog.json` or an alternate file passed to `local-admin-api`.
- Required request fields:
  - `id`
  - `projectKey`
  - `name`
- Optional request fields:
  - `tags`
  - `status`
  - `updatedAt`
  - `archived`
- `tags` may be sent as a JSON array or a comma-separated string.
- If `updatedAt` is omitted, the API stores the current server clock timestamp.
- If `id` already exists, the API replaces that case row in place; otherwise it appends a new row.
- Existing `projects` entries are preserved during case-row writes.

## Implementation Notes
- Server implementation is intentionally framework-light and uses JDK `HttpServer`.
- CORS is enabled for local web UI and extension access.
- Payloads are currently assembled by `Phase3MockDataService`.
- Writable scheduler mutations are handled by `SchedulerPersistenceService`.
- `projects` and `caseTags` now prefer a local catalog snapshot at `config/phase3/project-catalog.json`.
- `reports` now prefer live local reads from `runs/*/report.json` and derive status/entry summaries from the existing report output.
- `workQueue`, `reports`, `stats`, `timeline`, and popup runtime state now first derive scheduler-owned queue/execution state from:
  - `config/phase3/scheduler-requests.json`
  - `config/phase3/scheduler-events.json`
- New scheduler request and event writes are immediately visible through the existing GET snapshots because the read path already prefers these derived files.
- If the derived scheduler service files are absent, the API falls back to the older unified scheduler snapshot at `config/phase3/scheduler-state.json`.
- If neither derived scheduler files nor the scheduler snapshot are present, `workQueue` falls back to `config/phase3/execution-queue.json`.
- If neither derived scheduler files nor the scheduler snapshot are present, `reports`, `stats`, `timeline`, and popup runtime state still merge optional execution history rows from `config/phase3/execution-history.json`, which lets the shell show running/cancelled queue-adjacent state before a final `report.json` exists.
- `modelConfig` now prefers `config/phase3/model-config.json`.
- `environmentConfig` now prefers `config/phase3/environment-config.json`.
- If any local source is missing, the API returns a lightweight empty-state row or fallback tag set instead of failing the whole snapshot.
- Frontend clients may fall back to embedded snapshots when the local API is offline.
- `ui/admin-console` now uses these writable endpoints for:
  - operator-queued execution requests from the Execution panel
  - operator review/audit events from the Recent Activity panel
  - editable model configuration cards via `POST /api/phase3/config/model`
  - editable environment configuration cards via `POST /api/phase3/config/environment`
  - editable project catalog rows via `POST /api/phase3/catalog/project`
  - editable case catalog rows via `POST /api/phase3/catalog/case`
- `extension/edge-extension` now uses the same writable endpoints for:
  - popup-queued execution requests from the Quick Launch panel
  - popup review/audit events from the Audit Review panel
  - immediate popup snapshot refresh after successful writes so queue/runtime hints reflect persisted scheduler state
  - a native-host bridge that proxies popup reads/writes to the local admin API instead of calling `http://127.0.0.1:8787` directly
  - install helpers at `scripts/install-native-host.ps1` and `install-native-host.bat` to generate the local runtime wrapper, host manifest, and Edge registry registration for a chosen unpacked extension ID

## Current Boundaries
- Scheduler request/event persistence is still file-backed append-only JSON, not a live long-running scheduler/executor process or durable database.
- Projects, case rows, and case tags are file-backed by a local catalog snapshot, and project/case rows can now be edited through file-backed upserts, but deep project detail plus delete/reorder flows are still shell-level placeholders.
- Scheduler state can now be derived from local scheduler request and event files, and those files can be appended through the local API, but reconciliation, deduplication, and command validation are still minimal.
- Legacy queue and execution-history snapshots remain as fallback compatibility inputs.
- Model and environment configuration cards can now be edited through file-backed item upserts, but validation, access control, and richer config schemas are still not implemented.
- The popup now prefers native-host transport and still falls back to embedded shell data when the background bridge, host registration, or local admin API is unavailable.
- Native-host developer setup is now scriptable for Windows/Edge, but it still depends on a local JRE plus the current unpacked extension ID and uses a cmd-wrapper compatibility policy for Java launch.
- The current native-host slice is still a thin proxy over `local-admin-api`, not a standalone runtime bridge into the Java execution core.

## Recommended Next Step
- Deepen native-host setup with origin validation and a packaged launcher, or return to case management with delete/archive filters and project-aware pickers.
