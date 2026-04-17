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
- 当前已进入 Phase 2 稳定性增强：已完成 Console/Network 采集、Network body sidecar、报告索引、报告保留清理、artifact-only pruning、缺失/已裁剪 artifact 元数据标记等能力。
- 尚未完整进入 Phase 3：项目管理、用例管理、套件执行、环境管理、数据集、失败重跑等平台化管理能力仍未落地。

---

# 2. 当前总体状态

## 已完成
- [x] 阅读项目入口、技术方案、Phase2 落地文档、Phase3 Java 骨架文档、CDP 文档、Native Messaging 文档、Edge TS 文档
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
- [ ] Phase 3 平台化管理能力：项目/用例/套件/环境/数据集/失败重跑

---

# 3. 已完成模块清单

## Java 核心平台
- 模块名：Maven 多模块工程骨架
  - 状态：已初始化
  - 说明：创建 apps 与 libs 模块，并按 Phase2 文档建立模块依赖边界；已根据当前开发要求从 Gradle 切换为 Maven
  - 对应文件：`pom.xml`、各模块 `pom.xml`
  - 对应文档：`enterprise_web_test_platform_phase2_implementation_design.md`

- 模块名：common-core
  - 状态：基础骨架已完成
  - 说明：提供基础异常、错误码、ID 工具、通用 Result
  - 对应文件：`libs/common-core/src/main/java/com/example/webtest/common/**`
  - 对应文档：`enterprise_web_test_platform_phase3_java_core_code_skeleton.md`

- 模块名：common-json
  - 状态：基础实现已完成
  - 说明：提供 `Jsons` 门面，已接入 Jackson JSON/YAML；未知字段忽略，枚举大小写不敏感
  - 对应文件：`libs/common-json/src/main/java/com/example/webtest/json/Jsons.java`
  - 对应文档：`enterprise_web_test_platform_phase3_java_core_code_skeleton.md`

- 模块名：dsl-model / dsl-parser
  - 状态：基础骨架已完成
  - 说明：提供 DSL 模型、解析接口和基础校验器
  - 对应文件：`libs/dsl-model/src/main/java/com/example/webtest/dsl/model/**`、`libs/dsl-parser/src/main/java/com/example/webtest/dsl/**`
  - 对应文档：`enterprise_web_test_platform_phase3_java_core_code_skeleton.md`

- 模块名：execution-context
  - 状态：基础骨架已完成
  - 说明：提供运行 ID、Session ID 与变量上下文
  - 对应文件：`libs/execution-context/src/main/java/com/example/webtest/execution/context/ExecutionContext.java`
  - 对应文档：`enterprise_web_test_platform_phase3_java_core_code_skeleton.md`

- 模块名：browser-core
  - 状态：基础实现已完成，尚未真实联调
  - 说明：提供 Session 管理、Edge 启动、Page target DevTools endpoint 查询、PageController 基础 CDP 调用、截图选项、Console/Network 事件模型
  - 对应文件：`libs/browser-core/src/main/java/com/example/webtest/browser/**`
  - 对应文档：`enterprise_web_test_platform_phase3_java_core_code_skeleton.md`、`cdp_domain_encapsulation_detailed_design.md`

- 模块名：apps/core-platform smoke 入口
  - 状态：已添加，尚未运行真实 Edge smoke
  - 说明：提供 `CorePlatformApp`，目标链路为启动 headless Edge、导航 data URL、截图到 `runs/smoke/screenshot.png`
  - 对应文件：`apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
  - 对应文档：`enterprise_web_test_platform_tech_design.md` 附录 A、`enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 附录 A

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

# 4. 最近一次开发记录

## 日期
- 2026-04-16

## 本次任务目标
- 初始化仓库和 Phase 0 工程骨架；根据后续要求将构建体系从 Gradle 调整为 Maven。

## 本次完成内容
- 执行 `git init`
- 创建根 Maven 聚合 POM
- 创建 apps/libs/ui/extension/config/runs/scripts/tools 目录
- 按设计文档创建首批模块的 `pom.xml`
- 添加 `.gitignore`
- 实现 common-core、common-json、dsl-model、dsl-parser 基础 Java 骨架
- 实现 execution-context、cdp-client、browser-core 基础 Java 骨架
- 使用 `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests package` 验证通过

## 修改文件
- `.gitignore`
- `pom.xml`
- `apps/**/pom.xml`
- `libs/**/pom.xml`
- `libs/common-core/src/main/java/**`
- `libs/common-json/src/main/java/**`
- `libs/dsl-model/src/main/java/**`
- `libs/dsl-parser/src/main/java/**`
- `libs/execution-context/src/main/java/**`
- `libs/cdp-client/src/main/java/**`
- `libs/browser-core/src/main/java/**`
- `config/**/.gitkeep`
- `extension/edge-extension/.gitkeep`
- `ui/**/.gitkeep`
- `scripts/.gitkeep`
- `tools/.gitkeep`
- `runs/.gitkeep`
- `01_dev_progress.md`

## 设计依据
- `00_project_index.md`
- `enterprise_web_test_platform_tech_design.md`
- `enterprise_web_test_platform_phase2_implementation_design.md`
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md`

## 当前结果
- [x] 已完成并可运行
- [ ] 已完成但未联调
- [ ] 部分完成
- [ ] 暂停
- [ ] 有阻塞

## 当前阻塞点
- 暂无阻塞。
- Maven 构建可用；当前机器 JDK 为 17，和设计文档的 Java 21 存在差异。

---

# 5. 当前系统状态总结

## 能运行到哪一步
- 当前完成 Maven 工程骨架、common/dsl/execution-context/cdp-client/browser-core 基础 Java 骨架，尚未实现 Java 入口类和真实浏览器链路。

## 当前已打通链路
- 文档 -> 阶段判断 -> Maven 模块结构。
- common-core/common-json/dsl-model/dsl-parser 编译链路。
- execution-context/cdp-client/browser-core 编译链路。

## 当前未打通链路
- CDP 连接链路。
- DSL 解析与执行链路。
- Native Messaging 链路。
- Edge 插件链路。

## 当前最薄弱部分
- CDP WebSocket 传输、Edge 启动和 PageController 基础 CDP 调用已实现；尚未做真实 Edge 端到端联调。

---

# 6. 已知问题

- 问题 1：
  - 现象：历史进度文档此前为空模板。
  - 影响范围：无法确认是否存在未提交代码之外的历史实现。
  - 是否阻塞：不阻塞当前初始化。
  - 临时方案：以当前工作区文件为准，从 Phase 0 开始记录。

- 问题 2：
  - 现象：CDP WebSocket 传输、Edge 启动、Page target endpoint 查询、PageController 基础调用和 smoke 入口已实现，但尚未运行真实 Edge 端到端 smoke。
  - 影响范围：尚不能确认真实打开页面和截图链路。
  - 是否阻塞：不阻塞工程初始化。
  - 临时方案：下一次优先运行 `CorePlatformApp`，验证启动 Edge -> navigate -> screenshot。

- 问题 3：
  - 现象：设计文档要求 Java 21，但当前环境为 JDK 17。
  - 影响范围：Maven 目前使用 `maven.compiler.release=17` 以保证本机可构建。
  - 是否阻塞：不阻塞当前骨架开发。
  - 临时方案：后续安装 JDK 21 后，将根 `pom.xml` 中 `maven.compiler.release` 调整为 21。

- 问题 4：
  - 现象：`common-json` 已接入 Jackson，但尚未补充 DSL parser 单元测试。
  - 影响范围：解析能力已可用，但边界用例未验证。
  - 是否阻塞：不阻塞当前阶段。
  - 临时方案：后续补充 DSL JSON/YAML 解析测试。

---

# 7. 临时决策记录

- 决策 1：
  - 内容：仓库从 Phase 0 工程骨架开始初始化。
  - 原因：当前工作区只有文档，没有源码目录。
  - 影响：后续开发必须按文档逐步补模块代码。
  - 后续是否要调整：如果发现外部已有源码，需要对齐后再合并。

- 决策 2：
  - 内容：先创建文档推荐的多模块结构，但只在首批模块中逐步填代码。
  - 原因：保持模块边界完整，同时避免一次性实现过多。
  - 影响：空模块会先存在，后续按优先级补实现。
  - 后续是否要调整：可根据实际依赖收敛模块。

- 决策 3：
  - 内容：构建工具从 Gradle 切换为 Maven。
  - 原因：当前开发要求调整为 Maven，且本机 Maven 可用。
  - 影响：Phase2 文档中的 Gradle 示例仅作为模块边界参考，实际工程以 Maven POM 为准。
  - 后续是否要调整：除非明确要求，不再回切 Gradle。

---

# 8. 禁止重复修改 / 注意事项

- 不要绕过 Java 核心平台把复杂逻辑写进 Edge 插件
- 不要让 Agent 直接接管底层执行
- 不要在业务层直接拼 CDP method 字符串
- 不要大量使用硬编码 sleep 替代 WaitEngine
- 不要把 Native Messaging 用作大文件/大截图传输通道
- 不要在 Host stdout 打普通日志，避免污染协议输出
- 当前 `runs/` 目录只跟踪 `.gitkeep`，运行产物不要提交
- 当前 `.m2/` 为工作区 Maven 本地仓库，不要提交

---

# 9. 下一步建议

## 最高优先级
1. 执行 `CorePlatformApp` 真实 smoke：启动 Edge -> navigate -> screenshot
2. 根据 smoke 结果修复 CDP/page endpoint/截图链路
3. 补充 DSL parser 单元测试

## 次优先级
1. 实现最小 `execution-engine` 编排骨架
2. 实现 locator/action/wait/assertion 的第一版接口骨架

## 暂时不做
- Edge 插件 UI
- Native Messaging 系统注册
- DB 断言
- Agent 接入

---

# 10. 下次开发前，AI 必须先回答的问题

进入下一次开发前，开发 AI 必须先根据本文件回答：

1. 当前项目处于哪个阶段？
2. 已完成的核心模块有哪些？
3. 本次任务和哪些模块直接相关？
4. 本次任务会修改哪些文件？
5. 本次任务依据哪些设计文档？
6. 当前有哪些已知问题不能忽略？
7. 本次开发完成后需要如何更新本文件？

如果不能回答清楚，不允许直接进入编码。

---

# 11. 每次更新时的标准模板

请在每次开发结束后，按下面格式追加或更新：

```markdown
## 日期
- 2026-xx-xx

## 本次任务
- ...

## 完成内容
- ...
- ...

## 修改文件
- ...
- ...

## 当前状态
- ...

## 已知问题
- ...
- ...

## 下一步
- ...
- ...
```

---

# 12. 下次开发建议阅读范围

为减少 token 消耗，下次若继续 Java 核心骨架开发，优先阅读：
- `01_dev_progress.md`
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 8-9、20-21 章
- `cdp_domain_encapsulation_detailed_design.md` 第 4-8、19-21 章
- 如继续 DSL/编排，再读 `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 6-7、17 章

## 下次接手关键记忆
- 构建工具已从 Gradle 切换为 Maven；不要再恢复 Gradle。
- 当前 Maven 命令：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests package`。
- 当前环境只有 JDK 17，所以根 `pom.xml` 暂用 `maven.compiler.release=17`；设计文档目标仍是 Java 21。
- `.m2/` 是工作区本地 Maven 仓库，已加入 `.gitignore`。
- 已提交阶段：
  - `fd075fc`：初始化仓库结构
  - `a6c7549`：切换 Maven 并添加 common/dsl 骨架
  - `a9cbaed`：添加 cdp/browser/execution-context 骨架
  - `3cdd1c2`：启用 Jackson JSON 支持
  - `57cee84`：实现 CDP WebSocket client
  - `f95bb7b`：实现 Edge 启动与 PageController CDP 基础命令
- 当前未提交阶段即将提交：core-platform smoke 入口，以及 Page target endpoint 查询修正。
- 下次优先验证 smoke 入口，不要先大规模扩展新模块。

---

**文件结束**

---

## 2026-04-16 本次开发记录

## 本次任务
- 验证并修正 core-platform smoke 链路：启动 Edge -> 连接 CDP -> 导航 data URL -> 截图。

## 完成内容
- 已真实运行 Edge headless smoke，截图生成到仓库根目录 `runs/smoke/screenshot.png`。
- 修正 `CorePlatformApp` 的截图输出路径，使其从子模块目录运行时仍写入仓库根 `runs/`。
- 修正 smoke data URL 编码方式，改为 base64，避免页面标题中的空格被解析为 `+`。
- smoke 等待 `Page.loadEventFired` 超时时现在会显式失败。
- smoke 结束时通过 `BrowserSessionManager.close(sessionId)` 关闭 CDP 和 Edge 进程。

## 修改文件
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `01_dev_progress.md`

## 当前状态
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform smoke 通过，输出：
  - `Smoke screenshot: D:\txt\edge_self_test\runs\smoke\screenshot.png`
  - `Page title: Edge Self Test Smoke`

## 已知问题
- 从聚合根直接执行 `exec:java` 仍会在根项目解析主类，当前可用方式是先 `install`，再从 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp"`。
- 设计目标仍是 Java 21，但当前环境按既有决策继续使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 补充 DSL parser JSON/YAML 单元测试。
- 开始实现最小 `execution-engine` 编排骨架，将 DSL 解析结果接到 browser-core/page-controller。
- 后续可给 core-platform 增加更稳定的运行入口或 Maven exec 配置，减少手工命令差异。

## 2026-04-16 追加修正
- 补强 `DefaultBrowserSessionManager.close`：关闭 session 时会先销毁 Edge 子进程，再等待父进程退出，超时后强制销毁，避免 headless Edge 调试进程残留。
- 修改文件追加：`libs/browser-core/src/main/java/com/example/webtest/browser/session/DefaultBrowserSessionManager.java`
- 复验 smoke 后，未发现带 `webtest-edge-*` 或 `remote-debugging-port` 的本项目 Edge 残留进程。

---

## 2026-04-16 下一轮开发记录

## 本次任务
- 补充 DSL parser JSON/YAML 单元测试，并补齐 parser 层 YAML 解析入口。

## 完成内容
- 为 `DslParser` 增加 `parseYaml(String yaml)`。
- `DefaultDslParser.parse(Path)` 现在会按 `.yaml` / `.yml` 扩展名选择 YAML 解析，其余文件继续按 JSON 解析。
- 增加 JUnit 5 测试依赖管理和 `dsl-parser` 测试依赖。
- 新增 `DefaultDslParserTest`，覆盖：
  - JSON DSL 解析。
  - YAML DSL 解析。
  - `parse(Path)` 对 `.yml` 文件的自动分派。
  - 缺少 URL 的 `goto` 步骤校验失败。

## 修改文件
- `pom.xml`
- `libs/dsl-parser/pom.xml`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/parser/DslParser.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/parser/DefaultDslParser.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `01_dev_progress.md`

## 当前状态
- DSL parser 定向测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/dsl-parser test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`

## 已知问题
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。
- core-platform 从聚合根直接执行 `exec:java` 的主类解析差异仍未处理。

## 下一步
- 开始实现最小 `execution-engine` 编排骨架，将 DSL 解析结果接到 browser-core/page-controller。
- 后续可为 core-platform 增加稳定的 Maven exec 配置，减少手工运行命令差异。

---

## 2026-04-16 execution-engine 最小骨架开发记录

## 本次任务
- 按文档下一步实现最小 `execution-engine` 编排骨架，将 DSL 解析结果接到 `browser-core` 的 `PageController`。

## 完成内容
- 新增 `TestOrchestrator` 接口和 `DefaultTestOrchestrator` 默认实现。
- 新增轻量运行结果模型：`RunOptions`、`RunResult`、`RunStatus`、`StepExecutionRecord`。
- 最小编排器当前支持：
  - `GOTO`：调用 `PageController.navigate`，支持结合 `baseUrl` 解析相对 URL。
  - `REFRESH`：调用 `PageController.reload`。
  - `SCREENSHOT`：调用 `PageController.screenshot` 并写入运行输出目录。
  - `ASSERT_TITLE`：调用 `PageController.title` 并断言。
  - `ASSERT_URL`：调用 `PageController.currentUrl` 并断言。
- 新增 `DslRunService` / `DefaultDslRunService`，负责从 `DslParser.parse(Path)` 读取 DSL 后交给编排器执行。
- 为 `execution-engine` 增加 JUnit 5 测试依赖。
- 新增 `DefaultTestOrchestratorTest`，覆盖 DSL 步骤分派、截图落盘、默认失败短路和 DSL 文件解析后执行。

## 修改文件
- `libs/execution-engine/pom.xml`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/TestOrchestrator.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/service/DslRunService.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/service/DefaultDslRunService.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunOptions.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunResult.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunStatus.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/StepExecutionRecord.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`

## 当前状态
- execution-engine 定向测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/execution-engine test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`

## 已知问题
- 当前编排器仍是最小骨架，尚未接入完整 `action-engine` / `locator-engine` / `wait-engine` / `report-engine`。
- `CLICK` / `FILL` 等需要元素定位和 DOM 交互的动作尚未实现。
- `DefaultDslRunService` 已打通 DSL 文件到编排器，但还没有在 `core-platform` 中提供统一命令入口。

## 下一步
- 实现最小 `locator-engine` 和浏览器 DOM 交互能力，用于支撑 `CLICK` / `FILL`。
- 或先给 `core-platform` 增加稳定的 DSL smoke 入口，读取 DSL 文件并调用 `DefaultDslRunService`。

## 2026-04-16 core-platform DSL smoke 入口开发记录
## 本次任务
- 保存当前接手记忆和进度，并在两条路线中优先选择改动面较小的 `core-platform` DSL smoke 入口。

## 完成内容
- 为 `CorePlatformApp` 增加 `dsl-smoke` 命令入口，可读取 DSL 文件并调用 `DefaultDslRunService`。
- 新增 `config/smoke/core-platform-smoke.yml`，覆盖真实 Edge 中的 `GOTO`、`ASSERT_TITLE`、`SCREENSHOT` 最小链路。
- `DefaultPageController.navigate` 现在会在 `Page.navigate` 后等待 `Page.loadEventFired`，避免 DSL 编排器在页面尚未加载时立即执行断言或截图。
- `apps/core-platform` 显式声明 `dsl-parser` 依赖，因为入口类直接构造 `DefaultDslParser` / `DefaultDslValidator`。
- 已真实运行 headless Edge DSL smoke，输出截图到 `runs/dsl-smoke/capture-page.png`。
- 已复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 修改文件
- `memory.txt`
- `apps/core-platform/pom.xml`
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `config/smoke/core-platform-smoke.yml`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 先在仓库根目录执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出：
  - `DSL smoke run: dsl-smoke-run`
  - `Status: SUCCESS`
  - `Output dir: D:\txt\edge_self_test\runs\dsl-smoke`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`

## 已知问题
- `core-platform` 从聚合根直接执行 `exec:java` 的主类解析差异仍未单独处理；当前稳定方式仍是先 install，再从 `apps/core-platform` 执行。
- `DefaultPageController.navigate` 使用固定 5 秒页面加载等待，后续应迁移到正式 `wait-engine` 或可配置超时策略。
- 当前 DSL 编排器仍只支持最小动作集合，`CLICK` / `FILL` 等 DOM 交互动作尚未实现。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 开始实现最小 `locator-engine` 与 `action-engine` 浏览器 DOM 交互链路，优先支持 `CLICK` / `FILL`。
- 之后把 `DefaultTestOrchestrator` 的 unsupported action 分支逐步接到 action/locator/wait 模块，而不是继续在编排器里堆业务细节。

## 2026-04-16 locator/action DOM 交互链路开发记录

## 本次任务
- 实现最小 `locator-engine` 与 `action-engine` 浏览器 DOM 交互链路，让 DSL 的 `CLICK` / `FILL` 能在真实 Edge 中执行。

## 完成内容
- `browser-core` 扩展 `PageController`，新增 `findElement`、`clickElement`、`fillElement` 三个最小 DOM 交互方法。
- `DefaultPageController` 通过 CDP `Runtime.evaluate` 执行 DOM 查询和交互，当前支持基础定位方式：`css` / `selector` / `id` / `name` / `tag` / `text` / `role` / `testid`。
- 新增 `ElementState`，用于承载浏览器侧元素状态：是否找到、匹配数量、是否可见、是否可操作。
- 新增 `locator-engine` 最小实现：
  - `ResolveResult`
  - `ElementResolver`
  - `DefaultElementResolver`
- 新增 `action-engine` 最小实现：
  - `StepResult`
  - `ActionExecutor`
  - `DefaultActionExecutor`
  - `StepActionHandler`
  - `BrowserInteractionService`
  - `DefaultBrowserInteractionService`
  - `ClickActionHandler`
  - `FillActionHandler`
- `DefaultTestOrchestrator` 现在将 `CLICK` / `FILL` 分支接入 `ActionExecutor`，不再作为 unsupported action 失败。
- 扩展 `config/smoke/core-platform-smoke.yml`，在真实 headless Edge 中执行：
  - `FILL` 输入 `#search`
  - `CLICK` 点击 `#submit`
  - `ASSERT_TITLE` 验证按钮点击后的标题变化
- 新增/扩展单元测试，覆盖 locator 解析、action 分派、orchestrator 到 action-engine 的调用链。

## 修改文件
- `memory.txt`
- `libs/browser-core/pom.xml`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/ElementState.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/locator-engine/pom.xml`
- `libs/locator-engine/src/main/java/com/example/webtest/locator/model/ResolveResult.java`
- `libs/locator-engine/src/main/java/com/example/webtest/locator/resolver/ElementResolver.java`
- `libs/locator-engine/src/main/java/com/example/webtest/locator/resolver/DefaultElementResolver.java`
- `libs/locator-engine/src/test/java/com/example/webtest/locator/resolver/DefaultElementResolverTest.java`
- `libs/action-engine/pom.xml`
- `libs/action-engine/src/main/java/com/example/webtest/action/result/StepResult.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/executor/ActionExecutor.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/executor/DefaultActionExecutor.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/StepActionHandler.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/BrowserInteractionService.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/DefaultBrowserInteractionService.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/ClickActionHandler.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/FillActionHandler.java`
- `libs/action-engine/src/test/java/com/example/webtest/action/executor/DefaultActionExecutorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `config/smoke/core-platform-smoke.yml`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/locator-engine,libs/action-engine,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 先在仓库根目录执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出：
  - `DSL smoke run: dsl-smoke-run`
  - `Status: SUCCESS`
  - `fill-search FILL SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 已复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- DOM 定位和交互仍是最小实现，尚未支持 frame、shadow DOM、复杂可访问性名称、坐标点击、键盘输入序列、文件上传等完整能力。
- `CLICK` / `FILL` 当前依赖即时 `findElement` 结果，还没有接入正式 `wait-engine` 的轮询等待和可配置超时。
- `DefaultPageController.navigate` 仍使用固定 5 秒页面加载等待，后续应迁移到正式 `wait-engine` 或统一超时策略。
- `core-platform` 从聚合根直接执行 `exec:java` 的主类解析差异仍未单独处理；当前稳定方式仍是先 install，再从 `apps/core-platform` 执行。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 实现最小 `wait-engine`，优先支持 `WAIT_FOR_ELEMENT` / `WAIT_FOR_VISIBLE`，并让 `CLICK` / `FILL` 可在动作前按 `timeoutMs` 等待目标元素。
- 继续将 `DefaultTestOrchestrator` 的其他 unsupported action 分支逐步迁移到 action/locator/wait/assertion/artifact 模块。
- 后续可为 core-platform 增加稳定 Maven exec 配置，减少从聚合根和子模块运行时的命令差异。

## 下次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 12 章 wait-engine 骨架，以及第 22 章编排器接入示例。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 10 章等待模块设计。

## 2026-04-16 wait-engine 最小等待链路开发记录
## 本次任务
- 实现最小 `wait-engine`，优先支持 `WAIT_FOR_ELEMENT` / `WAIT_FOR_VISIBLE`，并让 `CLICK` / `FILL` 在动作前按 `timeoutMs` 等待目标元素可见。

## 完成内容
- 新增 `WaitEngine` 接口和 `DefaultWaitEngine` 默认实现。
- `DefaultWaitEngine` 通过 `ElementResolver` 轮询元素状态，当前支持 `waitForElement` 和 `waitForVisible`。
- 等待超时会抛出明确错误，包含等待目标、超时时间和最后一次元素状态。
- 新增 `WaitActionHandler`，将 DSL 的 `WAIT_FOR_ELEMENT` / `WAIT_FOR_VISIBLE` 接入 `ActionExecutor`。
- `ClickActionHandler` / `FillActionHandler` 现在在提供 `WaitEngine` 时，会先按步骤 `timeoutMs` 等待元素可见，再执行点击或填充。
- `DefaultTestOrchestrator` 默认装配 `DefaultWaitEngine`，并把 `WAIT_FOR_ELEMENT` / `WAIT_FOR_VISIBLE` 分发给 action/wait 链路。
- 扩展 `config/smoke/core-platform-smoke.yml`，增加真实 Edge DSL smoke 中的 `wait_for_visible` 步骤，并给 `fill` / `click` 增加 `timeoutMs`。
- 新增/扩展单元测试覆盖等待轮询、超时错误、动作前置等待、显式等待动作分发和 orchestrator 分发链路。

## 修改文件
- `libs/wait-engine/pom.xml`
- `libs/wait-engine/src/main/java/com/example/webtest/wait/engine/WaitEngine.java`
- `libs/wait-engine/src/main/java/com/example/webtest/wait/engine/DefaultWaitEngine.java`
- `libs/wait-engine/src/test/java/com/example/webtest/wait/engine/DefaultWaitEngineTest.java`
- `libs/action-engine/pom.xml`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/ClickActionHandler.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/FillActionHandler.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/WaitActionHandler.java`
- `libs/action-engine/src/test/java/com/example/webtest/action/executor/DefaultActionExecutorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `config/smoke/core-platform-smoke.yml`
- `memory.txt`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/wait-engine,libs/action-engine,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `wait-search WAIT_FOR_VISIBLE SUCCESS`
  - `fill-search FILL SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `wait-engine` 目前是最小轮询实现，只支持 `WAIT_FOR_ELEMENT` / `WAIT_FOR_VISIBLE`，尚未支持 `WAIT_FOR_HIDDEN` / `WAIT_FOR_TEXT` / `WAIT_FOR_URL` / `WAIT_FOR_RESPONSE`。
- 当前轮询间隔固定为 100ms，尚未做统一超时策略对象或事件优先等待。
- `CLICK` / `FILL` 当前前置等待条件为元素可见，尚未区分更细的 actionable、enabled、stable 等状态。
- `DefaultPageController.navigate` 仍使用固定 5 秒页面加载等待，后续应迁移到正式 wait-engine 或统一超时策略。
- `core-platform` 从聚合根直接执行 `exec:java` 的主类解析差异仍未单独处理；当前稳定方式仍是先 install，再从 `apps/core-platform` 执行。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 扩展 `wait-engine` 支持 `WAIT_FOR_HIDDEN` / `WAIT_FOR_URL`，把页面导航和 URL 等待逐步纳入统一等待能力。
- 开始抽离 assertion 能力，把 `ASSERT_TITLE` / `ASSERT_URL` 从 `DefaultTestOrchestrator` 迁移到 `assertion-engine`，减少编排器里的业务细节。
- 后续可为 core-platform 增加稳定 Maven exec 配置，减少从聚合根和子模块运行时的命令差异。

## 下次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 10 章等待模块设计、第 11 章断言模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 12 章 wait-engine 骨架、第 13 章 assertion-engine 骨架、第 22 章编排器接入示例。

## 2026-04-16 assertion-engine 标题与 URL 断言抽离记录
## 本次任务
- 开始抽离 assertion 能力，把 `ASSERT_TITLE` / `ASSERT_URL` 从 `DefaultTestOrchestrator` 迁移到 `assertion-engine`，减少编排器里的业务细节。

## 完成内容
- 新增 `assertion-engine` 最小骨架：
  - `AssertionResult`
  - `AssertionEngine`
  - `DefaultAssertionEngine`
  - `AssertionHandler`
- 新增浏览器页面断言 handler：
  - `AssertTitleHandler`：通过 `PageController.title` 获取实际标题，并与 DSL `expected` 精确比较。
  - `AssertUrlHandler`：通过 `PageController.currentUrl` 获取实际 URL，并与 DSL `expected` 精确比较。
- `DefaultTestOrchestrator` 默认装配 `DefaultAssertionEngine`，并将 `ASSERT_TITLE` / `ASSERT_URL` 分发到 assertion 链路；编排器只处理成功/失败结果，不再内联断言业务逻辑。
- 断言失败仍统一抛出 `ASSERTION_FAILED`，保持现有执行记录和失败停止语义不变。
- `DefaultDslValidator` 新增断言校验：`ASSERT_TITLE` / `ASSERT_URL` 必须提供 `expected`。
- 新增/扩展测试：
  - `DefaultAssertionEngineTest` 覆盖 title/url handler 分发与断言失败消息。
  - `DefaultDslParserTest` 覆盖断言缺少 `expected` 的 DSL 校验失败。
  - 既有 `DefaultTestOrchestratorTest` 继续覆盖断言失败停止链路。

## 修改文件
- `libs/assertion-engine/pom.xml`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/model/AssertionResult.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/engine/AssertionEngine.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/engine/DefaultAssertionEngine.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertionHandler.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertTitleHandler.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertUrlHandler.java`
- `libs/assertion-engine/src/test/java/com/example/webtest/assertion/engine/DefaultAssertionEngineTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `memory.txt`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/assertion-engine,libs/dsl-parser,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `open-smoke-page GOTO SUCCESS`
  - `assert-title ASSERT_TITLE SUCCESS`
  - `wait-url WAIT_FOR_URL SUCCESS`
  - `wait-search WAIT_FOR_VISIBLE SUCCESS`
  - `wait-absent WAIT_FOR_HIDDEN SUCCESS`
  - `fill-search FILL SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `assertion-engine` 当前只支持 `ASSERT_TITLE` / `ASSERT_URL`，且仍是精确字符串比较；尚未支持 contains、regex、glob、URL 归一化或大小写/空白策略。
- `ASSERT_TEXT` / `ASSERT_VISIBLE` / `ASSERT_NOT_VISIBLE` / `ASSERT_VALUE` / `ASSERT_ATTR` / `ASSERT_DB` / `ASSERT_SCREENSHOT` 等仍未实现。
- `DefaultTestOrchestrator` 仍内联处理 `GOTO`、`REFRESH`、`SCREENSHOT` 等动作；`SCREENSHOT` 尚未迁移到 `artifact-engine`。
- `WAIT_FOR_URL` 与 `ASSERT_URL` 当前策略不同但都偏最小实现：前者在 wait-engine 轮询精确匹配，后者在 assertion-engine 单次精确比较。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 继续扩展 `assertion-engine`，优先实现：
  - `ASSERT_TEXT`：基于 `ElementResolver` 定位目标元素，再从页面侧读取文本并比较。
  - `ASSERT_VISIBLE` / `ASSERT_NOT_VISIBLE`：复用 `ElementResolver` 的 found/visible 状态。
- 或开始抽离 `artifact-engine`，把 `SCREENSHOT` 从 `DefaultTestOrchestrator` 迁移出去。
- 后续可考虑统一断言匹配策略对象，覆盖 exact / contains / regex / glob / normalized URL。

## 下次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 11 章断言模块设计、第 12 章产物模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 13 章 assertion-engine 骨架、第 14 章 artifact-engine 骨架、第 22 章编排器接入示例。

## 2026-04-16 wait-engine 隐藏与 URL 等待扩展记录
## 本次任务
- 继续扩展 `wait-engine`，在既有 `WAIT_FOR_ELEMENT` / `WAIT_FOR_VISIBLE` 基础上支持 `WAIT_FOR_HIDDEN` / `WAIT_FOR_URL`。

## 完成内容
- `WaitEngine` 新增 `waitForHidden` 和 `waitForUrl` 接口。
- `DefaultWaitEngine` 新增隐藏等待：当目标元素不存在或不可见时判定成功，继续复用 `ElementResolver` 的轮询模型。
- `DefaultWaitEngine` 新增 URL 等待：通过可选 `PageController` 轮询 `currentUrl`，直到等于 DSL 步骤的 `expected` 或 `url`。
- `WaitActionHandler` 支持分发 `WAIT_FOR_HIDDEN` / `WAIT_FOR_URL`，并保持默认超时 `DefaultWaitEngine.DEFAULT_TIMEOUT_MS`。
- `DefaultTestOrchestrator` 默认装配 `DefaultWaitEngine(elementResolver, pageController)`，并把 `WAIT_FOR_HIDDEN` / `WAIT_FOR_URL` 交给 action/wait 链路执行。
- `DefaultDslValidator` 增加等待动作校验：元素等待必须提供 `target`，`WAIT_FOR_URL` 必须提供 `expected` 或 `url`。
- `config/smoke/core-platform-smoke.yml` 增加真实 Edge smoke 步骤：
  - `wait-url WAIT_FOR_URL`
  - `wait-absent WAIT_FOR_HIDDEN`
- 扩展单元测试覆盖隐藏等待、URL 轮询、action 分发和 orchestrator 分发链路。

## 修改文件
- `libs/wait-engine/src/main/java/com/example/webtest/wait/engine/WaitEngine.java`
- `libs/wait-engine/src/main/java/com/example/webtest/wait/engine/DefaultWaitEngine.java`
- `libs/wait-engine/src/test/java/com/example/webtest/wait/engine/DefaultWaitEngineTest.java`
- `libs/action-engine/src/main/java/com/example/webtest/action/handler/WaitActionHandler.java`
- `libs/action-engine/src/test/java/com/example/webtest/action/executor/DefaultActionExecutorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `config/smoke/core-platform-smoke.yml`
- `memory.txt`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/wait-engine,libs/action-engine,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `wait-url WAIT_FOR_URL SUCCESS`
  - `wait-search WAIT_FOR_VISIBLE SUCCESS`
  - `wait-absent WAIT_FOR_HIDDEN SUCCESS`
  - `fill-search FILL SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `WAIT_FOR_URL` 当前只支持精确字符串相等，尚未支持 contains、regex、glob 或 URL 归一化。
- `wait-engine` 仍是固定 100ms 轮询，尚未引入统一等待策略对象、事件优先等待或可配置 poll interval。
- `WAIT_FOR_TEXT` / `WAIT_FOR_RESPONSE` 仍未实现。
- `DefaultPageController.navigate` 仍使用固定 5 秒页面加载等待，尚未迁移到统一 wait-engine 超时策略。
- `CLICK` / `FILL` 当前前置等待条件为元素可见，尚未区分更细的 actionable、enabled、stable 等状态。
- `core-platform` 从聚合根直接执行 `exec:java` 的主类解析差异仍未单独处理；当前稳定方式仍是先 install，再从 `apps/core-platform` 执行。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 开始抽离 assertion 能力，把 `ASSERT_TITLE` / `ASSERT_URL` 从 `DefaultTestOrchestrator` 迁移到 `assertion-engine`，减少编排器里的业务细节。
- 或继续补齐等待动作，优先实现 `WAIT_FOR_TEXT`，再考虑 `WAIT_FOR_RESPONSE` 与网络观察模块的边界。
- 后续可为 core-platform 增加稳定 Maven exec 配置，减少从聚合根和子模块运行时的命令差异。

## 下次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 10 章等待模块设计、第 11 章断言模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 12 章 wait-engine 骨架、第 13 章 assertion-engine 骨架、第 22 章编排器接入示例。

## 2026-04-16 assertion-engine 元素断言扩展记录

## 本次任务
- 继续扩展 `assertion-engine`，实现基于 `ElementResolver` / `PageController` 的 `ASSERT_TEXT` / `ASSERT_VISIBLE` / `ASSERT_NOT_VISIBLE`，并接入默认编排链路和真实 Edge DSL smoke。

## 完成内容
- `browser-core` 扩展 `PageController`，新增 `elementText(by, value, index, context)`，`DefaultPageController` 通过 CDP `Runtime.evaluate` 读取目标元素的 `innerText` / `textContent`。
- `assertion-engine` 新增：
  - `AssertTextHandler`：复用 `ElementResolver` 定位目标元素，再读取元素文本并与 DSL `expected` 精确比较。
  - `AssertVisibleHandler`：复用 `ElementResolver` 的 `found` / `visible` 状态，支持 `ASSERT_VISIBLE` 和 `ASSERT_NOT_VISIBLE`。
- `DefaultTestOrchestrator` 默认装配新增断言 handler，并把 `ASSERT_TEXT` / `ASSERT_VISIBLE` / `ASSERT_NOT_VISIBLE` 分发到 assertion 链路。
- `DefaultDslValidator` 增加元素断言校验：
  - `ASSERT_TEXT` 必须提供 `target` 和 `expected`。
  - `ASSERT_VISIBLE` / `ASSERT_NOT_VISIBLE` 必须提供 `target`。
- `config/smoke/core-platform-smoke.yml` 扩展真实 Edge smoke：
  - data URL 页面新增 `#headline` 和隐藏的 `#hidden-panel`。
  - 新增 `assert-headline-visible ASSERT_VISIBLE`。
  - 新增 `assert-headline-text ASSERT_TEXT`。
  - 新增 `assert-panel-hidden ASSERT_NOT_VISIBLE`。
- 新增/扩展单元测试覆盖断言 handler 分发、文本断言失败、编排器断言分发、DSL 元素断言校验，以及 `PageController` 接口变更后的测试桩。

## 修改文件
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/assertion-engine/pom.xml`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertTextHandler.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertVisibleHandler.java`
- `libs/assertion-engine/src/test/java/com/example/webtest/assertion/engine/DefaultAssertionEngineTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/locator-engine/src/test/java/com/example/webtest/locator/resolver/DefaultElementResolverTest.java`
- `libs/wait-engine/src/test/java/com/example/webtest/wait/engine/DefaultWaitEngineTest.java`
- `config/smoke/core-platform-smoke.yml`
- `memory.txt`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/locator-engine,libs/assertion-engine,libs/dsl-parser,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `assert-headline-visible ASSERT_VISIBLE SUCCESS`
  - `assert-headline-text ASSERT_TEXT SUCCESS`
  - `assert-panel-hidden ASSERT_NOT_VISIBLE SUCCESS`
  - `fill-search FILL SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `ASSERT_TEXT` / `ASSERT_TITLE` / `ASSERT_URL` 当前仍是精确字符串比较，尚未支持 contains、regex、glob、大小写/空白归一化或 URL 归一化。
- `ASSERT_VISIBLE` / `ASSERT_NOT_VISIBLE` 当前直接依赖 `ElementResolver` 的一次性状态，不带等待语义；需要等待时仍应显式使用 `WAIT_FOR_VISIBLE` / `WAIT_FOR_HIDDEN`。
- `ASSERT_VALUE` / `ASSERT_ATTR` / `ASSERT_ENABLED` / `ASSERT_DISABLED` / `ASSERT_DB` / `ASSERT_SCREENSHOT` 等仍未实现。
- `DefaultPageController.elementText` 当前读取 `innerText || textContent || ""`，对表单 value 的断言应后续用独立 `ASSERT_VALUE`。
- `DefaultTestOrchestrator` 仍内联处理 `GOTO`、`REFRESH`、`SCREENSHOT`；`SCREENSHOT` 尚未迁移到 `artifact-engine`。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 优先实现 `ASSERT_VALUE` / `ASSERT_ATTR`，补齐常用 DOM 断言能力。
- 或开始抽离 `artifact-engine`，把 `SCREENSHOT` 从 `DefaultTestOrchestrator` 迁移出去，减少编排器业务细节。
- 后续可引入统一断言匹配策略对象，覆盖 exact / contains / regex / glob / normalized URL / normalized text。

## 下次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 11 章断言模块设计、第 12 章 Artifact 模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 13 章 assertion-engine 骨架、第 14 章 artifact-engine 骨架、第 22 章编排器接入示例。

## 2026-04-16 assertion-engine value/attribute 断言扩展记录

## 本次任务
- 继续扩展 `assertion-engine`，实现常用 DOM 断言 `ASSERT_VALUE` / `ASSERT_ATTR`，并接入默认编排链路和真实 Edge DSL smoke。

## 完成内容
- `browser-core` 扩展 `PageController`：新增 `elementValue` 和 `elementAttribute`，通过 CDP `Runtime.evaluate` 读取 DOM 元素 value 与 attribute。
- `assertion-engine` 新增 `AssertValueHandler` 和 `AssertAttrHandler`：复用 `ElementResolver` 定位元素，再读取 DOM 值并与 DSL `expected` 精确比较。
- `DefaultTestOrchestrator` 默认装配新增断言 handler，并把 `ASSERT_VALUE` / `ASSERT_ATTR` 分发到 assertion 链路。
- `DefaultDslValidator` 增加 DOM 断言校验：`ASSERT_VALUE` 必须提供 `target` 和 `expected`；`ASSERT_ATTR` 必须提供 `target`、作为属性名的 `value` 和 `expected`。
- `config/smoke/core-platform-smoke.yml` 扩展真实 Edge smoke：新增 `assert-search-value ASSERT_VALUE` 和 `assert-search-label ASSERT_ATTR`。
- 新增/扩展单元测试覆盖 value/attribute handler 分发、编排器分发、DSL 属性断言校验，以及 `PageController` 接口变更后的测试桩。

## 修改文件
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertValueHandler.java`
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertAttrHandler.java`
- `libs/assertion-engine/src/test/java/com/example/webtest/assertion/engine/DefaultAssertionEngineTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/locator-engine/src/test/java/com/example/webtest/locator/resolver/DefaultElementResolverTest.java`
- `libs/wait-engine/src/test/java/com/example/webtest/wait/engine/DefaultWaitEngineTest.java`
- `config/smoke/core-platform-smoke.yml`
- `memory.txt`
- `01_dev_progress.md`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/locator-engine,libs/assertion-engine,libs/dsl-parser,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `ASSERT_TEXT` / `ASSERT_VALUE` / `ASSERT_ATTR` / `ASSERT_TITLE` / `ASSERT_URL` 当前仍是精确字符串比较，尚未支持 contains、regex、glob、大小写/空白归一化或 URL 归一化。
- `ASSERT_ATTR` 当前约定 DSL `value` 字段表示属性名；后续如果 DSL 语义扩展，可迁移到更明确的 `extra.attribute` 或专用字段。
- `ASSERT_ENABLED` / `ASSERT_DISABLED` / `ASSERT_DB` / `ASSERT_SCREENSHOT` 等仍未实现。
- `DefaultTestOrchestrator` 仍内联处理 `GOTO`、`REFRESH`、`SCREENSHOT`；`SCREENSHOT` 尚未迁移到 `artifact-engine`。
- 设计目标仍是 Java 21，但当前环境继续按既有决策使用 JDK 17 / `maven.compiler.release=17`。

## 下一步
- 优先开始抽离 `artifact-engine`，把 `SCREENSHOT` 从 `DefaultTestOrchestrator` 迁移出去，减少编排器业务细节。
- 或继续补齐断言能力，优先实现 `ASSERT_ENABLED` / `ASSERT_DISABLED`。
- 后续可引入统一断言匹配策略对象，覆盖 exact / contains / regex / glob / normalized URL / normalized text。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 11 章断言模块设计、第 12 章 Artifact 模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 13 章 assertion-engine 骨架、第 14 章 artifact-engine 骨架、第 22 章编排器接入示例。
## 2026-04-16 artifact-engine screenshot 抽离记录

## 本次任务
- 开始抽离 `artifact-engine`，把显式 `SCREENSHOT` 产物写入职责从 `DefaultTestOrchestrator` 迁移到 artifact 模块，减少编排器里的业务细节。

## 完成内容
- `artifact-engine` 新增最小产物模型与采集接口：
  - `ArtifactRef`：记录产物类型、路径、content type 和创建时间。
  - `ArtifactCollector`：提供 `captureScreenshot(outputDir, artifactName, context)`。
  - `DefaultArtifactCollector`：通过 `PageController.screenshot` 截图，并写入 `${outputDir}/${artifactName}.png`。
- `artifact-engine` 补充 `common-core` 与测试依赖，截图写入失败时统一抛出 `ACTION_EXECUTION_FAILED`。
- `DefaultTestOrchestrator` 默认装配 `DefaultArtifactCollector`，`SCREENSHOT` 分支改为调用 artifact 链路并把返回的 `ArtifactRef.path` 写入 `StepExecutionRecord.artifactPath`。
- 保持现有 DSL、step record 和 core-platform 输出行为不变：`capture-page SCREENSHOT SUCCESS artifact=...capture-page.png`。
- 新增 `DefaultArtifactCollectorTest` 覆盖截图文件写入和 `ArtifactRef` 返回值。

## 修改文件
- `libs/artifact-engine/pom.xml`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/model/ArtifactRef.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/ArtifactCollector.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/artifact-engine,libs/execution-engine,apps/core-platform -am test`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `ArtifactCollector` 当前只覆盖显式 `SCREENSHOT`，尚未接入 before/after step、失败截图、DOM dump、console/network dump。
- `ArtifactRef` 当前还没有接入 `StepExecutionRecord` 的多产物列表；执行结果仍沿用单个 `artifactPath` 字段。
- 截图文件名仍沿用 step id 拼接 `${stepId}.png`，尚未引入统一 artifact 命名策略、目录分层或文件名安全归一化。
- `DefaultTestOrchestrator` 仍内联处理 `GOTO` / `REFRESH`，后续可继续按模块边界抽离。

## 下一步
- 优先扩展 `artifact-engine` 的生命周期能力：失败时按 `ReportPolicy.screenshotOnFailure` 或 `FailurePolicy.SCREENSHOT_*` 采集失败截图。
- 或补齐 `ArtifactRef` 到报告模型的多产物列表，为后续 HTML/JSON 报告打基础。
- 也可以继续补齐断言能力，优先实现 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 14 章 artifact-engine 骨架、第 15 章 report-engine 骨架、第 22 章编排器接入示例。

## 2026-04-17 report-engine 最小 JSON 报告接入记录

## 本次任务
- 按上一轮建议，优先实现最小 `report-engine`：读取执行步骤记录中的多产物列表，生成 JSON 报告清单，并保持现有 core-platform smoke 控制台输出不变。

## 完成内容
- `report-engine` 新增最小报告接口与实现：
  - `ReportEngine`：提供 `generateRunReport(context, outputDir, stepRecords)`。
  - `DefaultReportEngine`：写出 `${outputDir}/report.json`，包含 `runId`、`outputDir`、每个 step 的状态、消息、耗时、兼容 `artifactPath` 以及完整 `artifacts` 列表。
  - `ReportStepRecord`：作为 report 模块内的 step DTO，避免 `report-engine` 反向依赖 `execution-engine` 造成 Maven 循环依赖。
- `RunResult` 新增 `reportPath`，用于记录本次运行生成的报告文件。
- `DefaultTestOrchestrator` 默认装配 `DefaultReportEngine`，run 结束后把 `StepExecutionRecord` 映射为 `ReportStepRecord` 并生成 `report.json`。
- 保持现有 core-platform smoke 控制台逐步输出不变；报告文件新增写入 `runs/dsl-smoke/report.json`。
- 新增 `DefaultReportEngineTest`，覆盖 JSON 报告写出、step 状态、耗时和 artifact 列表序列化。
- 扩展 `DefaultTestOrchestratorTest`，覆盖 `RunResult.reportPath`，并让未显式设置输出目录的测试改用 JUnit 临时目录，避免测试生成 `libs/execution-engine/runs/`。

## 修改文件
- `libs/report-engine/pom.xml`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/model/ReportStepRecord.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`

## 2026-04-17 HTML 报告键盘导航增强记录

## 本次任务
- 继续增强 `report-engine` 生成的 `report.html` 可读性与交互能力，在既有失败高亮、状态筛选、step details、artifact 预览、慢步骤摘要基础上，补充键盘导航能力。

## 完成内容
- `report.html` 新增键盘提示区：`f` 跳转第一个失败 step，`n` 跳转下一个失败 step，`p` 跳转上一个失败 step，`s` 跳转最慢 step。
- 内联脚本新增失败 step 游标、慢 step 定位、详情自动展开和 `history.replaceState` 锚点同步。
- step 行新增 `:target` 视觉高亮，配合失败导航和慢步骤摘要链接定位当前 step。
- 保持既有兼容性：`report.json` 结构不变，`generateRunReport(...)` 返回值仍是 `report.json`，`RunResult.reportPath` 仍指向 JSON，core-platform 控制台输出不额外打印 HTML 路径。
- 扩展 `DefaultReportEngineTest`，覆盖键盘提示、失败导航脚本、慢步骤快捷跳转脚本。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `00_project_index.md`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- report-engine 定向测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- report/execution/core-platform 链路测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过：在 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 smoke 输出目录 `D:\txt\edge_self_test\runs\dsl-smoke` 包含 `report.json`、`report.html`、`capture-page.png`；`report.html` 已确认包含 `Keyboard:`、`Slowest steps` 和状态筛选计数。
- 复查未发现带 `webtest-edge-*` 或 `remote-debugging-port` 的本项目 Edge 调试残留进程。

## 已知问题
- HTML 报告仍是单页静态报告；键盘导航只在浏览器端运行，尚未实现独立报告索引页。
- 慢步骤摘要固定最多 3 条，尚未提供阈值配置或 top N 配置。
- 非图片 artifact 仍无专门预览；`RunResult.reportPath` 仍指向 `report.json`。

## 下一步
- 可继续生成独立报告索引页，用于从 `runs/` 入口查看最近 run。
- 或扩展 artifact 生命周期能力：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `memory.txt` 最后一条接手记录。
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunResult.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 控制台输出保持兼容，包含：
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 新增报告文件：`D:\txt\edge_self_test\runs\dsl-smoke\report.json`，其中 `capture-page` step 的 `artifacts[0]` 指向截图产物。
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- 当前报告是最小 JSON 清单，尚未实现 HTML 报告、聚合摘要、失败高亮、相对路径、报告资源复制或 artifact 链接规范化。
- `ReportStepRecord` 是 report 模块 DTO；执行引擎当前在 run 结束时做一次映射，后续如果抽出共享执行结果模型，可再减少重复字段。
- `RunResult.reportPath` 已有，但 core-platform 控制台暂不打印该字段，以保持现有 smoke 输出不变。
- `ArtifactRef` 仍只包含 type/path/contentType/createdAt，尚未包含 artifact 名称、生命周期阶段、step id、相对路径或错误信息等报告友好字段。

## 下一步
- 优先增强报告模型：生成 summary（total/passed/failed/skipped/duration）并在 JSON 中使用相对 artifact 路径，便于后续 HTML 报告和跨机器查看。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 15 章 report-engine 骨架、第 17/22 章执行结果与编排器接入示例。


## 2026-04-17 最小 HTML 报告记录

## 本次任务
- 先按用户要求提交并推送上一轮改动，然后继续下一步：基于现有 `report.json` 数据实现最小 HTML 报告。

## 完成内容
- 已提交并推送上一轮改动：`e6b37a5 Add assertion artifacts and reporting flow` -> `origin/master`。
- `DefaultReportEngine` 现在在生成 `${outputDir}/report.json` 的同时生成 `${outputDir}/report.html`。
- HTML 报告复用同一份 report 数据，展示 runId、startedAt、finishedAt、summary 指标、steps 表格、状态、耗时、message 和 artifact 链接。
- `generateRunReport(...)` 返回值仍为 `report.json` 路径，保持 `RunResult.reportPath`、core-platform 控制台输出和既有 JSON 结构兼容。
- 扩展 `DefaultReportEngineTest`，覆盖 `report.html` 文件存在、runId、summary、step/action 和 artifact 链接内容。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`

## 2026-04-17 HTML 报告慢步骤摘要与筛选计数增强记录

## 本次任务
- 按“继续下一步”要求，沿上一轮 HTML 报告可读性增强继续推进，优先补齐 top N 慢步骤摘要和状态筛选计数，保持 `report.json`、`RunResult.reportPath` 和 core-platform 控制台输出兼容。

## 完成内容
- `DefaultReportEngine` 生成的 `report.html` 新增 `Slowest steps` 摘要区，按 `durationMs` 倒序列出最多 3 个正耗时 step，并链接到对应 step 行锚点。
- 状态筛选按钮现在显示计数：`All (n)`、`Success (n)`、`Failed (n)`、`Skipped (n)`，继续复用原有浏览器端 `data-filter` 筛选逻辑。
- 保留上一轮能力：失败 step 高亮、失败提示快速跳转、step details 折叠、artifact 元信息和图片预览、原始顺序/慢步骤排序。
- 扩展 `DefaultReportEngineTest` 覆盖筛选计数和慢步骤摘要链接。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前验证状态
- 相关模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- report/execution/core-platform 链路测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过：在 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 smoke 输出目录 `D:\txt\edge_self_test\runs\dsl-smoke` 包含 `report.json`、`report.html`、`capture-page.png`；`report.html` 已确认包含 `Slowest steps` 和状态筛选计数。
- 复查未发现带 `webtest-edge-*` 或 `remote-debugging-port` 的本项目 Edge 调试进程残留。

## 已知问题
- HTML 报告仍是单页面静态报告；筛选和排序只在浏览器端运行。
- 慢步骤摘要当前固定最多 3 条，尚未支持阈值配置、top N 配置或独立慢步骤页面。
- 非图片 artifact 仍只展示链接和元信息，尚无 DOM dump、console/network dump 的专门预览。
- `RunResult.reportPath` 仍指向 `report.json`，HTML 路径仍按约定从 `outputDir/report.html` 获取。

## 下一步
- 可继续增强 HTML 报告键盘导航和失败步骤导航区，或生成独立报告索引页。
- 也可转向 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 DSL smoke 输出目录包含：
  - `D:\txt\edge_self_test\runs\dsl-smoke\report.json`
  - `D:\txt\edge_self_test\runs\dsl-smoke\report.html`
  - `D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- HTML 报告仍是最小可读清单，尚未做 artifact 图片预览、失败步骤视觉高亮增强、资源复制、报告索引页或跨目录 artifact 链接规范化。
- `summary.skipped` 已预留统计，但当前执行引擎尚未产生 `SKIPPED` 状态。
- `RunResult.reportPath` 当前仍指向 `report.json`，HTML 路径暂未进入执行结果模型；调用方可按约定从 `outputDir/report.html` 获取。

## 下一步
- 优先增强 HTML 报告可读性：失败态呈现、artifact 截图预览、打开截图链接、基础样式整理。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 15 章 report-engine 骨架、第 17/22 章执行结果与编排器接入示例。

## 2026-04-17 run 生命周期时间与报告 duration 收尾记录

## 本次任务
- 按上一轮建议继续增强最小 `report-engine` 报告模型：引入 run startedAt/finishedAt，使 `summary.durationMs` 表达真实 run wall-clock 耗时，而不是 step duration 求和。

## 完成内容
- `RunResult` 新增 `startedAt` / `finishedAt`，记录执行引擎一次 run 的生命周期时间。
- `DefaultTestOrchestrator` 在 step 执行前后记录 run 级时间，并将其写入 `RunResult`。
- `ReportEngine` 扩展 `generateRunReport(context, outputDir, runStartedAt, runFinishedAt, stepRecords)`；保留旧签名 default 方法，避免已有调用方必须一次性迁移。
- `DefaultReportEngine` 在 `report.json` 顶层写出 `startedAt` / `finishedAt`，并在二者可用时用 run wall-clock duration 填充 `summary.durationMs`；缺少 run 时间时仍回退到 step duration 求和。
- 扩展 `DefaultReportEngineTest` 覆盖顶层 run 时间与 wall-clock summary duration。
- 扩展 `DefaultTestOrchestratorTest` 覆盖 `RunResult.startedAt` / `RunResult.finishedAt`。

## 修改文件
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunResult.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 控制台输出保持兼容，包含：
  - `open-smoke-page GOTO SUCCESS`
  - `assert-headline-visible ASSERT_VISIBLE SUCCESS`
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 新生成的 `runs/dsl-smoke/report.json` 顶层包含 `startedAt` / `finishedAt`，`summary.durationMs` 为 run wall-clock 耗时，`capture-page` step 的 `artifactPath` / `artifacts[0].path` 仍为 `capture-page.png`。
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `summary.skipped` 已预留统计，但当前执行引擎尚未产生 `SKIPPED` 状态。
- 报告仍是最小 JSON 清单，尚未实现 HTML 报告、失败高亮、资源复制、报告链接规范化或聚合摘要页面。
- 相对路径只在 artifact 位于 `outputDir` 下时生效；跨目录 artifact 仍会保留原路径。

## 下一步
- 优先引入最小 HTML 报告，读取当前 `report.json` 已具备的 run 时间、summary、steps 与 artifacts。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 15 章 report-engine 骨架、第 17/22 章执行结果与编排器接入示例。


## 2026-04-17 run 生命周期时间与报告 duration 修正记录

## 本次任务
- 按上一轮建议继续增强最小 `report-engine` 报告模型：引入 run startedAt/finishedAt，使 `summary.durationMs` 表达真实 run wall-clock 耗时，而不是 step duration 求和。

## 完成内容
- `RunResult` 新增 `startedAt` / `finishedAt`，记录执行引擎一次 run 的生命周期时间。
- `DefaultTestOrchestrator` 在 step 执行前后记录 run 级时间，并将其写入 `RunResult`。
- `ReportEngine` 扩展 `generateRunReport(context, outputDir, runStartedAt, runFinishedAt, stepRecords)`；保留旧签名 default 方法，避免已有调用方必须一次性迁移。
- `DefaultReportEngine` 在 `report.json` 顶层写出 `startedAt` / `finishedAt`，并在二者可用时用 run wall-clock duration 填充 `summary.durationMs`；缺少 run 时间时仍回退到 step duration 求和。
- 扩展 `DefaultReportEngineTest` 覆盖顶层 run 时间与 wall-clock summary duration。
- 扩展 `DefaultTestOrchestratorTest` 覆盖 `RunResult.startedAt` / `RunResult.finishedAt`。

## 修改文件
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunResult.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- 待本轮收尾继续执行全量 package / install 与 core-platform DSL smoke。

## 已知问题
- `summary.skipped` 已预留统计，但当前执行引擎尚未产生 `SKIPPED` 状态。
- 报告仍是最小 JSON 清单，尚未实现 HTML 报告、失败高亮、资源复制、报告链接规范化或聚合摘要页面。
- 相对路径只在 artifact 位于 `outputDir` 下时生效；跨目录 artifact 仍会保留原路径。

## 下一步
- 优先引入最小 HTML 报告，读取当前 `report.json` 已具备的 run 时间、summary、steps 与 artifacts。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 15 章 report-engine 骨架、第 17/22 章执行结果与编排器接入示例。

## 2026-04-16 artifact-engine failure screenshot 生命周期记录

## 本次任务
- 继续扩展 `artifact-engine` 生命周期能力，在步骤失败时按 `ReportPolicy.screenshotOnFailure` 或单步 `FailurePolicy.SCREENSHOT_*` 采集失败截图。

## 完成内容
- `DefaultTestOrchestrator` 的失败分支已接入失败截图采集：失败时调用 `ArtifactCollector.captureScreenshot(outputDir, stepId + "-failure", context)`，并把返回的 `ArtifactRef.path` 写入 `StepExecutionRecord.artifactPath`。
- 默认策略沿用 `ReportPolicy.screenshotOnFailure=true`：未配置 `reportPolicy` 时会采集失败截图；显式设置 `screenshotOnFailure=false` 时不采集。
- 单步 `FailurePolicy.SCREENSHOT_AND_STOP` / `SCREENSHOT_AND_CONTINUE` 可强制采集失败截图；`CONTINUE` / `SCREENSHOT_AND_CONTINUE` 可覆盖默认停止行为，让主步骤继续执行。
- 失败截图采集异常不会覆盖原始步骤失败原因，只会把截图采集失败信息追加到 `StepExecutionRecord.message`。
- 扩展 `DefaultTestOrchestratorTest`，覆盖默认失败截图、全局关闭失败截图、单步 `SCREENSHOT_AND_CONTINUE` 强制截图并继续执行。

## 修改文件
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/artifact-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出包含：
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- 当前仍使用 `StepExecutionRecord.artifactPath` 单字段记录产物；失败截图和显式截图不会同时存在于同一条记录的多产物列表中。
- `ArtifactCollector` 仍只支持截图产物，尚未实现 DOM dump、console/network dump、before/after step 钩子。
- 失败截图文件名当前约定为 `${stepId}-failure.png`，尚未引入统一 artifact 命名策略、目录分层或文件名安全归一化。
- `DefaultTestOrchestrator` 仍内联处理 `GOTO` / `REFRESH`；后续可继续按模块边界抽离。

## 下一步
- 优先把 `ArtifactRef` 接入报告模型的多产物列表，为后续 HTML/JSON 报告打基础。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 14 章 artifact-engine 骨架、第 15 章 report-engine 骨架、第 22 章编排器接入示例。

## 2026-04-17 ArtifactRef 多产物列表接入记录

## 本次任务
- 按上一轮建议，优先把 `ArtifactRef` 接入执行结果模型的多产物列表，为后续 HTML/JSON 报告和多 artifact 输出打基础。

## 完成内容
- `StepExecutionRecord` 新增 `List<ArtifactRef> artifacts`，并提供 `getArtifacts` / `setArtifacts` / `addArtifact`。
- 保留旧的 `artifactPath` 字段作为兼容入口：新增 artifact 时会同步首个产物路径到 `artifactPath`，因此现有 core-platform 输出格式仍保持 `artifact=...`。
- `DefaultTestOrchestrator` 的显式 `SCREENSHOT` 和失败截图分支改为记录完整 `ArtifactRef`，不再只写单个路径。
- 扩展 `DefaultTestOrchestratorTest`，覆盖显式截图、默认失败截图、关闭失败截图、单步强制失败截图继续执行时的 `artifacts` 列表行为。

## 修改文件
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/StepExecutionRecord.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/artifact-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 输出保持兼容，包含：
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `artifactPath` 与 `artifacts` 当前是兼容并存模型；后续报告模块应优先读取 `artifacts`，`artifactPath` 只作为旧调用方兼容字段。
- 当前一个步骤虽然已支持多个 `ArtifactRef`，但现有执行链路仍只会在显式截图或失败截图场景各追加一个截图产物；DOM dump、console/network dump、before/after step 钩子尚未实现。
- `ArtifactRef` 仍只包含 type/path/contentType/createdAt，尚未包含 artifact 名称、生命周期阶段、step id、相对路径或错误信息等报告友好字段。
- 截图文件名仍沿用 `${stepId}.png` 和 `${stepId}-failure.png`，尚未引入统一 artifact 命名策略、目录分层或文件名安全归一化。

## 下一步
- 优先实现最小 `report-engine`：读取 `RunResult.stepRecords[*].artifacts`，生成 JSON 或文本报告清单，并保持现有 smoke 输出不变。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 14 章 artifact-engine 骨架、第 15 章 report-engine 骨架、第 22 章编排器接入示例。
## 2026-04-17 report-engine summary 与相对 artifact 路径记录

## 本次任务
- 按上一轮建议增强最小 `report-engine` JSON 报告：新增运行 summary，并将输出目录内的 artifact 路径写为相对路径，便于后续 HTML 报告和跨机器查看。

## 完成内容
- `DefaultReportEngine` 在 `report.json` 顶层新增 `summary`，包含 `total`、`passed`、`failed`、`skipped`、`durationMs`。
- `summary.durationMs` 当前按已有 step 记录的 `startedAt` / `finishedAt` duration 求和，避免引入新的 run 生命周期字段。
- `steps[*].artifactPath` 与 `steps[*].artifacts[*].path` 在 artifact 位于 `outputDir` 下时写为相对路径；不在输出目录下或无法 relativize 时保留原路径。
- 保持 `outputDir` 与 core-platform 控制台输出不变；控制台仍按旧兼容字段打印绝对 `artifact=...`。
- 扩展 `DefaultReportEngineTest`，覆盖 summary 统计、step duration 和相对 artifact 路径序列化。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 控制台输出保持兼容，包含：
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 新生成的 `runs/dsl-smoke/report.json` 顶层包含 `summary`，且 `capture-page` step 的 `artifactPath` / `artifacts[0].path` 均为 `capture-page.png`。
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `summary.durationMs` 当前是 step duration 求和，不是 run wall-clock 总耗时；后续如需要真实运行总耗时，应在执行结果模型中记录 run startedAt/finishedAt。
- `summary.skipped` 已预留统计，但当前执行引擎尚未产生 `SKIPPED` 状态。
- 报告仍是最小 JSON 清单，尚未实现 HTML 报告、失败高亮、资源复制、报告链接规范化或聚合摘要页面。
- 相对路径只在 artifact 位于 `outputDir` 下时生效；跨目录 artifact 仍会保留原路径。

## 下一步
- 优先继续增强报告模型：引入 HTML 报告或 run startedAt/finishedAt，使 summary duration 表达更准确。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 15 章 report-engine 骨架、第 17/22 章执行结果与编排器接入示例。

## 2026-04-17 run 生命周期时间与报告 duration 最终收尾记录

## 本次任务
- 按上一轮建议继续增强最小 `report-engine` 报告模型：引入 run startedAt/finishedAt，使 `summary.durationMs` 表达真实 run wall-clock 耗时，而不是 step duration 求和。

## 完成内容
- `RunResult` 新增 `startedAt` / `finishedAt`，记录执行引擎一次 run 的生命周期时间。
- `DefaultTestOrchestrator` 在 step 执行前后记录 run 级时间，并将其写入 `RunResult`。
- `ReportEngine` 扩展 `generateRunReport(context, outputDir, runStartedAt, runFinishedAt, stepRecords)`；保留旧签名 default 方法，避免已有调用方必须一次性迁移。
- `DefaultReportEngine` 在 `report.json` 顶层写出 `startedAt` / `finishedAt`，并在二者可用时用 run wall-clock duration 填充 `summary.durationMs`；缺少 run 时间时仍回退到 step duration 求和。
- 扩展 `DefaultReportEngineTest` 覆盖顶层 run 时间与 wall-clock summary duration。
- 扩展 `DefaultTestOrchestratorTest` 覆盖 `RunResult.startedAt` / `RunResult.finishedAt`。

## 修改文件
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/RunResult.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 受影响模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过。运行方式：
  - 在仓库根目录先执行 install。
  - 再进入 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- smoke 控制台输出保持兼容，包含：
  - `open-smoke-page GOTO SUCCESS`
  - `assert-headline-visible ASSERT_VISIBLE SUCCESS`
  - `assert-search-value ASSERT_VALUE SUCCESS`
  - `assert-search-label ASSERT_ATTR SUCCESS`
  - `click-submit CLICK SUCCESS`
  - `assert-click-title ASSERT_TITLE SUCCESS`
  - `capture-page SCREENSHOT SUCCESS artifact=D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 新生成的 `runs/dsl-smoke/report.json` 顶层包含 `startedAt` / `finishedAt`，`summary.durationMs` 为 run wall-clock 耗时，`capture-page` step 的 `artifactPath` / `artifacts[0].path` 仍为 `capture-page.png`。
- 复查本项目 Edge 调试进程，无 `webtest-edge-*` 或 `remote-debugging-port` 残留。

## 已知问题
- `summary.skipped` 已预留统计，但当前执行引擎尚未产生 `SKIPPED` 状态。
- 报告仍是最小 JSON 清单，尚未实现 HTML 报告、失败高亮、资源复制、报告链接规范化或聚合摘要页面。
- 相对路径只在 artifact 位于 `outputDir` 下时生效；跨目录 artifact 仍会保留原路径。

## 下一步
- 优先引入最小 HTML 报告，读取当前 `report.json` 已具备的 run 时间、summary、steps 与 artifacts。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `01_dev_progress.md` 最新一节。
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 12 章 Artifact 与报告模块设计。
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 15 章 report-engine 骨架、第 17/22 章执行结果与编排器接入示例。

## 2026-04-17 最新进度同步与接手提醒

## 本次任务
- 按用户要求同步修正进度和接手记忆，避免后续只读取文件末尾时误判当前状态。

## 当前事实
- 当前最新提交：`f98b9c2 Add minimal HTML run report`。
- 当前分支：`master`，已与 `origin/master` 对齐。
- 工作区在同步前为干净状态。
- `01_dev_progress.md` 中已有 `2026-04-17 最小 HTML 报告记录`，但文件后续又追加过较早主题记录；下一次接手必须以本节和 `memory.txt` 最后一条为准。

## 已完成的最新功能
- `DefaultReportEngine` 在生成 `${outputDir}/report.json` 的同时生成 `${outputDir}/report.html`。
- HTML 报告复用同一份 report 数据，展示 runId、startedAt、finishedAt、summary 指标、steps 表格、状态、耗时、message 和 artifact 链接。
- `generateRunReport(...)` 返回值仍保持 `report.json` 路径，`RunResult.reportPath`、core-platform 控制台输出和既有 JSON 结构保持兼容。
- `DefaultReportEngineTest` 已覆盖 `report.html` 文件存在、runId、summary、step/action 和 artifact 链接内容。

## 当前验证状态
- 已通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- 已通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- 已通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- 已通过 core-platform DSL smoke，输出目录包含：
  - `D:\txt\edge_self_test\runs\dsl-smoke\report.json`
  - `D:\txt\edge_self_test\runs\dsl-smoke\report.html`
  - `D:\txt\edge_self_test\runs\dsl-smoke\capture-page.png`
- 复查未发现带 `webtest-edge-*` 或 `remote-debugging-port` 的本项目 Edge 残留进程。

## 已知问题
- HTML 报告仍是最小可读清单，尚未做失败步骤视觉高亮增强、artifact 图片预览、资源复制、报告索引页或跨目录 artifact 链接规范化。
- `RunResult.reportPath` 当前仍指向 `report.json`，HTML 路径暂未进入执行结果模型；调用方可按约定从 `outputDir/report.html` 获取。
- `summary.skipped` 已预留统计，但当前执行引擎尚未产生 `SKIPPED` 状态。

## 下一步
- 优先增强 HTML 报告可读性：失败态呈现、artifact 截图预览、打开截图链接、基础样式整理。
- 或继续扩展 artifact 生命周期：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力，补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `memory.txt` 最后一条接手记录。
- `01_dev_progress.md` 本节。
- `01_dev_progress.md` 中的 `2026-04-17 最小 HTML 报告记录`。
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`

## 2026-04-17 HTML 报告失败态与截图预览增强记录

## 本次任务
- 按最新接手记录继续增强 `report-engine` 的 HTML 报告可读性，优先实现失败态呈现和 artifact 图片预览，保持 `report.json`、`RunResult.reportPath` 与 core-platform 控制台输出兼容。

## 完成内容
- `DefaultReportEngine` 生成的 `report.html` 现在会突出失败汇总指标；当存在失败步骤时，在 summary 下方显示失败提示。
- steps 表格中 `FAILED` 状态行会增加行级高亮，原有 `SUCCESS` / `FAILED` / `SKIPPED` 状态文字样式保持。
- artifact 列保留原有链接；当 artifact `contentType` 为 `image/*` 或路径扩展名为 `.png` / `.jpg` / `.jpeg` / `.gif` / `.webp` 时，会在链接下方生成图片预览。
- 扩展 `DefaultReportEngineTest`，覆盖失败指标样式、失败提示、失败行 class 与截图预览 HTML。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 相关模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过：在 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 smoke 输出目录仍为 `D:\txt\edge_self_test\runs\dsl-smoke`，包含 `report.json`、`report.html` 和 `capture-page.png`；`report.html` 中 `capture-page.png` 已生成图片预览。

## 已知问题
- HTML 报告仍是静态单页清单，尚未支持筛选、排序、折叠详情、失败步骤锚点导航或独立报告索引页。
- artifact 预览当前按 contentType 或扩展名判断图片类型；非图片 artifact 仍只显示链接。
- `RunResult.reportPath` 仍指向 `report.json`，HTML 路径仍按约定从 `outputDir/report.html` 获取。
- `summary.skipped` 仍是预留统计，当前执行引擎尚未产生 `SKIPPED` 状态。

## 下一步
- 优先继续增强 HTML 报告交互和可读性：失败步骤快速跳转、按状态筛选、message 换行/截断、artifact 详情信息展示。
- 或继续扩展 artifact 生命周期能力：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `memory.txt` 最后一条接手记录。
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`

## 2026-04-17 HTML 报告 step 详情与慢步骤增强记录

## 本次任务
- 按上一轮“继续增强 HTML 报告可读性”的建议，继续增强 `report-engine` 生成的 `report.html`，保持 `report.json`、`RunResult.reportPath` 和 core-platform 控制台输出兼容。

## 完成内容
- steps 表格新增 `Details` 折叠区，包含 stepName、startedAt、finishedAt、message 和 artifact 展示；失败步骤默认展开详情，成功步骤默认折叠。
- step 行新增 `data-index` 与 `data-duration`，并保留 `data-status`，支持浏览器端排序和筛选组合使用。
- 工具区新增 `Original order` 与 `Slowest first` 按钮，可按原始执行顺序或耗时倒序重排 step 行。
- 当前 run 中耗时最长且 duration 大于 0 的 step 会增加 `slow` class，并通过左侧强调线突出显示。
- 扩展 `DefaultReportEngineTest`，覆盖折叠详情、失败详情默认展开、慢步骤 class、排序按钮与排序脚本。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 相关模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- report/execution/core-platform 链路测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过：在 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 smoke 输出目录为 `D:\txt\edge_self_test\runs\dsl-smoke`，`report.html` 已包含 `step-details`、`Slowest first`、`data-duration`、`detail-meta` 和截图预览。
- 复查未发现带 `webtest-edge-*` 或 `remote-debugging-port` 的本项目 Edge 调试残留进程。

## 已知问题
- HTML 报告仍是单页静态报告，排序与筛选只在浏览器端运行，尚未支持键盘快捷导航或独立报告索引页。
- 慢步骤高亮当前只标记本次 run 中耗时最长的正耗时 step，尚未提供阈值配置或 top N 慢步骤列表。
- 非图片 artifact 仍只展示链接和元信息，尚未做 DOM dump、console/network dump 等类型的专门预览。
- `RunResult.reportPath` 仍指向 `report.json`，HTML 路径仍按约定从 `outputDir/report.html` 获取。

## 下一步
- 可继续增强 HTML 报告：失败步骤键盘导航、top N 慢步骤摘要、筛选计数、独立报告索引页。
- 或继续扩展 artifact 生命周期能力：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `memory.txt` 最后一条接手记录。
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
## 2026-04-17 HTML 报告交互与 artifact 详情增强记录

## 本次任务
- 按上一轮“继续增强 HTML 报告交互和可读性”的建议，继续增强 `report-engine` 生成的 `report.html`，保持 `report.json`、`RunResult.reportPath` 和 core-platform 控制台输出兼容。

## 完成内容
- `DefaultReportEngine` 生成的 HTML 报告新增状态筛选按钮：All / Success / Failed / Skipped，通过内联脚本按 `data-status` 过滤 step 行。
- 失败提示区域新增失败 step 快速跳转链接，step 行新增稳定锚点 `step-N`，方便从摘要直接定位失败步骤。
- step message 改为 `<pre class="message">` 展示，保留换行并支持长文本自动换行，避免长错误消息撑破表格。
- artifact 列新增元信息展示，包含 `type`、`contentType`、`createdAt`；图片 artifact 预览和原链接继续保留。
- 扩展 `DefaultReportEngineTest`，覆盖状态筛选按钮、失败 step 锚点、message 展示、artifact 元信息和图片预览。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 相关模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过：在 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 smoke 输出目录为 `D:\txt\edge_self_test\runs\dsl-smoke`，包含 `report.json`、`report.html` 和 `capture-page.png`；`report.html` 中已包含状态筛选按钮、artifact 元信息和截图预览。
- 复查未发现带 `webtest-edge-*` 或 `remote-debugging-port` 的本项目 Edge 调试残留进程。

## 已知问题
- HTML 报告仍是单页静态报告，筛选只在浏览器端运行，尚未支持排序、折叠详情、失败步骤键盘导航或独立报告索引页。
- 非图片 artifact 仍只展示链接和元信息，尚未做 DOM dump、console/network dump 等类型的专门预览。
- `RunResult.reportPath` 仍指向 `report.json`，HTML 路径仍按约定从 `outputDir/report.html` 获取。

## 下一步
- 优先继续增强 HTML 报告可读性：step 详情折叠、失败步骤导航区、按耗时排序或慢步骤高亮。
- 或继续扩展 artifact 生命周期能力：DOM dump、console/network dump、before/after step 钩子。
- 也可回到断言能力补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。

## 下一次建议优先阅读
- `memory.txt` 最后一条接手记录。
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
## 2026-04-17 HTML 报告索引页增强记录

## 本次任务
- 按上一轮建议继续增强 `report-engine`：生成独立报告索引页，便于从 `runs/index.html` 查看当前报告根目录下已有 run，并保持 `report.json`、`report.html`、`RunResult.reportPath` 和 core-platform 控制台输出兼容。

## 完成内容
- `DefaultReportEngine` 在生成单次 `${outputDir}/report.json` 和 `${outputDir}/report.html` 后，会同步生成或刷新父目录 `index.html`。
- 索引页会扫描报告根目录下包含 `report.json` 的子目录，列出 runId、OK/FAILED 状态、total/passed/failed/skipped/durationMs、startedAt/finishedAt，并提供 HTML / JSON 链接。
- 索引页按 `finishedAt` 倒序展示，失败 run 行会高亮；单次报告页已有的失败导航、键盘导航、慢步骤摘要、筛选计数、details、artifact 元信息和图片预览保持不变。
- 扩展 `DefaultReportEngineTest`，覆盖单次索引页生成、多 run 索引刷新、倒序展示和 report 链接。

## 修改文件
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## 当前状态
- 相关模块测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- report/execution/core-platform 链路测试通过：`mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Maven 全量构建通过：`mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Maven 本地安装通过：`mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- core-platform DSL smoke 通过：在 `apps/core-platform` 执行 `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- 最新 smoke 输出目录 `D:\txt\edge_self_test\runs\dsl-smoke` 包含 `report.json`、`report.html`、`capture-page.png`；报告根目录新增 `D:\txt\edge_self_test\runs\index.html`，已确认包含 `dsl-smoke-run`、`dsl-smoke/report.html` 和 `dsl-smoke/report.json`。

## 已知问题
- 索引页当前是静态汇总页，只扫描报告根目录的一级子目录；不支持搜索、筛选、分页、删除历史 run 或跨根目录聚合。
- 单次 HTML 报告仍是静态单页报告；非图片 artifact 仍无专门预览。
- `RunResult.reportPath` 仍指向 `report.json`，HTML 报告和索引页路径继续按约定从 outputDir / reportRoot 推导。

## 下一步
- 可继续扩展 artifact 生命周期能力：DOM dump、console/network dump、before/after step 钩子，并让报告页对这些非图片 artifact 提供专门预览。
- 或回到断言能力补齐 `ASSERT_ENABLED` / `ASSERT_DISABLED`。
- 也可继续增强报告索引页，增加搜索/筛选、历史 run 清理入口或失败 run 快速定位。

## 下一次建议优先阅读
- `memory.txt` 最后一条接手记录。
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
## 2026-04-17 failure DOM artifact lifecycle record

## Task
- Continued from the previous report-index step and extended artifact lifecycle support without changing DSL syntax or legacy console output.

## Completed
- Added `ArtifactCollector.captureDomDump(...)`.
- `DefaultArtifactCollector` now writes DOM snapshots as `.html` files using `PageController.getHtml(context)`, with artifact metadata `type=dom` and `contentType=text/html`.
- `DefaultTestOrchestrator` now captures failure artifacts through a combined path:
  - screenshots follow existing `ReportPolicy.screenshotOnFailure` and `FailurePolicy.SCREENSHOT_*` rules;
  - DOM dumps follow `ReportPolicy.saveDomOnFailure`, defaulting to enabled when report policy is absent.
- If `screenshotOnFailure=false` is set alone, failure DOM artifacts are still captured. To suppress all failure artifacts, set both `screenshotOnFailure=false` and `saveDomOnFailure=false`.
- `DefaultReportEngine` now renders HTML artifacts with a sandboxed iframe preview, so failure DOM dumps are visible from the step details. Image artifact previews, metadata, status filters, slow-step summary, keyboard navigation, and report index generation remain intact.

## Modified Files
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/ArtifactCollector.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, with `report.json`, `report.html`, and `capture-page.png`; parent `D:\txt\edge_self_test\runs\index.html` is refreshed.

## Known Gaps
- Console/network dump artifacts are not implemented yet.
- Before/after step artifact hooks are not implemented yet.
- Report preview is now specialized for image and HTML artifacts; text/json previews for future console/network dumps still need a renderer.

## Next Step
- Prefer extending artifact lifecycle with console/network dump artifacts and report previews for text/json outputs.
- Alternative: improve report index search/filtering or implement `ASSERT_ENABLED` / `ASSERT_DISABLED`.

## 2026-04-17 failure console artifact lifecycle record

## Task
- Continued the artifact lifecycle work by adding failure-time console dump artifacts and report previews for text/json artifacts, without changing DSL step syntax or existing `report.json` / `RunResult.reportPath` compatibility.

## Completed
- Added `PageController.startConsoleCapture(...)` and `PageController.consoleEvents(...)` default methods.
- `DefaultPageController` now enables CDP `Runtime.consoleAPICalled` capture at run start and stores console level/message/time as `ConsoleEvent` records.
- Added `ArtifactCollector.captureConsoleDump(...)`.
- `DefaultArtifactCollector` now writes console dumps as `${artifactName}.json`, with metadata `type=console` and `contentType=application/json`.
- Added `ReportPolicy.saveConsoleOnFailure`, defaulting to enabled. Missing `ReportPolicy` now captures screenshot, DOM, and console artifacts on failure. To suppress all failure artifacts, set `screenshotOnFailure=false`, `saveDomOnFailure=false`, and `saveConsoleOnFailure=false`.
- `DefaultTestOrchestrator` starts console capture before executing steps when console failure artifacts are enabled, and adds failure console dumps through the same failure artifact path as screenshots and DOM dumps.
- `DefaultReportEngine` now embeds bounded previews for text/json artifacts in `report.html` using `<pre class="artifact-text-preview">`; image previews, HTML iframe previews, artifact metadata, and report index generation remain intact.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/artifact-engine/pom.xml`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/ArtifactCollector.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest successful smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, with `report.json`, `report.html`, and `capture-page.png`; parent `D:\txt\edge_self_test\runs\index.html` is refreshed.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Network dump artifacts are not implemented yet.
- Before/after step artifact hooks are not implemented yet.
- Console capture starts at orchestrator run start; console messages emitted before `Runtime.enable` are outside the current capture window.
- Text/json previews are embedded with a fixed 12000 character cap; large future artifacts may need downloadable-only or expandable rendering.

## Next Step
- Prefer extending artifact lifecycle with network dump artifacts using CDP Network events, then render JSON/text previews in the existing report preview path.
- Alternative: add before/after step artifact hooks or implement `ASSERT_ENABLED` / `ASSERT_DISABLED`.

## 2026-04-17 failure network artifact lifecycle record

## Task
- Continued the artifact lifecycle work by adding failure-time network dump artifacts through CDP Network events, reusing the existing JSON/text report preview path.

## Completed
- Added `NetworkEvent` in `browser-core`.
- Added `PageController.startNetworkCapture(...)` and `PageController.networkEvents(...)` default methods.
- `DefaultPageController` now enables CDP `Network.enable` and records `Network.requestWillBeSent`, `Network.responseReceived`, and `Network.loadingFailed` summaries.
- Added `ArtifactCollector.captureNetworkDump(...)`.
- `DefaultArtifactCollector` now writes network dumps as `${artifactName}.json`, with metadata `type=network` and `contentType=application/json`.
- Added `ReportPolicy.saveNetworkOnFailure`, defaulting to enabled.
- `DefaultTestOrchestrator` starts network capture before executing steps when network failure artifacts are enabled, and adds failure network dumps through the same failure artifact path as screenshots, DOM dumps, and console dumps.
- `DefaultReportEngine` already renders JSON/text artifact previews, so network dumps are previewed without report-engine changes.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/observer/NetworkEvent.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/ArtifactCollector.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest successful smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, with `report.json`, `report.html`, and `capture-page.png`; parent `runs/index.html` is refreshed.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Before/after step artifact hooks are not implemented yet.
- Network artifacts currently store request/response/failure summaries only; headers and bodies are not captured.
- Console/network capture starts at orchestrator run start; browser events emitted before the capture start are outside the current capture window.

## Next Step
- Prefer adding before/after step artifact hooks for explicit lifecycle collection points.
- Alternative: implement `ASSERT_ENABLED` / `ASSERT_DISABLED`, or improve report index search/filtering.

## 2026-04-17 before/after step artifact hook record

## Task
- Continued from the failure network artifact lifecycle work by adding explicit before/after step artifact hooks without changing existing default run behavior.

## Completed
- Added opt-in `ReportPolicy` flags:
  - `screenshotBeforeStep`
  - `screenshotAfterStep`
  - `saveDomBeforeStep`
  - `saveDomAfterStep`
- All four new hook flags default to `false`, so normal runs do not generate per-step artifacts unless the policy explicitly enables them.
- `DefaultTestOrchestrator` now captures before-step artifacts before the step action/assertion and after-step artifacts for both successful and failed steps.
- Hook artifact names are stable and report-friendly:
  - `${stepId}-before.png`
  - `${stepId}-before-dom.html`
  - `${stepId}-after.png`
  - `${stepId}-after-dom.html`
- Hook capture failures are appended to the current step message and do not override the primary action/assertion result.
- Existing failure artifact behavior remains separate and unchanged: missing `ReportPolicy` still enables failure screenshot, DOM, console, and network artifacts; step hooks remain opt-in only.
- Added `DefaultTestOrchestratorTest` coverage for successful before/after screenshot + DOM hooks and after-step DOM capture on failed steps when failure artifacts are disabled.

## Modified Files
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/dsl-model,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with `report.json`, `report.html`, and `capture-page.png`; parent `runs/index.html` is refreshed.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Before/after hooks currently cover screenshot and DOM only; they do not produce console/network deltas yet.
- Network artifacts still store request/response/failure summaries only; headers and bodies are not captured.

## Next Step
- Prefer adding console/network delta artifacts around step hooks.
- Alternative: implement `ASSERT_ENABLED` / `ASSERT_DISABLED`, or improve report index search/filtering.

## 2026-04-17 before/after console/network delta artifact hook record

## Task
- Continued from the before/after screenshot and DOM hook work by adding opt-in console/network delta artifacts around step hook collection points.

## Completed
- Added opt-in `ReportPolicy` flags:
  - `saveConsoleBeforeStep`
  - `saveConsoleAfterStep`
  - `saveNetworkBeforeStep`
  - `saveNetworkAfterStep`
- All four new flags default to `false`, so normal runs and existing smoke output remain unchanged unless the policy explicitly enables them.
- `ArtifactCollector` now has overloads that write console/network dumps from provided event lists. The existing context-based failure dump methods remain intact.
- `DefaultTestOrchestrator` now starts console/network capture when either failure artifacts or step hook artifacts need it.
- Step hook console/network artifacts are written as deltas:
  - before-step hooks write events accumulated since the previous hook cursor;
  - after-step hooks write events emitted during the current step when before hooks are disabled, or since the before hook when both are enabled.
- Hook artifact names are stable:
  - `${stepId}-before-console.json`
  - `${stepId}-after-console.json`
  - `${stepId}-before-network.json`
  - `${stepId}-after-network.json`
- Hook artifact failures are appended to the step message and do not override the primary action/assertion result.
- Report rendering needed no new code because console/network hook artifacts are JSON and reuse the existing text/json preview path.
- Added tests for provided-event artifact dumps and after-step console/network delta capture.

## Modified Files
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/ArtifactCollector.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `git diff --check`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with `report.json`, `report.html`, and `capture-page.png`; parent `runs/index.html` is refreshed.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` Edge process remained. The only match was the current PowerShell query command.

## Known Gaps
- Network artifacts still store request/response/failure summaries only; headers and bodies are not captured.
- Console/network capture starts at orchestrator run start; browser events emitted before capture starts remain outside the current capture window.
- Step hook console/network deltas rely on event-list cursors and do not yet expose a formal named checkpoint API from `PageController`.

## Next Step
- Prefer implementing `ASSERT_ENABLED` / `ASSERT_DISABLED` to finish the current assertion action family.
- Alternative: improve report index search/filtering, or add richer network capture with headers/body metadata.

## 2026-04-17 ASSERT_ENABLED / ASSERT_DISABLED record

## Task
- Continued from the step artifact lifecycle work by completing the `ASSERT_ENABLED` / `ASSERT_DISABLED` assertion action family.

## Completed
- Added `AssertEnabledHandler` in `assertion-engine`.
- `ElementState` / `ResolveResult` now carry a distinct `enabled` signal, separate from `actionable`.
- `DefaultPageController` sets `enabled` from disabled / `aria-disabled`, while `actionable` remains visibility plus enabled.
- `ASSERT_ENABLED` succeeds when the resolved element is found and enabled.
- `ASSERT_DISABLED` succeeds when the resolved element is found and not enabled.
- `DefaultTestOrchestrator` now wires `AssertEnabledHandler` into both default assertion engine construction paths and routes both actions through assertion execution.
- `DefaultDslValidator` now requires a target for enabled/disabled assertions.
- Added assertion-engine tests for success and failure behavior.
- Added DSL parser validation coverage for `assert_enabled` without a target.
- Extended execution-engine coverage so default orchestrator routing includes `ASSERT_ENABLED` and `ASSERT_DISABLED`.
- Updated the core smoke DSL to include an enabled input assertion and a disabled field assertion.

## Modified Files
- `libs/assertion-engine/src/main/java/com/example/webtest/assertion/handler/AssertEnabledHandler.java`
- `libs/assertion-engine/src/test/java/com/example/webtest/assertion/engine/DefaultAssertionEngineTest.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/ElementState.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/locator-engine/src/main/java/com/example/webtest/locator/model/ResolveResult.java`
- `libs/locator-engine/src/main/java/com/example/webtest/locator/resolver/DefaultElementResolver.java`
- `libs/locator-engine/src/test/java/com/example/webtest/locator/resolver/DefaultElementResolverTest.java`
- `config/smoke/core-platform-smoke.yml`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/assertion-engine,libs/dsl-parser,libs/execution-engine -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/assertion-engine,libs/dsl-parser,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `git diff --check`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, with `ASSERT_ENABLED` and `ASSERT_DISABLED` successful, plus refreshed `report.json`, `report.html`, `capture-page.png`, and parent `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- `ASSERT_ENABLED` / `ASSERT_DISABLED` now have a distinct enabled signal, but it only covers disabled / `aria-disabled`; richer form-control validity or read-only semantics are not modeled yet.
- Network artifacts still store summaries only, without headers or bodies.
- Step hook console/network deltas use event-list cursors rather than a formal `PageController` checkpoint API.

## Next Step
- Prefer improving report index search/filtering and failed-run quick navigation.
- Alternative: enrich network artifact capture with headers/body metadata, or add a formal artifact event checkpoint API.

## 2026-04-17 report index search/filtering record

## Task
- Continued from the completed `ASSERT_ENABLED` / `ASSERT_DISABLED` work by improving the parent `runs/index.html` report index.

## Completed
- Added run-level search to `DefaultReportEngine` report index output.
- Added index status filters:
  - `All`
  - `Failed`
  - `OK`
- Added failed-run quick links at the top of the index page; when no run has failures the page now states `No failed runs.`
- Added stable run row anchors and metadata:
  - `id="run-N"`
  - `data-index`
  - `data-status`
  - `data-search`
- Added keyboard navigation for the report index:
  - `/` focuses search
  - `f` jumps to the first failed run
  - `n` jumps to the next failed run
  - `p` jumps to the previous failed run
- Kept the existing report JSON structure unchanged; the new behavior is limited to generated `index.html`.
- Extended `DefaultReportEngineTest` coverage for search controls, status filters, failed-run links, no-failure state, and keyboard script generation.

## Modified Files
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- Passed: `git diff --check`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, with parent `D:\txt\edge_self_test\runs\index.html` refreshed.
- Confirmed generated `runs/index.html` contains `data-search-input`, `Failed (0)`, `No failed runs.`, keyboard help, and the `dsl-smoke-run` row.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Report index filtering is client-side only and scans the current generated rows.
- Report index does not yet support paging, date range filters, deletion/cleanup, or cross-root aggregation.
- Network artifacts still store summaries only, without headers or bodies.
- Step hook console/network deltas still rely on event-list cursors instead of a formal checkpoint API.

## Next Step
- Prefer enriching network artifact capture with headers/body metadata.
- Alternative: add a formal artifact event checkpoint API, or add report index paging/date filters/cleanup.

## 2026-04-17 network artifact headers/body metadata record

## Task
- Continued from the report index search/filtering work by enriching network artifact capture with request/response headers and response body metadata.

## Completed
- Extended `NetworkEvent` with request headers, request body preview, response headers, encoded length, response body preview, base64 flag, truncation flags, and body capture error.
- `DefaultPageController` now listens to `Network.loadingFinished` in addition to request/response/failure events.
- Response bodies are fetched lazily from `PageController.networkEvents(...)` using `Network.getResponseBody`, avoiding synchronous CDP calls from the WebSocket event callback.
- Request and response events now include header maps from CDP `Network.requestWillBeSent` and `Network.responseReceived`.
- Captured request/response body previews are capped at 12000 characters and marked with truncation flags when capped.
- `DefaultArtifactCollector` now writes the enriched network fields to network JSON artifacts.
- Added `DefaultPageControllerTest` coverage for network headers and response body capture.
- Extended `DefaultArtifactCollectorTest` coverage for enriched network JSON output.

## Modified Files
- `libs/browser-core/pom.xml`
- `libs/browser-core/src/main/java/com/example/webtest/browser/observer/NetworkEvent.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine -am test -q`
- Passed: `git diff --check`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, with refreshed `report.json`, `report.html`, `capture-page.png`, and parent `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Response body capture is best-effort; CDP can reject `Network.getResponseBody` for some requests, and those failures are stored as `bodyError`.
- Network bodies are preview-capped at 12000 characters and are not stored as separate downloadable body files yet.
- Step hook console/network deltas still rely on event-list cursors rather than a formal checkpoint API.

## Next Step
- Prefer adding a formal artifact event checkpoint API so console/network deltas do not rely on raw list cursor positions.
- Alternative: add report index paging/date filters/cleanup, or store large network bodies as separate artifacts.

## 2026-04-17 artifact event checkpoint API record

## Task
- Continued from the network artifact headers/body metadata work by formalizing artifact event checkpoints for console/network step delta capture.

## Completed
- Added `EventCheckpoint` and `EventDelta<T>` to `browser-core` as the public checkpoint/delta model for observed browser events.
- Extended `PageController` with default checkpoint APIs:
  - `consoleCheckpoint(context)`
  - `consoleEventsSince(context, checkpoint)`
  - `networkCheckpoint(context)`
  - `networkEventsSince(context, checkpoint)`
- Updated `DefaultTestOrchestrator` step hook capture to store `EventCheckpoint` instances rather than raw list indexes.
- Preserved existing step hook behavior:
  - after-only console/network hooks capture only events emitted during the current step.
  - before+after hooks split accumulated events at the before hook checkpoint.
  - failure-time context dumps still capture the full available console/network event lists.
- Added `DefaultPageControllerTest` coverage proving console checkpoint deltas return only events emitted after a checkpoint and advance to a new checkpoint.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/observer/EventCheckpoint.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/observer/EventDelta.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/execution-engine -am test -q`
- Passed: `git diff --check`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, refreshed with successful `ASSERT_ENABLED` / `ASSERT_DISABLED` and screenshot artifact output.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- The default checkpoint implementation is still list-snapshot based; it hides cursor arithmetic from callers but does not introduce event-stream sequence IDs.
- Response body capture remains best-effort and preview-capped.
- Large network bodies are not yet stored as separate downloadable artifacts.

## Next Step
- Prefer storing large network bodies as separate downloadable artifacts.
- Alternative: extend report index paging/date filters/cleanup.

## 2026-04-17 large network body sidecar artifact record

## Task
- Continued from the artifact event checkpoint API work by storing truncated network request/response bodies as separate sidecar files.

## Completed
- `NetworkEvent` now keeps full request/response body content when the report preview is truncated, while preserving the existing 12000-character preview fields.
- `DefaultPageController` still caps inline request/response body previews at 12000 characters, but now retains the full body only for truncated cases so `artifact-engine` can write it separately.
- `DefaultArtifactCollector` now writes sidecar files for truncated network bodies under `${artifactName}-bodies/`.
- Network JSON dumps now include `requestBodyArtifactPath` and `responseBodyArtifactPath` when sidecar body files are written.
- Text bodies are written as UTF-8 `.txt`; base64-encoded response bodies are decoded into `.bin` sidecar files.
- Existing network JSON preview/report rendering behavior remains unchanged; the sidecar paths are available from the network dump JSON.
- Added browser-core coverage for full-body retention after preview truncation.
- Added artifact-engine coverage for sidecar request/response body file writing and JSON path output.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/observer/NetworkEvent.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine -am test -q`
- Passed: `git diff --check`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output: `D:\txt\edge_self_test\runs\dsl-smoke`, refreshed with successful DSL smoke steps and `capture-page.png`.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Sidecar body files are referenced from the network JSON dump but are not yet separate top-level `ArtifactRef` entries in the run report.
- Response body capture remains best-effort; CDP failures are still stored as `bodyError`.
- Large bodies are kept in memory until artifact collection writes them.

## Next Step
- Prefer exposing network body sidecar files as first-class report artifact links.
- Alternative: extend report index paging/date filters/cleanup.

## 2026-04-17 network body sidecar report links record

## Task
- Continued from large network body sidecar artifact work by exposing sidecar request/response body files as first-class step artifact links in reports.

## Completed
- Extended `ArtifactRef` with `relatedArtifacts` so one capture operation can return a primary artifact plus files generated alongside it.
- `DefaultArtifactCollector.captureNetworkDump(...)` now attaches truncated request/response body files as related artifacts on the primary network JSON artifact.
- Network sidecar artifact types are:
  - `network-request-body`
  - `network-response-body`
- Text body sidecars use `text/plain`; base64-decoded binary response sidecars use `application/octet-stream`.
- `StepExecutionRecord.addArtifact(...)` now promotes related artifacts into the step artifact list while keeping the primary artifact path unchanged.
- Existing report JSON/HTML generation now renders network body sidecars as normal artifact links without a new report schema.
- Added coverage for collector related artifacts, step artifact promotion, and report HTML rendering of network body sidecar links/previews.

## Modified Files
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/model/ArtifactRef.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/result/StepExecutionRecord.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/result/StepExecutionRecordTest.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/artifact-engine,libs/execution-engine,libs/report-engine -am test -q`
- Passed: `git diff --check` (line-ending warnings only)
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with successful DSL steps and refreshed `report.json`, `report.html`, `capture-page.png`, and parent `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Sidecar files are only produced when a captured body exceeds the inline preview limit.
- Response body capture remains best-effort and can still record CDP failures as `bodyError`.
- Large truncated bodies are still retained in memory until artifact collection writes them.

## Next Step
- Prefer extending report index paging/date filters/cleanup.
- Alternative: add streaming/spooling for very large network bodies to reduce in-memory retention.

## 2026-04-17 report index paging/date filtering record

## Task
- Continued from network body sidecar report links by extending the parent report index with paging, date filtering, and cleanup guidance.

## Completed
- Added run index date range filters based on each run row's `startedAt` date.
- Added client-side page size selection and Previous/Next pagination for `runs/index.html`.
- Added live matching-run/page status text to the generated index.
- Added `data-started` and `data-finished` row metadata while preserving existing `data-search`, status filters, failed-run quick links, and keyboard navigation.
- Added a static cleanup note explaining that deleting a run directory removes it from the next generated index.
- Kept the report JSON schema and per-run `report.html` unchanged.
- Extended `DefaultReportEngineTest` coverage for date controls, pagination controls, generated metadata, and filtering/paging script output.

## Modified Files
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- Passed: `git diff --check` (line-ending warnings only)
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with refreshed `report.json`, `report.html`, `capture-page.png`, and parent `runs/index.html`.
- Confirmed generated `runs/index.html` contains `data-date-from`, `data-page-size`, `data-index-status`, cleanup guidance, and the pagination status script.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Report index filtering and paging are still client-side only.
- Cleanup is guidance-only; there is no in-app deletion workflow or retention policy.
- Sidecars appear only for truncated network bodies; CDP response body capture remains best-effort.
- Large network bodies are still retained in memory until artifact collection writes them.

## Next Step
- Prefer adding streaming/spooling for very large network bodies to reduce in-memory retention.
- Alternative: add a configurable report retention cleanup command or continue improving report index history management.

## 2026-04-17 network body spool record

## Task
- Continued from report index paging/date filtering by reducing long-lived in-memory retention of very large network request/response bodies.

## Completed
- Added spool-path fields to `NetworkEvent` for truncated request and response bodies.
- `DefaultPageController` now writes truncated full request/response bodies to temporary spool files immediately after capture, while keeping only the inline 12000-character preview on the event object.
- If spooling fails, capture falls back to the previous in-memory full-body behavior so artifact generation remains best-effort.
- `DefaultArtifactCollector` now writes final network body sidecar artifacts from spool files when present, then deletes the temporary spool files.
- Base64 response bodies spooled as text are decoded into `.bin` sidecars during artifact collection, preserving existing report artifact behavior.
- Existing `requestBodyFull` / `responseBodyFull` paths remain supported for compatibility with older tests or manually constructed events.
- Added coverage for page-controller spooling, collector spool-file sidecar writing, base64 decode from spool, and spool cleanup.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/observer/NetworkEvent.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `libs/artifact-engine/src/main/java/com/example/webtest/artifact/collector/DefaultArtifactCollector.java`
- `libs/artifact-engine/src/test/java/com/example/webtest/artifact/collector/DefaultArtifactCollectorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `git diff --check` (line-ending warnings only)
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with successful DSL steps and refreshed reports.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` Edge process remained.

## Known Gaps
- CDP still returns response bodies as strings, so spooling reduces long-lived retention but does not eliminate the transient allocation during `Network.getResponseBody`.
- Truncated body sidecars are still produced only after artifact collection runs.
- Spool files are cleaned after successful artifact collection; if a run crashes before collection, OS temp cleanup may be needed.

## Next Step
- Prefer adding a configurable report retention cleanup command.
- Alternative: continue improving report index history management or add explicit temp-spool lifecycle cleanup on run/session close.

## 2026-04-17 report retention cleanup command record

## Task
- Continued from network body spooling by adding a configurable report retention cleanup command.

## Completed
- Added `ReportCleanupOptions` and `ReportCleanupResult` to `report-engine`.
- `ReportEngine` now exposes `cleanupReportRuns(reportRoot, options)`.
- `DefaultReportEngine.cleanupReportRuns(...)` scans only first-level run directories containing `report.json`, applies retention rules, deletes selected run directories, and refreshes `index.html` after an applied cleanup.
- Cleanup supports keeping the latest N runs, deleting runs finished before a cutoff instant, and dry-run mode.
- `keepLatest` protects the newest N runs even when an age cutoff is also configured.
- Dry-run mode reports matching run directories without deleting them or rewriting the index.
- Added `core-platform report-cleanup` command:
  - `report-cleanup [reportRoot] [--keep-latest N] [--older-than-days N] [--apply|--dry-run]`
  - defaults to `runs`, `--keep-latest 20`, and dry-run.
- Added tests for keep-latest deletion, cutoff dry-run behavior, and report index refresh after cleanup.

## Modified Files
- `apps/core-platform/pom.xml`
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportCleanupOptions.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportCleanupResult.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,apps/core-platform -am test -q`
- Passed: `git diff --check` (line-ending warnings only)
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup --help"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup ..\..\runs --dry-run --keep-latest 20"`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`

## Known Gaps
- Cleanup is currently a CLI/API operation, not an in-report browser action.
- Retention rules are not yet wired into DSL/report policy config.
- The command does not yet support status-based retention, size quotas, or artifact-only pruning.

## Next Step
- Prefer adding explicit temp-spool lifecycle cleanup on run/session close.
- Alternative: wire report retention defaults into DSL/report policy config or add status/size-based cleanup rules.

## 2026-04-17 temp spool lifecycle cleanup record

## Task
- Continued from report retention cleanup by adding explicit lifecycle cleanup for temporary network body spool files.

## Completed
- Added `PageController.cleanupNetworkBodySpools(context)` as a default no-op lifecycle hook.
- `DefaultPageController` now deletes any request/response network body spool files still referenced by captured network events and clears those spool-path references.
- `DefaultPageController.startNetworkCapture(...)` now performs best-effort spool cleanup before clearing prior network events, preventing stale temp files when the same controller is reused.
- `DefaultTestOrchestrator.execute(...)` now wraps run execution/report generation in a `finally` block and calls the page-controller cleanup hook so normal failures, report failures, and early exits do not leave known spool files behind.
- Cleanup remains best-effort and does not mask the original run result or exception.
- Added coverage for deleting spooled request/response temp files and for orchestrator-level cleanup invocation after a run.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/PageController.java`
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/execution-engine -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/artifact-engine,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `git diff --check` (line-ending warnings only)

## Known Gaps
- CDP still transiently allocates large response bodies before spooling can happen.
- Spool cleanup only covers files still referenced by live `NetworkEvent` objects; a hard JVM/process crash can still leave OS temp files.
- No status-based retention, size quotas, or DSL-level report retention defaults yet.

## Next Step
- Prefer wiring report retention defaults into DSL/report policy config.
- Alternative: add status/size-based report cleanup rules or a startup sweep for orphaned `webtest-network-body-*.tmp` files.

## 2026-04-17 DSL report retention policy record

## Task
- Continued from temp spool lifecycle cleanup by wiring report retention defaults into DSL `reportPolicy`.

## Completed
- Added DSL `ReportPolicy` fields:
  - `retentionCleanupOnRun`
  - `retentionKeepLatest`
  - `retentionOlderThanDays`
- `DefaultDslValidator` now validates report retention values:
  - `retentionKeepLatest` must be >= 1 when present.
  - `retentionOlderThanDays` must be >= 0 when present.
  - `retentionCleanupOnRun: true` requires at least one retention rule.
- `DefaultTestOrchestrator` now runs report cleanup after generating the current report when DSL retention cleanup is enabled.
- Age-only cleanup automatically protects the newest run by setting `keepLatest=1`.
- `config/smoke/core-platform-smoke.yml` now enables conservative retention cleanup with `retentionKeepLatest: 20`.
- Added parser/validator coverage for retention policy parsing and invalid values.
- Added orchestrator coverage proving an older report run is deleted after a new run when `retentionKeepLatest: 1`.

## Modified Files
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `config/smoke/core-platform-smoke.yml`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/dsl-parser,libs/execution-engine -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/dsl-model,libs/dsl-parser,libs/execution-engine,libs/report-engine,apps/core-platform -am test -q`
- Passed: `git diff --check` (line-ending warnings only)
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with successful 16-step DSL run and refreshed `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- DSL retention only supports keep-latest and finished-before age rules.
- Cleanup is run-level and CLI/API driven; there is still no in-report browser action.
- No status-based retention, size quotas, or artifact-only pruning yet.

## Next Step
- Prefer adding status-based report cleanup rules.
- Alternative: add size-quota cleanup or a startup sweep for orphaned `webtest-network-body-*.tmp` files.

## 2026-04-17 status-based report cleanup record

## Task
- Continued from DSL report retention policy by adding status-based report cleanup rules.

## Completed
- Added `ReportCleanupOptions.deleteStatuses` with validation for `OK` and `FAILED`.
- `DefaultReportEngine.cleanupReportRuns(...)` can now delete report run directories by generated run status:
  - `FAILED` means the report summary has one or more failed steps.
  - `OK` means the report summary has no failed steps.
- Existing cleanup behavior remains intact:
  - `keepLatest` still deletes runs older than the newest N and also protects those newest N from other rules.
  - `deleteFinishedBefore` still deletes runs finished before the cutoff.
  - dry-run still reports matching directories without deleting them or refreshing the index.
- Added `core-platform report-cleanup --status OK|FAILED[,..]`.
- Added DSL `reportPolicy.retentionDeleteStatuses` and validator coverage for invalid status names.
- `DefaultTestOrchestrator` now passes DSL status retention rules into `ReportEngine.cleanupReportRuns(...)` after writing the current report.
- `config/smoke/core-platform-smoke.yml` was left conservative; it still uses keep-latest retention and does not delete by status.

## Modified Files
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportCleanupOptions.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/dsl-parser,libs/execution-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed: `git diff --check` (line-ending warnings only)
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup --help"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with a successful 16-step DSL run and refreshed `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Status cleanup is limited to aggregate run status (`OK` / `FAILED`), not individual step status filters.
- There are still no size quotas or artifact-only pruning rules.
- Cleanup remains CLI/API/run-level driven; there is no in-report browser action.
- Combining `--keep-latest` with `--status` keeps the existing keep-latest semantics: newest N are protected, and older runs can also be deleted by the keep-latest rule even if their status does not match.

## Next Step
- Prefer adding size-quota report cleanup rules.
- Alternative: add artifact-only pruning or a startup sweep for orphaned `webtest-network-body-*.tmp` files.

## 2026-04-17 size-quota report cleanup record

## Task
- Continued from status-based report cleanup by adding total-size quota cleanup rules for report runs.

## Completed
- Added `ReportCleanupOptions.maxTotalBytes` with non-negative validation.
- `DefaultReportEngine.cleanupReportRuns(...)` now computes first-level report run directory sizes and can delete oldest unprotected runs until the retained run total is under `maxTotalBytes`.
- Existing cleanup semantics remain intact:
  - `keepLatest` still protects newest runs from age, status, and size-quota deletion.
  - keep-latest, finished-before, and status deletion are applied before size quota calculation.
  - dry-run still reports matching directories without deleting them or refreshing the index.
- Added `core-platform report-cleanup --max-total-mb N`.
- Added DSL `reportPolicy.retentionMaxTotalMb` and validator coverage for invalid negative values.
- `DefaultTestOrchestrator` now passes DSL size retention into report cleanup after report generation. If only age or size retention is configured, the newest/current report run is protected with `keepLatest=1`.
- `config/smoke/core-platform-smoke.yml` remains conservative; it still uses keep-latest retention and does not enable size-quota deletion.

## Modified Files
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportCleanupOptions.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/dsl-parser,libs/execution-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed: `git diff --check` (line-ending warnings only)
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup --help"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup ..\..\runs --dry-run --keep-latest 20 --max-total-mb 1024"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with a successful 16-step DSL run and refreshed `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Size cleanup is based on total run directory size only; there is no per-artifact quota or artifact-only pruning yet.
- Size quota can remain exceeded if protected latest runs alone are larger than the configured limit.
- Cleanup remains CLI/API/run-level driven; there is no in-report cleanup action.
- No startup sweep for orphaned `webtest-network-body-*.tmp` files.

## Next Step
- Prefer adding artifact-only pruning rules.
- Alternative: add a startup sweep for orphaned `webtest-network-body-*.tmp` files or in-report cleanup affordances.

## 2026-04-17 artifact-only report cleanup record

## Task
- Continued from size-quota cleanup by adding artifact-only pruning rules for matched report runs.

## Completed
- Added `ReportCleanupOptions.pruneArtifactsOnly`.
- `DefaultReportEngine.cleanupReportRuns(...)` can now reuse existing run selection rules and prune only report-referenced artifact files from matched runs:
  - keep-latest still protects the newest N runs.
  - older-than, status, and size-quota rules still decide which runs match cleanup.
  - when artifact-only pruning is enabled, run directories, `report.json`, and `report.html` are retained.
  - empty artifact subdirectories are removed after pruning.
  - dry-run reports artifact paths without deleting files or rewriting the index.
- `ReportCleanupResult` now reports both deleted run directories and deleted artifact paths.
- Added `core-platform report-cleanup --prune-artifacts-only`.
- Added DSL `reportPolicy.retentionPruneArtifactsOnly`; validation requires it to be used with `retentionCleanupOnRun`.
- `DefaultTestOrchestrator` now passes artifact-only retention into report cleanup after generating the current report.

## Modified Files
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/dsl-model/src/main/java/com/example/webtest/dsl/model/ReportPolicy.java`
- `libs/dsl-parser/src/main/java/com/example/webtest/dsl/validator/DefaultDslValidator.java`
- `libs/dsl-parser/src/test/java/com/example/webtest/dsl/parser/DefaultDslParserTest.java`
- `libs/execution-engine/src/main/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestrator.java`
- `libs/execution-engine/src/test/java/com/example/webtest/execution/engine/orchestrator/DefaultTestOrchestratorTest.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportCleanupOptions.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportCleanupResult.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/dsl-parser,libs/execution-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed: `git diff --check` (line-ending warnings only)
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup --help"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-cleanup ..\..\runs --dry-run --keep-latest 20 --prune-artifacts-only"`; output scanned 1 run, kept 1, would delete 0 runs and 0 artifacts.
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with a successful 16-step DSL run and refreshed `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Artifact pruning keeps report metadata and HTML links intact, so pruned artifact links can point to missing files.
- Artifact-only pruning deletes only paths referenced by `report.json`; it does not sweep unreferenced files under a run directory.
- Size quota can remain exceeded if protected latest runs alone are larger than the configured limit.
- No startup sweep for orphaned `webtest-network-body-*.tmp` files and no in-report cleanup action yet.

## Next Step
- Prefer adding a startup sweep for orphaned `webtest-network-body-*.tmp` files.
- Alternative: add in-report cleanup affordances or report metadata markers for pruned artifacts.

## 2026-04-17 orphan network body spool startup cleanup record

## Task
- Continued from artifact-only report cleanup by adding a startup sweep for orphaned `webtest-network-body-*.tmp` files.

## Completed
- `DefaultPageController` now uses shared network body spool prefix/suffix constants and an injectable temp directory for tests.
- Added best-effort cleanup in `DefaultPageController` construction:
  - scans the configured temp directory for `webtest-network-body-*.tmp`;
  - deletes only regular files older than 1 hour;
  - ignores scan/delete errors so browser startup is not blocked by cleanup;
  - keeps recently modified spool files to reduce risk to concurrent runs.
- Network response/request body spooling now uses the same configured temp directory as the startup sweep.
- Added test coverage proving stale matching orphan files are deleted while recent matching files and unrelated files remain.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/execution-engine -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed: `git diff --check` (line-ending warnings only)
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`
- Latest smoke output remains `D:\txt\edge_self_test\runs\dsl-smoke`, with a successful 16-step DSL run and refreshed `runs/index.html`.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- Startup cleanup intentionally leaves matching temp files newer than 1 hour, so a very recent JVM/process crash can still leave temporary files until a later startup.
- Cleanup still targets only the default network body spool naming pattern; it does not sweep unrelated temp files or report artifact directories.
- CDP can still transiently allocate large response bodies before they are written to spool files.

## Next Step
- Prefer adding report metadata markers for pruned artifacts so reports can show artifact links as removed instead of broken.
- Alternative: add in-report cleanup affordances or make the spool orphan grace period configurable.

## 2026-04-17 pruned artifact report metadata record

## Task
- Continued from orphan network body spool startup cleanup by marking artifact-only report cleanup results in report metadata and HTML.

## Completed
- `DefaultReportEngine.cleanupReportRuns(...)` now rewrites each pruned run's `report.json` and `report.html` after artifact-only cleanup deletes files.
- Pruned artifacts are marked in `report.json`:
  - artifact entries get `pruned: true` and `prunedAt`.
  - legacy step-level `artifactPath` gets `artifactPruned: true` and `artifactPrunedAt` when it points at a deleted artifact.
  - text previews are cleared for deleted artifacts.
- `report.html` now renders pruned artifacts as non-clickable removed labels with `status: pruned` metadata instead of broken links or previews.
- Dry-run artifact pruning remains non-mutating: files and report metadata are left unchanged.
- Added report-engine test coverage for JSON markers, regenerated HTML, and absence of the old broken artifact link.

## Modified Files
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,libs/execution-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `git diff --check` (line-ending warnings only)

## Known Gaps
- Existing reports pruned before this change still have broken artifact links unless cleanup is run again against matching runs.
- Artifact-only pruning still deletes only paths referenced by `report.json`; unreferenced files under a run directory are not swept.
- There is still no in-report cleanup action.

## Next Step
- Prefer adding in-report cleanup affordances or a small maintenance CLI/report command to re-mark legacy pruned reports.
- Alternative: make the network body spool orphan grace period configurable.

## 2026-04-17 legacy pruned artifact maintenance record

## Task
- Updated the current phase judgment from the stale Phase 0 entry to Phase 2 stability enhancement, then continued the documented next step by adding a maintenance command for legacy reports whose artifact files were pruned before metadata markers existed.

## Completed
- Added `ReportMaintenanceResult`.
- Extended `ReportEngine` with `markMissingArtifactsPruned(reportRoot, dryRun)`.
- `DefaultReportEngine` now scans first-level report run directories, detects unmarked artifact links whose files are missing, and can rewrite the run's `report.json` and `report.html` with the same pruned metadata used by artifact-only cleanup:
  - artifact entries get `pruned: true` and `prunedAt`.
  - legacy step-level `artifactPath` gets `artifactPruned: true` and `artifactPrunedAt`.
  - regenerated HTML renders those artifacts as non-clickable removed labels instead of broken links.
- Dry-run maintenance reports matching artifact paths without mutating report files.
- Added `core-platform report-maintenance [reportRoot] --mark-missing-artifacts [--apply|--dry-run]`.
- Updated the top-level current phase section in this file to reflect Phase 2 status and the remaining Phase 3 gap.

## Modified Files
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportMaintenanceResult.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-maintenance --help"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-maintenance ..\..\runs --mark-missing-artifacts --dry-run"`; output scanned 1 run, updated 0 runs, would mark 0 artifacts.
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`; latest DSL smoke remained successful with 16 successful steps.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.
- Passed: `git diff --check` (line-ending warnings only)

## Known Gaps
- Maintenance only marks report-referenced artifact paths that are missing; it does not sweep unreferenced files.
- Maintenance is CLI/API driven; there is still no in-report browser action.
- Existing reports need the maintenance command to be run with `--apply` before their broken links are rewritten.

## Next Step
- Prefer adding in-report cleanup affordances for report cleanup/maintenance discovery, without attempting browser-side deletion.
- Alternative: make the network body spool orphan grace period configurable.

## 2026-04-17 in-report cleanup affordance record

## Task
- Continued from the legacy pruned artifact maintenance command by adding static report-page guidance for cleanup and maintenance discovery.

## Completed
- `runs/index.html` generation now includes a Report maintenance note with dry-run-first command examples:
  - `report-cleanup runs --dry-run --keep-latest 20`
  - `report-cleanup runs --dry-run --keep-latest 20 --prune-artifacts-only`
  - `report-maintenance runs --mark-missing-artifacts --dry-run`
- Individual `report.html` generation now includes an Artifacts note that points users to artifact pruning and missing-artifact marker commands.
- The affordance is informational only; no browser-side deletion or mutation action was added.
- Updated report-engine test assertions to cover the new index and run-report guidance.
- Regenerated the current smoke report so `runs/index.html` and `runs/dsl-smoke/report.html` show the new guidance.

## Modified Files
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `runs/index.html`
- `runs/dsl-smoke/report.html`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`; latest DSL smoke remained successful with 16 successful steps.
- Confirmed generated `runs/index.html` contains the Report maintenance command note.
- Confirmed generated `runs/dsl-smoke/report.html` contains the Artifacts maintenance command note.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.

## Known Gaps
- The in-report affordance is static guidance only; cleanup and maintenance still run through CLI/API.
- Maintenance still only marks report-referenced missing artifacts and does not sweep unreferenced files.
- Existing report HTML files need regeneration or maintenance cleanup to show the new guidance.

## Next Step
- Prefer making the network body spool orphan grace period configurable.
- Alternative: add deeper report storage diagnostics such as artifact totals by type/run.

## 2026-04-17 configurable network body spool cleanup record

## Task
- Continued from in-report cleanup affordances by making the orphaned network body spool startup cleanup grace period configurable.

## Completed
- `DefaultPageController` now keeps the existing default 1 hour orphan cleanup grace period, but exposes two configuration paths:
  - JVM system property `webtest.networkBodySpool.orphanMinAgeSeconds`.
  - constructor injection with `Duration` for programmatic/test wiring.
- Startup cleanup still scans only `webtest-network-body-*.tmp` files in the configured temp directory and remains best-effort.
- Invalid configured grace periods fail fast:
  - negative durations are rejected.
  - non-numeric system property values are rejected.
- Added browser-core tests for custom grace-period cleanup and invalid system-property parsing.

## Modified Files
- `libs/browser-core/src/main/java/com/example/webtest/browser/page/DefaultPageController.java`
- `libs/browser-core/src/test/java/com/example/webtest/browser/page/DefaultPageControllerTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/browser-core,libs/execution-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke ..\..\config\smoke\core-platform-smoke.yml"`; latest DSL smoke remained successful with 16 successful steps.
- Rechecked local Edge debug processes after smoke; no `msedge.exe` project `webtest-edge-*` / `remote-debugging-port` process remained.
- Passed: `git diff --check` (line-ending warnings only)

## Known Gaps
- The setting is currently JVM/property/programmatic configuration only; there is no DSL field or CLI flag for it.
- Startup cleanup still targets only network body spool temp files, not unrelated temp files or report artifacts.
- CDP can still transiently allocate large response bodies before spooling.

## Next Step
- Prefer adding report storage diagnostics such as artifact totals by type/run.
- Alternative: expose the network body spool grace period through DSL/run options if runtime scenario-level control becomes necessary.

## 2026-04-17 report storage diagnostics record

## Task
- Continued after configurable network body spool cleanup by adding read-only report storage diagnostics for run and artifact usage.

## Completed
- Added `ReportStorageDiagnosticsResult`.
- Extended `ReportEngine` with `diagnoseReportStorage(reportRoot)`.
- `DefaultReportEngine` now scans first-level report run directories and reports:
  - total run directory bytes.
  - referenced artifact bytes.
  - referenced artifact count.
  - missing unmarked artifact count.
  - pruned artifact count.
  - artifact totals by type.
  - per-run storage summaries with status, finished time, run bytes, artifact bytes, missing count, and pruned count.
- Artifact diagnostics de-duplicate paths per run and reuse the existing report-root/run-directory safety boundary.
- Added `core-platform report-diagnostics [reportRoot]`.
- Added the diagnostics command to the report index maintenance note.

## Modified Files
- `apps/core-platform/src/main/java/com/example/webtest/platform/CorePlatformApp.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportEngine.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/ReportStorageDiagnosticsResult.java`
- `libs/report-engine/src/main/java/com/example/webtest/report/engine/DefaultReportEngine.java`
- `libs/report-engine/src/test/java/com/example/webtest/report/engine/DefaultReportEngineTest.java`
- `01_dev_progress.md`
- `memory.txt`

## Verification
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -pl libs/report-engine,apps/core-platform -am test -q`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q package`
- Passed: `mvn "-Dmaven.repo.local=.m2/repository" -q -DskipTests install`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-diagnostics --help"`
- Passed from `apps/core-platform`: `mvn "-Dmaven.repo.local=..\..\.m2\repository" -q exec:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=report-diagnostics ..\..\runs"`; output scanned 1 run, 29217 total run bytes, 9296 referenced artifact bytes, 1 screenshot artifact, 0 missing, 0 pruned.

## Known Gaps
- Diagnostics are CLI/API only and are not yet rendered as a report-index storage panel.
- Diagnostics count only report-referenced artifacts; unreferenced files under a run directory are included in run bytes but not artifact totals.
- Artifact byte accounting can include existing files marked pruned if a report is inconsistent with disk state.

## Next Step
- Prefer rendering storage diagnostics in `runs/index.html` so report size/artifact totals are visible without running CLI.
- Alternative: expose the network body spool grace period through DSL/run options if scenario-level runtime control becomes necessary.
