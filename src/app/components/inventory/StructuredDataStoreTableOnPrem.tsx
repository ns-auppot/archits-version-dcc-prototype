import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TablePagination } from "../ui/table-pagination";
import { createPortal } from "react-dom";
import { Database, Search, X, Info, Users, Shield, CheckCircle, AlertTriangle, XCircle, User, Server, TrendingUp, TrendingDown, Filter, Clock, ScanSearch, ChevronDown, ChevronUp, ChevronRight, Radar, ArrowRight, Plus, Columns } from "lucide-react";
import { ActivityOverviewSection, generateActivityLog, formatActivityDate, ACTION_META } from "./activity-shared";
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
import { FieldDetailPane } from "./FieldDetailPane";
import { DT_TYPE_TO_CAT, DT_CAT_COLORS } from "./ForensicDetailPane";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type PanelTab, makePanelTabs, PanelTabBar,
  SectionHeading, InfoRow, SecurityStatus, BoolBadge, RiskBadge, ScanStatusBadge,
  SEVERITY_CONFIG, getDataTypeInfo, SparkTrend,
} from "./panel-shared";
import {
  IDENTITY_TYPE_CONFIG, IDENTITY_FILTER_GROUPS, DB_ROLE_CONFIG,
  type UnifiedIdentity, type AccessFilter, type IdentityTypeName,
  useIdentityFilters, SensitiveAccessBanner, IdentityFilterToolbar,
} from "./identity-shared";

// ── On-Prem structured row type ──────────────────────────────────────────────

export interface OnPremStructuredDataRow {
  id: string;
  name: string;
  nameSubtitle?: string;
  sensitiveFields: number;
  totalFields: number;
  dataTypes: string[];
  uploadSparkData: number[];
  downloadSparkData: number[];
}

interface OnPremStoreConfig {
  title: string;
  subtitle: string;
  nameColumnLabel: string;
  rows: OnPremStructuredDataRow[];
}

export function getOnPremStructuredStoreConfig(storeType: string): OnPremStoreConfig {
  switch (storeType) {
    case "postgresql":
      return {
        title: "PostgreSQL Instances",
        subtitle: "On-premises PostgreSQL database instances",
        nameColumnLabel: "Instance Name",
        rows: [
          {
            id: "pg1",
            name: "PGSRV-PROD-01",
            nameSubtitle: "PostgreSQL 16.2 · dc-east-rack4",
            sensitiveFields: 156,
            totalFields: 620,
            dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Payment Cards", "Bank Account Information", "Taxpayer IDs", "Postal Addresses", "Telephone Numbers", "Email Addresses"],
            uploadSparkData: generateSparkData(170),
            downloadSparkData: generateSparkData(175),
          },
          {
            id: "pg2",
            name: "PGSRV-PROD-02",
            nameSubtitle: "PostgreSQL 16.2 · dc-east-rack4",
            sensitiveFields: 92,
            totalFields: 410,
            dataTypes: ["Medical Records", "Healthcare IDs", "Healthcare Provider IDs", "Medical Diagnoses", "Medical Procedures", "Personal Names", "Birthdates", "Gender"],
            uploadSparkData: generateSparkData(180),
            downloadSparkData: generateSparkData(185),
          },
          {
            id: "pg3",
            name: "PGSRV-DEV-01",
            nameSubtitle: "PostgreSQL 15.4 · dc-west-rack2",
            sensitiveFields: 38,
            totalFields: 275,
            dataTypes: ["Personal Names", "Email Addresses", "Passwords", "Source Code", "IP Addresses"],
            uploadSparkData: generateSparkData(190),
            downloadSparkData: generateSparkData(195),
          },
          {
            id: "pg4",
            name: "PGSRV-LEGACY",
            nameSubtitle: "PostgreSQL 13.8 · dc-east-rack1",
            sensitiveFields: 210,
            totalFields: 880,
            dataTypes: ["Personal Names", "Social Security Numbers", "Driver Licenses", "National IDs", "Passports", "Voter IDs", "Financial IDs", "Payment Cards", "Postal Addresses", "Telephone Numbers", "Birthdates"],
            uploadSparkData: generateSparkData(200),
            downloadSparkData: generateSparkData(205),
          },
        ],
      };
    case "oracle":
      return {
        title: "Oracle Instances",
        subtitle: "On-premises Oracle database instances",
        nameColumnLabel: "Instance Name",
        rows: [
          {
            id: "ora1",
            name: "ORACLEDB-PROD-01",
            nameSubtitle: "Oracle 19c · dc-east-rack3",
            sensitiveFields: 184,
            totalFields: 720,
            dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Payment Cards", "Bank Account Information", "Email Addresses", "Postal Addresses", "Telephone Numbers"],
            uploadSparkData: generateSparkData(400),
            downloadSparkData: generateSparkData(405),
          },
          {
            id: "ora2",
            name: "ORACLEDB-PROD-02",
            nameSubtitle: "Oracle 19c · dc-east-rack3",
            sensitiveFields: 76,
            totalFields: 340,
            dataTypes: ["Medical Records", "Healthcare IDs", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race"],
            uploadSparkData: generateSparkData(410),
            downloadSparkData: generateSparkData(415),
          },
          {
            id: "ora3",
            name: "ORACLEDB-LEGACY",
            nameSubtitle: "Oracle 12c · dc-west-rack1",
            sensitiveFields: 245,
            totalFields: 960,
            dataTypes: ["Personal Names", "Social Security Numbers", "Driver Licenses", "Passports", "Financial IDs", "Payment Cards", "Taxpayer IDs", "Postal Addresses", "Telephone Numbers", "Birthdates", "National IDs"],
            uploadSparkData: generateSparkData(420),
            downloadSparkData: generateSparkData(425),
          },
        ],
      };
    default:
      return { title: "", subtitle: "", nameColumnLabel: "Name", rows: [] };
  }
}

// ── Placeholder field names ───────────────────────────────────────────────────

const SAMPLE_FIELD_NAMES = [
  "users.email", "users.full_name", "users.ssn", "users.phone_number",
  "users.date_of_birth", "users.postal_address", "orders.billing_address",
  "orders.credit_card_number", "orders.cvv", "orders.cardholder_name",
  "employees.salary", "employees.bank_account", "employees.tax_id",
  "patients.medical_record_id", "patients.diagnosis_code", "patients.insurance_id",
  "contacts.home_phone", "contacts.mobile", "contacts.emergency_contact",
  "accounts.password_hash", "accounts.security_question", "accounts.recovery_email",
  "transactions.amount", "transactions.merchant_id", "transactions.ip_address",
  "profiles.gender", "profiles.ethnicity", "profiles.nationality",
  "audit_log.user_agent", "audit_log.source_ip",
];

const FIELD_TO_ENTITY_MAP: Record<string, string[]> = {
  email: ["Email Addresses"], recovery_email: ["Email Addresses"],
  full_name: ["Personal Names"], cardholder_name: ["Personal Names"], emergency_contact: ["Personal Names"],
  ssn: ["Social Security Numbers"], tax_id: ["Taxpayer IDs", "Social Security Numbers"],
  phone_number: ["Telephone Numbers"], home_phone: ["Telephone Numbers"], mobile: ["Telephone Numbers"],
  date_of_birth: ["Birthdates"], postal_address: ["Postal Addresses"], billing_address: ["Postal Addresses"],
  credit_card_number: ["Payment Cards"], cvv: ["Payment Cards"],
  salary: ["Financial IDs"], amount: ["Financial IDs"], bank_account: ["Bank Account Information"],
  merchant_id: ["Financial IDs"], medical_record_id: ["Medical Records", "Healthcare IDs"],
  diagnosis_code: ["Medical Diagnoses"], insurance_id: ["Healthcare IDs"],
  password_hash: ["Passwords"], security_question: ["Secrets and Tokens"],
  ip_address: ["IP Addresses"], source_ip: ["IP Addresses"],
  gender: ["Gender"], ethnicity: ["Ethnicity and Race"], nationality: ["National IDs"],
  user_agent: ["Domain Names"],
};

function generatePlaceholderFields(count: number, parentDataTypes: string[]) {
  const fields: { name: string; dataType: string; entityTypes: string[]; table: string; lastQueried: string }[] = [];
  const categories = ["PII", "Financial", "PCI", "Secrets", "PHI", "Credentials"];
  const seed = count * 7 + 13;
  for (let i = 0; i < count; i++) {
    const baseName = SAMPLE_FIELD_NAMES[i % SAMPLE_FIELD_NAMES.length];
    const cycle = Math.floor(i / SAMPLE_FIELD_NAMES.length);
    const fieldName = cycle === 0 ? baseName : baseName.replace(/\./, `_${cycle}.`);
    const tableName = fieldName.split(".")[0];
    const colName = fieldName.split(".").pop() || fieldName;
    const mappedTypes = FIELD_TO_ENTITY_MAP[colName] || [];
    const entityTypes: string[] = [];
    for (const mt of mappedTypes) {
      if (parentDataTypes.includes(mt) && !entityTypes.includes(mt)) { entityTypes.push(mt); break; }
    }
    if (entityTypes.length === 0 && parentDataTypes.length > 0) {
      const hash = ((seed + i * 31) % 97);
      entityTypes.push(parentDataTypes[hash % parentDataTypes.length]);
    }
    const hash = ((seed + i * 31) % 97);
    if (hash % 8 === 0 && parentDataTypes.length > 1) {
      const secondary = parentDataTypes[(hash + 3) % parentDataTypes.length];
      if (!entityTypes.includes(secondary)) entityTypes.push(secondary);
    }
    const daysAgo = ((hash + i * 13) % 55);
    const dateObj = new Date(2026, 1, 24);
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const lastQueried = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    fields.push({ name: fieldName, dataType: categories[i % categories.length], entityTypes, table: tableName, lastQueried });
  }
  return fields;
}

// ── Tab types ─────────────────────────────────────────────────────────────────

// (PanelTab, AccessFilter → panel-shared / identity-shared)

const PANEL_TABS = makePanelTabs("columns");

// ── Per-instance rich metadata ────────────────────────────────────────────────

interface DBMetadata {
  engine: string;
  version: string;
  host: string;
  port: number;
  datacenter: string;
  databaseCount: number;
  schemaCount: number;
  totalTableCount: number;
  encryption: string;
  sslEnforced: boolean;
  auditLogging: boolean;
  backupPolicy: string;
  publicAccess: string;
  backupEnabled: boolean;
  retentionPolicy: string;
  dlpPolicies: string[];
  complianceFrameworks: string[];
  lastScanDate: string;
  scanStatus: "complete" | "partial" | "pending";
  riskLevel: "low" | "medium" | "high" | "critical";
  dbUsers: { username: string; role: "superuser" | "owner" | "readwrite" | "readonly"; lastLogin: string; externalAccess: boolean; stale: boolean; sensitiveAccess: boolean }[];
  staleDataSize: string;
  shadowLastAccess: string;
  shadowLastAccessedBy: string;
}

const DB_METADATA: Record<string, DBMetadata> = {
  pg1: {
    engine: "PostgreSQL", version: "16.2", host: "pg-prod-01.internal", port: 5432,
    datacenter: "dc-east-rack4", databaseCount: 42, schemaCount: 312, totalTableCount: 1840,
    encryption: "AES-256 (TDE)", sslEnforced: true, auditLogging: true,
    publicAccess: "Enabled",
    backupPolicy: "Daily full · 4-hour incremental", backupEnabled: true,
    retentionPolicy: "7 years",
    dlpPolicies: ["SSN Detection", "PII Comprehensive Scan", "PCI-DSS Card Detection", "Financial ID Protection", "Taxpayer ID Protection"],
    complianceFrameworks: ["SOC 2 Type II", "PCI-DSS", "GDPR", "CCPA"],
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    riskLevel: "critical",
    dbUsers: [
      { username: "app_service_acct", role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "etl_pipeline_user", role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "dba_admin",         role: "superuser", lastLogin: "2026-03-02", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "reporting_ro",      role: "readonly",  lastLogin: "2026-03-04", externalAccess: false, stale: false, sensitiveAccess: false },
      { username: "backup_svc",        role: "readonly",  lastLogin: "2026-03-05", externalAccess: false, stale: true,  sensitiveAccess: false },
    ],
    staleDataSize: "420 GB",
    shadowLastAccess: "2026-03-05 23:12 UTC",
    shadowLastAccessedBy: "etl_pipeline_user",
  },
  pg2: {
    engine: "PostgreSQL", version: "16.2", host: "pg-prod-02.internal", port: 5432,
    datacenter: "dc-east-rack4", databaseCount: 18, schemaCount: 156, totalTableCount: 720,
    encryption: "AES-256 (TDE)", sslEnforced: true, auditLogging: true,
    publicAccess: "Enabled",
    backupPolicy: "Daily full · 2-hour incremental", backupEnabled: true,
    retentionPolicy: "10 years (HIPAA)",
    dlpPolicies: ["PHI Detection", "Medical Record Scan", "Healthcare ID Protection", "PII Comprehensive Scan"],
    complianceFrameworks: ["HIPAA", "GDPR", "SOC 2 Type II"],
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    riskLevel: "high",
    dbUsers: [
      { username: "ehr_app_svc",   role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "dba_admin",     role: "superuser", lastLogin: "2026-03-01", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "hipaa_auditor", role: "readonly",  lastLogin: "2026-02-28", externalAccess: false, stale: true,  sensitiveAccess: false },
      { username: "analytics_ro",  role: "readonly",  lastLogin: "2026-03-03", externalAccess: false, stale: false, sensitiveAccess: false },
    ],
    staleDataSize: "95 GB",
    shadowLastAccess: "2026-03-05 20:07 UTC",
    shadowLastAccessedBy: "ehr_app_svc",
  },
  pg3: {
    engine: "PostgreSQL", version: "15.4", host: "pg-dev-01.internal", port: 5432,
    datacenter: "dc-west-rack2", databaseCount: 8, schemaCount: 62, totalTableCount: 410,
    encryption: "None", sslEnforced: false, auditLogging: false,
    publicAccess: "Disabled",
    backupPolicy: "Daily full", backupEnabled: false,
    retentionPolicy: "90 days",
    dlpPolicies: ["Credential Scanning", "Email Address Detection"],
    complianceFrameworks: [],
    lastScanDate: "2026-02-28",
    scanStatus: "partial",
    riskLevel: "medium",
    dbUsers: [
      { username: "dev_admin",   role: "superuser", lastLogin: "2026-03-04", externalAccess: true,  stale: false, sensitiveAccess: true },
      { username: "dev_app_svc", role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "qa_ro",       role: "readonly",  lastLogin: "2026-03-03", externalAccess: false, stale: true,  sensitiveAccess: false },
    ],
    staleDataSize: "18 GB",
    shadowLastAccess: "2026-03-05 16:45 UTC",
    shadowLastAccessedBy: "dev_app_svc",
  },
  pg4: {
    engine: "PostgreSQL", version: "13.8", host: "pg-legacy.internal", port: 5432,
    datacenter: "dc-east-rack1", databaseCount: 67, schemaCount: 520, totalTableCount: 3100,
    encryption: "AES-256 (TDE)", sslEnforced: true, auditLogging: true,
    publicAccess: "Enabled",
    backupPolicy: "Daily full · 6-hour incremental", backupEnabled: true,
    retentionPolicy: "10 years (Legal Hold)",
    dlpPolicies: ["SSN Detection", "PII Comprehensive Scan", "Passport Detection", "Driver License Detection", "Financial ID Protection", "PCI-DSS Card Detection"],
    complianceFrameworks: ["SOC 2 Type II", "GDPR", "CCPA", "SOX"],
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    riskLevel: "critical",
    dbUsers: [
      { username: "legacy_app_svc",  role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "dba_admin",       role: "superuser", lastLogin: "2026-03-02", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "compliance_ro",   role: "readonly",  lastLogin: "2026-02-25", externalAccess: false, stale: true,  sensitiveAccess: false },
      { username: "migration_svc",   role: "readwrite", lastLogin: "2026-02-20", externalAccess: false, stale: true,  sensitiveAccess: true },
    ],
    staleDataSize: "1.4 TB",
    shadowLastAccess: "2026-03-05 09:33 UTC",
    shadowLastAccessedBy: "legacy_app_svc",
  },
  ora1: {
    engine: "Oracle", version: "19c", host: "ora-prod-01.internal", port: 1521,
    datacenter: "dc-east-rack3", databaseCount: 28, schemaCount: 480, totalTableCount: 2600,
    encryption: "Oracle TDE (AES-256)", sslEnforced: true, auditLogging: true,
    publicAccess: "Enabled",
    backupPolicy: "Daily RMAN full · Hourly archive log", backupEnabled: true,
    retentionPolicy: "7 years",
    dlpPolicies: ["SSN Detection", "PCI-DSS Card Detection", "Financial ID Protection", "PII Comprehensive Scan"],
    complianceFrameworks: ["PCI-DSS", "SOX", "SOC 2 Type II", "GDPR"],
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    riskLevel: "critical",
    dbUsers: [
      { username: "APPS",       role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "SYS",        role: "superuser", lastLogin: "2026-03-02", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "REPORTS_RO", role: "readonly",  lastLogin: "2026-03-04", externalAccess: false, stale: false, sensitiveAccess: false },
      { username: "ETL_SVC",    role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "AUDIT_RO",   role: "readonly",  lastLogin: "2026-02-28", externalAccess: false, stale: true,  sensitiveAccess: false },
    ],
    staleDataSize: "560 GB",
    shadowLastAccess: "2026-03-05 21:33 UTC",
    shadowLastAccessedBy: "ETL_SVC",
  },
  ora2: {
    engine: "Oracle", version: "19c", host: "ora-prod-02.internal", port: 1521,
    datacenter: "dc-east-rack3", databaseCount: 12, schemaCount: 210, totalTableCount: 980,
    encryption: "Oracle TDE (AES-256)", sslEnforced: true, auditLogging: true,
    publicAccess: "Enabled",
    backupPolicy: "Daily RMAN full · 4-hour archive log", backupEnabled: true,
    retentionPolicy: "10 years (HIPAA)",
    dlpPolicies: ["PHI Detection", "Medical Record Scan", "Healthcare ID Protection"],
    complianceFrameworks: ["HIPAA", "GDPR", "SOC 2 Type II"],
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    riskLevel: "high",
    dbUsers: [
      { username: "EHR_APP",    role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "SYS",        role: "superuser", lastLogin: "2026-03-01", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "HIPAA_AUDIT",role: "readonly",  lastLogin: "2026-02-27", externalAccess: false, stale: true,  sensitiveAccess: false },
    ],
    staleDataSize: "85 GB",
    shadowLastAccess: "2026-03-05 18:44 UTC",
    shadowLastAccessedBy: "EHR_APP",
  },
  ora3: {
    engine: "Oracle", version: "12c", host: "ora-legacy.internal", port: 1521,
    datacenter: "dc-west-rack1", databaseCount: 45, schemaCount: 680, totalTableCount: 3800,
    encryption: "Oracle TDE (AES-256)", sslEnforced: true, auditLogging: true,
    publicAccess: "Enabled",
    backupPolicy: "Daily RMAN full · 2-hour archive log", backupEnabled: true,
    retentionPolicy: "10 years (Legal Hold)",
    dlpPolicies: ["SSN Detection", "PII Comprehensive Scan", "Passport Detection", "Driver License Detection", "Financial ID Protection", "PCI-DSS Card Detection", "Taxpayer ID Protection"],
    complianceFrameworks: ["SOX", "PCI-DSS", "GDPR", "CCPA", "SOC 2 Type II"],
    lastScanDate: "2026-02-27",
    scanStatus: "partial",
    riskLevel: "critical",
    dbUsers: [
      { username: "LEGACY_APP",   role: "readwrite", lastLogin: "2026-03-05", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "SYS",          role: "superuser", lastLogin: "2026-03-03", externalAccess: false, stale: false, sensitiveAccess: true },
      { username: "COMPLIANCE_RO",role: "readonly",  lastLogin: "2026-02-25", externalAccess: false, stale: true,  sensitiveAccess: false },
      { username: "MIGRATION_SVC",role: "owner",     lastLogin: "2026-02-15", externalAccess: true,  stale: true,  sensitiveAccess: true },
      { username: "AUDIT_SVC",    role: "readonly",  lastLogin: "2026-03-01", externalAccess: false, stale: false, sensitiveAccess: false },
    ],
    staleDataSize: "2.3 TB",
    shadowLastAccess: "2026-03-05 14:11 UTC",
    shadowLastAccessedBy: "LEGACY_APP",
  },
};

function getDBMetadata(rowId: string): DBMetadata {
  return DB_METADATA[rowId] ?? DB_METADATA["pg1"];
}

function getTotalIdentitiesCount(rowId: string): number {
  const meta = getDBMetadata(rowId);
  return meta.dbUsers.length;
}

// (SectionHeading, InfoRow, SecurityStatus, RiskBadge, ScanStatusBadge, BoolBadge → panel-shared.tsx)

// ── Overview Tab ──────────────────────��───────────────────────────────────────

function OverviewTabContent({ row, onNavigateToAccess, onTabChange }: { row: OnPremStructuredDataRow; onNavigateToAccess: (f: AccessFilter) => void; onTabChange?: (tab: PanelTab) => void }) {
  const meta = getDBMetadata(row.id);
  const staleCount = meta.dbUsers.filter(u => u.stale).length;
  const sensitiveCount = meta.dbUsers.filter(u => u.sensitiveAccess).length;
  const [hoveredAccessSegment, setHoveredAccessSegment] = useState<number | null>(null);

  // scannedColumns: deterministic fraction of totalFields, always >= sensitiveFields
  const scannedColumns = Math.max(
    row.sensitiveFields,
    Math.round(row.totalFields * (0.30 + (row.sensitiveFields % 7) * 0.02)),
  );

  // Data type breakdown for tooltip
  const breakdown = useMemo(() => computeFieldDataTypeBreakdown(row), [row]);
  const [columnsBarHovered, setColumnsBarHovered] = useState(false);
  const sensitivePct = Math.min(100, (row.sensitiveFields / Math.max(scannedColumns, row.sensitiveFields, 1)) * 100);
  const cleanPct = 100 - sensitivePct;
  const cleanColumns = Math.max(0, scannedColumns - row.sensitiveFields);

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Basic Information & Security Configuration - side by side */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-white dark:bg-slate-900 border border-border rounded-lg px-3.5 py-3">
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Basic Information</div>
          <div className="flex gap-0">
            <div className="flex-1 space-y-2 pr-3">
              <InfoRow label="Engine" value={
                <span className="inline-flex items-center gap-1">
                  <Server size={11} className="text-muted-foreground" />
                  {meta.engine} {meta.version}
                </span>
              } />
              <InfoRow label="Host" value={meta.host} mono />
              <InfoRow label="Port" value={String(meta.port)} mono />
              <InfoRow label="Datacenter" value={meta.datacenter} />
            </div>
            <div className="w-px bg-border/40 self-stretch" />
            <div className="flex-1 space-y-2 pl-3">
              <InfoRow label="Databases" value={formatNumber(meta.databaseCount)} />
              <InfoRow label="Schemas" value={formatNumber(meta.schemaCount)} />
              <InfoRow label="Tables" value={formatNumber(meta.totalTableCount)} />
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

        <div className="col-span-4">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">
            <div className="px-3.5 pt-2.5 pb-2">
              <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Security Configuration</span>
            </div>
            <div className="px-3.5 pb-6 space-y-2">
              <InfoRow label="Encryption" value={<SecurityStatus enabled={meta.encryption.toLowerCase() !== "none"} />} />
              <InfoRow label="Public Access" value={
                meta.publicAccess === "Disabled"
                  ? <span className="inline-flex items-center gap-1 text-red-400"><AlertTriangle size={11} />Publicly Accessible</span>
                  : <span className="text-text-bright" style={{ fontWeight: 400 }}>No public access</span>
              } />
              <InfoRow label="Backup" value={<SecurityStatus enabled={meta.backupEnabled} />} />
            </div>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

          {/* Card header */}
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-border/30">
            <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Columns</span>
            <button
              type="button"
              onClick={() => onTabChange?.("sensitive-fields")}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <span>View sensitive columns</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Card body: left KPI | divider | right content */}
          <div className="flex items-stretch px-3.5 py-3 gap-0">

            {/* Left: sensitive columns KPI */}
            <button
              type="button"
              onClick={() => onTabChange?.("sensitive-fields")}
              className="shrink-0 pr-4 flex flex-col justify-center hover:bg-blue-500/10 transition-colors text-left rounded-lg px-2 -mx-2"
              style={{ minWidth: 90 }}
            >
              <span className="text-text-bright tabular-nums" style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1 }}>
                {formatNumber(row.sensitiveFields)}
              </span>
              <span className="text-muted-foreground mt-1" style={{ fontSize: "10px" }}>sensitive columns</span>
            </button>

            {/* Vertical divider */}
            <div className="w-px bg-border/50 mx-3.5 shrink-0" />

            {/* Right: headline + scan meta + bar */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">

              {/* Headline row + scan meta */}
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onTabChange?.("sensitive-fields")}
                  className="hover:bg-blue-500/10 transition-colors text-left rounded px-1.5 -mx-1.5 py-0.5 -my-0.5"
                >
                  <span className="text-text-bright tabular-nums" style={{ fontSize: "16px", fontWeight: 700 }}>
                    {formatNumber(scannedColumns)}
                  </span>
                  <span className="text-muted-foreground ml-1" style={{ fontSize: "11px" }}>
                    of {formatNumber(row.totalFields)} columns scanned
                  </span>
                </button>
                
              </div>

              {/* Single-segment bar: sensitive (blue) + clean (gray) */}
              <div className="relative" onMouseLeave={() => setColumnsBarHovered(false)}>
                <div
                  className="flex w-full rounded-full overflow-hidden"
                  style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}
                >
                  {sensitivePct > 0 && (
                    <div
                      className="transition-all duration-100 shrink-0 cursor-pointer"
                      style={{ width: `${sensitivePct}%`, background: "#60a5fa", opacity: columnsBarHovered ? 1 : 0.82 }}
                      onMouseEnter={() => setColumnsBarHovered(true)}
                      onClick={(e) => { e.stopPropagation(); onTabChange?.("sensitive-fields"); }}
                    />
                  )}
                  {cleanPct > 0 && (
                    <div
                      className="shrink-0 transition-all duration-100 cursor-pointer"
                      style={{ width: `${cleanPct}%`, background: "rgba(148,163,184,0.15)", opacity: columnsBarHovered ? 0.4 : 1 }}
                      onClick={() => onTabChange?.("sensitive-fields")}
                    />
                  )}
                </div>

                {/* Bar foot labels */}
                <div className="flex items-center justify-between mt-1 px-0" style={{ fontSize: "10px" }}>
                  <span style={{ color: "#60a5fa" }}>{formatNumber(row.sensitiveFields)} sensitive columns</span>
                  <span style={{ color: "#94a3b8" }}>{formatNumber(cleanColumns)} not sensitive</span>
                </div>

                {/* Breakdown tooltip on hover */}
                {columnsBarHovered && breakdown.length > 0 && (
                  <div
                    className="absolute pointer-events-none z-50"
                    style={{ bottom: "calc(100% + 10px)", left: `${Math.min(sensitivePct / 2, 70)}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="border rounded-md shadow-xl" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)", minWidth: 220 }}>
                      <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 border-b" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Columns by Data Type</span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{formatNumber(row.sensitiveFields)} sensitive</span>
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
                              <span style={{ fontSize: "10px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{formatNumber(dt.fieldCount)}</span>
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
            <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Access</span>
            <button
              type="button"
              onClick={() => onNavigateToAccess(null)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <span>View access</span>
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
                  {formatNumber(meta.dbUsers.length)}
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
                for (const u of meta.dbUsers) {
                  if (!u.sensitiveAccess) continue;
                  let k: string;
                  if (u.stale) k = "unknown-identity";
                  else if (u.externalAccess) k = "external-user";
                  else k = "unmapped-local-user";
                  sensitiveByType[k] = (sensitiveByType[k] ?? 0) + 1;
                }
                const TYPE_ORDER = ["unknown-identity", "unmapped-local-user", "external-user", "internal-user"];
                const breakdown = TYPE_ORDER
                  .filter(t => (sensitiveByType[t] ?? 0) > 0)
                  .map(t => ({ key: t, count: sensitiveByType[t], label: IDENT_LABELS[t] ?? t }));

                const total = meta.dbUsers.length;
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
      <ActivityOverviewSection row={row} gradId={`onpremStrOvGrad-${row.id}`} />

    </div>
  );
}

// ── Access Tab ────────────────────────────────────────────────────────────────

// (DB_ROLE_CONFIG, IDENTITY_TYPE_CONFIG, IDENTITY_FILTER_GROUPS → identity-shared.tsx)

function classifyOnPremUser(username: string, externalAccess: boolean, stale: boolean): IdentityTypeName {
  if (stale) return "unknown-identity";
  if (externalAccess) return "external-user";
  const n = username.toLowerCase();
  if (n.endsWith("_svc") || n.endsWith("_acct") || n.includes("service") || n.includes("pipeline") || n.includes("_svc_")) return "service-account";
  return "unmapped-local-user";
}

function buildOnPremUnifiedIdentities(meta: DBMetadata): UnifiedIdentity[] {
  return meta.dbUsers.map((u, i) => ({
    key: `db-${u.username}-${i}`,
    name: u.username,
    identityType: classifyOnPremUser(u.username, u.externalAccess, u.stale),
    assignedRoles: [],
    permissions: [],
    lastAccess: u.lastLogin,
    stale: u.stale,
    sensitiveAccess: u.sensitiveAccess,
    source: "db" as const,
    dbRole: u.role,
  }));
}

function AccessTabContent({ row, accessFilter, onClearFilter, onSelectIdentity }: { row: OnPremStructuredDataRow; accessFilter: AccessFilter; onClearFilter: () => void; onSelectIdentity?: (identity: UnifiedIdentity | null) => void }) {
  const meta = getDBMetadata(row.id);
  const allIdentities = useMemo(() => buildOnPremUnifiedIdentities(meta), [row.id]);
  const filters = useIdentityFilters(allIdentities, accessFilter);
  const externalCount = meta.dbUsers.filter((u) => u.externalAccess).length;

  const composition = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const identity of allIdentities) {
      const type = identity.identityType;
      counts[type] = (counts[type] ?? 0) + 1;
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

          {/* Composition bar — excludes "unknown-identity" since stale is cross-type */}
          {allIdentities.length > 0 && (
            <div className="relative" onMouseLeave={() => setHoveredIdentitySegment(null)}>
              <div className="flex w-full rounded-full overflow-hidden" style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}>
                {IDENTITY_FILTER_GROUPS.filter(g => g.typeId !== "unknown-identity").map((g) => {
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

          {/* Composition legend — excludes "unknown-identity" */}
          <div className="flex items-center gap-3 flex-wrap">
            {IDENTITY_FILTER_GROUPS.filter(g => g.typeId !== "unknown-identity").map((g) => {
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
            {meta.publicAccess === "Disabled"
              ? <span className="inline-flex items-center gap-1 text-red-400" style={{ fontSize: "12px", fontWeight: 500 }}><AlertTriangle size={11} />Publicly Accessible</span>
              : <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 400 }}>No public access</span>
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
              const _n = row.dataTypes.length;
              const _h = _n > 0 ? (id.key.charCodeAt(0) + id.key.length) % _n : 0;
              const _count = _n > 0 ? Math.max(1, Math.min(_n, [2, 3, 1, 4, 2, 3, 1, 2][_h % 8])) : 0;
              const idDataTypes = _n > 0
                ? [...new Set(Array.from({ length: _count }, (_, i) => row.dataTypes[(_h + i) % _n]))]
                : [];
              return (
                <button
                  key={id.key}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40 group cursor-pointer"
                  onClick={() => { onSelectIdentity?.(id); }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none ${cfg.avatar}`}
                    style={{ background: "var(--color-nav-active, #1e293b)", fontSize: "11px", fontWeight: 700 }}
                  >
                    {initials || <cfg.Icon size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{displayName}</span>
                      <span className={`shrink-0 px-1 py-0 rounded ${cfg.badge}`} style={{ fontSize: "9px", fontWeight: 500 }}>{cfg.label}</span>
                      {id.stale && (
                        <span className="shrink-0 px-1 py-0 rounded bg-pink-500/10 text-pink-400" style={{ fontSize: "9px", fontWeight: 500 }}>Stale</span>
                      )}
                    </div>
                    {/* Line 2: email · last access */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {hasEmail && emailDisplay && <><span className="text-muted-foreground" style={{ fontSize: "10px" }}>{emailDisplay}</span><span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>·</span></>}
                      <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>Last Active:</span>
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>{formattedDate}</span>
                    </div>
                    {/* Line 3: data types from columns/schemas */}
                    {idDataTypes.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>{idDataTypes.join(", ")}</span>
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

function computeFieldDataTypeBreakdown(row: OnPremStructuredDataRow) {
  const fields = generatePlaceholderFields(row.sensitiveFields, row.dataTypes);
  const counts: Record<string, number> = {};
  for (const dt of row.dataTypes) counts[dt] = 0;
  for (const field of fields) {
    for (const et of field.entityTypes) {
      if (et in counts) counts[et] = (counts[et] ?? 0) + 1;
    }
  }
  return row.dataTypes.map((dt) => ({
    name: dt, fieldCount: counts[dt] ?? 0, ...getDataTypeInfo(dt),
  })).sort((a, b) => b.fieldCount - a.fieldCount);
}

function StatWithTooltip({ value, label, tooltip }: { value: string; label: string; tooltip: string }) {
  return (
    <span className="relative group inline-flex items-center gap-0.5 cursor-default select-none">
      <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
        {value} {label}
      </span>
      <Info className="text-muted-foreground opacity-30 group-hover:opacity-60 transition-opacity shrink-0" style={{ width: 9, height: 9 }} />
      <span
        className="absolute bottom-full left-0 mb-1.5 w-52 px-2.5 py-2 bg-[#0f1a2e] border border-border rounded-md shadow-xl text-text-bright opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal"
        style={{ fontSize: "10px", lineHeight: "1.5" }}
      >
        {tooltip}
      </span>
    </span>
  );
}

function DataTypesTabContent({ row }: { row: OnPremStructuredDataRow }) {
  const breakdown = useMemo(() => computeFieldDataTypeBreakdown(row), [row]);
  const maxCount = useMemo(() => Math.max(...breakdown.map((b) => b.fieldCount), 1), [breakdown]);
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
            const pct = Math.round((dt.fieldCount / maxCount) * 100);
            const isExpanded = expandedType === dt.name;
            return (
              <button key={dt.name} type="button"
                className={`w-full text-left bg-white dark:bg-slate-900 border rounded-lg transition-colors ${isExpanded ? `${cfg.border} ring-1 ring-inset ${cfg.border}` : "border-border"}`}
                onClick={() => setExpandedType(isExpanded ? null : dt.name)}
              >
                <div className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-text-bright flex-1 min-w-0 truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{dt.name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`} style={{ fontSize: "10px", fontWeight: 500 }}>{cfg.label}</span>
                    <span className="shrink-0 text-muted-foreground" style={{ fontSize: "10px" }}>{dt.category}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 rounded-full overflow-hidden bg-background" style={{ height: "calc(var(--spacing) * 1.5)" }}>
                      <div className={`h-full ${cfg.bar} rounded-full transition-all`} style={{ width: `${pct}%`, opacity: 0.7 }} />
                    </div>
                    <span className="shrink-0 text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(dt.fieldCount)}</span>
                    <span className="shrink-0 text-muted-foreground" style={{ fontSize: "10px" }}>columns</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatWithTooltip
                      value={`${Math.round((dt.fieldCount / row.sensitiveFields) * 100)}%`}
                      label="of sensitive columns"
                      tooltip="How many of this store's classified sensitive columns belong to this data type."
                    />
                    <span className="text-muted-foreground opacity-40">&middot;</span>
                    <StatWithTooltip
                      value={`${((dt.fieldCount / row.totalFields) * 100).toFixed(1)}%`}
                      label="of all columns"
                      tooltip="How many of every column in this store — including non-sensitive ones — are classified as this data type."
                    />
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
                      <div>
                        <div className="text-muted-foreground mb-1" style={{ fontSize: "10px", fontWeight: 500 }}>Description</div>
                        <div className="text-text-bright" style={{ fontSize: "11px" }}>{dt.description}</div>
                      </div>
                      {dt.sampleEntities.length > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-1" style={{ fontSize: "10px", fontWeight: 500 }}>Sample Values</div>
                          <div className="flex flex-wrap gap-1">
                            {dt.sampleEntities.map((e) => (
                              <span key={e} className="px-2 py-0.5 bg-background border border-border rounded font-mono text-text-bright" style={{ fontSize: "10px" }}>{e}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>Field Coverage</div>
                          <div className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{formatNumber(dt.fieldCount)} / {formatNumber(row.sensitiveFields)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>% of All Columns</div>
                          <div className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{((dt.fieldCount / row.totalFields) * 100).toFixed(1)}%</div>
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

// ── Sensitive Fields Tab ──────────────────────────────────────────────────────

// ── Field Preview Pane (On-Prem) ──────────────────────────────────────────────

// (no longer rendered inline — field click goes directly to stacked detail panel)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OnPremFieldPreviewPane({
  field,
  row,
  onClose,
  onViewFullDetails,
}: {
  field: { name: string; dataType: string; table: string; entityTypes: string[]; lastQueried: string };
  row: OnPremStructuredDataRow;
  onClose: () => void;
  onViewFullDetails: () => void;
}) {
  const [tableName, colName] = field.name.includes(".")
    ? field.name.split(".")
    : ["unknown", field.name];

  const recentEvents = useMemo(() => {
    const activityRow = { 
      id: row.id, 
      name: row.name, 
      dataTypes: row.dataTypes, 
      uploadSparkData: row.uploadSparkData, 
      downloadSparkData: row.downloadSparkData 
    };
    const allEvents = generateActivityLog(activityRow);
    return allEvents.slice(0, 3);
  }, [row.id, row.name, row.dataTypes, row.uploadSparkData, row.downloadSparkData]);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
            <Database size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-text-bright truncate" style={{ fontSize: "13px", fontWeight: 600 }}>{colName}</div>
            <div className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "11px" }}>
              {tableName} · {row.name}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-surface-raised transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Column Details</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Database</span>
              <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 500 }}>{row.name}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Table</span>
              <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 500 }}>{tableName}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Column</span>
              <span className="text-text-bright font-mono" style={{ fontSize: "12px", fontWeight: 500 }}>{colName}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Category</span>
              <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 500 }}>{field.dataType}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Last Queried</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{field.lastQueried}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Entity Data Types ({field.entityTypes.length})</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {field.entityTypes.map((dt) => {
              const cat = DT_TYPE_TO_CAT[dt] ?? "PII";
              const colors = DT_CAT_COLORS[cat] ?? DT_CAT_COLORS.PII;
              return (
                <div key={dt} className="flex items-center gap-3 px-3 py-2">
                  <span className={`shrink-0 inline-flex items-center justify-center rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "11px", fontWeight: 400, width: 32, height: 20 }}>{cat}</span>
                  <span className="text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Recent Activity</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {recentEvents.map((event) => {
              const meta = ACTION_META[event.action];
              const Icon = meta.Icon;
              return (
                <div key={event.id} className="px-3 py-2.5 flex items-start gap-2">
                  <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${
                    event.action === "upload" ? "bg-primary/20 border-primary/50" :
                    event.action === "download" ? "bg-cyan-500/20 border-cyan-500/50" :
                    event.action === "create" ? "bg-emerald-500/20 border-emerald-500/50" :
                    event.action === "edit" ? "bg-amber-500/20 border-amber-500/50" :
                    event.action === "delete" ? "bg-red-500/20 border-red-500/50" :
                    event.action === "share" ? "bg-orange-500/20 border-orange-500/50" :
                    event.action === "login-failed" ? "bg-red-500/20 border-red-500/50" :
                    event.action === "permission-change" ? "bg-violet-500/20 border-violet-500/50" :
                    "bg-orange-500/20 border-orange-500/50"
                  }`}>
                    <Icon size={10} className={meta.iconCls} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${meta.badgeCls}`} style={{ fontWeight: 600 }}>
                        {meta.label}
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                        {formatActivityDate(event.timestamp)}
                      </span>
                    </div>
                    <div className="text-foreground/80" style={{ fontSize: "11px" }}>
                      <span className="text-text-bright" style={{ fontWeight: 500 }}>{event.actor}</span>
                      {" — "}
                      <span className="text-muted-foreground/70">{event.detailSegments[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button type="button" onClick={onViewFullDetails} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors" style={{ fontSize: "13px", fontWeight: 600 }}>
          View Full Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function SensitiveFieldsTabContent({
  row, onViewFullDetails,
}: {
  row: OnPremStructuredDataRow;
  onViewFullDetails?: (fieldIdx: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [hoveredBarDt, setHoveredBarDt] = useState<{ dtName: string; clientX: number; clientY: number } | null>(null);
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<"data-type" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fields = useMemo(() => generatePlaceholderFields(row.sensitiveFields, row.dataTypes), [row.sensitiveFields, row.dataTypes]);

  const fieldTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dt of row.dataTypes) counts[dt] = 0;
    for (const f of fields) {
      for (const et of f.entityTypes) {
        if (et in counts) counts[et]++;
      }
    }
    return counts;
  }, [fields, row.dataTypes]);

  const hasActiveDataTypeFilter = dataTypeFilter.length > 0;

  const filteredFields = useMemo(() => {
    let result = fields.map((f, i) => ({ ...f, originalIdx: i }));
    if (hasActiveDataTypeFilter) {
      result = result.filter((f) => dataTypeFilter.some((dt) => f.entityTypes.some((et) => et.toLowerCase() === dt.toLowerCase())));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.entityTypes.some((et) => et.toLowerCase().includes(q)) || f.table.toLowerCase().includes(q));
    }
    return result;
  }, [fields, search, dataTypeFilter, hasActiveDataTypeFilter]);

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
  const fieldListRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({ count: filteredFields.length, getScrollElement: () => fieldListRef.current, estimateSize: () => 46, overscan: 10 });
  const breakdown = useMemo(() => computeFieldDataTypeBreakdown(row), [row]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 min-h-0">

        {/* ── Summary card ─────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-border">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "20px", fontWeight: 700 }}>{formatNumber(row.sensitiveFields)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>sensitive columns</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(row.sensitiveFields)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "10px" }}>of {formatNumber(row.totalFields)} columns scanned</span>
              </div>
            </div>
            {breakdown.length > 0 && (() => {
              const ALL_CATS = ["PII", "SPII", "PSI", "PCI", "PFI", "PHI", "PAI", "BII"] as const;
              type Cat = typeof ALL_CATS[number];
              const catMap: Record<Cat, Record<string, number>> = {} as Record<Cat, Record<string, number>>;
              for (const cat of ALL_CATS) catMap[cat] = {};
              for (const dt of breakdown) {
                const cat = (DT_TYPE_TO_CAT[dt.name] ?? "PII") as Cat;
                catMap[cat][dt.name] = (catMap[cat][dt.name] ?? 0) + dt.fieldCount;
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
                            setDataTypeFilter(isFiltered ? [] : catDtNames);
                          }}
                        />
                      );
                    })}
                  </div>
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
                            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Columns by Data Type</span>
                            <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "10px", fontWeight: 600 }}>{cat}</span>
                          </div>
                          <div className="px-3 py-2 space-y-1.5">
                            {sortedTypes.length > 0 ? sortedTypes.map(([dtName, count]) => (
                              <div key={dtName} className="flex items-center justify-between gap-3">
                                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>{dtName}</span>
                                <span style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                              </div>
                            )) : (
                              <div style={{ fontSize: "10px", color: "#475569" }}>No columns</div>
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
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter fields..."
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
                  <button type="button" onClick={() => { setDataTypeFilter([]); setOpenDropdown(null); }}
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
                    const count = fieldTypeCounts[dt] ?? 0;
                    if (count === 0) return null;
                    return (
                      <label key={dt} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                        <input type="checkbox" checked={dataTypeFilter.includes(dt)}
                          onChange={() => setDataTypeFilter((prev) => prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt])}
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
            <Database size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {filteredFields.length}{(search || hasActiveDataTypeFilter) ? ` of ${formatNumber(row.sensitiveFields)}` : ""} sensitive {row.sensitiveFields === 1 ? "column" : "columns"}
            </span>
          </div>
        </div>
        <div ref={fieldListRef} className="flex-1 overflow-y-auto px-2 py-1">
          {filteredFields.length > 0 ? (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const field = filteredFields[virtualRow.index];
                return (
                  <button key={field.originalIdx} type="button" ref={rowVirtualizer.measureElement} data-index={virtualRow.index}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-foreground/[0.04]"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                    onClick={() => onViewFullDetails?.(field.originalIdx)}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-nav-active, #1e293b)" }}>
                      <Columns size={14} className="text-muted-foreground/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-text-bright truncate font-mono" style={{ fontSize: "12px", fontWeight: 450 }}>{field.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{field.entityTypes.join(", ")}</span>
                        <span className="text-muted-foreground opacity-40 shrink-0">&middot;</span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}><span className="text-muted-foreground/60">Scanned:</span> {(() => { const d = new Date(field.lastQueried); return isNaN(d.getTime()) ? field.lastQueried : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (search || hasActiveDataTypeFilter) ? (
            <div className="text-center text-muted-foreground mt-6 py-4" style={{ fontSize: "12px" }}>
              {hasActiveDataTypeFilter && !search
                ? `No fields found for the selected data type${dataTypeFilter.length > 1 ? "s" : ""}`
                : `No fields match "${search}"`}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Row Panel Content (kept for InventorySearchResults compat) ────────────────

export function OnPremStructuredRowPanelContent({ row }: { row: OnPremStructuredDataRow }) {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  return (
    <div className="flex flex-col h-full">
      <TabbedPanelContent row={row} activeTab={activeTab} onTabChange={setActiveTab} accessFilter={null} onAccessFilterChange={() => {}} />
    </div>
  );
}

// ── Tabbed Panel Content ──────────────────────────────────────────────────────

function TabbedPanelContent({
  row, activeTab, onTabChange, accessFilter, onAccessFilterChange, onViewFullDetails, onSelectIdentity,
}: {
  row: OnPremStructuredDataRow;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  accessFilter: AccessFilter;
  onAccessFilterChange: (f: AccessFilter) => void;
  onViewFullDetails?: (fieldIdx: number) => void;
  onSelectIdentity?: (identity: UnifiedIdentity | null) => void;
}) {
  const handleNavigateToAccess = (filter: AccessFilter) => {
    onTabChange("access");
    onAccessFilterChange(filter);
  };
  return (
    <div className="flex flex-row h-full">
      <PanelTabBar tabs={PANEL_TABS} activeTab={activeTab} onTabChange={onTabChange} sensitiveCount={row.sensitiveFields} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "overview"         ? <OverviewTabContent row={row} onNavigateToAccess={handleNavigateToAccess} onTabChange={onTabChange} />
         : activeTab === "access"         ? <AccessTabContent row={row} accessFilter={accessFilter} onClearFilter={() => onAccessFilterChange(null)} onSelectIdentity={onSelectIdentity} />
         : <SensitiveFieldsTabContent row={row} onViewFullDetails={onViewFullDetails} />}
      </div>
    </div>
  );
}

// ── Trend Cell ────────────────────────────────────────────────────────────────

// (SparkTrend → panel-shared.tsx)

// ── Sort columns ──────────────────────────────────────────────────────────────

const SORT_COLUMNS: SortColumnDef[] = [
  { key: "name",            label: "Name" },
  { key: "sensitiveFields", label: "# Sensitive Columns" },
  { key: "totalFields",     label: "Total Columns" },
  { key: "dataTypes",       label: "Entity Data Types" },
  { key: "identities",      label: "Identities with Access" },
  { key: "uploaded",        label: "Sensitive Uploaded (7d)" },
  { key: "downloaded",      label: "Sensitive Downloaded (7d)" },
];

function compareRows(a: OnPremStructuredDataRow, b: OnPremStructuredDataRow, key: string): number {
  switch (key) {
    case "name":            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "sensitiveFields": return a.sensitiveFields - b.sensitiveFields;
    case "totalFields":     return a.totalFields - b.totalFields;
    case "dataTypes":       return a.dataTypes.length - b.dataTypes.length;
    case "identities":      return getTotalIdentitiesCount(a.id) - getTotalIdentitiesCount(b.id);
    case "uploaded":        return sumSparkData(a.uploadSparkData) - sumSparkData(b.uploadSparkData);
    case "downloaded":      return sumSparkData(a.downloadSparkData) - sumSparkData(b.downloadSparkData);
    default:                return 0;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function StructuredDataStoreTableOnPrem({ storeType }: { storeType: string }) {
  const config = getOnPremStructuredStoreConfig(storeType);
  const [panelRow, setPanelRow] = useState<OnPremStructuredDataRow | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>(null);
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<UnifiedIdentity | null>(null);
  const [identityFromFieldIdx, setIdentityFromFieldIdx] = useState<number | null>(null);

  const closePanel = useCallback(() => { setPanelRow(null); setActiveTab("overview"); setAccessFilter(null); setFullDetailIdx(null); setSelectedIdentity(null); setIdentityFromFieldIdx(null); }, []);
  const closeFullDetail = useCallback(() => { setFullDetailIdx(null); }, []);
  const handleViewFullDetails = useCallback((fieldIdx: number) => { setFullDetailIdx(fieldIdx); }, []);
  const handleSelectIdentityFromField = useCallback((id: { username: string; role: string; identityType: string }) => {
    const typeMap: Record<string, import("./identity-shared").IdentityTypeName> = {
      "Internal user":   "internal-user",
      "Service Account": "service-account",
      "External user":   "external-user",
    };
    const identityType = typeMap[id.identityType] ?? "internal-user";
    setIdentityFromFieldIdx(fullDetailIdx);
    setFullDetailIdx(null);
    setSelectedIdentity({
      key: id.username,
      name: id.username,
      identityType,
      assignedRoles: [id.role],
      permissions: [id.role],
      lastAccess: "2026-03-05",
      stale: false,
      sensitiveAccess: true,
    });
  }, [fullDetailIdx]);
  const openPanel = useCallback((row: OnPremStructuredDataRow, tab: PanelTab = "overview") => {
    setPanelRow(row); setActiveTab(tab); setAccessFilter(null); setFullDetailIdx(null);
  }, []);
  const handleTabChange = useCallback((tab: PanelTab) => { setActiveTab(tab); setFullDetailIdx(null); if (tab !== "access") setAccessFilter(null); }, []);
  const handleCellClick = useCallback((e: React.MouseEvent, row: OnPremStructuredDataRow) => { e.stopPropagation(); openPanel(row, "sensitive-fields"); }, [openPanel]);
  const handleDataTypeCellClick = useCallback((e: React.MouseEvent, row: OnPremStructuredDataRow) => { e.stopPropagation(); openPanel(row, "sensitive-fields"); }, [openPanel]);
  const handleIdentitiesClick = useCallback((e: React.MouseEvent, row: OnPremStructuredDataRow) => { e.stopPropagation(); openPanel(row, "access"); }, [openPanel]);

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
    return sortedRows.filter((row) => matchesSearch(searchTerm, row.name, row.nameSubtitle ?? "", ...row.dataTypes));
  }, [sortedRows, searchTerm]);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);
  const pagedRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);

  const panelWidth = "min(840px, 90vw)";

  return (
    <div className="flex-1 overflow-auto" style={{ background: "var(--color-background)" }}>
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3 border-b border-border" style={{ background: "var(--color-background)" }}>
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
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "totalFields"))}>
                Scanned / Total Columns <SortIcon columnKey="totalFields" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "sensitiveFields"))}>
                Sensitive Columns <SortIcon columnKey="sensitiveFields" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500, minWidth: 220 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "dataTypes"))}>
                Entity Data Types <SortIcon columnKey="dataTypes" sortConfig={sortConfig} />
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
                <td className="px-4 py-3">
                  {(() => {
                    const scanned = Math.max(row.sensitiveFields, Math.round(row.totalFields * (0.30 + (row.sensitiveFields % 7) * 0.02)));
                    const pct = row.totalFields > 0 ? Math.round((scanned / row.totalFields) * 100) : 0;
                    return (
                      <div>
                        <span className="tabular-nums text-text-bright" style={{ fontSize: "13px", fontWeight: 500 }}>{pct}%</span>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>of {formatNumber(row.totalFields)}</div>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button onClick={(e) => handleCellClick(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors" style={{ fontWeight: 500 }}>
                    {formatNumber(row.sensitiveFields)}
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

      <SidePanel open={panelRow !== null} onClose={closePanel} title={panelRow?.name ?? ""} subtitle={panelRow?.nameSubtitle} titleIcon={<DataStoreIcon storeType={storeType} size={20} />} width={panelWidth} suspended={(fullDetailIdx !== null && activeTab === "sensitive-fields") || selectedIdentity !== null} pushed={(fullDetailIdx !== null && activeTab === "sensitive-fields") || selectedIdentity !== null} pushedRightOffset="min(840px, 90vw)">
        {panelRow && (
          <TabbedPanelContent row={panelRow} activeTab={activeTab} onTabChange={handleTabChange} accessFilter={accessFilter} onAccessFilterChange={setAccessFilter} onViewFullDetails={handleViewFullDetails} onSelectIdentity={setSelectedIdentity} />
        )}
      </SidePanel>

      {/* Stacked identity detail side panel */}
      {panelRow && selectedIdentity && (
        <SidePanel
          open
          onClose={() => { setSelectedIdentity(null); setIdentityFromFieldIdx(null); }}
          onBack={() => {
            setSelectedIdentity(null);
            if (identityFromFieldIdx !== null) {
              setFullDetailIdx(identityFromFieldIdx);
              setIdentityFromFieldIdx(null);
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

      {/* Stacked field detail side panel */}
      {panelRow && fullDetailIdx !== null && (() => {
        const fields = generatePlaceholderFields(panelRow.sensitiveFields, panelRow.dataTypes);
        const field = fields[fullDetailIdx];
        if (!field) return null;
        const [tableName, colName] = field.name.includes(".") ? field.name.split(".") : ["unknown", field.name];
        return (
          <SidePanel
            open
            onClose={closeFullDetail}
            onBack={closeFullDetail}
            title={colName}
            subtitle={`${tableName} · ${panelRow.name}`}
            width="min(840px, 90vw)"
            zIndex={60}
            hideBackdrop
            hideHeader
            stacked
          >
            <FieldDetailPane field={field} onBack={closeFullDetail} onClose={closeFullDetail} onSelectIdentity={handleSelectIdentityFromField} />
          </SidePanel>
        );
      })()}
    </div>
  );
}
