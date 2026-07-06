/*
 * CompassPage — Seel Compass (Go-Global Readiness)
 * Interactive rebuild against merchant dashboard design system.
 * Content aligned with Michael's 6/25 review: 5 categories, 24 Product items in 5 sub-groups,
 * omit-not-label self-harm approach, hybrid category detection.
 *
 * Interaction model (Scheme B — immediate UI cascade):
 * Setup category toggle → UI immediately re-scores + re-counts + re-classifies items,
 * with a "pending rescan" banner indicating changes will apply at next weekly scan.
 */
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Check, AlertTriangle, MinusCircle, ChevronDown, Download, RefreshCw, X,
  Copy, Loader2, ArrowRight, ShieldCheck, Globe,
} from "lucide-react";

/* ── Types ── */
type SubTab = "overview" | "issues" | "ip" | "entity" | "history" | "setup";
type Market = "us" | "eu";
type State = "ok" | "warn" | "na" | "skip";
type IssueStatus = "open" | "acknowledged" | "in_remediation" | "resolved";
type ProductFilter = "all" | "review" | "verified" | "na";
type CategoryKey = "cosmetics" | "kids" | "alcohol" | "cbd" | "tobacco" | "firearms" | "supplements" | "pharma";

interface Ctrl {
  id: string;
  title: string;
  sub: string;
  state: State;                 // default state when applicable
  defaultOnState?: State;       // state when category dep is toggled ON (defaults to state)
  catKey?: CategoryKey;         // category dependency
  market?: Market;              // omit = both
  ev?: {
    rules?: string;
    reviewed?: string;
    sources?: string;
    rec?: string;
  };
}

/* ── Static base data ── */
const CATEGORIES = [
  { key: "dp", emoji: "🔒", label: "Data & Privacy",       us: 92, eu: 81, status: null },
  { key: "tc", emoji: "📄", label: "Terms & Conditions",   us: 86, eu: 88, status: null },
  { key: "pr", emoji: "🛍️", label: "Product",              us: null, eu: null, status: null }, // computed dynamically
  { key: "ip", emoji: "™️", label: "Intellectual Property", us: null, eu: null, status: "review", usOnly: true },
  { key: "en", emoji: "🏛️", label: "Corporate Entity",     us: null, eu: null, status: "ok",     usOnly: true },
];

const DEFAULT_ACTIVE_CATEGORIES: CategoryKey[] = ["cosmetics", "kids"];

const CATEGORY_LABELS: Record<CategoryKey, { label: string; meta: string; catalogHint: string }> = {
  cosmetics:  { label: "Cosmetics / topicals",              meta: "detected · 12 SKUs", catalogHint: "Sunscreen SKUs detected in catalog." },
  kids:       { label: "Children's products / toys",        meta: "detected · 4 SKUs",  catalogHint: "Kids' outdoor gear detected in catalog." },
  alcohol:    { label: "Alcohol",                            meta: "not detected",       catalogHint: "" },
  cbd:        { label: "CBD / hemp / cannabinoids",          meta: "not detected",       catalogHint: "" },
  tobacco:    { label: "Tobacco / vape / nicotine",          meta: "not detected",       catalogHint: "" },
  firearms:   { label: "Firearms / weapons",                 meta: "not detected",       catalogHint: "" },
  supplements:{ label: "Supplements / nutraceuticals",       meta: "not detected",       catalogHint: "" },
  pharma:     { label: "Pharmaceuticals / medical devices",  meta: "not detected",       catalogHint: "" },
};

/* Data & Privacy checklist */
const DP_ITEMS: Ctrl[] = [
  {
    id: "dp1", title: "Access / correct / delete / portability rights stated",
    sub: "Found in Privacy Policy, §4 “Your Rights”.", state: "ok",
    ev: {
      rules: "CCPA/CPRA and GDPR frameworks commonly expect consumers to be told how to access, correct, delete, and port their data.",
      reviewed: "Pulled the Privacy Policy linked in the site footer; the four rights are described in /privacy · §4 Your Rights. Language appears consistent with industry-standard disclosure.",
    },
  },
  {
    id: "dp2", title: "Option to limit use of sensitive data (location / biometric)",
    sub: "Element not found on reviewed pages.", state: "warn",
    ev: {
      rules: "Several US state privacy frameworks describe a consumer ability to limit the use of sensitive personal data.",
      sources: "your /privacy page · public web research",
      rec: "Review item: limit-use-of-sensitive-data disclosure appears to be missing. Recommend confirming with qualified counsel whether your markets require it and, if so, adding the disclosure.",
    },
  },
  {
    id: "dp3", title: "Data retention periods actually enforced",
    sub: "Not assessable by an automated scan — operational record.", state: "na",
    ev: { rules: "A point-in-time scan of public pages can read a stated retention period but cannot verify it is enforced operationally. Omitted rather than assumed either way." },
  },
  {
    id: "dp4", title: "Lawful basis for processing stated (GDPR Art. 6)",
    sub: "Found in Privacy Policy, §2 “How we use your data”.", state: "ok", market: "eu",
    ev: {
      rules: "GDPR commonly expects a stated lawful basis (consent, contract, legitimate interest) for each processing purpose.",
      reviewed: "Privacy Policy /privacy · §2 names a lawful basis per purpose.",
    },
  },
  {
    id: "dp5", title: "Non-essential cookies set before consent",
    sub: "Analytics cookies observed before a consent choice.", state: "warn", market: "eu",
    ev: {
      rules: "Under the EU ePrivacy framework, non-essential cookies are commonly expected to require prior consent. On load, analytics cookies were observed being set before any consent interaction.",
      sources: "network trace on your storefront homepage · public web research",
      rec: "Review item: cookies set pre-consent. Recommend confirming with qualified counsel and adjusting the consent banner if needed.",
    },
  },
];

/* Terms & Conditions */
const TC_ITEMS: Ctrl[] = [
  {
    id: "tc1", title: "Governing law & dispute-resolution clause present",
    sub: "Found in Terms of Service, §12.", state: "ok",
    ev: { reviewed: "Terms of Service /terms · §12 Governing Law names the governing jurisdiction and a dispute-resolution path." },
  },
  {
    id: "tc2", title: "Unqualified authenticity guarantee over third-party goods",
    sub: "Listing language may extend an absolute guarantee.", state: "warn",
    ev: {
      rules: "Product listing states “Authenticity Ensured — every item guaranteed genuine.” Unqualified authenticity guarantees that extend to third-party sellers are a recurring enforcement and review topic under the FTC Act §5 framework.",
      rec: "Review item: unqualified guarantee. Recommend confirming with qualified counsel whether the guarantee should be qualified (e.g. scope, sellers covered).",
    },
  },
  {
    id: "tc3", title: "Refunds honored within the stated window",
    sub: "Not assessable by an automated scan — timing / operational.", state: "na",
    ev: { rules: "A scan can read the stated refund window but cannot verify refunds are honored within it. Omitted, not guessed." },
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
        state: "warn", catKey: "cosmetics", defaultOnState: "warn", market: "eu",
        ev: {
          rules: "EU Cosmetic Products Regulation (EC) 1223/2009 commonly expects an EU-based Responsible Person to be identified for cosmetic products marketed into the EU.",
          reviewed: "Sampled 3 sunscreen product pages (SKU prefix SUN-). None surface a Responsible Person disclosure. UK listings would require an equivalent under the UK Cosmetic Regulation.",
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
      { id: "p-green",   title: "Environmental / “green” claims — “eco,” “natural,” “sustainable”", sub: "Language aligns with FTC Green Guides guidance.", state: "ok" },
      { id: "p-pricing", title: "Reference / discount pricing displays a prior-price basis", sub: "“Was $X” references an actual sold-at price within the prior 90 days.", state: "ok" },
    ],
  },
  {
    key: "safety", title: "Product safety, conformity & disclosures", count: 6,
    items: [
      { id: "p-kids-safety", title: "Children's products / toys — safety standards & choking-hazard rules", sub: "Kids' outdoor gear detected. Age labels and small-parts warnings present.", state: "ok", catKey: "kids", defaultOnState: "ok" },
      { id: "p-ce-ukca",     title: "CE / UKCA conformity markings displayed where required", sub: "Markings shown on regulated goods sold into EU / UK.", state: "ok" },
      { id: "p-gpsr",        title: "EU Responsible Person named for goods sold into the EU (GPSR)", sub: "Named for general merchandise. Cosmetics-specific gap tracked above.", state: "ok" },
      { id: "p-inci",        title: "Allergen / ingredient / INCI labeling on ingestibles & cosmetics", sub: "INCI ingredient lists present on all sampled cosmetic PDPs.", state: "ok", catKey: "cosmetics", defaultOnState: "ok" },
      { id: "p-prop65",      title: "Prop 65 / EU REACH substance-restriction signals", sub: "Prop 65 warnings surfaced on relevant CA-shipping listings.", state: "ok" },
      { id: "p-hazmat",      title: "Restricted-shipment / hazmat — batteries, aerosols, flammables", sub: "Battery-containing SKUs carry the required transport disclosures.", state: "ok" },
    ],
  },
  {
    key: "ip-mkt", title: "IP & marketing integrity", count: 2,
    items: [
      { id: "p-counterfeit", title: "Counterfeit / unauthorized-reseller risk", sub: "All listings appear sourced from the brand directly or trusted independent sellers. (Separate from own-brand trademark screening — see the Intellectual Property tab.)", state: "ok" },
      { id: "p-endorsement", title: "Endorsement / influencer / review disclosures (#ad, review authenticity)", sub: "Sponsored posts carry FTC-compliant disclosure; no fake-review signals detected.", state: "ok" },
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
        sub: "Countdown timers & “only 3 left” on 4 PDPs — substantiation not confirmed.", state: "warn",
        ev: {
          rules: "FTC has flagged unsubstantiated urgency messaging under §5 and its 2024 dark-patterns guidance. Real, verifiable scarcity is generally acceptable; simulated urgency is not.",
          reviewed: "4 PDPs display “only 3 left” or countdown timers. Backing inventory data was not cross-checked in this scan.",
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
    ? { review: 4, notAssessable: 41 }  // T&C 1 + D&P 1 + IP 1 + Entity 1 = 4
    : { review: 3, notAssessable: 33 }; // D&P EU 3
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

function StateBadge({ state }: { state: State }) {
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0", stateStyle[state].badge)}>
      {stateStyle[state].badgeText}
    </span>
  );
}

function ControlRow({ ctrl, activeCats }: { ctrl: Ctrl; activeCats: Set<CategoryKey> }) {
  const [open, setOpen] = useState(false);
  const state = effState(ctrl, activeCats);
  const hasEv = !!ctrl.ev && state !== "skip";
  const isSkipped = state === "skip";
  const sub = isSkipped ? "Not applicable — category not in your catalog. Rules skipped." : ctrl.sub;
  return (
    <div className={cn("border border-border rounded-lg bg-white overflow-hidden", isSkipped && "opacity-70")}>
      <button
        onClick={() => hasEv && setOpen(v => !v)}
        className={cn(
          "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
          hasEv && "hover:bg-[#fafbfc] cursor-pointer",
          !hasEv && "cursor-default"
        )}
      >
        <StateIcon state={state} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground">{ctrl.title}</div>
          {sub && <div className="text-[12px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <StateBadge state={state} />
        {hasEv && (
          <ChevronDown
            size={16}
            className={cn("text-muted-foreground shrink-0 mt-0.5 transition-transform", open && "rotate-180")}
          />
        )}
      </button>
      {open && ctrl.ev && (
        <div className="border-t border-border bg-[#fafbfc] px-4 py-3 text-[12.5px] text-foreground space-y-2">
          {ctrl.ev.rules && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Relevant Rules and Context</div>
              <p className="text-foreground">{ctrl.ev.rules}</p>
            </div>
          )}
          {ctrl.ev.reviewed && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">What was reviewed</div>
              <p className="text-foreground">{ctrl.ev.reviewed}</p>
            </div>
          )}
          {ctrl.ev.sources && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Sources searched</div>
              <p className="text-muted-foreground italic">{ctrl.ev.sources}</p>
            </div>
          )}
          {ctrl.ev.rec && (
            <div className="border-l-2 border-[#6c47ff] pl-3 mt-2">
              <p className="text-[#6c47ff]">{ctrl.ev.rec}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-tab bar ── */
const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "issues",   label: "Review Items" },
  { key: "ip",       label: "Intellectual Property" },
  { key: "entity",   label: "Corporate Entity" },
  { key: "history",  label: "History" },
  { key: "setup",    label: "Setup" },
];

/* ── Onboarding wizard ── */
const OB_STEPS = ["Your store", "Verify", "Markets", "First scan", "Categories"];

/* Initial discovery scan — quick. Rule application & report composition happen
   after category confirmation, as an async "report generating" phase. */
const SCAN_STAGES = [
  { label: "Crawling your storefront",     detail: "11 pages — home, product pages, policy pages" },
  { label: "Reading policy documents",     detail: "Privacy Policy · Terms of Service · Refund Policy" },
  { label: "Cataloging products",          detail: "128 SKUs across 6 collections" },
  { label: "Detecting product categories", detail: "Cosmetics / topicals (12 SKUs) · Children's products (4 SKUs)" },
];

function OnboardingFlow({
  onComplete, onSkip,
}: {
  onComplete: (cats: Set<CategoryKey>) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState("acme-outdoor.com");
  const [authChecked, setAuthChecked] = useState(false);
  const [verify, setVerify] = useState<"idle" | "checking" | "done">("idle");
  const [copied, setCopied] = useState(false);
  const [markets, setMarkets] = useState<Set<Market>>(new Set<Market>(["us", "eu"]));
  const [scanIdx, setScanIdx] = useState(-1); // -1 = not started; STAGES.length = complete
  const [cats, setCats] = useState<Set<CategoryKey>>(new Set(DEFAULT_ACTIVE_CATEGORIES));
  // Report generation is async in production (~10 min); the demo fast-forwards it.
  const [report, setReport] = useState<"idle" | "generating" | "ready">("idle");

  const stages = SCAN_STAGES;
  const scanComplete = scanIdx >= stages.length;

  /* simulated scan progression */
  useEffect(() => {
    if (step !== 3 || scanComplete) return;
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

  const startVerify = () => {
    setVerify("checking");
    setTimeout(() => setVerify("done"), 1400);
  };

  const copyRecord = () => {
    navigator.clipboard?.writeText("seel-compass-verify=sc-7f3a9b2e").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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

  const detectedKeys: CategoryKey[] = ["cosmetics", "kids"];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">🧭 Seel Compass</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            A structured readiness review of your storefront — set up once, reviewed automatically every week.
          </p>
        </div>
        <button onClick={onSkip} className="text-[11.5px] text-muted-foreground hover:text-[#6c47ff] hover:underline shrink-0 mt-1">
          Skip (demo) →
        </button>
      </div>

      {/* Step indicator */}
      {report === "idle" && (
        <div className="flex items-center">
          {OB_STEPS.map((label, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <div key={label} className={cn("flex items-center", i > 0 && "flex-1")}>
                {i > 0 && <div className={cn("h-px flex-1 mx-2", isDone || isCurrent ? "bg-[#6c47ff]" : "bg-border")} />}
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0",
                    isDone && "bg-[#6c47ff] text-white",
                    isCurrent && "bg-[#f0edff] text-[#6c47ff] border border-[#6c47ff]",
                    !isDone && !isCurrent && "bg-slate-100 text-slate-400",
                  )}>
                    {isDone ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn(
                    "text-[11.5px] font-medium whitespace-nowrap",
                    isCurrent ? "text-[#6c47ff]" : isDone ? "text-foreground" : "text-muted-foreground",
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
              <h2 className="text-[15px] font-semibold text-foreground">Connect your store</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Seel Compass reads your public storefront pages — product listings, policies, and disclosures. Nothing is installed on your store.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Store domain</label>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-white focus-within:border-[#6c47ff]">
                  <Globe size={14} className="text-muted-foreground shrink-0" />
                  <input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="flex-1 text-[13px] outline-none bg-transparent"
                    placeholder="yourstore.com"
                  />
                </div>
              </div>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <span
                onClick={() => setAuthChecked(v => !v)}
                className={cn(
                  "w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center mt-0.5 transition-colors",
                  authChecked ? "bg-[#6c47ff] border-[#6c47ff]" : "border-border bg-white group-hover:border-[#6c47ff]",
                )}
              >
                {authChecked && <Check size={11} className="text-white" strokeWidth={3} />}
              </span>
              <span onClick={() => setAuthChecked(v => !v)} className="text-[12.5px] text-foreground">
                I confirm I am authorized to have this domain reviewed.
              </span>
            </label>
            <div className="flex justify-end pt-1">
              <PrimaryBtn disabled={!domain.trim() || !authChecked} onClick={() => setStep(1)}>
                Continue <ArrowRight size={13} />
              </PrimaryBtn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 — domain verification */}
      {report === "idle" && step === 1 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Verify you own {domain}</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Add this TXT record to your domain's DNS settings, then verify. This keeps reviews limited to domains you control.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[#fafbfc] px-4 py-3 flex items-center gap-3">
              <code className="flex-1 text-[12px] font-mono text-foreground break-all">seel-compass-verify=sc-7f3a9b2e</code>
              <button
                onClick={copyRecord}
                className="text-[11.5px] font-medium text-[#6c47ff] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <Copy size={12} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {verify === "done" ? (
              <div className="flex items-center gap-2 text-[12.5px] text-emerald-700 font-medium">
                <ShieldCheck size={15} /> Domain ownership verified (DNS TXT record)
              </div>
            ) : (
              <div className="text-[11.5px] text-muted-foreground">
                DNS changes usually propagate within minutes. You can also verify later from Setup.
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(0)} className="text-[12px] text-muted-foreground hover:text-foreground">← Back</button>
              {verify === "done" ? (
                <PrimaryBtn onClick={() => setStep(2)}>Continue <ArrowRight size={13} /></PrimaryBtn>
              ) : (
                <PrimaryBtn disabled={verify === "checking"} onClick={startVerify}>
                  {verify === "checking" ? (<><Loader2 size={13} className="animate-spin" /> Checking DNS…</>) : "I've added the record — Verify"}
                </PrimaryBtn>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — target markets */}
      {report === "idle" && step === 2 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Where do you sell?</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Rule sets are applied per market. Pick the markets you sell into today — you can add more later in Setup.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ObMarketCard on={markets.has("us")} onClick={() => toggleMarket("us")} flag="🇺🇸" name="United States" sub="Federal + state-level frameworks" />
              <ObMarketCard on={markets.has("eu")} onClick={() => toggleMarket("eu")} flag="🇪🇺" name="European Union" sub="GDPR, ePrivacy, product regulations" />
              <ObMarketCard disabled flag="🇬🇧" name="United Kingdom" sub="Coming soon" />
              <ObMarketCard disabled flag="🇨🇦" name="Canada" sub="Coming soon" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(1)} className="text-[12px] text-muted-foreground hover:text-foreground">← Back</button>
              <PrimaryBtn onClick={() => { setScanIdx(-1); setStep(3); }}>
                Start first scan <ArrowRight size={13} />
              </PrimaryBtn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — scan progress */}
      {report === "idle" && step === 3 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">
                {scanComplete ? "Scan complete" : `Scanning ${domain}…`}
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                {scanComplete
                  ? "Your storefront has been reviewed. One quick confirmation before we open the report."
                  : "This usually takes a couple of minutes. You can leave this page — we'll email you when it's ready."}
              </p>
            </div>
            {/* progress bar */}
            <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full rounded bg-[#6c47ff] transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((Math.max(scanIdx, 0) / stages.length) * 100))}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {stages.map((s, i) => {
                const stDone = i < scanIdx;
                const stCurrent = i === scanIdx && !scanComplete;
                return (
                  <div key={s.label} className={cn("flex items-start gap-2.5 px-3 py-2 rounded-lg", stCurrent && "bg-[#f6f2ff]")}>
                    <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center mt-0.5">
                      {stDone && <Check size={14} className="text-emerald-600" strokeWidth={2.5} />}
                      {stCurrent && <Loader2 size={14} className="text-[#6c47ff] animate-spin" />}
                      {!stDone && !stCurrent && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12.5px] font-medium", stDone || stCurrent ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
                      {(stDone || stCurrent) && <div className="text-[11.5px] text-muted-foreground mt-0.5">{s.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {scanComplete && (
              <div className="flex justify-end pt-1">
                <PrimaryBtn onClick={() => setStep(4)}>Review detected categories <ArrowRight size={13} /></PrimaryBtn>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4 — confirm categories */}
      {report === "idle" && step === 4 && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Confirm your product categories</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Regulated-category rules are only applied to categories you actually sell. We detected these from your catalog — uncheck anything that doesn't apply, or add categories you plan to launch.
              </p>
            </div>
            <div className="space-y-1">
              {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key => {
                const detected = detectedKeys.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCat(key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg border transition-colors",
                      cats.has(key) ? "border-[#dcd0ff] bg-[#faf8ff]" : "border-border bg-white hover:bg-[#fafbfc]",
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center transition-colors",
                      cats.has(key) ? "bg-[#6c47ff] border-[#6c47ff]" : "border-border bg-white",
                    )}>
                      {cats.has(key) && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[12.5px]", cats.has(key) ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {CATEGORY_LABELS[key].label}
                      </span>
                      {detected && CATEGORY_LABELS[key].catalogHint && (
                        <span className="block text-[11px] text-muted-foreground">{CATEGORY_LABELS[key].catalogHint}</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10.5px] font-medium rounded px-1.5 py-0.5 shrink-0",
                      detected ? "bg-[#f0edff] text-[#6c47ff]" : "bg-slate-50 text-slate-400",
                    )}>
                      {detected ? CATEGORY_LABELS[key].meta : "not detected"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11.5px] text-muted-foreground border-t border-border pt-3">
              Detection re-runs on every weekly review — newly detected categories will be suggested here, and you can adjust this list any time in Setup.
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(3)} className="text-[12px] text-muted-foreground hover:text-foreground">← Back</button>
              <PrimaryBtn onClick={() => setReport("generating")}>Finish setup <ArrowRight size={13} /></PrimaryBtn>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report generating — async, merchant can leave */}
      {report === "generating" && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 size={28} className="animate-spin text-[#6c47ff] mx-auto" />
            <div>
              <h2 className="text-[17px] font-bold text-foreground">Generating your first report…</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Applying {markets.has("eu") ? "United States and European Union" : "United States"} rule sets to your confirmed categories and composing findings with evidence.
              </p>
            </div>
            <div className="rounded-lg border border-[#e6dfff] bg-[#f6f2ff] px-4 py-3 text-[12.5px] text-[#4a3a8a] max-w-md mx-auto text-left">
              ⏱ <b>This usually takes about 10 minutes.</b> You can safely leave this page — we'll email you when your report is ready, and it will be waiting here under Compass.
            </div>
            <p className="text-[11px] text-muted-foreground">Demo note: fast-forwards in a few seconds.</p>
          </CardContent>
        </Card>
      )}

      {/* Report ready */}
      {report === "ready" && (
        <Card className="shadow-none border border-border">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-[40px] leading-none">🧭</div>
            <div>
              <h2 className="text-[17px] font-bold text-foreground">Your first report is ready</h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">{domain} · reviewed just now · next automatic review in 7 days</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="rounded-lg bg-[#f6f2ff] border border-[#e6dfff] px-3 py-3">
                <div className="text-2xl font-bold text-[#6c47ff]">{previewOverall}%</div>
                <div className="text-[10.5px] font-medium text-[#4a3a8a] mt-0.5">Overall readiness</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
                <div className="text-2xl font-bold text-amber-700">{previewReview}</div>
                <div className="text-[10.5px] font-medium text-amber-700 mt-0.5">Review items</div>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3">
                <div className="text-2xl font-bold text-emerald-700">{previewStats.verified}</div>
                <div className="text-[10.5px] font-medium text-emerald-700 mt-0.5">Product checks verified</div>
              </div>
            </div>
            <div className="pt-2">
              <PrimaryBtn onClick={() => onComplete(cats)}>Open your report <ArrowRight size={13} /></PrimaryBtn>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2">
              ⓘ Informational only — not legal advice, and not a law firm. Review items recommend confirming with qualified counsel.
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
        "inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-md transition-colors",
        disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#6c47ff] text-white hover:bg-[#5b3ed6]",
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
        on && "border-[#6c47ff] bg-[#faf8ff]",
        !on && !disabled && "border-border bg-white hover:bg-[#fafbfc]",
        disabled && "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70",
      )}
    >
      <span className="text-[18px] leading-none mt-0.5">{flag}</span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[13px] font-medium", disabled ? "text-slate-400" : "text-foreground")}>{name}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
      {on && <Check size={14} className="text-[#6c47ff] shrink-0 mt-0.5" strokeWidth={2.5} />}
    </button>
  );
}

/* ── Main component ── */
export default function CompassPage() {
  const [onboarded, setOnboarded] = useState(false);
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

  if (!onboarded) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <OnboardingFlow
          onComplete={cats => { setActiveCats(new Set(cats)); setOnboarded(true); }}
          onSkip={() => setOnboarded(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
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
                    ? "border-[#6c47ff] text-[#6c47ff]"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {st.label}
                {st.key === "issues" && (
                  <span className="ml-1 text-[10px] font-bold text-amber-600">
                    ·{baseReviewItemCounts(market).review + productStats.review}
                  </span>
                )}
                {st.key === "setup" && pendingRescan && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#6c47ff] align-middle" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pb-1 text-xs text-muted-foreground">
            <span>Your latest review · Jun 17, 2026</span>
            <button className="flex items-center gap-1.5 text-xs text-[#6c47ff] hover:underline">
              <Download size={12} /> Download report (PDF)
            </button>
          </div>
        </div>

        {/* Pending rescan banner — sticky across tabs */}
        {pendingRescan && (
          <div className="rounded-lg border border-[#dcd0ff] bg-[#f6f2ff] px-4 py-3 flex items-center gap-3 text-[12.5px]">
            <RefreshCw size={14} className="text-[#6c47ff]" />
            <div className="flex-1 text-[#4a3a8a]">
              <b>Category set updated.</b> Scores and findings below preview the new rule scope. Changes will apply automatically at your next weekly scan — or run a fresh scan now.
            </div>
            <button
              onClick={rescanNow}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[#6c47ff] text-white hover:bg-[#5b3ed6]"
            >
              Rescan now
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
          />
        )}
        {tab === "issues" && (
          <IssuesTab
            market={market} setMarket={setMarket}
            activeCats={activeCats}
            productStats={productStats}
            issueStatuses={issueStatuses} setIssueStatus={setIssueStatus}
          />
        )}
        {tab === "ip" && <IpTab />}
        {tab === "entity" && <EntityTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "setup" && (
          <SetupTab
            activeCats={activeCats}
            toggleCategory={toggleCategory}
            pendingRescan={pendingRescan}
            rescanNow={rescanNow}
            onReplayOnboarding={() => { setOnboarded(false); setTab("overview"); }}
          />
        )}

        {/* Footer legal disclaimer */}
        <p className="text-[11px] text-muted-foreground pt-6 border-t border-border mt-8">
          ⓘ Informational only — not legal advice, and not a law firm. Review items point to relevant rules and recommend confirming with qualified counsel.
        </p>
      </div>
    </div>
  );
}

/* ── Overview tab ── */
function OverviewTab({
  market, setMarket, activeCats, productStats, overallScore,
  productFilter, setProductFilter, collapsedGroups, toggleGroupCollapse, goTo,
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
}) {
  const dpItems = forMarket(DP_ITEMS, market);
  const tcItems = forMarket(TC_ITEMS, market);
  const base = baseReviewItemCounts(market);
  const totalReview = base.review + productStats.review;

  // Sections collapsed by default; expand on header click or category-card click.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
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
      <div className="rounded-lg border border-border bg-white px-4 py-3 flex items-center gap-4 text-[12.5px] flex-wrap">
        <span className="text-muted-foreground">📈 Since last review <span className="text-foreground font-medium">(Jun 10)</span>:</span>
        <span className="text-emerald-700 font-medium">▲ readiness +2</span>
        <span className="text-amber-700 font-medium">+2 new review items</span>
        <span className="text-[#6c47ff] font-medium">2 resolved</span>
        <button onClick={() => goTo("history")} className="ml-auto text-[#6c47ff] font-medium hover:underline">View history →</button>
      </div>

      {/* Market toggle */}
      <div className="flex items-center gap-2">
        <MarketBtn on={market === "us"} onClick={() => setMarket("us")}>🇺🇸 United States</MarketBtn>
        <MarketBtn on={market === "eu"} onClick={() => setMarket("eu")}>🇪🇺 European Union</MarketBtn>
        <MarketBtn disabled>🇬🇧 UK</MarketBtn>
        <MarketBtn disabled>🇨🇦 Canada</MarketBtn>
      </div>

      {/* Score hero — 6 cards side by side */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-none border border-border bg-[#f6f2ff]">
          <CardContent className="p-4">
            <div className="text-[12px] font-semibold text-[#6c47ff] mb-2">🧭 Overall</div>
            <div className="text-3xl leading-none font-bold text-[#6c47ff]">{overallScore}%</div>
            <div className="mt-2 h-1 bg-[#e6dfff] rounded overflow-hidden">
              <div className="h-full rounded bg-[#6c47ff]" style={{ width: `${overallScore}%` }} />
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
              else if (cat.key === "ip") goTo("ip");
              else if (cat.key === "en") goTo("entity");
            }}
          />
        ))}
      </div>

      {/* Summary line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground pt-1">
        <span><span className="font-bold text-amber-700">{totalReview}</span> review items</span>
        <span><span className="font-bold text-slate-500">{base.notAssessable}</span> not assessable by scan (omitted)</span>
        <span><span className="font-bold text-slate-500">{productStats.notDetectedCats}</span> categories not detected in your catalog</span>
      </div>

      {/* Data & Privacy */}
      <SectionHeader
        id="section-dp"
        emoji="🔒"
        title="Data & Privacy"
        verified={market === "us" ? "62 / 64 verified" : "42 / 46 verified · 3 review items"}
        collapsed={!openSections.has("dp")}
        onToggle={() => toggleSection("dp")}
      />
      {openSections.has("dp") && (
        <div className="space-y-2">{dpItems.map(c => <ControlRow key={c.id} ctrl={c} activeCats={activeCats} />)}</div>
      )}

      {/* Terms & Conditions */}
      <SectionHeader
        id="section-tc"
        emoji="📄"
        title="Terms & Conditions"
        verified={market === "us" ? "48 / 50 verified · 1 review item" : "37 / 39 verified"}
        collapsed={!openSections.has("tc")}
        onToggle={() => toggleSection("tc")}
      />
      {openSections.has("tc") && (
        <div className="space-y-2">{tcItems.map(c => <ControlRow key={c.id} ctrl={c} activeCats={activeCats} />)}</div>
      )}

      {/* Product */}
      <SectionHeader
        id="section-pr"
        emoji="🛍️"
        title="Product"
        verified={`${productStats.verified} / ${productStats.assessed} verified · ${productStats.review} review item${productStats.review === 1 ? "" : "s"} · ${productStats.notDetectedCats} categories not detected`}
        collapsed={!openSections.has("pr")}
        onToggle={() => toggleSection("pr")}
      />
      {openSections.has("pr") && (
        <>
          <p className="text-[12.5px] text-muted-foreground mb-2">
            Regulated-category rules apply only to the categories you sell — auto-detected during scan, confirm in{" "}
            <button
              type="button"
              onClick={() => goTo("setup")}
              className="text-[#6c47ff] font-medium hover:underline"
            >
              Setup
            </button>.
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
                  title={g.title}
                  count={items.length}
                  collapsed={collapsed}
                  onToggle={() => toggleGroupCollapse(g.key)}
                />
                {!collapsed && (
                  <div className="space-y-2">
                    {filtered.map(c => <ControlRow key={c.id} ctrl={c} activeCats={activeCats} />)}
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
        on && "bg-[#6c47ff] text-white border-[#6c47ff]",
        !on && !disabled && "bg-white text-foreground border-border hover:bg-[#fafbfc]",
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
      className="w-full flex items-center justify-between gap-2 mt-6 mb-2 scroll-mt-4 py-1 rounded hover:bg-[#f8fafc] transition-colors text-left"
    >
      <div className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-bold text-foreground">
          <span className="mr-1">{emoji}</span>{title}
        </h2>
        <span className="text-[11.5px] text-emerald-700 font-medium">· {verified}</span>
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
      className="w-full flex items-center justify-between gap-2 mt-5 mb-2 py-1 hover:bg-[#f8fafc] rounded transition-colors"
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
  const chips: { key: ProductFilter; label: string; count: number; color: string }[] = [
    { key: "all",      label: "All",           count: counts.all,      color: "" },
    { key: "review",   label: "Review items",  count: counts.review,   color: "amber" },
    { key: "verified", label: "Verified",      count: counts.verified, color: "emerald" },
    { key: "na",       label: "Not applicable",count: counts.na,       color: "slate" },
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
              "text-[11.5px] font-medium px-3 py-1 rounded-full border transition-colors",
              active && c.color === "amber"    && "bg-amber-50 text-amber-700 border-amber-200",
              active && c.color === "emerald"  && "bg-emerald-50 text-emerald-700 border-emerald-200",
              active && c.color === "slate"    && "bg-slate-100 text-slate-700 border-slate-300",
              active && c.color === ""         && "bg-[#f0edff] text-[#6c47ff] border-[#dcd0ff]",
              !active                          && "bg-white text-muted-foreground border-border hover:bg-[#fafbfc]",
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
  // Product uses dynamic productScore
  const numeric = cat.key === "pr" ? productScore : (market === "us" ? cat.us : cat.eu);
  const scoreWarn = numeric != null && numeric < 90;

  if (cat.status === "review") {
    return (
      <Card onClick={onClick} className="shadow-none border border-border cursor-pointer hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="text-[12px] font-semibold text-muted-foreground leading-tight">
              <span className="mr-1">{cat.emoji}</span>{cat.label}
            </div>
            {cat.usOnly && <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">US</span>}
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <AlertTriangle size={12} /> Review
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (cat.status === "ok") {
    return (
      <Card onClick={onClick} className="shadow-none border border-border cursor-pointer hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="text-[12px] font-semibold text-muted-foreground leading-tight">
              <span className="mr-1">{cat.emoji}</span>{cat.label}
            </div>
            {cat.usOnly && <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">US</span>}
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
              <Check size={12} /> Good standing
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card onClick={onClick} className="shadow-none border border-border cursor-pointer hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="text-[12px] font-semibold text-muted-foreground mb-2">
          <span className="mr-1">{cat.emoji}</span>{cat.label}
        </div>
        <div className={cn("text-2xl font-semibold", scoreWarn ? "text-amber-600" : "text-foreground")}>
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
const CATEGORY_ORDER = ["Data & Privacy", "Terms & Conditions", "Product", "Intellectual Property", "Corporate Entity"];
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
  sources?: string;
  rec: string;
  gatedByCat?: CategoryKey; // if unchecked, this issue disappears
}

const ALL_ISSUES: Issue[] = [
  { id: "i-unqual",   title: "Unqualified authenticity guarantee over third-party goods", category: "Terms & Conditions", market: "us", marketLabel: "United States", rules: "Listing states “Authenticity Ensured — every item guaranteed genuine,” extending to independent sellers. Unqualified authenticity guarantees are a recurring enforcement and review topic under the FTC Act §5 framework.", sources: "Your product listing pages · public web research", rec: "Recommend confirming with qualified counsel whether to qualify the guarantee (scope / sellers covered)." },
  { id: "i-sens",     title: "Option to limit use of sensitive data not surfaced", category: "Data & Privacy", market: "us", marketLabel: "United States", rules: "Several US state privacy frameworks describe a consumer ability to limit use of sensitive personal data (e.g. precise location, biometric). The reviewed Privacy Policy did not surface a corresponding disclosure or control.", sources: "Your /privacy page · public web research", rec: "Recommend confirming with qualified counsel whether your markets require it and adding the disclosure if so." },
  { id: "i-tm",       title: "Trademark name similarity — “Acme Outdoor” vs registered mark", category: "Intellectual Property", market: "us", marketLabel: "United States", rules: "A USPTO trademark database search on the brand name returned a similar registered mark, “ACME OUTDOORS” (Reg. No. 5,xxx,xxx — Class 25, apparel), owned by an unrelated party.", rec: "Recommend confirming with qualified counsel whether the similarity poses an infringement risk before scaling US marketing. Annual monitoring available." },
  { id: "i-annual",   title: "Annual report filing due — Delaware entity", category: "Corporate Entity", market: "us", marketLabel: "United States", rules: "Delaware Secretary of State record shows the entity is in good standing, with the next annual report / franchise tax due Mar 1, 2027. Filing late risks loss of good standing.", rec: "Recommend calendaring the filing; Seel Compass can monitor good-standing status on an ongoing basis." },
  { id: "i-urgency",  title: "Urgency / scarcity claims — countdown timers & “only X left”", category: "Product", market: "us", marketLabel: "United States", rules: "FTC has flagged unsubstantiated urgency messaging under §5 and its 2024 dark-patterns guidance. Real, verifiable scarcity is generally acceptable; simulated urgency is not.", sources: "4 PDPs on your storefront displaying countdown timers or “only 3 left” language · public web research", rec: "Recommend confirming with qualified counsel and verifying that on-site urgency signals reflect actual stock or timing." },
  { id: "i-cookies",  title: "Non-essential cookies set before consent", category: "Data & Privacy", market: "eu", marketLabel: "European Union", rules: "On load, analytics cookies were observed being set before any consent interaction. Under the EU ePrivacy framework, non-essential cookies are commonly expected to require prior consent.", sources: "Network trace on your storefront homepage · public web research", rec: "Recommend confirming with qualified counsel and adjusting the consent banner if needed." },
  { id: "i-dsar",     title: "DSAR response window not stated", category: "Data & Privacy", market: "eu", marketLabel: "European Union", rules: "The Privacy Policy describes data-subject rights but does not state a response timeframe for data-subject access requests. GDPR commonly references a one-month response expectation.", rec: "Recommend confirming with qualified counsel and stating the response window in your policy." },
  { id: "i-withdraw", title: "No clear mechanism to withdraw consent", category: "Data & Privacy", market: "eu", marketLabel: "European Union", rules: "Consent is collected at signup, but the reviewed pages do not surface an equally easy way to withdraw it. GDPR commonly expects withdrawing consent to be as easy as giving it.", rec: "Recommend confirming with qualified counsel and adding a self-serve withdrawal control." },
  { id: "i-cosmetics",title: "Cosmetics — EU Responsible Person disclosure missing", category: "Product", market: "eu", marketLabel: "European Union", rules: "EU Cosmetic Products Regulation (EC) 1223/2009 commonly expects an EU-based Responsible Person to be identified for cosmetic products marketed into the EU.", sources: "3 sunscreen product pages (SKU prefix SUN-) on your storefront · public web research", rec: "Recommend confirming with qualified counsel and surfacing a Responsible Person disclosure on cosmetics SKUs sold into the EU.", gatedByCat: "cosmetics" },
];

function IssuesTab({
  market, setMarket, activeCats, issueStatuses, setIssueStatus,
}: {
  market: Market;
  setMarket: (m: Market) => void;
  activeCats: Set<CategoryKey>;
  productStats: ProductStats;
  issueStatuses: Record<string, IssueStatus>;
  setIssueStatus: (id: string, status: IssueStatus) => void;
}) {
  const items = ALL_ISSUES
    .filter(i => i.market === market)
    .filter(i => !i.gatedByCat || activeCats.has(i.gatedByCat));

  const groups = CATEGORY_ORDER
    .map(cat => ({ cat, items: items.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      <div className="rounded-lg border border-[#e6dfff] bg-[#f6f2ff] px-4 py-3 text-[12.5px] text-[#4a3a8a]">
        Review items state the facts found and the relevant rules alongside them, then recommend counsel review.
        They are not legal conclusions and do not assert any wrongdoing.
      </div>
      <div className="flex items-center gap-2">
        <MarketBtn on={market === "us"} onClick={() => setMarket("us")}>🇺🇸 United States</MarketBtn>
        <MarketBtn on={market === "eu"} onClick={() => setMarket("eu")}>🇪🇺 European Union</MarketBtn>
      </div>
      <div className="space-y-3">
        {groups.map(g => (
          <IssueGroup
            key={g.cat}
            cat={g.cat}
            items={g.items}
            issueStatuses={issueStatuses}
            setIssueStatus={setIssueStatus}
          />
        ))}
      </div>
    </>
  );
}

function IssueGroup({
  cat, items, issueStatuses, setIssueStatus,
}: {
  cat: string;
  items: Issue[];
  issueStatuses: Record<string, IssueStatus>;
  setIssueStatus: (id: string, status: IssueStatus) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#fafbfc] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px]">{CATEGORY_EMOJI[cat] ?? "•"}</span>
          <span className="text-[13.5px] font-semibold text-foreground">{cat}</span>
          <span className="text-[11.5px] text-muted-foreground">· {items.length}</span>
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

function IssueRow({
  issue, status, onStatusChange,
}: {
  issue: Issue;
  status: IssueStatus;
  onStatusChange: (s: IssueStatus) => void;
}) {
  return (
    <div className="px-4 py-3 space-y-2 bg-[#fafbfc]">
      <div className="text-[13px] font-semibold text-foreground">{issue.title}</div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Relevant Rules and Context</div>
        <p className="text-[12.5px] text-foreground mt-0.5">{issue.rules}</p>
      </div>
      {issue.sources && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sources searched</div>
          <p className="text-[12.5px] text-muted-foreground italic mt-0.5">{issue.sources}</p>
        </div>
      )}
      <div className="border-l-2 border-[#6c47ff] pl-3 text-[12.5px] text-[#6c47ff]">{issue.rec}</div>
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
              title={isResolved ? "Resolved is only set by the next scan when the finding no longer triggers." : ""}
              className={cn(
                "text-[11px] px-2 py-1 rounded border transition-colors",
                active && "bg-[#f0edff] text-[#6c47ff] border-[#dcd0ff] font-medium",
                !active && canClick && "border-border text-muted-foreground hover:bg-white",
                !canClick && !active && "border-dashed border-slate-200 text-slate-400 cursor-not-allowed",
              )}
            >
              {STATUS_LABELS[s]}
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

/* ── IP tab ── */
function IpTab() {
  return (
    <>
      <div className="rounded-lg border border-[#e6dfff] bg-[#f6f2ff] px-4 py-3 text-[12.5px] text-[#4a3a8a]">
        <span className="font-semibold">Trademark name screening only.</span> This does not cover design-patent, utility-patent, or full freedom-to-operate analysis, and is not a legal opinion.
        Counterfeit / unauthorized-reseller risk on the merchant's own inventory is tracked separately under Product.
      </div>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">Trademark name screening — “Acme Outdoor”</h3>
          <p className="text-[12.5px] text-muted-foreground">Searched the USPTO trademark database for the brand name and close variants, filtered by relevant goods/services class.</p>
          <RowKV k="Database searched" v="USPTO TESS — text search" />
          <RowKV k="Brand name"        v="Acme Outdoor" />
          <RowKV k="Similar registered mark found" v={<span className="text-amber-700">ACME OUTDOORS · Class 25 · Reg. 5,xxx,xxx</span>} />
          <RowKV k="Owner"                v="Unrelated third party" />
          <RowKV k="Recommended next step" v="Counsel review before scaling US marketing" />
        </CardContent>
      </Card>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-2">
          <h3 className="text-[14px] font-semibold text-foreground">Ongoing monitoring</h3>
          <p className="text-[12.5px] text-muted-foreground">If no conflicts are found in a future scan, Seel Compass notes that and offers continued annual screening to catch new registrations.</p>
          <div className="flex items-center gap-2 text-[12.5px] text-emerald-700 mt-2">
            <Check size={14} /> Annual trademark-name monitoring — enabled
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ── Corporate Entity tab ── */
function EntityTab() {
  return (
    <>
      <div className="rounded-lg border border-[#e6dfff] bg-[#f6f2ff] px-4 py-3 text-[12.5px] text-[#4a3a8a]">
        Helps you think through US entity structure and surfaces good-standing signals from public Secretary of State records.
        {" "}
        <span className="font-semibold">Informational only</span> — confirm structure decisions with qualified counsel / a tax advisor.
      </div>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">Entity questionnaire</h3>
          <p className="text-[12.5px] text-muted-foreground">“Have you incorporated a US entity? If yes, share the details below.”</p>
          <RowKV k="US entity incorporated?" v="Yes" />
          <RowKV k="State of formation"      v="Delaware" />
          <RowKV k="Entity type"             v="C-corp" />
          <RowKV k="Registered agent"        v={<span className="text-emerald-700 inline-flex items-center gap-1"><Check size={12} /> On file</span>} />
        </CardContent>
      </Card>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">Good-standing check — Delaware SoS</h3>
          <p className="text-[12.5px] text-muted-foreground">Queried the Delaware Secretary of State portal for status and filing currency.</p>
          <RowKV k="Status" v={<span className="text-emerald-700 font-medium">Good standing</span>} />
          <RowKV k="Annual report / franchise tax" v={<span className="text-amber-700 font-medium">Due Mar 1, 2027</span>} />
          <RowKV k="Last checked" v="Jun 17, 2026" />
        </CardContent>
      </Card>
    </>
  );
}

/* ── History tab ── */
function HistoryTab() {
  const history = [
    { date: "Jun 17, 2026", tag: "latest", score: 89, pages: 11, delta: "+2", new: "+2 new (cosmetics EU RP, urgency claims)", resolved: "2 resolved (age screen, affiliate disclosure)" },
    { date: "Jun 10, 2026", tag: null,     score: 87, pages: 11, delta: "+2", new: "+2 new",  resolved: "1 resolved" },
    { date: "Jun 3, 2026",  tag: null,     score: 85, pages: 10, delta: null, new: "first baseline · 5 review items opened", resolved: null },
  ];
  return (
    <>
      <div className="rounded-lg border border-[#e6dfff] bg-[#f6f2ff] px-4 py-3 text-[12.5px] text-[#4a3a8a]">
        Reviews re-run automatically every 7 days. Each run is version-stamped so you can see what changed — new review items, resolutions, and score movement over time.
      </div>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-3">Review history · acme-outdoor.com</h3>
          <div className="space-y-4">
            {history.map((h, i) => (
              <div key={i} className={cn("relative pl-5 border-l-2 pb-1", i === 0 ? "border-[#6c47ff]" : "border-slate-200")}>
                <span className={cn("absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full", i === 0 ? "bg-[#6c47ff]" : "bg-slate-300")} />
                <div className="flex items-baseline gap-2">
                  <span className="text-[12.5px] font-semibold text-foreground">{h.date}</span>
                  {h.tag && <span className="text-[10px] uppercase font-bold bg-[#6c47ff] text-white rounded px-1.5 py-0.5">{h.tag}</span>}
                </div>
                <div className="text-[12.5px] text-muted-foreground mt-1">
                  <span className="font-bold text-[#6c47ff] mr-2">{h.score}%</span>
                  {h.pages} pages checked
                  {h.delta && <span className="text-emerald-700 font-medium mx-2">▲ {h.delta}</span>}
                  {h.new && <span className="text-amber-700 font-medium mx-2">{h.new}</span>}
                  {h.resolved && <span className="text-[#6c47ff] font-medium mx-2">{h.resolved}</span>}
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
  activeCats, toggleCategory, pendingRescan, rescanNow, onReplayOnboarding,
}: {
  activeCats: Set<CategoryKey>;
  toggleCategory: (key: CategoryKey) => void;
  pendingRescan: boolean;
  rescanNow: () => void;
  onReplayOnboarding?: () => void;
}) {
  return (
    <>
      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">Target markets</h3>
          <p className="text-[12.5px] text-muted-foreground">Rule sets are applied per enabled market. Add or remove a market to change what your weekly review covers.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"><Check size={12} /> United States</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"><Check size={12} /> European Union</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">United Kingdom</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">Canada</span>
            <a href="#" onClick={e => e.preventDefault()} className="text-[12px] text-[#6c47ff] font-semibold ml-1 hover:underline">+ Enable market</a>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Product categories</h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Regulated-category rules are only applied to categories you actually sell. Toggle any category to preview how the change updates your Overview — the new rule scope applies at your next weekly scan (or run now below).
              </p>
            </div>
            {pendingRescan && (
              <button
                onClick={rescanNow}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#6c47ff] text-white hover:bg-[#5b3ed6] flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> Rescan now
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-2">
            {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key => (
              <CatRow
                key={key}
                checked={activeCats.has(key)}
                label={CATEGORY_LABELS[key].label}
                meta={activeCats.has(key)
                  ? (CATEGORY_LABELS[key].meta.startsWith("detected") ? CATEGORY_LABELS[key].meta : "manually enabled")
                  : (["cosmetics","kids"].includes(key) ? "detected · unchecked by you" : "not detected")
                }
                onToggle={() => toggleCategory(key)}
              />
            ))}
          </div>
          <div className="border-t border-border pt-3 text-[11.5px] text-muted-foreground">
            Detection runs at onboarding and on each weekly review. Add or remove categories any time — Overview updates immediately, real re-scan runs on cadence or on demand.
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">Authorization & verification</h3>
          <div className="flex items-center gap-2 text-[12.5px] text-emerald-700"><Check size={14} /> I confirm I am authorized to have this domain reviewed</div>
          <div className="flex items-center gap-2 text-[12.5px] text-emerald-700"><Check size={14} /> Domain ownership verified (DNS TXT record)</div>
          <RowKV k="Review cadence" v="Automatic, every 7 days" />
          <RowKV k="Data retention" v="12 months · delete on request" />
        </CardContent>
      </Card>

      {onReplayOnboarding && (
        <button
          onClick={onReplayOnboarding}
          className="text-[11.5px] text-muted-foreground hover:text-[#6c47ff] hover:underline"
        >
          ↺ Replay onboarding (demo)
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
      className="flex items-center gap-2 text-[12.5px] text-left py-1 px-2 -mx-2 rounded hover:bg-[#fafbfc] transition-colors group"
    >
      <span className={cn(
        "w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center transition-colors",
        checked ? "bg-[#6c47ff] border-[#6c47ff]" : "border-border bg-white group-hover:border-[#6c47ff]",
      )}>
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      <span className={cn(checked ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
      <span className="text-[11.5px] text-muted-foreground ml-auto">{meta}</span>
    </button>
  );
}

/* ── Small kv row ── */
function RowKV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12.5px] py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground font-medium text-right">{v}</span>
    </div>
  );
}
