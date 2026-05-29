import { useState, useCallback, useMemo, useRef } from "react";
import { FolderOpen, Search, X, FileText, Info, Users, Shield, Globe, User, ExternalLink, CheckCircle, AlertTriangle, XCircle, Tag } from "lucide-react";
import {
  Sparkline,
  DataTypeTags,
  formatNumber,
  sumSparkData,
  SortIcon,
  SortDropdown,
  toggleHeaderSort,
  TableSearchInput,
  HighlightText,
  matchesSearch,
  type SortConfig,
  type SortColumnDef,
} from "../app/components/inventory/data-store-shared";
import { SidePanel } from "./SidePanel";
import { FileDetailPane } from "./ForensicDetailPane";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type SaaSUnstructuredDataRow,
  getSaaSStoreConfig,
} from "./UnstructuredDataStoreTableSaaS";

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

// ── Tab types ────────────────────────────────────────────────────────────────

type PanelTab = "overview" | "data-types" | "sensitive-files" | "access";

const PANEL_TABS: { id: PanelTab; label: string; icon: typeof Info }[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "access", label: "Access & Sharing", icon: Users },
  { id: "data-types", label: "Data Types", icon: Tag },
  { id: "sensitive-files", label: "Sensitive Files", icon: FileText },
];

// ── Overview Tab Content ─────────────────────────────────────────────────────

// Per-drive realistic metadata
interface DriveMetadata {
  driveId: string;
  driveType: string;
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

// ── Reusable helper components ───────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-muted-foreground uppercase tracking-wide mb-2"
      style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>{label}</span>
      <span
        className={`text-text-bright text-right ${mono ? "font-mono" : ""}`}
        style={{ fontSize: "11px", wordBreak: "break-all" }}
      >
        {value}
      </span>
    </div>
  );
}

function RiskBadge({ level }: { level: DriveMetadata["riskLevel"] }) {
  const config = {
    low: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle, label: "Low" },
    medium: { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: AlertTriangle, label: "Medium" },
    high: { bg: "bg-orange-500/15", text: "text-orange-400", icon: AlertTriangle, label: "High" },
    critical: { bg: "bg-red-500/15", text: "text-red-400", icon: XCircle, label: "Critical" },
  }[level];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text}`} style={{ fontSize: "11px", fontWeight: 500 }}>
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function ScanStatusBadge({ status }: { status: DriveMetadata["scanStatus"] }) {
  const config = {
    complete: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Complete" },
    partial: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Partial" },
    pending: { bg: "bg-slate-500/15", text: "text-slate-400", label: "Pending" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text}`} style={{ fontSize: "11px", fontWeight: 500 }}>
      {config.label}
    </span>
  );
}

function StorageBar({ used, quota }: { used: string; quota: string }) {
  // Parse "48.2 GB" → number
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
      <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OverviewTabContent({ row }: { row: SaaSUnstructuredDataRow }) {
  const meta = getMetadata(row.id);

  return (
    <div className="px-5 py-4 space-y-5">

      {/* ── Basic Information ──────────────────────────────────────────── */}
      <div>
        <SectionHeading>Basic Information</SectionHeading>
        <div className="bg-surface-raised border border-border rounded-lg px-3.5 py-2 divide-y divide-border/50">
          <InfoRow label="App Instance" value={row.appInstance} />
          <InfoRow label="Drive ID" value={meta.driveId} mono />
          <InfoRow label="Drive Type" value={meta.driveType} />
          <InfoRow label="Region" value={
            <span className="inline-flex items-center gap-1">
              <Globe size={11} className="text-muted-foreground" />
              {meta.region}
            </span>
          } />
          <InfoRow label="Owner" value={
            <span>
              <span className="block">{meta.owner}</span>
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{meta.ownerEmail}</span>
            </span>
          } />
          <InfoRow label="Created" value={meta.createdDate} />
        </div>
      </div>

      {/* ── Storage ────────────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Storage</SectionHeading>
        <div className="bg-surface-raised border border-border rounded-lg px-3.5 py-3">
          <StorageBar used={meta.storageUsed} quota={meta.storageQuota} />
        </div>
      </div>

      {/* ── Risk & Scan Status ─────────────────────────────────────────── */}
      <div>
        <SectionHeading>Risk & Scan Status</SectionHeading>
        <div className="bg-surface-raised border border-border rounded-lg px-3.5 py-2 divide-y divide-border/50">
          <InfoRow label="Risk Level" value={<RiskBadge level={meta.riskLevel} />} />
          <InfoRow label="Last Scan" value={meta.lastScanDate} />
          <InfoRow label="Scan Status" value={<ScanStatusBadge status={meta.scanStatus} />} />
        </div>
      </div>

      {/* ── Compliance & Policies ──────────────────────────────────────── */}
      <div>
        <SectionHeading>Compliance & Policies</SectionHeading>
        <div className="bg-surface-raised border border-border rounded-lg px-3.5 py-2 divide-y divide-border/50">
          <InfoRow label="Retention Policy" value={meta.retentionPolicy} />
          <InfoRow label="Last Audit" value={meta.lastAuditDate} />
          <div className="py-1.5">
            <div className="text-muted-foreground mb-1.5" style={{ fontSize: "11px" }}>DLP Policies</div>
            <div className="flex flex-wrap gap-1">
              {meta.dlpPolicies.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary" style={{ fontSize: "10px" }}>
                  <Shield size={10} />
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="py-1.5">
            <div className="text-muted-foreground mb-1.5" style={{ fontSize: "11px" }}>Compliance</div>
            <div className="flex flex-wrap gap-1">
              {meta.complianceFrameworks.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400" style={{ fontSize: "10px", fontWeight: 500 }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Access & Sharing Tab Content ─────────────────────────────────────────────

function AccessSharingTabContent({ row }: { row: SaaSUnstructuredDataRow }) {
  const meta = getMetadata(row.id);

  return (
    <div className="px-5 py-4 space-y-5">

      {/* ── Access Summary ─────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Access Summary</SectionHeading>
        <div className="bg-surface-raised border border-border rounded-lg px-3.5 py-2 divide-y divide-border/50">
          <InfoRow label="Members" value={
            <span className="inline-flex items-center gap-1">
              <Users size={11} className="text-muted-foreground" />
              {meta.membersCount}
            </span>
          } />
          <InfoRow label="Active (30d)" value={`${meta.activeUsersLast30d} users`} />
          <InfoRow label="External Shares" value={
            meta.externalShareCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-yellow-400">
                <ExternalLink size={11} />
                {meta.externalShareCount} items
              </span>
            ) : (
              <span className="text-emerald-400">None</span>
            )
          } />
          <InfoRow label="External Sharing" value={
            meta.externalSharingEnabled ? (
              <span className="text-yellow-400">Enabled</span>
            ) : (
              <span className="text-emerald-400">Disabled</span>
            )
          } />
          <InfoRow label="Link Sharing" value={meta.linkSharingPolicy} />
        </div>
      </div>

      {/* ── Top Collaborators ──────────────────────────────────────────── */}
      <div>
        <SectionHeading>Top Collaborators</SectionHeading>
        <div className="space-y-1.5">
          {meta.topCollaborators.map((c) => (
            <div key={c.email} className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised border border-border rounded-md">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <User size={12} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-text-bright truncate" style={{ fontSize: "11px", fontWeight: 450 }}>{c.name}</div>
                <div className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{c.email}</div>
              </div>
              <span className="shrink-0 px-1.5 py-0.5 bg-background border border-border rounded text-muted-foreground" style={{ fontSize: "10px" }}>
                {c.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Data Types Tab Content ───────────────────────────────────────────────────

// Rich metadata per data type
const DATA_TYPE_INFO: Record<string, { category: string; severity: "critical" | "high" | "medium" | "low"; description: string; sampleEntities: string[] }> = {
  "Personal Names":            { category: "PII", severity: "medium",   description: "Full names of individuals found in documents", sampleEntities: ["John Smith", "Maria Garcia", "Wei Zhang"] },
  "Email Addresses":           { category: "PII", severity: "medium",   description: "Email addresses including corporate and personal", sampleEntities: ["j.smith@acme.com", "user@gmail.com", "contact@vendor.io"] },
  "IP Addresses":              { category: "Infrastructure", severity: "high", description: "Internal and external IP addresses", sampleEntities: ["10.0.12.45", "192.168.1.100", "203.0.113.42"] },
  "Source Code":               { category: "IP", severity: "high",      description: "Proprietary source code fragments and files", sampleEntities: ["auth_handler.py", "deploy.sh", "config.yaml"] },
  "Passwords":                 { category: "Credentials", severity: "critical", description: "Plaintext or weakly-encoded passwords", sampleEntities: ["P@ssw0rd!", "admin123", "••••••••"] },
  "Private Keys":              { category: "Credentials", severity: "critical", description: "RSA/SSH/TLS private key material", sampleEntities: ["-----BEGIN RSA PRIVATE KEY-----", "ssh-rsa AAAA…", "*.pem files"] },
  "Financial IDs":             { category: "Financial", severity: "high", description: "Account numbers, routing numbers, SWIFT codes", sampleEntities: ["026009593", "CHASUS33", "4532-XXXX"] },
  "Bank Account Information":  { category: "Financial", severity: "critical", description: "Full bank account and routing details", sampleEntities: ["Acct: ****4821", "Routing: 021000021", "IBAN: GB29…"] },
  "Payment Cards":             { category: "PCI", severity: "critical",  description: "Credit/debit card numbers and related data", sampleEntities: ["4532-****-****-1234", "Exp 09/27", "CVV ***"] },
  "Social Security Numbers":   { category: "PII", severity: "critical",  description: "US Social Security Numbers", sampleEntities: ["***-**-6789", "SSN: XXX-XX-1234", "078-05-XXXX"] },
  "Taxpayer IDs":              { category: "Financial", severity: "high", description: "EIN, TIN, and other tax identification numbers", sampleEntities: ["EIN: 12-3456789", "TIN: 98-7654321", "ITIN: 9XX-XX-XXXX"] },
  "Birthdates":                { category: "PII", severity: "medium",    description: "Dates of birth in various formats", sampleEntities: ["1990-03-15", "03/15/1990", "March 15, 1990"] },
  "Medical Records":           { category: "PHI", severity: "critical",  description: "Protected health information and medical data", sampleEntities: ["Dx: Hypertension", "ICD-10: I10", "Rx: Metformin 500mg"] },
  "Postal Addresses":          { category: "PII", severity: "medium",    description: "Physical mailing addresses", sampleEntities: ["123 Main St, NY", "PO Box 456", "Suite 200, SF CA"] },
  "Telephone Numbers":         { category: "PII", severity: "medium",    description: "Phone numbers including mobile and landline", sampleEntities: ["+1 (555) 123-4567", "ext. 8901", "+44 20 7946 0958"] },
  "Healthcare IDs":            { category: "PHI", severity: "critical",  description: "Health insurance and medical record IDs", sampleEntities: ["MRN: 00123456", "Policy: HMO-789", "NPI: 1234567890"] },
  "Gender":                    { category: "PII", severity: "low",       description: "Gender identity information", sampleEntities: ["Male", "Female", "Non-binary"] },
  "Ethnicity and Race":        { category: "PII", severity: "medium",    description: "Ethnic and racial demographic data", sampleEntities: ["Asian", "Hispanic/Latino", "Caucasian"] },
  "Company Names":             { category: "Business", severity: "low",  description: "Organization and business entity names", sampleEntities: ["Acme Corp", "Globex Inc.", "Initech LLC"] },
};

function getDataTypeInfo(dt: string) {
  return DATA_TYPE_INFO[dt] ?? { category: "Other", severity: "medium" as const, description: "Sensitive data type detected in files", sampleEntities: [] };
}

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
        // random entity count per file for this type (1-8)
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

const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/25", bar: "bg-red-500", label: "Critical" },
  high:     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/25", bar: "bg-orange-500", label: "High" },
  medium:   { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/25", bar: "bg-yellow-500", label: "Medium" },
  low:      { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25", bar: "bg-emerald-500", label: "Low" },
};

function DataTypesTabContent({ row }: { row: SaaSUnstructuredDataRow }) {
  const breakdown = useMemo(() => computeDataTypeBreakdown(row), [row]);
  const maxFileCount = useMemo(() => Math.max(...breakdown.map((b) => b.fileCount), 1), [breakdown]);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Summary counts by severity
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
                    <span className={`shrink-0 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`} style={{ fontSize: "10px", fontWeight: 600 }}>{cfg.label}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{dt.category}</span>
                  </div>

                  {/* Bar */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
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

      {/* ── Activity (30 days) ─────────────────────────────────────────── */}
      <div>
        <SectionHeading>Activity (30 days)</SectionHeading>
        <div className="space-y-3">
          <div>
            <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>Uploads</div>
            <div className="h-8"><Sparkline data={row.uploadSparkData} color="var(--color-primary)" /></div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>Downloads</div>
            <div className="h-8"><Sparkline data={row.downloadSparkData} color="#06b6d4" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sensitive Files Tab Content ──────────────────────────────────────────────

function SensitiveFilesTabContent({
  row,
  selectedIdx,
  onSelect,
}: {
  row: SaaSUnstructuredDataRow;
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const files = useMemo(
    () => generatePlaceholderFiles(row.sensitiveFiles, row.dataTypes),
    [row.sensitiveFiles, row.dataTypes],
  );

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files.map((f, i) => ({ ...f, originalIdx: i }));
    const q = search.toLowerCase();
    return files
      .map((f, i) => ({ ...f, originalIdx: i }))
      .filter((f) => f.name.toLowerCase().includes(q) || f.entityTypes.some((et) => et.toLowerCase().includes(q)));
  }, [files, search]);

  const selectedFile = selectedIdx !== null && selectedIdx < files.length ? files[selectedIdx] : null;
  const fileListRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => fileListRef.current,
    estimateSize: () => 46,
    overscan: 10,
  });

  return (
    <div className="flex h-full">
      <div className="flex flex-col shrink-0 border-r border-border" style={{ width: selectedFile ? 320 : "100%" }}>
        {/* Search */}
        <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: "12px" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 text-muted-foreground hover:text-text-bright transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <FolderOpen size={12} className="text-primary" />
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {filteredFiles.length}{search ? ` of ${formatNumber(row.sensitiveFiles)}` : ""} sensitive {row.sensitiveFiles === 1 ? "file" : "files"}
            </span>
          </div>
        </div>

        {/* File list — virtualized */}
        <div ref={fileListRef} className="flex-1 overflow-y-auto px-2 py-1">
          {filteredFiles.length > 0 ? (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const file = filteredFiles[virtualRow.index];
                const isActive = selectedIdx === file.originalIdx;
                return (
                  <button
                    key={file.originalIdx} type="button"
                    ref={rowVirtualizer.measureElement} data-index={virtualRow.index}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left ${isActive ? "bg-primary/10" : "hover:bg-nav-active/40"}`}
                    style={{
                      position: "absolute", top: 0, left: 0, width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      ...(isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : {}),
                    }}
                    onClick={() => onSelect(isActive ? null : file.originalIdx)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 450 }}>{file.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{file.entityTypes.join(", ")}</span>
                        <span className="text-muted-foreground opacity-40 shrink-0">&middot;</span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>Scanned {file.modified}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : search ? (
            <div className="text-center text-muted-foreground mt-6 py-4" style={{ fontSize: "12px" }}>
              No files match &ldquo;{search}&rdquo;
            </div>
          ) : null}
        </div>
      </div>

      {/* Right: detail pane */}
      {selectedFile && (
        <div className="flex-1 overflow-y-auto min-w-0">
          <FileDetailPane file={selectedFile} />
        </div>
      )}
    </div>
  );
}

// ── Tabbed Panel Content ──────────────────────���──────────────────────────────

function TabbedPanelContent({
  row,
  activeTab,
  onTabChange,
  cellSelectedIdx,
  onCellSelect,
}: {
  row: SaaSUnstructuredDataRow;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  cellSelectedIdx: number | null;
  onCellSelect: (idx: number | null) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-0 px-4 border-b border-border">
        {PANEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-text-bright"
              }`}
              style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
            >
              <Icon size={13} />
              {tab.label}
              {tab.id === "sensitive-files" && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-raised text-muted-foreground"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 600 }}
                >
                  {formatNumber(row.sensitiveFiles)}
                </span>
              )}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "overview" ? (
          <OverviewTabContent row={row} />
        ) : activeTab === "data-types" ? (
          <DataTypesTabContent row={row} />
        ) : activeTab === "access" ? (
          <AccessSharingTabContent row={row} />
        ) : (
          <SensitiveFilesTabContent
            row={row}
            selectedIdx={cellSelectedIdx}
            onSelect={onCellSelect}
          />
        )}
      </div>
    </div>
  );
}

// ── Sort columns ─────────────────────────────────────────────────────────────

const SORT_COLUMNS: SortColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "appInstance", label: "App Instance" },
  { key: "sensitiveFiles", label: "# Sensitive Files" },
  { key: "dataTypes", label: "Sensitive Data Types" },
  { key: "uploaded", label: "Sensitive Uploaded (30d)" },
  { key: "downloaded", label: "Sensitive Downloaded (30d)" },
];

function compareRows(a: SaaSUnstructuredDataRow, b: SaaSUnstructuredDataRow, key: string): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "appInstance":
      return a.appInstance.localeCompare(b.appInstance, undefined, { sensitivity: "base" });
    case "sensitiveFiles":
      return a.sensitiveFiles - b.sensitiveFiles;
    case "dataTypes":
      return a.dataTypes.length - b.dataTypes.length;
    case "uploaded":
      return sumSparkData(a.uploadSparkData) - sumSparkData(b.uploadSparkData);
    case "downloaded":
      return sumSparkData(a.downloadSparkData) - sumSparkData(b.downloadSparkData);
    default:
      return 0;
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export function UnstructuredDataStoreTableSaaSV2({ storeType }: { storeType: string }) {
  const config = getSaaSStoreConfig(storeType);
  const [panelRow, setPanelRow] = useState<SaaSUnstructuredDataRow | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cellSelectedIdx, setCellSelectedIdx] = useState<number | null>(null);

  const closePanel = useCallback(() => {
    setPanelRow(null);
    setActiveTab("overview");
    setCellSelectedIdx(null);
  }, []);

  const openPanel = useCallback(
    (row: SaaSUnstructuredDataRow, tab: PanelTab = "overview") => {
      setPanelRow(row);
      setActiveTab(tab);
      setCellSelectedIdx(null);
    },
    [],
  );

  const handleTabChange = useCallback((tab: PanelTab) => {
    setActiveTab(tab);
    setCellSelectedIdx(null);
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
      openPanel(row, "data-types");
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

  // Compute panel width based on active tab + selection
  const panelWidth = activeTab === "sensitive-files" && cellSelectedIdx !== null ? "min(920px, 90vw)" : "min(840px, 90vw)";

  return (
    <div className="flex-1 overflow-auto">
      {/* ContentHeader */}
      <div className="sticky top-0 z-10 bg-background px-5 pt-5 pb-3 border-b border-border">
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
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "sensitiveFiles"))}>
                # Sensitive / Total Files <SortIcon columnKey="sensitiveFiles" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500, minWidth: 220 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "dataTypes"))}>
                Sensitive Data Types <SortIcon columnKey="dataTypes" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "uploaded"))}>
                Sensitive Uploaded (30d) <SortIcon columnKey="uploaded" sortConfig={sortConfig} />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
              <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "downloaded"))}>
                Sensitive Downloaded (30d) <SortIcon columnKey="downloaded" sortConfig={sortConfig} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => {
            const isActive = panelRow !== null && panelRow.id === row.id;
            return (
              <tr
                key={row.id}
                className={`border-b border-border transition-colors cursor-pointer ${isActive ? "bg-primary/5" : "hover:bg-foreground/[0.04]"}`}
                style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                onClick={() => openPanel(row)}
              >
                <td className="px-4 py-3" style={{ fontSize: "13px", fontWeight: 500 }}>
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
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button
                    onClick={(e) => handleCellClick(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {formatNumber(row.sensitiveFiles)}
                  </button>
                  <span className="text-muted-foreground"> / {formatNumber(row.totalFiles)}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => handleDataTypeCellClick(e, row)}
                    className="rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                  >
                    <DataTypeTags types={row.dataTypes} />
                  </button>
                </td>
                <td className="px-4 py-3"><Sparkline data={row.uploadSparkData} color="var(--color-primary)" /></td>
                <td className="px-4 py-3"><Sparkline data={row.downloadSparkData} color="#06b6d4" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Single tabbed side panel */}
      <SidePanel
        open={panelRow !== null}
        onClose={closePanel}
        title={panelRow?.name ?? ""}
        subtitle={panelRow?.nameSubtitle}
        width={panelWidth}
      >
        {panelRow && (
          <TabbedPanelContent
            row={panelRow}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            cellSelectedIdx={cellSelectedIdx}
            onCellSelect={setCellSelectedIdx}
          />
        )}
      </SidePanel>
    </div>
  );
}