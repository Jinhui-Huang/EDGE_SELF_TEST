# Execution Interface Specification

## 1. Scope and Design Basis

- Screen: `execution`
- UI implementation:
  - `ui/admin-console/src/screens/ExecutionScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ConfigPersistenceService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/react_page_skeleton_prompt_guide.md`
  - `docs/phase3/main/edge_extension_native_messaging_protocol_detailed_design.md`

This document distinguishes:

- direct read interfaces
- direct write interfaces
- local-only screen controls
- app-state-only handoff data
- backend-backed compare-template data with local fallback
- detailed implementation design for currently unwired controls

## 2. Interface Summary

Current `execution` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- direct write sources:
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`
- no dedicated execution-read endpoint is called by this screen today
- prepared-case payload comes from app state, not from a direct backend read
- compare-template options read from `GET /api/phase3/data-templates`; falls back to local seeded list when API is unavailable

## 3. Direct Read Interface: GET /api/phase3/admin-console

### 3.1 Purpose for Execution Screen

The `execution` screen uses the shared admin-console snapshot for all current read-only operational context.

Relevant snapshot fields for this screen:

- `projects[]`
- `workQueue[]`
- `modelConfig[]`
- `environmentConfig[]`
- `constraints[]`
- `summary`

### 3.2 Functional Role by Field

- `projects[]`
  - supplies project selection options and compact project notes
- `workQueue[]`
  - drives queue state badge, queue board, and readiness summary
- `modelConfig[]`
  - supplies runtime-policy display summary
- `environmentConfig[]`
  - is parsed into `databaseConfigs`
- `constraints[]`
  - supports readiness and policy explanation
- `summary`
  - fallback execution context messaging

### 3.3 Ownership Boundary

- backend/local-admin-api owns the raw snapshot
- `App.tsx` owns snapshot fetch and parsing
- `ExecutionScreen.tsx` owns only local presentational state such as template-dropdown open/close

## 4. App-State Input Boundary: Prepared Cases

Prepared cases are critical to the execution screen but are not loaded by this screen from the backend.

### 4.1 Source

- upstream screen: `cases`
- state owner: `App.tsx`
- population path: `handlePrepareCase(caseId)`

### 4.2 Functional Role

- determines which cases are shown in the prepared-case panel
- gates whether `Execution` can be pressed for the current project

### 4.3 Current Filtering Rule

`ExecutionScreen.tsx` computes:

```ts
preparedCases.filter((item) => item.projectKey === launchForm.projectKey)
```

This means:

- prepared cases only matter to the current selected project
- a prepared case for another project does not satisfy the execution-ready condition

## 5. Compare Template Data Source

The execution screen presents compare-template selection backed by the shared backend template registry.

### 5.1 Current Source

- `GET /api/phase3/data-templates` (same backend registry used by `dataTemplates` screen)
- `defaultDataTemplates` in `App.tsx` as fallback when API is unavailable

### 5.2 Current Behavior

- templates are filtered by `projectKey`
- selection is local to app state via `selectedExecutionTemplateIds`

### 5.3 Interface Implication

Both `execution` and `dataTemplates` share the same backend-owned template registry. The local constant is only a fallback, not the primary source.

## 6. Direct Write Interface: POST /api/phase3/scheduler/requests

### 6.1 Purpose

Queue a run into the local Phase 3 scheduler request list.

### 6.2 Current Caller

- `handleLaunchSubmit()` in `App.tsx`

### 6.3 HTTP Contract

- Method: `POST`
- Path: `/api/phase3/scheduler/requests`
- Success status: `202`
- Content type: `application/json`

### 6.4 Current Request Body Design

Current UI sends:

```json
{
  "runId": "checkout-web-smoke",
  "projectKey": "checkout-web",
  "owner": "qa-platform",
  "environment": "prod-like",
  "targetUrl": "https://checkout.demo.internal/cart",
  "executionModel": "claude-4.5-sonnet",
  "databaseId": "oracle-checkout-main",
  "detail": "Accepted from operator launch panel.",
  "status": "PRE_EXECUTION",
  "title": "checkout-web-smoke / prod-like"
}
```

Required by backend:

- `runId`

Common UI-sent fields:

- `projectKey`
- `owner`
- `environment`
- `targetUrl`
- `executionModel`
- `databaseId`
- `detail`
- `status`
- `title`

### 6.5 Front-End Behavior Before Send

Current UI behavior:

- prevents default form submit
- sends current `launchForm`
- hardcodes:
  - `status = "PRE_EXECUTION"`
  - `title = "${runId} / ${environment}"`
- does not perform deeper payload validation beyond normal controlled input state

### 6.6 Persistence Design in local-admin-api

Implemented by `SchedulerPersistenceService.appendRequest()`:

- validates `runId`
- derives `schedulerId`
- defaults `owner` to `scheduler` if blank
- fills `title` if blank
- fills `detail` if blank
- normalizes request status to uppercase underscore form
- persists into `scheduler-requests.json`

### 6.7 Response Design

Current response shape:

```json
{
  "status": "ACCEPTED",
  "kind": "scheduler-request",
  "path": "D:\\...\\scheduler-requests.json",
  "schedulerId": "local-phase3-scheduler",
  "totalEntries": 5,
  "entry": {
    "runId": "checkout-web-smoke",
    "projectKey": "checkout-web",
    "owner": "qa-platform",
    "environment": "prod-like",
    "title": "checkout-web-smoke / prod-like",
    "detail": "Accepted from operator launch panel.",
    "status": "PRE_EXECUTION",
    "schedulerId": "local-phase3-scheduler",
    "requestedAt": "2026-04-20T05:20:00Z"
  }
}
```

### 6.8 Post-Save Reflection Path

After request acceptance:

1. `postSchedulerMutation()` completes
2. `App.tsx` calls `loadSnapshot()`
3. shell reloads `GET /api/phase3/admin-console`
4. queue and scheduler-derived snapshot fields refresh
5. `launchState` becomes success or error

## 7. Direct Write Interface: POST /api/phase3/scheduler/events

This endpoint is used for two separate execution-screen behaviors:

- execution start
- review/audit event recording

### 7.1 Purpose

Record lifecycle or audit events for a run in the local scheduler event stream.

### 7.2 Current Callers

- `handleExecuteSubmit()` in `App.tsx`
- `handleReviewSubmit()` in `App.tsx`

### 7.3 HTTP Contract

- Method: `POST`
- Path: `/api/phase3/scheduler/events`
- Success status: `202`
- Content type: `application/json`

### 7.4 Execution-Start Request Body Design

Current `Execution` button sends:

```json
{
  "runId": "checkout-web-smoke",
  "projectKey": "checkout-web",
  "owner": "qa-platform",
  "environment": "prod-like",
  "targetUrl": "https://checkout.demo.internal/cart",
  "executionModel": "claude-4.5-sonnet",
  "databaseId": "oracle-checkout-main",
  "detail": "Accepted from operator launch panel.",
  "title": "checkout-web-smoke / prod-like",
  "type": "STARTED",
  "state": "RUNNING",
  "status": "RUNNING"
}
```

### 7.5 Review Request Body Design

Current review form sends:

```json
{
  "runId": "checkout-web-smoke",
  "projectKey": "checkout-web",
  "owner": "audit-operator",
  "environment": "prod-like",
  "targetUrl": "",
  "executionModel": "claude-4.5-sonnet",
  "databaseId": "oracle-checkout-main",
  "detail": "Operator review opened from the admin console.",
  "type": "NEEDS_REVIEW",
  "status": "NEEDS_REVIEW"
}
```

### 7.6 Front-End Behavior Before Send

Current `Execution` button behavior:

- does not submit the form element
- is enabled only when:
  - `runId` exists
  - `projectKey` exists
  - at least one prepared case exists for the selected project
- sends scheduler event through `postSchedulerMutation()`

Current review behavior:

- submits review form
- sends review event through `postSchedulerMutation()`

### 7.7 Persistence Design in local-admin-api

Implemented by `SchedulerPersistenceService.appendEvent()`:

- validates `runId`
- derives `schedulerId`
- normalizes `type`, `state`, and `status`
- fills timestamp `at`
- defaults `type = INFO` only when no lifecycle field exists
- persists into `scheduler-events.json`

### 7.8 Response Design

Current response shape:

```json
{
  "status": "ACCEPTED",
  "kind": "scheduler-event",
  "path": "D:\\...\\scheduler-events.json",
  "schedulerId": "local-phase3-scheduler",
  "totalEntries": 14,
  "entry": {
    "runId": "checkout-web-smoke",
    "projectKey": "checkout-web",
    "owner": "qa-platform",
    "environment": "prod-like",
    "title": "checkout-web-smoke / prod-like",
    "detail": "Accepted from operator launch panel.",
    "type": "STARTED",
    "state": "RUNNING",
    "status": "RUNNING",
    "schedulerId": "local-phase3-scheduler",
    "at": "2026-04-20T05:21:00Z"
  }
}
```

### 7.9 Post-Save Reflection Path

After event acceptance:

1. `postSchedulerMutation()` completes
2. `App.tsx` calls `loadSnapshot()`
3. shell reloads `GET /api/phase3/admin-console`
4. queue and report-adjacent derived snapshot fields refresh
5. `executeState` or `reviewState` becomes success or error

## 8. Local-Only Screen Controls

These controls change UI or app state without directly calling the backend.

### 8.1 Launch Form Inputs

- owner: `launchForm`
- request: none during typing/selecting
- effect:
  - updates current launch payload

### 8.2 Compare Template Multi-Select

- owner: `selectedExecutionTemplateIds`
- request: none
- effect:
  - updates local compare-template selection

### 8.3 Database Select

- owner: `launchForm.databaseId`
- request: none
- effect:
  - changes selected data boundary

### 8.4 Review Form Inputs

- owner: `reviewForm`
- request: none during typing
- effect:
  - updates pending review-event payload

### 8.5 `Open Exec Monitor`

- owner: app-level screen routing with run context handoff
- request: none
- effect:
  - calls `openMonitor(launchForm.runId)` which sets `selectedMonitorRunId` and navigates to `monitor`
  - the monitor screen receives `selectedRunId` as a prop and fetches runtime APIs for that run

## 9. UI Control to Interface Mapping

### 9.1 Header Controls

#### `Open Exec Monitor`

- user action: click
- request: none (navigation with run context handoff)
- owner: `App.tsx` route state + `selectedMonitorRunId`
- success behavior: navigate to `monitor` with `launchForm.runId` as the canonical run identifier
- failure behavior: none required
- current state: implemented — `openMonitor(launchForm.runId)` sets `selectedMonitorRunId` and switches to monitor screen

#### Execution contract hint button

- user action: click
- request: none
- owner: `ExecutionScreen.tsx` local UI state
- current behavior:
  - opens a local execution-contract help panel
  - shows current key inputs, request targets, mutation states, and handoff boundaries
  - does not call a backend endpoint or change routes
- current state: implemented

### 9.2 Launch Controls

#### `Run ID` input

- user action: type
- request: none during typing
- owner: `launchForm`
- current state: implemented

#### `Project` select

- user action: select
- request: none during selection
- owner: `launchForm.projectKey`
- side effects:
  - changes prepared-case filtering
  - changes available compare-template list
- current state: implemented

#### `Owner` input

- user action: type
- request: none during typing
- current state: implemented

#### `Environment` input

- user action: type
- request: none during typing
- current state: implemented

#### `Target URL` input

- user action: type
- request: none during typing
- current state: implemented

#### `Execution model` select

- user action: select
- request: none during selection
- owner: `launchForm.executionModel`
- current state: implemented

#### `Compare data templates` multi-select

- user action: open dropdown / toggle checkbox
- request: none today
- owner: local app state
- data source:
  - `GET /api/phase3/data-templates`
  - local fallback `dataTemplates` when API is unavailable
- current state: implemented

#### `Database connection` select

- user action: select
- request: none during selection
- owner: `launchForm.databaseId`
- data source:
  - parsed `databaseConfigs`
- current state: implemented

#### `Detail` textarea

- user action: type
- request: none during typing
- current state: implemented

#### `Run`

- user action: click submit
- request:
  - `POST /api/phase3/scheduler/requests`
- owner:
  - payload assembly in `App.tsx`
  - persistence in local-admin-api
- success feedback:
  - `launchState` success message
  - refreshed snapshot
- failure feedback:
  - `launchState` error message
- current state: implemented

#### `Execution`

- user action: click
- request:
  - `POST /api/phase3/scheduler/events`
- owner:
  - readiness gating and payload assembly in `App.tsx`
  - persistence in local-admin-api
- success feedback:
  - `executeState` success message
  - refreshed snapshot
- failure feedback:
  - `executeState` error message
- current state: implemented

### 9.3 Prepared Cases and Readiness Controls

#### Prepared-case card

- user action: click
- request: none
- owner: `App.tsx` screen-state handoff into `cases`
- current behavior:
  - prepared-case card emits `caseId` + `projectKey`
  - `App.tsx` stores the current cases project/case context
  - the screen navigates back to `cases`
- current state: implemented

#### Readiness `Open Exec Monitor`

- user action: click
- request: none
- current state: implemented

### 9.4 Queue Controls

#### Queue row

- user action: click
- request: none
- owner: `App.tsx` screen-state handoff via `openMonitor()`
- current behavior:
  - queue row button emits the queue `title`
  - `App.tsx` derives the current run identity from the queue-title prefix
  - the screen navigates to `monitor`
- current state: implemented

### 9.5 Review Controls

#### Review form inputs

- user action: type
- request: none during typing
- current state: implemented

#### `Open Audit`

- user action: click submit
- request:
  - `POST /api/phase3/scheduler/events`
- owner:
  - payload assembly in `App.tsx`
  - persistence in local-admin-api
- success feedback:
  - `reviewState` success message
  - refreshed snapshot
- failure feedback:
  - `reviewState` error message
- current state: implemented

## 10. Error Handling Boundary

Current mutation errors:

- non-2xx response from scheduler endpoints
- JSON/body validation errors in local-admin-api
- missing required `runId`

Current front-end gating:

- only `Execution` is strongly gated by the UI
- `Run` and `Open Audit` rely mostly on controlled input state and backend validation

Current surfacing:

- request errors are mapped into:
  - `launchState`
  - `executeState`
  - `reviewState`
- `MutationStatus` renders them on screen

## 11. Relationship to Other Interfaces

### 11.1 Relationship to Cases

- `execution` depends on prepared-case context handed off from `cases`
- current prepared-case data is in-memory app state only

### 11.2 Relationship to Models

- execution model selection is populated from parsed model providers
- actual provider persistence belongs to `models`

### 11.3 Relationship to Environments

- database selection is populated from parsed environment config
- actual datasource persistence belongs to `environments`

### 11.4 Relationship to Monitor

- `execution` provides the operator handoff into `monitor` via `openMonitor(launchForm.runId)`
- the handoff passes canonical `runId` through `selectedMonitorRunId` app state
- monitor is the downstream owner of runtime progress and live event detail

### 11.5 Relationship to Reports and Data Diff

- current execution screen does not directly open report detail or data diff
- but run lifecycle initiated here should later surface in:
  - `reports`
  - `reportDetail`
  - `dataDiff`

## 12. Future Interface Evolution from Main Design Docs

The main design docs imply richer run/execution APIs such as:

- execution start
- execution status
- run detail
- runtime event stream
- data-prepare / restore visibility

Current Phase 3 implementation choice:

- keep execution launch on simple scheduler request/event append endpoints
- keep read context on the aggregated admin snapshot

Recommended rule for this phase:

- do not replace the existing scheduler append endpoints during documentation-only work
- add dedicated execution-detail APIs only when the UI is ready to show true runtime detail rather than snapshot summaries

## 13. Detailed Implementation Design for Currently Unwired Controls

This section gives concrete implementation design for visible controls that still do not have real behavior, plus the current design notes for newly wired local controls.

### 13.1 Execution Contract Hint Button

Current visible label:

- `POST /scheduler/requests + /scheduler/events`

Implemented type:

- local help drawer or side panel
- no backend endpoint required

Reasoning:

- the label is documentation-oriented, not a business action
- routing it to a backend mutation would be incorrect

Current implementation design:

- click opens a local drawer containing:
  - current key inputs:
    - `Run ID`
    - `Project`
    - `Owner`
    - `Environment`
    - `Target URL`
    - `Execution model`
    - `Compare data templates`
    - `Database connection`
  - request mapping for:
    - `Run -> POST /api/phase3/scheduler/requests`
    - `Execution -> POST /api/phase3/scheduler/events`
    - `Open Audit -> POST /api/phase3/scheduler/events`
  - current mutation-state summary:
    - `launchState`
    - `executeState`
    - `reviewState`
  - current handoff boundary summary:
    - prepared cases are app-state-only input from `cases`
    - queue is read-only snapshot data from `GET /api/phase3/admin-console`
    - monitor handoff is `openMonitor(launchForm.runId)`

Request behavior:

- immediate click request: none

### 13.2 Queue Row Drill-Down

Implemented type:

- route-state handoff
- no new backend endpoint required

Current implementation design:

- `ExecutionScreen.tsx` exposes queue rows as buttons with explicit `aria-label`
- click calls app-level `onOpenQueueItem(itemTitle)`
- `App.tsx` derives the current run identity from `itemTitle`
  - current rule: split on `" / "` and use the first segment
  - fallback: use the whole trimmed title when no separator exists
- `App.tsx` then reuses `openMonitor(runId)`

Reasoning:

- current queue data comes from shared snapshot
- current queue item shape only exposes `title`, `owner`, `state`, and `detail`
- that shape is sufficient for a stable monitor handoff but not sufficient for reliable monitor-vs-report branching without inventing new metadata
- first implementation therefore fixes the drill-down target to `monitor`

### 13.3 Prepared-Case Card Drill-Down

Implemented type:

- app-level handoff into `cases`
- no new backend endpoint required

Current implementation design:

- `ExecutionScreen.tsx` exposes prepared-case cards as buttons with explicit `aria-label`
- click calls app-level `onOpenPreparedCase(caseId, projectKey)`
- `App.tsx` stores:
  - `selectedCaseProjectKey`
  - `selectedCaseId`
- `App.tsx` switches to `cases`
- `CasesScreen.tsx` consumes:
  - `initialProjectKey`
  - `initialCaseId`
- `CasesScreen.tsx` reopens the matching case in the existing lower detail canvas

Reasoning:

- prepared-case data already exists in app state
- project + case identity is enough for the current lightweight reopen behavior
- the drill-down reuses the existing cases detail surface instead of introducing a new route, new backend detail read, or typed router payload

### 13.4 Future Backend for Compare Templates

This control is implemented locally today, but the screen design implies a real backend-backed catalog in the future.

Recommended implementation type:

- new read interface
- optional new save/import interfaces owned by `dataTemplates`

Recommended read endpoint:

#### `GET /api/phase3/data-templates`

Query parameters:

- `projectKey`
- `mode=compare`

Example:

`GET /api/phase3/data-templates?projectKey=checkout-web&mode=compare`

Response body:

```json
{
  "projectKey": "checkout-web",
  "items": [
    {
      "id": "order-seed-v2",
      "name": "order.seed.v2",
      "type": "composite",
      "compareSummary": "Compare order, order_items, and stock deltas"
    }
  ]
}
```

First-phase UI behavior after this endpoint exists:

- selecting project triggers template reload
- checkbox toggles remain local only until run submission

### 13.5 Future Runtime Detail Entry

The main design docs describe richer execution and monitor detail. Once the UI is approved for deeper runtime detail, the recommended interface addition is:

#### `GET /api/phase3/runs/{runId}/status`

Purpose:

- load live or latest known runtime state for one run

Response body:

```json
{
  "runId": "checkout-web-smoke",
  "status": "RUNNING",
  "currentStep": "submit-payment",
  "currentPage": "/checkout",
  "model": "claude-4.5-sonnet",
  "artifacts": 12,
  "lastUpdatedAt": "2026-04-20T05:22:10Z"
}
```

Current recommendation:

- do not require this endpoint for the current execution page because the approved UI still routes detailed runtime observation to `monitor`

## 14. Review Items

Review-only findings:

- This screen already owns the first real scheduler mutations in the Phase 3 shell.
- `Run`, `Execution`, and `Open Audit` are correctly separated into request-vs-event semantics.
- Prepared-case gating is a front-end execution readiness rule, not a backend request requirement.
- The compare-template selector now reads the shared backend template registry with local fallback.
- The header contract hint and queue-row drill-down are now implemented with local/app-level behavior only.
- Prepared-case cards now reuse the existing app-level `cases` handoff without adding a prepared-case detail endpoint.

These are documentation findings only. No implementation change is made in this stage.
