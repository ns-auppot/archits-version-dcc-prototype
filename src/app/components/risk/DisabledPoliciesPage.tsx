// ── Disabled Policies Page ──────────────────────────────────────────────────────────
import { useNavigate } from "react-router";
import { ArrowLeft, VolumeX, Volume2, X } from "lucide-react";
import { useDisabledRules } from "../../shared/disabled-rules-store";

// ── Page ──────────────────────────────────────────────────────────────────────

export function DisabledPoliciesPage() {
  const navigate = useNavigate();
  const { disabledRules, enableRule } = useDisabledRules();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Sub-header */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 border-b"
        style={{ height: 44, borderColor: "var(--color-border)", background: "var(--color-card)" }}
      >
        <button
          onClick={() => navigate("/risk")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <ArrowLeft size={13} />
          Back to Risk
        </button>
        <span className="text-border" style={{ fontSize: "16px" }}>|</span>
        <VolumeX size={14} className="text-muted-foreground" />
        <span style={{ fontSize: "13px", fontWeight: 500 }}>Disabled Policies</span>
        <span
          className="rounded-full px-2"
          style={{
            fontSize: "11px",
            background: "var(--color-muted)",
            color: "var(--color-muted-foreground)",
          }}
        >
          {disabledRules.length}
        </span>
        <p className="text-muted-foreground ml-1" style={{ fontSize: "11px" }}>Disabled policies are not run and generate no new findings.</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {disabledRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Volume2 size={40} className="text-muted-foreground opacity-25" />
            <p style={{ fontSize: "14px", fontWeight: 500 }}>No disabled policies</p>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Disable policies from the Risk page to suppress findings here.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            {/* Table header */}
            <div
              className="grid border-b"
              style={{
                gridTemplateColumns: "2fr 1.3fr 1.2fr 1fr 3fr auto",
                borderColor: "var(--color-border)",
                background: "var(--color-muted)",
              }}
            >
              {["Policy Name", "Policy Type", "Last Modified", "By", "Scope", ""].map((h, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5"
                  style={{
                    fontSize: "10px", fontWeight: 600,
                    letterSpacing: "0.07em",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {disabledRules.map((entry, rowIdx) => (
              <div
                key={entry.ruleId}
                className="grid border-b items-start"
                style={{
                  gridTemplateColumns: "2fr 1.3fr 1.2fr 1fr 3fr auto",
                  borderColor: "var(--color-border)",
                  background: rowIdx % 2 === 0 ? "var(--color-card)" : "transparent",
                }}
              >
                {/* Policy Name */}
                <div className="px-4 py-3">
                  <p style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>
                    {entry.ruleName}
                  </p>
                </div>

                {/* Policy Type */}
                <div className="px-4 py-3">
                  <span
                    className="inline-block rounded px-2 py-0.5"
                    style={{
                      fontSize: "10px", fontWeight: 600,
                      color: entry.ruleTypeFg,
                      background: `${entry.ruleTypeFg}22`,
                    }}
                  >
                    {entry.ruleTypeLabel}
                  </span>
                </div>

                {/* Changed date */}
                <div className="px-4 py-3">
                  <p style={{ fontSize: "11px" }}>{entry.disabledAt}</p>
                </div>

                {/* By */}
                <div className="px-4 py-3">
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {entry.disabledBy}
                  </p>
                </div>

                {/* Disable scope */}
                <div className="px-4 py-3">
                  <span
                    className="inline-block rounded px-2 py-0.5"
                    style={{
                      fontSize: "11px", fontWeight: 500,
                      color: "#f97316",
                      background: "rgba(249,115,22,0.1)",
                    }}
                  >
                    Entire policy
                  </span>
                </div>

                {/* Enable action */}
                <div className="px-4 py-3 flex items-start">
                  <button
                    onClick={() => enableRule(entry.ruleId)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border transition-colors text-muted-foreground hover:text-foreground hover:bg-muted whitespace-nowrap"
                    style={{ fontSize: "11px", borderColor: "var(--color-border)" }}
                  >
                    <Volume2 size={11} />
                    Enable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
