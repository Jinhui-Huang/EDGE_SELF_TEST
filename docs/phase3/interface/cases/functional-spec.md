# Cases Functional Specification

## 1. Document Position

- Screen name: `cases`
- Front-end implementation: `ui/admin-console/src/screens/CasesScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `cases` screen is the case-centered workspace of the Phase 3 admin console. It sits between project catalog maintenance and execution launch, and gives operators a focused place to:

- switch project context
- inspect which cases belong to the selected project
- open one case into a deeper detail canvas
- review the case's current test-flow summary, plans, and recent run posture
- hand the selected case into the `execution` screen through `Pre-execution`

According to the Phase 3 main documents, this screen is also the natural upstream entry for:

- DSL view/edit
- state-machine review
- plan review
- case history review

Those deeper capabilities are only partially surfaced in the current UI and are therefore documented here as reviewable intended behavior.

## 3. Operator Role

Primary users:

- QA platform operator
- test engineer maintaining executable cases
- platform reviewer preparing a case for execution

Typical usage moments:

- checking case coverage for one project
- opening one case to inspect its current test-flow summary
- sending one selected case into the execution workspace
- reviewing whether the case should move to DSL/state-machine maintenance

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `cases`

The screen is placed after `projects` and before `execution` in the common operator flow:

- `projects` provides project-centered entry context
- `cases` narrows work to a specific executable case
- `execution` consumes prepared case context for launch
- `reports` and `reportDetail` consume downstream run results

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `CasesScreen.tsx`.
- The page behaves as a case overview plus lower detail canvas with API-backed tab switching.
- The page performs direct `fetch` calls to the backend for case-detail artifacts (DSL, state-machine, plans, history).
- Implemented outward actions on the screen:
  - `Pre-execution`: stores prepared case context in app state for later use by `execution`
  - `Edit DSL`: switches to DSL tab, fetches `GET /api/phase3/cases/{caseId}/dsl`, provides validate (`POST .../dsl/validate`) and save (`PUT .../dsl`)
  - `State machine`: switches to State machine tab, fetches `GET /api/phase3/cases/{caseId}/state-machine`, provides save (`PUT .../state-machine`)
- Tab switching is implemented with local `activeTab` state; each non-overview tab fetches its data from the backend on activation.
- Backend implementation: `CaseDetailService.java` provides file-backed persistence under `config/phase3/case-details/<caseId>/`.
- App-level case save callbacks and labels exist in `App.tsx`, but the current `CasesScreen.tsx` does not render the editable catalog form that would use them.

This matters for review:

- the screen now includes both read-and-handoff and read/write capabilities for case detail artifacts
- app-level write capability for case catalog exists in the shell but is not exposed by this screen UI
- the DSL editor and state-machine viewer are functional with backend persistence

## 6. Functional Areas

### 6.1 Overview Card

Visible elements:

- screen eyebrow/title
- guidance text
- save-hint text
- collapse / expand button

Functional role:

- explain that project switching and case opening happen in the upper area
- keep the overview compact once the operator moves into the lower detail canvas

Current behavior:

- collapse toggle is implemented locally
- collapsed summary shows the currently opened case or selected project name

### 6.2 Project Switch Rail

Visible elements:

- one project button per `snapshot.projects`
- project name
- project scope
- project case count
- compact environment summary

Functional role:

- switch the case list into one project context
- provide quick project-level orientation before opening one case

Current behavior:

- implemented as local state change
- changing project also clears the currently opened case

### 6.3 Case Metrics Strip

Visible elements:

- visible cases
- active
- archived
- happy path

Functional role:

- summarize the currently filtered case population for the selected project

Current behavior:

- derived locally from `caseDraft`
- no backend request is sent by metric display

### 6.4 Case List Panel

Visible elements:

- case catalog eyebrow/title
- selected project name
- list rows
- row identity
- status badge
- updated time
- top three tags
- `Detail` / `Opened` action

Functional role:

- provide a compact project-scoped case list
- let the operator choose exactly one case for deeper review

Current behavior:

- `Detail` opens the lower detail canvas for that case
- empty state appears when no visible case matches the selected project

### 6.5 Detail Hero

Visible elements:

- breadcrumb-style path
- case title
- status badge
- detail subtitle
- hero actions:
  - `Edit DSL`
  - `State machine`
  - `Pre-execution`

Functional role:

- anchor the currently opened case context
- show the main downstream action choices from the case

Current behavior:

- `Pre-execution` is implemented as app-level state handoff
- `Edit DSL` is implemented: switches to DSL tab, loads DSL from backend, provides validate and save actions
- `State machine` is implemented: switches to State machine tab, loads state-machine data from backend, provides save action

### 6.6 Detail Tabs

Visible elements:

- `Overview`
- `DSL`
- `State machine`
- `Plans`
- `History`

Functional role:

- provide switchable case-detail sub-views backed by dedicated API endpoints
- each tab loads its data from `GET /api/phase3/cases/{caseId}/{action}` on activation

Current behavior:

- all tabs are visible and functional
- local `activeTab` state (`CaseDetailTab`) tracks the selected tab
- `Overview` shows the front-end-generated step summary (unchanged from original)
- `DSL` tab fetches and displays DSL with validate/save controls
- `State machine` tab fetches and displays nodes/edges/guards with save
- `Plans` tab fetches and displays plans list with preconditions
- `History` tab fetches and displays run history and maintenance events
- tab state resets to `overview` when the opened case changes

### 6.7 Detail Main Panel

Visible elements (varies by active tab):

- **Overview tab**: step list with action badge, selector, value, note / healed flag
- **DSL tab**: JSON textarea editor, validate button, save button, validation status, DSL version and metadata
- **State machine tab**: nodes list, edges list, guards list, save button
- **Plans tab**: plans list with name/summary/type, preconditions list
- **History tab**: run records with status/name/time, maintenance events

Functional role:

- show the operator the selected case detail artifact for the active tab

Current behavior:

- Overview tab: steps are derived by front-end helper `buildDetailSteps` (local presentational view model)
- DSL tab: loaded from `GET /api/phase3/cases/{caseId}/dsl`, editable as JSON, validate via `POST .../dsl/validate`, save via `PUT .../dsl`
- State machine tab: loaded from `GET /api/phase3/cases/{caseId}/state-machine`, save via `PUT .../state-machine`
- Plans tab: loaded from `GET /api/phase3/cases/{caseId}/plans`
- History tab: loaded from `GET /api/phase3/cases/{caseId}/history`

### 6.8 Detail Side Panels

Visible elements:

- `Info`
- `Plans`
- `Recent runs`
- case tags
- `Catalog status`

Functional role:

- summarize adjacent context needed before execution or maintenance review

Current behavior:

- panels are mostly local/static or snapshot-derived display
- `Catalog status` is the only area that reflects real mutation state from app-level `caseState`
- no side-panel control currently triggers a request

## 7. Data Semantics by Area

### 7.1 Case List Data

- list rows are driven by `caseDraft`
- `caseDraft` is rehydrated in `App.tsx` from `snapshot.cases`
- this means visible list data is shell-owned draft state, not screen-owned state

### 7.2 Detail Canvas Data

- detail title/status/project identity come from the currently opened row plus `snapshot.cases`
- Overview tab step list is front-end generated summary data
- DSL, state-machine, plans, and history tab content are loaded from dedicated backend APIs via `CaseDetailService`
- sidebar info/plans/recent-run panels remain presentational snapshot-derived display

### 7.3 Prepared Case Handoff Data

- `Pre-execution` uses the selected case as a source for:
  - `preparedCases`
  - `launchForm.projectKey`

This is a screen output, not a backend mutation.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- `caseDraft`
- `caseState`
- copy labels for case editor and tags
- callbacks:
  - `onPrepareCase`
  - `onCaseChange`
  - `onAddCaseRow`
  - `onRemoveCaseRow`
  - `onSubmit`

Important current boundary:

- only `onPrepareCase` is actually used by the rendered screen today
- the edit/save callbacks are part of app-level capability but are not surfaced in the current `CasesScreen.tsx`

### 8.2 Screen Outputs

The screen produces:

- local UI outputs
  - selected project change
  - overview collapsed state change
  - opened case change
- shell-level handoff output
  - prepared case intent via `onPrepareCase`
- mutation-state display output
  - rendering of `caseState` in the detail side panel

## 9. User Actions

Visible actions on this screen:

- collapse or expand overview
- switch project
- open one case detail
- review detail hero and detail side panels
- click `Edit DSL`
- click `State machine`
- click `Pre-execution`
- click one of the detail tabs

Current implementation summary:

- implemented:
  - overview collapse
  - project switch
  - open case detail
  - `Pre-execution`
  - `Edit DSL` (switches to DSL tab with backend-backed editor)
  - `State machine` (switches to State machine tab with backend-backed viewer)
  - tab switching (all 5 tabs: overview, DSL, state-machine, plans, history)
- not yet implemented:
  - none of the visible controls remain unwired

## 10. Functional Control Responsibility Matrix

### 10.1 Overview Controls

- collapse / expand button
  - function: compress or reveal the upper overview work area
  - output type: local screen state only
  - current implementation: implemented

### 10.2 Project Rail Controls

- project button
  - function: switch current project scope for visible cases
  - output type: local screen state only
  - current implementation: implemented

### 10.3 Case List Controls

- `Detail`
  - function: open the selected case into the lower detail canvas
  - output type: local screen state only
  - current implementation: implemented

### 10.4 Detail Hero Controls

- `Edit DSL`
  - function: switch to DSL tab and load the case DSL document from backend
  - downstream relation:
    - `GET /api/phase3/cases/{caseId}/dsl` (read)
    - `POST /api/phase3/cases/{caseId}/dsl/validate` (validate)
    - `PUT /api/phase3/cases/{caseId}/dsl` (save)
  - current implementation: implemented

- `State machine`
  - function: switch to State machine tab and load state-machine data from backend
  - downstream relation:
    - `GET /api/phase3/cases/{caseId}/state-machine` (read)
    - `PUT /api/phase3/cases/{caseId}/state-machine` (save)
  - current implementation: implemented

- `Pre-execution`
  - function: register current case as execution-ready context
  - downstream relation:
    - `execution`
  - current implementation: implemented through app-level state handoff

### 10.5 Detail Tabs

- `Overview`
  - function: show current mixed summary panel (front-end-generated steps)
  - current implementation: implemented (default active tab)
- `DSL`
  - function: load and show case DSL with JSON editor, validate, and save
  - request: `GET /api/phase3/cases/{caseId}/dsl` on tab activation
  - current implementation: implemented
- `State machine`
  - function: load and show state-machine nodes/edges/guards with save
  - request: `GET /api/phase3/cases/{caseId}/state-machine` on tab activation
  - current implementation: implemented
- `Plans`
  - function: load and show data/compare/restore plans and preconditions
  - request: `GET /api/phase3/cases/{caseId}/plans` on tab activation
  - current implementation: implemented
- `History`
  - function: load and show run history and maintenance events
  - request: `GET /api/phase3/cases/{caseId}/history` on tab activation
  - current implementation: implemented

## 11. State Model

The screen should support:

- project selected
- overview expanded
- overview collapsed
- no visible case for selected project
- one case opened
- no case opened
- prepared-for-execution handoff complete
- case mutation state display
- future DSL / state-machine / history sub-view state

Current implementation status:

- selected project state is implemented
- overview collapsed state is implemented
- opened case state is implemented
- prepared case handoff is implemented
- tab sub-view state is implemented (`activeTab` with `CaseDetailTab` type)
- per-tab API data state is implemented (dslData, smData, plansData, historyData)

## 12. Validation and Rules

Current visible-screen rules:

- hero actions are disabled until a case is opened
- changing project clears the opened case
- when the currently opened case is no longer visible after filtering, the opened detail is cleared

App-level case catalog save rules exist in `App.tsx`, even though the current screen does not expose the editor UI:

- at least one valid case row must remain
- valid row requires:
  - `id`
  - `projectKey`
  - `name`
- duplicate case id is rejected
- case row must reference an existing project key
- tags are normalized from comma-separated UI text

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- shell snapshot loading
- `caseDraft` ownership in `App.tsx`
- `caseState` ownership in `App.tsx`
- project catalog validity maintained by `projects`

### 13.2 Downstream Screens

The screen serves as an upstream context for:

- `execution`
  - through `Pre-execution`
- DSL editor (implemented inline as DSL tab with `CaseDetailService` backend)
- State-machine viewer (implemented inline as State machine tab with `CaseDetailService` backend)
- Plans viewer (implemented inline as Plans tab)
- History viewer (implemented inline as History tab)
- future history/report drill-down (clicking run rows → `reportDetail`)

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- `projects`
- `cases`
- `reports`
- `workQueue`
- `caseTags`

## 14. Screen Boundary

The `cases` screen is responsible for:

- project-scoped case visibility
- one-case-at-a-time detail focus
- pre-execution handoff into `execution`
- exposing where case maintenance should continue next

The `cases` screen is not currently responsible for:

- directly starting execution
- directly sending scheduler requests/events
- persisting case catalog rows from visible controls in the current UI build (app-level capability exists but editor form is not exposed)

## 15. Known Gaps and Review Items

Resolved items (P2-3):

- `Edit DSL` is now implemented with backend-backed DSL read/validate/save.
- `State machine` is now implemented with backend-backed read/save.
- Tabs now switch the detail canvas with API-backed data loading.
- Detail main panel content is now driven by per-tab backend data for DSL, state-machine, plans, and history tabs.

Remaining items:

- Sidebar info/plans/recent-run panels remain presentational snapshot-derived display (not yet connected to per-tab API data).
- App-level case save capability exists, but the current `cases` screen does not expose an actual editable catalog form.
- History tab run row click does not yet hand off to `reportDetail`.
- `Recent runs` summary bars in sidebar are still display-only placeholders.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
