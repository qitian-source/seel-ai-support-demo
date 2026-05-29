// ============================================================
// DEMO DATA — Seel AI Support Agent MVP
// ============================================================

// --- AGENT TYPES ---
export interface ActionPermission {
  id: string;
  name: string;
  label: string;
  description: string;
  system: string;
  domain: string;
  type: "read" | "write";
  enabled: boolean;
  locked: boolean;
  guardrail?: string;
}

export interface ConfigEntry {
  hash: string;
  timestamp: string;
  author: string;
  summary: string;
  diff: string;
}

export interface Agent {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  mode: "Training" | "Production" | "Off" | "Not Ready" | "N/A";
  isTeamLead: boolean;
  personality: "Friendly" | "Professional" | "Casual" | "Customize";
  customTone?: string;
  language: string;
  status: string;
  startDate: string;
  tickets: { total: number; today: number };
  resolution: number | null;
  csat: number | null;
  avgResponse: string;
  escalation: number | null;
  actionPermissions: ActionPermission[];
  configHistory: ConfigEntry[];
}

// --- TICKET / THREAD ---
export interface PlanStep {
  action: string;
  label: string;
  tool: string;
  duration: number;
  type: string;
  executionStatus: string;
}

export interface ThreadMessage {
  from: string;
  type: string;
  author: string;
  text: string;
  time: string;
  channel: string;
}

export interface Ticket {
  id: string;
  customer: string;
  email: string;
  vip: boolean;
  subject: string;
  category: string;
  status: string;
  priority: string;
  channel: string;
  agentId: string;
  time: string;
  escalationReason?: string;
  orderData: {
    id: string;
    items: string[];
    total: string;
    status: string;
    carrier?: string;
    tracking?: string;
    estimatedDelivery?: string;
  };
  plan: PlanStep[];
  thread: ThreadMessage[];
}

// --- ESCALATION FEED ---
export interface EscalationCard {
  id: string;
  ticketId: string;
  subject: string;
  summary: string;
  reason: string;
  customer: string;
  email: string;
  intent: string;
  sentiment: "frustrated" | "neutral" | "urgent";
  outcome: "Escalated" | "Resolved";
  mode: "Production" | "Training";
  priority: "High" | "Medium" | "Low";
  orderValue: string;
  turns: number;
  time: string;
  createdAt: string;
  startedAt: string;
  status: "needs_attention" | "resolved";
  thread: { role: "customer" | "rep"; content: string }[];
}

// --- RULE ---
export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  content: string;
  source: string;
  sourceDocId?: string;
  lastUpdated: string;
  stats: { used: number; avgCsat: number; deflection: number };
  versionHistory: { version: number; timestamp: string; source: string; diff: string }[];
}

// --- DOCUMENT ---
export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  status: "Processed" | "Processing" | "Error";
  inUse: boolean;
  extractedRules: string;
}

// --- PERFORMANCE ---
export interface PerformanceKPI {
  label: string;
  value: number;
  unit: string;
  trend: number;
  trendLabel: string;
}

export interface PerformanceDaily {
  date: string;
  tickets: number;
  resolved: number;
  escalated: number;
  autoResolutionRate: number;
  sentimentImprovementRate: number;
  avgTurns: number;
  entrySentimentScore: number;
  exitSentimentScore: number;
}

export interface IntentRow {
  intent: string;
  volume: number;
  resolutionRate: number;
  sentimentChange: number;
}

// --- CONVERSATION LOG ---
export interface ReasoningTurn {
  turn: number;
  customerInput: string;
  contextEnrichment: string[];
  ruleRouting: { intent: string; confidence: number; matchedRules: string[] };
  knowledgeRetrieval: { query: string; results: number; topSimilarity?: number };
  actionsExecuted: { name: string; params?: string; status: string; result: string }[];
  guardrailCheck: string;
  repOutput: string;
}

export interface ConversationLog {
  ticketId: string;
  customer: string;
  email: string;
  intent: string;
  entrySentiment: string;
  sentiment: string;
  outcome: "Resolved" | "Escalated" | "Handling";
  mode: "Production" | "Training";
  channel: "Zendesk" | "Live Chat Widget" | "Email";
  turns: number;
  duration: string;
  summary: string;
  time: string;
  startedAt: string;
  escalationReason?: string;
  handoffNotes?: string;
  suggestedReply?: string;
  thread: ThreadMessage[];
  reasoning: ReasoningTurn[];
}

// --- TOPIC ---
export interface Topic {
  id: string;
  type: "proposal" | "question" | "document-parse";
  badge: string;

  title: string;
  summary: string;
  ruleContent?: string;
  currentRuleContent?: string;
  newRuleContent?: string;
  sourceTickets: string[];
  sourceDocId?: string;
  status: "pending" | "accepted" | "rejected" | "revised";
}

// --- ONBOARDING ---
export interface OnboardingStep {
  id: number;
  type: "message" | "action" | "choice" | "upload" | "hire" | "scenario" | "mode-select";
  sender?: string;
  text?: string;
  actions?: { label: string; nextStep: number; variant?: string }[];
  options?: { label: string; value: string; nextStep: number }[];
}

// ============================================================
// DEFAULT ACTION PERMISSIONS
// ============================================================
export const defaultReadActions: ActionPermission[] = [
  { id: "lookup_order", name: "lookup_order", label: "Look up order details", description: "Retrieve order status, items, and shipping info from Shopify", system: "Shopify", domain: "Orders", type: "read", enabled: true, locked: false },
  { id: "track_shipment", name: "track_shipment", label: "Track shipment", description: "Get real-time tracking and carrier info for shipped orders", system: "Shopify", domain: "Orders", type: "read", enabled: true, locked: false },
  { id: "lookup_customer", name: "lookup_customer", label: "Look up customer info", description: "Retrieve customer profile, order history, and contact details", system: "Shopify / Zendesk", domain: "Customers", type: "read", enabled: true, locked: false },
  { id: "lookup_product", name: "lookup_product", label: "Look up product info", description: "Search product catalog for availability, pricing, and variants", system: "Shopify", domain: "Products", type: "read", enabled: true, locked: false },
  { id: "lookup_seel", name: "lookup_seel", label: "Look up Seel protection status", description: "Check if order has active Seel shipping protection", system: "Seel", domain: "Insurance", type: "read", enabled: true, locked: false },
  { id: "read_ticket_history", name: "read_ticket_history", label: "Read ticket history", description: "Access past tickets and interactions for the customer", system: "Zendesk", domain: "Tickets", type: "read", enabled: true, locked: false },
  { id: "lookup_return_status", name: "lookup_return_status", label: "Look up return status", description: "Check status of existing return or exchange requests", system: "Shopify", domain: "Returns", type: "read", enabled: true, locked: false },
];

export const defaultWriteActions: ActionPermission[] = [
  { id: "reply_customer", name: "reply_customer", label: "Reply to customer", description: "Send responses directly to customer tickets", system: "Zendesk", domain: "Tickets", type: "write", enabled: true, locked: true },
  { id: "escalate_ticket", name: "escalate_ticket", label: "Escalate to human", description: "Transfer ticket to human agent when AI cannot resolve", system: "Zendesk", domain: "Tickets", type: "write", enabled: true, locked: true },
  { id: "cancel_order", name: "cancel_order", label: "Cancel order", description: "Cancel unfulfilled orders in Shopify", system: "Shopify", domain: "Orders", type: "write", enabled: false, locked: false, guardrail: "Within 2 hours of order placement" },
  { id: "edit_address", name: "edit_address", label: "Edit shipping address", description: "Modify shipping address on unfulfilled orders", system: "Shopify", domain: "Orders", type: "write", enabled: false, locked: false, guardrail: "Before dispatch only" },
  { id: "file_seel_claim", name: "file_seel_claim", label: "File insurance claim", description: "Submit shipping protection claims through Seel", system: "Seel", domain: "Insurance", type: "write", enabled: false, locked: false, guardrail: "Active protection plan required" },
  { id: "initiate_return", name: "initiate_return", label: "Initiate return", description: "Create return/exchange requests in Shopify", system: "Shopify", domain: "Returns", type: "write", enabled: false, locked: false, guardrail: "Within return window only" },
  { id: "issue_refund", name: "issue_refund", label: "Issue refund", description: "Process refunds for eligible orders", system: "Shopify", domain: "Orders", type: "write", enabled: false, locked: false, guardrail: "Manager approval required for > $100" },
  { id: "add_internal_note", name: "add_internal_note", label: "Add internal note", description: "Add internal notes to Zendesk tickets", system: "Zendesk", domain: "Tickets", type: "write", enabled: true, locked: false },
];

// ============================================================
// AGENTS
// ============================================================
export const agents: Agent[] = [
  {
    id: "team-lead",
    name: "Alex",
    initials: "TL",
    color: "linear-gradient(135deg, #059669, #10b981)",
    role: "Team Lead",
    mode: "N/A",
    isTeamLead: true,
    personality: "Professional",
    language: "English",
    status: "online",
    startDate: "Always available",
    tickets: { total: 0, today: 0 },
    resolution: null,
    csat: null,
    avgResponse: "instant",
    escalation: null,
    actionPermissions: [],
    configHistory: [],
  },
  {
    id: "agent-alpha",
    name: "Ava",
    initials: "A",
    color: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    role: "AI Support Rep",
    mode: "Training",
    isTeamLead: false,
    personality: "Friendly",
    language: "Auto-detect (match customer's language)",
    status: "online",
    startDate: "Mar 10, 2026",
    tickets: { total: 1247, today: 43 },
    resolution: 89,
    csat: 4.6,
    avgResponse: "5.8s",
    escalation: 11,
    actionPermissions: [
      ...defaultReadActions,
      ...defaultWriteActions.map(a => a.id === "cancel_order" ? { ...a, enabled: true } : a),
    ],
    configHistory: [
      { hash: "c4a1e7b", timestamp: "Mar 12, 2026, 11:20 AM", author: "Sarah Chen", summary: "Promoted to Production", diff: "mode: Training → Production" },
      { hash: "7f2b9d3", timestamp: "Mar 11, 2026, 03:45 PM", author: "Sarah Chen", summary: "Enabled cancel_order action", diff: "cancel_order: Disabled → Autonomous" },
      { hash: "a98d1c0", timestamp: "Mar 10, 2026, 02:30 PM", author: "Sarah Chen", summary: "Switched personality to Friendly", diff: "personality: Professional → Friendly" },
      { hash: "e3f0b82", timestamp: "Mar 10, 2026, 02:10 PM", author: "System", summary: "Agent onboarded — initial config", diff: "mode: Onboarding → Training" },
    ],
  },
];

// ============================================================
// RULES
// ============================================================
export const rules: Rule[] = [
  {
    id: "r1",
    name: "WISMO — Order Tracking",
    enabled: true,
    description: "When a customer asks about order status, look up the order in Shopify and provide tracking information.",
    content: "When a customer asks about order status or shipping:\n1. Look up the order in Shopify using order ID or customer email\n2. Retrieve tracking information from the carrier API\n3. Reply with: order status, tracking number, carrier name, estimated delivery date\n4. If the package is delayed beyond the estimated date, apologize and offer to escalate\n5. If no tracking info is available, explain the order is being processed and provide expected ship date",
    source: "Document",
    sourceDocId: "doc-1",
    lastUpdated: "Mar 24, 2026",
    stats: { used: 487, avgCsat: 4.8, deflection: 97 },
    versionHistory: [
      { version: 2, timestamp: "Mar 24, 2026", source: "Document", diff: "Added carrier API lookup step" },
      { version: 1, timestamp: "Mar 20, 2026", source: "Document", diff: "Initial extraction from SOP" },
    ],
  },
  {
    id: "r2",
    name: "Refund — Standard Process",
    enabled: true,
    description: "Handle refund requests for delivered items within the return window.",
    content: "When a customer requests a refund:\n1. Verify the order is within the 30-day return window\n2. Check if the item has been returned or is a damaged item (no return required)\n3. If refund amount ≤ agent refund cap, process the refund\n4. If refund amount > cap, escalate to L2 with full context\n5. For VIP customers, skip store credit offer and process direct refund\n6. Confirm refund method and timeline (5-7 business days)",
    source: "Document",
    sourceDocId: "doc-2",
    lastUpdated: "Mar 24, 2026",
    stats: { used: 312, avgCsat: 4.5, deflection: 88 },
    versionHistory: [
      { version: 1, timestamp: "Mar 20, 2026", source: "Document", diff: "Initial extraction from SOP" },
    ],
  },
  {
    id: "r3",
    name: "Cancellation — Unfulfilled Orders",
    enabled: true,
    description: "Cancel orders that have not yet been fulfilled and issue full refund.",
    content: "When a customer requests order cancellation:\n1. Look up the order in Shopify\n2. Verify the order status is 'Unfulfilled' or 'Processing'\n3. If unfulfilled: cancel the order and issue a full refund to original payment method\n4. If already shipped: inform customer the order cannot be cancelled and offer return instructions\n5. Confirm cancellation and refund details to customer",
    source: "Document",
    sourceDocId: "doc-1",
    lastUpdated: "Mar 24, 2026",
    stats: { used: 198, avgCsat: 4.6, deflection: 92 },
    versionHistory: [
      { version: 1, timestamp: "Mar 20, 2026", source: "Document", diff: "Initial extraction from SOP" },
    ],
  },
  {
    id: "r4",
    name: "Address Change — Pre-Dispatch",
    enabled: true,
    description: "Update shipping address for orders not yet dispatched.",
    content: "When a customer requests an address change:\n1. Look up the order in Shopify\n2. Verify the order has not been dispatched\n3. If pre-dispatch: update the shipping address in Shopify\n4. If already dispatched: inform customer the address cannot be changed and suggest contacting the carrier\n5. Confirm the updated address to the customer",
    source: "Document",
    sourceDocId: "doc-1",
    lastUpdated: "Mar 24, 2026",
    stats: { used: 145, avgCsat: 4.7, deflection: 95 },
    versionHistory: [
      { version: 1, timestamp: "Mar 20, 2026", source: "Document", diff: "Initial extraction from SOP" },
    ],
  },
  {
    id: "r5",
    name: "VIP Customer Handling",
    enabled: true,
    description: "Special handling rules for VIP customers including priority routing and direct refunds.",
    content: "For customers tagged as VIP (or 5+ orders, or LTV > $500):\n1. Always prioritize their tickets\n2. Skip store credit offer — process direct refund\n3. Use empathetic, personalized tone\n4. If complaint: escalate immediately to L2\n5. Proactively offer compensation (discount code) for any inconvenience",
    source: "Manager edit",
    sourceDocId: "doc-1",
    lastUpdated: "Mar 25, 2026",
    stats: { used: 89, avgCsat: 4.9, deflection: 85 },
    versionHistory: [
      { version: 2, timestamp: "Mar 25, 2026", source: "Manager edit", diff: "Added compensation step" },
      { version: 1, timestamp: "Mar 20, 2026", source: "Document", diff: "Initial extraction from SOP" },
    ],
  },
  {
    id: "r6",
    name: "Escalation — Sentiment Trigger",
    enabled: true,
    description: "Escalate when customer sentiment is frustrated or angry.",
    content: "Escalate to human agent when:\n1. Customer sentiment is detected as 'angry' or 'threatening'\n2. Customer explicitly requests a human agent\n3. Customer mentions legal action, lawyer, or trading standards\n4. 3 consecutive turns without resolution\n5. When escalating: leave Internal Note with handoff summary, sentiment analysis, and suggested reply",
    source: "Document",
    sourceDocId: "doc-3",
    lastUpdated: "Mar 24, 2026",
    stats: { used: 67, avgCsat: 4.2, deflection: 0 },
    versionHistory: [
      { version: 1, timestamp: "Mar 20, 2026", source: "Document", diff: "Initial extraction from SOP" },
    ],
  },
  {
    id: "r7",
    name: "Seel Protection — Claim Filing",
    enabled: false,
    description: "Handle Seel protection plan claims for damaged or lost items.",
    content: "When a customer has a Seel protection plan and reports damage or loss:\n1. Verify the Seel protection status via Seel API\n2. If covered: file an insurance claim through Seel\n3. Inform customer of the claim process and expected timeline\n4. If not covered: explain the protection plan terms and offer alternative solutions",
    source: "Team Lead",
    lastUpdated: "Mar 26, 2026",
    stats: { used: 23, avgCsat: 4.4, deflection: 78 },
    versionHistory: [
      { version: 1, timestamp: "Mar 26, 2026", source: "Team Lead", diff: "Created from Team Lead proposal" },
    ],
  },
];

// ============================================================
// DOCUMENTS
// ============================================================
export const documents: Document[] = [
  { id: "doc-1", name: "CS_Playbook_2025.pdf", type: "PDF", size: "2.4 MB", uploadedAt: "Mar 24, 2026", status: "Processed", inUse: true, extractedRules: "18 prompt rules, 8 guardrails, 6 actions" },
  { id: "doc-2", name: "Refund_Policy_v3.docx", type: "DOC", size: "890 KB", uploadedAt: "Mar 24, 2026", status: "Processed", inUse: true, extractedRules: "4 guardrails, 3 actions" },
  { id: "doc-3", name: "Escalation_Matrix.pdf", type: "PDF", size: "1.1 MB", uploadedAt: "Mar 24, 2026", status: "Processed", inUse: true, extractedRules: "8 escalation triggers" },
  { id: "doc-4", name: "FAQ_International_Shipping.txt", type: "TXT", size: "45 KB", uploadedAt: "Mar 26, 2026", status: "Processed", inUse: true, extractedRules: "3 knowledge entries" },
  { id: "doc-5", name: "Holiday_Returns_Update.pdf", type: "PDF", size: "320 KB", uploadedAt: "Mar 27, 2026", status: "Processing", inUse: false, extractedRules: "" },
];

// ============================================================
// TICKETS
// ============================================================
export const tickets: Ticket[] = [
  {
    id: "TK-4891",
    customer: "Emma Thompson",
    email: "emma.t@gmail.com",
    vip: true,
    subject: "Where is my order?",
    category: "WISMO",
    status: "solved",
    priority: "normal",
    channel: "email",
    agentId: "agent-alpha",
    time: "2 min ago",
    orderData: { id: "#DBH-29174", items: ["Cashmere Blend Scarf — Navy (x1)", "Leather Gloves — Size M (x1)"], total: "$127.00", status: "Shipped", carrier: "USPS Priority", tracking: "9400111899223456789012", estimatedDelivery: "March 26, 2026" },
    plan: [
      { action: "lookup_order", label: "Look up order #DBH-29174 on Shopify", tool: "Shopify API", duration: 1200, type: "read", executionStatus: "executed" },
      { action: "get_tracking", label: "Retrieve tracking details from USPS", tool: "Shipping API", duration: 800, type: "read", executionStatus: "executed" },
      { action: "reply_customer", label: "Compose and send reply with tracking info", tool: "Zendesk API", duration: 600, type: "write", executionStatus: "executed" },
    ],
    thread: [
      { from: "system", type: "system-event", author: "System", text: "Ticket assigned to Ava", time: "Today 9:41 AM", channel: "internal" },
      { from: "customer", type: "public", author: "Emma Thompson", text: "Hi, I placed order #DBH-29174 three days ago and still haven't received any shipping confirmation. Can you check the status please?", time: "Today 9:41 AM", channel: "email" },
      { from: "agent", type: "public", author: "Ava", text: "Hello Emma! Thanks for reaching out. I've checked your order #DBH-29174 and great news — it was shipped yesterday via USPS Priority.\n\nHere are your tracking details:\n- Tracking Number: 9400111899223456789012\n- Carrier: USPS Priority\n- Estimated Delivery: March 26, 2026\n\nYou can track your parcel at usps.com. If it hasn't arrived by the 27th, please don't hesitate to get back to us and we'll sort it out right away.\n\nBest wishes,\nAva — Support Team", time: "Today 9:42 AM", channel: "email" },
    ],
  },
  {
    id: "TK-4892",
    customer: "James Wright",
    email: "j.wright@outlook.com",
    vip: false,
    subject: "I want to cancel my order",
    category: "Cancellation",
    status: "solved",
    priority: "normal",
    channel: "email",
    agentId: "agent-alpha",
    time: "5 min ago",
    orderData: { id: "#DBH-29201", items: ["Men's Quilted Jacket — Black (x1)"], total: "$89.00", status: "Unfulfilled" },
    plan: [
      { action: "lookup_order", label: "Look up order #DBH-29201 on Shopify", tool: "Shopify API", duration: 1000, type: "read", executionStatus: "executed" },
      { action: "check_fulfillment", label: "Verify order is unfulfilled (cancellable)", tool: "Guardrails", duration: 600, type: "read", executionStatus: "executed" },
      { action: "cancel_order", label: "Cancel order #DBH-29201", tool: "Shopify API", duration: 1400, type: "write", executionStatus: "executed" },
      { action: "initiate_refund", label: "Initiate refund of $89.00 to Visa ending 4242", tool: "Stripe API", duration: 1000, type: "write", executionStatus: "executed" },
      { action: "reply_customer", label: "Confirm cancellation and refund to customer", tool: "Zendesk API", duration: 600, type: "write", executionStatus: "executed" },
    ],
    thread: [
      { from: "system", type: "system-event", author: "System", text: "Ticket assigned to Ava", time: "Today 9:35 AM", channel: "internal" },
      { from: "customer", type: "public", author: "James Wright", text: "Please cancel order #DBH-29201. I found the same jacket cheaper elsewhere. I want a full refund.", time: "Today 9:35 AM", channel: "email" },
      { from: "agent", type: "internal-note", author: "Ava", text: "Order #DBH-29201 is still unfulfilled. Cancellation is straightforward per SOP. Processing cancellation and full refund of $89.00 to Visa ending 4242.", time: "Today 9:36 AM", channel: "internal" },
      { from: "agent", type: "public", author: "Ava", text: "Hi James,\n\nI've processed your request right away. Here's what's been done:\n\n✓ Order #DBH-29201 has been cancelled\n✓ A full refund of $89.00 has been initiated to your Visa ending in 4242\n\nPlease allow 5-7 business days for the refund to appear in your account.\n\nKind regards,\nAva — Support Team", time: "Today 9:37 AM", channel: "email" },
    ],
  },
  {
    id: "TK-4893",
    customer: "Priya Patel",
    email: "priya.p@yahoo.com",
    vip: true,
    subject: "Wrong item received",
    category: "Complaint",
    status: "open",
    priority: "high",
    channel: "email",
    agentId: "agent-alpha",
    time: "8 min ago",
    escalationReason: "Customer sentiment: frustrated + item mismatch requires warehouse verification",
    orderData: { id: "#DBH-28990", items: ["Floral Midi Dress — Red (x1)"], total: "$65.00", status: "Delivered" },
    plan: [
      { action: "lookup_order", label: "Look up order #DBH-28990", tool: "Shopify API", duration: 1000, type: "read", executionStatus: "executed" },
      { action: "analyze_sentiment", label: "Detect customer sentiment: FRUSTRATED", tool: "Guardrails", duration: 400, type: "read", executionStatus: "executed" },
      { action: "escalate", label: "Escalate to human agent — sentiment + item mismatch", tool: "Zendesk API", duration: 800, type: "write", executionStatus: "executed" },
    ],
    thread: [
      { from: "system", type: "system-event", author: "System", text: "Ticket assigned to Ava", time: "Today 8:50 AM", channel: "internal" },
      { from: "customer", type: "public", author: "Priya Patel", text: "I ordered a red dress (order #DBH-28990) but received a blue one instead. This is really frustrating as I needed it for an event this weekend!", time: "Today 8:50 AM", channel: "email" },
      { from: "agent", type: "public", author: "Ava", text: "Dear Priya,\n\nI'm truly sorry about this mix-up — I completely understand how frustrating this must be. I've flagged this as urgent and I'm escalating to our senior support team right now.\n\nThank you for your patience.\n\nAva — Support Team", time: "Today 8:51 AM", channel: "email" },
      { from: "agent", type: "internal-note", author: "Ava", text: "Escalating to L2 — wrong item received. Customer sentiment is frustrated, VIP customer with high LTV. Requires warehouse check.\n\nSuggested reply: Offer expedited replacement + return label for wrong item.", time: "Today 8:51 AM", channel: "internal" },
      { from: "system", type: "system-event", author: "System", text: "Ava escalated ticket to L2 — Escalations team.", time: "Today 8:52 AM", channel: "internal" },
    ],
  },
  {
    id: "TK-4894",
    customer: "Oliver Bennett",
    email: "oliver.b@icloud.com",
    vip: false,
    subject: "Change delivery address",
    category: "Address Change",
    status: "solved",
    priority: "normal",
    channel: "chat",
    agentId: "agent-alpha",
    time: "12 min ago",
    orderData: { id: "#DBH-29210", items: ["Cotton T-Shirt Pack (3) — White (x1)", "Slim Fit Chinos — Navy (x1)"], total: "$74.50", status: "Unfulfilled" },
    plan: [
      { action: "lookup_order", label: "Look up order #DBH-29210", tool: "Shopify API", duration: 900, type: "read", executionStatus: "executed" },
      { action: "update_address", label: "Update shipping address to 45 Baker Street", tool: "Shopify API", duration: 1200, type: "write", executionStatus: "executed" },
      { action: "reply_customer", label: "Confirm address update to customer", tool: "Zendesk API", duration: 600, type: "write", executionStatus: "executed" },
    ],
    thread: [
      { from: "system", type: "system-event", author: "System", text: "Ticket assigned to Ava", time: "Today 9:15 AM", channel: "internal" },
      { from: "customer", type: "public", author: "Oliver Bennett", text: "Hi, I just placed order #DBH-29210 and realised I put the wrong address. Can you change it to 45 Baker Street, New York, NY 10001?", time: "Today 9:15 AM", channel: "chat" },
      { from: "agent", type: "public", author: "Ava", text: "Hi Oliver! I've updated the shipping address for order #DBH-29210 to 45 Baker Street, New York, NY 10001. You'll get a shipping confirmation when it dispatches.\n\nBest,\nAva — Support Team", time: "Today 9:16 AM", channel: "chat" },
    ],
  },
  {
    id: "TK-4895",
    customer: "Sophie Williams",
    email: "sophie.w@gmail.com",
    vip: false,
    subject: "Refund not received",
    category: "Refund",
    status: "solved",
    priority: "normal",
    channel: "email",
    agentId: "agent-alpha",
    time: "18 min ago",
    orderData: { id: "#DBH-29050", items: ["Silk Blouse — Ivory (x1)"], total: "$45.00", status: "Returned" },
    plan: [
      { action: "lookup_order", label: "Look up order #DBH-29050", tool: "Shopify API", duration: 1000, type: "read", executionStatus: "executed" },
      { action: "check_refund_status", label: "Check refund processing status", tool: "Stripe API", duration: 800, type: "read", executionStatus: "executed" },
      { action: "reply_customer", label: "Inform customer about refund timeline", tool: "Zendesk API", duration: 600, type: "write", executionStatus: "executed" },
    ],
    thread: [
      { from: "system", type: "system-event", author: "System", text: "Ticket assigned to Ava", time: "Today 9:00 AM", channel: "internal" },
      { from: "customer", type: "public", author: "Sophie Williams", text: "I returned my silk blouse a week ago and haven't received my refund yet. Order #DBH-29050.", time: "Today 9:00 AM", channel: "email" },
      { from: "agent", type: "public", author: "Ava", text: "Hi Sophie! I've checked your refund status for order #DBH-29050. The refund of $45.00 was processed on March 24 and should appear in your account within 5-7 business days.\n\nBest wishes,\nAva — Support Team", time: "Today 9:01 AM", channel: "email" },
    ],
  },
];

// ============================================================
// ESCALATION FEED
// ============================================================
export const escalationFeed: EscalationCard[] = [
  {
    id: "esc-1",
    ticketId: "#4501",
    subject: "Refund to PayPal request",
    summary: "Customer requesting refund to PayPal instead of original credit card. Current rules only cover refunds to original payment method.",
    reason: "No rule covers PayPal-specific refund routing. Escalated for human decision.",
    customer: "Mike Torres",
    email: "mike.t@email.com",
    intent: "Cross-Payment Refund",
    sentiment: "frustrated",
    outcome: "Escalated",
    mode: "Production",
    priority: "High",
    orderValue: "$129.00",
    turns: 4,
    time: "2h ago",
    createdAt: "2h ago",
    startedAt: "2026/3/29 00:10:00",
    status: "needs_attention",
    thread: [
      { role: "customer", content: "Hi, I paid with PayPal and would like my refund back to PayPal, not my credit card." },
      { role: "rep", content: "I understand you'd like the refund to your PayPal account. Let me look into this for you." },
      { role: "customer", content: "Yes please, I don't use that credit card anymore." },
      { role: "rep", content: "I see — our current policy processes refunds to the original payment method. Let me escalate this to ensure we handle it correctly for you." },
    ],
  },
  {
    id: "esc-2",
    ticketId: "#4498",
    subject: "International return — customs duty",
    summary: "Customer in UK asking about customs duty refund on returned item. No rule covers international customs duty handling.",
    reason: "International customs duty refund not covered by any existing rule.",
    customer: "Sarah Chen",
    email: "sarah.c@email.com",
    intent: "International Return",
    sentiment: "neutral",
    outcome: "Escalated",
    mode: "Production",
    priority: "Medium",
    orderValue: "$215.00",
    turns: 4,
    time: "3h ago",
    createdAt: "3h ago",
    startedAt: "2026/3/29 01:25:00",
    status: "needs_attention",
    thread: [
      { role: "customer", content: "I returned my order but I also paid customs duty. Will I get that refunded too?" },
      { role: "rep", content: "Thank you for reaching out. I'm checking on the customs duty refund policy for international returns." },
      { role: "customer", content: "It was about £35 in customs fees." },
      { role: "rep", content: "I understand. This requires a specialist review — let me escalate this to our team for a proper resolution." },
    ],
  },
  {
    id: "esc-3",
    ticketId: "#4495",
    subject: "Gift card balance dispute",
    summary: "Customer claims gift card balance is incorrect after partial use. Need to verify transaction history.",
    reason: "Gift card balance discrepancy requires manual transaction audit.",
    customer: "James Wilson",
    email: "j.wilson@email.com",
    intent: "Gift Card Inquiry",
    sentiment: "frustrated",
    outcome: "Resolved",
    mode: "Production",
    priority: "Low",
    orderValue: "$50.00",
    turns: 3,
    time: "5h ago",
    createdAt: "5h ago",
    startedAt: "2026/3/28 22:45:00",
    status: "resolved",
    thread: [
      { role: "customer", content: "My gift card should have $50 left but it's showing $12." },
      { role: "rep", content: "I can see your gift card was used for a $38 purchase on March 15th. The remaining balance of $12 is correct." },
      { role: "customer", content: "Oh I see, I forgot about that purchase. Thank you!" },
    ],
  },
  {
    id: "esc-4",
    ticketId: "#4490",
    subject: "Damaged item — photo evidence",
    summary: "Customer sent photos of damaged packaging. Item appears intact but customer insists on replacement.",
    reason: "Photo evidence assessment needed — packaging damaged but item may be intact.",
    customer: "Lisa Park",
    email: "lisa.p@email.com",
    intent: "Damaged Item Claim",
    sentiment: "neutral",
    outcome: "Resolved",
    mode: "Training",
    priority: "Medium",
    orderValue: "$89.00",
    turns: 4,
    time: "6h ago",
    createdAt: "6h ago",
    startedAt: "2026/3/28 21:30:00",
    status: "resolved",
    thread: [
      { role: "customer", content: "The box arrived completely crushed. I want a replacement." },
      { role: "rep", content: "I'm sorry about the packaging damage. Could you check if the item inside is also damaged?" },
      { role: "customer", content: "The item looks fine but I'm worried it might have internal damage." },
      { role: "rep", content: "I understand your concern. Based on the photos, the item appears intact. We've issued a 15% discount on your next order as a goodwill gesture." },
    ],
  },
];

// ============================================================
// PERFORMANCE DATA
// ============================================================
export const performanceSummary: PerformanceKPI[] = [
  { label: "Total Tickets",              value: 156,  unit: "",  trend: 12,   trendLabel: "vs previous period" },
  { label: "Resolution Rate",            value: 68,   unit: "%", trend: 4,    trendLabel: "vs previous period" },
  { label: "Escalation Rate",            value: 32,   unit: "%", trend: -4,   trendLabel: "vs previous period" },
  { label: "Sentiment Improvement Rate", value: 54,   unit: "%", trend: 6.2,  trendLabel: "vs previous period" },
  { label: "Avg. Turns",                 value: 4.5,  unit: "",  trend: -0.3, trendLabel: "vs previous period" },
];

// Sentiment score: -2=Furious -1=Negative 0=Neutral +1=Positive +2=Satisfied
export const performanceDaily: PerformanceDaily[] = Array.from({ length: 180 }, (_, i) => {
  const d = new Date(2025, 11, i + 1);
  const isWeekend = [0, 6].includes(d.getDay());
  const tickets = Math.round((isWeekend ? 35 : 60) * (1 + (i / 30) * 0.15) + (Math.random() * 10 - 5));
  const resRate = Math.min(80, Math.max(52, 62 + (i / 180) * 8 + (Math.random() * 6 - 3)));
  // Entry: pre-sale — Furious/Negative tail visible (frustrated buyers), mostly Neutral
  const re = Math.random();
  const rawEntry = re < 0.12 ? -(1.5 + Math.random() * 0.5)          // Furious  ~12%
                : re < 0.25  ? -(0.5 + Math.random() * 0.9)          // Negative ~13%
                : re < 0.80  ? (-0.4 + Math.random() * 0.8)          // Neutral  ~55%
                : re < 0.95  ? (0.5  + Math.random() * 0.9)          // Positive ~15%
                :               (1.5  + Math.random() * 0.5);         // Satisfied  ~5%
  const entryScore = Math.round(Math.max(-2, Math.min(2, rawEntry)) * 10) / 10;
  // Exit: AI resolved well — Furious eliminated, majority Positive/Satisfied
  const rx = Math.random();
  const rawExit = rx < 0.07   ? -(0.5 + Math.random() * 0.9)         // Negative   ~7%
               : rx < 0.22    ? (-0.4 + Math.random() * 0.8)         // Neutral   ~15%
               : rx < 0.57    ? (0.5  + Math.random() * 0.9)         // Positive  ~35%
               :                 (1.5  + Math.random() * 0.5);        // Satisfied ~43%
  const exitScore = Math.round(Math.max(-2, Math.min(2, rawExit)) * 10) / 10;
  return {
    date: d.toISOString().split("T")[0],
    tickets,
    resolved: Math.round(tickets * resRate / 100),
    escalated: Math.round(tickets * (1 - resRate / 100)),
    autoResolutionRate: Math.round(resRate * 10) / 10,
    sentimentImprovementRate: Math.round(Math.min(70, 40 + i * 0.8 + (Math.random() * 8 - 4)) * 10) / 10,
    avgTurns: Math.round((5.5 - i * 0.03 + (Math.random() * 0.6 - 0.3)) * 10) / 10,
    entrySentimentScore: entryScore,
    exitSentimentScore: exitScore,
  };
});

export const intentData: IntentRow[] = [
  { intent: "Where Is My Order",  volume: 156, resolutionRate: 89, sentimentChange: +0.8 },
  { intent: "Refunds",            volume: 98,  resolutionRate: 62, sentimentChange: +0.3 },
  { intent: "Cancellations",      volume: 67,  resolutionRate: 78, sentimentChange: +0.5 },
  { intent: "Product Issues",     volume: 52,  resolutionRate: 55, sentimentChange: -0.1 },
  { intent: "Shipping",           volume: 45,  resolutionRate: 71, sentimentChange: +0.6 },
  { intent: "Returns",            volume: 38,  resolutionRate: 58, sentimentChange: +0.2 },
  { intent: "Pre-sale Questions", volume: 31,  resolutionRate: 82, sentimentChange: +0.9 },
  { intent: "Account Issues",     volume: 18,  resolutionRate: 44, sentimentChange: -0.2 },
];

// ============================================================
// CONVERSATION LOGS
// ============================================================
export const conversationLogs: ConversationLog[] = [
  {
    ticketId: "TK-4891", customer: "Emma Thompson", email: "emma.t@gmail.com",
    intent: "WISMO", entrySentiment: "Neutral", sentiment: "Satisfied", outcome: "Resolved", mode: "Production", channel: "Live Chat Widget",
    turns: 1, duration: "1m 12s", summary: "Customer asked about order #DBH-29174 shipping status.", time: "Today 9:42 AM", startedAt: "Today 9:41 AM",
    thread: tickets[0].thread,
    reasoning: [{
      turn: 1, customerInput: "Hi, I placed order #DBH-29174 three days ago and still haven't received any shipping confirmation.",
      contextEnrichment: ["order_id: #DBH-29174", "customer: Emma Thompson (VIP)", "order_status: Shipped"],
      ruleRouting: { intent: "WISMO", confidence: 0.96, matchedRules: ["WISMO — Order Tracking"] },
      knowledgeRetrieval: { query: "order tracking shipping status", results: 3, topSimilarity: 0.92 },
      actionsExecuted: [
        { name: "lookup_order", params: "order_id=#DBH-29174", status: "Success", result: "Order #DBH-29174 — Shipped via USPS Priority" },
        { name: "get_tracking", params: "carrier=USPS", status: "Success", result: "Tracking: 9400111899223456789012, ETA: Mar 26" },
      ],
      guardrailCheck: "Passed — all actions within policy",
      repOutput: "Hello Emma! Thanks for reaching out. I've checked your order #DBH-29174 and great news — it was shipped yesterday via USPS Priority...",
    }],
  },
  {
    ticketId: "TK-4892", customer: "James Wright", email: "j.wright@outlook.com",
    intent: "Cancellation", entrySentiment: "Negative", sentiment: "Positive", outcome: "Resolved", mode: "Production", channel: "Zendesk",
    turns: 1, duration: "2m 05s", summary: "Customer requested cancellation of unfulfilled order #DBH-29201.", time: "Today 9:37 AM", startedAt: "Today 9:35 AM",
    thread: tickets[1].thread,
    reasoning: [{
      turn: 1, customerInput: "Please cancel order #DBH-29201. I found the same jacket cheaper elsewhere.",
      contextEnrichment: ["order_id: #DBH-29201", "customer: James Wright", "order_status: Unfulfilled"],
      ruleRouting: { intent: "Cancellation", confidence: 0.94, matchedRules: ["Cancellation — Unfulfilled Orders"] },
      knowledgeRetrieval: { query: "order cancellation unfulfilled", results: 2, topSimilarity: 0.89 },
      actionsExecuted: [
        { name: "lookup_order", params: "order_id=#DBH-29201", status: "Success", result: "Order #DBH-29201 — Unfulfilled, $89.00" },
        { name: "cancel_order", params: "order_id=#DBH-29201", status: "Success", result: "Order cancelled" },
        { name: "initiate_refund", params: "amount=$89.00, method=Visa 4242", status: "Success", result: "Refund of $89.00 initiated" },
      ],
      guardrailCheck: "Passed — order within cancellation window",
      repOutput: "Hi James, I've processed your request right away...",
    }],
  },
  {
    ticketId: "TK-4893", customer: "Priya Patel", email: "priya.p@yahoo.com",
    intent: "Complaint", entrySentiment: "Furious", sentiment: "Furious", outcome: "Escalated", mode: "Production", channel: "Email",
    turns: 1, duration: "0m 45s", summary: "Wrong item received — escalated due to frustrated sentiment.", time: "Today 8:52 AM", startedAt: "Today 8:50 AM",
    escalationReason: "Customer sentiment: frustrated + item mismatch requires warehouse verification",
    handoffNotes: "Wrong item received. Customer ordered red dress, received blue. VIP customer with high LTV. Requires warehouse check for inventory mismatch.",
    suggestedReply: "Dear Priya, I sincerely apologize for this error. We're sending a replacement red dress via express shipping today, and I've emailed you a prepaid return label for the incorrect item. You should receive the replacement within 2 business days.",
    thread: tickets[2].thread,
    reasoning: [{
      turn: 1, customerInput: "I ordered a red dress but received a blue one instead. This is really frustrating!",
      contextEnrichment: ["order_id: #DBH-28990", "customer: Priya Patel (VIP)", "item_mismatch: true"],
      ruleRouting: { intent: "Complaint", confidence: 0.91, matchedRules: ["Escalation — Sentiment Trigger", "VIP Customer Handling"] },
      knowledgeRetrieval: { query: "wrong item received complaint", results: 1, topSimilarity: 0.78 },
      actionsExecuted: [
        { name: "lookup_order", params: "order_id=#DBH-28990", status: "Success", result: "Order #DBH-28990 — Delivered" },
        { name: "analyze_sentiment", params: "text=customer_message", status: "Success", result: "Sentiment: Frustrated (0.87)" },
        { name: "escalate_ticket", params: "reason=sentiment+mismatch", status: "Success", result: "Escalated to L2" },
      ],
      guardrailCheck: "Passed — escalation triggered by sentiment rule",
      repOutput: "Dear Priya, I'm truly sorry about this mix-up...",
    }],
  },
  {
    ticketId: "TK-4894", customer: "Oliver Bennett", email: "oliver.b@icloud.com",
    intent: "Address Change", entrySentiment: "Neutral", sentiment: "Neutral", outcome: "Resolved", mode: "Training", channel: "Live Chat Widget",
    turns: 1, duration: "0m 55s", summary: "Customer requested address change for unfulfilled order.", time: "Today 9:16 AM", startedAt: "Today 9:15 AM",
    thread: tickets[3].thread,
    reasoning: [{
      turn: 1, customerInput: "I just placed order #DBH-29210 and realised I put the wrong address.",
      contextEnrichment: ["order_id: #DBH-29210", "customer: Oliver Bennett", "order_status: Unfulfilled"],
      ruleRouting: { intent: "Address Change", confidence: 0.97, matchedRules: ["Address Change — Pre-Dispatch"] },
      knowledgeRetrieval: { query: "address change pre-dispatch", results: 2, topSimilarity: 0.91 },
      actionsExecuted: [
        { name: "lookup_order", params: "order_id=#DBH-29210", status: "Success", result: "Order #DBH-29210 — Unfulfilled" },
        { name: "edit_address", params: "address=45 Baker Street, NY", status: "Success", result: "Address updated" },
      ],
      guardrailCheck: "Passed — order not yet dispatched",
      repOutput: "Hi Oliver! I've updated the shipping address for order #DBH-29210...",
    }],
  },
  {
    ticketId: "TK-4895", customer: "Sophie Williams", email: "sophie.w@gmail.com",
    intent: "Refund", entrySentiment: "Negative", sentiment: "Negative", outcome: "Resolved", mode: "Production", channel: "Zendesk",
    turns: 1, duration: "1m 30s", summary: "Customer inquired about refund status for returned item.", time: "Today 9:01 AM", startedAt: "Today 9:00 AM",
    thread: tickets[4].thread,
    reasoning: [{
      turn: 1, customerInput: "I returned my silk blouse a week ago and haven't received my refund yet.",
      contextEnrichment: ["order_id: #DBH-29050", "customer: Sophie Williams", "return_status: Received"],
      ruleRouting: { intent: "Refund", confidence: 0.93, matchedRules: ["Refund — Standard Process"] },
      knowledgeRetrieval: { query: "refund status timeline", results: 2, topSimilarity: 0.88 },
      actionsExecuted: [
        { name: "lookup_order", params: "order_id=#DBH-29050", status: "Success", result: "Order #DBH-29050 — Returned" },
        { name: "check_refund_status", params: "order_id=#DBH-29050", status: "Success", result: "Refund processed Mar 24, pending" },
      ],
      guardrailCheck: "Passed — read-only operation",
      repOutput: "Hi Sophie! I've checked your refund status for order #DBH-29050...",
    }],
  },
];

// ============================================================
// EMAIL ASSISTANT
// ============================================================

export type EmailStatus = "new" | "open" | "pending" | "solved";
export type EmailSentiment = "positive" | "neutral" | "negative" | "frustrated";
export type EmailIntent =
  | "Order Status"
  | "Tracking Update"
  | "Warranty Coverage"
  | "Repair Status"
  | "Refund Policy"
  | "Product Inquiry"
  | "Complaint"
  | "Return Request"
  | "Other";

export type EmailType = "user" | "non-user";
export type OperationMode = "training" | "production";

export interface FlagRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_FLAG_RULES: FlagRule[] = [
  { id: "sentiment_frustrated", label: "Frustrated / negative sentiment", description: "Flag emails where AI detects angry or frustrated tone", enabled: true },
  { id: "low_confidence",       label: "AI confidence < 90%",             description: "Flag when AI is not confident enough to auto-reply",  enabled: true },
  { id: "complaint_intent",     label: "Complaint intent",                 description: "Flag all emails classified as complaints",            enabled: true },
  { id: "warranty_intent",      label: "Warranty / repair claims",         description: "Flag warranty and repair-related inquiries",         enabled: false },
  { id: "no_order",             label: "No order number found",            description: "Flag emails with no identifiable order reference",   enabled: false },
];

export interface EmailLabel {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_EMAIL_LABELS: EmailLabel[] = [
  { id: "lbl-vip",      label: "VIP",       color: "#7c3aed" },
  { id: "lbl-urgent",   label: "Urgent",    color: "#dc2626" },
  { id: "lbl-followup", label: "Follow-up", color: "#d97706" },
  { id: "lbl-warranty", label: "Warranty",  color: "#2563eb" },
  { id: "lbl-refund",   label: "Refund",    color: "#16a34a" },
];

export interface EmailAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;  // "image/jpeg" | "image/png" | "application/pdf" | etc.
  size?: string;
}

export interface EmailMessage {
  id: string;
  from: "customer" | "agent";
  authorName: string;
  authorEmail: string;
  content: string;
  contentZh?: string;
  timestamp: string;
  isInternal?: boolean;  // internal note — visible to agents only
  attachments?: EmailAttachment[];
}

export interface AIEmailCard {
  intent: EmailIntent;
  sentiment: EmailSentiment;
  confidence: number;
  orderNumber?: string;
  orderStatus?: string;
  tracking?: string;
  estimatedDelivery?: string;
  relatedPolicy?: string;
  summary: string;
  summaryZh?: string;
  suggestedReply: string;
  suggestedReplyZh?: string;
}

export interface EmailThread {
  id: string;
  emailType: EmailType;
  threadMode?: OperationMode;  // per-thread mode override; if absent, uses global mode
  customer: string;
  customerEmail: string;
  subject: string;
  status: EmailStatus;
  priority: "normal" | "high" | "urgent";
  isRead: boolean;
  receivedAt: string;
  updatedAt: string;
  inboxSummary: string;
  lockedBy?: string;
  labels?: string[];
  customerNote?: string;  // persistent note about this customer, shown across tickets
  aiCard: AIEmailCard;
  messages: EmailMessage[];
}

export const emailThreads: EmailThread[] = [
  {
    id: "em-001",
    emailType: "user",
    threadMode: "production",
    customer: "Michael Zhang",
    customerEmail: "michael.zhang@gmail.com",
    subject: "Where is my Mavic 3 Pro order?",
    status: "open",
    priority: "normal",
    isRead: false,
    receivedAt: "Today 10:23 AM",
    updatedAt: "Today 11:44 AM",
    inboxSummary: "Customer asking about order #DJI-88412 shipped 5 days ago with no update",
    labels: ["lbl-followup"],
    aiCard: {
      intent: "Order Status",
      sentiment: "neutral",
      confidence: 0.97,
      orderNumber: "#DJI-88412",
      orderStatus: "In Transit",
      tracking: "1Z9A84W00394818591",
      estimatedDelivery: "Apr 30, 2026",
      relatedPolicy: "Standard Shipping SLA: 5-7 business days",
      summary: "Customer placed order #DJI-88412 (Mavic 3 Pro) 5 days ago. Package is in transit via UPS, tracking 1Z9A84W00394818591, ETA Apr 30.",
      summaryZh: "客户订单 #DJI-88412（Mavic 3 Pro）已发货5天，UPS在途，追踪号 1Z9A84W00394818591，预计4月30日到达。",
      suggestedReply: `Hi Michael,

Thank you for reaching out! I checked your order #DJI-88412 and here's the latest status:

📦 **Order:** DJI Mavic 3 Pro Combo
🚚 **Carrier:** UPS Ground
🔍 **Tracking:** 1Z9A84W00394818591
📅 **Estimated Delivery:** April 30, 2026

Your package is currently in transit and on schedule. You can track it in real time at ups.com using the tracking number above.

If it hasn't arrived by May 1st, please don't hesitate to reach back out and we'll investigate further.

Best regards,
DJI USA Customer Support`,
      suggestedReplyZh: `你好 Michael，

感谢您的联系！已查询到您的订单 #DJI-88412 最新状态：

📦 **商品：** DJI Mavic 3 Pro 套装
🚚 **承运商：** UPS Ground
🔍 **追踪号：** 1Z9A84W00394818591
📅 **预计送达：** 2026年4月30日

包裹正在运输途中，一切正常。请使用上述追踪号在 ups.com 实时查询。

如5月1日前仍未收到，请随时联系我们，我们将进一步跟进。

祝好，
DJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-001-1",
        from: "customer",
        authorName: "Michael Zhang",
        authorEmail: "michael.zhang@gmail.com",
        content: "Hi,\n\nI ordered the DJI Mavic 3 Pro Combo (order #DJI-88412) 5 days ago and I still haven't received any shipping update. The tracking page just says \"Label Created\" and hasn't changed. Is everything okay with my order?\n\nPlease let me know.\n\nThanks,\nMichael",
        contentZh: "您好，\n\n我5天前订购了 DJI Mavic 3 Pro 套装（订单号 #DJI-88412），但一直没有收到任何发货更新。追踪页面显示「标签已创建」，状态没有变化。我的订单一切正常吗？\n\n请告知。\n\n谢谢，\nMichael",
        timestamp: "Today 10:23 AM",
      },
    ],
  },
  {
    id: "em-002",
    emailType: "user",
    threadMode: "production",
    customer: "Sarah Okonkwo",
    customerEmail: "s.okonkwo@outlook.com",
    subject: "DJI Mini 4 Pro crashed after 2 weeks — warranty claim",
    status: "new",
    priority: "high",
    isRead: false,
    receivedAt: "Today 9:47 AM",
    updatedAt: "Today 9:47 AM",
    inboxSummary: "Drone crashed due to signal loss in open field, requesting warranty replacement, 14 days old",
    labels: ["lbl-warranty", "lbl-vip"],
    aiCard: {
      intent: "Warranty Coverage",
      sentiment: "frustrated",
      confidence: 0.91,
      orderNumber: "#DJI-87203",
      orderStatus: "Delivered Apr 13, 2026",
      relatedPolicy: "DJI Care Refresh required for flyaway/signal loss incidents. Standard warranty covers manufacturing defects only.",
      summary: "Customer's Mini 4 Pro experienced signal loss and crashed 14 days after purchase. No DJI Care Refresh. Standard warranty won't cover this — needs careful handling.",
      summaryZh: "客户 Mini 4 Pro 购买14天后因信号丢失坠机，无随心换保障。标准保修不涵盖此类事故，需谨慎处理，建议人工审核。",
      suggestedReply: `Hi Sarah,

I'm sorry to hear about your Mini 4 Pro — that must be incredibly frustrating, especially so soon after purchase.

I've looked into your order #DJI-87203. Here's what I can confirm:

- Your drone is within the **14-day purchase window**
- Standard DJI warranty covers **manufacturing defects**, but unfortunately signal loss/flyaway incidents are not covered under the standard warranty
- **DJI Care Refresh** would cover this type of incident, but it needs to be purchased within 48 hours of the drone's first activation

**What we can do:**
1. I can escalate your case to our warranty specialist team for a manual review — given this is only 14 days old, they may be able to offer an exception
2. You can also submit a formal warranty claim at care.dji.com with flight logs from the DJI app, which helps our team assess the incident

Would you like me to escalate this to our specialist team? If so, could you share the flight logs from the DJI Fly app?

Sincerely,
DJI USA Customer Support`,
      suggestedReplyZh: `你好 Sarah，

非常抱歉听到您的 Mini 4 Pro 发生事故，购买后这么短的时间内遭遇这种情况确实令人沮丧。

已查询您的订单 #DJI-87203，说明如下：

- 无人机在 **14天购买窗口期内**
- 标准保修涵盖**制造缺陷**，信号丢失/飞走事故**不在**标准保修范围内
- **DJI Care 随心换**可覆盖此类事故，但须在首次激活后48小时内购买

**我们可以为您做的：**
1. 可将您的案件升级至保修专员团队进行人工审核——仅购买14天，可能可申请例外处理
2. 也可在 care.dji.com 提交正式索赔，并附上 DJI Fly 的飞行记录

是否需要我升级您的案件？如需要，请提供飞行记录。

此致，
DJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-002-1",
        from: "customer",
        authorName: "Sarah Okonkwo",
        authorEmail: "s.okonkwo@outlook.com",
          content: "Hello,\n\nI purchased my DJI Mini 4 Pro just 2 weeks ago (order #DJI-87203) and yesterday it crashed in an open field with no obstacles. The drone just lost signal and flew away — I never recovered it.\n\nThis is unacceptable for a brand new drone. I want a full replacement under warranty. I paid $760 for this and it's already gone.\n\nAttaching photos of the crash site and the recovered wreckage.\n\nWhat are my options?\n\nSarah",
        contentZh: "您好，\n\n我两周前购买的 DJI Mini 4 Pro（订单号 #DJI-87203），昨天在开阔地飞行时坠机，周围没有任何障碍物。无人机突然失去信号飞走了，我再也找不到它了。\n\n对于一台全新无人机来说，这是完全无法接受的。我支付了760美元，它就这么没了，我要求在保修范围内进行全额替换。\n\n已附上坠机现场及残骸照片。\n\n我有哪些选择？\n\nSarah",
        attachments: [
          { id: "att-002-1", name: "crash_site_photo.jpg",   url: "https://picsum.photos/seed/field1/900/600",  mimeType: "image/jpeg", size: "2.3 MB" },
          { id: "att-002-2", name: "drone_wreckage.jpg",     url: "https://picsum.photos/seed/drone2/900/600",  mimeType: "image/jpeg", size: "1.8 MB" },
          { id: "att-002-3", name: "serial_number_label.jpg",url: "https://picsum.photos/seed/label3/900/600",  mimeType: "image/jpeg", size: "0.9 MB" },
        ],
        timestamp: "Today 9:47 AM",
      },
    ],
  },
  {
    id: "em-003",
    emailType: "user",
    customer: "David Hernandez",
    customerEmail: "d.hernandez@yahoo.com",
    subject: "Repair status update for RS 3 Pro gimbal",
    status: "pending",
    priority: "normal",
    isRead: true,
    receivedAt: "Today 8:15 AM",
    updatedAt: "Today 9:10 AM",
    inboxSummary: "Customer asking for update on RS 3 Pro gimbal repair, sent 3 weeks ago, RMA #R-40291",
    aiCard: {
      intent: "Repair Status",
      sentiment: "neutral",
      confidence: 0.95,
      orderNumber: "RMA #R-40291",
      orderStatus: "Under Repair — Technician Assessment",
      relatedPolicy: "Standard repair turnaround: 10-15 business days. Current status: Day 15.",
      summary: "RS 3 Pro gimbal sent for repair 3 weeks ago under RMA #R-40291. Currently at Day 15 of 10-15 day window — borderline, needs status check.",
      summaryZh: "客户RS 3 Pro云台3周前以 RMA #R-40291 送修，目前处于维修窗口期第15天（标准10-15个工作日），已达上限，需跟进状态。",
      suggestedReply: `Hi David,

Thank you for your patience — I understand waiting 3 weeks feels like a long time.

I pulled up your repair case **RMA #R-40291**:

- **Status:** Under Repair — Technician Assessment
- **Received:** April 8, 2026
- **Current Stage:** Component sourcing & repair (Day 15 of 10-15 business days)

Your case is at the upper end of our standard repair window. I've flagged it as priority for an update from our repair team. You should receive a detailed status email within **1 business day**.

Once repaired, your gimbal will be shipped back via UPS 2-Day at no charge.

I appreciate your patience and I'll make sure your case gets attention today.

Best,
DJI USA Customer Support`,
      suggestedReplyZh: `你好 David，

感谢您的耐心等待——我理解等待3周确实太久了。

我已查询您的维修案例 **RMA #R-40291**：

- **状态：** 维修中——技术评估阶段
- **收到日期：** 2026年4月8日
- **当前阶段：** 零件采购与维修（标准工期10-15个工作日的第15天）

您的案例已处于标准维修周期的上限。我已将其标记为优先处理，并请维修团队提供最新进展。您将在 **1个工作日** 内收到详细的状态邮件。

维修完成后，您的云台将通过 UPS 两日达免费寄回。

感谢您的耐心，我将确保您的案例今天得到关注。

此致，
DJI USA 客户支持`,
    },
    messages: [
      {
        id: "msg-003-1",
        from: "customer",
        authorName: "David Hernandez",
        authorEmail: "d.hernandez@yahoo.com",
        content: "Hi,\n\nI sent my RS 3 Pro gimbal in for repair about 3 weeks ago (RMA #R-40291). I haven't heard anything back yet. Can you give me an update on when I can expect it back?\n\nThanks,\nDavid",
        contentZh: "您好，\n\n我大约3周前将 RS 3 Pro 云台送去维修（RMA #R-40291），目前还没有收到任何回复。能告诉我什么时候可以收到吗？\n\n谢谢，\nDavid",
        timestamp: "Today 8:15 AM",
      },
      {
        id: "msg-003-2",
        from: "agent",
        authorName: "DJI USA Support",
        authorEmail: "service@djiusa.com",
        content: "Hi David,\n\nThank you for reaching out. I've located your repair case RMA #R-40291. Your RS 3 Pro gimbal is currently in our repair queue and undergoing technician assessment. Our standard repair window is 10-15 business days.\n\nI'll flag this for a priority update and you'll hear from us within 24 hours.\n\nBest regards,\nDJI USA Customer Support",
        timestamp: "Today 8:52 AM",
      },
      {
        id: "msg-003-3",
        from: "customer",
        authorName: "David Hernandez",
        authorEmail: "d.hernandez@yahoo.com",
        content: "Thanks for the quick reply. I just need to know if there's a specific timeline since I have a shoot next week and was counting on having it back.",
        timestamp: "Today 9:10 AM",
      },
    ],
  },
  {
    id: "em-004",
    emailType: "non-user",
    threadMode: "production",
    customer: "Jennifer Liu",
    customerEmail: "jliu@protonmail.com",
    subject: "Return request — DJI FPV Combo, unopened",
    status: "new",
    priority: "normal",
    isRead: false,
    receivedAt: "Yesterday 4:38 PM",
    updatedAt: "Yesterday 4:38 PM",
    inboxSummary: "Unopened FPV Combo purchased 12 days ago, customer wants return for refund, order #DJI-86990",
    aiCard: {
      intent: "Return Request",
      sentiment: "neutral",
      confidence: 0.98,
      orderNumber: "#DJI-86990",
      orderStatus: "Delivered Apr 17, 2026",
      relatedPolicy: "DJI 15-day return policy for unopened items. Item is within return window (Day 12).",
      summary: "Unopened DJI FPV Combo, purchased 12 days ago (within 15-day window). Eligible for full return. Simple case.",
      summaryZh: "附属合作伙伴购买的 DJI FPV 套装（12天前，未开封），在15天退货窗口内，可全额退款，流程简单。",
      suggestedReply: `Hi Jennifer,

Great news — your order #DJI-86990 is within our **15-day return window** and you're fully eligible for a return.

Since the item is unopened, the return process is straightforward:

**Next Steps:**
1. I'll generate a **prepaid UPS return label** for you (valid 14 days)
2. Drop the package at any UPS location
3. Once received and verified at our warehouse, your **full refund of $1,299.00** will be processed within **5-7 business days** to your original payment method

The return label will be emailed to jliu@protonmail.com within the next few minutes.

Is there anything else I can help you with today?

Best regards,
DJI USA Customer Support`,
      suggestedReplyZh: `你好 Jennifer，

好消息——您的订单 #DJI-86990 在我们的 **15天退货窗口内**，完全符合退货条件。

由于商品未开封，退货流程十分简便：

**操作步骤：**
1. 我将为您生成**预付费 UPS 退货标签**（有效期14天）
2. 在任意 UPS 网点投递包裹
3. 我们仓库收货并核验后，**$1,299.00 全额退款**将在 **5-7个工作日** 内退回至您的原支付方式

退货标签将在几分钟内发送至 jliu@protonmail.com。

还有其他需要帮助的吗？

此致，
DJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-004-1",
        from: "customer",
        authorName: "Jennifer Liu",
        authorEmail: "jliu@protonmail.com",
        content: "Hello,\n\nI purchased the DJI FPV Combo (order #DJI-86990) 12 days ago but haven't opened it yet. I've decided I don't need it and would like to return it for a full refund.\n\nHow do I proceed?\n\nJennifer",
        contentZh: "您好，\n\n我12天前购买了 DJI FPV 套装（订单号 #DJI-86990），但还没有拆开。我决定不需要了，希望申请全额退款。\n\n请问如何操作？\n\nJennifer",
        timestamp: "Yesterday 4:38 PM",
      },
    ],
  },
  {
    id: "em-005",
    emailType: "non-user",
    threadMode: "production",
    customer: "Robert Kim",
    customerEmail: "rkim@gmail.com",
    subject: "Avata 2 max wind resistance specs?",
    status: "solved",
    priority: "normal",
    isRead: true,
    receivedAt: "Yesterday 2:11 PM",
    updatedAt: "Yesterday 2:18 PM",
    inboxSummary: "Pre-sale question about Avata 2 wind resistance and flight performance in windy conditions",
    aiCard: {
      intent: "Product Inquiry",
      sentiment: "positive",
      confidence: 0.99,
      relatedPolicy: "Product specs sourced from official DJI product page",
      summary: "Pre-sale question about Avata 2 wind resistance. Answered with official specs — max wind speed resistance Level 5 (10.7 m/s). Solved.",
      summaryZh: "KOL询问 Avata 2 抗风等级规格，已用官方参数解答——最大抗风5级（10.7 m/s）。已解决。",
      suggestedReply: `Hi Robert,

Great question! Here are the official wind resistance specs for the **DJI Avata 2**:

| Spec | Value |
|------|-------|
| Max Wind Speed Resistance | Level 5 (10.7 m/s / 24 mph) |
| Max Speed (Sport Mode) | 27 m/s (60 mph) |
| Hovering Accuracy (vert.) | ±0.1 m (with vision) |

**In practice:** The Avata 2 handles casual recreational flying in Level 5 winds well, but for FPV cinematic work, most pilots prefer winds under Level 3 (5.4 m/s) for stable footage.

If you're frequently flying in gustier conditions, the **DJI FPV Combo** with its higher power-to-weight ratio may be worth considering.

Is there anything else you'd like to know before deciding?

Best,
DJI USA Customer Support`,
      suggestedReplyZh: `你好 Robert，

关于 **DJI Avata 2** 的官方抗风等级规格如下：

| 规格 | 数值 |
|------|-------|
| 最大抗风等级 | 5级（10.7 m/s / 24 mph）|
| 最大飞行速度（运动模式）| 27 m/s（60 mph）|
| 悬停精度（垂直）| ±0.1 m（视觉定位）|

**实际使用：** Avata 2 在5级风中休闲飞行表现良好，但若用于FPV电影拍摄，大多数飞手建议在3级风以下（5.4 m/s）以获得稳定画面。

如果您经常在较大风力环境中飞行，**DJI FPV Combo** 凭借其更高的推重比可能更适合您。

还有什么需要了解的，欢迎继续提问！

此致，
DJI USA 客户支持`,
    },
    messages: [
      {
        id: "msg-005-1",
        from: "customer",
        authorName: "Robert Kim",
        authorEmail: "rkim@gmail.com",
        content: "Hi,\n\nI'm considering buying the DJI Avata 2. What is the maximum wind resistance? I live in a coastal area and it can get quite windy.\n\nThanks",
        timestamp: "Yesterday 2:11 PM",
      },
      {
        id: "msg-005-2",
        from: "agent",
        authorName: "DJI USA Support",
        authorEmail: "service@djiusa.com",
        content: "Hi Robert,\n\nThe DJI Avata 2 has a maximum wind speed resistance of Level 5 (10.7 m/s / 24 mph). For coastal flying, this should handle typical sea breezes well, though calmer conditions will give you the best footage quality.\n\nLet me know if you have any other questions!\n\nBest,\nDJI USA Customer Support",
        timestamp: "Yesterday 2:18 PM",
      },
    ],
  },
  {
    id: "em-006",
    emailType: "user",
    threadMode: "production",
    customer: "Amanda Torres",
    customerEmail: "amandatorres@icloud.com",
    subject: "Very disappointed — wrong item sent",
    status: "new",
    priority: "urgent",
    isRead: false,
    receivedAt: "Today 11:05 AM",
    updatedAt: "Today 11:05 AM",
    inboxSummary: "Customer received DJI RC 2 controller instead of Mini 4 Pro — very frustrated, second contact",
    aiCard: {
      intent: "Complaint",
      sentiment: "frustrated",
      confidence: 0.89,
      orderNumber: "#DJI-88891",
      orderStatus: "Delivered Apr 27, 2026",
      relatedPolicy: "Wrong item policy: expedited replacement + prepaid return label within 24h. Escalation recommended for frustrated sentiment.",
      summary: "Customer ordered Mini 4 Pro but received RC 2 controller. Frustrated tone, second contact. High priority — recommend human review before sending.",
      summaryZh: "客户订购 Mini 4 Pro，但收到 RC 2 遥控器。语气激动，二次联系。高优先级——建议人工审核后再回复。",
      suggestedReply: `Dear Amanda,

I sincerely apologize for this error — receiving the wrong item is completely unacceptable, and I understand how frustrating this must be.

I've reviewed your order **#DJI-88891** and can confirm this is a fulfillment error on our end.

**Here's what we'll do immediately:**
1. ✅ **Expedited replacement** — Your DJI Mini 4 Pro Fly More Combo will be re-shipped via **UPS 2-Day** at no charge. You'll receive a tracking number within 24 hours.
2. ✅ **Prepaid return label** — A UPS label will be emailed to you for the incorrect item (RC 2 controller). Please return it within 14 days — no rush.
3. ✅ **$50 store credit** — As an apology for the inconvenience, we're adding $50 to your DJI account.

You don't need to do anything today. I'll process the replacement shipment now.

Again, I'm truly sorry for this experience. Is there anything else I can do for you?

Warmly,
DJI USA Customer Support`,
      suggestedReplyZh: `亲爱的 Amanda，

对于此次失误，我深感抱歉——收到错误商品完全不可接受，我理解您的沮丧心情。

我已核实您的订单 **#DJI-88891**，确认这是我方的履单错误。

**我们将立即采取以下措施：**
1. ✅ **加急补发** — 您的 DJI Mini 4 Pro 畅飞套装将通过 **UPS 两日达** 免费重新发货，您将在24小时内收到快递单号。
2. ✅ **预付退货标签** — 错误商品（RC 2 遥控器）的 UPS 退货标签将发送至您的邮箱，请在14天内寄回，不用着急。
3. ✅ **$50 商城积分** — 为表歉意，我们将向您的 DJI 账户补偿 $50 积分。

您今天无需做任何操作，我将立即为您处理补发事宜。

再次为此次不愉快的体验深表歉意，请问还有什么我可以为您做的？

真诚地，
DJI USA 客户支持`,
    },
    messages: [
      {
        id: "msg-006-1",
        from: "customer",
        authorName: "Amanda Torres",
        authorEmail: "amandatorres@icloud.com",
        content: "Hi,\n\nI emailed yesterday and got no response, so trying again. I ordered the DJI Mini 4 Pro Fly More Combo (order #DJI-88891) and received a DJI RC 2 controller instead. I don't even own a compatible drone for this!\n\nThis is very disappointing. I've been a DJI customer for years and this is not the level of service I expect. Please resolve this ASAP.\n\nAmanda Torres",
        contentZh: "您好，\n\n我昨天已发邮件但没有收到回复，所以再次联系。我订购了 DJI Mini 4 Pro Fly More 套装（订单号 #DJI-88891），但收到的却是 DJI RC 2 遥控器。我甚至没有兼容的无人机！\n\n这非常令人失望。我是 DJI 多年的老客户，没想到会有这样的服务体验。请尽快解决。\n\nAmanda Torres",
        timestamp: "Today 11:05 AM",
      },
    ],
  },
  {
    id: "em-007",
    emailType: "non-user",
    threadMode: "production",
    customer: "TechHub B2B",
    customerEmail: "purchasing@techhub.com",
    subject: "Q2 bulk pricing request — DJI enterprise drones",
    status: "open",
    priority: "normal",
    isRead: false,
    receivedAt: "Today 9:00 AM",
    updatedAt: "Today 9:00 AM",
    inboxSummary: "Corporate reseller requesting bulk pricing for 20+ DJI Mavic 3 Enterprise units, Q2 procurement",
    aiCard: {
      intent: "Product Inquiry",
      sentiment: "neutral",
      confidence: 0.88,
      relatedPolicy: "B2B / reseller pricing requires handoff to enterprise sales team. AI should not quote prices.",
      summary: "B2B reseller (TechHub) requesting bulk pricing for 20+ Mavic 3 Enterprise drones for Q2 procurement. Needs forwarding to enterprise sales team — AI cannot quote bulk prices.",
      summaryZh: "企业经销商 TechHub 询价，需要20台以上 Mavic 3 Enterprise 的Q2批量采购报价。需转交企业销售团队，AI不应直接报价。",
      suggestedReply: `Hi TechHub Purchasing Team,

Thank you for reaching out about a bulk order — we'd love to work with you on this!

For enterprise and reseller pricing on 20+ units of the DJI Mavic 3 Enterprise, I'll need to connect you with our dedicated **Enterprise Sales Team** who can provide:

- Volume pricing tiers
- Customized bundle options
- Priority support SLA
- Q2 procurement timelines

Our enterprise sales rep will follow up within **1 business day** to schedule a call and provide a formal quote.

In the meantime, you can find product specs at enterprise.dji.com.

Best regards,
DJI USA Customer Support`,
      suggestedReplyZh: `你好，TechHub 采购团队，

感谢您联系我们洽谈批量采购事宜！

针对20台以上 DJI Mavic 3 Enterprise 的企业/经销商定价，我将为您对接专属**企业销售团队**，他们可提供：

- 批量价格阶梯
- 定制化套餐方案
- 优先支持服务协议
- Q2采购时间规划

我们的企业销售代表将在**1个工作日内**跟进，安排通话并提供正式报价。

产品详细规格请访问 enterprise.dji.com。

此致，
DJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-007-1",
        from: "customer",
        authorName: "TechHub Purchasing",
        authorEmail: "purchasing@techhub.com",
        content: "Hello DJI Team,\n\nWe are a certified technology reseller and are looking to place a Q2 bulk order for approximately 20-25 units of the DJI Mavic 3 Enterprise.\n\nCould you please provide:\n1. Volume pricing for 20+ units\n2. Lead time for Q2 delivery\n3. Available enterprise support packages\n\nWe are looking to finalize procurement by end of May 2026.\n\nBest regards,\nTechHub Purchasing Team",
        contentZh: "您好，DJI 团队，\n\n我们是认证科技经销商，计划在Q2批量采购约20-25台 DJI Mavic 3 Enterprise。\n\n请提供以下信息：\n1. 20台以上的批量价格\n2. Q2交货周期\n3. 可选的企业支持套餐\n\n我们计划在2026年5月底前完成采购。\n\n此致，\nTechHub 采购团队",
        timestamp: "Today 9:00 AM",
      },
    ],
  },
  {
    id: "em-008",
    emailType: "non-user",
    customer: "Alex Chen",
    customerEmail: "alex@flywithalex.com",
    subject: "Review collab request — DJI Mini 4 Pro (500K YT subscribers)",
    status: "open",
    priority: "high",
    isRead: false,
    receivedAt: "Today 7:30 AM",
    updatedAt: "Today 7:30 AM",
    inboxSummary: "YouTube creator with 500K subs requesting review unit of Mini 4 Pro, offering dedicated review video + social coverage",
    aiCard: {
      intent: "Other",
      sentiment: "positive",
      confidence: 0.82,
      relatedPolicy: "KOL / influencer collaboration requests should be routed to the marketing team, not handled by support.",
      summary: "YouTube drone creator (500K subscribers) requesting a Mini 4 Pro review unit. Positive intent, high potential reach. Needs routing to marketing/PR team — not a standard support case.",
      summaryZh: "YouTube 无人机创作者（50万订阅）申请 Mini 4 Pro 评测机，提供专属评测视频及社媒曝光。积极意向，覆盖面广。需转交市场/公关团队，非常规客服案件。",
      suggestedReply: `Hi Alex,

Thank you for reaching out — we've seen your channel and love your content!

Collaboration requests like yours are handled by our **Marketing & PR team**, not through general customer support. I'm forwarding your request to the right team today.

Here's what to expect:
- Our PR team will review your media kit
- They'll follow up within **3-5 business days**
- If approved, they'll arrange product loan details directly with you

To speed things up, feel free to send your media kit (channel stats, engagement rate, previous brand collabs) to **pr@djiusa.com** with the subject line "Creator Collaboration — [Your Channel Name]".

Looking forward to potentially working together!

Best,
DJI USA Customer Support`,
      suggestedReplyZh: `你好 Alex，

感谢您的联系——我们看过您的频道，非常喜欢您的内容！

KOL合作申请由我们的**市场与公关团队**负责，而非普通客服渠道。我今天会将您的请求转达给相关团队。

后续流程：
- 公关团队将审核您的媒体资料
- **3-5个工作日内**回复
- 审核通过后，将直接与您沟通产品借用详情

为加快进程，您也可以将您的媒体资料包（频道数据、互动率、过往品牌合作等）发送至 **pr@djiusa.com**，邮件主题注明「创作者合作——[您的频道名称]」。

期待与您合作！

此致，
DJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-008-1",
        from: "customer",
        authorName: "Alex Chen",
        authorEmail: "alex@flywithalex.com",
        content: "Hi DJI Team,\n\nMy name is Alex Chen and I run 'Fly With Alex' on YouTube (500K subscribers, 8M+ monthly views). I focus exclusively on drone content — reviews, tutorials, and cinematic shots.\n\nI'd love to collaborate on a dedicated review video for the DJI Mini 4 Pro. I can offer:\n- 15-20 min dedicated review video\n- Instagram Reel (450K followers)\n- TikTok feature (280K followers)\n\nWould you be able to provide a review unit? I'm happy to share my full media kit.\n\nBest,\nAlex",
        contentZh: "你好，DJI 团队，\n\n我是 Alex Chen，在 YouTube 上运营「Fly With Alex」频道（50万订阅，月均800万次观看）。我专注于无人机内容——评测、教程和电影级航拍。\n\n我希望合作制作一期 DJI Mini 4 Pro 专属评测视频。我可以提供：\n- 15-20分钟专属评测视频\n- Instagram Reel（45万粉丝）\n- TikTok 推荐（28万粉丝）\n\n请问可以提供一台评测机吗？我很乐意分享完整的媒体资料包。\n\n此致，\nAlex",
        timestamp: "Today 7:30 AM",
      },
    ],
  },
  // em-009: second ticket from Michael Zhang (same sender grouping demo)
  {
    id: "em-009",
    emailType: "user",
    threadMode: "production",
    customer: "Michael Zhang",
    customerEmail: "michael.zhang@gmail.com",
    subject: "Mavic 3 Pro — ND filter set compatibility question",
    status: "solved",
    priority: "normal",
    isRead: true,
    receivedAt: "Yesterday 3:15 PM",
    updatedAt: "Yesterday 4:02 PM",
    inboxSummary: "Customer asking which ND filter set is compatible with Mavic 3 Pro Combo",
    aiCard: {
      intent: "Product Info",
      sentiment: "neutral",
      confidence: 0.95,
      orderNumber: "#DJI-88412",
      orderStatus: "Delivered",
      summary: "Customer asking about ND filter compatibility for their Mavic 3 Pro. Resolved — recommended the DJI ND Filter Set (ND64/128/256/512) specifically designed for Mavic 3 series.",
      summaryZh: "客户咨询 Mavic 3 Pro 适配的 ND 滤镜套装。已解决——推荐专为 Mavic 3 系列设计的 DJI ND 滤镜套装（ND64/128/256/512）。",
      suggestedReply: `Hi Michael,\n\nGreat question! The compatible ND filter set for the Mavic 3 Pro is the **DJI ND Filter Set (ND64/128/256/512) for Mavic 3 Series** (SKU: CP.MA.00000488.01).\n\nBest regards,\nDJI USA Customer Support`,
      suggestedReplyZh: `你好 Michael，\n\n很好的问题！Mavic 3 Pro 适配的 ND 滤镜套装是 **DJI ND 滤镜套装（ND64/128/256/512）Mavic 3 系列专用**（SKU: CP.MA.00000488.01）。\n\n此致，\nDJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-009-1",
        from: "customer",
        authorName: "Michael Zhang",
        authorEmail: "michael.zhang@gmail.com",
        content: "Hi,\n\nQuick question — which ND filter set works with the Mavic 3 Pro Combo? I see a few options on the website and want to make sure I get the right one.\n\nThanks,\nMichael",
        contentZh: "您好，\n\n请问哪款 ND 滤镜套装与 Mavic 3 Pro 套装兼容？网站上有几个选项，想确认一下买哪个。\n\n谢谢，\nMichael",
        timestamp: "Yesterday 3:15 PM",
      },
      {
        id: "msg-009-2",
        from: "agent",
        authorName: "Sarah Chen",
        authorEmail: "service@djiusa.com",
        content: "Hi Michael,\n\nThe compatible filter is the DJI ND Filter Set (ND64/128/256/512) for Mavic 3 Series. You can find it directly at store.dji.com.\n\nLet us know if you have any other questions!\n\nBest,\nDJI USA Customer Support",
        timestamp: "Yesterday 4:02 PM",
      },
    ],
  },
  // em-010: second ticket from Sarah Okonkwo (same sender grouping demo)
  {
    id: "em-010",
    emailType: "user",
    threadMode: "production",
    customer: "Sarah Okonkwo",
    customerEmail: "s.okonkwo@outlook.com",
    subject: "Follow-up: Mini 4 Pro repair status update",
    status: "pending",
    priority: "normal",
    isRead: false,
    receivedAt: "Today 8:10 AM",
    updatedAt: "Today 8:10 AM",
    inboxSummary: "Customer following up on repair case after warranty claim was escalated last week",
    aiCard: {
      intent: "Repair Status",
      sentiment: "neutral",
      confidence: 0.91,
      orderNumber: "#DJI-87203",
      orderStatus: "Under Review",
      summary: "Customer following up on the Mini 4 Pro repair/replacement case submitted last week. Escalation is still under warranty review. Customer wants a status update and estimated timeline.",
      summaryZh: "客户跟进上周提交的 Mini 4 Pro 维修/换货案件。质保审核仍在进行中。客户希望了解最新进展和预计时间。",
      suggestedReply: `Hi Sarah,\n\nThank you for following up. Your case (#DJI-87203) is currently under review by our warranty specialist team. You can expect an update within 2-3 business days.\n\nBest regards,\nDJI USA Customer Support`,
      suggestedReplyZh: `你好 Sarah，\n\n感谢您的跟进。您的案件（#DJI-87203）目前正在由我们的质保专家团队审核中，预计2-3个工作日内会有最新进展。\n\n此致，\nDJI美国客服团队`,
    },
    messages: [
      {
        id: "msg-010-1",
        from: "customer",
        authorName: "Sarah Okonkwo",
        authorEmail: "s.okonkwo@outlook.com",
        content: "Hi,\n\nI submitted a warranty claim for my Mini 4 Pro last week (case #DJI-87203) and haven't heard back yet. Can you give me an update on the status?\n\nThank you,\nSarah",
        contentZh: "您好，\n\n我上周提交了 Mini 4 Pro 的质保申请（案件 #DJI-87203），目前还没有收到回复。能告知一下进展吗？\n\n谢谢，\nSarah",
        timestamp: "Today 8:10 AM",
      },
    ],
  },
];

// ============================================================
// ONBOARDING STEPS
// ============================================================
export const onboardingSteps: OnboardingStep[] = [
  // Step 1: Welcome
  {
    id: 1, type: "message", sender: "team-lead",
    text: "Hi, I'm Alex — your AI team lead.\n\nI'll help you set up your first AI support rep. Here's what we'll do:\n\n1. Connect your tools (Shopify & Zendesk)\n2. Upload your support docs so I can learn your policies\n3. Configure your Rep's identity and permissions\n4. Run a quick sanity check\n5. Choose how you want your Rep to work\n\nLet's get started.",
    actions: [{ label: "Let's go", nextStep: 2 }],
  },
  // Step 2: Shopify check
  {
    id: 2, type: "message", sender: "team-lead",
    text: "✅ Shopify is connected — alexsong.myshopify.com\n\nYour AI Rep can look up orders, shipping status, and customer info.",
    actions: [{ label: "Continue", nextStep: 3 }],
  },
  // Step 3: Zendesk connect
  {
    id: 3, type: "message", sender: "team-lead",
    text: "To let your Rep read and respond to tickets, we need to set up Zendesk AI Support Access. This is a 3-step process you'll complete in the Integrations page.\n\nTicket routing — including which channels (email, chat, web form) and which ticket types are assigned to your AI Rep — is configured through Zendesk Triggers. This keeps all routing logic in one place and avoids conflicts between Zendesk and Seel settings.",
    actions: [
      { label: "Open Integrations →", nextStep: 4, variant: "primary" },
      { label: "Skip for now", nextStep: 4, variant: "ghost" },
    ],
  },
  // Step 4: Upload SOP
  {
    id: 4, type: "message", sender: "team-lead",
    text: "Now let's teach your Rep. Upload your customer service SOP documents — I'll extract rules and knowledge from them.",
    actions: [
      { label: "Upload files", nextStep: 5, variant: "primary" },
      { label: "Try with a sample document", nextStep: 5, variant: "outline" },
      { label: "Skip — I'll teach my Rep through conversation later", nextStep: 6, variant: "ghost" },
    ],
  },
  // Step 5: Parse results
  {
    id: 5, type: "message", sender: "team-lead",
    text: "Done! I extracted 8 rules from your documents. Document content has been loaded into the knowledge base.\n\n1. WISMO — Order Tracking\n2. Refund — Standard Process\n3. Cancellation — Unfulfilled Orders\n4. Address Change — Pre-Dispatch\n5. VIP Customer Handling\n\n+3 more rules\n\nReview all in Playbook →",
    actions: [{ label: "Continue", nextStep: 6 }],
  },
  // Step 6: Hire Rep
  {
    id: 6, type: "message", sender: "team-lead",
    text: "Your playbook is ready. Let's hire your first AI support rep.",
    actions: [{ label: "Hire Rep", nextStep: 7, variant: "primary" }],
  },
  // Step 7: Readiness Check (Rep area)
  {
    id: 7, type: "message", sender: "rep",
    text: "Hi! I'm Ava, your new AI support rep.\n\nBefore I start handling real tickets, let me show you how I'd handle a few scenarios. I'll walk you through 3 tests one at a time — tell me if each response looks right.",
    actions: [{ label: "Start test", nextStep: 8 }],
  },
  // Step 8: Scenario 1 — WISMO
  {
    id: 8, type: "scenario", sender: "rep",
    text: "**Scenario 1 — \"Where is my order?\"**\n\nCustomer writes: *\"Where is my order #DBH-29174? It's been a week and I haven't received anything.\"*\n\nHere's what I'd do:\n1. Look up #DBH-29174 in Shopify\n2. I see it's **shipped** via USPS Priority, tracking 9400111899223456789012, expected Mar 25\n3. I'd reply:\n\n> *Hi Emma! Your order #DBH-29174 shipped via USPS Priority (tracking: 9400111899223456789012) and is expected to arrive by March 25th. You can track it here: [link]. Let me know if you need anything else!*\n\nThis is read-only — I'm just looking up info and replying. Does this look right?",
    options: [
      { label: "Looks good", value: "approve", nextStep: 9 },
      { label: "Needs adjustment", value: "adjust", nextStep: 9 },
    ],
  },
  // Step 9: Scenario 2 — Cancellation
  {
    id: 9, type: "scenario", sender: "rep",
    text: "**Scenario 2 — Cancellation + refund**\n\nCustomer writes: *\"I ordered a jacket (#DBH-29210, $74.50) but I changed my mind. Can you cancel it?\"*\n\nHere's what I'd do:\n1. Look up #DBH-29210 in Shopify — it's still **Processing**, hasn't shipped\n2. Your cancellation policy says unfulfilled orders get a full refund\n3. I'd **cancel the order** in Shopify\n4. I'd **issue a $74.50 refund** to the original payment method\n5. I'd reply confirming the cancellation and refund\n\nThis is a write action — I'm actually cancelling and refunding. Is this how you'd want me to handle it?",
    options: [
      { label: "Exactly right", value: "approve", nextStep: 10 },
      { label: "Needs adjustment", value: "adjust", nextStep: 10 },
    ],
  },
  // Step 10: Scenario 3 — Escalation
  {
    id: 10, type: "scenario", sender: "rep",
    text: "**Scenario 3 — Escalation**\n\nCustomer writes: *\"I received a completely wrong item and I'm furious! This is unacceptable!\"*\n\nHere's what I'd do:\n1. Detect sentiment: **Frustrated/Angry**\n2. This triggers my escalation rule — angry sentiment + item mismatch\n3. I'd **escalate to human agent** with an Internal Note containing:\n   - Handoff summary\n   - Customer sentiment analysis\n   - Suggested reply draft\n4. I'd send an empathetic response acknowledging the issue\n\nDoes this escalation approach look right?",
    options: [
      { label: "Looks good", value: "approve", nextStep: 11 },
      { label: "Needs adjustment", value: "adjust", nextStep: 11 },
    ],
  },
  // Step 11: Mode selection (back to Team Lead)
  {
    id: 11, type: "mode-select", sender: "team-lead",
    text: "All scenarios reviewed! Your Rep is ready.\n\nOne last thing — how do you want Ava to work?",
    options: [
      { label: "Training — review before sending", value: "training", nextStep: 12 },
      { label: "Production — reply directly", value: "production", nextStep: 12 },
    ],
  },
  // Step 12: Complete
  {
    id: 12, type: "message", sender: "rep",
    text: "I'm now live in Training mode. Here's how our team works:\n\n**Come to me (Rep) when you want to:**\n• Check on tickets I've escalated to you\n• View or change my settings (click Profile)\n\n**Talk to Team Lead when you want to:**\n• Tell them about policy changes — they'll update my rules\n• Review their improvement suggestions\n• Upload new SOP documents\n\nIn Zendesk, look for my Internal Notes on tickets:\n• When I handle a ticket, I leave an Internal Note with my reasoning\n• When I escalate, the Internal Note includes my handoff summary and a suggested reply you can use",
  },
  // Step 13: Final Team Lead message
  {
    id: 13, type: "message", sender: "team-lead",
    text: "Setup is complete! Ava is ready to work. 🎉\n\nYou can find me here in the Communication tab anytime you need to chat.",
  },
];

// ============================================================
// DAILY DIGEST
// ============================================================
export const dailyDigest = {
  date: "Mar 30, 2026",
  totalTickets: 24,
  deltaTickets: "+8%",
  resolutionRate: "79%",
  deltaResolution: "+2%",
  csatScore: "4.5/5",
  deltaCsat: "+0.1",
  avgResponseTime: "38s",
  deltaRt: "-4s",
  sentimentChangedRate: "6%",
  deltaSentiment: "-1%",
  fullResolutionTime: "11m 40s",
  deltaFrt: "-1m 20s",
  escalationRate: "58%",
  deltaEscalation: "-2%",
  updateCount: 3,
};

// ============================================================
// TOPIC PROPOSALS
// ============================================================
export const topics: Topic[] = [
  {
    id: "topic-1",
    type: "proposal",
    badge: "NEW RULE",
    title: "International Returns — Customs Duty Refund",
    summary: "18 tickets about international customs duties were escalated this week. Customers are confused about whether customs duties are refundable. Recommend adding a rule to handle this automatically.",
    ruleContent: "When a customer asks about customs duty refund for international returns:\n1. Inform customer that customs duties are non-refundable by the retailer\n2. Advise customer to contact their local customs office for duty reclaim\n3. Process the product refund as normal\n4. If customer insists on full refund including duties, escalate to L2",
    sourceTickets: ["TK-4891", "TK-4892", "TK-4893"],
    sourceDocId: "doc-3",
    status: "pending",
  },

  {
    id: "topic-3",
    type: "proposal",
    badge: "RULE UPDATE",
    title: "Extend return window for VIP customers",
    summary: "VIP customers have a 15% higher return rate but 40% higher LTV. Extending their return window from 30 to 45 days could improve satisfaction without significant cost impact.",
    ruleContent: "Update VIP Customer Handling rule:\n- Extend return window from 30 days to 45 days for VIP customers\n- Apply to customers tagged VIP, or with 5+ orders, or LTV > $500",
    currentRuleContent: "For customers tagged as VIP (or 5+ orders, or LTV > $500):\n1. Always prioritize their tickets\n2. Skip store credit offer — process direct refund\n3. Use empathetic, personalized tone\n4. If complaint: escalate immediately to L2\n5. Proactively offer compensation (discount code) for any inconvenience",
    newRuleContent: "For customers tagged as VIP (or 5+ orders, or LTV > $500):\n1. Always prioritize their tickets\n2. Extend return window from 30 days to 45 days\n3. Skip store credit offer — process direct refund\n4. Use empathetic, personalized tone\n5. If complaint: escalate immediately to L2\n6. Proactively offer compensation (discount code) for any inconvenience",
    sourceTickets: ["TK-4891"],
    status: "pending",
  },
];

// ============================================================
// SALES AGENT DATA
// ============================================================

export interface SalesOrder {
  id: string;
  customer: string;
  email: string;
  items: { name: string; qty: number; price: string }[];
  recommendedItem: string;   // name of the attributed/recommended product
  total: string;
  date: string;
  status: "fulfilled" | "pending" | "refunded";
  touchpoint: string;
  channel: string;
}

export interface SalesTouchpointRow {
  touchpoint: string;
  attributedSales: number;
  salesDelta: number;
  ordersInfluenced: number;
  ctr: number;
  aov: number;        // Avg. Item Value — attributed product only
  actualAov: number;  // Avg. Order Value — full basket
  clicks: number;
  impressions: number;
  orders: SalesOrder[];
}

export interface SalesDailyPoint {
  date: string;
  total: number;
  resolutionCenter: number;
  wfpEmail: number;
  supportAgent: number;
  searchBar: number;
}

function makeSalesDaily(): SalesDailyPoint[] {
  const seed = [1240, 1380, 1290, 1450, 1520, 1410, 1330, 1480, 1390, 1550,
                1310, 1420, 1360, 1500, 1590, 1460, 1380, 1610, 1530, 1440,
                1370, 1490, 1560, 1420, 1480, 1640, 1510, 1380, 1450, 1320];
  return seed.map((total, i) => {
    const d = new Date("2026-04-08");
    d.setDate(d.getDate() + i);
    return {
      date: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      total,
      resolutionCenter: Math.round(total * 0.27),
      wfpEmail: Math.round(total * 0.26),
      supportAgent: Math.round(total * 0.24),
      searchBar: Math.round(total * 0.23),
    };
  });
}
export const salesDaily: SalesDailyPoint[] = makeSalesDaily();

const sampleOrders: Record<string, SalesOrder[]> = {
  "Seel Resolution Center": [
    { id: "ORD-10421", customer: "Emma Wilson", email: "emma@example.com", items: [{ name: "Wireless Earbuds Pro", qty: 1, price: "$79.99" }, { name: "Phone Case", qty: 2, price: "$12.99" }], recommendedItem: "Wireless Earbuds Pro", total: "$105.97", date: "May 3, 2026", status: "fulfilled", touchpoint: "Seel Resolution Center", channel: "Web" },
    { id: "ORD-10398", customer: "James Chen", email: "jchen@example.com", items: [{ name: "Smart Watch Band", qty: 1, price: "$34.99" }], recommendedItem: "Smart Watch Band", total: "$34.99", date: "May 2, 2026", status: "fulfilled", touchpoint: "Seel Resolution Center", channel: "Web" },
    { id: "ORD-10375", customer: "Sofia Rodriguez", email: "sofia.r@example.com", items: [{ name: "Portable Charger", qty: 1, price: "$49.99" }, { name: "USB-C Cable", qty: 3, price: "$9.99" }], recommendedItem: "Portable Charger", total: "$79.96", date: "May 1, 2026", status: "pending", touchpoint: "Seel Resolution Center", channel: "Mobile" },
  ],
  "WFP Policy Email": [
    { id: "ORD-10440", customer: "Liam Park", email: "liam.p@example.com", items: [{ name: "Laptop Stand", qty: 1, price: "$59.99" }], recommendedItem: "Laptop Stand", total: "$59.99", date: "May 4, 2026", status: "fulfilled", touchpoint: "WFP Policy Email", channel: "Email" },
    { id: "ORD-10412", customer: "Ava Thompson", email: "ava.t@example.com", items: [{ name: "Keyboard Cover", qty: 2, price: "$19.99" }, { name: "Mouse Pad XL", qty: 1, price: "$24.99" }], recommendedItem: "Keyboard Cover", total: "$64.97", date: "May 2, 2026", status: "fulfilled", touchpoint: "WFP Policy Email", channel: "Email" },
  ],
  "Support Agent": [
    { id: "ORD-10455", customer: "Noah Kim", email: "noah.k@example.com", items: [{ name: "Gaming Headset", qty: 1, price: "$89.99" }], recommendedItem: "Gaming Headset", total: "$89.99", date: "May 5, 2026", status: "fulfilled", touchpoint: "Support Agent", channel: "Chat" },
    { id: "ORD-10431", customer: "Mia Johnson", email: "mia.j@example.com", items: [{ name: "Desk Organizer", qty: 1, price: "$29.99" }, { name: "Cable Management Kit", qty: 1, price: "$14.99" }], recommendedItem: "Desk Organizer", total: "$44.98", date: "May 3, 2026", status: "fulfilled", touchpoint: "Support Agent", channel: "Chat" },
    { id: "ORD-10388", customer: "Ethan Brown", email: "e.brown@example.com", items: [{ name: "Screen Protector 3-Pack", qty: 1, price: "$15.99" }], recommendedItem: "Screen Protector 3-Pack", total: "$15.99", date: "Apr 30, 2026", status: "refunded", touchpoint: "Support Agent", channel: "Chat" },
  ],
  "Search Bar": [
    { id: "ORD-10466", customer: "Olivia Davis", email: "o.davis@example.com", items: [{ name: "Bluetooth Speaker", qty: 1, price: "$69.99" }], recommendedItem: "Bluetooth Speaker", total: "$69.99", date: "May 6, 2026", status: "fulfilled", touchpoint: "Search Bar", channel: "Web" },
    { id: "ORD-10448", customer: "Lucas Martinez", email: "lucas.m@example.com", items: [{ name: "Ring Light Kit", qty: 1, price: "$79.99" }, { name: "Phone Tripod", qty: 1, price: "$24.99" }], recommendedItem: "Ring Light Kit", total: "$104.98", date: "May 4, 2026", status: "pending", touchpoint: "Search Bar", channel: "Mobile" },
  ],
};

export const salesTouchpoints: SalesTouchpointRow[] = [
  { touchpoint: "Seel Resolution Center", attributedSales: 11611.80, salesDelta: 24.1,  ordersInfluenced: 170, ctr: 4.3, aov: 68.30, actualAov: 106.45, clicks: 2118, impressions: 49368, orders: sampleOrders["Seel Resolution Center"] },
  { touchpoint: "WFP Policy Email",        attributedSales: 10870.50, salesDelta: 43.0,  ordersInfluenced: 157, ctr: 4.3, aov: 69.24, actualAov: 103.80, clicks: 1950, impressions: 44916, orders: sampleOrders["WFP Policy Email"] },
  { touchpoint: "Support Agent",           attributedSales: 10234.20, salesDelta: 70.2,  ordersInfluenced: 146, ctr: 4.4, aov: 70.10, actualAov: 108.20, clicks: 1782, impressions: 40464, orders: sampleOrders["Support Agent"] },
  { touchpoint: "Search Bar",              attributedSales:  9542.95, salesDelta: 103.7, ordersInfluenced: 134, ctr: 4.5, aov: 71.22, actualAov: 101.90, clicks: 1607, impressions: 35808, orders: sampleOrders["Search Bar"] },
];
