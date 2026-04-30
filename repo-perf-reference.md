# Repo Performance.tsx Reference

## Structure
- Dashboard sub-tab + Conversations sub-tab (via URL routing)
- SubTab derived from location: `/performance/conversations` → conversations, else dashboard

## Dashboard
- KPI Cards: 5 cards in grid-cols-5
- Trend Charts: 3 charts in grid-cols-3 (Resolution Rate, CSAT Trend, Response Time dual-line)
- Intent Table: Performance by Intent (4 cols: Intent, Volume, Resolution Rate, CSAT)
- CSAT Warning Banner (dismissible)

## Conversations
- Filters: outcome tabs (all/resolved/escalated/pending) + search + count
- Horizontal table: Ticket ID, Customer, Intent, Sentiment, Outcome, Mode, Turns, Summary, Time
- Sortable columns
- Click row → LogDetailSheet

## LogDetailSheet
- Header: ticket ID (link to Zendesk) + subject
- Meta grid: Customer, Intent, Sentiment, Outcome, Mode, Turns, Duration, Started
- Tabs: Conversation / Reasoning
- Conversation tab: chat bubbles (customer/agent/internal)
- Escalation info block at bottom
- Reasoning tab: ReasoningTurnCard or legacy fallback

## Key types
- TimeRange: "7d" | "14d" | "30d"
- ModeFilter: "production" | "training" | "all"
- OutcomeFilter: "all" | "resolved" | "escalated" | "pending"
- SortField: "ticketId" | "intent" | "sentiment" | "outcome" | "mode" | "turns" | "time"

## User's adjustments:
1. KPI cards keep: Total ticket, Auto-Resolution Rate, Escalation Rate, Sentiment Improvement Changed Rate, Full Resolution Time
   - Show current period data, compare vs "previous period" (not "previous day")
2. Trend Charts: Resolution Rate, CSAT Trend, Full Resolution Time (not Response Time dual-line)
3. Filters in one row, unified
4. No icons in KPI cards

## Helpers from repo:
- sentimentColor(s): neutral→gray, satisfied→green, frustrated→red, angry→red
- outcomeStyle(o): resolved→green, escalated→red, pending→amber
- formatDuration(seconds): converts to Xh Ym or Xm Ys
- relativeTime(date): "2h ago" etc
- MiniBar, MiniHBar components for intent table
