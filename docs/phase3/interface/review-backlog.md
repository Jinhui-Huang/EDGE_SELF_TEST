# Phase 3 Interface Review Backlog

## 1. Scope

This file converts the generated screen documents into an implementation-ready review backlog.

It only tracks:

- current UI-to-interface gaps
- missing backend interfaces
- missing cross-screen handoff contracts
- controls that are visible but still visual-only

It does not authorize UI or backend changes in the current phase.

---

## 2. Priority P0

### P0-1. Add canonical `runId` handoff from `execution` to `monitor` — DONE

- Screens:
  - `execution`
  - `monitor`
- Resolved:
  - `execution` calls `openMonitor(launchForm.runId)` which sets `selectedMonitorRunId` and navigates to `monitor`
  - `monitor` receives `selectedRunId` as a prop and fetches 4 runtime APIs for that run
  - idle state shown when no `runId` is provided (e.g., direct sidebar navigation)
  - dashboard attention items also pass `runId` through the same `openMonitor()` path
- Test coverage:
  - execution → monitor runId handoff test
  - monitor idle state when no runId is provided

### P0-2. Replace `monitor` placeholder runtime data with real runtime APIs — DONE

- Screens:
  - `monitor`
- Resolved:
  - 4 read APIs implemented: `GET .../status`, `GET .../steps`, `GET .../runtime-log`, `GET .../live-page`
  - 2 control APIs implemented: `POST .../pause`, `POST .../abort`
  - Pause/Abort show pending/success/error feedback, refresh runtime data on success
  - idle/loading/error/loaded states fully implemented
- Remaining limits:
  - runtime data is deterministic mock from backend when no real run artifacts exist
  - Pause/Abort record intent only, no real execution-control workflow in Phase 3
  - live page shows structured data only, no real screenshot

### P0-7. Monitor Drill-Down Panels — DONE

- Screens:
  - `monitor`
- Surfaces:
  - `ui/admin-console/src/screens/MonitorScreen.tsx`
- Resolved:
  - step rows are now clickable and open a local detail panel
  - runtime log rows are now clickable and open a local detail panel
  - the implementation reuses the existing runtime payloads only:
    - `GET /api/phase3/runs/{runId}/steps`
    - `GET /api/phase3/runs/{runId}/runtime-log`
  - switching `runId` clears the old selected drill-down state
  - idle / loading / error / no-data states do not expose stale detail panels
- Boundary decisions:
  - no new backend interface was added
  - no run/report/scheduler protocol semantics changed
  - no new route or sub-page was added
  - `monitor` remains a runtime observation page, not an editing or orchestration page
- Remaining limits:
  - runtime data is still deterministic mock when no real run artifacts exist
  - live page remains structured-data only; no real screenshot or DOM summary is rendered
- Test coverage:
  - click step row opens detail
  - click runtime log row opens detail
  - `runId` change resets selected detail
  - no-data and error states do not expose drill-down

### P0-3. Replace `plugin` admin-console snapshot dependency with dedicated popup contract — DONE

- Screens:
  - `plugin`
- Resolved:
  - `PluginPopupScreen.tsx` consumes `ExtensionPopupSnapshot` from `GET /api/phase3/extension-popup`
  - Props changed from `snapshot: AdminConsoleSnapshot` to `apiBaseUrl: string` (screen fetches its own data)
  - loading/loaded/error states implemented for popup snapshot fetch
  - page and runtime sections render from dedicated popup snapshot data
  - `App.tsx` passes `apiBaseUrl` instead of `snapshot` to plugin screen
- Remaining limits:
  - popup snapshot data is deterministic mock from backend when no real extension context exists
  - at the admin-console mirror layer, quick actions still remain visual-only
  - pick mode and locator-candidate capture still remain static demo constructs until real extension content-script support is added
- Test coverage:
  - popup loads from dedicated extension-popup endpoint, not admin-console
  - popup error state when extension-popup endpoint fails

### P0-4. Wire plugin quick actions through popup/background/native-host/platform handoff — DONE

- Surfaces:
  - `extension/edge-extension/popup.html`
  - `extension/edge-extension/popup.js`
  - `extension/edge-extension/background.js`
  - `ui/admin-console/src/App.tsx`
- Resolved:
  - `Page summary` now uses popup -> background -> native-host -> `POST /api/phase3/extension/page-summary`
  - `Open in platform` now uses popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff` -> background tab-open -> platform App query handoff into `execution`
  - `Copy` now writes the recommended locator through the popup-local clipboard path
  - `Use in DSL` now uses popup -> background -> native-host -> `POST /api/phase3/extension/platform-handoff` -> background tab-open -> platform App query handoff into `aiGenerate`
  - platform handoff stays App-level only; `App.tsx` consumes lightweight query params and maps them into existing `launchForm` or `aiGenerateFocus` state
- New extension-specific interfaces:
  - `POST /api/phase3/extension/page-summary`
  - `POST /api/phase3/extension/platform-handoff`
- Remaining limits:
  - `Pick element` was still visual-only at the end of P0-4 and was completed later in P0-5
  - `Quick smoke test` was still visual-only at the end of P0-5 and is completed later in P0-6 by reusing the scheduler request chain
  - `Page summary` remains deterministic from popup tab context plus local rules; no real DOM/content-script extraction exists yet
  - `Use in DSL` currently hands off into `aiGenerate`, not directly into the `cases` DSL editor
- Test coverage:
  - popup quick-action tests for page summary, platform handoff, clipboard copy, and DSL handoff
  - native-host message dispatch tests for page-summary and platform-handoff message types
  - local-admin-api tests for extension quick-action endpoints
  - admin-console App tests for execution and AI-generate query handoff consumption

### P0-5. Plugin Pick Element Real Chain — DONE

- Surfaces:
  - `extension/edge-extension/popup.html`
  - `extension/edge-extension/popup.js`
  - `extension/edge-extension/background.js`
  - `extension/edge-extension/content-script.js`
- Resolved:
  - `Pick element` now uses popup -> background -> active-tab content script
  - content script enters real pick mode, highlights hovered element, captures selected element on click, shapes basic element info plus locator candidates, and clears highlight on exit
  - popup now renders:
    - `tag`
    - `text`
    - `id`
    - `name`
    - candidate locator list
    - recommended locator and recommendation reason
  - `Copy` now uses the current real recommended locator from pick result
  - `Use in DSL` now uses the current real recommended locator from pick result and keeps the existing `PLATFORM_HANDOFF_PREPARE` chain
  - native-host and local-admin-api remain out of DOM collection for this flow
- New extension-local messages:
  - popup/background:
    - `channel: "content-script"`
    - `type: "CS_PICK_ELEMENT_START"`
    - `type: "CS_PICK_ELEMENT_STOP"`
- Remaining limits:
  - locator row selection is not yet an interactive local state; popup renders the content-script recommendation directly
  - popup mirror screen in `ui/admin-console` remains a demo surface; the real implementation lives in `extension/edge-extension`
- Test coverage:
  - popup tests for pick trigger, result render, and Copy/Use-in-DSL using real locator
  - background forwarding test for popup -> content script
  - content-script tests for pick-result shaping and highlight cleanup

### P0-6. Plugin Quick Smoke Test Real Chain 窶・DONE

- Surfaces:
  - `extension/edge-extension/popup.html`
  - `extension/edge-extension/popup.js`
  - `extension/edge-extension/background.js`
- Resolved:
  - `Quick smoke test` now uses the real extension popup chain instead of a visual-only placeholder
  - popup reads current page context plus the existing launch-form `runId`, `projectKey`, `owner`, `environment`, and `detail`
  - popup sends `channel: "native-host"` + `type: "SCHEDULER_REQUEST_CREATE"`
  - background forwards the scheduler request unchanged to native-host
  - native-host forwards the request to local-admin-api `POST /api/phase3/scheduler/requests`
  - popup renders deterministic `pending` / `success` / `error` plus `runId`, queue status, and next step
  - detailed execution follow-up remains in platform execution/monitor instead of being expanded inside popup
- Boundary decisions:
  - no new popup-specific execution protocol was added
  - existing scheduler request semantics were reused as-is
  - no `report` or `run` protocol semantics changed
  - no complex platform router was introduced
- Remaining limits:
  - locator row selection is not yet an interactive local state; popup renders the content-script recommendation directly
  - popup mirror screen in `ui/admin-console` remains a demo surface; the real implementation lives in `extension/edge-extension`
- Test coverage:
  - popup tests for quick smoke trigger, `pending` / `success` / `error`, and launch-result rendering
  - background test for popup/native-host forwarding of `SCHEDULER_REQUEST_CREATE`

---

## 3. Priority P1

### P1-1. Complete real `aiGenerate` generation flow — DONE

- Screens:
  - `docParse`
  - `aiGenerate`
  - `cases`
- Resolved:
  - 4 endpoints implemented: `POST /api/phase3/agent/generate-case`, `POST /api/phase3/cases/dsl/validate`, `POST /api/phase3/agent/generate-case/dry-run`, `POST /api/phase3/catalog/case`
  - `docParse` passes stable focus payload to `aiGenerate` via `openAiGenerateFromDocParse(focus)` in `App.tsx`
  - `aiGenerate` auto-generates on mount when focus exists; replaces all panels with API data when genResult populated
  - Validate-first pattern: both Dry-run and Save validate DSL before their second request
  - Save reuses existing `POST /api/phase3/catalog/case` persistence; triggers snapshot reload on success
  - Four mutation states (`generateState`, `validateState`, `dryRunState`, `saveState`) each with idle/pending/success/error
  - API data clearly separated from local fallback via `genResult?.xxx ?? fallback` pattern
- Remaining limits:
  - backend returns deterministic mock data, not real AI agent output
  - candidate tab switch is local-only; backend returns single selectedDsl per generation
  - no return path from aiGenerate into cases or execution after review
- Test coverage:
  - generate from docParse handoff via real generate endpoint
  - dry-run with validate-first then dry-run endpoint
  - save with validate-first then catalog persistence
  - generation failure visibility

### P1-2. Make report pages read real report artifacts instead of front-end synthesized summaries — DONE

- Screens:
  - `reports`
  - `reportDetail`
  - `dataDiff`
- Current gap:
  - report list and detail content still depend heavily on front-end derived view models.
- Required interfaces:
  - `GET /api/phase3/runs`
  - `GET /api/phase3/runs/{runId}/report-summary`
  - `GET /api/phase3/runs/{runId}/report`
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/assertions`
  - `GET /api/phase3/runs/{runId}/recovery`
  - `GET /api/phase3/runs/{runId}/ai-decisions`
  - `GET /api/phase3/runs/{runId}/artifacts`
  - `GET /api/phase3/runs/{runId}/data-diff`
  - `GET /api/phase3/runs/{runId}/data-diff/raw`
  - `GET /api/phase3/runs/{runId}/restore-result`
  - `POST /api/phase3/runs/{runId}/restore/retry`
- Acceptance target:
  - list, detail, and diff views all consume a consistent run/report contract anchored on canonical `runId`.

### P1-3. Add real data-template registry for `execution` and `dataTemplates` — DONE

- Screens:
  - `execution`
  - `dataTemplates`
- Resolved:
  - backend file-backed template registry implemented (`DataTemplatePersistenceService`, `config/phase3/data-templates.json`)
  - all 7 endpoints implemented: list, detail, create, update, delete, import preview/commit, dry-run
  - both `execution` and `dataTemplates` read from `GET /api/phase3/data-templates`
  - local seeded constants kept only as fallback when API is unavailable
- Remaining limits:
  - file-backed persistence, not a real database
  - dry-run is deterministic validation only
  - template versioning not yet implemented

### P1-4. Convert local-only connection tests into real validation interfaces

- Screens:
  - `models`
  - `environments`
- Current gap:
  - model-provider test and datasource test are still local field-presence checks.
- Required interfaces:
  - `POST /api/phase3/config/model/test-connection`
  - `POST /api/phase3/datasources/test-connection`
- Acceptance target:
  - connection-test buttons return real backend validation outcomes before save.

---

## 4. Priority P2

### P2-1. Complete `dashboard` control wiring

- Screens:
  - `dashboard`
- Current gap:
  - `Refresh`, `New run`, recent-run rows, attention items, and AI provider chips are visible but not fully wired.
- Required behavior:
  - `Refresh` -> reuse `GET /api/phase3/admin-console`
  - `New run` -> app-level handoff into `execution`
  - recent-run row -> app-level selected-run handoff into `reportDetail`
  - attention item -> app-level handoff into target screen
  - AI chips -> app-level handoff into `models`
- Acceptance target:
  - dashboard becomes a real navigation hub rather than a passive overview screen.

### P2-2. Complete `projects` import and navigation actions

- Screens:
  - `projects`
- Current gap:
  - `Import`, `New project`, `Enter project`, and `View reports` are not fully wired.
- Required interfaces:
  - `POST /api/phase3/catalog/project/import/preview`
  - `POST /api/phase3/catalog/project/import/commit`
- Required behavior:
  - `New project` should reuse add-row draft flow then persist through `POST /api/phase3/catalog/project`
  - `Enter project` should hand off into `cases`
  - `View reports` should hand off into `reports`

### P2-3. Complete `cases` editor-side read/write interfaces

- Screens:
  - `cases`
- Current gap:
  - `Edit DSL`, `State machine`, plans/history tabs, and case-detail reads remain incomplete.
- Required interfaces:
  - `GET /api/phase3/cases/{caseId}/dsl`
  - `POST /api/phase3/cases/{caseId}/dsl/validate`
  - `PUT /api/phase3/cases/{caseId}/dsl`
  - `GET /api/phase3/cases/{caseId}/state-machine`
  - `PUT /api/phase3/cases/{caseId}/state-machine`
  - `GET /api/phase3/cases/{caseId}/plans`
  - `GET /api/phase3/cases/{caseId}/history`

### P2-4. Complete `docParse` document-service actions

- Screens:
  - `docParse`
- Current gap:
  - upload, re-parse, and manual edit are still placeholder actions.
- Required interfaces:
  - `POST /api/phase3/documents/upload`
  - `POST /api/phase3/documents/{documentId}/reparse`
  - `PUT /api/phase3/documents/{documentId}/parse-result`

---

## 5. Dependency Notes

- `dashboard`, `reports`, `reportDetail`, `dataDiff`, and `monitor` should converge on one canonical run identifier model.
- `docParse` -> `aiGenerate` -> `cases` must share a stable generated-case draft contract.
- `execution`, `dataTemplates`, and `environments` should converge on the same datasource/template vocabulary.
- `plugin` should remain documented as an Edge extension front-end shell, not as a platform business-management page.

---

## 6. Suggested Implementation Order

1. Runtime chain:
   - `execution` handoff
   - `monitor` runtime APIs
   - run/report canonical identifier cleanup
2. Report chain:
   - `reports`
   - `reportDetail`
   - `dataDiff`
3. AI generation chain:
   - `docParse`
   - `aiGenerate`
   - `cases`
4. Data/config chain:
   - `dataTemplates`
   - `models`
   - `environments`
5. Navigation and shell hardening:
   - `dashboard`
   - `projects`
   - `plugin`

---

## 7. Review Reminder

- The current phase remains documentation-only.
- Any approved next implementation phase should use this backlog together with:
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - each screen folder's `functional-spec.md`
  - each screen folder's `interface-spec.md`
