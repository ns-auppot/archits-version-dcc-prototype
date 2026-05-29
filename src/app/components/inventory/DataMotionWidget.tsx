import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { WidgetCard } from "../ui/WidgetCard";

// ── Mini category taxonomy (only types used in motion data) ───────────────────

const CATS_DM = [
  { key: "PII",  color: "#60a5fa" },
  { key: "SPII", color: "#f87171" },
  { key: "PCI",  color: "#fbbf24" },
  { key: "PFI",  color: "#34d399" },
  { key: "PHI",  color: "#22d3ee" },
  { key: "PAI",  color: "#c084fc" },
  { key: "BII",  color: "#f472b6" },
] as const;

type CatKeyDM = typeof CATS_DM[number]["key"];

const T2C_DM: Record<string, CatKeyDM> = {
  "Personal Names":           "PII",
  "Email Addresses":          "PII",
  "IP Addresses":             "PII",
  "Social Security Numbers":  "SPII",
  "Medical Records":          "PHI",
  "Payment Cards":            "PCI",
  "Bank Account Information": "PFI",
  "Passwords":                "PAI",
  "Source Code":              "BII",
};

function dmCatOf(t: string): CatKeyDM  { return T2C_DM[t] ?? "PII"; }
function dmCatDef(k: CatKeyDM) { return CATS_DM.find(c => c.key === k)!; }

// ═══════════════════════════════════════════════════════════════════════════════
//  MOCK DATA — deterministic seeded RNG, 90 days back from 2026-03-01
// ═══════════════════════════════════════════════════════════════════════════════

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const DRIVES = [
  { id: "e1",  base: 142 },
  { id: "e2",  base: 89  },
  { id: "e3",  base: 234 },
  { id: "e4",  base: 12  },
  { id: "e5",  base: 187 },
  { id: "e6",  base: 45  },
  { id: "e7",  base: 78  },
  { id: "e8",  base: 156 },
  { id: "e9",  base: 38  },
  { id: "e10", base: 9   },
];

const TODAY = new Date(2026, 2, 1);

function fmtDate(d: Date) {
  const mo = d.toLocaleString("default", { month: "short" });
  const dy = String(d.getDate()).padStart(2, "0");
  return `${mo} ${dy}`;
}

const DRIVE_SERIES = DRIVES.map(drive => {
  const r = seededRng(drive.id.charCodeAt(1) * 31 + drive.base);
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - 89 + i);
    const spike = r() < 0.06 ? Math.round(r() * drive.base * 0.18) : 0;
    const ups   = Math.max(0, Math.round(r() * 7 + spike + drive.base * 0.025));
    const dns   = Math.max(0, Math.round(r() * 4 + drive.base * 0.012));
    return { dateStr: fmtDate(d), uploads: ups, downloads: dns };
  });
});

const AGG = Array.from({ length: 90 }, (_, i) => {
  const dateStr = DRIVE_SERIES[0][i].dateStr;
  const ups     = DRIVES.reduce((s, _, di) => s + DRIVE_SERIES[di][i].uploads,   0);
  const dns     = DRIVES.reduce((s, _, di) => s + DRIVE_SERIES[di][i].downloads, 0);
  return { dateStr, uploads: ups, downloads: dns, downloadsMirror: -dns };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

type Range = 7 | 30 | 60 | 90;

function sliceAgg(range: Range) { return AGG.slice(90 - range); }
function xTickInterval(range: Range) { return range === 7 ? 1 : range === 30 ? 4 : range === 60 ? 9 : 14; }

// ── Shared chart constants ────────────────────────────────────────────────────

const TICK = { fontSize: 9, fill: "#6b7280" };
const GRID = { strokeDasharray: "3 3", stroke: "rgba(128,128,128,0.15)", vertical: false as const };

// ── Ranked data types with proportional weights per direction ─────────────────
// Weight drives the proportion of that day's total count attributed to each type.

const UP_TYPES_W = [
  { name: "Personal Names",           w: 30 },
  { name: "Email Addresses",          w: 22 },
  { name: "Medical Records",          w: 16 },
  { name: "Bank Account Information", w: 12 },
  { name: "Social Security Numbers",  w:  8 },
  { name: "IP Addresses",             w:  6 },
  { name: "Passwords",                w:  4 },
  { name: "Source Code",              w:  2 },
];

const DN_TYPES_W = [
  { name: "Medical Records",          w: 28 },
  { name: "Payment Cards",            w: 24 },
  { name: "Personal Names",           w: 18 },
  { name: "Bank Account Information", w: 12 },
  { name: "IP Addresses",             w:  8 },
  { name: "Social Security Numbers",  w:  6 },
  { name: "Passwords",                w:  3 },
  { name: "Source Code",              w:  1 },
];

// ── Per-bar floating tooltip ──────────────────────────────────────────────────

type BarSeries = "up" | "dn";

function BarTip({ series, point }: { series: BarSeries; point: any }) {
  const isUp  = series === "up";
  const count = isUp
    ? (point?.uploads ?? 0)
    : Math.abs(point?.downloads ?? Math.abs(point?.downloadsMirror ?? 0));

  const typesW   = isUp ? UP_TYPES_W : DN_TYPES_W;
  const totalW   = typesW.reduce((s, t) => s + t.w, 0);
  const accentColor = isUp ? "#fb923c" : "#f87171";

  // Distribute the bar's total count proportionally; always at least 1
  const typesWithCounts = typesW.map(t => ({
    name:  t.name,
    files: Math.max(1, Math.round(count * t.w / totalW)),
  }));

  const maxFiles = typesWithCounts[0]?.files ?? 1;
  const shown    = typesWithCounts.slice(0, 5);
  const rest     = typesWithCounts.length - 5;

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-border rounded-xl"
      style={{
        boxShadow: "0 6px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)",
        minWidth: 290,
        pointerEvents: "none",
        padding: "13px 15px",
      }}
    >
      {/* Header — date + KPI */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: 600 }}>
            {point?.dateStr}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontSize: "var(--widget-kpi-md)", fontWeight: 700, lineHeight: 1, color: accentColor }}>
            {count.toLocaleString()}
          </div>
          <div className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--widget-meta)" }}>
            sensitive files {isUp ? "uploaded" : "downloaded"}
          </div>
        </div>
      </div>

      <div className="border-t border-border mb-3" />

      {/* Ranked data types */}
      <div className="text-muted-foreground mb-2" style={{ fontSize: "var(--widget-meta)" }}>
        Top Data Types by Sensitive Object Count
      </div>
      <div className="flex flex-col gap-1.5">
        {shown.map(({ name, files }, i) => {
          const cd = dmCatDef(dmCatOf(name));
          return (
            <div key={name} className="flex items-center gap-2">
              <span
                className="text-muted-foreground shrink-0 tabular-nums"
                style={{ fontSize: "var(--widget-meta)", width: 10, textAlign: "right", opacity: 0.45 }}
              >
                {i + 1}
              </span>
              <span
                className="text-muted-foreground shrink-0"
                style={{ fontSize: "var(--widget-meta)", width: 28, opacity: 0.55 }}
              >
                {cd.key}
              </span>
              <span className="truncate flex-1 text-text-bright" style={{ fontSize: "var(--widget-label)", minWidth: 0 }}>
                {name}
              </span>
              <div
                className="shrink-0 rounded-sm overflow-hidden"
                style={{ width: 40, height: 5, background: "rgba(128,128,128,0.15)" }}
              >
                <div
                  style={{
                    width: `${(files / maxFiles) * 100}%`,
                    height: "100%",
                    background: "rgba(148,163,184,0.55)",
                    borderRadius: 2,
                  }}
                />
              </div>
              <span
                className="text-muted-foreground shrink-0 tabular-nums"
                style={{ fontSize: "var(--widget-meta)", width: 28, textAlign: "right" }}
              >
                {files}
              </span>
            </div>
          );
        })}
        {rest > 0 && (
          <div className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)", paddingLeft: 18, opacity: 0.5 }}>
            +{rest} more
          </div>
        )}
      </div>
    </div>
  );
}

// ── Range toggle ──────────────────────────────────────────────────────────────

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border shrink-0" style={{ fontSize: "var(--widget-body-sm)" }}>
      {([7, 30, 60, 90] as Range[]).map((r, i) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 cursor-pointer transition-colors${i < 3 ? " border-r border-border" : ""}`}
          style={{
            background: value === r ? "var(--primary)" : "transparent",
            color:      value === r ? "var(--primary-foreground, #fff)" : "var(--muted-foreground)",
            fontWeight: value === r ? 600 : 400,
          }}
        >
          {r}d
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SENSITIVE DATA MOTION — mirror bar chart, uploads ↑ / downloads ↓
// ═══════════════════════════════════════════════════════════════════════════════

function SensitiveDataMotion() {
  const [range, setRange]         = useState<Range>(7);
  const data                      = useMemo(() => sliceAgg(range), [range]);
  const [cursor,    setCursor]    = useState<{ x: number; y: number } | null>(null);
  const [activeBar, setActiveBar] = useState<{ series: BarSeries; point: any } | null>(null);

  const totUps = data.reduce((s, d) => s + d.uploads,   0);
  const totDns = data.reduce((s, d) => s + d.downloads, 0);

  return (
    <WidgetCard className="flex flex-col" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border">
        <div className="min-w-0">
          <div className="text-text-bright mb-1" style={{ fontSize: "var(--widget-title)", fontWeight: 600 }}>
            Sensitive Data in Motion
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)", lineHeight: 1.5 }}>
            Sensitive files moving in and out of your data stores, per day. Hover a bar to see which data types were present.
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {/* KPI row */}
      <div className="flex items-center gap-8 px-5 py-4">
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: "var(--widget-kpi-xl)", fontWeight: 700, lineHeight: 1, color: "var(--text-bright)" }}>
            {totUps.toLocaleString()}
          </span>
          <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>
            sensitive objects uploaded
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: "var(--widget-kpi-xl)", fontWeight: 700, lineHeight: 1, color: "var(--text-bright)" }}>
            {totDns.toLocaleString()}
          </span>
          <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>
            sensitive objects downloaded
          </span>
        </div>
      </div>

      {/* Chart */}
      <div
        className="px-5 pb-4 relative"
        onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => { setActiveBar(null); setCursor(null); }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }} barCategoryGap="25%">
            <CartesianGrid key="grid" {...GRID} />
            <XAxis key="x" dataKey="dateStr" tick={TICK} axisLine={false} tickLine={false} interval={xTickInterval(range)} />
            <YAxis key="y"
              tick={TICK}
              axisLine={false}
              tickLine={false}
              domain={[
                Math.min(...data.map((d) => d.downloadsMirror), 0) - 5,
                Math.max(...data.map((d) => d.uploads), 0) + 5,
              ]}
              tickFormatter={(n: number) => `${Math.abs(n)}`}
              label={{ value: "files / day", angle: -90, position: "insideLeft", offset: 16, style: { fontSize: 8, fill: "#6b7280" } }}
            />
            <ReferenceLine key="ref0" y={0} stroke="rgba(128,128,128,0.35)" strokeWidth={1} />

            {/*
              Custom shape renderer — draws BOTH bars inside a single recharts <Bar>.
              recharts gives us the uploads bar's SVG y + height, from which we derive:
                • yZero     = y + height  (SVG coordinate of the zero line)
                • pxPerUnit = height / value  (pixels per data unit, same scale for both directions)
              The orange download rect is then drawn from yZero downward using the same scale.
              This sidesteps all stacking / domain-alignment issues with stackOffset="sign".
            */}
            <Bar
              key="uploads"
              dataKey="uploads"
              isAnimationActive={false}
              shape={(shapeProps: any) => {
                const { x, y, width, height, value, payload } = shapeProps;
                if (typeof height !== "number" || height <= 0 || !value) return <g />;

                const yZero     = y + height;              // SVG y of the zero baseline
                const pxPerUnit = height / value;           // pixels per one data unit
                const dmAbs     = Math.abs(payload?.downloadsMirror ?? 0);
                const dmH       = dmAbs * pxPerUnit;       // pixel height of download bar

                return (
                  <g>
                    {/* ↑ Upload bar — grows upward from zero */}
                    <rect
                      x={x} y={y} width={width} height={Math.max(0, height)}
                      fill="#fb923c" fillOpacity={0.85} rx={2} ry={2}
                      onMouseEnter={() => setActiveBar({ series: "up", point: payload })}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                    {/* ↓ Download bar — grows downward from zero */}
                    {dmH > 0 && (
                      <rect
                        x={x} y={yZero} width={width} height={Math.max(0, dmH)}
                        fill="#f87171" fillOpacity={0.85} rx={2} ry={2}
                        onMouseEnter={() => setActiveBar({ series: "dn", point: payload })}
                        onMouseLeave={() => setActiveBar(null)}
                      />
                    )}
                  </g>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Floating per-bar tooltip — smart vertical centering */}
        {activeBar && cursor && (() => {
          const tipH   = 260; // estimated tooltip height
          const spaceR = window.innerWidth - cursor.x - 20;
          const left   = spaceR >= 310 ? cursor.x + 16 : cursor.x - 310;
          let   top    = cursor.y - tipH / 2;
          top = Math.max(8, Math.min(top, window.innerHeight - tipH - 8));
          return (
            <div style={{ position: "fixed", left, top, zIndex: 9999, pointerEvents: "none" }}>
              <BarTip series={activeBar.series} point={activeBar.point} />
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-5 py-4 border-t border-border" style={{ fontSize: "var(--widget-label)" }}>
        <div className="flex items-center gap-1.5">
          <div className="rounded-sm shrink-0" style={{ width: 8, height: 8, background: "#fb923c" }} />
          <span className="text-muted-foreground">Uploads — sensitive files / day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="rounded-sm shrink-0" style={{ width: 8, height: 8, background: "#f87171" }} />
          <span className="text-muted-foreground">Downloads — sensitive files / day</span>
        </div>
      </div>
    </WidgetCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function DataMotionWidget() {
  return (
    <div className="mt-6">
      <SensitiveDataMotion />
    </div>
  );
}