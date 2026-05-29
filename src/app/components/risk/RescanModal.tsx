/**
 * RescanModal.tsx
 *
 * Informational confirmation modal shown when a user manually marks
 * one or more findings for rescan. Explains approximately when each
 * affected finding will be re-evaluated based on its data store tier.
 */

import { X, RefreshCw, Zap, Clock } from "lucide-react";
import type { MockFinding } from "../../shared/risk-findings";
import { getDataStoreTier } from "../../shared/risk-findings";

// ── Tier metadata ─────────────────────────────────────────────────────────────

type Tier = "SaaS" | "IaaS/PaaS" | "On-Prem";

const TIER_INFO: Record<
  Tier,
  { color: string; bg: string; border: string; icon: typeof Zap; timing: string; detail: string }
> = {
  "SaaS": {
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.25)",
    icon: Zap,
    timing: "On-change — typically within minutes",
    detail:
      "SaaS data stores (Google Drive, SharePoint, etc.) are monitored via API events. The affected entities will be re-evaluated the next time a relevant change event is received.",
  },
  "IaaS/PaaS": {
    color: "#818cf8",
    bg: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.25)",
    icon: Clock,
    timing: "Scheduled — typically daily to weekly",
    detail:
      "IaaS/PaaS data stores (AWS S3, Azure Blob, RDS, etc.) are scanned on a periodic schedule. The affected entities will be re-evaluated in the next scheduled scan cycle.",
  },
  "On-Prem": {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    icon: Clock,
    timing: "Scheduled — typically daily to weekly",
    detail:
      "On-premises data stores (PostgreSQL, Oracle, endpoints, etc.) are scanned on a periodic schedule configured per connector. The affected entities will be re-evaluated in the next scheduled scan cycle.",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupFindingsByTier(findings: MockFinding[]): Map<Tier, MockFinding[]> {
  const map = new Map<Tier, MockFinding[]>();
  for (const f of findings) {
    const tier = getDataStoreTier(f);
    const existing = map.get(tier);
    if (existing) existing.push(f);
    else map.set(tier, [f]);
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RescanModalProps {
  findings: MockFinding[];
  onConfirm: () => void;
  onClose: () => void;
}

export function RescanModal({ findings, onConfirm, onClose }: RescanModalProps) {
  const count = findings.length;
  const tierGroups = groupFindingsByTier(findings);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: 520, maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <RefreshCw size={13} style={{ color: "#f59e0b" }} />
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Mark for Rescan</h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Summary line */}
          <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--color-muted-foreground)" }}>
            {count === 1
              ? "This finding will be queued for rescan. The affected entit{y} will be re-evaluated against the rule the next time the data store is scanned."
              : `${count} findings will be queued for rescan. The affected entities will be re-evaluated against the rule the next time each data store is scanned.`}
          </p>

          {/* Per-tier cards */}
          <div className="flex flex-col gap-3">
            {Array.from(tierGroups.entries()).map(([tier, tierFindings]) => {
              const info = TIER_INFO[tier];
              const Icon = info.icon;
              return (
                <div
                  key={tier}
                  className="rounded-lg border px-4 py-3.5 flex flex-col gap-2"
                  style={{ background: info.bg, borderColor: info.border }}
                >
                  {/* Tier header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon size={13} style={{ color: info.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "12px", fontWeight: 600, color: info.color }}>
                        {tier}
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5"
                      style={{ fontSize: "10px", fontWeight: 600, background: info.bg, color: info.color, border: `1px solid ${info.border}` }}
                    >
                      {tierFindings.length} finding{tierFindings.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Timing */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>
                      Scan Frequency:
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600 }}>{info.timing}</span>
                  </div>

                  {/* Detail */}
                  <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.55 }}>
                    {info.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* What happens next */}
          <div
            className="rounded-lg border px-4 py-3 flex flex-col gap-1.5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-muted)" }}
          >
            <p style={{ fontSize: "11px", fontWeight: 600 }}>What happens after rescan?</p>
            <ul className="text-muted-foreground flex flex-col gap-1" style={{ fontSize: "11px", lineHeight: 1.55 }}>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5" style={{ color: "#22c55e" }}>✓</span>
                If the violation is resolved, the finding will be automatically closed.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }}>!</span>
                If the violation persists, the finding will be re-opened as "Open".
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border transition-colors hover:bg-muted"
            style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded transition-colors hover:opacity-90"
            style={{ fontSize: "12px", fontWeight: 600, background: "#f59e0b", color: "white" }}
          >
            <RefreshCw size={12} />
            Confirm Rescan
          </button>
        </div>
      </div>
    </div>
  );
}
