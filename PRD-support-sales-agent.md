# PRD — Support Agent & Sales Agent 功能更新

**版本：** v1.0  
**日期：** 2026-05-14  
**状态：** 待研发评审  

---

## 一、背景

本次迭代围绕商家后台两个核心模块（Support Agent、Sales Agent）的数据可视化与交互体验进行升级，目标是让商家能够更清晰地感知 AI 的服务效果和销售价值。

---

## 二、Support Agent

### 2.1 Performance — Dashboard 更新

#### 需求描述

重新设计 Performance 仪表盘，提升数据可读性，新增 AI 自动摘要功能。

#### 2.1.1 KPI 指标栏

展示 5 个核心指标卡片，每张卡片包含：当前值 + 与上期环比趋势。

| 指标 | 定义 | 正向方向 |
|------|------|----------|
| **Total Tickets** | 选定周期内 AI 处理的总工单数 | 增加 ↑ |
| **Resolution Rate** | AI 独立闭环工单数 / 总工单数 | 增加 ↑ |
| **Escalation Rate** | 转人工工单数 / 总工单数 | 降低 ↓ |
| **Sentiment Improvement Rate** | Exit 情绪得分 > Entry 情绪得分的对话占比 | 增加 ↑ |
| **Avg. Turns** | 每条对话平均轮次（AI + 用户消息之和 / 2） | 降低 ↓ |

> 情绪得分量表：-2（Furious）/ -1（Negative）/ 0（Neutral）/ +1（Positive）/ +2（Satisfied）

#### 2.1.2 Resolution Rate 趋势图

- 图表类型：Area Chart（面积图）
- X 轴：日期
- Y 轴：Resolution Rate（%）
- 时间范围：与顶部时间筛选器联动，支持 Last 7 / 30 / 90 / 180 days

#### 2.1.3 Sentiment Distribution（情绪分布）

用两个环形图（Donut Chart）并排展示对话**入口情绪（Entry）**与**出口情绪（Exit）**的分布对比。

| 字段 | 说明 |
|------|------|
| **Entry Sentiment** | 对话开始时用户的情绪分类（售前多为 Neutral） |
| **Exit Sentiment** | 对话结束时用户的情绪分类（AI 介入后改善） |
| **圆环中心数字** | 当前周期的平均情绪得分（-2 ～ +2），正值绿色，负值橙色 |
| **图例** | 每种情绪的颜色 + 名称 + 百分比，列于环形图下方 |

情绪分类颜色定义：

| 情绪 | 颜色 |
|------|------|
| Satisfied | 绿色 `#10b981` |
| Positive | 青色 `#14b8a6` |
| Neutral | 灰色 `#94a3b8` |
| Negative | 橙色 `#f97316` |
| Furious | 红色 `#ef4444` |

#### 2.1.4 Contact Reason 表格

按意图（Intent）聚合展示各类咨询的处理质量。

| 列名 | 定义 |
|------|------|
| **Intent** | 工单意图分类，如 WISMO、Cancellation、Refund 等 |
| **Volume** | 该意图的工单总量，附 mini bar 可视化占比 |
| **Resolution Rate** | 该意图的 AI 独立闭环率，附颜色编码（绿/黄/红） |
| **Sentiment Change** | 该意图对话的平均情绪变化值（Exit - Entry），正值绿色，负值红色 |

#### 2.1.5 AI Summary（AI 自动摘要）

- 入口：Dashboard 顶部"Generate AI Summary"按钮
- 触发后展示加载状态（约 2 秒），再呈现摘要卡片
- 摘要结构分三栏：

| 区块 | 内容 |
|------|------|
| ✅ **What's Working** | 表现最好的意图、Resolution Rate 趋势正向的信号 |
| ⚠️ **Needs Attention** | Resolution Rate 最低的意图、Escalation Rate 超阈值提示 |
| 💡 **Recommendations** | 针对性改进建议，引用真实指标数值 |

- 支持"Regenerate"重新生成
- 支持折叠/展开（Collapse）

---

### 2.2 Conversations — 对话记录更新

#### 需求描述

提供完整的对话记录列表，支持多维度筛选与排序，方便商家复盘 AI 处理质量。

#### 2.2.1 筛选条件

| 筛选项 | 可选值 |
|--------|--------|
| **Outcome** | All / Resolved / Escalated / Handling |
| **Intent** | All / WISMO / Cancellation / Address Change / Refund / Complaint |
| **Entry Sentiment** | All / Satisfied / Positive / Neutral / Negative / Furious |
| **Exit Sentiment** | All / Satisfied / Positive / Neutral / Negative / Furious |
| **搜索框** | 按 Ticket ID / 客户名 / 邮箱 / 对话摘要全文检索 |

#### 2.2.2 列表字段

| 列名 | 定义 |
|------|------|
| **Ticket ID** | 工单唯一标识 |
| **Customer** | 客户姓名 + 邮箱 |
| **Intent** | 意图分类 |
| **Entry Sentiment** | 入口情绪标签（带颜色） |
| **Exit Sentiment** | 出口情绪标签（带颜色） |
| **Outcome** | 处理结果：Resolved / Escalated / Handling |
| **Mode** | 运行模式：Training / Production |
| **Turns** | 对话轮次 |
| **Time** | 对话发生时间 |

- 支持按所有列排序（点击列头切换升/降序）
- 点击任意行展开对话详情侧边栏（Conversation Log Sidebar）

---

## 三、Sales Agent

### 3.1 Introduction Page（产品介绍页）更新

#### 需求描述

商家首次进入 Sales Agent 时展示产品介绍弹窗，帮助理解核心价值。

#### 页面结构

**左侧（营销内容）：**
- NEW 标签 + 副标题"Now available for your store"
- 主标题：AI Sales Agent
- 产品简介段落
- 三个核心特性列表（带 CheckCircle 图标）：
  1. **Plug-and-Play Setup** — 无需工程接入，连接 touchpoint 即可看到归因收入
  2. **Flexible Product Strategy** — 可自定义各 touchpoint 推荐策略（新品/畅销/精选）
  3. **Cross-Touchpoint Attribution** — 追踪每次互动带来的成交来源
- 底部 CTA 条："Ready to grow revenue? **Get started** and explore your analytics."

**右侧（数据预览）：**
- 标签："PRODUCT PREVIEW"
- 4 个 KPI 卡片（2×2 布局）：

| 指标 | 示例值 |
|------|--------|
| Attributed Sales | $42,259 |
| Converted Orders | 607 |
| CTR | 4.4% |
| AOV | $105.09 |

- Touchpoint Performance 列表（各渠道归因销售额）：

| Touchpoint | 示例销售额 |
|------------|------------|
| Seel Resolution Center | $11,611 |
| WFP Policy Email | $10,870 |
| Support Agent | $10,234 |
| Search Bar | $9,542 |

---

### 3.2 Analytics — 指标更新

#### 需求描述

Analytics tab 展示 Sales Agent 的核心销售归因数据，支持按时间段和 touchpoint 筛选。

#### 3.2.1 筛选器

| 筛选项 | 可选值 |
|--------|--------|
| **Time Range** | Last 7 days / Last 14 days / Last 30 days |
| **Touchpoint** | All touchpoints / 单个 touchpoint |

#### 3.2.2 KPI 卡片（4 个）

| 指标 | 定义 | 计算方式 |
|------|------|----------|
| **Attributed Sales** | AI 推荐带来的成交金额，仅统计推荐商品的价值 | Σ 各 touchpoint 的 attributedSales × 时间系数 |
| **Converted Orders** | 经 AI 推荐后完成转化的订单数 | Σ ordersInfluenced × 时间系数，取整 |
| **CTR** | 用户点击 AI 推荐的比例 | 各 touchpoint CTR 的算术平均值 |
| **AOV** | 包含 AI 推荐商品的订单平均客单价 | 各 touchpoint actualAov 的算术平均值 |

> **注：** Attributed Sales 只统计推荐商品本身的价值，不含订单整体金额，以确保归因数据的准确性。AOV 统计的是包含推荐商品的完整订单客单价。

每个 KPI 卡片展示：当前值 + 环比变化趋势（% + 箭头方向 + 颜色）。

#### 3.2.3 Sales Trend 图表

- 图表类型：Stacked Bar Chart（堆叠柱状图）
- X 轴：日期
- Y 轴：当日归因销售额（$）
- 颜色映射：

| Touchpoint | 颜色 |
|------------|------|
| Resolution Center | 紫色 `#6c47ff` |
| WFP Confirmation Email | 橙色 `#f59e0b` |
| Support Chat | 绿色 `#10b981` |
| Search Bar | 蓝色 `#3b82f6` |

- 标题与图例在同一行（左侧标题，右侧图例）

#### 3.2.4 Performance Breakdown 表格

按 touchpoint 维度汇总展示销售归因详情，**点击任意行展开订单详情面板**。

| 列名 | 定义 |
|------|------|
| **Touchpoint** | 渠道名称 |
| **Attributed Sales** | 该渠道的归因销售额，附环比变化 |
| **Converted Orders** | 该渠道完成转化的订单数 |
| **CTR** | 点击率（点击推荐 / 展示次数） |
| **Clicks** | 用户点击推荐商品的总次数 |
| **Impressions** | 推荐商品的展示总次数 |

---

### 3.3 Touchpoint 订单详情面板

#### 需求描述

点击 Performance Breakdown 表格中的任意行，右侧滑出订单详情面板（Slide-over），展示该 touchpoint 的具体转化订单。

#### 面板结构

**头部：**
- Touchpoint 名称
- 副标题：转化订单数 + 归因销售额

**数据条：**
- CTR、AOV 两个快速指标

**订单列表：**

每条订单卡片包含：

| 字段 | 说明 |
|------|------|
| **Order ID** | 订单号（紫色高亮） |
| **Status** | Fulfilled / Pending / Refunded（颜色标签） |
| **Customer** | 客户姓名 + 邮箱 |
| **Items** | 商品列表，**AI 推荐商品高亮显示**（紫色背景 + ✦ 图标 + "Recommended"标签） |
| **Date & Channel** | 下单时间 + 渠道 |
| **Total** | 订单总金额 |

> **AI 推荐商品高亮规则：** 订单中与该 touchpoint 推荐商品名称匹配的 item，使用紫色背景 `#f0edff`、紫色字体、Sparkles 图标及"Recommended"角标进行标注。

---

## 四、非功能需求

| 项目 | 要求 |
|------|------|
| **响应式** | 支持 1280px 以上宽屏，最小兼容 1024px |
| **时间筛选联动** | 所有图表、KPI、表格数据随时间筛选器实时更新 |
| **加载状态** | AI Summary 生成过程展示 loading 动画，防止用户误操作 |
| **空状态** | 无数据时展示友好提示，不显示空图表或空表格 |

---

## 五、设计规范

- 主色：`#6c47ff`（紫色，品牌色）
- 正向趋势：Emerald `#10b981`
- 负向趋势：Red `#ef4444`
- 警示色：Orange `#f97316`
- 字号体系：标题 13-15px / 正文 12px / 辅助信息 10-11px
- 卡片圆角：`rounded-xl`（12px）
- 分隔线：`border-border/40`（半透明）

---

## 六、Demo 测试用例（DJI USA）

以下问题用于演示和验证 Support Agent 的意图识别、推理能力与产品推荐效果，按意图分类覆盖主要场景。

**Demo 地址：** https://nervous-torvalds-c1d7bd.vercel.app

---

### 6.1 订单与物流（WISMO）

1. I placed an order 3 days ago but haven't received a shipping confirmation yet. Order #DJI-109823. Can you check on this?
2. My tracking shows "Out for Delivery" since yesterday but nothing arrived. What should I do?
3. I ordered a DJI Mini 4 Pro Fly More Combo but only received the drone without the accessories. Is the rest of the order coming separately?
4. I need to change my shipping address — my order hasn't shipped yet. Is that possible?

---

### 6.2 退换货与退款（Return / Refund）

5. I just received my DJI Air 3 and the gimbal cover is scratched. I want to return it. What's the process?
6. I bought my drone 12 days ago. I haven't opened it yet — can I still return it?
7. I requested a refund 5 days ago but haven't seen it on my credit card. How long does it take?
8. I received the wrong item — I ordered the DJI Osmo Mobile 6 but got the Osmo Mobile SE. How do I get the right one?

---

### 6.3 技术支持（Tech Support）

9. My DJI Mini 3 Pro won't connect to the RC-N1 controller. The app keeps saying "No Signal." I've tried restarting both.
10. My drone crashed and the gimbal is shaking during flight now. Is this something I can fix myself or does it need repair?
11. The DJI Fly app is asking me to update firmware but the update keeps failing at 60%. What should I do?
12. My battery isn't charging — the light just blinks three times and stops. The battery is only 2 months old.

---

### 6.4 保修与 DJI Care Refresh（Warranty）

13. I crashed my DJI Air 3 into a tree. Does my DJI Care Refresh cover this? How do I file a claim?
14. My drone is 10 months old and the camera suddenly stopped working. Is this covered under warranty?
15. I bought DJI Care Refresh but never activated it. Can I still activate it now? I've had the drone for 3 weeks.
16. What's the difference between the standard warranty and DJI Care Refresh? Is it worth buying?

---

### 6.5 合规与飞行限制（Compliance / No-fly Zones）

17. I'm trying to fly near a local park in NYC and DJI Fly is blocking me. How do I request an unlock?
18. I'm traveling to Japan next month. Can I bring my DJI Air 3? Are there any restrictions I should know about?

---

### 6.6 账户与激活（Account / Activation）

19. I just got a second-hand DJI Mavic 3. How do I transfer the DJI Care Refresh to my account?
20. I can't log into my DJI account — it's asking for phone verification but I changed my number. How do I recover access?

---

### 6.7 产品推荐（Product Recommendation）

> 重点测试 AI 的顾问式导购能力：是否能理解用户场景、追问需求、给出有理由的推荐，而非简单列出参数。

**入门选购**

21. I'm a complete beginner and want my first drone for under $300. What do you recommend?
22. I want to buy a drone as a gift for my 14-year-old son who's into photography. What's a good starter option?
23. I've never flown a drone before. Is the DJI Mini 4 Pro too advanced for me, or should I start with something simpler?

**场景导向**

24. I'm a real estate agent and need a drone for aerial property shots. Image quality is the priority. What would you suggest?
25. I go hiking and backpacking a lot — I need something lightweight that fits in my pack. What are my options?
26. I want to film my kids' sports games. I need something easy to fly with good subject tracking. What do you recommend?
27. I'm a surf photographer. I need a drone that can handle wind and salt air. Which model is most durable?
28. I do wedding videography professionally. What's the best DJI drone for cinematic footage under $2,000?

**配件与套装**

29. I just bought the DJI Air 3. What accessories do you recommend I get to start with?
30. Is the Fly More Combo worth the extra cost, or should I just buy extra batteries separately?
31. I want to start doing FPV flying. I have no experience — where do I even start with DJI's lineup?

**对比选择**

32. What's the actual difference between the DJI Mini 4 Pro and the Mini 3 Pro? Is it worth the price difference?
33. I'm deciding between the DJI Mavic 3 Classic and the Air 3. I shoot mostly landscape and nature. Which one wins?
34. I already own a DJI Mavic Air 2. Is it worth upgrading to the Air 3, or is the difference not significant enough?
35. I'm looking at the DJI Osmo Pocket 3 vs the Action 4. I mostly vlog indoors and outdoors. Which one fits better?

---

### 6.8 重点测试场景说明

| 编号 | 问题 | 测试重点 |
|------|------|----------|
| #3 | Fly More Combo 分包裹 | 分批发货逻辑判断 |
| #9 | 无信号连接问题 | 多步骤排障引导 |
| #13 | DJI Care Refresh 理赔 | 保险覆盖范围判断 + 引导流程 |
| #21 | 入门推荐 $300 以内 | 预算约束下的产品推荐 |
| #24 | 房地产航拍推荐 | 场景理解 + 专业导购 |
| #33 | Mavic 3 Classic vs Air 3 | 多维度产品对比 |

