import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Users, UserCheck, UserX, Terminal, Server, Bot, Package,
  AlertTriangle, Eye, Lock, Clock, UserMinus, ShieldCheck,
  HardDrive, Building2, Cloud, Layers, Database, Monitor, Globe,
  Filter, ZoomIn, ZoomOut, RotateCcw, ChevronDown, Plus, ChevronRight,
  AppWindow, Usb, CheckCircle2, X, ListChecks,
} from "lucide-react";
import {
  RISK_TYPES, IR_EDGES, RD_EDGES,
  POLICY_ENGINES,
} from "../../shared/risk-rules";
import type { RiskRule, RiskTypeDef } from "../../shared/risk-rules";
import { SeverityBadge } from "../ui/SeverityBadge";
import { RiskTypeIcon } from "../ui/RiskTypeIcon";
import { DataStoreIcon } from "../inventory/data-store-icons";

import { PolicyPage } from "./PolicyPage";
import { getImplicatedCounts, countFindingsForRule, getAnnotatedFindingSummaries } from "../../shared/risk-findings";
import type { FindingFilter } from "../../shared/risk-findings";
import { ScanExplorer } from "./ScanExplorer";


// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType = "identity" | "risk" | "datastore";
interface PathDef { key: string; d: string; fromId: string; toId: string; segment: "ir" | "rd"; }
type IconComp = ComponentType<{ size?: number; className?: string }>;

interface IdentityNodeDef  { id: string; label: string; badge: number; total: number; Icon: IconComp; }
interface DataStoreNodeDef { id: string; label: string; badge: number | string; total: number; managed: boolean; Icon?: IconComp; }

// ── Individual records (used in detail panel) ─────────────────────────────────

const IDENTITY_RECORDS = [
  { id: "alice-chen",        name: "Alice Chen",         type: "internal",       role: "Data Engineer",  dept: "Data"        },
  { id: "brian-kowalski",    name: "Brian Kowalski",     type: "internal",       role: "Analyst",        dept: "Analytics"   },
  { id: "diana-reyes",       name: "Diana Reyes",        type: "internal",       role: "SOC Lead",       dept: "Security"    },
  { id: "bob-martin",        name: "Bob Martin",         type: "internal",       role: "Engineer",       dept: "Engineering" },
  { id: "james-thornton",    name: "James Thornton",     type: "external",       role: "Partner",        dept: "External"    },
  { id: "priya-nair",        name: "Priya Nair",         type: "external",       role: "Contractor",     dept: "External"    },
  { id: "anon-http-01",      name: "anon-http-01",       type: "unauthenticated",role: "Unknown",        dept: "Unknown"     },
  { id: "anon-http-02",      name: "anon-http-02",       type: "unauthenticated",role: "Unknown",        dept: "Unknown"     },
  { id: "root",              name: "root",               type: "local",          role: "Local Account",  dept: "System"      },
  { id: "postgres",          name: "postgres",           type: "local",          role: "Local Account",  dept: "System"      },
  { id: "oracledb-admin",    name: "oracledb_admin",     type: "local",          role: "Local Account",  dept: "System"      },
  { id: "svc-reporting",     name: "svc_reporting",      type: "local",          role: "Local Account",  dept: "System"      },
  { id: "svc-etl",           name: "svc_etl",            type: "local",          role: "Local Account",  dept: "System"      },
  { id: "cicd-pipeline",     name: "CI/CD Pipeline",     type: "service",        role: "Service Account",dept: "DevOps"      },
  { id: "data-sync-bot",     name: "Data Sync Bot",      type: "service",        role: "Service Account",dept: "Data"        },
  { id: "svc-backend-api",   name: "svc-backend-api",    type: "service",        role: "Service Account",dept: "Engineering" },
  { id: "svc-payment-proc",  name: "svc-payment-proc",   type: "service",        role: "Service Account",dept: "Finance"     },
  { id: "svc-analytics",     name: "svc-analytics",      type: "service",        role: "Service Account",dept: "Analytics"   },
  { id: "support-copilot",   name: "Support Copilot",    type: "agent",          role: "AI Agent",       dept: "Support"     },
  { id: "code-reviewer",     name: "Code Reviewer",      type: "agent",          role: "AI Agent",       dept: "Engineering" },
  { id: "data-classifier",   name: "Data Classifier",    type: "agent",          role: "AI Agent",       dept: "Security"    },
  { id: "threat-scanner",    name: "Threat Scanner",     type: "agent",          role: "AI Agent",       dept: "Security"    },
  { id: "data-pipeline-prod",name: "data-pipeline-prod", type: "agent",          role: "AI Agent",       dept: "Data"        },
  { id: "clinical-etl-svc",  name: "clinical-etl-svc",   type: "third-party",    role: "3rd Party App",  dept: "External"    },
  { id: "ext-api-partner",   name: "ext-api.partner.io", type: "third-party",    role: "3rd Party App",  dept: "External"    },
  { id: "slack-webhook-prod",name: "slack-webhook-prod",  type: "third-party",    role: "3rd Party App",  dept: "External"    },
] as const;

const DATASTORE_RECORDS = [
  { id: "d1",    name: "Engineering Shared Drive",  platform: "Google Drive", group: "google-drive", dataTypeCount: 6  },
  { id: "d2",    name: "Finance Team Drive",         platform: "Google Drive", group: "google-drive", dataTypeCount: 5  },
  { id: "d3",    name: "HR Confidential",            platform: "Google Drive", group: "google-drive", dataTypeCount: 9  },
  { id: "d4",    name: "Marketing Assets",           platform: "Google Drive", group: "google-drive", dataTypeCount: 3  },
  { id: "sp1",   name: "Legal – Contracts",          platform: "SharePoint",   group: "sharepoint",   dataTypeCount: 6  },
  { id: "sp2",   name: "HR – Employee Portal",       platform: "SharePoint",   group: "sharepoint",   dataTypeCount: 7  },
  { id: "sp3",   name: "Product – Roadmap Hub",      platform: "SharePoint",   group: "sharepoint",   dataTypeCount: 3  },
  { id: "s1",    name: "prod-data-lake",             platform: "AWS S3",       group: "aws-s3",       dataTypeCount: 8  },
  { id: "s2",    name: "analytics-staging",          platform: "AWS S3",       group: "aws-s3",       dataTypeCount: 5  },
  { id: "s3",    name: "ml-training-data",           platform: "AWS S3",       group: "aws-s3",       dataTypeCount: 8  },
  { id: "ab1",   name: "compliance-archive",         platform: "Azure Blob",   group: "azure-blob",   dataTypeCount: 6  },
  { id: "ab2",   name: "customer-uploads",           platform: "Azure Blob",   group: "azure-blob",   dataTypeCount: 5  },
  { id: "ab3",   name: "research-datasets",          platform: "Azure Blob",   group: "azure-blob",   dataTypeCount: 7  },
  { id: "pg1",   name: "PGSRV-PROD-01",             platform: "PostgreSQL",   group: "postgresql",   dataTypeCount: 9  },
  { id: "pg2",   name: "PGSRV-PROD-02",             platform: "PostgreSQL",   group: "postgresql",   dataTypeCount: 7  },
  { id: "pg3",   name: "PGSRV-DEV-01",              platform: "PostgreSQL",   group: "postgresql",   dataTypeCount: 5  },
  { id: "pg4",   name: "PGSRV-LEGACY",              platform: "PostgreSQL",   group: "postgresql",   dataTypeCount: 10 },
  { id: "ora1",  name: "ORACLEDB-PROD-01",          platform: "Oracle DB",    group: "oracle",       dataTypeCount: 8  },
  { id: "ora2",  name: "ORACLEDB-PROD-02",          platform: "Oracle DB",    group: "oracle",       dataTypeCount: 6  },
  { id: "ora3",  name: "ORACLEDB-LEGACY",           platform: "Oracle DB",    group: "oracle",       dataTypeCount: 11 },
  { id: "rds1",  name: "prod-users-db",             platform: "AWS RDS",      group: "aws-rds",      dataTypeCount: 8  },
  { id: "rds2",  name: "prod-orders-db",            platform: "AWS RDS",      group: "aws-rds",      dataTypeCount: 6  },
  { id: "rds3",  name: "analytics-warehouse",       platform: "AWS RDS",      group: "aws-rds",      dataTypeCount: 5  },
  { id: "rds4",  name: "staging-hr-db",             platform: "AWS RDS",      group: "aws-rds",      dataTypeCount: 8  },
  { id: "asql1", name: "acme-prod-customers",       platform: "Azure SQL",    group: "azure-sql",    dataTypeCount: 6  },
  { id: "asql2", name: "acme-prod-hr",              platform: "Azure SQL",    group: "azure-sql",    dataTypeCount: 8  },
  { id: "asql3", name: "acme-analytics-dw",         platform: "Azure SQL",    group: "azure-sql",    dataTypeCount: 4  },
  { id: "ep1",   name: "MacBook Pro – Alice Chen",  platform: "Endpoint",     group: "endpoints",    dataTypeCount: 5  },
  { id: "ep2",   name: "ThinkPad X1 – Bob Martin",  platform: "Endpoint",     group: "endpoints",    dataTypeCount: 4  },
  { id: "ep3",   name: "Surface Pro – Carol Kim",   platform: "Endpoint",     group: "endpoints",    dataTypeCount: 4  },
  { id: "ep4",   name: "MacBook Air – Dave Singh",  platform: "Endpoint",     group: "endpoints",    dataTypeCount: 4  },
  { id: "ep5",   name: "Dell Latitude – Eve Lopez", platform: "Endpoint",     group: "endpoints",    dataTypeCount: 4  },
] as const;

// ── Node definitions ──────────────────────────────────────────────────────────

// Compute implicated counts once at module load time
const { identities: _iCounts, stores: _sCounts } = getImplicatedCounts();

// Compute total-member counts from master records
const _identityTotals = (IDENTITY_RECORDS as readonly { type: string }[]).reduce<Record<string, number>>(
  (acc, r) => { acc[r.type] = (acc[r.type] ?? 0) + 1; return acc; }, {}
);
const _datastoreTotals = (DATASTORE_RECORDS as readonly { group: string }[]).reduce<Record<string, number>>(
  (acc, r) => { acc[r.group] = (acc[r.group] ?? 0) + 1; return acc; }, {}
);

const IDENTITY_NODES: IdentityNodeDef[] = [
  { id: "internal",        label: "Internal User",         badge: _iCounts["internal"]        ?? 0, total: _identityTotals["internal"]        ?? 0, Icon: Users     },
  { id: "external",        label: "External User",         badge: _iCounts["external"]        ?? 0, total: _identityTotals["external"]        ?? 0, Icon: UserCheck },
  { id: "unauthenticated", label: "Unauthenticated User",  badge: _iCounts["unauthenticated"] ?? 0, total: _identityTotals["unauthenticated"] ?? 0, Icon: UserX     },
  { id: "local",           label: "Unmapped",               badge: _iCounts["local"]           ?? 0, total: _identityTotals["local"]           ?? 0, Icon: Terminal  },
  { id: "service",         label: "Service Account",       badge: _iCounts["service"]         ?? 0, total: _identityTotals["service"]         ?? 0, Icon: Server    },
  { id: "agent",           label: "Agentic Identity",      badge: _iCounts["agent"]           ?? 0, total: _identityTotals["agent"]           ?? 0, Icon: Bot       },
  { id: "third-party",     label: "Connected App",         badge: _iCounts["third-party"]     ?? 0, total: _identityTotals["third-party"]     ?? 0, Icon: Package   },
];

const DATASTORE_NODES: DataStoreNodeDef[] = [
  { id: "google-drive",  label: "Google Drive",        badge: _sCounts["google-drive"] ?? 0, total: _datastoreTotals["google-drive"] ?? 0, managed: true  },
  { id: "sharepoint",    label: "SharePoint Site",     badge: _sCounts["sharepoint"]   ?? 0, total: _datastoreTotals["sharepoint"]   ?? 0, managed: true  },
  { id: "aws-s3",        label: "AWS S3 Bucket",       badge: _sCounts["aws-s3"]       ?? 0, total: _datastoreTotals["aws-s3"]       ?? 0, managed: true  },
  { id: "aws-rds",       label: "AWS RDS Database",    badge: _sCounts["aws-rds"]      ?? 0, total: _datastoreTotals["aws-rds"]      ?? 0, managed: true  },
  { id: "azure-blob",    label: "Azure Blob Storage",  badge: _sCounts["azure-blob"]   ?? 0, total: _datastoreTotals["azure-blob"]   ?? 0, managed: true  },
  { id: "azure-sql",     label: "Azure SQL Database",  badge: _sCounts["azure-sql"]    ?? 0, total: _datastoreTotals["azure-sql"]    ?? 0, managed: true  },
  { id: "postgresql",    label: "PostgreSQL Instance", badge: _sCounts["postgresql"]   ?? 0, total: _datastoreTotals["postgresql"]   ?? 0, managed: true  },
  { id: "oracle",        label: "Oracle Instance",     badge: _sCounts["oracle"]       ?? 0, total: _datastoreTotals["oracle"]       ?? 0, managed: true  },
  { id: "endpoints",     label: "Endpoint User Device",badge: _sCounts["endpoints"]    ?? 0, total: _datastoreTotals["endpoints"]    ?? 0, managed: true,  Icon: Monitor    },
  { id: "apps",          label: "Application",         badge: _sCounts["apps"]         ?? 0, total: 247, managed: false, Icon: AppWindow },
  { id: "websites",      label: "Website",             badge: _sCounts["websites"]     ?? 0, total: 189, managed: false, Icon: Globe     },
  { id: "peripherals",   label: "Device Peripheral",   badge: _sCounts["peripherals"]  ?? 0, total: 56,  managed: false, Icon: Usb       },
];

// ── Zero-finding node sets (computed once at module load) ─────────────────────
// Nodes whose implicated/findings count is 0 are never "active" in the graph.

const _zeroIdentityIds = new Set(
  IDENTITY_NODES.filter(n => n.badge === 0).map(n => n.id)
);
const _zeroStoreIds = new Set(
  DATASTORE_NODES.filter(n => n.badge === 0).map(n => n.id)
);
const _zeroRiskTypeIds = new Set(
  RISK_TYPES
    .filter(rt => rt.rules.reduce((s, r) => s + countFindingsForRule(r.id), 0) === 0)
    .map(rt => rt.id)
);

// ── Icon map for risk types ── imported from RiskTypeIcon component ───────────

// ── Edge severity-weighted scores (computed once at module load) ───────────────
//
// Strategy: A+C hybrid — sum severity weights per finding per edge, log-scaled.
//   Critical = 3  ·  High = 2  ·  Medium = 1
//
// IR edge key: "ir:{identityGroupId}>{riskTypeId}"
// RD edge key: "rd:{riskTypeId}>{datastoreGroupId}"

const _SEVERITY_W: Record<string, number> = { Critical: 3, High: 2, Medium: 1 };

// Build ruleId → riskTypeId lookup
const _ruleRiskType = new Map<string, string>();
for (const rt of RISK_TYPES) {
  for (const rule of rt.rules) _ruleRiskType.set(rule.id, rt.id);
}

const _edgeScores: Map<string, number> = (() => {
  const scores = new Map<string, number>();
  const add = (key: string, w: number) => scores.set(key, (scores.get(key) ?? 0) + w);

  for (const f of getAnnotatedFindingSummaries()) {
    const riskTypeId = _ruleRiskType.get(f.ruleId);
    if (!riskTypeId) continue;
    const w = _SEVERITY_W[f.severity] ?? 1;

    // IR edge
    if (f.identityGroupId) add(`ir:${f.identityGroupId}>${riskTypeId}`, w);

    // RD edge
    if (f.datastoreGroupId) add(`rd:${riskTypeId}>${f.datastoreGroupId}`, w);
  }
  return scores;
})();

const _maxEdgeScore = Math.max(0, ..._edgeScores.values());

/** Map a raw score to a stroke width in [minW, maxW] using log scaling. */
function scoreToStrokeWidth(score: number, minW = 1, maxW = 5.5): number {
  if (score === 0 || _maxEdgeScore === 0) return minW;
  return minW + (maxW - minW) * Math.log(1 + score) / Math.log(1 + _maxEdgeScore);
}

// ── Active set computation ────────────────────────────────────────────────────

type ActiveSet = { iIds: Set<string>; rIds: Set<string>; dIds: Set<string> };

interface MultiSel { identity: string | null; risk: string | null; datastore: string | null; }

/**
 * The three right-column node IDs that all derive from the "unmanaged" rule bucket.
 * Findings for these rules are annotated as any one of the three by storeCategory(),
 * so when ANY of them is selected we must accept findings from all three.
 */
const UNMANAGED_DS_IDS = new Set(["apps", "websites", "peripherals"]);

/**
 * Enumerate every valid complete path (i → r → d) that satisfies the current
 * node-slot selections, then collect the participating nodes into an ActiveSet.
 * Unset slots are unconstrained — only set slots must match.
 * 
 * IMPORTANT: Only includes risk types that have at least one rule with findings
 * for the selected identity/datastore combination.
 */
function computeMultiActiveSet(sel: MultiSel): ActiveSet | null {
  if (!sel.identity && !sel.risk && !sel.datastore) return null;
  
  const iIds = new Set<string>();
  const rIds = new Set<string>();
  const dIds = new Set<string>();
  
  // When the selected datastore is one of the three unmanaged split-nodes,
  // expand the filter to all three — findings can be annotated as any of them.
  const dsFilterIds: Set<string> | null = sel.datastore
    ? UNMANAGED_DS_IDS.has(sel.datastore) ? UNMANAGED_DS_IDS : new Set([sel.datastore])
    : null;

  // Build a filter for counting findings based on current selection
  const filter: FindingFilter | undefined = (sel.identity || sel.datastore) ? {
    identityGroupIds: sel.identity ? new Set([sel.identity]) : null,
    datastoreGroupIds: dsFilterIds,
  } : undefined;
  
  IR_EDGES.forEach(([iId, rId]) => {
    if (sel.identity && iId !== sel.identity) return;
    if (sel.risk && rId !== sel.risk) return;
    
    // Check if this risk type has at least one rule with findings for the current filter
    const riskType = RISK_TYPES.find(rt => rt.id === rId);
    if (!riskType) return;
    
    const hasFindings = riskType.rules.some(rule => {
      // Always check if the rule's identityTypes includes this specific identity
      if (!rule.identityTypes.includes(iId)) return false;
      // Check if this rule has findings (considering the filter if one exists)
      return countFindingsForRule(rule.id, filter) > 0;
    });
    
    if (!hasFindings) return; // Skip this risk type if it has no findings
    
    RD_EDGES.forEach(([rId2, dId]) => {
      if (rId2 !== rId) return;
      if (sel.datastore && dId !== sel.datastore) return;
      
      // Double-check that there's at least one rule connecting this identity→risk→datastore with findings
      const hasPath = riskType.rules.some(rule => {
        // Always check if the rule's identityTypes includes this specific identity
        if (!rule.identityTypes.includes(iId)) return false;
        const normD = ["apps", "websites", "peripherals"].includes(dId) ? "unmanaged" : dId;
        // Always check if the rule's dataStoreGroups includes this datastore
        if (!rule.dataStoreGroups.includes(normD)) return false;
        return countFindingsForRule(rule.id, filter) > 0;
      });
      
      if (!hasPath) return; // Skip this path if there are no findings
      
      iIds.add(iId); rIds.add(rId); dIds.add(dId);
    });
  });
  
  return { iIds, rIds, dIds };
}

/** Derive which nodes are touched by a set of selected bezier-path keys. */
function computePathActiveSet(selectedPaths: Set<string>): ActiveSet | null {
  if (selectedPaths.size === 0) return null;
  const iIds = new Set<string>();
  const rIds = new Set<string>();
  const dIds = new Set<string>();
  for (const key of selectedPaths) {
    if (key.startsWith("ir:")) {
      const [iId, rId] = key.slice(3).split(">");
      iIds.add(iId); rIds.add(rId);
    } else if (key.startsWith("rd:")) {
      const [rId, dId] = key.slice(3).split(">");
      rIds.add(rId); dIds.add(dId);
    }
  }
  return { iIds, rIds, dIds };
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function CountBadge({ count }: { count: number | string }) {
  const display = typeof count === "number" && count > 99 ? "99+" : count;
  return (
    <span
      title="Distinct entities implicated in findings"
      className="flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0"
      style={{ fontSize: "9px", fontWeight: 700, minWidth: 18, height: 16, padding: "0 4px" }}>
      {display}
    </span>
  );
}

function EngineTag({ engine }: { engine: string }) {
  const cfg = POLICY_ENGINES[engine as keyof typeof POLICY_ENGINES];
  if (!cfg) return null;
  return (
    <span className="shrink-0 rounded"
      style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", color: cfg.color, background: cfg.bg, letterSpacing: "0.04em" }}>
      {cfg.short}
    </span>
  );
}

// ── Node cards ────────────────────────────────────────────────────────────────

function CardShell({ active, selected, width, elRef, onClick, children }: {
  active: boolean; selected: boolean; width: number;
  elRef: (el: HTMLDivElement | null) => void;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div ref={elRef} onClick={active ? onClick : undefined}
      className={`relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl border bg-card select-none ${
        active ? "cursor-pointer" : "cursor-default"
      } ${
        selected ? "border-primary/50"
        : active  ? "border-border hover:border-primary/30"
        : "border-border"}`}
      style={{
        width,
        opacity: active ? 1 : 0.22,
        transition: "opacity 0.18s, box-shadow 0.18s",
        boxShadow: selected
          ? "0 0 0 1px rgba(59,130,246,0.3)"
          : "0 1px 3px 0 rgba(0,0,0,0.1)",
      }}>
      {children}
    </div>
  );
}

function IdentityCard({ node, active, selected, elRef, onClick }: {
  node: IdentityNodeDef; active: boolean; selected: boolean;
  elRef: (el: HTMLDivElement | null) => void; onClick: () => void;
}) {
  return (
    <CardShell active={active} selected={selected} width={188} elRef={elRef} onClick={onClick}>
      <span className="text-muted-foreground shrink-0 pt-0.5"><node.Icon size={14} /></span>
      <div className="flex-1">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>{node.label}</span>
          <CountBadge count={node.badge} />
        </div>
      </div>
    </CardShell>
  );
}

function RiskTypeCard({ node, active, selected, elRef, onClick }: {
  node: RiskTypeDef; active: boolean; selected: boolean;
  elRef: (el: HTMLDivElement | null) => void; onClick: () => void;
}) {

  // Count only rules that actually have mock findings, and sum their totals
  const rulesWithFindings = node.rules.filter(r => countFindingsForRule(r.id) > 0).length;
  const totalFindings = node.rules.reduce((s, r) => s + countFindingsForRule(r.id), 0);
  return (
    <div ref={elRef} onClick={active ? onClick : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card select-none ${
        active ? "cursor-pointer" : "cursor-default"
      } ${
        selected ? "border-primary/50"
        : active  ? "border-border hover:border-primary/30"
        : "border-border"}`}
      style={{
        width: 220,
        opacity: active ? 1 : 0.22,
        transition: "opacity 0.18s, box-shadow 0.18s",
        boxShadow: selected
          ? "0 0 0 1px rgba(59,130,246,0.3)"
          : "0 1px 3px 0 rgba(0,0,0,0.1)",
      }}>
      <RiskTypeIcon riskTypeId={node.id} fg={node.fg} size="md" />
      <div className="flex-1">
        <p style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>{node.label}</p>
        <p className="text-text-dim" style={{ fontSize: "11px" }}>
          {rulesWithFindings} polic{rulesWithFindings !== 1 ? "ies" : "y"} · {totalFindings} findings
        </p>
      </div>
    </div>
  );
}

const NODE_ID_TO_STORE_TYPE: Record<string, string> = {
  "google-drive": "drives",
  "sharepoint":   "sharepoint-sites",
  "aws-s3":       "s3",
  "aws-rds":      "rds",
};

function DataStoreCard({ node, active, selected, elRef, onClick }: {
  node: DataStoreNodeDef; active: boolean; selected: boolean;
  elRef: (el: HTMLDivElement | null) => void; onClick: () => void;
}) {
  return (
    <CardShell active={active} selected={selected} width={220} elRef={elRef} onClick={onClick}>
      <span className="shrink-0 pt-0.5">
        {node.Icon
          ? <node.Icon size={14} className="text-muted-foreground" />
          : <DataStoreIcon storeType={NODE_ID_TO_STORE_TYPE[node.id] ?? node.id} size={14} />}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>{node.label}</span>
          <CountBadge count={node.badge} />
          {node.managed && <CheckCircle2 size={16} style={{ color: "#22c55e", flexShrink: 0 }} />}
        </div>
      </div>
    </CardShell>
  );
}

function ColHeader({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground mb-3 text-center tracking-widest shrink-0"
      style={{ fontSize: "10px", fontWeight: 600 }}>{label}</p>
  );
}

// ── Right panel sub-components ────────────────────────────────────────────────

function PanelSection({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em" }}>{label}</p>
        {count !== undefined && (
          <span className="text-text-dim" style={{ fontSize: "10px" }}>({count})</span>
        )}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function PanelRow({ label, meta, children }: { label: string; meta?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted">
      {children}
      <span className="flex-1 min-w-0 truncate" style={{ fontSize: "11px" }}>{label}</span>
      {meta && <span className="text-text-dim shrink-0" style={{ fontSize: "10px" }}>{meta}</span>}
    </div>
  );
}

function RuleRow({ rule, filter, onSelect, disabled }: { rule: RiskRule; filter?: FindingFilter; onSelect?: (rule: RiskRule) => void; disabled?: boolean }) {
  // Contextual finding count — reflects the current graph selection
  const filteredCount = useMemo(
    () => countFindingsForRule(rule.id, filter),
    [rule.id, filter]
  );
  const hasFindings = filteredCount > 0;

  // Derive parent risk type for icon + color
  const riskType = useMemo(
    () => RISK_TYPES.find(rt => rt.rules.some(r => r.id === rule.id)),
    [rule.id]
  );
  return (
    <button
      onClick={() => onSelect?.(rule)}
      disabled={disabled}
      className={`w-full text-left px-2.5 py-2 rounded-lg bg-card flex flex-col gap-1 transition-colors ${
        disabled ? "opacity-35 cursor-not-allowed pointer-events-none" :
        onSelect ? "hover:bg-primary/10 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Risk type icon */}
        <RiskTypeIcon riskTypeId={riskType?.id ?? ""} fg={riskType?.fg} size="sm" />
        <span style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1.4 }}>{rule.name}</span>
      </div>
      <p className="text-text-dim" style={{ fontSize: "10px", lineHeight: 1.5 }}>
        {rule.description || rule.conditionSummary}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)" }}>
            {filteredCount} finding{filteredCount !== 1 ? "s" : ""}
          </p>
          {hasFindings && onSelect && (
            <span style={{ fontSize: "10px", color: "var(--color-primary)" }}>
              View findings →
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {rule.severity && <SeverityBadge severity={rule.severity} />}
        </div>
      </div>
      <span style={{ fontSize: "9px", color: "#ff69b4", fontWeight: 700 }}>
        {rule.policyEngine}
      </span>
    </button>
  );
}

// ── Right panel inner content (shared between panel and overlay left col) ─────

function PanelInner({
  sel, multiActiveSet, pathActiveSet, findingFilter, onSelectRule,
}: {
  sel: MultiSel;
  multiActiveSet: ActiveSet | null;
  pathActiveSet: ActiveSet | null;
  findingFilter: FindingFilter | undefined;
  onSelectRule: (rule: RiskRule) => void;
}) {
  // ── All hooks first — no early returns before this block ──

  const [showZeroRules, setShowZeroRules] = useState(false);

  // Path-selection mode: rules filtered by the bezier paths clicked
  const pathFilteredRules = useMemo(() => {
    if (!pathActiveSet) return null;
    const { iIds, rIds, dIds } = pathActiveSet;
    const hasI = iIds.size > 0, hasR = rIds.size > 0, hasD = dIds.size > 0;
    const lookupDIds = new Set([...dIds].map(d =>
      ["apps", "websites", "peripherals"].includes(d) ? "unmanaged" : d
    ));
    const rules = RISK_TYPES.flatMap(rt => {
      if (hasR && !rIds.has(rt.id)) return [];
      return rt.rules.filter(r => {
        if (hasI && !r.identityTypes.some(i => iIds.has(i))) return false;
        if (hasD && !r.dataStoreGroups.some(d => lookupDIds.has(d))) return false;
        return true;
      });
    });
    return [...rules].sort((a, b) =>
      countFindingsForRule(b.id, findingFilter) - countFindingsForRule(a.id, findingFilter)
    );
  }, [pathActiveSet, findingFilter]);

  const pathTotalFindings = useMemo(
    () => (pathFilteredRules ?? []).reduce((s, r) => s + countFindingsForRule(r.id, findingFilter), 0),
    [pathFilteredRules, findingFilter]
  );

  // Multi-node selection mode: rules filtered by clicked node slots
  const hasNodeSel = sel.identity || sel.risk || sel.datastore;

  const multiFilteredRules = useMemo(() => {
    if (!hasNodeSel) return null;
    const normD = sel.datastore
      ? (["apps", "websites", "peripherals"].includes(sel.datastore) ? "unmanaged" : sel.datastore)
      : null;
    const rules = RISK_TYPES.flatMap(rt => {
      if (sel.risk && rt.id !== sel.risk) return [];
      if (!sel.risk && multiActiveSet && !multiActiveSet.rIds.has(rt.id)) return [];
      return rt.rules.filter(r => {
        if (sel.identity && !r.identityTypes.includes(sel.identity)) return false;
        if (normD && !r.dataStoreGroups.includes(normD)) return false;
        return true;
      });
    });
    return [...rules].sort((a, b) =>
      countFindingsForRule(b.id, findingFilter) - countFindingsForRule(a.id, findingFilter)
    );
  }, [sel, multiActiveSet, hasNodeSel, findingFilter]);

  const multiTotalFindings = useMemo(
    () => (multiFilteredRules ?? []).reduce((s, r) => s + countFindingsForRule(r.id, findingFilter), 0),
    [multiFilteredRules, findingFilter]
  );

  // ── Render ──

  /** Renders a sorted rule list with zero-findings cards hidden behind a toggle. */
  function renderRulesList(rules: RiskRule[]) {
    const active = rules.filter(r => countFindingsForRule(r.id, findingFilter) > 0);
    const zero   = rules.filter(r => countFindingsForRule(r.id, findingFilter) === 0);
    return (
      <>
        {active.map(rule => (
          <RuleRow
            key={rule.id} rule={rule} filter={findingFilter}
            onSelect={onSelectRule}
          />
        ))}
        {zero.length > 0 && (
          <>
            {showZeroRules && zero.map(rule => (
              <RuleRow
                key={rule.id} rule={rule} filter={findingFilter}
                disabled
              />
            ))}
            <button
              onClick={() => setShowZeroRules(v => !v)}
              className="flex items-center gap-1.5 mt-1 text-text-dim hover:text-muted-foreground transition-colors self-start"
              style={{ fontSize: "10px" }}
            >
              <Eye size={11} />
              {showZeroRules
                ? "Hide zero-finding policies"
                : `${zero.length} more policies`}
            </button>
          </>
        )}
      </>
    );
  }

  if (pathActiveSet && pathFilteredRules !== null) {
    return (
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        <PanelSection label="Policies" count={pathFilteredRules.length}>
          {pathFilteredRules.length === 0 ? (
            <p className="text-muted-foreground px-1" style={{ fontSize: "11px" }}>
              No policies match the selected paths.
            </p>
          ) : renderRulesList(pathFilteredRules)}
        </PanelSection>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
      {!hasNodeSel ? (
        <p className="text-muted-foreground" style={{ fontSize: "12px", lineHeight: 1.65 }}>
          Select up to one node per column to narrow applicable findings.
        </p>
      ) : (
        <PanelSection label="Policies" count={multiFilteredRules?.length ?? 0}>
          {multiFilteredRules?.length === 0 ? (
            <p className="text-muted-foreground px-1" style={{ fontSize: "11px" }}>
              No policies match this combination.
            </p>
          ) : renderRulesList(multiFilteredRules ?? [])}
        </PanelSection>
      )}
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

function RightPanel({ sel, multiActiveSet, pathActiveSet }: {
  sel: MultiSel;
  multiActiveSet: ActiveSet | null;
  pathActiveSet: ActiveSet | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRule, setSelectedRule] = useState<RiskRule | null>(null);

  useEffect(() => {
    const policyId = searchParams.get("policy");
    if (!policyId) return;
    for (const rt of RISK_TYPES) {
      const match = rt.rules.find(r => r.id === policyId);
      if (match) {
        setSelectedRule(match);
        return;
      }
    }
  }, [searchParams]);

  const selectRule = useCallback((rule: RiskRule | null) => {
    setSelectedRule(rule);
    if (rule) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set("policy", rule.id);
        return next;
      }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  // Build a FindingFilter from the current selection so rule cards and the
  // overlay both show counts/lists scoped to the selected identity + datastore.
  const findingFilter = useMemo((): FindingFilter | undefined => {
    if (pathActiveSet) {
      return {
        identityGroupIds: pathActiveSet.iIds.size > 0 ? pathActiveSet.iIds : null,
        datastoreGroupIds: pathActiveSet.dIds.size > 0 ? pathActiveSet.dIds : null,
      };
    }
    if (sel.identity || sel.datastore) {
      return {
        identityGroupIds: sel.identity ? new Set([sel.identity]) : null,
        datastoreGroupIds: sel.datastore ? new Set([sel.datastore]) : null,
      };
    }
    return undefined;
  }, [sel, pathActiveSet]);

  return (
    <>
      <div className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden" style={{ background: "var(--color-muted)" }}>
        <PanelInner
          sel={sel}
          multiActiveSet={multiActiveSet}
          pathActiveSet={pathActiveSet}
          findingFilter={findingFilter}
          onSelectRule={selectRule}
        />
      </div>
      {selectedRule && (
        <PolicyPage
          rule={selectedRule}
          filter={findingFilter}
          onClose={() => selectRule(null)}
        />
      )}
    </>
  );
}

// ── Risk Graph Add-Filter bar ─────────────────────────────────────────────────

function RiskGraphFilterBar({
  selIdentity, selRisk, selDatastore,
  onSelectIdentity, onSelectRisk, onSelectDatastore,
  onClearAll,
}: {
  selIdentity: string | null;
  selRisk: string | null;
  selDatastore: string | null;
  onSelectIdentity: (id: string) => void;
  onSelectRisk: (id: string) => void;
  onSelectDatastore: (id: string) => void;
  onClearAll: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setExpandedSection(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const identityNode  = selIdentity  ? IDENTITY_NODES.find(n => n.id === selIdentity)   : null;
  const riskNode      = selRisk      ? RISK_TYPES.find(n => n.id === selRisk)            : null;
  const dsNode        = selDatastore ? DATASTORE_NODES.find(n => n.id === selDatastore)  : null;
  const dsIsUnmanaged = selDatastore ? UNMANAGED_DS_IDS.has(selDatastore)                : false;
  const hasAny        = !!(selIdentity || selRisk || selDatastore);

  // Dropdown options: exclude already-selected + zero-finding nodes
  const identityOpts = IDENTITY_NODES.filter(n => !_zeroIdentityIds.has(n.id) && n.id !== selIdentity);
  const riskOpts     = RISK_TYPES.filter(n => !_zeroRiskTypeIds.has(n.id) && n.id !== selRisk);
  const storeOpts    = DATASTORE_NODES.filter(n =>  n.managed && !_zeroStoreIds.has(n.id) && n.id !== selDatastore);
  const destOpts     = DATASTORE_NODES.filter(n => !n.managed && !_zeroStoreIds.has(n.id) && n.id !== selDatastore);

  const closeDropdown = () => { setDropdownOpen(false); setExpandedSection(null); };

  const sections = [
    { key: "identityType", label: "Identity Type", opts: identityOpts, onSelect: (id: string) => { onSelectIdentity(id);  closeDropdown(); } },
    { key: "riskType",     label: "Risk Type",     opts: riskOpts,     onSelect: (id: string) => { onSelectRisk(id);      closeDropdown(); } },
    { key: "dataStore",    label: "Data Store",    opts: storeOpts,    onSelect: (id: string) => { onSelectDatastore(id); closeDropdown(); } },
    { key: "destination",  label: "Destination",   opts: destOpts,     onSelect: (id: string) => { onSelectDatastore(id); closeDropdown(); } },
  ];

  const allEmpty = sections.every(s => s.opts.length === 0);

  const chipStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 500,
    background: "rgba(59,130,246,0.15)",
    color: "var(--color-primary)",
    border: "1px solid rgba(59,130,246,0.3)",
  };
  const xBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14,
  };

  return (
    <>
      {/* Active filter chips — blue Figma style */}
      {identityNode && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0" style={chipStyle}>
          Identity: {identityNode.label}
          <button onClick={() => onSelectIdentity(selIdentity!)} className="rounded-full hover:bg-primary/20 transition-colors" style={xBtnStyle}>
            <X size={9} />
          </button>
        </span>
      )}
      {riskNode && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0" style={chipStyle}>
          Risk: {riskNode.label}
          <button onClick={() => onSelectRisk(selRisk!)} className="rounded-full hover:bg-primary/20 transition-colors" style={xBtnStyle}>
            <X size={9} />
          </button>
        </span>
      )}
      {dsNode && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0" style={chipStyle}>
          {dsIsUnmanaged ? "Dest" : "Store"}: {dsNode.label}
          <button onClick={() => onSelectDatastore(selDatastore!)} className="rounded-full hover:bg-primary/20 transition-colors" style={xBtnStyle}>
            <X size={9} />
          </button>
        </span>
      )}

      {/* Add Filter button + dropdown */}
      {!allEmpty && (
        <div className="relative shrink-0" ref={dropdownRef}>
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
              className="absolute left-0 top-full mt-1 rounded-lg border shadow-xl z-50 overflow-hidden"
              style={{ minWidth: 220, background: "var(--color-card)", borderColor: "var(--color-border)" }}
            >
              {sections.map(section => {
                if (section.opts.length === 0) return null;
                const isExpanded = expandedSection === section.key;
                return (
                  <div key={section.key}>
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
                      style={{ fontSize: "11px", fontWeight: 600 }}
                    >
                      {section.label}
                      <ChevronRight
                        size={12}
                        className="text-muted-foreground"
                        style={{ transform: isExpanded ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }}
                      />
                    </button>
                    {isExpanded && (
                      <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                        {section.opts.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => section.onSelect(opt.id)}
                            className="w-full text-left px-4 py-1.5 hover:bg-primary/10 transition-colors"
                            style={{ fontSize: "11px" }}
                          >
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
      )}

      {/* Clear all */}
      {hasAny && (
        <button onClick={onClearAll} className="text-text-dim hover:text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
          Clear all
        </button>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RiskPage() {
  const navigate = useNavigate();
  
  // Per-column node selections — up to one per column, independent toggles
  const [selIdentity,  setSelIdentity]  = useState<string | null>(null);
  const [selRisk,      setSelRisk]      = useState<string | null>(null);
  const [selDatastore, setSelDatastore] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [showScanExplorer, setShowScanExplorer] = useState(false);


  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params (?riskType=overexposed&app=google-drive)
  useEffect(() => {
    const riskTypeParam = searchParams.get("riskType");
    const appParam = searchParams.get("app");
    if (riskTypeParam) setSelRisk(riskTypeParam);
    if (appParam) setSelDatastore(appParam);
    if (riskTypeParam || appParam) setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [paths, setPaths] = useState<PathDef[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const makeRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    setSvgSize({ w: cRect.width, h: cRect.height });
    const pt = (id: string, side: "left" | "right") => {
      const el = nodeRefs.current.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: (side === "right" ? r.right : r.left) - cRect.left, y: r.top - cRect.top + r.height / 2 };
    };
    const newPaths: PathDef[] = [];
    IR_EDGES.forEach(([iId, rId]) => {
      const a = pt(iId, "right"), b = pt(rId, "left");
      if (!a || !b) return;
      const mx = (a.x + b.x) / 2;
      newPaths.push({ key: `ir:${iId}>${rId}`, d: `M${a.x},${a.y}C${mx},${a.y},${mx},${b.y},${b.x},${b.y}`, fromId: iId, toId: rId, segment: "ir" });
    });
    RD_EDGES.forEach(([rId, dId]) => {
      const a = pt(rId, "right"), b = pt(dId, "left");
      if (!a || !b) return;
      const mx = (a.x + b.x) / 2;
      newPaths.push({ key: `rd:${rId}>${dId}`, d: `M${a.x},${a.y}C${mx},${a.y},${mx},${b.y},${b.x},${b.y}`, fromId: rId, toId: dId, segment: "rd" });
    });
    setPaths(newPaths);
  }, []);

  useEffect(() => { const f = requestAnimationFrame(recompute); return () => cancelAnimationFrame(f); }, [recompute]);
  useEffect(() => {
    const ro = new ResizeObserver(() => requestAnimationFrame(recompute));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recompute]);

  const sel = useMemo<MultiSel>(
    () => ({ identity: selIdentity, risk: selRisk, datastore: selDatastore }),
    [selIdentity, selRisk, selDatastore]
  );

  const multiActiveSet = useMemo(() => computeMultiActiveSet(sel), [sel]);
  const pathActiveSet  = useMemo(() => computePathActiveSet(selectedPaths), [selectedPaths]);

  // Paths take priority over node selections for the visual active-set
  const effectiveActiveSet = pathActiveSet ?? multiActiveSet;

  const isActive = useCallback((type: NodeType, id: string) => {
    // Nodes with zero findings are always dimmed, regardless of selection state
    if (type === "identity" && _zeroIdentityIds.has(id)) return false;
    if (type === "risk"     && _zeroRiskTypeIds.has(id)) return false;
    if (type === "datastore" && _zeroStoreIds.has(id))   return false;

    if (!effectiveActiveSet) return true;
    if (type === "identity") return effectiveActiveSet.iIds.has(id);
    if (type === "risk")     return effectiveActiveSet.rIds.has(id);
    return effectiveActiveSet.dIds.has(id);
  }, [effectiveActiveSet]);

  const getPathStyle = useCallback((p: PathDef) => {
    const baseWidth = scoreToStrokeWidth(_edgeScores.get(p.key) ?? 0);

    if (selectedPaths.has(p.key))
      return { stroke: "var(--color-primary)", strokeWidth: baseWidth + 0.5, opacity: 0.9 };

    // Dim any path whose endpoints include a zero-finding node
    const fromZero = p.segment === "ir"
      ? _zeroIdentityIds.has(p.fromId)
      : _zeroRiskTypeIds.has(p.fromId);
    const toZero = p.segment === "ir"
      ? _zeroRiskTypeIds.has(p.toId)
      : _zeroStoreIds.has(p.toId);
    if (fromZero || toZero)
      return { stroke: "var(--color-muted-foreground)", strokeWidth: 1, opacity: 0 };

    if (!effectiveActiveSet)
      return { stroke: "var(--color-muted-foreground)", strokeWidth: baseWidth, opacity: 0.18 };

    const active = p.segment === "ir"
      ? (effectiveActiveSet.iIds.has(p.fromId) && effectiveActiveSet.rIds.has(p.toId))
      : (effectiveActiveSet.rIds.has(p.fromId) && effectiveActiveSet.dIds.has(p.toId));

    return {
      stroke: "var(--color-muted-foreground)",
      strokeWidth: baseWidth,
      opacity: active ? 0.55 : 0.04,
    };
  }, [selectedPaths, effectiveActiveSet]);

  // Clicking a bezier path clears all node selections
  const handlePathClick = useCallback((key: string) => {
    setSelIdentity(null); setSelRisk(null); setSelDatastore(null);
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Per-column node toggles — each clears the bezier path selection
  const handleSelectIdentity  = useCallback((id: string) => { setSelectedPaths(new Set()); setSelIdentity(prev  => prev === id ? null : id); }, []);
  const handleSelectRisk      = useCallback((id: string) => { setSelectedPaths(new Set()); setSelRisk(prev      => prev === id ? null : id); }, []);
  const handleSelectDatastore = useCallback((id: string) => { setSelectedPaths(new Set()); setSelDatastore(prev => prev === id ? null : id); }, []);

  const clearAll = useCallback(() => {
    setSelIdentity(null); setSelRisk(null); setSelDatastore(null);
    setSelectedPaths(new Set());
  }, []);

  const hasPathSel  = selectedPaths.size > 0;

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── Flow diagram area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Filter / selection bar */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 shrink-0 flex-wrap">
          {/* Unified Add Filter + node-selection chips */}
          <RiskGraphFilterBar
            selIdentity={selIdentity}
            selRisk={selRisk}
            selDatastore={selDatastore}
            onSelectIdentity={handleSelectIdentity}
            onSelectRisk={handleSelectRisk}
            onSelectDatastore={handleSelectDatastore}
            onClearAll={clearAll}
          />

          {/* Connector path chip */}
          {hasPathSel && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0"
              style={{ fontSize: "11px", fontWeight: 500, background: "rgba(59,130,246,0.15)", color: "var(--color-primary)", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              {selectedPaths.size} connector{selectedPaths.size !== 1 ? "s" : ""}
              <button
                onClick={() => setSelectedPaths(new Set())}
                className="rounded-full hover:bg-primary/20 transition-colors"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}
              >
                <X size={9} />
              </button>
            </span>
          )}

          {/* View Rules button */}
          <button
            onClick={() => navigate("/risk/policies")}
            className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 transition-colors hover:bg-muted/80 shrink-0"
            style={{
              fontSize: "12px", fontWeight: 600,
              background: "var(--color-muted)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            <ListChecks size={14} />
            View Risk Policies
          </button>
        </div>

        {/* Three-column diagram */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">

          {/* SVG bezier layer — z-index 0, below node cards */}
          <svg width={svgSize.w} height={svgSize.h}
            style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "visible" }}>
            {paths.map(p => {
              const s = getPathStyle(p);
              return (
                <path key={`vis-${p.key}`} d={p.d} fill="none"
                  stroke={s.stroke} strokeWidth={s.strokeWidth} opacity={s.opacity}
                  pointerEvents="none"
                  style={{ transition: "opacity 0.18s ease, stroke 0.15s ease, stroke-width 0.15s ease" }} />
              );
            })}
            {paths.map(p => (
              <path key={`hit-${p.key}`} d={p.d} fill="none"
                stroke="transparent" strokeWidth={14}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); handlePathClick(p.key); }} />
            ))}
          </svg>

          {/* Columns */}
          <div className="absolute inset-0 flex overflow-y-auto"
            style={{ paddingTop: 40, paddingBottom: 40, zIndex: 1 }}>

            {/* Identity column */}
            <div className="flex-1 flex flex-col items-center gap-2 shrink-0">
              <ColHeader label="Identity" />
              {IDENTITY_NODES.map(node => (
                <IdentityCard key={node.id} node={node}
                  active={isActive("identity", node.id)}
                  selected={selIdentity === node.id}
                  elRef={makeRef(node.id)}
                  onClick={() => handleSelectIdentity(node.id)} />
              ))}
            </div>

            {/* Risk Type column */}
            <div className="flex-1 flex flex-col items-center gap-2 shrink-0">
              <ColHeader label="Risk Type" />
              {RISK_TYPES.map(node => (
                <RiskTypeCard key={node.id} node={node}
                  active={isActive("risk", node.id)}
                  selected={selRisk === node.id}
                  elRef={makeRef(node.id)}
                  onClick={() => handleSelectRisk(node.id)} />
              ))}
            </div>

            {/* Data Store column */}
            <div className="flex-1 flex flex-col items-center gap-2 shrink-0">
              <ColHeader label="Data Store / Destination" />
              {DATASTORE_NODES.map(node => (
                <DataStoreCard key={node.id} node={node}
                  active={isActive("datastore", node.id)}
                  selected={selDatastore === node.id}
                  elRef={makeRef(node.id)}
                  onClick={() => handleSelectDatastore(node.id)} />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div
            className="absolute bottom-4 left-4 flex items-center gap-4 rounded-lg px-3 py-2"
            style={{ zIndex: 2, background: "var(--color-card)", border: "1px solid var(--color-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0" style={{ width: 16, height: 16, fontSize: "9px", fontWeight: 700 }}>4</div>
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Findings count</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} style={{ color: "#22c55e", flexShrink: 0 }} />
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Managed data store</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1" style={{ zIndex: 2 }}>
            {([
              [ZoomIn, "Zoom in"], [RotateCcw, "Reset view"], [ZoomOut, "Zoom out"],
            ] as const).map(([Icon, label]) => (
              <button key={label} title={label}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
                style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.08)" }}>
                <Icon size={13} />
              </button>
            ))}
          </div>


        </div>
      </div>

      {/* ── Right panel ── */}
      <RightPanel sel={sel} multiActiveSet={multiActiveSet} pathActiveSet={pathActiveSet} />

      {/* ── Scan Explorer overlay ── */}
      {showScanExplorer && (
        <ScanExplorer onClose={() => setShowScanExplorer(false)} />
      )}

    </div>
  );
}