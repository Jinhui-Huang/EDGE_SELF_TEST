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
- The page does not perform direct `fetch`.
- The page currently receives only:
  - `snapshot`
  - `title`
  - `locale`
- the monitored `runId` is hardcoded in the component
- the current step, step timeline, runtime log, and live page are all screen-local placeholder data
- only a small part of the screen uses real snapshot fields:
  - `snapshot.projects[0]`
  - `snapshot.reports[0]`
  - `snapshot.workQueue[0]`
  - `snapshot.timeline[0]`
- `Pause` and `Abort` are visible but not wired

This matters for review:

- the current UI shape matches the intended monitoring concept
- but the runtime detail itself is not yet backed by true run-status interfaces

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

- display only
- `Pause` is visible only
- `Abort` is visible only

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

- values are mostly screen-local placeholder data
- no direct backend request is tied to this area

### 6.3 Steps Timeline Panel

Visible elements:

- ordered step list
- done/running/todo state
- duration
- heal note

Functional role:

- provide readable live progression across the run

Current behavior:

- timeline is local placeholder data
- rows are not clickable

### 6.4 Live Page Panel

Visible elements:

- page header with URL/domain-like pill
- mocked checkout viewport
- current step highlight

Functional role:

- show where the live run is currently acting in the browser

Current behavior:

- panel is purely presentational placeholder
- no true screenshot, DOM summary, or live page state is loaded

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

- log items are local placeholder data
- rows are not clickable

### 6.6 Footer Summary

Visible elements:

- queue pressure
- last event
- owner

Functional role:

- provide a compact operational summary linked to the monitored run context

Current behavior:

- partly derived from shared snapshot
- no footer action is implemented

## 7. Data Semantics by Area

### 7.1 Snapshot-Derived Context

The screen currently takes limited contextual display data from:

- `snapshot.projects`
- `snapshot.reports`
- `snapshot.workQueue`
- `snapshot.timeline`

### 7.2 Local Placeholder Runtime Data

The screen currently fabricates these as UI placeholders:

- `runId`
- current step
- step timeline
- runtime log
- live page/viewport content
- progress percentage

This means the screen currently communicates the intended runtime-monitor structure more than the true run state.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- page title

Important current gap:

- no run-specific prop is passed in today
- no direct runtime-status payload is passed in today

### 8.2 Screen Outputs

The screen should produce:

- operator control intent
  - pause
  - abort
- future run drill-down intent
  - step detail
  - AI decision detail

Current actual output:

- none

## 9. User Actions

Visible actions on this screen:

- click `Pause`
- click `Abort`
- inspect step timeline
- inspect live page
- inspect AI runtime log

Current implementation summary:

- implemented:
  - none of the runtime control actions
- visible but not implemented:
  - `Pause`
  - `Abort`
  - step-row drill-down
  - runtime-log drill-down

## 10. Functional Control Responsibility Matrix

### 10.1 Hero Controls

- `Pause`
  - function: pause current run safely
  - output type: future runtime-control mutation
  - current implementation: visual only
- `Abort`
  - function: stop current run and mark it aborted
  - output type: future runtime-control mutation
  - current implementation: visual only

### 10.2 Timeline Controls

- step row
  - function: inspect one step's runtime detail
  - output type: future local drawer or run-detail route
  - current implementation: display only

### 10.3 Runtime Log Controls

- runtime log row
  - function: inspect one AI/runtime decision in detail
  - output type: future local drawer or report-detail route
  - current implementation: display only

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

- none of these runtime states are truly backed by live data
- the page currently renders one static running-state composition

## 12. Validation and Rules

Intended runtime-control rules:

- `Pause` should be available only while the run is actively pausable
- `Abort` should require a valid live run identity
- control actions should be idempotent or return a clear current-state response

Current implementation rule:

- no runtime-control validation exists because no control action is wired

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

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- the screen has no true monitored-run input; `runId` is hardcoded.
- current progress, timeline, live page, and runtime log are local placeholders rather than backend-backed runtime data.
- `Pause` and `Abort` are visible but not wired.
- step rows and runtime log rows do not expose a drill-down behavior.
- current screen entry from `execution` is only a generic screen switch, not a run-specific route-state handoff.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
