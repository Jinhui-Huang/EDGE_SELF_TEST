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
