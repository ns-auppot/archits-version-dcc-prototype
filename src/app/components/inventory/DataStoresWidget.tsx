import { useId, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
} from "recharts";
import { Database, Info } from "lucide-react";
import { NotConnectedStoresPanel } from "./NotConnectedStoresPanel";
import { WidgetCard } from "../ui/WidgetCard";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// 16 total discovered: 13 connected, 3 gaps
const CONNECTED     = 13;
const NOT_CONNECTED = 3;

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA — 30-day volume time series, deterministic seeded RNG
// ═══════════════════════════════════════════════════════════════════════════════

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const TODAY     = new Date(2026, 2, 1);
const VOL_START = 950e9;
const VOL_END   = 1150e9;

function fmtDate(d: Date) {
  const mo = d.toLocaleString("default", { month: "short" });
  const dy = String(d.getDate()).padStart(2, "0");
  return `${mo} ${dy}`;
}

const volRng  = seededRng(42);
const sensRng = seededRng(77);

const STORE_DATA = Array.from({ length: 30 }, (_, i) => {
  const d             = new Date(TODAY);
  d.setDate(d.getDate() - 29 + i);
  const growthPerDay  = (VOL_END - VOL_START) / 29;
  const volNoise      = (volRng()  - 0.5) * 2 * growthPerDay * 0.8;
  const totalVolume   = Math.round(VOL_START + growthPerDay * i + volNoise);
  const sensitiveFrac = 0.225 + (sensRng() - 0.5) * 0.06;
  const sensitiveVolume = Math.round(totalVolume * sensitiveFrac);
  return { dateStr: fmtDate(d), totalVolume, sensitiveVolume };
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function bytesFmt(n: number, decimals = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(decimals)} TB`;
  if (abs >= 1e9)  return `${(n / 1e9).toFixed(decimals)} GB`;
  if (abs >= 1e6)  return `${(n / 1e6).toFixed(decimals)} MB`;
  if (abs >= 1e3)  return `${(n / 1e3).toFixed(decimals)} KB`;
  return `${n} B`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOVER TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function DataStoresTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total     = (payload.find((p: any) => p.dataKey === "totalVolume")?.value     ?? 0) as number;
  const sensitive = (payload.find((p: any) => p.dataKey === "sensitiveVolume")?.value ?? 0) as number;
  const pct       = total > 0 ? ((sensitive / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      className="bg-surface-raised border border-border rounded-lg px-2.5 py-2"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.18)", pointerEvents: "none", minWidth: 176 }}
    >
      <div className="text-muted-foreground mb-1.5" style={{ fontSize: "var(--widget-meta)" }}>
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="rounded-sm shrink-0" style={{ width: 6, height: 6, background: "#60a5fa" }} />
            <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>Total</span>
          </div>
          <span className="text-text-bright tabular-nums" style={{ fontSize: "var(--widget-label)", fontWeight: 700 }}>
            {bytesFmt(total)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="rounded-sm shrink-0" style={{ width: 6, height: 6, background: "#fb923c" }} />
            <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>Sensitive</span>
          </div>
          <span className="text-text-bright tabular-nums" style={{ fontSize: "var(--widget-label)", fontWeight: 700 }}>
            {bytesFmt(sensitive)}
            <span className="text-muted-foreground" style={{ fontWeight: 400 }}> · {pct}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WIDGET — compact card, matches Identity with Access visual weight
// ═══════════════════════════════════════════════════════════════════════════════

export function DataStoresWidget({
  hideNotConnected,
  storeCount,
  totalVolumeBytes,
  volumeBreakdown,
}: {
  hideNotConnected?: boolean;
  storeCount?: number;
  totalVolumeBytes?: number;
  volumeBreakdown?: { label: string; bytes: number }[];
} = {}) {
  const uid      = useId();
  const gradTotal = `dsGradTotal-${uid}`;
  const gradSens  = `dsGradSens-${uid}`;
  const latest   = STORE_DATA[STORE_DATA.length - 1];

  // ── Scale chart + KPI values when an override volume is provided ──────────
  const volScale = totalVolumeBytes != null ? totalVolumeBytes / latest.totalVolume : 1;
  const chartData = volScale === 1
    ? STORE_DATA
    : STORE_DATA.map(d => ({
        ...d,
        totalVolume:    Math.round(d.totalVolume    * volScale),
        sensitiveVolume: Math.round(d.sensitiveVolume * volScale),
      }));
  const displayLatest = chartData[chartData.length - 1];

  const displayCount = storeCount ?? CONNECTED;
  const sensePct = ((displayLatest.sensitiveVolume / displayLatest.totalVolume) * 100).toFixed(1);
  const [notConnectedOpen, setNotConnectedOpen] = useState(false);

  return (
    <>
    <WidgetCard className="rounded-xl p-4 flex flex-col gap-3" style={{ boxShadow: "0 2px 10px rgba(100,116,139,0.07), 0 1px 3px rgba(100,116,139,0.04)" }}>

      {/* Subtitle + icon — mirrors Identity card header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)" }}>Data Stores</span>
        <div className="flex items-center gap-2 shrink-0">
          {/* Gap notice — inline, no extra row */}
          {!hideNotConnected && (
          <div
            className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}
          >
            <div className="rounded-full shrink-0" style={{ width: 4, height: 4, background: "#fb923c" }} />
            <span style={{ fontSize: "var(--widget-meta)", color: "rgba(251,146,60,0.9)" }}>
              {NOT_CONNECTED} not connected
            </span>
            <span style={{ width: 1, height: 10, background: "rgba(251,146,60,0.25)", display: "inline-block" }} />
            <button
              className="transition-colors"
              style={{ fontSize: "var(--widget-meta)", fontWeight: 600, color: "#fb923c" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              onClick={() => setNotConnectedOpen(true)}
            >
              Connect
            </button>
          </div>
          )}
          <Database size={14} className="text-muted-foreground opacity-40 shrink-0" />
        </div>
      </div>

      {/* KPI row */}
      <div className="flex items-baseline gap-1.5 flex-wrap">

        {/* Pair 1: total stores */}
        <span style={{ fontSize: "var(--widget-kpi-lg)", fontWeight: 600, lineHeight: 1, color: "var(--text-bright)" }}>
          {displayCount}
        </span>
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>data stores</span>

        {/* Vertical divider between pairs */}
        <span
          className="self-center shrink-0 mx-1"
          style={{ display: "inline-block", width: 1, height: 12, background: "var(--border)", opacity: 0.6 }}
        />

        {/* Pair 2: sensitive volume (large) · total volume (small) */}
        <span style={{ fontSize: "var(--widget-kpi-lg)", fontWeight: 600, lineHeight: 1, color: "var(--text-bright)" }}>
          {bytesFmt(displayLatest.sensitiveVolume)}
        </span>
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-kpi-label)" }}>sensitive ({sensePct}%)</span>

        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)", opacity: 0.4 }}>·</span>

        <span className="relative group/vol inline-flex items-center cursor-default">
          <span style={{ fontSize: "var(--widget-body-sm)", fontWeight: 600, color: "var(--text-bright)" }}>
            {bytesFmt(displayLatest.totalVolume)}
          </span>
          {/* Breakdown tooltip — appears on hover of the volume number, only when breakdown data is provided */}
          {volumeBreakdown && (
          <span
            className="absolute bottom-full left-0 mb-2 px-2.5 py-2 bg-[#0f1a2e] border border-border rounded-md shadow-xl opacity-0 group-hover/vol:opacity-100 transition-opacity pointer-events-none z-50"
            style={{ minWidth: 188, whiteSpace: "nowrap" }}
          >
            <div className="text-muted-foreground mb-1.5" style={{ fontSize: "10px" }}>Volume by store type</div>
            <div className="flex flex-col gap-1">
              {volumeBreakdown.map(({ label, bytes }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>{label}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#ffffff" }}>
                    {bytesFmt(bytes)}
                  </span>
                </div>
              ))}
            </div>
          </span>
          )}
        </span>
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-body-sm)" }}>total</span>

      </div>

      {/* Mini chart — XAxis hidden so tooltip label = dateStr not array index */}
      <div
        style={{
          height: 48,
          borderRadius: 6,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "4px 2px 2px",
        }}
      >
        <ResponsiveContainer width="100%" height={42} minWidth={1}>
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs key="ds-defs">
              <linearGradient id={gradTotal} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#60a5fa" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={gradSens} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#fb923c" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#fb923c" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            {/* Hidden XAxis makes `label` in tooltip = dateStr instead of array index */}
            <XAxis key="x" dataKey="dateStr" hide />

            <Tooltip
              key="tooltip"
              content={<DataStoresTooltip />}
              cursor={{ stroke: "rgba(128,128,128,0.18)", strokeWidth: 1 }}
            />

            {/* Total volume — behind, blue */}
            <Area
              key="totalVolume"
              type="monotone"
              dataKey="totalVolume"
              stroke="#60a5fa"
              strokeWidth={1.5}
              fill={`url(#${gradTotal})`}
              dot={false}
              activeDot={{ r: 2.5, fill: "#60a5fa", strokeWidth: 0 }}
            />
            {/* Sensitive estimate — in front, orange */}
            <Area
              key="sensitiveVolume"
              type="monotone"
              dataKey="sensitiveVolume"
              stroke="#fb923c"
              strokeWidth={1.5}
              fill={`url(#${gradSens})`}
              dot={false}
              activeDot={{ r: 2.5, fill: "#fb923c", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </WidgetCard>

    <NotConnectedStoresPanel
      open={notConnectedOpen}
      onClose={() => setNotConnectedOpen(false)}
    />
    </>
  );
}