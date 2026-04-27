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

### P0-1. Add canonical `runId` handoff from `execution` to `monitor`

- Screens:
  - `execution`
  - `monitor`
- Current gap:
  - `execution` can open `monitor`, but the current handoff does not reliably pass a canonical run identifier.
  - `monitor` therefore cannot bind to a stable runtime instance.
- Current state:
  - `execution` uses screen switching only.
  - `monitor` is still mostly a shell with placeholder runtime data.
- Required contract:
  - app-level selected-run handoff now
  - future typed route payload later
- Required payload:
  - `runId`
  - optional `runName`
  - optional `requestId`
- Future interface dependency:
  - `GET /api/phase3/runs/{runId}/status`
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/runtime-log`
  - `GET /api/phase3/runs/{runId}/live-page`
- Acceptance target:
  - `monitor` always opens against a concrete run instance and stops depending on synthetic placeholder binding.

### P0-2. Replace `monitor` placeholder runtime data with real runtime APIs

- Screens:
  - `monitor`
- Current gap:
  - progress, timeline, runtime logs, and live-page data are synthetic.
- Required interfaces:
  - `GET /api/phase3/runs/{runId}/status`
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/runtime-log`
  - `GET /api/phase3/runs/{runId}/live-page`
  - `POST /api/phase3/runs/{runId}/pause`
  - `POST /api/phase3/runs/{runId}/abort`
- Blocking reason:
  - this screen cannot be treated as a real execution monitor until runtime data leaves demo mode.

### P0-3. Replace `plugin` admin-console snapshot dependency with dedicated popup contract

- Screens:
  - `plugin`
- Current gap:
  - the popup template shell still consumes `AdminConsoleSnapshot`.
- Required contract split:
  - popup read model: `GET /api/phase3/extension-popup`
  - extension/native actions:
    - `EXT_PAGE_SUMMARY_GET` -> `PAGE_SUMMARY_GET`
    - `PAGE_HIGHLIGHT`
    - `EXT_EXECUTION_START` -> `EXECUTION_START`
    - `EXECUTION_STATUS_GET`
- Acceptance target:
  - popup data and popup actions stop pretending to be platform-admin REST behavior.

---

## 3. Priority P1

### P1-1. Complete real `aiGenerate` generation flow

- Screens:
  - `docParse`
  - `aiGenerate`
  - `cases`
- Current gap:
  - `Generate tests`, `Regenerate`, `Dry-run`, and `Save as case` are not backed by real generation and validation services.
- Required interfaces:
  - `POST /api/phase3/agent/generate-case`
  - `POST /api/phase3/cases/dsl/validate`
  - `POST /api/phase3/agent/generate-case/dry-run`
  - `POST /api/phase3/catalog/case`
- Acceptance target:
  - document parse output can become a validated case draft and then persist into the case catalog.

### P1-2. Make report pages read real report artifacts instead of front-end synthesized summaries

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
