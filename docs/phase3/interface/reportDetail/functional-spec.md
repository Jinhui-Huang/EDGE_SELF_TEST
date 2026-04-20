# Report Detail Functional Specification

## 1. Document Position

- Screen name: `reportDetail`
- Front-end implementation: `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `reportDetail` screen is the focused run-inspection page of the Phase 3 admin console. Its job is to take one selected run from `reports` and show the operator a deeper narrative of that run.

This screen answers these operator questions:

- Which run and case am I currently inspecting?
- Did the run pass or fail, and what is the summary posture?
- What screenshots, assertions, and AI-related summary details are available?
- Should I drill into `dataDiff`, download artifacts, or re-run the case?

## 3. Operator Role

Primary users:

- QA platform operator
- test engineer diagnosing one failed or suspicious run
- audit reviewer checking one run's outcome and artifacts

Typical usage moments:

- after selecting a run in `reports`
- after leaving `monitor` for post-run diagnosis
- before drilling into `dataDiff`
- before deciding to re-run

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `reportDetail`

The screen is downstream of:

- `reports`
- `monitor`

The screen is upstream of:

- `dataDiff`
- future artifact download flow
- future re-run handoff back to `execution`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `ReportDetailScreen.tsx`.
- The page depends on:
  - `snapshot`
  - `selectedRunName`
  - `onBackToReports`
  - `onOpenDataDiff`
- run detail content is built through `selectReportViewModel(snapshot, selectedRunName)`.
- `Reports` backlink is implemented.
- `Data diff` tab routes into `dataDiff`.
- `Download artifacts` is visible but not wired.
- `Re-run` is visible but not wired.
- tabs are visible, but only `Data diff` has behavior; the rest are visual only.

This matters for review:

- the screen is already a real downstream detail entry page
- but most detailed content is still front-end-derived rather than backend-authored report artifact data

## 6. Functional Areas

### 6.1 Breadcrumb Area

Visible elements:

- back link to `Reports`
- current run name

Functional role:

- preserve navigation context between list and detail

Current behavior:

- backlink is implemented

### 6.2 Hero Area

Visible elements:

- case name
- status badge
- subtitle:
  - finished time
  - duration
  - environment
  - model
  - operator
- actions:
  - `Download artifacts`
  - `Re-run`

Functional role:

- anchor the run identity and expose top-level operator actions

Current behavior:

- hero values are rendered from the selected report view model
- both hero action buttons are visible only

### 6.3 Tab Bar

Visible elements:

- `Overview`
- `Steps`
- `Assertions`
- `Data diff`
- `Recovery`
- `AI decisions`

Functional role:

- communicate the intended detail dimensions of one run

Current behavior:

- `Overview` is visually active
- `Data diff` triggers route to `dataDiff`
- all other tabs are visual only

### 6.4 Summary Panel

Visible elements:

- progress ring
- step pass rate
- stat cards:
  - duration
  - assertions
  - AI calls
  - AI cost
  - heals
  - recovery

Functional role:

- summarize the whole run outcome at a glance

Current behavior:

- values come from the report view model

### 6.5 Page Screenshots Panel

Visible elements:

- screenshot cards
- index label
- path text

Functional role:

- provide operator-facing visual evidence points from the run

Current behavior:

- screenshot cards are front-end synthetic placeholders
- no actual artifact opening or download exists

### 6.6 Assertions Panel

Visible elements:

- pass/fail indicator
- assertion name
- actual result summary

Functional role:

- summarize what assertions were checked and which ones failed

Current behavior:

- assertions are front-end synthetic detail payloads from the report view model

## 7. Data Semantics by Area

### 7.1 Selected Run Context

- the page uses `selectedRunName` from app state as its detail target

### 7.2 Front-End Detail View Model

- `selectReportViewModel(snapshot, selectedRunName)` supplies the current detail data
- this means the detail page currently inherits the synthetic derivation rules already used in `reportViewModel.ts`

### 7.3 Data-Diff Handoff

- `Data diff` does not load diff content here
- it hands off the currently selected run into `dataDiff`

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- selected run name
- callbacks:
  - `onBackToReports`
  - `onOpenDataDiff`

### 8.2 Screen Outputs

The screen produces:

- navigation outputs
  - back to `reports`
  - open `dataDiff`
- future artifact action outputs
  - download artifacts
  - re-run handoff

## 9. User Actions

Visible actions on this screen:

- go back to `Reports`
- click `Download artifacts`
- click `Re-run`
- click one of the tabs

Current implementation summary:

- implemented:
  - back to `Reports`
  - `Data diff` tab handoff
- visible but not implemented:
  - `Download artifacts`
  - `Re-run`
  - `Steps` tab switching
  - `Assertions` tab switching
  - `Recovery` tab switching
  - `AI decisions` tab switching

## 10. Functional Control Responsibility Matrix

### 10.1 Breadcrumb Controls

- `Reports`
  - function: return to the list page
  - output type: cross-screen navigation
  - current implementation: implemented

### 10.2 Hero Controls

- `Download artifacts`
  - function: retrieve or open run artifacts
  - output type: future artifact access behavior
  - current implementation: visual only
- `Re-run`
  - function: reopen execution flow with current run context
  - output type: future route-state handoff into `execution`
  - current implementation: visual only

### 10.3 Tab Controls

- `Overview`
  - function: show current summary panels
  - current implementation: visually active only
- `Steps`
  - function: show step-level detail
  - current implementation: visual only
- `Assertions`
  - function: show assertion-focused detail
  - current implementation: visual only
- `Data diff`
  - function: open downstream diff page
  - current implementation: implemented as App-level selected-run handoff
- `Recovery`
  - function: show restore/recovery detail
  - current implementation: visual only
- `AI decisions`
  - function: show AI decision log detail
  - current implementation: visual only

## 11. State Model

The screen should support:

- no selected run
- selected run loaded
- tab selection
- artifact action pending
- re-run handoff pending

Current implementation status:

- selected run loaded or no-report fallback is implemented
- tab selection state is not implemented
- artifact action state is not implemented
- re-run handoff state is not implemented

## 12. Validation and Rules

Current implemented rules:

- if no report view model can be selected, show no-report state
- `Data diff` handoff depends on the currently selected run name

Implicit intended rules:

- artifact actions should require a valid run identity
- re-run should preserve enough context to rebuild an execution form safely

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- selected run state owned by `App.tsx`
- run browsing from `reports`

### 13.2 Downstream Screens

The screen serves as an upstream context for:

- `dataDiff`
- future artifact viewer/downloader
- future re-run entry into `execution`

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- reports
- projects
- cases
- data diff

## 14. Screen Boundary

The `reportDetail` screen is responsible for:

- one-run summary display
- one-run screenshot/assertion overview
- data-diff handoff
- future artifact and re-run entry actions

The `reportDetail` screen is not currently responsible for:

- list browsing
- live runtime monitoring
- execution launch submission itself

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- current run-detail content is still based on the synthetic `ReportViewModel` layer rather than backend-authored report artifacts.
- `Download artifacts` is visible but not wired.
- `Re-run` is visible but not wired.
- only the `Data diff` tab is actionable; the rest do not switch the detail view.
- screenshot and assertion details are still placeholder-style UI data rather than loaded report artifact content.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
