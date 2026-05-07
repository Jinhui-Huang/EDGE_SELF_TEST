# Reports Interface Specification

Update note:
- P1-2 is implemented in the current workspace.
- `reports` is now backend-first on `GET /api/phase3/runs/`.
- App-level navigation uses canonical `runId` for `onOpenDetail(runId)`.
- Snapshot/view-model synthesis remains fallback-only when the run-list API is unavailable.

## 1. Scope and Design Basis

- Screen: `reports`
- UI implementation:
  - `ui/admin-console/src/screens/ReportsScreen.tsx`
  - `ui/admin-console/src/screens/reportViewModel.ts`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`

This document distinguishes:

- current read interfaces
- front-end report list derivation logic
- App-level selected-run handoff into `reportDetail`
- future report-list/report-detail interfaces implied by the main design docs

## 2. Interface Summary

Current `reports` screen conclusion:

- current direct read source:
  - `GET /api/phase3/runs/`
- current direct write source:
  - none
- current direct navigation output:
  - run-detail App-level selected-run handoff via `onOpenDetail(runId)`
- current report list is backend-first from canonical run-summary rows; snapshot/view-model synthesis is fallback-only when the list API is unavailable

## 3. Direct Read Interface: GET /api/phase3/runs/

### 3.1 Purpose for Reports Screen

The `reports` screen uses the canonical backend run list as its primary read model.

Relevant run-summary fields for this screen:

- `items[].runId`
- `items[].runName`
- `items[].projectKey` / `projectName`
- `items[].caseId` / `caseName` / `tags[]`
- `items[].status`
- `items[].finishedAt`
- `items[].durationMs`
- `items[].environment`
- `items[].stepsPassed` / `stepsTotal`
- `items[].assertionsPassed` / `assertionsTotal`

### 3.2 Functional Role by Field

- backend run-summary rows
  - provide the canonical report-list catalog shown in the run table
- `snapshot.timeline[]`
  - still drives the operator timeline side panel

### 3.3 Ownership Boundary

- backend/local-admin-api owns the canonical run-summary list contract
- `App.tsx` owns selected-run state
- `ReportsScreen.tsx` owns project selection and overview collapse
- `reportViewModel.ts` remains fallback-only report-row derivation when the run-list API is unavailable

## 4. Front-End Derived Report View Model

The remaining interface caveat for this screen is no longer the primary list path; it is the fallback path used only when the run-list API is unavailable.

### 4.1 Current Derivation Entry Point

- `buildReportViewModels(snapshot)` in `ui/admin-console/src/screens/reportViewModel.ts`

### 4.2 Current Derivation Rules

The fallback view model infers or synthesizes these fields:

- best matching case
  - by matching normalized `runName` against case id/name/project key
- project key/name
  - from the matched case or first project fallback
- environment
  - derived heuristically from status and row index
- operator
  - derived by rotating a fixed local list
- model
  - derived by rotating a fixed local list
- duration
  - derived from status class
- step/assertion counts
  - computed heuristically from tags and status
- AI calls, AI cost, heals
  - synthetic counters
- screenshots and assertions
  - local synthetic detail payloads

### 4.3 Interface Meaning

This means the current reports list should be documented as:

- backend-native by default
- snapshot/view-model-derived only when the canonical run-list API is unavailable

Anything derived here should be treated as fallback shell data rather than the authoritative list contract.

## 5. Local-Only Screen Controls

These controls change screen state without calling the backend directly.

### 5.1 Overview Collapse

- owner: local `overviewCollapsed`
- request: none

### 5.2 Project Switch

- owner: local `selectedProjectKey`
- request: none

### 5.3 Selected Run Highlight

- owner:
  - shell-selected `selectedRunId`
  - local selected project synchronization
- request: none

## 6. UI Control to Interface Mapping

### 6.1 Overview Controls

#### Collapse / expand button

- user action: click
- request: none
- owner: `ReportsScreen.tsx`
- success behavior: overview body toggles
- failure behavior: none required
- current state: implemented

### 6.2 Project Rail Controls

#### Project button

- user action: click
- request: none
- owner: `ReportsScreen.tsx`
- success behavior:
  - selected project changes
  - visible run list changes
- failure behavior: none required
- current state: implemented

### 6.3 Run List Controls

#### `Detail`

- user action: click
- request: none from `reports` itself
- owner:
  - `ReportsScreen.tsx` emits `onOpenDetail(runId)`
  - `App.tsx` stores `selectedReportRunId` and navigates to `reportDetail`
- success behavior:
  - selected run becomes the report-detail target
  - route changes to `reportDetail`
- failure behavior:
  - if run name is invalid, downstream detail screen falls back to available detail behavior
- current state: implemented

### 6.4 Timeline Controls

#### Timeline item

- user action: inspect only today
- request: none today
- intended future behavior:
  - route to `reportDetail` when event maps to a run
  - route to `monitor` when event maps to a live runtime issue
- current state: display only

## 7. Relationship to Other Interfaces

### 7.1 Relationship to Execution and Monitor

- `reports` is downstream of runs created in `execution`
- `reports` is downstream of runtime activity observed in `monitor`
- the list should eventually reflect real run metadata produced by execution/report engines

### 7.2 Relationship to Report Detail

- `reports` is the current upstream list page for `reportDetail`
- current handoff is App-level selected-run handoff through canonical `runId`

### 7.3 Relationship to Data Diff

- `reports` itself does not open `dataDiff`
- but the selected run from `reports` becomes the likely upstream context for `reportDetail`, which can open `dataDiff`

## 8. Future Interface Evolution from Main Design Docs

The main design docs already describe fuller run/report interfaces such as:

- `GET /api/runs/{id}`
- `GET /api/runs/{id}/report`

Those are more appropriate long-term contracts for the report pages than the current synthetic front-end view model.

Recommended Phase 3 evolution:

- keep the run-list page on `GET /api/phase3/runs/`
- continue moving `reportDetail` / `dataDiff` away from snapshot fallback and deterministic mock payloads
- later tighten the remaining backend summary coverage if more list fields need to stop falling back

## 9. Recommended Future Report Interfaces

Identifier note:

- current UI selection now revolves around canonical `runId`
- future backend path parameters should treat `{runId}` as the canonical run identifier
- `cases` history handoff now normally arrives with a dedicated canonical `runId`; only older history payloads that still omit `runId` may require temporary `runName` fallback

The current list already has dedicated report-list/report-summary interfaces; future work should deepen backend-native coverage rather than reintroduce snapshot derivation.

### 9.1 Report List Interface

#### `GET /api/phase3/runs`

Purpose:

- return run-summary rows for list browsing

Query parameters:

- `projectKey`
- `status`
- `limit`

Example:

`GET /api/phase3/runs?projectKey=checkout-web&limit=20`

Response body:

```json
{
  "items": [
    {
      "runName": "checkout-web-nightly",
      "projectKey": "checkout-web",
      "projectName": "checkout-web",
      "caseId": "checkout-smoke",
      "caseName": "Checkout smoke",
      "status": "FAILED",
      "finishedAt": "2026-04-20T05:40:00Z",
      "environment": "staging",
      "model": "claude-4.5-sonnet",
      "durationMs": 246000,
      "stepsPassed": 7,
      "stepsTotal": 8,
      "assertionsPassed": 4,
      "assertionsTotal": 5,
      "tags": ["smoke", "payment"]
    }
  ]
}
```

### 9.2 Report Detail Summary Interface

#### `GET /api/phase3/runs/{runId}/report-summary`

Purpose:

- return the list-level summary row for one run without loading the full report artifact

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "projectKey": "checkout-web",
  "caseId": "checkout-smoke",
  "status": "FAILED",
  "finishedAt": "2026-04-20T05:40:00Z",
  "environment": "staging",
  "model": "claude-4.5-sonnet"
}
```

### 9.3 Full Report Interface

#### `GET /api/phase3/runs/{runId}/report`

Purpose:

- return or resolve the true report artifact for one run

Recommended response body:

```json
{
  "runName": "checkout-web-nightly",
  "reportJsonPath": "D:\\...\\runs\\checkout-web-nightly\\report.json",
  "reportHtmlPath": "D:\\...\\runs\\checkout-web-nightly\\report.html",
  "status": "FAILED"
}
```

This aligns with the main design docs that describe `report.json` and `report.html` under each run directory.

## 10. Detailed Implementation Design for Current and Near-Term Gaps

### 10.1 `Detail` Button

Recommended implementation type:

- keep current App-level selected-run handoff
- no extra request from `reports` page itself

Concrete behavior:

- `Detail` continues to call `onOpenDetail(runId)`
- downstream `reportDetail` becomes the first page allowed to fetch a true report contract such as:
  - `GET /api/phase3/runs/{runId}/report`

Reasoning:

- list page should stay lightweight
- full artifact loading belongs to detail page

### 10.2 Timeline Item Drill-Down

Recommended implementation type:

- route-state handoff
- no new backend endpoint required for first implementation

Concrete mapping:

- timeline item references a finished run:
  - route to `reportDetail`
- timeline item references active runtime issue:
  - route to `monitor`

Required refinement:

- timeline items need machine-readable target metadata rather than free-text title only

Recommended model:

```ts
type TimelineTarget =
  | { kind: "reportDetail"; runId: string }
  | { kind: "monitor"; runId?: string | null };
```

## 11. Error Handling Boundary

Current implementation:

- no list-page write request exists
- list-page errors are mostly limited to missing/empty snapshot data

Current empty handling:

- if selected project has no reports, show no-runs message

Recommended future read-interface errors:

- `GET /api/phase3/runs`
  - `200` with empty items for no results
- `GET /api/phase3/runs/{runId}/report`
  - `404` when report artifact does not exist

## 12. Review Items

Review-only findings:

- The current list page is backend-native by default, but the snapshot/view-model fallback path still exists when `GET /api/phase3/runs/` is unavailable.
- `GET /api/phase3/admin-console` remains enough for a lightweight fallback overview but not for the primary stable report-list contract.
- `Detail` ownership is correctly routed into `reportDetail`.
- Timeline items still need machine-readable drill-down targets if they are to become actionable.

These are documentation findings only. No implementation change is made in this stage.
