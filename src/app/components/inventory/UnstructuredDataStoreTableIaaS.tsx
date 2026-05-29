import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TablePagination } from "../ui/table-pagination";
import { createPortal } from "react-dom";
import { FolderOpen, Search, X, FileText, Info, Users, Shield, Globe, CheckCircle, AlertTriangle, XCircle, User, Server, TrendingUp, TrendingDown, Filter, Clock, ScanSearch, ChevronDown, ChevronUp, ChevronRight, Radar, ArrowRight, Plus } from "lucide-react";
import { ActivityOverviewSection } from "./activity-shared";
import {
  Sparkline,
  DataTypeTags,
  generateSparkData,
  formatNumber,
  formatBytes,
  sumSparkData,
  SortIcon,
  SortDropdown,
  toggleHeaderSort,
  TableSearchInput,
  HighlightText,
  matchesSearch,
  type SortConfig,
  type SortColumnDef,
} from "./data-store-shared";
import { SidePanel } from "./SidePanel";
import { IdentityDetailPanel } from "./InventoryContent";
import { DataStoreIcon } from "./data-store-icons";
import { FileDetailPane, SensitiveFileDetailPane, SensitiveFileHeaderExtra, FileActionsMenu, DT_TYPE_TO_CAT, DT_CAT_COLORS, generateFileAccessHistory } from "./ForensicDetailPane";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type PanelTab, makePanelTabs, PanelTabBar,
  SectionHeading, InfoRow, SecurityStatus, BoolBadge, RiskBadge, ScanStatusBadge,
  SEVERITY_CONFIG, getDataTypeInfo, SparkTrend,
} from "./panel-shared";
import {
  IDENTITY_TYPE_CONFIG, IDENTITY_FILTER_GROUPS,
  getRoleMembers, classifyCloudPrincipal, classifyRoleMember,
  type UnifiedIdentity, type AccessFilter, type IdentityTypeName,
  useIdentityFilters, SensitiveAccessBanner, IdentityFilterToolbar,
} from "./identity-shared";

// ── IaaS-specific row type ──────────────────────────────────────────────────

export interface IaaSUnstructuredDataRow {
  id: string;
  name: string;
  nameSubtitle?: string;
  instanceId: string;
  account: string;
  org: string;
  sensitiveFiles: number;
  totalFiles: number;
  dataTypes: string[];
  uploadSparkData: number[];
  downloadSparkData: number[];
}

/** Map storeType to app type display name */
export function getAppTypeForStoreType(storeType: string): string {
  switch (storeType) {
    case "s3":
      return "AWS S3";
    case "azure-blob":
      return "Azure Blob";
    default:
      return "IaaS";
  }
}

interface IaaSStoreTableConfig {
  title: string;
  subtitle: string;
  nameColumnLabel: string;
  rows: IaaSUnstructuredDataRow[];
}

export function getIaaSStoreConfig(storeType: string): IaaSStoreTableConfig {
  switch (storeType) {
    case "s3":
      return {
        title: "S3 Buckets",
        subtitle: "AWS S3 buckets with unstructured data",
        nameColumnLabel: "Bucket Name",
        rows: [
          {
            id: "s1",
            name: "prod-data-lake",
            instanceId: "arn:aws:s3:::prod-data-lake",
            account: "123456789012",
            org: "Acme Corp",
            sensitiveFiles: 1205,
            totalFiles: 45200,
            dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Financial IDs", "Healthcare IDs", "Birthdates", "Telephone Numbers", "Postal Addresses"],
            uploadSparkData: generateSparkData(50),
            downloadSparkData: generateSparkData(55),
          },
          {
            id: "s2",
            name: "analytics-staging",
            instanceId: "arn:aws:s3:::analytics-staging",
            account: "123456789012",
            org: "Acme Corp",
            sensitiveFiles: 340,
            totalFiles: 12800,
            dataTypes: ["IP Addresses", "MAC Addresses", "UUIDs", "Domain Names", "URI Hosts"],
            uploadSparkData: generateSparkData(60),
            downloadSparkData: generateSparkData(65),
          },
          {
            id: "s3",
            name: "ml-training-data",
            instanceId: "arn:aws:s3:::ml-training-data",
            account: "987654321098",
            org: "Acme Corp",
            sensitiveFiles: 892,
            totalFiles: 8400,
            dataTypes: ["Personal Names", "Biometric Data", "Medical Records", "Healthcare Provider IDs", "Medical Diagnoses", "Gender", "Age", "Ethnicity and Race"],
            uploadSparkData: generateSparkData(70),
            downloadSparkData: generateSparkData(75),
          },
        ],
      };
    case "azure-blob":
      return {
        title: "Azure Blob Containers",
        subtitle: "Azure Blob Storage containers with unstructured data",
        nameColumnLabel: "Container Name",
        rows: [
          {
            id: "ab1",
            name: "compliance-archive",
            instanceId: "acmeprod-storage/compliance-archive",
            account: "acmeprod-storage",
            org: "Acme Corp",
            sensitiveFiles: 567,
            totalFiles: 18300,
            dataTypes: ["Personal Names", "Social Security Numbers", "Taxpayer IDs", "Financial IDs", "Postal Addresses", "Passports"],
            uploadSparkData: generateSparkData(300),
            downloadSparkData: generateSparkData(305),
          },
          {
            id: "ab2",
            name: "customer-uploads",
            instanceId: "acmeprod-storage/customer-uploads",
            account: "acmeprod-storage",
            org: "Acme Corp",
            sensitiveFiles: 234,
            totalFiles: 9420,
            dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Telephone Numbers", "Company Names"],
            uploadSparkData: generateSparkData(310),
            downloadSparkData: generateSparkData(315),
          },
          {
            id: "ab3",
            name: "research-datasets",
            instanceId: "acmedev-storage/research-datasets",
            account: "acmedev-storage",
            org: "Acme Labs",
            sensitiveFiles: 1089,
            totalFiles: 22100,
            dataTypes: ["Medical Records", "Healthcare IDs", "Biometric Data", "Genetic Data", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race"],
            uploadSparkData: generateSparkData(320),
            downloadSparkData: generateSparkData(325),
          },
        ],
      };
    default:
      return { title: "", subtitle: "", nameColumnLabel: "Name", rows: [] };
  }
}

// ── Placeholder file names ────────────────────────────────────────────────────

const SAMPLE_FILE_NAMES = [
  "employee_records_2026.xlsx", "quarterly_financials_q4.pdf", "user_data_export.csv",
  "customer_contacts.xlsx", "payroll_summary_feb.xlsx", "health_benefits_enrollment.docx",
  "ssn_verification_batch.csv", "tax_forms_w2_2025.pdf", "insurance_claims_log.csv",
  "vendor_payment_details.xlsx", "candidate_applications.pdf", "performance_reviews_2025.docx",
  "salary_adjustments.xlsx", "client_nda_signed.pdf", "api_credentials_backup.json",
  "prod_db_dump_20260201.sql", "access_audit_log.csv", "pii_scan_results.json",
  "compliance_report_feb.pdf", "incident_response_notes.docx", "encrypted_keys_archive.zip",
  "marketing_leads_export.csv", "board_meeting_minutes.docx", "patent_filing_draft.pdf",
  "customer_feedback_raw.csv", "support_tickets_export.json", "billing_invoices_q1.xlsx",
  "user_sessions_analytics.csv", "gdpr_data_request_log.xlsx", "partner_contracts.pdf",
];

function generatePlaceholderFiles(count: number, parentDataTypes: string[]) {
  const files: { name: string; dataTypes: string; entityTypes: string[]; modified: string }[] = [];
  const categories = ["PII", "Financial", "PCI", "Secrets", "PHI", "Credentials"];
  const seed = count * 7 + 13;
  for (let i = 0; i < count; i++) {
    const baseName = SAMPLE_FILE_NAMES[i % SAMPLE_FILE_NAMES.length];
    const cycle = Math.floor(i / SAMPLE_FILE_NAMES.length);
    const name = cycle === 0 ? baseName : baseName.replace(/(\.\w+)$/, `_${cycle}$1`);
    const hash = ((seed + i * 31) % 97);
    const numTypes = 1 + (hash % Math.min(3, parentDataTypes.length));
    const startIdx = (hash + i) % parentDataTypes.length;
    const entityTypes: string[] = [];
    for (let t = 0; t < numTypes; t++) {
      const dt = parentDataTypes[(startIdx + t) % parentDataTypes.length];
      if (!entityTypes.includes(dt)) entityTypes.push(dt);
    }
    const daysAgo = ((hash + i * 13) % 55);
    const dateObj = new Date(2026, 1, 24);
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const modified = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    files.push({ name, dataTypes: categories[i % categories.length], entityTypes, modified });
  }
  return files;
}

// ── Tab config ────────────────────────────────────────────────────────────────

const PANEL_TABS = makePanelTabs("files");

// ── Per-bucket rich metadata ──────────────────────────────────────────────────

interface BucketMetadata {
  resourceType: string;
  provider: string;
  region: string;
  storageSize: string;
  objectCount: string;
  encryption: string;
  versioning: boolean;
  publicAccess: string;
  accessLogging: boolean;
  replication: string | null;
  retentionPolicy: string;
  dlpPolicies: string[];
  complianceFrameworks: string[];
  lastScanDate: string;
  scanStatus: "complete" | "partial" | "pending";
  riskLevel: "low" | "medium" | "high" | "critical";
  iamEntries: { principal: string; principalType: "user" | "role" | "service"; permissions: string[]; lastAccess: string; stale: boolean; sensitiveAccess: boolean }[];
  policyExists: boolean;
  lifecycleRules: string;
  backupEnabled: boolean;
  staleDataSize: string;
  shadowLastAccess: string;
  shadowLastAccessedBy: string;
}

const BUCKET_METADATA: Record<string, BucketMetadata> = {
  s1: {
    resourceType: "S3 Bucket",
    provider: "AWS",
    region: "us-east-1",
    storageSize: "2.4 TB",
    objectCount: "45,200",
    encryption: "AES-256 (SSE-S3)",
    versioning: true,
    publicAccess: "All blocked",
    accessLogging: true,
    replication: "Cross-region replica → us-west-2",
    retentionPolicy: "7 years",
    dlpPolicies: ["SSN Detection", "PII Comprehensive Scan", "Healthcare ID Protection", "Financial Data Classification"],
    complianceFrameworks: ["HIPAA", "SOC 2 Type II", "GDPR", "CCPA"],
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    riskLevel: "critical",
    iamEntries: [
      { principal: "data-platform-role", principalType: "role", permissions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: true },
      { principal: "ml-training-svc", principalType: "service", permissions: ["s3:GetObject", "s3:ListBucket"], lastAccess: "2026-03-04", stale: false, sensitiveAccess: false },
      { principal: "alice.chen@acme.com", principalType: "user", permissions: ["s3:*"], lastAccess: "2026-03-02", stale: false, sensitiveAccess: true },
      { principal: "analytics-reader-role", principalType: "role", permissions: ["s3:GetObject", "s3:ListBucket"], lastAccess: "2026-03-01", stale: true, sensitiveAccess: false },
    ],
    policyExists: true,
    lifecycleRules: "Transition to Glacier after 90d · Delete after 7yr",
    backupEnabled: true,
    staleDataSize: "310 GB",
    shadowLastAccess: "2026-03-05 14:22 UTC",
    shadowLastAccessedBy: "data-platform-role",
  },
  s2: {
    resourceType: "S3 Bucket",
    provider: "AWS",
    region: "us-west-2",
    storageSize: "180 GB",
    objectCount: "12,800",
    encryption: "SSE-KMS (aws/s3)",
    versioning: false,
    publicAccess: "All blocked",
    accessLogging: true,
    replication: null,
    retentionPolicy: "90 days",
    dlpPolicies: ["IP Address Detection", "Domain Name Scan"],
    complianceFrameworks: ["SOC 2 Type II"],
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    riskLevel: "medium",
    iamEntries: [
      { principal: "analytics-etl-role", principalType: "role", permissions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: true },
      { principal: "data-scientists-group", principalType: "role", permissions: ["s3:GetObject", "s3:ListBucket"], lastAccess: "2026-03-03", stale: true, sensitiveAccess: false },
      { principal: "spark-cluster-svc", principalType: "service", permissions: ["s3:GetObject", "s3:ListBucket"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: false },
    ],
    policyExists: true,
    lifecycleRules: "Delete after 90d",
    backupEnabled: true,
    staleDataSize: "42 GB",
    shadowLastAccess: "2026-03-05 09:44 UTC",
    shadowLastAccessedBy: "analytics-etl-role",
  },
  s3: {
    resourceType: "S3 Bucket",
    provider: "AWS",
    region: "us-east-1",
    storageSize: "4.1 TB",
    objectCount: "8,400",
    encryption: "SSE-KMS (acme/ml-key)",
    versioning: true,
    publicAccess: "All blocked",
    accessLogging: true,
    replication: null,
    retentionPolicy: "5 years (HIPAA / research)",
    dlpPolicies: ["PHI Detection", "Biometric Data Classification", "Medical Record Scan", "PII Comprehensive Scan"],
    complianceFrameworks: ["HIPAA", "GDPR", "SOC 2 Type II"],
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    riskLevel: "high",
    iamEntries: [
      { principal: "ml-platform-role", principalType: "role", permissions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: true },
      { principal: "research-analyst-role", principalType: "role", permissions: ["s3:GetObject", "s3:ListBucket"], lastAccess: "2026-03-04", stale: true, sensitiveAccess: false },
      { principal: "sagemaker-training-svc", principalType: "service", permissions: ["s3:GetObject", "s3:PutObject"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: true },
    ],
    policyExists: true,
    lifecycleRules: "Transition to Glacier after 365d · Delete after 5yr",
    backupEnabled: true,
    staleDataSize: "1.2 TB",
    shadowLastAccess: "2026-03-05 11:17 UTC",
    shadowLastAccessedBy: "sagemaker-training-svc",
  },
  ab1: {
    resourceType: "Blob Container",
    provider: "Azure",
    region: "East US",
    storageSize: "3.8 TB",
    objectCount: "18,300",
    encryption: "Microsoft-managed keys (AES-256)",
    versioning: true,
    publicAccess: "All blocked",
    accessLogging: true,
    replication: "GRS (geo-redundant)",
    retentionPolicy: "10 years (SOX / Legal Hold)",
    dlpPolicies: ["SSN Detection", "Financial Document Classification", "Taxpayer ID Protection", "Passport Detection"],
    complianceFrameworks: ["SOX", "GDPR", "CCPA", "SOC 2 Type II"],
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    riskLevel: "high",
    iamEntries: [
      { principal: "compliance-auditor-role", principalType: "role", permissions: ["Storage Blob Data Reader"], lastAccess: "2026-03-01", stale: true, sensitiveAccess: false },
      { principal: "archive-ingestion-svc", principalType: "service", permissions: ["Storage Blob Data Contributor"], lastAccess: "2026-03-02", stale: false, sensitiveAccess: true },
      { principal: "margaret.sullivan@acme.com", principalType: "user", permissions: ["Storage Blob Data Owner"], lastAccess: "2026-02-28", stale: false, sensitiveAccess: true },
    ],
    policyExists: true,
    lifecycleRules: "Move to Cool after 30d · Move to Archive after 365d",
    backupEnabled: true,
    staleDataSize: "780 GB",
    shadowLastAccess: "2026-03-02 16:55 UTC",
    shadowLastAccessedBy: "archive-ingestion-svc",
  },
  ab2: {
    resourceType: "Blob Container",
    provider: "Azure",
    region: "East US",
    storageSize: "620 GB",
    objectCount: "9,420",
    encryption: "Customer-managed keys (Azure Key Vault)",
    versioning: true,
    publicAccess: "All blocked",
    accessLogging: true,
    replication: "LRS (locally redundant)",
    retentionPolicy: "3 years",
    dlpPolicies: ["PCI-DSS Card Detection", "Email Address Detection", "Contact Information Scan"],
    complianceFrameworks: ["PCI-DSS", "GDPR"],
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    riskLevel: "medium",
    iamEntries: [
      { principal: "upload-api-svc", principalType: "service", permissions: ["Storage Blob Data Contributor"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: true },
      { principal: "customer-support-role", principalType: "role", permissions: ["Storage Blob Data Reader"], lastAccess: "2026-03-04", stale: false, sensitiveAccess: false },
      { principal: "thomas.becker@acme.com", principalType: "user", permissions: ["Storage Blob Data Owner"], lastAccess: "2026-02-25", stale: true, sensitiveAccess: true },
    ],
    policyExists: false,
    lifecycleRules: "Delete after 3yr",
    backupEnabled: false,
    staleDataSize: "95 GB",
    shadowLastAccess: "2026-03-05 08:31 UTC",
    shadowLastAccessedBy: "upload-api-svc",
  },
  ab3: {
    resourceType: "Blob Container",
    provider: "Azure",
    region: "West Europe",
    storageSize: "7.2 TB",
    objectCount: "22,100",
    encryption: "Microsoft-managed keys (AES-256)",
    versioning: true,
    publicAccess: "All blocked",
    accessLogging: true,
    replication: "ZRS (zone-redundant)",
    retentionPolicy: "10 years (HIPAA / research)",
    dlpPolicies: ["PHI Detection", "Biometric Data Classification", "Genetic Data Protection", "Medical Record Scan", "PII Comprehensive Scan"],
    complianceFrameworks: ["HIPAA", "GDPR", "ISO 27001"],
    lastScanDate: "2026-02-27",
    scanStatus: "partial",
    riskLevel: "critical",
    iamEntries: [
      { principal: "research-platform-svc", principalType: "service", permissions: ["Storage Blob Data Contributor"], lastAccess: "2026-03-05", stale: false, sensitiveAccess: true },
      { principal: "data-science-team-role", principalType: "role", permissions: ["Storage Blob Data Reader"], lastAccess: "2026-03-03", stale: false, sensitiveAccess: false },
      { principal: "alex.johansson@acme-emea.com", principalType: "user", permissions: ["Storage Blob Data Owner"], lastAccess: "2026-02-27", stale: true, sensitiveAccess: true },
      { principal: "hipaa-audit-svc", principalType: "service", permissions: ["Storage Blob Data Reader"], lastAccess: "2026-03-01", stale: false, sensitiveAccess: false },
    ],
    policyExists: true,
    lifecycleRules: "Move to Archive after 365d · Delete after 10yr",
    backupEnabled: true,
    staleDataSize: "2.1 TB",
    shadowLastAccess: "2026-03-05 13:48 UTC",
    shadowLastAccessedBy: "research-platform-svc",
  },
};

function getBucketMetadata(rowId: string): BucketMetadata {
  return BUCKET_METADATA[rowId] ?? BUCKET_METADATA["s1"];
}

function getTotalIdentitiesCount(rowId: string): number {
  const meta = getBucketMetadata(rowId);
  // Count non-role direct entries + expanded members from roles (no double-count)
  return buildUnifiedIdentities(meta).length;
}

// (SectionHeading, InfoRow, SecurityStatus, RiskBadge, ScanStatusBadge, BoolBadge → panel-shared.tsx)

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTabContent({ row, onNavigateToAccess, onTabChange, onNavigateToSensitiveFiles }: {
  row: IaaSUnstructuredDataRow;
  onNavigateToAccess: (f: AccessFilter) => void;
  onTabChange?: (tab: PanelTab) => void;
  onNavigateToSensitiveFiles?: (dataType: string) => void;
}) {
  const meta = getBucketMetadata(row.id);
  const nonRoleEntries = meta.iamEntries.filter(e => e.principalType !== "role");
  const staleCount = nonRoleEntries.filter(e => e.stale).length;
  const sensitiveCount = nonRoleEntries.filter(e => e.sensitiveAccess).length;
  const [sensitiveBarHovered, setSensitiveBarHovered] = useState(false);
  const [hoveredAccessSegment, setHoveredAccessSegment] = useState<number | null>(null);

  // scannedFiles: deterministic fraction of totalFiles, always >= sensitiveFiles
  const scannedFiles = Math.max(
    row.sensitiveFiles,
    Math.round(row.totalFiles * (0.30 + (row.sensitiveFiles % 7) * 0.02)),
  );

  // Data type breakdown (for tooltip list only, not bar rendering)
  const breakdown = useMemo(() => computeDataTypeBreakdown(row), [row]);
  const sensitivePct = Math.min(100, (row.sensitiveFiles / Math.max(scannedFiles, row.sensitiveFiles, 1)) * 100);
  const cleanPct = 100 - sensitivePct;
  const cleanFiles = Math.max(0, scannedFiles - row.sensitiveFiles);

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Basic Information + Security Configuration */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-white dark:bg-slate-900 border border-border rounded-lg px-3.5 py-3">
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Basic Information</div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <InfoRow label="Resource Type" value={meta.resourceType} />
              <InfoRow label="Provider" value={
                <span className="inline-flex items-center gap-1">
                  <Globe size={11} className="text-muted-foreground" />
                  {meta.provider}
                </span>
              } />
              <InfoRow label="Region" value={meta.region} />
              <InfoRow label="Instance ID" value={row.instanceId} mono />
              <InfoRow label="Account" value={row.account} mono />
            </div>
            
            <div className="w-px bg-border"></div>
            
            <div className="flex-1 space-y-2">
              <InfoRow label="Organization" value={row.org} />
              <InfoRow label="Object Count" value={meta.objectCount} />
              <InfoRow label="Storage Size" value={meta.storageSize} />
              <InfoRow label="Last Discovery Scan" value={(() => {
                const h = (row.id.charCodeAt(0) + row.id.length) % 24;
                const m = ((row.id.charCodeAt(1) ?? 0) + row.id.length * 3) % 60;
                const d = ["Apr 8, 2026", "Apr 9, 2026", "Apr 9, 2026", "Apr 10, 2026"][h % 4];
                const hh = h % 12 === 0 ? 12 : h % 12;
                const mm = String(m).padStart(2, "0");
                const ampm = h < 12 ? "AM" : "PM";
                return `${d}, ${hh}:${mm} ${ampm}`;
              })()} />
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-white dark:bg-slate-900 border border-border rounded-lg px-3.5 py-3">
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Security Configuration</div>
          <div className="space-y-2">
            <InfoRow label="Encryption" value={<SecurityStatus enabled={meta.encryption.toLowerCase() !== "none"} />} />
            <InfoRow label="Public Access" value={<span className="inline-flex items-start gap-1 text-red-400"><AlertTriangle size={11} className="shrink-0 mt-0.5" /><span style={{ wordBreak: "break-word" }}>Publicly Accessible</span></span>} />
            <InfoRow label="Backup" value={<SecurityStatus enabled={meta.backupEnabled} />} />
          </div>
        </div>
      </div>

      {/* Files */}
      <div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

          {/* Card header */}
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-border/30">
            <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Files</span>
            <button
              type="button"
              onClick={() => onNavigateToSensitiveFiles?.("")}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <span>View sensitive files</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Card body: left KPI | divider | right content */}
          <div className="flex items-stretch px-3.5 py-3 gap-0">

            {/* Left: sensitive files KPI */}
            <button
              type="button"
              onClick={() => onNavigateToSensitiveFiles?.("")}
              className="shrink-0 pr-4 flex flex-col justify-center hover:bg-blue-500/10 transition-colors text-left rounded-lg px-2 -mx-2"
              style={{ minWidth: 90 }}
            >
              <span className="text-text-bright tabular-nums" style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1 }}>
                {formatNumber(row.sensitiveFiles)}
              </span>
              <span className="text-muted-foreground mt-1" style={{ fontSize: "10px" }}>sensitive files</span>
            </button>

            {/* Vertical divider */}
            <div className="w-px bg-border/50 mx-3.5 shrink-0" />

            {/* Right: headline + scan meta + bar */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">

              {/* Headline row + scan meta */}
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToSensitiveFiles?.("")}
                  className="hover:bg-blue-500/10 transition-colors text-left rounded px-1.5 -mx-1.5 py-0.5 -my-0.5"
                >
                  <span className="text-text-bright tabular-nums" style={{ fontSize: "16px", fontWeight: 700 }}>
                    {formatNumber(scannedFiles)}
                  </span>
                  <span className="text-muted-foreground ml-1" style={{ fontSize: "11px" }}>
                    of {formatNumber(row.totalFiles)} files scanned
                  </span>
                </button>
                
              </div>

              {/* Segmented bar: sensitive (subdivided by data type) + clean */}
              <div className="relative" onMouseLeave={() => setSensitiveBarHovered(false)}>
                <div
                  className="flex w-full rounded-full overflow-hidden"
                  style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}
                >
                  {/* Sensitive portion — single red segment, hover shows full breakdown tooltip */}
                  {sensitivePct > 0 && (
                    <div
                      className="transition-all duration-100 shrink-0 cursor-pointer"
                      style={{ width: `${sensitivePct}%`, background: "#60a5fa", opacity: sensitiveBarHovered ? 1 : 0.82 }}
                      onMouseEnter={() => setSensitiveBarHovered(true)}
                      onClick={(e) => { e.stopPropagation(); onNavigateToSensitiveFiles?.(""); }}
                    />
                  )}
                  {cleanPct > 0 && (
                    <div
                      className="shrink-0 transition-all duration-100 cursor-pointer"
                      style={{
                        width: `${cleanPct}%`,
                        background: "rgba(148,163,184,0.15)",
                        opacity: sensitiveBarHovered ? 0.4 : 1,
                      }}
                      onClick={() => onNavigateToSensitiveFiles?.("")}
                    />
                  )}
                </div>

                {/* Bar foot labels */}
                <div className="flex items-center justify-between mt-1 px-0" style={{ fontSize: "10px" }}>
                  <span style={{ color: "#60a5fa" }}>{formatNumber(row.sensitiveFiles)} sensitive</span>
                  <span style={{ color: "#94a3b8" }}>{formatNumber(cleanFiles)} not sensitive</span>
                </div>

                {/* Full breakdown tooltip — shown when hovering any part of the sensitive bar */}
                {sensitiveBarHovered && breakdown.length > 0 && (
                  <div
                    className="absolute pointer-events-none z-50"
                    style={{ bottom: "calc(100% + 10px)", left: `${Math.min(sensitivePct / 2, 70)}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="border rounded-md shadow-xl" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)", minWidth: 220 }}>
                      <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 border-b" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Files by Data Type</span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{formatNumber(row.sensitiveFiles)} sensitive</span>
                      </div>
                      <div className="px-2.5 py-1.5 space-y-1">
                        {breakdown.map((dt) => {
                          const cat = DT_TYPE_TO_CAT[dt.name] ?? "PII";
                          const colors = DT_CAT_COLORS[cat] ?? DT_CAT_COLORS.PII;
                          return (
                            <div key={dt.name} className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                              <span style={{ fontSize: "10px", color: "#cbd5e1", flex: 1, minWidth: 0 }} className="truncate">{dt.name}</span>
                              <span style={{ fontSize: "10px", color: "#64748b" }}>{cat}</span>
                              <span style={{ fontSize: "10px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{formatNumber(dt.fileCount)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1 px-2.5 pb-2 pt-1 border-t" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                        <ArrowRight size={9} style={{ color: "#60a5fa" }} />
                        <span style={{ fontSize: "10px", color: "#60a5fa" }}>Click a segment to filter by type</span>
                      </div>
                    </div>
                    <div className="flex justify-center" style={{ marginTop: 2 }}>
                      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(148,163,184,0.2)" }} />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>


      {/* Access */}
      <div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

          {/* Card header */}
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-border/30">
            <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Identities with Access</span>
            <button
              type="button"
              onClick={() => onNavigateToAccess(null)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <span>View identities</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Card body */}
          <div className="flex items-stretch px-3.5 py-3 gap-0">

            {/* Left: sensitive access KPI */}
            <div className="shrink-0 flex items-stretch -mx-2">
              <button
                type="button"
                onClick={() => onNavigateToAccess("sensitive")}
                className="flex flex-col justify-start hover:bg-blue-500/10 transition-colors text-left rounded-lg px-2 py-1 -my-1 pr-4"
                style={{ minWidth: 90 }}
              >
                <span className="text-text-bright tabular-nums" style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1 }}>{formatNumber(sensitiveCount)}</span>
                <span className="text-muted-foreground mt-1" style={{ fontSize: "10px" }}>with access to<br />sensitive data</span>
              </button>
            </div>

            {/* Vertical divider */}
            <div className="w-px bg-border/50 mx-3.5 shrink-0" />

            {/* Right: total identities headline + segmented bar */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">

              {/* Headline */}
              <button
                type="button"
                onClick={() => onNavigateToAccess(null)}
                className="hover:bg-blue-500/10 transition-colors text-left rounded px-1.5 -mx-1.5 py-0.5 -my-0.5 self-start"
              >
                <span className="text-text-bright tabular-nums" style={{ fontSize: "16px", fontWeight: 700 }}>
                  {formatNumber(nonRoleEntries.length)}
                </span>
                <span className="text-muted-foreground ml-1" style={{ fontSize: "11px" }}>total identities</span>
              </button>

              {/* Bar + foot labels + tooltip */}
              {(() => {
                const IDENT_LABELS: Record<string, string> = {
                  "unknown-identity":    "Unauthenticated",
                  "external-user":       "External User",
                  "unmapped-local-user": "Unmapped",
                  "internal-user":       "Internal User",
                };
                const sensitiveByType: Record<string, number> = {};
                for (const e of nonRoleEntries) {
                  if (!e.sensitiveAccess) continue;
                  let k: string;
                  if (e.stale) k = "unknown-identity";
                  else if (e.principal.includes("@acme.com")) k = "internal-user";
                  else if (e.principal.includes("@")) k = "external-user";
                  else k = "internal-user";
                  sensitiveByType[k] = (sensitiveByType[k] ?? 0) + 1;
                }
                const TYPE_ORDER = ["unknown-identity", "unmapped-local-user", "external-user", "internal-user"];
                const breakdown = TYPE_ORDER
                  .filter(t => (sensitiveByType[t] ?? 0) > 0)
                  .map(t => ({ key: t, count: sensitiveByType[t], label: IDENT_LABELS[t] ?? t }));

                const total = nonRoleEntries.length;
                const noSensCount = Math.max(0, total - sensitiveCount);
                const noSensPct = total > 0 ? (noSensCount / total) * 100 : 0;
                const sensitivePct = 100 - noSensPct;
                const isHovered = hoveredAccessSegment === 0;

                return (
                  <div className="relative" onMouseLeave={() => setHoveredAccessSegment(null)}>
                    <div className="flex w-full rounded-full overflow-hidden" style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}>
                      {sensitivePct > 0 && (
                        <div
                          className="shrink-0 cursor-pointer transition-all duration-100"
                          style={{ width: `${sensitivePct}%`, background: "#60a5fa", opacity: isHovered ? 1 : 0.82, minWidth: 2 }}
                          onMouseEnter={() => setHoveredAccessSegment(0)}
                          onClick={() => onNavigateToAccess("sensitive")}
                        />
                      )}
                      {noSensPct > 0 && (
                        <div
                          className="shrink-0 transition-all duration-100"
                          style={{ width: `${noSensPct}%`, background: "rgba(148,163,184,0.15)", opacity: isHovered ? 0.4 : 1 }}
                        />
                      )}
                    </div>

                    {/* Bar foot labels */}
                    <div className="flex items-center justify-between mt-1" style={{ fontSize: "10px" }}>
                      <span style={{ color: "#60a5fa" }}>{formatNumber(sensitiveCount)} identities with sensitive access</span>
                      <span style={{ color: "#94a3b8" }}>{formatNumber(noSensCount)} no sensitive access</span>
                    </div>

                    {/* Breakdown tooltip on red segment hover */}
                    {isHovered && breakdown.length > 0 && (
                      <div
                        className="absolute pointer-events-none z-50"
                        style={{ bottom: "calc(100% + 10px)", left: `${Math.min(sensitivePct / 2, 70)}%`, transform: "translateX(-50%)" }}
                      >
                        <div className="border rounded-md shadow-xl" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)", minWidth: 190 }}>
                          <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 border-b" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Identities with Access</span>
                            <span style={{ fontSize: "10px", color: "#64748b" }}>{formatNumber(sensitiveCount)} total</span>
                          </div>
                          <div className="px-2.5 py-1.5 space-y-1">
                            {(() => {
                              const IDENT_HEX: Record<string, string> = {
                                "internal-user": "#60a5fa", "external-user": "#fb923c",
                                "unknown-identity": "#f87171", "unmapped-local-user": "#a78bfa",
                                "service-account": "#a78bfa", "connected-app": "#f472b6",
                              };
                              return breakdown.map(({ key, count, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: IDENT_HEX[key] ?? "#94a3b8", flexShrink: 0, display: "inline-block" }} />
                                  <span style={{ fontSize: "10px", color: "#cbd5e1", flex: 1 }}>{label}</span>
                                  <span style={{ fontSize: "10px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 24, textAlign: "right" }}>{formatNumber(count)}</span>
                                </div>
                              ));
                            })()}
                          </div>
                          <div className="flex items-center gap-1 px-2.5 pb-2 pt-1 border-t" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                            <ArrowRight size={9} style={{ color: "#60a5fa" }} />
                            <span style={{ fontSize: "10px", color: "#60a5fa" }}>Click to view sensitive access</span>
                          </div>
                        </div>
                        <div className="flex justify-center" style={{ marginTop: 2 }}>
                          <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(148,163,184,0.2)" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      </div>

      {/* ── Activity ── */}
      <ActivityOverviewSection row={row} gradId={`iaasUnstrOvGrad-${row.id}`} />

    </div>
  );
}

// ── Access Tab ────────────────────────────────────────────────────────────────

// (IDENTITY_TYPE_CONFIG, IDENTITY_FILTER_GROUPS, ROLE_MEMBER_POOL, getRoleMembers,
//  classifyCloudPrincipal, classifyRoleMember, UnifiedIdentity → identity-shared.tsx)

// Build a flat list of unified identities by expanding roles into their members
const EMAIL_TO_NAME: Record<string, { name: string; email: string }> = {
  "alice.chen@acme.com":          { name: "Alice Chen",        email: "alice.chen@acme.com" },
  "james.okafor@acme.com":        { name: "James Okafor",      email: "james.okafor@acme.com" },
  "margaret.sullivan@acme.com":   { name: "Margaret Sullivan", email: "margaret.sullivan@acme.com" },
  "david.kim@acme.com":           { name: "David Kim",         email: "david.kim@acme.com" },
  "rachel.wu@acme.com":           { name: "Rachel Wu",         email: "rachel.wu@acme.com" },
  "priya.sharma@acme.com":        { name: "Priya Sharma",      email: "priya.sharma@acme.com" },
  "sofia.novak@acme-emea.com":    { name: "Sofia Novak",       email: "sofia.novak@acme-emea.com" },
  "alex.johansson@acme-emea.com": { name: "Alex Johansson",    email: "alex.johansson@acme-emea.com" },
  "t.becker@consultant.io":       { name: "Thomas Becker",     email: "t.becker@consultant.io" },
};

function buildUnifiedIdentities(meta: BucketMetadata): UnifiedIdentity[] {
  const map = new Map<string, UnifiedIdentity>();

  // 1. Direct user / service entries (skip roles)
  for (const e of meta.iamEntries) {
    if (e.principalType === "role") continue;
    const resolved = EMAIL_TO_NAME[e.principal];
    const displayName = resolved ? resolved.name : e.principal;
    const email = resolved ? resolved.email : (e.principal.includes("@") ? e.principal : undefined);
    map.set(displayName, {
      key: `direct-${e.principal}`,
      name: displayName,
      email,
      identityType: classifyCloudPrincipal(e.principal, e.principalType, e.stale),
      assignedRoles: [],
      permissions: [...e.permissions],
      lastAccess: e.lastAccess,
      stale: e.stale,
      sensitiveAccess: e.sensitiveAccess,
    });
  }

  // 2. Expand role entries → member identities; role name becomes an attribute
  for (const e of meta.iamEntries) {
    if (e.principalType !== "role") continue;
    for (const m of getRoleMembers(e.principal)) {
      if (map.has(m.name)) {
        const existing = map.get(m.name)!;
        if (!existing.assignedRoles.includes(e.principal)) existing.assignedRoles.push(e.principal);
        for (const perm of e.permissions) {
          if (!existing.permissions.includes(perm)) existing.permissions.push(perm);
        }
        if (e.sensitiveAccess) existing.sensitiveAccess = true;
      } else {
        map.set(m.name, {
          key: `role-${m.name}`,
          name: m.name,
          email: (m as any).email,
          identityType: classifyRoleMember(m.identityKey, e.stale),
          assignedRoles: [e.principal],
          permissions: [...e.permissions],
          lastAccess: e.lastAccess,
          stale: e.stale,
          sensitiveAccess: e.sensitiveAccess,
        });
      }
    }
  }

  return Array.from(map.values());
}

function AccessTabContent({ row, accessFilter, onClearFilter, onSelectIdentity }: { row: IaaSUnstructuredDataRow; accessFilter: AccessFilter; onClearFilter: () => void; onSelectIdentity?: (identity: UnifiedIdentity | null) => void }) {
  const meta = getBucketMetadata(row.id);
  const allIdentities = useMemo(() => buildUnifiedIdentities(meta), [row.id]);
  const filters = useIdentityFilters(allIdentities, accessFilter);

  const composition = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of allIdentities) {
      counts[id.identityType] = (counts[id.identityType] ?? 0) + 1;
    }
    return counts;
  }, [allIdentities]);

  const activeUsers30d = useMemo(() => {
    const seed = row.id.charCodeAt(0) + row.id.charCodeAt(row.id.length - 1);
    const pct = [62, 78, 55, 84, 71, 90, 67][seed % 7];
    return Math.round(allIdentities.length * pct / 100);
  }, [row.id, allIdentities]);

  const BAR_COLOR: Record<string, string> = {
    "internal-user":       "bg-blue-400",
    "external-user":       "bg-orange-400",
    "unknown-identity":    "bg-red-400",
    "unmapped-local-user": "bg-purple-400",
    "service-account":     "bg-emerald-400",
    "connected-app":       "bg-pink-400",
  };

  const BAR_HEX: Record<string, string> = {
    "internal-user":       "#60a5fa",
    "external-user":       "#fb923c",
    "unknown-identity":    "#f87171",
    "unmapped-local-user": "#c084fc",
    "service-account":     "#34d399",
    "connected-app":       "#f472b6",
  };

  const [hoveredIdentitySegment, setHoveredIdentitySegment] = useState<{ typeId: string; clientX: number; clientY: number } | null>(null);

  return (
    <div className="flex h-full">
    <div className="flex flex-col h-full overflow-y-auto w-full">

      {/* Summary card — scrolls away */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        {accessFilter === "sensitive" && <SensitiveAccessBanner onClear={onClearFilter} />}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3.5 py-2.5 space-y-3">
          {/* Identity Composition Graph */}
          {/* Header row: total · stale | active */}
          {(() => {
            const staleCount = allIdentities.filter(id => id.stale).length;
            const isStaleActive = filters.statusFilter === "stale";
            return (
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-text-bright tabular-nums" style={{ fontSize: "20px", fontWeight: 700 }}>{formatNumber(allIdentities.length)}</span>
                    <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 400 }}>identities</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(activeUsers30d)}</span>
                  <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 400 }}>active (30d)</span>
                </div>
              </div>
            );
          })()}

          {/* Segmented composition bar – SaaS-style with hover tooltips */}
          {allIdentities.length > 0 && (
            <div className="relative" onMouseLeave={() => setHoveredIdentitySegment(null)}>
              <div className="flex w-full rounded-full overflow-hidden" style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}>
                {IDENTITY_FILTER_GROUPS.map((g) => {
                  const count = composition[g.typeId] ?? 0;
                  if (count === 0) return null;
                  const w = (count / allIdentities.length) * 100;
                  const isHov = hoveredIdentitySegment?.typeId === g.typeId;
                  const isDim = hoveredIdentitySegment !== null && !isHov;
                  return (
                    <div
                      key={g.typeId}
                      className={`${BAR_COLOR[g.typeId] ?? "bg-slate-400"} shrink-0 transition-all duration-100 cursor-pointer`}
                      style={{ width: `${w}%`, opacity: isDim ? 0.2 : isHov ? 1 : 0.82 }}
                      onMouseEnter={(ev) => setHoveredIdentitySegment({ typeId: g.typeId, clientX: ev.clientX, clientY: ev.clientY })}
                      onMouseMove={(ev) => setHoveredIdentitySegment((prev) => prev ? { ...prev, clientX: ev.clientX, clientY: ev.clientY } : prev)}
                      onClick={() => filters.setIdentityTypeFilter(
                        filters.identityTypeFilter.length === 1 && filters.identityTypeFilter[0] === g.typeId ? [] : [g.typeId]
                      )}
                    />
                  );
                })}
              </div>

              {/* Hover tooltip — follows cursor */}
              {hoveredIdentitySegment !== null && (() => {
                const g = IDENTITY_FILTER_GROUPS.find(grp => grp.typeId === hoveredIdentitySegment.typeId);
                if (!g) return null;
                const count = composition[g.typeId] ?? 0;
                const hexColor = BAR_HEX[g.typeId] ?? "#94a3b8";
                return createPortal(
                  <div
                    className="pointer-events-none"
                    style={{ position: "fixed", zIndex: 9999, left: hoveredIdentitySegment.clientX, top: hoveredIdentitySegment.clientY + 10, transform: "translateX(-50%)" }}
                  >
                    <div className="flex justify-center" style={{ marginBottom: 2 }}>
                      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "5px solid rgba(148,163,184,0.2)" }} />
                    </div>
                    <div className="border rounded-md px-2.5 py-1.5 shadow-xl whitespace-nowrap" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hexColor }} />
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#f1f5f9" }}>{g.label}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{formatNumber(count)}</span> identities
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {Math.round((count / allIdentities.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>,
                  document.body
                );
              })()}
            </div>
          )}

          {/* Composition legend */}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {IDENTITY_FILTER_GROUPS.map((g) => {
              const count = composition[g.typeId] ?? 0;
              if (count === 0) return null;
              const LEGEND_LABEL_OVERRIDE: Record<string, string> = {
                "unknown-identity":    "Unauthenticated",
                "unmapped-local-user": "Unmapped",
              };
              const PINK_LABEL_TYPES = ["service-account", "connected-app"];
              const isPink = PINK_LABEL_TYPES.includes(g.typeId);
              return (
                <span key={g.typeId} className="inline-flex items-center gap-1.5" style={{ fontSize: "10px" }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${BAR_COLOR[g.typeId] ?? "bg-slate-400"} shrink-0`} />
                  <span className={isPink ? "text-pink-400" : "text-muted-foreground"}>
                    {LEGEND_LABEL_OVERRIDE[g.typeId] ?? g.label}
                  </span>
                  <span className="text-text-bright tabular-nums" style={{ fontWeight: 500 }}>{formatNumber(count)}</span>
                </span>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 -mx-3.5" />

          {/* Public Access Row */}
          <div className="flex items-center justify-between -mx-3.5 px-3.5 -mb-2.5 pb-2.5">
            <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Public Access</span>
            {meta.publicAccess === "All public access blocked"
              ? <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 400 }}>All public access blocked</span>
              : <span className="inline-flex items-center gap-1 text-red-400" style={{ fontSize: "12px", fontWeight: 500 }}><AlertTriangle size={11} />Publicly Accessible</span>
            }
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 shrink-0 px-4 pt-2.5 pb-2.5 border-y border-border space-y-2" style={{ background: "var(--color-background)" }}>
        <IdentityFilterToolbar filters={filters} accessFilter={accessFilter} onClearFilter={onClearFilter} />
        <div className="flex items-center gap-2">
          <Users size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
            {filters.filteredIdentities.length}{filters.hasAnyFilter ? ` of ${formatNumber(allIdentities.length)}` : ""} {filters.filteredIdentities.length === 1 ? "identity" : "identities"}
          </span>
        </div>
      </div>

      {/* Identity list */}
      <div className="px-2 py-1">
        {filters.filteredIdentities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground" style={{ fontSize: "12px" }}>
            <Users size={22} className="mb-2 opacity-40" />
            No matching identities
          </div>
        ) : (
          <div className="space-y-0.5">
            {filters.filteredIdentities.map((id) => {
              const cfg = IDENTITY_TYPE_CONFIG[id.identityType] ?? IDENTITY_TYPE_CONFIG["internal-user"];
              const initials = id.name
                .split(/[\s\-_@]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join("");
              const displayName = id.identityType === "unknown-identity"
                ? (() => { const s = id.key.charCodeAt(0) + id.key.length; return `10.${(s * 7) % 256}.${(s * 13) % 256}.${(s * 3 + 1) % 254 + 1}`; })()
                : id.name;
              const hasEmail = !!(id.email || id.name.includes("@"));
              const emailDisplay = id.email ?? (id.name.includes("@") ? id.name : undefined);
              const formattedDate = (() => { const d = new Date(id.lastAccess); return isNaN(d.getTime()) ? id.lastAccess : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })();
              // Derive a deterministic subset of data types this identity has access to
              const _n = row.dataTypes.length;
              const _h = _n > 0 ? (id.key.charCodeAt(0) + id.key.length) % _n : 0;
              const _count = _n > 0 ? Math.max(1, Math.min(_n, [2, 3, 1, 4, 2, 3, 1, 2][_h % 8])) : 0;
              const dataTypeNames = _n > 0
                ? [...new Set(Array.from({ length: _count }, (_, i) => row.dataTypes[(_h + i) % _n]))]
                : [];
              return (
                <button
                  key={id.key}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40 group cursor-pointer"
                  onClick={() => { onSelectIdentity?.(id); }}
                >
                  {/* Colored avatar with initials */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none ${cfg.avatar}`}
                    style={{ background: "var(--color-nav-active, #1e293b)", fontSize: "11px", fontWeight: 700 }}
                  >
                    {initials || <cfg.Icon size={12} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Line 1: name + identity type badge + stale badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{displayName}</span>
                      <span className={`shrink-0 px-1 py-0 rounded ${cfg.badge}`} style={{ fontSize: "9px", fontWeight: 500 }}>{cfg.label}</span>
                      {id.stale && (
                        <span className="shrink-0 px-1 py-0 rounded bg-pink-500/10 text-pink-500" style={{ fontSize: "9px", fontWeight: 500 }}>Stale</span>
                      )}
                    </div>
                    {/* Line 2: email · last access */}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {hasEmail && emailDisplay && <><span className="text-muted-foreground" style={{ fontSize: "10px" }}>{emailDisplay}</span><span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>·</span></>}
                      <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>Last Active:</span>
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>{formattedDate}</span>
                    </div>
                    {/* Line 3: data types */}
                    {dataTypeNames.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>{dataTypeNames.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={12} className="shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
    </div>
  );
}

// ── Data Types Tab ────────────────────────────────────────────────────────────

// (DATA_TYPE_INFO, getDataTypeInfo, SEVERITY_CONFIG → panel-shared.tsx)

function computeDataTypeBreakdown(row: IaaSUnstructuredDataRow) {
  const counts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};
  for (const dt of row.dataTypes) { counts[dt] = 0; entityCounts[dt] = 0; }
  const seed = row.sensitiveFiles * 7 + 13;
  for (let i = 0; i < row.sensitiveFiles; i++) {
    const hash = (seed + i * 31) % 97;
    const numTypes = 1 + (hash % Math.min(3, row.dataTypes.length));
    const startIdx = (hash + i) % row.dataTypes.length;
    const seen = new Set<string>();
    for (let t = 0; t < numTypes; t++) {
      const dt = row.dataTypes[(startIdx + t) % row.dataTypes.length];
      if (!seen.has(dt)) {
        seen.add(dt);
        counts[dt] = (counts[dt] ?? 0) + 1;
        entityCounts[dt] = (entityCounts[dt] ?? 0) + 1 + ((hash + i + t) % 8);
      }
    }
  }
  return row.dataTypes.map((dt) => ({
    name: dt, fileCount: counts[dt] ?? 0, entityCount: entityCounts[dt] ?? 0, ...getDataTypeInfo(dt),
  })).sort((a, b) => b.fileCount - a.fileCount);
}

function DataTypesTabContent({ row }: { row: IaaSUnstructuredDataRow }) {
  const breakdown = useMemo(() => computeDataTypeBreakdown(row), [row]);
  const maxFileCount = useMemo(() => Math.max(...breakdown.map((b) => b.fileCount), 1), [breakdown]);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const severitySummary = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    breakdown.forEach((b) => { counts[b.severity]++; });
    return counts;
  }, [breakdown]);

  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <SectionHeading>By Severity</SectionHeading>
        <div className="flex gap-1.5">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            return (
              <div key={sev} className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${cfg.bg} border ${cfg.border}`}>
                <span className={cfg.text} style={{ fontSize: "15px", fontWeight: 600 }}>{severitySummary[sev]}</span>
                <span className={cfg.text} style={{ fontSize: "10px" }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeading>Data Types ({breakdown.length})</SectionHeading>
        <div className="space-y-1.5">
          {breakdown.map((dt) => {
            const cfg = SEVERITY_CONFIG[dt.severity];
            const pct = Math.round((dt.fileCount / maxFileCount) * 100);
            const isExpanded = expandedType === dt.name;
            return (
              <button key={dt.name} type="button"
                className={`w-full text-left bg-surface-raised border rounded-lg transition-colors ${isExpanded ? `${cfg.border} ring-1 ring-inset ${cfg.border}` : "border-border"}`}
                onClick={() => setExpandedType(isExpanded ? null : dt.name)}
              >
                <div className="px-3.5 py-2.5 cursor-pointer hover:bg-background/50 transition-colors duration-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-text-bright flex-1 min-w-0 truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{dt.name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`} style={{ fontSize: "10px", fontWeight: 500 }}>{cfg.label}</span>
                    <span className="shrink-0 text-muted-foreground" style={{ fontSize: "10px" }}>{dt.category}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 rounded-full overflow-hidden bg-background" style={{ height: "calc(var(--spacing) * 1.5)" }}>
                      <div className={`h-full ${cfg.bar} rounded-full transition-all`} style={{ width: `${pct}%`, opacity: 0.7 }} />
                    </div>
                    <span className="shrink-0 text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(dt.fileCount)}</span>
                    <span className="shrink-0 text-muted-foreground" style={{ fontSize: "10px" }}>files</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{formatNumber(dt.entityCount)} entities detected</span>
                    <span className="text-muted-foreground opacity-40">&middot;</span>
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{Math.round((dt.fileCount / row.sensitiveFiles) * 100)}% of sensitive files</span>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
                      <div>
                        <div className="text-muted-foreground mb-1" style={{ fontSize: "10px", fontWeight: 500 }}>Description</div>
                        <div className="text-text-bright" style={{ fontSize: "11px" }}>{dt.description}</div>
                      </div>
                      {dt.sampleEntities.length > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-1" style={{ fontSize: "10px", fontWeight: 500 }}>Example entities</div>
                          <div className="flex flex-wrap gap-1">
                            {dt.sampleEntities.map((e) => (
                              <span key={e} className="px-2 py-0.5 bg-background border border-border rounded font-mono text-text-bright" style={{ fontSize: "10px" }}>{e}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>Avg Entities / File</div>
                          <div className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{dt.fileCount > 0 ? (dt.entityCount / dt.fileCount).toFixed(1) : "—"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>File Coverage</div>
                          <div className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{formatNumber(dt.fileCount)} / {formatNumber(row.sensitiveFiles)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>% of Total Files</div>
                          <div className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{((dt.fileCount / row.totalFiles) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ── Activity action colors ────────────────────────────────────────────────────

const ACTIVITY_ACTION_COLORS: Record<string, string> = {
  Uploaded: "text-primary",
  Downloaded: "text-primary",
  Modified: "text-primary",
  Shared: "text-primary",
};

// ── File Preview Pane (no longer rendered inline — click goes directly to stacked panel) ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FilePreviewPane({
  file,
  row,
  onClose,
  onViewFullDetails,
}: {
  file: { name: string; entityTypes: string[]; modified: string };
  row: IaaSUnstructuredDataRow;
  onClose: () => void;
  onViewFullDetails: () => void;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
  const recentActivity = useMemo(() => generateFileAccessHistory(file.name).slice(0, 3), [file.name]);

  const extColor =
    ext === "XLSX" || ext === "XLS" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" :
    ext === "PDF" ? "bg-red-600/20 text-red-400 border-red-500/30" :
    ext === "CSV" ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
    ext === "DOCX" || ext === "DOC" ? "bg-sky-600/20 text-sky-400 border-sky-500/30" :
    "bg-slate-600/20 text-slate-400 border-slate-500/30";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${extColor}`}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.02em" }}>{ext}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-text-bright truncate" style={{ fontSize: "13px", fontWeight: 600 }}>{file.name}</div>
            <div className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "11px" }}>
              {row.name} · {row.account}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-surface-raised transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* FILE DETAILS */}
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
            File Details
          </div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Size</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{sizeKb} KB</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Last Modified</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{file.modified}</span>
            </div>
          </div>
        </div>

        {/* ENTITY DATA TYPES */}
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
            Entity Data Types ({file.entityTypes.length})
          </div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {file.entityTypes.map((dt) => {
              const cat = DT_TYPE_TO_CAT[dt] ?? "PII";
              const colors = DT_CAT_COLORS[cat] ?? DT_CAT_COLORS.PII;
              return (
                <div key={dt} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={`shrink-0 inline-flex items-center justify-center rounded ${colors.bg} ${colors.text}`}
                    style={{ fontSize: "11px", fontWeight: 400, width: 32, height: 20 }}
                  >
                    {cat}
                  </span>
                  <span className="text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
            Recent Activity
          </div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {recentActivity.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <User size={12} className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-text-bright truncate" style={{ fontSize: "12px" }}>{entry.user}</span>
                <span className={`shrink-0 ${ACTIVITY_ACTION_COLORS[entry.action] ?? "text-muted-foreground"}`} style={{ fontSize: "11px", fontWeight: 500 }}>{entry.action}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums" style={{ fontSize: "11px" }}>{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View Full Details button */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button
          type="button"
          onClick={onViewFullDetails}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          style={{ fontSize: "13px", fontWeight: 600 }}
        >
          View Full Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Sensitive Files Tab ───────────────────────────────────────────────────────

function SensitiveFilesTabContent({
  row, onViewFullDetails, dataTypeFilter = [], onDataTypeFilterChange,
}: {
  row: IaaSUnstructuredDataRow;
  dataTypeFilter?: string[];
  onDataTypeFilterChange?: (f: string[]) => void;
  onViewFullDetails?: (fileIdx: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [hoveredBarDt, setHoveredBarDt] = useState<{ dtName: string; clientX: number; clientY: number } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"data-type" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const files = useMemo(() => generatePlaceholderFiles(row.sensitiveFiles, row.dataTypes), [row.sensitiveFiles, row.dataTypes]);
  const scannedFiles = Math.max(
    row.sensitiveFiles,
    Math.round(row.totalFiles * (0.30 + (row.sensitiveFiles % 7) * 0.02)),
  );

  const dataTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dt of row.dataTypes) counts[dt] = 0;
    for (const f of files) {
      for (const et of f.entityTypes) {
        if (et in counts) counts[et]++;
      }
    }
    return counts;
  }, [files, row.dataTypes]);

  const hasActiveDataTypeFilter = dataTypeFilter.length > 0;

  const filteredFiles = useMemo(() => {
    let result = files.map((f, i) => ({ ...f, originalIdx: i }));
    if (hasActiveDataTypeFilter) {
      result = result.filter((f) => dataTypeFilter.some((dt) => f.entityTypes.some((et) => et.toLowerCase() === dt.toLowerCase())));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.entityTypes.some((et) => et.toLowerCase().includes(q)));
    }
    return result;
  }, [files, search, dataTypeFilter, hasActiveDataTypeFilter]);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

  const openDataTypePicker = useCallback(() => {
    setOpenDropdown((prev) => prev === "data-type" ? null : "data-type");
  }, []);
  const fileListRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({ count: filteredFiles.length, getScrollElement: () => fileListRef.current, estimateSize: () => 46, overscan: 10 });
  const breakdown = useMemo(() => computeDataTypeBreakdown(row), [row]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 min-h-0">

        {/* ── Summary card ─────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-border">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "20px", fontWeight: 700 }}>{formatNumber(row.sensitiveFiles)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>sensitive files</span>
                {!getBucketMetadata(row.id).publicAccess.toLowerCase().includes("blocked") && (
                  <span className="inline-flex items-center gap-1 text-red-400" style={{ fontSize: "10px", fontWeight: 600 }}>
                    <AlertTriangle size={10} className="shrink-0" />
                    Publicly Accessible
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(scannedFiles)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "10px" }}>of {formatNumber(row.totalFiles)} files scanned</span>
              </div>
            </div>
            {breakdown.length > 0 && (() => {
              const ALL_CATS = ["PII", "SPII", "PSI", "PCI", "PFI", "PHI", "PAI", "BII"] as const;
              type Cat = typeof ALL_CATS[number];
              // Build catMap: { cat → { dtName → fileCount } }
              const catMap: Record<Cat, Record<string, number>> = {} as Record<Cat, Record<string, number>>;
              for (const cat of ALL_CATS) catMap[cat] = {};
              for (const dt of breakdown) {
                const cat = (DT_TYPE_TO_CAT[dt.name] ?? "PII") as Cat;
                catMap[cat][dt.name] = (catMap[cat][dt.name] ?? 0) + dt.fileCount;
              }
              const catCounts = ALL_CATS.map((cat) => ({
                cat,
                count: Object.values(catMap[cat]).reduce((s, n) => s + n, 0),
              }));
              const presentCatCounts = catCounts.filter(({ count }) => count > 0);
              const rowTotal = presentCatCounts.reduce((s, c) => s + c.count, 0) || 1;
              return (
                <>
                  <div
                    className="flex w-full rounded-full overflow-hidden gap-px mb-2.5"
                    style={{ height: 6 }}
                    onMouseLeave={() => setHoveredBarDt(null)}
                  >
                    {presentCatCounts.map(({ cat, count }) => {
                      const colors = DT_CAT_COLORS[cat];
                      const isHovered = hoveredBarDt?.dtName === cat;
                      const catDtNames = Object.keys(catMap[cat] ?? {}).filter((k) => (catMap[cat][k] ?? 0) > 0);
                      const isFiltered = catDtNames.length > 0 && catDtNames.every((dt) => dataTypeFilter.includes(dt));
                      const isDimmed = (hoveredBarDt !== null && !isHovered) || (dataTypeFilter.length > 0 && !isFiltered && hoveredBarDt === null);
                      return (
                        <div
                          key={cat}
                          className={`${colors.dot} cursor-pointer transition-opacity duration-100`}
                          style={{ flex: count / rowTotal, opacity: isDimmed ? 0.25 : isHovered ? 1 : isFiltered ? 1 : 0.75 }}
                          onMouseEnter={(ev) => setHoveredBarDt({ dtName: cat, clientX: ev.clientX, clientY: ev.clientY })}
                          onMouseLeave={() => setHoveredBarDt(null)}
                          onClick={() => {
                            setHoveredBarDt(null);
                            onDataTypeFilterChange?.(isFiltered ? [] : catDtNames);
                          }}
                        />
                      );
                    })}
                  </div>
                  {/* Category tooltip — shown below cursor */}
                  {hoveredBarDt && (() => {
                    const cat = hoveredBarDt.dtName as Cat;
                    const colors = DT_CAT_COLORS[cat];
                    if (!colors) return null;
                    const typeCounts = catMap[cat] ?? {};
                    const sortedTypes = Object.entries(typeCounts)
                      .filter(([, n]) => n > 0)
                      .sort((a, b) => b[1] - a[1]);
                    return createPortal(
                      <div
                        className="pointer-events-none"
                        style={{ position: "fixed", zIndex: 9999, left: hoveredBarDt.clientX, top: hoveredBarDt.clientY + 10, transform: "translateX(-50%)" }}
                      >
                        <div className="flex justify-center" style={{ marginBottom: 2 }}>
                          <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "5px solid rgba(148,163,184,0.2)" }} />
                        </div>
                        <div className="border rounded-md shadow-xl" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)", minWidth: 200 }}>
                          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Files by Data Type</span>
                            <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "10px", fontWeight: 600 }}>{cat}</span>
                          </div>
                          <div className="px-3 py-2 space-y-1.5">
                            {sortedTypes.length > 0 ? sortedTypes.map(([dtName, count]) => (
                              <div key={dtName} className="flex items-center justify-between gap-3">
                                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>{dtName}</span>
                                <span style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                              </div>
                            )) : (
                              <div style={{ fontSize: "10px", color: "#475569" }}>No files</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 px-3 pb-2 pt-1 border-t" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                            <ArrowRight size={9} style={{ color: "#60a5fa" }} />
                            <span style={{ fontSize: "10px", color: "#60a5fa" }}>Click a segment to filter by type</span>
                          </div>
                        </div>
                      </div>,
                      document.body
                    );
                  })()}
                  {/* Category legend — only present cats */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {presentCatCounts.map(({ cat }) => {
                        const colors = DT_CAT_COLORS[cat];
                        return (
                          <span key={cat} className="inline-flex items-center gap-1" style={{ fontSize: "10px" }}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                            <span className="text-muted-foreground">{cat}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter files..."
              className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: "12px" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 text-muted-foreground hover:text-text-bright transition-colors"><X size={12} /></button>
            )}
          </div>

          {/* ── Entity Data Type filter pill + dropdown ── */}
          <div ref={dropdownRef} className="relative mt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {hasActiveDataTypeFilter ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button type="button" onClick={openDataTypePicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "10px", fontWeight: 500 }}>
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Data Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {dataTypeFilter.length === 1 ? dataTypeFilter[0] : `${dataTypeFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button type="button" onClick={() => { onDataTypeFilterChange?.([]); setOpenDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                    aria-label="Clear data type filter">
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={openDataTypePicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                    openDropdown === "data-type"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}>
                  <Plus size={9} />
                  Data Type
                </button>
              )}
            </div>

            {/* Dropdown */}
            {openDropdown === "data-type" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 pt-2 pb-2 border-b border-border">
                  <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {row.dataTypes.map((dt) => {
                    const count = dataTypeCounts[dt] ?? 0;
                    if (count === 0) return null;
                    return (
                      <label key={dt} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                        <input type="checkbox" checked={dataTypeFilter.includes(dt)}
                          onChange={() => { const next = dataTypeFilter.includes(dt) ? dataTypeFilter.filter((x) => x !== dt) : [...dataTypeFilter, dt]; onDataTypeFilterChange?.(next); }}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                        <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                        <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{formatNumber(count)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <FolderOpen size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {filteredFiles.length}{(search || hasActiveDataTypeFilter) ? ` of ${formatNumber(row.sensitiveFiles)}` : ""} sensitive {row.sensitiveFiles === 1 ? "file" : "files"}
            </span>
          </div>
        </div>
        <div ref={fileListRef} className="flex-1 overflow-y-auto px-2 py-1">
          {filteredFiles.length > 0 ? (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const file = filteredFiles[virtualRow.index];
                return (
                  <button key={file.originalIdx} type="button" ref={rowVirtualizer.measureElement} data-index={virtualRow.index}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                    onClick={() => onViewFullDetails?.(file.originalIdx)}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-nav-active, #1e293b)" }}>
                      <FileText size={14} className="text-muted-foreground/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 450 }}>{file.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{file.entityTypes.join(", ")}</span>
                        <span className="text-muted-foreground opacity-40 shrink-0">&middot;</span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}><span className="text-muted-foreground/60">Scanned:</span> {(() => { const d = new Date(file.modified); return isNaN(d.getTime()) ? file.modified : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (search || hasActiveDataTypeFilter) ? (
            <div className="text-center text-muted-foreground mt-6 py-4" style={{ fontSize: "12px" }}>
              {hasActiveDataTypeFilter && !search
                ? `No files found for the selected data type${dataTypeFilter.length > 1 ? "s" : ""}`
                : `No files match "${search}"`}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Row Panel Content (kept for InventorySearchResults compat) ────────────────

export function IaaSRowPanelContent({ row, storeType = "s3" }: { row: IaaSUnstructuredDataRow; storeType?: string }) {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<UnifiedIdentity | null>(null);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>(null);
  const [fileDetailFromIdx, setFileDetailFromIdx] = useState<number | null>(null);

  const closeFullDetail = useCallback(() => setFullDetailIdx(null), []);
  const handleViewFullDetails = useCallback((fileIdx: number) => setFullDetailIdx(fileIdx), []);
  const handleSelectIdentity = useCallback((id: { username: string; permission: string; identityType: string }) => {
    const identity: UnifiedIdentity = {
      key: id.username, name: id.username, email: undefined,
      identityType: id.identityType as IdentityTypeName,
      assignedRoles: [id.permission], permissions: [id.permission],
      lastAccess: "Recently", stale: false, sensitiveAccess: true,
    };
    setFileDetailFromIdx(fullDetailIdx);
    setSelectedIdentity(identity);
    setFullDetailIdx(null);
  }, [fullDetailIdx]);

  return (
    <div className="flex flex-col h-full">
      <TabbedPanelContent
        row={row} activeTab={activeTab} onTabChange={setActiveTab}
        accessFilter={accessFilter} onAccessFilterChange={setAccessFilter}
        onViewFullDetails={handleViewFullDetails} onSelectIdentity={setSelectedIdentity}
      />

      {/* Stacked identity panel */}
      {selectedIdentity && (
        <SidePanel open onClose={() => setSelectedIdentity(null)} onBack={() => setSelectedIdentity(null)}
          title={selectedIdentity.name}
          subtitle={IDENTITY_TYPE_CONFIG[selectedIdentity.identityType]?.label ?? selectedIdentity.identityType}
          panelType="identity" width="min(840px, 90vw)" zIndex={70} hideBackdrop stacked
        >
          <IdentityDetailPanel
            key={selectedIdentity.key}
            row={{ Name: selectedIdentity.name, Email: selectedIdentity.email ?? `${selectedIdentity.name.toLowerCase().replace(/\s+/g, ".")}@acme.com`, Username: selectedIdentity.email ? selectedIdentity.email.split("@")[0] : selectedIdentity.name.toLowerCase().replace(/\s+/g, "."), Domain: selectedIdentity.email ? selectedIdentity.email.split("@")[1] : "acme.com", "Access Level": selectedIdentity.assignedRoles[0] ?? "Viewer" }}
            navId={selectedIdentity.identityType} initialTab="data-stores" initialStoreFilter={row.name}
          />
        </SidePanel>
      )}

      {/* Stacked file detail panel */}
      {fullDetailIdx !== null && (() => {
        const files = generatePlaceholderFiles(row.sensitiveFiles, row.dataTypes);
        const file = files[fullDetailIdx];
        if (!file) return null;
        const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
        const filePath = `/${row.name}/${file.name}`;
        return (
          <SidePanel open onClose={closeFullDetail} onBack={closeFullDetail}
            title={file.name} subtitle={filePath} width="min(840px, 90vw)" zIndex={70}
            hideBackdrop stacked panelType="file"
            headerActions={<FileActionsMenu />}
            headerExtra={<SensitiveFileHeaderExtra name={file.name} store={row.name} storeSource={getAppTypeForStoreType(storeType)} size={`${sizeKb} KB`} />}
          >
            <SensitiveFileDetailPane
              name={file.name} path={filePath} store={row.name}
              storeSource={getAppTypeForStoreType(storeType)} size={`${sizeKb} KB`}
              lastModified={file.modified} dataTypes={file.entityTypes}
              onSelectIdentity={handleSelectIdentity}
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}

// ── Tabbed Panel Content ───────────────────────��──────────────────────────────

function TabbedPanelContent({
  row, activeTab, onTabChange, accessFilter, onAccessFilterChange, onViewFullDetails, onSelectIdentity,
}: {
  row: IaaSUnstructuredDataRow;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  accessFilter: AccessFilter;
  onAccessFilterChange: (f: AccessFilter) => void;
  onViewFullDetails?: (fileIdx: number) => void;
  onSelectIdentity?: (identity: UnifiedIdentity | null) => void;
}) {
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);

  const handleNavigateToAccess = (filter: AccessFilter) => {
    onTabChange("access");
    onAccessFilterChange(filter);
  };

  const handleNavigateToSensitiveFiles = (dataType: string) => {
    setDataTypeFilter(dataType ? [dataType] : []);
    onTabChange("sensitive-files");
  };

  return (
    <div className="flex flex-row h-full">
      <div className="shrink-0 flex flex-col gap-0 py-2 border-r border-border w-[172px]">
        {PANEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 w-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-text-bright"}`}
              style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
            >
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-primary rounded-full" />}
              <Icon size={13} className="shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.id === "sensitive-files" && (
                null
              )}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "overview"        ? <OverviewTabContent row={row} onNavigateToAccess={handleNavigateToAccess} onTabChange={onTabChange} onNavigateToSensitiveFiles={handleNavigateToSensitiveFiles} />
         : activeTab === "access"        ? <AccessTabContent row={row} accessFilter={accessFilter} onClearFilter={() => onAccessFilterChange(null)} onSelectIdentity={onSelectIdentity} />
         : <SensitiveFilesTabContent row={row} dataTypeFilter={dataTypeFilter} onDataTypeFilterChange={setDataTypeFilter} onViewFullDetails={onViewFullDetails} />}
      </div>
    </div>
  );
}

// (SparkTrend → panel-shared.tsx)

// ── Sort columns ──────────────────────────────────────────────────────────────

const SORT_COLUMNS: SortColumnDef[] = [
  { key: "name",           label: "Name" },
  { key: "account",        label: "Account" },
  { key: "org",            label: "Org" },
  { key: "sensitiveFiles", label: "# Sensitive Files" },
  { key: "totalFiles",     label: "Total Files" },
  { key: "dataTypes",      label: "Entity Data Types" },
  { key: "identities",     label: "Identities with Access" },
  { key: "uploaded",       label: "Sensitive Uploaded (7d)" },
  { key: "downloaded",     label: "Sensitive Downloaded (7d)" },
];

function compareRows(a: IaaSUnstructuredDataRow, b: IaaSUnstructuredDataRow, key: string): number {
  switch (key) {
    case "name":           return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "account":        return a.account.localeCompare(b.account, undefined, { sensitivity: "base" });
    case "org":            return a.org.localeCompare(b.org, undefined, { sensitivity: "base" });
    case "sensitiveFiles": return a.sensitiveFiles - b.sensitiveFiles;
    case "totalFiles":     return a.totalFiles - b.totalFiles;
    case "dataTypes":      return a.dataTypes.length - b.dataTypes.length;
    case "identities":     return getTotalIdentitiesCount(a.id) - getTotalIdentitiesCount(b.id);
    case "uploaded":       return sumSparkData(a.uploadSparkData) - sumSparkData(b.uploadSparkData);
    case "downloaded":     return sumSparkData(a.downloadSparkData) - sumSparkData(b.downloadSparkData);
    default:               return 0;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function UnstructuredDataStoreTableIaaS({ storeType }: { storeType: string }) {
  const config = getIaaSStoreConfig(storeType);
  const [panelRow, setPanelRow] = useState<IaaSUnstructuredDataRow | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>(null);
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<UnifiedIdentity | null>(null);
  const [fileDetailFromIdx, setFileDetailFromIdx] = useState<number | null>(null);

  const closePanel = useCallback(() => { setPanelRow(null); setActiveTab("overview"); setAccessFilter(null); setFullDetailIdx(null); setSelectedIdentity(null); setFileDetailFromIdx(null); }, []);
  const closeFullDetail = useCallback(() => { setFullDetailIdx(null); }, []);

  const handleSelectIdentityFromFile = useCallback((id: { username: string; permission: string; identityType: string }) => {
    const typeMap: Record<string, import("./identity-shared").IdentityTypeName> = {
      "Internal user":   "internal-user",
      "Service Account": "service-account",
      "External user":   "external-user",
      "Group":           "internal-user",
    };
    setFileDetailFromIdx(fullDetailIdx);
    setFullDetailIdx(null);
    setSelectedIdentity({
      key: id.username,
      name: id.username,
      identityType: typeMap[id.identityType] ?? "internal-user",
      assignedRoles: [id.permission],
      permissions: [id.permission],
      lastAccess: "2026-03-05",
      stale: false,
      sensitiveAccess: true,
    });
  }, [fullDetailIdx]);
  const handleViewFullDetails = useCallback((fileIdx: number) => { setFullDetailIdx(fileIdx); }, []);
  const openPanel = useCallback((row: IaaSUnstructuredDataRow, tab: PanelTab = "overview") => {
    setPanelRow(row); setActiveTab(tab); setAccessFilter(null); setFullDetailIdx(null);
  }, []);
  const handleTabChange = useCallback((tab: PanelTab) => { setActiveTab(tab); setFullDetailIdx(null); if (tab !== "access") setAccessFilter(null); }, []);
  const handleCellClick = useCallback((e: React.MouseEvent, row: IaaSUnstructuredDataRow) => { e.stopPropagation(); openPanel(row, "sensitive-files"); }, [openPanel]);
  const handleDataTypeCellClick = useCallback((e: React.MouseEvent, row: IaaSUnstructuredDataRow) => { e.stopPropagation(); openPanel(row, "sensitive-files"); }, [openPanel]);
  const handleIdentitiesClick = useCallback((e: React.MouseEvent, row: IaaSUnstructuredDataRow) => { e.stopPropagation(); openPanel(row, "access"); }, [openPanel]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return config.rows;
    const { key, direction } = sortConfig;
    const mul = direction === "asc" ? 1 : -1;
    return [...config.rows].sort((a, b) => mul * compareRows(a, b, key));
  }, [config.rows, sortConfig]);

  const sortColumns = useMemo<SortColumnDef[]>(
    () => SORT_COLUMNS.map((c) => c.key === "name" ? { ...c, label: config.nameColumnLabel } : c),
    [config.nameColumnLabel],
  );

  const filteredRows = useMemo(() => {
    if (!searchTerm) return sortedRows;
    return sortedRows.filter((row) => matchesSearch(searchTerm, row.name, row.nameSubtitle ?? "", row.account, row.org, ...row.dataTypes));
  }, [sortedRows, searchTerm]);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);
  const pagedRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);

  const panelWidth = "min(840px, 90vw)";

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-text-bright" style={{ fontSize: "16px", fontWeight: 600 }}>{config.title}</h2>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: "12px" }}>
              {config.subtitle} &middot; {config.rows.length} {config.rows.length === 1 ? "record" : "records"}
            </p>
          </div>
          <div className="shrink-0 mt-0.5 flex items-center gap-2">
            <SortDropdown columns={sortColumns} sortConfig={sortConfig} onSort={setSortConfig} />
            <TableSearchInput value={searchTerm} onChange={setSearchTerm} />
          </div>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "name"))}>
                {config.nameColumnLabel} <SortIcon columnKey="name" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "account"))}>
                Account <SortIcon columnKey="account" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "org"))}>
                Org <SortIcon columnKey="org" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "totalFiles"))}>
                Scanned / Total Files <SortIcon columnKey="totalFiles" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "sensitiveFiles"))}>
                Sensitive Files <SortIcon columnKey="sensitiveFiles" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500, minWidth: 220 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "dataTypes"))}>
                Data Types <SortIcon columnKey="dataTypes" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "identities"))}>
                Identities with Access <SortIcon columnKey="identities" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "uploaded"))}>
                Sensitive Uploaded (7d) <SortIcon columnKey="uploaded" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "downloaded"))}>
                Sensitive Downloaded (7d) <SortIcon columnKey="downloaded" sortConfig={sortConfig} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row) => {
            const isActive = panelRow !== null && panelRow.id === row.id;
            return (
              <tr key={row.id}
                className={`border-b border-border transition-colors cursor-pointer ${isActive ? "bg-primary/5" : "hover:bg-foreground/[0.04]"}`}
                style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                onClick={() => openPanel(row)}
              >
                <td className="px-4 py-3" style={{ fontSize: "12px", fontWeight: 500 }}>
                  <HighlightText text={row.name} query={searchTerm} className="text-primary" />
                  {row.nameSubtitle && <div style={{ fontSize: "11px", fontWeight: 400 }}><HighlightText text={row.nameSubtitle} query={searchTerm} className="text-muted-foreground" /></div>}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px" }}>
                  <HighlightText text={row.account} query={searchTerm} className="text-muted-foreground" />
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px" }}>
                  <HighlightText text={row.org} query={searchTerm} className="text-muted-foreground" />
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const scanned = Math.max(row.sensitiveFiles, Math.round(row.totalFiles * (0.30 + (row.sensitiveFiles % 7) * 0.02)));
                    const pct = row.totalFiles > 0 ? Math.round((scanned / row.totalFiles) * 100) : 0;
                    return (
                      <div>
                        <span className="tabular-nums text-text-bright" style={{ fontSize: "13px", fontWeight: 500 }}>{pct}%</span>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>of {formatNumber(row.totalFiles)}</div>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button onClick={(e) => handleCellClick(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors" style={{ fontWeight: 500 }}>
                    {formatNumber(row.sensitiveFiles)}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={(e) => handleDataTypeCellClick(e, row)}
                    className="rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors">
                    <DataTypeTags types={row.dataTypes} />
                  </button>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button onClick={(e) => handleIdentitiesClick(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors" style={{ fontWeight: 500 }}>
                    {formatNumber(getTotalIdentitiesCount(row.id))}
                  </button>
                </td>
                <td className="px-4 py-3"><SparkTrend data={row.uploadSparkData} /></td>
                <td className="px-4 py-3"><SparkTrend data={row.downloadSparkData} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <TablePagination currentPage={currentPage} totalRows={filteredRows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />

      <SidePanel open={panelRow !== null} onClose={closePanel} title={panelRow?.name ?? ""} subtitle={panelRow?.nameSubtitle} titleIcon={<DataStoreIcon storeType={storeType} size={20} />} width={panelWidth} suspended={(fullDetailIdx !== null && activeTab === "sensitive-files") || selectedIdentity !== null} pushed={(fullDetailIdx !== null && activeTab === "sensitive-files") || selectedIdentity !== null} pushedRightOffset="min(840px, 90vw)">
        {panelRow && (
          <TabbedPanelContent row={panelRow} activeTab={activeTab} onTabChange={handleTabChange} accessFilter={accessFilter} onAccessFilterChange={setAccessFilter} onViewFullDetails={handleViewFullDetails} onSelectIdentity={setSelectedIdentity} />
        )}
      </SidePanel>

      {/* Stacked identity detail side panel */}
      {panelRow && selectedIdentity && (
        <SidePanel
          open
          onClose={() => { setSelectedIdentity(null); setFileDetailFromIdx(null); }}
          onBack={() => {
            setSelectedIdentity(null);
            if (fileDetailFromIdx !== null) {
              setFullDetailIdx(fileDetailFromIdx);
              setFileDetailFromIdx(null);
            }
          }}
          title={selectedIdentity.name}
          subtitle={IDENTITY_TYPE_CONFIG[selectedIdentity.identityType]?.label ?? selectedIdentity.identityType}
          panelType="identity"
          width="min(840px, 90vw)"
          zIndex={60}
          hideBackdrop
          stacked
        >
          <IdentityDetailPanel
            key={selectedIdentity.key}
            row={{
              Name: selectedIdentity.name,
              Email: selectedIdentity.email ?? `${selectedIdentity.name.toLowerCase().replace(/\s+/g, ".")}@acme.com`,
              Username: selectedIdentity.email ? selectedIdentity.email.split("@")[0] : selectedIdentity.name.toLowerCase().replace(/\s+/g, "."),
              Domain: selectedIdentity.email ? selectedIdentity.email.split("@")[1] : "acme.com",
              "Access Level": selectedIdentity.assignedRoles[0] ?? "Viewer",
            }}
            navId={selectedIdentity.identityType}
            initialTab="data-stores"
            initialStoreFilter={panelRow.name}
          />
        </SidePanel>
      )}

      {/* Stacked file detail side panel */}
      {panelRow && fullDetailIdx !== null && (() => {
        const files = generatePlaceholderFiles(panelRow.sensitiveFiles, panelRow.dataTypes);
        const file = files[fullDetailIdx];
        if (!file) return null;
        const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
        const filePath = `/${panelRow.name}/${file.name}`;
        return (
          <SidePanel
            open
            onClose={closeFullDetail}
            onBack={closeFullDetail}
            title={file.name}
            subtitle={filePath}
            width="min(840px, 90vw)"
            zIndex={60}
            hideBackdrop
            stacked
            panelType="file"
            suspended={selectedIdentity !== null}
            pushed={selectedIdentity !== null}
            pushedRightOffset="min(840px, 90vw)"
            headerActions={<FileActionsMenu />}
            headerExtra={
              <SensitiveFileHeaderExtra
                name={file.name}
                store={panelRow.name}
                storeSource={getAppTypeForStoreType(storeType)}
                size={`${sizeKb} KB`}
              />
            }
          >
            <SensitiveFileDetailPane
              name={file.name}
              path={filePath}
              store={panelRow.name}
              storeSource={getAppTypeForStoreType(storeType)}
              size={`${sizeKb} KB`}
              lastModified={file.modified}
              dataTypes={file.entityTypes}
              onSelectIdentity={handleSelectIdentityFromFile}
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}