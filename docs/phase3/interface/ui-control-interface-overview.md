# Phase 3 UI Control Interface Overview

## 1. Scope

This file is the final review overview for Phase 3 screen documentation.

It summarizes, by screen:

- buttons
- selects / dropdowns / multi-selects
- clickable row/card controls
- tab controls when they behave like actionable navigation controls

For each control, it records:

- current behavior
- current request or App-level handoff
- future interface design when the control is visible but not yet wired

Conventions used here:

- `App-level handoff` means the current implementation changes screen/context through shared `App.tsx` state, not through a formal router payload.
- `Local only` means front-end local state only, no backend request.
- `Visual only` means visible in UI but not wired today.

---

## 2. Dashboard

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Refresh` | button | Implemented; reuses `GET /api/phase3/admin-console` through the shell-level snapshot reload path | Keep current |
| `New run` | button | Implemented as App-level handoff into `execution`; actual submission remains `POST /api/phase3/scheduler/requests` and `POST /api/phase3/scheduler/events` in `execution` | Keep current |
| Metric cards | clickable cards | Mostly display-only | App-level handoff into related downstream page/filter |
| Recent run row | clickable row | Implemented as App-level handoff into `reportDetail` via canonical `runId` | Keep current lightweight handoff |
| Attention item | clickable row | Implemented as App-level handoff into `reportDetail` / `monitor` / `dataDiff` / `models` depending on target type | Keep current lightweight handoff |
| AI summary / provider chips | clickable chips | Implemented as App-level handoff into `models` | Keep current lightweight handoff |
| Language switch | top-bar control | Local only | Keep local UI state |
| Theme switch | top-bar control | Local only | Keep local UI state |

---

## 3. Projects

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Search input | input | Local filter only | Keep local |
| `Import` | button | Implemented: opens import review flow and uses `POST /api/phase3/catalog/project/import/preview` -> `POST /api/phase3/catalog/project/import/commit` | Keep current deterministic file-backed import flow |
| `New project` | button | Implemented: reuses add-row draft flow, then persists through `POST /api/phase3/catalog/project` on save | Keep current lightweight create flow |
| Project card body | clickable card | Local selection only | Keep local |
| `Open` / `Close` | button | Local expand/collapse only | Keep local |
| `Reports` | button | Implemented as App-level handoff into `reports` with project context | Keep current lightweight handoff |
| `Enter project` | button | Implemented as App-level handoff into `cases` with project context | Keep current lightweight handoff |
| `View reports` | button | Implemented as App-level handoff into `reports` with project context | Keep current lightweight handoff |
| Project field inputs | input group | Local draft only | Persist on save through `POST /api/phase3/catalog/project` |
| `Remove row` | button | Local draft delete | Persist on save through `POST /api/phase3/catalog/project` |
| `Add project row` | button | Local draft add | Persist on save through `POST /api/phase3/catalog/project` |
| `Save project catalog` | button | Implemented; repeated `POST /api/phase3/catalog/project`, then reload `GET /api/phase3/admin-console` | Keep current |

---

## 4. Cases

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Collapse / expand | button | Local only | Keep local |
| Project card button | clickable card | Local project switch only | Keep local |
| `Detail` | button/row action | Local detail open only | Keep local |
| `Edit DSL` | button | Implemented: switches to DSL tab, loads `GET /api/phase3/cases/{caseId}/dsl`, provides validate via `POST .../dsl/validate` and save via `PUT .../dsl` | Keep current |
| `State machine` | button | Implemented: switches to State machine tab, loads `GET /api/phase3/cases/{caseId}/state-machine`, provides save via `PUT .../state-machine` | Keep current |
| `Pre-execution` | button | Implemented as App-level prepared-case handoff only; no backend request here | Actual run requests remain in `execution` via scheduler interfaces |
| `Overview` / `DSL` / `State machine` / `Plans` / `History` tabs | tabs | Implemented: local `activeTab` state drives tab switching; each non-overview tab fetches from `GET /api/phase3/cases/{caseId}/{dsl,state-machine,plans,history}` on activation | Keep current API-backed tab flow |
| `Recent runs` summary bars | display row | Display-only | App-level handoff into `reportDetail` |

---

## 5. DocParse

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Collapse / expand | button | Local only | Keep local |
| Project button | button | Local project switch only | Keep local |
| `Detail` | button | Local document open only | Keep local |
| `Re-parse` | button | Implemented: `POST /api/phase3/documents/{documentId}/reparse`, refreshes parse result on success | Keep current |
| `Manual edit` | button | Implemented: opens JSON editor for detected cases, saves via `PUT /api/phase3/documents/{documentId}/parse-result` | Keep current |
| `Generate tests` | button | Implemented as App-level focus handoff into `aiGenerate` | Keep current handoff until typed routing is introduced |
| `Parse result` / `Raw document` / `Version history` | tabs | Local only | Keep local tab state; content later from dedicated document reads |
| `Upload file` | file input | Implemented: reads file content and uploads via `POST /api/phase3/documents/upload` with projectKey, fileName, and content | Keep current |
| Case row | clickable row | Local case selection only | Keep local |
| Case-name generate button | button | Implemented as App-level focus handoff into `aiGenerate` | Keep current handoff |

---

## 6. AiGenerate

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Generated case tab | tab/button | Local candidate selection only | Keep local after generation payload load |
| `Regenerate` | button | Implemented: `POST /api/phase3/agent/generate-case` with `REGENERATE` mode; replaces all panel content on success, shows error on failure | Keep current |
| `Dry-run` | button | Implemented: validates first via `POST /api/phase3/cases/dsl/validate`, then `POST /api/phase3/agent/generate-case/dry-run`; shows pass/fail with check details | Keep current |
| `Save as case` | button | Implemented: validates first via `POST /api/phase3/cases/dsl/validate`, then `POST /api/phase3/catalog/case`; triggers snapshot reload on success | Keep current |

---

## 7. Execution

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Open Exec Monitor` | button | Implemented: `openMonitor(launchForm.runId)` passes canonical `runId` into `monitor` | Keep current |
| Execution contract hint button | button | Visual only | Local help/contract drawer |
| `Run ID` input | input | Local form state | Included in `POST /api/phase3/scheduler/requests` and `POST /api/phase3/scheduler/events` payloads |
| `Project` select | select | Local form state | Included in scheduler payloads |
| `Owner` input | input | Local form state | Included in scheduler payloads |
| `Environment` input | input | Local form state | Included in scheduler payloads |
| `Target URL` input | input | Local form state | Included in scheduler payloads |
| `Execution model` select | select | Local form state | Included in scheduler payloads |
| `Compare data templates` multi-select | multi-select | Implemented: reads from `GET /api/phase3/data-templates`; falls back to local seeded list when API is unavailable | Keep current |
| `Database connection` select | select | Local form state | Included in scheduler payloads |
| `Detail` textarea | textarea | Local form state | Included in scheduler payloads |
| `Run` | button | Implemented: `POST /api/phase3/scheduler/requests` | Keep current |
| `Execution` | button | Implemented: `POST /api/phase3/scheduler/events` | Keep current |
| Prepared-case card | clickable card | Visual only | App-level handoff back into `cases` |
| Queue row | clickable row | Visual only | App-level handoff into `monitor` or `reportDetail` |
| Review form inputs | inputs | Local form state | Included in audit event payload |
| `Open Audit` | button | Implemented: `POST /api/phase3/scheduler/events` | Keep current |

---

## 8. Monitor

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Pause` | button | Implemented: `POST /api/phase3/runs/{runId}/pause` via `onPauseRun` callback | Keep current |
| `Abort` | button | Implemented: `POST /api/phase3/runs/{runId}/abort` via `onAbortRun` callback | Keep current |
| Step row | clickable row | Display-only; data from `GET /api/phase3/runs/{runId}/steps` | Drill-down drawer |
| Runtime log row | clickable row | Display-only; data from `GET /api/phase3/runs/{runId}/runtime-log` | Drill-down drawer |
| Live page viewport | panel | Display-only; data from `GET /api/phase3/runs/{runId}/live-page` | Screenshot/DOM rendering |

---

## 9. Reports

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Collapse / expand | button | Local only | Keep local |
| Project button | button | Local project switch only | Keep local |
| `Detail` | button | Implemented as App-level selected-run handoff into `reportDetail` with canonical `runId`; list data comes from `GET /api/phase3/runs/` | Keep list page lightweight |
| Timeline item | clickable row | Display-only | App-level handoff into `reportDetail` or `monitor` once target metadata exists |

---

## 10. ReportDetail

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Reports` | breadcrumb/button | Implemented App-level handoff back to `reports` | Keep current |
| `Download artifacts` | button | Implemented: fetches `GET /api/phase3/runs/{runId}/artifacts`, opens artifact listing drawer | Keep current |
| `Re-run` | button | Implemented as App-level handoff into `execution` with run context pre-filled into launch form | Keep current |
| `Overview` tab | tab | Implemented: active by default, shows summary from `GET /api/phase3/runs/{runId}/report` | Keep current |
| `Steps` tab | tab | Implemented: fetches `GET /api/phase3/runs/{runId}/steps` on activation | Keep current |
| `Assertions` tab | tab | Implemented: fetches `GET /api/phase3/runs/{runId}/assertions` on activation | Keep current |
| `Data diff` tab | tab | Implemented as App-level selected-run handoff into `dataDiff` | Keep current |
| `Recovery` tab | tab | Implemented: fetches `GET /api/phase3/runs/{runId}/recovery` on activation | Keep current |
| `AI decisions` tab | tab | Implemented: fetches `GET /api/phase3/runs/{runId}/ai-decisions` on activation | Keep current |

---

## 11. DataDiff

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `View raw JSON` | button | Implemented: fetches `GET /api/phase3/runs/{runId}/data-diff/raw`, opens in-page drawer with before/after/afterRestore tabs showing raw JSON | Keep current |
| `Re-restore` | button | Implemented: posts `POST /api/phase3/runs/{runId}/restore/retry`, shows success/rejected/error status bar, refreshes diff data and restore result on success | Keep current |
| Diff row | display row | Display-only | Backed by `GET /api/phase3/runs/{runId}/data-diff` |

---

## 12. DataTemplates

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Template row | clickable row | Implemented: local selection; detail rendered from list payload (no separate detail GET) | Keep current |
| `Import` | button | Implemented: `POST /api/phase3/data-templates/import/preview` -> `POST /api/phase3/data-templates/import/commit` | Keep current |
| `New template` | button | Implemented: `POST /api/phase3/data-templates` | Keep current |
| `Edit` | button | Implemented: uses locally selected object copy, saves via `PUT /api/phase3/data-templates/{templateId}` | Keep current |
| `Dry-run` | button | Implemented: `POST /api/phase3/data-templates/{templateId}/dry-run` | Keep current |
| `Delete` | button | Implemented: `DELETE /api/phase3/data-templates/{templateId}` | Keep current |

---

## 13. Models

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Add provider` | button | Local draft modal only | Persist later via footer save |
| Provider card | clickable card | Local modal open only | Keep local |
| Provider `Test` | button | Implemented: `POST /api/phase3/config/model/test-connection` | Keep current deterministic backend validation; do not expand to real outbound provider calls in Phase 3 |
| Provider edit icon | button | Local modal open only | Keep local |
| Routing-rule edit icon | button | Visual only | Local routing edit drawer; persist through current model save pipeline |
| Modal `Test connection` | button | Implemented: `POST /api/phase3/config/model/test-connection` | Keep current deterministic backend validation; do not expand to real outbound provider calls in Phase 3 |
| Modal `Delete` | button | Local draft delete only | Persist after footer save |
| Modal `Add provider` / `Update` | button | Local draft update only | Persist after footer save |
| `Save model config` | button | Implemented: repeated `POST /api/phase3/config/model` | Keep current; future typed save could become `PUT /api/phase3/models` |

---

## 14. Environments

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `New database` | button | Opens dialog only | Save in dialog persists immediately |
| Database card | clickable card | Opens edit dialog only | Keep local open behavior |
| Card `Test connection` | button | Implemented: `POST /api/phase3/datasources/test-connection` | Keep current deterministic backend validation; do not expand to real JDBC connectivity in Phase 3 |
| Dialog `Test connection` | button | Implemented: `POST /api/phase3/datasources/test-connection` | Keep current deterministic backend validation; do not expand to real JDBC connectivity in Phase 3 |
| Dialog `Save database` | button | Implemented: repeated `POST /api/phase3/config/environment` | Future typed save could become `PUT /api/phase3/datasources` |
| Dialog `Delete` | button | Implemented: resubmits remaining list through repeated `POST /api/phase3/config/environment` | Keep immediate-persist behavior |

---

## 15. Plugin

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Pick element` | quick action | Implemented in real extension popup: popup -> background -> active-tab content script -> pick result render | Keep current lightweight in-extension flow; do not move DOM collection into native-host or local-admin-api |
| `Page summary` | quick action | Implemented in real extension popup: popup -> background -> native-host -> `POST /api/phase3/extension/page-summary` | Keep current deterministic page-summary flow until content-script collection is introduced |
| `Quick smoke test` | quick action | Implemented in real extension popup: popup -> background -> native-host -> `POST /api/phase3/scheduler/requests`, with deterministic launch result rendered in popup | Reuse `SCHEDULER_REQUEST_CREATE`; do not add a parallel popup execution protocol |
| `Open in platform` | quick action | Implemented in real extension popup: popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff` -> background tab-open -> platform App query handoff into `execution` | Keep lightweight App-level handoff; do not add a complex router |
| Locator candidate row | clickable row | Implemented as rendered real candidate output from content script pick result | Local selected-locator state can be added later if review requires row selection |
| `Copy` | button | Implemented in real extension popup as local clipboard write of the current real recommended locator | Keep local-only |
| `Use in DSL` | button | Implemented in real extension popup: popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff` -> background tab-open -> platform App query handoff into `aiGenerate`, using current real recommended locator | Keep current App-level handoff until a typed cross-surface payload exists |

Plugin-specific data/source note:

- the template shell now reads `ExtensionPopupSnapshot` from `GET /api/phase3/extension-popup` (AdminConsoleSnapshot dependency removed)
- loading/loaded/error states are implemented for popup snapshot fetch
- page and runtime sections render from dedicated popup snapshot data
- real quick actions now live in `extension/edge-extension/popup.html` + `popup.js`; `PluginPopupScreen.tsx` remains an admin-console mirror/demo surface
- quick actions should mainly map to extension/background/native-message interfaces plus extension-specific local-admin-api endpoints, not standard admin-console REST mutations

---

## 16. Immediate Review Focus

The highest-signal unresolved controls across the package are:

- `monitor` step-row and runtime-log drill-down not yet implemented
- `models` and `environments` have switched to real backend validation interfaces, but the validation remains deterministic and non-connective by Phase 3 design
- `plugin` quick actions are now all wired in the real extension popup chain; detailed execution monitoring still belongs to platform execution/monitor rather than the popup

Resolved since last review:

- `plugin` now reads from dedicated `GET /api/phase3/extension-popup` instead of `AdminConsoleSnapshot` (P0-3)
- `plugin` real extension popup now wires `Page summary`, `Open in platform`, `Copy`, and `Use in DSL` through popup/background/native-host/local-admin-api plus platform App-level handoff
- `plugin` real extension popup now wires `Pick element` through popup/background/content-script with real hover/selected highlight and locator-candidate shaping (P0-5)
- `dataTemplates` now has a full backend template registry (P1-3: CRUD, import, dry-run, delete)
- `cases` tabs are now API-backed with DSL edit/validate/save, state-machine read/save, plans read, history read (P2-3)
- `execution -> monitor` now passes canonical `runId` through `openMonitor(launchForm.runId)` (P0-1)
- `monitor` now fetches from 4 runtime APIs (status, steps, runtime-log, live-page) and has Pause/Abort wired (P0-1/P0-2)
