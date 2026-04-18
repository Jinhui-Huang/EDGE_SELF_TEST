# 00_project_index.md
**项目名称**：企业级网页自动化测试平台  
**项目定位**：基于 Edge + CDP + Java 核心平台 + TypeScript 插件/UI + Agent/离线 LLM 的企业级、本地可部署网页自动化测试平台  
**用途**：作为所有开发 AI 和人工开发者进入项目时的统一入口文档

---

# 1. 项目总目标

本项目目标不是做一个简单录制回放插件，而是做一套**企业级网页自动化测试平台**，支持：

- 按测试流程自动执行
- 正常路径测试
- 异常路径测试
- 测试点聚焦
- message / 文案 / 表单 / 页面状态验证
- DB 值校验
- 截图、DOM、console、network 采集
- 测试流程保存、复用、版本化
- Agent / 离线 LLM 辅助生成、修复、分析
- 企业内网、本地、离线部署

---

# 2. 当前总体技术路线

## 核心技术选型
- **核心平台**：Java 21
- **浏览器执行协议**：CDP（Chrome DevTools Protocol）
- **未来兼容方向**：WebDriver BiDi Adapter
- **浏览器扩展**：Edge Extension（Manifest V3 + TypeScript）
- **插件与本地程序通信**：Native Messaging
- **测试流程定义**：JSON DSL
- **本地存储**：SQLite + 文件系统
- **DB 校验**：JDBC 数据源
- **Agent / 离线模型**：本地模型接入层

---

# 3. 文档清单与用途

## 必读文档（按顺序阅读）

### 1. enterprise_web_test_platform_tech_design.md
**用途**：
- 项目总体架构
- 分层设计
- 核心模块边界
- 技术选型总览
- 分阶段建设路线

### 2. enterprise_web_test_platform_phase2_implementation_design.md
**用途**：
- Gradle 多模块结构
- 模块职责与依赖关系
- 领域模型
- 核心接口设计建议
- 首批开发顺序

### 3. enterprise_web_test_platform_phase3_java_core_code_skeleton.md
**用途**：
- Java 核心模块代码骨架
- 接口与默认实现类
- 执行主链路样板
- 最小可运行骨架

### 4. cdp_domain_encapsulation_detailed_design.md
**用途**：
- CDP 各域封装设计
- Page / Runtime / DOM / Input / Network / Target 域职责
- Java Domain 层接口建议
- 事件与生命周期设计

### 5. edge_extension_native_messaging_protocol_detailed_design.md
**用途**：
- Edge 扩展与 Native Messaging Host 的通信协议
- request / response / event 模型
- 安全、origin、allowed_origins
- 消息类型和时序图

### 6. edge_extension_typescript_protocol_and_code_skeleton.md
**用途**：
- Edge 插件端 TypeScript 协议与代码骨架
- Background / Content / Popup 结构
- NativeBridge TS 样板
- 扩展内消息总线设计

### 7. 01_dev_progress.md
**用途**：
- 当前最新开发进度
- 已完成 / 未完成模块
- 最近改动
- 当前阻塞点
- 下一步计划

---

# 4. 推荐阅读顺序

开发 AI 每次进入任务时，必须按下面顺序读：

1. `00_project_index.md`
2. `01_dev_progress.md`
3. `enterprise_web_test_platform_tech_design.md`
4. `enterprise_web_test_platform_implementation_design.md`
5. 与本次任务直接相关的专项文档：
   - Java 核心开发 → `enterprise_web_test_platform_java_core_code_skeleton.md`
   - CDP 相关 → `cdp_domain_encapsulation_detailed_design.md`
   - Edge 插件通信 → `edge_extension_native_messaging_protocol_detailed_design.md`
   - Edge TS 实现 → `edge_extension_typescript_protocol_and_code_skeleton.md`

---

# 5. 当前模块地图

## Java 核心平台
- DSL Engine
- Execution Context
- Browser Session Manager
- Page Controller
- Element Resolver
- Action Executor
- Wait Engine
- Assertion Engine
- Artifact Collector
- Report Engine
- Datasource / DB Assertion
- Agent Adapter
- Native Host Bridge
- Local Admin API

## Edge 插件端
- Background / Service Worker
- Native Bridge
- Request Router
- Content Script
- Page Summary Collector
- Visible Text Collector
- Locator Candidates Generator
- Highlighter
- Popup / Side Panel UI

## 协议与基础设施
- CDP Client
- Domain 层（Page / Runtime / DOM / Input / Network / Target）
- Native Messaging Protocol
- JSON DSL Schema
- Run Status Event Protocol

---

# 6. 当前开发阶段判定

> 由开发 AI 每次读取 `01_dev_progress.md` 后更新此判断。

## 当前阶段
- [ ] Phase 0：架构底座
- [ ] Phase 1：基础执行器
- [x] Phase 2：稳定性增强
- [ ] Phase 3：平台化能力
- [ ] Phase 4：深度验证
- [ ] Phase 5：Agent 化

## 当前阶段说明
当前以 `01_dev_progress.md` 最新记录为准：Phase 0/1 的 Java 核心最小闭环、DSL smoke、浏览器/CDP、等待、断言、产物和 HTML 报告已基本打通；当前主线是 Phase 2 稳定性增强，重点在观测、报告中心、产物生命周期和清理维护能力。尚未完整进入 Phase 3，因为项目/用例/套件/环境/数据集/失败重跑等平台化管理能力未落地。

## Phase 3 进入门禁
正式进入 Phase 3 平台化能力开发之前必须停下，不得直接开始 Phase 3；需要等待用户补充相关文档并明确确认后，才能更新阶段状态并继续。

---

# 7. 开发 AI 工作规则

每次开发前，必须先完成下面流程。

## 第一阶段：文档理解
必须输出：
- 项目整体目标总结
- 当前开发阶段
- 已完成与未完成模块
- 本次任务涉及模块
- 本次任务依据了哪些文档
- 本次准备修改哪些文件

## 第二阶段：开发实现
要求：
- 严格遵循既有架构
- 不擅自改模块边界
- 协议改动必须显式说明
- 优先最小改动
- 优先可运行和可验证

## 第三阶段：开发收尾
必须输出：
- 本次完成内容
- 修改文件清单
- 当前状态
- 已知问题
- 下一步建议

## 第四阶段：更新进度文档
必须更新 `01_dev_progress.md`

---

# 8. 当前已知约束

## 架构约束
- Edge 插件不是主执行器
- Java 核心平台才是主执行器
- CDP 是主浏览器执行协议
- Native Messaging 只做受控桥接
- Agent 只做生成、修复、分析，不直接替代执行器

## 研发约束
- 不允许绕过文档直接野生设计
- 不允许把复杂业务塞进扩展端
- 不允许在低层模块写高层业务逻辑
- 不允许在运行链路中大量硬编码 sleep
- 不允许忽略 progress 文档更新

---

# 9. 当前最重要的研发方向

> 由 `01_dev_progress.md` 驱动，下面是长期固定主线。

优先主线一般为：

1. Java 核心执行器打通
2. CDP Page / Runtime / DOM / Input / Network 基础域封装
3. DSL 执行链打通
4. Wait / Assertion / Artifact 稳定化
5. Native Messaging Host 对接
6. Edge 插件端 TypeScript 骨架落地
7. 平台化 UI 与报告体系
8. DB 断言与 Agent 增强

---

# 10. AI 开发时必须输出的标准格式

建议每次任务开始时都按如下格式输出：

```markdown
## 文档理解结果
### 1. 项目目标
...
### 2. 当前进度
...
### 3. 本次任务涉及模块
...
### 4. 依赖文档
...
### 5. 计划修改文件
...
### 6. 风险点
...
```

任务结束时必须按如下格式输出：

```markdown
## 本次开发结果
### 1. 完成内容
...
### 2. 修改文件
...
### 3. 当前状态
...
### 4. 已知问题
...
### 5. 下一步建议
...
```

---

# 11. 维护说明

本文件应只做以下更新：
- 文档清单新增/删除
- 阶段定义调整
- 总体技术路线变更
- 主线研发方向变更
- AI 开发规则变更

日常开发细节请更新到 `01_dev_progress.md`

---

**文件结束**
