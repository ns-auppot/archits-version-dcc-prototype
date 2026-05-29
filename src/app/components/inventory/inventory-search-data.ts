/**
 * Centralized searchable inventory index.
 *
 * Every row across all four table types is flattened into a uniform
 * `SearchableItem` so the search results page can query once.
 */

// ── Unified result type ──────────────────────────────────────────────────────

export type ItemCategory =
  | "Unstructured Data Store"
  | "Structured Data Store"
  | "Identity"
  | "Unmanaged Destination"
  | "Sensitive File"
  | "Sensitive Column";

export interface SearchableItem {
  id: string;
  name: string;
  subtitle?: string;
  /** Top-level category shown as a badge */
  category: ItemCategory;
  /** More specific source label, e.g. "Google Drive › Drives" */
  source: string;
  /** The nav ID to deep-link back to the table */
  navId: string;
  /** Arbitrary key-value detail pairs rendered in result cards */
  details: Record<string, string>;
  /** All text that should be keyword-matchable (joined, lowercased at query time) */
  searchableText: string;
  /** Tags for natural-language intent matching */
  tags: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString();
}

// ── Sensitive file registry ───────────────────────────────────────────────────

interface SensitiveFileData {
  id: string;
  name: string;
  path: string;
  store: string;
  storeSource: string;
  navId: string;
  size: string;
  lastModified: string;
  dataTypes: string[];
}

const SENSITIVE_FILES_REGISTRY: SensitiveFileData[] = [
  // Google Drive – Finance Team Drive
  { id: "sf-1",  name: "employee_tax_records_2024.xlsx",          path: "/Finance/Payroll/",           store: "Finance Team Drive",    storeSource: "Google Drive",  navId: "drives",           size: "2.4 MB",   lastModified: "2025-12-31", dataTypes: ["Social Security Numbers", "Financial IDs", "Taxpayer IDs"] },
  { id: "sf-2",  name: "w2_forms_batch_jan2026.csv",              path: "/Finance/Tax/",               store: "Finance Team Drive",    storeSource: "Google Drive",  navId: "drives",           size: "840 KB",   lastModified: "2026-01-15", dataTypes: ["Social Security Numbers", "Personal Names", "Taxpayer IDs"] },
  { id: "sf-3",  name: "payroll_summary_q4_2025.xlsx",            path: "/Finance/Payroll/",           store: "Finance Team Drive",    storeSource: "Google Drive",  navId: "drives",           size: "1.1 MB",   lastModified: "2026-01-05", dataTypes: ["Social Security Numbers", "Bank Account Information", "Personal Names"] },
  // Google Drive – HR Confidential
  { id: "sf-4",  name: "employee_onboarding_2025.csv",            path: "/HR/Onboarding/",             store: "HR Confidential",       storeSource: "Google Drive",  navId: "drives",           size: "3.2 MB",   lastModified: "2025-12-01", dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates"] },
  { id: "sf-5",  name: "background_checks_q3_2025.pdf",           path: "/HR/Compliance/",             store: "HR Confidential",       storeSource: "Google Drive",  navId: "drives",           size: "18.6 MB",  lastModified: "2025-09-30", dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Medical Records"] },
  { id: "sf-6",  name: "benefits_enrollment_2026.xlsx",           path: "/HR/Benefits/",               store: "HR Confidential",       storeSource: "Google Drive",  navId: "drives",           size: "4.7 MB",   lastModified: "2026-01-10", dataTypes: ["Social Security Numbers", "Healthcare IDs", "Personal Names"] },
  // SharePoint – Legal – Contracts
  { id: "sf-7",  name: "employment_contracts_2025.pdf",           path: "/Legal/Contracts/Employment/",store: "Legal – Contracts",     storeSource: "SharePoint",    navId: "sharepoint-sites", size: "45 MB",    lastModified: "2025-11-30", dataTypes: ["Social Security Numbers", "Personal Names", "Financial IDs"] },
  { id: "sf-8",  name: "settlement_agreements_confidential.docx", path: "/Legal/Settlements/",         store: "Legal – Contracts",     storeSource: "SharePoint",    navId: "sharepoint-sites", size: "2.1 MB",   lastModified: "2025-10-22", dataTypes: ["Social Security Numbers", "Financial IDs", "Personal Names"] },
  // SharePoint – HR – Employee Portal
  { id: "sf-9",  name: "employee_roster_2026.xlsx",               path: "/HR/Roster/",                 store: "HR – Employee Portal",  storeSource: "SharePoint",    navId: "sharepoint-sites", size: "1.8 MB",   lastModified: "2026-01-08", dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Healthcare IDs"] },
  { id: "sf-10", name: "insurance_forms_q1_2026.pdf",             path: "/HR/Benefits/Insurance/",     store: "HR – Employee Portal",  storeSource: "SharePoint",    navId: "sharepoint-sites", size: "9.3 MB",   lastModified: "2026-01-20", dataTypes: ["Social Security Numbers", "Healthcare IDs", "Personal Names"] },
  // AWS S3 – prod-data-lake
  { id: "sf-11", name: "users_pii_export_20260101.parquet",       path: "/records/users/",             store: "prod-data-lake",        storeSource: "AWS S3",        navId: "s3",               size: "512 MB",   lastModified: "2026-01-01", dataTypes: ["Social Security Numbers", "Personal Names", "Email Addresses", "Birthdates"] },
  { id: "sf-12", name: "hr_records_full_20251231.parquet",        path: "/records/hr/",                store: "prod-data-lake",        storeSource: "AWS S3",        navId: "s3",               size: "234 MB",   lastModified: "2025-12-31", dataTypes: ["Social Security Numbers", "Personal Names", "Healthcare IDs", "Birthdates"] },
  { id: "sf-13", name: "identity_verification_batch_20260110.csv",path: "/kyc/verification/",          store: "prod-data-lake",        storeSource: "AWS S3",        navId: "s3",               size: "78 MB",    lastModified: "2026-01-10", dataTypes: ["Social Security Numbers", "Financial IDs", "Personal Names"] },
  // Azure Blob – compliance-archive
  { id: "sf-14", name: "kyc_documents_archived_2024.zip",         path: "/compliance/kyc/2024/",       store: "compliance-archive",    storeSource: "Azure Blob",    navId: "azure-blob",       size: "1.2 GB",   lastModified: "2024-12-31", dataTypes: ["Social Security Numbers", "Passports", "Personal Names", "Taxpayer IDs"] },
  { id: "sf-15", name: "audit_trail_pii_export_2025.csv",         path: "/compliance/audit/",          store: "compliance-archive",    storeSource: "Azure Blob",    navId: "azure-blob",       size: "156 MB",   lastModified: "2025-12-15", dataTypes: ["Social Security Numbers", "Taxpayer IDs", "Financial IDs", "Personal Names"] },
  { id: "sf-16", name: "customer_id_verification_2025.parquet",   path: "/compliance/identity/",       store: "compliance-archive",    storeSource: "Azure Blob",    navId: "azure-blob",       size: "88 MB",    lastModified: "2025-11-30", dataTypes: ["Social Security Numbers", "Personal Names", "Postal Addresses"] },
  // Endpoint – DESKTOP-BK-3302
  { id: "sf-17", name: "patient_records_backup_nov2025.csv",      path: "/Desktop/Work/",              store: "DESKTOP-BK-3302",       storeSource: "Endpoint",      navId: "user-device",      size: "67 MB",    lastModified: "2025-11-15", dataTypes: ["Social Security Numbers", "Medical Records", "Personal Names", "Healthcare IDs"] },
  { id: "sf-18", name: "employee_data_export_local.xlsx",         path: "/Documents/HR/",              store: "DESKTOP-BK-3302",       storeSource: "Endpoint",      navId: "user-device",      size: "14 MB",    lastModified: "2026-01-12", dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Postal Addresses"] },
];

// ── Sensitive column registry ────────────────────────────────────────────────

interface SensitiveColumnData {
  id: string;
  columnName: string;
  tableName: string;
  schema: string;
  store: string;
  storeSource: string;
  navId: string;
  dataType: string;
  dataCategory: string;
  nullable: boolean;
  rowCount: string;
  sampleValues: string[];
}

const SENSITIVE_COLUMNS_REGISTRY: SensitiveColumnData[] = [
  // AWS RDS — prod-users-db
  { id: "sc-1",  columnName: "ssn",              tableName: "users",           schema: "public",    store: "prod-users-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Social Security Numbers", dataCategory: "SPII",  nullable: false, rowCount: "2.4M",  sampleValues: ["***-**-1234", "***-**-5678"] },
  { id: "sc-2",  columnName: "email",             tableName: "users",           schema: "public",    store: "prod-users-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Email Addresses",         dataCategory: "PII",   nullable: false, rowCount: "2.4M",  sampleValues: ["j***@acme.com", "m***@example.com"] },
  { id: "sc-3",  columnName: "card_number",       tableName: "payment_methods", schema: "billing",   store: "prod-users-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Payment Cards",           dataCategory: "PCI",   nullable: true,  rowCount: "890K",  sampleValues: ["4***-****-****-1234", "5***-****-****-5678"] },
  { id: "sc-4",  columnName: "password_hash",     tableName: "credentials",     schema: "auth",      store: "prod-users-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Passwords",               dataCategory: "PAI",   nullable: false, rowCount: "2.4M",  sampleValues: ["$2b$12$...", "$argon2id$..."] },
  { id: "sc-5",  columnName: "date_of_birth",     tableName: "users",           schema: "public",    store: "prod-users-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Birthdates",              dataCategory: "PII",   nullable: true,  rowCount: "2.4M",  sampleValues: ["19**-**-**", "19**-**-**"] },
  // AWS RDS — prod-orders-db
  { id: "sc-6",  columnName: "billing_address",   tableName: "orders",          schema: "public",    store: "prod-orders-db",       storeSource: "AWS RDS",           navId: "rds",           dataType: "Postal Addresses",        dataCategory: "PII",   nullable: true,  rowCount: "8.1M",  sampleValues: ["123 Main St...", "456 Oak Ave..."] },
  { id: "sc-7",  columnName: "bank_account_no",   tableName: "payouts",         schema: "finance",   store: "prod-orders-db",       storeSource: "AWS RDS",           navId: "rds",           dataType: "Bank Account Information", dataCategory: "PFI",  nullable: true,  rowCount: "120K",  sampleValues: ["****4532", "****8901"] },
  // AWS RDS — staging-hr-db
  { id: "sc-8",  columnName: "national_id",       tableName: "employees",       schema: "hr",        store: "staging-hr-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Social Security Numbers", dataCategory: "SPII",  nullable: false, rowCount: "4.2K",  sampleValues: ["***-**-4321", "***-**-8765"] },
  { id: "sc-9",  columnName: "ethnicity",         tableName: "employees",       schema: "hr",        store: "staging-hr-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Ethnicity and Race",      dataCategory: "PSI",   nullable: true,  rowCount: "4.2K",  sampleValues: ["[REDACTED]", "[REDACTED]"] },
  { id: "sc-10", columnName: "medical_plan_id",   tableName: "benefits",        schema: "hr",        store: "staging-hr-db",        storeSource: "AWS RDS",           navId: "rds",           dataType: "Healthcare IDs",          dataCategory: "PHI",   nullable: true,  rowCount: "4.2K",  sampleValues: ["MED-****-001", "MED-****-204"] },
  // Azure SQL — acme-prod-customers
  { id: "sc-11", columnName: "full_name",         tableName: "customers",       schema: "dbo",       store: "acme-prod-customers",  storeSource: "Azure SQL",         navId: "azure-sql",     dataType: "Personal Names",          dataCategory: "PII",   nullable: false, rowCount: "1.8M",  sampleValues: ["J*** D***", "M*** S***"] },
  { id: "sc-12", columnName: "phone_number",      tableName: "customers",       schema: "dbo",       store: "acme-prod-customers",  storeSource: "Azure SQL",         navId: "azure-sql",     dataType: "Telephone Numbers",       dataCategory: "PII",   nullable: true,  rowCount: "1.8M",  sampleValues: ["+1-***-***-1234", "+44-***-***-5678"] },
  { id: "sc-13", columnName: "cvv",               tableName: "card_tokens",     schema: "payments",  store: "acme-prod-customers",  storeSource: "Azure SQL",         navId: "azure-sql",     dataType: "Payment Cards",           dataCategory: "PCI",   nullable: false, rowCount: "450K",  sampleValues: ["***", "***"] },
  // Azure SQL — acme-prod-hr
  { id: "sc-14", columnName: "passport_number",   tableName: "id_documents",    schema: "dbo",       store: "acme-prod-hr",         storeSource: "Azure SQL",         navId: "azure-sql",     dataType: "Passports",               dataCategory: "SPII",  nullable: true,  rowCount: "6.1K",  sampleValues: ["A***1234", "B***5678"] },
  { id: "sc-15", columnName: "gender",            tableName: "employees",       schema: "dbo",       store: "acme-prod-hr",         storeSource: "Azure SQL",         navId: "azure-sql",     dataType: "Gender",                  dataCategory: "PII",   nullable: true,  rowCount: "6.1K",  sampleValues: ["[REDACTED]", "[REDACTED]"] },
  // On-Prem PostgreSQL — PGSRV-PROD-01
  { id: "sc-16", columnName: "tax_id",            tableName: "taxpayers",       schema: "finance",   store: "PGSRV-PROD-01",        storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Taxpayer IDs",            dataCategory: "SPII",  nullable: false, rowCount: "980K",  sampleValues: ["**-***1234", "**-***5678"] },
  { id: "sc-17", columnName: "account_balance",   tableName: "accounts",        schema: "finance",   store: "PGSRV-PROD-01",        storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Bank Account Information", dataCategory: "PFI",  nullable: false, rowCount: "320K",  sampleValues: ["$*,***.**", "$**,***.**"] },
  { id: "sc-18", columnName: "secret_key",        tableName: "api_credentials", schema: "auth",      store: "PGSRV-PROD-01",        storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Secrets and Tokens",      dataCategory: "PAI",   nullable: false, rowCount: "14K",   sampleValues: ["sk_live_***...", "sk_prod_***..."] },
  // On-Prem PostgreSQL — PGSRV-PROD-02
  { id: "sc-19", columnName: "diagnosis_code",    tableName: "patient_records", schema: "clinical",  store: "PGSRV-PROD-02",        storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Medical Diagnoses",       dataCategory: "PHI",   nullable: true,  rowCount: "230K",  sampleValues: ["ICD-***", "ICD-***"] },
  { id: "sc-20", columnName: "biometric_hash",    tableName: "patient_biometrics", schema: "clinical", store: "PGSRV-PROD-02",     storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Biometric Data",          dataCategory: "PHI",   nullable: true,  rowCount: "85K",   sampleValues: ["[HASH]", "[HASH]"] },
  // On-Prem PostgreSQL — PGSRV-LEGACY
  { id: "sc-21", columnName: "driver_license",    tableName: "identity_docs",   schema: "kyc",       store: "PGSRV-LEGACY",         storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Driver Licenses",         dataCategory: "SPII",  nullable: true,  rowCount: "560K",  sampleValues: ["D***1234", "F***5678"] },
  { id: "sc-22", columnName: "voter_id",          tableName: "identity_docs",   schema: "kyc",       store: "PGSRV-LEGACY",         storeSource: "On-Prem PostgreSQL", navId: "postgresql",   dataType: "Voter Registration IDs",  dataCategory: "SPII",  nullable: true,  rowCount: "560K",  sampleValues: ["VR-****-001", "VR-****-842"] },
  // On-Prem Oracle — ORACLEDB-PROD-01
  { id: "sc-23", columnName: "credit_score",      tableName: "risk_profiles",   schema: "FINANCE",   store: "ORACLEDB-PROD-01",     storeSource: "On-Prem Oracle",     navId: "oracle",        dataType: "Credit Scores",           dataCategory: "PFI",   nullable: true,  rowCount: "1.1M",  sampleValues: ["7**", "6**"] },
  { id: "sc-24", columnName: "routing_number",    tableName: "bank_details",    schema: "FINANCE",   store: "ORACLEDB-PROD-01",     storeSource: "On-Prem Oracle",     navId: "oracle",        dataType: "Bank Account Information", dataCategory: "PFI",  nullable: false, rowCount: "780K",  sampleValues: ["0****5678", "1****2345"] },
  // On-Prem Oracle — ORACLEDB-LEGACY
  { id: "sc-25", columnName: "private_key_pem",   tableName: "ssl_certs",       schema: "SECURITY",  store: "ORACLEDB-LEGACY",      storeSource: "On-Prem Oracle",     navId: "oracle",        dataType: "Private Keys",            dataCategory: "PAI",   nullable: false, rowCount: "2.8K",  sampleValues: ["-----BEGIN RSA...", "-----BEGIN EC..."] },
  { id: "sc-26", columnName: "income_annual",     tableName: "loan_applications", schema: "CREDIT",  store: "ORACLEDB-LEGACY",      storeSource: "On-Prem Oracle",     navId: "oracle",        dataType: "Income Information",      dataCategory: "PFI",   nullable: true,  rowCount: "430K",  sampleValues: ["$**,000", "$***,000"] },
];

// ── Identity data-access context (simulated) ─────────────────────────────────
// Maps navId → per-row data access tags. Each entry lists the sensitive data
// categories and specific data types that identity has access to.

const IDENTITY_DATA_ACCESS: Record<string, string[][]> = {
  "internal-user": [
    // Alice Chen — Data Engineer: broad access including PII, PHI, SPII
    ["pii", "spii", "phi", "personal names", "email addresses", "social security numbers", "medical records", "healthcare ids"],
    // Brian Kowalski — Finance Analyst: PFI + PII
    ["pii", "pfi", "personal names", "bank account information", "financial ids", "tax records", "taxpayer ids"],
    // Diana Reyes — SOC Lead: PAI + BII
    ["pai", "bii", "passwords", "private keys", "secrets and tokens", "source code", "trade secrets"],
  ],
  "external-user": [
    // James Thornton — Read Only: limited PII
    ["pii", "personal names", "email addresses", "telephone numbers"],
    // Priya Nair — Contributor: PII + some PFI
    ["pii", "pfi", "personal names", "email addresses", "financial ids"],
  ],
  "unknown-identity": [
    // All unknown identities get generic tags
    ...Array(18).fill(["pii", "personal names", "ip addresses"]),
  ],
  "unmapped-local-user": [
    // root/postgres/svc accounts typically have DB-level access
    ["pii", "spii", "phi", "personal names", "social security numbers", "medical records"],
    ["pii", "spii", "personal names", "social security numbers"],
    ["pii", "pfi", "personal names", "bank account information"],
    ["pii", "personal names", "email addresses"],
    ["pii", "spii", "personal names", "social security numbers", "birthdates"],
    ["pii", "personal names"],
    ["pii", "pfi", "personal names", "financial ids"],
    ["pii", "spii", "social security numbers", "taxpayer ids"],
    ["pii", "pfi", "personal names", "bank account information", "financial ids"],
    ["pii", "personal names", "email addresses"],
    ["pii", "spii", "personal names", "social security numbers"],
    ["pii", "personal names", "postal addresses"],
    ["pii", "personal names"],
    ["pii", "spii", "personal names", "national ids"],
  ],
  "service-account": [
    // CI/CD Pipeline: source code + secrets
    ["pai", "bii", "secrets and tokens", "private keys", "source code"],
    // Data Sync Bot: PII + SPII
    ["pii", "spii", "personal names", "social security numbers", "email addresses"],
  ],
  "connected-app": [
    // Support Copilot: PII
    ["pii", "personal names", "email addresses", "telephone numbers"],
    // Code Reviewer: PAI + BII
    ["pai", "bii", "source code", "private keys", "secrets and tokens"],
    // Data Classifier: PII + SPII + PHI
    ["pii", "spii", "phi", "personal names", "social security numbers", "medical records", "healthcare ids"],
    // Email Drafter: PII
    ["pii", "personal names", "email addresses"],
    // Log Analyzer: PAI + BII
    ["pai", "bii", "secrets and tokens", "source code"],
    // Meeting Summarizer: PII
    ["pii", "personal names", "email addresses"],
    // Threat Scanner: PAI
    ["pai", "passwords", "private keys", "secrets and tokens"],
    // Doc Generator: BII
    ["bii", "trade secrets", "company names"],
    // Slack: PII + BII
    ["pii", "bii", "personal names", "email addresses", "company names"],
    // Notion: BII + PII
    ["bii", "pii", "trade secrets", "personal names", "email addresses"],
    // Figma: BII
    ["bii", "trade secrets", "company names"],
    // Jira: BII + PAI
    ["bii", "pai", "source code", "trade secrets", "secrets and tokens"],
    // Salesforce CRM: PII + PFI
    ["pii", "pfi", "personal names", "email addresses", "financial ids"],
    // Zoom: PII
    ["pii", "personal names", "email addresses"],
    // HubSpot: PII + PFI
    ["pii", "pfi", "personal names", "email addresses", "financial ids"],
    // Datadog: PAI + BII
    ["pai", "bii", "secrets and tokens", "source code"],
    // Snowflake: PII + SPII + PFI
    ["pii", "spii", "pfi", "personal names", "social security numbers", "financial ids"],
    // GitHub: PAI + BII
    ["pai", "bii", "private keys", "source code", "secrets and tokens"],
    // DocuSign: PII + SPII
    ["pii", "spii", "personal names", "social security numbers", "financial ids"],
    // Okta: PAI + PII
    ["pai", "pii", "passwords", "personal names", "email addresses"],
  ],
};

// ── App / Destination access per identity (filter key strings) ───────────────
// Maps navId → per-row array of FilterKey strings representing which
// applications and destinations each identity has access to.
const IDENTITY_APP_ACCESS: Record<string, string[][]> = {
  "internal-user": [
    // Alice Chen — Data Engineer: broad managed + sanctioned app access
    ["google-drive", "sharepoint", "aws", "slack", "github", "notion", "linkedin.com"],
    // Brian Kowalski — Finance Analyst
    ["google-drive", "sharepoint", "slack", "zoom", "youtube.com"],
    // Diana Reyes — SOC Lead
    ["google-drive", "aws", "slack", "github", "virustotal.com", "hackerone.com"],
  ],
  "external-user": [
    // James Thornton — Partner (read-only, limited)
    ["sharepoint", "zoom", "linkedin.com"],
    // Priya Nair — VendorCorp contributor
    ["sharepoint", "google-drive", "medium.com"],
  ],
  "unknown-identity": [
    // Destination traffic observed per IP
    ["chatgpt.com"],
    ["youtube.com"],
    ["filetransfer.io"],
    ["reddit.com"],
    ["medium.com"],
    ["canva.com"],
    ["protonmail.com"],
    ["wetransfer.com"],
    ["mega.nz"],
    ["pastebin.com"],
    ["twitter.com"],
    ["nordvpn.com"],
    ["torproject.org"],
    ["hackerone.com"],
    ["virustotal.com"],
    ["claude.ai"],
    ["replit.com"],
    ["perplexity.ai"],
  ],
  "unmapped-local-user": [
    [],                         // root / PGSRV-PROD-01
    [],                         // postgres / PGSRV-PROD-02
    ["aws"],                    // svc_reporting / analytics-warehouse (RDS)
    ["google-drive", "slack"],  // ubuntu / LAPTOP-DC-4201
    ["sharepoint", "teams"],    // administrator / DESKTOP-BK-3302
    ["github", "aws"],          // jenkins_build / CI/CD Pipeline
    [],                         // app_svc / Salesforce CRM
    [],                         // oracledb_admin / ORACLEDB-PROD-01
    ["aws"],                    // svc_etl / prod-users-db (RDS)
    ["google-drive", "notion"], // localadmin / LAPTOP-MJ-2208
    [],                         // backup_user / PGSRV-LEGACY
    ["azure"],                  // data_reader / acme-prod-customers (Azure SQL)
    [],                         // system / DESKTOP-TP-5501
    [],                         // replication_svc / ORACLEDB-LEGACY
  ],
  "service-account": [
    ["github", "aws"],                     // CI/CD Pipeline
    ["aws", "sharepoint", "google-drive"], // Data Sync Bot
  ],
  "connected-app": [
    ["slack", "notion", "zoom", "google-drive"], // Support Copilot
    ["github", "notion", "google-drive"],         // Code Reviewer
    ["aws", "google-drive"],                      // Data Classifier
    ["slack", "zoom", "google-drive"],            // Email Drafter
    ["aws", "sharepoint"],                        // Log Analyzer
    ["zoom", "notion", "slack", "google-drive"],  // Meeting Summarizer
    ["aws", "github"],                            // Threat Scanner
    ["google-drive", "notion"],                   // Doc Generator
    ["slack"], ["notion"], ["figma"], [], [], ["zoom"], [], [], [], ["github"], [], [],
  ],
};

// ── Status tags per identity type ────────────────────────────────────────────
export const IDENTITY_STATUS_TAGS: Record<string, string[][]> = {
  "internal-user": [["active"], ["active"], ["active"]],
  "external-user": [["active"], ["stale"]],
  "unknown-identity": Array(18).fill(["active"]),
  "unmapped-local-user": [
    ["active"], ["active"], ["stale"], ["active"], ["stale"],
    ["active"], ["active"], ["stale"], ["active"], ["active"],
    ["stale"], ["active"], ["active"], ["stale"],
  ],
  "service-account": [["active"], ["active"]],
  "connected-app": [
    ["active"], ["active"], ["active"], ["active"], ["stale"], ["active"], ["active"], ["stale"],
    ...Array(12).fill(["active"]),
  ],
};

// ── Misconfiguration tags per store row id ────────────────────────────────────
// Maps store row id → array of misconfiguration tags applied to that item.
const MISC_TAGS: Record<string, string[]> = {
  // AWS S3
  "s1":    ["not-encrypted", "publicly-accessible"], // prod-data-lake
  "s4":    ["not-encrypted"],                        // backup-archive-us-east
  "s5":    ["not-encrypted"],                        // dev-secrets-vault
  "s6":    ["not-backed-up"],                        // prod-media-assets
  "s7":    ["not-backed-up"],                        // customer-docs-raw
  "s8":    ["not-backed-up"],                        // data-exports-staging
  "s9":    ["publicly-accessible"],                  // public-assets-cdn
  "s10":   ["publicly-accessible"],                  // static-content-prod
  "s11":   ["not-encrypted", "publicly-accessible"],  // audit-logs-prod
  "s12":   ["not-backed-up", "publicly-accessible"],  // logs-export-us-west
  // Azure Blob
  "ab1":   ["not-backed-up"],                         // compliance-archive
  "ab3":   ["publicly-accessible"],                   // research-datasets
  "ab4":   ["not-backed-up", "publicly-accessible"],  // ops-snapshots
  // AWS RDS
  "rds4":  ["not-encrypted"],                         // staging-hr-db
  "rds5":  ["not-encrypted", "not-backed-up"],        // prod-payments-db
  "rds6":  ["not-backed-up", "publicly-accessible"],  // analytics-prod-db
  // On-Prem PostgreSQL
  "pg4":   ["not-encrypted", "not-backed-up"],       // PGSRV-LEGACY
  // On-Prem Oracle
  "ora3":  ["not-encrypted"],                        // ORACLEDB-LEGACY
};

// ── Build the index (called once, memoised by the consumer) ──────────────────

export function buildSearchIndex(): SearchableItem[] {
  const items: SearchableItem[] = [];

  // ─── Unstructured Data Stores ──────────────────────────────────────────────
  const unstructuredStores: {
    storeType: string;
    source: string;
    navId: string;
    rows: {
      id: string;
      name: string;
      nameSubtitle?: string;
      sensitiveFiles: number;
      totalFiles: number;
      dataTypes: string[];
    }[];
  }[] = [
    {
      storeType: "drives",
      source: "Google Drive \u203A Drives",
      navId: "drives",
      rows: [
        { id: "d1", name: "Engineering Shared Drive", sensitiveFiles: 142, totalFiles: 1203, dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Source Code", "Passwords", "Private Keys"] },
        { id: "d2", name: "Finance Team Drive", sensitiveFiles: 89, totalFiles: 456, dataTypes: ["Financial IDs", "Bank Account Information", "Payment Cards", "Social Security Numbers", "Taxpayer IDs"] },
        { id: "d3", name: "HR Confidential", sensitiveFiles: 234, totalFiles: 892, dataTypes: ["Personal Names", "Social Security Numbers", "Birthdates", "Medical Records", "Postal Addresses", "Telephone Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race"] },
        { id: "d4", name: "Marketing Assets", sensitiveFiles: 12, totalFiles: 2105, dataTypes: ["Email Addresses", "Personal Names", "Company Names"] },
      ],
    },
    {
      storeType: "s3",
      source: "AWS \u203A S3",
      navId: "s3",
      rows: [
        { id: "s1",  name: "prod-data-lake",          sensitiveFiles: 1205, totalFiles: 45200, dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Financial IDs", "Healthcare IDs", "Birthdates", "Telephone Numbers", "Postal Addresses"] },
        { id: "s2",  name: "analytics-staging",        sensitiveFiles: 340,  totalFiles: 12800, dataTypes: ["IP Addresses", "MAC Addresses", "UUIDs", "Domain Names", "URI Hosts"] },
        { id: "s3",  name: "ml-training-data",         sensitiveFiles: 892,  totalFiles: 8400,  dataTypes: ["Personal Names", "Biometric Data", "Medical Records", "Healthcare Provider IDs", "Medical Diagnoses", "Gender", "Age", "Ethnicity and Race"] },
        { id: "s4",  name: "backup-archive-us-east",   sensitiveFiles: 528,  totalFiles: 31400, dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Bank Account Information", "Taxpayer IDs", "Postal Addresses"] },
        { id: "s5",  name: "dev-secrets-vault",        sensitiveFiles: 74,   totalFiles: 2100,  dataTypes: ["Passwords", "Private Keys", "Secrets and Tokens", "Public Keys", "MFA Seeds", "Source Code"] },
        { id: "s6",  name: "prod-media-assets",        sensitiveFiles: 183,  totalFiles: 67300, dataTypes: ["Personal Names", "Email Addresses", "Birthdates", "Telephone Numbers", "Postal Addresses"] },
        { id: "s7",  name: "customer-docs-raw",        sensitiveFiles: 412,  totalFiles: 18900, dataTypes: ["Personal Names", "Email Addresses", "Passports", "Driver Licenses", "National IDs", "Taxpayer IDs", "Postal Addresses"] },
        { id: "s8",  name: "data-exports-staging",     sensitiveFiles: 261,  totalFiles: 9700,  dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Payment Cards", "Financial IDs"] },
        { id: "s9",  name: "public-assets-cdn",        sensitiveFiles: 94,   totalFiles: 41500, dataTypes: ["Personal Names", "Email Addresses", "Company Names", "IP Addresses"] },
        { id: "s10", name: "static-content-prod",      sensitiveFiles: 37,   totalFiles: 28600, dataTypes: ["Personal Names", "Email Addresses", "Domain Names", "URI Hosts"] },
        { id: "s11", name: "audit-logs-prod",          sensitiveFiles: 156,  totalFiles: 14300, dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Passwords", "Secrets and Tokens"] },
        { id: "s12", name: "logs-export-us-west",      sensitiveFiles: 203,  totalFiles: 19800, dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Domain Names", "UUIDs"] },
      ],
    },
    {
      storeType: "sharepoint-sites",
      source: "SharePoint \u203A Sites",
      navId: "sharepoint-sites",
      rows: [
        { id: "sp1", name: "Legal – Contracts", sensitiveFiles: 310, totalFiles: 1840, dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Company Names", "Postal Addresses", "Taxpayer IDs"] },
        { id: "sp2", name: "HR – Employee Portal", sensitiveFiles: 198, totalFiles: 945, dataTypes: ["Personal Names", "Birthdates", "Social Security Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race", "Postal Addresses"] },
        { id: "sp3", name: "Product – Roadmap Hub", sensitiveFiles: 24, totalFiles: 3200, dataTypes: ["Email Addresses", "Company Names", "Source Code"] },
      ],
    },
    {
      storeType: "azure-blob",
      source: "Azure \u203A Blob Storage",
      navId: "azure-blob",
      rows: [
        { id: "ab1", name: "compliance-archive", sensitiveFiles: 567, totalFiles: 18300, dataTypes: ["Personal Names", "Social Security Numbers", "Taxpayer IDs", "Financial IDs", "Postal Addresses", "Passports"] },
        { id: "ab2", name: "customer-uploads", sensitiveFiles: 234, totalFiles: 9420, dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Telephone Numbers", "Company Names"] },
        { id: "ab3", name: "research-datasets", sensitiveFiles: 1089, totalFiles: 22100, dataTypes: ["Medical Records", "Healthcare IDs", "Biometric Data", "Genetic Data", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race"] },
        { id: "ab4", name: "ops-snapshots",     sensitiveFiles: 88,   totalFiles: 7400,  dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Passwords", "Source Code"] },
      ],
    },
    {
      storeType: "user-device",
      source: "Endpoint \u203A User Device",
      navId: "user-device",
      rows: [
        { id: "ud1", name: "LAPTOP-DC-4201", nameSubtitle: "David Chen", sensitiveFiles: 78, totalFiles: 3200, dataTypes: ["Source Code", "Private Keys", "Passwords", "Secrets and Tokens", "IP Addresses", "Email Addresses"] },
        { id: "ud2", name: "LAPTOP-AR-1105", nameSubtitle: "Alice Reyes", sensitiveFiles: 45, totalFiles: 1890, dataTypes: ["Financial IDs", "Payment Cards", "Personal Names", "Bank Account Information"] },
        { id: "ud3", name: "DESKTOP-BK-3302", nameSubtitle: "Brian Kim", sensitiveFiles: 112, totalFiles: 5670, dataTypes: ["Medical Records", "Healthcare IDs", "Personal Names", "Social Security Numbers", "Birthdates", "Postal Addresses", "Telephone Numbers"] },
        { id: "ud4", name: "LAPTOP-MJ-2208", nameSubtitle: "Maya Johnson", sensitiveFiles: 23, totalFiles: 980, dataTypes: ["Email Addresses", "Company Names", "Domain Names"] },
        { id: "ud5", name: "DESKTOP-TP-5501", nameSubtitle: "Tom Park", sensitiveFiles: 67, totalFiles: 2340, dataTypes: ["Source Code", "Private Keys", "Public Keys", "Secrets and Tokens", "IP Addresses", "MAC Addresses", "UUIDs"] },
      ],
    },
  ];

  for (const store of unstructuredStores) {
    for (const row of store.rows) {
      const miscTags = MISC_TAGS[row.id] ?? [];
      const miscLabel = miscTags.map(t =>
        t === "not-encrypted" ? "Not Encrypted"
        : t === "not-backed-up" ? "Not Backed Up"
        : "Publicly Accessible"
      ).join(", ");
      items.push({
        id: `unstructured-${row.id}`,
        name: row.name,
        subtitle: row.nameSubtitle,
        category: "Unstructured Data Store",
        source: store.source,
        navId: store.navId,
        details: {
          "Sensitive Files": `${fmt(row.sensitiveFiles)} / ${fmt(row.totalFiles)}`,
          "Data Types": row.dataTypes.join(", "),
          ...(miscLabel ? { "Misconfigurations": miscLabel } : {}),
        },
        searchableText: [row.name, row.nameSubtitle, store.source, ...row.dataTypes, "unstructured", "files", "sensitive", ...miscTags, ...(miscLabel ? ["misconfiguration", "misconfigured", miscLabel] : [])].filter(Boolean).join(" ").toLowerCase(),
        tags: [...row.dataTypes.map((d) => d.toLowerCase()), "unstructured", "data store", store.storeType, ...miscTags],
      });
    }
  }

  // ─── Structured Data Stores ────────────────────────────────────────────────
  const structuredStores: {
    storeType: string;
    source: string;
    navId: string;
    rows: {
      id: string;
      name: string;
      nameSubtitle?: string;
      sensitiveFields: number;
      totalFields: number;
      dataTypes: string[];
    }[];
  }[] = [
    {
      storeType: "rds",
      source: "AWS \u203A RDS",
      navId: "rds",
      rows: [
        { id: "rds1", name: "prod-users-db", nameSubtitle: "PostgreSQL 15.4 \u00B7 us-east-1", sensitiveFields: 84, totalFields: 312, dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Telephone Numbers", "Postal Addresses", "Birthdates", "Passwords", "Payment Cards"] },
        { id: "rds2", name: "prod-orders-db", nameSubtitle: "MySQL 8.0 \u00B7 us-east-1", sensitiveFields: 46, totalFields: 198, dataTypes: ["Payment Cards", "Bank Account Information", "Financial IDs", "Personal Names", "Postal Addresses", "Telephone Numbers"] },
        { id: "rds3", name: "analytics-warehouse", nameSubtitle: "PostgreSQL 15.4 \u00B7 us-west-2", sensitiveFields: 127, totalFields: 540, dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Domain Names", "Company Names", "Region Identifiers", "Corporate Tax IDs", "Securities IDs"] },
        { id: "rds4", name: "staging-hr-db",    nameSubtitle: "PostgreSQL 15.4 \u00B7 us-east-1", sensitiveFields: 63,  totalFields: 185, dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race", "Postal Addresses", "Healthcare IDs", "Medical Records"] },
        { id: "rds5", name: "prod-payments-db",   nameSubtitle: "MySQL 8.0 \u00B7 us-east-2",       sensitiveFields: 118, totalFields: 430, dataTypes: ["Payment Cards", "Bank Account Information", "Financial IDs", "Personal Names", "Email Addresses", "Postal Addresses", "Telephone Numbers"] },
        { id: "rds6", name: "analytics-prod-db",  nameSubtitle: "PostgreSQL 14.9 \u00B7 us-west-1", sensitiveFields: 74,  totalFields: 310, dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Birthdates", "Company Names", "Region Identifiers"] },
      ],
    },
    {
      storeType: "azure-sql",
      source: "Azure \u203A SQL Database",
      navId: "azure-sql",
      rows: [
        { id: "asql1", name: "acme-prod-customers", nameSubtitle: "Azure SQL \u00B7 East US", sensitiveFields: 96, totalFields: 380, dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Postal Addresses", "Telephone Numbers", "Birthdates"] },
        { id: "asql2", name: "acme-prod-hr", nameSubtitle: "Azure SQL \u00B7 East US", sensitiveFields: 142, totalFields: 490, dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race", "Healthcare IDs", "Postal Addresses", "Telephone Numbers"] },
        { id: "asql3", name: "acme-analytics-dw", nameSubtitle: "Azure SQL \u00B7 West Europe", sensitiveFields: 78, totalFields: 620, dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Company Names", "Region Identifiers", "Corporate Tax IDs"] },
      ],
    },
    {
      storeType: "postgresql",
      source: "On-Prem \u203A PostgreSQL",
      navId: "postgresql",
      rows: [
        { id: "pg1", name: "PGSRV-PROD-01", nameSubtitle: "PostgreSQL 16.2 \u00B7 dc-east-rack4", sensitiveFields: 156, totalFields: 620, dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Payment Cards", "Bank Account Information", "Taxpayer IDs", "Postal Addresses", "Telephone Numbers", "Email Addresses"] },
        { id: "pg2", name: "PGSRV-PROD-02", nameSubtitle: "PostgreSQL 16.2 \u00B7 dc-east-rack4", sensitiveFields: 92, totalFields: 410, dataTypes: ["Medical Records", "Healthcare IDs", "Healthcare Provider IDs", "Medical Diagnoses", "Medical Procedures", "Personal Names", "Birthdates", "Gender"] },
        { id: "pg3", name: "PGSRV-DEV-01", nameSubtitle: "PostgreSQL 15.4 \u00B7 dc-west-rack2", sensitiveFields: 38, totalFields: 275, dataTypes: ["Personal Names", "Email Addresses", "Passwords", "Source Code", "IP Addresses"] },
        { id: "pg4", name: "PGSRV-LEGACY", nameSubtitle: "PostgreSQL 13.8 \u00B7 dc-east-rack1", sensitiveFields: 210, totalFields: 880, dataTypes: ["Personal Names", "Social Security Numbers", "Driver Licenses", "National IDs", "Passports", "Voter IDs", "Financial IDs", "Payment Cards", "Postal Addresses", "Telephone Numbers", "Birthdates"] },
      ],
    },
    {
      storeType: "oracle",
      source: "On-Prem \u203A Oracle",
      navId: "oracle",
      rows: [
        { id: "ora1", name: "ORACLEDB-PROD-01", nameSubtitle: "Oracle 19c \u00B7 dc-east-rack3", sensitiveFields: 184, totalFields: 720, dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Payment Cards", "Bank Account Information", "Email Addresses", "Postal Addresses", "Telephone Numbers"] },
        { id: "ora2", name: "ORACLEDB-PROD-02", nameSubtitle: "Oracle 19c \u00B7 dc-east-rack3", sensitiveFields: 76, totalFields: 340, dataTypes: ["Medical Records", "Healthcare IDs", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race"] },
        { id: "ora3", name: "ORACLEDB-LEGACY", nameSubtitle: "Oracle 12c \u00B7 dc-west-rack1", sensitiveFields: 245, totalFields: 960, dataTypes: ["Personal Names", "Social Security Numbers", "Driver Licenses", "Passports", "Financial IDs", "Payment Cards", "Taxpayer IDs", "Postal Addresses", "Telephone Numbers", "Birthdates", "National IDs"] },
      ],
    },
  ];

  for (const store of structuredStores) {
    for (const row of store.rows) {
      const miscTags = MISC_TAGS[row.id] ?? [];
      const miscLabel = miscTags.map(t =>
        t === "not-encrypted" ? "Not Encrypted"
        : t === "not-backed-up" ? "Not Backed Up"
        : "Publicly Accessible"
      ).join(", ");
      items.push({
        id: `structured-${row.id}`,
        name: row.name,
        subtitle: row.nameSubtitle,
        category: "Structured Data Store",
        source: store.source,
        navId: store.navId,
        details: {
          "Sensitive Fields": `${fmt(row.sensitiveFields)} / ${fmt(row.totalFields)}`,
          "Data Types": row.dataTypes.join(", "),
          ...(miscLabel ? { "Misconfigurations": miscLabel } : {}),
        },
        searchableText: [row.name, row.nameSubtitle, store.source, ...row.dataTypes, "structured", "fields", "sensitive", "database", "db", ...miscTags, ...(miscLabel ? ["misconfiguration", "misconfigured", miscLabel] : [])].filter(Boolean).join(" ").toLowerCase(),
        tags: [...row.dataTypes.map((d) => d.toLowerCase()), "structured", "data store", "database", store.storeType, ...miscTags],
      });
    }
  }

  // ─── Identity tables ───────────────────────────────────────────────────────
  const identityTables: {
    navId: string;
    source: string;
    columns: string[];
    rows: Record<string, string>[];
  }[] = [
    {
      navId: "internal-user",
      source: "Identity \u203A Internal User",
      columns: ["Name", "Email", "Department", "Role", "Last Active"],
      rows: [
        { Name: "Alice Chen", Email: "a.chen@acme.com", Department: "Engineering", Role: "Data Engineer", "Last Active": "2026-02-23 09:14am" },
        { Name: "Brian Kowalski", Email: "b.kowalski@acme.com", Department: "Finance", Role: "Analyst", "Last Active": "2026-02-23 08:42am" },
        { Name: "Diana Reyes", Email: "d.reyes@acme.com", Department: "Security", Role: "SOC Lead", "Last Active": "2026-02-22 06:30pm" },
      ],
    },
    {
      navId: "external-user",
      source: "Identity \u203A External User",
      columns: ["Name", "Email", "Organization", "Access Level", "Last Active"],
      rows: [
        { Name: "James Thornton", Email: "j.thornton@partner.io", Organization: "Partner Inc.", "Access Level": "Read Only", "Last Active": "2026-02-21 03:10pm" },
        { Name: "Priya Nair", Email: "p.nair@vendorcorp.com", Organization: "VendorCorp", "Access Level": "Contributor", "Last Active": "2026-02-20 11:45am" },
      ],
    },
    {
      navId: "unknown-identity",
      source: "Identity \u203A Unauthenticated",
      columns: ["IP Address", "Location", "Traffic Volume", "Protocols", "Last Seen"],
      rows: [
        { "IP Address": "192.168.14.55", Location: "San Jose, CA", "Traffic Volume": "4.2 GB", Protocols: "HTTPS, DNS", "Last Seen": "2026-02-23 09:45am" },
        { "IP Address": "10.22.8.143", Location: "Austin, TX", "Traffic Volume": "1.8 GB", Protocols: "HTTPS", "Last Seen": "2026-02-23 08:12am" },
        { "IP Address": "172.16.5.201", Location: "Chicago, IL", "Traffic Volume": "9.1 GB", Protocols: "HTTPS, FTP", "Last Seen": "2026-02-22 11:30pm" },
        { "IP Address": "10.0.22.78", Location: "New York, NY", "Traffic Volume": "550 MB", Protocols: "HTTPS, SMTP", "Last Seen": "2026-02-22 05:00pm" },
        { "IP Address": "192.168.3.210", Location: "Seattle, WA", "Traffic Volume": "2.3 GB", Protocols: "HTTPS, SSH", "Last Seen": "2026-02-21 02:15pm" },
        { "IP Address": "10.5.17.88", Location: "Denver, CO", "Traffic Volume": "780 MB", Protocols: "HTTPS", "Last Seen": "2026-02-21 10:40am" },
        { "IP Address": "172.20.1.44", Location: "Atlanta, GA", "Traffic Volume": "3.6 GB", Protocols: "HTTPS, DNS, QUIC", "Last Seen": "2026-02-20 06:55pm" },
        { "IP Address": "10.14.9.130", Location: "Portland, OR", "Traffic Volume": "1.1 GB", Protocols: "HTTPS, FTP", "Last Seen": "2026-02-20 01:20pm" },
        { "IP Address": "192.168.22.7", Location: "Boston, MA", "Traffic Volume": "5.4 GB", Protocols: "HTTPS, SSH", "Last Seen": "2026-02-19 04:30pm" },
        { "IP Address": "10.33.0.201", Location: "Dallas, TX", "Traffic Volume": "230 MB", Protocols: "HTTPS", "Last Seen": "2026-02-19 11:05am" },
        { "IP Address": "172.31.12.99", Location: "Phoenix, AZ", "Traffic Volume": "6.7 GB", Protocols: "HTTPS, DNS, SMTP", "Last Seen": "2026-02-18 08:00pm" },
        { "IP Address": "10.9.4.67", Location: "Minneapolis, MN", "Traffic Volume": "900 MB", Protocols: "HTTPS, SSH", "Last Seen": "2026-02-18 03:45pm" },
        { "IP Address": "192.168.100.15", Location: "Miami, FL", "Traffic Volume": "12.3 GB", Protocols: "HTTPS, FTP, DNS", "Last Seen": "2026-02-17 09:10pm" },
        { "IP Address": "10.50.8.22", Location: "Detroit, MI", "Traffic Volume": "420 MB", Protocols: "HTTPS", "Last Seen": "2026-02-17 02:30pm" },
        { "IP Address": "172.18.6.144", Location: "San Diego, CA", "Traffic Volume": "3.1 GB", Protocols: "HTTPS, QUIC", "Last Seen": "2026-02-16 07:15pm" },
        { "IP Address": "10.77.2.33", Location: "Charlotte, NC", "Traffic Volume": "1.5 GB", Protocols: "HTTPS, DNS", "Last Seen": "2026-02-16 12:50pm" },
        { "IP Address": "192.168.55.190", Location: "St. Louis, MO", "Traffic Volume": "800 MB", Protocols: "HTTPS", "Last Seen": "2026-02-15 06:00pm" },
        { "IP Address": "10.18.3.77", Location: "Las Vegas, NV", "Traffic Volume": "2.9 GB", Protocols: "HTTPS, SSH, FTP", "Last Seen": "2026-02-15 10:20am" },
      ],
    },
    {
      navId: "unmapped-local-user",
      source: "Identity › Unmapped",
      columns: ["Username", "Source", "Source Type", "Linked Status", "Last Discovered"],
      rows: [
        { Username: "root", Source: "PGSRV-PROD-01", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Last Discovered": "2026-02-23 08:30am" },
        { Username: "postgres", Source: "PGSRV-PROD-02", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Last Discovered": "2026-02-23 07:45am" },
        { Username: "svc_reporting", Source: "analytics-warehouse", "Source Type": "Cloud DB (RDS)", "Linked Status": "Unlinked", "Last Discovered": "2026-02-22 11:00pm" },
        { Username: "ubuntu", Source: "LAPTOP-DC-4201", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Last Discovered": "2026-02-22 04:30pm" },
        { Username: "administrator", Source: "DESKTOP-BK-3302", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Last Discovered": "2026-02-21 09:15am" },
        { Username: "jenkins_build", Source: "CI/CD Pipeline", "Source Type": "Application", "Linked Status": "Unlinked", "Last Discovered": "2026-02-21 06:00am" },
        { Username: "app_svc", Source: "Salesforce CRM", "Source Type": "SaaS App", "Linked Status": "Unlinked", "Last Discovered": "2026-02-20 03:45pm" },
        { Username: "oracledb_admin", Source: "ORACLEDB-PROD-01", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Last Discovered": "2026-02-20 10:00am" },
        { Username: "svc_etl", Source: "prod-users-db", "Source Type": "Cloud DB (RDS)", "Linked Status": "Unlinked", "Last Discovered": "2026-02-19 05:20pm" },
        { Username: "localadmin", Source: "LAPTOP-MJ-2208", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Last Discovered": "2026-02-19 01:10pm" },
        { Username: "backup_user", Source: "PGSRV-LEGACY", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Last Discovered": "2026-02-18 11:30am" },
        { Username: "data_reader", Source: "acme-prod-customers", "Source Type": "Cloud DB (Azure SQL)", "Linked Status": "Unlinked", "Last Discovered": "2026-02-18 08:45am" },
        { Username: "system", Source: "DESKTOP-TP-5501", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Last Discovered": "2026-02-17 06:15pm" },
        { Username: "replication_svc", Source: "ORACLEDB-LEGACY", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Last Discovered": "2026-02-17 02:40pm" },
      ],
    },
    {
      navId: "service-account",
      source: "Identity \u203A Service Account",
      columns: ["Name", "Service ID", "Owner", "Permissions", "Last Used"],
      rows: [
        { Name: "CI/CD Pipeline", "Service ID": "svc-cicd-001", Owner: "DevOps", Permissions: "Admin", "Last Used": "2026-02-23 09:00am" },
        { Name: "Data Sync Bot", "Service ID": "svc-dsync-014", Owner: "Data Eng", Permissions: "Read/Write", "Last Used": "2026-02-23 08:55am" },
      ],
    },
    {
      navId: "connected-app",
      source: "Identity \u203A Connected App",
      columns: ["Name", "Vendor", "Category", "Permissions", "Users"],
      rows: [
        { Name: "Support Copilot", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read/Write", Users: "—" },
        { Name: "Code Reviewer", Vendor: "Anthropic", Category: "AI Agent", Permissions: "Read Only", Users: "—" },
        { Name: "Data Classifier", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read/Write", Users: "—" },
        { Name: "Email Drafter", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read Only", Users: "—" },
        { Name: "Log Analyzer", Vendor: "Mistral AI", Category: "AI Agent", Permissions: "Read Only", Users: "—" },
        { Name: "Meeting Summarizer", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read Only", Users: "—" },
        { Name: "Threat Scanner", Vendor: "Anthropic", Category: "AI Agent", Permissions: "Read Only", Users: "—" },
        { Name: "Doc Generator", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read/Write", Users: "—" },

        { Name: "Slack", Vendor: "Salesforce", Category: "Communication", Permissions: "Read/Write", Users: "340" },
        { Name: "Notion", Vendor: "Notion Labs", Category: "Productivity", Permissions: "Read/Write", Users: "285" },
        { Name: "Figma", Vendor: "Figma Inc.", Category: "Design", Permissions: "Read Only", Users: "92" },
        { Name: "Jira", Vendor: "Atlassian", Category: "Project Mgmt", Permissions: "Admin", Users: "210" },
        { Name: "Salesforce CRM", Vendor: "Salesforce", Category: "CRM", Permissions: "Read/Write", Users: "175" },
        { Name: "Zoom", Vendor: "Zoom Video", Category: "Communication", Permissions: "Read Only", Users: "410" },
        { Name: "HubSpot", Vendor: "HubSpot Inc.", Category: "Marketing", Permissions: "Read/Write", Users: "65" },
        { Name: "Datadog", Vendor: "Datadog Inc.", Category: "Monitoring", Permissions: "Admin", Users: "28" },
        { Name: "Snowflake", Vendor: "Snowflake Inc.", Category: "Data Warehouse", Permissions: "Read/Write", Users: "42" },
        { Name: "GitHub", Vendor: "Microsoft", Category: "Development", Permissions: "Admin", Users: "188" },
        { Name: "DocuSign", Vendor: "DocuSign Inc.", Category: "Document Mgmt", Permissions: "Read/Write", Users: "130" },
        { Name: "Okta", Vendor: "Okta Inc.", Category: "Identity", Permissions: "Admin", Users: "350" },
      ],
    },
  ];

  for (const table of identityTables) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      const allValues = Object.values(row);
      const dataAccessTags = IDENTITY_DATA_ACCESS[table.navId]?.[rowIdx] ?? [];
      const statusTags = IDENTITY_STATUS_TAGS[table.navId]?.[rowIdx] ?? ["active"];
      const appAccessTags = IDENTITY_APP_ACCESS[table.navId]?.[rowIdx] ?? [];
      const dataAccessText = dataAccessTags.join(" ");
      items.push({
        id: `identity-${table.navId}-${row.Name || row[table.columns[0]]}`,
        name: row.Name || row[table.columns[0]],
        subtitle: row.Email || row[table.columns[1]],
        category: "Identity",
        source: table.source,
        navId: table.navId,
        details: Object.fromEntries(table.columns.filter((c) => c !== "Name").map((c) => [c, row[c]])),
        searchableText: [...allValues, table.source, "identity", "user", dataAccessText, "access", "data"].join(" ").toLowerCase(),
        tags: [
          "identity",
          table.navId.replace(/-/g, " "),
          ...allValues.map((v) => v.toLowerCase()),
          ...dataAccessTags,
          ...statusTags,
          ...appAccessTags,
          "access",
        ],
      });
    }
  }

  // ─── Unmanaged Destinations (subset — 60 apps + 41 websites) ───────────────
  const appNames = [
    "Slack", "Zoom", "AutoGPT", "Stable Diffusion XL", "Microsoft Teams",
    "Google Meet", "Notion", "Figma", "Miro", "Loom", "Airtable", "Asana",
    "Trello", "Monday.com", "ClickUp", "Linear", "Jira", "Confluence",
    "Basecamp", "Todoist", "Evernote", "ChatGPT", "Claude", "Gemini",
    "Perplexity AI", "Copilot", "Jasper AI", "Grammarly", "DeepL", "Calendly",
    "Salesforce", "HubSpot CRM", "Pipedrive", "Mailchimp", "SendGrid",
    "Intercom", "Zendesk", "Freshdesk", "Datadog", "New Relic",
    "Splunk", "Grafana Cloud", "PagerDuty", "Sentry", "Bugsnag",
    "Mixpanel", "Amplitude", "Segment", "PostHog", "LaunchDarkly",
    "Vercel", "Netlify", "Heroku", "Firebase", "Supabase",
    "GitHub", "GitLab", "Bitbucket", "Docker Hub", "Terraform Cloud",
  ];

  const appCategoryMap: Record<string, string> = {
    Slack: "Communication", Zoom: "Web Conferencing", AutoGPT: "Generative AI",
    "Stable Diffusion XL": "Generative AI", "Microsoft Teams": "Communication",
    "Google Meet": "Web Conferencing", Notion: "Collaboration", Figma: "Design",
    Miro: "Collaboration", Loom: "Video", Airtable: "Collaboration",
    Asana: "Project Mgmt", Trello: "Project Mgmt", "Monday.com": "Project Mgmt",
    ClickUp: "Project Mgmt", Linear: "Development", Jira: "IT Management",
    Confluence: "Knowledge Mgmt", Basecamp: "Project Mgmt", Todoist: "Project Mgmt",
    Evernote: "Content Mgmt", ChatGPT: "Generative AI", Claude: "Generative AI",
    Gemini: "Generative AI", "Perplexity AI": "Generative AI", Copilot: "Generative AI",
    "Jasper AI": "Generative AI", Grammarly: "Productivity", DeepL: "Productivity",
    Calendly: "Scheduling", Salesforce: "CRM", "HubSpot CRM": "CRM",
    Pipedrive: "CRM", Mailchimp: "Email Marketing", SendGrid: "Email Marketing",
    Intercom: "Customer Support", Zendesk: "Customer Support", Freshdesk: "Customer Support",
    Datadog: "Monitoring", "New Relic": "Monitoring", Splunk: "Monitoring",
    "Grafana Cloud": "Monitoring", PagerDuty: "Incident Mgmt", Sentry: "Error Tracking",
    Bugsnag: "Error Tracking", Mixpanel: "Analytics", Amplitude: "Analytics",
    Segment: "Analytics", PostHog: "Analytics", LaunchDarkly: "Feature Flags",
    Vercel: "Hosting", Netlify: "Hosting", Heroku: "Hosting", Firebase: "Backend",
    Supabase: "Backend", GitHub: "Development", GitLab: "Development",
    Bitbucket: "Development", "Docker Hub": "Containers", "Terraform Cloud": "Infrastructure",
  };

  // PII data types observed being transmitted to each unmanaged app
  const appPiiMap: Record<string, string[]> = {
    "Slack":           ["personal names", "email addresses", "telephone numbers"],
    "Zoom":            ["personal names", "email addresses"],
    "Microsoft Teams": ["personal names", "email addresses"],
    "Google Meet":     ["personal names", "email addresses"],
    "ChatGPT":         ["personal names", "email addresses", "postal addresses", "birthdates"],
    "Claude":          ["personal names", "email addresses", "postal addresses"],
    "Gemini":          ["personal names", "email addresses"],
    "Perplexity AI":   ["personal names", "email addresses"],
    "Copilot":         ["personal names", "email addresses"],
    "Jasper AI":       ["personal names", "email addresses"],
    "Grammarly":       ["personal names", "email addresses", "postal addresses"],
    "Notion":          ["personal names", "email addresses"],
    "Airtable":        ["personal names", "email addresses", "telephone numbers"],
    "Salesforce":      ["personal names", "email addresses", "telephone numbers", "postal addresses"],
    "HubSpot CRM":     ["personal names", "email addresses", "telephone numbers"],
    "Pipedrive":       ["personal names", "email addresses", "telephone numbers"],
    "Mailchimp":       ["personal names", "email addresses"],
    "SendGrid":        ["personal names", "email addresses"],
    "Intercom":        ["personal names", "email addresses", "telephone numbers"],
    "Zendesk":         ["personal names", "email addresses", "telephone numbers", "postal addresses"],
    "Freshdesk":       ["personal names", "email addresses", "telephone numbers"],
    "Calendly":        ["personal names", "email addresses"],
    "Evernote":        ["personal names", "email addresses"],
    "Loom":            ["personal names", "email addresses"],
    "Segment":         ["personal names", "email addresses", "ip addresses"],
    "Mixpanel":        ["personal names", "email addresses", "ip addresses"],
    "Amplitude":       ["personal names", "email addresses", "ip addresses"],
  };

  const statuses = ["Sanctioned", "Unsanctioned"] as const;
  for (let i = 0; i < appNames.length; i++) {
    const name = appNames[i];
    const cat = appCategoryMap[name] || "Uncategorized";
    const status = statuses[i % 3 === 0 ? 1 : 0]; // ~1/3 unsanctioned
    const piiTypes = appPiiMap[name] ?? [];
    const hasPii = piiTypes.length > 0;
    items.push({
      id: `unmanaged-app-${i}`,
      name,
      category: "Unmanaged Destination",
      source: "Unmanaged \u203A Application",
      navId: "unmanaged-application",
      details: {
        Type: "Application",
        Category: cat,
        Status: status,
        ...(hasPii ? { "PII Detected": piiTypes.map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ") } : {}),
      },
      searchableText: [name, cat, status, "application", "unmanaged", "app", ...(hasPii ? ["pii", ...piiTypes] : [])].join(" ").toLowerCase(),
      tags: ["unmanaged", "application", cat.toLowerCase(), status.toLowerCase(), ...(hasPii ? ["pii", ...piiTypes] : [])],
    });
  }

  const websiteDomains = [
    "filetransfer.io", "wetransfer.com", "sendanywhere.com", "mega.nz",
    "pastebin.com", "gist.github.com", "cryptpad.fr", "replit.com",
    "codesandbox.io", "stackblitz.com", "reddit.com", "news.ycombinator.com",
    "twitter.com", "linkedin.com", "facebook.com", "medium.com",
    "dev.to", "substack.com", "youtube.com", "vimeo.com", "twitch.tv",
    "imgur.com", "archive.org", "protonmail.com", "guerrillamail.com",
    "nordvpn.com", "torproject.org", "duckduckgo.com", "shodan.io",
    "virustotal.com", "exploit-db.com", "hackerone.com", "chatgpt.com",
    "claude.ai", "perplexity.ai", "notion.so", "figma.com", "canva.com",
    "miro.com", "excalidraw.com", "diagrams.net",
  ];

  const websiteCatMap: Record<string, string> = {
    "filetransfer.io": "File Sharing", "wetransfer.com": "File Sharing",
    "sendanywhere.com": "File Sharing", "mega.nz": "Cloud Storage",
    "pastebin.com": "Paste Bin", "gist.github.com": "Code Sharing",
    "cryptpad.fr": "Encrypted Collaboration", "replit.com": "IDE",
    "codesandbox.io": "IDE", "stackblitz.com": "IDE",
    "reddit.com": "Social Media", "news.ycombinator.com": "Social Media",
    "twitter.com": "Social Media", "linkedin.com": "Social Media",
    "facebook.com": "Social Media", "medium.com": "Blogging",
    "dev.to": "Developer Community", "substack.com": "Newsletter",
    "youtube.com": "Video Streaming", "vimeo.com": "Video Streaming",
    "twitch.tv": "Live Streaming", "imgur.com": "Image Sharing",
    "archive.org": "Digital Archive", "protonmail.com": "Encrypted Email",
    "guerrillamail.com": "Disposable Email", "nordvpn.com": "VPN",
    "torproject.org": "Privacy", "duckduckgo.com": "Search Engine",
    "shodan.io": "Security Research", "virustotal.com": "Security Research",
    "exploit-db.com": "Security Research", "hackerone.com": "Bug Bounty",
    "chatgpt.com": "Generative AI", "claude.ai": "Generative AI",
    "perplexity.ai": "Generative AI", "notion.so": "Collaboration",
    "figma.com": "Design", "canva.com": "Design",
    "miro.com": "Collaboration", "excalidraw.com": "Design",
    "diagrams.net": "Diagramming",
  };

  // PII data types observed being transmitted to each unmanaged website
  const websitePiiMap: Record<string, string[]> = {
    "chatgpt.com":        ["personal names", "email addresses", "postal addresses", "birthdates"],
    "claude.ai":          ["personal names", "email addresses", "postal addresses"],
    "perplexity.ai":      ["personal names", "email addresses"],
    "notion.so":          ["personal names", "email addresses"],
    "filetransfer.io":    ["personal names", "email addresses"],
    "wetransfer.com":     ["personal names", "email addresses"],
    "mega.nz":            ["personal names", "email addresses"],
    "protonmail.com":     ["personal names", "email addresses"],
    "linkedin.com":       ["personal names", "email addresses", "telephone numbers"],
    "twitter.com":        ["personal names", "email addresses"],
    "facebook.com":       ["personal names", "email addresses", "birthdates", "telephone numbers"],
    "medium.com":         ["personal names", "email addresses"],
    "substack.com":       ["personal names", "email addresses"],
    "canva.com":          ["personal names", "email addresses"],
    "miro.com":           ["personal names", "email addresses"],
    "pastebin.com":       ["email addresses", "ip addresses"],
    "gist.github.com":    ["email addresses", "ip addresses"],
    "replit.com":         ["personal names", "email addresses"],
    "guerrillamail.com":  ["email addresses"],
  };

  for (let i = 0; i < websiteDomains.length; i++) {
    const name = websiteDomains[i];
    const cat = websiteCatMap[name] || "Uncategorized";
    const piiTypes = websitePiiMap[name] ?? [];
    const hasPii = piiTypes.length > 0;
    items.push({
      id: `unmanaged-web-${i}`,
      name,
      category: "Unmanaged Destination",
      source: "Unmanaged \u203A Website",
      navId: "unmanaged-websites",
      details: {
        Type: "Website",
        Category: cat,
        ...(hasPii ? { "PII Detected": piiTypes.map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ") } : {}),
      },
      searchableText: [name, cat, "website", "websites", "unmanaged", "domain", ...(hasPii ? ["pii", ...piiTypes] : [])].join(" ").toLowerCase(),
      tags: ["unmanaged", "website", "websites", cat.toLowerCase(), ...(hasPii ? ["pii", ...piiTypes] : [])],
    });
  }

  // ─── Sensitive Files ───────────────────────────────────────────────────────
  for (const file of SENSITIVE_FILES_REGISTRY) {
    items.push({
      id: `sensitive-file-${file.id}`,
      name: file.name,
      subtitle: file.path,
      category: "Sensitive File",
      source: file.storeSource,
      navId: file.navId,
      details: {
        "Store": file.store,
        "Size": file.size,
        "Last Modified": file.lastModified,
        "Data Types": file.dataTypes.join(", "),
      },
      searchableText: [file.name, file.path, file.store, file.storeSource, ...file.dataTypes, "sensitive", "file", "files", ...(file.dataTypes.includes("Social Security Numbers") ? ["ssn", "social security"] : [])].filter(Boolean).join(" ").toLowerCase(),
      tags: [...file.dataTypes.map((d) => d.toLowerCase()), "sensitive", "file", ...(file.dataTypes.includes("Social Security Numbers") ? ["ssn"] : [])],
    });
  }

  // ─── Sensitive Columns ─────────────────────────────────────────────────────
  for (const col of SENSITIVE_COLUMNS_REGISTRY) {
    items.push({
      id: `sensitive-column-${col.id}`,
      name: col.columnName,
      subtitle: `${col.schema}.${col.tableName}`,
      category: "Sensitive Column",
      source: `${col.storeSource} › ${col.store}`,
      navId: col.navId,
      details: {
        "Table":    `${col.schema}.${col.tableName}`,
        "Store":    col.store,
        "Data Type": col.dataType,
        "Category": col.dataCategory,
        "Row Count": col.rowCount,
      },
      searchableText: [col.columnName, col.tableName, col.schema, col.store, col.storeSource, col.dataType, col.dataCategory, "sensitive", "column", "columns", "field", "structured"].join(" ").toLowerCase(),
      tags: [col.dataType.toLowerCase(), col.dataCategory.toLowerCase(), "sensitive", "column", "columns", "structured", col.navId],
    });
  }

  return items;
}

// ── Natural-language search engine ───────────────────────────────────────────

/**
 * Intent-aware keyword search.
 *
 * Supports natural language like:
 *   "databases with SSN"
 *   "unsanctioned applications"
 *   "agents using GPT"
 *   "generative AI apps"
 *   "drives with medical records"
 *   "all identities"
 *   "data stores with passwords"
 */
export function searchInventory(
  query: string,
  items: SearchableItem[],
): SearchableItem[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];

  // ── Intent: category filter ─────────────────────────────────────────────
  const categoryKeywords: { pattern: RegExp; categories: ItemCategory[] }[] = [
    { pattern: /\b(data\s*store|bucket|drive|s3|rds|sql|database|db)\b/i, categories: ["Unstructured Data Store", "Structured Data Store"] },
    { pattern: /\b(unstructured)\b/i, categories: ["Unstructured Data Store"] },
    { pattern: /\b(structured)\b/i, categories: ["Structured Data Store"] },
    { pattern: /\b(identit|user|account|agent|service\s*account|3rd.party)\b/i, categories: ["Identity"] },
    { pattern: /\b(unmanaged|destination|application|websites?|app(?:lication)?s?)\b/i, categories: ["Unmanaged Destination"] },
    { pattern: /\bfiles?(?!\s+shar)\b/i, categories: ["Sensitive File"] },
    { pattern: /\b(columns?|fields?|schema|table)\b/i, categories: ["Sensitive Column"] },
  ];

  let categoryFilter: ItemCategory[] | null = null;
  for (const ck of categoryKeywords) {
    if (ck.pattern.test(raw)) {
      categoryFilter = categoryFilter
        ? [...new Set([...categoryFilter, ...ck.categories])]
        : ck.categories;
    }
  }

  // ── Intent: status filter ───────────────────────────────────────────────
  let statusFilter: string | null = null;
  if (/\bunsanctioned\b/.test(raw)) statusFilter = "unsanctioned";
  else if (/\bsanctioned\b/.test(raw)) statusFilter = "sanctioned";

  // ── Extract meaningful keywords (strip stop words) ──────────────────────
  const stopWords = new Set([
    "show", "me", "all", "the", "with", "that", "have", "has", "having",
    "containing", "contain", "contains", "find", "search", "for", "in",
    "and", "or", "a", "an", "of", "to", "from", "any", "every", "which",
    "where", "what", "list", "get", "give", "display", "are", "is",
    "stores", "store", "using", "used", "data", "types",
    "access", "can", "who", "whose",
  ]);

  const keywords = raw
    .replace(/[^\w\s.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  // ── Score each item ─────────────────────────────────────────────────────
  const scored: { item: SearchableItem; score: number }[] = [];

  for (const item of items) {
    let score = 0;

    // Category filter — non-matching items are excluded
    if (categoryFilter && !categoryFilter.includes(item.category)) {
      continue;
    }

    // Status filter
    if (statusFilter) {
      const itemStatus = item.details.Status?.toLowerCase();
      if (itemStatus && itemStatus !== statusFilter) continue;
      if (itemStatus === statusFilter) score += 20;
    }

    // Keyword matching
    for (const kw of keywords) {
      if (item.searchableText.includes(kw)) score += 10;
      if (item.name.toLowerCase().includes(kw)) score += 15;
      if (item.tags.some((t) => t.includes(kw))) score += 5;
    }

    // Generic category-only queries (e.g. "all identities")
    if (keywords.length === 0 && categoryFilter) {
      score = 5;
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.map((s) => s.item);
}

// ── Shared filter constants (used by both InventorySearchBar and InventorySearchResults) ──

export type FilterKey =
  | "all"
  | "managed-destinations"
  | "google-drive" | "aws" | "sharepoint" | "azure" | "endpoint" | "on-prem"
  | "unstructured" | "structured"
  | "identity"
  | "identity-internal-user" | "identity-external-user" | "identity-stale"
  | "identity-active" | "identity-unmapped-local-user" | "identity-unknown-identity"
  | "identity-connected-app" | "identity-service-account"
  | "unmanaged-destinations" | "unmanaged-apps" | "unmanaged-websites"
  | "sanctioned-destinations" | "unsanctioned-destinations"
  | "sanctioned-apps" | "unsanctioned-apps"
  | "sensitive-file" | "sensitive-column" | "sensitive-others"
  | "pii" | "spii" | "psi" | "pci" | "pfi" | "phi" | "pai" | "bii"
  | "slack" | "zoom" | "chatgpt" | "notion" | "trello" | "dropbox" | "github" | "figma" | "teams"
  | "filetransfer.io" | "wetransfer.com" | "mega.nz" | "pastebin.com"
  | "replit.com" | "reddit.com" | "twitter.com" | "linkedin.com"
  | "youtube.com" | "medium.com" | "protonmail.com"
  | "chatgpt.com" | "claude.ai" | "perplexity.ai" | "canva.com"
  | "nordvpn.com" | "torproject.org" | "hackerone.com" | "virustotal.com"
  | "sdt-personal-names" | "sdt-email-addresses" | "sdt-telephone-numbers" | "sdt-postal-addresses"
  | "sdt-birthdates" | "sdt-gender" | "sdt-age" | "sdt-nationality" | "sdt-ip-addresses"
  | "sdt-mac-addresses" | "sdt-domain-names" | "sdt-uri-hosts" | "sdt-uuids" | "sdt-device-ids"
  | "sdt-browser-fingerprints" | "sdt-geolocation-data" | "sdt-vehicle-ids" | "sdt-student-records" | "sdt-education-ids"
  | "sdt-social-security-numbers" | "sdt-driver-licenses" | "sdt-national-ids" | "sdt-passports"
  | "sdt-taxpayer-ids" | "sdt-voter-registration-ids"
  | "sdt-ethnicity-and-race" | "sdt-marital-status" | "sdt-religious-beliefs" | "sdt-political-opinions"
  | "sdt-sexual-orientation" | "sdt-immigration-status"
  | "sdt-payment-cards"
  | "sdt-bank-account-information" | "sdt-financial-ids" | "sdt-currency" | "sdt-securities-ids"
  | "sdt-credit-scores" | "sdt-income-information" | "sdt-tax-records"
  | "sdt-medical-records" | "sdt-medical-diagnoses" | "sdt-healthcare-ids" | "sdt-healthcare-provider-ids"
  | "sdt-health-insurance-ids" | "sdt-prescription-information" | "sdt-biometric-data" | "sdt-genetic-data"
  | "sdt-passwords" | "sdt-private-keys" | "sdt-public-keys" | "sdt-secrets-and-tokens"
  | "sdt-security-questions" | "sdt-mfa-seeds"
  | "sdt-source-code" | "sdt-company-names" | "sdt-trade-secrets" | "sdt-legal-privileges";

export type ResultType = "data-stores" | "destinations" | "sensitive-files" | "identities";

export const CATEGORY_TYPES: Record<string, string[]> = {
  pii:  ["personal names","email addresses","telephone numbers","postal addresses","birthdates","gender","age","nationality","ip addresses","mac addresses","domain names","uri hosts","uuids","device ids","browser fingerprints","geolocation data","vehicle ids","student records","education ids"],
  spii: ["social security numbers","driver licenses","national ids","passports","taxpayer ids","voter registration ids"],
  psi:  ["ethnicity and race","marital status","religious beliefs","political opinions","sexual orientation","immigration status"],
  pci:  ["payment cards"],
  pfi:  ["bank account information","financial ids","currency","securities ids","credit scores","income information","tax records"],
  phi:  ["medical records","medical diagnoses","healthcare ids","healthcare provider ids","health insurance ids","prescription information","biometric data","genetic data"],
  pai:  ["passwords","private keys","public keys","secrets and tokens","security questions","mfa seeds"],
  bii:  ["source code","company names","trade secrets","legal privileges"],
};

export const FILTER_PREDICATES: Record<FilterKey, (item: SearchableItem) => boolean> = {
  "all":                  () => true,
  "managed-destinations": (i) => i.category === "Unstructured Data Store" || i.category === "Structured Data Store",
  "google-drive":         (i) => i.navId === "drives"                                     || (i.category === "Identity" && (i.tags?.includes("google-drive") ?? false)),
  "aws":                  (i) => i.navId === "s3" || i.navId === "rds"                    || (i.category === "Identity" && (i.tags?.includes("aws") ?? false)),
  "sharepoint":           (i) => i.navId === "sharepoint-sites"                           || (i.category === "Identity" && (i.tags?.includes("sharepoint") ?? false)),
  "azure":                (i) => i.navId === "azure-blob" || i.navId === "azure-sql"      || (i.category === "Identity" && (i.tags?.includes("azure") ?? false)),
  "endpoint":             (i) => i.navId === "user-device",
  "on-prem":              (i) => i.navId === "postgresql" || i.navId === "oracle",
  "unstructured":         (i) => i.category === "Unstructured Data Store",
  "structured":           (i) => i.category === "Structured Data Store",
  "identity":             (i) => i.category === "Identity",
  "identity-internal-user":   (i) => i.category === "Identity" && i.navId === "internal-user",
  "identity-external-user":   (i) => i.category === "Identity" && i.navId === "external-user",
  "identity-stale":           (i) => i.category === "Identity" && (i.tags?.includes("stale") ?? false),
  "identity-active":          (i) => i.category === "Identity" && (i.tags?.includes("active") ?? false),
  "identity-unmapped-local-user":  (i) => i.category === "Identity" && i.navId === "unmapped-local-user",
  "identity-unknown-identity":     (i) => i.category === "Identity" && i.navId === "unknown-identity",
  "identity-connected-app":        (i) => i.category === "Identity" && i.navId === "connected-app",
  "identity-service-account":      (i) => i.category === "Identity" && i.navId === "service-account",
  "unmanaged-destinations":    (i) => i.category === "Unmanaged Destination",
  "unmanaged-apps":            (i) => i.navId === "unmanaged-application" || (i.category === "Identity" && !!(i.tags?.some((t) => ["slack","zoom","teams","notion","trello","github","figma","chatgpt","dropbox"].includes(t)))),
  "unmanaged-websites":        (i) => i.navId === "unmanaged-websites"    || (i.category === "Identity" && !!(i.tags?.some((t) => t.endsWith(".com") || t.endsWith(".io") || t.endsWith(".ai") || t.endsWith(".nz") || t.endsWith(".org")))),
  "sanctioned-destinations":   (i) => i.category === "Unmanaged Destination" && ["linkedin.com","youtube.com","medium.com","canva.com","replit.com"].includes(i.name),
  "unsanctioned-destinations": (i) => i.navId === "unmanaged-websites",
  "sanctioned-apps":           (i) => i.navId === "unmanaged-application" && i.details?.Status === "Sanctioned",
  "unsanctioned-apps":         (i) => i.navId === "unmanaged-application" && i.details?.Status === "Unsanctioned",
  "sensitive-file":            (i) => i.category === "Sensitive File",
  "sensitive-column":          (i) => i.category === "Sensitive Column",
  "sensitive-others":          (i) => i.category !== "Sensitive File" && i.category !== "Sensitive Column",
  "pii":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pii.includes(t)) ?? false,
  "spii": (i) => i.tags?.some((t) => CATEGORY_TYPES.spii.includes(t)) ?? false,
  "psi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.psi.includes(t)) ?? false,
  "pci":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pci.includes(t)) ?? false,
  "pfi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pfi.includes(t)) ?? false,
  "phi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.phi.includes(t)) ?? false,
  "pai":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pai.includes(t)) ?? false,
  "bii":  (i) => i.tags?.some((t) => CATEGORY_TYPES.bii.includes(t)) ?? false,
  "sdt-personal-names":          (i) => i.tags?.includes("personal names") ?? false,
  "sdt-email-addresses":         (i) => i.tags?.includes("email addresses") ?? false,
  "sdt-telephone-numbers":       (i) => i.tags?.includes("telephone numbers") ?? false,
  "sdt-postal-addresses":        (i) => i.tags?.includes("postal addresses") ?? false,
  "sdt-birthdates":              (i) => i.tags?.includes("birthdates") ?? false,
  "sdt-gender":                  (i) => i.tags?.includes("gender") ?? false,
  "sdt-age":                     (i) => i.tags?.includes("age") ?? false,
  "sdt-nationality":             (i) => i.tags?.includes("nationality") ?? false,
  "sdt-ip-addresses":            (i) => i.tags?.includes("ip addresses") ?? false,
  "sdt-mac-addresses":           (i) => i.tags?.includes("mac addresses") ?? false,
  "sdt-domain-names":            (i) => i.tags?.includes("domain names") ?? false,
  "sdt-uri-hosts":               (i) => i.tags?.includes("uri hosts") ?? false,
  "sdt-uuids":                   (i) => i.tags?.includes("uuids") ?? false,
  "sdt-device-ids":              (i) => i.tags?.includes("device ids") ?? false,
  "sdt-browser-fingerprints":    (i) => i.tags?.includes("browser fingerprints") ?? false,
  "sdt-geolocation-data":        (i) => i.tags?.includes("geolocation data") ?? false,
  "sdt-vehicle-ids":             (i) => i.tags?.includes("vehicle ids") ?? false,
  "sdt-student-records":         (i) => i.tags?.includes("student records") ?? false,
  "sdt-education-ids":           (i) => i.tags?.includes("education ids") ?? false,
  "sdt-social-security-numbers": (i) => i.tags?.includes("social security numbers") ?? false,
  "sdt-driver-licenses":         (i) => i.tags?.includes("driver licenses") ?? false,
  "sdt-national-ids":            (i) => i.tags?.includes("national ids") ?? false,
  "sdt-passports":               (i) => i.tags?.includes("passports") ?? false,
  "sdt-taxpayer-ids":            (i) => i.tags?.includes("taxpayer ids") ?? false,
  "sdt-voter-registration-ids":  (i) => i.tags?.includes("voter registration ids") ?? false,
  "sdt-ethnicity-and-race":      (i) => i.tags?.includes("ethnicity and race") ?? false,
  "sdt-marital-status":          (i) => i.tags?.includes("marital status") ?? false,
  "sdt-religious-beliefs":       (i) => i.tags?.includes("religious beliefs") ?? false,
  "sdt-political-opinions":      (i) => i.tags?.includes("political opinions") ?? false,
  "sdt-sexual-orientation":      (i) => i.tags?.includes("sexual orientation") ?? false,
  "sdt-immigration-status":      (i) => i.tags?.includes("immigration status") ?? false,
  "sdt-payment-cards":           (i) => i.tags?.includes("payment cards") ?? false,
  "sdt-bank-account-information":(i) => i.tags?.includes("bank account information") ?? false,
  "sdt-financial-ids":           (i) => i.tags?.includes("financial ids") ?? false,
  "sdt-currency":                (i) => i.tags?.includes("currency") ?? false,
  "sdt-securities-ids":          (i) => i.tags?.includes("securities ids") ?? false,
  "sdt-credit-scores":           (i) => i.tags?.includes("credit scores") ?? false,
  "sdt-income-information":      (i) => i.tags?.includes("income information") ?? false,
  "sdt-tax-records":             (i) => i.tags?.includes("tax records") ?? false,
  "sdt-medical-records":         (i) => i.tags?.includes("medical records") ?? false,
  "sdt-medical-diagnoses":       (i) => i.tags?.includes("medical diagnoses") ?? false,
  "sdt-healthcare-ids":          (i) => i.tags?.includes("healthcare ids") ?? false,
  "sdt-healthcare-provider-ids": (i) => i.tags?.includes("healthcare provider ids") ?? false,
  "sdt-health-insurance-ids":    (i) => i.tags?.includes("health insurance ids") ?? false,
  "sdt-prescription-information":(i) => i.tags?.includes("prescription information") ?? false,
  "sdt-biometric-data":          (i) => i.tags?.includes("biometric data") ?? false,
  "sdt-genetic-data":            (i) => i.tags?.includes("genetic data") ?? false,
  "sdt-passwords":               (i) => i.tags?.includes("passwords") ?? false,
  "sdt-private-keys":            (i) => i.tags?.includes("private keys") ?? false,
  "sdt-public-keys":             (i) => i.tags?.includes("public keys") ?? false,
  "sdt-secrets-and-tokens":      (i) => i.tags?.includes("secrets and tokens") ?? false,
  "sdt-security-questions":      (i) => i.tags?.includes("security questions") ?? false,
  "sdt-mfa-seeds":               (i) => i.tags?.includes("mfa seeds") ?? false,
  "sdt-source-code":             (i) => i.tags?.includes("source code") ?? false,
  "sdt-company-names":           (i) => i.tags?.includes("company names") ?? false,
  "sdt-trade-secrets":           (i) => i.tags?.includes("trade secrets") ?? false,
  "sdt-legal-privileges":        (i) => i.tags?.includes("legal privileges") ?? false,
  "slack":    (i) => (i.category === "Unmanaged Destination" && i.name === "Slack")           || (i.category === "Identity" && (i.tags?.includes("slack") ?? false)),
  "zoom":     (i) => (i.category === "Unmanaged Destination" && i.name === "Zoom")            || (i.category === "Identity" && (i.tags?.includes("zoom") ?? false)),
  "chatgpt":  (i) => (i.category === "Unmanaged Destination" && i.name === "ChatGPT")         || (i.category === "Identity" && (i.tags?.includes("chatgpt") ?? false)),
  "notion":   (i) => (i.category === "Unmanaged Destination" && i.name === "Notion")          || (i.category === "Identity" && (i.tags?.includes("notion") ?? false)),
  "trello":   (i) => (i.category === "Unmanaged Destination" && i.name === "Trello")          || (i.category === "Identity" && (i.tags?.includes("trello") ?? false)),
  "dropbox":  (i) => (i.category === "Unmanaged Destination" && i.name === "Dropbox")         || (i.category === "Identity" && (i.tags?.includes("dropbox") ?? false)),
  "github":   (i) => (i.category === "Unmanaged Destination" && i.name === "GitHub")          || (i.category === "Identity" && (i.tags?.includes("github") ?? false)),
  "figma":    (i) => (i.category === "Unmanaged Destination" && i.name === "Figma")           || (i.category === "Identity" && (i.tags?.includes("figma") ?? false)),
  "teams":    (i) => (i.category === "Unmanaged Destination" && i.name === "Microsoft Teams") || (i.category === "Identity" && (i.tags?.includes("teams") ?? false)),
  "filetransfer.io":  (i) => (i.category === "Unmanaged Destination" && i.name === "filetransfer.io")  || (i.category === "Identity" && (i.tags?.includes("filetransfer.io") ?? false)),
  "wetransfer.com":   (i) => (i.category === "Unmanaged Destination" && i.name === "wetransfer.com")   || (i.category === "Identity" && (i.tags?.includes("wetransfer.com") ?? false)),
  "mega.nz":          (i) => (i.category === "Unmanaged Destination" && i.name === "mega.nz")          || (i.category === "Identity" && (i.tags?.includes("mega.nz") ?? false)),
  "pastebin.com":     (i) => (i.category === "Unmanaged Destination" && i.name === "pastebin.com")     || (i.category === "Identity" && (i.tags?.includes("pastebin.com") ?? false)),
  "replit.com":       (i) => (i.category === "Unmanaged Destination" && i.name === "replit.com")       || (i.category === "Identity" && (i.tags?.includes("replit.com") ?? false)),
  "reddit.com":       (i) => (i.category === "Unmanaged Destination" && i.name === "reddit.com")       || (i.category === "Identity" && (i.tags?.includes("reddit.com") ?? false)),
  "twitter.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "twitter.com")      || (i.category === "Identity" && (i.tags?.includes("twitter.com") ?? false)),
  "linkedin.com":     (i) => (i.category === "Unmanaged Destination" && i.name === "linkedin.com")     || (i.category === "Identity" && (i.tags?.includes("linkedin.com") ?? false)),
  "youtube.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "youtube.com")      || (i.category === "Identity" && (i.tags?.includes("youtube.com") ?? false)),
  "medium.com":       (i) => (i.category === "Unmanaged Destination" && i.name === "medium.com")       || (i.category === "Identity" && (i.tags?.includes("medium.com") ?? false)),
  "protonmail.com":   (i) => (i.category === "Unmanaged Destination" && i.name === "protonmail.com")   || (i.category === "Identity" && (i.tags?.includes("protonmail.com") ?? false)),
  "chatgpt.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "chatgpt.com")      || (i.category === "Identity" && (i.tags?.includes("chatgpt.com") ?? false)),
  "claude.ai":        (i) => (i.category === "Unmanaged Destination" && i.name === "claude.ai")        || (i.category === "Identity" && (i.tags?.includes("claude.ai") ?? false)),
  "perplexity.ai":    (i) => (i.category === "Unmanaged Destination" && i.name === "perplexity.ai")    || (i.category === "Identity" && (i.tags?.includes("perplexity.ai") ?? false)),
  "canva.com":        (i) => (i.category === "Unmanaged Destination" && i.name === "canva.com")        || (i.category === "Identity" && (i.tags?.includes("canva.com") ?? false)),
  "nordvpn.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "nordvpn.com")      || (i.category === "Identity" && (i.tags?.includes("nordvpn.com") ?? false)),
  "torproject.org":   (i) => (i.category === "Unmanaged Destination" && i.name === "torproject.org")   || (i.category === "Identity" && (i.tags?.includes("torproject.org") ?? false)),
  "hackerone.com":    (i) => (i.category === "Unmanaged Destination" && i.name === "hackerone.com")    || (i.category === "Identity" && (i.tags?.includes("hackerone.com") ?? false)),
  "virustotal.com":   (i) => (i.category === "Unmanaged Destination" && i.name === "virustotal.com")   || (i.category === "Identity" && (i.tags?.includes("virustotal.com") ?? false)),
};

export const RESULT_TYPE_CATEGORY_FILTER: Record<ResultType, (item: SearchableItem) => boolean> = {
  "data-stores":     (i) => i.category === "Unstructured Data Store" || i.category === "Structured Data Store",
  "destinations":    (i) => i.category === "Unmanaged Destination",
  "sensitive-files": (i) => i.category === "Sensitive File" || i.category === "Sensitive Column",
  "identities":      (i) => i.category === "Identity",
};