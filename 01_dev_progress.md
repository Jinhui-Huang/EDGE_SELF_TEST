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
