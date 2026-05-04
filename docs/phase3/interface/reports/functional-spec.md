# Reports Functional Specification

Update note:
- P1-2 is implemented in the current workspace.
- `reports` now reads the canonical run list from `GET /api/phase3/runs/`.
- Backend list rows carry canonical `runId`; snapshot-derived rows are fallback-only when the API is unavailable.

## 1. Document Position

- Screen name: `reports`
- Front-end implementation: `ui/admin-console/src/screens/ReportsScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `reports` screen is the run-history overview page of the Phase 3 admin console. Its job is to organize recent run outcomes by project and let the operator open one concrete run into `reportDetail`.

This screen answers these operator questions:

- Which runs exist for each project in the current snapshot?
- Which run failed, succeeded, or needs inspection?
- Which run should be opened next for detailed diagnosis?

## 3. Operator Role

Primary users:

- QA platform operator
- test engineer triaging recent runs
- release or audit reviewer scanning run outcomes

Typical usage moments:

- after runs were started from `execution`
- after live inspection in `monitor`
- when choosing one run to open in `reportDetail`

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `reports`

The screen is downstream of:

- `execution`
- `monitor`

The screen is upstream of:

- `reportDetail`
- `dataDiff`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `ReportsScreen.tsx`.
- The page is organized as:
  - collapsible project-first overview card
  - project switch rail
  - run catalog list
  - operator timeline side panel
- `Detail` on a run row is implemented.
- project switching is implemented.
- overview collapse is implemented.
- the report list is not rendered directly from a backend-native report DTO.
- instead, the screen first builds front-end report view models from snapshot data.

This matters for review:

- the page already provides real navigation into `reportDetail`
- but many visible row fields are heuristically derived in the front end rather than coming from a stable backend report-list contract

## 6. Functional Areas

### 6.1 Overview Header

Visible elements:

- screen eyebrow/title
- explanatory lead text
- collapse / expand button

Functional role:

- establish that the screen uses a project-first report catalog pattern

Current behavior:

- collapse toggle is implemented locally

### 6.2 Project Switch Rail

Visible elements:

- one project button per grouped project
- project name
- project key
- run count
- case count

Functional role:

- switch the visible report list into one project context

Current behavior:

- implemented as local state change
- selected project follows the selected run when needed

### 6.3 Run Catalog

Visible elements per run row:

- run name
- case/environment/finished time line
- status badge
- duration
- steps passed / total
- assertions passed / total
- case id
- tags
- `Detail`

Functional role:

- present recent runs for the selected project
- let the operator choose a run for deep inspection

Current behavior:

- `Detail` routes into `reportDetail`
- if a row matches the shell-selected run, it is styled as opened

### 6.4 Empty State

Visible behavior:

- when the selected project has no visible reports, the list shows a no-runs message

Functional role:

- explain that the current snapshot has no report entries for the selected project

### 6.5 Operator Timeline Side Panel

Visible elements:

- timeline header
- timeline items from snapshot

Functional role:

- provide adjacent recent operational context while reviewing report entries

Current behavior:

- display only
- no timeline item action is implemented

## 7. Data Semantics by Area

### 7.1 Raw Snapshot Report Data

The screen starts from `snapshot.reports[]`, which only provides limited fields such as:

- `runName`
- `status`
- `finishedAt`
- `entry`

### 7.2 Front-End Report View Model

The screen then uses `buildReportViewModels(snapshot)` to derive richer display fields such as:

- project key/name
- case id/name/tags
- duration
- environment
- operator
- model
- step and assertion counts
- AI call and cost summaries
- heal count
- artifacts

This means:

- the report list is currently an operator-friendly synthetic summary layer
- it is not yet a fully backend-authored report list contract

### 7.3 Timeline Data

- the side panel uses `snapshot.timeline`
- this timeline is shared shell context, not report-list-specific data

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- `selectedRunName`
- labels for review board and report list
- callback:
  - `onOpenDetail`

### 8.2 Screen Outputs

The screen produces:

- local UI outputs
  - overview collapsed state
  - selected project change
- navigation output
  - report detail entry through `onOpenDetail(runName)`

## 9. User Actions

Visible actions on this screen:

- collapse or expand overview
- switch project
- inspect run rows
- click `Detail`

Current implementation summary:

- implemented:
  - overview collapse
  - project switch
  - `Detail`
- visible but not implemented:
  - timeline item drill-down

## 10. Functional Control Responsibility Matrix

### 10.1 Overview Controls

- collapse / expand button
  - function: compress or reveal the project-first report overview
  - output type: local screen state only
  - current implementation: implemented

### 10.2 Project Rail Controls

- project button
  - function: switch current report list scope
  - output type: local screen state only
  - current implementation: implemented

### 10.3 Run List Controls

- `Detail`
  - function: open one run in report detail
  - downstream relation:
    - `reportDetail`
  - current implementation: implemented

### 10.4 Timeline Controls

- timeline item
  - function: should provide contextual drill-down when the event maps to a run or queue item
  - output type: future route-state navigation
  - current implementation: display only

## 11. State Model

The screen should support:

- project selected
- overview expanded
- overview collapsed
- selected run highlighted
- empty report list for selected project
- report-detail handoff

Current implementation status:

- project selection is implemented
- selected-run highlight is implemented
- collapse state is implemented
- timeline drill-down state is not implemented

## 12. Validation and Rules

Current implemented rules:

- selected project falls back to the selected run's project or the first available project
- if current selected project disappears from the grouped report set, the screen falls back to a valid available project
- if `selectedRunName` belongs to another project, selected project is updated to follow that run

Implicit business rule:

- `reports` is a browsing and drill-down page, not a mutation page

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- shared snapshot loading
- selected run state owned by `App.tsx`

### 13.2 Downstream Screens

The screen serves as an upstream context for:

- `reportDetail`
- `dataDiff`

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- reports
- cases
- projects
- timeline

## 14. Screen Boundary

The `reports` screen is responsible for:

- project-first run browsing
- report row summarization
- run selection for detail drill-down

The `reports` screen is not currently responsible for:

- true report artifact rendering
- live run monitoring
- data-diff rendering
- report deletion, re-run, or export actions

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- many visible run-row fields are synthetic front-end derivations rather than backend-native list fields.
- project/case matching is currently inferred heuristically from `runName`.
- environment/model/operator/duration/statistics shown in the list are not stable backend list fields yet.
- timeline items are display-only and do not drill into `reportDetail` or `monitor`.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
