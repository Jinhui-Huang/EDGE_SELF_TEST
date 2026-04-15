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
  - 状态：接口与默认实现骨架已完成
  - 说明：提供 Session 管理、PageController、截图选项、Console/Network 事件模型
  - 对应文件：`libs/browser-core/src/main/java/com/example/webtest/browser/**`
  - 对应文档：`enterprise_web_test_platform_phase3_java_core_code_skeleton.md`、`cdp_domain_encapsulation_detailed_design.md`

## CDP 域封装
- 域名：Raw CDP Client
  - 状态：接口与默认实现骨架已完成
  - 已实现命令：尚未实现真实发送；`DefaultCdpClient.send` 当前明确抛出未实现异常
  - 已监听事件：无
  - 风险：后续真实联调依赖 WebSocket 传输实现、本机 Edge 启动参数和 CDP 端口

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
- CDP WebSocket 传输、Edge 启动和真实 Page 操作尚未实现，下一步应优先接入 JSON 实现和 CDP 真实传输。

---

# 6. 已知问题

- 问题 1：
  - 现象：历史进度文档此前为空模板。
  - 影响范围：无法确认是否存在未提交代码之外的历史实现。
  - 是否阻塞：不阻塞当前初始化。
  - 临时方案：以当前工作区文件为准，从 Phase 0 开始记录。

- 问题 2：
  - 现象：CDP 真实链路尚未实现；当前 `DefaultCdpClient.send` 为明确失败的骨架实现。
  - 影响范围：无法验证启动 Edge、打开页面和截图。
  - 是否阻塞：不阻塞工程初始化。
  - 临时方案：下一阶段实现 WebSocket 传输、请求 ID、响应等待、事件分发，再做本机 Edge 联调。

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
1. 实现 `DefaultCdpClient` 的真实 WebSocket 传输
2. 实现 `DefaultBrowserSessionManager` 启动 Edge 与查询 DevTools endpoint
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
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md` 第 5-9 章
- `enterprise_web_test_platform_phase2_implementation_design.md` 第 3-8、20-21 章
- 如涉及 CDP 真实实现，再读 `cdp_domain_encapsulation_detailed_design.md` 第 4-8 章

---

**文件结束**
