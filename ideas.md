# Seel AI Support Agent - 设计方案头脑风暴

## 项目背景
这是一个 AI 客服工作系统的 MVP 原型，需要保持与现有代码的视觉风格一致。核心页面包括 Agents（含 Onboarding 对话流程）、Playbook（规则和知识库管理）、Performance（KPI 仪表盘）。

---

<response>
<text>
## 方案 A: Shopify Admin 风格 — 企业级 SaaS 管理面板

**Design Movement**: 参考 Shopify Admin / Zendesk 的企业级 SaaS 管理面板设计语言，强调功能性和信息密度。

**Core Principles**:
1. 信息层级清晰：通过卡片、分割线和留白建立视觉层次
2. 操作效率优先：减少点击次数，关键操作一目了然
3. 中性色调为主，紫色作为品牌强调色

**Color Philosophy**: 以白色和浅灰为底色（#f3f4f6），紫色（#634dd9）作为品牌主色调用于激活态和 CTA，黄色（#d97706）用于 TEST MODE 警示，绿色（#059669）用于成功状态。整体传达专业、可信赖的感觉。

**Layout Paradigm**: 经典的侧边栏 + 顶部 Tab + 内容区三栏布局。侧边栏固定 240px，内容区自适应。

**Signature Elements**:
1. 黄色 TEST MODE 横幅条，提醒用户当前处于测试环境
2. 圆形头像 + 对话气泡的 Agent 交互界面

**Interaction Philosophy**: 点击即响应，状态变化通过颜色和图标即时反馈。按钮使用圆角胶囊形状。

**Animation**: 页面切换使用淡入效果，消息出现使用从下往上的滑入动画。

**Typography System**: DM Sans 作为主字体，14px 基础字号，标题使用 600 字重。
</text>
<probability>0.06</probability>
</response>

<response>
<text>
## 方案 B: 极简北欧风 — 呼吸感设计

**Design Movement**: 斯堪的纳维亚极简主义，强调大量留白和极度克制的色彩使用。

**Core Principles**:
1. 少即是多：每个元素都有存在的理由
2. 自然色调：使用接近自然的暖灰和米色
3. 功能即美学：不添加纯装饰性元素

**Color Philosophy**: 几乎全白的背景（#fafaf9），深炭灰文字（#1c1917），唯一的强调色是柔和的靛蓝（#6366f1）。

**Layout Paradigm**: 极窄侧边栏（图标导航），最大化内容展示区域。

**Signature Elements**:
1. 超大留白和极细分割线
2. 圆角极大的卡片（20px+）

**Interaction Philosophy**: 微妙的悬停效果，几乎无感的状态过渡。

**Animation**: 极其克制，仅在必要时使用 200ms 的淡入。

**Typography System**: Inter 400/500 字重，大量使用小号字体（11-12px）。
</text>
<probability>0.03</probability>
</response>

<response>
<text>
## 方案 C: Slack/Discord 风格 — 对话驱动的工作空间

**Design Movement**: 现代通讯工具设计语言，以对话为核心的工作空间。

**Core Principles**:
1. 对话即操作：所有配置和管理通过对话完成
2. 实时感：界面传达"活跃"和"在线"的感觉
3. 密集但不拥挤：信息紧凑排列但保持可读性

**Color Philosophy**: 深色侧边栏（#1e1b2e）配浅色内容区，紫色品牌色贯穿全局，绿色在线状态点。

**Layout Paradigm**: 左侧频道/Agent 列表 + 中间对话区 + 右侧详情面板的三栏布局。

**Signature Elements**:
1. 在线状态指示灯（绿色小圆点）
2. 消息气泡中嵌入可交互的卡片和按钮

**Interaction Philosophy**: 即时反馈，打字指示器，消息发送动画。

**Animation**: 消息滑入、状态切换的弹性动画、加载骨架屏。

**Typography System**: DM Sans 搭配 JetBrains Mono（代码/ID 展示），13px 基础字号。
</text>
<probability>0.04</probability>
</response>

---

## 选定方案: 方案 A — Shopify Admin 风格

选择理由：与用户提供的截图风格最为一致，且最符合 PRD 中"CX Manager 像管理真人客服团队一样管理 AI 团队"的产品定位。企业级 SaaS 管理面板的设计语言能让目标用户（非技术背景的 CX Manager）感到熟悉和专业。
