import { ShieldAlert } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
//  RISK LEVELS
//  fillSpan = degrees of the 220° track that are filled
//    Low      ≈ 20 %  →  44 °
//    Medium   ≈ 48 %  → 106 °
//    High     ≈ 73 %  → 160 °
//    Critical ≈ 93 %  → 205 °
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_LEVELS = {
  critical: { word: "Critical", color: "#ef4444", fillSpan: 205 },
  high:     { word: "High",     color: "#fb923c", fillSpan: 160 },
  medium:   { word: "Med",      color: "#fbbf24", fillSpan: 106 },
  low:      { word: "Low",      color: "#4ade80", fillSpan:  44 },
} as const;

export type RiskLevel = keyof typeof RISK_LEVELS;

// ═══════════════════════════════════════════════════════════════════════════════
//  SPEEDOMETER GEOMETRY
//
//  ViewBox: 0 0 120 80
//  Centre:  CX=60, CY=80  — exactly at the viewBox bottom edge.
//
//  The arc endpoints (at 200° and −20°) land at y ≈ 98.5, safely below the
//  viewBox, so the SVG's own clipping creates a clean bottom notch without
//  any overflow tricks on the parent element.
//
//  All other arc points (sides and top) are well inside the viewBox:
//    Top  (90°): y = 80 − 54 = 26         — 26 px inside top edge ✓
//    Left (180°): x = 60 − 54 = 6         — 6 px inside left edge ✓
//    Right (0°):  x = 60 + 54 = 114       — 6 px inside right edge ✓
//
//  Arc direction (IMPORTANT):
//    "Over the top" from 200° to −20° is math-clockwise
//    (angle decreases: 200→90→0→−20).
//    Math-clockwise = SVG counterclockwise = sweep-flag 0.
//
//  Font sizes use plain SVG user-units (e.g. fontSize={14}) so they scale
//  proportionally with the viewBox — CSS px values do NOT scale.
// ═══════════════════════════════════════════════════════════════════════════════

const CX = 60;
const CY = 80;  // at viewBox bottom → endpoints below it → clean notch
const R  = 54;
const SW = 9;

const TRACK_START = 200;
const TRACK_END   = -20;

function pt(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
}

function arc(startDeg: number, endDeg: number): string {
  const s    = pt(startDeg);
  const e    = pt(endDeg);
  const span = startDeg - endDeg; // degrees of math-CW sweep
  const lg   = span > 180 ? 1 : 0;
  // sweep-flag=0 → SVG counterclockwise = math clockwise → arc goes OVER the top
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${lg} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

export function RiskWidget({ level = "high" }: { level?: RiskLevel }) {
  const { word, color, fillSpan } = RISK_LEVELS[level];
  const fillEnd = TRACK_START - fillSpan;

  return (
    <div
      className="border rounded-lg p-4 flex flex-col gap-2"
      style={{
        background: `linear-gradient(145deg, ${color}12 0%, ${color}05 55%, transparent 100%)`,
        borderColor: `${color}35`,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-muted-foreground" style={{ fontSize: "var(--widget-subtitle)" }}>
          Risk
        </span>
        <ShieldAlert size={13} style={{ color, opacity: 0.45 }} />
      </div>

      {/* ── Gauge ──────────────────────────────────────────────────────────── */}
      {/*
        The SVG uses viewBox="0 0 120 80" with width="100%" and no explicit height.
        The browser maintains the 120∶80 aspect ratio automatically — the gauge
        always fits inside the card and scales with it.
      */}
      <div className="flex-1 flex items-center justify-center">
        <svg
          viewBox="0 0 120 80"
          width="100%"
          style={{ display: "block", overflow: "visible" }}
          aria-label={`Risk level: ${word}`}
        >
          {/* Background track — full 220° sweep */}
          <path
            d={arc(TRACK_START, TRACK_END)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={SW}
            strokeLinecap="round"
          />

          {/* Filled arc — encodes the risk level */}
          <path
            d={arc(TRACK_START, fillEnd)}
            fill="none"
            stroke={color}
            strokeWidth={SW}
            strokeLinecap="round"
            opacity={0.92}
            style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
          />

          {/* KPI word — fontSize in SVG user-units so it scales with the gauge */}
          <text
            x={CX}
            y={60}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={700}
            fontFamily="inherit"
            style={{ fill: "var(--text-bright)" }}
          >
            {word}
          </text>

          {/* Subdued "LEVEL" caption */}
          <text
            x={CX}
            y={72}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={5.5}
            fontFamily="inherit"
            letterSpacing="0.09em"
            fill="rgba(255,255,255,0.22)"
          >
            LEVEL
          </text>
        </svg>
      </div>
    </div>
  );
}
