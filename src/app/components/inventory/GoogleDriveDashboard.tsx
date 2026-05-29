import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { Users, ChevronDown, Check } from "lucide-react";
import { DataMotionWidget } from "./DataMotionWidget";
import { DataStoresWidget } from "./DataStoresWidget";
import { RisksHero } from "./RiskWidgetVariants";
import { WidgetCard } from "../ui/WidgetCard";

// ═══════════════════════════════════════════════════════════════════════════════
//  CATEGORIES — exact taxonomy from DataExplorerPage.tsx
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
  "Personal Names": "PII",     "Email Addresses": "PII",   "Telephone Numbers": "PII",
  "Postal Addresses": "PII",   "Birthdates": "PII",        "Gender": "PII",
  "Age": "PII",                "Nationality": "PII",       "IP Addresses": "PII",
  "MAC Addresses": "PII",      "Domain Names": "PII",      "URI Hosts": "PII",
  "UUIDs": "PII",              "Device IDs": "PII",        "Browser Fingerprints": "PII",
  "Geolocation Data": "PII",   "Vehicle IDs": "PII",       "Student Records": "PII",
  "Education IDs": "PII",
  "Social Security Numbers": "SPII", "Driver Licenses": "SPII", "National IDs": "SPII",
  "Passports": "SPII",               "Taxpayer IDs": "SPII",    "Voter Registration IDs": "SPII",
  "Ethnicity and Race": "PSI", "Marital Status": "PSI",   "Religious Beliefs": "PSI",
  "Political Opinions": "PSI", "Sexual Orientation": "PSI","Immigration Status": "PSI",
  "Payment Cards": "PCI",
  "Bank Account Information": "PFI", "Financial IDs": "PFI",   "Currency": "PFI",
  "Securities IDs": "PFI",           "Credit Scores": "PFI",   "Income Information": "PFI",
  "Tax Records": "PFI",
  "Medical Records": "PHI",        "Medical Diagnoses": "PHI",
  "Healthcare IDs": "PHI",         "Healthcare Provider IDs": "PHI",
  "Health Insurance IDs": "PHI",   "Prescription Information": "PHI",
  "Biometric Data": "PHI",         "Genetic Data": "PHI",
  "Passwords": "PAI",     "Private Keys": "PAI",   "Public Keys": "PAI",
  "Secrets and Tokens": "PAI", "Security Questions": "PAI", "MFA Seeds": "PAI",
  "Source Code": "BII",   "Company Names": "BII",
  "Trade Secrets": "BII", "Legal Privileges": "BII",
};

const catOf  = (t: string): Cat => T2C[t] ?? "PII";
const catDef = (k: Cat) => CATS.find(c => c.key === k)!;

function hexA(hex: string, opacity: number) {
  return `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IDENTITY WITH ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

const IDENTITY_TYPES = [
  { type: "Internal User",   count: 28, color: "#60a5fa" },
  { type: "External User",   count:  8, color: "#fb923c" },
  { type: "Unmapped",        count:  4, color: "#a78bfa" },
  { type: "Unauthenticated", count:  2, color: "#f87171" },
];
const IDENTITY_TOTAL = IDENTITY_TYPES.reduce((s, i) => s + i.count, 0);

function IdentityWithAccessCard() {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredItem = IDENTITY_TYPES.find(i => i.type === hovered);

  return (
    <WidgetCard className="rounded-xl p-4 flex flex-col gap-3" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)" }}>Identities with Access</span>
        <Users size={16} className="text-muted-foreground opacity-50" />
      </div>

      {/* Total */}
      <div className="flex items-end gap-3">
        <span className="text-text-bright" style={{ fontSize: "var(--widget-kpi-lg)", fontWeight: 600, lineHeight: 1 }}>{IDENTITY_TOTAL}</span>
      </div>

      {/* Stacked bar with hover */}
      <div className="relative">
        <div className="flex rounded-full overflow-hidden gap-px" style={{ height: "calc(var(--spacing) * 1.5)" }}>
          {IDENTITY_TYPES.map(({ type, count, color }) => (
            <div
              key={type}
              onMouseEnter={() => setHovered(type)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flex: count,
                background: color,
                opacity: hovered === null || hovered === type ? 0.85 : 0.25,
                transition: "opacity 120ms",
                cursor: "default",
              }}
            />
          ))}
        </div>

        {/* Tooltip */}
        {hoveredItem && (
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1.5 border border-border pointer-events-none"
            style={{ background: "var(--surface-raised)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap", zIndex: 50 }}
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: hoveredItem.color }} />
              <span className="text-text-bright" style={{ fontSize: "var(--widget-body-sm)", fontWeight: 600 }}>{hoveredItem.type}</span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>{hoveredItem.count}</span>
            </div>
          </div>
        )}
      </div>

      {/* Static legend — dot + label, wraps naturally, no interactivity */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {IDENTITY_TYPES.map(({ type, color }) => (
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
//  DATA
// ═══════════════════════════════════════════════════════════════════════════════

const DRIVES10 = [
  { id: "e1",  name: "Engineering Shared Drive", short: "Eng",   hex: "#6366f1", sensitiveFiles: 142, dataTypes: [
    { name: "Source Code",     files: 61 },
    { name: "IP Addresses",    files: 38 },
    { name: "Passwords",       files: 24 },
    { name: "Private Keys",    files: 12 },
    { name: "Personal Names",  files: 5  },
    { name: "Email Addresses", files: 2  },
  ]},
  { id: "e2",  name: "Finance Team Drive",        short: "Fin",   hex: "#f59e0b", sensitiveFiles: 89,  dataTypes: [
    { name: "Bank Account Information", files: 34 },
    { name: "Payment Cards",            files: 28 },
    { name: "Social Security Numbers",  files: 15 },
    { name: "Financial IDs",            files: 8  },
    { name: "Taxpayer IDs",             files: 4  },
  ]},
  { id: "e3",  name: "HR Confidential",           short: "HR",    hex: "#10b981", sensitiveFiles: 234, dataTypes: [
    { name: "Personal Names",        files: 72 },
    { name: "Social Security Numbers", files: 48 },
    { name: "Birthdates",            files: 35 },
    { name: "Medical Records",       files: 28 },
    { name: "Postal Addresses",      files: 22 },
    { name: "Telephone Numbers",     files: 14 },
    { name: "Healthcare IDs",        files: 8  },
    { name: "Gender",                files: 5  },
    { name: "Ethnicity and Race",    files: 2  },
  ]},
  { id: "e4",  name: "Marketing Assets",          short: "Mkt",   hex: "#ec4899", sensitiveFiles: 12,  dataTypes: [
    { name: "Email Addresses", files: 6 },
    { name: "Personal Names",  files: 4 },
    { name: "Company Names",   files: 2 },
  ]},
  { id: "e5",  name: "Legal Documents",           short: "Legal", hex: "#a78bfa", sensitiveFiles: 187, dataTypes: [
    { name: "Personal Names",           files: 64 },
    { name: "Financial IDs",            files: 52 },
    { name: "Bank Account Information", files: 38 },
    { name: "Taxpayer IDs",             files: 21 },
    { name: "Company Names",            files: 12 },
  ]},
  { id: "e6",  name: "Product Roadmap",           short: "Prod",  hex: "#38bdf8", sensitiveFiles: 45,  dataTypes: [
    { name: "Source Code",     files: 18 },
    { name: "Personal Names",  files: 10 },
    { name: "Company Names",   files: 8  },
    { name: "Email Addresses", files: 6  },
    { name: "IP Addresses",    files: 3  },
  ]},
  { id: "e7",  name: "Customer Success",          short: "CX",    hex: "#fb923c", sensitiveFiles: 78,  dataTypes: [
    { name: "Personal Names",    files: 31 },
    { name: "Email Addresses",   files: 22 },
    { name: "Telephone Numbers", files: 14 },
    { name: "Postal Addresses",  files: 8  },
    { name: "Company Names",     files: 3  },
  ]},
  { id: "e8",  name: "Executive Reports",         short: "Exec",  hex: "#f87171", sensitiveFiles: 156, dataTypes: [
    { name: "Personal Names",           files: 52 },
    { name: "Financial IDs",            files: 41 },
    { name: "Social Security Numbers",  files: 32 },
    { name: "Bank Account Information", files: 21 },
    { name: "Taxpayer IDs",             files: 10 },
  ]},
  { id: "e9",  name: "Sales Pipeline",            short: "Sales", hex: "#fbbf24", sensitiveFiles: 38,  dataTypes: [
    { name: "Personal Names",    files: 16 },
    { name: "Email Addresses",   files: 12 },
    { name: "Telephone Numbers", files: 7  },
    { name: "Company Names",     files: 3  },
  ]},
  { id: "e10", name: "IT Asset Inventory",        short: "IT",    hex: "#22d3ee", sensitiveFiles: 9,   dataTypes: [
    { name: "Passwords",    files: 4 },
    { name: "IP Addresses", files: 3 },
    { name: "Private Keys", files: 2 },
  ]},
];

type Drive = typeof DRIVES10[number];

const TYPE_VOLUMES: Record<string, number> = {
  "Personal Names": 4218,   "Email Addresses": 3842,  "IP Addresses": 2341,
  "Source Code": 1456,      "Payment Cards": 1563,    "Medical Records": 1891,
  "Financial IDs": 734,     "Bank Account Information": 892,
  "Social Security Numbers": 1247, "Taxpayer IDs": 215,
  "Telephone Numbers": 892, "Postal Addresses": 634,  "Birthdates": 518,
  "Healthcare IDs": 312,    "Gender": 312,            "Ethnicity and Race": 156,
  "Company Names": 312,     "Passwords": 567,         "Private Keys": 34,
};

const TYPE_SHORT: Record<string, string> = {
  "Personal Names": "Names",           "Email Addresses": "Emails",
  "IP Addresses": "IPs",               "Source Code": "Code",
  "Payment Cards": "Pmt Cards",        "Medical Records": "Med Rec",
  "Financial IDs": "Fin IDs",          "Bank Account Information": "Bank Accts",
  "Social Security Numbers": "SSNs",   "Taxpayer IDs": "Tax IDs",
  "Telephone Numbers": "Phones",       "Postal Addresses": "Addrs",
  "Birthdates": "DOBs",               "Healthcare IDs": "HC IDs",
  "Gender": "Gender",                  "Ethnicity and Race": "Ethnicity",
  "Company Names": "Co. Names",        "Passwords": "Pwds",
  "Private Keys": "Pvt Keys",
};

const ALL_DRIVE_TYPES: string[] = (() => {
  const seen = new Set<string>();
  for (const d of DRIVES10) for (const t of d.dataTypes.map(dt => dt.name)) seen.add(t);
  return [...seen];
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function dominantCat(drive: Drive): Cat {
  const counts = Object.fromEntries(CATS.map(c => [c.key, 0])) as Record<Cat, number>;
  for (const t of drive.dataTypes.map(dt => dt.name)) counts[catOf(t)]++;
  return CATS.reduce<Cat>((best, c) => counts[c.key as Cat] > counts[best] ? c.key as Cat : best, "PII");
}

function catCountsFor(drive: Drive): Record<Cat, number> {
  const counts = Object.fromEntries(CATS.map(c => [c.key, 0])) as Record<Cat, number>;
  for (const t of drive.dataTypes.map(dt => dt.name)) counts[catOf(t)]++;
  return counts;
}

function driveColor(drive: Drive): string { return catDef(dominantCat(drive)).color; }
function driveTextColor(drive: Drive): string { return catDef(dominantCat(drive)).textColor; }
function drivesForType(typeName: string): Drive[] { return DRIVES10.filter(d => d.dataTypes.map(dt => dt.name).includes(typeName)); }

// ══════════════════════════════════════════════════════════════════════════��════
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
//  CURSOR-FOLLOWING POPOVER
// ═══════════════════════════════════════════════════════════════════════════════

const POPOVER_W = 300;
const CURSOR_OFFSET = 16;

function Popover({ pos, children }: { pos: { x: number; y: number }; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [actualH, setActualH] = useState(180);

  useEffect(() => {
    if (ref.current) setActualH(ref.current.offsetHeight);
  });

  // Smart horizontal placement: prefer right, flip left if near edge
  const spaceRight = window.innerWidth - pos.x - CURSOR_OFFSET;
  const left = spaceRight >= POPOVER_W
    ? pos.x + CURSOR_OFFSET
    : pos.x - POPOVER_W - CURSOR_OFFSET;

  // Smart vertical: center on cursor, clamp to viewport
  let top = pos.y - actualH / 2;
  top = Math.max(8, Math.min(top, window.innerHeight - actualH - 8));

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-slate-900 border border-border rounded-xl"
      style={{
        position: "fixed",
        left,
        top,
        width: POPOVER_W,
        zIndex: 9999,
        pointerEvents: "none",
        boxShadow: "0 6px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)",
        padding: "13px 15px",
      }}
    >
      {children}
    </div>
  );
}

// ── Store popover content ─────────────────────────────────────────────────────

function StorePopoverContent({ drive }: { drive: Drive }) {
  const col = driveColor(drive);

  // Already sorted by files desc in data, but re-sort defensively
  const rankedTypes = [...drive.dataTypes].sort((a, b) => b.files - a.files);
  const maxFiles = rankedTypes[0]?.files ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-text-bright truncate" style={{ fontSize: "var(--widget-body)", fontWeight: 600 }}>{drive.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontSize: "var(--widget-kpi-md)", fontWeight: 700, lineHeight: 1, color: col }}>{drive.sensitiveFiles}</div>
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", marginTop: 2 }}>sensitive files</div>
        </div>
      </div>

      <div className="border-t border-border mb-3" />

      {/* Ranked data types */}
      <div className="text-muted-foreground mb-2" style={{ fontSize: "var(--widget-meta)" }}>
        Top Data Types by Sensitive Object Count
      </div>
      <div className="flex flex-col gap-1.5">
        {rankedTypes.slice(0, 5).map(({ name, files }, i) => {
          const cd = catDef(catOf(name));
          return (
            <div key={name} className="flex items-center gap-2">
              <span
                className="text-muted-foreground shrink-0"
                style={{ fontSize: "var(--widget-meta)", width: 10, textAlign: "right" }}
              >
                {i + 1}
              </span>
              <span
                className="text-muted-foreground shrink-0"
                style={{ fontSize: "var(--widget-meta)", width: 28 }}
              >
                {cd.key}
              </span>
              <span className="truncate flex-1 text-text-bright" style={{ fontSize: "var(--widget-label)", minWidth: 0 }}>{name}</span>
              <div className="shrink-0 rounded-sm overflow-hidden" style={{ width: 40, height: 5, background: "rgba(128,128,128,0.15)" }}>
                <div style={{ width: `${(files / maxFiles) * 100}%`, height: "100%", background: "rgba(148,163,184,0.55)", borderRadius: 2 }} />
              </div>
              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 28, textAlign: "right" }}>
                {files}
              </span>
            </div>
          );
        })}
        {rankedTypes.length > 5 && (
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", paddingLeft: 18 }}>
            +{rankedTypes.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}

// ── Type popover content ──────────────────────────────────────────────────────

function TypePopoverContent({ typeName }: { typeName: string }) {
  const cat    = catOf(typeName);
  const cd     = catDef(cat);
  const volume = TYPE_VOLUMES[typeName] ?? 0;

  // Sort drives by sensitiveFiles descending, cap at 5 + overflow
  const allDrives  = drivesForType(typeName).sort((a, b) => b.sensitiveFiles - a.sensitiveFiles);
  const drives     = allDrives.slice(0, 5);
  const overflow   = allDrives.length - 5;
  const maxFiles   = drives[0]?.sensitiveFiles ?? 1;

  return (
    <div>
      {/* Header — type name above the category pill */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0">
            <span className="rounded-full px-1.5 py-0.5 shrink-0" style={{ fontSize: "var(--widget-meta)", fontWeight: 700, background: hexA(cd.color, 0.18), color: cd.color, lineHeight: 1.4 }}>
              {cd.key}
            </span>
            <div className="text-text-bright truncate" style={{ fontSize: "var(--widget-body)", fontWeight: 700, lineHeight: 1.2 }}>{typeName}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontSize: "var(--widget-kpi-md)", fontWeight: 700, lineHeight: 1, color: cd.color }}>{volume.toLocaleString()}</div>
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", marginTop: 2 }}>sensitive files</div>
        </div>
      </div>

      <div className="border-t border-border mb-3" />

      {/* Drive list — neutral, ranked by sensitiveFiles desc */}
      <div className="text-muted-foreground mb-2" style={{ fontSize: "var(--widget-meta)" }}>
        Top Drives by Sensitive Object Count
      </div>
      <div className="flex flex-col gap-1.5">
        {drives.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 12, textAlign: "right" }}>{i + 1}</span>
            <span className="truncate text-text-bright flex-1" style={{ fontSize: "var(--widget-label)", minWidth: 0 }}>{d.name}</span>
            <div className="shrink-0 rounded-sm overflow-hidden" style={{ width: 40, height: 5, background: "rgba(128,128,128,0.15)" }}>
              <div style={{ width: `${(d.sensitiveFiles / maxFiles) * 100}%`, height: "100%", background: "rgba(148,163,184,0.55)", borderRadius: 2 }} />
            </div>
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 26, textAlign: "right" }}>
              {d.sensitiveFiles}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", paddingLeft: 20 }}>
            +{overflow} more
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  VIEW DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════════

type ViewMode = "store" | "type";

const VIEW_OPTIONS: { value: ViewMode; label: string; desc: string }[] = [
  { value: "store", label: "By Data Store",  desc: "Area = sensitive file count per drive"     },
  { value: "type",  label: "By Data Type",   desc: "Area = total hits per sensitive data type"  },
];

function ViewDropdown({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const [open, setOpen]         = useState(false);
  const [hovOpt, setHovOpt]     = useState<ViewMode | null>(null);
  const ref                     = useRef<HTMLDivElement>(null);
  const current                 = VIEW_OPTIONS.find(o => o.value === value)!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer bg-surface-raised border border-border text-text-bright transition-opacity hover:opacity-80"
        style={{ fontSize: "var(--widget-body)", fontWeight: 500, minWidth: 155 }}
      >
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown
          size={13}
          className="text-muted-foreground shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 rounded-xl overflow-hidden bg-surface-raised border border-border"
          style={{ top: "calc(100% + 6px)", minWidth: 230, boxShadow: "0 8px 24px rgba(0,0,0,0.13)", zIndex: 500 }}
        >
          {VIEW_OPTIONS.map((opt, idx) => {
            const active = opt.value === value;
            const hov    = hovOpt === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setHovOpt(opt.value)}
                onMouseLeave={() => setHovOpt(null)}
                className="w-full flex items-start gap-3 px-4 py-3 cursor-pointer text-left"
                style={{
                  background: active ? "rgba(128,128,128,0.1)" : hov ? "rgba(128,128,128,0.06)" : "transparent",
                  borderBottom: idx < VIEW_OPTIONS.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 100ms",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: active ? 600 : 400 }}>
                    {opt.label}
                  </div>
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
//  POSTURE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

const POSTURE_SUMMARY = { checked: 24, passed: 18, failed: 6 };

type Severity = "critical" | "high" | "medium" | "low";

interface FailedRule {
  id: string;
  severity: Severity;
  name: string;
  /** "app" = app-level scan failure; string[] = instance names that failed */
  scope: "app" | string[];
}

const SEV_META: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "#ef444420" },
  high:     { label: "High",     color: "#fb923c", bg: "#fb923c20" },
  medium:   { label: "Medium",   color: "#fbbf24", bg: "#fbbf2420" },
  low:      { label: "Low",      color: "#4ade80", bg: "#4ade8020" },
};

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low"];

const FAILED_RULES: FailedRule[] = [
  {
    id: "r1", severity: "critical",
    name: "MFA not enforced for external sharing",
    scope: "app",
  },
  {
    id: "r2", severity: "critical",
    name: "Admin access not restricted to trusted IPs",
    scope: ["corp-drive", "hr-drive", "finance-drive"],
  },
  {
    id: "r3", severity: "high",
    name: "Link sharing enabled globally",
    scope: "app",
  },
  {
    id: "r4", severity: "high",
    name: "Drive audit logs not exported to SIEM",
    scope: ["finance-drive", "legal-drive", "eng-drive", "exec-drive"],
  },
  {
    id: "r5", severity: "medium",
    name: "Guest access allowed without expiry",
    scope: ["eng-drive", "product-drive", "cx-drive"],
  },
  {
    id: "r6", severity: "low",
    name: "Sensitivity labels not enforced on drives",
    scope: "app",
  },
];

const MAX_SCOPE_PILLS = 3;

function ScopePills({ scope }: { scope: "app" | string[] }) {
  if (scope === "app") {
    return <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>App level</span>;
  }
  const visible = scope.slice(0, MAX_SCOPE_PILLS);
  const overflow = scope.length - MAX_SCOPE_PILLS;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map(inst => (
        <span
          key={inst}
          className="rounded-full px-2 py-0.5 shrink-0"
          style={{
            fontSize: "var(--widget-label)",
            fontWeight: 500,
            background: "rgba(128,128,128,0.12)",
            color: "var(--text-bright)",
          }}
        >
          {inst}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-label)" }}>
          +{overflow} more
        </span>
      )}
    </div>
  );
}

// ── PostureBody — shared between real widget and ghost preview ────────────────

function PostureBody() {
  const { checked, passed, failed } = POSTURE_SUMMARY;
  const sevCounts = SEV_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: FAILED_RULES.filter(r => r.severity === s).length }),
    {} as Record<Severity, number>,
  );

  // Responsive column layout
  const listRef = useRef<HTMLDivElement>(null);
  const [listW, setListW] = useState(800);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setListW(Math.round(entries[0].contentRect.width));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const twoCol   = listW >= 600;
  const maxShown = twoCol ? 10 : 5;
  const visible  = FAILED_RULES.slice(0, maxShown);
  const overflow = Math.max(0, FAILED_RULES.length - maxShown);

  // Group into rows of 2 for the two-column layout
  const rows: (typeof FAILED_RULES)[] = [];
  if (twoCol) {
    for (let i = 0; i < visible.length; i += 2) rows.push(visible.slice(i, i + 2));
  }

  return (
    <>
      {/* Pass / fail distribution */}
      <div className="flex items-center gap-6 mb-3">
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: "var(--widget-kpi-xl)", fontWeight: 700, lineHeight: 1, color: "var(--text-bright)" }}>{checked}</span>
          <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>checked</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: "var(--widget-kpi-xl)", fontWeight: 700, lineHeight: 1, color: "var(--text-bright)" }}>{passed}</span>
          <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>passed</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: "var(--widget-kpi-xl)", fontWeight: 700, lineHeight: 1, color: "var(--text-bright)" }}>{failed}</span>
          <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>failed</span>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="flex rounded-full overflow-hidden gap-px mb-5" style={{ height: "calc(var(--spacing) * 1.5)" }}>
        <div style={{ flex: passed, background: "#4ade80", opacity: 0.75 }} />
        <div style={{ flex: failed, background: "#ef4444", opacity: 0.75 }} />
      </div>

      <div className="border-t border-border mb-4" />

      {/* Severity breakdown */}
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

      {/* Failed rule list — responsive */}
      <div ref={listRef}>
        {twoCol ? (
          /* ── 2-column card grid ── */
          <>
            {/* Column headers — one set per column */}
            <div className="grid pb-2" style={{ gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {[0, 1].map(col => (
                <div key={col} className="flex gap-3">
                  <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--widget-meta)", width: 68 }}>Severity</span>
                  <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>Rule</span>
                </div>
              ))}
            </div>

            {/* Rows — border-top between each pair */}
            {rows.map((rowRules, rowIdx) => (
              <div
                key={rowIdx}
                className="grid"
                style={{
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0 24px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {rowRules.map(rule => {
                  const meta = SEV_META[rule.severity];
                  return (
                    <div key={rule.id} className="py-3 flex flex-col gap-1.5">
                      <div
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 self-start"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}44` }}
                      >
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
          /* ── 1-column table ── */
          <>
            <div className="grid gap-3 pb-2" style={{ gridTemplateColumns: "88px 1fr 200px" }}>
              {["Severity", "Rule", "Scope"].map(h => (
                <span key={h} className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>{h}</span>
              ))}
            </div>
            {visible.map((rule, i) => {
              const meta = SEV_META[rule.severity];
              return (
                <div
                  key={rule.id}
                  className="grid gap-3 items-start py-2"
                  style={{ gridTemplateColumns: "88px 1fr 200px", borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
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

        {/* Overflow indicator */}
        {overflow > 0 && (
          <div
            className="text-muted-foreground pt-3 mt-1 border-t border-border"
            style={{ fontSize: "var(--widget-body-sm)" }}
          >
            +{overflow} more
          </div>
        )}
      </div>
    </>
  );
}

// ── PostureWidget — real (add-on purchased) ───────────────────────────────────

function PostureWidget() {
  return (
    <WidgetCard className="p-5 mt-6" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>Posture</div>
            
          </div>
          <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
            Rule-based compliance scan — app &amp; instance level
          </div>
        </div>
      </div>
      <PostureBody />
    </WidgetCard>
  );
}

// ── Shared dismiss bar ────────────────────────────────────────────────────────

type DismissState = "visible" | "undoable" | "gone";

function DismissBar({ onUndo, onHide }: { onUndo: () => void; onHide: () => void }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 opacity-40 hover:opacity-70 transition-opacity">
      <button
        onClick={onUndo}
        className="text-muted-foreground hover:text-text-bright transition-colors"
        style={{ fontSize: "var(--widget-body-sm)" }}
      >
        Undo
      </button>
      <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>·</span>
      <button
        onClick={onHide}
        className="text-muted-foreground hover:text-text-bright transition-colors"
        style={{ fontSize: "var(--widget-body-sm)" }}
      >
        Don't show again
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OPTION B — AD BANNER
//  Compact single-row card: illustration + headline + CTA; minimal footprint
// ═══════════════════════════════════════════════════════════════════════════════

function PostureIllustration() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      {/* Shield */}
      <path
        d="M22 4L5 11V22c0 10.2 7.4 19.1 17 21.5C31.6 41.1 39 32.2 39 22V11L22 4z"
        fill="#a78bfa" fillOpacity="0.1"
        stroke="#a78bfa" strokeWidth="1.4" strokeOpacity="0.45"
      />
      {/* Rule row 1 — passed */}
      <circle cx="14" cy="19" r="2.5" fill="#4ade80" fillOpacity="0.9" />
      <rect x="19" y="17.5" width="13" height="3" rx="1.5" fill="#4ade80" fillOpacity="0.15" />
      {/* Rule row 2 — failed */}
      <circle cx="14" cy="26" r="2.5" fill="#ef4444" fillOpacity="0.9" />
      <rect x="19" y="24.5" width="9"  height="3" rx="1.5" fill="#ef4444" fillOpacity="0.15" />
      {/* Rule row 3 — passed */}
      <circle cx="14" cy="33" r="2.5" fill="#4ade80" fillOpacity="0.9" />
      <rect x="19" y="31.5" width="11" height="3" rx="1.5" fill="#4ade80" fillOpacity="0.15" />
    </svg>
  );
}

function PostureAdBanner() {
  const [state, setState] = useState<DismissState>("visible");
  if (state === "gone") return null;
  if (state === "undoable") return <DismissBar onUndo={() => setState("visible")} onHide={() => setState("gone")} />;

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-border px-4 py-3.5"
      style={{ background: "linear-gradient(90deg, #a78bfa0d 0%, transparent 60%)", boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}
    >
      {/* Illustration */}
      <div className="shrink-0">
        <PostureIllustration />
      </div>

      {/* Vertical rule */}
      <div className="self-stretch border-l border-border shrink-0" />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: 600 }}>
          Posture scanning is not included in your current plan
        </div>
        <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
          Proactively surface misconfigurations across app and instance configurations before they turn into incidents.
        </div>
      </div>

      {/* CTA + dismiss */}
      <div className="flex items-center gap-4 shrink-0">
        <a
          href="#"
          className="whitespace-nowrap inline-flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ fontSize: "var(--widget-body)", fontWeight: 500, color: "#a78bfa" }}
        >
          Contact your representative
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <button
          onClick={() => setState("undoable")}
          className="text-muted-foreground hover:text-text-bright transition-colors flex items-center justify-center w-6 h-6 rounded-full"
          aria-label="Dismiss"
          style={{ fontSize: "18px", lineHeight: 1 }} /* intentional: icon-size × glyph, not a text role */
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SKU TOGGLE — demo control
// ═══════════════════════════════════════════════════════════════════════════════

type PostureSKU = "purchased" | "not-purchased";

function SkuToggle({ value, onChange }: { value: PostureSKU; onChange: (v: PostureSKU) => void }) {
  const opts: { value: PostureSKU; label: string }[] = [
    { value: "purchased",     label: "Has Posture SKU"  },
    { value: "not-purchased", label: "No Posture SKU"   },
  ];
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="text-muted-foreground"
        style={{ fontSize: "var(--widget-meta)" }}
      >
        Demo
      </span>
      <div
        className="flex items-center rounded-full border border-border p-0.5 gap-0.5"
        style={{ background: "var(--surface)" }}
      >
        {opts.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="rounded-full px-3 py-1 transition-all"
              style={{
                fontSize: "var(--widget-body-sm)",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--text-bright)" : "var(--muted-foreground)",
                background: active ? "var(--surface-raised)" : "transparent",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const TM_H = 340;

export function GoogleDriveDashboard() {
  const [view, setView]           = useState<ViewMode>("type");
  const [hovId, setHovId]         = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [postureSKU, setPostureSKU] = useState<PostureSKU>("purchased");

  // Reset hover when toggling views
  useEffect(() => { setHovId(null); setCursorPos(null); }, [view]);

  // Measure container width for responsive treemap
  const tmContainerRef = useRef<HTMLDivElement>(null);
  const [tmW, setTmW]  = useState(680);
  useEffect(() => {
    const el = tmContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setTmW(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Treemap items
  const tmItems = useMemo(() => {
    if (view === "store") return DRIVES10.map(d => ({ id: d.id, value: d.sensitiveFiles }));
    return ALL_DRIVE_TYPES.map(t => ({ id: t, value: TYPE_VOLUMES[t] ?? 50 }));
  }, [view]);

  const cells = useMemo(() => layoutTreemap(tmItems, tmW, TM_H, 3), [tmItems, tmW]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovId(null);
    setCursorPos(null);
  }, []);

  // Resolve entities for popover
  const hovDrive = view === "store" && hovId ? (DRIVES10.find(d => d.id === hovId) ?? null) : null;
  const hovType  = view === "type" ? hovId : null;
  const showPopover = cursorPos !== null && hovId !== null;

  const GoogleDriveLogo = (
    <svg width={28} height={28} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066da"/>
      <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L3.45 44.7c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85L53.1 64.7l-7.7 12.1h14.5c1.55 0 3.1-.4 4.5-1.2l9.15-5.3z" fill="#ea4335"/>
      <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832d"/>
      <path d="M59.85 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h41.8c1.6 0 3.15-.45 4.5-1.2L59.85 53z" fill="#2684fc"/>
      <path d="M73.4 26.5l-12.7-22C59.9 3.1 58.75 2 57.4 1.2L43.65 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#ffba00"/>
    </svg>
  );

  return (
    <div
      className="flex-1 overflow-auto p-6 hero-cards"
      style={{ background: "var(--color-background)" }}
    >
      {/* Hero header — logo + title + CTA + risk cards */}
      <RisksHero
        appFilterKey="google-drive"
        pageTitle="Google Drive"
        pageSubtitle="Managed cloud storage — drives, files, and shared content"
        logo={GoogleDriveLogo}
      />

      {/* Top summary row — Data Stores + Identities with Access */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <DataStoresWidget
          hideNotConnected
          storeCount={8}
          totalVolumeBytes={1_020e9}
        />
        <IdentityWithAccessCard />
      </div>

      {/* ── Treemap card ──────────────────────────────────────────────────────── */}
      <WidgetCard className="" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>

        {/* Card header */}
        <div className="px-5 pt-4 pb-4 border-b border-border flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-text-bright" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>
              Sensitive Data Type Distribution
            </div>
            <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-subtitle)" }}>
              {view === "store"
                ? "Area proportional to sensitive file count per data store"
                : "Area proportional to total objects found per sensitive data type"}
            </div>
          </div>
          <ViewDropdown value={view} onChange={setView} />
        </div>

        {/* Treemap */}
        <div
          ref={tmContainerRef}
          className="px-5 pt-5"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: "crosshair" }}
        >
          <svg width={tmW} height={TM_H} style={{ display: "block", overflow: "visible" }}>
            {cells.map(cell => {
              const isStore  = view === "store";
              const drive    = isStore ? DRIVES10.find(d => d.id === cell.id) : undefined;
              const isHov    = hovId === cell.id;
              const fullLbl  = isStore ? drive!.name : cell.id;
              const shortLbl = isStore ? drive!.short : (TYPE_SHORT[cell.id] ?? cell.id.split(" ")[0]);
              const cntLbl   = isStore
                ? drive!.sensitiveFiles.toLocaleString()
                : (TYPE_VOLUMES[cell.id] ?? 0).toLocaleString();
              const fs       = Math.min(12, Math.max(8, cell.w / 6));
              // Pick full label if it fits, otherwise fall back to abbreviated
              const lbl      = (fullLbl.length * fs * 0.62 + 16) <= cell.w ? fullLbl : shortLbl;
              const showLbl  = cell.w > 42 && cell.h > 22;
              const showCnt  = cell.h > 42 && cell.w > 38;

              if (isStore && drive) {
                // ── Multi-category strip rendering for store view ─────────────
                // Group dataTypes by category summing file counts
                const catTotals = new Map<Cat, number>();
                for (const dt of drive.dataTypes) {
                  const cat = catOf(dt.name);
                  catTotals.set(cat, (catTotals.get(cat) ?? 0) + dt.files);
                }
                const segments = [...catTotals.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, total]) => ({ cat, total, color: catDef(cat).color }));
                const grandTotal = segments.reduce((s, seg) => s + seg.total, 0);

                // Bottom strip: height scales with cell, capped 4–8px
                const stripH = Math.min(8, Math.max(4, cell.h * 0.14));
                const stripY = cell.y + Math.max(0, cell.h) - stripH;
                const clipId = `clip-gd-${cell.id.replace(/[^a-z0-9]/gi, "_")}`;

                // Pre-compute segment x positions
                let curX = cell.x;
                const segsPos = segments.map(seg => {
                  const segW = grandTotal > 0 ? (seg.total / grandTotal) * Math.max(0, cell.w) : 0;
                  const x = curX;
                  curX += segW;
                  return { ...seg, x, segW };
                });

                return (
                  <g
                    key={cell.id}
                    onMouseEnter={() => setHovId(cell.id)}
                    onMouseLeave={() => setHovId(null)}
                    style={{ cursor: "crosshair" }}
                  >
                    <defs>
                      <clipPath id={clipId}>
                        <rect x={cell.x} y={cell.y} width={Math.max(0, cell.w)} height={Math.max(0, cell.h)} rx={4} />
                      </clipPath>
                    </defs>
                    {/* Neutral background rect */}
                    <rect
                      x={cell.x} y={cell.y}
                      width={Math.max(0, cell.w)} height={Math.max(0, cell.h)}
                      rx={4}
                      fill="rgba(148,163,184,1)" fillOpacity={isHov ? 0.12 : 0.07}
                      stroke="rgba(148,163,184,1)" strokeOpacity={isHov ? 0.55 : 0.28}
                      strokeWidth={isHov ? 1.5 : 1}
                      style={{ transition: "fill-opacity 100ms, stroke-opacity 100ms" }}
                    />
                    {/* Category color strip along the bottom */}
                    <g clipPath={`url(#${clipId})`}>
                      {segsPos.map(seg => (
                        <rect
                          key={seg.cat}
                          x={seg.x} y={stripY}
                          width={seg.segW} height={stripH}
                          fill={seg.color}
                          opacity={isHov ? 0.9 : 0.65}
                          style={{ transition: "opacity 100ms" }}
                        />
                      ))}
                    </g>
                    {showLbl && (
                      <text
                        x={cell.x + cell.w / 2}
                        y={cell.y + (showCnt ? cell.h / 2 - 8 : cell.h / 2)}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={fs} fontWeight={700} opacity={1}
                        style={{ pointerEvents: "none", fill: driveTextColor(drive!) }}
                      >
                        {lbl}
                      </text>
                    )}
                    {showCnt && (
                      <text
                        x={cell.x + cell.w / 2}
                        y={cell.y + cell.h / 2 + 10}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={Math.max(8, fs - 2)} opacity={1}
                        style={{ pointerEvents: "none", fill: driveTextColor(drive!) }}
                      >
                        {cntLbl}
                      </text>
                    )}
                  </g>
                );
              }

              // ── Single-color rendering for data type view ──────
              const col = catDef(catOf(cell.id)).color;
              const textCol = catDef(catOf(cell.id)).textColor;
              const catName = String(catOf(cell.id));
              const showCat = cell.h > 50 && cell.w > 50;

              // Space lines evenly around vertical centre
              const lineH = 18;
              const totalLines = (showLbl ? 1 : 0) + (showCat ? 1 : 0) + (showCnt ? 1 : 0);
              const blockH = (totalLines - 1) * lineH;
              const topY = cell.y + cell.h / 2 - blockH / 2;
              let lineIdx = 0;

              return (
                <g
                  key={cell.id}
                  onMouseEnter={() => setHovId(cell.id)}
                  onMouseLeave={() => setHovId(null)}
                  style={{ cursor: "crosshair" }}
                >
                  <rect
                    x={cell.x} y={cell.y}
                    width={Math.max(0, cell.w)} height={Math.max(0, cell.h)}
                    rx={4}
                    fill={col}
                    fillOpacity={isHov ? 0.55 : 0.30}
                    stroke={col}
                    strokeOpacity={isHov ? 1 : 0.42}
                    strokeWidth={isHov ? 1.5 : 1}
                    style={{ transition: "fill-opacity 100ms, stroke-opacity 100ms, stroke-width 100ms" }}
                  />
                  {showLbl && (() => { const y = topY + lineIdx++ * lineH; return (
                    <text
                      key="lbl"
                      x={cell.x + cell.w / 2} y={y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={fs} fontWeight={700} opacity={1}
                      style={{ pointerEvents: "none", fill: textCol }}
                    >
                      {lbl}
                    </text>
                  ); })()}
                  {showCat && (() => { const y = topY + lineIdx++ * lineH; return (
                    <text
                      key="cat"
                      x={cell.x + cell.w / 2} y={y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(7, fs - 2)} fontWeight={500}
                      opacity={isHov ? 1 : 0.9}
                      style={{ pointerEvents: "none", fill: textCol }}
                    >
                      {catName}
                    </text>
                  ); })()}
                  {showCnt && (() => { const y = topY + lineIdx++ * lineH; return (
                    <text
                      key="cnt"
                      x={cell.x + cell.w / 2} y={y}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(8, fs - 2)}
                      opacity={isHov ? 1 : 0.9}
                      style={{ pointerEvents: "none", fill: textCol }}
                    >
                      {cntLbl}
                    </text>
                  ); })()}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="px-5 py-4">
          <CatLegend />
        </div>
      </WidgetCard>

      {/* ── Cursor-following popover ──────────────────────────────────────────── */}
      {showPopover && cursorPos && (
        <Popover pos={cursorPos}>
          {hovDrive && <StorePopoverContent drive={hovDrive} />}
          {hovType  && <TypePopoverContent  typeName={hovType} />}
        </Popover>
      )}

      {/* ── Data Motion widget ────────────────────────────────────────────────── */}
      <DataMotionWidget />

      {/* ── Posture section ───────────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* Section header with demo toggle */}
        <div className="flex items-center justify-end mb-4">
          <SkuToggle value={postureSKU} onChange={setPostureSKU} />
        </div>
        {postureSKU === "purchased" ? <PostureWidget /> : <PostureAdBanner />}
      </div>
    </div>
  );
}