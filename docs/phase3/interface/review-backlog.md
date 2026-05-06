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

### P1-4. Convert local-only connection tests into real validation interfaces DONE

- Screens:
  - `models`
  - `environments`
- Resolved:
  - `POST /api/phase3/config/model/test-connection` is implemented in `local-admin-api`
  - `POST /api/phase3/datasources/test-connection` is implemented in `local-admin-api`
  - `models` and `environments` now call those backend validation interfaces instead of local-only field-presence checks
  - UI shows explicit `pending` / `success` / `warning` / `error` feedback from the backend validation result shape
  - save actions remain separate from test-connection actions; backend validation failure no longer falls back to synthetic local validation output
- Remaining limits:
  - validation remains deterministic only by Phase 3 design
  - no real outbound provider connectivity and no real JDBC connectivity are attempted

### P1-5. Models routing-rule local edit flow 窶・DONE

- Screens:
  - `models`
- Resolved:
  - `ModelConfigScreen.tsx` now wires the routing-rule edit icon to a local routing-rule editor
  - the editor supports:
    - `task`
    - `primary`
    - `fallback` list
    - `reason`
  - editor `Apply` updates the current front-end `modelRoutingRules` draft only
  - editor `Cancel` closes without mutating the parent draft
  - footer `Save model config` still persists the edited routing rules through repeated `POST /api/phase3/config/model`
- Boundary decisions:
  - no new backend endpoint was added
  - no provider connection-test semantics changed
  - routing-rule editing remains local to the current screen state until footer save
- Remaining limits:
  - routing-rule editing is still single-rule local modal state, not a broader rule orchestration surface
  - persistence still uses generic config-item storage rather than a typed models API
- Test coverage:
  - click routing-rule edit icon opens the editor
  - apply writes edited fields back to local draft
  - cancel closes without mutating the parent draft
  - save still uses the existing model-config persistence chain

### P1-6. Execution contract hint local drawer — DONE

- Screens:
  - `execution`
- Surfaces:
  - `ui/admin-console/src/screens/ExecutionScreen.tsx`
- Resolved:
  - the header execution contract hint button now opens a local execution-contract help panel instead of remaining visual-only
  - the panel stays inside the current `execution` screen; no new route was added
  - the panel documents the current screen contract only:
    - `Run ID`
    - `Project`
    - `Owner`
    - `Environment`
    - `Target URL`
    - `Execution model`
    - `Compare data templates`
    - `Database connection`
    - `Run -> POST /api/phase3/scheduler/requests`
    - `Execution / Open Audit -> POST /api/phase3/scheduler/events`
    - prepared-case / queue / monitor handoff boundaries
  - close action is implemented and does not change existing launch/review form semantics
- Boundary decisions:
  - no backend endpoint was added
  - no scheduler request or event semantic was changed
  - no new route or protocol-management page was introduced
  - `execution` remains a run-preparation and submission page
- Remaining limits:
  - the panel is descriptive only; it does not edit protocol payloads
  - queue rows and prepared-case cards are still display-only
- Test coverage:
  - click hint button opens help panel
  - click close button closes help panel
  - form fields and existing action buttons remain usable while panel is open
  - empty `runId` and queue/prepared-case variations do not block help-panel behavior

### P1-7. Execution queue row drill-down — DONE

- Screens:
  - `execution`
- Surfaces:
  - `ui/admin-console/src/screens/ExecutionScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Resolved:
  - execution queue rows are now clickable instead of display-only
  - the implementation reuses the existing app-level `monitor` handoff rather than adding a new page or backend detail endpoint
  - queue-row click now emits the current queue `title`
  - `App.tsx` derives the current run identity from the queue-title prefix and calls `openMonitor(runId)`
  - queue rows now expose explicit `aria-label` text for drill-down
- Boundary decisions:
  - no backend endpoint was added
  - no route system or typed router payload was added
  - no scheduler request or event semantic was changed
  - current queue metadata shape was treated as monitor-only drill-down input; no artificial monitor-vs-report branching was introduced
- Remaining limits:
  - queue drill-down currently depends on the queue `title` format because the snapshot queue shape still lacks a dedicated `runId`
  - prepared-case cards were still display-only at the end of P1-7 and are completed later in P1-8
- Test coverage:
  - click queue row triggers the existing handoff
  - empty queue does not expose queue-row interaction
  - Run / Execution / Open Exec Monitor / contract help panel do not regress

### P1-8. Execution prepared-case card drill-down ・DONE

- Screens:
  - `execution`
  - `cases`
- Surfaces:
  - `ui/admin-console/src/screens/ExecutionScreen.tsx`
  - `ui/admin-console/src/screens/CasesScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Resolved:
  - execution prepared-case cards are now clickable instead of display-only
  - the implementation reuses the existing app-level `cases` handoff rather than adding a new page or backend detail endpoint
  - prepared-case click now emits the current `caseId` + `projectKey`
  - `App.tsx` stores the selected cases context and switches back to `cases`
  - `CasesScreen.tsx` now accepts lightweight initial case context and reopens the matching case in the existing detail canvas
  - prepared-case cards now expose explicit `aria-label` text for drill-down
- Boundary decisions:
  - no backend endpoint was added
  - no route system or typed router payload was added
  - no scheduler request or event semantic was changed
  - drill-down reuses the existing cases detail surface only; it does not introduce a prepared-case detail panel
- Remaining limits:
  - the handoff only carries current `projectKey` + `caseId`
  - reopening a prepared case still depends on the case being present in the current app snapshot/draft
- Test coverage:
  - click prepared-case card triggers the existing handoff
  - empty prepared-case list does not expose prepared-case interaction
  - Run / Execution / Open Exec Monitor / contract help panel / queue row drill-down do not regress

---

## 4. Priority P2

### P2-1. Complete `dashboard` control wiring ・DONE

- Screens:
  - `dashboard`
- Surfaces:
  - `ui/admin-console/src/screens/DashboardScreen.tsx`
  - `ui/admin-console/src/App.tsx`
- Resolved:
  - `Refresh` reuses the existing shell snapshot chain:
    - `GET /api/phase3/admin-console`
  - `Refresh` now exposes explicit pending/success/error feedback instead of remaining silent
  - `New run` reuses the existing app-level handoff into `execution`
  - recent-run rows reuse the existing app-level handoff into `reportDetail` via canonical `runId`
  - attention items reuse the existing app-level handoff into `reportDetail` / `monitor` / `dataDiff` / `models`
  - AI provider chips reuse the existing app-level handoff into `models`
- Boundary decisions:
  - no dashboard-specific backend endpoint was added
  - no route system or typed router payload was added
  - no execution / monitor / reportDetail protocol semantic was changed
  - attention items keep the current conservative front-end target mapping derived from snapshot data
- Remaining limits:
  - metric cards remain display-only overview elements
  - attention items are still derived in the front end rather than coming from a dedicated backend attention model
  - dashboard still does not own full first-load loading/empty/error page states
- Test coverage:
  - refresh triggers snapshot re-fetch and shows explicit feedback
  - `New run` opens `execution`
  - recent-run row opens `reportDetail`
  - attention items hand off to their target screens
  - AI provider chips open `models`
  - existing dashboard overview rendering remains intact

### P2-2. Complete `projects` import and navigation actions DONE

- Screens:
  - `projects`
- Resolved:
  - `Import` now uses the real deterministic preview/commit chain:
    - `POST /api/phase3/catalog/project/import/preview`
    - `POST /api/phase3/catalog/project/import/commit`
  - the screen shows explicit `pending` / `success` / `error` feedback through the shared mutation-status surface
  - `New project` reuses the current add-row draft flow and persists through the existing `POST /api/phase3/catalog/project` save path
  - `Enter project` reuses the existing App-level handoff into `cases` with current `projectKey`
  - `View reports` and card `Reports` reuse the existing App-level handoff into `reports` with current `projectKey`
- Boundary decisions:
  - no new route system was added
  - no new projects-specific route payload was added
  - no new project-detail protocol was introduced
  - no cases/reports handoff semantic was changed
- Remaining limits:
  - the current import UI is deterministic JSON review only; it does not introduce CSV parsing or a multi-step wizard
  - the project-card summary remains a front-end composed view model rather than a typed backend project-summary contract
- Test coverage:
  - import preview + commit happy path
  - import preview error feedback
  - new project row add + save
  - enter project -> cases handoff
  - reports/view reports -> reports handoff
  - existing project catalog save/list rendering non-regression

### P2-3. Complete `cases` editor-side read/write interfaces DONE

- Screens:
  - `cases`
- Resolved:
  - backend-backed case-detail interfaces are implemented and consumed by `CasesScreen`:
    - `GET /api/phase3/cases/{caseId}/dsl`
    - `POST /api/phase3/cases/{caseId}/dsl/validate`
    - `PUT /api/phase3/cases/{caseId}/dsl`
    - `GET /api/phase3/cases/{caseId}/state-machine`
    - `PUT /api/phase3/cases/{caseId}/state-machine`
    - `GET /api/phase3/cases/{caseId}/plans`
    - `GET /api/phase3/cases/{caseId}/history`
  - `Edit DSL` and `State machine` hero actions now switch to the corresponding backend-backed tabs
  - all detail tabs are now functional with explicit loading / empty / error surfacing
  - DSL validate/save and state-machine save now expose explicit mutation feedback
  - changing the opened case resets the active tab to `overview` and clears stale tab-specific detail state
  - History tab run rows now reuse the existing App-level handoff into `reportDetail`
- Remaining limits:
  - sidebar info/plans/recent-run panels are still presentational snapshot-derived display
  - app-level case catalog save already exists, but the visible `cases` screen still does not expose an editable catalog form
  - history run-row handoff currently depends on `runName` because the case-history payload still has no dedicated canonical `runId`
  - plans and history remain read-only on the current Phase 3 boundary
- Test coverage:
  - backend case-detail endpoint coverage in `LocalAdminApiServerTest`
  - frontend `CasesScreen` coverage for DSL load/validate/save, plans/history state surfacing, history run-row handoff, state-machine save feedback, and case-switch reset behavior

### P2-4. Complete `docParse` document-service actions DONE

- Screens:
  - `docParse`
- Resolved:
  - write actions are implemented:
    - `POST /api/phase3/documents/upload`
    - `POST /api/phase3/documents/{documentId}/reparse`
    - `PUT /api/phase3/documents/{documentId}/parse-result`
  - read actions are now implemented and consumed by `DocParseScreen`:
    - `GET /api/phase3/documents/{documentId}/parse-result`
    - `GET /api/phase3/documents/{documentId}/raw`
    - `GET /api/phase3/documents/{documentId}/versions`
  - first open of a document now attempts backend hydration for parse result, raw document, and version history instead of waiting for re-parse/manual-edit refresh only
  - `Raw document` and `Version history` tabs now surface explicit loading / empty / error states
  - backend file-backed document persistence now records simple version-history entries for upload, re-parse, and manual-edit events
- Remaining limits:
  - document catalog is still front-end synthesized from `GET /api/phase3/admin-console`; there is still no canonical `GET /api/phase3/documents` list interface
  - uploaded documents are merged into the current front-end session only; they survive snapshot rebuilds in that session but still disappear after remount / fresh app load because the catalog remains synthetic
  - parse-result detail still keeps synthetic fallback content when no persisted backend document exists, so placeholder shell documents remain reviewable before real upload
  - version history is lightweight audit metadata only; it does not yet store per-version raw-content snapshots or diff payloads

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
