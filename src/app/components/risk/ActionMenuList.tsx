// ── ActionMenuList ────────────────────────────────────────────────────────────
// Reusable action-selection panel used by:
//   • "All Actions" modal (single-finding mode, launched from EvidencePanel)
//   • "Bulk Actions" modal (bulk mode, launched from the rule header)
//   • Future: Finding Details side panel (embed directly without a modal shell)
//
// The component owns its own selectedActions state.  The parent is responsible
// for rendering the matching config panel (right column) and passes
// `activeConfigAction` + `onConfigOpen` to keep the two in sync.

import { useState } from "react";
import { X } from "lucide-react";
import type { MockFinding } from "../../shared/risk-findings";

// ── Action catalogue ──────────────────────────────────────────────────────────

const CORE_REMEDIATION_ACTIONS: Record<
  string,
  Array<{ id: string; label: string; description: string; hasConfig: boolean; isBulkAppropriate: boolean }>
> = {
  "Data Protection": [
    {
      id: "apply-sensitivity-label",
      label: "Apply Sensitivity Label",
      description: "Apply data classification labels for tracking and policy enforcement",
      hasConfig: true,
      isBulkAppropriate: true,
    },
    {
      id: "quarantine",
      label: "Quarantine",
      description: "Isolate data from normal access pending review",
      hasConfig: true,
      isBulkAppropriate: true,
    },
    {
      id: "delete",
      label: "Delete",
      description: "Permanently remove data from the system",
      hasConfig: true,
      isBulkAppropriate: false,
    },
    {
      id: "apply-dlp",
      label: "Apply DLP Policy",
      description: "Apply data loss prevention controls to prevent exfiltration",
      hasConfig: true,
      isBulkAppropriate: true,
    },
  ],
  "Access Control": [
    {
      id: "restrict-access",
      label: "Restrict Access",
      description: "Limit who can access this data to authorized users only",
      hasConfig: true,
      isBulkAppropriate: false,
    },
    {
      id: "revoke-public",
      label: "Revoke Public Sharing",
      description: "Remove public access links and sharing permissions",
      hasConfig: false,
      isBulkAppropriate: true,
    },
    {
      id: "revoke-external",
      label: "Revoke External Sharing",
      description: "Remove sharing permissions for external users",
      hasConfig: false,
      isBulkAppropriate: true,
    },
    {
      id: "revoke-company",
      label: "Revoke Company-wide Sharing",
      description: "Remove broad company-wide access permissions",
      hasConfig: false,
      isBulkAppropriate: true,
    },
    {
      id: "change-ownership",
      label: "Change Ownership",
      description: "Transfer ownership to a different user or team",
      hasConfig: true,
      isBulkAppropriate: false,
    },
  ],
  "Management": [
    {
      id: "notify-owner",
      label: "Notify Owner",
      description: "Send notification to the data owner about the finding",
      hasConfig: true,
      isBulkAppropriate: true,
    },
    {
      id: "request-justification",
      label: "Request Justification",
      description: "Ask the owner to provide business justification",
      hasConfig: true,
      isBulkAppropriate: false,
    },
  ],
  "Compliance": [
    {
      id: "legal-hold",
      label: "Legal Hold",
      description: "Preserve data for legal or compliance purposes",
      hasConfig: true,
      isBulkAppropriate: true,
    },
  ],
};

const PROACTIVE_BULK_ACTIONS = [
  {
    id: "apply-dlp",
    label: "Apply DLP Policy",
    description:
      "Apply data loss prevention controls to prevent future exfiltration and data loss",
    hasConfig: true,
  },
  {
    id: "perform-targeted-scan",
    label: "Perform Targeted Scan",
    description:
      "Run a focused scan to discover additional findings in case of blind spots or environmental changes",
    hasConfig: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface ActionMenuListProps {
  /** 'bulk' shows the proactive actions section at the top; 'single' shows only CORE_REMEDIATION_ACTIONS */
  mode: "bulk" | "single";
  /** The active config action id (managed by the parent so the sibling config panel can render) */
  activeConfigAction: string | null;
  /** Finding used to derive RECOMMENDED badges in single mode */
  selectedFinding?: MockFinding | null;
  /** Called when the user selects or deselects an action (and which config should open) */
  onConfigOpen: (actionId: string | null) => void;
  /** Called when the X or Cancel button is clicked */
  onClose: () => void;
  /** Called with the final selection when the user clicks Execute */
  onExecute: (selectedActions: Set<string>) => void;
}

export function ActionMenuList({
  mode,
  activeConfigAction,
  selectedFinding,
  onConfigOpen,
  onClose,
  onExecute,
}: ActionMenuListProps) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

  const title = mode === "bulk" ? "Bulk Actions" : "All Actions";
  const subtitle =
    mode === "bulk"
      ? "Select one or more remediation actions to apply to all findings:"
      : "Select remediation actions for this finding:";

  const handleToggle = (actionId: string) => {
    const next = new Set(selectedActions);
    if (next.has(actionId)) {
      next.delete(actionId);
      // If we just unchecked the active config, reveal the next one or clear
      if (activeConfigAction === actionId) {
        const remaining = Array.from(next);
        onConfigOpen(remaining.length > 0 ? remaining[0] : null);
      }
    } else {
      next.add(actionId);
      onConfigOpen(actionId);
    }
    setSelectedActions(next);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: "20px 24px 8px 24px" }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{title}</h3>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "var(--color-muted-foreground)",
          lineHeight: 1.6,
          padding: "0 24px 16px",
          flexShrink: 0,
        }}
      >
        {subtitle}
      </p>

      {/* ── Scrollable action list ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0, padding: "0 24px", marginBottom: "16px" }}
      >
        {/* Proactive / preventative actions (bulk mode only) */}
        {mode === "bulk" && (
          <>
            {PROACTIVE_BULK_ACTIONS.map((action) => {
              const isChecked = selectedActions.has(action.id);
              const isActive = activeConfigAction === action.id;
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted mb-4"
                  style={{
                    background: isActive ? "var(--color-muted)" : "transparent",
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                  }}
                  onClick={() => handleToggle(action.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(action.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0 }}
                  />
                  <div className="flex-1">
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: 4 }}>
                      {action.label}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-muted-foreground)",
                        lineHeight: 1.5,
                      }}
                    >
                      {action.description}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "var(--color-border)",
                margin: "4px 0 20px",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "var(--color-background)",
                  padding: "0 12px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: "var(--color-muted-foreground)",
                }}
              >
                Remediation Actions
              </span>
            </div>
          </>
        )}

        {/* Category sections */}
        {Object.entries(CORE_REMEDIATION_ACTIONS).map(([category, actions]) => (
          <div key={category} style={{ marginBottom: 20 }}>
            {/* Category header — flush to the left, clearly a group label */}
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 6 }}
            >
              <div
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: "var(--color-muted-foreground)",
                  opacity: 0.4,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: "var(--color-muted-foreground)",
                }}
              >
                {category}
              </span>
            </div>

            {/* Action rows — indented under the category label */}
            <div style={{ paddingLeft: 11 }}>
              {actions.map((action) => {
                // In bulk mode, apply-dlp lives in the proactive section already
                if (mode === "bulk" && action.id === "apply-dlp") return null;
                // In single mode, skip bulk-only DLP / scan actions
                if (mode === "single" && action.id === "apply-dlp") return null;

                const isChecked = selectedActions.has(action.id);
                const isActive = activeConfigAction === action.id;
                const isRecommended =
                  mode === "single" &&
                  (selectedFinding?.action ?? []).some(
                    (ra) =>
                      typeof ra === "object" && ra.remediationAction === action.id
                  );

                return (
                  <div
                    key={action.id}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                    style={{
                      background: isActive ? "var(--color-muted)" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => handleToggle(action.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(action.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 15,
                        height: 15,
                        cursor: "pointer",
                        marginTop: 3,
                        flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span style={{ fontSize: "12px", fontWeight: 500 }}>
                          {action.label}
                        </span>
                        {isRecommended && (
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5"
                            style={{
                              fontSize: "9px",
                              fontWeight: 600,
                              background: "#10b981",
                              color: "white",
                            }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--color-muted-foreground)",
                          lineHeight: 1.4,
                        }}
                      >
                        {action.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center gap-3 justify-end shrink-0"
        style={{
          padding: "12px 24px",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded border"
          style={{
            fontSize: "12px",
            borderColor: "var(--color-border)",
            color: "var(--color-muted-foreground)",
          }}
        >
          Cancel
        </button>
        {selectedActions.size > 0 && (
          <button
            onClick={() => onExecute(selectedActions)}
            className="px-4 py-2 rounded"
            style={{
              fontSize: "12px",
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground)",
              fontWeight: 500,
            }}
          >
            Execute {selectedActions.size} Action{selectedActions.size !== 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
