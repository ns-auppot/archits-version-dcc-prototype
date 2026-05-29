// ── Disable Policy Modal ───────────────────────────────────────────────────────────
import { X, VolumeX, ExternalLink } from "lucide-react";
import type { RiskRule } from "../../shared/risk-rules";
import type { RiskTypeDef } from "../../shared/risk-rules";

interface Props {
  mode: "full";
  rule: RiskRule;
  riskType?: RiskTypeDef;
  onConfirm: () => void;
  onClose: () => void;
  /** Optional: show link to disabled policies page */
  showDisabledRulesLink?: boolean;
  /** Optional: callback when user clicks the disabled policies link */
  onNavigateToDisabledRules?: () => void;
}

export function DisablePolicyModal({ rule, riskType, onConfirm, onClose, showDisabledRulesLink, onNavigateToDisabledRules }: Props) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleNavigateToDisabledPolicies = () => {
    if (onNavigateToDisabledRules) {
      onNavigateToDisabledRules();
    }
  };

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
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: 16 }}>Disable Policy</h3>

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
          <div
            className="rounded-xl border px-4 py-3"
            style={{
              borderColor: "rgba(249,115,22,0.3)",
              background: "rgba(249,115,22,0.06)",
            }}
          >
            <p style={{ fontSize: "12px", lineHeight: 1.65 }}>
              Disabling this policy will:
            </p>
            <ul style={{ fontSize: "12px", lineHeight: 1.65, marginTop: 8, paddingLeft: 20, listStyleType: "disc" }}>
              <li>Prevent the policy from generating any new findings</li>
              <li>Mark all existing findings for this policy as <strong>&ldquo;Closed&rdquo;</strong></li>
              <li>Add the policy to the <strong>Disabled Policies</strong> table</li>
            </ul>
            <p style={{ fontSize: "12px", lineHeight: 1.65, marginTop: 8 }}>
              You can re-enable the policy at any time from the Disabled Policies page.
            </p>
          </div>

          {showDisabledRulesLink && (
            <button
              onClick={handleNavigateToDisabledPolicies}
              className="flex items-center gap-1.5 text-left rounded-lg px-3 py-2 border transition-colors hover:bg-muted/40"
              style={{ fontSize: "11px", borderColor: "var(--color-border)" }}
            >
              <VolumeX size={12} className="shrink-0 text-muted-foreground" />
              <span className="flex-1">View all disabled policies</span>
              <ExternalLink size={10} className="shrink-0 text-muted-foreground" />
            </button>
          )}
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
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              fontSize: "12px", fontWeight: 600,
              background: "rgba(249,115,22,0.15)",
              color: "#f97316",
              border: "1px solid rgba(249,115,22,0.35)",
            }}
          >
            Disable Policy
          </button>
        </div>
      </div>
    </div>
  );
}
