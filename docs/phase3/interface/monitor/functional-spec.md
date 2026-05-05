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
- done/running/todo state
- duration
- heal note

Functional role:

- provide readable live progression across the run

Current behavior:

- timeline driven by `steps` from `GET /api/phase3/runs/{runId}/steps`
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
- shows URL, page state, and active step highlight from API response
- no true screenshot is rendered (uses structured data instead)

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
- `steps` from `GET /api/phase3/runs/{runId}/steps` — step timeline and state
- `runtimeLog` from `GET /api/phase3/runs/{runId}/runtime-log` — AI decision and runtime event entries
- `livePage` from `GET /api/phase3/runs/{runId}/live-page` — current page URL, state, and highlight

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

- Runtime data is deterministic mock from the backend when no real run artifacts exist.
- Step rows and runtime log rows now open local drill-down detail panels using existing runtime payload only; no new backend interface is required.
- Live page panel shows structured data only; no real screenshot is rendered.
- Pause/Abort record intent only; the backend does not trigger real execution-control workflows in Phase 3.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
