# AiGenerate Interface Specification

## 1. Scope and Design Basis

- Screen: `aiGenerate`
- UI implementation:
  - `ui/admin-console/src/screens/AiGenerateScreen.tsx`
  - `ui/admin-console/src/screens/DocParseScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/main/enterprise_web_test_platform_implementation_design.md`
  - `docs/phase3/main/enterprise_web_test_platform_tech_design.md`

This document distinguishes:

- current App-level focus input from `docParse`
- current snapshot fallback behavior
- current implemented generation/validation/persistence requests
- remaining limits between backend-returned generated artifacts and front-end fallback display

## 2. Interface Summary

Current `aiGenerate` screen conclusion:

- current direct read source:
  - `GET /api/phase3/admin-console` (fallback context when no focus)
- current direct write sources:
  - `POST /api/phase3/agent/generate-case` (generate/regenerate)
  - `POST /api/phase3/cases/dsl/validate` (DSL validation)
  - `POST /api/phase3/agent/generate-case/dry-run` (dry-run validation)
  - `POST /api/phase3/catalog/case` (save to case catalog)
- current real upstream integration:
  - App-level focus handoff from `docParse`
- auto-generate on mount when focus exists
- generated flow, state machine, DSL, and reasoning come from backend when genResult is populated; local fallback used otherwise

## 3. Current Upstream App-Level Focus Handoff: DocParse -> AiGenerate

### 3.1 Purpose for AiGenerate Screen

The page currently enters through a focused payload assembled by `DocParseScreen.tsx` and stored by `App.tsx`.

This payload gives the screen enough context to:

- know which project/document/case is under review
- populate generated candidate tabs
- display review reasoning

### 3.2 Current Producer and Consumer

Producer:

- `DocParseScreen.tsx`

Transit owner:

- `App.tsx` via `setAiGenerateFocus(...)`

Consumer:

- `AiGenerateScreen.tsx`

### 3.3 Current Payload Shape

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
      "confidence": "0.94"
    }
  ],
  "reasoning": [
    {
      "label": "Context",
      "body": "Built from the selected parsed document, linked cases, and current platform guardrails."
    }
  ]
}
```

### 3.4 Interface Meaning

This is the most concrete current interface on the page. It is a cross-screen contract, not a backend request.

## 4. Current Snapshot Fallback Context

### 4.1 Current Fallback Source

When no App-level focus exists, the page derives fallback content from:

- `snapshot.projects[]`
- `snapshot.cases[]`

Those values originate from:

- `GET /api/phase3/admin-console`

### 4.2 Functional Role by Field

- `projects[]`
  - provides fallback `projectKey` and `projectName`
- `cases[]`
  - provides fallback candidate cases
  - provides fallback `caseId` and `caseName`

### 4.3 Current Limitation

This fallback does not represent true AI generation output. It only prevents the screen from rendering empty content before a focused generation request succeeds, or when the page is opened without `docParse` context.

## 5. Review Model — API-Driven with Local Fallback

### 5.1 Candidate Selection

- owner: `selectedCaseId`
- request: none (local switch only)
- effect:
  - switches selected candidate tab
  - when no genResult: regenerates local DSL template with the selected candidate name
  - when genResult exists: displays the same API-returned content (single selectedDsl per generation)

### 5.2 Flow Tree Model

- source when genResult exists: `genResult.flowTree` (backend-returned)
- source when no genResult: local constant `defaultFlowNodes`
- meaning:
  - backend returns deterministic flow tree shaped by input context
  - local fallback provides demo structure until generation runs

### 5.3 State Machine Model

- source when genResult exists: `genResult.stateMachine` (rendered as state rows + edge rows)
- source when no genResult: static local SVG
- meaning:
  - backend returns deterministic state/edge graph
  - local fallback provides static demo SVG until generation runs

### 5.4 DSL Model

- source when genResult exists: `genResult.selectedDsl.content` (backend-returned)
- source when no genResult: local helper `buildLocalDsl(projectName, documentName, caseName)`
- meaning:
  - backend returns deterministic DSL content shaped by input context
  - local fallback provides demo DSL until generation runs

## 6. Relationship to Existing Persisted Interfaces

The page now saves through the broader shell's case catalog mutation path:

- `POST /api/phase3/catalog/case`

That existing interface is reused for final persistence after the generated output is converted into canonical case-catalog shape. `aiGenerate` does not introduce a parallel save contract.

## 7. UI Control to Interface Mapping

### 7.1 Candidate Controls

#### Generated case tab

- user action: click
- request: none
- owner: local selected-case state
- current state: implemented

### 7.2 Header Actions

#### `Regenerate`

- user action: click
- request: `POST /api/phase3/agent/generate-case` with `promptMode: "REGENERATE"`
- owner: `doGenerate("REGENERATE")` in `AiGenerateScreen.tsx`
- current state: implemented — replaces all panel content on success, shows error on failure, disabled during pending

#### `Dry-run`

- user action: click
- request: `POST /api/phase3/cases/dsl/validate` then `POST /api/phase3/agent/generate-case/dry-run`
- owner: `doDryRun()` in `AiGenerateScreen.tsx`
- current state: implemented — validates first, shows dry-run pass/fail with runtime checks, disabled during pending

#### `Save as case`

- user action: click
- request: `POST /api/phase3/cases/dsl/validate` then `POST /api/phase3/catalog/case`
- owner: `doSave()` in `AiGenerateScreen.tsx`
- current state: implemented — validates first, persists to catalog, triggers snapshot reload, disabled during pending

### 7.3 Review Surfaces

#### Flow / state tree panel

- user action: view
- request: none (data from genResult or fallback)
- owner: `genResult.flowTree` or `defaultFlowNodes`
- current state: display only, backend-sourced when genResult exists

#### State machine panel

- user action: view
- request: none (data from genResult or fallback)
- owner: `genResult.stateMachine` (list view) or static SVG
- current state: display only, backend-sourced when genResult exists

#### DSL panel

- user action: view
- request: none (data from genResult or fallback)
- owner: `genResult.selectedDsl.content` or `buildLocalDsl(...)`
- validation: DSL validated before dry-run and save via `POST /api/phase3/cases/dsl/validate`
- current state: display only, backend-sourced when genResult exists

#### Review notes panel

- user action: view
- request: none
- owner: `genResult.reasoning` or App-level focus reasoning blocks
- current state: display only, backend-sourced when genResult exists

## 8. Implemented AI Generate Interfaces

### 8.1 Generate / Regenerate Interface

#### `POST /api/phase3/agent/generate-case`

Purpose:

- generate or regenerate executable candidate cases from document-parse context

Current status:

- implemented in `AgentGenerateService.generateCase()`
- returns deterministic mock data shaped by input context
- REGENERATE mode adds an extra boundary candidate

Request body:

```json
{
  "projectKey": "checkout-web",
  "documentId": "checkout-web-primary",
  "caseId": "checkout-smoke",
  "promptMode": "REGENERATE",
  "operator": "qa-platform",
  "constraints": {
    "environment": "staging",
    "requireRestorePlan": true,
    "requireComparisonPlan": true
  }
}
```

Response body:

```json
{
  "documentId": "checkout-web-primary",
  "selectedCaseId": "checkout-smoke",
  "generatedCases": [
    {
      "id": "gen-checkout-smoke-a",
      "name": "Checkout smoke",
      "category": "happy",
      "confidence": "0.94",
      "summary": "Covers cart to successful payment with DB and delta assertions."
    },
    {
      "id": "gen-checkout-smoke-b",
      "name": "Checkout smoke - alt coupon path",
      "category": "boundary",
      "confidence": "0.81",
      "summary": "Adds coupon branch and explicit wait checkpoint."
    }
  ],
  "reasoning": [
    {
      "label": "Coverage",
      "body": "Expanded payment completion, stock delta, and rollback checkpoints."
    }
  ],
  "selectedDsl": {
    "format": "text/x-phase3-dsl",
    "content": "case \"Checkout smoke\" { ... }"
  },
  "stateMachine": {
    "states": [
      { "id": "cart.loaded", "label": "cart.loaded" }
    ],
    "edges": [
      { "from": "cart.loaded", "to": "checkout.form", "trigger": "click #proceed-btn" }
    ]
  },
  "flowTree": [
    {
      "label": "cart.loaded",
      "tone": "accent",
      "indent": 0
    }
  ]
}
```

### 8.2 DSL Validation Interface

#### `POST /api/phase3/cases/dsl/validate`

Purpose:

- validate generated DSL before save or dry-run

Current status:

- implemented in `AgentGenerateService.validateDsl()`
- checks for empty DSL and missing case block declaration
- returns VALID/INVALID with errors and warnings

Request body:

```json
{
  "projectKey": "checkout-web",
  "documentId": "checkout-web-primary",
  "candidateId": "gen-checkout-smoke-a",
  "dsl": "case \"Checkout smoke\" { ... }"
}
```

Response body:

```json
{
  "status": "VALID",
  "errors": [],
  "warnings": [
    {
      "code": "LOCATOR_STABILITY",
      "message": "Primary locator score below preferred threshold on submit button."
    }
  ],
  "normalizedDsl": "case \"Checkout smoke\" { ... }"
}
```

### 8.3 Save Generated Case Interface

#### `POST /api/phase3/catalog/case`

Purpose:

- persist the accepted generated case into the canonical case catalog

Current status:

- implemented via existing `CatalogPersistenceService.upsertCase()`
- aiGenerate submission includes `dsl`, `sourceDocumentId`, and `generationMeta` fields
- file-backed persistence under `config/phase3/catalog.json`

Request body design for `aiGenerate` submission:

```json
{
  "items": [
    {
      "id": "checkout-smoke",
      "projectKey": "checkout-web",
      "name": "Checkout smoke",
      "tags": [
        "generated",
        "doc-parse"
      ],
      "status": "draft",
      "archived": false,
      "dsl": "case \"Checkout smoke\" { ... }",
      "sourceDocumentId": "checkout-web-primary",
      "generationMeta": {
        "candidateId": "gen-checkout-smoke-a",
        "confidence": "0.94",
        "generator": "agent.generate-case"
      }
    }
  ]
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "saved": 1
}
```

### 8.4 Dry-Run Interface

#### `POST /api/phase3/agent/generate-case/dry-run`

Purpose:

- validate generated candidate through parser/schema/runtime-readiness checks before catalog persistence or execution launch

Current status:

- implemented in `AgentGenerateService.dryRun()`
- checks parser status, runtime plan references, and environment access
- returns PASSED/FAILED with structured check results
- suggests launch form when passed

Request body:

```json
{
  "projectKey": "checkout-web",
  "documentId": "checkout-web-primary",
  "candidateId": "gen-checkout-smoke-a",
  "dsl": "case \"Checkout smoke\" { ... }",
  "environment": "staging"
}
```

Response body:

```json
{
  "status": "PASSED",
  "parser": {
    "status": "OK"
  },
  "runtimeChecks": [
    {
      "name": "restorePlanRef",
      "status": "OK"
    },
    {
      "name": "comparisonPlanRef",
      "status": "OK"
    }
  ],
  "suggestedLaunchForm": {
    "projectKey": "checkout-web",
    "environment": "staging"
  }
}
```

## 9. Implemented Control Wiring

### 9.1 `Regenerate`

Implementation:

- prop: `doGenerate("REGENERATE")` callback
- endpoint: `POST /api/phase3/agent/generate-case`
- request assembled from activeFocus: `projectKey`, `documentId`, `caseId`, operator, `REGENERATE` mode
- success behavior:
  - replaces `genResult` → all panels update (flow tree, state machine, DSL, reasoning)
  - resets validation/dry-run/save states
  - sets selected candidate to first returned candidate
- failure behavior: shows error in header area

### 9.2 `Dry-run`

Implementation:

- prop: `doDryRun()` callback
- step 1: `POST /api/phase3/cases/dsl/validate`
- step 2 (only on VALID): `POST /api/phase3/agent/generate-case/dry-run`
- success behavior: shows "Dry-run passed" and structured check results
- failure behavior: keeps operator on aiGenerate, shows error

### 9.3 `Save as case`

Implementation:

- prop: `doSave()` callback
- step 1: `POST /api/phase3/cases/dsl/validate`
- step 2 (only on VALID): `POST /api/phase3/catalog/case`
- payload includes `dsl`, `sourceDocumentId`, `generationMeta`
- success behavior: shows "Saved to catalog", calls `onSaveSuccess()` (triggers snapshot reload)
- failure behavior: shows error, preserves generated content for retry

Reasoning: reuses existing case-catalog persistence instead of inventing a second save endpoint.

### 9.4 Candidate Tabs

Implementation:

- local selection via `selectedCaseId`
- candidates from `genResult.generatedCases` or `activeFocus.generatedCases`
- tab click updates local state only; no extra API calls

### 9.5 DSL Validation Surface

Implementation:

- validation pill driven by `validateState` and `generateState`:
  - "schema ok" after successful validation or generation
  - "schema error" after validation failure
  - "pending" when no validation has run
- DSL validated automatically before dry-run and save actions

## 10. Error Handling Boundary

Current implementation:

- missing focus falls back to snapshot-derived demo content
- generation failure: error message rendered in header action area
- DSL validation failure: validation pill shows "schema error"; dry-run and save abort before their second request
- save failure: error shown in header area; generated content preserved for retry
- dry-run failure: structured check results shown inline (parser status + runtime check details)
- all buttons disabled while any mutation is pending, preventing concurrent requests

## 11. Relationship to Other Interfaces

### 11.1 Relationship to DocParse

- `docParse` remains the document-review source page
- `aiGenerate` consumes the selected document/case context produced there

### 11.2 Relationship to Cases

- accepted generated results should land in the same catalog mutated by:
  - `POST /api/phase3/catalog/case`

### 11.3 Relationship to Execution

- dry-run success should be able to produce execution-launch hints
- the screen should not directly replace the `execution` page's scheduler submission flow

## 12. Remaining Limits

- Backend generation is deterministic mock shaped by input context; no real AI agent integrated in Phase 3.
- Flow tree, state machine, and DSL from the backend are realistic but deterministic — they do not vary by actual document content.
- Local fallback data still exists for when no focus or genResult is available; clearly separated from API data via `genResult?.xxx ?? fallback` pattern.
- No automatic return path from `aiGenerate` into `cases` or `execution` after review completion; save and dry-run remain in-place review actions on this screen.
- DSL is not directly editable on this page; operator can only review the generated content.
- Candidate tab switch is local-only; does not change DSL/flow/machine per candidate when backend returns a single selectedDsl.
