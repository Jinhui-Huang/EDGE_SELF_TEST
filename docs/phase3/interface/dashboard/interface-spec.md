# Dashboard Interface Specification

## 1. Scope and Design Basis

- Screen: `dashboard`
- UI implementation:
  - `ui/admin-console/src/screens/DashboardScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ConfigPersistenceService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`
- Backend architecture references read for this document:
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_java_core_code_skeleton.md`
  - `docs/phase3/main/edge_extension_native_messaging_protocol_detailed_design.md`
  - `docs/phase3/main/edge_extension_typescript_protocol_and_code_skeleton.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/react_page_skeleton_prompt_guide.md`
  - `docs/phase3/main/cdp_domain_encapsulation_detailed_design.md`

This document distinguishes:

- current implemented interfaces
- current implemented data derivation logic
- sibling interfaces that affect dashboard data indirectly
- future planned interface evolution from the main design docs

## 2. Backend Construction Summary

Based on the main design documents, the platform is structured as a multi-module backend plus local management entry points:

- `apps/core-platform`
  - core orchestration facade around execution-engine and related libs
- `apps/native-host`
  - native messaging host for Edge extension communication
- `apps/local-admin-api`
  - local HTTP API for admin console and popup snapshot / mutations
- `libs/execution-engine`
  - orchestration of parse, execute, wait, assert, artifact, report
- `libs/report-engine`
  - report generation and result output
- `libs/datasource-engine`
  - datasource and DB-facing capability
- `libs/native-messaging`
  - protocol bridge between extension and host
- `ui/admin-console`
  - React admin console
- `extension/edge-extension`
  - Edge extension popup/background/content-script entry

For the `dashboard` screen, the important backend conclusion is:

- the screen is not backed by one isolated business service
- it is backed by an aggregated local-management snapshot
- this snapshot is assembled inside `apps/local-admin-api`
- the snapshot summarizes scheduler state, queue state, catalog state, config state, execution history, and local run/report artifacts

## 3. Dashboard Interface Architecture

The `dashboard` screen sits on top of three interface layers.

### 3.1 Layer A: UI Direct Interface

This is what the screen directly consumes today.

- `GET /api/phase3/admin-console`

### 3.2 Layer B: Dashboard Source Interfaces

These are not called directly by `dashboard`, but they change the content returned by `GET /api/phase3/admin-console`.

- `POST /api/phase3/scheduler/requests`
- `POST /api/phase3/scheduler/events`
- `POST /api/phase3/config/model`
- `POST /api/phase3/config/environment`
- `POST /api/phase3/catalog/project`
- `POST /api/phase3/catalog/case`

### 3.3 Layer C: Local State Sources Read by local-admin-api

The local snapshot builder derives dashboard data from local files and report directories.

- `config/phase3/scheduler-requests.json`
- `config/phase3/scheduler-events.json`
- `config/phase3/scheduler-state.json`
- `config/phase3/execution-queue.json`
- `config/phase3/project-catalog.json`
- `config/phase3/execution-history.json`
- `config/phase3/model-config.json`
- `config/phase3/environment-config.json`
- `runs/*/report.json`
- `runs/*/report.html`

## 4. Direct Interface: GET /api/phase3/admin-console

### 4.1 Purpose

This is the primary dashboard read interface. Its function is to return a single aggregated snapshot for the admin console shell.

For `dashboard`, this endpoint is the source of:

- platform summary
- navigation summary
- metric cards
- project overview
- case overview
- queue overview
- report overview
- model/config summary
- environment/config summary
- timeline
- operational constraints
- case tag set

### 4.2 Current Caller

- `fetchSnapshot()` in `ui/admin-console/src/App.tsx`

### 4.3 HTTP Contract

- Method: `GET`
- Path: `/api/phase3/admin-console`
- Success status: `200`
- Content type: `application/json; charset=utf-8`
- CORS:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`

### 4.4 Current Response Model

Implemented by `AdminConsoleSnapshot`:

```text
generatedAt: string
apiBasePath: string
summary:
  eyebrow: string
  title: string
  description: string
  runtimeStrategy: string
navigation[]:
  id: string
  label: string
  summary: string
stats[]:
  label: string
  value: string
  note: string
projects[]:
  key: string
  name: string
  scope: string
  suites: number
  environments: number
  note: string
cases[]:
  id: string
  projectKey: string
  name: string
  tags: string[]
  status: string
  updatedAt: string
  archived: boolean
workQueue[]:
  title: string
  owner: string
  state: string
  detail: string
reports[]:
  runId: string
  runName: string
  status: string
  finishedAt: string
  entry: string
modelConfig[]:
  label: string
  value: string
environmentConfig[]:
  label: string
  value: string
timeline[]:
  time: string
  title: string
  detail: string
constraints[]:
  string
caseTags[]:
  string
```

### 4.5 Detailed Functional Design

This endpoint is not a raw persistence read. It is a normalized operational snapshot with derived and fallback behavior.

#### `generatedAt`

Function:

- identifies when the snapshot was generated
- helps the shell indicate staleness / recency

Design note:

- value is generated at response-build time from the service clock

#### `apiBasePath`

Function:

- tells the UI which Phase 3 API root is currently in use
- supports shell-owned endpoint composition and environment clarity

#### `summary`

Function:

- provides top-of-console product framing
- communicates current local mode and runtime strategy

Dashboard usage:

- should feed hero/overview messaging

#### `navigation`

Function:

- exposes the navigation model the shell should use
- allows backend-provided labels and summaries to override UI fallbacks

Dashboard relation:

- indirect; controls shell navigation context around dashboard

#### `stats`

Function:

- provides compact summary metrics for overview cards

Current derivation logic:

- active projects from catalog project count
- queue volume from queue items or active execution history
- 24h success rate from recent execution summaries
- latest run status from most recent execution summary

Dashboard relation:

- this is the proper metric source for dashboard card data
- current `DashboardScreen.tsx` maps these values into the metric-card area

#### `projects`

Function:

- provides project-level overview rows for the shell
- supports count summaries and note narratives

Current derivation logic:

- loaded from `project-catalog.json`
- merged with related cases
- enriched with latest project-related execution summary when available

Dashboard relation:

- supports project health overview and future drill-down entry

#### `cases`

Function:

- exposes recent/important case rows
- supports tag aggregation and status visibility

Current derivation logic:

- loaded from `project-catalog.json`
- sorted by `updatedAt`
- limited for snapshot size control

Dashboard relation:

- useful for future attention widgets and quick operational summaries

#### `workQueue`

Function:

- provides the queue/active work surface for operational overview

Current derivation logic:

- prefer derived scheduler queue items
- fallback to active execution summaries
- fallback to empty-state row

Dashboard relation:

- should feed queue pressure and "needs attention" style content

#### `reports`

Function:

- provides recent run outcome summaries

Current derivation logic:

- built from local execution summaries
- can reflect run directories and execution-history derived results

Dashboard relation:

- should feed the "recent runs" operational area
- current recent-run handoff uses canonical `runId`

#### `modelConfig`

Function:

- returns operator-visible model and routing summary items

Current derivation logic:

- loaded from `config/phase3/model-config.json`
- fallback values used if file is absent

Dashboard relation:

- supports AI decision and runtime policy overview

#### `environmentConfig`

Function:

- returns environment and data-source summary items

Current derivation logic:

- loaded from `config/phase3/environment-config.json`
- fallback items used if file is absent

Dashboard relation:

- supports environment readiness and pool/capacity context

#### `timeline`

Function:

- exposes recent operational events in chronological summary form

Current derivation logic:

- combines recent executions and queue updates
- sorts by event time
- falls back to a "local state pending" item

Dashboard relation:

- supports future timeline or operational activity widgets

#### `constraints`

Function:

- exposes system guardrails and phase limits

Dashboard relation:

- supports operator understanding of platform boundaries

#### `caseTags`

Function:

- returns reusable tag vocabulary from active cases

Dashboard relation:

- indirect; mostly shared across shell and catalog screens

### 4.6 Data Precedence Design

The snapshot builder uses precedence rules. This is important because the dashboard is not reading one canonical database.

Scheduler and queue precedence:

1. derived scheduler service files
   - `scheduler-requests.json`
   - `scheduler-events.json`
2. fallback scheduler snapshot
   - `scheduler-state.json`
3. compatibility queue snapshot
   - `execution-queue.json`
4. compatibility execution history
   - `execution-history.json`
5. local run report files under `runs/`

Config precedence:

1. `model-config.json` / `environment-config.json`
2. hardcoded fallback items

Catalog precedence:

1. `project-catalog.json`
2. empty-state fallback

### 4.7 Error and Method Handling

If method is not `GET`:

- response `405`
- body: `{ "error": "METHOD_NOT_ALLOWED" }`

If `OPTIONS`:

- response `204`

The current implementation does not emit a dashboard-specific business error object. It keeps the endpoint lightweight and deterministic.

## 5. Sibling Interface: GET /health

### Purpose

- local service liveness probe

### Dashboard relation

- not called by dashboard today
- useful for shell startup diagnostics or future refresh diagnostics

### Contract

- Method: `GET`
- Path: `/health`
- Success body: `{ "status": "UP" }`

## 6. Source Mutation Interface: POST /api/phase3/scheduler/requests

### 6.1 Purpose

This endpoint records a new scheduler request from execution launch or pre-execution flow.

It does not directly belong to dashboard, but dashboard metrics and queue summaries are expected to reflect its persisted output through the aggregated snapshot.

### 6.2 Current Caller

- `ui/admin-console/src/App.tsx` execution flow
- `apps/native-host` bridge for extension-triggered execution flow

### 6.3 HTTP Contract

- Method: `POST`
- Path: `/api/phase3/scheduler/requests`
- Success status: `202`

### 6.4 Request Body Design

Required:

- `runId`

Common optional fields:

- `projectKey`
- `owner`
- `environment`
- `title`
- `detail`
- `status`
- `schedulerId`
- `position`
- `requestedAt`

### 6.5 Functional Design

Server behavior:

- validates body is a JSON object
- requires `runId`
- normalizes status to request-state form
- assigns `schedulerId`
  - payload value if present
  - else existing scheduler file id
  - else `local-phase3-scheduler`
- fills title if absent
  - `runId`
  - or `runId / environment`
- fills detail if absent
- fills `requestedAt` if absent
- appends to `scheduler-requests.json`

### 6.6 Response Design

Response fields:

- `status: "ACCEPTED"`
- `kind: "scheduler-request"`
- `path`
- `schedulerId`
- `totalEntries`
- `entry`

### 6.7 Dashboard Effect

Indirect impact on dashboard:

- may increase queued workload
- may affect latest run state
- may affect derived queue/timeline content after the next snapshot load

## 7. Source Mutation Interface: POST /api/phase3/scheduler/events

### 7.1 Purpose

This endpoint records scheduler execution lifecycle events.

Dashboard depends on this indirectly because:

- queue state
- latest run status
- timeline items
- report summaries

are all influenced by scheduler-event data.

### 7.2 Request Body Design

Required:

- `runId`

Common optional fields:

- `projectKey`
- `owner`
- `environment`
- `title`
- `detail`
- `type`
- `state`
- `status`
- `schedulerId`
- `position`
- `total`
- `failed`
- `artifacts`
- `at`

### 7.3 Functional Design

Server behavior:

- validates body is a JSON object
- requires `runId`
- normalizes lifecycle fields to uppercase underscore form
- fills default `type` with `INFO` when no lifecycle field exists
- appends normalized event into `scheduler-events.json`

### 7.4 Response Design

- `status: "ACCEPTED"`
- `kind: "scheduler-event"`
- `path`
- `schedulerId`
- `totalEntries`
- `entry`

### 7.5 Dashboard Effect

Indirect dashboard updates after snapshot refresh:

- active/running review states
- queue summaries
- latest run status
- timeline event stream
- run success/failure summaries

## 8. Source Mutation Interface: POST /api/phase3/config/model

### Purpose

- upsert model config summary items

### Request body

Required:

- `label`
- `value`

### Functional design

- reads existing `model-config.json`
- updates item with same `label` ignoring case
- appends item if label does not exist
- persists as `{ "items": [...] }`

### Response

- `status: "ACCEPTED"`
- `kind: "model-config-item"`
- `path`
- `updated`
- `totalItems`
- `entry`

### Dashboard effect

- updates model-related summary content exposed in snapshot `modelConfig`
- should influence dashboard AI/runtime-policy overview content

## 9. Source Mutation Interface: POST /api/phase3/config/environment

### Purpose

- upsert environment/datasource summary items

### Request body

Required:

- `label`
- `value`

### Functional design

- same persistence pattern as model config
- writes into `environment-config.json`

### Response

- `status: "ACCEPTED"`
- `kind: "environment-config-item"`
- `path`
- `updated`
- `totalItems`
- `entry`

### Dashboard effect

- updates snapshot `environmentConfig`
- supports dashboard environment readiness interpretation

## 10. Source Mutation Interface: POST /api/phase3/catalog/project

### Purpose

- create or update project catalog rows

### Request body

Required:

- `key`
- `name`
- `scope`

Optional:

- `environments`
- `note`

### Functional design

- loads `project-catalog.json`
- replaces existing project by `key` ignoring case
- appends new project if missing
- preserves existing case list
- writes document shape:
  - `projects`
  - `cases`

### Response

- `status: "ACCEPTED"`
- `kind: "catalog-project"`
- `path`
- `updated`
- `totalProjects`
- `entry`

### Dashboard effect

- changes project counts
- changes project notes
- changes active project metric and project overview rows on next snapshot load

## 11. Source Mutation Interface: POST /api/phase3/catalog/case

### Purpose

- create or update case catalog rows

### Request body

Required:

- `id`
- `projectKey`
- `name`

Optional:

- `tags`
- `status`
- `updatedAt`
- `archived`

### Functional design

- loads `project-catalog.json`
- replaces existing case by `id` ignoring case
- appends if absent
- normalizes `tags` from array or comma-separated string
- defaults:
  - `status = ACTIVE`
  - `updatedAt = now`
  - `archived = false`

### Response

- `status: "ACCEPTED"`
- `kind: "catalog-case"`
- `path`
- `updated`
- `totalCases`
- `entry`

### Dashboard effect

- affects case count and tag vocabulary
- affects project notes derived from cases
- affects snapshot `cases` and `caseTags`

## 12. Related Sibling Interface: GET /api/phase3/extension-popup

### Purpose

- returns popup-oriented lightweight snapshot for Edge extension

### Dashboard relation

- not consumed by dashboard directly
- important for architecture understanding because both admin-console and popup are built from the same local-admin-api family
- both surfaces reflect local scheduler and execution state, but at different detail levels

### Architecture relation

- popup can also be reached through `apps/native-host`
- `LocalAdminApiBridge` in native-host calls:
  - `GET /api/phase3/extension-popup`
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`

This means dashboard and popup are siblings over the same local operational backend.

## 13. Native Host and Extension Interface Context

The main docs define extension/native messages such as:

- `EXT_HOST_PING`
- `EXT_PAGE_SUMMARY_GET`
- `EXT_EXECUTION_START`
- `RUN_STATUS_EVENT`
- `RUN_FINISHED_EVENT`
- `REPORT_PATH_GET`

These are not dashboard HTTP interfaces, but they matter to the backend construction:

- extension -> background -> native host -> local admin API / core platform
- admin console -> local admin API

Design conclusion for dashboard:

- dashboard should stay in the local HTTP management path
- dashboard should not directly depend on native messaging contracts
- native messaging remains a parallel assistive channel, not the dashboard transport

## 14. Future Interface Evolution from Main Design Docs

The implementation design documents describe broader future management APIs such as:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/cases`
- `GET /api/cases/{id}`
- `POST /api/cases`
- `PUT /api/cases/{id}`
- `GET /api/runs/{id}/report`
- `POST /api/agent/generate-case`

Current state:

- these are design-direction endpoints
- the current repo uses Phase 3 local endpoints instead:
  - `/api/phase3/admin-console`
  - `/api/phase3/catalog/project`
  - `/api/phase3/catalog/case`
  - `/api/phase3/config/model`
  - `/api/phase3/config/environment`
  - `/api/phase3/scheduler/requests`
  - `/api/phase3/scheduler/events`

Recommended dashboard evolution rule:

- keep `dashboard` on the aggregated snapshot model until the backend domain APIs become stable enough to justify a decomposed query layer
- do not split dashboard into many fine-grained API calls during the current phase unless performance or consistency forces it

## 15. Current Front-End Integration Boundary

Current `App.tsx` behavior:

- `dashboard` only benefits from the shell-level snapshot fetch
- `DashboardScreen.tsx` does not perform direct `fetch`
- `DashboardScreen.tsx` consumes snapshot-backed metric, run, queue, attention, and provider-chip data
- dashboard control clicks are routed through App-level callbacks, not a formal router

Design implication:

- the interface spec must document the real backend capability now available
- and it should reflect the current Phase 3 App-level handoff design instead of a future typed route model

## 16. UI Control to Interface Mapping

This section maps each dashboard control to its expected interface behavior and current implementation state.

### 16.1 Hero Area

#### Control: `Refresh` button

- Area: hero action area
- User action: click
- Intended behavior:
  - reload the latest admin-console snapshot
  - refresh all summary areas on the current screen
- Intended interface:
  - `GET /api/phase3/admin-console`
- Request owner:
  - shell-level `App.tsx`
  - not `DashboardScreen.tsx` directly
- Request parameters:
  - none
- Success feedback:
  - refresh visible metric, queue, report, and timeline-related data
  - show explicit pending/success status in the dashboard view
- Failure feedback:
  - shell-level error or fallback handling
  - show explicit dashboard refresh error state
- Current implementation state:
  - implemented
  - click reuses shell-owned `loadSnapshot()`
  - request sent today: `GET /api/phase3/admin-console`

#### Control: `New run` button

- Area: hero action area
- User action: click
- Intended behavior:
  - navigate the operator into `execution`
  - let `execution` own the real submission flow
- Intended interface:
  - no direct dashboard request
  - downstream screen will later use:
    - `POST /api/phase3/scheduler/requests`
    - `POST /api/phase3/scheduler/events`
- Request owner:
  - `execution` screen flow, not dashboard
- Success feedback:
  - route change into execution workspace
- Failure feedback:
  - if route fails in future implementation, show navigation error
- Current implementation state:
  - implemented
  - click triggers App-level handoff into `execution`

### 16.2 Metric Cards Area

#### Control group: metric cards

- Area: metric summary strip
- User action: view only
- Intended behavior:
  - display aggregated summary values
- Intended interface:
  - data source is `GET /api/phase3/admin-console`
- Request owner:
  - shell-level snapshot loader
- Request timing:
  - on console load
  - on manual refresh
- Current implementation state:
  - rendered from snapshot-derived card view models
  - no independent click or request behavior

### 16.3 Recent Runs Panel

#### Control group: recent run rows

- Area: `Recent runs`
- User action: inspect row, click on row
- Intended behavior:
  - show recent execution summary
  - allow drill-down into report detail
- Intended interface for display:
  - `GET /api/phase3/admin-console`
- Intended interface for drill-down:
  - no direct dashboard write request
  - route to `reportDetail`
  - downstream detail screen then reads:
    - `GET /api/phase3/runs/{runId}/report`
- Request owner:
  - display owned by shell snapshot
  - drill-down owned by navigation/report screens
- Current implementation state:
  - rows are visible and clickable
  - click triggers App-level handoff into `reportDetail`
  - canonical row identity is `reports[].runId`

#### Control: recent runs panel time-range label

- Area: `Recent runs`
- User action: none
- Intended behavior:
  - static label explaining the current summary range
- Intended interface:
  - none directly
- Current implementation state:
  - static label only

### 16.4 Needs Attention Panel

#### Control group: attention items

- Area: `Needs attention`
- User action: inspect item, click on item
- Intended behavior:
  - expose prioritized risk items
  - route operator to the correct downstream module
- Intended interface for display:
  - `GET /api/phase3/admin-console`
- Intended route mapping by item type:
  - locator drift -> `reportDetail`
  - browser pool saturation -> `monitor`
  - rollback lock -> `dataDiff`
  - audit backlog -> `models`
- Request owner:
  - display via shell snapshot
  - deeper query or write behavior owned by downstream page
- Current implementation state:
  - items are visible and clickable
  - click triggers App-level handoff by target type

#### Control: attention count badge

- Area: `Needs attention`
- User action: none
- Intended behavior:
  - summarize attention item volume
- Intended interface:
  - derived from the current front-end attention view model built from snapshot data
- Current implementation state:
  - dynamic visible badge
  - no direct request behavior

### 16.5 AI Decisions Panel

#### Control group: provider chips

- Area: `AI decisions`
- User action: inspect, click on provider chip
- Intended behavior:
  - show AI posture at overview level
  - route to model/routing management when needed
- Intended interface for display:
  - `GET /api/phase3/admin-console`
  - specifically snapshot-derived `modelConfig[]`
- Intended downstream relation:
  - navigation to `models`
- Request owner:
  - display from shell snapshot
  - deeper investigation owned by configuration screens
- Current implementation state:
  - visible as snapshot-derived overview content
  - provider chips are clickable
  - click triggers App-level handoff into `models`

### 16.6 Shell-Level Controls That Affect Dashboard

These controls are not inside `DashboardScreen.tsx`, but they affect dashboard visibility and should be considered part of the screen-use interface context.

#### Control: sidebar navigation item `dashboard`

- Area: shell sidebar
- User action: click
- Behavior:
  - sets active screen to `dashboard`
- Intended interface:
  - no direct backend request by the click itself
  - dashboard content still depends on the latest shell snapshot
- Current implementation state:
  - implemented

#### Control: top bar language switch

- Area: shell top bar
- User action: select locale
- Behavior:
  - changes localized copy rendering
- Intended interface:
  - no backend request
- Current implementation state:
  - implemented

#### Control: top bar theme switch

- Area: shell top bar
- User action: select theme
- Behavior:
  - changes UI theme mode
- Intended interface:
  - no backend request
- Current implementation state:
  - implemented

### 16.7 Controls Not Present on Dashboard

The current `dashboard` screen has no:

- input field
- select dropdown
- editable table
- checkbox
- radio group
- submit form

Therefore, there is currently no dashboard-specific control that accepts operator input and submits structured request payloads directly.

## 17. Current App-Level Wiring Design

This section records the implemented Phase 3 wiring for dashboard controls.

### 17.1 `Refresh`

Implemented behavior:

- `DashboardScreen` exposes `onRefresh?: () => void`
- `DashboardScreen` also consumes `refreshState: MutationState`
- `App.tsx` passes a shell-owned refresh handler
- clicking `Refresh` reuses the existing snapshot reload path

Interface behavior:

- request: `GET /api/phase3/admin-console`
- request owner: shell `App.tsx`
- success:
  - refreshed snapshot is written back into shell state
  - dashboard re-renders from the updated snapshot
  - `refreshState` becomes `success`
- failure:
  - existing shell fallback/source-label handling is reused
  - `refreshState` becomes `error`

### 17.2 `New run`

Implemented behavior:

- `DashboardScreen` exposes `onNewRun?: () => void`
- `App.tsx` passes `handleScreenChange("execution")`
- clicking `New run` performs App-level handoff only

Interface behavior:

- immediate dashboard request: none
- downstream write ownership remains in `execution`:
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`

### 17.3 Recent Run Row Click

Implemented behavior:

- `AdminConsoleSnapshot.reports[]` includes canonical `runId`
- `DashboardScreen` renders recent runs from snapshot data
- each row click calls `onOpenRunDetail(runId)`
- `App.tsx` routes that handoff through the existing report-detail state

Interface behavior:

- immediate dashboard request: none
- downstream detail read:
  - `GET /api/phase3/runs/{runId}/report`

### 17.4 Attention Item Click

Implemented behavior:

- `DashboardScreen` derives target-aware attention items from snapshot data
- target model:

```ts
type DashboardAttentionTarget =
  | { kind: "reportDetail"; runId: string }
  | { kind: "monitor"; runId?: string | null }
  | { kind: "dataDiff"; runId?: string | null }
  | { kind: "models" };
```

- `App.tsx` routes the handoff as:
  - `reportDetail` -> `openReportDetail(runId)`
  - `monitor` -> `openMonitor(runId)`
  - `dataDiff` -> `openDataDiff(runId ?? selectedReportRunName)`
  - `models` -> `handleScreenChange("models")`

Interface behavior:

- immediate dashboard request: none
- deeper reads stay owned by downstream screens

### 17.5 AI Provider Chips

Implemented behavior:

- provider chips are derived from snapshot `modelConfig[]`
- clicking a chip calls `onOpenModels(providerId)`
- `App.tsx` currently uses that as a lightweight App-level handoff into `models`

Interface behavior:

- immediate dashboard request: none
- current handoff granularity: screen-level only
- no Phase 4 typed focus payload is introduced in this stage

## 18. Review Items

Review findings after sync with current code:

- `GET /api/phase3/admin-console` remains the correct single aggregated read interface for dashboard.
- The dashboard screen should continue to treat all write endpoints as indirect source interfaces, not direct dashboard actions.
- `Refresh` correctly reuses shell snapshot reload instead of introducing a second dashboard fetch path.
- `New run` correctly stays as an App-level handoff into `execution`; write ownership remains with scheduler request/event flows.
- Dashboard run and attention handoff now depend on canonical `runId` in snapshot `reports[]`, which should remain explicit in the interface contract.
- When future backend domain APIs mature, the dashboard may evolve from one aggregated snapshot to a composed query model, but that is not the current Phase 3 implementation.
