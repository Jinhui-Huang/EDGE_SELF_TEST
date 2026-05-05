# Plugin Functional Specification

## 1. Document Position

- Screen name: `plugin`
- Front-end implementation: `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- Real extension popup runtime:
  - `extension/edge-extension/popup.html`
  - `extension/edge-extension/popup.js`
  - `extension/edge-extension/background.js`
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
- The admin-console `plugin` screen remains a mirror/demo shell.
- The real extension popup now wires these actions in `extension/edge-extension/popup.js`:
  - `Pick element`
  - `Quick smoke test`
  - `Page summary`
  - `Open in platform`
  - `Copy`
  - `Use in DSL`
- Pick mode is now implemented through popup -> background -> content script.
- Locator candidate rendering is now populated by the real content-script pick result.
- `Quick smoke test` now reuses the existing popup launch form context and submits a real scheduler request through popup -> background -> native-host -> local-admin-api.

This matters for review:

- the current page is an extension-front-end template shell
- it is connected to the dedicated extension-popup snapshot contract
- it now uses both extension/background/content-script and extension/background/native-message actions, depending on the quick action

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

- admin-console mirror: display-only
- real extension popup:
  - `Pick element` requests pick mode through popup -> background -> content script, then renders selected element info and locator candidates
  - `Quick smoke test` submits a lightweight pre-execution scheduler request from current page context and renders deterministic launch state/result
  - `Page summary` requests deterministic page summary through popup -> background -> native-host -> local-admin-api
  - `Open in platform` requests a platform handoff URL through the same chain, then background opens the platform tab

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

- real extension popup enters page pick mode through popup -> background -> content script
- content script highlights hovered and selected elements, then returns selected element summary plus locator candidates
- popup renders tag / text / id / name, candidate locators, recommended locator, and recommendation reason
- `Copy` writes the current real recommended locator to the popup-local clipboard
- `Use in DSL` prepares a platform handoff into `aiGenerate` using the current real recommended locator

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

### 8.2 Screen Outputs

The current implementation produces:

- `GET /api/phase3/extension-popup` read request on mount
- extension-message quick actions:
  - content-script pick request through popup -> background -> content script
  - `PAGE_SUMMARY_GET`
  - `PLATFORM_HANDOFF_PREPARE`
- platform handoff output through background tab-open

The current popup runtime also produces:

- pick-mode result payload with:
  - selected element summary
  - locator candidate list
  - recommended locator
- locator copy
- locator DSL handoff

Its still-future outputs are:

- lightweight execution start
- runtime event subscription for popup-side execution

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
  - `Pick element`
  - `Quick smoke test`
  - `Page summary`
  - `Open in platform`
  - `Copy`
  - `Use in DSL`

## 10. Functional Control Responsibility Matrix

### 10.1 Quick Actions

- `Pick element`
  - function: enter extension pick mode and capture one page element
  - output type: popup -> background -> content script pick request
  - current implementation: implemented in real extension popup
- `Page summary`
  - function: fetch structured summary of the current page
  - output type: extension/background/native request
  - current implementation: implemented in real extension popup
- `Quick smoke test`
  - function: launch a lightweight run from current page context
  - output type: popup -> background -> native-host -> scheduler request write
  - current implementation: implemented in real extension popup by reusing `SCHEDULER_REQUEST_CREATE`
- `Open in platform`
  - function: hand off current popup context into the full platform
  - output type: platform-open action after native-host handoff preparation
  - current implementation: implemented in real extension popup

### 10.2 Pick-Mode Controls

- locator row
  - function: inspect one candidate locator
  - output type: popup-local rendered pick result
  - current implementation: implemented as real candidate rendering from content script result
- `Copy`
  - function: copy selected locator into clipboard
  - output type: local clipboard action
  - current implementation: implemented in real extension popup
- `Use in DSL`
  - function: insert or hand off locator into DSL-authoring/generation flow
  - output type: platform handoff into `aiGenerate`
  - current implementation: implemented in real extension popup

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
  - pick mode active -> pending quick-action status while waiting for page click
  - element selected -> selected element card updates from content script result
  - locator candidates ready -> candidate list and recommended locator rendered in popup
  - quick-action pending/success/error feedback for page summary and platform handoff
- not yet implemented:
  - quick smoke execution starting/run status updating (require extension/native host execution flow)

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
- The admin-console `plugin` screen remains a mirror/demo shell; the real quick actions now live in `extension/edge-extension/popup.html` + `popup.js`.
- `Pick element`, `Quick smoke test`, `Page summary`, `Open in platform`, `Copy`, and `Use in DSL` are now implemented in the real extension popup chain.
- Real pick mode stays fully inside the extension boundary:
  - popup triggers
  - background bridges
  - content script collects DOM data and handles highlight
- native-host and local-admin-api do not collect DOM for this flow.
- `Quick smoke test` reuses the scheduler request chain instead of introducing a separate popup execution protocol.
- `Use in DSL` currently hands off into `aiGenerate`, not directly into the `cases` DSL editor.
- The screen must continue to be treated as an Edge extension front-end template shell, not as a normal platform management page.
- Popup snapshot data is deterministic mock from the backend when no real extension context exists.

## 16. Suggested Output Files for This Screen Folder

This folder should keep:

- `functional-spec.md`
- `interface-spec.md`
