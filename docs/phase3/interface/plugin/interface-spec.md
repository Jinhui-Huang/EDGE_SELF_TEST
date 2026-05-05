# Plugin Interface Specification

## 1. Scope and Design Basis

- Screen: `plugin`
- UI implementation:
  - `ui/admin-console/src/screens/PluginPopupScreen.tsx`
  - `ui/admin-console/src/App.tsx`
  - `extension/edge-extension/popup.html`
  - `extension/edge-extension/popup.js`
  - `extension/edge-extension/background.js`
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
- current real extension/native-message wiring in the popup runtime
- remaining extension/background/native interfaces still required by visible popup controls

## 2. Interface Summary

Current `plugin` screen conclusion:

- current direct read source:
  - `GET /api/phase3/extension-popup` (dedicated popup snapshot)
- current screen props:
  - `apiBaseUrl: string`
  - `title: string`
  - `locale: Locale`
- current direct write source:
  - none
- current extension/native-message actions:
  - popup/background/content-script pick bridge
  - `PAGE_SUMMARY_GET`
  - `PLATFORM_HANDOFF_PREPARE`
  - background `platform-open` action

## 3. Popup Snapshot Contract

### 3.1 Current Input

`PluginPopupScreen.tsx` consumes:

- `apiBaseUrl: string`
- `title: string`
- `locale: Locale`

The screen fetches `GET ${apiBaseUrl}/api/phase3/extension-popup` on mount and renders from `ExtensionPopupSnapshot`:

- `popupSnapshot.page` → current page section (title, URL path, domain)
- `popupSnapshot.runtime` → active run section (mode, queue state, audit state, next action)

### 3.2 Popup Snapshot Endpoint

`GET /api/phase3/extension-popup`

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

### 3.3 Load States

- `loading` — fetch in flight, shows "connecting…"
- `loaded` — popup snapshot available, shows "host connected" and renders page/runtime data
- `error` — fetch failed, shows "host unreachable" with fallback demo values

## 4. Native/Extension Interface Gap

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

The admin-console mirror page still fetches popup snapshot data only, but the real extension popup now wires quick actions through:

- `chrome.runtime.sendMessage(...)` from popup to background
- background/native bridge calls through `sendNativeMessage`
- local background tab-open action for platform handoff

Still missing:

- popup execution-start / runtime event subscriptions for a dedicated long-lived execution channel

## 5. UI Control to Interface Mapping

### 5.1 Quick Actions

#### `Pick element`

- user action: click
- request: popup -> background -> content script (`CS_PICK_ELEMENT_START`)
- owner: `extension/edge-extension/popup.js` + `background.js` + `content-script.js`
- current state: implemented in the real extension popup

#### `Page summary`

- user action: click
- request: popup -> background -> native-host -> `POST /api/phase3/extension/page-summary`
- owner: `extension/edge-extension/popup.js` + `background.js` + native-host + local-admin-api
- current state: implemented in the real extension popup

#### `Quick smoke test`

- user action: click
- request: popup -> background -> native-host -> `SCHEDULER_REQUEST_CREATE`
- owner: `extension/edge-extension/popup.js` + `background.js` + native-host + local-admin-api
- current state: implemented in the real extension popup by reusing the scheduler request chain

#### `Open in platform`

- user action: click
- request:
  - popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff`
  - background -> browser tab open
  - platform App query handoff -> `execution`
- owner: popup/background/native-host/local-admin-api + `ui/admin-console/src/App.tsx`
- current state: implemented in the real extension popup

### 5.2 Pick-Mode Controls

#### Locator candidate row

- user action: review rendered row
- request: none
- owner: popup-local rendered pick result
- current state: implemented as display of real content-script pick result

#### `Copy`

- user action: click
- request: none
- owner: popup-local clipboard path
- current state: implemented in the real extension popup

#### `Use in DSL`

- user action: click
- request:
  - popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff`
  - background -> browser tab open
  - platform App query handoff -> `aiGenerate`
- owner: popup/background/native-host/local-admin-api + `ui/admin-console/src/App.tsx`
- current state: implemented in the real extension popup

## 6. Plugin Interfaces

### 6.1 Popup Snapshot Interface — Implemented

#### `GET /api/phase3/extension-popup`

Purpose:

- provide lightweight popup-state snapshot for web-demo or local popup rendering

Current status:

- implemented in local-admin-api (`Phase3MockDataService.buildExtensionPopupSnapshot()`)
- consumed by `PluginPopupScreen.tsx` on mount
- TypeScript type: `ExtensionPopupSnapshot` in `types.ts`
- Java model: `ExtensionPopupSnapshot.java`

### 6.2 Page Summary Interface

#### Native-host request: `PAGE_SUMMARY_GET`

Purpose:

- ask the background/native-host chain to return a deterministic current-tab page summary

Implemented flow:

- popup -> background:
  - `chrome.runtime.sendMessage({ channel: "native-host", type: "PAGE_SUMMARY_GET", payload })`
- background -> native-host:
  - `sendNativeMessage(...)`
- native-host -> local-admin-api:
  - `POST /api/phase3/extension/page-summary`
- response:
  - page title
  - URL/path/host summary
  - recommended next action

### 6.3 Element Highlight / Pick Interface - Implemented Inside Extension

#### Popup -> background request: `CS_PICK_ELEMENT_START`

Purpose:

- enter real pick mode on the active page without involving native-host or local-admin-api

Flow:

- popup -> background:
  - `chrome.runtime.sendMessage({ channel: "content-script", type: "CS_PICK_ELEMENT_START", payload: {} })`
- background -> active tab content script:
  - `chrome.tabs.sendMessage(tabId, { channel: "content-script", type: "CS_PICK_ELEMENT_START", payload: {} })`
- content script:
  - starts pick mode
  - highlights hover target
  - highlights selected target
  - shapes selected element info and locator candidates
  - clears highlight when pick mode exits

Response body:

```json
{
  "tag": "button",
  "text": "Pay now",
  "id": "pay-submit",
  "name": "payment-submit",
  "recommendedLocator": "#pay-submit",
  "recommendedReason": "Stable explicit id.",
  "locatorCandidates": [
    { "type": "id", "value": "#pay-submit", "score": 0.98, "recommended": true },
    { "type": "name", "value": "[name=\"payment-submit\"]", "score": 0.90, "recommended": false },
    { "type": "css", "value": "form > button.primary", "score": 0.64, "recommended": false }
  ]
}
```

#### Popup -> background request: `CS_PICK_ELEMENT_STOP`

Purpose:

- explicit cleanup path when the popup wants to stop pick mode without selection

### 6.4 Quick Smoke Test Interface

#### Native request reuse: `SCHEDULER_REQUEST_CREATE`

Purpose:

- start a lightweight run from popup context

Background/native flow:

- popup -> background:
  - `chrome.runtime.sendMessage({ channel: "native-host", type: "SCHEDULER_REQUEST_CREATE" })`
- background -> host:
  - native message `SCHEDULER_REQUEST_CREATE`
- host -> local-admin-api:
  - `POST /api/phase3/scheduler/requests`

Request body:

```json
{
  "runId": "popup-checkout-smoke",
  "projectKey": "checkout-web",
  "owner": "edge-popup",
  "environment": "staging-edge",
  "status": "PRE_EXECUTION",
  "title": "popup-checkout-smoke / staging-edge",
  "detail": "Queued from popup | Page: Checkout | URL: https://checkout.example.test/pay"
}
```

Response body:

```json
{
  "status": "ACCEPTED",
  "schedulerId": "local-phase3-scheduler",
  "entry": {
    "runId": "popup-checkout-smoke",
    "status": "PRE_EXECUTION"
  }
}
```

Reason for reuse:

- Quick smoke test is a lightweight scheduler enqueue action, not a separate execution-runtime transport.
- Reusing `SCHEDULER_REQUEST_CREATE` keeps popup/background/native-host/local-admin-api aligned with existing scheduler semantics and avoids inventing a second execution protocol.

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

- popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff`
- local-admin-api returns a deterministic platform URL with query-param context
- background opens the tab
- `ui/admin-console/src/App.tsx` consumes query params and maps them into existing App state
- no complex route system is introduced

## 7. Detailed Implementation Design for Remaining and Recently Wired Controls

### 7.1 `Pick element`

Current implementation type:

- extension-local pick mode plus content-script highlight support

Current implementation design:

1. popup sends `CS_PICK_ELEMENT_START` to background
2. background forwards the request to the active tab content script
3. content script enters pick mode and adds hover highlight
4. page click captures one DOM element, shapes basic info and candidate locators, briefly marks selected highlight, then exits pick mode
5. popup renders selected element card and candidate list
6. popup `Copy` and `Use in DSL` read the recommended locator from this real pick result

### 7.2 `Page summary`

Recommended implementation type:

- extension message into background/content/native chain

Concrete implementation design:

1. popup sends:
   - `PAGE_SUMMARY_GET`
2. native-host forwards:
   - `POST /api/phase3/extension/page-summary`
3. popup renders:
   - summary
   - recommended action

### 7.3 `Quick smoke test`

Recommended implementation type:

- popup-side lightweight scheduler enqueue

Concrete implementation design:

1. popup sends:
   - `SCHEDULER_REQUEST_CREATE` through the existing `native-host` bridge channel
2. background forwards:
   - the same scheduler request envelope to native-host
3. native-host forwards:
   - `POST /api/phase3/scheduler/requests`
4. popup renders deterministic launch result:
   - `pending` / `success` / `error`
   - `runId`
   - queue status
   - next step pointing back to platform execution/monitor for detailed follow-up

### 7.4 `Open in platform`

Recommended implementation type:

- local open/handoff action

Concrete implementation design:

- popup requests:
  - `PLATFORM_HANDOFF_PREPARE` with target `execution`
- background opens returned URL
- platform App consumes query params and pre-fills `launchForm`

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
  - selected project context
- popup requests:
  - `PLATFORM_HANDOFF_PREPARE` with target `aiGenerate`
- background opens returned URL
- platform App maps query params into `aiGenerateFocus`

## 8. Error Handling Boundary

Current implementation:

- popup snapshot fetch failure shows "host unreachable" error state
- loading state shows "connecting…" while fetch is in flight
- successful fetch shows "host connected" with popup data

Recommended future popup errors (when extension/native infrastructure exists):

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

## 10. Remaining Limits

- The popup snapshot contract is implemented and consumed (AdminConsoleSnapshot dependency removed).
- Popup snapshot data is deterministic mock from the backend when no real extension context exists.
- `Page summary`, `Quick smoke test`, `Open in platform`, `Copy`, and `Use in DSL` are now implemented in the real extension popup runtime.
- `Pick element` is now implemented through popup/background/content-script only; it does not involve native-host or local-admin-api DOM collection.
- `Quick smoke test` intentionally reuses the scheduler request interface instead of adding a dedicated popup execution protocol.
- Quick actions should primarily map to extension/background/native interfaces plus extension-specific local-admin-api endpoints, or existing scheduler interfaces when the responsibility already matches, not to normal admin-console REST mutations.
- The screen remains an Edge extension front-end template shell, not a normal platform management page.
