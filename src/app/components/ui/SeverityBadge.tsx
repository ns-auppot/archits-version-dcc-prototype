import { SEVERITY_META } from "../../shared/risk-rules";
import type { Severity } from "../../shared/risk-rules";

interface SeverityBadgeProps {
  severity: Severity;
  /** Defaults to "pill" (rounded-full). Use "tag" for square-ish corners. */
  variant?: "pill" | "tag";
}

export function SeverityBadge({ severity, variant = "pill" }: SeverityBadgeProps) {
  const sm = SEVERITY_META[severity];
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: variant === "pill" ? 99 : 4,
        color: sm.color,
        background: sm.bg,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {severity}
    </span>
  );
}
