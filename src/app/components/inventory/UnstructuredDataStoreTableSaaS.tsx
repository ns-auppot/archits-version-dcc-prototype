import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TablePagination } from "../ui/table-pagination";
import { createPortal } from "react-dom";
import { FolderOpen, Search, X, FileText, Info, Users, Shield, Globe, User, ExternalLink, CheckCircle, AlertTriangle, XCircle, Tag, Eye, EyeOff, Link2, Lock, Building2, ChevronDown, Clock, Radar, ArrowUpRight, ArrowDownRight, Plus, Trash2, Share2, Edit2, ShieldX, KeyRound, TrendingUp, TrendingDown, ArrowRight, Server, Bot, Package } from "lucide-react";
import {
  Sparkline,
  DataTypeTags,
  generateSparkData,
  formatNumber,
  formatBytes,
  sumSparkData,
  sparkPctChange,
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
import { DataStoreIcon } from "./data-store-icons";
import { SensitiveFileDetailPane, SensitiveFileHeaderExtra, FileActionsMenu, DT_TYPE_TO_CAT, DT_CAT_COLORS, generateFileAccessHistory } from "./ForensicDetailPane";
import {
  SectionHeading, InfoRow, RiskBadge, ScanStatusBadge,
  SEVERITY_CONFIG, getDataTypeInfo, DATA_TYPE_PALETTE_BG, DATA_TYPE_PALETTE_TEXT,
} from "./panel-shared";
import { IDENTITY_TYPE_GROUPS, type IdentityType, MACHINE_TYPES } from "./identityRegistry";
import { IdentityDetailPanel } from "./InventoryContent";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";

// ── SaaS-specific row type ──────────────────────────────────────────────────

export interface SaaSUnstructuredDataRow {
  id: string;
  name: string;
  nameSubtitle?: string;
  appInstance: string;
  sensitiveFiles: number;
  sampledFiles: number;
  totalFiles: number;
  dataTypes: string[];
  uploadSparkData: number[];
  downloadSparkData: number[];
}

/** Compute the estimated sensitivity percentage from the scanned sample */
export function getSensitivityPct(row: SaaSUnstructuredDataRow): number {
  if (row.sampledFiles <= 0) return 0;
  return Math.round((row.sensitiveFiles / row.sampledFiles) * 100);
}

/** Map each App Instance to its cloud region */
const APP_INSTANCE_REGIONS: Record<string, string> = {
  "acme-corp.google.com": "us-central1",
  "acme-emea.google.com": "europe-west1",
  "acme.sharepoint.com": "East US",
  "acme-emea.sharepoint.com": "West Europe",
};

export function getRegionForAppInstance(appInstance: string): string {
  return APP_INSTANCE_REGIONS[appInstance] ?? "—";
}

/** Map storeType to app type display name */
export function getAppTypeForStoreType(storeType: string): string {
  switch (storeType) {
    case "drives":
      return "Google Drive";
    case "sharepoint-sites":
      return "SharePoint";
    default:
      return "SaaS";
  }
}

interface SaaSStoreTableConfig {
  title: string;
  subtitle: string;
  nameColumnLabel: string;
  appInstanceColumnLabel: string;
  rows: SaaSUnstructuredDataRow[];
}

export function getSaaSStoreConfig(storeType: string): SaaSStoreTableConfig {
  switch (storeType) {
    case "drives":
      return {
        title: "Drives",
        subtitle: "Google Drive instances with unstructured data",
        nameColumnLabel: "Drive Name",
        appInstanceColumnLabel: "App Instance",
        rows: [
          {
            id: "d1",
            name: "Engineering Shared Drive",
            appInstance: "acme-corp.google.com",
            sensitiveFiles: 142,
            sampledFiles: 480,
            totalFiles: 1203,
            dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Source Code", "Passwords", "Private Keys", "API Keys"],
            uploadSparkData: generateSparkData(10),
            downloadSparkData: generateSparkData(14),
          },
          {
            id: "d2",
            name: "Finance Team Drive",
            appInstance: "acme-corp.google.com",
            sensitiveFiles: 89,
            sampledFiles: 230,
            totalFiles: 456,
            dataTypes: ["Financial IDs", "Bank Account Information", "Payment Cards", "Social Security Numbers", "Taxpayer IDs"],
            uploadSparkData: generateSparkData(20),
            downloadSparkData: generateSparkData(25),
          },
          {
            id: "d3",
            name: "HR Confidential",
            appInstance: "acme-corp.google.com",
            sensitiveFiles: 234,
            sampledFiles: 450,
            totalFiles: 892,
            dataTypes: ["Personal Names", "Social Security Numbers", "Birthdates", "Medical Records", "Postal Addresses", "Telephone Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race"],
            uploadSparkData: generateSparkData(30),
            downloadSparkData: generateSparkData(35),
          },
          {
            id: "d4",
            name: "Marketing Assets",
            appInstance: "acme-emea.google.com",
            sensitiveFiles: 12,
            sampledFiles: 520,
            totalFiles: 2105,
            dataTypes: ["Email Addresses", "Personal Names", "Company Names"],
            uploadSparkData: generateSparkData(40),
            downloadSparkData: generateSparkData(45),
          },
          {
            id: "d5",
            name: "Legal Documents",
            appInstance: "acme-corp.google.com",
            sensitiveFiles: 317,
            sampledFiles: 610,
            totalFiles: 1540,
            dataTypes: ["Personal Names", "Financial IDs", "Taxpayer IDs", "Social Security Numbers", "Company Names", "Postal Addresses"],
            uploadSparkData: generateSparkData(50),
            downloadSparkData: generateSparkData(55),
          },
          {
            id: "d6",
            name: "Security & Compliance",
            appInstance: "acme-corp.google.com",
            sensitiveFiles: 78,
            sampledFiles: 200,
            totalFiles: 630,
            dataTypes: ["Secrets and Tokens", "Private Keys", "API Keys", "Passwords", "IP Addresses"],
            uploadSparkData: generateSparkData(60),
            downloadSparkData: generateSparkData(65),
          },
          {
            id: "d7",
            name: "APAC Sales Drive",
            appInstance: "acme-apac.google.com",
            sensitiveFiles: 43,
            sampledFiles: 310,
            totalFiles: 980,
            dataTypes: ["Personal Names", "Email Addresses", "Telephone Numbers", "Company Names"],
            uploadSparkData: generateSparkData(70),
            downloadSparkData: generateSparkData(75),
          },
          {
            id: "d8",
            name: "Product Research",
            appInstance: "acme-emea.google.com",
            sensitiveFiles: 29,
            sampledFiles: 140,
            totalFiles: 720,
            dataTypes: ["Email Addresses", "IP Addresses", "Domain Names", "UUIDs"],
            uploadSparkData: generateSparkData(80),
            downloadSparkData: generateSparkData(85),
          },
        ],
      };
    case "sharepoint-sites":
      return {
        title: "SharePoint Sites",
        subtitle: "SharePoint sites with unstructured data",
        nameColumnLabel: "Site Name",
        appInstanceColumnLabel: "App Instance",
        rows: [
          {
            id: "sp1",
            name: "Legal – Contracts",
            appInstance: "acme.sharepoint.com",
            sensitiveFiles: 310,
            sampledFiles: 640,
            totalFiles: 1840,
            dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Company Names", "Postal Addresses", "Taxpayer IDs"],
            uploadSparkData: generateSparkData(200),
            downloadSparkData: generateSparkData(205),
          },
          {
            id: "sp2",
            name: "HR – Employee Portal",
            appInstance: "acme.sharepoint.com",
            sensitiveFiles: 198,
            sampledFiles: 380,
            totalFiles: 945,
            dataTypes: ["Personal Names", "Birthdates", "Social Security Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race", "Postal Addresses"],
            uploadSparkData: generateSparkData(210),
            downloadSparkData: generateSparkData(215),
          },
          {
            id: "sp3",
            name: "Product – Roadmap Hub",
            appInstance: "acme-emea.sharepoint.com",
            sensitiveFiles: 24,
            sampledFiles: 800,
            totalFiles: 3200,
            dataTypes: ["Email Addresses", "Company Names", "Source Code"],
            uploadSparkData: generateSparkData(220),
            downloadSparkData: generateSparkData(225),
          },
          {
            id: "sp4",
            name: "Finance – Reporting",
            appInstance: "acme.sharepoint.com",
            sensitiveFiles: 156,
            sampledFiles: 290,
            totalFiles: 870,
            dataTypes: ["Financial IDs", "Bank Account Information", "Payment Cards", "Taxpayer IDs", "Social Security Numbers"],
            uploadSparkData: generateSparkData(230),
            downloadSparkData: generateSparkData(235),
          },
          {
            id: "sp5",
            name: "IT – Infrastructure Docs",
            appInstance: "acme.sharepoint.com",
            sensitiveFiles: 91,
            sampledFiles: 430,
            totalFiles: 1120,
            dataTypes: ["IP Addresses", "MAC Addresses", "Passwords", "Private Keys", "API Keys", "Secrets and Tokens"],
            uploadSparkData: generateSparkData(240),
            downloadSparkData: generateSparkData(245),
          },
          {
            id: "sp6",
            name: "Marketing – Campaigns",
            appInstance: "acme-emea.sharepoint.com",
            sensitiveFiles: 37,
            sampledFiles: 560,
            totalFiles: 2340,
            dataTypes: ["Personal Names", "Email Addresses", "Telephone Numbers", "Postal Addresses"],
            uploadSparkData: generateSparkData(250),
            downloadSparkData: generateSparkData(255),
          },
          {
            id: "sp7",
            name: "Executive – Board Materials",
            appInstance: "acme.sharepoint.com",
            sensitiveFiles: 62,
            sampledFiles: 120,
            totalFiles: 310,
            dataTypes: ["Financial IDs", "Personal Names", "Company Names", "Taxpayer IDs"],
            uploadSparkData: generateSparkData(260),
            downloadSparkData: generateSparkData(265),
          },
        ],
      };
    default:
      return { title: "", subtitle: "", nameColumnLabel: "Name", appInstanceColumnLabel: "App Instance", rows: [] };
  }
}

// ── Placeholder file names for cell panel ────────────────────────────────────

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

const EXPOSURE_TYPES_ORDER: ExposureType[] = ["externally-exposed", "over-exposed", "anonymously-accessible", "internally-shared", "private"];

function generatePlaceholderFiles(count: number, parentDataTypes: string[], rowId?: string) {
  const files: { name: string; dataTypes: string; entityTypes: string[]; modified: string; exposure: ExposureType }[] = [];
  const categories = ["PII", "Financial", "PCI", "Secrets", "PHI", "Credentials"];
  const seed = count * 7 + 13;

  // Compute exposure distribution thresholds from the same logic as getExposureBreakdown
  const rSeed = rowId ? rowId.charCodeAt(rowId.length - 1) : seed;
  const exPct = [3, 7, 1, 12, 5, 2, 9][(rSeed) % 7];
  const oePct = [5, 2, 8, 4, 11, 3, 6][(rSeed + 1) % 7];
  const anPct = [1, 0, 3, 0, 2, 0, 1][(rSeed + 2) % 7];
  const inPct = [22, 35, 18, 28, 40, 15, 31][(rSeed + 3) % 7];
  // Cumulative thresholds out of 100
  const t1 = exPct;
  const t2 = t1 + oePct;
  const t3 = t2 + anPct;
  const t4 = t3 + inPct;

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

    // Assign exposure category using deterministic bucket
    const bucket = ((hash * 7 + i * 3) % 100);
    let exposure: ExposureType;
    if (bucket < t1) exposure = "externally-exposed";
    else if (bucket < t2) exposure = "over-exposed";
    else if (bucket < t3) exposure = "anonymously-accessible";
    else if (bucket < t4) exposure = "internally-shared";
    else exposure = "private";

    files.push({ name, dataTypes: categories[i % categories.length], entityTypes, modified, exposure });
  }
  return files;
}

// ── Tab types ────────────────────────────────────────────────────────────────

type PanelTab = "overview" | "sensitive-files" | "access";
type ExposureType = "externally-exposed" | "over-exposed" | "anonymously-accessible" | "internally-shared" | "private";

type AccessCategory = "external-users" | "personal-domain-users" | "external-groups" | "sensitive-data-users" | "all-users-groups";

const ACCESS_CATEGORY_LABELS: Record<AccessCategory, string> = {
  "external-users": "External Users Accessing",
  "personal-domain-users": "External Users with Personal Domains",
  "external-groups": "External Groups Accessing",
  "sensitive-data-users": "Users with Access to Sensitive Data",
  "all-users-groups": "All Users / Groups",
};

const EXPOSURE_LABELS: Record<ExposureType, string> = {
  "externally-exposed": "Externally Exposed",
  "over-exposed": "Over Exposed",
  "anonymously-accessible": "Anonymously Accessible",
  "internally-shared": "Internally Shared",
  "private": "Private",
};

const EXPOSURE_FILTER_CONFIG: { id: ExposureType; label: string; dotColor: string }[] = [
  { id: "externally-exposed", label: "Externally Exposed", dotColor: "bg-red-400" },
  { id: "over-exposed", label: "Over Exposed", dotColor: "bg-yellow-400" },
  { id: "anonymously-accessible", label: "Anonymously Accessible", dotColor: "bg-orange-400" },
  { id: "internally-shared", label: "Internally Shared", dotColor: "bg-primary" },
  { id: "private", label: "Private", dotColor: "bg-emerald-400" },
];

const PANEL_TABS: { id: PanelTab; label: string; icon: typeof Info }[] = [
  { id: "overview",        label: "Overview",        icon: Info },
  { id: "sensitive-files", label: "Sensitive Files", icon: FileText },
  { id: "access",          label: "Identities with Access", icon: Users },
];

// ── Overview Tab Content ─────────────────────────────────────────────────────

// Per-drive realistic metadata
interface DriveMetadata {
  driveId: string;
  driveType: string;
  account: string;
  organization: string;
  owner: string;
  ownerEmail: string;
  createdDate: string;
  storageUsed: string;
  storageQuota: string;
  region: string;
  lastScanDate: string;
  scanStatus: "complete" | "partial" | "pending";
  membersCount: number;
  externalShareCount: number;
  linkSharingPolicy: string;
  externalSharingEnabled: boolean;
  topCollaborators: { name: string; email: string; role: string }[];
  retentionPolicy: string;
  dlpPolicies: string[];
  complianceFrameworks: string[];
  lastAuditDate: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  activeUsersLast30d: number;
}

const DRIVE_METADATA: Record<string, DriveMetadata> = {
  d1: {
    driveId: "0AJ7x_Engineering_SharedDrv",
    driveType: "Shared Drive",
    account: "d.chen@acme-corp.com",
    organization: "Acme Corporation",
    owner: "David Chen",
    ownerEmail: "d.chen@acme-corp.com",
    createdDate: "2022-06-14",
    storageUsed: "48.2 GB",
    storageQuota: "100 GB",
    region: "us-central1",
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    membersCount: 34,
    externalShareCount: 7,
    linkSharingPolicy: "Restricted to Organization",
    externalSharingEnabled: true,
    topCollaborators: [
      { name: "Sarah Kim", email: "s.kim@acme-corp.com", role: "Manager" },
      { name: "Marcus Rivera", email: "m.rivera@acme-corp.com", role: "Content Manager" },
      { name: "Priya Patel", email: "p.patel@acme-corp.com", role: "Contributor" },
    ],
    retentionPolicy: "7 years",
    dlpPolicies: ["Source Code Protection", "IP Address Detection", "Credential Scanning"],
    complianceFrameworks: ["SOC 2 Type II", "ISO 27001"],
    lastAuditDate: "2026-01-15",
    riskLevel: "high",
    activeUsersLast30d: 28,
  },
  d2: {
    driveId: "0BK3q_Finance_TeamDrv",
    driveType: "Shared Drive",
    account: "j.walsh@acme-corp.com",
    organization: "Acme Corporation",
    owner: "Jennifer Walsh",
    ownerEmail: "j.walsh@acme-corp.com",
    createdDate: "2021-03-22",
    storageUsed: "12.8 GB",
    storageQuota: "50 GB",
    region: "us-east1",
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    membersCount: 12,
    externalShareCount: 2,
    linkSharingPolicy: "Restricted — No Link Sharing",
    externalSharingEnabled: false,
    topCollaborators: [
      { name: "Robert Nguyen", email: "r.nguyen@acme-corp.com", role: "Manager" },
      { name: "Amanda Torres", email: "a.torres@acme-corp.com", role: "Content Manager" },
      { name: "Kevin O'Brien", email: "k.obrien@acme-corp.com", role: "Viewer" },
    ],
    retentionPolicy: "10 years (SOX requirement)",
    dlpPolicies: ["PCI-DSS Card Detection", "SSN Detection", "Bank Account Protection", "Financial Document Classification"],
    complianceFrameworks: ["SOX", "PCI-DSS", "SOC 2 Type II"],
    lastAuditDate: "2026-02-10",
    riskLevel: "critical",
    activeUsersLast30d: 9,
  },
  d3: {
    driveId: "0CM8r_HR_Confidential",
    driveType: "Shared Drive",
    account: "l.montgomery@acme-corp.com",
    organization: "Acme Corporation",
    owner: "Lisa Montgomery",
    ownerEmail: "l.montgomery@acme-corp.com",
    createdDate: "2020-11-05",
    storageUsed: "31.5 GB",
    storageQuota: "75 GB",
    region: "us-east1",
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    membersCount: 8,
    externalShareCount: 0,
    linkSharingPolicy: "Restricted — No Link Sharing",
    externalSharingEnabled: false,
    topCollaborators: [
      { name: "Carlos Mendez", email: "c.mendez@acme-corp.com", role: "Manager" },
      { name: "Emily Foster", email: "e.foster@acme-corp.com", role: "Content Manager" },
      { name: "Rachel Yoon", email: "r.yoon@acme-corp.com", role: "Contributor" },
    ],
    retentionPolicy: "7 years (HIPAA / HR policy)",
    dlpPolicies: ["SSN Detection", "PHI Detection", "Medical Record Classification", "PII Comprehensive Scan"],
    complianceFrameworks: ["HIPAA", "GDPR", "SOC 2 Type II", "CCPA"],
    lastAuditDate: "2026-02-20",
    riskLevel: "critical",
    activeUsersLast30d: 6,
  },
  d4: {
    driveId: "0DN4s_Marketing_AssetsDrv",
    driveType: "Shared Drive",
    account: "t.becker@acme-emea.com",
    organization: "Acme EMEA",
    owner: "Thomas Becker",
    ownerEmail: "t.becker@acme-emea.com",
    createdDate: "2023-01-09",
    storageUsed: "85.3 GB",
    storageQuota: "200 GB",
    region: "europe-west1",
    lastScanDate: "2026-02-28",
    scanStatus: "partial",
    membersCount: 47,
    externalShareCount: 18,
    linkSharingPolicy: "Anyone in Organization with Link",
    externalSharingEnabled: true,
    topCollaborators: [
      { name: "Sophie Laurent", email: "s.laurent@acme-emea.com", role: "Manager" },
      { name: "James Mitchell", email: "j.mitchell@acme-emea.com", role: "Content Manager" },
      { name: "Nina Kowalski", email: "n.kowalski@acme-emea.com", role: "Contributor" },
    ],
    retentionPolicy: "3 years",
    dlpPolicies: ["Email Address Detection", "Contact Information Scan"],
    complianceFrameworks: ["GDPR"],
    lastAuditDate: "2025-12-18",
    riskLevel: "low",
    activeUsersLast30d: 39,
  },
  // SharePoint sites
  sp1: {
    driveId: "SPO-Legal-Contracts-01",
    driveType: "SharePoint Document Library",
    account: "m.sullivan@acme.com",
    organization: "Acme Corporation",
    owner: "Margaret Sullivan",
    ownerEmail: "m.sullivan@acme.com",
    createdDate: "2021-08-12",
    storageUsed: "67.4 GB",
    storageQuota: "150 GB",
    region: "East US",
    lastScanDate: "2026-03-01",
    scanStatus: "complete",
    membersCount: 22,
    externalShareCount: 5,
    linkSharingPolicy: "Specific People Only",
    externalSharingEnabled: true,
    topCollaborators: [
      { name: "Daniel Park", email: "d.park@acme.com", role: "Owner" },
      { name: "Catherine Shaw", email: "c.shaw@acme.com", role: "Editor" },
      { name: "Andrew Bloom", email: "a.bloom@acme.com", role: "Reviewer" },
    ],
    retentionPolicy: "10 years (Legal Hold)",
    dlpPolicies: ["SSN Detection", "Financial ID Detection", "Contract Classification", "Taxpayer ID Protection"],
    complianceFrameworks: ["SOX", "GDPR", "CCPA"],
    lastAuditDate: "2026-02-05",
    riskLevel: "high",
    activeUsersLast30d: 16,
  },
  sp2: {
    driveId: "SPO-HR-EmployeePortal-01",
    driveType: "SharePoint Document Library",
    account: "k.hughes@acme.com",
    organization: "Acme Corporation",
    owner: "Karen Hughes",
    ownerEmail: "k.hughes@acme.com",
    createdDate: "2020-04-20",
    storageUsed: "22.1 GB",
    storageQuota: "100 GB",
    region: "East US",
    lastScanDate: "2026-03-02",
    scanStatus: "complete",
    membersCount: 15,
    externalShareCount: 0,
    linkSharingPolicy: "Disabled",
    externalSharingEnabled: false,
    topCollaborators: [
      { name: "Michael Torres", email: "m.torres@acme.com", role: "Owner" },
      { name: "Sandra Lee", email: "s.lee@acme.com", role: "Editor" },
      { name: "Brian Kelly", email: "b.kelly@acme.com", role: "Contributor" },
    ],
    retentionPolicy: "7 years (HR / HIPAA)",
    dlpPolicies: ["SSN Detection", "PHI Detection", "PII Comprehensive Scan", "Healthcare ID Protection"],
    complianceFrameworks: ["HIPAA", "GDPR", "CCPA", "SOC 2 Type II"],
    lastAuditDate: "2026-02-18",
    riskLevel: "critical",
    activeUsersLast30d: 11,
  },
  sp3: {
    driveId: "SPO-Product-RoadmapHub-01",
    driveType: "SharePoint Document Library",
    account: "a.johansson@acme-emea.com",
    organization: "Acme EMEA",
    owner: "Alex Johansson",
    ownerEmail: "a.johansson@acme-emea.com",
    createdDate: "2024-02-01",
    storageUsed: "104.7 GB",
    storageQuota: "250 GB",
    region: "West Europe",
    lastScanDate: "2026-02-27",
    scanStatus: "partial",
    membersCount: 68,
    externalShareCount: 12,
    linkSharingPolicy: "Anyone in Organization with Link",
    externalSharingEnabled: true,
    topCollaborators: [
      { name: "Laura Bergman", email: "l.bergman@acme-emea.com", role: "Owner" },
      { name: "Raj Agarwal", email: "r.agarwal@acme.com", role: "Editor" },
      { name: "Tomoko Sato", email: "t.sato@acme.com", role: "Contributor" },
    ],
    retentionPolicy: "5 years",
    dlpPolicies: ["Source Code Detection", "Email Address Detection"],
    complianceFrameworks: ["ISO 27001"],
    lastAuditDate: "2025-11-30",
    riskLevel: "low",
    activeUsersLast30d: 52,
  },
};

function getMetadata(rowId: string): DriveMetadata {
  return DRIVE_METADATA[rowId] ?? DRIVE_METADATA["d1"];
}

/** Map scan status to a human-friendly scan type label */
function getScanType(meta: DriveMetadata): { label: string; color: string; bgColor: string; borderColor: string } {
  switch (meta.scanStatus) {
    case "complete": return { label: "Discovery Scan", color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/25" };
    case "partial":  return { label: "Targeted Scan",  color: "text-yellow-400",  bgColor: "bg-yellow-500/15",  borderColor: "border-yellow-500/25" };
    case "pending":  return { label: "Ongoing Scan",   color: "text-primary",     bgColor: "bg-primary/15",     borderColor: "border-primary/25" };
  }
}

// (DATA_TYPE_PALETTE_BG/TEXT → panel-shared.tsx)
// (SectionHeading, InfoRow, RiskBadge, ScanStatusBadge → panel-shared.tsx)

function StorageBar({ used, quota }: { used: string; quota: string }) {
  const parse = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ""));
  const usedNum = parse(used);
  const quotaNum = parse(quota);
  const pct = Math.min(100, Math.round((usedNum / quotaNum) * 100));
  const barColor = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-primary";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-bright" style={{ fontSize: "11px" }}>{used}</span>
        <span className="text-muted-foreground" style={{ fontSize: "10px" }}>of {quota} ({pct}%)</span>
      </div>
      <div className="bg-surface-raised rounded-full overflow-hidden" style={{ height: "calc(var(--spacing) * 1.5)" }}>
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Deterministically compute exposure counts for sensitive files (same seed as generatePlaceholderFiles) */
function getSensitiveFileExposureCounts(row: SaaSUnstructuredDataRow): Record<ExposureType, number> {
  const rSeed = row.id.charCodeAt(row.id.length - 1);
  const exPct = [3, 7, 1, 12, 5, 2, 9][(rSeed) % 7];
  const oePct = [5, 2, 8, 4, 11, 3, 6][(rSeed + 1) % 7];
  const anPct = [1, 0, 3, 0, 2, 0, 1][(rSeed + 2) % 7];
  const inPct = [22, 35, 18, 28, 40, 15, 31][(rSeed + 3) % 7];
  const n = row.sensitiveFiles;
  const ext = Math.round(n * exPct / 100);
  const oe  = Math.round(n * oePct / 100);
  const an  = Math.round(n * anPct / 100);
  const inS = Math.round(n * inPct / 100);
  const priv = Math.max(0, n - ext - oe - an - inS);
  return { "externally-exposed": ext, "over-exposed": oe, "anonymously-accessible": an, "internally-shared": inS, "private": priv };
}

/** Deterministically derive exposure breakdown from row data */
function getExposureBreakdown(row: SaaSUnstructuredDataRow) {
  const seed = row.id.charCodeAt(row.id.length - 1);
  const total = row.totalFiles;
  const externalPct = [3, 7, 1, 12, 5, 2, 9][(seed) % 7];
  const overExposedPct = [5, 2, 8, 4, 11, 3, 6][(seed + 1) % 7];
  const anonPct = [1, 0, 3, 0, 2, 0, 1][(seed + 2) % 7];
  const internalPct = [22, 35, 18, 28, 40, 15, 31][(seed + 3) % 7];
  const external = Math.round(total * externalPct / 100);
  const overExposed = Math.round(total * overExposedPct / 100);
  const anonymous = Math.round(total * anonPct / 100);
  const internal = Math.round(total * internalPct / 100);
  const privateFiles = Math.max(0, total - external - overExposed - anonymous - internal);
  return { external, overExposed, anonymous, internal, private: privateFiles, total };
}

/** Deterministically derive access category counts from row data */
function getAccessBreakdown(row: SaaSUnstructuredDataRow) {
  const seed = row.id.charCodeAt(0) + row.id.charCodeAt(row.id.length - 1);
  const meta = getMetadata(row.id);
  const externalUsers = [3, 8, 2, 5, 12, 4, 7][(seed) % 7];
  const personalDomainUsers = Math.max(1, Math.min(externalUsers, [1, 4, 2, 2, 6, 1, 3][(seed + 1) % 7]));
  const externalGroups = [0, 2, 0, 1, 3, 0, 1][(seed + 2) % 7];
  const sensitiveDataUsers = [8, 14, 5, 22, 11, 18, 6][(seed + 3) % 7];
  const allUsersGroups = meta.membersCount + externalUsers + externalGroups;
  return { externalUsers, personalDomainUsers, externalGroups, sensitiveDataUsers, allUsersGroups };
}

/** Color palette for identity-type composition bar (matches inventory palette) */
const IDENTITY_TYPE_COLORS: Record<IdentityType, string> = {
  "internal-user":       "bg-blue-400",
  "external-user":       "bg-orange-400",
  "unknown-identity":    "bg-red-400",
  "unmapped-local-user": "bg-purple-400",
  "service-account":     "bg-emerald-400",
  "connected-app":       "bg-pink-400",
};

/** Human-readable labels for identity types */
const IDENTITY_TYPE_LABELS: Record<IdentityType, string> = {
  "internal-user":       "Internal Users",
  "external-user":       "External Users",
  "unknown-identity":    "Unknown Identities",
  "unmapped-local-user": "Unmapped",
  "service-account":     "Service Accounts",
  "connected-app":       "Connected Apps",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SAAS_IDENTITY_TYPE_CONFIG: Record<string, { badge: string; label: string; avatar: string; Icon: any }> = {
  "internal-user":       { badge: "bg-blue-500/15 text-blue-500",       label: "Internal user",   avatar: "text-slate-500", Icon: User    },
  "external-user":       { badge: "bg-orange-500/15 text-orange-500",   label: "External user",   avatar: "text-slate-500", Icon: User    },
  "unknown-identity":    { badge: "bg-red-500/15 text-red-500",         label: "Unauthenticated", avatar: "text-slate-500", Icon: User    },
  "unmapped-local-user": { badge: "bg-purple-500/15 text-purple-500",   label: "Unmapped",        avatar: "text-slate-500", Icon: User    },
  "service-account":     { badge: "bg-emerald-500/15 text-emerald-500", label: "Service Account", avatar: "text-slate-500", Icon: Server  },
  "connected-app":       { badge: "bg-pink-500/15 text-pink-500",       label: "Connected App",   avatar: "text-slate-500", Icon: Package },
};

/** Generate mock identity list for Access & Sharing tab */
interface AccessIdentity {
  name: string;
  email?: string;
  type: "internal" | "external" | "group";
  identityType: IdentityType;
  domain: string;
  isPersonalDomain: boolean;
  accessLevel: string;
  hasSensitiveAccess: boolean;
  lastActive: string;
}

function generateAccessIdentities(row: SaaSUnstructuredDataRow): AccessIdentity[] {
  const meta = getMetadata(row.id);
  const seed = row.id.charCodeAt(0);
  const identities: AccessIdentity[] = [];

  // Internal users from collaborators + generated
  meta.topCollaborators.forEach((c) => {
    identities.push({
      name: c.name, email: c.email, type: "internal", identityType: "internal-user",
      domain: c.email.split("@")[1], isPersonalDomain: false,
      accessLevel: c.role, hasSensitiveAccess: true,
      lastActive: "Mar 8, 2026",
    });
  });

  const internalNames = [
    ["Jessica Martinez", "j.martinez"], ["Tom Anderson", "t.anderson"],
    ["Kelly Nguyen", "k.nguyen"], ["Ryan Park", "r.park"],
    ["Nicole Foster", "n.foster"], ["Chris Davis", "c.davis"],
    ["Amy Sullivan", "a.sullivan"], ["Jake Thompson", "j.thompson"],
    ["Megan Clark", "m.clark"], ["Patrick Reilly", "p.reilly"],
  ];
  const unmappedUsernames = ["megan.clark", "p.reilly"];
  const corpDomain = meta.topCollaborators[0]?.email.split("@")[1] ?? "acme.com";
  const roles = ["Viewer", "Editor", "Contributor", "Reviewer"];
  for (let i = 0; i < Math.min(internalNames.length, meta.membersCount - meta.topCollaborators.length); i++) {
    const [name, prefix] = internalNames[i];
    const isUnmapped = i >= 8;
    identities.push({
      name: isUnmapped ? unmappedUsernames[i - 8] ?? prefix : name,
      email: isUnmapped ? undefined : `${prefix}@${corpDomain}`,
      type: "internal",
      identityType: isUnmapped ? "unmapped-local-user" : "internal-user",
      domain: corpDomain, isPersonalDomain: false,
      accessLevel: roles[(seed + i) % roles.length],
      hasSensitiveAccess: (seed + i) % 3 !== 0,
      lastActive: `Mar ${Math.max(1, 8 - i)}, 2026`,
    });
  }

  // Service accounts
  const serviceAccounts: [string, string][] = [
    ["ci-pipeline-bot", "ci-bot@svc." + corpDomain],
    ["backup-service", "backup@svc." + corpDomain],
    ["sync-daemon", "sync@svc." + corpDomain],
  ];
  const svcCount = [2, 1, 3, 1, 2, 1, 2][(seed + 4) % 7];
  for (let i = 0; i < Math.min(svcCount, serviceAccounts.length); i++) {
    const [name, email] = serviceAccounts[i];
    identities.push({
      name, email, type: "internal", identityType: "service-account",
      domain: corpDomain, isPersonalDomain: false,
      accessLevel: "Service",
      hasSensitiveAccess: i === 0,
      lastActive: `Mar ${Math.max(1, 9 - i)}, 2026`,
    });
  }

  // Connected apps (AI agents)
  const agentEntries: [string, string][] = [
    ["Data Classification Agent", "classifier-agent@svc." + corpDomain],
    ["Compliance Scan Agent", "compliance-agent@svc." + corpDomain],
  ];
  const agentCount = [1, 0, 1, 2, 0, 1, 1][(seed + 5) % 7];
  for (let i = 0; i < Math.min(agentCount, agentEntries.length); i++) {
    const [name, email] = agentEntries[i];
    identities.push({
      name, email, type: "internal", identityType: "connected-app",
      domain: corpDomain, isPersonalDomain: false,
      accessLevel: "Reader",
      hasSensitiveAccess: true,
      lastActive: `Mar ${Math.max(1, 10 - i)}, 2026`,
    });
  }

  // External users
  const externalEntries: [string, string, string, boolean][] = [
    ["Alex Rivera", "a.rivera@partner.io", "partner.io", false],
    ["Jordan Lee", "jordan.lee@gmail.com", "gmail.com", true],
    ["Sam Patel", "sam.patel@vendor.co", "vendor.co", false],
    ["Morgan Chen", "m.chen@yahoo.com", "yahoo.com", true],
    ["Taylor Swift", "t.swift@outlook.com", "outlook.com", true],
    ["Casey Brown", "casey@contractor.net", "contractor.net", false],
    ["Jamie Wilson", "j.wilson@hotmail.com", "hotmail.com", true],
    ["Riley Kim", "r.kim@agency.dev", "agency.dev", false],
    ["Avery Johnson", "a.johnson@consultant.biz", "consultant.biz", false],
    ["Quinn Davis", "q.davis@icloud.com", "icloud.com", true],
    ["Blake Martin", "b.martin@external.org", "external.org", false],
    ["Drew Thomas", "d.thomas@protonmail.com", "protonmail.com", true],
  ];
  const extCount = [3, 8, 2, 5, 12, 4, 7][(seed) % 7];
  for (let i = 0; i < Math.min(extCount, externalEntries.length); i++) {
    const [name, email, domain, isPersonal] = externalEntries[i];
    identities.push({
      name, email, type: "external", identityType: "external-user",
      domain, isPersonalDomain: isPersonal,
      accessLevel: (seed + i) % 3 === 0 ? "Editor" : "Viewer",
      hasSensitiveAccess: (seed + i) % 4 !== 0,
      lastActive: `Feb ${28 - i}, 2026`,
    });
  }

  // Unknown identities (anonymous / link-shared access)
  const unauthCount = [0, 1, 0, 2, 1, 0, 1][(seed + 6) % 7];
  for (let i = 0; i < unauthCount; i++) {
    const s = seed + i;
    const ip = `10.${(s * 7 + 44) % 256}.${(s * 13 + 228) % 256}.${(s * 3 + 1) % 254 + 1}`;
    identities.push({
      name: ip, email: undefined,
      type: "external", identityType: "unknown-identity",
      domain: "unknown", isPersonalDomain: false,
      accessLevel: "Viewer",
      hasSensitiveAccess: false,
      lastActive: `Feb ${20 - i}, 2026`,
    });
  }

  // Connected apps (integrations)
  const thirdPartyEntries: [string, string][] = [
    ["Slack Integration", "slack-app@integrations.slack.com"],
    ["Salesforce Connector", "sf-connector@integrations.salesforce.com"],
    ["Zapier Automation", "zapier@integrations.zapier.com"],
  ];
  const tpaCount = [1, 2, 0, 1, 2, 1, 0][(seed + 3) % 7];
  for (let i = 0; i < Math.min(tpaCount, thirdPartyEntries.length); i++) {
    const [name, email] = thirdPartyEntries[i];
    identities.push({
      name, email, type: "group", identityType: "connected-app",
      domain: email.split("@")[1],
      isPersonalDomain: false, accessLevel: "Viewer",
      hasSensitiveAccess: i === 0,
      lastActive: `Feb ${25 - i}, 2026`,
    });
  }

  return identities;
}

// ── Activity chart helpers (used by Overview tab Activity card) ───────────────

// ── Activity chart helpers (used by Overview tab Activity card) ───────────────

// Today = March 11 2026 → index 29; index 0 = Feb 10 2026
function saasGetChartDate(index: number): Date {
  const base = new Date(2026, 1, 10);
  const d = new Date(base);
  d.setDate(base.getDate() + index);
  return d;
}

function saasFormatChartDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function saasFormatChartValue(value: number, isBytes: boolean): string {
  if (!isBytes) return value.toLocaleString();
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

type SaaSActivityMetric = "totalBytes" | "bytesUploaded" | "bytesDownloaded";

function SaaSVolumeTrendChart({ uploadData, downloadData }: { uploadData: number[]; downloadData: number[] }) {
  const [selectedMetric, setSelectedMetric] = useState<SaaSActivityMetric>("totalBytes");

  const metrics: Record<SaaSActivityMetric, { label: string; data: number[] }> = {
    totalBytes:      { label: "Total Bytes",      data: uploadData.map((up, i) => up + downloadData[i]) },
    bytesUploaded:   { label: "Bytes Uploaded",   data: uploadData },
    bytesDownloaded: { label: "Bytes Downloaded", data: downloadData },
  };

  const selectedData = metrics[selectedMetric];
  const isBytes = true;

  const chartData = useMemo(
    () => selectedData.data.map((value, i) => ({ i, dateStr: saasFormatChartDate(saasGetChartDate(i)), value })),
    [selectedData.data],
  );

  const xTicks = [0, 7, 14, 21, 29];

  return (
    <div className="pt-2 space-y-2">
      {/* Divider */}
      <div className="h-px bg-border -mx-3" />

      {/* Dropdown row */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
          Sensitive Volume Trend
        </div>
        <div className="relative">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as SaaSActivityMetric)}
            className="appearance-none bg-surface-overlay rounded-md px-3 py-1.5 pr-8 text-text-bright cursor-pointer hover:bg-surface-raised transition-colors"
            style={{ fontSize: "11px" }}
          >
            <option value="totalBytes">Total Bytes</option>
            <option value="bytesUploaded">Bytes Uploaded</option>
            <option value="bytesDownloaded">Bytes Downloaded</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface-overlay rounded-lg px-3 py-3">
        <ResponsiveContainer width="100%" height={112}>
          <AreaChart data={chartData.slice(-7)} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="i"
              interval={0}
              ticks={chartData.slice(-7).map((d) => d.i)}
              tickFormatter={(i) => saasFormatChartDate(saasGetChartDate(i))}
              tick={{ fill: "#64748b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: "rgba(148,163,184,0.2)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div style={{ background: "var(--surface-raised, #1e293b)", border: "1px solid var(--border, #334155)", borderRadius: 4, padding: "4px 8px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                    <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1 }}>{item.dateStr}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-bright, #f1f5f9)" }}>{saasFormatChartValue(item.value, isBytes)}</div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={1.5} fill="rgba(96,165,250,0.12)" dot={false} activeDot={{ r: 3, fill: "#60a5fa", stroke: "#0f172a", strokeWidth: 1.5 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTabContent({ row, onTabChange, onExposureClick, onAccessCategoryClick, onAccessIdentityTypeClick, onNavigateToSensitiveAccess, onSensitiveFilesClick, onDataTypeClick }: {
  row: SaaSUnstructuredDataRow;
  onTabChange?: (tab: PanelTab) => void;
  onExposureClick?: (type: ExposureType) => void;
  onAccessCategoryClick?: (cat: AccessCategory) => void;
  onAccessIdentityTypeClick?: (types: IdentityType[]) => void;
  onNavigateToSensitiveAccess?: () => void;
  onSensitiveFilesClick?: () => void;
  onDataTypeClick?: (typeName: string) => void;
}) {
  const meta = getMetadata(row.id);
  const identities = useMemo(() => generateAccessIdentities(row), [row]);
  const totalIdentities = identities.length;
  const sensitiveAccessCount = useMemo(() => identities.filter((id) => id.hasSensitiveAccess).length, [identities]);
  const staleCount = useMemo(() => identities.filter((id) => id.identityType === "unknown-identity").length, [identities]);
  const scanType = getScanType(meta);
  const uploadTotal = sumSparkData(row.uploadSparkData);
  const downloadTotal = sumSparkData(row.downloadSparkData);

  // Data type breakdown (for tooltip list only, not bar rendering)
  const breakdown = useMemo(() => computeDataTypeBreakdown(row), [row]);

  // Sensitive vs clean proportions across sampled files
  const sampledBase = Math.max(row.sampledFiles, row.sensitiveFiles, 1);
  const sensitivePct = Math.min(100, (row.sensitiveFiles / sampledBase) * 100);
  const cleanPct = 100 - sensitivePct;

  // Tooltip hover state (files bar)
  const [sensitiveBarHovered, setSensitiveBarHovered] = useState(false);
  // Tooltip hover state (access bar)
  const [hoveredAccessSegment, setHoveredAccessSegment] = useState<number | null>(null);

  // Identity composition — split into normal vs risky rows
  const RISKY_TYPES = new Set<IdentityType>(["unmapped-local-user", "unknown-identity"]);
  const { normalIdentities, riskyIdentities } = useMemo(() => {
    const counts: Partial<Record<IdentityType, number>> = {};
    for (const id of identities) {
      counts[id.identityType] = (counts[id.identityType] ?? 0) + 1;
    }
    const all = (Object.entries(counts) as [IdentityType, number][]).sort((a, b) => b[1] - a[1]);
    return {
      normalIdentities: all.filter(([t]) => !RISKY_TYPES.has(t)),
      riskyIdentities:  all.filter(([t]) =>  RISKY_TYPES.has(t)),
    };
  }, [identities]);

  // Not-sensitive file count (scanned but not sensitive)
  const cleanFiles = Math.max(0, row.sampledFiles - row.sensitiveFiles);

  return (
    <div className="px-5 py-4 space-y-3">

      {/* ── Basic Info (compact 2-col) ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
        <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Basic Information</div>
        <div className="flex">
          {/* Left column */}
          <div className="flex-1 flex flex-col pr-4">
            <InfoRow label="App Instance" value={row.appInstance} />
            <InfoRow label="Organization" value={meta.organization} />
            <InfoRow label="Account" value={meta.account} mono />
            <InfoRow label="Created" value={new Date(meta.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
          </div>
          {/* Vertical divider */}
          <div className="w-px bg-border self-stretch shrink-0" />
          {/* Right column */}
          <div className="flex-1 flex flex-col pl-4">
            <InfoRow label="Drive Type" value={meta.driveType} />
            <InfoRow label="Owner" value={meta.owner} />
            <InfoRow label="Last Discovery Scan" value={(() => {
              const h = (row.appInstance.charCodeAt(0) + row.appInstance.length) % 24;
              const m = ((row.appInstance.charCodeAt(1) ?? 0) + row.appInstance.length * 3) % 60;
              const d = ["Apr 8, 2026", "Apr 9, 2026", "Apr 9, 2026", "Apr 10, 2026"][h % 4];
              const hh = h % 12 === 0 ? 12 : h % 12;
              const mm = String(m).padStart(2, "0");
              const ampm = h < 12 ? "AM" : "PM";
              return `${d}, ${hh}:${mm} ${ampm}`;
            })()} />
          </div>
        </div>
      </div>

      {/* ── Files ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

        {/* Card header */}
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-border/30">
          <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Files</span>
          <button
            type="button"
            onClick={() => onSensitiveFilesClick?.()}
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
            onClick={() => onSensitiveFilesClick?.()}
            className="shrink-0 pr-4 flex flex-col justify-center hover:bg-blue-500/10 transition-colors text-left rounded-lg px-2 -mx-2"
            style={{ minWidth: 90 }}
          >
            <span className="text-text-bright tabular-nums" style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1, fontFamily: "Inter, sans-serif" }}>
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
                onClick={() => onSensitiveFilesClick?.()}
                className="hover:bg-blue-500/10 transition-colors text-left rounded px-1.5 -mx-1.5 py-0.5 -my-0.5"
              >
                <span className="text-text-bright tabular-nums" style={{ fontSize: "16px", fontWeight: 700 }}>
                  {formatNumber(row.sampledFiles)}
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
                    onClick={(e) => { e.stopPropagation(); onSensitiveFilesClick?.(); }}
                  />
                )}
                {/* Not-sensitive portion — navigates to all sensitive files */}
                {cleanPct > 0 && (
                  <div
                    className="shrink-0 transition-all duration-100 cursor-pointer"
                    style={{
                      width: `${cleanPct}%`,
                      background: "rgba(148,163,184,0.15)",
                      opacity: sensitiveBarHovered ? 0.4 : 1,
                    }}
                    onClick={() => onSensitiveFilesClick?.()}
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

      {/* ── Access ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

        {/* Card header */}
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-border/30">
          <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Identities with Access</span>
          <button
            type="button"
            onClick={() => onTabChange?.("access")}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
            style={{ fontSize: "11px", fontWeight: 500 }}
          >
            <span>View identities</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Card body: [sensitive access KPI] | [total identities + bar] */}
        <div className="flex items-stretch px-3.5 py-3 gap-0">

          {/* Left: sensitive access KPI */}
          <div className="shrink-0 flex items-stretch -mx-2">
            <button
              type="button"
              onClick={() => onNavigateToSensitiveAccess?.()}
              className="flex flex-col justify-start hover:bg-amber-500/10 transition-colors text-left rounded-lg px-2 py-1 -my-1 pr-4"
              style={{ minWidth: 90 }}
            >
              <span className="text-text-bright tabular-nums" style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1 }}>{formatNumber(sensitiveAccessCount)}</span>
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
              onClick={() => onTabChange?.("access")}
              className="hover:bg-blue-500/10 transition-colors text-left rounded px-1.5 -mx-1.5 py-0.5 -my-0.5 self-start"
            >
              <span className="text-text-bright tabular-nums" style={{ fontSize: "16px", fontWeight: 700 }}>
                {formatNumber(totalIdentities)}
              </span>
              <span className="text-muted-foreground ml-1" style={{ fontSize: "11px" }}>
                total identities
              </span>
            </button>

            {/* Bar + foot labels + tooltip */}
            {(() => {
              const IDENTITY_LABELS_LOCAL: Partial<Record<IdentityType, string>> = {
                "unknown-identity":    "Unauthenticated",
                "unmapped-local-user": "Unmapped",
                "external-user":       "External User",
                "internal-user":       "Internal User",
              };

              // Per-type counts for identities WITH sensitive access (4 types only)
              const sensitiveByType: Partial<Record<IdentityType, number>> = {};
              for (const id of identities) {
                if (id.hasSensitiveAccess) {
                  sensitiveByType[id.identityType] = (sensitiveByType[id.identityType] ?? 0) + 1;
                }
              }
              const TYPE_ORDER: IdentityType[] = ["unknown-identity", "unmapped-local-user", "external-user", "internal-user"];
              const breakdown = TYPE_ORDER
                .filter(t => (sensitiveByType[t] ?? 0) > 0)
                .map(t => ({ type: t, count: sensitiveByType[t]!, label: IDENTITY_LABELS_LOCAL[t] ?? t }));

              const noSensitiveCount = Math.max(0, totalIdentities - sensitiveAccessCount);
              const noSensitivePct = totalIdentities > 0 ? (noSensitiveCount / totalIdentities) * 100 : 0;
              const sensitivePct = 100 - noSensitivePct;
              const isHovered = hoveredAccessSegment === 0;

              return (
                <div className="relative" onMouseLeave={() => setHoveredAccessSegment(null)}>
                  {/* Single red segment for all sensitive-access identities + muted green for no-sensitive */}
                  <div className="flex w-full rounded-full overflow-hidden" style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}>
                    {sensitivePct > 0 && (
                      <div
                        className="shrink-0 cursor-pointer transition-all duration-100"
                        style={{ width: `${sensitivePct}%`, background: "#60a5fa", opacity: isHovered ? 1 : 0.82, minWidth: 2 }}
                        onMouseEnter={() => setHoveredAccessSegment(0)}
                        onClick={() => onNavigateToSensitiveAccess?.()}
                      />
                    )}
                    {noSensitivePct > 0 && (
                      <div
                        className="shrink-0 transition-all duration-100"
                        style={{ width: `${noSensitivePct}%`, background: "rgba(148,163,184,0.15)", opacity: isHovered ? 0.4 : 1 }}
                      />
                    )}
                  </div>

                  {/* Bar foot labels */}
                  <div className="flex items-center justify-between mt-1" style={{ fontSize: "10px" }}>
                    <span style={{ color: "#60a5fa" }}>{formatNumber(sensitiveAccessCount)} with sensitive access</span>
                    <span style={{ color: "#94a3b8" }}>{formatNumber(noSensitiveCount)} no sensitive access</span>
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
                          <span style={{ fontSize: "10px", color: "#64748b" }}>{formatNumber(sensitiveAccessCount)} total</span>
                        </div>
                        <div className="px-2.5 py-1.5 space-y-1">
                          {(() => {
                            const IDENT_HEX: Record<string, string> = {
                              "internal-user": "#60a5fa", "external-user": "#fb923c",
                              "unknown-identity": "#f87171", "unmapped-local-user": "#c084fc",
                              "service-account": "#34d399", "connected-app": "#f472b6",
                            };
                            return breakdown.map(({ type, count, label }) => (
                              <div key={type} className="flex items-center gap-2">
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: IDENT_HEX[type] ?? "#94a3b8", flexShrink: 0, display: "inline-block" }} />
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

      {/* ── Activity (30d) full width ───────────────────────────────────── */}
      {(() => {
        const seed = row.id.charCodeAt(0) + (row.id.charCodeAt(row.id.length - 1) || 0);
        const uploadEvents  = 100 + (seed * 13 + 37) % 1800;
        const downloadEvents = 80 + (seed * 17 + 19) % 1400;
        return (
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Sensitive Transferred Data</div>
              <span className="relative group/infotip flex-shrink-0" style={{ lineHeight: 1 }}>
                <Info size={12} className="text-muted-foreground/50 cursor-default" />
                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover/infotip:block px-2 py-1 rounded shadow-lg z-50 pointer-events-none whitespace-nowrap" style={{ fontSize: "10px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}>
                  Only sensitive volume counted
                  <div className="absolute top-full right-2 w-0 h-0" style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #1e293b" }} />
                </div>
              </span>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 flex items-center justify-between gap-2">
                <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Total Bytes</div>
                <div className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
                  {formatBytes(uploadTotal + downloadTotal)}
                </div>
              </div>

              <div className="w-px bg-border/50" />

              <div className="flex-1 flex items-center justify-between gap-2">
                <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Uploaded</div>
                <span className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
                  {uploadEvents.toLocaleString()} events
                </span>
              </div>

              <div className="w-px bg-border/50" />

              <div className="flex-1 flex items-center justify-between gap-2">
                <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Downloaded</div>
                <span className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
                  {downloadEvents.toLocaleString()} events
                </span>
              </div>
            </div>

            <SaaSVolumeTrendChart uploadData={row.uploadSparkData} downloadData={row.downloadSparkData} />
          </div>
        );
      })()}

    </div>
  );
}

// ── Access & Sharing Tab Content ─────────────────────────────────────────────

function AccessSharingTabContent({ row, accessFilter, onAccessFilterChange, sensitiveOnly, onClearSensitiveOnly, onSelectIdentity }: { row: SaaSUnstructuredDataRow; accessFilter?: IdentityType[]; onAccessFilterChange?: (filter: IdentityType[]) => void; sensitiveOnly?: boolean; onClearSensitiveOnly?: () => void; onSelectIdentity?: (identity: AccessIdentity) => void }) {
  const meta = getMetadata(row.id);
  const identities = useMemo(() => generateAccessIdentities(row), [row]);
  const staleCount = useMemo(() => identities.filter((id) => id.identityType === "unknown-identity").length, [identities]);
  const [accessSearch, setAccessSearch] = useState("");

  const activeFilters = accessFilter ?? [];
  const hasActiveFilter = activeFilters.length > 0;

  /* Dropdown state — same pattern as Sensitive Files tab */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Status filter state */
  const [statusFilter, setStatusFilter] = useState<"active" | "stale" | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [hoveredIdentitySegment, setHoveredIdentitySegment] = useState<{ typeId: string; clientX: number; clientY: number } | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  /* Data Type filter state */
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);
  const [dataTypeDropdownOpen, setDataTypeDropdownOpen] = useState(false);
  const dataTypeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropdownOpen]);

  useEffect(() => {
    if (!dataTypeDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dataTypeDropdownRef.current && !dataTypeDropdownRef.current.contains(e.target as Node)) {
        setDataTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dataTypeDropdownOpen]);


  const filteredIdentities = useMemo(() => {
    let result = identities;
    // Filter by sensitive access only
    if (sensitiveOnly) {
      result = result.filter((id) => id.hasSensitiveAccess);
    }
    // Filter by identity type (OR logic)
    if (activeFilters.length > 0) {
      result = result.filter((id) => activeFilters.includes(id.identityType));
    }
    // Filter by status
    if (statusFilter === "stale") {
      result = result.filter((id) => id.identityType === "unknown-identity");
    } else if (statusFilter === "active") {
      result = result.filter((id) => id.identityType !== "unknown-identity");
    }
    // Filter by data type — each identity is deterministically mapped to a subset of the store's data types
    if (dataTypeFilter.length > 0) {
      result = result.filter((id) => {
        const n = row.dataTypes.length;
        if (n === 0) return false;
        const seed2 = id.name.charCodeAt(0) + id.name.length;
        const h = seed2 % n;
        const count = Math.max(1, Math.min(n, [2, 3, 1, 4, 2, 3, 1, 2][h % 8]));
        const subset = Array.from({ length: count }, (_, i) => row.dataTypes[(h + i) % n]);
        return dataTypeFilter.some((dt) => subset.includes(dt));
      });
    }
    // Apply search
    if (accessSearch) {
      const term = accessSearch.toLowerCase();
      result = result.filter((id) =>
        id.name.toLowerCase().includes(term) ||
        (id.email ?? "").toLowerCase().includes(term) ||
        id.domain.toLowerCase().includes(term) ||
        id.accessLevel.toLowerCase().includes(term),
      );
    }
    return result;
  }, [identities, sensitiveOnly, activeFilters, statusFilter, dataTypeFilter, accessSearch, row.dataTypes]);

  /* Composition counts keyed by IdentityType */
  const composition = useMemo(() => {
    const counts: Record<IdentityType, number> = {
      "internal-user": 0, "external-user": 0, "unknown-identity": 0,
      "unmapped-local-user": 0, "service-account": 0, "connected-app": 0,
    };
    for (const id of identities) counts[id.identityType]++;
    return counts;
  }, [identities]);

  /* Active users (30d) – deterministic from seed */
  const activeUsers30d = useMemo(() => {
    const seed = row.id.charCodeAt(0) + row.id.charCodeAt(row.id.length - 1);
    const pct = [62, 78, 55, 84, 71, 90, 67][(seed) % 7];
    return Math.round(identities.length * pct / 100);
  }, [row, identities]);

  return (
    <>
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Summary section */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
          {/* Header row: total · stale | active */}
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "20px", fontWeight: 700 }}>{formatNumber(identities.length)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 400 }}>identities</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(activeUsers30d)}</span>
              <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 400 }}>active (7d)</span>
            </div>
          </div>

          {/* Segmented composition bar – IaaS style */}
          <div className="relative" onMouseLeave={() => setHoveredIdentitySegment(null)}>
            <div
              className="flex w-full rounded-full overflow-hidden"
              style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}
            >
              {(() => {
                return IDENTITY_TYPE_GROUPS.map((g) => {
                  const count = composition[g.typeId];
                  if (count === 0) return null;
                  const w = (count / identities.length) * 100;
                  const isHov = hoveredIdentitySegment?.typeId === g.typeId;
                  const isDim = hoveredIdentitySegment !== null && !isHov;
                  return (
                    <div
                      key={g.typeId}
                      className={`${IDENTITY_TYPE_COLORS[g.typeId]} shrink-0 transition-all duration-100 cursor-pointer`}
                      style={{ width: `${w}%`, opacity: isDim ? 0.2 : isHov ? 1 : 0.82 }}
                      onMouseEnter={(ev) => setHoveredIdentitySegment({ typeId: g.typeId, clientX: ev.clientX, clientY: ev.clientY })}
                      onMouseMove={(ev) => setHoveredIdentitySegment((prev) => prev ? { ...prev, clientX: ev.clientX, clientY: ev.clientY } : prev)}
                      onClick={() => onAccessFilterChange?.(
                        activeFilters.length === 1 && activeFilters[0] === g.typeId ? [] : [g.typeId as IdentityType]
                      )}
                    />
                  );
                });
              })()}
            </div>

            {/* Hover tooltip — follows cursor */}
            {hoveredIdentitySegment !== null && (() => {
              const g = IDENTITY_TYPE_GROUPS.find(grp => grp.typeId === hoveredIdentitySegment.typeId);
              if (!g) return null;
              const count = composition[g.typeId];
              const colorClass = IDENTITY_TYPE_COLORS[g.typeId];
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
                      <span className={`w-1.5 h-1.5 rounded-full ${colorClass} shrink-0`} />
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#f1f5f9" }}>{g.label}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{formatNumber(count)}</span> identities
                      </span>
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {Math.round((count / identities.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>,
                document.body
              );
            })()}
          </div>

          {/* Composition legend */}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {IDENTITY_TYPE_GROUPS.map((g) => {
              const count = composition[g.typeId];
              if (count === 0) return null;
              const LEGEND_LABEL_OVERRIDE: Partial<Record<IdentityType, string>> = {
                "unknown-identity":    "Unauthenticated",
                "unmapped-local-user": "Unmapped",
              };
              const PINK_LABEL_TYPES: IdentityType[] = ["service-account", "connected-app"];
              const isPink = PINK_LABEL_TYPES.includes(g.typeId);
              return (
                <span key={g.typeId} className="inline-flex items-center gap-1.5" style={{ fontSize: "10px" }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${IDENTITY_TYPE_COLORS[g.typeId]} shrink-0`} />
                  <span className={isPink ? "text-pink-400" : "text-muted-foreground"}>
                    {LEGEND_LABEL_OVERRIDE[g.typeId] ?? g.label}
                  </span>
                  <span className="text-text-bright tabular-nums" style={{ fontWeight: 500 }}>{formatNumber(count)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky search + filter bar */}
      <div className="sticky top-0 z-10 shrink-0 border-t border-border" style={{ background: "var(--color-background)" }}>
      <div className="px-4 py-3 space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={accessSearch}
            onChange={(e) => setAccessSearch(e.target.value)}
            placeholder="Search identities..."
            className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-text-bright placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={{ fontSize: "12px" }}
          />
          {accessSearch && (
            <button type="button" onClick={() => setAccessSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-bright">
              <X size={12} />
            </button>
          )}
        </div>
        {/* Filter pills — Identity Type + Status in one row */}
        <div ref={dropdownRef} className="relative">
          <div className="flex items-center gap-1.5 flex-wrap">
            {sensitiveOnly && (
              <div className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 overflow-hidden">
                <span
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-amber-400"
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  <span style={{ fontSize: "10px" }}>◈</span>
                  Has Sensitive Access
                </span>
                <button
                  type="button"
                  onClick={onClearSensitiveOnly}
                  className="pl-0.5 pr-2 py-[3px] text-amber-400/50 hover:text-amber-400 transition-colors"
                  aria-label="Clear sensitive access filter"
                >
                  <X size={9} />
                </button>
              </div>
            )}
            {hasActiveFilter ? (
              <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(true)}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                  Identity Type
                  <span className="text-primary/50 mx-0.5">|</span>
                  <span className="truncate max-w-[100px]">
                    {activeFilters.length === 1
                      ? IDENTITY_TYPE_GROUPS.find((g) => g.typeId === activeFilters[0])?.label ?? activeFilters[0]
                      : `${activeFilters.length} selected`}
                  </span>
                  <ChevronDown size={9} className="ml-0.5 opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={() => onAccessFilterChange?.([])}
                  className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                  aria-label="Clear identity type filter"
                >
                  <X size={9} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDropdownOpen(true)}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                  dropdownOpen
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "10px", fontWeight: 400 }}
              >
                <Plus size={9} />
                Identity Type
              </button>
            )}

            {/* Status pill — inline with Identity Type */}
            <div ref={statusDropdownRef} className="relative">
              {statusFilter ? (
                <div className={`inline-flex items-center rounded-full border overflow-hidden ${
                  statusFilter === "stale"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-emerald-500/40 bg-emerald-500/10"
                }`}>
                  <button
                    type="button"
                    onClick={() => setStatusDropdownOpen(true)}
                    className={`inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] hover:opacity-80 transition-opacity ${
                      statusFilter === "stale" ? "text-amber-400" : "text-emerald-400"
                    }`}
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    <span className="opacity-60" style={{ fontSize: "10px" }}>⊗</span>
                    Status
                    <span className="opacity-50 mx-0.5">|</span>
                    <span>{statusFilter === "stale" ? "Stale" : "Active"}</span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter(null)}
                    className={`pl-0.5 pr-2 py-[3px] opacity-50 hover:opacity-100 transition-opacity ${
                      statusFilter === "stale" ? "text-amber-400" : "text-emerald-400"
                    }`}
                    aria-label="Clear status filter"
                  >
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                    statusDropdownOpen
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}
                >
                  <Plus size={9} />
                  Status
                </button>
              )}

              {/* Status dropdown */}
              {statusDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-44 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                  <div className="px-4 pt-2 pb-2 border-b border-border">
                    <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Status</span>
                  </div>
                  <div className="py-1">
                    {(["active", "stale"] as const).map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter === s}
                          onChange={() => setStatusFilter((prev) => (prev === s ? null : s))}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                        />
                        <span className="flex items-center gap-1.5 flex-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s === "stale" ? "bg-amber-400" : "bg-emerald-400"}`} />
                          <span className="text-text-bright" style={{ fontSize: "12px" }}>{s === "stale" ? "Stale" : "Active"}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Data Type pill ── */}
            <div ref={dataTypeDropdownRef} className="relative">
              {dataTypeFilter.length > 0 ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDataTypeDropdownOpen(true)}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Data Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[90px]">
                      {dataTypeFilter.length === 1 ? dataTypeFilter[0] : `${dataTypeFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataTypeFilter([])}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors cursor-pointer"
                    aria-label="Clear data type filter"
                  >
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDataTypeDropdownOpen(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors cursor-pointer ${
                    dataTypeDropdownOpen
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}
                >
                  <Plus size={9} />
                  Data Type
                </button>
              )}

              {/* Data Type dropdown */}
              {dataTypeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-60 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                  <div className="px-4 pt-2 pb-2 border-b border-border">
                    <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {row.dataTypes.map((dt) => (
                      <label
                        key={dt}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={dataTypeFilter.includes(dt)}
                          onChange={() =>
                            setDataTypeFilter((prev) =>
                              prev.includes(dt) ? prev.filter((d) => d !== dt) : [...prev, dt]
                            )
                          }
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                        />
                        <span className="text-text-bright flex-1 truncate" style={{ fontSize: "12px" }}>{dt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Identity Type dropdown */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Identity Type</span>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {IDENTITY_TYPE_GROUPS.map((g) => {
                  const count = composition[g.typeId];
                  if (count === 0) return null;
                  return (
                    <label
                      key={g.typeId}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.includes(g.typeId)}
                        onChange={() => {
                          const next = activeFilters.includes(g.typeId)
                            ? activeFilters.filter((t) => t !== g.typeId)
                            : [...activeFilters, g.typeId];
                          onAccessFilterChange?.(next);
                        }}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${IDENTITY_TYPE_COLORS[g.typeId]}`} />
                        <span className="text-text-bright truncate" style={{ fontSize: "12px" }}>{g.label}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums shrink-0" style={{ fontSize: "10px" }}>{formatNumber(count)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
        <div className="flex items-center px-4 py-1.5 border-b border-border">
          <Users size={12} className="text-muted-foreground mr-2" />
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
            {filteredIdentities.length}{accessSearch || hasActiveFilter || statusFilter || dataTypeFilter.length > 0 ? ` of ${formatNumber(identities.length)}` : ""} {filteredIdentities.length === 1 ? "identity" : "identities"}
          </span>
        </div>
      </div>

      {/* Identity list */}
      <div className="px-2 py-1">
        {filteredIdentities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" style={{ fontSize: "12px" }}>
            <Users size={24} className="mb-2 opacity-40" />
            No matching identities
          </div>
        ) : (
          filteredIdentities.map((id) => {
            const cfg = SAAS_IDENTITY_TYPE_CONFIG[id.identityType] ?? SAAS_IDENTITY_TYPE_CONFIG["internal-user"];

            // Avatar initials — first letter of up to 2 words
            const initials = id.name
              .split(/[\s\-_]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join("");

            // Derive Data Category labels from this identity's slice of the store's data types
            const n = row.dataTypes.length;
            const cats: string[] = [];
            if (n > 0) {
              const h = (id.name.charCodeAt(0) + id.name.length) % n;
              const count = Math.max(1, Math.min(n, [2, 3, 1, 4, 2, 3, 1, 2][h % 8]));
              const subset = Array.from({ length: count }, (_, i) => row.dataTypes[(h + i) % n]);
              const uniqueCats = [...new Set(subset.map((dt) => DT_TYPE_TO_CAT[dt] ?? "PII"))];
              cats.push(...uniqueCats);
            }

            return (
              <button
                key={id.email ?? id.name}
                type="button"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40 group cursor-pointer"
                onClick={() => onSelectIdentity?.(id)}
              >
                {/* Colored avatar with initials */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none ${cfg.avatar}`}
                  style={{ background: "var(--color-nav-active, #1e293b)", fontSize: "11px", fontWeight: 700 }}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Line 1: name + identity type label */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{id.name}</span>
                    <span className={`shrink-0 px-1 py-0 rounded ${cfg.badge}`} style={{ fontSize: "9px", fontWeight: 500 }}>{cfg.label}</span>
                  </div>
                  {/* Line 2: email · last access */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {id.email && id.email !== "undefined" && !id.email.includes("@unknown") && (
                      <>
                        <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{id.email}</span>
                        <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>·</span>
                      </>
                    )}
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>
                      <span className="text-muted-foreground/60" style={{ fontSize: "10px" }}>Last Active:</span>
                      {" "}{(() => { const d = new Date(id.lastActive); return isNaN(d.getTime()) ? id.lastActive : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()}
                    </span>
                  </div>
                  {/* Line 3: data types */}
                  {cats.length > 0 && (() => {
                    const _n = row.dataTypes.length;
                    const _h = (id.name.charCodeAt(0) + id.name.length) % _n;
                    const _count = Math.max(1, Math.min(_n, [2, 3, 1, 4, 2, 3, 1, 2][_h % 8]));
                    const dataTypeNames = [...new Set(Array.from({ length: _count }, (_, i) => row.dataTypes[(_h + i) % _n]))];
                    return (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>{dataTypeNames.join(", ")}</span>
                      </div>
                    );
                  })()}
                </div>

              </button>
            );
          })
        )}
      </div>
    </div>

</>
  );
}

// ── Data Types Tab Content ───────────────────────────────────────────────────

// (DATA_TYPE_INFO, getDataTypeInfo → panel-shared.tsx)

/** Deterministically compute per-data-type file counts from the placeholder generation logic */
function computeDataTypeBreakdown(row: SaaSUnstructuredDataRow) {
  const counts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};
  for (const dt of row.dataTypes) {
    counts[dt] = 0;
    entityCounts[dt] = 0;
  }

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
    name: dt,
    fileCount: counts[dt] ?? 0,
    entityCount: entityCounts[dt] ?? 0,
    ...getDataTypeInfo(dt),
  })).sort((a, b) => b.fileCount - a.fileCount);
}

function DataTypesTabContent({ row }: { row: SaaSUnstructuredDataRow }) {
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

      {/* ── Severity Breakdown ─────────────────────────────────────────── */}
      <div>
        <SectionHeading>By Severity</SectionHeading>
        <div className="flex gap-1.5">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            return (
              <div key={sev} className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${cfg.bg} border ${cfg.border}`}>
                <span className={`${cfg.text}`} style={{ fontSize: "15px", fontWeight: 600 }}>{severitySummary[sev]}</span>
                <span className={`${cfg.text}`} style={{ fontSize: "10px" }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Data Type Breakdown ────────────────────────────────────────── */}
      <div>
        <SectionHeading>Data Types ({breakdown.length})</SectionHeading>
        <div className="space-y-1.5">
          {breakdown.map((dt) => {
            const cfg = SEVERITY_CONFIG[dt.severity];
            const pct = Math.round((dt.fileCount / maxFileCount) * 100);
            const isExpanded = expandedType === dt.name;
            return (
              <button
                key={dt.name}
                type="button"
                className={`w-full text-left bg-surface-raised border rounded-lg transition-colors ${isExpanded ? `${cfg.border} ring-1 ring-inset ${cfg.border}` : "border-border hover:border-border"}`}
                onClick={() => setExpandedType(isExpanded ? null : dt.name)}
              >
                <div className="px-3.5 py-2.5">
                  {/* Top row: name + severity + file count */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-text-bright flex-1 min-w-0 truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{dt.name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`} style={{ fontSize: "10px", fontWeight: 500 }}>{cfg.label}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{dt.category}</span>
                  </div>

                  {/* Bar */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 rounded-full overflow-hidden bg-background" style={{ height: "calc(var(--spacing) * 1.5)" }}>
                      <div className={`h-full ${cfg.bar} rounded-full transition-all`} style={{ width: `${pct}%`, opacity: 0.7 }} />
                    </div>
                    <span className="shrink-0 text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(dt.fileCount)}</span>
                    <span className="shrink-0 text-muted-foreground" style={{ fontSize: "10px" }}>files</span>
                  </div>

                  {/* Entity count row */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{formatNumber(dt.entityCount)} entities detected</span>
                    <span className="text-muted-foreground opacity-40">&middot;</span>
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{Math.round((dt.fileCount / row.sensitiveFiles) * 100)}% of sensitive files</span>
                  </div>

                  {/* Expanded detail */}
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

// ── File Preview Pane (inline right panel) ────────────────────────────────────

const EXPOSURE_DOT_COLORS: Record<ExposureType, string> = {
  "externally-exposed": "bg-red-400",
  "over-exposed": "bg-yellow-400",
  "anonymously-accessible": "bg-orange-400",
  "internally-shared": "bg-primary",
  "private": "bg-emerald-400",
};

const ACTIVITY_ACTION_COLORS: Record<string, string> = {
  Scanned: "text-muted-foreground",
  Viewed: "text-muted-foreground",
  Downloaded: "text-primary",
  Modified: "text-primary",
  Shared: "text-primary",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FilePreviewPane({
  file,
  row,
  onClose,
  onViewFullDetails,
}: {
  file: { name: string; entityTypes: string[]; modified: string; exposure: ExposureType };
  row: SaaSUnstructuredDataRow;
  onClose: () => void;
  onViewFullDetails: () => void;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
  const recentActivity = useMemo(() => generateFileAccessHistory(file.name).slice(0, 3), [file.name]);

  // Extension badge color
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
            <div className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 600 }}>{file.name}</div>
            <div className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "11px" }}>
              {row.name} · {row.appInstance}
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
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Last Modified</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{file.modified}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Exposure</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${EXPOSURE_DOT_COLORS[file.exposure]}`} />
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 500 }}>{EXPOSURE_LABELS[file.exposure]}</span>
              </span>
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

// ── Sensitive Files Tab Content ───────────────────────────────────────────────

function SensitiveFilesTabContent({
  row,
  exposureFilter = [],
  onExposureFilterChange,
  dataTypeFilter = [],
  onDataTypeFilterChange,
  onViewFullDetails,
}: {
  row: SaaSUnstructuredDataRow;
  exposureFilter?: ExposureType[];
  onExposureFilterChange?: (filter: ExposureType[]) => void;
  dataTypeFilter?: string[];
  onDataTypeFilterChange?: (filter: string[]) => void;
  onViewFullDetails?: (fileIdx: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [hideNonRisky, setHideNonRisky] = useState(true);
  const [hoveredBarDt, setHoveredBarDt] = useState<{ dtName: string; exposureKey: string; clientX: number; clientY: number } | null>(null);
  const files = useMemo(
    () => generatePlaceholderFiles(row.sensitiveFiles, row.dataTypes, row.id),
    [row.sensitiveFiles, row.dataTypes, row.id],
  );

  // Per-data-type file counts from actual placeholder files
  const dataTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dt of row.dataTypes) counts[dt] = 0;
    for (const f of files) {
      for (const et of f.entityTypes) {
        if (counts[et] !== undefined) counts[et]++;
      }
    }
    return counts;
  }, [files, row.dataTypes]);

  // Full data-type breakdown (sorted by file count desc) for the summary card
  const breakdown = useMemo(() => computeDataTypeBreakdown(row), [row]);

  // Severity summary derived from breakdown
  const severitySummary = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    breakdown.forEach((b) => { counts[b.severity]++; });
    return counts;
  }, [breakdown]);

  // Count files per exposure category (from full file set)
  const exposureCounts = useMemo(() => {
    const counts: Record<ExposureType, number> = {
      "externally-exposed": 0, "over-exposed": 0, "anonymously-accessible": 0,
      "internally-shared": 0, "private": 0,
    };
    for (const f of files) counts[f.exposure]++;
    return counts;
  }, [files]);

  const hasActiveExposureFilter = exposureFilter.length > 0;
  const hasActiveDataTypeFilter = dataTypeFilter.length > 0;
  const hasActiveFilter = hasActiveExposureFilter || hasActiveDataTypeFilter;

  const filteredFiles = useMemo(() => {
    let result = files.map((f, i) => ({ ...f, originalIdx: i }));
    if (hasActiveExposureFilter) {
      result = result.filter((f) => exposureFilter.includes(f.exposure));
    }
    if (hasActiveDataTypeFilter) {
      result = result.filter((f) =>
        dataTypeFilter.some((dt) => f.entityTypes.some((et) => et.toLowerCase() === dt.toLowerCase()))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.entityTypes.some((et) => et.toLowerCase().includes(q)));
    }
    return result;
  }, [files, search, exposureFilter, dataTypeFilter, hasActiveExposureFilter, hasActiveDataTypeFilter]);

  // Dropdown open state: which picker is open
  const [openDropdown, setOpenDropdown] = useState<"exposure" | "data-type" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lazy loading
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setVisibleCount(50); }, [search, exposureFilter, dataTypeFilter, hideNonRisky]);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((c) => c + 50);
    }, { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const openExposurePicker = useCallback(() => {
    setOpenDropdown((prev) => prev === "exposure" ? null : "exposure");
  }, []);

  const openDataTypePicker = useCallback(() => {
    setOpenDropdown((prev) => prev === "data-type" ? null : "data-type");
  }, []);

  const toggleExposure = useCallback((type: ExposureType) => {
    const next = exposureFilter.includes(type) ? exposureFilter.filter((t) => t !== type) : [...exposureFilter, type];
    onExposureFilterChange?.(next);
  }, [exposureFilter, onExposureFilterChange]);

  const toggleDataType = useCallback((dt: string) => {
    const next = dataTypeFilter.includes(dt) ? dataTypeFilter.filter((t) => t !== dt) : [...dataTypeFilter, dt];
    onDataTypeFilterChange?.(next);
  }, [dataTypeFilter, onDataTypeFilterChange]);

  // Human-readable label for empty state
  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (hasActiveDataTypeFilter) parts.push(...dataTypeFilter);
    if (hasActiveExposureFilter) parts.push(...exposureFilter.map((t) => EXPOSURE_LABELS[t].toLowerCase()));
    return parts.join(", ");
  }, [exposureFilter, dataTypeFilter, hasActiveExposureFilter, hasActiveDataTypeFilter]);

  const totalSeverityTypes = severitySummary.critical + severitySummary.high + severitySummary.medium + severitySummary.low;

  return (
    <div className="flex h-full">
      <div className="flex flex-col h-full overflow-y-auto w-full">

        {/* ── Summary card — scrolls away naturally ────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-2.5">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
            {/* ── Header ── */}
            <div className="flex items-baseline justify-between mb-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "20px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{formatNumber(row.sensitiveFiles)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>sensitive files</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "11px", fontWeight: 500 }}>{formatNumber(row.sampledFiles)}</span>
                <span className="text-muted-foreground" style={{ fontSize: "10px" }}>of {formatNumber(row.totalFiles)} scanned</span>
              </div>
            </div>

            {/* ── Exposure × Category cross matrix ── */}
            {(() => {
              const ALL_CATS = ["PII", "SPII", "PSI", "PCI", "PFI", "PHI", "PAI", "BII"] as const;
              type Cat = typeof ALL_CATS[number];

              const EXPOSURE_ROWS: { key: ExposureType; label: string }[] = ([
                { key: "externally-exposed",     label: "External Exposed" },
                { key: "over-exposed",           label: "Org-wide Exposed" },
                { key: "anonymously-accessible", label: "Anonymous" },
                { key: "internally-shared",      label: "Internal" },
                { key: "private",                label: "Private" },
              ] as { key: ExposureType; label: string }[]).filter((e) =>
                hideNonRisky ? !["internally-shared", "private"].includes(e.key) : true
              );

              // Build cross-matrix: exposure → { cat → { dtName → fileCount } }
              const matrix: Record<string, Record<Cat, Record<string, number>>> = {};
              for (const e of EXPOSURE_ROWS) {
                matrix[e.key] = {} as Record<Cat, Record<string, number>>;
                for (const cat of ALL_CATS) matrix[e.key][cat] = {};
              }
              for (const f of files) {
                const rowMap = matrix[f.exposure];
                if (!rowMap) continue;
                for (const et of f.entityTypes) {
                  const cat = (DT_TYPE_TO_CAT[et] ?? "PII") as Cat;
                  if (!rowMap[cat]) rowMap[cat] = {};
                  rowMap[cat][et] = (rowMap[cat][et] ?? 0) + 1;
                }
              }

              // Which cats are present across all shown exposure rows?
              const presentCats = ALL_CATS.filter((cat) =>
                EXPOSURE_ROWS.some((e) => Object.keys(matrix[e.key]?.[cat] ?? {}).length > 0)
              );

              const LABEL_W = 110;
              const COUNT_W = 30;

              return (
                <>
                  {/* Column headers */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="shrink-0 text-muted-foreground" style={{ width: LABEL_W, fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>File Exposure</div>
                    <div className="shrink-0 text-muted-foreground" style={{ width: COUNT_W, fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Files</div>
                    <div className="flex-1 text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Data Types Distribution</div>
                    <div
                      className="shrink-0 flex items-center rounded-full border border-border overflow-hidden"
                      style={{ background: "var(--color-surface)", gap: 0 }}
                    >
                      <button
                        type="button"
                        onClick={() => setHideNonRisky(true)}
                        className="flex items-center px-2 py-0.5 transition-colors"
                        style={{
                          fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em",
                          background: hideNonRisky ? "var(--color-primary)" : "transparent",
                          color: hideNonRisky ? "#fff" : "var(--color-muted-foreground)",
                          borderRadius: "9910px 0 0 9910px",
                        }}
                      >Risky</button>
                      <div className="w-px self-stretch bg-border" />
                      <button
                        type="button"
                        onClick={() => setHideNonRisky(false)}
                        className="flex items-center px-2 py-0.5 transition-colors"
                        style={{
                          fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em",
                          background: !hideNonRisky ? "var(--color-primary)" : "transparent",
                          color: !hideNonRisky ? "#fff" : "var(--color-muted-foreground)",
                          borderRadius: "0 9910px 9910px 0",
                        }}
                      >All</button>
                    </div>
                  </div>

                  {/* Exposure rows */}
                  <div className="space-y-1.5 mb-2.5">
                    {EXPOSURE_ROWS.map((e) => {
                      const total = exposureCounts[e.key] ?? 0;
                      const catMap = matrix[e.key] ?? {};
                      const isExposureActive = exposureFilter.includes(e.key);
                      const isExposureDim = exposureFilter.length > 0 && !isExposureActive;
                      return (
                        <div key={e.key} className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`shrink-0 truncate text-left transition-colors cursor-pointer ${isExposureActive ? "text-text-bright" : isExposureDim ? "text-muted-foreground/40" : "text-muted-foreground hover:text-text-bright"}`}
                            style={{ width: LABEL_W, fontSize: "10px" }}
                            onClick={() => onExposureFilterChange?.(
                              exposureFilter.length === 1 && exposureFilter[0] === e.key ? [] : [e.key]
                            )}
                          >{e.label}</button>
                          <div
                            className="shrink-0 tabular-nums text-text-bright"
                            style={{ width: COUNT_W, fontSize: "10px", fontWeight: 500, opacity: isExposureDim ? 0.3 : 1 }}
                          >{total}</div>
                          {/* Proportional category segments — width = file count for that category */}
                          {(() => {
                            const catCounts = presentCats.map((cat) => ({
                              cat,
                              count: Object.values(catMap[cat] ?? {}).reduce((s, n) => s + n, 0),
                            }));
                            const rowTotal = catCounts.reduce((s, c) => s + c.count, 0) || 1;
                            return (
                              <div
                                className="flex-1 flex rounded-full overflow-hidden gap-px"
                                style={{ height: 6, opacity: isExposureDim ? 0.25 : 1, transition: "opacity 100ms" }}
                                onMouseLeave={() => setHoveredBarDt(null)}
                                onMouseMove={(ev) => {
                                  setHoveredBarDt((prev) => prev ? { ...prev, clientX: ev.clientX, clientY: ev.clientY } : prev);
                                }}
                              >
                                {catCounts.filter(({ count }) => count > 0).map(({ cat, count }) => {
                                  const colors = DT_CAT_COLORS[cat];
                                  const anyHovered = hoveredBarDt?.exposureKey === e.key;
                                  const isHovered = anyHovered && hoveredBarDt?.dtName === cat;
                                  const catDtNames = Object.keys(catMap[cat] ?? {}).filter((k) => (catMap[cat][k] ?? 0) > 0);
                                  const isFiltered = catDtNames.length > 0 && catDtNames.every((dt) => dataTypeFilter.includes(dt)) && exposureFilter.includes(e.key);
                                  const anyFilteredInRow = exposureFilter.includes(e.key) && dataTypeFilter.length > 0;
                                  const isDimmed = (anyHovered && !isHovered) || (anyFilteredInRow && !isFiltered && !anyHovered);
                                  return (
                                    <div
                                      key={cat}
                                      className={`${colors.dot} cursor-pointer transition-opacity duration-100`}
                                      style={{ flex: count / rowTotal, opacity: isDimmed ? 0.25 : isHovered ? 1 : isFiltered ? 1 : 0.75 }}
                                      onMouseEnter={(ev) => {
                                        setHoveredBarDt({ dtName: cat, exposureKey: e.key, clientX: ev.clientX, clientY: ev.clientY });
                                      }}
                                      onMouseLeave={() => setHoveredBarDt(null)}
                                      onClick={() => {
                                        setHoveredBarDt(null);
                                        if (isFiltered) {
                                          onDataTypeFilterChange?.([]);
                                          onExposureFilterChange?.([]);
                                        } else {
                                          onDataTypeFilterChange?.(catDtNames);
                                          onExposureFilterChange?.([e.key]);
                                        }
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })()}
                          {/* Category tooltip */}
                          {hoveredBarDt?.exposureKey === e.key && (() => {
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
                        </div>
                      );
                    })}
                  </div>

                  {/* Category legend — only present cats */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {presentCats.map((cat) => {
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

        {/* ── Search + filter bar — sticky ────────────────────��────────── */}
        <div className="sticky top-0 z-10 shrink-0 px-3 pt-2.5 pb-2.5 border-y border-border space-y-2" style={{ background: "var(--color-background)" }}>
          {/* Search */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: "12px" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 text-muted-foreground hover:text-text-bright transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter pills row + dropdowns */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-center gap-1.5 flex-wrap">

              {/* ── Exposure pill ── */}
              {hasActiveExposureFilter ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={openExposurePicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Exposure
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {exposureFilter.length === 1
                        ? EXPOSURE_LABELS[exposureFilter[0]]
                        : `${exposureFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { onExposureFilterChange?.([]); setOpenDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                    aria-label="Clear exposure filter"
                  >
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openExposurePicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                    openDropdown === "exposure"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}
                >
                  <Plus size={9} />
                  Exposure
                </button>
              )}

              {/* ── Data Type pill ── */}
              {hasActiveDataTypeFilter ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={openDataTypePicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Data Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {dataTypeFilter.length === 1
                        ? dataTypeFilter[0]
                        : `${dataTypeFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDataTypeFilterChange?.([]); setOpenDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                    aria-label="Clear data type filter"
                  >
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openDataTypePicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                    openDropdown === "data-type"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}
                >
                  <Plus size={9} />
                 Data Type
                </button>
              )}
            </div>

            {/* ── Exposure dropdown ── */}
            {openDropdown === "exposure" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 pt-2 pb-2 border-b border-border">
                  <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Exposure</span>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {EXPOSURE_FILTER_CONFIG.map((cfg) => {
                    const count = exposureCounts[cfg.id];
                    if (count === 0) return null;
                    return (
                      <label
                        key={cfg.id}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={exposureFilter.includes(cfg.id)}
                          onChange={() => toggleExposure(cfg.id)}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                        />
                        <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{cfg.label}</span>
                        <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{formatNumber(count)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Data Type dropdown ── */}
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
                      <label
                        key={dt}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={dataTypeFilter.includes(dt)}
                          onChange={() => toggleDataType(dt)}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                        />
                        <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                        <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{formatNumber(count)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Result count footer */}
          <div className="flex items-center gap-2">
            <FolderOpen size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {filteredFiles.length}{search || hasActiveFilter ? ` of ${formatNumber(row.sensitiveFiles)}` : ""} {row.sensitiveFiles === 1 ? "file" : "files"}
              <span className="opacity-60"> · {formatNumber(row.sampledFiles)} of {formatNumber(row.totalFiles)} scanned</span>
            </span>
          </div>
        </div>

        {/* File list */}
        <div className="px-2 py-1">
          {filteredFiles.length > 0 ? (
            <>
              {filteredFiles.slice(0, visibleCount).map((file) => {
                return (
                  <button
                    key={file.originalIdx} type="button"
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40"
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
              <div ref={sentinelRef} />
            </>
          ) : (search || hasActiveFilter) ? (
            <div className="text-center text-muted-foreground mt-6 py-4" style={{ fontSize: "12px" }}>
              {search && hasActiveFilter
                ? <>No files match &ldquo;{search}&rdquo; in {activeFilterLabel} files</>
                : search
                  ? <>No files match &ldquo;{search}&rdquo;</>
                  : <>No {activeFilterLabel} files found</>
              }
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─�� Row Panel Content (kept for InventorySearchResults compatibility) ─────────

export function SaaSRowPanelContent({ row, storeType = "google-drive" }: { row: SaaSUnstructuredDataRow; storeType?: string }) {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<AccessIdentity | null>(null);
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);

  const closeFullDetail = useCallback(() => setFullDetailIdx(null), []);
  const handleViewFullDetails = useCallback((fileIdx: number) => setFullDetailIdx(fileIdx), []);

  return (
    <div className="flex flex-col h-full">
      <TabbedPanelContent
        row={row} activeTab={activeTab} onTabChange={setActiveTab}
        dataTypeFilter={dataTypeFilter} onDataTypeFilterChange={setDataTypeFilter}
        onViewFullDetails={handleViewFullDetails} onSelectIdentity={setSelectedIdentity}
      />

      {/* Stacked identity panel */}
      {selectedIdentity && (
        <SidePanel open onClose={() => setSelectedIdentity(null)} onBack={() => setSelectedIdentity(null)}
          title={selectedIdentity.name}
          subtitle={SAAS_IDENTITY_TYPE_CONFIG[selectedIdentity.identityType]?.label ?? selectedIdentity.identityType}
          panelType="identity" width="min(840px, 90vw)" zIndex={70} hideBackdrop stacked
        >
          <IdentityDetailPanel
            key={selectedIdentity.email ?? selectedIdentity.name}
            row={{ Name: selectedIdentity.name, Email: selectedIdentity.email ?? `${selectedIdentity.name.toLowerCase().replace(/\s+/g, ".")}@acme.com`, Username: selectedIdentity.email ? selectedIdentity.email.split("@")[0] : selectedIdentity.name.toLowerCase().replace(/\s+/g, "."), Domain: selectedIdentity.domain, "Access Level": selectedIdentity.accessLevel }}
            navId={selectedIdentity.identityType} initialTab="data-stores" initialStoreFilter={row.name}
          />
        </SidePanel>
      )}

      {/* Stacked file detail panel */}
      {fullDetailIdx !== null && (() => {
        const files = generatePlaceholderFiles(row.sensitiveFiles, row.dataTypes, row.id);
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
              saasMode
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}

// ── Tabbed Panel Content ──────────────────────────────────────────────────────

function TabbedPanelContent({
  row,
  activeTab,
  onTabChange,
  exposureFilter,
  onExposureClick,
  onExposureFilterChange,
  accessFilter,
  sensitiveAccessOnly,
  onAccessCategoryClick,
  onAccessIdentityTypeClick,
  onAccessFilterChange,
  onNavigateToSensitiveAccess,
  onClearSensitiveOnly,
  onSensitiveFilesClick,
  onDataTypeClick,
  dataTypeFilter,
  onDataTypeFilterChange,
  onViewFullDetails,
  onSelectIdentity,
}: {
  row: SaaSUnstructuredDataRow;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  exposureFilter?: ExposureType[];
  onExposureClick?: (type: ExposureType) => void;
  onExposureFilterChange?: (filter: ExposureType[]) => void;
  accessFilter?: IdentityType[];
  sensitiveAccessOnly?: boolean;
  onAccessCategoryClick?: (cat: AccessCategory) => void;
  onAccessIdentityTypeClick?: (types: IdentityType[]) => void;
  onAccessFilterChange?: (filter: IdentityType[]) => void;
  onNavigateToSensitiveAccess?: () => void;
  onClearSensitiveOnly?: () => void;
  onSensitiveFilesClick?: () => void;
  onDataTypeClick?: (typeName: string) => void;
  dataTypeFilter?: string[];
  onDataTypeFilterChange?: (filter: string[]) => void;
  onViewFullDetails?: (fileIdx: number) => void;
  onSelectIdentity?: (identity: AccessIdentity) => void;
}) {
  return (
    <div className="flex flex-row h-full">
      {/* Vertical tab bar */}
      <div className="shrink-0 flex flex-col gap-0 py-2 border-r border-border w-[172px]">
        {PANEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 w-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-text-bright"
              }`}
              style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
            >
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-primary rounded-full" />
              )}
              <Icon size={13} className="shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.id === "sensitive-files" && (
                null
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "overview" ? (
          <div className="h-full overflow-y-auto">
            <OverviewTabContent row={row} onTabChange={onTabChange} onExposureClick={onExposureClick} onAccessCategoryClick={onAccessCategoryClick} onAccessIdentityTypeClick={onAccessIdentityTypeClick} onNavigateToSensitiveAccess={onNavigateToSensitiveAccess} onSensitiveFilesClick={onSensitiveFilesClick} onDataTypeClick={onDataTypeClick} />
          </div>
        ) : activeTab === "access" ? (
          <AccessSharingTabContent row={row} accessFilter={accessFilter} onAccessFilterChange={onAccessFilterChange} sensitiveOnly={sensitiveAccessOnly} onClearSensitiveOnly={onClearSensitiveOnly} onSelectIdentity={onSelectIdentity} />
        ) : (
          <SensitiveFilesTabContent
            row={row}
            exposureFilter={exposureFilter}
            onExposureFilterChange={onExposureFilterChange}
            dataTypeFilter={dataTypeFilter}
            onDataTypeFilterChange={onDataTypeFilterChange}
            onViewFullDetails={onViewFullDetails}
          />
        )}
      </div>
    </div>
  );
}

// ── Sort columns ─────────────────────────────────────────────────────────────

const SORT_COLUMNS: SortColumnDef[] = [
  { key: "name",           label: "Name" },
  { key: "appInstance",    label: "App Instance" },
  { key: "sensitiveFiles", label: "% Sensitive Files" },
  { key: "dataTypes",      label: "Entity Data Types" },
  { key: "identities",     label: "Identities with Access" },
  { key: "uploaded",       label: "Sensitive Uploaded (30d)" },
  { key: "downloaded",     label: "Sensitive Downloaded (30d)" },
];

function compareRows(a: SaaSUnstructuredDataRow, b: SaaSUnstructuredDataRow, key: string): number {
  switch (key) {
    case "name":           return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "appInstance":    return a.appInstance.localeCompare(b.appInstance, undefined, { sensitivity: "base" });
    case "sensitiveFiles": return getSensitivityPct(a) - getSensitivityPct(b);
    case "dataTypes":      return a.dataTypes.length - b.dataTypes.length;
    case "identities":     return generateAccessIdentities(a).length - generateAccessIdentities(b).length;
    case "uploaded":       return sumSparkData(a.uploadSparkData) - sumSparkData(b.uploadSparkData);
    case "downloaded":     return sumSparkData(a.downloadSparkData) - sumSparkData(b.downloadSparkData);
    default:               return 0;
  }
}


// ── Main Component ────────────────────────────────────────────────────────────

export function UnstructuredDataStoreTableSaaS({ storeType }: { storeType: string }) {
  const config = getSaaSStoreConfig(storeType);
  const [panelRow, setPanelRow] = useState<SaaSUnstructuredDataRow | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [exposureFilter, setExposureFilter] = useState<ExposureType[]>([]);
  const [accessFilter, setAccessFilter] = useState<IdentityType[]>([]);
  const [sensitiveAccessOnly, setSensitiveAccessOnly] = useState(false);
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<AccessIdentity | null>(null);

  const closePanel = useCallback(() => {
    setPanelRow(null);
    setActiveTab("overview");
    setExposureFilter([]);
    setAccessFilter([]);
    setSensitiveAccessOnly(false);
    setDataTypeFilter([]);
    setFullDetailIdx(null);
    setSelectedIdentity(null);
  }, []);

  const closeFullDetail = useCallback(() => {
    setFullDetailIdx(null);
  }, []);

  const handleViewFullDetails = useCallback((fileIdx: number) => {
    setFullDetailIdx(fileIdx);
  }, []);

  const openPanel = useCallback(
    (row: SaaSUnstructuredDataRow, tab: PanelTab = "overview") => {
      setPanelRow(row);
      setActiveTab(tab);
    },
    [],
  );

  const handleTabChange = useCallback((tab: PanelTab) => {
    setActiveTab(tab);
    setExposureFilter([]);
    setDataTypeFilter([]);
    setFullDetailIdx(null);
    if (tab !== "access") { setAccessFilter([]); setSensitiveAccessOnly(false); }
  }, []);

  const handleExposureClick = useCallback((type: ExposureType) => {
    setExposureFilter([type]);
    setActiveTab("sensitive-files");
  }, []);

  const handleExposureFilterChange = useCallback((filter: ExposureType[]) => {
    setExposureFilter(filter);
  }, []);

  const handleAccessCategoryClick = useCallback((cat: AccessCategory) => {
    // Overview cards use AccessCategory — just open the tab without pre-filtering by type
    setAccessFilter([]);
    setActiveTab("access");
  }, []);

  const handleAccessIdentityTypeClick = useCallback((types: IdentityType[]) => {
    setAccessFilter(types);
    setSensitiveAccessOnly(false);
    setActiveTab("access");
  }, []);

  const handleNavigateToSensitiveAccess = useCallback(() => {
    setSensitiveAccessOnly(true);
    setAccessFilter([]);
    setActiveTab("access");
  }, []);

  const handleAccessFilterChange = useCallback((filter: IdentityType[]) => {
    setAccessFilter(filter);
  }, []);

  const handleSensitiveFilesClick = useCallback(() => {
    setDataTypeFilter([]);
    setExposureFilter([]);
    setActiveTab("sensitive-files");
  }, []);

  const handleDataTypeClick = useCallback((typeName: string) => {
    setDataTypeFilter([typeName]);
    setExposureFilter([]);
    setActiveTab("sensitive-files");
  }, []);

  const handleDataTypeFilterChange = useCallback((filter: string[]) => {
    setDataTypeFilter(filter);
  }, []);

  const handleCellClick = useCallback(
    (e: React.MouseEvent, row: SaaSUnstructuredDataRow) => {
      e.stopPropagation();
      openPanel(row, "sensitive-files");
    },
    [openPanel],
  );

  const handleDataTypeCellClick = useCallback(
    (e: React.MouseEvent, row: SaaSUnstructuredDataRow) => {
      e.stopPropagation();
      openPanel(row, "sensitive-files");
    },
    [openPanel],
  );

  const handleIdentitiesClick = useCallback(
    (e: React.MouseEvent, row: SaaSUnstructuredDataRow) => {
      e.stopPropagation();
      openPanel(row, "access");
    },
    [openPanel],
  );

  const sortedRows = useMemo(() => {
    if (!sortConfig) return config.rows;
    const { key, direction } = sortConfig;
    const mul = direction === "asc" ? 1 : -1;
    return [...config.rows].sort((a, b) => mul * compareRows(a, b, key));
  }, [config.rows, sortConfig]);

  const sortColumns = useMemo<SortColumnDef[]>(
    () => SORT_COLUMNS.map((c) =>
      c.key === "name" ? { ...c, label: config.nameColumnLabel } : c,
    ),
    [config.nameColumnLabel],
  );

  const filteredRows = useMemo(() => {
    if (!searchTerm) return sortedRows;
    return sortedRows.filter((row) =>
      matchesSearch(searchTerm, row.name, row.nameSubtitle ?? "", row.appInstance, ...row.dataTypes),
    );
  }, [sortedRows, searchTerm]);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);
  useEffect(() => { setCurrentPage(1); }, [pageSize]);
  const pagedRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);

  const panelWidth = selectedIdentity !== null ? "min(920px, 90vw)" : "min(840px, 90vw)";

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      {/* ContentHeader */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-text-bright" style={{ fontSize: "16px", fontWeight: 600 }}>
              {config.title}
            </h2>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: "12px" }}>
              {config.subtitle} &middot; {config.rows.length}{" "}
              {config.rows.length === 1 ? "record" : "records"}
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
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "appInstance"))}>
                {config.appInstanceColumnLabel} <SortIcon columnKey="appInstance" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "totalFiles"))}>
                Scanned / Total Files <SortIcon columnKey="totalFiles" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-start gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "sensitiveFiles"))}>
                <span className="leading-snug">Sensitive Files</span>
                <SortIcon columnKey="sensitiveFiles" sortConfig={sortConfig} />
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
              <tr
                key={row.id}
                className={`border-b border-border transition-colors cursor-pointer ${isActive ? "bg-primary/5" : "hover:bg-foreground/[0.04]"}`}
                style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                onClick={() => openPanel(row)}
              >
                <td className="px-4 py-3" style={{ fontSize: "12px", fontWeight: 500 }}>
                  <HighlightText text={row.name} query={searchTerm} className="text-primary" />
                  {row.nameSubtitle && (
                    <div style={{ fontSize: "11px", fontWeight: 400 }}>
                      <HighlightText text={row.nameSubtitle} query={searchTerm} className="text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px" }}>
                  <HighlightText text={row.appInstance} query={searchTerm} className="text-muted-foreground" />
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const pct = row.totalFiles > 0 ? Math.round((row.sampledFiles / row.totalFiles) * 100) : 0;
                    return (
                      <div>
                        <span className="tabular-nums text-text-bright" style={{ fontSize: "13px", fontWeight: 500 }}>{pct}%</span>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>of {formatNumber(row.totalFiles)}</div>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => handleCellClick(e, row)}
                    className="text-left rounded-md px-1.5 py-1 -mx-1.5 -my-1 hover:bg-primary/10 transition-colors"
                  ><span className="tabular-nums text-primary" style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Inter, sans-serif" }}>{formatNumber(row.sensitiveFiles)}</span></button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => handleDataTypeCellClick(e, row)}
                    className="rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                  >
                    <DataTypeTags types={row.dataTypes} />
                  </button>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button
                    onClick={(e) => handleIdentitiesClick(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {formatNumber(generateAccessIdentities(row).length)}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const total = sumSparkData(row.uploadSparkData);
                    const pct = sparkPctChange(row.uploadSparkData);
                    return (
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-bright)" }}>
                          {formatBytes(total)}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const total = sumSparkData(row.downloadSparkData);
                    const pct = sparkPctChange(row.downloadSparkData);
                    return (
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-bright)" }}>
                          {formatBytes(total)}
                        </span>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <TablePagination currentPage={currentPage} totalRows={filteredRows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />

      {/* Single tabbed side panel */}
      <SidePanel
        open={panelRow !== null}
        onClose={closePanel}
        title={panelRow?.name ?? ""}
        subtitle={panelRow?.nameSubtitle}
        titleIcon={<DataStoreIcon storeType={storeType} size={20} />}
        width={panelWidth}
        suspended={(fullDetailIdx !== null && activeTab === "sensitive-files") || selectedIdentity !== null}
        pushed={(fullDetailIdx !== null && activeTab === "sensitive-files") || selectedIdentity !== null}
        pushedRightOffset="min(840px, 90vw)"
      >
        {panelRow && (
          <TabbedPanelContent
            row={panelRow}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            exposureFilter={exposureFilter}
            onExposureClick={handleExposureClick}
            onExposureFilterChange={handleExposureFilterChange}
            accessFilter={accessFilter}
            sensitiveAccessOnly={sensitiveAccessOnly}
            onAccessCategoryClick={handleAccessCategoryClick}
            onAccessIdentityTypeClick={handleAccessIdentityTypeClick}
            onAccessFilterChange={handleAccessFilterChange}
            onNavigateToSensitiveAccess={handleNavigateToSensitiveAccess}
            onClearSensitiveOnly={() => setSensitiveAccessOnly(false)}
            onSensitiveFilesClick={handleSensitiveFilesClick}
            onDataTypeClick={handleDataTypeClick}
            dataTypeFilter={dataTypeFilter}
            onDataTypeFilterChange={handleDataTypeFilterChange}
            onViewFullDetails={handleViewFullDetails}
            onSelectIdentity={setSelectedIdentity}
          />
        )}
      </SidePanel>

      {/* Stacked identity detail side panel */}
      {panelRow && selectedIdentity && (
        <SidePanel
          open
          onClose={() => setSelectedIdentity(null)}
          onBack={() => setSelectedIdentity(null)}
          title={selectedIdentity.name}
          subtitle={SAAS_IDENTITY_TYPE_CONFIG[selectedIdentity.identityType]?.label ?? selectedIdentity.identityType}
          panelType="identity"
          width="min(840px, 90vw)"
          zIndex={60}
          hideBackdrop
          stacked
        >
          <IdentityDetailPanel
            key={selectedIdentity.email ?? selectedIdentity.name}
            row={{
              Name: selectedIdentity.name,
              Email: selectedIdentity.email ?? `${selectedIdentity.name.toLowerCase().replace(/\s+/g, ".")}@acme.com`,
              Username: selectedIdentity.email ? selectedIdentity.email.split("@")[0] : selectedIdentity.name.toLowerCase().replace(/\s+/g, "."),
              Domain: selectedIdentity.domain,
              "Access Level": selectedIdentity.accessLevel,
            }}
            navId={selectedIdentity.identityType}
            initialTab="data-stores"
            initialStoreFilter={panelRow.name}
          />
        </SidePanel>
      )}

      {/* Stacked file detail side panel */}
      {panelRow && fullDetailIdx !== null && (() => {
        const files = generatePlaceholderFiles(panelRow.sensitiveFiles, panelRow.dataTypes, panelRow.id);
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
              saasMode
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}
