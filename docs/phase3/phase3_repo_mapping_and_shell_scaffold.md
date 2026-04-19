# Phase 3 Repo Mapping And Shell Scaffold

## Purpose

This file maps the current repository structure to the documented Phase 3 scope and records the first shell scaffold that makes Phase 3 implementation concrete without pulling in Phase 4 or Phase 5 scope.

## Current Repo Mapping

| Area | Existing Path | Current State | Phase 3 Role |
| --- | --- | --- | --- |
| Core runtime / CLI | `apps/core-platform` | Implemented and active | Keep as execution/report maintenance entry point; do not overload with platform page state |
| Local platform API | `apps/local-admin-api` | Maven module exists, code shell still empty | Backend placeholder/API aggregation point for dashboard, project, case, execution, report, and basic config views |
| Desktop launcher | `apps/desktop-launcher` | Module shell only | Keep out of first Phase 3 slice |
| Native host | `apps/native-host` | Module shell only | Keep as browser/native bridge, not a management surface |
| Shared Java libs | `libs/*` | Core execution/report/browser foundation exists | Reuse later for platform-facing runtime summaries and execution triggers |
| Web admin console | `ui/admin-console` | Empty directory | Phase 3 main platform low-fidelity React + TypeScript skeleton |
| Shared UI assets | `ui/shared-ui` | Empty directory | Shared design tokens and low-fidelity layout primitives |
| Edge plugin UI | `extension/edge-extension` | Empty directory | Phase 3 lightweight popup with current-page summary and runtime status placeholders |

## Phase 3 Page To Module Mapping

| Documented Phase 3 page | Planned owner | First-shell status |
| --- | --- | --- |
| Dashboard | `ui/admin-console` | Scaffolded |
| Project list | `ui/admin-console` | Scaffolded |
| Project detail | `ui/admin-console` | Scaffolded |
| Case list | `ui/admin-console` | Scaffolded |
| Execution start | `ui/admin-console` | Scaffolded |
| Report list | `ui/admin-console` | Scaffolded |
| Model config | `ui/admin-console` | Scaffolded |
| Environment config | `ui/admin-console` | Scaffolded |
| Popup home | `extension/edge-extension` | Scaffolded |
| Current-page summary | `extension/edge-extension` | Scaffolded |
| Current runtime status | `extension/edge-extension` | Scaffolded |

## First Slice Boundaries

- Keep runtime AI advisory only; no direct browser-driving logic is added here.
- Keep admin-console at low-fidelity skeleton level with mock data only.
- Keep plugin limited to assistive summary/status views.
- Do not add document-upload, AI test generation, dataset management, or heavy report drill-down pages in this slice.

## Follow-up Sequence

1. Fill `apps/local-admin-api` with Phase 3 mock contracts and JSON endpoints or equivalent local adapters.
2. Wire `ui/admin-console` from mock data to the local platform API.
3. Add route-level state and execution/report actions with placeholder backend integration.
4. Add the first runtime-AI backend slice only after the platform shell is standing.
