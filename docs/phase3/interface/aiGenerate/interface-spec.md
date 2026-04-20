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
- current lack of backend generation/validation/persistence requests
- future interfaces required by visible controls on the page

## 2. Interface Summary

Current `aiGenerate` screen conclusion:

- current direct read source:
  - none screen-specific
- current indirect read context:
  - `GET /api/phase3/admin-console`
- current direct write source:
  - none
- current real upstream integration:
  - App-level focus handoff from `docParse`
- current generated flow, state machine, and DSL are front-end demo artifacts rather than backend-generated assets

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

This fallback does not represent true AI generation output. It only prevents the screen from rendering empty content.

## 5. Current Local-Only Review Model

### 5.1 Candidate Selection

- owner: `selectedCaseId`
- request: none
- effect:
  - switches selected candidate tab
  - regenerates local DSL template with the selected candidate name

### 5.2 Flow Tree Model

- source: local constant `flowNodes`
- request: none
- meaning:
  - demo-only representation of generated flow structure

### 5.3 State Machine Model

- source: static local SVG
- request: none
- meaning:
  - demo-only representation of generated states and transitions

### 5.4 DSL Model

- source: local helper `buildDslLines(projectName, documentName, caseName)`
- request: none
- meaning:
  - placeholder for the future backend-generated case DSL artifact

## 6. Relationship to Existing Persisted Interfaces

The page does not currently save through any real endpoint.

However, the broader shell already has a case catalog mutation path:

- `POST /api/phase3/catalog/case`

That existing interface is suitable for final persistence after the generated output is converted into canonical case-catalog shape.

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
- request: none today
- owner: not implemented
- intended future interface:
  - AI case-generation mutation
- current state: visible only

#### `Dry-run`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - generated-case validation or execution-preview mutation
- current state: visible only

#### `Save as case`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - save generated candidate into case catalog
- current state: visible only

### 7.3 Review Surfaces

#### Flow / state tree panel

- user action: view
- request: none
- owner: local demo data
- current state: display only

#### State machine panel

- user action: view
- request: none
- owner: local demo SVG
- current state: display only

#### DSL panel

- user action: view
- request: none today
- owner: local generated text
- intended future interface:
  - DSL validation read/mutation
- current state: display only

#### Review notes panel

- user action: view
- request: none
- owner: App-level focus reasoning blocks
- current state: display only

## 8. Recommended Future AI Generate Interfaces

The visible controls require explicit generation-domain interfaces.

### 8.1 Generate / Regenerate Interface

#### `POST /api/phase3/agent/generate-case`

Purpose:

- generate or regenerate executable candidate cases from document-parse context

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

## 9. Detailed Implementation Design for Currently Unwired Controls

### 9.1 `Regenerate`

Recommended implementation type:

- new AI-generation mutation

Concrete implementation design:

- button posts:
  - `POST /api/phase3/agent/generate-case`
- request is assembled from current focus and selected candidate:
  - `projectKey`
  - `documentId`
  - `caseId`
  - operator identity
  - prompt mode `REGENERATE`
- success behavior:
  - replace current `generatedCases`
  - replace flow tree
  - replace state machine
  - replace DSL
  - replace reasoning
  - set selected candidate to returned primary candidate
- failure behavior:
  - show page-local generate mutation error

### 9.2 `Dry-run`

Recommended implementation type:

- validate first, optionally hand off later to `execution`

Concrete implementation design:

1. button posts:
   - `POST /api/phase3/cases/dsl/validate`
2. if validation succeeds, post:
   - `POST /api/phase3/agent/generate-case/dry-run`
3. success behavior:
   - show dry-run result summary
   - optionally expose `Open in execution` follow-up action using returned launch-form hints
4. failure behavior:
   - keep operator on `aiGenerate`
   - mark DSL/review surface as failed

### 9.3 `Save as case`

Recommended implementation type:

- validate then reuse existing case-catalog persistence interface

Concrete implementation design:

1. button posts:
   - `POST /api/phase3/cases/dsl/validate`
2. if validation succeeds, submit canonical payload to:
   - `POST /api/phase3/catalog/case`
3. success behavior:
   - reload shared snapshot:
     - `GET /api/phase3/admin-console`
   - optionally route to `cases` with saved case selected
4. failure behavior:
   - show save-state failure on the page

Reasoning:

- this keeps final persistence aligned with the existing case-catalog domain instead of inventing a second save endpoint

### 9.4 Candidate Tabs

Recommended implementation type:

- keep local selection behavior
- when real generation payload exists, tabs should switch the bound artifact set without extra requests

Concrete implementation design:

- initial generate response returns all candidate artifacts:
  - candidate summary
  - DSL
  - flow tree
  - state machine
  - reasoning
- tab click updates current candidate in local state only

### 9.5 DSL Review Surface

Recommended implementation type:

- keep local view switching
- add explicit validation action coupling

Concrete implementation design:

- before showing `schema ok`, page should call:
  - `POST /api/phase3/cases/dsl/validate`
- validation result updates:
  - success pill
  - warnings list
  - field-level or line-level errors when present

## 10. Error Handling Boundary

Current implementation:

- the page has no backend requests
- missing focus falls back to snapshot-derived demo content

Recommended future errors:

- generation failure
  - show mutation error in hero action area
- DSL validation failure
  - show invalid schema state in DSL panel
- save failure
  - keep candidate selected and preserve generated output for retry
- dry-run failure
  - return structured check results rather than only a generic message

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

## 12. Review Items

Review-only findings:

- The current page is mostly a review-shell prototype over App-level focus handoff and local demo artifacts.
- The correct persistence direction is to reuse `POST /api/phase3/catalog/case` after DSL validation.
- `Regenerate` and `Dry-run` need explicit generation-domain endpoints rather than being forced through unrelated scheduler APIs.
- The current static flow tree and state machine make the page look more complete than it actually is; the interface document should treat them as placeholder artifacts until backend-generated payloads exist.

These are documentation findings only. No implementation change is made in this stage.
