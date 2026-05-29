// ── Canonical risk rules data ─────────────────────────────────────────────────
// Derived from: UDS R2R risk policy mastersheet (priority 0, non-strikethrough)
// 40 rules across 4 tabs: Combined (hybrid), IaaS & On-Prem, SaaS CASB API, Inline

export type MainEntityType =
  | "file"
  | "column"
  | "chat-message"
  | "data-store"
  | "device"
  | "identity"
  | "application"
  | "website";

export type PolicyEngineKey =
  | "CASB API"
  | "CASB Inline"
  | "SSPM"
  | "DSPM"
  | "Endpoint"
  | "DSPM + CASB API"
  | "CASB Inline + UEBA"
  | "SWG";

export type Severity = "Critical" | "High" | "Medium" | "Low";

export const POLICY_ENGINES: Record<PolicyEngineKey, { short: string; color: string; bg: string }> = {
  "CASB API":           { short: "CASB API",    color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  "CASB Inline":        { short: "Inline",       color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  "SSPM":               { short: "SSPM",         color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  "DSPM":               { short: "DSPM",         color: "#06b6d4", bg: "rgba(6,182,212,0.12)"   },
  "Endpoint":           { short: "EDR",          color: "#a3a3a3", bg: "rgba(163,163,163,0.12)" },
  "DSPM + CASB API":    { short: "Hybrid",       color: "#7c3aed", bg: "rgba(124,58,237,0.12)"  },
  "CASB Inline + UEBA": { short: "Inline+UEBA",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  "SWG":                { short: "SWG",          color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
};

export const SEVERITY_META: Record<Severity, { color: string; bg: string; order: number }> = {
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   order: 0 },
  High:     { color: "#f97316", bg: "rgba(249,115,22,0.12)",  order: 1 },
  Medium:   { color: "#eab308", bg: "rgba(234,179,8,0.12)",   order: 2 },
  Low:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   order: 3 },
};

export interface RiskRule {
  id: string;
  name: string;
  severity: Severity;
  policyEngine: PolicyEngineKey;
  /** Abbreviated condition summary for display */
  conditionSummary: string;
  /** Identity group ids this rule can fire for */
  identityTypes: string[];
  /** Data store group ids this rule can fire on */
  dataStoreGroups: string[];
  /** Simulated active finding count */
  findings: number;
  /** Human-readable description of the risk */
  description?: string;
  /** The main entity type the rule's condition matches against (Col G "Finding") */
  mainEntityType?: MainEntityType;
  /** Recommended retroactive scan action (undefined = not supported for this rule) */
  recommendedRetroScan?: string;
  /** Recommended ongoing Data-At-Rest policy (undefined = not supported) */
  recommendedOngoingDARPolicy?: string;
  /** Recommended ongoing Data-In-Motion policy (undefined = not supported) */
  recommendedOngoingDIMPolicy?: string;
  /** Static IaaS/On-Prem remediation recommendation (for DSPM rules) */
  recommendedIaaSPolicy?: string;
}

export interface RiskTypeDef {
  id: string;
  label: string;
  bg: string;
  fg: string;
  rules: RiskRule[];
}

// ── Risk type definitions ─────────────────────────────────────────────────────

export const RISK_TYPES: RiskTypeDef[] = [

  // ── Over-Exposed Sensitive Data ──────────────────────────────────────────────
  {
    id: "overexposed",
    label: "Over-Exposed Sensitive Data",
    bg: "rgba(249,115,22,0.12)", fg: "#f97316",
    rules: [
      {
        id: "r-oe-01",
        name: "Cleartext Credentials Stored in Cloud & SaaS Environments",
        severity: "Critical",
        policyEngine: "DSPM + CASB API",
        conditionSummary: "Content matches Credentials / AWS Access Key / Private Key across cloud storage and SaaS documents",
        identityTypes: ["internal", "service", "agent"],
        dataStoreGroups: ["google-drive", "sharepoint", "aws-s3", "azure-blob"],
        findings: 8,
        description: "Unprotected secrets (like AWS keys, API tokens, or passwords) were found across cloud storage or SaaS documents. This allows attackers to easily hijack accounts or compromise infrastructure.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to quarantine files with cleartext credentials across all environments and notify data owners to rotate the secrets.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to instantly alert and quarantine newly discovered documents or objects containing credentials.",
        recommendedOngoingDIMPolicy: "Inline block preventing the upload or transfer of files containing cleartext credentials.",
        recommendedIaaSPolicy: "Review the flagged files and manually remove or rotate the exposed credentials. Ensure all secrets are moved to a secure secrets manager (e.g., AWS Secrets Manager, Azure Key Vault).",
      },
      {
        id: "r-oe-02",
        name: "Sensitive Data Exposed via Public Links or Global Access or External Sharing",
        severity: "Critical",
        policyEngine: "DSPM + CASB API",
        conditionSummary: "Exposure = Public / Anyone with Link / All Internal Users / External; OR datastore BlockPublicAccess = disabled; AND content matches Sensitive DLP profile",
        identityTypes: ["internal", "external", "unauthenticated"],
        dataStoreGroups: ["google-drive", "sharepoint", "aws-s3", "azure-blob"],
        findings: 12,
        description: "Sensitive files are accessible to everyone in the organization or the public internet or shared with external users, creating a severe data breach and AI-readiness risk.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to remove public/organization-wide links and restrict file access to explicit internal users only.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically revoke or downgrade overly permissive sharing links for sensitive data.",
        recommendedOngoingDIMPolicy: "Inline block intercepting and preventing the creation of public or org-wide links for sensitive data.",
        recommendedIaaSPolicy: "Review datastore permissions and manually disable public access. Enable \"Block Public Access\" at the bucket level or remove \"allUsers\" / \"Everyone\" from the Access Control List (ACL).",
      },
      {
        id: "r-oe-03",
        name: "Suspended Users Retaining Access to Sensitive Data",
        severity: "Critical",
        policyEngine: "DSPM + CASB API",
        conditionSummary: "Identity status = Suspended / Disabled / Deleted AND access = Granted AND content matches Sensitive",
        identityTypes: ["internal", "local", "service"],
        dataStoreGroups: ["google-drive", "sharepoint", "aws-s3", "azure-blob"],
        findings: 9,
        description: "User accounts that have been explicitly disabled or suspended by IT (e.g., former employees) still hold active, explicit permissions to access sensitive corporate data across cloud and SaaS apps.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan to automatically strip all direct file and folder access permissions for suspended or deleted users across the tenant.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically revoke explicit data shares the moment a user's IdP status changes to suspended.",
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Manually remove the disabled Active Directory user objects from all associated file and folder Access Control Lists (ACLs).",
      },
      {
        id: "r-oe-04",
        name: "Over-Exposed Stale Sensitive Data",
        severity: "Critical",
        policyEngine: "DSPM + CASB API",
        conditionSummary: "Last accessed > 365 days AND exposure = Public or All Internal Users AND content matches Sensitive",
        identityTypes: ["internal", "service", "unauthenticated"],
        dataStoreGroups: ["google-drive", "sharepoint", "aws-s3", "azure-blob"],
        findings: 7,
        description: "Highly sensitive data that has not been accessed in over a year is also exposed via broad permissions (public or org-wide), creating an unmonitored and severe exfiltration risk.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to immediately revoke broad access to stale data and move it to a secure, restricted archive tier.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to auto-revoke public or global sharing on any sensitive file that becomes stale (> 90 days of inactivity).",
        recommendedOngoingDIMPolicy: "Inline block preventing users from sharing, transferring, or downloading files tagged as both stale and over-exposed.",
        recommendedIaaSPolicy: "Immediately audit the resource permissions (e.g., bucket policies, ACLs) and manually revoke public or organization-wide access to secure the exposed data. Once resolved, migrate the stale data to a secure cold storage tier or securely delete it.",
      },
      {
        id: "r-oe-05",
        name: "AI Readiness Risk: Over-Exposed Internal Data",
        severity: "Critical",
        policyEngine: "CASB API",
        conditionSummary: "App = SharePoint/OneDrive/Google Drive AND content matches Sensitive AND exposure = Everyone Except External Users or All Internal Users",
        identityTypes: ["internal", "agent"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 11,
        description: "Sensitive files are accessible to everyone in the company. Internal AI tools (like Copilot) could easily surface this data to unauthorized employees.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan with remediation to revoke organization-wide sharing and SharePoint/OneDrive EEEU sharing.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically revoke organization-wide sharing and SharePoint/OneDrive EEEU sharing for sensitive files detected.",
        recommendedOngoingDIMPolicy: "Inline alert or block preventing users from generating an \"Organization-wide\" link or permission for files matching sensitive DLP profiles.",
      },
      {
        id: "r-oe-06",
        name: "Sensitive Data Exposed via Perpetual Public Sharing",
        severity: "High",
        policyEngine: "CASB API",
        conditionSummary: "Content matches Sensitive AND exposure = Public AND expiry = None/Null",
        identityTypes: ["internal", "external"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 8,
        description: "Public sharing of sensitive files have no expiration date. Third parties have permanent access, increasing breach risk over time.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to force an expiration date (e.g., +7 days) on all existing perpetual sharing of sensitive files.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically enforce a maximum 30-day expiration on all newly created public sharing of sensitive data.",
        recommendedOngoingDIMPolicy: undefined,
      },
      {
        id: "r-oe-07",
        name: "Permanent External Collaborator Access on Sensitive Files",
        severity: "High",
        policyEngine: "CASB API",
        conditionSummary: "Content matches Sensitive AND collaborator = External Domain AND access expiry = None/Null",
        identityTypes: ["external", "internal"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 6,
        description: "External users (like vendors or contractors) have permanent access to sensitive files with no automated expiration date set to revoke it.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan to update external collaborator permissions with a strict expiration date or remove inactive external users.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically apply a 90-day access expiry to any external collaborator added to a sensitive directory.",
        recommendedOngoingDIMPolicy: undefined,
      },
      {
        id: "r-oe-08",
        name: "Sensitive Data in Suspended User's Drive",
        severity: "High",
        policyEngine: "CASB API",
        conditionSummary: "User status = Suspended/Inactive AND datastore = Personal Drive AND content matches Sensitive",
        identityTypes: ["internal"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 5,
        description: "A user account has been suspended, but their personal corporate drive still holds sensitive data that is unmanaged and vulnerable.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to bulk-transfer ownership of the suspended user's drive and files to an active manager.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically transfer drive ownership to the user's AD/IdP manager upon account suspension.",
        recommendedOngoingDIMPolicy: undefined,
      },
      {
        id: "r-oe-09",
        name: "Sensitive Data Discovered in Unmanaged Sites",
        severity: "High",
        policyEngine: "CASB API",
        conditionSummary: "Datastore = SharePoint Site / Shared Drive AND active users = 0 AND content matches Sensitive",
        identityTypes: ["internal"],
        dataStoreGroups: ["sharepoint", "google-drive"],
        findings: 4,
        description: "A collaboration site or shared drive containing sensitive data has no active users or owners. This orphaned data is completely unmonitored.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to assign active ownership of orphaned files or permanently quarantine the sensitive content.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically quarantine sensitive files discovered in sites with no active members for over 90 days.",
        recommendedOngoingDIMPolicy: "Inline block preventing users from uploading newly classified sensitive data to sites officially tagged as unmanaged or orphaned.",
      },
      {
        id: "r-oe-10",
        name: "Publicly Accessible Sensitive Data in Google BigQuery",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "BigQuery dataset access list includes allUsers or allAuthenticatedUsers AND content matches Sensitive",
        identityTypes: ["service", "unauthenticated"],
        dataStoreGroups: ["unmanaged"],
        findings: 4,
        description: "A Google BigQuery dataset containing sensitive information is open to the public or all authenticated GCP users.",
        mainEntityType: "data-store",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Access the BigQuery dataset permissions in the GCP console and manually revoke the \"allUsers\" or \"allAuthenticatedUsers\" roles to prevent public data exposure.",
      },
    ],
  },

  // ── Over Privilege Identity ───────────────────────────────────────────────────
  {
    id: "overprivilege",
    label: "Over Privilege Identity",
    bg: "rgba(234,179,8,0.12)", fg: "#eab308",
    rules: [
      {
        id: "r-op-01",
        name: "Stale Users Retaining Access to Sensitive Data",
        severity: "High",
        policyEngine: "DSPM + CASB API",
        conditionSummary: "Identity last activity > 90 days AND access = Granted AND content matches Sensitive",
        identityTypes: ["internal", "local", "service"],
        dataStoreGroups: ["google-drive", "sharepoint", "aws-s3", "azure-blob"],
        findings: 10,
        description: "Valid user accounts that have been inactive for an extended period (> 90 days) still retain explicit permissions to access sensitive corporate data, unnecessarily expanding the attack surface.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan to automatically strip direct file and folder access permissions for users who have been inactive for over 90 days.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically revoke explicit data shares when a user's inactivity crosses the 90-day threshold.",
        recommendedOngoingDIMPolicy: "Inline block preventing users flagged as historically inactive (>90 days) from downloading sensitive data until their account is re-verified.",
        recommendedIaaSPolicy: "Audit the Identity and Access Management (IAM) policies, Active Directory groups, or resource-level ACLs and manually revoke the inactive user's permissions.",
      },
      {
        id: "r-op-02",
        name: "Ghost Users with Access to Sensitive Data",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Identity status = Unlinked (not mapped to any IdP employee or application) AND accessible data = Sensitive",
        identityTypes: ["local", "service"],
        dataStoreGroups: ["aws-s3", "azure-blob", "postgresql", "oracle"],
        findings: 6,
        description: "Unrecognized or unlinked identities have access to your sensitive information. This indicates a severe breakdown in access control.",
        mainEntityType: "identity",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Review the resource policy and manually remove the unlinked or unrecognized Principal IDs to enforce the principle of least privilege.",
      },
      {
        id: "r-op-03",
        name: "Ghost Users (Unresolved SIDs) in Sensitive File ACLs",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "ACL entry ID matches pattern S-1-5-21-... AND no mapping to Active Directory object",
        identityTypes: ["local"],
        dataStoreGroups: ["endpoints", "unmanaged"],
        findings: 5,
        description: "File permissions contain orphaned account IDs (SIDs) that no longer exist in your directory. This creates hidden access vulnerabilities.",
        mainEntityType: "identity",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Manually audit the NTFS Access Control Lists (ACLs) of the flagged files and remove any unresolved SIDs (orphaned accounts) to clean up stale access rights.",
      },
      {
        id: "r-op-04",
        name: "Sensitive Files with Broken Permission Inheritance",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Config: IsInheritanceExplicitlyDisabled = True AND content matches Sensitive",
        identityTypes: ["local", "internal"],
        dataStoreGroups: ["endpoints", "unmanaged"],
        findings: 4,
        description: "Sensitive files or folders have custom permissions that override secure parent folder settings, accidentally exposing data to unauthorized users.",
        mainEntityType: "file",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Investigate the folder permissions and manually re-enable permission inheritance, or formally audit and document the explicit permissions if breaking inheritance was intentional.",
      },
      {
        id: "r-op-05",
        name: "Risky Users with Access to Sensitive Shares",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Identity risk level = High (from UEBA) AND read/write access exists on resource with Sensitive data",
        identityTypes: ["local", "internal"],
        dataStoreGroups: ["endpoints", "unmanaged"],
        findings: 6,
        description: "Users flagged with a high behavioral risk score (UEBA) currently have read or write access to sensitive data shares.",
        mainEntityType: "identity",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Investigate the user's recent UEBA alerts. Manually review and, if necessary, temporarily revoke their read/write access to sensitive shares until their risk score normalizes.",
      },
      {
        id: "r-op-06",
        name: "High-Risk User Downloading Sensitive Data",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "User risk score = High (from UEBA) AND activity = Download AND content matches Sensitive profile",
        identityTypes: ["internal"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 7,
        description: "A user with an elevated behavioral risk score is actively downloading sensitive corporate data, indicating a potential insider threat or compromised account.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan to review the user's access logs and revoke permissions to highly sensitive corporate shares.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically suspend the user's access to sensitive datastores when their UEBA risk score reaches a critical threshold.",
        recommendedOngoingDIMPolicy: "Inline block preventing high-risk users from downloading sensitive corporate data.",
      },
    ],
  },

  // ── Data Exfiltration ────────────────────────────────────────────────────────
  {
    id: "exfil",
    label: "Data Exfiltration",
    bg: "rgba(239,68,68,0.12)", fg: "#ef4444",
    rules: [
      {
        id: "r-ex-01",
        name: "Sensitive S3 Bucket Accessible by External AWS Account",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Bucket policy principal = external AWS Account ID AND content matches Sensitive",
        identityTypes: ["service", "third-party"],
        dataStoreGroups: ["azure-blob"],
        findings: 4,
        description: "An S3 bucket containing sensitive data grants access to an unauthorized, external AWS account, creating a major exfiltration risk.",
        mainEntityType: "data-store",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Review the S3 bucket policy and manually delete the statements granting access to the unauthorized external AWS account ID.",
      },
      {
        id: "r-ex-02",
        name: "PII Shared with External Personal Domains",
        severity: "High",
        policyEngine: "CASB API",
        conditionSummary: "Collaborator domain ≠ corporate domain (e.g. @gmail.com) AND content matches PII DLP profile",
        identityTypes: ["internal", "external"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 11,
        description: "Personal data (PII) is being shared with personal email accounts (like @gmail.com), violating corporate data privacy policies.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to remove unauthorized personal email domains from sensitive file and folder permissions.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically remove personal email domains added to sensitive shares.",
        recommendedOngoingDIMPolicy: "Inline block preventing users from sharing sensitive files with non-corporate domains.",
      },
      {
        id: "r-ex-03",
        name: "Sensitive Data Exposed in ChatGPT Conversations",
        severity: "Critical",
        policyEngine: "CASB API",
        conditionSummary: "App = ChatGPT Enterprise AND scan content type = Chat Message Body AND content matches PCI / GDPR DLP profile",
        identityTypes: ["internal", "agent"],
        dataStoreGroups: ["unmanaged"],
        findings: 8,
        description: "Employees are sharing highly sensitive or regulated data (like Credit Card numbers or GDPR PII) within ChatGPT Enterprise conversations, risking persistent exposure in the model's chat history.",
        mainEntityType: "chat-message",
        recommendedRetroScan: "Perform a retroactive CASB API scan of the last 90 days of enterprise workspaces to discover historical chat messages containing cleartext sensitive data and trigger a SOC alert.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically generate alerts and send coaching emails to users who persist sensitive data into chat logs.",
        recommendedOngoingDIMPolicy: undefined,
      },
      {
        id: "r-ex-04",
        name: "High Volume of Data Uploaded to Unsanctioned Apps",
        severity: "High",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload AND app status ≠ Sanctioned AND volume/rate > anomaly threshold (e.g. > 1GB/hr)",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 9,
        description: "A massive amount of data was uploaded to an unapproved application. This anomalous spike in data movement strongly indicates active data exfiltration.",
        mainEntityType: "application",
        recommendedRetroScan: "Perform a retroactive scan on these apps to identify if sensitive data was potentially exfiltrated.",
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: "Inline block preventing high-volume data uploads to unsanctioned applications.",
      },
      {
        id: "r-ex-05",
        name: "High Risk User Sending Data from High Risk App",
        severity: "Critical",
        policyEngine: "CASB Inline + UEBA",
        conditionSummary: "User risk = High AND app CCI score < 40 (or app status = Unsanctioned) AND activity = Upload/Post",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 6,
        description: "A user with a high behavioral risk score is uploading data to an application with a poor security rating, creating a critical exfiltration threat.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan of the high-risk user's recent corporate file access to determine what data may have been compromised.",
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: "Inline block preventing users with high risk scores from uploading data to high-risk applications.",
      },
      {
        id: "r-ex-06",
        name: "High-Risk User Uploading to Unsanctioned Apps",
        severity: "High",
        policyEngine: "SWG",
        conditionSummary: "App category = Cloud Storage AND app status = Unsanctioned AND user risk = High AND activity = Upload",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 7,
        description: "A user flagged for risky behavior is attempting to upload files to an unapproved cloud storage app, signaling potential shadow IT abuse or data theft.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan across sanctioned drives to map the user's recent file activity and identify exfiltrated data.",
        recommendedOngoingDARPolicy: "Ongoing UEBA policy to automatically trigger step-up authentication or temporary account suspension for users exhibiting continuous risky behavior.",
        recommendedOngoingDIMPolicy: "Inline block preventing high-risk users from uploading files to unsanctioned cloud storage apps.",
      },
      {
        id: "r-ex-07",
        name: "Exfiltration to Personal SaaS Instances",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload AND instance ID = Personal/Unregistered AND DLP profile = Confidential/PII",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 8,
        description: "Sensitive data is being uploaded to a personal or unregistered cloud account (e.g., a personal Google Drive), intentionally bypassing corporate data controls.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan to locate the original source of the exfiltrated sensitive data within sanctioned corporate drives.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically alert administrators when sanctioned data is staged for mass exfiltration.",
        recommendedOngoingDIMPolicy: "Inline block preventing the upload of sensitive data to personal or unregistered SaaS instances.",
      },
      {
        id: "r-ex-08",
        name: "Exfiltration of Credentials/Keys via Web Upload",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload/Paste AND destination = any web app AND content matches Private Key or API Token",
        identityTypes: ["internal", "service"],
        dataStoreGroups: ["unmanaged"],
        findings: 5,
        description: "Critical secrets like API tokens or private keys were pasted or uploaded to a web app. This exposure can lead to immediate, devastating infrastructure compromise.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to locate the cleartext credential within corporate repositories and initiate a mandatory key rotation workflow.",
        recommendedOngoingDARPolicy: "Ongoing DSPM policy to automatically scan code repositories and datastores to quarantine hardcoded secrets.",
        recommendedOngoingDIMPolicy: "Inline block preventing users from pasting or uploading API tokens and private keys to web applications.",
      },
      {
        id: "r-ex-09",
        name: "Exfiltration of PII to Personal Webmail",
        severity: "High",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload AND destination category = Webmail (Personal) AND content matches PII DLP profile",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 7,
        description: "Sensitive personal data (PII) is being attached or pasted into personal webmail accounts (like Gmail or Yahoo), leading to immediate data leakage.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan of the user's sanctioned drives to determine the scope of PII they have recently accessed.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically flag and review users who excessively access PII just prior to webmail usage.",
        recommendedOngoingDIMPolicy: "Inline block preventing the attachment or pasting of PII into personal webmail accounts.",
      },
      {
        id: "r-ex-10",
        name: "Sensitive Data Ingestion by Generative AI",
        severity: "High",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Post/Paste AND category = Generative AI (e.g. ChatGPT) AND content matches Confidential DLP profile",
        identityTypes: ["internal", "agent"],
        dataStoreGroups: ["unmanaged"],
        findings: 14,
        description: "Confidential data was pasted or uploaded into a Generative AI tool (like ChatGPT). This data could be used to train public models, causing a severe leak.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to identify if the user has a pattern of accessing highly confidential data prior to using GenAI applications.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically restrict the sharing of highly confidential documents to prevent GenAI browser extensions from reading them.",
        recommendedOngoingDIMPolicy: "Inline block preventing confidential data from being pasted or uploaded into Generative AI tools.",
      },
      {
        id: "r-ex-11",
        name: "Sensitive Data Download to Unmanaged/BYOD Device",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Download AND device = Unmanaged/BYOD AND content matches Sensitive DLP profile",
        identityTypes: ["internal", "external"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 9,
        description: "Sensitive corporate data was downloaded to an unmanaged or personal device where the organization has no security controls, agent, or visibility.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive posture check to review SaaS configurations and disable settings that permit sync clients on unmanaged devices.",
        recommendedOngoingDARPolicy: "Ongoing SSPM policy to continuously monitor and flag if unmanaged device access is re-enabled on the corporate tenant.",
        recommendedOngoingDIMPolicy: "Inline block preventing the download of sensitive corporate data to unmanaged or BYOD devices.",
      },
      {
        id: "r-ex-12",
        name: "Sensitive Data Upload to Unsanctioned Cloud Storage",
        severity: "High",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload AND app instance ≠ Sanctioned Corporate Instance AND category = Cloud Storage",
        identityTypes: ["internal", "external"],
        dataStoreGroups: ["unmanaged"],
        findings: 8,
        description: "Sensitive files are being uploaded to a cloud storage application that is not officially sanctioned by the company, creating a Shadow IT data leak.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan of the user's corporate drives to identify the exact origin of the sensitive data being exfiltrated to shadow IT.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically detect and quarantine sensitive data staged for mass upload.",
        recommendedOngoingDIMPolicy: "Inline block preventing the upload of sensitive files to unsanctioned cloud storage applications.",
      },
      {
        id: "r-ex-13",
        name: "Source Code Leakage to Public Repositories",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload/Push AND destination = GitHub (Public) AND content matches Source Code classifier",
        identityTypes: ["internal", "service"],
        dataStoreGroups: ["unmanaged"],
        findings: 6,
        description: "Proprietary source code was pushed or uploaded to a public repository (like a public GitHub repo), exposing highly valuable intellectual property to the world.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to revoke the compromised developer's API tokens and identify the internal source code repository accessed.",
        recommendedOngoingDARPolicy: "Ongoing SSPM policy to automatically audit and revoke unauthorized OAuth integrations connected to corporate GitHub or GitLab accounts.",
        recommendedOngoingDIMPolicy: "Inline block preventing proprietary source code from being pushed or uploaded to public repositories.",
      },
      {
        id: "r-ex-14",
        name: "Source Code Shared with Risky GenAI Apps",
        severity: "High",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Post/Paste/Upload AND app category = Generative AI AND app risk score (CCL) < 50 AND content = Source Code",
        identityTypes: ["internal", "service"],
        dataStoreGroups: ["unmanaged"],
        findings: 5,
        description: "Developers are pasting proprietary source code into Generative AI tools that have low corporate security ratings, risking severe intellectual property theft.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to trace the developer's recent access logs to corporate codebases to assess the potential scope of the leak.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically flag developer accounts that exhibit anomalous source code downloads.",
        recommendedOngoingDIMPolicy: "Inline block preventing developers from pasting or uploading source code into risky Generative AI applications.",
      },
      {
        id: "r-ex-15",
        name: "Sensitive Data Transfer via Anonymizers/Tor",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload AND destination category = Anonymizer / Proxy / Tor AND content matches Sensitive",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 4,
        description: "Sensitive data is being routed through anonymizers, proxies, or the Tor network—a tactic heavily used by malicious actors to hide data theft and bypass tracking.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan of the user's recent corporate file access to determine what data they attempted to hide and exfiltrate.",
        recommendedOngoingDARPolicy: "Ongoing UEBA policy to automatically suspend the accounts of users detected routing traffic through Tor or anonymizers.",
        recommendedOngoingDIMPolicy: "Inline block preventing the transfer of any sensitive data through anonymizers, proxies, or the Tor network.",
      },
      {
        id: "r-ex-16",
        name: "Malicious File Downloaded from Uncategorized Site",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Download AND URL category = Uncategorized or Newly Registered AND threat = Malware/Ransomware hash match",
        identityTypes: ["internal"],
        dataStoreGroups: ["unmanaged"],
        findings: 5,
        description: "A user downloaded a file containing known malware or ransomware from a newly registered or uncategorized website, threatening the corporate network.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan of the user's endpoint and recent cloud uploads to ensure the malicious payload has not propagated.",
        recommendedOngoingDARPolicy: "Ongoing CASB API threat protection scan to continuously inspect corporate datastores for matching malware hashes.",
        recommendedOngoingDIMPolicy: "Inline AV block preventing the download of malicious files from uncategorized or newly registered websites.",
      },
    ],
  },

  // ── Data Minimization / Stale Sensitive Data ──────────────────────────────────
  {
    id: "stale",
    label: "Data Minimization",
    bg: "rgba(168,85,247,0.12)", fg: "#a855f7",
    rules: [
      {
        id: "r-st-01",
        name: "Stale Sensitive Data Retained Beyond 1 Year",
        severity: "High",
        policyEngine: "DSPM + CASB API",
        conditionSummary: "Last accessed > 365 days (or connections = 0 for > 30 days for DBs) AND content matches Sensitive DLP profile",
        identityTypes: ["internal", "service", "local"],
        dataStoreGroups: ["google-drive", "sharepoint", "azure-blob"],
        findings: 12,
        description: "Sensitive data (files, objects, or dormant databases) hasn't been accessed or connected to in over a year, violating data minimization principles and increasing the attack surface.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to bulk archive or soft-delete stale sensitive files and databases to reduce attack surface.",
        recommendedOngoingDARPolicy: "Ongoing Data Protection policy to automatically apply retention labels or archive sensitive data hitting 365 days of inactivity.",
        recommendedOngoingDIMPolicy: "Inline block or justification prompt triggered when a user attempts a bulk download of data flagged as stale or archived.",
        recommendedIaaSPolicy: "Review the flagged stale data with the respective data owners. If no longer required, manually migrate it to a secure cold storage tier (e.g., AWS S3 Glacier, Azure Archive Blob) or securely delete it.",
      },
      {
        id: "r-st-02",
        name: "Ghost Database with Sensitive Data",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Resource = database instance AND connections = 0 for > 30 days AND content matches Sensitive",
        identityTypes: ["service", "local"],
        dataStoreGroups: ["postgresql", "oracle"],
        findings: 5,
        description: "A database containing sensitive data has had zero connections for over 30 days. This abandoned asset unnecessarily increases your attack surface.",
        mainEntityType: "data-store",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Verify if the dormant database instance is still required. If not, manually create a final encrypted backup and decommission the instance to reduce your attack surface.",
      },
      {
        id: "r-st-03",
        name: "Proliferation of Duplicate Sensitive Data",
        severity: "Medium",
        policyEngine: "CASB API",
        conditionSummary: "App = any SaaS AND content similarity = exact hash match (100%) AND file count > 5 identical copies AND content matches Sensitive DLP profile",
        identityTypes: ["internal", "agent"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 6,
        description: "Multiple identical copies of sensitive files are scattered within the same cloud application, making data governance and cleanup difficult.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to delete redundant copies within the application environment, retaining only the primary version of the sensitive file.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically alert on or tombstone new exact-match duplicates of highly sensitive files within the same application platform.",
        recommendedOngoingDIMPolicy: "Inline warning alerting the user that an identical copy of this sensitive file already exists within this specific application during upload.",
      },
    ],
  },

  // ── Compliance / Governance ──────────────────────────────────────────────────
  {
    id: "compliance",
    label: "Compliance / Governance",
    bg: "rgba(20,184,166,0.12)", fg: "#14b8a6",
    rules: [
      {
        id: "r-cg-01",
        name: "Sensitive Data Stores Missing Encryption at Rest",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Config: Encryption = Disabled / KMS Key = Default AND content matches Sensitive",
        identityTypes: ["service", "internal"],
        dataStoreGroups: ["aws-s3", "azure-blob", "postgresql", "oracle"],
        findings: 9,
        description: "Datastores holding sensitive information are not encrypted. If the physical storage is compromised, the data can be read in cleartext.",
        mainEntityType: "data-store",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Manually enable server-side encryption for the flagged datastore. Use a provider-managed or customer-managed key (KMS/CMK) to ensure sensitive data is protected at rest.",
      },
      {
        id: "r-cg-02",
        name: "Sensitive Data Stores Missing Automated Backups",
        severity: "High",
        policyEngine: "DSPM",
        conditionSummary: "Config: BackupEnabled = False OR Versioning = Disabled AND content matches Sensitive",
        identityTypes: ["service", "internal"],
        dataStoreGroups: ["aws-s3", "azure-blob", "postgresql", "oracle"],
        findings: 7,
        description: "A datastore containing sensitive information does not have automated backups or object versioning enabled, risking permanent data loss from ransomware or accidental deletion.",
        mainEntityType: "data-store",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Access the resource configuration in the cloud console and manually enable automated daily backups, point-in-time recovery (PITR), or object versioning.",
      },
      {
        id: "r-cg-03",
        name: "European Personal Data Stored Outside Europe",
        severity: "Critical",
        policyEngine: "DSPM",
        conditionSummary: "Region not in [eu-*] AND content matches GDPR / EU PII data profile",
        identityTypes: ["service", "internal"],
        dataStoreGroups: ["aws-s3", "azure-blob"],
        findings: 6,
        description: "Data protected by GDPR or EU privacy laws is being stored outside of approved European regions, violating compliance mandates.",
        mainEntityType: "file",
        recommendedRetroScan: undefined,
        recommendedOngoingDARPolicy: undefined,
        recommendedOngoingDIMPolicy: undefined,
        recommendedIaaSPolicy: "Manually migrate the flagged GDPR/EU personal data to an approved EU-based cloud region, and securely delete the original files to ensure data residency compliance.",
      },
      {
        id: "r-cg-04",
        name: "Cross-Region Transfer of Regulated Data (GDPR)",
        severity: "Critical",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Upload AND source region = EU AND destination region ≠ EU AND content matches GDPR",
        identityTypes: ["internal", "service"],
        dataStoreGroups: ["google-drive", "sharepoint", "aws-s3", "azure-blob", "unmanaged"],
        findings: 4,
        description: "Regulated data (like EU PII) is being transferred across geographic borders to an unauthorized region, violating strict data sovereignty and privacy laws.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan to identify if this regulated data was previously staged or copied to unauthorized cloud storage regions.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically scan and delete EU-regulated data found stored in non-compliant global datastores.",
        recommendedOngoingDIMPolicy: "Inline block preventing the transfer of GDPR-regulated data to unauthorized geographic regions.",
      },
      {
        id: "r-cg-05",
        name: "Unencrypted File Upload via Non-Standard Protocol",
        severity: "Medium",
        policyEngine: "CASB Inline",
        conditionSummary: "Activity = Transfer/Upload AND protocol ≠ HTTPS/HTTP (e.g. FTP, Telnet) AND content matches Sensitive",
        identityTypes: ["internal", "local"],
        dataStoreGroups: ["endpoints", "unmanaged"],
        findings: 3,
        description: "Sensitive files are being transferred over unencrypted, outdated network protocols (like FTP or Telnet). Attackers can easily intercept this traffic.",
        mainEntityType: "file",
        recommendedRetroScan: "Perform a retroactive scan of network logs to identify other recent transfers originating from the same user over non-standard protocols.",
        recommendedOngoingDARPolicy: "Ongoing SSPM policy to automatically verify that secure transport (HTTPS/SSL) is strictly enforced on all corporate datastores.",
        recommendedOngoingDIMPolicy: "Inline block preventing sensitive file transfers over unencrypted or non-standard network protocols.",
      },
    ],
  },

  // ── Former Employee with Access ──────────────────────────────────────────────
  {
    id: "former",
    label: "Former Employee with Access",
    bg: "rgba(239,68,68,0.12)", fg: "#ef4444",
    rules: [
      {
        id: "r-fe-01",
        name: "Deprovisioned User Retains Access to Sensitive SaaS Data",
        severity: "Critical",
        policyEngine: "CASB API",
        conditionSummary: "Identity status = Deprovisioned/Suspended AND explicit permission exists AND content matches Sensitive DLP profile",
        identityTypes: ["internal", "external"],
        dataStoreGroups: ["google-drive", "sharepoint"],
        findings: 7,
        description: "A user account that has been explicitly disabled or suspended still holds active permissions to access sensitive corporate data in SaaS applications.",
        mainEntityType: "identity",
        recommendedRetroScan: "Perform a retroactive scan to identify all datastores where deprovisioned identities still hold explicit permissions.",
        recommendedOngoingDARPolicy: "Ongoing CASB API policy to automatically revoke permissions for suspended or deprovisioned user accounts on sensitive datastores.",
      },
    ],
  },
];

// ── Derived edges (computed once at module load) ──────────────────────────────

export interface DerivedEdge { identityId: string; riskId: string; datastoreId: string; }

/** All unique identity→riskType pairs across all rules */
export const IR_EDGES: [string, string][] = (() => {
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  for (const rt of RISK_TYPES) {
    for (const rule of rt.rules) {
      for (const iId of rule.identityTypes) {
        const key = `${iId}:${rt.id}`;
        if (!seen.has(key)) { seen.add(key); edges.push([iId, rt.id]); }
      }
    }
  }
  return edges;
})();

/** All unique riskType→datastore pairs across all rules */
export const RD_EDGES: [string, string][] = (() => {
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  // "unmanaged" in rule data fans out to the three split nodes
  const UNMANAGED_SPLIT = ["apps", "websites", "peripherals"];
  // "aws-s3" and "aws" both map to the aws-s3 node
  const AWS_S3 = ["aws-s3"];
  // "azure-blob" maps to azure-blob node
  const AZURE_BLOB = ["azure-blob"];

  for (const rt of RISK_TYPES) {
    for (const rule of rt.rules) {
      for (const dId of rule.dataStoreGroups) {
        let ids: string[];
        if (dId === "unmanaged") ids = UNMANAGED_SPLIT;
        else if (dId === "aws") ids = AWS_S3;
        else if (dId === "azure") ids = AZURE_BLOB;
        else ids = [dId];

        for (const id of ids) {
          const key = `${rt.id}:${id}`;
          if (!seen.has(key)) { seen.add(key); edges.push([rt.id, id]); }
        }
      }
    }
  }
  return edges;
})();

/** Per-identity finding totals (sum of findings from all rules that include that identity type) */
export function identityFindings(identityId: string): number {
  let total = 0;
  for (const rt of RISK_TYPES) {
    for (const rule of rt.rules) {
      if (rule.identityTypes.includes(identityId)) total += rule.findings;
    }
  }
  return total;
}
