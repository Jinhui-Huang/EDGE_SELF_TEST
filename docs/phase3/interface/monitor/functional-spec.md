# Monitor Functional Specification

## 1. Document Position

- Screen name: `monitor`
- Front-end implementation: `ui/admin-console/src/screens/MonitorScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `monitor` screen is the runtime-observation workspace of the Phase 3 admin console. It is intended to show the operator what is happening after a run has been queued and started.

Its job is to:

- identify the currently monitored run
- show current run state and progress
- expose current step and step timeline
- show live page/runtime context
- summarize AI/runtime decision logs
- expose operator control actions such as `Pause` and `Abort`

According to the Phase 3 main documents, this screen should answer:

- What is the current run doing right now?
- Which step is executing and how far through the run are we?
- What did the runtime AI or state recognizer decide?
- Should the operator pause or abort this run?

## 3. Operator Role

Primary users:

- QA platform operator supervising live runs
- test engineer debugging runtime behavior
- operations reviewer checking queue pressure and live execution posture

Typical usage moments:

- immediately after `execution`
- during a live run that is still `RUNNING`
- when a locator-heal, state-recognition, or step failure needs live inspection

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `monitor`

The screen is a downstream page of:

- `execution`

It is an upstream diagnostic page for:

- `reports`
- `reportDetail`
- `dataDiff`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `MonitorScreen.tsx`.
- The page is rendered by `MonitorScreen.tsx`.
- The page receives `selectedRunId` from `App.tsx` via `openMonitor(runId)` handoff.
- The page receives `apiBaseUrl` and fetches from 4 runtime APIs on mount when `selectedRunId` is present:
  - `GET /api/phase3/runs/{runId}/status`
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/runtime-log`
  - `GET /api/phase3/runs/{runId}/live-page`
- `Pause` and `Abort` are wired to App-level callbacks that call:
  - `POST /api/phase3/runs/{runId}/pause`
  - `POST /api/phase3/runs/{runId}/abort`
- When no `selectedRunId` is provided (e.g., direct sidebar navigation), an idle state is shown.
- Loading and error states are implemented for the initial data fetch.
- The page uses `snapshot.workQueue` for queue pressure in the footer.

This matters for review:

- the current UI is backed by real runtime APIs through the `selectedRunId` handoff
- runtime data comes from backend responses, not from screen-local placeholder data
- Pause/Abort control actions are implemented with status feedback

## 6. Functional Areas

### 6.1 Hero Area

Visible elements:

- path text
- title
- running badge
- environment pill
- model pill
- `Pause`
- `Abort`

Functional role:

- establish run identity and top-level control posture

Current behavior:

- run identity and top-level state driven by `runStatus` from `GET /api/phase3/runs/{runId}/status`
- `Pause` is implemented — calls `onPauseRun(runId)`, disabled when `control.canPause` is false
- `Abort` is implemented — calls `onAbortRun(runId)`, disabled when `control.canAbort` is false
- Pause/Abort show pending/success/error feedback inline

### 6.2 Progress Card

Visible elements:

- progress ring
- current step index/label
- elapsed vs estimated time
- step bar
- mini stats:
  - assertions
  - AI calls
  - heals

Functional role:

- summarize live progress and operator confidence

Current behavior:

- values driven by `runStatus.progress` and `runStatus.counters` from the status API
- step bar driven by `steps` from `GET /api/phase3/runs/{runId}/steps`

### 6.3 Steps Timeline Panel

Visible elements:

- ordered step list
- done/running/failed/skipped/todo state
- duration
- heal note

Functional role:

- provide readable live progression across the run

Current behavior:

- timeline driven by `steps` from `GET /api/phase3/runs/{runId}/steps`
- when run-local `report.json.steps[]` exists, the backend prefers artifact-backed step entries over deterministic shaping
- artifact-backed terminal failure semantics are preserved:
  - `FAILED` / `ERROR` -> `FAILED`
  - `SKIPPED` / `CANCELLED` / `ABORTED` -> `SKIPPED`
- when no run-local report step artifact exists, only scheduler-backed `STEP_*` events remain; if those events are absent, the backend returns an empty step list instead of fabricating a placeholder execution flow
- rows are clickable and open a local step-detail panel inside `MonitorScreen`

### 6.4 Live Page Panel

Visible elements:

- page header with URL/domain-like pill
- mocked checkout viewport
- current step highlight

Functional role:

- show where the live run is currently acting in the browser

Current behavior:

- panel driven by `livePage` from `GET /api/phase3/runs/{runId}/live-page`
- shows explicit unavailable state when no run-local live artifact exists
- when a run-local screenshot is present, the panel can render it inline from the existing run artifact-content read path
- keeps URL, page state, and active step highlight from the same backend-owned payload

### 6.5 AI Runtime Log Panel

Visible elements:

- time
- event type
- model
- message
- live badge

Functional role:

- let the operator inspect current AI/runtime decisions during execution

Current behavior:

- log items driven by `runtimeLog` from `GET /api/phase3/runs/{runId}/runtime-log`
- when run-local `runtime.log` exists, the backend prefers artifact-backed log entries over deterministic shaping
- when no run-local runtime log artifact exists, scheduler-event-derived fallback remains in place; if those events still do not yield usable runtime-log rows, a compact persisted request-context shell is shown instead of claiming artifact-backed runtime logs
- rows are clickable and open a local runtime-log detail panel inside `MonitorScreen`

### 6.6 Footer Summary

Visible elements:

- queue pressure
- last event
- owner

Functional role:

- provide a compact operational summary linked to the monitored run context

Current behavior:

- queue pressure from `snapshot.workQueue`
- last event and owner from `runStatus`
- no footer action is implemented

## 7. Data Semantics by Area

### 7.1 Snapshot-Derived Context

The screen currently takes limited contextual display data from:

- `snapshot.projects`
- `snapshot.reports`
- `snapshot.workQueue`
- `snapshot.timeline`

### 7.2 API-Driven Runtime Data

The screen loads runtime data from dedicated APIs when `selectedRunId` is provided:

- `runStatus` from `GET /api/phase3/runs/{runId}/status` — run identity, progress, counters, control state
- `steps` from `GET /api/phase3/runs/{runId}/steps` — artifact-backed `report.json.steps[]` when available, preserving `FAILED` / `SKIPPED` terminal semantics; otherwise only scheduler-backed `STEP_*` rows, or empty when scheduler cannot support a real step timeline
- `runtimeLog` from `GET /api/phase3/runs/{runId}/runtime-log` — artifact-backed `runtime.log` entries when available, otherwise scheduler-event-derived AI/runtime notes
- `livePage` from `GET /api/phase3/runs/{runId}/live-page` — backend-owned availability status, current page URL/state/highlight, and optional run-local screenshot path

- `runStatus` now prefers run-local `report.json` / `live-page.json` / artifact timestamps when available and otherwise keeps a conservative scheduler-backed shell that can still surface persisted scheduler request page/runtime context
- `runStatus.counters.aiCalls` / `runStatus.counters.heals` now prefer artifact-backed report summary values first and then run-local `runtime.log` classification before falling back to scheduler-event counts
- `runStatus` now also carries a backend-owned source-layer marker so the front end can show whether the run summary is artifact-strengthened or still scheduler-fallback-owned
- when `runStatus.status` is `PAUSING` or `ABORTING`, `runStatus.control` may now also carry lightweight readback fields such as `requestedBy`, `requestReason`, and `requestedAt`
- `steps` now also carries a backend-owned availability marker so the front end can distinguish a truly unavailable step timeline from a merely short one without changing the existing row structure
- `steps` now also carries a backend-owned source-layer marker so the front end can show whether the current step timeline comes from report artifacts, scheduler events, or no available source
- `runtimeLog` now follows an explicit fallback chain: run-local `runtime.log` artifact first, then scheduler-event-derived runtime notes, then a small persisted scheduler request-context shell when neither source yields usable runtime-log rows
- when persisted `PAUSING` / `ABORTING` control events appear in the scheduler-events fallback layer, `runtimeLog` now exposes them as backend-owned control rows with existing `message` / `detail` fields so the current log detail UI can explain who requested the control action, why, and when
- `runtimeLog` now also carries a backend-owned availability marker so the front end can distinguish a truly unavailable log stream from a merely short list without changing the existing log-entry structure
- `runtimeLog` now also carries a backend-owned source-layer marker so the front end can show whether the current log stream comes from runtime artifacts, scheduler events, request-context fallback, or no available source
- `livePage` now also carries a backend-owned source-layer marker so the front end can show whether the viewport comes from run-local live artifacts, persisted request-context fallback, or no available source
- `livePage` now also carries an optional lightweight `summary` field that prefers `live-page.json.summary` and otherwise falls back to persisted request `bodySummary` / `nextAction`
- when the live-page response is a request-context-backed `UNAVAILABLE` shell and control is currently `PAUSING` / `ABORTING`, that lightweight `summary` now appends a small control note explaining who requested the control action and why
- when `steps.items` is empty, `MonitorScreen` now prefers the backend-owned steps availability marker and shows explicit no-step copy instead of leaving the progress/timeline areas visually blank; if the marker is absent it still falls back to the empty-list interpretation for compatibility
- `MonitorScreen` now also shows a lightweight steps source hint in the panel header and falls back to minimal legacy inference when older step payloads omit the marker
- when `runtimeLog.items` is empty, `MonitorScreen` now prefers the backend-owned runtime-log availability/source markers for the empty-state message and source hint, and still falls back to the empty-list interpretation when legacy payloads omit the marker
- `MonitorScreen` now also shows a lightweight live-page source hint in the panel header and falls back to minimal legacy inference when older live-page payloads omit the marker
- `MonitorScreen` now also shows the optional live-page `summary` text in the panel without changing the screenshot / highlight / locator structure
- `MonitorScreen` now also shows a lightweight status source hint in the hero row and, when older status payloads omit the marker, only treats stronger artifact-like current-page signals as `RUN_ARTIFACTS`; otherwise it stays conservative with `SCHEDULER_FALLBACK`
- the footer `Queue pressure` line now prefers run-local `runStatus.queueState` when that additive field exists and only falls back to the parent `snapshot.workQueue[0].detail` when the run-local read model does not provide queue context
- the footer `Queue pressure` line now also shows a lightweight source hint from additive `runStatus.queueStateSource`; when older status payloads omit the marker, `MonitorScreen` keeps a minimal compatibility inference path instead of breaking the footer fallback
- the footer `Last event` line now prefers run-local `runStatus.lastEventSummary` when that additive field exists and only falls back to the parent `snapshot.timeline[0]` copy when the run-local read model does not provide an event summary
- the footer `Last event` line now also shows a lightweight source hint from additive `runStatus.lastEventSource`; when older status payloads omit the marker, `MonitorScreen` keeps a minimal legacy inference path instead of breaking the footer
- when `runStatus.status` is `PAUSING` or `ABORTING`, `MonitorScreen` now shows a dedicated in-progress control-phase banner that warns runtime log, step timeline, and live-page panels may temporarily remain on an older snapshot while the control phase settles
- that banner reuses the existing lightweight control-request readback fields (`requestedBy`, `requestReason`, and `requestedAt`) rather than introducing any new control-specific API contract
- accepted `pause` / `abort` POST responses now also echo those same lightweight control-request fields, and `MonitorScreen` uses them for immediate optimistic control feedback before the next `status` readback catches up; that overlay is then cleared once `/status` reaches either the same requested phase or a direct stronger terminal handoff such as `PAUSING -> PAUSED` or `ABORTING -> ABORTED`
- non-`ACCEPTED` `pause` / `abort` responses such as `ALREADY_PAUSED`, `ALREADY_ABORTED`, or `REJECTED` now also produce immediate local operator feedback in `MonitorScreen` before the refresh completes, and the screen then triggers a fresh monitor snapshot read so the warning is followed by the latest persisted status rather than only by a thrown action error
- when those same `PAUSING` / `ABORTING` control phases coincide with empty `steps`, empty `runtimeLog`, or `UNAVAILABLE` `livePage`, the front end now swaps the generic no-data copy for context-aware temporary-stall wording so operators understand that newer snapshots may simply not have arrived yet

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- page title
- `selectedRunId` from App-level handoff (canonical run identifier)
- `apiBaseUrl` for runtime API calls
- `onPauseRun` callback for pause control
- `onAbortRun` callback for abort control

### 8.2 Screen Outputs

The screen produces:

- operator control intent
  - pause via `onPauseRun(runId)` → `POST /api/phase3/runs/{runId}/pause`
  - abort via `onAbortRun(runId)` → `POST /api/phase3/runs/{runId}/abort`
- local run drill-down intent
  - step detail panel
  - runtime-log detail panel

## 9. User Actions

Visible actions on this screen:

- click `Pause`
- click `Abort`
- inspect step timeline
- inspect live page
- inspect AI runtime log

Current implementation summary:

- implemented:
  - `Pause` (via `onPauseRun` callback)
  - `Abort` (via `onAbortRun` callback)
  - idle/loading/error/loaded state rendering
  - runtime data fetch on `selectedRunId` change
  - step-row drill-down
  - runtime-log drill-down

## 10. Functional Control Responsibility Matrix

### 10.1 Hero Controls

- `Pause`
  - function: pause current run safely
  - output type: runtime-control mutation via `POST /api/phase3/runs/{runId}/pause`
  - current implementation: implemented — disabled when `control.canPause` is false, shows pending/success/error feedback
- `Abort`
  - function: stop current run and mark it aborted
  - output type: runtime-control mutation via `POST /api/phase3/runs/{runId}/abort`
  - current implementation: implemented — disabled when `control.canAbort` is false, shows pending/success/error feedback

### 10.2 Timeline Controls

- step row
  - function: inspect one step's runtime detail
  - output type: local detail panel inside `MonitorScreen`
  - current implementation: implemented

### 10.3 Runtime Log Controls

- runtime log row
  - function: inspect one AI/runtime decision in detail
  - output type: local detail panel inside `MonitorScreen`
  - current implementation: implemented

## 11. State Model

The screen should support:

- no monitored run selected
- monitored run loading
- monitored run live
- monitored run paused
- monitored run aborted
- monitored run finished
- runtime-control mutation pending
- runtime-control mutation success
- runtime-control mutation error

Current implementation status:

- idle (no runId), loading, loaded, and error states are implemented
- runtime-control mutation pending/success/error states are implemented for Pause and Abort
- non-`ACCEPTED` control results now surface as inline warning feedback plus a forced refresh instead of only bubbling as action errors
- monitored run paused/aborted/finished states are rendered based on API response status

## 12. Validation and Rules

Intended runtime-control rules:

- `Pause` should be available only while the run is actively pausable
- `Abort` should require a valid live run identity
- control actions should be idempotent or return a clear current-state response

Current implementation rule:

- `Pause` is disabled when `control.canPause` is false (from status API response)
- `Abort` is disabled when `control.canAbort` is false (from status API response)
- both buttons are disabled during pending state

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- `execution` as the operator entry point
- scheduler request/event state persisted by local-admin-api

### 13.2 Downstream Screens

The screen should serve as an upstream context for:

- `reports`
- `reportDetail`
- `dataDiff`

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- work queue
- reports
- timeline
- project summary

## 14. Screen Boundary

The `monitor` screen is responsible for:

- live run observation
- runtime-control entry
- step-level and AI-log-level runtime visibility

The `monitor` screen is not currently responsible for:

- launching runs
- building prepared cases
- persisting project/case catalogs
- rendering full post-run report detail

## 15. Remaining Limits

- `livePage` now prefers run-local live-page artifacts and returns an explicit unavailable shell when none exist.
- `status` now prefers stronger run-local `report.json` / `live-page.json` / `runtime.log` timestamp context when those artifacts exist, but it still falls back to a scheduler-derived shell when they do not.
- `steps` now preserves backend-owned failed/skipped terminal semantics when report-backed artifacts exist; without those artifacts it falls back only to scheduler-backed `STEP_*` rows and otherwise stays empty instead of simulating a fake execution flow.
- `runtimeLog` still remains partly deterministic when no stronger run-local runtime artifacts exist.
- Step rows and runtime log rows now open local drill-down detail panels using existing runtime payload only; no new backend interface is required.
- Live page panel can now inline image-like screenshots, but it still does not render a richer DOM summary.
- Pause/Abort still do not trigger a real external execution-control workflow in Phase 3, but persisted control-phase events now read back through `status` as `PAUSING` / `ABORTING`, along with lightweight control-request metadata, so the screen can reflect in-progress control intent more honestly.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
