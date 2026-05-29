import React, { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Users, ChevronDown, Check, ArrowRight } from "lucide-react";
import { RISK_TYPES, type RiskTypeDef, type RiskRule } from "../../shared/risk-rules";
import { DataMotionWidget } from "./DataMotionWidget";
import { DataStoresWidget } from "./DataStoresWidget";
import { RiskTypeIcon } from "../ui/RiskTypeIcon";
import { RisksHero } from "./RiskWidgetVariants";
import { WidgetCard } from "../ui/WidgetCard";

// ═══════════════════════════════════════════════════════════════════════════════
//  CATEGORIES — identical to GoogleDriveDashboard
// ═══════════════════════════════════════════════════════════════════════════════

const CATS = [
  { key: "PII",  label: "PII",  full: "Personally Identifiable Information",  color: "#60a5fa", textColor: "var(--cat-text-pii)"  },
  { key: "SPII", label: "SPII", full: "Sensitive PII",                         color: "#f87171", textColor: "var(--cat-text-spii)" },
  { key: "PSI",  label: "PSI",  full: "Personal Sensitive Information",        color: "#fb923c", textColor: "var(--cat-text-psi)"  },
  { key: "PCI",  label: "PCI",  full: "Payment Card Industry",                 color: "#fbbf24", textColor: "var(--cat-text-pci)"  },
  { key: "PFI",  label: "PFI",  full: "Personal Financial Information",        color: "#34d399", textColor: "var(--cat-text-pfi)"  },
  { key: "PHI",  label: "PHI",  full: "Protected Health Information",          color: "#22d3ee", textColor: "var(--cat-text-phi)"  },
  { key: "PAI",  label: "PAI",  full: "Personal Account Information",          color: "#c084fc", textColor: "var(--cat-text-pai)"  },
  { key: "BII",  label: "BII",  full: "Business Identifiable Information",     color: "#f9a8d4", textColor: "var(--cat-text-bii)"  },
] as const;
type Cat = typeof CATS[number]["key"];
const T2C: Record<string, Cat> = {
  "Personal Names": "PII",       "Email Addresses": "PII",     "Telephone Numbers": "PII",
  "Postal Addresses": "PII",     "Birthdates": "PII",          "Gender": "PII",
  "Age": "PII",                  "Nationality": "PII",         "IP Addresses": "PII",
  "MAC Addresses": "PII",        "Domain Names": "PII",        "URI Hosts": "PII",
  "UUIDs": "PII",                "Device IDs": "PII",          "Browser Fingerprints": "PII",
  "Geolocation Data": "PII",     "Vehicle IDs": "PII",         "Student Records": "PII",
  "Education IDs": "PII",
  "Social Security Numbers": "SPII", "Driver Licenses": "SPII", "National IDs": "SPII",
  "Passports": "SPII",               "Taxpayer IDs": "SPII",   "Voter Registration IDs": "SPII",
  "Ethnicity and Race": "PSI",   "Marital Status": "PSI",      "Religious Beliefs": "PSI",
  "Political Opinions": "PSI",   "Sexual Orientation": "PSI",  "Immigration Status": "PSI",
  "Payment Cards": "PCI",
  "Bank Account Information": "PFI", "Financial IDs": "PFI",   "Currency": "PFI",
  "Securities IDs": "PFI",           "Credit Scores": "PFI",   "Income Information": "PFI",
  "Tax Records": "PFI",              "Corporate Tax IDs": "PFI",
  "Medical Records": "PHI",          "Medical Diagnoses": "PHI",
  "Healthcare IDs": "PHI",           "Healthcare Provider IDs": "PHI",
  "Health Insurance IDs": "PHI",     "Prescription Information": "PHI",
  "Biometric Data": "PHI",           "Genetic Data": "PHI",
  "Passwords": "PAI",     "Private Keys": "PAI",   "Public Keys": "PAI",
  "Secrets and Tokens": "PAI",  "Security Questions": "PAI",  "MFA Seeds": "PAI",
  "Source Code": "BII",   "Company Names": "BII",
  "Trade Secrets": "BII", "Legal Privileges": "BII",
};
const catOf  = (t: string): Cat => T2C[t] ?? "PII";
const catDef = (k: Cat) => CATS.find(c => c.key === k)!;
function hexA(hex: string, opacity: number) {
  return `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AppStoreEntry {
  id: string;
  name: string;
  short: string;
  sensitiveCount: number;
  dataTypes: { name: string; count: number }[];
}

export interface AppDashboardConfig {
  title: string;
  subtitle: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  /** Singular/plural unit label e.g. "file", "column", "object", "document" */
  sensitiveLabel: string;
  /** Plural form, e.g. "files", "columns", "objects" */
  sensitiveLabelPlural: string;
  storeViewDesc: string;
  stores: AppStoreEntry[];
  identityTypes: { type: string; count: number; color: string }[];
  postureSummary: { checked: number; passed: number; failed: number };
  failedRules: {
    id: string;
    severity: "critical" | "high" | "medium" | "low";
    name: string;
    scope: "app" | string[];
  }[];
  /** Hide the "N not connected | Connect" badge in DataStoresWidget */
  hideNotConnected?: boolean;
  /** Total volume in bytes for all stores in this platform — drives the DataStoresWidget KPI */
  dataStoreVolumeBytes?: number;
  /** Per-store volume breakdown shown in the DataStoresWidget hover tooltip */
  volumeBreakdown?: { label: string; bytes: number }[];
  /** FilterKey for this platform (e.g. "aws", "azure", "on-prem") — appended as ?source= in KPI click-throughs */
  sourceFilterKey?: string;
  /** Datastore group id used to filter Risk page (e.g. "google-drive", "aws-s3") */
  appFilterKey?: string;
  /** Demo flag: force the Risks widget to show the zero-findings empty state */
  emptyRisks?: boolean;
  /** Hero header config — logo only; gradient and CTA are neutral */
  hero: {
    logo: ReactNode;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RISK CHIP
// ═══════════════════════════════════════════════════════════════════════════════

type RiskLevel = "critical" | "high" | "medium" | "low";
const RISK_CHIP_META: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "#ef444422" },
  high:     { label: "High",     color: "#fb923c", bg: "#fb923c22" },
  medium:   { label: "Medium",   color: "#fbbf24", bg: "#fbbf2422" },
  low:      { label: "Low",      color: "#4ade80", bg: "#4ade8022" },
};

function RiskChip({ level }: { level: RiskLevel }) {
  const { label, color, bg } = RISK_CHIP_META[level];
  return (
    <div className="flex items-center gap-1.5 rounded-full px-3 py-1 border shrink-0"
      style={{ background: bg, borderColor: `${color}55`, fontSize: "var(--widget-body)", fontWeight: 600, color }}>
      <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: color, boxShadow: `0 0 6px ${color}` }} />
      {label} Risk
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IDENTITY WITH ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

function IdentityWithAccessCard({ identityTypes }: { identityTypes: AppDashboardConfig["identityTypes"] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = identityTypes.reduce((s, i) => s + i.count, 0);
  const hoveredItem = identityTypes.find(i => i.type === hovered);
  return (
    <WidgetCard className="rounded-xl p-4 flex flex-col gap-3" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)" }}>Identities with Access</span>
        <Users size={16} className="text-muted-foreground opacity-50" />
      </div>
      <div className="flex items-end gap-3">
        <span className="text-text-bright" style={{ fontSize: "var(--widget-kpi-lg)", fontWeight: 600, lineHeight: 1 }}>{total}</span>
      </div>
      <div className="relative">
        <div className="flex rounded-full overflow-hidden gap-px" style={{ height: "calc(var(--spacing) * 1.5)" }}>
          {identityTypes.map(({ type, count, color }) => (
            <div key={type} onMouseEnter={() => setHovered(type)} onMouseLeave={() => setHovered(null)}
              style={{ flex: count, background: color, opacity: hovered === null || hovered === type ? 0.85 : 0.25, transition: "opacity 120ms", cursor: "default" }} />
          ))}
        </div>
        {hoveredItem && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1.5 border border-border pointer-events-none"
            style={{ background: "var(--surface-raised)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap", zIndex: 50 }}>
            <div className="flex items-center gap-2">
              <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: hoveredItem.color }} />
              <span className="text-text-bright" style={{ fontSize: "var(--widget-body-sm)", fontWeight: 600 }}>{hoveredItem.type}</span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>{hoveredItem.count}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {identityTypes.map(({ type, color }) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: color }} />
            <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>{type}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TREEMAP LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

interface TmCell { id: string; x: number; y: number; w: number; h: number; }

function layoutTreemap(items: { id: string; value: number }[], W: number, H: number, gap = 3): TmCell[] {
  if (!items.length || W <= 0 || H <= 0) return [];
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total  = sorted.reduce((s, i) => s + i.value, 0);
  function split(arr: typeof sorted, x: number, y: number, w: number, h: number, sub: number): TmCell[] {
    if (!arr.length) return [];
    if (arr.length === 1) return [{ id: arr[0].id, x, y, w: Math.max(0, w), h: Math.max(0, h) }];
    const horiz = w >= h;
    let best = 1, bestScore = Infinity, cum = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      cum += arr[i].value;
      const f = cum / sub;
      const score = horiz
        ? Math.max(w * f / h, h / (w * f), w * (1 - f) / h, h / (w * (1 - f)))
        : Math.max(w / (h * f), h * f / w, w / (h * (1 - f)), h * (1 - f) / w);
      if (score < bestScore) { bestScore = score; best = i + 1; }
    }
    const L = arr.slice(0, best), R = arr.slice(best);
    const Ls = L.reduce((s, i) => s + i.value, 0), Rs = sub - Ls;
    if (horiz) {
      const lw = w * (Ls / sub);
      return [...split(L, x, y, lw - gap / 2, h, Ls), ...split(R, x + lw + gap / 2, y, w - lw - gap / 2, h, Rs)];
    }
    const lh = h * (Ls / sub);
    return [...split(L, x, y, w, lh - gap / 2, Ls), ...split(R, x, y + lh + gap / 2, w, h - lh - gap / 2, Rs)];
  }
  return split(sorted, 0, 0, W, H, total);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CURSOR POPOVER
// ══════════════════════════════════════════════════════════════════════════════

const POPOVER_W = 300;
const CURSOR_OFFSET = 16;

function Popover({ pos, children }: { pos: { x: number; y: number }; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [actualH, setActualH] = useState(180);
  useEffect(() => { if (ref.current) setActualH(ref.current.offsetHeight); });
  const spaceRight = window.innerWidth - pos.x - CURSOR_OFFSET;
  const left = spaceRight >= POPOVER_W ? pos.x + CURSOR_OFFSET : pos.x - POPOVER_W - CURSOR_OFFSET;
  let top = pos.y - actualH / 2;
  top = Math.max(8, Math.min(top, window.innerHeight - actualH - 8));
  return (
    <div ref={ref} className="bg-white dark:bg-slate-900 border border-border rounded-xl"
      style={{ position: "fixed", left, top, width: POPOVER_W, zIndex: 9999, pointerEvents: "none",
        boxShadow: "0 6px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)", padding: "13px 15px" }}>
      {children}
    </div>
  );
}

// Store popover
function StorePopoverContent({ store, sensitiveLabelPlural }: { store: AppStoreEntry; sensitiveLabelPlural: string }) {
  const col = catDef(catOf(store.dataTypes[0]?.name ?? "Personal Names")).color;
  const rankedTypes = [...store.dataTypes].sort((a, b) => b.count - a.count);
  const maxCount = rankedTypes[0]?.count ?? 1;
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-text-bright truncate" style={{ fontSize: "var(--widget-body)", fontWeight: 600 }}>{store.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontSize: "var(--widget-kpi-md)", fontWeight: 700, lineHeight: 1, color: col }}>{store.sensitiveCount}</div>
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", marginTop: 2 }}>sensitive {sensitiveLabelPlural}</div>
        </div>
      </div>
      <div className="border-t border-border mb-3" />
      <div className="text-muted-foreground mb-2" style={{ fontSize: "var(--widget-meta)" }}>
        Top Data Types by Sensitive {sensitiveLabelPlural}
      </div>
      <div className="flex flex-col gap-1.5">
        {rankedTypes.slice(0, 5).map(({ name, count }, i) => {
          const cd = catDef(catOf(name));
          return (
            <div key={name} className="flex items-center gap-2">
              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 10, textAlign: "right", opacity: 0.45 }}>{i + 1}</span>
              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 28, opacity: 0.55 }}>{cd.key}</span>
              <span className="truncate flex-1 text-text-bright" style={{ fontSize: "var(--widget-label)", minWidth: 0 }}>{name}</span>
              <div className="shrink-0 rounded-sm overflow-hidden" style={{ width: 40, height: 5, background: "rgba(128,128,128,0.15)" }}>
                <div style={{ width: `${(count / maxCount) * 100}%`, height: "100%", background: "rgba(148,163,184,0.55)", borderRadius: 2 }} />
              </div>
              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 28, textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
        {rankedTypes.length > 5 && (
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", paddingLeft: 18, opacity: 0.5 }}>+{rankedTypes.length - 5} more</div>
        )}
      </div>
    </div>
  );
}

// Type popover
function TypePopoverContent({ typeName, stores, sensitiveLabelPlural }: { typeName: string; stores: AppStoreEntry[]; sensitiveLabelPlural: string }) {
  const cat  = catOf(typeName);
  const cd   = catDef(cat);
  const volume = stores.reduce((s, store) => s + (store.dataTypes.find(dt => dt.name === typeName)?.count ?? 0), 0);
  const matchingStores = stores.filter(s => s.dataTypes.some(dt => dt.name === typeName))
    .sort((a, b) => b.sensitiveCount - a.sensitiveCount);
  const visible  = matchingStores.slice(0, 5);
  const overflow = matchingStores.length - 5;
  const maxCount = visible[0]?.sensitiveCount ?? 1;
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0">
            <span className="rounded-full px-1.5 py-0.5 shrink-0" style={{ fontSize: "var(--widget-meta)", fontWeight: 700, background: hexA(cd.color, 0.18), color: cd.color, lineHeight: 1.4 }}>{cd.key}</span>
            <div className="text-text-bright truncate" style={{ fontSize: "var(--widget-body)", fontWeight: 700, lineHeight: 1.2 }}>{typeName}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontSize: "var(--widget-kpi-md)", fontWeight: 700, lineHeight: 1, color: cd.color }}>{volume.toLocaleString()}</div>
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", marginTop: 2 }}>sensitive {sensitiveLabelPlural}</div>
        </div>
      </div>
      <div className="border-t border-border mb-3" />
      <div className="text-muted-foreground mb-2" style={{ fontSize: "var(--widget-meta)" }}>Top Stores by Sensitive {sensitiveLabelPlural}</div>
      <div className="flex flex-col gap-1.5">
        {visible.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 12, textAlign: "right", opacity: 0.45 }}>{i + 1}</span>
            <span className="truncate text-text-bright flex-1" style={{ fontSize: "var(--widget-label)", minWidth: 0 }}>{s.name}</span>
            <div className="shrink-0 rounded-sm overflow-hidden" style={{ width: 40, height: 5, background: "rgba(128,128,128,0.15)" }}>
              <div style={{ width: `${(s.sensitiveCount / maxCount) * 100}%`, height: "100%", background: "rgba(148,163,184,0.55)", borderRadius: 2 }} />
            </div>
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 26, textAlign: "right" }}>{s.sensitiveCount}</span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", paddingLeft: 20, opacity: 0.5 }}>+{overflow} more</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VIEW DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════════

type ViewMode = "store" | "type";

function ViewDropdown({ value, onChange, storeViewDesc }: { value: ViewMode; onChange: (v: ViewMode) => void; storeViewDesc: string }) {
  const [open, setOpen] = useState(false);
  const [hovOpt, setHovOpt] = useState<ViewMode | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const VIEW_OPTIONS: { value: ViewMode; label: string; desc: string }[] = [
    { value: "store", label: "By Data Store",  desc: storeViewDesc },
    { value: "type",  label: "By Data Type",   desc: "Area = total sensitive data per data type" },
  ];
  const current = VIEW_OPTIONS.find(o => o.value === value)!;
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer bg-surface-raised border border-border text-text-bright transition-opacity hover:opacity-80"
        style={{ fontSize: "var(--widget-body)", fontWeight: 500, minWidth: 155 }}>
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown size={13} className="text-muted-foreground shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms" }} />
      </button>
      {open && (
        <div className="absolute right-0 rounded-xl overflow-hidden bg-surface-raised border border-border"
          style={{ top: "calc(100% + 6px)", minWidth: 230, boxShadow: "0 8px 24px rgba(0,0,0,0.13)", zIndex: 500 }}>
          {VIEW_OPTIONS.map((opt, idx) => {
            const active = opt.value === value;
            const hov = hovOpt === opt.value;
            return (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setHovOpt(opt.value)} onMouseLeave={() => setHovOpt(null)}
                className="w-full flex items-start gap-3 px-4 py-3 cursor-pointer text-left"
                style={{ background: active ? "rgba(128,128,128,0.1)" : hov ? "rgba(128,128,128,0.06)" : "transparent",
                  borderBottom: idx < VIEW_OPTIONS.length - 1 ? "1px solid var(--border)" : "none", transition: "background 100ms" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: active ? 600 : 400 }}>{opt.label}</div>
                  <div className="text-muted-foreground" style={{ fontSize: "var(--widget-label)", marginTop: 2 }}>{opt.desc}</div>
                </div>
                {active && <Check size={13} className="shrink-0 mt-0.5" style={{ color: "#60a5fa" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CATEGORY LEGEND
// ═══════════════════════════════════════════════════════════════════════════════

function CatLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-border">
      {CATS.map(c => (
        <div key={c.key} className="flex items-center gap-1.5">
          <div className="rounded-sm shrink-0" style={{ width: 8, height: 8, background: c.color }} />
          <span style={{ fontSize: "var(--widget-label)", fontWeight: 700, color: c.textColor }}>{c.key}</span>
          <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>{c.full}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POSTURE
// ═══════════════════════════════════════════════════════════════════════════════

type Severity = "critical" | "high" | "medium" | "low";
const SEV_META: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "#ef444420" },
  high:     { label: "High",     color: "#fb923c", bg: "#fb923c20" },
  medium:   { label: "Medium",   color: "#fbbf24", bg: "#fbbf2420" },
  low:      { label: "Low",      color: "#4ade80", bg: "#4ade8020" },
};
const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const MAX_SCOPE_PILLS = 3;

function ScopePills({ scope }: { scope: "app" | string[] }) {
  if (scope === "app") return <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>App level</span>;
  const visible = scope.slice(0, MAX_SCOPE_PILLS);
  const overflow = scope.length - MAX_SCOPE_PILLS;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map(inst => (
        <span key={inst} className="rounded-full px-2 py-0.5 shrink-0"
          style={{ fontSize: "var(--widget-label)", fontWeight: 500, background: "rgba(128,128,128,0.12)", color: "var(--text-bright)" }}>
          {inst}
        </span>
      ))}
      {overflow > 0 && <span className="text-muted-foreground" style={{ fontSize: "var(--widget-label)" }}>+{overflow} more</span>}
    </div>
  );
}

function PostureBody({ summary, failedRules }: {
  summary: AppDashboardConfig["postureSummary"];
  failedRules: AppDashboardConfig["failedRules"];
}) {
  const { checked, passed, failed } = summary;
  const sevCounts = SEV_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: failedRules.filter(r => r.severity === s).length }),
    {} as Record<Severity, number>,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const [listW, setListW] = useState(800);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => { setListW(Math.round(entries[0].contentRect.width)); });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const twoCol = listW >= 600;
  const maxShown = twoCol ? 10 : 5;
  const visible = failedRules.slice(0, maxShown);
  const overflow = Math.max(0, failedRules.length - maxShown);
  const rows: (typeof failedRules)[] = [];
  if (twoCol) { for (let i = 0; i < visible.length; i += 2) rows.push(visible.slice(i, i + 2)); }
  return (
    <>
      <div className="flex items-center gap-6 mb-3">
        {[["checked", checked], ["passed", passed], ["failed", failed]].map(([label, val]) => (
          <div key={label as string} className="flex items-baseline gap-1.5">
            <span style={{ fontSize: "var(--widget-kpi-xl)", fontWeight: 700, lineHeight: 1, color: "var(--text-bright)" }}>{val}</span>
            <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>{label}</span>
          </div>
        ))}
      </div>
      <div className="flex rounded-full overflow-hidden gap-px mb-5" style={{ height: "calc(var(--spacing) * 1.5)" }}>
        <div style={{ flex: passed, background: "#4ade80", opacity: 0.75 }} />
        <div style={{ flex: failed, background: "#ef4444", opacity: 0.75 }} />
      </div>
      <div className="border-t border-border mb-4" />
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>Failed by Severity</span>
        {SEV_ORDER.map(sev => {
          const count = sevCounts[sev];
          if (!count) return null;
          return (
            <div key={sev} className="flex items-center gap-1.5">
              <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: SEV_META[sev].color }} />
              <span style={{ fontSize: "var(--widget-body-sm)", fontWeight: 600, color: SEV_META[sev].color }}>{count}</span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>{SEV_META[sev].label}</span>
            </div>
          );
        })}
      </div>
      <div ref={listRef}>
        {twoCol ? (
          <>
            <div className="grid pb-2" style={{ gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {[0, 1].map(col => (
                <div key={col} className="flex gap-3">
                  <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 68 }}>Severity</span>
                  <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>Rule</span>
                </div>
              ))}
            </div>
            {rows.map((rowRules, rowIdx) => (
              <div key={rowIdx} className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "0 24px", borderTop: "1px solid var(--border)" }}>
                {rowRules.map(rule => {
                  const meta = SEV_META[rule.severity];
                  return (
                    <div key={rule.id} className="py-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1 rounded-full px-2 py-0.5 self-start"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}44` }}>
                        <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: meta.color }} />
                        <span style={{ fontSize: "var(--widget-label)", fontWeight: 600, color: meta.color }}>{meta.label}</span>
                      </div>
                      <span className="text-text-bright" style={{ fontSize: "var(--widget-body)", lineHeight: 1.35 }}>{rule.name}</span>
                      <ScopePills scope={rule.scope} />
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="grid gap-3 pb-2" style={{ gridTemplateColumns: "88px 1fr 200px" }}>
              {["Severity", "Rule", "Scope"].map(h => (
                <span key={h} className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>{h}</span>
              ))}
            </div>
            {visible.map((rule, i) => {
              const meta = SEV_META[rule.severity];
              return (
                <div key={rule.id} className="grid gap-3 items-start py-2"
                  style={{ gridTemplateColumns: "88px 1fr 200px", borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                  <div className="flex items-center pt-0.5">
                    <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: meta.bg, border: `1px solid ${meta.color}44` }}>
                      <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: meta.color }} />
                      <span style={{ fontSize: "var(--widget-label)", fontWeight: 600, color: meta.color }}>{meta.label}</span>
                    </div>
                  </div>
                  <span className="text-text-bright" style={{ fontSize: "var(--widget-body)", paddingTop: 2 }}>{rule.name}</span>
                  <ScopePills scope={rule.scope} />
                </div>
              );
            })}
          </>
        )}
        {overflow > 0 && (
          <div className="text-muted-foreground pt-3 mt-1 border-t border-border" style={{ fontSize: "var(--widget-body-sm)", opacity: 0.55 }}>+{overflow} more</div>
        )}
      </div>
    </>
  );
}

// ── Posture illustration ──────────────────────────────────────────────────────
function PostureIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M22 4L5 11V22c0 10.2 7.4 19.1 17 21.5C31.6 41.1 39 32.2 39 22V11L22 4z"
        fill="#a78bfa" fillOpacity="0.1" stroke="#a78bfa" strokeWidth="1.4" strokeOpacity="0.45" />
      <circle cx="14" cy="19" r="2.5" fill="#4ade80" fillOpacity="0.9" />
      <rect x="19" y="17.5" width="13" height="3" rx="1.5" fill="#4ade80" fillOpacity="0.15" />
      <circle cx="14" cy="26" r="2.5" fill="#ef4444" fillOpacity="0.9" />
      <rect x="19" y="24.5" width="9"  height="3" rx="1.5" fill="#ef4444" fillOpacity="0.15" />
      <circle cx="14" cy="33" r="2.5" fill="#4ade80" fillOpacity="0.9" />
      <rect x="19" y="31.5" width="11" height="3" rx="1.5" fill="#4ade80" fillOpacity="0.15" />
    </svg>
  );
}

type DismissState = "visible" | "undoable" | "gone";
function DismissBar({ onUndo, onHide }: { onUndo: () => void; onHide: () => void }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 opacity-40 hover:opacity-70 transition-opacity">
      <button onClick={onUndo} className="text-muted-foreground hover:text-text-bright transition-colors" style={{ fontSize: "var(--widget-body-sm)" }}>Undo</button>
      <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>·</span>
      <button onClick={onHide} className="text-muted-foreground hover:text-text-bright transition-colors" style={{ fontSize: "var(--widget-body-sm)" }}>Don't show again</button>
    </div>
  );
}

function PostureAdBanner() {
  const [state, setState] = useState<DismissState>("visible");
  if (state === "gone") return null;
  if (state === "undoable") return <DismissBar onUndo={() => setState("visible")} onHide={() => setState("gone")} />;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border px-4 py-3.5"
      style={{ background: "linear-gradient(90deg, #a78bfa0d 0%, transparent 60%)", boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
      <div className="shrink-0"><PostureIllustration /></div>
      <div className="self-stretch border-l border-border shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: 600 }}>Posture scanning is not included in your current plan</div>
        <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
          Proactively surface misconfigurations across app and instance configurations before they turn into incidents.
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <a href="#" className="whitespace-nowrap inline-flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ fontSize: "var(--widget-body)", fontWeight: 500, color: "#a78bfa" }}>
          Contact your representative
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <button onClick={() => setState("undoable")} className="text-muted-foreground hover:text-text-bright transition-colors flex items-center justify-center w-6 h-6 rounded-full"
          aria-label="Dismiss" style={{ fontSize: "18px", lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}

type PostureSKU = "purchased" | "not-purchased";
function SkuToggle({ value, onChange }: { value: PostureSKU; onChange: (v: PostureSKU) => void }) {
  const opts: { value: PostureSKU; label: string }[] = [
    { value: "purchased",     label: "Has Posture SKU" },
    { value: "not-purchased", label: "No Posture SKU"  },
  ];
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", opacity: 0.6 }}>Demo</span>
      <div className="flex items-center rounded-full border border-border p-0.5 gap-0.5" style={{ background: "var(--surface)" }}>
        {opts.map(opt => {
          const active = value === opt.value;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)} className="rounded-full px-3 py-1 transition-all"
              style={{ fontSize: "var(--widget-body-sm)", fontWeight: active ? 600 : 400,
                color: active ? "var(--text-bright)" : "var(--muted-foreground)",
                background: active ? "var(--surface-raised)" : "transparent",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none" }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RISKS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════


const SEV_TOOLTIP_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
};

export function RisksWidget({ appFilterKey, emptyRisks }: { appFilterKey?: string; emptyRisks?: boolean }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [cursorPos, setCursorPos]     = useState<{ x: number; y: number } | null>(null);

  const riskRows = useMemo(() => {
    return RISK_TYPES.map((rt: RiskTypeDef) => {
      const sevCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      let total = 0;
      for (const rule of rt.rules as RiskRule[]) {
        if (appFilterKey && !rule.dataStoreGroups.includes(appFilterKey)) continue;
        sevCounts[rule.severity] = (sevCounts[rule.severity] ?? 0) + rule.findings;
        total += rule.findings;
      }
      return { id: rt.id, label: rt.label, fg: rt.fg, bg: rt.bg, sevCounts, total };
    }).filter((r) => r.total > 0 && !emptyRisks);
  }, [appFilterKey, emptyRisks]);

  const handleCountClick = (riskTypeId: string) => {
    const params = new URLSearchParams();
    params.set("riskType", riskTypeId);
    if (appFilterKey) params.set("app", appFilterKey);
    navigate(`/risk?${params.toString()}`);
  };

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const hoveredRow   = hoveredId ? riskRows.find(r => r.id === hoveredId) ?? null : null;
  const showPopover  = hoveredRow !== null && cursorPos !== null;

  if (riskRows.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border px-4 py-3.5"
        style={{ background: "linear-gradient(90deg, rgba(74,222,128,0.07) 0%, transparent 60%)", boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="18" cy="18" r="16" className="fill-green-100 dark:fill-green-900/30" />
          <path d="M11 19l4.5 4.5L25 14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="5"  cy="8"  r="1.2" fill="#4ade80" opacity="0.6" />
          <circle cx="31" cy="7"  r="0.9" fill="#86efac" opacity="0.7" />
          <circle cx="30" cy="28" r="1.2" fill="#4ade80" opacity="0.5" />
        </svg>
        <div className="self-stretch border-l border-border shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: 600 }}>Great! No Risk Findings.</div>
          <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
            You're doing good — no active risks detected for this cloud service.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <WidgetCard className="overflow-hidden" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>Risk Findings</span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)" }}>
                Evaluated by Netskope predefined policies
              </span>
            </div>
            <button
              onClick={() => navigate("/risk")}
              className="flex items-center gap-1 text-muted-foreground hover:text-text-bright transition-colors shrink-0"
              style={{ fontSize: "var(--widget-body-sm)", fontWeight: 600 }}
            >
              Go to Risk page <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Risk type cards */}
          <div
            className="px-5 pb-5"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {riskRows.map((row) => {
              const isHovered = hoveredCardId === row.id;
              return (
                <div
                  key={row.id}
                  className="rounded-xl bg-surface-raised flex items-center justify-between gap-3 cursor-pointer"
                  style={{
                    padding: "10px 14px",
                    minWidth: 180,
                    border: isHovered ? "1px solid var(--primary)" : "1px solid var(--border)",
                    transition: "border-color 150ms",
                  }}
                  onMouseEnter={() => { setHoveredId(row.id); setHoveredCardId(row.id); }}
                  onMouseLeave={() => { setHoveredId(null); setCursorPos(null); setHoveredCardId(null); }}
                  onMouseMove={e => setCursorPos({ x: e.clientX, y: e.clientY })}
                  onClick={() => handleCountClick(row.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RiskTypeIcon riskTypeId={row.id} size="sm" />
                    <span className="truncate text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: 500 }}>
                      {row.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-text-bright" style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1 }}>
                    {row.total}
                  </span>
                </div>
              );
            })}
          </div>
      </WidgetCard>

      {/* Severity popover — position:fixed, never clipped */}
      {showPopover && hoveredRow && cursorPos && (
        <div
          className="bg-surface-raised border border-border rounded-lg"
          style={{
            position: "fixed",
            left: cursorPos.x + 12,
            top: cursorPos.y + 12,
            zIndex: 9999,
            pointerEvents: "none",
            padding: "7px 10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: 140,
          }}
        >
          <div className="text-muted-foreground mb-1.5" style={{ fontSize: "var(--widget-meta)" }}>
            Findings by Severity
          </div>
          <div className="flex flex-col gap-1">
            {(["Critical", "High", "Medium"] as const)
              .filter(sev => (hoveredRow.sevCounts[sev] ?? 0) > 0)
              .map(sev => (
                <div key={sev} className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: SEV_TOOLTIP_COLORS[sev] }} />
                    <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>{sev}</span>
                  </div>
                  <span className="text-text-bright tabular-nums" style={{ fontSize: "var(--widget-meta)", fontWeight: 600 }}>
                    {hoveredRow.sevCounts[sev]}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function dominantCatForStore(store: AppStoreEntry): Cat {
  const counts = Object.fromEntries(CATS.map(c => [c.key, 0])) as Record<Cat, number>;
  for (const dt of store.dataTypes.map(dt => dt.name)) counts[catOf(dt)]++;
  return CATS.reduce<Cat>((best, c) => counts[c.key as Cat] > counts[best] ? c.key as Cat : best, "PII");
}

function storeColor(store: AppStoreEntry) { return catDef(dominantCatForStore(store)).color; }
function storeTextColor(store: AppStoreEntry) { return catDef(dominantCatForStore(store)).textColor; }

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN AppDashboard COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TM_H = 340;

export function AppDashboard({ config }: { config: AppDashboardConfig }) {
  const [view, setView]           = useState<ViewMode>("type");
  const [hovId, setHovId]         = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [postureSKU, setPostureSKU] = useState<PostureSKU>("purchased");

  useEffect(() => { setHovId(null); setCursorPos(null); }, [view]);

  const tmContainerRef = useRef<HTMLDivElement>(null);
  const [tmW, setTmW] = useState(680);
  useEffect(() => {
    const el = tmContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => { const w = Math.round(entries[0].contentRect.width); if (w > 0) setTmW(w); });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compute type volumes from store data
  const typeVolumes = useMemo(() => {
    const vols: Record<string, number> = {};
    for (const store of config.stores) {
      for (const dt of store.dataTypes) {
        vols[dt.name] = (vols[dt.name] ?? 0) + dt.count;
      }
    }
    return vols;
  }, [config.stores]);

  const allTypes = useMemo(() => [...new Set(config.stores.flatMap(s => s.dataTypes.map(dt => dt.name)))], [config.stores]);

  const tmItems = useMemo(() => {
    if (view === "store") return config.stores.map(s => ({ id: s.id, value: s.sensitiveCount }));
    return allTypes.map(t => ({ id: t, value: typeVolumes[t] ?? 50 }));
  }, [view, config.stores, allTypes, typeVolumes]);

  const cells = useMemo(() => layoutTreemap(tmItems, tmW, TM_H, 3), [tmItems, tmW]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => { setCursorPos({ x: e.clientX, y: e.clientY }); }, []);
  const handleMouseLeave = useCallback(() => { setHovId(null); setCursorPos(null); }, []);

  const hovStore = view === "store" && hovId ? (config.stores.find(s => s.id === hovId) ?? null) : null;
  const hovType  = view === "type" ? hovId : null;
  const showPopover = cursorPos !== null && hovId !== null;

  return (
    <div
      className="flex-1 overflow-auto p-6 hero-cards"
      style={{ background: "var(--color-background)" }}
    >
      {/* Hero header — logo + title + CTA + risk cards */}
      <RisksHero
        appFilterKey={config.appFilterKey}
        emptyRisks={config.emptyRisks}
        pageTitle={config.title}
        pageSubtitle={config.subtitle}
        logo={config.hero.logo}
      />

      {/* Top row */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <DataStoresWidget
          hideNotConnected={config.hideNotConnected}
          storeCount={config.stores.length}
          totalVolumeBytes={config.dataStoreVolumeBytes}
          volumeBreakdown={config.volumeBreakdown}
        />
        <IdentityWithAccessCard identityTypes={config.identityTypes} />
      </div>

      {/* Treemap card */}
      <WidgetCard className="" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
        <div className="px-5 pt-4 pb-4 border-b border-border flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>Sensitive Data Distribution</div>
            <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
              {view === "store" ? config.storeViewDesc : "Area proportional to total sensitive data per data type"}
            </div>
          </div>
          <ViewDropdown value={view} onChange={setView} storeViewDesc={config.storeViewDesc} />
        </div>
        <div ref={tmContainerRef} className="px-5 pt-5" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ cursor: "crosshair" }}>
          <svg width={tmW} height={TM_H} style={{ display: "block", overflow: "visible" }}>
            {cells.map(cell => {
              const isStore = view === "store";
              const store   = isStore ? config.stores.find(s => s.id === cell.id) : undefined;
              const isHov   = hovId === cell.id;
              const fullLbl = isStore ? store!.name : cell.id;
              const shortLbl = isStore ? store!.short : cell.id.split(" ")[0];
              const cntLbl  = isStore ? store!.sensitiveCount.toLocaleString() : (typeVolumes[cell.id] ?? 0).toLocaleString();
              const fs = Math.min(12, Math.max(8, cell.w / 6));
              const lbl = (fullLbl.length * fs * 0.62 + 16) <= cell.w ? fullLbl : shortLbl;
              const showLbl = cell.w > 42 && cell.h > 22;
              const showCnt = cell.h > 42 && cell.w > 38;

              if (isStore && store) {
                // ── Multi-category strip rendering for store view ──────────────
                // Group dataTypes by category and sort by count descending
                const catTotals = new Map<Cat, number>();
                for (const dt of store.dataTypes) {
                  const cat = catOf(dt.name);
                  catTotals.set(cat, (catTotals.get(cat) ?? 0) + dt.count);
                }
                const segments = [...catTotals.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, total]) => ({ cat, total, color: catDef(cat).color }));
                const grandTotal = segments.reduce((s, seg) => s + seg.total, 0);

                // Bottom strip: height scales with cell, capped 4–8px
                const stripH = Math.min(8, Math.max(4, cell.h * 0.14));
                const stripY = cell.y + Math.max(0, cell.h) - stripH;
                const clipId = `clip-s-${cell.id.replace(/[^a-z0-9]/gi, "_")}`;

                // Pre-compute segment x positions
                let curX = cell.x;
                const segsPos = segments.map(seg => {
                  const segW = grandTotal > 0 ? (seg.total / grandTotal) * Math.max(0, cell.w) : 0;
                  const x = curX;
                  curX += segW;
                  return { ...seg, x, segW };
                });

                return (
                  <g key={cell.id} onMouseEnter={() => setHovId(cell.id)} onMouseLeave={() => setHovId(null)} style={{ cursor: "crosshair" }}>
                    <defs>
                      <clipPath id={clipId}>
                        <rect x={cell.x} y={cell.y} width={Math.max(0, cell.w)} height={Math.max(0, cell.h)} rx={4} />
                      </clipPath>
                    </defs>
                    {/* Neutral background rect */}
                    <rect x={cell.x} y={cell.y} width={Math.max(0, cell.w)} height={Math.max(0, cell.h)} rx={4}
                      fill="rgba(148,163,184,1)" fillOpacity={isHov ? 0.12 : 0.07}
                      stroke="rgba(148,163,184,1)" strokeOpacity={isHov ? 0.55 : 0.28} strokeWidth={isHov ? 1.5 : 1}
                      style={{ transition: "fill-opacity 100ms, stroke-opacity 100ms" }} />
                    {/* Category color strip along the bottom */}
                    <g clipPath={`url(#${clipId})`}>
                      {segsPos.map(seg => (
                        <rect key={seg.cat} x={seg.x} y={stripY} width={seg.segW} height={stripH}
                          fill={seg.color} opacity={isHov ? 0.9 : 0.65}
                          style={{ transition: "opacity 100ms" }} />
                      ))}
                    </g>
                    {showLbl && (
                      <text x={cell.x + cell.w / 2} y={cell.y + (showCnt ? cell.h / 2 - 8 : cell.h / 2)}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={fs} fontWeight={700} opacity={1}
                        style={{ pointerEvents: "none", fill: storeTextColor(store!) }}>{lbl}</text>
                    )}
                    {showCnt && (
                      <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 10}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={Math.max(8, fs - 2)} opacity={1}
                        style={{ pointerEvents: "none", fill: storeTextColor(store!) }}>{cntLbl}</text>
                    )}
                  </g>
                );
              }

              // ── Single-color rendering for data type view ──────
              const col = catDef(catOf(cell.id)).color;
              const textCol = catDef(catOf(cell.id)).textColor;
              const catName = String(catOf(cell.id));
              const showCat = cell.h > 50 && cell.w > 50;

              // Space lines evenly around vertical centre (matches SaaS dashboard)
              const lineH = 18;
              const totalLines = (showLbl ? 1 : 0) + (showCat ? 1 : 0) + (showCnt ? 1 : 0);
              const blockH = (totalLines - 1) * lineH;
              const topY = cell.y + cell.h / 2 - blockH / 2;
              let lineIdx = 0;

              return (
                <g key={cell.id} onMouseEnter={() => setHovId(cell.id)} onMouseLeave={() => setHovId(null)} style={{ cursor: "crosshair" }}>
                  <rect x={cell.x} y={cell.y} width={Math.max(0, cell.w)} height={Math.max(0, cell.h)} rx={4}
                    fill={col} fillOpacity={isHov ? 0.55 : 0.30}
                    stroke={col} strokeOpacity={isHov ? 1 : 0.42} strokeWidth={isHov ? 1.5 : 1}
                    style={{ transition: "fill-opacity 100ms, stroke-opacity 100ms, stroke-width 100ms" }} />
                  {showLbl && (() => { const y = topY + lineIdx++ * lineH; return (
                    <text key="lbl" x={cell.x + cell.w / 2} y={y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={fs} fontWeight={700} opacity={1}
                      style={{ pointerEvents: "none", fill: textCol }}>{lbl}</text>
                  ); })()}
                  {showCat && (() => { const y = topY + lineIdx++ * lineH; return (
                    <text key="cat" x={cell.x + cell.w / 2} y={y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(7, fs - 2)} fontWeight={500}
                      opacity={isHov ? 1 : 0.9}
                      style={{ pointerEvents: "none", fill: textCol }}>{catName}</text>
                  ); })()}
                  {showCnt && (() => { const y = topY + lineIdx++ * lineH; return (
                    <text key="cnt" x={cell.x + cell.w / 2} y={y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(8, fs - 2)}
                      opacity={isHov ? 1 : 0.9}
                      style={{ pointerEvents: "none", fill: textCol }}>{cntLbl}</text>
                  ); })()}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="px-5 py-4"><CatLegend /></div>
      </WidgetCard>

      {/* Cursor-following popover */}
      {showPopover && cursorPos && (
        <Popover pos={cursorPos}>
          {hovStore && <StorePopoverContent store={hovStore} sensitiveLabelPlural={config.sensitiveLabelPlural} />}
          {hovType  && <TypePopoverContent typeName={hovType} stores={config.stores} sensitiveLabelPlural={config.sensitiveLabelPlural} />}
        </Popover>
      )}

      {/* Data Motion */}
      <DataMotionWidget />

      {/* Posture */}
      <div className="mt-6">
        <div className="flex items-center justify-end mb-4">
          <SkuToggle value={postureSKU} onChange={setPostureSKU} />
        </div>
        {postureSKU === "purchased" ? (
          <WidgetCard className="p-5" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>Posture</div>
                <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>Rule-based compliance scan — app &amp; instance level</div>
              </div>
            </div>
            <PostureBody summary={config.postureSummary} failedRules={config.failedRules} />
          </WidgetCard>
        ) : (
          <PostureAdBanner />
        )}
      </div>
    </div>
  );
}