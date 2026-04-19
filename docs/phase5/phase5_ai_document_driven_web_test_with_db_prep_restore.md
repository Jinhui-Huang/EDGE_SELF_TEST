# Phase 5 最终阶段详细设计文档
## AI 读取测试文档并自动化执行网页测试（含 DB 测试数据准备与还原）
**版本**: v1.0  
**阶段归属**: Phase 5（Agent 化最终阶段）  
**项目定位**: 在既有企业级网页自动化测试平台基础上，扩展实现 **AI 读取测试文档（内容格式不限）→ 自动生成测试意图/流程/DSL → 自动准备 DB 测试数据 → 自动执行网页测试 → 自动分析结果 → 自动还原测试数据与回写进度** 的完整能力。  

---

# 目录

1. 文档目标  
2. Phase 5 的定位与边界  
3. 最终目标定义  
4. Phase 5 前置依赖  
5. 总体架构图  
6. 核心能力分层  
7. 多模型 AI Agent 总体设计  
8. 测试文档读取与统一文档模型  
9. 测试意图提取设计  
10. 页面流程与状态机建模  
11. DSL 生成与规则收敛  
12. DB 测试数据准备与还原设计  
13. 测试前后数据比较设计  
14. 执行反馈回流与动态修正  
15. 报告、审计与进度回写  
16. 平台 UI 与 Edge 插件分工  
17. 多模型路由、用户选模与回退策略  
18. 安全控制与企业治理  
19. Phase 5 模块拆分  
20. 数据结构与 DSL 扩展  
21. 标准执行主流程  
22. 失败场景与恢复策略  
23. 开发阶段拆分  
24. 验收标准  
25. 最终实施建议  

---

# 1. 文档目标

本文件用于定义 **Phase 5 最终形态**：

> 用户提供测试文档，平台中的 AI Agent 自动读取并理解文档，抽取测试目标与流程，自动生成测试计划/状态机/DSL，自动准备数据库测试数据并在测试前建立基线，自动执行网页测试，自动采集页面与数据库结果，自动分析失败，最终在测试后恢复测试数据并输出报告。

这里的“自动化执行网页测试”完整覆盖：
- 测试文档理解
- 测试数据准备
- 页面流程自动化
- DB 预置与校验
- 测试后数据回滚/还原
- 失败归因与进度记录

---

# 2. Phase 5 的定位与边界

## 2.1 Phase 5 的定位
Phase 5 是平台从“可执行的测试平台”升级为“**文档驱动的智能测试平台**”的阶段。

## 2.2 Phase 5 的核心新增能力
1. 测试文档读取  
2. 测试意图提取  
3. 页面流程状态机建模  
4. DSL 自动生成  
5. 执行中反馈理解  
6. 有限度动态修正  
7. DB 测试数据自动准备  
8. 每次测试前基线快照  
9. 每次测试后自动还原数据  
10. 多模型 AI 路由与用户选模  

## 2.3 不变原则
- 执行器仍然是确定性的  
- AI 不直接裸控制浏览器  
- AI 输出必须经过规则校验  
- 数据库操作必须受权限、安全、模板和审计约束  
- 插件仍然只是辅助，不是主平台  

---

# 3. 最终目标定义

## 3.1 用户视角目标
1. 选择项目/环境  
2. 上传测试文档或选择已有文档  
3. 选择 AI 模型策略  
4. 点击“生成测试”  
5. 平台自动：
   - 读取文档
   - 生成测试意图
   - 生成页面流程状态机
   - 生成可执行 DSL
   - 生成测试数据准备计划
6. 点击“执行测试”  
7. 平台自动：
   - 准备 DB 测试数据
   - 备份/快照关键数据
   - 执行页面测试
   - 断言 UI/API/DB
   - 测试结束后还原数据
   - 输出报告与失败分析

## 3.2 企业级最终目标
- 文档驱动测试  
- 多模型支持（Claude / ChatGPT / 本地离线模型）  
- 复杂页面流程支持（多页、分支、弹窗、tab、iframe）  
- 页面断言 + DB 断言闭环  
- 测试前自动造数 / 置数  
- 测试后自动回滚 / 清理 / 还原  
- 可审计、可复现、可配置、可离线部署  

---

# 4. Phase 5 前置依赖

## 4.1 Phase 1 依赖
- goto
- fill
- click
- wait
- assertText
- screenshot

## 4.2 Phase 2 依赖
- retry
- 多候选定位器
- iframe / 多 tab 处理
- console / network 采集
- 稳定 WaitEngine

## 4.3 Phase 3 依赖
- 项目管理
- 用例管理
- 环境管理
- 报告与执行历史
- 基础模型配置管理

## 4.4 Phase 4 依赖
- DB 断言能力
- 异常路径测试模板
- message / response / DB 模板化断言
- 数据源治理基础

---

# 5. 总体架构图

```text
用户/测试工程师
   ↓
后台管理端（主） / Edge 插件（辅）
   ↓
Agent Coordinator
 ├─ TestDocumentReader
 ├─ TestIntentExtractor
 ├─ PageFlowBuilder
 ├─ StateMachineGenerator
 ├─ DslPlanner
 ├─ DbDataPreparationPlanner
 ├─ ExecutionFeedbackAdapter
 ├─ LocatorRepairAdvisor
 └─ FailureAnalyzer
   ↓
Test Orchestrator
 ├─ PreTestDataPreparationEngine
 ├─ DataSnapshotManager
 ├─ DSL Engine
 ├─ Browser Execution Core
 ├─ Assertion Engine
 ├─ Artifact Collector
 ├─ PostTestRestoreEngine
 └─ Audit & Security
   ↓
Report Center / Progress Writer
```

---

# 6. 核心能力分层

## 6.1 文档理解层
- 读取测试文档
- 识别格式
- 切分结构
- 提取测试语义

## 6.2 测试规划层
- 生成测试意图
- 生成页面流程
- 生成状态机
- 生成 DSL
- 生成测试数据准备计划

## 6.3 执行编排层
- 测试前准备数据
- 基线快照
- 执行页面测试
- 执行 DB 断言
- 收集结果
- 执行后恢复数据

## 6.4 反馈与修正层
- 接收执行反馈
- 分析失败
- 进行有限修正
- 生成下一步建议

## 6.5 治理与审计层
- 模型控制
- 数据源权限控制
- SQL 模板白名单
- 还原策略治理
- 审计日志
- 进度回写

---

# 7. 多模型 AI Agent 总体设计

## 7.1 支持模型
- Claude
- ChatGPT
- 本地离线模型

## 7.2 统一抽象
```java
public interface AiProvider {
    AiResponse generate(AiRequest request);
}
```

```java
public interface AiRouter {
    AiResponse execute(AiTask task);
}
```

## 7.3 任务类型
- doc_understanding
- test_intent_generation
- page_flow_generation
- state_machine_generation
- dsl_generation
- db_data_plan_generation
- failure_analysis
- locator_repair

## 7.4 用户选模
用户必须可选：
- 自动
- 本地模型
- ChatGPT
- Claude

并支持高级模式：
- 文档理解模型
- 测试生成模型
- 失败分析模型
- 定位器修复模型

---

# 8. 测试文档读取与统一文档模型

## 8.1 支持输入格式
- Markdown
- Word 导出文本
- PDF 提取文本
- Excel / CSV 测试用例
- 富文本手顺说明
- 缺陷回归说明
- 需求说明中的测试章节
- API 说明中的测试规则片段

## 8.2 统一文档模型
```json
{
  "docId": "doc_001",
  "title": "登录失败测试",
  "sourceType": "markdown",
  "cases": [
    {
      "caseId": "TC_LOGIN_001",
      "title": "错误密码登录",
      "preconditions": ["进入登录页"],
      "steps": ["输入正确用户名", "输入错误密码", "点击登录"],
      "expectedResults": ["显示用户名或密码错误"],
      "dbRequirements": ["登录失败次数加1"],
      "notes": []
    }
  ]
}
```

## 8.3 Document Reader 职责
- 读取原始内容
- 文档切块
- 按测试用例划分
- 标记明确项 / 推断项 / 缺失项

---

# 9. 测试意图提取设计

## 9.1 目标
把文档中的自然语言测试步骤转成“测试意图模型”。

## 9.2 输出结构
```json
{
  "goal": "验证错误密码时登录失败提示是否正确，并校验数据库失败计数",
  "preconditions": ["用户已进入登录页"],
  "pages": ["login_page"],
  "actions": [
    {"type": "input", "field": "用户名", "value": "正确用户名"},
    {"type": "input", "field": "密码", "value": "错误密码"},
    {"type": "click", "target": "登录"}
  ],
  "assertions": [
    {"type": "ui_text", "expected": "用户名或密码错误"},
    {"type": "db_assert", "expected": "login_fail_count + 1"}
  ],
  "dataPreparation": [
    {"type": "ensure_user_exists", "user": "admin"},
    {"type": "set_login_fail_count", "value": 0}
  ]
}
```

## 9.3 必须标记来源
- source: explicit
- source: inferred
- source: missing

---

# 10. 页面流程与状态机建模

## 10.1 为什么必须用状态机
复杂页面流程不能只用线性 step list，需要支持：
- 多页面切换
- 成功/失败分支
- 首次登录特殊页
- 弹窗
- 新 tab
- iframe
- 错误留在原页

## 10.2 状态机结构
```json
{
  "scenario": "login_flow",
  "states": [
    {
      "name": "login_page",
      "identify": [
        {"type": "text", "value": "用户名"},
        {"type": "text", "value": "密码"}
      ],
      "actions": [
        {"type": "fill", "field": "用户名"},
        {"type": "fill", "field": "密码"},
        {"type": "click", "target": "登录"}
      ],
      "transitions": [
        {"condition": "page=home_page", "to": "home_page"},
        {"condition": "text=用户名或密码错误", "to": "login_error_state"}
      ]
    }
  ]
}
```

## 10.3 分工
AI 负责生成：
- 页面状态
- 状态识别条件
- 转移条件
- 可能分支

规则引擎负责校验：
- 是否有起点
- 是否有死循环
- 是否有缺失出口
- 是否有不可达状态

---

# 11. DSL 生成与规则收敛

## 11.1 原则
- AI 输出状态机 / 测试意图
- DslPlanner 规则化收敛为稳定 DSL

## 11.2 DslPlanner 职责
- 插入标准 wait
- 插入标准 screenshot
- 选择断言模板
- 插入 DB 断言模板
- 插入数据准备步骤引用
- 插入测试后还原步骤引用

## 11.3 DSL 扩展示例
```json
{
  "id": "case_login_error_001",
  "name": "错误密码登录",
  "env": "sit",
  "dataPlanRef": "dataplan_login_error_001",
  "restorePlanRef": "restore_login_error_001",
  "steps": [
    {"action": "goto", "url": "${baseUrl}/login"},
    {"action": "fill", "target": {"by":"label","value":"用户名"}, "value": "${username}"},
    {"action": "fill", "target": {"by":"label","value":"密码"}, "value": "${password}"},
    {"action": "click", "target": {"by":"role","value":"button","name":"登录"}},
    {"action": "waitForVisible", "target": {"by":"css","value":".error-msg"}},
    {"action": "assertText", "target": {"by":"css","value":".error-msg"}, "expected":"用户名或密码错误"},
    {"action": "assertDb", "datasource":"main_db", "sql":"select fail_count from t_user where user_name=:username", "params":{"username":"${username}"}, "expect":{"fail_count":1}},
    {"action": "screenshot", "name":"login_error"}
  ]
}
```

---

# 12. DB 测试数据准备与还原设计

这一部分是 Phase 5 正式主能力。

## 12.1 目标
在每次测试执行前，平台根据测试文档和测试意图自动：
- 识别所需测试数据
- 生成测试数据准备计划
- 执行插入 / 更新 / 清理
- 对关键数据做基线快照

在每次测试执行后，平台自动：
- 恢复快照
- 删除临时数据
- 还原修改字段
- 输出还原结果

## 12.2 设计原则
### 原则 1：AI 只生成“数据计划”，不直接自由拼 SQL 执行
### 原则 2：优先模板化/语义化，而不是自由 SQL
### 原则 3：每次测试前都建立恢复基线
### 原则 4：默认只允许测试环境 / 指定白名单数据源

## 12.3 模块拆分
- DB Data Preparation Planner
- Data Template Registry
- Pre-Test Data Preparation Engine
- Data Snapshot Manager
- Post-Test Restore Engine
- Data Audit Logger

## 12.4 数据计划结构
```json
{
  "dataPlanId": "dataplan_login_error_001",
  "caseId": "case_login_error_001",
  "preparationSteps": [
    {
      "type": "template",
      "template": "ensure_user_exists",
      "params": {"username": "admin"}
    },
    {
      "type": "snapshot",
      "snapshotKey": "user_login_state",
      "datasource": "main_db",
      "sql": "select user_name, fail_count, status from t_user where user_name = :username",
      "params": {"username": "admin"}
    },
    {
      "type": "template",
      "template": "set_login_fail_count",
      "params": {"username": "admin", "failCount": 0}
    }
  ],
  "restorePlan": [
    {
      "type": "restoreSnapshot",
      "snapshotKey": "user_login_state"
    }
  ]
}
```

## 12.5 数据模板注册结构
```json
{
  "templateName": "set_login_fail_count",
  "description": "设置用户登录失败次数",
  "datasource": "main_db",
  "mode": "update",
  "sql": "update t_user set fail_count = :failCount where user_name = :username",
  "readonly": false,
  "allowedEnvs": ["local", "sit", "uat-test"],
  "rollbackStrategy": "restore_snapshot",
  "requiredParams": ["username", "failCount"]
}
```

## 12.6 快照结构
```json
{
  "snapshotId": "snap_001",
  "runId": "run_001",
  "snapshotKey": "user_login_state",
  "datasource": "main_db",
  "rows": [
    {
      "user_name": "admin",
      "fail_count": 0,
      "status": "ACTIVE"
    }
  ]
}
```

## 12.7 还原策略
- restore_snapshot
- delete_inserted_rows
- truncate_test_scope
- transaction_rollback（不作为主策略）

### 默认推荐
- update 类：restore_snapshot
- insert 类：delete_inserted_rows
- 组合场景：snapshot + cleanup

## 12.8 执行前/执行后流程
### 执行前
1. 读取数据计划
2. 校验环境是否允许
3. 执行快照步骤
4. 执行数据准备模板
5. 记录审计
6. 写入 ExecutionContext

### 执行后
1. 根据 restorePlan 顺序执行恢复
2. 校验恢复结果
3. 记录审计
4. 写入报告

## 12.9 报告中必须展示
- 本次是否进行了数据准备
- 执行了哪些数据模板
- 建立了哪些快照
- 测试后是否恢复成功
- 哪些恢复失败
- 是否需要人工清理

## 12.10 安全要求
- 仅允许白名单数据源
- 仅允许白名单模板
- 默认禁止自由文本 SQL 写操作
- 生产环境默认禁用数据写入
- 所有写操作必须审计
- 所有恢复失败必须显著告警

---

# 13. 测试前后数据比较设计

这一部分作为 Phase 5 的正式能力加入，用于验证：
- 页面操作前后的数据库变化是否符合预期
- 页面操作是否引入了非预期的数据污染
- 测试后恢复是否真正回到了基线状态

## 13.1 目标

平台应支持三类数据比较：

### A. 执行前基线 vs 页面操作后结果
用于验证业务动作是否产生了正确的数据变化。

### B. 页面操作后结果 vs 文档/DSL 预期结果
用于验证数据库最终状态是否与测试预期一致。

### C. 执行前基线 vs 恢复后结果
用于验证测试后数据还原是否成功。

## 13.2 为什么必须有

仅有 `assertDb` 还不够，因为 `assertDb` 通常只验证某几个字段。  
测试前后数据比较可以补足：

- 哪些字段发生了变化
- 变化方向是否正确
- 是否有不该变化的字段也被改了
- 测试后是否真的恢复原值
- 恢复失败时差异在哪里

## 13.3 模块拆分

建议新增：

- `DataComparisonPlanner`
- `PrePostDataComparator`
- `DiffNormalizer`
- `DiffReporter`

## 13.4 比较计划结构

```json
{
  "comparisonPlanId": "cmp_login_error_001",
  "checkpoints": [
    {
      "name": "before_vs_after_action",
      "leftSnapshot": "user_login_state_before",
      "rightSnapshot": "user_login_state_after_action",
      "mode": "row_field_diff",
      "expectedChanges": [
        {"field": "fail_count", "type": "increment", "value": 1}
      ],
      "forbiddenChanges": [
        {"field": "status"},
        {"field": "user_name"}
      ]
    },
    {
      "name": "before_vs_after_restore",
      "leftSnapshot": "user_login_state_before",
      "rightSnapshot": "user_login_state_after_restore",
      "mode": "strict_equal"
    }
  ]
}
```

## 13.5 快照节点建议

在一次测试中，建议至少支持这些快照时点：

- `before_prepare`：数据准备前
- `after_prepare`：数据准备后
- `after_action`：页面操作完成后
- `after_assertion`：断言后（可选）
- `after_restore`：恢复后

## 13.6 比较模式

### strict_equal
左右结果必须完全一致。  
适合恢复验证。

### row_field_diff
按字段比较差异。  
适合业务变化验证。

### expected_only
只检查预期变化字段，忽略其他字段。  
适合弱校验场景，但企业级不建议作为默认。

### custom_rule
通过规则表达式定义。  
例如：
- `fail_count = before.fail_count + 1`
- `status unchanged`

## 13.7 差异结果结构

```json
{
  "comparisonId": "cmp_result_001",
  "status": "FAILED",
  "diffs": [
    {
      "field": "fail_count",
      "before": 0,
      "after": 2,
      "expected": 1,
      "type": "unexpected_value"
    },
    {
      "field": "status",
      "before": "ACTIVE",
      "after": "LOCKED",
      "expected": "unchanged",
      "type": "forbidden_change"
    }
  ]
}
```

## 13.8 与 DSL 的结合

DSL 顶层建议增加：

- `comparisonPlanRef`

或者在 step 中支持：

```json
{
  "action": "compareData",
  "planRef": "cmp_login_error_001"
}
```

## 13.9 运行时主流程中的位置

建议流程为：

1. 基线快照（before_prepare）
2. 数据准备
3. 准备后快照（after_prepare）
4. 页面操作执行
5. 操作后快照（after_action）
6. 执行数据比较（before_vs_after_action）
7. 页面/UI/DB 断言
8. 数据恢复
9. 恢复后快照（after_restore）
10. 执行恢复比较（before_vs_after_restore）

## 13.10 报告中必须展示

- 比较计划名称
- 每个比较节点状态
- 变化字段列表
- 非预期变化字段
- 恢复是否完全一致
- 差异明细

## 13.11 审计要求

必须审计：
- 比较使用的数据源
- 比较使用的快照
- 比较结果
- 是否发现非预期数据污染
- 是否发现恢复不完整

---

# 14. 执行反馈回流与动态修正

## 13.1 反馈来源
- 当前页面摘要
- 当前状态识别结果
- 当前 step 结果
- screenshot / console / network 摘要
- DB 断言结果
- 数据准备/恢复结果

## 13.2 允许的有限修正
- 重新识别页面状态
- 从合法分支中选下一步
- 从候选定位器中切换
- 建议插入等待
- 建议标记失败

## 13.3 禁止
- 擅自发明新业务流程
- 擅自跳过关键断言
- 擅自跳过数据恢复

---

# 14. 报告、审计与进度回写

## 15.1 报告新增内容
- 原始测试文档来源
- 文档理解摘要
- 推断项与缺失项
- 生成的测试意图
- 生成的状态机
- 数据准备计划
- 数据恢复结果
- 模型使用记录
- 失败分析摘要

## 15.2 审计新增内容
- 使用了哪个模型
- 使用了哪个 provider
- 是否走云端
- 使用了哪些数据模板
- 对哪些数据源做了写入
- 是否恢复成功

## 15.3 进度回写
执行结束后自动写入：
- 本次生成/执行结果
- 本次问题
- 当前完成情况

---

# 16. 平台 UI 与 Edge 插件分工

## 16.1 后台管理端（主）
- 上传测试文档
- 选择模型
- 查看文档理解结果
- 查看测试意图/状态机/DSL
- 配置数据准备模板
- 启动执行
- 查看报告
- 查看恢复结果

## 16.2 Edge 插件（辅）
- 当前页摘要
- 页面元素拾取
- 候选定位器获取
- 当前页快速调试
- 当前运行状态查看

### 结论
主入口必须是后台管理端，插件只是页面侧辅助入口。

---

# 17. 多模型路由、用户选模与回退策略

## 17.1 用户必须可选
- 自动
- 本地模型
- ChatGPT
- Claude

## 17.2 高级模式
按任务配置：
- 文档理解模型
- 测试意图模型
- 流程建模模型
- DSL 生成模型
- 失败分析模型

## 17.3 默认策略建议
- 文档理解：本地优先，复杂文档可回退云端
- 流程建模：本地优先
- DSL 生成：本地优先
- 失败分析：本地优先，疑难问题回退云端
- 数据计划生成：本地优先，但最终必须模板化收敛

---

# 18. 安全控制与企业治理

## 18.1 模型治理
- 是否允许云端模型
- 哪些任务可用云端
- 是否记录云端调用审计

## 18.2 数据源治理
- 数据准备与恢复仅允许测试环境
- 必须使用模板
- 禁止自由写入生产

## 18.3 协议治理
- Agent 输出必须通过 schema 校验
- 数据计划必须通过模板解析器
- DSL 必须通过语义校验

## 18.4 失败恢复治理
- 恢复失败必须记录
- 可设置“恢复失败阻止下次执行”
- 必要时支持人工确认恢复

---

# 19. Phase 5 模块拆分

## 19.1 Agent 侧
- TestDocumentReader
- TestIntentExtractor
- PageFlowBuilder
- StateMachineGenerator
- DslPlanner
- DbDataPreparationPlanner
- ExecutionFeedbackAdapter
- DynamicRecoveryPlanner
- FailureAnalyzer

## 19.2 执行侧
- PreTestDataPreparationEngine
- DataTemplateRegistry
- DataSnapshotManager
- PostTestRestoreEngine
- DataAuditLogger

---

# 20. 数据结构与 DSL 扩展

## 20.1 DSL 顶层扩展字段
- dataPlanRef
- restorePlanRef
- documentSourceRef
- aiGenerationMeta
- inferredItems

## 20.2 运行上下文扩展
ExecutionContext 应增加：
- 当前数据计划
- 当前快照列表
- 当前恢复状态
- 当前模型使用信息

---

# 21. 标准执行主流程

```text
上传测试文档
  ↓
TestDocumentReader
  ↓
TestIntentExtractor
  ↓
PageFlowBuilder / StateMachineGenerator
  ↓
DbDataPreparationPlanner
  ↓
DslPlanner
  ↓
规则校验（意图/状态机/DSL/数据计划）
  ↓
PreTestDataPreparationEngine
  ↓
DataSnapshotManager
  ↓
Test Orchestrator 执行页面测试
  ↓
AssertionEngine / DbAssertion
  ↓
ArtifactCollector
  ↓
PostTestRestoreEngine
  ↓
FailureAnalyzer / ReportEngine
  ↓
进度回写
```

---

# 22. 失败场景与恢复策略

## 22.1 文档理解失败
- 标记缺失项
- 允许人工补充
- 不直接执行

## 22.2 DSL 生成失败
- 回退到意图层人工确认
- 不进入执行

## 22.3 数据准备失败
- 阻止执行
- 给出失败模板与错误点

## 22.4 页面执行失败
- 进入失败分析
- 仍然必须执行恢复流程

## 22.5 数据恢复失败
- 报告高优先级告警
- 标记环境可能被污染
- 禁止继续自动批量执行（可配置）

---

# 23. 开发阶段拆分

## 23.1 Phase 5-A
- 文档读取
- 测试意图提取
- 基础 DSL 生成
- 人工确认后执行

## 23.2 Phase 5-B
- 状态机建模
- 执行反馈接入
- 失败分析增强

## 23.3 Phase 5-C
- 数据准备计划生成
- 模板化数据准备
- 快照与还原

## 23.4 Phase 5-D
- 多模型路由
- 用户选模
- 完整文档驱动闭环

---

# 24. 验收标准

1. 上传测试文档后，系统可自动抽取测试意图  
2. 系统可自动生成页面流程/状态机  
3. 系统可自动生成可执行 DSL  
4. 系统可自动生成测试前数据准备计划  
5. 系统可在测试前自动准备和快照关键数据  
6. 系统可执行复杂网页测试  
7. 系统可进行 UI + DB 联动断言  
8. 系统可在测试后自动恢复数据  
9. 系统可输出包含 AI 生成信息、数据准备、恢复结果的完整报告  
10. 用户可自由选择 Claude / ChatGPT / 本地模型 / 自动策略  

---

# 25. 最终实施建议

## 25.1 主线建议
Phase 5 不是简单“接一个大模型”，而是实现：

**文档驱动 + 流程建模 + 数据准备 + 页面执行 + 数据恢复 + 结果分析** 的完整闭环。

## 25.2 最重要的工程原则
- AI 负责理解、规划、建议
- 规则引擎负责收敛
- 执行器负责确定性执行
- 数据准备和恢复必须模板化、可审计、可回滚

## 25.3 最终产品形态
平台将具备真正的：

> **AI 读取测试文档并自动进行网页测试**  
> 并且支持 **测试前自动准备 DB 数据、测试后自动还原数据**。

---

**文档结束**
