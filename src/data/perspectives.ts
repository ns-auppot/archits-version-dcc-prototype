
import { LucideIcon, LayoutGrid, Server, Database, Cloud, Wrench, ShieldAlert, ShieldCheck, Users, Globe, Lock, Plus, FileWarning, AlertTriangle, HardDrive } from 'lucide-react';

export type NodeType = 'user' | 'app' | 'service' | 'database' | 'api' | 'tool' | 'data-store' | 'risk' | 'safe';

export interface GraphNode {
  id: string;
  label: string;
  subLabel?: string;
  type: NodeType;
  value: number; // 1-10 scale for edge thickness
  status?: 'sanctioned' | 'unsanctioned' | 'warning' | 'safe';
  provider?: 'AWS' | 'GCP' | 'Azure';
  icon?: any;
  // Timeline specific
  timestamp?: string;
  description?: string;
  attackPath?: {
    id: string;
    label: string;
    type: NodeType;
    status: 'impacted' | 'compromised' | 'safe' | 'target' | 'source';
    icon?: any;
  }[];
  items?: {
    name: string;
    usage: string;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    users: number;
    status: 'sanctioned' | 'unsanctioned' | 'warning';
    provider: string;
    discoveryDate: string;
    requestCount: number;
    requestSummary: string;
    // New metrics
    requestResponseCount30d: number;
    requestResponseTrend7d: number;
    requestResponseHistory: { date: string; value: number }[];
    dataVolume30d: string;
    dataVolumeTrend7d: number;
    dataVolumeHistory: { date: string; value: number }[];
    activeUsers7d: number;
    activeUsersHistory: { date: string; value: number }[];
  }[];
}

export interface Insight {
  summary: string;
  entity: string;
  users: number;
  traffic: string;
  event: any;
  items?: any[];
}

export interface Perspective {
  id: string;
  title: string;
  summary: {
    title: string;
    content: string;
    insights?: string[] | Insight[];
  };
  graph: {
    layout?: 'radial' | 'sankey' | 'grid' | 'bubble' | 'blank' | 'timeline';
    center: {
      label: string;
      icon: any;
    };
    nodes: GraphNode[];
    targets?: GraphNode[]; // For Sankey view: Right side nodes
  };
}

// Helper to generate mock time series data
const generateTimeSeries = (days: number, base: number, volatility: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0].slice(5),
    value: Math.max(0, Math.floor(base + (Math.random() - 0.5) * volatility))
  }));
};

export const drillDownPerspectives: Record<string, Perspective> = {
  'user-group': {
    id: 'user-group-breakdown',
    title: 'User Group Breakdown',
    summary: {
      title: 'User Group Analysis',
      content: 'Engineering teams are the heaviest users of unsanctioned databases, primarily for development and testing. Marketing usage is focused on unsanctioned cloud storage services.',
      insights: [
        'Engineering: 85% of unsanctioned database access.',
        'Marketing: High velocity of new cloud storage adoption.',
        'Sales: Primarily using sanctioned apps, low risk.'
      ]
    },
    graph: {
      layout: 'sankey',
      center: { label: 'Unsanctioned Data Access', icon: ShieldAlert },
      nodes: [
        { id: 'eng', label: 'Engineering', subLabel: 'High Risk', type: 'user', value: 9, status: 'unsanctioned', icon: Users },
        { id: 'marketing', label: 'Marketing', subLabel: 'Medium Risk', type: 'user', value: 6, status: 'warning', icon: Users },
        { id: 'sales', label: 'Sales', subLabel: 'Low Risk', type: 'user', value: 3, status: 'safe', icon: Users },
        { id: 'product', label: 'Product', subLabel: 'Medium Risk', type: 'user', value: 5, status: 'warning', icon: Users },
        { id: 'hr', label: 'HR', subLabel: 'Low Risk', type: 'user', value: 2, status: 'safe', icon: Users },
      ],
      targets: [
        { 
          id: 'databases', 
          label: 'Unsanctioned Databases', 
          type: 'database', 
          value: 8, 
          status: 'unsanctioned', 
          icon: Database,
          items: [
            { 
              name: 'Shadow-MySQL-Prod', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 67, 
              status: 'unsanctioned', 
              provider: 'Self-Hosted', 
              discoveryDate: '2023-10-15', 
              requestCount: 15420, 
              requestSummary: 'Customer data access, PII processing',
              requestResponseCount30d: 15420,
              requestResponseTrend7d: 12.5,
              requestResponseHistory: generateTimeSeries(30, 500, 200),
              dataVolume30d: '4.2 GB',
              dataVolumeTrend7d: 8.3,
              dataVolumeHistory: generateTimeSeries(30, 150, 50),
              activeUsers7d: 45,
              activeUsersHistory: generateTimeSeries(7, 40, 10)
            },
            { 
              name: 'Dev-PostgreSQL-Clone', 
              usage: 'Daily', 
              riskLevel: 'high', 
              users: 42, 
              status: 'unsanctioned', 
              provider: 'AWS (Unmanaged)', 
              discoveryDate: '2023-11-02', 
              requestCount: 8900, 
              requestSummary: 'Test data with production credentials',
              requestResponseCount30d: 8900,
              requestResponseTrend7d: 5.2,
              requestResponseHistory: generateTimeSeries(30, 300, 100),
              dataVolume30d: '1.8 GB',
              dataVolumeTrend7d: 2.1,
              dataVolumeHistory: generateTimeSeries(30, 60, 20),
              activeUsers7d: 28,
              activeUsersHistory: generateTimeSeries(7, 25, 5)
            },
            { 
              name: 'MongoDB-Analytics', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 18, 
              status: 'warning', 
              provider: 'MongoDB Atlas', 
              discoveryDate: '2023-09-20', 
              requestCount: 1200, 
              requestSummary: 'User behavior analytics',
              requestResponseCount30d: 1200,
              requestResponseTrend7d: -2.4,
              requestResponseHistory: generateTimeSeries(30, 40, 15),
              dataVolume30d: '500 MB',
              dataVolumeTrend7d: -1.0,
              dataVolumeHistory: generateTimeSeries(30, 15, 5),
              activeUsers7d: 12,
              activeUsersHistory: generateTimeSeries(7, 10, 3)
            },
            { 
              name: 'S3-Backup-Bucket-Personal', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 25, 
              status: 'warning', 
              provider: 'AWS S3', 
              discoveryDate: '2023-08-05', 
              requestCount: 5600, 
              requestSummary: 'Document backups',
              requestResponseCount30d: 5600,
              requestResponseTrend7d: 15.0,
              requestResponseHistory: generateTimeSeries(30, 180, 60),
              dataVolume30d: '12.5 GB',
              dataVolumeTrend7d: 10.5,
              dataVolumeHistory: generateTimeSeries(30, 400, 100),
              activeUsers7d: 20,
              activeUsersHistory: generateTimeSeries(7, 18, 4)
            },
          ]
        },
        { 
          id: 'services', 
          label: 'Unsanctioned Services', 
          type: 'service', 
          value: 6, 
          status: 'unsanctioned', 
          icon: Server,
          items: [
            { 
              name: 'DataSync-Service', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 45, 
              status: 'unsanctioned', 
              provider: 'Custom Script', 
              discoveryDate: '2023-10-01', 
              requestCount: 22000, 
              requestSummary: 'Automated data sync to external storage',
              requestResponseCount30d: 22000,
              requestResponseTrend7d: 20.5,
              requestResponseHistory: generateTimeSeries(30, 700, 300),
              dataVolume30d: '8.5 GB',
              dataVolumeTrend7d: 15.2,
              dataVolumeHistory: generateTimeSeries(30, 280, 80),
              activeUsers7d: 35,
              activeUsersHistory: generateTimeSeries(7, 30, 8)
            },
            { 
              name: 'ETL-Pipeline-v2', 
              usage: 'Daily', 
              riskLevel: 'high', 
              users: 32, 
              status: 'unsanctioned', 
              provider: 'Internal Fork', 
              discoveryDate: '2023-11-10', 
              requestCount: 4500, 
              requestSummary: 'Data transformation and aggregation',
              requestResponseCount30d: 4500,
              requestResponseTrend7d: 8.0,
              requestResponseHistory: generateTimeSeries(30, 150, 40),
              dataVolume30d: '3.2 GB',
              dataVolumeTrend7d: 4.5,
              dataVolumeHistory: generateTimeSeries(30, 100, 30),
              activeUsers7d: 25,
              activeUsersHistory: generateTimeSeries(7, 22, 6)
            },
            { 
              name: 'Report-Generator', 
              usage: 'Daily', 
              riskLevel: 'medium', 
              users: 28, 
              status: 'warning', 
              provider: 'Unknown', 
              discoveryDate: '2023-09-15', 
              requestCount: 7800, 
              requestSummary: 'Automated report generation',
              requestResponseCount30d: 7800,
              requestResponseTrend7d: 3.5,
              requestResponseHistory: generateTimeSeries(30, 260, 50),
              dataVolume30d: '1.2 GB',
              dataVolumeTrend7d: 1.8,
              dataVolumeHistory: generateTimeSeries(30, 40, 10),
              activeUsers7d: 22,
              activeUsersHistory: generateTimeSeries(7, 20, 5)
            },
            { 
              name: 'Data-Exporter', 
              usage: 'Weekly', 
              riskLevel: 'low', 
              users: 15, 
              status: 'warning', 
              provider: 'SaaS Vendor', 
              discoveryDate: '2023-07-20', 
              requestCount: 300, 
              requestSummary: 'CSV export utility',
              requestResponseCount30d: 300,
              requestResponseTrend7d: 0.5,
              requestResponseHistory: generateTimeSeries(30, 10, 5),
              dataVolume30d: '150 MB',
              dataVolumeTrend7d: 0.2,
              dataVolumeHistory: generateTimeSeries(30, 5, 2),
              activeUsers7d: 10,
              activeUsersHistory: generateTimeSeries(7, 8, 2)
            },
            { 
              name: 'WebScraper-Service', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 5, 
              status: 'unsanctioned', 
              provider: 'Custom Script', 
              discoveryDate: '2023-12-01', 
              requestCount: 50, 
              requestSummary: 'Bulk data extraction from external sites',
              requestResponseCount30d: 50,
              requestResponseTrend7d: 0.0,
              requestResponseHistory: generateTimeSeries(30, 2, 1),
              dataVolume30d: '2.5 GB',
              dataVolumeTrend7d: 0.0,
              dataVolumeHistory: generateTimeSeries(30, 80, 20),
              activeUsers7d: 3,
              activeUsersHistory: generateTimeSeries(7, 3, 1)
            },
          ]
        },
        { 
          id: 'tools', 
          label: 'Unsanctioned Tools', 
          type: 'tool', 
          value: 5, 
          status: 'unsanctioned', 
          icon: Wrench,
          items: [
            { 
              name: 'JsonFormatter.io', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 89, 
              status: 'warning', 
              provider: 'Web Tool', 
              discoveryDate: '2023-01-15', 
              requestCount: 45000, 
              requestSummary: 'JSON payload formatting',
              requestResponseCount30d: 45000,
              requestResponseTrend7d: 2.5,
              requestResponseHistory: generateTimeSeries(30, 1500, 200),
              dataVolume30d: '500 MB',
              dataVolumeTrend7d: 1.2,
              dataVolumeHistory: generateTimeSeries(30, 16, 4),
              activeUsers7d: 65,
              activeUsersHistory: generateTimeSeries(7, 60, 8)
            },
            { 
              name: 'Base64Decode.org', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 76, 
              status: 'warning', 
              provider: 'Web Tool', 
              discoveryDate: '2023-02-10', 
              requestCount: 32000, 
              requestSummary: 'Token decoding, string manipulation',
              requestResponseCount30d: 32000,
              requestResponseTrend7d: 1.8,
              requestResponseHistory: generateTimeSeries(30, 1000, 150),
              dataVolume30d: '200 MB',
              dataVolumeTrend7d: 0.5,
              dataVolumeHistory: generateTimeSeries(30, 6, 2),
              activeUsers7d: 50,
              activeUsersHistory: generateTimeSeries(7, 45, 10)
            },
            { 
              name: 'Regex101 Clone', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 45, 
              status: 'warning', 
              provider: 'Self-hosted', 
              discoveryDate: '2023-06-05', 
              requestCount: 1500, 
              requestSummary: 'Pattern matching tests',
              requestResponseCount30d: 1500,
              requestResponseTrend7d: 5.5,
              requestResponseHistory: generateTimeSeries(30, 50, 20),
              dataVolume30d: '50 MB',
              dataVolumeTrend7d: 2.0,
              dataVolumeHistory: generateTimeSeries(30, 2, 1),
              activeUsers7d: 30,
              activeUsersHistory: generateTimeSeries(7, 28, 5)
            },
            { 
              name: 'TempMail Service', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 12, 
              status: 'unsanctioned', 
              provider: 'External Service', 
              discoveryDate: '2023-11-25', 
              requestCount: 120, 
              requestSummary: 'Anonymous registration verification',
              requestResponseCount30d: 120,
              requestResponseTrend7d: -5.0,
              requestResponseHistory: generateTimeSeries(30, 4, 2),
              dataVolume30d: '10 MB',
              dataVolumeTrend7d: -2.0,
              dataVolumeHistory: generateTimeSeries(30, 1, 0),
              activeUsers7d: 5,
              activeUsersHistory: generateTimeSeries(7, 4, 1)
            },
          ]
        },
        { 
          id: 'apis', 
          label: 'Unsanctioned APIs', 
          type: 'api', 
          value: 7, 
          status: 'unsanctioned', 
          icon: Cloud,
          items: [
            { 
              name: 'Custom-REST-Endpoint', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 15, 
              status: 'unsanctioned', 
              provider: 'Custom', 
              discoveryDate: '2023-12-10', 
              requestCount: 8500, 
              requestSummary: 'Direct data access without auth',
              requestResponseCount30d: 8500,
              requestResponseTrend7d: 18.5,
              requestResponseHistory: generateTimeSeries(30, 280, 50),
              dataVolume30d: '15.2 GB',
              dataVolumeTrend7d: 12.0,
              dataVolumeHistory: generateTimeSeries(30, 500, 100),
              activeUsers7d: 12,
              activeUsersHistory: generateTimeSeries(7, 10, 3)
            },
            { 
              name: 'GitHub-Data-API', 
              usage: 'Daily', 
              riskLevel: 'critical', 
              users: 22, 
              status: 'unsanctioned', 
              provider: 'GitHub Personal', 
              discoveryDate: '2023-11-05', 
              requestCount: 12000, 
              requestSummary: 'Repo scanning, code access',
              requestResponseCount30d: 12000,
              requestResponseTrend7d: 25.0,
              requestResponseHistory: generateTimeSeries(30, 400, 80),
              dataVolume30d: '8.5 GB',
              dataVolumeTrend7d: 20.0,
              dataVolumeHistory: generateTimeSeries(30, 280, 60),
              activeUsers7d: 18,
              activeUsersHistory: generateTimeSeries(7, 15, 4)
            },
            { 
              name: 'Notion-Unofficial-API', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 30, 
              status: 'warning', 
              provider: 'Community', 
              discoveryDate: '2023-09-01', 
              requestCount: 2500, 
              requestSummary: 'Page syncing, content backups',
              requestResponseCount30d: 2500,
              requestResponseTrend7d: 3.2,
              requestResponseHistory: generateTimeSeries(30, 80, 20),
              dataVolume30d: '4.5 GB',
              dataVolumeTrend7d: 1.5,
              dataVolumeHistory: generateTimeSeries(30, 150, 40),
              activeUsers7d: 25,
              activeUsersHistory: generateTimeSeries(7, 22, 5)
            },
            { 
              name: 'Slack-Export-API', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 8, 
              status: 'unsanctioned', 
              provider: 'Third Party', 
              discoveryDate: '2023-10-20', 
              requestCount: 40, 
              requestSummary: 'Channel history downloads',
              requestResponseCount30d: 40,
              requestResponseTrend7d: 0.0,
              requestResponseHistory: generateTimeSeries(30, 1, 1),
              dataVolume30d: '250 MB',
              dataVolumeTrend7d: 0.0,
              dataVolumeHistory: generateTimeSeries(30, 8, 2),
              activeUsers7d: 4,
              activeUsersHistory: generateTimeSeries(7, 4, 1)
            },
          ]
        },
      ]
    }
  },
  'ou': {
    id: 'ou-breakdown',
    title: 'Organizational Unit Breakdown',
    summary: {
      title: 'OU Analysis',
      content: 'North America Sales and EMEA Engineering are the primary sources of unsanctioned data access. APAC region shows minimal activity.',
      insights: [
        'NA Sales: 60% of total unsanctioned tool usage.',
        'EMEA Engineering: Heavy use of shadow databases.',
        'APAC: Compliant data access patterns observed.'
      ]
    },
    graph: {
      layout: 'sankey',
      center: { label: 'Unsanctioned Activity', icon: Globe },
      nodes: [
        { id: 'na-sales', label: 'NA Sales', subLabel: 'High Risk', type: 'user', value: 8, status: 'unsanctioned', icon: Globe },
        { id: 'emea-eng', label: 'EMEA Eng', subLabel: 'Medium Risk', type: 'user', value: 7, status: 'warning', icon: Globe },
        { id: 'apac-ops', label: 'APAC Ops', subLabel: 'Low Risk', type: 'user', value: 3, status: 'safe', icon: Globe },
        { id: 'latam-mkt', label: 'LATAM Mkt', subLabel: 'Medium Risk', type: 'user', value: 4, status: 'warning', icon: Globe },
      ],
      targets: [
        { 
          id: 'tools', 
          label: 'Unsanctioned Tools', 
          type: 'tool', 
          value: 8, 
          status: 'unsanctioned', 
          icon: Wrench,
          items: []
        },
        { 
          id: 'databases', 
          label: 'Unsanctioned Databases', 
          type: 'database', 
          value: 6, 
          status: 'warning', 
          icon: Database,
          items: []
        }
      ]
    }
  },
  'human-nhi': {
    id: 'human-nhi-breakdown',
    title: 'Human vs NHI Breakdown',
    summary: {
      title: 'Identity Type Analysis',
      content: 'Breakdown of unsanctioned asset usage by Human identities versus Non-Human Identities (NHIs).',
      insights: [
        'NHIs account for 65% of high-volume data access.',
        'Human users primarily access cloud storage.',
        'Service accounts detected using unsanctioned databases.'
      ]
    },
    graph: {
      layout: 'sankey',
      center: { label: 'Identity Types', icon: Users },
      nodes: [
        { id: 'human-users', label: 'Human Users', subLabel: 'Interactive', type: 'user', value: 6, status: 'warning', icon: Users },
        { id: 'nhis', label: 'NHIs', subLabel: 'Service Accounts/Bots', type: 'service', value: 9, status: 'unsanctioned', icon: Server },
      ],
      targets: [
        { 
          id: 'databases', 
          label: 'Unsanctioned Databases', 
          type: 'database', 
          value: 7, 
          status: 'unsanctioned', 
          icon: Database,
          items: [] 
        },
        { 
          id: 'tools', 
          label: 'Unsanctioned Tools', 
          type: 'tool', 
          value: 5, 
          status: 'warning', 
          icon: Wrench,
          items: []
        }
      ]
    }
  }
};

export const perspectives: Perspective[] = [
  {
    id: 'unsanctioned-assets',
    title: 'Unsanctioned Data Assets Analysis',
    summary: {
      title: 'High Usage of Unsanctioned Databases & Services',
      content: 'Analysis detects critical unsanctioned usage across databases and services, primarily accessed through sanctioned applications.',
      insights: [
        {
          summary: '2 unsanctioned databases detected this week.',
          entity: 'New Databases',
          users: 124,
          traffic: '1.2 TB',
          event: { id: 'u1', app: 'New Database Cluster', category: 'Database', isNew: true, risk: 'High', traffic: '1.2 TB' },
          items: [
            { 
              name: 'Shadow-MySQL-Prod', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 67, 
              status: 'unsanctioned', 
              provider: 'Self-Hosted', 
              discoveryDate: '2023-10-15', 
              requestCount: 15420, 
              requestSummary: 'Customer data access, PII processing',
              requestResponseCount30d: 15420,
              requestResponseTrend7d: 12.5,
              requestResponseHistory: generateTimeSeries(30, 500, 200),
              dataVolume30d: '4.2 GB',
              dataVolumeTrend7d: 8.3,
              dataVolumeHistory: generateTimeSeries(30, 150, 50),
              activeUsers7d: 45,
              activeUsersHistory: generateTimeSeries(7, 40, 10)
            },
            { 
              name: 'Dev-PostgreSQL-Clone', 
              usage: 'Daily', 
              riskLevel: 'high', 
              users: 42, 
              status: 'unsanctioned', 
              provider: 'AWS (Unmanaged)', 
              discoveryDate: '2023-11-02', 
              requestCount: 8900, 
              requestSummary: 'Test data with production credentials',
              requestResponseCount30d: 8900,
              requestResponseTrend7d: 5.2,
              requestResponseHistory: generateTimeSeries(30, 300, 100),
              dataVolume30d: '1.8 GB',
              dataVolumeTrend7d: 2.1,
              dataVolumeHistory: generateTimeSeries(30, 60, 20),
              activeUsers7d: 28,
              activeUsersHistory: generateTimeSeries(7, 25, 5)
            },
             { 
              name: 'MongoDB-Analytics', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 18, 
              status: 'warning', 
              provider: 'MongoDB Atlas', 
              discoveryDate: '2023-09-20', 
              requestCount: 1200, 
              requestSummary: 'User behavior analytics',
              requestResponseCount30d: 1200,
              requestResponseTrend7d: -2.4,
              requestResponseHistory: generateTimeSeries(30, 40, 15),
              dataVolume30d: '500 MB',
              dataVolumeTrend7d: -1.0,
              dataVolumeHistory: generateTimeSeries(30, 15, 5),
              activeUsers7d: 12,
              activeUsersHistory: generateTimeSeries(7, 10, 3)
            },
            { 
              name: 'S3-Backup-Bucket-Personal', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 25, 
              status: 'warning', 
              provider: 'AWS S3', 
              discoveryDate: '2023-08-05', 
              requestCount: 5600, 
              requestSummary: 'Document backups',
              requestResponseCount30d: 5600,
              requestResponseTrend7d: 15.0,
              requestResponseHistory: generateTimeSeries(30, 180, 60),
              dataVolume30d: '12.5 GB',
              dataVolumeTrend7d: 10.5,
              dataVolumeHistory: generateTimeSeries(30, 400, 100),
              activeUsers7d: 20,
              activeUsersHistory: generateTimeSeries(7, 18, 4)
            }
          ]
        },
        {
          summary: 'High usage of personal cloud storage detected across Engineering teams.',
          entity: 'Personal Cloud Storage',
          users: 450,
          traffic: '850 GB',
          event: { id: 'u2', app: 'Personal Cloud Storage', category: 'Storage', isNew: false, risk: 'Medium', traffic: '850 GB' }
        },
        {
          summary: '43 unsanctioned API endpoints connected to production environments.',
          entity: 'API Endpoints',
          users: 15,
          traffic: '4.2 GB',
          event: { id: 'u3', app: 'Custom API Tools', category: 'Developer Tool', isNew: true, risk: 'Critical', traffic: '4.2 GB' },
          items: [
            { 
              name: 'Custom-REST-Endpoint', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 15, 
              status: 'unsanctioned', 
              provider: 'Custom', 
              discoveryDate: '2023-12-10', 
              requestCount: 8500, 
              requestSummary: 'Direct data access without auth',
              requestResponseCount30d: 8500,
              requestResponseTrend7d: 18.5,
              requestResponseHistory: generateTimeSeries(30, 280, 50),
              dataVolume30d: '15.2 GB',
              dataVolumeTrend7d: 12.0,
              dataVolumeHistory: generateTimeSeries(30, 500, 100),
              activeUsers7d: 12,
              activeUsersHistory: generateTimeSeries(7, 10, 3)
            },
            { 
              name: 'GitHub-Data-API', 
              usage: 'Daily', 
              riskLevel: 'critical', 
              users: 22, 
              status: 'unsanctioned', 
              provider: 'GitHub Personal', 
              discoveryDate: '2023-11-05', 
              requestCount: 12000, 
              requestSummary: 'Repo scanning, code access',
              requestResponseCount30d: 12000,
              requestResponseTrend7d: 25.0,
              requestResponseHistory: generateTimeSeries(30, 400, 80),
              dataVolume30d: '8.5 GB',
              dataVolumeTrend7d: 20.0,
              dataVolumeHistory: generateTimeSeries(30, 280, 60),
              activeUsers7d: 18,
              activeUsersHistory: generateTimeSeries(7, 15, 4)
            },
            { 
              name: 'Notion-Unofficial-API', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 30, 
              status: 'warning', 
              provider: 'Community', 
              discoveryDate: '2023-09-01', 
              requestCount: 2500, 
              requestSummary: 'Page syncing, content backups',
              requestResponseCount30d: 2500,
              requestResponseTrend7d: 3.2,
              requestResponseHistory: generateTimeSeries(30, 80, 20),
              dataVolume30d: '4.5 GB',
              dataVolumeTrend7d: 1.5,
              dataVolumeHistory: generateTimeSeries(30, 150, 40),
              activeUsers7d: 25,
              activeUsersHistory: generateTimeSeries(7, 22, 5)
            },
            { 
              name: 'Slack-Export-API', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 8, 
              status: 'unsanctioned', 
              provider: 'Third Party', 
              discoveryDate: '2023-10-20', 
              requestCount: 40, 
              requestSummary: 'Channel history downloads',
              requestResponseCount30d: 40,
              requestResponseTrend7d: 0.0,
              requestResponseHistory: generateTimeSeries(30, 1, 1),
              dataVolume30d: '250 MB',
              dataVolumeTrend7d: 0.0,
              dataVolumeHistory: generateTimeSeries(30, 8, 2),
              activeUsers7d: 4,
              activeUsersHistory: generateTimeSeries(7, 4, 1)
            }
          ]
        }
      ]
    },
    graph: {
      center: { label: 'Identities', icon: Users },
      nodes: [
        { 
          id: 'apps', 
          label: '2 unsanctioned apps', 
          subLabel: '+1 new', 
          type: 'app', 
          value: 2, 
          status: 'unsanctioned', 
          icon: LayoutGrid,
          items: [
            { 
              name: 'PDF Converter Pro', 
              usage: 'Daily', 
              riskLevel: 'high', 
              users: 12, 
              status: 'unsanctioned', 
              provider: 'Adobe', 
              discoveryDate: '2023-05-12', 
              requestCount: 450, 
              requestSummary: 'Document conversion and merging',
              requestResponseCount30d: 450,
              requestResponseTrend7d: 3.5,
              requestResponseHistory: generateTimeSeries(30, 15, 5),
              dataVolume30d: '150 MB',
              dataVolumeTrend7d: 1.0,
              dataVolumeHistory: generateTimeSeries(30, 5, 2),
              activeUsers7d: 8,
              activeUsersHistory: generateTimeSeries(7, 7, 2)
            },
            { 
              name: 'ImgOptim Online', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 8, 
              status: 'unsanctioned', 
              provider: 'Unknown', 
              discoveryDate: '2023-06-20', 
              requestCount: 120, 
              requestSummary: 'Image compression for web assets',
              requestResponseCount30d: 120,
              requestResponseTrend7d: 0.5,
              requestResponseHistory: generateTimeSeries(30, 4, 2),
              dataVolume30d: '85 MB',
              dataVolumeTrend7d: 0.2,
              dataVolumeHistory: generateTimeSeries(30, 3, 1),
              activeUsers7d: 4,
              activeUsersHistory: generateTimeSeries(7, 4, 1)
            },
          ]
        },
        { 
          id: 'services', 
          label: '15 unsanctioned services', 
          type: 'service', 
          value: 8, 
          status: 'unsanctioned', 
          icon: Server,
          items: [
            { 
              name: 'DataSync-Service', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 45, 
              status: 'unsanctioned', 
              provider: 'Custom Script', 
              discoveryDate: '2023-10-01', 
              requestCount: 22000, 
              requestSummary: 'Automated data sync to external storage',
              requestResponseCount30d: 22000,
              requestResponseTrend7d: 20.5,
              requestResponseHistory: generateTimeSeries(30, 700, 300),
              dataVolume30d: '8.5 GB',
              dataVolumeTrend7d: 15.2,
              dataVolumeHistory: generateTimeSeries(30, 280, 80),
              activeUsers7d: 35,
              activeUsersHistory: generateTimeSeries(7, 30, 8)
            },
            { 
              name: 'ETL-Pipeline-v2', 
              usage: 'Daily', 
              riskLevel: 'high', 
              users: 32, 
              status: 'unsanctioned', 
              provider: 'Internal Fork', 
              discoveryDate: '2023-11-10', 
              requestCount: 4500, 
              requestSummary: 'Data transformation and aggregation',
              requestResponseCount30d: 4500,
              requestResponseTrend7d: 8.0,
              requestResponseHistory: generateTimeSeries(30, 150, 40),
              dataVolume30d: '3.2 GB',
              dataVolumeTrend7d: 4.5,
              dataVolumeHistory: generateTimeSeries(30, 100, 30),
              activeUsers7d: 25,
              activeUsersHistory: generateTimeSeries(7, 22, 6)
            },
            { 
              name: 'Report-Generator', 
              usage: 'Daily', 
              riskLevel: 'medium', 
              users: 28, 
              status: 'warning', 
              provider: 'Unknown', 
              discoveryDate: '2023-09-15', 
              requestCount: 7800, 
              requestSummary: 'Automated report generation',
              requestResponseCount30d: 7800,
              requestResponseTrend7d: 3.5,
              requestResponseHistory: generateTimeSeries(30, 260, 50),
              dataVolume30d: '1.2 GB',
              dataVolumeTrend7d: 1.8,
              dataVolumeHistory: generateTimeSeries(30, 40, 10),
              activeUsers7d: 22,
              activeUsersHistory: generateTimeSeries(7, 20, 5)
            },
            { 
              name: 'Data-Exporter', 
              usage: 'Weekly', 
              riskLevel: 'low', 
              users: 15, 
              status: 'warning', 
              provider: 'SaaS Vendor', 
              discoveryDate: '2023-07-20', 
              requestCount: 300, 
              requestSummary: 'CSV export utility',
              requestResponseCount30d: 300,
              requestResponseTrend7d: 0.5,
              requestResponseHistory: generateTimeSeries(30, 10, 5),
              dataVolume30d: '150 MB',
              dataVolumeTrend7d: 0.2,
              dataVolumeHistory: generateTimeSeries(30, 5, 2),
              activeUsers7d: 10,
              activeUsersHistory: generateTimeSeries(7, 8, 2)
            },
            { 
              name: 'WebScraper-Service', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 5, 
              status: 'unsanctioned', 
              provider: 'Custom Script', 
              discoveryDate: '2023-12-01', 
              requestCount: 50, 
              requestSummary: 'Bulk data extraction from external sites',
              requestResponseCount30d: 50,
              requestResponseTrend7d: 0.0,
              requestResponseHistory: generateTimeSeries(30, 2, 1),
              dataVolume30d: '2.5 GB',
              dataVolumeTrend7d: 0.0,
              dataVolumeHistory: generateTimeSeries(30, 80, 20),
              activeUsers7d: 3,
              activeUsersHistory: generateTimeSeries(7, 3, 1)
            },
          ]
        },
        { 
          id: 'databases', 
          label: '12 unsanctioned databases', 
          subLabel: '+2 new', 
          type: 'database', 
          value: 7, 
          status: 'unsanctioned', 
          icon: Database,
          items: [
            { 
              name: 'Shadow-MySQL-Prod', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 67, 
              status: 'unsanctioned', 
              provider: 'Self-Hosted', 
              discoveryDate: '2023-10-15', 
              requestCount: 15420, 
              requestSummary: 'Customer data access, PII processing',
              requestResponseCount30d: 15420,
              requestResponseTrend7d: 12.5,
              requestResponseHistory: generateTimeSeries(30, 500, 200),
              dataVolume30d: '4.2 GB',
              dataVolumeTrend7d: 8.3,
              dataVolumeHistory: generateTimeSeries(30, 150, 50),
              activeUsers7d: 45,
              activeUsersHistory: generateTimeSeries(7, 40, 10)
            },
            { 
              name: 'Dev-PostgreSQL-Clone', 
              usage: 'Daily', 
              riskLevel: 'high', 
              users: 42, 
              status: 'unsanctioned', 
              provider: 'AWS (Unmanaged)', 
              discoveryDate: '2023-11-02', 
              requestCount: 8900, 
              requestSummary: 'Test data with production credentials',
              requestResponseCount30d: 8900,
              requestResponseTrend7d: 5.2,
              requestResponseHistory: generateTimeSeries(30, 300, 100),
              dataVolume30d: '1.8 GB',
              dataVolumeTrend7d: 2.1,
              dataVolumeHistory: generateTimeSeries(30, 60, 20),
              activeUsers7d: 28,
              activeUsersHistory: generateTimeSeries(7, 25, 5)
            },
            { 
              name: 'MongoDB-Analytics', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 18, 
              status: 'warning', 
              provider: 'MongoDB Atlas', 
              discoveryDate: '2023-09-20', 
              requestCount: 1200, 
              requestSummary: 'User behavior analytics',
              requestResponseCount30d: 1200,
              requestResponseTrend7d: -2.4,
              requestResponseHistory: generateTimeSeries(30, 40, 15),
              dataVolume30d: '500 MB',
              dataVolumeTrend7d: -1.0,
              dataVolumeHistory: generateTimeSeries(30, 15, 5),
              activeUsers7d: 12,
              activeUsersHistory: generateTimeSeries(7, 10, 3)
            },
            { 
              name: 'S3-Backup-Bucket-Personal', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 25, 
              status: 'warning', 
              provider: 'AWS S3', 
              discoveryDate: '2023-08-05', 
              requestCount: 5600, 
              requestSummary: 'Document backups',
              requestResponseCount30d: 5600,
              requestResponseTrend7d: 15.0,
              requestResponseHistory: generateTimeSeries(30, 180, 60),
              dataVolume30d: '12.5 GB',
              dataVolumeTrend7d: 10.5,
              dataVolumeHistory: generateTimeSeries(30, 400, 100),
              activeUsers7d: 20,
              activeUsersHistory: generateTimeSeries(7, 18, 4)
            },
            { 
              name: 'Redis-Cache-Dev', 
              usage: 'Daily', 
              riskLevel: 'medium', 
              users: 14, 
              status: 'warning', 
              provider: 'Redis Labs', 
              discoveryDate: '2024-02-20', 
              requestCount: 3200, 
              requestSummary: 'Session data caching',
              requestResponseCount30d: 3200,
              requestResponseTrend7d: 8.5,
              requestResponseHistory: generateTimeSeries(30, 100, 30),
              dataVolume30d: '2.5 GB',
              dataVolumeTrend7d: 5.2,
              dataVolumeHistory: generateTimeSeries(30, 80, 20),
              activeUsers7d: 10,
              activeUsersHistory: generateTimeSeries(7, 9, 2)
            },
            { 
              name: 'ElasticSearch-Logs', 
              usage: 'Hourly', 
              riskLevel: 'high', 
              users: 35, 
              status: 'unsanctioned', 
              provider: 'Elastic Cloud', 
              discoveryDate: '2024-03-10', 
              requestCount: 6500, 
              requestSummary: 'Application logs with sensitive data',
              requestResponseCount30d: 6500,
              requestResponseTrend7d: 18.0,
              requestResponseHistory: generateTimeSeries(30, 200, 50),
              dataVolume30d: '3.1 GB',
              dataVolumeTrend7d: 12.5,
              dataVolumeHistory: generateTimeSeries(30, 120, 40),
              activeUsers7d: 28,
              activeUsersHistory: generateTimeSeries(7, 25, 5)
            },
          ]
        }, 
        { 
          id: 'apis', 
          label: '43 unsanctioned APIs', 
          subLabel: '+11 new', 
          type: 'api', 
          value: 9, 
          status: 'unsanctioned', 
          icon: Cloud,
          items: [
            { 
              name: 'Custom-REST-Endpoint', 
              usage: 'Hourly', 
              riskLevel: 'critical', 
              users: 15, 
              status: 'unsanctioned', 
              provider: 'Custom', 
              discoveryDate: '2023-12-10', 
              requestCount: 8500, 
              requestSummary: 'Direct data access without auth',
              requestResponseCount30d: 8500,
              requestResponseTrend7d: 18.5,
              requestResponseHistory: generateTimeSeries(30, 280, 50),
              dataVolume30d: '15.2 GB',
              dataVolumeTrend7d: 12.0,
              dataVolumeHistory: generateTimeSeries(30, 500, 100),
              activeUsers7d: 12,
              activeUsersHistory: generateTimeSeries(7, 10, 3)
            },
            { 
              name: 'GitHub-Data-API', 
              usage: 'Daily', 
              riskLevel: 'critical', 
              users: 22, 
              status: 'unsanctioned', 
              provider: 'GitHub Personal', 
              discoveryDate: '2023-11-05', 
              requestCount: 12000, 
              requestSummary: 'Repo scanning, code access',
              requestResponseCount30d: 12000,
              requestResponseTrend7d: 25.0,
              requestResponseHistory: generateTimeSeries(30, 400, 80),
              dataVolume30d: '8.5 GB',
              dataVolumeTrend7d: 20.0,
              dataVolumeHistory: generateTimeSeries(30, 280, 60),
              activeUsers7d: 18,
              activeUsersHistory: generateTimeSeries(7, 15, 4)
            },
            { 
              name: 'Notion-Unofficial-API', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 30, 
              status: 'warning', 
              provider: 'Community', 
              discoveryDate: '2023-09-01', 
              requestCount: 2500, 
              requestSummary: 'Page syncing, content backups',
              requestResponseCount30d: 2500,
              requestResponseTrend7d: 3.2,
              requestResponseHistory: generateTimeSeries(30, 80, 20),
              dataVolume30d: '4.5 GB',
              dataVolumeTrend7d: 1.5,
              dataVolumeHistory: generateTimeSeries(30, 150, 40),
              activeUsers7d: 25,
              activeUsersHistory: generateTimeSeries(7, 22, 5)
            },
            { 
              name: 'Slack-Export-API', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 8, 
              status: 'unsanctioned', 
              provider: 'Third Party', 
              discoveryDate: '2023-10-20', 
              requestCount: 40, 
              requestSummary: 'Channel history downloads',
              requestResponseCount30d: 40,
              requestResponseTrend7d: 0.0,
              requestResponseHistory: generateTimeSeries(30, 1, 1),
              dataVolume30d: '250 MB',
              dataVolumeTrend7d: 0.0,
              dataVolumeHistory: generateTimeSeries(30, 8, 2),
              activeUsers7d: 4,
              activeUsersHistory: generateTimeSeries(7, 4, 1)
            },
            { 
              name: 'SQL-Connector', 
              usage: 'Daily', 
              riskLevel: 'medium', 
              users: 11, 
              status: 'warning', 
              provider: 'Internal', 
              discoveryDate: '2023-12-05', 
              requestCount: 1200, 
              requestSummary: 'Direct DB queries',
              requestResponseCount30d: 1200,
              requestResponseTrend7d: 2.5,
              requestResponseHistory: generateTimeSeries(30, 40, 10),
              dataVolume30d: '500 MB',
              dataVolumeTrend7d: 1.0,
              dataVolumeHistory: generateTimeSeries(30, 15, 5),
              activeUsers7d: 8,
              activeUsersHistory: generateTimeSeries(7, 8, 2)
            },
            { 
              name: 'FTP-Transfer-API', 
              usage: 'Weekly', 
              riskLevel: 'critical', 
              users: 5, 
              status: 'unsanctioned', 
              provider: 'Legacy', 
              discoveryDate: '2024-01-15', 
              requestCount: 300, 
              requestSummary: 'Unencrypted file transfers',
              requestResponseCount30d: 300,
              requestResponseTrend7d: 0.0,
              requestResponseHistory: generateTimeSeries(30, 10, 5),
              dataVolume30d: '50 MB',
              dataVolumeTrend7d: 0.0,
              dataVolumeHistory: generateTimeSeries(30, 2, 1),
              activeUsers7d: 3,
              activeUsersHistory: generateTimeSeries(7, 3, 1)
            },
          ]
        },
        { 
          id: 'tools', 
          label: '50 unsanctioned tools', 
          subLabel: '+2 new', 
          type: 'tool', 
          value: 4, 
          status: 'unsanctioned', 
          icon: Wrench,
          items: [
            { 
              name: 'JsonFormatter.io', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 89, 
              status: 'warning', 
              provider: 'Web Tool', 
              discoveryDate: '2023-01-15', 
              requestCount: 45000, 
              requestSummary: 'JSON payload formatting',
              requestResponseCount30d: 45000,
              requestResponseTrend7d: 2.5,
              requestResponseHistory: generateTimeSeries(30, 1500, 200),
              dataVolume30d: '500 MB',
              dataVolumeTrend7d: 1.2,
              dataVolumeHistory: generateTimeSeries(30, 16, 4),
              activeUsers7d: 65,
              activeUsersHistory: generateTimeSeries(7, 60, 8)
            },
            { 
              name: 'Base64Decode.org', 
              usage: 'Daily', 
              riskLevel: 'low', 
              users: 76, 
              status: 'warning', 
              provider: 'Web Tool', 
              discoveryDate: '2023-02-10', 
              requestCount: 32000, 
              requestSummary: 'Token decoding, string manipulation',
              requestResponseCount30d: 32000,
              requestResponseTrend7d: 1.8,
              requestResponseHistory: generateTimeSeries(30, 1000, 150),
              dataVolume30d: '200 MB',
              dataVolumeTrend7d: 0.5,
              dataVolumeHistory: generateTimeSeries(30, 6, 2),
              activeUsers7d: 50,
              activeUsersHistory: generateTimeSeries(7, 45, 10)
            },
            { 
              name: 'Regex101 Clone', 
              usage: 'Weekly', 
              riskLevel: 'medium', 
              users: 45, 
              status: 'warning', 
              provider: 'Self-hosted', 
              discoveryDate: '2023-06-05', 
              requestCount: 1500, 
              requestSummary: 'Pattern matching tests',
              requestResponseCount30d: 1500,
              requestResponseTrend7d: 5.5,
              requestResponseHistory: generateTimeSeries(30, 50, 20),
              dataVolume30d: '50 MB',
              dataVolumeTrend7d: 2.0,
              dataVolumeHistory: generateTimeSeries(30, 2, 1),
              activeUsers7d: 30,
              activeUsersHistory: generateTimeSeries(7, 28, 5)
            },
            { 
              name: 'TempMail Service', 
              usage: 'Monthly', 
              riskLevel: 'high', 
              users: 12, 
              status: 'unsanctioned', 
              provider: 'External Service', 
              discoveryDate: '2023-11-25', 
              requestCount: 120, 
              requestSummary: 'Anonymous registration verification',
              requestResponseCount30d: 120,
              requestResponseTrend7d: -5.0,
              requestResponseHistory: generateTimeSeries(30, 4, 2),
              dataVolume30d: '10 MB',
              dataVolumeTrend7d: -2.0,
              dataVolumeHistory: generateTimeSeries(30, 1, 0),
              activeUsers7d: 5,
              activeUsersHistory: generateTimeSeries(7, 4, 1)
            },
          ]
        },
      ]
    }
  },
  {
    id: 'sensitive-data',
    title: 'Sensitive data access analysis',
    summary: {
      title: 'Data Compliance Violations',
      content: 'We have detected multiple unapproved data flows where Services and Databases are accessing regulated data types. High-risk flows involving PII and GDPR data require immediate attention.',
      insights: [
        'Services are accessing PII data without proper masking.',
        'Unsanctioned Databases interacting with GDPR-protected records.',
        'Tools bypassing CCPA compliance checks.'
      ]
    },
    graph: {
      layout: 'sankey',
      center: { label: 'Risk', icon: ShieldAlert },
      nodes: [
        { id: 'src-apps', label: 'Apps', type: 'app', value: 5, status: 'warning', icon: LayoutGrid },
        { id: 'src-databases', label: 'Databases', type: 'database', value: 8, status: 'unsanctioned', icon: Database },
        { id: 'src-services', label: 'Services', type: 'service', value: 7, status: 'unsanctioned', icon: Server },
        { id: 'src-apis', label: 'APIs', type: 'api', value: 6, status: 'unsanctioned', icon: Cloud },
        { id: 'src-tools', label: 'Tools', type: 'tool', value: 4, status: 'warning', icon: Wrench },
      ],
      targets: [
        { id: 'dest-gdpr', label: 'GDPR', subLabel: 'EU Regulated', type: 'risk', value: 8, status: 'unsanctioned', icon: ShieldAlert },
        { id: 'dest-pii', label: 'PII', subLabel: 'Personal Data', type: 'risk', value: 9, status: 'unsanctioned', icon: Users },
        { id: 'dest-nist', label: 'NIST', subLabel: 'Compliance', type: 'risk', value: 4, status: 'warning', icon: ShieldCheck },
        { id: 'dest-ccpa', label: 'CCPA', subLabel: 'California', type: 'risk', value: 6, status: 'unsanctioned', icon: ShieldAlert },
      ]
    }
  },
  {
    id: 'malicious-attacks',
    title: 'Security breach analysis',
    summary: {
      title: 'Security Threat Detection',
      content: 'Real-time monitoring has detected sophisticated attack vectors targeting data endpoints. SQL injection and data exfiltration attempts are rising.',
      insights: [
        '3 confirmed SQL Injection attacks in the last 24h.',
        'Data exfiltration attempt blocked via DLP integration.',
        'Unauthorized access patterns identified in shadow databases.'
      ]
    },
    graph: {
      layout: 'timeline',
      center: { label: 'Attacks', icon: ShieldAlert },
      nodes: [
        {
          id: 'attack-1',
          label: 'SQL Injection / Privilege Escalation',
          type: 'risk',
          value: 10,
          status: 'unsanctioned',
          timestamp: 'Today, 14:32 PM',
          description: 'Malicious SQL payload injected via user input field caused unauthorized access to customer database and exposed API keys.',
          attackPath: [
            { id: 'step1', label: 'Ext. User', type: 'user', status: 'source', icon: Users },
            { id: 'step2', label: 'Public App', type: 'app', status: 'target', icon: LayoutGrid },
            { id: 'step3', label: 'API Gateway', type: 'api', status: 'compromised', icon: Cloud },
            { id: 'step4', label: 'Customer DB', type: 'database', status: 'impacted', icon: Database }
          ]
        },
        {
          id: 'attack-2',
          label: 'Data Exfiltration',
          type: 'risk',
          value: 8,
          status: 'warning',
          timestamp: 'Today, 11:15 AM',
          description: 'Bulk data download detected from unsanctioned service attempting to export sensitive customer records to external storage.',
          attackPath: [
            { id: 'step1', label: 'ETL Service', type: 'service', status: 'source', icon: Server },
            { id: 'step2', label: 'Data Export', type: 'service', status: 'compromised', icon: Server },
            { id: 'step3', label: 'Ext. Storage', type: 'risk', status: 'impacted', icon: Globe }
          ]
        },
        {
          id: 'attack-3',
          label: 'Denial of Service',
          type: 'risk',
          value: 6,
          status: 'warning',
          timestamp: 'Yesterday, 16:45 PM',
          description: 'High-volume recursive queries designed to exhaust database connections and degrade service availability for legitimate users.',
          attackPath: [
            { id: 'step1', label: 'Botnet', type: 'user', status: 'source', icon: Users },
            { id: 'step2', label: 'API Gateway', type: 'app', status: 'target', icon: LayoutGrid },
            { id: 'step3', label: 'Production DB', type: 'database', status: 'safe', icon: Database }
          ]
        }
      ]
    }
  },
  {
    id: 'vendor-breakdown',
    title: 'Cloud Provider Ecosystem',
    summary: {
      title: 'Cloud Provider Landscape',
      content: 'The majority of data assets are hosted on AWS and Azure. We are seeing a 40% increase in unsanctioned GCP resource usage.',
      insights: [
        'AWS and Azure account for 75% of sanctioned infrastructure.',
        'Rising trend in unsanctioned GCP projects.',
        'On-premise databases flagged as unsanctioned.'
      ]
    },
    graph: {
      layout: 'bubble',
      center: { label: 'Providers', icon: Globe },
      nodes: [
        { id: 'aws', label: 'AWS', subLabel: 'Sanctioned', type: 'database', value: 9, status: 'safe', icon: Cloud },
        { id: 'azure', label: 'Azure', subLabel: 'Sanctioned', type: 'database', value: 7, status: 'safe', icon: Cloud },
        { id: 'gcp', label: 'GCP', type: 'database', value: 5, status: 'warning', icon: Cloud },
        { id: 'onprem', label: 'On-Premise', type: 'database', value: 3, status: 'unsanctioned', icon: HardDrive },
        { id: 'hybrid', label: 'Hybrid Cloud', type: 'database', value: 6, status: 'warning', icon: Cloud },
      ]
    }
  },
  {
    id: 'external-exposure',
    title: 'External Access Analysis',
    summary: {
      title: 'External Access Patterns',
      content: 'Analysis of external entities accessing internal data resources. Significant traffic detected from anonymous sources targeting public-facing APIs, while external services are heavily utilizing internal databases.',
      insights: [
        'Anonymous users heavily targeting public APIs (9k requests).',
        'External Services accessing high-risk internal Databases.',
        'Unexpected API usage by external authenticated accounts.'
      ]
    },
    graph: {
      layout: 'sankey',
      center: { label: 'External', icon: Globe },
      nodes: [
        { id: 'ext-services', label: 'External Services', subLabel: '3rd Party', type: 'service', value: 7, status: 'warning', icon: Server },
        { id: 'anon-users', label: 'Public Users', subLabel: 'Anonymous', type: 'user', value: 9, status: 'unsanctioned', icon: Globe },
      ],
      targets: [
        { id: 'dest-apps', label: 'Apps', type: 'app', value: 6, status: 'sanctioned', icon: LayoutGrid },
        { id: 'dest-databases', label: 'Databases', type: 'database', value: 8, status: 'warning', icon: Database },
        { id: 'dest-services', label: 'Services', type: 'service', value: 7, status: 'unsanctioned', icon: Server },
        { id: 'dest-apis', label: 'APIs', type: 'api', value: 5, status: 'unsanctioned', icon: Cloud },
        { id: 'dest-tools', label: 'Tools', type: 'tool', value: 9, status: 'warning', icon: Wrench },
      ]
    }
  },

  {
    id: 'create-new',
    title: 'Create new view',
    summary: {
      title: 'New Analysis',
      content: 'Start a new analysis by describing what you want to explore. Select from available data sources and visualization types.',
    },
    graph: {
      layout: 'blank',
      center: { label: 'New', icon: Plus },
      nodes: []
    }
  }
];
