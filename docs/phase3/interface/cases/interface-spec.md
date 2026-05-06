# Cases Interface Specification

## 1. Scope and Design Basis

- Screen: `cases`
- UI implementation:
  - `ui/admin-console/src/screens/CasesScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CaseDetailService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/react_page_skeleton_prompt_guide.md`
  - `docs/phase3/main/edge_extension_native_messaging_protocol_detailed_design.md`
  - `docs/phase3/main/cdp_domain_encapsulation_detailed_design.md`

This document distinguishes:

- direct read interfaces
- screen-adjacent write and handoff interfaces
- local-only UI state transitions
- currently implemented app-level case-catalog mutation path
- implemented case-detail read/write interfaces (DSL, state-machine, plans, history)

## 2. Interface Summary

Current `cases` screen conclusion:

- direct read source for overview/list data:
  - `GET /api/phase3/admin-console`
- direct read/write interfaces for case detail artifacts:
  - `GET /api/phase3/cases/{caseId}/dsl` (read DSL)
  - `POST /api/phase3/cases/{caseId}/dsl/validate` (validate DSL)
  - `PUT /api/phase3/cases/{caseId}/dsl` (save DSL)
  - `GET /api/phase3/cases/{caseId}/state-machine` (read state-machine)
  - `PUT /api/phase3/cases/{caseId}/state-machine` (save state-machine)
  - `GET /api/phase3/cases/{caseId}/plans` (read plans)
  - `GET /api/phase3/cases/{caseId}/history` (read history)
- backend-backed tabs now surface explicit loading / empty / error states, plus local mutation feedback where save or validate exists
- real implemented handoff:
  - `Pre-execution` updates app-level prepared-case state and later feeds `execution`
- app-level case catalog write capability exists in the shell:
  - `POST /api/phase3/catalog/case`
- backend implementation: `CaseDetailService.java` provides file-backed persistence under `config/phase3/case-details/<caseId>/`

## 3. Direct Read Interface: GET /api/phase3/admin-console

### 3.1 Purpose for Cases Screen

The `cases` screen uses the shared admin-console snapshot for the overview/list read model. It also fetches case-specific detail endpoints for the DSL, state-machine, plans, and history tabs.

Relevant snapshot fields for this screen:

- `projects[]`
- `cases[]`
- `reports[]`
- `caseTags[]`
- `workQueue[]`

### 3.2 Functional Role by Field

- `projects[]`
  - drives the project switch rail
  - provides name, scope, and environment-count display context
- `cases[]`
  - seeds `caseDraft`
  - provides case identity, status, updated time, archived flag
- `reports[]`
  - indirect downstream context for future case history / report drill-down
- `caseTags[]`
  - supplies the shared case-tag vocabulary panel
- `workQueue[]`
  - indirect operational context for future execution-related handoff or history interpretation

### 3.3 Ownership Boundary

- backend/local-admin-api owns the raw snapshot and case-detail artifacts
- `App.tsx` owns snapshot fetch and rehydration into `caseDraft`, and passes `apiBaseUrl` to `CasesScreen`
- `CasesScreen.tsx` owns local presentational state and per-tab API data:
  - `selectedProjectKey`
  - `openedCaseId`
  - `overviewCollapsed`
  - `activeTab` (`CaseDetailTab`)
  - per-tab remote states for DSL, state-machine, plans, and history
  - `dslDraft`, `dslValidation`
  - local mutation feedback for DSL validate/save and state-machine save

## 4. Screen-Adjacent Handoff: Pre-execution to Execution

### 4.1 Purpose

`Pre-execution` does not call the backend from the `cases` screen. Its job is to register the currently opened case as launch context for the `execution` screen.

### 4.2 Current Caller

- `onPrepareCase(openedCase.id)` from `CasesScreen.tsx`
- implemented in `handlePrepareCase()` in `App.tsx`

### 4.3 Current State Mutation Design

On click:

1. find the case by `caseId` in `snapshot.cases`
2. append it into `preparedCases` if not already present
3. set `launchForm.projectKey` from the case `projectKey`
4. keep current screen unchanged

Resulting state payload shape:

```json
{
  "id": "checkout-smoke",
  "projectKey": "checkout-web",
  "name": "Checkout smoke",
  "status": "ACTIVE",
  "tags": ["smoke", "payment"],
  "updatedAt": "2026-04-18 18:05"
}
```

### 4.4 Interface Boundary

- immediate click request: none
- downstream request ownership remains on `execution`
- the next real backend mutations happen only when `execution` submits:
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`

### 4.5 Verified Behavior

Current tests confirm:

- pre-execution from `cases` makes `execution` show prepared case count
- later `Execution` action posts `POST /api/phase3/scheduler/events`
- `cases` itself does not post scheduler mutation on pre-execution click

## 5. App-Level Case Catalog Write Interface: POST /api/phase3/catalog/case

This is not currently triggered by a visible control in `CasesScreen.tsx`, but it is already implemented in the shell and belongs to the interface boundary of the `cases` module.

### 5.1 Purpose

Persist case catalog rows into the current file-backed Phase 3 catalog document.

### 5.2 Current Caller

- `postCaseItem()` in `ui/admin-console/src/App.tsx`
- reached through `handleCaseSubmit()`

### 5.3 HTTP Contract

- Method: `POST`
- Path: `/api/phase3/catalog/case`
- Success status: `202`
- Content type: `application/json`

### 5.4 Request Body Design

Current app-level payload:

```json
{
  "id": "checkout-smoke",
  "projectKey": "checkout-web",
  "name": "Checkout smoke",
  "tags": ["smoke", "payment"],
  "status": "ACTIVE",
  "archived": false
}
```

Required fields:

- `id`
- `projectKey`
- `name`

Optional fields:

- `tags`
- `status`
- `updatedAt`
- `archived`

### 5.5 Front-End Pre-Validation

Before any request is sent, `App.tsx` applies:

- trim `id`, `projectKey`, `name`, `tags`, `status`
- discard rows missing `id`, `projectKey`, or `name`
- reject submission if no valid row remains
- reject duplicate case ids
- reject rows referencing unknown project keys
- default empty `status` to `ACTIVE`
- convert comma-separated `tags` to string array

### 5.6 Persistence Design in local-admin-api

Implemented by `CatalogPersistenceService.upsertCase()`:

- validates required fields
- reads `project-catalog.json`
- replaces existing case row when `id` matches ignoring case
- appends a new row when id is new
- normalizes `tags`
- defaults:
  - `status = ACTIVE`
  - `updatedAt = Instant.now(clock).toString()`
  - `archived = false`
- preserves the existing `projects` array in the same document

### 5.7 Response Design

Current response shape:

```json
{
  "status": "ACCEPTED",
  "kind": "catalog-case",
  "path": "D:\\...\\project-catalog.json",
  "updated": true,
  "totalCases": 12,
  "entry": {
    "id": "checkout-smoke",
    "projectKey": "checkout-web",
    "name": "Checkout smoke",
    "tags": ["smoke", "payment"],
    "status": "ACTIVE",
    "updatedAt": "2026-04-20T04:32:10Z",
    "archived": false
  }
}
```

Meaning of key fields:

- `status`
  - request accepted and persisted
- `kind`
  - mutation type for case catalog
- `path`
  - actual file-backed storage path
- `updated`
  - `true` means existing case replaced
  - `false` means new case appended
- `totalCases`
  - total case row count after persistence
- `entry`
  - normalized saved row

### 5.8 Post-Save Reflection Path

After all case rows are posted:

1. `postCaseItems()` completes sequential row submission
2. `App.tsx` calls `loadSnapshot()`
3. shell reloads `GET /api/phase3/admin-console`
4. `snapshot.cases` updates
5. `caseDraft` rehydrates from the refreshed snapshot
6. `CasesScreen.tsx` re-renders the case list

### 5.9 Current Visibility Gap

Important current limitation:

- this write path exists in app orchestration
- but the current `cases` screen UI does not expose the form fields or submit button that would invoke it

## 6. Local-Only Screen Controls

These controls change screen state but do not call the backend directly.

### 6.1 Overview Collapse

- local state: `overviewCollapsed`
- request: none
- effect:
  - compress or expand the upper overview area

### 6.2 Project Switch

- local state: `selectedProjectKey`
- request: none
- effect:
  - filters visible case rows by project
  - resets `openedCaseId`

### 6.3 `Detail`

- local state: `openedCaseId`
- request: none
- effect:
  - opens the lower detail canvas for one case
  - re-collapses the overview for focus

### 6.4 Detail Tabs

- current state owner: `CasesScreen.tsx` via `activeTab` (`CaseDetailTab`)
- current request: `GET /api/phase3/cases/{caseId}/{action}` on tab activation (for non-overview tabs)
- effect:
  - switches the detail main panel content to the selected tab's API-backed data
  - tab state resets to `overview` when the opened case changes
  - stale tab data is cleared when the opened case changes

## 7. UI Control to Interface Mapping

### 7.1 Overview Controls

#### Collapse / expand button

- user action: click
- request: none
- owner: `CasesScreen.tsx`
- success behavior: overview section toggles
- failure behavior: none required
- current state: implemented

### 7.2 Project Rail Controls

#### Project card button

- user action: click
- request: none
- owner: `CasesScreen.tsx`
- success behavior:
  - selected project changes
  - case list re-filters
  - opened case clears
- failure behavior: none required
- current state: implemented

### 7.3 Case List Controls

#### `Detail`

- user action: click
- request: none
- owner: `CasesScreen.tsx`
- success behavior:
  - chosen case opens in lower detail canvas
  - hero actions become enabled
- failure behavior: none required
- current state: implemented

### 7.4 Detail Hero Controls

#### `Edit DSL`

- user action: click
- request: switches `activeTab` to `"dsl"`, which triggers `GET /api/phase3/cases/{caseId}/dsl`
- owner: `CasesScreen.tsx`
- downstream interfaces:
  - `GET /api/phase3/cases/{caseId}/dsl` (load DSL document)
  - `POST /api/phase3/cases/{caseId}/dsl/validate` (validate edited DSL)
  - `PUT /api/phase3/cases/{caseId}/dsl` (save DSL, returns 202)
- current state: implemented

#### `State machine`

- user action: click
- request: switches `activeTab` to `"stateMachine"`, which triggers `GET /api/phase3/cases/{caseId}/state-machine`
- owner: `CasesScreen.tsx`
- downstream interfaces:
  - `GET /api/phase3/cases/{caseId}/state-machine` (load state-machine)
  - `PUT /api/phase3/cases/{caseId}/state-machine` (save state-machine, returns 202)
- current state: implemented

#### `Pre-execution`

- user action: click
- immediate request: none
- owner:
  - `CasesScreen.tsx` emits the case id
  - `App.tsx` updates prepared-case state
- success behavior:
  - case appears in `execution` prepared-case summary
  - `launchForm.projectKey` updates
- failure behavior:
  - if no matching snapshot case exists, no-op
- current state: implemented

### 7.5 Detail Tabs

#### `Overview`

- user action: click
- request: none (reuses front-end-generated step summary)
- current state: implemented (default active tab)

#### `DSL`

- user action: click
- request: `GET /api/phase3/cases/{caseId}/dsl` on tab activation
- provides: JSON textarea editor, validate button (`POST .../dsl/validate`), save button (`PUT .../dsl`)
- explicit states: loading / success / error, plus validate/save mutation feedback
- current state: implemented

#### `State machine`

- user action: click
- request: `GET /api/phase3/cases/{caseId}/state-machine` on tab activation
- provides: nodes/edges/guards display, save button (`PUT .../state-machine`)
- explicit states: loading / success / error, plus save mutation feedback
- current state: implemented

#### `Plans`

- user action: click
- request: `GET /api/phase3/cases/{caseId}/plans` on tab activation
- provides: plans list with name/summary/type, preconditions list
- explicit states: loading / empty / error
- current state: implemented

#### `History`

- user action: click
- request: `GET /api/phase3/cases/{caseId}/history` on tab activation
- provides: run records with status/name/time/reportEntry, maintenance events
- run-row action: app-level handoff into `reportDetail` by reusing existing `openReportDetail(runName)`
- explicit states: loading / empty / error
- current state: implemented

### 7.6 Side Panels

#### `Recent runs` summary bars

- user action: inspect only today
- request: none today
- intended future route:
  - `reports` or `reportDetail`
- current state: display only

#### `Catalog status`

- user action: inspect only
- request: none
- data source:
  - app-level `caseState`
- current state: implemented as read-only mutation-state surface

## 8. Relationship to Other Interfaces

### 8.1 Relationship to Projects

- `cases` depends on valid `projectKey` values from project catalog
- current case save validation rejects unknown project keys
- a future project-entry handoff should land here with a preselected project

### 8.2 Relationship to Execution

- `cases` is the current upstream source of prepared case context
- it does not directly post scheduler mutations
- actual launch/write ownership remains on `execution`

### 8.3 Relationship to Reports and Report Detail

- current case screen still shows only synthetic sidebar recent-run summary
- `History` tab run rows now reuse the existing App-level `reportDetail` handoff
- the current handoff passes `runName` because the case-history payload does not yet expose a dedicated canonical `runId`

### 8.4 Relationship to DSL and State-Machine Capabilities

The main design docs make clear that case management connects to:

- structured DSL review/edit
- state-machine view
- plan review
- history/audit review

These are now implemented as tab-based sub-views within `CasesScreen.tsx`, backed by dedicated `CaseDetailService` endpoints. File-backed persistence stores artifacts under `config/phase3/case-details/<caseId>/`.

## 9. Future Interface Evolution from Main Design Docs

The main design docs describe richer case-domain APIs such as:

- `GET /api/cases`
- `GET /api/cases/{id}`
- `POST /api/cases`
- `PUT /api/cases/{id}`

Current Phase 3 implementation choice:

- keep read behavior on `GET /api/phase3/admin-console` for overview/list
- keep simple case persistence on `POST /api/phase3/catalog/case`
- dedicated case-detail endpoints are implemented for DSL, state-machine, plans, and history artifacts

Implemented case-detail endpoints:

- `GET /api/phase3/cases/{caseId}/dsl`
- `POST /api/phase3/cases/{caseId}/dsl/validate`
- `PUT /api/phase3/cases/{caseId}/dsl`
- `GET /api/phase3/cases/{caseId}/state-machine`
- `PUT /api/phase3/cases/{caseId}/state-machine`
- `GET /api/phase3/cases/{caseId}/plans`
- `GET /api/phase3/cases/{caseId}/history`

Future evolution:

- richer typed case CRUD APIs (`GET /api/cases`, etc.) remain outside Phase 3 boundary
- plans and history are currently read-only; write endpoints can be added when editing is required

## 10. Implemented Case-Detail Interface Reference

This section documents the implemented case-detail interfaces. All endpoints are served by `CaseDetailService.java` with file-backed persistence under `config/phase3/case-details/<caseId>/`.

### 10.1 `Edit DSL`

Implementation type:

- inline tab-based DSL editor within `CasesScreen.tsx`
- backed by `CaseDetailService` read/validate/save endpoints

UI behavior:

- clicking `Edit DSL` hero button or `DSL` tab sets `activeTab` to `"dsl"`
- tab activation triggers `GET /api/phase3/cases/{caseId}/dsl`
- DSL content displayed in JSON textarea editor
- validate button calls `POST /api/phase3/cases/{caseId}/dsl/validate`
- save button calls `PUT /api/phase3/cases/{caseId}/dsl`

#### `GET /api/phase3/cases/{caseId}/dsl`

Purpose:

- load the current authoritative DSL document for one case
- returns default mock data if no persisted file exists

Response body:

```json
{
  "caseId": "checkout-smoke",
  "projectKey": "checkout-web",
  "dslVersion": 3,
  "updatedAt": "2026-04-20T04:32:10Z",
  "updatedBy": "qa-platform",
  "definition": {
    "id": "checkout-smoke",
    "name": "Checkout smoke",
    "steps": [
      { "action": "goto", "url": "/checkout" },
      { "action": "click", "target": "#primary-entry" }
    ]
  }
}
```

#### `POST /api/phase3/cases/{caseId}/dsl/validate`

Purpose:

- validate edited DSL before save

Validation rules:

- `definition` field is required
- `definition.id` is required and must not be blank
- each step must have a non-blank `action` field
- empty steps list generates a warning

Request body:

```json
{
  "definition": {
    "id": "checkout-smoke",
    "name": "Checkout smoke",
    "steps": [
      { "action": "goto", "url": "/checkout" }
    ]
  }
}
```

Response body:

```json
{
  "status": "VALID",
  "errors": [],
  "warnings": []
}
```

#### `PUT /api/phase3/cases/{caseId}/dsl`

Purpose:

- persist the reviewed DSL definition for the case
- auto-increments `dslVersion` on each save

Request body:

```json
{
  "updatedBy": "operator",
  "projectKey": "checkout-web",
  "definition": {
    "id": "checkout-smoke",
    "name": "Checkout smoke",
    "steps": [
      { "action": "goto", "url": "/checkout" },
      { "action": "click", "target": "#primary-entry" }
    ]
  }
}
```

Response status: `202 Accepted`

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "case-dsl",
  "caseId": "checkout-smoke",
  "dslVersion": 4,
  "updatedAt": "2026-04-20T05:10:22Z"
}
```

Post-save reflection:

- DSL tab reloads on next tab activation
- optional summary fields may later flow back into `GET /api/phase3/admin-console`

### 10.2 `State machine`

Implementation type:

- inline tab-based state-machine viewer within `CasesScreen.tsx`
- backed by `CaseDetailService` read/save endpoints

UI behavior:

- clicking `State machine` hero button or `State machine` tab sets `activeTab` to `"stateMachine"`
- tab activation triggers `GET /api/phase3/cases/{caseId}/state-machine`
- displays nodes, edges, and guards
- save button calls `PUT /api/phase3/cases/{caseId}/state-machine`

#### `GET /api/phase3/cases/{caseId}/state-machine`

Purpose:

- return graph-ready state-machine data for the case
- returns default mock data if no persisted file exists

Response body:

```json
{
  "caseId": "checkout-smoke",
  "projectKey": "checkout-web",
  "updatedAt": "2026-04-20T04:32:10Z",
  "nodes": [
    { "id": "landing", "label": "Landing" },
    { "id": "checkout", "label": "Checkout" },
    { "id": "success", "label": "Success" }
  ],
  "edges": [
    { "from": "landing", "to": "checkout", "action": "clickBuyNow" },
    { "from": "checkout", "to": "success", "action": "submitPayment" }
  ],
  "guards": [
    { "id": "payment-authorized", "description": "Payment callback returns APPROVED" }
  ]
}
```

#### `PUT /api/phase3/cases/{caseId}/state-machine`

Purpose:

- persist manually reviewed graph metadata for the case

Request body:

```json
{
  "projectKey": "checkout-web",
  "nodes": [
    { "id": "start", "label": "Start" }
  ],
  "edges": [],
  "guards": []
}
```

Response status: `202 Accepted`

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "case-state-machine",
  "caseId": "checkout-smoke",
  "updatedAt": "2026-04-20T05:10:22Z"
}
```

### 10.3 Detail Tab Switching

Implementation type:

- local active-tab state in `CasesScreen.tsx`
- tab-specific data loading when the selected tab requires backend artifacts

Local state:

```ts
type CaseDetailTab = "overview" | "dsl" | "stateMachine" | "plans" | "history";
```

Tab behavior:

- `Overview`
  - request: none
  - reuses current mixed summary panels (front-end-generated steps)
- `DSL`
  - request: `GET /api/phase3/cases/{caseId}/dsl`
  - provides: JSON editor, validate, save, mutation feedback
- `State machine`
  - request: `GET /api/phase3/cases/{caseId}/state-machine`
  - provides: nodes/edges/guards display, save, mutation feedback
- `Plans`
  - request: `GET /api/phase3/cases/{caseId}/plans`
  - provides: read-only plans list with preconditions and explicit empty/error surfacing
- `History`
  - request: `GET /api/phase3/cases/{caseId}/history`
  - provides: read-only run history and maintenance events with explicit empty/error surfacing

Tab state resets to `overview` when the opened case changes.

### 10.4 `Plans` Tab

Implementation type:

- read-only interface backed by `CaseDetailService`

#### `GET /api/phase3/cases/{caseId}/plans`

Purpose:

- load data plan, compare plan, restore plan, and execution-precondition summary for one case
- returns default mock data if no persisted file exists

Response body:

```json
{
  "caseId": "checkout-smoke",
  "projectKey": "checkout-web",
  "plans": [
    {
      "id": "seed",
      "type": "data-seed",
      "name": "plan.checkout.seed.v2",
      "summary": "Seed account, basket, and coupon fixtures"
    },
    {
      "id": "compare",
      "type": "compare",
      "name": "plan.diff.expected",
      "summary": "Compare order and inventory deltas"
    },
    {
      "id": "restore",
      "type": "restore",
      "name": "plan.restore.snapshot",
      "summary": "Restore SQL snapshot after run"
    }
  ],
  "preconditions": [
    "Project environment must be unlocked",
    "Snapshot must exist before execution"
  ]
}
```

### 10.5 `History` Tab

Implementation type:

- read-only interface backed by `CaseDetailService`
- read-side interface plus app-level run-row handoff into `reportDetail`

#### `GET /api/phase3/cases/{caseId}/history`

Purpose:

- return recent execution history and maintenance events for one case
- returns default mock data if no persisted file exists

Response body:

```json
{
  "caseId": "checkout-smoke",
  "runs": [
    {
      "runName": "checkout-web-smoke-20260420-001",
      "status": "SUCCESS",
      "finishedAt": "2026-04-20T04:22:11Z",
      "reportEntry": "HTML / artifacts / cleanup"
    },
    {
      "runName": "checkout-web-smoke-20260419-004",
      "status": "FAILED",
      "finishedAt": "2026-04-19T22:08:40Z",
      "reportEntry": "Locator mismatch on payment entry"
    }
  ],
  "maintenanceEvents": [
    {
      "at": "2026-04-19T21:10:00Z",
      "type": "DSL_UPDATED",
      "operator": "qa-platform",
      "summary": "Adjusted selector for payment entry"
    }
  ]
}
```

Current row click behavior:

- clicking a run row routes to `reportDetail`
- the first implementation reuses existing App-level selected-run state via `openReportDetail(runName)`
- no new report-detail endpoint is added for this linkage

### 10.6 `Recent runs` Summary Panel

Current state: display-only sidebar placeholder

Future implementation:

- real history data now exists via `GET /api/phase3/cases/{caseId}/history`
- sidebar summary bars could be connected to this data or made clickable
- add app-level handler:
  - `onOpenCaseRunDetail(runName: string)`
- reuse existing `openReportDetail(runName)`

### 10.7 Future Visible Case-Catalog Editor

If the `cases` screen later restores the editable catalog form already implied by its props, the recommended implementation type is:

- reuse existing shell save flow
- do not add a second create/update endpoint

Concrete implementation design:

- reintroduce field inputs for:
  - `id`
  - `projectKey`
  - `name`
  - `tags`
  - `status`
  - `archived`
- reuse existing callbacks:
  - `onCaseChange`
  - `onAddCaseRow`
  - `onRemoveCaseRow`
  - `onSubmit`
- eventual persistence remains:
  - `POST /api/phase3/catalog/case`

## 11. Error Handling Boundary

Current implemented error surfaces:

- pre-execution missing case id:
  - no-op in `App.tsx`
- case save validation errors:
  - `errorKeepCase`
  - `errorDuplicateCase`
  - `errorUnknownProject`
- backend save errors:
  - non-2xx response from `POST /api/phase3/catalog/case`
  - local-admin-api validation/body parsing failure

Current surfacing:

- case save errors map into `caseState`
- `CasesScreen.tsx` displays `caseState` in `Catalog status`

Implemented case-detail error surfaces:

- DSL validation returns structured `errors[]` and `warnings[]` in the response body
- DSL save with missing `definition` field returns `400` with error message
- Invalid JSON in request body returns `400`
- Path traversal in `caseId` returns `400` with "path traversal detected"
- Method not allowed returns `405`
- Unknown action path returns `404`

Future error surfaces:

- `409` when artifact version is stale on write (not yet implemented)

## 12. Review Items

Resolved findings (P2-3):

- DSL, state-machine, plan, and history capabilities are now implemented as tab-based sub-views with backend persistence.
- `Edit DSL` and `State machine` hero buttons are now wired to switch tabs and load data.
- Tab switching is implemented with `CaseDetailTab` state and API-backed data loading.
- `CaseDetailService.java` provides file-backed persistence for all case-detail artifacts.
- backend-backed tabs now surface explicit loading / empty / error states and local mutation feedback.
- switching the opened case clears stale tab-specific backend data and resets the active tab to `overview`.
- History tab run rows now hand off to `reportDetail` through the existing App-level path.

Remaining findings:

- `Pre-execution` is correctly a state handoff, not a backend request.
- App-level case-catalog save already exists, but the visible screen does not expose an editor form.
- Sidebar info/plans/recent-run panels remain snapshot-derived display, not yet connected to per-tab API data.
- History tab currently hands off by `runName`; the case-history payload still lacks a dedicated canonical `runId`.
- Plans and history are read-only; write endpoints can be added when editing is required.
