# Monitor Interface Specification

## 1. Scope and Design Basis

- Screen: `monitor`
- UI implementation:
  - `ui/admin-console/src/screens/MonitorScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/react_page_skeleton_prompt_guide.md`
  - `docs/phase3/main/edge_extension_native_messaging_protocol_detailed_design.md`

This document distinguishes:

- current implemented read context
- missing run-specific runtime interfaces
- visible control actions requiring concrete interface design
- route-state gaps between `execution` and `monitor`

## 2. Interface Summary

Current `monitor` screen conclusion:

- current direct read sources:
  - `GET /api/phase3/admin-console` (snapshot context)
  - `GET /api/phase3/runs/{runId}/status` (run status, progress, counters, control state)
  - `GET /api/phase3/runs/{runId}/steps` (step timeline)
  - `GET /api/phase3/runs/{runId}/runtime-log` (AI decision and runtime event log)
  - `GET /api/phase3/runs/{runId}/live-page` (current page context)
- current direct write sources:
  - `POST /api/phase3/runs/{runId}/pause` (pause control)
  - `POST /api/phase3/runs/{runId}/abort` (abort control)
- run context source:
  - `selectedRunId` from App-level `openMonitor(runId)` handoff

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for Monitor Screen

The `monitor` screen currently uses the shared admin-console snapshot only as a shallow fallback context source.

Relevant snapshot fields currently touched by the screen:

- `projects[]`
- `reports[]`
- `workQueue[]`
- `timeline[]`

### 3.2 Functional Role by Field

- `projects[]`
  - provides fallback active project scope/title context
- `reports[]`
  - provides fallback report entry text
- `workQueue[]`
  - now mainly provides fallback queue-detail text when run-local monitor status does not expose queue context
- `timeline[]`
  - provides last-event footer summary

### 3.3 Current Limitation

This snapshot is not sufficient for true monitor behavior because it does not provide:

- monitored `runId`
- current step detail
- runtime screenshot or page summary
- per-step timeline entries
- runtime AI decision stream
- pause/abort capability state
- stable run-local queue context unless the dedicated runtime read model exposes it

## 4. API-Driven Runtime Data Model

The monitor screen fetches all runtime data from dedicated APIs when `selectedRunId` is provided:

- `runStatus` from `GET /api/phase3/runs/{runId}/status`
- `steps` from `GET /api/phase3/runs/{runId}/steps`
- `runtimeLog` from `GET /api/phase3/runs/{runId}/runtime-log`
- `livePage` from `GET /api/phase3/runs/{runId}/live-page`

All 4 APIs are called in parallel via `Promise.all` on mount and after control actions.

When `selectedRunId` is null (e.g., direct sidebar navigation), the screen shows an idle state with no API calls.

## 5. UI Control to Interface Mapping

### 5.1 Hero Controls

#### `Pause`

- user action: click
- request: `POST /api/phase3/runs/{runId}/pause` via `onPauseRun` callback
- owner: `App.tsx` (callback) + `MonitorScreen.tsx` (UI state)
- current state: implemented — disabled when `control.canPause` is false, shows pending/success/error feedback, refreshes runtime data on success

#### `Abort`

- user action: click
- request: `POST /api/phase3/runs/{runId}/abort` via `onAbortRun` callback
- owner: `App.tsx` (callback) + `MonitorScreen.tsx` (UI state)
- current state: implemented — disabled when `control.canAbort` is false, shows pending/success/error feedback, refreshes runtime data on success

### 5.2 Steps Timeline

#### Step row

- user action: click
- request: none today
- current behavior:
  - opens a local step-detail panel inside `MonitorScreen`
  - reuses the existing `GET /api/phase3/runs/{runId}/steps` payload only
- current state: implemented

### 5.3 AI Runtime Log

#### Runtime log row

- user action: click
- request: none today
- current behavior:
  - opens a local runtime-log detail panel inside `MonitorScreen`
  - reuses the existing `GET /api/phase3/runs/{runId}/runtime-log` payload only
- current state: implemented

### 5.4 Live Page Panel

#### Live page viewport

- user action: inspect only today
- request: none today
- current behavior:
  - reads the existing `GET /api/phase3/runs/{runId}/live-page` payload only
  - shows explicit unavailable copy when the backend returns the `UNAVAILABLE` shell
  - when `status === "AVAILABLE"` and `screenshotPath` is present, resolves the image through the existing run artifact-content read path
- current state: implemented

## 6. Relationship to Other Interfaces

### 6.1 Relationship to Execution

- `execution` is the current upstream entry into `monitor`
- current routing uses `openMonitor(launchForm.runId)`:
  - sets `selectedMonitorRunId` to the canonical run identifier
  - switches active screen to `monitor`
- `monitor` receives `selectedRunId` as a prop and fetches runtime APIs for that run
- sidebar navigation to `monitor` uses `handleScreenChange("monitor")` which sets `selectedMonitorRunId` to null (idle state)

### 6.2 Relationship to Scheduler Request/Event Interfaces

Although `monitor` does not call them directly today, its runtime data should be downstream of:

- `POST /api/phase3/scheduler/requests`
- `POST /api/phase3/scheduler/events`

These endpoints establish:

- run identity
- lifecycle transitions
- queue position
- basic status history

### 6.3 Relationship to Reports and Report Detail

`monitor` is a live-run page, while `reportDetail` is a post-run inspection page.

Recommended relationship:

- during live execution, `monitor` reads runtime-oriented status/detail interfaces
- after finish or abort, operator drill-down should move into:
  - `reports`
  - `reportDetail`
  - `dataDiff`

## 7. Implemented Monitor Interfaces

### 7.1 Run-Status Read Interface

#### `GET /api/phase3/runs/{runId}/status`

Purpose:

- load top-level live state for one run
- prefer run-local `report.json` for stronger status/progress/assertion metadata when that artifact exists
- prefer run-local `live-page.json` for `currentPage.url` / `currentPage.state` when that artifact exists
- prefer the latest artifact-backed timestamp (`report.json`, `live-page.json`, `runtime.log`) for `lastUpdatedAt` when available
- prefer artifact-backed `aiCalls` / `heals` counters from report summary or run-local `runtime.log` when those artifacts can provide them; otherwise fall back to scheduler-event counts
- when no strong run-local progress artifact exists, keep the current response shell but return conservative progress values instead of fabricating a default 8-step shape
- when those stronger artifacts are absent, prefer persisted scheduler request context (`pageUrl`, `runtimeMode`, `queueState`, `auditState`) over the older thin `targetUrl`-only fallback

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "sourceLayer": "RUN_ARTIFACTS",
  "projectKey": "checkout-web",
  "status": "RUNNING",
  "environment": "prod-like",
  "model": "claude-4.5-sonnet",
  "owner": "qa-platform",
  "queueState": "2 queued / 1 active / 1 waiting",
  "progress": {
    "currentStep": 5,
    "totalSteps": 8,
    "percent": 62,
    "elapsedMs": 108000,
    "estimatedTotalMs": 170000
  },
  "currentPage": {
    "url": "https://app.acme.example/checkout",
    "state": "checkout.form"
  },
  "counters": {
    "assertionsPassed": 3,
    "assertionsTotal": 5,
    "aiCalls": 12,
    "heals": 1
  },
  "control": {
    "canPause": true,
    "canAbort": true
  },
  "lastEventSummary": "Worker slot 4 is executing checkout smoke.",
  "lastUpdatedAt": "2026-04-20T05:32:10Z"
}
```

`queueState` is additive and optional. When present, `MonitorScreen` should prefer it for small queue-context footer copy; when absent, the screen may still fall back to the older parent `snapshot.workQueue[0].detail`.

`lastEventSummary` is also additive and optional. When present, `MonitorScreen` should prefer it for the footer `Last event` text; when absent, the screen may still fall back to the older parent `snapshot.timeline[0]` copy.

The top-level `sourceLayer` tells the front end which status layer currently owns the response:

- `RUN_ARTIFACTS`
- `SCHEDULER_FALLBACK`

### 7.2 Step-Timeline Read Interface

#### `GET /api/phase3/runs/{runId}/steps`

Purpose:

- load current and completed step timeline for the monitored run
- prefer run-local `report.json.steps[]` when the artifact exists; otherwise fall back only to scheduler step events that actually exist

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "availability": "AVAILABLE",
  "sourceLayer": "REPORT_ARTIFACT",
  "items": [
    {
      "index": 1,
      "label": "Open checkout page",
      "state": "DONE",
      "durationMs": 1200,
      "note": "artifacts/step-1.png"
    },
    {
      "index": 2,
      "label": "Click pay button",
      "state": "RUNNING",
      "durationMs": 0
    },
    {
      "index": 3,
      "label": "Submit payment",
      "state": "FAILED",
      "durationMs": 950,
      "note": "payment button not found"
    }
  ]
}
```

Step state semantics on the current contract:

- `DONE`: successful terminal step
- `RUNNING`: current in-progress step
- `FAILED`: failed/error terminal step from run-local report artifacts
- `SKIPPED`: skipped/cancelled/aborted non-success terminal step from run-local report artifacts
- `TODO`: not-started scheduler-backed step only when a real `STEP_TODO`-like event exists

When no run-local `report.json.steps[]` artifact is available, the endpoint keeps only scheduler-event-derived step rows. If scheduler data does not provide real `STEP_*` events, the backend now returns:

- `availability: "UNAVAILABLE"`
- `sourceLayer: "NONE"`
- `items: []`

This lets the front end distinguish a backend-owned empty timeline from a merely short timeline without changing the existing step-row structure. The top-level `sourceLayer` tells the front end which step-timeline layer currently owns the response:

- `REPORT_ARTIFACT`
- `SCHEDULER_EVENTS`
- `NONE`

### 7.3 Runtime-Log Read Interface

#### `GET /api/phase3/runs/{runId}/runtime-log`

Purpose:

- load AI decisions, heals, state recognition, and runtime notes for the run
- prefer run-local `runtime.log` entries when the artifact exists
- otherwise fall back to scheduler-event-derived runtime notes
- when neither source yields usable runtime-log rows, synthesize a small backend-owned shell from persisted scheduler request context (`pageUrl`, `pageTitle`, `runtimeMode`, `queueState`, `auditState`, `nextAction`, `locator`, `bodySummary`)

Query parameters:

- `cursor`
- `limit`

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "availability": "AVAILABLE",
  "items": [
    {
      "at": "2026-04-20T05:31:48Z",
      "type": "DECISION",
      "model": "",
      "summary": "DECISION Confirmed Pay button visible at candidate[0] (score 0.94).",
      "source": "runtime.log",
      "message": "2026-04-20T05:31:48Z DECISION Confirmed Pay button visible at candidate[0] (score 0.94).",
      "detail": {
        "artifactPath": "runtime.log",
        "line": 1
      }
    }
  ],
  "nextCursor": null
}
```

When no run-local `runtime.log` artifact exists, the endpoint keeps the current fallback chain rather than claiming that artifact-backed runtime logs are available:

- `source: "scheduler-events"`
- `summary` derived from the event `detail` / `title`
- `model` preserved only when the fallback scheduler event actually carries it
- persisted `PAUSING` / `ABORTING` control events are exposed as backend-owned scheduler-event rows with:
  - control-specific `summary`
  - `message` carrying the request reason
  - `detail.requestedBy` / `detail.requestedAt` / `detail.requestReason`
- if non-step scheduler events are also absent or too thin to form runtime-log rows, the backend can emit a few `source: "scheduler-request-context"` entries instead
- those shell entries expose persisted startup context such as page identity, runtime summary, next action, and locator cues so `monitor` does not collapse into an empty runtime-log panel
- only when artifact rows, scheduler-event rows, and request-context shell rows are all absent does the endpoint return:
  - `availability: "UNAVAILABLE"`
  - `sourceLayer: "NONE"`
  - `items: []`

The top-level `sourceLayer` tells the front end which runtime-log layer currently owns the response:

- `RUNTIME_ARTIFACT`
- `SCHEDULER_EVENTS`
- `REQUEST_CONTEXT`
- `NONE`

### 7.4 Live-Page Read Interface

#### `GET /api/phase3/runs/{runId}/live-page`

Purpose:

- return current screenshot and compact page-recognition summary

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "status": "AVAILABLE",
  "sourceLayer": "LIVE_ARTIFACT",
  "capturedAt": "2026-04-20T05:31:49Z",
  "url": "https://app.acme.example/checkout",
  "title": "Checkout",
  "summary": "Checkout form is stable and ready for payment review.",
  "pageState": "checkout.form",
  "highlight": {
    "stepIndex": 5,
    "action": "click",
    "target": "button.pay"
  },
  "screenshotPath": "live/step-5.png"
}
```

When no run-local live-page artifact is available, the backend returns an explicit unavailable shell instead of fabricating a live page. That shell may still carry persisted scheduler request context such as page identity, runtime summary, and locator cues:

```json
{
  "runId": "checkout-web-smoke",
  "status": "UNAVAILABLE",
  "sourceLayer": "REQUEST_CONTEXT",
  "capturedAt": "2026-04-20T05:31:49Z",
  "url": "https://app.acme.example/checkout/payment",
  "title": "Payment review",
  "summary": "Payment form is visible and the CTA stays above the fold.",
  "pageState": "audit-first / queued / watching payment iframe",
  "highlight": {
    "stepIndex": 0,
    "action": "Verify the payment CTA before unblocking release.",
    "target": "#pay-now"
  },
  "screenshotPath": null
}
```

The top-level `sourceLayer` tells the front end which live-page layer currently owns the response:

- `LIVE_ARTIFACT`
- `REQUEST_CONTEXT`
- `NONE`

The optional top-level `summary` follows a small additive fallback chain:

- `live-page.json.summary`
- persisted scheduler request `bodySummary`
- persisted scheduler request `nextAction`
- when the shell is request-context-backed and `status` is `PAUSING` / `ABORTING`, the backend may append a lightweight control note to that summary explaining who requested the control action and why

Current screen behavior:

- when `status === "AVAILABLE"` and `screenshotPath` is present, `MonitorScreen` resolves the image through the existing run artifact-content read path:
  - `GET /api/phase3/runs/{runId}/artifacts/content?path=...`

### 7.5 Pause Control Interface

#### `POST /api/phase3/runs/{runId}/pause`

Purpose:

- request a safe pause for the live run

Request body:

```json
{
  "operator": "qa-platform",
  "reason": "Need manual verification before payment submit"
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "run-control-pause",
  "runId": "checkout-web-smoke",
  "requestedState": "PAUSING",
  "requestedBy": "qa-platform",
  "requestReason": "Need manual verification before payment submit",
  "requestedAt": "2026-04-18T11:00:00Z"
}
```

Functional rules:

- return current-state result if run is already paused or finished
- append a persisted runtime-control phase event into scheduler/runtime history
- the accepted POST response may immediately echo lightweight control-request readback fields:
  - `requestedBy`
  - `requestReason`
  - `requestedAt`
- until a stronger artifact-backed terminal status exists, `GET /api/phase3/runs/{runId}/status` should read that phase event back as `PAUSING`
- while `status === "PAUSING"`, `control.canPause` is `false`
- while `status === "PAUSING"`, `status.control` may also read back:
  - `requestedBy`
  - `requestReason`
  - `requestedAt`

### 7.6 Abort Control Interface

#### `POST /api/phase3/runs/{runId}/abort`

Purpose:

- stop the run and mark it aborted

Request body:

```json
{
  "operator": "qa-platform",
  "reason": "Unsafe DOM mismatch after payment redirect"
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "run-control-abort",
  "runId": "checkout-web-smoke",
  "requestedState": "ABORTING",
  "requestedBy": "ops-oncall",
  "requestReason": "Unsafe DOM mismatch after payment redirect",
  "requestedAt": "2026-04-18T11:00:00Z"
}
```

Functional rules:

- should be idempotent for already-finished runs
- append a persisted runtime-control phase event into scheduler/runtime history
- the accepted POST response may immediately echo lightweight control-request readback fields:
  - `requestedBy`
  - `requestReason`
  - `requestedAt`
- until a stronger artifact-backed terminal status exists, `GET /api/phase3/runs/{runId}/status` should read that phase event back as `ABORTING`
- while `status === "ABORTING"`, both `control.canPause` and `control.canAbort` are `false`
- while `status === "ABORTING"`, `status.control` may also read back:
  - `requestedBy`
  - `requestReason`
  - `requestedAt`

## 8. Implemented Route-State Design

App state:

```ts
const [selectedMonitorRunId, setSelectedMonitorRunId] = useState<string | null>(null);
```

App helper:

```ts
function openMonitor(runId?: string | null) {
  setSelectedMonitorRunId(runId?.trim() || null);
  setActiveScreen("monitor");
}
```

`MonitorScreen` prop:

```ts
selectedRunId?: string | null;
```

Implemented behavior:

- if `selectedRunId` is absent:
  - show idle state with guidance to open a run from the execution page
- if `selectedRunId` exists:
  - fetch all 4 runtime APIs (`status`, `steps`, `runtime-log`, `live-page`) in parallel
  - show loading state while fetching
  - show error state if status API fails
  - show loaded state with full runtime data on success

## 9. Implemented Control Wiring

### 9.1 `Pause`

Implementation:

- prop: `onPauseRun(runId: string): Promise<void>`
- button uses current `selectedRunId`
- endpoint: `POST /api/phase3/runs/{runId}/pause`
- after success: refreshes all 4 runtime APIs + snapshot
- disabled when `control.canPause` is false or mutation is pending
- shows pending/success/error feedback inline

### 9.2 `Abort`

Implementation:

- prop: `onAbortRun(runId: string): Promise<void>`
- endpoint: `POST /api/phase3/runs/{runId}/abort`
- after success: refreshes all 4 runtime APIs + snapshot
- disabled when `control.canAbort` is false or mutation is pending
- shows pending/success/error feedback inline

### 9.3 Step Row Drill-Down

- implemented as local front-end state only
- clicking a step row opens a local detail panel with the selected step's current payload fields:
  - `index`
  - `label`
  - `state`
  - `durationMs`
  - `startedAt`
  - `note`
- changing `selectedRunId` clears the previously opened step detail
- no new backend interface or route was added

### 9.4 Runtime Log Row Drill-Down

- implemented as local front-end state only
- clicking a runtime-log row opens a local detail panel with:
  - `at`
  - `type`
  - `model`
  - `summary`
  - optional extended fields already present on the runtime payload
- changing `selectedRunId` clears the previously opened log detail
- no new backend interface or route was added

## 10. Error Handling Boundary

Current implementation:

- if `status` API fails, screen shows error state with the error message
- `steps`, `runtime-log`, and `live-page` API failures are non-fatal — screen renders available data
- Pause/Abort failures show error feedback inline
- when no `selectedRunId` is provided, idle state is shown with guidance text

## 11. Remaining Limits

- `live-page` now prefers run-local `live-page.json` / screenshot artifacts and returns an explicit `UNAVAILABLE` shell when they are absent.
- `status` now prefers run-local `report.json` / `live-page.json` / `runtime.log` timestamps for stronger terminal status, progress, assertions, current-page, and `lastUpdatedAt` semantics, but it still falls back to a scheduler-derived shell when those stronger artifacts are absent.
- `status.counters.aiCalls` / `status.counters.heals` now prefer artifact-backed report summary values first and then run-local `runtime.log` classification before falling back to scheduler-event counts.
- `steps` now prefers run-local `report.json.steps[]`; when that artifact is present, failed/skipped terminal semantics are preserved instead of being collapsed into `TODO`; when the artifact is absent it falls back only to scheduler-backed `STEP_*` events and otherwise returns an empty list.
- `steps` now also carries a backend-owned `availability` marker so the front end can distinguish `AVAILABLE` vs `UNAVAILABLE` empty-state semantics without changing the `items` row structure.
- `steps` now also carries a backend-owned `sourceLayer` marker so the front end can show whether the current step timeline comes from report artifacts, scheduler events, or no available source.
- when `steps.items` is empty, `MonitorScreen` now prefers that backend-owned marker and renders explicit no-step copy in both the progress area and the step-list panel; if the marker is absent, it still falls back to the old `items.length === 0` interpretation for compatibility.
- `MonitorScreen` now also shows a lightweight steps source hint in the panel header and falls back to minimal legacy inference when older step payloads omit the marker.
- `runtime-log` now also carries a backend-owned `availability` marker so the front end can distinguish a truly unavailable runtime-log stream from a merely short list without changing the existing log-entry shape.
- `runtime-log` now also carries a backend-owned `sourceLayer` marker so the front end can show whether the current log stream comes from runtime artifacts, scheduler events, request-context fallback, or no available source.
- `runtime-log` now prefers run-local `runtime.log` artifacts; when they are absent it still falls back to scheduler-event-derived shaping.
- when artifact-backed and scheduler-event-backed runtime notes are both unavailable, `runtime-log` now emits a small backend-owned request-context shell instead of returning an empty panel when persisted scheduler request context exists.
- when `runtimeLog.items` is empty, `MonitorScreen` now prefers the backend-owned availability/source markers and still falls back to the old empty-list interpretation for legacy payload compatibility.
- `live-page` now also carries a backend-owned `sourceLayer` marker so the front end can show whether the current viewport comes from run-local live artifacts, persisted request-context fallback, or no available source.
- when `livePage.sourceLayer` is missing, `MonitorScreen` falls back to minimal legacy inference from `status`, `screenshotPath`, and the existing shell fields.
- `status` now also carries a backend-owned `sourceLayer` marker so the front end can show whether the run summary is primarily artifact-strengthened or still scheduler-fallback-owned.
- when `runStatus.sourceLayer` is missing, `MonitorScreen` falls back only to stronger artifact-like current-page signals (for example `artifact-captured`) and otherwise stays conservative with `SCHEDULER_FALLBACK`.
- Pause/Abort record intent only; the backend does not trigger real execution-control workflows in Phase 3.
- Step rows and runtime log rows now use local detail panels rather than a separate page or route.
- Live page panel now inlines image-like screenshots when `screenshotPath` is present, but it still does not render a richer DOM summary.
- `GET /api/phase3/admin-console` is still used for queue pressure in the footer; deeper runtime context comes from run-specific APIs.
