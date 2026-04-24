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
| `Refresh` | button | Intended current read is `GET /api/phase3/admin-console`; currently not bound | Keep reuse of `GET /api/phase3/admin-console` |
| `New run` | button | Visual only | App-level handoff into `execution`; actual submission remains `POST /api/phase3/scheduler/requests` and `POST /api/phase3/scheduler/events` in `execution` |
| Metric cards | clickable cards | Mostly display-only | App-level handoff into related downstream page/filter |
| Recent run row | clickable row | Visual only | App-level handoff into `reportDetail` via selected run |
| Attention item | clickable row | Visual only | App-level handoff into `reportDetail` / `monitor` / `dataDiff` / `models` depending on target type |
| AI summary / provider chips | clickable chips | Visual only | App-level handoff into `models` |
| Language switch | top-bar control | Local only | Keep local UI state |
| Theme switch | top-bar control | Local only | Keep local UI state |

---

## 3. Projects

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Search input | input | Local filter only | Keep local |
| `Import` | button | Visual only | `POST /api/phase3/catalog/project/import/preview` -> `POST /api/phase3/catalog/project/import/commit` |
| `New project` | button | Visual only | Reuse add-row draft flow, then persist through `POST /api/phase3/catalog/project` |
| Project card body | clickable card | Local selection only | Keep local |
| `Open` / `Close` | button | Local expand/collapse only | Keep local |
| `Reports` | button | Visual only | App-level handoff into `reports` |
| `Enter project` | button | Visual only | App-level handoff into `cases` |
| `View reports` | button | Visual only | App-level handoff into `reports` |
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
| `Edit DSL` | button | Visual only | `GET /api/phase3/cases/{caseId}/dsl` + `POST /api/phase3/cases/{caseId}/dsl/validate` + `PUT /api/phase3/cases/{caseId}/dsl` |
| `State machine` | button | Visual only | `GET /api/phase3/cases/{caseId}/state-machine` + `PUT /api/phase3/cases/{caseId}/state-machine` |
| `Pre-execution` | button | Implemented as App-level prepared-case handoff only; no backend request here | Actual run requests remain in `execution` via scheduler interfaces |
| `Overview` / `DSL` / `State machine` / `Plans` / `History` tabs | tabs | Local/visual only today | Back tabs with `GET /api/phase3/cases/{caseId}/dsl`, `.../state-machine`, `.../plans`, `.../history` |
| `Recent runs` summary bars | display row | Display-only | App-level handoff into `reportDetail` |

---

## 5. DocParse

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Collapse / expand | button | Local only | Keep local |
| Project button | button | Local project switch only | Keep local |
| `Detail` | button | Local document open only | Keep local |
| `Re-parse` | button | Visual only | `POST /api/phase3/documents/{documentId}/reparse` |
| `Manual edit` | button | Visual only | `PUT /api/phase3/documents/{documentId}/parse-result` |
| `Generate tests` | button | Implemented as App-level focus handoff into `aiGenerate` | Keep current handoff until typed routing is introduced |
| `Parse result` / `Raw document` / `Version history` | tabs | Local only | Keep local tab state; content later from dedicated document reads |
| `Upload file` | file input | Local filename capture only | `POST /api/phase3/documents/upload` |
| Case row | clickable row | Local case selection only | Keep local |
| Case-name generate button | button | Implemented as App-level focus handoff into `aiGenerate` | Keep current handoff |

---

## 6. AiGenerate

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Generated case tab | tab/button | Local candidate selection only | Keep local after generation payload load |
| `Regenerate` | button | Visual only | `POST /api/phase3/agent/generate-case` |
| `Dry-run` | button | Visual only | `POST /api/phase3/cases/dsl/validate` -> `POST /api/phase3/agent/generate-case/dry-run` |
| `Save as case` | button | Visual only | `POST /api/phase3/cases/dsl/validate` -> `POST /api/phase3/catalog/case` |

---

## 7. Execution

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Open Exec Monitor` | button | Implemented as screen switch only; no `runId` handoff | Should carry explicit `runId` into `monitor` |
| Execution contract hint button | button | Visual only | Local help/contract drawer |
| `Run ID` input | input | Local form state | Included in `POST /api/phase3/scheduler/requests` and `POST /api/phase3/scheduler/events` payloads |
| `Project` select | select | Local form state | Included in scheduler payloads |
| `Owner` input | input | Local form state | Included in scheduler payloads |
| `Environment` input | input | Local form state | Included in scheduler payloads |
| `Target URL` input | input | Local form state | Included in scheduler payloads |
| `Execution model` select | select | Local form state | Included in scheduler payloads |
| `Compare data templates` multi-select | multi-select | Local only; source is front-end seeded `defaultDataTemplates` | Future source: `GET /api/phase3/data-templates` |
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
| `Pause` | button | Visual only | `POST /api/phase3/runs/{runId}/pause` |
| `Abort` | button | Visual only | `POST /api/phase3/runs/{runId}/abort` |
| Step row | clickable row | Display-only | Drill-down on top of `GET /api/phase3/runs/{runId}/steps` |
| Runtime log row | clickable row | Display-only | Drill-down on top of `GET /api/phase3/runs/{runId}/runtime-log` |
| Live page viewport | panel | Display-only | Back with `GET /api/phase3/runs/{runId}/live-page` |

---

## 9. Reports

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Collapse / expand | button | Local only | Keep local |
| Project button | button | Local project switch only | Keep local |
| `Detail` | button | Implemented as App-level selected-run handoff into `reportDetail` | Keep list page lightweight; detail page can later read `GET /api/phase3/runs/{runId}/report` |
| Timeline item | clickable row | Display-only | App-level handoff into `reportDetail` or `monitor` once target metadata exists |

---

## 10. ReportDetail

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `Reports` | breadcrumb/button | Implemented App-level handoff back to `reports` | Keep current |
| `Download artifacts` | button | Visual only | `GET /api/phase3/runs/{runId}/artifacts` |
| `Re-run` | button | Visual only | App-level handoff into `execution` after `GET /api/phase3/runs/{runId}/report-summary` or `.../report` |
| `Overview` tab | tab | Visual only | `GET /api/phase3/runs/{runId}/report` |
| `Steps` tab | tab | Visual only | `GET /api/phase3/runs/{runId}/steps` |
| `Assertions` tab | tab | Visual only | `GET /api/phase3/runs/{runId}/assertions` |
| `Data diff` tab | tab | Implemented as App-level selected-run handoff into `dataDiff` | Keep current |
| `Recovery` tab | tab | Visual only | `GET /api/phase3/runs/{runId}/recovery` |
| `AI decisions` tab | tab | Visual only | `GET /api/phase3/runs/{runId}/ai-decisions` |

---

## 11. DataDiff

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| `View raw JSON` | button | Visual only | `GET /api/phase3/runs/{runId}/data-diff/raw` |
| `Re-restore` | button | Visual only | `POST /api/phase3/runs/{runId}/restore/retry` then refresh `GET /api/phase3/runs/{runId}/restore-result` and `.../data-diff` |
| Diff row | display row | Display-only | Backed by `GET /api/phase3/runs/{runId}/data-diff` |

---

## 12. DataTemplates

| Control | Type | Current behavior / interface | Future interface / design |
|---|---|---|---|
| Template row | clickable row | Local selection only | Optionally load detail through `GET /api/phase3/data-templates/{templateId}` if list becomes summary-only |
| `Import` | button | Visual only | `POST /api/phase3/data-templates/import/preview` -> `POST /api/phase3/data-templates/import/commit` |
| `New template` | button | Visual only | `POST /api/phase3/data-templates` |
| `Edit` | button | Visual only | `GET /api/phase3/data-templates/{templateId}` -> `PUT /api/phase3/data-templates/{templateId}` |
| `Dry-run` | button | Visual only | `POST /api/phase3/data-templates/{templateId}/dry-run` |

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
| `Pick element` | quick action | Visual only | Extension pick-mode + `PAGE_HIGHLIGHT` / locator-candidate capture |
| `Page summary` | quick action | Visual only | `EXT_PAGE_SUMMARY_GET` -> `PAGE_SUMMARY_GET` |
| `Quick smoke test` | quick action | Visual only | `EXT_EXECUTION_START` -> `EXECUTION_START` |
| `Open in platform` | quick action | Visual only | Local platform handoff/open action |
| Locator candidate row | clickable row | Display-only | Local selected-locator state |
| `Copy` | button | Visual only | Local clipboard write |
| `Use in DSL` | button | Visual only | Platform-side draft/DSL handoff |

Plugin-specific data/source note:

- the current template shell still reads `AdminConsoleSnapshot`
- the dedicated popup contract already exists at `GET /api/phase3/extension-popup`
- future quick actions should mainly map to extension/background/native-message interfaces, not standard admin-console REST mutations

---

## 16. Immediate Review Focus

The highest-signal unresolved controls across the package are:

- `execution -> monitor` still lacks explicit `runId` handoff
- `plugin` still has no real popup/native wiring
- `aiGenerate` still lacks real generate / dry-run / save actions
- `monitor` still lacks all live runtime APIs
- `dataTemplates` still lacks a real backend template registry
- `models` and `environments` have switched to real backend validation interfaces, but the validation remains deterministic and non-connective by Phase 3 design
