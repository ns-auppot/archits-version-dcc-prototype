import { X, ExternalLink } from "lucide-react";
import type { RiskRule } from "../../shared/risk-rules";

interface RecommendationModalProps {
  rule: RiskRule;
  onClose: () => void;
}

export function RecommendationModal({ rule, onClose }: RecommendationModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 300, background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl flex flex-col relative overflow-hidden"
        style={{
          width: 520,
          maxWidth: "96vw",
          maxHeight: "88vh",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          style={{ zIndex: 1 }}
        >
          <X size={15} />
        </button>

        {/* Header — matches PoliciesAndMoreModal style */}
        <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p style={{
            fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.07em", color: "var(--color-muted-foreground)", marginBottom: 2,
          }}>
            Recommendation
          </p>
          <h3 style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.3 }}>
            {rule.name}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--color-foreground)" }}>
            <span style={{ fontWeight: 700 }}>Recommendation:</span> {rule.recommendedIaaSPolicy}
          </p>
          <div className="flex justify-end mt-5">
            <button
              onClick={() => window.open("dspm/policy/management/active", "_blank", "noopener,noreferrer")}
              className="flex items-center gap-2 transition-opacity hover:opacity-85"
              style={{
                fontSize: "13px", fontWeight: 600,
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
                borderRadius: 10,
                padding: "10px 20px",
              }}
            >
              <ExternalLink size={13} />
              Go to DSPM Policy Page
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-end px-6 py-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 border transition-colors hover:bg-muted"
            style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
