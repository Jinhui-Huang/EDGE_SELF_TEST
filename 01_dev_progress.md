# 01_dev_progress.md
**项目名称**：企业级网页自动化测试平台  
**用途**：记录最新开发状态，作为开发 AI 和人工开发者的“外部项目记忆”  
**更新要求**：每次开发结束后必须更新，不允许跳过

---

# 1. 当前阶段

## 当前阶段
- 当前阶段：Phase 2：稳定性增强
- 当前阶段目标：在已打通 Java 核心最小闭环的基础上，增强等待、断言、产物采集、报告中心、Network/Console 观测与报告治理能力
- 当前主线任务：继续完善报告中心与产物生命周期治理，同时保持 DSL smoke、HTML/JSON 报告和 CLI/API 清理能力可验证

## 阶段判断说明
- Phase 0 的 Maven 多模块工程、Edge/CDP 启动、基础截图和核心 Java 骨架已完成。
- Phase 1 的 goto/fill/click/wait/assert/screenshot/失败截图/HTML 报告初版已基本打通，并通过 `dsl-smoke` 持续验证。
- Phase 2 稳定性增强：已完成 Console/Network 采集、Network body sidecar、报告索引、报告保留清理、artifact-only pruning、缺失/已裁剪 artifact 元数据标记等能力。
- 正式进入 Phase 3：具体开发文档在docs/phase3里
---

# 2. 当前总体状态

## 已完成
- [x] 阅读项目入口、技术方案、落地文档、Java 骨架文档、CDP 文档、Native Messaging 文档、Edge TS 文档
- [x] 初始化 git 仓库
- [x] 初始化 Maven 多模块目录与根构建配置
- [x] 完成 common-core、common-json、dsl-model、dsl-parser 基础 Java 骨架
- [x] 打通 Edge/CDP 最小运行链路、DSL smoke、基础 DOM 交互、等待、断言、截图、失败截图
- [x] 完成最小 JSON/HTML 报告、报告索引、失败/慢步骤导航、artifact 预览、Console/Network dump、Network body sidecar
- [x] 完成报告保留治理：keep-latest、older-than、status、size quota、artifact-only pruning、缺失/已裁剪 artifact 元数据标记

## 进行中
- [x] Java 核心基础模块代码骨架
- [x] CDP Client 与 Browser Core 接口骨架
- [x] Report Engine 稳定性增强与报告中心维护能力

## 未开始
- [ ] Native Messaging Host
- [ ] Edge 插件 TypeScript 实现
- [ ] DB 断言
- [ ] Agent 辅助层
- [ ] Phase 3 平台化管理能力：项目/用例/套件/环境/数据集/失败重跑（进入前必须暂停，等待用户补充文档并确认）

---

# 3. 已完成模块清单

## Java 核心平台
- 模块名：Maven 多模块工程骨架
  - 状态：已初始化
  - 说明：创建 apps 与 libs 模块，并按 文档建立模块依赖边界；已根据当前开发要求从 Gradle 切换为 Maven
  - 对应文件：`pom.xml`、各模块 `pom.xml`
  - 对应文档：`enterprise_web_test_platform_implementation_design.md`

- 模块名：common-core
  - 状态：基础骨架已完成
  - 说明：提供基础异常、错误码、ID 工具、通用 Result
  - 对应文件：`libs/common-core/src/main/java/com/example/webtest/common/**`
  - 对应文档：`enterprise_web_test_platform_java_core_code_skeleton.md`

- 模块名：common-json
  - 状态：基础实现已完成
  - 说明：提供 `Jsons` 门面，已接入 Jackson JSON/YAML；未知字段忽略，枚举大小写不敏感
  - 对应文件：`libs/common-json/src/main/java/com/example/webtest/json/Jsons.java`
  - 对应文档：`enterprise_web_test_platform_java_core_code_skeleton.md`

- 模块名：dsl-model / dsl-parser
  - 状态：基础骨架已完成
  - 说明：提供 DSL 模型、解析接口和基础校验器
  - 对应文件：`libs/dsl-model/src/main/java/com/example/webtest/dsl/model/**`、`libs/dsl-parser/src/main/java/com/example/webtest/dsl/**`
  - 对应文档：`enterprise_web_test_platform_java_core_code_skeleton.md`

- 模块名：execution-context
  - 状态：基础骨架已完成
  - 说明：提供运行 ID、Session ID 与变量上下文
  - 对应文件：`libs/execution-context/src/main/java/com/example/webtest/execution/context/ExecutionContext.java`
  - 对应文档：`enterprise_web_test_platform_java_core_code_skeleton.md`

- 模块名：browser-core
  - 状态：基础实现已完成，尚未真实联调
  - 说明：提供 Session 管理、Edge 启动、Page target DevTools endpoint 查询、PageController 基础 CDP 调用、截图选项、Console/Network 事件模型
  - 对应文件：`libs/browser-core/src/main/java/com/example/webtest/browser/**`
  - 对应文档：`enterprise_web_test_platform_java_core_code_skeleton.md`、`cdp_domain_encapsulation_detailed_design.md`

- 模块名：apps/core-platform smoke 入口
  - 状态：已添加，尚未运行真实 Edge smoke
  - 说明：提供 `CorePlatformApp`，目标链路为启动 headless Edge、导航 data URL、截图到 `runs/smoke/screenshot.png`
  - 对应文件：`apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
  - 对应文档：`enterprise_web_test_platform_tech_design.md` 附录 A、`enterprise_web_test_platform_java_core_code_skeleton.md` 附录 A

## CDP 域封装
- 域名：Raw CDP Client
  - 状态：基础 WebSocket 传输已完成
  - 已实现命令：`connect`、`close`、同步 `send`、请求 ID、响应等待、超时、CDP error 映射
  - 已监听事件：支持按 `method` 分发事件给已注册 listener
  - 风险：尚未与真实 Edge DevTools endpoint 联调；事件 payload 目前以 Jackson `JsonNode` 透传

## Native Messaging Host
- 模块名：目录占位
  - 状态：未开始
  - 说明：已创建 `apps/native-host` 与 `libs/native-messaging` 模块
  - 对应文件：`apps/native-host/build.gradle.kts`、`libs/native-messaging/build.gradle.kts`

## Edge 插件端
- 模块名：目录占位
  - 状态：未开始
  - 说明：已创建 `extension/edge-extension`
  - 对应文件：`extension/edge-extension/.gitkeep`

---
## 2026-04-18 Phase 3 documentation baseline update

## Task
- Read the newly added Phase 3 documents under `docs/phase3`, update project progress state, and define the next formal development sequence for Phase 3.

## Completed
- Confirmed the previously missing Phase 3 documents are now present and usable:
  - `docs/phase3/ai_runtime_browser_test_interaction_detailed_design.md`
  - `docs/phase3/platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `docs/phase3/platform_and_edge_low_fidelity_wireframes.md`
  - `docs/phase3/react_page_skeleton_prompt_guide.md`
- Updated the project status from “Phase 3 blocked on missing documents” to “Phase 3 ready to start”.
- Consolidated the Phase 3 backend/runtime implementation baseline:
  - Runtime AI stays advisory; the deterministic executor remains the sole action executor.
  - Runtime AI tasks are constrained to state recognition, branch decision, locator repair, and failure analysis.
  - Runtime decisions must be auditable with input summary, output summary, acceptance state, and result trace.
  - Dynamic repair is bounded and cannot modify test intent, core assertions, data prep/restore, or environment policy.
  - The first runtime slice should implement rule-first state recognition, AI-assisted state recognition, AI-assisted locator repair, and runtime snapshots.
- Consolidated the Phase 3 platform/frontend scope:
  - Phase 3 priority pages are Dashboard, project list/detail, case list, execution start, report list, basic model config, and basic environment config.
  - Phase 3 plugin priority pages are popup home, current-page summary, and current runtime status.
  - The platform remains the primary control/management surface; the plugin remains lightweight and assistive.
  - Frontend delivery should start as low-fidelity React + TypeScript functional skeletons with mock/placeholder integration points.
- Consolidated the frontend AI-generation workflow constraints:
  - Every page-generation pass must first read `00_project_index.md`, `01_dev_progress.md`, the Phase 3 prototype doc, and the wireframe doc.
  - Page generation should proceed incrementally, page-by-page or by tightly related page groups.
  - Generated code must stay within documented page responsibilities and preserve platform/plugin separation.

## Current Status
- Phase 3 can now formally start.
- The project no longer needs to wait for additional Phase 3 design documents before entering platform-management development.

## Recommended Development Order
1. Map the current repo modules and routing structure to the documented Phase 3 page set and identify the missing shells.
2. Scaffold the backend main-platform Phase 3 modules/APIs for dashboard, project, case, execution, report, and basic configuration pages.
3. Scaffold the web UI low-fidelity page skeletons for the same Phase 3 set, using the documented information architecture and wireframes.
4. Scaffold the lightweight Edge plugin pages for popup home, current-page summary, and current runtime status.
5. After the platform shells are in place, start the first runtime-AI backend slice around `RuntimeExecutionContext`, decision/audit records, snapshot collection, and rule-first state recognition.

## Known Constraints
- Do not front-load Phase 5 document-upload / AI-generation pages into the first Phase 3 delivery slice.
- Do not expand plugin scope into heavy configuration, document management, or full reporting.
- Do not violate the runtime AI control boundary defined in the runtime interaction design.

## Next Step
- Prefer starting with a repo-level implementation mapping pass and Phase 3 shell scaffolding, then move into the first runtime-AI backend slice after the platform skeleton is standing.

## 2026-04-18 Phase 3 repo mapping and shell scaffold record

## Task
- Execute the first concrete Phase 3 step by mapping the current repository to the documented Phase 3 scope and scaffolding the missing web/platform/plugin shells.

## Completed
- Added `docs/phase3/phase3_repo_mapping_and_shell_scaffold.md` to map existing modules to the documented Phase 3 page set and record the first-slice boundaries.
- Scaffolded a low-fidelity React + TypeScript admin console shell under `ui/admin-console` with:
  - Vite/TypeScript project bootstrap
  - dashboard shell
  - project list/detail entry section
  - case list placeholder section
  - execution start queue section
  - report list section
  - basic model config section
  - basic environment config section
- Added shared UI design tokens in `ui/shared-ui/tokens.css` so the first platform shell has a reusable visual baseline.
- Scaffolded a lightweight Edge extension popup under `extension/edge-extension` with:
  - MV3 manifest
  - popup home shell
  - current-page summary placeholder
  - current runtime status placeholder
  - active-tab refresh logic for title and URL
- Added `*.tsbuildinfo` to `.gitignore` to keep TypeScript build metadata out of versioned changes.
- Confirmed the web shell stays within the documented Phase 3 boundary: low-fidelity, mock-data based, platform-first, plugin-lightweight, and without Phase 5 document-driven pages.

## Modified Files
- `.gitignore`
- `docs/phase3/phase3_repo_mapping_and_shell_scaffold.md`
- `ui/shared-ui/tokens.css`
- `ui/admin-console/package.json`
- `ui/admin-console/package-lock.json`
- `ui/admin-console/tsconfig.json`
- `ui/admin-console/tsconfig.node.json`
- `ui/admin-console/vite.config.ts`
- `ui/admin-console/index.html`
- `ui/admin-console/src/main.tsx`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/styles.css`
- `extension/edge-extension/manifest.json`
- `extension/edge-extension/popup.html`
- `extension/edge-extension/popup.css`
- `extension/edge-extension/popup.js`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm install` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Passed: manifest/resource presence check for `extension/edge-extension/manifest.json`

## Known Gaps
- `apps/local-admin-api` still does not expose Phase 3 page data contracts; the admin console remains mock-data only.
- The extension popup is still standalone and not connected to the local platform API or native host.
- No routing library, state management, or backend integration has been added yet; this is a shell-only first slice.

## Next Step
- Prefer scaffolding `apps/local-admin-api` Phase 3 mock contracts/endpoints next so the admin console and extension can switch from hardcoded placeholders to a shared backend shape.
- After that, wire the admin console sections to the local API and only then start the first runtime-AI backend slice.

## 2026-04-18 Phase 3 local admin API mock contract record

## Task
- Scaffold `apps/local-admin-api` Phase 3 mock endpoints and switch the Phase 3 admin console shell to consume a shared local backend shape.

## Completed
- Added a minimal local HTTP service under `apps/local-admin-api` using JDK `HttpServer`.
- Added shared mock payload models for:
  - admin console snapshot
  - extension popup snapshot
- Added `Phase3MockDataService` to centralize the first-slice Phase 3 payloads instead of duplicating frontend-only hardcoded arrays.
- Exposed the first local mock endpoints:
  - `GET /health`
  - `GET /api/phase3/admin-console`
  - `GET /api/phase3/extension-popup`
- Enabled permissive local CORS headers so the standalone admin console and extension popup can read the local API during development.
- Reworked `ui/admin-console/src/App.tsx` to:
  - fetch the aggregated admin snapshot from the local API
  - preserve a fallback embedded snapshot if the local API is offline
  - render page sections from the shared backend payload shape
- Reworked the Edge popup shell to:
  - fetch the popup snapshot from the local API
  - surface runtime mode / queue / audit state from the shared payload
  - fall back to local placeholder data when the API is unavailable
- Added `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the current Phase 3 mock endpoint contract.
- Added `LocalAdminApiServerTest` coverage for the health, admin-console, and extension-popup endpoints.

## Modified Files
- `apps/local-admin-api/pom.xml`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/model/AdminConsoleSnapshot.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/model/ExtensionPopupSnapshot.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.tsx`
- `extension/edge-extension/popup.html`
- `extension/edge-extension/popup.js`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- `local-admin-api` still serves mock payloads only; no real project, case, execution, or report backing services are wired yet.
- `ui/admin-console` and the extension popup still keep embedded fallback snapshots to stay usable when the local API is not running.
- The extension still uses direct local HTTP fetch; native-host messaging and richer platform auth/session handling are not part of this slice.

## Next Step
- Prefer replacing individual `Phase3MockDataService` sections with real local readers next, starting with report summaries and execution queue shape so the UI can reflect live local state before runtime-AI backend work begins.

## 2026-04-18 Phase 3 local report and queue reader record

## Task
- Continue the next documented Phase 3 step by replacing the first `local-admin-api` mock sections with live local readers, starting from report summaries and execution queue state.

## Completed
- Reworked `Phase3MockDataService` so the admin snapshot now prefers live local sources for:
  - `reports`: scans `runs/*/report.json`, derives run status from report summary data, and exposes report entry hints from the actual run directory contents.
  - `workQueue`: reads `config/phase3/execution-queue.json` when present and maps it into the existing queue card shape.
  - `stats`: now reflect local report count, queue depth, 24h success rate, and latest run status instead of pure placeholder numbers.
  - `timeline`: now merges recent run completions and queue updates from the same local sources.
- Reworked the extension popup snapshot so runtime queue and audit text now reflect:
  - queue counts from `config/phase3/execution-queue.json`
  - latest run outcome from `runs/*/report.json`
- Added `config/phase3/execution-queue.json` as the first explicit local queue-state sample file for the Phase 3 shell.
- Added `--report-root` and `--queue-file` options to `LocalAdminApiApp` so local-admin-api can be pointed at alternate local state locations when started from different working directories or test setups.
- Extended `LocalAdminApiServerTest` to verify that:
  - admin snapshot output includes a real run read from a temporary `report.json`
  - queue output includes items read from a temporary execution queue file
  - popup runtime text reflects queue counts and failed latest-run audit state
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document that reports and queue sections now prefer filesystem-backed local readers.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `config/phase3/execution-queue.json`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- `projects`, `cases`, `modelConfig`, and `environmentConfig` remain placeholder shell data; only report- and queue-related sections were moved to local readers in this step.
- Queue state is still file-backed rather than driven by a real scheduler, executor, or persisted run-request store.
- The admin console still renders the existing backend shape without deep links or richer report metadata; it only benefits from fresher data.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer replacing the next placeholder backend sections with real local readers, starting with project/report index summaries or an execution-history source so the dashboard can reduce shell-only data further.
- After that, decide whether to introduce a real queued-run state source or move into the first runtime-AI backend groundwork once Phase 3 platform visibility is sufficient.

## 2026-04-18 Phase 3 project catalog reader record

## Task
- Continue the next documented Phase 3 step by replacing the `projects` and `cases` shell placeholders with a local catalog reader while keeping the current admin-console payload shape stable.

## Completed
- Reworked `Phase3MockDataService` so the admin snapshot now prefers `config/phase3/project-catalog.json` for:
  - `projects`: project rows are built from the local catalog instead of hardcoded placeholder entries.
  - `caseTags`: tags are derived from active cataloged cases instead of a fixed embedded list.
  - `stats`: the first dashboard stat now reflects active project count and active case coverage from the local catalog.
  - project notes: rows now combine local catalog metadata with latest matching run status from `runs/*/report.json` when present.
- Added `config/phase3/project-catalog.json` as the first explicit local project/case summary sample for the Phase 3 shell.
- Added `--catalog-file` to `LocalAdminApiApp` so local-admin-api can read an alternate project/case catalog path in other local setups or tests.
- Extended `LocalAdminApiServerTest` to verify that admin snapshot output includes local project rows and case tags read from a temporary catalog file.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document that projects and case tags now prefer the local catalog reader.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `config/phase3/project-catalog.json`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Project and case list visibility is now file-backed, but deep project detail, case detail, editing, and persistence are still not implemented.
- Queue state is still file-backed rather than driven by a real scheduler, executor, or persisted run-request store.
- `modelConfig` and `environmentConfig` remain placeholder shell data.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer replacing the next placeholder backend sections with execution-history readers or scheduler-backed queue state so the Execution and Reports sections carry more real platform state than shell metadata.
- After that, decide whether to deepen Phase 3 platform management detail or move into the first runtime-AI backend groundwork once local platform visibility is sufficient.

## 2026-04-18 Phase 3 execution history reader record

## Task
- Continue the next documented Phase 3 step by replacing more execution/report shell metadata with a local execution-history reader while keeping the current admin-console payload shape stable.

## Completed
- Reworked `Phase3MockDataService` so the admin snapshot now merges optional `config/phase3/execution-history.json` entries with existing `runs/*/report.json` summaries for:
  - `reports`: report rows now show active/cancelled execution-history entries even before a final `report.json` exists.
  - `stats`: the latest-run and 24h success cards now read from the merged execution view instead of only finished reports.
  - `timeline`: recent activity now includes execution-history updates alongside queue and finished-report events.
  - `workQueue`: when `execution-queue.json` is absent, active execution-history items can still surface as derived execution-state rows.
- Reworked the extension popup runtime summary so it can reflect an active latest run from `execution-history.json` instead of only terminal report outcomes.
- Added `config/phase3/execution-history.json` as the first explicit local execution-history sample file for the Phase 3 shell.
- Added `--execution-history-file` to `LocalAdminApiApp` so local-admin-api can read an alternate execution-history path in other local setups or tests.
- Extended `LocalAdminApiServerTest` to verify that admin snapshot output includes execution-history-backed rows and that popup audit state reflects an active latest run.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new execution-history reader and current boundary.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `config/phase3/execution-history.json`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Execution history is still file-backed rather than sourced from a real scheduler, executor, or persisted run-request/event stream.
- `modelConfig` and `environmentConfig` remain placeholder shell data.
- Project and case list visibility is file-backed, but deep project detail, case detail, editing, and persistence are still not implemented.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer replacing the next placeholder backend sections with local model/environment config readers, or replace the file-backed execution history/queue sources with a scheduler-backed state source.
- After that, decide whether to deepen Phase 3 platform management detail or move into the first runtime-AI backend groundwork once local platform visibility is sufficient.

## 2026-04-18 Phase 3 config reader record

## Task
- Continue the next documented Phase 3 step by replacing the `modelConfig` and `environmentConfig` shell placeholders with local config readers while keeping the current admin-console payload shape stable.

## Completed
- Reworked `Phase3MockDataService` so the admin snapshot now prefers:
  - `config/phase3/model-config.json` for `modelConfig`
  - `config/phase3/environment-config.json` for `environmentConfig`
- Kept the existing `ConfigItem` payload shape stable so `ui/admin-console` did not need contract changes.
- Added `config/phase3/model-config.json` and `config/phase3/environment-config.json` as the first explicit local config samples for the Phase 3 shell.
- Added `--model-config-file` and `--environment-config-file` to `LocalAdminApiApp` so local-admin-api can point at alternate config snapshots in other local setups or tests.
- Extended `LocalAdminApiServerTest` to verify that admin snapshot output includes file-backed model and environment config values.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new config readers and their current file-backed boundary.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `config/phase3/model-config.json`
- `config/phase3/environment-config.json`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Model and environment cards are now file-backed, but still not editable through platform APIs or persisted services.
- Execution queue and execution history are still file-backed rather than sourced from a real scheduler, executor, or event stream.
- Project and case detail/editing remain shell-only.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer replacing the remaining file-backed queue/execution shell sources with a scheduler-backed state source, or introduce editable persistence for Phase 3 project/config management once the current visibility baseline is sufficient.

## 2026-04-18 Phase 3 scheduler state reader record

## Task
- Continue the next documented Phase 3 step by replacing the separate file-backed queue/execution shell sources with a unified scheduler-backed state input while keeping the current admin-console and popup payload shapes stable.

## Completed
- Reworked `Phase3MockDataService` so queue and execution views now prefer `config/phase3/scheduler-state.json` before falling back to:
  - `config/phase3/execution-queue.json`
  - `config/phase3/execution-history.json`
  - `runs/*/report.json`
- Added a minimal scheduler snapshot model that feeds:
  - `workQueue`
  - `reports`
  - `stats`
  - `timeline`
  - extension popup runtime summary/hints
- Added `config/phase3/scheduler-state.json` as the first explicit unified scheduler state sample for the Phase 3 shell.
- Added `--scheduler-state-file` to `LocalAdminApiApp` so local-admin-api can point at an alternate scheduler snapshot path in other local setups or tests.
- Extended `LocalAdminApiServerTest` to verify that scheduler-backed queue/execution rows override the legacy queue/history snapshots when both are present.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the scheduler-state preference order and the current snapshot-based boundary.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `config/phase3/scheduler-state.json`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Scheduler state is still a local snapshot file, not a live scheduler/executor service or persisted run-request/event store.
- Legacy queue/history files remain as compatibility fallbacks.
- Project/case detail and editable config management are still not implemented.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer replacing `scheduler-state.json` with a real local scheduler/executor state service, or introduce editable persistence for Phase 3 project/config management once the visibility baseline is sufficient.

## 2026-04-18 Phase 3 derived scheduler service reader record

## Task
- Continue the next documented Phase 3 step by replacing the standalone scheduler snapshot preference with a derived local scheduler service view built from run requests and event history while keeping the current admin-console and popup payload shapes stable.

## Completed
- Added `LocalSchedulerStateReader` so queue/execution state can now be derived from:
  - `config/phase3/scheduler-requests.json`
  - `config/phase3/scheduler-events.json`
- Reworked `Phase3MockDataService` so `workQueue`, `reports`, `stats`, `timeline`, and popup runtime hints now prefer the derived scheduler service view before falling back to:
  - `config/phase3/scheduler-state.json`
  - `config/phase3/execution-queue.json`
  - `config/phase3/execution-history.json`
  - `runs/*/report.json`
- Kept the existing admin-console and popup payload shapes stable, so `ui/admin-console` did not require contract changes.
- Added `config/phase3/scheduler-requests.json` and `config/phase3/scheduler-events.json` as the first explicit local scheduler service samples.
- Added `--scheduler-requests-file` and `--scheduler-events-file` to `LocalAdminApiApp` so local-admin-api can point at alternate request/event snapshots in other local setups or tests.
- Extended `LocalAdminApiServerTest` to verify that derived scheduler service files override the older scheduler snapshot input when both are present.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new derived scheduler precedence and the remaining file-backed boundary.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/LocalSchedulerStateReader.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `config/phase3/scheduler-requests.json`
- `config/phase3/scheduler-events.json`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Scheduler state is now derived from local request/event files, but it is still file-backed rather than a live persisted scheduler/executor process.
- The older `scheduler-state.json`, queue snapshot, and execution-history files remain as compatibility fallbacks.
- Project/case detail and editable config/project management are still not implemented.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer adding writable scheduler request/event persistence or the first editable project/config endpoints, then deepen project/case detail once a persistent source exists.

## 2026-04-18 Phase 3 writable scheduler persistence record

## Task
- Continue the next documented Phase 3 step by adding the first writable local scheduler boundary while keeping the existing admin-console and extension snapshot payloads stable.

## Completed
- Added `SchedulerPersistenceService` so `local-admin-api` can append normalized records to:
  - `config/phase3/scheduler-requests.json`
  - `config/phase3/scheduler-events.json`
- Extended `LocalAdminApiServer` with:
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`
- Kept the existing `GET /api/phase3/admin-console` and `GET /api/phase3/extension-popup` contracts unchanged; new writes are reflected immediately because the existing read path already prefers the derived scheduler request/event files.
- Extended `LocalAdminApiServerTest` to verify:
  - POST mutations are accepted
  - request/event files are written with normalized defaults
  - subsequent admin-console and popup GET snapshots reflect the persisted scheduler state
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new writable scheduler endpoints and their current file-backed boundary.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`

## Known Gaps
- Scheduler mutations are append-only file writes with minimal validation and no concurrency coordination beyond single-write replacement of the JSON document.
- No UI action is wired to these endpoints yet, so the admin console and extension remain read-only shells at the interaction layer.
- Project/config editing still has no writable endpoint.
- The extension still uses direct local HTTP fetch and has no native-host transport in this slice.

## Next Step
- Prefer wiring an operator-facing launch/review action to the new scheduler POST endpoints, or add the first editable project/config endpoint using the same file-backed persistence pattern.

## 2026-04-18 Phase 3 admin-console scheduler action wiring record

## Task
- Continue the next documented Phase 3 step by wiring the first operator-facing admin-console actions to the writable scheduler request/event endpoints without changing the backend payload contracts.

## Completed
- Reworked `ui/admin-console/src/App.tsx` so the existing shell buttons now drive real local scheduler mutations:
  - Execution panel posts `POST /api/phase3/scheduler/requests`
  - Recent Activity panel posts `POST /api/phase3/scheduler/events` with a `NEEDS_REVIEW` audit marker
- Added minimal operator input fields for:
  - `runId`
  - `projectKey`
  - `owner`
  - `environment`
  - `detail`
- Added inline pending/success/error feedback and automatic snapshot refresh after successful mutations so the queue/timeline views reflect the persisted scheduler state immediately.
- Updated `ui/admin-console/src/styles.css` to support the new action forms and status banners while preserving the current Phase 3 visual language.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document that the admin console now exercises the writable scheduler boundary.

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/styles.css`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`

## Known Gaps
- The admin-console actions are still thin operator forms with no project-aware pickers, validation rules, or scheduler command reconciliation.
- The Edge extension popup is still read-only and does not yet reuse the new writable scheduler interaction path.
- Scheduler persistence remains append-only file-backed JSON with minimal multi-writer coordination.
- Project/config editing still has no writable endpoint.

## Next Step
- Extend the same launch/review workflow into the Edge popup, or add the first editable project/config endpoint and corresponding admin-console action.

## 2026-04-18 Phase 3 edge popup scheduler action wiring record

## Task
- Continue the next documented Phase 3 step by wiring the Edge popup to the writable scheduler request/event endpoints while preserving its lightweight assistive role and fallback snapshot mode.

## Completed
- Reworked `extension/edge-extension/popup.html` so the popup now exposes two operator-facing action panels:
  - `Quick Launch` posts scheduler requests
  - `Audit Review` posts scheduler review events
- Extended `extension/edge-extension/popup.js` to:
  - submit `POST /api/phase3/scheduler/requests`
  - submit `POST /api/phase3/scheduler/events` with `NEEDS_REVIEW`
  - include current tab title/URL context in mutation detail text
  - show pending/success/error feedback for both flows
  - refresh the popup snapshot after successful writes so queue/runtime state reflects persisted scheduler data immediately
  - keep the popup usable when the local API is offline by retaining existing read fallback behavior
- Updated `extension/edge-extension/popup.css` to support the new form layout and mutation status styling without changing the current popup visual direction.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` so the contract records that the popup now exercises the writable scheduler boundary.

## Modified Files
- `extension/edge-extension/popup.html`
- `extension/edge-extension/popup.js`
- `extension/edge-extension/popup.css`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`

## Known Gaps
- The popup actions are still thin manual forms with minimal validation and no project-aware pickers or case-aware command building.
- Popup writes still use direct local HTTP fetch and do not yet use the planned native-host transport.
- Scheduler persistence remains append-only file-backed JSON with minimal reconciliation and multi-writer coordination.
- Project/config editing still has no writable endpoint.

## Next Step
- Add the first editable project/config endpoint and wire it into the admin console, or replace popup direct local HTTP with the planned native-host transport.

## 2026-04-18 Phase 3 admin-console editable config wiring record

## Task
- Continue the next documented Phase 3 step by adding the first editable project/config boundary, starting with model and environment config items, while keeping the existing admin snapshot payload stable.

## Completed
- Added `ConfigPersistenceService` so `local-admin-api` can upsert file-backed config items in:
  - `config/phase3/model-config.json`
  - `config/phase3/environment-config.json`
- Extended `LocalAdminApiServer` with:
  - `POST /api/phase3/config/model`
  - `POST /api/phase3/config/environment`
- Reworked `ui/admin-console/src/App.tsx` so the Model Config and Environment Config cards now expose editable forms that:
  - submit item updates to the new config endpoints
  - refresh the admin snapshot after successful writes
  - show inline pending/success/error feedback
- Updated `ui/admin-console/src/styles.css` to support editable config rows without changing the current Phase 3 visual direction.
- Extended tests to verify:
  - backend config writes update the target JSON files and show up in subsequent admin snapshots
  - frontend config saves call the new endpoints and refresh the visible snapshot state
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new editable config endpoints and current file-backed behavior.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ConfigPersistenceService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `ui/admin-console/src/styles.css`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Config editing is still label/value upsert only, with no schema validation, field typing, or access control.
- The admin console edits only existing config rows and does not yet provide add/remove/reorder controls.
- Project/catalog editing still has no writable endpoint.
- The Edge popup still writes via direct local HTTP and does not yet use the planned native-host transport.

## Next Step
- Extend the same editable persistence pattern to project/catalog management, or replace popup direct local HTTP with the planned native-host transport.

## 2026-04-18 Phase 3 admin-console editable project catalog wiring record

## Task
- Continue the next documented Phase 3 step by extending the file-backed editable persistence pattern to project/catalog management while keeping the existing admin snapshot payload stable.

## Completed
- Added `CatalogPersistenceService` so `local-admin-api` can upsert project rows in `config/phase3/project-catalog.json` while preserving existing `cases` entries.
- Extended `LocalAdminApiServer` with:
  - `POST /api/phase3/catalog/project`
- Reworked `ui/admin-console/src/App.tsx` so the Projects section now exposes editable catalog rows that:
  - submit project updates to the new catalog endpoint
  - support appending a new draft row in the shell
  - refresh the admin snapshot after successful writes
  - show inline pending/success/error feedback
- Updated `ui/admin-console/src/styles.css` to support editable project rows without changing the current Phase 3 visual direction.
- Extended tests to verify:
  - backend project catalog writes update `project-catalog.json` and remain visible in subsequent admin snapshots
  - frontend project catalog saves call the new endpoint and refresh the visible snapshot state
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new writable project catalog endpoint and current file-backed boundary.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `ui/admin-console/src/styles.css`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Project catalog editing is still project-row upsert only, with no case editing, project deletion, or richer validation rules.
- The admin console still uses manual text inputs rather than project-aware pickers or structured environment selectors.
- The Edge popup still writes via direct local HTTP and does not yet use the planned native-host transport.
- Scheduler and catalog persistence remain file-backed JSON with minimal multi-writer coordination.

## Next Step
- Extend the same file-backed editable pattern to case/catalog management, or replace popup direct local HTTP with the planned native-host transport.

## 2026-04-18 Phase 3 admin-console editable case catalog wiring record

## Task
- Continue the next documented Phase 3 step by extending the file-backed editable persistence pattern to case/catalog management while keeping the existing admin snapshot centered on platform management shell data.

## Completed
- Extended `AdminConsoleSnapshot` and `Phase3MockDataService` so `GET /api/phase3/admin-console` now includes a `cases` section with recent case rows, while preserving the existing `caseTags` summary.
- Extended `CatalogPersistenceService` with file-backed case-row upserts in `config/phase3/project-catalog.json`, including normalized `tags`, default `status`, and default `updatedAt`.
- Extended `LocalAdminApiServer` with:
  - `POST /api/phase3/catalog/case`
- Reworked `ui/admin-console/src/App.tsx` so the Cases section now exposes editable case catalog rows that:
  - submit case updates to the new catalog endpoint
  - support appending a new draft row in the shell
  - refresh the admin snapshot after successful writes
  - show inline pending/success/error feedback
- Updated `ui/admin-console/src/styles.css` to support editable case rows without changing the current Phase 3 visual direction.
- Extended tests to verify:
  - backend case catalog writes update `project-catalog.json` and remain visible in subsequent admin snapshots
  - frontend case catalog saves call the new endpoint and refresh the visible snapshot state
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document the new writable case catalog endpoint and the expanded `cases` snapshot section.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/model/AdminConsoleSnapshot.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `ui/admin-console/src/styles.css`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test -q`
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Case catalog editing is still upsert-only, with no delete flow, archive filters, richer validation, or project-aware selector controls.
- The admin console still uses manual text inputs rather than structured project/environment/case pickers.
- The Edge popup still writes via direct local HTTP and does not yet use the planned native-host transport.
- Scheduler and catalog persistence remain file-backed JSON with minimal multi-writer coordination.

## Next Step
- Replace popup direct local HTTP with the planned native-host transport, or deepen case management with delete/archive filters and project-aware pickers.

## 2026-04-18 Repository verification entrypoint record

## Task
- Add a single repo-level verification command for the current Java workspace and the Phase 3 admin console shell.

## Completed
- Added `scripts/verify.ps1` to run the current verification flow in sequence:
  - root Maven test suite
  - `ui/admin-console` Vitest suite
  - `ui/admin-console` production build
- Added `verify.bat` at the repo root as a Windows-friendly wrapper around the PowerShell script.
- Confirmed the verification baseline is green by rerunning the same backend and frontend checks in the current workspace.

## Modified Files
- `scripts/verify.ps1`
- `verify.bat`
- `01_dev_progress.md`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" test`
- Passed: `npm test` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Passed: `verify.bat`

## Known Gaps
- The new verification entrypoint covers the current backend test suite and admin console build/test path, but it does not start the local admin API or run a real Edge smoke session.
- `start.bat` remains dedicated to the core-platform smoke flow rather than the repo-wide verification workflow.

## Next Step
- If runtime validation becomes the next priority, add a second entrypoint for launching `LocalAdminApiApp` plus the admin console shell, or extend verification to include an executable smoke flow.

## 2026-04-18 Phase 3 popup native-host bridge record

## Task
- Continue the next documented Phase 3 step by replacing the Edge popup's direct local HTTP usage with the planned native-host transport while keeping `local-admin-api` as the current backend boundary.

## Completed
- Added a first runnable `apps/native-host` implementation with:
  - `NativeHostApp` stdio loop for Edge native messaging framing
  - a narrow message processor supporting `PING`, `POPUP_SNAPSHOT_GET`, `SCHEDULER_REQUEST_CREATE`, and `SCHEDULER_EVENT_CREATE`
  - a local admin API bridge that proxies popup requests to the existing file-backed Phase 3 endpoints
- Added native-host tests covering:
  - popup snapshot proxy reads
  - scheduler request proxy writes
  - unsupported message handling
  - length-prefixed native messaging encode/decode flow
- Added `extension/edge-extension/background.js` and updated `manifest.json` so the extension now uses:
  - a Manifest V3 service worker
  - `nativeMessaging` permission
  - `chrome.runtime.sendNativeMessage` to reach the host
- Reworked `extension/edge-extension/popup.js` and `popup.html` so the popup:
  - sends internal requests to the background bridge instead of calling `http://127.0.0.1:8787` directly
  - continues to refresh the popup snapshot after successful queue/review actions
  - preserves fallback shell behavior when the background bridge or host is unavailable
- Updated popup tests to verify the extension bridge path and native-host fallback behavior.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` to document that popup traffic now reaches the local API through the native-host bridge.

## Modified Files
- `apps/native-host/pom.xml`
- `apps/native-host/src/main/java/com/example/webtest/nativehost/NativeHostApp.java`
- `apps/native-host/src/main/java/com/example/webtest/nativehost/NativeHostMessageProcessor.java`
- `apps/native-host/src/main/java/com/example/webtest/nativehost/LocalAdminApiBridge.java`
- `apps/native-host/src/main/java/com/example/webtest/nativehost/NativeHostRequest.java`
- `apps/native-host/src/main/java/com/example/webtest/nativehost/NativeHostResponse.java`
- `apps/native-host/src/test/java/com/example/webtest/nativehost/NativeHostMessageProcessorTest.java`
- `extension/edge-extension/manifest.json`
- `extension/edge-extension/background.js`
- `extension/edge-extension/popup.html`
- `extension/edge-extension/popup.js`
- `ui/admin-console/src/popup.test.js`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/native-host -am test -q`
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Native host registration and local installation are not automated yet; the Edge-side manifest/registry setup is still manual.
- The current native host is only a proxy to `local-admin-api`, not a direct execution/runtime gateway.
- Popup forms still use manual text input rather than project-aware selectors or richer validation.
- The popup still depends on `local-admin-api` being available behind the native host for live data and writable actions.

## Next Step
- Add a developer-friendly native-host registration/install path, or deepen case management with delete/archive filters and project-aware pickers.

## 2026-04-18 Phase 3 native-host install path record

## Task
- Continue the next documented Phase 3 step by adding a developer-friendly Edge native-host registration/install path for the popup bridge.

## Completed
- Fixed `NativeHostApp` argument parsing so real Edge native-messaging launches no longer fail on browser-provided origin and `--parent-window` arguments while preserving the existing `--api-base-url` override.
- Added native-host packaging in `apps/native-host/pom.xml` so `mvn package` now emits a runnable `jar-with-dependencies` artifact for local installation.
- Added `scripts/install-native-host.ps1` and `install-native-host.bat` to:
  - build the native-host runtime jar
  - generate a local `build/native-host/runtime/native-host.cmd` launcher
  - generate the Edge host manifest JSON with the caller's unpacked extension ID in `allowed_origins`
  - register the host under `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.example.webtest.phase3.nativehost`
  - set `NativeHostsExecutablesLaunchDirectly=0` under the current-user Edge policy path unless explicitly suppressed, so the Java cmd wrapper remains launchable during local development
- Added `scripts/uninstall-native-host.ps1` and `uninstall-native-host.bat` to remove the registration and optional runtime files.
- Updated `docs/phase3/phase3_local_admin_api_mock_contracts.md` so the current popup/native-host contract also documents the new install helpers and their current constraints.

## Modified Files
- `apps/native-host/pom.xml`
- `apps/native-host/src/main/java/com/example/webtest/nativehost/NativeHostApp.java`
- `scripts/install-native-host.ps1`
- `scripts/uninstall-native-host.ps1`
- `install-native-host.bat`
- `uninstall-native-host.bat`
- `docs/phase3/phase3_local_admin_api_mock_contracts.md`
- `01_dev_progress.md`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/native-host -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/native-host -am package -DskipTests -q`
- Passed: `powershell -ExecutionPolicy Bypass -File scripts/install-native-host.ps1 -ExtensionId abcdefghijklmnopabcdefghijklmnop -NoRegistryWrite`
- Passed: `cmd /c .\build\native-host\runtime\native-host.cmd --help`

## Known Gaps
- The install path still assumes Windows + Edge local development and a machine-local JRE.
- The generated host launcher is a `cmd` wrapper around `java -jar`; it is suitable for local dev but not yet a packaged native executable installer.
- The native host still ignores caller origin after parsing it; `allowed_origins` in the Edge manifest remains the primary access control.
- Extension ID discovery is still manual; the developer must copy the unpacked ID from `edge://extensions`.

## Next Step
- Add origin-aware request validation and/or a packaged executable launcher for the native host, or return to richer case management with delete/archive filters and project-aware pickers.

## 2026-04-18 local startup bat consolidation record

## Task
- Consolidate the scattered local startup commands into a single repo-root `start.bat` that can be used as the developer entrypoint.

## Completed
- Replaced the old smoke-only `start.bat` with a complete local startup batch script.
- Added startup checks for `mvn` and `npm` so the script fails early when the local environment is incomplete.
- Added first-run dependency installation for `ui/admin-console` when `node_modules` is missing.
- Added a repo-level Java build step for `apps/local-admin-api` and its dependencies before launching local services.
- Added background launch of:
  - `LocalAdminApiApp` on `http://127.0.0.1:8787`
  - Vite admin console on `http://127.0.0.1:5173`
- Added optional flags to the same entrypoint for:
  - native-host installation via `--install-native-host EXTENSION_ID`
  - core-platform DSL smoke execution via `--with-smoke`

## Modified Files
- `start.bat`
- `01_dev_progress.md`

## Verification
- Not run in this change. The script was updated based on the current Maven/NPM layout and existing repo commands.

## Known Gaps
- `start.bat` launches long-running services in new `cmd` windows but does not yet manage shutdown.
- Native-host installation still requires the unpacked Edge extension ID to be supplied manually.
- The startup script assumes local Windows development with `mvn` and `npm` already available in `PATH`.

## Next Step
-UI需要完全重构，应该类似常用的点击侧栏可切换操作页面的后台操作系统，同时支持中日英三语言切换，UIdemo必须参考docs/phase3/platform_and_edge_low_fidelity_wireframes.md，找到之前UI构造的开发记忆，对那一阶段进行UI重构，风格往Apple风格上靠，必须完全阅读ocs/phase3/react_page_skeleton_prompt_guide.md
- Add a matching stop/cleanup script for the local API and admin console windows, or extend the startup flow with health checks once runtime validation becomes the next priority.

## 2026-04-19 Phase 3 admin-console frame and multilingual shell refactor record

## Task
- Continue the documented Phase 3 next step by restructuring `ui/admin-console` into a real platform frame with sidebar-driven screens, theme switching, and Chinese/Japanese/English language switching while preserving the existing local-admin-api contracts.

## Completed
- Reworked `ui/admin-console/src/App.tsx` from a single long shell section into a frame-oriented console with:
  - top bar chrome
  - sidebar navigation that switches between dashboard, projects, cases, execution, reports, model config, and environment config
  - screen-specific headers and grouped content panels
- Added a minimal multilingual copy layer in `App.tsx` for English, Chinese, and Japanese UI labels while keeping English as the default test/runtime baseline.
- Added light/dark theme switching in the admin console without changing the current backend payload contract or mutation behavior.
- Kept the existing file-backed write flows intact for:
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`
  - `POST /api/phase3/catalog/project`
  - `POST /api/phase3/catalog/case`
  - `POST /api/phase3/config/model`
  - `POST /api/phase3/config/environment`
- Reworked `ui/admin-console/src/styles.css` to align the shell more closely with the documented Phase 3 frame and the `uidemo/edge-self-test-demo.html` direction:
  - unified top bar + sidebar + workspace layout
  - stronger card hierarchy
  - theme-aware tokens through CSS variables
  - responsive screen behavior for desktop and narrow widths
- Updated frontend tests so the mutation coverage follows the new sidebar navigation flow instead of assuming every editable section is rendered in the initial viewport.

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/styles.css`
- `ui/admin-console/src/App.test.tsx`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- The current refactor keeps the UI mostly inside `App.tsx`; it now has a cleaner frame, but it has not yet been split into `Frame`, `ui-kit`, and per-screen files.
- Language switching currently covers the admin shell labels and navigation, but not every backend-provided string from the snapshot payload.
- The admin console is closer to the target platform shell, but it still does not include the larger document-upload / AI-generate / execution-monitor / report-detail screen set from the full demo reference.
- Project and case editing remain text-input driven and do not yet have project-aware selectors, delete flows, archive filters, or richer validation.

## Next Step
- Split the current frame into `tokens` / `ui-kit` / `screens` modules following the `uidemo` migration notes, or deepen the current screen set with project-aware pickers and archive/delete management.

## 2026-04-19 Phase 3 admin-console module split record

## Task
- Continue the documented Phase 3 next step by splitting the current `ui/admin-console` frame into `tokens`, `ui-kit`, and `screens` modules while preserving the existing local-admin-api contracts and test coverage.

## Completed
- Kept the existing Phase 3 shell behavior and API write paths in `ui/admin-console/src/App.tsx`, but reduced its responsibility to orchestration, local state, and request handlers.
- Added shared admin-console types in `ui/admin-console/src/types.ts` so screen and ui-kit modules now share the same snapshot, draft, and mutation contracts.
- Added `ui/admin-console/src/tokens/shell.ts` for shared shell navigation metadata used by the sidebar frame.
- Added reusable `ui-kit` frame components:
  - `TopBar`
  - `Sidebar`
  - `ScreenHeader`
  - `MutationStatus`
- Split the current screens into dedicated files under `ui/admin-console/src/screens/`:
  - `DashboardScreen`
  - `ProjectsScreen`
  - `CasesScreen`
  - `ExecutionScreen`
  - `ReportsScreen`
  - `ConfigScreen`
- Kept the existing writable local-admin-api boundaries unchanged for:
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`
  - `POST /api/phase3/catalog/project`
  - `POST /api/phase3/catalog/case`
  - `POST /api/phase3/config/model`
  - `POST /api/phase3/config/environment`

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/tokens/shell.ts`
- `ui/admin-console/src/ui-kit/TopBar.tsx`
- `ui/admin-console/src/ui-kit/Sidebar.tsx`
- `ui/admin-console/src/ui-kit/ScreenHeader.tsx`
- `ui/admin-console/src/ui-kit/MutationStatus.tsx`
- `ui/admin-console/src/screens/DashboardScreen.tsx`
- `ui/admin-console/src/screens/ProjectsScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/ExecutionScreen.tsx`
- `ui/admin-console/src/screens/ReportsScreen.tsx`
- `ui/admin-console/src/screens/ConfigScreen.tsx`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- The current split covers shell frame components and the first seven admin screens, but the visual tokens still remain largely CSS-variable based in `styles.css` rather than a richer shared design-token layer.
- Multilingual switching still covers shell-owned copy only; snapshot payload strings from the backend remain untranslated.
- Project and case management are still text-input driven and do not yet provide project-aware pickers, archive filters, delete flows, or stronger validation.
- The larger `uidemo` reference screens such as document upload, AI generate, execution monitor, and report detail are still not migrated into the real admin console.

## Next Step
- Deepen the `tokens` layer and migrate more of the `uidemo` screen set into real screen modules, or prioritize richer project/case management with pickers, archive filters, and delete flows.

## 2026-04-19 Phase 3 admin-console project and case management depth record

## Task
- Continue the Phase 3 admin-console shell work by upgrading project and case maintenance from plain text editing into richer management flows while preserving the existing local-admin-api catalog contracts.

## Completed
- Enhanced `ui/admin-console/src/screens/ProjectsScreen.tsx` with:
  - catalog search by key, scope, and note
  - selectable project focus rail
  - linked-case side panel for the selected project
  - removable draft rows in the editable catalog form
- Enhanced `ui/admin-console/src/screens/CasesScreen.tsx` with:
  - project-aware filtering
  - archived-row visibility toggle
  - status summary pills for the current filter result
  - project selection through a real dropdown instead of free-text only
  - removable draft rows in the editable catalog form
- Added lightweight front-end validation in `ui/admin-console/src/App.tsx` before posting catalog updates:
  - reject empty-save submissions
  - reject duplicate project keys
  - reject duplicate case ids
  - reject case rows that reference unknown project keys
- Extended `ui/admin-console/src/styles.css` with the styling needed for searchable catalog toolbars, selected rows, summary pills, split editor headers, and destructive row removal actions.
- Kept the writable backend boundaries unchanged for:
  - `POST /api/phase3/catalog/project`
  - `POST /api/phase3/catalog/case`

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/screens/ProjectsScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/styles.css`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Known Gaps
- Project deletion still works as “remove the row from the saved catalog payload” rather than a dedicated backend delete API.
- Case status remains free-text and is not yet constrained to a shared enum or policy source.
- Snapshot-owned strings are still not fully localized; this round only improved shell-owned management interactions.
- The larger document parse / AI generate / monitor / report detail flows still need deeper operator interactions beyond their current skeletons.

## Next Step
- Add explicit archive/delete semantics to the local-admin-api contracts when backend work becomes acceptable, or continue deepening the migrated Phase 3 operator screens such as document parse, AI generate, and execution monitor.

## 2026-04-19 Cases / Doc Parse Decoupling
- Fixed the `Cases` detail action so it no longer jumps into `Doc Parse`; it now only opens the inline Cases detail canvas.
- Removed the extra `Detail opened` and `Candidate` texts from the `Doc Parse -> Parse result` case rows.
- Removed the transient App-level Cases -> Doc Parse focus bridge from `ui/admin-console/src/App.tsx`.
- Updated `ui/admin-console/src/screens/CasesScreen.tsx` so the row action stays local to the Cases module.
- Rebuilt `ui/admin-console/src/screens/DocParseScreen.tsx` into a clean standalone implementation because the previous file contained broken localized string encoding that blocked safe edits and tests.
- Added regression coverage in `ui/admin-console/src/App.test.tsx` for ��Cases detail stays in Cases��.

## Verification
- Passed: `npm test` in `ui/admin-console`

## 2026-04-19 Cases / Execution Pre-execution UI Refactor
- Reworked the Phase 3 admin-console flow so `Cases` detail now treats `Run` as a front-end-only `Pre-execution` action, with no backend logic changes.
- Added App-level prepared-case UI state in `ui/admin-console/src/App.tsx` and kept it constrained to the existing front-end shell flow.
- Rebuilt `ui/admin-console/src/screens/CasesScreen.tsx` into a clean, compilable screen because the previous file contained broken localized strings that were no longer safe to patch incrementally.
- Reworked `ui/admin-console/src/screens/ExecutionScreen.tsx` so `Project` is selected from a dropdown and the right-hand panel shows prepared-case count and prepared-case rows for the selected project.
- Extended `ui/admin-console/src/styles.css` for the new prepared-case summary panel and responsive execution layout.
- Added regression coverage in `ui/admin-console/src/App.test.tsx` for the prepared-case count flow and the formal execution flow after pre-execution.

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/ExecutionScreen.tsx`
- `ui/admin-console/src/styles.css`
- `ui/admin-console/src/types.ts`
- `memory.txt`

## Verification
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`

## Constraint
- This round stayed in front-end UI refactor scope only.
- No backend logic or backend contract was modified for this change.

## 2026-04-20 Phase 3 Interface Documentation Planning

## Task
- Move the Phase 3 workstream into screen documentation after the dashboard UI and Edge plugin UI refactor were completed.
- Keep implementation frozen for this stage: no backend logic changes, no backend contract changes, and no front-end UI changes.
- Define the documentation output model for every real screen based on the current dashboard screens and `docs/phase3/main/*` project documents.

## Completed
- Confirmed the current documentation target directory as `docs/phase3/interface`.
- Confirmed the current documentation rule: one screen per folder under `docs/phase3/interface`, with both a functional description document and an interface document in that folder.
- Confirmed the current real screen scope from `ui/admin-console/src/App.tsx`, `ui/admin-console/src/tokens/shell.ts`, and the migrated screen modules:
  - `dashboard`
  - `projects`
  - `cases`
  - `docParse`
  - `aiGenerate`
  - `execution`
  - `monitor`
  - `reports`
  - `reportDetail`
  - `models`
  - `environments`
  - `dataDiff`
  - `dataTemplates`
  - `plugin`
- Confirmed the already implemented cross-screen relationships that the new docs must describe:
  - `Cases` pre-execution prepares cases for `Execution`
  - `Doc Parse` can open `AI Generate`
  - `Reports` can open `Report Detail`
  - `Report Detail` can open `Data Diff`
  - `Execution` can open `Exec Monitor`
- Recorded the documentation-stage constraint in `memory.txt` so future work stays documentation-only unless explicitly reopened by the user.
- Selected `dashboard` as the first screen documentation target because it is the operator overview entry and concentrates status, queue, risk, model-policy, and recent-run context.

## Modified Files
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified by repository inspection only.
- No code, UI, backend logic, or API contract was changed in this round.

## Known Gaps
- `docs/phase3/interface` is still empty; the actual per-screen documents have not been generated yet.
- Some source markdown files show console encoding noise in the terminal, so screen-document drafting should rely on file content plus current implementation rather than terminal rendering alone.
- The final document template for each screen still needs to be fixed before batch generation, otherwise later pages may drift in structure.

## Next Step
- Create the `dashboard` screen folder under `docs/phase3/interface`, define the fixed template for `functional-spec.md` and `interface-spec.md`, and draft the first screen documents from the current UI plus the Phase 3 main docs.

## 2026-04-20 Dashboard Interface Documentation Draft

## Task
- Generate the first screen documentation package under `docs/phase3/interface`.
- Keep the current stage documentation-only and do not modify backend logic or front-end UI behavior.
- Use the real `dashboard` implementation plus Phase 3 main docs to define the screen functional spec and interface spec.

## Completed
- Created the first screen folder: `docs/phase3/interface/dashboard`.
- Added `docs/phase3/interface/dashboard/functional-spec.md`.
- Added `docs/phase3/interface/dashboard/interface-spec.md`.
- Documented the `dashboard` screen as the admin-console overview entry for platform health, recent runs, risk triage, and AI decision posture.
- Documented the real current boundary that `dashboard` does not own a dedicated backend endpoint and depends on the shell-level `GET /api/phase3/admin-console` snapshot loaded in `ui/admin-console/src/App.tsx`.
- Documented cross-screen relationships from `dashboard` to `execution`, `monitor`, `reports`, `reportDetail`, `models`, `environments`, and `dataDiff`.
- Recorded review-only gaps without implementing changes:
  - `Refresh` button is visible but not wired
  - `New run` button is visible but not wired to `execution`
  - current screen content is still mostly static/demo-shaped instead of deeply mapped from snapshot data

## Modified Files
- `docs/phase3/interface/dashboard/functional-spec.md`
- `docs/phase3/interface/dashboard/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified by source inspection against:
  - `ui/admin-console/src/screens/DashboardScreen.tsx`
  - `ui/admin-console/src/App.tsx`
  - `ui/admin-console/src/types.ts`
  - `docs/phase3/main/platform_and_edge_low_fidelity_wireframes.md`
- No backend logic, backend contract, or UI implementation was changed.

## Known Gaps
- The dashboard screen still does not consume most of the `snapshot` payload in its current rendering.
- The screen-level action buttons remain non-functional in the current implementation.
- The Phase 3 main markdown file shows terminal encoding noise, so future document drafting should continue to prioritize source structure and current code behavior over console rendering.

## Next Step
- Continue with the `projects` screen documentation package using the same two-file structure and explicitly describe its relation to `cases`, catalog persistence, and existing local-admin-api write boundaries.

## 2026-04-20 Dashboard Interface Spec Regenerated From Full Phase 3 Main Docs

## Task
- Read all documents under `docs/phase3/main`.
- Re-understand the backend project construction and the Phase 3 interface layering.
- Regenerate `docs/phase3/interface/dashboard/interface-spec.md` so it contains detailed functional design for each relevant interface instead of only a shallow current-state summary.

## Completed
- Re-scanned and aligned against all 9 files under `docs/phase3/main`.
- Re-read the backend structure and interface-related sections from:
  - `enterprise_web_test_platform_implementation_design.md`
  - `enterprise_web_test_platform_tech_design.md`
  - `enterprise_web_test_platform_java_core_code_skeleton.md`
  - `edge_extension_native_messaging_protocol_detailed_design.md`
  - `edge_extension_typescript_protocol_and_code_skeleton.md`
  - `platform_and_edge_low_fidelity_wireframes.md`
  - `platform_ui_prototype_and_interaction_design_phase3_5.md`
  - `react_page_skeleton_prompt_guide.md`
  - `cdp_domain_encapsulation_detailed_design.md`
- Cross-checked the current repo implementation for the real Phase 3 endpoints in:
  - `apps/local-admin-api/.../LocalAdminApiServer.java`
  - `apps/local-admin-api/.../Phase3MockDataService.java`
  - `apps/local-admin-api/.../SchedulerPersistenceService.java`
  - `apps/local-admin-api/.../ConfigPersistenceService.java`
  - `apps/local-admin-api/.../CatalogPersistenceService.java`
  - `apps/native-host/.../LocalAdminApiBridge.java`
- Rewrote `docs/phase3/interface/dashboard/interface-spec.md` into a detailed design document that now covers:
  - backend module construction relevant to dashboard
  - dashboard direct read interface `GET /api/phase3/admin-console`
  - detailed field-level function of the admin snapshot response
  - data precedence and fallback rules inside `Phase3MockDataService`
  - sibling mutation interfaces that indirectly change dashboard data
  - popup/native-host sibling architecture and why dashboard stays on local HTTP
  - future planned management API evolution from the main design docs
- Explicitly documented the detailed function of these relevant interfaces:
  - `GET /api/phase3/admin-console`
  - `GET /health`
  - `POST /api/phase3/scheduler/requests`
  - `POST /api/phase3/scheduler/events`
  - `POST /api/phase3/config/model`
  - `POST /api/phase3/config/environment`
  - `POST /api/phase3/catalog/project`
  - `POST /api/phase3/catalog/case`
  - sibling `GET /api/phase3/extension-popup`

## Modified Files
- `docs/phase3/interface/dashboard/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified by source inspection against the Phase 3 main docs and current Java/React implementation.
- No backend logic, native-host behavior, or UI implementation was changed.

## Known Gaps
- `DashboardScreen.tsx` still does not deeply map the real `AdminConsoleSnapshot` fields into the current visible UI.
- The dashboard screen still has visible buttons that are not wired.
- The full future REST API set described in the main design docs is broader than the currently implemented Phase 3 local-admin-api endpoints.

## Next Step
- Keep the same detailed method for `projects/interface-spec.md`, describing not only the direct endpoint but also the persistence model, snapshot reflection path, and related backend module ownership.

## 2026-04-20 Dashboard Interface Spec Control Mapping Supplement

## Task
- Supplement `docs/phase3/interface/dashboard/interface-spec.md` with control-level request mapping.
- Clarify what each dashboard button or visible control should request, route to, or not request at all.

## Completed
- Added a dedicated `UI Control to Interface Mapping` section into `docs/phase3/interface/dashboard/interface-spec.md`.
- Documented control-level behavior for:
  - `Refresh`
  - `New run`
  - metric cards
  - recent run rows
  - attention items
  - AI decision summary elements
  - shell-level controls that affect dashboard usage context
- Explicitly marked, for each relevant control:
  - intended interface or route
  - owning module
  - current implementation state
- Explicitly documented that the current dashboard has no local input field, select dropdown, or submit form that sends structured payloads directly.
- Recorded that later screen interface docs should keep this same control-to-interface mapping structure.

## Modified Files
- `docs/phase3/interface/dashboard/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against the current `DashboardScreen.tsx` implementation and the updated interface spec.
- No UI or backend implementation was changed.

## Next Step
- Reuse the same control-level mapping format for `projects` and `cases`, where buttons, dropdowns, and save actions already have real request ownership.

## 2026-04-20 Dashboard Functional Spec Review-Depth Supplement

## Task
- Re-check `docs/phase3/interface/dashboard/functional-spec.md` after strengthening the interface document.
- Align the functional document to the same review depth so it explains not only page purpose but also screen inputs, outputs, and control responsibilities.

## Completed
- Supplemented `docs/phase3/interface/dashboard/functional-spec.md` with:
  - `Screen Inputs and Outputs`
  - `Functional Control Responsibility Matrix`
- Clarified what the dashboard takes from the shell as upstream input.
- Clarified that dashboard currently produces guidance and navigation intent rather than direct business-state mutation.
- Added function-level responsibility descriptions for:
  - `Refresh`
  - `New run`
  - summary cards
  - recent run rows
  - attention items
  - AI decision summary elements
- Kept all additions documentation-only and consistent with the current implementation freeze.

## Modified Files
- `docs/phase3/interface/dashboard/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against the current `DashboardScreen.tsx` structure and the updated dashboard interface spec.
- No UI or backend implementation was changed.

## Next Step
- Apply the same dual-structure pattern to later pages:
  - `functional-spec.md` explains function and control purpose
  - `interface-spec.md` explains request, route, ownership, and current implementation status

## 2026-04-20 Projects Interface Documentation Draft

## Task
- Continue the Phase 3 screen-documentation work with the `projects` screen.
- Keep the same review depth already established for `dashboard`.
- Generate both `functional-spec.md` and `interface-spec.md` for `docs/phase3/interface/projects`.

## Completed
- Created the screen folder `docs/phase3/interface/projects`.
- Added `docs/phase3/interface/projects/functional-spec.md`.
- Added `docs/phase3/interface/projects/interface-spec.md`.
- Documented the `projects` screen as a mixed-mode screen with:
  - front-end-composed project overview cards
  - inline detail expansion
  - real project catalog editor and save flow
- Documented the current direct interface boundaries:
  - read from `GET /api/phase3/admin-console`
  - write to `POST /api/phase3/catalog/project`
- Documented the save path in detail:
  - front-end trimming and validation
  - sequential row posting
  - local-admin-api file-backed persistence via `CatalogPersistenceService`
  - snapshot reload and UI reflection after save
- Added control-level mapping for search, card open/close, reports button, editor fields, add/remove row, and save button.
- Explicitly recorded the current placeholder controls that remain visible but unwired:
  - `Import`
  - `New project`
  - inline `Enter project`
  - inline `View reports`

## Modified Files
- `docs/phase3/interface/projects/functional-spec.md`
- `docs/phase3/interface/projects/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against:
  - `ui/admin-console/src/screens/ProjectsScreen.tsx`
  - `ui/admin-console/src/App.tsx`
  - `ui/admin-console/src/App.test.tsx`
  - `apps/local-admin-api/.../CatalogPersistenceService.java`
  - Phase 3 main docs under `docs/phase3/main`
- No UI or backend implementation was changed.

## Known Gaps
- Several project-page action buttons are still presentational and do not yet route anywhere.
- The project cards are currently a front-end view model, not a dedicated backend-native project summary contract.

## Next Step
- Continue with the `cases` screen using the same structure, because it already has richer control-state and cross-screen handoff to `execution`.

## 2026-04-20 Projects Unwired Control Implementation Design Supplement

## Task
- Stop treating unwired `projects` controls as vague placeholders.
- For each visible but currently unimplemented button, provide a concrete implementation design in the interface document.

## Completed
- Updated `docs/phase3/interface/projects/interface-spec.md` with a dedicated section for detailed implementation design of unwired controls.
- Designed `New project` to reuse the existing local row-add flow and the existing `POST /api/phase3/catalog/project` save path instead of introducing a redundant create API.
- Designed `Import` as a true new backend responsibility with two proposed endpoints:
  - `POST /api/phase3/catalog/project/import/preview`
  - `POST /api/phase3/catalog/project/import/commit`
- Designed card `Reports` and inline `View reports` as route-state handoff into `reports` with no new backend API.
- Designed inline `Enter project` as route-state handoff into `cases` with no new backend API.
- Recorded the implementation principle for later pages:
  - reuse existing interfaces when possible
  - use route-state handoff for cross-screen navigation
  - add new backend endpoints only for genuinely new backend responsibilities

## Modified Files
- `docs/phase3/interface/projects/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against the current `ProjectsScreen`, `ReportsScreen`, and `CasesScreen` structure.
- No UI or backend implementation was changed.

## Next Step
- Apply the same rule to later pages: every unwired button or dropdown must either map to an existing route/interface or receive a concrete new interface design in the document.

## 2026-04-20 Dashboard Unwired Control Implementation Design Supplement

## Task
- Re-check whether `dashboard` still had unwired controls documented only at the ��should�� level.
- Upgrade those controls to the same concrete implementation-design standard already applied to `projects`.

## Completed
- Updated `docs/phase3/interface/dashboard/interface-spec.md` with a dedicated detailed implementation design section for unwired controls.
- Designed `Refresh` to reuse the existing shell snapshot reload path via `loadSnapshot()` and `GET /api/phase3/admin-console`.
- Designed `New run` as route-state handoff into `execution`, with write ownership remaining on the execution flow.
- Designed recent run rows as route-state handoff into `reportDetail` by reusing `openReportDetail(runName)`.
- Designed attention-item click behavior using machine-readable target metadata and route-state handoff into `reportDetail`, `monitor`, `dataDiff`, or `models`.
- Designed AI summary/provider-chip clicks as route-state handoff into `models`, with optional provider focus state.
- Kept the rule consistent with `projects`: no new backend endpoint is introduced unless the control creates a new backend responsibility.

## Modified Files
- `docs/phase3/interface/dashboard/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against the current `DashboardScreen.tsx` and existing `App.tsx` route/state helpers.
- No UI or backend implementation was changed.

## Next Step
- Continue applying this rule to all later screens: placeholder controls must receive either a concrete route-state design, a concrete reuse-of-existing-interface design, or a concrete new API design.
## 2026-04-20 Cases Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `cases` screen.
- Keep the same depth as `dashboard` and `projects`, including control-level functional design and concrete interface design for currently unwired controls.

## Completed
- Generated `docs/phase3/interface/cases/functional-spec.md`.
- Generated `docs/phase3/interface/cases/interface-spec.md`.
- Documented the current visible screen as a project-scoped case overview plus lower detail canvas.
- Recorded that the only real outward action currently implemented on the screen is `Pre-execution`, and that it performs app-state handoff only rather than sending a backend request.
- Documented the already implemented shell-level case persistence path through `POST /api/phase3/catalog/case`, while also making clear that the current `CasesScreen.tsx` does not expose the editor UI that would invoke it.
- Added control-level implementation design for currently unwired controls:
  - `Edit DSL`
  - `State machine`
  - detail tabs (`Overview`, `DSL`, `State machine`, `Plans`, `History`)
  - `Recent runs` drill-down behavior
- Proposed concrete new interfaces for deeper case artifacts that are implied by the UI and the Phase 3 main docs:
  - `GET /api/phase3/cases/{caseId}/dsl`
  - `POST /api/phase3/cases/{caseId}/dsl/validate`
  - `PUT /api/phase3/cases/{caseId}/dsl`
  - `GET /api/phase3/cases/{caseId}/state-machine`
  - `GET /api/phase3/cases/{caseId}/plans`
  - `GET /api/phase3/cases/{caseId}/history`

## Modified Files
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/CasesScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` handlers for `handlePrepareCase()` and case save flow.
- Verified against `ui/admin-console/src/App.test.tsx` for the pre-execution-to-execution handoff behavior.
- Verified against `apps/local-admin-api` case catalog endpoint registration and `CatalogPersistenceService.upsertCase()`.
- No UI or backend implementation was changed.

## Next Step
- Continue with `execution`, because it is the downstream owner of the prepared-case handoff and the first screen with real scheduler request/event mutations plus richer visible controls.
## 2026-04-20 Execution Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `execution` screen.
- Keep the same depth as earlier pages, including control-level function description and concrete interface design for any visible but unwired controls.

## Completed
- Generated `docs/phase3/interface/execution/functional-spec.md`.
- Generated `docs/phase3/interface/execution/interface-spec.md`.
- Documented the current screen as the first true scheduler-mutation workspace in the Phase 3 admin shell.
- Documented the real implemented split between:
  - `Run` -> `POST /api/phase3/scheduler/requests`
  - `Execution` -> `POST /api/phase3/scheduler/events`
  - `Open Audit` -> `POST /api/phase3/scheduler/events`
- Documented that prepared cases are app-state input from `cases`, not a backend read owned by `execution`.
- Documented that compare-template selection is currently driven by front-end seeded `dataTemplates`, not a true backend-backed catalog.
- Added control-level implementation design for currently unwired execution controls:
  - header execution-contract hint button
  - queue row drill-down
  - prepared-case card drill-down
- Added future interface design where a real backend responsibility is implied:
  - `GET /api/phase3/data-templates`
  - `GET /api/phase3/runs/{runId}/status`

## Modified Files
- `docs/phase3/interface/execution/functional-spec.md`
- `docs/phase3/interface/execution/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/ExecutionScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` scheduler mutation handlers and execution gating logic.
- Verified against `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`.
- No UI or backend implementation was changed.

## Next Step
- Continue with `monitor`, because it is the direct downstream screen for the execution flow and should consume the scheduler/request-event context documented here.
## 2026-04-20 Monitor Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `monitor` screen.
- Keep the same depth as the previous pages, including explicit interface design for visible but currently unwired runtime-control buttons.

## Completed
- Generated `docs/phase3/interface/monitor/functional-spec.md`.
- Generated `docs/phase3/interface/monitor/interface-spec.md`.
- Documented the current screen as a runtime-monitoring shell rather than a true live-data page.
- Documented that the current monitor implementation uses only shallow snapshot context while almost all runtime detail is local placeholder data.
- Recorded the major current gap that `execution -> monitor` is only a generic screen switch and does not carry a specific `runId` route state.
- Added detailed interface design for the monitor capabilities implied by the current UI and Phase 3 docs:
  - `GET /api/phase3/runs/{runId}/status`
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/runtime-log`
  - `GET /api/phase3/runs/{runId}/live-page`
  - `POST /api/phase3/runs/{runId}/pause`
  - `POST /api/phase3/runs/{runId}/abort`
- Added concrete implementation design for currently unwired monitor controls:
  - `Pause`
  - `Abort`
  - step-row drill-down
  - runtime-log drill-down

## Modified Files
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/monitor/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/MonitorScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` monitor routing entry.
- Verified against the current scheduler request/event architecture and Phase 3 runtime-monitor design docs.
- No UI or backend implementation was changed.

## Next Step
- Continue with `reports`, because it is the downstream list page for runs started from `execution` and monitored in `monitor`.
## 2026-04-20 Reports Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `reports` screen.
- Keep the same depth as earlier pages, and explicitly separate backend-owned report fields from front-end-derived list-summary fields.

## Completed
- Generated `docs/phase3/interface/reports/functional-spec.md`.
- Generated `docs/phase3/interface/reports/interface-spec.md`.
- Documented the current page as a project-first run browsing page with real route-state handoff into `reportDetail`.
- Documented the current control surface:
  - overview collapse
  - project switch
  - `Detail`
  - display-only operator timeline
- Documented the most important interface boundary on this page: the report rows are currently built from front-end-derived `ReportViewModel` data rather than a stable backend-native report-list contract.
- Recorded which list-row fields are synthesized or heuristically inferred in `reportViewModel.ts`, including:
  - project/case matching
  - environment
  - operator
  - model
  - duration
  - step/assertion statistics
  - AI call/cost summaries
- Added concrete future report interface design for:
  - `GET /api/phase3/runs`
  - `GET /api/phase3/runs/{runId}/report-summary`
  - `GET /api/phase3/runs/{runId}/report`
- Added route-state drill-down design for future actionable timeline items.

## Modified Files
- `docs/phase3/interface/reports/functional-spec.md`
- `docs/phase3/interface/reports/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/ReportsScreen.tsx`.
- Verified against `ui/admin-console/src/screens/reportViewModel.ts`.
- Verified against `ui/admin-console/src/App.tsx` selected-run routing into `reportDetail`.
- Verified against the main design docs that describe run/report endpoints and report artifact layout.
- No UI or backend implementation was changed.

## Next Step
- Continue with `reportDetail`, because it is now the main downstream detail page for the run selected in `reports`.
## 2026-04-20 ReportDetail Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `reportDetail` screen.
- Keep the same depth as previous pages, and clearly separate current synthetic detail rendering from the future true report-artifact interfaces.

## Completed
- Generated `docs/phase3/interface/reportDetail/functional-spec.md`.
- Generated `docs/phase3/interface/reportDetail/interface-spec.md`.
- Documented the current page as the one-run downstream detail page entered from `reports`.
- Documented the current real interactions:
  - back to `reports`
  - `Data diff` handoff
- Documented the current visible but unwired controls:
  - `Download artifacts`
  - `Re-run`
  - tabs other than `Data diff`
- Documented that the page still renders detail content from the synthetic `selectReportViewModel(...)` layer rather than true backend-owned report artifact payloads.
- Added concrete future interface design for:
  - `GET /api/phase3/runs/{runId}/report`
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/assertions`
  - `GET /api/phase3/runs/{runId}/recovery`
  - `GET /api/phase3/runs/{runId}/ai-decisions`
  - `GET /api/phase3/runs/{runId}/artifacts`
- Added detailed implementation design for:
  - artifact download flow
  - route-state re-run handoff into `execution`
  - local tab state plus tab-specific report interfaces

## Modified Files
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/ReportDetailScreen.tsx`.
- Verified against `ui/admin-console/src/screens/reportViewModel.ts`.
- Verified against `ui/admin-console/src/App.tsx` route-state handoff to `reports` and `dataDiff`.
- Verified against the Phase 3 main docs that describe run report interfaces and `report.json` / `report.html` outputs.
- No UI or backend implementation was changed.

## Next Step
- Continue with `dataDiff`, because it is the currently actionable downstream tab from `reportDetail`.
## 2026-04-20 DataDiff Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `dataDiff` screen.
- Keep the same depth as previous pages, and explicitly separate the current synthetic comparison table from the future real run-diff interfaces.

## Completed
- Generated `docs/phase3/interface/dataDiff/functional-spec.md`.
- Generated `docs/phase3/interface/dataDiff/interface-spec.md`.
- Documented the current page as the one-run before/after/after_restore comparison screen entered from `reportDetail`.
- Documented that the current diff table is generated by local helper `makeDiffRows(report)` and is therefore synthetic rather than backend-owned.
- Documented the current shallow context dependency on:
  - `selectedRunName`
  - `selectReportViewModel(...)`
  - `snapshot.environmentConfig[0]`
- Documented the visible but unwired controls:
  - `View raw JSON`
  - `Re-restore`
- Added concrete future interface design for:
  - `GET /api/phase3/runs/{runId}/data-diff`
  - `GET /api/phase3/runs/{runId}/data-diff/raw`
  - `GET /api/phase3/runs/{runId}/restore-result`
  - `POST /api/phase3/runs/{runId}/restore/retry`
- Added detailed implementation design for a local raw-json drawer and restore-retry flow.

## Modified Files
- `docs/phase3/interface/dataDiff/functional-spec.md`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/DataDiffScreen.tsx`.
- Verified against `ui/admin-console/src/screens/reportViewModel.ts` and `App.tsx` run-selection handoff into `dataDiff`.
- Verified against the Phase 3 wireframes and design docs that describe before / after / after_restore comparison and restore-result concepts.
- No UI or backend implementation was changed.

## Next Step
- Continue with `docParse`, because it is the next major upstream entry screen in the document-driven workflow.
## 2026-04-20 DocParse Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `docParse` screen.
- Keep the same depth as previous pages, and explicitly separate real route-state handoff from synthetic document/parse placeholder data.

## Completed
- Generated `docs/phase3/interface/docParse/functional-spec.md`.
- Generated `docs/phase3/interface/docParse/interface-spec.md`.
- Documented the current page as the document-ingestion and parse-review screen upstream of `aiGenerate`.
- Documented the current real interactions:
  - project switch
  - document detail open
  - tab switching
  - route-state `Generate tests` handoff into `aiGenerate`
- Documented the visible but unwired controls:
  - `Re-parse`
  - `Manual edit`
  - real backend upload
- Documented that the current document catalog, parse result, raw source, and version history are synthetic front-end data created by `buildDocuments(snapshot)`.
- Added concrete future interface design for:
  - `GET /api/phase3/documents`
  - `POST /api/phase3/documents/upload`
  - `GET /api/phase3/documents/{documentId}/parse-result`
  - `GET /api/phase3/documents/{documentId}/raw`
  - `GET /api/phase3/documents/{documentId}/versions`
  - `POST /api/phase3/documents/{documentId}/reparse`
  - `PUT /api/phase3/documents/{documentId}/parse-result`

## Modified Files
- `docs/phase3/interface/docParse/functional-spec.md`
- `docs/phase3/interface/docParse/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/DocParseScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` route-state handoff into `aiGenerate`.
- Verified against the Phase 3 main docs that describe parser/domain separation and admin API boundaries.
- No UI or backend implementation was changed.

## Next Step
- Continue with `aiGenerate`, because it is the immediate downstream screen for parsed-document generation review.
## 2026-04-20 AiGenerate Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `aiGenerate` screen.
- Keep the same depth as previous pages, and explicitly separate real route-state input from synthetic generation-review placeholder artifacts.

## Completed
- Generated `docs/phase3/interface/aiGenerate/functional-spec.md`.
- Generated `docs/phase3/interface/aiGenerate/interface-spec.md`.
- Documented the current page as the generation-review screen between `docParse` and future `cases` / `execution` handoff.
- Documented the current real interaction:
  - generated candidate tab switching
- Documented the current visible but unwired controls:
  - `Regenerate`
  - `Dry-run`
  - `Save as case`
- Documented that the current flow tree, state machine, and DSL surfaces are local placeholder artifacts rather than backend-generated outputs.
- Added concrete future interface design for:
  - `POST /api/phase3/agent/generate-case`
  - `POST /api/phase3/cases/dsl/validate`
  - `POST /api/phase3/agent/generate-case/dry-run`
  - generated-case submission shape reusing `POST /api/phase3/catalog/case`
- Clarified the upstream route-state contract from `docParse` and the fallback dependence on `GET /api/phase3/admin-console` when no focus exists.

## Modified Files
- `docs/phase3/interface/aiGenerate/functional-spec.md`
- `docs/phase3/interface/aiGenerate/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/AiGenerateScreen.tsx`.
- Verified against `ui/admin-console/src/screens/DocParseScreen.tsx` and `ui/admin-console/src/App.tsx` focus handoff logic.
- Verified against the Phase 3 main docs that describe agent-generated-case, DSL parser/validator, and case-catalog responsibilities.
- No UI or backend implementation was changed.

## Next Step
- Continue with `dataTemplates` or the next remaining screen in the Phase 3 workflow map.
## 2026-04-20 DataTemplates Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `dataTemplates` screen.
- Keep the same depth as previous pages, and clearly separate current local seeded template data from the future backend-owned template registry.

## Completed
- Generated `docs/phase3/interface/dataTemplates/functional-spec.md`.
- Generated `docs/phase3/interface/dataTemplates/interface-spec.md`.
- Documented the current page as the reusable test-data-template catalog and safety-review screen.
- Documented the current real interaction:
  - template-row selection
- Documented the current visible but unwired controls:
  - `Import`
  - `New template`
  - `Edit`
  - `Dry-run`
- Documented that the page is currently driven by local `defaultDataTemplates` seeded in `App.tsx` rather than backend registry data.
- Documented the critical cross-screen coupling that `execution` currently consumes the same local template list directly.
- Added concrete future interface design for:
  - `GET /api/phase3/data-templates`
  - `GET /api/phase3/data-templates/{templateId}`
  - `POST /api/phase3/data-templates`
  - `PUT /api/phase3/data-templates/{templateId}`
  - `POST /api/phase3/data-templates/import/preview`
  - `POST /api/phase3/data-templates/import/commit`
  - `POST /api/phase3/data-templates/{templateId}/dry-run`

## Modified Files
- `docs/phase3/interface/dataTemplates/functional-spec.md`
- `docs/phase3/interface/dataTemplates/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/DataTemplatesScreen.tsx`.
- Verified against `ui/admin-console/src/screens/ExecutionScreen.tsx` and `ui/admin-console/src/App.tsx` shared template consumption.
- Verified against the Phase 3 wireframes plus the Phase 4/5 template-registry design docs referenced from the Phase 3 prompt guide.
- No UI or backend implementation was changed.

## Next Step
- Continue with `models`, `environments`, or `plugin` among the remaining screen packages.
## 2026-04-20 Models Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `models` screen.
- Keep the same depth as previous pages, and clearly separate real config persistence from local-only provider draft editing and local-only test actions.

## Completed
- Generated `docs/phase3/interface/models/functional-spec.md`.
- Generated `docs/phase3/interface/models/interface-spec.md`.
- Documented the current page as the AI provider and routing-policy configuration screen.
- Documented the current real interactions:
  - provider add/edit/delete in local draft state
  - footer `Save model config`
- Documented the current visible but unwired control:
  - routing-rule edit icon
- Documented that provider connection testing is currently only a local front-end field-presence check, not a backend reachability test.
- Documented the current persistence contract:
  - read from `GET /api/phase3/admin-console`
  - repeated `POST /api/phase3/config/model`
  - file-backed write into `config/phase3/model-config.json`
- Added concrete future interface design for:
  - `POST /api/phase3/config/model/test-connection`
  - `GET /api/phase3/models`
  - `PUT /api/phase3/models`
  - routing-rule edit flow reusing the current config save pipeline

## Modified Files
- `docs/phase3/interface/models/functional-spec.md`
- `docs/phase3/interface/models/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/ModelConfigScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` provider/routing parsing, save serialization, and local test logic.
- Verified against `apps/local-admin-api` config persistence and snapshot reload behavior.
- No UI or backend implementation was changed.

## Next Step
- Continue with `environments`, because it shares the same config persistence pattern and complementary governance scope.
## 2026-04-20 Environments Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `environments` screen.
- Keep the same depth as previous pages, and clearly separate the current datasource-management implementation from the broader environment domain named by the navigation item.

## Completed
- Generated `docs/phase3/interface/environments/functional-spec.md`.
- Generated `docs/phase3/interface/environments/interface-spec.md`.
- Documented the current page as the datasource/database configuration screen that currently sits under the `environments` navigation label.
- Documented the current real interactions:
  - create database
  - edit database
  - immediate save
  - immediate delete
- Documented the current local-only test actions:
  - card `Test connection`
  - dialog `Test connection`
- Documented the current persistence contract:
  - read from `GET /api/phase3/admin-console`
  - repeated `POST /api/phase3/config/environment`
  - file-backed write into `config/phase3/environment-config.json`
- Documented the important scope gap that the page name suggests full environment management, but the actual UI only manages datasource/database configs.
- Added concrete future interface design for:
  - `GET /api/phase3/datasources`
  - `PUT /api/phase3/datasources`
  - `POST /api/phase3/datasources/test-connection`
  - `GET /api/phase3/environments`

## Modified Files
- `docs/phase3/interface/environments/functional-spec.md`
- `docs/phase3/interface/environments/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/DatabaseConfigScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` datasource parsing, immediate save flow, and local test logic.
- Verified against `apps/local-admin-api` config persistence and snapshot reload behavior.
- No UI or backend implementation was changed.

## Next Step
- Continue with `plugin`, because it is the last major standalone Phase 3 screen package not yet documented.
## 2026-04-20 Plugin Screen Classification Note

## Clarification
- `plugin` is not a normal platform business screen.
- It should be treated as the Edge extension front-end template shell used for the Edge plugin UI.
- Future `plugin` documentation should therefore focus on:
  - popup/template UI responsibilities
  - extension-side controls
  - native-messaging and local-platform boundaries
  - assistive entry behavior rather than platform catalog/config management

## Impact
- The remaining `plugin` documentation package should be written with extension-template positioning, not admin-console business-page positioning.
## 2026-04-20 Plugin Documentation Package

## Task
- Continue the Phase 3 screen-documentation stage with the `plugin` screen.
- Treat `plugin` as the Edge extension front-end template shell rather than as a normal platform business page.

## Completed
- Generated `docs/phase3/interface/plugin/functional-spec.md`.
- Generated `docs/phase3/interface/plugin/interface-spec.md`.
- Documented the current page as the Edge extension popup/front-end template shell.
- Documented the intended popup responsibilities:
  - current page summary
  - active run visibility
  - quick actions
  - pick mode and locator candidates
  - handoff into the full platform
- Documented that all current controls are still static/demo controls.
- Documented the key current contract mismatch:
  - `PluginPopupScreen.tsx` still consumes `AdminConsoleSnapshot`
  - while local-admin-api already exposes `GET /api/phase3/extension-popup`
- Added concrete future interface design for:
  - `GET /api/phase3/extension-popup`
  - `EXT_PAGE_SUMMARY_GET` / `PAGE_SUMMARY_GET`
  - `PAGE_HIGHLIGHT`
  - `EXT_EXECUTION_START` / `EXECUTION_START`
  - `EXECUTION_STATUS_GET`
  - `ENVIRONMENTS_GET`
  - `DATASOURCES_GET`
- Clarified that quick actions and pick-mode controls should map primarily to extension/background/native-message interfaces rather than standard admin-console REST mutations.

## Modified Files
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/plugin/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified against `ui/admin-console/src/screens/PluginPopupScreen.tsx`.
- Verified against `ui/admin-console/src/App.tsx` current screen wiring.
- Verified against `apps/local-admin-api` popup snapshot endpoint and `ExtensionPopupSnapshot` model.
- Verified against the Phase 3 extension native-messaging and TypeScript protocol design docs.
- No UI or backend implementation was changed.

## Next Step
- Review remaining uncovered screens or do a cross-screen consistency pass across all generated interface packages.
## 2026-04-20 Cross-Screen Consistency Pass

## Task
- Perform a cross-screen consistency review across the generated `docs/phase3/interface/*` packages.
- Check for mismatched screen positioning, conflicting cross-screen handoff descriptions, and inconsistent interface ownership wording.

## Completed
- Reviewed the generated interface packages together for:
  - screen-role consistency
  - current vs future implementation labeling
  - route-state and handoff descriptions
  - interface ownership boundaries
- Corrected one wording inconsistency in `docs/phase3/interface/plugin/interface-spec.md` so the current shell is clearly described as reading from `GET /api/phase3/admin-console` today while still reserving `GET /api/phase3/extension-popup` as the dedicated popup contract.
- Did not find any new major cross-package contract conflicts beyond previously recorded review items.

## Residual Review Items
- `execution -> monitor` still lacks explicit `runId` handoff.
- `plugin` still conceptually targets `ExtensionPopupSnapshot`, but the current screen wiring still uses `AdminConsoleSnapshot`.

## Modified Files
- `docs/phase3/interface/plugin/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified by cross-reading the generated interface packages and checking the current screen wiring and app-level state handoffs.
- No UI or backend implementation was changed.

## Next Step
- If needed, continue with a second-pass normalization of naming, section wording, and route-state payload examples across all interface documents.
## 2026-04-20 Second-Pass Terminology Normalization

## Task
- Continue the cross-screen consistency cleanup.
- Normalize wording so current implemented shared App-state transitions are not mislabeled as formal route-state navigation.

## Completed
- Updated the generated docs to use:
  - `App-level handoff`
  - `App-level focus handoff`
  - `App-level selected-run handoff`
  for currently implemented cross-screen state transitions managed by `App.tsx`.
- Kept `route-state` wording only for future design proposals where navigation payload design is still hypothetical.
- Applied this normalization to:
  - `docParse`
  - `aiGenerate`
  - `reports`
  - `reportDetail`
  - `dataDiff`
- This makes the current implementation layer more accurate and better separated from future navigation/interface design.

## Modified Files
- `docs/phase3/interface/docParse/functional-spec.md`
- `docs/phase3/interface/docParse/interface-spec.md`
- `docs/phase3/interface/aiGenerate/functional-spec.md`
- `docs/phase3/interface/aiGenerate/interface-spec.md`
- `docs/phase3/interface/reports/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified by re-reading the affected documents against the current `App.tsx` screen-switch and shared-state implementation.
- No UI or backend implementation was changed.

## Next Step
- If needed, continue with a third-pass cleanup for payload example consistency and endpoint naming style across all interface documents.
## 2026-04-20 Third-Pass Payload and Naming Normalization

## Task
- Continue the documentation consistency cleanup.
- Normalize interface-summary wording and make `runName` vs `runId` usage explicit in the run-centric documents.

## Completed
- Normalized remaining summary bullets toward:
  - `current direct read source`
  - `current direct write source`
- Added identifier notes in the run-centric interface documents to clarify that:
  - the current UI often selects runs by `runName`
  - future backend endpoints should use canonical `{runId}` path parameters
  - transition code may temporarily map `runName` to `runId`
- Applied this cleanup to:
  - `reports`
  - `reportDetail`
  - `dataDiff`
  - `execution`
  - `projects`

## Modified Files
- `docs/phase3/interface/reports/interface-spec.md`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `docs/phase3/interface/execution/interface-spec.md`
- `docs/phase3/interface/projects/interface-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Verified by re-reading the affected interface summaries and run-centric endpoint sections for terminology consistency.
- No UI or backend implementation was changed.

## Next Step
- The generated interface package set is now materially more consistent; next work can shift from normalization to review, export, or gap tracking.
## 2026-04-20 UI Control / Interface Overview File

## Task
- Create one root-level overview file under `docs/phase3/interface` that summarizes all screens and all button/dropdown-like controls with their current and future interface mappings.

## Completed
- Generated `docs/phase3/interface/ui-control-interface-overview.md`.
- Consolidated all documented screens into one review file.
- For each screen, summarized:
  - buttons
  - selects / dropdowns / multi-selects
  - clickable row/card controls
  - tab controls where they behave as actionable navigation controls
- For each control, recorded:
  - current behavior
  - current request or App-level handoff
  - future interface design when not yet implemented
- Included an immediate review-focus section for the highest-signal unresolved controls across the package.

## Modified Files
- `docs/phase3/interface/ui-control-interface-overview.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Built from the already-generated per-screen `functional-spec.md` and `interface-spec.md` documents to keep the overview aligned with the detailed screen packages.
- No UI or backend implementation was changed.

## Next Step
- The documentation set is now ready for unified review using the single overview file plus the per-screen deep-dive folders.
## 2026-04-20 Interface Review Backlog Consolidation

## Task
- Convert the generated per-screen documentation package into one implementation-ready review backlog.

## Completed
- Generated `docs/phase3/interface/review-backlog.md`.
- Consolidated the highest-signal unresolved items into prioritized backlog buckets:
  - P0 runtime chain
  - P1 report / AI generation / template-registry / connection-test gaps
  - P2 dashboard / projects / cases / docParse wiring gaps
- Captured each backlog item with:
  - affected screens
  - current gap
  - required interface design
  - acceptance target
- Added cross-screen dependency notes and a suggested implementation order for the next post-review build phase.

## Modified Files
- `docs/phase3/interface/review-backlog.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Built by reconciling the already-generated per-screen interface documents with `docs/phase3/interface/ui-control-interface-overview.md`.
- No UI or backend implementation was changed.

## Next Step
- Use `review-backlog.md` as the primary implementation sequencing file once the documentation package passes review.

---

# Task: P0-1 execution → monitor runId handoff

## Completed
- 2026-04-20

## Summary
Implemented canonical `runId` handoff from `execution` screen to `monitor` screen, closing the first P0 backlog item.

### Changes
- **App.tsx**: Added `selectedMonitorRunId` state; added `openMonitor(runId)` helper that always explicitly sets state (truthy → runId, falsy → null, no stale leakage); updated `ExecutionScreen.onOpenMonitor` to call `openMonitor(launchForm.runId)`; passed `selectedRunId` prop to `MonitorScreen`.
- **MonitorScreen.tsx**: Added `selectedRunId` optional prop; replaced hardcoded `"run_8f2a1c3e"` with `selectedRunId ?? null`. No unreliable workQueue-title fallback. When null: shows "(no run selected)" breadcrumb + idle badge.

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `memory.txt`
- `01_dev_progress.md`

### Design decisions
- sidebar → monitor = "no run selected" general entry (handleScreenChange explicitly clears selectedMonitorRunId to null)
- execution → monitor = "run-context entry" via openMonitor(launchForm.runId)
- openMonitor always explicitly writes state; empty/whitespace runId → null, preventing stale run leakage
- No unreliable workQueue-title-parse fallback; canonical runId source is clean

## Verification
- `npm run build` — passed (tsc + vite, 0 errors)
- `npm test -- --run` — 11/13 passed; 2 failures are pre-existing (verified by stash/pop on clean master, same failures)
- No new lint or type errors introduced
- Sidebar direct-click to monitor shows "(no run selected)" + idle badge correctly

## Next Step
- P0-2: Replace monitor placeholder runtime data with real runtime APIs — completed below.

---

# Task: P0-2 monitor runtime API implementation

## Completed
- 2026-04-20

## Summary
Implemented 6 new REST endpoints for run-specific runtime data and control, plus a complete front-end rewrite of MonitorScreen to consume real backend data instead of hardcoded placeholders.

### Backend changes
- **New file**: `RunStatusService.java` — derives run state from scheduler-requests.json + scheduler-events.json
- **LocalAdminApiServer.java**: Added `handleRunEndpoint()` prefix-based router for `/api/phase3/runs/{runId}/{action}`
- **LocalAdminApiApp.java**: Wired `RunStatusService` with shared `SchedulerPersistenceService`
- **LocalAdminApiServerTest.java**: Updated all 6 constructor calls to include `RunStatusService`

### New endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/phase3/runs/{runId}/status` | Run status, progress, counters, control flags |
| GET | `/api/phase3/runs/{runId}/steps` | Step timeline (real STEP_* events or backend-generated placeholders) |
| GET | `/api/phase3/runs/{runId}/runtime-log` | Non-step events as runtime log |
| GET | `/api/phase3/runs/{runId}/live-page` | Current page state and highlight |
| POST | `/api/phase3/runs/{runId}/pause` | Writes PAUSED event after state validation |
| POST | `/api/phase3/runs/{runId}/abort` | Writes ABORTED event after state validation |

### Frontend changes
- **MonitorScreen.tsx**: Complete rewrite — fetches 4 read endpoints in parallel when selectedRunId is set; handles idle/loading/error/loaded states; Pause/Abort wired to real POST endpoints; refreshes after control actions
- **App.tsx**: Passes `apiBaseUrl`, `onPauseRun`, `onAbortRun` to MonitorScreen
- **types.ts**: Added RunStatus, RunStep, RunStepsResponse, RuntimeLogEntry, RuntimeLogResponse, LivePage, RunControlResponse

### Pause/abort semantics
- Validates current run state before accepting control actions
- Terminal runs (OK/FAILED/ABORTED) reject pause/abort with status message
- Already-paused runs reject duplicate pause
- Writes real scheduler events visible in subsequent status reads

## Modified Files
- NEW: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/types.ts`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- `npm run build` — passed (tsc + vite, 0 errors)
- `npm test -- --run` — 11/13 passed (same 2 pre-existing failures)
- `mvn compile -pl apps/local-admin-api -am` — passed
- `mvn package -pl apps/local-admin-api -am` (including tests) — passed
- End-to-end curl test against running local-admin-api:
  - GET status → correct status derived from scheduler events
  - GET steps → placeholder steps returned (no STEP_* events)
  - GET runtime-log → real scheduler events returned as log entries
  - POST pause → ACCEPTED, writes PAUSED event
  - GET status after pause → status=PAUSED, canPause=false
  - GET live-page → correct page state derived from request data

## Known Limitations
- Steps return backend-generated placeholders when no STEP_* events exist (needs real execution engine)
- Live-page has no real screenshot (screenshotPath: null)
- Counters (assertions, AI calls, heals) require typed events from execution engine
- These are inherent "no real execution engine producing events" limitations, not interface design gaps

## Next Step
- P0-3: Replace plugin admin-console snapshot dependency with dedicated popup contract
## 2026-04-20 P0-2 Runtime API Review Hold

## Task
- Review the newly implemented P0-2 monitor runtime API changes and determine whether they are ready for next-step handoff and commit.

## Completed
- Reviewed the latest backend + frontend runtime monitor implementation in:
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
  - `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
  - `ui/admin-console/src/App.tsx`
  - `ui/admin-console/src/screens/MonitorScreen.tsx`
  - `ui/admin-console/src/types.ts`
- Confirmed the implementation direction is correct overall: runtime read endpoints exist, monitor now fetches real data, and control buttons are wired.
- Identified 2 blocking review findings that prevent approval:
  - control endpoints currently always return HTTP 202, so the front end treats rejected pause/abort operations as success
  - `abortRun()` does not reject terminal statuses (`OK` / `SUCCESS` / `FAILED` / `ERROR`) and can still append an `ABORTED` event to an already finished run

## Remaining Work
- Fix backend control-result semantics for:
  - `POST /api/phase3/runs/{runId}/pause`
  - `POST /api/phase3/runs/{runId}/abort`
- Ensure the frontend parses control results correctly and does not report rejected actions as success.
- Add or update tests covering:
  - abort on terminal run
  - rejected control action response handling
- Re-run review after the above fixes before commit.

## Verification
- Review-only step; no code changes were made in this pass.

## Next Step
- Wait for the two blocking control-flow bugs to be fixed, then perform one more review. If clean, provide the next-step development prompt and commit the code.

## 2026-04-21 P0-2 Runtime API Final Review and Approval

## Task
- Re-read the Phase 3 document set under `docs/phase3`.
- Review the fixed P0-2 monitor runtime API implementation after the blocking control-flow bugs were addressed.
- If clean, approve the changes, define the next development prompt, and commit the code.

## Phase 3 Understanding
- Current stage: Phase 3 interface integration.
- Authoritative sequencing file: `docs/phase3/interface/review-backlog.md`.
- Current P0 chain:
  - P0-1 execution -> monitor canonical `runId` handoff: completed.
  - P0-2 monitor runtime APIs: now reviewed and approved.
  - P0-3 plugin dedicated popup contract: next.
- The platform remains the main control surface.
- The Edge plugin must remain lightweight and assistive.

## Review Result
- Approved P0-2 after the fixes.
- The previous blocking findings are resolved:
  - `POST /api/phase3/runs/{runId}/pause` and `/abort` no longer always return HTTP 202.
  - Accepted control actions return HTTP 202 with `status = ACCEPTED`.
  - Rejected control actions return HTTP 409 with `status = REJECTED` or `ALREADY_*`.
  - `RunStatusService.abortRun()` rejects terminal run statuses and does not append invalid `ABORTED` events.
  - The frontend throws/display errors for non-accepted control responses instead of reporting rejected actions as success.

## Additional Review Hardening
- Strengthened backend test coverage so terminal abort rejection now covers:
  - `OK`
  - `SUCCESS`
  - `FAILED`
  - `ERROR`
- Removed one unused test-local path variable from the same test.

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/types.ts`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test`
- Passed: `npm run build` in `ui/admin-console`
- Known pre-existing issue remains: `npm test -- --run` in `ui/admin-console` still reports 11/13 passed, with the same 2 existing failures unrelated to P0-2.

## Next Development Prompt
```text
Read the full Phase 3 document set under docs/phase3 before coding.

Current stage: Phase 3 interface integration.
P0-1 execution -> monitor runId handoff is complete.
P0-2 monitor runtime API implementation is reviewed and approved.

Start P0-3 from docs/phase3/interface/review-backlog.md:
Replace the plugin/admin-console snapshot dependency with the dedicated popup contract.

Scope:
- Keep the Edge plugin as a lightweight assistive UI, not a platform business-management page.
- Use GET /api/phase3/extension-popup as the plugin/popup read model.
- Stop treating the popup template as an AdminConsoleSnapshot consumer.
- Preserve the existing admin-console platform screens unless a minimal shared type adjustment is required.
- Do not introduce Phase 5 document-generation behavior in the plugin.

Implementation expectations:
- Re-read docs/phase3/interface/plugin/functional-spec.md.
- Re-read docs/phase3/interface/plugin/interface-spec.md.
- Re-read docs/phase3/main/edge_extension_native_messaging_protocol_detailed_design.md.
- Re-read docs/phase3/main/edge_extension_typescript_protocol_and_code_skeleton.md.
- Inspect current plugin popup implementation and any admin-console plugin template screen.
- Define the smallest type/interface split needed for ExtensionPopupSnapshot.
- Wire the plugin/popup surface to GET /api/phase3/extension-popup.
- Add or update tests/build verification.
- Update memory.txt and 01_dev_progress.md after completion.
```

## 2026-04-21 P0-3 Plugin Popup Contract Split

## Task
- Replace the plugin/admin-console snapshot dependency with the dedicated popup contract `GET /api/phase3/extension-popup`.
- Keep the Edge plugin as a lightweight assistive UI.

## Completed
- Added `ExtensionPopupSnapshot` TypeScript type to `types.ts`, matching the Java `ExtensionPopupSnapshot` record shape:
  - `generatedAt`, `status`, `summary`
  - `page { title, url, domain, lastUpdatedAt }`
  - `runtime { mode, queueState, auditState, nextAction }`
  - `hints: string[]`
- Rewrote `PluginPopupScreen.tsx`:
  - Props changed from `{ snapshot: AdminConsoleSnapshot, title, locale }` to `{ apiBaseUrl, title, locale }`.
  - Screen now fetches `GET /api/phase3/extension-popup` on mount with loading/error/loaded state management.
  - Host connection status reflects fetch state: connecting / host unreachable / host connected.
  - Current-page section (title, path, domain) renders from popup snapshot `page` fields.
  - Active-run section renders from popup snapshot `runtime` fields (mode, queueState, auditState, nextAction).
  - Running-state detection derives from `runtime.queueState` instead of loosely reading `workQueue[0]`.
  - Progress bar only appears when queue state indicates active running.
- Updated `App.tsx` to pass `apiBaseUrl` instead of `snapshot` for the plugin screen.
- No backend changes — `GET /api/phase3/extension-popup` already existed and serves the correct model.

## Modified Files
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.tsx`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Ran: `npm test -- --run` in `ui/admin-console` — 11/13 passed; command still exits non-zero because of 2 pre-existing failures unrelated to P0-3
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test`

## Remaining Plugin Limitations
- Quick actions, pick mode, and locator candidates remain display-only demo content.
- No real extension/native-message wiring (future work, not P0 scope).
- Page section still shows mock forms/buttons count badge — real content-script integration is post-P0.

## Next Step
- P0 chain is complete (P0-1, P0-2, P0-3).
- P1-1 is complete (aiGenerate generation flow).
- Next priority is P1 from `docs/phase3/interface/review-backlog.md`:
  - P1-2: Make report pages read real report artifacts.
  - P1-3: Add real data-template registry.
  - P1-4: Convert local-only connection tests into real validation interfaces.

---

# P1-1: Complete real aiGenerate generation flow (2026-04-21)

## Summary
Wired the docParse → aiGenerate → cases chain with real API calls. AI generates case candidates, DSL, state machine, and flow tree. Operator reviews results as drafts before committing to cases.

## Changes

### Backend
- New `AgentGenerateService.java` with three public methods:
  - `generateCase(body)` — returns generatedCases, reasoning, selectedDsl, stateMachine, flowTree (deterministic mock shaped by input)
  - `validateDsl(body)` — checks empty DSL, missing `case` block; returns VALID/INVALID with errors/warnings
  - `dryRun(body)` — validates DSL first, then returns runtime checks (restorePlanRef, comparisonPlanRef, environmentAccess)
- Registered 3 new endpoints in `LocalAdminApiServer.java` (dry-run registered before generate-case due to HttpServer prefix matching):
  - `POST /api/phase3/agent/generate-case/dry-run`
  - `POST /api/phase3/agent/generate-case`
  - `POST /api/phase3/cases/dsl/validate`
- Reuses existing `POST /api/phase3/catalog/case` for final save-as-case.
- Updated `LocalAdminApiApp.java` to inject `AgentGenerateService`.
- Updated all 7 test constructor calls in `LocalAdminApiServerTest.java`.

### Frontend
- Added P1-1 types to `types.ts`: GenerateCaseRequest, GeneratedCaseCandidate, GenerateCaseResponse, DslValidateRequest, DslValidateResponse, DryRunRequest, DryRunResponse.
- Rewrote `AiGenerateScreen.tsx`:
  - New props: `apiBaseUrl`, `onSaveSuccess`
  - `doGenerate("GENERATE"|"REGENERATE")` → POST /api/phase3/agent/generate-case
  - `doValidate()` → POST /api/phase3/cases/dsl/validate
  - `doDryRun()` → validate first, then POST /api/phase3/agent/generate-case/dry-run
  - `doSave()` → validate first, then POST /api/phase3/catalog/case, then onSaveSuccess()
  - Auto-generate on mount when focus exists via useEffect
  - Renders real state machine, flow tree, DSL from generation result
  - Shows dry-run result inline in DSL panel
  - All buttons disabled during pending states with localized loading text
- Exported `AiGenerateFocus` type from `AiGenerateScreen.tsx`; removed duplicate definition from `App.tsx`.
- Updated `App.tsx` to pass `apiBaseUrl={apiBaseUrl}` and `onSaveSuccess={loadSnapshot}` to AiGenerateScreen.
- Review hardening: save-as-case now sends generated `dsl`, `sourceDocumentId`, and `generationMeta`; catalog persistence preserves these draft fields instead of dropping the generated artifact payload.

## Modified Files
- New: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/AgentGenerateService.java`
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`
- Modified: `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- Modified: `ui/admin-console/src/types.ts`
- Modified: `ui/admin-console/src/screens/AiGenerateScreen.tsx`
- Modified: `ui/admin-console/src/App.tsx`
- Modified: `memory.txt`
- Modified: `01_dev_progress.md`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Ran: `npm test -- --run` in `ui/admin-console` — 11/13 passed; command still exits non-zero because of 2 pre-existing failures unrelated to P1-1
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test`

## Design Decisions
- AI role boundary: AI only generates/explains/suggests — never acts as executor. Generated results are reviewable drafts before saving.
- HttpServer prefix matching: `/api/phase3/agent/generate-case/dry-run` registered before `/api/phase3/agent/generate-case` to prevent prefix capture.
- `AiGenerateFocus` type deduplicated: single source of truth in `AiGenerateScreen.tsx`, imported by `App.tsx`.

---

# P1-2: Report pages read real report artifacts (2026-04-21, reviewed 2026-04-25)

## Summary
Reports / ReportDetail / DataDiff screens now consume backend report artifact APIs (`ReportArtifactService`) instead of front-end synthesized summaries. API-first with snapshot fallback pattern. Canonical `runId` flows consistently across reports → reportDetail → dataDiff.

## Changes

### Backend
- New `ReportArtifactService.java` reads real `runs/*/report.json`:
  - `listRuns()` → `GET /api/phase3/runs/` — run list with real step/assertion counts and duration
  - `getReport(runId)` → `GET /api/phase3/runs/{runId}/report` — full report with steps, assertions, artifacts
  - `getDataDiff(runId)` → `GET /api/phase3/runs/{runId}/data-diff` — reads `data-diff.json` or returns mock shaped by report status
  - `getAssertions(runId)` → `GET /api/phase3/runs/{runId}/assertions` — assertion steps extracted from report.json
  - `getArtifacts(runId)` → `GET /api/phase3/runs/{runId}/artifacts` — file listing from run directory
- `handleRunEndpoint` in `LocalAdminApiServer.java` extended to dispatch new actions alongside P0-2 monitor actions (status, steps, runtime-log, live-page, pause, abort)
- `LocalAdminApiApp.java` wires `new ReportArtifactService(reportRoot)` and passes to server constructor

### Frontend
- New types in `types.ts`: RunSummaryItem, RunListResponse, RunReportStep, RunReportAssertion, RunReportArtifact, RunReport, DataDiffRow, DataDiffResponse
- ReportsScreen: fetches `/api/phase3/runs/`, validates `Array.isArray(data.items)`, maps to ReportViewModel, falls back to snapshot
- ReportDetailScreen: fetches `/api/phase3/runs/{runId}/report`, validates `data.runId && typeof data.stepsTotal === "number"`, falls back to snapshot
- DataDiffScreen: fetches `/api/phase3/runs/{runId}/data-diff`, validates `data.runId && Array.isArray(data.rows)`, falls back to synthetic rows
- App.tsx passes `apiBaseUrl` to all three report screens

### Review Hardening (2026-04-25)
- **Security fix**: Path traversal vulnerability in `resolveRunDir()` — added `.normalize()` + `.startsWith(root)` check to prevent `../../` escape from `reportRoot`
- **Test coverage**: Added dedicated `reportArtifactEndpointsReadRealRunFiles` test covering all 5 endpoints + fallback report for nonexistent runId

## Modified Files
- New: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- Modified: `LocalAdminApiServer.java`, `LocalAdminApiApp.java`, `LocalAdminApiServerTest.java`
- Modified: `ui/admin-console/src/types.ts`, `ReportsScreen.tsx`, `ReportDetailScreen.tsx`, `DataDiffScreen.tsx`, `App.tsx`

## Verification
- `npm run build` in `ui/admin-console` — passed
- `npm test -- --run` in `ui/admin-console` — 11/13 passed (2 pre-existing failures unrelated to P1-2)
- `mvn -pl apps/local-admin-api -am test` — 8/8 passed (including new P1-2 endpoint test)
- Pre-existing failure in `report-engine` module (`DefaultReportEngineTest.diagnoseReportStorageSummarizesArtifactsByRunAndType`) — unrelated to P1-2

## Review Checklist
- [x] API-first consumption pattern — all three screens fetch real API, validate shape, fallback only on failure
- [x] Canonical runId consistency — runId flows correctly across reports → reportDetail → dataDiff chain
- [x] Response shape validation strictness — each screen checks specific fields before accepting
- [x] Fallback-only-as-backup logic — fallback properly gated behind API failure conditions
- [x] No route prefix conflicts in handleRunEndpoint
- [x] No breakage to monitor/aiGenerate/plugin chains
- [x] Path traversal security in resolveRunDir
- [x] Test coverage for P1-2 endpoints

## 2026-04-25 P1-2 Review Follow-up Fix

## Task
- Review the committed P1-2 report artifact integration before push.
- Fix any blocking regression found during review.

## Finding
- Found a real sidebar navigation bug:
  - `reportDetail` and `dataDiff` can both be opened directly from the shell sidebar.
  - When `selectedRunName` was null, `ReportDetailScreen` could stay in a loading state.
  - When `selectedRunName` was null, `DataDiffScreen` could incorrectly fall back to `selectReportViewModel(snapshot, null)` and render the first synthetic report instead of an empty state.

## Fix
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
  - Added explicit `No run selected` empty state when no run context exists.
- `ui/admin-console/src/screens/DataDiffScreen.tsx`
  - Added explicit `No run selected` empty state when no run context exists.
  - Tightened fallback gating so synthetic diff fallback is only allowed for `fetchFailed && selectedRunName`.

## Modified Files
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/screens/DataDiffScreen.tsx`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Ran: `npm test -- --run` in `ui/admin-console` — still the same 2 pre-existing failures unrelated to this review fix:
  - `shows prepared case count in Execution after pre-execution from Cases`
  - `posts editable config updates and refreshes the snapshot`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
- Ran: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test` — still blocked by the known pre-existing unrelated `report-engine` failure:
  - `DefaultReportEngineTest.diagnoseReportStorageSummarizesArtifactsByRunAndType`

## Next Step
- If verification passes, push the P1-2 commit set and continue with P1-3 data-template registry.

## 2026-04-25 P1-3 data-template registry completed

## Task
- Replace front-end seeded `dataTemplates` usage with a shared backend-backed registry for `execution` and `dataTemplates`.
- Complete minimal real CRUD/import/dry-run flow required by `docs/phase3/interface/review-backlog.md`.

## Changes

### Backend
- Added new file-backed service: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/DataTemplatePersistenceService.java`
  - Persists to `config/phase3/data-templates.json`
  - Supports list/get/create/update/delete/import preview/import commit/dry-run
- `LocalAdminApiServer.java`
  - Added:
    - `GET /api/phase3/data-templates`
    - `GET /api/phase3/data-templates/{templateId}`
    - `POST /api/phase3/data-templates`
    - `PUT /api/phase3/data-templates/{templateId}`
    - `DELETE /api/phase3/data-templates/{templateId}`
    - `POST /api/phase3/data-templates/import/preview`
    - `POST /api/phase3/data-templates/import/commit`
    - `POST /api/phase3/data-templates/{templateId}/dry-run`
  - Extended CORS allow methods to include `PUT` and `DELETE`
- `LocalAdminApiApp.java`
  - Wires `DataTemplatePersistenceService`
  - Adds `--data-template-file` CLI option and usage text
- `LocalAdminApiServerTest.java`
  - Added dedicated P1-3 endpoint coverage for CRUD and dry-run path

### Frontend
- `ExecutionScreen.tsx`
  - Reads compare-template options from `GET /api/phase3/data-templates`
  - Uses validated backend items as the primary source and keeps fallback only for API-unavailable cases
- `DataTemplatesScreen.tsx`
  - Reads the same registry from `GET /api/phase3/data-templates`
  - Added create/edit/save/delete wiring
  - Added import preview / import commit wiring
  - Added dry-run wiring
  - Empty backend list now renders as empty instead of silently reverting to seeded constants
- `App.tsx`
  - Passes `apiBaseUrl` into `ExecutionScreen` and `DataTemplatesScreen`
  - Added admin snapshot response shape validation to avoid writing unrelated JSON into app state
- `App.test.tsx`
  - Updated mocked request sequencing for the new data-template fetches
  - Refreshed stale model/execution assertions to match current UI behavior

## Review Follow-up Fixes
- Fixed a real regression in the initial P1-3 draft:
  - `ExecutionScreen` and `DataTemplatesScreen` were not receiving `apiBaseUrl` from `App.tsx`
- Fixed fallback correctness:
  - empty `items: []` from backend is now treated as a valid registry response
- Hardened the shell against malformed snapshot payloads:
  - `fetchSnapshot()` now rejects non-`AdminConsoleSnapshot` JSON instead of crashing on `snapshot.navigation.find(...)`

## Modified Files
- New: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/DataTemplatePersistenceService.java`
- Modified: `LocalAdminApiApp.java`, `LocalAdminApiServer.java`, `LocalAdminApiServerTest.java`
- Modified: `ui/admin-console/src/App.tsx`, `ui/admin-console/src/App.test.tsx`
- Modified: `ui/admin-console/src/screens/ExecutionScreen.tsx`, `ui/admin-console/src/screens/DataTemplatesScreen.tsx`
- Modified: `ui/admin-console/src/types.ts`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Passed: `npm test -- --run` in `ui/admin-console` (13/13)
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
- Not rerun in this step: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -am test`
  - known repo-level unrelated blocker still exists from prior work: `report-engine` failure

## Next Step
- Continue with P1-4: convert model/datasource local-only connection tests into real backend validation interfaces.

## 2026-04-25 P1-4 convert local-only connection tests into real validation interfaces completed

## Task
- Replace the local-only `Test connection` behavior in `models` and `environments` with real backend validation endpoints.
- Keep the implementation deterministic and mock-realistic without calling real external model providers or databases.

## Changes

### Backend
- Added `ConnectionValidationService.java`:
  - `testModelConnection(body)` for `POST /api/phase3/config/model/test-connection`
  - `testDatasourceConnection(body)` for `POST /api/phase3/datasources/test-connection`
- Validation remains Phase 3 file/local boundary safe:
  - no real outbound network call
  - no real JDBC connection
  - deterministic structured validation only
- Model validation now returns structured results with:
  - `status`
  - `checks`
  - `latencyMs`
  - `resolvedModel`
  - `message`
  - `warnings`
- Datasource validation now returns structured results with:
  - `status`
  - `checks`
  - `resolvedDriver`
  - `message`
  - `warnings`
- Validation focus implemented per review backlog:
  - model: provider name / model id / endpoint format / timeout range / apiKey missing-or-placeholder / role-status legality
  - datasource: db type / JDBC URL shape / driver-type match / schema format / username/password presence / mybatisEnv legality
- `LocalAdminApiServer.java`
  - added `POST /api/phase3/config/model/test-connection`
  - added `POST /api/phase3/datasources/test-connection`
  - kept existing config save endpoints unchanged
- `LocalAdminApiServerTest.java`
  - added dedicated coverage for both new validation endpoints and their structured response fields

### Frontend
- `App.tsx`
  - replaced `setTimeout`-based local model test with real `POST /api/phase3/config/model/test-connection`
  - replaced `setTimeout`-based local datasource test with real `POST /api/phase3/datasources/test-connection`
  - added response shape validation before accepting API data
  - when API is unavailable or malformed, UI now shows a warning-state fallback with explicit local-only draft checks; it no longer reports fake success
- `types.ts`
  - added typed connection validation result/check shapes
  - extended `MutationState` with `warning` kind and optional validation payload
- `MutationStatus.tsx`
  - now renders structured validation output:
    - status
    - latency / resolved model / resolved driver when present
    - per-check results
    - warnings
- `styles.css`
  - added warning and structured validation status styling

## Modified Files
- New: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ConnectionValidationService.java`
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- Modified: `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- Modified: `ui/admin-console/src/App.tsx`
- Modified: `ui/admin-console/src/types.ts`
- Modified: `ui/admin-console/src/ui-kit/MutationStatus.tsx`
- Modified: `ui/admin-console/src/styles.css`
- Modified: `01_dev_progress.md`
- Modified: `memory.txt`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Known Limits
- Validation remains deterministic only; no real provider reachability and no real JDBC connectivity is attempted in Phase 3.
- Current save flows remain unchanged:
  - model config is still footer-save
  - datasource config is still immediate persist
- Structured validation is displayed through the shared mutation-status surface rather than a new dedicated detail drawer.

## Next Step
- Continue with the next `docs/phase3/interface/review-backlog.md` priority after P1-4, while preserving the current Phase 3 platform-management boundary.

## 2026-04-25 P1-4 documentation sync follow-up

## Task
- Fix the Phase 3 docs baseline so it no longer contradicts the completed P1-4 implementation state.

## Completed
- Updated these docs to reflect that P1-4 is implemented:
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - `docs/phase3/interface/models/functional-spec.md`
  - `docs/phase3/interface/models/interface-spec.md`
  - `docs/phase3/interface/environments/functional-spec.md`
  - `docs/phase3/interface/environments/interface-spec.md`
- Replaced stale `local-only` / `future interface` wording for model and datasource connection testing with current-state wording:
  - backend validation interface is implemented
  - current UI uses the real POST validation endpoints
  - validation remains deterministic and non-connective by Phase 3 boundary
- Kept the remaining future-scope language only for work that is still truly unfinished, such as routing-rule editing and broader environment scope.

## Verification
- Doc consistency pass completed against the implemented P1-4 code and the current review finding.

## Next Step
- After doc re-review, the next recommended backlog item is `P2-1 dashboard control wiring`.

## 2026-04-25 P2-1 dashboard control wiring

## Task
- Complete the visible-but-unwired dashboard controls defined in `docs/phase3/interface/review-backlog.md` and the dashboard specs, while staying inside the existing `App.tsx` screen-switching model.

## Completed
- Dashboard refresh is now wired to the real shell snapshot reload path:
  - `Refresh` reuses `GET /api/phase3/admin-console`
  - no new routing system or dashboard-only fetch path was introduced
- Dashboard handoff controls now use existing App-level screen state:
  - `New run` switches to `execution`
  - recent-run rows switch to `reportDetail`
  - attention items switch to `reportDetail` / `monitor` / `dataDiff` / `models`
  - AI provider chips switch to `models`
- Added the minimum snapshot shape needed for canonical recent-run handoff:
  - `AdminConsoleSnapshot.reports[]` now supports `runId`
  - local admin snapshot mock data now returns `runId` together with `runName`
- Kept Phase 3 boundaries intact:
  - no real route layer
  - no Phase 4 typed route payload system
  - no expansion into external orchestration
- `DashboardScreen.tsx` was converted from demo-only controls into snapshot-backed actions that call App-provided handlers.
- Frontend tests were expanded to cover:
  - dashboard refresh
  - new-run handoff to execution
  - recent-run handoff to report detail using canonical `runId`
  - attention-item handoff to report detail / monitor / data diff / models
  - AI provider chip handoff to models

## Backend/Mock Data
- `AdminConsoleSnapshot.ReportRow` now includes `runId`
- `Phase3MockDataService` now fills `runId` for dashboard recent runs
- No new dashboard-specific backend endpoint was added; wiring continues to rely on the existing admin snapshot API

## Modified Files
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/model/AdminConsoleSnapshot.java`
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- Modified: `ui/admin-console/src/App.tsx`
- Modified: `ui/admin-console/src/App.test.tsx`
- Modified: `ui/admin-console/src/screens/DashboardScreen.tsx`
- Modified: `ui/admin-console/src/styles.css`
- Modified: `ui/admin-console/src/types.ts`
- Modified: `01_dev_progress.md`
- Modified: `memory.txt`

## Verification
- Passed: `npm test -- --run` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Known Limits
- Dashboard handoff continues to use the current screen-state model, so provider-chip clicks open `models` at the screen level only; they do not yet deep-focus a specific provider card or modal.
- Attention-item targets remain lightweight screen transitions rather than typed route payloads, which is intentional for Phase 3.

## Next Step
- Recommended next backlog item: `P2-2 Complete projects import and navigation actions`.

## 2026-04-25 P2-1 dashboard docs sync follow-up

## Task
- Align the `docs/phase3` dashboard baseline with the completed P2-1 implementation so review state, interface wording, and snapshot shape all match current code.

## Completed
- Updated:
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - `docs/phase3/interface/dashboard/functional-spec.md`
  - `docs/phase3/interface/dashboard/interface-spec.md`
- Synced dashboard control wording from stale future-state language to current implemented state:
  - `Refresh` -> implemented via shell reload of `GET /api/phase3/admin-console`
  - `New run` -> implemented App-level handoff to `execution`
  - recent-run row -> implemented App-level handoff to `reportDetail`
  - attention item -> implemented App-level handoff to `reportDetail` / `monitor` / `dataDiff` / `models`
  - AI provider chips -> implemented App-level handoff to `models`
- Updated dashboard snapshot response documentation so `reports[]` explicitly includes canonical `runId`
- Removed stale wording such as `visual only`, `not wired`, and similar future-state language from dashboard controls that are already implemented

## Verification
- Doc consistency pass completed against current code paths in `App.tsx`, `DashboardScreen.tsx`, and `AdminConsoleSnapshot.java`

## Next Step
- Await re-review of the synced P2-1 docs baseline before advancing to `P2-2`.

## 2026-04-25 P2-2 projects import and navigation actions completed

## Task
- Complete the visible-but-unwired `projects` controls in the Phase 3 admin console:
  - import preview / commit
  - new-project draft persistence
  - enter-project handoff to `cases`
  - reports handoff to `reports`
- Keep the implementation inside the existing App-level screen-state model and the current local-admin-api file-backed boundary.

## Completed
- Added minimal project import backend support in `local-admin-api`:
  - `POST /api/phase3/catalog/project/import/preview`
  - `POST /api/phase3/catalog/project/import/commit`
- `CatalogPersistenceService` now supports:
  - deterministic preview rows with `create` / `update`
  - duplicate/conflict detection
  - merge/replace mode normalization
  - file-backed commit into `config/phase3/project-catalog.json`
- `LocalAdminApiServerTest` now covers the project import preview/commit flow end-to-end.
- `ProjectsScreen.tsx` now wires:
  - `Import` -> preview / commit flow
  - `New project` -> existing draft-row add flow
  - project card / inline `Reports` -> App-level handoff to `reports`
  - inline `Enter project` -> App-level handoff to `cases`
- `App.tsx` now adds the minimum project handoff/import state:
  - project import preview + status state
  - `selectedCaseProjectKey`
  - `selectedReportsProjectKey`
  - App-level handlers for import preview, import commit, project->cases, project->reports
- `CasesScreen.tsx` and `ReportsScreen.tsx` now accept `initialProjectKey` so the existing screen state can open on the intended project without adding a new router.
- `ReportsScreen.tsx` was hardened so an empty `GET /api/phase3/runs/` result falls back to snapshot reports instead of rendering an empty project rail.
- `ProjectsScreen.tsx` editor rows now use stable index-based React keys:
  - prevents row remount/focus loss when the operator edits `project.key`
  - keeps the new-project draft flow stable during typing

## Modified Files
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CatalogPersistenceService.java`
- Modified: `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- Modified: `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- Modified: `ui/admin-console/src/App.tsx`
- Modified: `ui/admin-console/src/App.test.tsx`
- Modified: `ui/admin-console/src/screens/ProjectsScreen.tsx`
- Modified: `ui/admin-console/src/screens/CasesScreen.tsx`
- Modified: `ui/admin-console/src/screens/ReportsScreen.tsx`
- Modified: `ui/admin-console/src/types.ts`
- Modified: `01_dev_progress.md`
- Modified: `memory.txt`

## Verification
- Passed: `npm test -- --run` in `ui/admin-console` (`20/20`)
- Passed: `npm run build` in `ui/admin-console`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test` (`11/11`)

## Known Limits
- Project handoff still uses App-level screen state only; no route system or Phase 4 typed route payload was introduced.
- Project import remains deterministic and file-backed; it does not introduce typed catalog APIs beyond the minimal preview/commit endpoints required for P2-2.

## Next Step
- Sync the `docs/phase3/interface/projects/*` and overview docs if review finds stale `projects` wording after this implementation.
- If docs are already aligned, the next recommended backlog item is `P2-3` / the next review-backlog priority after projects wiring.

## 2026-04-25 P2-2 projects docs sync follow-up

## Task
- Align the `docs/phase3` projects baseline with the completed P2-2 implementation so review state and screen specs match current code.

## Completed
- Updated:
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - `docs/phase3/interface/projects/functional-spec.md`
  - `docs/phase3/interface/projects/interface-spec.md`
- Synced the projects docs from stale future-state wording to current implemented state:
  - `Import` now documented as implemented via `POST /api/phase3/catalog/project/import/preview` -> `POST /api/phase3/catalog/project/import/commit`
  - `New project` now documented as implemented via the existing add-row draft flow plus `POST /api/phase3/catalog/project`
  - `Reports` / `View reports` now documented as implemented App-level handoff into `reports`
  - `Enter project` now documented as implemented App-level handoff into `cases`
- Updated `projects/interface-spec.md` so the previous “recommended / future” implementation text for import and project-context handoff now reflects current P2-2 behavior.
- Kept future wording only for truly unfinished areas, such as richer dedicated project APIs beyond the current Phase 3 boundary.

## Verification
- Doc consistency pass completed against current `App.tsx`, `ProjectsScreen.tsx`, `CasesScreen.tsx`, `ReportsScreen.tsx`, and `CatalogPersistenceService.java`

## Next Step
- Await re-review of the synced P2-2 docs baseline before advancing to the next backlog item.

## 2026-04-25 P2-3 Complete cases editor-side read/write interfaces

### Scope
Wire the 7 case-detail API endpoints and make the CasesScreen tabs functional with real backend data.

### Backend
- **NEW** `CaseDetailService.java`: File-backed case detail service under `config/phase3/case-details/<caseId>/`
  - GET/PUT DSL (`dsl.json`) with auto-versioning
  - POST DSL validate (definition required, id required, step action checks)
  - GET/PUT state-machine (`state-machine.json`) with nodes/edges/guards
  - GET plans (`plans.json`) with plans array and preconditions
  - GET history (`history.json`) with runs and maintenance events
  - Path traversal protection via `.normalize()` + `.startsWith(root)`
  - Default/mock data builders when no persisted file exists
- **MODIFIED** `LocalAdminApiServer.java`:
  - 11-param constructor with full delegation chain (9→10→11)
  - Route `/api/phase3/cases/` registered after `/api/phase3/cases/dsl/validate` (prefix conflict avoidance)
  - `handleCaseDetailEndpoint` dispatches by path segments: `{caseId}/{action}/{subAction}`
- **MODIFIED** `LocalAdminApiApp.java`: Added CaseDetailService import (9-param constructor auto-creates default instance)

### Frontend
- **MODIFIED** `types.ts`: Added 7 P2-3 types (CaseDslResponse, CaseDslValidateResponse, CaseDslSaveResponse, CaseStateMachineResponse, CasePlansResponse, CaseHistoryResponse)
- **MODIFIED** `CasesScreen.tsx`:
  - Tab switching with `CaseDetailTab` type (`overview | dsl | stateMachine | plans | history`)
  - API-backed data fetching per tab (GET on tab switch)
  - DSL editor panel with JSON textarea, validate button, save button, validation status display
  - State machine viewer with nodes/edges/guards display and save
  - Plans tab with API data (plans list + preconditions)
  - History tab with runs and maintenance events
  - "Edit DSL" and "State machine" hero buttons now switch to respective tabs
  - Tab state resets on case change
  - Added `apiBaseUrl` prop
- **MODIFIED** `App.tsx`: Pass `apiBaseUrl` to CasesScreen

### Tests
- **MODIFIED** `LocalAdminApiServerTest.java`:
  - Added `caseDetailEndpoints` test with 10 steps covering all 7 endpoints
  - Validates GET defaults, PUT DSL save + version increment, POST validate (valid/invalid), GET/PUT state-machine, GET plans, GET history
  - Added CaseDetailService and ConnectionValidationService imports

### Verification
- `npm run build`: PASS (339 kB bundle)
- `npm test -- --run`: PASS (20/20 tests, 2 files)
- `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`: PASS (12/12 tests)

### Next Step
- Sync `docs/phase3/interface/cases/` functional-spec and interface-spec with completed P2-3 implementation
- Continue with the next review-backlog priority after P2-3

## 2026-04-26 P2-4 Complete docParse document-service actions

### Scope
Wire the 3 document-service API endpoints and make the DocParseScreen Upload/Re-parse/Manual edit buttons functional with real backend data.

### Backend
- **NEW** `DocumentPersistenceService.java`: File-backed document persistence under `config/phase3/documents/<documentId>/`
  - `upload(body)`: validates projectKey/fileName, generates document ID, persists `raw.json` + `parse-result.json` + `meta.json`
  - `reparse(documentId, body)`: checks meta exists, regenerates `parse-result.json`
  - `saveParseResult(documentId, body)`: reads `changes.detectedCases`, overwrites `parse-result.json`
  - `getParseResult(documentId)`: reads persisted parse result
  - Path traversal protection via `.normalize()` + `.startsWith(root)`
- **MODIFIED** `LocalAdminApiServer.java`:
  - 12-param constructor with full delegation chain (9→12, 10→12, 11→12)
  - Route `/api/phase3/documents/upload` registered before `/api/phase3/documents/` (prefix conflict avoidance)
  - `handleDocumentEndpoint` dispatches by path segments: `{documentId}/{action}` (reparse POST, parse-result GET/PUT)

### Frontend
- **MODIFIED** `types.ts`: Added 4 P2-4 types (DocumentUploadResponse, DocumentReparseResponse, DocumentParseResultSaveResponse, DocumentParseResult)
- **MODIFIED** `DocParseScreen.tsx`:
  - Added `apiBaseUrl` prop
  - `handleUploadToBackend`: reads file via FileReader, POSTs JSON to `/api/phase3/documents/upload`
  - `handleReparse`: POSTs to `.../reparse`, then GETs `.../parse-result` to refresh UI
  - `handleSaveParseResult`: PUTs to `.../parse-result` with edited JSON
  - Re-parse button wired to `handleReparse`
  - Manual edit button opens inline JSON editor with Save/Cancel
  - Action status bar with dismiss button
- **MODIFIED** `App.tsx`: Pass `apiBaseUrl` to DocParseScreen

### Tests
- **MODIFIED** `LocalAdminApiServerTest.java`:
  - Added `documentServiceEndpoints` test with 7 steps: upload, get parse result, re-parse, manual edit save, get after edit, re-parse nonexistent, upload missing projectKey
  - Uses 12-param constructor with explicit DocumentPersistenceService

### Docs Synced
- **MODIFIED** `docs/phase3/interface/ui-control-interface-overview.md`: DocParse section updated (Re-parse, Manual edit, Upload file → implemented)
- **MODIFIED** `docs/phase3/interface/docParse/functional-spec.md`: Sections 5, 6.4, 6.5, 9, 10, 11, 15 updated to reflect implemented state
- **MODIFIED** `docs/phase3/interface/docParse/interface-spec.md`: Sections 2, 6.5, 7.2, 7.3, 9 (9.1-9.7 with implementation status), 10, 11, 12 updated

### Verification
- `npm run build`: PASS
- `npm test -- --run`: PASS (20/20 tests)
- `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`: PASS (13/13 tests)

### Next Step
- Continue with the next review-backlog priority after P2-4

## 2026-04-26 P2-5 Complete reportDetail controls wiring

### Scope
Wire all visible-but-unwired controls on the reportDetail page: 5 tabs (Overview, Steps, Assertions, Recovery, AI decisions), Download artifacts, and Re-run.

### Backend
- **MODIFIED** `ReportArtifactService.java`:
  - Added `getRecovery(runId)`: reads `recovery.json` from run dir, falls back to `buildMockRecovery()` (3 items: restore snapshot SUCCESS, verify row counts SUCCESS, restore audit_log SKIPPED)
  - Added `getAiDecisions(runId)`: reads `ai-decisions.json` from run dir, falls back to `buildMockAiDecisions()` (3 items: LOCATOR_HEAL, WAIT_STRATEGY, ASSERTION_SUGGESTION)
- **MODIFIED** `LocalAdminApiServer.java`:
  - Added `recovery` and `ai-decisions` cases in `handleRunEndpoint` switch

### Frontend
- **MODIFIED** `types.ts`: Added 6 P2-5 types (RecoveryItem, RecoveryResponse, AiDecisionItem, AiDecisionsResponse, RunAssertionsResponse, RunArtifactsResponse)
- **MODIFIED** `ReportDetailScreen.tsx`: Completely rewritten with:
  - `ReportDetailTab` type (`overview | steps | assertions | dataDiff | recovery | aiDecisions`)
  - `onRerun` prop for App-level execution handoff
  - Tab-specific state variables with on-demand API fetches (cached per session)
  - Artifact listing drawer with `GET .../artifacts`
  - Re-run handoff extracting projectKey from runId
  - Tab-specific panels: steps timeline, assertions detail, recovery detail with status badge, AI decisions log
- **MODIFIED** `App.tsx`: Added `onRerun` prop wiring that sets `launchForm` and switches to `execution`

### Tests
- **MODIFIED** `App.test.tsx`: Added 3 reportDetail tests (tab switching with API fetches, artifact listing, re-run handoff)
- **MODIFIED** `LocalAdminApiServerTest.java`: Added recovery and ai-decisions assertions to `reportArtifactEndpointsReadRealRunFiles`

### Docs Synced
- **MODIFIED** `docs/phase3/interface/ui-control-interface-overview.md`: Section 10 (ReportDetail) all controls → implemented
- **MODIFIED** `docs/phase3/interface/reportDetail/functional-spec.md`: Sections 5, 6.2, 6.3, 9, 10, 11, 15 updated
- **MODIFIED** `docs/phase3/interface/reportDetail/interface-spec.md`: Sections 2, 6, 9, 10, 11, 12 updated

### Verification
- `npm run build`: PASS
- `npm test -- --run`: PASS (26/26 tests)
- `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`: PASS (13/13 tests)

### Next Step
- Continue with the next review-backlog priority after P2-5

## 2026-04-27 P2-5 reportDetail docs sync follow-up

## Task
- Align the `reportDetail` docs baseline with the completed P2-5 implementation so the functional and interface specs no longer describe artifact/re-run/tab behavior as future-only.

## Completed
- Updated:
  - `docs/phase3/interface/reportDetail/functional-spec.md`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
- Synced stale wording to current implemented state:
  - artifact listing is implemented through `GET /api/phase3/runs/{runId}/artifacts`
  - re-run is implemented as App-level handoff into `execution`
  - tab behavior is documented as current API-backed behavior rather than future design
- Removed stale wording such as:
  - `future artifact download flow`
  - `future re-run handoff`
  - `no actual artifact opening or download exists`
  - `future true report interfaces and artifact actions`
- Kept remaining future/limit language only for actual unfinished scope:
  - no inline artifact content open/download
  - some detail fields still fall back to snapshot-derived view model data
  - recovery / AI decisions may remain deterministic mock when no real run artifacts exist

## Verification
- Doc consistency pass completed against current `ReportDetailScreen.tsx`, `App.tsx`, `ReportArtifactService.java`, and the already-passing P2-5 test baseline

## Next Step
- Await re-review of the synced `reportDetail` docs baseline before submit/push.

## 2026-04-27 P2-6 dataDiff control wiring completed

## Summary
- Wired the two remaining visible-but-unwired controls on the `dataDiff` page: **View raw JSON** and **Re-restore**.
- Added three new backend endpoints and a minimal restore-retry control flow.
- Added frontend raw-JSON drawer with three-tab (before/after/afterRestore) display and re-restore with status feedback.

## Backend Changes
- **MODIFIED** `ReportArtifactService.java`:
  - `getRawDataDiff(runId)` — reads `data-diff-raw.json` or builds mock inline raw snapshots from existing diff rows
  - `getRestoreResult(runId)` — reads `restore-result.json` or returns mock partial restore result
  - `restoreRetry(runId, body)` — validates runId, rejects if RETRY_IN_PROGRESS, returns ACCEPTED with operator/reason context
  - `buildMockRawDataDiff()` and `buildMockRestoreResult()` helpers
- **MODIFIED** `LocalAdminApiServer.java`:
  - `data-diff` case now checks `segments[6]` for `raw` sub-action → dispatches to `getRawDataDiff()`
  - New `restore-result` case → dispatches GET to `getRestoreResult()`
  - New `restore` case with `retry` sub-action → dispatches POST to `restoreRetry()`, uses `controlHttpStatus()` for 202/409

## Frontend Changes
- **MODIFIED** `types.ts`: Added 5 P2-6 types (RawDataDiffEntry, RawDataDiffResponse, RestoreResultItem, RestoreResultResponse, RestoreRetryResponse)
- **MODIFIED** `DataDiffScreen.tsx`:
  - View raw JSON: fetches `GET .../data-diff/raw`, opens drawer with before/after/afterRestore tabs, shows raw JSON in `<pre>`
  - Re-restore: posts `POST .../restore/retry`, shows success/rejected/error status bar, refreshes diff data on success
  - Both buttons disabled during pending states; action states reset when selectedRunName changes
- No App.tsx changes needed — existing `apiBaseUrl` and `selectedRunName` wiring was sufficient

## Tests
- **MODIFIED** `LocalAdminApiServerTest.java`: Added 3 assertions inside `reportArtifactEndpointsReadRealRunFiles` for data-diff/raw, restore-result, restore/retry
- **MODIFIED** `App.test.tsx`: Added 3 tests:
  - raw JSON drawer open, tab switch, and close
  - re-restore accepted with status feedback and diff refresh
  - re-restore rejected with rejection message display

## Docs Synced
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/dataDiff/functional-spec.md`
- `docs/phase3/interface/dataDiff/interface-spec.md`

## Verification
- npm test: **29/29 passed** (up from 26)
- npm build: **passed**
- Maven test: **13/13 passed** (same count, expanded assertions inside existing test)

## Known Limits
- Raw diff data is currently deterministic mock built from existing diff rows when no real `data-diff-raw.json` exists
- Restore result is currently deterministic mock when no real `restore-result.json` exists
- Re-restore does not actually trigger a real restore workflow — it records intent and returns ACCEPTED
- Raw JSON drawer does not support copy-to-clipboard or download

## Next Step
- Continue with the next review-backlog priority after P2-6

---

# P1-3 Documentation Sync (2026-04-27)

## Goal
Synchronize interface documentation to match the already-implemented P1-3 data-template registry.
All code was completed on 2026-04-25; only the docs still described controls as "visual only" / "future" / "not wired".

## Files Updated
1. `docs/phase3/interface/ui-control-interface-overview.md`
   - execution Compare data templates: changed from "Local only; front-end seeded" to "Implemented: reads from GET /api/phase3/data-templates"
   - dataTemplates section: all controls (Import, New template, Edit, Delete, Dry-run) updated to show implemented endpoints
2. `docs/phase3/interface/dataTemplates/functional-spec.md`
   - Changed all "visual only" / "not wired" descriptions to implemented with specific endpoint references
   - Updated screen inputs (apiBaseUrl), outputs (backend mutations), upstream dependencies
   - Updated known gaps to "remaining limits" (file-backed, deterministic, no versioning)
3. `docs/phase3/interface/dataTemplates/interface-spec.md`
   - Updated interface summary with all direct read/write sources
   - Changed "Current Local Template Registry" → "Current Backend Template Registry"
   - Updated shared catalog source section to reflect both screens reading from same backend
   - All control mappings marked as implemented
   - Changed "Recommended Future" → "Implemented Template Registry Interfaces"
   - Section 8: "Detailed Implementation Design for Currently Unwired Controls" → "Implemented Control Wiring"
   - Section 9: "Recommended" → "Current" execution read contract
   - Section 10: error handling updated to reflect implemented mutation state handling
   - Section 11: review items → remaining limits
4. `docs/phase3/interface/execution/interface-spec.md`
   - Line 28: "front-end-seeded execution helper data" → "backend-backed compare-template data with local fallback"
   - Line 42: "currently front-end seeded, not backend-backed" → "read from GET /api/phase3/data-templates"
   - Section 5: "Front-End Seed Data Boundary" → "Compare Template Data Source", updated to reflect backend registry
5. `docs/phase3/interface/review-backlog.md`
   - P1-3 section marked DONE with resolved summary and remaining limits

## Verification
- Maven test: **13/13 passed**
- npm test / npm build: doc-only 变更，未在本次重跑前端校验

## Next Step
- Continue with the next review-backlog priority

---

# P0-1 / P0-2 Monitor RunId Handoff + Runtime APIs Documentation Sync (2026-04-28)

## Goal
Complete P0-1 (canonical runId handoff from execution to monitor) and sync P0-2 (monitor runtime APIs).
All code was already implemented; this session verified, added tests, and synchronized docs.

## Discovery
On code inspection, both P0-1 and P0-2 were already fully implemented:
- `App.tsx` — `selectedMonitorRunId` state, `openMonitor(runId)` helper, execution `onOpenMonitor` bound to `openMonitor(launchForm.runId)`
- `MonitorScreen.tsx` — full implementation with idle/loading/error/loaded states, 4 runtime API fetches, Pause/Abort wiring
- `types.ts` — all runtime types (RunStatus, RunStep, RuntimeLogEntry, LivePage, RunControlResponse) exist
- `App.tsx` — Pause/Abort callbacks wired to backend fetch calls

## Tests Added
- `App.test.tsx`: 2 new tests (31 total, up from 29):
  1. "passes runId from execution to monitor via Open Exec Monitor"
  2. "shows monitor idle state when no runId is provided"

## Docs Synced
1. `execution/interface-spec.md` — §8.5, §9.1, §11.4 updated for runId handoff
2. `execution/functional-spec.md` — §5, §6.1, §10.1 updated for runId handoff
3. `monitor/functional-spec.md` — §5-§15 all synced from placeholder/future to implemented
4. `monitor/interface-spec.md` — §2, §4, §5.1, §6.1, §7-§11 all synced
5. `ui-control-interface-overview.md` — execution and monitor sections updated
6. `review-backlog.md` — P0-1 and P0-2 both marked DONE

## Verification
- npm test: **31/31 passed** (up from 29)
- npm build: **passed**

## Next Step
- Continue with P0-3

---

# P0-3 Plugin Popup Dedicated Contract Documentation Sync (2026-04-28)

## Goal
Complete P0-3: replace plugin AdminConsoleSnapshot dependency with dedicated popup contract.

## Discovery
On code inspection, P0-3 was already implemented:
- `PluginPopupScreen.tsx` — consumes `ExtensionPopupSnapshot` from `GET /api/phase3/extension-popup`, not `AdminConsoleSnapshot`
- Props: `apiBaseUrl: string`, `title: string`, `locale: Locale` (no `snapshot` prop)
- Loading/loaded/error states implemented for popup snapshot fetch
- Page and runtime sections render from `popupSnapshot.page` and `popupSnapshot.runtime`
- `App.tsx` line 2473 — passes `apiBaseUrl` to plugin screen
- Backend: `Phase3MockDataService.buildExtensionPopupSnapshot()` returns `ExtensionPopupSnapshot`
- TypeScript type: `ExtensionPopupSnapshot` in `types.ts`
- Java model: `ExtensionPopupSnapshot.java`
- Quick actions remain display-only (require real extension/background/native infrastructure)

## Tests Added
- `App.test.tsx`: 2 new tests (33 total, up from 31):
  1. "loads plugin popup from dedicated extension-popup endpoint"
  2. "shows plugin popup error state when extension-popup endpoint fails"

## Docs Synced
1. `plugin/functional-spec.md` — §5, §6.2, §6.3, §8.1, §8.2, §9, §11, §15 updated from AdminConsoleSnapshot to ExtensionPopupSnapshot
2. `plugin/interface-spec.md` — §2, §3, §4, §6.1, §8, §10 updated from future/mismatch to implemented
3. `review-backlog.md` — P0-3 marked DONE with resolved summary and remaining limits
4. `ui-control-interface-overview.md` — §15 plugin note and §16 resolved list updated

## Verification
- npm test: **33/33 passed** (up from 31)
- npm build: **passed**

## Next Step
- Continue with the next review-backlog priority
62. P1-1 aiGenerate real generation flow baseline re-verified and docs finalized (2026-04-28)
   - Goal of this pass:
     - re-read the current Phase 3 docs and code paths for `docParse -> aiGenerate -> cases`
     - verify whether P1-1 still had implementation gaps or only stale documentation
   - Discovery:
     - the real chain was already implemented in code:
       - `DocParseScreen.tsx` hands stable focus context to `App.tsx`
       - `App.tsx` stores `aiGenerateFocus` and opens `aiGenerate`
       - `AiGenerateScreen.tsx` already uses:
         - `POST /api/phase3/agent/generate-case`
         - `POST /api/phase3/cases/dsl/validate`
         - `POST /api/phase3/agent/generate-case/dry-run`
         - `POST /api/phase3/catalog/case`
       - validate-first behavior for Dry-run and Save was already in place
       - save already reuses canonical case-catalog persistence instead of a parallel contract
      - this pass added and re-verified frontend coverage for generate, dry-run, save, and failure visibility
     - the main remaining mismatch was documentation wording in `docs/phase3/interface/aiGenerate/*`
   - Docs updated:
     - `docs/phase3/interface/aiGenerate/interface-spec.md`
       - removed stale wording about lack of backend generation/validation/persistence requests
       - rewrote save-path description to current implemented `POST /api/phase3/catalog/case` behavior
       - clarified fallback vs backend-returned generated artifacts
     - `docs/phase3/interface/aiGenerate/functional-spec.md`
       - clarified current placement of validate/dry-run/save in the review flow
       - clarified that DSL is display-only on this page, while validation and persistence are implemented
   - Docs updated in this pass:
     - `docs/phase3/interface/review-backlog.md`
     - `docs/phase3/interface/ui-control-interface-overview.md`
       - both now explicitly reflect P1-1 as implemented instead of leaving `aiGenerate` actions in stale future/unwired wording
   - Docs checked and found already aligned, so no content change was needed:
     - `docs/phase3/interface/docParse/*`
     - `docs/phase3/interface/cases/*`
   - Verification rerun:
     - `npm test -- --run` in `ui/admin-console`: PASS (37/37)
     - `npm run build` in `ui/admin-console`: PASS
     - `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`: PASS (13/13)
   - Current limits retained:
     - backend generation remains deterministic mock shaped by input context, not a real AI model call
     - candidate tab switch remains local-only; backend returns one selected DSL payload per generation
     - `aiGenerate` still has no automatic downstream navigation into `cases` or `execution`
   - Next suggested backlog step:
     - continue from the next unresolved item in `docs/phase3/interface/review-backlog.md`
# 2026-04-29 P1-2 Report Artifact Read Path Refresh

Context:
- Re-opened P1-2 against the current Phase 3 workspace to remove remaining `runName`-centric and synthetic read paths across `reports`, `reportDetail`, and `dataDiff`.

Implemented:
- Unified the three report screens to canonical `runId` handoff at the App level.
- `ReportsScreen` now treats `GET /api/phase3/runs/` as the primary list source and uses snapshot-derived rows only as fallback when the API is unavailable.
- `ReportDetailScreen` now reads hero context from `GET /api/phase3/runs/{runId}/report`, keeps tab fetches on run-specific endpoints, and hands `dataDiff` / `re-run` using explicit `runId`.
- `DataDiffScreen` now reads `GET /api/phase3/runs/{runId}/data-diff`, `.../data-diff/raw`, and `.../restore-result`, and refreshes both diff data and restore-result after `POST .../restore/retry`.
- Added/updated frontend tests for report -> detail -> diff `runId` handoff, artifact failure tolerance, raw diff success/error, and restore-result refresh.
- Extended `LocalAdminApiServerTest` coverage for `GET /api/phase3/runs/{runId}/report-summary` and richer canonical report/data-diff fields.

Verification:
- `npm run build` in `ui/admin-console`: passed.
- Targeted serialized Vitest checks for the changed report/dataDiff interactions passed.
- `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`: passed.

Known limits:
- Full `npm test -- --run` remains sensitive to local Vitest worker/resource behavior on this machine; serialized targeted runs for the modified report flows passed, but the full run was not stable enough to use as the only signal.

# 2026-05-04 P0-4 Plugin Quick Actions Real Chain

Context:
- Re-opened the highest-priority unresolved Phase 3 plugin gap and verified that the real extension popup chain already existed in `extension/edge-extension` plus `apps/native-host`, so the work could proceed without falling back to monitor drill-down first.

Implemented:
- Added extension-specific local-admin-api endpoints:
  - `POST /api/phase3/extension/page-summary`
  - `POST /api/phase3/extension/platform-handoff`
- Added native-host message dispatch for:
  - `PAGE_SUMMARY_GET`
  - `PLATFORM_HANDOFF_PREPARE`
- Wired real extension popup quick actions in `extension/edge-extension/popup.html` + `popup.js`:
  - `Page summary` -> popup -> background -> native-host -> local-admin-api
  - `Open in platform` -> popup -> background -> native-host -> local-admin-api -> background tab-open
  - `Copy` -> popup-local clipboard write
  - `Use in DSL` -> popup -> background -> native-host -> local-admin-api -> background tab-open
- Extended `background.js` with a local `platform-open` channel so popup UI does not own browser tab opening logic directly.
- Added App-level platform handoff parsing in `ui/admin-console/src/App.tsx` using lightweight query params only:
  - `execution` handoff pre-fills existing `launchForm`
  - `aiGenerate` handoff maps query context into existing `aiGenerateFocus`
- No complex router was introduced.
- No existing scheduler/report/run protocol was modified.

Docs synced:
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `docs/phase3/interface/ui-control-interface-overview.md`

Verification:
- `npm test -- --run src/popup.test.js` in `ui/admin-console`: PASS (7/7)
- `npm test -- --run src/App.test.tsx -t "consumes plugin execution handoff from URL query params"`: PASS
- `npm test -- --run src/App.test.tsx -t "consumes plugin DSL handoff from URL query params"`: PASS
- `npm run build` in `ui/admin-console`: PASS
- `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/native-host -Dtest=NativeHostMessageProcessorTest test`: PASS (7/7)
- `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`: PASS (14/14)

Known limits:
- `Pick element` remains visual-only; no content-script pick/highlight/candidate capture chain exists yet.
- `Quick smoke test` remains visual-only; popup-side execution start is not yet wired.
- `Page summary` is deterministic from popup tab context plus local rules; there is still no real DOM/content-script extraction in Phase 3.
- `Use in DSL` currently hands off into `aiGenerate`, not directly into the `cases` DSL editor.
- Full `src/App.test.tsx` remains expensive on this machine, so verification used focused targeted runs for the new handoff cases instead of the whole file.

# 2026-05-05 P0-5 Plugin Pick Element Real Chain

Context:
- Continued the next Phase 3 plugin step after P0-4 to replace the popup `Pick element` visual-only placeholder with a real in-extension pick chain.

Implemented:
- Added `extension/edge-extension/content-script.js` and registered it in `manifest.json`.
- Wired real pick mode inside the extension only:
  - `Pick element` -> popup -> background -> active-tab content script
  - content script hover highlight
  - content script selected-element capture on click
  - content script locator-candidate shaping and cleanup on exit
- Updated the real popup UI in `extension/edge-extension/popup.html` + `popup.js`:
  - renders selected element `tag`, `text`, `id`, `name`
  - renders candidate locator list plus recommended locator and reason
  - `Copy` now uses the current real recommended locator
  - `Use in DSL` now uses the current real recommended locator while keeping the existing native-host/platform handoff chain
- Extended `background.js` with a content-script bridge channel for popup-triggered pick requests.
- Kept the architecture boundary unchanged:
  - popup triggers and renders
  - background bridges
  - content script owns DOM pick/highlight/candidate collection
  - native-host unchanged
  - local-admin-api unchanged
  - no scheduler/report/run protocol change
  - no complex routing introduced

Docs synced:
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/popup.test.js` in `ui/admin-console`: PASS (8/8)
- `npm test -- --run src/background.test.js` in `ui/admin-console`: PASS (1/1)
- `npm test -- --run src/content-script.test.js` in `ui/admin-console`: PASS (2/2)
- `npm run build` in `ui/admin-console`: PASS

Remaining limits:
- `Quick smoke test` is still visual-only
- popup candidate rows are rendered from real pick output, but row-selection state is not yet interactive
- popup mirror screen in `ui/admin-console` remains a demo surface; the real implementation lives in `extension/edge-extension`

# 2026-05-05 P0-6 Plugin Quick Smoke Test Real Chain

Context:
- Continued the next highest-priority plugin gap after P0-5 and kept the existing Phase 3 boundary: popup trigger/render only, background bridge only, native-host forward only, local-admin-api deterministic scheduler shaping only.

Implemented:
- Added a real `Quick smoke test` action to `extension/edge-extension/popup.html`.
- Wired `extension/edge-extension/popup.js` so the quick action:
  - reads current active-tab context
  - reuses the existing launch-form `runId`, `projectKey`, `owner`, `environment`, and `detail`
  - reuses the existing scheduler request payload shape
  - sends `channel: "native-host"` + `type: "SCHEDULER_REQUEST_CREATE"`
  - renders deterministic `pending` / `success` / `error` plus `runId`, queue status, and next step
- Kept `extension/edge-extension/background.js` on the existing generic native-host forward path; no new popup-specific execution protocol was introduced.
- Reused the existing native-host and local-admin-api scheduler request chain:
  - native-host `SCHEDULER_REQUEST_CREATE`
  - local-admin-api `POST /api/phase3/scheduler/requests`
- Did not change report/run protocol semantics and did not add a complex platform router; detailed monitoring still belongs to platform execution/monitor.

Docs synced:
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/popup.test.js` in `ui/admin-console`: PASS (14/14)
- `npm test -- --run src/background.test.js` in `ui/admin-console`: PASS (3/3)

Remaining limits:
- popup mirror screen in `ui/admin-console` remains a demo surface; the real implementation lives in `extension/edge-extension`
- locator row selection is still not interactive local state
- `Use in DSL` still targets `aiGenerate`, not direct `cases` DSL insertion

# 2026-05-05 P0-7 Monitor Drill-Down Panels

Context:
- Returned to the highest-priority remaining `monitor` gap after the plugin P0 items and kept the Phase 3 boundary: local drill-down UI first, no new route, no new backend interface unless existing runtime payload proved insufficient.

Implemented:
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx` to add two local drill-down interactions:
  - clickable step rows
  - clickable runtime-log rows
- Added local detail-panel state for the selected step or selected runtime log.
- Step detail now renders existing step payload fields only:
  - `index`
  - `label`
  - `state`
  - `durationMs`
  - `startedAt`
  - `note`
- Runtime-log detail now renders existing log payload plus optional extended fields when present:
  - `at`
  - `type`
  - `model`
  - `summary`
  - optional `source` / `message` / `detail` / `error`
- `selectedRunId` changes now clear old drill-down state, so stale detail does not carry across monitor handoffs.
- `idle`, `loading`, `error`, and no-data states do not expose drill-down controls or stale detail panels.
- No backend change was required; the implementation reuses:
  - `GET /api/phase3/runs/{runId}/steps`
  - `GET /api/phase3/runs/{runId}/runtime-log`

Docs synced:
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/screens/MonitorScreen.test.tsx` in `ui/admin-console`: PASS (5/5)
- `npm run build` in `ui/admin-console`: PASS

Remaining limits:
- runtime data is still deterministic mock when no real run artifacts exist
- live page remains structured-data only; no real screenshot or DOM summary is rendered
- `monitor` still does not become a separate run-detail/report-detail route; drill-down stays local by design

# 2026-05-05 P1-5 Models Routing Rule Local Edit Flow

Context:
- Continued the next `models` gap after P1-4 and kept the Phase 3 boundary: local draft editing first, existing persistence path reused, no new backend contract unless the current config-item shape proved insufficient.

Implemented:
- Updated `ui/admin-console/src/screens/ModelConfigScreen.tsx` so the routing-rule edit icon is now clickable and opens a local editor modal.
- Added local routing-rule editor fields for:
  - `task`
  - `primary`
  - `fallback`
  - `reason`
- Kept routing-rule edits draft-only until footer save:
  - editor `Apply` updates the current front-end `routingRules` state
  - editor `Cancel` closes without mutating the parent draft
- Updated `ui/admin-console/src/App.tsx` to pass `setModelRoutingRules` into `ModelConfigScreen`, so routing-rule edits stay inside the existing screen-level state model.
- Reused the current model-config persistence flow unchanged:
  - `buildModelConfigItems(modelProviders, modelRoutingRules)`
  - repeated `POST /api/phase3/config/model`
- Did not add a new models-specific save endpoint and did not change provider connection-test semantics.

Docs synced:
- `docs/phase3/interface/models/functional-spec.md`
- `docs/phase3/interface/models/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/screens/ModelConfigScreen.test.tsx` in `ui/admin-console`: PASS (3/3)
- `npm test -- --run src/App.test.tsx -t "persists locally edited routing rules through the existing model config save flow"` in `ui/admin-console`: PASS (1/1, 41 skipped)
- `npm run build` in `ui/admin-console`: PASS

Remaining limits:
- routing-rule editing is still single-rule local modal state, not a broader routing policy management surface
- persistence still uses generic config-item storage instead of a typed `models` document API

# 2026-05-05 P1-6 Execution Contract Hint Local Drawer

Context:
- Continued the next `execution` gap after P1-5 and kept the existing Phase 3 boundary: local front-end help only, no new backend endpoint, no scheduler semantic change, no new route.

Implemented:
- Updated `ui/admin-console/src/screens/ExecutionScreen.tsx` so the header contract hint button is now clickable.
- Added a local execution-contract help panel inside the current `execution` screen.
- The panel documents the current execution-page contract only and covers:
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
- Added local open/close state only; no route or backend ownership changed.
- Updated `ui/admin-console/src/styles.css` for the new panel layout.
- Added `ui/admin-console/src/screens/ExecutionScreen.test.tsx` with focused component coverage for open, close, non-regression while open, and empty run/queue variations.

Docs synced:
- `docs/phase3/interface/execution/functional-spec.md`
- `docs/phase3/interface/execution/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/screens/ExecutionScreen.test.tsx` in `ui/admin-console`: PASS (4/4)
- `npm run build` in `ui/admin-console`: PASS

Remaining limits:
- the panel is descriptive only; it does not edit payloads or manage protocols
- queue rows and prepared-case cards remain display-only

# 2026-05-05 P1-7 Execution Queue Row Drill-Down

Context:
- Continued the next `execution` gap after P1-6 and kept the current Phase 3 boundary: reuse existing app-level handoff first, no backend endpoint, no route system, no scheduler semantic change.

Implemented:
- Updated `ui/admin-console/src/screens/ExecutionScreen.tsx` so queue rows are now clickable instead of display-only.
- Added explicit queue-row `aria-label` text for drill-down.
- Reused existing App-level monitor handoff instead of creating a queue-detail page:
  - queue row click -> `onOpenQueueItem(item.title)`
  - `App.tsx` derives the current run identity from queue `title`
  - `App.tsx` reuses `openMonitor(runId)`
- Fixed the first implementation to `monitor` only.
  - Current reason: `workQueue` still exposes only `title`, `owner`, `state`, and `detail`
  - That is sufficient for a lightweight monitor handoff, but not sufficient for reliable monitor-vs-report branching without inventing new metadata
- Updated `ui/admin-console/src/styles.css` for queue-row button hover/focus treatment.
- Expanded frontend coverage:
  - `ui/admin-console/src/screens/ExecutionScreen.test.tsx`
  - `ui/admin-console/src/App.test.tsx`

Docs synced:
- `docs/phase3/interface/execution/functional-spec.md`
- `docs/phase3/interface/execution/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/screens/ExecutionScreen.test.tsx` in `ui/admin-console`: PASS (6/6)
- `npm test -- --run src/App.test.tsx -t "opens monitor from execution queue-row drill-down via the existing App handoff"` in `ui/admin-console`: PASS (1 passed, 42 skipped)
- `npm run build` in `ui/admin-console`: PASS

Remaining limits:
- queue drill-down still depends on queue `title` format because the current snapshot queue shape does not expose a dedicated `runId`
- prepared-case cards remain display-only

# 2026-05-05 P1-8 Execution Prepared-Case Card Drill-Down

Context:
- Continued the next `execution` gap after P1-7 and kept the current Phase 3 boundary: reuse existing app-level handoff first, no backend endpoint, no route system, no scheduler semantic change.

Implemented:
- Updated `ui/admin-console/src/screens/ExecutionScreen.tsx` so prepared-case cards are now clickable instead of display-only.
- Added explicit prepared-case-card `aria-label` text for drill-down.
- Reused existing App-level `cases` handoff instead of creating a prepared-case detail page:
  - prepared-case card click -> `onOpenPreparedCase(item.id, item.projectKey)`
  - `App.tsx` stores the current cases context via:
    - `selectedCaseProjectKey`
    - `selectedCaseId`
  - `App.tsx` switches back to `cases`
  - `CasesScreen.tsx` now accepts `initialCaseId` in addition to the existing `initialProjectKey`
  - `CasesScreen.tsx` reopens the matching case in the current lower detail canvas
- Updated `ui/admin-console/src/styles.css` for prepared-case button hover/focus treatment.
- Expanded frontend coverage:
  - `ui/admin-console/src/screens/ExecutionScreen.test.tsx`
  - `ui/admin-console/src/App.test.tsx`

Docs synced:
- `docs/phase3/interface/execution/functional-spec.md`
- `docs/phase3/interface/execution/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/screens/ExecutionScreen.test.tsx` in `ui/admin-console`: PASS (8/8)
- `npm test -- --run src/App.test.tsx -t "opens cases from execution prepared-case drill-down via the existing App handoff"` in `ui/admin-console`: PASS (1 passed, 43 skipped)

Remaining limits:
- prepared-case drill-down carries only current `projectKey` + `caseId`
- the cases reopen path still depends on the matching case being present in the current app snapshot/draft

# 2026-05-06 P2-1 Dashboard Control Wiring

Context:
- Re-opened the dashboard backlog item and verified that most dashboard controls were already wired in code; the remaining real gap was explicit `Refresh` feedback plus stale backlog/documentation state.

Implemented:
- Kept the existing dashboard handoff architecture unchanged:
  - `Refresh` -> existing shell snapshot reload path
  - `New run` -> existing App-level handoff into `execution`
  - recent-run row -> existing App-level handoff into `reportDetail`
  - attention item -> existing App-level handoff into `reportDetail` / `monitor` / `dataDiff` / `models`
  - AI provider chip -> existing App-level handoff into `models`
- Added explicit dashboard refresh feedback:
  - `pending`
  - `success`
  - `error`
- Updated `ui/admin-console/src/screens/DashboardScreen.tsx` to render refresh feedback and disable the refresh button while pending.
- Updated `ui/admin-console/src/App.tsx` to own `dashboardRefreshState` and drive the existing `GET /api/phase3/admin-console` reload chain without adding a new endpoint or route payload.
- Cleaned up the dashboard screen file while preserving existing behavior and current Phase 3 boundaries.
- Expanded frontend verification in `ui/admin-console/src/App.test.tsx` so the refresh path now proves visible feedback instead of only the fetch call count.

Docs synced:
- `docs/phase3/interface/dashboard/functional-spec.md`
- `docs/phase3/interface/dashboard/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`

Verification:
- `npm test -- --run src/App.test.tsx -t "refreshes the dashboard snapshot and hands off New run to Execution"` in `ui/admin-console`: PASS
- `npm test -- --run src/App.test.tsx -t "opens dashboard recent-run rows with the canonical runId"` in `ui/admin-console`: PASS
- `npm test -- --run src/App.test.tsx -t "routes dashboard attention items and provider chips through existing App handoff state"` in `ui/admin-console`: PASS
- `npm run build` in `ui/admin-console`: PASS

Remaining limits:
- dashboard metric cards remain display-only overview widgets
- attention items are still front-end derived from snapshot data, not a dedicated backend attention contract
- dashboard now has explicit refresh feedback, but it still does not own full first-load loading/empty/error page states

## 2026-05-06 P1-4 review hardening follow-up

## Task
- Address the remaining review gap in P1-4: the UI still downgraded backend validation failures into warning-state local fallback output.

## Completed
- `ui/admin-console/src/App.tsx`
  - removed synthesized local fallback validation payloads for model and datasource connection tests
  - backend validation now remains authoritative:
    - success / warning / error still come from backend validation responses
    - transport, malformed-response, and non-2xx failures now surface as explicit UI error state
    - no local-only pseudo-validation output is rendered when the backend path fails
- `ui/admin-console/src/App.test.tsx`
  - added frontend coverage for:
    - models pending / success / error
    - environments pending / success / error
    - model save and test-connection isolation
    - environment save and test-connection isolation
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
  - extended deterministic endpoint coverage with warning-path assertions for:
    - `POST /api/phase3/config/model/test-connection`
    - `POST /api/phase3/datasources/test-connection`
- Synced docs and backlog:
  - `docs/phase3/interface/models/functional-spec.md`
  - `docs/phase3/interface/models/interface-spec.md`
  - `docs/phase3/interface/environments/functional-spec.md`
  - `docs/phase3/interface/environments/interface-spec.md`
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - `docs/phase3/interface/review-backlog.md`

## Verification
- Passed: `npm test -- --run src/App.test.tsx -t "shows pending, success, and error states for model connection validation|keeps model save and test connection state isolated|shows pending, success, and error states for datasource connection validation|keeps environment save and test connection state isolated"` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
- Attempted: `npm test -- --run src/App.test.tsx` in `ui/admin-console`
  - timed out in this environment and is not used as the verification result for this follow-up

## Current State
- P1-4 frontend behavior now fully matches the real backend validation-interface boundary.
- Validation remains deterministic by design:
  - no real provider connectivity
  - no real JDBC connectivity

## 2026-05-06 P2-2 Projects Import And Navigation Actions

## Task
- Close the remaining `projects` control gap within the current Phase 3 boundary:
  - `Import`
  - `New project`
  - `Enter project`
  - `View reports`

## Completed
- Re-checked the live code path instead of re-implementing from backlog text.
- Confirmed the current implementation already reuses the intended Phase 3 architecture:
  - `Import` -> `POST /api/phase3/catalog/project/import/preview` -> `POST /api/phase3/catalog/project/import/commit`
  - `New project` -> existing add-row draft flow -> existing `POST /api/phase3/catalog/project` save path
  - `Enter project` -> existing App-level handoff into `cases`
  - `View reports` / card `Reports` -> existing App-level handoff into `reports`
- Added focused frontend regression coverage for import error feedback so the required `pending / success / error` mutation surface is now explicitly tested.
- Synced the Phase 3 interface docs to the real implementation boundary:
  - current import UI is deterministic JSON review only
  - no CSV parser or file-upload wizard is part of the implemented P2-2 scope

## Modified Files
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/projects/functional-spec.md`
- `docs/phase3/interface/projects/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm test -- --run src/App.test.tsx -t "runs project import preview and commit through the new catalog import endpoints"` in `ui/admin-console`
- Passed: `npm test -- --run src/App.test.tsx -t "shows project import error feedback when preview fails"` in `ui/admin-console`
- Passed: `npm test -- --run src/App.test.tsx -t "adds a new project row and persists it through the existing catalog save flow"` in `ui/admin-console`
- Passed: `npm test -- --run src/App.test.tsx -t "hands off Enter project into Cases with the selected project context"` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Attempted but not used as gate:
  - aggregated `App.test.tsx` pattern run timed out / OOMed in this environment
  - isolated legacy `projects -> reports` handoff test selection remained unstable under the current Vitest worker/filter behavior on this machine

## Current State
- `P2-2` is complete on the current Phase 3 boundary.
- No new route system, no new projects-specific handoff payload, and no new project-detail contract were introduced.

## Remaining Limits
- import remains deterministic JSON review only
- project cards still rely on front-end-composed summary data from the shared snapshot

## 2026-05-06 P2-4 DocParse read-side completion follow-up

## Task
- Close the remaining real `docParse` read-side gaps after the earlier P2-4 write-path work:
  - `GET /api/phase3/documents/{documentId}/raw`
  - `GET /api/phase3/documents/{documentId}/versions`
  - first-open parse-result hydration instead of backend refresh only after re-parse/manual-edit

## Completed
- `apps/local-admin-api`
  - extended `DocumentPersistenceService` with:
    - `getRawDocument(documentId)`
    - `getVersions(documentId)`
    - lightweight version-entry persistence on upload / re-parse / manual edit
  - extended `LocalAdminApiServer` document routing with:
    - `GET /api/phase3/documents/{documentId}/raw`
    - `GET /api/phase3/documents/{documentId}/versions`
- `ui/admin-console`
  - rewrote `DocParseScreen.tsx` into a clean backend-first detail flow
  - opening a document now attempts:
    - `GET /api/phase3/documents/{documentId}/parse-result`
    - `GET /api/phase3/documents/{documentId}/raw`
    - `GET /api/phase3/documents/{documentId}/versions`
  - `Raw document` and `Version history` now show explicit loading / empty / error states
  - `Re-parse` and `Manual edit` now refresh parse/raw/version detail together after success
  - parse-result detail now prefers backend data on first open and keeps synthetic shell fallback only when the backend document does not exist yet
- Docs synced:
  - `docs/phase3/interface/docParse/functional-spec.md`
  - `docs/phase3/interface/docParse/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`
  - `docs/phase3/interface/ui-control-interface-overview.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/DocumentPersistenceService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/screens/DocParseScreen.tsx`
- `ui/admin-console/src/screens/DocParseScreen.test.tsx`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/docParse/functional-spec.md`
- `docs/phase3/interface/docParse/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest#documentServiceEndpoints test`
- Passed: `npm run build` in `ui/admin-console`
- Attempted but not used as gate:
  - targeted Vitest runs for `App.test.tsx` and the new `DocParseScreen.test.tsx` timed out in the current environment before producing stable per-test output

## Current State
- `P2-4` is now complete on the current Phase 3 boundary for document upload, re-parse, manual edit, parse-result read, raw read, and version-history read.

## Remaining Limits
- document catalog is still synthetic front-end data from `GET /api/phase3/admin-console`; there is still no canonical `GET /api/phase3/documents`
- parse-result still keeps shell fallback content when a selected synthetic document has not yet been uploaded/persisted
- version history is event metadata only; it does not yet expose per-version raw snapshots or diffs

## 2026-05-06 P2-4 DocParse text cleanup and session-catalog boundary follow-up

## Task
- Keep the follow-up scope small:
  - clean any remaining garbled copy in `ui/admin-console/src/screens/DocParseScreen.tsx`
  - document the current uploaded-document catalog limit precisely
  - optionally keep uploaded rows visible across snapshot rebuilds in the same frontend session without adding `GET /api/phase3/documents`

## Completed
- Rewrote `ui/admin-console/src/screens/DocParseScreen.tsx` copy so the screen now uses clean, readable text only; no garbled zh/ja/en strings remain in this file.
- Kept the current no-new-endpoint boundary and added a small frontend-only guard:
  - synthetic catalog rows from `buildDocuments(snapshot)` are now merged with session-local uploaded rows
  - uploaded rows therefore survive snapshot rebuilds during the same frontend session
- Synced the docParse documentation and backlog wording to make the current limit explicit:
  - there is still no canonical `GET /api/phase3/documents`
  - uploaded rows are still session-local and disappear after remount / fresh app load

## Modified Files
- `ui/admin-console/src/screens/DocParseScreen.tsx`
- `docs/phase3/interface/docParse/functional-spec.md`
- `docs/phase3/interface/docParse/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm run build` in `ui/admin-console`

## Remaining Limits
- uploaded documents are still not restored from backend on remount / fresh app load because the document catalog remains synthetic
- there is still no canonical `GET /api/phase3/documents`
- version history is still event metadata only; it does not expose per-version raw snapshots or diffs

## 2026-05-06 P2-3 Cases editor-side UX hardening and backlog sync

## Task
- Re-check the real `cases` implementation against the current docs and backlog.
- Keep scope inside the existing Phase 3 boundary:
  - no new route system
  - no execution/report/plugin protocol changes
  - no new backend surface unless the current case-detail chain proved incomplete

## Completed
- Re-verified the current `cases` chain end-to-end:
  - backend `CaseDetailService` and `LocalAdminApiServer` already implement the documented `dsl`, `dsl/validate`, `state-machine`, `plans`, and `history` endpoints
  - backend endpoint coverage for those interfaces already exists in `LocalAdminApiServerTest`
- Rewrote `ui/admin-console/src/screens/CasesScreen.tsx` into a clean, backend-first detail screen because the existing file had both weak UX state handling and heavy text corruption.
- Kept the same Phase 3 interface boundary, but tightened the screen behavior:
  - `DSL`, `State machine`, `Plans`, and `History` now each surface explicit loading / empty / error states
  - DSL validate/save now surface explicit mutation feedback
  - state-machine save now surfaces explicit mutation feedback
  - switching the opened case resets the active tab to `overview` and clears stale tab-specific backend data
  - first opening a case still stays local; backend reads are tab-driven as designed
- Added focused frontend coverage in `ui/admin-console/src/screens/CasesScreen.test.tsx` for:
  - DSL load / validate / save
  - invalid-JSON validation feedback
  - plans/history empty-vs-success surfacing
  - state-machine save feedback
  - case-switch reset behavior
- Synced stale documentation state:
  - `docs/phase3/interface/review-backlog.md` now marks `P2-3` as DONE with the current boundary and remaining limits
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.test.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Attempted but not used as gate:
  - `npm test -- --run src/screens/CasesScreen.test.tsx`
  - `npx vitest run src/screens/CasesScreen.test.tsx --pool=forks --poolOptions.forks.singleFork --reporter=verbose`
  - both remained unstable in the current machine environment (timeout / Vitest worker startup pressure), so build plus code/test inspection is the reliable verification result for this pass

## Remaining Limits
- sidebar info/plans/recent-run panels are still presentational snapshot-derived display
- app-level case catalog save exists, but the visible `cases` screen still does not expose an editable catalog form
- history run rows still do not hand off into `reportDetail`
- plans and history remain read-only on the current Phase 3 boundary

## 2026-05-07 P3-1 canonical docParse document-list backend

## Task
- Start the new backlog mainline at `P3-1` and move `docParse` from a synthetic catalog seed toward a canonical backend document list:
  - implement `GET /api/phase3/documents`
  - assemble stable persisted list metadata from existing file-backed document storage
  - make `DocParseScreen` prefer the new list API while keeping the current detail-read/write chain
  - sync the relevant Phase 3 docs and progress records

## Completed
- Updated `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/DocumentPersistenceService.java`:
  - added `listDocuments(projectKey)` backed by existing `config/phase3/documents/<documentId>/meta.json` plus `parse-result.json`
  - list rows now expose stable persisted metadata: `id`, `name`, `projectKey`, `projectName`, `status`, `updatedAt`, `model`, `detectedCases`, `subtitle`
- Updated `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`:
  - added canonical `GET /api/phase3/documents`
  - supports optional `projectKey` query filtering
- Updated `ui/admin-console/src/screens/DocParseScreen.tsx`:
  - document catalog now prefers `GET /api/phase3/documents`
  - synthetic `buildDocuments(snapshot)` rows remain only as fallback shell entries when no persisted backend document exists yet
  - upload / re-parse / manual-save now refresh backend list metadata in addition to refreshing detail reads
- Updated frontend/backend type/test scaffolding to match the new list contract:
  - `ui/admin-console/src/types.ts`
  - existing `DocParseScreen` / `App` test mocks now include the document-list fetch path
- Synced docs:
  - `docs/phase3/interface/docParse/functional-spec.md`
  - `docs/phase3/interface/docParse/interface-spec.md`
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/DocumentPersistenceService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/DocParseScreen.tsx`
- `ui/admin-console/src/screens/DocParseScreen.test.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/docParse/functional-spec.md`
- `docs/phase3/interface/docParse/interface-spec.md`
- `docs/phase3/interface/ui-control-interface-overview.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - no test run
  - no build run

## Remaining Limits
- `DocParseScreen` still keeps snapshot-derived fallback shell rows so unpersisted preview entries remain reviewable before real upload
- project-rail counts still partly reflect snapshot-derived fallback rows rather than a purely persisted document registry
- document detail remains backend-first, but parse-result fallback content is still shown when no persisted backend document exists

## 2026-05-07 P3-2 canonical runId in cases history payload

## Task
- Continue the new backlog mainline at `P3-2`:
  - add dedicated canonical `runId` to `GET /api/phase3/cases/{caseId}/history`
  - switch `cases` history/recent-run handoff to prefer backend-provided `runId`
  - keep fallback only for older history payloads that still omit `runId`
  - sync the adjacent `cases` / `reports` / `reportDetail` / `dataDiff` docs and progress records

## Completed
- Updated `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CaseDetailService.java`:
  - default `history` payload now includes dedicated `runId` for each run row
- Updated shared/frontend history consumption:
  - `ui/admin-console/src/types.ts`
    - `CaseHistoryResponse.runs[]` now carries optional `runId`
  - `ui/admin-console/src/screens/CasesScreen.tsx`
    - history-tab and sidebar recent-run clicks now hand off `run.runId ?? run.runName`
    - current backend payloads therefore prefer canonical `runId`, while older payloads still retain the compatibility path
- Updated regression scaffolding:
  - `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
    - case-history endpoint check now asserts `runId`
  - `ui/admin-console/src/screens/CasesScreen.test.tsx`
    - history callback now receives canonical `runId` when present
  - `ui/admin-console/src/App.test.tsx`
    - `cases -> reportDetail` handoff test now uses backend-provided `runId`
    - fallback test now explicitly documents the older-history-without-`runId` path
- Synced docs:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/reports/interface-spec.md`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
  - `docs/phase3/interface/dataDiff/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/CaseDetailService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.test.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/reports/interface-spec.md`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - no test run
  - no build run

## Remaining Limits
- fallback to `runName` is still retained for older history payloads that may not yet include dedicated `runId`
- this pass only stabilizes the `cases` history handoff contract; it does not attempt wider report-chain backend-native cleanup

## 2026-05-07 Cases sidebar recent-runs history reuse follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` boundary:
  - upgrade the right-sidebar `Recent runs` panel from static placeholder data to a real summary derived from already loaded case history
  - reuse the existing App-level `reportDetail` handoff for any sidebar run drill-down
  - do not add a new backend request, route system, backend contract, or protocol change
  - do not run tests in this pass

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - sidebar `Recent runs` now reuses `historyState.data` after the `History` tab has loaded the current case
  - sidebar summary bars and pass/fail/warn totals are derived from real run statuses instead of static placeholder values
  - sidebar recent-run entries are now clickable and reuse `onOpenHistoryRun(runName)`
  - sidebar `Info` panel `Last run` now also reflects the latest loaded history run when available
  - when history is still idle/loading/empty/error, the sidebar shows explicit state text instead of inventing synthetic run data
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`

- 2026-05-07: Completed the `cases` derived-preview residual-scan follow-up.
  - Scanned `docs/phase3/interface/cases/` for old sample shapes already removed from `CasesScreen` derived-preview UI:
    - `#primary-entry`
    - `/checkout`
    - `AUTO-E2E-2026`
    - `@demo.local`
    - `snapshot diff = expected`
    - `status = "done"`
    - `button.primary`
    - `[name=account]`
    - `[name=token]`
  - Result:
    - no remaining matches inside `docs/phase3/interface/cases/`
    - no additional doc正文 change was needed in this pass
  - Keep the explicit boundary:
    - no code change
    - no new backend interface
    - no route change
    - no App-level handoff change
    - no backend-contract change
    - no test run
    - no build run

- 2026-05-07: Completed the `cases` derived-preview path-example alignment follow-up.
  - Updated `docs/phase3/interface/cases/interface-spec.md`:
    - replaced the remaining `"/checkout"` DSL example URLs with `<preview-entry-path>`
    - kept those example blocks aligned with current `CasesScreen` preview placeholders instead of real-path-shaped samples
  - Keep the explicit boundary:
    - no code change
    - no new backend interface
    - no route change
    - no App-level handoff change
    - no backend-contract change
    - no test run
    - no build run

- 2026-05-07: Completed the `cases` derived-preview doc example alignment follow-up.
  - Updated `docs/phase3/interface/cases/interface-spec.md`:
    - replaced the two remaining `#primary-entry` DSL example targets with `<preview-entry-locator>`
    - aligned the interface-spec example blocks with the current `CasesScreen` derived-preview wording instead of old real-locator-shaped samples
  - Keep the explicit boundary:
    - no code change
    - no new backend interface
    - no route change
    - no App-level handoff change
    - no backend-contract change
    - no test run
    - no build run

- 2026-05-07: Completed the `cases` locator/path placeholder cleanup.
  - Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
    - replaced the entry path sample with `<preview-entry-path>`
    - replaced the healed locator sample with `<preview-entry-locator>`
    - replaced the field locator samples with `<preview-account-field>` and `<preview-token-field>`
    - replaced the submit control and success path samples with `<preview-submit-control>` and `<preview-success-path>`
  - Synced docs/backlog:
    - `docs/phase3/interface/cases/functional-spec.md`
    - `docs/phase3/interface/cases/interface-spec.md`
    - `docs/phase3/interface/review-backlog.md`
  - Keep the explicit boundary:
    - no new backend interface
    - no route change
    - no App-level handoff change
    - no save-flow change
    - no test run
    - no build run
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution

## Remaining Limits
- sidebar `Info` / `Recent runs` still depend on `History` tab data being loaded first and do not issue an independent request
- sidebar `Plans` remains local/static display
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible

## 2026-05-07 Cases sidebar plans reuse follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` sidebar cleanup:
  - upgrade the right-sidebar `Plans` panel from static local content to a real summary derived from already loaded case plans
  - do not add any new request, handoff, route behavior, or backend/protocol change
  - do not run tests in this pass

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - sidebar `Plans` now reuses `plansState.data` after the `Plans` tab has loaded the current case
  - sidebar plan rows now render real `plans[]` summary data instead of hard-coded placeholder content
  - sidebar preconditions now reuse real `preconditions[]` data when available
  - when plans are still idle/loading/empty/error, the sidebar shows explicit state text instead of inventing synthetic plan rows
  - sidebar remains read-only and does not introduce a new editor or drill-down path
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution

## Remaining Limits
- sidebar `Plans` still depends on `Plans` tab data being loaded first and does not issue an independent request
- sidebar `Info` / `Recent runs` still depend on `History` tab data being loaded first and do not issue an independent request
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible

## 2026-05-07 Cases overview catalog editor restore follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` boundary:
  - restore a visible, minimal case catalog editor in the overview region
  - reuse the existing App-level draft/update/save callbacks and existing `POST /api/phase3/catalog/case` persistence chain
  - keep the editor separate from the backend-first detail canvas
  - do not run tests or build in this pass

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - restored a visible overview-region catalog editor instead of keeping edit props hidden
  - editor now reuses existing `onCaseChange`, `onAddCaseRow`, `onRemoveCaseRow`, and `onSubmit`
  - visible field set is limited to `id`, `projectKey`, `name`, `tags`, `status`, and `archived`
  - save feedback now surfaces next to the editor through existing `caseState`
  - detail canvas behavior remains separate and unchanged
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` still depends on `Plans` tab data being loaded first and does not issue an independent request
- sidebar `Info` / `Recent runs` still depend on `History` tab data being loaded first and do not issue an independent request

## 2026-05-07 Cases sidebar preload warmup follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` cleanup:
  - preload existing `plans` / `history` reads when a case is opened so sidebar summaries can hydrate without manual tab switching
  - keep `activeTab` unchanged and avoid a second request path
  - do not run tests or build in this pass

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - opening a case while staying on `overview` now preloads the existing `loadPlans()` / `loadHistory()` reads for that case
  - preloaded sidebar state still reuses the same `plansState` / `historyState` consumed by the corresponding tabs
  - `plans` / `history` tab activation now skips a redundant same-case reload when that state is already present
  - case-switch reset behavior remains unchanged, so stale per-case state is still cleared before the next preload
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases step-note preview wording follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - reduce the most execution-like note sentences inside `buildDetailSteps()`
  - keep the local derived structure unchanged
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - changed note text such as `Navigate to entry.`, `Submit the happy path.`, `URL assertion.`, `Database assertion.`, and `Snapshot diff.` into preview/derived wording
  - kept the existing `detailSteps` count, action mix, and row structure unchanged
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases sample-literal placeholder cleanup follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - reduce the most production-looking sample literals inside `buildDetailSteps()`
  - keep the local derived structure unchanged
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - replaced the email-like account sample with `<preview-account>`
  - replaced the token-like sample with `<preview-token>`
  - replaced the DB-style assertion text with `<preview-db-assertion>`
  - replaced the diff assertion sample with `<preview-diff-assertion>`
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases step-row preview-field wording follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - make step-row field wording read as preview/sample/derived-note rather than runtime detail
  - do not change `buildDetailSteps()` or the step-card structure
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - selector cells now render as `Preview selector: ...`
  - value cells now render as `Sample value: ...` or explicit no-sample text
  - note/healed cells now render as `Derived note: ...` wording instead of looking like runtime-authored detail
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases step-card derived-preview label follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - make the Overview step-card explicitly disclose that it is a local derived summary
  - do not change `buildDetailSteps()` or introduce a backend step timeline
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - added a step-card helper line: `Local derived preview; not a backend-loaded execution timeline.`
  - the existing front-end-generated `detailSteps` model remains unchanged
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases assertion-count placeholder cleanup follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - remove the fixed `5 assertions` value from the overview/detail step-card title
  - derive the count from the existing `detailSteps` summary only
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - added local `assertionStepCount` derived from `detailSteps.filter((step) => step.action === "assert")`
  - replaced the fixed `5 assertions` title text with the derived count
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases owner-placeholder cleanup follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - remove the static fake owner value from the detail sidebar/meta area
  - replace only this one placeholder with explicit unavailable/not-provided text
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - removed the fixed sidebar owner value `Lin Chen`
  - `Owner` now shows explicit not-provided text because current Phase 3 case data has no reusable owner field
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases hero-summary placeholder cleanup follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` UX cleanup:
  - identify the most obvious remaining fake summary in `CasesScreen`
  - replace only one low-risk placeholder using existing state
  - do not add requests, routes, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - replaced the detail-hero fixed summary `14 runs this week | 100% pass`
  - hero subtitle now reuses current-case `historyState` summary when available
  - when history is still preloading / unavailable, the hero now shows explicit state text instead of a fake weekly statistic
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases sidebar preload retry fix follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` cleanup:
  - preserve same-case preload dedupe for `plans` / `history`
  - but allow manual `Plans` / `History` tab activation to retry after failed preload
  - do not change routes, save flows, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - extracted same-case skip logic into a helper
  - same-case reload is now skipped only when the current `plans` / `history` state is `loading` or `success`
  - `error` no longer blocks a manual tab retry for the same case
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` / `Info` / `Recent runs` still depend on the existing `plans` / `history` reads succeeding and do not introduce a second data source

## 2026-05-07 Cases catalog editor add-row context fix follow-up

## Task
- Keep this follow-up narrowly inside the current `P2-3 cases` cleanup:
  - make overview catalog-editor `Add row` respect the current project-filter context
  - avoid the newly added row disappearing immediately in non-first-project views
  - do not change save chain, routes, detail flows, tests, or build

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - `onAddCaseRow` now forwards the current `selectedProjectKey`
- Updated `ui/admin-console/src/App.tsx`:
  - `addCaseDraftRow(projectKey?)` now defaults the new draft row to the forwarded case-project context when it is valid
  - fallback behavior remains the existing first-project default when no valid case-project context is available
- Synced docs/backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/App.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design in this pass:
  - planner explicitly constrained this follow-up to no test execution and no build

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`, so downstream App-level handoff still relies on `snapshot.reports` to resolve one when possible
- sidebar `Plans` still depends on `Plans` tab data being loaded first and does not issue an independent request
- sidebar `Info` / `Recent runs` still depend on `History` tab data being loaded first and do not issue an independent request

## 2026-05-06 Cases history canonical runId follow-up

## Task
- Keep the current `cases` follow-up small and inside the existing Phase 3 boundary:
  - do not treat history `runName` as canonical `runId`
  - resolve canonical `runId` from `snapshot.reports` first
  - fall back to `runName` only when no matching snapshot report exists
  - do not add any backend endpoint, route-system change, or report-detail contract change

## Completed
- Updated `ui/admin-console/src/App.tsx`:
  - added App-level `resolveReportRunId(runNameOrRunId)` helper
  - `openReportDetail()` now first matches `snapshot.reports` by `runId` or `runName`
  - when a matching report exists, the handoff stores canonical `runId`
  - when no matching report exists, the handoff keeps the original value as fallback
- Extended `ui/admin-console/src/App.test.tsx`:
  - added regression coverage for `cases` history -> `reportDetail` using snapshot-resolved canonical `runId`
  - added fallback coverage for history rows whose `runName` cannot be resolved from `snapshot.reports`
- Synced docs and backlog:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
  - `docs/phase3/interface/reports/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reports/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm run build` in `ui/admin-console`

## Remaining Limits
- case-history payload still has no dedicated canonical `runId`
- history run-row handoff still relies on `snapshot.reports` containing the matching `runName` if canonical `runId` resolution is desired
- unresolved history rows still fall back to `runName`

## 2026-05-07 ReportDetail canonical runId doc cleanup follow-up

## Task
- Keep this follow-up documentation-only:
  - align `reportDetail` functional wording with the current App-level canonical `runId` model
  - remove leftover `selected run name` / `selectedRunName` wording
  - do not modify code, route behavior, backend contracts, or tests

## Completed
- Updated `docs/phase3/interface/reportDetail/functional-spec.md`:
  - `selectedRunName` wording replaced with `selectedRunId` / `selectedReportRunId` semantics
  - snapshot fallback wording now references `selectReportViewModel(snapshot, selectedRunId)`
  - `Data diff` handoff rule now refers to the currently selected run id
- Updated `docs/phase3/interface/reportDetail/interface-spec.md`:
  - `reports` -> `reportDetail` relationship now states canonical `runId`
  - identifier note no longer describes App-level selection as `runName`

## Modified Files
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Canonical runId cross-screen terminology follow-up

## Task
- Do a tiny doc-only terminology review around canonical run identifiers without changing implementation:
  - re-check adjacent `reportDetail` / `reports` / `dataDiff` docs against current `App.tsx`
  - remove any wording that still treats selected run context as `runName`
  - keep current residual note only where upstream `cases` history may still fall back to `runName`

## Completed
- Updated `docs/phase3/interface/reports/interface-spec.md`:
  - identifier note now says current UI selection uses canonical `runId`
  - transition note now scopes `runName -> runId` resolution to history-adjacent fallback only
- Updated `docs/phase3/interface/dataDiff/interface-spec.md`:
  - current run-context source now uses `selectedReportRunId`
  - App-level handoff from `reportDetail` now describes `openDataDiff(selectedReportRunId)`
  - relationship / identifier / remaining-limit notes now use canonical `runId` wording instead of `selectedRunName`
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Canonical runId structured-model doc follow-up

## Task
- Apply one tiny doc-only cleanup to the remaining structured-model wording around canonical run identifiers:
  - fix the leftover `TimelineTarget` example in `reports/interface-spec.md`
  - re-scan adjacent `reportDetail` / `reports` / `dataDiff` specs for similar structured `selectedRunName` / `selectedReportRunName` conflicts

## Completed
- Updated `docs/phase3/interface/reports/interface-spec.md`:
  - `TimelineTarget` now uses `{ kind: "reportDetail"; runId: string }`
  - the same model still keeps `{ kind: "monitor"; runId?: string | null }`
- Re-scanned `docs/phase3/interface/reportDetail/interface-spec.md`, `docs/phase3/interface/reports/interface-spec.md`, and `docs/phase3/interface/dataDiff/interface-spec.md`:
  - no other structured-model conflicts remained in this target range
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Canonical runId monitor/dashboard terminology follow-up

## Task
- Do one tiny adjacent doc-only terminology review around runtime/report handoff:
  - re-scan `monitor` / `dashboard` specs for direct conflicts with current canonical run identifier semantics
  - fix only wording that still describes cross-screen selected run context as `runName`

## Completed
- Updated `docs/phase3/interface/dashboard/interface-spec.md`:
  - downstream handoff now describes `dataDiff -> openDataDiff(runId ?? selectedReportRunId)`
- Re-scanned:
  - `docs/phase3/interface/monitor/interface-spec.md`
  - `docs/phase3/interface/dashboard/functional-spec.md`
  - `docs/phase3/interface/dashboard/interface-spec.md`
  - no other direct `selectedRunName` / `selectedReportRunName` conflicts remained in this target range
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Canonical runId overview-doc terminology follow-up

## Task
- Do one tiny doc-only terminology review in summary/overview documents:
  - re-scan `ui-control-interface-overview.md` and `review-backlog.md`
  - confirm there is no remaining name-based selected-run wording conflicting with current canonical run identifier semantics

## Completed
- Re-scanned:
  - `docs/phase3/interface/ui-control-interface-overview.md`
  - `docs/phase3/interface/review-backlog.md`
- Result:
  - no direct `selectedRunName` / `selectedReportRunName` / `selected run name` conflicts remained in this target range
  - no summary-doc正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Canonical runId phase3-interface sweep follow-up

## Task
- Run one constrained terminology sweep under `docs/phase3/interface/`:
  - grep for direct conflicts such as `selectedRunName`, `selectedReportRunName`, and other name-based selected-run wording
  - fix only the smallest remaining canonical run identifier conflicts

## Completed
- Updated `docs/phase3/interface/reports/functional-spec.md`:
  - screen input wording now uses `selectedRunId`
  - report-detail navigation output now describes `onOpenDetail(runId)`
  - selected-project follow rule now keys off `selectedRunId`
- Updated `docs/phase3/interface/dataDiff/functional-spec.md`:
  - screen dependency wording now uses `selectedRunId`
  - selected-run context note now uses `selectReportViewModel(snapshot, selectedRunId)`
  - screen-input wording now says selected run id instead of selected run name
- Sweep result:
  - direct residual conflicts were limited to these two functional-spec files in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Canonical runId phase3-interface final sweep follow-up

## Task
- Run one final constrained canonical-runId terminology sweep under `docs/phase3/interface/`:
  - re-check direct conflicts such as `selectedRunName`, `selectedReportRunName`, `selected run name`, and other name-based selected-id wording
  - leave legitimate payload `runName` fields and `cases` history fallback semantics untouched

## Completed
- Re-scanned the full `docs/phase3/interface/` directory for direct canonical-runId terminology conflicts.
- Result:
  - no new direct conflicts remained in this target range
  - no document正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 ReportDetail fallback wording cleanup follow-up

## Task
- Re-check `reportDetail` docs for wording that conflicts with the current backend-first-but-still-has-fallback implementation:
  - do not change code
  - only correct statements that still imply the detail screen is purely view-model-backed

## Completed
- Updated `docs/phase3/interface/reportDetail/functional-spec.md`:
  - summary-panel wording now says API report is primary and snapshot-derived view model is fallback
  - screenshot/assertion sections now distinguish API-backed primary rendering from fallback view-model rendering
  - detail-model section now explicitly describes `GET /api/phase3/runs/{runId}/report` as primary and `selectReportViewModel(snapshot, selectedRunId)` as fallback-only
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 ReportDetail interface-spec fallback review follow-up

## Task
- Re-check `docs/phase3/interface/reportDetail/interface-spec.md` for wording that would conflict with the current backend-first-but-still-has-fallback implementation:
  - do not change code
  - only change正文 if interface-spec still implies API-only / no-fallback semantics

## Completed
- Re-reviewed `docs/phase3/interface/reportDetail/interface-spec.md` against current `ReportDetailScreen.tsx` semantics:
  - `GET /api/phase3/runs/{runId}/report` remains documented as the primary detail path
  - fallback to `selectReportViewModel(snapshot, selectedRunId)` is already documented
  - artifact, recovery, and AI-decisions sections already distinguish backend-backed reads from fallback/mock behavior
- Result:
  - no interface-spec正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Cases-history runId fallback wording review follow-up

## Task
- Re-check the adjacent `cases` / `reports` / `reportDetail` / `dataDiff` docs for consistency around one remaining limit:
  - `case-history` still lacks a dedicated canonical `runId`
  - upstream history handoff may therefore still fall back to `runName`

## Completed
- Re-reviewed:
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/reports/interface-spec.md`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
  - `docs/phase3/interface/dataDiff/interface-spec.md`
- Result:
  - the current wording is already consistent for this remaining limit
  - `cases` explicitly states that the case-history payload has no dedicated canonical `runId`
  - `reports` / `dataDiff` already describe the corresponding history-adjacent `runName -> runId` resolution path
  - `reportDetail` does not introduce a contradictory statement
  - no正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Cases sidebar data-source/failure-state wording review follow-up

## Task
- Re-check the `cases` sidebar wording across the adjacent docs for one remaining limit:
  - sidebar `Plans` / `Info` / `Recent runs` reuse existing `plans` / `history` state only
  - no separate request path or second data source is introduced
  - read failure should surface through explicit unloaded/loading/error/empty-style states

## Completed
- Re-reviewed:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`
- Result:
  - the current wording is already consistent for this remaining limit
  - the docs already agree that the sidebar does not issue independent requests
  - the docs already agree that sidebar summaries reuse existing `plansState` / `historyState`
  - the docs already agree that failure/unloaded/empty states are surfaced explicitly instead of introducing a second data source
  - no正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Cases plans/history read-only wording review follow-up

## Task
- Re-check the adjacent `cases` docs for one remaining Phase 3 boundary:
  - `Plans` and `History` stay read-only
  - no write endpoints or editing surface are present today
  - future write/edit capability can be added later

## Completed
- Re-reviewed:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`
- Result:
  - the current wording is already consistent for this remaining limit
  - the docs already agree that `Plans` / `History` are read-only on the current Phase 3 boundary
  - the docs already agree that no write interface or editor is exposed for these two areas today
  - the docs already agree that future write/edit capability can be added later
  - no正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 ReportDetail fallback remaining-limit wording review follow-up

## Task
- Re-check `review-backlog.md` and adjacent `reportDetail` docs for one stable remaining limit:
  - `reportDetail` stays backend-first
  - backend detail read failure still falls back to the snapshot-derived view model

## Completed
- Re-reviewed:
  - `docs/phase3/interface/review-backlog.md`
  - `docs/phase3/interface/reportDetail/functional-spec.md`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
- Result:
  - the current wording is already consistent for this remaining limit
  - the `reportDetail` docs already distinguish backend-first primary reads from snapshot-derived fallback on failure
  - `review-backlog.md` does not introduce a contradictory statement
  - no正文 change was needed in this pass
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-07 Phase 3 remaining-backend backlog planning

## Task
- Convert the current backlog state into a concrete next-phase backend plan:
  - separate already-built Phase 3 backend work from remaining backend gaps
  - record new priority levels for the still-missing backend work
  - keep this as planning/documentation only

## Completed
- Updated `docs/phase3/interface/review-backlog.md` with new post-P2 planning priorities:
  - `P3-1` canonical `docParse` document-list backend
  - `P3-2` canonical `runId` in `cases` history payload
  - `P3-3` backend-native report chain completion for `reports` / `reportDetail` / `dataDiff`
  - `P3-4` runtime/plugin realism upgrade for `monitor` / `plugin`
  - `P3-5` stronger backend services for `dataTemplates` / `models` / `environments`
  - `P4-1` typed summary/read models for `dashboard` / `projects` / `execution`
- Updated the suggested implementation order to follow those new backend priorities.
- Updated records:
  - `01_dev_progress.md`
  - `memory.txt`

## Verification
- Not run by design:
  - documentation-only planning follow-up

## Remaining Limits
- `reportDetail` still uses snapshot-derived fallback view-model data when backend detail reads fail
- `case-history` payload still has no dedicated canonical `runId`, so upstream `cases` history handoff may still fall back to `runName`

## 2026-05-06 CasesScreen handoff and validate review follow-up

## Task
- Fix the two new `CasesScreen` review findings without expanding scope:
  - make `initialProjectKey` / `initialCaseId` one-shot handoff input only, so later manual project switching is not overwritten by stale handoff props
  - separate local DSL JSON parse failure from backend/network validate failure so only local parse errors show `Invalid JSON`

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - added one-shot handoff consumption for `initialProjectKey` / `initialCaseId`
  - old handoff props no longer re-open or re-select the prior case after the operator manually switches project
  - `handleValidateDsl()` now parses JSON in a dedicated local step before the backend request
  - local parse failure still renders `Invalid JSON`
  - backend/non-2xx validation failure now keeps real error state and no longer synthesizes fake `dslValidation` output
- Updated `ui/admin-console/src/App.tsx`:
  - normal sidebar navigation into `cases` now clears stored case handoff project/id so remounting the screen does not replay an old handoff
- Extended frontend coverage:
  - `ui/admin-console/src/App.test.tsx`
    - manual project switch still works after prepared-case handoff into `cases`
  - `ui/admin-console/src/screens/CasesScreen.test.tsx`
    - local invalid JSON stays local-only
    - validate non-2xx shows real error state instead of fake `Invalid JSON`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.test.tsx`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm test -- --run src/App.test.tsx -t "allows manual project switching after a cases handoff without reapplying the old handoff|clears the one-shot prepared-case handoff when cases is reopened from normal navigation|opens cases from execution prepared-case drill-down via the existing App handoff"` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Attempted but not used as gate:
  - `npm test -- --run src/screens/CasesScreen.test.tsx`
  - `npx vitest run src/screens/CasesScreen.test.tsx -t "shows invalid JSON feedback without sending validate request|keeps backend validation failures as real error state without synthesizing invalid JSON" --pool=forks --poolOptions.forks.singleFork`
  - current machine still shows the same Vitest hang / worker-startup instability for this test file, so `build` plus the App-targeted run are the stable verification results here

## 2026-05-06 Cases history run-row handoff follow-up

## Task
- Continue the current `cases` follow-up without adding any backend endpoint:
  - wire `History` tab run rows into the existing App-level `reportDetail` handoff
  - prefer reusing `openReportDetail(runName)`
  - add frontend regression coverage
  - sync the Phase 3 `cases` docs and backlog

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - added an App-level `onOpenHistoryRun(runName)` callback
  - changed `History` run rows from passive display into clickable buttons
  - row click now reuses the current shell handoff instead of introducing a new route or backend API
- Updated `ui/admin-console/src/App.tsx`:
  - passed existing `openReportDetail` into `CasesScreen` as the history run-row handoff target
- Extended frontend coverage:
  - `ui/admin-console/src/App.test.tsx`
    - added `cases` history -> `reportDetail` handoff regression coverage
  - `ui/admin-console/src/screens/CasesScreen.test.tsx`
    - added direct callback coverage for history run-row click
- Synced docs:
  - `docs/phase3/interface/cases/functional-spec.md`
  - `docs/phase3/interface/cases/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.test.tsx`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/cases/functional-spec.md`
- `docs/phase3/interface/cases/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npx vitest run src/App.test.tsx -t "opens cases from execution prepared-case drill-down via the existing App handoff"` in `ui/admin-console`
- Passed: `npm run build` in `ui/admin-console`
- Attempted but not used as gate:
  - `npx vitest run src/App.test.tsx -t "opens reportDetail from cases history run rows via the existing App handoff"`
  - `npx vitest run src/App.test.tsx -t "opens reportDetail from cases history run rows via the existing App handoff" --pool=forks --poolOptions.forks.singleFork`
  - `npx vitest run src/screens/CasesScreen.test.tsx -t "hands off history run rows through the existing app-level callback" --pool=forks --poolOptions.forks.singleFork`
  - this machine still shows the same Vitest hang / worker-startup instability for some targeted tests, so `build` is the stable gate in this pass

## 2026-05-06 P2-3 CasesScreen race and URL-encoding review follow-up

## Task
- Address the current review findings in `CasesScreen` without expanding scope:
  - isolate or abort in-flight tab requests so stale responses cannot overwrite a newly opened case
  - apply `encodeURIComponent` to all case-detail fetch URLs
  - add focused frontend coverage for the stale-response race and caseId URL encoding

## Completed
- Updated `ui/admin-console/src/screens/CasesScreen.tsx`:
  - added per-tab abort + request-version isolation for `dsl`, `stateMachine`, `plans`, and `history`
  - switching case or reopening the same tab now aborts the old in-flight request for that tab
  - late responses from an older request version are ignored even if they still resolve
  - all case-detail fetch URLs now encode `caseId` via `encodeURIComponent`
- Extended `ui/admin-console/src/screens/CasesScreen.test.tsx` with two focused cases:
  - stale DSL response arrives after switching to another case and must not overwrite the newer case detail
  - encoded `caseId` is used in the backend detail URL

## Modified Files
- `ui/admin-console/src/screens/CasesScreen.tsx`
- `ui/admin-console/src/screens/CasesScreen.test.tsx`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `npm run build` in `ui/admin-console`
- Not run by design in this pass:
  - targeted Vitest execution was skipped per current local workflow preference because frontend tests on this machine are frequently unstable / blocking

## Remaining Limits
- sidebar info/plans/recent-run panels are still presentational snapshot-derived display
- app-level case catalog save exists, but the visible `cases` screen still does not expose an editable catalog form
- history run rows still do not hand off into `reportDetail`
- plans and history remain read-only on the current Phase 3 boundary

## 2026-05-07 P3-3 reports backend-native summary follow-up

## Task
- Continue the new backlog mainline by pushing one small but high-value part of `P3-3` into code:
  - reduce `reports` list dependence on front-end synthetic row enrichment
  - keep scope on the list contract and minimum necessary backend summary fields
  - do not expand into a full `reportDetail` / `dataDiff` refactor

## Completed
- Updated backend run-summary assembly in `ReportArtifactService.java`:
  - `GET /api/phase3/runs/` / `.../report-summary` now include `tags`
  - tag values are normalized from either array or comma-delimited raw report payloads
  - fallback summaries now also expose an empty `tags` list
- Updated frontend list consumption:
  - `ui/admin-console/src/screens/ReportsScreen.tsx` no longer re-matches `snapshot.cases` to populate API-row tags
  - canonical run-list rows now supply `caseTags` directly from backend summary data
  - snapshot/view-model mapping remains only as the existing API-unavailable fallback path
- Synced minimal regression scaffolding:
  - `LocalAdminApiServerTest.java` now seeds `tags` into a persisted `report.json` and asserts they round-trip through `GET /api/phase3/runs/`
- Synced docs:
  - `docs/phase3/interface/reports/interface-spec.md`
  - `docs/phase3/interface/reports/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/ReportsScreen.tsx`
- `docs/phase3/interface/reports/interface-spec.md`
- `docs/phase3/interface/reports/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `reports` list is now backend-first for visible summary rows, but snapshot/view-model fallback still remains when `GET /api/phase3/runs/` is unavailable
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail
- `dataDiff` still keeps deterministic mock/raw fallback paths that should later be replaced with real run-artifact-backed payloads

## 2026-05-07 P3-3 dataDiff restore-result backend-owned empty-shell follow-up

## Task
- Continue `P3-3` with one small `dataDiff`-chain code slice:
  - remove the most misleading deterministic fallback on the backend side
  - prefer explicit backend-owned missing-artifact semantics over fake restore content
  - keep scope tighter than a full `dataDiff` / `reportDetail` chain refactor

## Completed
- Updated `ReportArtifactService.java`:
  - `GET /api/phase3/runs/{runId}/restore-result` no longer fabricates a `PARTIAL` restore payload with fake steps when `restore-result.json` is missing
  - missing or unreadable restore artifacts now return a backend-owned empty shell:
    - `status: "UNAVAILABLE"`
    - `items: []`
- Left `data-diff/raw` unchanged in this pass:
  - `restore-result` was the smaller and safer first target because `DataDiffScreen` already had an explicit empty-state branch for `items.length === 0`
  - this lets the UI stop showing fake restore steps without changing the page contract shape
- Synced docs:
  - `docs/phase3/interface/dataDiff/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `data-diff/raw` still falls back to deterministic mock content when no persisted raw artifact exists
- `dataDiff` table rows still retain the existing synthetic fallback path when the diff endpoint itself is unavailable
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-14 P3-4 monitor last-event provenance hint

## Completed
- Updated backend `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/status` now emits additive top-level `lastEventSource`
  - values stay minimal:
    - `ARTIFACT`
    - `SCHEDULER`
    - `NONE`
  - the marker follows the existing last-event priority chain instead of introducing a new event model
  - the no-event path was also tightened so `lastEventAt` no longer dereferences a null latest event while returning `lastEventSource: "NONE"`
- Updated front-end monitor typing/rendering:
  - `RunStatus` now accepts optional `lastEventSource`
  - `MonitorScreen` footer `Last event` now shows a lightweight provenance hint
  - if the marker is absent in older payloads, the footer still uses a small legacy inference path and does not break
- Expanded regression coverage:
  - `LocalAdminApiServerTest` now asserts artifact-backed, scheduler-backed, and no-event `lastEventSource` values
  - `MonitorScreen.test.tsx` now covers:
    - run-local source hint rendering
    - legacy missing-marker compatibility

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `lastEventSource` is still only a coarse top-level provenance hint; it does not model per-entry provenance or richer event metadata
- legacy payload inference remains intentionally minimal and only exists to preserve compatibility while older status payloads omit the marker

## 2026-05-14 P3-4 monitor queue-pressure provenance hint

## Completed
- Updated backend `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/status` now emits additive top-level `queueStateSource`
  - backend values stay minimal:
    - `REQUEST_CONTEXT`
    - `NONE`
  - when persisted request context provides `queueState`, `/status` marks it as `REQUEST_CONTEXT`
  - when run-local status has no queue context, the backend stays conservative with `NONE` and does not pretend to own snapshot fallback semantics
- Updated front-end monitor typing/rendering:
  - `RunStatus` now accepts optional `queueStateSource`
  - `MonitorScreen` footer `Queue pressure` now shows a lightweight provenance hint
  - if older payloads omit the marker, the footer still keeps a minimal compatibility inference path and preserves the existing snapshot fallback
- Expanded regression coverage:
  - `LocalAdminApiServerTest` now asserts request-context and none `queueStateSource` values
  - `MonitorScreen.test.tsx` now covers:
    - explicit queue source hint rendering
    - legacy missing-marker compatibility
    - snapshot-fallback source hint rendering

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `queueStateSource` is still only a coarse provenance hint and does not model deeper queue ownership or richer scheduling context
- frontend legacy inference is intentionally split between run-local `REQUEST_CONTEXT` and parent `SNAPSHOT_FALLBACK`; the backend itself still only emits run-local semantics

## 2026-05-14 P3-4 monitor footer fallback helper consolidation

## Completed
- Refactored `ui/admin-console/src/screens/MonitorScreen.tsx` so the remaining parent-snapshot footer reads are no longer scattered inline:
  - queue footer now resolves through a dedicated helper with explicit ordering:
    - run-local `queueState`
    - snapshot `workQueue[0].detail`
    - none
  - last-event footer now resolves through a dedicated helper with explicit ordering:
    - run-local `lastEventSummary` / `lastEventAt`
    - snapshot `timeline[0]`
    - none
- Kept behavior unchanged:
  - no new endpoint
  - no contract change
  - no report/plugin impact
- Expanded front-end regression coverage:
  - existing queue and last-event run-local-first / snapshot-fallback tests remain green
  - added a new explicit `none last` footer regression for the case where neither run-local nor snapshot footer context exists

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this round only centralized the fallback ordering; it did not remove the remaining snapshot footer dependency yet
- the helper outputs still consume the existing run-local status fields rather than a richer dedicated footer/read model

## 2026-05-14 P3-4 monitor queue-pressure fallback tightening

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - `Queue pressure` now treats explicit `runStatus.queueStateSource === "NONE"` as authoritative run-local no-context state
  - in that branch, the footer no longer falls back to `snapshot.workQueue[0].detail`
  - instead it shows explicit copy:
    - `No run-local queue context is available yet.`
  - compatibility boundary remains intact:
    - explicit marker present -> trust marker
    - marker absent in older payloads -> keep the legacy snapshot fallback
- Expanded front-end regression coverage:
  - explicit `queueStateSource: "NONE"` now asserts the snapshot queue fallback is suppressed
  - legacy missing-marker fallback coverage remains intact
- Synced docs/records:
  - `docs/phase3/interface/monitor/interface-spec.md`
  - `docs/phase3/interface/monitor/functional-spec.md`
  - `memory.txt`
  - `01_dev_progress.md`

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this round only removes the snapshot queue fallback when the newer `queueStateSource: "NONE"` marker is present; older payloads still intentionally keep the legacy fallback path
- other footer areas still retain their existing snapshot compatibility behavior

## 2026-05-14 P3-4 monitor last-event fallback tightening

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - `Last event` now treats explicit `runStatus.lastEventSource === "NONE"` as authoritative run-local no-context state
  - in that branch, the footer no longer falls back to `snapshot.timeline[0]`
  - instead it shows explicit copy:
    - `No run-local event context is available yet.`
  - compatibility boundary remains aligned with `Queue pressure`:
    - explicit marker present -> trust marker
    - marker absent in older payloads -> keep the legacy snapshot fallback
- Expanded front-end regression coverage:
  - explicit `lastEventSource: "NONE"` now asserts the snapshot timeline fallback is suppressed
  - legacy missing-marker fallback coverage remains intact
- Synced docs/records:
  - `docs/phase3/interface/monitor/interface-spec.md`
  - `docs/phase3/interface/monitor/functional-spec.md`
  - `memory.txt`
  - `01_dev_progress.md`

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this round only removes the snapshot last-event fallback when the newer `lastEventSource: "NONE"` marker is present; older payloads still intentionally keep the legacy fallback path
- other footer areas still retain their existing snapshot compatibility behavior

## 2026-05-14 P3-4 monitor selected-run legacy fallback consolidation

## Completed
- Refactored `ui/admin-console/src/screens/MonitorScreen.tsx` so the remaining selected-run snapshot compatibility layer is explicit:
  - introduced a small `legacyMonitorFallback` resolver/helper
  - queue footer now reads snapshot compatibility only through that helper
  - last-event footer now reads snapshot compatibility only through that helper
- Kept behavior unchanged:
  - legacy payloads still keep the existing snapshot fallback behavior
  - explicit `queueStateSource: "NONE"` and `lastEventSource: "NONE"` still win and are not overridden by the compatibility layer
- Expanded front-end regression coverage:
  - existing queue/last-event fallback tests remain green
  - added a combined regression that proves the consolidated helper does not override explicit none markers

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this round only makes the selected-run snapshot compatibility layer explicit; it does not remove the remaining legacy fallback paths yet
- queue and last-event footer compatibility still depend on snapshot data for older payloads that omit the newer run-local markers

## 2026-05-14 P3-4 monitor queue modern-marker hard boundary

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - `resolveQueuePressureFooter()` now treats the presence of modern `queueStateSource` as a hard boundary
  - once the marker exists:
    - `REQUEST_CONTEXT` -> queue footer may only render run-local `queueState`
    - `NONE` -> queue footer may only render the run-local none copy
  - `legacyMonitorFallback` is now only eligible for queue footer when the marker is absent in older payloads
- Expanded front-end regression coverage:
  - added a malformed-modern-payload regression:
    - `queueStateSource: "REQUEST_CONTEXT"`
    - missing `queueState`
    - snapshot fallback must still stay suppressed
  - existing legacy fallback and explicit-none regressions remain green

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- queue footer now has an explicit modern-marker boundary, but other areas still rely on the broader selected-run legacy compatibility layer
- malformed modern payloads still show a generic `--` when run-local queue text is missing; this round only guarantees they do not silently fall back to snapshot data

## 2026-05-14 P3-4 monitor last-event modern-marker hard boundary

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - `resolveLastEventFooter()` now treats the presence of modern `lastEventSource` as a hard boundary
  - once the marker exists:
    - `ARTIFACT` / `SCHEDULER` -> last-event footer may only render run-local `lastEventSummary / lastEventAt`
    - `NONE` -> last-event footer may only render the run-local none copy
  - `legacyMonitorFallback` is now only eligible for last-event footer when the marker is absent in older payloads
- Expanded front-end regression coverage:
  - added a malformed-modern-payload regression:
    - `lastEventSource: "SCHEDULER"`
    - missing `lastEventSummary` / `lastEventAt`
    - snapshot timeline fallback must still stay suppressed
  - existing legacy fallback and explicit-none regressions remain green

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- last-event footer now has an explicit modern-marker boundary, but other areas still rely on the broader selected-run legacy compatibility layer
- malformed modern payloads still show a generic `--` when run-local event summary/time is missing; this round only guarantees they do not silently fall back to snapshot data

## 2026-05-14 P3-4 monitor selected-run footer modern/legacy split

## Completed
- Refactored `ui/admin-console/src/screens/MonitorScreen.tsx` so the selected-run footer now branches explicitly at the top level:
  - modern footer path when both footer markers are present
  - legacy compatibility path when either marker is still absent
- On the modern path:
  - queue footer resolves directly from run-local `queueStateSource`
  - last-event footer resolves directly from run-local `lastEventSource`
  - `legacyMonitorFallback` is not consulted at all
- On the legacy path:
  - existing compatibility behavior remains intact for older payloads that omit one or both markers
- Expanded front-end regression coverage:
  - added a combined modern-path test proving simultaneous queue + last-event markers suppress all snapshot fallback
  - added a combined legacy-path test proving missing markers still route through `legacyMonitorFallback`

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this round only makes the modern-vs-legacy footer split explicit; it does not yet remove the legacy compatibility branch itself
- when only part of the footer has modern markers, the marked side now stays on the run-local path while only the missing-marker side is allowed to use legacy compatibility
- started the next `P3-4 plugin` realism pass by moving popup page identity off the fixed demo string path and onto persisted scheduler request context when available; the old popup demo values are now only the compatibility fallback
- continued that same plugin pass by moving the popup current-page assistive summary off the fixed `3 forms / 8 buttons` text and onto `popupSnapshot.summary`; the fixed copy now remains only as the legacy fallback when summary is absent
- continued the same plugin cleanup by moving the floating popup host label off the fixed `edge.test` string and onto `popupSnapshot.page.domain`; `edge.test` now remains only as the legacy fallback when domain text is absent
- continued the same plugin cleanup by moving the active-run badge off the old binary `running/idle` copy and onto `popupSnapshot.runtime.queueState`; `idle` now remains only as the legacy fallback when queue-state text is absent
- continued the same plugin cleanup by moving the popup mirror selected-element card off the fixed `Pay $89.10` / `role=button / 140x38px / visible` copy and onto additive `/extension-popup` page context fields (`actionHints[0]` and `locator`); the old selected-element text now remains only as the legacy fallback when those fields are absent
- malformed modern payloads still degrade to `--` for missing run-local footer text; the important guarantee remains that they do not silently fall back to snapshot data

## 2026-05-08 P3-4 monitor scheduler-context fallback follow-up

## Task
- Continue `P3-4` on one narrow downstream-consumption slice:
  - let `monitor/status` and the live-page unavailable shell start consuming the richer scheduler request context persisted by quick-smoke
  - avoid any new monitor protocol or broad UI refactor

## Completed
- Updated backend `RunStatusService`:
  - `GET /api/phase3/runs/{runId}/status` now prefers persisted scheduler request `pageUrl` over the older thin `targetUrl` fallback when no stronger live-page artifact exists
  - scheduler-only `currentPage.state` now prefers persisted runtime context (`runtimeMode / queueState / auditState`) instead of the old generic `active` / `idle` shell when stronger artifacts are absent
  - `GET /api/phase3/runs/{runId}/live-page` unavailable shells now carry persisted request context when available:
    - `url` from `pageUrl`
    - `title` from `pageTitle`
    - `pageState` from runtime context summary
    - `highlight.action` from `nextAction` / `bodySummary`
    - `highlight.target` from `locator`
  - live-page available shells also now reuse request-backed `pageUrl` / `pageTitle` / `locator` fallbacks more consistently when artifact fields are partial
- Updated `MonitorScreen.tsx`:
  - the `UNAVAILABLE` live-page branch now keeps the explicit unavailable copy
  - it also renders the existing live-page shell fields (`title`, `url`, `pageState`, context, locator`) so operators can still see richer startup context without any new frontend contract
- Added regression coverage:
  - backend test now asserts richer scheduler request context is surfaced through `/status` fallback and `/live-page` unavailable shells when strong artifacts are missing
  - frontend monitor test now asserts the unavailable live-page panel shows richer fallback context instead of only an empty message
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`
  - `review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- richer scheduler request context is now visible in `monitor/status` and `live-page` fallback shells, but downstream execution/report flows still do not broadly consume or render all persisted quick-smoke context fields
- `monitor/status` still falls back to scheduler-derived shell semantics when strong run-local artifacts are absent; this slice only made that shell more truthful
- Pause/Abort still remain intent-recording only; no real execution-control workflow was added here

## 2026-05-12 P3-4 monitor runtime-log request-context fallback follow-up

## Task
- Continue the same narrow `P3-4 monitor` chain:
  - tighten `GET /api/phase3/runs/{runId}/runtime-log`
  - keep the priority explicit as `runtime.log artifact` -> `scheduler events` -> `persisted scheduler request context shell`
  - avoid any new endpoint, route, plugin protocol, or broader monitor refactor

## Completed
- Updated backend `RunStatusService`:
  - `GET /api/phase3/runs/{runId}/runtime-log` still prefers run-local `runtime.log` lines first
  - when the artifact is absent, it still prefers non-step scheduler-event-derived runtime-log rows next
  - when both sources fail to yield usable runtime-log rows, it now emits a small backend-owned `scheduler-request-context` shell derived from persisted request fields:
    - page identity from `pageTitle` / `pageUrl`
    - runtime summary from `runtimeMode` / `queueState` / `auditState`
    - operator guidance from `nextAction` / `bodySummary`
    - locator cue from `locator`
- Updated `LocalAdminApiServerTest.java`:
  - added backend regression coverage for the new request-context fallback shell
  - existing precedence coverage for artifact-backed and scheduler-event-backed runtime-log paths remains intact
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`
  - `review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## 2026-05-12 P3-4 monitor steps empty-fallback follow-up

## Task
- Continue the narrow `P3-4 monitor` line by tightening `GET /api/phase3/runs/{runId}/steps`
- keep the priority explicit as `report.json.steps[]` -> scheduler `STEP_*` events -> empty fallback
- remove fake placeholder step flows when the backend does not actually know a step timeline

## Completed
- Updated backend `RunStatusService`:
  - removed the old hardcoded placeholder-step generator
  - `GET /api/phase3/runs/{runId}/steps` now returns:
    - report-backed steps when `report.json.steps[]` exists
    - scheduler-backed step rows when real `STEP_*` events exist
    - empty `items` when neither source can support a real step timeline
- Updated `LocalAdminApiServerTest.java`:
  - kept coverage for report-backed precedence
  - kept coverage for scheduler step fallback
  - added coverage for the new empty fallback when only non-step scheduler events exist
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`
  - `review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- `steps` no longer fabricates a placeholder flow, but when both report artifacts and scheduler step events are absent the screen still has only an empty timeline rather than a richer unavailable-state contract
- no new step-status endpoint or explicit `unavailable` marker was introduced in this slice

## 2026-05-12 P3-4 monitor empty-step copy follow-up

## Task
- Continue the same `monitor` polish line after the backend empty-step fallback change
- do not change `/steps` contract
- add explicit front-end no-data copy when `steps.items` is empty

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - the progress area now shows explicit no-step copy when the step bar is empty
  - the step-list panel now shows a more specific explanation that neither report step artifacts nor scheduler step timeline data are available yet
- Updated `ui/admin-console/src/screens/MonitorScreen.test.tsx`:
  - empty-step regression now asserts the new explicit copy
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`

## Modified Files
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this slice only adds explicit no-step copy; it does not introduce a richer unavailable-state payload or dedicated backend marker for the step timeline

## 2026-05-12 P3-4 monitor steps-availability marker follow-up

## Task
- Continue the same small `monitor` line by adding a backend-owned availability marker to `/steps`
- keep the existing `items` shape intact
- let the front end prefer the marker while retaining empty-list compatibility behavior

## Completed
- Updated backend `RunStatusService`:
  - `GET /api/phase3/runs/{runId}/steps` now adds `availability`
  - `availability: "AVAILABLE"` when report-backed or scheduler-backed step rows exist
  - `availability: "UNAVAILABLE"` when the endpoint falls through to the empty fallback
- Updated frontend types and screen logic:
  - `RunStepsResponse` now includes optional `availability`
  - `MonitorScreen` now prefers the backend marker when deciding whether to show the no-step empty-state copy
  - if the marker is absent, the screen still falls back to `items.length === 0` for compatibility
- Updated tests:
  - backend monitor test now asserts `availability` for artifact-backed, scheduler-backed, and empty-fallback step responses
  - frontend monitor test now feeds `availability: "UNAVAILABLE"` into the empty-step case and keeps the no-step copy assertions
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- the new marker only distinguishes `AVAILABLE` vs `UNAVAILABLE`; it does not add richer reason codes or timeline provenance
- this slice does not alter step row metadata, paging, or any non-monitor contract

## 2026-05-12 P3-4 monitor steps-availability review follow-up

## Completed
- Tightened `MonitorScreen.tsx` so both no-step render sites now use the same derived boolean:
  - progress-area no-step copy
  - `Steps timeline` panel no-step copy
- Kept the compatibility boundary inside `resolveStepsAvailability(...)`:
  - legacy `/steps` payloads that omit `availability` still fall back to `items.length === 0`
- Expanded `MonitorScreen.test.tsx`:
  - added a legacy empty-step payload case without `availability`
  - verified the two no-step copy blocks still render and no step drill-down appears

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## 2026-05-12 P3-4 monitor runtime-log availability marker follow-up

## Task
- Continue the same additive-marker pattern from `/steps` onto `/runtime-log`
- keep the existing log-entry shape (`items`, `source`, `message`, `detail`, `nextCursor`) intact
- let the front end prefer the new marker while retaining legacy empty-list compatibility

## Completed
- Updated backend `RunStatusService`:
  - `GET /api/phase3/runs/{runId}/runtime-log` now adds `availability`
  - `availability: "AVAILABLE"` when runtime-log artifact rows, scheduler-event rows, or request-context shell rows exist
  - `availability: "UNAVAILABLE"` only when all three sources are empty and the endpoint returns `items: []`
- Updated frontend types and screen logic:
  - `RuntimeLogResponse` now includes optional `availability`
  - `MonitorScreen` now tracks `runtimeLogAvailability`
  - runtime-log empty-state rendering now prefers the backend marker and falls back to the old `items.length === 0` interpretation when the marker is absent
- Updated tests:
  - backend monitor test now asserts runtime-log availability for artifact-backed, scheduler-event-backed, request-context-backed, and empty-fallback responses
  - front-end monitor test now covers both:
    - `availability: "UNAVAILABLE"` runtime-log empty state
    - legacy runtime-log payload without `availability`
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `runtime-log` availability only distinguishes `AVAILABLE` vs `UNAVAILABLE`; it does not yet carry reason codes for artifact-backed vs scheduler-backed vs request-context-backed availability
- this slice does not alter runtime-log entry metadata, paging, or any non-monitor contract

## 2026-05-12 P3-4 monitor runtime-log source-layer follow-up

## Task
- Continue the same additive-marker pattern on `/runtime-log`
- keep `items`, `source`, `message`, `detail`, `availability`, and `nextCursor` intact
- add one more top-level provenance field for lightweight front-end consumption

## Completed
- Updated backend `RunStatusService`:
  - `GET /api/phase3/runs/{runId}/runtime-log` now includes `sourceLayer`
  - `RUNTIME_ARTIFACT` when run-local `runtime.log` rows win
  - `SCHEDULER_EVENTS` when non-step scheduler-event fallback wins
  - `REQUEST_CONTEXT` when request-context shell rows win
  - `NONE` when the endpoint returns `items: []`
- Updated frontend types and screen logic:
  - `RuntimeLogResponse` now includes optional `sourceLayer`
  - `MonitorScreen` now renders a lightweight source hint in the runtime-log panel header
  - the screen prefers the backend marker first and falls back to a minimal legacy inference from existing entry `source` values or empty-list semantics when the marker is absent
- Updated tests:
  - backend monitor test now asserts runtime-log `sourceLayer` across artifact-backed, scheduler-event-backed, request-context-backed, and empty-fallback cases
  - front-end monitor test now covers:
    - marker-driven `Source: request-context fallback`
    - marker-driven `Source: none`
    - legacy empty runtime-log payload without `sourceLayer`
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `sourceLayer` is still a coarse top-level provenance marker; it does not explain mixed-source or per-entry provenance beyond the existing row-level `source`
- this slice does not alter runtime-log paging, entry metadata, or any non-monitor contract

## 2026-05-13 P3-4 monitor steps source-layer follow-up

## Task
- Continue the same provenance-marker pattern from `/runtime-log` onto `/steps`
- keep `items` and `availability` intact
- add a lightweight front-end hint without changing step-row structure

## Completed
- Updated backend `RunStatusService`:
  - `GET /api/phase3/runs/{runId}/steps` now includes `sourceLayer`
  - `REPORT_ARTIFACT` when `report.json.steps[]` owns the response
  - `SCHEDULER_EVENTS` when scheduler `STEP_*` rows own the response
  - `NONE` when the endpoint returns `items: []`
- Updated frontend types and screen logic:
  - `RunStepsResponse` now includes optional `sourceLayer`
  - `MonitorScreen` now shows a lightweight steps source hint in the panel header
  - the screen prefers the backend marker first and falls back to minimal legacy inference from `items` plus existing fallback rules when the marker is absent
- Updated tests:
  - backend monitor test now asserts step `sourceLayer` across report-backed, scheduler-backed, and empty-fallback responses
  - front-end monitor test now covers:
    - marker-driven `Source: report artifact`
    - marker-driven `Source: none`
    - legacy empty-step payload without `sourceLayer`
- Synced docs:
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `steps.sourceLayer` is a coarse top-level provenance marker; it does not explain mixed-source timelines or per-step provenance
- this slice does not alter step-row metadata or any non-monitor contract

## 2026-05-13 P3-4 monitor live-page source-layer follow-up

## Task
- Continue the same small `monitor` provenance line on `/live-page`
- keep `status`, `url`, `title`, `pageState`, `highlight`, and `screenshotPath` intact
- only add a top-level `sourceLayer` and a lightweight front-end hint

## Completed
- Backend:
  - `GET /api/phase3/runs/{runId}/live-page` now includes `sourceLayer`
  - `sourceLayer: "LIVE_ARTIFACT"` when run-local `live-page.json` or screenshot artifacts back the response
  - `sourceLayer: "REQUEST_CONTEXT"` when live artifacts are absent but the `UNAVAILABLE` shell still carries persisted scheduler request context
  - `sourceLayer: "NONE"` when neither live artifacts nor request-context shell data are available
- Frontend:
  - `LivePage` now includes optional `sourceLayer`
  - `MonitorScreen` now shows a lightweight live-page source hint in the panel header
  - when the marker is absent, the screen falls back to minimal legacy inference from `status`, `screenshotPath`, and existing shell fields
- Tests/docs:
  - backend monitor test now asserts live-page `sourceLayer` across artifact-backed, request-context-backed, and no-source responses
  - front-end monitor test now covers marker-driven live-page hints plus a legacy unavailable live-page payload without `sourceLayer`
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `live-page.sourceLayer` is a coarse top-level provenance marker; it does not describe richer DOM-source provenance beyond artifact vs request-context fallback
- this slice does not add a richer live-page summary model or any non-monitor contract

## 2026-05-13 P3-4 monitor status source-layer follow-up

## Task
- Continue the same small `monitor` provenance line on `/status`
- keep `status`, `progress`, `counters`, `currentPage`, and `control` intact
- only add a top-level `sourceLayer` and a lightweight front-end hint

## Completed
- Backend:
  - `GET /api/phase3/runs/{runId}/status` now includes `sourceLayer`
  - `sourceLayer: "RUN_ARTIFACTS"` when run-local `report.json`, `live-page.json`, or runtime artifact timestamp context strengthens the response
  - `sourceLayer: "SCHEDULER_FALLBACK"` when the response still resolves to the scheduler-backed shell
- Frontend:
  - `RunStatus` now includes optional `sourceLayer`
  - `MonitorScreen` now shows a lightweight status source hint in the hero row
  - when the marker is absent, the screen falls back only to stronger artifact-like current-page signals such as `artifact-captured` and otherwise stays conservative with `SCHEDULER_FALLBACK`
- Tests/docs:
  - backend monitor test now asserts status `sourceLayer` across artifact-strengthened and scheduler-fallback responses
  - front-end monitor test now covers marker-driven status hints plus a legacy status payload without `sourceLayer`
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `status.sourceLayer` is a coarse top-level provenance marker; it does not break down mixed artifact contribution across report/live-page/runtime timestamp context
- this slice does not add richer status reason codes or any non-monitor contract

## 2026-05-13 P3-4 monitor status-counters artifact-priority follow-up

## Task
- Keep working on `GET /api/phase3/runs/{runId}/status`
- tighten `counters.aiCalls` / `counters.heals`
- do not change the response shape or expand into other monitor contracts

## Completed
- Backend:
  - `status.counters.aiCalls` / `status.counters.heals` now prefer artifact-backed sources before scheduler-event fallback
  - priority is:
    - report summary counters when present
    - run-local `runtime.log` line classification
    - scheduler-event counts
  - this keeps `/status` structure unchanged while avoiding stale scheduler-only counts for artifact-backed runs
- Tests/docs:
  - backend monitor test now asserts artifact-backed `aiCalls` / `heals` win over conflicting scheduler-event counts
  - fallback status path still asserts scheduler-event `aiCalls` / `heals` when no artifact-backed counter source exists
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- artifact-backed counter priority currently relies on explicit report summary fields or simple `runtime.log` line classification; it does not extract richer model-call provenance
- this slice does not add counter reason codes or alter any other monitor contract

## 2026-05-13 P3-4 monitor live-page summary follow-up

## Task
- Keep the next `monitor` slice narrow on `GET /api/phase3/runs/{runId}/live-page`
- add a lightweight top-level `summary`
- avoid changing screenshot / highlight / locator structure or any non-monitor contract

## Completed
- Backend:
  - `/live-page` now optionally includes top-level `summary`
  - priority is:
    - `live-page.json.summary`
    - persisted scheduler request `bodySummary`
    - persisted scheduler request `nextAction`
  - when neither artifact nor request-context summary exists, the field is omitted
- Frontend:
  - `LivePage` now includes optional `summary`
  - `MonitorScreen` now renders the summary text inside the `Live page` panel for both artifact-backed and request-context-backed shells
  - screenshot / highlight / locator rendering remains unchanged
- Tests/docs:
  - backend monitor test now asserts artifact-backed and request-context-backed live-page summaries, plus omission on the no-source branch
  - front-end monitor test now asserts live-page summary rendering for artifact-backed, request-context-backed, and legacy live-page payloads
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- `live-page.summary` is still a single lightweight text field; it does not expand into a richer DOM or region-level summary model
- this slice does not add summary provenance reason codes beyond the existing `sourceLayer`

## 2026-05-13 P3-4 monitor control-phase readback follow-up

## Task
- Start the first small `Pause / Abort` readback slice inside `local-admin-api`
- do not connect a real external executor
- make persisted control intent show up more honestly through existing `status` / `control` fields

## Completed
- Backend:
  - `POST /api/phase3/runs/{runId}/pause` now records a persisted `PAUSING` phase event instead of jumping straight to `PAUSED`
  - `POST /api/phase3/runs/{runId}/abort` now records a persisted `ABORTING` phase event instead of jumping straight to `ABORTED`
  - `GET /api/phase3/runs/{runId}/status` now reads those phase events back before any stronger artifact-backed terminal status overrides them
  - `control.canPause` / `control.canAbort` now align more closely with phase status:
    - `PAUSING` disables pause
    - `ABORTING` disables both pause and abort
- Frontend:
  - no new endpoint or extra control field was added
  - `MonitorScreen` continues consuming existing `status` / `control` fields only
  - added a regression asserting `ABORTING` disables both monitor buttons
- Tests/docs:
  - backend monitor test now asserts pause writes `PAUSING`, abort writes `ABORTING`, and `/status` reads both phase states back with aligned control booleans
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- control intent is still local-admin-api persisted state only; no real external executor or scheduler handshake exists yet
- this slice does not add richer control reason codes or any new control-read endpoint

## 2026-05-13 P3-4 monitor control-request readback follow-up

## Task
- Keep the next control slice inside existing `status` / `control`
- add lightweight readback for who requested pause/abort, why, and when
- avoid any new endpoint or external executor integration

## Completed
- Backend:
  - when `status` is `PAUSING` or `ABORTING`, `status.control` now reuses the latest matching persisted control event to expose:
    - `requestedBy`
    - `requestReason`
    - `requestedAt`
  - the values are sourced from the existing persisted event `owner` / `detail` / `at`
- Frontend:
  - `RunStatus.control` now includes those optional additive fields
  - `MonitorScreen` now shows a lightweight control summary line in the hero actions area so operators can see who requested the phase change, why, and when
- Tests/docs:
  - backend monitor test now asserts pause/abort `/status.control` readback fields
  - front-end monitor test now asserts the aborting-state summary line renders
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- control request metadata is still only available during persisted `PAUSING` / `ABORTING` phase readback; there is no richer control history view yet
- this slice does not add any new control-read endpoint or external executor handshake

## 2026-05-13 P3-4 monitor control-runtime-log follow-up

## Task
- Extend the same persisted control readback line into `GET /api/phase3/runs/{runId}/runtime-log`
- keep the existing runtime-log entry shape intact
- avoid any front-end contract expansion unless the current UI cannot render the data

## Completed
- Backend:
  - when `runtime.log` artifact does not override control semantics, persisted `PAUSING` / `ABORTING` scheduler events now emit backend-owned scheduler-event log rows
  - those rows keep the existing runtime-log entry shape and reuse:
    - `source: "scheduler-events"`
    - control-specific `summary`
    - `message` for the request reason
    - `detail.requestedBy` / `detail.requestedAt` / `detail.requestReason`
- Frontend:
  - no code change was required; the existing runtime-log row/detail UI already renders `summary`, `message`, and structured `detail`
- Tests/docs:
  - backend monitor test now asserts pause/abort `/runtime-log` exposes the corresponding control rows
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- control rows still live inside the scheduler-events fallback layer; there is no richer dedicated control log model yet
- this slice does not add any new runtime-log source layer or front-end control-specific affordance

## 2026-05-13 P3-4 monitor live-page control-note follow-up

## Task
- Extend the same control-intent visibility line into request-context-backed `GET /api/phase3/runs/{runId}/live-page` shells
- keep the contract additive and small by reusing existing `summary`
- avoid touching screenshot / highlight / locator structure

## Completed
- Backend:
  - when `live-page` falls back to a request-context-backed `UNAVAILABLE` shell and `status` is `PAUSING` / `ABORTING`, the lightweight `summary` now appends a control note
  - the note explains that pause/abort was requested, who requested it, and why
  - artifact-backed live-page payloads and no-source shells are left unchanged
- Frontend:
  - no code change was required; the existing live-page `summary` rendering now naturally surfaces the appended control note
- Tests/docs:
  - backend monitor test now asserts both `PAUSING` and `ABORTING` request-context-backed live-page shells include the appended control note
  - the no-source branch still asserts no summary is emitted
  - synced `monitor/interface-spec.md` and `monitor/functional-spec.md`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- control notes are still collapsed into a single lightweight `live-page.summary` string rather than a richer structured control-note field
- this slice does not add any front-end control-specific live-page affordance beyond the existing summary block

## 2026-05-13 P3-4 monitor control-phase banner follow-up

## Task
- Stay on `P3-4 monitor`, but keep the next slice front-end only:
  - based only on existing `status` / `control`
  - add a clearer in-progress control-phase banner/copy for `PAUSING` / `ABORTING`
  - do not add endpoints, do not change any response structure, do not touch report/plugin flows

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - when `runStatus.status` is `PAUSING` or `ABORTING`, the progress area now shows a dedicated control-phase banner
  - the banner explicitly says the control request is in progress
  - the banner warns operators that runtime log, step timeline, and live-page panels may temporarily remain on the last snapshot until the control phase settles
  - the copy reuses the existing `requestedBy`, `requestReason`, and `requestedAt` readback fields when available
- Expanded `ui/admin-console/src/screens/MonitorScreen.test.tsx`:
  - added a `PAUSING` regression that asserts the banner copy and the disabled/enabled button state together
  - expanded the `ABORTING` regression to assert the banner copy and the fully disabled control state together

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this slice is explanatory UI only; it does not add any real executor-side pause/abort progress signal
- runtime log, step timeline, and live-page panels still rely on their existing backend snapshot/fallback chains

## 2026-05-13 P3-4 monitor control-phase empty-state follow-up

## Task
- Stay on `P3-4 monitor`, but keep the next slice front-end only:
  - make `steps`, `runtime-log`, and `live-page` empty states more context-aware during `PAUSING` / `ABORTING`
  - use only existing `runStatus.status` / `control`
  - do not add endpoints or change any response structure

## Completed
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - empty `steps` copy now switches from generic no-data wording to control-phase temporary-stall wording when `status` is `PAUSING` or `ABORTING`
  - empty `runtime-log` copy now does the same for in-progress pause/abort control phases
  - `UNAVAILABLE` `live-page` now also shows a control-phase-specific empty-state note when pause/abort is still settling
- Expanded `ui/admin-console/src/screens/MonitorScreen.test.tsx`:
  - added a `PAUSING` regression for empty `steps`
  - added an `ABORTING` regression for empty `runtime-log` plus unavailable `live-page`
  - both regressions also keep the existing button-disabled expectations in place

## Verification
- Ran:
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this slice is still explanatory UI only; it does not add any real executor-side pause/abort progress signal
- the `live-page` control-phase branch currently adds a contextual note ahead of the existing unavailable-shell content rather than introducing a separate structured empty-state model

## 2026-05-14 P3-4 monitor immediate control-response feedback follow-up

## Task
- Stay on `P3-4 monitor`, but make pause/abort feel more immediate without adding any new endpoint:
  - let accepted `pause` / `abort` POST responses echo lightweight control-request metadata
  - let `MonitorScreen` use that response locally until the next `status` readback takes over
  - do not change existing GET contracts or connect to a real external executor

## Completed
- Updated `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`:
  - accepted `pause` / `abort` responses now also include:
    - `requestedBy`
    - `requestReason`
    - `requestedAt`
  - the same `requestedAt` is now explicitly written into the persisted control event payload so the POST response and later readback stay aligned
- Updated `ui/admin-console/src/App.tsx`:
  - monitor pause/abort handlers now return the accepted `RunControlResponse` immediately
  - snapshot reload still starts, but no longer blocks the child screen from using the control response right away
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - added a small optimistic control-response overlay
  - after a successful pause/abort click, banner text, request summary, and button gating can switch to the returned `PAUSING` / `ABORTING` state immediately
  - the optimistic overlay is cleared once `/status` reaches either the same requested phase or a direct stronger terminal handoff such as `PAUSING -> PAUSED` or `ABORTING -> ABORTED`
- Expanded tests:
  - `LocalAdminApiServerTest` now asserts accepted pause/abort POST responses include `requestedBy` / `requestReason` / `requestedAt`
  - `MonitorScreen.test.tsx` now covers immediate local pause/abort feedback driven by the POST response before status readback catches up

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## 2026-05-14 P3-4 monitor non-accepted control feedback

## Completed
- Extended backend coverage for non-accepted monitor control outcomes:
  - `LocalAdminApiServerTest` now explicitly covers:
    - `ALREADY_PAUSED`
    - `ALREADY_ABORTED`
    - `REJECTED`
- Updated `ui/admin-console/src/App.tsx`:
  - monitor pause/abort handlers no longer throw immediately on non-`ACCEPTED` responses
  - they still trigger a fresh snapshot reload after the response returns
- Updated `ui/admin-console/src/screens/MonitorScreen.tsx`:
  - added a dedicated local warning-feedback path for non-`ACCEPTED` control results
  - `ALREADY_PAUSED`, `ALREADY_ABORTED`, and `REJECTED` now surface as inline operator-visible warnings
  - those warnings now appear immediately before the refresh resolves, and the screen then refreshes monitor data so they are followed by the latest persisted status/control state
- Expanded front-end regression coverage:
  - `MonitorScreen.test.tsx` now covers immediate local feedback plus follow-up refresh behavior for:
    - `ALREADY_PAUSED`
    - `ALREADY_ABORTED`
    - `REJECTED`

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## Remaining Limits
- this is still optimistic local feedback only; it does not confirm that an external executor has actually paused or aborted
- the optimistic control overlay now clears on the same requested phase or on the direct terminal handoff paths currently covered (`PAUSING -> PAUSED`, `ABORTING -> ABORTED`), but there is still no richer general control-progress model or separate control event stream

## 2026-05-14 P3-4 monitor control refresh ownership dedupe

## Completed
- Updated `ui/admin-console/src/App.tsx`:
  - monitor `onPauseRun` / `onAbortRun` handlers no longer trigger top-level `loadSnapshot()`
  - monitor control actions now rely on `MonitorScreen` as the single owner of the follow-up monitor refresh
- Expanded `ui/admin-console/src/App.test.tsx`:
  - added accepted pause coverage that asserts:
    - no extra `/api/phase3/admin-console` reload happens after the control action
    - the monitor run endpoints still refresh exactly once after the action
  - added rejected abort coverage with the same no-extra-snapshot guarantee
- Preserved existing screen behavior:
  - `MonitorScreen.test.tsx` remains green for accepted optimistic feedback
  - `MonitorScreen.test.tsx` remains green for non-accepted warning+refresh behavior

## Verification
- Ran:
  - `npm test -- --run src/App.test.tsx -t "keeps monitor control refresh ownership inside MonitorScreen"`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## 2026-05-14 P3-4 monitor queue-pressure run-local fallback reduction

## Completed
- Updated backend `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/status` now emits optional top-level `queueState` when persisted request context provides it
- Updated front-end monitor typing/rendering:
  - `RunStatus` now accepts optional `queueState`
  - `MonitorScreen` footer `Queue pressure` now prefers `runStatus.queueState`
  - if the run-local status payload does not provide queue context, the footer still falls back to `snapshot.workQueue[0].detail`
- Expanded regression coverage:
  - `LocalAdminApiServerTest` now asserts scheduler-fallback status exposes `queueState`
  - `MonitorScreen.test.tsx` now covers both:
    - run-local `queueState` winning over parent snapshot footer detail
    - legacy fallback to parent snapshot footer detail when `queueState` is absent

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## 2026-05-14 P3-4 monitor last-event run-local fallback reduction

## Completed
- Updated backend `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/status` now emits optional top-level `lastEventSummary`
  - the summary is currently derived from the latest scheduler-backed event detail/title/type/status in that priority order
- Updated front-end monitor typing/rendering:
  - `RunStatus` now accepts optional `lastEventSummary`
  - `MonitorScreen` footer `Last event` now prefers `runStatus.lastEventSummary`
  - if the run-local status payload does not provide an event summary, the footer still falls back to `snapshot.timeline[0]` copy
- Expanded regression coverage:
  - `LocalAdminApiServerTest` now asserts scheduler-fallback status exposes `lastEventSummary`
  - `MonitorScreen.test.tsx` now covers both:
    - run-local `lastEventSummary` winning over parent snapshot timeline copy
    - legacy fallback to parent snapshot timeline copy when `lastEventSummary` is absent

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
  - `npm test -- --run src/screens/MonitorScreen.test.tsx`

## 2026-05-14 P3-4 monitor last-event artifact-priority tightening

## Completed
- Updated backend `RunStatusService.java`:
  - artifact-strengthened `/status` responses now prefer stronger artifact-derived `lastEventSummary` / `lastEventAt` before falling back to the latest scheduler event
  - current priority is:
    - report artifact updated/status context
    - live-page artifact updated context
    - runtime.log artifact modified-time context
    - latest scheduler event fallback
- Expanded regression coverage:
  - `LocalAdminApiServerTest` now asserts artifact-backed status returns:
    - `lastEventSummary` from the artifact path
    - `lastEventAt` from the artifact path
  - the existing scheduler-fallback assertions remain intact

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- `runtime-log` fallback is now more informative when request context exists, but it still remains a compact shell rather than a richer structured runtime artifact model
- if scheduler requests also lack persisted page/runtime/locator fields, runtime-log fallback can still end up sparse or empty
- Pause/Abort semantics remain unchanged

## 2026-05-12 P3-4 monitor runtime-log request-context review follow-up

## Completed
- Tightened `RunStatusService.buildRequestContextRuntimeLogEntries(...)`:
  - `runId` no longer triggers the page-context shell by itself
  - the `Prepared page context...` runtime-log entry is now emitted only when real page identity fields such as `pageTitle` or `pageUrl` exist
  - `runId` remains available as detail context only when that page-context entry is legitimately emitted
- Expanded backend regression coverage:
  - added a `runId`-only scheduler request case
  - verified that `GET /api/phase3/runs/{runId}/runtime-log` stays empty instead of fabricating a misleading `scheduler-request-context` page entry

## Verification
- Ran:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## 2026-05-08 P3-4 plugin page-summary context-first follow-up

## Task
- Continue `P3-4 plugin` on one narrow code slice:
  - tighten `POST /api/phase3/extension/page-summary`
  - prefer real popup/background/native-host/tab payload over backend-local deterministic rules
  - keep scope inside page-summary only; do not expand into pick mode or quick smoke

## Completed
- Updated extension popup request shaping:
  - `extension/edge-extension/popup.js` now sends `PAGE_SUMMARY_GET` with:
    - active-tab `pageTitle`
    - active-tab `pageUrl`
    - derived `pageDomain`
    - derived `pagePath`
    - cached popup runtime context:
      - `runtimeMode`
      - `queueState`
      - `auditState`
      - `nextAction`
    - optional `locator`
  - page identity fields now stay same-source:
    - when current `tab.url` exists, `pageUrl` / `pageDomain` / `pagePath` are all derived from that current tab URL
    - only when `tab.url` is missing does the popup fall back to cached snapshot page fields
  - popup now caches the latest popup snapshot after refresh and reuses that runtime context when page summary is requested
  - popup page-summary result panel now renders:
    - `domain`
    - `path`
    - `runtimeSummary`
- Updated local-admin-api page-summary assembly:
  - `ExtensionActionService.java` now prefers caller-provided page/runtime fields over backend-local host/path derivation when those fields are present
  - response now includes:
    - `domain`
    - `path`
    - `runtimeSummary`
    - summary text explicitly bound to current title/url/runtime context
  - `recommendedAction` now prefers the caller-provided `nextAction` when available instead of always falling back to generic local wording
- Updated regression coverage:
  - popup test now asserts the richer `PAGE_SUMMARY_GET` payload and rendered result fields
  - popup test now also asserts that a stale `snapshot.page.domain` cannot override the current active-tab URL/domain/path
  - native-host test now asserts the richer page-summary payload is forwarded unchanged to local-admin-api
  - local-admin-api test now asserts page-summary response priority for domain/path/runtime summary/recommended action
- Synced plugin docs/backlog:
  - `docs/phase3/interface/plugin/interface-spec.md`
  - `docs/phase3/interface/plugin/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `extension/edge-extension/popup.js`
- `extension/edge-extension/popup.html`
- `ui/admin-console/src/popup.test.js`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ExtensionActionService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `apps/native-host/src/test/java/com/example/webtest/nativehost/NativeHostMessageProcessorTest.java`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran targeted frontend test:
  - `npm test -- --run popup.test.js`
- Ran targeted native-host test:
  - `mvn -pl apps/native-host -Dtest=NativeHostMessageProcessorTest test`
- Ran targeted local-admin-api test:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- `page-summary` now prefers popup/native-host/tab context, but it still does not use DOM/content-script extraction for richer page understanding
- admin-console `plugin` screen still remains a mirror/demo shell; the real quick action continues to live in the extension popup runtime
- quick smoke, pick mode, and platform handoff chains were intentionally left unchanged in this slice

## 2026-05-08 P3-4 plugin page-summary DOM context follow-up

## Task
- Continue the current `P3-4 plugin` `page-summary` slice:
  - add lightweight content-script DOM context to `PAGE_SUMMARY_GET`
  - keep fallback safe when content-script context is unavailable
  - avoid expanding into quick smoke, pick mode, or platform handoff

## Completed
- Updated extension-side `page-summary` enrichment:
  - `content-script.js` now exposes `CS_PAGE_SUMMARY_CONTEXT_GET`
  - the content script returns a lightweight DOM snapshot with:
    - visible headings
    - form landmarks
    - primary action hints
    - short body summary
  - `background.js` now intercepts `PAGE_SUMMARY_GET`, asks the active tab content script for that DOM snapshot first, and merges it into the outgoing native-host payload
  - when content-script messaging is unavailable, background safely falls back to the original tab/runtime payload and still forwards the request
- Updated local-admin-api `page-summary` assembly:
  - `ExtensionActionService.java` now consumes caller-provided DOM context fields when present
  - summary text and signals now surface heading/action/form/body cues from the caller payload instead of trying to derive richer page understanding on the backend
- Updated regression coverage:
  - background bridge test now asserts page-summary payload enrichment from content-script DOM context
  - background bridge test now also asserts fallback to the original payload when content-script messaging fails
  - content-script test now asserts the lightweight DOM snapshot shape
  - local-admin-api test now asserts page-summary summary text reflects caller-provided DOM context
- Synced plugin docs/backlog:
  - `docs/phase3/interface/plugin/interface-spec.md`
  - `docs/phase3/interface/plugin/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `extension/edge-extension/content-script.js`
- `extension/edge-extension/background.js`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ExtensionActionService.java`
- `ui/admin-console/src/background.test.js`
- `ui/admin-console/src/content-script.test.js`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran targeted frontend tests:
  - `npm test -- --run background.test.js content-script.test.js popup.test.js`
- Ran targeted local-admin-api test:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- `page-summary` now includes only a lightweight content-script DOM snapshot; it still does not perform richer DOM extraction such as structured field/value understanding or deeper content summarization
- admin-console `plugin` screen still remains a mirror/demo shell; the real quick action continues to live in the extension popup runtime
- quick smoke, pick mode, and platform handoff chains were intentionally left unchanged in this slice

## 2026-05-08 P3-4 plugin platform handoff richer-context follow-up

## Task
- Continue the current `P3-4 plugin` mainline by deepening `PLATFORM_HANDOFF_PREPARE`:
  - carry richer popup/tab/content-script context into `Open in platform` and `Use in DSL`
  - keep the existing lightweight query-param/App-state handoff model
  - avoid expanding into quick smoke or pick mode main flows

## Completed
- Updated popup/native-host handoff payloads:
  - `popup.js` now reuses a shared current-page context builder for:
    - `PAGE_SUMMARY_GET`
    - `PLATFORM_HANDOFF_PREPARE`
  - `Open in platform` now sends:
    - page title/url/domain/path
    - runtime context
    - locator
    - existing execution handoff fields
  - `Use in DSL` now sends the same page/runtime identity fields together with the current real locator
- Updated background enrichment:
  - `background.js` now applies the same lightweight content-script DOM snapshot enrichment to `PLATFORM_HANDOFF_PREPARE` that it already applies to `PAGE_SUMMARY_GET`
  - if the content script is unavailable, handoff still safely falls back to the original caller payload
- Updated local-admin-api/App handoff consumption:
  - `ExtensionActionService.preparePlatformHandoff(...)` now keeps the backend URL-assembly-only role, but includes richer caller-provided page/runtime/DOM context in the generated query params
  - `App.tsx` now consumes that richer query context:
    - `execution` handoff assembles a more informative `launchForm.detail`
    - `aiGenerate` handoff builds richer reasoning/page-identity context from query params
- Updated regression coverage:
  - popup test now asserts richer `PLATFORM_HANDOFF_PREPARE` payloads for `Open in platform` and `Use in DSL`
  - background bridge test now asserts platform-handoff DOM-context enrichment
  - native-host test now asserts richer platform-handoff payload forwarding
  - local-admin-api test now asserts the generated handoff URL carries richer page/runtime/DOM context
  - App test now asserts plugin execution and AI-generate query handoff consumption still works with those richer params
- Synced plugin docs/backlog:
  - `docs/phase3/interface/plugin/interface-spec.md`
  - `docs/phase3/interface/plugin/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `extension/edge-extension/popup.js`
- `extension/edge-extension/background.js`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ExtensionActionService.java`
- `apps/native-host/src/test/java/com/example/webtest/nativehost/NativeHostMessageProcessorTest.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/background.test.js`
- `ui/admin-console/src/popup.test.js`
- `ui/admin-console/src/App.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran targeted frontend tests:
  - `npm test -- --run popup.test.js background.test.js`
  - `npx vitest run src/App.test.tsx -t "consumes plugin"`
- Ran targeted native-host test:
  - `mvn -pl apps/native-host -Dtest=NativeHostMessageProcessorTest test`
- Ran targeted local-admin-api test:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- platform handoff still uses lightweight query params plus App-local state mapping; it does not introduce typed route models or persisted cross-app context
- `Use in DSL` still targets `aiGenerate`, not direct `cases` DSL insertion
- quick smoke and pick mode main flows were intentionally left unchanged in this slice

## 2026-05-08 P3-4 plugin quick-smoke richer-context follow-up

## Task
- Continue the current `P3-4 plugin` mainline by tightening `Quick smoke test`:
  - reuse the shared current-page context builder for `SCHEDULER_REQUEST_CREATE`
  - reuse background/content-script DOM enrichment
  - keep the existing scheduler request protocol instead of opening a new popup execution protocol

## Completed
- Updated popup/background quick-smoke request shaping:
  - `popup.js` now reuses the shared current-page context builder for `buildSchedulerRequestPayload(...)`
  - quick-smoke scheduler requests now carry:
    - page title/url/domain/path
    - runtime context
    - locator
    - existing scheduler request fields
  - `background.js` now applies the same lightweight content-script DOM snapshot enrichment to `SCHEDULER_REQUEST_CREATE` that it already applies to `PAGE_SUMMARY_GET` and `PLATFORM_HANDOFF_PREPARE`
  - when content-script messaging is unavailable, background safely falls back to the original scheduler payload
- Updated local-admin-api scheduler request persistence:
  - `SchedulerPersistenceService.appendRequest(...)` now persists richer page/runtime/DOM startup context fields on the scheduler request entry when they are present
  - the canonical scheduler request contract stays compatible:
    - `runId`
    - `projectKey`
    - `owner`
    - `environment`
    - `status`
    - `title`
    - `detail`
  - richer context remains additive rather than replacing those canonical fields
- Updated regression coverage:
  - popup test now asserts richer `SCHEDULER_REQUEST_CREATE` payload shaping
  - background bridge tests now assert quick-smoke DOM-context enrichment and safe fallback
  - native-host test now asserts richer scheduler request payload forwarding
  - local-admin-api test now asserts scheduler request persistence remains compatible while retaining richer context fields
- Synced plugin docs/backlog:
  - `docs/phase3/interface/plugin/interface-spec.md`
  - `docs/phase3/interface/plugin/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `extension/edge-extension/popup.js`
- `extension/edge-extension/background.js`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
- `ui/admin-console/src/popup.test.js`
- `ui/admin-console/src/background.test.js`
- `apps/native-host/src/test/java/com/example/webtest/nativehost/NativeHostMessageProcessorTest.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/plugin/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran targeted frontend tests:
  - `npm test -- --run popup.test.js background.test.js`
- Ran targeted native-host test:
  - `mvn -pl apps/native-host -Dtest=NativeHostMessageProcessorTest test`
- Ran targeted local-admin-api test:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`

## Remaining Limits
- richer quick-smoke startup context is now persisted on scheduler request entries, but downstream execution/monitor/report consumers still do not actively surface most of those fields yet
- quick smoke still remains a lightweight scheduler enqueue action rather than a fuller popup execution runtime
- pick mode main flow was intentionally left unchanged in this slice

## 2026-05-07 P3-4 monitor status artifact/context follow-up

## Task
- Continue the current `P3-4 monitor` mainline by tightening `GET /api/phase3/runs/{runId}/status`:
  - prefer stronger run-local artifact and persisted runtime context when those sources already exist
  - remove the default fake 8-step progress shape from the no-artifact fallback
  - avoid new protocols such as `status.json`, and keep response-shape changes minimal

## Completed
- Updated `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/status` now reads run-local `report.json` first for:
    - stronger terminal status
    - progress totals/completion
    - elapsed/duration timing
    - assertion counters
    - run metadata (`projectKey`, `environment`, `model`, `owner`)
  - the same status payload now prefers run-local `live-page.json` for:
    - `currentPage.url`
    - `currentPage.state`
  - `lastUpdatedAt` now prefers the latest known artifact-backed timestamp from:
    - `report.json`
    - `live-page.json`
    - `runtime.log`
    - then falls back to the latest scheduler event timestamp
  - when no stronger progress artifact exists, `/status` no longer fabricates the old default `8`-step shape; it returns conservative `0 / 0 / 0` progress instead
  - scheduler persistence still remains the fallback shell for lifecycle status, `aiCalls`, `heals`, and control gating when no stronger artifact data exists
- Added backend regression coverage in `LocalAdminApiServerTest.java` for:
  - artifact-backed terminal status/progress/current-page/assertion-count priority
  - no-artifact conservative fallback progress
- Synced monitor docs/backlog:
  - `docs/phase3/interface/monitor/interface-spec.md`
  - `docs/phase3/interface/monitor/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Ran targeted backend test:
  - `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
- Not run:
  - no frontend test run
  - no broader multi-module build/test sweep

## Remaining Limits
- `status` now prefers report/live/runtime artifact context, but it still falls back to a scheduler-derived shell when those stronger artifacts are absent
- `runtime-log` still uses a small text-to-entry mapping rather than a richer structured runtime artifact
- `steps` still falls back to scheduler-event-derived or placeholder shaping when no run-local `report.json.steps[]` exists

## 2026-05-07 P3-4 monitor live-page interface doc alignment follow-up

## Task
- Keep the current `P3-4 monitor` thread doc-only:
  - fix the stale self-contradictory live-page wording in `monitor/interface-spec.md`
  - do not change any code or expand into `status` / `steps` / `plugin`

## Completed
- Updated `docs/phase3/interface/monitor/interface-spec.md`:
  - section `5.4 Live page viewport` no longer says `current state: placeholder only`
  - it now matches the current real behavior already documented later in the same file and already implemented in `MonitorScreen`:
    - `GET /api/phase3/runs/{runId}/live-page` returns backend-owned `AVAILABLE` / `UNAVAILABLE` shells
    - `MonitorScreen` shows explicit unavailable copy for the unavailable shell
    - when `screenshotPath` exists, the screen resolves the inline image through the artifact-content read path

## Modified Files
- `docs/phase3/interface/monitor/interface-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## 2026-05-07 P3-4 monitor steps failed-state semantic follow-up

## Task
- Keep the current `P3-4 monitor /steps` slice narrow:
  - fix report-backed step-state normalization so failed or skipped terminal steps are not shown as `TODO`
  - keep scope inside `GET /api/phase3/runs/{runId}/steps` plus the current `MonitorScreen` consumption path

## Completed
- Updated backend report-step normalization:
  - `RunStatusService.normalizeReportStepState()` now maps:
    - `FAILED` / `FAIL` / `ERROR` / `BROKEN` / `TIMEOUT` -> `FAILED`
    - `SKIPPED` / `SKIP` / `CANCELLED` / `ABORTED` -> `SKIPPED`
  - report-backed terminal failure states are no longer collapsed into `TODO`
- Updated frontend monitor contract/rendering:
  - `RunStep.state` now includes `FAILED` and `SKIPPED`
  - `MonitorScreen` step bar, step list, and detail badge now render distinct failed/skipped semantics instead of defaulting them to todo
- Updated regression scaffolding:
  - backend `/steps` coverage now asserts report-backed `FAILED` and `SKIPPED` mapping
  - `MonitorScreen` coverage now asserts failed/skipped rows are not rendered with todo styling
- Synced docs:
  - `docs/phase3/interface/monitor/interface-spec.md`
  - `docs/phase3/interface/monitor/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `ui/admin-console/src/styles.css`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `monitor /steps` still falls back to scheduler-event-derived or placeholder shaping when no run-local `report.json.steps[]` artifact exists
- `monitor /status` still remains the more central deterministic runtime read left in the `P3-4` chain
- Pause/Abort still record intent only and do not trigger real execution-control workflows

## 2026-05-07 P3-4 monitor live-page backend-artifact follow-up

## Task
- Start the next higher-value mainline slice under `P3-4`:
  - tighten `GET /api/phase3/runs/{runId}/live-page`
  - prefer real run-local live-page/screenshot artifacts over deterministic monitor payload shaping
  - return an explicit unavailable shell when no live artifact exists

## Completed
- Updated backend `RunStatusService.java`:
  - added optional `runsRoot` support for runtime artifact reads
  - `GET /api/phase3/runs/{runId}/live-page` now prefers:
    - `runs/<runId>/live-page.json`
    - referenced or inferred run-local screenshot files
  - live-page payload now returns:
    - `status: "AVAILABLE"` when a live artifact is present
    - `status: "UNAVAILABLE"` shell when no live artifact exists
  - `screenshotPath` now uses run-local relative-path semantics so it can be consumed by the existing artifact-content read route
- Updated frontend `MonitorScreen.tsx`:
  - live-page panel now shows explicit unavailable copy instead of rendering a fake structured page shell when backend status is `UNAVAILABLE`
  - when `screenshotPath` is present, the panel now renders an inline `<img>` preview via:
    - `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
- Synced scaffolding/docs:
  - `LocalAdminApiApp.java`
  - `LocalAdminApiServerTest.java`
  - `MonitorScreen.test.tsx`
  - `App.test.tsx`
  - `monitor/interface-spec.md`
  - `monitor/functional-spec.md`
  - `review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/LocalAdminApiApp.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/MonitorScreen.tsx`
- `ui/admin-console/src/screens/MonitorScreen.test.tsx`
- `ui/admin-console/src/App.test.tsx`
- `ui/admin-console/src/styles.css`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `monitor` `status` / `steps` / `runtime-log` still remain deterministic when no stronger run-local runtime artifacts exist
- `monitor` live-page now supports image-like screenshot preview, but it still does not render a richer DOM summary
- Pause/Abort still record intent only; no true execution-control workflow exists in Phase 3

## 2026-05-07 P3-4 monitor runtime-log artifact-backed follow-up

## Task
- Continue the current `P3-4 monitor` line by tightening `GET /api/phase3/runs/{runId}/runtime-log`:
  - prefer real run-local `runtime.log` content when it exists
  - keep the fallback behavior explicit when no run-local runtime-log artifact exists
  - avoid broad runtime/status/steps refactors

## Completed
- Updated `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/runtime-log` now checks `runs/<runId>/runtime.log` first
  - when `runtime.log` exists, the backend maps its lines into backend-owned runtime-log entries
  - entries now carry:
    - `source: "runtime.log"`
    - `message`: raw line text
    - `detail.artifactPath = "runtime.log"`
    - `detail.line`
  - simple line classification now maps obvious log content to `ERROR` / `WARNING` / `HEAL` / `DECISION` / `INFO`
  - when no `runtime.log` artifact exists, the endpoint keeps the existing scheduler-event-derived fallback path but now marks it with:
    - `source: "scheduler-events"`
- Updated `LocalAdminApiServerTest.java`:
  - added a backend regression that covers both:
    - run-local `runtime.log` taking precedence over scheduler-event shaping
    - scheduler-event fallback remaining active when the artifact is absent
- Synced `monitor/interface-spec.md`, `monitor/functional-spec.md`, and `review-backlog.md`:
  - runtime-log is now documented as `runtime.log`-first rather than purely deterministic
  - fallback is documented as scheduler-event-derived, not artifact-backed

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `monitor` `runtime-log` now prefers run-local `runtime.log`, but it still uses a very small text-to-entry mapping rather than a richer structured runtime artifact
- `monitor` `status` / `steps` still remain deterministic when no stronger runtime artifacts exist
- Pause/Abort still record intent only; no true execution-control workflow exists in Phase 3

## 2026-05-07 P3-4 monitor steps report-artifact follow-up

## Task
- Continue the current `P3-4 monitor` line by tightening `GET /api/phase3/runs/{runId}/steps`:
  - prefer stronger run-local step artifacts when they already exist
  - avoid inventing a new `steps.json` contract or broad runtime refactors
  - keep fallback semantics explicit when no stronger step artifact is available

## Completed
- Updated `RunStatusService.java`:
  - `GET /api/phase3/runs/{runId}/steps` now checks run-local `report.json.steps[]` first
  - when `report.json.steps[]` exists, the backend maps those entries into monitor step payloads
  - mapped fields now include:
    - `index`
    - `label` from `stepName` / `action`
    - normalized `state` from report step status
    - `durationMs`
    - optional `startedAt`
    - optional `note` from `message` or `artifactPath`
  - when no run-local report-step artifact exists, the endpoint keeps the existing scheduler-event-derived and placeholder fallback path
- Updated `LocalAdminApiServerTest.java`:
  - added a backend regression that covers both:
    - run-local `report.json.steps[]` taking precedence over scheduler step shaping
    - scheduler-event fallback remaining active when the artifact is absent
- Synced `monitor/interface-spec.md`, `monitor/functional-spec.md`, and `review-backlog.md`:
  - `steps` is now documented as `report.json.steps[]`-first rather than purely deterministic
  - fallback is documented as scheduler-event-derived or placeholder shaping, not artifact-backed

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/RunStatusService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `docs/phase3/interface/monitor/interface-spec.md`
- `docs/phase3/interface/monitor/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `monitor` `steps` now prefers run-local `report.json.steps[]`, but it still depends on a small field mapping instead of a dedicated runtime step artifact
- `monitor` `runtime-log` now prefers run-local `runtime.log`, but it still uses a very small text-to-entry mapping rather than a richer structured runtime artifact
- `monitor` `status` still remains deterministic when no stronger runtime artifacts exist
- Pause/Abort still record intent only; no true execution-control workflow exists in Phase 3

## 2026-05-07 P3-3 dataDiff main payload unavailable-shell follow-up

## Task
- Continue the current `P3-3` code path by tightening the main `GET /api/phase3/runs/{runId}/data-diff` contract:
  - stop fabricating synthetic diff rows when `data-diff.json` is missing
  - return a backend-owned unavailable/empty shell instead
  - keep any UI adjustment limited to the main diff panel

## Completed
- Updated `ReportArtifactService.java`:
  - `GET /api/phase3/runs/{runId}/data-diff` no longer falls back to deterministic mock diff rows when `data-diff.json` is missing or unreadable
  - the backend now returns an explicit empty shell instead:
    - `status: "UNAVAILABLE"`
    - zeroed `summary`
    - `rows: []`
- Updated `DataDiffScreen.tsx`:
  - when the backend returns the `UNAVAILABLE` main-diff shell, the screen now shows explicit `No diff artifact available` copy
  - it no longer renders misleading stats/table rows for the no-artifact case
  - synthetic local rows remain fallback-only when the diff API read itself fails
- Updated `LocalAdminApiServerTest.java` and `App.test.tsx`:
  - backend test now asserts `UNAVAILABLE` + `rows: []` for the missing-artifact path
  - App-level test now covers the explicit main diff unavailable state
- Synced `dataDiff/interface-spec.md` and `review-backlog.md` to the new backend-owned main diff shell semantics

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/DataDiffScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail
- artifact/screenshot inline viewing is still not implemented

## 2026-05-07 P3-3 reportDetail screenshot inline-preview follow-up

## Task
- Continue the current `P3-3` code path with one small but real artifact-read slice:
  - stop leaving `reportDetail` screenshots at path-only listing level
  - add a minimal backend content-read route for run-local artifacts
  - use it for inline preview of image-like screenshots on the Overview tab

## Completed
- Updated `ReportArtifactService.java`:
  - added `getArtifactContent(runId, artifactPath)` with run-dir path validation
  - infers basic content types for image/html/json/text files and returns raw bytes
- Updated `LocalAdminApiServer.java`:
  - added `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
  - returns binary content for valid run-local artifact paths
- Updated `ReportDetailScreen.tsx`:
  - Overview screenshot cards now derive inline preview URLs from the new backend content endpoint
  - screenshot previews now prefer `steps[].artifactPath` when available, then fall back to screenshot artifacts
  - generic artifact drawer remains listing-path-focused
- Updated `LocalAdminApiServerTest.java` and `App.test.tsx`:
  - backend test now asserts screenshot content bytes + `image/png`
  - App-level test now verifies the Overview screenshot `<img>` points at the new content endpoint
- Synced `reportDetail` specs and `review-backlog.md` to reflect:
  - image-like Overview screenshots are no longer path-only
  - generic artifact drawer entries still remain listing-focused

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/http/LocalAdminApiServer.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- generic artifact drawer entries still remain listing-path-focused; inline read is currently only wired for image-like Overview screenshots
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 reportDetail report-html drawer preview follow-up

## Task
- Continue the just-landed artifact-content path with one more small but real reader:
  - keep scope inside the artifact drawer
  - let one common text-like artifact type preview inline instead of staying path-only

## Completed
- Updated `ReportDetailScreen.tsx`:
  - artifact drawer now keeps a small `previewArtifact` state
  - `report-html` items render a `Preview` action
  - the drawer now mounts an inline `<iframe>` preview backed by `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
  - scope remains intentionally narrow: no generic multi-type viewer
- Updated `App.test.tsx`:
  - artifact drawer test now verifies the `Preview` action exists for `report-html`
  - it also verifies the drawer mounts an iframe pointed at the shared content endpoint
- Synced `reportDetail` specs and `review-backlog.md`:
  - `Download artifacts` is no longer just path listing
  - `report-html` is now the first drawer-level inline preview type

## Modified Files
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- generic artifact drawer entries still remain mostly listing-path-focused; inline read is currently wired for image-like Overview screenshots and `report-html`
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 reportDetail report-json drawer preview follow-up

## Task
- Continue the same artifact-content line with one more tiny reader:
  - keep scope inside the current artifact drawer
  - add minimal inline preview for one text-like artifact type

## Completed
- Updated `ReportDetailScreen.tsx`:
  - kept the existing `previewArtifact` flow inside the drawer
  - added a tiny `report-json` text-preview branch using the existing content endpoint
  - the drawer now fetches `report.json` text on demand and renders it in a `<pre>`
  - scope remains intentionally narrow: no generic multi-type viewer and no Overview screenshot refactor
- Chose `report-json` over `log`:
  - it is already present in the current artifact drawer fixtures
  - the existing content endpoint already returns `application/json; charset=utf-8`
  - it was the smallest stable text-like artifact to preview without new endpoint work
- Updated `App.test.tsx`:
  - artifact drawer coverage now checks both preview buttons
  - added a focused `report-json` preview test that verifies the drawer fetches the content endpoint and renders the JSON text
- Synced `reportDetail` specs and `review-backlog.md` to record `report-json` as the next small drawer-level inline preview type

## Modified Files
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- generic artifact drawer entries still remain mostly listing-path-focused; inline read is currently wired for image-like Overview screenshots, `report-html`, and `report-json`
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 reportDetail log drawer preview follow-up

## Task
- Continue the same tiny artifact-content reader path:
  - keep scope inside the current artifact drawer
  - add one more text-like inline preview without turning the drawer into a general viewer

## Completed
- Updated `ReportArtifactService.java`:
  - `.log` artifacts are now classified as `kind: "log"`
- Updated `ReportDetailScreen.tsx`:
  - reused the existing text-preview state machine added for `report-json`
  - expanded that branch to accept `log` with the same `<pre>` preview path
  - no new endpoint and no second preview mechanism were introduced
- Chose `log` as the next step:
  - it follows naturally from the existing `report-json` text-preview branch
  - `text/plain; charset=utf-8` is already served by the current content endpoint
  - this keeps the scope small and inside the current drawer
- Updated tests:
  - backend artifact-list coverage now checks `kind: "log"`
  - App-level artifact drawer coverage now verifies `Preview runtime.log` fetches the content endpoint and renders log text
- Synced `reportDetail` specs and `review-backlog.md` to record `log` as the next small drawer-level inline preview type

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- generic artifact drawer entries still remain mostly listing-path-focused; inline read is currently wired for image-like Overview screenshots, `report-html`, `report-json`, and `log`
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 reportDetail artifact-path contract fix follow-up

## Task
- Keep the new `reportDetail` artifact-content capability narrow:
  - align `artifacts[].path` with `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
  - remove the remaining mismatch between artifact-list path shape and content-endpoint path expectation

## Completed
- Updated `ReportArtifactService.java`:
  - `getArtifacts()` now returns run-local relative `path`
  - `buildFullReport()` artifact items now use the same run-local relative `path`
- Left the content endpoint contract unchanged:
  - `GET /api/phase3/runs/{runId}/artifacts/content?path=...` still reads one run-local artifact path
  - artifact-list `path` can now be passed back directly without semantic translation
- Updated regression coverage:
  - backend test now asserts artifact list `path` uses `screenshot.png`
  - App-level fallback screenshot preview test now uses a realistic relative `artifacts[].path` and verifies that exact encoded path is used in the preview URL
- Synced `reportDetail` docs and records to state explicitly that `artifacts[].path` is the run-local path contract shared by both listing and content-read endpoints

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- generic artifact drawer entries still remain listing-path-focused; inline read is currently only wired for image-like Overview screenshots
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 reportDetail screenshot-path semantic fix follow-up

## Task
- Keep the just-landed `reportDetail` artifact-content slice narrow:
  - fix the Overview screenshot fallback path source
  - ensure `artifacts[]` screenshot preview uses real `path`, not display `label`

## Completed
- Updated `ReportDetailScreen.tsx`:
  - `steps[].artifactPath` remains the first-choice screenshot preview source
  - when that source is absent, the `artifacts[]` screenshot fallback now uses `a.path` for `GET /api/phase3/runs/{runId}/artifacts/content?path=...`
  - the UI no longer reuses `label` as a fake content path
- Updated `App.test.tsx`:
  - added a focused regression case where `steps[].artifactPath` is absent
  - verified the screenshot `<img>` points at the backend content endpoint with encoded `artifacts[].path`
- Synced `reportDetail` specs and logs to document the path-source priority:
  - `steps[].artifactPath` first
  - `artifacts[].path` fallback

## Modified Files
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- generic artifact drawer entries still remain listing-path-focused; inline read is currently only wired for image-like Overview screenshots
- synthetic diff rows still remain as a fallback when the main diff API read fails outright
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 dataDiff raw backend-owned empty-shell follow-up

## Task
- Continue `P3-3` on the same `dataDiff` chain:
  - remove deterministic fake content from `GET /api/phase3/runs/{runId}/data-diff/raw`
  - keep any UI adjustment confined to the raw drawer

## Completed
- Updated backend raw-diff fallback:
  - `ReportArtifactService.java` no longer fabricates before/after/afterRestore entries from mock diff rows when `data-diff-raw.json` is missing
  - missing or unreadable raw artifacts now return:
    - `status: "UNAVAILABLE"`
    - `before: []`
    - `after: []`
    - `afterRestore: []`
- Updated raw drawer consumption in `DataDiffScreen.tsx`:
  - the drawer still opens for the same endpoint
  - backend `UNAVAILABLE` empty shells now render explicit unavailable copy instead of empty fake JSON content
- Synced scaffolding/docs:
  - `LocalAdminApiServerTest.java`
  - `App.test.tsx`
  - `docs/phase3/interface/dataDiff/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/DataDiffScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `dataDiff` table rows still retain the existing synthetic fallback path when the diff endpoint itself is unavailable
- `recovery` / `ai-decisions` still keep deterministic mock payloads when real artifacts are absent
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail

## 2026-05-07 P3-3 reportDetail recovery backend-owned empty-shell follow-up

## Task
- Continue `P3-3` with one small `reportDetail`-adjacent code slice:
  - remove deterministic fake content from `GET /api/phase3/runs/{runId}/recovery`
  - keep any UI adjustment confined to the recovery panel only if needed

## Completed
- Updated backend recovery fallback:
  - `ReportArtifactService.java` no longer fabricates deterministic recovery steps when `recovery.json` is missing
  - missing or unreadable recovery artifacts now return:
    - `status: "UNAVAILABLE"`
    - `items: []`
- `ReportDetailScreen.tsx` did not need structural change in this pass:
  - the recovery panel already had a status badge plus `No recovery data available` empty-state branch
  - it now consumes the new empty shell naturally without contract expansion
- Synced scaffolding/docs:
  - `LocalAdminApiServerTest.java`
  - `App.test.tsx`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `reportDetail` main summary still keeps snapshot-derived fallback when backend detail reads fail
- screenshot/artifact content still remains listing-path-only rather than inline view/download

## 2026-05-07 P3-3 reportDetail main report unavailable-shell follow-up

## Task
- Continue `P3-3` with one small but more central `reportDetail` code slice:
  - tighten the missing-artifact semantics of `GET /api/phase3/runs/{runId}/report`
  - reduce how often the overview summary needs to lean on snapshot-derived fallback for no-artifact cases

## Completed
- Updated backend main-report fallback:
  - `ReportArtifactService.java` now marks missing `report.json` report shells as `status: "UNAVAILABLE"` instead of generic `UNKNOWN`
- Updated `ReportDetailScreen.tsx` overview summary card:
  - when the backend returns the `UNAVAILABLE` main-report shell, the summary card now shows `No report available`
  - the card no longer renders misleading 0/0 progress + stat summaries for the no-artifact case
- Synced scaffolding/docs:
  - `LocalAdminApiServerTest.java`
  - `App.test.tsx`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
  - `docs/phase3/interface/reportDetail/functional-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/reportDetail/functional-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- snapshot-derived fallback still remains for broader backend read failures, not just missing `report.json`
- screenshot/artifact content still remains listing-path-only rather than inline view/download

## 2026-05-07 P3-3 reportDetail ai-decisions backend-owned empty-shell follow-up

## Task
- Continue `P3-3` with one small `reportDetail`-adjacent code slice:
  - remove deterministic fake content from `GET /api/phase3/runs/{runId}/ai-decisions`
  - keep any UI adjustment confined to the AI decisions panel

## Completed
- Updated backend AI-decisions fallback:
  - `ReportArtifactService.java` no longer fabricates deterministic AI decision rows when `ai-decisions.json` is missing
  - missing or unreadable AI-decision artifacts now return:
    - `status: "UNAVAILABLE"`
    - `items: []`
- Updated `ReportDetailScreen.tsx`:
  - the AI decisions panel now shows a status badge when the backend returns `UNAVAILABLE`
  - existing no-data copy remains the empty-state body, so the panel consumes the new shell without expanding the page contract
- Synced scaffolding/docs:
  - `LocalAdminApiServerTest.java`
  - `App.test.tsx`
  - `docs/phase3/interface/reportDetail/interface-spec.md`
  - `docs/phase3/interface/review-backlog.md`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/ReportArtifactService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/ReportDetailScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/reportDetail/interface-spec.md`
- `docs/phase3/interface/review-backlog.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `recovery` still keeps deterministic mock payloads when real artifacts are absent
- `reportDetail` main summary still keeps snapshot-derived fallback when backend detail reads fail
- screenshot/artifact content still remains listing-path-only rather than inline view/download

## 2026-05-15 P3-4 plugin popup candidate locators realism

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten the popup mirror `Candidate locators` block
  - prefer run-local / persisted plugin context
  - leave the old fixed locator list only as legacy fallback

## Completed
- Extended persisted scheduler request context and `/api/phase3/extension-popup` with additive `page.locatorCandidates[]`
- Updated `PluginPopupScreen.tsx`:
  - `Candidate locators` now prefers real `page.locatorCandidates[]`
  - the old fixed locator list only renders when popup page context omits candidates
- Synced `plugin/interface-spec.md`, `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/model/ExtensionPopupSnapshot.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/Phase3MockDataService.java`
- `apps/local-admin-api/src/main/java/com/example/webtest/admin/service/SchedulerPersistenceService.java`
- `apps/local-admin-api/src/test/java/com/example/webtest/admin/http/LocalAdminApiServerTest.java`
- `ui/admin-console/src/types.ts`
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/interface-spec.md`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `mvn -pl apps/local-admin-api -Dtest=LocalAdminApiServerTest test`
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- `pick-mode` header / state copy is still mostly demo UI text
- candidate rows now prefer persisted popup context, but the screen still does not model a full plugin-side locator review workflow

## 2026-05-15 P3-4 plugin pick-mode header realism

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking pick-mode header/state copy
  - prefer existing popup snapshot context
  - leave old copy as legacy fallback

## Completed
- Updated `PluginPopupScreen.tsx`:
  - pick-mode badge now prefers `popupSnapshot.status`
  - pick-mode summary now prefers `page.locator`
  - old hover/click instruction plus `active` badge remain only as legacy fallback
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- `pick-mode` candidate review area is still a simplified mirror, not a full plugin-side pick workflow
- quick-action copy and wider popup affordances still retain some demo-oriented language

## 2026-05-15 P3-4 plugin quick-action subtitle realism

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking quick-action subtitle
  - prefer existing popup snapshot context
  - keep the old copy as legacy fallback

## Completed
- Updated `PluginPopupScreen.tsx`:
  - the `Open in platform` quick-action subtitle now prefers `popupSnapshot.hints[0]`
  - the old `Full report and logs` subtitle remains only as fallback when popup hints are absent
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- quick-action behavior is still mostly a compact mirror, not a full plugin-side action workflow with richer per-action state
- other quick-action copy outside the selected subtitle still retains some demo-oriented language

## 2026-05-15 P3-4 plugin active-run empty-state realism

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking active-run empty-state copy
  - prefer existing popup runtime context
  - keep the fixed empty-state text only as final fallback

## Completed
- Updated `PluginPopupScreen.tsx`:
  - active-run card now prefers `runtime.nextAction`
  - when `nextAction` is absent, it prefers `runtime.auditState` as the headline and `runtime.queueState` as supporting text
  - `No active run` remains only as the final fallback
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- active-run card is still a compact mirror, not a fuller plugin-side execution state model
- broader popup copy still keeps some demo-oriented language outside this chosen slice

## 2026-05-15 P3-4 plugin selected-element rationale copy

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking supporting line near the selected-element card
  - prefer existing popup locator-candidate context
  - keep a fixed fallback reminder when that context is absent

## Completed
- Updated `PluginPopupScreen.tsx`:
  - the selected-element card now shows a supporting rationale line
  - it prefers the recommended candidate `reason`, then any available candidate `reason`
  - when popup candidate reasons are absent, it falls back to `Review the best locator before copying it into DSL.`
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- `selected element` and `candidate review` remain a compact mirror, not a full plugin-side recommendation workflow
- broader pick workflow and other popup copy still keep some demo-oriented language outside this chosen slice

## 2026-05-15 P3-4 plugin candidate-panel helper line

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking helper line in the candidate panel
  - prefer existing popup locator-candidate context
  - keep a fixed fallback reminder when no recommendation is available

## Completed
- Updated `PluginPopupScreen.tsx`:
  - candidate panel now shows a helper line above the locator list
  - it prefers the current recommended candidate value
  - it is derived only from real popup candidates; when no recommended run-local candidate is available, it falls back to a fixed review reminder
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- candidate panel remains a compact mirror, not a fuller plugin-side review workflow with richer recommendation state
- broader popup copy still keeps some demo-oriented language outside this chosen slice

## 2026-05-15 P3-4 plugin candidate-review reason copy

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking candidate-review text gap
  - prefer existing popup locator-candidate context
  - leave demo explanation as fallback

## Completed
- Updated `PluginPopupScreen.tsx`:
  - candidate rows now render real `locatorCandidates[].reason` inline when present
  - fallback demo rows now include lightweight explanation copy instead of staying reason-less
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- `candidate review` is still a compact mirror, not a full plugin-side recommendation workflow with richer confidence/risk narration
- wider plugin popup copy still keeps some demo-oriented language outside the chosen slice

## 2026-05-15 P3-4 plugin quick-smoke helper copy

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking section helper copy
  - prefer existing popup page context
  - leave the fixed quick-smoke helper text as fallback

## Completed
- Updated `PluginPopupScreen.tsx`:
  - the `Quick smoke test` helper copy now prefers the current popup page path
  - when `page.url` is present, the row renders `Run on /...`
  - when popup URL context is absent, it still falls back to `Run on current URL`
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- this slice only tightens one quick-smoke helper line; it does not extend the popup into a fuller plugin-side smoke-test workflow
- broader popup copy still keeps some demo-oriented language outside the chosen slice

## 2026-05-15 P3-4 plugin popup-header status label

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking popup header status/helper copy
  - prefer existing popup runtime context
  - leave the older environment-style suffix as fallback

## Completed
- Updated `PluginPopupScreen.tsx`:
  - the small popup-header status suffix now prefers `runtime.queueState`
  - when queue context is present, it renders `host connected / running`-style copy
  - when queue context is absent, it still falls back to the older environment-style label
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- this slice only tightens one small popup-header status suffix; it does not extend the popup into a fuller plugin-side state model
- broader popup copy still keeps some demo-oriented language outside the chosen slice

## 2026-05-15 P3-4 plugin candidate badge realism

## Task
- Keep the current `P3-4 plugin` thread narrow:
  - tighten one obviously demo-looking candidate badge/status label
  - prefer existing popup locator-candidate context
  - keep the older recommended badge as fallback for legacy/demo rows

## Completed
- Updated `PluginPopupScreen.tsx`:
  - the candidate-list recommendation badge now distinguishes modern popup candidates from demo fallback rows
  - when run-local `locatorCandidates[]` are present, the preferred row shows `top match`
  - when the list falls back to legacy/demo candidates, it still shows `recommended`
- Synced `plugin/functional-spec.md`, `memory.txt`

## Modified Files
- `ui/admin-console/src/screens/PluginPopupScreen.tsx`
- `ui/admin-console/src/App.test.tsx`
- `docs/phase3/interface/plugin/functional-spec.md`
- `memory.txt`
- `01_dev_progress.md`

## Verification
- Ran `npm test -- --run src/App.test.tsx -t "plugin popup"`

## Remaining Limits
- this slice only tightens one candidate-list badge label; it does not extend the popup into a fuller plugin-side locator-review workflow
- broader popup copy still keeps some demo-oriented language outside the chosen slice

## 2026-05-07 P3-3 dataDiff restore-result doc example alignment follow-up

## Task
- Keep the current `P3-3 dataDiff` thread narrow:
  - align the `restore-result` example block in `dataDiff/interface-spec.md`
  - avoid any code change or broader doc sweep

## Completed
- Updated `docs/phase3/interface/dataDiff/interface-spec.md`:
  - the `GET /api/phase3/runs/{runId}/restore-result` example JSON no longer shows stale `PARTIAL` + fake restore steps
  - the example now matches the current backend-missing-artifact behavior:
    - `runId`
    - `status: "UNAVAILABLE"`
    - `items: []`

## Modified Files
- `docs/phase3/interface/dataDiff/interface-spec.md`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Not run by explicit task boundary:
  - no test run
  - no build run

## Remaining Limits
- `data-diff/raw` still falls back to deterministic mock content when no persisted raw artifact exists
- `dataDiff` table rows still retain the existing synthetic fallback path when the diff endpoint itself is unavailable
- `reportDetail` still keeps snapshot-derived fallback when backend detail reads fail
