# DocParse Interface Specification

## 1. Scope and Design Basis

- Screen: `docParse`
- UI implementation:
  - `ui/admin-console/src/screens/DocParseScreen.tsx`
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
- current synthetic document/parse model
- current real App-level focus handoff into `aiGenerate`
- future document upload/parse interfaces required by visible controls

## 2. Interface Summary

Current `docParse` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - none
- current real cross-screen output:
  - App-level focus handoff into `aiGenerate`
- current document list, parse result, raw source, and history are front-end-generated from snapshot data rather than backend document-parser outputs

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
- request: none today
- effect:
  - stores local filenames only

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
- request: none today
- owner: not implemented
- intended future interface:
  - document re-parse mutation
- current state: visible only

#### `Manual edit`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - manual document/parse edit flow
- current state: visible only

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
- request: none today
- owner: local filename list
- intended future interface:
  - document upload endpoint
- current state: local filename capture only

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

## 9. Recommended Future Document Interfaces

The visible controls clearly require document-specific interfaces.

### 9.1 Document List Interface

#### `GET /api/phase3/documents`

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

Purpose:

- upload one or more source documents for a project

Request type:

- `multipart/form-data`

Form parts:

- `projectKey`
- `files[]`

Response body:

```json
{
  "status": "ACCEPTED",
  "uploaded": [
    {
      "id": "checkout-web-primary",
      "name": "checkout-regression-v3.md"
    }
  ]
}
```

### 9.3 Parse Result Interface

#### `GET /api/phase3/documents/{documentId}/parse-result`

Purpose:

- return parser output for one document

Response body:

```json
{
  "documentId": "checkout-web-primary",
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

### 9.4 Raw Source Interface

#### `GET /api/phase3/documents/{documentId}/raw`

Purpose:

- return raw source content for the document

Response body:

```json
{
  "documentId": "checkout-web-primary",
  "name": "checkout-regression-v3.md",
  "content": "# checkout-web requirement packet ..."
}
```

### 9.5 Version History Interface

#### `GET /api/phase3/documents/{documentId}/versions`

Purpose:

- return stored version history for one document

Response body:

```json
{
  "documentId": "checkout-web-primary",
  "items": [
    {
      "id": "checkout-web-v3",
      "label": "v3",
      "time": "2026-04-20T06:10:00Z",
      "summary": "Added payment assertions and restore notes."
    }
  ]
}
```

### 9.6 Re-Parse Interface

#### `POST /api/phase3/documents/{documentId}/reparse`

Purpose:

- request parser re-execution for one document

Request body:

```json
{
  "operator": "qa-platform",
  "reason": "Requirements changed after checkout submit redesign"
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "document-reparse",
  "documentId": "checkout-web-primary"
}
```

### 9.7 Manual Edit Interface

#### `PUT /api/phase3/documents/{documentId}/parse-result`

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

Response body:

```json
{
  "status": "ACCEPTED",
  "kind": "document-parse-edit",
  "documentId": "checkout-web-primary"
}
```

## 10. Detailed Implementation Design for Currently Unwired Controls

### 10.1 `Upload file`

Recommended implementation type:

- new backend upload interface

Concrete implementation design:

- file chooser submits:
  - `POST /api/phase3/documents/upload`
- after success:
  - reload:
    - `GET /api/phase3/documents?projectKey={selectedProjectKey}`

Reasoning:

- current local filename list is only a placeholder for the real upload action

### 10.2 `Re-parse`

Recommended implementation type:

- new parse mutation

Concrete implementation design:

- button posts:
  - `POST /api/phase3/documents/{documentId}/reparse`
- after success:
  - reload parse result and document list

### 10.3 `Manual edit`

Recommended implementation type:

- local edit drawer or editor plus backend save

Concrete implementation design:

- button opens local edit drawer for parse-result fields
- saving the drawer calls:
  - `PUT /api/phase3/documents/{documentId}/parse-result`

### 10.4 Parse/Raw/History Tabs

Recommended implementation type:

- keep local tab state
- move each tab's content onto its own backend read when available

Tab behavior design:

- `Parse result`
  - request:
    - `GET /api/phase3/documents/{documentId}/parse-result`
- `Raw document`
  - request:
    - `GET /api/phase3/documents/{documentId}/raw`
- `Version history`
  - request:
    - `GET /api/phase3/documents/{documentId}/versions`

## 11. Error Handling Boundary

Current implementation:

- no backend requests exist on this page
- no opened document results in locked-state UI

Recommended future read-interface errors:

- `GET /api/phase3/documents/{documentId}/parse-result`
  - `404` when document does not exist

Recommended future mutation errors:

- upload/re-parse/manual-edit failures should surface in a doc-parse-local mutation status area

## 12. Review Items

Review-only findings:

- The page already has a real and useful App-level focus handoff into `aiGenerate`.
- Everything else on the page is still document-parser UI scaffolding over synthetic local data.
- `Upload file`, `Re-parse`, and `Manual edit` should become true document-domain interfaces, not remain placeholder buttons.

These are documentation findings only. No implementation change is made in this stage.
