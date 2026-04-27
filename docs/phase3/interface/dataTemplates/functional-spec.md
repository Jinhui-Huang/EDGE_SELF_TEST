# DataTemplates Functional Specification

## 1. Document Position

- Screen name: `dataTemplates`
- Front-end implementation: `ui/admin-console/src/screens/DataTemplatesScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `dataTemplates` screen is the reusable test-data-template catalog page of the Phase 3 admin console. It is the operator-facing surface for reviewing reusable seed, service, and composite preparation recipes that will later be consumed by `execution` and compared in `dataDiff`.

Its job is to:

- list available data templates
- let the operator inspect one template in detail
- show template type, environment whitelist, risk level, rollback strategy, parameters, and guarded execution steps
- anchor the relationship between template definition and downstream execution-time compare selection
- expose the management actions that should eventually create, import, edit, or dry-run templates

This screen answers these operator questions:

- Which data templates exist for each project?
- What rollback and guard strategy is attached to a template?
- Which parameters must be provided before runtime use?
- Which template should later appear in `execution` as a compare target?

## 3. Operator Role

Primary users:

- QA platform operator
- data-preparation maintainer
- test engineer reviewing whether a reusable seed/restore recipe is safe enough to use

Typical usage moments:

- before `execution`
- while preparing new reusable test-data recipes
- while reviewing rollback safety and environment restrictions

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `dataTemplates`

The screen is a configuration page that influences:

- `execution`
- `dataDiff`
- future restore / compare planning

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `DataTemplatesScreen.tsx`.
- The page fetches from `GET /api/phase3/data-templates` on mount; falls back to local seeded data when API is unavailable.
- The page receives `apiBaseUrl` from `App.tsx` and drives all CRUD/import/dry-run through backend endpoints.
- template-row selection is implemented locally.
- detail rendering for params, steps, guards, and project scope is implemented.
- `Import` is implemented: `POST /api/phase3/data-templates/import/preview` -> `POST /api/phase3/data-templates/import/commit`.
- `New template` is implemented: `POST /api/phase3/data-templates`.
- `Edit` is implemented: uses locally selected object copy, saves via `PUT /api/phase3/data-templates/{templateId}`.
- `Delete` is implemented: `DELETE /api/phase3/data-templates/{templateId}`.
- `Dry-run` is implemented: `POST /api/phase3/data-templates/{templateId}/dry-run`.

This matters for review:

- the page is now backed by a real backend-owned template registry
- `execution` reads from the same backend registry (`GET /api/phase3/data-templates`)
- mutation status is shown inline after create/edit/delete/import/dry-run operations

## 6. Functional Areas

### 6.1 Header and Actions

Visible elements:

- breadcrumb/path
- page title
- explanatory subtitle
- actions:
  - `Import`
  - `New template`

Functional role:

- explain that templates are reusable DB/service preparation recipes
- expose catalog-management entry actions

Current behavior:

- `Import` opens a preview/commit flow backed by `POST /api/phase3/data-templates/import/preview` and `POST /api/phase3/data-templates/import/commit`
- `New template` opens a create form that posts to `POST /api/phase3/data-templates`

### 6.2 Template Catalog Table

Visible columns:

- name
- type
- env allowed
- risk
- rollback
- uses

Functional role:

- let the operator browse and select one template record

Current behavior:

- row click updates local selected-template state

### 6.3 Template Detail Panel

Visible elements:

- template name
- template summary line
- parameter list
- steps list
- guards list
- project scope card
- footer actions:
  - `Edit`
  - `Dry-run`

Functional role:

- expose the operational details that determine whether a template is safe and useful

Current behavior:

- detail content is driven by the currently selected template from the backend registry
- `Edit` opens an edit form that updates via `PUT /api/phase3/data-templates/{templateId}`
- `Delete` removes the template via `DELETE /api/phase3/data-templates/{templateId}`
- `Dry-run` posts to `POST /api/phase3/data-templates/{templateId}/dry-run` and shows result inline

## 7. Data Semantics by Area

### 7.1 Template Catalog Data

Current catalog entries contain:

- template id/name
- template type:
  - `sql`
  - `service`
  - `composite`
- allowed environments
- risk level
- use count
- rollback strategy
- project key

### 7.2 Template Detail Data

Current detail object also contains:

- ordered preparation steps
- execution guards
- parameter definitions
- compare-summary text

### 7.3 Cross-Screen Meaning

The current template objects are not only for this screen. They are also the exact source used by `execution` to populate compare-template multi-select choices.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- page title
- `apiBaseUrl` from `App.tsx`
- `dataTemplates` fallback list from `App.tsx` (used only when API is unavailable)

### 8.2 Screen Outputs

The screen currently produces:

- local UI output
  - selected template id
- backend mutations
  - template creation (`POST /api/phase3/data-templates`)
  - template update (`PUT /api/phase3/data-templates/{templateId}`)
  - template deletion (`DELETE /api/phase3/data-templates/{templateId}`)
  - template import (`POST .../import/preview` -> `POST .../import/commit`)
  - template dry-run (`POST /api/phase3/data-templates/{templateId}/dry-run`)

## 9. User Actions

Visible actions on this screen:

- click a template row
- click `Import`
- click `New template`
- click `Edit`
- click `Dry-run`

Current implementation summary:

- implemented:
  - template row selection
  - `Import` (preview/commit two-step flow)
  - `New template` (create via POST)
  - `Edit` (update via PUT)
  - `Delete` (remove via DELETE)
  - `Dry-run` (validation via POST)

## 10. Functional Control Responsibility Matrix

### 10.1 Header Actions

- `Import`
  - function: bring new template definitions into the catalog
  - output type: two-step preview/commit import flow
  - current implementation: implemented via `POST /api/phase3/data-templates/import/preview` -> `POST /api/phase3/data-templates/import/commit`
- `New template`
  - function: create a new reusable template definition
  - output type: create mutation
  - current implementation: implemented via `POST /api/phase3/data-templates`

### 10.2 Catalog Controls

- template row
  - function: choose current template for inspection
  - output type: local screen state only
  - current implementation: implemented

### 10.3 Detail Controls

- `Edit`
  - function: update selected template metadata and recipe definition
  - output type: template-update mutation
  - current implementation: implemented via `PUT /api/phase3/data-templates/{templateId}`
- `Delete`
  - function: remove selected template from the registry
  - output type: template-delete mutation
  - current implementation: implemented via `DELETE /api/phase3/data-templates/{templateId}`
- `Dry-run`
  - function: validate that selected template can execute safely with parameter and environment constraints
  - output type: template dry-run mutation
  - current implementation: implemented via `POST /api/phase3/data-templates/{templateId}/dry-run`

## 11. State Model

The screen should support:

- no template selected
- template selected
- import pending
- create pending
- edit pending
- dry-run pending
- mutation success
- mutation failure

Current implementation status:

- selected-template state is implemented
- mutation states (pending/success/error) are implemented for create, edit, delete, import, and dry-run
- error feedback is shown inline after failed mutations

## 12. Validation and Rules

Current implemented rules:

- selected-template state falls back to the first available template if the current selection disappears
- project scope label resolves through `snapshot.projects`

Current intended data-governance rules implied by the UI:

- template type controls execution path
- env whitelist limits where a template may run
- rollback strategy must be explicit
- guards must be reviewable before runtime use

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- `App.tsx` for `apiBaseUrl` and fallback template catalog
- `GET /api/phase3/data-templates` for the authoritative template registry
- `snapshot.projects` for project-name resolution

### 13.2 Downstream Screens

The screen influences:

- `execution`
  - compare-template multi-select options
- `dataDiff`
  - compare-summary semantics and restore/diff expectations

### 13.3 Shared Data Context

The screen shares these domains with other screens:

- projects
- environments
- execution launch preparation
- restore / diff planning

## 14. Screen Boundary

The `dataTemplates` screen is responsible for:

- template catalog browsing
- template safety/reusability review
- template metadata and recipe-definition management

The `dataTemplates` screen is not currently responsible for:

- execution launch
- run-specific diff results
- actual restore execution

## 15. Known Gaps and Review Items

Current remaining limits:

- The backend template registry uses file-backed persistence (`config/phase3/data-templates.json`), not a real database.
- Dry-run is deterministic validation only and does not execute real SQL or service calls.
- Import preview/commit is deterministic and does not validate against real datasources.
- Template versioning is not yet implemented; updates overwrite in place.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
