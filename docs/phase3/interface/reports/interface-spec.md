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
  - `GET /api/phase3/admin-console`
- current direct write source:
  - none
- current direct navigation output:
  - run-detail App-level selected-run handoff via `onOpenDetail(runName)`
- current report list is not a raw backend list contract; it is a front-end-derived view model built from snapshot data

## 3. Direct Read Interface: GET /api/phase3/admin-console

### 3.1 Purpose for Reports Screen

The `reports` screen uses the admin-console snapshot as its current list read model.

Relevant snapshot fields for this screen:

- `reports[]`
- `cases[]`
- `projects[]`
- `timeline[]`

### 3.2 Functional Role by Field

- `reports[]`
  - provides raw run list seed data
- `cases[]`
  - used to infer case identity and tags for each run
- `projects[]`
  - used to infer project grouping and labels
- `timeline[]`
  - drives the operator timeline side panel

### 3.3 Ownership Boundary

- backend/local-admin-api owns the raw snapshot
- `App.tsx` owns selected-run state
- `ReportsScreen.tsx` owns project selection and overview collapse
- `reportViewModel.ts` owns front-end report-row derivation

## 4. Front-End Derived Report View Model

The biggest interface caveat for this screen is that it does not render a stable backend-native report list DTO.

### 4.1 Current Derivation Entry Point

- `buildReportViewModels(snapshot)` in `ui/admin-console/src/screens/reportViewModel.ts`

### 4.2 Current Derivation Rules

The view model infers or synthesizes these fields:

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

- a UI summary model
- not a stable backend report-list contract

Anything derived here should not be treated as already-authoritative interface data.

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
  - shell-selected `selectedRunName`
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
  - `ReportsScreen.tsx` emits `onOpenDetail(runName)`
  - `App.tsx` stores `selectedReportRunName` and navigates to `reportDetail`
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
- current handoff is App-level selected-run handoff through selected run name

### 7.3 Relationship to Data Diff

- `reports` itself does not open `dataDiff`
- but the selected run from `reports` becomes the likely upstream context for `reportDetail`, which can open `dataDiff`

## 8. Future Interface Evolution from Main Design Docs

The main design docs already describe fuller run/report interfaces such as:

- `GET /api/runs/{id}`
- `GET /api/runs/{id}/report`

Those are more appropriate long-term contracts for the report pages than the current synthetic front-end view model.

Recommended Phase 3 evolution:

- keep current list page on aggregated snapshot until a real list endpoint exists
- move detail rendering toward backend-authored report contracts first
- later add a list-oriented run/report summary endpoint for `reports`

## 9. Recommended Future Report Interfaces

Identifier note:

- current UI selection still revolves around `runName`
- future backend path parameters should treat `{runId}` as the canonical run identifier
- transition code may temporarily map selected `runName` onto backend `runId`

Because the current list is synthetic, the screen would benefit from dedicated report-list/report-summary interfaces.

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

- `Detail` continues to call `onOpenDetail(runName)`
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
  | { kind: "reportDetail"; runName: string }
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

- The current list page is useful as a browsing shell, but its row content is materially front-end-synthesized.
- `GET /api/phase3/admin-console` is enough for a lightweight overview but not enough for a stable report-list contract.
- `Detail` ownership is correctly routed into `reportDetail`.
- Timeline items still need machine-readable drill-down targets if they are to become actionable.

These are documentation findings only. No implementation change is made in this stage.
