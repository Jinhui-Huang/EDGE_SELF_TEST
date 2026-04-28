# AiGenerate Functional Specification

## 1. Document Position

- Screen name: `aiGenerate`
- Front-end implementation: `ui/admin-console/src/screens/AiGenerateScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `aiGenerate` screen is the document-to-test generation review page of the Phase 3 admin console. It sits immediately after `docParse` and before the generated result becomes a durable case or a runnable execution input.

Its job is to:

- receive focused document/case context from `docParse`
- present one or more AI-generated candidate cases
- let the operator compare candidate structures
- expose generated flow tree, state machine, DSL, and reasoning notes
- support the review actions needed before the generated result is accepted into the case domain

This screen answers these operator questions:

- Which generated candidate should be kept?
- What executable flow did AI infer from the selected document?
- Does the generated DSL look structurally valid enough to keep?
- Should the operator regenerate, dry-run, or save this result?

## 3. Operator Role

Primary users:

- QA platform operator
- test engineer reviewing AI-generated case structure
- reviewer deciding whether a generated candidate can enter the case catalog

Typical usage moments:

- after `docParse`
- before a generated case is saved into `cases`
- before a generated case is validated, dry-run checked, and optionally persisted into the case catalog

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `aiGenerate`

The screen is downstream of:

- `docParse`

The screen currently persists into `cases` through catalog save, and can later hand off into:

- `cases`
- `execution`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `AiGenerateScreen.tsx`.
- Props: `snapshot`, `title`, `locale`, `focus` (from docParse), `apiBaseUrl`, `onSaveSuccess`.
- On mount with focus, auto-calls `POST /api/phase3/agent/generate-case` with `GENERATE` mode.
- When no focus exists, fallback content is built from `snapshot.projects` and `snapshot.cases`.
- Generation result (`genResult`) replaces all panel content when present:
  - `genResult.flowTree` → flow tree panel (replaces local fallback `defaultFlowNodes`)
  - `genResult.stateMachine` → state machine panel (replaces static SVG with list view)
  - `genResult.selectedDsl.content` → DSL panel (replaces local `buildLocalDsl(...)`)
  - `genResult.reasoning` → reasoning notes (replaces focus/fallback reasoning)
  - `genResult.generatedCases` → candidate tabs
- `Regenerate` is implemented: `POST /api/phase3/agent/generate-case` with `REGENERATE` mode.
- `Dry-run` is implemented: validates first via `POST /api/phase3/cases/dsl/validate`, then calls `POST /api/phase3/agent/generate-case/dry-run`.
- `Save as case` is implemented: validates first, then persists via `POST /api/phase3/catalog/case` (reuses existing case catalog persistence). Calls `onSaveSuccess` (which triggers snapshot reload) on success.
- Four mutation states tracked: `generateState`, `validateState`, `dryRunState`, `saveState` — each with idle/pending/success/error.
- Error/success feedback rendered in header area.
- All buttons disabled while any mutation is pending.

This matters for review:

- the page is now a real generation workbench backed by 4 API endpoints
- backend returns deterministic mock data shaped by input context; no real AI agent is integrated in Phase 3
- fallback data still exists for when no focus or genResult is available, clearly separated from API data

## 6. Functional Areas

### 6.1 Hero Header

Visible elements:

- path/title
- generated-screen title
- subtitle
- actions:
  - `Regenerate`
  - `Dry-run`
  - `Save as case`

Functional role:

- anchor the generation-review task and expose the three main review outcomes

Current behavior:

- `Regenerate`: implemented — calls `POST /api/phase3/agent/generate-case` with `REGENERATE` mode, replaces all panel content on success, shows error on failure
- `Dry-run`: implemented — validates DSL first, then calls `POST /api/phase3/agent/generate-case/dry-run`, shows pass/fail result with check details
- `Save as case`: implemented — validates DSL first, then persists via `POST /api/phase3/catalog/case`, triggers snapshot reload on success
- All buttons disabled while any mutation is pending; pending state shown in button text

### 6.2 Focus Meta and Candidate Tabs

Visible elements:

- project
- document
- selected case name
- generated case tabs

Functional role:

- keep the operator oriented on the source context
- switch between generated candidate cases

Current behavior:

- focus fields come from `focus` payload or fallback snapshot-derived data
- candidate tab switching is implemented locally through `selectedCaseId`

### 6.3 Flow / State Tree Panel

Visible elements:

- tree nodes
- tonal glyphs
- nested action rows

Functional role:

- summarize the generated case as an execution-oriented flow outline

Current behavior:

- when `genResult` exists: flow tree from `genResult.flowTree` (backend-returned)
- when no `genResult`: local fallback `defaultFlowNodes` (demo data)

### 6.4 State Machine Panel

Visible elements:

- state list with edges (when genResult exists)
- static SVG fallback (when no genResult)
- state/edge count pill

Functional role:

- summarize generated page/state transitions in a review-friendly visual form

Current behavior:

- when `genResult` exists: state machine from `genResult.stateMachine` rendered as state rows + edge rows with triggers
- when no `genResult`: static local demo SVG
- pill shows state/edge counts from API data when available

### 6.5 DSL and Review Notes Panel

Visible elements:

- generated DSL block
- schema validation status pill
- review notes / reasoning list
- dry-run result section (when dry-run has been executed)

Functional role:

- expose the generated executable definition for review before saving
- expose AI reasoning that explains why the candidate was assembled this way

Current behavior:

- when `genResult` exists: DSL from `genResult.selectedDsl.content` (backend-returned)
- when no `genResult`: DSL built locally by `buildLocalDsl(...)` with case name injected
- validation pill reflects `validateState` or `generateState`:
  - "schema ok" after successful generation or validation
  - "schema error" after validation failure
  - "pending" when no validation has run
- reasoning content from `genResult.reasoning` or focus/fallback reasoning
- dry-run result shows parser status and runtime check details when dry-run has been executed

## 7. Data Semantics by Area

### 7.1 Focus Input Data

The page currently depends on a focus payload containing:

- project key/name
- document id/name
- case id/name
- generated candidate list
- reasoning list

### 7.2 Snapshot Fallback Data

When focus is missing, the page falls back to:

- `snapshot.projects`
- `snapshot.cases`

This fallback is only enough to keep the demo shell populated.

### 7.3 Generated Content Semantics

When `genResult` is populated from the backend:

- flow tree, state machine, DSL, and reasoning are all backend-returned artifacts
- backend currently returns deterministic mock data shaped by input context (no real AI agent)
- the screen clearly separates API-sourced data from local fallback:
  - `genResult?.flowTree ?? defaultFlowNodes`
  - `genResult?.stateMachine ?? null` (null → static SVG)
  - `genResult?.selectedDsl?.content ?? buildLocalDsl(...)`
  - `genResult?.reasoning ?? activeFocus.reasoning`

When no `genResult` exists (no focus or before generation), local fallback demo constructs are used.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- `snapshot: AdminConsoleSnapshot` (for fallback content when no focus)
- `title: string`
- `locale: Locale`
- `focus?: AiGenerateFocus | null` (from docParse handoff via `App.tsx`)
- `apiBaseUrl: string` (for API calls)
- `onSaveSuccess?: () => void` (triggers snapshot reload after save)

### 8.2 Screen Outputs

The screen produces:

- `POST /api/phase3/agent/generate-case` — generate/regenerate cases
- `POST /api/phase3/cases/dsl/validate` — validate DSL before dry-run or save
- `POST /api/phase3/agent/generate-case/dry-run` — validate case viability
- `POST /api/phase3/catalog/case` — persist generated case to catalog
- `onSaveSuccess()` callback on successful save (triggers snapshot reload)

## 9. User Actions

Visible actions on this screen:

- switch generated candidate tab
- click `Regenerate`
- click `Dry-run`
- click `Save as case`

Current implementation summary:

- implemented:
  - generated candidate tab switch
  - `Regenerate` — calls `POST /api/phase3/agent/generate-case` with `REGENERATE`
  - `Dry-run` — validates first, then calls `POST /api/phase3/agent/generate-case/dry-run`
  - `Save as case` — validates first, then persists via `POST /api/phase3/catalog/case`
  - auto-generate on mount when focus exists

## 10. Functional Control Responsibility Matrix

### 10.1 Header Actions

- `Regenerate`
  - function: request a new AI-generated version from the same document/case context
  - output type: `POST /api/phase3/agent/generate-case` with `REGENERATE` mode
  - current implementation: implemented — replaces all panel content on success, shows error on failure
- `Dry-run`
  - function: validate generated case viability before persistence
  - output type: `POST /api/phase3/cases/dsl/validate` then `POST /api/phase3/agent/generate-case/dry-run`
  - current implementation: implemented — shows pass/fail result with check details
- `Save as case`
  - function: persist the selected generated case into the case catalog
  - output type: `POST /api/phase3/cases/dsl/validate` then `POST /api/phase3/catalog/case`
  - current implementation: implemented — reuses existing case catalog persistence, triggers snapshot reload

### 10.2 Candidate Controls

- generated case tab
  - function: choose current generated candidate for review
  - output type: local screen state only
  - current implementation: implemented

### 10.3 Review Panels

- flow tree
  - function: summarize execution sequence and intermediate states
  - output type: display only
  - current implementation: from `genResult.flowTree` when available, else local fallback
- state machine
  - function: summarize state-transition graph for review
  - output type: display only
  - current implementation: from `genResult.stateMachine` (list view) when available, else static SVG
- DSL block
  - function: expose executable case definition for review
  - output type: display-only review surface on this page; validation and persistence are implemented, inline DSL editing is still out of scope
  - current implementation: from `genResult.selectedDsl.content` when available, else local template
- reasoning notes
  - function: explain AI generation rationale
  - output type: display only
  - current implementation: from `genResult.reasoning` when available, else focus/fallback data

## 11. State Model

The screen should support:

- focus payload present
- focus payload absent and fallback used
- generated candidate switched
- regenerate pending
- dry-run pending
- save pending
- generation failed
- validation failed
- save failed

Current implementation status:

- focus/fallback resolution is implemented
- candidate selection is implemented
- all mutation states implemented:
  - `generateState`: idle → pending → success/error
  - `validateState`: idle → pending → success/error
  - `dryRunState`: idle → pending → success/error
  - `saveState`: idle → pending → success/error
- error feedback rendered in header area
- success feedback for save and dry-run rendered inline
- all buttons disabled during any pending mutation

## 12. Validation and Rules

Current implemented rules:

- if App-level focus is missing, fall back to first snapshot project/case set
- if selected generated case becomes invalid, fall back to first generated candidate
- DSL body is regenerated when selected case changes

Implemented validation:

- DSL validation via `POST /api/phase3/cases/dsl/validate` — called before dry-run and save
- validation result drives pill state (schema ok / schema error)
- dry-run includes parser + runtime checks
- save requires passing validation first

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- `docParse` for focused generation context
- shared snapshot loading for fallback content

### 13.2 Downstream Screens

The screen should eventually connect to:

- `cases` after save
- `execution` after dry-run or accepted launch preparation

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- projects
- cases
- document parsing
- execution preparation

## 14. Screen Boundary

The `aiGenerate` screen is responsible for:

- reviewing generated candidate cases
- showing generated flow/state/DSL/rationale
- deciding whether to regenerate, validate, or save

The `aiGenerate` screen is not currently responsible for:

- directly editing the canonical case catalog
- launching long-running execution
- replacing `docParse` as the source-document review page

## 15. Remaining Limits

- Backend generation is deterministic mock shaped by input context; no real AI agent integrated in Phase 3.
- Flow tree, state machine, and DSL from the backend are realistic but deterministic — they do not vary by actual document content.
- Local fallback data still exists for when no focus or genResult is available; clearly separated from API data via `genResult?.xxx ?? fallback` pattern.
- No return path from `aiGenerate` into `cases` or `execution` after review completion (navigation is one-directional from docParse).
- DSL is not directly editable on this page; operator can only review the generated content.
- Candidate tab switch is local-only; does not change DSL/flow/machine per candidate when backend returns a single selectedDsl.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
