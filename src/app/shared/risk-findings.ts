// ── Mock findings data ───────────────────────────────────────────────────────
// Each finding is one specific policy match instance for a given Risk Rule.
// Topology nodes define what to render in the visual flow diagram.

import type { PolicyEngineKey } from "./risk-rules";

export type Severity = "Critical" | "High" | "Medium";
export type FindingStatus = "Open" | "Rescan" | "Closed";

export type TopologyNodeType =
  | "identity"    // person/account
  | "store"       // managed data store (S3, SharePoint, etc.)
  | "file"        // a specific document/object within a store
  | "destination" // unmanaged destination (webmail, AI app, etc.)
  | "config"      // a misconfiguration
  | "device"      // endpoint device
  | "activity";   // an action/event (upload, download, mass-copy)

export interface TopologyNode {
  type: TopologyNodeType;
  label: string;      // primary label
  sublabel: string;   // secondary (role, platform, count, etc.)
  badge?: string;     // optional alert badge text
  alert?: boolean;    // true = show red highlight on this node
}

export interface TopologyEdge {
  label: string;
  dashed?: boolean;
}

export interface RecommendedAction {
  text: string;
  /** Core remediation action type if this action is directly actionable */
  remediationAction?: 'quarantine' | 'delete' | 'restrict-access' | 'apply-dlp' | 'revoke-public' | 'revoke-external' | 'revoke-company' | 'legal-hold' | 'apply-sensitivity-label' | 'notify-owner' | 'change-ownership' | 'request-justification';
}

export type ExposureType = "Public" | "External" | "All Internal Users" | "EEEU";

export interface MockFinding {
  id: string;
  ruleId: string;
  severity: Severity;
  status: FindingStatus;
  detectedAt: string;   // human-readable relative date
  lastSeenAt: string;
  // Topology: N nodes + N-1 edges (must have 2-4 nodes)
  topology: { nodes: TopologyNode[]; edges: TopologyEdge[] };
  // Specific matched condition text (more prescriptive than rule template)
  matchedCondition: string;
  // What was actually found (data types, counts, etc.)
  evidence: string[];
  // Specific action for this finding
  action: RecommendedAction[];
  // Why this is risky
  rationale: string;
  exposureType?: ExposureType;
}

// ── Explicit findings for each rule ─────────────────────────────────────────

const FINDINGS: MockFinding[] = [

  // ══════════════════════════════════════════════════════════════════════════
  //  r-oe-01  Cleartext Passwords Stored in SaaS Documents  (CASB API, 6)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-3401", ruleId: "r-oe-01", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Employee_Creds_2024.xlsx", sublabel: "Diana Reyes · 23 password matches", badge: "23 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: `App: Google Drive (acme-hr.google.com "HR Confidential") · Content: 23 entries match "Password Dump" pattern (plaintext passwords, hashed pw columns, security Q&A) · Exposure: Internal`,
    evidence: [
      "File: Employee_Creds_2024.xlsx (2.1 MB, last modified 14 days ago)",
      "Pattern matched: 'Password Dump' — 23 row-level matches across Sheet1 (cols D–F)",
      "Sensitive columns: plaintext_password, temp_pin, security_answer",
      "Data types co-present: Personal Names, Email Addresses, Social Security Numbers",
      "File owner: Diana Reyes (diana.reyes@company.com) · Shared with: HR team (47 members)",
    ],
    rationale: "A cleartext password file sitting inside a broadly-shared HR Google Drive gives any internal user with drive access a ready-made credential list. Combined with Social Security Numbers and Email Addresses in the same file, a single compromised account can turn this into a mass credential exposure event.",
    action: [
      { text: "Quarantine 'Employee_Creds_2024.xlsx' to admin-controlled quarantine folder immediately", remediationAction: 'quarantine' },
      { text: "Notify owner Diana Reyes (diana.reyes@company.com) and her manager with remediation instructions" },
      { text: "Review all files in 'HR Confidential' for additional Password Dump pattern matches — 3 other files flagged by scanner" },
      { text: "Apply DLP Policy 'Credential Exposure' to Google Drive to block future uploads matching this pattern", remediationAction: 'apply-dlp' },
      { text: "Require Diana Reyes to rotate any credentials referenced in the file within 24 hours" },
    ] },
  {
    id: "FND-2024-3402", ruleId: "r-oe-01", severity: "Critical", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "CI/CD Pipeline", sublabel: "Service Account · DevOps" },
        { type: "activity", label: "File Upload", sublabel: "4.8 KB · Credentials", badge: "Created", alert: true },
        { type: "store", label: "Engineering Shared Drive", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",  label: "deployment-secrets-legacy.txt", sublabel: "CI/CD Pipeline · 15 credential matches", badge: "15 matches", alert: true },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }, { label: "contains" }] },
    matchedCondition: `App: Google Drive (acme-corp.google.com "Engineering Shared Drive") · Content: 15 entries match "Credentials" pattern (API keys, DB conn strings, JWT secrets) · Exposure: Internal`,
    evidence: [
      "File: deployment-secrets-legacy.txt (4.8 KB, last modified 31 days ago)",
      "Pattern matched: 'Credentials' — 15 matches including AWS_ACCESS_KEY, DB_PASSWORD, JWT_SECRET",
      "File created by: CI/CD Pipeline (cicd-pipeline service account) in automated deployment job",
      "Data store: Engineering Shared Drive (Google Drive acme-corp.google.com)",
      "File exposure: Internal — accessible to all Engineering team members (214 people)",
      "No encryption or DLP policy applied to file contents",
    ],
    rationale: "Service accounts with write access to shared drives create silent credentials leakage. A legacy deployment file that was never cleaned up can expose infrastructure secrets to the entire engineering org indefinitely.",
    action: [
      { text: "Delete 'deployment-secrets-legacy.txt' from Engineering Shared Drive", remediationAction: 'delete' },
      { text: "Rotate all credentials referenced in the file: 3 AWS Access Keys, 4 DB passwords, 2 JWT secrets" },
      { text: "Audit CI/CD Pipeline service account permissions — revoke write access to shared drives; use secret manager integration instead", remediationAction: 'restrict-access' },
      { text: "Apply DLP Policy 'Private Key / Credential' on Google Drive to auto-quarantine future credential files", remediationAction: 'apply-dlp' },
    ] },
  {
    id: "FND-2024-3403", ruleId: "r-oe-01", severity: "High", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Engineering Shared Drive", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",  label: "dev-env-setup-notes.md", sublabel: "Alice Chen · 8 password matches", badge: "8 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: `App: Google Drive (acme-corp.google.com "Engineering Shared Drive") · Content: 8 entries match "Password Dump" pattern (dev passwords, database credentials in markdown) · Exposure: Internal`,
    evidence: [
      "File: dev-env-setup-notes.md (18 KB, last modified 3 days ago)",
      "Pattern matched: 'Password Dump' — 8 matches in plaintext code blocks (postgres_pw, redis_auth, etc.)",
      "File owner: Alice Chen (alice.chen@company.com) · Last editor: Alice Chen (alice.chen@company.com)",
      "Data store: Engineering Shared Drive (Google Drive acme-corp.google.com)",
      "Shared with: Engineering team (214 members) · Access type: Viewer",
    ],
    rationale: "Developer setup notes in shared drives frequently accumulate real credentials over time. Markdown files bypass many traditional DLP scanners that focus on Office formats.",
    action: [
      { text: "Quarantine 'dev-env-setup-notes.md' and notify Alice Chen (alice.chen@company.com)", remediationAction: 'quarantine' },
      { text: "Rotate the 8 referenced database credentials (postgres_pw, redis_auth, and 6 others)" },
      { text: "Replace inline credentials in setup documentation with references to the corporate secrets manager (HashiCorp Vault)" },
    ] },
  {
    id: "FND-2024-3404", ruleId: "r-oe-01", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Data Sync Bot", sublabel: "Service Account · Data" },
        { type: "activity", label: "S3 Object Upload", sublabel: "1.2 KB · Credentials", badge: "Created", alert: true },
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · acme-prod.s3.us-east-1.amazonaws.com" },
        { type: "file",  label: "db-connection-strings.json", sublabel: "Data Sync Bot · 6 credential matches", badge: "6 matches", alert: true },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }, { label: "contains" }] },
    matchedCondition: `App: AWS S3 (acme-prod.s3.us-east-1.amazonaws.com "prod-data-lake") · Content: 6 entries match "Credentials" pattern (DB connection strings with embedded passwords) · Exposure: Internal`,
    evidence: [
      "Object: db-connection-strings.json (1.2 KB) in prod-data-lake (s3://prod-data-lake/config/)",
      "Pattern matched: 'Credentials' — 6 connection strings with plaintext passwords",
      "Formats found: postgresql://user:PASSWORD@host, mysql://user:PASSWORD@host",
      "Written by: Data Sync Bot (data-sync-bot IAM Role: DataSyncBotRole) 12 days ago",
    ],
    rationale: "Configuration files containing database connection strings are often written by automated jobs and left in production storage indefinitely. Any principal with S3 read access can harvest these credentials.",
    action: [
      { text: "Delete 'db-connection-strings.json' from prod-data-lake immediately", remediationAction: 'delete' },
      { text: "Rotate all 6 database credentials referenced in the file" },
      { text: "Migrate Data Sync Bot credential handling to AWS Secrets Manager with IAM role-based access", remediationAction: 'restrict-access' },
      { text: "Apply DLP Policy with S3 Object Tagging on prod-data-lake to catch future credential objects", remediationAction: 'apply-dlp' },
    ] },
  {
    id: "FND-2024-3405", ruleId: "r-oe-01", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Team Drive", sublabel: "Google Drive · acme-finance.google.com" },
        { type: "file",  label: "Finance_API_Keys_2024.docx", sublabel: "Brian Kowalski · 4 password matches", badge: "4 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: `App: Google Drive (acme-finance.google.com "Finance Team Drive") · Content: 4 entries match "Credentials" pattern in Word document (banking API keys, payment processor tokens) · Exposure: Internal`,
    evidence: [
      "File: Finance_API_Keys_2024.docx (87 KB, last modified 6 days ago)",
      "Pattern matched: 'Credentials' — 4 API key strings for payment processors (Stripe, Chargebee)",
      "File owner: Brian Kowalski (brian.kowalski@company.com)",
      "Data store: Finance Team Drive (Google Drive acme-finance.google.com)",
      "Shared with: Finance team (31 members) + 2 external collaborators (contractor accounts)",
    ],
    rationale: "Payment processor API keys in shared finance drives create PCI-DSS compliance exposure. External collaborator access amplifies the blast radius significantly.",
    action: [
      { text: "Quarantine 'Finance_API_Keys_2024.docx'", remediationAction: 'quarantine' },
      { text: "Immediately rotate Stripe and Chargebee API keys referenced in the document" },
      { text: "Revoke External Sharing for James Thornton (james.thornton@partner.io) and Priya Nair (priya.nair@contractor.io) from Finance Team Drive", remediationAction: 'revoke-external' },
      { text: "Escalate to PCI compliance team for incident logging" },
    ] },
  {
    id: "FND-2024-3406", ruleId: "r-oe-01", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "HR – Employee Portal", sublabel: "SharePoint · acme-hr.sharepoint.com" },
        { type: "file",  label: "system-passwords.xlsx", sublabel: "Support Copilot · 11 password matches", badge: "11 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: `App: SharePoint (acme-hr.sharepoint.com "HR – Employee Portal") · Content: 11 entries match "Password Dump" pattern in workbook · Exposure: Internal — AI Agent has read access to entire portal`,
    evidence: [
      "File: system-passwords.xlsx (34 KB) in HR – Employee Portal (SharePoint acme-hr.sharepoint.com) document library",
      "Pattern matched: 'Password Dump' — 11 matches (system accounts, service passwords, vendor portal creds)",
      "AI Agent: Support Copilot has broad SharePoint read permissions to assist HR staff",
      "Risk: AI agent may surface these credentials in responses to HR staff queries",
    ],
    rationale: "AI agents with broad document read access can inadvertently expose credential files through generated responses. This is especially risky when the credentials relate to HR systems handling PII.",
    action: [
      { text: "Quarantine 'system-passwords.xlsx' — remove from SharePoint document library", remediationAction: 'quarantine' },
      { text: "Rotate all 11 system account passwords referenced in the file" },
      { text: "Review and scope down Support Copilot's SharePoint permissions to specific document libraries", remediationAction: 'restrict-access' },
      { text: "Apply DLP Policy to exclude credential-pattern documents from AI agent ingestion", remediationAction: 'apply-dlp' },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-oe-01  (NEW batch — FND-2025-1001..1005)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2025-1001", ruleId: "r-oe-01", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "2 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "code-artifacts", sublabel: "AWS S3 · prod-data-lake", alert: true },
        { type: "file",  label: "terraform.tfvars", sublabel: "infra-bot · 18 credential matches", badge: "18 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/code-artifacts/) · Content: 18 matches for 'Credentials' pattern — Terraform variable file with AWS secret keys, DB passwords, Vault tokens · Exposure: Internal (bucket ACL: authenticated AWS users)",
    evidence: [
      "Object: code-artifacts/infra/terraform.tfvars (6.4 KB) uploaded 3 days ago",
      "Pattern matched: 'Credentials' — 18 values: 4 AWS access key pairs, 7 DB passwords, 3 Vault tokens, 4 Stripe API keys",
      "Bucket: prod-data-lake (s3://prod-data-lake) — read access granted to all authenticated IAM principals in account",
      "Object uploaded by: infra-bot (IAM role InfraAutomationRole) as part of CI pipeline artifact",
    ],
    rationale: "Terraform variable files committed to S3 artifact buckets routinely contain production secrets. Any IAM principal in the AWS account can read this file, constituting a blast-radius credential exposure across all referenced services.",
    action: [
      { text: "Delete terraform.tfvars from prod-data-lake immediately", remediationAction: "delete" },
      { text: "Rotate all 18 referenced credentials: AWS keys, DB passwords, Vault tokens, Stripe keys" },
      { text: "Migrate InfraAutomationRole to use AWS Secrets Manager parameter injection — no secrets in .tfvars files", remediationAction: "restrict-access" },
      { text: "Apply S3 Object Lambda + DLP to scan code-artifacts bucket for future credential objects", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1002", ruleId: "r-oe-01", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-configs", sublabel: "Azure Blob · dev-configs" },
        { type: "file",  label: "appsettings.Production.json", sublabel: "deploy-pipeline · 9 credential matches", badge: "9 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: Azure Blob Storage (dev-configs container) · Content: 9 matches — ASP.NET production config with SQL connection strings, SendGrid API key, Azure Storage SAS token · Exposure: Internal (Storage Account public: off, RBAC: Storage Blob Data Reader granted to all developers)",
    evidence: [
      "Blob: dev-configs/appsettings.Production.json (3.1 KB) last modified 8 days ago",
      "Pattern matched: 'Credentials' — SQL Server connection string (password in cleartext), SendGrid API key, Azure SAS token with write scope",
      "RBAC: Storage Blob Data Reader role assigned to 'Developers' AD group (62 members) on dev-configs container",
    ],
    rationale: "Production config files in developer-accessible blob containers give the entire dev team access to production database credentials. A single compromised developer account exposes all connected production services.",
    action: [
      { text: "Delete appsettings.Production.json from dev-configs blob container", remediationAction: "delete" },
      { text: "Rotate SQL Server password, SendGrid API key, and Azure SAS token immediately" },
      { text: "Migrate production secrets to Azure Key Vault — reference by URI, not inline value", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1003", ruleId: "r-oe-01", severity: "Critical", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Shared Drive", sublabel: "SharePoint · acme-corp.sharepoint.com/hr" },
        { type: "file",  label: "IT_Service_Accounts_Master.xlsx", sublabel: "svc-provisioning · 31 password matches", badge: "31 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/hr) · Content: 31 entries match 'Password Dump' pattern — service account master list with plaintext passwords · Exposure: Internal (site members: 89 HR staff)",
    evidence: [
      "File: IT_Service_Accounts_Master.xlsx (124 KB) — 31 service account records with username/password pairs",
      "Site: HR Shared Drive (acme-corp.sharepoint.com/hr) — 89 members including contractors",
      "Data types co-present: Personal Names, Email Addresses (account owners), Telephone Numbers",
      "File last modified: 6 days ago by svc-provisioning (svc-provisioning@company.com)",
    ],
    rationale: "A service account master list with plaintext passwords accessible to 89 HR staff and contractors is a systemic credential breach risk. Service accounts often have elevated privileges across multiple systems.",
    action: [
      { text: "Quarantine IT_Service_Accounts_Master.xlsx immediately", remediationAction: "quarantine" },
      { text: "Rotate all 31 service account passwords" },
      { text: "Migrate service account credentials to CyberArk / HashiCorp Vault", remediationAction: "restrict-access" },
      { text: "Revoke SharePoint access for all contractor accounts on HR Shared Drive", remediationAction: "revoke-external" },
    ] },
  {
    id: "FND-2025-1004", ruleId: "r-oe-01", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "12 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "acme-hr.google.com", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "VPN_Credentials_Remote.txt", sublabel: "Marcus Webb · 7 password matches", badge: "7 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · Content: 7 matches — plaintext VPN credentials, OTP seed strings, LDAP bind passwords · Exposure: Internal",
    evidence: [
      "File: VPN_Credentials_Remote.txt (4 KB) in HR shared folder — 7 plaintext credential entries",
      "Types: VPN username/password pairs, OTP seed strings (allowing TOTP bypass), LDAP bind password",
      "Owner: Marcus Webb (marcus.webb@company.com) · Shared with: HR team + 3 IT contractors",
    ],
    rationale: "VPN credentials and OTP seed strings in a shared drive file allow any viewer to authenticate as another user remotely. OTP seeds are especially dangerous — they negate multi-factor authentication entirely.",
    action: [
      { text: "Quarantine and delete VPN_Credentials_Remote.txt", remediationAction: "delete" },
      { text: "Rotate all VPN credentials and re-provision OTP tokens for affected accounts" },
      { text: "Notify IT Security — OTP seed exposure requires re-enrollment of all listed users" },
    ] },
  {
    id: "FND-2025-1005", ruleId: "r-oe-01", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "file",  label: "legacy-etl-config.yaml", sublabel: "data-pipeline · 5 credential matches", badge: "5 matches", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/etl/configs/) · Content: 5 matches — legacy YAML config with JDBC credentials, SMTP password, Redis AUTH string · Exposure: Internal",
    evidence: [
      "Object: etl/configs/legacy-etl-config.yaml (2.8 KB) — last accessed 11 days ago",
      "Credentials: JDBC username/password (MySQL), SMTP password (for alert emails), Redis AUTH token",
      "Bucket accessible to: ETL team IAM group (18 members) and 2 cross-account roles",
    ],
    rationale: "Legacy configuration files in data lake buckets accumulate stale credentials that are rarely audited. Cross-account role access extends the blast radius beyond the primary AWS account.",
    action: [
      { text: "Delete legacy-etl-config.yaml and audit for other legacy config files in etl/configs/", remediationAction: "delete" },
      { text: "Rotate JDBC, SMTP, and Redis credentials" },
      { text: "Apply S3 bucket policy denying cross-account read on etl/configs/ prefix", remediationAction: "restrict-access" },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-oe-02  Sensitive Data Exposed via Public Links or Global Access  (NEW batch — FND-2025-1006..1010)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2025-1006", ruleId: "r-oe-02", severity: "Critical", status: "Open", exposureType: "Public",
    detectedAt: "4 hours ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake", alert: true },
        { type: "file",  label: "patient_records_2024.parquet", sublabel: "PII + PHI · 847 objects matched" },
        { type: "config", label: "ACL: public-read", sublabel: "Bucket-level · All S3 users", badge: "PUBLIC", alert: true },
      ],
      edges: [{ label: "contains" }, { label: "has misconfiguration" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · Exposure: Bucket ACL = public-read (all S3 users) · Content: PII — 14 data types including Social Security Numbers, Medical Records, Bank Account Information · Contains 2,400+ objects",
    evidence: [
      "Bucket: prod-data-lake — ACL set to public-read on 2024-11-20 (change logged in CloudTrail)",
      "S3 Block Public Access: DISABLED — bucket and object ACLs allow public access",
      "DLP scan: 847 objects matched sensitive data patterns across 14 data type categories",
      "External access: 234 anonymous GET requests logged in the last 4 hours",
    ],
    rationale: "A publicly readable S3 bucket with PII and PHI exposed to anonymous internet access represents an active data breach. 234 external reads in 4 hours confirm unauthorized data access is ongoing.",
    action: [
      { text: "Enable S3 Block Public Access on prod-data-lake immediately — all 4 settings to TRUE", remediationAction: "revoke-public" },
      { text: "Initiate breach response — 234 anonymous reads confirm active exfiltration" },
      { text: "Notify Privacy Officer and Legal within 1 hour — HIPAA/GDPR mandatory notification window started", remediationAction: "legal-hold" },
      { text: "Apply S3 bucket policy denying s3:GetObject for principal *", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1007", ruleId: "r-oe-02", severity: "High", status: "Open", exposureType: "Public",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
        { type: "file",  label: "Annual_Revenue_Model_2025.xlsx", sublabel: "Exposure: Anyone with link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · Exposure: 'Anyone with link can edit' · Content: Financial IDs, Company Names, Bank Account Information — revenue forecast model with M&A targets",
    evidence: [
      "File: Annual_Revenue_Model_2025.xlsx (4.2 MB) — forward-looking revenue model, M&A target list, margin data",
      "Public edit link active 2 days — 7 external views, 1 external edit detected",
      "Contains: projected revenue figures, acquisition targets (Company Names), bank account references",
      "Link created by: Rachel Torres (rachel.torres@company.com) — likely for board prep",
    ],
    rationale: "A public editable link to an M&A revenue forecast is both a material non-public information (MNPI) exposure and an SEC compliance risk. One external edit suggests potential document tampering.",
    action: [
      { text: "Revoke public link immediately and restrict to named recipients", remediationAction: "revoke-public" },
      { text: "Review the external edit — compare document versions to detect tampering" },
      { text: "Place document under Legal Hold pending MNPI assessment", remediationAction: "legal-hold" },
      { text: "Apply Sensitivity Label 'Highly Confidential – Finance Only'", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1008", ruleId: "r-oe-02", severity: "High", status: "Rescan", exposureType: "Public",
    detectedAt: "5 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-configs", sublabel: "Azure Blob · dev-configs", alert: true },
        { type: "file",  label: "app-secrets.json", sublabel: "Private Keys · 34 files exposed" },
        { type: "config", label: "Access: $web (public)", sublabel: "Static website endpoint", badge: "PUBLIC", alert: true },
      ],
      edges: [{ label: "contains" }, { label: "exposed via" }] },
    matchedCondition: "App: Azure Blob Storage (dev-configs) · Exposure: Static website hosting enabled — $web container publicly accessible · Content: Source Code, Private Keys, IP Addresses in configuration files",
    evidence: [
      "Azure Blob Storage account: dev-configs — static website hosting enabled (storageaccountname.z13.web.core.windows.net)",
      "$web container: 34 files publicly accessible including config files with private keys",
      "DLP matched: Private Keys (3), AWS Access Keys (2), internal IP addresses (47 instances)",
      "Discovered via: external security researcher report",
    ],
    rationale: "Azure static website hosting on a storage account intended for configuration files exposes all files in $web container publicly. Configuration files in dev storage should never be web-accessible.",
    action: [
      { text: "Disable Azure Static Website hosting on dev-configs storage account immediately", remediationAction: "revoke-public" },
      { text: "Rotate all 3 private keys and 2 AWS Access Keys exposed via public endpoint" },
      { text: "Audit all Azure storage accounts for inadvertent static website enablement", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1009", ruleId: "r-oe-02", severity: "Critical", status: "Open", exposureType: "Public",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "Engineering Hub", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",  label: "pentest-report-Q4-2024.pdf", sublabel: "Exposure: Anyone with link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: "App: Google Drive (acme-corp.google.com) · Exposure: 'Anyone with link can view' · Content: Source Code, IP Addresses, Private Keys — full penetration test report with vulnerability details",
    evidence: [
      "File: pentest-report-Q4-2024.pdf (9.8 MB) — external pen test report with exploit paths and CVE findings",
      "Contents: 47 critical/high vulnerabilities with proof-of-concept details, internal IP topology map, admin credential references",
      "Public link active 6 hours — 4 external views logged",
    ],
    rationale: "A penetration test report publicly accessible provides a complete attack playbook to any threat actor who finds the link. The included IP topology and vulnerability PoCs make this an immediate active exploitation risk.",
    action: [
      { text: "Revoke public link immediately — P0 incident", remediationAction: "revoke-public" },
      { text: "Restrict to CISO and Security team only", remediationAction: "restrict-access" },
      { text: "Determine if the 4 external viewers are unauthorized — escalate to Incident Response" },
      { text: "Prioritize remediation of critical vulnerabilities disclosed in the report" },
    ] },
  {
    id: "FND-2025-1010", ruleId: "r-oe-02", severity: "Medium", status: "Open", exposureType: "All Internal Users",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "acme-corp.sharepoint.com/hr", sublabel: "SharePoint · acme-corp.sharepoint.com/hr" },
        { type: "file",  label: "Employee_Handbook_Confidential.docx", sublabel: "Exposure: Anyone with link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/hr) · Exposure: 'Anyone with link can view' · Content: Personal Names, Email Addresses, Company Names — confidential internal HR policies",
    evidence: [
      "File: Employee_Handbook_Confidential.docx — internal salary bands, disciplinary procedures, named HR contacts",
      "Sharing: public link active 3 days — 9 external views",
      "Content includes: named employee contacts (Personal Names, Email Addresses), compensation philosophy with salary ranges",
    ],
    rationale: "Confidential HR policy documents with salary bands and named contacts exposed publicly create competitive intelligence and social engineering risks.",
    action: [
      { text: "Revoke public link — restrict to Company-wide sharing only", remediationAction: "revoke-public" },
      { text: "Notify HR leadership and document owner of exposure" },
      { text: "Apply Sensitivity Label 'Internal Only' to prevent future public sharing", remediationAction: "apply-dlp" },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-oe-02  Sensitive Data Exposed via Public Links  (CASB API, 9)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-3501", ruleId: "r-oe-02", severity: "Critical", status: "Open", exposureType: "Public",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "store",    label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",     label: "Medical_Records_Q3.xlsx", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Drive: acme-hr.google.com "HR Confidential" · Exposure: "Anyone with Link" (Public) · Content: Matches "Sensitive" DLP Profile — Medical Records, Social Security Numbers, Healthcare IDs (9 data types)`,
    evidence: [
      "File: Medical_Records_Q3.xlsx (5.4 MB) — 847 rows, 9 sensitive data type categories",
      "Data store: HR Confidential (Google Drive acme-hr.google.com)",
      "Sharing: 'Anyone with the link can view' — link active for 14 days, 23 external views logged",
      "Link created by: Diana Reyes (diana.reyes@company.com) on 2024-11-18",
      "DLP profile matched: PHI, PII — Medical Records, Social Security Numbers, Healthcare IDs, Birthdates",
    ],
    rationale: "A public link to a file containing 847 rows of medical records is a HIPAA breach. 23 external views have already been logged, meaning data may already be in unauthorized hands.",
    action: [
      { text: "Revoke Public Sharing — change sharing to 'Restricted to company'", remediationAction: 'revoke-public' },
      { text: "Quarantine file pending HIPAA breach assessment", remediationAction: 'quarantine' },
      { text: "Notify Privacy Officer and Legal team within 1 hour" },
      { text: "Audit all 'Anyone with link' sharing in HR Confidential drive — found 3 additional files" },
    ] },
  {
    id: "FND-2024-3502", ruleId: "r-oe-02", severity: "High", status: "Open", exposureType: "External",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "store",    label: "Legal – Contracts", sublabel: "SharePoint · acme-legal.sharepoint.com" },
        { type: "file",     label: "Vendor_NDA_Templates_2024.docx", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Site: acme-legal.sharepoint.com "Legal – Contracts" · Exposure: "Anyone with Link" · Content: Matches "Sensitive" DLP Profile — Social Security Numbers, Financial IDs, Company Names, Postal Addresses`,
    evidence: [
      "File: Vendor_NDA_Templates_2024.docx (1.2 MB) — contains pre-filled vendor PII",
      "Data store: Legal – Contracts (SharePoint acme-legal.sharepoint.com)",
      "Sharing: 'Anyone with link can edit' — link active for 7 days, 4 external edits logged",
      "Link created by: James Thornton (james.thornton@partner.io External Partner account)",
      "DLP matched: PII — Social Security Numbers, Financial IDs embedded in template fields",
    ],
    rationale: "An external partner account creating public edit links on legal documents containing PII represents both a data exposure and a data integrity risk.",
    action: [
      { text: "Revoke Public Sharing", remediationAction: 'revoke-public' },
      { text: "Revoke External Sharing for James Thornton (james.thornton@partner.io)", remediationAction: 'revoke-external' },
      { text: "Quarantine document pending external access audit", remediationAction: 'quarantine' },
      { text: "Enable SharePoint external sharing policies requiring IT approval for public links" },
    ] },
  {
    id: "FND-2024-3503", ruleId: "r-oe-02", severity: "High", status: "Rescan", exposureType: "External",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store",    label: "Finance Team Drive", sublabel: "Google Drive · acme-finance.google.com" },
        { type: "file",     label: "Q3_Payroll_Summary.xlsx", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Drive: acme-finance.google.com "Finance Team Drive" · Exposure: "Anyone with Link" (view) · Content: Financial IDs, Bank Account Information, Payment Cards, Social Security Numbers`,
    evidence: [
      "File: Q3_Payroll_Summary.xlsx (880 KB) — 312 employee records with salary and bank details",
      "Data store: Finance Team Drive (Google Drive acme-finance.google.com)",
      "Sharing: 'Anyone with link can view' — link active for 21 days, 8 external views",
      "Link created by: Brian Kowalski (brian.kowalski@company.com)",
    ],
    rationale: "Payroll files with bank account details shared via public links are a direct financial fraud vector. 21 days of active exposure with 8 external views is a significant incident.",
    action: [
      { text: "Revoke Public Sharing immediately", remediationAction: 'revoke-public' },
      { text: "Revoke External Sharing for any contractor accounts with access", remediationAction: 'revoke-external' },
      { text: "Restrict Access to Finance team leads only", remediationAction: 'restrict-access' },
      { text: "Delete stale payroll export — data should not persist in SaaS", remediationAction: 'delete' },
      { text: "File SAR (Suspicious Activity Report) with appropriate regulatory body" },
    ] },
  {
    id: "FND-2024-3504", ruleId: "r-oe-02", severity: "Medium", status: "Open", exposureType: "All Internal Users",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store",    label: "Product – Roadmap Hub", sublabel: "SharePoint · acme-product.sharepoint.com" },
        { type: "file",     label: "2025_Product_Strategy.pptx", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Site: acme-product.sharepoint.com "Product – Roadmap Hub" · Exposure: "Anyone with Link" · Content: Matches "Sensitive" DLP Profile — Source Code, Company Names, Email Addresses`,
    evidence: [
      "File: 2025_Product_Strategy.pptx (24 MB) — 87 slides containing roadmap details and source code samples",
      "Sharing: 'Anyone with link can view' — link active for 9 days",
      "DLP matched: Source Code (embedded GitHub snippets), Company Names (partner mentions)",
    ],
    rationale: "Product strategy documents containing source code snippets and partner information being publicly accessible creates competitive intelligence and IP leakage risks.",
    action: [
      { text: "Revoke Public Sharing and restrict to Company-wide Sharing only", remediationAction: 'revoke-public' },
      { text: "Apply Sensitivity Label 'Confidential – Internal Only'" },
      { text: "Notify file owner to review sharing policy" },
      { text: "Redact source code snippets from the public version of strategy slides" },
    ] },
  {
    id: "FND-2024-3505", ruleId: "r-oe-02", severity: "Critical", status: "Open", exposureType: "EEEU",
    detectedAt: "12 hours ago", lastSeenAt: "12 hours ago",
    topology: {
      nodes: [
        { type: "store",    label: "HR – Employee Portal", sublabel: "SharePoint · acme-hr.sharepoint.com" },
        { type: "file",     label: "Benefits_Enrollment_2024.xlsx", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Site: acme-hr.sharepoint.com "HR – Employee Portal" · Exposure: "Anyone with Link" · Content: Sensitive DLP — Social Security Numbers, Healthcare IDs, Gender, Birthdates, Postal Addresses (7 data types)`,
    evidence: [
      "File: Benefits_Enrollment_2024.xlsx — 1,204 rows of employee benefits enrollment data",
      "Data store: HR – Employee Portal (SharePoint acme-hr.sharepoint.com)",
      "Data types: Social Security Numbers, Healthcare IDs, Gender, Ethnicity, Postal Addresses, Birthdates",
      "Sharing: public link active for 6 hours — 0 external views so far",
      "Link created by: Diana Reyes (diana.reyes@company.com SOC Lead) — likely accidental",
    ],
    rationale: "Benefits enrollment data is a high-sensitivity PII category (HIPAA-adjacent) affecting all employees. Even with 0 views so far, the exposure window must be closed immediately.",
    action: [
      { text: "Revoke Public Sharing immediately — priority P1", remediationAction: 'revoke-public' },
      { text: "Apply Sensitivity Label 'Highly Confidential – HR Only'" },
      { text: "Notify Diana Reyes and HR leadership of accidental exposure" },
      { text: "Place file under Legal Hold pending breach assessment", remediationAction: 'legal-hold' },
      { text: "Enable SharePoint policy: require manager approval for any public link creation on HR sites" },
    ] },
  {
    id: "FND-2024-3506", ruleId: "r-oe-02", severity: "High", status: "Open", exposureType: "Public",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store",    label: "Engineering Shared Drive", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",     label: "private-keys-backup.zip", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Drive: acme-corp.google.com "Engineering Shared Drive" · Exposure: "Anyone with Link" · Content: Matches "Sensitive" — Private Keys, Passwords, Source Code, IP Addresses`,
    evidence: [
      "File: private-keys-backup.zip (3.7 MB) — contains SSH private keys, TLS certificates, API tokens",
      "Data store: Engineering Shared Drive (Google Drive acme-corp.google.com)",
      "Link active 2 days, 1 external view detected",
      "File owner: Alice Chen (alice.chen@company.com)",
    ],
    rationale: "A zip archive of private keys and certificates available via public link is an immediate infrastructure compromise risk. One external view has already occurred.",
    action: [
      { text: "Revoke Public Sharing immediately", remediationAction: 'revoke-public' },
      { text: "Rotate all private keys and certificates in the archive" },
      { text: "Revoke Company-wide Sharing immediately", remediationAction: 'revoke-company' },
      { text: "Apply DLP Policy to block future credential file sharing", remediationAction: 'apply-dlp' },
      { text: "Delete the archive file from Google Drive — keys should never be stored in SaaS", remediationAction: 'delete' },
      { text: "Change Ownership to Security team lead for audit" },
    ] },
  {
    id: "FND-2024-3507", ruleId: "r-oe-02", severity: "Medium", status: "Rescan", exposureType: "External",
    detectedAt: "1 week ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store",    label: "Marketing Assets", sublabel: "Google Drive · acme-marketing.google.com" },
        { type: "file",     label: "Customer_Email_List_2024.csv", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Drive: acme-marketing.google.com "Marketing Assets" · Exposure: "Anyone with Link" · Content: Sensitive DLP — Email Addresses, Personal Names, Company Names (3 data types)`,
    evidence: [
      "File: Customer_Email_List_2024.csv — 15,432 customer email records with names and company",
      "Sharing: public link active for 9 days — 12 external views logged",
      "GDPR/CAN-SPAM: customer data shared without consent for external access",
    ],
    rationale: "A public link to a customer contact list violates GDPR data minimization principles and creates a marketing list exfiltration risk.",
    action: [
      { text: "Revoke Public Sharing — restrict to Company-wide Sharing only", remediationAction: 'revoke-public' },
      { text: "Revoke Company-wide Sharing and restrict to owner only", remediationAction: 'revoke-company' },
      { text: "Place under Legal Hold pending GDPR breach notification assessment", remediationAction: 'legal-hold' },
      { text: "Apply DLP Policy to prevent future customer PII exposure", remediationAction: 'apply-dlp' },
    ] },
  {
    id: "FND-2024-3508", ruleId: "r-oe-02", severity: "High", status: "Open", exposureType: "Public",
    detectedAt: "4 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store",    label: "Engineering Shared Drive", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",     label: "infra-audit-report.pdf", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Drive: acme-corp.google.com · Exposure: "Anyone with Link" · Content: IP Addresses, Source Code, Private Keys (6 data types in infrastructure audit PDF)`,
    evidence: [
      "File: infra-audit-report.pdf (8.9 MB) — infrastructure security audit with IP addresses and system details",
      "Contains: internal IP ranges, server names, open port listings, source code references",
      "Link active: 4 days — 6 external views logged",
    ],
    rationale: "Infrastructure audit reports are high-value reconnaissance targets. Internal IP addresses and system configurations expose the attack surface to anyone with the link.",
    action: [
      { text: "Revoke Public Sharing immediately", remediationAction: 'revoke-public' },
      { text: "Change Ownership to CISO for investigation" },
      { text: "Request justification from file owner for external sharing" },
      { text: "Classify all infrastructure audit documents as 'Confidential/Restricted' — no external sharing" },
    ] },
  {
    id: "FND-2024-3509", ruleId: "r-oe-02", severity: "Medium", status: "Open", exposureType: "EEEU",
    detectedAt: "6 days ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "store",    label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",     label: "Org_Chart_with_Salaries.xlsx", sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }] },
    matchedCondition: `Drive: acme-hr.google.com · Exposure: "Anyone with Link" · Content: Personal Names, Email Addresses, Postal Addresses, Financial IDs`,
    evidence: [
      "File: Org_Chart_with_Salaries.xlsx — 203 employee records with salary bands and manager details",
      "Sharing: public link 6 days, 3 external views",
      "Contains: salary information, manager relationships, personal work Email Addresses",
    ],
    rationale: "Salary information combined with org charts enables social engineering and insider threat facilitation. Even internal salary data in wrong hands is a material HR risk.",
    action: [
      { text: "Revoke Public Sharing immediately", remediationAction: 'revoke-public' },
      { text: "Restrict Access to HR and Finance leadership only", remediationAction: 'restrict-access' },
      { text: "Request justification from owner for external sharing of salary data" },
      { text: "Remove salary columns from the general org chart version — maintain a separate confidential copy" },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-oe-03 through r-oe-10  (NEW batch — FND-2025-1011..1042)
  // ══════════════════════════════════════════════════════════════════════════
  // r-oe-03 through r-oe-05 batch
  {
    id: "FND-2025-1011", ruleId: "r-oe-03", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Sarah Okonkwo", sublabel: "HR Director · Internal", badge: "SUSPENDED", alert: true },
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com", alert: true },
      ],
      edges: [{ label: "retains access to" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · Identity: Sarah Okonkwo — account status SUSPENDED (suspended 4 days ago) · Files accessible: 312 files including PII, Medical Records, Compensation data · Exposure: permissions not revoked post-suspension",
    evidence: [
      "User: Sarah Okonkwo (sarah.okonkwo@company.com) — account suspended 4 days ago (termination)",
      "Google Workspace status: SUSPENDED — but Drive sharing permissions retained on 312 files",
      "Files contain: Medical Records, Social Security Numbers, Compensation data, Bank Account Information",
      "Suspension does NOT auto-revoke file-level sharing — user could reactivate via admin error",
    ],
    rationale: "Suspended accounts retaining file-level sharing permissions in Google Drive remain accessible if the account is inadvertently reactivated. HR data including medical records and compensation must be revoked at suspension time.",
    action: [
      { text: "Revoke all Google Drive sharing permissions for Sarah Okonkwo", remediationAction: "revoke-company" },
      { text: "Transfer file ownership to HR team lead for files owned by Sarah Okonkwo", remediationAction: "restrict-access" },
      { text: "Audit all 312 files for external sharing — revoke any external collaborators", remediationAction: "revoke-external" },
      { text: "Update offboarding runbook: auto-revoke Drive permissions on account suspension" },
    ] },
  {
    id: "FND-2025-1012", ruleId: "r-oe-03", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "etl-svc-legacy", sublabel: "Service Account · Data · IAM", badge: "SUSPENDED", alert: true },
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake", alert: true },
      ],
      edges: [{ label: "retains IAM access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · Identity: etl-svc-legacy IAM user — account status SUSPENDED (access keys deactivated 15 days ago, but IAM policies not removed) · Bucket contains PII + PHI",
    evidence: [
      "IAM user: etl-svc-legacy — access keys deactivated 15 days ago but IAM user and attached policies still exist",
      "Attached policies: S3FullAccess on prod-data-lake, RDSReadOnly on prod-analytics-db",
      "If keys are re-activated by any admin, full S3 read/write access to PII/PHI is restored instantly",
      "prod-data-lake: 847 objects with Medical Records, SSNs, Financial IDs",
    ],
    rationale: "Deactivated IAM access keys with retained policy attachments are a latent re-activation risk. Any administrator who re-enables the keys immediately regains full prod access — a single admin action away from data breach.",
    action: [
      { text: "Delete IAM user etl-svc-legacy and all attached policies", remediationAction: "revoke-company" },
      { text: "Remove inline and managed policy attachments from etl-svc-legacy before deletion", remediationAction: "restrict-access" },
      { text: "Audit CloudTrail for any admin who touched etl-svc-legacy keys in the last 30 days" },
    ] },
  {
    id: "FND-2025-1013", ruleId: "r-oe-03", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal", badge: "SUSPENDED", alert: true },
        { type: "store", label: "Sales – CRM Exports", sublabel: "SharePoint · acme-corp.sharepoint.com/sales", alert: true },
      ],
      edges: [{ label: "retains access to" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/sales) · Identity: Tom Harrington — SUSPENDED 7 days ago · Retains Member access to Sales SharePoint site with 89 files containing customer PII",
    evidence: [
      "User: Tom Harrington (tom.harrington@company.com) — suspended 7 days ago (PIP termination)",
      "SharePoint site membership: Sales – CRM Exports — Member role retained",
      "Files accessible: 89 CRM export files with Personal Names, Email Addresses, Company Names, Telephone Numbers",
    ],
    rationale: "Sales staff suspended during performance processes often retain SharePoint access. Customer contact lists are high-value exfiltration targets for departing sales employees.",
    action: [
      { text: "Remove Tom Harrington from Sales – CRM Exports SharePoint site immediately", remediationAction: "revoke-company" },
      { text: "Review SharePoint audit logs for Tom Harrington's file access in the last 7 days" },
      { text: "Apply Legal Hold on files Tom Harrington accessed in last 30 days", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1014", ruleId: "r-oe-03", severity: "High", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "analytics-bot", sublabel: "Service Account · Analytics", badge: "SUSPENDED", alert: true },
        { type: "store", label: "research-datasets", sublabel: "Azure Blob · research-datasets", alert: true },
      ],
      edges: [{ label: "retains RBAC on" }] },
    matchedCondition: "App: Azure Blob Storage (research-datasets) · Identity: analytics-bot service principal — DISABLED in Azure AD 12 days ago · Storage Blob Data Reader RBAC assignment persists",
    evidence: [
      "Service principal: analytics-bot (App ID a7c42e...) — disabled in Azure AD 12 days ago",
      "RBAC: Storage Blob Data Reader on research-datasets container — not revoked at disable time",
      "research-datasets: Financial IDs, Personal Names, Company Names (market research data)",
    ],
    rationale: "Azure AD disabled service principals retain RBAC assignments by default. Re-enabling the principal (possible by any Application Administrator) immediately restores full blob read access to sensitive research data.",
    action: [
      { text: "Remove Storage Blob Data Reader RBAC assignment for analytics-bot on research-datasets", remediationAction: "revoke-company" },
      { text: "Delete analytics-bot service principal from Azure AD", remediationAction: "delete" },
      { text: "Update Azure AD deprovisioning automation to include RBAC role removal", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1015", ruleId: "r-oe-03", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Priya Nair", sublabel: "Contractor · External", badge: "SUSPENDED", alert: true },
        { type: "store", label: "Product – Roadmap Hub", sublabel: "SharePoint · acme-product.sharepoint.com", alert: true },
      ],
      edges: [{ label: "retains access to" }] },
    matchedCondition: "App: SharePoint (acme-product.sharepoint.com) · Identity: Priya Nair (external contractor) — contract ended 18 days ago, account SUSPENDED · Retains Visitor access to Product Roadmap SharePoint",
    evidence: [
      "External contractor: Priya Nair (priya.nair@contractor.io) — contract ended 18 days ago",
      "SharePoint Visitor role retained on Product – Roadmap Hub (read access to 234 files)",
      "Files contain: Source Code samples, Product roadmaps, Company Names, IP Addresses",
    ],
    rationale: "External contractors retaining SharePoint access after contract expiry is a common offboarding gap. Product roadmap data is competitively sensitive and should be inaccessible to former contractors.",
    action: [
      { text: "Revoke Priya Nair's SharePoint access immediately", remediationAction: "revoke-external" },
      { text: "Audit all external contractor accounts — identify others past contract end date" },
      { text: "Implement automated external access expiry tied to contract end dates in HR system", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1016", ruleId: "r-oe-04", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Exit_Interview_Archive_2020.zip", sublabel: "Stale · Last accessed 420 days ago", badge: "420 days stale", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · File: stale (last accessed 420 days ago) · Content: PII — Personal Names, Email Addresses, Social Security Numbers in exit interview archive · Retention: no policy applied",
    evidence: [
      "File: Exit_Interview_Archive_2020.zip (892 MB) — last accessed 420 days ago, last modified 3 years ago",
      "Contains: 847 exit interview records with SSNs, addresses, medical leave notes",
      "No retention policy applied — file has persisted indefinitely",
      "Accessible to: HR team (89 members) + 4 IT admins",
    ],
    rationale: "Stale PII archives with no retention policy violate GDPR data minimization (Article 5) and CCPA. Exit interview data retained years beyond operational need creates unnecessary legal liability.",
    action: [
      { text: "Apply Legal Hold assessment — determine if retention is required for pending litigation", remediationAction: "legal-hold" },
      { text: "If no hold needed, delete Exit_Interview_Archive_2020.zip", remediationAction: "delete" },
      { text: "Apply GDPR retention policy: HR PII auto-expire after 2 years", remediationAction: "apply-dlp" },
      { text: "Restrict access to HR leadership only pending deletion decision", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1017", ruleId: "r-oe-04", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "file",  label: "customer-export-2022-Q2.parquet", sublabel: "Stale · Last accessed 580 days ago", badge: "580 days stale", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/exports/) · Object: stale (last accessed 580 days ago) · Content: PII — 45,000 customer records with Email Addresses, Telephone Numbers, Postal Addresses",
    evidence: [
      "Object: prod-data-lake/exports/customer-export-2022-Q2.parquet (2.3 GB) — last accessed 580 days ago",
      "Contains: 45,000 customer records — Email Addresses, Telephone Numbers, Postal Addresses",
      "S3 Lifecycle policy: none applied to /exports/ prefix",
      "IAM access: 3 IAM roles and 2 cross-account principals have GetObject access",
    ],
    rationale: "Customer PII exports retained 580 days without access create GDPR deletion rights exposure. Any customer data subject request for erasure requires this file to be found and deleted.",
    action: [
      { text: "Delete customer-export-2022-Q2.parquet if no legal hold applies", remediationAction: "delete" },
      { text: "Apply S3 Lifecycle policy: auto-expire /exports/ objects after 90 days", remediationAction: "apply-dlp" },
      { text: "Restrict cross-account GetObject access on /exports/ prefix", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1018", ruleId: "r-oe-04", severity: "Medium", status: "Rescan",
    detectedAt: "1 week ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
        { type: "file",  label: "Payroll_Archive_2021.xlsx", sublabel: "Stale · Last accessed 490 days ago", badge: "490 days stale", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · File: stale (last accessed 490 days ago) · Content: Financial IDs, Bank Account Information, Social Security Numbers — 2021 payroll archive",
    evidence: [
      "File: Payroll_Archive_2021.xlsx (14 MB) — payroll data for 412 employees, last accessed 490 days ago",
      "Data: Bank Account Numbers, Social Security Numbers, salary figures",
      "Site members: Finance team (31 members) — all have access",
    ],
    rationale: "Payroll archives beyond the statutory retention window (typically 7 years, but this is 3 years old and unused for 490 days) should be moved to secure archival or deleted to minimize exposure surface.",
    action: [
      { text: "Restrict access to Finance Director only pending retention review", remediationAction: "restrict-access" },
      { text: "Evaluate against 7-year payroll retention requirement — archive to encrypted offline storage if needed" },
      { text: "Delete if retention period has elapsed", remediationAction: "delete" },
    ] },
  {
    id: "FND-2025-1019", ruleId: "r-oe-04", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-configs", sublabel: "Azure Blob · dev-configs" },
        { type: "file",  label: "db-snapshots-2022/", sublabel: "Stale · Last accessed 510 days ago", badge: "510 days stale", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: Azure Blob Storage (dev-configs) · Path: db-snapshots-2022/ (47 blobs) — last accessed 510 days ago · Content: Source Code, Private Keys, Personal Names in database snapshots",
    evidence: [
      "Path: dev-configs/db-snapshots-2022/ — 47 blobs totaling 18 GB, last accessed 510 days ago",
      "Snapshot contents include: personal data from dev/test population (seeded from prod), private key files",
      "RBAC: 28 developers have Storage Blob Data Reader on dev-configs container",
    ],
    rationale: "Dev database snapshots seeded from production data are a pervasive compliance problem. After 510 days with no access, these blobs serve no operational purpose while retaining full sensitivity.",
    action: [
      { text: "Delete all 47 blobs in db-snapshots-2022/ path", remediationAction: "delete" },
      { text: "Enforce policy: dev/test data must use synthetic data generation, never prod snapshots", remediationAction: "apply-dlp" },
      { text: "Apply Azure Blob Lifecycle Management: delete blobs in dev-configs not accessed in 180 days", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1020", ruleId: "r-oe-05", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "12 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "All Company", sublabel: "SharePoint · acme-corp.sharepoint.com" },
        { type: "file",  label: "Strategic_Plan_FY2025.pptx", sublabel: "Exposure: All Company", badge: "Broad Internal", alert: true },
      ],
      edges: [{ label: "accessible by" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com) · File: accessible to 'All Company' (1,240 users) · AI Readiness Risk: document contains unreleased product plans, M&A targets — ingested by Microsoft 365 Copilot",
    evidence: [
      "File: Strategic_Plan_FY2025.pptx (8.4 MB) — unreleased product plans, M&A targets, financial projections",
      "Permission: 'All Company' SharePoint group (1,240 users) has read access",
      "Microsoft 365 Copilot is enabled tenant-wide — this file is indexed and surfaceable to any Copilot query by any employee",
      "Risk: any employee asking Copilot about future plans may receive MNPI from this file",
    ],
    rationale: "Broadly shared sensitive documents are surfaced by AI assistants like Microsoft 365 Copilot to any user who queries related topics. MNPI accessible to 1,240 users via AI query is an SEC/GDPR and competitive risk.",
    action: [
      { text: "Restrict access to SLT and Finance leadership only", remediationAction: "restrict-access" },
      { text: "Apply Sensitivity Label 'Highly Confidential' to exclude from Copilot indexing", remediationAction: "apply-dlp" },
      { text: "Audit Copilot query logs for employees who may have already received MNPI from this document" },
    ] },
  {
    id: "FND-2025-1021", ruleId: "r-oe-05", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Engineering Shared", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",  label: "customer-data-sample.csv", sublabel: "Exposure: All Engineering", badge: "Broad Internal", alert: true },
      ],
      edges: [{ label: "accessible by" }] },
    matchedCondition: "App: Google Drive (acme-corp.google.com) · File: shared with all Engineering (214 users) · Content: PII — 5,200 customer records · AI Risk: indexed by Google Workspace AI features",
    evidence: [
      "File: customer-data-sample.csv — 5,200 rows with Personal Names, Email Addresses, Telephone Numbers",
      "Shared with: all of Engineering (214 users) for 'test data purposes'",
      "Google Workspace AI (Gemini) is enabled — file is surfaceable via smart chips and NotebookLM queries",
    ],
    rationale: "Customer PII files shared broadly for development purposes create both a direct access risk and an AI surfacing risk. 214 engineers can inadvertently leak customer data through AI-assisted queries.",
    action: [
      { text: "Quarantine customer-data-sample.csv from Engineering Shared Drive", remediationAction: "quarantine" },
      { text: "Replace with synthetic data generated by a data masking tool", remediationAction: "delete" },
      { text: "Apply DLP policy: block PII files from being shared with groups >10 users in Google Drive", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1022", ruleId: "r-oe-05", severity: "Medium", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "HR – Employee Portal", sublabel: "SharePoint · acme-hr.sharepoint.com" },
        { type: "file",  label: "Compensation_Bands_2025.xlsx", sublabel: "Exposure: All Managers", badge: "Broad Internal", alert: true },
      ],
      edges: [{ label: "accessible by" }] },
    matchedCondition: "App: SharePoint (acme-hr.sharepoint.com) · File: accessible to 'All Managers' group (178 managers) · Content: Financial IDs, Personal Names — compensation ranges and band assignments · AI Risk: surfaceable by Copilot to all managers",
    evidence: [
      "File: Compensation_Bands_2025.xlsx — salary band assignments for all 1,240 employees by level/role",
      "Permission: 'All Managers' SharePoint group (178 managers)",
      "Microsoft 365 Copilot: any manager could query Copilot to surface specific employee compensation details",
    ],
    rationale: "Compensation band data surfaced by AI to all 178 managers creates a fairness and legal risk. Copilot can correlate this file with employee lists to surface individual salary estimates on demand.",
    action: [
      { text: "Restrict to HRBP and Finance leadership only", remediationAction: "restrict-access" },
      { text: "Apply Sensitivity Label 'Confidential – HR Only' to suppress Copilot indexing", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1023", ruleId: "r-oe-05", severity: "Critical", status: "Open",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "Legal Drive", sublabel: "Google Drive · acme-legal.google.com" },
        { type: "file",  label: "litigation-hold-roster.xlsx", sublabel: "Exposure: All Legal", badge: "Broad Internal", alert: true },
      ],
      edges: [{ label: "accessible by" }] },
    matchedCondition: "App: Google Drive (acme-legal.google.com) · File: accessible to all Legal (42 users) including paralegals and contractors · Content: Personal Names, Social Security Numbers — active litigation hold roster · AI Risk: Gemini indexing",
    evidence: [
      "File: litigation-hold-roster.xlsx — active litigation hold subjects, SSNs, legal case references",
      "Permission: 'Legal Team' Google Group (42 members including 6 external contractors)",
      "AI risk: Google Workspace Gemini can surface litigation hold status for named individuals in response to queries",
    ],
    rationale: "Active litigation hold rosters contain attorney-client privileged information. Broad access combined with AI indexing can inadvertently disclose privilege-protected information and litigation strategy.",
    action: [
      { text: "Restrict to General Counsel and named case attorneys only", remediationAction: "restrict-access" },
      { text: "Revoke external contractor access to Legal Drive immediately", remediationAction: "revoke-external" },
      { text: "Apply DLP to exclude files labeled 'Attorney-Client Privileged' from AI indexing", remediationAction: "apply-dlp" },
      { text: "Place file under Legal Hold with access logging enabled", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1024", ruleId: "r-oe-05", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "acme-corp OneDrive", sublabel: "OneDrive · acme-corp.onedrive.com" },
        { type: "file",  label: "board-materials-Nov2024.pdf", sublabel: "Exposure: Company-wide via link", badge: "Broad Internal", alert: true },
      ],
      edges: [{ label: "accessible by" }] },
    matchedCondition: "App: OneDrive (acme-corp.onedrive.com) · File: shared via 'company-wide' link (1,240 users) · Content: Financial IDs, Company Names — board meeting materials with unreleased financials",
    evidence: [
      "File: board-materials-Nov2024.pdf — board meeting pack with Q3 earnings preview, acquisition update",
      "Shared via 'company-wide' OneDrive link by CFO assistant (likely accidental)",
      "Microsoft 365 Copilot: document indexed and surfaceable to all 1,240 employees",
    ],
    rationale: "Board materials shared company-wide contain MNPI. Microsoft 365 Copilot indexing means any employee asking about company performance may receive pre-announcement financial data.",
    action: [
      { text: "Revoke company-wide link — restrict to Board and SLT only", remediationAction: "revoke-public" },
      { text: "Apply Sensitivity Label 'Highly Confidential' to suppress Copilot access", remediationAction: "apply-dlp" },
      { text: "Notify CFO and Legal of potential MNPI exposure" },
    ] },
  {
    id: "FND-2025-1025", ruleId: "r-oe-06", severity: "Critical", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Employee_PII_Master_2023.xlsx", sublabel: "Exposure: Perpetual public link", badge: "No Expiry", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing · No expiry" },
      ],
      edges: [{ label: "contains" }, { label: "shared via perpetual link", dashed: true }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · File: public link with NO expiration date · Content: Social Security Numbers, Medical Records, Bank Account Information · Link age: 247 days",
    evidence: [
      "File: Employee_PII_Master_2023.xlsx — 1,204 employee records with SSNs, bank details, medical notes",
      "Public link: created 247 days ago with no expiry date — still active",
      "Link views: 31 external views logged over 247 days",
      "Google Workspace policy: link expiry not enforced for this shared drive",
    ],
    rationale: "A perpetual public link to a file containing SSNs and medical records has been quietly active for 247 days with 31 external views. This is a sustained HIPAA/GDPR breach scenario requiring immediate escalation.",
    action: [
      { text: "Revoke public link immediately", remediationAction: "revoke-public" },
      { text: "Initiate breach notification assessment — 31 external views over 247 days", remediationAction: "legal-hold" },
      { text: "Quarantine file pending legal review", remediationAction: "quarantine" },
      { text: "Enable Google Workspace link expiry policy: maximum 30 days for all shared links on sensitive drives", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1026", ruleId: "r-oe-06", severity: "High", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
        { type: "file",  label: "Board_Financials_Archive.zip", sublabel: "Exposure: Perpetual public link", badge: "No Expiry", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing · No expiry" },
      ],
      edges: [{ label: "contains" }, { label: "shared via perpetual link", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · File: public link with no expiry · Content: Financial IDs, Company Names — board financials archive · Link age: 183 days",
    evidence: [
      "File: Board_Financials_Archive.zip (92 MB) — 3 years of board financial packages",
      "Public link: created 183 days ago by departing CFO assistant, never revoked",
      "13 external views logged",
    ],
    rationale: "Board financial packages shared via perpetual public links represent both MNPI exposure and competitive intelligence risk. A departing employee creating this link without revocation is a governance failure.",
    action: [
      { text: "Revoke public link immediately", remediationAction: "revoke-public" },
      { text: "Restrict to CFO and Board members only", remediationAction: "restrict-access" },
      { text: "Apply Legal Hold — financial archives may be relevant to regulatory inquiry", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1027", ruleId: "r-oe-06", severity: "High", status: "Rescan",
    detectedAt: "1 week ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Engineering Shared", sublabel: "Google Drive · acme-corp.google.com" },
        { type: "file",  label: "prod-db-schema-export.sql", sublabel: "Exposure: Perpetual public link", badge: "No Expiry", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing · No expiry" },
      ],
      edges: [{ label: "contains" }, { label: "shared via perpetual link", dashed: true }] },
    matchedCondition: "App: Google Drive (acme-corp.google.com) · File: public link with no expiry · Content: Source Code, IP Addresses, Private Keys — production DB schema export · Link age: 312 days",
    evidence: [
      "File: prod-db-schema-export.sql (4.1 MB) — full production DB schema with table definitions and sample data",
      "Public link: 312 days old — 8 external views",
      "Schema reveals: table names, column types, stored procedures with embedded IP addresses",
    ],
    rationale: "A year-old public link to a production DB schema export provides persistent architectural reconnaissance to any attacker who discovers it. Schema knowledge dramatically accelerates SQL injection attack development.",
    action: [
      { text: "Revoke public link", remediationAction: "revoke-public" },
      { text: "Delete production schema export from Engineering Shared Drive", remediationAction: "delete" },
      { text: "Apply DLP: block Google Drive sharing of .sql files with public links", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1028", ruleId: "r-oe-06", severity: "Medium", status: "Open",
    detectedAt: "2 weeks ago", lastSeenAt: "2 weeks ago",
    topology: {
      nodes: [
        { type: "store", label: "acme-corp.sharepoint.com/hr", sublabel: "SharePoint · acme-corp.sharepoint.com/hr" },
        { type: "file",  label: "Contractor_Roster_2023.xlsx", sublabel: "Exposure: Perpetual public link", badge: "No Expiry", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing · No expiry" },
      ],
      edges: [{ label: "contains" }, { label: "shared via perpetual link", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/hr) · File: public link with no expiry · Content: Personal Names, Email Addresses, Telephone Numbers — contractor roster · Link age: 412 days",
    evidence: [
      "File: Contractor_Roster_2023.xlsx — 203 contractor records with contact details and rates",
      "Public link: 412 days old — 4 external views",
    ],
    rationale: "A contractor roster with contact details and rates exposed via a perpetual link is a GDPR data minimization violation and a competitive intelligence risk (revealing vendor relationships and rates).",
    action: [
      { text: "Revoke public link", remediationAction: "revoke-public" },
      { text: "Restrict to HR and Procurement only", remediationAction: "restrict-access" },
      { text: "Delete if contractor roster is outdated", remediationAction: "delete" },
    ] },
  {
    id: "FND-2025-1029", ruleId: "r-oe-07", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "james.thornton@partner.io", sublabel: "External Partner · Collaborator" },
        { type: "store", label: "Legal – Contracts", sublabel: "SharePoint · acme-legal.sharepoint.com" },
      ],
      edges: [{ label: "permanent access to" }] },
    matchedCondition: "App: SharePoint (acme-legal.sharepoint.com) · External collaborator: james.thornton@partner.io · Access type: Permanent (no expiry) · Files with PII: 47 files with Social Security Numbers, Financial IDs",
    evidence: [
      "External collaborator: james.thornton@partner.io — added 14 months ago, no expiry date set",
      "Access: Contributor role on Legal – Contracts site (read + write on 234 files)",
      "Sensitive files accessible: 47 files with SSNs, Financial IDs, Company Names (deal data)",
      "Last active: 23 days ago — contract engagement unclear",
    ],
    rationale: "Permanent external collaborator access without expiry on legal documents containing deal-sensitive data represents an indefinite IP and PII exposure. 23 days of inactivity suggests the collaboration may have ended.",
    action: [
      { text: "Revoke external sharing for james.thornton@partner.io", remediationAction: "revoke-external" },
      { text: "Verify with Legal team whether collaboration is still active before restoring access" },
      { text: "Apply SharePoint external sharing policy: external access expires after 90 days and requires renewal", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1030", ruleId: "r-oe-07", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "audit@deloitte-external.com", sublabel: "External Auditor · Collaborator" },
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
      ],
      edges: [{ label: "permanent access to" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · External collaborator: audit@deloitte-external.com · Access: Permanent · Files: 89 financial documents with Bank Account Information, Financial IDs",
    evidence: [
      "External: audit@deloitte-external.com — added 8 months ago for annual audit, no expiry set",
      "Access: Reader on Finance Reports site — 89 files including bank reconciliation reports",
      "Audit period ended 4 months ago — access never revoked post-audit",
    ],
    rationale: "External auditor access retained post-audit engagement creates ongoing exposure of financial records. Auditor accounts at large firms are frequently targeted by supply chain attackers.",
    action: [
      { text: "Revoke external sharing for audit@deloitte-external.com", remediationAction: "revoke-external" },
      { text: "Implement time-bounded external access: automatic expiry tied to engagement end date" },
      { text: "Audit all external collaborator accounts on Finance Reports site", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1031", ruleId: "r-oe-07", severity: "Medium", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "vendor@marketing-agency.com", sublabel: "External Agency · Collaborator" },
        { type: "store", label: "Marketing Assets", sublabel: "Google Drive · acme-marketing.google.com" },
      ],
      edges: [{ label: "permanent access to" }] },
    matchedCondition: "App: Google Drive (acme-marketing.google.com) · External collaborator: vendor@marketing-agency.com · Access: Permanent (18 months) · Files: customer contact lists with PII",
    evidence: [
      "External: vendor@marketing-agency.com — added 18 months ago for campaign work",
      "Access: Editor on Marketing Assets drive — including Customer_Email_List_2024.csv",
      "Campaign ended 6 months ago — access never reviewed",
    ],
    rationale: "Marketing agencies with permanent access to customer contact lists post-engagement create GDPR data processing violations. Agencies are data processors and access should be time-bounded to the processing purpose.",
    action: [
      { text: "Revoke external sharing for vendor@marketing-agency.com", remediationAction: "revoke-external" },
      { text: "Restrict customer contact list files to internal marketing only", remediationAction: "restrict-access" },
      { text: "Review all Google Drive external collaborators not active in 90 days", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1032", ruleId: "r-oe-07", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "consultant@accenture-ext.com", sublabel: "External Consultant · Collaborator" },
        { type: "store", label: "Engineering Hub", sublabel: "SharePoint · acme-corp.sharepoint.com/eng" },
      ],
      edges: [{ label: "permanent access to" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/eng) · External collaborator: consultant@accenture-ext.com · Access: Permanent · Files: 156 files with Source Code, IP Addresses, Private Keys",
    evidence: [
      "External: consultant@accenture-ext.com — added 11 months ago for digital transformation project",
      "Access: Member role — can read and write 156 engineering documents including architecture diagrams and source code references",
      "Project status: completed 3 months ago based on PO records",
    ],
    rationale: "Permanent external consultant access to engineering documents post-project completion is an IP exfiltration risk. Source code and architecture details are among the highest-value targets for IP theft.",
    action: [
      { text: "Revoke external sharing for consultant@accenture-ext.com", remediationAction: "revoke-external" },
      { text: "Apply Legal Hold on all files accessed by consultant in last 90 days", remediationAction: "legal-hold" },
      { text: "Implement 30-day maximum for external contributor access on engineering SharePoint sites", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1033", ruleId: "r-oe-08", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Sarah Okonkwo", sublabel: "HR Director · Internal", badge: "SUSPENDED", alert: true },
        { type: "store", label: "sarah.okonkwo@company.com Drive", sublabel: "Google Drive · acme-hr.google.com", alert: true },
        { type: "file",  label: "Employee_Medical_Records_2024.xlsx", sublabel: "PHI + SSNs · 89 files" },
      ],
      edges: [{ label: "owns" }, { label: "contains" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · Drive owner: Sarah Okonkwo — account SUSPENDED · Drive contains: 89 files with PII (Medical Records, SSNs, Compensation data) · Drive not transferred to admin on suspension",
    evidence: [
      "Suspended user: Sarah Okonkwo (sarah.okonkwo@company.com) — account suspended 4 days ago",
      "My Drive: 89 files containing PHI, SSNs, compensation data — owned by suspended user",
      "Drive ownership not transferred on suspension — files inaccessible to HR team",
      "Risk: data trapped in suspended account OR data accessible if account reactivated",
    ],
    rationale: "Sensitive company data in a suspended employee's Drive is both inaccessible to the business and potentially accessible if the account is reactivated. HR data in personal drives represents a governance gap.",
    action: [
      { text: "Transfer Drive ownership to HR team lead via Google Workspace admin console", remediationAction: "restrict-access" },
      { text: "Quarantine sensitive files pending legal review of termination case", remediationAction: "quarantine" },
      { text: "Audit 89 files for external sharing by Sarah Okonkwo before suspension", remediationAction: "revoke-external" },
      { text: "Update offboarding playbook: Drive transfer must occur at suspension time" },
    ] },
  {
    id: "FND-2025-1034", ruleId: "r-oe-08", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal", badge: "SUSPENDED", alert: true },
        { type: "store", label: "marcus.webb@company.com Drive", sublabel: "Google Drive · acme-finance.google.com", alert: true },
        { type: "file",  label: "M&A_Target_Model_Q4.xlsx", sublabel: "Bank Account Info + Financial IDs · 34 files" },
      ],
      edges: [{ label: "owns" }, { label: "contains" }] },
    matchedCondition: "App: Google Drive (acme-finance.google.com) · Drive owner: Marcus Webb — SUSPENDED · Drive contains: financial models with Bank Account Information, M&A target data — 34 files",
    evidence: [
      "Suspended user: Marcus Webb (marcus.webb@company.com) — suspended 12 days ago",
      "My Drive: 34 files including M&A model spreadsheets, bank reconciliation files, investor relations drafts",
      "Sensitive types: Bank Account Information, Financial IDs, Company Names (M&A targets)",
      "2 files shared externally to unknown @gmail.com addresses before suspension",
    ],
    rationale: "M&A data and bank reconciliation files in a suspended Finance employee's Drive represent both MNPI and financial fraud risks. External shares to personal email before suspension require immediate forensic review.",
    action: [
      { text: "Transfer Drive to CFO immediately — do not delete files", remediationAction: "restrict-access" },
      { text: "Escalate external Gmail shares to Legal and Security for forensic review", remediationAction: "legal-hold" },
      { text: "Apply Legal Hold on all 34 files", remediationAction: "legal-hold" },
      { text: "Initiate Insider Threat investigation for the pre-suspension external shares" },
    ] },
  {
    id: "FND-2025-1035", ruleId: "r-oe-08", severity: "High", status: "Rescan",
    detectedAt: "6 days ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal", badge: "SUSPENDED", alert: true },
        { type: "store", label: "tom.harrington@company.com Drive", sublabel: "Google Drive · acme-corp.google.com", alert: true },
        { type: "file",  label: "CRM_Pipeline_Export_2024.csv", sublabel: "Customer PII · 56 files" },
      ],
      edges: [{ label: "owns" }, { label: "contains" }] },
    matchedCondition: "App: Google Drive (acme-corp.google.com) · Drive owner: Tom Harrington — SUSPENDED · Drive contains: customer CRM exports, deal pipeline data — 56 files with PII",
    evidence: [
      "Suspended user: Tom Harrington (tom.harrington@company.com) — suspended 7 days ago",
      "My Drive: 56 files — CRM exports, opportunity pipeline, customer contact lists",
      "Data types: Personal Names, Email Addresses, Telephone Numbers, Company Names",
    ],
    rationale: "Sales employee personal Drives frequently contain CRM exports that should never have left the CRM system. This data in a suspended account represents a risk of unauthorized use for competitive purposes post-departure.",
    action: [
      { text: "Transfer Drive to Sales Director", remediationAction: "restrict-access" },
      { text: "Delete unauthorized CRM exports — data should reside only in Salesforce", remediationAction: "delete" },
      { text: "Review for any pre-suspension external sharing of customer data" },
    ] },
  {
    id: "FND-2025-1036", ruleId: "r-oe-08", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "Priya Nair", sublabel: "Contractor · External", badge: "SUSPENDED", alert: true },
        { type: "store", label: "priya.nair@contractor.io Drive", sublabel: "Google Drive · acme-corp.google.com", alert: true },
        { type: "file",  label: "API_Architecture_Spec.docx", sublabel: "Source Code + IP Addresses · 12 files" },
      ],
      edges: [{ label: "owns" }, { label: "contains" }] },
    matchedCondition: "App: Google Drive (acme-corp.google.com) · Drive owner: Priya Nair (external contractor) — contract ended, account SUSPENDED · Shared drive files: 12 files with Source Code, IP Addresses",
    evidence: [
      "External contractor: Priya Nair (priya.nair@contractor.io) — contract ended 21 days ago",
      "12 files in company shared drives owned by Priya Nair — not transferred to internal owner",
      "File types: design documents, API specs, IP address references",
    ],
    rationale: "Contractor-owned files in company shared drives become orphaned when the contractor departs. Without ownership transfer, files may be inaccessible or unmanaged.",
    action: [
      { text: "Transfer ownership of 12 files to Engineering lead", remediationAction: "restrict-access" },
      { text: "Review files for any external sharing by Priya Nair before contract end", remediationAction: "revoke-external" },
    ] },
  {
    id: "FND-2025-1037", ruleId: "r-oe-09", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Orphaned Site: proj-phoenix", sublabel: "SharePoint · acme-corp.sharepoint.com/sites/proj-phoenix" },
        { type: "file",  label: "Technical_Architecture.docx", sublabel: "No site owner · Unmanaged", badge: "Orphaned", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/sites/proj-phoenix) · Site: no active owner (original owner account deleted 6 months ago) · Site has 234 members · Content: Source Code, IP Addresses, Private Keys in 67 files",
    evidence: [
      "Site: proj-phoenix — created 2.5 years ago, original owner account deleted 6 months ago",
      "Site members: 234 users (team roster never cleaned up)",
      "Sensitive content: 67 files with Source Code, IP Addresses, Private Keys, architecture diagrams",
      "No site admin: IT cannot govern permissions or apply DLP without ownership claim",
    ],
    rationale: "Orphaned SharePoint sites with no owner cannot be governed. 234 users retain access to sensitive technical files with no oversight, and expired owner accounts cannot revoke access.",
    action: [
      { text: "Assign IT Security as temporary site owner to restore governance", remediationAction: "restrict-access" },
      { text: "Restrict membership to actively employed users only — remove 234 members pending review" },
      { text: "Quarantine Private Key and credential files found in the site", remediationAction: "quarantine" },
      { text: "Apply retention policy and schedule for archival or deletion of inactive site" },
    ] },
  {
    id: "FND-2025-1038", ruleId: "r-oe-09", severity: "High", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Orphaned Site: acq-integrations-2021", sublabel: "SharePoint · acme-corp.sharepoint.com/sites/acq-integrations-2021" },
        { type: "file",  label: "acquisition-due-diligence.pdf", sublabel: "No site owner · Unmanaged", badge: "Orphaned", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/sites/acq-integrations-2021) · Site: no active owner · Content: Financial IDs, Company Names — M&A due diligence documents (MNPI) · Members: 89 users",
    evidence: [
      "Site: acq-integrations-2021 — M&A integration site from 2021 acquisition, owner left company",
      "M&A due diligence documents: valuation models, target company financials, deal terms",
      "89 members including former employees (accounts not cleaned up)",
      "5 former employee accounts still listed as members — accounts may be suspended but memberships retained",
    ],
    rationale: "M&A due diligence data in an orphaned site with former employee memberships is an MNPI governance failure. Acquisition deal terms retained years later with no oversight create regulatory exposure.",
    action: [
      { text: "Claim site ownership via IT admin — assign to M&A/Legal lead", remediationAction: "restrict-access" },
      { text: "Remove all former employee accounts from membership immediately", remediationAction: "revoke-company" },
      { text: "Place M&A documents under Legal Hold for records retention compliance", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1039", ruleId: "r-oe-09", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "store", label: "Orphaned Site: hr-2022-benefits", sublabel: "SharePoint · acme-corp.sharepoint.com/sites/hr-2022-benefits" },
        { type: "file",  label: "Benefits_Plan_Docs_2022/", sublabel: "No site owner · Unmanaged", badge: "Orphaned", alert: true },
      ],
      edges: [{ label: "contains" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/sites/hr-2022-benefits) · Site: no active owner · Content: Social Security Numbers, Healthcare IDs, Medical Records in 2022 benefits documents · Members: 47 users",
    evidence: [
      "Site: hr-2022-benefits — benefits enrollment site from 2022, HR coordinator who owned it departed",
      "47 members including current and former employees",
      "Documents: 2022 benefits enrollment forms with SSNs and Healthcare IDs",
    ],
    rationale: "Unmanaged HR benefits sites retaining SSNs and Healthcare IDs create HIPAA compliance exposure. The absence of an owner means no one is responsible for responding to data subject requests or breach notifications.",
    action: [
      { text: "Assign HRBP as site owner", remediationAction: "restrict-access" },
      { text: "Delete 2022 enrollment forms if past retention period", remediationAction: "delete" },
      { text: "Remove former employee accounts from site membership", remediationAction: "revoke-company" },
    ] },
  {
    id: "FND-2025-1040", ruleId: "r-oe-10", severity: "Critical", status: "Open",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "analytics-prod", sublabel: "AWS S3 · prod-data-lake" },
        { type: "store", label: "customer_analytics_dataset", sublabel: "Google BigQuery · acme-analytics.bigquery.com" },
        { type: "config", label: "allUsers: READER", sublabel: "IAM Policy · Public", badge: "PUBLIC", alert: true },
      ],
      edges: [{ label: "ingested into" }, { label: "has IAM policy" }] },
    matchedCondition: "App: Google BigQuery (acme-analytics.bigquery.com) · Dataset: customer_analytics_dataset · IAM: allUsers (public internet) has bigquery.dataViewer role · Content: 2.1M customer records with Email Addresses, Personal Names, Behavioral Data",
    evidence: [
      "BigQuery dataset: customer_analytics_dataset — 2.1 million customer rows with PII",
      "IAM policy: allUsers principal has roles/bigquery.dataViewer — anyone on the internet can run SELECT queries",
      "Change detected: IAM policy updated 6 hours ago (CloudAudit log: principal = rachel.torres@company.com)",
      "SQL query exposure: any SELECT * FROM customer_analytics_dataset.users returns live customer PII",
    ],
    rationale: "A BigQuery dataset with allUsers read access is publicly queryable via the BigQuery API with no authentication. 2.1 million customer records are immediately accessible to any internet user who discovers the dataset ID.",
    action: [
      { text: "Remove allUsers READER IAM binding immediately", remediationAction: "revoke-public" },
      { text: "Restrict to authorized analytics team service accounts only", remediationAction: "restrict-access" },
      { text: "Investigate why Rachel Torres modified the IAM policy 6 hours ago — escalate to Security" },
      { text: "Check BigQuery audit logs for queries executed during the exposure window", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1041", ruleId: "r-oe-10", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "ml-training-data", sublabel: "Google BigQuery · acme-ml.bigquery.com" },
        { type: "config", label: "allAuthenticatedUsers: READER", sublabel: "IAM Policy · All Google accounts", badge: "PUBLIC", alert: true },
      ],
      edges: [{ label: "has IAM policy" }] },
    matchedCondition: "App: Google BigQuery (acme-ml.bigquery.com) · Dataset: ml-training-data · IAM: allAuthenticatedUsers (any Google account holder) has dataViewer · Content: Personal Names, Email Addresses, Medical Records in ML training set",
    evidence: [
      "BigQuery dataset: ml-training-data — ML training data seeded from production (not properly anonymized)",
      "IAM: allAuthenticatedUsers — any Google account holder (1+ billion users) can query",
      "Contains: Personal Names, Email Addresses, Medical Records (HIPAA PHI) from dev population seeding",
    ],
    rationale: "allAuthenticatedUsers on a BigQuery dataset means any person with a Google account can query the data. Medical records in an ML training dataset with this policy is a HIPAA violation and research ethics failure.",
    action: [
      { text: "Remove allAuthenticatedUsers IAM binding immediately", remediationAction: "revoke-public" },
      { text: "Anonymize or delete PHI records in ml-training-data dataset", remediationAction: "delete" },
      { text: "Apply column-level security: mask PII columns with BigQuery Policy Tags", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1042", ruleId: "r-oe-10", severity: "High", status: "Rescan",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "financial-reporting", sublabel: "Google BigQuery · acme-finance.bigquery.com" },
        { type: "config", label: "allUsers: READER", sublabel: "Table-level IAM · Public", badge: "PUBLIC", alert: true },
      ],
      edges: [{ label: "has IAM policy" }] },
    matchedCondition: "App: Google BigQuery (acme-finance.bigquery.com) · Table: financial-reporting.revenue_by_customer · IAM: allUsers READER on specific table · Content: Financial IDs, Company Names, revenue data per customer",
    evidence: [
      "Table: financial-reporting.revenue_by_customer — customer revenue by account (confidential)",
      "Table-level allUsers READER: this specific table publicly queryable",
      "Content: customer names, company revenue figures, contract values",
    ],
    rationale: "Customer revenue data in a publicly queryable BigQuery table exposes confidential commercial terms. Competitors can map company revenue by customer segment using this data.",
    action: [
      { text: "Remove allUsers READER binding on revenue_by_customer table", remediationAction: "revoke-public" },
      { text: "Apply column-level encryption on revenue figures", remediationAction: "apply-dlp" },
      { text: "Audit all BigQuery table-level IAM policies for allUsers/allAuthenticatedUsers bindings", remediationAction: "restrict-access" },
    ] },


  // ══════════════════════════════════════════════════════════════════════════
  //  r-ex-01 through r-ex-08  (NEW batch — FND-2025-1067..1099)
  // ══════════════════════════════════════════════════════════════════════════
  // r-ex-01: Sensitive S3 Bucket Accessible by External AWS Account
  {
    id: "FND-2025-1067", ruleId: "r-ex-01", severity: "Critical", status: "Open",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Bucket Policy: external account", sublabel: "Account 987654321098 · s3:GetObject", badge: "EXTERNAL ACCT", alert: true },
      ],
      edges: [{ label: "grants access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · Bucket policy: s3:GetObject granted to AWS account 987654321098 (external, unrecognized) · Content: PII + PHI — Medical Records, SSNs across 847 objects",
    evidence: [
      "Bucket: prod-data-lake — bucket policy grants s3:GetObject to arn:aws:iam::987654321098:root",
      "Account 987654321098 is not in the approved cross-account list — unrecognized external account",
      "Policy added 8 hours ago via CloudFormation stack (stack: data-sharing-ext)",
      "Bucket contains: Medical Records, SSNs, Financial IDs in 847 objects",
    ],
    rationale: "An external AWS account with GetObject access to a bucket containing PHI is an unauthorized data access path. CloudFormation-managed bucket policies can introduce external access silently if not reviewed.",
    action: [
      { text: "Remove external account 987654321098 from prod-data-lake bucket policy immediately", remediationAction: "revoke-external" },
      { text: "Review CloudFormation stack 'data-sharing-ext' — determine who deployed it and why", remediationAction: "restrict-access" },
      { text: "Check CloudTrail for any s3:GetObject calls from account 987654321098 in last 8 hours", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1068", ruleId: "r-ex-01", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "code-artifacts", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Bucket Policy: external account", sublabel: "Account 112233445566 · s3:GetObject", badge: "EXTERNAL ACCT", alert: true },
      ],
      edges: [{ label: "grants access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/code-artifacts) · Bucket policy: s3:* granted to account 112233445566 (vendor account) · Source Code, Private Keys in artifacts",
    evidence: [
      "Bucket prefix: prod-data-lake/code-artifacts/ — vendor account 112233445566 has s3:GetObject on prefix",
      "Account 112233445566: identified as a former CI/CD vendor account (vendor contract ended 4 months ago)",
      "Access not revoked after vendor offboarding",
      "Source code artifacts include: Private Keys, configuration files with IP Addresses",
    ],
    rationale: "Former vendor accounts retaining S3 access post-contract expiry is a supply chain data leakage risk. Source code and configuration artifacts are high-value IP targets.",
    action: [
      { text: "Remove account 112233445566 from code-artifacts bucket policy", remediationAction: "revoke-external" },
      { text: "Audit all S3 bucket policies for external account principals — compare against approved vendor list", remediationAction: "apply-dlp" },
      { text: "Review CloudTrail for GetObject activity from account 112233445566 in last 4 months" },
    ] },
  {
    id: "FND-2025-1069", ruleId: "r-ex-01", severity: "High", status: "Rescan",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Bucket ACL: external canonical ID", sublabel: "Canonical ID: e3b0c4... · READ", badge: "EXTERNAL ACCT", alert: true },
      ],
      edges: [{ label: "grants access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · Bucket ACL: READ granted to external canonical ID e3b0c4... (unidentifiable) · Bucket contains customer PII: Email Addresses, Personal Names",
    evidence: [
      "Bucket ACL: external canonical ID e3b0c4... has READ permission at bucket level",
      "Canonical ID cannot be mapped to a known AWS account — origin unknown",
      "Bucket: prod-data-lake — customer analytics data (Email Addresses, Personal Names, Company Names)",
      "ACL age: 11 months — pre-dates current security ownership",
    ],
    rationale: "S3 bucket ACL entries for unidentifiable canonical IDs represent unknown external access. Canonical ID-based ACLs are a legacy mechanism that bypasses modern bucket policy controls.",
    action: [
      { text: "Remove the unidentifiable canonical ID ACL entry from prod-data-lake", remediationAction: "revoke-external" },
      { text: "Enable S3 Block Public Access (canonical ID ACL entries are considered public access in some configs)", remediationAction: "restrict-access" },
      { text: "Migrate all S3 access control to bucket policies — remove all ACL-based grants", remediationAction: "apply-dlp" },
    ] },
  // r-ex-02: PII Shared with External Personal Domains
  {
    id: "FND-2025-1070", ruleId: "r-ex-02", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Employee_Benefits_Data.xlsx", sublabel: "Shared with: sarah.jones123@gmail.com", badge: "External Personal", alert: true },
        { type: "identity", label: "sarah.jones123@gmail.com", sublabel: "Personal Gmail · External" },
      ],
      edges: [{ label: "contains" }, { label: "shared with", dashed: true }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · File: Employee_Benefits_Data.xlsx — shared as Viewer with sarah.jones123@gmail.com (personal Gmail) · Content: Social Security Numbers, Healthcare IDs, Medical Records",
    evidence: [
      "File: Employee_Benefits_Data.xlsx — 412 employee benefits records with SSNs, Healthcare IDs",
      "External share: sarah.jones123@gmail.com (personal Gmail, not a company domain)",
      "Share created by: Sarah Okonkwo (sarah.okonkwo@company.com) 3 days ago",
      "Likely: HR employee sharing work with personal email for home access — policy violation",
    ],
    rationale: "Sharing PHI/PII with personal email accounts bypasses corporate DRM controls. Data at a personal Gmail account cannot be governed, rotated, or recalled if the employee is terminated.",
    action: [
      { text: "Revoke external sharing for sarah.jones123@gmail.com", remediationAction: "revoke-external" },
      { text: "Notify Sarah Okonkwo and HR manager — policy violation coaching required" },
      { text: "Apply DLP: block Google Drive sharing with personal email domains (@gmail.com, @yahoo.com, etc.)", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1071", ruleId: "r-ex-02", severity: "Critical", status: "Open",
    detectedAt: "4 hours ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
        { type: "file",  label: "Payroll_Q4_2024.xlsx", sublabel: "Shared with: m.webb.personal@yahoo.com", badge: "External Personal", alert: true },
        { type: "identity", label: "m.webb.personal@yahoo.com", sublabel: "Personal Yahoo · External", alert: true },
      ],
      edges: [{ label: "contains" }, { label: "shared with", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · File: Payroll_Q4_2024.xlsx — shared with m.webb.personal@yahoo.com (personal Yahoo email, matches employee Marcus Webb) · Bank Account Information, SSNs for 412 employees",
    evidence: [
      "Payroll file shared with Yahoo email that matches Finance Lead Marcus Webb's identity",
      "File: 412 employee payroll records with Bank Account Numbers, SSNs, salary data",
      "Share created by: Marcus Webb (marcus.webb@company.com) 4 hours ago",
      "Context: Marcus Webb has elevated UEBA risk score (87/100) — potential pre-departure exfiltration",
    ],
    rationale: "A high-risk employee sharing full payroll data with their personal email address is a definitive insider threat exfiltration event. Combined with Marcus Webb's active UEBA investigation, this requires immediate escalation.",
    action: [
      { text: "Revoke external sharing for m.webb.personal@yahoo.com immediately", remediationAction: "revoke-external" },
      { text: "Escalate to P0 Insider Threat incident — Marcus Webb UEBA + payroll exfiltration", remediationAction: "legal-hold" },
      { text: "Apply Legal Hold on all files shared by Marcus Webb", remediationAction: "legal-hold" },
      { text: "Suspend Marcus Webb's corporate account pending CISO/Legal review", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1072", ruleId: "r-ex-02", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Marketing Assets", sublabel: "Google Drive · acme-marketing.google.com" },
        { type: "file",  label: "Customer_Email_List_2024.csv", sublabel: "Shared with: nina.v.freelance@gmail.com", badge: "External Personal", alert: true },
        { type: "identity", label: "nina.v.freelance@gmail.com", sublabel: "Personal Gmail · External" },
      ],
      edges: [{ label: "contains" }, { label: "shared with", dashed: true }] },
    matchedCondition: "App: Google Drive (acme-marketing.google.com) · File: Customer_Email_List_2024.csv — shared with nina.v.freelance@gmail.com (personal Gmail, matches Marketing Manager Nina Vasquez) · 15,432 customer Email Addresses",
    evidence: [
      "Customer email list shared with Gmail account matching Nina Vasquez",
      "15,432 customer records: Email Addresses, Personal Names, Company Names",
      "GDPR: customer data processing consent does not cover personal email storage",
    ],
    rationale: "Customer PII shared with an employee's personal email account is a GDPR data minimization and accountability violation. The data controller cannot ensure customer data is deleted from personal accounts on request.",
    action: [
      { text: "Revoke external sharing for nina.v.freelance@gmail.com", remediationAction: "revoke-external" },
      { text: "Notify Nina Vasquez — require acknowledgment and deletion from personal email" },
      { text: "File GDPR incident report — personal email export of customer PII may trigger 72-hour notification window" },
    ] },
  {
    id: "FND-2025-1073", ruleId: "r-ex-02", severity: "High", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Legal – Contracts", sublabel: "SharePoint · acme-legal.sharepoint.com" },
        { type: "file",  label: "M&A_Due_Diligence_Pack.zip", sublabel: "Shared with: jthornton.personal@gmail.com", badge: "External Personal", alert: true },
        { type: "identity", label: "jthornton.personal@gmail.com", sublabel: "Personal Gmail · External" },
      ],
      edges: [{ label: "contains" }, { label: "shared with", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-legal.sharepoint.com) · File: M&A_Due_Diligence_Pack.zip — shared with jthornton.personal@gmail.com (personal Gmail, external partner James Thornton) · MNPI: Financial IDs, Company Names",
    evidence: [
      "M&A due diligence package shared with personal Gmail of an external partner",
      "Content: acquisition financials, target company names, deal terms — MNPI",
      "James Thornton is an external partner — sharing company MNPI to personal email may violate NDA",
    ],
    rationale: "M&A due diligence materials shared to a personal email account violate information barrier controls and NDA obligations. Personal email accounts are outside all corporate DLP and DRM governance.",
    action: [
      { text: "Revoke external sharing for jthornton.personal@gmail.com immediately", remediationAction: "revoke-external" },
      { text: "Notify Legal and Compliance — NDA violation assessment required", remediationAction: "legal-hold" },
      { text: "Apply Legal Hold on M&A_Due_Diligence_Pack.zip and all associated documents", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1074", ruleId: "r-ex-02", severity: "Medium", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Engineering Hub", sublabel: "SharePoint · acme-corp.sharepoint.com/eng" },
        { type: "file",  label: "prod-architecture-diagram.vsdx", sublabel: "Shared with: d.kim.work@gmail.com", badge: "External Personal", alert: true },
        { type: "identity", label: "d.kim.work@gmail.com", sublabel: "Personal Gmail · External" },
      ],
      edges: [{ label: "contains" }, { label: "shared with", dashed: true }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/eng) · File: prod-architecture-diagram.vsdx shared with personal Gmail matching David Kim · Source Code, IP Addresses in architecture diagram",
    evidence: [
      "Architecture diagram shared with personal Gmail account matching transferred engineer David Kim",
      "Content: production network topology, IP ranges, service dependencies",
      "David Kim recently transferred to an external affiliate — may be sharing for work continuity",
    ],
    rationale: "Production architecture diagrams shared with personal email accounts provide persistent external access to network topology. This data enables targeted attack path planning against the production environment.",
    action: [
      { text: "Revoke external sharing for d.kim.work@gmail.com", remediationAction: "revoke-external" },
      { text: "If David Kim needs access for legitimate affiliate work, provision via corporate-to-corporate access channel" },
      { text: "Apply DLP: block SharePoint sharing of architecture diagrams with personal email domains", remediationAction: "apply-dlp" },
    ] },
  // r-ex-03: Sensitive Data Exposed in ChatGPT Conversations
  {
    id: "FND-2025-1075", ruleId: "r-ex-03", severity: "Critical", status: "Open",
    detectedAt: "2 hours ago", lastSeenAt: "2 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Sarah Okonkwo", sublabel: "HR Director · Internal" },
        { type: "file",  label: "Chat Message", sublabel: "2.1 KB · SSNs + Medical Records", badge: "PII/PHI", alert: true },
        { type: "store", label: "ChatGPT Enterprise", sublabel: "ChatGPT Enterprise · chatgpt.acme.com", alert: true },
      ],
      edges: [{ label: "submitted" }, { label: "to" }] },
    matchedCondition: "App: ChatGPT Enterprise (chatgpt.acme.com) · User: Sarah Okonkwo · Content submitted: 2.1 KB containing 8 Social Security Numbers, 3 Healthcare IDs, Medical Diagnoses — in employee assistance query context",
    evidence: [
      "ChatGPT Enterprise session: sarah.okonkwo@company.com — conversation ID c8e7f2...",
      "Submitted: employee assistance program query with real employee data (8 SSNs, 3 Healthcare IDs, Medical Diagnoses)",
      "ChatGPT Enterprise data retention: 30-day conversation history on acme.com workspace",
      "DLP: detected via ChatGPT Enterprise API audit log — content not blocked (policy gap)",
    ],
    rationale: "PHI submitted to ChatGPT Enterprise is retained in conversation history for 30 days and may be surfaced to other workspace users or administrators. Even enterprise ChatGPT is not a HIPAA Business Associate.",
    action: [
      { text: "Apply DLP Policy to ChatGPT Enterprise: block PHI/PII content submission", remediationAction: "apply-dlp" },
      { text: "Request ChatGPT Enterprise admin delete conversation c8e7f2... from workspace history", remediationAction: "delete" },
      { text: "Notify Sarah Okonkwo and HR leadership — coaching required on anonymization before AI use" },
      { text: "Initiate HIPAA incident review for PHI submitted to non-BAA platform" },
    ] },
  {
    id: "FND-2025-1076", ruleId: "r-ex-03", severity: "High", status: "Open",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "file",  label: "Chat Message", sublabel: "1.8 KB · Customer PII", badge: "PII", alert: true },
        { type: "store", label: "ChatGPT Enterprise", sublabel: "ChatGPT Enterprise · chatgpt.acme.com" },
      ],
      edges: [{ label: "submitted" }, { label: "to" }] },
    matchedCondition: "App: ChatGPT Enterprise (chatgpt.acme.com) · User: Brian Kowalski · Chat message: 1.8 KB with 23 customer records — Email Addresses, Company Names, revenue figures",
    evidence: [
      "ChatGPT Enterprise: brian.kowalski@company.com — pasting customer revenue query results for analysis assistance",
      "Payload: 23 customer records with Email Addresses, Company Names, annual revenue figures",
      "Revenue figures are commercial-sensitive — not explicitly PII but confidential",
    ],
    rationale: "Customer revenue data submitted to ChatGPT Enterprise creates a data confidentiality risk. Revenue by customer is commercially sensitive and may violate NDAs with named customers.",
    action: [
      { text: "Apply DLP: block customer revenue data (Company Names + Financial IDs combination) in ChatGPT Enterprise", remediationAction: "apply-dlp" },
      { text: "Train Analytics team on anonymizing data before AI submission — mask company names and revenue" },
      { text: "Request deletion of conversation from ChatGPT Enterprise workspace", remediationAction: "delete" },
    ] },
  {
    id: "FND-2025-1077", ruleId: "r-ex-03", severity: "High", status: "Rescan",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "file",  label: "Chat Message", sublabel: "4.7 KB · DB Schema + Credentials", badge: "Credentials", alert: true },
        { type: "store", label: "ChatGPT Enterprise", sublabel: "ChatGPT Enterprise · chatgpt.acme.com" },
      ],
      edges: [{ label: "submitted" }, { label: "to" }] },
    matchedCondition: "App: ChatGPT Enterprise (chatgpt.acme.com) · User: Alice Chen · Chat message: 4.7 KB — PostgreSQL connection string with password + table schema · Private Keys pattern matched",
    evidence: [
      "Alice Chen submitted PostgreSQL schema dump to ChatGPT Enterprise for query optimization help",
      "Schema dump contained: pg://user:PASSWORD@prod-db.internal:5432/customers — live connection string",
      "ChatGPT Enterprise: credential content retained in 30-day conversation history",
    ],
    rationale: "Live database connection strings submitted to ChatGPT Enterprise are retained in conversation history. Any administrator or security reviewer of the workspace can view the credentials.",
    action: [
      { text: "Rotate the PostgreSQL credentials submitted in the conversation immediately" },
      { text: "Delete conversation from ChatGPT Enterprise workspace history", remediationAction: "delete" },
      { text: "Apply DLP: block credential pattern (connection strings, passwords) in ChatGPT Enterprise", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1078", ruleId: "r-ex-03", severity: "Medium", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal" },
        { type: "file",  label: "Chat Message", sublabel: "3.2 KB · Architecture Details", badge: "Confidential", alert: true },
        { type: "store", label: "ChatGPT Enterprise", sublabel: "ChatGPT Enterprise · chatgpt.acme.com" },
      ],
      edges: [{ label: "submitted" }, { label: "to" }] },
    matchedCondition: "App: ChatGPT Enterprise (chatgpt.acme.com) · User: David Kim · Chat message: 3.2 KB — internal API specs with IP Addresses, endpoint names, domain names",
    evidence: [
      "David Kim pasting internal API specification for design review assistance",
      "API spec contains: internal endpoint URLs, IP addresses, service names",
      "No PII detected — IP address and infrastructure detail pattern matched",
    ],
    rationale: "Internal API specifications with production IP addresses and endpoint details in ChatGPT Enterprise create infrastructure reconnaissance data in a third-party-hosted AI platform.",
    action: [
      { text: "Apply DLP: warn on IP Address + Domain Name patterns in ChatGPT Enterprise", remediationAction: "apply-dlp" },
      { text: "Train engineering team to sanitize IP addresses from specs before AI submission" },
    ] },
  // r-ex-04 through r-ex-08 batches
  {
    id: "FND-2025-1079", ruleId: "r-ex-04", severity: "Critical", status: "Open",
    detectedAt: "1 hour ago", lastSeenAt: "1 hour ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal" },
        { type: "activity", label: "Paste / Submit", sublabel: "3.4 KB · Customer PII", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: "Activity: Post · Category: Generative AI (ChatGPT) · Content: 3.4 KB — 47 customer records with Email Addresses, Telephone Numbers, Company Names · Action: Blocked",
    evidence: [
      "Tom Harrington (tom.harrington@company.com) — on PIP, elevated UEBA — attempting to paste customer list to ChatGPT",
      "Payload: 47 customer contact records with full contact details",
      "Context: combined with prior bulk download (r-op-06), this is a multi-vector exfiltration attempt",
      "Action: Blocked at CASB Inline layer",
    ],
    rationale: "A high-risk user already flagged for bulk downloads attempting to submit customer PII to an unsanctioned AI tool represents a multi-vector exfiltration incident requiring immediate account suspension.",
    action: [
      { text: "Blocked — escalate to P0 Insider Threat: Tom Harrington multi-vector exfiltration", remediationAction: "legal-hold" },
      { text: "Suspend Tom Harrington corporate account immediately pending investigation", remediationAction: "restrict-access" },
      { text: "Preserve all CASB, SharePoint, and UEBA logs under Legal Hold" },
    ] },
  {
    id: "FND-2025-1080", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "5 hours ago", lastSeenAt: "5 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "activity", label: "Paste / Submit", sublabel: "2.2 KB · Financial PII", badge: "Blocked", alert: true },
        { type: "destination", label: "Gemini (Google)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: "Activity: Post · Category: Generative AI (Gemini) · Content: 2.2 KB — Bank Account Information (12 values), Financial IDs — payroll data submitted for formatting help · Action: Blocked",
    evidence: [
      "Rachel Torres — pasting payroll data to Gemini for spreadsheet formatting assistance",
      "Payload: 12 bank account numbers, employee IDs, salary figures",
      "DLP profile matched: Financial PII — blocked even on sanctioned Gemini",
    ],
    rationale: "Financial PII (bank account numbers) must be blocked even on sanctioned AI tools. No AI provider is authorized to process bank account data under the company's PCI-DSS controls.",
    action: [
      { text: "Blocked — notify Rachel Torres and Finance manager" },
      { text: "Provide Finance team with a compliant spreadsheet formatting tool that doesn't require data export" },
      { text: "Apply DLP: block Bank Account Information on all AI tools including sanctioned ones", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1081", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "8 hours ago", lastSeenAt: "8 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal" },
        { type: "activity", label: "Paste / Submit", sublabel: "5.1 KB · M&A Target Data", badge: "Blocked", alert: true },
        { type: "destination", label: "Claude (Anthropic)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: "Activity: Post · Category: Generative AI (Claude, unsanctioned) · Content: 5.1 KB — Company Names (M&A targets), Financial IDs (deal valuations) — submitted to unsanctioned Claude · Action: Blocked",
    evidence: [
      "Marcus Webb (UEBA HIGH) attempting to submit M&A target data to unsanctioned Claude",
      "Payload: 5.1 KB — M&A target company names, deal valuations, financial projections",
      "Marcus Webb has active UEBA investigation and prior bulk download finding",
      "Using unsanctioned Claude despite company policy",
    ],
    rationale: "M&A target data submitted to an unsanctioned AI tool by a high-risk user under active investigation is a critical MNPI exfiltration event. This further corroborates the insider threat hypothesis.",
    action: [
      { text: "Blocked — add to Insider Threat evidence package for Marcus Webb investigation", remediationAction: "legal-hold" },
      { text: "Escalate to CISO and Legal — fourth indicator in Marcus Webb multi-vector incident" },
      { text: "Suspend Marcus Webb's network access pending forensic review", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1082", ruleId: "r-ex-04", severity: "Medium", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal" },
        { type: "activity", label: "Paste / Submit", sublabel: "890 B · Customer Emails", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: "Activity: Post · Category: Generative AI (ChatGPT) · Content: 890 bytes — Email Addresses (12 customer records) for campaign subject line drafting · Action: Blocked",
    evidence: [
      "Nina Vasquez — blocked attempting to paste customer email addresses into ChatGPT for marketing copy help",
      "Payload: 12 customer email addresses for campaign personalization context",
      "Pattern: repeated behavior (3rd block in 2 weeks for Nina Vasquez)",
    ],
    rationale: "Repeated blocking of the same user pasting customer PII to AI tools indicates a training gap rather than malicious intent, but the behavior persists and requires escalation.",
    action: [
      { text: "Blocked — mandatory AI usage training for Nina Vasquez (3rd occurrence)", remediationAction: "apply-dlp" },
      { text: "Escalate to Nina Vasquez's manager — policy acknowledgment required" },
      { text: "Provision Nina Vasquez with an approved marketing AI tool that anonymizes customer data" },
    ] },
  {
    id: "FND-2025-1083", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-content-mgmt", sublabel: "Service Account · Marketing" },
        { type: "activity", label: "API Call / Submit", sublabel: "8.3 KB · Customer PII", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: "Activity: API Post (service account) · Category: Generative AI (ChatGPT API, unsanctioned) · Content: 8.3 KB — 34 customer profiles with Email Addresses, Company Names, Telephone Numbers · Action: Blocked",
    evidence: [
      "Service account svc-content-mgmt making unauthorized ChatGPT API calls from production",
      "Payload: 34 customer profiles — personalization data for content generation",
      "ChatGPT is NOT sanctioned — svc-content-mgmt bypassed the approved AI tool list",
      "Service account has no DLP coverage for AI API calls — policy gap closed by this block",
    ],
    rationale: "Production service accounts making unauthorized calls to external AI APIs are a systematic governance risk. The combination of customer PII and an unsanctioned AI provider violates GDPR data processing agreements.",
    action: [
      { text: "Block ChatGPT API endpoint at the network layer for all service account traffic", remediationAction: "apply-dlp" },
      { text: "Review svc-content-mgmt's code — replace ChatGPT API calls with approved AI provider", remediationAction: "restrict-access" },
      { text: "Implement API gateway policy: service accounts require allowlisted AI provider endpoints", remediationAction: "apply-dlp" },
    ] },
  // r-ex-05: High Risk User Sending Data from High Risk App
  {
    id: "FND-2025-1084", ruleId: "r-ex-05", severity: "Critical", status: "Open",
    detectedAt: "2 hours ago", lastSeenAt: "2 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "File Upload", sublabel: "14 MB · Financial data", badge: "HIGH VOLUME", alert: true },
        { type: "destination", label: "Dropbox Personal", sublabel: "Cloud Storage · Unsanctioned", alert: true },
      ],
      edges: [{ label: "uploaded from high-risk app" }, { label: "to" }] },
    matchedCondition: "Identity: Marcus Webb (UEBA HIGH 87/100) · Source App: Salesforce (high-risk user with admin access) · Destination: Dropbox Personal (unsanctioned) · Activity: export 14 MB customer opportunity data · Action: Blocked",
    evidence: [
      "Marcus Webb — UEBA HIGH, multiple prior exfiltration indicators",
      "Exported 14 MB opportunity data from Salesforce (customer pipeline, deal values, contacts)",
      "Attempted upload to Dropbox Personal (personal cloud storage — not corporate Dropbox)",
      "Blocked at CASB Inline layer after Salesforce export",
    ],
    rationale: "This is the fifth indicator in the Marcus Webb insider threat investigation: exporting Salesforce opportunity data (customer contacts + deal values) to personal Dropbox is a textbook exfiltration-before-departure event.",
    action: [
      { text: "Blocked — immediate P0 escalation: suspend Marcus Webb's all corporate access", remediationAction: "restrict-access" },
      { text: "Preserve Salesforce audit logs and CASB logs under Legal Hold", remediationAction: "legal-hold" },
      { text: "Initiate HR/Legal investigation — evidence package includes 5 corroborating findings" },
      { text: "Notify CISO, General Counsel, and HR within 1 hour" },
    ] },
  {
    id: "FND-2025-1085", ruleId: "r-ex-05", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "File Upload", sublabel: "2.3 MB · CRM Data", badge: "Blocked", alert: true },
        { type: "destination", label: "Google Drive Personal", sublabel: "Cloud Storage · Personal", alert: true },
      ],
      edges: [{ label: "uploaded from CRM" }, { label: "to" }] },
    matchedCondition: "Identity: Tom Harrington (UEBA HIGH 79/100) · Source: Salesforce CRM · Destination: Personal Google Drive · Activity: export + upload 2.3 MB customer contact list · Action: Blocked",
    evidence: [
      "Tom Harrington — on PIP, UEBA HIGH — exporting from Salesforce to personal Google Drive",
      "2.3 MB CRM export: customer contacts, opportunity pipeline, account details",
      "Upload destination: personal Google account (not corporate Google Workspace)",
    ],
    rationale: "Sales employee on a PIP exporting CRM data to their personal Google Drive is a strong indicator of pre-departure competitive data theft. Customer contacts have direct resale value to competitors.",
    action: [
      { text: "Blocked — suspend Tom Harrington's Salesforce and SharePoint access", remediationAction: "restrict-access" },
      { text: "Preserve Salesforce export audit trail under Legal Hold", remediationAction: "legal-hold" },
      { text: "Escalate HR/Legal investigation — multiple corroborating exfiltration indicators" },
    ] },
  {
    id: "FND-2025-1086", ruleId: "r-ex-05", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "File Upload", sublabel: "890 KB · Email Campaign Data", badge: "Blocked", alert: true },
        { type: "destination", label: "Mailchimp Personal", sublabel: "Marketing App · Unsanctioned", alert: true },
      ],
      edges: [{ label: "uploaded from CRM" }, { label: "to" }] },
    matchedCondition: "Identity: Nina Vasquez (UEBA HIGH) · Source: HubSpot CRM (high-risk source app) · Destination: Mailchimp free account (unsanctioned) · Upload: 890 KB customer email list · Action: Blocked",
    evidence: [
      "Nina Vasquez exporting customer email list from HubSpot to a personal Mailchimp free account",
      "890 KB: 15,432 customer email addresses + contact details",
      "Personal Mailchimp: not corporate account — data would leave corporate DRM controls",
    ],
    rationale: "Customer email list exported from corporate CRM to personal marketing tool account removes data from corporate governance. Combined with UEBA elevation, this suggests unauthorized data extraction for freelance use.",
    action: [
      { text: "Blocked — notify Nina Vasquez and Marketing Director", remediationAction: "restrict-access" },
      { text: "Review whether this is unauthorized freelance activity using corporate customer data" },
      { text: "File GDPR incident report — customer PII export to unsanctioned processor", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1087", ruleId: "r-ex-05", severity: "Medium", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "File Upload", sublabel: "3.1 MB · Source Code", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub Personal", sublabel: "Source Control · Personal", alert: true },
      ],
      edges: [{ label: "pushed from corporate repo" }, { label: "to" }] },
    matchedCondition: "Identity: David Kim (UEBA elevated) · Source: GitHub Enterprise (corporate) · Destination: GitHub.com personal account (david-kim-dev) · Activity: push 3.1 MB source code · Action: Blocked",
    evidence: [
      "David Kim attempting to push corporate source code from GitHub Enterprise to personal GitHub account",
      "3.1 MB: core service modules, API handlers, database schemas",
      "GitHub Enterprise DLP integration blocked the push",
    ],
    rationale: "Engineers pushing corporate source code to personal GitHub accounts is a direct IP theft vector. Recently transferred to an affiliate, David Kim may be taking code for use at the new entity.",
    action: [
      { text: "Blocked — notify David Kim's manager and Security Operations", remediationAction: "restrict-access" },
      { text: "Review David Kim's GitHub Enterprise activity for other unauthorized external pushes" },
      { text: "Apply GitHub Enterprise DLP: block all pushes to non-corporate GitHub accounts", remediationAction: "apply-dlp" },
    ] },
  // r-ex-06: High-Risk User Uploading to Unsanctioned Apps (new batch)
  {
    id: "FND-2025-1088", ruleId: "r-ex-06", severity: "Critical", status: "Open",
    detectedAt: "3 hours ago", lastSeenAt: "3 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal", badge: "Risk: HIGH", alert: true },
        { type: "activity", label: "HTTP Upload", sublabel: "11 MB · Financial data", badge: "Blocked", alert: true },
        { type: "destination", label: "Box Personal", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Identity: Marcus Webb (Risk: HIGH) · Activity: HTTP Upload 11 MB to box.com (personal tier, not corporate) · Content matched: Financial IDs, Bank Account Information · Action: Blocked (SWG)",
    evidence: [
      "SWG intercepted: marcus.webb@company.com uploading 11 MB to app.box.com (personal account)",
      "Content matched: Financial IDs, Bank Account Information — financial model files",
      "Box.com is the unsanctioned personal version — corporate Box is on a separate tenant",
      "UEBA context: 6th indicator in Marcus Webb insider threat timeline",
    ],
    rationale: "Another vector in the Marcus Webb multi-indicator insider threat case. Uploading financial models to personal Box after prior SharePoint bulk download and Salesforce export constitutes a deliberate multi-channel exfiltration.",
    action: [
      { text: "Blocked — immediate P0: suspend all Marcus Webb network access", remediationAction: "restrict-access" },
      { text: "Lock down SWG policy: block all cloud storage uploads for Marcus Webb until investigation complete" },
      { text: "Add to Legal Hold dossier — 6th corroborating finding", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1089", ruleId: "r-ex-06", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal", badge: "Risk: HIGH", alert: true },
        { type: "activity", label: "HTTP Upload", sublabel: "1.4 MB · Payroll", badge: "Blocked", alert: true },
        { type: "destination", label: "WeTransfer", sublabel: "File Transfer · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Identity: Rachel Torres (Risk: HIGH) · Activity: HTTP Upload 1.4 MB to wetransfer.com · Content: Bank Account Information, SSNs — payroll archive · Action: Blocked (SWG)",
    evidence: [
      "Rachel Torres uploading payroll data to WeTransfer (anonymous file transfer service)",
      "1.4 MB: payroll archive with bank account numbers and SSNs",
      "WeTransfer allows anonymous download links — no access control once uploaded",
      "UEBA context: Rachel Torres has elevated risk from prior weekend download anomaly",
    ],
    rationale: "Payroll data uploaded to WeTransfer creates an uncontrolled anonymous download link accessible to anyone with the URL. This is a direct PCI-DSS violation for bank account data.",
    action: [
      { text: "Blocked — notify Rachel Torres and Finance Director", remediationAction: "restrict-access" },
      { text: "Escalate within Insider Threat program — Rachel Torres risk continues to escalate" },
      { text: "Block WeTransfer at SWG for all Finance team members", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1090", ruleId: "r-ex-06", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal", badge: "Risk: HIGH", alert: true },
        { type: "activity", label: "HTTP Upload", sublabel: "3.8 MB · CRM Export", badge: "Blocked", alert: true },
        { type: "destination", label: "Dropbox Personal", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Identity: Tom Harrington (Risk: HIGH) · Activity: HTTP Upload 3.8 MB to dropbox.com (personal account) · Content: Email Addresses, Telephone Numbers, Company Names — CRM export · Action: Blocked (SWG)",
    evidence: [
      "Tom Harrington attempting to upload CRM export to personal Dropbox via web browser",
      "3.8 MB: customer contact list (CRM export format)",
      "Multiple prior blocked attempts via different channels — pattern escalating",
    ],
    rationale: "Persistent multi-channel exfiltration attempts by a high-risk user require account suspension. Each blocked attempt reveals another attempted exfiltration method, indicating deliberate sophisticated behavior.",
    action: [
      { text: "Blocked — suspend Tom Harrington's all network access pending investigation", remediationAction: "restrict-access" },
      { text: "Escalate to Legal/HR — Tom Harrington has now attempted exfiltration via 3 channels", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1091", ruleId: "r-ex-06", severity: "Medium", status: "Rescan",
    detectedAt: "1 week ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal", badge: "Risk: HIGH", alert: true },
        { type: "activity", label: "HTTP Upload", sublabel: "450 KB · Contact List", badge: "Blocked", alert: true },
        { type: "destination", label: "HubSpot Personal", sublabel: "Marketing App · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Identity: Nina Vasquez (Risk: HIGH) · Activity: HTTP Upload 450 KB to app.hubspot.com (personal free account) · Email Addresses, Company Names — contact list upload · Action: Blocked (SWG)",
    evidence: [
      "Nina Vasquez uploading customer contact list to personal HubSpot free account",
      "450 KB: 8,200 customer email addresses and company names",
      "Using personal HubSpot — separate from corporate HubSpot instance",
    ],
    rationale: "Customer contacts uploaded to a personal marketing tool account suggest unauthorized use of corporate data for personal or freelance marketing activities.",
    action: [
      { text: "Blocked — require meeting with Nina Vasquez, manager, and HR to clarify data use policy" },
      { text: "Block personal HubSpot (app.hubspot.com non-corporate) at SWG for all marketing staff", remediationAction: "apply-dlp" },
    ] },
  // r-ex-07: Exfiltration to Personal SaaS Instances
  {
    id: "FND-2025-1092", ruleId: "r-ex-07", severity: "High", status: "Open",
    detectedAt: "2 hours ago", lastSeenAt: "2 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal" },
        { type: "activity", label: "File Upload", sublabel: "5.6 MB · Financial models", badge: "Blocked", alert: true },
        { type: "destination", label: "OneDrive Personal", sublabel: "Cloud Storage · Personal Instance", badge: "Personal Instance", alert: true },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Activity: Upload · App: OneDrive (personal tenant — live.com, not acme-corp.onedrive.com) · User: Marcus Webb · Content: Financial IDs, Bank Account Information — personal instance upload · Action: Blocked",
    evidence: [
      "Marcus Webb uploading to personal OneDrive (onedrive.live.com) rather than corporate OneDrive (acme-corp)",
      "5.6 MB: financial models, investor relations drafts",
      "Personal Microsoft account detected via tenant ID mismatch — corporate policy blocks personal tenant uploads",
    ],
    rationale: "Personal instance uploads bypass all corporate DRM controls. Financial models uploaded to personal OneDrive cannot be revoked, audited, or governed by the company.",
    action: [
      { text: "Blocked — add to Marcus Webb insider threat dossier", remediationAction: "legal-hold" },
      { text: "Apply tenant restriction policy: block all Microsoft 365 personal tenant access from corporate devices", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1093", ruleId: "r-ex-07", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "activity", label: "File Upload", sublabel: "2.4 MB · Source Code", badge: "Blocked", alert: true },
        { type: "destination", label: "Google Drive Personal", sublabel: "Cloud Storage · Personal Instance", badge: "Personal Instance", alert: true },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Activity: Upload · App: Google Drive (personal account — google.com, not acme-corp.google.com) · User: Alice Chen · Content: Source Code, Private Keys · Action: Blocked",
    evidence: [
      "Alice Chen uploading to personal Google Drive (drive.google.com, not corporate)",
      "2.4 MB: Python modules and config files with hardcoded private keys",
      "Google Workspace tenant restriction: corporate policy requires acme-corp.google.com domain",
    ],
    rationale: "Source code with embedded credentials uploaded to personal cloud storage removes both IP and credential governance. Engineers frequently use personal cloud for 'backup' but this violates corporate IP policy.",
    action: [
      { text: "Blocked — notify Alice Chen and Engineering manager", remediationAction: "restrict-access" },
      { text: "Rotate the private keys detected in the blocked payload" },
      { text: "Apply Google Workspace tenant restriction: block personal google.com accounts on corporate devices", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1094", ruleId: "r-ex-07", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "activity", label: "File Upload", sublabel: "1.9 MB · Financial data", badge: "Blocked", alert: true },
        { type: "destination", label: "Dropbox Personal", sublabel: "Cloud Storage · Personal Instance", badge: "Personal Instance", alert: true },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Activity: Upload · App: Dropbox (personal account — dropbox.com consumer, not corporate Dropbox for Business) · User: Rachel Torres · Content: Financial IDs, SSNs · Action: Blocked",
    evidence: [
      "Rachel Torres uploading to personal Dropbox consumer account",
      "1.9 MB: financial reconciliation files with SSNs and Financial IDs",
      "Corporate Dropbox for Business is on a separate admin-controlled tenant",
    ],
    rationale: "Finance data in personal Dropbox creates PCI-DSS and GDPR compliance exposure. Personal cloud accounts cannot be audited or wiped if the employee is terminated.",
    action: [
      { text: "Blocked — Rachel Torres third exfiltration-related incident this week", remediationAction: "restrict-access" },
      { text: "Escalate to Finance Director and HR for formal discussion", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1095", ruleId: "r-ex-07", severity: "Medium", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal" },
        { type: "activity", label: "File Upload", sublabel: "780 KB · Design Docs", badge: "Blocked", alert: true },
        { type: "destination", label: "Notion Personal", sublabel: "Docs App · Personal Instance", badge: "Personal Instance", alert: true },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: "Activity: Upload · App: Notion (personal account — notion.so consumer, not corporate Notion workspace) · User: David Kim · Content: Source Code, IP Addresses in design documents · Action: Blocked",
    evidence: [
      "David Kim uploading design documents to personal Notion account",
      "780 KB: system design documents with architecture diagrams and internal IP references",
      "Corporate Notion workspace is admin-managed — personal Notion bypasses this governance",
    ],
    rationale: "Architecture documents in personal Notion workspaces remove corporate governance. Transferred engineers taking design documentation to personal tools before departure is a common IP leakage pattern.",
    action: [
      { text: "Blocked — notify David Kim and manager", remediationAction: "restrict-access" },
      { text: "Block personal Notion (notion.so non-corporate workspace) at CASB Inline", remediationAction: "apply-dlp" },
    ] },
  // r-ex-08: Exfiltration of Credentials/Keys via Web Upload
  {
    id: "FND-2025-1096", ruleId: "r-ex-08", severity: "Critical", status: "Open",
    detectedAt: "1 hour ago", lastSeenAt: "1 hour ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "file",  label: "ssh_keys_and_aws_creds.txt", sublabel: "Private Keys · 3.2 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "3.2 KB · Private Keys", badge: "Blocked", alert: true },
        { type: "destination", label: "Pastebin", sublabel: "Web App · Unsanctioned" },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to pastebin.com · User: Alice Chen · Content: 3.2 KB — SSH Private Keys (3), AWS Access Key pair, TLS certificate private key · Action: Blocked",
    evidence: [
      "Alice Chen posting to pastebin.com — likely for team sharing of infrastructure keys",
      "Content: 3 SSH private keys, 1 AWS access key pair, 1 TLS certificate private key",
      "Pastebin pastes are public by default — immediate infrastructure exposure risk",
      "Blocked at CASB Inline layer",
    ],
    rationale: "SSH and AWS private keys posted to Pastebin are searchable and publicly accessible by default. Even a 'private' Pastebin link can be discovered via search or brute-force. Credential exfiltration via paste sites is a well-known attack vector.",
    action: [
      { text: "Blocked — immediately rotate all 5 credentials in the blocked payload" },
      { text: "Notify Alice Chen — if key sharing is needed, use secrets manager sharing, never paste sites", remediationAction: "apply-dlp" },
      { text: "Block pastebin.com and similar paste sites at CASB Inline / SWG", remediationAction: "apply-dlp" },
      { text: "Audit if any prior pastes by Alice Chen are publicly accessible" },
    ] },
  {
    id: "FND-2025-1097", ruleId: "r-ex-08", severity: "Critical", status: "Open",
    detectedAt: "3 hours ago", lastSeenAt: "3 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-devops-build", sublabel: "Service Account · DevOps" },
        { type: "file",  label: ".env", sublabel: "AWS Access Key + Secret · 1.8 KB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "1.8 KB · AWS Credentials", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub.com (Public)", sublabel: "Source Control · Public" },
      ],
      edges: [{ label: "committed" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Git push (HTTP POST) to github.com public repository · Service account: svc-devops-build · Content: 1.8 KB config file with AWS Access Key ID + Secret · Action: Blocked",
    evidence: [
      "CI/CD service account attempting to push config file containing AWS credentials to a public GitHub repo",
      "AWS Access Key ID: AKIA... (live production key) + Secret included in .env file committed by mistake",
      "GitHub secret scanning would also catch this — but CASB Inline blocked the push first",
    ],
    rationale: "AWS credentials accidentally committed to a public GitHub repository are immediately harvested by automated scrapers. Production keys in public repos have historically led to within-minutes unauthorized access.",
    action: [
      { text: "Blocked — rotate AWS credentials AKIA... immediately regardless (scanning bots may have captured pre-block)", remediationAction: "delete" },
      { text: "Add git-secrets or truffleHog pre-commit hook to CI/CD pipeline to prevent future credential commits", remediationAction: "apply-dlp" },
      { text: "Review recent GitHub push activity for svc-devops-build — verify no prior unblocked credential pushes" },
    ] },
  {
    id: "FND-2025-1098", ruleId: "r-ex-08", severity: "High", status: "Open",
    detectedAt: "4 hours ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "file",  label: "payment_api_keys.txt", sublabel: "Stripe + Chargebee Keys · 950 B" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "950 B · API Keys", badge: "Blocked", alert: true },
        { type: "destination", label: "Slack (External Workspace)", sublabel: "Messaging · External" },
      ],
      edges: [{ label: "sent" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to Slack external workspace (vendor-connect.slack.com) · User: Brian Kowalski · Content: 950 bytes — Stripe API key, Chargebee API key in message text · Action: Blocked",
    evidence: [
      "Brian Kowalski sending API keys in a message to a vendor Slack workspace",
      "Keys: Stripe live API key (sk_live_...), Chargebee API key — payment processor credentials",
      "External Slack workspace: vendor-connect.slack.com (not governed by corporate Slack policies)",
    ],
    rationale: "Payment processor API keys sent to external Slack workspaces are outside corporate control and governance. External Slack members could inadvertently expose or misuse the keys.",
    action: [
      { text: "Blocked — rotate Stripe sk_live_... and Chargebee API keys immediately" },
      { text: "Notify Brian Kowalski — use Vault or secure credential sharing, not messaging apps", remediationAction: "apply-dlp" },
      { text: "Apply CASB DLP: block credential patterns in all external Slack workspace messages", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1099", ruleId: "r-ex-08", severity: "High", status: "Rescan",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "file",  label: "Vendor_Payment_Setup.pdf", sublabel: "Bank Account Credentials · 2.1 KB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "2.1 KB · Creds in PDF upload", badge: "Blocked", alert: true },
        { type: "destination", label: "DocuSign", sublabel: "eSign App · Sanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to DocuSign (file upload) · User: Rachel Torres · Content: 2.1 KB PDF containing Bank Account credentials, routing numbers in document body · Action: Blocked",
    evidence: [
      "Rachel Torres uploading PDF to DocuSign that contains Bank Account credentials embedded in document",
      "Document: vendor payment setup form with full bank account details in cleartext",
      "DocuSign is sanctioned — but credential/Bank Account pattern DLP triggered",
    ],
    rationale: "Bank account credential data submitted via sanctioned apps to external parties still creates exposure. DocuSign recipients and DocuSign itself retain the document indefinitely.",
    action: [
      { text: "Blocked — advise Rachel Torres to redact bank account details before DocuSign submission" },
      { text: "Use DocuSign's secure form fields for financial data collection, not document body text" },
      { text: "Apply DLP: block Bank Account Information in document uploads to e-sign platforms", remediationAction: "apply-dlp" },
    ] },


  // ══════════════════════════════════════════════════════════════════════════
  //  r-ex-04  Sensitive Data Ingestion by Generative AI  (CASB Inline, 14)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-4201", ruleId: "r-ex-04", severity: "Critical", status: "Open",
    detectedAt: "3 hours ago", lastSeenAt: "3 hours ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Diana Reyes", sublabel: "SOC Lead · Security" },
        { type: "activity",    label: "Paste / Submit", sublabel: "2.4 KB · PII + PHI", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (ChatGPT) · Content: 2.4 KB matched "Confidential" DLP Profile — Social Security Numbers (14 values), Medical Records, Healthcare IDs · Action: Blocked`,
    evidence: [
      "Session: Diana Reyes (diana.reyes@company.com) → ChatGPT (chat.openai.com/c/[session-id])",
      "Payload: 2.4 KB text containing 14 Social Security Numbers, 3 medical diagnoses, 7 healthcare IDs",
      "Likely context: SOC analyst pasting incident data for AI-assisted analysis",
      "DLP profile matched: 'Confidential' — PHI + PII combined trigger",
      "Action taken: Request blocked at CASB Inline layer — user notified with policy reason",
    ],
    rationale: "SOC analysts frequently paste raw logs and incident data into AI tools for analysis. When that data includes patient records or Social Security Numbers, it constitutes a HIPAA violation and data residency breach (data sent to external AI provider).",
    action: [
      { text: "Blocked — no data transmitted. No immediate data remediation required" },
      { text: "Coach Diana Reyes (diana.reyes@company.com) on anonymization techniques before using AI tools" },
      { text: "Provision access to an on-premise or private AI instance for sensitive data analysis" },
      { text: "Apply DLP Policy 'Generative AI': show user an in-browser warning with redaction guide before blocking", remediationAction: 'apply-dlp' },
    ] },
  {
    id: "FND-2024-4202", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "5 hours ago", lastSeenAt: "5 hours ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "activity",    label: "Paste / Submit", sublabel: "1.1 KB · Financial PII", badge: "Blocked", alert: true },
        { type: "destination", label: "Claude (Anthropic)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (Claude) · Content: 1.1 KB matched "Confidential" DLP — Payment Cards (8 values), Bank Account Information · Action: Blocked`,
    evidence: [
      "Session: Brian Kowalski (brian.kowalski@company.com) → Claude (claude.ai)",
      "Payload: 1.1 KB containing 8 payment card numbers and 3 bank account numbers",
      "Context: Analyst likely pasting finance data sample for report formatting assistance",
      "Action: Blocked at CASB Inline",
    ],
    rationale: "Payment card data submitted to external AI providers violates PCI-DSS requirements (Requirement 3: protect stored cardholder data). External AI systems are not PCI-compliant data processors.",
    action: [
      { text: "Blocked — no data transmitted. File PCI security incident report" },
      { text: "Notify Brian Kowalski (brian.kowalski@company.com) and Finance compliance team" },
      { text: "Provision a PCI-compliant internal analytics AI tool for Finance team use" },
    ] },
  {
    id: "FND-2024-4203", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "8 hours ago", lastSeenAt: "8 hours ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "activity",    label: "Paste / Submit", sublabel: "3.8 KB · Source Code + Keys", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub Copilot Chat", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (GitHub Copilot) · Content: 3.8 KB matched "Confidential" — Private Keys (2 values), AWS Access Keys, Passwords in source code · Action: Blocked`,
    evidence: [
      "Session: Alice Chen (alice.chen@company.com) → GitHub Copilot (github.com/copilot)",
      "Payload: 3.8 KB source code file with hardcoded credentials (2 private keys, 1 AWS key, 3 DB passwords)",
      "Even sanctioned AI tools should not receive credential-containing code",
      "Action: Blocked (credential pattern DLP)",
    ],
    rationale: "Even sanctioned AI coding assistants like GitHub Copilot should not receive source code containing hardcoded credentials. The risk is code training data leakage and credential exposure via AI-generated suggestions to other users.",
    action: [
      { text: "Blocked — notify Alice Chen (alice.chen@company.com) to remove credentials before using Copilot." },
      { text: "Rotate the 2 private keys, 1 AWS key, and 3 DB passwords identified in payload." },
      { text: "Enable pre-commit hook to scan for credentials before code is shared or pasted anywhere." },
    ] },
  {
    id: "FND-2024-4204", ruleId: "r-ex-04", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "20 hours ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Support Copilot", sublabel: "AI Agent · Support" },
        { type: "activity",    label: "API Call / Submit", sublabel: "12 KB · Customer PII", badge: "Blocked", alert: true },
        { type: "destination", label: "OpenAI API (GPT-4)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: API Post · Category: Generative AI (OpenAI API) · Content: 12 KB matched "Confidential" — 34 Personal Names, 34 Email Addresses, 12 Telephone Numbers in customer support context · Action: Blocked`,
    evidence: [
      "Agent: Support Copilot (support-copilot) making automated OpenAI API calls",
      "Payload: 12 KB customer support ticket batch — 34 customer records with PII",
      "The agent was sending full customer context (names, Email Addresses, Telephone Numbers) to OpenAI without anonymization",
      "DLP matched: PII profile — 34 Names, 34 Email Addresses, 12 Telephone Numbers",
    ],
    rationale: "AI agents calling external AI APIs with raw customer PII create a double-AI exposure risk. Customer data submitted to OpenAI without a DPA (Data Processing Agreement) likely violates GDPR Article 28.",
    action: [
      { text: "Blocked — audit Support Copilot's prompt templates to remove PII from OpenAI API calls." },
      { text: "Implement PII tokenization layer: replace PII with pseudonymous tokens before sending to any AI API." },
      { text: "Review OpenAI DPA status — ensure Data Processing Agreement is in place." },
      { text: "Require legal review before any AI agent is allowed to send customer data to external AI providers." },
    ] },
  {
    id: "FND-2024-4205", ruleId: "r-ex-04", severity: "High", status: "Rescan",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "James Thornton", sublabel: "Partner · External" },
        { type: "activity",    label: "Paste / Submit", sublabel: "890 B · Contract PII", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (ChatGPT) · Content: 890 bytes matched "Confidential" — Social Security Numbers, Financial IDs, Company Names from legal contract data · Action: Blocked`,
    evidence: [
      "External partner account: James Thornton (james.thornton@partner.io) on corporate network",
      "Payload: contract clause text with embedded Social Security Numbers and financial identifiers",
      "External user attempting to use ChatGPT to summarize legal contracts containing company confidential data",
    ],
    rationale: "External partners pasting confidential contract data into public AI tools represents a supply chain data leakage risk. The partner has no authority to share this data with third-party AI providers.",
    action: [
      { text: "Blocked — notify James Thornton (james.thornton@partner.io) and partner account manager." },
      { text: "Review partner access agreement — clarify AI tool usage restrictions." },
      { text: "Consider provisioning a sandboxed AI summarization tool for partners working with contract data." },
    ] },
  {
    id: "FND-2024-4206", ruleId: "r-ex-04", severity: "Medium", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Code Reviewer", sublabel: "AI Agent · Engineering" },
        { type: "activity",    label: "API Call / Submit", sublabel: "5.1 KB · Source Code", badge: "Allowed", alert: false },
        { type: "destination", label: "Gemini API (Google)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "sent" }, { label: "to" }] },
    matchedCondition: `Activity: API Post · Category: Generative AI (Gemini API) · Content: 5.1 KB matched "Confidential" — Source Code with embedded IP Addresses and Domain Names · Action: Allowed (sanctioned app, no PII)`,
    evidence: [
      "Agent: Code Reviewer sending code for review to sanctioned Gemini API",
      "Payload allowed — no PII detected, but source code contains internal IP addresses and domain names",
      "Risk: low but IP ranges and internal domains could be reconnaissance value if data is retained by Google",
      "Policy: currently 'Warn' not 'Block' for source code to sanctioned AI",
    ],
    rationale: "Source code containing internal infrastructure details (IPs, domains) sent to external AI APIs represents a low-level but persistent reconnaissance leakage. Even sanctioned providers may use data for model training.",
    action: [
      { text: "Allowed — policy review recommended." },
      { text: "Request Google confirm Gemini API's data retention and training opt-out policy." },
      { text: "Consider upgrading Code Reviewer to use a self-hosted AI code review model." },
    ] },
  {
    id: "FND-2024-4207", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Priya Nair", sublabel: "Contractor · External" },
        { type: "activity",    label: "Paste / Submit", sublabel: "1.7 KB · Customer PII", badge: "Blocked", alert: true },
        { type: "destination", label: "Gemini (Google)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (Gemini) · Content: 1.7 KB — Email Addresses (23), Personal Names, Company Names from customer dataset · Action: Blocked`,
    evidence: [
      "Contractor: Priya Nair (priya.nair@contractor.io) using Gemini for marketing analysis",
      "Payload: 23 customer records with email, name, and company — likely exported from CRM",
      "Even though Gemini is sanctioned, customer PII requires consent for AI processing",
    ],
    rationale: "Contractors using sanctioned AI tools with customer data still violate data processing policies unless explicit consent and a DPA cover the AI provider. Marketing-context PII is particularly sensitive for GDPR.",
    action: [
      { text: "Blocked — notify Priya Nair (priya.nair@contractor.io) and Marketing team lead." },
      { text: "Review contractor data access scope — should contractors have access to CRM-exported customer lists?" },
      { text: "Implement data classification label 'Customer PII — No AI' to prevent this category from reaching AI tools." },
    ] },
  {
    id: "FND-2024-4208", ruleId: "r-ex-04", severity: "Critical", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Data Classifier", sublabel: "AI Agent · Security" },
        { type: "activity",    label: "API Call / Submit", sublabel: "28 KB · Biometric Data", badge: "Blocked", alert: true },
        { type: "destination", label: "OpenAI API (GPT-4)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: API Post · Category: Generative AI (OpenAI API) · Content: 28 KB matched "Confidential" — Biometric Data, Medical Records, Personal Names (ml-training-data context) · Action: Blocked`,
    evidence: [
      "Agent: Data Classifier sending ml-training-data (s3) batch to OpenAI for classification assistance",
      "Payload: 28 KB including biometric data records and medical diagnoses",
      "GDPR Article 9 / CCPA: Biometric data is a special category — strict processing restrictions apply",
      "OpenAI is not an authorized processor for biometric or health data",
    ],
    rationale: "Biometric data is the most sensitive PII category under GDPR Article 9, requiring explicit consent and strict controller-processor agreements. Sending it to a general-purpose AI API without specific authorization is a serious violation.",
    action: [
      { text: "Blocked — file GDPR Article 9 incident report with Data Protection Officer." },
      { text: "Audit Data Classifier agent's access scope to s3 ml-training-data bucket." },
      { text: "Restrict agent access to biometric/health data — require human oversight for any AI processing of this data." },
      { text: "Engage DPO to assess if a Data Protection Impact Assessment (DPIA) is required." },
    ] },
  {
    id: "FND-2024-4209", ruleId: "r-ex-04", severity: "High", status: "Rescan",
    detectedAt: "6 days ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "activity",    label: "Paste / Submit", sublabel: "4.2 KB · DB Schema", badge: "Blocked", alert: true },
        { type: "destination", label: "Claude (Anthropic)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (Claude, unsanctioned) · Content: 4.2 KB — Source Code (SQL schema), IP Addresses, Private Keys (connection string) · Action: Blocked`,
    evidence: [
      "Alice Chen (alice.chen@company.com) pasting PostgreSQL schema + connection string to Claude for schema design help",
      "Schema contained: live DB connection string with password embedded",
      "Claude is not on the approved AI tools list",
    ],
    rationale: "Database schemas contain sensitive architectural information, and pasting live connection strings to unsanctioned AI is both a credential and data architecture exposure risk.",
    action: [
      { text: "Blocked — rotate the embedded PostgreSQL credentials." },
      { text: "Redirect Alice Chen to use approved AI tools (GitHub Copilot) for schema design work." },
      { text: "Block Claude.ai at the network level for corporate devices." },
    ] },
  {
    id: "FND-2024-4210", ruleId: "r-ex-04", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "activity",    label: "Paste / Submit", sublabel: "780 B · Analytics Data", badge: "Blocked", alert: true },
        { type: "destination", label: "Perplexity AI", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (Perplexity) · Content: 780 bytes — Personal Names, Email Addresses in analytics query result · Action: Blocked`,
    evidence: [
      "Brian Kowalski (brian.kowalski@company.com) pasting analytics query results to Perplexity for interpretation",
      "Result set included 15 user records with names and Email Addresses",
      "Perplexity is unsanctioned",
    ],
    rationale: "Analysts routinely paste query results into AI tools for help with interpretation, inadvertently including PII. This behavior pattern needs coaching rather than just blocking.",
    action: [
      { text: "Blocked — notify Brian Kowalski and Analytics team manager." },
      { text: "Conduct AI tool usage training for Analytics team." },
      { text: "Implement 'anonymize before AI' workflow: provide a one-click PII redaction tool in the BI platform." },
    ] },
  {
    id: "FND-2024-4211", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "8 days ago", lastSeenAt: "8 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "svc-backend-api", sublabel: "Service Account · Engineering" },
        { type: "activity",    label: "API Call / Submit", sublabel: "6.3 KB · User Records", badge: "Allowed", alert: true },
        { type: "destination", label: "OpenAI API", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "sent" }, { label: "to" }] },
    matchedCondition: `Activity: API Post · Category: Generative AI (OpenAI API) · Content: 6.3 KB — Email Addresses, Personal Names in user account context · Action: Allowed (policy gap — service account not covered)`,
    evidence: [
      "Service account: svc-backend-api making OpenAI API calls from production backend",
      "Including user PII in prompts for personalization features",
      "Policy gap: inline DLP did not cover service account traffic (only covered user sessions)",
    ],
    rationale: "Service accounts bypassing user-session DLP policies represent a systematic data exfiltration risk. Production backends sending PII to external AI APIs for personalization is a common GDPR Article 22 issue.",
    action: [
      { text: "Allowed — policy gap. Update CASB Inline policy to cover service account traffic." },
      { text: "Audit svc-backend-api's OpenAI API usage — enumerate all PII fields being sent." },
      { text: "Implement PII tokenization in the backend before any OpenAI API calls." },
      { text: "Add to next sprint: privacy review of AI-assisted personalization features." },
    ] },
  {
    id: "FND-2024-4212", ruleId: "r-ex-04", severity: "Critical", status: "Open",
    detectedAt: "9 days ago", lastSeenAt: "9 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "clinical-etl-svc", sublabel: "3rd Party App · External" },
        { type: "activity",    label: "API Call / Submit", sublabel: "41 KB · PHI Batch", badge: "Blocked", alert: true },
        { type: "destination", label: "OpenAI API (GPT-4)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: API Post (3rd Party App) · Category: Generative AI (OpenAI API) · Content: 41 KB — Medical Records, Healthcare IDs, Medical Diagnoses (HIPAA PHI) · Action: Blocked`,
    evidence: [
      "3rd party app 'clinical-etl-svc' attempting to batch-process PHI through OpenAI",
      "41 KB payload: 89 patient records with diagnoses, healthcare IDs, and treatment codes",
      "OpenAI is not a HIPAA Business Associate — no BAA in place",
      "HIPAA: sending PHI to non-BAA provider is a reportable breach",
    ],
    rationale: "This is the highest severity finding: a third-party clinical ETL service attempting to send 89 PHI records to a non-HIPAA-BAA AI provider. This is a mandatory HIPAA breach notification scenario.",
    action: [
      { text: "Blocked — initiate HIPAA Breach Notification Assessment within 24 hours." },
      { text: "Suspend clinical-etl-svc API access pending security review." },
      { text: "Notify Privacy Officer, Legal, and Compliance team immediately." },
      { text: "Engage OpenAI to confirm no data retention for the blocked request." },
      { text: "Review all 3rd party app API traffic for similar PHI patterns." },
    ] },
  {
    id: "FND-2024-4213", ruleId: "r-ex-04", severity: "High", status: "Open",
    detectedAt: "10 days ago", lastSeenAt: "10 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Threat Scanner", sublabel: "AI Agent · Security" },
        { type: "activity",    label: "API Call / Submit", sublabel: "9.2 KB · Log Data + IPs", badge: "Blocked", alert: true },
        { type: "destination", label: "OpenAI API (GPT-4)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: API Post (AI Agent) · Category: Generative AI · Content: 9.2 KB — IP Addresses (internal), MAC Addresses, Domain Names in security log context · Action: Blocked`,
    evidence: [
      "Threat Scanner agent submitting security log excerpts to OpenAI for threat analysis",
      "Logs contained: 47 internal IP addresses, 12 MAC addresses, internal domain names",
      "Security telemetry sent externally reveals network topology",
    ],
    rationale: "Security logs contain infrastructure reconnaissance data. Sending them to external AI providers reveals the internal network topology and active IP space — intelligence valuable to attackers.",
    action: [
      { text: "Blocked — provision Threat Scanner with an on-premise LLM for log analysis." },
      { text: "Redact IP addresses and MACs from log excerpts before any external AI call." },
      { text: "Consider Microsoft Sentinel AI or AWS Security Lake for SIEM-integrated AI analysis." },
    ] },
  {
    id: "FND-2024-4214", ruleId: "r-ex-04", severity: "Medium", status: "Closed",
    detectedAt: "11 days ago", lastSeenAt: "11 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Diana Reyes", sublabel: "SOC Lead · Security" },
        { type: "activity",    label: "Paste / Submit", sublabel: "560 B · Incident Notes", badge: "Warned", alert: false },
        { type: "destination", label: "Gemini (Google)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "attempted to send" }, { label: "to" }] },
    matchedCondition: `Activity: Post · Category: Generative AI (Gemini, sanctioned) · Content: 560 bytes — Personal Names, Email Addresses in incident ticket context · Action: Warned (not blocked — sanctioned app, low sensitivity threshold)`,
    evidence: [
      "Diana Reyes (diana.reyes@company.com) using Gemini to help write incident report narrative",
      "Paste contained 3 employee names and Email Addresses from the incident",
      "Policy: Warn (not block) for sanctioned AI + low-count PII",
    ],
    rationale: "Low-count PII in a sanctioned AI tool represents a policy grey area. The coaching opportunity is to train the user on anonymization rather than blocking and creating friction.",
    action: [
      { text: "Warned — acknowledged by user." },
      { text: "Provide Diana Reyes with a 'safe AI usage for security analysts' quick reference guide." },
      { text: "Review Gemini DPA — ensure it covers incident response data use case." },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-ex-09 through r-ex-16  (NEW batch — FND-2025-1100..1130)
  // ══════════════════════════════════════════════════════════════════════════
  // r-ex-09: Exfiltration of PII to Personal Webmail
  {
    id: "FND-2025-1100", ruleId: "r-ex-09", severity: "Critical", status: "Open",
    detectedAt: "30 minutes ago", lastSeenAt: "30 minutes ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal" },
        { type: "file",  label: "Q4_Payroll_Summary.xlsx", sublabel: "Bank Accounts + SSNs · 8.4 MB" },
        { type: "activity", label: "HTTP POST (Attachment)", sublabel: "8.4 MB · Payroll files", badge: "Blocked", alert: true },
        { type: "destination", label: "Gmail (Personal)", sublabel: "Webmail · Personal" },
      ],
      edges: [{ label: "attached" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to mail.google.com (personal Gmail) · User: Marcus Webb · Attachment: 8.4 MB — Bank Account Information, SSNs, Financial IDs (payroll files) · Action: Blocked",
    evidence: [
      "Marcus Webb emailing 8.4 MB to personal Gmail — payroll archive attachments",
      "Attachments: Q4_Payroll_Summary.xlsx, Bank_Account_Register.xlsx",
      "7th exfiltration vector in Marcus Webb insider threat timeline — now using webmail",
      "Blocked at SWG layer",
    ],
    rationale: "Personal webmail exfiltration is a last-resort fallback for determined insiders when other channels are blocked. This is the 7th distinct exfiltration method in the Marcus Webb investigation.",
    action: [
      { text: "Blocked — immediate account suspension: revoke all Marcus Webb credentials", remediationAction: "restrict-access" },
      { text: "Escalate to CISO and Legal — 7th exfiltration vector, suspension no longer optional", remediationAction: "legal-hold" },
      { text: "Block all webmail access (Gmail, Yahoo, Outlook.com) for Marcus Webb's device at SWG", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1101", ruleId: "r-ex-09", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal" },
        { type: "file",  label: "Customer_Contacts_Export.xlsx", sublabel: "Email + Phone + Company · 3.1 MB" },
        { type: "activity", label: "HTTP POST (Attachment)", sublabel: "3.1 MB · Customer list", badge: "Blocked", alert: true },
        { type: "destination", label: "Outlook.com (Personal)", sublabel: "Webmail · Personal" },
      ],
      edges: [{ label: "attached" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to outlook.live.com (personal Outlook) · User: Tom Harrington · Attachment: 3.1 MB — Email Addresses, Telephone Numbers, Company Names — customer contact list · Action: Blocked",
    evidence: [
      "Tom Harrington attaching customer contact list to personal Outlook.com email",
      "3.1 MB: CRM export — customer contacts in Excel format",
      "Multiple prior blocked Dropbox/ChatGPT attempts — now trying webmail",
    ],
    rationale: "Sales employee on PIP attempting to email customer contacts to personal webmail after cloud storage channels were blocked shows sophisticated multi-channel exfiltration behavior.",
    action: [
      { text: "Blocked — suspend Tom Harrington's account pending investigation", remediationAction: "restrict-access" },
      { text: "Block all personal webmail at SWG for Tom Harrington", remediationAction: "apply-dlp" },
      { text: "Preserve all blocked attempt logs for legal proceedings", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1102", ruleId: "r-ex-09", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Sarah Okonkwo", sublabel: "HR Director · Internal" },
        { type: "file",  label: "Employee_Benefits_Records.xlsx", sublabel: "SSNs + Healthcare IDs · 2.8 MB" },
        { type: "activity", label: "HTTP POST (Attachment)", sublabel: "2.8 MB · HR files", badge: "Blocked", alert: true },
        { type: "destination", label: "Yahoo Mail (Personal)", sublabel: "Webmail · Personal" },
      ],
      edges: [{ label: "attached" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to mail.yahoo.com · User: Sarah Okonkwo · Attachment: 2.8 MB — Social Security Numbers, Medical Records, Healthcare IDs — HR files · Action: Blocked",
    evidence: [
      "Sarah Okonkwo emailing HR files to personal Yahoo mail",
      "Files: employee benefits records with SSNs and Healthcare IDs",
      "Likely: working from home scenario — should use corporate remote access instead",
      "Policy: sending PHI to personal webmail is prohibited regardless of intent",
    ],
    rationale: "HR directors emailing PHI to personal webmail, even for legitimate work purposes, violates HIPAA minimum necessary standards. Once in personal email, the data cannot be governed or wiped.",
    action: [
      { text: "Blocked — notify Sarah Okonkwo and HR leadership", remediationAction: "apply-dlp" },
      { text: "Provision Sarah Okonkwo with VPN or corporate remote access for work-from-home scenarios" },
      { text: "Apply CASB DLP: block PHI (SSN + Healthcare ID combinations) in all personal webmail", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1103", ruleId: "r-ex-09", severity: "Medium", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "file",  label: "Monthly_Financial_KPI_Report.pdf", sublabel: "Financial IDs + SSNs · 450 KB" },
        { type: "activity", label: "HTTP POST (Attachment)", sublabel: "450 KB · Financial report", badge: "Blocked", alert: true },
        { type: "destination", label: "Gmail (Personal)", sublabel: "Webmail · Personal" },
      ],
      edges: [{ label: "attached" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: HTTP POST to mail.google.com · User: Rachel Torres · Attachment: 450 KB — Financial IDs, SSNs in monthly report · Action: Blocked",
    evidence: [
      "Rachel Torres emailing monthly financial report to personal Gmail",
      "Content: financial KPI report with embedded employee SSNs (reporting system artifact)",
      "Likely: sending to personal email for home review — common but prohibited",
    ],
    rationale: "Financial reports with embedded SSNs should never leave the corporate perimeter via personal webmail. The SSN presence is likely a system artifact that was not intentionally included.",
    action: [
      { text: "Blocked — notify Rachel Torres", remediationAction: "apply-dlp" },
      { text: "Remove SSN fields from standard financial KPI reports — SSNs should not appear in management reports" },
      { text: "Apply SWG DLP: block Financial IDs + SSN combination in webmail attachments", remediationAction: "apply-dlp" },
    ] },
  // r-ex-10: Sensitive Data Ingestion by Generative AI (new batch)
  {
    id: "FND-2025-1104", ruleId: "r-ex-10", severity: "Critical", status: "Open",
    detectedAt: "45 minutes ago", lastSeenAt: "45 minutes ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "file",  label: "patient_records_query_result.csv", sublabel: "PHI · 34 patient records · 4.8 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "4.8 KB · PHI", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Post to chat.openai.com · User: Brian Kowalski · Content: 4.8 KB — Medical Records, Healthcare IDs, SSNs (34 patient records) · Action: Blocked",
    evidence: [
      "Brian Kowalski pasting patient records to ChatGPT for data analysis assistance",
      "4.8 KB: 34 patient records with Medical Records, Healthcare IDs, SSNs",
      "Source: appears to be analytics query result from healthcare data warehouse",
      "HIPAA: submitting PHI to non-BAA AI provider is a reportable breach event",
    ],
    rationale: "34 patient records submitted to ChatGPT constitutes a potential HIPAA breach requiring HHS notification within 60 days. The unauthorized PHI disclosure to a non-BAA AI provider triggers mandatory reporting obligations.",
    action: [
      { text: "Blocked — initiate HIPAA Breach Notification Assessment immediately", remediationAction: "legal-hold" },
      { text: "Notify Privacy Officer, Legal, and Compliance team within 1 hour" },
      { text: "Restrict Brian Kowalski's access to healthcare data warehouse pending investigation", remediationAction: "restrict-access" },
      { text: "Apply DLP: block Medical Records + Healthcare ID combinations on all AI destinations", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1105", ruleId: "r-ex-10", severity: "High", status: "Open",
    detectedAt: "4 hours ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal" },
        { type: "file",  label: "customer_email_list.csv", sublabel: "Email Addresses + Company Names · 1.4 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "1.4 KB · Customer PII", badge: "Blocked", alert: true },
        { type: "destination", label: "Claude (Anthropic)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Post to claude.ai · User: Nina Vasquez · Content: 1.4 KB — Email Addresses (18 customer records), Company Names · Action: Blocked",
    evidence: [
      "Nina Vasquez pasting customer emails to Claude for subject line A/B test suggestions",
      "18 customer email addresses + company names",
      "Claude.ai is unsanctioned — fourth blocked AI submission for Nina Vasquez",
    ],
    rationale: "Persistent attempts to submit customer PII to unsanctioned AI tools despite repeated blocking indicate a training and behavior change issue. Escalation to management is warranted after the 4th incident.",
    action: [
      { text: "Blocked — mandatory manager escalation for Nina Vasquez (4th AI PII submission)", remediationAction: "apply-dlp" },
      { text: "Require formal policy acknowledgment from Nina Vasquez" },
      { text: "Consider temporary restriction of access to customer contact data for Nina Vasquez", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1106", ruleId: "r-ex-10", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "file",  label: "payroll_pivot_data.xlsx", sublabel: "Bank Accounts + Financial IDs · 2.7 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "2.7 KB · Financial PII", badge: "Blocked", alert: true },
        { type: "destination", label: "Gemini (Google)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Post to gemini.google.com · User: Rachel Torres · Content: 2.7 KB — Bank Account Information (9 values), Financial IDs — payroll data to sanctioned Gemini · Action: Blocked",
    evidence: [
      "Rachel Torres submitting payroll data to Gemini for pivot table formatting help",
      "9 bank account numbers embedded in the pasted data",
      "DLP blocked even though Gemini is sanctioned — bank account data is blocked on all AI destinations",
    ],
    rationale: "Bank account numbers must be blocked universally from AI tools regardless of sanctioning status. No AI provider has contractual authorization to process payment account credentials.",
    action: [
      { text: "Blocked — notify Rachel Torres of PCI-DSS prohibition on bank data in AI tools" },
      { text: "Provide Rachel Torres with a sanitized version of the pivot table template (no bank data)" },
    ] },
  {
    id: "FND-2025-1107", ruleId: "r-ex-10", severity: "Critical", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-clinical-analytics", sublabel: "Service Account · Healthcare" },
        { type: "file",  label: "patient_batch_127_records.json", sublabel: "PHI · 127 patient records · 52 KB" },
        { type: "activity", label: "API Call / Submit", sublabel: "52 KB · PHI Batch", badge: "Blocked", alert: true },
        { type: "destination", label: "ChatGPT (OpenAI)", sublabel: "Generative AI · Unsanctioned" },
      ],
      edges: [{ label: "submitted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: API Post (service account) · App: ChatGPT API (unsanctioned) · Content: 52 KB — Medical Records, Medical Diagnoses, Healthcare IDs (127 patient records) · Action: Blocked",
    evidence: [
      "Service account svc-clinical-analytics calling ChatGPT API with patient data batch",
      "52 KB: 127 patient records with diagnoses, treatment codes, healthcare IDs",
      "ChatGPT API: no HIPAA BAA — this is a mandatory HIPAA reportable incident",
      "Blocked at CASB Inline layer — service account traffic covered",
    ],
    rationale: "127 patient records attempted submission to a non-HIPAA-BAA AI provider is a critical HIPAA breach event. The service account suggests an automated system, making this a systematic rather than one-time incident.",
    action: [
      { text: "Blocked — initiate HIPAA Breach Notification Assessment (127 patients)", remediationAction: "legal-hold" },
      { text: "Suspend svc-clinical-analytics API access pending security review", remediationAction: "restrict-access" },
      { text: "Notify Privacy Officer, Legal, CISO within 1 hour" },
      { text: "Audit all service account OpenAI API calls for similar PHI patterns", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1108", ruleId: "r-ex-10", severity: "Medium", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal" },
        { type: "file",  label: "infra_design_notes.md", sublabel: "IP Addresses + Domain Names · 1.1 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "1.1 KB · Infra Details", badge: "Allowed", alert: false },
        { type: "destination", label: "Gemini (Google)", sublabel: "Generative AI · Sanctioned" },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Post to gemini.google.com · User: David Kim · Content: 1.1 KB — IP Addresses (internal), Domain Names in system design context · Action: Allowed (sanctioned app, no PII) — Policy: Warn",
    evidence: [
      "David Kim using Gemini for infrastructure design help — allowed but flagged",
      "Content: internal IP ranges (10.x.x.x, 172.x.x.x) and domain names",
      "No PII detected — infrastructure data only",
      "Policy: Warn (not block) for sanctioned AI + infrastructure data",
    ],
    rationale: "Infrastructure data (internal IPs, domain names) in sanctioned AI tools represents a low-level reconnaissance data exposure risk. Google's enterprise AI DPA covers this use case but retention policies should be confirmed.",
    action: [
      { text: "Allowed — no immediate action required" },
      { text: "Confirm Google Workspace enterprise AI data retention and non-training policy covers this usage" },
      { text: "Train David Kim to sanitize IP addresses before Gemini submissions", remediationAction: "apply-dlp" },
    ] },
  // r-ex-11: Sensitive Data Download to Unmanaged/BYOD Device
  {
    id: "FND-2025-1109", ruleId: "r-ex-11", severity: "Critical", status: "Open",
    detectedAt: "2 hours ago", lastSeenAt: "2 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal" },
        { type: "file",  label: "Finance_Reports_Archive.zip", sublabel: "Financial IDs + Bank Accounts · 4.2 GB" },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "4.2 GB · 203 files", badge: "HIGH VOLUME", alert: true },
        { type: "device", label: "BYOD-MacBook-MWebbPersonal", sublabel: "Unmanaged · BYOD" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Download to unmanaged device · User: Marcus Webb · Device: BYOD personal MacBook (not enrolled in MDM) · Volume: 4.2 GB (203 files) — Financial IDs, Bank Account Information · Action: Allowed (no MDM enforcement — policy gap)",
    evidence: [
      "Marcus Webb downloading 4.2 GB from SharePoint Finance Reports to personal MacBook",
      "Device: not enrolled in Intune MDM — BYOD policy gap allows download",
      "Files: financial models, payroll records, investor relations drafts",
      "CASB session: device fingerprint not matching any corporate-managed device",
    ],
    rationale: "Large-volume download to an unmanaged BYOD device by a high-risk user under active investigation is a critical data exfiltration event. Unmanaged devices cannot be wiped or audited by corporate IT.",
    action: [
      { text: "Revoke Marcus Webb's SharePoint access immediately", remediationAction: "revoke-company" },
      { text: "Block all corporate data access from unmanaged devices for Marcus Webb", remediationAction: "restrict-access" },
      { text: "Preserve CASB session logs and SharePoint audit trail under Legal Hold", remediationAction: "legal-hold" },
      { text: "Enforce MDM compliance: require Intune enrollment for all corporate data access", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1110", ruleId: "r-ex-11", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "file",  label: "Payroll_Archives_2023-2024.zip", sublabel: "Financial IDs + SSNs · 2.1 GB" },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "2.1 GB · Financial files", badge: "HIGH VOLUME", alert: true },
        { type: "device", label: "BYOD-Windows-RTorresHome", sublabel: "Unmanaged · BYOD" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Download to unmanaged device · User: Rachel Torres · Device: personal Windows PC (not MDM enrolled) · Volume: 2.1 GB — Financial IDs, SSNs · Action: Allowed (policy gap)",
    evidence: [
      "Rachel Torres downloading financial files to personal Windows PC at 11pm Saturday",
      "Device: not enrolled in corporate MDM",
      "Files: payroll archives, financial reports with SSNs",
      "Weekend off-hours access from personal device — UEBA anomaly",
    ],
    rationale: "Off-hours bulk download to an unmanaged personal device by a high-risk user is a significant insider threat indicator. The combination of BYOD, off-hours timing, and high-volume financial data warrants immediate response.",
    action: [
      { text: "Restrict Rachel Torres' download access to MDM-enrolled devices only", remediationAction: "restrict-access" },
      { text: "Apply conditional access policy: require compliant managed device for SharePoint Finance downloads", remediationAction: "apply-dlp" },
      { text: "Escalate UEBA alert for weekend off-hours BYOD download behavior" },
    ] },
  {
    id: "FND-2025-1111", ruleId: "r-ex-11", severity: "High", status: "Rescan",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "vendor-it@partner.io", sublabel: "External Vendor · IT Support" },
        { type: "file",  label: "network_config_bundle.tar.gz", sublabel: "Source Code + IP Addresses · 890 MB" },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "890 MB · Config files", badge: "HIGH VOLUME", alert: true },
        { type: "device", label: "Vendor-Laptop-Unmanaged", sublabel: "Unmanaged · BYOD" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Download to unmanaged device · External user: vendor-it@partner.io · Device: vendor-owned unmanaged laptop · Volume: 890 MB — Source Code, IP Addresses in config files · Action: Allowed (vendor gap)",
    evidence: [
      "Vendor IT support account downloading configuration files to vendor-owned unmanaged laptop",
      "890 MB: network configuration files, server setup scripts, IP address documentation",
      "Vendor device: not enrolled in corporate MDM — vendor policy gap",
    ],
    rationale: "Vendor-owned unmanaged devices accessing corporate configuration data create supply chain data leakage risk. Vendor laptop security posture is unknown and cannot be verified.",
    action: [
      { text: "Require vendor-it@partner.io to use corporate-provided VDI session for all sensitive file access", remediationAction: "restrict-access" },
      { text: "Apply CASB policy: block downloads to unmanaged devices for all vendor accounts", remediationAction: "apply-dlp" },
      { text: "Review vendor IT access scope — configuration files should not be downloadable by vendor IT", remediationAction: "revoke-external" },
    ] },
  {
    id: "FND-2025-1112", ruleId: "r-ex-11", severity: "Medium", status: "Open",
    detectedAt: "6 days ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal" },
        { type: "file",  label: "Campaign_Assets_Q4.zip", sublabel: "Customer Contacts · 340 MB" },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "340 MB · Marketing assets", badge: "Blocked", alert: true },
        { type: "device", label: "BYOD-iPad-NVasquez", sublabel: "Unmanaged · BYOD" },
      ],
      edges: [{ label: "attempted download" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Download to unmanaged device · User: Nina Vasquez · Device: personal iPad (not enrolled in MDM) · Content: Email Addresses, Company Names in marketing asset archives · Action: Blocked (MDM policy enforced post-UEBA alert)",
    evidence: [
      "Nina Vasquez attempting to download marketing assets to personal iPad",
      "340 MB: marketing campaign files, customer contact list included",
      "MDM policy applied after UEBA alert — download blocked",
    ],
    rationale: "Unmanaged iOS devices cannot be remotely wiped if the employee leaves or if the device is lost. Marketing asset archives with customer contacts need MDM-enforced download governance.",
    action: [
      { text: "Blocked — maintain MDM enforcement for Nina Vasquez's device access" },
      { text: "Offer to enroll personal iPad in MAM (Mobile App Management) for corporate data access" },
    ] },
  // r-ex-12: Sensitive Data Upload to Unsanctioned Cloud Storage
  {
    id: "FND-2025-1113", ruleId: "r-ex-12", severity: "High", status: "Open",
    detectedAt: "3 hours ago", lastSeenAt: "3 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal" },
        { type: "file",  label: "Customer_Contact_List.xlsx", sublabel: "Email + Phone + Company · 3.8 MB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "3.8 MB · Customer data", badge: "Blocked", alert: true },
        { type: "destination", label: "Dropbox (Free Tier)", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Upload to dropbox.com (consumer free tier) · User: Tom Harrington · Content: 3.8 MB — Email Addresses, Telephone Numbers, Company Names · Action: Blocked",
    evidence: [
      "Tom Harrington uploading customer contact list to Dropbox free tier account",
      "3.8 MB: 15,432 customer records",
      "Multiple prior blocked attempts via different channels",
    ],
    rationale: "Customer data uploaded to free-tier Dropbox cannot be governed, audited, or revoked. Free consumer cloud storage bypasses all corporate DRM controls.",
    action: [
      { text: "Blocked — suspend Tom Harrington account pending investigation", remediationAction: "restrict-access" },
      { text: "Block Dropbox consumer tier at SWG — only corporate Dropbox for Business allowed", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1114", ruleId: "r-ex-12", severity: "High", status: "Open",
    detectedAt: "5 hours ago", lastSeenAt: "5 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "file",  label: "data-pipeline-repo.zip", sublabel: "Source Code + API Keys · 6.1 MB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "6.1 MB · Source Code", badge: "Blocked", alert: true },
        { type: "destination", label: "Google Drive (Personal)", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Upload to drive.google.com (personal account) · User: Alice Chen · Content: 6.1 MB — Source Code, Private Keys · Action: Blocked",
    evidence: [
      "Alice Chen uploading code repository to personal Google Drive",
      "6.1 MB: Python codebase with embedded API keys",
      "Personal Google account — not corporate Google Workspace",
    ],
    rationale: "Source code with API keys uploaded to personal Google Drive cannot be recalled or audited. Engineers backing up code to personal cloud is a pervasive IP leakage problem.",
    action: [
      { text: "Blocked — notify Alice Chen and Engineering Director", remediationAction: "apply-dlp" },
      { text: "Rotate API keys found in payload", remediationAction: "delete" },
      { text: "Apply Google Workspace tenant restriction: block all personal Google accounts on corporate devices", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1115", ruleId: "r-ex-12", severity: "High", status: "Rescan",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "file",  label: "Finance_Archive_Q3.zip", sublabel: "Financial IDs + Bank Accounts · 1.2 MB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "1.2 MB · Financial", badge: "Blocked", alert: true },
        { type: "destination", label: "WeTransfer", sublabel: "File Transfer · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Upload to wetransfer.com · User: Rachel Torres · Content: 1.2 MB — Financial IDs, Bank Account Information · Action: Blocked",
    evidence: [
      "Rachel Torres uploading financial archive to WeTransfer",
      "WeTransfer links are publicly accessible without authentication by default",
      "Multiple upload attempts to unsanctioned storage this week",
    ],
    rationale: "WeTransfer transfers create unauthenticated download links that expire after a set period but are accessible to anyone who has the URL during that window.",
    action: [
      { text: "Blocked — block WeTransfer globally at SWG for Finance team", remediationAction: "apply-dlp" },
      { text: "Provide Finance team with a secure file transfer solution (corporate SharePoint direct link with authentication)", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1116", ruleId: "r-ex-12", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "file",  label: "customer_analytics_dataset.csv", sublabel: "Email Addresses + Personal Names · 2.4 MB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "2.4 MB · Analytics data", badge: "Blocked", alert: true },
        { type: "destination", label: "Mega.nz", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Upload to mega.nz · User: Brian Kowalski · Content: 2.4 MB — Email Addresses, Personal Names — analytics dataset · Action: Blocked",
    evidence: [
      "Brian Kowalski uploading analytics dataset to Mega.nz (end-to-end encrypted cloud storage)",
      "2.4 MB: customer analytics with Email Addresses and Personal Names",
      "Mega.nz: E2E encrypted storage inaccessible to law enforcement — popular with data theft actors",
    ],
    rationale: "Uploads to end-to-end encrypted cloud storage services like Mega.nz are particularly concerning because even with a court order, the data cannot be recovered from the provider.",
    action: [
      { text: "Blocked — notify Brian Kowalski's manager and Security Operations", remediationAction: "restrict-access" },
      { text: "Block Mega.nz and similar E2E-encrypted storage at SWG", remediationAction: "apply-dlp" },
      { text: "Investigate Brian Kowalski's intent — request explanation from manager" },
    ] },
  {
    id: "FND-2025-1117", ruleId: "r-ex-12", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal" },
        { type: "file",  label: "Q4_Campaign_Assets.zip", sublabel: "Email Addresses + Company Names · 890 KB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "890 KB · Campaign files", badge: "Blocked", alert: true },
        { type: "destination", label: "Box Personal (Free)", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Upload to box.com (consumer free account) · User: Nina Vasquez · Content: 890 KB — Email Addresses, Company Names in campaign files · Action: Blocked",
    evidence: [
      "Nina Vasquez uploading campaign files to personal Box free account",
      "Campaign files include customer email addresses",
      "Corporate Box for Business is available — should use that instead",
    ],
    rationale: "Consumer cloud storage uploads by marketing employees with customer data bypass corporate DLP and sharing controls available in the corporate Box instance.",
    action: [
      { text: "Blocked — redirect Nina Vasquez to use corporate Box for Business", remediationAction: "apply-dlp" },
      { text: "Block box.com consumer access — allow only corporate Box for Business tenant", remediationAction: "apply-dlp" },
    ] },
  // r-ex-13: Source Code Leakage to Public Repositories
  {
    id: "FND-2025-1118", ruleId: "r-ex-13", severity: "Critical", status: "Open",
    detectedAt: "1 hour ago", lastSeenAt: "1 hour ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "file",  label: "data-pipeline/src/", sublabel: "Source Code + Private Keys · 8.4 MB" },
        { type: "activity", label: "Git Push", sublabel: "8.4 MB · Source Code + Keys", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub.com (Public)", sublabel: "Source Control · Public" },
      ],
      edges: [{ label: "pushed" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Git push to github.com public repository · User: Alice Chen · Content: 8.4 MB — Source Code, Private Keys (3), AWS Access Keys (2) · Action: Blocked",
    evidence: [
      "Alice Chen attempting to push full data pipeline codebase to public GitHub repository",
      "8.4 MB: Python data pipeline code with hardcoded credentials in 3 files",
      "3 SSH private keys, 2 AWS Access Key pairs embedded in code",
      "Repository: alice-chen-portfolio/data-pipeline-public (intended as portfolio repo)",
    ],
    rationale: "Engineers pushing code with production credentials to public GitHub repositories for portfolio purposes is a common and catastrophic mistake. Public repositories are immediately indexed by credential scrapers.",
    action: [
      { text: "Blocked — rotate all 5 credentials in the blocked payload immediately", remediationAction: "delete" },
      { text: "Notify Alice Chen — code must be sanitized before any public repository publication", remediationAction: "apply-dlp" },
      { text: "Apply pre-commit hooks with git-secrets for all developer workstations" },
      { text: "Block github.com personal account pushes from corporate devices — only GitHub Enterprise allowed", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1119", ruleId: "r-ex-13", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal" },
        { type: "file",  label: "microservices-core/", sublabel: "Source Code + Internal IPs · 3.2 MB" },
        { type: "activity", label: "Git Push", sublabel: "3.2 MB · Core Services", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub.com (Public)", sublabel: "Source Control · Public" },
      ],
      edges: [{ label: "pushed" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Git push to github.com (personal public repo david-kim-dev/microservices-showcase) · User: David Kim · Content: 3.2 MB — Source Code with IP Addresses, internal domain names · Action: Blocked",
    evidence: [
      "David Kim pushing microservices code to public GitHub showcase repository",
      "Code contains: internal IP addresses, API gateway URLs, internal domain names",
      "David Kim recently transferred to affiliate — may be building public portfolio",
    ],
    rationale: "Source code containing internal IP addresses and API endpoints pushed to public repositories provides network reconnaissance data to attackers scanning GitHub for infrastructure intelligence.",
    action: [
      { text: "Blocked — notify David Kim and manager", remediationAction: "apply-dlp" },
      { text: "Review what David Kim intends to publish — provide sanitized code sharing guidance" },
      { text: "Block GitHub.com personal account pushes from corporate network", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1120", ruleId: "r-ex-13", severity: "High", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-devops-build", sublabel: "Service Account · DevOps" },
        { type: "file",  label: "ci-config/terraform/", sublabel: "CI/CD Config + Credentials · 12 MB" },
        { type: "activity", label: "Git Push", sublabel: "12 MB · CI/CD Config", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub.com (Public)", sublabel: "Source Control · Public" },
      ],
      edges: [{ label: "pushed" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Git push (service account) to github.com public repository · Content: 12 MB — CI/CD config with Private Keys, Passwords, AWS credentials · Action: Blocked",
    evidence: [
      "CI/CD service account attempting to mirror CI configuration to public GitHub",
      "12 MB: Jenkinsfile, .gitlab-ci.yml, terraform configs — all containing credentials",
      "Appears to be misconfigured CI pipeline mirroring to wrong repository",
    ],
    rationale: "A CI/CD service account pushing pipeline configuration with embedded credentials to a public repository is a systemic credential exposure risk. This suggests a misconfigured pipeline mirroring job.",
    action: [
      { text: "Blocked — audit CI/CD pipeline configuration to find the misconfigured mirror job", remediationAction: "restrict-access" },
      { text: "Rotate all credentials found in the blocked push payload", remediationAction: "delete" },
      { text: "Disable pipeline mirroring to github.com — only GitHub Enterprise allowed", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1121", ruleId: "r-ex-13", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "file",  label: "analytics_queries.sql", sublabel: "SQL Scripts + Schema · 1.4 MB" },
        { type: "activity", label: "Git Push", sublabel: "1.4 MB · Analytics Scripts", badge: "Blocked", alert: true },
        { type: "destination", label: "GitHub.com (Public)", sublabel: "Source Control · Public" },
      ],
      edges: [{ label: "pushed" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Git push to public GitHub · User: Brian Kowalski · Content: 1.4 MB — SQL scripts with Company Names, internal table schema · Action: Blocked",
    evidence: [
      "Brian Kowalski pushing SQL analytics scripts to personal public GitHub",
      "Scripts contain: internal table names, company-specific business logic, client company name references",
      "No credentials detected — business logic and schema exposure concern",
    ],
    rationale: "Internal business logic and schema details in public repositories provide competitive intelligence and facilitate targeted SQL injection attacks against the production environment.",
    action: [
      { text: "Blocked — notify Brian Kowalski to sanitize scripts before public publication" },
      { text: "Apply GitHub Enterprise DLP: block pushes containing internal schema/table name patterns to public repos", remediationAction: "apply-dlp" },
    ] },
  // r-ex-14: Source Code Shared with Risky GenAI Apps
  {
    id: "FND-2025-1122", ruleId: "r-ex-14", severity: "High", status: "Open",
    detectedAt: "4 hours ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Data" },
        { type: "file",  label: "db_connector.py", sublabel: "Source Code + Private Keys · 5.8 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "5.8 KB · Source Code", badge: "Blocked", alert: true },
        { type: "destination", label: "FreeCodeAI.io", sublabel: "Generative AI · Low-CCI", alert: true },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Post to FreeCodeAI.io (CCI: 14/100 — Low Trust) · User: Alice Chen · Content: 5.8 KB — Source Code with Private Keys, database connection strings · Action: Blocked (Low-CCI GenAI)",
    evidence: [
      "Alice Chen pasting production Python code to FreeCodeAI.io — low-CCI (14/100) AI tool",
      "Code contains: database connection strings, private keys",
      "CCI: 14/100 — no data processing agreement, no enterprise security controls, unknown data retention",
    ],
    rationale: "Low-CCI AI tools have no contractual data protection obligations. Source code with production credentials submitted to a CCI-14 AI service could be retained, used for model training, or exposed in data breaches.",
    action: [
      { text: "Blocked — notify Alice Chen to use only approved AI tools (GitHub Copilot)", remediationAction: "apply-dlp" },
      { text: "Apply CASB policy: block all AI tool access with CCI < 50", remediationAction: "apply-dlp" },
      { text: "Rotate credentials in the blocked source code payload" },
    ] },
  {
    id: "FND-2025-1123", ruleId: "r-ex-14", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal" },
        { type: "file",  label: "api_gateway_routes.ts", sublabel: "Source Code + Internal IPs · 7.2 KB" },
        { type: "activity", label: "HTTP POST (Paste)", sublabel: "7.2 KB · Source Code", badge: "Blocked", alert: true },
        { type: "destination", label: "AskCode.ai", sublabel: "Generative AI · Low-CCI", alert: true },
      ],
      edges: [{ label: "pasted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: Post to askcode.ai (CCI: 22/100) · User: David Kim · Content: 7.2 KB — Source Code, IP Addresses, API endpoint definitions · Action: Blocked",
    evidence: [
      "David Kim using unvetted AI code assistant (CCI: 22/100)",
      "Pasted: microservices code with internal API endpoints and IP addresses",
      "AskCode.ai: no enterprise agreement, no data retention policy disclosed",
    ],
    rationale: "Internal API definitions and IP addresses in a CCI-22 AI tool represent persistent infrastructure intelligence leakage risk. Unvetted AI services may use submitted code for model training.",
    action: [
      { text: "Blocked — redirect David Kim to GitHub Copilot (approved, CCI: 85)", remediationAction: "apply-dlp" },
      { text: "Block AskCode.ai at network level", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1124", ruleId: "r-ex-14", severity: "Medium", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-code-review", sublabel: "Service Account · Engineering" },
        { type: "file",  label: "pull_request_diff.patch", sublabel: "Source Code + Domain Names · 9.1 KB" },
        { type: "activity", label: "API Call / Submit", sublabel: "9.1 KB · Source Code", badge: "Allowed", alert: false },
        { type: "destination", label: "WizardCoder API", sublabel: "Generative AI · Low-CCI", alert: true },
      ],
      edges: [{ label: "submitted" }, { label: "via" }, { label: "to" }] },
    matchedCondition: "Activity: API Post to WizardCoder API (CCI: 31/100) · Service account: svc-code-review · Content: 9.1 KB — Source Code, internal domain names · Action: Allowed (policy gap — service account AI traffic not covered)",
    evidence: [
      "Service account svc-code-review making automated code review API calls to WizardCoder (CCI: 31/100)",
      "9.1 KB of source code per request — automated batch pattern",
      "Policy gap: CASB Inline AI policy did not cover service account API traffic to CCI < 50 tools",
    ],
    rationale: "Service accounts using low-CCI AI tools for automated code review create persistent systematic source code exfiltration at scale. Even CCI-31 tools have no contractual obligation to protect submitted code.",
    action: [
      { text: "Allowed (policy gap) — block WizardCoder API endpoint at network level", remediationAction: "apply-dlp" },
      { text: "Migrate svc-code-review to use an approved self-hosted code review AI or GitHub Copilot enterprise API" },
      { text: "Update CASB policy to cover service account API traffic to AI tools", remediationAction: "apply-dlp" },
    ] },
  // r-ex-15: Sensitive Data Transfer via Anonymizers/Tor
  {
    id: "FND-2025-1125", ruleId: "r-ex-15", severity: "Critical", status: "Open",
    detectedAt: "20 minutes ago", lastSeenAt: "20 minutes ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal" },
        { type: "file",  label: "Finance_Export_Q4.zip", sublabel: "Financial IDs + Bank Accounts · 3.4 MB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "3.4 MB · Financial data", badge: "Blocked", alert: true },
        { type: "destination", label: "Tor Network Exit Node", sublabel: "Anonymizer · Tor" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "anonymizer" }] },
    matchedCondition: "Activity: HTTP POST through Tor exit node · User: Marcus Webb · Destination: unknown (Tor anonymized) · Content: 3.4 MB — Financial IDs, Bank Account Information · Action: Blocked",
    evidence: [
      "Marcus Webb routing traffic through Tor network on corporate device",
      "Payload: 3.4 MB financial data uploaded via Tor exit node — destination unknown",
      "Tor usage on corporate network is a definitive policy violation and insider threat indicator",
      "8th indicator in Marcus Webb insider threat timeline",
    ],
    rationale: "Tor usage on a corporate device to transfer financial data is the most extreme insider threat indicator. Tor anonymizes the destination, preventing audit trail completion. This requires immediate suspension.",
    action: [
      { text: "Blocked — immediate network and account suspension: P0 Insider Threat confirmed", remediationAction: "restrict-access" },
      { text: "Preserve all forensic evidence under Legal Hold — coordinate with Law Enforcement if warranted", remediationAction: "legal-hold" },
      { text: "Engage External Counsel and CISO immediately" },
      { text: "Block Tor exit nodes and known anonymizer IPs at network firewall", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1126", ruleId: "r-ex-15", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal" },
        { type: "file",  label: "CRM_Customer_Export.csv", sublabel: "Email + Phone · 1.8 MB" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "1.8 MB · CRM data", badge: "Blocked", alert: true },
        { type: "destination", label: "VPN Anonymizer (Mullvad)", sublabel: "Anonymizer · VPN" },
      ],
      edges: [{ label: "uploaded" }, { label: "via" }, { label: "anonymizer" }] },
    matchedCondition: "Activity: HTTP POST through Mullvad VPN (consumer anonymizing VPN) · User: Tom Harrington · Content: 1.8 MB — Email Addresses, Telephone Numbers (CRM data) · Action: Blocked",
    evidence: [
      "Tom Harrington routing upload through Mullvad consumer VPN on corporate device",
      "Mullvad is a no-logs consumer VPN — destination anonymized",
      "Payload: CRM customer data upload attempt",
    ],
    rationale: "Using a consumer anonymizing VPN to bypass corporate SWG inspection while uploading customer data is deliberate evasion of data loss prevention controls.",
    action: [
      { text: "Blocked — escalate insider threat investigation for Tom Harrington", remediationAction: "legal-hold" },
      { text: "Suspend Tom Harrington's account — Tor/VPN evasion combined with PIP context warrants suspension", remediationAction: "restrict-access" },
      { text: "Block consumer VPN services and Tor at corporate firewall", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1127", ruleId: "r-ex-15", severity: "Medium", status: "Rescan",
    detectedAt: "1 week ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "unknown-device-1a2b3c", sublabel: "Unknown Device · Unmanaged" },
        { type: "file",  label: "unknown_payload.bin", sublabel: "Obfuscated content · 670 MB" },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "670 MB · Unknown content", badge: "Blocked", alert: true },
        { type: "destination", label: "ProxyServer (Proxify)", sublabel: "Anonymizer · Web Proxy" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "proxy" }] },
    matchedCondition: "Activity: HTTP traffic routed through Proxify.io web proxy · Device: unknown unmanaged device on corporate Wi-Fi · Content: 670 MB download — content type unknown (proxy obfuscation) · Action: Blocked",
    evidence: [
      "Unknown unmanaged device on corporate Wi-Fi routing traffic through Proxify.io web proxy",
      "670 MB download — content cannot be inspected (proxy obfuscation)",
      "Device: MAC address not in corporate MDM or asset inventory",
      "Physical security: access from conference room Wi-Fi zone",
    ],
    rationale: "An unknown unmanaged device using a web proxy to download 670 MB on the corporate network represents an unauthorized network intrusion risk. The device may be a physical threat actor device.",
    action: [
      { text: "Block device MAC address from corporate network immediately", remediationAction: "restrict-access" },
      { text: "Review physical access logs for conference room zone to identify who brought this device" },
      { text: "Block Proxify.io and similar web proxies at network firewall", remediationAction: "apply-dlp" },
      { text: "Enable 802.1X network access control to require device authentication on corporate Wi-Fi", remediationAction: "apply-dlp" },
    ] },
  // r-ex-16: Malicious File Downloaded from Uncategorized Site
  {
    id: "FND-2025-1128", ruleId: "r-ex-16", severity: "Critical", status: "Open",
    detectedAt: "15 minutes ago", lastSeenAt: "15 minutes ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "file",  label: "DataAnalyticsTool.exe", sublabel: "Trojan.GenericKD · 2.4 MB", alert: true },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "2.4 MB · Executable", badge: "MALWARE", alert: true },
        { type: "destination", label: "xn--data-analytics-tools-q5a.net", sublabel: "Uncategorized Site · Unknown" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "from" }] },
    matchedCondition: "Activity: Download from uncategorized site (CCI: N/A) · User: Brian Kowalski · File: DataAnalyticsTool.exe (2.4 MB) · Threat: Trojan.GenericKD detected by AV (VirusTotal: 31/72) · Action: Blocked",
    evidence: [
      "Brian Kowalski downloading .exe from newly registered domain (7 days old): xn--data-analytics-tools-q5a.net",
      "File: DataAnalyticsTool.exe — AV scan: Trojan.GenericKD (31/72 VirusTotal engines)",
      "Domain characteristics: IDN homograph attack, registered 7 days ago, no categorization",
      "Blocked at SWG before file reached device",
    ],
    rationale: "A trojan disguised as a data analytics tool targeted at an analytics employee from a typosquatting domain is a highly targeted spear phishing attack. 31/72 AV engines detecting this file indicates a known threat family.",
    action: [
      { text: "Blocked — quarantine any related downloads on Brian Kowalski's device", remediationAction: "quarantine" },
      { text: "Block domain xn--data-analytics-tools-q5a.net at all network layers", remediationAction: "apply-dlp" },
      { text: "Notify SOC team — targeted malware delivery attempt requires incident response" },
      { text: "Provide security awareness coaching to Brian Kowalski on homograph domain attacks" },
    ] },
  {
    id: "FND-2025-1129", ruleId: "r-ex-16", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "file",  label: "Invoice_Q4_2024.pdf", sublabel: "Malicious JavaScript + Macro · 890 KB", alert: true },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "890 KB · PDF + Macro", badge: "MALWARE", alert: true },
        { type: "destination", label: "invoice-portal-2024.biz", sublabel: "Uncategorized Site · Suspicious" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "from" }] },
    matchedCondition: "Activity: Download from uncategorized site · User: Rachel Torres · File: Invoice_Q4_2024.pdf (890 KB) · Threat: Macro malware embedded — PDF with malicious JavaScript · Action: Blocked + Sandboxed",
    evidence: [
      "Rachel Torres downloading invoice PDF from suspicious domain (invoice-portal-2024.biz, 3 days old)",
      "PDF contained: embedded JavaScript and macro payload — sandbox detonation confirmed malicious behavior",
      "Behavior: attempted to execute PowerShell command to establish C2 connection",
      "Finance employees are common targets for invoice-themed spear phishing",
    ],
    rationale: "Invoice-themed PDF malware targeting finance employees is a classic spear phishing vector for financial fraud (Business Email Compromise). The macro attempted to establish a command-and-control connection.",
    action: [
      { text: "Blocked — perform endpoint scan on Rachel Torres' device for persistence artifacts", remediationAction: "quarantine" },
      { text: "Block domain invoice-portal-2024.biz across all corporate DNS", remediationAction: "apply-dlp" },
      { text: "Notify SOC — invoice BEC campaign may be targeting other Finance employees" },
    ] },
  {
    id: "FND-2025-1130", ruleId: "r-ex-16", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal" },
        { type: "file",  label: "MarketingPack_Pro_2024_Free.msi", sublabel: "PUA.Adware.Downloader · 1.2 MB", alert: true },
        { type: "activity", label: "HTTP GET (Download)", sublabel: "1.2 MB · Installer", badge: "MALWARE", alert: true },
        { type: "destination", label: "free-marketing-assets.io", sublabel: "Uncategorized Site · Unknown" },
      ],
      edges: [{ label: "downloaded" }, { label: "via" }, { label: "from" }] },
    matchedCondition: "Activity: Download from uncategorized site · User: Nina Vasquez · File: MarketingPack_Pro_2024_Free.msi (1.2 MB) · Threat: PUA.Adware.Downloader + suspected data harvesting DLL · Action: Blocked",
    evidence: [
      "Nina Vasquez downloading free marketing asset pack from unvetted site",
      "MSI installer: PUA detected + DLL with network exfiltration behavior in sandbox",
      "DLL attempted: access to browser credential stores and marketing data directories",
    ],
    rationale: "Potentially unwanted applications targeting marketing employees' credential stores and marketing data directories suggest a data harvesting attack. Marketing data (customer lists) is valuable to cybercriminals.",
    action: [
      { text: "Blocked — perform endpoint scan on Nina Vasquez's device", remediationAction: "quarantine" },
      { text: "Block free-marketing-assets.io at DNS and firewall", remediationAction: "apply-dlp" },
      { text: "Provide security coaching: free software from uncategorized sites requires IT vetting" },
    ] },


  // ══════════════════════════════════════════════════════════════════════════
  //  r-st-01 through r-cg-05  (NEW batch — FND-2025-1131..1159)
  // ══════════════════════════════════════════════════════════════════════════
  // r-st-01: Stale Sensitive Data Retained Beyond 1 Year (DSPM+CASB API HYBRID)
  {
    id: "FND-2025-1131", ruleId: "r-st-01", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Employee_PII_Archive_2021/", sublabel: "Stale · Last Accessed: 420 days ago", badge: "420 days stale", alert: true },
      ],
      edges: [{ label: "contains stale data" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · Files: last accessed 420 days ago · Content: Social Security Numbers, Medical Records, Healthcare IDs · Retention policy: none applied",
    evidence: [
      "Folder: Employee_PII_Archive_2021/ — 89 files, last accessed 420 days ago",
      "Content: 2021 employee PII records with SSNs, Medical Records, Healthcare IDs",
      "No retention policy — files persisted indefinitely",
      "GDPR Article 5(1)(e): storage limitation principle requires deletion when no longer necessary",
    ],
    rationale: "PII archives retained 420 days beyond last access with no retention policy violate GDPR storage limitation principles. Every additional day of unnecessary retention extends legal liability.",
    action: [
      { text: "Apply Legal Hold assessment — verify no litigation or regulatory requirement to retain", remediationAction: "legal-hold" },
      { text: "Delete Employee_PII_Archive_2021/ if no retention obligation", remediationAction: "delete" },
      { text: "Apply Google Drive retention policy: auto-delete HR PII files after 2 years from last access", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1132", ruleId: "r-st-01", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "file",  label: "customer-exports-2022/", sublabel: "Stale · Last Accessed: 540 days ago", badge: "540 days stale", alert: true },
      ],
      edges: [{ label: "contains stale data" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/customer-exports-2022/) · Objects: last accessed 540 days ago · Content: Email Addresses, Personal Names, Postal Addresses — 45,000 customer records · S3 Lifecycle: none on prefix",
    evidence: [
      "S3 prefix: customer-exports-2022/ — 234 objects (8.4 GB), last accessed 540 days ago",
      "Customer records: 45,000 records with full PII across all files",
      "S3 Lifecycle policy: not applied to /customer-exports-2022/ prefix",
      "Last Accessed: 540 days ago (CloudTrail + S3 Access Logs confirm)",
    ],
    rationale: "Customer export data retained 540 days beyond last access creates CCPA deletion right exposure. Any customer requesting data deletion requires locating and deleting these exports.",
    action: [
      { text: "Delete all 234 objects in customer-exports-2022/ prefix", remediationAction: "delete" },
      { text: "Apply S3 Lifecycle: auto-expire /customer-exports-*/ prefixes after 365 days", remediationAction: "apply-dlp" },
      { text: "Implement DSAR (Data Subject Access Request) lookup index before deletion", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1133", ruleId: "r-st-01", severity: "Medium", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
        { type: "file",  label: "Payroll_Archive_2020_2021/", sublabel: "Stale · Last Accessed: 730 days ago", badge: "730 days stale", alert: true },
      ],
      edges: [{ label: "contains stale data" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · Files: last accessed 730 days ago · Content: Bank Account Information, SSNs, Financial IDs — payroll archive · No retention policy",
    evidence: [
      "Folder: Payroll_Archive_2020_2021/ — 47 files, last accessed 730 days ago (2 years)",
      "Payroll records: 412 employees with Bank Account Numbers and SSNs",
      "Statutory retention: payroll records typically 7 years — but should be archived not SharePoint-resident",
    ],
    rationale: "Payroll archives on SharePoint with 2 years of no access should be migrated to secure long-term archive storage, not left on a broadly-accessible SaaS platform with no expiry governance.",
    action: [
      { text: "Migrate Payroll_Archive_2020_2021/ to encrypted long-term archive (e.g., Azure Archive, Glacier)", remediationAction: "restrict-access" },
      { text: "Apply SharePoint retention policy: auto-archive financial documents after 2 years of inactivity", remediationAction: "apply-dlp" },
      { text: "Delete from SharePoint after confirming archive migration is complete", remediationAction: "delete" },
    ] },
  {
    id: "FND-2025-1134", ruleId: "r-st-01", severity: "High", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-configs", sublabel: "Azure Blob · dev-configs" },
        { type: "file",  label: "test-data-snapshots-2021/", sublabel: "Stale · Last Accessed: 890 days ago", badge: "890 days stale", alert: true },
      ],
      edges: [{ label: "contains stale data" }] },
    matchedCondition: "App: Azure Blob Storage (dev-configs) · Blobs: last accessed 890 days ago · Content: Personal Names, Email Addresses, Medical Records in test data snapshots · 47 blobs (22 GB)",
    evidence: [
      "Path: dev-configs/test-data-snapshots-2021/ — 47 blobs (22 GB), last accessed 890 days ago",
      "Test data seeded from production: Personal Names, Email Addresses, Medical Records",
      "Azure Blob Lifecycle: not configured on dev-configs container",
    ],
    rationale: "Production-seeded test data retained for 890 days in development storage violates GDPR data minimization. Test environments should use synthetic data, not production PII/PHI.",
    action: [
      { text: "Delete all 47 blobs in test-data-snapshots-2021/", remediationAction: "delete" },
      { text: "Apply Azure Blob Lifecycle: delete blobs in dev-configs older than 180 days", remediationAction: "apply-dlp" },
      { text: "Mandate synthetic data for all future test environments", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1135", ruleId: "r-st-01", severity: "Medium", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "acme-corp.sharepoint.com/hr", sublabel: "SharePoint · acme-corp.sharepoint.com/hr" },
        { type: "file",  label: "Exit_Interview_Batch_2020/", sublabel: "Stale · Last Accessed: 1,100 days ago", badge: "1,100 days stale", alert: true },
      ],
      edges: [{ label: "contains stale data" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/hr) · Files: last accessed 1,100 days ago (3+ years) · Content: Personal Names, Email Addresses, SSNs in 2020 exit interviews · No retention policy",
    evidence: [
      "Exit interview records from 2020 — last accessed 1,100 days ago",
      "89 exit interview files: SSNs, home addresses, personal email addresses of former employees",
      "GDPR: former employee data must be deleted after legitimate purpose expires (typically 1-2 years)",
    ],
    rationale: "Former employee PII retained 3+ years beyond termination violates GDPR data retention limits. Exit interview data serves a brief HR purpose and has no ongoing legitimate processing basis after 1-2 years.",
    action: [
      { text: "Delete Exit_Interview_Batch_2020/ pending legal hold assessment", remediationAction: "delete" },
      { text: "Apply SharePoint auto-delete policy: exit interview files expire 2 years after creation", remediationAction: "apply-dlp" },
    ] },
  // r-st-02: Ghost Database with Sensitive Data
  {
    id: "FND-2025-1136", ruleId: "r-st-02", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "store", label: "analytics-db-legacy", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Connections: 0 for 67 days", sublabel: "RDS PostgreSQL · No active connections", badge: "GHOST DB", alert: true },
      ],
      edges: [{ label: "has no connections" }] },
    matchedCondition: "App: AWS RDS (PostgreSQL) · Instance: analytics-db-legacy · Connections: 0 for 67 days · Instance running · Content: PII — 2.1M customer records, Personal Names, Email Addresses · Monthly cost: $340",
    evidence: [
      "RDS instance: analytics-db-legacy (PostgreSQL 11.x) — running but 0 connections for 67 days",
      "Database content: 2.1 million customer records with Personal Names, Email Addresses, Company Names",
      "Instance type: db.r5.large — $340/month running cost",
      "No application or user connecting — orphaned after analytics platform migration",
    ],
    rationale: "A running RDS instance with no connections for 67 days is both a financial waste and a security risk. 2.1 million customer records in an unmonitored database with no active consumers creates an ungoverned data store.",
    action: [
      { text: "Create final snapshot of analytics-db-legacy then delete the RDS instance", remediationAction: "delete" },
      { text: "Encrypt and store the snapshot in Glacier — apply 7-year retention policy if business data requires it" },
      { text: "Verify no application is unexpectedly dependent on analytics-db-legacy before deletion" },
      { text: "Apply AWS Config rule: alert on RDS instances with 0 connections for 30+ days", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1137", ruleId: "r-st-02", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-mysql-archive", sublabel: "Azure Blob · dev-configs" },
        { type: "config", label: "Connections: 0 for 90+ days", sublabel: "Azure SQL · No active connections", badge: "GHOST DB", alert: true },
      ],
      edges: [{ label: "has no connections" }] },
    matchedCondition: "App: Azure SQL Database · Server: dev-mysql-archive · Connections: 0 for 92 days · Content: Financial IDs, Bank Account Information, SSNs in dev database · Monthly cost: $180",
    evidence: [
      "Azure SQL Database: dev-mysql-archive — 0 connections for 92 days",
      "Developer database seeded with production financial data for testing purposes",
      "Content: Financial IDs, Bank Account Information, SSNs from dev population",
      "Monthly cost: $180 running unused",
    ],
    rationale: "A development database seeded with production financial data (Bank Account Information, SSNs) and unused for 92 days represents both a compliance violation (dev environments should not hold production PII) and wasted spend.",
    action: [
      { text: "Delete Azure SQL Database dev-mysql-archive after confirming no dependencies", remediationAction: "delete" },
      { text: "Scrub production PII from any future dev databases — use synthetic data only", remediationAction: "apply-dlp" },
      { text: "Apply Azure Policy: alert on SQL databases with 0 DTU utilization for 30+ days", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1138", ruleId: "r-st-02", severity: "Medium", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "reporting-db-old", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Connections: 0 for 45+ days", sublabel: "RDS MySQL · No active connections", badge: "GHOST DB", alert: true },
      ],
      edges: [{ label: "has no connections" }] },
    matchedCondition: "App: AWS RDS (MySQL) · Instance: reporting-db-old · Connections: 0 for 47 days · Content: Personal Names, Email Addresses, Company Names — reporting database · Cost: $220/month",
    evidence: [
      "RDS MySQL: reporting-db-old — 0 connections for 47 days since new reporting platform launched",
      "Previously used for marketing reporting — now replaced by Looker",
      "Content: customer names, email addresses, company data for 89,000 records",
    ],
    rationale: "Legacy reporting databases left running after platform migration create unnecessary PII exposure and ongoing cost. Customer data in an unmonitored database has no active data protection oversight.",
    action: [
      { text: "Create final snapshot then delete reporting-db-old RDS instance", remediationAction: "delete" },
      { text: "Migrate required historical data to Looker data source before deletion" },
      { text: "Tag all RDS instances with owning team and expected-deletion-date", remediationAction: "apply-dlp" },
    ] },
  // r-st-03: Proliferation of Duplicate Sensitive Data (new findings)
  {
    id: "FND-2025-1139", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "HR Confidential", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Employee_PII_Master_2024.xlsx", sublabel: "7 copies across drives", badge: "7 copies", alert: true },
      ],
      edges: [{ label: "duplicated across" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · File: Employee_PII_Master_2024.xlsx — 7 identical or near-identical copies detected across 4 different drives · Content: SSNs, Medical Records, Bank Account Information",
    evidence: [
      "Original: HR Confidential/Employee_PII_Master_2024.xlsx + 6 copies in other drives",
      "Copies found in: Engineering Shared Drive (2 copies), Legal Drive (1), Finance Drive (1), 2 personal drives",
      "Each copy may have different sharing permissions — creates uncontrolled exposure surface",
      "Total exposure: 7 versions of 1,204 employee SSNs, Medical Records, Bank data",
    ],
    rationale: "7 copies of a sensitive PII file across 4 drives with potentially different sharing permissions multiplies the exposure surface 7x. Data subject access and deletion requests must address all 7 copies.",
    action: [
      { text: "Delete 6 unauthorized copies — retain only the authoritative copy in HR Confidential", remediationAction: "delete" },
      { text: "Restrict remaining copy to HR leadership only", remediationAction: "restrict-access" },
      { text: "Apply DLP policy to prevent copying of HR PII files to non-HR drives", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1140", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
        { type: "file",  label: "Customer_Revenue_2024.xlsx", sublabel: "9 copies across sites", badge: "9 copies", alert: true },
      ],
      edges: [{ label: "duplicated across" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · File: Customer_Revenue_2024.xlsx — 9 copies detected · Content: Financial IDs, Company Names, revenue data — commercial-sensitive",
    evidence: [
      "Revenue by customer file copied 9 times across 6 SharePoint sites",
      "Copies in: Finance, Sales, Product, Legal, HR sites + personal OneDrives (2 copies)",
      "9 different sets of sharing permissions — some with external collaborators",
    ],
    rationale: "Customer revenue data proliferated across 9 copies with varying permissions creates uncontrolled commercial intelligence exposure. Some copies may be accessible to external parties who should not have this data.",
    action: [
      { text: "Audit all 9 copies for sharing permissions — revoke any external access", remediationAction: "revoke-external" },
      { text: "Delete 8 copies — retain authoritative copy in Finance Reports only", remediationAction: "delete" },
      { text: "Apply SharePoint policy: commercial-sensitive files require Sensitivity Label to control copying", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1141", ruleId: "r-st-03", severity: "Medium", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "acme-hr.google.com", sublabel: "Google Drive · acme-hr.google.com" },
        { type: "file",  label: "Benefits_Enrollment_2024.xlsx", sublabel: "12 copies across drives", badge: "12 copies", alert: true },
      ],
      edges: [{ label: "duplicated across" }] },
    matchedCondition: "App: Google Drive (acme-hr.google.com) · File: Benefits_Enrollment_2024.xlsx — 12 copies across 5 drives · Content: Social Security Numbers, Healthcare IDs, Medical Records",
    evidence: [
      "Benefits enrollment file copied 12 times — distributed for 'local reference' by HR BPs",
      "12 copies across: HR Confidential, 4 HRBP personal drives, Finance Drive, 3 manager personal drives, 3 other locations",
      "Healthcare IDs and SSNs for 1,204 employees in each copy",
    ],
    rationale: "12 copies of benefits enrollment data with PHI distributed to managers and HR BPs creates 12x the breach surface for 1,204 employees' protected health information.",
    action: [
      { text: "Delete 11 unauthorized copies — retain single copy in HR Confidential only", remediationAction: "delete" },
      { text: "Use Google Drive shared folder with granular permissions instead of distributing copies", remediationAction: "restrict-access" },
      { text: "Apply DLP: block copying of files containing Healthcare IDs outside HR-designated drives", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1142", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "file",  label: "customer-pii-export-v*.parquet", sublabel: "7 versions undeleted", badge: "7 copies", alert: true },
      ],
      edges: [{ label: "duplicated across" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/exports/) · Files: 7 versioned copies of customer-pii-export.parquet (v1-v7) · Content: Email Addresses, Personal Names, Postal Addresses — 45,000 customers each",
    evidence: [
      "S3 versioning enabled on prod-data-lake — 7 versions of customer PII export not deleted",
      "Each version: 45,000 customer records, 2.3 GB",
      "Total: 315,000 customer record-equivalents spread across 7 versions",
      "S3 versioning lifecycle: no expiry configured for old versions",
    ],
    rationale: "S3 versioning without lifecycle rules accumulates historical copies of PII files indefinitely. 7 versions of 45,000 customer records means DSAR deletion requires addressing all 7 versions, not just the latest.",
    action: [
      { text: "Delete versions v1-v6 of customer-pii-export.parquet via S3 version deletion", remediationAction: "delete" },
      { text: "Apply S3 Lifecycle: non-current object versions expire after 30 days on /exports/ prefix", remediationAction: "apply-dlp" },
      { text: "Implement DSAR process that includes S3 version cleanup", remediationAction: "restrict-access" },
    ] },
  // r-cg-01: Sensitive Data Stores Missing Encryption at Rest
  {
    id: "FND-2025-1143", ruleId: "r-cg-01", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Encryption = Disabled", sublabel: "S3 Default Encryption · Not configured", badge: "UNENCRYPTED", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · Config: Default Encryption = Disabled · Content: Medical Records, SSNs, Financial IDs — 847 objects · Compliance: HIPAA § 164.312(a)(2)(iv), PCI-DSS 3.4",
    evidence: [
      "Bucket: prod-data-lake — S3 Default Encryption not configured (objects stored unencrypted)",
      "Objects: 847 files containing PHI, SSNs, Financial IDs",
      "HIPAA § 164.312(a)(2)(iv): encryption of ePHI at rest is an addressable specification (de facto required)",
      "PCI-DSS 3.4: PAN (payment card data) must be encrypted at rest",
      "S3 Block Public Access: enabled — but unencrypted objects accessible to any IAM principal with S3GetObject",
    ],
    rationale: "Unencrypted S3 storage containing PHI and payment card data violates HIPAA and PCI-DSS requirements. Any AWS principal with S3GetObject access can read plaintext data without additional authentication.",
    action: [
      { text: "Enable S3 Default Encryption with SSE-KMS on prod-data-lake immediately", remediationAction: "apply-dlp" },
      { text: "Re-encrypt existing objects: aws s3 cp --sse aws:kms for all 847 objects" },
      { text: "Apply AWS Config rule: s3-bucket-server-side-encryption-enabled — trigger alert if encryption is disabled", remediationAction: "apply-dlp" },
      { text: "Notify Compliance team — HIPAA and PCI-DSS encryption gap requires incident logging" },
    ] },
  {
    id: "FND-2025-1144", ruleId: "r-cg-01", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "analytics-db-prod", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Encryption = Disabled", sublabel: "RDS Storage Encryption · Not enabled", badge: "UNENCRYPTED", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: AWS RDS (analytics-db-prod) · Config: Storage Encryption = Disabled · Content: 2.1M customer records with PII · Compliance: GDPR Article 32, PCI-DSS 3.4",
    evidence: [
      "RDS instance: analytics-db-prod — storage encryption disabled (requires snapshot encryption migration)",
      "Database: 2.1 million customer records with Personal Names, Email Addresses, Telephone Numbers",
      "RDS encryption cannot be enabled in-place — requires snapshot + restore workflow",
      "GDPR Article 32: encryption is a recommended security measure for personal data processing",
    ],
    rationale: "Unencrypted RDS storage containing 2.1 million customer records violates GDPR Article 32 security requirements. In an AWS account compromise scenario, disk snapshots of unencrypted RDS instances expose all customer data in plaintext.",
    action: [
      { text: "Create encrypted RDS snapshot → restore as new encrypted instance → migrate traffic → delete old instance", remediationAction: "apply-dlp" },
      { text: "Apply AWS Config rule: rds-storage-encrypted — alert on new unencrypted RDS instances", remediationAction: "apply-dlp" },
      { text: "Log GDPR Article 32 compliance gap in security register" },
    ] },
  {
    id: "FND-2025-1145", ruleId: "r-cg-01", severity: "High", status: "Rescan",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-configs", sublabel: "Azure Blob · dev-configs" },
        { type: "config", label: "Encryption = Disabled", sublabel: "Azure Blob · Microsoft-managed key only, no CMK", badge: "NO CMK", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: Azure Blob Storage (dev-configs) · Config: Customer-Managed Key (CMK) not configured — using Microsoft-managed keys only · Content: Source Code, Private Keys, test PII · Compliance: PCI-DSS 3.5 (key management)",
    evidence: [
      "Azure Blob: dev-configs — Microsoft-managed encryption at rest (default), no CMK",
      "PCI-DSS 3.5 requires cryptographic key management documentation and customer control",
      "If Microsoft rotates keys or there's a Microsoft-side breach, key management is outside corporate control",
      "Content includes Private Keys and configuration files with embedded credentials",
    ],
    rationale: "Microsoft-managed encryption keys for PCI-scoped data don't meet PCI-DSS 3.5 requirements for key management control. Customer-Managed Keys (CMK) provide auditability and revocability that Microsoft-managed keys don't.",
    action: [
      { text: "Migrate dev-configs to Customer-Managed Key encryption via Azure Key Vault", remediationAction: "apply-dlp" },
      { text: "Configure CMK rotation policy: 365-day auto-rotation" },
      { text: "Update PCI-DSS scope documentation to reflect CMK implementation" },
    ] },
  {
    id: "FND-2025-1146", ruleId: "r-cg-01", severity: "High", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "store", label: "reporting-db-legacy", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Encryption = Disabled", sublabel: "EBS Volume · EC2 RDS · Unencrypted", badge: "UNENCRYPTED", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: AWS EC2 (RDS on EC2) · EBS Volume: not encrypted · Content: Financial IDs, Company Names — legacy reporting database · Compliance: PCI-DSS 3.4",
    evidence: [
      "Legacy RDS on EC2 (pre-managed RDS migration): EBS volume encryption disabled",
      "Database: financial reporting data with Financial IDs and Company Names",
      "EBS snapshots can be shared across accounts — unencrypted snapshots are a data leak vector",
    ],
    rationale: "Unencrypted EBS volumes can be snapshotted and shared across AWS accounts. If the EC2 instance is compromised or the EBS snapshot is accidentally made public, all financial data is exposed in plaintext.",
    action: [
      { text: "Migrate to encrypted EBS: create encrypted snapshot → launch new instance from encrypted AMI", remediationAction: "apply-dlp" },
      { text: "Apply AWS Config rule: encrypted-volumes — alert on unencrypted EBS attachments", remediationAction: "apply-dlp" },
    ] },
  // r-cg-02: Sensitive Data Stores Missing Automated Backups
  {
    id: "FND-2025-1147", ruleId: "r-cg-02", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "analytics-db-prod", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Backup = Disabled", sublabel: "RDS Automated Backup · Retention = 0 days", badge: "NO BACKUP", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: AWS RDS (analytics-db-prod) · Config: Automated Backup retention = 0 (disabled) · Content: 2.1M customer records · Compliance: SOC 2 CC9.1, GDPR Article 32 (availability)",
    evidence: [
      "RDS: analytics-db-prod — automated backup retention period = 0 (backups disabled)",
      "Data: 2.1 million customer records — irreplaceable operational data",
      "No backup = no recovery point objective (RPO) capability",
      "SOC 2 CC9.1: backup and recovery controls are a required Trust Service Criterion",
    ],
    rationale: "Disabling RDS automated backups for a database holding 2.1 million customer records violates SOC 2 and GDPR availability requirements. A single accidental deletion or ransomware event becomes an unrecoverable data loss.",
    action: [
      { text: "Enable RDS automated backup with 7-day retention period immediately", remediationAction: "apply-dlp" },
      { text: "Enable automated snapshots on a daily schedule for analytics-db-prod" },
      { text: "Apply AWS Config rule: rds-backup-enabled — alert on RDS instances without backup", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1148", ruleId: "r-cg-02", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
        { type: "config", label: "Backup = Disabled", sublabel: "S3 Versioning · Disabled, no replication", badge: "NO BACKUP", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · Config: Versioning = Disabled, Cross-Region Replication = Disabled · Content: PHI, PII, Financial IDs across 847 objects · Compliance: HIPAA § 164.308(a)(7)(ii)(A)",
    evidence: [
      "Bucket: prod-data-lake — S3 versioning disabled, no cross-region replication configured",
      "HIPAA § 164.308(a)(7)(ii)(A): Data Backup Plan is a required implementation specification",
      "With versioning disabled, any object deletion or overwrite is irreversible",
      "847 objects with PHI, PII, Financial IDs — no recovery possible if deleted",
    ],
    rationale: "S3 bucket containing HIPAA-scoped PHI with no versioning or backup replication violates HIPAA's required Data Backup Plan specification. An accidental mass deletion would permanently destroy protected health information.",
    action: [
      { text: "Enable S3 Versioning on prod-data-lake immediately", remediationAction: "apply-dlp" },
      { text: "Configure S3 Cross-Region Replication to a secondary region (us-west-2)", remediationAction: "apply-dlp" },
      { text: "Enable S3 Object Lock with Governance mode on PHI objects for additional protection" },
      { text: "Document S3 backup configuration in HIPAA Risk Analysis", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1149", ruleId: "r-cg-02", severity: "Medium", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "dev-mysql-archive", sublabel: "Azure Blob · dev-configs" },
        { type: "config", label: "Backup = Disabled", sublabel: "Azure SQL Database · Short-term retention = 0", badge: "NO BACKUP", alert: true },
      ],
      edges: [{ label: "has misconfiguration" }] },
    matchedCondition: "App: Azure SQL Database (dev-mysql-archive) · Config: Short-term backup retention = 0 (disabled) · Content: Financial IDs, Bank Account Information in dev database · Compliance: SOC 2",
    evidence: [
      "Azure SQL: dev-mysql-archive — backup retention disabled (0 days)",
      "Development database with production-sourced financial data",
      "No point-in-time restore capability",
    ],
    rationale: "Development databases seeded with production financial data should maintain backup policies equivalent to production. Without backups, accidental data loss cannot be recovered.",
    action: [
      { text: "Enable Azure SQL automated backups with 7-day short-term retention", remediationAction: "apply-dlp" },
      { text: "Alternatively: delete production PII from dev database and use synthetic data — backups become less critical", remediationAction: "delete" },
    ] },
  // r-cg-03: European Personal Data Stored Outside Europe (new findings)
  {
    id: "FND-2025-1150", ruleId: "r-cg-03", severity: "Critical", status: "Open",
    detectedAt: "12 hours ago", lastSeenAt: "12 hours ago",
    topology: {
      nodes: [
        { type: "file", label: "eu-customers.csv", sublabel: "89,000 EU resident records", badge: "EU PII", alert: true },
        { type: "store", label: "eu-customer-data", sublabel: "AWS S3 · prod-data-lake", badge: "Region: us-east-1", alert: true },
        { type: "config", label: "Region: us-east-1", sublabel: "GDPR: Data transferred outside EEA without SCCs", badge: "GDPR VIOLATION", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "stored in wrong region" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/eu-customer-data/) · Region: us-east-1 (United States) · Content: EU Personal Data — Personal Names, Email Addresses, Postal Addresses of EU residents · GDPR Chapter V violation: international transfer without safeguards",
    evidence: [
      "S3 prefix: prod-data-lake/eu-customer-data/ — stored in us-east-1 (United States)",
      "Content: 89,000 EU resident records (GDPR-scoped) with Personal Names, Email Addresses, Postal Addresses",
      "No Standard Contractual Clauses (SCCs) documented for this S3-based US transfer",
      "Privacy Policy: claims EU data is processed within EEA — actual storage contradicts this",
    ],
    rationale: "EU personal data stored in us-east-1 without SCCs or Binding Corporate Rules violates GDPR Chapter V. The privacy policy representation that EU data stays in EEA makes this an active GDPR violation with potential Article 83 fines.",
    action: [
      { text: "Migrate eu-customer-data prefix to S3 bucket in eu-west-1 (Ireland) or eu-central-1 (Frankfurt)", remediationAction: "restrict-access" },
      { text: "Document AWS SCCs while migration is in progress — required for US-EU transfer legitimacy", remediationAction: "apply-dlp" },
      { text: "Update Privacy Policy to accurately reflect data storage location" },
      { text: "Notify DPO — GDPR Article 13 transparency obligation may require customer notification", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1151", ruleId: "r-cg-03", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "file", label: "employee-payroll-eu.xlsx", sublabel: "EU employee HR records", badge: "EU PII", alert: true },
        { type: "store", label: "eu-hr-records", sublabel: "Azure Blob · dev-configs", badge: "Region: eastus", alert: true },
        { type: "config", label: "Region: East US", sublabel: "GDPR: EU employee PII in US region", badge: "GDPR VIOLATION", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "stored in wrong region" }] },
    matchedCondition: "App: Azure Blob Storage (eu-hr-records container) · Region: eastus (United States) · Content: EU employee PII — SSNs, Healthcare IDs, Salary data of EU employees · GDPR Chapter V violation",
    evidence: [
      "Azure Blob container: eu-hr-records in East US region (should be EU region)",
      "Content: EU employee HR records — SSNs (EU national IDs), Healthcare IDs, Salary information",
      "Azure storage account created in East US by mistake during HRIS integration",
      "EU works council approval may be required for HR data cross-border transfer",
    ],
    rationale: "EU employee HR data (national IDs, healthcare, salary) is among the most sensitive GDPR special category data. Storage in US Azure region without proper GDPR Chapter V safeguards exposes the company to Article 83(5) fines (4% global turnover).",
    action: [
      { text: "Migrate eu-hr-records container to Azure North Europe or West Europe region", remediationAction: "restrict-access" },
      { text: "Implement Azure Policy to prevent sensitive EU-tagged containers from being created outside EU regions", remediationAction: "apply-dlp" },
      { text: "Consult EU works council on cross-border HR data transfer obligations" },
      { text: "File internal GDPR incident report with DPO", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2025-1152", ruleId: "r-cg-03", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "file", label: "user_sessions_eu", sublabel: "EU behavioral data · BigQuery table", badge: "EU PII", alert: true },
        { type: "store", label: "eu-analytics-events", sublabel: "Google BigQuery · acme-analytics.bigquery.com", badge: "Region: us-central1", alert: true },
        { type: "config", label: "Region: US (us-central1)", sublabel: "GDPR: EU behavioral data in US BigQuery", badge: "GDPR VIOLATION", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "stored in wrong region" }] },
    matchedCondition: "App: Google BigQuery (acme-analytics.bigquery.com) · Dataset: eu-analytics-events · Region: us-central1 (United States) · Content: EU user behavioral data — Email Addresses, IP Addresses, browsing events",
    evidence: [
      "BigQuery dataset: eu-analytics-events — created in us-central1 instead of EU region",
      "Content: EU user analytics events with Email Addresses (authenticated users), IP Addresses",
      "IP Address is GDPR personal data under recital 30",
      "Google Cloud DPA covers US processing, but GDPR Chapter V compliance depends on SCC implementation",
    ],
    rationale: "EU user analytics data with email addresses and IP addresses stored in US BigQuery requires valid GDPR Chapter V safeguards. The dataset name ('eu-analytics-events') suggests the EU region was intended but misconfigured.",
    action: [
      { text: "Migrate dataset to BigQuery EU multi-region or eu-west1/eu-central1", remediationAction: "restrict-access" },
      { text: "Verify Google Cloud DPA and SCCs are documented and current", remediationAction: "apply-dlp" },
      { text: "Apply BigQuery region constraint in Google Cloud Organization Policy: restrict analytics datasets to EU regions", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1153", ruleId: "r-cg-03", severity: "High", status: "Rescan",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "file", label: "crm-contacts-eu-backup.json", sublabel: "23,000 EU customer CRM records", badge: "EU PII", alert: true },
        { type: "store", label: "eu-crm-backup", sublabel: "AWS S3 · prod-data-lake", badge: "Region: ap-southeast-1", alert: true },
        { type: "config", label: "Region: ap-southeast-1 (Singapore)", sublabel: "GDPR: EU CRM data in APAC region", badge: "GDPR VIOLATION", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "stored in wrong region" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/eu-crm-backup/) · Region: ap-southeast-1 (Singapore) · Content: EU customer CRM data — Personal Names, Email Addresses, Company Names · GDPR: transfer to Singapore requires adequacy or SCCs",
    evidence: [
      "S3 bucket: eu-crm-backup in ap-southeast-1 (Singapore) — DR/backup bucket misconfigured",
      "Content: 23,000 EU customer CRM records",
      "Singapore: no EU adequacy decision — CRM backup in Singapore requires SCCs or BCRs",
      "Created during disaster recovery setup — region selection error",
    ],
    rationale: "EU customer data backed up to Singapore without adequacy or SCCs violates GDPR Chapter V. Singapore-based DR backup of EU data requires the same legal safeguards as any other non-EEA transfer.",
    action: [
      { text: "Migrate eu-crm-backup to eu-west-1 (Ireland) — DR backup should remain within EEA", remediationAction: "restrict-access" },
      { text: "Delete Singapore backup after confirming EU region backup is operational", remediationAction: "delete" },
      { text: "Apply AWS Service Control Policy: restrict S3 bucket creation to approved regions (eu-west-1, eu-central-1) for EU-tagged data", remediationAction: "apply-dlp" },
    ] },
  // r-cg-04: Cross-Region Transfer of Regulated Data (GDPR)
  {
    id: "FND-2025-1154", ruleId: "r-cg-04", severity: "Critical", status: "Open",
    detectedAt: "3 hours ago", lastSeenAt: "3 hours ago",
    topology: {
      nodes: [
        { type: "file", label: "eu-customer-accounts.csv", sublabel: "2,300 EU customer records · 4.2 MB", badge: "EU PII", alert: true },
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "4.2 MB · EU Customer PII", badge: "GDPR Alert", alert: true },
        { type: "destination", label: "Salesforce (US Instance)", sublabel: "CRM · US Data Center" },
      ],
      edges: [{ label: "uploaded by" }, { label: "transferred EU data" }, { label: "to non-EU destination" }] },
    matchedCondition: "Activity: Upload from EU region user to Salesforce US instance · User: Rachel Torres (EU location) · Content: 4.2 MB — 2,300 EU customer records (Personal Names, Email Addresses, Company Names) · GDPR Chapter V cross-border transfer",
    evidence: [
      "Rachel Torres (EU-based) uploading EU customer data to Salesforce US instance (na.salesforce.com)",
      "4.2 MB: 2,300 EU customer records",
      "Salesforce US instance: us-east-1 data center — not EU Salesforce tenant",
      "GDPR: Salesforce SCCs cover this transfer, but data classification and handling must comply",
    ],
    rationale: "EU customer records uploaded to a US Salesforce instance require active SCC documentation and GDPR-compliant data handling. The transfer itself may be legal but requires verification of current SCC status.",
    action: [
      { text: "Verify Salesforce EU SCCs are current and cover na.salesforce.com data processing", remediationAction: "apply-dlp" },
      { text: "Migrate EU customer data to Salesforce EU instance (eu.salesforce.com) for data residency compliance", remediationAction: "restrict-access" },
      { text: "Apply CASB policy: alert when EU-classified data is uploaded to non-EU SaaS instances" },
    ] },
  {
    id: "FND-2025-1155", ruleId: "r-cg-04", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "file", label: "eu-marketing-contacts.xlsx", sublabel: "8,200 EU contact records · 1.8 MB", badge: "EU PII", alert: true },
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal" },
        { type: "activity", label: "HTTP POST (Upload)", sublabel: "1.8 MB · EU Contact List", badge: "GDPR Alert", alert: true },
        { type: "destination", label: "HubSpot (US)", sublabel: "Marketing · US Data Center" },
      ],
      edges: [{ label: "uploaded by" }, { label: "transferred EU data" }, { label: "to non-EU destination" }] },
    matchedCondition: "Activity: Upload from EU region to HubSpot US instance · User: Nina Vasquez · Content: 1.8 MB — 8,200 EU contact records · GDPR: cross-border marketing data transfer",
    evidence: [
      "Nina Vasquez uploading EU marketing contact list to HubSpot US (app.hubspot.com, us-east-1)",
      "8,200 EU contact records — Email Addresses, Company Names, Telephone Numbers",
      "HubSpot EU Data Center available but not configured for this account",
    ],
    rationale: "EU marketing contact data in US-hosted HubSpot requires active GDPR Chapter V safeguards. Marketing data is particularly sensitive as it includes consent records that must be respected across transfer.",
    action: [
      { text: "Migrate HubSpot account to EU data center option (available in HubSpot Enterprise)", remediationAction: "restrict-access" },
      { text: "Verify HubSpot Data Processing Agreement and SCCs are current" },
      { text: "Apply consent data tag to EU contact records before any non-EU transfer", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1156", ruleId: "r-cg-04", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "file", label: "eu-analytics-events.parquet", sublabel: "EU customer analytics · 12 GB", badge: "EU PII", alert: true },
        { type: "identity", label: "svc-analytics-etl", sublabel: "Service Account · Analytics" },
        { type: "activity", label: "S3 Cross-Region Copy", sublabel: "12 GB · EU Customer Data", badge: "GDPR Alert", alert: true },
        { type: "destination", label: "prod-data-lake (us-east-1)", sublabel: "AWS S3 · US Region" },
      ],
      edges: [{ label: "copied by" }, { label: "copied EU data" }, { label: "to US region" }] },
    matchedCondition: "Activity: S3 Cross-Region Replication · Source: eu-data-lake (eu-west-1) · Destination: prod-data-lake (us-east-1) · Content: 12 GB — EU customer analytics data · GDPR Chapter V cross-region transfer",
    evidence: [
      "S3 Cross-Region Replication copying eu-data-lake (Ireland) to prod-data-lake (US) automatically",
      "12 GB replicated: EU customer analytics with Email Addresses, IP Addresses, behavioral data",
      "Replication configured by svc-analytics-etl as part of global analytics pipeline",
      "No SCC documentation specifically covering this S3 automated replication",
    ],
    rationale: "Automated S3 Cross-Region Replication transferring EU analytics data to US buckets creates a continuous GDPR Chapter V transfer without explicit per-transfer consent or documented legal mechanism review.",
    action: [
      { text: "Disable Cross-Region Replication from eu-data-lake to us-east-1 prod-data-lake", remediationAction: "restrict-access" },
      { text: "Document AWS SCCs explicitly covering automated replication — update DPA register", remediationAction: "apply-dlp" },
      { text: "Apply SCPs to prevent EU-region S3 buckets from replicating to non-EU regions without explicit approval", remediationAction: "apply-dlp" },
    ] },
  // r-cg-05: Unencrypted File Upload via Non-Standard Protocol — no findings (0-finding demo)


  // ══════════════════════════════════════════════════════════════════════════
  //  r-op-01 through r-op-06  (NEW batch — FND-2025-1043..1066)
  // ══════════════════════════════════════════════════════════════════════════
  // r-op-01: Stale Users Retaining Access to Sensitive Data
  {
    id: "FND-2025-1043", ruleId: "r-op-01", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal", badge: "INACTIVE 120 days", alert: true },
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
      ],
      edges: [{ label: "retains access to" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · User: rachel.torres@company.com — last login 120 days ago · Site member: Finance Reports (Contributor) · Content: Financial IDs, Bank Account Information in 89 files",
    evidence: [
      "User: Rachel Torres (rachel.torres@company.com) — last login 120 days ago (INACTIVE 90+)",
      "Account status: Active (not suspended) — on extended leave",
      "SharePoint: Member/Contributor on Finance Reports site — 89 files with financial PII",
      "No last-activity-based access review has triggered for this account",
    ],
    rationale: "Accounts inactive 90+ days retain full access to sensitive financial data. Extended leave accounts are a common attack vector — credentials may be stale or compromised without the user noticing.",
    action: [
      { text: "Restrict Rachel Torres access to read-only pending return-to-work", remediationAction: "restrict-access" },
      { text: "Require re-authentication and MFA verification on return from leave" },
      { text: "Enroll in quarterly access review cycle for all accounts inactive 60+ days", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1044", ruleId: "r-op-01", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-reporting-legacy", sublabel: "Service Account · Analytics", badge: "INACTIVE 200 days", alert: true },
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
      ],
      edges: [{ label: "retains IAM access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · IAM user: svc-reporting-legacy — last API call 200 days ago · Policy: S3FullAccess on prod-data-lake · Bucket contains PII + PHI",
    evidence: [
      "IAM user: svc-reporting-legacy — last API activity 200 days ago (CloudTrail)",
      "Policies: S3FullAccess on prod-data-lake (read, write, delete on 2,400+ objects)",
      "Access keys: 2 active keys — key 1 last used 200 days ago, key 2 never used",
      "prod-data-lake: Medical Records, SSNs, Financial IDs",
    ],
    rationale: "A service account with S3FullAccess unused for 200 days represents a dormant high-privilege credential. Dormant service account keys are a prime target for supply chain and insider threat actors.",
    action: [
      { text: "Deactivate both access keys for svc-reporting-legacy immediately", remediationAction: "restrict-access" },
      { text: "Detach S3FullAccess policy and delete IAM user if service is decommissioned", remediationAction: "delete" },
      { text: "Apply AWS IAM Access Analyzer to flag credentials unused for 90+ days", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1045", ruleId: "r-op-01", severity: "High", status: "Rescan",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal", badge: "INACTIVE 95 days", alert: true },
        { type: "store", label: "Engineering Hub", sublabel: "SharePoint · acme-corp.sharepoint.com/eng" },
      ],
      edges: [{ label: "retains access to" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/eng) · User: david.kim@company.com — last login 95 days ago · Access: Member on Engineering Hub (156 files with Source Code, IP Addresses)",
    evidence: [
      "User: David Kim (david.kim@company.com) — transferred to an external affiliate 95 days ago",
      "Original internal account still active with Engineering SharePoint membership",
      "Files: 156 engineering documents with architecture diagrams, source code refs",
    ],
    rationale: "Employees transferred to affiliates retaining internal access to engineering IP creates cross-entity data leakage risk. The affiliate may have different security standards and contractual data handling obligations.",
    action: [
      { text: "Revoke David Kim's Engineering Hub SharePoint access — affiliate accounts should use separate provisioning", remediationAction: "revoke-company" },
      { text: "Disable internal corporate account if employee has moved to affiliate", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1046", ruleId: "r-op-01", severity: "High", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "etl-prod-2020", sublabel: "Service Account · Data", badge: "INACTIVE 365 days", alert: true },
        { type: "store", label: "research-datasets", sublabel: "Azure Blob · research-datasets" },
      ],
      edges: [{ label: "retains RBAC on" }] },
    matchedCondition: "App: Azure Blob Storage (research-datasets) · Service principal: etl-prod-2020 — last activity 365 days ago · RBAC: Storage Blob Data Contributor · Contains Financial IDs, Personal Names",
    evidence: [
      "Service principal: etl-prod-2020 — last sign-in 365 days ago",
      "RBAC: Storage Blob Data Contributor (read + write + delete) on research-datasets",
      "Client secret: expires in 14 days — if renewed, full contributor access restored",
    ],
    rationale: "A year-inactive service principal with write access to sensitive blob storage, whose secret is about to be renewed, represents a critical governance gap. Renewal without review could reactivate a forgotten privileged path.",
    action: [
      { text: "Remove Storage Blob Data Contributor RBAC role for etl-prod-2020", remediationAction: "revoke-company" },
      { text: "Do NOT renew the expiring client secret — let it expire and then delete the service principal", remediationAction: "delete" },
      { text: "Audit Azure AD for all service principals inactive 90+ days with Storage RBAC assignments", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1047", ruleId: "r-op-01", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal", badge: "INACTIVE 100 days", alert: true },
        { type: "store", label: "Marketing Assets", sublabel: "Google Drive · acme-marketing.google.com" },
      ],
      edges: [{ label: "retains access to" }] },
    matchedCondition: "App: Google Drive (acme-marketing.google.com) · User: nina.vasquez@company.com — last login 100 days ago · Files include customer lists with Email Addresses, Personal Names",
    evidence: [
      "User: Nina Vasquez — on sabbatical for 100 days",
      "Google Drive access: Marketing Assets shared drive — Contributor (read+write)",
      "Sensitive files: Customer_Email_List_2024.csv (15,432 records) accessible",
    ],
    rationale: "Long-leave accounts with write access to customer PII create dormant access risk. If sabbatical credentials are phished or stolen, the attacker gains read/write access to 15,000+ customer records.",
    action: [
      { text: "Downgrade to Viewer access for duration of sabbatical", remediationAction: "restrict-access" },
      { text: "Require MFA re-enrollment on return from sabbatical" },
    ] },
  // r-op-02: Ghost Users with Access to Sensitive Data
  {
    id: "FND-2025-1048", ruleId: "r-op-02", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "arn:aws:iam::account-id:user/svc-etl-ghost", sublabel: "Unlinked · IAM", badge: "GHOST", alert: true },
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
      ],
      edges: [{ label: "has IAM access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · IAM user: svc-etl-ghost — not linked to any HR identity, no owner, no MFA · Policy: S3ReadAccess on prod-data-lake · Bucket contains PII + PHI",
    evidence: [
      "IAM user: svc-etl-ghost — created 3 years ago, no corresponding HR record or owner",
      "Policy: AmazonS3ReadOnlyAccess on prod-data-lake (2,400+ objects with SSNs, PHI)",
      "Last login: 45 days ago (active but unaccounted for)",
      "Access key: 1 active key — age: 3 years, never rotated",
    ],
    rationale: "Ghost IAM users with no HR linkage and multi-year-old access keys represent an unmanaged persistent credential. Active logins 45 days ago indicate the account may be in use by an unknown process or threat actor.",
    action: [
      { text: "Deactivate svc-etl-ghost access keys immediately pending ownership investigation", remediationAction: "restrict-access" },
      { text: "Investigate 45-day-old login via CloudTrail — identify the API calls and source IP" },
      { text: "If no legitimate owner found: delete IAM user and rotate any shared secrets", remediationAction: "delete" },
      { text: "Implement mandatory owner tagging for all IAM users — block creation without tag:Owner", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1049", ruleId: "r-op-02", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "objectId:7f3a2b...", sublabel: "Unlinked · IAM", badge: "GHOST", alert: true },
        { type: "store", label: "research-datasets", sublabel: "Azure Blob · research-datasets" },
      ],
      edges: [{ label: "has RBAC on" }] },
    matchedCondition: "App: Azure Blob Storage (research-datasets) · Service principal objectId:7f3a2b — not resolvable in Azure AD (deleted directory object) · RBAC: Storage Blob Data Reader retained · Contains Financial IDs, PII",
    evidence: [
      "Azure RBAC: objectId=7f3a2b... has Storage Blob Data Reader on research-datasets",
      "Azure AD lookup: object not found — deleted principal with orphaned RBAC",
      "POSIX-style entry: persists independently of directory state",
    ],
    rationale: "Deleted Azure AD objects with retained RBAC assignments are Ghost identities. If the object ID is recycled or re-registered by a new application, access is silently restored.",
    action: [
      { text: "Remove RBAC assignment for objectId:7f3a2b... from research-datasets", remediationAction: "revoke-company" },
      { text: "Run Azure Advisor / Access Review to identify all orphaned RBAC assignments in subscription", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1050", ruleId: "r-op-02", severity: "High", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "arn:aws:iam::account-id:role/CrossAcctDataRole", sublabel: "Unlinked · IAM", badge: "GHOST", alert: true },
        { type: "store", label: "prod-data-lake", sublabel: "AWS S3 · prod-data-lake" },
      ],
      edges: [{ label: "has cross-account trust to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake) · IAM Role: CrossAcctDataRole — trusted account (111222333444) deleted/closed · Role trust policy references non-existent account · Confused deputy risk",
    evidence: [
      "IAM Role: CrossAcctDataRole — trust policy sts:AssumeRole allows account 111222333444",
      "Account 111222333444: AWS confirms this account has been closed",
      "If account ID is recycled by AWS to a new customer, they could assume this role",
      "Role policies: S3ReadAccess on prod-data-lake, DynamoDB read on customer tables",
    ],
    rationale: "Cross-account IAM trust policies referencing closed AWS accounts are confused deputy risks. AWS occasionally recycles account IDs, meaning a new unrelated AWS customer could potentially assume this role and access prod data.",
    action: [
      { text: "Remove cross-account trust policy from CrossAcctDataRole immediately", remediationAction: "restrict-access" },
      { text: "Audit all IAM roles for cross-account trust entries referencing external account IDs", remediationAction: "apply-dlp" },
      { text: "Delete CrossAcctDataRole if no longer needed", remediationAction: "delete" },
    ] },
  {
    id: "FND-2025-1051", ruleId: "r-op-02", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "arn:aws:iam::account-id:user/contractor-jdoe-2022", sublabel: "Unlinked · IAM", badge: "GHOST", alert: true },
        { type: "store", label: "code-artifacts", sublabel: "AWS S3 · prod-data-lake" },
      ],
      edges: [{ label: "has IAM access to" }] },
    matchedCondition: "App: AWS S3 (prod-data-lake/code-artifacts/) · IAM user: contractor-jdoe-2022 — no HR record, likely departed contractor · Access key active, last used 8 months ago",
    evidence: [
      "IAM user: contractor-jdoe-2022 — created 2022, no HR record found in active directory",
      "Access: S3ReadAccess on code-artifacts prefix (source code artifacts)",
      "Access key last used: 8 months ago — still active",
    ],
    rationale: "Contractor IAM users without current HR records are ghost identities. Source code access by an unverifiable identity is an IP risk.",
    action: [
      { text: "Deactivate contractor-jdoe-2022 access keys", remediationAction: "restrict-access" },
      { text: "Delete IAM user after confirming no legitimate owner exists", remediationAction: "delete" },
    ] },
  // r-op-03: Ghost Users (Unresolved SIDs) in Sensitive File ACLs
  {
    id: "FND-2025-1052", ruleId: "r-op-03", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "S-1-5-21-...DEL:7f9a2c", sublabel: "UNRESOLVED SID · IAM", badge: "UNRESOLVED SID", alert: true },
        { type: "store", label: "\\\\fileserver01\\HR_Sensitive", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has ACL entry on" }] },
    matchedCondition: "Store: \\\\fileserver01\\HR_Sensitive (on-prem file server) · ACL: SID S-1-5-21-...DEL:7f9a2c — not resolvable in Active Directory · Full Control ACE on HR share · Share contains PII: SSNs, Medical Records",
    evidence: [
      "File server: \\\\fileserver01\\HR_Sensitive — on-prem Windows share",
      "ACL entry: SID S-1-5-21-...DEL:7f9a2c with Full Control — AD lookup: 'Account Unknown'",
      "The SID references a deleted AD account (tombstone expired) — orphaned ACE",
      "Share contains: 312 HR files with SSNs, Medical Records, Compensation data",
    ],
    rationale: "Unresolved SIDs in NTFS ACLs are a common on-prem ghost identity problem. These ACEs cannot be managed through normal UI and require scripted cleanup. If the SID is ever re-assigned in AD, the new account inherits Full Control.",
    action: [
      { text: "Remove unresolved SID ACE from HR_Sensitive share using icacls or PowerShell", remediationAction: "revoke-company" },
      { text: "Run icacls /findsid scan on all sensitive shares to identify additional orphaned SIDs", remediationAction: "apply-dlp" },
      { text: "Implement quarterly ACL audit to prevent accumulation of unresolved SIDs", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2025-1053", ruleId: "r-op-03", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "S-1-5-21-...DEL:3b8e1f", sublabel: "UNRESOLVED SID · IAM", badge: "UNRESOLVED SID", alert: true },
        { type: "store", label: "\\\\fileserver02\\Finance_Archive", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has ACL entry on" }] },
    matchedCondition: "Store: \\\\fileserver02\\Finance_Archive (on-prem) · ACL: SID S-1-5-21-...DEL:3b8e1f — unresolvable in AD · Modify ACE on Finance share · Contains Bank Account Information, Financial IDs",
    evidence: [
      "File server: \\\\fileserver02\\Finance_Archive — 203 financial archive files",
      "Unresolved SID ACE: Modify permissions on the root share",
      "Data: Bank Account Numbers, Financial IDs, payroll archives",
    ],
    rationale: "Modify permissions for an unresolved SID on financial archives create an orphaned privileged access path. SID re-assignment risk is lower than Full Control but still allows data modification.",
    action: [
      { text: "Remove unresolved SID ACE from Finance_Archive share", remediationAction: "revoke-company" },
      { text: "Audit all on-prem file server ACLs for unresolved SIDs using Get-Acl PowerShell", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1054", ruleId: "r-op-03", severity: "Medium", status: "Rescan",
    detectedAt: "1 week ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "S-1-5-21-...DEL:c4d9a7", sublabel: "UNRESOLVED SID · IAM", badge: "UNRESOLVED SID", alert: true },
        { type: "store", label: "\\\\fileserver01\\Engineering_Docs", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has ACL entry on" }] },
    matchedCondition: "Store: \\\\fileserver01\\Engineering_Docs · ACL: SID ...DEL:c4d9a7 — unresolvable · Read ACE · Contains Source Code, IP Addresses, Private Keys",
    evidence: [
      "Unresolved SID with Read access on engineering documentation share",
      "156 files: Source Code references, network architecture diagrams, IP ranges",
      "SID from deleted contractor account per tombstone analysis",
    ],
    rationale: "Even read-only unresolved SIDs on engineering documentation create IP leakage risk if the SID is recycled. Architecture diagrams and IP ranges are reconnaissance-valuable.",
    action: [
      { text: "Remove unresolved SID from Engineering_Docs ACL", remediationAction: "revoke-company" },
      { text: "Schedule quarterly on-prem ACL hygiene review" },
    ] },
  {
    id: "FND-2025-1055", ruleId: "r-op-03", severity: "High", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "S-1-5-21-...DEL:9e2f5b", sublabel: "UNRESOLVED SID · IAM", badge: "UNRESOLVED SID", alert: true },
        { type: "store", label: "\\\\nas01\\Legal_Confidential", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has ACL entry on" }] },
    matchedCondition: "Store: \\\\nas01\\Legal_Confidential · ACL: SID ...DEL:9e2f5b — Full Control · Contains Social Security Numbers, Company Names, litigation-related PII",
    evidence: [
      "NAS share: Legal_Confidential — 89 legal files",
      "Unresolved SID: Full Control ACE on root share",
      "Content: litigation documents, NDA copies, SSN references in court filings",
    ],
    rationale: "Full Control unresolved SID on attorney-client privileged legal files is the highest risk ghost identity scenario. Legal documents cannot have any unverifiable access paths.",
    action: [
      { text: "Remove unresolved SID ACE from Legal_Confidential share immediately", remediationAction: "revoke-company" },
      { text: "Notify Legal team of the historical exposure — assess privilege impact", remediationAction: "legal-hold" },
      { text: "Apply strict ACL governance: only named AD groups permitted on legal shares", remediationAction: "restrict-access" },
    ] },
  // r-op-04: Sensitive Files with Broken Permission Inheritance
  {
    id: "FND-2025-1056", ruleId: "r-op-04", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "store", label: "\\\\fileserver01\\HR_Sensitive\\Payroll_2024", sublabel: "File Server · on-prem" },
        { type: "file",  label: "Payroll_Q4_2024_AllStaff.xlsx", sublabel: "SSNs + Bank Accounts · 412 records" },
        { type: "config", label: "Inheritance = Disabled", sublabel: "NTFS ACL · Custom ACE override", badge: "BROKEN", alert: true },
      ],
      edges: [{ label: "contains" }, { label: "has misconfiguration" }] },
    matchedCondition: "Store: \\\\fileserver01\\HR_Sensitive\\Payroll_2024 · NTFS ACL: inheritance disabled, custom ACEs granting EVERYONE:Read · Contains Bank Account Information, SSNs, salary data for 412 employees",
    evidence: [
      "Folder: HR_Sensitive\\Payroll_2024 — inheritance disabled, custom ACE added: EVERYONE:Read",
      "This folder is NOT governed by the parent HR_Sensitive share permissions (which are restricted)",
      "412 employee payroll records with Bank Account Numbers, SSNs, salary figures",
      "Change timestamp: ACL modified 45 days ago by IT admin during a migration task",
    ],
    rationale: "Broken inheritance with EVERYONE:Read on payroll data means any authenticated domain user can read employee bank account and salary information — completely bypassing the parent share's access controls.",
    action: [
      { text: "Re-enable NTFS inheritance on Payroll_2024 folder and remove EVERYONE:Read ACE", remediationAction: "restrict-access" },
      { text: "Audit all subdirectories of HR_Sensitive for broken inheritance ACLs", remediationAction: "apply-dlp" },
      { text: "Review who accessed Payroll_2024 in the last 45 days via Event Log 4663 (file access audit)" },
    ] },
  {
    id: "FND-2025-1057", ruleId: "r-op-04", severity: "High", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "store", label: "\\\\fileserver02\\Finance_Archive\\Audits_2023", sublabel: "File Server · on-prem" },
        { type: "file",  label: "Internal_Audit_Report_2023.pdf", sublabel: "Financial IDs + Bank Accounts" },
        { type: "config", label: "Inheritance = Disabled", sublabel: "NTFS ACL · Contractor group added", badge: "BROKEN", alert: true },
      ],
      edges: [{ label: "contains" }, { label: "has misconfiguration" }] },
    matchedCondition: "Store: \\\\fileserver02\\Finance_Archive\\Audits_2023 · NTFS: inheritance disabled · ACE: DOMAIN\\Contractors group (All Contractors) has Read+Execute · Financial IDs, Bank Accounts in audit files",
    evidence: [
      "Folder: Finance_Archive\\Audits_2023 — inheritance disabled, Contractors AD group added with Read+Execute",
      "DOMAIN\\Contractors group has 47 members — all contractors across all departments",
      "Files: 2023 internal audit reports with financial details, control weaknesses, Bank Account data",
    ],
    rationale: "Broken inheritance granting all-contractors access to internal audit reports creates a governance and confidentiality failure. Audit reports contain control weaknesses that could be exploited by a malicious contractor.",
    action: [
      { text: "Re-enable inheritance on Audits_2023 and remove Contractors group ACE", remediationAction: "restrict-access" },
      { text: "Restrict audit reports to Finance leadership and Internal Audit team only", remediationAction: "restrict-access" },
      { text: "Investigate why the Contractors group was added to this folder", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1058", ruleId: "r-op-04", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "store", label: "\\\\nas01\\Legal_Confidential\\Contracts_Archive", sublabel: "File Server · on-prem" },
        { type: "file",  label: "Vendor_Agreement_SSN_Addendum.docx", sublabel: "SSNs + Company Names · 67 files" },
        { type: "config", label: "Inheritance = Disabled", sublabel: "NTFS ACL · Domain Users added", badge: "BROKEN", alert: true },
      ],
      edges: [{ label: "contains" }, { label: "has misconfiguration" }] },
    matchedCondition: "Store: \\\\nas01\\Legal_Confidential\\Contracts_Archive · NTFS: inheritance disabled · ACE: DOMAIN\\Domain Users:Read · PII: SSNs, Company Names in 67 contract files",
    evidence: [
      "Folder: Legal_Confidential\\Contracts_Archive — Domain Users (all ~1,200 employees) have Read access",
      "Parent share (Legal_Confidential) restricts to Legal team only — inheritance break bypasses this",
      "67 files: contract templates, vendor agreements with SSN references and Company Names",
    ],
    rationale: "Domain Users having read access to legal contract archives via a broken inheritance override exposes attorney-client privileged documents to the entire employee population.",
    action: [
      { text: "Re-enable inheritance and remove Domain Users ACE from Contracts_Archive", remediationAction: "restrict-access" },
      { text: "Alert Legal team to review access history for this folder", remediationAction: "legal-hold" },
    ] },
  // r-op-05: Risky Users with Access to Sensitive Shares
  {
    id: "FND-2025-1059", ruleId: "r-op-05", severity: "Critical", status: "Open",
    detectedAt: "4 hours ago", lastSeenAt: "4 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "store", label: "\\\\fileserver02\\Finance_Archive", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has access to" }] },
    matchedCondition: "Store: \\\\fileserver02\\Finance_Archive · User: Marcus Webb — UEBA Risk Score: 87/100 (HIGH) · Anomalous: bulk file enumeration detected 3 days ago · Share contains: Bank Account Information, Financial IDs",
    evidence: [
      "User: Marcus Webb (marcus.webb@company.com) — UEBA risk score elevated to 87 (HIGH) 3 days ago",
      "UEBA signals: bulk file enumeration (4,200 file opens in 2 hours), unusual hours (2am–4am), VPN from unusual country",
      "Share access: Finance_Archive — Full access to 203 financial files",
      "Bank Account data accessible: payroll records, vendor bank details",
    ],
    rationale: "A high-UEBA-risk user with full access to financial archives during an active anomaly investigation is an insider threat emergency. The bulk enumeration pattern suggests data staging for exfiltration.",
    action: [
      { text: "Immediately restrict Marcus Webb's Finance_Archive access to read-only pending investigation", remediationAction: "restrict-access" },
      { text: "Escalate to Insider Threat team — preserve audit logs under Legal Hold", remediationAction: "legal-hold" },
      { text: "Review all file access by Marcus Webb in the last 7 days via event logs" },
      { text: "Notify CISO and Legal within 2 hours" },
    ] },
  {
    id: "FND-2025-1060", ruleId: "r-op-05", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "store", label: "\\\\fileserver01\\HR_Sensitive", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has access to" }] },
    matchedCondition: "Store: \\\\fileserver01\\HR_Sensitive · User: Tom Harrington — UEBA Risk Score: 79/100 (HIGH) · Cross-departmental access anomaly: Sales user accessing HR sensitive share · Peer baseline: no other Sales peers access this share",
    evidence: [
      "User: Tom Harrington (tom.harrington@company.com) — UEBA elevated 5 days ago",
      "Anomaly: first-ever access to HR_Sensitive share (peer baseline: 0 Sales peers access this)",
      "Files accessed: compensation data, performance reviews for his team members",
      "UEBA signals: anomalous time (7pm), multiple folder traversals",
    ],
    rationale: "A Sales manager with elevated UEBA risk accessing HR sensitive data outside their job role is a policy violation. Accessing compensation data for direct reports via unauthorized means violates GDPR and HR policy.",
    action: [
      { text: "Revoke Tom Harrington's access to HR_Sensitive share", remediationAction: "revoke-company" },
      { text: "Escalate to HR and Legal for policy violation review" },
      { text: "Add Tom Harrington to UEBA watchlist for 30-day elevated monitoring", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2025-1061", ruleId: "r-op-05", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "vendor-svc-noc@partner.io", sublabel: "External Vendor · IAM", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "store", label: "\\\\nas01\\Legal_Confidential", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has VPN access to" }] },
    matchedCondition: "Store: \\\\nas01\\Legal_Confidential · External vendor account: vendor-svc-noc@partner.io — UEBA Risk: HIGH · Anomalous bulk download from Legal share outside business hours · PII: SSNs, litigation docs",
    evidence: [
      "External vendor: vendor-svc-noc@partner.io (NOC vendor, network monitoring access)",
      "UEBA: bulk download of 312 files from Legal_Confidential at 3am (anomaly vs. normal NOC activity profile)",
      "NOC vendor should have no legitimate reason to access Legal share",
      "VPN session: source IP different from vendor's registered IP block",
    ],
    rationale: "An external vendor account exhibiting bulk download behavior from a legal document share at 3am from an unusual IP is a supply chain compromise indicator. This may represent a compromised vendor account being used maliciously.",
    action: [
      { text: "Immediately revoke vendor-svc-noc@partner.io VPN access", remediationAction: "revoke-external" },
      { text: "Escalate to Incident Response team — potential supply chain compromise", remediationAction: "legal-hold" },
      { text: "Contact vendor partner to verify if account was compromised" },
      { text: "Preserve all access logs for forensic analysis" },
    ] },
  {
    id: "FND-2025-1062", ruleId: "r-op-05", severity: "Medium", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "David Kim", sublabel: "Engineer · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "store", label: "\\\\fileserver02\\Finance_Archive", sublabel: "File Server · on-prem" },
      ],
      edges: [{ label: "has access to" }] },
    matchedCondition: "Store: \\\\fileserver02\\Finance_Archive · User: David Kim — UEBA Risk elevated · Cross-functional access: Engineering user accessing Finance share for first time · Peer baseline anomaly",
    evidence: [
      "User: David Kim (david.kim@company.com) — UEBA risk elevated 7 days ago (score: 62, Medium-High)",
      "First access to Finance_Archive (peer baseline: no Engineers access this share)",
      "Access pattern: sequential folder traversal, multiple files opened quickly",
    ],
    rationale: "An engineer accessing financial archives outside their job function with elevated UEBA risk warrants investigation. While individually explainable, in context of elevated risk score it requires review.",
    action: [
      { text: "Contact David Kim's manager to verify if financial archive access is job-related", remediationAction: "restrict-access" },
      { text: "If no legitimate business need: revoke access to Finance_Archive", remediationAction: "revoke-company" },
    ] },
  // r-op-06: High-Risk User Downloading Sensitive Data
  {
    id: "FND-2025-1063", ruleId: "r-op-06", severity: "Critical", status: "Open",
    detectedAt: "3 hours ago", lastSeenAt: "3 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Marcus Webb", sublabel: "Finance Lead · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "Bulk Download", sublabel: "4.2 GB · 203 files", badge: "HIGH VOLUME", alert: true },
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
      ],
      edges: [{ label: "performed" }, { label: "from" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · User: Marcus Webb (UEBA HIGH) · Activity: Bulk download 4.2 GB (203 files) in 45 minutes · Content: Financial IDs, Bank Account Information",
    evidence: [
      "User: Marcus Webb — UEBA risk score 87/100 (HIGH) for 3 days",
      "Download: 203 files (4.2 GB) in 45 minutes from Finance Reports SharePoint — anomalous vs. 5-file baseline",
      "Destination: local device (not corporate managed — unmanaged laptop via BYOD)",
      "Files: payroll models, bank reconciliation, investor relations drafts",
    ],
    rationale: "A high-UEBA-risk employee bulk-downloading 4.2 GB of financial data to an unmanaged device is an active exfiltration event. Combined with the prior UEBA signals (unusual country VPN, bulk enumeration), this is a P0 insider threat incident.",
    action: [
      { text: "Immediately revoke Marcus Webb's SharePoint access — P0 insider threat response", remediationAction: "revoke-company" },
      { text: "Preserve SharePoint audit logs and UEBA evidence under Legal Hold", remediationAction: "legal-hold" },
      { text: "Escalate to CISO, Legal, and HR — initiate formal investigation" },
      { text: "Block Marcus Webb's device from corporate network pending forensic imaging" },
    ] },
  {
    id: "FND-2025-1064", ruleId: "r-op-06", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "Tom Harrington", sublabel: "Sales Manager · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "Bulk Download", sublabel: "1.8 GB · 89 files", badge: "HIGH VOLUME", alert: true },
        { type: "store", label: "Sales – CRM Exports", sublabel: "SharePoint · acme-corp.sharepoint.com/sales" },
      ],
      edges: [{ label: "performed" }, { label: "from" }] },
    matchedCondition: "App: SharePoint (acme-corp.sharepoint.com/sales) · User: Tom Harrington (UEBA HIGH) · Activity: Download 1.8 GB (89 CRM export files) · Content: Personal Names, Email Addresses, Telephone Numbers",
    evidence: [
      "Tom Harrington — UEBA elevated 5 days ago, now bulk downloading customer data",
      "89 CRM export files (1.8 GB): customer contact lists, opportunity data",
      "Download to personal laptop — first bulk download in 6 months",
      "Context: Tom Harrington was placed on PIP 1 week ago",
    ],
    rationale: "A sales employee on a performance improvement plan bulk-downloading customer contact lists is a classic pre-departure exfiltration pattern. Customer lists have direct resale value to competitors.",
    action: [
      { text: "Revoke Tom Harrington's CRM export file access immediately", remediationAction: "revoke-company" },
      { text: "Apply Legal Hold — preserve all download and activity logs", remediationAction: "legal-hold" },
      { text: "Escalate to HR and Legal — PIP context makes this an insider threat priority" },
    ] },
  {
    id: "FND-2025-1065", ruleId: "r-op-06", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Nina Vasquez", sublabel: "Marketing Manager · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "Bulk Download", sublabel: "760 MB · 34 files", badge: "HIGH VOLUME", alert: true },
        { type: "store", label: "Marketing Assets", sublabel: "Google Drive · acme-marketing.google.com" },
      ],
      edges: [{ label: "performed" }, { label: "from" }] },
    matchedCondition: "App: Google Drive (acme-marketing.google.com) · User: Nina Vasquez (UEBA HIGH) · Activity: Download 34 files including Customer_Email_List_2024.csv · Content: Email Addresses, Personal Names",
    evidence: [
      "Nina Vasquez — UEBA elevated after return from sabbatical (new login from unusual location)",
      "Download: 34 files including customer email list (15,432 records)",
      "Pattern: immediate large download on first day back — anomalous",
    ],
    rationale: "First-day-back bulk downloads of customer PII files from an account flagged by UEBA may indicate credential compromise during the sabbatical period.",
    action: [
      { text: "Force re-authentication for Nina Vasquez — require MFA verification and password reset", remediationAction: "restrict-access" },
      { text: "Quarantine access to Marketing Assets drive pending UEBA review", remediationAction: "quarantine" },
      { text: "Contact Nina Vasquez directly to verify the download was intentional" },
    ] },
  {
    id: "FND-2025-1066", ruleId: "r-op-06", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Rachel Torres", sublabel: "Finance Analyst · Internal", badge: "Risk: HIGH (UEBA)", alert: true },
        { type: "activity", label: "Bulk Download", sublabel: "2.1 GB · 47 files", badge: "HIGH VOLUME", alert: true },
        { type: "store", label: "Finance Reports", sublabel: "SharePoint · acme-finance.sharepoint.com" },
      ],
      edges: [{ label: "performed" }, { label: "from" }] },
    matchedCondition: "App: SharePoint (acme-finance.sharepoint.com) · User: Rachel Torres (UEBA HIGH) · Activity: Download 2.1 GB (47 files) outside business hours · Financial IDs, Bank Account Information",
    evidence: [
      "Rachel Torres — UEBA risk elevated 4 days ago (after returning from leave)",
      "Download: 47 financial files (2.1 GB) at 11pm on a Saturday",
      "Files: investor relations models, customer revenue by account, board materials",
      "Access from new device fingerprint (not corporate managed)",
    ],
    rationale: "Weekend off-hours bulk downloads of investor relations material to an unrecognized device from a high-risk account is a significant data exfiltration concern requiring immediate investigation.",
    action: [
      { text: "Revoke Rachel Torres' SharePoint download permissions pending investigation", remediationAction: "restrict-access" },
      { text: "Escalate UEBA alert to Security Operations and Legal", remediationAction: "legal-hold" },
      { text: "Initiate device enrollment check — confirm if the download device is corporate or personal" },
    ] },


  // ══════════════════════════════════════════════════════════════════════════
  //  r-op-01  MFA Disabled for Administrative Accounts  (SSPM, 8)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-5101", ruleId: "r-op-01", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-payment-proc", sublabel: "Service Account · Finance" },
        { type: "activity", label: "Login from External IP", sublabel: "203.0.113.45 · No MFA", badge: "CRITICAL", alert: true },
        { type: "store",  label: "Salesforce Org", sublabel: "SaaS · Production" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "svc-payment-proc · System Administrator", badge: "CRITICAL", alert: true },
      ],
      edges: [{ label: "accessed" }, { label: "via" }, { label: "has config" }] },
    matchedCondition: `App: Salesforce Production Org · User: svc-payment-proc (System Administrator role) · Config: MFA_Enabled = False, Login IP restrictions = None · Action: Alert Critical`,
    evidence: [
      "Service account: svc-payment-proc (svc-payment-proc@company.com) in Salesforce Production",
      "Role: System Administrator (full org access — all customer data, payment records)",
      "MFA status: Disabled — only password-based authentication",
      "Last login: 2 days ago from IP 203.0.113.45 (external, not corporate VPN)",
      "Risk: Admin account accessing payment data with no MFA from external IP",
    ],
    rationale: "A Salesforce System Administrator account with disabled MFA is a single credential away from full org compromise. External IP logins without MFA on an account holding payment data is a PCI-DSS violation.",
    action: [
      { text: "Force-enable MFA for svc-payment-proc immediately — use Salesforce admin API." },
      { text: "Investigate the external IP login (203.0.113.45) — verify if this was authorized." },
      { text: "Restrict svc-payment-proc login to corporate IP ranges only (IP Allowlisting)." },
      { text: "Rotate svc-payment-proc Salesforce password as precaution." },
    ] },
  {
    id: "FND-2024-5102", ruleId: "r-op-01", severity: "Critical", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Diana Reyes", sublabel: "Organization Owner · Engineering" },
        { type: "store",  label: "GitHub Organization", sublabel: "SaaS · Source Control" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "diana-reyes · Organization Owner", badge: "CRITICAL", alert: true },
      ],
      edges: [{ label: "has access to" }, { label: "has config" }] },
    matchedCondition: `App: GitHub Organization (company-org) · User: diana-reyes (Organization Owner) · Config: MFA_Enabled = False · Role grants: full repo access, secrets, CI/CD config`,
    evidence: [
      "GitHub Org Owner account for Diana Reyes (diana.reyes@company.com) — MFA not required",
      "Org Owner has access to: 847 repositories, GitHub Actions secrets, Dependabot config, billing",
      "OIDC connectors: AWS, Azure, GCP (could allow cloud resource takeover via GitHub Actions)",
    ],
    rationale: "A GitHub Organization Owner without MFA is a catastrophic risk. Via GitHub Actions OIDC, an attacker with this account could assume cloud provider roles and escalate to full infrastructure access.",
    action: [
      { text: "Enforce MFA immediately — use GitHub organization security policy (require MFA for all owners)." },
      { text: "Audit OIDC trust relationships — review which cloud roles trust this GitHub org." },
      { text: "Rotate any GitHub Personal Access Tokens held by Diana Reyes." },
    ] },
  {
    id: "FND-2024-5103", ruleId: "r-op-01", severity: "High", status: "Rescan",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-analytics", sublabel: "Service Account · Analytics" },
        { type: "activity", label: "Automated Access", sublabel: "API Token · No MFA", badge: "HIGH", alert: true },
        { type: "store",  label: "Microsoft 365", sublabel: "SaaS · Email + Docs" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "svc-analytics · Global Reader", badge: "HIGH", alert: true },
      ],
      edges: [{ label: "accessed" }, { label: "via" }, { label: "has config" }] },
    matchedCondition: `App: Microsoft 365 · User: svc-analytics (Global Reader role) · Config: MFA = False · Global Reader can read all mailboxes, files, admin settings read-only`,
    evidence: [
      "Service account: svc-analytics with Global Reader role in M365 — no MFA",
      "Global Reader: can read all Exchange mailboxes, all SharePoint sites, all Teams messages",
      "Used for analytics data collection — broad read access by design",
    ],
    rationale: "Global Reader without MFA on M365 is equivalent to having read access to the entire company's communications without authentication protection. A compromised password gives full email and document read access.",
    action: [
      { text: "Enable MFA (Conditional Access policy) for svc-analytics account." },
      { text: "Scope down from Global Reader to specific permissions needed for analytics collection." },
      { text: "Use Managed Identity or App Registration with certificate auth instead of user account." },
    ] },
  {
    id: "FND-2024-5104", ruleId: "r-op-01", severity: "High", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "cicd-pipeline-svc", sublabel: "Service Account · DevOps" },
        { type: "store",  label: "GitHub Organization", sublabel: "SaaS · Source Control" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "cicd-pipeline · Admin (12 repos)", badge: "HIGH", alert: true },
      ],
      edges: [{ label: "has access to" }, { label: "has config" }] },
    matchedCondition: `App: GitHub · User: cicd-pipeline-svc (admin access to 12 repos) · Config: MFA = False · Token-based auth but linked user account has no MFA`,
    evidence: [
      "Service account: CI/CD Pipeline (cicd-pipeline-svc) GitHub account with admin access to 12 critical repositories",
      "Uses PAT (Personal Access Token) for automation — but the underlying user account has no MFA",
      "Token compromise = full write access to repos including main branch",
    ],
    rationale: "CI/CD service accounts controlling repository write access represent a supply chain attack vector. Without MFA on the account, a token theft gives persistent repo access that could inject malicious code.",
    action: [
      { text: "Migrate CI/CD Pipeline to GitHub App installation (no user account needed — scoped permissions)." },
      { text: "If user account required: enable MFA and rotate PAT with reduced scope." },
      { text: "Enable branch protection rules to prevent direct pushes to main without PR review." },
    ] },
  {
    id: "FND-2024-5105", ruleId: "r-op-01", severity: "High", status: "Open",
    detectedAt: "6 days ago", lastSeenAt: "6 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics" },
        { type: "store",  label: "Microsoft 365", sublabel: "SaaS · Email + Docs" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "brian.kowalski · Exchange Admin", badge: "HIGH", alert: true },
      ],
      edges: [{ label: "has access to" }, { label: "has config" }] },
    matchedCondition: `App: Microsoft 365 · User: brian.kowalski@company.com (Exchange Administrator role) · Config: MFA_Enabled = False`,
    evidence: [
      "Brian Kowalski (brian.kowalski@company.com) holds Exchange Administrator role in M365",
      "Exchange Admin: can access all mailboxes, create inbox rules, perform eDiscovery",
      "No MFA — password alone sufficient for full email infrastructure access",
    ],
    rationale: "Exchange Administrators can create forwarding rules to exfiltrate all company email, perform legal hold searches, and access any employee's mailbox. MFA absence is a critical control gap.",
    action: [
      { text: "Enable MFA for Brian Kowalski — send Authenticator app enrollment link." },
      { text: "Audit Brian Kowalski's Exchange Admin activities in the last 90 days for any unusual mailbox access." },
      { text: "Review whether Analyst role requires Exchange Administrator — likely over-provisioned." },
    ] },
  {
    id: "FND-2024-5106", ruleId: "r-op-01", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "data-sync-bot", sublabel: "Service Account · Data Integration" },
        { type: "store",  label: "Salesforce Sandbox", sublabel: "SaaS · Dev/Test" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "data-sync-bot · System Administrator", badge: "MEDIUM", alert: false },
      ],
      edges: [{ label: "has access to" }, { label: "has config" }] },
    matchedCondition: `App: Salesforce Sandbox · User: data-sync-bot · Config: MFA = False · Sandbox contains production data clone (PII)`,
    evidence: [
      "Service account: Data Sync Bot (data-sync-bot) has System Admin on Salesforce Sandbox",
      "Sandbox was refreshed from production 30 days ago — contains real customer PII",
      "Sandboxes with production data clones carry same compliance requirements as production",
    ],
    rationale: "Sandbox environments refreshed from production inherit the same data sensitivity. Admin access without MFA to a sandbox with real customer data is a compliance gap equivalent to production.",
    action: [
      { text: "Enable MFA for Data Sync Bot on Salesforce Sandbox." },
      { text: "Anonymize production data before sandbox refresh — use Salesforce Data Mask." },
      { text: "Audit all Salesforce sandbox environments for production PII." },
    ] },
  {
    id: "FND-2024-5107", ruleId: "r-op-01", severity: "High", status: "Open",
    detectedAt: "8 days ago", lastSeenAt: "8 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Alice Chen", sublabel: "Data Engineer · Engineering" },
        { type: "store",  label: "GitHub Organization", sublabel: "SaaS · Source Control" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "alice.chen · Organization Owner", badge: "HIGH", alert: true },
      ],
      edges: [{ label: "has access to" }, { label: "has config" }] },
    matchedCondition: `App: GitHub · User: alice.chen@company.com (Org Owner, inherited from initial setup) · Config: MFA = False · Org Owner role likely unintentional`,
    evidence: [
      "Alice Chen (alice.chen@company.com) has Organization Owner role — appears to be left over from initial repo setup",
      "No MFA on this account despite Org Owner privileges",
      "Last owner-level action: 6 months ago — role likely no longer needed",
    ],
    rationale: "Stale Organization Owner roles without MFA represent a privilege creep risk. If Alice Chen's account is compromised, the attacker inherits full organizational control.",
    action: [
      { text: "Remove Alice Chen's Org Owner role — downgrade to Member." },
      { text: "If Owner role is needed: enable MFA first, then restore role." },
      { text: "Audit GitHub Org Owner list — should have ≤ 3 named owners, all with MFA." },
    ] },
  {
    id: "FND-2024-5108", ruleId: "r-op-01", severity: "Critical", status: "Open",
    detectedAt: "9 days ago", lastSeenAt: "9 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-payment-proc", sublabel: "Service Account · Finance" },
        { type: "store",  label: "Microsoft 365", sublabel: "SaaS · Email + Docs" },
        { type: "config", label: "MFA_Enabled = False", sublabel: "svc-payment-proc · Global Administrator", badge: "CRITICAL", alert: true },
      ],
      edges: [{ label: "has access to" }, { label: "has config" }] },
    matchedCondition: `App: Microsoft 365 · User: svc-payment-proc (Global Administrator role) · Config: MFA_Enabled = False · Global Admin: highest privilege in M365 tenant`,
    evidence: [
      "CRITICAL: svc-payment-proc holds Global Administrator on M365 tenant — no MFA",
      "Global Admin can create accounts, reset all passwords, access all data, modify all settings",
      "A Finance service account holding Global Admin is both a privilege and audit concern",
    ],
    rationale: "Global Administrator without MFA is the most critical identity risk possible in an M365 environment. This single account, if compromised, enables complete tenant takeover including email, SharePoint, Azure AD, and Intune.",
    action: [
      { text: "Remove Global Admin role from svc-payment-proc IMMEDIATELY — this is a P0." },
      { text: "Assign purpose-scoped role (e.g., Billing Administrator) appropriate for a payment service account." },
      { text: "Enable MFA via Conditional Access for all accounts with any admin role." },
      { text: "Review Global Admin list — should be ≤ 3 break-glass accounts with hardware MFA." },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-st-03  Stale Sensitive Data Retained Beyond 1 Year  (DSPM, 12)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-6301", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "Detected 2 days ago", lastSeenAt: "Last accessed 487 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "PGSRV-LEGACY", sublabel: "PostgreSQL 13.8 · pg4" },
        { type: "file",   label: "users_archive_2021.table", sublabel: "487 days since last access", badge: "487 days", alert: true },
        { type: "config", label: "No Archival Policy", sublabel: "10 sensitive data types" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: pg4 "PGSRV-LEGACY" (PostgreSQL 13.8) · Table: users_archive_2021 · Last Access: 487 days ago · Contains: Social Security Numbers, Driver Licenses, National IDs, Passports, Payment Cards (10 sensitive data types) · No retention policy applied`,
    evidence: [
      "Table: public.users_archive_2021 (2.3 GB, 1.4M rows)",
      "Last accessed: 2023-01-22 (487 days ago) — no reads or writes since",
      "Data types: Social Security Numbers (1.4M), Driver Licenses (890K), Passports (124K), Payment Cards (340K)",
      "Server: PGSRV-LEGACY (PostgreSQL 13.8, EOL — no security patches since Nov 2023)",
      "No retention or archival policy applied to this table",
    ],
    rationale: "1.4 million Social Security Numbers and 340K payment card numbers sitting in a legacy, unpatched PostgreSQL server with no retention policy for 487 days is both a compliance violation and an unmitigated data breach risk.",
    action: [
      { text: "Tag table for archival — send email to data owner (ops-team@company.com) requesting review." },
      { text: "Apply 90-day archival deadline: export encrypted backup, delete table from live server." },
      { text: "Upgrade PGSRV-LEGACY to PostgreSQL 16 or decommission — running EOL software with sensitive data." },
      { text: "Evaluate if this data can be permanently deleted (check legal hold requirements)." },
    ] },
  {
    id: "FND-2024-6302", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "Detected 1 day ago", lastSeenAt: "Last accessed 412 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "prod-data-lake", sublabel: "AWS S3 · acme-prod.s3.us-east-1.amazonaws.com" },
        { type: "file",   label: "s3://prod-data-lake/archive/pii-export-2022-09/", sublabel: "412 days since last access", badge: "412 days", alert: true },
        { type: "config", label: "No Lifecycle Policy", sublabel: "8 sensitive data types" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: s1 "prod-data-lake" (AWS S3) · Prefix: /archive/pii-export-2022-09/ · Last Access: 412 days ago · 847 objects, 14.2 GB · Contains Sensitive DLP match (PII, PHI) · No S3 Lifecycle Rule applied`,
    evidence: [
      "S3 prefix: s3://prod-data-lake/archive/pii-export-2022-09/ — 847 objects, 14.2 GB",
      "Last access: 2022-09-30 (412 days ago) — no GetObject calls since",
      "Data types: Personal Names, Social Security Numbers, Healthcare IDs, Birthdates, Postal Addresses, Medical Records",
      "No S3 Lifecycle Rule configured for this prefix — data will persist indefinitely",
      "Estimated annual storage cost: $328/month (Intelligent Tiering would save ~80%)",
    ],
    rationale: "14.2 GB of PII/PHI that hasn't been accessed in over a year represents both a compliance liability (unnecessary retention of sensitive data) and an unnecessary cost. Under GDPR storage limitation principle, data should not be kept longer than necessary.",
    action: [
      { text: "Tag prefix with 'archival-candidate' — email data owner (data-team@company.com)." },
      { text: "Apply S3 Lifecycle Rule: transition to Glacier Instant Retrieval after 30 days, expire after 365." },
      { text: "Before deletion: verify no legal hold, regulatory retention, or audit requirement covers this data." },
      { text: "Run full DLP scan on all /archive/ prefixes in prod-data-lake for similar stale PII." },
    ] },
  {
    id: "FND-2024-6303", ruleId: "r-st-03", severity: "High", status: "Rescan",
    detectedAt: "Detected 5 days ago", lastSeenAt: "Last accessed 531 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "compliance-archive", sublabel: "Azure Blob · ab1" },
        { type: "file",   label: "hr-records-2020-backup.zip", sublabel: "531 days since last access", badge: "531 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "6 sensitive data types" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: ab1 "compliance-archive" (Azure Blob) · Blob: hr-records-2020-backup.zip (4.1 GB) · Last Modified: 531 days ago, Last Access: 531 days ago · Contains: Social Security Numbers, Passports, Financial IDs, Postal Addresses`,
    evidence: [
      "Blob: hr-records-2020-backup.zip (4.1 GB) in compliance-archive container",
      "Last accessed: 531 days ago — no reads since initial upload",
      "Content: 2020 HR records backup with Social Security Numbers, Passports, Financial IDs",
      "Container has no Azure Blob Lifecycle Management policy",
    ],
    rationale: "HR records from 2020 stored as a backup zip for 531 days without any access suggests this is genuinely orphaned data. Given GDPR's storage limitation principle, retaining 4-year-old HR records without a legal basis is a violation.",
    action: [
      { text: "Send archival notice to HR data owner — request confirmation of legal retention basis." },
      { text: "If no legal basis: delete blob and document deletion for GDPR Article 17 compliance." },
      { text: "Apply Azure Blob Lifecycle Management: auto-tier to Archive after 90 days, expire after 2 years." },
    ] },
  {
    id: "FND-2024-6304", ruleId: "r-st-03", severity: "Medium", status: "Open",
    detectedAt: "Detected 3 days ago", lastSeenAt: "Last accessed 398 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "ORACLEDB-PROD-02", sublabel: "Oracle 19c · ora2" },
        { type: "file",   label: "patient_records_hist.table", sublabel: "398 days since last access", badge: "398 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "6 data types (PHI)" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: ora2 "ORACLEDB-PROD-02" · Table: patient_records_hist · Last Access: 398 days · Contains: Medical Records, Healthcare IDs, Birthdates, Gender (HIPAA PHI)`,
    evidence: [
      "Oracle table: patient_records_hist (890 MB, 234K rows)",
      "Last read: 398 days ago — historical patient data, no active use",
      "PHI categories: Medical Records, Healthcare IDs, Medical Diagnoses, Gender, Birthdates",
      "HIPAA: PHI retention limit is typically 6 years from creation or last use",
    ],
    rationale: "Stale PHI data retained beyond clinical necessity violates HIPAA's Minimum Necessary standard. This data should be assessed against the 6-year PHI retention limit and either archived or deleted.",
    action: [
      { text: "Flag for HIPAA records retention review — determine original creation date and 6-year limit." },
      { text: "If past retention limit: coordinate with Privacy Officer for documented destruction." },
      { text: "If within retention limit: encrypt, archive to offline storage, and remove from active database." },
    ] },
  {
    id: "FND-2024-6305", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "Detected 4 days ago", lastSeenAt: "Last accessed 445 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "acme-prod-hr", sublabel: "Azure SQL · asql2" },
        { type: "file",   label: "terminated_employees_2021", sublabel: "445 days since last access", badge: "445 days", alert: true },
        { type: "config", label: "No Archival Tag", sublabel: "8 data types (PII + PHI)" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: asql2 "acme-prod-hr" (Azure SQL) · Table: terminated_employees_2021 · Last Access: 445 days · Contains: Social Security Numbers, Birthdates, Gender, Healthcare IDs, Postal Addresses`,
    evidence: [
      "Azure SQL table: terminated_employees_2021 (240 MB, 1,847 rows)",
      "Contains records of employees terminated in 2021 — 445 days since last access",
      "Data: Social Security Numbers, Birthdates, Gender, Ethnicity, Healthcare IDs — full HR profile",
      "No data retention schedule associated with terminated employee records",
    ],
    rationale: "Terminated employee records with Social Security Numbers and health data sitting in a production HR database for 445 days with no retention schedule violates both GDPR and employment data retention norms.",
    action: [
      { text: "Tag table for HR compliance review — coordinate with HR and Legal for retention basis." },
      { text: "Archive to offline, encrypted storage (encrypted backup on Azure Blob, cold tier)." },
      { text: "Delete from production HR database after archival confirmation." },
      { text: "Establish terminated employee data retention policy: define 7-year limit for legal compliance." },
    ] },
  {
    id: "FND-2024-6306", ruleId: "r-st-03", severity: "Medium", status: "Closed",
    detectedAt: "Detected 1 week ago", lastSeenAt: "Last accessed 367 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "Finance Team Drive", sublabel: "Google Drive · acme-finance.google.com" },
        { type: "file",   label: "2022_Tax_Filing_Records.zip", sublabel: "367 days since last access", badge: "367 days", alert: true },
        { type: "config", label: "No Retention Label", sublabel: "5 data types (PII + PFI)" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Drive: acme-finance.google.com "Finance Team Drive" · File: 2022_Tax_Filing_Records.zip · Last Access: 367 days · Contains: Social Security Numbers, Taxpayer IDs, Financial IDs, Bank Account Information`,
    evidence: [
      "File: 2022_Tax_Filing_Records.zip (1.7 GB) in Finance Team Drive",
      "Last accessed: 367 days ago (post-filing season, no subsequent access)",
      "Contains: employee and vendor Social Security Numbers, Taxpayer IDs, W-2 data, bank account numbers",
      "Tax records: 7-year retention required by IRS — but after that, should be deleted",
    ],
    rationale: "Tax filing records are subject to mandatory 7-year retention, but the data should be in a structured records management system — not a shared Google Drive with broad team access.",
    action: [
      { text: "Verify filing year: if 2022 taxes, retention required until 2029 — do not delete." },
      { text: "Move to dedicated tax records archive with restricted access (Finance Director + Auditors only)." },
      { text: "Remove from shared Finance Team Drive where 31 team members have access." },
    ] },
  {
    id: "FND-2024-6307", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "Detected 6 days ago", lastSeenAt: "Last accessed 502 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "ml-training-data", sublabel: "AWS S3 · s3" },
        { type: "file",   label: "s3://ml-training-data/raw/pii-labeled-dataset-v1/", sublabel: "502 days since last access", badge: "502 days", alert: true },
        { type: "config", label: "No Lifecycle Rule", sublabel: "8 sensitive types (PHI + Biometric)" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: s3 "ml-training-data" · Prefix: /raw/pii-labeled-dataset-v1/ · Last Access: 502 days · Contains: Biometric Data, Medical Records, Personal Names — PII-labeled ML training set`,
    evidence: [
      "S3 prefix: s3://ml-training-data/raw/pii-labeled-dataset-v1/ — 2,341 objects, 89.4 GB",
      "ML training dataset containing real PII — should have been anonymized before use",
      "Last accessed: 502 days ago — dataset appears abandoned after initial model training",
      "Biometric data (fingerprints, face embeddings) cannot be anonymized retroactively",
    ],
    rationale: "ML training datasets containing real patient biometric data that have been abandoned for 502 days are a significant long-term liability. Biometric data under GDPR Article 9 must be processed with explicit consent and minimized.",
    action: [
      { text: "Immediate archival action: move to S3 Glacier with encryption." },
      { text: "File data incident report — assess whether consent was obtained for using real biometrics in ML training." },
      { text: "Delete original objects from standard S3 tier after Glacier copy confirmed." },
      { text: "Require ML team to use synthetic or anonymized data for all future training sets." },
    ] },
  {
    id: "FND-2024-6308", ruleId: "r-st-03", severity: "Medium", status: "Open",
    detectedAt: "Detected 3 days ago", lastSeenAt: "Last accessed 389 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "ORACLEDB-LEGACY", sublabel: "Oracle 12c · ora3" },
        { type: "file",   label: "customer_data_2019.table", sublabel: "389 days since last access", badge: "389 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "11 data types" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: ora3 "ORACLEDB-LEGACY" (Oracle 12c, EOL) · Table: customer_data_2019 · Last Access: 389 days · 11 sensitive data types including Passports, Driver Licenses, National IDs`,
    evidence: [
      "Oracle 12c Legacy (EOL since July 2022) — no security patches",
      "Table: customer_data_2019 (14.7 GB, 8.2M rows) — 5-year-old customer records",
      "Data types: Passports, Driver Licenses, National IDs, Payment Cards, Bank Account Numbers",
      "Running on EOL database software with sensitive data is a compounding vulnerability",
    ],
    rationale: "5-year-old customer data on an EOL Oracle 12c instance combines two critical risks: unnecessary data retention creating legal liability, and unpatched database software creating exploitability.",
    action: [
      { text: "Priority: assess if any data has legal retention basis — if not, initiate deletion workflow." },
      { text: "Upgrade or decommission ora3 — Oracle 12c is 3 years past end of life." },
      { text: "Migrate any legitimately retained data to current Oracle 19c (ora1) with encryption." },
    ] },
  {
    id: "FND-2024-6309", ruleId: "r-st-03", severity: "High", status: "Open",
    detectedAt: "Detected 2 days ago", lastSeenAt: "Last accessed 421 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "research-datasets", sublabel: "Azure Blob · ab3" },
        { type: "file",   label: "clinical-trial-raw-2021.parquet", sublabel: "421 days since last access", badge: "421 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "7 data types (PHI + Biometric)" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: ab3 "research-datasets" · Blob: clinical-trial-raw-2021.parquet (22 GB) · Last Access: 421 days · Contains: Medical Records, Biometric Data, Healthcare IDs`,
    evidence: [
      "Parquet file: clinical-trial-raw-2021.parquet (22 GB) — raw clinical trial data",
      "Clinical trial data typically requires 15-year retention (ICH E6 GCP) — but must be in regulated archive",
      "Last accessed 421 days ago — stored in general Azure Blob without regulatory controls",
    ],
    rationale: "Clinical trial raw data has specific regulatory archival requirements (ICH E6 Good Clinical Practice: 15 years). Keeping it in an uncontrolled Azure Blob without retention metadata violates GCP and likely EMA/FDA regulations.",
    action: [
      { text: "Move to a GCP/GLP-compliant archive system (e.g., Veeva Vault, Medidata) with proper audit trail." },
      { text: "Apply Azure Blob immutability policy: WORM lock for 15 years from trial completion date." },
      { text: "Notify regulatory affairs team — ensure this data is under proper regulatory custody." },
    ] },
  {
    id: "FND-2024-6310", ruleId: "r-st-03", severity: "Medium", status: "Open",
    detectedAt: "Detected 4 days ago", lastSeenAt: "Last accessed 374 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "analytics-warehouse", sublabel: "AWS RDS · rds3" },
        { type: "file",   label: "user_events_raw_2022.table", sublabel: "374 days since last access", badge: "374 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "5 data types" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: rds3 "analytics-warehouse" · Table: user_events_raw_2022 · Last Access: 374 days · Contains: Personal Names, Email Addresses, IP Addresses, Domain Names`,
    evidence: [
      "RDS table: user_events_raw_2022 (5.2 GB, 124M rows)",
      "Raw analytics events with full PII — not anonymized at ingestion",
      "Last accessed: 374 days — post-2022 analytics cycle, never cleaned up",
    ],
    rationale: "Raw analytics event tables with full PII should have a short retention window (typically 90 days) before anonymization or deletion. 374 days of uncleaned event data with Email Addresses and IPs violates GDPR's data minimization principle.",
    action: [
      { text: "Anonymize table: replace Email Addresses and names with hashed pseudonyms, drop IP to /24 subnet." },
      { text: "Establish analytics data retention SLA: raw events purged at 90 days, aggregates retained." },
    ] },
  {
    id: "FND-2024-6311", ruleId: "r-st-03", severity: "High", status: "Rescan",
    detectedAt: "Detected 5 days ago", lastSeenAt: "Last accessed 456 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "prod-users-db", sublabel: "AWS RDS · rds1" },
        { type: "file",   label: "deleted_users_archive.table", sublabel: "456 days since last access", badge: "456 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "8 data types (PII)" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: rds1 "prod-users-db" · Table: deleted_users_archive · Last Access: 456 days · Contains: Social Security Numbers, Email Addresses, Telephone Numbers, Passwords, Payment Cards`,
    evidence: [
      "RDS table: deleted_users_archive (1.1 GB, 67K rows) — accounts marked as deleted",
      "Retained in 'soft delete' state for 456 days — well beyond any reasonable grace period",
      "Contains: hashed passwords, Social Security Numbers, payment card tokens, Email Addresses",
      "GDPR Article 17: right to erasure — deleted users' data must actually be purged",
    ],
    rationale: "Soft-deleted user records retained for 456 days without a clear legal basis directly violates GDPR Article 17 (Right to Erasure). Any user who requested deletion and is still in this table is a live compliance violation.",
    action: [
      { text: "Identify users in deleted_users_archive who submitted GDPR erasure requests — purge immediately." },
      { text: "Define soft-delete retention policy: 30-day grace period, then hard delete." },
      { text: "Implement automated deletion job to purge soft-deleted accounts older than 30 days." },
    ] },
  {
    id: "FND-2024-6312", ruleId: "r-st-03", severity: "Medium", status: "Open",
    detectedAt: "Detected 1 week ago", lastSeenAt: "Last accessed 395 days ago",
    topology: {
      nodes: [
        { type: "store",  label: "acme-analytics-dw", sublabel: "Azure SQL · asql3" },
        { type: "file",   label: "marketing_attribution_2022.table", sublabel: "395 days since last access", badge: "395 days", alert: true },
        { type: "config", label: "No Retention Policy", sublabel: "4 data types" },
      ],
      edges: [{ label: "contains" }, { label: "missing" }] },
    matchedCondition: `Resource: asql3 "acme-analytics-dw" · Table: marketing_attribution_2022 · Last Access: 395 days · Contains: Personal Names, Email Addresses, IP Addresses, Company Names`,
    evidence: [
      "Azure SQL table: marketing_attribution_2022 (340 MB, 2.1M rows)",
      "Marketing attribution data with customer PII — 2022 campaign data, never cleaned",
      "Last accessed: 395 days ago — analytics team moved to 2023+ data",
    ],
    rationale: "2-year-old marketing attribution data with customer Email Addresses and IPs has no ongoing business necessity. Under GDPR's storage limitation principle, this should have been anonymized or deleted after the campaign analysis was complete.",
    action: [
      { text: "Anonymize: replace Email Addresses with hashed IDs, drop IPs, remove Personal Names." },
      { text: "Archive anonymized aggregate insights and delete raw PII records." },
      { text: "Implement marketing data retention policy: raw campaign data purged 180 days post-campaign." },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-fe-01  Leaver Anomaly (Mass Download)  (Endpoint, 3)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-7101", ruleId: "r-fe-01", severity: "Critical", status: "Open",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "Brian Kowalski", sublabel: "Analyst · Analytics · LEAVER" },
        { type: "activity", label: "847 files downloaded", sublabel: "2.3 GB in 18 minutes", badge: "ANOMALOUS", alert: true },
        { type: "device",   label: "SanDisk Ultra USB 3.0", sublabel: "Removable Media · Unencrypted" },
      ],
      edges: [{ label: "performed" }, { label: "transferred to" }] },
    matchedCondition: `User: brian.kowalski@company.com tagged "Resigning — notice given 2024-12-01" · Activity: 847 file downloads (2.3 GB) in 18 minutes on 2024-12-02 · Peripheral: SanDisk Ultra USB 3.0 inserted 4 min after download completed; 2.1 GB written to removable media · Sources: Google Drive acme-finance.google.com (Finance), SharePoint acme-legal.sharepoint.com (Legal)`,
    evidence: [
      "User: brian.kowalski@company.com — submitted resignation 2024-12-01, last day 2024-12-15",
      "Activity: 847 files downloaded in 18 minutes (2024-12-02 09:14–09:32 AM) — baseline is 3–8 files/day",
      "Sources: Finance Team Drive (d2) — 612 files; Legal Contracts (sp1) — 235 files (financial reports, vendor contracts, payroll exports)",
      "Peripheral: SanDisk Ultra USB 3.0 inserted at 09:36 AM — 4 minutes after download completed; 2.1 GB written to removable media",
      "USB device serial: 4C530001231220117410 — not registered in corporate device inventory",
    ],
    rationale: "847 files downloaded in 18 minutes by a user who gave notice the day prior, followed four minutes later by transfer of 2.1 GB to an unregistered USB drive, is a near-certain insider exfiltration event. Moving data to unencrypted removable media bypasses all cloud DLP controls and creates an unrecoverable physical copy.",
    action: [
      { text: "Escalate to Insider Threat team and HR immediately — P1 incident." },
      { text: "Revoke Brian's access to Google Drive, SharePoint, and all SaaS apps TODAY — do not wait until last day." },
      { text: "Seize ThinkPad X1 (ep2) and USB device — forensic chain of custody required; do not allow Brian to clear desk unsupervised." },
      { text: "Notify Legal — serve data preservation notice before offboarding; assess trade secret and PII exposure." },
      { text: "Block all unregistered USB devices at endpoint policy level for the Analytics org pending investigation." },
    ] },
  {
    id: "FND-2024-7102", ruleId: "r-fe-01", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-etl (user acct)", sublabel: "Local User · System · OFFBOARDING" },
        { type: "activity", label: "pg_dump executed", sublabel: "Full database export · 4.8 GB", badge: "ANOMALOUS", alert: true },
        { type: "device",   label: "SanDisk Ultra USB 3.0", sublabel: "Removable Media · Unencrypted" },
      ],
      edges: [{ label: "executed" }, { label: "transferred to" }] },
    matchedCondition: `User: svc_etl (local account, departure scheduled) · Activity: pg_dump of prod_users_db (4.8 GB full dump) · Time: 23:42 (off-hours) · Peripheral: SanDisk Ultra USB 3.0 connected at 23:51 on PGSRV-PROD-01; 4.8 GB write to removable media confirmed`,
    evidence: [
      "Local account svc_etl executed pg_dump at 23:42 off-hours — dump file written to /tmp/dump.sql (non-standard backup path)",
      "Exported: full production users database (4.8 GB, all tables including Social Security Numbers, payment cards)",
      "Peripheral: SanDisk Ultra USB 3.0 connected to PGSRV-PROD-01 at 23:51 — 9 minutes after dump completed; 4.8 GB write to removable media confirmed by Endpoint DLP",
      "USB device serial: 4C53000198041220102A — not registered in corporate device inventory",
    ],
    rationale: "A full production database dump executed off-hours by a departing account, followed nine minutes later by a complete transfer to an unregistered USB drive, leaves no ambiguity about intent. The 4.8 GB payload contains Social Security Numbers, payment cards, and passport data — the most severe possible data class combination for a single exfiltration event.",
    action: [
      { text: "Escalate to Security Incident Response immediately — seize PGSRV-PROD-01 and USB device if still connected." },
      { text: "Disable svc_etl account across all systems and revoke all associated API keys and SSH certificates." },
      { text: "Preserve /tmp/dump.sql in place — forensic copy required before any cleanup; establish chain of custody." },
      { text: "Audit PGSRV-PROD-01 access logs for the 30 days prior — determine if this was a one-time event or part of a pattern." },
      { text: "Notify DPO and Legal — Social Security Numbers + payment card exposure triggers mandatory breach notification evaluation under GDPR and PCI-DSS." },
    ] },
  {
    id: "FND-2024-7103", ruleId: "r-fe-01", severity: "High", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "Priya Nair", sublabel: "Contractor · External · CONTRACT ENDING" },
        { type: "activity", label: "312 files downloaded", sublabel: "890 MB in 34 minutes", badge: "ANOMALOUS", alert: true },
        { type: "device",   label: "HP LaserJet Pro MFP", sublabel: "Shared Network Printer · Floor 2" },
      ],
      edges: [{ label: "performed" }, { label: "printed via" }] },
    matchedCondition: `User: priya.nair@contractor.io — contract end date 2024-11-30 · Activity: 312 downloads in 34 minutes on 2024-11-29 · Peripheral: HP LaserJet Pro MFP (Floor 2) — 18 pages printed from BYOD MacBook including product roadmap and competitive analysis · Sources: Marketing Assets (d4), Product Roadmap (sp3)`,
    evidence: [
      "Contractor priya.nair@contractor.io — contract terminating next day (2024-11-30)",
      "312 files downloaded in 34 minutes from Marketing Assets (d4) and Product Roadmap SharePoint (sp3) — 890 MB total",
      "Peripheral: HP LaserJet Pro MFP (Floor 2) received 18-page print job from BYOD MacBook at 14:47 — 6 product roadmap slides, 8 competitive analysis pages, 4 customer contact sheets",
      "Device: unmanaged BYOD MacBook — no DLP agent, no MDM enrollment; digital copies unrecoverable",
    ],
    rationale: "A contractor bulk-downloading strategic files the day before contract end, then printing 18 pages of product roadmap and competitive intelligence to a shared office printer, is a dual-vector exfiltration pattern. The digital copies on an unmanaged BYOD device are outside corporate DLP reach; the physical printouts have already left the organization's custody.",
    action: [
      { text: "Revoke priya.nair@contractor.io access immediately — do not wait for contract end date." },
      { text: "Retrieve print job output from HP LaserJet Pro MFP (Floor 2) output tray if still accessible; pull secure print queue logs." },
      { text: "Contact contractor's employer — issue written data deletion demand for all downloaded files; preserve for legal hold." },
      { text: "Conduct NDA review with Legal — competitive analysis and product roadmap content likely qualifies as trade secret." },
      { text: "Policy: require MDM enrollment for all contractors before granting SharePoint/Drive access; block BYOD printing to shared printers." },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-cg-03  Sensitive Data Stores Missing Encryption at Rest  (DSPM, 10)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-8301", ruleId: "r-cg-03", severity: "Critical", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "customers_pii", sublabel: "1.4M rows · SSNs, Payment Cards", badge: "Sensitive", alert: true },
        { type: "store",  label: "PGSRV-LEGACY", sublabel: "PostgreSQL 13.8 · pg4" },
        { type: "config", label: "Encryption = Disabled", sublabel: "10 sensitive data types", badge: "UNENCRYPTED", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "missing encryption" }] },
    matchedCondition: `Resource: pg4 "PGSRV-LEGACY" (PostgreSQL 13.8) · Config: Data-at-rest encryption = Disabled (no tablespace encryption, no volume encryption) · Contains: Social Security Numbers, Driver Licenses, Passports, National IDs, Payment Cards (10 data types) · Severity: Critical`,
    evidence: [
      "Server: PGSRV-LEGACY — PostgreSQL 13.8 on bare metal, dc-east-rack1",
      "Encryption: None — no filesystem encryption, no tablespace encryption, no transparent data encryption",
      "Contains: Social Security Numbers (1.4M), Driver Licenses, Passports, Payment Cards — highest sensitivity",
      "Physical security: shared rack with other tenants — no full-disk encryption means physical access = data access",
      "PCI-DSS Requirement 3.4: cardholder data must be encrypted at rest",
    ],
    rationale: "An unencrypted legacy PostgreSQL server containing Social Security Numbers, payment cards, and passports is both a PCI-DSS and GDPR violation. Physical access to the server hardware or a disk failure recovery scenario could expose all data.",
    action: [
      { text: "Enable filesystem encryption: migrate to encrypted volume (AWS EBS encrypted or dm-crypt on bare metal)." },
      { text: "Enable PostgreSQL tablespace encryption (pgcrypto or upgrade to EE with TDE)." },
      { text: "As interim: encrypt most sensitive columns (Social Security Numbers, payment card) at application layer using AES-256." },
      { text: "File PCI-DSS compliance exception until remediated — notify QSA." },
    ] },
  {
    id: "FND-2024-8302", ruleId: "r-cg-03", severity: "Critical", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "CUSTOMER_IDENTITY", sublabel: "8.2M rows · Passports, National IDs", badge: "Sensitive", alert: true },
        { type: "store",  label: "ORACLEDB-LEGACY", sublabel: "Oracle 12c · ora3" },
        { type: "config", label: "Encryption = Disabled", sublabel: "11 sensitive data types", badge: "UNENCRYPTED", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "missing encryption" }] },
    matchedCondition: `Resource: ora3 "ORACLEDB-LEGACY" (Oracle 12c EOL) · Config: TDE (Transparent Data Encryption) = Not enabled · Contains: Social Security Numbers, Driver Licenses, Passports, Financial IDs, Payment Cards, National IDs (11 data types)`,
    evidence: [
      "Oracle 12c — TDE not configured, no column-level encryption",
      "11 sensitive data type categories — highest data sensitivity in the inventory",
      "EOL software (Oracle 12c: end of Extended Support July 2022) compound the risk",
      "8.2M rows of customer data completely unencrypted at rest",
    ],
    rationale: "The most sensitive database in the inventory (11 data types including passports and payment cards) running on EOL Oracle with no encryption at rest is a critical priority remediation.",
    action: [
      { text: "Emergency remediation plan: migrate to Oracle 19c (ora1) with TDE enabled." },
      { text: "Enable Oracle TDE on ora3 as interim measure (possible without data migration)." },
      { text: "PCI-DSS: open remediation ticket with QSA — payment card data must be encrypted within 90 days." },
    ] },
  {
    id: "FND-2024-8303", ruleId: "r-cg-03", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "network-telemetry-2024.parquet", sublabel: "IP/MAC address logs", badge: "Sensitive", alert: true },
        { type: "store",  label: "analytics-staging", sublabel: "AWS S3 · s2" },
        { type: "config", label: "KMS Key = Default (AWS-managed)", sublabel: "5 data types", badge: "WEAK ENCRYPTION", alert: false },
      ],
      edges: [{ label: "stored in" }, { label: "default encryption only" }] },
    matchedCondition: `Resource: s2 "analytics-staging" (AWS S3) · Config: Server-Side Encryption = SSE-S3 (AWS default keys) — not CMK/KMS · Contains: IP Addresses, MAC Addresses, UUIDs, Domain Names · Compliance: NIST requires customer-managed keys for sensitive data`,
    evidence: [
      "S3 bucket analytics-staging: encrypted with SSE-S3 (AWS-managed keys)",
      "Policy requirement: NIST 800-53 / SOC2 mandate customer-managed KMS keys for regulated data",
      "AWS-managed keys: AWS can decrypt — does not meet 'encryption in the customer's control' requirement",
      "Data types: network telemetry with IP/MAC addresses",
    ],
    rationale: "While SSE-S3 provides some protection, using AWS-managed keys means AWS can access the data without customer consent. For regulated data, customer-managed KMS keys (SSE-KMS with CMK) are required to maintain data control.",
    action: [
      { text: "Migrate S3 bucket encryption from SSE-S3 to SSE-KMS with customer-managed CMK." },
      { text: "Create KMS CMK with appropriate key policy (no AWS service access, only specific IAM roles)." },
      { text: "Enable S3 bucket policy to deny non-HTTPS and non-SSE-KMS uploads." },
    ] },
  {
    id: "FND-2024-8304", ruleId: "r-cg-03", severity: "High", status: "Rescan",
    detectedAt: "5 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "hr_employees_staging", sublabel: "SSNs, Healthcare IDs, Medical Records", badge: "Sensitive", alert: true },
        { type: "store",  label: "staging-hr-db", sublabel: "AWS RDS · rds4" },
        { type: "config", label: "Encryption = Disabled", sublabel: "8 sensitive data types", badge: "UNENCRYPTED", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "missing encryption" }] },
    matchedCondition: `Resource: rds4 "staging-hr-db" (AWS RDS PostgreSQL 15.4) · Config: StorageEncrypted = False · Contains: Social Security Numbers, Birthdates, Gender, Ethnicity, Healthcare IDs, Medical Records (8 data types)`,
    evidence: [
      "RDS instance rds4 staging-hr-db: StorageEncrypted = False",
      "Contains: full HR dataset clone from production (Social Security Numbers, healthcare data)",
      "Staging databases with production PII carry the same encryption requirements as production",
      "AWS RDS does not support enabling encryption on existing unencrypted instances — requires snapshot + restore",
    ],
    rationale: "A staging HR database with real Social Security Numbers and medical records that is unencrypted violates the same HIPAA and GDPR requirements as production. Staging environments are often the weakest link because they receive production data clones.",
    action: [
      { text: "Encrypt rds4: take snapshot → encrypt → restore to new encrypted instance → rename." },
      { text: "Immediately update connection strings in all staging services." },
      { text: "Anonymize staging data: staging-hr-db should use synthetic data — not production clone." },
    ] },
  {
    id: "FND-2024-8305", ruleId: "r-cg-03", severity: "High", status: "Open",
    detectedAt: "6 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "payment-receipts-2024.csv", sublabel: "Payment Cards, Personal Names", badge: "PCI", alert: true },
        { type: "store",  label: "customer-uploads", sublabel: "Azure Blob · ab2" },
        { type: "config", label: "Encryption = Microsoft-managed keys", sublabel: "5 data types", badge: "WEAK ENCRYPTION", alert: false },
      ],
      edges: [{ label: "stored in" }, { label: "default encryption only" }] },
    matchedCondition: `Resource: ab2 "customer-uploads" (Azure Blob) · Config: Encryption = Microsoft-managed keys (not Customer-managed CMK) · Contains: Personal Names, Email Addresses, Payment Cards, Telephone Numbers`,
    evidence: [
      "Azure Blob customer-uploads: encrypted with Microsoft-managed keys",
      "Payment Cards present — PCI-DSS requires customer-controlled encryption keys",
      "Microsoft-managed keys do not satisfy 'bring your own key' (BYOK) compliance requirement",
      "Azure Key Vault CMK available but not configured",
    ],
    rationale: "Payment card data in Azure Blob encrypted only with Microsoft-managed keys does not meet PCI-DSS key management requirements. Customer-managed keys (CMK) in Azure Key Vault are required.",
    action: [
      { text: "Configure Azure Key Vault with CMK for customer-uploads blob container." },
      { text: "Re-encrypt blob container using Customer-Managed Key (CMK) rotation." },
      { text: "Enable Azure Key Vault RBAC — ensure only payment processing services can access the CMK." },
    ] },
  {
    id: "FND-2024-8306", ruleId: "r-cg-03", severity: "Critical", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "payment_transactions", sublabel: "SSNs, Payment Cards in plaintext", badge: "PCI", alert: true },
        { type: "store",  label: "PGSRV-PROD-01", sublabel: "PostgreSQL 16.2 · pg1" },
        { type: "config", label: "Column Encryption = None", sublabel: "9 sensitive data types", badge: "PARTIAL", alert: true },
      ],
      edges: [{ label: "stored in" }, { label: "unencrypted sensitive columns" }] },
    matchedCondition: `Resource: pg1 "PGSRV-PROD-01" (PostgreSQL 16.2) · Config: Volume encrypted (dm-crypt AES-256) ✓ BUT column-level encryption for Social Security Numbers, Payment Cards, Bank Accounts = None · Contains 9 sensitive data types`,
    evidence: [
      "pg1 PGSRV-PROD-01: volume-level encryption present (dm-crypt AES-256) — PASS",
      "Column-level check: Social Security Numbers column = VARCHAR plaintext, payment_card = VARCHAR plaintext",
      "Risk: any DBA or user with SELECT access can read Social Security Numbers and payment cards in plaintext",
      "PCI-DSS Requirement 3.5: cardholder data must be protected with strong cryptography AND access controls",
    ],
    rationale: "Volume encryption alone doesn't protect against insider threats or compromised database accounts. Payment card and Social Security Numbers columns must also be protected at the column level so only authorized application processes can decrypt them.",
    action: [
      { text: "Implement column-level encryption: use pgcrypto or application-layer AES-256 for Social Security Numbers, payment card, bank account columns." },
      { text: "Audit current database users with SELECT access on these columns — remove unnecessary access." },
      { text: "Rotate application encryption keys to a KMS-managed key (HashiCorp Vault)." },
    ] },
  {
    id: "FND-2024-8307", ruleId: "r-cg-03", severity: "High", status: "Open",
    detectedAt: "8 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "customer_billing", sublabel: "Payment Cards, Email Addresses", badge: "PCI", alert: true },
        { type: "store",  label: "acme-prod-customers", sublabel: "Azure SQL · asql1" },
        { type: "config", label: "TDE = Enabled (Service-managed key)", sublabel: "6 data types", badge: "PARTIAL", alert: false },
      ],
      edges: [{ label: "stored in" }, { label: "weak key management" }] },
    matchedCondition: `Resource: asql1 "acme-prod-customers" · Config: TDE enabled with service-managed key — not Customer-Managed Key (CMK) · Contains: Payment Cards, Personal Names, Email Addresses, Postal Addresses`,
    evidence: [
      "Azure SQL TDE: enabled but using service-managed key",
      "Payment Cards present — PCI-DSS requires customer-controlled key management",
      "Azure SQL supports CMK via Azure Key Vault integration — not configured",
    ],
    rationale: "TDE with service-managed keys is better than no encryption, but for payment card data the key must be under the customer's control. Service-managed keys can be decrypted by Microsoft without customer involvement.",
    action: [
      { text: "Rotate TDE protector to Customer-Managed Key in Azure Key Vault." },
      { text: "Create Azure Key Vault with appropriate access policies (only SQL server managed identity)." },
      { text: "Document key rotation schedule (recommended: annual)." },
    ] },
  {
    id: "FND-2024-8308", ruleId: "r-cg-03", severity: "High", status: "Open",
    detectedAt: "9 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "orders_payment_detail", sublabel: "Payment Cards, Bank Accounts", badge: "PCI", alert: true },
        { type: "store",  label: "prod-orders-db", sublabel: "AWS RDS · rds2" },
        { type: "config", label: "Encryption = AWS-managed KMS key", sublabel: "6 data types", badge: "PARTIAL", alert: false },
      ],
      edges: [{ label: "stored in" }, { label: "weak key management" }] },
    matchedCondition: `Resource: rds2 "prod-orders-db" (AWS RDS MySQL 8.0) · Config: StorageEncrypted = True, KMS Key = aws/rds (AWS-managed) · Contains: Payment Cards, Bank Account Information, Financial IDs`,
    evidence: [
      "RDS rds2: encrypted with aws/rds AWS-managed key",
      "AWS-managed keys: key policy controlled by AWS — customer cannot restrict or audit access",
      "Payment cards require CMK where customer controls key policy",
    ],
    rationale: "For payment card data, AWS-managed KMS keys (aws/rds) do not provide sufficient control. A customer-managed CMK with an explicit key policy prevents AWS from decrypting the data.",
    action: [
      { text: "Create customer-managed CMK in AWS KMS with explicit key policy." },
      { text: "Re-encrypt rds2: take encrypted snapshot → copy with CMK → restore." },
      { text: "Update key policy: only rds2 IAM role and approved principals can use Decrypt." },
    ] },
  {
    id: "FND-2024-8309", ruleId: "r-cg-03", severity: "Medium", status: "Open",
    detectedAt: "10 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "tax-filings-archive-2023.zip", sublabel: "SSNs, Taxpayer IDs, Passports", badge: "Sensitive", alert: true },
        { type: "store",  label: "compliance-archive", sublabel: "Azure Blob · ab1" },
        { type: "config", label: "Encryption = Microsoft-managed keys", sublabel: "6 data types", badge: "WEAK ENCRYPTION", alert: false },
      ],
      edges: [{ label: "stored in" }, { label: "default encryption only" }] },
    matchedCondition: `Resource: ab1 "compliance-archive" · Config: Microsoft-managed encryption (not CMK) · Contains: Social Security Numbers, Taxpayer IDs, Passports, Financial IDs · Compliance: Internal policy requires CMK for archival data`,
    evidence: [
      "compliance-archive: encrypted with Microsoft-managed keys",
      "Archive contains: Social Security Numbers, Taxpayer IDs, Passports — highest sensitivity archival data",
      "Internal compliance policy: all archival stores with Taxpayer IDs must use CMK",
    ],
    rationale: "Compliance archives are long-lived and high-sensitivity. Using customer-managed keys ensures that even years later, the organization maintains full control over who can access the decryption key.",
    action: [
      { text: "Migrate compliance-archive encryption to CMK in Azure Key Vault." },
      { text: "Enable soft-delete and purge protection on the Key Vault key." },
      { text: "Document key escrow procedures for business continuity." },
    ] },
  // ══════════════════════════════════════════════════════════════════════════
  //  r-ex-06  Sensitive Data Upload to Unsanctioned Cloud Storage  (CASB Inline, 8)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-6601", ruleId: "r-ex-06", severity: "High", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Marcus Webb",        sublabel: "Sales Manager · Internal" },
        { type: "activity",    label: "File Upload",         sublabel: "4.2 MB · Customer Records", badge: "Blocked", alert: true },
        { type: "destination", label: "Dropbox (Personal)",  sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: Dropbox (personal account, not corporate instance) · User: marcus.webb@company.com · Content: 4.2 MB — Customer Names, Email Addresses, Company Names, Phone Numbers (CRM export) · Action: Blocked`,
    evidence: [
      "Marcus Webb (marcus.webb@company.com) uploading CRM export to personal Dropbox account (marcus.webb.personal@gmail.com)",
      "File: 'Q1-Customer-Pipeline-Export.xlsx' (4.2 MB, 1,847 customer records)",
      "Content matched: Customer Names (1,847), Email Addresses (1,847), Company Names (1,812), Phone Numbers (1,390)",
      "Destination: Dropbox app instance does not match sanctioned corporate Dropbox instance",
      "Policy: Block — Data Exfiltration · Cloud Storage (Personal) profile",
      "Session context: Marcus Webb had 3 similar upload attempts to personal cloud in the last 30 days",
    ],
    rationale: "A Sales Manager uploading a full CRM customer pipeline to a personal Dropbox account is a high-probability exfiltration event — commonly seen ahead of employee departures. The volume (1,847 records) and business context (pipeline data) make this a serious data leak risk regardless of intent.",
    action: [
      { text: "Block confirmed — notify Marcus Webb and Sales team manager immediately" },
      { text: "Initiate HR review: cross-reference with offboarding status or recent resignation signals" },
      { text: "Run retro scan on Marcus Webb's corporate OneDrive/Google Drive for additional sensitive exports", remediationAction: "restrict-access" },
      { text: "Restrict Marcus Webb's access to CRM bulk export functionality pending investigation", remediationAction: "restrict-access" },
      { text: "Legal hold on Marcus Webb's corporate data pending HR/Legal outcome", remediationAction: "legal-hold" },
    ] },
  {
    id: "FND-2024-6602", ruleId: "r-ex-06", severity: "High", status: "Open",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Jennifer Park",      sublabel: "Finance Analyst · Internal" },
        { type: "activity",    label: "File Upload",         sublabel: "9.8 MB · Financial Records", badge: "Blocked", alert: true },
        { type: "destination", label: "Box (Personal)",      sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: Box (personal box.com account, not corporate) · User: jennifer.park@company.com · Content: 9.8 MB — Financial IDs, Bank Account Information, Social Security Numbers (quarterly close data) · Action: Blocked`,
    evidence: [
      "Jennifer Park (jennifer.park@company.com) uploading quarterly close package to personal Box account",
      "Source: SharePoint 'finance-reports' site — file: 'Q4-Close-Package-2025.zip' (9.8 MB)",
      "Content matched: Financial IDs (312), Bank Account Information (87), Social Security Numbers (43 — employee W2 data)",
      "Destination: Box Personal account (jennifer.park@hotmail.com) — not the corporate Box tenant",
      "Context: Q4 close occurred 3 days ago; pattern consistent with 'working from home over the weekend'",
    ],
    rationale: "Finance close packages contain payroll, banking, and SSN data. Uploading a 9.8 MB close package from SharePoint to a personal Box account carries high exfiltration risk, especially with W2 employee data present — a potential SOX and GLBA compliance event.",
    action: [
      { text: "Block confirmed — notify Jennifer Park and CFO/Finance Controller" },
      { text: "Quarantine 'Q4-Close-Package-2025.zip' from SharePoint finance-reports pending review", remediationAction: "quarantine" },
      { text: "Run retro scan on finance-reports SharePoint site for other recent anomalous downloads" },
      { text: "Restrict external sharing on finance-reports SharePoint site to prevent future bypass", remediationAction: "revoke-external" },
      { text: "File SOX access control incident report — W2/SSN data exposure risk" },
    ] },
  {
    id: "FND-2024-6603", ruleId: "r-ex-06", severity: "High", status: "Rescan",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Carlos Mendes",          sublabel: "Strategy Consultant · External" },
        { type: "activity",    label: "File Upload",             sublabel: "2.1 MB · Strategic Plans", badge: "Blocked", alert: true },
        { type: "destination", label: "Google Drive (Personal)", sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: Google Drive (consumer drive.google.com, not corporate Workspace) · User: carlos.mendes@consulting.io · Content: 2.1 MB — Confidential strategic roadmap with financial projections · Action: Blocked`,
    evidence: [
      "External consultant: Carlos Mendes (carlos.mendes@consulting.io) uploading files to personal Google Drive",
      "File: 'ACME-3YR-Strategy-Confidential.pptx' (2.1 MB) — marked CONFIDENTIAL in file metadata",
      "Content: Financial projections ($420M revenue target), M&A targets, product roadmap for FY26-28",
      "Destination: Google consumer account (c.mendes.private@gmail.com) — NOT corporate Google Workspace",
      "Contractor's NDA and engagement agreement prohibit retaining corporate strategic data",
    ],
    rationale: "An external consultant uploading a 3-year confidential strategy deck to a personal Google account represents a serious IP exfiltration risk. Strategy decks with M&A targets and revenue figures are highly sensitive trade secrets; contractor data handling must be enforced at the policy layer.",
    action: [
      { text: "Block confirmed — notify Carlos Mendes, engagement manager, and Legal" },
      { text: "Review Carlos Mendes' contractor data handling agreement — potential NDA breach" },
      { text: "Audit all files accessed by Carlos Mendes during this engagement via CASB API retro scan" },
      { text: "Restrict Carlos Mendes' SharePoint/Drive access to specific project folder only", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2024-6604", ruleId: "r-ex-06", severity: "High", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Priya Nair",      sublabel: "Software Engineer · Internal" },
        { type: "activity",    label: "File Upload",      sublabel: "18.3 MB · Source Code Archive", badge: "Blocked", alert: true },
        { type: "destination", label: "WeTransfer",       sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: WeTransfer (wetransfer.com) · User: priya.nair@company.com · Content: 18.3 MB — Source code archive (ZIP) with API keys and connection strings · Action: Blocked`,
    evidence: [
      "Priya Nair (priya.nair@company.com) uploading 'backend-services-v2.zip' to WeTransfer",
      "Archive: 18.3 MB ZIP containing backend microservices source code",
      "DLP scan of ZIP contents: 14 AWS_ACCESS_KEY matches, 6 DB_PASSWORD matches, 3 JWT_SECRET matches",
      "WeTransfer: public file-sharing service — uploaded files accessible to anyone with the link",
      "No recipient email entered — file was set to 'Anyone with link' transfer mode",
      "Context: Priya cited intention to 'work from home laptop' — but no company laptop registered for her",
    ],
    rationale: "Source code containing AWS keys, DB passwords, and JWT secrets uploaded to a public WeTransfer link is a compounded risk: intellectual property exfiltration plus credential exposure on a public-link file-sharing platform. Files shared via WeTransfer links can be freely forwarded.",
    action: [
      { text: "Block confirmed — notify Priya Nair and Engineering team manager" },
      { text: "Rotate all credentials found in the archive: 14 AWS keys, 6 DB passwords, 3 JWT secrets" },
      { text: "Investigate Priya Nair's device registration — unregistered personal laptop risk" },
      { text: "Run retro scan on Engineering repositories for additional credential leakage" },
      { text: "Block WeTransfer at the network/proxy level for corporate devices", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2024-6605", ruleId: "r-ex-06", severity: "High", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "data-export-svc",    sublabel: "3rd Party App · External" },
        { type: "activity",    label: "Automated Upload",    sublabel: "52.4 MB · Customer Data Batch", badge: "Blocked", alert: true },
        { type: "destination", label: "Dropbox Business",   sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload (Automated/API) · App: Dropbox Business (unsanctioned tenant) · App: data-export-svc (3rd Party) · Content: 52.4 MB — PII batch including Email Addresses, Personal Names, Postal Addresses · Action: Blocked`,
    evidence: [
      "3rd party integration 'data-export-svc' (vendor: DataBridge Inc.) making automated Dropbox API upload",
      "Destination: Dropbox Business account not registered in company's sanctioned app list",
      "File: 'customer-export-2025-03-22.csv.gz' (52.4 MB compressed) — 98,000+ customer records estimated",
      "Upload scheduled via CRON at 03:00 UTC — automated, recurring, not user-initiated",
      "OAuth token: data-export-svc was granted Dropbox write access in 2023 — no review since",
      "Vendor DataBridge Inc.: active contract does not include authorization to store customer data in their own Dropbox",
    ],
    rationale: "A recurring automated upload of 98K+ customer records to an unauthorized third-party Dropbox is a critical Shadow IT data pipeline. This pattern bypasses all manual review and may have been running undetected for months — retroactive scan of the vendor's previous uploads is essential.",
    action: [
      { text: "Block confirmed — revoke data-export-svc OAuth token immediately", remediationAction: "revoke-external" },
      { text: "Audit DataBridge Inc. contract — does it permit their Dropbox storage of customer data?" },
      { text: "Request DataBridge Inc. confirm deletion of any previously transferred customer data" },
      { text: "Review all 3rd party app OAuth grants — identify other unsanctioned Dropbox connections", remediationAction: "restrict-access" },
      { text: "Initiate vendor security review for DataBridge Inc." },
    ] },
  {
    id: "FND-2024-6606", ruleId: "r-ex-06", severity: "Medium", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Thomas Brennan",  sublabel: "Legal Counsel · Internal" },
        { type: "activity",    label: "File Upload",      sublabel: "3.6 MB · Legal Documents", badge: "Blocked", alert: true },
        { type: "destination", label: "iCloud Drive",     sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: iCloud Drive (icloud.com, personal) · User: thomas.brennan@company.com · Content: 3.6 MB — Legal contracts with Personal Names, Tax IDs, Financial IDs · Action: Blocked`,
    evidence: [
      "Thomas Brennan (thomas.brennan@company.com) uploading legal contract bundle to personal iCloud",
      "File: 'Vendor-Contracts-Archive-Q1.zip' (3.6 MB) — 23 vendor agreements",
      "Contracts contain: Tax IDs (23), Financial IDs (87), Personal Names (156) — vendor signatories",
      "iCloud Drive: consumer Apple account, not an enterprise MDM-controlled endpoint",
      "Thomas cited reason: 'reviewing contracts from personal iPad over the weekend'",
    ],
    rationale: "Legal contracts containing Tax IDs and financial identifiers uploaded to a personal iCloud account create uncontrolled copies of privileged and sensitive data. Consumer cloud accounts lack enterprise access controls, audit trails, and retention policies.",
    action: [
      { text: "Block confirmed — notify Thomas Brennan and General Counsel" },
      { text: "Provide legal team with approved secure remote access options (VPN + SharePoint)" },
      { text: "Deploy Netskope Client on legal team's personal iOS devices for BYOD coverage", remediationAction: "apply-dlp" },
      { text: "Review iCloud Drive blocking policy — may need user education vs. hard block" },
    ] },
  {
    id: "FND-2024-6607", ruleId: "r-ex-06", severity: "Medium", status: "Rescan",
    detectedAt: "9 days ago", lastSeenAt: "9 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Alex Zhao",          sublabel: "Product Manager · Internal" },
        { type: "activity",    label: "File Upload",         sublabel: "1.4 MB · Product Roadmap", badge: "Warned", alert: true },
        { type: "destination", label: "Notion (Personal)",   sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "attempted to upload" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: Notion (personal workspace, not corporate Notion Enterprise) · User: alex.zhao@company.com · Content: 1.4 MB — Product roadmap with Financial Projections, Unreleased Product Names · Action: Warned`,
    evidence: [
      "Alex Zhao (alex.zhao@company.com) uploading product roadmap to personal Notion workspace",
      "File: 'FY26-Product-Roadmap-DRAFT.pdf' (1.4 MB) — unreleased product details, pricing strategy",
      "Content: Financial projections (ARR targets), 7 unreleased product codenames, competitive positioning",
      "Destination: Personal Notion workspace (alex.zhao@gmail.com) — not corporate Notion Enterprise tenant",
      "Policy: Warn (not block) — medium-sensitivity profile, productivity app category",
      "User acknowledged warning but proceeded — Marked for Rescan by reviewer",
    ],
    rationale: "Product roadmaps with unreleased feature names and ARR targets are material non-public information. Even a 'Warn' policy outcome is a risk when the user bypasses the warning — the intent to work in a personal Notion should be redirected to the corporate workspace.",
    action: [
      { text: "Escalate from Warn to Block for product roadmap classification uploads to unsanctioned apps" },
      { text: "Notify Alex Zhao and Head of Product — redirect to corporate Notion Enterprise workspace" },
      { text: "Review financial materiality of leaked roadmap content with Legal" },
      { text: "Apply DLP label 'Unreleased Product Info — Block Upload' to roadmap templates", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2024-6608", ruleId: "r-ex-06", severity: "High", status: "Closed",
    detectedAt: "12 days ago", lastSeenAt: "12 days ago",
    topology: {
      nodes: [
        { type: "identity",    label: "Sofia Torres",    sublabel: "HR Business Partner · Internal" },
        { type: "activity",    label: "File Upload",      sublabel: "6.1 MB · HR Records", badge: "Allowed", alert: true },
        { type: "destination", label: "Mega.nz",          sublabel: "Cloud Storage · Unsanctioned" },
      ],
      edges: [{ label: "uploaded" }, { label: "to" }] },
    matchedCondition: `Activity: Upload · App: Mega.nz (mega.io) · User: sofia.torres@company.com · Content: 6.1 MB — Employee PII (SSNs, Salary, Performance reviews) · Action: Allowed (POLICY GAP — Mega.nz not on blocked-app list at time of upload; added retrospectively)`,
    evidence: [
      "Sofia Torres (sofia.torres@company.com) uploading HR data bundle to Mega.nz — UPLOAD SUCCEEDED",
      "File: 'Performance-Review-Cycle-2025-All-Staff.zip' (6.1 MB)",
      "Content: 432 employee records — Social Security Numbers (432), Salary data (432), Performance ratings (432)",
      "Mega.nz: end-to-end encrypted cloud storage — data may be unrecoverable once uploaded",
      "POLICY GAP: Mega.nz was not on the unsanctioned cloud storage block list; list updated 2 days after this event",
      "Sofia Torres acknowledged finding — stated use case was 'personal backup of HR work files'",
    ],
    rationale: "Mega.nz's end-to-end encryption means the company has no visibility into or ability to recover data once uploaded. 432 employee SSNs and salary records in a personal Mega.nz account is a direct GDPR/CCPA violation and a potential HR data breach requiring notification assessment.",
    action: [
      { text: "Acknowledged — GDPR/CCPA breach notification assessment completed; DPO notified" },
      { text: "Contact Mega.nz to request data deletion — limited recourse due to E2E encryption" },
      { text: "Sofia Torres completed remediation training; access to HR bulk export restricted", remediationAction: "restrict-access" },
      { text: "Mega.nz now blocked globally via Netskope policy — no further uploads possible" },
      { text: "HR team briefed on approved off-device access procedures (VPN + SharePoint only)" },
    ] },

  {
    id: "FND-2024-8310", ruleId: "r-cg-03", severity: "High", status: "Rescan",
    detectedAt: "11 days ago", lastSeenAt: "Ongoing",
    topology: {
      nodes: [
        { type: "file", label: "ACCOUNT_MASTER", sublabel: "SSNs, Payment Cards, Bank Accounts", badge: "PCI", alert: true },
        { type: "store",  label: "ORACLEDB-PROD-01", sublabel: "Oracle 19c · ora1" },
        { type: "config", label: "TDE = Wallet-managed key", sublabel: "8 data types", badge: "PARTIAL", alert: false },
      ],
      edges: [{ label: "stored in" }, { label: "weak key management" }] },
    matchedCondition: `Resource: ora1 "ORACLEDB-PROD-01" (Oracle 19c) · Config: TDE enabled with Oracle Wallet (local) key management — not HSM-backed · Contains: Social Security Numbers, Payment Cards, Bank Account Information, Postal Addresses (8 data types)`,
    evidence: [
      "Oracle 19c TDE: enabled with local Oracle Wallet — keystore on same server as database",
      "Wallet stored on /etc/oracle/wallet — accessible to root and oracle OS users",
      "Payment cards present — PCI-DSS: keys must be stored separately from encrypted data",
      "Recommendation: migrate to Oracle Key Vault (OKV) or HSM for proper key separation",
    ],
    rationale: "Storing TDE encryption keys in an Oracle Wallet on the same server as the encrypted database violates the fundamental principle of key separation. An attacker with server access can access both the data and the decryption key.",
    action: [
      { text: "Migrate Oracle Wallet to Oracle Key Vault (OKV) or an HSM (Thales, nCipher)." },
      { text: "As interim: move Wallet to a separate, hardened key management server." },
      { text: "Enable Wallet audit logging and access monitoring." },
    ] },

  // ══════════════════════════════════════════════════════════════════════════
  //  r-fe-02  Active Permissions Retained by Deleted Users  (DSPM, 8)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "FND-2024-7201", ruleId: "r-fe-02", severity: "Critical", status: "Open",
    detectedAt: "1 day ago", lastSeenAt: "1 day ago",
    topology: {
      nodes: [
        { type: "identity", label: "James Thornton",  sublabel: "Local User · IAM · DELETED", badge: "DELETED", alert: true },
        { type: "config",   label: "S3 Bucket Policy", sublabel: "1 orphaned principal still granted", badge: "STALE ACL", alert: true },
        { type: "store",    label: "prod-data-lake",  sublabel: "AWS S3 · s1" },
      ],
      edges: [{ label: "principal retained in" }, { label: "grants access to" }] },
    matchedCondition: `Identity: james.thornton@company.com — Status = DELETED in Okta (offboarded 2025-02-14) · Resource: s1 "prod-data-lake" (AWS S3) · Bucket Policy: Principal = arn:aws:iam::123456789012:user/james.thornton still present with s3:GetObject, s3:ListBucket · Contains: Social Security Numbers, Personal Names, Email Addresses, Birthdates`,
    evidence: [
      "User james.thornton@company.com — deleted from Okta and AWS IAM on 2025-02-14 (offboarding completed)",
      "S3 Bucket Policy: arn:aws:iam::123456789012:user/james.thornton appears in 'Principal' with Effect = Allow, Actions = [s3:GetObject, s3:ListBucket]",
      "Policy was not revoked during offboarding — likely set manually outside the IAM role workflow",
      "Bucket 'prod-data-lake' contains: Social Security Numbers (2.3M rows), Personal Names, Email Addresses, Birthdates — highest sensitivity",
      "IAM user object is deleted but the explicit bucket policy principal reference persists as an orphaned ARN",
    ],
    rationale: "A deleted user's ARN in a bucket policy retains access even after the IAM user is removed — AWS resolves explicit principal ARNs at request time, so the policy itself is the live attack surface. Any attacker who recovers or recreates the same account name inherits this permission immediately.",
    action: [
      { text: "Remove arn:aws:iam::123456789012:user/james.thornton from prod-data-lake bucket policy immediately", remediationAction: "revoke-external" },
      { text: "Audit all S3 bucket policies for orphaned IAM user ARNs — automate via AWS Config rule 's3-bucket-policy-not-more-permissive'" },
      { text: "Enforce offboarding checklist: include 'revoke all explicit bucket policy principals' as a required step alongside IAM user deletion" },
      { text: "Apply SCPs to deny s3:PutBucketPolicy granting access to individual IAM user ARNs — require role-based access only", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2024-7202", ruleId: "r-fe-02", severity: "Critical", status: "Open",
    detectedAt: "3 days ago", lastSeenAt: "3 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "svc-reporting",  sublabel: "Service Account · AWS IAM · SUSPENDED", badge: "SUSPENDED", alert: true },
        { type: "config",   label: "IAM DB Auth Role", sublabel: "rds-db:connect privilege active", badge: "ORPHAN GRANT", alert: true },
        { type: "store",    label: "prod-users-db",  sublabel: "AWS RDS · rds1" },
      ],
      edges: [{ label: "retains DB auth via" }, { label: "can connect to" }] },
    matchedCondition: `Identity: svc-reporting — Status = SUSPENDED in IdP; IAM Role = arn:aws:iam::123456789012:role/svc-reporting-role still attached with rds-db:connect Resource = arn:aws:rds-db:us-east-1:123456789012:dbuser:rds1/svc_reporting · Resource: rds1 "prod-users-db" (AWS RDS PostgreSQL 15.4) · Contains: Personal Names, Email Addresses, Payment Cards, Birthdates`,
    evidence: [
      "svc-reporting IAM role suspended in IdP but IAM role and attached RDS IAM auth policy not revoked",
      "RDS IAM DB authentication: svc_reporting DB user still mapped to active IAM role — rds-db:connect permission persists",
      "prod-users-db (rds1): contains 4.1M user records including Payment Cards, Email Addresses, Birthdates",
      "Last connection by svc_reporting: 12 days ago — role was suspended 15 days ago; 3-day overlap with active sessions post-suspension",
      "No CloudTrail alert was generated because the IAM role was never disabled — only IdP status changed",
    ],
    rationale: "Suspending a service account in the IdP without revoking the linked AWS IAM role and RDS auth policy leaves a fully functional credential path. The service account's long-lived role session tokens may still be valid (up to 12 hours) even after IdP suspension.",
    action: [
      { text: "Detach IAM policy granting rds-db:connect from svc-reporting-role immediately", remediationAction: "revoke-external" },
      { text: "Disable svc_reporting PostgreSQL DB user: ALTER USER svc_reporting NOLOGIN on rds1" },
      { text: "Revoke all active IAM role session tokens for svc-reporting-role using IAM policy condition aws:TokenIssueTime" },
      { text: "Implement automated Lambda function triggered on IdP SUSPENDED events to detach all RDS IAM auth policies for service accounts", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2024-7203", ruleId: "r-fe-02", severity: "Critical", status: "Open",
    detectedAt: "4 days ago", lastSeenAt: "4 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "Lisa Park",      sublabel: "Local User · Azure AD · DELETED", badge: "DELETED", alert: true },
        { type: "config",   label: "RBAC Assignment", sublabel: "Storage Blob Data Contributor retained", badge: "STALE ROLE", alert: true },
        { type: "store",    label: "customer-uploads", sublabel: "Azure Blob · ab2" },
      ],
      edges: [{ label: "assignment retained on" }, { label: "grants read/write to" }] },
    matchedCondition: `Identity: lisa.park@company.com — Status = DELETED in Azure AD (offboarded 2025-03-01) · Resource: ab2 "customer-uploads" (Azure Blob) · RBAC: Role Assignment "Storage Blob Data Contributor" for deleted object ID still present — not auto-cleaned by Azure · Contains: Payment Cards, Personal Names, Email Addresses, Telephone Numbers`,
    evidence: [
      "lisa.park@company.com deleted from Azure AD on 2025-03-01; object ID f2a8c3... now shows as 'Unknown' in Azure RBAC",
      "Azure does NOT automatically remove RBAC assignments when a user is deleted — orphaned object ID remains in role assignment list",
      "Role: Storage Blob Data Contributor — grants read, write, and delete on all blobs in 'customer-uploads'",
      "customer-uploads (ab2): 1,847 customer records with Payment Cards, Personal Names, Email Addresses, Telephone Numbers",
      "Azure RBAC audit log shows the assignment was created 14 months ago by IT admin — never reviewed",
    ],
    rationale: "Azure does not automatically clean up RBAC role assignments when a user account is deleted. The orphaned assignment persists with the deleted object ID, and if the account is ever restored or a new account is created with the same UPN, the permissions may reactivate.",
    action: [
      { text: "Remove orphaned RBAC role assignment for deleted object ID f2a8c3... from 'customer-uploads'", remediationAction: "revoke-external" },
      { text: "Run Azure PowerShell: Get-AzRoleAssignment | Where-Object {$_.ObjectType -eq 'Unknown'} — bulk remove all orphaned assignments" },
      { text: "Enable Azure Policy 'Audit usage of custom RBAC roles' and add built-in policy to alert on Unknown ObjectType assignments" },
      { text: "Implement quarterly access review for all Azure Blob RBAC assignments using Azure AD Access Reviews", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2024-7204", ruleId: "r-fe-02", severity: "High", status: "Rescan",
    detectedAt: "2 weeks ago", lastSeenAt: "2 weeks ago",
    topology: {
      nodes: [
        { type: "identity", label: "Raj Mehta",        sublabel: "Local User · Azure AD · DELETED", badge: "DELETED", alert: true },
        { type: "config",   label: "DB Role Membership", sublabel: "db_datareader on 3 schemas", badge: "ORPHAN MEMBER", alert: true },
        { type: "store",    label: "acme-prod-hr",     sublabel: "Azure SQL · asql2" },
      ],
      edges: [{ label: "member retained in" }, { label: "grants SELECT on" }] },
    matchedCondition: `Identity: raj.mehta@company.com — Status = DELETED in Azure AD · Resource: asql2 "acme-prod-hr" (Azure SQL) · DB Role: raj.mehta is a member of db_datareader on schemas [hr, payroll, benefits] — user principal still present as contained database user · Contains: Social Security Numbers, Birthdates, Healthcare IDs, Salary Data, Personal Names`,
    evidence: [
      "raj.mehta@company.com deleted from Azure AD — however Azure SQL contained database user 'raj.mehta' was not dropped",
      "Azure SQL contained users linked to Azure AD can persist after the AD account is deleted — must be explicitly dropped",
      "DB role memberships: hr schema (db_datareader), payroll schema (db_datareader), benefits schema (db_datareader)",
      "acme-prod-hr (asql2): contains HR records for 3,200 employees — Social Security Numbers, salary bands, healthcare enrollment, Birthdates",
      "User last logged into Azure SQL: 22 days ago; AD deletion occurred 14 days ago — 8 days of post-deletion access window",
    ],
    rationale: "Azure SQL contained database users are independent of the Azure AD directory. Deleting the Azure AD account does not drop the SQL user or revoke their role memberships, leaving a read path to sensitive HR data open to anyone who can authenticate as the deleted account or reuse its session token.",
    action: [
      { text: "Drop contained database user: DROP USER [raj.mehta] in acme-prod-hr (asql2)", remediationAction: "revoke-external" },
      { text: "Audit all Azure SQL databases for contained users whose Azure AD backing accounts are deleted: sys.database_principals JOIN Azure AD Graph" },
      { text: "Automate offboarding: Azure Logic App triggered on Azure AD user deletion to enumerate and drop linked SQL contained users" },
      { text: "Replace individual contained users with Azure AD Group memberships — groups can be managed centrally without per-DB cleanup", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2024-7205", ruleId: "r-fe-02", severity: "Critical", status: "Open",
    detectedAt: "1 week ago", lastSeenAt: "1 week ago",
    topology: {
      nodes: [
        { type: "identity", label: "sarah.chen",  sublabel: "Local User · PostgreSQL · DELETED", badge: "DELETED", alert: true },
        { type: "config",   label: "TABLE GRANT", sublabel: "SELECT retained on 4 sensitive tables", badge: "ORPHAN GRANT", alert: true },
        { type: "store",    label: "PGSRV-PROD-01", sublabel: "PostgreSQL · pg1" },
      ],
      edges: [{ label: "privileges retained on" }, { label: "exposes records in" }] },
    matchedCondition: `Identity: sarah.chen — Status = DELETED in Okta/AD; PostgreSQL local role still active · Resource: pg1 "PGSRV-PROD-01" (PostgreSQL 16.2) · GRANT: SELECT on users, medical_records, billing, dependents retained for role sarah.chen · Contains: Social Security Numbers, Medical Records, Birthdates, Payment Cards`,
    evidence: [
      "sarah.chen deleted from Okta and Active Directory on 2025-03-08 — PostgreSQL local role was NOT dropped during offboarding",
      "PostgreSQL GRANT: SELECT privileges on 4 tables — users (1.4M rows), medical_records (890K rows), billing (1.1M rows), dependents (340K rows)",
      "All 4 tables contain high-sensitivity data: Social Security Numbers, Medical Records, Birthdates, Payment Cards",
      "PostgreSQL role sarah.chen still has LOGIN privilege with password hash — last login: 31 days ago",
      "HIPAA risk: Medical Records table access by a non-employee is a reportable PHI access event",
    ],
    rationale: "PostgreSQL roles and their GRANT privileges are completely decoupled from directory services. Terminating a user in the IdP leaves their PostgreSQL role — and all associated table grants — fully intact. Anyone with the old password or a recovered credential can log in to PGSRV-PROD-01 as sarah.chen and read Medical Records, Social Security Numbers, and payment data.",
    action: [
      { text: "Drop PostgreSQL role: DROP ROLE sarah.chen on pg1 (PGSRV-PROD-01)", remediationAction: "revoke-external" },
      { text: "Revoke all privileges first: REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM sarah.chen" },
      { text: "Audit PGSRV-PROD-01 pg_roles for all users not present in the corporate directory — report to Security for review" },
      { text: "Integrate PostgreSQL provisioning with IdP lifecycle events: automate DROP ROLE on user deactivation via HashiCorp Vault or Okta Workflows", remediationAction: "restrict-access" },
      { text: "File HIPAA breach assessment: sarah.chen had access to medical_records after employment termination — evaluate reportability" },
    ] },
  {
    id: "FND-2024-7206", ruleId: "r-fe-02", severity: "High", status: "Open",
    detectedAt: "5 days ago", lastSeenAt: "5 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "MWALTERS",         sublabel: "Local User · Oracle DB · SUSPENDED", badge: "SUSPENDED", alert: true },
        { type: "config",   label: "Schema Privileges", sublabel: "SELECT, EXECUTE on 6 objects retained", badge: "ACTIVE ORPHAN", alert: true },
        { type: "store",    label: "ORACLEDB-PROD-01", sublabel: "Oracle DB · ora1" },
      ],
      edges: [{ label: "privileges retained on" }, { label: "can query" }] },
    matchedCondition: `Identity: MWALTERS — Status = SUSPENDED in Active Directory (offboarded 2025-03-15) · Resource: ora1 "ORACLEDB-PROD-01" (Oracle 19c) · Object Privileges: SELECT on CUSTOMERS, PAYMENTS, ACCOUNTS; EXECUTE on PKG_BILLING, PKG_REPORTS; still granted to schema user MWALTERS · Contains: Payment Cards, Bank Account Information, Financial IDs, Personal Names`,
    evidence: [
      "MWALTERS suspended in Active Directory on 2025-03-15 — Oracle schema user not locked or expired during offboarding",
      "Oracle object privileges retained: SELECT on CUSTOMERS (2.1M rows), PAYMENTS (890K rows), ACCOUNTS (670K rows)",
      "Execute privileges on PKG_BILLING and PKG_REPORTS packages — these packages expose stored procedures that export payment card and account data",
      "MWALTERS Oracle account status: OPEN (not LOCKED/EXPIRED) — account can be logged into with correct password",
      "ORACLEDB-PROD-01 (ora1) contains: Payment Cards, Bank Account Information, Financial IDs — PCI-DSS scope",
    ],
    rationale: "Oracle object privileges are completely independent of directory services. A suspended AD account has no effect on Oracle schema users. MWALTERS can still log in to ORACLEDB-PROD-01 and execute privileged packages that directly export payment card and banking data, creating a PCI-DSS violation and insider threat risk.",
    action: [
      { text: "Lock Oracle account immediately: ALTER USER MWALTERS ACCOUNT LOCK EXPIRE PASSWORD on ora1", remediationAction: "revoke-external" },
      { text: "Revoke all object privileges: REVOKE SELECT ON CUSTOMERS, PAYMENTS, ACCOUNTS FROM MWALTERS; REVOKE EXECUTE ON PKG_BILLING, PKG_REPORTS FROM MWALTERS" },
      { text: "Audit Oracle audit trail for MWALTERS activity in the 30 days post-suspension — check for exports from PKG_BILLING/PKG_REPORTS" },
      { text: "Integrate Oracle provisioning with AD lifecycle: automate ALTER USER ACCOUNT LOCK on AD disable event via Oracle Identity Governance (OIG)", remediationAction: "restrict-access" },
    ] },
  {
    id: "FND-2024-7207", ruleId: "r-fe-02", severity: "Critical", status: "Open",
    detectedAt: "6 hours ago", lastSeenAt: "6 hours ago",
    topology: {
      nodes: [
        { type: "identity", label: "n.rodriguez",   sublabel: "Service Account · AWS IAM · DELETED", badge: "DELETED", alert: true },
        { type: "config",   label: "IAM Access Key", sublabel: "AKIA… active — 87 days since deletion", badge: "ACTIVE KEY", alert: true },
        { type: "store",    label: "ml-training-data", sublabel: "AWS S3 · s3" },
      ],
      edges: [{ label: "key grants access via" }, { label: "to sensitive objects in" }] },
    matchedCondition: `Identity: n.rodriguez — IAM user deleted 2024-12-31; Access Key AKIAIOSFODNN7EXAMPLE still in ACTIVE state · Resource: s3 "ml-training-data" (AWS S3) · Inline Policy: AllowS3ReadWrite grants s3:* on ml-training-data and 3 other buckets · Contains: National IDs, Passport Numbers, Social Security Numbers, Personal Names`,
    evidence: [
      "IAM user n.rodriguez deleted from AWS console on 2024-12-31 — however Access Key AKIAIOSFODNN7EXAMPLE was NOT deactivated before user deletion",
      "Key status: ACTIVE — AWS does not automatically deactivate access keys when a user is deleted if deletion was done via automation without key cleanup",
      "ml-training-data (s3): contains PII used in ML model training — National IDs (780K), Passport Numbers (340K), Social Security Numbers (1.1M), Personal Names",
      "Access key last used: 6 hours ago — active use detected TODAY, 87 days after account deletion",
      "CloudTrail shows API calls to s3:GetObject on ml-training-data originating from IP 185.220.101.x (Tor exit node) — potential malicious use",
    ],
    rationale: "An access key that survives the deletion of its parent IAM user becomes an orphaned, permanently-active credential with no owner. This key has been actively used today — 87 days after the IAM user was deleted — and the originating IP is a known Tor exit node, indicating the credential has been exfiltrated and is being actively exploited to extract ML training data containing over 2 million national IDs and SSNs.",
    action: [
      { text: "IMMEDIATE: Deactivate access key AKIAIOSFODNN7EXAMPLE via AWS CLI: aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive", remediationAction: "revoke-external" },
      { text: "Escalate to Security Incident Response — active Tor-origin API calls indicate the key has been exfiltrated; treat as active breach" },
      { text: "Block the originating IP range 185.220.101.0/24 at AWS network ACL level immediately; review CloudTrail for full scope of data accessed" },
      { text: "Enumerate all objects accessed via this key in the last 87 days using CloudTrail S3 data events — assess breach notification requirements for National IDs and Social Security Numbers" },
      { text: "Audit all IAM users deleted in the last 12 months for surviving active access keys: aws iam list-access-keys per deleted user", remediationAction: "apply-dlp" },
    ] },
  {
    id: "FND-2024-7208", ruleId: "r-fe-02", severity: "High", status: "Rescan",
    detectedAt: "2 days ago", lastSeenAt: "2 days ago",
    topology: {
      nodes: [
        { type: "identity", label: "etl-svc-prod",   sublabel: "Service Account · Azure AD · DELETED", badge: "DELETED", alert: true },
        { type: "config",   label: "POSIX ACL Entry", sublabel: "rwx retained on /sensitive (ADLS Gen2)", badge: "STALE ACL", alert: true },
        { type: "store",    label: "research-datasets", sublabel: "Azure Blob · ab3" },
      ],
      edges: [{ label: "ACL entry persists on" }, { label: "grants path access to" }] },
    matchedCondition: `Identity: etl-svc-prod (Service Principal, App ID b3f91a...) — Status = DELETED in Azure AD (2025-01-20) · Resource: ab3 "research-datasets" (Azure Data Lake Storage Gen2) · POSIX ACL: etl-svc-prod object ID retains rwx permission on /sensitive directory path · Contains: Personal Names, Financial IDs, Taxpayer IDs, Medical Records`,
    evidence: [
      "Service Principal etl-svc-prod (App ID b3f91a...) deleted from Azure AD on 2025-01-20",
      "ADLS Gen2 uses POSIX-style ACLs independent of Azure RBAC — deletion of the service principal does NOT remove ACL entries",
      "POSIX ACL entry: objectId=b3f91a... with permission rwx (read, write, execute) on /sensitive/* path — still present in ADLS ACL list",
      "research-datasets (ab3): /sensitive directory contains 7 data types — Personal Names, Financial IDs, Taxpayer IDs, Medical Records (HIPAA-scoped PHI)",
      "ADLS ACL audit confirms: the deleted SP's ACL entry would activate if any application re-registers with the same App ID or Object ID is reused",
    ],
    rationale: "ADLS Gen2 POSIX ACL entries reference object IDs, not account states. A deleted service principal's ACL entry persists indefinitely and reactivates instantly if the same App ID is re-registered by any developer or if Azure recycles the object ID. For a path containing Medical Records and Taxpayer IDs, this is a latent HIPAA and PCI-DSS exposure.",
    action: [
      { text: "Remove POSIX ACL entry for object ID b3f91a... from /sensitive path in research-datasets: az storage fs access remove-recursive", remediationAction: "revoke-external" },
      { text: "Run recursive ACL audit: az storage fs access list --recursive on all ADLS Gen2 containers — flag any objectId not present in Azure AD" },
      { text: "Implement Azure Policy to alert when ADLS Gen2 ACL contains Unknown object IDs (deleted principals)" },
      { text: "Migrate ADLS access model from POSIX ACLs to Azure RBAC where possible — RBAC entries auto-clean when principals are deleted", remediationAction: "restrict-access" },
    ] },

];

// ── Generated r-oe-02 findings (191 additional, total 200) ──────────────────

const _STORES = [
  { label: "HR Confidential",         sublabel: "Google Drive · acme-hr.google.com"        },
  { label: "Finance Team Drive",       sublabel: "Google Drive · acme-finance.google.com"   },
  { label: "Engineering Shared Drive", sublabel: "Google Drive · acme-corp.google.com"      },
  { label: "Marketing Assets",         sublabel: "Google Drive · acme-marketing.google.com" },
  { label: "Legal – Contracts",        sublabel: "SharePoint · acme-legal.sharepoint.com"   },
  { label: "HR – Employee Portal",     sublabel: "SharePoint · acme-hr.sharepoint.com"      },
  { label: "Product – Roadmap Hub",    sublabel: "SharePoint · acme-product.sharepoint.com" },
  { label: "Sales Pipeline",           sublabel: "SharePoint · acme-sales.sharepoint.com"   },
  { label: "Finance Reports",          sublabel: "OneDrive · acme-finance.onedrive.com"     },
  { label: "IT Security Docs",         sublabel: "OneDrive · acme-it.onedrive.com"          },
];
const _FILES = [
  "Employee_Records_2024.xlsx","Customer_PII_Export.csv","Payroll_Q3_2024.xlsx",
  "Medical_Records_Backup.zip","SSN_Database_Extract.csv","Benefits_Data_2024.xlsx",
  "Contract_Signed_NDA.pdf","API_Keys_Production.txt","Salary_Bands_2024.xlsx",
  "Patient_Data_HIPAA.xlsx","Credit_Card_Numbers.csv","Tax_Returns_2023.pdf",
  "Board_Meeting_Notes.docx","M&A_Due_Diligence.pdf","Security_Audit_Report.pdf",
  "Infrastructure_Diagram.vsd","Source_Code_Archive.zip","Private_Keys_Backup.zip",
  "Client_Contacts_List.csv","Financial_Projections_2025.xlsx",
];
const _OWNERS = [
  "alice.chen@company.com","bob.martinez@company.com","carol.johnson@company.com",
  "david.kim@company.com","diana.reyes@company.com","frank.wilson@company.com",
  "grace.lee@company.com","henry.nguyen@company.com","iris.patel@company.com",
];
const _DTS = [
  ["Social Security Numbers","Healthcare IDs","Birthdates"],
  ["Email Addresses","Personal Names","Postal Addresses"],
  ["Credit Card Numbers","Bank Account Information","Financial IDs"],
  ["Private Keys","Passwords","Source Code"],
  ["Medical Records","Healthcare IDs","Birthdates"],
  ["Personal Names","Email Addresses","Company Names"],
  ["IP Addresses","Source Code","Private Keys"],
  ["Financial IDs","Social Security Numbers","Postal Addresses"],
];
const _SEVS: Array<"Critical"|"High"|"Medium"> = ["Critical","High","High","Medium","Medium","High","Critical","Medium"];
const _STATS: Array<"Open"|"Rescan"> = ["Open","Open","Open","Rescan","Open","Open","Rescan","Open"];
const _AGES = ["3 hours ago","6 hours ago","12 hours ago","1 day ago","2 days ago","3 days ago","4 days ago","5 days ago","6 days ago","1 week ago","2 weeks ago","3 weeks ago"];
const _REMS: Array<RecommendedAction['remediationAction']> = [
  'revoke-public','revoke-external','revoke-company','quarantine','delete',
  'restrict-access','apply-sensitivity-label','notify-owner','legal-hold','apply-dlp','change-ownership','request-justification',
];

const GENERATED_OE02: MockFinding[] = Array.from({ length: 191 }, (_, i) => {
  const store = _STORES[i % _STORES.length];
  const file  = _FILES[i % _FILES.length];
  const owner = _OWNERS[i % _OWNERS.length];
  const dts   = _DTS[i % _DTS.length];
  const views = (i % 7) + 1;
  return {
    id:          `FND-2024-${3510 + i}`,
    ruleId:      "r-oe-02",
    severity:    _SEVS[i % _SEVS.length],
    status:      _STATS[i % _STATS.length],
    detectedAt:  _AGES[i % _AGES.length],
    lastSeenAt:  _AGES[i % _AGES.length],
    topology: {
      nodes: [
        { type: "store",    label: store.label, sublabel: store.sublabel },
        { type: "file",     label: file, sublabel: "Exposure: Public link", badge: "Public", alert: true },
        { type: "identity", label: "Anyone with Link", sublabel: "Public sharing" },
      ],
      edges: [{ label: "contains" }, { label: "shared via", dashed: true }],
    },
    matchedCondition: `${store.sublabel.split(' · ')[1]} "${store.label}" · Exposure: "Anyone with Link" · Content: Sensitive DLP — ${dts.join(', ')}`,
    evidence: [
      `File: ${file} — contains ${dts[0]} and ${dts[1]}`,
      `Sharing: public link active — ${views} external view${views !== 1 ? 's' : ''} logged`,
      `File owner: ${owner}`,
    ],
    rationale: `Sensitive file in ${store.label} exposed via public link contains ${dts[0]}, posing a data breach risk.`,
    action: [
      { text: "Revoke Public Sharing immediately",            remediationAction: 'revoke-public' },
      { text: `Remediate to protect ${dts[0]}`,               remediationAction: _REMS[i % _REMS.length] },
      { text: `Notify ${owner} of exposure`,                  remediationAction: _REMS[(i + 3) % _REMS.length] },
    ],
  };
});

// ── Index for fast lookup ────────────────────────────────────────────────────

const FINDINGS_BY_RULE: Record<string, MockFinding[]> = {};
for (const f of [...FINDINGS, ...GENERATED_OE02]) {
  if (!FINDINGS_BY_RULE[f.ruleId]) FINDINGS_BY_RULE[f.ruleId] = [];
  FINDINGS_BY_RULE[f.ruleId].push(f);
}

/** Returns the mock findings for a given rule ID, or [] if none are authored. */
export function getFindingsForRule(ruleId: string): MockFinding[] {
  return FINDINGS_BY_RULE[ruleId] ?? [];
}

// ── Annotated findings (with derived identity/datastore group IDs) ────────────

interface AnnotatedFinding extends MockFinding {
  /** Left-column identity node ID (e.g. "internal", "service", "agent") — null if not determinable */
  identityGroupId: string | null;
  /** Right-column datastore node ID (e.g. "aws", "google-drive", "websites") — null if not determinable */
  datastoreGroupId: string | null;
}

const ANNOTATED_FINDINGS: AnnotatedFinding[] = [...FINDINGS, ...GENERATED_OE02].map(f => {
  let identityGroupId: string | null = null;
  let datastoreGroupId: string | null = null;
  for (const node of f.topology.nodes) {
    if (!identityGroupId) identityGroupId = identityCategory(node);
    if (!datastoreGroupId) datastoreGroupId = storeCategory(node);
  }
  return { ...f, identityGroupId, datastoreGroupId };
});

/**
 * Filter context derived from the current risk-graph node/path selection.
 * Null sets mean "no constraint on that axis".
 */
export interface FindingFilter {
  identityGroupIds?: Set<string> | null;
  datastoreGroupIds?: Set<string> | null;
}

/**
 * Returns findings for a rule that match the current graph selection context.
 * If no filter is provided, all findings for the rule are returned.
 * If a finding has no identifiable group on a given axis, that axis filter is
 * skipped for that finding (the finding passes through).
 */
export function getFindingsForRuleFiltered(
  ruleId: string,
  filter?: FindingFilter,
): MockFinding[] {
  const all = ANNOTATED_FINDINGS.filter(f => f.ruleId === ruleId);
  if (!filter) return all;
  return all.filter(f => {
    if (filter.identityGroupIds?.size && f.identityGroupId) {
      if (!filter.identityGroupIds.has(f.identityGroupId)) return false;
    }
    if (filter.datastoreGroupIds?.size && f.datastoreGroupId) {
      if (!filter.datastoreGroupIds.has(f.datastoreGroupId)) return false;
    }
    return true;
  });
}

/**
 * Contextual finding count for a rule given the current graph selection.
 * Used to drive the "n active findings" label on rule cards in the right panel.
 */
export function countFindingsForRule(ruleId: string, filter?: FindingFilter): number {
  return getFindingsForRuleFiltered(ruleId, filter).length;
}

// ── Implicated-count helpers ──────────────────────────────────────────────────

/**
 * Normalise a topology node label so the same real-world entity always maps to
 * the same dedup key, regardless of how it was written across findings:
 *
 *   "Diana Reyes"              → "diana reyes"
 *   "diana-reyes"              → "diana reyes"
 *   "diana.reyes@company.com"  → "diana reyes"   (email domain stripped first)
 *   "CI/CD Pipeline"           → "cicd pipeline"
 *   "cicd-pipeline"            → "cicd pipeline"
 *   "Data Sync Bot"            → "data sync bot"
 *   "data-sync-bot"            → "data sync bot"
 *   "svc-etl (user acct)"      → "svc etl user acct"
 */
function normaliseLabel(label: string): string {
  // 1. strip email domain (everything from the first @ onwards)
  const noEmail = label.replace(/@\S+/g, "");
  // 2. replace every non-alphanumeric character with a space
  const spacified = noEmail.replace(/[^a-zA-Z0-9]+/g, " ");
  // 3. lowercase, collapse multiple spaces, trim
  return spacified.toLowerCase().replace(/\s+/g, " ").trim();
}

// Maps a topology identity node → the left-column identity node ID in RiskPage.
function identityCategory(node: TopologyNode): string | null {
  if (node.type !== "identity") return null;
  const sub = node.sublabel ?? "";
  if (sub.includes("AI Agent"))                                                            return "agent";
  if (sub.includes("3rd Party App"))                                                       return "third-party";
  if (sub.includes("External") || sub.includes("Contractor") || sub.includes("Partner"))  return "external";
  if (sub.includes("Local User"))                                                          return "local";
  if (sub.includes("Service Account"))                                                     return "service";
  return "internal";
}

// Maps a topology store / destination / device node → the right-column data-store node ID.
function storeCategory(node: TopologyNode): string | null {
  if (node.type === "store") {
    const sub = node.sublabel ?? "";
    if (sub.includes("Google Drive"))                                      return "google-drive";
    if (sub.includes("SharePoint"))                                        return "sharepoint";
    if (sub.includes("AWS S3") || sub.includes("· s"))                     return "aws-s3";
    if (sub.includes("AWS RDS") || sub.includes("· rds"))                  return "aws-rds";
    if (sub.includes("Azure Blob") || sub.includes("· ab"))                return "azure-blob";
    if (sub.includes("Azure SQL") || sub.includes("· asql"))               return "azure-sql";
    if (sub.includes("PostgreSQL"))                                        return "postgresql";
    if (sub.includes("Oracle"))                                            return "oracle";
    return "apps"; // unrecognised SaaS / cloud app store
  }
  if (node.type === "destination") return "websites"; // web upload / personal cloud / GenAI destinations
  if (node.type === "device") {
    const sub = node.sublabel ?? "";
    if (sub.includes("Unmanaged"))       return "peripherals"; // BYOD / unmanaged device peripherals
    if (sub.includes("Database Server")) return "postgresql";
    return "endpoints";
  }
  return null;
}

/**
 * Counts distinct implicated actors/resources per node category across all findings.
 * Returns two maps: identities (left column) and stores (right column).
 * Distinct = unique normalised label within that category (see normaliseLabel).
 */
export function getImplicatedCounts(): {
  identities: Record<string, number>;
  stores: Record<string, number>;
} {
  const idSets: Record<string, Set<string>>    = {};
  const storeSets: Record<string, Set<string>> = {};

  for (const finding of FINDINGS) {
    for (const node of finding.topology.nodes) {
      const key = normaliseLabel(node.label);
      const ic = identityCategory(node);
      if (ic) {
        if (!idSets[ic]) idSets[ic] = new Set();
        idSets[ic].add(key);
      }
      const sc = storeCategory(node);
      if (sc) {
        if (!storeSets[sc]) storeSets[sc] = new Set();
        storeSets[sc].add(key);
      }
    }
  }

  const identities: Record<string, number> = {};
  for (const [k, s] of Object.entries(idSets)) identities[k] = s.size;

  const stores: Record<string, number> = {};
  for (const [k, s] of Object.entries(storeSets)) stores[k] = s.size;

  return { identities, stores };
}

export const SEVERITY_STYLES: Record<Severity, { label: string; color: string; bg: string; dot: string }> = {
  Critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444" },
  High:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.12)", dot: "#f97316" },
  Medium:   { label: "Medium",   color: "#eab308", bg: "rgba(234,179,8,0.12)",  dot: "#eab308" } };

export const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  "Open":   { color: "#ef4444", bg: "rgba(239,68,68,0.10)"   },
  "Rescan": { color: "#22c55e", bg: "rgba(34,197,94,0.10)"   },
  "Closed": { color: "#6b7280", bg: "rgba(107,114,128,0.10)" } };

/** Returns all findings (useful for exports and full-dataset views). */
export function getAllFindings(): MockFinding[] {
  return FINDINGS;
}

/**
 * Determine the hosting tier of the primary data store in a finding.
 * Used by RescanModal to show approximate re-scan timing.
 */
export function getDataStoreTier(
  finding: MockFinding
): "SaaS" | "IaaS/PaaS" | "On-Prem" {
  const node = finding.topology.nodes.find(
    (n) => n.type === "store" || n.type === "destination"
  );
  if (!node) return "IaaS/PaaS";

  const sub = node.sublabel.toLowerCase();
  const lbl = node.label.toLowerCase();

  const saasKeywords = [
    "google drive", "sharepoint", "onedrive", "salesforce",
    "slack", "box", "dropbox", "github", "microsoft 365", "teams",
  ];
  if (saasKeywords.some((k) => sub.includes(k) || lbl.includes(k)))
    return "SaaS";

  const onPremKeywords = [
    "postgresql", "oracle", "mysql", "sql server", "endpoint",
    "local", "on-prem", "on prem",
  ];
  if (onPremKeywords.some((k) => sub.includes(k) || lbl.includes(k)))
    return "On-Prem";

  // IaaS / PaaS
  return "IaaS/PaaS";
}

/**
 * Returns a lightweight summary of every annotated finding — just the fields
 * needed to compute per-edge severity-weighted scores in the risk graph.
 */
export function getAnnotatedFindingSummaries(): Array<{
  ruleId: string;
  severity: Severity;
  identityGroupId: string | null;
  datastoreGroupId: string | null;
}> {
  return ANNOTATED_FINDINGS.map(f => ({
    ruleId: f.ruleId,
    severity: f.severity,
    identityGroupId: f.identityGroupId,
    datastoreGroupId: f.datastoreGroupId }));
}
