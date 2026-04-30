# Seel AI Support — Onboarding PRD

**Version**: 2.1  
**Last Updated**: 2026-04-01  
**Status**: Draft for Review

---

## Overview

Seel AI Support 的 Onboarding 通过产品内的 **Setup Progress 面板** 引导商家完成 AI Rep 的首次配置。不采用独立 Wizard 页面，所有配置在已有模块（Settings、Playbook）中完成。

**核心原则**：
- 所有配置在产品原生模块完成，降低感知操作成本
- Setup Progress 是唯一的 Onboarding 入口和状态追踪面板
- 步骤 1、2、3 无强制顺序，步骤 4 需前三步全部完成

---

## 需求详情

### Setup Progress 面板

1. **展示位置**：Agents Tab → Team Lead 视图主内容区。Setup 未全部完成时，该面板是唯一内容，不展示 Daily Digest 等功能模块。
2. **步骤定义**：

   | 步骤 | 名称 | 完成条件 | 跳转目标 | 前置依赖 |
   |------|------|----------|----------|----------|
   | 1 | Connect Ticketing System | Zendesk 三个子步骤全部完成 | Settings → Ticketing System tab | 无 |
   | 2 | Import Policies | 至少一个文档上传并成功提取规则 | Playbook → Documents tab | 无 |
   | 3 | Configure Agent | 点击 Hire Rep | Settings → Agent Config tab | 无 |
   | 4 | Send Rep to Work | Agent 状态切换为 Training 或 Production | Rep 视图 Header Go Live 下拉 | 步骤 1、2、3 |

3. **步骤状态**：Pending（可点击跳转）、Complete（绿色勾）、Locked（灰色不可点击，仅 Step 4）。
4. **完成后行为**：4 步全部 Complete → Setup Progress 消失，Team Lead 切换为正常功能视图。

---

### Connect Ticketing System

1. **入口**：Setup Progress 点击 → 打开 Settings Overlay → Ticketing System tab。Settings 采用两 tab 布局：Ticketing System | Agent Config。
2. **模块命名**：标题为 "Ticketing System"，上方提示 "Currently supports Zendesk integration"，统一 "View Setup Guide" 链接在模块顶部。
3. **配置内容**：上下结构展示 3 个子步骤：
   - Authorize API：输入 Zendesk subdomain → 点击 Connect → OAuth 授权成功
   - Bind Agent Seat：从下拉列表选择 Seat → 点击 Bind
   - Verify Connection：用户在 Zendesk 侧 assign test ticket 给 AI Agent → 点击 Verify → 系统确认收到
4. **渐进式展示**：子步骤 2 在 1 未完成时不展示，子步骤 3 在 2 未完成时不展示。已完成的子步骤折叠为一行摘要，可展开修改。

---

### Import Policies

1. **入口**：Setup Progress 点击 → 切换到 Playbook Tab → Documents 子 tab。
2. **空状态引导**：无文档时展示上传引导区（拖拽上传 + URL 导入 + "Try with a sample document" 按钮），提示支持格式（PDF, DOCX, TXT, CSV）。
3. **首次提取成功**：
   - 自动跳转到 Rules tab 查看提取出的规则
   - 同时在 Team Lead 消息流发送通知（复用 Topic 组件，type 为 `document-parse`），包含文档名称、规则数量、摘要列表
   - 用户在 Team Lead 视图中 Accept / Reject 提取出的规则
4. **Rules Tab 约束**：不支持手动添加规则，规则只能通过文档提取或 Team Lead 审批产生。
5. **后续管理**：所有文档管理在 Playbook → Documents tab 完成，不存在独立的 Import Policies 页面或 Settings 区块。

---

### Configure Agent

1. **入口**：Setup Progress 点击 → 打开 Settings Overlay → Agent Config tab。
2. **首次 vs 后续**：首次时 Rep Name 默认 "Ava"、Personality 默认 "Friendly"，按钮为 "Hire [Name]"，完成后关闭 Settings 回到 Agents 首页。后续编辑按钮为 "Save Changes"。
3. **配置项**（平铺展示，不使用外层折叠）：
   - **Identity**：Rep Name（文本）、Personality（pill 选择器，选中后下方展示描述 + 示例消息）、Disclose AI Identity（Toggle）
   - **Action Permissions**：Read Actions 按子分类分组，默认全开；Read & Write Actions 按子分类分组，每项名称 + Toggle，描述在 hover tooltip 中
   - **Channels & Escalation**：按 Channel 分组（Email / Live Chat / SMS）。Email 包含启用 Toggle、Sending Sign-off、Escalation Handoff（Assign to Group / Assign to Person / Add Tag 并列展示）。Live Chat 和 SMS 标记 "Coming soon"
4. **多 Agent 扩展性**：顶部 Agent 列表 pill 导航 + "Add Agent" 入口（MVP 显示 "Coming soon"）。

---

### Send Rep to Work

1. **前置条件**：步骤 1、2、3 全部 Complete。未满足时显示 Locked + "Complete all previous steps first"。
2. **交互**：点击 → 切换到 Rep 视图 → 首次触发新手引导（高亮 Go Live 下拉，提示选择 Training 或 Production）→ 用户选择后 Step 4 Complete。
3. **Go Live 模式**：

   | 模式 | 行为 | 前提 |
   |------|------|------|
   | Production | 直接回复客户 | Zendesk 已连接 |
   | Training | 仅写入 Internal Notes | Zendesk 已连接 |
   | Off | Agent 不活跃 | 无 |

   - Training 和 Production 都需要 Zendesk 连接，未连接时禁用并提示

---

## 边界情况

- 用户上传文档但提取失败（status = Error）：不算完成 Step 2，需在 Documents tab 给出错误提示和重试引导。
- 新手引导触发逻辑：仅首次点击 Step 4 时触发，关闭后不再重复。未切换模式就离开时 Step 4 保持 Pending，再次进入跳转 Rep 视图但不再显示引导。
- Setup 完成后的重新配置：所有配置项在 Settings 中可编辑，Setup Progress 不再重新展示。
- 多 Agent 场景下的 Setup Progress：第二个 Agent 不需要重复 Step 1（Ticketing 全局）和 Step 2（Policies 共享），只需 Configure Agent + Send Rep to Work。**标记为 Future**。
- 提取规则的生效方式：提取的规则以 Topic 形式出现在 Team Lead 消息流中，用户 Accept 后才添加到 Playbook Rules，保持 Team Lead 审核权。

---

## MVP vs Future

| 功能 | MVP | Future |
|------|-----|--------|
| Setup Progress 4 步骤 | Yes | — |
| Ticketing System (Zendesk) | Yes | 支持更多 Ticketing 系统 |
| Documents 空状态 + Try Sample | Yes | — |
| 首次提取 → Rules tab + Team Lead 通知 | Yes | — |
| Configure Agent (单 Agent) | Yes | — |
| Hire Rep 首次流程 | Yes | — |
| Send Rep to Work + 新手引导 | Yes | — |
| 多 Agent 管理 | 入口占位 | 完整实现 |
| Step 4 新手引导 | 简化版 tooltip | 完整 guided tour |
| Playbook URL 导入 | 入口占位 | 爬虫实现 |

---

## 附录：已移除的元素

- Setup / Normal 模式切换 Toggle
- 独立的 Setup Wizard 页面
- Import Policies 在 Settings 中的区块
- Go Live Mode 在 Settings 表单中的配置项
- Skip for now 按钮
