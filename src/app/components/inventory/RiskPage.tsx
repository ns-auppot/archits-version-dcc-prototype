import { useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Database,
  User,
  Bot,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  ChevronRight,
  Clock,
} from "lucide-react";
import { DATA_STORES } from "./AccessRadarDiagram";
import {
  IDENTITY_REGISTRY,
  MACHINE_TYPES,
  IDENTITY_TYPE_LABEL,
  type RegistryIdentity,
} from "./identityRegistry";
import { SidePanel } from "./SidePanel";
import { PlaceholderOutline } from "./PlaceholderOutline";

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["SPII", "PHI", "PCI", "PFI", "PAI", "PSI", "PII", "BII"] as const;
type CategoryAcronym = (typeof CATEGORY_ORDER)[number];

const CATEGORY_META: Record<CategoryAcronym, { label: string; color: string; weight: number }> = {
  SPII: { label: "Sensitive PII",   color: "#e05252", weight: 10 },
  PHI:  { label: "Health Info",     color: "#f59e0b", weight: 9  },
  PCI:  { label: "Payment Cards",   color: "#f97316", weight: 9  },
  PFI:  { label: "Financial",       color: "#d4952a", weight: 8  },
  PAI:  { label: "Credentials",     color: "#7c6fb0", weight: 8  },
  PSI:  { label: "Sensitive Pers.", color: "#0ea5e9", weight: 7  },
  PII:  { label: "Personal Info",   color: "#0ea584", weight: 5  },
  BII:  { label: "Business Info",   color: "#64748b", weight: 4  },
};

const PLATFORM_LABEL: Record<string, string> = {
  "google-drive": "Google Drive",
  "sharepoint":   "SharePoint",
  "aws-s3":       "AWS S3",
  "azure-blob":   "Azure Blob",
  "postgresql":   "PostgreSQL",
  "oracle":       "Oracle DB",
  "aws-rds":      "AWS RDS",
  "azure-sql":    "Azure SQL",
  "endpoint":     "Endpoint",
};

const RISK_LEVEL_COLOR: Record<string, string> = {
  Critical: "#e05252",
  High:     "#f97316",
  Medium:   "#f59e0b",
  Low:      "#22c55e",
};

// ── Data type → category mapping ─────────────────────────────────────────────

const DATA_TYPE_CATEGORY: Partial<Record<string, CategoryAcronym>> = {};

const CAT_TYPES: [CategoryAcronym, string[]][] = [
  ["PII",  ["Personal Names","Email Addresses","Telephone Numbers","Postal Addresses","Birthdates","Gender","Age","Nationality","IP Addresses","MAC Addresses","Domain Names","URI Hosts","UUIDs"]],
  ["SPII", ["Social Security Numbers","Driver Licenses","National IDs","Passports","Taxpayer IDs"]],
  ["PSI",  ["Ethnicity and Race","Marital Status","Religious Beliefs","Political Opinions","Sexual Orientation"]],
  ["PCI",  ["Payment Cards"]],
  ["PFI",  ["Bank Account Information","Financial IDs","Currency","Tax Records","Credit Scores"]],
  ["PHI",  ["Medical Records","Medical Diagnoses","Healthcare IDs","Healthcare Provider IDs","Biometric Data","Genetic Data"]],
  ["PAI",  ["Passwords","Private Keys","Secrets and Tokens","Public Keys","MFA Seeds"]],
  ["BII",  ["Source Code","Company Names","Trade Secrets","Legal Privileges"]],
];
for (const [cat, types] of CAT_TYPES) {
  for (const t of types) DATA_TYPE_CATEGORY[t] = cat;
}

// ── Risk computation helpers ──────────────────────────────────────────────────

function getRiskLevel(score: number): "Critical" | "High" | "Medium" | "Low" {
  if (score >= 80) return "Critical";
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

// ── Derived store risk data ───────────────────────────────────────────────────

const storeRiskData = DATA_STORES.map((store) => {
  const cats = new Set<CategoryAcronym>();
  for (const dt of store.dataTypes) {
    const cat = DATA_TYPE_CATEGORY[dt];
    if (cat) cats.add(cat);
  }
  const catArr = [...cats];
  const maxWeight   = catArr.length > 0 ? Math.max(...catArr.map((c) => CATEGORY_META[c].weight)) : 0;
  const weightSum   = catArr.reduce((s, c) => s + CATEGORY_META[c].weight, 0);
  const riskScore   = Math.min(100, Math.round((weightSum / 45) * 100));
  const topCat      = catArr.sort((a, b) => CATEGORY_META[b].weight - CATEGORY_META[a].weight)[0] as CategoryAcronym | undefined;
  const identityCount = IDENTITY_REGISTRY.filter((i) => i.dataStores.includes(store.id)).length;
  return { ...store, categories: catArr, topCat, riskScore, riskLevel: getRiskLevel(riskScore), identityCount, maxWeight };
});

const storeRiskMap = new Map(storeRiskData.map((s) => [s.id, s.riskScore]));

// ── Derived identity exposure data ────────────────────────────────────────────

const identityRiskData = IDENTITY_REGISTRY.map((identity) => {
  const scores    = identity.dataStores.map((sid) => storeRiskMap.get(sid) ?? 0);
  const maxScore  = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore  = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const expScore  = Math.round(maxScore * 0.6 + avgScore * 0.4);
  return {
    ...identity,
    exposureScore: expScore,
    riskLevel: getRiskLevel(expScore),
    storeCount: identity.dataStores.length,
    isMachine: MACHINE_TYPES.has(identity.identityType),
  };
});

// ── Category chart data ───────────────────────────────────────────────────────

const categoryChartData = CATEGORY_ORDER.map((cat) => ({
  cat,
  label: CATEGORY_META[cat].label,
  color: CATEGORY_META[cat].color,
  weight: CATEGORY_META[cat].weight,
  storeCount: storeRiskData.filter((s) => s.categories.includes(cat)).length,
  dtCount: DATA_STORES.reduce(
    (n, s) => n + s.dataTypes.filter((dt) => DATA_TYPE_CATEGORY[dt] === cat).length,
    0,
  ),
}));

// ── 30-day trend (deterministic) ─────────────────────────────────────────────

function generateTrendData() {
  const rows: { label: string; critical: number; high: number; medium: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 1, 3 - i); // March 3, 2026 minus i days
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const x = 29 - i;
    const base = 3100 + Math.sin(x / 29 * Math.PI) * 800;
    const noise = Math.sin(x * 7.3) * 140 + Math.cos(x * 3.1) * 70;
    const total = Math.max(1600, Math.round(base + noise));
    rows.push({
      label,
      critical: Math.round(total * 0.12 + Math.sin(x * 2.7) * 35),
      high:     Math.round(total * 0.28 + Math.sin(x * 4.1) * 55),
      medium:   Math.round(total * 0.44),
    });
  }
  return rows;
}
const trendData = generateTrendData();

// ── Recent events (deterministic) ────────────────────────────────────────────

interface RiskEvent {
  id: string;
  age: string;
  store: string;
  storeId: string;
  platform: string;
  identity: string;
  identityId: string;
  dt: string;
  cat: CategoryAcronym;
  severity: "Critical" | "High" | "Medium";
}

const AGE_POOL = [
  "14 min ago","38 min ago","1 hr ago","2 hr ago","3 hr ago","5 hr ago",
  "7 hr ago","Yesterday 4 pm","Yesterday 2 pm","Yesterday 11 am",
  "2 days ago","2 days ago","3 days ago","3 days ago","4 days ago","5 days ago",
];
const SEV_POOL: ("Critical" | "High" | "Medium")[] = [
  "Critical","High","High","Medium","Critical","High","Medium","High","Critical","Medium",
  "High","Medium","Critical","High","Medium","High",
];

function generateEvents(): RiskEvent[] {
  const riskyStores = [...storeRiskData].sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);
  const riskyIds    = [...identityRiskData].sort((a, b) => b.exposureScore - a.exposureScore).slice(0, 10);
  return AGE_POOL.map((age, i) => {
    const store    = riskyStores[i % riskyStores.length];
    const identity = riskyIds[i % riskyIds.length];
    const dt       = store.dataTypes[(i * 3) % store.dataTypes.length];
    const cat      = (DATA_TYPE_CATEGORY[dt] ?? store.topCat ?? "PII") as CategoryAcronym;
    return { id: `evt-${i}`, age, store: store.name, storeId: store.id, platform: store.platform, identity: identity.name, identityId: identity.id, dt, cat, severity: SEV_POOL[i % SEV_POOL.length] };
  });
}
const recentEvents = generateEvents();

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const color = RISK_LEVEL_COLOR[level] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full shrink-0"
      style={{ fontSize: "10px", fontWeight: 600, background: `${color}20`, color }}
    >
      {level}
    </span>
  );
}

function StatCard({
  label, value, sub, icon, color, trend,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  color: string; trend?: "up" | "down";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)" }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-text-bright" style={{ fontSize: "var(--widget-kpi-lg)", fontWeight: 600 }}>
          {value}
        </span>
        {trend && (
          <span
            className="flex items-center gap-0.5 mb-1"
            style={{ fontSize: "var(--widget-meta)", color: trend === "up" ? "#e05252" : "#22c55e" }}
          >
            {trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {sub}
          </span>
        )}
      </div>
      {sub && !trend && (
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>{sub}</span>
      )}
    </div>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border rounded-lg shadow-xl px-3 py-2" style={{ background: "var(--card)", fontSize: "11px" }}>
      <p className="text-muted-foreground mb-1" style={{ fontSize: "10px" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-foreground">{p.name}: <strong>{p.value.toLocaleString()}</strong></span>
        </div>
      ))}
    </div>
  );
}

function RiskEventDetail({ event }: { event: RiskEvent }) {
  const store    = storeRiskData.find((s) => s.id === event.storeId);
  const identity = identityRiskData.find((i) => i.id === event.identityId);
  const sevColor = RISK_LEVEL_COLOR[event.severity];
  const catColor = CATEGORY_META[event.cat]?.color ?? "#64748b";

  const ACTIONS = [
    `Review ${event.identity}'s access permissions on ${event.store}`,
    `Apply ${event.cat} data handling and retention policy`,
    `Audit recent access logs for data exfiltration patterns`,
  ];

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Severity header */}
      <div className="flex items-center gap-2">
        <span
          className="px-3 py-1 rounded-full"
          style={{ fontSize: "11px", fontWeight: 600, background: `${sevColor}20`, color: sevColor }}
        >
          {event.severity} Risk
        </span>
        <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{event.age}</span>
      </div>

      {/* Key facts */}
      <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
        {[
          { label: "Data Type",  value: event.dt },
          { label: "Category",   value: event.cat },
          { label: "Data Store", value: event.store },
          { label: "Identity",   value: event.identity },
          { label: "Platform",   value: PLATFORM_LABEL[event.platform] ?? event.platform },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className={`flex items-baseline justify-between gap-3 px-3 py-2.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
          >
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>{row.label}</span>
            <span className="text-text-bright text-right" style={{ fontSize: "12px", fontWeight: 500 }}>
              {row.label === "Category" ? (
                <span className="px-1.5 py-0.5 rounded" style={{ background: `${catColor}18`, color: catColor, fontWeight: 600, fontSize: "10px" }}>
                  {row.value}
                </span>
              ) : row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Store context */}
      {store && (
        <div>
          <div className="text-text-bright mb-2" style={{ fontSize: "12px", fontWeight: 600 }}>Store Risk Context</div>
          <div className="bg-surface-raised border border-border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Risk Score</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${store.riskScore}%`, background: store.topCat ? CATEGORY_META[store.topCat].color : "#64748b" }} />
                </div>
                <span className="text-foreground tabular-nums" style={{ fontSize: "11px" }}>{store.riskScore}/100</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Identities with Access</span>
              <span className="text-foreground" style={{ fontSize: "11px" }}>{store.identityCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Data Types</span>
              <span className="text-foreground" style={{ fontSize: "11px" }}>{store.dataTypes.length}</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {store.categories.slice(0, 6).map((cat) => (
                <span key={cat} className="px-1.5 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 600, background: `${CATEGORY_META[cat].color}18`, color: CATEGORY_META[cat].color }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Identity context */}
      {identity && (
        <div>
          <div className="text-text-bright mb-2" style={{ fontSize: "12px", fontWeight: 600 }}>Identity Exposure</div>
          <div className="bg-surface-raised border border-border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Exposure Score</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${identity.exposureScore}%`, background: "#0ea584" }} />
                </div>
                <span className="text-foreground tabular-nums" style={{ fontSize: "11px" }}>{identity.exposureScore}/100</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Type</span>
              <span className="text-foreground" style={{ fontSize: "11px" }}>{IDENTITY_TYPE_LABEL[identity.identityType]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Stores Accessible</span>
              <span className="text-foreground" style={{ fontSize: "11px" }}>{identity.storeCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommended actions */}
      <div>
        <div className="text-text-bright mb-2" style={{ fontSize: "12px", fontWeight: 600 }}>Recommended Actions</div>
        <div className="space-y-2">
          {ACTIONS.map((action, i) => (
            <div key={i} className="flex items-start gap-2 bg-surface-raised border border-border rounded-lg px-3 py-2.5">
              <ChevronRight size={11} className="text-primary shrink-0 mt-0.5" />
              <span className="text-foreground" style={{ fontSize: "11px" }}>{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RiskPage() {
  const [activeEvent, setActiveEvent]       = useState<RiskEvent | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const closePanel = useCallback(() => setActiveEvent(null), []);

  const topStores = useMemo(
    () => [...storeRiskData].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8),
    [],
  );

  const topIdentities = useMemo(
    () => [...identityRiskData].filter((i) => i.exposureScore > 0).sort((a, b) => b.exposureScore - a.exposureScore).slice(0, 8),
    [],
  );

  const highRiskStoreCount  = storeRiskData.filter((s) => s.riskScore >= 55).length;
  const overexposedIdCount  = identityRiskData.filter((i) => i.exposureScore >= 55).length;

  const filteredEvents = severityFilter === "All"
    ? recentEvents
    : recentEvents.filter((e) => e.severity === severityFilter);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-auto bg-background">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-6 py-3.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={15} style={{ color: "#e05252" }} />
            <span className="text-text-bright" style={{ fontSize: "var(--widget-page-title)", fontWeight: 600 }}>
              Risk
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-raised border border-border text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>
              Last 30 days
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity size={12} />
            <span style={{ fontSize: "var(--widget-meta)" }}>Updated 4 min ago</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 min-w-0">

        {/* ── Stat row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <PlaceholderOutline><StatCard label="Critical Findings"       value="2,847"                              sub="↑ 12% this week"             icon={<AlertTriangle size={14} />}  color="#e05252" trend="up"   /></PlaceholderOutline>
          <PlaceholderOutline><StatCard label="High-Risk Data Stores"   value={`${highRiskStoreCount} / ${DATA_STORES.length}`} sub="stores with high exposure" icon={<Database size={14} />}       color="#f97316"             /></PlaceholderOutline>
          <PlaceholderOutline><StatCard label="Policy Violations"       value="423"                                sub="↓ 8% this week"              icon={<Shield size={14} />}         color="#f59e0b" trend="down" /></PlaceholderOutline>
          <PlaceholderOutline><StatCard label="Overexposed Identities"  value={String(overexposedIdCount)}         sub="identities with high-risk access" icon={<User size={14} />}      color="#7c6fb0"             /></PlaceholderOutline>
        </div>

        {/* ── Two-column middle section ──────────────────────────────────────── */}
        <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "1fr 300px" }}>

          {/* LEFT charts */}
          <div className="space-y-4">

            {/* Risk by Data Category */}
            <PlaceholderOutline style={{ borderRadius: "12px" }}>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="mb-3">
                <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>
                  Risk by Data Category
                </div>
                <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
                  Stores with sensitive data findings per category
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 48, left: 96, bottom: 0 }}
                  barSize={11}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="rgba(148,163,184,0.08)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={94}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(148,163,184,0.04)" }} />
                  <Bar dataKey="storeCount" name="Stores" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Category legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 border-t border-border pt-3">
                {CATEGORY_ORDER.map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_META[cat].color }} />
                    <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>
                      <strong style={{ color: CATEGORY_META[cat].color }}>{cat}</strong> — {CATEGORY_META[cat].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            </PlaceholderOutline>

            {/* 30-Day Trend */}
            <PlaceholderOutline style={{ borderRadius: "12px" }}>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="mb-3">
                <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>
                  30-Day Risk Trend
                </div>
                <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
                  Risk events by severity — Critical and High
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e05252" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#e05252" stopOpacity={0.0}  />
                    </linearGradient>
                    <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}  />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="critical" name="Critical" stroke="#e05252" strokeWidth={1.5} fill="url(#gradC)" stackId="a" />
                  <Area type="monotone" dataKey="high"     name="High"     stroke="#f97316" strokeWidth={1.5} fill="url(#gradH)" stackId="a" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            </PlaceholderOutline>
          </div>

          {/* RIGHT ranked lists */}
          <div className="space-y-4">

            {/* Top At-Risk Stores */}
            <PlaceholderOutline style={{ borderRadius: "12px" }}>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>Top At-Risk Stores</div>
              </div>
              <div>
                {topStores.map((store, i) => (
                  <div key={store.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground/40 shrink-0 tabular-nums w-4 text-right" style={{ fontSize: "var(--widget-meta)" }}>
                      {i + 1}
                    </span>
                    <Database size={11} style={{ color: store.topCat ? CATEGORY_META[store.topCat].color : "#64748b", flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground truncate" style={{ fontSize: "var(--widget-body)" }}>
                        {store.name}
                      </div>
                      <div className="text-muted-foreground/60 truncate" style={{ fontSize: "var(--widget-meta)" }}>
                        {PLATFORM_LABEL[store.platform] ?? store.platform}
                      </div>
                      <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${store.riskScore}%`, background: store.topCat ? CATEGORY_META[store.topCat].color : "#64748b", opacity: 0.7 }}
                        />
                      </div>
                    </div>
                    <RiskBadge level={store.riskLevel} />
                  </div>
                ))}
              </div>
            </div>
            </PlaceholderOutline>

            {/* Most Exposed Identities */}
            <PlaceholderOutline style={{ borderRadius: "12px" }}>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>Most Exposed Identities</div>
              </div>
              <div>
                {topIdentities.map((id, i) => {
                  const Icon = id.isMachine ? Bot : User;
                  return (
                    <div key={id.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground/40 shrink-0 tabular-nums w-4 text-right" style={{ fontSize: "var(--widget-meta)" }}>
                        {i + 1}
                      </span>
                      <Icon size={11} style={{ color: "#0ea584", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground truncate" style={{ fontSize: "var(--widget-body)" }}>
                          {id.name}
                        </div>
                        <div className="text-muted-foreground/60" style={{ fontSize: "var(--widget-meta)" }}>
                          {IDENTITY_TYPE_LABEL[id.identityType]} · {id.storeCount} store{id.storeCount !== 1 ? "s" : ""}
                        </div>
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full" style={{ width: `${id.exposureScore}%`, background: "#0ea584", opacity: 0.65 }} />
                        </div>
                      </div>
                      <RiskBadge level={id.riskLevel} />
                    </div>
                  );
                })}
              </div>
            </div>
            </PlaceholderOutline>
          </div>
        </div>

        {/* ── Recent Risk Events ──────────────────────────────────────────────── */}
        <PlaceholderOutline style={{ borderRadius: "12px" }}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>
              Recent Risk Events
            </div>
            {/* Severity filter */}
            <div className="flex items-center gap-1.5">
              {(["All", "Critical", "High", "Medium"] as const).map((sev) => {
                const active = severityFilter === sev;
                const col = RISK_LEVEL_COLOR[sev] ?? "var(--primary)";
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className="px-2 py-0.5 rounded-md transition-all cursor-pointer border"
                    style={{
                      fontSize: "var(--widget-meta)",
                      fontWeight: 500,
                      background:   active ? `${col}18` : "transparent",
                      color:        active ? col : "var(--muted-foreground)",
                      borderColor:  active ? `${col}40` : "transparent",
                    }}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Time", "Identity", "Data Type", "Data Store", "Category", "Severity"].map((col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-2.5 text-muted-foreground"
                      style={{ fontSize: "var(--widget-meta)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => {
                  const catColor = CATEGORY_META[evt.cat]?.color ?? "#64748b";
                  return (
                    <tr
                      key={evt.id}
                      className="border-b border-border/50 last:border-0 hover:bg-foreground/[0.03] cursor-pointer transition-colors"
                      onClick={() => setActiveEvent(evt)}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock size={10} />
                          <span style={{ fontSize: "var(--widget-body-sm)" }}>{evt.age}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-foreground" style={{ fontSize: "var(--widget-body)" }}>{evt.identity}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-foreground" style={{ fontSize: "var(--widget-body)" }}>{evt.dt}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-foreground truncate block max-w-[200px]" style={{ fontSize: "var(--widget-body)" }}>{evt.store}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className="px-1.5 py-0.5 rounded-md"
                          style={{ fontSize: "var(--widget-meta)", fontWeight: 600, background: `${catColor}18`, color: catColor }}
                        >
                          {evt.cat}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <RiskBadge level={evt.severity} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </PlaceholderOutline>

      </div>

      {/* ── Event detail side panel ─────────────────────────────────────────── */}
      <SidePanel
        open={activeEvent !== null}
        onClose={closePanel}
        title={activeEvent?.dt ?? "Risk Event"}
        subtitle={activeEvent?.age}
        width={400}
      >
        {activeEvent && <RiskEventDetail event={activeEvent} />}
      </SidePanel>
    </div>
  );
}