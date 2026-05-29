import { useState } from "react";
import { X, ChevronRight } from "lucide-react";
import {
  ApplySensitivityLabelConfig,
  QuarantineConfig,
  RestrictAccessConfig,
  ChangeOwnershipConfig,
  NotifyOwnerConfig,
  LegalHoldConfig,
  DeleteConfig,
  ApplyDLPConfig,
  RequestJustificationConfig,
  PerformTargetedScanConfig,
} from "./config-panels";

import type { MockFinding } from "../../shared/risk-findings";

interface BulkActionsModalProps {
  findingsCount: number;
  selectedFindings?: MockFinding[];
  onClose: () => void;
}

// Proactive/Preventative Actions - shown at top
const PROACTIVE_BULK_ACTIONS = [
  {
    id: 'apply-dlp',
    label: 'Apply DLP Policy',
    description: 'Apply data loss prevention controls to prevent future exfiltration and data loss',
    hasConfig: true,
  },
  {
    id: 'perform-targeted-scan',
    label: 'Perform Targeted Scan',
    description: 'Run a focused scan to discover additional findings in case of blind spots or environmental changes',
    hasConfig: true,
  },
];

// ALL remediation actions (bulk + finding-level)
const ALL_REMEDIATION_ACTIONS = {
  'INVESTIGATIVE': [
    {
      id: 'perform-targeted-scan',
      label: 'Perform Targeted Scan',
      description: 'Run a focused scan across all implicated data stores to surface new or changed exposures',
      hasConfig: true,
      isBulkAppropriate: true,
    },
  ],
  'ACCESS CONTROL': [
    {
      id: 'revoke-public',
      label: 'Revoke Public Sharing',
      description: 'Remove public access links and sharing permissions from all findings',
      isBulkAppropriate: true,
    },
    {
      id: 'revoke-external',
      label: 'Revoke External Sharing',
      description: 'Remove sharing permissions for external users from all findings',
      isBulkAppropriate: true,
    },
    {
      id: 'revoke-company',
      label: 'Revoke Company-wide Sharing',
      description: 'Remove broad company-wide access permissions from all findings',
      isBulkAppropriate: true,
    },
    {
      id: 'restrict-access',
      label: 'Restrict Access',
      description: 'Limit who can access this data to authorized users only',
      isBulkAppropriate: false,
    },
    {
      id: 'change-ownership',
      label: 'Change Ownership',
      description: 'Transfer ownership to a different user or team',
      isBulkAppropriate: false,
    },
  ],
  'DATA PROTECTION': [
    {
      id: 'apply-sensitivity-label',
      label: 'Apply Sensitivity Label',
      description: 'Apply data classification labels to all files in findings',
      hasConfig: true,
      isBulkAppropriate: true,
    },
    {
      id: 'quarantine',
      label: 'Quarantine All',
      description: 'Isolate all data from findings pending review',
      hasConfig: true,
      isBulkAppropriate: true,
    },
    {
      id: 'delete',
      label: 'Delete',
      description: 'Permanently remove data from the system',
      hasConfig: true,
      isBulkAppropriate: false,
    },
    {
      id: 'apply-dlp',
      label: 'Apply DLP Policy',
      description: 'Apply data loss prevention controls to prevent exfiltration',
      hasConfig: true,
      isBulkAppropriate: false,
    },
  ],
  'MANAGEMENT': [
    {
      id: 'notify-owner',
      label: 'Notify All Owners',
      description: 'Send notification to all data owners about their findings',
      hasConfig: true,
      isBulkAppropriate: true,
    },
    {
      id: 'request-justification',
      label: 'Request Justification',
      description: 'Ask the owner to provide business justification',
      hasConfig: true,
      isBulkAppropriate: false,
    },
  ],
  'COMPLIANCE': [
    {
      id: 'legal-hold',
      label: 'Legal Hold',
      description: 'Preserve all data in findings for legal or compliance purposes',
      hasConfig: true,
      isBulkAppropriate: true,
    },
  ]
};

export function BulkActionsModal({ findingsCount, selectedFindings = [], onClose }: BulkActionsModalProps) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [activeConfigAction, setActiveConfigAction] = useState<string | null>(null);
  const [remediationOpen, setRemediationOpen] = useState(false);

  // Actions applicable to at least one selected finding
  const applicableActionIds = new Set<string>(
    selectedFindings.flatMap(f =>
      f.action.map(a => a.remediationAction).filter(Boolean) as string[]
    )
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-full mx-4 max-h-[80vh] flex flex-col"
        style={{ width: activeConfigAction ? "1060px" : "500px", maxWidth: "calc(100vw - 32px)", transition: "width 0.2s ease-in-out" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Bulk Actions</h2>
            <p className="text-text-dim" style={{ fontSize: "11px", marginTop: "2px" }}>
              Select one or more actions to apply to all findings:
            </p>
          </div>
          <button
            onClick={() => { setSelectedActions(new Set()); setActiveConfigAction(null); onClose(); }}
            className="text-text-dim hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Action List */}
          <div
            style={{
              width: 500,
              flexShrink: 0,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              borderRight: activeConfigAction ? "1px solid var(--color-border)" : "none",
              overflow: "hidden",
            }}
          >
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, marginBottom: "16px" }}>

              {/* Proactive/Preventative Actions at Top */}
              {PROACTIVE_BULK_ACTIONS.map((action: any) => {
                const isChecked = selectedActions.has(action.id);
                const isActive = activeConfigAction === action.id;
                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted mb-4"
                    style={{
                      background: isActive ? "var(--color-muted)" : "transparent",
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newSelected = new Set(selectedActions);
                        if (e.target.checked) {
                          newSelected.add(action.id);
                          setActiveConfigAction(action.id);
                        } else {
                          newSelected.delete(action.id);
                          if (isActive) {
                            const remaining = Array.from(newSelected);
                            const nextWithConfig = remaining.find(id => {
                              const pa = PROACTIVE_BULK_ACTIONS.find((a: any) => a.id === id);
                              if (pa && pa.hasConfig) return true;
                              const allActions = Object.values(ALL_REMEDIATION_ACTIONS).flat();
                              const fa = allActions.find((a: any) => a.id === id);
                              return fa && (fa as any).hasConfig;
                            });
                            setActiveConfigAction(nextWithConfig || null);
                          }
                        }
                        setSelectedActions(newSelected);
                      }}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1">
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                          {action.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
                          {action.description}
                        </div>
                      </div>
                      {action.hasConfig && (
                        <button
                          onClick={() => setActiveConfigAction(action.id)}
                          className="p-2 rounded hover:bg-muted-foreground/10"
                          style={{ opacity: isActive ? 1 : 0.5 }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ── Pink "Bulk Remediation Actions" collapsible toggle ── */}
              <div style={{ marginTop: "4px" }}>
                <button
                  onClick={() => setRemediationOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:brightness-110"
                  style={{
                    background: "rgba(236,72,153,0.08)",
                    border: "1px solid rgba(236,72,153,0.28)",
                    color: "#ec4899",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>
                      Bulk Remediation Actions
                    </span>
                    
                  </div>
                  <ChevronRight
                    size={13}
                    style={{
                      transform: remediationOpen ? "rotate(90deg)" : undefined,
                      transition: "transform 0.18s",
                      flexShrink: 0,
                      color: "#ec4899",
                    }}
                  />
                </button>

                {remediationOpen && (
                  <div style={{ marginTop: "12px" }}>
                    {Object.entries(ALL_REMEDIATION_ACTIONS).map(([category, actions]) => {
                      const visibleActions = (actions as any[]).filter(
                        (action) => action.id !== 'apply-dlp' && action.id !== 'perform-targeted-scan'
                      );
                      if (visibleActions.length === 0) return null;
                      return (
                        <div key={category} style={{ marginBottom: "16px" }}>
                          <h4 style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            color: "var(--color-muted-foreground)",
                            marginBottom: "8px",
                          }}>
                            {category}
                          </h4>
                          <div className="space-y-2">
                            {visibleActions.map((action: any) => {
                              const isChecked = selectedActions.has(action.id);
                              const isActive = activeConfigAction === action.id;
                              // Disabled if no selected finding supports this action
                              // (skip check if no findings provided — show all enabled)
                              const isDisabled = selectedFindings.length > 0 && !applicableActionIds.has(action.id);
                              return (
                                <div
                                  key={action.id}
                                  className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${isDisabled ? '' : 'hover:bg-muted'}`}
                                  style={{
                                    background: isActive ? "var(--color-muted)" : "transparent",
                                    opacity: isDisabled ? 0.4 : 1,
                                    cursor: isDisabled ? "not-allowed" : "pointer",
                                  }}
                                  title={isDisabled ? "Not applicable to any of the selected findings" : undefined}
                                  onClick={() => {
                                    if (isDisabled) return;
                                    const newSelected = new Set(selectedActions);
                                    if (isChecked) {
                                      newSelected.delete(action.id);
                                      if (isActive) {
                                        const remaining = Array.from(newSelected);
                                        const nextWithConfig = remaining.find(id => {
                                          const pa = PROACTIVE_BULK_ACTIONS.find((a: any) => a.id === id);
                                          if (pa && pa.hasConfig) return true;
                                          const allActions = Object.values(ALL_REMEDIATION_ACTIONS).flat();
                                          const fa = allActions.find((a: any) => a.id === id);
                                          return fa && (fa as any).hasConfig;
                                        });
                                        setActiveConfigAction(nextWithConfig || null);
                                      }
                                    } else {
                                      newSelected.add(action.id);
                                      if (action.hasConfig) setActiveConfigAction(action.id);
                                    }
                                    setSelectedActions(newSelected);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => {}}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ width: "16px", height: "16px", cursor: isDisabled ? "not-allowed" : "pointer", marginTop: "2px" }}
                                  />
                                  <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1">
                                      <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "2px" }}>
                                        {action.label}
                                      </div>
                                      <div style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.4 }}>
                                        {action.description}
                                      </div>
                                    </div>
                                    {action.hasConfig && !isDisabled && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setActiveConfigAction(action.id); }}
                                        className="p-2 rounded hover:bg-muted-foreground/10"
                                        style={{ opacity: isActive ? 1 : 0.5 }}
                                      >
                                        <ChevronRight size={20} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center gap-3 justify-end pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
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
                  onClick={() => { onClose(); }}
                  className="px-4 py-2 rounded"
                  style={{
                    fontSize: "12px",
                    background: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                    fontWeight: 500,
                  }}
                >
                  Apply to {findingsCount} Finding{findingsCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Action Configuration */}
          {activeConfigAction && (
            <div
              style={{
                width: 500,
                flexShrink: 0,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--color-border)",
                overflow: "hidden",
              }}
            >
              <div className="flex items-center justify-between shrink-0" style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-muted-foreground)", letterSpacing: "0.05em" }}>
                  Configure
                </span>
                <button
                  onClick={() => setActiveConfigAction(null)}
                  className="rounded p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              {/* Partial applicability warning */}
              {(() => {
                if (!activeConfigAction || selectedFindings.length === 0) return null;
                const applicableCount = selectedFindings.filter(f =>
                  f.action.some(a => a.remediationAction === activeConfigAction)
                ).length;
                if (applicableCount === selectedFindings.length) return null;
                return (
                  <div style={{
                    fontSize: "11px",
                    color: "var(--color-muted-foreground)",
                    lineHeight: 1.5,
                    marginBottom: "16px",
                    padding: "8px 12px",
                    background: "var(--color-muted)",
                    borderRadius: "6px",
                    borderLeft: "3px solid var(--color-border)",
                  }}>
                    This action will only be applied to{" "}
                    <strong>{applicableCount} of {selectedFindings.length}</strong>{" "}
                    selected {selectedFindings.length === 1 ? "finding" : "findings"} — the rest do not support this action.
                  </div>
                );
              })()}
              <div className="flex-1 overflow-hidden">
                {activeConfigAction === 'apply-sensitivity-label' ? (
                  <ApplySensitivityLabelConfig />
                ) : activeConfigAction === 'quarantine' ? (
                  <QuarantineConfig />
                ) : activeConfigAction === 'restrict-access' ? (
                  <RestrictAccessConfig />
                ) : activeConfigAction === 'change-ownership' ? (
                  <ChangeOwnershipConfig />
                ) : activeConfigAction === 'notify-owner' ? (
                  <NotifyOwnerConfig />
                ) : activeConfigAction === 'legal-hold' ? (
                  <LegalHoldConfig />
                ) : activeConfigAction === 'delete' ? (
                  <DeleteConfig />
                ) : activeConfigAction === 'apply-dlp' ? (
                  <ApplyDLPConfig />
                ) : activeConfigAction === 'request-justification' ? (
                  <RequestJustificationConfig />
                ) : activeConfigAction === 'perform-targeted-scan' ? (
                  <PerformTargetedScanConfig />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
