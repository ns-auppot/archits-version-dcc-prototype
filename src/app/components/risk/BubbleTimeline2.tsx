import { useState, useRef, useMemo } from "react";
import { Eye, AlertTriangle, Lock, Clock, UserMinus, ShieldCheck, X } from "lucide-react";
import { RISK_TYPES } from "../../shared/risk-rules";
import type { RiskRule } from "../../shared/risk-rules";
import { SCAN_HISTORY } from "../../shared/scan-data";
import type { ScanInstance } from "../../shared/scan-data";
import { countFindingsForRule } from "../../shared/risk-findings";
import { PolicyFindingDetailOverlay } from "./PolicyFindingDetail";

// ── Shared constants ──────────────────────────────────────────────────────────

const RISK_META = Object.fromEntries(
  RISK_TYPES.map(rt => [rt.id, { label: rt.label, fg: rt.fg, bg: rt.bg }])
);
const RISK_ORDER = RISK_TYPES.map(rt => rt.id);

const RISK_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  overexposed:   Eye,
  exfil:         AlertTriangle,
  overprivilege: Lock,
  stale:         Clock,
  former:        UserMinus,
  compliance:    ShieldCheck,
};

const SCAN_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  Discovery: { color: "#60a5fa", bg: "rgba(96,165,250,0.18)",  label: "DISCOVERY" },
  Targeted:  { color: "#f59e0b", bg: "rgba(245,158,11,0.18)", label: "TARGETED"  },
  Ongoing:   { color: "#a3e635", bg: "rgba(163,230,53,0.18)", label: "ONGOING"   },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── SVG layout ────────────────────────────────────────────────────────────────
const SVG_W      = 1000;
const LABEL_W    = 148;
const TL_X       = LABEL_W;
const R_PAD      = 18;
const CS_COL_W   = 88;
const GAP_W      = 28;
const TL_END_X   = SVG_W - CS_COL_W - GAP_W - R_PAD;
const CS_LEFT    = TL_END_X + GAP_W;
const CS_RIGHT   = SVG_W - R_PAD;
const CS_CX      = (CS_LEFT + CS_RIGHT) / 2;
const TL_W       = TL_END_X - TL_X;
const HEADER_H   = 52;
const ROW_H      = 96;
const NUM_ROWS   = RISK_ORDER.length;
const SVG_H      = HEADER_H + ROW_H * NUM_ROWS + 24;
const MAX_AMP    = 38;
const MAX_CS_AMP = 42;
const CAPTURE_R  = 30;

// ── Timeline date math ────────────────────────────────────────────────────────

const START_DATE = new Date("2026-01-01");
const END_DATE   = new Date("2026-03-22");
const NOW_DATE   = new Date("2026-03-11");

function dayOffset(d: Date) {
  return (d.getTime() - START_DATE.getTime()) / 86_400_000;
}
const TOTAL_DAYS = dayOffset(END_DATE);
function dateToX(d: Date) {
  return TL_X + (dayOffset(d) / TOTAL_DAYS) * TL_W;
}

const SCAN_X = Object.fromEntries(SCAN_HISTORY.map(s => [s.id, dateToX(new Date(s.date))]));

// ── Tick marks ────────────────────────────────────────────────────────────────

const TICKS = [
  { date: new Date("2026-01-01"), label: "Jan 1"  },
  { date: new Date("2026-01-08"), label: "Jan 8"  },
  { date: new Date("2026-01-15"), label: "Jan 15" },
  { date: new Date("2026-01-22"), label: "Jan 22" },
  { date: new Date("2026-01-29"), label: "Jan 29" },
  { date: new Date("2026-02-05"), label: "Feb 5"  },
  { date: new Date("2026-02-12"), label: "Feb 12" },
  { date: new Date("2026-02-19"), label: "Feb 19" },
  { date: new Date("2026-02-26"), label: "Feb 26" },
  { date: new Date("2026-03-05"), label: "Mar 5"  },
  { date: new Date("2026-03-12"), label: "Mar 12" },
];

// ── Scale denominators ────────────────────────────────────────────────────────

const GLOBAL_MAX_ADDED = Math.max(
  1,
  ...SCAN_HISTORY.flatMap(s => RISK_ORDER.map(id => s.added[id] ?? 0))
);
const MAX_CURRENT = Math.max(
  1,
  ...RISK_ORDER.map(id => SCAN_HISTORY[SCAN_HISTORY.length - 1].currentFindings[id] ?? 0)
);

// ── Age bucket computation ────────────────────────────────────────────────────

const NOW_MS = NOW_DATE.getTime();

type AgeBuckets = [number, number, number, number];

function computeAgeBuckets(riskId: string): AgeBuckets {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
  SCAN_HISTORY.forEach(scan => {
    const ageDays = (NOW_MS - new Date(scan.date).getTime()) / 86_400_000;
    const added   = scan.added[riskId] ?? 0;
    if      (ageDays >= 45) b0 += added;
    else if (ageDays >= 25) b1 += added;
    else if (ageDays >= 12) b2 += added;
    else                    b3 += added;
  });
  const rawTotal     = b0 + b1 + b2 + b3;
  const currentTotal = SCAN_HISTORY[SCAN_HISTORY.length - 1].currentFindings[riskId] ?? 0;
  if (rawTotal === 0 || currentTotal === 0) return [0, 0, 0, 0];
  const s = currentTotal / rawTotal;
  return [
    Math.round(b0 * s),
    Math.round(b1 * s),
    Math.round(b2 * s),
    Math.round(b3 * s),
  ];
}

const AGE_BANDS = [
  { label: ">45 days",   color: "#f87171" },
  { label: "25–45 days", color: "#fb923c" },
  { label: "12–25 days", color: "#fbbf24" },
  { label: "<12 days",   color: "#4ade80" },
] as const;

const CS_LAYERS = [
  { numBars: 11, fillOpacity: 0.13 },
  { numBars:  9, fillOpacity: 0.28 },
  { numBars:  7, fillOpacity: 0.46 },
  { numBars:  5, fillOpacity: 0.66 },
] as const;

// ── EQ mirrored bars path ─────────────────────────────────────────────────────

function eqMirroredPath(
  cx: number, baseline: number, amp: number,
  numBars = 5, barW = 3, gap = 2
): string {
  if (amp < 1) return "";
  const totalW = numBars * barW + (numBars - 1) * gap;
  const startX = cx - totalW / 2;
  const r      = barW / 2;
  const mid    = (numBars - 1) / 2;
  const sigma  = mid * 0.62;
  return Array.from({ length: numBars }, (_, i) => {
    const t  = sigma > 0 ? (i - mid) / sigma : 0;
    const bh = amp * Math.exp(-0.5 * t * t);
    if (bh < 1) return "";
    const bx   = (startX + i * (barW + gap)).toFixed(1);
    const bxr  = (startX + i * (barW + gap) + barW).toFixed(1);
    const bl   = baseline.toFixed(1);
    const ytop = (baseline - bh + r).toFixed(1);
    const ybot = (baseline + bh - r).toFixed(1);
    return [
      `M ${bx} ${bl} L ${bx} ${ytop} A ${r} ${r} 0 0 1 ${bxr} ${ytop} L ${bxr} ${bl} Z`,
      `M ${bx} ${bl} L ${bx} ${ybot} A ${r} ${r} 0 0 0 ${bxr} ${ybot} L ${bxr} ${bl} Z`,
    ].join(" ");
  }).join(" ");
}

// ── Scan blip hover popover ───────────────────────────────────────────────────

function ScanPopover({ scan, clientX, clientY }: {
  scan: ScanInstance; clientX: number; clientY: number;
}) {
  const st         = SCAN_TYPE_STYLES[scan.type] ?? { color: "#e2e8f0", bg: "rgba(226,232,240,0.1)", label: scan.type.toUpperCase() };
  const totalAdded = RISK_ORDER.reduce((s, id) => s + (scan.added[id] ?? 0), 0);
  const WIDTH      = 210;
  const GAP        = 14;
  const placeAbove = clientY > 300;
  const top        = placeAbove ? clientY - GAP : clientY + GAP;
  let left         = clientX - WIDTH / 2;
  left             = Math.max(8, Math.min(left, window.innerWidth - WIDTH - 8));

  return (
    <div style={{
      position: "fixed", top, left, width: WIDTH,
      transform: placeAbove ? "translateY(-100%)" : "none",
      zIndex: 9999,
      background: "var(--color-card)",
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      boxShadow: "0 10px 36px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      <div style={{
        padding: "10px 13px 12px",
        background: hexToRgba(st.color, 0.07),
        display: "flex", flexDirection: "column", gap: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: 4,
            color: st.color, background: st.bg, letterSpacing: "0.06em",
          }}>
            {st.label}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-foreground)" }}>
            {scan.timestamp.split("  ")[0]}
          </span>
        </div>
        {scan.scope && (
          <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", fontStyle: "italic" }}>
            {scan.scope}
          </span>
        )}
        <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
          <span style={{ fontWeight: 600, color: "var(--color-foreground)" }}>
            {totalAdded > 0 ? `+${totalAdded}` : "0"}
          </span>{" "}
          new finding{totalAdded !== 1 ? "s" : ""} discovered
        </span>
      </div>
    </div>
  );
}

// ── Current state hover popover ───────────────────────────────────────────────

function CurrentStatePopover({ riskId, buckets, clientX, clientY }: {
  riskId: string; buckets: AgeBuckets; clientX: number; clientY: number;
}) {
  const meta = RISK_META[riskId];
  if (!meta) return null;
  const [b0, b1, b2, b3] = buckets;
  const total     = b0 + b1 + b2 + b3;
  const pastSLA   = b0 + b1;
  const maxBucket = Math.max(1, b0, b1, b2, b3);
  const WIDTH     = 228;
  const GAP       = 14;
  const placeAbove = clientY > 300;
  const top  = placeAbove ? clientY - GAP : clientY + GAP;
  let left   = clientX - WIDTH / 2;
  left       = Math.max(8, Math.min(left, window.innerWidth - WIDTH - 8));

  return (
    <div style={{
      position: "fixed", top, left, width: WIDTH,
      transform: placeAbove ? "translateY(-100%)" : "none",
      zIndex: 9999,
      background: "var(--color-card)",
      border: `1px solid ${hexToRgba(meta.fg, 0.35)}`,
      borderRadius: 10,
      boxShadow: "0 10px 36px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      <div style={{
        padding: "9px 12px 8px",
        borderBottom: "1px solid var(--color-border)",
        background: hexToRgba(meta.fg, 0.07),
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.fg, flexShrink: 0 }} />
        <span style={{ fontSize: "12px", fontWeight: 700, color: meta.fg }}>{meta.label}</span>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-foreground)", marginLeft: "auto" }}>
          {total} active
        </span>
      </div>
      <div style={{ padding: "9px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>
          FINDING AGE
        </span>
        {AGE_BANDS.map((band, bi) => {
          const count = buckets[bi];
          return (
            <div key={bi} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: band.color, flexShrink: 0 }} />
              <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", width: 72, flexShrink: 0 }}>
                {band.label}
              </span>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  width: `${(count / maxBucket) * 100}%`, height: "100%",
                  background: band.color, borderRadius: 99,
                  opacity: count > 0 ? 0.85 : 0.15,
                }} />
              </div>
              <span style={{
                fontSize: "10px", fontWeight: 600,
                color: count > 0 ? band.color : "var(--color-muted-foreground)",
                width: 22, textAlign: "right", flexShrink: 0,
              }}>
                {count > 0 ? count : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {pastSLA > 0 && (
        <div style={{ padding: "6px 12px 8px", borderTop: "1px solid var(--color-border)", background: "rgba(248,113,113,0.06)" }}>
          <span style={{ fontSize: "10px", color: "#f87171", fontWeight: 600 }}>
            {pastSLA} finding{pastSLA !== 1 ? "s" : ""} likely past 30-day SLA
          </span>
        </div>
      )}
      <div style={{ padding: "6px 12px 8px", borderTop: "1px solid var(--color-border)" }}>
        <span style={{ fontSize: "10px", color: "var(--color-primary)", fontWeight: 500 }}>
          Click to view rules →
        </span>
      </div>
    </div>
  );
}

// ── Risk type side panel ──────────────────────────────────────────────────────

function RiskTypePanel({
  riskId,
  onClose,
  onSelectRule,
}: {
  riskId: string;
  onClose: () => void;
  onSelectRule: (rule: RiskRule) => void;
}) {
  const [showZeroRules, setShowZeroRules] = useState(false);
  const meta     = RISK_META[riskId];
  const riskType = RISK_TYPES.find(rt => rt.id === riskId);
  const Icon     = RISK_ICON_MAP[riskId] ?? AlertTriangle;

  const { active, zero, totalFindings } = useMemo(() => {
    if (!riskType) return { active: [], zero: [], totalFindings: 0 };
    const sorted = [...riskType.rules].sort(
      (a, b) => countFindingsForRule(b.id) - countFindingsForRule(a.id)
    );
    return {
      active:        sorted.filter(r => countFindingsForRule(r.id) > 0),
      zero:          sorted.filter(r => countFindingsForRule(r.id) === 0),
      totalFindings: sorted.reduce((s, r) => s + countFindingsForRule(r.id), 0),
    };
  }, [riskType]);

  if (!meta || !riskType) return null;

  return (
    <div
      className="flex flex-col shrink-0 border-l overflow-hidden"
      style={{
        width: 288,
        borderColor: "var(--color-border)",
        background: "var(--color-card)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b shrink-0"
        style={{
          borderColor: "var(--color-border)",
          background: hexToRgba(meta.fg, 0.06),
        }}
      >
        <span
          className="flex items-center justify-center rounded-md shrink-0"
          style={{ width: 24, height: 24, background: meta.bg, color: meta.fg }}
        >
          <Icon size={13} />
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span style={{ fontSize: "12px", fontWeight: 700, color: meta.fg, lineHeight: 1.3 }}>
            {meta.label}
          </span>
          <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
            {totalFindings} finding{totalFindings !== 1 ? "s" : ""} · {riskType.rules.length} rules
          </span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
          style={{ width: 24, height: 24, color: "var(--color-muted-foreground)" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Rule list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        {/* Section label */}
        <div className="flex items-center gap-2 mb-0.5 px-1">
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", color: "var(--color-muted-foreground)" }}>
            FINDINGS
          </p>
          <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
            ({totalFindings})
          </span>
        </div>

        {/* Active rules */}
        {active.map(rule => (
          <RulePanelRow
            key={rule.id}
            rule={rule}
            riskMeta={meta}
            Icon={Icon}
            onSelect={onSelectRule}
          />
        ))}

        {/* Zero-findings rules toggle */}
        {zero.length > 0 && (
          <>
            {showZeroRules && zero.map(rule => (
              <RulePanelRow
                key={rule.id}
                rule={rule}
                riskMeta={meta}
                Icon={Icon}
                disabled
              />
            ))}
            <button
              onClick={() => setShowZeroRules(v => !v)}
              className="flex items-center gap-1.5 mt-1 px-1 transition-colors hover:opacity-100"
              style={{ fontSize: "10px", color: "var(--color-muted-foreground)", opacity: 0.7 }}
            >
              <Eye size={11} />
              {showZeroRules
                ? "Hide zero-findings rules"
                : `${zero.length} more rule${zero.length !== 1 ? "s" : ""} (no findings)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RulePanelRow({
  rule, riskMeta, Icon, onSelect, disabled,
}: {
  rule: RiskRule;
  riskMeta: { label: string; fg: string; bg: string };
  Icon: React.ComponentType<{ size?: number }>;
  onSelect?: (rule: RiskRule) => void;
  disabled?: boolean;
}) {
  const count = useMemo(() => countFindingsForRule(rule.id), [rule.id]);
  const hasFindings = count > 0;

  return (
    <button
      onClick={() => onSelect?.(rule)}
      disabled={disabled}
      className={`w-full text-left px-2.5 py-2 rounded-lg flex flex-col gap-1 transition-colors ${
        disabled
          ? "opacity-35 cursor-not-allowed pointer-events-none"
          : "hover:bg-white/5 cursor-pointer"
      }`}
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 flex items-center justify-center rounded-md mt-px"
          style={{ width: 20, height: 20, background: riskMeta.bg, color: riskMeta.fg }}
        >
          <Icon size={11} />
        </span>
        <span style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1.4, color: "var(--color-foreground)" }}>
          {rule.name}
        </span>
      </div>
      <p style={{ fontSize: "10px", lineHeight: 1.5, color: "var(--color-muted-foreground)" }}>
        {rule.description || rule.conditionSummary}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
          {count} finding{count !== 1 ? "s" : ""}
        </p>
        {hasFindings && onSelect && (
          <span style={{ fontSize: "10px", color: "var(--color-primary)" }}>
            View →
          </span>
        )}
        <span style={{ fontSize: "9px", color: "#ff69b4", fontWeight: 700, flexShrink: 0 }}>
          {rule.policyEngine}
        </span>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BubbleTimeline2() {
  const svgRef = useRef<SVGSVGElement>(null);

  const [hoveredScan, setHoveredScan] = useState<{
    scan: ScanInstance; clientX: number; clientY: number;
  } | null>(null);

  const [hoveredCS, setHoveredCS] = useState<{
    riskId: string; clientX: number; clientY: number;
  } | null>(null);

  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [selectedRule,   setSelectedRule]   = useState<RiskRule | null>(null);

  const lastScan = SCAN_HISTORY[SCAN_HISTORY.length - 1];

  // ── SVG coord helpers ──

  function toSvgCoords(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      svgX: ((e.clientX - rect.left)  / rect.width)  * SVG_W,
      svgY: ((e.clientY - rect.top)   / rect.height) * SVG_H,
    };
  }

  // ── Hover ──

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const coords = toSvgCoords(e);
    if (!coords) return;
    const { svgX, svgY } = coords;

    // Current state column
    if (svgX >= CS_LEFT && svgX <= CS_RIGHT) {
      const rowIdx = Math.floor((svgY - HEADER_H) / ROW_H);
      if (rowIdx >= 0 && rowIdx < NUM_ROWS) {
        setHoveredCS({ riskId: RISK_ORDER[rowIdx], clientX: e.clientX, clientY: e.clientY });
        setHoveredScan(null);
        return;
      }
    }
    setHoveredCS(null);

    // Gap or outside timeline
    if (svgX >= TL_END_X || svgX < TL_X) {
      setHoveredScan(null);
      return;
    }

    // Timeline: snap to nearest scan
    let best: ScanInstance | null = null;
    let bestDist = CAPTURE_R;
    SCAN_HISTORY.forEach(s => {
      const d = Math.abs(svgX - SCAN_X[s.id]);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    setHoveredScan(best ? { scan: best, clientX: e.clientX, clientY: e.clientY } : null);
  }

  // ── Click ──

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const coords = toSvgCoords(e);
    if (!coords) return;
    const { svgX, svgY } = coords;

    if (svgX >= CS_LEFT && svgX <= CS_RIGHT) {
      const rowIdx = Math.floor((svgY - HEADER_H) / ROW_H);
      if (rowIdx >= 0 && rowIdx < NUM_ROWS) {
        const riskId = RISK_ORDER[rowIdx];
        // Toggle: clicking same risk closes panel
        setSelectedRiskId(prev => prev === riskId ? null : riskId);
        setSelectedRule(null);
        return;
      }
    }

    // Clicking outside CS column deselects panel (but not if clicking timeline)
    if (svgX < TL_END_X) return; // don't dismiss on timeline click
    setSelectedRiskId(null);
  }

  // ── Cursor ──
  const svgCursor = hoveredCS ? "pointer" : "default";

  return (
    <div className="flex flex-col gap-3">

      {/* Description */}
      <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
        Each blip = findings <strong>newly discovered</strong> by that scan, per risk type.
        The <strong>CURRENT STATE</strong> column shows today's active posture — bar intensity reveals finding
        age, so the dense dark core means older unresolved findings. <strong>Click a current state blip</strong> to
        view its rules.
      </p>

      {/* Age legend */}
      <div className="flex items-center gap-4 flex-wrap shrink-0">
        <span style={{
          fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)",
          letterSpacing: "0.07em", flexShrink: 0,
        }}>
          FINDING AGE
        </span>
        {AGE_BANDS.map((band, bi) => (
          <span key={bi} className="flex items-center gap-1.5"
            style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: band.color }} />
            {band.label}
          </span>
        ))}
      </div>

      {/* Chart + side panel row */}
      <div className="flex rounded-xl border" style={{ borderColor: "var(--color-border)" }}>

        {/* SVG scroll container */}
        <div className="overflow-x-auto relative" style={{ flex: "1 1 0" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height={SVG_H}
            style={{ display: "block", background: "var(--color-card)", cursor: svgCursor }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setHoveredScan(null); setHoveredCS(null); }}
            onClick={handleClick}
          >
            {/* ── Row backgrounds (zebra) ── */}
            {RISK_ORDER.map((riskId, rowIdx) => {
              if (rowIdx % 2 === 0) return null;
              const rowTop = HEADER_H + rowIdx * ROW_H;
              return (
                <g key={`zebra-${riskId}`}>
                  <rect x={0} y={rowTop} width={TL_END_X} height={ROW_H}
                    fill="var(--color-border)" fillOpacity={0.15} />
                  <rect x={CS_LEFT} y={rowTop} width={CS_COL_W} height={ROW_H}
                    fill="var(--color-border)" fillOpacity={0.15} />
                </g>
              );
            })}

            {/* Selected risk row highlight (CS column) */}
            {selectedRiskId && (() => {
              const rowIdx = RISK_ORDER.indexOf(selectedRiskId);
              if (rowIdx < 0) return null;
              const rowTop = HEADER_H + rowIdx * ROW_H;
              const meta   = RISK_META[selectedRiskId];
              return (
                <rect x={CS_LEFT} y={rowTop} width={CS_COL_W} height={ROW_H}
                  fill={hexToRgba(meta?.fg ?? "#fff", 0.08)}
                  style={{ pointerEvents: "none" }}
                />
              );
            })()}

            {/* CS column hover row highlight */}
            {hoveredCS && !selectedRiskId && (() => {
              const rowIdx = RISK_ORDER.indexOf(hoveredCS.riskId);
              if (rowIdx < 0) return null;
              const rowTop = HEADER_H + rowIdx * ROW_H;
              return (
                <rect x={CS_LEFT} y={rowTop} width={CS_COL_W} height={ROW_H}
                  fill="rgba(255,255,255,0.04)" style={{ pointerEvents: "none" }} />
              );
            })()}

            {/* ── Tick grid ── */}
            <defs>
              <clipPath id="tl-clip">
                <rect x={TL_X} y={0} width={TL_W} height={SVG_H} />
              </clipPath>
            </defs>

            <g clipPath="url(#tl-clip)">
              {TICKS.map((tick, ti) => {
                const tx = dateToX(tick.date);
                return (
                  <g key={ti}>
                    <line x1={tx} y1={HEADER_H - 10} x2={tx} y2={SVG_H - 14}
                      stroke="var(--color-border)" strokeWidth={1} />
                    <text x={tx} y={HEADER_H - 18} textAnchor="middle"
                      style={{ fontSize: "9px", fill: "var(--color-muted-foreground)", fillOpacity: 0.7, fontFamily: "system-ui,sans-serif" }}>
                      {tick.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Scan hover vertical line */}
            {hoveredScan && (
              <line
                x1={SCAN_X[hoveredScan.scan.id]} y1={HEADER_H - 10}
                x2={SCAN_X[hoveredScan.scan.id]} y2={SVG_H - 14}
                stroke="var(--color-foreground)" strokeOpacity={0.6} strokeWidth={1.5}
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* ── Gap separator ── */}
            <line
              x1={TL_END_X} y1={HEADER_H - 8} x2={TL_END_X} y2={SVG_H - 14}
              stroke="var(--color-border)" strokeWidth={1.5}
              strokeDasharray="3 4" strokeOpacity={0.6}
            />

            {/* ── Current state column header ── */}
            <text x={CS_CX} y={HEADER_H - 28} textAnchor="middle"
              style={{ fontSize: "8px", fontWeight: 700, fill: "var(--color-muted-foreground)", fillOpacity: 0.75, fontFamily: "system-ui,sans-serif", letterSpacing: "0.1em" }}>
              CURRENT STATE
            </text>
            <rect x={CS_LEFT} y={HEADER_H - 10} width={CS_COL_W} height={1}
              fill="var(--color-border)" fillOpacity={0.5} />

            {/* ── Per-row content ── */}
            {RISK_ORDER.map((riskId, rowIdx) => {
              const meta     = RISK_META[riskId];
              if (!meta) return null;
              const rowTop   = HEADER_H + rowIdx * ROW_H;
              const baseline = rowTop + ROW_H * 0.50;

              const currentCount = lastScan.currentFindings[riskId] ?? 0;
              const buckets      = computeAgeBuckets(riskId);
              const [b0, b1, b2, b3] = buckets;
              const bucketTotal  = b0 + b1 + b2 + b3;

              const cumulative = [
                bucketTotal,
                b0 + b1 + b2,
                b0 + b1,
                b0,
              ] as const;

              const csAmp = MAX_CS_AMP * (currentCount / MAX_CURRENT);

              const isCSHovered  = hoveredCS?.riskId === riskId;
              const isCSSelected = selectedRiskId === riskId;

              return (
                <g key={riskId}>
                  {/* Row baselines */}
                  <line x1={TL_X} y1={baseline} x2={TL_END_X} y2={baseline}
                    stroke={hexToRgba(meta.fg, 0.12)} strokeWidth={1} />
                  <line x1={CS_LEFT} y1={baseline} x2={CS_RIGHT} y2={baseline}
                    stroke={hexToRgba(meta.fg, 0.12)} strokeWidth={1} />

                  {/* Risk type label */}
                  <circle cx={20} cy={baseline} r={4} fill={meta.fg} />
                  <text x={32} y={baseline - 2} dominantBaseline="middle"
                    style={{ fontSize: "11px", fontWeight: 600, fill: meta.fg, fontFamily: "system-ui,sans-serif" }}>
                    {meta.label}
                  </text>
                  <text x={32} y={baseline + 13} dominantBaseline="middle"
                    style={{ fontSize: "9px", fill: hexToRgba(meta.fg, 0.5), fontFamily: "system-ui,sans-serif" }}>
                    {currentCount} active
                  </text>

                  {/* Scan blips */}
                  {SCAN_HISTORY.map(scan => {
                    const added  = scan.added[riskId] ?? 0;
                    if (added === 0) return null;
                    const cx     = SCAN_X[scan.id];
                    const amp    = MAX_AMP * (added / GLOBAL_MAX_ADDED);
                    const isHov  = hoveredScan?.scan.id === scan.id;
                    const anyHov = hoveredScan !== null;
                    const d      = eqMirroredPath(cx, baseline, amp, 5, 3, 2);
                    return (
                      <g key={scan.id} style={{ pointerEvents: "none" }}>
                        <path d={d} fill={meta.fg}
                          fillOpacity={isHov ? 0.38 : anyHov ? 0.07 : 0.20}
                          style={{ transition: "fill-opacity 0.14s ease" }}
                        />
                        <path d={d} fill="none"
                          stroke={meta.fg}
                          strokeWidth={isHov ? 1.5 : 0.8}
                          strokeOpacity={isHov ? 1 : anyHov ? 0.12 : 0.6}
                          style={{ transition: "all 0.14s ease" }}
                        />
                        {isHov && (
                          <text x={cx} y={baseline - amp - 6} textAnchor="middle"
                            style={{ fontSize: "9px", fontWeight: 700, fill: meta.fg, fontFamily: "system-ui,sans-serif" }}>
                            +{added}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Current state big blip (age-layered) */}
                  {currentCount > 0 && (
                    <g style={{ pointerEvents: "none" }}>
                      {CS_LAYERS.map((layer, li) => {
                        const count    = cumulative[li];
                        if (count === 0) return null;
                        const layerAmp = csAmp * (count / Math.max(1, bucketTotal));
                        const d = eqMirroredPath(CS_CX, baseline, layerAmp, layer.numBars, 4, 2.5);
                        const active = isCSHovered || isCSSelected;
                        return (
                          <path
                            key={li} d={d} fill={meta.fg}
                            fillOpacity={active ? Math.min(1, layer.fillOpacity * 1.5) : layer.fillOpacity}
                            style={{ transition: "fill-opacity 0.15s ease" }}
                          />
                        );
                      })}
                      {/* Outer edge stroke */}
                      <path
                        d={eqMirroredPath(CS_CX, baseline, csAmp, 11, 4, 2.5)}
                        fill="none"
                        stroke={meta.fg}
                        strokeWidth={isCSSelected ? 1.5 : 0.75}
                        strokeOpacity={isCSSelected ? 0.7 : isCSHovered ? 0.5 : 0.2}
                        style={{ transition: "all 0.15s ease" }}
                      />
                      {/* Count label */}
                      <text
                        x={CS_CX} y={baseline - csAmp - 7}
                        textAnchor="middle"
                        style={{
                          fontSize: "11px", fontWeight: 700,
                          fill: meta.fg,
                          fillOpacity: (isCSHovered || isCSSelected) ? 1 : 0.75,
                          fontFamily: "system-ui,sans-serif",
                          transition: "fill-opacity 0.15s ease",
                        }}>
                        {currentCount}
                      </text>
                    </g>
                  )}

                  {/* Row dividers */}
                  <line x1={0} y1={rowTop + ROW_H} x2={TL_END_X} y2={rowTop + ROW_H}
                    stroke="var(--color-border)" strokeWidth={1} />
                  <line x1={CS_LEFT} y1={rowTop + ROW_H} x2={CS_RIGHT} y2={rowTop + ROW_H}
                    stroke="var(--color-border)" strokeWidth={1} />
                </g>
              );
            })}

          </svg>

          {/* Hover popovers */}
          {hoveredScan && (
            <ScanPopover
              scan={hoveredScan.scan}
              clientX={hoveredScan.clientX}
              clientY={hoveredScan.clientY}
            />
          )}
          {hoveredCS && (() => {
            const buckets = computeAgeBuckets(hoveredCS.riskId);
            return (
              <CurrentStatePopover
                riskId={hoveredCS.riskId}
                buckets={buckets}
                clientX={hoveredCS.clientX}
                clientY={hoveredCS.clientY}
              />
            );
          })()}
        </div>

        {/* Side panel */}
        {selectedRiskId && (
          <RiskTypePanel
            riskId={selectedRiskId}
            onClose={() => { setSelectedRiskId(null); setSelectedRule(null); }}
            onSelectRule={rule => { setSelectedRule(rule); }}
          />
        )}
      </div>

      {/* Rule detail overlay */}
      {selectedRule && (
        <PolicyFindingDetailOverlay
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
        />
      )}
    </div>
  );
}