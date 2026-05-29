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
  Clock,
  User,
  Shield,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Radar,
  ArrowRightLeft,
  Database,
  Plus,
  X,
} from "lucide-react";

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
  PII:  { bg: "bg-blue-500/15",   text: "text-blue-300"   },
  SPII: { bg: "bg-red-500/15",    text: "text-red-300"    },
  PSI:  { bg: "bg-orange-500/15", text: "text-orange-300" },
  PCI:  { bg: "bg-yellow-500/15", text: "text-yellow-300" },
  PFI:  { bg: "bg-green-500/15",  text: "text-green-300"  },
  PHI:  { bg: "bg-purple-500/15", text: "text-purple-300" },
  PAI:  { bg: "bg-pink-500/15",   text: "text-pink-300"   },
  BII:  { bg: "bg-slate-500/15",  text: "text-slate-300"  },
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
      <div className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
        <Icon size={11} />{label}
      </div>
      {timestamp && <span className="text-muted-foreground/60" style={{ fontSize: "10px" }}>{timestamp}</span>}
    </div>
  );
}

/** Collapsible Platform sub-group — collapsed by default */
function PlatformGroup({ rows }: { rows: { label: string; value: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1.5 cursor-pointer group">
        <span className="text-muted-foreground/70 flex items-center gap-1" style={{ fontSize: "11px" }}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          Platform
        </span>
        <span className="text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors"
          style={{ fontSize: "10px" }}>
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && rows.map((r) => <MetaRow key={r.label} label={r.label} value={r.value} />)}
    </>
  );
}

// ── Field scan card ───────────────────────────────────────────────────────────

function FieldScanCard({
  event, isExpanded, onToggle, fieldName, dataType,
}: {
  event: FieldScanEvent; isExpanded: boolean; onToggle: () => void;
  fieldName: string; dataType: string;
}) {
  const isMotion = event.type === "in-motion";
  const columnValues = useMemo(
    () => isExpanded ? generateMockColumnValues(fieldName, dataType, event.findings) : [],
    [isExpanded, fieldName, dataType, event.findings],
  );
  const colName = fieldName.includes(".") ? fieldName.split(".").pop()! : fieldName;

  return (
    <div className={`rounded-lg border transition-colors ${
      isExpanded
        ? "bg-surface-raised border-primary/30"
        : "bg-surface-raised/60 border-border hover:border-foreground/20 hover:bg-surface-raised"
    }`}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer group">
        <div className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
          isMotion ? "bg-warning/10" : "bg-primary/10"
        }`}>
          {isMotion
            ? <ArrowRightLeft size={13} className="text-warning" />
            : <Radar size={13} className="text-primary" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
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

        <div className={`shrink-0 text-muted-foreground transition-transform ml-0.5 ${
          isExpanded ? "rotate-180" : ""
        } group-hover:text-foreground/70`}>
          <ChevronDown size={13} />
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          {isMotion && (
            <div className="mb-3 space-y-0.5 mt-2">
              {([["User", event.actor ?? "—"], ["Activity", event.activity ?? "—"],
                 ["Destination", event.destination ?? "—"], ["Timestamp", event.timestamp]] as const).map(([label, value]) => (
                <div key={label} className="flex gap-2" style={{ fontSize: "10px" }}>
                  <span className="text-muted-foreground shrink-0" style={{ minWidth: "76px" }}>{label}</span>
                  <span className="text-foreground/70">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2 mt-2">
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
      )}
    </div>
  );
}

// ── Exported FieldDetailPane ──────────────────────────────────────────────────

const ACCESS_PAGE_SIZE = 5;
const SCAN_PAGE_SIZE   = 4;

interface FieldDetailProps { field: FieldItem }

export function FieldDetailPane({ field }: FieldDetailProps) {
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

  // Access history with pagination
  const accessHistory   = useMemo(() => generateFieldAccessHistory(tableName, colName), [tableName, colName]);
  const [accessPage, setAccessPage] = useState(0);
  const accessTotalPages = Math.ceil(accessHistory.length / ACCESS_PAGE_SIZE);
  const accessPageItems  = accessHistory.slice(accessPage * ACCESS_PAGE_SIZE, (accessPage + 1) * ACCESS_PAGE_SIZE);

  // Scan history
  const scanHistory = useMemo(
    () => generateFieldScanHistory(field.name, field.dataType, field.entityTypes),
    [field.name, field.dataType, field.entityTypes],
  );

  // ── Scan filters ────────────────────────────────────────────────────────────
  const [scanTypeFilter, setScanTypeFilter] = useState<string[]>([]);
  const [scanCatFilter,  setScanCatFilter]  = useState<string[]>([]);
  const hasActiveScanType = scanTypeFilter.length > 0;
  const hasActiveScanCat  = scanCatFilter.length  > 0;

  const [scanDropdown, setScanDropdown] = useState<"scan-type" | "data-type" | null>(null);
  const [pendingScanType, setPendingScanType] = useState<string[]>([]);
  const [pendingScanCat,  setPendingScanCat]  = useState<string[]>([]);
  const scanDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scanDropdown) return;
    const handler = (e: MouseEvent) => {
      if (scanDropdownRef.current && !scanDropdownRef.current.contains(e.target as Node)) {
        setScanDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [scanDropdown]);

  const openScanTypePicker = useCallback(() => {
    setPendingScanType([...scanTypeFilter]);
    setScanDropdown((prev) => (prev === "scan-type" ? null : "scan-type"));
  }, [scanTypeFilter]);

  const openScanCatPicker = useCallback(() => {
    setPendingScanCat([...scanCatFilter]);
    setScanDropdown((prev) => (prev === "data-type" ? null : "data-type"));
  }, [scanCatFilter]);

  const applyScanType = useCallback(() => { setScanTypeFilter(pendingScanType); setScanDropdown(null); }, [pendingScanType]);
  const applyScanCat  = useCallback(() => { setScanCatFilter(pendingScanCat);   setScanDropdown(null); }, [pendingScanCat]);

  const togglePendingScanType = useCallback((v: string) =>
    setPendingScanType((p) => p.includes(v) ? p.filter((t) => t !== v) : [...p, v]), []);
  const togglePendingScanCat  = useCallback((v: string) =>
    setPendingScanCat((p)  => p.includes(v) ? p.filter((t) => t !== v) : [...p, v]), []);

  const scanTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { "at-rest": 0, "in-motion": 0 };
    for (const ev of scanHistory) counts[ev.type] = (counts[ev.type] || 0) + 1;
    return counts;
  }, [scanHistory]);

  const scanCatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of scanHistory) {
      const seen = new Set<string>();
      for (const f of ev.findings) {
        const cat = findingCategory(f);
        if (!seen.has(cat)) { seen.add(cat); counts[cat] = (counts[cat] || 0) + 1; }
      }
    }
    return counts;
  }, [scanHistory]);

  const scanAvailableCats = useMemo(() => Object.keys(scanCatCounts), [scanCatCounts]);

  const filteredScans = useMemo(() =>
    scanHistory.filter((ev) => {
      if (hasActiveScanType && !scanTypeFilter.includes(ev.type)) return false;
      if (hasActiveScanCat  && !ev.findings.some((f) => scanCatFilter.includes(findingCategory(f)))) return false;
      return true;
    }),
    [scanHistory, scanTypeFilter, scanCatFilter, hasActiveScanType, hasActiveScanCat],
  );

  const [scanPage, setScanPage] = useState(0);
  const scanTotalPages = Math.ceil(filteredScans.length / SCAN_PAGE_SIZE);
  const scanPageItems  = filteredScans.slice(scanPage * SCAN_PAGE_SIZE, (scanPage + 1) * SCAN_PAGE_SIZE);

  // Auto-reset scan page when filter changes
  const prevFilterRef = useRef({ scanTypeFilter, scanCatFilter });
  if (prevFilterRef.current.scanTypeFilter !== scanTypeFilter ||
      prevFilterRef.current.scanCatFilter  !== scanCatFilter) {
    prevFilterRef.current = { scanTypeFilter, scanCatFilter };
    if (scanPage !== 0) setScanPage(0);
  }

  // Expanded scan cards
  const [expandedScans, setExpandedScans] = useState<Set<string>>(
    () => new Set(scanHistory.length > 0 ? [scanHistory[0].id] : []),
  );
  const toggleScan = (id: string) =>
    setExpandedScans((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-3 border-b border-border">
        <h2 className="text-foreground mb-0.5" style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2 }}>
          {colName}
        </h2>
        <p className="text-muted-foreground mb-3" style={{ fontSize: "11px" }}>{pathStr}</p>

        {/* Info bar — entity data type removed, now lives in Column Information */}
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

      {/* ── Sections ── */}
      <div className="px-4 py-4 space-y-5">

        {/* Column Information */}
        <div>
          <SectionHeader icon={Table2} label="Column Information" timestamp="Updated Feb 24, 2026 02:30 AM" />
          <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">

            {/* Entity Data Type row — category badge + type pill */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Entity Data Type</span>
              <div className="flex items-center gap-1.5">
                {/* Category badge (PII / PCI / PHI …) */}
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded ${catColors.bg} ${catColors.text}`}
                  style={{ fontSize: "10px", fontWeight: 600 }}
                >
                  {entityCat}
                </span>
                {/* Entity type pill */}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded bg-background border border-border text-foreground/80"
                  style={{ fontSize: "11px" }}
                >
                  {entityTypeName}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Status</span>
              <span className="text-green-400" style={{ fontSize: "11px" }}>Active</span>
            </div>

            <MetaRow label="First Seen On"  value={meta.firstSeen}    />
            <MetaRow label="Last Modified"  value={meta.lastModified} />
            <PlatformGroup rows={platformRows} />
          </div>
        </div>

        {/* Field Access History */}
        <div>
          <SectionHeader icon={Clock} label="Field Access History" timestamp="Updated Feb 24, 2026 02:30 AM" />
          <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 border-b border-border text-muted-foreground"
              style={{ fontSize: "10px", fontWeight: 500 }}>
              <span>Query Pattern</span><span>User</span><span>Last Run</span>
            </div>
            {accessPageItems.map((entry, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5" style={{ fontSize: "11px" }}>
                <span className="text-foreground/80 font-mono truncate" title={entry.query}>{entry.query}</span>
                <span className="text-muted-foreground flex items-center gap-1"><User size={10} />{entry.user}</span>
                <span className="text-muted-foreground">{entry.date}</span>
              </div>
            ))}
          </div>
          <PaginationBar page={accessPage} totalPages={accessTotalPages} pageSize={ACCESS_PAGE_SIZE}
            totalItems={accessHistory.length} onPageChange={setAccessPage} itemLabel="queries" />
        </div>

        {/* Scan History */}
        <div>
          <SectionHeader icon={Shield} label="Scan History" />

          {/* Filter pills + dropdowns */}
          <div ref={scanDropdownRef} className="relative mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">

              {/* Scan Type pill */}
              {hasActiveScanType ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button type="button" onClick={openScanTypePicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    style={{ fontSize: "10px", fontWeight: 500 }}>
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Scan Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {scanTypeFilter.length === 1
                        ? (scanTypeFilter[0] === "at-rest" ? "At Rest" : "In Motion")
                        : `${scanTypeFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button type="button" onClick={() => { setScanTypeFilter([]); setScanDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors cursor-pointer"
                    aria-label="Clear scan type filter">
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={openScanTypePicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors cursor-pointer ${
                    scanDropdown === "scan-type"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}>
                  <Plus size={9} />Scan Type
                </button>
              )}

              {/* Data Type pill */}
              {hasActiveScanCat ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button type="button" onClick={openScanCatPicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    style={{ fontSize: "10px", fontWeight: 500 }}>
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Data Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {scanCatFilter.length === 1 ? scanCatFilter[0] : `${scanCatFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button type="button" onClick={() => { setScanCatFilter([]); setScanDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors cursor-pointer"
                    aria-label="Clear data type filter">
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={openScanCatPicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors cursor-pointer ${
                    scanDropdown === "data-type"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}>
                  <Plus size={9} />Data Type
                </button>
              )}

              {/* Count */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {filteredScans.length}
                  {(hasActiveScanType || hasActiveScanCat) ? ` of ${scanHistory.length}` : ""}{" "}
                  scan{filteredScans.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Scan Type dropdown */}
            {scanDropdown === "scan-type" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 pt-2 pb-2 border-b border-border">
                  <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Scan Type</span>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {([ ["at-rest", "At Rest"], ["in-motion", "In Motion"] ] as const).map(([val, label]) => {
                    const count   = scanTypeCounts[val] ?? 0;
                    const checked = pendingScanType.includes(val);
                    return (
                      <label key={val}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                        <input type="checkbox" checked={checked} onChange={() => togglePendingScanType(val)}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                        <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{label}</span>
                        <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="px-3 py-2.5 border-t border-border">
                  <button type="button" onClick={applyScanType}
                    className="w-full py-1.5 rounded-lg bg-primary text-white transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 600 }}>
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Data Type dropdown */}
            {scanDropdown === "data-type" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 pt-2 pb-2 border-b border-border">
                  <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {scanAvailableCats.map((cat) => {
                    const count   = scanCatCounts[cat] ?? 0;
                    if (count === 0) return null;
                    const checked = pendingScanCat.includes(cat);
                    const cc      = CAT_COLORS[cat];
                    return (
                      <label key={cat}
                        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                        <input type="checkbox" checked={checked} onChange={() => togglePendingScanCat(cat)}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                        <div className="flex items-center gap-1.5 flex-1">
                          {cc && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${cc.bg} ${cc.text}`}
                              style={{ fontWeight: 600 }}>
                              {cat}
                            </span>
                          )}
                          {!cc && (
                            <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{cat}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="px-3 py-2.5 border-t border-border">
                  <button type="button" onClick={applyScanCat}
                    className="w-full py-1.5 rounded-lg bg-primary text-white transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 600 }}>
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scan cards */}
          {filteredScans.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground" style={{ fontSize: "11px" }}>
              No scans match the current filters
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {scanPageItems.map((event) => (
                  <FieldScanCard
                    key={event.id}
                    event={event}
                    isExpanded={expandedScans.has(event.id)}
                    onToggle={() => toggleScan(event.id)}
                    fieldName={field.name}
                    dataType={field.dataType}
                  />
                ))}
              </div>
              <PaginationBar
                page={scanPage}
                totalPages={scanTotalPages}
                pageSize={SCAN_PAGE_SIZE}
                totalItems={filteredScans.length}
                onPageChange={(p) => { setScanPage(p); setExpandedScans(new Set()); }}
                itemLabel="scans"
              />
            </>
          )}
        </div>

      </div>
    </div>
  );
}
