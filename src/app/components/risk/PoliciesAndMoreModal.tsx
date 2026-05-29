import { useState, useEffect, useRef } from "react";
import {
  X, ScanSearch, HardDrive, Zap, ChevronRight,
  ExternalLink, Check, Loader2,
} from "lucide-react";
import { DataStoreIcon } from "../inventory/data-store-icons";
import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { RiskRule, PolicyEngineKey } from "../../shared/risk-rules";
import type { MockFinding } from "../../shared/risk-findings";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

// ── Types ──────────────────────────────────────────────────────────────────────

type PolicyOption = "retro" | "dar" | "dim";
type Phase = "select" | "preview";

interface DataGroup {
  key: string;
  app: string;
  instance: string;
  storeLabels: string[];
}

type SectionConfig =
  | { kind: "static"; ctaLabel: string; url: string }
  | { kind: "findings"; groupType: "saas"; ctaLabel: string; previewType: "retro" | "policy"; confirmUrl: string };

type PanelConfig = SectionConfig;

// ── URL constants ──────────────────────────────────────────────────────────────

const URLS = {
  retroList:     "https://netskope.goskope.com/ns#/casbapi-retroscan?view=list",
  casbApiV2:     "https://netskope.goskope.com/ns#/apiConnectorPolicies?view=saas_v2",
  casbApiWizard: "https://netskope.goskope.com/ns#/apiConnectorPolicies?view=wizard&mode=new",
  rtpPage:       "https://netskope.goskope.com/ns#/inline-policy",
  rtpWizard:     "https://netskope.goskope.com/ns#/inline-policy?type=dlp&view=wizard&mode=create",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const SAAS_APPS = new Set([
  "Google Drive", "SharePoint", "OneDrive", "Dropbox", "Box",
  "Slack", "Teams", "Microsoft Teams", "Salesforce", "ChatGPT",
  "Workday", "Zoom", "ServiceNow", "GitHub", "Jira", "Confluence",
]);

// Maps app display names to DataStoreIcon storeType keys
const APP_STORE_TYPE: Record<string, string> = {
  "Google Drive": "drives",
  "SharePoint":   "sharepoint-sites",
  "OneDrive":     "sharepoint-sites",
  "AWS S3":       "s3",
  "Azure Blob":   "azure-blob",
  "BigQuery":     "bigquery",
  "Snowflake":    "snowflake",
  "PostgreSQL":   "postgresql",
  "MySQL":        "mysql",
  "Oracle":       "oracle",
  "SQL Server":   "sqlserver",
  "AWS RDS":      "rds",
  "Azure SQL":    "azure-sql",
};

function extractDataGroups(findings: MockFinding[]): DataGroup[] {
  const map = new Map<string, DataGroup>();
  for (const f of findings) {
    for (const n of f.topology.nodes) {
      if (n.type !== "store") continue;
      const parts = n.sublabel.split("·").map(s => s.trim());
      if (parts.length < 2) continue;
      const [app, instance] = parts;
      if (!SAAS_APPS.has(app)) continue;
      const key = `${app}::${instance}`;
      if (!map.has(key)) map.set(key, { key, app, instance, storeLabels: [] });
      const g = map.get(key)!;
      if (!g.storeLabels.includes(n.label)) g.storeLabels.push(n.label);
    }
  }
  return [...map.values()].sort((a, b) => a.app.localeCompare(b.app) || a.instance.localeCompare(b.instance));
}

function getPanelConfig(option: PolicyOption, engine: PolicyEngineKey): PanelConfig {
  const isStaticEngine =
    engine === "CASB Inline" || engine === "CASB Inline + UEBA" ||
    engine === "SSPM" || engine === "Endpoint" || engine === "SWG";

  if (isStaticEngine) {
    const staticMap: Record<PolicyOption, SectionConfig> = {
      retro: { kind: "static", ctaLabel: "Go to Retro Scan",    url: URLS.retroList },
      dar:   { kind: "static", ctaLabel: "Go to Ongoing Policy", url: URLS.casbApiV2 },
      dim:   { kind: "static", ctaLabel: "Go to RTP Policy",     url: URLS.rtpPage },
    };
    return staticMap[option];
  }

  // CASB API, DSPM + CASB API (hybrid SaaS path), and any other engine — all SaaS only
  const saasMap: Record<PolicyOption, PanelConfig> = {
    retro: { kind: "findings", groupType: "saas", ctaLabel: "Setup Retro Scan",      previewType: "retro",  confirmUrl: URLS.retroList },
    dar:   { kind: "findings", groupType: "saas", ctaLabel: "Setup Ongoing Policy",  previewType: "policy", confirmUrl: URLS.casbApiWizard },
    dim:   { kind: "static",   ctaLabel: "Go to Real-time Protection Policy Page",   url: URLS.rtpWizard },
  };
  return saasMap[option];
}

function datestamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function getDescription(option: PolicyOption, rule: RiskRule): string | undefined {
  switch (option) {
    case "retro": return rule.recommendedRetroScan;
    case "dar":   return rule.recommendedOngoingDARPolicy;
    case "dim":   return rule.recommendedOngoingDIMPolicy;
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)", minWidth: 128, flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: "11px", lineHeight: 1.4, color: muted ? "var(--color-muted-foreground)" : "var(--color-foreground)" }}>
        {value}
      </span>
    </div>
  );
}

function GroupList({
  groups,
  excluded,
  onToggle,
}: {
  groups: DataGroup[];
  excluded: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground" style={{ fontSize: "11px", fontStyle: "italic" }}>
        No findings detected for this environment type
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {groups.map(g => {
        const isExcluded = excluded.has(g.key);
        const storeType = APP_STORE_TYPE[g.app];
        return (
          <button
            key={g.key}
            onClick={() => onToggle(g.key)}
            className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-3.5 transition-opacity"
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              opacity: isExcluded ? 0.45 : 1,
              cursor: "pointer",
            }}
          >
            {/* App logo */}
            <div className="shrink-0">
              {storeType
                ? <DataStoreIcon storeType={storeType} size={24} />
                : <div style={{ width: 24, height: 24 }} />
              }
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-foreground)" }}>{g.app}</span>
                <span className="text-muted-foreground" style={{ fontSize: "13px" }}> · {g.instance}</span>
              </div>
              {g.storeLabels.length > 0 && (
                <p className="text-muted-foreground" style={{ fontSize: "12px", marginTop: 2 }}>
                  {g.storeLabels.join(", ")}
                </p>
              )}
            </div>

            {/* Circle checkbox on the right */}
            <div
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: 28, height: 28,
                background: isExcluded
                  ? "color-mix(in srgb, var(--color-primary) 20%, transparent)"
                  : "var(--color-primary)",
              }}
            >
              <Check
                size={14}
                strokeWidth={2.5}
                style={{ color: isExcluded ? "color-mix(in srgb, var(--color-primary) 60%, transparent)" : "white" }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PreviewCard({
  group,
  rule,
  option,
  confirmUrl,
}: {
  group: DataGroup;
  rule: RiskRule;
  option: PolicyOption;
  confirmUrl: string;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");
  const name = option === "retro"
    ? `${group.app}_${group.instance}_${rule.id}_${datestamp()}`
    : `${rule.id} Recommendation ${group.app} ${group.instance}`;
  const storeType = APP_STORE_TYPE[group.app];
  const itemLabel = option === "retro" ? "retro scan" : "ongoing policy";

  const handleConfirm = () => {
    if (status !== "idle") return;
    setStatus("processing");
    window.open(confirmUrl, "_blank", "noopener,noreferrer");
    // Simulate creation completing after a brief delay
    setTimeout(() => setStatus("success"), 2000);
  };

  return (
    <div
      className="rounded-xl flex items-center gap-4 px-4 py-3.5"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-card)" }}
    >
      {/* Left: header + fields */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {storeType && <DataStoreIcon storeType={storeType} size={16} />}
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-foreground)" }}>{group.app}</span>
          <span className="text-muted-foreground" style={{ fontSize: "12px" }}> · {group.instance}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Field label="Name" value={name} />
          <Field label="App Instance" value={group.instance} />
          {option !== "retro" && group.storeLabels.length > 0 && (
            <Field label="Data Store / Resource ID" value={group.storeLabels.join(", ")} />
          )}
          <Field label={option === "retro" ? "Scan Scope" : "Exposure"} value="Default" muted />
          {option !== "retro" && <Field label="Action" value="Default" muted />}
        </div>
      </div>

      {/* Right: CTA */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <button
          onClick={handleConfirm}
          disabled={status !== "idle"}
          className="flex items-center gap-1.5 transition-opacity"
          style={{
            fontSize: "12px", fontWeight: 600,
            background: status === "success" ? "#22c55e" : "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            borderRadius: 8,
            padding: "7px 14px",
            opacity: status === "processing" ? 0.75 : 1,
            cursor: status !== "idle" ? "default" : "pointer",
          }}
        >
          {status === "processing" ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Creating…
            </>
          ) : status === "success" ? (
            <>
              <Check size={12} strokeWidth={2.5} />
              Created
            </>
          ) : (
            <>
              <ExternalLink size={12} />
              Confirm Creation
            </>
          )}
        </button>

        {status === "idle" && (
          <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
            Create &amp; open in new tab
          </span>
        )}
        {status === "processing" && (
          <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
            Creating {itemLabel}…
          </span>
        )}
        {status === "success" && (
          <span className="flex items-center gap-1" style={{ fontSize: "10px" }}>
            <Check size={10} strokeWidth={2.5} style={{ color: "#22c55e" }} />
            <span style={{ color: "var(--color-muted-foreground)" }}>Success. View </span>
            <button
              onClick={() => window.open(confirmUrl, "_blank", "noopener,noreferrer")}
              className="underline hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-primary)", fontSize: "10px" }}
            >
              {itemLabel}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section (one findings-list or static block inside the right panel) ─────────

function Section({
  label,
  config,
  description,
  findings,
  excluded,
  onToggle,
  onCreate,
  onStaticCta,
}: {
  label?: string;
  config: SectionConfig;
  description: string | undefined;
  findings: MockFinding[];
  excluded: Set<string>;
  onToggle: (key: string) => void;
  onCreate: (groups: DataGroup[], previewType: "retro" | "policy", confirmUrl: string) => void;
  onStaticCta: (url: string) => void;
}) {
  return (
    <div>
      {label && (
        <p style={{
          fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.07em", color: "var(--color-muted-foreground)", marginBottom: 10,
        }}>
          {label}
        </p>
      )}

      {description && (
        <p className="mb-4" style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--color-foreground)" }}>
          <span style={{ fontWeight: 700 }}>Recommendation:</span> {description}
        </p>
      )}

      {config.kind === "static" ? (
        <div className="flex justify-end">
          <button
            onClick={() => onStaticCta(config.url)}
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
            {config.ctaLabel}
          </button>
        </div>
      ) : (
        <>
          <GroupList
            groups={extractDataGroups(findings)}
            excluded={excluded}
            onToggle={onToggle}
          />
          {(() => {
            const active = extractDataGroups(findings).filter(g => !excluded.has(g.key));
            return active.length > 0 ? (
              <div className="mt-4 flex items-center justify-end gap-3">
                <span style={{ fontSize: "13px", color: "var(--color-muted-foreground)" }}>
                  {active.length} Selected
                </span>
                <button
                  onClick={() => onCreate(active, config.previewType, config.confirmUrl)}
                  className="flex items-center gap-2 transition-opacity hover:opacity-85"
                  style={{
                    fontSize: "13px", fontWeight: 600,
                    background: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                    borderRadius: 10,
                    padding: "10px 20px",
                  }}
                >
                  {config.ctaLabel} →
                </button>
              </div>
            ) : null;
          })()}
        </>
      )}
    </div>
  );
}

// ── OptionCard ─────────────────────────────────────────────────────────────────

function OptionCard({
  id,
  title,
  subtitle,
  disabled,
  selected,
  onClick,
  icon: Icon,
}: {
  id: PolicyOption;
  title: string;
  subtitle: string;
  disabled: boolean;
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left rounded-lg px-4 py-3.5 flex items-start justify-between gap-3 transition-all"
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.38 : 1,
        border: selected
          ? "1.5px solid #3b82f6"
          : "1.5px solid color-mix(in srgb, var(--color-border) 80%, transparent)",
        background: selected
          ? "color-mix(in srgb, #3b82f6 8%, var(--color-card))"
          : "var(--color-card)",
      }}
    >
      <div className="flex gap-3 items-start min-w-0">
        <div
          className="shrink-0 flex items-center justify-center rounded-md mt-0.5"
          style={{
            width: 28, height: 28,
            background: selected
              ? "color-mix(in srgb, #3b82f6 18%, transparent)"
              : "color-mix(in srgb, #3b82f6 10%, transparent)",
          }}
        >
          <Icon size={13} />
        </div>
        <div className="min-w-0">
          <p style={{
            fontSize: "12px", fontWeight: 600, lineHeight: 1.35,
            color: disabled ? "var(--color-muted-foreground)" : "var(--color-foreground)",
          }}>
            {title}
          </p>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: "11px", lineHeight: 1.4 }}>
            {subtitle}
          </p>
          {disabled && (
            <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", marginTop: 4, fontStyle: "italic" }}>
              Not configured for this rule
            </p>
          )}
        </div>
      </div>
      <ChevronRight
        size={14}
        className="shrink-0 mt-1 transition-transform"
        style={{
          color: selected ? "#3b82f6" : "var(--color-muted-foreground)",
          opacity: selected ? 1 : 0.4,
          transform: selected ? "rotate(90deg)" : undefined,
        }}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  rule: RiskRule;
  findings: MockFinding[];
  onClose: () => void;
}

export function PoliciesAndMoreModal({ rule, findings, onClose }: Props) {
  const [selectedOption, setSelectedOption] = useState<PolicyOption | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  // Left panel collapses when user advances past the scope-selection step
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const [excludedSaas, setExcludedSaas] = useState<Set<string>>(new Set());

  // Preview state: set when user clicks a "Create" CTA
  const [previewGroups, setPreviewGroups] = useState<DataGroup[]>([]);
  const [previewType, setPreviewType] = useState<"retro" | "policy">("retro");
  const [confirmUrl, setConfirmUrl] = useState<string>("");

  const OPTIONS = [
    {
      id: "retro" as PolicyOption,
      title: "Perform retroactive scan",
      subtitle: "Scan data store for more findings like this",
      description: rule.recommendedRetroScan,
      icon: ScanSearch,
    },
    {
      id: "dar" as PolicyOption,
      title: "Create ongoing data-at-rest policy",
      subtitle: "Prevent future violations. Scans data-at-rest on change or periodically.",
      description: rule.recommendedOngoingDARPolicy,
      icon: HardDrive,
    },
    {
      id: "dim" as PolicyOption,
      title: "Create ongoing data-in-motion policy",
      subtitle: "Prevent future violations. Scans data in motion in real-time.",
      description: rule.recommendedOngoingDIMPolicy,
      icon: Zap,
    },
  ];

  const handleOptionClick = (id: PolicyOption) => {
    const opt = OPTIONS.find(o => o.id === id)!;
    if (!opt.description) return;
    if (selectedOption === id) {
      setSelectedOption(null);
      setLeftCollapsed(false);
    } else {
      setSelectedOption(id);
      setPhase("select");
      setLeftCollapsed(false);
      setExcludedSaas(new Set());
    }
  };

  const handleCreate = (groups: DataGroup[], type: "retro" | "policy", url: string) => {
    setPreviewGroups(groups);
    setPreviewType(type);
    setConfirmUrl(url);
    setPhase("preview");
    setLeftCollapsed(true);
  };

  const handleStaticCta = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Goes back one level — restores left panel
  const handleBack = () => {
    setPhase("select");
    setLeftCollapsed(false);
  };

  const toggleSaas = (key: string) =>
    setExcludedSaas(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const modalWidth = selectedOption ? 960 : 520;
  const panelConfig = selectedOption ? getPanelConfig(selectedOption, rule.policyEngine) : null;

  const previewScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    previewScrollRef.current?.scrollTo({ top: 0 });
  }, [previewGroups]);

  // ── Right panel content ───────────────────────────────────────────────────────

  function renderRightPanelContent() {
    if (!selectedOption || !panelConfig) return null;

    if (phase === "preview") {
      return (
        <div ref={previewScrollRef} className="flex flex-col flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
          <p className="text-muted-foreground mb-5" style={{ fontSize: "11px", lineHeight: 1.5 }}>
            {previewType === "retro"
              ? "Review each retro scan below. Confirm the ones you want to create."
              : "Review each policy below. Confirm the ones you want to create."}
          </p>
          <div className="flex flex-col gap-3">
            {previewGroups.map(g => (
              <PreviewCard key={g.key} group={g} rule={rule} option={selectedOption} confirmUrl={confirmUrl} />
            ))}
          </div>
        </div>
      );
    }

    // Select phase
    const description = getDescription(selectedOption, rule);
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
        <Section
          config={panelConfig}
          description={description}
          findings={findings}
          excluded={excludedSaas}
          onToggle={toggleSaas}
          onCreate={handleCreate}
          onStaticCta={handleStaticCta}
        />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 300, background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl flex flex-col relative overflow-hidden"
        style={{
          width: modalWidth,
          height: 580,
          maxWidth: "96vw",
          maxHeight: "88vh",
          transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
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

        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p style={{
            fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.07em", color: "var(--color-muted-foreground)", marginBottom: 2,
          }}>
            Recommendations
          </p>
          <h3 style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.3 }}>
            {rule.name}
          </h3>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: option list — collapses when user advances past scope selection */}
          <div
            className="flex flex-col gap-3 overflow-hidden shrink-0"
            style={{
              width: leftCollapsed ? 0 : selectedOption ? 460 : "100%",
              minWidth: 0,
              opacity: leftCollapsed ? 0 : 1,
              padding: leftCollapsed ? "0" : "20px 24px",
              transition: "width 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease, padding 0.32s",
              pointerEvents: leftCollapsed ? "none" : undefined,
            }}
          >
            {OPTIONS.map(opt => (
              <OptionCard
                key={opt.id}
                id={opt.id}
                title={opt.title}
                subtitle={opt.subtitle}
                disabled={!opt.description}
                selected={selectedOption === opt.id}
                onClick={() => handleOptionClick(opt.id)}
                icon={opt.icon}
              />
            ))}
          </div>

          {/* Right: detail panel */}
          {selectedOption && (
            <div
              className="flex flex-col flex-1 overflow-hidden"
              style={{ borderLeft: "1px solid var(--color-border)" }}
            >
              {/* Pinned back button — only visible on preview */}
              {phase === "preview" && (
                <div
                  className="shrink-0 px-6 pt-4 pb-2"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    style={{ fontSize: "12px" }}
                  >
                    <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} />
                    Back
                  </button>
                </div>
              )}
              {renderRightPanelContent()}
            </div>
          )}
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
