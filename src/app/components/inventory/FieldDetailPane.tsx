/**
 * FieldDetailPane — standalone component
 *
 * Drop this file in and import:
 *   import { FieldDetailPane } from "./FieldDetailPane";
 *
 * Peer deps: React, lucide-react.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table2,
  User,
  Shield,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Radar,
  ArrowRightLeft,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Database,
  Plus,
  X,
  Columns,
  RefreshCw,
  Users,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { TablePagination } from "../ui/table-pagination";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface FieldItem {
  name: string;
  dataType: string;
  table: string;
  entityTypes?: string[];
  lastQueried?: string;
}

// ── Category colour maps ──────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  PII:  { bg: "bg-blue-500/15",    text: "text-blue-300"    },
  SPII: { bg: "bg-red-500/15",     text: "text-red-300"     },
  PSI:  { bg: "bg-orange-500/15",  text: "text-orange-300"  },
  PCI:  { bg: "bg-yellow-500/15",  text: "text-yellow-300"  },
  PFI:  { bg: "bg-emerald-500/15", text: "text-emerald-300" },
  PHI:  { bg: "bg-cyan-500/15",    text: "text-cyan-300"    },
  PAI:  { bg: "bg-purple-500/15",  text: "text-purple-300"  },
  BII:  { bg: "bg-pink-500/15",    text: "text-pink-300"    },
};

/** Map an entity type string → category abbreviation */
const ENTITY_TYPE_TO_CAT: Record<string, string> = {
  "Personal Names": "PII", "Email Addresses": "PII", "Telephone Numbers": "PII",
  "Postal Addresses": "PII", "Birthdates": "PII", "Gender": "PII", "Age": "PII",
  "IP Addresses": "PII", "MAC Addresses": "PII", "Domain Names": "PII",
  "Social Security Numbers": "SPII", "Driver Licenses": "SPII", "National IDs": "SPII",
  "Passports": "SPII", "Taxpayer IDs": "SPII",
  "Ethnicity and Race": "PSI",
  "Payment Cards": "PCI",
  "Bank Account Information": "PFI", "Financial IDs": "PFI", "Currency": "PFI", "Securities IDs": "PFI",
  "Medical Records": "PHI", "Medical Diagnoses": "PHI", "Healthcare IDs": "PHI",
  "Healthcare Provider IDs": "PHI", "Biometric Data": "PHI", "Genetic Data": "PHI",
  "Passwords": "PAI", "Private Keys": "PAI", "Public Keys": "PAI",
  "Secrets and Tokens": "PAI", "API Keys": "PAI",
  "Source Code": "BII", "Company Names": "BII",
};

function findingCategory(finding: string): string {
  return ENTITY_TYPE_TO_CAT[finding] ?? "PII";
}

// ── Deterministic mock meta generator ────────────────────────────────────────

function getFieldMockMeta(field: FieldItem) {
  const seed = Array.from(field.name).reduce((a, c) => a + c.charCodeAt(0), 0);

  const platforms  = ["Snowflake", "PostgreSQL", "MySQL", "BigQuery", "Redshift"];
  const platform   = platforms[seed % platforms.length];

  const storeNames = ["snow_cwa", "prod_postgres", "analytics_bq", "data_rs", "main_mysql"];
  const storeName  = storeNames[seed % storeNames.length];

  const databases  = ["Dev", "Prod", "Analytics", "Staging", "Warehouse"];
  const database   = databases[seed % databases.length];

  const confidences = [97, 94, 89, 98, 92, 96, 91];
  const confidence  = confidences[seed % confidences.length];

  const sensitivityMap: Record<string, string> = {
    PII: "High", Financial: "High", PCI: "Critical",
    Secrets: "Critical", PHI: "High", Credentials: "Critical",
  };
  const sensitivity = sensitivityMap[field.dataType] || "Medium";
  const usageLevel  = (seed % 5) + 1;

  const mm  = String((seed % 12) + 1).padStart(2, "0");
  const dd  = String(10 + (seed % 19)).padStart(2, "0");
  const hh  = String(8 + (seed % 12)).padStart(2, "0");
  const mi  = String(seed % 60).padStart(2, "0");
  const ss  = String((seed * 3) % 60).padStart(2, "0");
  const firstSeen    = `${mm}-${dd}-2025 ${hh}:${mi}:${ss}`;
  const ddMod        = String(Math.min(28, 10 + (seed % 19) + 3)).padStart(2, "0");
  const lastModified = `${mm}-${ddMod}-2025 ${hh}:${mi}:${ss}`;

  return { platform, storeName, database, confidence, sensitivity, usageLevel, firstSeen, lastModified };
}

// ── Entity type helpers ───────────────────────────────────────────────────────

const CATEGORY_TO_ENTITY_TYPES: Record<string, string[]> = {
  PII:         ["Personal Names", "Email Addresses", "Social Security Numbers", "Telephone Numbers", "Postal Addresses", "Birthdates"],
  Financial:   ["Payment Cards", "Bank Account Information", "Financial IDs", "Currency", "Securities IDs"],
  PCI:         ["Payment Cards", "Bank Account Information", "Postal Addresses", "Personal Names"],
  Secrets:     ["Passwords", "Private Keys", "Public Keys", "Secrets and Tokens"],
  PHI:         ["Medical Records", "Medical Diagnoses", "Healthcare IDs", "Healthcare Provider IDs", "Personal Names"],
  Credentials: ["Passwords", "Secrets and Tokens", "Private Keys", "Email Addresses"],
};

function getEntityDataTypes(category: string): string[] {
  return CATEGORY_TO_ENTITY_TYPES[category] || ["Personal Names", "Email Addresses"];
}

// ── Mock column values ────────────────────────────────────────────────────────

const ENTITY_TYPE_SAMPLES: Record<string, string[]> = {
  "Email Addresses":          ["john.smith@acme.com","sarah.chen@acme.com","marcus.j@acme.com","emily.d@acme.com","d.park@acme.com","l.wang@acme.com","j.wilson@acme.com","a.rodriguez@acme.com","k.brown@acme.com","m.taylor@acme.com","NULL","r.anderson@acme.com"],
  "Personal Names":           ["John Smith","Sarah Chen","Marcus Johnson","Emily Davis","David Park","Lisa Wang","James Wilson","Ana Rodriguez","Kevin Brown","NULL","Rachel Anderson","Michael Taylor"],
  "Social Security Numbers":  ["284-39-1029","193-47-8821","847-22-5510","552-18-7743","661-33-9901","774-55-2238","338-71-4456","429-88-1167","NULL","912-05-3347","145-62-8890","503-41-7726"],
  "Telephone Numbers":        ["(555) 123-4567","(555) 234-5678","(555) 345-6789","(555) 456-7890","NULL","(555) 567-8901","(555) 678-9012","(555) 789-0123","+1-202-555-0147","+1-312-555-0198","(555) 901-2345","NULL"],
  "Postal Addresses":         ["123 Main St, Springfield IL 62701","456 Oak Ave, Portland OR 97201","789 Pine Rd, Austin TX 78701","321 Elm St, Denver CO 80201","NULL","55 Market St, San Francisco CA 94105","900 1st Ave, Seattle WA 98101","2200 Pennsylvania Ave NW, Washington DC 20037"],
  "Birthdates":               ["1988-03-15","1992-07-22","1985-11-30","1990-01-08","1995-05-17","NULL","1987-09-04","1993-12-25","1978-06-19","2001-02-14","NULL","1982-10-31"],
  "Payment Cards":            ["4532-1234-5678-9012","5425-8734-2109-6543","4111-1111-1111-1111","3782-8224-6310-005","6011-5678-9012-3456","NULL","4916-3389-1025-7744","5200-8282-1010-3456","NULL"],
  "Bank Account Information": ["****4892","****7301","****2058","****6614","NULL","****9183","****3547","****8820","****1276","NULL","****4409","****5591"],
  "Financial IDs":            ["FIN-2026-00142","FIN-2026-00287","FIN-2025-01893","FIN-2026-00451","NULL","FIN-2025-02104","FIN-2026-00033","FIN-2026-00519","$142,500","$128,000","$155,200","NULL"],
  "Taxpayer IDs":             ["92-1234567","13-9876543","06-5551234","74-3218765","NULL","27-6549871","84-1237654","51-9873216"],
  "Passwords":                ["pbkdf2:sha256:260000$aBcDeFgH...","bcrypt:$2b$12$xYz...","argon2id:$argon2id$v=19...","pbkdf2:sha256:260000$QrStUv...","scrypt:N=32768:r=8:p=1$...","NULL","bcrypt:$2b$10$kLm...","argon2id:$argon2id$v=19$m=65536..."],
  "Secrets and Tokens":       ["sk_live_4eC39HqLyjWDarj...","ghp_xxxxxxxxxxxxxxxxxxxx...","xoxb-123456789012-abcde...","NULL","AKIAIOSFODNN7EXAMPLE...","eyJhbGciOiJIUzI1NiIs...","rk_test_51HG8vX2eZvKYl..."],
  "Medical Records":          ["MRN-2026-004821","MRN-2026-003917","MRN-2025-012844","NULL","MRN-2026-001055","MRN-2024-028163","MRN-2026-006392","MRN-2025-019475","NULL","MRN-2026-002718"],
  "Medical Diagnoses":        ["ICD-10: E11.9 (Type 2 diabetes)","ICD-10: I10 (Hypertension)","ICD-10: J06.9 (Upper resp. infection)","NULL","ICD-10: M54.5 (Low back pain)","ICD-10: F32.1 (Major depressive)","ICD-10: K21.0 (GERD)","NULL"],
  "Healthcare IDs":           ["NPI-1234567890","NPI-9876543210","DEA-AB1234567","NULL","NPI-5551234567","NPI-8889876543","UPIN-A12345","NULL","NPI-3216549870"],
  "Healthcare Provider IDs":  ["NPI-1234567890","NPI-9876543210","DEA-AB1234567","NULL","NPI-5551234567","NPI-8889876543"],
  "IP Addresses":             ["192.168.1.42","10.0.0.115","172.16.254.1","NULL","203.0.113.50","198.51.100.23","10.10.5.200","NULL","192.168.10.88","172.31.0.1"],
  "Domain Names":             ["api.acme.com","internal.corp.net","staging.acme.io","NULL","cdn.partner.io","vault.acme.com","db.prod.internal","NULL"],
  "Driver Licenses":          ["DL-C1234567","DL-S9876543","DL-M5551234","NULL","DL-E7654321","DL-D3218765","DL-L1239876","NULL"],
  "National IDs":             ["NID-123456789","NID-987654321","NID-555123456","NULL","NID-765432198","NID-321876549","NULL"],
  "Passports":                ["P-12345678","P-98765432","P-55512345","NULL","P-76543219","P-32187654","P-99001234","NULL"],
  "Gender":                   ["Male","Female","Non-binary","Male","Female","NULL","Male","Female","Prefer not to say","NULL","Male","Female"],
  "Ethnicity and Race":       ["Asian","White","Hispanic/Latino","Black/African American","NULL","Asian","White","Two or More Races","NULL","American Indian/Alaska Native","White","Hispanic/Latino"],
};

function generateMockColumnValues(
  fieldName: string,
  _dataType: string,
  entityTypes?: string[],
): { value: string; isSensitive: boolean }[] {
  const values: { value: string; isSensitive: boolean }[] = [];
  const primaryType = entityTypes?.[0] || "";
  let raw = ENTITY_TYPE_SAMPLES[primaryType];

  if (!raw) {
    const col = fieldName.split(".").pop()?.toLowerCase() || "";
    const colFallbacks: Record<string, string> = {
      email: "Email Addresses", recovery_email: "Email Addresses",
      full_name: "Personal Names", cardholder_name: "Personal Names",
      ssn: "Social Security Numbers", tax_id: "Taxpayer IDs",
      phone_number: "Telephone Numbers", mobile: "Telephone Numbers",
      date_of_birth: "Birthdates",
      postal_address: "Postal Addresses", billing_address: "Postal Addresses",
      credit_card_number: "Payment Cards", cvv: "Payment Cards",
      salary: "Financial IDs", amount: "Financial IDs",
      bank_account: "Bank Account Information",
      password_hash: "Passwords", security_question: "Secrets and Tokens",
      ip_address: "IP Addresses", source_ip: "IP Addresses",
      gender: "Gender", ethnicity: "Ethnicity and Race",
    };
    const matchedKey = Object.keys(colFallbacks).find((k) => col.includes(k));
    if (matchedKey) raw = ENTITY_TYPE_SAMPLES[colFallbacks[matchedKey]];
  }

  if (!raw) raw = ["value_001","value_002","value_003","value_004","value_005","NULL","value_007","value_008"];

  for (const v of raw) values.push({ value: v, isSensitive: v !== "NULL" });
  while (values.length < 20) {
    const src = raw[values.length % raw.length];
    values.push({ value: src, isSensitive: src !== "NULL" });
  }
  return values;
}

// ── Access history generator ──────────────────────────────────────────────────

interface ColumnIdentity {
  username: string;
  name: string;
  department: string;
  idpStatus: string;
  role: string;
  identityType: string;
}

function generateColumnIdentities(tableName: string, colName: string): ColumnIdentity[] {
  const seed = Array.from(tableName + colName).reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool: ColumnIdentity[] = [
    { username: "admin",          name: "-",            department: "-",          idpStatus: "Active",   role: "ALL PRIVILEGES",      identityType: "Internal user"   },
    { username: "sarah.wu",       name: "Sarah Wu",     department: "HR",         idpStatus: "Active",   role: "ALL PRIVILEGES",      identityType: "Internal user"   },
    { username: "marcus.j",       name: "Marcus John",  department: "Engineer",   idpStatus: "Active",   role: "ALL PRIVILEGES",      identityType: "Internal user"   },
    { username: "alice.chen",     name: "Alice Chen",   department: "HR",         idpStatus: "Active",   role: "ALL PRIVILEGES",      identityType: "Internal user"   },
    { username: "john.smith",     name: "John Smith",   department: "Finance",    idpStatus: "Suspended",role: "SELECT, UPDATE",      identityType: "Internal user"   },
    { username: "reporting-svc",  name: "-",            department: "-",          idpStatus: "Active",   role: "SELECT",              identityType: "Service Account" },
    { username: "etl-pipeline",   name: "-",            department: "-",          idpStatus: "Active",   role: "SELECT, INSERT",      identityType: "Service Account" },
    { username: "app-backend",    name: "-",            department: "-",          idpStatus: "Active",   role: "SELECT",              identityType: "Service Account" },
    { username: "sarah.chen",     name: "Sarah Chen",   department: "Engineering",idpStatus: "Active",   role: "SELECT",              identityType: "Internal user"   },
    { username: "data-team",      name: "-",            department: "Data",       idpStatus: "Active",   role: "SELECT, UPDATE, DELETE", identityType: "Group"        },
  ];
  const count = 4 + (seed % 4);
  return Array.from({ length: count }, (_, i) => pool[(seed + i * 3) % pool.length]);
}

function generateFieldAccessHistory(
  tableName: string,
  colName: string,
): { query: string; user: string; date: string }[] {
  const seed = Array.from(tableName + colName).reduce((a, c) => a + c.charCodeAt(0), 0);
  const queries = [
    `SELECT ${colName} FROM ${tableName} WHERE id = ?`,
    `SELECT * FROM ${tableName} LIMIT 100`,
    `UPDATE ${tableName} SET ${colName} = ?`,
    `COPY ${tableName}(${colName}) TO STDOUT`,
    `SELECT COUNT(*) FROM ${tableName}`,
    `SELECT DISTINCT ${colName} FROM ${tableName}`,
    `INSERT INTO ${tableName} (${colName}) VALUES (?)`,
    `DELETE FROM ${tableName} WHERE ${colName} IS NULL`,
    `SELECT ${colName}, COUNT(*) FROM ${tableName} GROUP BY 1`,
    `SELECT MAX(${colName}), MIN(${colName}) FROM ${tableName}`,
    `CREATE INDEX ON ${tableName}(${colName})`,
    `SELECT ${colName} FROM ${tableName} WHERE ${colName} IS NOT NULL`,
  ];
  const users = ["app-backend","analyst-bot","migration-svc","etl-pipeline","monitoring","data-team","admin","reporting-svc","john.smith","sarah.chen"];
  const dates = ["Feb 23","Feb 22","Feb 21","Feb 20","Feb 19","Feb 18","Feb 17","Feb 16","Feb 15","Feb 14","Feb 13","Feb 12"];
  const count = 8 + (seed % 5);
  return Array.from({ length: count }, (_, i) => ({
    query: queries[(seed + i) % queries.length],
    user:  users[(seed + i * 3) % users.length],
    date:  dates[i % dates.length],
  }));
}

// ── Scan history (mixed at-rest + in-motion) ──────────────────────────────────

interface FieldScanEvent {
  id: string;
  type: "at-rest" | "in-motion";
  timestamp: string;
  // at-rest:
  scanKind?: "Discovery Scan" | "Ongoing Scan";
  // in-motion:
  actor?: string;
  activity?: string;
  destination?: string;
  findings: string[];
  dataCategory: string;
}

function generateFieldScanHistory(
  fieldName: string,
  dataCategory: string,
  entityTypes?: string[],
): FieldScanEvent[] {
  const seed  = fieldName.length;
  const types = entityTypes && entityTypes.length > 0 ? entityTypes : getEntityDataTypes(dataCategory);

  const atRest: FieldScanEvent[] = [
    { id: `${fieldName}-fscan-1`, type: "at-rest", scanKind: "Ongoing Scan",   timestamp: "Feb 24, 2026 02:30 AM", findings: types.slice(0, Math.min(3, types.length)), dataCategory },
    { id: `${fieldName}-fscan-2`, type: "at-rest", scanKind: "Ongoing Scan",   timestamp: "Feb 17, 2026 02:30 AM", findings: types.slice(0, Math.min(4, types.length)), dataCategory },
    { id: `${fieldName}-fscan-3`, type: "at-rest", scanKind: "Ongoing Scan",   timestamp: "Feb 10, 2026 02:30 AM", findings: types.slice(0, Math.min(2, types.length)), dataCategory },
    { id: `${fieldName}-fscan-4`, type: "at-rest", scanKind: "Discovery Scan", timestamp: "Jan 15, 2026 12:00 PM", findings: types.slice(0, Math.min(2, types.length)), dataCategory },
    { id: `${fieldName}-fscan-5`, type: "at-rest", scanKind: "Ongoing Scan",   timestamp: "Dec 20, 2025 02:30 AM", findings: types.slice(0, Math.min(3, types.length)), dataCategory },
  ];

  const inMotion: FieldScanEvent[] = [
    { id: `${fieldName}-fmot-1`, type: "in-motion", timestamp: "Feb 22, 2026 11:14 AM", actor: "sarah.chen",    activity: "Exported via SELECT query",          destination: "External endpoint → api.partner.io/ingest",    findings: types.slice(0, Math.min(3, types.length)), dataCategory },
    { id: `${fieldName}-fmot-2`, type: "in-motion", timestamp: "Feb 14, 2026 04:37 PM", actor: "etl-pipeline",  activity: "Bulk column download via COPY",       destination: "S3 → ext-backup-prod/columns/",                findings: types.slice(0, Math.min(2, types.length)), dataCategory },
    { id: `${fieldName}-fmot-3`, type: "in-motion", timestamp: "Jan 28, 2026 09:02 AM", actor: "marcus.j",      activity: "Downloaded via API",                  destination: "Local workstation → /Users/marcus.j/exports/", findings: types.slice(0, Math.min(2, types.length)), dataCategory },
    { id: `${fieldName}-fmot-4`, type: "in-motion", timestamp: "Jan 10, 2026 02:55 PM", actor: "reporting-svc", activity: "Streamed to analytics platform",       destination: "Looker → acme.looker.com/dashboards",          findings: types.slice(0, Math.min(3, types.length)), dataCategory },
    { id: `${fieldName}-fmot-5`, type: "in-motion", timestamp: "Dec 15, 2025 07:20 AM", actor: "d.park",        activity: "Shared externally via query export",  destination: "External → partner-reports@acme.co",           findings: types.slice(0, Math.min(2, types.length)), dataCategory },
  ];

  const atRestCount   = seed < 12 ? 2 : seed < 18 ? 3 : 5;
  const inMotionCount = seed < 10 ? 2 : seed < 16 ? 3 : 5;

  return [
    ...atRest.slice(0, atRestCount),
    ...inMotion.slice(0, inMotionCount),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── PaginationBar ─────────────────────────────────────────────────────────────

function PaginationBar({
  page, totalPages, pageSize, totalItems, onPageChange, itemLabel = "items",
}: {
  page: number; totalPages: number; pageSize: number;
  totalItems: number; onPageChange: (p: number) => void; itemLabel?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-raised/40 border border-border rounded-lg mt-2">
      <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
        {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}
          className="p-1 rounded text-muted-foreground hover:text-text-bright hover:bg-nav-active disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer">
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} onClick={() => onPageChange(i)}
            className={`min-w-[22px] h-[22px] rounded flex items-center justify-center transition-colors cursor-pointer ${
              i === page ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-text-bright hover:bg-nav-active"
            }`}
            style={{ fontSize: "10px", fontWeight: i === page ? 600 : 400 }}>
            {i + 1}
          </button>
        ))}
        <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
          className="p-1 rounded text-muted-foreground hover:text-text-bright hover:bg-nav-active disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer">
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function InfoBarSep() {
  return <span className="text-border/50 select-none" style={{ fontSize: "12px", margin: "0 2px" }}>—</span>;
}

function MetaRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{label}</span>
      <span className={valueClass ?? "text-foreground/80"} style={{ fontSize: "11px" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, timestamp }: { icon: typeof Table2; label: string; timestamp?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-muted-foreground flex items-center gap-1.5"
        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
        <Icon size={11} />{label}
      </div>
      {timestamp && <span className="text-muted-foreground/60" style={{ fontSize: "10px" }}>{timestamp}</span>}
    </div>
  );
}

/** Collapsible Platform sub-group — collapsed by default */
function PlatformGroup({ rows }: { rows: { label: string; value: string }[] }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {rows.map((r) => <MetaRow key={r.label} label={r.label} value={r.value} />)}
    </>
  );
}

// ── Field scan card ──────────────────────────────────────────────────────────

function FieldScanCard({
  event, isExpanded, onToggle, fieldName, dataType, isFirst, isLast,
}: {
  event: FieldScanEvent; isExpanded: boolean; onToggle: () => void;
  fieldName: string; dataType: string; isFirst: boolean; isLast: boolean;
}) {
  const isMotion = event.type === "in-motion";
  const columnValues = useMemo(
    () => isExpanded ? generateMockColumnValues(fieldName, dataType, event.findings) : [],
    [isExpanded, fieldName, dataType, event.findings],
  );
  const colName = fieldName.includes(".") ? fieldName.split(".").pop()! : fieldName;

  const dotStyles = isMotion
    ? "bg-warning/20 border-warning/50"
    : "bg-primary/20 border-primary/50";
  const iconCls = isMotion ? "text-warning/70" : "text-primary/70";

  return (
    <div className="relative flex gap-0">
      {/* Timeline rail */}
      <div className="flex flex-col items-center" style={{ width: "28px", minWidth: "28px" }}>
        <div className={`w-px flex-none ${isFirst ? "bg-transparent" : "bg-border"}`} style={{ height: "8px" }} />
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none ${dotStyles}`}>
          {isMotion ? (
            <ArrowRightLeft size={8} className={iconCls} />
          ) : (
            <Radar size={8} className={iconCls} />
          )}
        </div>
        <div className={`w-px flex-1 min-h-[8px] ${isLast ? "bg-transparent" : "bg-border"}`} />
      </div>

      {/* Node content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="group rounded-md px-2 py-1.5 -mx-2 -my-1.5 hover:bg-surface-raised border border-transparent hover:border-border transition-all">
          <details open={isExpanded} className="group/details">
            <summary className="list-none cursor-pointer" onClick={(e) => { e.preventDefault(); onToggle(); }}>
              <div className="flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                      isMotion
                        ? "bg-warning/10 text-warning border border-warning/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`} style={{ fontWeight: 600 }}>
                      {isMotion ? "In Motion" : "At Rest"}
                    </span>
                    <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>
                      {event.timestamp}
                    </span>
                  </div>

                  <div className="text-foreground/80 mt-0.5 truncate" style={{ fontSize: "11px" }}>
                    {isMotion
                      ? <><span className="text-text-bright">{event.actor}</span>{" — "}{event.activity}</>
                      : <span>{event.scanKind}</span>}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.findings.map((f) => (
                      <span key={f}
                        className="inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap"
                        style={{ fontSize: "11px" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`shrink-0 text-muted-foreground transition-transform ml-0.5 group-hover:text-foreground/70`}>
                  <ChevronRight size={12} className="group-open/details:rotate-90 transition-transform duration-150" />
                </div>
              </div>
            </summary>

            {/* Expanded detail rows */}
            <div className="mt-2 ml-0.5 space-y-0.5 pb-1">
              {isMotion && (
                <>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "76px" }}>User</span>
                    <span className="text-foreground/70">{event.actor ?? "—"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "76px" }}>Activity</span>
                    <span className="text-foreground/70">{event.activity ?? "—"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "76px" }}>Destination</span>
                    <span className="text-foreground/70">{event.destination ?? "—"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Timestamp</span>
                    <span className="text-foreground/70">{event.timestamp}</span>
                  </div>
                </>
              )}

              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={11} className="text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                    Sample column values · Sensitive matches highlighted
                  </span>
                </div>
                <div className="bg-surface-raised/60 border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[36px_1fr_auto] px-0 py-1.5 border-b border-border/50 text-muted-foreground/60"
                    style={{ fontSize: "10px", fontWeight: 500 }}>
                    <span className="text-right pr-2">#</span>
                    <span className="pl-3">{colName}</span>
                    <span className="pr-3">Match</span>
                  </div>
                  <div className="overflow-auto max-h-[260px]">
                    {columnValues.map((row, idx) => (
                      <div key={idx}
                        className={`grid grid-cols-[36px_1fr_auto] px-0 py-1 ${row.isSensitive ? "bg-destructive/[0.06]" : ""}`}
                        style={{ fontSize: "11px" }}>
                        <span className="text-right pr-2 text-muted-foreground/50 font-mono select-none border-r border-border/50"
                          style={{ fontSize: "10px" }}>{idx + 1}</span>
                        <span className="pl-3 font-mono">
                          {row.isSensitive
                            ? <span className="bg-destructive/20 text-destructive rounded-sm px-0.5">{row.value}</span>
                            : <span className="text-muted-foreground/50 italic">{row.value}</span>}
                        </span>
                        <span className="pr-3 text-center">
                          {row.isSensitive && <span className="text-destructive"><Shield size={10} /></span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ── Exported FieldDetailPane ──────────────────────────────────────────────────

// ── Column panel vertical tabs ────────────────────────────────────────────────


interface FieldDetailProps {
  field: FieldItem;
  onBack?: () => void;
  onClose?: () => void;
  onSelectIdentity?: (identity: { username: string; role: string; identityType: string }) => void;
}

export function FieldDetailPane({ field, onBack, onClose, onSelectIdentity }: FieldDetailProps) {
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleEpoch, setSampleEpoch] = useState(0);
  const meta = useMemo(() => getFieldMockMeta(field), [field]);

  const nameParts  = field.name.split(".");
  const colName    = nameParts[nameParts.length - 1];
  const tableName  = nameParts.length >= 2 ? nameParts[nameParts.length - 2] : "unknown";
  const schemaName = "public";
  const pathStr    = `${meta.database.toUpperCase()}.${schemaName.toUpperCase()}.${tableName.toUpperCase()}`;

  // Primary entity type name & its category abbreviation
  const entityTypeName =
    field.entityTypes?.[0] ?? getEntityDataTypes(field.dataType)[0] ?? field.dataType;
  const entityCat  = ENTITY_TYPE_TO_CAT[entityTypeName] ?? field.dataType;
  const catColors  = CAT_COLORS[entityCat] ?? CAT_COLORS["PII"];

  // Column values for sensitive-record count
  const columnValues = useMemo(
    () => generateMockColumnValues(field.name, field.dataType, field.entityTypes),
    [field.name, field.dataType, field.entityTypes],
  );

  // Access history — all records, no pagination
  const accessHistory = useMemo(() => generateFieldAccessHistory(tableName, colName), [tableName, colName]);

  // Column identities for Access tab
  const columnIdentities = useMemo(() => generateColumnIdentities(tableName, colName), [tableName, colName]);
  const [ACCESS_PAGE_SIZE, setAccessPageSize] = useState(10);
  const [accessPage, setAccessPage] = useState(1);
  const [accessSearch, setAccessSearch] = useState("");
  const [accessSearchExpanded, setAccessSearchExpanded] = useState(false);
  const [accessSortOpen, setAccessSortOpen] = useState(false);
  const [accessSortKey, setAccessSortKey] = useState<"username" | "name" | "department" | "idpStatus" | "role" | null>(null);
  const [accessSortDir, setAccessSortDir] = useState<"asc" | "desc">("asc");
  const accessSortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessSortOpen) return;
    function h(e: MouseEvent) {
      if (accessSortRef.current && !accessSortRef.current.contains(e.target as Node)) setAccessSortOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [accessSortOpen]);

  const filteredIdentities = useMemo(() => {
    const q = accessSearch.trim().toLowerCase();
    let list = q.length >= 1
      ? columnIdentities.filter((id) =>
          id.username.toLowerCase().includes(q) ||
          id.name.toLowerCase().includes(q) ||
          id.department.toLowerCase().includes(q) ||
          id.idpStatus.toLowerCase().includes(q)
        )
      : columnIdentities;
    if (accessSortKey) {
      list = [...list].sort((a, b) => {
        const va = a[accessSortKey].toLowerCase();
        const vb = b[accessSortKey].toLowerCase();
        return accessSortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return list;
  }, [columnIdentities, accessSearch, accessSortKey, accessSortDir]);

  // Scan history
  const scanHistory = useMemo(
    () => generateFieldScanHistory(field.name, field.dataType, field.entityTypes),
    [field.name, field.dataType, field.entityTypes],
  );


  // Sensitivity colour
  const sensitivityColors: Record<string, string> = {
    Critical: "text-red-400", High: "text-orange-400",
    Medium: "text-yellow-400", Low: "text-green-400",
  };
  const sensitivityColor = sensitivityColors[meta.sensitivity] ?? "text-foreground/80";

  // Platform group rows
  const platformRows = [
    { label: "Platform",          value: meta.platform  },
    { label: "Data Store",        value: meta.storeName },
    { label: "Database",          value: meta.database  },
    { label: "Schema",            value: schemaName     },
    { label: "Table",             value: tableName      },
    { label: "Sensitive Records", value: `${columnValues.filter((v) => v.isSensitive).length} sensitive` },
  ];

  // Sample modal values — regenerated each time epoch changes
  const modalSamples = useMemo(() => {
    const base = generateMockColumnValues(field.name, field.dataType, field.entityTypes);
    // Shuffle deterministically based on epoch
    if (sampleEpoch === 0) return base.slice(0, 10);
    const offset = (sampleEpoch * 3) % base.length;
    return [...base.slice(offset), ...base.slice(0, offset)].slice(0, 10);
  }, [field.name, field.dataType, field.entityTypes, sampleEpoch]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-start gap-2 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-nav-active transition-colors mt-0.5"
                aria-label="Back"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div className="shrink-0 flex items-center justify-center mt-0.5 text-muted-foreground">
              <Columns size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-text-bright truncate" style={{ fontSize: "15px", fontWeight: 600 }}>
                {colName}
              </h3>
              <span className="text-muted-foreground truncate" style={{ fontSize: "12px" }}>
                {pathStr}
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-nav-active transition-colors"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Info bar */}
        <div className="flex flex-wrap items-center gap-y-1.5" style={{ fontSize: "11px", columnGap: "6px" }}>
          <span className="text-muted-foreground">Data Store:</span>
          <span className="text-foreground/80">{meta.storeName}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground/70"
            style={{ fontSize: "10px" }}>
            <Database size={9} />{meta.platform}
          </span>
          <InfoBarSep />
          <span className="text-muted-foreground">Confidence:</span>
          <span className="text-foreground/80">{meta.confidence}%</span>
          <InfoBarSep />
          <span className="text-muted-foreground">Sensitivity</span>
          <span className={sensitivityColor} style={{ fontWeight: 600 }}>{meta.sensitivity}</span>
          <InfoBarSep />
          <span className="text-muted-foreground">Usage</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`w-3.5 h-2 rounded-sm ${i < meta.usageLevel ? "bg-primary" : "bg-border/40"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 py-4 space-y-5">
          {/* Column Information */}
          <div>
            <SectionHeader icon={Table2} label="Column Information" timestamp="Updated Feb 24, 2026 02:30 AM" />
            <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Data Type</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded bg-background border border-border text-foreground/80"
                    style={{ fontSize: "11px" }}
                  >
                    {entityTypeName}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-white hover:opacity-90 transition-opacity"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                    onClick={() => { setSampleEpoch(0); setSampleModalOpen(true); }}
                  >
                    Get sample
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Status</span>
                <span className="text-foreground" style={{ fontSize: "11px" }}>Active</span>
              </div>
              <MetaRow label="First Seen On"  value={meta.firstSeen}    />
              <MetaRow label="Last Modified"  value={meta.lastModified} />
              <PlatformGroup rows={platformRows} />
            </div>
          </div>

          {/* Access */}
          <div>
            {/* Access header row with Sort by + Search controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-muted-foreground flex items-center gap-1.5"
                style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
                <Users size={11} />{`Access (${columnIdentities.length})`}
              </div>
              <div className="flex items-center gap-2">
                {/* Sort by dropdown */}
                <div className="relative" ref={accessSortRef}>
                  <button
                    type="button"
                    onClick={() => setAccessSortOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised border border-border text-muted-foreground hover:text-text-bright transition-colors"
                    style={{ fontSize: "11px" }}
                  >
                    {accessSortKey ? (
                      <>
                        <span className="text-muted-foreground">Sort:</span>
                        <span className="text-text-bright capitalize" style={{ fontWeight: 500 }}>{accessSortKey}</span>
                        {accessSortDir === "asc" ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />}
                      </>
                    ) : (
                      <>Sort by <ChevronDown size={10} className="opacity-60" /></>
                    )}
                  </button>
                  {accessSortOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-surface-raised border border-border rounded-lg shadow-lg py-1 overflow-hidden">
                      {([
                        { key: "username",  label: "Username"  },
                        { key: "name",      label: "Name"      },
                        { key: "department",label: "Department"},
                        { key: "idpStatus", label: "IDP Status"},
                        { key: "role",      label: "Role"      },
                      ] as const).map(({ key, label }) => {
                        const isActive = accessSortKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (isActive) {
                                setAccessSortDir((d) => d === "asc" ? "desc" : "asc");
                              } else {
                                setAccessSortKey(key);
                                setAccessSortDir("asc");
                                setAccessSortOpen(false);
                              }
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                              isActive ? "bg-primary/10 text-text-bright" : "text-foreground hover:bg-foreground/[0.06]"
                            }`}
                            style={{ fontSize: "11px" }}
                          >
                            <span>{label}</span>
                            {isActive && (
                              <span className="flex items-center gap-0.5 text-primary" style={{ fontSize: "10px", fontWeight: 600 }}>
                                {accessSortDir === "asc" ? <><ArrowUp size={9} />ASC</> : <><ArrowDown size={9} />DESC</>}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Search */}
                {!accessSearchExpanded && !accessSearch ? (
                  <button
                    type="button"
                    onClick={() => setAccessSearchExpanded(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised border border-border text-muted-foreground hover:text-text-bright transition-colors"
                    style={{ fontSize: "11px" }}
                  >
                    <Search size={11} /> Search
                  </button>
                ) : (
                  <div className="relative">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      value={accessSearch}
                      onChange={(e) => { setAccessSearch(e.target.value); setAccessPage(1); }}
                      onKeyDown={(e) => { if (e.key === "Escape") { setAccessSearch(""); setAccessSearchExpanded(false); } }}
                      onBlur={() => { if (!accessSearch) setAccessSearchExpanded(false); }}
                      placeholder="Search..."
                      className="pl-6 pr-6 py-1 rounded-md bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      style={{ fontSize: "11px", width: "140px" }}
                    />
                    {accessSearch && (
                      <button type="button" onClick={() => { setAccessSearch(""); setAccessPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-bright">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid items-center px-3 py-2 border-b border-border bg-background/40"
                style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                {(["Username", "Name", "Department", "IDP status", "Role / Privilege"] as const).map((col) => (
                  <span key={col} className="text-muted-foreground truncate" style={{ fontSize: "11px", fontWeight: 600 }}>
                    {col}
                  </span>
                ))}
              </div>
              {/* Table rows */}
              <div className="divide-y divide-border">
                {filteredIdentities.slice((accessPage - 1) * ACCESS_PAGE_SIZE, accessPage * ACCESS_PAGE_SIZE).map((id, i) => (
                  <div key={i} className="grid items-center px-3 py-2"
                    style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                    <button
                      type="button"
                      className="text-primary truncate text-left hover:underline"
                      style={{ fontSize: "11px" }}
                      onClick={() => onSelectIdentity?.(id)}
                    >
                      {id.username}
                    </button>
                    <span className="text-foreground/80 truncate" style={{ fontSize: "11px" }}>{id.name}</span>
                    <span className="text-foreground/80 truncate" style={{ fontSize: "11px" }}>{id.department}</span>
                    <span className="text-foreground/80 truncate" style={{ fontSize: "11px" }}>{id.idpStatus}</span>
                    <span className="text-foreground/80 truncate" style={{ fontSize: "11px" }}>{id.role}</span>
                  </div>
                ))}
                {filteredIdentities.length === 0 && (
                  <div className="px-3 py-4 text-muted-foreground/60 text-center" style={{ fontSize: "11px" }}>
                    No results{accessSearch ? ` for "${accessSearch}"` : ""}
                  </div>
                )}
              </div>
              <TablePagination
                currentPage={accessPage}
                totalRows={filteredIdentities.length}
                pageSize={ACCESS_PAGE_SIZE}
                onPageChange={setAccessPage}
                onPageSizeChange={(n) => { setAccessPageSize(n); setAccessPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={sampleModalOpen} onOpenChange={setSampleModalOpen}>
        <DialogContent
          className="p-0 overflow-hidden gap-0 max-w-md border-border"
          style={{ background: "var(--color-background)" }}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <DialogTitle
              className="text-foreground m-0 p-0 leading-none"
              style={{ fontSize: "14px", fontWeight: 700 }}
            >
              Sample Data
            </DialogTitle>
            <button
              onClick={() => setSampleModalOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-surface-raised flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: "420px" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className="px-5 py-3 text-left text-muted-foreground"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                  >
                    {colName.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modalSamples.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-raised/40 transition-colors">
                    <td
                      className="px-5 py-3 font-mono text-foreground/80"
                      style={{ fontSize: "13px" }}
                    >
                      {row.value === "NULL" ? (
                        <span className="text-muted-foreground/50 italic not-italic">NULL</span>
                      ) : (
                        row.value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <button
              onClick={() => setSampleModalOpen(false)}
              className="px-5 py-2 rounded border border-border text-foreground/70 hover:bg-surface-raised hover:text-foreground transition-colors"
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              Close
            </button>
            <button
              onClick={() => setSampleEpoch((e) => e + 1)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded text-white hover:opacity-90 transition-opacity"
              style={{ fontSize: "12px", fontWeight: 500, background: "var(--color-primary)" }}
            >
              <RefreshCw size={13} />
              Get New Samples
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}