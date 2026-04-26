# DocParse Interface Specification

## 1. Scope and Design Basis

- Screen: `docParse`
- UI implementation:
  - `ui/admin-console/src/screens/DocParseScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/DocumentPersistenceService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`

This document distinguishes:

- current read context
- current synthetic document/parse model
- current real App-level focus handoff into `aiGenerate`
- implemented document upload/reparse/manual-edit interfaces

## 2. Interface Summary

Current `docParse` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write/mutation interfaces:
  - `POST /api/phase3/documents/upload` (upload document)
  - `POST /api/phase3/documents/{documentId}/reparse` (re-parse document)
  - `PUT /api/phase3/documents/{documentId}/parse-result` (save manual edit)
  - `GET /api/phase3/documents/{documentId}/parse-result` (read parse result after mutation)
- current real cross-screen output:
  - App-level focus handoff into `aiGenerate`
- document list is still front-end-generated from snapshot; parse result can be persisted and refreshed from backend after upload/reparse/manual-edit
- backend implementation: `DocumentPersistenceService.java` provides file-backed persistence under `config/phase3/documents/<documentId>/`

## 3. Current Read Context: GET /api/phase3/admin-console

### 3.1 Purpose for DocParse Screen

The page currently uses the shared admin-console snapshot as a seed for its synthetic document catalog.

Relevant snapshot fields:

- `projects[]`
- `cases[]`
- `generatedAt`

### 3.2 Functional Role by Field

- `projects[]`
  - drives project rail and project document grouping
- `cases[]`
  - provides source material for synthetic detected case candidates
- `generatedAt`
  - provides fallback timestamps/version timing

### 3.3 Current Limitation

This snapshot is not sufficient for true doc-parse behavior because it does not provide:

- persisted document list
- upload references
- parser output
- raw source storage
- version history
- manual-edit state

## 4. Current Synthetic Document Model

### 4.1 Current Derivation Entry Point

- `buildDocuments(snapshot)` in `DocParseScreen.tsx`

### 4.2 Current Derived Fields

The page currently synthesizes:

- document ids/names
- statuses
- detected case list
- raw document content
- version history
- reasoning blocks

### 4.3 Interface Meaning

This means the current page should be documented as:

- a document-parse UI shell
- not yet a backend-authored document parser contract

## 5. Current Real App-Level Focus Handoff: DocParse -> AiGenerate

### 5.1 Purpose

The `Generate tests` actions do not call the backend from `docParse`. They hand focused parse context into `aiGenerate`.

### 5.2 Current Caller

- hero button `Generate tests`
- per-case name button in parse result

### 5.3 Current Output Payload Design

Current page emits:

```json
{
  "projectKey": "checkout-web",
  "projectName": "checkout-web",
  "documentId": "checkout-web-primary",
  "documentName": "checkout-regression-v3.md",
  "caseId": "checkout-smoke",
  "caseName": "Checkout smoke",
  "generatedCases": [
    {
      "id": "checkout-smoke",
      "name": "Checkout smoke",
      "category": "happy",
      "confidence": "high"
    }
  ],
  "reasoning": [
    {
      "label": "Structure",
      "body": "Grouped the source text into executable scenarios."
    }
  ]
}
```

### 5.4 Ownership Boundary

- `DocParseScreen.tsx` assembles focus payload
- `App.tsx` stores `aiGenerateFocus`
- `App.tsx` switches to `aiGenerate`

No backend request occurs in this handoff.

## 6. Local-Only Screen Controls

These controls currently mutate UI state only.

### 6.1 Project Switch

- owner: `selectedProjectKey`
- request: none

### 6.2 Document Open

- owner: `openedDocumentId`
- request: none

### 6.3 Selected Case

- owner: `selectedCaseId`
- request: none

### 6.4 Active Tab

- owner: `activeTab`
- request: none

### 6.5 Upload Filename List

- owner: `uploadedFiles`
- request: `POST /api/phase3/documents/upload` (reads file content and uploads)
- effect:
  - stores local filenames and uploads document to backend

## 7. UI Control to Interface Mapping

### 7.1 Overview and Catalog Controls

#### Collapse / expand button

- user action: click
- request: none
- owner: local state
- current state: implemented

#### Project button

- user action: click
- request: none
- owner: local state
- current state: implemented

#### `Detail`

- user action: click
- request: none
- owner: local state
- current state: implemented

### 7.2 Hero Controls

#### `Re-parse`

- user action: click
- request: `POST /api/phase3/documents/{documentId}/reparse`
- owner: `DocParseScreen.tsx`
- success behavior: refreshes parse result via `GET .../parse-result`, updates local document data
- current state: implemented

#### `Manual edit`

- user action: click
- request: opens JSON editor; save calls `PUT /api/phase3/documents/{documentId}/parse-result`
- owner: `DocParseScreen.tsx`
- success behavior: updates local document data with edited cases
- current state: implemented

#### `Generate tests`

- user action: click
- request: none from `docParse`
- owner:
  - App-level focus handoff into `aiGenerate`
- current state: implemented

### 7.3 Tab and Upload Controls

#### `Parse result` / `Raw document` / `Version history`

- user action: click
- request: none
- owner: local tab state
- current state: implemented

#### `Upload file`

- user action: click / file select
- request: reads file content via FileReader, then `POST /api/phase3/documents/upload` with projectKey, fileName, content
- owner: `DocParseScreen.tsx`
- success behavior: updates local filename list and persists document to backend
- current state: implemented

### 7.4 Parse Result Controls

#### Case row

- user action: click
- request: none
- owner: local selected case
- current state: implemented

#### Case-name generate button

- user action: click
- request: none from `docParse`
- owner: App-level focus handoff into `aiGenerate`
- current state: implemented

## 8. Relationship to Other Interfaces

### 8.1 Relationship to AiGenerate

- `docParse` is the immediate upstream page for `aiGenerate`
- the current integration is App-level focus handoff only

### 8.2 Relationship to Projects and Cases

- current document model is synthesized from project and case domains
- future real document parsing should become its own domain rather than piggybacking on cases for mock content

## 9. Document Interfaces

This section documents implemented and future document-specific interfaces.

### 9.1 Document List Interface (future)

#### `GET /api/phase3/documents`

Status: not yet implemented

Purpose:

- list uploaded/parsing-ready documents for one project

Query parameters:

- `projectKey`

Response body:

```json
{
  "items": [
    {
      "id": "checkout-web-primary",
      "name": "checkout-regression-v3.md",
      "projectKey": "checkout-web",
      "projectName": "checkout-web",
      "status": "PARSED",
      "updatedAt": "2026-04-20T06:10:00Z",
      "model": "claude-4.5",
      "detectedCases": 3,
      "subtitle": "Parsed recently / claude-4.5 / 3 cases detected"
    }
  ]
}
```

### 9.2 Document Upload Interface

#### `POST /api/phase3/documents/upload`

Status: implemented (P2-4)

Implementation:

- `DocumentPersistenceService.upload()`
- `LocalAdminApiServer` route `/api/phase3/documents/upload`

Purpose:

- upload one source document for a project

Request type:

- `application/json`

Request body:

```json
{
  "projectKey": "checkout-web",
  "fileName": "checkout-regression-v3.md",
  "content": "# checkout-web requirement packet ..."
}
```

Response body (HTTP 202):

```json
{
  "status": "ACCEPTED",
  "uploaded": [
    {
      "id": "checkout-web-checkout-regression-v3-md",
      "name": "checkout-regression-v3.md"
    }
  ]
}
```

Error responses:

- `400` when `projectKey` or `fileName` is missing

Frontend caller:

- `DocParseScreen.tsx` reads file content via `FileReader`, then calls `handleUploadToBackend` which posts JSON body

Backend behavior:

- generates document ID from `projectKey` + `fileName` (lowercase, alphanumeric + hyphens)
- persists `raw.json`, `parse-result.json`, `meta.json` under `config/phase3/documents/<documentId>/`
- auto-generates initial parse result with deterministic detected cases and reasoning

### 9.3 Parse Result Interface

#### `GET /api/phase3/documents/{documentId}/parse-result`

Status: implemented (P2-4)

Implementation:

- `DocumentPersistenceService.getParseResult()`
- `LocalAdminApiServer` route `/api/phase3/documents/{documentId}/parse-result` (GET)

Purpose:

- return parser output for one document

Response body (HTTP 200):

```json
{
  "documentId": "checkout-web-checkout-regression-v3-md",
  "projectKey": "checkout-web",
  "detectedCases": [
    {
      "id": "checkout-smoke",
      "name": "Checkout smoke",
      "category": "happy",
      "confidence": "high"
    }
  ],
  "reasoning": [
    {
      "label": "Structure",
      "body": "Grouped the source text into executable scenarios."
    }
  ],
  "missing": [
    "Expected stock decrement delta"
  ]
}
```

Error responses:

- `404` when document does not exist (no `parse-result.json` found)

Frontend caller:

- `DocParseScreen.tsx` calls this after successful re-parse to refresh UI

### 9.4 Raw Source Interface (future)

#### `GET /api/phase3/documents/{documentId}/raw`

Status: not yet implemented as a dedicated read endpoint

Purpose:

- return raw source content for the document

Note: raw content is persisted by `DocumentPersistenceService` as `raw.json` during upload, but no dedicated GET endpoint is exposed yet; raw document tab content is still front-end synthetic data

### 9.5 Version History Interface (future)

#### `GET /api/phase3/documents/{documentId}/versions`

Status: not yet implemented

Purpose:

- return stored version history for one document

Note: version history tab content is still front-end synthetic data

### 9.6 Re-Parse Interface

#### `POST /api/phase3/documents/{documentId}/reparse`

Status: implemented (P2-4)

Implementation:

- `DocumentPersistenceService.reparse()`
- `LocalAdminApiServer` route `/api/phase3/documents/{documentId}/reparse` (POST)

Purpose:

- request parser re-execution for one document

Request body:

```json
{
  "operator": "qa-platform",
  "reason": "Requirements changed after checkout submit redesign"
}
```

Response body (HTTP 202):

```json
{
  "status": "ACCEPTED",
  "kind": "document-reparse",
  "documentId": "checkout-web-checkout-regression-v3-md"
}
```

Error responses:

- response contains `"status": "NOT_FOUND"` when document meta does not exist

Frontend caller:

- `DocParseScreen.tsx` calls this on Re-parse button click, then fetches `GET .../parse-result` to refresh UI

Backend behavior:

- reads existing `meta.json` to confirm document exists
- regenerates `parse-result.json` with updated timestamp and deterministic detected cases

### 9.7 Manual Edit Interface

#### `PUT /api/phase3/documents/{documentId}/parse-result`

Status: implemented (P2-4)

Implementation:

- `DocumentPersistenceService.saveParseResult()`
- `LocalAdminApiServer` route `/api/phase3/documents/{documentId}/parse-result` (PUT)

Purpose:

- persist manual corrections to parser output

Request body:

```json
{
  "updatedBy": "qa-platform",
  "changes": {
    "detectedCases": [
      {
        "id": "checkout-smoke",
        "name": "Checkout smoke",
        "category": "happy",
        "confidence": "high"
      }
    ]
  }
}
```

Response body (HTTP 202):

```json
{
  "status": "ACCEPTED",
  "kind": "document-parse-edit",
  "documentId": "checkout-web-checkout-regression-v3-md"
}
```

Frontend caller:

- `DocParseScreen.tsx` opens a JSON editor for detected cases; saving calls this endpoint with the edited cases

Backend behavior:

- reads `changes.detectedCases` from request body
- overwrites `parse-result.json` with the provided cases

## 10. Implemented Control Wiring Reference

### 10.1 `Upload file`

Implementation:

- file chooser reads content via `FileReader`
- `DocParseScreen.tsx` calls `handleUploadToBackend`:
  - `POST /api/phase3/documents/upload` with JSON body `{ projectKey, fileName, content }`
- after success:
  - updates local filename list and local document data with API-returned parse result

### 10.2 `Re-parse`

Implementation:

- button calls `handleReparse(documentId)`:
  - `POST /api/phase3/documents/{documentId}/reparse`
- after success:
  - `GET /api/phase3/documents/{documentId}/parse-result` to refresh UI
  - updates local document model with refreshed detected cases

### 10.3 `Manual edit`

Implementation:

- button opens inline JSON editor pre-filled with `JSON.stringify(currentCases)`
- Save button calls `handleSaveParseResult(documentId)`:
  - `PUT /api/phase3/documents/{documentId}/parse-result` with `{ changes: { detectedCases: parsedDraft } }`
- after success:
  - updates local document model with edited cases
  - closes editor

### 10.4 Parse/Raw/History Tabs

Current state:

- tab switching is local state only
- `Parse result` content is refreshed from backend after re-parse or manual edit; initial load is still from front-end synthetic data
- `Raw document` content is still front-end synthetic data
- `Version history` content is still front-end synthetic data

Future:

- `Raw document` can be backed by `GET /api/phase3/documents/{documentId}/raw`
- `Version history` can be backed by `GET /api/phase3/documents/{documentId}/versions`

## 11. Error Handling Boundary

Current implementation:

- upload, re-parse, and manual-edit mutations surface success/error status through an `actionStatus` bar in DocParseScreen
- upload validates that `projectKey` is available before submission
- re-parse returns `NOT_FOUND` status (not HTTP 404) when the document has not been uploaded yet
- `GET .../parse-result` returns HTTP 404 when document does not exist
- no opened document results in locked-state UI (hero actions disabled)

Remaining gaps:

- raw-document and version-history reads are still front-end synthetic and have no backend error surface

## 12. Review Items

Resolved items (P2-4):

- `Upload file` is now a real document-upload action via `POST /api/phase3/documents/upload` with file content read by `FileReader`.
- `Re-parse` is now a real backend mutation via `POST /api/phase3/documents/{documentId}/reparse` with parse-result refresh.
- `Manual edit` is now a real backend mutation via `PUT /api/phase3/documents/{documentId}/parse-result` with inline JSON editor.
- Backend persistence is implemented through `DocumentPersistenceService` with file-backed storage under `config/phase3/documents/<documentId>/`.
- The page now has a real App-level focus handoff into `aiGenerate` and real document-service write capabilities.

Remaining items:

- Document catalog is still synthetic front-end data from `buildDocuments(snapshot)`, not a backend document list via `GET /api/phase3/documents`.
- Raw document tab content is still front-end synthetic data, not backed by `GET /api/phase3/documents/{documentId}/raw`.
- Version history tab content is still front-end synthetic data, not backed by `GET /api/phase3/documents/{documentId}/versions`.
- Parse result tab content is not API-backed on initial load (only refreshed after re-parse or manual edit).
