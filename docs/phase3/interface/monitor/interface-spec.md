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

The `monitor` screen currently uses the shared admin-console snapshot only as a shallow context source.

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
  - provides queue title, owner, and detail
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
- intended future behavior:
  - show current page screenshot or runtime page summary
- current state: placeholder only

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

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "projectKey": "checkout-web",
  "status": "RUNNING",
  "environment": "prod-like",
  "model": "claude-4.5-sonnet",
  "owner": "qa-platform",
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
  "lastUpdatedAt": "2026-04-20T05:32:10Z"
}
```

### 7.2 Step-Timeline Read Interface

#### `GET /api/phase3/runs/{runId}/steps`

Purpose:

- load current and completed step timeline for the monitored run

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "items": [
    {
      "index": 1,
      "label": "open /cart",
      "state": "DONE",
      "durationMs": 800
    },
    {
      "index": 5,
      "label": "click 'Pay'",
      "state": "RUNNING",
      "durationMs": 0,
      "startedAt": "2026-04-20T05:31:48Z"
    }
  ]
}
```

### 7.3 Runtime-Log Read Interface

#### `GET /api/phase3/runs/{runId}/runtime-log`

Purpose:

- load AI decisions, heals, state recognition, and runtime notes for the run

Query parameters:

- `cursor`
- `limit`

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "items": [
    {
      "at": "2026-04-20T05:31:48Z",
      "type": "DECISION",
      "model": "claude-4.5-sonnet",
      "summary": "Confirmed Pay button visible at candidate[0] (score 0.94).",
      "detail": {
        "candidateCount": 3,
        "selectedIndex": 0,
        "score": 0.94
      }
    }
  ],
  "nextCursor": "log_0002"
}
```

### 7.4 Live-Page Read Interface

#### `GET /api/phase3/runs/{runId}/live-page`

Purpose:

- return current screenshot and compact page-recognition summary

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "capturedAt": "2026-04-20T05:31:49Z",
  "url": "https://app.acme.example/checkout",
  "title": "Checkout",
  "pageState": "checkout.form",
  "highlight": {
    "stepIndex": 5,
    "action": "click",
    "target": "button.pay"
  },
  "screenshotPath": "D:\\...\\runs\\checkout-web-smoke\\live\\step-5.png"
}
```

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
  "requestedState": "PAUSING"
}
```

Functional rules:

- return current-state result if run is already paused or finished
- append a runtime-control event into scheduler/runtime history

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
  "requestedState": "ABORTING"
}
```

Functional rules:

- should be idempotent for already-finished runs
- should be reflected later in run status and report status

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

- Runtime data is deterministic mock from the backend when no real run artifacts or live execution exist.
- Pause/Abort record intent only; the backend does not trigger real execution-control workflows in Phase 3.
- Step rows and runtime log rows now use local detail panels rather than a separate page or route.
- Live page panel shows structured data only; no real screenshot or DOM summary is rendered.
- `GET /api/phase3/admin-console` is still used for queue pressure in the footer; deeper runtime context comes from run-specific APIs.
