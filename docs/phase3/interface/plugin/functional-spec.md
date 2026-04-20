# Plugin Functional Specification

## 1. Document Position

- Screen name: `plugin`
- Front-end implementation: `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- Parent orchestration: `ui/admin-console/src/App.tsx`
- Documentation stage rule:
  - This document defines current and intended screen behavior for review.
  - It must not trigger UI or backend implementation changes in the current stage.
  - Any discovered gap can only be recorded as a review item.

## 2. Screen Purpose

The `plugin` screen is not a normal platform business page. It is the template shell for the Edge extension front-end popup/assistive UI. Its purpose is to show what the extension-side experience should look like when the operator is on a target page and needs lightweight page understanding, locator capture, and run-status visibility without opening the full platform first.

Its job is to:

- model the popup/front-end shell for the Edge extension
- show current-page awareness
- show lightweight active-run awareness
- expose extension-side quick actions
- model element-pick and locator-candidate review behavior
- expose the handoff boundary into the full platform

This screen answers these operator questions:

- What should the extension popup show on the current page?
- Which extension-side actions should remain lightweight?
- Which actions should stay in the full platform instead?
- How should the plugin surface current page, pick mode, locator candidates, and active run context?

## 3. Operator Role

Primary users:

- test engineer using the Edge extension on a live page
- QA operator needing lightweight assistive tooling
- reviewer validating popup-side UX before full-platform drill-down

Typical usage moments:

- while browsing the application under test
- while capturing locator candidates
- while checking the current run without opening the full admin console

## 4. Screen Placement in Product Flow

The screen is conceptually different from the admin-console business pages.

It represents:

- Edge extension popup or side-panel UI shell

It sits beside, not inside, the main platform workflows:

- can open or sync with the platform
- can request assistive page information
- can trigger lightweight execution entry

## 5. Current Implementation State

Current implementation facts:

- The page is rendered by `PluginPopupScreen.tsx`.
- The page currently receives `AdminConsoleSnapshot`, not `ExtensionPopupSnapshot`.
- current page summary, quick actions, active run card, selected element, and locator candidates are hardcoded demo content.
- the active-run card only loosely reuses `snapshot.workQueue[0]`.
- quick actions are display-only.
- pick mode is display-only.
- locator candidate list is display-only.
- `Copy` is visible but not wired.
- `Use in DSL` is visible but not wired.

This matters for review:

- the current page is an extension-front-end template shell
- it is not yet connected to the real extension-popup snapshot contract
- it is not yet connected to extension/background/native-message actions

## 6. Functional Areas

### 6.1 Browser Mock and Floating Popup

Visible elements:

- browser chrome mock
- target-page mock
- floating popup card

Functional role:

- show how the Edge extension appears alongside the current browser page

Current behavior:

- entirely static demo rendering

### 6.2 Current Page Section

Visible elements:

- page title
- route summary
- recognition badges

Functional role:

- show what the extension knows about the current page

Current behavior:

- static demo values

### 6.3 Active Run Section

Visible elements:

- running badge
- run id
- run title
- current step text
- progress bar

Functional role:

- give lightweight runtime awareness inside the popup

Current behavior:

- partial title reuse from `snapshot.workQueue[0]`
- remaining content is static demo data

### 6.4 Quick Actions Section

Visible elements:

- `Pick element`
- `Page summary`
- `Quick smoke test`
- `Open in platform`

Functional role:

- expose the lightweight assistive actions the extension should own

Current behavior:

- all actions are display-only

### 6.5 Pick Mode Panel

Visible elements:

- pick-mode header
- selected element summary
- locator-candidate list
- `Copy`
- `Use in DSL`

Functional role:

- help the operator inspect one selected page element and choose a locator candidate

Current behavior:

- selected element and locator candidates are static demo data
- footer actions are display-only

## 7. Data Semantics by Area

### 7.1 Popup-Side Data

The popup conceptually needs:

- host connection state
- current page summary
- lightweight run/runtime state
- extension-side action availability

### 7.2 Pick-Mode Data

Pick mode conceptually needs:

- selected element summary
- locator candidate list
- candidate score/risk/recommendation metadata

### 7.3 Platform Boundary Data

The plugin should only surface lightweight assistive context. Heavy configuration, report review, and broad platform management remain in the full platform UI.

## 8. Screen Inputs and Outputs

### 8.1 Screen Inputs

The current implementation consumes:

- `snapshot`
- `title`
- `locale`

The intended popup-shell input should instead be:

- extension popup snapshot
- extension runtime events
- current tab page summary
- pick-mode and locator-selection state

### 8.2 Screen Outputs

The current implementation produces:

- no backend requests
- no extension-message requests
- no platform handoff output

Its intended future outputs are:

- page summary request
- element-pick and locator-candidate actions
- lightweight execution start
- platform handoff/open action
- locator copy or DSL insertion action

## 9. User Actions

Visible actions on this screen:

- quick action `Pick element`
- quick action `Page summary`
- quick action `Quick smoke test`
- quick action `Open in platform`
- pick-mode `Copy`
- pick-mode `Use in DSL`

Current implementation summary:

- implemented:
  - none beyond static rendering
- visible but not implemented:
  - all quick actions
  - `Copy`
  - `Use in DSL`

## 10. Functional Control Responsibility Matrix

### 10.1 Quick Actions

- `Pick element`
  - function: enter extension pick mode and capture one page element
  - output type: future extension-side interaction request
  - current implementation: visual only
- `Page summary`
  - function: fetch structured summary of the current page
  - output type: future extension/background/native request
  - current implementation: visual only
- `Quick smoke test`
  - function: launch a lightweight run from current page context
  - output type: future extension-to-host execution request
  - current implementation: visual only
- `Open in platform`
  - function: hand off current popup context into the full platform
  - output type: future platform-open action
  - current implementation: visual only

### 10.2 Pick-Mode Controls

- locator row
  - function: inspect one candidate locator
  - output type: future local candidate selection state
  - current implementation: display only
- `Copy`
  - function: copy selected locator into clipboard
  - output type: future local clipboard action
  - current implementation: visual only
- `Use in DSL`
  - function: insert or hand off locator into DSL-authoring/generation flow
  - output type: future platform or extension-side handoff
  - current implementation: visual only

## 11. State Model

The screen should support:

- host connected
- host disconnected
- page summary loading
- page summary ready
- pick mode active
- element selected
- locator candidates ready
- execution starting
- run status updating

Current implementation status:

- none of these live states are implemented
- the UI only demonstrates their intended visual shape

## 12. Validation and Rules

Current implemented rules:

- none beyond static rendering

Intended product rules implied by the design:

- popup remains lightweight and assistive
- heavy config and report review should open the full platform
- extension actions should stay within extension/native-message safety boundaries

## 13. Cross-Screen Relationships

### 13.1 Relationship to Platform

The plugin is a companion surface to the full platform, not a replacement for it.

### 13.2 Relationship to Execution and Reports

- lightweight run state may appear in the popup
- heavy execution review and report detail remain platform responsibilities

### 13.3 Relationship to Cases / DSL Flows

- `Use in DSL` should eventually bridge popup locator capture into platform-side case or generation flows

## 14. Screen Boundary

The `plugin` screen is responsible for:

- extension-side popup shell
- page-assist actions
- locator-capture assistance
- lightweight runtime visibility

The `plugin` screen is not currently responsible for:

- platform catalog/config management
- deep report review
- full execution-center ownership

## 15. Known Gaps and Review Items

Review items discovered while documenting:

- The current screen still consumes `AdminConsoleSnapshot` instead of the dedicated `ExtensionPopupSnapshot`.
- All plugin-side controls are visual only.
- Pick mode, locator candidates, and quick actions are currently static demo constructs.
- The screen must continue to be treated as an Edge extension front-end template shell, not as a normal platform management page.

These are documentation review items only. No implementation change is made in this stage.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
