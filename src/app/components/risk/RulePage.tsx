/**
 * RulePage.tsx
 *
 * Alternative "filter-first" workflow for drilling into rule findings.
 * Instead of immediately landing on the findings table, David can first
 * understand the landscape via charts, then filter down before digging
 * into individual findings.
 *
 * Layout:
 *   [Header — rule name + per-rule actions]
 *   [Left: Charts Panel] | [Right: Finding Cards → or → Finding Detail]
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, X, Plus, ChevronDown, ChevronLeft,
  Users, Database, FileText, Globe, Settings, Laptop, Activity,
  AlertTriangle, HardDrive, Building2, Cloud, UserCheck, Bot, Server,
  ArrowRight, CheckCircle2, Eye, Lock, Clock, UserMinus, ShieldCheck,
  Volume2, Shield, Tag, ChevronRight, Search, VolumeX, Columns,
  ArrowUpDown, RefreshCw, Sparkles, AppWindow, Monitor, Usb,
  Columns2, MessageSquare, UserCircle2, Link,
} from "lucide-react";
import type { RiskRule, MainEntityType } from "../../shared/risk-rules";
import { RISK_TYPES } from "../../shared/risk-rules";
import { SeverityBadge } from "../ui/SeverityBadge";
import { RiskTypeIcon } from "../ui/RiskTypeIcon";
import { DataStoreIcon } from "../inventory/data-store-icons";
import { SidePanel } from "../inventory/SidePanel";
import { SensitiveFileDetailPane, SensitiveFileHeaderExtra, FileActionsMenu } from "../inventory/ForensicDetailPane";
import { SaaSRowPanelContent } from "../inventory/UnstructuredDataStoreTableSaaS";
import type { SaaSUnstructuredDataRow } from "../inventory/UnstructuredDataStoreTableSaaS";
import { getFindingsForRuleFiltered, SEVERITY_STYLES, STATUS_STYLES, getDataStoreTier } from "../../shared/risk-findings";
import type { MockFinding, Severity, FindingFilter, FindingStatus } from "../../shared/risk-findings";
import { RescanModal } from "./RescanModal";
import { useFindingStatusStore, getEffectiveStatus } from "../../shared/findings-status-store";
import { ALL_DATA_TYPES, CATEGORIES, TYPE_TO_CATEGORY } from "../../shared/taxonomy";
import type { CategoryKey } from "../../shared/taxonomy";
import { useDisabledRules } from "../../shared/disabled-rules-store";
import {
  ApplySensitivityLabelConfig, QuarantineConfig, RestrictAccessConfig,
  ChangeOwnershipConfig, NotifyOwnerConfig, LegalHoldConfig, DeleteConfig,
  ApplyDLPConfig, RequestJustificationConfig, PerformTargetedScanConfig,
  RevokePublicSharingConfig, RevokeExternalSharingConfig, RevokeCompanySharingConfig,
} from "./config-panels";
import { DisablePolicyModal } from "./DisablePolicyModal";
import { PoliciesAndMoreModal } from "./PoliciesAndMoreModal";
import { RecommendationModal } from "./RecommendationModal";
import { getScanEventsForRule } from "../../shared/scan-history";
import svgPaths from "../../../imports/svg-vxgmuz48ko";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FilterChipType =
  | "severity"
  | "dataStore"
  | "destination"
  | "identity"
  | "identityType"
  | "dataType"
  | "dataTypeCategory"
  | "status"
  | "exposure";

export interface FilterChip {
  id: string;
  type: FilterChipType;
  value: string;   // internal key
  label: string;   // display text
}

// Entity types for side panels
export type EntityType = "identity" | "store" | "destination" | "file" | "column";

export interface EntityPanelData {
  type: EntityType;
  name: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────



// RISK_ICON_MAP lives in RiskTypeIcon component — imported above

const PLATFORM_STORE_TYPE: Array<[string, string]> = [
  ["google drive",    "drives"],
  ["sharepoint",      "sharepoint-sites"],
  ["onedrive",        "sharepoint-sites"],
  ["aws s3",          "s3"],
  ["s3",              "s3"],
  ["aws rds",         "rds"],
  ["rds",             "rds"],
  ["azure blob",      "azure-blob"],
  ["azure sql",       "azure-sql"],
  ["azure",           "azure-blob"],
  ["postgresql",      "postgresql"],
  ["postgres",        "postgresql"],
  ["oracle",          "oracle"],
  ["mysql",           "mysql"],
  ["sql server",      "sqlserver"],
  ["snowflake",       "snowflake"],
  ["bigquery",        "bigquery"],
  // AI services
  ["chatgpt",         "chatgpt"],
  ["openai",          "openai"],
  ["claude",          "claude"],
  ["anthropic",       "anthropic"],
  ["gemini",          "gemini"],
  ["github copilot",  "github-copilot"],
  ["copilot",         "github-copilot"],
];

type NodeKind = "store" | "destination" | "device" | "other";

function getPlatformIconNode(label: string, size = 11, kind: NodeKind = "other"): React.ReactNode {
  const lower = label.toLowerCase();
  for (const [key, storeType] of PLATFORM_STORE_TYPE) {
    if (lower.includes(key)) return <DataStoreIcon storeType={storeType} size={size} />;
  }
  // Node-type-aware fallbacks
  if (kind === "destination") return <Globe size={size} className="text-muted-foreground" />;
  if (kind === "device") return <Monitor size={size} className="text-muted-foreground" />;
  return <Database size={size} className="text-muted-foreground" />;
}

// ── Main entity type icons (mirrors uds-topology entityIcons) ─────────────────

const MAIN_ENTITY_ICON_MAP: Record<MainEntityType, React.ComponentType<{ size?: number; className?: string }>> = {
  "file":         FileText,
  "column":       Columns2,
  "chat-message": MessageSquare,
  "data-store":   Database,
  "device":       Monitor,
  "identity":     UserCircle2,
  "application":  AppWindow,
  "website":      Globe,
};

// Structured DB platforms — "file" rules on these stores show the column icon instead
const STRUCTURED_DB_KEYWORDS = [
  "postgresql", "postgres", "oracle", "mysql", "sql server",
  "rds", "azure sql", "snowflake", "bigquery",
];

function isStructuredStore(finding: MockFinding): boolean {
  const node = finding.topology.nodes.find(n => n.type === "store");
  if (!node) return false;
  const text = (node.label + " " + node.sublabel).toLowerCase();
  return STRUCTURED_DB_KEYWORDS.some(k => text.includes(k));
}

/** Returns the effective entity type for a finding, promoting "file" → "column" for structured stores. */
function resolveEntityType(mainEntityType: MainEntityType | undefined, finding: MockFinding): MainEntityType {
  if (!mainEntityType) return "file";
  if (mainEntityType === "file" && isStructuredStore(finding)) return "column";
  return mainEntityType;
}

/** Returns the display name for the main entity of a finding. */
function extractMainEntityName(entityType: MainEntityType, finding: MockFinding): string {
  const nodes = finding.topology.nodes;
  switch (entityType) {
    case "file":
    case "column": {
      const n = nodes.find(n => n.type === "file");
      return n?.label ?? "Unknown";
    }
    case "identity": {
      const n = nodes.find(n => n.type === "identity");
      return n?.label ?? "Unknown";
    }
    case "data-store": {
      const n = nodes.find(n => n.type === "store");
      return n?.label ?? "Unknown";
    }
    case "chat-message": {
      // Chat message findings use a "store" node for the container (e.g. ChatGPT Enterprise)
      const store = nodes.find(n => n.type === "store");
      const file = nodes.find(n => n.type === "file");
      return file?.label ?? store?.label ?? "Unknown";
    }
    case "application":
    case "website": {
      const n = nodes.find(n => n.type === "destination");
      return n?.label ?? "Unknown";
    }
    case "device": {
      const n = nodes.find(n => n.type === "device");
      return n?.label ?? "Unknown";
    }
  }
}

// Bulk actions data
const CORE_REMEDIATION_ACTIONS = {
  "Data Protection": [
    { id: "apply-sensitivity-label", label: "Apply Sensitivity Label", description: "Apply data classification labels for tracking and policy enforcement", hasConfig: true, isBulkAppropriate: true },
    { id: "quarantine", label: "Quarantine", description: "Isolate data from normal access pending review", hasConfig: true, isBulkAppropriate: true },
    { id: "delete", label: "Delete", description: "Permanently remove data from the system", hasConfig: true, isBulkAppropriate: false },
    { id: "apply-dlp", label: "Apply DLP Policy", description: "Apply data loss prevention controls to prevent exfiltration", hasConfig: true, isBulkAppropriate: true },
  ],
  "Access Control": [
    { id: "restrict-access", label: "Restrict Access", description: "Limit who can access this data to authorized users only", hasConfig: true, isBulkAppropriate: false },
    { id: "revoke-public", label: "Revoke Public Sharing", description: "Remove public access links and sharing permissions", hasConfig: false, isBulkAppropriate: true },
    { id: "revoke-external", label: "Revoke External Sharing", description: "Remove sharing permissions for external users", hasConfig: false, isBulkAppropriate: true },
    { id: "revoke-company", label: "Revoke Company-wide Sharing", description: "Remove broad company-wide access permissions", hasConfig: false, isBulkAppropriate: true },
    { id: "change-ownership", label: "Change Ownership", description: "Transfer ownership to a different user or team", hasConfig: true, isBulkAppropriate: false },
  ],
  "Management": [
    { id: "notify-owner", label: "Notify Owner", description: "Send notification to the data owner about the finding", hasConfig: true, isBulkAppropriate: true },
    { id: "request-justification", label: "Request Justification", description: "Ask the owner to provide business justification", hasConfig: true, isBulkAppropriate: false },
  ],
  "Compliance": [
    { id: "legal-hold", label: "Legal Hold", description: "Preserve data for legal or compliance purposes", hasConfig: true, isBulkAppropriate: true },
  ],
};

// Flat lookup: remediationAction ID → human-readable label
const REMEDIATION_ACTION_LABELS: Record<string, string> = Object.values(CORE_REMEDIATION_ACTIONS)
  .flat()
  .reduce<Record<string, string>>((acc, a) => { acc[a.id] = a.label; return acc; }, {});

const PROACTIVE_BULK_ACTIONS = [
  { id: "apply-dlp", label: "Apply DLP Policy", description: "Apply data loss prevention controls to prevent future exfiltration and data loss", hasConfig: true },
  { id: "perform-targeted-scan", label: "Perform Targeted Scan", description: "Run a focused scan to discover additional findings in case of blind spots or environmental changes", hasConfig: true },
];

// ── Helper functions ──────────────────────────────────────────────────────────

function extractDataStoreInfo(finding: MockFinding): { name: string; platform: string; type: "store" | "destination" } {
  const storeNode = finding.topology.nodes.find(n => n.type === "store" || n.type === "destination");
  if (storeNode) {
    const parts = storeNode.sublabel.split("·").map(s => s.trim());
    const platform = parts[0] || "Unknown";
    return { name: storeNode.label, platform, type: storeNode.type as "store" | "destination" };
  }
  return { name: "Unknown", platform: "Unknown", type: "store" };
}

function extractIdentityInfo(finding: MockFinding): { name: string; type: string } {
  const identNode = finding.topology.nodes.find(n => n.type === "identity");
  if (!identNode) return { name: "Unknown", type: "Internal" };
  return { name: identNode.label, type: getIdentityType(identNode.label, identNode.sublabel) };
}

/**
 * Returns a comma-separated list of all implicated entity labels from the
 * finding topology (store, destination, and identity nodes).
 * Nodes whose label is exactly "Unknown" are excluded.
 */
function extractEntitySummary(finding: MockFinding): string {
  const labels: string[] = [];
  for (const n of finding.topology.nodes) {
    if (n.type === "store" || n.type === "destination" || n.type === "identity") {
      const l = n.label?.toLowerCase() ?? "";
      if (n.label && n.label !== "Unknown" && !l.includes("anyone with link") && !l.includes("anyone with the link")) {
        labels.push(n.label);
      }
    }
  }
  return labels.join(", ");
}

function getIdentityType(label: string, sublabel: string): string {
  const l = label.toLowerCase();
  const s = sublabel.toLowerCase();
  if (l.includes("anyone with")) return "Public Link";
  if (s.includes("external") || s.includes("contractor") || s.includes("partner")) return "External";
  if (s.includes("service account") || l.includes("svc-")) return "Service Account";
  if (s.includes("ai agent") || s.includes("agent") || s.includes("bot")) return "Agent / Bot";
  if (s.includes("3rd party") || s.includes("third party")) return "3rd Party App";
  return "Internal User";
}

function extractDetectedDataTypes(finding: MockFinding): string[] {
  const allText = [finding.matchedCondition, ...finding.evidence].join(" ");
  return ALL_DATA_TYPES.filter(dt => allText.includes(dt));
}

function extractDetectedCategories(finding: MockFinding): CategoryKey[] {
  const types = extractDetectedDataTypes(finding);
  const cats = new Set<CategoryKey>();
  types.forEach(t => {
    const cat = TYPE_TO_CATEGORY[t];
    if (cat) cats.add(cat);
  });
  return Array.from(cats);
}

/**
 * Convert relative date strings like "2 days ago" to a comparable timestamp
 */
function parseRelativeDate(dateStr: string): number {
  const now = Date.now();
  const match = dateStr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  
  if (!match) {
    // If it doesn't match the pattern, return now (most recent)
    return now;
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  
  return now - (value * (multipliers[unit] || 0));
}

function applyChipFilters(findings: MockFinding[], chips: FilterChip[]): MockFinding[] {
  if (chips.length === 0) return findings;
  return findings.filter(finding =>
    chips.every(chip => {
      switch (chip.type) {
        case "severity":
          return finding.severity === chip.value;
        case "dataStore": {
          const storeNodes = finding.topology.nodes.filter(n => n.type === "store");
          return storeNodes.some(n => n.label === chip.value);
        }
        case "destination": {
          const destNodes = finding.topology.nodes.filter(n => n.type === "destination");
          return destNodes.some(n => n.label === chip.value);
        }
        case "identity": {
          const identNodes = finding.topology.nodes.filter(n => n.type === "identity");
          return identNodes.some(n => n.label === chip.value);
        }
        case "identityType": {
          const identNode = finding.topology.nodes.find(n => n.type === "identity");
          if (!identNode) return false;
          return getIdentityType(identNode.label, identNode.sublabel) === chip.value;
        }
        case "dataType": {
          const types = extractDetectedDataTypes(finding);
          return types.includes(chip.value);
        }
        case "dataTypeCategory": {
          const cats = extractDetectedCategories(finding);
          return cats.includes(chip.value as CategoryKey);
        }
        case "status":
          return getEffectiveStatus(finding.id, finding.status) === chip.value;
        case "exposure":
          return finding.exposureType === chip.value;
        default:
          return true;
      }
    })
  );
}

// ── Entity extraction & highlighting ──────────────────────────────────────────

interface EntityMap {
  [name: string]: EntityType;
}

function buildEntityMap(finding: MockFinding): EntityMap {
  const map: EntityMap = {};
  
  // Common non-person patterns to filter out
  const commonNonPersonPatterns = [
    /^(Google|Microsoft|Amazon|AWS|Azure|GitHub|Slack|Box|Dropbox)/i,
    /\b(Drive|Code|Names|Data|Database|Storage|Cloud|Server|Pipeline|Account|Service|Tool|System|Platform|Application)\b/i,
  ];
  
  // First pass: Extract entities from topology nodes
  finding.topology.nodes.forEach(node => {
    if (node.type === "identity" || node.type === "store" || node.type === "destination" || node.type === "file") {
      map[node.label] = node.type as EntityType;
    }
    
    // Also extract owner names from sublabels (e.g., "Diana Reyes · 23 password matches")
    if (node.sublabel) {
      const parts = node.sublabel.split("·")[0].trim();
      
      // Skip common non-person patterns
      const isNonPerson = commonNonPersonPatterns.some(pattern => pattern.test(parts));
      if (isNonPerson) {
        return;
      }
      
      // Check if it's a proper name (Capital Letter followed by space and another Capital Letter)
      // and ensure it's not already a known entity of another type
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(parts) && !map[parts]) {
        map[parts] = "identity";
      }
    }
  });
  
  // Second pass: Scan evidence for additional entities
  finding.evidence.forEach(evidenceText => {
    // Match patterns like "Diana Reyes (diana.reyes@company.com)" or "CI/CD Pipeline (cicd-pipeline)"
    const properNamePattern = /\b([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z/]+)*)\s*\([^)]+\)/g;
    const matches = evidenceText.matchAll(properNamePattern);
    
    for (const match of matches) {
      const properName = match[1].trim(); // e.g., "Diana Reyes", "CI/CD Pipeline"
      
      // Skip if this entity is already classified
      if (map[properName]) {
        continue;
      }
      
      // Skip common non-person patterns
      const isNonPerson = commonNonPersonPatterns.some(pattern => pattern.test(properName));
      if (isNonPerson) {
        continue;
      }
      
      // Determine entity type based on context
      const isPersonName = /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(properName);
      
      if (isPersonName) {
        // Person name like "Diana Reyes"
        map[properName] = "identity";
      } else if (properName.includes("/") || properName.toLowerCase().includes("pipeline") || 
                 properName.toLowerCase().includes("bot") || properName.toLowerCase().includes("copilot")) {
        // Service account or agent like "CI/CD Pipeline"
        map[properName] = "identity";
      }
    }
    
    // Match data store patterns like "prod-data-lake (s3://...)" or "HR Confidential (Google Drive d3)"
    const dataStorePattern = /\b([A-Za-z0-9\-_ ]+)\s*\((?:s3:\/\/|Google Drive|SharePoint|AWS|Azure|PostgreSQL)[^)]+\)/g;
    const storeMatches = evidenceText.matchAll(dataStorePattern);
    
    for (const match of storeMatches) {
      const storeName = match[1].trim();
      if (!map[storeName]) {
        map[storeName] = "store";
      }
    }
    
    // Match AI tool patterns like "ChatGPT (chat.openai.com)"
    const aiToolPattern = /\b(ChatGPT|Claude|Gemini|GitHub Copilot|Perplexity|OpenAI)\s*\([^)]+\)/g;
    const aiMatches = evidenceText.matchAll(aiToolPattern);
    
    for (const match of aiMatches) {
      const toolName = match[1].trim();
      if (!map[toolName]) {
        map[toolName] = "destination";
      }
    }
  });
  
  return map;
}

function extractColumnsFromEvidence(evidenceText: string): string[] {
  const columns: string[] = [];
  
  // Pattern: "Sensitive columns: col1, col2, col3"
  const columnMatch = evidenceText.match(/(?:Sensitive columns?|columns?): ([^·\n]+)/i);
  if (columnMatch) {
    const columnsPart = columnMatch[1];
    const parts = columnsPart.split(',').map(s => s.trim());
    parts.forEach(p => columns.push(p));
  }
  
  // Pattern: "cols D–F" or similar
  const colsMatch = evidenceText.match(/\(cols ([A-Z]–[A-Z])\)/i);
  if (colsMatch) {
    // Don't add these to entity list, just detect
  }
  
  return columns;
}

// ── Severity chip ─────────────────────────────────────────────────────────────

function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span className="shrink-0 rounded-full px-2" style={{ fontSize: "10px", fontWeight: 700, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

// ── Severity Donut Chart ──────��───────────────────────────────────────────────

function SeverityDonut({
  findings, activeFilters, onSegmentClick,
}: {
  findings: MockFinding[];
  activeFilters: FilterChip[];
  onSegmentClick: (sev: Severity) => void;
}) {
  const counts = {
    Critical: findings.filter(f => f.severity === "Critical").length,
    High:     findings.filter(f => f.severity === "High").length,
    Medium:   findings.filter(f => f.severity === "Medium").length,
  };
  const total = findings.length;
  const R = 40, C = 2 * Math.PI * R, cx = 52, cy = 52;

  const segments: { severity: Severity; count: number; pct: number; color: string }[] = [
    { severity: "Critical", count: counts.Critical, pct: total ? counts.Critical / total : 0, color: SEVERITY_STYLES.Critical.color },
    { severity: "High",     count: counts.High,     pct: total ? counts.High / total : 0,     color: SEVERITY_STYLES.High.color     },
    { severity: "Medium",   count: counts.Medium,   pct: total ? counts.Medium / total : 0,   color: SEVERITY_STYLES.Medium.color   },
  ];

  const activeSevFilters = activeFilters.filter(c => c.type === "severity").map(c => c.value);

  let cumulative = 0;
  return (
    <div>
      <p className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em" }}>
        Severity Breakdown
      </p>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width={104} height={104} viewBox="0 0 104 104">
            {total === 0 ? (
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--color-border)" strokeWidth={10} />
            ) : (
              segments.map(seg => {
                const dashLen = seg.pct * C;
                const offset = -cumulative * C;
                const prevCumulative = cumulative;
                cumulative += seg.pct;
                if (seg.count === 0) return null;
                const isActive = activeSevFilters.length === 0 || activeSevFilters.includes(seg.severity);
                return (
                  <circle
                    key={seg.severity}
                    cx={cx} cy={cy} r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={10}
                    strokeDasharray={`${dashLen} ${C - dashLen}`}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{
                      cursor: "pointer",
                      opacity: isActive ? 1 : 0.25,
                      transition: "opacity 0.15s",
                    }}
                    onClick={() => onSegmentClick(seg.severity)}
                  />
                );
              })
            )}
            <text
              x={cx} y={cy - 5}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: "16px", fontWeight: 700, fill: "var(--color-foreground)" }}
            >
              {total}
            </text>
            <text
              x={cx} y={cy + 10}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: "9px", fill: "var(--color-muted-foreground)" }}
            >
              findings
            </text>
          </svg>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          {segments.map(seg => {
            if (seg.count === 0) return null;
            const isActive = activeSevFilters.length === 0 || activeSevFilters.includes(seg.severity);
            return (
              <button
                key={seg.severity}
                onClick={() => onSegmentClick(seg.severity)}
                className="flex items-center gap-2 rounded px-1.5 py-1 transition-all hover:bg-muted/50 text-left w-full"
                style={{ opacity: isActive ? 1 : 0.4 }}
              >
                <span className="shrink-0 rounded-full" style={{ width: 7, height: 7, background: seg.color }} />
                <span style={{ fontSize: "11px", color: "var(--color-foreground)", flex: 1 }}>{seg.severity}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: seg.color }}>{seg.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ───────────────────���──────────────────────────────────

interface BarItem {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  icon?: React.ReactNode;
  color?: string;
}

function HorizontalBarChart({
  title, items, activeKeys, onItemClick, barColor = "#818cf8", maxVisible = 6,
}: {
  title: string;
  items: BarItem[];
  activeKeys: string[];
  onItemClick: (key: string, label: string) => void;
  barColor?: string;
  maxVisible?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const maxCount = items.reduce((m, i) => Math.max(m, i.count), 1);
  const visible = showAll ? items : items.slice(0, maxVisible);
  const overflow = items.length - maxVisible;

  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em" }}>
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {visible.map(item => {
          const pct = (item.count / maxCount) * 100;
          const isActive = activeKeys.length === 0 || activeKeys.includes(item.key);
          return (
            <button
              key={item.key}
              onClick={() => onItemClick(item.key, item.label)}
              className="group flex items-center gap-2 rounded px-1 py-1 transition-all hover:bg-muted/40 text-left w-full"
              style={{ opacity: isActive ? 1 : 0.3 }}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="truncate" style={{ fontSize: "11px", color: "var(--color-foreground)", fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span className="shrink-0" style={{ fontSize: "10px", fontWeight: 700, color: item.color ?? barColor }}>
                    {item.count}
                  </span>
                </div>
                {item.sublabel && (
                  <p className="truncate text-muted-foreground" style={{ fontSize: "9px" }}>{item.sublabel}</p>
                )}
                <div
                  className="rounded-full overflow-hidden"
                  style={{ height: 3, background: "var(--color-border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: item.color ?? barColor }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {overflow > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontSize: "10px" }}
        >
          +{overflow} more
        </button>
      )}
      {showAll && overflow > 0 && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontSize: "10px" }}
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ── Open Findings Histogram ───────────────────────────────────────────────────

type HistogramRange = 90 | 180 | 270 | 365;

const HISTOGRAM_RANGES: { label: string; value: HistogramRange }[] = [
  { label: "3m",  value: 90  },
  { label: "6m",  value: 180 },
  { label: "9m",  value: 270 },
  { label: "12m", value: 365 },
];

function buildRunningTotalPoints(
  ruleId: string,
  daysBack: HistogramRange
): { label: string; total: number; date: Date }[] {
  const now = new Date();
  const monthFmt     = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const monthYearFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });

  // Use all 365 days of history so earlier ranges inherit an already-accumulated baseline
  const allEvents = getScanEventsForRule(ruleId, 365);
  allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Bucket granularity
  const bucketDays = daysBack <= 90 ? 7 : daysBack <= 180 ? 14 : daysBack <= 270 ? 21 : 30;
  const numBuckets = Math.ceil(daysBack / bucketDays);

  // Build evenly-spaced sample dates from (now - daysBack) → now.
  // The last entry is always pinned to exactly `now` so the rightmost point
  // never overshoots today (Math.ceil can produce up to bucketDays-1 extra days).
  const sampleDates = Array.from({ length: numBuckets + 1 }, (_, i) => {
    if (i === numBuckets) return new Date(now); // always end at today
    const d = new Date(now);
    d.setDate(d.getDate() - daysBack + i * bucketDays);
    return d;
  });

  // For each sample date, sum all events up to that date (cumulative open total)
  const fmt = daysBack === 365 ? monthYearFmt : monthFmt;
  return sampleDates.map(date => {
    const total = allEvents
      .filter(e => e.timestamp <= date)
      .reduce((sum, e) => sum + e.count, 0);
    return { label: fmt.format(date), total, date };
  });
}

function OpenFindingsHistogram({ ruleId }: { ruleId: string }) {
  const [range, setRange] = useState<HistogramRange>(90);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points = useMemo(() => buildRunningTotalPoints(ruleId, range), [ruleId, range]);
  const maxTotal = Math.max(...points.map(p => p.total), 1);

  // SVG logical dimensions — X = time axis (left=oldest, right=newest), Y = count axis
  const VB_W = 400;
  const VB_H = 90;
  const PAD_T = 6;
  const PAD_B = 4;
  const PAD_L = 4;
  const PAD_R = 4;
  const innerW = VB_W - PAD_L - PAD_R;
  const innerH = VB_H - PAD_T - PAD_B;

  const n = Math.max(points.length - 1, 1);
  // oldest → left (x = PAD_L), newest → right (x = VB_W - PAD_R)
  // highest count → top (y = PAD_T), zero → bottom (y = VB_H - PAD_B)
  const svgPts = points.map((p, i) => ({
    x: PAD_L + (i / n) * innerW,
    y: PAD_T + (1 - p.total / maxTotal) * innerH,
    ...p,
  }));

  // Smooth cubic Bézier (Catmull-Rom → cubic Bézier), clamp Y to chart bounds
  const yMax = VB_H - PAD_B;
  const yMin = PAD_T;
  function smoothD(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    const tension = 0.4;
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = Math.min(yMax, Math.max(yMin, p1.y + (p2.y - p0.y) * tension));
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = Math.min(yMax, Math.max(yMin, p2.y - (p3.y - p1.y) * tension));
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  const linePath = smoothD(svgPts);

  // Area: curve + close along the bottom edge (the zero / x-axis)
  const bottomY = VB_H - PAD_B;
  const areaPath = [
    smoothD(svgPts),
    `L ${svgPts[svgPts.length - 1].x.toFixed(2)} ${bottomY}`,
    `L ${svgPts[0].x.toFixed(2)} ${bottomY}`,
    "Z",
  ].join(" ");

  const gradId = `ofh-grad-${ruleId.replace(/[^a-z0-9]/gi, "")}`;
  const hov = hoveredIdx !== null ? svgPts[hoveredIdx] : null;

  // X-axis label spacing — aim for ~40 logical units (~24 px at panel width) between labels
  const minLogUnits = 44;
  const logUnitsPerPoint = innerW / n;
  const labelEvery = Math.max(1, Math.ceil(minLogUnits / logUnitsPerPoint));
  const lastIdx = points.length - 1;
  const visibleLabelIdxs = points
    .map((_, i) => i)
    .filter(i => {
      if (i === 0 || i === lastIdx) return true;
      if (i % labelEvery !== 0) return false;
      // Suppress intermediate labels that crowd the rightmost label
      const gapToLast = svgPts[lastIdx].x - svgPts[i].x;
      return gapToLast >= minLogUnits;
    });

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", color: "var(--color-muted-foreground)" }}>Findings</p>
        <div
          className="relative flex items-center gap-px"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "1px 4px",
          }}
        >
          {HISTOGRAM_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className="transition-colors"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                height: 22,
                minWidth: 34,
                borderRadius: 4,
                padding: "0 6px",
                background: range === r.value ? "rgba(148,163,184,0.15)" : "transparent",
                color: range === r.value ? "var(--color-foreground)" : "var(--color-muted-foreground)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area — horizontal layout */}
      <div className="relative" style={{ height: VB_H }}>

        {/* Vertical crosshair on hover */}
        {hov && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${(hov.x / VB_W) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(148,163,184,0.45)",
              transform: "translateX(-50%)",
              zIndex: 3,
            }}
          />
        )}

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ display: "block" }}
          onMouseMove={e => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * VB_W;
            let nearest = 0;
            let nearestDist = Infinity;
            svgPts.forEach((p, i) => {
              const d = Math.abs(p.x - relX);
              if (d < nearestDist) { nearestDist = d; nearest = i; }
            });
            setHoveredIdx(nearest);
          }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/*
              Vertical gradient — opaque at the top (where the purple line lives at its
              highest point) fading to fully transparent at the bottom (the x-axis / zero).
              Because the fill is clipped below the curve, the gradient appears to radiate
              downward from the line itself.
            */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Filled area */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Hover dot */}
        {hov && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#38bdf8",
              border: "1.5px solid var(--color-card)",
              left: `${(hov.x / VB_W) * 100}%`,
              top: `${(hov.y / VB_H) * 100}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
            }}
          />
        )}

        {/* Hover tooltip */}
        {hov && (() => {
          const xPct = (hov.x / VB_W) * 100;
          const yPct = (hov.y / VB_H) * 100;
          const isRightHalf  = xPct > 58;
          const isBottomHalf = yPct > 55;
          return (
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${yPct}%`,
                ...(isRightHalf
                  ? { right: `${100 - xPct}%`, marginRight: 8 }
                  : { left: `${xPct}%`,        marginLeft: 8 }),
                transform: isBottomHalf
                  ? "translateY(-100%) translateY(-4px)"
                  : "translateY(4px)",
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "3px 7px",
                whiteSpace: "nowrap",
                zIndex: 20,
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-foreground)" }}>
                {hov.total.toLocaleString()} open
              </p>
              <p style={{ fontSize: "9px", color: "var(--color-muted-foreground)" }}>
                {hov.label}
              </p>
            </div>
          );
        })()}
      </div>

      {/* X-axis date labels */}
      <div className="relative" style={{ height: 14, marginTop: 3 }}>
        {/* "Now" marker at the right end */}
        <span
          className="absolute"
          style={{
            right: 0,
            bottom: 0,
            fontSize: "9px",
            fontWeight: 700,
            color: "#38bdf8",
            lineHeight: 1,
            whiteSpace: "nowrap",
            letterSpacing: "0.03em",
          }}
        >
          Now
        </span>
        {visibleLabelIdxs.map(i => {
          const xPct = (svgPts[i].x / VB_W) * 100;
          const isLast  = i === points.length - 1;
          // Hide the last date label — "Now" replaces it
          if (isLast) return null;
          // Clamp anchor: left-align near left edge, center elsewhere
          const transform = xPct < 8 ? "none" : "translateX(-50%)";
          return (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${xPct}%`,
                bottom: 0,
                transform,
                fontSize: "9px",
                color: hoveredIdx === i
                  ? "var(--color-foreground)"
                  : "var(--color-muted-foreground)",
                lineHeight: 1,
                whiteSpace: "nowrap",
                transition: "color 0.1s",
              }}
            >
              {points[i].label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Charts Panel (left sidebar) ───────────────────────────────────────────────

function ChartsPanel({
  rule,
  allFindings,
  filteredFindings,
  chips,
  onAddChip,
}: {
  rule: RiskRule;
  allFindings: MockFinding[];
  filteredFindings: MockFinding[];
  chips: FilterChip[];
  onAddChip: (chip: Omit<FilterChip, "id">) => void;
}) {
  // Compute data store items from ALL findings (unfiltered), so bars always show full landscape
  const dataStoreItems = useMemo((): BarItem[] => {
    const map = new Map<string, BarItem>();
    allFindings.forEach(f => {
      f.topology.nodes.filter(n => n.type === "store").forEach(n => {
        const existing = map.get(n.label);
        if (existing) { existing.count++; }
        else map.set(n.label, { key: n.label, label: n.label, sublabel: n.sublabel.split("·")[0]?.trim(), count: 1, color: "#22d3ee" });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allFindings]);

  const destinationItems = useMemo((): BarItem[] => {
    const map = new Map<string, BarItem>();
    allFindings.forEach(f => {
      f.topology.nodes.filter(n => n.type === "destination").forEach(n => {
        const existing = map.get(n.label);
        if (existing) { existing.count++; }
        else map.set(n.label, { key: n.label, label: n.label, sublabel: n.sublabel.split("·")[0]?.trim(), count: 1, color: "#22d3ee" });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allFindings]);

  const identityItems = useMemo((): BarItem[] => {
    const map = new Map<string, BarItem>();
    allFindings.forEach(f => {
      const identNode = f.topology.nodes.find(n => n.type === "identity");
      if (!identNode) return;
      const existing = map.get(identNode.label);
      if (existing) { existing.count++; }
      else map.set(identNode.label, { key: identNode.label, label: identNode.label, sublabel: getIdentityType(identNode.label, identNode.sublabel), count: 1, color: "#818cf8" });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allFindings]);

  const EXPOSURE_LABELS: Record<string, string> = {
    "Public": "Public",
    "External": "External",
    "All Internal Users": "All Internal Users",
    "EEEU": "All Internal Users via EEEU",
  };
  const EXPOSURE_COLORS: Record<string, string> = {
    "Public": "#ef4444",
    "External": "#f97316",
    "All Internal Users": "#eab308",
    "EEEU": "#3b82f6",
  };

  const exposureItems = useMemo((): BarItem[] => {
    const map = new Map<string, BarItem>();
    allFindings.forEach(f => {
      if (!f.exposureType) return;
      const existing = map.get(f.exposureType);
      if (existing) { existing.count++; }
      else map.set(f.exposureType, {
        key: f.exposureType,
        label: EXPOSURE_LABELS[f.exposureType] ?? f.exposureType,
        count: 1,
        color: EXPOSURE_COLORS[f.exposureType],
      });
    });
    const order = ["Public", "External", "All Internal Users", "EEEU"];
    return Array.from(map.values()).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }, [allFindings]);

  // Compute all unique data types from all findings
  const allDataTypes = useMemo((): string[] => {
    const typesSet = new Set<string>();
    allFindings.forEach(f => {
      const types = extractDetectedDataTypes(f);
      types.forEach(t => typesSet.add(t));
    });
    return Array.from(typesSet).sort();
  }, [allFindings]);

  // Active filter keys per type
  const activeDSKeys   = chips.filter(c => c.type === "dataStore").map(c => c.value);
  const activeDestKeys = chips.filter(c => c.type === "destination").map(c => c.value);
  const activeIdentKeys = chips.filter(c => c.type === "identity").map(c => c.value);
  const activeDataTypeKeys = chips.filter(c => c.type === "dataType").map(c => c.value);
  const activeExposureKeys = chips.filter(c => c.type === "exposure").map(c => c.value);

  // State for showing more data types
  const [showAllDataTypes, setShowAllDataTypes] = useState(false);
  const MAX_DATA_TYPES = 12;
  const visibleDataTypes = showAllDataTypes ? allDataTypes : allDataTypes.slice(0, MAX_DATA_TYPES);
  const hiddenCount = allDataTypes.length - MAX_DATA_TYPES;

  const handleExposureClick = (key: string, label: string) => {
    if (!chips.find(c => c.type === "exposure" && c.value === key)) {
      onAddChip({ type: "exposure", value: key, label: `Exposure: ${label}` });
    }
  };

  const handleDataStoreClick = (key: string, label: string) => {
    if (!chips.find(c => c.type === "dataStore" && c.value === key)) {
      onAddChip({ type: "dataStore", value: key, label: `Store: ${label}` });
    }
  };

  const handleDestinationClick = (key: string, label: string) => {
    if (!chips.find(c => c.type === "destination" && c.value === key)) {
      onAddChip({ type: "destination", value: key, label: `Dest: ${label}` });
    }
  };

  const handleIdentityClick = (key: string, label: string) => {
    if (!chips.find(c => c.type === "identity" && c.value === key)) {
      onAddChip({ type: "identity", value: key, label: `Identity: ${label}` });
    }
  };

  const handleDataTypeClick = (dataType: string) => {
    if (!chips.find(c => c.type === "dataType" && c.value === dataType)) {
      onAddChip({ type: "dataType", value: dataType, label: dataType });
    }
  };

  return (
    <div
      className="shrink-0 flex flex-col gap-5 overflow-y-auto p-6 border-r bg-white dark:bg-slate-900"
      style={{ width: "100%", borderColor: "var(--color-border)" }}
    >

      {/* Instructions */}
      <p
        className="text-muted-foreground"
        style={{ fontSize: "10px", lineHeight: 1.5 }}
      >
        Click any chart segment or bar to add a filter to the findings list →
      </p>

      {/* Data Types */}
      {allDataTypes.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em" }}>
            Data Types
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {visibleDataTypes.map(dt => {
              const isActive = activeDataTypeKeys.length === 0 || activeDataTypeKeys.includes(dt);
              return (
                <button
                  key={dt}
                  onClick={() => handleDataTypeClick(dt)}
                  className="rounded px-1.5 py-0.5 transition-opacity hover:opacity-100"
                  style={{ 
                    fontSize: "9px", 
                    fontWeight: 500, 
                    background: "var(--color-muted)", 
                    color: "var(--color-muted-foreground)", 
                    border: "1px solid var(--color-border)",
                    opacity: isActive ? 1 : 0.3,
                    cursor: "pointer"
                  }}
                >
                  {dt}
                </button>
              );
            })}
            {hiddenCount > 0 && !showAllDataTypes && (
              <button
                onClick={() => setShowAllDataTypes(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontSize: "10px" }}
              >
                +{hiddenCount} more
              </button>
            )}
            {showAllDataTypes && allDataTypes.length > MAX_DATA_TYPES && (
              <button
                onClick={() => setShowAllDataTypes(false)}
                className="rounded px-1.5 py-0.5 transition-colors hover:bg-muted"
                style={{ fontSize: "9px", fontWeight: 500, color: "var(--color-primary)", background: "transparent" }}
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      {/* Exposure bar chart */}
      {exposureItems.length > 0 && (
        <HorizontalBarChart
          title="Top Exposure"
          items={exposureItems}
          activeKeys={activeExposureKeys}
          onItemClick={handleExposureClick}
          barColor="#ef4444"
        />
      )}

      {/* Data stores bar chart */}
      {dataStoreItems.length > 0 && (
        <HorizontalBarChart
          title="Top Data Stores"
          items={dataStoreItems}
          activeKeys={activeDSKeys}
          onItemClick={handleDataStoreClick}
          barColor="#22d3ee"
        />
      )}

      {/* Destinations bar chart */}
      {destinationItems.length > 0 && (
        <HorizontalBarChart
          title="Top Destinations"
          items={destinationItems}
          activeKeys={activeDestKeys}
          onItemClick={handleDestinationClick}
          barColor="#22d3ee"
        />
      )}

      {/* Identities bar chart */}
      {identityItems.length > 0 && (
        <HorizontalBarChart
          title="Top Identities"
          items={identityItems.filter(item => !item.label.toLowerCase().includes("anyone with link") && !item.label.toLowerCase().includes("anyone with the link"))}
          activeKeys={activeIdentKeys}
          onItemClick={handleIdentityClick}
          barColor="#818cf8"
        />
      )}

      {/* Open Findings Over Time histogram */}
      <OpenFindingsHistogram ruleId={rule.id} />

    </div>
  );
}

// ── Filter chips bar ──────────────────────��───────────────────────────────────

function FilterChipsBar({
  chips, allFindings, onRemoveChip, onAddChip,
}: {
  chips: FilterChip[];
  allFindings: MockFinding[];
  onRemoveChip: (id: string) => void;
  onAddChip: (chip: Omit<FilterChip, "id">) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setExpandedSection(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Build filter options from allFindings
  const dataStoreOptions = useMemo(() => {
    const s = new Set<string>();
    allFindings.forEach(f => f.topology.nodes.filter(n => n.type === "store").forEach(n => s.add(n.label)));
    return Array.from(s).sort();
  }, [allFindings]);

  const destinationOptions = useMemo(() => {
    const s = new Set<string>();
    allFindings.forEach(f => f.topology.nodes.filter(n => n.type === "destination").forEach(n => s.add(n.label)));
    return Array.from(s).sort();
  }, [allFindings]);

  const identityOptions = useMemo(() => {
    const s = new Set<string>();
    allFindings.forEach(f => {
      const n = f.topology.nodes.find(n => n.type === "identity");
      if (n) s.add(n.label);
    });
    return Array.from(s).sort();
  }, [allFindings]);

  const identityTypeOptions = ["Internal User", "External", "Service Account", "Agent / Bot", "3rd Party App", "Public Link"];
  const categoryOptions = CATEGORIES.map(c => ({ key: c.key, label: c.full, color: c.color }));
  
  const dataTypeOptions = useMemo(() => {
    const typesSet = new Set<string>();
    allFindings.forEach(f => {
      const types = extractDetectedDataTypes(f);
      types.forEach(t => typesSet.add(t));
    });
    return Array.from(typesSet).sort();
  }, [allFindings]);

  const addFilter = (type: FilterChipType, value: string, label: string) => {
    if (!chips.find(c => c.type === type && c.value === value)) {
      onAddChip({ type, value, label });
    }
    setDropdownOpen(false);
    setExpandedSection(null);
  };

  const exposureOptions = useMemo(() => {
    const s = new Set<string>();
    allFindings.forEach(f => { if (f.exposureType) s.add(f.exposureType); });
    return Array.from(s);
  }, [allFindings]);

  const exposureLabelMap: Record<string, string> = {
    "Public": "Public",
    "External": "External",
    "All Internal Users": "All Internal Users",
    "EEEU": "All Internal Users via EEEU",
  };

  const sections = [
    ...(exposureOptions.length > 0 ? [{ key: "exposure", label: "Exposure", options: exposureOptions.map(s => ({ value: s, label: `Exposure: ${exposureLabelMap[s] ?? s}` })), type: "exposure" as FilterChipType }] : []),
    { key: "dataStore", label: "Data Store", options: dataStoreOptions.map(s => ({ value: s, label: `Store: ${s}` })), type: "dataStore" as FilterChipType },
    { key: "destination", label: "Data Destination", options: destinationOptions.map(s => ({ value: s, label: `Dest: ${s}` })), type: "destination" as FilterChipType },
    { key: "identity", label: "Identity", options: identityOptions.map(s => ({ value: s, label: `Identity: ${s}` })), type: "identity" as FilterChipType },
    { key: "identityType", label: "Identity Type", options: identityTypeOptions.map(s => ({ value: s, label: `Type: ${s}` })), type: "identityType" as FilterChipType },
    { key: "dataType", label: "Data Type", options: dataTypeOptions.map(s => ({ value: s, label: s })), type: "dataType" as FilterChipType },
    { key: "dataTypeCategory", label: "Data Type Category", options: categoryOptions.map(c => ({ value: c.key, label: `${c.key}: ${c.label}`, color: c.color })), type: "dataTypeCategory" as FilterChipType },
  ];

  return (
    <div className="flex items-start gap-2 flex-wrap px-6 py-3 shrink-0">
      {/* Active chips */}
      {chips.map(chip => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ fontSize: "11px", fontWeight: 500, background: "rgba(59,130,246,0.15)", color: "var(--color-primary)", border: "1px solid rgba(59,130,246,0.3)" }}
        >
          {chip.label}
          <button
            onClick={() => onRemoveChip(chip.id)}
            className="rounded-full hover:bg-primary/20 transition-colors"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}
          >
            <X size={9} />
          </button>
        </span>
      ))}

      {/* Add filter button + dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 border transition-colors hover:bg-muted/40"
          style={{ fontSize: "11px", fontWeight: 500, borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
        >
          <Plus size={10} />
          Add Filter
        </button>

        {dropdownOpen && (
          <div
            className="absolute left-0 top-full mt-1 rounded-lg border shadow-xl z-20 overflow-hidden"
            style={{ minWidth: 240, background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {/* ── Status section (pinned first) ── */}
            {(() => {
              const statusOpts = [
                { value: "Open",   label: "Status: Open",   color: STATUS_STYLES["Open"].color },
                { value: "Rescan", label: "Status: Rescan", color: STATUS_STYLES["Rescan"].color },
              ].filter(o => !chips.find(c => c.type === ("status" as FilterChipType) && c.value === o.value));
              if (statusOpts.length === 0) return null;
              const isExpanded = expandedSection === "status";
              return (
                <div>
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : "status")}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                  >
                    Status
                    <ChevronRight size={12} className="text-muted-foreground transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : undefined }} />
                  </button>
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      {statusOpts.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => addFilter("status" as FilterChipType, opt.value, opt.label)}
                          className="w-full text-left px-4 py-1.5 hover:bg-primary/10 transition-colors flex items-center gap-2"
                          style={{ fontSize: "11px" }}
                        >
                          <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: opt.color }} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── All other filter sections ── */}
            {sections.map(section => {
              const availOptions = section.options.filter(o => !chips.find(c => c.type === section.type && c.value === o.value));
              if (availOptions.length === 0) return null;
              const isExpanded = expandedSection === section.key;
              return (
                <div key={section.key}>
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                  >
                    {section.label}
                    <ChevronRight size={12} className="text-muted-foreground transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : undefined }} />
                  </button>
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      {availOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => addFilter(section.type, opt.value, opt.label)}
                          className="w-full text-left px-4 py-1.5 hover:bg-primary/10 transition-colors flex items-center gap-2"
                          style={{ fontSize: "11px" }}
                        >
                          {"color" in opt && (
                            <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: (opt as any).color }} />
                          )}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <button
          onClick={() => chips.forEach(c => onRemoveChip(c.id))}
          className="text-muted-foreground hover:text-foreground transition-colors self-center"
          style={{ fontSize: "10px" }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// ── Finding Card ──────────────────────────────────────────────────────────────

function FindingCard({
  finding, selected, onClick, index, bulkMode, checked, onCheck, effectiveStatus, mainEntityType,
}: {
  finding: MockFinding;
  selected: boolean;
  onClick: () => void;
  index: number;
  bulkMode?: boolean;
  checked?: boolean;
  onCheck?: (id: string) => void;
  effectiveStatus?: FindingStatus;
  mainEntityType?: MainEntityType;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const dataTypes = extractDetectedDataTypes(finding);
  const MAX_TYPES = 3;
  const status = effectiveStatus ?? finding.status;
  const entityType = resolveEntityType(mainEntityType, finding);
  const EntityIcon = MAIN_ENTITY_ICON_MAP[entityType];
  const entityName = extractMainEntityName(entityType, finding);

  // Determine background: selected state > hover state > neutral
  let background;
  if (selected) {
    background = "rgba(59,130,246,0.07)";
  } else if (isHovered) {
    background = "rgba(59,130,246,0.08)";
  } else {
    background = "var(--color-card)";
  }

  return (
    <div className={`flex items-start${bulkMode ? " gap-2 pl-1" : ""}`}>
      {bulkMode && (
        <div className="flex items-center shrink-0" style={{ paddingTop: 11 }}>
          <input
            type="checkbox"
            checked={!!checked}
            onChange={() => onCheck?.(finding.id)}
            onClick={e => e.stopPropagation()}
            style={{ width: 15, height: 15, cursor: "pointer" }}
          />
        </div>
      )}
      <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex-1 text-left py-3 rounded-lg flex flex-col gap-1.5 transition-colors"
      style={{
        paddingLeft: 18, paddingRight: 16,
        borderLeft: selected ? "2px solid var(--color-primary)" : "2px solid transparent",
        background,
        cursor: "pointer",
      }}
    >
      {/* Row 1: [logo] [title] [rescan badge] on left · timestamp + finding ID on right */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <EntityIcon size={14} className="text-muted-foreground shrink-0" />
          <p className="truncate" style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-foreground)" }}>
            {entityName}
          </p>
          {status === "Rescan" && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 shrink-0"
              style={{
                fontSize: "8px", fontWeight: 700,
                background: STATUS_STYLES["Rescan"].bg,
                color: STATUS_STYLES["Rescan"].color,
                border: `1px solid ${STATUS_STYLES["Rescan"].color}40`,
                letterSpacing: "0.04em",
              }}
            >
              <RefreshCw size={7} />
              RESCAN
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground" style={{ fontSize: "9px" }}>{finding.detectedAt}</span>
          <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#ec4899" }}>{finding.id}</span>
        </div>
      </div>

      {/* Row 2: matched condition snippet */}
      <p className="text-muted-foreground" style={{ fontSize: "10px", lineHeight: 1.4 }}>
        {finding.matchedCondition}
      </p>

      {/* Row 3: data type chips */}
      {dataTypes.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {dataTypes.slice(0, MAX_TYPES).map(dt => (
            <span
              key={dt}
              className="rounded px-1.5 py-0.5"
              style={{ fontSize: "9px", fontWeight: 500, background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "1px solid rgba(0,0,0,0.1)" }}
            >
              {dt}
            </span>
          ))}
          {dataTypes.length > MAX_TYPES && (
            <span className="text-muted-foreground" style={{ fontSize: "9px" }}>+{dataTypes.length - MAX_TYPES}</span>
          )}
        </div>
      )}
    </button>
    </div>
  );
}

// ── Entity Side Panel ─────────────────────────────────────────────────────────

function EntitySidePanel({
  entity,
  onClose,
}: {
  entity: EntityPanelData;
  onClose: () => void;
}) {
  const getEntityIcon = () => {
    switch (entity.type) {
      case "identity": return Users;
      case "store": return Database;
      case "destination": return Globe;
      case "file": return FileText;
      case "column": return Columns;
      default: return AlertTriangle;
    }
  };

  const getEntityColor = () => {
    switch (entity.type) {
      case "identity": return "#818cf8";
      case "store": return "#22d3ee";
      case "destination": return "#22d3ee";
      case "file": return "#facc15";
      case "column": return "#facc15";
      default: return "#888";
    }
  };

  const Icon = getEntityIcon();
  const color = getEntityColor();

  return (
    <div
      className="absolute top-0 bottom-0 right-0 flex flex-col bg-background border-l shadow-xl"
      style={{ width: "65%", zIndex: 20, borderColor: "var(--color-border)" }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-6 py-3 border-b"
        style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
      >
        <div className="flex items-center justify-center rounded-full" style={{ width: 24, height: 24, background: "var(--color-muted)" }}>
          <Icon size={12} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.05em" }}>
            {entity.type}
          </p>
          <p className="truncate" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-foreground)" }}>
            {entity.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body - placeholder */}
      <div className="flex-1 overflow-y-auto p-5 flex items-center justify-center">
        <div
          className="rounded-lg border-2 p-12 text-center"
          style={{ borderColor: "#ec4899", borderStyle: "dashed", maxWidth: 400 }}
        >
          <p className="text-muted-foreground" style={{ fontSize: "12px", lineHeight: 1.6 }}>
            Entity detail panel placeholder
          </p>
          <p className="text-muted-foreground mt-2" style={{ fontSize: "10px", lineHeight: 1.6 }}>
            This will show detailed information about the {entity.type}: <strong>{entity.name}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Share button ────────────────────────────────────────────────────────────

function ShareButton({ ruleId, findingId }: { ruleId: string; findingId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/risk?policy=${encodeURIComponent(ruleId)}&finding=${encodeURIComponent(findingId)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 border transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        style={{ fontSize: "11px", borderColor: "var(--color-border)" }}
      >
        <Link size={11} />
        Share
      </button>
      {copied && (
        <div
          className="absolute top-full right-0 mt-1.5 rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-md"
          style={{
            fontSize: "10px", fontWeight: 500,
            background: "var(--color-foreground)",
            color: "var(--color-background)",
          }}
        >
          Link copied to clipboard
        </div>
      )}
    </div>
  );
}

// ── Finding Detail View (State B — right column) ──────────────────────────────

function FindingDetailView({
  finding, rule, onBack, onFindingClosed, onFindingRescanned,
}: {
  finding: MockFinding;
  rule: RiskRule;
  onBack: () => void;
  onFindingClosed?: (id: string) => void;
  onFindingRescanned?: (id: string) => void;
}) {
  const riskType = RISK_TYPES.find(rt => rt.rules.some(r => r.id === rule.id));
  const dataTypes = extractDetectedDataTypes(finding);

  // Entity panel stack state
  const [entityPanelStack, setEntityPanelStack] = useState<EntityPanelData[]>([]);

  const openEntityPanel = (entity: EntityPanelData) => {
    setEntityPanelStack(prev => [...prev, entity]);
  };

  const closeTopEntityPanel = () => {
    setEntityPanelStack(prev => prev.slice(0, -1));
  };

  // More Actions dropdown state
  const [showMoreActions, setShowMoreActions] = useState(false);
  const moreActionsRef = useRef<HTMLButtonElement>(null);

  // Direct config action (from recommended action chip click)
  const [directActionId, setDirectActionId] = useState<string | null>(null);

  // Close single finding modal state
  const [showCloseSingleFinding, setShowCloseSingleFinding] = useState(false);
  const [closeSingleConfirmed, setCloseSingleConfirmed] = useState(false);

  // Rescan single finding modal state
  const [showRescanSingle, setShowRescanSingle] = useState(false);

  // Detail panel state
  const [showFilePanel, setShowFilePanel] = useState(false);
  const [showStorePanel, setShowStorePanel] = useState(false);

  // Extract topology nodes
  const fileNode = finding.topology.nodes.find(n => n.type === "file");
  const storeNode = finding.topology.nodes.find(n => n.type === "store");
  const identityNode = finding.topology.nodes.find(n => n.type === "identity");
  const configNode = finding.topology.nodes.find(n => n.type === "config");

  // Build mock SaaS data store row for the inventory panel
  const mockStoreRow = useMemo((): SaaSUnstructuredDataRow => ({
    id: storeNode?.label ?? finding.id,
    name: storeNode?.label ?? "Unknown Store",
    nameSubtitle: storeNode?.sublabel,
    appInstance: storeNode?.sublabel?.split("·").pop()?.trim() ?? "",
    sensitiveFiles: 150,
    sampledFiles: 311,
    totalFiles: 381,
    dataTypes,
    uploadSparkData: [12, 8, 15, 10, 6, 14, 9],
    downloadSparkData: [5, 3, 7, 4, 2, 6, 3],
  }), [finding.id]);

  return (
    <div
      className="fixed top-0 bottom-0 right-0 flex flex-col bg-background border-l shadow-xl"
      style={{ width: "65%", zIndex: 60, borderColor: "var(--color-border)" }}
    >
      {/* Sub-header */}
      <div
        className="shrink-0 flex items-center gap-3 px-6 py-3 border-b"
        style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
      >
        <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Detected {finding.detectedAt}</span>

        {/* Per-finding actions */}
        <div className="ml-auto flex items-center gap-2">
          <ShareButton ruleId={rule.id} findingId={finding.id} />
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable detail body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Finding title */}
        <div className="pb-2">
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-foreground)" }}>
            {fileNode?.label ?? storeNode?.label ?? "Finding Details"}
          </h3>
          <p className="text-muted-foreground" style={{ fontSize: "11px", marginTop: 2 }}>
            {identityNode?.label ?? storeNode?.sublabel ?? ""}
          </p>
        </div>

        {/* Recommended Actions — SaaS managed only, top action only */}
        {finding.topology.nodes.every(n => n.type !== 'destination') && getDataStoreTier(finding) === 'SaaS' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em" }}>
                Recommended Actions
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  ref={moreActionsRef}
                  onClick={() => setShowMoreActions(v => !v)}
                  className="px-2.5 py-1 rounded border transition-colors hover:bg-muted"
                  style={{
                    fontSize: "10px", fontWeight: 600,
                    borderColor: showMoreActions ? "var(--color-primary)" : "var(--color-border)",
                    color: showMoreActions ? "var(--color-primary)" : "var(--color-foreground)",
                    background: showMoreActions ? "color-mix(in srgb, var(--color-primary) 8%, transparent)" : "transparent",
                  }}
                >
                  More Actions
                </button>
                {showMoreActions && (
                  <BulkActionDropdown
                    mode="single"
                    selectedCount={1}
                    anchorRef={moreActionsRef}
                    onCloseFinding={() => { setShowMoreActions(false); setShowCloseSingleFinding(true); }}
                    onDismiss={() => setShowMoreActions(false)}
                    onRescan={() => { setShowMoreActions(false); setShowRescanSingle(true); }}
                    onActionApplied={() => { setShowMoreActions(false); onFindingRescanned?.(finding.id); }}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {finding.action.slice(0, 1).map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
                >
                  <Shield size={13} className="shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
                  <p style={{ fontSize: "11px", lineHeight: 1.5, color: "var(--color-foreground)", flex: 1 }}>
                    {act.text}
                  </p>
                  {act.remediationAction && (
                    <button
                      onClick={() => setDirectActionId(act.remediationAction!)}
                      className="shrink-0 flex items-center gap-1 rounded px-2 py-1 transition-colors hover:opacity-80 whitespace-nowrap"
                      style={{ fontSize: "9px", fontWeight: 700, background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
                    >
                      <Sparkles size={9} />
                      {REMEDIATION_ACTION_LABELS[act.remediationAction] ?? act.remediationAction}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Details ── */}
        <div>
          <p className="text-muted-foreground mb-3" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em" }}>
            Details
          </p>

          {/* View File Details button */}
          {fileNode && (
            <button
              onClick={() => setShowFilePanel(true)}
              className="flex items-center gap-2.5 w-full py-2.5 px-4 rounded-lg transition-colors hover:bg-muted/60"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-background)", marginBottom: 8 }}
            >
              <FileText size={15} style={{ color: "var(--color-foreground)" }} />
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-foreground)" }}>
                View File Details
              </span>
            </button>
          )}

          {/* View Data Store Details button */}
          {storeNode && (
            <button
              onClick={() => setShowStorePanel(true)}
              className="flex items-center gap-2.5 w-full py-2.5 px-4 rounded-lg transition-colors hover:bg-muted/60"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-background)" }}
            >
              <Database size={15} style={{ color: "var(--color-foreground)" }} />
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-foreground)" }}>
                View Data Store Details
              </span>
            </button>
          )}
        </div>

      </div>

      {/* ── Direct Action Config Modal (from recommended action chip) ─────────── */}
      {directActionId && (() => {
        const DirectPanel = BULK_CONFIG_COMPONENTS[directActionId] ?? null;
        const allActions = Object.values(CORE_REMEDIATION_ACTIONS).flat();
        const actionMeta = allActions.find(a => a.id === directActionId);
        return DirectPanel ? (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 200, background: "rgba(0,0,0,0.5)" }}
            onClick={() => setDirectActionId(null)}
          >
            <div
              className="bg-card border border-border rounded-lg shadow-xl flex flex-col"
              style={{ width: 480, maxHeight: "80vh" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600 }}>{actionMeta?.label ?? directActionId}</h3>
                  <p className="text-muted-foreground" style={{ fontSize: "11px", marginTop: 2 }}>Applying to this finding</p>
                </div>
                <button
                  onClick={() => setDirectActionId(null)}
                  className="rounded p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <DirectPanel onApply={() => setDirectActionId(null)} onCancel={() => setDirectActionId(null)} />
              </div>
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--color-border)" }}>
                <button
                  onClick={() => setDirectActionId(null)}
                  className="px-4 py-2 rounded border transition-colors hover:bg-muted"
                  style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setDirectActionId(null)}
                  className="px-4 py-2 rounded transition-colors hover:opacity-90"
                  style={{ fontSize: "12px", fontWeight: 600, background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* ── Close Single Finding Modal ─────────────────────────────────────────── */}
      {showCloseSingleFinding && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 200, background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowCloseSingleFinding(false)}
        >
          <div
            className="bg-card rounded-lg p-6"
            style={{ width: 480, position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCloseSingleFinding(false)}
              className="absolute top-4 right-4 flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Close"
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: 16 }}>Close Finding</h3>

            {/* Finding summary card */}
            <div
              className="rounded-lg border px-3 py-2.5 mb-4"
              style={{ borderColor: "var(--color-border)", background: "var(--color-muted)" }}
            >
              <p style={{ fontSize: "12px", fontWeight: 600, marginBottom: 2 }}>
                {finding.topology?.nodes?.find((n: any) => n.type === "store")?.label ?? "This finding"}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.5 }}>
                {finding.matchedCondition}
              </p>
            </div>

            <p className="text-muted-foreground" style={{ fontSize: "12px", lineHeight: 1.6, marginBottom: 16 }}>
              This will close only this finding. The action cannot be undone.
            </p>

            {/* Confirmation checkbox */}
            <label
              className="flex items-start gap-2 p-2.5 rounded border cursor-pointer mb-4"
              style={{ fontSize: "11px", background: "rgba(239,68,68,0.08)", borderColor: "#ef4444" }}
            >
              <input
                type="checkbox"
                checked={closeSingleConfirmed}
                onChange={e => setCloseSingleConfirmed(e.target.checked)}
                style={{ width: 13, height: 13, marginTop: 2, cursor: "pointer" }}
              />
              <span style={{ lineHeight: 1.5 }}>I confirm I want to close this finding</span>
            </label>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCloseSingleFinding(false)}
                className="px-4 py-2 rounded border"
                style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCloseSingleFinding(false);
                  onFindingClosed?.(finding.id);
                }}
                disabled={!closeSingleConfirmed}
                className="px-4 py-2 rounded"
                style={{
                  fontSize: "12px",
                  background: closeSingleConfirmed ? "#ef4444" : "var(--color-muted)",
                  color: closeSingleConfirmed ? "white" : "var(--color-muted-foreground)",
                  cursor: closeSingleConfirmed ? "pointer" : "not-allowed",
                }}
              >
                Close Finding
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── Rescan single finding modal ─────────────────────────────────────────── */}
      {showRescanSingle && (
        <RescanModal
          findings={[finding]}
          onConfirm={() => {
            setShowRescanSingle(false);
            onFindingRescanned?.(finding.id);
          }}
          onClose={() => setShowRescanSingle(false)}
        />
      )}

      {/* ── Entity Panel Stack ──────────────────────────────────────────────────── */}
      {entityPanelStack.map((entity, idx) => {
        const isTop = idx === entityPanelStack.length - 1;
        const leftOffset = idx === entityPanelStack.length - 1 ? 0 : `calc(${idx} * 8px)`;
        const pointerEvents = isTop ? "auto" : "none";

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: leftOffset,
              right: 0,
              pointerEvents,
            }}
          >
            <EntitySidePanel
              entity={entity}
              onClose={closeTopEntityPanel}
            />
          </div>
        );
      })}

      {/* ── File Details Side Panel (inventory) ── */}
      {showFilePanel && fileNode && (
        <SidePanel
          open
          onClose={() => setShowFilePanel(false)}
          onBack={() => setShowFilePanel(false)}
          title={fileNode.label}
          subtitle={`/${storeNode?.label ?? ""}/${fileNode.label}`}
          width="min(840px, 90vw)"
          zIndex={70}
          hideBackdrop
          stacked
          panelType="file"
          headerActions={<FileActionsMenu />}
          headerExtra={
            <SensitiveFileHeaderExtra
              name={fileNode.label}
              store={storeNode?.label ?? ""}
              storeSource={storeNode?.sublabel?.split("·")[0]?.trim() ?? ""}
              size={`${((fileNode.label.length * 17 + 42) % 900 + 100)} KB`}
            />
          }
        >
          <SensitiveFileDetailPane
            name={fileNode.label}
            path={`/${storeNode?.label ?? ""}/${fileNode.label}`}
            store={storeNode?.label ?? ""}
            storeSource={storeNode?.sublabel?.split("·")[0]?.trim() ?? ""}
            size={`${((fileNode.label.length * 17 + 42) % 900 + 100)} KB`}
            lastModified={finding.detectedAt}
            dataTypes={dataTypes}
            saasMode
          />
        </SidePanel>
      )}

      {/* ── Data Store Details Side Panel (inventory) ── */}
      {showStorePanel && storeNode && (
        <SidePanel
          open
          onClose={() => setShowStorePanel(false)}
          onBack={() => setShowStorePanel(false)}
          title={storeNode.label}
          subtitle={storeNode.sublabel}
          titleIcon={<Database size={20} className="text-muted-foreground" />}
          width="min(960px, 95vw)"
          zIndex={70}
          hideBackdrop
          stacked
        >
          <SaaSRowPanelContent row={mockStoreRow} />
        </SidePanel>
      )}
    </div>
  );
}

// ── Bulk Action Dropdown ──────────────────────────────────────────────────────

// Config panel map — mirrors the per-finding All Actions modal
const BULK_CONFIG_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "apply-sensitivity-label": ApplySensitivityLabelConfig,
  "quarantine":              QuarantineConfig,
  "delete":                  DeleteConfig,
  "apply-dlp":               ApplyDLPConfig,
  "restrict-access":         RestrictAccessConfig,
  "revoke-public":           RevokePublicSharingConfig,
  "revoke-external":         RevokeExternalSharingConfig,
  "revoke-company":          RevokeCompanySharingConfig,
  "change-ownership":        ChangeOwnershipConfig,
  "notify-owner":            NotifyOwnerConfig,
  "request-justification":   RequestJustificationConfig,
  "legal-hold":              LegalHoldConfig,
  "perform-targeted-scan":   PerformTargetedScanConfig,
};

function BulkActionDropdown({
  selectedCount,
  selectedFindings = [],
  allSelected = false,
  anchorRef,
  onCloseFinding,
  onDismiss,
  mode = "bulk",
  onRescan,
  onActionApplied,
}: {
  selectedCount: number;
  selectedFindings?: MockFinding[];
  allSelected?: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onCloseFinding: () => void;
  onDismiss: () => void;
  /** 'bulk' = requires finding selection; 'single' = always enabled, per-finding context */
  mode?: "bulk" | "single";
  /** Called when user clicks the manual "Rescan" action */
  onRescan?: () => void;
  /** Called after a remediation action's config is applied (for auto-Rescan status) */
  onActionApplied?: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<string | null>(null);

  // Measure anchor on mount and keep current on scroll/resize
  useEffect(() => {
    const measure = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorRef]);

  // In single mode actions are always enabled; bulk mode requires ≥1 selection
  const disabled = mode === "single" ? false : selectedCount === 0;

  // ── Viewport-aware positioning ────────────────────────────────────────────
  const dropdownWidth = 300;
  const MARGIN = 8;

  // Horizontal: right-align to anchor, clamped so we never overflow either edge
  const rawLeft = rect ? rect.right - dropdownWidth : 0;
  const left = rect
    ? Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - dropdownWidth - MARGIN))
    : 0;

  // Vertical: prefer below the anchor; flip above when there isn't enough room
  const spaceBelow = rect ? window.innerHeight - rect.bottom - 6 - MARGIN : 400;
  const spaceAbove = rect ? rect.top - 6 - MARGIN : 400;
  const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
  const top    = preferBelow && rect ? rect.bottom + 6 : undefined;
  const bottom = !preferBelow && rect ? window.innerHeight - rect.top + 6 : undefined;
  const maxHeight = Math.min(
    preferBelow ? spaceBelow : spaceAbove,
    window.innerHeight * 0.8,
  );
  // ─────────────────────────────────────────────────────────────────────────

  const allActions = Object.values(CORE_REMEDIATION_ACTIONS).flat();
  const activeAction = activeConfig ? allActions.find(a => a.id === activeConfig) : null;
  const ActiveConfigPanel = activeConfig ? BULK_CONFIG_COMPONENTS[activeConfig] ?? null : null;

  return createPortal(
    <>
      {/* ── Dropdown panel ── */}
      <div
        className="bg-card border border-border rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{ position: "fixed", top, bottom, left, width: dropdownWidth, maxHeight, zIndex: 9999 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
            {mode === "single"
              ? "Actions for this finding"
              : disabled
                ? "Select one or more findings to enable actions"
                : `Apply to ${selectedCount} selected finding${selectedCount !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={onDismiss}
            className="flex items-center justify-center rounded p-1 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Dismiss"
            aria-label="Dismiss"
            style={{ marginLeft: 8 }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Action list — single select, no checkboxes */}
        <div className="overflow-y-auto flex-1 py-1.5">
          {/* ── Management section (always first) with Rescan + Close Finding prepended ── */}
          <div key="Management">
            <p style={{
              fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.06em", color: "var(--color-muted-foreground)",
              padding: "8px 16px 4px",
            }}>
              Management
            </p>
            {/* Management actions */}
            {(CORE_REMEDIATION_ACTIONS["Management"] ?? []).map(action => {
              const isActive  = activeConfig === action.id;
              const isHovered = hoveredId === action.id;
              let bg = "transparent";
              if (isActive)                    bg = "color-mix(in srgb, var(--color-primary) 10%, transparent)";
              else if (isHovered && !disabled) bg = "var(--color-muted)";
              return (
                <button
                  key={action.id}
                  disabled={disabled}
                  onClick={() => setActiveConfig(action.id)}
                  onMouseEnter={() => setHoveredId(action.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="w-full flex items-center px-6 py-2 text-left transition-colors"
                  style={{ background: bg, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1 }}
                >
                  <span style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}>{action.label}</span>
                </button>
              );
            })}
          </div>
          {/* ── All other categories ── */}
          {Object.entries(CORE_REMEDIATION_ACTIONS)
            .filter(([category]) => category !== "Management")
            .map(([category, actions]) => (
            <div key={category}>
              <p style={{
                fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.06em", color: "var(--color-muted-foreground)",
                padding: "8px 16px 4px",
              }}>
                {category}
              </p>
              {actions.map(action => {
                const isActive  = activeConfig === action.id;
                const isHovered = hoveredId === action.id;
                let bg = "transparent";
                if (isActive)                    bg = "color-mix(in srgb, var(--color-primary) 10%, transparent)";
                else if (isHovered && !disabled) bg = "var(--color-muted)";
                return (
                  <button
                    key={action.id}
                    disabled={disabled}
                    onClick={() => setActiveConfig(action.id)}
                    onMouseEnter={() => setHoveredId(action.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="w-full flex items-center px-6 py-2 text-left transition-colors"
                    style={{
                      background: bg,
                      cursor: disabled ? "default" : "pointer",
                      opacity: disabled ? 0.38 : 1,
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Config modal — opens when an action is clicked ── */}
      {activeConfig && ActiveConfigPanel && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 10000, background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setActiveConfig(null); }}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-xl flex flex-col"
            style={{ width: 480, maxHeight: "80vh" }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 600 }}>{activeAction?.label}</h3>
                {(() => {
                  if (selectedFindings.length === 0 || !activeConfig) {
                    return (
                      <p className="text-muted-foreground" style={{ fontSize: "11px", marginTop: 2 }}>
                        Applying to {selectedCount} finding{selectedCount !== 1 ? "s" : ""}
                      </p>
                    );
                  }
                  const applicableCount = selectedFindings.filter(f =>
                    f.action.some(a => a.remediationAction === activeConfig)
                  ).length;
                  // [TEST ONLY] Show warning when >5 findings selected and action is quarantine.
                  // Real logic should check allSelected once select-all + API are implemented.
                  // applicableCount is reduced by 1 to ensure the warning condition triggers.
                  const showWarning = activeConfig === 'quarantine' && selectedCount > 5
                    ? true
                    : (allSelected && applicableCount < selectedFindings.length);

                  if (!showWarning) {
                    return (
                      <p className="text-muted-foreground" style={{ fontSize: "11px", marginTop: 2 }}>
                        Applying to {selectedCount} finding{selectedCount !== 1 ? "s" : ""}
                      </p>
                    );
                  }
                  // [TEST ONLY] Subtract 1 from applicableCount to demonstrate partial applicability warning.
                  const displayCount = activeConfig === 'quarantine' && selectedCount > 5
                    ? Math.max(1, applicableCount - 1)
                    : applicableCount;
                  return (
                    <p className="text-muted-foreground" style={{ fontSize: "11px", marginTop: 2, lineHeight: 1.5 }}>
                      This action is not supported for all the selected resources.{" "}
                      Applying to {displayCount} of {selectedFindings.length} selected findings.
                    </p>
                  );
                })()}
              </div>
              <button
                onClick={() => setActiveConfig(null)}
                className="rounded p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Config panel body */}
            <div className="flex-1 overflow-y-auto p-5">
              <ActiveConfigPanel
                onApply={() => setActiveConfig(null)}
                onCancel={() => setActiveConfig(null)}
              />
            </div>

            {/* Modal footer */}
            <div
              className="flex items-center justify-end gap-3 px-5 py-4 border-t shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <button
                onClick={() => setActiveConfig(null)}
                className="px-4 py-2 rounded border transition-colors hover:bg-muted"
                style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setActiveConfig(null); onActionApplied?.(); }}
                className="px-4 py-2 rounded transition-colors hover:opacity-90"
                style={{ fontSize: "12px", fontWeight: 600, background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
              >
                {(() => {
                  if (selectedFindings.length === 0 || !activeConfig) return `Apply to ${selectedCount} finding${selectedCount !== 1 ? "s" : ""}`;
                  // [TEST ONLY] Show reduced count when >5 selected + quarantine, or when allSelected.
                  const showReduced = (activeConfig === 'quarantine' && selectedCount > 5) || allSelected;
                  if (!showReduced) return `Apply to ${selectedCount} finding${selectedCount !== 1 ? "s" : ""}`;
                  const applicableCount = selectedFindings.filter(f =>
                    f.action.some(a => a.remediationAction === activeConfig)
                  ).length;
                  const displayCount = activeConfig === 'quarantine' && selectedCount > 5
                    ? Math.max(1, applicableCount - 1)
                    : applicableCount;
                  return `Apply to ${displayCount} finding${displayCount !== 1 ? "s" : ""}`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

// ── Findings List View (State A — right column) ───────────────────────────────

const PAGE_SIZE = 25;

function FindingsListView({
  filteredFindings, allFindings, chips, selectedFinding, onSelectFinding, onAddChip, onRemoveChip,
  sortField, sortDirection, onSortChange, searchText, searchExpanded, searchInputRef,
  onSearchTextChange, onSearchClick, onSearchBlur, onSearchClear,
  bulkMode, selectedFindingIds, onToggleFindingId, onToggleSelectAll,
  effectiveStatuses, mainEntityType,
}: {
  filteredFindings: MockFinding[];
  allFindings: MockFinding[];
  chips: FilterChip[];
  selectedFinding: MockFinding | null;
  onSelectFinding: (f: MockFinding) => void;
  onAddChip: (chip: Omit<FilterChip, "id">) => void;
  onRemoveChip: (id: string) => void;
  sortField: SortField;
  sortDirection: "asc" | "desc";
  onSortChange: (field: SortField) => void;
  searchText: string;
  searchExpanded: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onSearchTextChange: (text: string) => void;
  onSearchClick: () => void;
  onSearchBlur: () => void;
  onSearchClear: () => void;
  bulkMode: boolean;
  selectedFindingIds: Set<string>;
  onToggleFindingId: (id: string) => void;
  onToggleSelectAll: () => void;
  effectiveStatuses: Map<string, FindingStatus>;
  mainEntityType?: MainEntityType;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#F9FAFC" }}>
      {/* Filter chips bar */}
      <FilterChipsBar
        chips={chips}
        allFindings={allFindings}
        onRemoveChip={onRemoveChip}
        onAddChip={onAddChip}
      />

      {/* Cards with lazy loading */}
      <FindingsScrollList
        filteredFindings={filteredFindings}
        selectedFinding={selectedFinding}
        onSelectFinding={onSelectFinding}
        bulkMode={bulkMode}
        selectedFindingIds={selectedFindingIds}
        onToggleFindingId={onToggleFindingId}
        onToggleSelectAll={onToggleSelectAll}
        effectiveStatuses={effectiveStatuses}
        chips={chips}
        onRemoveChip={onRemoveChip}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        searchText={searchText}
        searchExpanded={searchExpanded}
        searchInputRef={searchInputRef}
        onSearchTextChange={onSearchTextChange}
        onSearchClick={onSearchClick}
        onSearchBlur={onSearchBlur}
        onSearchClear={onSearchClear}
        mainEntityType={mainEntityType}
      />
    </div>
  );
}

// Extracted scroll container with lazy loading
function FindingsScrollList({
  filteredFindings, selectedFinding, onSelectFinding,
  bulkMode, selectedFindingIds, onToggleFindingId, onToggleSelectAll, effectiveStatuses,
  chips, onRemoveChip, sortField, sortDirection, onSortChange,
  searchText, searchExpanded, searchInputRef, onSearchTextChange, onSearchClick, onSearchBlur, onSearchClear,
  mainEntityType,
}: {
  filteredFindings: MockFinding[];
  selectedFinding: MockFinding | null;
  onSelectFinding: (f: MockFinding) => void;
  bulkMode: boolean;
  selectedFindingIds: Set<string>;
  onToggleFindingId: (id: string) => void;
  onToggleSelectAll: () => void;
  effectiveStatuses: Map<string, FindingStatus>;
  chips: FilterChip[];
  onRemoveChip: (id: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string) => void;
  searchText: string;
  searchExpanded: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchTextChange: (v: string) => void;
  onSearchClick: () => void;
  onSearchBlur: () => void;
  onSearchClear: () => void;
  mainEntityType?: MainEntityType;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when findings change (filter/sort)
  useEffect(() => { setVisibleCount(PAGE_SIZE); setIsLoadingMore(false); }, [filteredFindings]);

  // IntersectionObserver for infinite scroll with 2s simulated delay
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoadingMore) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, filteredFindings.length));
          setIsLoadingMore(false);
        }, 2000);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredFindings.length, isLoadingMore]);

  const visibleFindings = filteredFindings.slice(0, visibleCount);

  return (
      <div className="flex-1 overflow-y-scroll pt-4 px-6 pb-4 flex flex-col gap-1.5" style={{ background: "#F9FAFC" }}>
        {/* Count bar with Sort and Search */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span style={{ fontSize: "11px", fontWeight: 600 }}>
            {filteredFindings.length} finding{filteredFindings.length !== 1 ? "s" : ""}
          </span>
          {chips.length > 0 && (
            <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
              matching {chips.length} filter{chips.length !== 1 ? "s" : ""}
            </span>
          )}
          {bulkMode && selectedFindingIds.size > 0 && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ fontSize: "10px", fontWeight: 600, background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
            >
              {selectedFindingIds.size} selected
            </span>
          )}
          
          {/* Sort and Search controls */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Sort Dropdown */}
            <SortDropdown
              currentField={sortField}
              currentDirection={sortDirection}
              onSortChange={onSortChange}
            />
            
            {/* Search */}
            {searchExpanded ? (
              <div className="relative flex items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => onSearchTextChange(e.target.value)}
                  onBlur={onSearchBlur}
                  placeholder="Search"
                  className="px-3 py-1.5 pr-7 rounded-md border outline-none transition-all"
                  style={{
                    width: "180px",
                    fontSize: "12px",
                    background: "#f1f5f9",
                    borderColor: "rgba(0,0,0,0.1)",
                    color: "#1e293b",
                  }}
                />
                {searchText && (
                  <button
                    onClick={onSearchClear}
                    className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onSearchClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-muted"
                style={{
                  fontSize: "12px",
                  background: "#f1f5f9",
                  borderColor: "rgba(0,0,0,0.1)",
                  color: "#64748b",
                }}
              >
                <svg className="shrink-0" width="13" height="13" fill="none" viewBox="0 0 13 13">
                  <path d={svgPaths.p257f19f0} stroke="#64748B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                  <path d={svgPaths.p1eadf2b0} stroke="#64748B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                </svg>
                <span>Search</span>
              </button>
            )}
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
            <CheckCircle2 size={28} className="text-muted-foreground opacity-40" />
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              No findings match the current filters.
            </p>
            {chips.length > 0 && (
              <button
                onClick={() => chips.forEach(c => onRemoveChip(c.id))}
                className="text-primary hover:opacity-80 transition-opacity"
                style={{ fontSize: "11px" }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {visibleFindings.map((f, index) => (
              <FindingCard
                key={f.id}
                finding={f}
                selected={selectedFinding?.id === f.id}
                onClick={() => onSelectFinding(f)}
                index={index}
                bulkMode={bulkMode}
                checked={selectedFindingIds.has(f.id)}
                onCheck={onToggleFindingId}
                effectiveStatus={effectiveStatuses.get(f.id) ?? f.status}
                mainEntityType={mainEntityType}
              />
            ))}
            {visibleCount < filteredFindings.length && (
              <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                    <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
                      Loading more findings…
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)" }}>
                    Showing {visibleCount} of {filteredFindings.length} findings
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
  );
}

// ── Close Findings Modal ──────────────────────────────────────────────────────

function CloseFindingModal({
  findings,
  chips,
  totalCount,
  allFindingIds,
  onClose,
  onConfirm,
}: {
  findings: MockFinding[];
  chips: FilterChip[];
  totalCount: number;
  allFindingIds: string[];
  onClose: () => void;
  onConfirm: (idsToClose: string[]) => void;
}) {
  const hasFilters = chips.length > 0;
  const [mode, setMode] = useState<"all" | "filtered">("all");
  const [confirmed, setConfirmed] = useState(false);

  const closeCount = mode === "all" ? totalCount : findings.length;
  const canConfirm = confirmed;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 100, background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="bg-card rounded-lg p-6" style={{ width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", position: "relative" }} onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Close"
        >
          <X size={16} />
        </button>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: 16 }}>Close Findings</h3>

        {/* Radio 1 — close all */}
        <label
          className="flex items-start gap-3 p-3 rounded-lg border mb-3 cursor-pointer hover:bg-muted transition-colors"
          style={{ borderColor: "var(--color-border)", background: mode === "all" ? "var(--color-muted)" : "transparent" }}
        >
          <input type="radio" name="closeMode" checked={mode === "all"} onChange={() => setMode("all")} style={{ width: 14, height: 14, marginTop: 2, cursor: "pointer" }} />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: 3 }}>
              Close all {totalCount} finding{totalCount !== 1 ? "s" : ""} for this rule
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.5 }}>
              All findings for this rule will be closed, regardless of any active filters
            </p>
          </div>
        </label>

        {/* Radio 2 — close filtered set */}
        <label
          className={`flex items-start gap-3 p-3 rounded-lg border mb-3 transition-colors ${hasFilters ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed"}`}
          style={{
            borderColor: "var(--color-border)",
            background: mode === "filtered" ? "var(--color-muted)" : "transparent",
            opacity: hasFilters ? 1 : 0.45,
          }}
          onClick={e => { if (!hasFilters) e.preventDefault(); }}
        >
          <input
            type="radio"
            name="closeMode"
            checked={mode === "filtered"}
            onChange={() => { if (hasFilters) setMode("filtered"); }}
            disabled={!hasFilters}
            style={{ width: 14, height: 14, marginTop: 2, cursor: hasFilters ? "pointer" : "not-allowed" }}
          />
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: 3 }}>
              Close {findings.length} finding{findings.length !== 1 ? "s" : ""} matching current filters
            </p>
            {hasFilters ? (
              <>
                <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.5, marginBottom: 8 }}>
                  Only findings matching all active filters below will be closed
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map(chip => (
                    <span
                      key={chip.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: "10px",
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(59,130,246,0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59,130,246,0.3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.5 }}>
                Add filters above to enable this option
              </p>
            )}
          </div>
        </label>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 mt-2 p-2.5 rounded border cursor-pointer" style={{ fontSize: "11px", background: "rgba(239,68,68,0.08)", borderColor: "#ef4444" }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 13, height: 13, marginTop: 2, cursor: "pointer" }} />
          <span style={{ lineHeight: 1.5 }}>Confirm that {closeCount} finding{closeCount !== 1 ? "s" : ""} will be closed</span>
        </label>

        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded border" style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>Cancel</button>
          <button
            onClick={() => {
              if (!canConfirm) return;
              const idsToClose = mode === "all" ? allFindingIds : findings.map(f => f.id);
              onConfirm(idsToClose);
            }}
            disabled={!canConfirm}
            className="px-4 py-2 rounded"
            style={{ fontSize: "12px", background: canConfirm ? "#ef4444" : "var(--color-muted)", color: canConfirm ? "white" : "var(--color-muted-foreground)", cursor: canConfirm ? "pointer" : "not-allowed" }}
          >
            Close {closeCount} Finding{closeCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sort Dropdown Component ───────────────────────────────────────────────────

type SortField = "timestamp" | "severity" | "dataStore" | "sensitiveRecords";

interface SortDropdownProps {
  currentField: SortField;
  currentDirection: "asc" | "desc";
  onSortChange: (field: SortField) => void;
}

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "timestamp", label: "Timestamp" },
  { value: "severity", label: "Severity" },
  { value: "dataStore", label: "Data Store" },
  { value: "sensitiveRecords", label: "Sensitive Records" },
];

function SortDropdown({ currentField, currentDirection, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = SORT_OPTIONS.find(opt => opt.value === currentField)?.label || "Sort by";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-muted"
        style={{
          fontSize: "12px",
          background: "#f1f5f9",
          borderColor: "rgba(0,0,0,0.1)",
          color: "#64748b",
        }}
      >
        <span>Sort by</span>
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 rounded-lg border overflow-hidden"
          style={{
            minWidth: "210px",
            background: "#f1f5f9",
            borderColor: "rgba(0,0,0,0.1)",
            boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
            zIndex: 100,
          }}
        >
          {SORT_OPTIONS.map((option) => {
            const isActive = currentField === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left transition-colors hover:bg-white/50 flex items-center justify-between"
                style={{
                  fontSize: "12px",
                  color: "#1e293b",
                  background: isActive ? "rgba(255,255,255,0.3)" : "transparent",
                }}
              >
                <span>{option.label}</span>
                {isActive && (
                  <span style={{ fontSize: "10px", color: "#64748b" }}>
                    {currentDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface RulePageProps {
  rule: RiskRule;
  filter?: FindingFilter;
  onClose: () => void;
}

export function PolicyPage({ rule, filter, onClose }: RulePageProps) {
  const navigate = useNavigate();
  const { isRuleFullyDisabled, getDisabledRule, disableRuleFull } = useDisabledRules();
  const { setFindingStatus, setFindingsStatus, version } = useFindingStatusStore();

  // All raw findings (never Closed) — re-derived whenever status overrides change
  const allFindings = useMemo(
    () => getFindingsForRuleFiltered(rule.id, filter)
            .filter(f => getEffectiveStatus(f.id, f.status) !== "Closed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rule.id, filter, version]
  );

  // Effective status map for all raw findings (for badge display + filtering)
  const effectiveStatuses = useMemo<Map<string, FindingStatus>>(
    () => {
      const m = new Map<string, FindingStatus>();
      getFindingsForRuleFiltered(rule.id, filter).forEach(f =>
        m.set(f.id, getEffectiveStatus(f.id, f.status) as FindingStatus)
      );
      return m;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rule.id, filter, version]
  );

  const riskType = useMemo(() => RISK_TYPES.find(rt => rt.rules.some(r => r.id === rule.id)), [rule.id]);

  const [searchParams, setSearchParams] = useSearchParams();

  const [chips, setChips] = useState<FilterChip[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<MockFinding | null>(() => {
    const findingId = searchParams.get("finding");
    if (!findingId) return null;
    return allFindings.find(f => f.id === findingId) ?? null;
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set());
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);
  const [showCloseFinding, setShowCloseFinding] = useState(false);
  const [showDisableRule, setShowDisableRule] = useState(false);
  const [showPoliciesAndMore, setShowPoliciesAndMore] = useState(false);
  const [policiesDropdownOpen, setPoliciesDropdownOpen] = useState(false);
  const policiesDropdownRef = useRef<HTMLDivElement>(null);
  // "saas" = full Policies & More modal, "iaas" = simple Recommendation modal
  const [policiesModalVariant, setPoliciesModalVariant] = useState<"saas" | "iaas">("saas");

  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (selectedFinding) {
        next.set("finding", selectedFinding.id);
      } else {
        next.delete("finding");
      }
      return next;
    }, { replace: true });
  }, [selectedFinding, setSearchParams]);

  const isStaticOnly = !!rule.recommendedIaaSPolicy
    && !rule.recommendedRetroScan
    && !rule.recommendedOngoingDARPolicy
    && !rule.recommendedOngoingDIMPolicy;
  const isHybrid = rule.policyEngine === "DSPM + CASB API";

  const HYBRID_SAAS_APPS = new Set([
    "Google Drive", "SharePoint", "OneDrive", "Dropbox", "Box",
    "Slack", "Teams", "Microsoft Teams", "Salesforce", "ChatGPT",
    "Workday", "Zoom", "ServiceNow", "GitHub", "Jira", "Confluence",
  ]);
  const saasFindingCount = isHybrid ? allFindings.filter(f =>
    f.topology.nodes.some(n => {
      if (n.type !== "store") return false;
      const app = n.sublabel.split("·")[0]?.trim() ?? "";
      return HYBRID_SAAS_APPS.has(app);
    })
  ).length : 0;
  const iaasFindingCount = isHybrid ? allFindings.filter(f =>
    f.topology.nodes.some(n => {
      if (n.type !== "store") return false;
      const app = n.sublabel.split("·")[0]?.trim() ?? "";
      return !HYBRID_SAAS_APPS.has(app);
    })
  ).length : 0;

  useEffect(() => {
    if (!policiesDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (!policiesDropdownRef.current?.contains(e.target as Node)) {
        setPoliciesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [policiesDropdownOpen]);

  // Rescan modal state (bulk / header level)
  const [showRescanModal, setShowRescanModal] = useState(false);
  const [rescanTargetIds, setRescanTargetIds] = useState<Set<string>>(new Set());

  // Sort and Search state
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchText, setSearchText] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Charts panel drag-to-resize
  const [chartsPanelWidthPct, setChartsPanelWidthPct] = useState(20);
  const chartsPanelDragRef = useRef<{ startX: number; startPct: number; containerW: number } | null>(null);
  const chartsPanelContainerRef = useRef<HTMLDivElement>(null);
  const handleChartsPanelDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const containerW = chartsPanelContainerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    chartsPanelDragRef.current = { startX: e.clientX, startPct: chartsPanelWidthPct, containerW };
    const onMove = (ev: MouseEvent) => {
      if (!chartsPanelDragRef.current) return;
      const { startX, startPct, containerW: cw } = chartsPanelDragRef.current;
      const deltaPct = ((ev.clientX - startX) / cw) * 100;
      setChartsPanelWidthPct(Math.min(80, Math.max(20, startPct + deltaPct)));
    };
    const onUp = () => {
      chartsPanelDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const fullyDisabled = isRuleFullyDisabled(rule.id);
  const disabledEntry = getDisabledRule(rule.id);


  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkDropdownOpen(false);
    setSelectedFindingIds(new Set());
  };

  // Called when user triggers "Rescan" from the bulk dropdown
  // Note: filteredFindings ref is set after sort; we'll use a ref to avoid stale closure
  const filteredFindingsRef = useRef<MockFinding[]>([]);
  const handleBulkRescan = useCallback(() => {
    const targets = selectedFindingIds.size > 0
      ? selectedFindingIds
      : new Set(filteredFindingsRef.current.map(f => f.id));
    setRescanTargetIds(targets);
    setShowRescanModal(true);
    setBulkDropdownOpen(false);
  }, [selectedFindingIds]);

  // Called when the RescanModal is confirmed
  const handleRescanConfirm = useCallback(() => {
    setFindingsStatus(rescanTargetIds, "Rescan");
    setShowRescanModal(false);
    exitBulkMode();
    // If we're on the Open tab and just marked them Rescan, clear selection
    setSelectedFinding(prev => (prev && rescanTargetIds.has(prev.id) ? null : prev));
  }, [rescanTargetIds, setFindingsStatus]);

  // Called when any remediation action is applied (auto-Rescan status)
  const handleActionApplied = useCallback(() => {
    const targets = selectedFindingIds.size > 0
      ? selectedFindingIds
      : selectedFinding ? new Set([selectedFinding.id]) : new Set<string>();
    if (targets.size > 0) setFindingsStatus(targets, "Rescan");
    exitBulkMode();
  }, [selectedFindingIds, selectedFinding, setFindingsStatus]);

  // Called when CloseFindingModal confirms closure
  const handleCloseFindingsConfirmed = useCallback((idsToClose: string[]) => {
    idsToClose.forEach(id => setFindingStatus(id, "Closed"));
    setShowCloseFinding(false);
    // If currently-viewed finding is among closed, go back
    if (selectedFinding && idsToClose.includes(selectedFinding.id)) setSelectedFinding(null);
    exitBulkMode();
  }, [selectedFinding, setFindingStatus]);

  // Single-finding callbacks from FindingDetailView
  const handleSingleFindingClosed = useCallback((id: string) => {
    setFindingStatus(id, "Closed");
    setSelectedFinding(null);
  }, [setFindingStatus]);

  const handleSingleFindingRescanned = useCallback((id: string) => {
    setFindingStatus(id, "Rescan");
    // Finding stays visible (Rescan badge appears); no need to navigate away
  }, [setFindingStatus]);

  const toggleBulkMode = () => {
    if (bulkMode) {
      exitBulkMode();
    } else {
      // Close any open finding detail panel before entering bulk mode
      setSelectedFinding(null);
      setBulkMode(true);
      setBulkDropdownOpen(true);
    }
  };

  const toggleFindingId = useCallback((id: string) => {
    setSelectedFindingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Apply chip filters (status chip handled inside applyChipFilters; no pre-filter)
  const chipFilteredFindings = useMemo(() => applyChipFilters(allFindings, chips), [allFindings, chips]);

  // Apply search filter
  const searchFilteredFindings = useMemo(() => {
    if (searchText.length < 2) return chipFilteredFindings;
    const query = searchText.toLowerCase();
    return chipFilteredFindings.filter(f => {
      const dataStore = f.topology?.nodes?.find(n => n.type === "store")?.label || "";
      const destination = f.topology?.nodes?.find(n => n.type === "destination")?.label || "";
      const identities = f.topology?.nodes?.filter(n => n.type === "identity").map(n => n.label).join(" ") || "";
      const dataTypes = extractDetectedDataTypes(f).join(" ");
      
      const searchableText = [
        dataStore,
        destination,
        identities,
        f.id || "",
        f.matchedCondition || "",
        ...(Array.isArray(f.evidence) ? f.evidence : []),
        f.severity || "",
        dataTypes,
      ].join(" ").toLowerCase();
      return searchableText.includes(query);
    });
  }, [chipFilteredFindings, searchText]);

  // Apply sorting
  const filteredFindings = useMemo(() => {
    const sorted = [...searchFilteredFindings];
    sorted.sort((a, b) => {
      let compareResult = 0;
      
      switch (sortField) {
        case "timestamp":
          compareResult = parseRelativeDate(a.detectedAt) - parseRelativeDate(b.detectedAt);
          break;
        case "severity":
          const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          compareResult = (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
          break;
        case "dataStore": {
          const aStore = a.topology?.nodes?.find(n => n.type === "store")?.label || "";
          const bStore = b.topology?.nodes?.find(n => n.type === "store")?.label || "";
          compareResult = aStore.localeCompare(bStore);
          break;
        }
        case "sensitiveRecords": {
          const aCount = extractDetectedDataTypes(a).length;
          const bCount = extractDetectedDataTypes(b).length;
          compareResult = aCount - bCount;
          break;
        }
      }
      
      return sortDirection === "asc" ? compareResult : -compareResult;
    });
    // Keep ref in sync for handleBulkRescan
    filteredFindingsRef.current = sorted;
    return sorted;
  }, [searchFilteredFindings, sortField, sortDirection]);

  const toggleSelectAll = useCallback(() => {
    const allSelected = filteredFindings.length > 0 && filteredFindings.every(f => selectedFindingIds.has(f.id));
    if (allSelected) {
      setSelectedFindingIds(new Set());
    } else {
      setSelectedFindingIds(new Set(filteredFindings.map(f => f.id)));
    }
  }, [filteredFindings, selectedFindingIds]);

  const addChip = useCallback((chip: Omit<FilterChip, "id">) => {
    setChips(prev => [...prev, { ...chip, id: `${chip.type}-${chip.value}-${Date.now()}` }]);
  }, []);

  const removeChip = useCallback((id: string) => {
    setChips(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleSortChange = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const handleSearchClick = useCallback(() => {
    setSearchExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const handleSearchBlur = useCallback(() => {
    if (searchText.length === 0) {
      setSearchExpanded(false);
    }
  }, [searchText]);

  const handleSearchClear = useCallback(() => {
    setSearchText("");
    setSearchExpanded(false);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 50, background: "#ffffff" }}>

      {/* ── Rule header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-4 pb-4 border-b flex items-center gap-4" style={{ borderColor: "var(--color-border)" }}>
        {/* Per-rule action buttons */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          
          {/* Policies & More — CTA (with dropdown for hybrid rules) */}
          {isHybrid ? (
            <div className="relative" ref={policiesDropdownRef}>
              <button
                onClick={() => setPoliciesDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:opacity-90"
                style={{
                  fontSize: "11px", fontWeight: 600,
                  background: "var(--color-primary)",
                  color: "var(--color-primary-foreground)",
                }}
              >
                <Sparkles size={12} />
                Recommendations
                <ChevronDown size={11} style={{ transform: policiesDropdownOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
              </button>
              {policiesDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 rounded-lg overflow-hidden z-50"
                  style={{
                    minWidth: 190,
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  }}
                >
                  <button
                    onClick={() => { setPoliciesModalVariant("saas"); setShowPoliciesAndMore(true); setPoliciesDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "12px", color: "var(--color-foreground)" }}
                  >
                    SaaS Findings
                    <span className="ml-1.5 text-muted-foreground" style={{ fontSize: "11px" }}>({saasFindingCount})</span>
                  </button>
                  <button
                    onClick={() => { setPoliciesModalVariant("iaas"); setShowPoliciesAndMore(true); setPoliciesDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "12px", color: "var(--color-foreground)" }}
                  >
                    IaaS/PaaS/On-Prem Findings
                    <span className="ml-1.5 text-muted-foreground" style={{ fontSize: "11px" }}>({iaasFindingCount})</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowPoliciesAndMore(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:opacity-90"
              style={{
                fontSize: "11px", fontWeight: 600,
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
            >
              <Sparkles size={12} />
              Recommendations
            </button>
          )}

          {!fullyDisabled && (
            <button
              onClick={() => setShowDisableRule(true)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 border transition-colors hover:bg-muted/60"
              style={{ fontSize: "11px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
            >
              <VolumeX size={11} />
              Disable Rule
            </button>
          )}
          {fullyDisabled && (
            <span className="flex items-center gap-1 rounded px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, color: "#f97316", background: "rgba(249,115,22,0.1)" }}>
              <VolumeX size={10} />
              Policy muted
            </span>
          )}
          {/* Bulk Action — rightmost, toggles checkbox mode + action dropdown */}
          <div className="relative" ref={bulkDropdownRef}>
            <button
              onClick={toggleBulkMode}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 border transition-colors hover:bg-muted/60"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                borderColor: bulkMode ? "var(--color-primary)" : "var(--color-border)",
                color: bulkMode ? "var(--color-primary)" : "var(--color-muted-foreground)",
                background: bulkMode ? "color-mix(in srgb, var(--color-primary) 8%, transparent)" : "transparent",
              }}
            >
              Bulk Action
              <ChevronDown
                size={11}
                style={{
                  transform: bulkDropdownOpen ? "rotate(180deg)" : undefined,
                  transition: "transform 0.15s",
                }}
              />
            </button>
            {bulkDropdownOpen && (
              <BulkActionDropdown
                selectedCount={selectedFindingIds.size}
                selectedFindings={filteredFindings.filter(f => selectedFindingIds.has(f.id))}
                allSelected={selectedFindingIds.size > 0 && selectedFindingIds.size === filteredFindings.length}
                anchorRef={bulkDropdownRef}
                onCloseFinding={() => { setBulkDropdownOpen(false); setShowCloseFinding(true); }}
                onDismiss={exitBulkMode}
                onRescan={handleBulkRescan}
                onActionApplied={handleActionApplied}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0" style={{ order: -1 }}>
          {/* Animated Back Button */}
          <button
            onClick={onClose}
            className="group flex items-center justify-center shrink-0 rounded-lg transition-colors"
            style={{
              width: 40,
              height: 40,
              color: "var(--color-muted-foreground)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ChevronLeft size={20} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
          </button>

          {riskType && (
            <RiskTypeIcon riskTypeId={riskType.id} fg={riskType.fg} size="lg" />
          )}
          <div className="flex-1 min-w-0">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 title={rule.name} className="truncate" style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.3 }}>{rule.name}</h2>
              {rule.severity && <SeverityBadge severity={rule.severity} />}
              {disabledEntry && (
                <span className="flex items-center gap-1 rounded px-2 py-0.5 shrink-0" style={{ fontSize: "10px", fontWeight: 600, color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
                  <VolumeX size={10} />
                  {disabledEntry.disableType === "full" ? "Policy Disabled" : "Partially Disabled"}
                </span>
              )}
            </div>
            <p title={rule.description || rule.conditionSummary} className="text-muted-foreground truncate" style={{ fontSize: "11px", lineHeight: 1.5 }}>{rule.description || rule.conditionSummary}</p>
          </div>
        </div>
      </div>

      {/* ── Body: left charts + right findings ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" ref={chartsPanelContainerRef}>

        {/* Left: Charts Panel — drag-resizable */}
        <div
          className="relative shrink-0 flex overflow-hidden"
          style={{ width: `${chartsPanelWidthPct}%` }}
        >
          <ChartsPanel
            rule={rule}
            allFindings={allFindings}
            filteredFindings={filteredFindings}
            chips={chips}
            onAddChip={addChip}
          />

          {/* Drag handle — sits on the right edge of the panel */}
          <div
            onMouseDown={handleChartsPanelDragStart}
            className="absolute top-0 right-0 bottom-0 flex items-center justify-center group"
            style={{ width: 8, cursor: "col-resize", zIndex: 10 }}
          >
            <div
              className="group-hover:opacity-100 transition-opacity"
              style={{
                width: 3,
                height: 40,
                borderRadius: 2,
                background: "rgba(148,163,184,0.25)",
                opacity: 0,
              }}
            />
          </div>
        </div>

        {/* Right: Finding list with overlaying detail panel */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <FindingsListView
            filteredFindings={filteredFindings}
            allFindings={allFindings}
            chips={chips}
            selectedFinding={selectedFinding}
            onSelectFinding={setSelectedFinding}
            onAddChip={addChip}
            onRemoveChip={removeChip}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            searchText={searchText}
            searchExpanded={searchExpanded}
            searchInputRef={searchInputRef}
            onSearchTextChange={setSearchText}
            onSearchClick={handleSearchClick}
            onSearchBlur={handleSearchBlur}
            onSearchClear={handleSearchClear}
            bulkMode={bulkMode}
            selectedFindingIds={selectedFindingIds}
            onToggleFindingId={toggleFindingId}
            onToggleSelectAll={toggleSelectAll}
            effectiveStatuses={effectiveStatuses}
            mainEntityType={rule.mainEntityType}
          />
          {selectedFinding && (
            <FindingDetailView
              finding={selectedFinding}
              rule={rule}
              onBack={() => setSelectedFinding(null)}
              onFindingClosed={handleSingleFindingClosed}
              onFindingRescanned={handleSingleFindingRescanned}
            />
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showPoliciesAndMore && (isStaticOnly || (isHybrid && policiesModalVariant === "iaas")) && (
        <RecommendationModal
          rule={rule}
          onClose={() => setShowPoliciesAndMore(false)}
        />
      )}
      {showPoliciesAndMore && !isStaticOnly && !(isHybrid && policiesModalVariant === "iaas") && (
        <PoliciesAndMoreModal
          rule={rule}
          findings={allFindings}
          onClose={() => setShowPoliciesAndMore(false)}
        />
      )}
      {showRescanModal && (
        <RescanModal
          findings={getFindingsForRuleFiltered(rule.id, filter).filter(f => rescanTargetIds.has(f.id))}
          onConfirm={handleRescanConfirm}
          onClose={() => setShowRescanModal(false)}
        />
      )}
      {showCloseFinding && (
        <CloseFindingModal
          findings={filteredFindings}
          chips={chips}
          totalCount={allFindings.length}
          allFindingIds={allFindings.map(f => f.id)}
          onClose={() => setShowCloseFinding(false)}
          onConfirm={handleCloseFindingsConfirmed}
        />
      )}
      {showDisableRule && (
        <DisablePolicyModal
          mode="full"
          rule={rule}
          riskType={riskType}
          onConfirm={() => {
            if (riskType) {
              disableRuleFull(rule, riskType.label, riskType.fg);
            }
            setShowDisableRule(false);
            // Navigate back to the risk page after disabling
            onClose();
          }}
          onClose={() => setShowDisableRule(false)}
          showDisabledRulesLink={true}
          onNavigateToDisabledRules={() => {
            setShowDisableRule(false);
            navigate("/risk/disabled-policies");
          }}
        />
      )}
    </div>
  );
}
