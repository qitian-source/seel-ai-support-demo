// Mock data & matching engine — Seel x Trustpilot Review Attribution (3-tier CSAT)

export interface IntentLog {
  id: string;
  merchantId: string;
  orderId: string;
  expectedUsername: string;
  email: string;
  timestamp: string;
  starsClicked: number; // 0 for neutral/dissatisfied (no TP invitation shown)
  csatResponse: "satisfied" | "neutral" | "dissatisfied";
}

export interface ScrapedReview {
  id: string;
  authorName: string;
  rating: number;
  date: string;
  text: string;
  reviewUrl: string;
}

export type MatchType = "exact" | "fuzzy" | "keyword" | "none";

export interface MatchResult {
  scrapedReview: ScrapedReview;
  intentLog: IntentLog | null;
  matchType: MatchType;
  confidence: number; // 0–100
  charged: boolean;
  amount: number;
}

// ─── Intent Logs ──────────────────────────────────────────────────────────────
// All sessions that went through the CSAT widget.
// Only "satisfied" clicks generate a Trustpilot invitation (and a potential charge).
// "neutral" and "dissatisfied" are diverted to private feedback — never touch TP.

export const intentLogs: IntentLog[] = [
  // ── Satisfied sessions (Profit Path) ──────────────────────────────────────
  {
    id: "IL001",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10234",
    expectedUsername: "Sarah Chen",
    email: "s.chen@email.com",
    timestamp: "2026-05-01T14:32:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL002",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10245",
    expectedUsername: "David Wang",
    email: "dwang@gmail.com",
    timestamp: "2026-05-02T09:15:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL003",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10267",
    expectedUsername: "Jennifer Martinez",
    email: "jmartinez@outlook.com",
    timestamp: "2026-05-02T16:48:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL004",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10289",
    expectedUsername: "Mike Thompson",
    email: "mthompson@yahoo.com",
    timestamp: "2026-05-03T11:22:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL005",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10301",
    expectedUsername: "Amy Liu",
    email: "amy.liu@email.com",
    timestamp: "2026-05-04T08:05:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL006",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10315",
    expectedUsername: "Robert Kim",
    email: "rkim@company.com",
    timestamp: "2026-05-04T19:30:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL007",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10329",
    expectedUsername: "Emma Davis",
    email: "emma.davis@gmail.com",
    timestamp: "2026-05-05T13:45:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },
  {
    id: "IL008",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10342",
    expectedUsername: "Carlos Rivera",
    email: "c.rivera@email.com",
    timestamp: "2026-05-06T17:20:00Z",
    starsClicked: 5,
    csatResponse: "satisfied",
  },

  // ── Neutral sessions (Improvement Path) ───────────────────────────────────
  // Diverted to private feedback — no TP invitation, no public review risk.
  {
    id: "IL009",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10358",
    expectedUsername: "Priya Patel",
    email: "p.patel@email.com",
    timestamp: "2026-05-03T10:14:00Z",
    starsClicked: 0,
    csatResponse: "neutral",
  },
  {
    id: "IL010",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10371",
    expectedUsername: "James Wilson",
    email: "jwilson@gmail.com",
    timestamp: "2026-05-04T14:22:00Z",
    starsClicked: 0,
    csatResponse: "neutral",
  },
  {
    id: "IL011",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10384",
    expectedUsername: "Sophie Nguyen",
    email: "s.nguyen@mail.com",
    timestamp: "2026-05-05T09:50:00Z",
    starsClicked: 0,
    csatResponse: "neutral",
  },

  // ── Dissatisfied sessions (Crisis Management Path) ─────────────────────────
  // Escalated to manager privately — strictly NO Trustpilot link shown.
  {
    id: "IL012",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10397",
    expectedUsername: "Marcus Johnson",
    email: "m.johnson@email.com",
    timestamp: "2026-05-04T16:05:00Z",
    starsClicked: 0,
    csatResponse: "dissatisfied",
  },
  {
    id: "IL013",
    merchantId: "SEEL_MERCHANT_001",
    orderId: "10412",
    expectedUsername: "Linda Park",
    email: "linda.park@outlook.com",
    timestamp: "2026-05-06T11:33:00Z",
    starsClicked: 0,
    csatResponse: "dissatisfied",
  },
];

// ─── Scraped Reviews ──────────────────────────────────────────────────────────
// Simulated daily scrape of the merchant's public Trustpilot profile (72h window).
// Only satisfied customers ever reach Trustpilot — neutral/dissatisfied are private.

export const scrapedReviews: ScrapedReview[] = [
  {
    id: "TP001",
    authorName: "Sarah Chen",
    rating: 5,
    date: "2026-05-01",
    text: "Amazing customer support! My replacement was handled super fast. Highly recommend Seel for any purchase protection. The agent resolved everything within minutes.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-001",
  },
  {
    id: "TP002",
    authorName: "D. Wang",
    rating: 5,
    date: "2026-05-02",
    text: "Great service, very responsive team. The claim process was smooth and effortless. Will definitely use again for future purchases.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-002",
  },
  {
    id: "TP003",
    authorName: "TechShopper99",
    rating: 5,
    date: "2026-05-03",
    text: "I had a minor issue with Order #10267 and the support team resolved it within hours. Five stars without question — exactly the kind of service every company should offer.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-003",
  },
  {
    id: "TP004",
    authorName: "Tom Bradley",
    rating: 5,
    date: "2026-05-03",
    text: "Found out about this protection service through a friend. Really good peace of mind when shopping online. Totally worth it.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-004",
  },
  {
    id: "TP005",
    authorName: "Amy L.",
    rating: 5,
    date: "2026-05-04",
    text: "Super fast resolution! The agent was professional and genuinely helpful. My package arrived in perfect condition after the claim was approved.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-005",
  },
  {
    id: "TP006",
    authorName: "Robert Kim",
    rating: 5,
    date: "2026-05-05",
    text: "Best customer service I have experienced online. The team went above and beyond to make sure my issue was resolved completely.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-006",
  },
  {
    id: "TP007",
    authorName: "E. Davis",
    rating: 5,
    date: "2026-05-05",
    text: "Seel made my shopping completely worry-free. Fast claim approval and excellent communication throughout the entire process.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-007",
  },
  {
    id: "TP008",
    authorName: "Happy Buyer",
    rating: 4,
    date: "2026-05-06",
    text: "Generally good service. Small delay in response but the issue was sorted in a satisfactory way. Would recommend for shipping protection.",
    reviewUrl: "https://www.trustpilot.com/reviews/mock-008",
  },
];

// ─── Matching Engine ──────────────────────────────────────────────────────────

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fuzzyNameMatch(
  scraped: string,
  expected: string
): { match: boolean; confidence: number } {
  const a = scraped.toLowerCase().trim();
  const b = expected.toLowerCase().trim();
  if (a === b) return { match: true, confidence: 100 };

  const aTokens = a.split(/\s+/).map(normalizeToken).filter(Boolean);
  const bTokens = b.split(/\s+/).map(normalizeToken).filter(Boolean);

  let matchScore = 0;
  let totalWeight = 0;

  for (const bt of bTokens) {
    totalWeight += 1;
    for (const at of aTokens) {
      if (at === bt) { matchScore += 1; break; }
      if (at.length === 1 && bt.startsWith(at)) { matchScore += 0.7; break; }
    }
  }

  const confidence = Math.min(99, Math.round((matchScore / Math.max(totalWeight, 1)) * 100));
  return { match: confidence >= 55, confidence };
}

function keywordMatch(text: string, orderId: string): boolean {
  const t = text.toLowerCase();
  return t.includes(`order #${orderId}`) || t.includes(`#${orderId}`) || t.includes(orderId);
}

// Only "satisfied" intent logs are eligible for matching — neutral/dissatisfied
// customers were never shown a Trustpilot invitation.
export function runMatchingEngine(): MatchResult[] {
  const satisfiedLogs = intentLogs.filter((l) => l.csatResponse === "satisfied");
  const results: MatchResult[] = [];
  const used = new Set<string>();

  for (const review of scrapedReviews) {
    let bestLog: IntentLog | null = null;
    let bestType: MatchType = "none";
    let bestConf = 0;

    for (const log of satisfiedLogs) {
      if (used.has(log.id)) continue;

      const na = review.authorName.toLowerCase().trim();
      const nb = log.expectedUsername.toLowerCase().trim();

      if (na === nb) {
        if (100 > bestConf) { bestLog = log; bestType = "exact"; bestConf = 100; }
        continue;
      }
      const { match, confidence } = fuzzyNameMatch(review.authorName, log.expectedUsername);
      if (match && confidence > bestConf) {
        bestLog = log; bestType = "fuzzy"; bestConf = confidence;
        continue;
      }
      if (keywordMatch(review.text, log.orderId) && bestConf < 90) {
        bestLog = log; bestType = "keyword"; bestConf = 90;
      }
    }

    if (bestLog) used.add(bestLog.id);
    const charged = bestType !== "none" && review.rating === 5;
    results.push({
      scrapedReview: review,
      intentLog: bestLog,
      matchType: bestType,
      confidence: bestConf,
      charged,
      amount: charged ? 5 : 0,
    });
  }
  return results;
}

// ─── Revenue-at-Risk helpers ──────────────────────────────────────────────────

// Value per diverted negative/neutral review (reputational damage estimate).
export const NEUTRAL_RISK_VALUE = 75;    // $75 per neutral → private
export const DISSATISFIED_RISK_VALUE = 180; // $180 per dissatisfied → private (higher escalation value)

export function getNeutralLogs() {
  return intentLogs.filter((l) => l.csatResponse === "neutral");
}

export function getDissatisfiedLogs() {
  return intentLogs.filter((l) => l.csatResponse === "dissatisfied");
}

export function getTotalRevenueAtRisk(): number {
  return (
    getNeutralLogs().length * NEUTRAL_RISK_VALUE +
    getDissatisfiedLogs().length * DISSATISFIED_RISK_VALUE
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LAST_SYNC = "2026-05-07T06:00:00Z";
export const NEXT_SYNC = "2026-05-08T06:00:00Z";
export const MERCHANT_NAME = "AlexSong Store";
export const DEMO_ORDER_ID = "10342";
export const DEMO_CUSTOMER_NAME = "Carlos Rivera";
