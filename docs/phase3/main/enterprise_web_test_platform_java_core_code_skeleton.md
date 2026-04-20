# 企业级网页自动化测试平台（三期 Java 核心代码骨架文档）
**版本**: v1.0  
**定位**: 提供可直接落地的 Java 核心代码骨架设计，覆盖 **关键类、接口、样板代码、模块间调用关系、首批最小可运行骨架**  
**前置文档**:  
- `enterprise_web_test_platform_tech_design.md`  
- `enterprise_web_test_platform_phase2_implementation_design.md`

---

# 目录

1. 文档目标  
2. 本期输出范围  
3. 统一设计原则  
4. 基础依赖建议  
5. common-core 代码骨架  
6. dsl-model / dsl-parser 代码骨架  
7. execution-context 代码骨架  
8. cdp-client 代码骨架  
9. browser-core 代码骨架  
10. locator-engine 代码骨架  
11. action-engine 代码骨架  
12. wait-engine 代码骨架  
13. assertion-engine 代码骨架  
14. artifact-engine 代码骨架  
15. report-engine 代码骨架  
16. datasource-engine 代码骨架  
17. execution-engine 代码骨架  
18. native-messaging 代码骨架  
19. apps 模块骨架  
20. 首批最小可运行链路  
21. 首批开发建议顺序  

---

# 1. 文档目标

这份文档不是讲概念，而是直接把关键 Java 代码骨架列出来，让你可以：

- 直接创建 Gradle 多模块工程
- 按模块把类文件建起来
- 按顺序填实现
- 快速打通最小可运行链路

本文件重点是：
- 类名
- 接口
- 字段
- 方法签名
- 模块关系
- 首批默认实现骨架

不追求一次性给出完整生产级实现，但追求：

> **开箱即可作为项目脚手架使用**

---

# 2. 本期输出范围

本期提供：
- 关键 POJO / enum / result 类
- 关键 service / engine / handler 接口
- 默认实现类骨架
- 各模块建议的 package 结构
- 最小 run 链路样板代码

本期不提供：
- 完整 HTML 报告模板
- 完整 CDP 域协议细节
- 完整插件端代码
- 完整前端管理台

---

# 3. 统一设计原则

## 3.1 接口 + 默认实现
所有核心能力优先设计：
- `interface`
- `DefaultXxx`

这样便于：
- 后续替换实现
- 单元测试 mock
- 按浏览器/协议扩展

## 3.2 小而清晰的 Result 对象
不建议大量返回裸 `boolean`。  
建议统一返回：
- `StepResult`
- `AssertionResult`
- `RunResult`
- `ResolveResult`

## 3.3 不在低层模块做太多业务判断
例如：
- `cdp-client` 不要知道 DSL
- `browser-core` 不要知道测试报告
- `locator-engine` 不要知道数据库

## 3.4 先让骨架通，再逐步丰富
优先保证：
- 能启动
- 能执行
- 能记录
- 能失败
- 能报告

---

# 4. 基础依赖建议

## 4.1 根 build.gradle.kts 建议

```kotlin
plugins {
    base
}

allprojects {
    group = "com.yourapp"
    version = "1.0.0-SNAPSHOT"

    repositories {
        mavenCentral()
    }
}

subprojects {
    apply(plugin = "java")

    java {
        toolchain {
            languageVersion.set(JavaLanguageVersion.of(21))
        }
    }

    dependencies {
        testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
        testImplementation("org.assertj:assertj-core:3.25.3")
    }

    tasks.test {
        useJUnitPlatform()
    }
}
```

---

## 4.2 通用依赖建议

推荐在需要的模块中引入：

```kotlin
dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.1")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.17.1")
    implementation("org.slf4j:slf4j-api:2.0.13")
    runtimeOnly("ch.qos.logback:logback-classic:1.5.6")
}
```

JDBC 模块再单独引入数据库驱动。

---

# 5. common-core 代码骨架

推荐 package：

```text
com.yourapp.common
├─ exception
├─ json
├─ ids
├─ time
└─ result
```

---

## 5.1 BaseException

```java
package com.yourapp.common.exception;

public class BaseException extends RuntimeException {
    private final String code;

    public BaseException(String code, String message) {
        super(message);
        this.code = code;
    }

    public BaseException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
```

---

## 5.2 ErrorCodes

```java
package com.yourapp.common.exception;

public final class ErrorCodes {
    private ErrorCodes() {}

    public static final String CDP_CONNECT_TIMEOUT = "CDP_CONNECT_TIMEOUT";
    public static final String CDP_REQUEST_FAILED = "CDP_REQUEST_FAILED";
    public static final String ELEMENT_NOT_FOUND = "ELEMENT_NOT_FOUND";
    public static final String ELEMENT_NOT_VISIBLE = "ELEMENT_NOT_VISIBLE";
    public static final String ACTION_EXECUTION_FAILED = "ACTION_EXECUTION_FAILED";
    public static final String ASSERTION_FAILED = "ASSERTION_FAILED";
    public static final String DB_ASSERTION_FAILED = "DB_ASSERTION_FAILED";
    public static final String REPORT_GENERATION_FAILED = "REPORT_GENERATION_FAILED";
    public static final String DSL_VALIDATION_FAILED = "DSL_VALIDATION_FAILED";
}
```

---

## 5.3 Ids

```java
package com.yourapp.common.ids;

import java.util.UUID;

public final class Ids {
    private Ids() {}

    public static String uuid() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
```

---

## 5.4 Jsons

```java
package com.yourapp.common.json;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

public final class Jsons {
    private Jsons() {}

    public static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public static final ObjectMapper YAML = new ObjectMapper(new YAMLFactory())
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
}
```

---

# 6. dsl-model / dsl-parser 代码骨架

推荐 package：

```text
com.yourapp.dsl
├─ model
├─ parser
└─ validator
```

---

## 6.1 ActionType

```java
package com.yourapp.dsl.model;

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

## 6.2 TestCaseDefinition

```java
package com.yourapp.dsl.model;

import java.util.List;
import java.util.Map;

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getEnv() { return env; }
    public void setEnv(String env) { this.env = env; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public Map<String, Object> getVars() { return vars; }
    public void setVars(Map<String, Object> vars) { this.vars = vars; }

    public List<StepDefinition> getBeforeAll() { return beforeAll; }
    public void setBeforeAll(List<StepDefinition> beforeAll) { this.beforeAll = beforeAll; }

    public List<StepDefinition> getSteps() { return steps; }
    public void setSteps(List<StepDefinition> steps) { this.steps = steps; }

    public List<StepDefinition> getAfterAll() { return afterAll; }
    public void setAfterAll(List<StepDefinition> afterAll) { this.afterAll = afterAll; }

    public AssertPolicy getAssertPolicy() { return assertPolicy; }
    public void setAssertPolicy(AssertPolicy assertPolicy) { this.assertPolicy = assertPolicy; }

    public ReportPolicy getReportPolicy() { return reportPolicy; }
    public void setReportPolicy(ReportPolicy reportPolicy) { this.reportPolicy = reportPolicy; }
}
```

---

## 6.3 StepDefinition

```java
package com.yourapp.dsl.model;

import java.util.Map;

public class StepDefinition {
    private String id;
    private String name;
    private ActionType action;
    private TargetDefinition target;
    private Object value;
    private String expected;
    private String url;
    private Long timeoutMs;
    private RetryPolicy retry;
    private FailurePolicy onFailure;
    private Map<String, Object> extra;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ActionType getAction() { return action; }
    public void setAction(ActionType action) { this.action = action; }

    public TargetDefinition getTarget() { return target; }
    public void setTarget(TargetDefinition target) { this.target = target; }

    public Object getValue() { return value; }
    public void setValue(Object value) { this.value = value; }

    public String getExpected() { return expected; }
    public void setExpected(String expected) { this.expected = expected; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Long getTimeoutMs() { return timeoutMs; }
    public void setTimeoutMs(Long timeoutMs) { this.timeoutMs = timeoutMs; }

    public RetryPolicy getRetry() { return retry; }
    public void setRetry(RetryPolicy retry) { this.retry = retry; }

    public FailurePolicy getOnFailure() { return onFailure; }
    public void setOnFailure(FailurePolicy onFailure) { this.onFailure = onFailure; }

    public Map<String, Object> getExtra() { return extra; }
    public void setExtra(Map<String, Object> extra) { this.extra = extra; }
}
```

---

## 6.4 TargetDefinition

```java
package com.yourapp.dsl.model;

import java.util.List;

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

    public String getBy() { return by; }
    public void setBy(String by) { this.by = by; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getIndex() { return index; }
    public void setIndex(Integer index) { this.index = index; }

    public String getTextMatch() { return textMatch; }
    public void setTextMatch(String textMatch) { this.textMatch = textMatch; }

    public List<TargetAlternative> getAlternatives() { return alternatives; }
    public void setAlternatives(List<TargetAlternative> alternatives) { this.alternatives = alternatives; }

    public String getFrame() { return frame; }
    public void setFrame(String frame) { this.frame = frame; }

    public Boolean getShadow() { return shadow; }
    public void setShadow(Boolean shadow) { this.shadow = shadow; }
}
```

---

## 6.5 DslParser

```java
package com.yourapp.dsl.parser;

import com.yourapp.dsl.model.TestCaseDefinition;
import java.nio.file.Path;

public interface DslParser {
    TestCaseDefinition parse(Path path);
    TestCaseDefinition parseJson(String json);
}
```

---

## 6.6 DefaultDslParser

```java
package com.yourapp.dsl.parser;

import com.yourapp.common.json.Jsons;
import com.yourapp.dsl.model.TestCaseDefinition;
import com.yourapp.dsl.validator.DslValidator;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class DefaultDslParser implements DslParser {

    private final DslValidator validator;

    public DefaultDslParser(DslValidator validator) {
        this.validator = validator;
    }

    @Override
    public TestCaseDefinition parse(Path path) {
        try {
            String content = Files.readString(path);
            TestCaseDefinition definition = Jsons.JSON.readValue(content, TestCaseDefinition.class);
            validator.validate(definition);
            return definition;
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse dsl file: " + path, e);
        }
    }

    @Override
    public TestCaseDefinition parseJson(String json) {
        try {
            TestCaseDefinition definition = Jsons.JSON.readValue(json, TestCaseDefinition.class);
            validator.validate(definition);
            return definition;
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse dsl json", e);
        }
    }
}
```

---

## 6.7 DslValidator

```java
package com.yourapp.dsl.validator;

import com.yourapp.dsl.model.TestCaseDefinition;

public interface DslValidator {
    void validate(TestCaseDefinition definition);
}
```

---

## 6.8 DefaultDslValidator

```java
package com.yourapp.dsl.validator;

import com.yourapp.common.exception.BaseException;
import com.yourapp.common.exception.ErrorCodes;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.dsl.model.TestCaseDefinition;

public class DefaultDslValidator implements DslValidator {

    @Override
    public void validate(TestCaseDefinition definition) {
        if (definition == null) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Definition is null");
        }
        if (definition.getSteps() == null || definition.getSteps().isEmpty()) {
            throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Steps must not be empty");
        }

        for (StepDefinition step : definition.getSteps()) {
            if (step.getAction() == null) {
                throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Step action is required");
            }
            if (step.getAction() == ActionType.GOTO && (step.getUrl() == null || step.getUrl().isBlank())) {
                throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Goto step requires url");
            }
            if ((step.getAction() == ActionType.CLICK || step.getAction() == ActionType.FILL)
                    && step.getTarget() == null) {
                throw new BaseException(ErrorCodes.DSL_VALIDATION_FAILED, "Target is required for click/fill");
            }
        }
    }
}
```

---

# 7. execution-context 代码骨架

推荐 package：

```text
com.yourapp.execution.context
├─ model
├─ variable
└─ policy
```

---

## 7.1 ExecutionContext

```java
package com.yourapp.execution.context;

import com.yourapp.browser.session.ExecutionSession;
import com.yourapp.browser.observer.ConsoleEvent;
import com.yourapp.browser.observer.NetworkEvent;
import com.yourapp.dsl.model.TestCaseDefinition;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ExecutionContext {
    private String runId;
    private TestCaseDefinition testCase;
    private Map<String, Object> variables = new HashMap<>();
    private ExecutionSession session;
    private Path runOutputDir;
    private String currentStepId;
    private String currentTargetId;
    private String currentFrameId;
    private final List<ConsoleEvent> consoleEvents = new ArrayList<>();
    private final List<NetworkEvent> networkEvents = new ArrayList<>();

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public TestCaseDefinition getTestCase() { return testCase; }
    public void setTestCase(TestCaseDefinition testCase) { this.testCase = testCase; }

    public Map<String, Object> getVariables() { return variables; }
    public void setVariables(Map<String, Object> variables) { this.variables = variables; }

    public ExecutionSession getSession() { return session; }
    public void setSession(ExecutionSession session) { this.session = session; }

    public Path getRunOutputDir() { return runOutputDir; }
    public void setRunOutputDir(Path runOutputDir) { this.runOutputDir = runOutputDir; }

    public String getCurrentStepId() { return currentStepId; }
    public void setCurrentStepId(String currentStepId) { this.currentStepId = currentStepId; }

    public String getCurrentTargetId() { return currentTargetId; }
    public void setCurrentTargetId(String currentTargetId) { this.currentTargetId = currentTargetId; }

    public String getCurrentFrameId() { return currentFrameId; }
    public void setCurrentFrameId(String currentFrameId) { this.currentFrameId = currentFrameId; }

    public List<ConsoleEvent> getConsoleEvents() { return consoleEvents; }

    public List<NetworkEvent> getNetworkEvents() { return networkEvents; }
}
```

---

## 7.2 VariableResolver

```java
package com.yourapp.execution.context.variable;

import com.yourapp.execution.context.ExecutionContext;

public interface VariableResolver {
    Object resolve(Object raw, ExecutionContext context);
}
```

---

## 7.3 DefaultVariableResolver

```java
package com.yourapp.execution.context.variable;

import com.yourapp.execution.context.ExecutionContext;

import java.util.Map;

public class DefaultVariableResolver implements VariableResolver {

    @Override
    public Object resolve(Object raw, ExecutionContext context) {
        if (!(raw instanceof String s)) {
            return raw;
        }
        if (!s.startsWith("${") || !s.endsWith("}")) {
            return raw;
        }
        String key = s.substring(2, s.length() - 1);
        Map<String, Object> vars = context.getVariables();
        return vars.getOrDefault(key, raw);
    }
}
```

---

# 8. cdp-client 代码骨架

推荐 package：

```text
com.yourapp.cdp
├─ client
├─ model
└─ event
```

---

## 8.1 CdpRequest / CdpResponse / CdpEvent

```java
package com.yourapp.cdp.model;

public class CdpRequest {
    private long id;
    private String method;
    private Object params;

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public Object getParams() { return params; }
    public void setParams(Object params) { this.params = params; }
}
```

```java
package com.yourapp.cdp.model;

public class CdpResponse<T> {
    private long id;
    private T result;
    private Object error;

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public T getResult() { return result; }
    public void setResult(T result) { this.result = result; }

    public Object getError() { return error; }
    public void setError(Object error) { this.error = error; }
}
```

```java
package com.yourapp.cdp.model;

public class CdpEvent {
    private String method;
    private Object params;

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public Object getParams() { return params; }
    public void setParams(Object params) { this.params = params; }
}
```

---

## 8.2 CdpEventListener

```java
package com.yourapp.cdp.event;

public interface CdpEventListener {
    void onEvent(String eventName, Object params);
}
```

---

## 8.3 CdpClient

```java
package com.yourapp.cdp.client;

import com.yourapp.cdp.event.CdpEventListener;

public interface CdpClient {
    void connect(String wsUrl);
    void close();
    <T> T send(String method, Object params, Class<T> responseType);
    void addEventListener(String eventName, CdpEventListener listener);
    void removeEventListener(String eventName, CdpEventListener listener);
}
```

---

## 8.4 DefaultCdpClient（骨架）

```java
package com.yourapp.cdp.client;

import com.yourapp.cdp.event.CdpEventListener;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class DefaultCdpClient implements CdpClient {

    private final Map<String, List<CdpEventListener>> listeners = new ConcurrentHashMap<>();

    @Override
    public void connect(String wsUrl) {
        // TODO connect websocket
    }

    @Override
    public void close() {
        // TODO close websocket
    }

    @Override
    public <T> T send(String method, Object params, Class<T> responseType) {
        // TODO send request and wait response
        return null;
    }

    @Override
    public void addEventListener(String eventName, CdpEventListener listener) {
        listeners.computeIfAbsent(eventName, k -> new java.util.concurrent.CopyOnWriteArrayList<>())
                .add(listener);
    }

    @Override
    public void removeEventListener(String eventName, CdpEventListener listener) {
        List<CdpEventListener> list = listeners.get(eventName);
        if (list != null) {
            list.remove(listener);
        }
    }
}
```

---

# 9. browser-core 代码骨架

推荐 package：

```text
com.yourapp.browser
├─ session
├─ page
├─ observer
└─ interaction
```

---

## 9.1 ExecutionSession

```java
package com.yourapp.browser.session;

public class ExecutionSession {
    private String sessionId;
    private String browserProcessId;
    private Integer debugPort;
    private String wsEndpoint;
    private String currentTargetId;
    private String currentFrameId;
    private SessionStatus status;

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getBrowserProcessId() { return browserProcessId; }
    public void setBrowserProcessId(String browserProcessId) { this.browserProcessId = browserProcessId; }

    public Integer getDebugPort() { return debugPort; }
    public void setDebugPort(Integer debugPort) { this.debugPort = debugPort; }

    public String getWsEndpoint() { return wsEndpoint; }
    public void setWsEndpoint(String wsEndpoint) { this.wsEndpoint = wsEndpoint; }

    public String getCurrentTargetId() { return currentTargetId; }
    public void setCurrentTargetId(String currentTargetId) { this.currentTargetId = currentTargetId; }

    public String getCurrentFrameId() { return currentFrameId; }
    public void setCurrentFrameId(String currentFrameId) { this.currentFrameId = currentFrameId; }

    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }
}
```

```java
package com.yourapp.browser.session;

public enum SessionStatus {
    CREATED,
    CONNECTED,
    RUNNING,
    CLOSED,
    FAILED
}
```

---

## 9.2 BrowserSessionManager

```java
package com.yourapp.browser.session;

import java.util.Optional;

public interface BrowserSessionManager {
    ExecutionSession create(SessionOptions options);
    Optional<ExecutionSession> findById(String sessionId);
    void close(String sessionId);
}
```

---

## 9.3 SessionOptions

```java
package com.yourapp.browser.session;

public class SessionOptions {
    private String edgeExecutable;
    private boolean headless;
    private String userDataDir;
    private Integer debugPort;
    private String initialUrl;

    public String getEdgeExecutable() { return edgeExecutable; }
    public void setEdgeExecutable(String edgeExecutable) { this.edgeExecutable = edgeExecutable; }

    public boolean isHeadless() { return headless; }
    public void setHeadless(boolean headless) { this.headless = headless; }

    public String getUserDataDir() { return userDataDir; }
    public void setUserDataDir(String userDataDir) { this.userDataDir = userDataDir; }

    public Integer getDebugPort() { return debugPort; }
    public void setDebugPort(Integer debugPort) { this.debugPort = debugPort; }

    public String getInitialUrl() { return initialUrl; }
    public void setInitialUrl(String initialUrl) { this.initialUrl = initialUrl; }
}
```

---

## 9.4 DefaultBrowserSessionManager（骨架）

```java
package com.yourapp.browser.session;

import com.yourapp.common.ids.Ids;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class DefaultBrowserSessionManager implements BrowserSessionManager {

    private final Map<String, ExecutionSession> sessions = new ConcurrentHashMap<>();

    @Override
    public ExecutionSession create(SessionOptions options) {
        ExecutionSession session = new ExecutionSession();
        session.setSessionId(Ids.uuid());
        session.setDebugPort(options.getDebugPort());
        session.setStatus(SessionStatus.CREATED);

        // TODO start Edge process
        // TODO query devtools endpoint
        // TODO attach target

        sessions.put(session.getSessionId(), session);
        return session;
    }

    @Override
    public Optional<ExecutionSession> findById(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    @Override
    public void close(String sessionId) {
        ExecutionSession session = sessions.remove(sessionId);
        if (session != null) {
            session.setStatus(SessionStatus.CLOSED);
            // TODO destroy process
        }
    }
}
```

---

## 9.5 PageController

```java
package com.yourapp.browser.page;

import com.yourapp.execution.context.ExecutionContext;

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

## 9.6 ScreenshotOptions

```java
package com.yourapp.browser.page;

public class ScreenshotOptions {
    private boolean fullPage = true;
    private String format = "png";

    public boolean isFullPage() { return fullPage; }
    public void setFullPage(boolean fullPage) { this.fullPage = fullPage; }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
}
```

---

## 9.7 DefaultPageController（骨架）

```java
package com.yourapp.browser.page;

import com.yourapp.cdp.client.CdpClient;
import com.yourapp.execution.context.ExecutionContext;

public class DefaultPageController implements PageController {

    private final CdpClient cdpClient;

    public DefaultPageController(CdpClient cdpClient) {
        this.cdpClient = cdpClient;
    }

    @Override
    public void navigate(String url, ExecutionContext context) {
        // TODO Page.navigate
    }

    @Override
    public void reload(ExecutionContext context) {
        // TODO Page.reload
    }

    @Override
    public String currentUrl(ExecutionContext context) {
        // TODO Runtime.evaluate location.href
        return null;
    }

    @Override
    public String title(ExecutionContext context) {
        // TODO Runtime.evaluate document.title
        return null;
    }

    @Override
    public byte[] screenshot(ExecutionContext context, ScreenshotOptions options) {
        // TODO Page.captureScreenshot
        return new byte[0];
    }

    @Override
    public String getHtml(ExecutionContext context) {
        // TODO Runtime.evaluate document.documentElement.outerHTML
        return "";
    }
}
```

---

## 9.8 ConsoleEvent / NetworkEvent

```java
package com.yourapp.browser.observer;

import java.time.Instant;

public class ConsoleEvent {
    private Instant time;
    private String level;
    private String message;

    public Instant getTime() { return time; }
    public void setTime(Instant time) { this.time = time; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
```

```java
package com.yourapp.browser.observer;

import java.time.Instant;

public class NetworkEvent {
    private Instant time;
    private String url;
    private String method;
    private Integer status;
    private Long durationMs;

    public Instant getTime() { return time; }
    public void setTime(Instant time) { this.time = time; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }
}
```

---

# 10. locator-engine 代码骨架

推荐 package：

```text
com.yourapp.locator
├─ resolver
├─ score
└─ model
```

---

## 10.1 ResolveResult

```java
package com.yourapp.locator.model;

import java.util.List;

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

    public boolean isFound() { return found; }
    public void setFound(boolean found) { this.found = found; }

    public boolean isUnique() { return unique; }
    public void setUnique(boolean unique) { this.unique = unique; }

    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }

    public boolean isActionable() { return actionable; }
    public void setActionable(boolean actionable) { this.actionable = actionable; }

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }

    public String getBackendNodeId() { return backendNodeId; }
    public void setBackendNodeId(String backendNodeId) { this.backendNodeId = backendNodeId; }

    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }

    public String getFrameId() { return frameId; }
    public void setFrameId(String frameId) { this.frameId = frameId; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public List<String> getMatchedStrategies() { return matchedStrategies; }
    public void setMatchedStrategies(List<String> matchedStrategies) { this.matchedStrategies = matchedStrategies; }
}
```

---

## 10.2 ElementResolver

```java
package com.yourapp.locator.resolver;

import com.yourapp.dsl.model.TargetDefinition;
import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.locator.model.ResolveResult;

public interface ElementResolver {
    ResolveResult resolve(TargetDefinition target, ExecutionContext context);
}
```

---

## 10.3 DefaultElementResolver（骨架）

```java
package com.yourapp.locator.resolver;

import com.yourapp.dsl.model.TargetDefinition;
import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.locator.model.ResolveResult;

public class DefaultElementResolver implements ElementResolver {

    @Override
    public ResolveResult resolve(TargetDefinition target, ExecutionContext context) {
        ResolveResult result = new ResolveResult();
        // TODO try by target.by
        // TODO try alternatives
        // TODO calculate score
        result.setFound(false);
        return result;
    }
}
```

---

# 11. action-engine 代码骨架

推荐 package：

```text
com.yourapp.action
├─ executor
├─ handler
└─ result
```

---

## 11.1 StepResult

```java
package com.yourapp.action.result;

public class StepResult {
    private final String stepId;
    private final boolean success;
    private final String message;

    public StepResult(String stepId, boolean success, String message) {
        this.stepId = stepId;
        this.success = success;
        this.message = message;
    }

    public static StepResult success(String stepId, String message) {
        return new StepResult(stepId, true, message);
    }

    public static StepResult failure(String stepId, String message) {
        return new StepResult(stepId, false, message);
    }

    public String getStepId() { return stepId; }
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
}
```

---

## 11.2 ActionExecutor

```java
package com.yourapp.action.executor;

import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface ActionExecutor {
    StepResult execute(StepDefinition step, ExecutionContext context);
}
```

---

## 11.3 StepActionHandler

```java
package com.yourapp.action.handler;

import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface StepActionHandler {
    boolean supports(ActionType actionType);
    StepResult handle(StepDefinition step, ExecutionContext context);
}
```

---

## 11.4 DefaultActionExecutor

```java
package com.yourapp.action.executor;

import com.yourapp.action.handler.StepActionHandler;
import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

import java.util.List;

public class DefaultActionExecutor implements ActionExecutor {

    private final List<StepActionHandler> handlers;

    public DefaultActionExecutor(List<StepActionHandler> handlers) {
        this.handlers = handlers;
    }

    @Override
    public StepResult execute(StepDefinition step, ExecutionContext context) {
        for (StepActionHandler handler : handlers) {
            if (handler.supports(step.getAction())) {
                return handler.handle(step, context);
            }
        }
        return StepResult.failure(step.getId(), "No handler found for action: " + step.getAction());
    }
}
```

---

## 11.5 BrowserInteractionService

```java
package com.yourapp.action.handler;

import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.locator.model.ResolveResult;

public interface BrowserInteractionService {
    void click(ResolveResult resolveResult, ExecutionContext context);
    void fill(ResolveResult resolveResult, String value, ExecutionContext context);
    void clear(ResolveResult resolveResult, ExecutionContext context);
    void hover(ResolveResult resolveResult, ExecutionContext context);
    void press(String key, ExecutionContext context);
}
```

---

## 11.6 GotoActionHandler

```java
package com.yourapp.action.handler;

import com.yourapp.action.result.StepResult;
import com.yourapp.browser.page.PageController;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public class GotoActionHandler implements StepActionHandler {

    private final PageController pageController;

    public GotoActionHandler(PageController pageController) {
        this.pageController = pageController;
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.GOTO;
    }

    @Override
    public StepResult handle(StepDefinition step, ExecutionContext context) {
        pageController.navigate(step.getUrl(), context);
        return StepResult.success(step.getId(), "goto success");
    }
}
```

---

## 11.7 ClickActionHandler

```java
package com.yourapp.action.handler;

import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.locator.model.ResolveResult;
import com.yourapp.locator.resolver.ElementResolver;

public class ClickActionHandler implements StepActionHandler {

    private final ElementResolver elementResolver;
    private final BrowserInteractionService browserInteractionService;

    public ClickActionHandler(ElementResolver elementResolver,
                              BrowserInteractionService browserInteractionService) {
        this.elementResolver = elementResolver;
        this.browserInteractionService = browserInteractionService;
    }

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

## 11.8 FillActionHandler

```java
package com.yourapp.action.handler;

import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.execution.context.variable.VariableResolver;
import com.yourapp.locator.model.ResolveResult;
import com.yourapp.locator.resolver.ElementResolver;

public class FillActionHandler implements StepActionHandler {

    private final ElementResolver elementResolver;
    private final BrowserInteractionService browserInteractionService;
    private final VariableResolver variableResolver;

    public FillActionHandler(ElementResolver elementResolver,
                             BrowserInteractionService browserInteractionService,
                             VariableResolver variableResolver) {
        this.elementResolver = elementResolver;
        this.browserInteractionService = browserInteractionService;
        this.variableResolver = variableResolver;
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.FILL;
    }

    @Override
    public StepResult handle(StepDefinition step, ExecutionContext context) {
        ResolveResult result = elementResolver.resolve(step.getTarget(), context);
        Object value = variableResolver.resolve(step.getValue(), context);
        browserInteractionService.fill(result, String.valueOf(value), context);
        return StepResult.success(step.getId(), "fill success");
    }
}
```

---

# 12. wait-engine 代码骨架

推荐 package：

```text
com.yourapp.wait
├─ engine
└─ strategy
```

---

## 12.1 WaitEngine

```java
package com.yourapp.wait.engine;

import com.yourapp.dsl.model.TargetDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface WaitEngine {
    void waitForElement(TargetDefinition target, long timeoutMs, ExecutionContext context);
    void waitForVisible(TargetDefinition target, long timeoutMs, ExecutionContext context);
    void waitForHidden(TargetDefinition target, long timeoutMs, ExecutionContext context);
    void waitForText(TargetDefinition target, String expected, long timeoutMs, ExecutionContext context);
    void waitForUrl(String expected, long timeoutMs, ExecutionContext context);
}
```

---

## 12.2 DefaultWaitEngine（骨架）

```java
package com.yourapp.wait.engine;

import com.yourapp.dsl.model.TargetDefinition;
import com.yourapp.execution.context.ExecutionContext;

public class DefaultWaitEngine implements WaitEngine {

    @Override
    public void waitForElement(TargetDefinition target, long timeoutMs, ExecutionContext context) {
        // TODO polling
    }

    @Override
    public void waitForVisible(TargetDefinition target, long timeoutMs, ExecutionContext context) {
        // TODO polling
    }

    @Override
    public void waitForHidden(TargetDefinition target, long timeoutMs, ExecutionContext context) {
        // TODO polling
    }

    @Override
    public void waitForText(TargetDefinition target, String expected, long timeoutMs, ExecutionContext context) {
        // TODO polling
    }

    @Override
    public void waitForUrl(String expected, long timeoutMs, ExecutionContext context) {
        // TODO polling
    }
}
```

---

## 12.3 WaitActionHandler

```java
package com.yourapp.action.handler;

import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.wait.engine.WaitEngine;

public class WaitActionHandler implements StepActionHandler {

    private final WaitEngine waitEngine;

    public WaitActionHandler(WaitEngine waitEngine) {
        this.waitEngine = waitEngine;
    }

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.WAIT_FOR_ELEMENT
                || actionType == ActionType.WAIT_FOR_VISIBLE
                || actionType == ActionType.WAIT_FOR_HIDDEN
                || actionType == ActionType.WAIT_FOR_TEXT
                || actionType == ActionType.WAIT_FOR_URL;
    }

    @Override
    public StepResult handle(StepDefinition step, ExecutionContext context) {
        long timeout = step.getTimeoutMs() == null ? 10000 : step.getTimeoutMs();

        switch (step.getAction()) {
            case WAIT_FOR_ELEMENT -> waitEngine.waitForElement(step.getTarget(), timeout, context);
            case WAIT_FOR_VISIBLE -> waitEngine.waitForVisible(step.getTarget(), timeout, context);
            case WAIT_FOR_HIDDEN -> waitEngine.waitForHidden(step.getTarget(), timeout, context);
            case WAIT_FOR_TEXT -> waitEngine.waitForText(step.getTarget(), step.getExpected(), timeout, context);
            case WAIT_FOR_URL -> waitEngine.waitForUrl(step.getExpected(), timeout, context);
            default -> throw new IllegalArgumentException("Unsupported wait action: " + step.getAction());
        }

        return StepResult.success(step.getId(), "wait success");
    }
}
```

---

# 13. assertion-engine 代码骨架

推荐 package：

```text
com.yourapp.assertion
├─ engine
├─ handler
└─ model
```

---

## 13.1 AssertionResult

```java
package com.yourapp.assertion.model;

public class AssertionResult {
    private final boolean success;
    private final String message;

    public AssertionResult(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public static AssertionResult success(String message) {
        return new AssertionResult(true, message);
    }

    public static AssertionResult failure(String message) {
        return new AssertionResult(false, message);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
}
```

---

## 13.2 AssertionEngine

```java
package com.yourapp.assertion.engine;

import com.yourapp.assertion.model.AssertionResult;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface AssertionEngine {
    AssertionResult assertStep(StepDefinition step, ExecutionContext context);
}
```

---

## 13.3 AssertionHandler

```java
package com.yourapp.assertion.handler;

import com.yourapp.assertion.model.AssertionResult;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface AssertionHandler {
    boolean supports(ActionType actionType);
    AssertionResult handle(StepDefinition step, ExecutionContext context);
}
```

---

## 13.4 DefaultAssertionEngine

```java
package com.yourapp.assertion.engine;

import com.yourapp.assertion.handler.AssertionHandler;
import com.yourapp.assertion.model.AssertionResult;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

import java.util.List;

public class DefaultAssertionEngine implements AssertionEngine {

    private final List<AssertionHandler> handlers;

    public DefaultAssertionEngine(List<AssertionHandler> handlers) {
        this.handlers = handlers;
    }

    @Override
    public AssertionResult assertStep(StepDefinition step, ExecutionContext context) {
        for (AssertionHandler handler : handlers) {
            if (handler.supports(step.getAction())) {
                return handler.handle(step, context);
            }
        }
        return AssertionResult.failure("No assertion handler found for action: " + step.getAction());
    }
}
```

---

## 13.5 AssertTextHandler（骨架）

```java
package com.yourapp.assertion.handler;

import com.yourapp.assertion.model.AssertionResult;
import com.yourapp.dsl.model.ActionType;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public class AssertTextHandler implements AssertionHandler {

    @Override
    public boolean supports(ActionType actionType) {
        return actionType == ActionType.ASSERT_TEXT;
    }

    @Override
    public AssertionResult handle(StepDefinition step, ExecutionContext context) {
        // TODO read text from page
        // TODO compare expected
        return AssertionResult.success("assert text success");
    }
}
```

---

# 14. artifact-engine 代码骨架

推荐 package：

```text
com.yourapp.artifact
├─ collector
└─ model
```

---

## 14.1 ArtifactRef

```java
package com.yourapp.artifact.model;

public class ArtifactRef {
    private String type;
    private String path;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
}
```

---

## 14.2 ArtifactCollector

```java
package com.yourapp.artifact.collector;

import com.yourapp.action.result.StepResult;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface ArtifactCollector {
    void beforeRun(ExecutionContext context);
    void beforeStep(StepDefinition step, ExecutionContext context);
    void afterStep(StepDefinition step, ExecutionContext context, StepResult result);
    void onFailure(StepDefinition step, ExecutionContext context, Throwable throwable);
    void afterRun(ExecutionContext context);
}
```

---

## 14.3 DefaultArtifactCollector（骨架）

```java
package com.yourapp.artifact.collector;

import com.yourapp.action.result.StepResult;
import com.yourapp.browser.page.PageController;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public class DefaultArtifactCollector implements ArtifactCollector {

    private final PageController pageController;

    public DefaultArtifactCollector(PageController pageController) {
        this.pageController = pageController;
    }

    @Override
    public void beforeRun(ExecutionContext context) {
        // TODO init directories
    }

    @Override
    public void beforeStep(StepDefinition step, ExecutionContext context) {
        // TODO save before screenshot if needed
    }

    @Override
    public void afterStep(StepDefinition step, ExecutionContext context, StepResult result) {
        // TODO save after screenshot if needed
    }

    @Override
    public void onFailure(StepDefinition step, ExecutionContext context, Throwable throwable) {
        // TODO save fail screenshot + dom
    }

    @Override
    public void afterRun(ExecutionContext context) {
        // TODO flush console/network dumps
    }
}
```

---

# 15. report-engine 代码骨架

推荐 package：

```text
com.yourapp.report
├─ engine
├─ model
└─ render
```

---

## 15.1 StepExecutionRecord

```java
package com.yourapp.report.model;

import com.yourapp.artifact.model.ArtifactRef;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class StepExecutionRecord {
    private String runId;
    private String stepId;
    private String stepName;
    private String action;
    private Instant startedAt;
    private Instant finishedAt;
    private String status;
    private String message;
    private Long durationMs;
    private List<ArtifactRef> artifacts = new ArrayList<>();

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }

    public String getStepName() { return stepName; }
    public void setStepName(String stepName) { this.stepName = stepName; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant finishedAt) { this.finishedAt = finishedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public List<ArtifactRef> getArtifacts() { return artifacts; }
    public void setArtifacts(List<ArtifactRef> artifacts) { this.artifacts = artifacts; }
}
```

---

## 15.2 ReportEngine

```java
package com.yourapp.report.engine;

import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.report.model.StepExecutionRecord;

import java.nio.file.Path;
import java.util.List;

public interface ReportEngine {
    Path generateRunReport(ExecutionContext context, List<StepExecutionRecord> stepRecords);
}
```

---

## 15.3 DefaultReportEngine（骨架）

```java
package com.yourapp.report.engine;

import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.report.model.StepExecutionRecord;

import java.nio.file.Path;
import java.util.List;

public class DefaultReportEngine implements ReportEngine {

    @Override
    public Path generateRunReport(ExecutionContext context, List<StepExecutionRecord> stepRecords) {
        // TODO write report.json / report.html
        return context.getRunOutputDir().resolve("report.html");
    }
}
```

---

# 16. datasource-engine 代码骨架

推荐 package：

```text
com.yourapp.datasource
├─ config
├─ registry
├─ query
└─ assertion
```

---

## 16.1 DatasourceConfig

```java
package com.yourapp.datasource.config;

public class DatasourceConfig {
    private String name;
    private String type;
    private String jdbcUrl;
    private String username;
    private String password;
    private boolean readonly;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getJdbcUrl() { return jdbcUrl; }
    public void setJdbcUrl(String jdbcUrl) { this.jdbcUrl = jdbcUrl; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isReadonly() { return readonly; }
    public void setReadonly(boolean readonly) { this.readonly = readonly; }
}
```

---

## 16.2 DatasourceRegistry

```java
package com.yourapp.datasource.registry;

import com.yourapp.datasource.config.DatasourceConfig;

import java.util.Optional;

public interface DatasourceRegistry {
    Optional<DatasourceConfig> find(String name);
    void register(DatasourceConfig config);
}
```

---

## 16.3 QueryExecutor

```java
package com.yourapp.datasource.query;

import java.util.List;
import java.util.Map;

public interface QueryExecutor {
    List<Map<String, Object>> query(String datasourceName, String sql, Map<String, Object> params);
}
```

---

## 16.4 DbAssertionService

```java
package com.yourapp.datasource.assertion;

import com.yourapp.assertion.model.AssertionResult;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.execution.context.ExecutionContext;

public interface DbAssertionService {
    AssertionResult assertDb(StepDefinition step, ExecutionContext context);
}
```

---

# 17. execution-engine 代码骨架

推荐 package：

```text
com.yourapp.execution.engine
├─ orchestrator
├─ result
└─ policy
```

---

## 17.1 RunStatus

```java
package com.yourapp.execution.engine.result;

public enum RunStatus {
    SUCCESS,
    FAILED,
    PARTIAL_SUCCESS
}
```

---

## 17.2 RunOptions

```java
package com.yourapp.execution.engine.result;

public class RunOptions {
    private boolean stopOnFailure = true;

    public boolean isStopOnFailure() { return stopOnFailure; }
    public void setStopOnFailure(boolean stopOnFailure) { this.stopOnFailure = stopOnFailure; }
}
```

---

## 17.3 RunResult

```java
package com.yourapp.execution.engine.result;

import com.yourapp.report.model.StepExecutionRecord;

import java.nio.file.Path;
import java.util.List;

public class RunResult {
    private String runId;
    private RunStatus status;
    private Path reportPath;
    private List<StepExecutionRecord> stepRecords;

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public RunStatus getStatus() { return status; }
    public void setStatus(RunStatus status) { this.status = status; }

    public Path getReportPath() { return reportPath; }
    public void setReportPath(Path reportPath) { this.reportPath = reportPath; }

    public List<StepExecutionRecord> getStepRecords() { return stepRecords; }
    public void setStepRecords(List<StepExecutionRecord> stepRecords) { this.stepRecords = stepRecords; }
}
```

---

## 17.4 TestOrchestrator

```java
package com.yourapp.execution.engine.orchestrator;

import com.yourapp.dsl.model.TestCaseDefinition;
import com.yourapp.execution.engine.result.RunOptions;
import com.yourapp.execution.engine.result.RunResult;

public interface TestOrchestrator {
    RunResult execute(TestCaseDefinition definition, RunOptions options);
}
```

---

## 17.5 DefaultTestOrchestrator（骨架）

```java
package com.yourapp.execution.engine.orchestrator;

import com.yourapp.action.executor.ActionExecutor;
import com.yourapp.action.result.StepResult;
import com.yourapp.artifact.collector.ArtifactCollector;
import com.yourapp.browser.session.BrowserSessionManager;
import com.yourapp.browser.session.ExecutionSession;
import com.yourapp.browser.session.SessionOptions;
import com.yourapp.common.ids.Ids;
import com.yourapp.dsl.model.StepDefinition;
import com.yourapp.dsl.model.TestCaseDefinition;
import com.yourapp.execution.context.ExecutionContext;
import com.yourapp.execution.engine.result.RunOptions;
import com.yourapp.execution.engine.result.RunResult;
import com.yourapp.execution.engine.result.RunStatus;
import com.yourapp.report.engine.ReportEngine;
import com.yourapp.report.model.StepExecutionRecord;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class DefaultTestOrchestrator implements TestOrchestrator {

    private final BrowserSessionManager browserSessionManager;
    private final ActionExecutor actionExecutor;
    private final ArtifactCollector artifactCollector;
    private final ReportEngine reportEngine;

    public DefaultTestOrchestrator(BrowserSessionManager browserSessionManager,
                                   ActionExecutor actionExecutor,
                                   ArtifactCollector artifactCollector,
                                   ReportEngine reportEngine) {
        this.browserSessionManager = browserSessionManager;
        this.actionExecutor = actionExecutor;
        this.artifactCollector = artifactCollector;
        this.reportEngine = reportEngine;
    }

    @Override
    public RunResult execute(TestCaseDefinition definition, RunOptions options) {
        String runId = Ids.uuid();

        ExecutionContext context = new ExecutionContext();
        context.setRunId(runId);
        context.setTestCase(definition);
        if (definition.getVars() != null) {
            context.getVariables().putAll(definition.getVars());
        }
        context.setRunOutputDir(Path.of("runs", runId));

        ExecutionSession session = browserSessionManager.create(new SessionOptions());
        context.setSession(session);

        artifactCollector.beforeRun(context);

        List<StepExecutionRecord> records = new ArrayList<>();
        boolean failed = false;

        for (StepDefinition step : definition.getSteps()) {
            StepExecutionRecord record = new StepExecutionRecord();
            record.setRunId(runId);
            record.setStepId(step.getId());
            record.setStepName(step.getName());
            record.setAction(step.getAction().name());
            record.setStartedAt(Instant.now());

            try {
                context.setCurrentStepId(step.getId());
                artifactCollector.beforeStep(step, context);

                StepResult result = actionExecutor.execute(step, context);

                record.setFinishedAt(Instant.now());
                record.setStatus(result.isSuccess() ? "SUCCESS" : "FAILED");
                record.setMessage(result.getMessage());
                artifactCollector.afterStep(step, context, result);

                if (!result.isSuccess()) {
                    failed = true;
                    if (options.isStopOnFailure()) {
                        records.add(record);
                        break;
                    }
                }

            } catch (Exception ex) {
                failed = true;
                record.setFinishedAt(Instant.now());
                record.setStatus("FAILED");
                record.setMessage(ex.getMessage());
                artifactCollector.onFailure(step, context, ex);
                records.add(record);
                if (options.isStopOnFailure()) {
                    break;
                }
                continue;
            }

            records.add(record);
        }

        artifactCollector.afterRun(context);
        Path reportPath = reportEngine.generateRunReport(context, records);

        RunResult runResult = new RunResult();
        runResult.setRunId(runId);
        runResult.setReportPath(reportPath);
        runResult.setStepRecords(records);
        runResult.setStatus(failed ? RunStatus.FAILED : RunStatus.SUCCESS);
        return runResult;
    }
}
```

---

# 18. native-messaging 代码骨架

推荐 package：

```text
com.yourapp.nativehost
├─ protocol
├─ processor
└─ app
```

---

## 18.1 NativeRequest / NativeResponse

```java
package com.yourapp.nativehost.protocol;

public class NativeRequest {
    private String type;
    private String requestId;
    private Object payload;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }
}
```

```java
package com.yourapp.nativehost.protocol;

public class NativeResponse {
    private String type;
    private String requestId;
    private boolean success;
    private Object payload;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }
}
```

---

## 18.2 NativeMessageProcessor

```java
package com.yourapp.nativehost.processor;

import com.yourapp.nativehost.protocol.NativeRequest;
import com.yourapp.nativehost.protocol.NativeResponse;

public interface NativeMessageProcessor {
    NativeResponse process(NativeRequest request);
}
```

---

## 18.3 DefaultNativeMessageProcessor（骨架）

```java
package com.yourapp.nativehost.processor;

import com.yourapp.nativehost.protocol.NativeRequest;
import com.yourapp.nativehost.protocol.NativeResponse;

public class DefaultNativeMessageProcessor implements NativeMessageProcessor {

    @Override
    public NativeResponse process(NativeRequest request) {
        NativeResponse response = new NativeResponse();
        response.setRequestId(request.getRequestId());
        response.setType("ACK");
        response.setSuccess(true);
        response.setPayload(null);
        return response;
    }
}
```

---

## 18.4 NativeHostApp（骨架）

```java
package com.yourapp.nativehost.app;

public class NativeHostApp {
    public static void main(String[] args) {
        // TODO read stdin
        // TODO parse length-prefixed messages
        // TODO dispatch processor
        // TODO write stdout
    }
}
```

---

# 19. apps 模块骨架

## 19.1 apps/core-platform

建议提供一个 facade：

```java
package com.yourapp.platform.facade;

import com.yourapp.dsl.model.TestCaseDefinition;
import com.yourapp.execution.engine.orchestrator.TestOrchestrator;
import com.yourapp.execution.engine.result.RunOptions;
import com.yourapp.execution.engine.result.RunResult;

public class PlatformFacade {

    private final TestOrchestrator testOrchestrator;

    public PlatformFacade(TestOrchestrator testOrchestrator) {
        this.testOrchestrator = testOrchestrator;
    }

    public RunResult execute(TestCaseDefinition definition) {
        return testOrchestrator.execute(definition, new RunOptions());
    }
}
```

---

## 19.2 apps/local-admin-api
可以先不急着写完整 API，实现一个最小控制器即可。

---

# 20. 首批最小可运行链路

建议先实现并跑通下面这条链路：

```text
读取 JSON DSL
  -> DslParser.parse()
  -> DefaultTestOrchestrator.execute()
  -> DefaultBrowserSessionManager.create()
  -> DefaultPageController.navigate()
  -> DefaultActionExecutor.execute()
      -> GotoActionHandler
      -> FillActionHandler
      -> ClickActionHandler
      -> WaitActionHandler
      -> AssertTextHandler
  -> DefaultArtifactCollector.before/after
  -> DefaultReportEngine.generateRunReport()
```

### 第一版验收目标
- 能打开页面
- 能输入
- 能点击
- 能等待
- 能校验文本
- 能截图
- 能输出报告文件路径

---

# 21. 首批开发建议顺序

## 优先级 1
- `DefaultCdpClient`
- `DefaultBrowserSessionManager`
- `DefaultPageController`

## 优先级 2
- `DefaultDslParser`
- `DefaultDslValidator`
- `ExecutionContext`
- `DefaultTestOrchestrator`

## 优先级 3
- `DefaultElementResolver`
- `GotoActionHandler`
- `FillActionHandler`
- `ClickActionHandler`

## 优先级 4
- `DefaultWaitEngine`
- `WaitActionHandler`

## 优先级 5
- `DefaultAssertionEngine`
- `AssertTextHandler`

## 优先级 6
- `DefaultArtifactCollector`
- `DefaultReportEngine`

## 优先级 7
- `NativeHostApp`
- `DefaultNativeMessageProcessor`

## 优先级 8
- `DatasourceRegistry`
- `QueryExecutor`
- `DbAssertionService`

## 优先级 9
- `AgentCoordinator`
- `LlmProvider`

---

# 附录 A：最小 Main 启动样板

```java
package com.yourapp.demo;

import com.yourapp.action.executor.DefaultActionExecutor;
import com.yourapp.action.handler.GotoActionHandler;
import com.yourapp.action.handler.StepActionHandler;
import com.yourapp.artifact.collector.DefaultArtifactCollector;
import com.yourapp.browser.page.DefaultPageController;
import com.yourapp.browser.page.PageController;
import com.yourapp.browser.session.BrowserSessionManager;
import com.yourapp.browser.session.DefaultBrowserSessionManager;
import com.yourapp.cdp.client.CdpClient;
import com.yourapp.cdp.client.DefaultCdpClient;
import com.yourapp.dsl.model.TestCaseDefinition;
import com.yourapp.dsl.parser.DefaultDslParser;
import com.yourapp.dsl.parser.DslParser;
import com.yourapp.dsl.validator.DefaultDslValidator;
import com.yourapp.execution.engine.orchestrator.DefaultTestOrchestrator;
import com.yourapp.execution.engine.orchestrator.TestOrchestrator;
import com.yourapp.execution.engine.result.RunOptions;
import com.yourapp.report.engine.DefaultReportEngine;

import java.nio.file.Path;
import java.util.List;

public class DemoMain {
    public static void main(String[] args) {
        CdpClient cdpClient = new DefaultCdpClient();
        BrowserSessionManager sessionManager = new DefaultBrowserSessionManager();
        PageController pageController = new DefaultPageController(cdpClient);

        List<StepActionHandler> handlers = List.of(
                new GotoActionHandler(pageController)
        );

        DslParser parser = new DefaultDslParser(new DefaultDslValidator());

        TestOrchestrator orchestrator = new DefaultTestOrchestrator(
                sessionManager,
                new DefaultActionExecutor(handlers),
                new DefaultArtifactCollector(pageController),
                new DefaultReportEngine()
        );

        TestCaseDefinition definition = parser.parse(Path.of("demo-case.json"));
        var result = orchestrator.execute(definition, new RunOptions());

        System.out.println("RunId: " + result.getRunId());
        System.out.println("Status: " + result.getStatus());
        System.out.println("Report: " + result.getReportPath());
    }
}
```

---

# 附录 B：建议下一份文档

接下来最适合补的就是：

1. **CDP 域封装详细文档**
   - Page.navigate
   - Page.captureScreenshot
   - Runtime.evaluate
   - DOM.querySelector
   - Input.dispatchMouseEvent
   - Input.dispatchKeyEvent

2. **Edge 插件协议文档**
   - Native Messaging 消息格式
   - request/response 类型
   - 页面摘要结构
   - 错误码

3. **最小可运行源码模板**
   - 不是文档，而是直接出一个 Gradle 项目骨架

---

**文档结束**
