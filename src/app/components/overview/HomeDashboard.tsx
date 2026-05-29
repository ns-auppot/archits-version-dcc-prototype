import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Database, ArrowRight, Users,
  Globe, X,
  ShieldCheck, AppWindow,
  AlertTriangle, Eye, Lock, Clock, UserMinus, ChevronRight, Sparkles, Network, Gauge,
} from 'lucide-react';

import { UnconnectedDataStoreTable } from './UnconnectedDataStoreTable';
import { DataStoreIcon } from '../inventory/data-store-icons';
import { DataFlowMap } from './DataFlowMap';
import { IdentityRiskSection } from './IdentityRiskSection';
import { WidgetCard } from '../ui/WidgetCard';
import { CoachMark } from '../onboarding/CoachMark';

// ─── Number formatter ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000)   return n.toLocaleString();
  return `${n}`;
}

// ─── Platform Logos (using shared DataStoreIcon) ─────────────────────────────

const PLATFORM_TO_STORE_TYPE: Record<string, string> = {
  'AWS S3':       's3',
  'OneDrive':     'sharepoint-sites',
  'GCP Storage':  'drives',
  'sharepoint':   'sharepoint-sites',
  'Google Drive': 'drives',
  'Azure Blob':   'azure-blob',
  'Salesforce':   'endpoint',
  'Github':       'endpoint',
};

const PlatformLogo = ({ name, size = 18 }: { name: string; size?: number }) => {
  const storeType = PLATFORM_TO_STORE_TYPE[name] ?? 'endpoint';
  return <DataStoreIcon storeType={storeType} size={size} />;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MANAGED_CONNECTED   = 2_840;
const MANAGED_UNCONNECTED = 12_500;

interface ManagedPlatform {
  name: string; stores: number; unconnected?: number; sensitiveObjects: number; navKey: string;
}

const managedPlatforms: ManagedPlatform[] = [
  { name: 'AWS S3',       stores: 840, unconnected: 5_200, sensitiveObjects:  8_200, navKey: 'AWS'        },
  { name: 'OneDrive',     stores: 620,                     sensitiveObjects:  5_400, navKey: 'OneDrive'   },
  { name: 'GCP Storage',  stores: 380, unconnected: 4_800, sensitiveObjects:  3_100, navKey: 'GCP'        },
  { name: 'sharepoint',   stores: 510,                     sensitiveObjects:  4_700, navKey: 'Sharepoint' },
  { name: 'Google Drive', stores: 290,                     sensitiveObjects:  2_300, navKey: 'Drives'     },
  { name: 'Azure Blob',   stores: 140, unconnected: 2_500, sensitiveObjects:  1_800, navKey: 'Azure'      },
  { name: 'Salesforce',   stores:  42,                     sensitiveObjects:    610, navKey: 'Salesforce' },
  { name: 'Github',       stores:  18,                     sensitiveObjects:    240, navKey: 'Github'     },
];

interface UnmanagedApp {
  name: string; category: string; status: 'Sanctioned' | 'Unsanctioned'; sensitiveObjects: number;
}
interface UnmanagedWebsite {
  name: string; category: string; sensitiveObjects: number;
}

const topSanctionedApps: UnmanagedApp[] = [
  { name: 'Google Drive', category: 'File Storage',      status: 'Sanctioned', sensitiveObjects: 24_600 },
  { name: 'OneDrive',     category: 'File Storage',      status: 'Sanctioned', sensitiveObjects: 18_200 },
  { name: 'Slack',        category: 'Collaboration',     status: 'Sanctioned', sensitiveObjects: 11_400 },
  { name: 'Salesforce',   category: 'CRM',               status: 'Sanctioned', sensitiveObjects:  7_800 },
  { name: 'Box',          category: 'File Storage',      status: 'Sanctioned', sensitiveObjects:  5_100 },
];
const topUnsanctionedApps: UnmanagedApp[] = [
  { name: 'ChatGPT',   category: 'AI Assistant',    status: 'Unsanctioned', sensitiveObjects: 12_400 },
  { name: 'Descript',  category: 'Video Recording', status: 'Unsanctioned', sensitiveObjects:  4_800 },
  { name: 'Dropbox',   category: 'File Storage',    status: 'Unsanctioned', sensitiveObjects:  2_200 },
  { name: 'Canva',     category: 'Design Tool',     status: 'Unsanctioned', sensitiveObjects:  1_600 },
  { name: 'Notion',    category: 'Notes / Collab',  status: 'Unsanctioned', sensitiveObjects:    980 },
];
const topWebsites: UnmanagedWebsite[] = [
  { name: 'airtable.com',    category: 'Database / Spreadsheet', sensitiveObjects:  940 },
  { name: 'huggingface.co',  category: 'AI/ML Platform',         sensitiveObjects:  720 },
  { name: 'notion.so',       category: 'Notes / Collaboration',  sensitiveObjects:  210 },
  { name: 'transfernow.net', category: 'File Transfer',          sensitiveObjects:  180 },
  { name: 'pastebin.com',    category: 'Code Sharing',           sensitiveObjects:  140 },
  { name: 'wetransfer.com',  category: 'File Transfer',          sensitiveObjects:  110 },
  { name: 'mega.nz',         category: 'File Storage',           sensitiveObjects:   85 },
  { name: 'replit.com',      category: 'Code Editor',            sensitiveObjects:   72 },
  { name: 'github.com',      category: 'Source Control',         sensitiveObjects:   58 },
  { name: 'reddit.com',      category: 'Social Platform',        sensitiveObjects:   34 },
];

const TOTAL_APP_SANCTIONED   = 1_840;
const TOTAL_APP_UNSANCTIONED = 4_620;

const unconnectedStores = [
  { id:  1, name: 'S3 Bucket',          platform: 'AWS',       account: 'prod-account-1',      firstFound: 'Jan 12, 2025', region: 'us-east-1',       endpoint: 'finance-backup-2023.s3.amazonaws.com',                                      status: 'Available'  },
  { id:  2, name: 'RDS Instance',       platform: 'AWS',       account: 'prod-account-1',      firstFound: 'Jan 15, 2025', region: 'sa-east-1',       endpoint: 'netskope-dspm.ckwcli3g3uhh.sa-east-1.rds.amazonaws.com:3306',               status: 'Available'  },
  { id:  3, name: 'MySQL Cluster',      platform: 'AWS',       account: 'dev-account-2',       firstFound: 'Feb 3, 2025',  region: 'eu-west-1',       endpoint: 'dev-mysql-01.cluster.eu-west-1.rds.amazonaws.com:3306',                     status: 'Available'  },
  { id:  4, name: 'GCS Bucket',         platform: 'GCP',       account: 'gcp-prod-001',        firstFound: 'Feb 8, 2025',  region: 'us-central1',     endpoint: 'gs://analytics-raw-data-bucket',                                             status: 'Available'  },
  { id:  5, name: 'BigQuery Dataset',   platform: 'GCP',       account: 'gcp-prod-001',        firstFound: 'Feb 10, 2025', region: 'us-central1',     endpoint: 'bigquery://gcp-prod-001/analytics_dataset',                                  status: 'Available'  },
  { id:  6, name: 'Azure Blob',         platform: 'Azure',     account: 'azure-corp',          firstFound: 'Feb 20, 2025', region: 'eastus',          endpoint: 'corpdata.blob.core.windows.net/backup-container',                            status: 'Available'  },
  { id:  7, name: 'Box Enterprise',     platform: 'Box',       account: 'enterprise-corp',     firstFound: 'Mar 1, 2025',  region: undefined,         endpoint: 'enterprise-corp.box.com',                                                    status: 'Available'  },
  { id:  8, name: 'Google Workspace',   platform: 'GCP',       account: 'corp@company.com',    firstFound: 'Mar 5, 2025',  region: undefined,         endpoint: 'drive.google.com/corp',                                                      status: 'Available'  },
  { id:  9, name: 'Snowflake',          platform: 'Snowflake', account: 'PROD_ACCOUNT',        firstFound: 'Mar 8, 2025',  region: 'us-east-1',       endpoint: 'abc12345.snowflakecomputing.com:443',                                        status: 'Available'  },
  { id: 10, name: 'Redshift Cluster',   platform: 'AWS',       account: 'data-warehouse',      firstFound: 'Mar 12, 2025', region: 'us-west-2',       endpoint: 'redshift-cluster-1.cqkq6i9u3ym3.us-west-2.redshift.amazonaws.com:5439',     status: 'Available'  },
  { id: 11, name: 'Azure SQL',          platform: 'Azure',     account: 'azure-prod-01',       firstFound: 'Mar 14, 2025', region: 'westeurope',      endpoint: 'prod-sqlserver.database.windows.net:1433',                                   status: 'Available'  },
  { id: 12, name: 'Postgres DB',        platform: 'AWS',       account: 'rds-account-3',       firstFound: 'Mar 18, 2025', region: 'ap-southeast-1',  endpoint: 'postgres-primary.cjk8a9b2.ap-southeast-1.rds.amazonaws.com',                status: 'Available'  },
  { id: 13, name: 'DynamoDB Table',     platform: 'AWS',       account: 'prod-account-2',      firstFound: 'Mar 20, 2025', region: 'us-east-2',       endpoint: 'dynamodb.us-east-2.amazonaws.com/prod-user-table',                          status: 'Available'  },
  { id: 14, name: 'Firestore',          platform: 'GCP',       account: 'gcp-dev-002',         firstFound: 'Mar 22, 2025', region: 'us-east4',        endpoint: 'firestore.googleapis.com/projects/gcp-dev-002/databases',                   status: 'Restricted' },
  { id: 15, name: 'CosmosDB',           platform: 'Azure',     account: 'azure-corp',          firstFound: 'Mar 25, 2025', region: 'eastus2',         endpoint: 'corp-cosmos.documents.azure.com:443',                                        status: 'Available'  },
  { id: 16, name: 'Elasticsearch',      platform: 'AWS',       account: 'search-account',      firstFound: 'Mar 28, 2025', region: 'us-west-1',       endpoint: 'search-cluster.us-west-1.es.amazonaws.com',                                 status: 'Available'  },
  { id: 17, name: 'MongoDB Atlas',      platform: 'MongoDB',   account: 'atlas-prod',          firstFound: 'Apr 1, 2025',  region: 'us-east-1',       endpoint: 'cluster0.abc12.mongodb.net:27017',                                           status: 'Available'  },
  { id: 18, name: 'Databricks',         platform: 'Azure',     account: 'databricks-ws',       firstFound: 'Apr 2, 2025',  region: 'northeurope',     endpoint: 'adb-123456.5.azuredatabricks.net',                                          status: 'Available'  },
  { id: 19, name: 'Oracle Exadata',     platform: 'Oracle',    account: 'oci-prod-001',        firstFound: 'Apr 3, 2025',  region: 'us-ashburn-1',    endpoint: 'exadata-01.sub01.vcn01.oraclevcn.com:1521',                                  status: 'Restricted' },
  { id: 20, name: 'Salesforce Sandbox', platform: 'Salesforce',account: 'sf-sandbox-01',       firstFound: 'Apr 4, 2025',  region: undefined,         endpoint: 'sandbox-corp.sandbox.my.salesforce.com',                                    status: 'Available'  },
  { id: 21, name: 'S3 Glacier',         platform: 'AWS',       account: 'archive-account',     firstFound: 'Apr 5, 2025',  region: 'us-east-1',       endpoint: 'archive-2024.s3-glacier.amazonaws.com',                                     status: 'Available'  },
  { id: 22, name: 'Cloud SQL',          platform: 'GCP',       account: 'gcp-prod-003',        firstFound: 'Apr 6, 2025',  region: 'asia-east1',      endpoint: 'cloudsql.googleapis.com/projects/gcp-prod-003/mysql',                       status: 'Available'  },
  { id: 23, name: 'Teradata',           platform: 'AWS',       account: 'analytics-prod',      firstFound: 'Apr 7, 2025',  region: 'eu-central-1',    endpoint: 'td-cluster.analytics-prod.aws.teradata.com',                                status: 'Available'  },
  { id: 24, name: 'ADLS Gen2',          platform: 'Azure',     account: 'datalake-prod',       firstFound: 'Apr 8, 2025',  region: 'uksouth',         endpoint: 'prodlake.dfs.core.windows.net/raw-data',                                    status: 'Available'  },
  { id: 25, name: 'Kafka Cluster',      platform: 'Confluent', account: 'kafka-prod',          firstFound: 'Apr 9, 2025',  region: 'us-east-1',       endpoint: 'pkc-abc12.us-east-1.aws.confluent.cloud:9092',                              status: 'Available'  },
];

// ─── Unmanaged Destination Data ───────────────────────────────────────────────

const TOTAL_APPS             = 6460;
const TOTAL_WEB_DESTINATIONS = 11050;


// ─── Risk Data ────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

interface RiskRule {
  id: string;
  name: string;
  severity: Severity;
  findings: number;
  deltaFindings: number;
  detectedAt: string;
  daysAgo: number;   // for recency filtering
  categoryId: string;
}

interface RiskCategory {
  id: string;
  name: string;
  iconKey: 'eye' | 'alert' | 'lock' | 'clock' | 'user-minus' | 'shield';
  color: string;
  bgLight: string;
}

const RISK_CATEGORIES: RiskCategory[] = [
  { id: 'overexposed',      name: 'Over-Exposed Sensitive Data',   iconKey: 'eye',        color: '#f97316', bgLight: '#fff7ed' },
  { id: 'exfiltration',     name: 'Data Exfiltration',             iconKey: 'alert',      color: '#ef4444', bgLight: '#fef2f2' },
  { id: 'overprivilege',    name: 'Over-Privilege Identity',       iconKey: 'lock',       color: '#eab308', bgLight: '#fefce8' },
  { id: 'stale',            name: 'Stale Sensitive Data',          iconKey: 'clock',      color: '#8b5cf6', bgLight: '#f5f3ff' },
  { id: 'former-employee',  name: 'Former Employee with Access',   iconKey: 'user-minus', color: '#f43f5e', bgLight: '#fff1f2' },
  { id: 'compliance',       name: 'Compliance & Governance',       iconKey: 'shield',     color: '#10b981', bgLight: '#f0fdf4' },
];

const ALL_RISK_RULES: RiskRule[] = [
  // Over-Exposed Sensitive Data
  { id: 'r-oe1', name: 'Sensitive SaaS Files Exposed via Public Links',         severity: 'High',     findings:  9, deltaFindings:  0, detectedAt: '8d ago',  daysAgo:  8, categoryId: 'overexposed'     },
  { id: 'r-oe2', name: 'Cleartext Credentials Stored in Cloud & SaaS Environments', severity: 'Critical', findings: 11, deltaFindings: +2, detectedAt: '5h ago',  daysAgo:  0, categoryId: 'overexposed'     },
  { id: 'r-oe3', name: 'PII Fields Accessible Without Encryption in Transit',   severity: 'Critical', findings:  4, deltaFindings: +1, detectedAt: '4d ago',  daysAgo:  4, categoryId: 'overexposed'     },
  // Data Exfiltration
  { id: 'r-ex1', name: 'Sensitive Data Ingestion by Generative AI',              severity: 'High',     findings:  8, deltaFindings:  0, detectedAt: '3d ago',  daysAgo:  3, categoryId: 'exfiltration'    },
  { id: 'r-ex2', name: 'Sensitive Data Exposed in ChatGPT Conversations',         severity: 'Critical', findings:  4, deltaFindings: +5, detectedAt: '1h ago',  daysAgo:  0, categoryId: 'exfiltration'    },
  { id: 'r-ex3', name: 'Unauthorized OAuth Token Used to Access Customer Data',  severity: 'Critical', findings:  7, deltaFindings: +2, detectedAt: '6d ago',  daysAgo:  6, categoryId: 'exfiltration'    },
  // Over-Privilege Identity
  { id: 'r-op1', name: 'MFA Disabled for Administrative Accounts',               severity: 'Critical', findings:  8, deltaFindings: +3, detectedAt: '2d ago',  daysAgo:  2, categoryId: 'overprivilege'   },
  { id: 'r-op2', name: 'Excessive Admin Permissions on Service Accounts',        severity: 'High',     findings:  5, deltaFindings:  0, detectedAt: '9d ago',  daysAgo:  9, categoryId: 'overprivilege'   },
  { id: 'r-op3', name: 'Unused Privileged Accounts Active Over 60 Days',         severity: 'Medium',   findings:  3, deltaFindings:  0, detectedAt: '15d ago', daysAgo: 15, categoryId: 'overprivilege'   },
  { id: 'r-op4', name: 'Root Account Used for Non-Emergency Operations',         severity: 'Critical', findings:  5, deltaFindings:  0, detectedAt: '7d ago',  daysAgo:  7, categoryId: 'overprivilege'   },
  // Stale Sensitive Data
  { id: 'r-st1', name: 'Sensitive Data Not Accessed for 90+ Days',               severity: 'Medium',   findings: 12, deltaFindings:  0, detectedAt: '12d ago', daysAgo: 12, categoryId: 'stale'           },
  { id: 'r-st2', name: 'Expired Encryption Keys on Sensitive Stores',            severity: 'High',     findings:  4, deltaFindings:  0, detectedAt: '10d ago', daysAgo: 10, categoryId: 'stale'           },
  { id: 'r-st3', name: 'Backup Files Containing PII Stored Unencrypted',         severity: 'Critical', findings:  6, deltaFindings: +3, detectedAt: '2d ago',  daysAgo:  2, categoryId: 'stale'           },
  // Former Employee with Access
  { id: 'r-fe1', name: 'Active Permissions Retained by Deleted Users',           severity: 'Critical', findings:  3, deltaFindings:  0, detectedAt: '5d ago',  daysAgo:  5, categoryId: 'former-employee' },
  { id: 'r-fe2', name: 'High-Risk User Downloading Sensitive Data',               severity: 'Critical', findings:  4, deltaFindings: +4, detectedAt: '1d ago',  daysAgo:  1, categoryId: 'former-employee' },
  { id: 'r-fe3', name: 'Terminated Contractor OAuth Tokens Still Active',        severity: 'Critical', findings:  5, deltaFindings: +2, detectedAt: '4d ago',  daysAgo:  4, categoryId: 'former-employee' },
  // Compliance & Governance
  { id: 'r-cg1', name: 'Sensitive Data Stores Missing Encryption at Rest',       severity: 'High',     findings: 10, deltaFindings:  0, detectedAt: '6d ago',  daysAgo:  6, categoryId: 'compliance'      },
  { id: 'r-cg2', name: 'PII Retained Beyond Regulatory Retention Limit',         severity: 'Medium',   findings:  7, deltaFindings:  0, detectedAt: '11d ago', daysAgo: 11, categoryId: 'compliance'      },
  { id: 'r-cg3', name: 'Unencrypted Data Transfer to External Services',         severity: 'Critical', findings:  9, deltaFindings: +6, detectedAt: '3d ago',  daysAgo:  3, categoryId: 'compliance'      },
  { id: 'r-cg4', name: 'Audit Logs Disabled on Critical Data Repositories',      severity: 'Critical', findings:  4, deltaFindings: +1, detectedAt: '6d ago',  daysAgo:  6, categoryId: 'compliance'      },
];

// Critical rules newly identified in the last 7 days, sorted most-recent first
const CRITICAL_7D = ALL_RISK_RULES
  .filter(r => r.severity === 'Critical' && r.daysAgo <= 7)
  .sort((a, b) => a.daysAgo - b.daysAgo);

const SEV_META: Record<Severity, { dot: string; label: string; textClass: string; bgClass: string }> = {
  Critical: { dot: '#f43f5e', label: 'C', textClass: 'text-rose-600 dark:text-rose-400',   bgClass: 'bg-rose-50 dark:bg-rose-950/40'   },
  High:     { dot: '#f97316', label: 'H', textClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-950/40' },
  Medium:   { dot: '#3b82f6', label: 'M', textClass: 'text-blue-600 dark:text-blue-400',    bgClass: 'bg-blue-50 dark:bg-blue-950/40'    },
  Low:      { dot: '#9ca3af', label: 'L', textClass: 'text-gray-500 dark:text-slate-400',   bgClass: 'bg-gray-100 dark:bg-slate-800'     },
};

function CategoryIcon({ iconKey, size = 28 }: { iconKey: RiskCategory['iconKey']; color?: string; bgLight?: string; size?: number }) {
  const ico = size <= 20 ? 'w-4 h-4' : 'w-5 h-5';
  const iconEl = (() => {
    switch (iconKey) {
      case 'eye':        return <Eye        className={ico} />;
      case 'alert':      return <AlertTriangle className={ico} />;
      case 'lock':       return <Lock       className={ico} />;
      case 'clock':      return <Clock      className={ico} />;
      case 'user-minus': return <UserMinus  className={ico} />;
      case 'shield':     return <ShieldCheck className={ico} />;
    }
  })();
  return (
    <div className="flex items-center justify-center shrink-0 text-slate-400 dark:text-slate-500" style={{ width: size, height: size }}>
      {iconEl}
    </div>
  );
}


// ─── Unconnected Side Panel ────────────────────────────────────────────────────

function UnconnectedPanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[820px] max-w-full bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-slate-100">Unconnected Data Stores</h2>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              {fmt(MANAGED_UNCONNECTED)} stores discovered but not yet connected
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-3 h-3 text-gray-400" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Search
            </button>
            <button onClick={onClose} className="ml-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <UnconnectedDataStoreTable data={unconnectedStores} />
      </div>
    </>
  );
}

// ─── All Risks Side Panel ─────────────────────────────────────────────────────

function AllRisksPanel({ onClose, onNavigate }: {
  onClose: () => void;
  onNavigate?: (tab: string, filter?: string) => void;
}) {
  const initExpanded = Object.fromEntries(RISK_CATEGORIES.map(c => [c.id, true]));
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initExpanded);

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl" style={{ width: 500 }}>

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900 dark:text-slate-100">Critical Risk Policies — Last 7 Days</h2>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
              {ALL_RISK_RULES.filter(r => r.severity === 'Critical').length} critical policies · {ALL_RISK_RULES.filter(r => r.severity === 'Critical').reduce((s, r) => s + r.findings, 0)} findings across {RISK_CATEGORIES.length} categories
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {RISK_CATEGORIES.map((cat, idx) => {
            const allRules = ALL_RISK_RULES.filter(r => r.categoryId === cat.id && r.severity === 'Critical');
            if (allRules.length === 0) return null;
            const shown       = allRules.slice(0, 3);
            const hiddenCount = allRules.length - shown.length;
            const totalFindings = allRules.reduce((s, r) => s + r.findings, 0);
            const isOpen        = expanded[cat.id];

            return (
              <div key={cat.id} className={idx > 0 ? 'mt-1 border-t border-gray-100 dark:border-slate-800' : 'mt-1'}>
                {/* Collapsible category header */}
                <button
                  className="w-full flex items-center gap-2.5 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                  onClick={() => toggle(cat.id)}
                >
                  <CategoryIcon iconKey={cat.iconKey} color={cat.color} bgLight={cat.bgLight} size={20} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-gray-800 dark:text-slate-100 block">{cat.name}</span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 tabular-nums">
                      {allRules.length} critical {allRules.length !== 1 ? 'policies' : 'policy'} · {totalFindings} findings
                    </span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Policy rows */}
                {isOpen && (
                  <div className="mb-3">
                    {shown.map((rule, ri) => {
                      const sev = SEV_META[rule.severity];
                      return (
                        <div
                          key={rule.id}
                          className={`group flex items-center gap-2.5 pl-5 pr-5 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            ri < shown.length - 1 ? 'border-b border-gray-50 dark:border-slate-800/60' : ''
                          }`}
                          onClick={() => { onClose(); onNavigate?.('risk', `rule:${rule.id}`); }}
                        >
                          {/* Severity label */}
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8.5px] font-semibold min-w-[52px] text-center ${sev.bgClass} ${sev.textClass}`}>
                            {rule.severity}
                          </span>
                          {/* Policy name */}
                          <span className="text-[10.5px] text-gray-700 dark:text-slate-200 flex-1 truncate">{rule.name}</span>
                          {/* Findings + delta */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10.5px] font-semibold text-gray-700 dark:text-slate-300 tabular-nums">{rule.findings}</span>
                          </div>
                          {/* Timestamp */}
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 tabular-nums shrink-0 w-12 text-right">{rule.detectedAt}</span>
                          <ArrowRight className="w-3 h-3 text-gray-200 dark:text-slate-700 group-hover:text-gray-500 transition-colors shrink-0" />
                        </div>
                      );
                    })}
                    {/* "View more" if capped */}
                    {hiddenCount > 0 && (
                      <button
                        className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
                        onClick={() => { onClose(); onNavigate?.('risk', `category:${cat.id}`); }}
                      >
                        View {hiddenCount} more {hiddenCount === 1 ? 'policy' : 'policies'} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 flex justify-center shrink-0">
          <button
            className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors"
            onClick={() => { onClose(); onNavigate?.('risk', 'all'); }}
          >
            Go to Risk page <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Risk Summary Section ─────────────────────────────────────────────────────

const PREVIEW_COUNT = 3;

function NoCriticalRiskEmptyState({ onNavigate }: { onNavigate?: (tab: string, filter?: string) => void }) {
  return (
    <WidgetCard className="px-5 py-4 flex items-center gap-4">
      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">No critical risks detected</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">No new critical findings in the last 7 days.</p>
      </div>
      <button
        className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors shrink-0"
        onClick={() => onNavigate?.('risk', 'all')}
      >
        Go to Risk page <ArrowRight className="w-3 h-3" />
      </button>
    </WidgetCard>
  );
}

function RiskSummarySection({ onNavigate, emptyState }: { onNavigate?: (tab: string, filter?: string) => void; emptyState?: boolean }) {
  const [showPanel, setShowPanel] = useState(false);

  if (emptyState) {
    return <NoCriticalRiskEmptyState onNavigate={onNavigate} />;
  }

  const shown   = CRITICAL_7D.slice(0, PREVIEW_COUNT);
  const hasMore = CRITICAL_7D.length > PREVIEW_COUNT;

  return (
    <>
      <WidgetCard className="overflow-hidden">

        {/* ── Card header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Critical Risks</h3>
          </div>
          <button
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors"
            onClick={() => onNavigate?.('risk', 'all')}
          >
            Go to Risk page <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* ── Column headers ── */}
        <div className="grid items-center px-5 pt-3 pb-1.5"
          style={{ gridTemplateColumns: '72px 1fr 192px 120px 90px 16px' }}>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Severity</span>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Policy</span>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Policy Type</span>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500 text-right pr-12">Findings</span>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Last Detected</span>
          <span />
        </div>

        {/* ── Rule rows ── */}
        <div className="divide-y divide-gray-50 dark:divide-slate-800/60 pb-1">
          {shown.map(rule => {
            const cat = RISK_CATEGORIES.find(c => c.id === rule.categoryId)!;
            const sev = SEV_META[rule.severity];
            return (
              <div
                key={rule.id}
                className="group grid items-center px-5 py-3 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 cursor-pointer transition-colors"
                style={{ gridTemplateColumns: '72px 1fr 192px 120px 90px 16px' }}
                onClick={() => onNavigate?.('risk', `rule:${rule.id}`)}
              >
                {/* Severity badge */}
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-semibold w-fit ${sev.bgClass} ${sev.textClass}`}>
                  {rule.severity}
                </span>

                {/* Rule name */}
                <p className="text-[11px] font-medium text-gray-800 dark:text-slate-100 truncate pr-4 leading-snug">
                  {rule.name}
                </p>

                {/* Rule type */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <CategoryIcon iconKey={cat.iconKey} color={cat.color} bgLight={cat.bgLight} size={18} />
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{cat.name}</span>
                </div>

                {/* Findings + delta */}
                <div className="flex items-center justify-end gap-2 pr-12">
                  <span className="text-[13px] font-bold text-gray-800 dark:text-slate-100 tabular-nums">{rule.findings}</span>
                  </div>

                {/* Timestamp */}
                <span className="text-[10px] text-gray-400 dark:text-slate-500 tabular-nums">{rule.detectedAt}</span>

                {/* Arrow */}
                <ArrowRight className="w-3 h-3 text-gray-200 dark:text-slate-700 group-hover:text-rose-400 dark:group-hover:text-rose-500 transition-colors" />
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        {hasMore && (
          <div className="px-5 py-2.5 border-t border-gray-100 dark:border-slate-800">
            <button
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              onClick={() => setShowPanel(true)}
            >
              Show more policies
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </WidgetCard>

      {showPanel && <AllRisksPanel onClose={() => setShowPanel(false)} onNavigate={onNavigate} />}
    </>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-xs font-bold tracking-wide text-gray-400 dark:text-slate-500">{title}</span>
      {subtitle && <span className="text-[11px] text-gray-400 dark:text-slate-600">{subtitle}</span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HomeDashboard({
  onNavigate,
}: {
  onNavigate?: (tab: string, filter?: string) => void;
  onInvestigate?: (context: { appName: string; riskType: string }) => void;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUnconnected, setShowUnconnected]         = useState(false);
  const [insightsEmptyState, setInsightsEmptyState]   = useState(false);
  const [unmanagedTab, setUnmanagedTab]               = useState<'apps' | 'web'>('apps');
  const [connectionMode, setConnectionMode]           = useState<'both' | 'inline-only' | 'dspm-casb-only'>('both');
  const [showEmptyState, setShowEmptyState]            = useState(false);
  const [tourActive, setTourActive]                    = useState(false);

  useEffect(() => {
    if (searchParams.get('tour') === '1') {
      setTourActive(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const showDAR     = connectionMode !== 'inline-only';
  const showDIM     = connectionMode !== 'dspm-casb-only';
  const showManaged = connectionMode !== 'inline-only';
  const showUnmanaged = connectionMode !== 'dspm-casb-only';

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page title + demo connection state toggles */}
        <div className="flex items-center justify-between">
<div className="flex items-center gap-1.5">
            {(['inline-only', 'dspm-casb-only'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setConnectionMode(prev => prev === mode ? 'both' : mode)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors shrink-0 ${
                  connectionMode === mode
                    ? 'bg-pink-500 text-white'
                    : 'bg-pink-100 text-pink-500 hover:bg-pink-200'
                }`}
              >
                {mode === 'inline-only' ? 'Inline only' : 'DSPM & CASB only'}
              </button>
            ))}
            <button
              onClick={() => setShowEmptyState(s => !s)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors shrink-0 ${
                showEmptyState
                  ? 'bg-pink-500 text-white'
                  : 'bg-pink-100 text-pink-500 hover:bg-pink-200'
              }`}
            >
              Empty state
            </button>
          </div>
        </div>

        {showEmptyState && (
          <div className="space-y-4">
            <div
              className="rounded-lg border border-blue-200 bg-gradient-to-b from-blue-50/40 to-transparent p-5 cursor-pointer dark:border-blue-800/40 dark:from-blue-950/20"
              onClick={() => navigate('/setup')}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 dark:bg-blue-900/30">
                  <Sparkles size={20} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Finish setting up DCC</div>
                  <div className="text-[15px] font-semibold text-slate-800 mt-0.5 dark:text-slate-200">
                    Your Overview will populate once your first scans run
                  </div>
                  <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">
                    Complete the prerequisites in Configuration → Setup Guide. Most teams finish in under 20 minutes.
                  </div>
                </div>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
                  onClick={(e) => { e.stopPropagation(); navigate('/setup'); }}
                >
                  Open Setup Guide <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                <Gauge size={28} className="text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1.5 dark:text-slate-200">
                Awaiting first scan
              </h2>
              <p className="text-[13px] text-slate-500 max-w-md mx-auto dark:text-slate-400">
                Finish setup to start discovering and classifying sensitive data across your estate. The Overview dashboard will populate as your first scan progresses.
              </p>
            </div>
          </div>
        )}

        {!showEmptyState && <>
        {/* Section 1 — Insights */}
        <div data-tour="critical-risks">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold tracking-wide text-gray-400 dark:text-slate-500">Insights</span>
              <span className="text-[11px] text-gray-400 dark:text-slate-600">Critical risk policies with new findings in the last 7 days</span>
            </div>
            {/* Demo toggle — pink = for preview only */}
            <button
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-pink-100 text-pink-500 hover:bg-pink-200 transition-colors shrink-0"
              onClick={() => setInsightsEmptyState(v => !v)}
            >
              {insightsEmptyState ? 'Show data' : 'Empty state'}
            </button>
          </div>
          <RiskSummarySection onNavigate={onNavigate} emptyState={insightsEmptyState} />
        </div>

        {/* Section 2 — Data Findings */}
        <div data-tour="data-findings">
          <SectionLabel
            title="Data Findings"
            subtitle="Sensitive data types detected in storage and in transit, ranked independently"
          />
          <DataFlowMap onNavigate={onNavigate} showDAR={showDAR} showDIM={showDIM} />
        </div>

        {/* Section 3 — Identities */}
        <div data-tour="identities">
          <SectionLabel
            title="Identities"
            subtitle="Coverage across internal, external, and unmanaged user accounts"
          />
          <IdentityRiskSection onNavigate={onNavigate} />
        </div>

        {/* Section 4 — Data Coverage */}
        <div data-tour="data-coverage">
          <SectionLabel
            title="Data Coverage"
            subtitle={
              showManaged && showUnmanaged ? "Managed stores and unmanaged external destinations"
              : showManaged ? "Connected and discovered data stores"
              : "External destinations with detected sensitive data transfer"
            }
          />
          <div className={showManaged && showUnmanaged ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>

            {/* Managed Data Stores */}
            {showManaged && <WidgetCard className="p-5 flex flex-col">
              {/* Title row */}
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Managed Data Stores</h3>
              </div>
              {/* Summary line */}
              <div className="flex items-center gap-1 mb-5">
                <button
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => onNavigate?.('inventory', 'managed-connected')}
                >
                  <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums">{fmt(MANAGED_CONNECTED)}</span>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">connected</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                </button>
                <span className="text-gray-200 dark:text-slate-700 text-lg">·</span>
                <button
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => setShowUnconnected(true)}
                >
                  <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums">{fmt(MANAGED_UNCONNECTED)}</span>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">unconnected</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                </button>
              </div>
              {/* Platform list — 2 columns in solo mode */}
              <div className={!showUnmanaged ? "relative grid grid-cols-2 gap-x-8" : ""}>
                {!showUnmanaged && <div className="absolute inset-y-0 left-1/2 w-px bg-gray-100 dark:bg-slate-800" />}
                {managedPlatforms.slice(0, !showUnmanaged ? managedPlatforms.length : 7).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                    onClick={() => onNavigate?.('inventory', `platform:${p.navKey}`)}
                  >
                    <PlatformLogo name={p.name} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{p.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[10px] font-semibold text-gray-600 dark:text-slate-300 tabular-nums">{fmt(p.stores)} stores</span>
                      </div>
                      {p.unconnected && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 tabular-nums">{fmt(p.unconnected)} unconnected</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(p.sensitiveObjects)}</span>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-center">
                <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors"
                  onClick={() => onNavigate?.('inventory', 'managed')}>
                  View all in Inventory <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </WidgetCard>}

            {/* Unmanaged Destinations */}
            {showUnmanaged && <WidgetCard className="p-5 flex flex-col">
              {/* Title row */}
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Unmanaged Destinations</h3>
              </div>

              {/* Full-width tab toggle */}
              <div className="flex rounded-lg bg-gray-100 dark:bg-slate-800 p-0.5 mb-4">
                {(['apps', 'web'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setUnmanagedTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      unmanagedTab === tab
                        ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
                        : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab === 'apps' ? <><AppWindow className="w-3.5 h-3.5" /> Applications <span className="tabular-nums">{fmt(TOTAL_APPS)}</span></> : <><Globe className="w-3.5 h-3.5" /> Websites <span className="tabular-nums">{fmt(TOTAL_WEB_DESTINATIONS)}</span></>}
                  </button>
                ))}
              </div>

              {/* Applications tab */}
              {unmanagedTab === 'apps' && (
                !showManaged ? (
                  <div className="relative grid grid-cols-2 gap-x-8">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-gray-100 dark:bg-slate-800" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wide text-gray-900 dark:text-slate-100">Sanctioned</span>
                        <span className="text-[8.5px] text-gray-400 dark:text-slate-500 tabular-nums">({fmt(TOTAL_APP_SANCTIONED)})</span>
                        <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                      </div>
                      {topSanctionedApps.map((app, i) => (
                        <div key={i} className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                          onClick={() => onNavigate?.('inventory', 'sanctioned')}>
                          <div className="min-w-0">
                            <span className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{app.name}</span>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">{app.category}</div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(app.sensitiveObjects)}</span>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wide text-gray-900 dark:text-slate-100">Unsanctioned</span>
                        <span className="text-[8.5px] text-gray-400 dark:text-slate-500 tabular-nums">({fmt(TOTAL_APP_UNSANCTIONED)})</span>
                        <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                      </div>
                      {topUnsanctionedApps.map((app, i) => (
                        <div key={i} className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                          onClick={() => onNavigate?.('inventory', 'unsanctioned-apps')}>
                          <div className="min-w-0">
                            <span className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{app.name}</span>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">{app.category}</div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(app.sensitiveObjects)}</span>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wide text-gray-900 dark:text-slate-100">Sanctioned</span>
                      <span className="text-[8.5px] text-gray-400 dark:text-slate-500 tabular-nums">({fmt(TOTAL_APP_SANCTIONED)})</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                    </div>
                    {topSanctionedApps.slice(0, 3).map((app, i) => (
                      <div key={i} className="grid items-center py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                        style={{ gridTemplateColumns: '1fr 140px' }}
                        onClick={() => onNavigate?.('inventory', 'sanctioned')}>
                        <div className="min-w-0">
                          <span className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{app.name}</span>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500">{app.category}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(app.sensitiveObjects)}</span>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-3 mb-1">
                      <span className="text-[10px] font-bold tracking-wide text-gray-900 dark:text-slate-100">Unsanctioned</span>
                      <span className="text-[8.5px] text-gray-400 dark:text-slate-500 tabular-nums">({fmt(TOTAL_APP_UNSANCTIONED)})</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                    </div>
                    {topUnsanctionedApps.slice(0, 3).map((app, i) => (
                      <div key={i} className="grid items-center py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                        style={{ gridTemplateColumns: '1fr 140px' }}
                        onClick={() => onNavigate?.('inventory', 'unsanctioned-apps')}>
                        <div className="min-w-0">
                          <span className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{app.name}</span>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500">{app.category}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(app.sensitiveObjects)}</span>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                        </div>
                      </div>
                    ))}
                  </>
                )
              )}

              {/* Websites tab */}
              {unmanagedTab === 'web' && (
                <div className={!showManaged ? "relative grid grid-cols-2 gap-x-8" : ""}>
                  {!showManaged && <div className="absolute inset-y-0 left-1/2 w-px bg-gray-100 dark:bg-slate-800" />}
                  {!showManaged
                    ? topWebsites.map((site, i) => (
                        <div key={i} className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                          onClick={() => onNavigate?.('inventory', 'websites')}>
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{site.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">{site.category}</div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(site.sensitiveObjects)}</span>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                          </div>
                        </div>
                      ))
                    : topWebsites.slice(0, 7).map((site, i) => (
                        <div key={i} className="grid items-center py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1"
                          style={{ gridTemplateColumns: '1fr 140px' }}
                          onClick={() => onNavigate?.('inventory', 'websites')}>
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-gray-700 dark:text-slate-300">{site.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">{site.category}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[13px] font-bold text-gray-900 dark:text-slate-100 tabular-nums">{fmt(site.sensitiveObjects)}</span>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects</div>
                          </div>
                        </div>
                      ))
                  }
                </div>
              )}
              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-center">
                <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors"
                  onClick={() => onNavigate?.('inventory', unmanagedTab === 'apps' ? 'apps' : 'websites')}>
                  View all in Inventory <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </WidgetCard>}

          </div>
        </div>

        {/* DAR Upsell — inline-only mode */}
        {!showDAR && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20 p-4 mt-2">
          {/* background glow blobs */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full bg-indigo-200/30 dark:bg-indigo-700/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-violet-200/20 dark:bg-violet-700/10 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {/* icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
              <Database className="w-5 h-5 text-white" />
            </div>

            {/* copy */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-indigo-500 dark:text-indigo-400 uppercase">Unlock Data at Rest</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300">
                  <Sparkles className="w-2.5 h-2.5" /> Add-on
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-slate-100 leading-snug">
                You're missing visibility into your data stores
              </h3>
              <p className="mt-0.5 text-[12px] text-gray-500 dark:text-slate-400 whitespace-nowrap">
                Netskope <strong className="text-gray-700 dark:text-slate-200">Data at Rest (DAR)</strong> scans your cloud storage, SaaS apps, and repositories to discover sensitive files — PII, PCI, credentials, and more.
              </p>

              {/* stat pills */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { icon: <Eye className="w-3 h-3" />, label: 'Discover shadow data stores' },
                  { icon: <Lock className="w-3 h-3" />, label: 'Detect overexposed sensitive files' },
                  { icon: <ShieldCheck className="w-3 h-3" />, label: 'Accelerate compliance posture' },
                ].map(({ icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-[11px] text-gray-600 dark:text-slate-300 shadow-sm">
                    <span className="text-indigo-500 dark:text-indigo-400">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex flex-col gap-2 sm:items-end">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-[12px] font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 transition-colors">
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button className="text-[11px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors underline underline-offset-2">
                Talk to sales
              </button>
            </div>
          </div>
        </div>
        )}

        {/* DIM Upsell — CASB-only mode */}
        {!showDIM && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 p-4 mt-2">
          <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full bg-emerald-200/30 dark:bg-emerald-700/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-teal-200/20 dark:bg-teal-700/10 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {/* icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-emerald-900/40">
              <Network className="w-5 h-5 text-white" />
            </div>

            {/* copy */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">Unlock Data in Motion</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-2.5 h-2.5" /> Add-on
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-slate-100 leading-snug">
                You're blind to sensitive data leaving your organization
              </h3>
              <p className="mt-0.5 text-[12px] text-gray-500 dark:text-slate-400 whitespace-nowrap">
                Netskope <strong className="text-gray-700 dark:text-slate-200">Data in Motion (DIM)</strong> monitors data transfers in real time — uploads, shares, and email — before it's too late.
              </p>

              {/* feature pills */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { icon: <Eye className="w-3 h-3" />, label: 'Monitor uploads & transfers' },
                  { icon: <AlertTriangle className="w-3 h-3" />, label: 'Block policy violations in real time' },
                  { icon: <ShieldCheck className="w-3 h-3" />, label: 'Prevent data exfiltration' },
                ].map(({ icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 text-[11px] text-gray-600 dark:text-slate-300 shadow-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex flex-col gap-2 sm:items-end">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-[12px] font-semibold shadow-md shadow-emerald-200 dark:shadow-emerald-900/40 transition-colors">
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button className="text-[11px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors underline underline-offset-2">
                Talk to sales
              </button>
            </div>
          </div>
        </div>
        )}

        </>}
      </div>

      {showUnconnected && <UnconnectedPanel onClose={() => setShowUnconnected(false)} />}

      <CoachMark
        active={tourActive}
        onClose={() => setTourActive(false)}
        onFinish={() => setTourActive(false)}
        steps={[
          { target: '[data-tour="critical-risks"]', title: "Critical risks first", body: "Top-severity risk policies with new findings in the last 7 days. Click any row to drill into the policy detail and remediation steps." },
          { target: '[data-tour="data-findings"]', title: "Stored and transferred sensitive data", body: "Two views of your sensitive data: at-rest in connected stores, and in-motion across SaaS uploads and downloads. Top data types per side, ranked independently." },
          { target: '[data-tour="identities"]', title: "Who has access", body: "Identity coverage across internal users, external partners, unmapped, and unauthenticated accounts — with the count and percentage that touch sensitive data." },
          { target: '[data-tour="data-coverage"]', title: "Coverage and the long tail", body: "On the left: managed stores you have already connected. On the right: unmanaged SaaS apps and websites where data flows externally." },
        ]}
      />
    </div>
  );
}