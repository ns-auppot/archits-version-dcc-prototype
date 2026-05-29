// ── Enable Policy Modal ─────────────────────────────────────────────────────────
import { X, Volume2 } from "lucide-react";
import type { RiskRule } from "../../shared/risk-rules";
import type { RiskTypeDef } from "../../shared/risk-rules";

interface Props {
  rule: RiskRule;
  riskType?: RiskTypeDef;
  onConfirm: () => void;
  onClose: () => void;
}

export function EnablePolicyModal({ rule, riskType, onConfirm, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg p-6 flex flex-col"
        style={{
          width: 560, maxWidth: "90vw", maxHeight: "80vh",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Close"
        >
          <X size={16} />
        </button>

        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: 16 }}>Enable Policy</h3>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4">
          {riskType && (
            <div>
              <p className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, marginBottom: 4 }}>
                Policy Type
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600 }}>
                {riskType.label}
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, marginBottom: 4 }}>
              Policy Name
            </p>
            <p style={{ fontSize: "13px", fontWeight: 600 }}>
              {rule.name}
            </p>
          </div>

          {/* Info box — teal/green accent */}
          <div
            className="rounded-xl border px-4 py-3"
            style={{
              borderColor: "rgba(20,184,166,0.3)",
              background: "rgba(20,184,166,0.06)",
            }}
          >
            <p style={{ fontSize: "12px", lineHeight: 1.65 }}>
              Enabling this policy will:
            </p>
            <ul style={{ fontSize: "12px", lineHeight: 1.65, marginTop: 8, paddingLeft: 20, listStyleType: "disc" }}>
              <li>Allow the policy to run and generate new findings starting from the <strong>next scheduled scan</strong></li>
              <li>
                <strong>Not</strong> re-open or resurrect findings that were closed when the policy was disabled — their status remains <strong>&ldquo;Closed&rdquo;</strong>
              </li>
              <li>
                <strong>Not</strong> affect any historical data, audit records, or accepted risk decisions
              </li>
            </ul>
            <p style={{ fontSize: "12px", lineHeight: 1.65, marginTop: 8, color: "var(--color-muted-foreground)" }}>
              Only violations detected after the next scan will appear as new open findings.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ fontSize: "12px" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            style={{
              fontSize: "12px", fontWeight: 600,
              background: "rgba(20,184,166,0.15)",
              color: "#14b8a6",
              border: "1px solid rgba(20,184,166,0.35)",
            }}
          >
            <Volume2 size={13} />
            Enable Policy
          </button>
        </div>
      </div>
    </div>
  );
}
