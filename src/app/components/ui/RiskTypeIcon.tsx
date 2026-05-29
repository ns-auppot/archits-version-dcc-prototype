/**
 * RiskTypeIcon
 *
 * Shared icon component for the six risk type categories.
 * Rendered bare (no background circle) in primary blue — same hue as count badges.
 *
 * Sizes:
 *   "sm" — 14 px icon  (inline rule rows / policy cards)
 *   "md" — 18 px icon  (risk-type cards on the Risk Graph)
 *   "lg" — 24 px icon  (rule-page header)
 */

import type { ComponentType } from "react";
import {
  Eye, AlertTriangle, Lock, Clock, UserMinus, ShieldCheck,
} from "lucide-react";

// ── Icon map (source of truth — imported by RiskPage & RulePage) ──

export const RISK_ICON_MAP: Record<
  string,
  ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
> = {
  overexposed:   Eye,
  exfil:         AlertTriangle,
  overprivilege: Lock,
  stale:         Clock,
  former:        UserMinus,
  compliance:    ShieldCheck,
};

// ── Size tokens ───────────────────────────────────────────────────────────────

const SIZE_MAP: Record<"sm" | "md" | "lg", number> = {
  sm: 14,
  md: 20,
  lg: 20,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface RiskTypeIconProps {
  /** The risk type id — one of: overexposed | exfil | overprivilege | stale | former | compliance */
  riskTypeId: string;
  /** Accepted but ignored — colors are reserved for severity, logos, and charts. */
  fg?: string;
  size?: "sm" | "md" | "lg";
}

export function RiskTypeIcon({ riskTypeId, size = "md" }: RiskTypeIconProps) {
  const Icon = RISK_ICON_MAP[riskTypeId] ?? AlertTriangle;
  const iconSize = SIZE_MAP[size];

  return (
    <Icon
      size={iconSize}
      style={{ color: "var(--color-primary)", flexShrink: 0 }}
    />
  );
}
