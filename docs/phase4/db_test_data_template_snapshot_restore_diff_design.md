# DB 测试数据模板、快照、恢复、差异比较详细设计文档
**版本**: v1.0  
**定位**: 面向企业级网页自动化测试平台的数据库测试数据管理专项设计文档，覆盖 **测试前数据准备、模板化造数、基线快照、测试后恢复、前后差异比较、审计与安全控制**。  
**适用阶段**: Phase 4 深度验证 + Phase 5 Agent 化最终阶段  
**前置文档**:  
- `enterprise_web_test_platform_tech_design.md`
- `enterprise_web_test_platform_phase2_implementation_design.md`
- `phase5_ai_document_driven_web_test_with_db_prep_restore.md`
- `ai_runtime_browser_test_interaction_detailed_design.md`

---

# 目录

1. 文档目标  
2. 设计范围与边界  
3. 设计原则  
4. 总体架构  
5. 核心模块拆分  
6. 数据模板体系设计  
7. 测试前数据准备设计  
8. 基线快照设计  
9. 测试后恢复设计  
10. 测试前后差异比较设计  
11. 与 DSL 的结合方式  
12. 与 Agent 的结合方式  
13. 与运行时执行器的结合方式  
14. 数据源治理与安全策略  
15. 审计设计  
16. 数据结构设计  
17. Java 接口设计建议  
18. 执行流程设计  
19. 失败场景与恢复策略  
20. 开发实施建议  
21. 验收标准  

---

# 1. 文档目标

本文件用于定义平台中数据库测试数据相关的完整闭环能力：

- 测试前自动准备数据
- 使用模板化方式造数/置数
- 建立执行前基线快照
- 页面测试执行后进行差异比较
- 测试结束后自动恢复/还原数据
- 输出审计与报告信息

目标不是简单提供“执行一条 SQL”的工具，而是建设一个：

> **可控、可审计、可恢复、可比较、可复用的数据库测试数据管理系统**

---

# 2. 设计范围与边界

## 2.1 本文覆盖的范围
- 数据模板定义
- 参数化造数
- 快照采集
- 恢复策略
- 差异比较
- 与 DSL、Agent、执行器集成
- 安全与审计

## 2.2 不覆盖的范围
- 生产数据库运维
- 跨库分布式事务完整解决方案
- 通用 ETL 平台能力
- 数据脱敏平台完整实现
- 数据库 schema 演进管理

---

# 3. 设计原则

## 3.1 模板优先，禁止自由写入
测试数据写入必须优先通过模板、业务测试数据服务或白名单 SQL 实现。  
默认不允许 AI 或用户在运行链路中直接提交任意写 SQL。

## 3.2 快照优先，恢复明确
凡是会修改原有数据的测试，必须在执行前建立恢复基线。  
恢复逻辑不能依赖“猜测”，必须有明确快照或明确清理策略。

## 3.3 比较必须成为正式能力
不仅要能断言结果，还要能比较：
- 测试前 vs 测试后
- 测试前 vs 恢复后
- 测试后 vs 预期结果

## 3.4 安全隔离
默认只允许：
- 测试环境
- 白名单数据源
- 白名单模板
- 白名单操作类型

## 3.5 审计全量记录
所有数据写操作、恢复操作、比较操作都必须审计。

---

# 4. 总体架构

```text
Test Orchestrator
 ├─ PreTestDataPreparationEngine
 ├─ DataSnapshotManager
 ├─ PrePostDataComparator
 ├─ PostTestRestoreEngine
 ├─ DataAuditLogger
 └─ Assertion Engine

Agent Coordinator
 ├─ DbDataPreparationPlanner
 └─ DataComparisonPlanner

Data Management Layer
 ├─ DataTemplateRegistry
 ├─ QueryExecutor
 ├─ SnapshotRepository
 ├─ RestoreStrategyRegistry
 └─ ComparisonRuleRegistry

Datasource Layer
 ├─ DatasourceRegistry
 └─ JDBC / Query Service

Business DB
```

---

# 5. 核心模块拆分

## 5.1 DataTemplateRegistry
职责：
- 注册和管理测试数据模板
- 管理模板元信息、参数定义、允许环境
- 暴露模板查询与执行入口

## 5.2 PreTestDataPreparationEngine
职责：
- 根据数据计划执行前置数据准备
- 执行模板、查询或受控服务调用
- 记录执行结果

## 5.3 DataSnapshotManager
职责：
- 执行快照采集
- 保存快照结果
- 建立快照与 runId/caseId 的关联

## 5.4 PostTestRestoreEngine
职责：
- 根据恢复计划执行恢复
- 验证恢复结果
- 将恢复状态写入报告与审计

## 5.5 PrePostDataComparator
职责：
- 比较不同快照或查询结果
- 输出结构化 diff
- 与断言引擎和报告引擎集成

## 5.6 DataAuditLogger
职责：
- 记录每次数据准备、快照、恢复、比较
- 记录操作者、用例、环境、数据源、模板名、结果

---

# 6. 数据模板体系设计

## 6.1 为什么必须用模板
如果没有模板，后果是：
- AI 容易生成危险 SQL
- 用户容易写出不可恢复的数据修改
- 缺少审计与约束
- 多次测试会污染环境

模板的作用是把“造数意图”映射为“受控实现”。

## 6.2 模板类型

### A. SQL Template
通过参数化 SQL 完成数据准备。

适合：
- update 固定字段
- insert 测试行
- delete 测试标签数据

### B. Service Template
通过业务测试数据服务进行造数。

适合：
- 复杂跨表造数
- 触发业务逻辑
- 保证业务约束完整

### C. Composite Template
由多个子模板组成。

适合：
- 登录失败场景准备
- 创建订单并挂起支付
- 初始化用户 + 权限 + 关联记录

## 6.3 模板元数据结构建议

```json
{
  "templateName": "set_login_fail_count",
  "description": "设置用户登录失败次数",
  "type": "sql",
  "datasource": "main_db",
  "mode": "update",
  "sql": "update t_user set fail_count = :failCount where user_name = :username",
  "requiredParams": ["username", "failCount"],
  "optionalParams": [],
  "allowedEnvs": ["local", "sit", "uat-test"],
  "rollbackStrategy": "restore_snapshot",
  "riskLevel": "low",
  "tags": ["login", "user"]
}
```

## 6.4 模板执行返回结构
```json
{
  "templateName": "set_login_fail_count",
  "status": "SUCCESS",
  "affectedRows": 1,
  "output": {
    "username": "admin",
    "failCount": 0
  }
}
```

---

# 7. 测试前数据准备设计

## 7.1 目标
在页面测试执行前，自动把数据库调整到满足该用例的预期状态。

## 7.2 输入来源
可以来自：
- DSL 中的 `dataPlanRef`
- Agent 自动生成的数据计划
- 用户手工配置的数据准备计划

## 7.3 数据准备计划结构
```json
{
  "dataPlanId": "dataplan_login_error_001",
  "caseId": "case_login_error_001",
  "steps": [
    {
      "type": "template",
      "templateName": "ensure_user_exists",
      "params": { "username": "admin" }
    },
    {
      "type": "snapshot",
      "snapshotKey": "user_login_state_before",
      "datasource": "main_db",
      "sql": "select user_name, fail_count, status from t_user where user_name = :username",
      "params": { "username": "admin" }
    },
    {
      "type": "template",
      "templateName": "set_login_fail_count",
      "params": { "username": "admin", "failCount": 0 }
    }
  ]
}
```

## 7.4 执行顺序建议
1. 校验环境是否允许  
2. 校验数据源是否允许  
3. 执行快照步骤  
4. 执行数据准备模板  
5. 对关键准备结果做校验  
6. 写入审计  

## 7.5 准备结果校验
测试前置数不是执行成功就算结束，建议支持：
- affected rows 校验
- 查询回查校验
- 模板 output 校验

---

# 8. 基线快照设计

## 8.1 快照目标
用于：
- 后续恢复
- 差异比较
- 失败诊断
- 审计记录

## 8.2 快照采集时点
至少支持：
- `before_prepare`
- `after_prepare`
- `after_action`
- `after_restore`

## 8.3 快照结构
```json
{
  "snapshotId": "snap_001",
  "runId": "run_001",
  "caseId": "case_login_error_001",
  "snapshotKey": "user_login_state_before",
  "datasource": "main_db",
  "query": {
    "sql": "select user_name, fail_count, status from t_user where user_name = :username",
    "params": { "username": "admin" }
  },
  "rows": [
    {
      "user_name": "admin",
      "fail_count": 0,
      "status": "ACTIVE"
    }
  ],
  "createdAt": "2026-04-18T12:00:00Z"
}
```

## 8.4 快照保存策略
推荐同时支持：
- 本地文件 JSON
- SQLite 索引记录

---

# 9. 测试后恢复设计

## 9.1 恢复目标
无论测试成功或失败，都尽量让环境回到测试前基线状态。

## 9.2 恢复策略类型

### restore_snapshot
基于快照写回原值。  
适合 update 类数据。

### delete_inserted_rows
删除本次测试创建的临时数据。  
适合 insert 类场景。

### cleanup_by_tag
按照 runId / caseId 标记清理数据。  
适合专用测试表或临时对象。

### service_compensation
通过业务补偿接口恢复。  
适合复杂业务对象。

## 9.3 恢复计划结构
```json
{
  "restorePlanId": "restore_login_error_001",
  "steps": [
    {
      "type": "restoreSnapshot",
      "snapshotKey": "user_login_state_before"
    }
  ]
}
```

## 9.4 恢复后校验
恢复后必须再次查询并校验：
- 恢复是否成功
- 是否仍有非预期差异
- 是否存在需要人工清理的残留

---

# 10. 测试前后差异比较设计

## 10.1 比较目标
支持三类比较：

### A. before vs after_action
验证业务动作是否引起了正确的数据变化。

### B. after_action vs expected
验证最终数据状态是否符合测试预期。

### C. before vs after_restore
验证恢复后是否回到了基线状态。

## 10.2 比较计划结构
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
        { "field": "fail_count", "type": "increment", "value": 1 }
      ],
      "forbiddenChanges": [
        { "field": "status" },
        { "field": "user_name" }
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

## 10.3 比较模式

### strict_equal
完全一致。  
适合恢复后校验。

### row_field_diff
逐字段比较。  
适合业务变化验证。

### expected_only
只检查指定字段。  
适合宽松场景。

### custom_rule
自定义表达式。  
例如：
- `fail_count = before.fail_count + 1`
- `status unchanged`

## 10.4 差异结果结构
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

---

# 11. 与 DSL 的结合方式

## 11.1 顶层引用
DSL 顶层可扩展：
- `dataPlanRef`
- `restorePlanRef`
- `comparisonPlanRef`

## 11.2 Step 级动作
也可以增加专门的步骤：

```json
{
  "action": "prepareData",
  "planRef": "dataplan_login_error_001"
}
```

```json
{
  "action": "compareData",
  "planRef": "cmp_login_error_001"
}
```

```json
{
  "action": "restoreData",
  "planRef": "restore_login_error_001"
}
```

## 11.3 推荐方式
为了让平台主流程更稳定，建议：
- 数据准备与恢复由 Orchestrator 主流程调用
- DSL 中更多是“引用计划”，而不是把大量数据库细节铺进 steps

---

# 12. 与 Agent 的结合方式

## 12.1 Agent 能做什么
AI 可以：
- 从测试文档中识别所需数据状态
- 生成“数据准备意图”
- 生成“比较意图”
- 生成“恢复意图”

## 12.2 Agent 不能做什么
AI 不能：
- 直接自由生成写库 SQL 并执行
- 绕过模板体系
- 绕过环境安全限制
- 跳过恢复步骤

## 12.3 推荐的 Agent 输出
推荐 AI 输出的是：
- 数据模板引用建议
- 参数建议
- 快照建议
- 比较规则建议

而不是直接 SQL 执行脚本。

---

# 13. 与运行时执行器的结合方式

## 13.1 与主执行流程的关系

```text
before_prepare snapshot
  ↓
prepareData
  ↓
after_prepare snapshot
  ↓
page actions
  ↓
after_action snapshot
  ↓
compareData
  ↓
UI/API/DB assert
  ↓
restoreData
  ↓
after_restore snapshot
  ↓
compare restore
```

## 13.2 失败时的处理
- 数据准备失败：阻止页面执行
- 页面执行失败：仍然必须进入恢复流程
- 数据比较失败：可继续进入恢复，但整体 run 记失败
- 恢复失败：高优先级告警

---

# 14. 数据源治理与安全策略

## 14.1 允许的环境
只允许：
- local
- sit
- uat-test
- 专用测试环境

默认禁止：
- prod
- prod-like 未授权环境

## 14.2 操作级别控制
### 只读
- query
- snapshot
- compare

### 受控写入
- template update
- template insert
- template cleanup
- service compensation

### 默认禁止
- 任意 DDL
- 任意 DROP/TRUNCATE
- 任意跨库写入
- 无快照的高风险 update/delete

## 14.3 参数安全
- 参数必须绑定，禁止字符串拼接
- 密码/密钥类参数不写入报告明文
- 用户输入必须经过校验

---

# 15. 审计设计

## 15.1 审计范围
必须记录：
- 谁触发了测试
- 哪个 runId / caseId
- 使用了哪个环境
- 使用了哪些数据源
- 执行了哪些模板
- 建立了哪些快照
- 进行了哪些比较
- 是否恢复成功

## 15.2 审计记录结构
```json
{
  "auditId": "audit_001",
  "runId": "run_001",
  "caseId": "case_login_error_001",
  "operator": "user_a",
  "actionType": "prepare_data",
  "datasource": "main_db",
  "templateName": "set_login_fail_count",
  "status": "SUCCESS",
  "timestamp": "2026-04-18T12:01:00Z"
}
```

---

# 16. 数据结构设计

## 16.1 DataPlan
```java
public class DataPlan {
    private String dataPlanId;
    private String caseId;
    private List<DataPlanStep> steps;
}
```

## 16.2 Snapshot
```java
public class DataSnapshot {
    private String snapshotId;
    private String runId;
    private String snapshotKey;
    private String datasource;
    private String sql;
    private Map<String, Object> params;
    private List<Map<String, Object>> rows;
}
```

## 16.3 RestorePlan
```java
public class RestorePlan {
    private String restorePlanId;
    private List<RestoreStep> steps;
}
```

## 16.4 ComparisonPlan
```java
public class ComparisonPlan {
    private String comparisonPlanId;
    private List<ComparisonCheckpoint> checkpoints;
}
```

---

# 17. Java 接口设计建议

## 17.1 DataTemplateRegistry
```java
public interface DataTemplateRegistry {
    Optional<DataTemplate> find(String templateName);
    void register(DataTemplate template);
}
```

## 17.2 PreTestDataPreparationEngine
```java
public interface PreTestDataPreparationEngine {
    DataPreparationResult execute(DataPlan dataPlan, ExecutionContext context);
}
```

## 17.3 DataSnapshotManager
```java
public interface DataSnapshotManager {
    DataSnapshot capture(SnapshotRequest request, ExecutionContext context);
    Optional<DataSnapshot> find(String snapshotKey, ExecutionContext context);
}
```

## 17.4 PostTestRestoreEngine
```java
public interface PostTestRestoreEngine {
    RestoreResult restore(RestorePlan restorePlan, ExecutionContext context);
}
```

## 17.5 PrePostDataComparator
```java
public interface PrePostDataComparator {
    ComparisonResult compare(ComparisonPlan plan, ExecutionContext context);
}
```

## 17.6 DataAuditLogger
```java
public interface DataAuditLogger {
    void log(DataAuditRecord record);
}
```

---

# 18. 执行流程设计

## 18.1 标准流程
1. 校验环境、数据源、模板权限  
2. 执行 before_prepare 快照  
3. 执行数据准备  
4. 执行 after_prepare 快照  
5. 执行页面测试  
6. 执行 after_action 快照  
7. 执行数据差异比较  
8. 执行 UI/API/DB 断言  
9. 执行恢复  
10. 执行 after_restore 快照  
11. 执行恢复后比较  
12. 输出报告与审计  

---

# 19. 失败场景与恢复策略

## 19.1 数据准备失败
- 阻止执行页面测试
- 输出失败报告
- 若已有局部修改，尝试回滚/恢复

## 19.2 快照失败
- 默认阻止高风险写操作继续
- 对只读用例可配置允许继续

## 19.3 数据比较失败
- 记录为 run 失败
- 仍可继续恢复

## 19.4 恢复失败
- 标记环境污染风险
- 输出高优先级告警
- 可配置阻止后续批量执行

---

# 20. 开发实施建议

## 20.1 第一阶段
先实现：
- DataTemplateRegistry
- PreTestDataPreparationEngine
- DataSnapshotManager
- restore_snapshot 恢复策略

## 20.2 第二阶段
再实现：
- ComparisonPlan
- PrePostDataComparator
- DiffReporter
- 报告整合

## 20.3 第三阶段
最后实现：
- Agent 数据计划建议
- 复杂 Composite Template
- service compensation 恢复策略

---

# 21. 验收标准

满足以下条件，数据库测试数据系统才算达标：

1. 可通过模板完成测试前数据准备  
2. 可建立执行前基线快照  
3. 可在页面动作后执行数据差异比较  
4. 可在测试后自动恢复数据  
5. 可验证恢复后是否回到基线  
6. 可输出结构化 diff 结果  
7. 所有数据写入与恢复操作可审计  
8. 默认禁止生产环境和任意自由写 SQL  

---

**文档结束**
