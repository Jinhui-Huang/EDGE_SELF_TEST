# Plugin Interface Specification

## 1. Scope and Design Basis

- Screen: `plugin`
- UI implementation:
  - `ui/admin-console/src/screens/PluginPopupScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Current backend/local API implementation:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/model/ExtensionPopupSnapshot.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Main design references reviewed for this document:
  - `docs/phase3/main/edge_extension_native_messaging_protocol_detailed_design.md`
  - `docs/phase3/main/edge_extension_typescript_protocol_and_code_skeleton.md`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/main/platform_ui_prototype_and_interaction_design_phase3_5.md`

This document distinguishes:

- current front-end template-shell inputs
- current dedicated extension-popup snapshot contract
- current lack of real extension/native-message wiring in the page
- future extension/background/native interfaces required by visible popup controls

## 2. Interface Summary

Current `plugin` screen conclusion:

- current direct read source actually feeding the current screen shell:
  - `GET /api/phase3/admin-console`
- current actual screen prop:
  - `AdminConsoleSnapshot`
- current dedicated popup snapshot interface that exists but is not consumed:
  - `GET /api/phase3/extension-popup`
- current direct write source:
  - none
- current extension/native-message actions:
  - none wired in this page

## 3. Current Screen Input Mismatch

### 3.1 Current Actual Input

`PluginPopupScreen.tsx` currently consumes:

- `snapshot: AdminConsoleSnapshot`
- `title`
- `locale`

The page then uses:

- `snapshot.workQueue[0]` as a loose active-run title source

All other plugin-side data is local demo content.

That `snapshot` is currently sourced from:

- `GET /api/phase3/admin-console`

### 3.2 Dedicated Popup Snapshot That Already Exists

local-admin-api already exposes:

- `GET /api/phase3/extension-popup`

Response model:

```json
{
  "generatedAt": "2026-04-20T04:00:00Z",
  "status": "READY",
  "summary": "Phase 3 popup remains assistive and mirrors local platform queue and report status without owning heavy configuration.",
  "page": {
    "title": "Checkout - Payment",
    "url": "https://staging.example.test/checkout/payment",
    "domain": "staging.example.test",
    "lastUpdatedAt": "2026-04-20T04:00:00Z"
  },
  "runtime": {
    "mode": "Audit-first",
    "queueState": "RUNNING",
    "auditState": "ATTENTION",
    "nextAction": "Review latest run"
  },
  "hints": [
    "Use the platform UI for configuration and report review."
  ]
}
```

### 3.3 Interface Meaning

The page is currently documented as a template shell because the dedicated popup snapshot contract exists, but the screen does not yet consume it.

## 4. Current Native/Extension Interface Gap

### 4.1 What the Design Docs Define

The extension design docs define background/content-script/native-host interaction for:

- `PAGE_SUMMARY_GET`
- `PAGE_HIGHLIGHT`
- `EXECUTION_START`
- `EXECUTION_STOP`
- `EXECUTION_STATUS_GET`
- `ENVIRONMENTS_GET`
- `DATASOURCES_GET`
- run-status event streams

The TypeScript skeleton also defines extension-side messages such as:

- `EXT_PAGE_SUMMARY_GET`
- `EXT_EXECUTION_START`

### 4.2 What the Screen Currently Does

The screen does none of this today.

There are no:

- `chrome.runtime.sendMessage(...)` calls
- background/native bridge calls
- popup snapshot fetches
- run-status event subscriptions

## 5. UI Control to Interface Mapping

### 5.1 Quick Actions

#### `Pick element`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - extension pick-mode and highlight flow
- current state: visual only

#### `Page summary`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - popup -> background -> content script/native request
- current state: visual only

#### `Quick smoke test`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - popup -> background -> host execution request
- current state: visual only

#### `Open in platform`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - local platform handoff/open action
- current state: visual only

### 5.2 Pick-Mode Controls

#### Locator candidate row

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - local selected-locator state
- current state: display only

#### `Copy`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - clipboard write
- current state: visual only

#### `Use in DSL`

- user action: click
- request: none today
- owner: not implemented
- intended future interface:
  - platform handoff or extension-side draft bridge
- current state: visual only

## 6. Recommended Future Plugin Interfaces

### 6.1 Popup Snapshot Interface

#### `GET /api/phase3/extension-popup`

Purpose:

- provide lightweight popup-state snapshot for web-demo or local popup rendering

Current status:

- already implemented in local-admin-api
- not yet consumed by `PluginPopupScreen.tsx`

### 6.2 Page Summary Interface

#### Extension message: `EXT_PAGE_SUMMARY_GET`

Purpose:

- ask the background layer to collect a current-tab page summary

Background flow:

- popup -> background:
  - `EXT_PAGE_SUMMARY_GET`
- background -> content script/native:
  - `PAGE_SUMMARY_GET`
- response:
  - page title
  - visible text summary
  - forms/buttons/structure data

### 6.3 Element Highlight / Pick Interface

#### Native/content interface: `PAGE_HIGHLIGHT`

Purpose:

- highlight one element during pick mode

Request body:

```json
{
  "locator": {
    "by": "css",
    "value": "#pay-submit"
  }
}
```

Related picker result shape:

```json
{
  "candidates": [
    { "by": "id", "value": "pay-submit", "score": 0.95 },
    { "by": "text", "value": "Pay", "score": 0.80 }
  ]
}
```

### 6.4 Quick Smoke Test Interface

#### Extension message: `EXT_EXECUTION_START`

Purpose:

- start a lightweight run from popup context

Background/native flow:

- popup -> background:
  - `EXT_EXECUTION_START`
- background -> host:
  - `EXECUTION_START`

Request body:

```json
{
  "mode": "caseId",
  "caseId": "checkout-smoke",
  "env": "staging"
}
```

Response body:

```json
{
  "runId": "run_001",
  "accepted": true
}
```

### 6.5 Runtime Status Interface

#### Native message: `EXECUTION_STATUS_GET`

Purpose:

- retrieve lightweight status for the active popup run

Response body:

```json
{
  "runId": "run_001",
  "status": "RUNNING",
  "currentStep": "step_003",
  "progress": 0.6
}
```

### 6.6 Environment and Datasource Lookup Interfaces

#### Native messages

- `ENVIRONMENTS_GET`
- `DATASOURCES_GET`

Purpose:

- expose lightweight environment/datasource choices to extension-side execution entry

### 6.7 Open-in-Platform Handoff

Recommended implementation type:

- local platform URL or app handoff with popup context

Concrete implementation design:

- popup action opens the full platform with query/route context such as:
  - current URL
  - selected run id
  - selected locator
  - current page summary reference

No dedicated backend write is required for the open action itself.

## 7. Detailed Implementation Design for Currently Unwired Controls

### 7.1 `Pick element`

Recommended implementation type:

- extension-local pick mode plus content-script highlight support

Concrete implementation design:

1. popup action enters pick mode in extension UI
2. background instructs content script to highlight hovered element
3. selected element returns locator candidates
4. popup updates selected-element card and locator list

### 7.2 `Page summary`

Recommended implementation type:

- extension message into background/content/native chain

Concrete implementation design:

1. popup sends:
   - `EXT_PAGE_SUMMARY_GET`
2. background collects current-tab summary
3. popup renders:
   - title
   - path
   - recognized forms/buttons

### 7.3 `Quick smoke test`

Recommended implementation type:

- popup-side lightweight execution start

Concrete implementation design:

1. popup sends:
   - `EXT_EXECUTION_START`
2. background forwards:
   - `EXECUTION_START`
3. popup subscribes to runtime updates:
   - `RUN_STATUS_EVENT`
   - `RUN_FINISHED_EVENT`
4. active-run card updates in place

### 7.4 `Open in platform`

Recommended implementation type:

- local open/handoff action

Concrete implementation design:

- popup opens platform UI with current popup context
- platform handles heavy tasks:
  - config
  - full report review
  - detailed logs

### 7.5 `Copy`

Recommended implementation type:

- local clipboard action

Concrete implementation design:

- copy the currently selected recommended locator string
- no backend or native-host write required

### 7.6 `Use in DSL`

Recommended implementation type:

- handoff into platform-side case or generation flow

Concrete implementation design:

- popup packages:
  - selected locator
  - page context
  - optional case/run context
- platform receives this as a draft insertion payload for later DSL editing or AI generation review

## 8. Error Handling Boundary

Current implementation:

- there are no real plugin-side requests in the page

Recommended future popup errors:

- host disconnected
- extension context unavailable
- page summary timeout
- unsupported extension message
- execution start rejected

These align with the extension/native-message design docs.

## 9. Relationship to Other Interfaces

### 9.1 Relationship to Extension Popup Snapshot

- popup snapshot should remain lightweight and assistive
- it should not become a duplicate of the admin-console snapshot

### 9.2 Relationship to Admin Console

- plugin should hand off into the platform for heavy workflows
- platform remains the source of truth for config, report, and deep execution review

### 9.3 Relationship to Native Messaging

- background/service worker should own native-port communication
- popup should not own heavy protocol logic directly

## 10. Review Items

Review-only findings:

- The current page is correctly classified as an Edge extension front-end template shell.
- The screen currently uses the wrong data contract for that role: `AdminConsoleSnapshot` instead of `ExtensionPopupSnapshot`.
- The dedicated local-admin-api popup endpoint already exists and should become the first real data source when this template is wired.
- Quick actions and pick-mode controls should primarily map to extension/background/native interfaces, not to normal admin-console REST mutations.

These are documentation findings only. No implementation change is made in this stage.
