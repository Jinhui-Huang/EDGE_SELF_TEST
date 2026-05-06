# DocParse Functional Specification

## 1. Document Position

- Screen name: `docParse`
- Front-end implementation: `ui/admin-console/src/screens/DocParseScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `docParse` screen is the document-ingestion and parse-review page of the Phase 3 admin console. It is the upstream entry for the document-driven generation workflow.

Its job is to:

- organize parsed documents by project
- open one document into a parse-review canvas
- expose detected case candidates
- let the operator review parse result, raw document, and version history
- hand the selected document/case context into `aiGenerate`

This screen answers these operator questions:

- Which requirement/change documents exist for this project?
- What cases were detected from the selected document?
- What did the parser infer vs what is still missing?
- Which case should be pushed into `aiGenerate` next?

## 3. Operator Role

Primary users:

- QA platform operator
- test engineer turning business documents into generated tests
- document reviewer checking parse quality before generation

Typical usage moments:

- after choosing a project
- before `aiGenerate`
- when comparing raw document text, parse result, and version history

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `docParse`

The screen is an upstream page for:

- `aiGenerate`

It is intentionally separated from:

- `cases`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `DocParseScreen.tsx`.
- The page performs direct `fetch` calls to the backend for document upload, re-parse, manual parse-result editing, raw-document read, version-history read, and first-open parse-result hydration.
- The page builds its document catalog through local helper `buildDocuments(snapshot)` and now attempts backend detail hydration when a document is opened.
- project switching is implemented.
- document detail opening is implemented.
- `Generate tests` is implemented as App-level focus handoff into `aiGenerate`.
- parse/raw/history tabs are implemented as local tab state, while their detail content is backend-first on document open.
- `Upload file` reads file content and uploads via `POST /api/phase3/documents/upload`.
- `Re-parse` is implemented: calls `POST /api/phase3/documents/{documentId}/reparse`, then refreshes parse-result/raw/version detail.
- `Manual edit` is implemented: opens JSON editor for detected cases, saves via `PUT /api/phase3/documents/{documentId}/parse-result`, then refreshes parse-result/raw/version detail.
- Backend implementation: `DocumentPersistenceService.java` provides file-backed persistence under `config/phase3/documents/<documentId>/` and records lightweight version-history entries for upload, re-parse, and manual edit.

This matters for review:

- the page owns real upstream handoff into `aiGenerate` and real document-service write capabilities
- document list still starts from synthetic front-end data from snapshot because there is no canonical `GET /api/phase3/documents` yet
- uploaded documents are merged into the current front-end session so snapshot rebuilds in the same session do not immediately drop them
- uploaded documents are still lost after remount / fresh app load because the catalog remains synthetic and session-local
- parse result, raw document, and version history can now be persisted and refreshed from the backend after upload, re-parse, or manual edit

## 6. Functional Areas

### 6.1 Overview Header

Visible elements:

- eyebrow/title
- explanatory lead text
- collapse / expand button

Functional role:

- explain that document parsing is reviewed here before generation

Current behavior:

- collapse toggle is implemented locally

### 6.2 Project Switch Rail

Visible elements:

- one project button per project
- project name
- project scope
- document count
- case count

Functional role:

- switch document catalog scope by project

Current behavior:

- implemented as local state change
- switching project clears opened document and selected case

### 6.3 Document Catalog

Visible elements per document row:

- document name
- subtitle
- status badge
- updated time
- detected case count
- version count
- `Detail`

Functional role:

- let the operator choose which parsed document to inspect

Current behavior:

- `Detail` opens the parse-review canvas for that document

### 6.4 Detail Hero

Visible elements:

- path
- document name
- status badge
- subtitle
- actions:
  - `Re-parse`
  - `Manual edit`
  - `Generate tests`

Functional role:

- anchor the currently opened document and expose its next actions

Current behavior:

- `Generate tests` is implemented as App-level focus handoff into `aiGenerate`
- `Re-parse` is implemented: calls `POST /api/phase3/documents/{documentId}/reparse`
- `Manual edit` is implemented: opens JSON editor, saves via `PUT /api/phase3/documents/{documentId}/parse-result`

### 6.5 Tab Bar

Visible elements:

- `Parse result`
- `Raw document`
- `Version history`
- `Upload file`

Functional role:

- switch between the three document-review surfaces
- expose upload entry for additional source files

Current behavior:

- tab switching is implemented locally
- upload reads file content and sends to `POST /api/phase3/documents/upload`; also updates local filename list in UI

### 6.6 Parse Result View

Visible elements:

- detected case list
- selected case detail
- pages/assertions/pending-fill insight cards
- test goal
- pages involved
- explicit items
- inferred items
- missing items
- AI reasoning panel

Functional role:

- let the operator inspect what the parser extracted and what still needs completion

Current behavior:

- detail prefers backend parse-result hydration on first open and keeps synthetic fallback only when the selected shell document has no persisted backend artifact yet
- case-name button can open `aiGenerate` directly for that case

### 6.7 Raw Document View

Visible elements:

- raw source text
- uploaded file list

Functional role:

- show original source material for verification

Current behavior:

- raw source prefers backend `GET /api/phase3/documents/{documentId}/raw`
- uploaded files list is local UI state only

### 6.8 Version History View

Visible elements:

- version list
- time
- summary

Functional role:

- show document revision history relevant to parsing

Current behavior:

- version history prefers backend `GET /api/phase3/documents/{documentId}/versions`

## 7. Data Semantics by Area

### 7.1 Document Catalog Data

- documents are currently built by `buildDocuments(snapshot)` and then merged with session-local uploaded documents
- source domains:
  - `snapshot.projects`
  - `snapshot.cases`
  - `snapshot.generatedAt`

### 7.2 Parse Result Data

- detected cases
- parse insights
- raw document
- versions
- reasoning

prefer backend document-service output when a persisted document exists; otherwise they fall back to front-end document-model data

### 7.3 AI Generate Focus Output

`Generate tests` sends structured App-level focus payload to `aiGenerate`, including:

- project key/name
- document id/name
- case id/name
- generated cases
- reasoning blocks

This is a real cross-screen output from the current page.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- page title
- callback:
  - `onOpenAiGenerate`

### 8.2 Screen Outputs

The screen produces:

- local UI outputs
  - selected project
  - opened document
  - selected case
  - active tab
  - uploaded filename list
- cross-screen navigation output
  - `aiGenerate` focus handoff

## 9. User Actions

Visible actions on this screen:

- collapse or expand overview
- switch project
- open one document
- select one detected case
- click `Generate tests`
- click case-name direct generate button
- switch tabs
- upload files
- click `Re-parse`
- click `Manual edit`

Current implementation summary:

- implemented:
  - overview collapse
  - project switch
  - document detail open
  - selected case change
  - `Generate tests`
  - tab switching
  - `Upload file` (reads content and uploads to backend)
  - `Re-parse` (calls backend, refreshes parse result in UI)
  - `Manual edit` (JSON editor, saves to backend, updates UI)
- not yet implemented:
  - none of the visible controls remain unwired

## 10. Functional Control Responsibility Matrix

### 10.1 Overview Controls

- collapse / expand button
  - function: compress or reveal the document overview
  - output type: local screen state only
  - current implementation: implemented

### 10.2 Project and Document Controls

- project button
  - function: switch current document catalog scope
  - output type: local screen state only
  - current implementation: implemented
- `Detail`
  - function: open the selected document into the parse-review canvas
  - output type: local screen state only
  - current implementation: implemented

### 10.3 Hero Controls

- `Re-parse`
  - function: request document parsing again
  - output type: `POST /api/phase3/documents/{documentId}/reparse`, then refreshes parse result via `GET .../parse-result`
  - current implementation: implemented
- `Manual edit`
  - function: correct parse result detected cases manually
  - output type: opens JSON editor, saves via `PUT /api/phase3/documents/{documentId}/parse-result`
  - current implementation: implemented
- `Generate tests`
  - function: hand selected document/case parse context into `aiGenerate`
  - output type: cross-screen App-level focus handoff
  - current implementation: implemented

### 10.4 Tab and Upload Controls

- `Parse result` / `Raw document` / `Version history`
  - function: switch detail sub-view
  - output type: local tab state only
  - current implementation: implemented
- `Upload file`
  - function: add source files for parse review or re-parse
  - output type: reads file content and uploads via `POST /api/phase3/documents/upload`; also updates local filename list
  - current implementation: implemented

### 10.5 Parse Result Controls

- case row
  - function: choose current candidate case
  - output type: local screen state only
  - current implementation: implemented
- case-name generate button
  - function: open `aiGenerate` focused on that specific candidate case
  - output type: cross-screen App-level focus handoff
  - current implementation: implemented

## 11. State Model

The screen should support:

- project selected
- document opened
- no document opened
- selected case changed
- parse/raw/history tab selection
- upload list populated
- parse action pending
- manual-edit pending

Current implementation status:

- local selection states are implemented
- upload list UI state is implemented
- upload backend action is implemented
- re-parse action state is implemented (with status feedback)
- manual-edit action state is implemented (with JSON editor and save)

## 12. Validation and Rules

Current implemented rules:

- if selected project no longer exists, fall back to first available project
- if opened document changes or selected case becomes invalid, selected case falls back to the first case in that document
- `Generate tests` requires an opened document and a valid selected case
- tab switching is disabled until a document is opened

Current upload rule:

- selected files are stored as filenames for local display
- file content is uploaded to `POST /api/phase3/documents/upload`
- uploaded document rows are merged into the current front-end session only
- remount / fresh app load still loses uploaded rows until a canonical backend document-list interface exists

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- shared snapshot loading
- project and case domains for synthetic document generation

### 13.2 Downstream Screens

The screen serves as an upstream context for:

- `aiGenerate`

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- projects
- cases

## 14. Screen Boundary

The `docParse` screen is responsible for:

- document-first parse review
- candidate-case selection
- raw document and history inspection
- generation handoff into `aiGenerate`

The `docParse` screen is not currently responsible for:

- persisting cases directly
- editing true case catalogs
- executing tests

## 15. Known Gaps and Review Items

Resolved items (P2-4):

- `Upload file` now reads content and uploads to backend via `POST /api/phase3/documents/upload`.
- `Re-parse` now calls `POST /api/phase3/documents/{documentId}/reparse` and refreshes parse-result/raw/version detail.
- `Manual edit` now opens JSON editor and saves via `PUT /api/phase3/documents/{documentId}/parse-result`.
- `Raw document` now reads the persisted artifact through `GET /api/phase3/documents/{documentId}/raw`.
- `Version history` now reads backend audit entries through `GET /api/phase3/documents/{documentId}/versions`.
- first opening a document now attempts backend parse-result hydration through `GET /api/phase3/documents/{documentId}/parse-result` instead of waiting for a later mutation.

Remaining items:

- Document catalog is still synthetic front-end data from `buildDocuments(snapshot)`, not a backend document list.
- Uploaded documents now survive snapshot rebuilds inside the same front-end session only; they still disappear after remount / fresh app load because there is no canonical backend document-list API.
- parse-result detail still keeps synthetic fallback content when the selected shell document has no persisted backend artifact.
- version history is still lightweight event metadata only; it does not yet expose per-version raw snapshots or diffs.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
