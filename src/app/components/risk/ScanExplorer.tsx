import { useState, useMemo, useRef, useEffect } from "react";
import { BubbleTimeline2 } from "./BubbleTimeline2";
import {
  X, CheckCircle2, RotateCcw, Info, AlertTriangle,
  ArrowUp, ArrowDown, Minus, Calendar, User, Clock,
  ShieldCheck,
} from "lucide-react";
import { RISK_TYPES } from "../../shared/risk-rules";
import type { RiskTypeDef } from "../../shared/risk-rules";
import { SCAN_HISTORY } from "../../shared/scan-data";
import type { ScanInstance } from "../../shared/scan-data";
import { getFindingsForRule } from "../../shared/risk-findings";
import type { MockFinding } from "../../shared/risk-findings";
import { useDisabledRules } from "../../shared/disabled-rules-store";
import type { AcceptedScanRisk } from "../../shared/disabled-rules-store";

// ── Color helpers ─────────────────────────────────────────────────────────────

const RISK_META = Object.fromEntries(
  RISK_TYPES.map(rt => [rt.id, { label: rt.label, fg: rt.fg, bg: rt.bg }])
);
const RISK_ORDER = RISK_TYPES.map(rt => rt.id);

const SCAN_TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  Discovery: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  Targeted:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  Ongoing:   { color: "#a3e635", bg: "rgba(163,230,53,0.12)" },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Tab types ─────────────────────────────────────────────────────────────────



// ── Severity badge ────────────────────────────────────────────────────────────

const SEV_COLORS: Record<string, { color: string; bg: string }> = {
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  High:     { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  Medium:   { color: "#eab308", bg: "rgba(234,179,8,0.12)" },
};

function SevBadge({ sev }: { sev: string }) {
  const s = SEV_COLORS[sev] ?? SEV_COLORS.Medium;
  return (
    <span className="rounded px-1.5 py-0.5"
      style={{ fontSize: "9px", fontWeight: 700, color: s.color, background: s.bg }}>
      {sev}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept-Risk Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AcceptModalProps {
  scanId: string;
  scanType: string;
  scanDate: string;
  riskTypeId: string;
  riskTypeLabel: string;
  riskTypeFg: string;
  findingCount: number;
  existing?: AcceptedScanRisk;
  onConfirm: (rationale: string, expiresAt?: string) => void;
  onUnaccept: () => void;
  onClose: () => void;
}

function AcceptModal({
  scanType, scanDate, riskTypeLabel, riskTypeFg, findingCount,
  existing, onConfirm, onUnaccept, onClose,
}: AcceptModalProps) {
  const [rationale, setRationale] = useState(existing?.rationale ?? "");
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ?? "");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[70]"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl border flex flex-col gap-0 overflow-hidden shadow-2xl"
        style={{ width: 480, background: "var(--color-card)", borderColor: "var(--color-border)" }}>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} style={{ color: riskTypeFg }} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                {existing ? "Update Risk Acceptance" : "Accept Risk"}
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
              <span style={{ color: riskTypeFg, fontWeight: 600 }}>{riskTypeLabel}</span>
              {" · "}
              <span style={{ color: SCAN_TYPE_STYLES[scanType]?.color }}>{scanType}</span>
              {" scan · "}{scanDate}
              {" · "}{findingCount} active findings
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="rounded-lg px-3 py-2.5 flex items-start gap-2"
            style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <Info size={12} style={{ color: "#eab308", marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
              Accepting risk creates an audited record. This does <strong>not</strong> suppress
              the rule or prevent future scans from detecting recurrences.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "11px", fontWeight: 600 }}>
              Rationale <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              ref={textRef}
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              placeholder="Why is this risk acceptable right now? (e.g., temporary condition, compensating control in place, owner has active remediation ticket...)"
              rows={4}
              className="rounded-lg border px-3 py-2 resize-none outline-none focus:border-primary/50 transition-colors"
              style={{
                fontSize: "12px", background: "var(--color-background)",
                borderColor: "var(--color-border)", lineHeight: 1.6,
                color: "var(--color-foreground)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "11px", fontWeight: 600 }}>
              Review Date <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", fontWeight: 400 }}>(optional — flags for re-review after this date)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="rounded-lg border px-3 py-2 outline-none focus:border-primary/50 transition-colors"
              style={{
                fontSize: "12px", background: "var(--color-background)",
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          {existing && (
            <button
              onClick={onUnaccept}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors"
              style={{ fontSize: "11px", color: "var(--color-muted-foreground)", background: "rgba(163,163,163,0.08)", border: "1px solid rgba(163,163,163,0.15)" }}>
              <RotateCcw size={11} /> Remove Acceptance
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 transition-colors text-muted-foreground hover:text-foreground"
            style={{ fontSize: "12px" }}>
            Cancel
          </button>
          <button
            onClick={() => rationale.trim() && onConfirm(rationale.trim(), expiresAt || undefined)}
            disabled={!rationale.trim()}
            className="rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5"
            style={{
              fontSize: "12px", fontWeight: 600,
              background: rationale.trim() ? "rgba(59,130,246,0.15)" : "rgba(163,163,163,0.08)",
              color: rationale.trim() ? "#60a5fa" : "rgba(163,163,163,0.4)",
              border: `1px solid ${rationale.trim() ? "rgba(59,130,246,0.3)" : "rgba(163,163,163,0.15)"}`,
              cursor: rationale.trim() ? "pointer" : "not-allowed",
            }}>
            <CheckCircle2 size={12} /> {existing ? "Update" : "Accept Risk"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drill-Through Findings Panel
// ─────────────────────────────────────────────────────────────────────────────

interface DrillPanelProps {
  scan: ScanInstance;
  riskType: RiskTypeDef;
  onClose: () => void;
}

function DrillPanel({ scan, riskType, onClose }: DrillPanelProps) {
  const currentCount = scan.currentFindings[riskType.id] ?? 0;
  const added = scan.added[riskType.id] ?? 0;
  const remediated = scan.remediatedSince[riskType.id] ?? 0;
  const scanStyle = SCAN_TYPE_STYLES[scan.type];

  const findings = useMemo(() => {
    const all: MockFinding[] = [];
    for (const rule of riskType.rules) {
      all.push(...getFindingsForRule(rule.id));
    }
    return all;
  }, [riskType]);

  return (
    <div
      className="absolute top-0 right-0 bottom-0 flex flex-col border-l z-20 overflow-hidden"
      style={{ width: 400, background: "var(--color-card)", borderColor: "var(--color-border)" }}>

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b flex flex-col gap-2"
        style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: riskType.fg }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: riskType.fg }}>
              {riskType.label}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded px-2 py-0.5"
            style={{ fontSize: "9px", fontWeight: 700, color: scanStyle.color, background: scanStyle.bg }}>
            {scan.type.toUpperCase()}
          </span>
          <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
            {scan.timestamp.split("  ")[0]}
          </span>
          {scan.scope && (
            <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)", fontStyle: "italic" }}>
              · {scan.scope}
            </span>
          )}
        </div>

        {/* Delta bar */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: "18px", fontWeight: 700, color: riskType.fg }}>{currentCount}</span>
            <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>active</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {added > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5"
                style={{ fontSize: "10px", color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                <ArrowUp size={9} /> {added} new
              </span>
            )}
            {remediated > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5"
                style={{ fontSize: "10px", color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                <ArrowDown size={9} /> {remediated} remediated
              </span>
            )}
            {added === 0 && remediated === 0 && (
              <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5"
                style={{ fontSize: "10px", color: "var(--color-muted-foreground)", background: "rgba(163,163,163,0.08)" }}>
                <Minus size={9} /> no change
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 sticky top-0 flex items-center justify-between"
          style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>
            SAMPLE FINDINGS ({findings.length} of {currentCount} shown)
          </span>
        </div>

        {findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
            <AlertTriangle size={20} className="text-muted-foreground" />
            <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)" }}>
              No detailed findings available for this risk type
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {findings.map(f => {
              const primaryNode = f.topology.nodes.find(
                n => n.type === "store" || n.type === "identity" || n.type === "config"
              );
              const secondaryNode = f.topology.nodes.find(
                n => n.type === "file" || n.type === "activity"
              );
              return (
                <div key={f.id} className="px-4 py-3 flex flex-col gap-1.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--color-muted-foreground)" }}>
                      {f.id}
                    </span>
                    <SevBadge sev={f.severity} />
                  </div>
                  {primaryNode && (
                    <div className="flex flex-col gap-0.5">
                      <span style={{ fontSize: "11px", fontWeight: 600 }}>{primaryNode.label}</span>
                      <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                        {primaryNode.sublabel}
                      </span>
                    </div>
                  )}
                  {secondaryNode && (
                    <div className="flex items-center gap-1.5 rounded px-2 py-1"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                        {secondaryNode.label}
                      </span>
                      {secondaryNode.badge && (
                        <span className="ml-auto rounded px-1 py-0.5"
                          style={{ fontSize: "9px", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                          {secondaryNode.badge}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "9px", color: "var(--color-muted-foreground)" }}>
                      Detected {f.detectedAt}
                    </span>
                    <span className="rounded px-1.5 py-0.5"
                      style={{
                        fontSize: "9px", fontWeight: 600,
                        color: f.status === "Open" ? "#ef4444" : f.status === "Rescan" ? "#f59e0b" : "#6b7280",
                        background: f.status === "Open" ? "rgba(239,68,68,0.08)" : f.status === "Rescan" ? "rgba(245,158,11,0.08)" : "rgba(107,114,128,0.08)",
                      }}>
                      {f.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t flex items-center gap-2"
        style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.02)" }}>
        <Info size={11} className="text-muted-foreground shrink-0" />
        <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", lineHeight: 1.4 }}>
          Showing representative findings. Full scan-indexed finding list requires database integration.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bubble hover popover
// ─────────────────────────────────────────────────────────────────────────────

interface BubbleHoverData {
  anchorRect: DOMRect;
  riskLabel: string;
  riskFg: string;
  scanType: string;
  scanDate: string;
  scanScope?: string;
  count: number;
  added: number;
  carried: number;
  remediated: number;
  scanIdx: number;
  isAccepted: boolean;
  acceptedRationale?: string;
}

function BubblePopover({ data }: { data: BubbleHoverData }) {
  const {
    anchorRect, riskLabel, riskFg, scanType, scanDate, scanScope,
    count, added, carried, remediated, scanIdx, isAccepted, acceptedRationale,
  } = data;

  const WIDTH = 236;
  const GAP = 10;

  const placeAbove = anchorRect.top > 170;
  const top = placeAbove ? anchorRect.top - GAP : anchorRect.bottom + GAP;
  const transformY = placeAbove ? "-100%" : "0%";

  let left = anchorRect.left + anchorRect.width / 2 - WIDTH / 2;
  left = Math.max(GAP, Math.min(left, window.innerWidth - WIDTH - GAP));

  const st = SCAN_TYPE_STYLES[scanType] ?? { color: "#e2e8f0", bg: "rgba(226,232,240,0.1)" };
  const isBaseline = scanIdx === 0;
  const carriedPct = count > 0 ? Math.round((carried / count) * 100) : 0;
  const addedPct   = count > 0 ? Math.round((added   / count) * 100) : 0;

  return (
    <div style={{
      position: "fixed",
      top,
      left,
      width: WIDTH,
      transform: `translateY(${transformY})`,
      zIndex: 9999,
      background: "var(--color-card)",
      border: "1px solid var(--color-border)",
      borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "9px 12px 8px",
        borderBottom: "1px solid var(--color-border)",
        background: hexToRgba(riskFg, 0.07),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: riskFg, flexShrink: 0 }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: riskFg, flex: 1 }}>{riskLabel}</span>
          <span style={{
            fontSize: "8px", fontWeight: 700, padding: "1px 6px", borderRadius: 4,
            color: st.color, background: st.bg, letterSpacing: "0.05em",
          }}>{scanType.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>{scanDate}</span>
          {scanScope && (
            <span style={{ fontSize: "9px", color: "var(--color-muted-foreground)", fontStyle: "italic" }}>
              · {scanScope.length > 22 ? scanScope.slice(0, 22) + "…" : scanScope}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Composition bar — only for non-baseline scans with findings */}
        {!isBaseline && count > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>
              COMPOSITION
            </span>
            {/* Segmented bar */}
            <div style={{
              height: 7, borderRadius: 99, overflow: "hidden",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
            }}>
              {carried > 0 && (
                <div style={{
                  width: `${carriedPct}%`,
                  background: hexToRgba(riskFg, 0.32),
                  borderRadius: added > 0 ? "99px 0 0 99px" : 99,
                }} />
              )}
              {added > 0 && (
                <div style={{
                  width: `${addedPct}%`,
                  background: hexToRgba(riskFg, 0.78),
                  borderRadius: carried > 0 ? "0 99px 99px 0" : 99,
                }} />
              )}
            </div>
            {/* Bar legend */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {carried > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "9px", color: "var(--color-muted-foreground)" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: hexToRgba(riskFg, 0.32) }} />
                  Carried {carriedPct}%
                </span>
              )}
              {added > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "9px", color: "var(--color-muted-foreground)" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: hexToRgba(riskFg, 0.78) }} />
                  New {addedPct}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {isBaseline ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>Baseline findings</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: riskFg }}>{count}</span>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>Total active</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: riskFg }}>{count}</span>
              </div>
              {carried > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                    <Minus size={9} style={{ opacity: 0.5 }} /> Carried from prior
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: hexToRgba(riskFg, 0.75) }}>{carried}</span>
                </div>
              )}
              {added > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "10px", color: "#ef4444" }}>
                    <ArrowUp size={9} /> New detections
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#ef4444" }}>{added}</span>
                </div>
              )}
              {remediated > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "10px", color: "#22c55e" }}>
                    <ArrowDown size={9} /> Remediated
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#22c55e" }}>{remediated}</span>
                </div>
              )}
              {added === 0 && remediated === 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>No change since prior scan</span>
                  <Minus size={10} style={{ color: "var(--color-muted-foreground)" }} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Accepted badge */}
        {isAccepted && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 6,
            padding: "6px 8px", borderRadius: 6,
            background: "rgba(163,163,163,0.07)",
            border: "1px solid rgba(163,163,163,0.15)",
          }}>
            <CheckCircle2 size={10} style={{ color: "rgba(163,163,163,0.6)", marginTop: 1, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "rgba(163,163,163,0.7)", display: "block", marginBottom: 2 }}>
                RISK ACCEPTED
              </span>
              {acceptedRationale && (
                <span style={{ fontSize: "9px", color: "rgba(163,163,163,0.55)", lineHeight: 1.4, display: "block" }}>
                  {acceptedRationale.length > 80 ? acceptedRationale.slice(0, 80) + "…" : acceptedRationale}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "5px 12px 7px",
        borderTop: "1px solid var(--color-border)",
        background: "rgba(255,255,255,0.015)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: "9px", color: "var(--color-muted-foreground)" }}>Left-click to explore</span>
        <span style={{ fontSize: "9px", color: "rgba(163,163,163,0.25)" }}>·</span>
        <span style={{ fontSize: "9px", color: "var(--color-muted-foreground)" }}>Right-click to accept risk</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIZ 1: Bubble Timeline (current-state bubbles)
// ─────────────────────────────────────────────────────────────────────────────

function BubbleTimeline() {
  const { acceptedScanRisks, acceptScanRisk, unacceptScanRisk } = useDisabledRules();

  const [acceptModal, setAcceptModal] = useState<{
    scanId: string; scanType: string; scanDate: string;
    riskTypeId: string; riskTypeLabel: string; riskTypeFg: string;
    findingCount: number;
  } | null>(null);

  const [drillThrough, setDrillThrough] = useState<{
    scan: ScanInstance; riskType: RiskTypeDef;
  } | null>(null);

  const [hoveredBubble, setHoveredBubble] = useState<BubbleHoverData | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Max current count across all cells for bubble radius scaling
  const maxCount = useMemo(() => {
    let m = 1;
    SCAN_HISTORY.forEach(s =>
      RISK_ORDER.forEach(rid => { if ((s.currentFindings[rid] ?? 0) > m) m = s.currentFindings[rid]; })
    );
    return m;
  }, []);

  const radius = (count: number) =>
    count === 0 ? 0 : Math.max(9, 28 * Math.sqrt(count / maxCount));

  const ROW_H = 80;
  const COL_W = 140;
  const LABEL_W = 176;

  function showPopover(e: React.MouseEvent, data: Omit<BubbleHoverData, "anchorRect">) {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setHoveredBubble({ ...data, anchorRect: e.currentTarget.getBoundingClientRect() });
  }

  function hidePopover() {
    hideTimerRef.current = setTimeout(() => setHoveredBubble(null), 80);
  }

  return (
    <div className="flex flex-col gap-3 flex-1 overflow-hidden relative">
      <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
        Each bubble shows <strong>active findings</strong> at scan time — the current posture, not
        just net-new. Bubbles shrink when owners remediate and grow when drift is detected. Click
        a bubble to drill into findings or accept the risk.
      </p>

      {/* Legend row */}
      <div className="flex items-center gap-5 flex-wrap shrink-0">
        <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
          <ArrowUp size={10} style={{ color: "#ef4444" }} /> <span style={{ color: "#ef4444" }}>Red delta</span> = new findings since last scan
        </span>
        <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
          <ArrowDown size={10} style={{ color: "#22c55e" }} /> <span style={{ color: "#22c55e" }}>Green delta</span> = remediated since last scan
        </span>
        <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
          <CheckCircle2 size={10} style={{ color: "rgba(163,163,163,0.6)" }} /> Grayed = risk accepted
        </span>
        <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ fontSize: "10px", background: "rgba(255,255,255,0.05)", color: "var(--color-muted-foreground)" }}>
          <Info size={10} /> Bubble area ∝ active count
        </span>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto rounded-xl border relative" style={{ borderColor: "var(--color-border)" }}>

        {/* Header row */}
        <div className="flex sticky top-0 z-10"
          style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "10px 16px", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>
              RISK TYPE
            </span>
          </div>
          {SCAN_HISTORY.map(scan => {
            const st = SCAN_TYPE_STYLES[scan.type];
            return (
              <div key={scan.id} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, padding: "10px 0", textAlign: "center" }}>
                <div className="flex flex-col items-center gap-1">
                  <span className="rounded px-2 py-0.5"
                    style={{ fontSize: "9px", fontWeight: 700, color: st.color, background: st.bg }}>
                    {scan.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                    {scan.timestamp.split("  ")[0]}
                  </span>
                  {scan.scope && (
                    <span title={scan.scope}
                      style={{ fontSize: "9px", color: "var(--color-muted-foreground)", maxWidth: COL_W - 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", padding: "0 4px" }}>
                      {scan.scope.length > 20 ? scan.scope.slice(0, 20) + "…" : scan.scope}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Risk type rows */}
        {RISK_ORDER.map((riskId, riskIdx) => {
          const meta = RISK_META[riskId];
          const riskTypeDef = RISK_TYPES.find(rt => rt.id === riskId);
          if (!meta || !riskTypeDef) return null;

          return (
            <div key={riskId} className="flex items-center"
              style={{
                background: riskIdx % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                borderBottom: "1px solid var(--color-border)", minHeight: ROW_H,
              }}>

              {/* Label */}
              <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "8px 16px", flexShrink: 0 }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.fg }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, color: meta.fg, lineHeight: 1.3 }}>
                    {meta.label}
                  </span>
                </div>
              </div>

              {/* Scan columns */}
              {SCAN_HISTORY.map((scan, scanIdx) => {
                const count = scan.currentFindings[riskId] ?? 0;
                const added = scan.added[riskId] ?? 0;
                const remediated = scan.remediatedSince[riskId] ?? 0;
                const carried = scanIdx > 0 ? Math.max(0, count - added) : 0;
                const carriedR = carried > 0 ? radius(carried) : 0;
                const acceptKey = `${scan.id}:${riskId}`;
                const isAccepted = acceptedScanRisks.some(r => r.id === acceptKey);
                const acceptedEntry = acceptedScanRisks.find(r => r.id === acceptKey);
                const r = radius(count);
                const isDrill = drillThrough?.scan.id === scan.id && drillThrough?.riskType.id === riskId;

                return (
                  <div key={scan.id} style={{ width: COL_W, minWidth: COL_W, flexShrink: 0, height: ROW_H, position: "relative" }}>
                    {/* Vertical scan line */}
                    <div style={{
                      position: "absolute", left: "50%", top: 0, bottom: 0,
                      width: 1, background: isDrill ? meta.fg : "var(--color-border)",
                      transform: "translateX(-50%)", opacity: isDrill ? 0.5 : 1,
                      transition: "all 0.15s",
                    }} />

                    {/* Carryover band — spans from previous column center to this column center */}
                    {scanIdx > 0 && carried > 0 && count > 0 && (
                      <div style={{
                        position: "absolute",
                        left: -COL_W / 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: COL_W,
                        height: Math.max(4, carriedR * 2),
                        background: hexToRgba(meta.fg, isAccepted ? 0.04 : 0.09),
                        borderRadius: carriedR,
                        zIndex: 1,
                        pointerEvents: "none",
                        transition: "all 0.18s ease",
                      }} />
                    )}

                    {count > 0 ? (
                      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 2 }}>
                        {/* Delta indicators above bubble */}
                        <div className="flex items-center justify-center gap-1"
                          style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", marginBottom: 3 }}>
                          {added > 0 && (
                            <span className="flex items-center gap-0.5"
                              style={{ fontSize: "9px", fontWeight: 700, color: "#ef4444" }}>
                              <ArrowUp size={8} />{added}
                            </span>
                          )}
                          {remediated > 0 && (
                            <span className="flex items-center gap-0.5"
                              style={{ fontSize: "9px", fontWeight: 700, color: "#22c55e" }}>
                              <ArrowDown size={8} />{remediated}
                            </span>
                          )}
                        </div>

                        {/* Bubble */}
                        <button
                          onMouseEnter={e => showPopover(e, {
                            riskLabel: meta.label,
                            riskFg: meta.fg,
                            scanType: scan.type,
                            scanDate: scan.timestamp.split("  ")[0],
                            scanScope: scan.scope,
                            count, added, carried, remediated,
                            scanIdx,
                            isAccepted,
                            acceptedRationale: acceptedEntry?.rationale,
                          })}
                          onMouseLeave={hidePopover}
                          onClick={() => {
                            setHoveredBubble(null);
                            if (isDrill) { setDrillThrough(null); return; }
                            setDrillThrough({ scan, riskType: riskTypeDef });
                          }}
                          onContextMenu={e => {
                            e.preventDefault();
                            setHoveredBubble(null);
                            setAcceptModal({
                              scanId: scan.id, scanType: scan.type,
                              scanDate: scan.timestamp.split("  ")[0],
                              riskTypeId: riskId, riskTypeLabel: meta.label,
                              riskTypeFg: meta.fg, findingCount: count,
                            });
                          }}
                          style={{
                            width: r * 2, height: r * 2,
                            borderRadius: "50%",
                            border: `1px solid ${isAccepted ? "rgba(163,163,163,0.25)" : isDrill ? meta.fg : meta.fg + "88"}`,
                            background: isAccepted
                              ? "rgba(163,163,163,0.06)"
                              : isDrill
                                ? hexToRgba(meta.fg, 0.22)
                                : hexToRgba(meta.fg, 0.10),
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.18s ease",
                            boxShadow: isDrill ? `0 0 0 2px ${hexToRgba(meta.fg, 0.18)}` : "none",
                          }}
                        >
                          {/* Inner dashed circle — shows the carried-over portion */}
                          {scanIdx > 0 && carried > 0 && carried < count && (
                            <div style={{
                              position: "absolute",
                              top: "50%", left: "50%",
                              transform: "translate(-50%, -50%)",
                              width: Math.max(6, carriedR * 2),
                              height: Math.max(6, carriedR * 2),
                              borderRadius: "50%",
                              background: hexToRgba(meta.fg, 0.08),
                              border: `1px dashed ${hexToRgba(meta.fg, 0.45)}`,
                              pointerEvents: "none",
                            }} />
                          )}
                          {/* Entirely carried — dashed inset ring */}
                          {scanIdx > 0 && carried === count && added === 0 && count > 0 && (
                            <div style={{
                              position: "absolute", inset: 2,
                              borderRadius: "50%",
                              border: `1px dashed ${hexToRgba(meta.fg, 0.5)}`,
                              pointerEvents: "none",
                            }} />
                          )}
                          <span style={{
                            fontSize: "10px", fontWeight: 600,
                            color: isAccepted ? "rgba(163,163,163,0.45)" : meta.fg,
                            lineHeight: 1,
                            position: "relative", zIndex: 1,
                          }}>
                            {count}
                          </span>
                          {isAccepted && (
                            <CheckCircle2 size={9} style={{ color: "rgba(163,163,163,0.5)", marginTop: 1, position: "relative", zIndex: 1 }} />
                          )}
                        </button>

                        {/* Accept chip below bubble */}
                        {isAccepted && (
                          <button
                            onMouseEnter={hidePopover}
                            onClick={e => {
                              e.stopPropagation();
                              setAcceptModal({ scanId: scan.id, scanType: scan.type, scanDate: scan.timestamp.split("  ")[0], riskTypeId: riskId, riskTypeLabel: meta.label, riskTypeFg: meta.fg, findingCount: count });
                            }}
                            className="flex items-center gap-0.5 absolute"
                            style={{
                              top: "100%", left: "50%", transform: "translateX(-50%)",
                              marginTop: 3,
                              fontSize: "8px", fontWeight: 600,
                              color: "rgba(163,163,163,0.6)",
                              background: "rgba(163,163,163,0.08)",
                              border: "1px solid rgba(163,163,163,0.15)",
                              borderRadius: 4, padding: "1px 5px",
                              whiteSpace: "nowrap",
                            }}>
                            <CheckCircle2 size={7} /> accepted
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        position: "absolute", left: "50%", top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 5, height: 5, borderRadius: "50%",
                        background: "var(--color-border)", zIndex: 1,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Drill-through panel overlaying right side */}
        {drillThrough && (
          <DrillPanel
            scan={drillThrough.scan}
            riskType={drillThrough.riskType}
            onClose={() => setDrillThrough(null)}
          />
        )}
      </div>

      {/* Usage hint */}
      <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", textAlign: "center" }}>
        Left-click a bubble to explore findings · Right-click to accept / update risk acceptance
      </p>

      {/* Hover popover — rendered outside overflow container so it's never clipped */}
      {hoveredBubble && <BubblePopover data={hoveredBubble} />}

      {/* Accept modal */}
      {acceptModal && (() => {
        const existingAccept = acceptedScanRisks.find(r => r.id === `${acceptModal.scanId}:${acceptModal.riskTypeId}`);
        return (
          <AcceptModal
            {...acceptModal}
            existing={existingAccept}
            onConfirm={(rationale, expiresAt) => {
              acceptScanRisk({
                scanId: acceptModal.scanId,
                scanType: acceptModal.scanType,
                scanDate: acceptModal.scanDate,
                riskTypeId: acceptModal.riskTypeId,
                riskTypeLabel: acceptModal.riskTypeLabel,
                riskTypeFg: acceptModal.riskTypeFg,
                findingCount: acceptModal.findingCount,
                rationale,
                expiresAt,
              });
              setAcceptModal(null);
            }}
            onUnaccept={() => {
              unacceptScanRisk(`${acceptModal.scanId}:${acceptModal.riskTypeId}`);
              setAcceptModal(null);
            }}
            onClose={() => setAcceptModal(null)}
          />
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIZ 2: Posture Trend (Active findings over time)
// ─────────────────────────────────────────────────────────────────────────────

function PostureTrend() {
  const data = useMemo(() => computeRunningTotals(SCAN_HISTORY, RISK_ORDER), []);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: { name: string; value: number; stroke: string }[]; label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
    return (
      <div className="rounded-xl border p-3 flex flex-col gap-1.5 shadow-xl"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)", minWidth: 200 }}>
        <p style={{ fontSize: "11px", fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>Total active: {total}</p>
        <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
          {[...payload].reverse().map(p => (
            <div key={p.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: p.stroke }} />
                <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                  {RISK_META[p.name]?.label ?? p.name}
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 600 }}>{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
        Active finding count per risk type at each scan. Unlike cumulative charts, this shows true
        posture — a declining line means owners are successfully remediating.
      </p>
      <div className="flex-1 min-h-0" style={{ minHeight: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="shortLabel" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
            <RechartTooltip content={<CustomTooltip />} />
            {RISK_ORDER.map(id => (
              <Area key={`area-${id}`} type="monotone" dataKey={id}
                stroke={RISK_META[id]?.fg} strokeWidth={1.5}
                fill={RISK_META[id]?.fg} fillOpacity={0.12}
                isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {RISK_ORDER.map(id => (
          <div key={id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: RISK_META[id]?.fg }} />
            <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
              {RISK_META[id]?.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg px-4 py-3 border"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--color-border)" }}>
        <Info size={12} className="text-muted-foreground shrink-0" />
        <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
          <strong>Over-Privilege</strong> (yellow) and <strong>Compliance</strong> (teal) are rising across
          every scan — neither owners nor the current rule calibration is containing drift.
          <strong> Stale</strong> is the only category showing consistent decline — retention policies are working.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIZ 3: Scan Heat Map
// ─────────────────────────────────────────────────────────────────────────────

function ScanHeatMap() {
  const { acceptedScanRisks, acceptScanRisk, unacceptScanRisk } = useDisabledRules();
  const [acceptModal, setAcceptModal] = useState<{
    scanId: string; scanType: string; scanDate: string;
    riskTypeId: string; riskTypeLabel: string; riskTypeFg: string;
    findingCount: number;
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    let m = 1;
    SCAN_HISTORY.forEach(s =>
      RISK_ORDER.forEach(rid => { if ((s.currentFindings[rid] ?? 0) > m) m = s.currentFindings[rid]; })
    );
    return m;
  }, []);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
      <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
        Cell color intensity shows active finding count — darker means more active findings at that scan.
        Click any cell to accept / update risk for that batch.
      </p>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
        {/* Header */}
        <div className="flex" style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: 180, minWidth: 180, padding: "12px 16px", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>RISK TYPE</span>
          </div>
          {SCAN_HISTORY.map(scan => {
            const st = SCAN_TYPE_STYLES[scan.type];
            return (
              <div key={scan.id} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1"
                style={{ minWidth: 110, textAlign: "center", borderLeft: "1px solid var(--color-border)" }}>
                <span className="rounded px-2 py-0.5"
                  style={{ fontSize: "9px", fontWeight: 700, color: st.color, background: st.bg }}>
                  {scan.type.toUpperCase()}
                </span>
                <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
                  {scan.timestamp.split("  ")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {RISK_ORDER.map((riskId, rowIdx) => {
          const meta = RISK_META[riskId];
          if (!meta) return null;
          return (
            <div key={riskId} className="flex"
              style={{ borderBottom: rowIdx < RISK_ORDER.length - 1 ? "1px solid var(--color-border)" : "none" }}>
              <div style={{ width: 180, minWidth: 180, padding: "14px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.fg }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: meta.fg }}>{meta.label}</span>
              </div>
              {SCAN_HISTORY.map(scan => {
                const count = scan.currentFindings[riskId] ?? 0;
                const key = `${scan.id}:${riskId}`;
                const isAccepted = acceptedScanRisks.some(r => r.id === key);
                const isHovered = hoveredCell === key;
                const intensity = count / maxCount;
                const cellBg = count === 0 ? "transparent"
                  : isAccepted ? `rgba(163,163,163,${0.05 + intensity * 0.1})`
                  : hexToRgba(meta.fg, 0.06 + intensity * 0.32);

                return (
                  <div key={scan.id} className="flex-1 relative"
                    style={{ minWidth: 110, borderLeft: "1px solid var(--color-border)" }}>
                    <button
                      onMouseEnter={() => setHoveredCell(key)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        if (count === 0) return;
                        setAcceptModal({
                          scanId: scan.id, scanType: scan.type,
                          scanDate: scan.timestamp.split("  ")[0],
                          riskTypeId: riskId, riskTypeLabel: meta.label,
                          riskTypeFg: meta.fg, findingCount: count,
                        });
                      }}
                      style={{
                        width: "100%", minHeight: 64,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 3, padding: "8px 4px",
                        background: isHovered && count > 0 ? hexToRgba(meta.fg, 0.06 + intensity * 0.42) : cellBg,
                        cursor: count > 0 ? "pointer" : "default",
                        transition: "background 0.15s ease",
                      }}
                      title={count > 0 ? `${count} active findings — click to manage risk acceptance` : "No findings"}
                    >
                      {count > 0 ? (
                        <>
                          <span style={{ fontSize: "18px", fontWeight: 700, color: isAccepted ? "rgba(163,163,163,0.5)" : meta.fg }}>{count}</span>
                          {isAccepted && (
                            <span className="flex items-center gap-0.5" style={{ fontSize: "9px", color: "rgba(163,163,163,0.6)" }}>
                              <CheckCircle2 size={9} /> accepted
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--color-border)" }}>—</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Column totals */}
        <div className="flex" style={{ background: "var(--color-card)", borderTop: "1px solid var(--color-border)" }}>
          <div style={{ width: 180, minWidth: 180, padding: "10px 16px", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>TOTAL ACTIVE</span>
          </div>
          {SCAN_HISTORY.map(scan => (
            <div key={scan.id} className="flex-1 flex items-center justify-center py-3"
              style={{ minWidth: 110, borderLeft: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>
                {RISK_ORDER.reduce((s, rid) => s + (scan.currentFindings[rid] ?? 0), 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern callouts */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: "rgba(234,179,8,0.25)", background: "rgba(234,179,8,0.04)" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, marginBottom: 4, color: "#eab308" }}>
            ⚠ Over-Privilege compounding (9 → 21)
          </p>
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
            Rising across every scan. Either owners aren't acting on remediation assignments or the rule is catching legitimate configurations. Investigate rule calibration.
          </p>
        </div>
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.04)" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, marginBottom: 4, color: "#a855f7" }}>
            ✓ Stale improving (14 → 13)
          </p>
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
            Steady decline after the Targeted scan triggered owner action. Data retention policies appear to be working. Continue to monitor.
          </p>
        </div>
      </div>

      {/* Accept modal */}
      {acceptModal && (() => {
        const existing = acceptedScanRisks.find(r => r.id === `${acceptModal.scanId}:${acceptModal.riskTypeId}`);
        return (
          <AcceptModal
            {...acceptModal}
            existing={existing}
            onConfirm={(rationale, expiresAt) => {
              acceptScanRisk({ ...acceptModal, rationale, expiresAt });
              setAcceptModal(null);
            }}
            onUnaccept={() => {
              unacceptScanRisk(`${acceptModal.scanId}:${acceptModal.riskTypeId}`);
              setAcceptModal(null);
            }}
            onClose={() => setAcceptModal(null)}
          />
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accepted Risk Audit Log
// ─────────────────────────────────────────────────────────────────────────────

function AcceptedRiskLog() {
  const { acceptedScanRisks, unacceptScanRisk } = useDisabledRules();
  if (acceptedScanRisks.length === 0) return null;

  return (
    <div className="shrink-0 border-t flex flex-col gap-0" style={{ borderColor: "var(--color-border)" }}>
      <div className="px-6 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <ShieldCheck size={12} style={{ color: "rgba(163,163,163,0.7)" }} />
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted-foreground)", letterSpacing: "0.07em" }}>
          ACCEPTED RISK AUDIT LOG — {acceptedScanRisks.length} entr{acceptedScanRisks.length !== 1 ? "ies" : "y"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-3 px-6 py-3" style={{ minWidth: "max-content" }}>
          {acceptedScanRisks.map(entry => {
            const isExpired = entry.expiresAt
              ? new Date(entry.expiresAt) < new Date()
              : false;
            return (
              <div key={entry.id}
                className="rounded-xl border flex flex-col gap-2 p-3 shrink-0"
                style={{ width: 280, borderColor: isExpired ? "rgba(239,68,68,0.3)" : "var(--color-border)", background: isExpired ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.riskTypeFg }} />
                      <span style={{ fontSize: "11px", fontWeight: 600, color: entry.riskTypeFg }}>{entry.riskTypeLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded px-1.5 py-0.5"
                        style={{ fontSize: "8px", fontWeight: 700, color: SCAN_TYPE_STYLES[entry.scanType]?.color ?? "#e2e8f0", background: SCAN_TYPE_STYLES[entry.scanType]?.bg ?? "rgba(226,232,240,0.1)" }}>
                        {entry.scanType.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>{entry.scanDate}</span>
                      <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>· {entry.findingCount} findings</span>
                    </div>
                  </div>
                  <button onClick={() => unacceptScanRisk(entry.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0">
                    <X size={11} />
                  </button>
                </div>

                <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{entry.rationale.length > 100 ? entry.rationale.slice(0, 100) + "…" : entry.rationale}"
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1" style={{ fontSize: "9px", color: "var(--color-muted-foreground)" }}>
                    <User size={9} /> {entry.acceptedBy}
                  </span>
                  <span className="flex items-center gap-1" style={{ fontSize: "9px", color: "var(--color-muted-foreground)" }}>
                    <Calendar size={9} /> {entry.acceptedAt}
                  </span>
                  {entry.expiresAt && (
                    <span className="flex items-center gap-1"
                      style={{ fontSize: "9px", color: isExpired ? "#ef4444" : "var(--color-muted-foreground)", fontWeight: isExpired ? 700 : 400 }}>
                      <Clock size={9} /> {isExpired ? "⚠ Expired" : "Review"} {entry.expiresAt}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScanExplorer modal shell
// ─────────────────────────────────────────────────────────────────────────────

export function ScanExplorer({ onClose }: { onClose: () => void }) {
  const { acceptedScanRisks } = useDisabledRules();

  const totalActive = SCAN_HISTORY[SCAN_HISTORY.length - 1]
    ? RISK_ORDER.reduce((s, id) => s + (SCAN_HISTORY[SCAN_HISTORY.length - 1].currentFindings[id] ?? 0), 0)
    : 0;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 60, background: "var(--background)" }}>

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-4 px-6 border-b"
        style={{ height: 52, borderColor: "var(--color-border)", background: "var(--color-card)" }}>
        <span className="rounded px-2 py-0.5 shrink-0"
          style={{ fontSize: "9px", fontWeight: 700, background: "rgba(236,72,153,0.18)", color: "#f472b6", letterSpacing: "0.08em" }}>
          DEMO
        </span>
        <div className="flex flex-col">
          <span style={{ fontSize: "13px", fontWeight: 600 }}>Scan Intelligence</span>
          <span style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
            {SCAN_HISTORY.length} scans · {totalActive} active findings today
            {acceptedScanRisks.length > 0 && ` · ${acceptedScanRisks.length} risk acceptance${acceptedScanRisks.length !== 1 ? "s" : ""} on record`}
          </span>
        </div>

        <button onClick={onClose}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 border transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          style={{ fontSize: "12px", borderColor: "var(--color-border)" }}>
          <X size={13} /> Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col">
          <BubbleTimeline2 />
        </div>
      </div>
    </div>
  );
}
