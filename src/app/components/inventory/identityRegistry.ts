// ── Unified Identity Registry ────────────────────────────────────────────────
//
// Single source of truth for all identity data used across:
//   - InventoryNav.tsx       (6 category labels)
//   - AccessRadarDiagram.tsx (radar nodes — entries with dataStores)
//   - DataMotionSankey.tsx   (transaction actors — entries with inTransactions)
//   - DataExplorerPage.tsx   (left-panel identity list, same for both tabs)

export type IdentityType =
  | "internal-user"
  | "external-user"
  | "unknown-identity"
  | "unmapped-local-user"
  | "service-account"
  | "connected-app";

export interface RegistryIdentity {
  id: string;
  name: string;
  email?: string;
  identityType: IdentityType;
  role: string;
  department: string;    // team/group label (Sankey "User Group" column)
  dataStores: string[];  // store IDs → non-empty means node appears in Radar
  inTransactions: boolean; // true → identity appears in Sankey transaction log
}

// Matches the nav category order exactly
export const IDENTITY_TYPE_GROUPS: {
  typeId: IdentityType;
  label: string;
  description: string;
}[] = [
  { typeId: "internal-user",      label: "Internal User",       description: "Company employees with system access" },
  { typeId: "external-user",      label: "External User",       description: "Partners, contractors & vendors" },
  { typeId: "unknown-identity",   label: "Unauthenticated",    description: "Anonymous or unidentified access" },
  { typeId: "unmapped-local-user",label: "Unlinked",           description: "OS-level & database-native accounts not linked to a managed identity" },
  { typeId: "service-account",    label: "Service Account",     description: "Automated services & pipelines" },
  { typeId: "connected-app",      label: "Connected App",       description: "Connected applications & external integrations" },
];

// Lookup: typeId → display label (e.g. "service-account" → "Service Account")
export const IDENTITY_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  IDENTITY_TYPE_GROUPS.map((g) => [g.typeId, g.label]),
);

// Machine-type identities get a Bot icon; human-type identities get a User icon
export const MACHINE_TYPES = new Set<IdentityType>([
  "service-account",
  "connected-app",
]);

export const IDENTITY_REGISTRY: RegistryIdentity[] = [

  // ── Internal Users ─────────────────────────────────────────────────────────
  // Has inventory data-store access AND generates transactions
  {
    id: "alice-chen",
    name: "Alice Chen",
    email: "alice.chen@corp.internal",
    identityType: "internal-user",
    role: "Data Engineer",
    department: "Data",
    dataStores: ["d1", "s1", "s2", "rds3", "pg3"],
    inTransactions: true,
  },
  {
    id: "brian-kowalski",
    name: "Brian Kowalski",
    email: "brian.kowalski@corp.internal",
    identityType: "internal-user",
    role: "Analyst",
    department: "Analytics",
    dataStores: ["d2", "rds2", "rds3", "asql1", "asql2"],
    inTransactions: true,
  },
  {
    id: "diana-reyes",
    name: "Diana Reyes",
    email: "diana.reyes@corp.internal",
    identityType: "internal-user",
    role: "SOC Lead",
    department: "Security",
    dataStores: ["s1", "s2", "pg1", "ora1", "rds1", "d3", "sp2", "ab1"],
    inTransactions: true,
  },

  // ── Additional Internal Users ────────────────────────────────────────────────
  {
    id: "tom-hargrove",
    name: "Tom Hargrove",
    email: "tom.hargrove@corp.internal",
    identityType: "internal-user",
    role: "DevOps Engineer",
    department: "DevOps",
    dataStores: ["d1", "rds1"],
    inTransactions: true,
  },
  {
    id: "nina-volkov",
    name: "Nina Volkov",
    email: "nina.volkov@corp.internal",
    identityType: "internal-user",
    role: "Backend Engineer",
    department: "Engineering",
    dataStores: ["pg2", "rds2"],
    inTransactions: true,
  },
  {
    id: "marcus-webb",
    name: "Marcus Webb",
    email: "marcus.webb@corp.internal",
    identityType: "internal-user",
    role: "Product Manager",
    department: "Product",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "sarah-okonkwo",
    name: "Sarah Okonkwo",
    email: "sarah.okonkwo@corp.internal",
    identityType: "internal-user",
    role: "UX Designer",
    department: "Design",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "lisa-park",
    name: "Lisa Park",
    email: "lisa.park@corp.internal",
    identityType: "internal-user",
    role: "HR Coordinator",
    department: "HR",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "kevin-marsh",
    name: "Kevin Marsh",
    email: "kevin.marsh@corp.internal",
    identityType: "internal-user",
    role: "Sales Engineer",
    department: "Sales",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "omar-farouk",
    name: "Omar Farouk",
    email: "omar.farouk@corp.internal",
    identityType: "internal-user",
    role: "Finance Analyst",
    department: "Finance",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "chloe-dupont",
    name: "Chloe Dupont",
    email: "chloe.dupont@corp.internal",
    identityType: "internal-user",
    role: "Marketing Manager",
    department: "Marketing",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "raj-patel",
    name: "Raj Patel",
    email: "raj.patel@corp.internal",
    identityType: "internal-user",
    role: "QA Engineer",
    department: "Engineering",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "yuki-tanaka",
    name: "Yuki Tanaka",
    email: "yuki.tanaka@corp.internal",
    identityType: "internal-user",
    role: "IT Support",
    department: "IT",
    dataStores: [],
    inTransactions: false,
  },

  // ── External Users ─────────────────────────────────────────────────────────
  {
    id: "james-thornton",
    name: "James Thornton",
    email: "j.thornton@partner.io",
    identityType: "external-user",
    role: "Partner",
    department: "External",
    dataStores: ["sp1", "sp2", "asql1"],
    inTransactions: true,
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    email: "priya.nair@contractor.net",
    identityType: "external-user",
    role: "Contractor",
    department: "External",
    dataStores: ["d4", "sp3", "ab2"],
    inTransactions: true,
  },

  // ── Additional External Users ────────────────────────────────────────────────
  {
    id: "stefan-brauer",
    name: "Stefan Brauer",
    email: "stefan.brauer@vendor.de",
    identityType: "external-user",
    role: "Vendor",
    department: "External",
    dataStores: ["sp1"],
    inTransactions: true,
  },
  {
    id: "carlos-rivera",
    name: "Carlos Rivera",
    email: "carlos.rivera@partner.io",
    identityType: "external-user",
    role: "Partner",
    department: "External",
    dataStores: ["asql2"],
    inTransactions: true,
  },
  {
    id: "amara-osei",
    name: "Amara Osei",
    email: "amara.osei@audit.org",
    identityType: "external-user",
    role: "Auditor",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "luke-hennessy",
    name: "Luke Hennessy",
    email: "luke.hennessy@consult.co",
    identityType: "external-user",
    role: "Consultant",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "mei-lin",
    name: "Mei Lin",
    email: "mei.lin@contractor.net",
    identityType: "external-user",
    role: "Contractor",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "fatima-al-hassan",
    name: "Fatima Al-Hassan",
    email: "f.alhassan@vendor.ae",
    identityType: "external-user",
    role: "Vendor",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "ben-nakamura",
    name: "Ben Nakamura",
    email: "ben.nakamura@freelance.dev",
    identityType: "external-user",
    role: "Freelancer",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "ingrid-sorensen",
    name: "Ingrid Sorensen",
    email: "ingrid.sorensen@consult.dk",
    identityType: "external-user",
    role: "Consultant",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "david-okonkwo",
    name: "David Okonkwo",
    email: "david.okonkwo@audit.org",
    identityType: "external-user",
    role: "Auditor",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },
  {
    id: "lena-brandt",
    name: "Lena Brandt",
    email: "lena.brandt@partner.de",
    identityType: "external-user",
    role: "Partner",
    department: "External",
    dataStores: [],
    inTransactions: false,
  },

  // ── Unknown Identities ─────────────────────────────────────────────────────
  // Observed in transaction logs only; no known inventory access
  {
    id: "anon-http-01",
    name: "anon-http-01",
    identityType: "unknown-identity",
    role: "Unknown",
    department: "Unknown",
    dataStores: [],
    inTransactions: true,
  },
  {
    id: "anon-http-02",
    name: "anon-http-02",
    identityType: "unknown-identity",
    role: "Unknown",
    department: "Unknown",
    dataStores: [],
    inTransactions: true,
  },

  // ── Unmapped Local Users ───────────────────────────────────────────────────
  // OS-level / database-native accounts; have data-store access and generate DB query events
  {
    id: "root",
    name: "root",
    identityType: "unmapped-local-user",
    role: "Local Account",
    department: "System",
    dataStores: ["pg1", "pg2", "pg4"],
    inTransactions: true,
  },
  {
    id: "postgres",
    name: "postgres",
    identityType: "unmapped-local-user",
    role: "Local Account",
    department: "System",
    dataStores: ["pg1", "pg2"],
    inTransactions: true,
  },
  {
    id: "oracledb-admin",
    name: "oracledb_admin",
    identityType: "unmapped-local-user",
    role: "Local Account",
    department: "System",
    dataStores: ["ora1", "ora2", "ora3"],
    inTransactions: true,
  },
  {
    id: "svc-reporting",
    name: "svc_reporting",
    identityType: "unmapped-local-user",
    role: "Local Account",
    department: "System",
    dataStores: ["rds3", "asql3", "rds4", "asql2"],
    inTransactions: true,
  },
  {
    id: "svc-etl",
    name: "svc_etl",
    identityType: "unmapped-local-user",
    role: "Local Account",
    department: "System",
    dataStores: ["rds1", "pg1", "s1"],
    inTransactions: true,
  },

  // ── Service Accounts ───────────────────────────────────────────────────────
  {
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    identityType: "service-account",
    role: "Service Account",
    department: "DevOps",
    dataStores: ["d1", "s2", "pg3", "rds1", "rds4"],
    inTransactions: true,
  },
  {
    id: "data-sync-bot",
    name: "Data Sync Bot",
    identityType: "service-account",
    role: "Service Account",
    department: "Data",
    dataStores: ["s1", "rds1", "rds2", "asql1", "ab1", "ab2"],
    inTransactions: true,
  },
  {
    id: "svc-backend-api",
    name: "svc-backend-api",
    identityType: "service-account",
    role: "Service Account",
    department: "Engineering",
    dataStores: [],
    inTransactions: true,
  },
  {
    id: "svc-payment-proc",
    name: "svc-payment-proc",
    identityType: "service-account",
    role: "Service Account",
    department: "Finance",
    dataStores: [],
    inTransactions: true,
  },
  {
    id: "svc-analytics",
    name: "svc-analytics",
    identityType: "service-account",
    role: "Service Account",
    department: "Analytics",
    dataStores: [],
    inTransactions: true,
  },

  // ── Connected Apps ─────────────────────────────────────────────────────────
  // Includes AI agents, 3rd-party app integrations, and external application connectors
  {
    id: "support-copilot",
    name: "Support Copilot",
    identityType: "connected-app",
    role: "Connected App",
    department: "Support",
    dataStores: ["d4", "sp3", "asql1", "ab2"],
    inTransactions: true,
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    identityType: "connected-app",
    role: "Connected App",
    department: "Engineering",
    dataStores: ["d1", "pg3"],
    inTransactions: true,
  },
  {
    id: "data-classifier",
    name: "Data Classifier",
    identityType: "connected-app",
    role: "Connected App",
    department: "Security",
    dataStores: ["s1", "s3", "ab3"],
    inTransactions: true,
  },
  {
    id: "threat-scanner",
    name: "Threat Scanner",
    identityType: "connected-app",
    role: "Connected App",
    department: "Security",
    dataStores: ["s2", "pg1", "rds1", "ora1"],
    inTransactions: true,
  },
  {
    id: "data-pipeline-prod",
    name: "data-pipeline-prod",
    identityType: "connected-app",
    role: "Connected App",
    department: "Data",
    dataStores: [],
    inTransactions: true,
  },
  {
    id: "clinical-etl-svc",
    name: "clinical-etl-svc",
    identityType: "connected-app",
    role: "Connected App",
    department: "External",
    dataStores: [],
    inTransactions: true,
  },
  {
    id: "ext-api-partner",
    name: "ext-api.partner.io",
    identityType: "connected-app",
    role: "Connected App",
    department: "External",
    dataStores: [],
    inTransactions: true,
  },
  {
    id: "slack-webhook-prod",
    name: "slack-webhook-prod",
    identityType: "connected-app",
    role: "Connected App",
    department: "External",
    dataStores: [],
    inTransactions: true,
  },
];

// Convenience views
export const RADAR_IDENTITIES = IDENTITY_REGISTRY.filter(
  (i) => i.dataStores.length > 0,
);
export const TRANSACTION_IDENTITIES = IDENTITY_REGISTRY.filter(
  (i) => i.inTransactions,
);