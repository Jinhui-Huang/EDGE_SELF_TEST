# Report Detail Interface Specification

Update note:
- Current App-level report selection uses canonical `runId`.
- `ReportsScreen` opens detail through `onOpenDetail(runId)`.
- `cases` history handoff now also prefers dedicated backend `runId`; only older history rows may still fall back to `runName`.
- missing `report.json` artifacts now return a backend-owned `UNAVAILABLE` shell for the main report payload instead of forcing the UI straight into snapshot-derived summary fallback.
- image-like screenshots can now be read through `GET /api/phase3/runs/{runId}/artifacts/content?path=...` and previewed inline on the Overview tab.
- `reportDetail` reads `GET /api/phase3/runs/{runId}/report` and tab-specific run endpoints, with snapshot fallback only when backend reads fail.
- missing `recovery.json` artifacts now return a backend-owned `UNAVAILABLE` shell (`items: []`) instead of deterministic mock recovery steps.
- missing `ai-decisions.json` artifacts now return a backend-owned `UNAVAILABLE` shell (`items: []`) instead of deterministic mock decision logs.

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
  - `GET /api/phase3/runs/{runId}/report` (main report, loaded on mount; missing artifacts now return explicit `UNAVAILABLE` shell data)
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
- fallback to `selectReportViewModel(snapshot, selectedRunId)` when the main report read fails before any backend-owned shell can be consumed
- backend implementation: `ReportArtifactService.java` provides all report-detail read endpoints

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for Report Detail Screen

The `reportDetail` screen currently uses the same shared snapshot as its read model and selects one report through `selectedRunId`.

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
- `App.tsx` owns `selectedReportRunId`
- `reportViewModel.ts` owns detail derivation
- `ReportDetailScreen.tsx` owns only local tab/button rendering

## 4. Current Detail Layer

The current detail screen reads real report-detail interfaces first; missing `report.json` now resolves to a backend-owned `UNAVAILABLE` shell, while snapshot-derived fallback remains only for broader API-read failures.

### 4.1 Current Derivation Entry Point

- `selectReportViewModel(snapshot, selectedRunId)`

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

- `ReportsScreen.tsx` calls `onOpenDetail(runId)`
- `App.tsx` stores:
  - `selectedReportRunId = runId`
- `App.tsx` sets:
  - `activeScreen("reportDetail")`

### 5.2 Back to Reports

Current behavior:

- `onBackToReports()` sets `activeScreen("reports")`
- no backend request

### 5.3 Open Data Diff

Current behavior:

- `onOpenDataDiff()` calls `openDataDiff(selectedReportRunId)`
- `App.tsx` stores run id if present
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
- success behavior: open artifact drawer with kind/label/path for each artifact; `report-html` entries can preview inline in the same drawer
  - `path` is the run-local artifact path reused by `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
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
- success behavior: show AI decision log with timestamp, type, model, summary, or explicit unavailable state when the backend returns an empty shell
- current state: implemented

## 7. Relationship to Other Interfaces

### 7.1 Relationship to Reports

- `reportDetail` is the direct downstream page of `reports`
- current selection handoff uses canonical `runId`

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

- the UI carries selected run context by canonical `runId`
- `runName` remains report content, not the App-level selected-run key

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
- backend: `ReportArtifactService.getRecovery()` reads `recovery.json` from run dir; missing artifacts now return `UNAVAILABLE` + `items: []`

Response body:

```json
{
  "runId": "checkout-web-nightly",
  "status": "UNAVAILABLE",
  "items": []
}
```

### 9.5 AI Decisions Detail Interface (implemented)

#### `GET /api/phase3/runs/{runId}/ai-decisions`

Purpose:

- return runtime AI decision and heal history for the run
- fetched on AI decisions tab activation
- backend: `ReportArtifactService.getAiDecisions()` reads `ai-decisions.json` from run dir; missing artifacts now return `UNAVAILABLE` + `items: []`

Response body:

```json
{
  "runId": "checkout-web-nightly",
  "status": "UNAVAILABLE",
  "items": []
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
      "path": "report.html"
    },
    {
      "kind": "report-json",
      "label": "report.json",
      "path": "report.json"
    }
  ]
}
```

### 9.7 Artifact Content Interface (implemented)

#### `GET /api/phase3/runs/{runId}/artifacts/content?path=...`

Purpose:

- return artifact bytes for a run-local artifact path
- the `path` query uses the same run-local relative-path contract returned in `artifacts[].path`
- currently used by Overview screenshot cards for inline preview

Response behavior:

- `200` with binary content and inferred `Content-Type`
- `400` when `path` is missing
- `400` when the requested path escapes the run directory or does not resolve to a regular file

## 10. Implementation Reference for Wired Controls

### 10.1 `Download artifacts` (implemented)

Implementation:

- button calls `GET /api/phase3/runs/{runId}/artifacts`
- UI opens local artifact listing drawer showing kind/label/path per item
- `report-html` entries now render a minimal inline preview via `GET /api/phase3/runs/{runId}/artifacts/content?path=report.html`
- drawer has dismiss button to close
- Overview screenshot cards derive inline preview URLs from `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
  - prefer `steps[].artifactPath`
  - fall back to `artifacts[].path` when no step-level screenshot path exists

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

- `GET /api/phase3/runs/{runId}/report` loaded on mount; on failure, falls back to `selectReportViewModel(snapshot, selectedRunId)`
- `selectedRunId == null` → displays explicit "No run selected" empty state
- tab-specific fetches (steps, assertions, recovery, ai-decisions) show loading state then render data or leave panel empty on failure
- `GET /api/phase3/runs/{runId}/artifacts` on failure surfaces error through action status
- `Re-run` handoff is local state only, no failure path

Backend error semantics:

- `GET /api/phase3/runs/{runId}/report` returns a backend-owned `UNAVAILABLE` shell when `report.json` does not exist
- `GET /api/phase3/runs/{runId}/artifacts` returns `200` with empty items when no artifacts are available
- `GET /api/phase3/runs/{runId}/artifacts/content?path=...` returns binary content for valid run-local artifact paths
- recovery now returns an explicit backend-owned `UNAVAILABLE` empty shell when no real `recovery.json` exists
- ai-decisions now returns an explicit backend-owned `UNAVAILABLE` empty shell when no real `ai-decisions.json` exists

## 12. Review Items

Resolved items:

- All tabs are now wired with tab-specific API fetches.
- `Download artifacts` fetches artifact list from backend and opens listing drawer.
- `report-html` artifacts can now preview inline inside the artifact drawer through the shared content endpoint.
- Overview screenshots can now preview image-like run artifacts inline through the backend content-read endpoint.
- `Re-run` hands off run context into `execution` via App-level handoff.
- Overview tab now distinguishes backend-owned `UNAVAILABLE` report shells from true snapshot-fallback cases.
- Recovery and AI decisions backend endpoints are implemented in `ReportArtifactService`; both now use file-backed reads with `UNAVAILABLE` empty-shell fallback.

Remaining items:

- Generic artifact drawer entries still remain mostly listing-path-focused; inline read is currently wired for image-like Overview screenshots and `report-html` preview.
- Re-run handoff carries `runId` and parses `projectKey` from it, but `environment` and `model` pre-fill depend on report data availability.
