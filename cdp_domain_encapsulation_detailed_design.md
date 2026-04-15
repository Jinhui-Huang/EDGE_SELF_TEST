# CDP 域封装详细文档（企业级网页自动化测试平台）
**版本**: v1.0  
**定位**: 面向 Java 核心执行引擎的 Chrome DevTools Protocol（CDP）域封装设计文档  
**适用范围**: Microsoft Edge（Chromium）/ Chromium 系浏览器  
**前置文档**:  
- `enterprise_web_test_platform_tech_design.md`  
- `enterprise_web_test_platform_phase2_implementation_design.md`  
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md`

---

# 目录

1. 文档目标  
2. CDP 在本平台中的定位  
3. 协议基础与版本策略  
4. Java 封装总原则  
5. 统一消息模型设计  
6. CDP Client 层设计  
7. Browser / Target / Session 管理域封装  
8. Page 域封装  
9. Runtime 域封装  
10. DOM 域封装  
11. Input 域封装  
12. Network 域封装  
13. Log / Console / Exception 采集  
14. Emulation / Overlay / Accessibility 选做域  
15. 域与执行器模块映射关系  
16. 错误处理与重试策略  
17. 事件订阅与生命周期管理  
18. Java 类设计建议  
19. 最小可运行调用链  
20. 开发优先级建议  
21. 常见坑与规避策略  
22. 官方参考文档  

---

# 1. 文档目标

这份文档专门回答一个问题：

> **如果平台底层执行器基于 CDP 自研，那么各个 CDP 域应该怎么封装，封装到什么层级，哪些命令必须先做，哪些事件必须先监听？**

目标不是罗列全部 CDP API，而是建立：

- 企业级可维护的 Java 封装结构
- 与测试 DSL / 执行器 / 等待 / 断言 / 采集模块匹配的域封装方案
- 首批必须落地的方法列表
- 事件与生命周期处理方式
- 常见坑和边界说明

---

# 2. CDP 在本平台中的定位

## 2.1 为什么选 CDP

CDP（Chrome DevTools Protocol）是 Chromium 系浏览器的调试与控制协议，用于 instrument、inspect、debug、profile 浏览器。Edge 文档明确说明 Microsoft Edge DevTools Protocol 与 Chrome DevTools Protocol 的 API 对齐。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/  
- https://learn.microsoft.com/en-us/microsoft-edge/test-and-automation/devtools-protocol

## 2.2 在本平台中的职责

CDP 作为**主执行协议层**，负责：

- 页面导航
- DOM 读取与局部写入
- JavaScript 执行
- 键盘和鼠标事件派发
- 页面截图
- 网络请求/响应监听
- console / exception 采集
- tab / popup / target 管理

## 2.3 不负责的事情

CDP 本身不负责：
- DSL 解析
- 业务级等待策略
- 测试断言语义
- 报告渲染
- Agent 推理
- 数据库断言

这些由平台上层负责。

---

# 3. 协议基础与版本策略

## 3.1 tip-of-tree 与稳定版本

CDP 官方提供：
- `tot`（tip-of-tree，最新协议，变化快，可能破坏兼容）
- 稳定版本（例如 1.3 等历史视图）

官方明确提示 tip-of-tree 变化频繁，不保证向后兼容。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/  
- https://chromedevtools.github.io/devtools-protocol/

## 3.2 本平台建议策略

### 开发期
参考 `tot` 文档做能力调研。

### 实现期
以**当前目标 Edge/Chromium 实际支持的命令集**为准，不要盲目依赖最新实验字段。

### 平台策略
- 封装层对未知字段保持宽容
- 对实验字段单独标记
- 域方法尽量抽象成“平台稳定能力”，不要把 CDP 原始细节全暴露到上层

---

# 4. Java 封装总原则

## 4.1 分三层封装

### 第一层：Raw CDP Client
只做：
- WebSocket 连接
- request/response
- event 分发

### 第二层：Domain API
例如：
- `PageDomain`
- `RuntimeDomain`
- `DomDomain`
- `InputDomain`
- `NetworkDomain`
- `TargetDomain`

这层把字符串方法名封装起来。

### 第三层：Browser Service
例如：
- `PageController`
- `BrowserInteractionService`
- `ElementResolver`
- `NetworkObserver`
- `ConsoleObserver`

上层执行器只调用 Browser Service，不直接拼 CDP method 名称。

---

## 4.2 统一命名

CDP 原始命令：
- `Page.navigate`
- `Runtime.evaluate`
- `DOM.querySelector`
- `Input.dispatchMouseEvent`

Java Domain 接口建议命名：
- `pageDomain.navigate(...)`
- `runtimeDomain.evaluate(...)`
- `domDomain.querySelector(...)`
- `inputDomain.dispatchMouseEvent(...)`

Browser Service 层建议命名：
- `pageController.navigate(...)`
- `browserInteractionService.click(...)`
- `elementResolver.resolve(...)`

---

## 4.3 不要把 CDP 原始 JSON 扔到业务层
错误示例：
- 执行器直接写 `"Page.navigate"`
- 断言引擎直接拼 `Runtime.evaluate`

正确做法：
- 执行器依赖 PageController / AssertionService
- Domain 层负责与 CDP 原始协议交互

---

# 5. 统一消息模型设计

## 5.1 请求模型

```java
public class CdpRequest {
    private long id;
    private String method;
    private Object params;
}
```

## 5.2 响应模型

```java
public class CdpResponse<T> {
    private long id;
    private T result;
    private CdpError error;
}
```

## 5.3 事件模型

```java
public class CdpEvent {
    private String method;
    private Object params;
}
```

## 5.4 错误模型

```java
public class CdpError {
    private Integer code;
    private String message;
    private Object data;
}
```

---

# 6. CDP Client 层设计

## 6.1 CdpClient 职责

- 建立 WebSocket 连接
- 发送命令
- 等待对应响应
- 维护 requestId 到 Future 的映射
- 事件分发
- 超时控制
- 连接关闭与重连

## 6.2 接口建议

```java
public interface CdpClient {
    void connect(String wsUrl);
    void close();
    <T> T send(String method, Object params, Class<T> responseType);
    void addEventListener(String eventName, CdpEventListener listener);
    void removeEventListener(String eventName, CdpEventListener listener);
}
```

## 6.3 必须支持的基础能力

- 同步/阻塞式 `send`
- 命令超时
- 并发请求
- 非法响应处理
- 连接断开回调
- 事件多播分发

## 6.4 可选增强
- tracing / raw 协议日志
- request/response 原文采集
- reconnect
- metrics

---

# 7. Browser / Target / Session 管理域封装

Target 域支持 target 发现与 attach，是多 tab / popup / 新页面支持的基础。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

## 7.1 为什么 Target 域重要

企业级自动化测试一定会遇到：
- 新开标签页
- popup
- 登录跳转页
- 多 target 切换
- 当前 target 丢失

所以不能只连接一个固定 ws endpoint 然后忽略 target 管理。

## 7.2 建议封装的能力

### TargetDomain
- `setDiscoverTargets`
- `attachToTarget`
- `activateTarget`
- `closeTarget`
- `getTargets`

## 7.3 建议 Java 接口

```java
public interface TargetDomain {
    void setDiscoverTargets(boolean discover);
    AttachToTargetResult attachToTarget(String targetId);
    List<TargetInfo> getTargets();
    void activateTarget(String targetId);
    void closeTarget(String targetId);
}
```

## 7.4 必须监听的事件
- `Target.targetCreated`
- `Target.targetDestroyed`
- `Target.attachedToTarget`
- `Target.detachedFromTarget`
- `Target.targetInfoChanged`

## 7.5 Session 设计建议
ExecutionSession 中建议维护：
- 当前 browser websocket
- 当前 active targetId
- targetId -> sessionId 映射
- target 元信息缓存

---

# 8. Page 域封装

Page 域负责页面导航、生命周期、截图、文档相关能力，是最先要落地的域之一。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

## 8.1 第一批必须封装的方法

### 导航类
- `Page.navigate`
- `Page.reload`
- `Page.stopLoading`

### 截图类
- `Page.captureScreenshot`

### 页面状态类
- `Page.getFrameTree`（可选）
- `Page.enable`

### 生命周期事件
- `Page.loadEventFired`
- `Page.frameNavigated`
- `Page.frameStartedLoading`
- `Page.frameStoppedLoading`

---

## 8.2 PageDomain 接口建议

```java
public interface PageDomain {
    void enable();
    NavigateResult navigate(String url);
    void reload();
    void stopLoading();
    CaptureScreenshotResult captureScreenshot(CaptureScreenshotParams params);
}
```

---

## 8.3 典型请求映射

### 导航
原始：
```json
{
  "id": 1,
  "method": "Page.navigate",
  "params": { "url": "https://example.com" }
}
```

Java：
```java
pageDomain.navigate("https://example.com");
```

### 截图
原始：
```json
{
  "id": 2,
  "method": "Page.captureScreenshot",
  "params": {
    "format": "png",
    "fromSurface": true
  }
}
```

Java：
```java
CaptureScreenshotResult result = pageDomain.captureScreenshot(
    new CaptureScreenshotParams("png", true, true)
);
```

---

## 8.4 页面导航等待设计

不要只调用 `Page.navigate` 就认为页面已经可操作。  
推荐组合：

1. `Page.navigate`
2. 等 `Page.frameNavigated`
3. 等 `Page.loadEventFired`
4. 上层再根据场景执行：
   - `waitForUrl`
   - `waitForElement`
   - `waitForText`
   - `waitForResponse`

也就是说：
**Page 域只提供原始事件，业务稳定等待由 WaitEngine 负责。**

---

## 8.5 截图设计建议

### 平台层封装
- 全页截图
- 当前视口截图
- 元素区域截图（后续通过 DOM boxModel 或 Runtime + JS 计算裁剪）

### ScreenshotOptions 建议
- format: png/jpeg
- fullPage: boolean
- quality: Integer（jpeg）
- clip: ClipRect（后期）

---

# 9. Runtime 域封装

Runtime 域用于远程执行 JavaScript、获取对象句柄、解析 JS 结果，是 UI 测试系统的核心之一。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

官方说明 Runtime 域提供远程 JS 执行与 mirror objects；对象会以远程对象形式存在，除非显式释放或对象组被释放。

## 9.1 第一批必须封装的方法

- `Runtime.enable`
- `Runtime.evaluate`
- `Runtime.callFunctionOn`
- `Runtime.getProperties`
- `Runtime.releaseObject`
- `Runtime.releaseObjectGroup`

## 9.2 RuntimeDomain 接口建议

```java
public interface RuntimeDomain {
    void enable();
    EvaluateResult evaluate(String expression, boolean returnByValue);
    CallFunctionOnResult callFunctionOn(String objectId, String functionDeclaration, Object[] arguments);
    GetPropertiesResult getProperties(String objectId);
    void releaseObject(String objectId);
    void releaseObjectGroup(String objectGroup);
}
```

---

## 9.3 Runtime 的典型用途

### 场景 1：获取当前 URL
```javascript
location.href
```

### 场景 2：获取页面标题
```javascript
document.title
```

### 场景 3：获取页面完整 HTML
```javascript
document.documentElement.outerHTML
```

### 场景 4：获取元素文本
```javascript
(element) => element.innerText
```

### 场景 5：获取元素属性
```javascript
(element) => element.getAttribute('value')
```

### 场景 6：触发页面级 JS 辅助逻辑
例如获取可见文本摘要、判断 overlay、读取 loading 状态。

---

## 9.4 Runtime evaluate 的封装建议

建议封装两个常用方法：

```java
Object evalValue(String expression);
RemoteObject evalObject(String expression);
```

- `evalValue`：适合拿字符串、数字、布尔、简单 JSON
- `evalObject`：适合后续要继续引用的对象

---

## 9.5 对象生命周期管理

### 风险
如果长期保留 objectId，不释放，可能导致远程对象积累。

### 建议
- 批量查询使用 objectGroup
- 一次操作结束后释放 objectGroup
- 上层不要缓存 objectId 太久

---

## 9.6 Runtime 事件建议
第一版可不重点依赖 Runtime 事件，但建议预留：
- `Runtime.consoleAPICalled`
- `Runtime.exceptionThrown`
- `Runtime.executionContextCreated`
- `Runtime.executionContextDestroyed`

注意：
console/exception 采集也可以由 Runtime 事件驱动。

---

# 10. DOM 域封装

DOM 域用于 DOM 读写、节点 id 管理、querySelector、节点解析与定位。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/

官方说明 DOM 域中每个节点都有 mirror object 与 node id，客户端只会收到已知节点的 DOM 事件。

## 10.1 第一批必须封装的方法

- `DOM.enable`
- `DOM.getDocument`
- `DOM.querySelector`
- `DOM.querySelectorAll`
- `DOM.describeNode`
- `DOM.resolveNode`
- `DOM.getBoxModel`（后期做区域截图和点击坐标时很有用）

## 10.2 DomDomain 接口建议

```java
public interface DomDomain {
    void enable();
    Node getDocument(Integer depth, boolean pierce);
    Integer querySelector(Integer nodeId, String selector);
    List<Integer> querySelectorAll(Integer nodeId, String selector);
    DescribeNodeResult describeNode(Integer nodeId);
    ResolveNodeResult resolveNode(Integer nodeId);
    BoxModelResult getBoxModel(Integer nodeId);
}
```

---

## 10.3 DOM 域在平台中的作用

### ElementResolver 使用 DOM 域做：
- 从 document root 开始查找
- CSS 定位
- querySelectorAll 多结果处理
- 获取节点上下文

### BrowserInteractionService 使用 DOM + Runtime 做：
- resolve node -> objectId
- objectId -> JS 调用
- boxModel -> 坐标点击

---

## 10.4 DOM 与 Runtime 的配合

常见模式：

1. `DOM.querySelector`
2. 拿到 `nodeId`
3. `DOM.resolveNode`
4. 拿到 `objectId`
5. `Runtime.callFunctionOn` 执行元素级操作

这条链路非常关键。

---

## 10.5 Shadow DOM 处理建议

### 现实情况
纯 `querySelector` 不一定穿透 shadow root。

### 设计建议
- 在 DOM.getDocument 时支持 `pierce = true` 的场景单独研究
- Shadow DOM 的统一处理建议在 Resolver 层封装，而不是上层业务显式关心
- 第一版可先标记 `shadow = false` 常规路径，第二版再专项增强

---

## 10.6 iframe / frame 节点问题
DOM 节点与 frame 上下文并不总是直接等价。  
涉及 iframe 时，建议结合：
- `Page.frameNavigated`
- `Target` / frame tree
- `Runtime.executionContext`

不要仅靠 DOM 节点推断 frame 切换。

---

# 11. Input 域封装

Input 域负责键盘、鼠标、拖拽、滚轮等输入事件，是 click / type / hover 的底层基础。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/Input/

## 11.1 第一批必须封装的方法

- `Input.dispatchMouseEvent`
- `Input.dispatchKeyEvent`

后续可加：
- `Input.insertText`
- `Input.dispatchDragEvent`
- `Input.synthesizeScrollGesture`（若需要）

## 11.2 InputDomain 接口建议

```java
public interface InputDomain {
    void dispatchMouseEvent(MouseEventParams params);
    void dispatchKeyEvent(KeyEventParams params);
}
```

---

## 11.3 为什么不能只靠 Runtime 做 click/fill

### Runtime 路线
通过 JS：
- `element.click()`
- `element.value = 'xxx'`

### Input 路线
通过浏览器输入系统：
- mousePressed / mouseReleased
- keyDown / char / keyUp

### 平台建议
两条都要支持，但默认策略如下：

#### click
优先使用：
- DOM/Runtime 获取中心点
- Input.dispatchMouseEvent 真点击

#### fill
优先使用：
- JS 聚焦 + 清空 + Input 键入  
或者  
- JS 赋值 + input/change 事件触发（针对表单系统）

也就是说：
**平台应同时支持“真实输入模式”和“JS 快捷赋值模式”。**

---

## 11.4 Click 设计建议

### 一种推荐路径
1. ElementResolver 定位
2. DOM.getBoxModel 拿坐标
3. 计算中心点
4. `Input.dispatchMouseEvent(mousePressed)`
5. `Input.dispatchMouseEvent(mouseReleased)`

### 优势
- 更接近真实用户交互
- 某些页面仅 JS click 不触发真实行为时仍能工作

---

## 11.5 Type / Press 设计建议

### press
适合：
- Enter
- Tab
- Escape
- ArrowDown

### type/fill
适合：
- 文本输入
- 用户名密码
- 搜索框

建议封装：
- `keyboard.press("Enter")`
- `keyboard.type("hello")`

而底层可能转换为多次 `dispatchKeyEvent`。

---

# 12. Network 域封装

Network 域用于网络请求/响应跟踪，是异常测试、响应断言、接口联动分析的核心。  
参考：  
- https://chromedevtools.github.io/devtools-protocol/tot/Network/

官方说明 Network 域允许跟踪 HTTP、file、data 等请求和响应，包括 headers、body、timing 等。

## 12.1 第一批必须封装的方法

- `Network.enable`
- `Network.getResponseBody`（建议第二批）
- `Network.setCacheDisabled`（可选）

## 12.2 必须监听的事件

- `Network.requestWillBeSent`
- `Network.responseReceived`
- `Network.loadingFinished`
- `Network.loadingFailed`

## 12.3 NetworkDomain 接口建议

```java
public interface NetworkDomain {
    void enable();
    void setCacheDisabled(boolean disabled);
    ResponseBodyResult getResponseBody(String requestId);
}
```

---

## 12.4 NetworkObserver 的职责

不要让上层直接处理原始事件，建议通过 `NetworkObserver` 做归一化。

### 统一事件结构
```java
public class NetworkEvent {
    private Instant time;
    private String requestId;
    private String url;
    private String method;
    private Integer status;
    private Long durationMs;
    private boolean failed;
    private String errorText;
}
```

---

## 12.5 请求-响应关联设计

至少维护三个缓存：
- requestId -> request meta
- requestId -> response meta
- requestId -> loading finish / fail

这样才能算出：
- 状态码
- 耗时
- 是否失败
- body 是否可取

---

## 12.6 Network 在平台中的使用场景

### WaitEngine
- waitForResponse(predicate)

### AssertionEngine
- assertResponse(status/body/message)

### ArtifactCollector
- 保存 network.json

### FailureAnalyzer
- 判断是否因为接口失败导致页面异常

---

# 13. Log / Console / Exception 采集

虽然没有单独“Console 域”，但在自动化测试平台里，console / exception 是必采项。  
常见来源：
- `Runtime.consoleAPICalled`
- `Runtime.exceptionThrown`

## 13.1 ConsoleObserver 建议职责

- 收集 log/warn/error
- 记录 stack 摘要
- 标记 error 级别
- 提供给断言与报告层

## 13.2 ConsoleEvent 统一结构建议

```java
public class ConsoleEvent {
    private Instant time;
    private String level;
    private String message;
    private String stack;
}
```

## 13.3 第一版建议
- 至少收集 `console.error`
- 至少收集未捕获异常
- 断言层支持 `assertConsoleNoError`

---

# 14. Emulation / Overlay / Accessibility 选做域

这些不是 MVP 首批必须，但要知道未来位置。

## 14.1 Emulation
用途：
- 设置视口
- 模拟设备
- 时区、地理位置、网络条件模拟

适合后续扩展“异常/弱网/时区测试”。

## 14.2 Overlay
用途：
- 元素高亮
- 调试辅助

企业平台里不一定必须，因为扩展层也能高亮。

## 14.3 Accessibility
用途：
- 辅助获取语义树
- 做 role/name 相关增强定位

后期可考虑辅助定位器稳健性。

---

# 15. 域与执行器模块映射关系

下面是最关键的“域到平台模块”的映射。

## 15.1 Page 域
主要服务：
- `PageController`
- `ArtifactCollector`

## 15.2 Runtime 域
主要服务：
- `PageController`
- `ElementResolver`
- `AssertionEngine`
- `ConsoleObserver`

## 15.3 DOM 域
主要服务：
- `ElementResolver`
- `BrowserInteractionService`
- 元素区域截图
- 目标节点诊断

## 15.4 Input 域
主要服务：
- `BrowserInteractionService`
- click / type / hover / press

## 15.5 Network 域
主要服务：
- `NetworkObserver`
- `WaitEngine`
- `AssertionEngine`
- `ArtifactCollector`

## 15.6 Target 域
主要服务：
- `BrowserSessionManager`
- `FrameTabManager`

---

# 16. 错误处理与重试策略

## 16.1 CDP 层错误分类

### 连接错误
- WebSocket 连接失败
- 连接断开
- 浏览器进程不存在

### 协议错误
- response.error 非空
- 命令不存在
- 参数非法

### 业务转换错误
- 响应字段缺失
- JSON 解析失败
- 目标域返回非预期结构

## 16.2 平台建议错误码
- `CDP_CONNECT_TIMEOUT`
- `CDP_SOCKET_CLOSED`
- `CDP_REQUEST_FAILED`
- `CDP_EVENT_PARSE_FAILED`
- `TARGET_ATTACH_FAILED`
- `PAGE_NAVIGATE_FAILED`
- `DOM_QUERY_FAILED`
- `INPUT_DISPATCH_FAILED`
- `NETWORK_LISTEN_FAILED`

## 16.3 是否自动重试
### 可以重试
- 短暂 websocket 写失败
- target attach 某些瞬时失败
- 页面尚未 ready 时的查询

### 不建议盲重试
- 参数错误
- method 不存在
- response.error 明确表示调用不合法

---

# 17. 事件订阅与生命周期管理

## 17.1 订阅时机建议

### Session 建立后立即启用
- Page.enable
- Runtime.enable
- DOM.enable
- Network.enable
- Target.setDiscoverTargets(true)

## 17.2 监听器注册顺序建议

1. 先 connect
2. 先 add listener
3. 再 enable domain
4. 再开始 navigate / action

避免事件发生时监听器还没挂上。

## 17.3 会话结束时
- 清理所有 listeners
- 释放 objectGroup
- flush console/network 缓存
- 关闭 websocket
- 关闭浏览器进程（或按策略复用）

---

# 18. Java 类设计建议

下面给你一版建议的 Domain 层接口。

## 18.1 TargetDomain

```java
public interface TargetDomain {
    void setDiscoverTargets(boolean discover);
    AttachToTargetResult attachToTarget(String targetId);
    List<TargetInfo> getTargets();
    void activateTarget(String targetId);
    void closeTarget(String targetId);
}
```

## 18.2 PageDomain

```java
public interface PageDomain {
    void enable();
    NavigateResult navigate(String url);
    void reload();
    void stopLoading();
    CaptureScreenshotResult captureScreenshot(CaptureScreenshotParams params);
}
```

## 18.3 RuntimeDomain

```java
public interface RuntimeDomain {
    void enable();
    EvaluateResult evaluate(String expression, boolean returnByValue);
    CallFunctionOnResult callFunctionOn(String objectId, String functionDeclaration, Object[] arguments);
    GetPropertiesResult getProperties(String objectId);
    void releaseObject(String objectId);
    void releaseObjectGroup(String objectGroup);
}
```

## 18.4 DomDomain

```java
public interface DomDomain {
    void enable();
    Node getDocument(Integer depth, boolean pierce);
    Integer querySelector(Integer nodeId, String selector);
    List<Integer> querySelectorAll(Integer nodeId, String selector);
    DescribeNodeResult describeNode(Integer nodeId);
    ResolveNodeResult resolveNode(Integer nodeId);
    BoxModelResult getBoxModel(Integer nodeId);
}
```

## 18.5 InputDomain

```java
public interface InputDomain {
    void dispatchMouseEvent(MouseEventParams params);
    void dispatchKeyEvent(KeyEventParams params);
}
```

## 18.6 NetworkDomain

```java
public interface NetworkDomain {
    void enable();
    void setCacheDisabled(boolean disabled);
    ResponseBodyResult getResponseBody(String requestId);
}
```

---

# 19. 最小可运行调用链

## 19.1 最小调用目标
先跑通：

1. 启动 Edge
2. 连接 CDP
3. `Page.enable`
4. `Runtime.enable`
5. `DOM.enable`
6. `Page.navigate`
7. `Runtime.evaluate(document.title)`
8. `Page.captureScreenshot`

## 19.2 推荐最小 Demo 链路

```text
DemoMain
 ├─ DefaultCdpClient.connect()
 ├─ new PageDomainImpl(cdpClient).enable()
 ├─ new RuntimeDomainImpl(cdpClient).enable()
 ├─ new DomDomainImpl(cdpClient).enable()
 ├─ pageDomain.navigate("https://example.com")
 ├─ runtimeDomain.evaluate("document.title", true)
 └─ pageDomain.captureScreenshot(...)
```

---

# 20. 开发优先级建议

## 第 1 优先级
- CdpClient
- PageDomain
- RuntimeDomain

## 第 2 优先级
- DomDomain
- InputDomain

## 第 3 优先级
- NetworkDomain
- TargetDomain

## 第 4 优先级
- Emulation / Overlay / Accessibility

---

# 21. 常见坑与规避策略

## 21.1 只依赖 Page.navigate 不等于页面可操作
必须加 WaitEngine。

## 21.2 只用 JS click 有时不够
很多页面需要真实输入事件，Input 域要补上。

## 21.3 objectId 不释放会积累
Runtime 对象组要管理。

## 21.4 target / frame 处理不要偷懒
新标签页、popup、iframe 迟早会遇到。

## 21.5 tip-of-tree 文档不能照抄全上
实验字段要谨慎，优先实现平台稳定子集。

## 21.6 不要让上层到处拼 CDP method 字符串
全部收口到 Domain 层。

---

# 22. 官方参考文档

1. Chrome DevTools Protocol 总览  
   https://chromedevtools.github.io/devtools-protocol/

2. Chrome DevTools Protocol tip-of-tree  
   https://chromedevtools.github.io/devtools-protocol/tot/

3. Page Domain  
   https://chromedevtools.github.io/devtools-protocol/tot/Page/

4. Runtime Domain  
   https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

5. DOM Domain  
   https://chromedevtools.github.io/devtools-protocol/tot/DOM/

6. Input Domain  
   https://chromedevtools.github.io/devtools-protocol/tot/Input/

7. Network Domain  
   https://chromedevtools.github.io/devtools-protocol/tot/Network/

8. Target Domain  
   https://chromedevtools.github.io/devtools-protocol/tot/Target/

9. Microsoft Edge DevTools Protocol  
   https://learn.microsoft.com/en-us/microsoft-edge/test-and-automation/devtools-protocol

---

**文档结束**
