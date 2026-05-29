import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, HardDrive, Building2, Cloud, Layers, Database, Monitor,
  AlertTriangle, Clock, Shield, CheckCircle2, XCircle, ChevronRight,
  AlertCircle, TrendingUp, FileText,
} from "lucide-react";
import type { ComponentType } from "react";
import { CATEGORIES, type CategoryKey } from "../../shared/taxonomy";

// ── Types ─────────────────────────────────────────────────────────────────────

type IconComp = ComponentType<{ size?: number; className?: string }>;

type Stage = 1 | 2 | 3;

interface DataStore {
  id: string;
  name: string;
  platform: string;
  group: string;
  Icon: IconComp;
  stage: Stage;
  daysInStage: number;
  sensitiveCategories: CategoryKey[];
  riskScore: number;
  riskAccepted?: boolean;
  riskAcceptedBy?: string;
  riskAcceptedDate?: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, IconComp> = {
  "google-drive": HardDrive,
  "sharepoint": Building2,
  "aws": Cloud,
  "azure": Layers,
  "postgresql": Database,
  "oracle": Database,
  "endpoints": Monitor,
};

// Enhanced data stores with stage information
const DATA_STORES: DataStore[] = [
  // Stage 1: Disconnected (12 stores)
  { id: "s1", name: "prod-data-lake", platform: "AWS S3", group: "aws", Icon: ICON_MAP["aws"], stage: 1, daysInStage: 45, sensitiveCategories: ["PII", "SPII", "PFI"], riskScore: 95 },
  { id: "s2", name: "analytics-staging", platform: "AWS S3", group: "aws", Icon: ICON_MAP["aws"], stage: 1, daysInStage: 38, sensitiveCategories: ["PII", "BII"], riskScore: 78 },
  { id: "ab1", name: "compliance-archive", platform: "Azure Blob", group: "azure", Icon: ICON_MAP["azure"], stage: 1, daysInStage: 52, sensitiveCategories: ["PII", "SPII", "PHI", "PCI"], riskScore: 98 },
  { id: "ab2", name: "customer-uploads", platform: "Azure Blob", group: "azure", Icon: ICON_MAP["azure"], stage: 1, daysInStage: 29, sensitiveCategories: ["PII", "PCI"], riskScore: 82 },
  { id: "ab3", name: "research-datasets", platform: "Azure Blob", group: "azure", Icon: ICON_MAP["azure"], stage: 1, daysInStage: 61, sensitiveCategories: ["PII", "PHI"], riskScore: 88 },
  { id: "pg3", name: "PGSRV-DEV-01", platform: "PostgreSQL", group: "postgresql", Icon: ICON_MAP["postgresql"], stage: 1, daysInStage: 18, sensitiveCategories: ["PII"], riskScore: 45, riskAccepted: true, riskAcceptedBy: "David Chen", riskAcceptedDate: "2026-02-28" },
  { id: "pg4", name: "PGSRV-LEGACY", platform: "PostgreSQL", group: "postgresql", Icon: ICON_MAP["postgresql"], stage: 1, daysInStage: 120, sensitiveCategories: ["PII", "SPII", "PFI", "PHI"], riskScore: 92 },
  { id: "ora3", name: "ORACLEDB-LEGACY", platform: "Oracle DB", group: "oracle", Icon: ICON_MAP["oracle"], stage: 1, daysInStage: 180, sensitiveCategories: ["PII", "SPII", "PFI", "BII"], riskScore: 96 },
  { id: "rds3", name: "analytics-warehouse", platform: "AWS RDS", group: "aws", Icon: ICON_MAP["aws"], stage: 1, daysInStage: 22, sensitiveCategories: ["PII", "BII"], riskScore: 68 },
  { id: "rds4", name: "staging-hr-db", platform: "AWS RDS", group: "aws", Icon: ICON_MAP["aws"], stage: 1, daysInStage: 15, sensitiveCategories: ["PII", "SPII"], riskScore: 71 },
  { id: "asql3", name: "acme-analytics-dw", platform: "Azure SQL", group: "azure", Icon: ICON_MAP["azure"], stage: 1, daysInStage: 33, sensitiveCategories: ["PII"], riskScore: 52 },
  { id: "s3", name: "ml-training-data", platform: "AWS S3", group: "aws", Icon: ICON_MAP["aws"], stage: 1, daysInStage: 8, sensitiveCategories: ["PII", "PHI"], riskScore: 74 },

  // Stage 2: Discovery Scan Complete (8 stores)
  { id: "d3", name: "HR Confidential", platform: "Google Drive", group: "google-drive", Icon: ICON_MAP["google-drive"], stage: 2, daysInStage: 12, sensitiveCategories: ["PII", "SPII", "PHI", "PSI"], riskScore: 85 },
  { id: "sp1", name: "Legal – Contracts", platform: "SharePoint", group: "sharepoint", Icon: ICON_MAP["sharepoint"], stage: 2, daysInStage: 8, sensitiveCategories: ["PII", "BII"], riskScore: 72 },
  { id: "sp2", name: "HR – Employee Portal", platform: "SharePoint", group: "sharepoint", Icon: ICON_MAP["sharepoint"], stage: 2, daysInStage: 15, sensitiveCategories: ["PII", "SPII", "PHI"], riskScore: 80 },
  { id: "pg1", name: "PGSRV-PROD-01", platform: "PostgreSQL", group: "postgresql", Icon: ICON_MAP["postgresql"], stage: 2, daysInStage: 5, sensitiveCategories: ["PII", "SPII", "PCI", "PFI"], riskScore: 88 },
  { id: "pg2", name: "PGSRV-PROD-02", platform: "PostgreSQL", group: "postgresql", Icon: ICON_MAP["postgresql"], stage: 2, daysInStage: 7, sensitiveCategories: ["PII", "PCI"], riskScore: 76 },
  { id: "ora1", name: "ORACLEDB-PROD-01", platform: "Oracle DB", group: "oracle", Icon: ICON_MAP["oracle"], stage: 2, daysInStage: 19, sensitiveCategories: ["PII", "SPII", "PFI"], riskScore: 82 },
  { id: "asql1", name: "acme-prod-customers", platform: "Azure SQL", group: "azure", Icon: ICON_MAP["azure"], stage: 2, daysInStage: 6, sensitiveCategories: ["PII", "PCI"], riskScore: 79 },
  { id: "asql2", name: "acme-prod-hr", platform: "Azure SQL", group: "azure", Icon: ICON_MAP["azure"], stage: 2, daysInStage: 10, sensitiveCategories: ["PII", "SPII", "PHI"], riskScore: 84 },

  // Stage 3: Ongoing Policy Protected (11 stores)
  { id: "d1", name: "Engineering Shared Drive", platform: "Google Drive", group: "google-drive", Icon: ICON_MAP["google-drive"], stage: 3, daysInStage: 92, sensitiveCategories: ["PII", "BII", "PAI"], riskScore: 35 },
  { id: "d2", name: "Finance Team Drive", platform: "Google Drive", group: "google-drive", Icon: ICON_MAP["google-drive"], stage: 3, daysInStage: 87, sensitiveCategories: ["PII", "PFI"], riskScore: 28 },
  { id: "d4", name: "Marketing Assets", platform: "Google Drive", group: "google-drive", Icon: ICON_MAP["google-drive"], stage: 3, daysInStage: 105, sensitiveCategories: ["PII"], riskScore: 15 },
  { id: "sp3", name: "Product – Roadmap Hub", platform: "SharePoint", group: "sharepoint", Icon: ICON_MAP["sharepoint"], stage: 3, daysInStage: 78, sensitiveCategories: ["BII"], riskScore: 22 },
  { id: "ora2", name: "ORACLEDB-PROD-02", platform: "Oracle DB", group: "oracle", Icon: ICON_MAP["oracle"], stage: 3, daysInStage: 64, sensitiveCategories: ["PII", "PFI"], riskScore: 31 },
  { id: "rds1", name: "prod-users-db", platform: "AWS RDS", group: "aws", Icon: ICON_MAP["aws"], stage: 3, daysInStage: 71, sensitiveCategories: ["PII", "SPII"], riskScore: 38 },
  { id: "rds2", name: "prod-orders-db", platform: "AWS RDS", group: "aws", Icon: ICON_MAP["aws"], stage: 3, daysInStage: 69, sensitiveCategories: ["PII", "PCI"], riskScore: 33 },
  { id: "ep1", name: "MacBook Pro – Alice Chen", platform: "Endpoint", group: "endpoints", Icon: ICON_MAP["endpoints"], stage: 3, daysInStage: 45, sensitiveCategories: ["PII", "PAI"], riskScore: 42 },
  { id: "ep2", name: "ThinkPad X1 – Bob Martin", platform: "Endpoint", group: "endpoints", Icon: ICON_MAP["endpoints"], stage: 3, daysInStage: 38, sensitiveCategories: ["PII"], riskScore: 25 },
  { id: "ep3", name: "Surface Pro – Carol Kim", platform: "Endpoint", group: "endpoints", Icon: ICON_MAP["endpoints"], stage: 3, daysInStage: 52, sensitiveCategories: ["PII", "BII"], riskScore: 29 },
  { id: "ep4", name: "MacBook Air – Dave Singh", platform: "Endpoint", group: "endpoints", Icon: ICON_MAP["endpoints"], stage: 3, daysInStage: 41, sensitiveCategories: ["PII"], riskScore: 18 },
];

// ── Stage Definitions ─────────────────────────────────────────────────────────

interface StageDefinition {
  stage: Stage;
  title: string;
  description: string;
  riskLevel: "critical" | "high" | "low";
  color: string;
  bgColor: string;
}

const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: 2,
    title: "Discovery Scan Complete",
    description: "Sampled scan complete, but no ongoing policy protection yet",
    riskLevel: "high",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.08)",
  },
  {
    stage: 3,
    title: "Ongoing Policy Protected",
    description: "Actively monitored with ongoing scans and automated responses",
    riskLevel: "low",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.08)",
  },
  {
    stage: 1,
    title: "Disconnected Data Stores",
    description: "Data stores exist but lack scanning permissions — unprotected black holes",
    riskLevel: "critical",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.08)",
  },
];

// ── Recommendations ───────────────────────────────────────────────────────────

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium";
}

// Helper to determine risk level from risk score
function getRiskLevel(riskScore: number): { level: string; color: string; bgColor: string } {
  if (riskScore >= 80) {
    return { level: "Critical", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.12)" };
  } else if (riskScore >= 60) {
    return { level: "High", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.12)" };
  } else if (riskScore >= 40) {
    return { level: "Medium", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.12)" };
  } else {
    return { level: "Low", color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.12)" };
  }
}

const STAGE_RECOMMENDATIONS: Record<Stage, Recommendation[]> = {
  1: [
    {
      id: "r1-1",
      title: "Grant scanning permissions",
      description: "Provide the necessary IAM roles, service principals, or API credentials so Netskope can connect and scan these data stores.",
      priority: "critical",
    },
    {
      id: "r1-2",
      title: "Validate data store ownership",
      description: "Confirm business owners for each disconnected store and establish accountability for granting access.",
      priority: "high",
    },
    {
      id: "r1-3",
      title: "Prioritize by risk score",
      description: "Focus on stores with highest risk scores first — those likely containing the most sensitive data categories.",
      priority: "medium",
    },
  ],
  2: [
    {
      id: "r2-1",
      title: "Create ongoing scan policies",
      description: "Configure continuous monitoring policies to automatically scan when data changes are detected.",
      priority: "critical",
    },
    {
      id: "r2-2",
      title: "Review discovery findings",
      description: "Examine the sensitive data types discovered and validate detection accuracy before enabling automated actions.",
      priority: "high",
    },
    {
      id: "r2-3",
      title: "Define remediation actions",
      description: "Start with 'log only' mode, then graduate to automated remediation (restrict access, quarantine) once confident.",
      priority: "high",
    },
  ],
  3: [
    {
      id: "r3-1",
      title: "Monitor policy effectiveness",
      description: "Review ongoing scan results and tune policies to reduce false positives and improve coverage.",
      priority: "medium",
    },
    {
      id: "r3-2",
      title: "Enable automated remediation",
      description: "If still in 'log only' mode, upgrade policies to auto-remediate (restrict, quarantine) for proven detections.",
      priority: "medium",
    },
    {
      id: "r3-3",
      title: "Audit accepted risks",
      description: "Periodically review stores where risk was accepted to ensure decisions remain valid.",
      priority: "medium",
    },
  ],
};

// ── Components ────────────────────────────────────────────────────────────────

export function RiskStagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStage = searchParams.get("stage") ? parseInt(searchParams.get("stage")!) as Stage : null;

  // If a stage is selected, show drill-down table
  if (selectedStage) {
    return <DrillDownView stage={selectedStage} onBack={() => setSearchParams({})} />;
  }

  // Otherwise show dashboard
  return <DashboardView onSelectStage={(stage) => setSearchParams({ stage: stage.toString() })} />;
}

// ── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ onSelectStage }: { onSelectStage: (stage: Stage) => void }) {
  const navigate = useNavigate();

  // Calculate metrics per stage
  const stageMetrics = STAGE_DEFINITIONS.map(stageDef => {
    const stores = DATA_STORES.filter(s => s.stage === stageDef.stage);
    const avgRiskScore = stores.length > 0 
      ? Math.round(stores.reduce((sum, s) => sum + s.riskScore, 0) / stores.length)
      : 0;
    const maxDaysInStage = stores.length > 0
      ? Math.max(...stores.map(s => s.daysInStage))
      : 0;
    const avgDaysInStage = stores.length > 0
      ? Math.round(stores.reduce((sum, s) => sum + s.daysInStage, 0) / stores.length)
      : 0;
    const acceptedRiskCount = stores.filter(s => s.riskAccepted).length;

    return {
      ...stageDef,
      storeCount: stores.length,
      avgRiskScore,
      maxDaysInStage,
      avgDaysInStage,
      acceptedRiskCount,
    };
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0">
        <button
          onClick={() => navigate("/risk")}
          className="flex items-center gap-2 text-text-dim hover:text-muted-foreground transition-colors"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          Back to Risk
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "16px", fontWeight: 600 }}>Risk Stages Dashboard</h1>
          <p className="text-text-dim" style={{ fontSize: "11px" }}>
            Track data store protection lifecycle, identify gaps, and record risk acceptance decisions
          </p>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 pb-16">
          <div className="max-w-5xl mx-auto space-y-4">
            {stageMetrics.map((metrics) => (
              <StageTier key={metrics.stage} metrics={metrics} onDrillDown={() => onSelectStage(metrics.stage)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stage Tier Component ──────────────────────────────────────────────────────

interface StageTierProps {
  metrics: StageDefinition & {
    storeCount: number;
    avgRiskScore: number;
    maxDaysInStage: number;
    avgDaysInStage: number;
    acceptedRiskCount: number;
  };
  onDrillDown: () => void;
}

function StageTier({ metrics, onDrillDown }: StageTierProps) {
  const [expanded, setExpanded] = useState(metrics.riskLevel !== "low");

  const RiskIcon = metrics.riskLevel === "critical" ? XCircle : metrics.riskLevel === "high" ? AlertTriangle : CheckCircle2;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: metrics.color,
        backgroundColor: metrics.bgColor,
      }}
    >
      {/* Tier Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center gap-4 hover:opacity-90 transition-opacity"
      >
        <div className="shrink-0">
          <RiskIcon size={24} style={{ color: metrics.color }} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: "14px", fontWeight: 600 }}>{metrics.title}</h2>
            <span
              className="px-2 py-0.5 rounded-full"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: metrics.color,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              {metrics.storeCount} {metrics.storeCount === 1 ? "store" : "stores"}
            </span>
          </div>
          <p className="text-text-dim" style={{ fontSize: "11px", marginTop: "2px" }}>
            {metrics.description}
          </p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-text-dim" style={{ fontSize: "10px", fontWeight: 600 }}>AVG RISK</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: metrics.color }}>{metrics.avgRiskScore}</div>
          </div>
          <div>
            <div className="text-text-dim" style={{ fontSize: "10px", fontWeight: 600 }}>MAX DAYS</div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>{metrics.maxDaysInStage}d</div>
          </div>
          {metrics.acceptedRiskCount > 0 && (
            <div>
              <div className="text-text-dim" style={{ fontSize: "10px", fontWeight: 600 }}>ACCEPTED</div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>{metrics.acceptedRiskCount}</div>
            </div>
          )}
        </div>
        <ChevronRight
          size={18}
          className="text-text-dim shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 pb-4 space-y-4 border-t" style={{ borderColor: metrics.color + "40" }}>
          {/* Recommendations */}
          <div className="pt-4">
            <h3 className="flex items-center gap-2 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "12px" }}>
              <AlertCircle size={12} />
              RECOMMENDED ACTIONS
            </h3>
            <div className="space-y-2">
              {STAGE_RECOMMENDATIONS[metrics.stage].map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
                >
                  <div
                    className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                    style={{
                      backgroundColor: rec.priority === "critical" ? "#ef4444" : rec.priority === "high" ? "#f59e0b" : "#6b7280",
                    }}
                  />
                  <div className="flex-1">
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>{rec.title}</div>
                    <div className="text-text-dim" style={{ fontSize: "11px", marginTop: "2px" }}>
                      {rec.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDrillDown();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{
              backgroundColor: metrics.color,
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Review {metrics.storeCount} {metrics.storeCount === 1 ? "Store" : "Stores"}
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Drill-Down View ───────────────────────────────────────────────────────────

function DrillDownView({ stage, onBack }: { stage: Stage; onBack: () => void }) {
  const navigate = useNavigate();
  const stageDef = STAGE_DEFINITIONS.find(s => s.stage === stage)!;
  const stores = DATA_STORES.filter(s => s.stage === stage);
  
  const [sortBy, setSortBy] = useState<"name" | "risk" | "days">("risk");
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [acceptingRiskFor, setAcceptingRiskFor] = useState<string | null>(null);

  // Sort stores
  const sortedStores = [...stores].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "risk") return b.riskScore - a.riskScore;
    if (sortBy === "days") return b.daysInStage - a.daysInStage;
    return 0;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-dim hover:text-muted-foreground transition-colors"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: "16px", fontWeight: 600 }}>{stageDef.title}</h1>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: stageDef.color,
                backgroundColor: stageDef.bgColor,
                border: `1px solid ${stageDef.color}40`,
              }}
            >
              {stores.length} {stores.length === 1 ? "store" : "stores"}
            </span>
          </div>
          <p className="text-text-dim" style={{ fontSize: "11px", marginTop: "2px" }}>
            {stageDef.description}
          </p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-muted/30">
        <span className="text-text-dim" style={{ fontSize: "11px", fontWeight: 600 }}>SORT BY:</span>
        <div className="flex gap-2">
          {[
            { key: "risk" as const, label: "Risk Score" },
            { key: "days" as const, label: "Days in Stage" },
            { key: "name" as const, label: "Name" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key)}
              className={`px-3 py-1 rounded transition-colors ${
                sortBy === option.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-text-dim hover:text-foreground"
              }`}
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                    DATA STORE
                  </th>
                  <th className="text-left px-4 py-3 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                    PLATFORM
                  </th>
                  {stage !== 1 && (
                    <>
                      <th className="text-left px-4 py-3 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                        SENSITIVE DATA
                      </th>
                      <th className="text-left px-4 py-3 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                        RISK LEVEL
                      </th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                    DAYS IN STAGE
                  </th>
                  <th className="text-left px-4 py-3 text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStores.map((store, idx) => (
                  <StoreRow
                    key={store.id}
                    store={store}
                    stageDef={stageDef}
                    isLast={idx === sortedStores.length - 1}
                    isExpanded={expandedStoreId === store.id}
                    onToggleExpand={() => setExpandedStoreId(expandedStoreId === store.id ? null : store.id)}
                    isAcceptingRisk={acceptingRiskFor === store.id}
                    onAcceptRisk={() => setAcceptingRiskFor(store.id)}
                    onCancelAcceptRisk={() => setAcceptingRiskFor(null)}
                    onConfirmAcceptRisk={() => {
                      // In real app, would save to backend
                      console.log("Risk accepted for", store.id);
                      setAcceptingRiskFor(null);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Store Row Component ───────────────────────────────────────────────────────

interface StoreRowProps {
  store: DataStore;
  stageDef: StageDefinition;
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isAcceptingRisk: boolean;
  onAcceptRisk: () => void;
  onCancelAcceptRisk: () => void;
  onConfirmAcceptRisk: () => void;
}

function StoreRow({
  store,
  stageDef,
  isLast,
  isExpanded,
  onToggleExpand,
  isAcceptingRisk,
  onAcceptRisk,
  onCancelAcceptRisk,
  onConfirmAcceptRisk,
}: StoreRowProps) {
  return (
    <>
      <tr
        className={`border-b border-border hover:bg-muted/30 transition-colors ${isLast && !isExpanded ? "border-b-0" : ""}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0">
              <store.Icon size={14} />
            </span>
            <span style={{ fontSize: "12px", fontWeight: 500 }}>
              {store.name}
            </span>
            {store.riskAccepted && (
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "#6b7280",
                  backgroundColor: "rgba(107, 114, 128, 0.12)",
                }}
                title={`Risk accepted by ${store.riskAcceptedBy} on ${store.riskAcceptedDate}`}
              >
                RISK ACCEPTED
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span style={{ fontSize: "11px" }}>{store.platform}</span>
        </td>
        {stageDef.stage !== 1 && (
          <>
            <td className="px-4 py-3">
              <div className="flex gap-1.5 flex-wrap">
                {store.sensitiveCategories.map(catKey => {
                  const cat = CATEGORIES.find(c => c.key === catKey)!;
                  return (
                    <span
                      key={catKey}
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        color: cat.color,
                        backgroundColor: cat.color + "20",
                      }}
                    >
                      {catKey}
                    </span>
                  );
                })}
              </div>
            </td>
            <td className="px-4 py-3">
              {(() => {
                const riskLevel = getRiskLevel(store.riskScore);
                return (
                  <span
                    className="px-2 py-1 rounded"
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: riskLevel.color,
                      backgroundColor: riskLevel.bgColor,
                    }}
                  >
                    {riskLevel.level}
                  </span>
                );
              })()}
            </td>
          </>
        )}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-text-dim" />
            <span style={{ fontSize: "11px" }}>{store.daysInStage}d</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
              style={{ fontSize: "11px", fontWeight: 500, color: stageDef.color }}
            >
              <FileText size={12} />
              Details
            </button>
            {!store.riskAccepted && (
              <button
                onClick={onAcceptRisk}
                className="flex items-center gap-1 px-2 py-1 rounded bg-card border border-border hover:bg-muted/30 transition-colors text-text-dim"
                style={{ fontSize: "11px", fontWeight: 500 }}
              >
                <Shield size={12} />
                Accept Risk
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Row */}
      {isExpanded && (
        <tr className={`${isLast ? "" : "border-b border-border"}`}>
          <td colSpan={6} className="px-4 py-4 bg-muted/20">
            <div className="space-y-3">
              <h4 className="text-text-dim" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                RECOMMENDATIONS FOR THIS STORE
              </h4>
              <div className="space-y-2">
                {STAGE_RECOMMENDATIONS[store.stage].map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
                  >
                    <div
                      className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                      style={{
                        backgroundColor: rec.priority === "critical" ? "#ef4444" : rec.priority === "high" ? "#f59e0b" : "#6b7280",
                      }}
                    />
                    <div className="flex-1">
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>{rec.title}</div>
                      <div className="text-text-dim" style={{ fontSize: "11px", marginTop: "2px" }}>
                        {rec.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Risk Acceptance Row */}
      {isAcceptingRisk && (
        <tr className={`${isLast ? "" : "border-b border-border"}`}>
          <td colSpan={6} className="px-4 py-4 bg-amber-500/10 border-l-4 border-amber-500">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 style={{ fontSize: "13px", fontWeight: 600 }}>Accept Risk for {store.name}?</h4>
                  <p className="text-text-dim" style={{ fontSize: "11px", marginTop: "4px" }}>
                    By accepting this risk, you acknowledge that <strong>{store.name}</strong> will remain in Stage {store.stage} 
                    without following the recommended actions. This decision will be recorded for audit purposes.
                  </p>
                  <div className="mt-3 p-3 rounded bg-card border border-border">
                    <label className="block text-text-dim" style={{ fontSize: "10px", fontWeight: 600, marginBottom: "6px" }}>
                      JUSTIFICATION (REQUIRED)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded bg-background border border-border text-foreground resize-none"
                      style={{ fontSize: "11px" }}
                      rows={3}
                      placeholder="Explain why you're accepting this risk (e.g., 'Dev environment with no production data', 'Scheduled for decommission Q2 2026')..."
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={onConfirmAcceptRisk}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                      style={{ fontSize: "11px", fontWeight: 600 }}
                    >
                      <Shield size={12} />
                      Confirm Risk Acceptance
                    </button>
                    <button
                      onClick={onCancelAcceptRisk}
                      className="px-3 py-1.5 rounded bg-card border border-border hover:bg-muted/30 transition-colors"
                      style={{ fontSize: "11px", fontWeight: 500 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}