# Repo Performance.tsx Key Structure

## Imports
- recharts: AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
- Data: PERFORMANCE_SUMMARY, DAILY_METRICS, INTENT_METRICS, CONVERSATION_LOGS, ConversationLog, ReasoningTurn from mock-data
- UI: Select, Card, Badge, Button, ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle
- lucide: many icons (TrendingUp, TrendingDown, etc.)
- wouter: useLocation for route-based subtab

## Types
- TimeRange: "7d" | "14d" | "30d"
- ModeFilter: "all" | "production" | "training"
- OutcomeFilter: "all" | "resolved" | "escalated" | "pending"
- SubTab: "dashboard" | "conversations"
- SortField/SortDir for table sorting

## Layout
- Header: title + subtitle + Mode dropdown + Time range dropdown (all in one row)
- Dashboard subtab:
  - 5 KPI cards in grid-cols-5
  - 3 trend charts in grid-cols-3 (Resolution Rate, CSAT Trend, Response Time dual-line)
  - Intent table (4 cols: Intent, Volume, Resolution Rate, CSAT) with MiniBar/MiniHBar
- Conversations subtab:
  - Filter bar: outcome tabs + search + count
  - Horizontal table with sortable columns (Ticket ID, Customer, Intent, Sentiment, Outcome, Mode, Turns, Summary, Time)
  - Click row → LogDetailSheet

## LogDetailSheet
- Header: ticket ID (link to Zendesk) + subject
- Meta grid 2-col: Customer, Intent, Sentiment, Outcome, Mode, Turns, Duration, Started
- Tabs: Conversation | Reasoning
- Conversation tab: chat bubbles + escalation info + flag info
- Reasoning tab: ReasoningTurnCard components (turn-based with expand/collapse)

## KPI Cards (from PERFORMANCE_SUMMARY)
- Each has: label, value, unit, trend, trendLabel
- Icons mapped by label
- Trend shows +/- with color (emerald/red)

## User's Adjustments:
1. KPI cards: Total Ticket, Auto-Resolution Rate, Escalation Rate, Sentiment Improvement Changed Rate, Full Resolution Time
   - Show current period data, compare vs "previous period" (not "previous day")
2. Trend Charts: Resolution Rate, CSAT Trend, Full Resolution Time (NOT Response Time dual-line)
3. Filters in one row, unified
4. No icons on KPI cards
