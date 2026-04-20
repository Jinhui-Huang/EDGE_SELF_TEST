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

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - none
- current screen does not receive a run-specific runtime payload
- true monitor behavior implied by the UI requires new run-status, runtime-log, and runtime-control interfaces

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

## 4. Current Local-Only Runtime Placeholder Model

The following monitor data is hardcoded or screen-local today:

- `runId = "run_8f2a1c3e"`
- current step summary
- step timeline list
- runtime log list
- progress percentage
- mocked live page viewport

Interface implication:

- these are not current backend contracts
- they are placeholders representing the shape of future runtime-monitor APIs

## 5. UI Control to Interface Mapping

### 5.1 Hero Controls

#### `Pause`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - runtime-control mutation for one run
- current state: visible only

#### `Abort`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - runtime-control mutation for one run
- current state: visible only

### 5.2 Steps Timeline

#### Step row

- user action: inspect only today
- request: none today
- intended future behavior:
  - open step runtime detail drawer
  - or route to run-detail screen
- current state: display only

### 5.3 AI Runtime Log

#### Runtime log row

- user action: inspect only today
- request: none today
- intended future behavior:
  - open full decision detail
  - or route to report/run detail
- current state: display only

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
- current routing is only:
  - `handleScreenChange("monitor")`
- no `runId` or monitor context is passed

This is the key current gap:

- `monitor` cannot yet identify which specific run it is monitoring from route-state alone

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

## 7. Future Interface Evolution Required by This Screen

The current UI shape clearly requires dedicated monitor interfaces.

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

## 8. Recommended Route-State Design

Because `monitor` currently receives no run identity, route-state must be expanded even before deeper live APIs are used.

Recommended app state:

```ts
const [selectedMonitorRunId, setSelectedMonitorRunId] = useState<string | null>(null);
```

Recommended app helper:

```ts
function openMonitor(runId: string) {
  setSelectedMonitorRunId(runId);
  setActiveScreen("monitor");
}
```

Recommended `MonitorScreen` prop:

```ts
selectedRunId?: string | null;
```

Recommended behavior:

- if `selectedRunId` is absent:
  - fall back to latest known running/queued run from snapshot
- if `selectedRunId` exists:
  - use it for status/log/control interfaces

## 9. Detailed Implementation Design for Currently Unwired Controls

This section turns the visible but inactive monitor controls into concrete interface designs.

### 9.1 `Pause`

Recommended implementation type:

- new runtime-control mutation

Concrete implementation design:

- add prop:
  - `onPauseRun(runId: string): Promise<void> | void`
- button uses current selected run id
- submit endpoint:
  - `POST /api/phase3/runs/{runId}/pause`
- after success:
  - refresh `GET /api/phase3/runs/{runId}/status`
  - optionally refresh `GET /api/phase3/admin-console`

### 9.2 `Abort`

Recommended implementation type:

- new runtime-control mutation

Concrete implementation design:

- add prop:
  - `onAbortRun(runId: string): Promise<void> | void`
- submit endpoint:
  - `POST /api/phase3/runs/{runId}/abort`
- after success:
  - refresh run status
  - if run is terminal, later allow route to `reportDetail`

### 9.3 Step Row Drill-Down

Recommended implementation type:

- local detail drawer first
- no extra route required for initial implementation

Required read interface:

- `GET /api/phase3/runs/{runId}/steps`

Concrete behavior:

- clicking a step row opens a drawer showing:
  - step input
  - resolved locator
  - duration
  - screenshots/artifacts
  - assertions

### 9.4 Runtime Log Row Drill-Down

Recommended implementation type:

- local detail drawer first
- no extra route required for initial implementation

Required read interface:

- `GET /api/phase3/runs/{runId}/runtime-log`

Concrete behavior:

- clicking a log row opens:
  - full decision text
  - model/provider
  - structured decision payload
  - related step index if present

## 10. Error Handling Boundary

Current implementation:

- no runtime-control request exists
- therefore no control-level error state is shown

Recommended future error handling:

- status/log/live-page reads:
  - `404` when run does not exist
  - `409` when runtime state is not yet available
- pause/abort:
  - `409` when run is already terminal or cannot transition
  - `423` when a control operation is locked

Recommended UI surfacing:

- hero-level control mutation status
- fallback empty-state if no active run can be monitored

## 11. Review Items

Review-only findings:

- The current monitor page is structurally aligned with the intended runtime-monitor design, but almost all live detail is still local placeholder data.
- `GET /api/phase3/admin-console` is only enough for shallow monitor context, not true runtime monitoring.
- `Pause` and `Abort` must become explicit runtime-control interfaces rather than scheduler append events.
- `execution` to `monitor` handoff must start carrying `runId`; otherwise the monitor screen cannot observe a specific run reliably.

These are documentation findings only. No implementation change is made in this stage.
