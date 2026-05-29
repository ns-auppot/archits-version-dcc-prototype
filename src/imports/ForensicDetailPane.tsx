import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  FileText,
  Table2,
  Clock,
  User,
  Shield,
  Eye,
  ArrowRightLeft,
  Database,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Radar,
  FolderOpen,
  ExternalLink,
  Globe,
  AppWindow,
  HardDrive,
  Server,
  X,
  Plus,
} from "lucide-react";
import { DataLineageSection } from "./DataLineageMini";

// ── Shared types ─────────────────────────────────────────────────────────────

interface FileItem {
  name: string;
  dataTypes: string;
  modified: string;
}

interface FieldItem {
  name: string;
  dataType: string;
  table: string;
  entityTypes?: string[];
  lastQueried?: string;
}

// ── Map short category labels to actual entity data types ────────────────────

const CATEGORY_TO_ENTITY_TYPES: Record<string, string[]> = {
  PII: ["Personal Names", "Email Addresses", "Social Security Numbers", "Telephone Numbers", "Postal Addresses", "Birthdates"],
  Financial: ["Payment Cards", "Bank Account Information", "Financial IDs", "Currency", "Securities IDs"],
  PCI: ["Payment Cards", "Bank Account Information", "Postal Addresses", "Personal Names"],
  Secrets: ["Passwords", "Private Keys", "Public Keys", "Secrets and Tokens"],
  PHI: ["Medical Records", "Medical Diagnoses", "Healthcare IDs", "Healthcare Provider IDs", "Personal Names"],
  Credentials: ["Passwords", "Secrets and Tokens", "Private Keys", "Email Addresses"],
};

function getEntityDataTypes(category: string): string[] {
  return CATEGORY_TO_ENTITY_TYPES[category] || ["Personal Names", "Email Addresses"];
}

// ── Mock line-by-line file content with DLP highlights ───────────────────────

const SENSITIVE_PATTERNS: Record<string, { regex: RegExp; label: string }[]> = {
  PII: [
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, label: "SSN" },
    { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, label: "Name" },
    { regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: "Email" },
  ],
  Financial: [
    { regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, label: "Card Number" },
    { regex: /\$[\d,]+\.?\d{0,2}/g, label: "Amount" },
  ],
  PCI: [
    { regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, label: "Card Number" },
    { regex: /\b\d{3}\b/g, label: "CVV" },
  ],
  Secrets: [
    { regex: /(?:api[_-]?key|token|secret)[=:]\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi, label: "Secret" },
    { regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g, label: "Private Key" },
  ],
  PHI: [
    { regex: /\b(?:diagnosis|ICD-10|CPT)[:\s]+[A-Z0-9.]+/gi, label: "Medical Code" },
    { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, label: "Patient Name" },
  ],
  Credentials: [
    { regex: /(?:password|passwd|pwd)[=:]\s*\S+/gi, label: "Password" },
    { regex: /(?:api[_-]?key|token|secret)[=:]\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi, label: "Credential" },
  ],
};

function generateMockFileContent(fileName: string, dataType: string): string[] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "txt";
  const lines: string[] = [];

  if (ext === "csv") {
    lines.push("id,first_name,last_name,email,ssn,phone,department,salary");
    const employees = [
      ["1", "John Smith", "john.smith@acme.com", "284-39-1029", "(555) 123-4567", "Engineering", "$142,500"],
      ["2", "Sarah Chen", "sarah.chen@acme.com", "193-47-8821", "(555) 234-5678", "Finance", "$128,000"],
      ["3", "Marcus Johnson", "marcus.j@acme.com", "847-22-5510", "(555) 345-6789", "Legal", "$155,200"],
      ["4", "Emily Davis", "emily.d@acme.com", "552-18-7743", "(555) 456-7890", "HR", "$98,000"],
      ["5", "David Park", "d.park@acme.com", "661-33-9901", "(555) 567-8901", "Engineering", "$167,800"],
      ["6", "Lisa Wang", "l.wang@acme.com", "774-55-2238", "(555) 678-9012", "Marketing", "$112,400"],
      ["7", "James Wilson", "j.wilson@acme.com", "338-71-4456", "(555) 789-0123", "Sales", "$145,000"],
      ["8", "Ana Rodriguez", "a.rodriguez@acme.com", "429-88-1167", "(555) 890-1234", "Product", "$135,600"],
    ];
    for (const e of employees) {
      lines.push(`${e[0]},${e[1].split(" ")[0]},${e[1].split(" ")[1]},${e[2]},${e[3]},${e[4]},${e[5]},${e[6]}`);
    }
    for (let i = 9; i <= 100; i++) {
      lines.push(`${i},Employee${i},Last${i},emp${i}@acme.com,${100 + i}-${20 + (i % 80)}-${1000 + i},(...),Dept${i % 5},$${80000 + i * 500}`);
    }
  } else if (ext === "json") {
    lines.push("{");
    lines.push('  "users": [');
    const jsonUsers = [
      { name: "John Smith", email: "john.smith@acme.com", ssn: "284-39-1029" },
      { name: "Sarah Chen", email: "sarah.chen@acme.com", ssn: "193-47-8821" },
      { name: "Marcus Johnson", email: "marcus.j@acme.com", ssn: "847-22-5510" },
    ];
    for (let i = 0; i < jsonUsers.length; i++) {
      const u = jsonUsers[i];
      lines.push("    {");
      lines.push(`      "name": "${u.name}",`);
      lines.push(`      "email": "${u.email}",`);
      lines.push(`      "ssn": "${u.ssn}",`);
      lines.push(`      "api_key": "sk_live_${Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}"`);
      lines.push(`    }${i < jsonUsers.length - 1 ? "," : ""}`);
    }
    lines.push("  ]");
    lines.push("}");
    // Pad remaining lines
    for (let i = lines.length; i < 100; i++) {
      lines.push(`  // additional config line ${i}`);
    }
  } else if (ext === "sql") {
    lines.push("-- Database dump generated 2026-02-01");
    lines.push("-- PostgreSQL 15.4");
    lines.push("");
    lines.push("CREATE TABLE employees (");
    lines.push("  id SERIAL PRIMARY KEY,");
    lines.push("  full_name VARCHAR(255) NOT NULL,");
    lines.push("  email VARCHAR(255) UNIQUE NOT NULL,");
    lines.push("  ssn VARCHAR(11),");
    lines.push("  salary DECIMAL(10,2),");
    lines.push("  password_hash VARCHAR(128)");
    lines.push(");");
    lines.push("");
    lines.push("INSERT INTO employees VALUES");
    lines.push("  (1, 'John Smith', 'john.smith@acme.com', '284-39-1029', 142500.00, 'pbkdf2:sha256:260000$...'),");
    lines.push("  (2, 'Sarah Chen', 'sarah.chen@acme.com', '193-47-8821', 128000.00, 'pbkdf2:sha256:260000$...'),");
    lines.push("  (3, 'Marcus Johnson', 'marcus.j@acme.com', '847-22-5510', 155200.00, 'pbkdf2:sha256:260000$...'),");
    lines.push("  (4, 'Emily Davis', 'emily.d@acme.com', '552-18-7743', 98000.00, 'pbkdf2:sha256:260000$...');");
    lines.push("");
    for (let i = lines.length; i < 100; i++) {
      lines.push(`-- migration step ${i}`);
    }
  } else {
    // Generic text-like file (xlsx/pdf/docx — pretend extracted text)
    lines.push("--- Extracted content ---");
    lines.push("");
    lines.push("Employee Records Report - February 2026");
    lines.push("=========================================");
    lines.push("");
    lines.push("Name: John Smith");
    lines.push("Email: john.smith@acme.com");
    lines.push("SSN: 284-39-1029");
    lines.push("Department: Engineering");
    lines.push("Salary: $142,500");
    lines.push("");
    lines.push("Name: Sarah Chen");
    lines.push("Email: sarah.chen@acme.com");
    lines.push("SSN: 193-47-8821");
    lines.push("Department: Finance");
    lines.push("Salary: $128,000");
    lines.push("");
    lines.push("Name: Marcus Johnson");
    lines.push("Email: marcus.j@acme.com");
    lines.push("SSN: 847-22-5510");
    lines.push("Department: Legal");
    lines.push("Salary: $155,200");
    lines.push("");
    lines.push("Credit card on file: 4532-1234-5678-9012");
    lines.push("Expiry: 09/28  CVV: 441");
    lines.push("");
    for (let i = lines.length; i < 100; i++) {
      lines.push(`Additional record line ${i}...`);
    }
  }

  return lines.slice(0, 100);
}

// Find sensitive spans in a line based on data type
function findSensitiveSpans(
  line: string,
  dataType: string,
): { start: number; end: number; label: string }[] {
  const patterns = SENSITIVE_PATTERNS[dataType] || SENSITIVE_PATTERNS["PII"];
  const spans: { start: number; end: number; label: string }[] = [];

  for (const { regex, label } of patterns) {
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, label });
    }
  }

  // Sort and de-duplicate overlapping spans
  spans.sort((a, b) => a.start - b.start);
  const merged: typeof spans = [];
  for (const s of spans) {
    if (merged.length && s.start < merged[merged.length - 1].end) continue;
    merged.push(s);
  }
  return merged;
}

// Render a single line with highlighted sensitive spans
function HighlightedLine({ line, dataType }: { line: string; dataType: string }) {
  const spans = useMemo(() => findSensitiveSpans(line, dataType), [line, dataType]);

  if (spans.length === 0) {
    return <span className="text-foreground/70">{line || "\u00A0"}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push(
        <span key={`t-${cursor}`} className="text-foreground/70">
          {line.slice(cursor, span.start)}
        </span>,
      );
    }
    parts.push(
      <span
        key={`h-${span.start}`}
        className="bg-destructive/20 text-destructive rounded-sm px-0.5"
        title={span.label}
      >
        {line.slice(span.start, span.end)}
      </span>,
    );
    cursor = span.end;
  }
  if (cursor < line.length) {
    parts.push(
      <span key={`t-${cursor}`} className="text-foreground/70">
        {line.slice(cursor)}
      </span>,
    );
  }
  return <>{parts}</>;
}

// ── Mock column content for structured fields ────────────────────────────────

// Sample values keyed by entity data type — forensics will show data matching the
// entity type the scan actually detected, not just the column name.
const ENTITY_TYPE_SAMPLES: Record<string, string[]> = {
  "Email Addresses": [
    "john.smith@acme.com", "sarah.chen@acme.com", "marcus.j@acme.com",
    "emily.d@acme.com", "d.park@acme.com", "l.wang@acme.com",
    "j.wilson@acme.com", "a.rodriguez@acme.com", "k.brown@acme.com",
    "m.taylor@acme.com", "NULL", "r.anderson@acme.com",
  ],
  "Personal Names": [
    "John Smith", "Sarah Chen", "Marcus Johnson", "Emily Davis",
    "David Park", "Lisa Wang", "James Wilson", "Ana Rodriguez",
    "Kevin Brown", "NULL", "Rachel Anderson", "Michael Taylor",
  ],
  "Social Security Numbers": [
    "284-39-1029", "193-47-8821", "847-22-5510", "552-18-7743",
    "661-33-9901", "774-55-2238", "338-71-4456", "429-88-1167",
    "NULL", "912-05-3347", "145-62-8890", "503-41-7726",
  ],
  "Telephone Numbers": [
    "(555) 123-4567", "(555) 234-5678", "(555) 345-6789", "(555) 456-7890",
    "NULL", "(555) 567-8901", "(555) 678-9012", "(555) 789-0123",
    "+1-202-555-0147", "+1-312-555-0198", "(555) 901-2345", "NULL",
  ],
  "Postal Addresses": [
    "123 Main St, Springfield IL 62701", "456 Oak Ave, Portland OR 97201",
    "789 Pine Rd, Austin TX 78701", "321 Elm St, Denver CO 80201",
    "NULL", "55 Market St, San Francisco CA 94105", "900 1st Ave, Seattle WA 98101",
    "2200 Pennsylvania Ave NW, Washington DC 20037",
  ],
  "Birthdates": [
    "1988-03-15", "1992-07-22", "1985-11-30", "1990-01-08",
    "1995-05-17", "NULL", "1987-09-04", "1993-12-25",
    "1978-06-19", "2001-02-14", "NULL", "1982-10-31",
  ],
  "Payment Cards": [
    "4532-1234-5678-9012", "5425-8734-2109-6543", "4111-1111-1111-1111",
    "3782-8224-6310-005", "6011-5678-9012-3456", "NULL",
    "4916-3389-1025-7744", "5200-8282-1010-3456", "NULL",
  ],
  "Bank Account Information": [
    "****4892", "****7301", "****2058", "****6614",
    "NULL", "****9183", "****3547", "****8820",
    "****1276", "NULL", "****4409", "****5591",
  ],
  "Financial IDs": [
    "FIN-2026-00142", "FIN-2026-00287", "FIN-2025-01893", "FIN-2026-00451",
    "NULL", "FIN-2025-02104", "FIN-2026-00033", "FIN-2026-00519",
    "$142,500", "$128,000", "$155,200", "NULL",
  ],
  "Taxpayer IDs": [
    "92-1234567", "13-9876543", "06-5551234", "74-3218765",
    "NULL", "27-6549871", "84-1237654", "51-9873216",
  ],
  "Passwords": [
    "pbkdf2:sha256:260000$aBcDeFgH...", "bcrypt:$2b$12$xYz...",
    "argon2id:$argon2id$v=19...", "pbkdf2:sha256:260000$QrStUv...",
    "scrypt:N=32768:r=8:p=1$...", "NULL", "bcrypt:$2b$10$kLm...",
    "argon2id:$argon2id$v=19$m=65536...",
  ],
  "Secrets and Tokens": [
    "sk_live_4eC39HqLyjWDarj...", "ghp_xxxxxxxxxxxxxxxxxxxx...",
    "xoxb-123456789012-abcde...", "NULL", "AKIAIOSFODNN7EXAMPLE...",
    "eyJhbGciOiJIUzI1NiIs...", "rk_test_51HG8vX2eZvKYl...",
  ],
  "Medical Records": [
    "MRN-2026-004821", "MRN-2026-003917", "MRN-2025-012844", "NULL",
    "MRN-2026-001055", "MRN-2024-028163", "MRN-2026-006392",
    "MRN-2025-019475", "NULL", "MRN-2026-002718",
  ],
  "Medical Diagnoses": [
    "ICD-10: E11.9 (Type 2 diabetes)", "ICD-10: I10 (Hypertension)",
    "ICD-10: J06.9 (Upper resp. infection)", "NULL",
    "ICD-10: M54.5 (Low back pain)", "ICD-10: F32.1 (Major depressive)",
    "ICD-10: K21.0 (GERD)", "NULL",
  ],
  "Healthcare IDs": [
    "NPI-1234567890", "NPI-9876543210", "DEA-AB1234567",
    "NULL", "NPI-5551234567", "NPI-8889876543",
    "UPIN-A12345", "NULL", "NPI-3216549870",
  ],
  "Healthcare Provider IDs": [
    "NPI-1234567890", "NPI-9876543210", "DEA-AB1234567",
    "NULL", "NPI-5551234567", "NPI-8889876543",
  ],
  "IP Addresses": [
    "192.168.1.42", "10.0.0.115", "172.16.254.1", "NULL",
    "203.0.113.50", "198.51.100.23", "10.10.5.200",
    "NULL", "192.168.10.88", "172.31.0.1",
  ],
  "Domain Names": [
    "api.acme.com", "internal.corp.net", "staging.acme.io",
    "NULL", "cdn.partner.io", "vault.acme.com",
    "db.prod.internal", "NULL",
  ],
  "Driver Licenses": [
    "DL-C1234567", "DL-S9876543", "DL-M5551234", "NULL",
    "DL-E7654321", "DL-D3218765", "DL-L1239876", "NULL",
  ],
  "National IDs": [
    "NID-123456789", "NID-987654321", "NID-555123456", "NULL",
    "NID-765432198", "NID-321876549", "NULL",
  ],
  "Passports": [
    "P-12345678", "P-98765432", "P-55512345", "NULL",
    "P-76543219", "P-32187654", "P-99001234", "NULL",
  ],
  "Gender": [
    "Male", "Female", "Non-binary", "Male",
    "Female", "NULL", "Male", "Female",
    "Prefer not to say", "NULL", "Male", "Female",
  ],
  "Ethnicity and Race": [
    "Asian", "White", "Hispanic/Latino", "Black/African American",
    "NULL", "Asian", "White", "Two or More Races",
    "NULL", "American Indian/Alaska Native", "White", "Hispanic/Latino",
  ],
};

function generateMockColumnValues(
  fieldName: string,
  _dataType: string,
  entityTypes?: string[],
): { value: string; isSensitive: boolean }[] {
  const values: { value: string; isSensitive: boolean }[] = [];

  // Pick sample values based on the field's primary entity type
  const primaryType = entityTypes?.[0] || "";
  let raw = ENTITY_TYPE_SAMPLES[primaryType];

  // Fallback: try matching by column name keywords
  if (!raw) {
    const col = fieldName.split(".").pop()?.toLowerCase() || "";
    const colFallbacks: Record<string, string> = {
      email: "Email Addresses", recovery_email: "Email Addresses",
      full_name: "Personal Names", cardholder_name: "Personal Names",
      emergency_contact: "Personal Names",
      ssn: "Social Security Numbers", tax_id: "Taxpayer IDs",
      phone_number: "Telephone Numbers", home_phone: "Telephone Numbers",
      mobile: "Telephone Numbers",
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

  // Final fallback
  if (!raw) {
    raw = [
      "value_001", "value_002", "value_003", "value_004",
      "value_005", "NULL", "value_007", "value_008",
    ];
  }

  for (const v of raw) {
    values.push({ value: v, isSensitive: v !== "NULL" });
  }
  // Pad to ~20 rows
  while (values.length < 20) {
    const src = raw[values.length % raw.length];
    values.push({ value: src, isSensitive: src !== "NULL" });
  }
  return values;
}

// ── Scan History mock data ────────────────────────────────────────────────────

interface ScanEvent {
  id: string;
  type: "in-motion" | "at-rest";
  timestamp: string;
  // in-motion fields
  actor?: string;
  activity?: string;
  destination?: string;
  // at-rest fields
  scanKind?: "Discovery Scan" | "Ongoing Scan";
  // shared
  findings: string[];
  dataCategory: string;
}

function generateScanHistory(fileName: string, dataCategory: string, entityTypesOverride?: string[]): ScanEvent[] {
  // Deterministic-ish based on file name length
  const seed = fileName.length;
  const entityTypes = entityTypesOverride && entityTypesOverride.length > 0
    ? entityTypesOverride
    : getEntityDataTypes(dataCategory);

  const events: ScanEvent[] = [
    {
      id: `${fileName}-scan-1`,
      type: "in-motion",
      timestamp: "Feb 24, 2026 09:14 AM",
      actor: "sarah.chen",
      activity: "Uploaded to external share",
      destination: "Google Drive → shared-reports/",
      findings: entityTypes.slice(0, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-2`,
      type: "at-rest",
      timestamp: "Feb 22, 2026 02:30 AM",
      scanKind: "Ongoing Scan",
      findings: entityTypes.slice(0, Math.min(4, entityTypes.length)),
      dataCategory,
    },
    {
      id: `${fileName}-scan-3`,
      type: "in-motion",
      timestamp: "Feb 18, 2026 04:47 PM",
      actor: "marcus.j",
      activity: "Downloaded via API",
      destination: "External endpoint → api.partner.io/ingest",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-4`,
      type: "at-rest",
      timestamp: "Feb 10, 2026 01:00 AM",
      scanKind: "Ongoing Scan",
      findings: entityTypes.slice(1, 4),
      dataCategory,
    },
    {
      id: `${fileName}-scan-5`,
      type: "at-rest",
      timestamp: "Jan 15, 2026 12:00 PM",
      scanKind: "Discovery Scan",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-6`,
      type: "in-motion",
      timestamp: "Jan 10, 2026 11:22 AM",
      actor: "emily.d",
      activity: "Shared via email",
      destination: "External → partner-reports@acme.co",
      findings: entityTypes.slice(0, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-7`,
      type: "at-rest",
      timestamp: "Jan 5, 2026 03:00 AM",
      scanKind: "Ongoing Scan",
      findings: entityTypes.slice(1, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-8`,
      type: "in-motion",
      timestamp: "Dec 28, 2025 02:15 PM",
      actor: "d.park",
      activity: "Copied to external bucket",
      destination: "S3 → ext-backup-prod/quarterly/",
      findings: entityTypes.slice(0, 4),
      dataCategory,
    },
    {
      id: `${fileName}-scan-9`,
      type: "at-rest",
      timestamp: "Dec 20, 2025 01:00 AM",
      scanKind: "Ongoing Scan",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-10`,
      type: "in-motion",
      timestamp: "Dec 12, 2025 09:33 AM",
      actor: "l.wang",
      activity: "Downloaded locally",
      destination: "Local workstation → /Users/l.wang/Downloads/",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-11`,
      type: "at-rest",
      timestamp: "Dec 1, 2025 02:00 AM",
      scanKind: "Ongoing Scan",
      findings: entityTypes.slice(0, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-12`,
      type: "at-rest",
      timestamp: "Nov 15, 2025 12:00 PM",
      scanKind: "Discovery Scan",
      findings: entityTypes.slice(0, 1),
      dataCategory,
    },
  ];

  // For shorter file names, return fewer events to add variety
  if (seed < 10) return events.slice(0, 5);
  if (seed < 15) return events.slice(0, 8);
  return events;
}

// ── Inline forensics viewer (reused per scan node) ───────────────────────────

function InlineForensicsViewer({ fileName, dataCategory }: { fileName: string; dataCategory: string }) {
  const lines = useMemo(() => generateMockFileContent(fileName, dataCategory), [fileName, dataCategory]);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye size={11} className="text-muted-foreground" />
        <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
          Up to 100 lines &middot; Sensitive data highlighted
        </span>
      </div>
      <div className="bg-surface-raised/60 border border-border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full border-collapse" style={{ fontSize: "11px" }}>
            <tbody>
              {lines.map((line, idx) => {
                const spans = findSensitiveSpans(line, dataCategory);
                const hasSensitive = spans.length > 0;
                return (
                  <tr
                    key={idx}
                    className={hasSensitive ? "bg-destructive/[0.06]" : ""}
                  >
                    <td
                      className="px-2 py-0 text-right text-muted-foreground/50 select-none border-r border-border/50"
                      style={{
                        fontSize: "10px",
                        minWidth: "36px",
                        fontFamily: "inherit",
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      className="px-3 py-0 whitespace-pre font-mono"
                      style={{ fontSize: "11px" }}
                    >
                      <HighlightedLine line={line} dataType={dataCategory} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Finding → category badge helpers ─────────────────────────────────────────

const _FINDING_CAT_MAP: Record<string, string> = {
  "Personal Names": "PII", "Email Addresses": "PII", "Telephone Numbers": "PII",
  "Postal Addresses": "PII", "Birthdates": "PII", "Gender": "PII", "Age": "PII",
  "IP Addresses": "PII", "MAC Addresses": "PII", "Domain Names": "PII", "URI Hosts": "PII",
  "UUIDs": "PII", "Nationality": "PII",
  "Social Security Numbers": "SPII", "Driver Licenses": "SPII", "National IDs": "SPII",
  "Passports": "SPII", "Taxpayer IDs": "SPII", "Voter Registration IDs": "SPII",
  "Ethnicity and Race": "PSI", "Marital Status": "PSI", "Religious Beliefs": "PSI",
  "Political Opinions": "PSI", "Sexual Orientation": "PSI", "Immigration Status": "PSI",
  "Payment Cards": "PCI",
  "Bank Account Information": "PFI", "Financial IDs": "PFI", "Currency": "PFI",
  "Securities IDs": "PFI", "Credit Scores": "PFI", "Income Information": "PFI",
  "Medical Records": "PHI", "Medical Diagnoses": "PHI", "Healthcare IDs": "PHI",
  "Healthcare Provider IDs": "PHI", "Health Insurance IDs": "PHI",
  "Biometric Data": "PHI", "Genetic Data": "PHI",
  "Passwords": "PAI", "Private Keys": "PAI", "Public Keys": "PAI",
  "Secrets and Tokens": "PAI", "Security Questions": "PAI", "MFA Seeds": "PAI",
  "Source Code": "BII", "Company Names": "BII", "Trade Secrets": "BII",
};

const _FINDING_CAT_COLORS: Record<string, { bg: string; text: string }> = {
  PII:  { bg: "bg-blue-500/15",   text: "text-blue-300"   },
  SPII: { bg: "bg-red-500/15",    text: "text-red-300"    },
  PSI:  { bg: "bg-orange-500/15", text: "text-orange-300" },
  PCI:  { bg: "bg-yellow-500/15", text: "text-yellow-300" },
  PFI:  { bg: "bg-green-500/15",  text: "text-green-300"  },
  PHI:  { bg: "bg-purple-500/15", text: "text-purple-300" },
  PAI:  { bg: "bg-pink-500/15",   text: "text-pink-300"   },
  BII:  { bg: "bg-slate-500/15",  text: "text-slate-300"  },
};

function findingCategory(finding: string): string {
  return _FINDING_CAT_MAP[finding] ?? "PII";
}

/** Deduplicate categories from a list of finding strings */
function findingCategories(findings: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of findings) {
    const cat = findingCategory(f);
    if (!seen.has(cat)) { seen.add(cat); result.push(cat); }
  }
  return result;
}

function FindingCategoryBadge({ cat }: { cat: string }) {
  const c = _FINDING_CAT_COLORS[cat] ?? _FINDING_CAT_COLORS.PII;
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded ${c.bg} ${c.text} border border-current/15`}
      style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em" }}
    >
      {cat}
    </span>
  );
}

// ── Scan card component ──────────────────────────────────────────────────────

function ScanCard({
  event,
  isExpanded,
  onToggle,
  fileName,
}: {
  event: ScanEvent;
  isExpanded: boolean;
  onToggle: () => void;
  fileName: string;
}) {
  const isMotion = event.type === "in-motion";

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isExpanded
          ? "bg-surface-raised border-primary/30"
          : "bg-surface-raised/60 border-border hover:border-foreground/20 hover:bg-surface-raised"
      }`}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer group"
      >
        {/* Type icon */}
        <div
          className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
            isMotion ? "bg-warning/10" : "bg-primary/10"
          }`}
        >
          {isMotion
            ? <ArrowRightLeft size={13} className="text-warning" />
            : <Radar size={13} className="text-primary" />
          }
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                isMotion
                  ? "bg-warning/10 text-warning border border-warning/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
              style={{ fontWeight: 600 }}
            >
              {isMotion ? "In Motion" : "At Rest"}
            </span>
            <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>
              {event.timestamp}
            </span>
          </div>

          <div className="text-foreground/80 mt-0.5 truncate" style={{ fontSize: "11px" }}>
            {isMotion ? (
              <>
                <span className="text-text-bright">{event.actor}</span>
                {" \u2014 "}
                {event.activity}
                {event.destination && (
                  <span className="text-muted-foreground">
                    {"→ "}{event.destination}
                  </span>
                )}
              </>
            ) : (
              <span>{event.scanKind}</span>
            )}
          </div>

          {/* Entity type chips (third row) */}
          <div className="flex flex-wrap gap-1 mt-1">
            {event.findings.map((f) => (
              <span
                key={f}
                className="inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap"
                style={{ fontSize: "11px" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Chevron */}
        <div className={`shrink-0 text-muted-foreground transition-transform ml-0.5 ${isExpanded ? "rotate-180" : ""} group-hover:text-foreground/70`}>
          <ChevronDown size={13} />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          {/* In-motion detail rows */}
          {isMotion && (
            <div className="mb-2 space-y-0.5">
              <div className="flex gap-2" style={{ fontSize: "10px" }}>
                <span className="text-muted-foreground shrink-0" style={{ minWidth: "72px" }}>User</span>
                <span className="text-foreground/70">{event.actor || "\u2014"}</span>
              </div>
              <div className="flex gap-2" style={{ fontSize: "10px" }}>
                <span className="text-muted-foreground shrink-0" style={{ minWidth: "72px" }}>Activity</span>
                <span className="text-foreground/70">{event.activity || "\u2014"}</span>
              </div>
              <div className="flex gap-2" style={{ fontSize: "10px" }}>
                <span className="text-muted-foreground shrink-0" style={{ minWidth: "72px" }}>Destination</span>
                <span className="text-foreground/70">{event.destination || "\u2014"}</span>
              </div>
              <div className="flex gap-2" style={{ fontSize: "10px" }}>
                <span className="text-muted-foreground shrink-0" style={{ minWidth: "72px" }}>Timestamp</span>
                <span className="text-foreground/70">{event.timestamp}</span>
              </div>
            </div>
          )}

          {/* Forensics viewer */}
          <InlineForensicsViewer fileName={fileName} dataCategory={event.dataCategory} />
        </div>
      )}
    </div>
  );
}

// Pagination bar (reusable)
function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = "items",
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-raised/40 border border-border rounded-lg">
      <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
        {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="p-1 rounded text-muted-foreground hover:text-text-bright hover:bg-nav-active disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`min-w-[22px] h-[22px] rounded flex items-center justify-center transition-colors cursor-pointer ${
              i === page
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-text-bright hover:bg-nav-active"
            }`}
            style={{ fontSize: "10px", fontWeight: i === page ? 600 : 400 }}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="p-1 rounded text-muted-foreground hover:text-text-bright hover:bg-nav-active disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── File Detail Pane ─────────────────────────────────────────────────────────

interface FileDetailProps {
  file: FileItem;
  isInTransit?: boolean;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
        {label}
      </span>
      <span className="text-text-bright font-mono" style={{ fontSize: "11px" }}>
        {value}
      </span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  timestamp,
}: {
  icon: typeof FileText;
  label: string;
  timestamp?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div
        className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}
      >
        <Icon size={11} />
        {label}
      </div>
      {timestamp && (
        <span className="text-muted-foreground/60" style={{ fontSize: "10px" }}>
          {timestamp}
        </span>
      )}
    </div>
  );
}

export function FileDetailPane({ file }: FileDetailProps) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKb = Math.floor(12 + file.name.length * 3.7);
  const scanHistory = useMemo(() => generateScanHistory(file.name, file.dataTypes), [file.name, file.dataTypes]);

  // Most recent scan expanded by default
  const [expandedScans, setExpandedScans] = useState<Set<string>>(() => {
    return new Set(scanHistory.length > 0 ? [scanHistory[0].id] : []);
  });

  const toggleScan = (id: string) => {
    setExpandedScans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* ── Part 1: File Metadata ── */}
      <div>
        <SectionHeader icon={FileText} label="File Metadata" timestamp="Updated Feb 24, 2026 09:14 AM" />
        <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">
          <MetaRow label="File Name" value={file.name} />
          <MetaRow label="Type" value={ext} />
          <MetaRow label="Size" value={`${sizeKb} KB`} />
          <MetaRow label="Last Modified" value={file.modified} />
          <MetaRow label="Owner" value="system-service" />
        </div>
      </div>

      {/* ── Part 2: File Access History ── */}
      <div>
        <SectionHeader icon={Clock} label="File Access History" timestamp="Updated Feb 24, 2026 09:14 AM" />
        <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
          <div
            className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 border-b border-border text-muted-foreground"
            style={{ fontSize: "10px", fontWeight: 500 }}
          >
            <span>User</span>
            <span>Action</span>
            <span>Date</span>
          </div>
          {[
            { user: "john.smith", action: "Modified", date: "Feb 23, 2026" },
            { user: "sarah.chen", action: "Viewed", date: "Feb 22, 2026" },
            { user: "ci-pipeline", action: "Scanned", date: "Feb 21, 2026" },
            { user: "marcus.j", action: "Downloaded", date: "Feb 20, 2026" },
            { user: "emily.d", action: "Viewed", date: "Feb 18, 2026" },
          ].map((entry, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 text-foreground/80"
              style={{ fontSize: "11px" }}
            >
              <span className="flex items-center gap-1.5">
                <User size={10} className="text-muted-foreground" />
                {entry.user}
              </span>
              <span
                className={
                  entry.action === "Modified"
                    ? "text-warning"
                    : entry.action === "Downloaded"
                      ? "text-primary"
                      : "text-muted-foreground"
                }
              >
                {entry.action}
              </span>
              <span className="text-muted-foreground">{entry.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Part 3: Scan History Timeline ── */}
      <div>
        <SectionHeader icon={Shield} label="Scan History" />
        <div className="text-muted-foreground mb-3" style={{ fontSize: "10px" }}>
          {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""} recorded
          {" \u2014 "}
          most recent first
        </div>
        <div className="space-y-2">
          {scanHistory.map((event) => (
            <ScanCard
              key={event.id}
              event={event}
              isExpanded={expandedScans.has(event.id)}
              onToggle={() => toggleScan(event.id)}
              fileName={file.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Field scan history (at-rest only) ────────────────────────────────────────

interface FieldScanEvent {
  id: string;
  scanKind: "Discovery Scan" | "Ongoing Scan";
  timestamp: string;
  findings: string[];
  dataCategory: string;
}

function generateFieldScanHistory(fieldName: string, dataCategory: string, entityTypes?: string[]): FieldScanEvent[] {
  const seed = fieldName.length;
  const types = entityTypes && entityTypes.length > 0 ? entityTypes : getEntityDataTypes(dataCategory);

  const events: FieldScanEvent[] = [
    {
      id: `${fieldName}-fscan-1`,
      scanKind: "Ongoing Scan",
      timestamp: "Feb 24, 2026 02:30 AM",
      findings: types.slice(0, Math.min(3, types.length)),
      dataCategory,
    },
    {
      id: `${fieldName}-fscan-2`,
      scanKind: "Ongoing Scan",
      timestamp: "Feb 17, 2026 02:30 AM",
      findings: types.slice(0, Math.min(4, types.length)),
      dataCategory,
    },
    {
      id: `${fieldName}-fscan-3`,
      scanKind: "Ongoing Scan",
      timestamp: "Feb 10, 2026 02:30 AM",
      findings: types.slice(0, Math.min(2, types.length)),
      dataCategory,
    },
    {
      id: `${fieldName}-fscan-4`,
      scanKind: "Discovery Scan",
      timestamp: "Jan 15, 2026 12:00 PM",
      findings: types.slice(0, Math.min(2, types.length)),
      dataCategory,
    },
  ];

  if (seed < 12) return events.slice(0, 2);
  if (seed < 18) return events.slice(0, 3);
  return events;
}

// ── Field scan card component ─────────────────────────────────────────────────

function FieldScanCard({
  event,
  isExpanded,
  onToggle,
  fieldName,
  dataType,
}: {
  event: FieldScanEvent;
  isExpanded: boolean;
  onToggle: () => void;
  fieldName: string;
  dataType: string;
}) {
  const columnValues = useMemo(
    () => (isExpanded ? generateMockColumnValues(fieldName, dataType, event.findings) : []),
    [isExpanded, fieldName, dataType, event.findings],
  );

  const colName = fieldName.includes(".") ? fieldName.split(".").pop()! : fieldName;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isExpanded
          ? "bg-surface-raised border-primary/30"
          : "bg-surface-raised/60 border-border hover:border-foreground/20 hover:bg-surface-raised"
      }`}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer group"
      >
        {/* Type icon */}
        <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-primary/10">
          <Radar size={13} className="text-primary" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-primary/10 text-primary border border-primary/20"
              style={{ fontWeight: 600 }}
            >
              At Rest
            </span>
            <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>
              {event.timestamp}
            </span>
          </div>

          <div className="text-foreground/80 mt-0.5 truncate" style={{ fontSize: "11px" }}>
            {event.scanKind}
          </div>

          {/* Entity type chips (third row) */}
          <div className="flex flex-wrap gap-1 mt-1">
            {event.findings.map((f) => (
              <span
                key={f}
                className="inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap"
                style={{ fontSize: "11px" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Chevron */}
        <div className={`shrink-0 text-muted-foreground transition-transform ml-0.5 ${isExpanded ? "rotate-180" : ""} group-hover:text-foreground/70`}>
          <ChevronDown size={13} />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          {/* Column forensics viewer */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye size={11} className="text-muted-foreground" />
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                Sample column values &middot; Sensitive matches highlighted
              </span>
            </div>
            <div className="bg-surface-raised/60 border border-border rounded-lg overflow-hidden">
              <div
                className="grid grid-cols-[36px_1fr_auto] gap-x-0 px-0 py-1.5 border-b border-border/50 text-muted-foreground/60"
                style={{ fontSize: "10px", fontWeight: 500 }}
              >
                <span className="text-right pr-2">#</span>
                <span className="pl-3">{colName}</span>
                <span className="pr-3">Match</span>
              </div>
              <div className="overflow-auto max-h-[300px]">
                {columnValues.map((row, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-[36px_1fr_auto] gap-x-0 px-0 py-1 ${
                      row.isSensitive ? "bg-destructive/[0.06]" : ""
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    <span
                      className="text-right pr-2 text-muted-foreground/50 font-mono select-none border-r border-border/50"
                      style={{ fontSize: "10px" }}
                    >
                      {idx + 1}
                    </span>
                    <span className="pl-3 font-mono">
                      {row.isSensitive ? (
                        <span className="bg-destructive/20 text-destructive rounded-sm px-0.5">
                          {row.value}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">{row.value}</span>
                      )}
                    </span>
                    <span className="pr-3 text-center">
                      {row.isSensitive ? (
                        <span className="text-destructive" style={{ fontSize: "10px" }}>
                          <Shield size={10} />
                        </span>
                      ) : null}
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

// ── Exported FieldDetailPane ─────────────────────────────────────────────────

interface FieldDetailProps {
  field: FieldItem;
}

export function FieldDetailPane({ field }: FieldDetailProps) {
  const columnValues = useMemo(
    () => generateMockColumnValues(field.name, field.dataType, field.entityTypes),
    [field.name, field.dataType, field.entityTypes],
  );
  const schemaName = "public";
  const [tableName, colName] = field.name.includes(".")
    ? field.name.split(".")
    : ["unknown", field.name];

  const scanHistory = useMemo(
    () => generateFieldScanHistory(field.name, field.dataType, field.entityTypes),
    [field.name, field.dataType, field.entityTypes],
  );

  // Most recent scan expanded by default
  const [expandedScans, setExpandedScans] = useState<Set<string>>(() => {
    return new Set(scanHistory.length > 0 ? [scanHistory[0].id] : []);
  });

  const toggleScan = (id: string) => {
    setExpandedScans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* ── Part 1: Field Metadata ── */}
      <div>
        <SectionHeader icon={Table2} label="Field Metadata" timestamp="Updated Feb 24, 2026 02:30 AM" />
        <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">
          <MetaRow label="Schema" value={schemaName} />
          <MetaRow label="Table" value={tableName} />
          <MetaRow label="Column" value={colName} />
          <MetaRow label="Data Type" value={field.dataType === "PII" ? "VARCHAR(255)" : field.dataType === "Financial" ? "DECIMAL(10,2)" : "VARCHAR(128)"} />
          <MetaRow label="Nullable" value="YES" />
          <MetaRow label="Sample Rows" value={`${columnValues.filter((v) => v.isSensitive).length} sensitive`} />
        </div>
      </div>

      {/* ── Part 2: Field Access History ── */}
      <div>
        <SectionHeader icon={Clock} label="Field Access History" timestamp="Updated Feb 24, 2026 02:30 AM" />
        <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
          <div
            className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 border-b border-border text-muted-foreground"
            style={{ fontSize: "10px", fontWeight: 500 }}
          >
            <span>Query Pattern</span>
            <span>User</span>
            <span>Last Run</span>
          </div>
          {[
            { query: `SELECT ${colName} FROM ${tableName} WHERE...`, user: "app-backend", date: "Feb 23" },
            { query: `SELECT * FROM ${tableName} LIMIT 100`, user: "analyst-bot", date: "Feb 22" },
            { query: `UPDATE ${tableName} SET ${colName}=...`, user: "migration-svc", date: "Feb 21" },
            { query: `COPY ${tableName}(${colName}) TO...`, user: "etl-pipeline", date: "Feb 20" },
            { query: `SELECT COUNT(*) FROM ${tableName}`, user: "monitoring", date: "Feb 19" },
          ].map((entry, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5"
              style={{ fontSize: "11px" }}
            >
              <span className="text-foreground/80 font-mono truncate" title={entry.query}>
                {entry.query}
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <User size={10} />
                {entry.user}
              </span>
              <span className="text-muted-foreground">{entry.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Part 3: Field Scan History Timeline ── */}
      <div>
        <SectionHeader icon={Shield} label="Scan History" />
        <div className="text-muted-foreground mb-3" style={{ fontSize: "10px" }}>
          {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""} recorded
          {" \u2014 "}
          most recent first
        </div>
        <div className="space-y-2">
          {scanHistory.map((event) => (
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
      </div>
    </div>
  );
}

// ── SensitiveFileDetailPane (used by search-results side panel) ───────────────

const TYPE_TO_CATEGORY_MAP: Record<string, string> = {
  "Social Security Numbers": "PII", "Personal Names": "PII", "Email Addresses": "PII",
  "Telephone Numbers": "PII", "Postal Addresses": "PII", "Birthdates": "PII",
  "Payment Cards": "PCI", "Bank Account Information": "Financial", "Financial IDs": "Financial",
  "Medical Records": "PHI", "Medical Diagnoses": "PHI", "Healthcare IDs": "PHI",
  "Healthcare Provider IDs": "PHI", "Biometric Data": "PHI",
  "Passwords": "Secrets", "Private Keys": "Secrets", "Secrets and Tokens": "Secrets",
};

function inferDataCategory(dataTypes: string[]): string {
  for (const dt of dataTypes) {
    if (TYPE_TO_CATEGORY_MAP[dt]) return TYPE_TO_CATEGORY_MAP[dt];
  }
  return "PII";
}

const _ACCESS_USERS = [
  ["john.smith", "Modified"], ["sarah.chen", "Viewed"], ["ci-pipeline", "Scanned"],
  ["marcus.j", "Downloaded"], ["emily.d", "Viewed"], ["d.park", "Shared"], ["l.wang", "Viewed"],
  ["k.brown", "Downloaded"], ["r.anderson", "Viewed"], ["m.taylor", "Modified"],
  ["backup-svc", "Scanned"], ["a.rodriguez", "Shared"], ["j.wilson", "Viewed"],
  ["etl-pipeline", "Downloaded"], ["admin", "Modified"],
];
const _ACCESS_DATES = [
  "Feb 23, 2026", "Feb 22, 2026", "Feb 21, 2026", "Feb 20, 2026", "Feb 18, 2026",
  "Feb 15, 2026", "Feb 13, 2026", "Feb 11, 2026", "Feb 9, 2026", "Feb 7, 2026",
  "Feb 5, 2026", "Feb 3, 2026", "Feb 1, 2026", "Jan 29, 2026", "Jan 27, 2026",
  "Jan 24, 2026", "Jan 21, 2026", "Jan 18, 2026", "Jan 15, 2026", "Jan 12, 2026",
];

function generateFileAccessHistory(fileName: string) {
  const seed = fileName.length % _ACCESS_USERS.length;
  // Generate 15–20 entries based on filename
  const count = 15 + (fileName.length % 6);
  return Array.from({ length: count }, (_, i) => {
    const idx = (seed + i) % _ACCESS_USERS.length;
    const dateIdx = i % _ACCESS_DATES.length;
    return { user: _ACCESS_USERS[idx][0], action: _ACCESS_USERS[idx][1], date: _ACCESS_DATES[dateIdx] };
  });
}

export const DT_CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PII:  { bg: "bg-blue-500/10",   text: "text-blue-300",   dot: "bg-blue-400" },
  SPII: { bg: "bg-red-500/10",    text: "text-red-300",    dot: "bg-red-400" },
  PSI:  { bg: "bg-orange-500/10", text: "text-orange-300", dot: "bg-orange-400" },
  PCI:  { bg: "bg-yellow-500/10", text: "text-yellow-300", dot: "bg-yellow-400" },
  PFI:  { bg: "bg-green-500/10",  text: "text-green-300",  dot: "bg-green-400" },
  PHI:  { bg: "bg-purple-500/10", text: "text-purple-300", dot: "bg-purple-400" },
  PAI:  { bg: "bg-pink-500/10",   text: "text-pink-300",   dot: "bg-pink-400" },
  BII:  { bg: "bg-slate-500/10",  text: "text-slate-300",  dot: "bg-slate-400" },
};

export const DT_TYPE_TO_CAT: Record<string, string> = {
  "Personal Names": "PII", "Email Addresses": "PII", "Telephone Numbers": "PII",
  "Postal Addresses": "PII", "Birthdates": "PII", "Gender": "PII", "Age": "PII",
  "IP Addresses": "PII", "MAC Addresses": "PII", "Domain Names": "PII", "URI Hosts": "PII",
  "UUIDs": "PII", "Nationality": "PII",
  "Social Security Numbers": "SPII", "Driver Licenses": "SPII", "National IDs": "SPII",
  "Passports": "SPII", "Taxpayer IDs": "SPII", "Voter Registration IDs": "SPII",
  "Ethnicity and Race": "PSI", "Marital Status": "PSI", "Religious Beliefs": "PSI",
  "Political Opinions": "PSI", "Sexual Orientation": "PSI", "Immigration Status": "PSI",
  "Payment Cards": "PCI",
  "Bank Account Information": "PFI", "Financial IDs": "PFI", "Currency": "PFI",
  "Securities IDs": "PFI", "Credit Scores": "PFI", "Income Information": "PFI",
  "Medical Records": "PHI", "Medical Diagnoses": "PHI", "Healthcare IDs": "PHI",
  "Healthcare Provider IDs": "PHI", "Health Insurance IDs": "PHI",
  "Biometric Data": "PHI", "Genetic Data": "PHI",
  "Passwords": "PAI", "Private Keys": "PAI", "Public Keys": "PAI",
  "Secrets and Tokens": "PAI", "Security Questions": "PAI", "MFA Seeds": "PAI",
  "Source Code": "BII", "Company Names": "BII", "Trade Secrets": "BII",
};

export interface SensitiveFileDetailPaneProps {
  name: string;
  path: string;
  store: string;
  storeSource: string;
  size: string;
  lastModified: string;
  dataTypes: string[];
}

// ── Helper: collapsible MetaRow section ──────────────────────────────────────

function CollapsibleRows({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1.5 group cursor-pointer"
      >
        <span className="text-muted-foreground/70 flex items-center gap-1" style={{ fontSize: "10px" }}>
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {label}
        </span>
        <span className="text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" style={{ fontSize: "10px" }}>
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && children}
    </>
  );
}

// ── Helper: MetaRow that supports long/wrapping values ──────────────────────

function MetaRowWrap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
        {label}
      </span>
      <span
        className="text-text-bright text-right font-mono break-all"
        style={{ fontSize: "11px", maxWidth: "65%" }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

// ── Mock data generators for the new fields ─────────────────────────────────

function generateFileExtendedMeta(name: string, store: string, storeSource: string) {
  const seed = name.length + store.length;
  const isCloud = ["Google Drive", "SharePoint", "OneDrive"].includes(storeSource);
  const isAws = storeSource.includes("AWS") || storeSource.includes("S3");
  const isAzure = storeSource.includes("Azure");

  const owners = [
    "developer@developers.kloudless.com",
    "admin@acme.com",
    "data-team@acme.com",
    "hr-service@acme.com",
    "finance-ops@acme.com",
  ];
  const fileOwner = owners[seed % owners.length];

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    parquet: "application/x-parquet",
    zip: "application/zip",
    json: "application/json",
    txt: "text/plain",
  };
  const fileType = mimeMap[ext] || `application/${ext || "octet-stream"}`;

  let fileId: string;
  if (isCloud) {
    const hash = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0).toString(36);
    fileId = `{"drive_id": null, "id": "${hash}Vn${seed}wClPiRW", "owner_id": "${1001881962746 + seed}"}`;
  } else if (isAws) {
    fileId = `arn:aws:s3:::${store}/${name}`;
  } else if (isAzure) {
    fileId = `https://${store}.blob.core.windows.net/${name}`;
  } else {
    fileId = `local://${store}/${name}`;
  }

  const exposures = ["Owner", "Internal", "External", "Anyone with link", "Private"];
  const exposure = exposures[seed % exposures.length];

  let fileUrl: string;
  if (isCloud && storeSource === "Google Drive") {
    fileUrl = `https://docs.google.com/spreadsheets/d/${seed}VnwClPiRW/edit`;
  } else if (isCloud && storeSource === "SharePoint") {
    fileUrl = `https://acme.sharepoint.com/sites/${store.replace(/\s/g, "")}/${name}`;
  } else if (isAws) {
    fileUrl = `s3://${store}/${name}`;
  } else if (isAzure) {
    fileUrl = `https://${store}.blob.core.windows.net/${name}`;
  } else {
    fileUrl = `file:///${store}/${name}`;
  }

  let parentObject: string;
  if (isCloud) {
    const parentHash = Array.from(store).reduce((a, c) => a + c.charCodeAt(0), 0).toString(36);
    parentObject = `{"drive_id": null, "id": "${parentHash}RyymhNzn", "owner_id": "${1001881962746 + seed}"}`;
  } else if (isAws) {
    parentObject = `arn:aws:s3:::${store}`;
  } else {
    parentObject = store;
  }

  const topLevelEntityId = fileOwner;

  const modifiers = [
    "developer@netskope.com",
    "admin@acme.com",
    "etl-pipeline@acme.com",
    "sarah.chen@acme.com",
    "backup-service@acme.com",
  ];
  const lastModifiedBy = modifiers[(seed + 1) % modifiers.length];

  const baseDate = new Date(2026, 2, 13, 12, 17, 0);
  const dateCreated = new Date(baseDate.getTime() - (seed * 86400000));
  const dateModified = new Date(dateCreated.getTime() + 60000);
  const lastEvaluated = new Date(dateModified.getTime() + 60000);
  const detailsUpdated = new Date(lastEvaluated.getTime() + 60000);

  const fmtDate = (d: Date) => {
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()} at ${String(d.getHours() % 12 || 12).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
  };

  let appSuite = "--";
  let application = storeSource;
  let appCategory = "Cloud Storage";
  let instanceName = "--";
  let region = "N/A";

  if (storeSource === "Google Drive") {
    appSuite = "Google App";
    application = "Google Drive";
    instanceName = "developers.kloudless.com";
  } else if (storeSource === "SharePoint") {
    appSuite = "Microsoft 365";
    application = "SharePoint Online";
    instanceName = "acme.sharepoint.com";
  } else if (isAws) {
    appSuite = "AWS";
    application = "Amazon S3";
    appCategory = "IaaS Object Storage";
    instanceName = store;
    region = ["us-east-1", "us-west-2", "eu-west-1"][seed % 3];
  } else if (isAzure) {
    appSuite = "Microsoft Azure";
    application = "Azure Blob Storage";
    appCategory = "IaaS Object Storage";
    instanceName = `${store}.blob.core.windows.net`;
    region = ["eastus", "westus2", "westeurope"][seed % 3];
  } else if (storeSource === "Endpoint") {
    appSuite = "--";
    application = "Local Filesystem";
    appCategory = "Endpoint";
    instanceName = store;
    region = "N/A";
  }

  return {
    fileOwner,
    fileOwnerDisplayName: "--",
    fileType,
    fileId,
    exposure,
    fileUrl,
    sensitivityLabelVendor: "--",
    sensitivityLabelInstance: "--",
    sensitivityLabel: "--",
    sensitivityLabelId: "--",
    parentObject,
    topLevelEntityId,
    lastModifiedBy,
    dateCreated: fmtDate(dateCreated),
    dateModified: fmtDate(dateModified),
    lastEvaluatedAgainstPolicy: fmtDate(lastEvaluated),
    detailsUpdated: fmtDate(detailsUpdated),
    exemptUntil: "--",
    appSuite,
    application,
    appCategory,
    instanceName,
    region,
  };
}

// ── Header metadata strip for SidePanel headerExtra slot ─────────────────────

/** Tiny floating tooltip that follows the anchor element */
function HeaderTooltip({
  anchor,
  children,
}: {
  anchor: HTMLElement | null;
  children: React.ReactNode;
}) {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  return (
    <div
      className="fixed z-[100] px-2.5 py-1.5 rounded-md bg-[#1a2236] border border-border shadow-lg pointer-events-none"
      style={{
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
        fontSize: "11px",
        maxWidth: 260,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

/** A single labeled cell in the header metadata strip */
function HeaderMetaCell({
  label,
  value,
  icon,
  accent,
  tooltip,
  className = "",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "warning" | "primary" | "muted";
  tooltip?: React.ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const valueColor =
    accent === "warning"
      ? "text-warning"
      : accent === "primary"
        ? "text-primary"
        : "text-text-bright";

  return (
    <div
      ref={ref}
      className={`relative flex flex-col gap-0.5 cursor-default ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="text-muted-foreground"
        style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.03em" }}
      >
        {label}
      </span>
      <span
        className={`flex items-center gap-1 truncate ${valueColor}`}
        style={{ fontSize: "12px", fontWeight: 500 }}
      >
        {icon}
        {value}
      </span>
      {tooltip && hovered && (
        <HeaderTooltip anchor={ref.current}>{tooltip}</HeaderTooltip>
      )}
    </div>
  );
}

export function SensitiveFileHeaderExtra({
  name,
  store,
  storeSource,
  size,
}: {
  name: string;
  store: string;
  storeSource: string;
  size: string;
}) {
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  const seed = name.length + store.length;

  // Resolve exposure
  const exposures = ["Owner", "Internal", "External", "Anyone with link", "Private"];
  const exposure = exposures[seed % exposures.length];
  const isRisky = exposure === "External" || exposure === "Anyone with link";

  // Platform icon
  const platformIcon =
    storeSource === "Google Drive" ? <Globe size={11} className="text-blue-400 shrink-0" /> :
    storeSource === "SharePoint" ? <Server size={11} className="text-sky-400 shrink-0" /> :
    storeSource.includes("AWS") || storeSource.includes("S3") ? <Database size={11} className="text-amber-400 shrink-0" /> :
    storeSource.includes("Azure") ? <Database size={11} className="text-sky-400 shrink-0" /> :
    storeSource === "Endpoint" ? <HardDrive size={11} className="text-slate-400 shrink-0" /> :
    <Database size={11} className="text-slate-400 shrink-0" />;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: "11px" }}>
      {/* Data Store + platform chip */}
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Data Store:</span>
        <span className="text-text-bright">{store}</span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground whitespace-nowrap">
          <span className="shrink-0 flex items-center" style={{ width: 11, height: 11 }}>{platformIcon}</span>
          <span style={{ fontSize: "10px" }}>{storeSource}</span>
        </span>
      </span>
      <span className="text-border">·</span>
      <span>
        <span className="text-muted-foreground">Type: </span>
        <span className="text-text-bright">{ext}</span>
      </span>
      <span className="text-border">·</span>
      <span>
        <span className="text-muted-foreground">Size: </span>
        <span className="text-text-bright">{size}</span>
      </span>
      <span className="text-border">·</span>
      <span>
        <span className="text-muted-foreground">Exposure: </span>
        <span className={isRisky ? "text-warning" : "text-text-bright"}>
          {isRisky && <Eye size={10} className="inline mr-0.5 -mt-px" />}
          {exposure}
        </span>
      </span>
    </div>
  );
}

export function SensitiveFileDetailPane({
  name, path, store, storeSource, size, lastModified, dataTypes,
}: SensitiveFileDetailPaneProps) {
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  const dataCategory = inferDataCategory(dataTypes);

  const meta = useMemo(
    () => generateFileExtendedMeta(name, store, storeSource),
    [name, store, storeSource],
  );

  const scanHistory = useMemo(
    () => generateScanHistory(name, dataCategory, dataTypes.slice(0, 5)),
    [name, dataCategory, dataTypes],
  );
  const accessHistory = useMemo(() => generateFileAccessHistory(name), [name]);
  const ACCESS_PAGE_SIZE = 5;
  const [accessPage, setAccessPage] = useState(0);
  const accessTotalPages = Math.ceil(accessHistory.length / ACCESS_PAGE_SIZE);
  const pagedAccess = accessHistory.slice(accessPage * ACCESS_PAGE_SIZE, (accessPage + 1) * ACCESS_PAGE_SIZE);

  // Scan filters
  // Scan filters (pill + dropdown pattern matching SaaS table)
  const [scanTypeFilter, setScanTypeFilter] = useState<string[]>([]);
  const [scanCatFilter, setScanCatFilter] = useState<string[]>([]);
  const hasActiveScanType = scanTypeFilter.length > 0;
  const hasActiveScanCat = scanCatFilter.length > 0;

  // Dropdown state
  const [scanDropdown, setScanDropdown] = useState<"scan-type" | "data-type" | null>(null);
  const [pendingScanType, setPendingScanType] = useState<string[]>([]);
  const [pendingScanCat, setPendingScanCat] = useState<string[]>([]);
  const scanDropdownRef = useRef<HTMLDivElement>(null);

  // Outside-click close
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

  const applyScanType = useCallback(() => {
    setScanTypeFilter(pendingScanType);
    setScanDropdown(null);
  }, [pendingScanType]);

  const applyScanCat = useCallback(() => {
    setScanCatFilter(pendingScanCat);
    setScanDropdown(null);
  }, [pendingScanCat]);

  const togglePendingScanType = useCallback((v: string) => {
    setPendingScanType((prev) => prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]);
  }, []);

  const togglePendingScanCat = useCallback((v: string) => {
    setPendingScanCat((prev) => prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]);
  }, []);

  // Collect available categories + scan type counts from scan history
  const scanTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { "at-rest": 0, "in-motion": 0 };
    for (const ev of scanHistory) counts[ev.type] = (counts[ev.type] || 0) + 1;
    return counts;
  }, [scanHistory]);

  const scanCatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of scanHistory) {
      const seenCats = new Set<string>();
      for (const f of ev.findings) {
        const cat = findingCategory(f);
        if (!seenCats.has(cat)) { seenCats.add(cat); counts[cat] = (counts[cat] || 0) + 1; }
      }
    }
    return counts;
  }, [scanHistory]);

  const scanAvailableCats = useMemo(() => Object.keys(scanCatCounts), [scanCatCounts]);

  const filteredScans = useMemo(() => {
    return scanHistory.filter((ev) => {
      if (hasActiveScanType && !scanTypeFilter.includes(ev.type)) return false;
      if (hasActiveScanCat && !ev.findings.some((f) => scanCatFilter.includes(findingCategory(f)))) return false;
      return true;
    });
  }, [scanHistory, scanTypeFilter, scanCatFilter, hasActiveScanType, hasActiveScanCat]);

  const SCAN_PAGE_SIZE = 5;
  const [scanPage, setScanPage] = useState(0);
  const scanTotalPages = Math.ceil(filteredScans.length / SCAN_PAGE_SIZE);
  const pagedScans = filteredScans.slice(scanPage * SCAN_PAGE_SIZE, (scanPage + 1) * SCAN_PAGE_SIZE);

  // Reset page when filters change
  const prevFilterRef = useRef({ scanTypeFilter, scanCatFilter });
  if (
    prevFilterRef.current.scanTypeFilter !== scanTypeFilter ||
    prevFilterRef.current.scanCatFilter !== scanCatFilter
  ) {
    prevFilterRef.current = { scanTypeFilter, scanCatFilter };
    if (scanPage !== 0) setScanPage(0);
  }

  const [expandedScans, setExpandedScans] = useState<Set<string>>(
    () => new Set(scanHistory.length > 0 ? [scanHistory[0].id] : []),
  );

  const toggleScan = (id: string) => {
    setExpandedScans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped = dataTypes.reduce<Record<string, string[]>>((acc, dt) => {
    const cat = DT_TYPE_TO_CAT[dt] ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(dt);
    return acc;
  }, {});

  return (
    <div className="px-4 py-4 space-y-5">

      {/* ── 1. File Information ── */}
      <div>
        <SectionHeader icon={FileText} label="File Information" timestamp={`Updated ${meta.detailsUpdated}`} />
        <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">
          {/* Key fields shown by default */}
          <MetaRowWrap label="Path" value={path} />
          <MetaRow label="Owner" value={meta.fileOwner} />
          <MetaRow label="Date Created" value={meta.dateCreated} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Last Modified</span>
            <span className="text-text-bright font-mono" style={{ fontSize: "11px" }}>
              {meta.dateModified} <span className="text-muted-foreground">by</span> {meta.lastModifiedBy}
            </span>
          </div>

          {/* Collapsible: Platform & Application */}
          <CollapsibleRows label="Platform & Application">
            <div className="divide-y divide-border/50">
              <MetaRow label="MIME Type" value={meta.fileType} />
              <MetaRow label="Application" value={meta.application} />
              <MetaRow label="App Suite" value={meta.appSuite} />
              <MetaRow label="App Category" value={meta.appCategory} />
              <MetaRow label="Instance Name" value={meta.instanceName} />
              <MetaRow label="Region" value={meta.region} />
            </div>
          </CollapsibleRows>

          {/* Collapsible: Identifiers & References */}
          <CollapsibleRows label="Identifiers & References">
            <div className="divide-y divide-border/50">
              <MetaRowWrap label="File ID" value={meta.fileId} />
              <MetaRowWrap label="File URL" value={meta.fileUrl} />
              <MetaRowWrap label="Parent Object" value={meta.parentObject} />
              <MetaRowWrap label="Top Level Entity ID" value={meta.topLevelEntityId} />
            </div>
          </CollapsibleRows>

          {/* Collapsible: Sensitivity Labels (moved from Policy & Compliance) */}
          <CollapsibleRows label="Sensitivity Labels">
            <div className="divide-y divide-border/50">
              <MetaRow label="Sensitivity Label" value={meta.sensitivityLabel} />
              <MetaRow label="Label Vendor" value={meta.sensitivityLabelVendor} />
              <MetaRow label="Label Instance" value={meta.sensitivityLabelInstance} />
              <MetaRow label="Label ID" value={meta.sensitivityLabelId} />
              <MetaRow label="Last Evaluated" value={meta.lastEvaluatedAgainstPolicy} />
              <MetaRow label="Exempt Until" value={meta.exemptUntil} />
            </div>
          </CollapsibleRows>
        </div>
      </div>

      {/* ── 2. File Access History ── */}
      <div>
        <SectionHeader icon={Clock} label="File Access History" timestamp="Updated Feb 24, 2026 09:14 AM" />
        <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
          <div
            className="grid grid-cols-[1fr_88px_100px] px-3 py-2 border-b border-border text-muted-foreground"
            style={{ fontSize: "10px", fontWeight: 500 }}
          >
            <span>User</span>
            <span>Activity</span>
            <span className="text-right">Date</span>
          </div>
          {pagedAccess.map((entry, i) => (
            <div
              key={`${accessPage}-${i}`}
              className="grid grid-cols-[1fr_88px_100px] px-3 py-1.5 text-foreground/80"
              style={{ fontSize: "11px" }}
            >
              <span className="flex items-center gap-1.5">
                <User size={10} className="text-muted-foreground" />
                {entry.user}
              </span>
              <span
                className={
                  entry.action === "Modified" ? "text-warning"
                  : entry.action === "Downloaded" || entry.action === "Shared" ? "text-primary"
                  : "text-muted-foreground"
                }
              >
                {entry.action}
              </span>
              <span className="text-muted-foreground text-right">{entry.date}</span>
            </div>
          ))}

        </div>
        {accessTotalPages > 1 && (
          <div className="mt-2">
            <PaginationBar
              page={accessPage}
              totalPages={accessTotalPages}
              pageSize={ACCESS_PAGE_SIZE}
              totalItems={accessHistory.length}
              onPageChange={setAccessPage}
              itemLabel="records"
            />
          </div>
        )}
      </div>

      {/* ── 3. Data Lineage ── */}
      <DataLineageSection
        fileName={name}
        filePath={path}
        store={store}
        storeSource={storeSource}
        fileSize={size}
      />

      {/* ── 4. Detected Sensitive Data Types ── */}
      <div>
        <SectionHeader icon={Shield} label={`Detected Sensitive Data Types (${dataTypes.length})`} />
        <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">
          {Object.entries(grouped).map(([cat, types]) => (
            <div key={cat} className="flex items-start gap-3 py-2">
              <span
                className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-surface-raised text-muted-foreground"
                style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", minWidth: "36px", justifyContent: "center" }}
              >
                {cat}
              </span>
              <div className="flex flex-wrap gap-1">
                {types.map((dt) => (
                  <span
                    key={dt}
                    className="inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap"
                    style={{ fontSize: "11px" }}
                  >
                    {dt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Scan History ── */}
      <div>
        <SectionHeader icon={Radar} label="Scan History" />

        {/* Filter pills row + dropdowns (SaaS table pattern) */}
        <div ref={scanDropdownRef} className="relative mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">

            {/* ── Scan Type pill ── */}
            {hasActiveScanType ? (
              <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                <button
                  type="button"
                  onClick={openScanTypePicker}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  <span className="text-primary/60" style={{ fontSize: "10px" }}>{"\u2297"}</span>
                  Scan Type
                  <span className="text-primary/50 mx-0.5">|</span>
                  <span className="truncate max-w-[80px]">
                    {scanTypeFilter.length === 1
                      ? (scanTypeFilter[0] === "at-rest" ? "At Rest" : "In Motion")
                      : `${scanTypeFilter.length} selected`}
                  </span>
                  <ChevronDown size={9} className="ml-0.5 opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={() => { setScanTypeFilter([]); setScanDropdown(null); }}
                  className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors cursor-pointer"
                  aria-label="Clear scan type filter"
                >
                  <X size={9} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openScanTypePicker}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors cursor-pointer ${
                  scanDropdown === "scan-type"
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "10px", fontWeight: 400 }}
              >
                <Plus size={9} />
                Scan Type
              </button>
            )}

            {/* ── Data Type pill ── */}
            {hasActiveScanCat ? (
              <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                <button
                  type="button"
                  onClick={openScanCatPicker}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  <span className="text-primary/60" style={{ fontSize: "10px" }}>{"\u2297"}</span>
                  Data Type
                  <span className="text-primary/50 mx-0.5">|</span>
                  <span className="truncate max-w-[80px]">
                    {scanCatFilter.length === 1
                      ? scanCatFilter[0]
                      : `${scanCatFilter.length} selected`}
                  </span>
                  <ChevronDown size={9} className="ml-0.5 opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={() => { setScanCatFilter([]); setScanDropdown(null); }}
                  className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors cursor-pointer"
                  aria-label="Clear data type filter"
                >
                  <X size={9} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openScanCatPicker}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors cursor-pointer ${
                  scanDropdown === "data-type"
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "10px", fontWeight: 400 }}
              >
                <Plus size={9} />
                Data Type
              </button>
            )}

            {/* Count label (right side) */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                {filteredScans.length}
                {(hasActiveScanType || hasActiveScanCat) ? ` of ${scanHistory.length}` : ""}{" "}
                scan{filteredScans.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── Scan Type dropdown ── */}
          {scanDropdown === "scan-type" && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Scan Type</span>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {([["at-rest", "At Rest"], ["in-motion", "In Motion"]] as const).map(([val, label]) => {
                  const count = scanTypeCounts[val] ?? 0;
                  const checked = pendingScanType.includes(val);
                  return (
                    <label
                      key={val}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePendingScanType(val)}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{label}</span>
                      <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                    </label>
                  );
                })}
              </div>
              <div className="px-3 py-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={applyScanType}
                  className="w-full py-1.5 rounded-lg bg-primary text-white transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* ── Data Type dropdown ── */}
          {scanDropdown === "data-type" && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {scanAvailableCats.map((cat) => {
                  const count = scanCatCounts[cat] ?? 0;
                  if (count === 0) return null;
                  const checked = pendingScanCat.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePendingScanCat(cat)}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{cat}</span>
                      <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                    </label>
                  );
                })}
              </div>
              <div className="px-3 py-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={applyScanCat}
                  className="w-full py-1.5 rounded-lg bg-primary text-white transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {filteredScans.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground" style={{ fontSize: "11px" }}>
            No scans match the current filters
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {pagedScans.map((event) => (
                <ScanCard
                  key={event.id}
                  event={event}
                  isExpanded={expandedScans.has(event.id)}
                  onToggle={() => toggleScan(event.id)}
                  fileName={name}
                />
              ))}
            </div>

            {/* Scan pagination */}
            {scanTotalPages > 1 && (
              <div className="mt-2">
                <PaginationBar
                  page={scanPage}
                  totalPages={scanTotalPages}
                  pageSize={SCAN_PAGE_SIZE}
                  totalItems={filteredScans.length}
                  onPageChange={setScanPage}
                  itemLabel="scans"
                />
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}