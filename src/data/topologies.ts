import { type TopologyDefinition } from '@/types/topology'

export const topologies: TopologyDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Sheet 1: (IaaS+SaaS+on-prem) Combined Risks
  // ─────────────────────────────────────────────────────────────────────────────
  {
    policyId: 'P01',
    policyName: 'Cleartext Credentials Stored in Cloud & SaaS Environments',
    sheet: '(IaaS+SaaS+on-prem) Combined Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'config.yml',
        context: { mimeType: 'text/yaml', size: '4 KB', exposure: 'Internal', owner: 'svc-deploy@corp.com', dateCreated: '2023-01-12', lastModified: '2024-11-03' },
        isFocal: true,
        badges: [
          { label: 'Cleartext Credentials', severity: 'critical', description: 'These credentials are stored in plaintext — anyone with file access can read and use them immediately without any decryption.' },
          { label: 'Sensitive Data Type', severity: 'critical', details: ['AWS Access Key', 'Private Key', 'Database Password'] },
        ],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 's3-prod-configs',
        context: { service: 'AWS S3', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'S3 Bucket', region: 'us-east-1', dateCreated: '2021-03-10', lastDiscoveryScan: '2025-01-22' },
        badges: [{ label: 'Exposure: Internal', severity: 'medium' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'stored in' },
    ],
    summary: 'File: config.yml · Data Store: s3-prod-configs (AWS S3) · Exposure: Internal · EDTs found: AWS Access Key, Private Key · Action: Alert',
    severity: 'critical',
  },
  {
    policyId: 'P02',
    policyName: 'Sensitive Data Exposed via Public Links or Global Access',
    sheet: '(IaaS+SaaS+on-prem) Combined Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'HR Confidential',
        context: { service: 'Google Drive', account: 'acme-hr.google.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'hr-admin@corp.com', dateCreated: '2020-06-01', lastDiscoveryScan: '2025-01-21' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'Medical_Records_Q3.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '1.2 MB', exposure: 'Internal', owner: 'admin@corp.com', dateCreated: '2024-09-01', lastModified: '2024-09-15' },
        isFocal: true,
        badges: [
          { label: 'Public Access', severity: 'critical' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Medical Records', 'Personal Names', 'Social Security Numbers'] },
        ],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'store', target: 'file', label: 'contains' },
    ],
    summary: 'Drive: acme-hr.google.com "HR Confidential" · Exposure: "Anyone with Link" (Public) · Content: Matches "Sensitive" DLP Profile — Medical Records, Social Security Numbers (9 data types)',
    severity: 'critical',
  },
  {
    policyId: 'P03',
    policyName: 'Suspended Users Retaining Access to Sensitive Data',
    sheet: '(IaaS+SaaS+on-prem) Combined Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'j.smith@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'suspended', group: 'Finance', orgUnit: 'Finance', dateCreated: '2021-06-14' },
        isFocal: true,
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'hr-files',
        context: { service: 'SharePoint', account: 'acme.sharepoint.com', organization: 'Acme Corporation', driveType: 'Document Library', owner: 'hr-admin@corp.com', dateCreated: '2019-11-15', lastDiscoveryScan: '2025-01-20' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Social Security Numbers', 'Healthcare IDs', 'Telephone Numbers', 'Email Addresses'] }],
        metrics: [{ label: 'Accessible files', value: '312' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'store', label: 'has access to' },
    ],
    summary: 'Identity: j.smith@corp.com · IdP Status: Suspended · App/Data Store: SharePoint hr-files · Accessible EDTs: PII, Healthcare IDs · Sensitive files accessible: 312',
    severity: 'critical',
  },
  {
    policyId: 'P04',
    policyName: 'Stale Users Retaining Access to Sensitive Data',
    sheet: '(IaaS+SaaS+on-prem) Combined Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'b.chen@corp.com',
        context: { idp: 'Azure AD', identityType: 'user', status: 'stale', group: 'Data Platform', orgUnit: 'Engineering', dateCreated: '2020-11-03' },
        isFocal: true,
        metrics: [{ label: 'Last Active', value: '127 days ago' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'finance-reports',
        context: { service: 'OneDrive', account: 'acme-finance.onedrive.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'finance@corp.com', dateCreated: '2021-08-22', lastDiscoveryScan: '2025-01-19' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Financial IDs', 'Bank Account Information', 'Payment Cards', 'Taxpayer IDs'] }],
        metrics: [{ label: 'Accessible files', value: '89' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'store', label: 'has access to' },
    ],
    summary: 'Identity: b.chen@corp.com · Last Activity: 127 days ago · App/Data Store: OneDrive finance-reports · Accessible EDTs: Financial Records · Sensitive files accessible: 89',
    severity: 'high',
  },
  {
    policyId: 'P05',
    policyName: 'Stale Sensitive Data Retained Beyond 1 Year',
    sheet: '(IaaS+SaaS+on-prem) Combined Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'patient-records-2022.csv',
        context: { mimeType: 'text/csv', size: '4.2 GB', exposure: 'Internal', owner: 'data-ops@corp.com', dateCreated: '2022-01-15', lastModified: '2022-11-30' },
        isFocal: true,
        badges: [
          { label: 'Stale Data', severity: 'high', description: 'Data has not been accessed in over 365 days — retaining it increases compliance risk and expands the attack surface unnecessarily.' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Social Security Numbers', 'Healthcare IDs', 'Medical Records', 'Birthdates'] },
        ],
        metrics: [{ label: 'Last Accessed', value: '14 months ago' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'archive-2022',
        context: { service: 'AWS S3', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'S3 Bucket', region: 'us-east-1', dateCreated: '2022-01-01', lastDiscoveryScan: '2025-01-18' },
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'stored in' },
    ],
    summary: 'File: patient-records-2022.csv · Data Store: archive-2022 (AWS S3) · Last Accessed: 14 months ago · Data Volume: 4.2 GB · EDTs found: PII, Healthcare Records · Action: Alert',
    severity: 'high',
  },
  {
    policyId: 'P06',
    policyName: 'Over-Exposed Stale Sensitive Data',
    sheet: '(IaaS+SaaS+on-prem) Combined Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'legacy-docs',
        context: { service: 'Google Drive', account: 'acme.google.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'it-admin@corp.com', dateCreated: '2018-04-30', lastDiscoveryScan: '2025-01-17' },
        isFocal: true,
        badges: [
          { label: 'Stale Data', severity: 'high', description: 'Data has not been accessed in over 365 days — retaining it increases compliance risk and expands the attack surface unnecessarily.' },
          { label: 'Public Access', severity: 'critical' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Financial IDs', 'Bank Account Information', 'Payment Cards', 'Corporate Tax IDs', 'Company Names'] },
        ],
        metrics: [{ label: 'Last Accessed', value: '18 months ago' }],
      },
    ],
    actions: [],
    edges: [],
    summary: 'Data Store: legacy-docs (Google Drive) · Last Accessed: 18 months ago · Exposure: Public · EDTs found: Financial Records, Contracts · Action: Alert',
    severity: 'critical',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Sheet 2: IaaS & On-Prem Risks
  // ─────────────────────────────────────────────────────────────────────────────
  {
    policyId: 'P07',
    policyName: 'Sensitive Data Stores Missing Encryption at Rest',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'rds-prod-customer',
        context: { service: 'AWS RDS', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'Database Instance', region: 'us-east-1', dateCreated: '2020-09-14', lastDiscoveryScan: '2025-01-22' },
        isFocal: true,
        badges: [
          { label: 'Encryption OFF', severity: 'critical' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Payment Cards', 'Social Security Numbers', 'Telephone Numbers', 'Postal Addresses'] },
        ],
      },
    ],
    actions: [],
    edges: [],
    summary: 'Data Store: rds-prod-customer (AWS RDS) · Encryption: Disabled · KMS Key: Default · EDTs found: Customer PII, Credit Cards · Action: Alert Critical',
    severity: 'critical',
  },
  {
    policyId: 'P08',
    policyName: 'Ghost Users with Access to Sensitive Data',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'svc-legacy-proc',
        context: { idp: 'AWS IAM', identityType: 'ghost', status: 'unlinked', dateCreated: '2019-04-22' },
        isFocal: true,
        metrics: [{ label: 'Accessible files', value: '1,240' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'sensitive-backups',
        context: { service: 'AWS S3', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'S3 Bucket', region: 'us-east-1', dateCreated: '2021-06-17', lastDiscoveryScan: '2025-01-20' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Social Security Numbers', 'Financial IDs', 'Bank Account Information', 'Taxpayer IDs'] }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'store', label: 'phantom access' },
    ],
    summary: 'Identity: svc-legacy-proc (AWS IAM) · Status: Unlinked (Ghost) · Accessible EDTs: PII, Financial Records · Sensitive files/columns accessible: 1,240',
    severity: 'critical',
  },
  {
    policyId: 'P09',
    policyName: 'Ghost Database with Sensitive Data',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'db-archive-2021',
        context: { service: 'AWS RDS', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'Database Instance', region: 'us-east-1', dateCreated: '2021-01-15', lastDiscoveryScan: '2025-01-21' },
        isFocal: true,
        badges: [
          { label: 'Ghost DB', severity: 'critical', description: 'A database with no active connections for over 30 days — likely forgotten infrastructure that still holds sensitive data and receives no security oversight.' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Postal Addresses', 'Social Security Numbers', 'Birthdates'] },
        ],
        metrics: [{ label: 'Last Access', value: '47 days ago' }],
      },
    ],
    actions: [],
    edges: [],
    summary: 'Data Store: db-archive-2021 (AWS RDS) · Connections: 0 for >30 days · Last Access: 47 days ago · EDTs found: Customer Records, PII · Action: Alert',
    severity: 'critical',
  },
  {
    policyId: 'P10',
    policyName: 'Ghost Users (Unresolved SIDs) in Sensitive File ACLs',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'S-1-5-21-3847...',
        context: { idp: 'Active Directory', identityType: 'ghost', status: 'unlinked', dateCreated: '2018-09-17' },
        isFocal: true,
        badges: [
          { label: 'Unresolved SID', severity: 'critical', description: 'Security Identifier cannot be mapped to any Active Directory account — the original user or group was likely deleted, leaving a dangling ACL entry.' },
        ],
        metrics: [{ label: 'Accessible files', value: '320' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'finance-shares',
        context: { service: 'File Server', account: '\\\\srv-finance', organization: 'Acme Corporation', driveType: 'File Share', owner: 'it-admin@corp.com', dateCreated: '2017-05-20', lastDiscoveryScan: '2025-01-22' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Financial IDs', 'Bank Account Information', 'Payment Cards', 'Taxpayer IDs', 'Corporate Tax IDs'] }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'store', label: 'orphan ACL in' },
    ],
    summary: 'Identity: S-1-5-21-3847... (Unresolved SID) · Data Store: finance-shares (File Server) · No AD object mapping · Accessible EDTs: Financial Data · Files accessible: 320',
    severity: 'critical',
  },
  {
    policyId: 'P11',
    policyName: 'Sensitive Files with Broken Permission Inheritance',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'payroll-2024.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '3.8 MB', exposure: 'Internal', owner: 'hr-admin@corp.com', dateCreated: '2024-01-15', lastModified: '2024-12-01' },
        isFocal: true,
        badges: [
          { label: 'Inheritance Disabled', severity: 'critical', description: 'Permissions are not inherited from the parent folder — explicit ACL entries on this file bypass standard access controls and may grant unintended access.' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Social Security Numbers', 'Bank Account Information', 'Personal Names', 'Taxpayer IDs'] },
        ],
        metrics: [{ label: 'Identities with access', value: '47' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'hr-root',
        context: { service: 'File Server', account: '\\\\srv-hr', organization: 'Acme Corporation', driveType: 'File Share', owner: 'hr-admin@corp.com', dateCreated: '2016-09-08', lastDiscoveryScan: '2025-01-21' },
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'stored in' },
    ],
    summary: 'File: payroll-2024.xlsx · Data Store: hr-root (File Server) · Inheritance: Explicitly Disabled · EDTs found: Payroll Data, SSNs · Identities with access: 47',
    severity: 'critical',
  },
  {
    policyId: 'P12',
    policyName: 'Risky Users with Access to Sensitive Shares',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'd.reyes@corp.com',
        context: { idp: 'Active Directory', identityType: 'user', status: 'active', group: 'Finance Ops', orgUnit: 'Finance', dateCreated: '2020-02-28' },
        isFocal: true,
        badges: [
          { label: 'High Risk', severity: 'critical', description: 'User and Entity Behavior Analytics flagged this identity above the high-risk threshold based on anomalous activity patterns.' },
        ],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'finance-shares',
        context: { service: 'File Server', account: '\\\\srv-finance', organization: 'Acme Corporation', driveType: 'File Share', owner: 'it-admin@corp.com', dateCreated: '2017-05-20', lastDiscoveryScan: '2025-01-22' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Financial IDs', 'Bank Account Information', 'Payment Cards', 'Corporate Tax IDs', 'Securities IDs', 'Currency'] }],
        metrics: [{ label: 'Accessible files', value: '830' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'store', label: 'R/W access to' },
    ],
    summary: 'Identity: d.reyes@corp.com · Risk Level: High (UEBA) · Data Store: finance-shares · Accessible EDTs: Financial Records · Files accessible: 830 · Permission: Read/Write',
    severity: 'critical',
  },
  {
    policyId: 'P13',
    policyName: 'Publicly Accessible Sensitive Data in Google BigQuery',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'analytics-prod',
        context: { service: 'Google BigQuery', account: 'acme-analytics.google.com', organization: 'Acme Corporation', driveType: 'Dataset', region: 'us-central1', dateCreated: '2022-03-18', lastDiscoveryScan: '2025-01-22' },
        isFocal: true,
        badges: [
          { label: 'allUsers access', severity: 'critical', description: 'IAM policy grants access to allUsers or allAuthenticatedUsers, meaning any person on the internet can read this dataset.' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Payment Cards', 'Social Security Numbers', 'IP Addresses', 'UUIDs'] },
        ],
      },
    ],
    actions: [],
    edges: [],
    summary: 'Dataset: analytics-prod (Google BigQuery) · Access List: allUsers, allAuthenticatedUsers · EDTs found: Customer PII, Transaction Data · Action: Alert Critical',
    severity: 'critical',
  },
  {
    policyId: 'P14',
    policyName: 'Sensitive S3 Bucket Accessible by External AWS Account',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'ml-training-data',
        context: { service: 'AWS S3', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'S3 Bucket', region: 'us-east-1', dateCreated: '2023-07-29', lastDiscoveryScan: '2025-01-20' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Birthdates', 'Social Security Numbers', 'Healthcare IDs'] }],
      },
      {
        id: 'identity',
        type: 'identity',
        name: 'acct:394829471234',
        context: { idp: 'AWS IAM', identityType: 'external', status: 'active', dateCreated: '2023-01-10' },
        badges: [{ label: 'External User', severity: 'critical', description: 'An external AWS account outside your organization has been granted access to this bucket via a bucket policy.' }],
        metrics: [{ label: 'Account ID', value: '394829471234' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'store', target: 'identity', label: 'grants access to' },
    ],
    summary: 'Bucket: ml-training-data (AWS S3) · External Account ID: 394829471234 · Policy: Principal = External Account · EDTs found: Training Data, PII · Action: Alert',
    severity: 'critical',
  },
  {
    policyId: 'P15',
    policyName: 'European Personal Data Stored Outside Europe',
    sheet: 'IaaS & On-Prem Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'eu-customers.csv',
        context: { mimeType: 'text/csv', size: '892 KB', exposure: 'Internal', owner: 'data-ops@corp.com', dateCreated: '2024-03-20', lastModified: '2024-10-14' },
        isFocal: true,
        badges: [
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Postal Addresses', 'Telephone Numbers', 'Birthdates', 'National IDs', 'Passports'] },
        ],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'global-storage',
        context: { service: 'AWS S3', account: 'prod.acme.com', organization: 'Acme Corporation', driveType: 'S3 Bucket', region: 'us-east-1', dateCreated: '2020-11-09', lastDiscoveryScan: '2025-01-19' },
        badges: [{ label: 'Cross-Region', severity: 'critical', description: 'Data originating in the EU is being stored in a non-EU region — this may violate GDPR data residency requirements.' }],
        metrics: [{ label: 'Region', value: 'us-east-1 (USA)' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'stored in' },
    ],
    summary: 'File: eu-customers.csv · Region: us-east-1 (Non-EU) · Data Store: global-storage (AWS S3) · EDTs found: EU PII, Passport Numbers · Regulation: GDPR violation',
    severity: 'critical',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Sheet 3: SaaS CASB API Risks
  // ─────────────────────────────────────────────────────────────────────────────
  {
    policyId: 'P16',
    policyName: 'PII Shared with External Personal Domains',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'HR Confidential',
        context: { service: 'Google Drive', account: 'acme-hr.google.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'hr-admin@corp.com', dateCreated: '2020-06-01', lastDiscoveryScan: '2025-01-21' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'employee-data.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '2.1 MB', exposure: 'Anyone with Link', owner: 'hr-admin@corp.com', dateCreated: '2023-11-08', lastModified: '2024-08-22' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Social Security Numbers', 'Email Addresses', 'Postal Addresses', 'Telephone Numbers'] }],
      },
      {
        id: 'identity',
        type: 'identity',
        name: 'john.smith@gmail.com',
        context: { idp: 'External', identityType: 'external', status: 'active', dateCreated: '2024-03-05' },
        badges: [{ label: 'External User', severity: 'critical', description: 'A personal email domain outside your organization has been granted collaborator access to this file.' }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'store', target: 'file', label: 'contains' },
      { id: 'e2', source: 'file', target: 'identity', label: 'shared with' },
    ],
    summary: 'File: employee-data.xlsx · Data Store: HR Confidential (Google Drive) · External Collaborator: john.smith@gmail.com · Domain: gmail.com (Personal) · EDTs: SSNs, Addresses',
    severity: 'high',
  },
  {
    policyId: 'P17',
    policyName: 'Proliferation of Duplicate Sensitive Data',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'contracts-template.docx',
        context: { mimeType: 'application/msword', size: '540 KB', exposure: 'Internal', owner: 'legal@corp.com', dateCreated: '2022-06-30', lastModified: '2024-07-11' },
        isFocal: true,
        badges: [
          { label: 'Duplicate Data', severity: 'medium', description: 'More than 5 identical copies detected across the tenant — uncontrolled duplication increases DLP exposure and makes data governance harder to enforce.' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Social Security Numbers', 'Telephone Numbers', 'Email Addresses', 'Postal Addresses'] },
        ],
        metrics: [{ label: 'Duplicate count', value: '7 identical copies' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'legal-docs',
        context: { service: 'Box', account: 'acme.box.com', organization: 'Acme Corporation', driveType: 'Shared Folder', owner: 'legal@corp.com', dateCreated: '2021-04-14', lastDiscoveryScan: '2025-01-18' },
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'duplicated in' },
    ],
    summary: 'File: contracts-template.docx · Data Store: legal-docs (Box) · Content Similarity: 100% Hash Match · Copies: 7 across tenant · EDTs: Legal Data, PII',
    severity: 'medium',
  },
  {
    policyId: 'P18',
    policyName: 'AI Readiness Risk: Over-Exposed Internal Data',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'strategy-2025.pptx',
        context: { mimeType: 'application/vnd.ms-powerpoint', size: '7.3 MB', exposure: 'All Internal Users', owner: 'ceo@corp.com', dateCreated: '2024-10-01', lastModified: '2024-11-28' },
        isFocal: true,
        badges: [
          { label: 'Searchable by All', severity: 'critical', description: 'This file is discoverable by every internal user via search — AI tools and copilots can surface its contents to anyone in the organization.' },
          { label: 'AI-Ready Access', severity: 'high', description: 'Broad internal discoverability makes this file accessible to AI search and crawl tools, which may ingest sensitive content without user awareness.' },
          { label: 'Sensitive Data Type', severity: 'high', details: ['Company Names', 'Currency', 'Securities IDs', 'Corporate Tax IDs'] },
        ],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'corp-intranet',
        context: { service: 'SharePoint', account: 'acme.sharepoint.com', organization: 'Acme Corporation', driveType: 'Document Library', owner: 'it-admin@corp.com', dateCreated: '2018-02-27', lastDiscoveryScan: '2025-01-22' },
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'stored in' },
    ],
    summary: 'File: strategy-2025.pptx · Data Store: corp-intranet (SharePoint) · Exposure: "Everyone Except External Users" (AI-searchable) · EDTs: Business Confidential',
    severity: 'critical',
  },
  {
    policyId: 'P19',
    policyName: 'Sensitive Data Exposed via Perpetual Sharing Links',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'store',
        type: 'data-store',
        name: 'Finance',
        context: { service: 'OneDrive', account: 'acme-finance.onedrive.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'finance@corp.com', dateCreated: '2020-07-19', lastDiscoveryScan: '2025-01-20' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'budget-forecast.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '1.8 MB', exposure: 'Anyone with Link', owner: 'finance@corp.com', dateCreated: '2024-02-14', lastModified: '2024-09-30' },
        isFocal: true,
        badges: [
          { label: 'Sensitive Data Type', severity: 'high', details: ['Financial IDs', 'Bank Account Information', 'Currency', 'Corporate Tax IDs', 'Securities IDs'] },
          { label: 'Public Link', severity: 'critical', description: 'A shareable link grants access to anyone who has the URL — no authentication required to view this file.' },
          { label: 'No Expiry', severity: 'critical', description: 'The sharing link has no expiration date — access remains open indefinitely unless manually revoked.' },
        ],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'store', target: 'file', label: 'contains' },
    ],
    summary: 'File: budget-forecast.xlsx · Data Store: Finance (OneDrive) · Link Type: External/Public · Link Expiry: None · EDTs: Financial Forecasts, Revenue Data',
    severity: 'high',
  },
  {
    policyId: 'P20',
    policyName: 'Permanent External Collaborator Access on Sensitive Files',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'vendor@partner.io',
        context: { idp: 'External', identityType: 'external', status: 'active', dateCreated: '2023-08-19' },
        isFocal: true,
        badges: [
          { label: 'No Expiry', severity: 'critical', description: 'This external collaborator has no access expiration — their permissions will persist indefinitely unless manually removed.' },
        ],
        metrics: [{ label: 'Accessible files', value: '156' }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'product-specs',
        context: { service: 'Google Drive', account: 'acme.google.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'product@corp.com', dateCreated: '2022-10-05', lastDiscoveryScan: '2025-01-21' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Source Code', 'Passwords', 'Private Keys', 'Secrets and Tokens', 'Company Names'] }],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'store', label: 'permanent access' },
    ],
    summary: 'Identity: vendor@partner.io (External) · Data Store: product-specs (Google Drive) · Access Expiry: None · Accessible EDTs: IP, Product Designs · Files accessible: 156',
    severity: 'high',
  },
  {
    policyId: 'P21',
    policyName: "Sensitive Data in Suspended User's Drive",
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'customer-export.csv',
        context: { mimeType: 'text/csv' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Postal Addresses', 'Payment Cards'] }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'Personal Drive',
        context: { service: 'OneDrive', account: 'acme.onedrive.com', organization: 'Acme Corporation', driveType: 'Personal Drive', owner: 't.nguyen@corp.com', dateCreated: '2022-05-30', lastDiscoveryScan: '2025-01-19' },
      },
      {
        id: 'identity',
        type: 'identity',
        name: 't.nguyen@corp.com',
        context: { idp: 'Azure AD', identityType: 'user', status: 'suspended', group: 'Product', orgUnit: 'Product', dateCreated: '2022-05-30' },
        isFocal: true,
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'contained in' },
      { id: 'e2', source: 'store', target: 'identity', label: 'owned by' },
    ],
    summary: 'File: customer-export.csv · User: t.nguyen@corp.com (Suspended) · Data Store: Personal Drive (OneDrive) · EDTs: Customer PII, Email Addresses',
    severity: 'high',
  },
  {
    policyId: 'P22',
    policyName: 'Sensitive Data Discovered in Unmanaged Sites',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'file',
        type: 'file',
        name: 'sales-data-2023.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '5.2 MB', exposure: 'Internal', owner: 'sales-ops@corp.com', dateCreated: '2024-01-03', lastModified: '2024-12-18' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Company Names', 'Currency'] }],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'old-sales-team',
        context: { service: 'SharePoint', account: 'acme.sharepoint.com', organization: 'Acme Corporation', driveType: 'Document Library', owner: 'it-admin@corp.com', dateCreated: '2019-03-12', lastDiscoveryScan: '2025-01-18' },
        badges: [
          { label: 'Inactive', severity: 'high', description: 'No active users in this site — the original team no longer exists, leaving sensitive data with no active oversight.' },
        ],
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'file', target: 'store', label: 'discovered in' },
    ],
    summary: 'File: sales-data-2023.xlsx · Data Store: old-sales-team (SharePoint Site) · Active Users: 0 · EDTs: Customer Data, Revenue Figures · Action: Alert',
    severity: 'high',
  },
  {
    policyId: 'P23',
    policyName: 'Sensitive Data Exposed in ChatGPT Conversations',
    sheet: 'SaaS CASB API Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'diana.reyes@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Data Science', orgUnit: 'Engineering', dateCreated: '2023-02-14' },
      },
      {
        id: 'message',
        type: 'chat-message',
        name: 'Conv #4201 · Msg #7',
        context: { application: 'ChatGPT Enterprise', sender: 'diana.reyes@corp.com', appSuite: 'Microsoft 365', appCategory: 'Generative AI', instanceName: 'corp.com', exposure: 'Internal', channel: 'Conv #4201', dateSent: '2025-03-12 14:22:07', attachments: '0', lastModified: '2025-03-12 14:22:31' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'critical', details: ['Social Security Numbers', 'Medical Records', 'Healthcare IDs', 'Personal Names'] }],
        metrics: [{ label: 'Matched', value: '2.4 KB · SSNs (14), Medical Records' }],
      },
      {
        id: 'app',
        type: 'application',
        name: 'ChatGPT Enterprise',
        context: { category: 'Generative AI', sanctioned: false, instanceType: 'unknown', destinationType: 'Application', firstAccess: '2024-02-12' },
      },
    ],
    actions: [],
    edges: [
      { id: 'e1', source: 'identity', target: 'message', label: 'owns' },
      { id: 'e2', source: 'message', target: 'app', label: 'posted to' },
    ],
    summary: 'Activity: Post · Category: Generative AI (ChatGPT) · Content: 2.4 KB matched "Confidential" DLP Profile — Social Security Numbers (14 values), Medical Records, Healthcare IDs · Action: Alert',
    severity: 'critical',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Sheet 4: Inline Risks
  // ─────────────────────────────────────────────────────────────────────────────
  {
    policyId: 'P24',
    policyName: 'High Volume of Data Uploaded to Unsanctioned Apps',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'm.walker@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Marketing', orgUnit: 'Marketing', dateCreated: '2022-09-01' },
      },
      {
        id: 'app',
        type: 'application',
        name: 'WeTransfer',
        context: { category: 'File Sharing', sanctioned: false, destinationType: 'Application', firstAccess: '2024-08-07' },
        isFocal: true,
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'alert', badges: [
        { label: 'Total upload: 23 GB', severity: 'high' },
        { label: 'Anomaly: >1 GB/hr', severity: 'critical' },
      ]},
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
    ],
    summary: 'Application: WeTransfer · Category: File Sharing · Upload Volume: 23 GB · App Status: Unsanctioned · Identities uploading: 43 · Anomaly: >1 GB/hr',
    severity: 'high',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P25',
    policyName: 'High Risk User Sending Data from High Risk App',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'm.torres@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Engineering', orgUnit: 'Engineering', dateCreated: '2021-03-22' },
        isFocal: true,
        badges: [
          { label: 'High Risk', severity: 'critical', description: 'User and Entity Behavior Analytics flagged this identity above the high-risk threshold based on anomalous activity patterns.' },
        ],
      },
      {
        id: 'file',
        type: 'file',
        name: 'project-report.zip',
        context: { mimeType: 'application/zip', size: '48 MB', exposure: 'Internal', owner: 'm.torres@corp.com', dateCreated: '2025-01-20', lastModified: '2025-01-20' },
      },
      {
        id: 'app',
        type: 'application',
        name: 'Anonfiles',
        context: { category: 'File Sharing', sanctioned: false, cciScore: 18, destinationType: 'Application', firstAccess: '2025-01-20' },
        badges: [
          { label: 'High Risk', severity: 'critical', description: 'Cloud Confidence Index below 40 indicates weak security controls, poor compliance posture, and elevated data risk.' },
        ],
        metrics: [{ label: 'CCI Score', value: '18 / 100' }],
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: m.torres@corp.com · Risk Level: High (UEBA) · File: project-report.zip · Target App: Anonfiles · App CCI Score: 18 · Activity: Upload · Action: Block',
    severity: 'critical',
    policyVerdict: 'block',
  },
  {
    policyId: 'P26',
    policyName: 'High-Risk User Uploading to Unsanctioned Apps',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'k.patel@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Sales', orgUnit: 'Sales', dateCreated: '2023-07-11' },
        isFocal: true,
        badges: [{ label: 'High Risk', severity: 'critical', description: 'User and Entity Behavior Analytics flagged this identity above the high-risk threshold based on anomalous activity patterns.' }],
      },
      {
        id: 'file',
        type: 'file',
        name: 'customer-data.csv',
        context: { mimeType: 'text/csv', size: '3.1 MB', exposure: 'Internal', owner: 'k.patel@corp.com', dateCreated: '2024-11-14', lastModified: '2025-01-09' },
      },
      {
        id: 'app',
        type: 'application',
        name: 'Mega.nz',
        context: { category: 'Cloud Storage', sanctioned: false, destinationType: 'Application', firstAccess: '2024-11-03' },
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: k.patel@corp.com · Risk Level: High (UEBA) · File: customer-data.csv · Target App: Mega.nz · Category: Cloud Storage · App Status: Unsanctioned · Activity: Upload · Action: Block',
    severity: 'high',
    policyVerdict: 'block',
  },
  {
    policyId: 'P27',
    policyName: 'High-Risk User Downloading Sensitive Data',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'r.johnson@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Sales Ops', orgUnit: 'Sales', dateCreated: '2020-08-17' },
        isFocal: true,
        badges: [
          { label: 'High Risk', severity: 'critical', description: 'User and Entity Behavior Analytics flagged this identity above the high-risk threshold based on anomalous activity patterns.' },
        ],
      },
      {
        id: 'store',
        type: 'data-store',
        name: 'customer-db',
        context: { service: 'Salesforce', account: 'acme.salesforce.com', organization: 'Acme Corporation', driveType: 'CRM Database', owner: 'salesops@corp.com', dateCreated: '2019-08-01', lastDiscoveryScan: '2025-01-22' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Company Names', 'Postal Addresses'] }],
      },
      {
        id: 'file',
        type: 'file',
        name: 'customer-export.csv',
        context: { mimeType: 'text/csv', size: '4.6 MB', exposure: 'Internal', owner: 'r.johnson@corp.com', dateCreated: '2025-01-08', lastModified: '2025-01-08' },
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Company Names', 'Postal Addresses'] }],
      },
    ],
    actions: [
      { id: 'action', label: 'Download', policyVerdict: 'alert' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'store', label: 'from' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: r.johnson@corp.com · Risk Level: High (UEBA) · Data Store: customer-db (Salesforce) · File: customer-export.csv · EDTs: Customer PII, Contracts',
    severity: 'critical',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P28',
    policyName: 'Exfiltration to Personal SaaS Instances',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'a.kim@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Customer Success', orgUnit: 'Sales', dateCreated: '2022-01-19' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'client-list.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '980 KB', exposure: 'Internal', owner: 'a.kim@corp.com', dateCreated: '2024-06-17', lastModified: '2025-01-15' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Company Names', 'Payment Cards'] }],
      },
      {
        id: 'app',
        type: 'application',
        name: 'Dropbox Personal',
        context: { category: 'Cloud Storage', sanctioned: false, instanceType: 'personal', destinationType: 'Application', firstAccess: '2024-06-18' },
        badges: [
          { label: 'Unmanaged', severity: 'critical', description: 'Personal app instance not registered with IT — data uploaded here falls outside corporate visibility and control.' },
        ],
        metrics: [{ label: 'Instance ID', value: 'personal-aki9234' }],
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: a.kim@corp.com · File: client-list.xlsx · Target Instance: personal-aki9234 (Dropbox Personal / Unregistered) · EDTs: Customer PII · Activity: Upload',
    severity: 'critical',
    policyVerdict: 'block',
  },
  {
    policyId: 'P29',
    policyName: 'Unencrypted File Upload via Non-Standard Protocol',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'b.nguyen@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'DevOps', orgUnit: 'Engineering', dateCreated: '2021-11-08' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'db-export.sql',
        context: { mimeType: 'application/sql', size: '112 MB', exposure: 'Internal', owner: 'b.nguyen@corp.com', dateCreated: '2025-01-22', lastModified: '2025-01-22' },
        isFocal: true,
        badges: [
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Payment Cards', 'Social Security Numbers', 'Passwords', 'Private Keys'] },
        ],
      },
      {
        id: 'dest',
        type: 'website',
        name: '198.51.100.23',
        context: { urlCategory: 'Uncategorized', destination: '198.51.100.23', destinationType: 'Website', firstAccess: '2025-03-14' },
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'alert', badges: [
        { label: 'Unencrypted', severity: 'critical' },
        { label: 'FTP', severity: 'critical', description: 'File Transfer Protocol transmits data without encryption — credentials and file contents are visible to anyone monitoring the network.' },
      ]},
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'dest', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: b.nguyen@corp.com · File: db-export.sql · Protocol: FTP (non-HTTPS) · Destination: 198.51.100.23 · Activity: Upload (Unencrypted) · EDTs: DB Records, Customer Data',
    severity: 'medium',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P30',
    policyName: 'Cross-Region Transfer of Regulated Data (GDPR)',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 's.fischer@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Data Platform', orgUnit: 'Engineering', dateCreated: '2022-04-25' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'eu-user-data.csv',
        context: { mimeType: 'text/csv', size: '2.3 MB', exposure: 'Internal', owner: 's.fischer@corp.com', dateCreated: '2024-07-04', lastModified: '2024-12-30' },
        isFocal: true,
        badges: [
          { label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Postal Addresses', 'Telephone Numbers', 'Birthdates', 'National IDs', 'Passports'] },
        ],
        metrics: [{ label: 'Source Region', value: 'eu-west-1 (EU)' }],
      },
      {
        id: 'app',
        type: 'application',
        name: 'Salesforce CRM',
        context: { category: 'CRM', sanctioned: true, instanceType: 'corporate', destinationType: 'Application', firstAccess: '2023-09-05' },
        metrics: [{ label: 'Dest Region', value: 'us-east-1 (USA)' }],
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'alert', badges: [
        { label: 'Cross-Region', severity: 'critical', description: 'Data originating in the EU is being transferred to a non-EU destination — this may violate GDPR restrictions on cross-border data transfers.' },
      ]},
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: s.fischer@corp.com · File: eu-user-data.csv · Source Region: eu-west-1 (EU) · Destination Region: us-east-1 (USA) · Target App: Salesforce CRM · Activity: Upload · GDPR violation',
    severity: 'critical',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P31',
    policyName: 'Exfiltration of Credentials/Keys via Web Upload',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'c.okonkwo@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Platform Engineering', orgUnit: 'Engineering', dateCreated: '2023-05-02' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'deploy-keys.pem',
        context: { mimeType: 'application/x-pem-file', size: '3 KB', exposure: 'Internal', owner: 'c.okonkwo@corp.com', dateCreated: '2023-08-11', lastModified: '2024-05-29' },
        isFocal: true,
        badges: [
          { label: 'Sensitive Data Type', severity: 'critical', details: ['SSH Private Key', 'TLS/SSL Private Key', 'PGP Private Key', 'API Token', 'Database Password', 'Service Account Key'] },
        ],
      },
      {
        id: 'dest',
        type: 'website',
        name: 'pastebin.com',
        context: { urlCategory: 'Public Paste Site', destination: 'pastebin.com', destinationType: 'Website', firstAccess: '2024-10-02' },
      },
    ],
    actions: [
      { id: 'action', label: 'Upload / Paste', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'dest', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: c.okonkwo@corp.com · File: deploy-keys.pem · Target: pastebin.com (Public) · Activity: Upload/Paste · Credential Type: Private Key, API Token · Action: Block',
    severity: 'critical',
    policyVerdict: 'block',
  },
  {
    policyId: 'P32',
    policyName: 'Exfiltration of PII to Personal Webmail',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'l.martinez@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'HR', orgUnit: 'People Operations', dateCreated: '2021-07-13' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'customer-contacts.csv',
        context: { mimeType: 'text/csv', size: '1.4 MB', exposure: 'Internal', owner: 'l.martinez@corp.com', dateCreated: '2024-04-09', lastModified: '2025-01-03' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Email Addresses', 'Telephone Numbers', 'Postal Addresses'] }],
      },
      {
        id: 'dest',
        type: 'website',
        name: 'gmail.com',
        context: { urlCategory: 'Personal Webmail', destination: 'gmail.com', destinationType: 'Website', firstAccess: '2023-11-19' },
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'dest', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: l.martinez@corp.com · File: customer-contacts.csv · Destination: gmail.com (Personal Webmail) · Activity: Upload (email attachment) · EDTs: PII, Email Addresses, Phone Numbers · Action: Block',
    severity: 'high',
    policyVerdict: 'block',
  },
  {
    policyId: 'P33',
    policyName: 'Sensitive Data Ingestion by Generative AI',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'p.chen@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Finance', orgUnit: 'Finance', dateCreated: '2022-10-06' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'q4-financials.xlsx',
        context: { mimeType: 'application/vnd.ms-excel', size: '6.7 MB', exposure: 'Internal', owner: 'p.chen@corp.com', dateCreated: '2024-10-31', lastModified: '2025-01-10' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Financial IDs', 'Bank Account Information', 'Currency', 'Corporate Tax IDs', 'Securities IDs'] }],
      },
      {
        id: 'app',
        type: 'application',
        name: 'ChatGPT',
        context: { category: 'Generative AI', sanctioned: false, destinationType: 'Application', firstAccess: '2024-03-29' },
      },
    ],
    actions: [
      { id: 'action', label: 'Paste / Post', policyVerdict: 'alert' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: p.chen@corp.com · File: q4-financials.xlsx · Activity: Paste/Post · Category: Generative AI (ChatGPT) · EDTs: Financial Data, Revenue Forecasts · App: Unsanctioned · Action: Alert',
    severity: 'high',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P34',
    policyName: 'Sensitive Data Download to Unmanaged/BYOD Device',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 't.wilson@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'IT', orgUnit: 'IT Operations', dateCreated: '2020-06-09' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'hr-records-2024.zip',
        context: { mimeType: 'application/zip', size: '2.1 GB', exposure: 'Internal', owner: 'hr-admin@corp.com', dateCreated: '2024-12-31', lastModified: '2024-12-31' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Personal Names', 'Social Security Numbers', 'Healthcare IDs', 'Medical Records', 'Birthdates', 'Email Addresses'] }],
      },
      {
        id: 'device',
        type: 'device',
        name: 'SanDisk Ultra USB 3.0',
        context: { managementStatus: 'byod', platform: 'Removable Media', owner: 'diana.prince@acme.com', serialNumber: 'SD3-4F2A-9C1E', macAddress: 'N/A', clientVersion: 'N/A', uniqueDeviceId: 'USB-9F2E-4B1D-A3C7' },
        badges: [
          { label: 'Unmanaged', severity: 'critical', description: 'Personal/BYOD device not enrolled in MDM — data transferred here is outside corporate security controls.' },
          { label: 'Unencrypted', severity: 'critical' },
        ],
      },
    ],
    actions: [
      { id: 'action', label: 'Download', policyVerdict: 'alert' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'device', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: t.wilson@corp.com · File: hr-records-2024.zip · Activity: 847 file downloads (2.1 GB) · Device: SanDisk Ultra USB 3.0 (Removable, Unencrypted, BYOD) · EDTs: Employee PII, Healthcare · Action: Alert',
    severity: 'critical',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P35',
    policyName: 'Sensitive Data Upload to Unsanctioned Cloud Storage',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'j.park@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Backend Engineering', orgUnit: 'Engineering', dateCreated: '2023-03-27' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'source-code-backup.zip',
        context: { mimeType: 'application/zip', size: '340 MB', exposure: 'Internal', owner: 'j.park@corp.com', dateCreated: '2025-01-18', lastModified: '2025-01-18' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Source Code', 'Passwords', 'Private Keys', 'Public Keys', 'Secrets and Tokens'] }],
      },
      {
        id: 'app',
        type: 'application',
        name: 'pCloud',
        context: { category: 'Cloud Storage', sanctioned: false, instanceType: 'personal', destinationType: 'Application', firstAccess: '2025-02-14' },
        badges: [
          { label: 'Unmanaged', severity: 'high', description: 'Personal app instance not registered with IT — data uploaded here falls outside corporate visibility and control.' },
        ],
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: j.park@corp.com · File: source-code-backup.zip · Target App: pCloud · Category: Cloud Storage · App: Unsanctioned (Non-Corporate Instance) · EDTs: Source Code, IP · Activity: Upload',
    severity: 'critical',
    policyVerdict: 'block',
  },
  {
    policyId: 'P36',
    policyName: 'Source Code Leakage to Public Repositories',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'n.adams@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Security', orgUnit: 'Engineering', dateCreated: '2021-12-15' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'auth-service.py',
        context: { mimeType: 'text/x-python', size: '28 KB', exposure: 'Internal', owner: 'n.adams@corp.com', dateCreated: '2023-05-17', lastModified: '2024-11-21' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Source Code'] }],
      },
      {
        id: 'dest',
        type: 'website',
        name: 'github.com/user/leaked-repo',
        context: { urlCategory: 'Public Repository', destination: 'github.com/user/leaked-repo', destinationType: 'Website', firstAccess: '2025-01-08' },
      },
    ],
    actions: [
      { id: 'action', label: 'Push', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'dest', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: n.adams@corp.com · File: auth-service.py · Activity: Git Push · Destination: github.com/user/leaked-repo (Public) · EDTs: Source Code (proprietary) · Action: Block',
    severity: 'critical',
    policyVerdict: 'block',
  },
  {
    policyId: 'P37',
    policyName: 'Source Code Shared with Risky GenAI Apps',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'o.hassan@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Frontend Engineering', orgUnit: 'Engineering', dateCreated: '2024-01-08' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'payment-processor.ts',
        context: { mimeType: 'text/typescript', size: '14 KB', exposure: 'Internal', owner: 'o.hassan@corp.com', dateCreated: '2024-02-09', lastModified: '2025-01-07' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Source Code'] }],
      },
      {
        id: 'app',
        type: 'application',
        name: 'Phind',
        context: { category: 'Generative AI', sanctioned: false, cciScore: 31, destinationType: 'Application', firstAccess: '2025-03-08' },
        badges: [
          { label: 'High Risk', severity: 'critical', description: 'Cloud Confidence Level below 50 indicates this AI application has insufficient privacy, security, and legal controls.' },
        ],
        metrics: [{ label: 'CCL Score', value: '31 / 100' }],
      },
    ],
    actions: [
      { id: 'action', label: 'Paste / Upload', policyVerdict: 'alert' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'app', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: o.hassan@corp.com · File: payment-processor.ts · Activity: Paste/Upload · App: Phind (Generative AI) · App Risk Score (CCL): 31 · EDTs: Source Code · Action: Alert',
    severity: 'high',
    policyVerdict: 'alert',
  },
  {
    policyId: 'P38',
    policyName: 'Sensitive Data Transfer via Anonymizers/Tor',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'v.petrov@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'IT', orgUnit: 'IT Operations', dateCreated: '2020-03-31' },
      },
      {
        id: 'file',
        type: 'file',
        name: 'internal-report.pdf',
        context: { mimeType: 'application/pdf', size: '601 KB', exposure: 'Internal', owner: 'v.petrov@corp.com', dateCreated: '2025-01-14', lastModified: '2025-01-14' },
        isFocal: true,
        badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Company Names', 'Financial IDs', 'Corporate Tax IDs', 'Passwords', 'Secrets and Tokens'] }],
      },
      {
        id: 'dest',
        type: 'website',
        name: 'tor-exit.onion',
        context: { urlCategory: 'Tor / Anonymizer', destination: 'tor-exit.onion', destinationType: 'Website', firstAccess: '2025-02-27' },
      },
    ],
    actions: [
      { id: 'action', label: 'Upload', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'dest', label: 'to' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: v.petrov@corp.com · File: internal-report.pdf · Destination: tor-exit.onion · Category: Tor/Anonymizer/Proxy · Activity: Upload (anonymized circuit) · EDTs: Business Confidential · Action: Block',
    severity: 'critical',
    policyVerdict: 'block',
  },
  {
    policyId: 'P39',
    policyName: 'Malicious File Downloaded from Uncategorized Site',
    sheet: 'Inline Risks',
    entities: [
      {
        id: 'identity',
        type: 'identity',
        name: 'f.garcia@corp.com',
        context: { idp: 'Okta', identityType: 'user', status: 'active', group: 'Legal', orgUnit: 'Legal', dateCreated: '2023-09-20' },
      },
      {
        id: 'source',
        type: 'website',
        name: 'update-srv-patch.net',
        context: { urlCategory: 'Uncategorized', destination: 'update-srv-patch.net', destinationType: 'Website', firstAccess: '2025-04-01' },
        badges: [
          { label: 'Newly Registered', severity: 'high', description: 'Domain was registered recently, a common indicator of phishing infrastructure or malicious sites set up for a specific attack campaign.' },
        ],
      },
      {
        id: 'file',
        type: 'file',
        name: 'windows-update.exe',
        context: { mimeType: 'application/x-msdownload', size: '8.4 MB', exposure: 'Public', owner: 'unknown', dateCreated: '2025-01-21', lastModified: '2025-01-21' },
        isFocal: true,
        badges: [{ label: 'Malware', severity: 'critical', details: ['Ransomware', 'Hash: a3f4...d9c1'] }],
        metrics: [{ label: 'Hash', value: 'a3f4...d9c1 (Ransomware)' }],
      },
    ],
    actions: [
      { id: 'action', label: 'Download', policyVerdict: 'block' },
    ],
    edges: [
      { id: 'e1', source: 'identity', target: 'action' },
      { id: 'e2', source: 'action', target: 'source', label: 'from' },
      { id: 'e3', source: 'action', target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
    ],
    summary: 'Identity: f.garcia@corp.com · Source: update-srv-patch.net (Uncategorized, Newly Registered) · File: windows-update.exe · Threat: Ransomware · Hash: a3f4...d9c1 · Action: Block',
    severity: 'critical',
    policyVerdict: 'block',
  },
]

export const SHEETS = [...new Set(topologies.map((t) => t.sheet))]
