export type PolicyVerdict = 'alert' | 'allow' | 'block' | 'user-alert-proceed' | 'user-alert-stop'

export type EntityType =
  | 'file'
  | 'column'
  | 'chat-message'
  | 'data-store'
  | 'device'
  | 'identity'
  | 'application'
  | 'website'

export type BadgeSeverity = 'critical' | 'high' | 'medium' | 'info' | 'neutral'

export interface EntityBadge {
  label: string
  severity: BadgeSeverity
  details?: string[]
  description?: string
}

export interface EntityMetric {
  label: string
  value: string
}

// ── Typed context shapes (one per entity type) ────────────────────────────────
//
// Context = stable identity of the entity in the world, independent of the
// policy that detected a finding on it.  Policy-specific observations belong
// in `badges` and `metrics`.

export interface FileContext {
  mimeType?: string   // MIME type or human-readable file type: "text/csv", "application/zip"
  objectId?: string   // Storage-system identifier: S3 object key, Drive file ID, SharePoint GUID
  size?: string       // Human-readable file size: "601 KB", "2.4 MB"
  exposure?: string   // Exposure level: "Internal", "Public", "Anyone with Link"
  owner?: string      // Owner identity email
  dateCreated?: string
  lastModified?: string
}

export interface ColumnContext {
  service?: string          // Platform: "BigQuery", "PostgreSQL", "MySQL"
  dataStore?: string        // Data store name
  database?: string         // Database name
  schema?: string           // Schema name
  table?: string            // Table name
  account?: string          // Instance or project
  entityDataType?: string   // "Email Addresses", "SSN", "Credit Card Numbers"
  status?: string           // "Active", "Inactive"
  firstSeenOn?: string      // datetime string
  lastModified?: string     // datetime string
  sensitiveRecords?: string // e.g. "19 sensitive"
}

export interface ChatMessageContext {
  application: string       // "ChatGPT Enterprise", "Slack", "Microsoft Viva Engage"
  sender?: string           // Sender email
  senderId?: string
  messageId?: string
  exposure?: string         // "External", "Internal"
  channel?: string          // Channel or conversation name
  channelId?: string
  dateSent?: string
  attachments?: string      // e.g. "0", "3"
  lastModified?: string
  appSuite?: string         // e.g. "Office365"
  appCategory?: string      // e.g. "Collaboration"
  instanceName?: string     // e.g. "nskloudless.onmicrosoft.com"
}

export interface DataStoreContext {
  service: string           // "AWS S3", "Google Drive", "SharePoint", "AWS RDS"
  account?: string          // Tenant domain or cloud account: "acme.google.com"
  region?: string           // Cloud region: "us-east-1"
  owner?: string            // Owner identity (for personal drives)
  organization?: string     // e.g. "Acme Corporation"
  driveType?: string        // e.g. "Shared Drive", "Personal Drive", "S3 Bucket"
  dateCreated?: string
  lastDiscoveryScan?: string
}

export interface DeviceContext {
  managementStatus: 'managed' | 'unmanaged' | 'byod'
  platform?: string       // OS/platform: "Windows 11", "macOS", "Removable Media"
  owner?: string          // Primary user email
  serialNumber?: string
  macAddress?: string
  clientVersion?: string
  uniqueDeviceId?: string
}

export interface IdentityContext {
  idp: string         // Identity provider: "AWS IAM", "Azure AD", "Okta", "Active Directory"
  identityType: 'user' | 'service-account' | 'external' | 'ghost'
  status: 'active' | 'suspended' | 'stale' | 'unlinked'
  group?: string       // e.g. "Data Platform", "Engineering", "Sales"
  orgUnit?: string     // e.g. "Engineering", "Finance", "HR"
  dateCreated?: string // e.g. "2022-03-15"
}

export interface ApplicationContext {
  category: string          // "Cloud Storage", "Generative AI", "File Sharing", "CRM"
  sanctioned: boolean
  instanceType?: 'corporate' | 'personal' | 'unknown'
  cciScore?: number
  destinationType?: string  // "Application", "Website"
  firstAccess?: string      // date string, e.g. "2024-11-03"
}

export interface WebsiteContext {
  urlCategory: string   // "Personal Webmail", "Tor / Anonymizer", "Public Repository", "Uncategorized"
  destination?: string  // Specific URL, domain, or IP
  destinationType?: string  // "Website"
  firstAccess?: string      // date string, e.g. "2024-11-03"
}

export type EntityContext =
  | FileContext
  | ColumnContext
  | ChatMessageContext
  | DataStoreContext
  | DeviceContext
  | IdentityContext
  | ApplicationContext
  | WebsiteContext

// ── Core entities ─────────────────────────────────────────────────────────────

export interface TopologyEntity {
  id: string
  type: EntityType
  name: string
  context: EntityContext
  badges?: EntityBadge[]
  metrics?: EntityMetric[]
  isFocal?: boolean
}

export interface TopologyAction {
  id: string
  label: string
  policyVerdict: PolicyVerdict
  badges?: EntityBadge[]
}

export interface TopologyEdge {
  id: string
  source: string
  target: string
  label?: string
  sourceHandle?: string
  targetHandle?: string
}

export interface TopologyDefinition {
  policyId: string
  policyName: string
  sheet: string
  entities: TopologyEntity[]
  actions: TopologyAction[]
  edges: TopologyEdge[]
  summary: string
  severity: BadgeSeverity
  policyVerdict?: PolicyVerdict  // required for all inline policies
}
