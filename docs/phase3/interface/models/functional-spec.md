# Models Functional Specification

## 1. Document Position

- Screen name: `models`
- Front-end implementation: `ui/admin-console/src/screens/ModelConfigScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `models` screen is the AI provider and routing-policy configuration page of the Phase 3 admin console. It is the control surface where the operator manages which model providers exist, how they are labeled, and which task types route to which primary/fallback models.

Its job is to:

- show configured model providers
- let the operator add, edit, or remove provider definitions in local draft state
- show task-to-model routing rules
- persist the combined provider and routing configuration into the local Phase 3 config contract
- expose a connection-test action for provider setup review

This screen answers these operator questions:

- Which model providers are configured for the platform?
- Which provider is primary, fallback, or disabled?
- Which model serves which task type?
- Is the current model configuration saved into the file-backed config layer?

## 3. Operator Role

Primary users:

- QA platform operator
- AI/runtime policy maintainer
- local deployment maintainer configuring provider endpoints and credentials

Typical usage moments:

- before `aiGenerate`
- before `execution`
- when dashboard or runtime policy indicates provider/routing issues

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `models`

The screen influences:

- `dashboard`
- `aiGenerate`
- `execution`

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `ModelConfigScreen.tsx`.
- The page receives provider and routing-rule state from `App.tsx`.
- provider create/edit/delete are implemented only in front-end draft state.
- provider modal is implemented.
- provider card click opens edit modal.
- provider `Test` action is implemented, but only as local front-end validation.
- routing rules are displayed.
- routing-rule edit icon is visible but not wired.
- `Save` is implemented and persists model config through local-admin-api.

This matters for review:

- this page has a real persistence path
- but most edits are staged locally until `Save`
- connection testing is not a backend connectivity test yet

## 6. Functional Areas

### 6.1 Header and Add Action

Visible elements:

- navigation eyebrow
- page title
- explanatory subtitle
- save hint
- `Add provider`

Functional role:

- explain model routing purpose
- open provider-create flow

Current behavior:

- `Add provider` opens provider modal in create mode

### 6.2 Provider Card Grid

Visible elements per provider:

- provider name
- primary badge
- status badge
- model id
- usage
- latency
- cost
- actions:
  - `Test`
  - edit icon

Functional role:

- give quick visibility into configured model endpoints and runtime role
- expose provider-level actions

Current behavior:

- card click opens edit modal
- `Test` triggers local-only front-end validation
- edit icon opens edit modal

### 6.3 Routing Rule Board

Visible elements per rule:

- task
- primary model
- fallback models
- reason
- edit icon

Functional role:

- show how task categories map onto providers

Current behavior:

- rules are display-only
- edit icon is visible only

### 6.4 Footer Save Area

Visible elements:

- `Save model config`
- mutation status surface

Functional role:

- persist the current combined provider/routing draft into the local config store

Current behavior:

- implemented
- save writes multiple config items through `/api/phase3/config/model`

### 6.5 Provider Modal

Visible elements:

- provider metadata fields
- endpoint / API key / model id
- capability/runtime fields
- `Test connection`
- `Delete` when editing
- `Cancel`
- `Add provider` or `Update`

Functional role:

- create or modify a provider definition in local draft state

Current behavior:

- submit updates front-end provider state only
- `Delete` removes provider from front-end provider state only
- changes do not persist until footer `Save`

## 7. Data Semantics by Area

### 7.1 Provider Data

Current provider definitions contain:

- identity:
  - id
  - name
  - display name
  - model
- connectivity:
  - endpoint
  - API key
- runtime metadata:
  - modality
  - context window
  - max output tokens
  - temperature
  - timeout
  - status
  - role
  - region
  - notes
- UI metrics:
  - usage
  - latency
  - cost

### 7.2 Routing Rule Data

Current routing rules contain:

- task id/name
- primary provider/model reference
- fallback list
- reason

### 7.3 Persistence Semantics

The page does not save structured provider records directly. It serializes provider and routing objects into label/value config items that are then persisted through the generic model-config endpoint.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- page title
- navigation label
- save hint
- providers
- routing rules
- model mutation state
- connection-test state
- callbacks for provider changes, save, and test

### 8.2 Screen Outputs

The screen currently produces:

- local draft outputs
  - provider create/edit/delete
  - modal open/close state
- backend persistence output
  - model config save
- local-only validation output
  - test connection result

## 9. User Actions

Visible actions on this screen:

- click `Add provider`
- click provider card
- click provider `Test`
- click provider edit icon
- edit provider fields in modal
- click `Test connection` in modal
- click `Delete` in modal
- click `Cancel`
- click `Add provider` or `Update` in modal
- click routing-rule edit icon
- click footer `Save model config`

Current implementation summary:

- implemented:
  - add/edit provider modal flow
  - provider delete in local state
  - provider local test
  - save mutation
- visible but not implemented:
  - routing-rule edit action
  - real backend connection test

## 10. Functional Control Responsibility Matrix

### 10.1 Provider Controls

- `Add provider`
  - function: create a new provider draft
  - output type: local draft state
  - current implementation: implemented
- provider card
  - function: open provider detail for editing
  - output type: local modal state
  - current implementation: implemented
- provider `Test`
  - function: check minimum connection fields
  - output type: local validation state
  - current implementation: implemented as local-only check
- provider edit icon
  - function: open edit modal
  - output type: local modal state
  - current implementation: implemented

### 10.2 Routing Controls

- routing-rule edit icon
  - function: modify task-to-model routing
  - output type: future local edit flow plus save persistence
  - current implementation: visual only

### 10.3 Modal Controls

- `Test connection`
  - function: test provider credentials and endpoint
  - output type: local validation today; future backend test mutation
  - current implementation: local-only check
- `Delete`
  - function: remove current provider from draft
  - output type: local draft state
  - current implementation: implemented
- `Cancel`
  - function: dismiss modal without persisting modal edits
  - output type: local modal state
  - current implementation: implemented
- `Add provider` / `Update`
  - function: apply provider modal values into provider draft list
  - output type: local draft state
  - current implementation: implemented

### 10.4 Save Control

- `Save model config`
  - function: persist combined provider/routing config
  - output type: backend mutation
  - current implementation: implemented

## 11. State Model

The screen should support:

- provider list loaded
- create modal open
- edit modal open
- provider draft changed
- provider deleted from draft
- connection test pending
- connection test passed
- connection test failed
- save pending
- save success
- save failure

Current implementation status:

- local modal and draft states are implemented
- connection-test and save mutation states are implemented
- routing-rule edit state is not implemented

## 12. Validation and Rules

Current implemented rules:

- provider create/update requires non-empty `name` and `model`
- provider id is auto-generated if blank on create
- display name falls back to provider name
- modal reset occurs when closed
- connection test currently passes only when endpoint, API key, and model id are all non-empty

Current missing validation:

- no backend endpoint reachability test
- no duplicate provider-id conflict handling
- no routing-rule edit validation path

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- shared snapshot loading of `modelConfig`
- `App.tsx` parsing provider/routing objects from config items

### 13.2 Downstream Screens

The screen influences:

- `dashboard`
  - provider health and AI summary
- `aiGenerate`
  - generation provider policy
- `execution`
  - execution model choice and runtime routing context

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- runtime AI policy
- config persistence
- environment/runtime governance

## 14. Screen Boundary

The `models` screen is responsible for:

- provider catalog management
- routing-policy review
- file-backed model-config persistence

The `models` screen is not currently responsible for:

- executing model requests itself
- running end-to-end AI generation
- owning environment config

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- routing-rule edit icon is visible but unwired.
- provider connection testing is only a local field-presence check, not a backend reachability test.
- provider delete/update changes remain local until footer save, which may be easy to misread in the UI.
- the persistence layer is generic label/value config storage rather than a typed provider/routing API.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
