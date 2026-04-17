# 01_dev_progress.md
**项目名称**：企业级网页自动化测试平台  
**用途**：记录最新开发状态，作为开发 AI 和人工开发者的“外部项目记忆”  
**更新要求**：每次开发结束后必须更新，不允许跳过

---

# 1. 当前阶段

## 当前阶段
- 当前阶段：Phase 0：架构底座
- 当前阶段目标：初始化 Maven 多模块工程，逐步打通 Java 核心最小执行链路
- 当前主线任务：仓库初始化、工程骨架初始化、Java 核心基础模块骨架落地

## 阶段判断说明
- 当前工作区此前只有设计文档，没有源码工程。
- 因此不能判定为 Phase 1 或更高阶段。
- 当前最接近 `enterprise_web_test_platform_tech_design.md` 中的 Phase 0：架构底座。

---

# 2. 当前总体状态

## 已完成
- [x] 阅读项目入口、技术方案、Phase2 落地文档、Phase3 Java 骨架文档、CDP 文档、Native Messaging 文档、Edge TS 文档
- [x] 初始化 git 仓库
- [x] 初始化 Maven 多模块目录与根构建配置
- [x] 完成 common-core、common-json、dsl-model、dsl-parser 基础 Java 骨架

## 进行中
- [x] Java 核心基础模块代码骨架
- [x] CDP Client 与 Browser Core 接口骨架

## 未开始
- [ ] 最小浏览器链路：启动 Edge、连接 CDP、打开页面、截图
- [ ] DSL 执行链路
- [ ] Native Messaging Host
- [ ] Edge 插件 TypeScript 实现
- [ ] DB 断言
- [ ] Agent 辅助层

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
