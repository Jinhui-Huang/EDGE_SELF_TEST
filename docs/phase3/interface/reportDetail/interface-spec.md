# Report Detail Interface Specification

## 1. Scope and Design Basis

- Screen: `reportDetail`
- UI implementation:
  - `ui/admin-console/src/screens/ReportDetailScreen.tsx`
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

- current read context
- App-level selected-run handoff into and out of the screen
- current synthetic detail layer
- future true report interfaces and artifact actions

## 2. Interface Summary

Current `reportDetail` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - none
- current navigation outputs:
  - back to `reports`
  - open `dataDiff`
- current detail data is front-end-derived from `selectReportViewModel(snapshot, selectedRunName)`
- true report-detail behavior implied by the screen requires backend-authored run report interfaces

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for Report Detail Screen

The `reportDetail` screen currently uses the same shared snapshot as its read model and selects one report through `selectedRunName`.

Relevant snapshot fields for this screen:

- `reports[]`
- `cases[]`
- `projects[]`

### 3.2 Functional Role by Field

- `reports[]`
  - provides raw run list seed data
- `cases[]`
  - used to infer case identity and tags
- `projects[]`
  - used to infer project labels

### 3.3 Ownership Boundary

- backend/local-admin-api owns the raw snapshot
- `App.tsx` owns `selectedReportRunName`
- `reportViewModel.ts` owns detail derivation
- `ReportDetailScreen.tsx` owns only local tab/button rendering

## 4. Current Synthetic Detail Layer

The current detail screen does not read a true report artifact.

### 4.1 Current Derivation Entry Point

- `selectReportViewModel(snapshot, selectedRunName)`

### 4.2 Current Derived/Synthetic Fields

The following detail fields are currently synthetic or heuristically derived:

- duration
- environment
- operator
- model
- step counts
- assertion counts
- AI calls
- AI cost
- heals
- recovery summary
- screenshot cards
- assertion rows

### 4.3 Interface Meaning

This means the current page should be documented as:

- a run-detail UI shell over a synthetic view model
- not yet a stable backend-backed report artifact reader

## 5. Current App-Level Handoff Interfaces

### 5.1 Entry from Reports

Current App-level handoff behavior:

- `ReportsScreen.tsx` calls `onOpenDetail(runName)`
- `App.tsx` stores:
  - `selectedReportRunName = runName`
- `App.tsx` sets:
  - `activeScreen("reportDetail")`

### 5.2 Back to Reports

Current behavior:

- `onBackToReports()` sets `activeScreen("reports")`
- no backend request

### 5.3 Open Data Diff

Current behavior:

- `onOpenDataDiff()` calls `openDataDiff(selectedReportRunName)`
- `App.tsx` stores run name if present
- `App.tsx` sets `activeScreen("dataDiff")`
- no backend request from `reportDetail` itself

## 6. UI Control to Interface Mapping

### 6.1 Breadcrumb Controls

#### `Reports`

- user action: click
- request: none
- owner: `App.tsx` screen-selection state
- success behavior: navigate back to `reports`
- failure behavior: none required
- current state: implemented

### 6.2 Hero Controls

#### `Download artifacts`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - artifact listing or artifact download endpoint
- current state: visible only

#### `Re-run`

- user action: click
- request: none today
- owner: not implemented
- intended future behavior:
  - route-state handoff into `execution`
  - optional prefilled launch context
- current state: visible only

### 6.3 Tab Controls

#### `Overview`

- user action: click
- request: none today
- intended future behavior:
  - activate summary sub-view
- current state: visual only

#### `Steps`

- user action: click
- request: none today
- intended future behavior:
  - activate step-detail sub-view
- current state: visual only

#### `Assertions`

- user action: click
- request: none today
- intended future behavior:
  - activate assertion-detail sub-view
- current state: visual only

#### `Data diff`

- user action: click
- request: none from `reportDetail`
- owner: App-level selected-run handoff
- success behavior: navigate to `dataDiff` with current run context
- current state: implemented

#### `Recovery`

- user action: click
- request: none today
- intended future behavior:
  - activate recovery-detail sub-view
- current state: visual only

#### `AI decisions`

- user action: click
- request: none today
- intended future behavior:
  - activate AI-decision sub-view
- current state: visual only

## 7. Relationship to Other Interfaces

### 7.1 Relationship to Reports

- `reportDetail` is the direct downstream page of `reports`
- current selection handoff uses run name only

### 7.2 Relationship to Data Diff

- `reportDetail` is the current upstream page for `dataDiff`
- only the selected run context is handed over today

### 7.3 Relationship to Execution

- `Re-run` logically belongs to `execution`
- this page should hand off run context, not own launch submission

## 8. Future Interface Evolution from Main Design Docs

The main design docs already point toward richer run/report contracts such as:

- `GET /api/runs/{id}`
- `GET /api/runs/{id}/report`

These are the correct long-term direction for `reportDetail`.

Recommended Phase 3 evolution:

- keep current App-level selected-run handoff structure
- replace synthetic detail panels with backend-authored report artifact reads
- keep heavy artifact fetching on `reportDetail`, not on `reports`

## 9. Recommended Future Report Detail Interfaces

Identifier note:

- current UI still carries selected run context by `runName`
- future backend path parameters should use canonical `{runId}`
- transition logic may temporarily map selected `runName` onto backend `runId`

### 9.1 Full Report Interface

#### `GET /api/phase3/runs/{runId}/report`

Purpose:

- return the full report artifact metadata and summary payload for one run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "projectKey": "checkout-web",
  "caseId": "checkout-smoke",
  "caseName": "Checkout smoke",
  "status": "FAILED",
  "finishedAt": "2026-04-20T05:40:00Z",
  "durationMs": 246000,
  "environment": "staging",
  "model": "claude-4.5-sonnet",
  "operator": "qa-platform",
  "reportJsonPath": "D:\\...\\runs\\checkout-web-nightly\\report.json",
  "reportHtmlPath": "D:\\...\\runs\\checkout-web-nightly\\report.html",
  "summary": {
    "stepsPassed": 7,
    "stepsTotal": 8,
    "assertionsPassed": 4,
    "assertionsTotal": 5,
    "aiCalls": 18,
    "aiCost": "$0.048",
    "heals": 1,
    "recovery": "needs review"
  }
}
```

### 9.2 Steps Detail Interface

#### `GET /api/phase3/runs/{runId}/steps`

Purpose:

- return step-by-step execution records for the run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "items": [
    {
      "index": 1,
      "action": "goto",
      "target": "/cart",
      "status": "PASS",
      "durationMs": 800
    }
  ]
}
```

### 9.3 Assertions Detail Interface

#### `GET /api/phase3/runs/{runId}/assertions`

Purpose:

- return assertion records for the run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "items": [
    {
      "name": "url matches /order/confirm/*",
      "actual": "/checkout/payment",
      "expected": "/order/confirm/*",
      "pass": false
    }
  ]
}
```

### 9.4 Recovery Detail Interface

#### `GET /api/phase3/runs/{runId}/recovery`

Purpose:

- return restore/recovery actions and results for the run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "status": "PARTIAL",
  "items": [
    {
      "step": "restore snapshot",
      "status": "SUCCESS",
      "detail": "Primary checkout schema restored"
    }
  ]
}
```

### 9.5 AI Decisions Detail Interface

#### `GET /api/phase3/runs/{runId}/ai-decisions`

Purpose:

- return runtime AI decision and heal history for the run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "items": [
    {
      "at": "2026-04-20T05:37:12Z",
      "type": "LOCATOR_HEAL",
      "model": "claude-4.5-sonnet",
      "summary": "Candidate[1] selected after primary locator failed"
    }
  ]
}
```

### 9.6 Artifact Listing Interface

#### `GET /api/phase3/runs/{runId}/artifacts`

Purpose:

- list downloadable artifacts for the run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "items": [
    {
      "kind": "report-html",
      "label": "report.html",
      "path": "D:\\...\\runs\\checkout-web-nightly\\report.html"
    },
    {
      "kind": "report-json",
      "label": "report.json",
      "path": "D:\\...\\runs\\checkout-web-nightly\\report.json"
    }
  ]
}
```

## 10. Detailed Implementation Design for Currently Unwired Controls

### 10.1 `Download artifacts`

Recommended implementation type:

- new artifact-listing/read interface

Concrete implementation design:

- button first calls:
  - `GET /api/phase3/runs/{runId}/artifacts`
- UI then opens:
  - local artifact drawer
  - or direct download/open behavior for chosen item

Reasoning:

- the page should not guess artifact paths from front-end synthetic data
- artifact availability belongs to backend-authored run output

### 10.2 `Re-run`

Recommended implementation type:

- route-state handoff into `execution`
- no direct execution-start mutation from `reportDetail`

Concrete implementation design:

- add app-level helper:
  - `openExecutionFromRun(runName: string)`
- helper behavior:
  - load or reuse run summary context
  - prefill `launchForm` with:
    - project key
    - environment
    - execution model
    - target URL when available
  - preselect the relevant case if available
  - set active screen to `execution`

Recommended supporting read:

- `GET /api/phase3/runs/{runId}/report-summary`
  - or `GET /api/phase3/runs/{runId}/report`

Reasoning:

- actual scheduler mutations remain owned by `execution`

### 10.3 Tabs Other Than `Data diff`

Recommended implementation type:

- local active-tab state
- tab-specific reads from true report endpoints

Recommended local state:

```ts
type ReportDetailTab = "overview" | "steps" | "assertions" | "dataDiff" | "recovery" | "aiDecisions";
```

Tab behavior design:

- `Overview`
  - request:
    - `GET /api/phase3/runs/{runId}/report`
- `Steps`
  - request:
    - `GET /api/phase3/runs/{runId}/steps`
- `Assertions`
  - request:
    - `GET /api/phase3/runs/{runId}/assertions`
- `Data diff`
  - route-state to `dataDiff`
- `Recovery`
  - request:
    - `GET /api/phase3/runs/{runId}/recovery`
- `AI decisions`
  - request:
    - `GET /api/phase3/runs/{runId}/ai-decisions`

## 11. Error Handling Boundary

Current implementation:

- no direct backend requests from `reportDetail`
- fallback no-report state if selected run cannot be resolved

Recommended future read-interface errors:

- `GET /api/phase3/runs/{runId}/report`
  - `404` when report artifact does not exist
- `GET /api/phase3/runs/{runId}/artifacts`
  - `200` with empty items when no artifacts are available

Recommended future action errors:

- `Re-run` prep read failures should surface as route-preparation errors before entering `execution`

## 12. Review Items

Review-only findings:

- The current page is already the correct run-detail entry point, but the body content is still mostly synthetic.
- `Data diff` handoff is the only real actionable tab today.
- `Download artifacts` and `Re-run` need explicit behavior ownership and should not remain placeholder buttons.
- This page should eventually become the first report page that reads true report artifacts from backend-owned run outputs such as `report.json` and `report.html`.

These are documentation findings only. No implementation change is made in this stage.
