# 企业级网页自动化测试平台（二期研发落地文档）
**版本**: v1.0  
**定位**: 面向研发落地的详细设计文档，重点覆盖 **模块拆分、类设计、接口骨架、Gradle 多模块结构、代码组织、首批实现顺序**  
**依赖前置文档**: `enterprise_web_test_platform_tech_design.md`

---

# 目录

1. 文档目标  
2. 二期建设范围  
3. Gradle 多模块结构设计  
4. 模块职责与依赖关系  
5. 领域模型设计  
6. DSL 模型设计  
7. 执行上下文设计  
8. 浏览器与 CDP 模块设计  
9. 执行动作模块设计  
10. 等待模块设计  
11. 断言模块设计  
12. Artifact 与报告模块设计  
13. 数据源与 DB 断言模块设计  
14. Agent 模块设计  
15. Native Messaging Host 模块设计  
16. 管理 API 模块设计  
17. 配置设计  
18. 包结构建议  
19. 核心接口代码骨架  
20. 首批类清单  
21. 首批开发顺序  
22. 单元测试与集成测试策略  
23. 代码规范建议  
24. 风险点与工程建议  

---

# 1. 文档目标

上一份文档解决的是：
- 为什么这样设计
- 总体架构怎么分
- 关键技术怎么选

这一份文档解决的是：
- 工程怎么拆
- 类怎么建
- 接口怎么定
- 模块怎么依赖
- 研发先写哪些代码
- 第一批能跑起来的骨架应该长什么样

本文件的目标是让项目进入**可直接开工**状态。

---

# 2. 二期建设范围

本期重点覆盖：

- Java 多模块工程结构
- DSL Schema 对应的 Java Model
- Test Orchestrator 及执行链
- CDP Client 抽象与实现骨架
- Session 管理
- Element Resolver
- Action Executor
- Wait Engine
- Assertion Engine
- Artifact Collector
- Report Engine
- Native Messaging Host
- 管理 API
- DB 断言
- Agent 抽象层

不包含：
- 具体复杂 UI 页面实现
- 完整企业安装器
- 完整升级器
- 全量 Agent prompt 细节
- 完整截图视觉比对算法实现

---

# 3. Gradle 多模块结构设计

建议使用 **Gradle 多模块 Monorepo**。

---

## 3.1 推荐目录结构

```text
enterprise-web-test-platform/
├─ settings.gradle.kts
├─ build.gradle.kts
├─ gradle.properties
├─ docs/
├─ config/
│  ├─ environments/
│  ├─ datasources/
│  ├─ policies/
│  └─ llm/
├─ apps/
│  ├─ core-platform/
│  ├─ native-host/
│  ├─ local-admin-api/
│  └─ desktop-launcher/
├─ libs/
│  ├─ common-core/
│  ├─ common-json/
│  ├─ dsl-model/
│  ├─ dsl-parser/
│  ├─ execution-context/
│  ├─ execution-engine/
│  ├─ cdp-client/
│  ├─ browser-core/
│  ├─ locator-engine/
│  ├─ action-engine/
│  ├─ wait-engine/
│  ├─ assertion-engine/
│  ├─ artifact-engine/
│  ├─ report-engine/
│  ├─ datasource-engine/
│  ├─ security-audit/
│  ├─ agent-adapter/
│  └─ native-messaging/
├─ ui/
│  ├─ admin-console/
│  └─ shared-ui/
├─ extension/
│  └─ edge-extension/
├─ scripts/
├─ tools/
└─ runs/
```

---

## 3.2 settings.gradle.kts 示例

```kotlin
rootProject.name = "enterprise-web-test-platform"

include(
    "apps:core-platform",
    "apps:native-host",
    "apps:local-admin-api",
    "apps:desktop-launcher",

    "libs:common-core",
    "libs:common-json",
    "libs:dsl-model",
    "libs:dsl-parser",
    "libs:execution-context",
    "libs:execution-engine",
    "libs:cdp-client",
    "libs:browser-core",
    "libs:locator-engine",
    "libs:action-engine",
    "libs:wait-engine",
    "libs:assertion-engine",
    "libs:artifact-engine",
    "libs:report-engine",
    "libs:datasource-engine",
    "libs:security-audit",
    "libs:agent-adapter",
    "libs:native-messaging"
)
```

---

## 3.3 为什么用多模块

### 优点
- 依赖边界清晰
- 模块职责清晰
- 可单独测试
- 可单独替换
- 便于多人协作
- 后续可拆分为独立发布单元

### 原则
- 低层模块不得依赖高层模块
- 核心领域模型单独抽出
- 协议层与业务层解耦
- 浏览器实现与 DSL 执行器解耦

---

# 4. 模块职责与依赖关系

## 4.1 模块依赖图（文本版）

```text
common-core
common-json
  └─ 被所有模块依赖

dsl-model
dsl-parser -> dsl-model, common-json

execution-context -> common-core, dsl-model

cdp-client -> common-core, common-json
browser-core -> cdp-client, execution-context, common-core
locator-engine -> browser-core, dsl-model, execution-context
action-engine -> locator-engine, browser-core, execution-context
wait-engine -> browser-core, execution-context
assertion-engine -> browser-core, execution-context, datasource-engine
artifact-engine -> browser-core, execution-context
report-engine -> artifact-engine, execution-context
datasource-engine -> common-core
security-audit -> common-core
agent-adapter -> execution-context, dsl-model

execution-engine ->
  dsl-parser
  execution-context
  browser-core
  locator-engine
  action-engine
  wait-engine
  assertion-engine
  artifact-engine
  report-engine
  security-audit
  agent-adapter

native-messaging -> common-json, common-core

apps:core-platform ->
  execution-engine
  native-messaging
  datasource-engine
  security-audit

apps:native-host ->
  native-messaging
  execution-engine

apps:local-admin-api ->
  execution-engine
  report-engine
  datasource-engine
```

---

## 4.2 模块职责表

| 模块 | 职责 | 是否首批必须 |
|---|---|---|
| common-core | 通用异常、Result、时间、ID、基础工具 | 是 |
| common-json | Jackson 配置、Json 工具 | 是 |
| dsl-model | DSL 数据模型 | 是 |
| dsl-parser | DSL 解析与校验 | 是 |
| execution-context | 执行上下文、变量、运行状态 | 是 |
| cdp-client | CDP 命令与事件客户端 | 是 |
| browser-core | 浏览器会话、页面控制、网络/console | 是 |
| locator-engine | 元素定位 | 是 |
| action-engine | click/fill/type 等动作 | 是 |
| wait-engine | 显式等待 | 是 |
| assertion-engine | 断言 | 是 |
| artifact-engine | 截图/DOM/日志采集 | 是 |
| report-engine | 报告生成 | 第一版可简化 |
| datasource-engine | DB 连接与断言 | 第二批 |
| security-audit | 审计、安全、脱敏 | 第一版要有骨架 |
| agent-adapter | LLM 适配与辅助 | 第二批 |
| native-messaging | 插件与宿主桥接 | 是 |

---

# 5. 领域模型设计

本平台的核心领域对象建议如下。

---

## 5.1 核心领域对象列表

- `Project`
- `TestCaseDefinition`
- `TestSuiteDefinition`
- `StepDefinition`
- `TargetDefinition`
- `ExecutionContext`
- `ExecutionSession`
- `StepExecutionRecord`
- `RunRecord`
- `AssertionResult`
- `ArtifactRef`
- `DatasourceConfig`
- `EnvironmentConfig`
- `AgentSuggestion`

---

## 5.2 Project

```java
public class Project {
    private String id;
    private String name;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
```

---

## 5.3 TestCaseDefinition

```java
public class TestCaseDefinition {
    private String id;
    private String name;
    private String description;
    private String version;
    private String env;
    private String baseUrl;
    private List<String> tags;
    private Map<String, Object> vars;
    private List<StepDefinition> beforeAll;
    private List<StepDefinition> steps;
    private List<StepDefinition> afterAll;
    private AssertPolicy assertPolicy;
    private ReportPolicy reportPolicy;
}
```

---

## 5.4 StepDefinition

```java
public class StepDefinition {
    private String id;
    private String name;
    private String action;
    private TargetDefinition target;
    private Object value;
    private String expected;
    private Long timeoutMs;
    private RetryPolicy retry;
    private FailurePolicy onFailure;
    private Map<String, Object> extra;
}
```

---

## 5.5 TargetDefinition

```java
public class TargetDefinition {
    private String by;
    private String value;
    private String role;
    private String name;
    private Integer index;
    private String textMatch;
    private List<TargetAlternative> alternatives;
    private String frame;
    private Boolean shadow;
}
```

---

## 5.6 ExecutionSession

```java
public class ExecutionSession {
    private String sessionId;
    private String browserProcessId;
    private Integer debugPort;
    private String wsEndpoint;
    private String currentTargetId;
    private String currentFrameId;
    private SessionStatus status;
}
```

---

## 5.7 StepExecutionRecord

```java
public class StepExecutionRecord {
    private String runId;
    private String stepId;
    private String stepName;
    private String action;
    private Instant startedAt;
    private Instant finishedAt;
    private StepStatus status;
    private String message;
    private Long durationMs;
    private List<ArtifactRef> artifacts;
}
```

---

# 6. DSL 模型设计

## 6.1 模型模块拆分建议

### libs/dsl-model
只放：
- POJO / record
- enum
- schema constants

### libs/dsl-parser
只放：
- JSON/YAML 解析
- schema 校验
- 语义校验
- 模板渲染前置处理

---

## 6.2 DSL enum 设计建议

### ActionType
```java
public enum ActionType {
    GOTO,
    REFRESH,
    BACK,
    FORWARD,
    SWITCH_TAB,
    CLOSE_TAB,

    CLICK,
    DOUBLE_CLICK,
    RIGHT_CLICK,
    HOVER,
    FILL,
    CLEAR,
    TYPE,
    PRESS,
    SELECT,
    CHECK,
    UNCHECK,
    UPLOAD,
    DRAG_DROP,
    SCROLL_INTO_VIEW,

    WAIT_FOR_ELEMENT,
    WAIT_FOR_VISIBLE,
    WAIT_FOR_HIDDEN,
    WAIT_FOR_TEXT,
    WAIT_FOR_URL,
    WAIT_FOR_RESPONSE,
    WAIT_FOR_MS,

    ASSERT_TEXT,
    ASSERT_CONTAINS,
    ASSERT_VALUE,
    ASSERT_ATTR,
    ASSERT_VISIBLE,
    ASSERT_NOT_VISIBLE,
    ASSERT_ENABLED,
    ASSERT_DISABLED,
    ASSERT_URL,
    ASSERT_TITLE,
    ASSERT_RESPONSE,
    ASSERT_CONSOLE_NO_ERROR,
    ASSERT_DB,
    ASSERT_SCREENSHOT,

    SCREENSHOT,
    SAVE_DOM,
    SAVE_CONSOLE,
    SAVE_NETWORK,

    SET_VAR,
    EXTRACT_TEXT,
    EXTRACT_ATTR,
    EXTRACT_VALUE,
    JSON_PATH_EXTRACT,

    IF,
    ELSE,
    LOOP,
    RETRY_BLOCK,
    CALL_FLOW
}
```

---

## 6.3 DSL 校验分层

### 第一层：JSON 结构校验
- 字段存在性
- 字段类型
- enum 值合法

### 第二层：语义校验
- `click` 必须有 `target`
- `goto` 必须有 `url`
- `assertText` 必须有 `target + expected`
- `assertDb` 必须有 `datasource + sql + expect`

### 第三层：运行前校验
- 环境存在
- 数据源存在
- 引用变量是否存在
- 子流程是否存在

---

# 7. 执行上下文设计

执行上下文是整个执行引擎的“血液系统”。

---

## 7.1 ExecutionContext 目标

需要承载：
- 当前测试用例
- 当前 step
- 变量上下文
- 环境配置
- 浏览器 session
- 本次 runId
- Artifact 输出目录
- 当前 target/frame/tab
- console/network 缓存
- 失败状态

---

## 7.2 ExecutionContext 建议结构

```java
public class ExecutionContext {
    private String runId;
    private TestCaseDefinition testCase;
    private EnvironmentConfig environmentConfig;
    private Map<String, Object> variables;
    private ExecutionSession session;
    private Path runOutputDir;
    private String currentStepId;
    private String currentTargetId;
    private String currentFrameId;
    private final List<ConsoleEvent> consoleEvents = new ArrayList<>();
    private final List<NetworkEvent> networkEvents = new ArrayList<>();
}
```

---

## 7.3 VariableResolver

推荐单独设计变量解析器：
- `${username}`
- `${env.baseUrl}`
- `${dataset.userId}`
- `${extract.token}`

```java
public interface VariableResolver {
    Object resolve(Object raw, ExecutionContext context);
}
```

---

# 8. 浏览器与 CDP 模块设计

## 8.1 模块边界

### cdp-client
负责：
- WebSocket 连接
- send(command)
- 收 event
- request/response 映射
- session attach

### browser-core
负责：
- SessionManager
- PageController
- NetworkObserver
- ConsoleObserver
- FrameTabManager

---

## 8.2 cdp-client 包结构建议

```text
libs/cdp-client/src/main/java/com/yourapp/cdp/
├─ client/
│  ├─ CdpClient.java
│  ├─ DefaultCdpClient.java
│  ├─ CdpConnection.java
│  └─ CdpRequestRegistry.java
├─ model/
│  ├─ CdpRequest.java
│  ├─ CdpResponse.java
│  ├─ CdpEvent.java
│  └─ CdpError.java
├─ codec/
│  └─ CdpMessageCodec.java
└─ event/
   └─ CdpEventDispatcher.java
```

---

## 8.3 CdpClient 接口

```java
public interface CdpClient {
    void connect(String wsUrl);
    void close();
    <T> T send(String method, Object params, Class<T> responseType);
    void addEventListener(String eventName, CdpEventListener listener);
    void removeEventListener(String eventName, CdpEventListener listener);
}
```

---

## 8.4 DefaultCdpClient 设计要点

- 使用 WebSocket
- 每个请求生成自增 id
- `ConcurrentHashMap<Long, CompletableFuture<?>>` 管理响应
- 收到 event 时分发给事件监听器
- 处理超时、异常关闭、非法响应

---

## 8.5 BrowserSessionManager

```java
public interface BrowserSessionManager {
    ExecutionSession create(SessionOptions options);
    Optional<ExecutionSession> findById(String sessionId);
    void close(String sessionId);
}
```

### 实现要点
- 启动 Edge 进程
- 指定 `--remote-debugging-port`
- 指定用户数据目录
- 连接调试 endpoint
- 记录 pid/port/endpoint

---

## 8.6 PageController

```java
public interface PageController {
    void navigate(String url, ExecutionContext context);
    void reload(ExecutionContext context);
    String currentUrl(ExecutionContext context);
    String title(ExecutionContext context);
    byte[] screenshot(ExecutionContext context, ScreenshotOptions options);
    String getHtml(ExecutionContext context);
}
```

---

## 8.7 ConsoleObserver / NetworkObserver

### ConsoleObserver
```java
public interface ConsoleObserver {
    List<ConsoleEvent> getEvents(ExecutionContext context);
    void start(ExecutionContext context);
    void stop(ExecutionContext context);
}
```

### NetworkObserver
```java
public interface NetworkObserver {
    List<NetworkEvent> getEvents(ExecutionContext context);
    void start(ExecutionContext context);
    void stop(ExecutionContext context);
}
```

---

# 9. 执行动作模块设计

## 9.1 模块目标

让每个动作具备统一执行链：

1. 解析 step
2. 解析变量
3. 定位元素
4. 前置检查
5. 执行动作
6. 后置校验
7. 输出标准化结果

---

## 9.2 ActionExecutor 设计

### 推荐抽象
- 总执行器：`ActionExecutor`
- 动作处理器：`StepActionHandler`

```java
public interface ActionExecutor {
    StepResult execute(StepDefinition step, ExecutionContext context);
}
```

```java
public interface StepActionHandler {
    boolean supports(ActionType actionType);
    StepResult handle(StepDefinition step, ExecutionContext context);
}
```

---

## 9.3 推荐 handler 列表

- `GotoActionHandler`
- `ClickActionHandler`
- `FillActionHandler`
- `TypeActionHandler`
- `SelectActionHandler`
- `HoverActionHandler`
- `UploadActionHandler`
- `WaitActionHandler`
- `AssertionActionHandler`
- `ArtifactActionHandler`
- `VariableActionHandler`

---

## 9.4 ClickActionHandler 示例骨架

```java
public class ClickActionHandler implements StepActionHandler {
    private final ElementResolver elementResolver;
    private final BrowserInteractionService browserInteractionService;

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.CLICK;
    }

    @Override
    public StepResult handle(StepDefinition step, ExecutionContext context) {
        ResolveResult result = elementResolver.resolve(step.getTarget(), context);
        browserInteractionService.click(result, context);
        return StepResult.success(step.getId(), "click success");
    }
}
```

---

# 10. 等待模块设计

## 10.1 设计原则

- 显式等待优先
- 事件优先 + 轮询兜底
- 统一超时
- 不允许散落 sleep
- 等待失败要有明确原因

---

## 10.2 WaitEngine 接口

```java
public interface WaitEngine {
    void waitForElement(TargetDefinition target, long timeoutMs, ExecutionContext context);
    void waitForVisible(TargetDefinition target, long timeoutMs, ExecutionContext context);
    void waitForHidden(TargetDefinition target, long timeoutMs, ExecutionContext context);
    void waitForText(TargetDefinition target, String expected, long timeoutMs, ExecutionContext context);
    void waitForUrl(String expected, long timeoutMs, ExecutionContext context);
    void waitForResponse(ResponsePredicate predicate, long timeoutMs, ExecutionContext context);
}
```

---

## 10.3 WaitStrategy

建议引入策略对象：

```java
public interface WaitStrategy<T> {
    T await(long timeoutMs) throws TimeoutException;
}
```

具体实现：
- `ElementPresentWaitStrategy`
- `ElementVisibleWaitStrategy`
- `TextMatchWaitStrategy`
- `UrlMatchWaitStrategy`
- `ResponseWaitStrategy`

---

# 11. 断言模块设计

## 11.1 AssertionEngine

```java
public interface AssertionEngine {
    AssertionResult assertStep(StepDefinition step, ExecutionContext context);
}
```

---

## 11.2 AssertionHandler 模式

```java
public interface AssertionHandler {
    boolean supports(ActionType actionType);
    AssertionResult handle(StepDefinition step, ExecutionContext context);
}
```

---

## 11.3 推荐断言处理器

- `AssertTextHandler`
- `AssertContainsHandler`
- `AssertVisibleHandler`
- `AssertValueHandler`
- `AssertUrlHandler`
- `AssertResponseHandler`
- `AssertDbHandler`
- `AssertConsoleNoErrorHandler`

---

## 11.4 AssertDbHandler 骨架

```java
public class AssertDbHandler implements AssertionHandler {
    private final DatasourceRegistry datasourceRegistry;
    private final DbAssertionService dbAssertionService;

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.ASSERT_DB;
    }

    @Override
    public AssertionResult handle(StepDefinition step, ExecutionContext context) {
        return dbAssertionService.assertDb(step, context);
    }
}
```

---

# 12. Artifact 与报告模块设计

## 12.1 ArtifactCollector 目标

贯穿整个执行链，在关键节点采集：
- step 前截图
- step 后截图
- 失败截图
- DOM 快照
- visible text
- console JSON
- network JSON

---

## 12.2 ArtifactCollector 接口

```java
public interface ArtifactCollector {
    void beforeRun(ExecutionContext context);
    void beforeStep(StepDefinition step, ExecutionContext context);
    void afterStep(StepDefinition step, ExecutionContext context, StepResult result);
    void onFailure(StepDefinition step, ExecutionContext context, Throwable throwable);
    void afterRun(ExecutionContext context);
}
```

---

## 12.3 ReportEngine

```java
public interface ReportEngine {
    Path generateRunReport(ExecutionContext context, List<StepExecutionRecord> stepRecords);
}
```

### 输出建议
- `report.json`
- `report.html`

---

## 12.4 HTML 报告渲染器
建议单独定义：
- `RunReportHtmlRenderer`
- `RunReportJsonWriter`

---

# 13. 数据源与 DB 断言模块设计

## 13.1 模块职责
- 管理数据源配置
- 建立 JDBC 连接
- 执行只读 SQL
- 映射结果
- 做字段比对
- 记录审计日志

---

## 13.2 DatasourceRegistry

```java
public interface DatasourceRegistry {
    Optional<DatasourceConfig> find(String name);
    void register(DatasourceConfig config);
}
```

---

## 13.3 QueryExecutor

```java
public interface QueryExecutor {
    List<Map<String, Object>> query(String datasourceName, String sql, Map<String, Object> params);
}
```

---

## 13.4 DbAssertionService

```java
public interface DbAssertionService {
    AssertionResult assertDb(StepDefinition step, ExecutionContext context);
}
```

---

## 13.5 企业级要求
- 默认只读连接
- SQL 模板白名单
- 敏感字段脱敏
- 审计日志持久化

---

# 14. Agent 模块设计

## 14.1 模块定位
Agent 不进入核心执行路径的“底层动作控制”，只做：
- 流程生成
- 建议
- 修复
- 分析

---

## 14.2 主要接口

```java
public interface AgentCoordinator {
    GeneratedCaseResult generateCaseFromPrompt(String prompt, AgentContext context);
    LocatorRepairSuggestion suggestLocatorRepair(LocatorFailureContext context);
    FailureAnalysisResult analyzeFailure(FailureAnalysisContext context);
}
```

---

## 14.3 LlmProvider 抽象

```java
public interface LlmProvider {
    LlmResponse generate(LlmRequest request);
}
```

支持后续接：
- 本地 HTTP 模型服务
- Ollama
- 自定义内网模型网关

---

# 15. Native Messaging Host 模块设计

## 15.1 模块职责
- 读取 stdin
- 写 stdout
- 解析 Native Messaging 消息
- 分发给 Java 核心服务
- 返回标准 JSON 响应

---

## 15.2 协议处理接口

```java
public interface NativeMessageProcessor {
    NativeResponse process(NativeRequest request);
}
```

---

## 15.3 Host 主程序职责
- 初始化核心平台
- 启动消息循环
- 解析消息长度头
- JSON 反序列化
- 调用 processor
- 输出响应

---

# 16. 管理 API 模块设计

建议提供本地 REST API 给 React 管理台使用。

---

## 16.1 推荐接口范围

### 项目管理
- `GET /api/projects`
- `POST /api/projects`

### 用例管理
- `GET /api/cases`
- `GET /api/cases/{id}`
- `POST /api/cases`
- `PUT /api/cases/{id}`

### 执行管理
- `POST /api/runs`
- `GET /api/runs/{id}`
- `GET /api/runs/{id}/report`

### 环境与数据源
- `GET /api/environments`
- `GET /api/datasources`

### Agent
- `POST /api/agent/generate-case`
- `POST /api/agent/analyze-failure`

---

# 17. 配置设计

## 17.1 application.yaml

```yaml
app:
  name: enterprise-web-test-platform
  run-base-dir: ./runs

browser:
  edge-path: C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe
  user-data-base-dir: ./runtime/edge-users
  headless: false
  default-timeout-ms: 10000

report:
  save-html: true
  save-json: true

security:
  mask-secrets-in-log: true
```

---

## 17.2 environment-sit.yaml

```yaml
name: sit
baseUrl: https://sit.example.com
variables:
  loginPath: /login
  homePath: /home
```

---

## 17.3 datasource-oracle-main.yaml

```yaml
name: oracle_main
type: oracle
jdbcUrl: jdbc:oracle:thin:@//host:1521/service
username: test_user
secretRef: secret.oracle_main.password
readonly: true
```

---

# 18. 包结构建议

## 18.1 apps/core-platform 包结构

```text
com.yourapp.platform
├─ bootstrap
├─ orchestrator
├─ service
├─ repository
├─ facade
└─ api
```

---

## 18.2 execution-engine 包结构

```text
com.yourapp.execution
├─ engine
├─ pipeline
├─ context
├─ result
├─ record
└─ policy
```

---

## 18.3 browser-core 包结构

```text
com.yourapp.browser
├─ session
├─ page
├─ interaction
├─ observer
├─ target
└─ frame
```

---

# 19. 核心接口代码骨架

下面给你一版首批最关键接口骨架。

---

## 19.1 TestOrchestrator

```java
public interface TestOrchestrator {
    RunResult execute(TestCaseDefinition definition, RunOptions options);
}
```

---

## 19.2 DefaultTestOrchestrator

```java
public class DefaultTestOrchestrator implements TestOrchestrator {

    private final DslParser dslParser;
    private final BrowserSessionManager browserSessionManager;
    private final ActionExecutor actionExecutor;
    private final ArtifactCollector artifactCollector;
    private final ReportEngine reportEngine;

    @Override
    public RunResult execute(TestCaseDefinition definition, RunOptions options) {
        // 1. 构建 ExecutionContext
        // 2. beforeRun artifact
        // 3. 创建 browser session
        // 4. 执行 beforeAll / steps / afterAll
        // 5. 汇总 StepExecutionRecord
        // 6. 生成报告
        // 7. 返回 RunResult
        return null;
    }
}
```

---

## 19.3 StepResult

```java
public class StepResult {
    private final String stepId;
    private final boolean success;
    private final String message;

    public static StepResult success(String stepId, String message) {
        return new StepResult(stepId, true, message);
    }

    public static StepResult failure(String stepId, String message) {
        return new StepResult(stepId, false, message);
    }

    public StepResult(String stepId, boolean success, String message) {
        this.stepId = stepId;
        this.success = success;
        this.message = message;
    }
}
```

---

## 19.4 RunResult

```java
public class RunResult {
    private String runId;
    private RunStatus status;
    private Path reportPath;
    private List<StepExecutionRecord> stepRecords;
}
```

---

## 19.5 BrowserInteractionService

```java
public interface BrowserInteractionService {
    void click(ResolveResult resolveResult, ExecutionContext context);
    void fill(ResolveResult resolveResult, String value, ExecutionContext context);
    void clear(ResolveResult resolveResult, ExecutionContext context);
    void hover(ResolveResult resolveResult, ExecutionContext context);
    void press(String key, ExecutionContext context);
}
```

---

## 19.6 ResolveResult

```java
public class ResolveResult {
    private boolean found;
    private boolean unique;
    private boolean visible;
    private boolean actionable;
    private String nodeId;
    private String backendNodeId;
    private String objectId;
    private String frameId;
    private double score;
    private List<String> matchedStrategies;
}
```

---

# 20. 首批类清单

## 20.1 第一批必须创建的类

### common
- `BaseException`
- `ErrorCode`
- `Jsons`
- `Ids`
- `TimeUtils`

### dsl
- `TestCaseDefinition`
- `StepDefinition`
- `TargetDefinition`
- `ActionType`
- `DslParser`
- `DslValidator`

### execution
- `ExecutionContext`
- `RunOptions`
- `RunResult`
- `StepResult`
- `DefaultTestOrchestrator`

### cdp
- `CdpClient`
- `DefaultCdpClient`
- `CdpEvent`
- `CdpRequest`
- `CdpResponse`

### browser
- `BrowserSessionManager`
- `DefaultBrowserSessionManager`
- `PageController`
- `DefaultPageController`
- `ConsoleObserver`
- `NetworkObserver`

### locator
- `ElementResolver`
- `DefaultElementResolver`
- `ResolveResult`

### action
- `ActionExecutor`
- `DefaultActionExecutor`
- `StepActionHandler`
- `GotoActionHandler`
- `ClickActionHandler`
- `FillActionHandler`
- `WaitActionHandler`
- `AssertionActionHandler`

### wait
- `WaitEngine`
- `DefaultWaitEngine`

### assertion
- `AssertionEngine`
- `DefaultAssertionEngine`
- `AssertionHandler`
- `AssertTextHandler`
- `AssertVisibleHandler`
- `AssertUrlHandler`

### artifact
- `ArtifactCollector`
- `DefaultArtifactCollector`

### report
- `ReportEngine`
- `DefaultReportEngine`

### native
- `NativeMessageProcessor`
- `NativeHostApp`

---

# 21. 首批开发顺序

这是最重要的实际开工顺序。

---

## 第 1 步：先打通最小浏览器链路
先写：
- `DefaultBrowserSessionManager`
- `DefaultCdpClient`
- `DefaultPageController`

目标：
- 启动 Edge
- 连接 CDP
- 打开页面
- 截图

完成标准：
- 能通过 Java 程序打开一个 URL 并保存截图

---

## 第 2 步：做 DSL 与 Orchestrator 骨架
写：
- `dsl-model`
- `dsl-parser`
- `ExecutionContext`
- `DefaultTestOrchestrator`

目标：
- 读取一份 JSON DSL
- 顺序执行 step
- 写出 step 记录

---

## 第 3 步：做基础定位与基础动作
写：
- `DefaultElementResolver`
- `ClickActionHandler`
- `FillActionHandler`
- `GotoActionHandler`

目标：
- 完成 `goto -> fill -> fill -> click`

---

## 第 4 步：做等待
写：
- `DefaultWaitEngine`
- `WaitActionHandler`

目标：
- 支持 `waitForElement`
- 支持 `waitForVisible`
- 支持 `waitForUrl`

---

## 第 5 步：做断言
写：
- `DefaultAssertionEngine`
- `AssertTextHandler`
- `AssertVisibleHandler`
- `AssertUrlHandler`

目标：
- 跑通登录成功和失败两个案例

---

## 第 6 步：做 Artifact 与报告
写：
- `DefaultArtifactCollector`
- `DefaultReportEngine`

目标：
- 每步前后有截图
- 失败有 DOM 快照
- HTML 报告能查看失败步骤

---

## 第 7 步：接 Native Messaging
写：
- `NativeHostApp`
- `NativeMessageProcessor`

目标：
- Edge 插件能给本地平台发消息
- 本地平台能返回当前页面分析结果

---

## 第 8 步：接 DB 断言
写：
- `DatasourceRegistry`
- `QueryExecutor`
- `DbAssertionService`
- `AssertDbHandler`

---

## 第 9 步：接 Agent
写：
- `AgentCoordinator`
- `LlmProvider`
- `FailureAnalyzer`
- `LocatorRepairAdvisor`

---

# 22. 单元测试与集成测试策略

## 22.1 单元测试
重点测：
- DSL 校验
- 变量替换
- 断言逻辑
- 定位器评分
- 报告渲染
- SQL 参数绑定

---

## 22.2 集成测试
重点测：
- Edge 启动和 CDP 连接
- 打开本地测试页面
- 执行 click/fill/wait/assert
- 截图输出
- DB 查询断言

---

## 22.3 推荐测试分层

### 层 1
纯 JVM 单元测试

### 层 2
带本地模拟 HTML 页面的浏览器集成测试

### 层 3
带真实 SIT/UAT 的端到端测试

---

# 23. 代码规范建议

## 23.1 必须统一的规范
- 所有模块统一异常体系
- 所有 step 执行必须带日志上下文
- 所有公共接口必须写 JavaDoc
- 所有 handler 必须无状态或状态可控
- 所有配置类必须集中管理，不允许魔法字符串散落

---

## 23.2 日志规范
日志建议统一包含：
- runId
- sessionId
- stepId
- action
- target summary

---

## 23.3 错误码规范
定义统一错误码：
- `CDP_CONNECT_TIMEOUT`
- `ELEMENT_NOT_FOUND`
- `ELEMENT_NOT_VISIBLE`
- `ACTION_EXECUTION_FAILED`
- `ASSERTION_FAILED`
- `DB_ASSERTION_FAILED`
- `REPORT_GENERATION_FAILED`

---

# 24. 风险点与工程建议

## 24.1 不要一开始就做过多抽象
先把：
- goto
- fill
- click
- wait
- assertText
- screenshot

打通，再收敛抽象。

---

## 24.2 不要把 Agent 放进主执行环
Agent 结果必须经过：
- schema 校验
- 语义校验
- 安全限制
- 运行前校验

---

## 24.3 先保 Edge 单浏览器稳定
不要一开始追求多浏览器统一。

---

## 24.4 先把定位和等待做好
这是系统稳定性的根基，比任何 Agent 功能都重要。

---

## 24.5 首批里先不追求视觉 AI
先把：
- DOM
- text
- response
- console
- DB

这些确定性能力做好。

---

# 附录 A：首批最小可执行用例

```json
{
  "id": "case_login_error_001",
  "name": "登录失败-密码错误",
  "env": "sit",
  "baseUrl": "https://example.com",
  "vars": {
    "username": "admin",
    "password": "wrongpass"
  },
  "steps": [
    {
      "action": "goto",
      "url": "${baseUrl}/login"
    },
    {
      "action": "fill",
      "target": { "by": "label", "value": "用户名" },
      "value": "${username}"
    },
    {
      "action": "fill",
      "target": { "by": "label", "value": "密码" },
      "value": "${password}"
    },
    {
      "action": "click",
      "target": { "by": "role", "value": "button", "name": "登录" }
    },
    {
      "action": "waitForVisible",
      "target": { "by": "css", "value": ".error-msg" }
    },
    {
      "action": "assertText",
      "target": { "by": "css", "value": ".error-msg" },
      "expected": "用户名或密码错误"
    },
    {
      "action": "screenshot",
      "name": "login_error"
    }
  ]
}
```

---

# 附录 B：建议下一份文档

下一份最适合继续补的是：

1. **Java 代码骨架文档**  
   直接给出：
   - `DefaultCdpClient`
   - `DefaultBrowserSessionManager`
   - `DefaultTestOrchestrator`
   - `DefaultActionExecutor`
   - `DefaultWaitEngine`
   - `DefaultAssertionEngine`
   的样板代码。

2. **CDP 域封装文档**  
   重点写：
   - Page 域
   - Runtime 域
   - DOM 域
   - Input 域
   - Network 域
   的 Java 封装接口。

3. **Edge 插件协议文档**  
   写清：
   - 消息类型
   - 请求体
   - 响应体
   - 错误码
   - 生命周期。

---

**文档结束**
