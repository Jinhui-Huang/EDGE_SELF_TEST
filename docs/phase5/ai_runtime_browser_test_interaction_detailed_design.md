# AI 执行浏览器页面测试运行时交互详细设计文档
**版本**: v1.0  
**定位**: 定义在企业级网页自动化测试平台中，**AI Agent** 与 **浏览器执行器** 在“运行时”如何交互，以实现可控、可审计、可恢复的智能页面测试执行。  
**适用范围**: Edge + CDP + Java 核心执行平台 + 多模型 AI（Claude / ChatGPT / 本地离线模型）  
**前置文档**:  
- `enterprise_web_test_platform_tech_design.md`
- `enterprise_web_test_platform_phase2_implementation_design.md`
- `enterprise_web_test_platform_phase3_java_core_code_skeleton.md`
- `cdp_domain_encapsulation_detailed_design.md`
- `phase5_ai_document_driven_web_test_with_db_prep_restore.md`

---

# 目录

1. 文档目标  
2. 运行时交互的核心原则  
3. 运行时总体架构  
4. 角色与职责划分  
5. 运行时对象模型  
6. 标准运行时主循环  
7. 页面状态识别机制  
8. AI 与执行器的消息交互模型  
9. 运行时 AI 可做与不可做的事情  
10. 运行时决策点设计  
11. 运行时失败处理机制  
12. 动态修正机制  
13. 定位器修复运行时设计  
14. 多页面 / 新 tab / iframe / 弹窗处理  
15. 数据准备、断言、恢复与运行时联动  
16. Artifact 与运行时快照  
17. 运行时审计与安全  
18. 多模型运行时路由策略  
19. 运行时接口设计建议  
20. 时序图  
21. 典型场景示例  
22. 开发实施建议  
23. 验收标准  

---

# 1. 文档目标

本文件用于回答：

> 在“AI 读取测试文档并自动执行网页测试”的最终方案里，真正运行测试时，AI 与浏览器执行器如何协同？

重点不在“AI 如何生成 DSL”，而在：

- 测试真正开始执行后，AI 如何参与
- 哪些动作必须由确定性执行器完成
- 哪些判断可以让 AI 辅助
- 页面切换复杂时如何在运行时决策
- 失败时如何处理、回退、修复
- 如何保证系统不会因为 AI 介入而失控

---

# 2. 运行时交互的核心原则

## 2.1 执行器永远是主控制器
运行时的唯一“动作执行权”必须属于确定性执行器。

也就是说：
- click / fill / wait / assert / screenshot / compareData / restoreData
都必须由执行器调用。

AI 不能直接绕过执行器去“自己控制浏览器”。

## 2.2 AI 是运行时智能判断层，不是底层动作层
AI 在运行时的主要职责是：
- 页面状态识别辅助
- 分支选择辅助
- 候选定位器选择建议
- 失败原因判断
- 有限度动态修正建议

## 2.3 所有运行时 AI 输出都必须受规则约束
AI 可以输出：
- `识别当前在 login_error_state`
- `建议从 locatorCandidates 中选第 2 个`
- `建议增加 waitForVisible(.toast)`  
但最终是否采纳，必须由规则引擎和运行时控制器决定。

## 2.4 运行时必须可回放、可审计、可诊断
每次 AI 参与的判断都必须记录：
- 输入上下文
- 输出建议
- 是否被采纳
- 最终执行结果

## 2.5 高风险动作不允许运行时自由生成
以下动作必须预定义：
- 数据准备
- 数据恢复
- 数据删除
- 写 DB
- 修改环境
- 跳过核心断言

---

# 3. 运行时总体架构

```text
Test Orchestrator
 ├─ Run State Manager
 ├─ Runtime Decision Engine
 ├─ Browser Execution Core
 │   ├─ Page Controller
 │   ├─ Element Resolver
 │   ├─ Action Executor
 │   ├─ Wait Engine
 │   └─ Assertion Engine
 ├─ Runtime AI Interaction Layer
 │   ├─ State Recognition Adapter
 │   ├─ Branch Decision Adapter
 │   ├─ Locator Repair Adapter
 │   └─ Failure Analysis Adapter
 ├─ Data Preparation / Snapshot / Restore
 ├─ Artifact Collector
 └─ Audit Logger
```

运行时里，`Test Orchestrator` 是总控。  
AI 交互层只是 Orchestrator 的一个辅助决策模块。

---

# 4. 角色与职责划分

## 4.1 Test Orchestrator
职责：
- 启动 run
- 维护运行上下文
- 推进 step / state
- 决定是否调用 AI
- 决定是否采纳 AI 建议
- 决定失败/继续/恢复

## 4.2 Runtime Decision Engine
职责：
- 在关键运行时节点做决策
- 决定是否进入 AI 辅助模式
- 决定是否走 fallback
- 决定是否重试、跳转、终止

## 4.3 Browser Execution Core
职责：
- 执行页面动作
- 获取页面状态原始信息
- 执行等待
- 执行断言
- 执行截图和 DOM 采集

## 4.4 Runtime AI Interaction Layer
职责：
- 组装运行时上下文给 AI
- 请求 AI 做状态识别/修复/分析
- 标准化 AI 输出
- 交给规则层判定

## 4.5 Artifact Collector
职责：
- 每个关键节点采集运行时现场
- 保存 AI 输入摘要与 AI 输出结果
- 保存截图、DOM、console、network、data diff

## 4.6 Audit Logger
职责：
- 记录 AI 是否参与
- 哪个模型参与
- 什么时候参与
- 给了什么建议
- 最终是否采纳

---

# 5. 运行时对象模型

## 5.1 RuntimeExecutionContext

```java
public class RuntimeExecutionContext {
    private String runId;
    private String currentState;
    private String currentStepId;
    private String currentTargetId;
    private String currentFrameId;
    private String currentTabId;

    private Map<String, Object> variables;
    private List<String> visitedStates;
    private List<RuntimeDecisionRecord> decisions;
    private List<AiDecisionRecord> aiDecisions;
}
```

## 5.2 RuntimeDecisionRecord
记录每一个运行时关键决策。

```java
public class RuntimeDecisionRecord {
    private String decisionType;
    private String reason;
    private boolean aiInvolved;
    private boolean accepted;
    private String result;
}
```

## 5.3 AiDecisionRecord
记录 AI 在运行时输出的建议。

```java
public class AiDecisionRecord {
    private String taskType;
    private String provider;
    private String model;
    private String inputSummary;
    private String outputSummary;
    private boolean accepted;
}
```

---

# 6. 标准运行时主循环

## 6.1 线性视角
```text
准备数据
  ↓
建立快照
  ↓
进入初始页面状态
  ↓
执行状态内动作
  ↓
等待页面变化
  ↓
识别当前页面状态
  ↓
选择分支
  ↓
继续执行 / 断言 / 结束
  ↓
数据比较
  ↓
恢复数据
  ↓
报告输出
```

## 6.2 运行时循环伪代码

```java
while (!runFinished) {
    collectRuntimeSnapshot();

    if (requiresStateRecognition()) {
        StateRecognitionResult state = recognizeState();
        updateCurrentState(state);
    }

    if (requiresBranchDecision()) {
        Transition transition = decideTransition();
        moveToNextState(transition);
    }

    StepResult result = executeCurrentStep();

    if (result.failed()) {
        FailureHandlingResult failureResult = handleFailure(result);
        if (failureResult.shouldStop()) {
            break;
        }
    }

    if (shouldCompareDataNow()) {
        runDataComparison();
    }
}
```

---

# 7. 页面状态识别机制

## 7.1 为什么运行时必须识别页面状态
复杂页面流程下，执行器不能只依赖“我刚刚点了什么”，而必须判断：

- 当前是不是仍在原页面
- 是否进入成功页
- 是否进入错误页
- 是否弹出了二次确认框
- 是否打开了新 tab
- 是否切到了 iframe 内状态

## 7.2 状态识别输入来源
运行时状态识别的输入建议来自：

- 当前 URL
- document.title
- 页面主文案
- 关键表单字段
- 关键按钮
- 特征元素
- popup/dialog 标识
- 当前 tab 数
- 当前 frame 特征

## 7.3 状态识别三层策略

### 第一层：规则识别
优先用确定性规则识别。
例如：
- URL = `/home`
- 页面存在 `.error-msg`
- 标题含“修改密码”

### 第二层：模板匹配
与已知状态模板对比。
例如：
- `login_page`
- `home_page`
- `error_dialog`

### 第三层：AI 辅助识别
当规则与模板都无法明确判定时，再让 AI 介入。

---

# 8. AI 与执行器的消息交互模型

运行时不建议把 AI 直接塞在执行器内部，建议用标准任务形式调用。

## 8.1 运行时 AI 任务类型

- `runtime_state_recognition`
- `runtime_branch_decision`
- `runtime_locator_repair`
- `runtime_failure_analysis`

## 8.2 State Recognition 输入示例

```json
{
  "taskType": "runtime_state_recognition",
  "currentUrl": "https://example.com/login",
  "title": "登录页",
  "visibleTextSummary": "用户名 密码 登录 用户名或密码错误",
  "candidateStates": [
    "login_page",
    "login_error_state",
    "home_page"
  ]
}
```

输出：

```json
{
  "state": "login_error_state",
  "confidence": 0.93,
  "reason": "页面仍为登录页，且出现错误文案“用户名或密码错误”"
}
```

## 8.3 Branch Decision 输入示例

```json
{
  "taskType": "runtime_branch_decision",
  "currentState": "login_page",
  "availableTransitions": [
    {"condition": "page=home_page", "to": "home_page"},
    {"condition": "text=用户名或密码错误", "to": "login_error_state"}
  ],
  "currentObservation": {
    "visibleTextSummary": "用户名 密码 登录 用户名或密码错误"
  }
}
```

输出：

```json
{
  "nextState": "login_error_state",
  "confidence": 0.95
}
```

---

# 9. 运行时 AI 可做与不可做的事情

## 9.1 允许做
- 识别当前页面状态
- 从候选分支中选择下一状态
- 从候选定位器中推荐替代项
- 给出失败原因解释
- 建议增加额外等待
- 建议重试一次

## 9.2 不允许做
- 直接执行 click / fill / press
- 自己创造全新业务步骤
- 跳过数据恢复
- 跳过核心断言
- 自己编造 SQL 并执行
- 修改环境配置

---

# 10. 运行时决策点设计

运行时不是每一步都要调用 AI。  
只在特定决策点触发。

## 10.1 关键决策点

### 决策点 A：状态识别失败
规则无法判断当前页面属于哪个状态。

### 决策点 B：分支冲突
多个分支条件都部分满足，无法确定下一步。

### 决策点 C：定位器失效
目标元素找不到，或多个候选都不稳定。

### 决策点 D：失败归因
step 失败后，需要分析是等待问题、定位问题、页面错误还是业务错误。

### 决策点 E：数据差异异常
页面执行后 DB 数据变化不符合预期，需要 AI 做摘要解释。

---

# 11. 运行时失败处理机制

## 11.1 失败分类
运行时失败建议分为：

- `state_recognition_failed`
- `branch_decision_failed`
- `locator_failed`
- `wait_timeout`
- `assertion_failed`
- `unexpected_popup`
- `tab_switch_failed`
- `data_comparison_failed`
- `restore_failed`

## 11.2 失败处理优先级

### 优先 1：确定性 fallback
例如：
- 重试 resolver
- 重新 wait
- 重新获取页面摘要

### 优先 2：AI 辅助建议
例如：
- 重新识别状态
- 推荐候选定位器
- 识别是否进入错误页

### 优先 3：终止并分析
当仍无法恢复时，停止流程并输出失败分析。

---

# 12. 动态修正机制

动态修正必须是**有限制的**。

## 12.1 允许修正的内容
- 替换目标定位器（限定在候选集合内）
- 增加一次等待
- 切换到另一个合法状态分支
- 选择已知 popup/dialog 处理路径

## 12.2 不允许修正的内容
- 改动测试意图
- 改动核心断言
- 跳过数据准备/恢复
- 改动安全策略

## 12.3 动态修正记录
每一次动态修正都必须记录：
- 原问题
- AI 建议
- 最终采纳方案
- 后续结果

---

# 13. 定位器修复运行时设计

## 13.1 输入
- 原始 target
- 当前页面摘要
- 候选定位器列表
- DOM/文本摘要
- 最近失败信息

## 13.2 输出
AI 只能从候选中推荐，不直接 invent 随机 selector。

```json
{
  "recommendedCandidateIndex": 1,
  "reason": "按钮文本仍为登录，id 已变化，推荐使用 text 定位"
}
```

## 13.3 运行时流程
1. Resolver 常规定位失败  
2. 收集候选与页面摘要  
3. 调用 `runtime_locator_repair`  
4. 规则层校验推荐是否在候选集合内  
5. 若合法，则重试一次  
6. 记录审计

---

# 14. 多页面 / 新 tab / iframe / 弹窗处理

## 14.1 新 tab
运行时必须监听：
- 新 target
- 当前 active target 切换

AI 可辅助判断：
- 新开的 tab 是否属于预期下一状态

## 14.2 iframe
运行时上下文要维护：
- 当前 frameId
- frame 层级信息

AI 可辅助判断：
- 当前状态是否出现在 iframe 内

## 14.3 弹窗 / dialog
对于已知弹窗：
- 用规则模板处理

对于未知弹窗：
- 允许 AI 识别“这是确认框 / 错误框 / 登录超时框”
- 但最终处理动作必须由预定义策略完成

---

# 15. 数据准备、断言、恢复与运行时联动

## 15.1 数据准备阶段
运行时开始前必须先完成：
- 数据计划执行
- 基线快照
- 准备后验证

这一步 AI 不应在运行中临时自由增加写 DB 动作。

## 15.2 页面操作后数据比较
运行时在关键节点执行：
- before vs after_action
- after_action vs expected
- before vs after_restore

当数据比较失败时，可以调用 AI 做“差异解释”，但不能让 AI 自己修数据库。

## 15.3 恢复阶段
无论页面测试成功还是失败，只要有恢复计划，运行时都必须进入恢复阶段。

---

# 16. Artifact 与运行时快照

## 16.1 运行时快照时点
建议至少采集这些快照：

- `before_step`
- `after_step`
- `before_state_decision`
- `after_state_decision`
- `before_ai_runtime_call`
- `after_ai_runtime_call`
- `on_failure`
- `after_restore`

## 16.2 运行时快照内容
- 当前 URL
- title
- visibleText 摘要
- 当前 state / step
- 当前 tab/frame
- screenshot
- DOM 摘要
- console / network 摘要
- data diff 摘要
- AI 输入摘要
- AI 输出摘要

---

# 17. 运行时审计与安全

## 17.1 必须审计的内容
- 是否调用了运行时 AI
- 使用了哪个模型/提供方
- 输入摘要
- 输出建议
- 是否采纳
- 是否触发动态修正
- 是否影响执行结果

## 17.2 安全底线
运行时 AI 不能：
- 写数据库
- 改 DSL 根结构
- 改数据恢复策略
- 改环境参数
- 跳过安全校验

---

# 18. 多模型运行时路由策略

## 18.1 本地模型优先
运行时决策通常时间敏感，因此建议：
- `runtime_state_recognition`：本地优先
- `runtime_branch_decision`：本地优先
- `runtime_locator_repair`：本地优先
- `runtime_failure_analysis`：本地优先，疑难可回退云端

## 18.2 云端模型使用原则
仅在以下条件允许时使用：
- 企业策略允许
- 当前任务非高实时
- 本地模型多次失败
- 输入已做脱敏/摘要化

---

# 19. 运行时接口设计建议

## 19.1 RuntimeAiCoordinator

```java
public interface RuntimeAiCoordinator {
    StateRecognitionResult recognizeState(RuntimeStateRecognitionInput input);
    BranchDecisionResult decideBranch(RuntimeBranchDecisionInput input);
    LocatorRepairResult repairLocator(RuntimeLocatorRepairInput input);
    FailureAnalysisResult analyzeFailure(RuntimeFailureAnalysisInput input);
}
```

## 19.2 RuntimeDecisionEngine

```java
public interface RuntimeDecisionEngine {
    DecisionResult handleStateRecognition(RuntimeExecutionContext context);
    DecisionResult handleBranchDecision(RuntimeExecutionContext context);
    DecisionResult handleLocatorFailure(RuntimeExecutionContext context, Throwable throwable);
    DecisionResult handleFailure(RuntimeExecutionContext context, Throwable throwable);
}
```

## 19.3 RuntimeSnapshotCollector

```java
public interface RuntimeSnapshotCollector {
    RuntimeSnapshot capture(RuntimeExecutionContext context, String stage);
}
```

---

# 20. 时序图

## 20.1 状态识别与分支决策

```text
TestOrchestrator
  -> collect current page snapshot
  -> try rule-based state recognition
     -> if success: continue
     -> if fail: call RuntimeAiCoordinator.recognizeState()
        -> get AI result
        -> validate result
        -> update current state
  -> evaluate transitions
     -> if ambiguous: call RuntimeAiCoordinator.decideBranch()
        -> validate result
        -> move to next state
```

## 20.2 定位器失效修复

```text
ActionExecutor
  -> ElementResolver.resolve()
     -> fail
  -> collect locator candidates + page summary
  -> RuntimeAiCoordinator.repairLocator()
  -> validate recommended candidate
  -> retry execute once
  -> if still fail: stop and analyze
```

---

# 21. 典型场景示例

## 21.1 登录失败提示场景
- 点击“登录”后
- 页面未跳转
- 出现错误提示
- Runtime 识别当前为 `login_error_state`
- 走错误分支断言
- 比较 DB fail_count 变化
- 输出报告

## 21.2 首次登录修改密码场景
- 点击“登录”后
- 打开新状态页
- 规则识别不明确
- AI 识别为 `change_password_page`
- 进入修改密码分支
- 执行后继续回首页

## 21.3 未知弹窗场景
- 点击后出现意外弹窗
- 模板无法识别
- AI 判断为“确认类弹窗”
- 规则层检查是否存在该状态合法转移
- 若存在则使用预定义 confirm 动作
- 若不存在则终止并报告

---

# 22. 开发实施建议

## 22.1 第一阶段
先实现：
- 规则优先状态识别
- AI 辅助状态识别
- AI 辅助定位器修复
- 运行时快照采集

## 22.2 第二阶段
再实现：
- 分支决策 AI
- 弹窗/新 tab/iframe 运行时处理
- data diff 异常解释

## 22.3 第三阶段
最后实现：
- 运行时多模型路由
- 动态修正策略细化
- 运行时 AI 审计视图

---

# 23. 验收标准

满足以下条件，才算运行时交互设计达标：

1. 执行器仍是唯一动作执行主体  
2. 运行时可在关键决策点调用 AI  
3. AI 可辅助识别页面状态与分支  
4. AI 可辅助定位器修复，但只能在候选集合内推荐  
5. 运行时失败后可进行有边界的动态修正  
6. 页面测试、数据比较、数据恢复在运行时闭环一致  
7. 每次 AI 运行时参与都可审计、可回放、可诊断  
8. 云端模型与本地模型运行时策略可配置  

---

**文档结束**
