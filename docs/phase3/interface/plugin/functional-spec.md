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
- The page consumes `ExtensionPopupSnapshot` from `GET /api/phase3/extension-popup`.
- Props: `apiBaseUrl`, `title`, `locale` (no `snapshot` prop — the screen fetches its own data).
- Loading/loaded/error states are implemented for the popup snapshot fetch.
- Current page section and active-run card render data from `popupSnapshot.page` and `popupSnapshot.runtime`.
- Quick actions are display-only.
- Pick mode is display-only.
- Locator candidate list is display-only.
- `Copy` is visible but not wired.
- `Use in DSL` is visible but not wired.

This matters for review:

- the current page is an extension-front-end template shell
- it is connected to the dedicated extension-popup snapshot contract
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

- page title, URL path, and domain rendered from `popupSnapshot.page`
- fallback values used when popup snapshot is not yet loaded

### 6.3 Active Run Section

Visible elements:

- running badge
- run mode
- next action text
- audit state
- progress bar

Functional role:

- give lightweight runtime awareness inside the popup

Current behavior:

- runtime mode, queue state, audit state, and next action rendered from `popupSnapshot.runtime`
- running/idle badge derived from `runtime.queueState`
- progress bar shown when queue state indicates active or running

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

- `apiBaseUrl` (used to fetch `GET /api/phase3/extension-popup`)
- `title`
- `locale`

The screen fetches its own data on mount via `fetch(apiBaseUrl + "/api/phase3/extension-popup")`.

Future popup-shell inputs may also include:

- extension runtime events
- current tab page summary from content script
- pick-mode and locator-selection state

### 8.2 Screen Outputs

The current implementation produces:

- `GET /api/phase3/extension-popup` read request on mount
- no extension-message requests
- no platform handoff output

Its intended future outputs are:

- page summary request via extension/background chain
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
  - popup snapshot fetch from `GET /api/phase3/extension-popup`
  - loading/loaded/error state rendering
  - page and runtime data rendering from popup snapshot
- visible but not implemented:
  - all quick actions (require extension/background/native infrastructure)
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

- implemented:
  - `loading` — shown while `GET /api/phase3/extension-popup` is in flight ("connecting…")
  - `loaded` — shown when popup snapshot is available ("host connected")
  - `error` — shown when popup snapshot fetch fails ("host unreachable")
- not yet implemented:
  - pick mode active/element selected/locator candidates ready (require extension content-script infrastructure)
  - execution starting/run status updating (require extension/native host infrastructure)

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

## 15. Remaining Limits

- The screen now consumes `ExtensionPopupSnapshot` from `GET /api/phase3/extension-popup` (AdminConsoleSnapshot dependency removed).
- Quick actions are display-only because they require real extension/background/native infrastructure that does not exist in the admin-console template shell.
- Pick mode, locator candidates, `Copy`, and `Use in DSL` remain static demo constructs.
- The screen must continue to be treated as an Edge extension front-end template shell, not as a normal platform management page.
- Popup snapshot data is deterministic mock from the backend when no real extension context exists.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
