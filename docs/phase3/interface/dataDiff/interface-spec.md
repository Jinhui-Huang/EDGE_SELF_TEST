# Data Diff Interface Specification

## 1. Scope and Design Basis

- Screen: `dataDiff`
- UI implementation:
  - `ui/admin-console/src/screens/DataDiffScreen.tsx`
  - `ui/admin-console/src/screens/reportViewModel.ts`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`

This document distinguishes:

- current read context
- current synthetic diff-row layer
- future backend-authored data-diff contracts
- detailed implementation design for currently unwired controls

## 2. Interface Summary

Current `dataDiff` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - none
- current run context source:
  - `selectedRunName` App-level selected-run handoff from `App.tsx`
- current diff table is locally generated from selected report summary, not from a backend diff endpoint

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for Data Diff Screen

The page currently uses the shared snapshot only as a shallow context source.

Relevant snapshot fields:

- `reports[]`
- `cases[]`
- `projects[]`
- `environmentConfig[]`

### 3.2 Functional Role by Field

- `reports[]`, `cases[]`, `projects[]`
  - feed `selectReportViewModel(...)`
- `environmentConfig[]`
  - supplies the DB name fallback shown in hero metadata

### 3.3 Current Limitation

This snapshot is not sufficient for true diff behavior because it does not provide:

- before / after / after_restore row payloads
- expected vs unexpected flags from the backend
- restore attempt detail
- raw diff JSON artifact references

## 4. Current Synthetic Diff Layer

### 4.1 Current Derivation Entry Point

- `makeDiffRows(report)` in `DataDiffScreen.tsx`

### 4.2 Current Derivation Rules

The table rows are currently generated locally based on:

- report status
- report run name
- hardcoded order/inventory/coupon/audit examples

Derived fields include:

- before
- after
- afterRestore
- expected
- restored

### 4.3 Interface Meaning

This means the current diff table should be documented as:

- a synthetic UI comparison layer
- not yet a stable backend data-diff contract

## 5. Current App-Level Handoff Interface

### Entry from Report Detail

Current App-level handoff behavior:

- `ReportDetailScreen.tsx` calls `onOpenDataDiff()`
- `App.tsx` uses `openDataDiff(selectedReportRunName)`
- `selectedReportRunName` is kept as the current run context
- `activeScreen("dataDiff")` is set

No backend request is sent by this route change.

## 6. UI Control to Interface Mapping

### 6.1 Hero Controls

#### `View raw JSON`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - raw diff artifact read interface
- current state: visible only

#### `Re-restore`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - restore-control mutation
- current state: visible only

### 6.2 Diff Table

#### Diff row

- user action: inspect only
- request: none today
- owner: display-only table
- current state: implemented as diagnostic display

## 7. Relationship to Other Interfaces

### 7.1 Relationship to Report Detail

- `dataDiff` is currently entered from `reportDetail`
- App-level handoff passes only the selected run name

### 7.2 Relationship to Restore/Data Preparation Concepts

The main design docs and wireframes clearly imply three data stages:

- before
- after
- after_restore

The screen should therefore be backed by run-specific diff and restore-result interfaces rather than report-summary heuristics.

## 8. Recommended Future Data Diff Interfaces

Identifier note:

- current page entry still depends on selected `runName` kept in `App.tsx`
- future backend path parameters should use canonical `{runId}`
- transition logic may temporarily map the selected `runName` onto backend `runId`

### 8.1 Diff Summary Interface

#### `GET /api/phase3/runs/{runId}/data-diff`

Purpose:

- return row-level before / after / after_restore comparison for one run

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "database": {
    "id": "oracle-checkout-main",
    "name": "checkout-oracle-main-prodlike"
  },
  "projectKey": "checkout-web",
  "caseId": "checkout-smoke",
  "summary": {
    "expectedChanges": 7,
    "unexpectedChanges": 1,
    "restoredCount": 7,
    "totalRows": 8,
    "affectedTables": 4
  },
  "rows": [
    {
      "table": "orders",
      "pk": "ord_8821",
      "field": "status",
      "before": "null",
      "after": "\"paid\"",
      "afterRestore": "null",
      "expected": true,
      "restored": true
    }
  ]
}
```

### 8.2 Raw Diff Artifact Interface

#### `GET /api/phase3/runs/{runId}/data-diff/raw`

Purpose:

- return raw structured diff payloads for operators who need exact source JSON

Response body:

```json
{
  "runName": "checkout-web-nightly",
  "beforePath": "D:\\...\\runs\\checkout-web-nightly\\diff\\before.json",
  "afterPath": "D:\\...\\runs\\checkout-web-nightly\\diff\\after.json",
  "afterRestorePath": "D:\\...\\runs\\checkout-web-nightly\\diff\\after_restore.json"
}
```

### 8.3 Restore Detail Interface

#### `GET /api/phase3/runs/{runId}/restore-result`

Purpose:

- return restore execution results for the run

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
    },
    {
      "step": "cleanup audit rows",
      "status": "FAILED",
      "detail": "audit_log rows intentionally kept"
    }
  ]
}
```

### 8.4 Re-Restore Control Interface

#### `POST /api/phase3/runs/{runId}/restore/retry`

Purpose:

- retry the restore plan for the selected run

Request body:

```json
{
  "operator": "qa-platform",
  "reason": "Unexpected rows remained after initial restore"
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "restore-retry",
  "runName": "checkout-web-nightly",
  "requestedState": "RESTORE_RETRY_QUEUED"
}
```

## 9. Detailed Implementation Design for Currently Unwired Controls

### 9.1 `View raw JSON`

Recommended implementation type:

- new raw-artifact read interface

Concrete implementation design:

- button calls:
  - `GET /api/phase3/runs/{runId}/data-diff/raw`
- UI then opens:
  - a local raw-json drawer with tabs:
    - `before`
    - `after`
    - `after_restore`

Reasoning:

- raw diff payloads are backend-owned artifacts and should not be reconstructed in the UI

### 9.2 `Re-restore`

Recommended implementation type:

- new restore-control mutation

Concrete implementation design:

- button posts:
  - `POST /api/phase3/runs/{runId}/restore/retry`
- after success:
  - poll or reload:
    - `GET /api/phase3/runs/{runId}/restore-result`
    - `GET /api/phase3/runs/{runId}/data-diff`

Reasoning:

- restore retry is a backend responsibility and should not be modeled as local UI state

## 10. Error Handling Boundary

Current implementation:

- no direct backend requests exist
- fallback title-only state is shown if no selected report can be resolved

Recommended future read-interface errors:

- `GET /api/phase3/runs/{runId}/data-diff`
  - `404` when diff data does not exist
- `GET /api/phase3/runs/{runId}/data-diff/raw`
  - `200` with empty paths when raw payloads are unavailable

Recommended future mutation errors:

- `POST /api/phase3/runs/{runId}/restore/retry`
  - `409` when restore retry is not allowed for the run state

## 11. Review Items

Review-only findings:

- The current page has the correct comparison structure, but its data is still synthetic.
- `selectedRunName` App-level handoff is enough for page entry, but not enough for real diff ownership unless backend run-diff endpoints are added.
- `View raw JSON` and `Re-restore` should become true backend-owned artifact/control actions.

These are documentation findings only. No implementation change is made in this stage.
