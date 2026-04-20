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
- before a generated case is sent into validation or dry-run execution

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `aiGenerate`

The screen is downstream of:

- `docParse`

The screen should eventually hand off into:

- `cases`
- `execution`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `AiGenerateScreen.tsx`.
- The page does not fetch directly.
- The page consumes optional App-level focus from `App.tsx`.
- If no focus exists, the page builds fallback content from `snapshot.projects` and `snapshot.cases`.
- candidate switching is implemented locally.
- displayed flow tree is hardcoded local demo data.
- displayed state machine is hardcoded local demo SVG.
- displayed DSL is generated locally by `buildDslLines(...)`.
- reasoning panel comes from App-level focus or local fallback data.
- `Regenerate` is visible but not wired.
- `Dry-run` is visible but not wired.
- `Save as case` is visible but not wired.

This matters for review:

- the current page is a generation-review shell rather than a true AI-generation workbench
- the most real part of the current page is the upstream App-level focus handoff from `docParse`
- all finalization actions that should persist or validate generated output are still missing

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

- all three actions are visual only

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

- the tree is local placeholder data
- it does not change per candidate beyond the selected case name shown in header meta

### 6.4 State Machine Panel

Visible elements:

- static state-machine SVG
- node labels
- edge count pill

Functional role:

- summarize generated page/state transitions in a review-friendly visual form

Current behavior:

- the machine is a static local demo rendering
- it is not bound to actual generated case content

### 6.5 DSL and Review Notes Panel

Visible elements:

- generated DSL block
- schema-ok status pill
- review notes / reasoning list

Functional role:

- expose the generated executable definition for review before saving
- expose AI reasoning that explains why the candidate was assembled this way

Current behavior:

- DSL text is built locally by `buildDslLines(...)`
- the selected case name is injected into the DSL template
- schema-ok badge is visual only
- reasoning content is App-level focus or local fallback data

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

Current flow tree, state machine, and DSL are not backend-generated artifacts. They are front-end demo constructs whose purpose is to model the intended review surface.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- page title
- optional `focus` payload from `docParse`

### 8.2 Screen Outputs

The screen currently produces:

- local UI outputs
  - selected generated candidate
- no current persistent backend output
- no current downstream App-level handoff output

Its intended future outputs are:

- generated-case persistence into `cases`
- dry-run handoff into `execution` or a run-validation flow

## 9. User Actions

Visible actions on this screen:

- switch generated candidate tab
- click `Regenerate`
- click `Dry-run`
- click `Save as case`

Current implementation summary:

- implemented:
  - generated candidate tab switch
- visible but not implemented:
  - `Regenerate`
  - `Dry-run`
  - `Save as case`

## 10. Functional Control Responsibility Matrix

### 10.1 Header Actions

- `Regenerate`
  - function: request a new AI-generated version from the same document/case context
  - output type: future AI-generate mutation
  - current implementation: visual only
- `Dry-run`
  - function: validate generated case viability before persistence
  - output type: future validation or execution handoff
  - current implementation: visual only
- `Save as case`
  - function: persist the selected generated case into the case catalog
  - output type: future case-save mutation
  - current implementation: visual only

### 10.2 Candidate Controls

- generated case tab
  - function: choose current generated candidate for review
  - output type: local screen state only
  - current implementation: implemented

### 10.3 Review Panels

- flow tree
  - function: summarize execution sequence and intermediate states
  - output type: display only
  - current implementation: local placeholder
- state machine
  - function: summarize state-transition graph for review
  - output type: display only
  - current implementation: local placeholder
- DSL block
  - function: expose executable case definition for review
  - output type: display only today; future editable DSL
  - current implementation: local generated text
- reasoning notes
  - function: explain AI generation rationale
  - output type: display only
  - current implementation: App-level focus or local fallback data

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
- mutation and error states are not implemented

## 12. Validation and Rules

Current implemented rules:

- if App-level focus is missing, fall back to first snapshot project/case set
- if selected generated case becomes invalid, fall back to first generated candidate
- DSL body is regenerated when selected case changes

Current missing validation:

- no true DSL schema validation request exists on this page
- no save-precondition validation exists
- no dry-run validation exists

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

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- `Regenerate`, `Dry-run`, and `Save as case` are all visible but unwired.
- flow tree and state machine are static demo structures rather than true generated artifacts.
- DSL block is locally templated rather than backend-generated and backend-validated.
- the page currently has no return path into `cases` or `execution` after review completion.
- there is no mutation-status surface for generate/validate/save failures.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
