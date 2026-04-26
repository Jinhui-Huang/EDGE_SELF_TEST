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
- current backend-backed report-detail interfaces
- current artifact and re-run actions

## 2. Interface Summary

Current `reportDetail` screen conclusion:

- current direct read sources:
  - `GET /api/phase3/runs/{runId}/report` (main report, loaded on mount)
  - `GET /api/phase3/runs/{runId}/steps` (on Steps tab activation)
  - `GET /api/phase3/runs/{runId}/assertions` (on Assertions tab activation)
  - `GET /api/phase3/runs/{runId}/recovery` (on Recovery tab activation)
  - `GET /api/phase3/runs/{runId}/ai-decisions` (on AI decisions tab activation)
  - `GET /api/phase3/runs/{runId}/artifacts` (on Download artifacts click)
  - `GET /api/phase3/admin-console` (fallback snapshot)
- current direct write source:
  - none
- current navigation outputs:
  - back to `reports`
  - open `dataDiff`
  - re-run handoff into `execution` with run context pre-filled
- fallback to `selectReportViewModel(snapshot, selectedRunName)` when API is unavailable
- backend implementation: `ReportArtifactService.java` provides all report-detail read endpoints

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

## 4. Current Detail Layer

The current detail screen reads real report-detail interfaces first and falls back to the snapshot-derived view model only when API data is unavailable.

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

- a backend-backed run-detail screen with API-first tab data
- a snapshot-fallback shell when report-detail APIs are unavailable

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
- request: `GET /api/phase3/runs/{runId}/artifacts`
- owner: `ReportDetailScreen.tsx`
- success behavior: open artifact listing drawer with kind/label/path for each artifact
- failure behavior: surface fetch error in action status
- current state: implemented

#### `Re-run`

- user action: click
- request: none (App-level handoff only)
- owner: `App.tsx` via `onRerun` callback
- success behavior: navigate to `execution` with launch form pre-filled (runId, projectKey, environment, model)
- failure behavior: none required (local state handoff)
- current state: implemented

### 6.3 Tab Controls

#### `Overview`

- user action: click
- request: uses main report data from `GET /api/phase3/runs/{runId}/report` (loaded on mount)
- owner: `ReportDetailScreen.tsx` local tab state
- success behavior: show summary panels (progress ring, stat cards)
- current state: implemented (default active tab)

#### `Steps`

- user action: click
- request: `GET /api/phase3/runs/{runId}/steps` (on first activation)
- owner: `ReportDetailScreen.tsx` local tab state
- success behavior: show step timeline with index, action, target, status, duration
- current state: implemented

#### `Assertions`

- user action: click
- request: `GET /api/phase3/runs/{runId}/assertions` (on first activation)
- owner: `ReportDetailScreen.tsx` local tab state
- success behavior: show assertion detail with name, actual, expected, pass/fail
- current state: implemented

#### `Data diff`

- user action: click
- request: none from `reportDetail`
- owner: App-level selected-run handoff
- success behavior: navigate to `dataDiff` with current run context
- current state: implemented

#### `Recovery`

- user action: click
- request: `GET /api/phase3/runs/{runId}/recovery` (on first activation)
- owner: `ReportDetailScreen.tsx` local tab state
- success behavior: show recovery items with step, status badge, detail
- current state: implemented

#### `AI decisions`

- user action: click
- request: `GET /api/phase3/runs/{runId}/ai-decisions` (on first activation)
- owner: `ReportDetailScreen.tsx` local tab state
- success behavior: show AI decision log with timestamp, type, model, summary
- current state: implemented

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
- keep heavy artifact fetching on `reportDetail`, not on `reports`

## 9. Implemented Report Detail Interfaces

Identifier note:

- the UI carries selected run context by `runName` which maps to `{runId}` in backend path parameters

### 9.1 Full Report Interface (implemented)

#### `GET /api/phase3/runs/{runId}/report`

Purpose:

- return the full report artifact metadata and summary payload for one run
- loaded on screen mount

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

### 9.2 Steps Detail Interface (implemented)

#### `GET /api/phase3/runs/{runId}/steps`

Purpose:

- return step-by-step execution records for the run
- fetched on Steps tab activation

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

### 9.3 Assertions Detail Interface (implemented)

#### `GET /api/phase3/runs/{runId}/assertions`

Purpose:

- return assertion records for the run
- fetched on Assertions tab activation

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

### 9.4 Recovery Detail Interface (implemented)

#### `GET /api/phase3/runs/{runId}/recovery`

Purpose:

- return restore/recovery actions and results for the run
- fetched on Recovery tab activation
- backend: `ReportArtifactService.getRecovery()` reads `recovery.json` from run dir, falls back to deterministic mock

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

### 9.5 AI Decisions Detail Interface (implemented)

#### `GET /api/phase3/runs/{runId}/ai-decisions`

Purpose:

- return runtime AI decision and heal history for the run
- fetched on AI decisions tab activation
- backend: `ReportArtifactService.getAiDecisions()` reads `ai-decisions.json` from run dir, falls back to deterministic mock

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

### 9.6 Artifact Listing Interface (implemented)

#### `GET /api/phase3/runs/{runId}/artifacts`

Purpose:

- list downloadable artifacts for the run
- fetched on Download artifacts button click

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

## 10. Implementation Reference for Wired Controls

### 10.1 `Download artifacts` (implemented)

Implementation:

- button calls `GET /api/phase3/runs/{runId}/artifacts`
- UI opens local artifact listing drawer showing kind/label/path per item
- drawer has dismiss button to close

### 10.2 `Re-run` (implemented)

Implementation:

- App-level `onRerun` callback receives `{ runId, projectKey, environment, model }`
- `App.tsx` sets `launchForm` fields from run context and switches to `execution`
- no direct execution-start mutation from `reportDetail`
- `projectKey` is parsed from `runId` prefix; `environment` and `model` come from report data when available

### 10.3 Tabs (all implemented)

Local state:

```ts
type ReportDetailTab = "overview" | "steps" | "assertions" | "dataDiff" | "recovery" | "aiDecisions";
```

Tab behavior:

- `Overview`: default active tab, uses main report data loaded on mount
- `Steps`: fetches `GET /api/phase3/runs/{runId}/steps` on first activation, cached
- `Assertions`: fetches `GET /api/phase3/runs/{runId}/assertions` on first activation, cached
- `Data diff`: App-level handoff to `dataDiff`
- `Recovery`: fetches `GET /api/phase3/runs/{runId}/recovery` on first activation, cached
- `AI decisions`: fetches `GET /api/phase3/runs/{runId}/ai-decisions` on first activation, cached

## 11. Error Handling Boundary

Current implementation:

- `GET /api/phase3/runs/{runId}/report` loaded on mount; on failure, falls back to `selectReportViewModel(snapshot, selectedRunName)`
- `selectedRunName == null` → displays explicit "No run selected" empty state
- tab-specific fetches (steps, assertions, recovery, ai-decisions) show loading state then render data or leave panel empty on failure
- `GET /api/phase3/runs/{runId}/artifacts` on failure surfaces error through action status
- `Re-run` handoff is local state only, no failure path

Backend error semantics:

- `GET /api/phase3/runs/{runId}/report` returns `404` when report artifact does not exist
- `GET /api/phase3/runs/{runId}/artifacts` returns `200` with empty items when no artifacts are available
- recovery and ai-decisions endpoints return deterministic mock data when no real run artifacts exist on disk

## 12. Review Items

Resolved items:

- All tabs are now wired with tab-specific API fetches.
- `Download artifacts` fetches artifact list from backend and opens listing drawer.
- `Re-run` hands off run context into `execution` via App-level handoff.
- Overview tab shows real report data from `GET /api/phase3/runs/{runId}/report` with fallback to synthetic view model.
- Recovery and AI decisions backend endpoints are implemented in `ReportArtifactService` with file-backed reads and mock fallbacks.

Remaining items:

- Recovery and AI decisions data are deterministic mock when no real run artifacts exist on disk.
- Screenshot and artifact content cannot be viewed/downloaded inline — the listing drawer shows file paths only.
- Re-run handoff carries `runId` and parses `projectKey` from it, but `environment` and `model` pre-fill depend on report data availability.
