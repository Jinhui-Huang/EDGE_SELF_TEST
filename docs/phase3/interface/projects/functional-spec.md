# Projects Functional Specification

## 1. Document Position

- Screen name: `projects`
- Front-end implementation: `ui/admin-console/src/screens/ProjectsScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `projects` screen is the project catalog workspace of the Phase 3 admin console. Its job is to expose the managed project set, summarize each project's current operational context, and provide a lightweight catalog maintenance form without changing the current file-backed contract.

This screen answers these operator questions:

- Which projects are currently managed by the platform?
- Which project appears risky or operationally unstable?
- Which project should be opened for case, execution, or report investigation?
- How can the operator update basic project metadata in the current Phase 3 shell?

## 3. Operator Role

Primary users:

- QA platform operator
- Test operations owner
- Platform administrator maintaining project metadata

Typical usage moments:

- reviewing managed project coverage
- checking which projects need triage
- maintaining project catalog metadata
- opening related case/report/execution flows from a project context

## 4. Screen Placement in Product Flow

The screen lives inside the common admin-console frame:

- top bar
- sidebar
- main panel: `projects`

The screen functions as the catalog-level project hub before the operator moves into:

- `cases`
- `execution`
- `reports`
- `reportDetail`
- future project-detail or document-centered flows

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `ProjectsScreen.tsx`.
- The page combines two modes in one screen:
  - overview cards for visual project status
  - editable catalog form for metadata persistence
- The overview region derives project cards from snapshot data using front-end composition.
- The editor region uses real app-level state and a real save request flow.
- Some top-level and card-level action buttons are visible but not wired to true navigation or backend behavior.

This distinction matters:

- the screen already owns a real write flow for catalog persistence
- but not every visible action is currently implemented

## 6. Functional Areas

### 6.1 Screen Header Area

Visible elements:

- screen title
- aggregate subtitle with project count, case count, weekly pass rate
- search box
- `Import` button
- `New project` button

Functional role:

- establish the current project catalog scope
- provide search entry
- reserve entry points for import and project creation flows

Current behavior:

- search box filters visible project cards locally
- `Import` is visual only
- `New project` is visual only

### 6.2 Project Card Grid

Visible elements per project card:

- project identity
  - avatar
  - name
  - description
- mini summary cards
  - docs
  - cases
  - pass rate
  - env count
  - queue state
  - last run status
- card actions
  - `Open` / `Close`
  - `Reports`
  - updated time

Functional role:

- provide a quick project overview without entering a deep detail page
- allow the operator to compare projects side by side
- identify which project deserves deeper inspection

Current behavior:

- clicking the card selects the project locally
- `Open` toggles inline detail panel locally
- `Reports` only opens the same inline detail context locally; it does not navigate to `reports`

### 6.3 Inline Project Detail Panel

Visible elements:

- project detail eyebrow/title/note
- summary cards:
  - project info
  - docs entry
  - cases entry
  - execution entry
  - reports entry
  - pass rate / tags
- actions:
  - `Enter project`
  - `View reports`

Functional role:

- provide a lightweight “project summary detail” surface without leaving the screen
- expose where the operator should go next for deeper work

Current behavior:

- detail panel is purely front-end/local
- `Enter project` is visual only
- `View reports` is visual only

### 6.4 Empty State

Visible behavior:

- when search returns no project, the grid shows an empty-state message

Functional role:

- explain that the current query has no matching projects

### 6.5 Project Catalog Editor

Visible structure:

- editable project rows
- fields per row:
  - key
  - name
  - scope
  - environments
  - note
- row remove button
- editor actions:
  - `Add project row`
  - `Save project catalog`
- support meta line
- mutation status area

Functional role:

- maintain the current file-backed project catalog
- allow operators to append or update project metadata
- preserve compatibility with current local-admin-api persistence

Current behavior:

- row edits are local until save
- removing a row is local draft manipulation only
- save triggers real request flow

## 7. Data Semantics by Area

### 7.1 Project Card Data

- card data is not a backend-native project DTO
- it is a front-end view model composed from:
  - `snapshot.projects`
  - `snapshot.cases`
  - `snapshot.reports`
  - `snapshot.workQueue`
  - `snapshot.environmentConfig`

This means:

- cards are an operator-friendly summary layer
- some values are derived heuristics, not backend-authoritative business records

### 7.2 Catalog Editor Data

- editor rows are authoritative draft inputs for persistence
- these rows are closer to the true catalog contract than the summary cards

### 7.3 Search Result Semantics

- search filters visible cards only
- search does not change the saved catalog
- search does not request the backend

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The screen consumes:

- current locale
- shell snapshot
- `projectDraft`
- `projectState`
- app-provided field labels and save hint
- callbacks:
  - `onProjectChange`
  - `onAddProjectRow`
  - `onRemoveProjectRow`
  - `onSubmit`

### 8.2 Screen Outputs

The screen produces two kinds of outputs:

- local UI outputs
  - search filter changes
  - selected/opened project changes
  - draft row changes
- persistence output
  - project catalog save intent through the app-level submit handler

## 9. User Actions

Visible actions on this screen:

- search projects
- select a project card
- open / close inline project detail
- open local “reports” detail state on a card
- edit project draft fields
- remove project draft row
- add project draft row
- save project catalog
- `Import`
- `New project`
- `Enter project`
- `View reports`

Current implementation summary:

- implemented:
  - search
  - select card
  - open / close inline detail
  - edit draft
  - remove row
  - add row
  - save project catalog
- not implemented beyond visible UI:
  - `Import`
  - `New project`
  - `Enter project`
  - `View reports`

## 10. Functional Control Responsibility Matrix

### 10.1 Header Controls

- Search input
  - function: filter project cards by key/name/description
  - output type: local filter only
  - current implementation: implemented
- `Import`
  - function: reserved import entry
  - output type: future project import flow
  - current implementation: visual only
- `New project`
  - function: reserved explicit create-project entry
  - output type: future new-project flow or editor focus
  - current implementation: visual only

### 10.2 Card Controls

- Project card click
  - function: mark current project focus
  - output type: local selection
  - current implementation: implemented
- `Open` / `Close`
  - function: toggle inline project detail
  - output type: local detail visibility
  - current implementation: implemented
- `Reports`
  - function: intended report-oriented drill-down
  - output type: should lead operator toward project-related report context
  - current implementation: only opens local detail state

### 10.3 Inline Detail Controls

- `Enter project`
  - function: intended downstream project-centered work entry
  - likely downstreams:
    - `cases`
    - future project detail
    - document-oriented project flow
  - current implementation: visual only
- `View reports`
  - function: intended report drill-down from project context
  - downstream relation: `reports`
  - current implementation: visual only

### 10.4 Catalog Editor Controls

- field edits
  - function: mutate local project draft
  - current implementation: implemented
- `Remove row`
  - function: delete one draft row from the current editor state
  - current implementation: implemented
- `Add project row`
  - function: append a blank draft row
  - current implementation: implemented
- `Save project catalog`
  - function: persist valid draft rows through current Phase 3 local-admin-api
  - current implementation: implemented

## 11. State Model

The screen should support:

- loaded with visible projects
- filtered results
- opened inline detail
- no matching projects for current search
- editor idle
- editor pending save
- editor save success
- editor save error

Current implementation status:

- local search state is implemented
- local selected/opened project state is implemented
- mutation state is implemented
- dedicated loading/empty/error shell state is still mostly owned by app-level snapshot loading

## 12. Validation and Rules

Current implemented validation rules before save:

- at least one valid project row must remain
- valid row requires:
  - `key`
  - `name`
  - `scope`
- duplicate project key is rejected

Normalization rules:

- string fields are trimmed before validation
- `environments` is entered as comma-separated text in the UI
- save flow converts environments into string arrays

Implicit business rules:

- this screen edits metadata only
- this screen must preserve current file-backed Phase 3 contract
- this screen must not mutate cases directly

## 13. Cross-Screen Relationships

### 13.1 Upstream Dependencies

The screen depends on:

- shell snapshot loading
- project draft state owned in `App.tsx`
- mutation state owned in `App.tsx`

### 13.2 Downstream Screens

The screen should serve as an upstream context for:

- `cases`
  - project-focused case management
- `execution`
  - execution by selected project
- `reports`
  - report review from project context
- future project detail / document flows

### 13.3 Shared Data Context

The screen shares these snapshot domains with other screens:

- projects
- cases
- reports
- work queue
- environment config

## 14. Screen Boundary

The `projects` screen is responsible for:

- project catalog overview
- lightweight project-centered operational summary
- editing project metadata rows
- persisting project catalog rows

The `projects` screen is not responsible for:

- editing case rows
- starting execution directly from this screen's current implementation
- opening full report artifacts itself
- deep document parsing or AI generation

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- `Import` is visible but not wired.
- `New project` is visible but not wired beyond the existing draft editor.
- `Reports` on project cards does not navigate to `reports`; it only opens local inline detail state.
- `Enter project` and `View reports` in the inline detail panel are visible but not wired.
- The project cards use a front-end-composed view model rather than a dedicated backend project-summary contract.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`

