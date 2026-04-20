# Execution Functional Specification

## 1. Document Position

- Screen name: `execution`
- Front-end implementation: `ui/admin-console/src/screens/ExecutionScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `execution` screen is the Phase 3 launch-and-control workspace. It is the first screen that turns operator intent into real scheduler mutations.

Its job is to:

- bind a run identity and execution context
- consume prepared cases handed over from `cases`
- let the operator choose project, environment, model, compare templates, and database context
- queue a run through `Run`
- start the run through `Execution`
- record review / audit state through the review form
- hand off into `monitor` for runtime observation

This screen answers these operator questions:

- Is the run context complete enough to start?
- Which prepared cases will join the run?
- Which model and database boundary are currently bound?
- Has the run been queued, started, or moved into review?

## 3. Operator Role

Primary users:

- QA platform operator
- test operations owner starting runs manually
- audit or release reviewer recording review state

Typical usage moments:

- after selecting cases and using `Pre-execution`
- before opening `monitor`
- when binding data-compare templates and database scope
- when recording a run as `NEEDS_REVIEW`

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `execution`

The screen sits in the middle of the execution flow:

- upstream:
  - `projects`
  - `cases`
  - `models`
  - `environments`
  - `dataTemplates`
- downstream:
  - `monitor`
  - `reports`
  - `reportDetail`
  - `dataDiff`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `ExecutionScreen.tsx`.
- The page is split into a launch form, prepared-case panel, readiness panel, queue board, and review form.
- The page does not fetch directly; it depends on shell-managed data and mutation handlers.
- `Run` posts a scheduler request.
- `Execution` posts a scheduler event.
- the review form posts a scheduler event.
- `Open Exec Monitor` is implemented as screen navigation.
- project/model/database/template selectors are implemented as local state changes only.
- the page uses a mix of true shared data and front-end-only helper data.

This distinction matters:

- scheduler mutations are real
- monitor navigation is real
- compare-template content is still front-end seeded rather than backend-backed

## 6. Functional Areas

### 6.1 Header Area

Visible elements:

- execution path text
- screen title
- queue state badge
- environment pill
- model pill
- `Open Exec Monitor` button
- execution contract hint button

Functional role:

- anchor the operator in the run-control context
- expose the current top-level status and quick monitor entry

Current behavior:

- `Open Exec Monitor` is implemented
- the execution contract hint is visible but not wired

### 6.2 Execution Progress Card

Visible elements:

- readiness ring
- prepared-case count
- selected compare-template count
- progress bar
- compact project/database/queue stats

Functional role:

- summarize whether the current launch context is ready enough to proceed

Current behavior:

- all values are composed from current form state, prepared-case state, and snapshot data
- no backend request is triggered by the card itself

### 6.3 Launch Panel

Visible elements:

- run id input
- project select
- owner input
- environment input
- target URL input
- execution model select
- compare data templates multi-select
- database connection select
- detail textarea
- `Run` button
- `Execution` button
- mutation-status feedback

Functional role:

- gather launch context
- turn operator intent into scheduler queue and start events

Current behavior:

- all field edits are local app-state updates until a button is pressed
- `Run` submits the launch form
- `Execution` is enabled only when:
  - `runId` is non-empty
  - `projectKey` is non-empty
  - at least one prepared case exists for the selected project

### 6.4 Prepared Cases Panel

Visible elements:

- prepared-case count hero
- prepared-case cards
- empty-state message

Functional role:

- confirm which cases from `cases` are actually bound to the current project/run context

Current behavior:

- display only
- filtered by current `launchForm.projectKey`
- no card-level action is implemented

### 6.5 Execution Readiness Panel

Visible elements:

- project summary
- prepared-case summary
- runtime policy summary
- data boundary summary
- queue pressure summary
- monitor button

Functional role:

- give the operator a final pre-start cross-check

Current behavior:

- display-only summary plus implemented monitor navigation

### 6.6 Queue Board

Visible elements:

- queue list
- queue row title
- queue detail
- owner
- state

Functional role:

- let the operator see nearby queue pressure and scheduler context while preparing the run

Current behavior:

- display only
- rows are not clickable

### 6.7 Review Board

Visible elements:

- run id input
- project input
- owner input
- environment input
- audit detail textarea
- `Open Audit` submit button
- mutation-status feedback

Functional role:

- record a review-oriented scheduler event for the run

Current behavior:

- field edits are local app-state updates
- submit posts a review event

## 7. Data Semantics by Area

### 7.1 Shared Snapshot Data

The screen derives display context from:

- `snapshot.projects`
- `snapshot.workQueue`
- `snapshot.modelConfig`
- `snapshot.environmentConfig`
- `snapshot.constraints`
- `snapshot.summary`

### 7.2 Prepared Case Data

- prepared-case data is not loaded from the backend by this screen
- it is app-owned state built upstream by `cases`

### 7.3 Compare Template Data

- compare-template options are currently provided by front-end seeded `dataTemplates`
- this is not yet a true backend-backed execution-template catalog

### 7.4 Database Config Data

- database options are parsed in `App.tsx` from `snapshot.environmentConfig`
- execution screen consumes the parsed result as a selection list

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- `launchForm`
- `reviewForm`
- `preparedCases`
- `dataTemplates`
- `databaseConfigs`
- `selectedTemplateIds`
- `selectedDatabaseId`
- mutation states:
  - `launchState`
  - `executeState`
  - `reviewState`
- callbacks:
  - `onLaunchFormChange`
  - `onReviewFormChange`
  - `onSelectedTemplateIdsChange`
  - `onSelectedDatabaseIdChange`
  - `onLaunchSubmit`
  - `onExecuteSubmit`
  - `onReviewSubmit`
  - `onOpenMonitor`

### 8.2 Screen Outputs

The screen produces:

- local UI outputs
  - launch form edits
  - review form edits
  - compare-template selection changes
  - database selection changes
- scheduler mutation outputs
  - run request intent
  - execution-start event intent
  - review event intent
- navigation output
  - monitor entry intent

## 9. User Actions

Visible actions on this screen:

- open execution monitor
- edit launch fields
- toggle compare templates
- change database connection
- click `Run`
- click `Execution`
- inspect prepared cases
- inspect readiness
- inspect queue board
- edit review fields
- click `Open Audit`

Current implementation summary:

- implemented:
  - launch field edits
  - template selection
  - database selection
  - `Run`
  - `Execution`
  - `Open Exec Monitor`
  - review field edits
  - `Open Audit`
- visible but not implemented:
  - execution contract hint button in header
  - queue row drill-down
  - prepared-case card drill-down

## 10. Functional Control Responsibility Matrix

### 10.1 Header Controls

- `Open Exec Monitor`
  - function: route operator into runtime monitor
  - output type: cross-screen navigation
  - current implementation: implemented
- execution contract hint button
  - function: should expose launch/event contract or operator guidance
  - output type: future local help panel or interface reference
  - current implementation: visual only

### 10.2 Launch Controls

- launch form inputs/selects
  - function: mutate the pending scheduler context
  - output type: local app-state change only
  - current implementation: implemented
- compare-template multi-select
  - function: choose compare targets for the current run context
  - output type: local selection state only
  - current implementation: implemented
- database connection select
  - function: bind the current execution data boundary
  - output type: local selection state only
  - current implementation: implemented
- `Run`
  - function: enqueue pre-execution scheduler request
  - output type: real backend mutation
  - current implementation: implemented
- `Execution`
  - function: emit run-start event
  - output type: real backend mutation
  - current implementation: implemented

### 10.3 Readiness and Queue Controls

- readiness monitor button
  - function: route into runtime monitor
  - output type: cross-screen navigation
  - current implementation: implemented
- queue row
  - function: should let the operator inspect the run/queue item in more detail
  - output type: future run drill-down
  - current implementation: display only

### 10.4 Review Controls

- review form inputs
  - function: mutate pending review-event content
  - output type: local app-state change only
  - current implementation: implemented
- `Open Audit`
  - function: record review/audit intent as a scheduler event
  - output type: real backend mutation
  - current implementation: implemented

## 11. State Model

The screen should support:

- idle launch form
- launch mutation pending
- launch mutation success
- launch mutation error
- execution-start pending
- execution-start success
- execution-start error
- review mutation pending
- review mutation success
- review mutation error
- prepared-case empty state
- prepared-case ready state
- monitor handoff

Current implementation status:

- mutation states are implemented
- execution readiness gate is implemented
- template selection normalization is implemented
- database selection fallback is implemented
- deeper queue/run drill-down state is not implemented

## 12. Validation and Rules

Current implemented rules:

- `Execution` button is disabled until:
  - `runId.trim()` is present
  - `projectKey.trim()` is present
  - `preparedCasesForProject.length > 0`
- selected compare-template ids are normalized against templates available for the selected project
- if no valid selected template remains for the selected project, the first available template is auto-selected
- if no available template exists for the selected project, selected template ids are cleared
- selected database id is normalized against the current database config list

Current mutation boundary rule:

- backend scheduler endpoints only require `runId`
- the UI currently performs only lightweight readiness gating, not deep pre-submit validation

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- prepared case context from `cases`
- model provider configuration from `models`
- database config from `environments`
- compare-template source from `dataTemplates` seed data

### 13.2 Downstream Screens

The screen serves as an upstream context for:

- `monitor`
- `reports`
- `reportDetail`
- `dataDiff`

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- projects
- work queue
- model config
- environment config
- constraints

## 14. Screen Boundary

The `execution` screen is responsible for:

- binding run context
- consuming prepared case context
- posting scheduler request/event mutations
- recording review events
- routing into runtime monitor

The `execution` screen is not currently responsible for:

- building prepared cases itself
- loading true runtime monitor detail
- loading full run report detail
- loading true backend-backed compare-template catalog

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- the header contract hint is rendered as a button but has no behavior.
- queue rows are not wired to a detail or monitor drill-down.
- prepared-case cards are not wired back to `cases` or forward to run/report context.
- compare templates are still front-end seeded data, not backend-backed execution assets.
- the launch form has only lightweight front-end validation, while the backend request endpoint accepts a broader but minimally validated payload.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
