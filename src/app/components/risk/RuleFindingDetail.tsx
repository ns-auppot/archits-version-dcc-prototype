import { useState } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router";
import {
  Users, Database, FileText, Globe, Settings, Laptop, Activity,
  AlertTriangle, ChevronRight, ArrowRight, ArrowLeft, CheckCircle2,
  VolumeX, Volume2, HardDrive, Building2, Cloud, UserCheck, Bot,
  Eye, Lock, Clock, UserMinus, ShieldCheck, Server, X, XCircle, Search,
} from "lucide-react";
import {
  getFindingsForRuleFiltered, SEVERITY_STYLES,
} from "../../shared/risk-findings";
import type { RiskRule, PolicyEngineKey } from "../../shared/risk-rules";
import { POLICY_ENGINES, RISK_TYPES, SEVERITY_META } from "../../shared/risk-rules";
import type { MockFinding, TopologyNode, Severity, FindingFilter } from "../../shared/risk-findings";
import { useDisabledRules } from "../../shared/disabled-rules-store";
import { DisablePolicyModal } from "./DisablePolicyModal";
import { ApplySensitivityLabelConfig, QuarantineConfig, RestrictAccessConfig, ChangeOwnershipConfig, NotifyOwnerConfig, LegalHoldConfig, DeleteConfig, ApplyDLPConfig, RequestJustificationConfig, PerformTargetedScanConfig } from "./config-panels";
import { ActionMenuList } from "./ActionMenuList";
import { ALL_DATA_TYPES } from "../../shared/taxonomy";

// ── Icon maps ─────────────────────────────────────────────────────────────────


const TOPOLOGY_COLORS: Record<string, { bg: string; fg: string }> = {
  identity:    { bg: "var(--color-muted)",  fg: "#818cf8" },  // Theme-aware bg, purple icon
  store:       { bg: "var(--color-muted)",   fg: "#22d3ee" },  // Theme-aware bg, teal icon
  file:        { bg: "var(--color-muted)",   fg: "#facc15" },  // Theme-aware bg, yellow icon
  destination: { bg: "var(--color-muted)",  fg: "#22d3ee" },   // Theme-aware bg, teal icon (same as store)
  config:      { bg: "var(--color-muted)",  fg: "#c084fc" },  // Theme-aware bg, purple variant icon
  device:      { bg: "var(--color-muted)",  fg: "#2dd4bf" },  // Theme-aware bg, teal variant icon
  activity:    { bg: "var(--color-muted)",   fg: "#f87171" },  // Theme-aware bg, red icon
};

// ── Data Store/Destination bubbles ──────────────────────────────────────────────

// Platform icon mapping
const PLATFORM_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  "google drive": HardDrive,
  "sharepoint": Building2,
  "onedrive": Building2,
  "microsoft 365": Building2,
  "aws s3": HardDrive,
  "aws rds": Database,
  "azure blob": Cloud,
  "azure sql": Database,
  "postgresql": Database,
  "oracle": Database,
  "mysql": Database,
  "salesforce": Globe,
  "github": Globe,
  "slack": Globe,
  // Generative AI destinations
  "chatgpt": Globe,
  "claude": Globe,
  "gemini": Globe,
  "copilot": Globe,
  "openai": Globe,
  "anthropic": Globe,
  // Personal webmail destinations
  "gmail": Globe,
  "yahoo": Globe,
  "outlook": Globe,
  // Unsanctioned cloud storage
  "dropbox": Globe,
  "box": Globe,
  "default": Database,
};

function getPlatformIcon(label: string): ComponentType<{ size?: number; className?: string }> {
  const lower = label.toLowerCase();
  for (const [key, icon] of Object.entries(PLATFORM_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return PLATFORM_ICONS.default;
}

interface DataStoreItem {
  label: string;
  type: "store" | "destination";
}

function DataStoreBubbles({ findings }: { findings: MockFinding[] }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Extract unique stores and destinations
  const items: DataStoreItem[] = [];
  const seen = new Set<string>();
  
  findings.forEach(f => {
    f.topology.nodes.forEach(n => {
      if ((n.type === "store" || n.type === "destination") && !seen.has(n.label)) {
        seen.add(n.label);
        items.push({ label: n.label, type: n.type });
      }
    });
  });

  if (items.length === 0) return null;

  const MAX_VISIBLE = 8;
  const visibleItems = items.slice(0, MAX_VISIBLE);
  const overflowItems = items.slice(MAX_VISIBLE);
  const overflowCount = overflowItems.length;

  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: "12px", fontWeight: 600 }}>
        Data Store/Destination:
      </span>
      <div
        className="relative flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          height: 24,
          transition: "all 0.2s ease",
        }}
      >
        {visibleItems.map((item, i) => {
          // Find the node to get sublabel for platform detection
          let platformHint = item.label;
          findings.some(f => {
            const node = f.topology.nodes.find(n => n.label === item.label);
            if (node?.sublabel) {
              platformHint = node.sublabel;
              return true;
            }
            return false;
          });
          const Icon = getPlatformIcon(platformHint);
          const colors = TOPOLOGY_COLORS.store; // Use cyan for all
          return (
            <div
              key={item.label}
              className="group/bubble relative flex items-center justify-center rounded-full border transition-all"
              style={{
                width: 24,
                height: 24,
                background: colors.bg,
                borderColor: "var(--color-border)",
                marginLeft: isHovered ? (i === 0 ? 0 : 4) : (i === 0 ? 0 : -8),
                zIndex: isHovered ? 10 : (visibleItems.length - i),  // Leftmost bubble (i=0) is on top
                transition: "margin-left 0.2s ease, transform 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <Icon size={11} style={{ color: colors.fg }} />
              
              {/* Tooltip on hover */}
              <span
                className="absolute bottom-full mb-2 px-2 py-1 rounded opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--color-foreground)",
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  zIndex: 20,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
        {overflowCount > 0 && (
          <div
            className="group/bubble relative flex items-center justify-center rounded-full border transition-all"
            style={{
              width: 24,
              height: 24,
              background: "var(--color-muted)",
              borderColor: "var(--color-border)",
              marginLeft: isHovered ? 4 : -8,
              zIndex: 1,
              transition: "margin-left 0.2s ease",
            }}
          >
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-muted-foreground)" }}>
              +{overflowCount}
            </span>
            
            {/* Tooltip showing overflow items */}
            <span
              className="absolute bottom-full mb-2 px-2 py-1 rounded opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: "var(--color-foreground)",
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                zIndex: 20,
              }}
            >
              {overflowItems.map(item => item.label).join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Identity bubbles ────────────────────────────────────────────────────────

function IdentityBubbles({ findings }: { findings: MockFinding[] }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Extract unique identity types from findings
  // Store both display label and tooltip text
  const identities: Array<{ display: string; tooltip: string }> = [];
  const seen = new Set<string>();
  
  findings.forEach(f => {
    f.topology.nodes.forEach(n => {
      if (n.type === "identity") {
        // Check both label and sublabel for identity type information
        const label = n.label.toLowerCase();
        const sublabel = n.sublabel.toLowerCase();
        
        if (label.includes("anyone with link") || label.includes("anyone with the link") || sublabel.includes("public sharing")) {
          // "Anyone with Link" — show the literal label, not mapped to any identity group
          if (!seen.has(`public:${n.label}`)) {
            seen.add(`public:${n.label}`);
            identities.push({ display: n.label, tooltip: n.label });
          }
        } else if (sublabel.includes("external") || sublabel.includes("contractor") || sublabel.includes("partner")) {
          // External user identified by sublabel (e.g., "Partner · External")
          if (!seen.has(`external:${n.label}`)) {
            seen.add(`external:${n.label}`);
            identities.push({ display: "External", tooltip: n.label });
          }
        } else if (sublabel.includes("3rd party") || sublabel.includes("third party")) {
          if (!seen.has(`3rdparty:${n.label}`)) {
            seen.add(`3rdparty:${n.label}`);
            identities.push({ display: "3rd party app", tooltip: n.label });
          }
        } else if (sublabel.includes("service account") || label.includes("svc-")) {
          // Service accounts
          if (!seen.has(`service:${n.label}`)) {
            seen.add(`service:${n.label}`);
            identities.push({ display: "Service Account", tooltip: n.label });
          }
        } else if (sublabel.includes("ai agent") || sublabel.includes("agent")) {
          // AI agents
          if (!seen.has(`agent:${n.label}`)) {
            seen.add(`agent:${n.label}`);
            identities.push({ display: "3rd party app", tooltip: n.label });
          }
        } else {
          // Default to internal user
          if (!seen.has(`internal:${n.label}`)) {
            seen.add(`internal:${n.label}`);
            identities.push({ display: "Internal", tooltip: n.label });
          }
        }
      }
    });
  });

  if (identities.length === 0) return null;

  const MAX_VISIBLE = 8;
  const visibleIdentities = identities.slice(0, MAX_VISIBLE);
  const overflowIdentities = identities.slice(MAX_VISIBLE);
  const overflowCount = overflowIdentities.length;
  const colors = TOPOLOGY_COLORS.identity;

  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: "12px", fontWeight: 600 }}>
        Identity:
      </span>
      <div
        className="relative flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          height: 24,
          transition: "all 0.2s ease",
        }}
      >
        {visibleIdentities.map((identity, i) => {
          // Choose icon based on identity type
          const IdentityIcon = identity.display === "External" ? UserCheck : 
                               identity.display === "3rd party app" ? Bot :
                               identity.display === "Service Account" ? Server :
                               Users;
          
          return (
            <div
              key={identity.tooltip + i}
              className="group/bubble relative flex items-center justify-center rounded-full border transition-all"
              style={{
                width: 24,
                height: 24,
                background: colors.bg,
                borderColor: "var(--color-border)",
                marginLeft: isHovered ? (i === 0 ? 0 : 4) : (i === 0 ? 0 : -8),
                zIndex: isHovered ? 10 : (visibleIdentities.length - i),  // Leftmost bubble (i=0) is on top
                transition: "margin-left 0.2s ease, transform 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <IdentityIcon size={11} style={{ color: colors.fg }} />
              
              {/* Tooltip on hover */}
              <span
                className="absolute bottom-full mb-2 px-2 py-1 rounded opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--color-foreground)",
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  zIndex: 20,
                }}
              >
                {identity.tooltip}
              </span>
            </div>
          );
        })}
        {overflowCount > 0 && (
          <div
            className="group/bubble relative flex items-center justify-center rounded-full border transition-all"
            style={{
              width: 24,
              height: 24,
              background: "var(--color-muted)",
              borderColor: "var(--color-border)",
              marginLeft: isHovered ? 4 : -8,
              zIndex: 1,
              transition: "margin-left 0.2s ease",
            }}
          >
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-muted-foreground)" }}>
              +{overflowCount}
            </span>
            
            {/* Tooltip showing overflow items */}
            <span
              className="absolute bottom-full mb-2 px-2 py-1 rounded opacity-0 group-hover/bubble:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: "var(--color-foreground)",
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                zIndex: 20,
              }}
            >
              {overflowIdentities.map(identity => identity.tooltip).join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Severity chip ─────────────────────────────────────────────────────────────

function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className="shrink-0 rounded-full px-2"
      style={{ fontSize: "10px", fontWeight: 700, color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

// ── Finding row ───────────────────────────────────────────────────────────────

function FindingRow({
  finding, selected, onClick,
}: {
  finding: MockFinding;
  selected: boolean;
  onClick: () => void;
}) {
  const identityLabel = finding.topology.nodes.find(n =>
    n.type === "identity" || n.type === "device" || n.type === "activity"
  )?.label ?? "—";
  const resourceLabel = finding.topology.nodes.find(n =>
    n.type === "store" || n.type === "file" || n.type === "destination" || n.type === "config"
  )?.label ?? "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="group w-full text-left px-4 py-3 border-b flex flex-col gap-1.5 transition-colors cursor-pointer"
      style={{
        borderBottomColor: "var(--color-border)",
        borderLeft: selected ? "2px solid #3b82f6" : "2px solid transparent",
        backgroundColor: selected ? "rgba(59, 130, 246, 0.08)" : undefined,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-text-dim shrink-0" style={{ fontSize: "10px", fontFamily: "monospace" }}>
          {finding.id}
        </span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-foreground truncate" style={{ fontSize: "11px", fontWeight: 500 }}>
          {identityLabel}
        </span>
        <ArrowRight size={10} className="text-muted-foreground shrink-0" />
        <span className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>
          {resourceLabel}
        </span>
      </div>
      <p className="text-text-dim" style={{ fontSize: "10px" }}>
        {finding.detectedAt} · {finding.lastSeenAt}
      </p>
    </div>
  );
}

// ── Evidence panel (right column) ─────────────────────────────────────────────

// Entity type for highlighting
type EntityType = "identity" | "store" | "file" | "destination" | "column" | "dataType";

interface EntityMatch {
  text: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
}

// Helper to extract entities from topology
function extractEntitiesFromTopology(finding: MockFinding): Map<string, EntityType> {
  const entities = new Map<string, EntityType>();
  
  // Common non-person patterns to filter out
  const commonNonPersonPatterns = [
    /^(Google|Microsoft|Amazon|AWS|Azure|GitHub|Slack|Box|Dropbox)/i,
    /\b(Drive|Code|Names|Data|Database|Storage|Cloud|Server|Pipeline|Account|Service|Tool|System|Platform|Application)\b/i,
  ];
  
  // First pass: Extract all entities from topology nodes
  finding.topology.nodes.forEach(node => {
    // Add the node label as an entity
    if (node.type === "identity" || node.type === "store" || node.type === "file" || node.type === "destination") {
      entities.set(node.label, node.type);
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
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(parts) && !entities.has(parts)) {
        entities.set(parts, "identity");
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
      
      // Skip if this entity is already classified (e.g., as a store or destination)
      if (entities.has(properName)) {
        continue;
      }
      
      // Skip common non-person patterns (generic proper nouns)
      const isNonPerson = commonNonPersonPatterns.some(pattern => pattern.test(properName));
      if (isNonPerson) {
        continue;
      }
      
      // Determine entity type based on context
      // If it looks like a person name (exactly two capitalized words with simple letters), it's likely an identity
      const isPersonName = /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(properName);
      
      if (isPersonName) {
        // Person name like "Diana Reyes"
        entities.set(properName, "identity");
      } else if (properName.includes("/") || properName.toLowerCase().includes("pipeline") || 
                 properName.toLowerCase().includes("bot") || properName.toLowerCase().includes("copilot")) {
        // Service account or agent like "CI/CD Pipeline", "Data Sync Bot", "Support Copilot"
        entities.set(properName, "identity");
      }
    }
    
    // Match data store patterns like "prod-data-lake (s3://...)" or "HR Confidential (Google Drive d3)"
    const dataStorePattern = /\b([A-Za-z0-9\-_ ]+)\s*\((?:s3:\/\/|Google Drive|SharePoint|AWS|Azure|PostgreSQL)[^)]+\)/g;
    const storeMatches = evidenceText.matchAll(dataStorePattern);
    
    for (const match of storeMatches) {
      const storeName = match[1].trim();
      // Only add if not already classified
      if (!entities.has(storeName)) {
        entities.set(storeName, "store");
      }
    }
    
    // Match AI tool patterns like "ChatGPT (chat.openai.com)"
    const aiToolPattern = /\b(ChatGPT|Claude|Gemini|GitHub Copilot|Perplexity|OpenAI)\s*\([^)]+\)/g;
    const aiMatches = evidenceText.matchAll(aiToolPattern);
    
    for (const match of aiMatches) {
      const toolName = match[1].trim();
      // Only add if not already classified
      if (!entities.has(toolName)) {
        entities.set(toolName, "destination");
      }
    }
  });
  
  return entities;
}

// Helper to find column names in text (looking for underscore_separated or camelCase identifiers)
function findColumnNames(text: string): string[] {
  const columns: string[] = [];
  // Match underscore_separated identifiers
  const underscoreMatches = text.match(/\b[a-z]+(_[a-z]+)+\b/g);
  if (underscoreMatches) {
    columns.push(...underscoreMatches);
  }
  return columns;
}

// Component for "+n" badge with popover showing remaining data types
function DataTypeOverflowBadge({ remainingTypes }: { remainingTypes: string[] }) {
  const [showPopover, setShowPopover] = useState(false);
  
  return (
    <span 
      className="inline-flex items-center relative"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <span
        style={{
          background: "rgba(59, 130, 246, 0.15)",
          color: "#3b82f6",
          padding: "3px 7px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 600,
          lineHeight: "16.5px",
          whiteSpace: "nowrap",
          cursor: "default",
        }}
      >
        +{remainingTypes.length}
      </span>
      
      {showPopover && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "0",
            marginTop: "4px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
            zIndex: 1000,
            minWidth: "200px",
            maxWidth: "300px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {remainingTypes.map((type, idx) => (
              <span
                key={idx}
                style={{
                  background: "#f1f5f9",
                  color: "#1e293b",
                  padding: "3px 7px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 400,
                  lineHeight: "16.5px",
                  border: "1px solid rgba(0,0,0,0.1)",
                  whiteSpace: "nowrap",
                }}
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

// Helper to highlight entities in text
function highlightEntities(text: string, entities: Map<string, EntityType>, onEntityClick: (entity: string, type: EntityType) => void): React.ReactNode {
  // Check if this line contains "Data types:" followed by many comma-separated types
  const dataTypesMatch = text.match(/Data types:(.+)/i);
  if (dataTypesMatch) {
    const afterDataTypes = dataTypesMatch[1];
    const foundDataTypes: string[] = [];
    
    // Extract all data types from the comma-separated list
    ALL_DATA_TYPES.forEach(dataType => {
      if (afterDataTypes.includes(dataType)) {
        foundDataTypes.push(dataType);
      }
    });
    
    // If we found more than 3 data types, render with truncation
    if (foundDataTypes.length > 3) {
      const beforeDataTypes = text.substring(0, text.indexOf("Data types:") + "Data types:".length);
      const displayTypes = foundDataTypes.slice(0, 20);
      const remainingTypes = foundDataTypes.slice(20);
      
      return (
        <>
          {beforeDataTypes}{" "}
          {displayTypes.map((type, idx) => (
            <span
              key={`dt-${idx}`}
              className="inline-flex items-center"
              style={{
                background: "#f1f5f9",
                color: "#1e293b",
                padding: "3px 7px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 400,
                lineHeight: "16.5px",
                border: "1px solid rgba(0,0,0,0.1)",
                whiteSpace: "nowrap",
                marginRight: "4px",
              }}
            >
              {type}
            </span>
          ))}
          {remainingTypes.length > 0 && <DataTypeOverflowBadge remainingTypes={remainingTypes} />}
        </>
      );
    }
  }
  
  const matches: EntityMatch[] = [];
  
  // Find all entity matches in the text
  entities.forEach((type, entityName) => {
    let startIndex = 0;
    while (true) {
      const index = text.indexOf(entityName, startIndex);
      if (index === -1) break;
      
      // Check if it's a whole word match (not part of a larger word)
      const beforeChar = index > 0 ? text[index - 1] : " ";
      const afterChar = index + entityName.length < text.length ? text[index + entityName.length] : " ";
      const isWholeWord = /[\s.,;:()\[\]{}'"@/]/.test(beforeChar) && /[\s.,;:()\[\]{}'"@/]/.test(afterChar);
      
      if (isWholeWord) {
        matches.push({
          text: entityName,
          type,
          startIndex: index,
          endIndex: index + entityName.length,
        });
      }
      
      startIndex = index + entityName.length;
    }
  });
  
  // Find data type matches from taxonomy (57 sensitive data types)
  ALL_DATA_TYPES.forEach(dataType => {
    let startIndex = 0;
    while (true) {
      const index = text.indexOf(dataType, startIndex);
      if (index === -1) break;
      
      // Check if it's a whole word match
      const beforeChar = index > 0 ? text[index - 1] : " ";
      const afterChar = index + dataType.length < text.length ? text[index + dataType.length] : " ";
      const isWholeWord = /[\s.,;:()\[\]{}'\"@/]/.test(beforeChar) && /[\s.,;:()\[\]{}'\"@/]/.test(afterChar);
      
      if (isWholeWord) {
        matches.push({
          text: dataType,
          type: "dataType" as EntityType,
          startIndex: index,
          endIndex: index + dataType.length,
        });
      }
      
      startIndex = index + dataType.length;
    }
  });
  
  // Also find column names
  const columnNames = findColumnNames(text);
  columnNames.forEach(colName => {
    let startIndex = 0;
    while (true) {
      const index = text.indexOf(colName, startIndex);
      if (index === -1) break;
      
      matches.push({
        text: colName,
        type: "column",
        startIndex: index,
        endIndex: index + colName.length,
      });
      
      startIndex = index + colName.length;
    }
  });
  
  // Sort matches by start index
  matches.sort((a, b) => a.startIndex - b.startIndex);
  
  // Remove overlapping matches (keep the first one)
  const filteredMatches: EntityMatch[] = [];
  let lastEndIndex = -1;
  for (const match of matches) {
    if (match.startIndex >= lastEndIndex) {
      filteredMatches.push(match);
      lastEndIndex = match.endIndex;
    }
  }
  
  if (filteredMatches.length === 0) {
    return text;
  }
  
  // Build the highlighted text
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  filteredMatches.forEach((match, i) => {
    // Add text before the match
    if (match.startIndex > currentIndex) {
      parts.push(text.substring(currentIndex, match.startIndex));
    }
    
    // Data types get special non-clickable badge styling
    if (match.type === "dataType") {
      parts.push(
        <span
          key={`datatype-${i}`}
          className="inline-flex items-center"
          style={{
            background: "#f1f5f9",
            color: "#1e293b",
            padding: "3px 7px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 400,
            lineHeight: "16.5px",
            border: "1px solid rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
            marginRight: "4px",
          }}
        >
          {match.text}
        </span>
      );
      
      // Skip trailing comma and space after data type badges
      let skipIndex = match.endIndex;
      if (text[skipIndex] === ',' && text[skipIndex + 1] === ' ') {
        skipIndex += 2;
      } else if (text[skipIndex] === ',') {
        skipIndex += 1;
      }
      currentIndex = skipIndex;
    } else {
      // Add the highlighted entity (clickable with underline and semi-bold)
      parts.push(
        <span
          key={`entity-${i}`}
          onClick={(e) => {
            e.stopPropagation();
            onEntityClick(match.text, match.type);
          }}
          className="entity-highlight"
          style={{
            fontWeight: 600,
            textDecoration: "underline",
            textDecorationSkipInk: "none",
            color: "#1d293d",
            cursor: "pointer",
          }}
        >
          {match.text}
        </span>
      );
      
      currentIndex = match.endIndex;
    }
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return <>{parts}</>;
}

// Entity side panel component
function EntitySidePanel({ 
  entityName, 
  entityType, 
  onClose 
}: { 
  entityName: string; 
  entityType: EntityType; 
  onClose: () => void;
}) {
  const typeLabels: Record<EntityType, string> = {
    identity: "Identity",
    store: "Data Store",
    file: "File",
    destination: "Destination",
    column: "Table Column",
    dataType: "Data Type",
  };

  const typeColors: Record<EntityType, { bg: string; fg: string; border: string }> = {
    identity:    { bg: "rgba(99, 102, 241, 0.1)",  fg: "#818cf8", border: "rgba(99, 102, 241, 0.3)" },
    store:       { bg: "rgba(6, 182, 212, 0.1)",   fg: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" },
    destination: { bg: "rgba(6, 182, 212, 0.1)",   fg: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" },
    file:        { bg: "rgba(234, 179, 8, 0.1)",   fg: "#facc15", border: "rgba(234, 179, 8, 0.3)" },
    column:      { bg: "rgba(168, 85, 247, 0.1)",  fg: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  };

  const colors = typeColors[entityType];

  // Generate mock entity detail rows based on type
  const detailRows: Array<{ label: string; value: string }> = (() => {
    if (entityType === "identity") {
      const isService = entityName.includes("svc-") || entityName.toLowerCase().includes("bot") || entityName.toLowerCase().includes("pipeline") || entityName.toLowerCase().includes("copilot");
      return [
        { label: "Type", value: isService ? "Service Account" : "User Account" },
        { label: "Email", value: entityName.includes("@") ? entityName : `${entityName.toLowerCase().replace(/\s+/g, ".")}@company.com` },
        { label: "Department", value: isService ? "Platform Engineering" : "Engineering" },
        { label: "Last Active", value: "2 hours ago" },
        { label: "Risk Score", value: "Medium" },
        { label: "Open Findings", value: "3" },
      ];
    }
    if (entityType === "store" || entityType === "destination") {
      const platform = entityName.toLowerCase().includes("drive") ? "Google Drive"
        : entityName.toLowerCase().includes("share") ? "SharePoint"
        : entityName.toLowerCase().includes("s3") ? "AWS S3"
        : entityName.toLowerCase().includes("azure") ? "Azure Blob"
        : "Cloud Storage";
      return [
        { label: "Platform", value: platform },
        { label: "Type", value: entityType === "destination" ? "External Destination" : "Data Store" },
        { label: "Sensitivity", value: "High" },
        { label: "Owner", value: "data-owners@company.com" },
        { label: "Last Scanned", value: "6 hours ago" },
        { label: "Files Indexed", value: "1,247" },
      ];
    }
    if (entityType === "file") {
      return [
        { label: "Type", value: "Document" },
        { label: "Created", value: "90 days ago" },
        { label: "Modified", value: "3 days ago" },
        { label: "Size", value: "2.4 MB" },
        { label: "Sharing", value: "Public link active" },
        { label: "Sensitivity", value: "High" },
      ];
    }
    if (entityType === "column") {
      return [
        { label: "Type", value: "Database Column" },
        { label: "Data Type", value: "VARCHAR(255)" },
        { label: "Table", value: entityName.split("_")[0] + "_records" },
        { label: "Nullable", value: "No" },
        { label: "PII", value: "Yes" },
        { label: "Encrypted", value: "No" },
      ];
    }
    return [];
  })();

  const valueColor = (label: string, value: string): string => {
    if (label === "Risk Score" && value === "High") return "#f87171";
    if (label === "Risk Score" && value === "Medium") return "#fbbf24";
    if (label === "Risk Score" && value === "Low") return "#4ade80";
    if (label === "Sharing" && value.includes("Public")) return "#f87171";
    if (label === "Encrypted" && value === "No") return "#fbbf24";
    if (label === "PII" && value === "Yes") return "#f87171";
    if (label === "Sensitivity" && value === "High") return "#f87171";
    return "var(--color-foreground)";
  };

  return (
    <div
      className="absolute top-0 right-0 bottom-0 flex flex-col"
      style={{
        width: 300,
        background: "var(--color-card)",
        borderLeft: "1px solid var(--color-border)",
        zIndex: 100,
        boxShadow: "-4px 0 16px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          className="rounded px-2 py-0.5"
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: colors.fg,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
          }}
        >
          {typeLabels[entityType]}
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-muted transition-colors"
        >
          <X size={13} className="text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "14px", wordBreak: "break-word", lineHeight: 1.4 }}>
          {entityName}
        </h3>

        {/* Detail rows */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--color-border)", marginBottom: "16px" }}
        >
          {detailRows.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: i % 2 === 0 ? "var(--color-muted)" : "var(--color-card)",
                borderBottom: i < detailRows.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontWeight: 500 }}>
                {row.label}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: valueColor(row.label, row.value) }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Related findings */}
        <p
          className="text-muted-foreground mb-2"
          style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em" }}
        >
          Related Findings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {["Critical exposure via public link", "Overprivileged access detected"].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--color-muted)" }}
            >
              <span
                className="shrink-0 rounded-full"
                style={{ width: 6, height: 6, background: i === 0 ? "#f87171" : "#fbbf24" }}
              />
              <span style={{ fontSize: "11px", color: "var(--color-foreground)", lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({ finding, rule, onRemediationAction, onShowAllActions, onCloseFinding }: { finding: MockFinding; rule: RiskRule; onRemediationAction: (actionType: string, finding: MockFinding) => void; onShowAllActions: () => void; onCloseFinding: () => void }) {
  const [selectedEntity, setSelectedEntity] = useState<{ name: string; type: EntityType } | null>(null);
  
  // Extract entities from topology
  const entities = extractEntitiesFromTopology(finding);
  
  const handleEntityClick = (entityName: string, entityType: EntityType) => {
    setSelectedEntity({ name: entityName, type: entityType });
  };
  
  const handleClosePanel = () => {
    setSelectedEntity(null);
  };
  
  const datastoreType = getDatastoreTypeForFinding(finding);
  const showRecommendedActions = datastoreType === 'saas';

  // Filter actions (exclude bulk-only) and cap at 1 for SaaS
  const filteredActions = finding.action
    .filter((action) => {
      if (typeof action === 'object' && action.remediationAction) {
        return action.remediationAction !== 'apply-dlp' && action.remediationAction !== 'perform-targeted-scan';
      }
      return true;
    })
    .slice(0, 1); // SaaS: only top action

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-5 relative">
      {/* Last update timestamp */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Last updated:</span>
        <span className="text-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
          {finding.detectedAt}
        </span>
      </div>

      {/* Topology placeholder — links to full topology dictionary */}
      <div className="rounded-lg border-2 border-dashed border-pink-300 bg-pink-50 p-6 text-center">
        <p className="text-pink-600 font-medium mb-2" style={{ fontSize: "13px" }}>
          Topology design placeholder
        </p>
        <p className="text-pink-500 mb-3" style={{ fontSize: "11px" }}>
          The correct topology for each risk policy is maintained in the topology dictionary.
        </p>
        <a
          href="/risk/topologies"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-pink-500 text-white px-4 py-2 font-medium hover:bg-pink-600 transition-colors"
          style={{ fontSize: "12px" }}
        >
          View all policy topologies
        </a>
      </div>

      {/* Recommended actions — only for SaaS managed stores, top action only */}
      {showRecommendedActions && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground"
              style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em" }}>
              RECOMMENDED ACTION
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onShowAllActions}
                className="px-2.5 py-1 rounded border transition-colors hover:bg-muted"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  borderColor: "var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              >
                All Actions
              </button>
              <button
                onClick={onCloseFinding}
                className="flex items-center gap-1 px-2.5 py-1 rounded border transition-colors hover:bg-red-500/10"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  borderColor: "#ef4444",
                  color: "#ef4444",
                }}
              >
                <XCircle size={10} />
                Close Finding
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {filteredActions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{ background: "var(--color-muted)" }}
              >
                <div
                  className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                  style={{
                    width: 18, height: 18,
                    background: "var(--color-primary)",
                    color: "var(--color-primary-foreground)",
                    fontSize: "9px", fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <p className="flex-1" style={{ fontSize: "11px", lineHeight: 1.6 }}>
                  {typeof action === 'string' ? action : action.text}
                </p>
                {typeof action === 'object' && action.remediationAction && (
                  <button
                    className="px-2 py-1 text-xs shrink-0"
                    style={{
                      background: "var(--color-primary)",
                      color: "var(--color-primary-foreground)",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 500,
                    }}
                    onClick={() => onRemediationAction(action.remediationAction!, finding)}
                  >
                    {getActionLabel(action.remediationAction)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What was detected */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em" }}>
          WHAT WAS DETECTED
        </p>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
          {finding.evidence.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline gap-2.5 px-3 py-2.5"
              style={{
                background: i % 2 === 0 ? "var(--color-card)" : "var(--color-muted)",
              }}
            >
              <span className="text-muted-foreground shrink-0">•</span>
              <p style={{ fontSize: "11px", lineHeight: 1.55 }}>
                {highlightEntities(item, entities, handleEntityClick)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Why this is risky */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em" }}>
          WHY THIS IS RISKY
        </p>
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
        >
          <p style={{ fontSize: "12px", lineHeight: 1.7 }}>{finding.rationale}</p>
        </div>
      </div>
      
      {/* Entity side panel */}
      {selectedEntity && (
        <EntitySidePanel
          entityName={selectedEntity.name}
          entityType={selectedEntity.type}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}

// ── Engine badge (kept for possible future use) ───────────────────────────────

function EngineBadge({ engine }: { engine: PolicyEngineKey }) {
  const cfg = POLICY_ENGINES[engine];
  return (
    <span
      className="rounded"
      style={{
        fontSize: "10px", fontWeight: 700, padding: "2px 7px",
        color: cfg.color, background: cfg.bg, letterSpacing: "0.04em",
      }}
    >
      {cfg.short}
    </span>
  );
}

// ── Severity distribution bar ─────────────────────────────────────────────────

function SeverityDistBar({ findings }: { findings: MockFinding[] }) {
  const counts = { Critical: 0, High: 0, Medium: 0 } as Record<Severity, number>;
  findings.forEach(f => counts[f.severity]++);
  const total = findings.length;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-full overflow-hidden" style={{ height: 6, width: 120 }}>
        {(["Critical", "High", "Medium"] as Severity[]).map(s => {
          const pct = (counts[s] / total) * 100;
          if (pct === 0) return null;
          return (
            <div key={s} style={{ width: `${pct}%`, background: SEVERITY_STYLES[s].color }} />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {(["Critical", "High", "Medium"] as Severity[]).map(s => counts[s] > 0 && (
          <span key={s} className="flex items-center gap-1" style={{ fontSize: "10px" }}>
            <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: SEVERITY_STYLES[s].color }} />
            <span className="text-muted-foreground">{counts[s]} {s}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Mute modal state ────────────────────��─────────────────────────────────────

type DisableModalState =
  | { open: false }
  | { open: true; mode: "full" }
  | { open: true; mode: "conditional"; finding: MockFinding };

// ── Remediation action helpers ────────────────────────────────────────────────

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'quarantine': 'Quarantine',
    'delete': 'Delete',
    'restrict-access': 'Restrict Access',
    'apply-dlp': 'Apply DLP Policy',
    'perform-targeted-scan': 'Perform Targeted Scan',
    'revoke-public': 'Revoke Public Sharing',
    'revoke-external': 'Revoke External Sharing',
    'revoke-company': 'Revoke Company-wide Sharing',
    'legal-hold': 'Legal Hold',
  };
  return labels[action] || action;
}

// ── Datastore type helper (used in EvidencePanel) ─────────────────────────────

function getDatastoreTypeForFinding(finding: MockFinding): 'saas' | 'iaas-paas-onprem' | 'unmanaged' | null {
  // If any destination node exists → unmanaged data destination
  const destinationNode = finding.topology.nodes.find(n => n.type === 'destination');
  if (destinationNode) return 'unmanaged';

  const storeNode = finding.topology.nodes.find(n => n.type === 'store');
  if (!storeNode) return null;

  const sublabel = storeNode.sublabel.toLowerCase();
  const saasPlatforms = ['google drive', 'sharepoint', 'onedrive', 'salesforce', 'microsoft 365', 'github', 'slack', 'box', 'dropbox'];
  if (saasPlatforms.some(p => sublabel.includes(p))) return 'saas';

  const iaasPatterns = ['aws', 's3', 'rds', 'azure', 'blob', 'sql', 'postgresql', 'oracle', 'mysql'];
  if (iaasPatterns.some(p => sublabel.includes(p))) return 'iaas-paas-onprem';

  return 'iaas-paas-onprem'; // default to IaaS/PaaS/OnPrem
}

// ── Full-screen overlay ────────────────────────────────────────────────────────

interface RuleFindingDetailOverlayProps {
  rule: RiskRule;
  filter?: FindingFilter;
  onClose: () => void;
}

export function PolicyFindingDetailOverlay({ rule, filter, onClose }: RuleFindingDetailOverlayProps) {
  const navigate = useNavigate();
  const { isRuleFullyDisabled, getDisabledRule, disableRuleFull } = useDisabledRules();

  const findings = getFindingsForRuleFiltered(rule.id, filter);
  const [selectedFinding, setSelectedFinding] = useState<MockFinding | null>(
    findings.length > 0 ? findings[0] : null
  );
  const [disableModal, setDisableModal] = useState<DisableModalState>({ open: false });
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    actionType: string;
    finding: MockFinding | null;
  }>({ open: false, actionType: '', finding: null });
  const [rescanAndClose, setRescanAndClose] = useState(true);
  const [closeFindingModal, setCloseFindingModal] = useState(false);
  const [closeFindingMode, setCloseFindingMode] = useState<'all' | 'selective'>('all');
  const [selectedDataStores, setSelectedDataStores] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmCloseFinding, setConfirmCloseFinding] = useState(false);
  const [actionMenuModal, setActionMenuModal] = useState(false);
  const [allActionsModal, setAllActionsModal] = useState(false);
  const [closeSingleFindingModal, setCloseSingleFindingModal] = useState(false);
  const [closeSingleFindingConfirmed, setCloseSingleFindingConfirmed] = useState(false);
  const [activeConfigAction, setActiveConfigAction] = useState<string | null>(null);

  const riskType = RISK_TYPES.find(rt => rt.rules.some(r => r.id === rule.id));
  const fullyDisabled = isRuleFullyDisabled(rule.id);
  const disabledEntry = getDisabledRule(rule.id);
  const noFindings = findings.length === 0;

  // Confirm handler for the disable modal
  const handleDisableConfirm = () => {
    disableRuleFull(rule, riskType?.label ?? "", riskType?.fg ?? "");
    setDisableModal({ open: false });
  };

  // Handle remediation action click
  const handleRemediationAction = (actionType: string, finding: MockFinding) => {
    setConfirmationDialog({ open: true, actionType, finding });
    setRescanAndClose(true); // Reset to checked when opening dialog
  };

  // Handle remediation action confirmation
  const handleRemediationConfirm = () => {
    // Close dialog - in a real implementation, this would trigger the actual action
    setConfirmationDialog({ open: false, actionType: '', finding: null });
  };

  // Helper to determine datastore type from finding
  const getDatastoreType = (finding: MockFinding | null): 'saas' | 'iaas-paas-onprem' | null => {
    if (!finding) return null;
    
    // Look for store or destination nodes in topology
    const datastoreNode = finding.topology.nodes.find(n => n.type === 'store' || n.type === 'destination');
    if (!datastoreNode) return null;
    
    const sublabel = datastoreNode.sublabel.toLowerCase();
    
    // SaaS platforms
    const saasPlatforms = ['google drive', 'sharepoint', 'onedrive', 'salesforce', 'microsoft 365', 'github', 'slack', 'box', 'dropbox'];
    if (saasPlatforms.some(platform => sublabel.includes(platform))) {
      return 'saas';
    }
    
    // IaaS/PaaS/On-prem platforms
    const iaasPatterns = ['aws', 's3', 'rds', 'azure', 'blob', 'sql', 'postgresql', 'oracle', 'mysql'];
    if (iaasPatterns.some(pattern => sublabel.includes(pattern))) {
      return 'iaas-paas-onprem';
    }
    
    // Default to IaaS/PaaS/On-prem if unclear
    return 'iaas-paas-onprem';
  };

  // Helper to extract unique data stores and destinations from findings
  const getUniqueDataStores = (): Array<{ label: string; sublabel: string; count: number }> => {
    const storeMap = new Map<string, { label: string; sublabel: string; count: number }>();
    
    findings.forEach(finding => {
      finding.topology.nodes.forEach(node => {
        if (node.type === 'store' || node.type === 'destination') {
          const existing = storeMap.get(node.label);
          if (existing) {
            existing.count++;
          } else {
            storeMap.set(node.label, {
              label: node.label,
              sublabel: node.sublabel,
              count: 1,
            });
          }
        }
      });
    });
    
    return Array.from(storeMap.values()).sort((a, b) => b.count - a.count);
  };

  // Helper to count findings that would be closed
  const getCloseFindingCount = (): number => {
    if (closeFindingMode === 'all') {
      return findings.length;
    }
    
    // Count findings that have at least one selected data store
    return findings.filter(finding => {
      return finding.topology.nodes.some(node => {
        if (node.type === 'store' || node.type === 'destination') {
          return selectedDataStores.has(node.label);
        }
        return false;
      });
    }).length;
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 50, background: "var(--background)" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 border-b"
        style={{ height: 44, borderColor: "var(--color-border)", background: "var(--color-card)" }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <ArrowLeft size={13} />
          Back to Risk Graph
        </button>
        <span className="text-border" style={{ fontSize: "16px" }}>|</span>

        {/* Disabled badge */}
        {disabledEntry && (
          <span
            className="flex items-center gap-1 rounded px-2 py-0.5"
            style={{
              fontSize: "10px", fontWeight: 600,
              color: "#f97316", background: "rgba(249,115,22,0.12)",
              border: "1px solid rgba(249,115,22,0.25)",
            }}
          >
            <VolumeX size={10} />
            {disabledEntry.disableType === "full" ? "Policy Disabled" : "Partially Disabled"}
          </span>
        )}

        {/* View Muted Rules link */}
        <button
          onClick={() => navigate("/risk/muted")}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          style={{ fontSize: "12px" }}
        >
          <Volume2 size={13} />
          View Muted Policies
        </button>
      </div>

      {/* ── Rule Header (full width) ──────────────────────────────────────── */}
      <div
        className="shrink-0 px-5 pt-4 pb-4 border-b relative"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Bulk Actions, Close Finding, and Disable Rule buttons - moved to upper right */}
        <div className="absolute top-4 right-5 flex items-center gap-2">
          {/* Bulk Actions button */}
          <button
            onClick={() => setActionMenuModal(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 border transition-colors text-foreground hover:bg-muted"
            style={{ 
              fontSize: "11px", 
              borderColor: "var(--color-border)",
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground)",
            }}
          >
            Bulk Actions
          </button>

          {/* Close Finding button */}
          <button
            onClick={() => setCloseFindingModal(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 border transition-colors hover:bg-red-500/10"
            style={{ 
              fontSize: "11px", 
              borderColor: "#ef4444",
              color: "#ef4444",
            }}
          >
            <XCircle size={11} />
            Close Finding
          </button>

          {/* Disable rule button / disabled indicator */}
          {fullyDisabled ? (
            <span
              className="flex items-center gap-1 rounded px-2 py-0.5"
              style={{
                fontSize: "10px", fontWeight: 600,
                color: "#f97316", background: "rgba(249,115,22,0.1)",
              }}
            >
              <VolumeX size={10} />
              Policy muted
            </span>
          ) : (
            <button
              onClick={() => setDisableModal({ open: true, mode: "full" })}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 border transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
              style={{ fontSize: "11px", borderColor: "var(--color-border)" }}
            >
              <VolumeX size={11} />
              Disable Rule
            </button>
          )}
        </div>

        {/* Risk type icon + Rule name + description */}
        <div className="flex items-start gap-3 mb-3" style={{ paddingRight: "280px" }}>
          {riskType && (
            <div
              className="group relative flex items-center justify-center rounded shrink-0"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
              }}
              style={{
                width: 48,
                height: 48,
                background: riskType.bg,
              }}
            >
              {/* Icon matching risk type - using same icons as RiskPage */}
              {riskType.id === "overexposed" && <Eye size={24} style={{ color: riskType.fg }} />}
              {riskType.id === "exfil" && <AlertTriangle size={24} style={{ color: riskType.fg }} />}
              {riskType.id === "overprivilege" && <Lock size={24} style={{ color: riskType.fg }} />}
              {riskType.id === "stale" && <Clock size={24} style={{ color: riskType.fg }} />}
              {riskType.id === "former" && <UserMinus size={24} style={{ color: riskType.fg }} />}
              {riskType.id === "compliance" && <ShieldCheck size={24} style={{ color: riskType.fg }} />}
              
              {/* Tooltip on hover - follows cursor */}
              <span
                className="absolute px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: riskType.fg,
                  background: riskType.bg,
                  border: `1px solid ${riskType.fg}33`,
                  zIndex: 100,
                  left: 'var(--mouse-x, 50%)',
                  top: 'var(--mouse-y, 50%)',
                  transform: 'translate(12px, -50%)',
                }}
              >
                {riskType.label}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.3 }}>
                {rule.name}
              </h2>
              {rule.severity && (() => {
                const sm = SEVERITY_META[rule.severity];
                return (
                  <span style={{
                    fontSize: "10px", fontWeight: 700,
                    padding: "2px 8px", borderRadius: 99,
                    color: sm.color, background: sm.bg,
                    flexShrink: 0,
                  }}>
                    {rule.severity}
                  </span>
                );
              })()}
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "12px", lineHeight: 1.5 }}>
              {rule.description || rule.conditionSummary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span style={{ fontSize: "12px", fontWeight: 600 }}>
            {findings.length} finding{findings.length !== 1 ? "s" : ""}
          </span>

          {/* Severity breakdown - inline with findings count */}
          {findings.length > 0 && <SeverityDistBar findings={findings} />}

          {/* Data Store/Destination bubbles */}
          {findings.length > 0 && <DataStoreBubbles findings={findings} />}
          
          {/* Identity bubbles */}
          {findings.length > 0 && <IdentityBubbles findings={findings} />}
        </div>
      </div>

      {/* ── Body: findings list + right evidence ──────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: findings list ──────────────────────────────────────────── */}
        <div
          className="flex flex-col border-r overflow-hidden"
          style={{ width: 340, borderColor: "var(--color-border)" }}
        >
          {/* Findings list */}
          <div className="flex-1 overflow-y-auto">
            {noFindings ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                <CheckCircle2 size={32} className="text-muted-foreground opacity-40" />
                <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  No active findings for this rule.
                </p>
              </div>
            ) : (
              findings.map(f => (
                <FindingRow
                  key={f.id}
                  finding={f}
                  selected={selectedFinding?.id === f.id}
                  onClick={() => setSelectedFinding(f)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: evidence for selected finding ───────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {selectedFinding ? (
            <EvidencePanel finding={selectedFinding} rule={rule} onRemediationAction={handleRemediationAction} onShowAllActions={() => setAllActionsModal(true)} onCloseFinding={() => { setCloseSingleFindingConfirmed(false); setCloseSingleFindingModal(true); }} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                Select a finding to view evidence and recommendations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Disable modal ────────────────────────────────────────────────────── */}
      {disableModal.open && (
        <DisablePolicyModal
          mode="full"
          rule={rule}
          riskType={riskType}
          onConfirm={handleDisableConfirm}
          onClose={() => setDisableModal({ open: false })}
        />
      )}

      {/* ── Close Finding Modal ──────────────────────────────────────────── */}
      {closeFindingModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100, background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => {
            setCloseFindingModal(false);
            setCloseFindingMode('all');
            setSelectedDataStores(new Set());
            setSearchQuery('');
            setConfirmCloseFinding(false);
          }}
        >
          <div
            className="bg-card rounded-lg p-6"
            style={{
              width: 600,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
              Close Finding
            </h3>
            
            <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", marginBottom: "20px", lineHeight: 1.6 }}>
              Choose which findings to close:
            </p>
            
            {/* Option 1: Close all findings */}
            <label 
              className="flex items-start gap-3 p-3 rounded-lg border mb-3 cursor-pointer transition-colors hover:bg-muted"
              style={{
                borderColor: "var(--color-border)",
                background: closeFindingMode === 'all' ? "var(--color-muted)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="closeFindingMode"
                checked={closeFindingMode === 'all'}
                onChange={() => setCloseFindingMode('all')}
                className="mt-0.5"
                style={{ width: "14px", height: "14px", cursor: "pointer" }}
              />
              <div className="flex-1">
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Close all {findings.length} finding{findings.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
                  All findings for this rule will be closed
                </div>
              </div>
            </label>
            
            {/* Option 2: Close by data store/destination */}
            <label 
              className="flex items-start gap-3 p-3 rounded-lg border mb-3 cursor-pointer transition-colors hover:bg-muted"
              style={{
                borderColor: "var(--color-border)",
                background: closeFindingMode === 'selective' ? "var(--color-muted)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="closeFindingMode"
                checked={closeFindingMode === 'selective'}
                onChange={() => setCloseFindingMode('selective')}
                className="mt-0.5"
                style={{ width: "14px", height: "14px", cursor: "pointer" }}
              />
              <div className="flex-1">
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Close findings by data store/destination
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
                  Select which data stores or destinations to close findings for
                </div>
              </div>
            </label>
            
            {/* Selective mode: show data store list */}
            {closeFindingMode === 'selective' && (
              <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
                {/* Search box */}
                <div className="relative mb-3">
                  <Search 
                    size={14} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
                  />
                  <input
                    type="text"
                    placeholder="Search data stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded border"
                    style={{
                      fontSize: "12px",
                      borderColor: "var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                </div>
                
                {/* Data store list */}
                <div 
                  className="flex-1 overflow-y-auto border rounded-lg"
                  style={{ 
                    borderColor: "var(--color-border)",
                    maxHeight: "300px",
                  }}
                >
                  {getUniqueDataStores()
                    .filter(store => 
                      searchQuery === '' || 
                      store.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      store.sublabel.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((store, idx) => (
                      <label
                        key={store.label}
                        className="flex items-center gap-3 px-3 py-2.5 border-b cursor-pointer hover:bg-muted transition-colors"
                        style={{
                          borderBottomColor: "var(--color-border)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDataStores.has(store.label)}
                          onChange={(e) => {
                            const newSet = new Set(selectedDataStores);
                            if (e.target.checked) {
                              newSet.add(store.label);
                            } else {
                              newSet.delete(store.label);
                            }
                            setSelectedDataStores(newSet);
                          }}
                          style={{ width: "14px", height: "14px", cursor: "pointer" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: "12px", fontWeight: 500 }}>
                            {store.label}
                          </div>
                          <div 
                            className="text-muted-foreground truncate" 
                            style={{ fontSize: "10px" }}
                          >
                            {store.sublabel}
                          </div>
                        </div>
                        <div
                          className="shrink-0 rounded-full px-2"
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            background: "var(--color-muted)",
                            color: "var(--color-muted-foreground)",
                          }}
                        >
                          {store.count} finding{store.count !== 1 ? 's' : ''}
                        </div>
                      </label>
                    ))}
                </div>
                
              </div>
            )}
            
            {/* Confirmation checkbox - always visible */}
            <label
              className="flex items-start gap-2 mt-4 p-2.5 rounded border cursor-pointer"
              style={{
                fontSize: "11px",
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "#ef4444",
                color: "var(--color-card-foreground)",
              }}
            >
              <input
                type="checkbox"
                checked={confirmCloseFinding}
                onChange={(e) => setConfirmCloseFinding(e.target.checked)}
                className="mt-0.5"
                style={{ width: "14px", height: "14px", cursor: "pointer" }}
              />
              <span style={{ lineHeight: 1.5 }}>
                Confirm that {getCloseFindingCount()} finding{getCloseFindingCount() !== 1 ? 's' : ''} will be closed
              </span>
            </label>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3 justify-end mt-4">
              <button
                onClick={() => {
                  setCloseFindingModal(false);
                  setCloseFindingMode('all');
                  setSelectedDataStores(new Set());
                  setSearchQuery('');
                  setConfirmCloseFinding(false);
                }}
                className="px-4 py-2 rounded border"
                style={{
                  fontSize: "12px",
                  borderColor: "var(--color-border)",
                  color: "var(--color-muted-foreground)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Close modal - in real implementation, this would close the findings
                  setCloseFindingModal(false);
                  setCloseFindingMode('all');
                  setSelectedDataStores(new Set());
                  setSearchQuery('');
                  setConfirmCloseFinding(false);
                }}
                disabled={!confirmCloseFinding || (closeFindingMode === 'selective' && selectedDataStores.size === 0)}
                className="px-4 py-2 rounded"
                style={{
                  fontSize: "12px",
                  background: !confirmCloseFinding || (closeFindingMode === 'selective' && selectedDataStores.size === 0)
                    ? "var(--color-muted)" 
                    : "#ef4444",
                  color: !confirmCloseFinding || (closeFindingMode === 'selective' && selectedDataStores.size === 0)
                    ? "var(--color-muted-foreground)" 
                    : "white",
                  cursor: !confirmCloseFinding || (closeFindingMode === 'selective' && selectedDataStores.size === 0)
                    ? "not-allowed" 
                    : "pointer",
                }}
              >
                Close {getCloseFindingCount()} Finding{getCloseFindingCount() !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Menu Modal ──────────────────────────────────────────────── */}
      {actionMenuModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100, background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => {
            setActionMenuModal(false);
            setActiveConfigAction(null);
          }}
        >
          <div
            className="bg-card rounded-lg"
            style={{
              width: activeConfigAction ? 1060 : 500,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "row",
              transition: "width 0.2s ease-in-out"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Panel - Action List */}
            <div
              style={{
                width: 500,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                borderRight: activeConfigAction ? "1px solid var(--color-border)" : "none",
                overflow: "hidden",
              }}
            >
              <ActionMenuList
                mode="bulk"
                activeConfigAction={activeConfigAction}
                onConfigOpen={setActiveConfigAction}
                onClose={() => {
                  setActionMenuModal(false);
                  setActiveConfigAction(null);
                }}
                onExecute={() => {
                  setActionMenuModal(false);
                  setActiveConfigAction(null);
                }}
              />
            </div>

            {/* Right Panel - Action Configuration */}
            {activeConfigAction && (
              <div
                style={{
                  width: 550,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}
              >
                {/* Config panel header with close */}
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
                {/* Render configuration panel based on active action */}
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
      )}

      {/* ── All Actions Modal ──────────────────────────────────────────────── */}
      {allActionsModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100, background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => {
            setAllActionsModal(false);
            setActiveConfigAction(null);
          }}
        >
          <div
            className="bg-card rounded-lg flex"
            style={{
              width: activeConfigAction ? 1150 : 600,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "85vh",
              transition: "width 0.2s ease-in-out"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Panel - Action Selection */}
            <div
              style={{
                width: 600,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                borderRight: activeConfigAction ? "1px solid var(--color-border)" : "none",
                overflow: "hidden",
              }}
            >
              <ActionMenuList
                mode="single"
                activeConfigAction={activeConfigAction}
                selectedFinding={selectedFinding}
                onConfigOpen={setActiveConfigAction}
                onClose={() => {
                  setAllActionsModal(false);
                  setActiveConfigAction(null);
                }}
                onExecute={() => {
                  setAllActionsModal(false);
                  setActiveConfigAction(null);
                }}
              />
            </div>

            {/* Right Panel - Action Configuration */}
            {activeConfigAction && (
              <div
                style={{
                  width: 550,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "85vh",
                  overflowY: "auto",
                  borderLeft: "1px solid var(--color-border)",
                }}
              >
                {/* Config panel header with close */}
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
                <div className="flex-1">
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
      )}

      {/* ── Close Single Finding Modal ───────────────────────────────────── */}
      {closeSingleFindingModal && selectedFinding && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 110, background: "rgba(0,0,0,0.55)" }}
          onClick={() => { setCloseSingleFindingModal(false); setCloseSingleFindingConfirmed(false); }}
        >
          <div
            className="bg-card rounded-lg p-6"
            style={{ width: 440, position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setCloseSingleFindingModal(false); setCloseSingleFindingConfirmed(false); }}
              className="absolute top-4 right-4 flex items-center justify-center rounded-lg p-1.5 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: 6 }}>Close Finding</h3>
            <p className="text-muted-foreground" style={{ fontSize: "12px", lineHeight: 1.6, marginBottom: 20 }}>
              This will close the selected finding only. This action cannot be undone.
            </p>

            {/* Finding summary */}
            <div
              className="rounded-lg px-3 py-2.5 mb-5"
              style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)" }}
            >
              <p style={{ fontSize: "12px", fontWeight: 600, marginBottom: 2 }}>
                {selectedFinding.topology?.nodes?.find(n => n.type === "store")?.label ?? "Finding"}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                {selectedFinding.matchedCondition ?? selectedFinding.id}
              </p>
            </div>

            {/* Confirmation checkbox */}
            <label
              className="flex items-start gap-2 p-2.5 rounded border cursor-pointer mb-5"
              style={{ fontSize: "11px", background: "rgba(239,68,68,0.08)", borderColor: "#ef4444" }}
            >
              <input
                type="checkbox"
                checked={closeSingleFindingConfirmed}
                onChange={(e) => setCloseSingleFindingConfirmed(e.target.checked)}
                style={{ width: 13, height: 13, marginTop: 2, cursor: "pointer" }}
              />
              <span style={{ lineHeight: 1.5 }}>I confirm I want to close this finding</span>
            </label>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setCloseSingleFindingModal(false); setCloseSingleFindingConfirmed(false); }}
                className="px-4 py-2 rounded border"
                style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setCloseSingleFindingModal(false); setCloseSingleFindingConfirmed(false); }}
                disabled={!closeSingleFindingConfirmed}
                className="px-4 py-2 rounded"
                style={{
                  fontSize: "12px",
                  background: closeSingleFindingConfirmed ? "#ef4444" : "var(--color-muted)",
                  color: closeSingleFindingConfirmed ? "white" : "var(--color-muted-foreground)",
                  cursor: closeSingleFindingConfirmed ? "pointer" : "not-allowed",
                }}
              >
                Close Finding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remediation Confirmation Dialog ──────────────────────────────── */}
      {confirmationDialog.open && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100, background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setConfirmationDialog({ open: false, actionType: '', finding: null })}
        >
          <div
            className="bg-card rounded-lg p-6 max-w-md border"
            style={{ borderColor: "var(--color-border)", minWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>
                Confirm Action
              </h3>
              <button
                onClick={() => setConfirmationDialog({ open: false, actionType: '', finding: null })}
                className="rounded p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "var(--color-muted-foreground)", marginBottom: "16px", lineHeight: 1.6 }}>
              You are about to apply <strong style={{ color: "var(--color-foreground)" }}>{getActionLabel(confirmationDialog.actionType)}</strong> to this finding.
            </p>
            
            {/* Rescan and close checkbox */}
            <div className="mb-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rescanAndClose}
                  onChange={(e) => setRescanAndClose(e.target.checked)}
                  className="mt-0.5"
                  style={{ width: "14px", height: "14px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>
                  Rescan and close finding
                </span>
              </label>
              
              {/* Banner note when checked */}
              {rescanAndClose && (() => {
                const datastoreType = getDatastoreType(confirmationDialog.finding);
                const isSaaS = datastoreType === 'saas';
                return (
                  <div
                    className="mt-2 p-2.5 rounded border"
                    style={{
                      fontSize: "10px",
                      lineHeight: 1.5,
                      background: "var(--color-muted)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    {isSaaS ? (
                      <>
                        This finding will be marked for <strong>immediate rescan</strong> (SaaS datastore detected).
                      </>
                    ) : (
                      <>
                        This finding will be marked for rescan at the <strong>next scheduled rescan</strong> (IaaS/PaaS/On-prem datastore detected).
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmationDialog({ open: false, actionType: '', finding: null })}
                className="px-4 py-2 rounded border"
                style={{
                  fontSize: "12px",
                  borderColor: "var(--color-border)",
                  color: "var(--color-muted-foreground)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemediationConfirm}
                className="px-4 py-2 rounded"
                style={{
                  fontSize: "12px",
                  background: "var(--color-primary)",
                  color: "var(--color-primary-foreground)",
                }}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}