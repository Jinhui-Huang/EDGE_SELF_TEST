# 前端 React 页面骨架生成提示词文档
**版本**: v1.0  
**定位**: 面向前端开发 AI（Claude / ChatGPT / 本地离线模型）的提示词文档，用于基于现有项目文档与低保真线框图，生成 **后台主平台** 与 **Edge 插件辅助入口** 的 React 页面骨架。  
**适用范围**:  
- 后台主平台 React 页面骨架
- Edge 插件 Popup / Side Panel / 页面辅助前端骨架
- Phase 3 ~ Phase 5 的前端页面开发

---

# 目录

1. 文档目标  
2. 使用方式  
3. 提示词使用原则  
4. 通用总提示词  
5. 后台主平台页面骨架提示词  
6. Edge 插件页面骨架提示词  
7. 按页面生成的专项提示词模板  
8. 组件级生成提示词模板  
9. 页面联调与状态管理提示词模板  
10. 输出要求标准  
11. 常见补充要求  
12. 推荐使用顺序  

---

# 1. 文档目标

本文件用于解决：

- 如何让 AI 按既有文档理解项目前端结构
- 如何让 AI 按页面原型/线框图生成 React 页面骨架
- 如何约束 AI 不偏离已有后台与插件分工
- 如何让 AI 输出更适合直接落地的前端代码结构

本文件不直接给你代码，而是给你：

> **高质量前端页面骨架生成提示词模板**

你可以直接复制这些提示词去喂：
- Claude
- ChatGPT
- 本地离线模型

---

# 2. 使用方式

## 2.1 推荐输入给 AI 的文档
每次生成前端页面骨架前，建议至少给 AI 这些文档：

1. `00_project_index.md`
2. `01_dev_progress.md`
3. `platform_ui_prototype_and_interaction_design_phase3_5.md`
4. `platform_and_edge_low_fidelity_wireframes.md`

如果页面与业务强相关，还可额外给：
- `phase5_ai_document_driven_web_test_with_db_prep_restore.md`
- `db_test_data_template_snapshot_restore_diff_design.md`
- `ai_runtime_browser_test_interaction_detailed_design.md`

## 2.2 推荐工作流
### 第一步
先让 AI 读文档并总结页面结构。

### 第二步
再让 AI 生成页面骨架，不要一步到位让它写所有页面。

### 第三步
最后让 AI 继续细化：
- 路由
- 状态管理
- 组件拆分
- API 对接占位

---

# 3. 提示词使用原则

## 3.1 先骨架，后细节
先让 AI 生成：
- 页面结构
- 区域布局
- 组件占位
- 假数据展示

不要第一步就要求：
- 真接口联调
- 完整业务逻辑
- 最终视觉效果

## 3.2 严格限制范围
每次只让 AI 生成：
- 一个页面
- 或一组紧密相关页面
- 或一套布局骨架

不要让它一次把整个后台全写完。

## 3.3 明确前端职责
AI 生成页面时要清楚：
- 后台主平台是主入口
- Edge 插件是辅助入口
- 不要把复杂配置塞进插件 popup
- 不要让插件承担后台职责

## 3.4 强制按既有文档实现
提示词里必须要求它：
- 先读文档
- 先总结理解
- 再生成代码骨架
- 不允许自行发明页面结构

---

# 4. 通用总提示词

下面这段是所有前端页面生成前都可以先发给 AI 的总提示词。

```text
你现在是这个项目的前端开发 AI。

请先完整阅读以下文档，并基于这些文档来生成 React 页面骨架，不允许偏离既有架构和页面规划：

1. 00_project_index.md
2. 01_dev_progress.md
3. platform_ui_prototype_and_interaction_design_phase3_5.md
4. platform_and_edge_low_fidelity_wireframes.md

如果本次页面涉及 AI 生成测试、运行时详情、DB 差异、恢复结果等能力，还要阅读：
5. phase5_ai_document_driven_web_test_with_db_prep_restore.md
6. ai_runtime_browser_test_interaction_detailed_design.md
7. db_test_data_template_snapshot_restore_diff_design.md

请先输出：
A. 你理解到的页面定位
B. 当前页面在整个系统中的作用
C. 页面应包含的主要区域
D. 你计划拆分的组件
E. 你准备生成哪些文件

然后再开始生成 React 页面骨架。

要求：
1. 只生成页面骨架和组件结构，不要擅自补充后端逻辑
2. 保持后台主平台与 Edge 插件职责分离
3. 页面风格先以企业后台为主，清晰、规整、可扩展
4. 优先使用 React + TypeScript
5. 可以使用组件库占位，但不要依赖过深的业务 API
6. 所有接口先用 mock / placeholder 占位
7. 输出时先给文件结构，再给代码
```

---

# 5. 后台主平台页面骨架提示词

适用于：
- Dashboard
- 项目页
- 文档上传页
- AI 生成测试页
- 执行页
- 报告页
- 配置页

## 5.1 后台页面通用提示词

```text
请基于现有项目文档，为后台主平台生成 React 页面骨架。

页面名称：
【在这里填写页面名】

请严格遵循以下要求：

1. 页面必须符合 `platform_ui_prototype_and_interaction_design_phase3_5.md`
2. 页面布局必须参考 `platform_and_edge_low_fidelity_wireframes.md`
3. 使用 React + TypeScript
4. 先生成低保真功能骨架，不追求最终视觉稿
5. 页面需要拆成合理子组件
6. 页面中的表格、筛选区、详情区、Tab、状态区都要有占位结构
7. 所有数据用 mock 数据
8. 所有按钮事件先留占位 handler
9. 页面必须适合后续接入真实 API
10. 输出：
   - 文件结构
   - 页面主组件
   - 子组件
   - mock 数据
   - 后续联调建议

请先输出你对页面结构的理解，再给代码。
```

---

## 5.2 后台首页 Dashboard 骨架提示词

```text
请为这个项目生成后台主平台的 Dashboard React 页面骨架。

页面要求：
- 顶部为页面标题和全局摘要
- 中间第一行展示统计卡片：
  - 项目总数
  - 最近运行数
  - 最近失败数
  - 恢复失败数
- 第二行展示最近运行任务列表
- 第三行展示失败告警 / 恢复失败 / 数据污染风险提醒
- 页面风格为企业后台风格
- 使用 React + TypeScript
- 使用 mock 数据
- 组件拆分建议：
  - DashboardPage
  - StatsCards
  - RecentRunsTable
  - AlertPanel

输出：
1. 文件结构
2. 页面骨架代码
3. 子组件代码
4. mock 数据
5. 说明每个组件作用
```

---

## 5.3 测试文档上传页提示词

```text
请为这个项目生成“测试文档上传页”的 React 页面骨架。

页面要求：
- 顶部显示页面标题和说明
- 中部有拖拽上传区域
- 下方有文档列表表格
- 页面中要有模型选择区域：
  - 自动
  - 本地模型
  - ChatGPT
  - Claude
- 支持“高级配置”折叠面板占位
- 底部有“开始解析”“批量解析”按钮
- 用 mock 数据展示文档列表
- 所有事件先用占位函数实现

组件建议：
- TestDocumentUploadPage
- UploadDropZone
- DocumentListTable
- ModelSelector
- AdvancedModelSettingsPanel

请输出：
- 文件结构
- 页面代码
- mock 数据
- 每个组件的职责
```

---

## 5.4 AI 生成测试页提示词

```text
请为这个项目生成“AI 生成测试页”的 React 页面骨架。

页面布局要求：
- 左侧：测试意图摘要、页面流程树
- 中间：状态机/流程图展示占位区域
- 右侧：DSL 预览、数据计划预览、模型信息
- 底部：推断项 / 风险点 / 缺失项
- 顶部操作按钮：
  - 重新生成
  - 切换模型
  - 保存为用例
  - 直接执行

要求：
- 使用 React + TypeScript
- 先做低保真骨架
- 状态机区域先用占位组件
- DSL 区域可用代码块/编辑器占位
- 数据使用 mock

组件建议：
- AiGeneratedTestPage
- TestIntentSummaryPanel
- PageFlowTreePanel
- StateMachineCanvasPlaceholder
- DslPreviewPanel
- DataPlanPreviewPanel
- RiskAndInferencePanel
```

---

## 5.5 执行监控页提示词

```text
请为这个项目生成“执行监控页”的 React 页面骨架。

页面要求：
- 三栏布局
- 左侧：步骤进度区
- 中间：当前页面执行区（截图、URL、当前状态）
- 右侧：AI 决策 / 日志 / 运行时摘要
- 底部显示数据准备 / 数据比较 / 数据恢复状态条
- 顶部显示 runId、状态、当前模型

使用 mock 数据实现：
- 当前运行信息
- 当前 step
- 当前状态
- AI 决策记录
- 数据操作状态

组件建议：
- ExecutionMonitorPage
- StepProgressPanel
- CurrentExecutionPanel
- RuntimeAiDecisionPanel
- DataOperationStatusBar
```

---

## 5.6 报告详情页提示词

```text
请为这个项目生成“报告详情页”的 React 页面骨架。

页面要求：
- 顶部显示 run 基本信息
- 下方用 Tab 展示：
  - 概览
  - 页面执行
  - 断言
  - 数据比较
  - 数据恢复
  - AI 分析
- 每个 Tab 用独立子组件占位
- 使用 mock 数据
- 适合后续接入真实报告接口

组件建议：
- ReportDetailPage
- ReportOverviewTab
- PageExecutionTab
- AssertionTab
- DataComparisonTab
- DataRestoreTab
- AiAnalysisTab
```

---

# 6. Edge 插件页面骨架提示词

适用于：
- Popup 首页
- 当前页摘要面板
- 元素拾取面板
- 候选定位器面板
- 当前运行状态面板
- 快速启动测试面板

## 6.1 插件通用提示词

```text
请为这个项目生成 Edge 插件端的 React/TypeScript 页面骨架。

要求：
1. 插件定位是辅助入口，不是主后台
2. 页面必须保持轻量
3. 不要承载复杂配置中心
4. 使用 React + TypeScript
5. 所有 Native Messaging / Background 调用先留占位 API
6. 数据先用 mock
7. 页面应适合 popup 尺寸，必要时可拆成 panel 组件

请先说明：
- 当前插件页面的用途
- 主要功能区
- 不应该出现的复杂能力

然后再输出代码骨架。
```

---

## 6.2 插件首页提示词

```text
请为这个项目生成 Edge 插件 Popup 首页的 React 页面骨架。

页面要求：
- 顶部显示 Host 连接状态
- 显示当前页面标题和 URL 摘要
- 中间提供快捷入口按钮：
  - 当前页摘要
  - 元素拾取
  - 快速启动测试
  - 查看运行状态
- 底部提供模型快捷切换：
  - 自动
  - 本地模型
  - ChatGPT
  - Claude
- 页面保持轻量、适合 popup 尺寸
- 用 mock 数据

组件建议：
- PopupHomePage
- HostStatusBar
- CurrentPageSummaryCard
- QuickActionGrid
- ModelQuickSelector
```

---

## 6.3 当前页摘要面板提示词

```text
请为这个项目生成“当前页摘要面板”的 React 页面骨架。

页面要求：
- 显示页面标题
- 显示 URL
- 显示可见文本摘要
- 显示表单字段摘要
- 显示按钮摘要
- 适合放在插件 popup 或 side panel 中
- 使用 mock 数据

组件建议：
- CurrentPageSummaryPanel
- VisibleTextSummaryBox
- FormFieldsSummaryList
- ButtonsSummaryList
```

---

## 6.4 元素拾取面板提示词

```text
请为这个项目生成“元素拾取面板”的 React 页面骨架。

页面要求：
- 顶部有开启拾取 / 停止拾取按钮
- 中间显示当前选中元素信息：
  - tag
  - text
  - id
  - name
- 底部有：
  - 高亮
  - 取消高亮
  - 发送到后台
- 用 mock 数据和占位事件
- 保持插件内轻量布局

组件建议：
- ElementPickerPanel
- PickControlBar
- SelectedElementInfoCard
- ElementActionButtons
```

---

## 6.5 候选定位器面板提示词

```text
请为这个项目生成“候选定位器面板”的 React 页面骨架。

页面要求：
- 列出多个候选定位器
- 每项展示：
  - 类型
  - value
  - score
- 提供：
  - 复制
  - 发送到后台用例
- 使用 mock 数据

组件建议：
- LocatorCandidatesPanel
- LocatorCandidateList
- LocatorCandidateItem
```

---

# 7. 按页面生成的专项提示词模板

你后续可以用这个模板对任何页面单独生成。

```text
请基于现有项目文档，为页面【页面名】生成 React + TypeScript 页面骨架。

请阅读并遵循：
- 00_project_index.md
- 01_dev_progress.md
- platform_ui_prototype_and_interaction_design_phase3_5.md
- platform_and_edge_low_fidelity_wireframes.md

页面要求：
【在这里补充页面要求】

输出要求：
1. 先输出页面结构理解
2. 给出推荐文件结构
3. 给出页面主组件
4. 给出子组件
5. 给出 mock 数据
6. 给出后续接 API 的建议

限制：
- 不要超出当前页面职责
- 不要擅自加未在文档中定义的复杂模块
- 先做低保真骨架
- 所有事件先用占位 handler
```

---

# 8. 组件级生成提示词模板

当你不是生成整页，而是只想生成组件时，可以用这个。

```text
请为这个项目生成 React + TypeScript 组件【组件名】。

组件用途：
【描述用途】

要求：
- 组件必须适配当前页面骨架
- 输入 props 设计要清晰
- 不依赖真实 API
- 使用 mock 数据示例
- 适合后续复用

请输出：
1. 组件职责说明
2. props 类型定义
3. 组件代码
4. 使用示例
```

---

# 9. 页面联调与状态管理提示词模板

等你把页面骨架搭出来后，可以继续让 AI 帮你接状态管理和假接口。

```text
请基于现有 React 页面骨架，为以下页面增加前端状态管理与 mock API 对接：

页面：
【填写页面名】

要求：
1. 不接真实后端，只接 mock API
2. 使用统一的状态管理方式（例如 React Query / Zustand / Context 等）
3. 保持当前页面结构不变
4. 增加 loading / empty / error 状态
5. 所有数据结构要和文档定义一致

请输出：
- 推荐状态管理方案
- 目录结构
- 状态管理代码
- mock API 代码
- 页面接入方式
```

---

# 10. 输出要求标准

每次让 AI 生成前端页面骨架时，建议要求它输出以下内容：

## 10.1 必须输出
- 页面结构理解
- 文件结构
- 页面主组件
- 子组件
- mock 数据
- 组件职责说明

## 10.2 推荐输出
- props 类型定义
- 后续 API 对接建议
- 后续状态管理建议
- 后续可拆分组件建议

## 10.3 不建议一开始输出
- 最终视觉细节
- 太重的动效代码
- 真正的复杂后端逻辑
- 大量无关工具函数

---

# 11. 常见补充要求

你可以在每次提示词后加这些约束，提升代码质量。

## 11.1 要求组件化
```text
请不要把整个页面写成一个超大组件，尽量合理拆分子组件。
```

## 11.2 要求企业后台风格
```text
页面要以企业后台管理系统风格为主，强调清晰、规整、信息密度适中。
```

## 11.3 要求类型清晰
```text
请为 props、页面数据、列表项定义清晰的 TypeScript 类型。
```

## 11.4 要求未来可联调
```text
请保留后续接真实 API 的接口位置，不要把 mock 逻辑写死在组件内部。
```

## 11.5 要求不偏离文档
```text
如果文档里没有定义某个页面能力，不要自行扩展复杂功能。
```

---

# 12. 推荐使用顺序

建议你按下面顺序让 AI 生成前端页面骨架。

## 第一批
- Dashboard
- 项目列表页
- 项目详情页
- 测试文档上传页
- 测试文档解析结果页
- AI 生成测试页

## 第二批
- 用例列表页
- 用例详情页
- DSL 编辑页
- 状态机查看页
- 执行启动页
- 执行监控页

## 第三批
- 报告列表页
- 报告详情页
- 数据差异页
- 数据恢复结果页
- 模型配置页
- 数据源配置页
- 数据模板配置页
- 审计页

## 插件侧
- Popup 首页
- 当前页摘要面板
- 元素拾取面板
- 候选定位器面板
- 当前运行状态面板
- 快速启动测试面板

---

**文档结束**
