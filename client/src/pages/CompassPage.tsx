/*
 * CompassPage — Seel Compass (Go-Global Readiness)
 * Interactive rebuild against merchant dashboard design system.
 * Content aligned with Michael's 6/25 review: 5 categories, 24 Product items in 5 sub-groups,
 * hybrid category detection. Self-harm handling (per Michael 7/17): rules that would only
 * fire on Seel's own product model are scoped OUT of the corpus entirely — no runtime
 * suppression, no fingerprint/whitelist. Only two states exist: in-scope or out-of-scope.
 *
 * Interaction model (Scheme B — immediate UI cascade):
 * Setup category toggle → UI immediately re-scores + re-counts + re-classifies items,
 * with a "pending rescan" banner indicating changes will apply at next weekly scan.
 */
import { useState, useMemo, useEffect, createContext, useContext, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Check, AlertTriangle, MinusCircle, ChevronDown, Download, RefreshCw, X,
  Loader2, ArrowRight, ShieldCheck, Globe, Languages,
} from "lucide-react";

/* ── i18n (demo) — full-page EN / 中文 toggle, set from Setup.
   Legal citations (SourceRef labels + URLs) intentionally stay in their source
   language — a law's name is a proper noun, not something to translate. ── */
type Lang = "en" | "zh";
const LangCtx = createContext<Lang>("en");
function useLang() { return useContext(LangCtx); }
/** inline chrome translator: const t = useT(); t("English", "中文") */
function useT() {
  const lang = useLang();
  return (en: string, zh: string) => (lang === "zh" ? zh : en);
}

/* ── Types ── */
type SubTab = "overview" | "issues" | "history" | "setup";
type Market = "us" | "eu";
type State = "ok" | "warn" | "na" | "skip";
type IssueStatus = "open" | "acknowledged" | "in_remediation" | "resolved";
type ProductFilter = "all" | "review" | "verified" | "na";
type CategoryKey = "cosmetics" | "kids" | "alcohol" | "cbd" | "tobacco" | "firearms" | "supplements" | "pharma";

/* Source & proof layer.
   Sources come from the counsel-signed rule registry — never generated at scan time.
   Proof is the per-scan evidence: pages checked, timestamps, excerpts, observations. */
const CORPUS_VERSION = "v2026.06";

/* Interpretive basis (Michael 7/17): where the operative rule actually lives.
   A risk isn't always in the black-letter statute — it can develop in agency
   guidance or case law interpreting it. Kept in a central map (the demo's
   stand-in for the counsel-signed registry field), looked up by citation label. */
type Basis = "statute" | "regulation" | "guidance" | "case law";

interface SourceRef {
  label: string;   // e.g. "🇪🇺 GDPR — Art. 7(3)"
  url?: string;    // official primary text only (EUR-Lex, eCFR, ftc.gov, leginfo…)
  basis?: Basis;   // override; otherwise resolved from CITATION_BASIS by label
}

const CITATION_BASIS: Record<string, Basis> = {
  // Black-letter primary legislation
  "🇪🇺 GDPR — Art. 6": "statute",
  "🇪🇺 GDPR — Art. 7(3)": "statute",
  "🇪🇺 GDPR — Art. 7 consent conditions": "statute",
  "🇪🇺 GDPR — Art. 12(3)": "statute",
  "🇪🇺 GDPR — Art. 15–20": "statute",
  "🇪🇺 GDPR — Art. 5(1)(e) storage limitation": "statute",
  "🇪🇺 ePrivacy Directive 2002/58/EC — Art. 5(3)": "statute",
  "🇪🇺 EDPB Guidelines 2/2023 — Art. 5(3) technical scope": "guidance",
  "🇪🇺 Cosmetics Regulation (EC) 1223/2009 — Art. 4 & 19": "statute",
  "🇺🇸 CPRA — Cal. Civ. Code §1798.100–.121": "statute",
  "🇺🇸 CPRA — §1798.100(a)(3)": "statute",
  "🇺🇸 CPRA — §1798.121 “Right to Limit”": "statute",
  "🇺🇸 Other state frameworks — CO · CT · VA": "statute",
  "🇺🇸 CA Civ. Code §1723 — refund-policy disclosure": "statute",
  "🇺🇸 CPSIA — 15 U.S.C. §2056a": "statute",
  "🇺🇸 Magnuson-Moss Warranty Act — 15 U.S.C. ch. 50": "statute",
  "🇺🇸 FTC Guides for Warranties & Guarantees — 16 CFR Part 239": "guidance",
  "🇺🇸 Prop 65 — Cal. H&S Code §25249.6": "statute",
  // Administrative rules / mandatory standards
  "🇺🇸 OEHHA warning regs — 27 CCR §25600 et seq.": "regulation",
  "🇺🇸 ASTM F963 (mandatory by incorporation under CPSIA)": "regulation",
  // Agency interpretive guidance
  "🇺🇸 FTC Green Guides — 16 CFR Part 260": "guidance",
  "🇺🇸 FTC Endorsement Guides — 16 CFR Part 255": "guidance",
  "🇺🇸 FTC staff report — Bringing Dark Patterns to Light (2022)": "guidance",
  // tc1 is a descriptive check with no legal authority — intentionally NOT in this map (no basis tag).
  // Rule lives in enforcement / case law, not the bare statutory text (Michael's example)
  "🇺🇸 FTC Act §5 — 15 U.S.C. §45": "case law",
  // Note: pure data-source lookups (USPTO db, State SoS) carry no interpretive basis — intentionally absent.
};

interface Proof {
  pages?: string;        // what was checked / searched
  checkedAt?: string;    // scan timestamp
  excerpt?: string;      // verbatim capture from the merchant's page
  observation?: string;  // structured observation (incl. absence proof)
}

interface Ctrl {
  id: string;
  title: string;
  sub: string;
  state: State;                 // default state when applicable
  defaultOnState?: State;       // state when category dep is toggled ON (defaults to state)
  catKey?: CategoryKey;         // category dependency
  market?: Market;              // omit = both
  issueId?: string;             // same finding in the Review Items work queue (single entity, two projections)
  ev?: {
    rules?: string;
    sources?: SourceRef[];
    proof?: Proof;
    rec?: string;
  };
}

/* ── Static base data ── */
const CATEGORIES = [
  { key: "dp", emoji: "🔒", label: "Data & Privacy",       us: 92, eu: 81, status: null },
  { key: "tc", emoji: "📄", label: "Terms & Conditions",   us: 86, eu: 88, status: null },
  { key: "pr", emoji: "🛍️", label: "Product",              us: null, eu: null, status: null }, // computed dynamically
];

const DEFAULT_ACTIVE_CATEGORIES: CategoryKey[] = ["cosmetics", "kids"];

const CATEGORY_LABELS: Record<CategoryKey, { label: string; meta: string; catalogHint: string }> = {
  cosmetics:  { label: "Cosmetics / topicals",              meta: "detected · 12 SKUs", catalogHint: "Sunscreen SKUs detected in catalog." },
  kids:       { label: "Children's products / toys",        meta: "detected · 4 SKUs",  catalogHint: "Kids' outdoor gear detected in catalog." },
  alcohol:    { label: "Alcohol",                            meta: "not detected",       catalogHint: "" },
  cbd:        { label: "CBD / hemp / cannabinoids",          meta: "not detected",       catalogHint: "" },
  tobacco:    { label: "Tobacco / vape / nicotine",          meta: "not detected",       catalogHint: "" },
  firearms:   { label: "Firearms / weapons",                 meta: "not detected",       catalogHint: "" },
  supplements:{ label: "Supplements / nutraceuticals",       meta: "possible · 2 SKUs",  catalogHint: "2 SKUs reference collagen peptides — confirm if you sell ingestible supplements." },
  pharma:     { label: "Pharmaceuticals / medical devices",  meta: "not detected",       catalogHint: "" },
};

/* Data & Privacy checklist */
const DP_ITEMS: Ctrl[] = [
  {
    id: "dp1", title: "Access / correct / delete / portability rights stated",
    sub: "Found in Privacy Policy, §4 “Your Rights”.", state: "ok",
    ev: {
      rules: "CCPA/CPRA and GDPR frameworks commonly expect consumers to be told how to access, correct, delete, and port their data.",
      sources: [
        { label: "🇺🇸 CPRA — Cal. Civ. Code §1798.100–.121", url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5" },
        { label: "🇪🇺 GDPR — Art. 15–20", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" },
      ],
      proof: {
        pages: "yourstore.com/privacy · §4 “Your Rights”", checkedAt: "Jun 17, 2026",
        excerpt: "You may request access to, correction of, or deletion of the personal information we hold about you, or ask for a copy in a portable format.",
      },
    },
  },
  {
    id: "dp2", title: "Option to limit use of sensitive data (location / biometric)",
    sub: "Element not found on reviewed pages.", state: "warn", issueId: "i-sens",
    ev: {
      rules: "Several US state privacy frameworks describe a consumer ability to limit the use of sensitive personal data.",
      sources: [
        { label: "🇺🇸 CPRA — §1798.121 “Right to Limit”", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.121." },
        { label: "🇺🇸 Other state frameworks — CO · CT · VA" },
      ],
      proof: {
        pages: "yourstore.com/privacy · /cookie-policy · /terms — 3 pages searched", checkedAt: "Jun 17, 2026",
        observation: "No limit-use-of-sensitive-data disclosure or control found on any searched page.",
      },
      rec: "Review item: limit-use-of-sensitive-data disclosure appears to be missing. Recommend confirming with qualified counsel whether your markets require it and, if so, adding the disclosure.",
    },
  },
  {
    id: "dp3", title: "Data retention periods actually enforced",
    sub: "Not assessable by an automated scan — operational record.", state: "na",
    ev: {
      rules: "A point-in-time scan of public pages can read a stated retention period but cannot verify it is enforced operationally. Omitted rather than assumed either way.",
      sources: [
        { label: "🇪🇺 GDPR — Art. 5(1)(e) storage limitation", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" },
        { label: "🇺🇸 CPRA — §1798.100(a)(3)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.100." },
      ],
      proof: { pages: "yourstore.com/privacy · §7 “Data Retention”", checkedAt: "Jun 17, 2026", observation: "A stated retention period was read; operational enforcement is outside what a public-page scan can verify." },
    },
  },
  {
    id: "dp4", title: "Lawful basis for processing stated (GDPR Art. 6)",
    sub: "Found in Privacy Policy, §2 “How we use your data”.", state: "ok", market: "eu",
    ev: {
      rules: "GDPR commonly expects a stated lawful basis (consent, contract, legitimate interest) for each processing purpose.",
      sources: [{ label: "🇪🇺 GDPR — Art. 6", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" }],
      proof: {
        pages: "yourstore.com/privacy · §2 “How we use your data”", checkedAt: "Jun 17, 2026",
        excerpt: "We process your order information to perform our contract with you; marketing emails are sent only with your consent.",
      },
    },
  },
  {
    id: "dp5", title: "Non-essential cookies set before consent",
    sub: "Analytics cookies observed before a consent choice.", state: "warn", market: "eu", issueId: "i-cookies",
    ev: {
      rules: "Under the EU ePrivacy framework, non-essential cookies are commonly expected to require prior consent.",
      sources: [
        { label: "🇪🇺 ePrivacy Directive 2002/58/EC — Art. 5(3)", url: "https://eur-lex.europa.eu/LexUriServ/LexUriServ.do?uri=CELEX:32002L0058:EN:HTML" },
        { label: "🇪🇺 EDPB Guidelines 2/2023 — Art. 5(3) technical scope", url: "https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf" },
        { label: "🇪🇺 GDPR — Art. 7 consent conditions", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" },
      ],
      proof: {
        pages: "yourstore.com homepage — network trace", checkedAt: "Jun 17, 2026",
        observation: "3 cookies set before any consent interaction: _ga, _fbp, _hjid (t+0.8 s after page load).",
      },
      rec: "Review item: cookies set pre-consent. Recommend confirming with qualified counsel and adjusting the consent banner if needed.",
    },
  },
];

/* Terms & Conditions */
const TC_ITEMS: Ctrl[] = [
  {
    id: "tc1", title: "Governing law & dispute-resolution clause present",
    sub: "Found in Terms of Service, §12.", state: "ok",
    ev: {
      rules: "Descriptive check: whether a governing-law and dispute-resolution clause is present. There is no legal requirement to include one — this is surfaced as an observation, not a gap.",
      sources: [{ label: "Descriptive check — no specific legal requirement cited" }],
      proof: {
        pages: "yourstore.com/terms · §12 “Governing Law”", checkedAt: "Jun 17, 2026",
        excerpt: "These Terms are governed by the laws of the State of Delaware. Any dispute will first be raised with our support team before formal proceedings.",
      },
    },
  },
  {
    id: "tc2", title: "Unqualified authenticity guarantee over third-party goods",
    sub: "Listing language may extend an absolute guarantee.", state: "warn", issueId: "i-unqual",
    ev: {
      rules: "Unqualified authenticity guarantees that extend to third-party sellers are a recurring enforcement and review topic under the FTC Act §5 framework.",
      sources: [
        { label: "🇺🇸 FTC Act §5 — 15 U.S.C. §45", url: "https://www.ftc.gov/legal-library/browse/statutes/federal-trade-commission-act" },
        { label: "🇺🇸 Magnuson-Moss Warranty Act — 15 U.S.C. ch. 50", url: "https://uscode.house.gov/view.xhtml?path=/prelim@title15/chapter50&edition=prelim" },
        { label: "🇺🇸 FTC Guides for Warranties & Guarantees — 16 CFR Part 239", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-239" },
      ],
      proof: {
        pages: "yourstore.com product listing pages", checkedAt: "Jun 17, 2026",
        excerpt: "Authenticity Ensured — every item guaranteed genuine.",
      },
      rec: "Review item: unqualified guarantee. Recommend confirming with qualified counsel whether the guarantee should be qualified (e.g. scope, sellers covered).",
    },
  },
  {
    id: "tc3", title: "Refunds honored within the stated window",
    sub: "Not assessable by an automated scan — timing / operational.", state: "na",
    ev: {
      rules: "A scan can read the stated refund window but cannot verify refunds are honored within it. Omitted, not guessed.",
      sources: [{ label: "🇺🇸 CA Civ. Code §1723 — refund-policy disclosure", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1723." }],
      proof: {
        pages: "yourstore.com/refund-policy", checkedAt: "Jun 17, 2026",
        observation: "A 30-day refund window is stated; whether refunds are honored within it is operational and outside a point-in-time scan.",
      },
    },
  },
];

/* Product 5 sub-groups per Michael 6/25 review */
interface SubGroup {
  key: string;
  title: string;
  count: number;
  items: Ctrl[];
}

const PRODUCT_GROUPS: SubGroup[] = [
  {
    key: "regulated", title: "Regulated / restricted categories", count: 7,
    items: [
      { id: "p-alcohol",     title: "Alcohol — licensing, age gates, cross-border import limits",       sub: "",  state: "skip", catKey: "alcohol",     defaultOnState: "warn" },
      { id: "p-cbd",         title: "CBD / hemp / cannabinoids — legality varies sharply by country/state", sub: "", state: "skip", catKey: "cbd",         defaultOnState: "warn" },
      { id: "p-tobacco",     title: "Tobacco / vape / nicotine — heavy import and flavor restrictions", sub: "", state: "skip", catKey: "tobacco",     defaultOnState: "warn" },
      { id: "p-firearms",    title: "Firearms / weapons / regulated blades — broad cross-border prohibitions", sub: "", state: "skip", catKey: "firearms",    defaultOnState: "warn" },
      { id: "p-supplements", title: "Supplements / nutraceuticals / ingestibles — EU dosing & novel-food limits", sub: "", state: "skip", catKey: "supplements", defaultOnState: "warn" },
      {
        id: "p-cosmetics", title: "Cosmetics / topicals — EU product notification & Responsible Person",
        sub: "Sunscreen SKUs detected. EU Responsible Person disclosure missing on 3 listings.",
        state: "warn", catKey: "cosmetics", defaultOnState: "warn", market: "eu", issueId: "i-cosmetics",
        ev: {
          rules: "EU Cosmetic Products Regulation commonly expects an EU-based Responsible Person to be identified for cosmetic products marketed into the EU.",
          sources: [{ label: "🇪🇺 Cosmetics Regulation (EC) 1223/2009 — Art. 4 & 19", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009R1223" }],
          proof: {
            pages: "3 sunscreen PDPs (SKU prefix SUN-)", checkedAt: "Jun 17, 2026",
            observation: "No Responsible Person disclosure found on any sampled page.",
          },
          rec: "Review item: Responsible Person disclosure appears to be missing on cosmetics SKUs shipped into the EU. Recommend confirming with qualified counsel.",
        },
      },
      { id: "p-pharma", title: "Pharmaceuticals / medical devices — clearance, marking, prescription rules", sub: "", state: "skip", catKey: "pharma", defaultOnState: "warn" },
    ],
  },
  {
    key: "claims", title: "Claims & advertising", count: 4,
    items: [
      { id: "p-health",  title: "Health / disease / efficacy claims are substantiated", sub: "No unsubstantiated health claims found on sampled PDPs.", state: "ok" },
      { id: "p-origin",  title: "Country-of-origin claims are accurate (e.g., “Made in USA”)", sub: "No unsupported country-of-origin claims found.", state: "ok" },
      {
        id: "p-green", title: "Environmental / “green” claims — “eco,” “natural,” “sustainable”",
        sub: "Language aligns with FTC Green Guides guidance.", state: "ok",
        ev: {
          rules: "FTC Green Guides describe how environmental claims are commonly expected to be qualified and substantiated.",
          sources: [{ label: "🇺🇸 FTC Green Guides — 16 CFR Part 260", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-260" }],
          proof: { pages: "sampled PDPs and collection pages", checkedAt: "Jun 17, 2026", observation: "“Recycled shell fabric (78%)” is quantified and product-specific; no unqualified “eco-friendly” claims found." },
        },
      },
      { id: "p-pricing", title: "Reference / discount pricing displays a prior-price basis", sub: "“Was $X” references an actual sold-at price within the prior 90 days.", state: "ok" },
    ],
  },
  {
    key: "safety", title: "Product safety, conformity & disclosures", count: 6,
    items: [
      {
        id: "p-kids-safety", title: "Children's products / toys — safety standards & choking-hazard rules",
        sub: "Kids' outdoor gear detected. Age labels and small-parts warnings present.", state: "ok", catKey: "kids", defaultOnState: "ok",
        ev: {
          rules: "For toys and items with small parts, US frameworks expect age grading and small-parts warnings. Note: this authority is toy-specific — broader kids' goods (apparel, furniture) would need different authority.",
          sources: [
            { label: "🇺🇸 CPSIA — 15 U.S.C. §2056a", url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section2056a&num=0&edition=prelim" },
            { label: "🇺🇸 ASTM F963 (mandatory by incorporation under CPSIA)" },
          ],
          proof: { pages: "4 kids' outdoor gear PDPs (toys / small-parts items)", checkedAt: "Jun 17, 2026", observation: "Age labels and small-parts warnings present on every sampled page." },
        },
      },
      { id: "p-ce-ukca",     title: "CE conformity markings displayed where required", sub: "Markings shown on regulated goods sold into the EU.", state: "ok" },
      { id: "p-gpsr",        title: "EU Responsible Person named for goods sold into the EU (GPSR)", sub: "Named for general merchandise. Cosmetics-specific gap tracked above.", state: "ok" },
      { id: "p-inci",        title: "Allergen / ingredient / INCI labeling on ingestibles & cosmetics", sub: "INCI ingredient lists present on all sampled cosmetic PDPs.", state: "ok", catKey: "cosmetics", defaultOnState: "ok" },
      {
        id: "p-prop65", title: "Prop 65 / EU REACH substance-restriction signals",
        sub: "Prop 65 warnings surfaced on relevant CA-shipping listings.", state: "ok",
        ev: {
          rules: "California Prop 65 commonly expects a clear warning before exposing consumers to listed substances.",
          sources: [
            { label: "🇺🇸 Prop 65 — Cal. H&S Code §25249.6", url: "https://oehha.ca.gov/proposition-65" },
            { label: "🇺🇸 OEHHA warning regs — 27 CCR §25600 et seq.", url: "https://oehha.ca.gov/proposition-65/law/proposition-65-regulations" },
          ],
          proof: { pages: "CA-shipping listings", checkedAt: "Jun 17, 2026", observation: "Prop 65 warnings surfaced on the relevant CA-shipping listings." },
        },
      },
      { id: "p-hazmat",      title: "Restricted-shipment / hazmat — batteries, aerosols, flammables", sub: "Battery-containing SKUs carry the required transport disclosures.", state: "ok" },
    ],
  },
  {
    key: "ip-mkt", title: "IP & marketing integrity", count: 2,
    items: [
      { id: "p-counterfeit", title: "Counterfeit / unauthorized-reseller risk", sub: "All listings appear sourced from the brand directly or trusted independent sellers.", state: "ok" },
      {
        id: "p-endorsement", title: "Endorsement / influencer / review disclosures (#ad, review authenticity)",
        sub: "Sponsored posts carry the required FTC disclosures; no fake-review signals detected.", state: "ok",
        ev: {
          rules: "FTC Endorsement Guides commonly expect material connections between a brand and endorsers to be clearly disclosed.",
          sources: [{ label: "🇺🇸 FTC Endorsement Guides — 16 CFR Part 255", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255" }],
          proof: { pages: "linked social posts + on-site review sections", checkedAt: "Jun 17, 2026", observation: "Sponsored posts carry #ad disclosures; no fake-review signals detected." },
        },
      },
    ],
  },
  {
    key: "consumer", title: "Consumer protection, promotions & cross-border", count: 5,
    items: [
      { id: "p-geo",     title: "Country-of-sale / geo & shipping restrictions flagged", sub: "Ship-to gating in place for excluded markets on relevant SKUs.", state: "ok" },
      { id: "p-sweeps",  title: "Sweepstakes / contests / prize draws follow jurisdictional rules", sub: "No active sweepstakes detected on-site.", state: "ok" },
      { id: "p-compare", title: "Comparative / competitor advertising follows disclosure rules", sub: "No competitor-named claims found on PDPs.", state: "ok" },
      { id: "p-coo",     title: "Country-of-origin / sourcing disclosure surfaced", sub: "Manufacturing country stated on PDPs where required.", state: "ok" },
      {
        id: "p-urgency", title: "Urgency / scarcity claims (countdown timers, “only X left”)",
        sub: "Countdown timers & “only 3 left” on 4 PDPs — substantiation not confirmed.", state: "warn", issueId: "i-urgency",
        ev: {
          rules: "Real, verifiable scarcity is generally acceptable; simulated urgency is a recurring FTC review topic under §5 and its dark-patterns guidance.",
          sources: [
            { label: "🇺🇸 FTC Act §5 — 15 U.S.C. §45", url: "https://www.ftc.gov/legal-library/browse/statutes/federal-trade-commission-act" },
            { label: "🇺🇸 FTC staff report — Bringing Dark Patterns to Light (2022)", url: "https://www.ftc.gov/reports/bringing-dark-patterns-light" },
          ],
          proof: {
            pages: "4 PDPs on your storefront", checkedAt: "Jun 17, 2026",
            observation: "Countdown timers and “only 3 left” messaging present; backing inventory data was not cross-checked in this scan.",
          },
          rec: "Review item: verify the on-site urgency signals reflect actual stock or timing. Recommend confirming with qualified counsel.",
        },
      },
    ],
  },
];

const REGULATED_CAT_KEYS: CategoryKey[] = ["alcohol", "cbd", "tobacco", "firearms", "supplements", "cosmetics", "pharma"];

/* ── Helpers ── */
function effState(item: Ctrl, active: Set<CategoryKey>): State {
  if (!item.catKey) return item.state;
  if (active.has(item.catKey)) return item.defaultOnState ?? item.state;
  return "skip";
}

function forMarket<T extends { market?: Market }>(items: T[], m: Market) {
  return items.filter(c => !c.market || c.market === m);
}

interface ProductStats {
  verified: number;
  review: number;
  assessed: number;
  notDetectedCats: number;
  score: number;
  reviewItemsList: Ctrl[];
}

function computeProductStats(active: Set<CategoryKey>, market: Market): ProductStats {
  let verified = 0, review = 0, notDetected = 0;
  const reviewItems: Ctrl[] = [];
  for (const g of PRODUCT_GROUPS) {
    for (const it of forMarket(g.items, market)) {
      const s = effState(it, active);
      if (s === "ok") verified++;
      else if (s === "warn") { review++; reviewItems.push(it); }
      else if (s === "skip") notDetected++;
    }
  }
  const assessed = verified + review;
  const score = assessed > 0 ? Math.round((verified / assessed) * 100) : 100;
  const notDetectedCats = REGULATED_CAT_KEYS.filter(k => !active.has(k)).length;
  return { verified, review, assessed, notDetectedCats, score, reviewItemsList: reviewItems };
}

function computeOverall(market: Market, productScore: number): number {
  const dp = CATEGORIES[0][market] ?? 90;
  const tc = CATEGORIES[1][market] ?? 90;
  return Math.round((dp + tc + productScore) / 3);
}

/* Static (non-Product) review-item base counts for summary line */
function baseReviewItemCounts(market: Market) {
  return market === "us"
    ? { review: 2, notAssessable: 41 }  // T&C 1 + D&P 1 = 2 (IP / Corporate Entity out of scope)
    : { review: 3, notAssessable: 33 }; // D&P EU 3
}

/* ── Chinese content map (demo). Keyed by item/issue id.
   Only merchant-facing fields are translated; legal citations stay in source language.
   Every `rec` ends with counsel-confirming language, matching the English red line. ── */
type ZhFields = Partial<Record<"title" | "sub" | "rules" | "pages" | "checkedAt" | "excerpt" | "observation" | "rec", string>>;
const ZH_ITEMS: Record<string, ZhFields> = {
  /* Data & Privacy */
  dp1: {
    title: "已声明访问 / 更正 / 删除 / 可携带权",
    sub: "在隐私政策第 4 节《你的权利》中找到。",
    rules: "CCPA/CPRA 与 GDPR 框架通常期望告知消费者如何访问、更正、删除其数据，以及获取可携带格式的副本。",
    pages: "yourstore.com/privacy · 第 4 节《你的权利》", checkedAt: "2026 年 6 月 17 日",
    excerpt: "你可以请求访问、更正或删除我们持有的关于你的个人信息，或索取可携带格式的副本。",
  },
  dp2: {
    title: "提供限制敏感数据（位置 / 生物识别）使用的选项",
    sub: "在已审阅页面上未找到该要素。",
    rules: "多个美国州级隐私框架都描述了消费者限制敏感个人数据被使用的能力。",
    pages: "yourstore.com/privacy · /cookie-policy · /terms —— 已检索 3 个页面", checkedAt: "2026 年 6 月 17 日",
    observation: "在所有检索页面上均未找到限制敏感数据使用的声明或控件。",
    rec: "审查项：疑似缺少「限制敏感数据使用」的声明。建议与有资质的律师确认你的目标市场是否要求，如需要则补充该声明。",
  },
  dp3: {
    title: "数据保留期限已实际执行",
    sub: "自动扫描无法评估 —— 属运营层面记录。",
    rules: "对公开页面的时点扫描可以读到声明的保留期限，但无法核实其在运营中是否被执行。因此不作任何方向的假设，予以省略。",
    pages: "yourstore.com/privacy · 第 7 节《数据保留》", checkedAt: "2026 年 6 月 17 日",
    observation: "读到了声明的保留期限；运营层面的执行情况超出公开页面扫描所能核实的范围。",
  },
  dp4: {
    title: "已声明处理的合法性基础（GDPR 第 6 条）",
    sub: "在隐私政策第 2 节《我们如何使用你的数据》中找到。",
    rules: "GDPR 通常期望针对每一处理目的声明其合法性基础（同意、合同、正当利益）。",
    pages: "yourstore.com/privacy · 第 2 节《我们如何使用你的数据》", checkedAt: "2026 年 6 月 17 日",
    excerpt: "我们处理你的订单信息以履行与你的合同；营销邮件仅在获得你同意后发送。",
  },
  dp5: {
    title: "非必要 Cookie 在获得同意前被设置",
    sub: "在做出同意选择之前观测到分析类 Cookie。",
    rules: "在欧盟 ePrivacy 框架下，非必要 Cookie 通常期望需要事先获得同意。",
    pages: "yourstore.com 首页 —— 网络请求追踪", checkedAt: "2026 年 6 月 17 日",
    observation: "在任何同意交互之前已设置 3 个 Cookie：_ga、_fbp、_hjid（页面加载后 t+0.8 秒）。",
    rec: "审查项：Cookie 在同意前被设置。建议与有资质的律师确认，并按需调整同意横幅。",
  },
  /* Terms & Conditions */
  tc1: {
    title: "已包含适用法律与争议解决条款",
    sub: "在服务条款第 12 节中找到。",
    rules: "描述性检查：是否包含适用法律与争议解决条款。法律上并不要求必须包含 —— 这里作为观察项呈现，而非缺口。",
    pages: "yourstore.com/terms · 第 12 节《适用法律》", checkedAt: "2026 年 6 月 17 日",
    excerpt: "本条款受美国特拉华州法律管辖。任何争议在进入正式程序前，将先向我们的支持团队提出。",
  },
  tc2: {
    title: "对第三方商品作出无限定的正品保证",
    sub: "商品页措辞可能延伸为一项绝对保证。",
    rules: "将无限定的正品保证延伸至第三方卖家，是 FTC 法案第 5 条框架下反复出现的执法与审查议题。",
    pages: "yourstore.com 商品列表页", checkedAt: "2026 年 6 月 17 日",
    excerpt: "正品保障 —— 每件商品保证为正品。",
    rec: "审查项：无限定保证。建议与有资质的律师确认是否应对该保证加以限定（如范围、所覆盖的卖家）。",
  },
  tc3: {
    title: "退款在声明的时限内被履行",
    sub: "自动扫描无法评估 —— 属时效 / 运营层面。",
    rules: "扫描可以读到声明的退款时限，但无法核实退款是否在该时限内被履行。予以省略，不作猜测。",
    pages: "yourstore.com/refund-policy", checkedAt: "2026 年 6 月 17 日",
    observation: "声明了 30 天退款窗口；退款是否在窗口内被履行属运营层面，超出时点扫描范围。",
  },
  /* Product — regulated / restricted */
  "p-alcohol": { title: "含酒精商品 —— 许可、年龄门槛、跨境进口限额" },
  "p-cbd": { title: "CBD / 大麻二酚 / 大麻素 —— 各国 / 各州合法性差异极大" },
  "p-tobacco": { title: "烟草 / 电子烟 / 尼古丁 —— 严格的进口与口味限制" },
  "p-firearms": { title: "枪支 / 武器 / 受管制刀具 —— 广泛的跨境禁令" },
  "p-supplements": { title: "膳食补充剂 / 营养品 / 可食用品 —— 欧盟剂量与新型食品限制" },
  "p-cosmetics": {
    title: "化妆品 / 外用品 —— 欧盟产品通报与责任人（RP）",
    sub: "检测到防晒类 SKU。3 个列表缺少欧盟责任人（RP）披露。",
    rules: "欧盟化妆品法规通常期望为投放欧盟的化妆品指明一位欧盟境内的责任人（RP）。",
    checkedAt: "2026 年 6 月 17 日",
    observation: "在所有抽样页面上均未找到责任人披露。",
    rec: "审查项：投放欧盟的化妆品 SKU 疑似缺少责任人披露。建议与有资质的律师确认。",
  },
  "p-pharma": { title: "药品 / 医疗器械 —— 审批、标识、处方规则" },
  /* Product — claims & advertising */
  "p-health": { title: "健康 / 疾病 / 功效声称有充分依据", sub: "在抽样商品页上未发现无依据的健康声称。" },
  "p-origin": { title: "原产地声称准确（如「美国制造」）", sub: "未发现缺乏依据的原产地声称。" },
  "p-green": {
    title: "环保 / 「绿色」声称 ——「生态」「天然」「可持续」",
    sub: "措辞与 FTC 绿色指南的指引一致。",
    rules: "FTC 绿色指南描述了环保声称通常期望如何被限定与佐证。",
    checkedAt: "2026 年 6 月 17 日",
    observation: "「再生外壳面料（78%）」有量化且针对具体商品；未发现无限定的「环保」笼统声称。",
  },
  "p-pricing": { title: "参考价 / 折扣定价显示了原价依据", sub: "「原价 $X」引用了此前 90 天内实际成交过的价格。" },
  /* Product — safety, conformity & disclosures */
  "p-kids-safety": {
    title: "儿童用品 / 玩具 —— 安全标准与窒息风险规则",
    sub: "检测到儿童户外装备。年龄标签与小零件警示齐备。",
    rules: "对玩具及含小零件的商品，美国框架期望标注年龄分级与小零件警示。注意：此依据仅针对玩具 —— 更广义的儿童商品（服装、家具）需另行依据。",
    checkedAt: "2026 年 6 月 17 日",
    observation: "每个抽样页面均标注了年龄标签与小零件警示。",
  },
  "p-ce-ukca": { title: "在需要处显示 CE 合规标识", sub: "投放欧盟的受管制商品已显示标识。" },
  "p-gpsr": { title: "为投放欧盟的商品指明欧盟责任人（GPSR）", sub: "已为一般商品指明。化妆品的专项缺口在上文追踪。" },
  "p-inci": { title: "可食用品与化妆品的过敏原 / 成分 / INCI 标注", sub: "所有抽样化妆品页均有 INCI 成分表。" },
  "p-prop65": {
    title: "Prop 65 / 欧盟 REACH 物质限制信号",
    sub: "在相关的加州配送列表上显示了 Prop 65 警示。",
    rules: "加州 Prop 65 通常期望在使消费者接触所列物质前给出清晰警示。",
    checkedAt: "2026 年 6 月 17 日",
    observation: "在相关的加州配送列表上均已显示 Prop 65 警示。",
  },
  "p-hazmat": { title: "受限配送 / 危险品 —— 电池、气雾剂、易燃物", sub: "含电池的 SKU 均附有所需的运输披露。" },
  /* Product — IP & marketing integrity */
  "p-counterfeit": { title: "假冒 / 未授权分销风险", sub: "所有列表看起来都直接来自品牌方或可信的独立卖家。" },
  "p-endorsement": {
    title: "背书 / 达人 / 评价披露（#ad、评价真实性）",
    sub: "合作贴文附有所需的 FTC 披露；未检测到虚假评价信号。",
    rules: "FTC 背书指南通常期望品牌与背书人之间的重大关联被清晰披露。",
    checkedAt: "2026 年 6 月 17 日",
    observation: "合作贴文附有 #ad 披露；未检测到虚假评价信号。",
  },
  /* Product — consumer protection, promotions & cross-border */
  "p-geo": { title: "已标记销售国 / 地域与配送限制", sub: "已对相关 SKU 在受限市场设置配送门槛。" },
  "p-sweeps": { title: "抽奖 / 竞赛 / 赠品遵循各司法辖区规则", sub: "站内未检测到进行中的抽奖活动。" },
  "p-compare": { title: "比较 / 竞品广告遵循披露规则", sub: "商品页未发现指名竞品的声称。" },
  "p-coo": { title: "已呈现原产地 / 采购来源披露", sub: "在需要处的商品页已标注生产国。" },
  "p-urgency": {
    title: "紧迫 / 稀缺声称（倒计时、「仅剩 X 件」）",
    sub: "4 个商品页有倒计时与「仅剩 3 件」—— 依据未经确认。",
    rules: "真实、可核验的稀缺通常可接受；而模拟出的紧迫感是 FTC 第 5 条及其暗黑模式指引下反复出现的审查议题。",
    checkedAt: "2026 年 6 月 17 日",
    observation: "存在倒计时与「仅剩 3 件」的措辞；本次扫描未交叉核对后台库存数据。",
    rec: "审查项：请核实站内的紧迫信号是否反映真实库存或时效。建议与有资质的律师确认。",
  },
  /* Review Items (work queue) */
  "i-unqual": {
    title: "对第三方商品作出无限定的正品保证",
    rules: "商品页措辞将一项绝对的正品保证延伸至独立卖家。无限定的正品保证是 FTC 法案第 5 条框架下反复出现的执法与审查议题。",
    pages: "yourstore.com 商品列表页", checkedAt: "2026 年 6 月 17 日",
    excerpt: "正品保障 —— 每件商品保证为正品。",
    rec: "建议与有资质的律师确认是否应对该保证加以限定（范围 / 所覆盖的卖家）。",
  },
  "i-sens": {
    title: "未呈现限制敏感数据使用的选项",
    rules: "多个美国州级隐私框架都描述了消费者限制敏感个人数据（如精确位置、生物识别）被使用的能力。",
    pages: "yourstore.com/privacy · /cookie-policy · /terms —— 已检索 3 个页面", checkedAt: "2026 年 6 月 17 日",
    observation: "在所有检索页面上均未找到限制敏感数据使用的声明或控件。",
    rec: "建议与有资质的律师确认你的目标市场是否要求，如需要则补充该声明。",
  },
  "i-tm": {
    title: "商标名称相似 ——「Acme Outdoor」与已注册商标",
    rules: "对品牌名称在 USPTO 商标数据库中的检索，返回了一个由无关方持有的相似已注册商标。",
    pages: "USPTO 检索「acme outdoor」及相近变体，按相关 Nice 类别过滤", checkedAt: "2026 年 6 月 17 日",
    observation: "发现相似已注册商标：ACME OUTDOORS · 第 25 类（服装）· 注册号 5,xxx,xxx · 无关持有人。",
    rec: "建议在扩大美国市场营销前，与有资质的律师确认该相似性是否构成侵权风险。可提供年度监测。",
  },
  "i-annual": {
    title: "年度报告申报到期 —— 特拉华州主体",
    rules: "特拉华州主体需申报年度报告并缴纳特许经营税以维持良好存续状态；逾期申报有丧失良好存续状态的风险。",
    pages: "特拉华州州务卿主体记录", checkedAt: "2026 年 6 月 17 日",
    observation: "状态：良好存续。下一次年度报告 / 特许经营税到期日为 2027 年 3 月 1 日。",
    rec: "建议将该申报排入日程，并与有资质的律师确认是否还有其他州级申报适用。Seel Compass 可持续监测良好存续状态。",
  },
  "i-urgency": {
    title: "紧迫 / 稀缺声称 —— 倒计时与「仅剩 X 件」",
    rules: "真实、可核验的稀缺通常可接受；而模拟出的紧迫感是 FTC 第 5 条及其暗黑模式指引下反复出现的审查议题。",
    pages: "你店铺上的 4 个商品页", checkedAt: "2026 年 6 月 17 日",
    observation: "存在倒计时与「仅剩 3 件」的措辞；本次扫描未交叉核对后台库存数据。",
    rec: "建议与有资质的律师确认，并核实站内的紧迫信号是否反映真实库存或时效。",
  },
  "i-cookies": {
    title: "非必要 Cookie 在获得同意前被设置",
    rules: "在欧盟 ePrivacy 框架下，非必要 Cookie 通常期望需要事先获得同意。",
    pages: "yourstore.com 首页 —— 网络请求追踪", checkedAt: "2026 年 6 月 17 日",
    observation: "在任何同意交互之前已设置 3 个 Cookie：_ga、_fbp、_hjid（页面加载后 t+0.8 秒）。",
    rec: "建议与有资质的律师确认，并按需调整同意横幅。",
  },
  "i-dsar": {
    title: "未声明 DSAR 响应时限",
    rules: "GDPR 通常提及对数据主体访问请求的一个月响应期。",
    pages: "yourstore.com/privacy · 第 4 节", checkedAt: "2026 年 6 月 17 日",
    observation: "描述了数据主体权利，但未就访问请求声明任何响应时限。",
    rec: "建议与有资质的律师确认，并在你的政策中声明响应时限。",
  },
  "i-withdraw": {
    title: "缺少清晰的撤回同意机制",
    rules: "GDPR 通常期望撤回同意应与给予同意一样便捷。",
    pages: "yourstore.com 账户页 · /privacy —— 检索撤回控件", checkedAt: "2026 年 6 月 17 日",
    observation: "同意在注册时收集；在已审阅页面上未找到自助撤回控件。",
    rec: "建议与有资质的律师确认，并增加一个自助撤回控件。",
  },
  "i-cosmetics": {
    title: "化妆品 —— 缺少欧盟责任人披露",
    rules: "欧盟化妆品法规通常期望为投放欧盟的化妆品指明一位欧盟境内的责任人（RP）。",
    pages: "3 个防晒商品页（SKU 前缀 SUN-）", checkedAt: "2026 年 6 月 17 日",
    observation: "在所有抽样页面上均未找到责任人披露。",
    rec: "建议与有资质的律师确认，并在投放欧盟的化妆品 SKU 上呈现责任人披露。",
  },
};

/* Category labels + detection meta (Chinese) */
const ZH_CAT_LABELS: Record<CategoryKey, { label: string; meta: string; catalogHint: string }> = {
  cosmetics:  { label: "化妆品 / 外用品",        meta: "已检测 · 12 个 SKU", catalogHint: "在商品目录中检测到防晒类 SKU。" },
  kids:       { label: "儿童用品 / 玩具",        meta: "已检测 · 4 个 SKU",  catalogHint: "在目录中检测到儿童户外装备。" },
  alcohol:    { label: "含酒精商品",             meta: "未检测到",           catalogHint: "" },
  cbd:        { label: "CBD / 大麻二酚 / 大麻素", meta: "未检测到",           catalogHint: "" },
  tobacco:    { label: "烟草 / 电子烟 / 尼古丁",  meta: "未检测到",           catalogHint: "" },
  firearms:   { label: "枪支 / 武器",            meta: "未检测到",           catalogHint: "" },
  supplements:{ label: "膳食补充剂 / 营养品",     meta: "可能 · 2 个 SKU",    catalogHint: "有 2 个 SKU 提到胶原蛋白肽 —— 如你销售可食用补充剂请确认。" },
  pharma:     { label: "药品 / 医疗器械",        meta: "未检测到",           catalogHint: "" },
};

/* Score-card category names + basis tags (Chinese) */
const ZH_CATEGORIES: Record<string, string> = {
  dp: "数据与隐私", tc: "条款与条件", pr: "产品", ip: "知识产权", en: "公司主体",
};
const ZH_BASIS: Record<Basis, string> = {
  statute: "法条", regulation: "法规", guidance: "指南", "case law": "判例与执法",
};
/* Product sub-group titles → Chinese (keyed by SubGroup.key) */
const ZH_GROUP: Record<string, string> = {
  regulated: "受管制 / 受限品类",
  claims: "声称与广告",
  safety: "产品安全、合规与披露",
  "ip-mkt": "知识产权与营销诚信",
  consumer: "消费者保护、促销与跨境",
};

/* Resolvers — return Chinese when lang==='zh' and a translation exists, else English. */
function Z(lang: Lang, id: string, field: keyof ZhFields, en?: string): string {
  if (lang === "zh") { const z = ZH_ITEMS[id]?.[field]; if (z) return z; }
  return en ?? "";
}
function locProof(lang: Lang, id: string, proof: Proof): Proof {
  if (lang !== "zh") return proof;
  const z = ZH_ITEMS[id];
  if (!z) return proof;
  return {
    pages: z.pages ?? proof.pages,
    checkedAt: z.checkedAt ?? proof.checkedAt,
    excerpt: z.excerpt ?? proof.excerpt,
    observation: z.observation ?? proof.observation,
  };
}

/* ── Small primitives ── */
const stateStyle: Record<State, { icon: ReactNode; badge: string; badgeText: string }> = {
  ok:   { icon: <Check size={12} strokeWidth={2.5} />,          badge: "bg-emerald-50 text-emerald-700 border-emerald-200", badgeText: "Verified" },
  warn: { icon: <AlertTriangle size={12} strokeWidth={2.5} />,  badge: "bg-amber-50 text-amber-700 border-amber-200",       badgeText: "Review item" },
  na:   { icon: <MinusCircle size={12} strokeWidth={2} />,      badge: "bg-slate-50 text-slate-500 border-slate-200",       badgeText: "Not assessable" },
  skip: { icon: <MinusCircle size={12} strokeWidth={2} />,      badge: "bg-slate-50 text-slate-500 border-slate-200",       badgeText: "N/A" },
};

function StateIcon({ state }: { state: State }) {
  const styles: Record<State, string> = {
    ok:   "bg-emerald-50 text-emerald-600",
    warn: "bg-amber-50 text-amber-600",
    na:   "bg-slate-100 text-slate-400",
    skip: "bg-slate-100 text-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5", styles[state])}>
      {stateStyle[state].icon}
    </span>
  );
}

const ZH_STATE: Record<State, string> = { ok: "已验证", warn: "审查项", na: "无法评估", skip: "不适用" };
function StateBadge({ state }: { state: State }) {
  const lang = useLang();
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0", stateStyle[state].badge)}>
      {lang === "zh" ? ZH_STATE[state] : stateStyle[state].badgeText}
    </span>
  );
}

/* ── Source & proof blocks (shared by checklist rows and review items) ── */
function BasisTag({ basis }: { basis: Basis }) {
  const cls = basis === "case law" ? "bg-[#F1EEFF] text-[#5254DA]"
    : basis === "guidance" ? "bg-amber-50 text-amber-700"
    : "bg-slate-100 text-slate-500";
  const lang = useLang();
  return (
    <span className={cn("ml-1 text-[11px] font-semibold uppercase tracking-wide rounded px-1 py-px whitespace-nowrap", cls)}>
      {lang === "zh" ? ZH_BASIS[basis] : basis}
    </span>
  );
}

function SourcesBlock({ sources }: { sources: SourceRef[] }) {
  const t = useT();
  const anyBasis = sources.some(s => (s.basis ?? CITATION_BASIS[s.label]));
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("Sources", "来源")}</div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => {
          const basis = s.basis ?? CITATION_BASIS[s.label];
          return s.url ? (
            <a
              key={i} href={s.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium border border-border rounded-full px-2.5 py-1 bg-white text-foreground hover:border-[#5254DA] hover:text-[#5254DA] transition-colors"
            >
              {s.label}{basis && <BasisTag basis={basis} />} <span className="opacity-60">↗</span>
            </a>
          ) : (
            <span key={i} className="inline-flex items-center text-[11px] font-medium border border-border rounded-full px-2.5 py-1 bg-white text-muted-foreground">
              {s.label}{basis && <BasisTag basis={basis} />}
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {t(
          `Rule corpus ${CORPUS_VERSION} · reference only — how these rules apply to you depends on facts a scan can't assess.`,
          `规则库 ${CORPUS_VERSION} · 仅供参考 —— 这些规则如何适用于你，取决于扫描无法评估的事实。`,
        )}
        {anyBasis && t(
          " The tag on each citation marks where the rule lives — statute, regulation, agency guidance, or case law & enforcement.",
          " 每条引用上的标签标明规则所处的层级 —— 法条、法规、机构指南，或判例与执法。",
        )}
      </p>
    </div>
  );
}

function ProofBlock({ proof }: { proof: Proof }) {
  const t = useT();
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("What We Reviewed — Proof", "我们审阅了什么 —— 证据")}</div>
      {proof.pages && (
        <div className="text-[12px] text-foreground">
          <span className="text-muted-foreground">{t("Checked:", "已检查：")}</span> {proof.pages}
          {proof.checkedAt && <span className="text-muted-foreground"> · {proof.checkedAt}</span>}
        </div>
      )}
      {proof.excerpt && (
        <blockquote className="border-l-2 border-slate-300 pl-3 mt-1.5 text-[12px] italic text-foreground">
          “{proof.excerpt}”
          <span className="block not-italic text-[11px] text-muted-foreground mt-0.5">{t("— captured from your page", "—— 摘自你的页面")}</span>
        </blockquote>
      )}
      {proof.observation && <p className="text-[12px] text-foreground mt-1">{proof.observation}</p>}
    </div>
  );
}

function ControlRow({ ctrl, activeCats, issueStatuses, onManageIssue }: {
  ctrl: Ctrl;
  activeCats: Set<CategoryKey>;
  issueStatuses?: Record<string, IssueStatus>;
  onManageIssue?: (issueId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const t = useT();
  const state = effState(ctrl, activeCats);
  const hasEv = !!ctrl.ev && state !== "skip";
  const isSkipped = state === "skip";
  const sub = isSkipped
    ? t("Not applicable — category not in your catalog. Rules skipped.", "不适用 —— 该品类不在你的目录中，规则已跳过。")
    : Z(lang, ctrl.id, "sub", ctrl.sub);
  // Status echo: same finding entity as the Review Items work queue
  const issueStatus = state === "warn" && ctrl.issueId ? (issueStatuses?.[ctrl.issueId] ?? "open") : undefined;
  return (
    <div className={cn("border border-border rounded-lg bg-white overflow-hidden", isSkipped && "opacity-70")}>
      <button
        onClick={() => hasEv && setOpen(v => !v)}
        className={cn(
          "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
          hasEv && "hover:bg-[#F7F7FC] cursor-pointer",
          !hasEv && "cursor-default"
        )}
      >
        <StateIcon state={state} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground">{Z(lang, ctrl.id, "title", ctrl.title)}</div>
          {sub && <div className="text-[12px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        {issueStatus && issueStatus !== "open" && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0 bg-[#F1EEFF] text-[#5254DA] border-[#E0DBF9]">
            {lang === "zh" ? ZH_STATUS_LABELS[issueStatus] : STATUS_LABELS[issueStatus]}
          </span>
        )}
        <StateBadge state={state} />
        {hasEv && (
          <ChevronDown
            size={16}
            className={cn("text-muted-foreground shrink-0 mt-0.5 transition-transform", open && "rotate-180")}
          />
        )}
      </button>
      {open && ctrl.ev && (
        <div className="border-t border-border bg-[#F7F7FC] px-4 py-3 text-[12px] text-foreground space-y-3">
          {ctrl.ev.rules && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("Relevant Rules and Context", "相关规则与背景")}</div>
              <p className="text-foreground">{Z(lang, ctrl.id, "rules", ctrl.ev.rules)}</p>
            </div>
          )}
          {ctrl.ev.sources && ctrl.ev.sources.length > 0 && <SourcesBlock sources={ctrl.ev.sources} />}
          {ctrl.ev.proof && <ProofBlock proof={locProof(lang, ctrl.id, ctrl.ev.proof)} />}
          {ctrl.ev.rec && (
            <div className="border-l-2 border-[#5254DA] pl-3 mt-2">
              <p className="text-[#5254DA]">{Z(lang, ctrl.id, "rec", ctrl.ev.rec)}</p>
            </div>
          )}
          {state === "warn" && ctrl.issueId && onManageIssue && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => onManageIssue(ctrl.issueId!)}
                className="text-[11px] font-semibold text-[#5254DA] hover:underline"
              >
                {t("Manage in Review Items →", "在审查项中管理 →")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-tab bar ── */
const SUB_TABS: { key: SubTab; label: string; zh: string }[] = [
  { key: "overview", label: "Overview",              zh: "总览" },
  { key: "issues",   label: "Review Items",          zh: "审查项" },
  { key: "history",  label: "History",               zh: "历史" },
  { key: "setup",    label: "Setup",                 zh: "设置" },
];

/* ── Onboarding wizard ── */
const OB_STEPS = ["Your store", "Markets", "First scan", "Categories"];
const OB_STEPS_ZH = ["你的店铺", "市场", "首次扫描", "品类"];

/* Initial discovery scan — quick. Rule application & report composition happen
   after category confirmation, as an async "report generating" phase. */
const SCAN_STAGES = [
  { label: "Crawling your storefront",     detail: "11 pages — home, product pages, policy pages", labelZh: "正在抓取你的店铺", detailZh: "11 个页面 —— 首页、商品页、政策页" },
  { label: "Reading policy documents",     detail: "Privacy Policy · Terms of Service · Refund Policy", labelZh: "正在读取政策文档", detailZh: "隐私政策 · 服务条款 · 退款政策" },
  { label: "Cataloging products",          detail: "128 SKUs across 6 collections", labelZh: "正在整理商品目录", detailZh: "6 个系列共 128 个 SKU" },
  { label: "Detecting product categories", detail: "Cosmetics / topicals (12 SKUs) · Children's products (4 SKUs) · 1 possible match", labelZh: "正在识别商品品类", detailZh: "化妆品 / 外用品（12 SKU）· 儿童用品（4 SKU）· 1 项可能匹配" },
];

function OnboardingFlow({
  onComplete, onSkip,
}: {
  onComplete: (cats: Set<CategoryKey>) => void;
  onSkip: () => void;
}) {
  // Store is already bound in the merchant-dashboard backend — no manual entry or
  // ownership verification. The scan runs automatically on the connected store.
  const [step, setStep] = useState(0);
  const domain = "acme-outdoor.com"; // resolved from the connected MD account
  const [markets, setMarkets] = useState<Set<Market>>(new Set<Market>(["us", "eu"]));
  const [scanIdx, setScanIdx] = useState(-1); // -1 = not started; STAGES.length = complete
  const [cats, setCats] = useState<Set<CategoryKey>>(new Set(DEFAULT_ACTIVE_CATEGORIES));
  // Report generation is async in production (~10 min); the demo fast-forwards it.
  const [report, setReport] = useState<"idle" | "generating" | "ready">("idle");

  const stages = SCAN_STAGES;
  const scanComplete = scanIdx >= stages.length;

  /* simulated scan progression (First scan is step 2 after removing the verify step) */
  useEffect(() => {
    if (step !== 2 || scanComplete) return;
    if (scanIdx === -1) { setScanIdx(0); return; }
    const t = setTimeout(() => setScanIdx(i => i + 1), 950);
    return () => clearTimeout(t);
  }, [step, scanIdx, scanComplete]);

  /* simulated report generation (demo fast-forward) */
  useEffect(() => {
    if (report !== "generating") return;
    const t = setTimeout(() => setReport("ready"), 7000);
    return () => clearTimeout(t);
  }, [report]);

  const toggleMarket = (m: Market) => {
    setMarkets(prev => {
      const next = new Set(prev);
      if (next.has(m)) { if (next.size > 1) next.delete(m); } else next.add(m);
      return next;
    });
  };

  const toggleCat = (key: CategoryKey) => {
    setCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  /* preview stats for the final screen */
  const previewStats = useMemo(() => computeProductStats(cats, "us"), [cats]);
  const previewOverall = useMemo(() => computeOverall("us", previewStats.score), [previewStats.score]);
  const previewReview = baseReviewItemCounts("us").review + previewStats.review;

  const detectedKeys: CategoryKey[] = ["cosmetics", "kids"];   // ≥90% confidence — pre-checked
  const possibleKeys: CategoryKey[] = ["supplements"];         // 70–89% confidence — suggested, unchecked

  const t = useT();
  const zh = useLang() === "zh";
  const stepLabels = zh ? OB_STEPS_ZH : OB_STEPS;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">🧭 {t("Storefront policy scanner", "店铺政策扫描器")}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {t(
              "A structured readiness review of your storefront — set up once, reviewed automatically every week.",
              "对你店铺的一次结构化就绪度审阅 —— 设置一次，之后每周自动审阅。",
            )}
          </p>
        </div>
        <button onClick={onSkip} className="text-[11px] text-muted-foreground hover:text-[#5254DA] hover:underline shrink-0 mt-1">
          {t("Skip (demo) →", "跳过（demo）→")}
        </button>
      </div>

      {/* Step indicator */}
      {report === "idle" && (
        <div className="flex items-center">
          {stepLabels.map((label, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <div key={label} className={cn("flex items-center", i > 0 && "flex-1")}>
                {i > 0 && <div className={cn("h-px flex-1 mx-2", isDone || isCurrent ? "bg-[#5254DA]" : "bg-border")} />}
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0",
                    isDone && "bg-[#5254DA] text-white",
                    isCurrent && "bg-[#F1EEFF] text-[#5254DA] border border-[#5254DA]",
                    !isDone && !isCurrent && "bg-slate-100 text-slate-400",
                  )}>
                    {isDone ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    isCurrent ? "text-[#5254DA]" : isDone ? "text-foreground" : "text-muted-foreground",
                  )}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 0 — store domain + authorization */}
      {report === "idle" && step === 0 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">{t("Connect your store", "连接你的店铺")}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                {t(
                  "Storefront policy scanner reads your public storefront pages — product listings, policies, and disclosures. Nothing is installed on your store.",
                  "店铺政策扫描器读取你的公开店铺页面 —— 商品列表、政策与披露。不会在你的店铺上安装任何东西。",
                )}
              </p>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Connected store", "已连接店铺")}</label>
              <div className="flex items-center gap-2 mt-1.5 border border-border rounded-lg px-3 py-2 bg-[#F7F7FC]">
                <Globe size={14} className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-[13px] text-foreground font-medium">{domain}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"><ShieldCheck size={13} /> {t("Connected via your Seel account", "已通过你的 Seel 账户连接")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{t("Pulled from your merchant dashboard — no setup needed.", "取自你的商家后台 —— 无需额外设置。")}</p>
            </div>
            {/* Counsel-provided intro disclaimer (Michael 7/17) — shown before the scan begins */}
            <div className="rounded-lg border border-border bg-[#F7F7FC] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
              {t(
                "This scan is an automated, informational tool that detects whether certain signals appear on the page you've identified as your own. It is not legal advice or a determination of compliance, and creates no attorney-client relationship. Results are not exhaustive and may contain errors. Consult your own attorney on any compliance question. Seel disclaims all warranties and liability arising from use of the scan.",
                "本次扫描是一款自动化的信息性工具，用于检测某些信号是否出现在你指认为自有的页面上。它不是法律意见，也不是对合规状况的认定，且不构成任何委托代理关系。结果并不详尽，且可能包含错误。任何合规问题请咨询你自己的律师。Seel 对因使用本扫描而产生的一切担保与责任予以免除。",
              )}
            </div>
            <div className="flex justify-end pt-1">
              <PrimaryBtn onClick={() => setStep(1)}>
                {t("Continue", "继续")} <ArrowRight size={13} />
              </PrimaryBtn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 — target markets */}
      {report === "idle" && step === 1 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">{t("Where do you sell?", "你在哪里销售？")}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                {t(
                  "Rule sets are applied per market. Pick the markets you sell into today — you can add more later in Setup.",
                  "规则集按市场分别应用。选择你目前销售的市场 —— 之后可在「设置」中添加更多。",
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ObMarketCard on={markets.has("us")} onClick={() => toggleMarket("us")} flag="🇺🇸" name={t("United States", "美国")} sub={t("Federal + state-level frameworks", "联邦 + 州级框架")} />
              <ObMarketCard on={markets.has("eu")} onClick={() => toggleMarket("eu")} flag="🇪🇺" name={t("European Union", "欧盟")} sub={t("GDPR, ePrivacy, product regulations", "GDPR、ePrivacy、产品法规")} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(0)} className="text-[12px] text-muted-foreground hover:text-foreground">{t("← Back", "← 返回")}</button>
              <PrimaryBtn onClick={() => { setScanIdx(-1); setStep(2); }}>
                {t("Start first scan", "开始首次扫描")} <ArrowRight size={13} />
              </PrimaryBtn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — scan progress */}
      {report === "idle" && step === 2 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">
                {scanComplete ? t("Scan complete", "扫描完成") : (zh ? `正在扫描 ${domain}…` : `Scanning ${domain}…`)}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                {scanComplete
                  ? t("Your storefront has been reviewed. One quick confirmation before we open the report.", "你的店铺已审阅完毕。在打开报告前，请做一个快速确认。")
                  : t("This usually takes a couple of minutes. You can leave this page — we'll email you when it's ready.", "这通常需要几分钟。你可以离开此页面 —— 准备就绪后我们会邮件通知你。")}
              </p>
            </div>
            {/* progress bar */}
            <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full rounded bg-[#5254DA] transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((Math.max(scanIdx, 0) / stages.length) * 100))}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {stages.map((s, i) => {
                const stDone = i < scanIdx;
                const stCurrent = i === scanIdx && !scanComplete;
                return (
                  <div key={s.label} className={cn("flex items-start gap-2.5 px-3 py-2 rounded-lg", stCurrent && "bg-[#F1EEFF]")}>
                    <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center mt-0.5">
                      {stDone && <Check size={14} className="text-emerald-600" strokeWidth={2.5} />}
                      {stCurrent && <Loader2 size={14} className="text-[#5254DA] animate-spin" />}
                      {!stDone && !stCurrent && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12px] font-medium", stDone || stCurrent ? "text-foreground" : "text-muted-foreground")}>{zh ? s.labelZh : s.label}</div>
                      {(stDone || stCurrent) && <div className="text-[11px] text-muted-foreground mt-0.5">{zh ? s.detailZh : s.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {scanComplete && (
              <div className="flex justify-end pt-1">
                <PrimaryBtn onClick={() => setStep(3)}>{t("Review detected categories", "查看检测到的品类")} <ArrowRight size={13} /></PrimaryBtn>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 — confirm categories */}
      {report === "idle" && step === 3 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">{t("Confirm your product categories", "确认你的商品品类")}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                {t(
                  "Regulated-category rules are only applied to categories you actually sell. Uncheck anything that doesn't apply, or add categories you plan to launch.",
                  "受管制品类的规则只应用于你实际销售的品类。取消勾选不适用的项，或添加你计划上线的品类。",
                )}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {zh
                  ? <><span className="font-semibold text-[#5254DA]">已检测</span> = 来自你目录的高置信匹配，已预先勾选 · <span className="font-semibold text-amber-700">可能</span> = 发现部分信号，请确认。</>
                  : <><span className="font-semibold text-[#5254DA]">Detected</span> = high-confidence match from your catalog, pre-checked · <span className="font-semibold text-amber-700">Possible</span> = partial signals found, please confirm.</>}
              </p>
            </div>
            <div className="space-y-1">
              {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key => {
                const detected = detectedKeys.includes(key);
                const possible = possibleKeys.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCat(key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg border transition-colors",
                      cats.has(key) ? "border-[#E0DBF9] bg-[#F1EEFF]" : "border-border bg-white hover:bg-[#F7F7FC]",
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center transition-colors",
                      cats.has(key) ? "bg-[#5254DA] border-[#5254DA]" : "border-border bg-white",
                    )}>
                      {cats.has(key) && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[12px]", cats.has(key) ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {zh ? ZH_CAT_LABELS[key].label : CATEGORY_LABELS[key].label}
                      </span>
                      {(detected || possible) && CATEGORY_LABELS[key].catalogHint && (
                        <span className="block text-[11px] text-muted-foreground">{zh ? ZH_CAT_LABELS[key].catalogHint : CATEGORY_LABELS[key].catalogHint}</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium rounded px-1.5 py-0.5 shrink-0",
                      detected && "bg-[#F1EEFF] text-[#5254DA]",
                      possible && "bg-amber-50 text-amber-700",
                      !detected && !possible && "bg-slate-50 text-slate-400",
                    )}>
                      {detected || possible ? (zh ? ZH_CAT_LABELS[key].meta : CATEGORY_LABELS[key].meta) : t("not detected", "未检测到")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
              {t(
                "Detection re-runs on every weekly review — newly detected categories will be suggested here, and you can adjust this list any time in Setup.",
                "检测在每次每周审阅时重新运行 —— 新检测到的品类会在此处建议，你可随时在「设置」中调整此列表。",
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(2)} className="text-[12px] text-muted-foreground hover:text-foreground">{t("← Back", "← 返回")}</button>
              <PrimaryBtn onClick={() => setReport("generating")}>{t("Finish setup", "完成设置")} <ArrowRight size={13} /></PrimaryBtn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report generating — async, merchant can leave */}
      {report === "generating" && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 size={28} className="animate-spin text-[#5254DA] mx-auto" />
            <div>
              <h2 className="text-[18px] font-bold text-foreground">{t("Generating your first report…", "正在生成你的首份报告…")}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                {zh
                  ? <>正在将{markets.has("eu") ? "美国与欧盟" : "美国"}规则集应用于你确认的品类，并连同证据编写发现。</>
                  : <>Applying {markets.has("eu") ? "United States and European Union" : "United States"} rule sets to your confirmed categories and composing findings with evidence.</>}
              </p>
            </div>
            <div className="rounded-lg border border-[#E0DBF9] bg-[#F1EEFF] px-4 py-3 text-[12px] text-[#5254DA] max-w-md mx-auto text-left">
              {zh
                ? <>⏱ <b>这通常需要约 10 分钟。</b>你可以安心离开此页面 —— 报告就绪后我们会邮件通知你，它会在店铺政策扫描器下等着你。</>
                : <>⏱ <b>This usually takes about 10 minutes.</b> You can safely leave this page — we'll email you when your report is ready, and it will be waiting here under Storefront policy scanner.</>}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("Demo note: fast-forwards in a few seconds.", "Demo 说明：几秒后快进。")}</p>
          </CardContent>
        </Card>
      )}

      {/* Report ready */}
      {report === "ready" && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-[40px] leading-none">🧭</div>
            <div>
              <h2 className="text-[18px] font-bold text-foreground">{t("Your first report is ready", "你的首份报告已就绪")}</h2>
              <p className="text-[12px] text-muted-foreground mt-1">{domain} · {t("reviewed just now · next automatic review in 7 days", "刚刚审阅 · 下次自动审阅在 7 天后")}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="rounded-lg bg-[#F1EEFF] border border-[#E0DBF9] px-3 py-3">
                <div className="text-[26px] font-bold text-[#5254DA]">{previewOverall}%</div>
                <div className="text-[11px] font-medium text-[#5254DA] mt-0.5">{t("Overall readiness", "总体就绪度")}</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
                <div className="text-[26px] font-bold text-amber-700">{previewReview}</div>
                <div className="text-[11px] font-medium text-amber-700 mt-0.5">{t("Review items", "审查项")}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3">
                <div className="text-[26px] font-bold text-emerald-700">{previewStats.verified}</div>
                <div className="text-[11px] font-medium text-emerald-700 mt-0.5">{t("Product checks verified", "已验证的产品检查")}</div>
              </div>
            </div>
            <div className="pt-2">
              <PrimaryBtn onClick={() => onComplete(cats)}>{t("Open your report", "打开你的报告")} <ArrowRight size={13} /></PrimaryBtn>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2">
              {t(
                "ⓘ Informational only — not legal advice, and not a law firm. Review items recommend confirming with qualified counsel.",
                "ⓘ 仅供参考 —— 非法律意见，也并非律师事务所。审查项建议与有资质的律师确认。",
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PrimaryBtn({ disabled, onClick, children }: { disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-md transition-colors",
        disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#5254DA] text-white hover:bg-[#4547BA]",
      )}
    >
      {children}
    </button>
  );
}

function ObMarketCard({
  on, disabled, onClick, flag, name, sub,
}: { on?: boolean; disabled?: boolean; onClick?: () => void; flag: string; name: string; sub: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 text-left px-3.5 py-3 rounded-lg border transition-colors",
        on && "border-[#5254DA] bg-[#F1EEFF]",
        !on && !disabled && "border-border bg-white hover:bg-[#F7F7FC]",
        disabled && "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70",
      )}
    >
      <span className="text-[18px] leading-none mt-0.5">{flag}</span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[13px] font-medium", disabled ? "text-slate-400" : "text-foreground")}>{name}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
      {on && <Check size={14} className="text-[#5254DA] shrink-0 mt-0.5" strokeWidth={2.5} />}
    </button>
  );
}

/* ── Main component ── */
export default function CompassPage() {
  const [onboarded, setOnboarded] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  // Local translator (CompassPage sits outside its own LangCtx.Provider).
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const [tab, setTab] = useState<SubTab>("overview");
  const [market, setMarket] = useState<Market>("us");
  const [activeCats, setActiveCats] = useState<Set<CategoryKey>>(new Set(DEFAULT_ACTIVE_CATEGORIES));
  const [pendingRescan, setPendingRescan] = useState(false);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [issueStatuses, setIssueStatuses] = useState<Record<string, IssueStatus>>({});

  const productStats = useMemo(() => computeProductStats(activeCats, market), [activeCats, market]);
  const overallScore = useMemo(() => computeOverall(market, productStats.score), [market, productStats.score]);

  const toggleCategory = (key: CategoryKey) => {
    setActiveCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setPendingRescan(true);
  };

  const rescanNow = () => {
    // Demo: just clears the pending banner. In production this would trigger a real scan.
    setPendingRescan(false);
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const setIssueStatus = (id: string, status: IssueStatus) => {
    setIssueStatuses(prev => ({ ...prev, [id]: status }));
  };

  // Jump from an Overview checklist row to the same finding in the Review Items work queue
  const [focusIssueId, setFocusIssueId] = useState<string | null>(null);
  const manageIssue = (issueId: string) => {
    const iss = ALL_ISSUES.find(i => i.id === issueId);
    if (iss) setMarket(iss.market);
    setFocusIssueId(issueId);
    setTab("issues");
  };

  if (!onboarded) {
    return (
      <LangCtx.Provider value={lang}>
        <div className="flex-1 overflow-y-auto bg-[#F9F9F9]">
          <OnboardingFlow
            onComplete={cats => { setActiveCats(new Set(cats)); setOnboarded(true); }}
            onSkip={() => setOnboarded(true)}
          />
        </div>
      </LangCtx.Provider>
    );
  }

  return (
    <LangCtx.Provider value={lang}>
    <div className="flex-1 overflow-y-auto bg-[#F9F9F9]">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">

        {/* Sub-tab bar */}
        <div className="border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-0">
            {SUB_TABS.map(st => (
              <button
                key={st.key}
                onClick={() => setTab(st.key)}
                className={cn(
                  "px-3 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]",
                  tab === st.key
                    ? "border-[#5254DA] text-[#5254DA]"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {lang === "zh" ? st.zh : st.label}
                {st.key === "issues" && (
                  <span className="ml-1 text-[11px] font-bold text-amber-600">
                    ·{baseReviewItemCounts(market).review + productStats.review}
                  </span>
                )}
                {st.key === "setup" && pendingRescan && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#5254DA] align-middle" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pb-1 text-xs text-muted-foreground">
            <span>{t("Your latest review · Jun 17, 2026", "你的最新审阅 · 2026 年 6 月 17 日")}</span>
            <button className="flex items-center gap-1.5 text-xs text-[#5254DA] hover:underline">
              <Download size={12} /> {t("Download report (PDF)", "下载报告（PDF）")}
            </button>
          </div>
        </div>

        {/* Pending rescan banner — sticky across tabs */}
        {pendingRescan && (
          <div className="rounded-lg border border-[#E0DBF9] bg-[#F1EEFF] px-4 py-3 flex items-center gap-3 text-[12px]">
            <RefreshCw size={14} className="text-[#5254DA]" />
            <div className="flex-1 text-[#5254DA]">
              {lang === "zh"
                ? <><b>品类集合已更新。</b>下方的分数与发现预览了新的规则范围。变更将在你下一次每周扫描时自动生效 —— 或立即运行一次新扫描。</>
                : <><b>Category set updated.</b> Scores and findings below preview the new rule scope. Changes will apply automatically at your next weekly scan — or run a fresh scan now.</>}
            </div>
            <button
              onClick={rescanNow}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[#5254DA] text-white hover:bg-[#4547BA]"
            >
              {t("Rescan now", "立即重新扫描")}
            </button>
            <button
              onClick={() => setPendingRescan(false)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {tab === "overview" && (
          <OverviewTab
            market={market} setMarket={setMarket}
            activeCats={activeCats}
            productStats={productStats}
            overallScore={overallScore}
            productFilter={productFilter} setProductFilter={setProductFilter}
            collapsedGroups={collapsedGroups} toggleGroupCollapse={toggleGroupCollapse}
            goTo={setTab}
            issueStatuses={issueStatuses}
            onManageIssue={manageIssue}
          />
        )}
        {tab === "issues" && (
          <IssuesTab
            market={market} setMarket={setMarket}
            activeCats={activeCats}
            productStats={productStats}
            issueStatuses={issueStatuses} setIssueStatus={setIssueStatus}
            focusIssueId={focusIssueId}
          />
        )}
        {tab === "history" && <HistoryTab />}
        {tab === "setup" && (
          <SetupTab
            activeCats={activeCats}
            toggleCategory={toggleCategory}
            pendingRescan={pendingRescan}
            rescanNow={rescanNow}
            lang={lang}
            setLang={setLang}
            onReplayOnboarding={() => { setOnboarded(false); setTab("overview"); }}
          />
        )}

        {/* Footer legal disclaimer */}
        <p className="text-[11px] text-muted-foreground pt-6 border-t border-border mt-8">
          {t(
            "ⓘ Informational only — not legal advice, and not a law firm. Review items point to relevant rules and recommend confirming with qualified counsel.",
            "ⓘ 仅供参考 —— 非法律意见，也并非律师事务所。审查项指向相关规则，并建议与有资质的律师确认。",
          )}
        </p>
      </div>
    </div>
    </LangCtx.Provider>
  );
}

/* ── Overview tab ── */
function OverviewTab({
  market, setMarket, activeCats, productStats, overallScore,
  productFilter, setProductFilter, collapsedGroups, toggleGroupCollapse, goTo,
  issueStatuses, onManageIssue,
}: {
  market: Market;
  setMarket: (m: Market) => void;
  activeCats: Set<CategoryKey>;
  productStats: ProductStats;
  overallScore: number;
  productFilter: ProductFilter;
  setProductFilter: (f: ProductFilter) => void;
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (key: string) => void;
  goTo: (t: SubTab) => void;
  issueStatuses: Record<string, IssueStatus>;
  onManageIssue: (issueId: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const dpItems = forMarket(DP_ITEMS, market);
  const tcItems = forMarket(TC_ITEMS, market);
  const base = baseReviewItemCounts(market);
  const totalReview = base.review + productStats.review;

  // Sections collapsed by default; expand on header click or category-card click.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [showMethodology, setShowMethodology] = useState(false);
  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openAndScroll = (key: string, id: string) => {
    setOpenSections(prev => new Set(prev).add(key));
    setTimeout(() => scrollToId(id), 60);
  };

  return (
    <>
      {/* Delta strip */}
      <div className="rounded-lg border border-border bg-white px-4 py-3 flex items-center gap-4 text-[12px] flex-wrap">
        <span className="text-muted-foreground">📈 {t("Since last review", "自上次审阅")} <span className="text-foreground font-medium">({t("Jun 10", "6 月 10 日")})</span>:</span>
        <span className="text-emerald-700 font-medium">▲ {t("readiness +2", "就绪度 +2")}</span>
        <span className="text-amber-700 font-medium">{t("+2 new review items", "+2 项新审查项")}</span>
        <span className="text-[#5254DA] font-medium">{t("2 resolved", "2 项已解决")}</span>
        <button onClick={() => goTo("history")} className="ml-auto text-[#5254DA] font-medium hover:underline">{t("View history →", "查看历史 →")}</button>
      </div>

      {/* Market toggle */}
      <div className="flex items-center gap-2">
        <MarketBtn on={market === "us"} onClick={() => setMarket("us")}>🇺🇸 {t("United States", "美国")}</MarketBtn>
        <MarketBtn on={market === "eu"} onClick={() => setMarket("eu")}>🇪🇺 {t("European Union", "欧盟")}</MarketBtn>
      </div>

      {/* Score hero — Overall + 3 scored categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        <Card className="shadow-none border border-border bg-[#F1EEFF]">
          <CardContent className="p-4">
            <div className="text-[12px] font-semibold text-[#5254DA] mb-2">🧭 {t("Overall", "总体")}</div>
            <div className="text-[26px] leading-none font-bold text-[#5254DA]">{overallScore}%</div>
            <div className="mt-2 h-1 bg-[#E0DBF9] rounded overflow-hidden">
              <div className="h-full rounded bg-[#5254DA]" style={{ width: `${overallScore}%` }} />
            </div>
          </CardContent>
        </Card>
        {CATEGORIES.map(cat => (
          <CategoryCard
            key={cat.key}
            cat={cat}
            market={market}
            productScore={productStats.score}
            onClick={() => {
              if (cat.key === "dp") openAndScroll("dp", "section-dp");
              else if (cat.key === "tc") openAndScroll("tc", "section-tc");
              else if (cat.key === "pr") openAndScroll("pr", "section-pr");
            }}
          />
        ))}
      </div>

      {/* Summary line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground pt-1">
        <span><span className="font-bold text-amber-700">{totalReview}</span> {t("review items", "项审查项")}</span>
        <span><span className="font-bold text-slate-500">{base.notAssessable}</span> {t("not assessable by scan (omitted)", "项扫描无法评估（已省略）")}</span>
        <span><span className="font-bold text-slate-500">{productStats.notDetectedCats}</span> {t("categories not detected in your catalog", "个品类未在你的目录中检测到")}</span>
        <button
          onClick={() => setShowMethodology(v => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#5254DA] transition-colors"
        >
          {t("ⓘ How are these scores calculated?", "ⓘ 这些分数是如何计算的？")}
          <ChevronDown size={12} className={cn("transition-transform", showMethodology && "rotate-180")} />
        </button>
      </div>

      {/* Score methodology explainer */}
      {showMethodology && (
        <div className="rounded-lg border border-border bg-white px-4 py-3 text-[12px] text-muted-foreground space-y-1.5">
          {lang === "zh" ? (
            <>
              <p><b className="text-foreground">品类分数</b> = 所选市场下「已验证的检查项 ÷ 已评估的检查项（已验证 + 审查项）」。标记为「无法评估」或「不适用」的检查项被排除 —— 它们既不抬高也不拉低分数。</p>
              <p><b className="text-foreground">总体就绪度</b> = 三个计分品类（数据与隐私、条款与条件、产品）的平均值。</p>
              <p>这些数字背后的每一项检查都在下方连同其证据列出 —— 展开任一区块可查看逐项细节。</p>
            </>
          ) : (
            <>
              <p><b className="text-foreground">Category score</b> = verified checks ÷ assessed checks (verified + review items) for the selected market. Checks marked "Not assessable" or "Not applicable" are excluded — they neither raise nor lower the score.</p>
              <p><b className="text-foreground">Overall readiness</b> = the average of the three scored categories (Data & Privacy, Terms & Conditions, Product).</p>
              <p>Every check behind these numbers is listed below with its evidence — expand any section for item-level detail.</p>
            </>
          )}
        </div>
      )}

      {/* Data & Privacy */}
      <SectionHeader
        id="section-dp"
        emoji="🔒"
        title={t("Data & Privacy", "数据与隐私")}
        verified={market === "us"
          ? t("62 / 64 verified", "62 / 64 项已验证")
          : t("42 / 46 verified · 3 review items", "42 / 46 项已验证 · 3 项审查项")}
        collapsed={!openSections.has("dp")}
        onToggle={() => toggleSection("dp")}
      />
      {openSections.has("dp") && (
        <div className="space-y-2">{dpItems.map(c => <ControlRow key={c.id} ctrl={c} activeCats={activeCats} issueStatuses={issueStatuses} onManageIssue={onManageIssue} />)}</div>
      )}

      {/* Terms & Conditions */}
      <SectionHeader
        id="section-tc"
        emoji="📄"
        title={t("Terms & Conditions", "条款与条件")}
        verified={market === "us"
          ? t("48 / 50 verified · 1 review item", "48 / 50 项已验证 · 1 项审查项")
          : t("37 / 39 verified", "37 / 39 项已验证")}
        collapsed={!openSections.has("tc")}
        onToggle={() => toggleSection("tc")}
      />
      {openSections.has("tc") && (
        <div className="space-y-2">{tcItems.map(c => <ControlRow key={c.id} ctrl={c} activeCats={activeCats} issueStatuses={issueStatuses} onManageIssue={onManageIssue} />)}</div>
      )}

      {/* Product */}
      <SectionHeader
        id="section-pr"
        emoji="🛍️"
        title={t("Product", "产品")}
        verified={lang === "zh"
          ? `${productStats.verified} / ${productStats.assessed} 项已验证 · ${productStats.review} 项审查项 · ${productStats.notDetectedCats} 个品类未检测到`
          : `${productStats.verified} / ${productStats.assessed} verified · ${productStats.review} review item${productStats.review === 1 ? "" : "s"} · ${productStats.notDetectedCats} categories not detected`}
        collapsed={!openSections.has("pr")}
        onToggle={() => toggleSection("pr")}
      />
      {openSections.has("pr") && (
        <>
          <p className="text-[12px] text-muted-foreground mb-2">
            {t("Regulated-category rules apply only to the categories you sell — auto-detected during scan, confirm in", "受管制品类的规则只应用于你销售的品类 —— 扫描时自动检测，可在此确认：")}{" "}
            <button
              type="button"
              onClick={() => goTo("setup")}
              className="text-[#5254DA] font-medium hover:underline"
            >
              {t("Setup", "设置")}
            </button>{t(".", "。")}
          </p>

          {/* Filter chips */}
          <FilterChips
            current={productFilter}
            onChange={setProductFilter}
            counts={{
              all: productStats.assessed + productStats.notDetectedCats,
              review: productStats.review,
              verified: productStats.verified,
              na: productStats.notDetectedCats,
            }}
          />

          {PRODUCT_GROUPS.map((g, gi) => {
            const items = forMarket(g.items, market);
            const filtered = items.filter(it => {
              const s = effState(it, activeCats);
              if (productFilter === "all") return true;
              if (productFilter === "review") return s === "warn";
              if (productFilter === "verified") return s === "ok";
              if (productFilter === "na") return s === "skip";
              return true;
            });
            if (productFilter !== "all" && filtered.length === 0) return null;
            const collapsed = collapsedGroups.has(g.key);
            return (
              <div key={g.key}>
                <SubGroupHeader
                  n={gi + 1}
                  title={lang === "zh" ? (ZH_GROUP[g.key] ?? g.title) : g.title}
                  count={items.length}
                  collapsed={collapsed}
                  onToggle={() => toggleGroupCollapse(g.key)}
                />
                {!collapsed && (
                  <div className="space-y-2">
                    {filtered.map(c => <ControlRow key={c.id} ctrl={c} activeCats={activeCats} issueStatuses={issueStatuses} onManageIssue={onManageIssue} />)}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

function MarketBtn({
  on, disabled, onClick, children,
}: { on?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 text-[12px] font-medium border rounded-full transition-colors",
        on && "bg-[#5254DA] text-white border-[#5254DA]",
        !on && !disabled && "bg-white text-foreground border-border hover:bg-[#F7F7FC]",
        disabled && "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

function SectionHeader({ id, emoji, title, verified, collapsed, onToggle }: {
  id?: string; emoji: string; title: string; verified: string;
  collapsed?: boolean; onToggle?: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 mt-6 mb-2 scroll-mt-4 py-1 rounded hover:bg-[#F7F7FC] transition-colors text-left"
    >
      <div className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-bold text-foreground">
          <span className="mr-1">{emoji}</span>{title}
        </h2>
        <span className="text-[11px] text-emerald-700 font-medium">· {verified}</span>
      </div>
      {onToggle && (
        <ChevronDown
          size={14}
          className={cn("text-muted-foreground transition-transform mr-1 shrink-0", collapsed && "rotate-[-90deg]")}
        />
      )}
    </button>
  );
}

function SubGroupHeader({ n, title, count, collapsed, onToggle }: {
  n: number; title: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 mt-5 mb-2 py-1 hover:bg-[#F7F7FC] rounded transition-colors"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {n}. {title}
        </span>
        <span className="text-[11px] text-muted-foreground">· {count}</span>
      </div>
      <ChevronDown
        size={14}
        className={cn("text-muted-foreground transition-transform mr-1", collapsed && "rotate-[-90deg]")}
      />
    </button>
  );
}

/* Filter chips */
function FilterChips({
  current, onChange, counts,
}: {
  current: ProductFilter;
  onChange: (f: ProductFilter) => void;
  counts: { all: number; review: number; verified: number; na: number };
}) {
  const t = useT();
  const chips: { key: ProductFilter; label: string; count: number; color: string }[] = [
    { key: "all",      label: t("All", "全部"),            count: counts.all,      color: "" },
    { key: "review",   label: t("Review items", "审查项"),  count: counts.review,   color: "amber" },
    { key: "verified", label: t("Verified", "已验证"),      count: counts.verified, color: "emerald" },
    { key: "na",       label: t("Not applicable", "不适用"), count: counts.na,       color: "slate" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap pb-2">
      {chips.map(c => {
        const active = current === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={cn(
              "text-[11px] font-medium px-3 py-1 rounded-full border transition-colors",
              active && c.color === "amber"    && "bg-amber-50 text-amber-700 border-amber-200",
              active && c.color === "emerald"  && "bg-emerald-50 text-emerald-700 border-emerald-200",
              active && c.color === "slate"    && "bg-slate-100 text-slate-700 border-slate-300",
              active && c.color === ""         && "bg-[#F1EEFF] text-[#5254DA] border-[#E0DBF9]",
              !active                          && "bg-white text-muted-foreground border-border hover:bg-[#F7F7FC]",
            )}
          >
            {c.label} <span className="opacity-70">· {c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Category card — clickable */
function CategoryCard({
  cat, market, productScore, onClick,
}: {
  cat: typeof CATEGORIES[number];
  market: Market;
  productScore: number;
  onClick?: () => void;
}) {
  const lang = useLang();
  const t = useT();
  const label = lang === "zh" ? (ZH_CATEGORIES[cat.key] ?? cat.label) : cat.label;
  // Product uses dynamic productScore
  const numeric = cat.key === "pr" ? productScore : (market === "us" ? cat.us : cat.eu);
  const scoreWarn = numeric != null && numeric < 90;

  // (IP / Corporate Entity status cards removed for Phase 1 — only numeric-scored categories remain)
  return (
    <Card onClick={onClick} className="shadow-none border border-border cursor-pointer hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="text-[12px] font-semibold text-muted-foreground mb-2">
          <span className="mr-1">{cat.emoji}</span>{label}
        </div>
        <div className={cn("text-[26px] font-semibold", scoreWarn ? "text-amber-600" : "text-foreground")}>
          {numeric != null ? `${numeric}%` : "—"}
        </div>
        <div className="mt-2 h-1 bg-slate-100 rounded overflow-hidden">
          <div
            className={cn("h-full rounded transition-all", scoreWarn ? "bg-amber-500" : "bg-emerald-500")}
            style={{ width: `${numeric ?? 0}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Review Items tab ── */
const CATEGORY_ORDER = ["Data & Privacy", "Terms & Conditions", "Product"];
const CATEGORY_EMOJI: Record<string, string> = {
  "Data & Privacy": "🔒",
  "Terms & Conditions": "📄",
  "Product": "🛍️",
  "Intellectual Property": "™️",
  "Corporate Entity": "🏛️",
};

interface Issue {
  id: string;
  title: string;
  category: string;
  market: Market;
  marketLabel: string;
  rules: string;
  sources?: SourceRef[];
  proof?: Proof;
  rec: string;
  gatedByCat?: CategoryKey; // if unchecked, this issue disappears
}

const ALL_ISSUES: Issue[] = [
  {
    id: "i-unqual", title: "Unqualified authenticity guarantee over third-party goods", category: "Terms & Conditions", market: "us", marketLabel: "United States",
    rules: "Listing language extends an absolute authenticity guarantee to independent sellers. Unqualified authenticity guarantees are a recurring enforcement and review topic under the FTC Act §5 framework.",
    sources: [
      { label: "🇺🇸 FTC Act §5 — 15 U.S.C. §45", url: "https://www.ftc.gov/legal-library/browse/statutes/federal-trade-commission-act" },
      { label: "🇺🇸 Magnuson-Moss Warranty Act — 15 U.S.C. ch. 50", url: "https://uscode.house.gov/view.xhtml?path=/prelim@title15/chapter50&edition=prelim" },
      { label: "🇺🇸 FTC Guides for Warranties & Guarantees — 16 CFR Part 239", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-239" },
    ],
    proof: { pages: "yourstore.com product listing pages", checkedAt: "Jun 17, 2026", excerpt: "Authenticity Ensured — every item guaranteed genuine." },
    rec: "Recommend confirming with qualified counsel whether to qualify the guarantee (scope / sellers covered).",
  },
  {
    id: "i-sens", title: "Option to limit use of sensitive data not surfaced", category: "Data & Privacy", market: "us", marketLabel: "United States",
    rules: "Several US state privacy frameworks describe a consumer ability to limit use of sensitive personal data (e.g. precise location, biometric).",
    sources: [
      { label: "🇺🇸 CPRA — §1798.121 “Right to Limit”", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.121." },
      { label: "🇺🇸 Other state frameworks — CO · CT · VA" },
    ],
    proof: { pages: "yourstore.com/privacy · /cookie-policy · /terms — 3 pages searched", checkedAt: "Jun 17, 2026", observation: "No limit-use-of-sensitive-data disclosure or control found on any searched page." },
    rec: "Recommend confirming with qualified counsel whether your markets require it and adding the disclosure if so.",
  },
  {
    id: "i-urgency", title: "Urgency / scarcity claims — countdown timers & “only X left”", category: "Product", market: "us", marketLabel: "United States",
    rules: "Real, verifiable scarcity is generally acceptable; simulated urgency is a recurring FTC review topic under §5 and its dark-patterns guidance.",
    sources: [
      { label: "🇺🇸 FTC Act §5 — 15 U.S.C. §45", url: "https://www.ftc.gov/legal-library/browse/statutes/federal-trade-commission-act" },
      { label: "🇺🇸 FTC staff report — Bringing Dark Patterns to Light (2022)", url: "https://www.ftc.gov/reports/bringing-dark-patterns-light" },
    ],
    proof: { pages: "4 PDPs on your storefront", checkedAt: "Jun 17, 2026", observation: "Countdown timers and “only 3 left” messaging present; backing inventory data was not cross-checked in this scan." },
    rec: "Recommend confirming with qualified counsel and verifying that on-site urgency signals reflect actual stock or timing.",
  },
  {
    id: "i-cookies", title: "Non-essential cookies set before consent", category: "Data & Privacy", market: "eu", marketLabel: "European Union",
    rules: "Under the EU ePrivacy framework, non-essential cookies are commonly expected to require prior consent.",
    sources: [
      { label: "🇪🇺 ePrivacy Directive 2002/58/EC — Art. 5(3)", url: "https://eur-lex.europa.eu/LexUriServ/LexUriServ.do?uri=CELEX:32002L0058:EN:HTML" },
      { label: "🇪🇺 EDPB Guidelines 2/2023 — Art. 5(3) technical scope", url: "https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf" },
      { label: "🇪🇺 GDPR — Art. 7 consent conditions", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" },
    ],
    proof: { pages: "yourstore.com homepage — network trace", checkedAt: "Jun 17, 2026", observation: "3 cookies set before any consent interaction: _ga, _fbp, _hjid (t+0.8 s after page load)." },
    rec: "Recommend confirming with qualified counsel and adjusting the consent banner if needed.",
  },
  {
    id: "i-dsar", title: "DSAR response window not stated", category: "Data & Privacy", market: "eu", marketLabel: "European Union",
    rules: "GDPR commonly references a one-month response expectation for data-subject access requests.",
    sources: [{ label: "🇪🇺 GDPR — Art. 12(3)", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" }],
    proof: { pages: "yourstore.com/privacy · §4", checkedAt: "Jun 17, 2026", observation: "Data-subject rights are described, but no response timeframe is stated for access requests." },
    rec: "Recommend confirming with qualified counsel and stating the response window in your policy.",
  },
  {
    id: "i-withdraw", title: "No clear mechanism to withdraw consent", category: "Data & Privacy", market: "eu", marketLabel: "European Union",
    rules: "GDPR commonly expects withdrawing consent to be as easy as giving it.",
    sources: [{ label: "🇪🇺 GDPR — Art. 7(3)", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" }],
    proof: { pages: "yourstore.com account pages · /privacy — searched for a withdrawal control", checkedAt: "Jun 17, 2026", observation: "Consent is collected at signup; no self-serve withdrawal control found on the reviewed pages." },
    rec: "Recommend confirming with qualified counsel and adding a self-serve withdrawal control.",
  },
  {
    id: "i-cosmetics", title: "Cosmetics — EU Responsible Person disclosure missing", category: "Product", market: "eu", marketLabel: "European Union",
    rules: "EU Cosmetic Products Regulation commonly expects an EU-based Responsible Person to be identified for cosmetic products marketed into the EU.",
    sources: [{ label: "🇪🇺 Cosmetics Regulation (EC) 1223/2009 — Art. 4 & 19", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009R1223" }],
    proof: { pages: "3 sunscreen PDPs (SKU prefix SUN-)", checkedAt: "Jun 17, 2026", observation: "No Responsible Person disclosure found on any sampled page." },
    rec: "Recommend confirming with qualified counsel and surfacing a Responsible Person disclosure on cosmetics SKUs sold into the EU.",
    gatedByCat: "cosmetics",
  },
];

function IssuesTab({
  market, setMarket, activeCats, issueStatuses, setIssueStatus, focusIssueId,
}: {
  market: Market;
  setMarket: (m: Market) => void;
  activeCats: Set<CategoryKey>;
  productStats: ProductStats;
  issueStatuses: Record<string, IssueStatus>;
  setIssueStatus: (id: string, status: IssueStatus) => void;
  focusIssueId?: string | null;
}) {
  const t = useT();
  const items = ALL_ISSUES
    .filter(i => i.market === market)
    .filter(i => !i.gatedByCat || activeCats.has(i.gatedByCat));

  /* Scroll to the finding jumped from Overview ("Manage in Review Items →") */
  useEffect(() => {
    if (!focusIssueId) return;
    const timer = setTimeout(() => {
      document.getElementById(`issue-${focusIssueId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(timer);
  }, [focusIssueId]);

  const groups = CATEGORY_ORDER
    .map(cat => ({ cat, items: items.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      <div className="rounded-lg border border-[#E0DBF9] bg-[#F1EEFF] px-4 py-3 text-[12px] text-[#5254DA]">
        {t(
          "Review items state the facts found and the relevant rules alongside them, then recommend counsel review. They are not legal conclusions and do not assert any wrongdoing.",
          "审查项陈述所发现的事实，并在旁列出相关规则，然后建议交由律师审阅。它们不是法律结论，也不主张任何过错。",
        )}
      </div>
      <div className="flex items-center gap-2">
        <MarketBtn on={market === "us"} onClick={() => setMarket("us")}>🇺🇸 {t("United States", "美国")}</MarketBtn>
        <MarketBtn on={market === "eu"} onClick={() => setMarket("eu")}>🇪🇺 {t("European Union", "欧盟")}</MarketBtn>
      </div>
      <div className="space-y-3">
        {groups.map(g => (
          <IssueGroup
            key={g.cat}
            cat={g.cat}
            items={g.items}
            issueStatuses={issueStatuses}
            setIssueStatus={setIssueStatus}
            focusIssueId={focusIssueId}
          />
        ))}
      </div>
    </>
  );
}

function IssueGroup({
  cat, items, issueStatuses, setIssueStatus, focusIssueId,
}: {
  cat: string;
  items: Issue[];
  issueStatuses: Record<string, IssueStatus>;
  setIssueStatus: (id: string, status: IssueStatus) => void;
  focusIssueId?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const lang = useLang();
  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F7F7FC] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{CATEGORY_EMOJI[cat] ?? "•"}</span>
          <span className="text-[13px] font-semibold text-foreground">{lang === "zh" ? (ZH_CAT_NAME[cat] ?? cat) : cat}</span>
          <span className="text-[11px] text-muted-foreground">· {items.length}</span>
        </div>
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {items.map(it => (
            <IssueRow
              key={it.id}
              issue={it}
              status={issueStatuses[it.id] ?? "open"}
              onStatusChange={s => setIssueStatus(it.id, s)}
              focused={it.id === focusIssueId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  in_remediation: "In remediation",
  resolved: "Resolved",
};
const ZH_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "待处理",
  acknowledged: "已知悉",
  in_remediation: "整改中",
  resolved: "已解决",
};
/* Full category display names (Review Items groups / order) → Chinese */
const ZH_CAT_NAME: Record<string, string> = {
  "Data & Privacy": "数据与隐私",
  "Terms & Conditions": "条款与条件",
  "Product": "产品",
  "Intellectual Property": "知识产权",
  "Corporate Entity": "公司主体",
};

function IssueRow({
  issue, status, onStatusChange, focused,
}: {
  issue: Issue;
  status: IssueStatus;
  onStatusChange: (s: IssueStatus) => void;
  focused?: boolean;
}) {
  const lang = useLang();
  const t = useT();
  return (
    <div
      id={`issue-${issue.id}`}
      className={cn("px-4 py-3 space-y-3 bg-[#F7F7FC] scroll-mt-4", focused && "ring-2 ring-inset ring-[#5254DA] bg-[#F1EEFF]")}
    >
      <div className="text-[13px] font-semibold text-foreground">{Z(lang, issue.id, "title", issue.title)}</div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Relevant Rules and Context", "相关规则与背景")}</div>
        <p className="text-[12px] text-foreground mt-0.5">{Z(lang, issue.id, "rules", issue.rules)}</p>
      </div>
      {issue.sources && issue.sources.length > 0 && <SourcesBlock sources={issue.sources} />}
      {issue.proof && <ProofBlock proof={locProof(lang, issue.id, issue.proof)} />}
      <div className="border-l-2 border-[#5254DA] pl-3 text-[12px] text-[#5254DA]">{Z(lang, issue.id, "rec", issue.rec)}</div>
      <div className="flex items-center gap-1 pt-1">
        {(["open", "acknowledged", "in_remediation", "resolved"] as IssueStatus[]).map(s => {
          const active = status === s;
          const isResolved = s === "resolved";
          const canClick = !isResolved; // Resolved only scan-driven
          return (
            <button
              key={s}
              disabled={!canClick}
              onClick={() => canClick && onStatusChange(s)}
              title={isResolved ? t("Resolved is only set by the next scan when the finding no longer triggers.", "「已解决」仅由下一次扫描在该发现不再触发时设置。") : ""}
              className={cn(
                "text-[11px] px-2 py-1 rounded border transition-colors",
                active && "bg-[#F1EEFF] text-[#5254DA] border-[#E0DBF9] font-medium",
                !active && canClick && "border-border text-muted-foreground hover:bg-white",
                !canClick && !active && "border-dashed border-slate-200 text-slate-400 cursor-not-allowed",
              )}
            >
              {lang === "zh" ? ZH_STATUS_LABELS[s] : STATUS_LABELS[s]}
              {isResolved && !active && (
                <span className="ml-1 opacity-60">🔒</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── History tab ── */
function HistoryTab() {
  const t = useT();
  const lang = useLang();
  const zh = lang === "zh";
  const history = [
    { date: "Jun 17, 2026", dateZh: "2026 年 6 月 17 日", tag: "latest", score: 89, pages: 11, corpus: "v2026.06", delta: "+2", new: "+2 new (cosmetics EU RP, urgency claims)", newZh: "+2 项新增（化妆品欧盟 RP、紧迫声称）", resolved: "2 resolved (age screen, affiliate disclosure)", resolvedZh: "2 项已解决（年龄核验、联盟披露）" },
    { date: "Jun 10, 2026", dateZh: "2026 年 6 月 10 日", tag: null,     score: 87, pages: 11, corpus: "v2026.06", delta: "+2", new: "+2 new", newZh: "+2 项新增", resolved: "1 resolved", resolvedZh: "1 项已解决" },
    { date: "Jun 3, 2026",  dateZh: "2026 年 6 月 3 日",  tag: null,     score: 85, pages: 10, corpus: "v2026.05", delta: null, new: "first baseline · 5 review items opened", newZh: "首次基线 · 打开 5 项审查项", resolved: null, resolvedZh: null },
  ];
  return (
    <>
      <div className="rounded-lg border border-[#E0DBF9] bg-[#F1EEFF] px-4 py-3 text-[12px] text-[#5254DA]">
        {t(
          "Reviews re-run automatically every 7 days. Each run is version-stamped so you can see what changed — new review items, resolutions, and score movement over time.",
          "审阅每 7 天自动重新运行。每次运行都带版本标记，便于你看到变化 —— 新增的审查项、已解决项，以及分数随时间的变动。",
        )}
      </div>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-3">{t("Review history · acme-outdoor.com", "审阅历史 · acme-outdoor.com")}</h3>
          <div className="space-y-4">
            {history.map((h, i) => (
              <div key={i} className={cn("relative pl-5 border-l-2 pb-1", i === 0 ? "border-[#5254DA]" : "border-slate-200")}>
                <span className={cn("absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full", i === 0 ? "bg-[#5254DA]" : "bg-slate-300")} />
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-foreground">{zh ? h.dateZh : h.date}</span>
                  {h.tag && <span className="text-[11px] uppercase font-bold bg-[#5254DA] text-white rounded px-1.5 py-0.5">{zh ? "最新" : h.tag}</span>}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">
                  <span className="font-bold text-[#5254DA] mr-2">{h.score}%</span>
                  {zh ? `检查了 ${h.pages} 个页面` : `${h.pages} pages checked`}
                  <span className="text-slate-400 ml-2">· {t("rule corpus", "规则库")} {h.corpus}</span>
                  {h.delta && <span className="text-emerald-700 font-medium mx-2">▲ {h.delta}</span>}
                  {h.new && <span className="text-amber-700 font-medium mx-2">{zh ? h.newZh : h.new}</span>}
                  {h.resolved && <span className="text-[#5254DA] font-medium mx-2">{zh ? h.resolvedZh : h.resolved}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ── Setup tab ── */
function SetupTab({
  activeCats, toggleCategory, pendingRescan, rescanNow, lang, setLang, onReplayOnboarding,
}: {
  activeCats: Set<CategoryKey>;
  toggleCategory: (key: CategoryKey) => void;
  pendingRescan: boolean;
  rescanNow: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  onReplayOnboarding?: () => void;
}) {
  const t = useT();
  const zh = lang === "zh";
  const catLabel = (key: CategoryKey) => (zh ? ZH_CAT_LABELS[key].label : CATEGORY_LABELS[key].label);
  const metaFor = (key: CategoryKey) => {
    const base = zh ? ZH_CAT_LABELS[key].meta : CATEGORY_LABELS[key].meta;
    const isDetected = CATEGORY_LABELS[key].meta.startsWith("detected");
    const isPossible = CATEGORY_LABELS[key].meta.startsWith("possible");
    if (activeCats.has(key)) {
      if (isDetected) return base;
      if (isPossible) return t("possible · confirmed by you", "可能 · 你已确认");
      return t("manually enabled", "手动启用");
    }
    if (["cosmetics", "kids"].includes(key)) return t("detected · unchecked by you", "已检测 · 你已取消勾选");
    if (isPossible) return base;
    return t("not detected", "未检测到");
  };

  return (
    <>
      {/* Language / 语言 — full-page EN/中文 toggle */}
      <Card className="shadow-none border border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Languages size={15} className="text-[#5254DA]" />
              <h3 className="text-[14px] font-semibold text-foreground">{t("Language", "语言")}</h3>
              <span className="text-[12px] text-muted-foreground">{t("Display language for this report", "本报告的显示语言")}</span>
            </div>
            <div className="flex rounded-sm border border-border overflow-hidden text-[12px] font-medium shrink-0">
              <button
                onClick={() => setLang("en")}
                className={cn("px-3 py-1.5 transition-colors", lang === "en" ? "bg-[#5254DA] text-white" : "text-muted-foreground bg-white hover:bg-[#F7F7FC]")}
              >
                EN
              </button>
              <button
                onClick={() => setLang("zh")}
                className={cn("px-3 py-1.5 transition-colors border-l border-border", lang === "zh" ? "bg-[#5254DA] text-white" : "text-muted-foreground bg-white hover:bg-[#F7F7FC]")}
              >
                中文
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">{t("Target markets", "目标市场")}</h3>
          <p className="text-[12px] text-muted-foreground">{t("Rule sets are applied per enabled market. Add or remove a market to change what your weekly review covers.", "规则集按已启用的市场分别应用。增删市场即可改变每周审阅的覆盖范围。")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"><Check size={12} /> {t("United States", "美国")}</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"><Check size={12} /> {t("European Union", "欧盟")}</span>
            <a href="#" onClick={e => e.preventDefault()} className="text-[12px] text-[#5254DA] font-semibold ml-1 hover:underline">{t("+ Enable market", "+ 启用市场")}</a>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t("Product categories", "商品品类")}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {t(
                  "Regulated-category rules are only applied to categories you actually sell. Toggle any category to preview how the change updates your Overview — the new rule scope applies at your next weekly scan (or run now below).",
                  "受管制品类的规则只应用于你实际销售的品类。切换任一品类即可预览它如何更新你的总览 —— 新的规则范围将在下一次每周扫描时生效（或在下方立即运行）。",
                )}
              </p>
            </div>
            {pendingRescan && (
              <button
                onClick={rescanNow}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#5254DA] text-white hover:bg-[#4547BA] flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> {t("Rescan now", "立即重新扫描")}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-2">
            {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key => (
              <CatRow
                key={key}
                checked={activeCats.has(key)}
                label={catLabel(key)}
                meta={metaFor(key)}
                onToggle={() => toggleCategory(key)}
              />
            ))}
          </div>
          <div className="border-t border-border pt-3 text-[11px] text-muted-foreground">
            {t(
              "Detection runs at onboarding and on each weekly review. Add or remove categories any time — Overview updates immediately, real re-scan runs on cadence or on demand.",
              "检测在引导时及每次每周审阅时运行。可随时增删品类 —— 总览会立即更新，真实的重新扫描按周期或按需运行。",
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">{t("Connection & scan", "连接与扫描")}</h3>
          <div className="flex items-center gap-2 text-[12px] text-emerald-700"><Check size={14} /> {t("Store connected via your Seel merchant account", "已通过你的 Seel 商家账户连接店铺")}</div>
          <RowKV k={t("Connected store", "已连接店铺")} v="acme-outdoor.com" />
          <RowKV k={t("Review cadence", "审阅周期")} v={t("Automatic, every 7 days", "自动，每 7 天一次")} />
          <RowKV k={t("Data retention", "数据保留")} v={t("12 months · delete on request", "12 个月 · 可按需删除")} />
        </CardContent>
      </Card>

      {onReplayOnboarding && (
        <button
          onClick={onReplayOnboarding}
          className="text-[11px] text-muted-foreground hover:text-[#5254DA] hover:underline"
        >
          {t("↺ Replay onboarding (demo)", "↺ 重放引导流程（demo）")}
        </button>
      )}
    </>
  );
}

function CatRow({ checked, label, meta, onToggle }: {
  checked: boolean;
  label: string;
  meta: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-[12px] text-left py-1 px-2 -mx-2 rounded hover:bg-[#F7F7FC] transition-colors group"
    >
      <span className={cn(
        "w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center transition-colors",
        checked ? "bg-[#5254DA] border-[#5254DA]" : "border-border bg-white group-hover:border-[#5254DA]",
      )}>
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      <span className={cn(checked ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
      <span className="text-[11px] text-muted-foreground ml-auto">{meta}</span>
    </button>
  );
}

/* ── Small kv row ── */
function RowKV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground font-medium text-right">{v}</span>
    </div>
  );
}
