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
- new detailed interface design required by currently unwired controls

## 2. Interface Summary

Current `cases` screen conclusion:

- direct read source for visible data:
  - `GET /api/phase3/admin-console`
- no direct write request is sent by the visible `cases` screen controls today
- real implemented handoff:
  - `Pre-execution` updates app-level prepared-case state and later feeds `execution`
- app-level case catalog write capability exists in the shell:
  - `POST /api/phase3/catalog/case`
- deeper case-detail capabilities implied by the UI require additional dedicated interfaces because the current snapshot does not carry true DSL, state-machine, plan, or history documents

## 3. Direct Read Interface: GET /api/phase3/admin-console

### 3.1 Purpose for Cases Screen

The `cases` screen uses the shared admin-console snapshot as its current read model. It does not fetch a case-specific detail endpoint today.

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

- backend/local-admin-api owns the raw snapshot
- `App.tsx` owns snapshot fetch and rehydration into `caseDraft`
- `CasesScreen.tsx` owns only local presentational state:
  - `selectedProjectKey`
  - `openedCaseId`
  - `overviewCollapsed`

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

- current state owner: none
- current request: none
- effect today:
  - no functional change
- intended future:
  - local active-tab state plus tab-specific read interface

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
- request: none today
- owner: not implemented
- intended future interface:
  - case DSL read/write interfaces
- current state: visible only

#### `State machine`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - case state-machine read interface
- current state: visible only

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
- request: none today
- intended future behavior:
  - activate overview sub-view only
- current state: visual only

#### `DSL`

- user action: click
- request: none today
- intended future behavior:
  - load and show case DSL content
- current state: visual only

#### `State machine`

- user action: click
- request: none today
- intended future behavior:
  - load and show state-machine content
- current state: visual only

#### `Plans`

- user action: click
- request: none today
- intended future behavior:
  - load and show data / compare / restore plans
- current state: visual only

#### `History`

- user action: click
- request: none today
- intended future behavior:
  - load and show case run history and maintenance events
- current state: visual only

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

- current case screen shows only synthetic recent-run summary
- true report drill-down is not implemented here
- future case history should route to or reuse report-oriented interfaces

### 8.4 Relationship to DSL and State-Machine Capabilities

The main design docs make clear that case management is supposed to connect to:

- structured DSL review/edit
- state-machine view
- plan review
- history/audit review

The current aggregated snapshot is insufficient for those deeper views, so dedicated case-detail interfaces are required.

## 9. Future Interface Evolution from Main Design Docs

The main design docs describe richer case-domain APIs such as:

- `GET /api/cases`
- `GET /api/cases/{id}`
- `POST /api/cases`
- `PUT /api/cases/{id}`

Current Phase 3 implementation choice:

- keep read behavior on `GET /api/phase3/admin-console`
- keep simple case persistence on `POST /api/phase3/catalog/case`

Recommended rule for this phase:

- do not replace the current snapshot contract during documentation-only work
- define dedicated deeper case-detail endpoints only where the current UI clearly implies a separate case artifact such as DSL, state machine, plans, or history

## 10. Detailed Implementation Design for Currently Unwired Controls

This section gives concrete implementation design for visible but currently unwired case controls.

### 10.1 `Edit DSL`

Recommended implementation type:

- route-state handoff into a dedicated DSL editor screen
- plus new case DSL read/write interfaces

Reasoning:

- the current detail step list is only a presentational summary
- the shared admin snapshot does not include true DSL document content
- editing DSL introduces a new backend responsibility and cannot be satisfied by route-state alone

Recommended route behavior:

- add app-level handler:
  - `onOpenCaseDsl(caseId: string)`
- app state stores:
  - `selectedCaseId`
  - optional `dslEditorMode = "edit"`
- route target:
  - future `dslEditor` screen

Recommended read endpoint:

#### `GET /api/phase3/cases/{caseId}/dsl`

Purpose:

- load the current authoritative DSL document for one case

Response body:

```json
{
  "caseId": "checkout-smoke",
  "projectKey": "checkout-web",
  "dslVersion": 3,
  "updatedAt": "2026-04-20T04:32:10Z",
  "updatedBy": "qa-platform",
  "source": {
    "type": "catalog-linked-json",
    "path": "D:\\...\\cases\\checkout-smoke.dsl.json"
  },
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

Recommended validate endpoint:

#### `POST /api/phase3/cases/{caseId}/dsl/validate`

Purpose:

- validate edited DSL before save against DSL schema/parser rules

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

Recommended save endpoint:

#### `PUT /api/phase3/cases/{caseId}/dsl`

Purpose:

- persist the reviewed DSL definition for the case

Request body:

```json
{
  "updatedBy": "qa-platform",
  "changeReason": "Adjusted selector after checkout entry redesign",
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

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "case-dsl",
  "caseId": "checkout-smoke",
  "dslVersion": 4,
  "path": "D:\\...\\cases\\checkout-smoke.dsl.json",
  "updatedAt": "2026-04-20T05:10:22Z"
}
```

Post-save reflection:

- future `dslEditor` reloads `GET /api/phase3/cases/{caseId}/dsl`
- optional summary fields may later flow back into `GET /api/phase3/admin-console`

### 10.2 `State machine`

Recommended implementation type:

- route-state handoff into a dedicated state-machine sub-view
- plus new read interface for state-machine content

Reasoning:

- the current screen has no true state-graph data
- state-machine view is a distinct artifact implied by the main design docs and wireframes

Recommended route behavior:

- add app-level handler:
  - `onOpenCaseStateMachine(caseId: string)`
- route target:
  - future `caseStateMachine` screen
  - or future `cases` detail tab state once implemented

Recommended read endpoint:

#### `GET /api/phase3/cases/{caseId}/state-machine`

Purpose:

- return graph-ready state-machine data for the case

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

Optional future write endpoint:

#### `PUT /api/phase3/cases/{caseId}/state-machine`

Purpose:

- persist manually reviewed graph metadata when state-machine editing is later approved

Current recommendation:

- do not require this endpoint for the first implementation if state machine remains read-only

### 10.3 Detail Tab Switching

Recommended implementation type:

- local active-tab state in `CasesScreen.tsx`
- tab-specific data loading only when the selected tab requires true backend artifacts

Recommended local state:

```ts
type CaseDetailTab = "overview" | "dsl" | "stateMachine" | "plans" | "history";
```

Tab behavior design:

- `Overview`
  - request: none
  - reuse current mixed summary panels
- `DSL`
  - request:
    - `GET /api/phase3/cases/{caseId}/dsl`
- `State machine`
  - request:
    - `GET /api/phase3/cases/{caseId}/state-machine`
- `Plans`
  - request:
    - `GET /api/phase3/cases/{caseId}/plans`
- `History`
  - request:
    - `GET /api/phase3/cases/{caseId}/history`

### 10.4 `Plans` Tab

Recommended implementation type:

- new read interface

Reasoning:

- current side-panel plan rows are placeholder summaries
- real plan content is a first-class case artifact in the main design docs

Recommended endpoint:

#### `GET /api/phase3/cases/{caseId}/plans`

Purpose:

- load data plan, compare plan, restore plan, and execution-precondition summary for one case

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

Recommended implementation type:

- new read interface
- optional route-state handoff into `reports` / `reportDetail`

Reasoning:

- current `Recent runs` bars are only summary placeholders
- true case history needs run records tied to a case id

Recommended endpoint:

#### `GET /api/phase3/cases/{caseId}/history`

Purpose:

- return recent execution history and maintenance events for one case

Query parameters:

- `limit`
- `includeMaintenance`

Example:

`GET /api/phase3/cases/checkout-smoke/history?limit=20&includeMaintenance=true`

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

Recommended row click behavior:

- clicking a run row routes to `reportDetail`
- no new report-detail endpoint required for the first Phase 3 linkage if existing report screen state is reused

### 10.6 `Recent runs` Summary Panel

Recommended implementation type:

- route-state handoff to `reportDetail`
- no new backend endpoint required if history tab is not yet implemented

Concrete implementation design:

- once real history data exists, make summary bars or rows clickable
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

Recommended new-interface error surfaces:

- DSL validation errors should return structured `errors[]`
- DSL/state-machine/plans/history reads should return:
  - `404` when case artifact does not exist
  - `409` when artifact version is stale on write
  - `400` when request body is invalid

## 12. Review Items

Review-only findings:

- The visible `cases` screen currently behaves more like a case-overview/detail launcher than a full case-management workspace.
- `Pre-execution` is correctly a state handoff, not a backend request.
- The current UI strongly implies dedicated DSL, state-machine, plan, and history capabilities, but the current local API does not expose them yet.
- App-level case-catalog save already exists, but the visible screen does not expose it.
- Future implementation should prefer:
  - route-state handoff when only navigation is missing
  - reuse of `POST /api/phase3/catalog/case` if editor UI is restored
  - new endpoints only for true new artifacts such as DSL, state machine, plans, and history

These are documentation findings only. No implementation change is made in this stage.
