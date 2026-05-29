/**
 * Shared components and utilities for side-panel tabs across all data store tables.
 * Centralises SectionHeading, InfoRow, badge helpers, PanelTabBar, SEVERITY_CONFIG,
 * DATA_TYPE_INFO, and the SparkTrend cell so that changes only need to happen once.
 */

import React, { type ElementType } from "react";
import {
  Info, FileText, Users, Columns3, Activity,
  CheckCircle, AlertTriangle, XCircle,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { formatBytes, sumSparkData, formatNumber } from "./data-store-shared";

// ── Panel tab types ──────────────────────────────────────────────────────────

export type PanelTab = "overview" | "sensitive-files" | "sensitive-fields" | "access" | "activity";

export interface PanelTabDef {
  id: PanelTab;
  label: string;
  icon: ElementType;
}

/** Build the standard 4-tab config.  Pass "files" or "fields"/"columns" for the second tab. */
export function makePanelTabs(
  sensitiveVariant: "files" | "fields" | "columns" = "files",
): PanelTabDef[] {
  const sensitiveId: PanelTab = sensitiveVariant === "files" ? "sensitive-files" : "sensitive-fields";
  const sensitiveLabel =
    sensitiveVariant === "files"   ? "Sensitive Files"
    : sensitiveVariant === "columns" ? "Sensitive Columns"
    : "Sensitive Fields";
  const sensitiveIcon = sensitiveVariant === "files" ? FileText : Columns3;

  return [
    { id: "overview",     label: "Overview",       icon: Info },
    { id: sensitiveId,    label: sensitiveLabel,    icon: sensitiveIcon },
    { id: "access",       label: "Identities with Access", icon: Users },
  ];
}

/** Build the standard 4-tab config with Activity appended. */
export function makePanelTabsWithActivity(
  sensitiveVariant: "files" | "fields" | "columns" = "files",
): PanelTabDef[] {
  return [
    ...makePanelTabs(sensitiveVariant),
    { id: "activity", label: "Activity", icon: Activity },
  ];
}

// ── PanelTabBar ──────────────────────────────────────────────────────────────

export function PanelTabBar({
  tabs,
  activeTab,
  onTabChange,
  sensitiveCount,
  accessLabel,
}: {
  tabs: PanelTabDef[];
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  /** Optional count badge shown on the sensitive tab */
  sensitiveCount?: number;
  /** Override label for the "access" tab (e.g. "Identities with Usage") */
  accessLabel?: string;
}) {
  return (
    <div className="shrink-0 flex flex-col gap-0 py-2 border-r border-border min-w-[172px] w-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const isSensitiveTab = tab.id === "sensitive-files" || tab.id === "sensitive-fields";
        const displayLabel = tab.id === "access" && accessLabel ? accessLabel : tab.label;
        const isActivityTab = tab.id === "activity";
        const activeColor = isActivityTab ? "text-pink-500" : "text-primary";
        const activeBarColor = isActivityTab ? "bg-pink-500" : "bg-primary";
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 w-full transition-colors ${
              isActive ? activeColor : isActivityTab ? "text-pink-400 hover:text-pink-500" : "text-muted-foreground hover:text-text-bright"
            }`}
            style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
          >
            {isActive && (
              <span className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] ${activeBarColor} rounded-full`} />
            )}
            <Icon size={13} className="shrink-0" />
            <span className="whitespace-nowrap">{displayLabel}</span>
            {isSensitiveTab && sensitiveCount != null && (
              null
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── SectionHeading ───────────────────────────────────────────────────────────

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    null
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

export function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>{label}</span>
      <span
        className={`text-text-bright text-right ${mono ? "font-mono" : ""}`}
        style={{ fontSize: "11px", overflowWrap: "break-word" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── SecurityStatus ───────────────────────────────────────────────────────────

export function SecurityStatus({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="text-text-bright">Enabled</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-400">
      <AlertTriangle size={10} />Disabled
    </span>
  );
}

// ── BoolBadge ────────────────────────────────────────────────────────────────

export function BoolBadge({
  value,
  trueLabel = "Enabled",
  falseLabel = "Disabled",
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return value
    ? <span className="text-emerald-400">{trueLabel}</span>
    : <span className="text-muted-foreground">{falseLabel}</span>;
}

// ── RiskBadge ────────────────────────────────────────────────────────────────

export function RiskBadge({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const config = {
    low:      { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle,   label: "Low" },
    medium:   { bg: "bg-yellow-500/15",  text: "text-yellow-400",  icon: AlertTriangle, label: "Medium" },
    high:     { bg: "bg-orange-500/15",  text: "text-orange-400",  icon: AlertTriangle, label: "High" },
    critical: { bg: "bg-red-500/15",     text: "text-red-400",     icon: XCircle,       label: "Critical" },
  }[level];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}
      style={{ fontSize: "11px", fontWeight: 400 }}>
      <Icon size={11} />{config.label}
    </span>
  );
}

// ── ScanStatusBadge ──────────────────────────────────────────────────────────

export function ScanStatusBadge({ status }: { status: "complete" | "partial" | "pending" }) {
  const config = {
    complete: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Complete" },
    partial:  { bg: "bg-yellow-500/15",  text: "text-yellow-400",  label: "Partial" },
    pending:  { bg: "bg-slate-500/15",   text: "text-slate-400",   label: "Pending" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}
      style={{ fontSize: "11px", fontWeight: 400 }}>
      {config.label}
    </span>
  );
}

// ── SEVERITY_CONFIG ──────────────────────────────────────────────────────────

export const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/25",     bar: "bg-red-500",     label: "Critical" },
  high:     { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/25",  bar: "bg-orange-500",  label: "High" },
  medium:   { bg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-yellow-500/25",  bar: "bg-yellow-500",  label: "Medium" },
  low:      { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25", bar: "bg-emerald-500", label: "Low" },
} as const;

export type Severity = keyof typeof SEVERITY_CONFIG;

// ── DATA_TYPE_INFO ───────────────────────────────────────────────────────────

export const DATA_TYPE_INFO: Record<string, { category: string; severity: Severity; description: string; sampleEntities: string[] }> = {
  "Personal Names":          { category: "PII",            severity: "medium",   description: "Full names of individuals found in files",                 sampleEntities: ["John Smith", "Maria Garcia", "Wei Zhang"] },
  "Email Addresses":         { category: "PII",            severity: "medium",   description: "Email addresses including corporate and personal",          sampleEntities: ["j.smith@acme.com", "user@gmail.com"] },
  "Social Security Numbers": { category: "PII",            severity: "critical", description: "US Social Security Numbers",                              sampleEntities: ["***-**-6789", "078-05-XXXX"] },
  "Financial IDs":           { category: "Financial",      severity: "high",     description: "Account numbers, routing numbers, SWIFT codes",            sampleEntities: ["026009593", "CHASUS33"] },
  "Healthcare IDs":          { category: "PHI",            severity: "critical", description: "Health insurance and medical record IDs",                  sampleEntities: ["MRN: 00123456", "Policy: HMO-789"] },
  "Birthdates":              { category: "PII",            severity: "medium",   description: "Dates of birth in various formats",                       sampleEntities: ["1990-03-15", "March 15, 1990"] },
  "Telephone Numbers":       { category: "PII",            severity: "medium",   description: "Phone numbers including mobile and landline",              sampleEntities: ["+1 (555) 123-4567", "+44 20 7946 0958"] },
  "Postal Addresses":        { category: "PII",            severity: "medium",   description: "Physical mailing addresses",                              sampleEntities: ["123 Main St, NY", "Suite 200, SF CA"] },
  "IP Addresses":            { category: "Infrastructure", severity: "high",     description: "Internal and external IP addresses",                       sampleEntities: ["10.0.12.45", "203.0.113.42"] },
  "MAC Addresses":           { category: "Infrastructure", severity: "medium",   description: "Network hardware MAC addresses",                          sampleEntities: ["00:1B:44:11:3A:B7", "F0:DE:F1:B4:82:C9"] },
  "UUIDs":                   { category: "Infrastructure", severity: "low",      description: "Universally unique identifiers used as resource IDs",      sampleEntities: ["550e8400-e29b-41d4", "6ba7b810-9dad-11d1"] },
  "Domain Names":            { category: "Infrastructure", severity: "low",      description: "Fully qualified domain names",                            sampleEntities: ["api.acme.com", "internal.corp"] },
  "URI Hosts":               { category: "Infrastructure", severity: "low",      description: "Host portions of URIs and URLs",                          sampleEntities: ["db.prod.acme.com", "10.0.0.1:5432"] },
  "Medical Records":         { category: "PHI",            severity: "critical", description: "Protected health information and medical data",            sampleEntities: ["Dx: Hypertension", "ICD-10: I10"] },
  "Healthcare Provider IDs": { category: "PHI",            severity: "high",     description: "NPI and other provider identification numbers",           sampleEntities: ["NPI: 1234567890", "DEA: AB1234567"] },
  "Medical Diagnoses":       { category: "PHI",            severity: "critical", description: "ICD codes and clinical diagnoses",                       sampleEntities: ["ICD-10: E11.9", "ICD-10: I48.91"] },
  "Medical Procedures":      { category: "PHI",            severity: "critical", description: "Medical procedure codes",                                sampleEntities: ["CPT: 99213", "HCPCS: G0101"] },
  "Biometric Data":          { category: "PHI",            severity: "critical", description: "Fingerprints, facial recognition, and other biometrics",  sampleEntities: ["fingerprint_hash", "face_embedding_vec"] },
  "Gender":                  { category: "PII",            severity: "low",      description: "Gender identity information",                             sampleEntities: ["Male", "Female", "Non-binary"] },
  "Age":                     { category: "PII",            severity: "low",      description: "Age values derived from or alongside birthdates",          sampleEntities: ["34", "age: 27", "DOB: 1991"] },
  "Ethnicity and Race":      { category: "PII",            severity: "medium",   description: "Ethnic and racial demographic data",                      sampleEntities: ["Asian", "Hispanic/Latino"] },
  "Taxpayer IDs":            { category: "Financial",      severity: "high",     description: "EIN, TIN, and other tax identification numbers",          sampleEntities: ["EIN: 12-3456789", "TIN: 98-7654321"] },
  "Passports":               { category: "PII",            severity: "critical", description: "Passport numbers and document data",                      sampleEntities: ["US: 5XXXXXXX", "UK: 987654321"] },
  "Payment Cards":           { category: "PCI",            severity: "critical", description: "Credit/debit card numbers and related data",              sampleEntities: ["4532-****-****-1234", "CVV ***"] },
  "Company Names":           { category: "Business",       severity: "low",      description: "Organization and business entity names",                  sampleEntities: ["Acme Corp", "Globex Inc."] },
  "Genetic Data":            { category: "PHI",            severity: "critical", description: "DNA sequences and genetic markers",                       sampleEntities: ["BRCA1 variant", "SNP rs334"] },
  "Bank Account Information":{ category: "Financial",      severity: "high",     description: "Bank account and routing numbers",                        sampleEntities: ["Acct: ****5678", "RT: 021000021"] },
  "Passwords":               { category: "Security",       severity: "critical", description: "Password strings and hashes",                            sampleEntities: ["bcrypt hash", "plaintext ***"] },
  "Private Keys":            { category: "Security",       severity: "critical", description: "Cryptographic private keys",                             sampleEntities: ["RSA PRIVATE KEY", "EC PRIVATE KEY"] },
  "Public Keys":             { category: "Security",       severity: "low",      description: "Cryptographic public keys",                              sampleEntities: ["ssh-rsa AAAA...", "-----BEGIN PUBLIC KEY-----"] },
  "API Keys":                { category: "Security",       severity: "critical", description: "API keys and tokens",                                    sampleEntities: ["AKIA***", "ghp_***"] },
  "Secrets and Tokens":      { category: "Security",       severity: "critical", description: "Generic secrets and auth tokens",                        sampleEntities: ["Bearer eyJ...", "token_***"] },
  "Source Code":             { category: "IP",             severity: "medium",   description: "Source code files and snippets",                          sampleEntities: ["*.py", "*.java", "*.ts"] },
  "Medical Specialties":     { category: "PHI",            severity: "medium",   description: "Medical specialty classifications",                      sampleEntities: ["Cardiology", "Neurology"] },
  "Medicinal Products":      { category: "PHI",            severity: "medium",   description: "Drug and pharmaceutical product names",                   sampleEntities: ["Metformin", "Lisinopril"] },
  "Driver Licenses":         { category: "PII",            severity: "critical", description: "Driver license numbers",                                 sampleEntities: ["DL: S***1234", "CDL: B***5678"] },
  "National IDs":            { category: "PII",            severity: "critical", description: "National identification numbers",                        sampleEntities: ["Aadhaar: ****1234", "ID: 0000000"] },
  "Securities IDs":          { category: "Financial",      severity: "medium",   description: "CUSIP, ISIN, and other securities identifiers",          sampleEntities: ["CUSIP: 037833100", "ISIN: US0378331005"] },
};

export function getDataTypeInfo(dt: string) {
  return DATA_TYPE_INFO[dt] ?? { category: "Other", severity: "medium" as Severity, description: "Sensitive data type detected", sampleEntities: [] };
}

// ── SparkTrend (used in table cells) ─────────────────────────────────────────

export function SparkTrend({ data }: { data: number[] }) {
  const total = sumSparkData(data);
  const mid = Math.floor(data.length / 2);
  const avgFirst  = data.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const avgSecond = data.slice(mid).reduce((a, b) => a + b, 0) / (data.length - mid);
  const pct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
  const isUp = pct >= 0;
  const color = "#64748b";
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--text-bright)" }}>
        {formatBytes(total)}
      </span>
    </div>
  );
}

// ── Data type palettes ───────────────────────────────────────────────────────

export const DATA_TYPE_PALETTE_BG   = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-violet-400", "bg-pink-400", "bg-cyan-400", "bg-blue-400", "bg-teal-400", "bg-lime-400"];
export const DATA_TYPE_PALETTE_TEXT = ["text-red-400", "text-orange-400", "text-amber-400", "text-yellow-400", "text-violet-400", "text-pink-400", "text-cyan-400", "text-blue-400", "text-teal-400", "text-lime-400"];