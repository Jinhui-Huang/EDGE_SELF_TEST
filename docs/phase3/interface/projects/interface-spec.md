# Projects Interface Specification

## 1. Scope and Design Basis

- Screen: `projects`
- UI implementation:
  - `ui/admin-console/src/screens/ProjectsScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`

This document distinguishes:

- direct read interfaces
- direct write interfaces
- local-only UI state transitions
- indirect snapshot reflection path
- current implementation vs remaining future routes

## 2. Interface Summary

Current `projects` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - `POST /api/phase3/catalog/project`
- current direct import write sources:
  - `POST /api/phase3/catalog/project/import/preview`
  - `POST /api/phase3/catalog/project/import/commit`
- no dedicated project-list endpoint exists in the current implemented Phase 3 local-admin-api
- project overview cards are composed in the front end from snapshot domains

Current App-level handoffs already implemented:

- project `Reports` / `View reports` -> `reports`
- `Enter project` -> `cases`

## 3. Direct Read Interface: GET /api/phase3/admin-console

### 3.1 Purpose for Projects Screen

The `projects` screen uses the admin-console snapshot as its current read model. It does not fetch a project-specific endpoint.

Relevant snapshot fields for this screen:

- `projects[]`
- `cases[]`
- `reports[]`
- `workQueue[]`
- `environmentConfig[]`

### 3.2 Functional Role by Field

- `projects[]`
  - base project catalog rows for the screen
- `cases[]`
  - used to derive linked case count, tags, and latest case info
- `reports[]`
  - used to derive latest report name/status for each project card
- `workQueue[]`
  - used to derive queue state/detail per project card
- `environmentConfig[]`
  - used to build compact config summary text on project cards

### 3.3 Ownership Boundary

- backend/local-admin-api owns the raw snapshot
- `App.tsx` owns the fetch and snapshot state
- `ProjectsScreen.tsx` owns only front-end view-model composition and local presentation state

## 4. Direct Write Interface: POST /api/phase3/catalog/project

### 4.1 Purpose

Persist project catalog rows from the editor area.

### 4.2 Current Caller

- `postProjectItem()` in `ui/admin-console/src/App.tsx`

### 4.3 HTTP Contract

- Method: `POST`
- Path: `/api/phase3/catalog/project`
- Success status: `202`
- Content type: `application/json`

### 4.4 Request Body Design

Current UI sends:

```json
{
  "key": "checkout-web",
  "name": "checkout-web",
  "scope": "Payment journey",
  "environments": ["prod-like", "staging-edge"],
  "note": "Operator updated the Phase 3 catalog row."
}
```

Required fields:

- `key`
- `name`
- `scope`

Optional but currently sent:

- `environments`
- `note`

### 4.5 Front-End Pre-Validation

Before any request is sent, `App.tsx` applies:

- trim all string fields
- discard rows missing `key`, `name`, or `scope`
- reject submission if no valid row remains
- reject duplicate project keys

This means:

- the screen never intentionally posts an empty catalog payload
- duplicate project-key errors are blocked in the front end before the request

### 4.6 Persistence Design in local-admin-api

Implemented by `CatalogPersistenceService.upsertProject()`:

- validates required fields
- reads `project-catalog.json`
- updates existing row when `key` matches ignoring case
- appends new row when key is new
- preserves the existing `cases` array in the same document
- writes back:
  - `projects`
  - `cases`

### 4.7 Response Design

Current response shape:

```json
{
  "status": "ACCEPTED",
  "kind": "catalog-project",
  "path": "D:\\...\\project-catalog.json",
  "updated": true,
  "totalProjects": 2,
  "entry": {
    "key": "checkout-web",
    "name": "checkout-web",
    "scope": "Payment journey / audited",
    "environments": ["prod-like", "staging-edge"],
    "note": "Operator updated the Phase 3 catalog row."
  }
}
```

Meaning of key fields:

- `status`
  - request accepted and persisted
- `kind`
  - response category for project-catalog mutation
- `path`
  - actual file-backed storage path
- `updated`
  - `true` means existing project replaced
  - `false` means new project appended
- `totalProjects`
  - total row count after persistence
- `entry`
  - normalized saved row

### 4.8 Post-Save Reflection Path

After all project rows are posted:

1. `postProjectItems()` completes sequential row submission
2. `App.tsx` calls `loadSnapshot()`
3. shell reloads `GET /api/phase3/admin-console`
4. `snapshot.projects` updates
5. `projectDraft` rehydrates from the refreshed snapshot
6. `ProjectsScreen.tsx` recomposes visible cards from the new snapshot

This reflection path is important:

- the projects screen does not optimistically maintain a separate authoritative project store
- the authoritative visible result after save is the refreshed snapshot

## 5. Local-Only Screen Controls

These controls change UI state but do not call the backend directly.

### 5.1 Search Input

- local state: `query`
- request: none
- effect:
  - filters visible project cards by key, name, description

### 5.2 Card Click

- local state: `selectedProjectKey`
- request: none
- effect:
  - marks current project focus

### 5.3 `Open` / `Close`

- local state: `openedProjectKey`
- request: none
- effect:
  - toggles inline detail region

### 5.4 Card `Reports`

- local state:
  - sets selection/opened detail
- current request: none
- current route:
  - implemented App-level handoff into `reports`
- current project context handoff:
  - `selectedReportsProjectKey`

### 5.5 Inline `Enter project`

- current request: none
- current route:
  - implemented App-level handoff into `cases`
- current project context handoff:
  - `selectedCaseProjectKey`

### 5.6 Inline `View reports`

- current request: none
- current route:
  - implemented App-level handoff into `reports`
- current project context handoff:
  - `selectedReportsProjectKey`

### 5.7 `Remove row`

- local state change only
- request: none
- effect:
  - removes one editor row from the current draft

### 5.8 `Add project row`

- local state change only
- request: none
- effect:
  - appends one empty draft row

## 6. UI Control to Interface Mapping

### 6.1 Header Controls

#### Search input

- user action: type
- request: none
- owner: `ProjectsScreen.tsx`
- success behavior: visible projects filtered immediately
- failure behavior: none required
- current state: implemented

#### `Import`

- user action: click -> preview -> commit
- request:
  - `POST /api/phase3/catalog/project/import/preview`
  - `POST /api/phase3/catalog/project/import/commit`
- owner:
  - preview/commit state in `App.tsx`
  - UI review flow in `ProjectsScreen.tsx`
  - persistence in `CatalogPersistenceService`
- current state: implemented

#### `New project`

- user action: click
- request: none on click
- owner:
  - draft-row append in `App.tsx`
  - persistence continues through `POST /api/phase3/catalog/project`
- current state: implemented

### 6.2 Card Controls

#### Project card body

- user action: click
- request: none
- owner: `ProjectsScreen.tsx`
- current state: implemented

#### `Open` / `Close`

- user action: click
- request: none
- owner: `ProjectsScreen.tsx`
- current state: implemented

#### `Reports`

- user action: click
- request: none
- owner: App-level screen state in `App.tsx`
- current route: `reports`
- current state: implemented

### 6.3 Inline Detail Controls

#### `Enter project`

- user action: click
- request: none
- current route: `cases`
- current state: implemented

#### `View reports`

- user action: click
- request: none
- current route: `reports`
- current state: implemented

### 6.4 Editor Controls

#### Project field inputs

- user action: type
- request: none during typing
- owner: app-level project draft state via callback
- current state: implemented

#### `Remove row`

- user action: click
- request: none
- owner: app-level project draft state via callback
- current state: implemented

#### `Add project row`

- user action: click
- request: none
- owner: app-level project draft state via callback
- current state: implemented

#### `Save project catalog`

- user action: click submit
- request:
  - one or more sequential `POST /api/phase3/catalog/project`
- owner:
  - validation in `App.tsx`
  - persistence in local-admin-api
- success feedback:
  - mutation state success message
  - refreshed snapshot
  - refreshed field values
- failure feedback:
  - mutation state error message
- current state: implemented

## 7. Error Handling Boundary

Front-end validation errors:

- no valid project row remains
- duplicate project key

Backend/request errors:

- non-2xx response from `POST /api/phase3/catalog/project`
- JSON/body validation error from local-admin-api

Current error surfacing:

- mapped into `projectState`
- rendered by `MutationStatus`

## 8. Relationship to Other Interfaces

### 8.1 Relationship to Cases

- `projects` does not write case rows directly
- but its snapshot view model depends on `cases[]`
- current `Enter project` action opens `cases` through App-level handoff

### 8.2 Relationship to Reports

- project cards derive latest report summary from `snapshot.reports`
- the current screen does not directly call a report endpoint
- current project report drill-down routes into `reports` through App-level handoff

### 8.3 Relationship to Execution

- queue status and execution context shown on project cards come from:
  - `snapshot.workQueue`
  - `snapshot.reports`
- current screen does not post scheduler requests directly
- future project-entry actions may route to `execution`

## 9. Future Interface Evolution from Main Design Docs

The main design docs describe fuller domain APIs such as:

- `GET /api/projects`
- `POST /api/projects`
- richer project detail endpoints

Current Phase 3 implementation choice:

- keep project management under the aggregated snapshot plus file-backed project upsert endpoint

Recommended rule for this phase:

- do not invent a new dedicated project-list API during documentation-only work
- document the current snapshot + upsert contract accurately
- record future richer project APIs as evolution only

## 10. Current Implemented State for Previously Unwired Controls

This section records the current P2-2 implementation state for controls that were previously documented as placeholders.

### 10.1 `New project`

Current implementation type:

- no new backend interface
- reuse the existing local editor plus existing save endpoint

Current behavior:

- button click should call the same app-level behavior as `Add project row`
- after adding the row:
  - scroll to the catalog editor region
  - focus the new row `key` input
  - set mutation state unchanged

Route/API behavior:

- immediate click request: none
- eventual persistence:
  - `POST /api/phase3/catalog/project`
  - through existing save flow only

Current reasoning boundary:

- the screen already has a project-editor workflow
- adding a new dedicated create endpoint would duplicate current Phase 3 semantics unnecessarily

### 10.2 `Import`

Current implementation type:

- backend-assisted import flow
- preview first, then explicit commit
- deterministic JSON review only in the current UI

#### `POST /api/phase3/catalog/project/import/preview`

Current purpose:

- validate imported project rows before commit
- show create/update/conflict results without writing the catalog yet

Request body:

```json
{
  "format": "json",
  "mode": "merge",
  "rows": [
    {
      "key": "checkout-web",
      "name": "checkout-web",
      "scope": "Payment journey",
      "environments": ["prod-like", "staging-edge"],
      "note": "Imported from operator template"
    }
  ]
}
```

Current request fields:

- `mode`
  - `merge` or `replace`
- `rows`
  - normalized project rows

Current UI input boundary:

- the current `projects` screen accepts:
  - a JSON array of project rows
  - or a JSON object containing `rows`
- the current implementation does not provide CSV parsing or file-upload import UI

Response body:

```json
{
  "status": "PREVIEW_READY",
  "kind": "catalog-project-import-preview",
  "summary": {
    "totalRows": 5,
    "createCount": 2,
    "updateCount": 2,
    "conflictCount": 1
  },
  "rows": [
    {
      "key": "checkout-web",
      "action": "update",
      "warnings": []
    }
  ],
  "conflicts": [
    {
      "key": "ops-console",
      "reason": "Duplicate key in import payload"
    }
  ]
}
```

Current implemented rules:

- reject rows missing `key`, `name`, or `scope`
- normalize environment arrays
- identify duplicate keys in payload
- identify create vs update against current catalog
- do not mutate `project-catalog.json`

#### `POST /api/phase3/catalog/project/import/commit`

Current purpose:

- persist approved import rows after preview

Request body:

```json
{
  "mode": "merge",
  "rows": [
    {
      "key": "checkout-web",
      "name": "checkout-web",
      "scope": "Payment journey",
      "environments": ["prod-like", "staging-edge"],
      "note": "Imported from operator template"
    }
  ]
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "catalog-project-import",
  "created": 2,
  "updated": 2,
  "totalProjects": 8,
  "path": "D:\\...\\project-catalog.json"
}
```

Current post-commit reflection:

- call `loadSnapshot()`
- refresh `GET /api/phase3/admin-console`
- rehydrate `projectDraft`

Current UI implementation:

- `Import` opens import review panel
- operator pastes deterministic JSON only
- preview call runs first
- commit call runs only after confirmation

### 10.3 Card `Reports`

Current implementation type:

- route-state implementation
- no new backend endpoint required in Phase 3

Current behavior:

- add app-level handler:
  - `onOpenProjectReports(projectKey: string)`
- handler behavior:
  - store `selectedReportsProjectKey`
  - set `activeScreen("reports")`

Current app state:

```ts
const [selectedReportsProjectKey, setSelectedReportsProjectKey] = useState<string | null>(null);
```

Current `ProjectsScreen` prop:

```ts
onOpenProjectReports: (projectKey: string) => void;
```

Current `ReportsScreen` prop:

```ts
initialProjectKey?: string | null;
```

Current `ReportsScreen` behavior:

- initialize `selectedProjectKey` from `initialProjectKey` when valid
- fallback to current default project if absent

Request behavior:

- immediate click request: none
- data source remains:
  - `GET /api/phase3/admin-console`

Current reasoning boundary:

- reports screen already derives project grouping from the shared snapshot
- a route-state handoff is sufficient

### 10.4 Inline `View reports`

Current implementation type:

- same route-state behavior as card `Reports`

Current behavior:

- click should call `onOpenProjectReports(openedProject.key)`
- no separate endpoint needed

### 10.5 Inline `Enter project`

Current implementation type:

- route-state implementation into project-scoped case management
- no new backend endpoint required for Phase 3

Current behavior:

- add app-level handler:
  - `onEnterProject(projectKey: string)`
- handler behavior:
  - store `selectedCaseProjectKey`
  - set `activeScreen("cases")`

Current app state:

```ts
const [selectedCaseProjectKey, setSelectedCaseProjectKey] = useState<string | null>(null);
```

Current `ProjectsScreen` prop:

```ts
onEnterProject: (projectKey: string) => void;
```

Current `CasesScreen` prop:

```ts
initialProjectKey?: string | null;
```

Current `CasesScreen` behavior:

- initialize its selected project from `initialProjectKey` if valid
- preserve current fallback when no initial key exists

Request behavior:

- immediate click request: none
- downstream data source remains:
  - `GET /api/phase3/admin-console`

Current reasoning boundary:

- current Phase 3 already has case data in the shared snapshot
- route-state handoff is enough for project-centered entry

## 11. Review Items

Review-only findings:

- the screen already has a real persistence path for project rows
- the card summary model is useful for operators but not a true backend-native project-summary contract
- if future project detail navigation is implemented, routing ownership should be added without moving catalog save ownership away from this screen/app flow

These are documentation findings only. No implementation change is made in this stage.
