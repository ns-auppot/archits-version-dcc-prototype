import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import LightBgGDrive from "../../../imports/LightBgGDrive";
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
  ArrowRight,
  Globe,
  AppWindow,
  HardDrive,
  Server,
  X,
  Plus,
  MoreVertical,
  Share2,
  Search,
  RefreshCw,
  Users,
} from "lucide-react";
import { TablePagination } from "../ui/table-pagination";
import { RestrictAccessConfig } from "../risk/config-panels";
import { SidePanel } from "./SidePanel";
import { generateLineageData, LineageDetailPanelContent } from "./DataLineageMini";

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

  const primaryType = entityTypes?.[0] || "";
  let raw = ENTITY_TYPE_SAMPLES[primaryType];

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

  if (!raw) {
    raw = [
      "value_001", "value_002", "value_003", "value_004",
      "value_005", "NULL", "value_007", "value_008",
    ];
  }

  for (const v of raw) {
    values.push({ value: v, isSensitive: v !== "NULL" });
  }
  while (values.length < 20) {
    const src = raw[values.length % raw.length];
    values.push({ value: src, isSensitive: src !== "NULL" });
  }
  return values;
}

// ── Scan History mock data ────────────────────────────────────────────────────

type UserActivityAction = "Uploaded" | "Downloaded" | "Viewed" | "Shared" | "Created" | "Edited" | "Copied";
type NetskopeScanKind = "Discovery scan" | "Targeted scan";
type PolicyAction = "Blocked" | "Quarantine" | "Alerted";

interface ScanEvent {
  id: string;
  type: "in-motion" | "at-rest" | "view";
  timestamp: string;
  actor?: string;
  /** User-type pill shown in the expanded detail (e.g. "Internal user") */
  userType?: string;
  /** Verb badge for User Activity rows */
  action?: UserActivityAction;
  /** Short summary line (collapsed). Falls back to action + destination if absent. */
  activity?: string;
  destination?: string;
  scanKind?: NetskopeScanKind;
  /** Specific scan instance name shown in the expanded scan detail */
  scanName?: string;
  /** When set, the row gets a [policy-action] tag and the expanded card shows Policy fields. */
  policyAction?: PolicyAction;
  policyName?: string;
  findings: string[];
  dataCategory: string;
}

function generateScanHistory(fileName: string, dataCategory: string, entityTypesOverride?: string[]): ScanEvent[] {
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
      userType: "Internal user",
      action: "Uploaded",
      activity: "Uploaded to external shared drive",
      destination: "Google Drive shared-reports/",
      findings: entityTypes.slice(0, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-2`,
      type: "at-rest",
      timestamp: "Feb 22, 2026 02:30 AM",
      scanKind: "Targeted scan",
      scanName: "Weekly PII sweep — SaaS drives",
      findings: entityTypes.slice(0, Math.min(4, entityTypes.length)),
      dataCategory,
    },
    {
      id: `${fileName}-scan-3`,
      type: "in-motion",
      timestamp: "Feb 18, 2026 04:47 PM",
      actor: "marcus.j",
      userType: "Internal user",
      action: "Downloaded",
      activity: "Downloaded via API to external endpoint",
      destination: "api.partner.io/ingest",
      policyAction: "Blocked",
      policyName: "Block Uploads for SAAS",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-4`,
      type: "at-rest",
      timestamp: "Feb 10, 2026 01:00 AM",
      scanKind: "Targeted scan",
      scanName: "Credit card exposure — Finance share",
      findings: entityTypes.slice(1, 4),
      dataCategory,
    },
    {
      id: `${fileName}-scan-5`,
      type: "at-rest",
      timestamp: "Jan 15, 2026 12:00 PM",
      scanKind: "Discovery scan",
      scanName: "Initial enterprise discovery",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-6`,
      type: "in-motion",
      timestamp: "Jan 10, 2026 11:22 AM",
      actor: "emily.d",
      userType: "Internal user",
      action: "Shared",
      activity: "Shared via email to External user",
      destination: "partner-reports@acme.co",
      findings: entityTypes.slice(0, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-7`,
      type: "at-rest",
      timestamp: "Jan 5, 2026 03:00 AM",
      scanKind: "Targeted scan",
      scanName: "Source code & secrets sweep",
      findings: entityTypes.slice(1, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-8`,
      type: "in-motion",
      timestamp: "Dec 28, 2025 02:15 PM",
      actor: "d.park",
      userType: "Internal user",
      action: "Copied",
      activity: "Copied to external S3 bucket",
      destination: "ext-backup-prod/quarterly/",
      findings: entityTypes.slice(0, 4),
      dataCategory,
    },
    {
      id: `${fileName}-scan-9`,
      type: "in-motion",
      timestamp: "Dec 22, 2025 04:18 PM",
      actor: "anubhav.g+web",
      userType: "External user",
      action: "Edited",
      activity: "Edited document",
      destination: "anubhav.g+web@netskope.com",
      policyAction: "Quarantine",
      policyName: "Quarantine External Edits",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-10`,
      type: "in-motion",
      timestamp: "Dec 12, 2025 09:33 AM",
      actor: "l.wang",
      userType: "Internal user",
      action: "Downloaded",
      activity: "Downloaded locally to workstation",
      destination: "/Users/l.wang/Downloads/",
      findings: entityTypes.slice(0, 2),
      dataCategory,
    },
    {
      id: `${fileName}-scan-11`,
      type: "at-rest",
      timestamp: "Dec 1, 2025 02:00 AM",
      scanKind: "Targeted scan",
      scanName: "Healthcare records audit",
      findings: entityTypes.slice(0, 3),
      dataCategory,
    },
    {
      id: `${fileName}-scan-12`,
      type: "at-rest",
      timestamp: "Nov 15, 2025 12:00 PM",
      scanKind: "Discovery scan",
      scanName: "Quarterly full-content rescan",
      findings: entityTypes.slice(0, 1),
      dataCategory,
    },
  ];

  if (seed < 10) return events.slice(0, 5);
  if (seed < 15) return events.slice(0, 8);
  return events;
}

// ── SaaS View-only events (no scan, no findings, no forensics) ───────────────

const _SAAS_VIEW_POOL = [
  { actor: "sarah.chen",  timestamp: "Feb 20, 2026 02:31 PM" },
  { actor: "emily.d",     timestamp: "Feb 14, 2026 10:08 AM" },
  { actor: "j.wilson",    timestamp: "Jan 20, 2026 03:44 PM" },
  { actor: "r.anderson",  timestamp: "Jan 8, 2026 11:17 AM" },
  { actor: "d.park",      timestamp: "Dec 15, 2025 09:52 AM" },
];

export function generateSaaSViewEvents(fileName: string): ScanEvent[] {
  const seed = fileName.length % _SAAS_VIEW_POOL.length;
  return _SAAS_VIEW_POOL.map((_, i) => {
    const entry = _SAAS_VIEW_POOL[(seed + i) % _SAAS_VIEW_POOL.length];
    return {
      id: `${fileName}-view-${i + 1}`,
      type: "view" as const,
      timestamp: entry.timestamp,
      actor: entry.actor,
      userType: "Internal user",
      action: "Viewed" as const,
      findings: [],
      dataCategory: "",
    };
  });
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
                      {dataCategory ? <HighlightedLine line={line} dataType={dataCategory} /> : <span className="text-foreground/70">{line || "\u00A0"}</span>}
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
  PII:  { bg: "bg-blue-500/15",    text: "text-blue-300"    },
  SPII: { bg: "bg-red-500/15",     text: "text-red-300"     },
  PSI:  { bg: "bg-orange-500/15",  text: "text-orange-300"  },
  PCI:  { bg: "bg-yellow-500/15",  text: "text-yellow-300"  },
  PFI:  { bg: "bg-emerald-500/15", text: "text-emerald-300" },
  PHI:  { bg: "bg-cyan-500/15",    text: "text-cyan-300"    },
  PAI:  { bg: "bg-purple-500/15",  text: "text-purple-300"  },
  BII:  { bg: "bg-pink-500/15",    text: "text-pink-300"    },
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

// ── Scan timeline node component ─────────────────────────────────────────────

function ScanCard({
  event,
  isExpanded,
  onToggle,
  fileName,
  isFirst,
  isLast,
}: {
  event: ScanEvent;
  isExpanded: boolean;
  onToggle: () => void;
  fileName: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isMotion = event.type === "in-motion";
  const isView   = event.type === "view";

  const dotStyles = isView
    ? "bg-teal-500/20 border-teal-500/50"
    : isMotion
    ? "bg-warning/20 border-warning/50"
    : "bg-primary/20 border-primary/50";
  const iconCls = isView ? "text-teal-400/70" : isMotion ? "text-warning/70" : "text-primary/70";

  return (
    <div className="relative flex gap-0">
      {/* Timeline rail */}
      <div className="flex flex-col items-center" style={{ width: "28px", minWidth: "28px" }}>
        <div className={`w-px flex-none ${isFirst ? "bg-transparent" : "bg-border"}`} style={{ height: "8px" }} />
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none ${dotStyles}`}>
          {isView ? (
            <Eye size={8} className={iconCls} />
          ) : isMotion ? (
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
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                        isView
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : isMotion
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                      style={{ fontWeight: 600 }}
                    >
                      {isView ? "View" : isMotion ? "Scan- In Motion" : "Scan- At Rest"}
                    </span>
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                      {event.timestamp}
                    </span>
                  </div>

                  <div className="text-foreground/80 mt-1" style={{ fontSize: "11px" }}>
                    {isView ? (
                      <span className="text-text-bright" style={{ fontWeight: 500 }}>{event.actor}</span>
                    ) : isMotion ? (
                      <>
                        <span className="text-text-bright" style={{ fontWeight: 500 }}>{event.actor}</span>
                        {" — "}
                        <span>{event.activity}</span>
                        {event.destination && (
                          <>
                            <span className="mx-1 text-muted-foreground/35" style={{ fontSize: "10px" }}>→</span>
                            <span>{event.destination}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{event.scanKind}</span>
                    )}
                  </div>

                  {/* Entity type chips �� hidden for View events */}
                  {!isView && event.findings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {event.findings.map((f) => (
                        <span
                          key={f}
                          className="px-1.5 py-0.5 bg-surface-raised border border-border rounded text-text-bright"
                          style={{ fontSize: "10px" }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground/70 transition-colors">
                  <ChevronRight size={12} className="group-open/details:rotate-90 transition-transform duration-150" />
                </div>
              </div>
            </summary>

            {/* Expanded detail rows */}
            <div className="mt-2 ml-0.5 space-y-0.5 pb-1">
              {isView && (
                <>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>User</span>
                    <span className="text-foreground/70">{event.actor || "\u2014"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Timestamp</span>
                    <span className="text-foreground/70">{event.timestamp}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Data Match</span>
                    <span className="text-muted-foreground italic">No data types matched</span>
                  </div>
                </>
              )}
              {isMotion && (
                <>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>User</span>
                    <span className="text-foreground/70">{event.actor || "\u2014"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Activity</span>
                    <span className="text-foreground/70">{event.activity || "\u2014"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Destination</span>
                    <span className="text-foreground/70">{event.destination || "\u2014"}</span>
                  </div>
                  <div className="flex gap-2" style={{ fontSize: "10px" }}>
                    <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Timestamp</span>
                    <span className="text-foreground/70">{event.timestamp}</span>
                  </div>
                </>
              )}

              {/* Forensics viewer — suppressed for View events (no sensitive data) */}
              {!isView && <InlineForensicsViewer key={event.id} fileName={fileName} dataCategory={event.dataCategory} />}
            </div>
          </details>
        </div>
      </div>
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
  action,
}: {
  icon: typeof FileText;
  label: string;
  timestamp?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      
      <div className="flex items-center gap-2">
        {action}
        {timestamp && (
          <span className="text-muted-foreground/60" style={{ fontSize: "10px" }}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

export function FileDetailPane({ file }: FileDetailProps) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKb = Math.floor(12 + file.name.length * 3.7);
  const scanHistory = useMemo(() => generateScanHistory(file.name, file.dataTypes), [file.name, file.dataTypes]);

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

      {/* ── Part 2: Column Activity ── */}
      <div>
        <SectionHeader icon={Clock} label="Column Activity" timestamp="Updated Feb 24, 2026 09:14 AM" />
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
          {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""}
          {" \u2014 "}
          most recent first
        </div>
        <div className="px-5 py-2">
          <div className="space-y-0">
            {scanHistory.map((event, idx) => (
              <ScanCard
                key={event.id}
                event={event}
                isExpanded={expandedScans.has(event.id)}
                onToggle={() => toggleScan(event.id)}
                fileName={file.name}
                isFirst={idx === 0}
                isLast={idx === scanHistory.length - 1}
              />
            ))}
          </div>
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

// ── Field scan timeline node component ───────────────────────────────────────

function FieldScanCard({
  event,
  isExpanded,
  onToggle,
  fieldName,
  dataType,
  isFirst,
  isLast,
}: {
  event: FieldScanEvent;
  isExpanded: boolean;
  onToggle: () => void;
  fieldName: string;
  dataType: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const columnValues = useMemo(
    () => (isExpanded ? generateMockColumnValues(fieldName, dataType, event.findings) : []),
    [isExpanded, fieldName, dataType, event.findings],
  );

  const colName = fieldName.includes(".") ? fieldName.split(".").pop()! : fieldName;

  const dotStyles = "bg-primary/20 border-primary/50";
  const iconCls = "text-primary/70";

  return (
    <div className="relative flex gap-0">
      {/* Timeline rail */}
      <div className="flex flex-col items-center" style={{ width: "28px", minWidth: "28px" }}>
        <div className={`w-px flex-none ${isFirst ? "bg-transparent" : "bg-border"}`} style={{ height: "8px" }} />
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none ${dotStyles}`}>
          <Radar size={8} className={iconCls} />
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
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-primary/10 text-primary border border-primary/20"
                      style={{ fontWeight: 600 }}
                    >
                      At Rest
                    </span>
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                      {event.timestamp}
                    </span>
                  </div>

                  <div className="text-foreground/80 mt-1" style={{ fontSize: "11px" }}>
                    <span style={{ fontWeight: 500 }}>{event.scanKind}</span>
                  </div>

                  {/* Entity type chips */}
                  {event.findings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {event.findings.map((f) => (
                        <span
                          key={f}
                          className="px-1.5 py-0.5 bg-surface-raised border border-border rounded text-text-bright"
                          style={{ fontSize: "10px" }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground/70 transition-colors">
                  <ChevronRight size={12} className="group-open/details:rotate-90 transition-transform duration-150" />
                </div>
              </div>
            </summary>

            {/* Expanded detail rows */}
            <div className="mt-2 ml-0.5 pb-1">
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
          </details>
        </div>
      </div>
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
        <SectionHeader icon={Table2} label="Column Metadata" timestamp="Updated Feb 24, 2026 02:30 AM" />
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
          {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""}
          {" \u2014 "}
          most recent first
        </div>
        <div className="px-5 py-2">
          <div className="space-y-0">
            {scanHistory.map((event, idx) => (
              <FieldScanCard
                key={event.id}
                event={event}
                isExpanded={expandedScans.has(event.id)}
                onToggle={() => toggleScan(event.id)}
                fieldName={field.name}
                dataType={field.dataType}
                isFirst={idx === 0}
                isLast={idx === scanHistory.length - 1}
              />
            ))}
          </div>
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

export function generateFileAccessHistory(fileName: string) {
  const seed = fileName.length % _ACCESS_USERS.length;
  const count = 15 + (fileName.length % 6);
  return Array.from({ length: count }, (_, i) => {
    const idx = (seed + i) % _ACCESS_USERS.length;
    const dateIdx = i % _ACCESS_DATES.length;
    return { user: _ACCESS_USERS[idx][0], action: _ACCESS_USERS[idx][1], date: _ACCESS_DATES[dateIdx] };
  });
}

export const DT_CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PII:  { bg: "bg-blue-500/10",    text: "text-blue-300",    dot: "bg-blue-400" },
  SPII: { bg: "bg-red-500/10",     text: "text-red-300",     dot: "bg-red-400" },
  PSI:  { bg: "bg-orange-500/10",  text: "text-orange-300",  dot: "bg-orange-400" },
  PCI:  { bg: "bg-yellow-500/10",  text: "text-yellow-300",  dot: "bg-yellow-400" },
  PFI:  { bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-400" },
  PHI:  { bg: "bg-cyan-500/10",    text: "text-cyan-300",    dot: "bg-cyan-400" },
  PAI:  { bg: "bg-purple-500/10",  text: "text-purple-300",  dot: "bg-purple-400" },
  BII:  { bg: "bg-pink-500/10",    text: "text-pink-300",    dot: "bg-pink-300" },
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
  hideAtRestScans?: boolean;
  saasMode?: boolean;
  unmanagedMode?: boolean;
  onSelectIdentity?: (id: FileAccessIdentity) => void;
}

// ── File Side Panel Vertical Tabs ────────────────────────────────────────────

type FilePanelTab = "basic" | "activity";

interface FilePanelTabDef {
  id: FilePanelTab;
  label: string;
  icon: typeof FileText;
}

const FILE_PANEL_TABS: FilePanelTabDef[] = [
  { id: "basic", label: "Basic Information", icon: FileText },
  { id: "activity", label: "Activity", icon: Clock },
];

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
  const lastAccessed = new Date(dateCreated.getTime() + (seed % 5 + 1) * 3600000);
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

  // ── Unmanaged-destination-specific fields ────────────────────────────────
  const objectTypeMap: Record<string, string> = {
    xlsx: "Spreadsheet", csv: "Spreadsheet", parquet: "Spreadsheet",
    pdf: "Document", docx: "Document", pptx: "Presentation",
    zip: "Archive", json: "Data File", txt: "Text File",
  };
  const objectType = objectTypeMap[ext] || "File";

  const fileCategoryMap: Record<string, string> = {
    xlsx: "Office Document", csv: "Data Export", parquet: "Analytics Data",
    pdf: "PDF Document", docx: "Office Document", pptx: "Office Document",
    zip: "Compressed Archive", json: "Structured Data", txt: "Plain Text",
  };
  const fileCategory = fileCategoryMap[ext] || "Unknown";

  const languageMap: Record<string, string> = {
    json: "JSON", csv: "CSV", txt: "Plain Text",
    xlsx: "-", pdf: "-", docx: "-", pptx: "-", zip: "-", parquet: "-",
  };
  const fileLanguage = languageMap[ext] || "-";

  const hex = (len: number, s: number) =>
    Array.from({ length: len }, (_, i) => ((s * 31 + i * 17) % 256).toString(16).padStart(2, "0")).join("");
  const md5  = hex(16, seed);
  const sha256 = hex(32, seed + 7);

  const objectId = fileId;

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
    lastAccessed: fmtDate(lastAccessed),
    dateModified: fmtDate(dateModified),
    lastEvaluatedAgainstPolicy: fmtDate(lastEvaluated),
    detailsUpdated: fmtDate(detailsUpdated),
    exemptUntil: "--",
    appSuite,
    application,
    appCategory,
    instanceName,
    region,
    // unmanaged-specific
    objectId,
    objectType,
    fileCategory,
    fileLanguage,
    md5,
    sha256,
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

  const exposures = ["Owner", "Internal", "External", "Anyone with link", "Private"];
  const exposure = exposures[seed % exposures.length];
  const isRisky = exposure === "External" || exposure === "Anyone with link";

  const platformIcon =
    storeSource === "Google Drive" ? <span className="shrink-0 inline-block" style={{ width: 13, height: 13 }}><LightBgGDrive /></span> :
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

// ── File Actions Menu Component ──────────────────────────────────────────────

export function FileActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const actionGroups: { category: string; items: string[] }[] = [
    {
      category: "Access Control",
      items: [
        "Restrict Access",
        "Revoke Public Sharing",
        "Revoke Company-wide Sharing",
        "Revoke Access from Specific Domains",
        "Revoke Access from Specific Users",
        "Remove User Added at the File Level",
        "Change Ownership",
        "SharePoint/OneDrive: Revoke EEEU sharing",
      ],
    },
    {
      category: "File Control",
      items: [
        "Disable Print & Download",
        "Set Link Expiration Date",
        "Restrict Sharing to View Only",
      ],
    },
  ];

  const handleItem = (item: string) => {
    setIsOpen(false);
    if (item === "Restrict Access") {
      setActiveModal("restrict-access");
    }
  };

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-foreground hover:bg-muted transition-colors"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <MoreVertical size={14} />
          Actions
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-[260px] bg-card border border-border rounded-lg shadow-xl z-50 overflow-y-auto"
            style={{ maxHeight: "480px" }}
          >
            <div className="py-1.5">
              {actionGroups.map((group) => (
                <div key={group.category}>
                  <p style={{
                    fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.06em", color: "var(--color-muted-foreground)",
                    padding: "8px 16px 4px",
                  }}>
                    {group.category}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleItem(item)}
                      onMouseEnter={() => setHoveredId(item)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="w-full flex items-center px-6 py-2 text-left transition-colors"
                      style={{
                        background: hoveredId === item ? "var(--color-muted)" : "transparent",
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 400 }}>{item}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restrict Access modal */}
      {activeModal === "restrict-access" && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
        >
          <div className="bg-card border border-border rounded-lg shadow-xl flex flex-col" style={{ width: 480, maxHeight: "80vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Restrict Access</h3>
                <p className="text-muted-foreground" style={{ fontSize: "11px", marginTop: 2 }}>Applying to this file</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="rounded p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <RestrictAccessConfig />
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded border transition-colors hover:bg-muted"
                style={{ fontSize: "12px", borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded bg-primary text-white transition-opacity hover:opacity-90"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}


function generateSharingRows(name: string) {
  const seed = name.length;
  const pools: Array<{ sharedWith: string; permission: string }> = [
    { sharedWith: "dsen_test Owners",                       permission: "Owner" },
    { sharedWith: "dsen_test Visitors",                     permission: "Read"  },
    { sharedWith: "dsen_test Members",                      permission: "Write" },
    { sharedWith: "SharePoint Administrator",               permission: "Owner" },
    { sharedWith: "dsen_test@nskloudless.onmicrosoft.com",  permission: "Owner" },
    { sharedWith: "j.smith@acme.corp",                      permission: "Write" },
    { sharedWith: "marketing-team@acme.corp",               permission: "Read"  },
    { sharedWith: "finance-analysts@acme.corp",             permission: "Read"  },
    { sharedWith: "sarah.jones@acme.corp",                  permission: "Editor"},
    { sharedWith: "Everyone (org-wide link)",               permission: "Viewer"},
  ];
  // Deterministic shuffle based on name
  const shuffled = [...pools].sort((a, b) =>
    ((a.sharedWith.charCodeAt(0) + seed) % 7) - ((b.sharedWith.charCodeAt(0) + seed) % 7)
  );
  return shuffled.slice(0, 5 + (seed % 4));
}

// ── Snippet generation ────────────────────────────────────────────────────────

const SNIPPET_POOLS: Record<string, string[]> = {
  "Personal Names":    ["James Garza", "Bryan Harris", "Aaron Jones", "Anthony Carter", "Brian Mercado", "Tony Flores"],
  "Email Addresses":   ["james.garza@example.org", "christopher.brown@example.com", "bryan.harris@example.net"],
  "Telephone Numbers": ["(555) 291-8402", "(555) 738-1920", "(555) 493-7265", "(555) 612-0037"],
  "Postal Addresses":  ["35315 Audrey Vista North Margaretview, CA 65032", "007 Crawford Unions Suite 678 Martinbury, DC 95550", "5851 Kristen Well Suite 012 Brownbury, CA 53134"],
  "Social Security Numbers": ["284-39-1029", "193-47-8821", "847-22-5510", "502-91-3847"],
  "Payment Cards":     ["4111-1111-1111-1111", "5500-0000-0000-0004", "3714-496353-98431"],
  "IP Addresses":      ["192.168.1.45", "10.0.0.127", "172.16.254.1", "203.0.113.42"],
  "Source Code":       ["function auth(token) { return verify(token, SECRET_KEY); }", "const API_KEY = process.env.API_KEY;", "db.execute(`SELECT * FROM users WHERE id=${userId}`)"],
  "Company Names":     ["Acme Corp", "Kloudless Inc", "Netskope Ltd", "DataBridge Solutions"],
  "Medical Records":   ["Diagnosis: Type 2 Diabetes (ICD-10: E11)", "Patient ID: MRN-84729, Condition: Hypertension", "CPT: 99213 - Office Visit"],
  "Bank Account Information": ["IBAN: GB29 NWBK 6016 1331 9268 19", "Account: 8382-4910, Routing: 021000021"],
  "Private Keys":      ["-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...", "-----BEGIN EC PRIVATE KEY-----\nMHQCAQEEI..."],
  "Passwords":         ["password=Sup3rS3cr3t!", "passwd: $2b$12$abc123...", "pwd=admin@123"],
  "Birthdates":        ["1985-03-22", "1992-07-14", "1978-11-05", "2001-01-30"],
};

function generateSnippets(fileName: string, selectedTypes: string[]): { label: string; rows: string[] }[] {
  const seed = fileName.length;
  return selectedTypes.map((dt) => {
    const pool = SNIPPET_POOLS[dt] ?? [`Sample ${dt} value 1`, `Sample ${dt} value 2`, `Sample ${dt} value 3`];
    const start = seed % pool.length;
    const rows = Array.from({ length: Math.min(4 + (seed % 3), pool.length) }, (_, i) => `"${pool[(start + i) % pool.length]}"`);
    return { label: dt, rows };
  });
}

// ── Snippets Selection Modal ──────────────────────────────────────────────────

function SnippetSelectionModal({
  fileName,
  store,
  dataTypes,
  grouped,
  onClose,
  onFetch,
}: {
  fileName: string;
  store: string;
  dataTypes: string[];
  grouped: Record<string, string[]>;
  onClose: () => void;
  onFetch: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const allTypes = dataTypes;
  const allChecked = allTypes.length > 0 && allTypes.every((dt) => selected.includes(dt));
  const someChecked = allTypes.some((dt) => selected.includes(dt));

  const toggleAll = () => {
    setSelected(allChecked ? [] : [...allTypes]);
  };

  const toggleType = (dt: string) =>
    setSelected((prev) => prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt]);

  const toggleCat = (types: string[]) => {
    const allSelected = types.every((dt) => selected.includes(dt));
    setSelected((prev) =>
      allSelected ? prev.filter((x) => !types.includes(x)) : [...prev.filter((x) => !types.includes(x)), ...types]
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onMouseDown={(e) => e.nativeEvent.stopPropagation()} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-lg border border-border shadow-xl overflow-hidden" style={{ background: "var(--color-card)", width: 380, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span style={{ fontSize: "14px", fontWeight: 700 }} className="text-foreground">Select Snippets Option</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>

        {/* Category + type list */}
        <div className="overflow-y-auto flex-1 py-3">
          {/* Select All */}
          <div className="px-4 mb-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={toggleAll}
                style={{ width: 13, height: 13, accentColor: "var(--color-primary)", cursor: "pointer" }}
              />
              <span style={{ fontSize: "11px", fontWeight: 600 }} className="text-foreground">Select All</span>
            </label>
          </div>

          {Object.entries(grouped).map(([cat, types]) => {
            const catAllChecked = types.every((dt) => selected.includes(dt));
            const catSomeChecked = types.some((dt) => selected.includes(dt));
            return (
              <div key={cat} className="px-4 mb-3">
                {/* Category row */}
                <label className="flex items-center gap-2.5 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={catAllChecked}
                    ref={(el) => { if (el) el.indeterminate = catSomeChecked && !catAllChecked; }}
                    onChange={() => toggleCat(types)}
                    style={{ width: 13, height: 13, accentColor: "var(--color-primary)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "11px", fontWeight: 600 }} className="text-muted-foreground">{cat}</span>
                </label>
                {/* Individual types */}
                <div className="pl-5 flex flex-col gap-1">
                  {types.map((dt) => (
                    <label key={dt} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(dt)}
                        onChange={() => toggleType(dt)}
                        style={{ width: 13, height: 13, accentColor: "var(--color-primary)", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "11px" }} className="text-foreground">{dt}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-1.5 rounded border border-border text-foreground/70 hover:bg-surface-raised hover:text-foreground transition-colors" style={{ fontSize: "12px" }}>
            Close
          </button>
          <button
            onClick={() => onFetch(selected)}
            disabled={selected.length === 0}
            className="px-4 py-1.5 rounded text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: "12px", background: "var(--color-primary)" }}
          >
            Fetch snippets
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Snippets Results Modal ────────────────────────────────────────────────────

function SnippetResultsModal({
  fileName,
  store,
  snippets,
  onClose,
  onRefetch,
}: {
  fileName: string;
  store: string;
  snippets: { label: string; rows: string[] }[];
  onClose: () => void;
  onRefetch: () => void;
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Flatten all rows with their group label for filtering/pagination
  const allRows = useMemo(() =>
    snippets.flatMap(({ label, rows }) => rows.map((row, i) => ({ label, row, key: `${label}-${i}` }))),
    [snippets]
  );

  const filteredRows = useMemo(() =>
    search ? allRows.filter((r) =>
      r.row.toLowerCase().includes(search.toLowerCase()) ||
      r.label.toLowerCase().includes(search.toLowerCase())
    ) : allRows,
    [allRows, search]
  );

  const totalRows = filteredRows.length;
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onMouseDown={(e) => e.nativeEvent.stopPropagation()} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-lg border border-border shadow-xl overflow-hidden" style={{ background: "var(--color-card)", width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span style={{ fontSize: "14px", fontWeight: 700 }} className="text-foreground">Snippets</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefetch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-foreground/70 hover:bg-surface-raised hover:text-foreground transition-colors"
              style={{ fontSize: "11px" }}
            >
              <RefreshCw size={11} />
              Refetch
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* File meta */}
        <div className="px-5 py-2.5 border-b border-border flex items-center gap-6">
          <div>
            <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Filename</div>
            <div className="text-foreground font-mono" style={{ fontSize: "11px" }}>{fileName}</div>
          </div>
          <div>
            <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Data Store</div>
            <div className="text-foreground" style={{ fontSize: "11px" }}>{store}</div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-surface-raised">
            <Search size={11} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search snippets..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
              style={{ fontSize: "11px" }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {/* Table header */}
          <div className="grid grid-cols-[180px_1fr] border-b border-border bg-surface-raised/60 px-4 py-2">
            <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>Data Type</span>
            <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>Snippet Value</span>
          </div>
          {/* Table rows */}
          {pageRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground/50" style={{ fontSize: "11px" }}>No results</div>
          ) : (
            pageRows.map((item, i) => (
              <div
                key={item.key}
                className={`grid grid-cols-[180px_1fr] px-4 py-2.5 border-b border-border/50 ${i % 2 === 0 ? "" : "bg-surface-raised/30"}`}
              >
                <span
                  className="text-muted-foreground truncate pr-3"
                  style={{ fontSize: "11px" }}
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="text-foreground/80 font-mono truncate" style={{ fontSize: "11px" }}>
                  {item.row}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>,
    document.body
  );
}

interface FileAccessIdentity { username: string; permission: string; identityType: string; }

function generateFileAccessIdentities(name: string, store: string): FileAccessIdentity[] {
  const seed = Array.from(name + store).reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool: FileAccessIdentity[] = [
    { username: "app-backend",   permission: "Read",             identityType: "Service Account" },
    { username: "john.smith",    permission: "Read / Write",     identityType: "Internal user"   },
    { username: "sarah.chen",    permission: "Read",             identityType: "Internal user"   },
    { username: "etl-pipeline",  permission: "Read / Write",     identityType: "Service Account" },
    { username: "analyst-bot",   permission: "Read",             identityType: "Service Account" },
    { username: "marcus.j",      permission: "Read",             identityType: "Internal user"   },
    { username: "data-team",     permission: "Read / Write",     identityType: "Group"           },
    { username: "migration-svc", permission: "Read / Write",     identityType: "Service Account" },
    { username: "reporting-svc", permission: "Read",             identityType: "Service Account" },
    { username: "admin",         permission: "Full Control",     identityType: "Internal user"   },
  ];
  const count = 4 + (seed % 4);
  return Array.from({ length: count }, (_, i) => pool[(seed + i * 3) % pool.length]);
}

export function SensitiveFileDetailPane({
  name, path, store, storeSource, size, lastModified, dataTypes, hideAtRestScans, saasMode, unmanagedMode, onSelectIdentity,
}: SensitiveFileDetailPaneProps) {
  const [activeTab, setActiveTab] = useState<FilePanelTab>("basic");
  const [lineagePanelOpen, setLineagePanelOpen] = useState(false);
  const lineageData = useMemo(
    () => generateLineageData(name, path, store, storeSource),
    [name, path, store, storeSource],
  );
  const [sharingPage, setSharingPage] = useState(1);
  const [SHARING_PAGE_SIZE, setSharingPageSize] = useState(10);
  const [sharingPermSort, setSharingPermSort] = useState<"asc" | "desc" | null>(null);
  const SHARING_PERM_RANK: Record<string, number> = { Owner: 0, Editor: 1, Write: 2, Read: 3, Viewer: 4 };
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

  // In SaaS mode, merge 5 View events (no data match, no forensics) into the timeline
  const allHistory = useMemo(() => {
    if (!saasMode) return scanHistory;
    const viewEvents = generateSaaSViewEvents(name);
    return [...scanHistory, ...viewEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [scanHistory, name, saasMode]);

  const accessHistory = useMemo(() => generateFileAccessHistory(name), [name]);

  const sharingRows = useMemo(() => generateSharingRows(name), [name]);
  const sharingSortedRows = useMemo(() => {
    if (!sharingPermSort) return sharingRows;
    return [...sharingRows].sort((a, b) => {
      const ra = SHARING_PERM_RANK[a.permission] ?? 99;
      const rb = SHARING_PERM_RANK[b.permission] ?? 99;
      return sharingPermSort === "asc" ? ra - rb : rb - ra;
    });
  }, [sharingRows, sharingPermSort]);
  const sharingPageRows = sharingSortedRows.slice((sharingPage - 1) * SHARING_PAGE_SIZE, sharingPage * SHARING_PAGE_SIZE);

  // IaaS unstructured access identities
  const fileAccessIdentities = useMemo(
    () => (!saasMode && !unmanagedMode) ? generateFileAccessIdentities(name, store) : [],
    [name, store, saasMode, unmanagedMode],
  );
  const [FILE_ACCESS_PAGE_SIZE, setFileAccessPageSize] = useState(10);
  const [fileAccessPage, setFileAccessPage] = useState(1);

  const [showNonScanActivity, setShowNonScanActivity] = useState(false);
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());
  const toggleActivityExpand = useCallback((id: string) => {
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Snippet modals
  const [snippetStep, setSnippetStep] = useState<"closed" | "select" | "results">("closed");
  const [snippetSelected, setSnippetSelected] = useState<string[]>([]);
  const [snippetResults, setSnippetResults] = useState<{ label: string; rows: string[] }[]>([]);

  const grouped = dataTypes.reduce<Record<string, string[]>>((acc, dt) => {
    const cat = DT_TYPE_TO_CAT[dt] ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(dt);
    return acc;
  }, {});

  return (
    <div className="flex flex-row h-full">
      {/* Vertical tab bar */}
      <div className="shrink-0 flex flex-col gap-0 py-2 border-r border-border w-[200px]">
        {FILE_PANEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const isActivityTab = tab.id === "activity";
          const activeColor = isActivityTab ? "text-pink-500" : "text-primary";
          const activeBarColor = isActivityTab ? "bg-pink-500" : "bg-primary";
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 w-full transition-colors ${
                isActive ? activeColor : isActivityTab ? "text-pink-400 hover:text-pink-500" : "text-muted-foreground hover:text-text-bright"
              }`}
              style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
            >
              {/* Active indicator line */}
              {isActive && (
                <span className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] ${activeBarColor} rounded-full`} />
              )}
              <Icon size={13} className="shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "basic" && (
          <div className="h-full overflow-y-auto px-4 py-4 space-y-5">

            {/* ── Timestamp ── */}
            <div className="text-muted-foreground/60" style={{ fontSize: "10px" }}>
              Updated {meta.detailsUpdated}
            </div>

            {/* ── 0. Data Type card ── */}
            <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>Data Type</span>
                {!unmanagedMode && (
                  <button
                    type="button"
                    onClick={() => setSnippetStep("select")}
                    className="px-2 py-0.5 rounded text-white hover:opacity-90 transition-opacity"
                    style={{ fontSize: "10px", fontWeight: 500, background: "var(--color-primary)" }}
                  >
                    Get snippets
                  </button>
                )}
              </div>
              {/* Category rows */}
              {Object.entries(grouped).map(([cat, types], i, arr) => (
                <div key={cat} className={`flex items-start gap-2 px-3 py-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                  <span className="shrink-0 text-muted-foreground" style={{ fontSize: "11px", minWidth: 28 }}>{cat}:</span>
                  <div className="flex flex-wrap gap-1">
                    {types.map((dt) => (
                      <span key={dt} className="px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap" style={{ fontSize: "11px" }}>
                        {dt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── 1. File Information ── */}
            <div>
              <SectionHeader
                icon={FileText}
                label="File Information"
              />
              <div className="bg-surface-raised border border-border rounded-lg px-3 py-1 divide-y divide-border">
                {unmanagedMode ? (
                  <>
                    <MetaRowWrap label="Object Name" value={name || "-"} />
                    <MetaRowWrap label="Object ID"   value={meta.objectId || "-"} />
                    <MetaRow    label="Object Type"  value={meta.objectType || "-"} />
                    <MetaRow    label="File Type"    value={meta.fileType || "-"} />
                    <MetaRow    label="File Category" value={meta.fileCategory || "-"} />
                    <MetaRow    label="File Language" value={meta.fileLanguage || "-"} />
                    <MetaRow    label="File Size"    value={size || "-"} />
                    <MetaRowWrap label="MD5"         value={meta.md5 || "-"} />
                    <MetaRowWrap label="SHA256"      value={meta.sha256 || "-"} />
                  </>
                ) : (
                  <>
                    <MetaRow label="Owner" value={meta.fileOwner} />
                    <MetaRow label="Date Created" value={meta.dateCreated} />
                    <MetaRow label="Last Accessed" value={meta.lastAccessed} />
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Last Modified</span>
                      <span className="text-text-bright font-mono" style={{ fontSize: "11px" }}>
                        {meta.dateModified} <span className="text-muted-foreground">by</span> {meta.lastModifiedBy}
                      </span>
                    </div>
                    <MetaRow label="Last Evaluated" value={meta.lastEvaluatedAgainstPolicy} />
                    <MetaRow label="Exempt Until" value={meta.exemptUntil} />

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

                    <CollapsibleRows label="Identifiers & References">
                      <div className="divide-y divide-border/50">
                        <MetaRowWrap label="File ID" value={meta.fileId} />
                        <MetaRowWrap label="File URL" value={meta.fileUrl} />
                        <MetaRowWrap label="Parent Object" value={meta.parentObject} />
                        <MetaRowWrap label="Top Level Entity ID" value={meta.topLevelEntityId} />
                      </div>
                    </CollapsibleRows>

                    <CollapsibleRows label="Sensitivity Labels">
                      <div className="divide-y divide-border/50">
                        <MetaRow label="Sensitivity Label" value={meta.sensitivityLabel} />
                        <MetaRow label="Label Vendor" value={meta.sensitivityLabelVendor} />
                        <MetaRow label="Label Instance" value={meta.sensitivityLabelInstance} />
                        <MetaRow label="Label ID" value={meta.sensitivityLabelId} />
                      </div>
                    </CollapsibleRows>
                  </>
                )}
              </div>
            </div>

            {/* ── Sharing (SaaS non-unmanaged only) ── */}
            {saasMode && !unmanagedMode && (
              <div>
                <SectionHeader icon={Share2} label="Sharing" />
                <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
                  {/* Table header */}
                  <div className="flex items-center px-3 py-2 border-b border-border bg-background/40">
                    <span
                      className="flex-1 text-muted-foreground"
                      style={{ fontSize: "11px", fontWeight: 600 }}
                    >
                      Shared With
                    </span>
                    <button
                      type="button"
                      className="w-28 flex items-center gap-1 text-muted-foreground hover:text-text-bright transition-colors"
                      style={{ fontSize: "11px", fontWeight: 600 }}
                      onClick={() => {
                        setSharingPermSort((prev) =>
                          prev === null ? "asc" : prev === "asc" ? "desc" : null
                        );
                        setSharingPage(1);
                      }}
                    >
                      Permission
                      <span className="flex flex-col leading-none" style={{ gap: "1px" }}>
                        <ChevronDown
                          size={9}
                          className={`transition-colors ${sharingPermSort === "asc" ? "text-primary" : "text-muted-foreground/40"}`}
                          style={{ transform: "rotate(180deg)" }}
                        />
                        <ChevronDown
                          size={9}
                          className={`transition-colors ${sharingPermSort === "desc" ? "text-primary" : "text-muted-foreground/40"}`}
                        />
                      </span>
                    </button>
                  </div>
                  {/* Rows */}
                  <div className="divide-y divide-border">
                    {sharingPageRows.map((row, i) => (
                      <div key={i} className="flex items-center px-3 py-2">
                        <span
                          className="flex-1 text-text-bright truncate"
                          style={{ fontSize: "11px" }}
                        >
                          {row.sharedWith}
                        </span>
                        <span
                          className="w-28 text-foreground/80"
                          style={{ fontSize: "11px" }}
                        >
                          {row.permission}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Pagination */}
                  <TablePagination
                    currentPage={sharingPage}
                    totalRows={sharingRows.length}
                    pageSize={SHARING_PAGE_SIZE}
                    onPageChange={setSharingPage}
                    onPageSizeChange={(n) => { setSharingPageSize(n); setSharingPage(1); }}
                  />
                </div>
              </div>
            )}

            {/* ── Access (IaaS unstructured only) ── */}
            {!saasMode && !unmanagedMode && (
              <div>
                <SectionHeader icon={Users} label={`Access (${fileAccessIdentities.length})`} />
                <div className="bg-surface-raised border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center px-3 py-2 border-b border-border bg-background/40">
                    <span className="flex-1 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>
                      Username
                    </span>
                    <span className="w-32 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>
                      Permission
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {fileAccessIdentities.slice((fileAccessPage - 1) * FILE_ACCESS_PAGE_SIZE, fileAccessPage * FILE_ACCESS_PAGE_SIZE).map((id, i) => (
                      <div key={i} className="flex items-center px-3 py-2">
                        <button
                          type="button"
                          className="flex-1 text-primary truncate text-left hover:underline"
                          style={{ fontSize: "11px" }}
                          onClick={() => onSelectIdentity?.(id)}
                        >
                          {id.username}
                        </button>
                        <span className="w-32 text-foreground/80" style={{ fontSize: "11px" }}>
                          {id.permission}
                        </span>
                      </div>
                    ))}
                  </div>
                  <TablePagination
                    currentPage={fileAccessPage}
                    totalRows={fileAccessIdentities.length}
                    pageSize={FILE_ACCESS_PAGE_SIZE}
                    onPageChange={setFileAccessPage}
                    onPageSizeChange={(n) => { setFileAccessPageSize(n); setFileAccessPage(1); }}
                  />
                </div>
              </div>
            )}

            {/* ── View file lineage ── */}
            <button
              type="button"
              onClick={() => setLineagePanelOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              style={{ fontSize: "12px", fontWeight: 600 }}
            >
              View file lineage
              <ArrowRight size={13} />
            </button>

          </div>
        )}

        {activeTab === "activity" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                role="switch"
                aria-checked={showNonScanActivity}
                onClick={() => setShowNonScanActivity((v) => !v)}
                className={`relative inline-flex items-center shrink-0 h-[14px] w-[26px] rounded-full transition-colors focus:outline-none ${
                  showNonScanActivity ? "bg-primary" : "bg-border"
                }`}
              >
                <span className={`inline-block h-[10px] w-[10px] rounded-full bg-white shadow transition-transform ${
                  showNonScanActivity ? "translate-x-[14px]" : "translate-x-[2px]"
                }`} />
              </button>
              <span className="text-muted-foreground select-none" style={{ fontSize: "11px" }}>Show non-sensitive activity</span>
            </div>
            <div className="px-1 py-2">
              <div className="space-y-0">
                {allHistory.filter((ev) => showNonScanActivity || ev.findings.length > 0).map((event, idx, arr) => {
                  const isUser = event.type === "in-motion" || event.type === "view";
                  const isExpanded = expandedActivityIds.has(event.id);
                  const isLast = idx === arr.length - 1;

                  const categoryLabel = isUser ? "User Activity" : "Netskope Activity";
                  const CategoryIcon = isUser ? User : Radar;
                  const categoryTextCls = isUser ? "text-primary" : "text-muted-foreground";
                  const dotCls = isUser
                    ? "bg-primary/15 border-primary/40"
                    : "bg-muted-foreground/20 border-muted-foreground/40";
                  const dotIconCls = isUser ? "text-primary/80" : "text-muted-foreground";

                  const actionLabel = isUser
                    ? (event.action ?? (event.type === "view" ? "Viewed" : "Activity"))
                    : (event.scanKind ?? "Scan");

                  const actionBadgeCls = isUser
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "bg-muted-foreground/15 border border-muted-foreground/25 text-text-bright";

                  return (
                    <div key={event.id} className="relative" style={{ paddingLeft: "28px", paddingBottom: "16px" }}>
                      {/* Vertical rail (absolute, runs from dot bottom to row bottom) */}
                      {!isLast && (
                        <div
                          className="absolute w-px bg-border"
                          style={{ left: "9.5px", top: "20px", bottom: "0" }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => toggleActivityExpand(event.id)}
                        className="w-full flex items-start gap-2 px-2 py-1 -mx-2 -my-1 rounded-md text-left hover:bg-surface-raised/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          {/* Top line: dot + category + action badge + timestamp — flex items-center aligns everything */}
                          <div className="flex items-center gap-2 mb-1 relative">
                            <div
                              className={`absolute w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${dotCls}`}
                              style={{ left: "-26px", top: "50%", transform: "translateY(-50%)" }}
                            >
                              <CategoryIcon size={9} className={dotIconCls} />
                            </div>
                            <span className={`shrink-0 ${categoryTextCls}`} style={{ fontSize: "11px", fontWeight: 600 }}>
                              {categoryLabel}
                            </span>
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded ${actionBadgeCls}`}
                              style={{ fontSize: "10px", fontWeight: 500 }}
                            >
                              {actionLabel}
                            </span>
                            <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{event.timestamp}</span>
                          </div>

                            {/* Second line: summary for User Activity */}
                            {isUser && (
                              <div className="flex items-center gap-1.5 flex-wrap mb-1" style={{ fontSize: "11px" }}>
                                {event.policyAction && (
                                  <span className="text-text-bright" style={{ fontWeight: 500 }}>[{event.policyAction}]</span>
                                )}
                                <span className="inline-flex items-center gap-1 text-text-bright" style={{ fontWeight: 500 }}>
                                  <User size={10} className="text-muted-foreground" />
                                  {event.actor}
                                </span>
                                {event.action && (
                                  <span className="text-muted-foreground">
                                    {event.action === "Uploaded" || event.action === "Shared" || event.action === "Copied" ? `${event.action} to` :
                                     event.action === "Downloaded" ? "Downloaded to" :
                                     event.action === "Viewed" ? "Viewed" :
                                     event.action === "Edited" ? "Edited" :
                                     event.action === "Created" ? "Created" : event.action}
                                  </span>
                                )}
                                {event.destination && event.action !== "Viewed" && event.action !== "Edited" && event.action !== "Created" && (
                                  <span className="inline-flex items-center gap-1 text-text-bright truncate" style={{ fontWeight: 500 }}>
                                    <Database size={10} className="text-muted-foreground" />
                                    {event.destination}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Data type chips */}
                            {event.findings.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {event.findings.map((f) => (
                                  <span key={f} className="inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap" style={{ fontSize: "10px" }}>{f}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <ChevronRight
                            size={14}
                            className={`shrink-0 text-muted-foreground transition-transform mt-0.5 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>

                        {/* Expanded detail card */}
                        {isExpanded && (
                          <div className="mt-2 border border-border rounded-md bg-surface-raised/60 px-3 py-2.5">
                            <div className="space-y-1.5" style={{ fontSize: "11px" }}>
                              {isUser ? (
                                <>
                                  {event.actor && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>User</span>
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="text-text-bright" style={{ fontWeight: 500 }}>{event.actor}</span>
                                        {event.userType && (
                                          <span className="inline-flex px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20" style={{ fontSize: "10px", fontWeight: 500 }}>
                                            {event.userType}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {event.action && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>Activity</span>
                                      <span className="text-text-bright">{event.action}</span>
                                    </div>
                                  )}
                                  {event.destination && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>Destination</span>
                                      <span className="text-text-bright break-all">{event.destination}</span>
                                    </div>
                                  )}
                                  {event.policyAction && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>Policy Action</span>
                                      <span className="text-text-bright">{event.policyAction}</span>
                                    </div>
                                  )}
                                  {event.policyName && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>Policy Name</span>
                                      <span className="text-text-bright">{event.policyName}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>Scan Type</span>
                                    <span className="text-text-bright">{event.scanKind}</span>
                                  </div>
                                  {event.scanName && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-muted-foreground shrink-0" style={{ minWidth: "84px" }}>Scan Name</span>
                                      <span className="text-text-bright">{event.scanName}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>

            </div>
          </div>
        )}
      </div>

      {/* Lineage graph side panel (opened from Basic Information footer) */}
      <SidePanel
        open={lineagePanelOpen}
        onClose={() => setLineagePanelOpen(false)}
        title="Data Lineage Graph"
        subtitle={name}
        headerExtra={
          <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Graph</div>
        }
        width="min(1100px, 95vw)"
        zIndex={70}
      >
        <LineageDetailPanelContent
          data={lineageData}
          fileName={name}
          filePath={path}
          fileSize={size}
          storeSource={storeSource}
        />
      </SidePanel>

      {/* Snippet modals */}
      {snippetStep === "select" && (
        <SnippetSelectionModal
          fileName={name}
          store={store}
          dataTypes={dataTypes}
          grouped={grouped}
          onClose={() => setSnippetStep("closed")}
          onFetch={(selected) => {
            setSnippetSelected(selected);
            setSnippetResults(generateSnippets(name, selected));
            setSnippetStep("results");
          }}
        />
      )}
      {snippetStep === "results" && (
        <SnippetResultsModal
          fileName={name}
          store={store}
          snippets={snippetResults}
          onClose={() => setSnippetStep("closed")}
          onRefetch={() => setSnippetStep("select")}
        />
      )}
    </div>
  );
}
