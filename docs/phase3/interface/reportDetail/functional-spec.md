# Report Detail Functional Specification

Update note:
- `reportDetail` now opens with canonical `runId`.
- The page reads `GET /api/phase3/runs/{runId}/report` and tab-specific run endpoints, with snapshot fallback only when backend reads fail.
- `Download artifacts`, `Data diff`, and `Re-run` all operate on explicit `runId`.

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
- artifact listing / path review for the current run
- App-level re-run handoff back to `execution`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `ReportDetailScreen.tsx`.
- The page depends on:
  - `snapshot`
  - `selectedRunName`
  - `onBackToReports`
  - `onOpenDataDiff`
  - `onRerun`
  - `apiBaseUrl`
- run detail content is loaded from `GET /api/phase3/runs/{runId}/report` with fallback to `selectReportViewModel(snapshot, selectedRunName)`.
- `Reports` backlink is implemented.
- `Data diff` tab routes into `dataDiff`.
- `Download artifacts` is implemented: fetches `GET /api/phase3/runs/{runId}/artifacts` and opens an artifact listing drawer.
- `Re-run` is implemented: hands off run context into `execution` with launch form pre-filled.
- All tabs are implemented with active-tab state and tab-specific API fetches:
  - `Overview` shows summary from the main report API
  - `Steps` fetches `GET /api/phase3/runs/{runId}/steps`
  - `Assertions` fetches `GET /api/phase3/runs/{runId}/assertions`
  - `Recovery` fetches `GET /api/phase3/runs/{runId}/recovery`
  - `AI decisions` fetches `GET /api/phase3/runs/{runId}/ai-decisions`
- Backend implementation: `ReportArtifactService.java` provides recovery and ai-decisions endpoints with file-backed reads and mock fallbacks.

This matters for review:

- the screen is a real downstream detail entry page with API-backed tab data
- tab-specific data is fetched on demand when the tab is activated
- recovery and ai-decisions are served by the backend with deterministic mock data when no real run artifacts exist

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

- hero values are rendered from the API report or fallback view model
- `Download artifacts` fetches artifact list from backend and opens a listing drawer
- `Re-run` hands off run context into `execution` with launch form pre-filled

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

- `Overview` is the default active tab showing summary panels
- `Steps` fetches step timeline from `GET /api/phase3/runs/{runId}/steps`
- `Assertions` fetches assertion details from `GET /api/phase3/runs/{runId}/assertions`
- `Data diff` triggers route to `dataDiff`
- `Recovery` fetches recovery details from `GET /api/phase3/runs/{runId}/recovery`
- `AI decisions` fetches AI decision log from `GET /api/phase3/runs/{runId}/ai-decisions`
- tab-specific data is fetched on demand when the tab is first activated

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

- screenshot cards are rendered from the current report view model
- artifact access is implemented as backend-backed listing via `GET /api/phase3/runs/{runId}/artifacts`
- the current screen does not support inline artifact open/download content; it shows a listing drawer with file paths only

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
- artifact/re-run action outputs
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
  - `Download artifacts` (artifact listing from backend)
  - `Re-run` (App-level handoff to `execution` with run context)
  - `Overview` tab (default active, shows summary)
  - `Steps` tab (fetches from backend on activation)
  - `Assertions` tab (fetches from backend on activation)
  - `Recovery` tab (fetches from backend on activation)
  - `AI decisions` tab (fetches from backend on activation)
- not yet implemented:
  - none of the visible controls remain unwired

## 10. Functional Control Responsibility Matrix

### 10.1 Breadcrumb Controls

- `Reports`
  - function: return to the list page
  - output type: cross-screen navigation
  - current implementation: implemented

### 10.2 Hero Controls

- `Download artifacts`
  - function: retrieve or open run artifacts
  - output type: `GET /api/phase3/runs/{runId}/artifacts` then local artifact listing drawer
  - current implementation: implemented
- `Re-run`
  - function: reopen execution flow with current run context
  - output type: App-level handoff into `execution` with launch form pre-filled
  - current implementation: implemented

### 10.3 Tab Controls

- `Overview`
  - function: show current summary panels
  - current implementation: implemented (default active tab, uses main report API data)
- `Steps`
  - function: show step-level detail
  - current implementation: implemented (fetches `GET /api/phase3/runs/{runId}/steps` on activation)
- `Assertions`
  - function: show assertion-focused detail
  - current implementation: implemented (fetches `GET /api/phase3/runs/{runId}/assertions` on activation)
- `Data diff`
  - function: open downstream diff page
  - current implementation: implemented as App-level selected-run handoff
- `Recovery`
  - function: show restore/recovery detail
  - current implementation: implemented (fetches `GET /api/phase3/runs/{runId}/recovery` on activation)
- `AI decisions`
  - function: show AI decision log detail
  - current implementation: implemented (fetches `GET /api/phase3/runs/{runId}/ai-decisions` on activation)

## 11. State Model

The screen should support:

- no selected run
- selected run loaded
- tab selection
- artifact action pending
- re-run handoff pending

Current implementation status:

- selected run loaded or no-report fallback is implemented
- tab selection state is implemented (`ReportDetailTab` type)
- artifact listing drawer state is implemented
- re-run handoff is implemented via `onRerun` callback

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
- current artifact listing/review
- current re-run entry into `execution`

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
- artifact listing entry
- re-run entry handoff

The `reportDetail` screen is not currently responsible for:

- list browsing
- live runtime monitoring
- execution launch submission itself

## 15. Known Gaps and Review Items

Resolved items:

- `Download artifacts` is now wired: fetches `GET /api/phase3/runs/{runId}/artifacts` and opens a listing drawer.
- `Re-run` is now wired: hands off run context into `execution` via App-level handoff.
- All tabs are now actionable with tab-specific API fetches.
- `Recovery` and `AI decisions` backend endpoints are implemented in `ReportArtifactService` with mock fallback data.
- Overview tab shows real report data from `GET /api/phase3/runs/{runId}/report` or falls back to synthetic view model.

Remaining items:

- Recovery and AI decisions data are deterministic mock when no real run artifacts exist on disk.
- Screenshot and artifact content cannot be viewed/downloaded inline — the listing drawer shows file paths only.
- Re-run handoff carries `runId` but limited additional context (projectKey parsed from runId, no environment or model pre-fill from report).

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
