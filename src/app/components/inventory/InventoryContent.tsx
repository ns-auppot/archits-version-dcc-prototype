import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from "react";
import LightBgGDrive from "../../../imports/LightBgGDrive";
import { TablePagination } from "../ui/table-pagination";
import { Monitor, ShieldCheck, ShieldOff, Activity, HardDrive, Globe, Cloud, Database, Server, PieChart, BarChart3, Info, ChevronDown, Key, Shield, X, Plus } from "lucide-react";
import { LinkUsernameModal } from "./LinkUsernameModal";
import { useSearchParams } from "react-router";
import { UnstructuredDataStoreTable } from "./UnstructuredDataStoreTable";
import { UnstructuredDataStoreTableSaaS } from "./UnstructuredDataStoreTableSaaS";
import { UnstructuredDataStoreTableIaaS } from "./UnstructuredDataStoreTableIaaS";
import { StructuredDataStoreTableOnPrem } from "./StructuredDataStoreTableOnPrem";
import { StructuredDataStoreTableIaaS } from "./StructuredDataStoreTableIaaS";
import { UnmanagedDestinationsTable, UnmanagedRowStandalonePanel, UNMANAGED_DESTINATIONS } from "./UnmanagedDestinationsTable";
import { SidePanel } from "./SidePanel";
import { PlaceholderOutline } from "./PlaceholderOutline";
import { GoogleDriveDashboard } from "./GoogleDriveDashboard";
import { AWSDashboard } from "./AWSDashboard";
import { AzureDashboard } from "./AzureDashboard";
import { OnPremDashboard } from "./OnPremDashboard";
import { SharePointDashboard } from "./SharePointDashboard";
import { DATA_STORES } from "./AccessRadarDiagram";
import {
  IDENTITY_REGISTRY,
  MACHINE_TYPES,
  IDENTITY_TYPE_LABEL,
} from "./identityRegistry";
import {
  Sparkline,
  SortIcon,
  SortDropdown,
  toggleHeaderSort,
  TableSearchInput,
  HighlightText,
  matchesSearch,
  DataTypeTags,
  type SortConfig,
  type SortColumnDef,
} from "./data-store-shared";
import { IdentityActivityTabContent, generateIdentityActivityLog, ACTION_META, formatIdentityDate } from "./identity-activity-shared";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { IDENTITY_STATUS_TAGS } from "./inventory-search-data";
import { DataStoreIcon } from "./data-store-icons";

const DASHBOARD_IDS = ["google-drive", "sharepoint", "aws", "azure", "endpoint", "on-prem"];

interface DashboardConfig {
  title: string;
  subtitle: string;
  stats: { label: string; value: string; icon: React.ReactNode }[];
  charts: { title: string; icon: React.ReactNode }[];
}

function getDashboardConfig(navId: string): DashboardConfig {
  switch (navId) {
    case "google-drive":
      return {
        title: "Google Drive",
        subtitle: "Managed cloud storage — drives, files, and shared content",
        stats: [
          { label: "Total Drives", value: "4", icon: <HardDrive size={18} /> },
          { label: "Sensitive Files", value: "128", icon: <ShieldCheck size={18} /> },
          { label: "Shared Externally", value: "12", icon: <Globe size={18} /> },
          { label: "Active Users", value: "34", icon: <Activity size={18} /> },
        ],
        charts: [
          { title: "Data Classification", icon: <PieChart size={48} /> },
          { title: "Sharing Activity", icon: <BarChart3 size={48} /> },
        ],
      };
    case "sharepoint":
      return {
        title: "SharePoint",
        subtitle: "Managed cloud storage — documents, lists, and sites",
        stats: [
          { label: "Total Sites", value: "3", icon: <HardDrive size={18} /> },
          { label: "Sensitive Documents", value: "96", icon: <ShieldCheck size={18} /> },
          { label: "Shared Externally", value: "8", icon: <Globe size={18} /> },
          { label: "Active Users", value: "28", icon: <Activity size={18} /> },
        ],
        charts: [
          { title: "Data Classification", icon: <PieChart size={48} /> },
          { title: "Sharing Activity", icon: <BarChart3 size={48} /> },
        ],
      };
    case "aws":
      return {
        title: "AWS",
        subtitle: "Managed cloud infrastructure — S3 buckets, RDS instances, and more",
        stats: [
          { label: "Total Resources", value: "5", icon: <Cloud size={18} /> },
          { label: "S3 Buckets", value: "3", icon: <BarChart3 size={18} /> },
          { label: "RDS Instances", value: "2", icon: <BarChart3 size={18} /> },
          { label: "Public Access", value: "0", icon: <ShieldCheck size={18} /> },
        ],
        charts: [
          { title: "Storage Distribution", icon: <PieChart size={48} /> },
          { title: "Access Patterns", icon: <BarChart3 size={48} /> },
        ],
      };
    case "azure":
      return {
        title: "Azure",
        subtitle: "Managed cloud infrastructure — Blob storage, SQL databases, and more",
        stats: [
          { label: "Total Resources", value: "4", icon: <Cloud size={18} /> },
          { label: "Blob Storage", value: "2", icon: <BarChart3 size={18} /> },
          { label: "SQL Databases", value: "2", icon: <BarChart3 size={18} /> },
          { label: "Public Access", value: "0", icon: <ShieldCheck size={18} /> },
        ],
        charts: [
          { title: "Storage Distribution", icon: <PieChart size={48} /> },
          { title: "Access Patterns", icon: <BarChart3 size={48} /> },
        ],
      };
    case "endpoint":
      return {
        title: "Endpoint",
        subtitle: "Managed user devices — laptops, desktops, and workstations",
        stats: [
          { label: "Total Devices", value: "5", icon: <Monitor size={18} /> },
          { label: "Compliant", value: "4", icon: <ShieldCheck size={18} /> },
          { label: "Non-Compliant", value: "1", icon: <ShieldOff size={18} /> },
          { label: "Online Now", value: "3", icon: <Activity size={18} /> },
        ],
        charts: [
          { title: "Compliance Status", icon: <PieChart size={48} /> },
          { title: "Device Activity", icon: <BarChart3 size={48} /> },
        ],
      };
    case "on-prem":
      return {
        title: "On-Prem",
        subtitle: "On-premises databases and infrastructure — PostgreSQL, Oracle, and local storage",
        stats: [
          { label: "Total Instances", value: "7", icon: <Server size={18} /> },
          { label: "PostgreSQL", value: "4", icon: <Database size={18} /> },
          { label: "Oracle", value: "3", icon: <Database size={18} /> },
          { label: "Avg Query Load", value: "1.2k/hr", icon: <Activity size={18} /> },
        ],
        charts: [
          { title: "Sensitive Data Distribution", icon: <PieChart size={48} /> },
          { title: "Query Volume (30d)", icon: <BarChart3 size={48} /> },
        ],
      };
    default:
      return {
        title: "Dashboard",
        subtitle: "",
        stats: [],
        charts: [],
      };
  }
}

function DashboardPlaceholder({ navId }: { navId: string }) {
  const config = getDashboardConfig(navId);

  return (
    <div className="flex-1 overflow-auto p-6 bg-white dark:bg-slate-900">
      {/* ContentHeader */}
      <div className="mb-6">
        <h2 className="text-text-bright" style={{ fontSize: "18px", fontWeight: 600 }}>
          {config.title}
        </h2>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "13px" }}>
          {config.subtitle}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {config.stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-900 border border-border rounded-lg p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>
                {stat.label}
              </span>
              <span className="text-muted-foreground opacity-60">{stat.icon}</span>
            </div>
            <span className="text-text-bright" style={{ fontSize: "24px", fontWeight: 600 }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Placeholder Chart Areas */}
      <div className="grid grid-cols-2 gap-4">
        {config.charts.map((chart) => (
          <PlaceholderOutline key={chart.title} label="Chart not designed">
            <div
              className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 h-56 flex flex-col"
            >
              <span className="text-text-bright mb-3" style={{ fontSize: "13px", fontWeight: 500 }}>
                {chart.title}
              </span>
              <div className="flex-1 flex items-center justify-center text-muted-foreground opacity-40">
                {chart.icon}
              </div>
            </div>
          </PlaceholderOutline>
        ))}
      </div>
    </div>
  );
}

const IDENTITY_IDS = [
  "internal-user",
  "external-user",
  "unknown-identity",
  "unmapped-local-user",
  "service-account",
  "agentic-identity",
  "connected-app",
];

interface IdentityTableConfig {
  title: string;
  columns: string[];
  rows: Record<string, string | string[] | number>[];
}

export function getIdentityTableConfig(navId: string): IdentityTableConfig {
  switch (navId) {
    case "internal-user":
      return {
        title: "Internal Users",
        columns: ["Name", "Data Types", "IDP Status", "Linked Account"],
        rows: [
          {
            Name: "Alice Chen", Email: "a.chen@acme.com", Group: "Data Platform",
            "Org Unit": "US", "Date Created": "2023-04-10",
            "Last Active": "2026-02-22 03:48pm",
            "Data Types": ["Personal Names", "Email Addresses", "IP Addresses"],
            "Last Activity Type": "Export", "Last Activity Store": "Customer PII Database",
            "Last Activity File": "customer_pii_q1_2026.csv",
            "Last Permission Change": "2026-02-10 02:00pm", "Last Permission Change Store": "Customer PII Database",
            "Linked Account":2,
            "IDP Status": "Active",
          },
          {
            Name: "Brian Kowalski", Email: "b.kowalski@acme.com", Group: "Finance Ops",
            "Org Unit": "US", "Date Created": "2022-08-15",
            "Last Active": "2026-02-23 08:42am",
            "Data Types": ["Financial IDs", "Bank Account Information", "Payment Cards", "Social Security Numbers"],
            "Last Activity Type": "Download", "Last Activity Store": "Financial Records Archive",
            "Last Activity File": "payroll_summary_feb2026.xlsx",
            "Last Permission Change": "2026-01-28 09:15am", "Last Permission Change Store": "Financial Records Archive",
            "Linked Account":4,
            "IDP Status": "Active",
          },
          {
            Name: "Diana Reyes", Email: "d.reyes@acme.com", Group: "SOC Team",
            "Org Unit": "Mexico", "Date Created": "2021-03-22",
            "Last Active": "2026-02-22 06:30pm",
            "Data Types": ["Secrets and Tokens", "Private Keys", "IP Addresses"],
            "Last Activity Type": "Query", "Last Activity Store": "Security Logs — On-Prem",
            "Last Permission Change": "2026-02-05 04:30pm", "Last Permission Change Store": "Security Logs — On-Prem",
            "Linked Account":3,
            "IDP Status": "Active",
          },
          {
            Name: "Marcus Webb", Email: "m.webb@acme.com", Group: "ML Research",
            "Org Unit": "UK", "Date Created": "2024-01-07",
            "Last Active": "2026-02-22 04:55pm",
            "Data Types": ["Personal Names", "Email Addresses", "Birthdates", "Healthcare IDs"],
            "Last Activity Type": "Upload", "Last Activity Store": "ML Training Data (S3)",
            "Last Activity File": "training_dataset_pii_batch3.csv",
            "Last Permission Change": "2026-01-15 11:20am", "Last Permission Change Store": "ML Training Data (S3)",
            "Linked Account":1,
            "IDP Status": "Suspended",
          },
          {
            Name: "Sophie Laurent", Email: "s.laurent@acme.com", Group: "Legal & Compliance",
            "Org Unit": "France", "Date Created": "2020-11-14",
            "Last Active": "2026-02-19 02:10pm",
            "Data Types": ["Personal Names", "Social Security Numbers", "Taxpayer IDs", "Company Names", "Postal Addresses"],
            "Last Activity Type": "Download", "Last Activity Store": "HR Records — SharePoint",
            "Last Activity File": "employee_records_2026_legal_review.xlsx",
            "Last Permission Change": "2026-02-08 03:45pm", "Last Permission Change Store": "HR Records — SharePoint",
            "Linked Account":0,
            "IDP Status": "Active",
          },
          {
            Name: "Tom Nguyen", Email: "t.nguyen@acme.com", Group: "Platform Infra",
            "Org Unit": "Vietnam", "Date Created": "2023-09-03",
            "Last Active": "2026-02-20 03:40pm",
            "Data Types": ["API Keys", "Passwords", "Private Keys"],
            "Last Activity Type": "Admin", "Last Activity Store": "PostgreSQL — PROD-01",
            "Last Permission Change": "2026-02-12 10:00am", "Last Permission Change Store": "PostgreSQL — PROD-01",
            "Linked Account":2,
            "IDP Status": "Locked Out",
          },
          {
            Name: "Sarah Kim", Email: "s.kim@acme.com", Group: "Product Analytics",
            "Org Unit": "South Korea", "Date Created": "2022-05-17",
            "Last Active": "2026-04-14 10:22am",
            "Data Types": ["Personal Names", "Email Addresses", "Behavioral Data", "Device IDs"],
            "Last Activity Type": "Export", "Last Activity Store": "Analytics Data Lake (S3)",
            "Last Activity File": "user_behavior_cohort_q1_2026.csv",
            "Last Permission Change": "2026-03-28 02:15pm", "Last Permission Change Store": "Analytics Data Lake (S3)",
            "Linked Account":1,
            "IDP Status": "Active",
          },
        ],
      };
    case "external-user":
      return {
        title: "External Users",
        columns: ["Name", "Data Types", "IDP Status", "Linked Account"],
        rows: [
          {
            Name: "James Thornton", Email: "j.thornton@partner.io", "Org Unit": "UK",
            "Date Created": "2024-11-05", "Last Active": "2026-02-21 03:10pm",
            "Data Types": ["Personal Names", "Email Addresses", "Financial IDs"],
            "Last Activity Type": "Download", "Last Activity Store": "Shared Reports Bucket",
            "Last Activity File": "q4_customer_report_export.csv",
            "Last Permission Change": "2026-01-30 01:30pm", "Last Permission Change Store": "Shared Reports Bucket",
            "IDP Status": "Active",
            "Linked Account": 2,
          },
          {
            Name: "Priya Nair", Email: "p.nair@vendorcorp.com", "Org Unit": "India",
            "Date Created": "2025-01-18", "Last Active": "2026-02-18 04:20pm",
            "Data Types": ["Personal Names", "Social Security Numbers", "Postal Addresses"],
            "Last Activity Type": "Export", "Last Activity Store": "Vendor Shared Drive",
            "Last Activity File": "vendor_pii_summary_2026.csv",
            "Last Permission Change": "2026-02-01 03:00pm", "Last Permission Change Store": "Vendor Shared Drive",
            "IDP Status": "Suspended",
            "Linked Account": 1,
          },
          {
            Name: "Carlos Medina", Email: "c.medina@consultgroup.com", "Org Unit": "Mexico",
            "Date Created": "2024-06-22", "Last Active": "2026-02-18 09:30am",
            "Data Types": ["Email Addresses", "Company Names", "IP Addresses"],
            "Last Activity Type": "Query", "Last Activity Store": "Analytics Warehouse (RDS)",
            "Last Permission Change": "2026-01-20 10:45am", "Last Permission Change Store": "Analytics Warehouse (RDS)",
            "IDP Status": "Deactivated",
            "Linked Account": 0,
          },
        ],
      };
    case "unknown-identity":
      return {
        title: "Unknown Identities",
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
      };
    case "unmapped-local-user":
      return {
        title: "Unlinked Local Users",
        columns: ["Username", "Data Types", "Source", "Linked Status"],
        rows: [
          { Username: "root", Source: "PGSRV-PROD-01", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Date Created": "2026-02-23", "Data Types": ["Personal Names", "Email Addresses"] },
          { Username: "postgres", Source: "PGSRV-PROD-02", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Date Created": "2026-02-23", "Data Types": ["Financial IDs", "Taxpayer IDs"] },
          { Username: "svc_reporting", Source: "analytics-warehouse", "Source Type": "Cloud DB (RDS)", "Linked Status": "Unlinked", "Date Created": "2026-02-22", "Data Types": ["Personal Names", "Company Names", "Email Addresses"] },
          { Username: "ubuntu", Source: "LAPTOP-DC-4201", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Date Created": "2026-02-22", "Data Types": ["IP Addresses", "Domain Names"] },
          { Username: "administrator", Source: "DESKTOP-BK-3302", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Date Created": "2026-02-21", "Data Types": ["Passwords", "API Keys"] },
          { Username: "jenkins_build", Source: "CI/CD Pipeline", "Source Type": "Application", "Linked Status": "Unlinked", "Date Created": "2026-02-21", "Data Types": ["Secrets and Tokens", "Private Keys", "API Keys"] },
          { Username: "app_svc", Source: "Salesforce CRM", "Source Type": "SaaS App", "Linked Status": "Unlinked", "Date Created": "2026-02-20", "Data Types": ["Personal Names", "Email Addresses", "Telephone Numbers"] },
          { Username: "oracledb_admin", Source: "ORACLEDB-PROD-01", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Date Created": "2026-02-20", "Data Types": ["Financial IDs", "Bank Account Information"] },
          { Username: "svc_etl", Source: "prod-users-db", "Source Type": "Cloud DB (RDS)", "Linked Status": "Unlinked", "Date Created": "2026-02-19", "Data Types": ["Personal Names", "Social Security Numbers"] },
          { Username: "localadmin", Source: "LAPTOP-MJ-2208", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Date Created": "2026-02-19", "Data Types": ["Passwords", "Private Keys"] },
          { Username: "backup_user", Source: "PGSRV-LEGACY", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Date Created": "2026-02-18", "Data Types": ["Personal Names", "Email Addresses"] },
          { Username: "data_reader", Source: "acme-prod-customers", "Source Type": "Cloud DB (Azure SQL)", "Linked Status": "Unlinked", "Date Created": "2026-02-18", "Data Types": ["Personal Names", "Financial IDs", "Healthcare IDs"] },
          { Username: "system", Source: "DESKTOP-TP-5501", "Source Type": "Endpoint", "Linked Status": "Unlinked", "Date Created": "2026-02-17", "Data Types": ["IP Addresses"] },
          { Username: "replication_svc", Source: "ORACLEDB-LEGACY", "Source Type": "On-Prem DB", "Linked Status": "Unlinked", "Date Created": "2026-02-17", "Data Types": ["Financial IDs", "Taxpayer IDs", "Company Names"] },
        ],
      };
    case "service-account":
      return {
        title: "Service Accounts",
        columns: ["Name", "Data Types", "Source"],
        rows: [
          { Name: "CI/CD Pipeline", Source: "GitHub Actions", "Source Type": "Application", "Data Types": ["Secrets and Tokens", "API Keys", "Private Keys"] },
          { Name: "Data Sync Bot", Source: "Apache Airflow", "Source Type": "Application", "Data Types": ["Personal Names", "Email Addresses", "Financial IDs"] },
        ],
      };
    case "agentic-identity":
      return {
        title: "Agentic Identities",
        columns: ["Name", "Data Types", "Source"],
        rows: [
          { Name: "Support Copilot", Source: "OpenAI API", "Source Type": "AI Platform", "Data Types": ["Personal Names", "Email Addresses", "Telephone Numbers"] },
          { Name: "Code Reviewer", Source: "Anthropic API", "Source Type": "AI Platform", "Data Types": ["Source Code", "API Keys", "Private Keys"] },
          { Name: "Data Classifier", Source: "OpenAI API", "Source Type": "AI Platform", "Data Types": ["Personal Names", "Social Security Numbers", "Healthcare IDs", "Financial IDs"] },
          { Name: "Email Drafter", Source: "OpenAI API", "Source Type": "AI Platform", "Data Types": ["Personal Names", "Email Addresses", "Company Names"] },
          { Name: "Log Analyzer", Source: "Mistral AI", "Source Type": "AI Platform", "Data Types": ["IP Addresses", "Domain Names", "Secrets and Tokens"] },
          { Name: "Meeting Summarizer", Source: "OpenAI API", "Source Type": "AI Platform", "Data Types": ["Personal Names", "Email Addresses"] },
          { Name: "Threat Scanner", Source: "Anthropic API", "Source Type": "AI Platform", "Data Types": ["IP Addresses", "Secrets and Tokens", "API Keys", "Private Keys"] },
          { Name: "Doc Generator", Source: "OpenAI API", "Source Type": "AI Platform", "Data Types": ["Personal Names", "Company Names", "Postal Addresses"] },
        ],
      };
    case "connected-app":
      return {
        title: "Connected Apps",
        columns: ["Name", "Data Types", "IDP Status", "Vendor", "Category", "Permissions", "Users"],
        rows: [
          { Name: "Support Copilot", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read/Write", Users: "—", "Data Types": ["Personal Names", "Email Addresses", "Telephone Numbers"], "IDP Status": "Active" },
          { Name: "Code Reviewer", Vendor: "Anthropic", Category: "AI Agent", Permissions: "Read Only", Users: "—", "Data Types": ["Source Code", "API Keys", "Private Keys"], "IDP Status": "Active" },
          { Name: "Data Classifier", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read/Write", Users: "—", "Data Types": ["Personal Names", "Social Security Numbers", "Healthcare IDs", "Financial IDs"], "IDP Status": "Active" },
          { Name: "Email Drafter", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read Only", Users: "—", "Data Types": ["Personal Names", "Email Addresses", "Company Names"], "IDP Status": "Suspended" },
          { Name: "Log Analyzer", Vendor: "Mistral AI", Category: "AI Agent", Permissions: "Read Only", Users: "—", "Data Types": ["IP Addresses", "Domain Names", "Secrets and Tokens"], "IDP Status": "Active" },
          { Name: "Meeting Summarizer", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read Only", Users: "—", "Data Types": ["Personal Names", "Email Addresses"], "IDP Status": "Active" },
          { Name: "Threat Scanner", Vendor: "Anthropic", Category: "AI Agent", Permissions: "Read Only", Users: "—", "Data Types": ["IP Addresses", "Secrets and Tokens", "API Keys", "Private Keys"], "IDP Status": "Active" },
          { Name: "Doc Generator", Vendor: "OpenAI", Category: "AI Agent", Permissions: "Read/Write", Users: "—", "Data Types": ["Personal Names", "Company Names", "Postal Addresses"], "IDP Status": "Deactivated" },
          { Name: "Slack", Vendor: "Salesforce", Category: "Communication", Permissions: "Read/Write", Users: "340", "Data Types": ["Personal Names", "Email Addresses", "Company Names"], "IDP Status": "Active" },
          { Name: "Notion", Vendor: "Notion Labs", Category: "Productivity", Permissions: "Read/Write", Users: "285", "Data Types": ["Personal Names", "Email Addresses", "IP Addresses"], "IDP Status": "Active" },
          { Name: "Figma", Vendor: "Figma Inc.", Category: "Design", Permissions: "Read Only", Users: "92", "Data Types": ["Personal Names", "Email Addresses"], "IDP Status": "Active" },
          { Name: "Jira", Vendor: "Atlassian", Category: "Project Mgmt", Permissions: "Admin", Users: "210", "Data Types": ["Personal Names", "Email Addresses", "IP Addresses", "Domain Names"], "IDP Status": "Active" },
          { Name: "Salesforce CRM", Vendor: "Salesforce", Category: "CRM", Permissions: "Read/Write", Users: "175", "Data Types": ["Personal Names", "Email Addresses", "Telephone Numbers", "Company Names", "Financial IDs"], "IDP Status": "Active" },
          { Name: "Zoom", Vendor: "Zoom Video", Category: "Communication", Permissions: "Read Only", Users: "410", "Data Types": ["Personal Names", "Email Addresses"], "IDP Status": "Active" },
          { Name: "HubSpot", Vendor: "HubSpot Inc.", Category: "Marketing", Permissions: "Read/Write", Users: "65", "Data Types": ["Personal Names", "Email Addresses", "Telephone Numbers", "Company Names"], "IDP Status": "Active" },
          { Name: "Datadog", Vendor: "Datadog Inc.", Category: "Monitoring", Permissions: "Admin", Users: "28", "Data Types": ["IP Addresses", "Domain Names", "Secrets and Tokens"], "IDP Status": "Suspended" },
          { Name: "Snowflake", Vendor: "Snowflake Inc.", Category: "Data Warehouse", Permissions: "Read/Write", Users: "42", "Data Types": ["Personal Names", "Financial IDs", "Healthcare IDs", "Social Security Numbers"], "IDP Status": "Active" },
          { Name: "GitHub", Vendor: "Microsoft", Category: "Development", Permissions: "Admin", Users: "188", "Data Types": ["Source Code", "API Keys", "Private Keys", "Secrets and Tokens"], "IDP Status": "Active" },
          { Name: "DocuSign", Vendor: "DocuSign Inc.", Category: "Document Mgmt", Permissions: "Read/Write", Users: "130", "Data Types": ["Personal Names", "Social Security Numbers", "Taxpayer IDs", "Company Names"], "IDP Status": "Active" },
          { Name: "Okta", Vendor: "Okta Inc.", Category: "Identity", Permissions: "Admin", Users: "350", "Data Types": ["Personal Names", "Email Addresses", "IP Addresses"], "IDP Status": "Active" },
        ],
      };
    default:
      return { title: "", columns: [], rows: [] };
  }
}

// ── Generic comparator for identity table dynamic columns ────────────────────

function compareIdentityValues(a: string, b: string): number {
  // Try numeric comparison first
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

  // Try date comparison (patterns like "2026-02-23 09:14am")
  const dateA = Date.parse(a.replace(/(am|pm)/i, " $1"));
  const dateB = Date.parse(b.replace(/(am|pm)/i, " $1"));
  if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;

  // Fallback to string comparison
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

// ── Risk helpers (mirrors RiskPage logic without recharts) ────────────────────

const IDENTITY_DATA_TYPE_CATEGORY: Partial<Record<string, string>> = {};
const IC_CAT_TYPES: [string, string[]][] = [
  ["PII",  ["Personal Names","Email Addresses","Telephone Numbers","Postal Addresses","Birthdates","Gender","Age","IP Addresses","MAC Addresses","Domain Names","URI Hosts","UUIDs"]],
  ["SPII", ["Social Security Numbers","Driver Licenses","National IDs","Passports","Taxpayer IDs"]],
  ["PSI",  ["Ethnicity and Race","Marital Status","Religious Beliefs","Political Opinions","Sexual Orientation"]],
  ["PCI",  ["Payment Cards"]],
  ["PFI",  ["Bank Account Information","Financial IDs","Tax Records","Credit Scores"]],
  ["PHI",  ["Medical Records","Medical Diagnoses","Healthcare IDs","Healthcare Provider IDs","Biometric Data"]],
  ["PAI",  ["Passwords","Private Keys","Secrets and Tokens","MFA Seeds"]],
  ["BII",  ["Source Code","Company Names","Trade Secrets"]],
];
for (const [cat, types] of IC_CAT_TYPES) {
  for (const t of types) IDENTITY_DATA_TYPE_CATEGORY[t] = cat;
}

const IC_CAT_WEIGHT: Record<string, number> = {
  SPII: 10, PHI: 9, PCI: 9, PFI: 8, PAI: 8, PSI: 7, PII: 5, BII: 4,
};
const IC_CAT_COLOR: Record<string, string> = {
  SPII: "#e05252", PHI: "#f59e0b", PCI: "#f97316", PFI: "#d4952a",
  PAI: "#7c6fb0",  PSI: "#0ea5e9", PII: "#0ea584", BII: "#64748b",
};
const IC_PLATFORM_LABEL: Record<string, string> = {
  "google-drive": "Google Drive", "sharepoint": "SharePoint",
  "aws-s3": "AWS S3", "azure-blob": "Azure Blob",
  "postgresql": "PostgreSQL", "oracle": "Oracle DB",
  "aws-rds": "AWS RDS", "azure-sql": "Azure SQL",
};

function getStoreRisk(storeId: string) {
  const store = DATA_STORES.find((s) => s.id === storeId);
  if (!store) return { name: storeId, riskScore: 0, topCat: null, platform: "" };
  const cats = new Set<string>();
  for (const dt of store.dataTypes) {
    const c = IDENTITY_DATA_TYPE_CATEGORY[dt];
    if (c) cats.add(c);
  }
  const catArr = [...cats];
  const weightSum = catArr.reduce((s, c) => s + (IC_CAT_WEIGHT[c] ?? 0), 0);
  const riskScore = Math.min(100, Math.round((weightSum / 45) * 100));
  const topCat = catArr.sort((a, b) => (IC_CAT_WEIGHT[b] ?? 0) - (IC_CAT_WEIGHT[a] ?? 0))[0] ?? null;
  return { name: store.name, riskScore, topCat, platform: store.platform, dataTypes: store.dataTypes };
}

function getRiskLevelStr(score: number) {
  if (score >= 80) return "Critical";
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

const IC_RISK_COLOR: Record<string, string> = {
  Critical: "#e05252", High: "#f97316", Medium: "#f59e0b", Low: "#22c55e",
};

// ── IdentityDetailPanel tabs ──────────────────────────────────────────────────

type IdentityPanelTab = "overview" | "data-stores";

const IDENTITY_PANEL_TABS: { id: IdentityPanelTab; label: string; icon: typeof Info }[] = [
  { id: "overview",     label: "Overview",                 icon: Info },
  { id: "data-stores",  label: "Data Store / Destination", icon: Database },
];

// ── IdentityDetailPanel ──────────────────────────────────────────────────────

// Deterministic UCI score from a name string — matches the chart calculation in the overview tab
function computeUciScore(name: string): number {
  const seed = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = (i: number) => { const x = Math.sin(seed * 9301 + i * 49297 + 233) * 10000; return x - Math.floor(x); };
  const baseScore = 40 + Math.round(rng(0) * 45);
  let prev = baseScore;
  for (let i = 0; i < 12; i++) {
    const delta = Math.round((rng(i + 1) - 0.42) * 14);
    prev = Math.min(99, Math.max(10, prev + delta));
  }
  return prev;
}

// Fields stored in row data but hidden from the table columns list
const PANEL_HIDDEN_FIELDS = new Set(["Last Active", "Date Created", "Last Activity Type", "Last Activity Store", "Last Activity File", "Last Permission Change", "Last Permission Change Store", "Linked Account"]);

// Platforms that use local OS/database accounts (not SSO/cloud IAM)
const LOCAL_ACCOUNT_PLATFORMS = new Set(["postgresql", "oracle", "aws-rds", "azure-sql"]);

export function IdentityDetailPanel({
  row,
  navId,
  initialTab = "overview",
  initialDataStoreFilter = "all",
  initialStoreFilter = "",
  onOpenUnmanagedDrillDown,
}: {
  row: Record<string, string | string[] | number>;
  navId: string;
  initialTab?: IdentityPanelTab;
  initialDataStoreFilter?: "all" | "local-account";
  initialStoreFilter?: string;
  onOpenUnmanagedDrillDown?: (appName: string, username: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<IdentityPanelTab>(initialTab);
  const [dsDataTypeFilter,     setDsDataTypeFilter]     = useState<string[]>([]);
  const [dsStoreFilter,        setDsStoreFilter]        = useState<string>(initialStoreFilter);
  const [dsLocalAccountFilter, setDsLocalAccountFilter] = useState(initialDataStoreFilter === "local-account");
  const [dsUnmanagedFilter,    setDsUnmanagedFilter]    = useState<("apps" | "websites")[]>([]);
  const [dsRolesFilter,        setDsRolesFilter]        = useState<string[]>([]);
  const [openDsDropdown,       setOpenDsDropdown]       = useState<"data-type" | "local-account" | "unmanaged" | "roles" | null>(null);
  const [dsTab,                setDsTab]                = useState<"stores" | "destinations">("stores");
  const [mapModalOpen,         setMapModalOpen]         = useState(false);
  const [mapModalField,        setMapModalField]        = useState<string>("");
  const dsDdRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openDsDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dsDdRef.current && !dsDdRef.current.contains(e.target as Node))
        setOpenDsDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDsDropdown]);
  const [pendingActivityFilter, setPendingActivityFilter] = useState<string[]>([]);

  // Match name to registry (try "Name", "Username", first column value)
  const nameKey = String(row["Name"] ?? row["Username"] ?? Object.values(row)[0] ?? "");
  const registryEntry = IDENTITY_REGISTRY.find(
    (i) => i.name === nameKey || i.name.toLowerCase() === nameKey.toLowerCase(),
  );

  const storeDetails = useMemo(() => {
    if (!registryEntry) return [];
    return registryEntry.dataStores.map((sid) => getStoreRisk(sid));
  }, [registryEntry]);

  const exposureScore = useMemo(() => {
    if (storeDetails.length === 0) return 0;
    const max = Math.max(...storeDetails.map((s) => s.riskScore));
    const avg = storeDetails.reduce((s, d) => s + d.riskScore, 0) / storeDetails.length;
    return Math.round(max * 0.6 + avg * 0.4);
  }, [storeDetails]);

  const riskLevel = getRiskLevelStr(exposureScore);
  const riskColor = IC_RISK_COLOR[riskLevel];

  // Collect all data types
  const activityDataTypes = useMemo(
    () => Array.from(new Set(storeDetails.flatMap((sd) => sd.dataTypes ?? []))),
    [storeDetails],
  );
  const activityStoreNames = useMemo(
    () => storeDetails.map((sd) => sd.name),
    [storeDetails],
  );

  return (
    <>
    <div className="flex flex-row h-full" style={{ background: "var(--color-background)" }}>
      {/* ── Tab bar ── */}
      <div className="shrink-0 flex flex-col gap-0 py-2 border-r border-border w-[200px]" style={{ background: "var(--color-background)" }}>
        {IDENTITY_PANEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 w-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-text-bright"
              }`}
              style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-primary rounded-full" />
              )}
              <Icon size={13} className="shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ background: "var(--color-background)" }}>
        {activeTab === "overview" ? (
          <div className="h-full overflow-y-auto">
            <div className="px-5 py-4 space-y-4">

              {/* Key-value pairs */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
                <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600 }}>Basic Information</div>
                {navId === "internal-user" ? (
                  /* ── 2-column layout for internal users (6 fields, 3 rows each) ── */
                  <div className="relative">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div className="grid grid-cols-2 gap-x-0">
                      {/* Col 1: Name, Email, Group */}
                      <div className="pr-4">
                        <div className="flex items-start justify-between gap-2 py-1.5">
                          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>Name</span>
                          <span className="text-text-bright text-right" style={{ fontSize: "11px", wordBreak: "break-all" }}>{row["Name"]}</span>
                        </div>
                        <div className="flex items-start justify-between gap-2 py-1.5">
                          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>Email</span>
                          <span className="text-text-bright text-right" style={{ fontSize: "11px", wordBreak: "break-all" }}>{row["Email"]}</span>
                        </div>
                        <div className="flex items-start justify-between gap-2 py-1.5">
                          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>Group</span>
                          <span className="text-text-bright text-right" style={{ fontSize: "11px", wordBreak: "break-all" }}>{row["Group"]}</span>
                        </div>
                      </div>
                      {/* Col 2: Org Unit, IDP Status */}
                      <div className="pl-4">
                        <div className="flex items-start justify-between gap-2 py-1.5">
                          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>Org Unit</span>
                          <span className="text-text-bright text-right" style={{ fontSize: "11px", wordBreak: "break-all" }}>{row["Org Unit"]}</span>
                        </div>
                        <div className="flex items-start justify-between gap-2 py-1.5">
                          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>IDP Status</span>
                          <span className="text-text-bright text-right" style={{ fontSize: "11px" }}>{row["IDP Status"]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── 2-column layout for all other identity types ── */
                  (() => {
                    type FieldItem = { kind: "field"; key: string; val: string };
                    const items: FieldItem[] = [];
                    for (const [key, val] of Object.entries(row).filter(([k]) => !PANEL_HIDDEN_FIELDS.has(k) && k !== "Data Types")) {
                      items.push({ kind: "field", key, val: String(val) });
                    }
                    const mid = Math.ceil(items.length / 2);
                    const leftItems = items.slice(0, mid);
                    const rightItems = items.slice(mid);
                    const renderItem = (item: FieldItem) => {
                      const { key, val } = item;
                      return (
                        <div key={key} className="flex items-start justify-between gap-2 py-1.5">
                          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>{key}</span>
                          <span className="text-text-bright text-right flex items-center gap-1.5 justify-end flex-wrap" style={{ fontSize: "11px", wordBreak: "break-all" }}>
                            {val && val.trim() !== "" ? val : "-"}
                          </span>
                        </div>
                      );
                    };
                    return (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                        <div className="grid grid-cols-2 gap-x-0">
                          <div className="pr-4">{leftItems.map((item) => renderItem(item))}</div>
                          <div className="pl-4">{rightItems.map((item) => renderItem(item))}</div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* ── UCI Confidence Score trend (internal + external users) ── */}
              {(navId === "internal-user" || navId === "external-user") && (() => {
                // Seeded deterministic 12-week trend based on name
                const seed = nameKey.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                const rng = (i: number) => {
                  const x = Math.sin(seed * 9301 + i * 49297 + 233) * 10000;
                  return x - Math.floor(x);
                };
                const baseScore = 40 + Math.round(rng(0) * 45); // 40–85 base
                const weeks = ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"];
                let prev = baseScore;
                const trendData = weeks.map((week, i) => {
                  const delta = Math.round((rng(i + 1) - 0.42) * 14);
                  prev = Math.min(99, Math.max(10, prev + delta));
                  return { idx: i, week, score: prev };
                });
                const current = trendData[trendData.length - 1].score;
                const first = trendData[0].score;
                const change = current - first;
                const isUp = change >= 0;
                const trendColor = current >= 70 ? "#22c55e" : current >= 45 ? "#f59e0b" : "#ef4444";
                return (
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600 }}>UCI Confidence Score</div>
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums" style={{ fontSize: "18px", fontWeight: 700, color: trendColor, lineHeight: 1 }}>{current}</span>
                        <div className="flex flex-col gap-0">
                          <span style={{ fontSize: "10px", color: isUp ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                            {isUp ? "▲" : "▼"} {Math.abs(change)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Subtext */}
                    <div className="text-muted-foreground/70 mb-2.5" style={{ fontSize: "10px" }}>
                      12-week identity behaviour confidence trend
                    </div>
                    {/* Chart */}
                    <div style={{ height: 72 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 4, right: 2, left: -32, bottom: 0 }}>
                          <XAxis
                            dataKey="idx"
                            tick={{ fill: "var(--color-muted-foreground)", fontSize: 8, textAnchor: "start" }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            tickFormatter={(idx: number) => trendData[idx]?.week ?? ""}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "var(--color-muted-foreground)", fontSize: 8, textAnchor: "end" }}
                            tickLine={false}
                            axisLine={false}
                            ticks={[0, 50, 100]}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--color-surface-raised)",
                              border: "1px solid var(--color-border)",
                              borderRadius: 6,
                              padding: "4px 8px",
                            }}
                            labelStyle={{ color: "var(--color-muted-foreground)", fontSize: 9 }}
                            itemStyle={{ color: trendColor, fontSize: 10, fontWeight: 600 }}
                            formatter={(v: number) => [`${v}`, "Score"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke={trendColor}
                            strokeWidth={1.5}
                            fill={trendColor}
                            fillOpacity={0.12}
                            dot={false}
                            activeDot={{ r: 3, fill: trendColor, strokeWidth: 0 }}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Threshold legend */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {[{ label: "High ≥ 70", color: "#22c55e" }, { label: "Med 45–69", color: "#f59e0b" }, { label: "Low < 45", color: "#ef4444" }].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-muted-foreground/70" style={{ fontSize: "10px" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


            </div>
          </div>
        ) : activeTab === "data-stores" ? (
          (() => {
            const strHash = (s: string) => s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
            const ACCESS_LEVELS = ["Read", "Read/Write", "Admin"] as const;
            const ENTITY_TYPE_POOL = ["SSN", "Name", "Address", "Email", "Phone", "DOB", "Card #", "Bank Acct", "Passport", "IP Addr"];
            const getStoreMeta = (userName: string, storeName: string) => {
              const h = strHash(userName + storeName);
              const level = ACCESS_LEVELS[h % 3];
              const isStale = h % 7 === 0;
              const months = 6 + (h % 18);
              const d = new Date(2026, 2, 20);
              d.setMonth(d.getMonth() - months);
              const grantedAt = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const etCount = 2 + (h % 3);
              const usedIdxs = new Set<number>();
              const entityTypes: string[] = [];
              for (let i = 0; entityTypes.length < etCount && i < 30; i++) {
                const idx = (h + i * 7) % ENTITY_TYPE_POOL.length;
                if (!usedIdxs.has(idx)) { usedIdxs.add(idx); entityTypes.push(ENTITY_TYPE_POOL[idx]); }
              }
              return { level, isStale, grantedAt, entityTypes };
            };
            const getPlatformIcon = (platform: string) => {
              if (platform === "google-drive" || platform === "sharepoint") return HardDrive;
              if (platform === "aws-s3" || platform === "azure-blob") return Cloud;
              if (platform === "endpoint") return Monitor;
              return Server;
            };
            const ACCESS_LEVEL_COLOR: Record<string, string> = {
              Read: "#0ea5e9", "Read/Write": "#f59e0b", Admin: "#e05252",
            };
            type UnmanagedEntry = { name: string; destType: "Application" | "Website"; status?: string; events: number; lastVisit: string; entityTypes: string[] };
            const USER_UNMANAGED: Record<string, UnmanagedEntry[]> = {
              "Alice Chen": [
                { name: "Dropbox", destType: "Application", status: "Unsanctioned", events: 47, lastVisit: "Feb 22, 2026", entityTypes: ["SSN", "Address"] },
                { name: "personal-cloud.example.com", destType: "Website", events: 12, lastVisit: "Feb 18, 2026", entityTypes: ["Email", "Phone"] },
              ],
              "Brian Kowalski": [
                { name: "Slack", destType: "Application", status: "Sanctioned", events: 89, lastVisit: "Feb 23, 2026", entityTypes: ["Name", "SSN", "DOB"] },
                { name: "file-share.example.net", destType: "Website", events: 31, lastVisit: "Feb 19, 2026", entityTypes: ["Card #", "Bank Acct"] },
              ],
              "Diana Reyes": [
                { name: "Trello", destType: "Application", status: "Under Review", events: 23, lastVisit: "Feb 21, 2026", entityTypes: ["Address", "Email"] },
                { name: "personal-cloud.example.com", destType: "Website", events: 8, lastVisit: "Feb 15, 2026", entityTypes: ["Phone"] },
              ],
              "Marcus Webb": [
                { name: "Dropbox", destType: "Application", status: "Unsanctioned", events: 61, lastVisit: "Feb 22, 2026", entityTypes: ["SSN", "Name", "Card #"] },
              ],
              "Sophie Laurent": [
                { name: "Slack", destType: "Application", status: "Sanctioned", events: 34, lastVisit: "Feb 20, 2026", entityTypes: ["Email", "Address"] },
              ],
              "Tom Nguyen": [
                { name: "file-share.example.net", destType: "Website", events: 19, lastVisit: "Feb 17, 2026", entityTypes: ["Bank Acct", "Passport"] },
              ],
              "James Thornton": [
                { name: "Dropbox", destType: "Application", status: "Unsanctioned", events: 67, lastVisit: "Feb 21, 2026", entityTypes: ["SSN", "Name", "Address"] },
                { name: "file-share.example.net", destType: "Website", events: 18, lastVisit: "Feb 17, 2026", entityTypes: ["Phone", "Email"] },
              ],
              "Priya Nair": [
                { name: "personal-cloud.example.com", destType: "Website", events: 34, lastVisit: "Feb 20, 2026", entityTypes: ["DOB", "IP Addr"] },
                { name: "Slack", destType: "Application", status: "Sanctioned", events: 112, lastVisit: "Feb 22, 2026", entityTypes: ["Name", "SSN", "Email"] },
              ],
              "Carlos Medina": [
                { name: "Dropbox", destType: "Application", status: "Unsanctioned", events: 28, lastVisit: "Feb 18, 2026", entityTypes: ["Card #", "Address"] },
              ],
            };
            const unmanagedEntries: UnmanagedEntry[] = USER_UNMANAGED[nameKey] ?? [];

            // Derive all entity types and roles present across this identity's stores
            const ALL_ROLES_POOL = ["Data Analyst", "Read-Only User", "DB Admin", "Data Engineer", "Analyst", "Viewer", "Schema Owner", "BI Developer"];
            const allEntityTypes = Array.from(new Set(storeDetails.flatMap(sd => getStoreMeta(nameKey, sd.name).entityTypes)));
            const allRoles = Array.from(new Set(storeDetails.flatMap(sd => {
              const permHash = strHash(sd.name + nameKey + "perm");
              const roleCount = 2 + (permHash % 5);
              return Array.from({ length: Math.min(roleCount, ALL_ROLES_POOL.length) }, (_, i) => ALL_ROLES_POOL[(permHash + i) % ALL_ROLES_POOL.length]);
            })));
            // Apply filters (AND logic across categories; empty category = no restriction)
            const visibleStores = storeDetails.filter(sd => {
              if (dsStoreFilter && sd.name !== dsStoreFilter) return false;
              if (dsLocalAccountFilter && !LOCAL_ACCOUNT_PLATFORMS.has(sd.platform ?? "")) return false;
              if (dsDataTypeFilter.length > 0) {
                const meta = getStoreMeta(nameKey, sd.name);
                if (!dsDataTypeFilter.some(t => meta.entityTypes.includes(t))) return false;
              }
              if (dsRolesFilter.length > 0) {
                const permHash = strHash(sd.name + nameKey + "perm");
                const roles = Array.from({ length: Math.min(2 + (permHash % 5), ALL_ROLES_POOL.length) }, (_, i) => ALL_ROLES_POOL[(permHash + i) % ALL_ROLES_POOL.length]);
                if (!dsRolesFilter.some(r => roles.includes(r))) return false;
              }
              return true;
            });
            const visibleUnmanaged = dsUnmanagedFilter.length === 0 ? unmanagedEntries : unmanagedEntries.filter(e => {
              if (dsUnmanagedFilter.includes("apps")     && e.destType === "Application") return true;
              if (dsUnmanagedFilter.includes("websites") && e.destType === "Website")     return true;
              return false;
            });

            return (
              <div className="h-full overflow-y-auto" style={{ background: "var(--color-background)" }}>
                {/* ── Sticky filter + count header ── */}
                <div className="sticky top-0 z-20 border-b border-border/40 px-5 pt-4 pb-3" style={{ background: "var(--color-background)" }}>
                  {/* ── Filter chips ── */}
                  <div ref={dsDdRef} className="relative mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">

                      {/* Data Store pill */}
                      {dsStoreFilter ? (
                        <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                          <button type="button" onClick={() => {}}
                            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary"
                            style={{ fontSize: "10px", fontWeight: 500 }}>
                            <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                            Data Store
                            <span className="text-primary/50 mx-0.5">|</span>
                            <span className="truncate max-w-[100px]">{dsStoreFilter}</span>
                          </button>
                          <button type="button" onClick={() => setDsStoreFilter("")}
                            className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                            <X size={9} />
                          </button>
                        </div>
                      ) : null}

                      {/* Data Type pill */}
                      {dsDataTypeFilter.length > 0 ? (
                        <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                          <button type="button" onClick={() => setOpenDsDropdown(p => p === "data-type" ? null : "data-type")}
                            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                            style={{ fontSize: "10px", fontWeight: 500 }}>
                            <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                            Data Type
                            <span className="text-primary/50 mx-0.5">|</span>
                            <span className="truncate max-w-[80px]">{dsDataTypeFilter.length === 1 ? dsDataTypeFilter[0] : `${dsDataTypeFilter.length} selected`}</span>
                            <ChevronDown size={9} className="ml-0.5 opacity-60" />
                          </button>
                          <button type="button" onClick={() => { setDsDataTypeFilter([]); setOpenDsDropdown(null); }}
                            className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                            <X size={9} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setOpenDsDropdown(p => p === "data-type" ? null : "data-type")}
                          className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${openDsDropdown === "data-type" ? "border-primary/40 text-primary bg-primary/10" : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"}`}
                          style={{ fontSize: "10px", fontWeight: 400 }}>
                          <Plus size={9} />
                          Data Type
                        </button>
                      )}

                      {/* Linked Account pill */}
                      {dsLocalAccountFilter ? (
                        <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                          <button type="button" onClick={() => setOpenDsDropdown(p => p === "local-account" ? null : "local-account")}
                            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                            style={{ fontSize: "10px", fontWeight: 500 }}>
                            <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                            Linked Account
                            <ChevronDown size={9} className="ml-0.5 opacity-60" />
                          </button>
                          <button type="button" onClick={() => { setDsLocalAccountFilter(false); setOpenDsDropdown(null); }}
                            className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                            <X size={9} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setOpenDsDropdown(p => p === "local-account" ? null : "local-account")}
                          className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${openDsDropdown === "local-account" ? "border-primary/40 text-primary bg-primary/10" : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"}`}
                          style={{ fontSize: "10px", fontWeight: 400 }}>
                          <Plus size={9} />
                          Linked Account
                        </button>
                      )}

                      {/* Unmanaged Destination pill */}
                      {dsUnmanagedFilter.length > 0 ? (
                        <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                          <button type="button" onClick={() => setOpenDsDropdown(p => p === "unmanaged" ? null : "unmanaged")}
                            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                            style={{ fontSize: "10px", fontWeight: 500 }}>
                            <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                            Unmanaged Destination
                            <span className="text-primary/50 mx-0.5">|</span>
                            <span className="truncate max-w-[72px]">{dsUnmanagedFilter.length === 2 ? "Both" : dsUnmanagedFilter[0] === "apps" ? "Apps" : "Websites"}</span>
                            <ChevronDown size={9} className="ml-0.5 opacity-60" />
                          </button>
                          <button type="button" onClick={() => { setDsUnmanagedFilter([]); setOpenDsDropdown(null); }}
                            className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                            <X size={9} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setOpenDsDropdown(p => p === "unmanaged" ? null : "unmanaged")}
                          className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${openDsDropdown === "unmanaged" ? "border-primary/40 text-primary bg-primary/10" : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"}`}
                          style={{ fontSize: "10px", fontWeight: 400 }}>
                          <Plus size={9} />
                          Unmanaged Destination
                        </button>
                      )}

                      {/* Roles pill */}
                      {dsRolesFilter.length > 0 ? (
                        <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                          <button type="button" onClick={() => setOpenDsDropdown(p => p === "roles" ? null : "roles")}
                            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                            style={{ fontSize: "10px", fontWeight: 500 }}>
                            <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                            Roles
                            <span className="text-primary/50 mx-0.5">|</span>
                            <span className="truncate max-w-[80px]">{dsRolesFilter.length === 1 ? dsRolesFilter[0] : `${dsRolesFilter.length} selected`}</span>
                            <ChevronDown size={9} className="ml-0.5 opacity-60" />
                          </button>
                          <button type="button" onClick={() => { setDsRolesFilter([]); setOpenDsDropdown(null); }}
                            className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                            <X size={9} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setOpenDsDropdown(p => p === "roles" ? null : "roles")}
                          className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${openDsDropdown === "roles" ? "border-primary/40 text-primary bg-primary/10" : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"}`}
                          style={{ fontSize: "10px", fontWeight: 400 }}>
                          <Plus size={9} />
                          Roles
                        </button>
                      )}
                    </div>

                    {/* Data Type dropdown */}
                    {openDsDropdown === "data-type" && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="px-4 pt-2 pb-2 border-b border-border">
                          <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {allEntityTypes.map(t => (
                            <label key={t} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                              <input type="checkbox" checked={dsDataTypeFilter.includes(t)}
                                onChange={() => setDsDataTypeFilter(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                              <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{t}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Linked Account dropdown */}
                    {openDsDropdown === "local-account" && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="px-4 pt-2 pb-2 border-b border-border">
                          <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Access Type</span>
                        </div>
                        <div className="py-1">
                          <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                            <input type="checkbox" checked={dsLocalAccountFilter}
                              onChange={() => setDsLocalAccountFilter(p => !p)}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                            <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>Linked Account only</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Unmanaged Destination dropdown */}
                    {openDsDropdown === "unmanaged" && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="px-4 pt-2 pb-2 border-b border-border">
                          <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Unmanaged Destinations</span>
                        </div>
                        <div className="py-1">
                          <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                            <input type="checkbox" checked={dsUnmanagedFilter.includes("apps")}
                              onChange={() => setDsUnmanagedFilter(p => p.includes("apps") ? p.filter(x => x !== "apps") : [...p, "apps"])}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                            <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>Unmanaged Apps</span>
                          </label>
                          <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                            <input type="checkbox" checked={dsUnmanagedFilter.includes("websites")}
                              onChange={() => setDsUnmanagedFilter(p => p.includes("websites") ? p.filter(x => x !== "websites") : [...p, "websites"])}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                            <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>Unmanaged Websites</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Roles dropdown */}
                    {openDsDropdown === "roles" && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="px-4 pt-2 pb-2 border-b border-border">
                          <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Role</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {allRoles.map(r => (
                            <label key={r} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                              <input type="checkbox" checked={dsRolesFilter.includes(r)}
                                onChange={() => setDsRolesFilter(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r])}
                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                              <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{r}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Tab switcher ── */}
                  <div className="flex items-center gap-0 pt-2 border-b border-border/40 -mx-5 px-5">
                    {(["stores", "destinations"] as const).map((tab) => {
                      const count = tab === "stores"
                        ? ((dsStoreFilter && visibleStores.length === 0)
                            ? (DATA_STORES.find(ds => ds.name === dsStoreFilter) ? 1 : 0)
                            : visibleStores.length)
                        : visibleUnmanaged.length;
                      const label = tab === "stores"
                        ? `${count} data store${count !== 1 ? "s" : ""}`
                        : `${count} destination${count !== 1 ? "s" : ""}`;
                      const active = dsTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setDsTab(tab)}
                          className="relative flex items-center gap-1.5 px-3 pb-2 transition-colors"
                          style={{ fontSize: "11px", fontWeight: active ? 600 : 400, color: active ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
                        >
                          {tab === "stores"
                            ? <Database size={10} style={{ opacity: active ? 1 : 0.5 }} />
                            : <Globe size={10} style={{ opacity: active ? 1 : 0.5 }} />
                          }
                          {tab === "stores"
                            ? `${count} Managed Data Store${count !== 1 ? "s" : ""}`
                            : `${count} Unmanaged Destination${count !== 1 ? "s" : ""}`
                          }
                          {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Scrollable content ── */}
                <div className="px-5 py-3">
                  {(() => {
                    // When dsStoreFilter is set but the identity's registry doesn't include
                    // that store, synthesise a card directly from DATA_STORES.
                    const effectiveStoresAll = (dsStoreFilter && visibleStores.length === 0)
                      ? (() => {
                          const s = DATA_STORES.find(ds => ds.name === dsStoreFilter);
                          return s ? [getStoreRisk(s.id)] : [];
                        })()
                      : visibleStores;
                    const effectiveStores = navId === "unmapped-local-user"
                      ? effectiveStoresAll.slice(0, 1)
                      : effectiveStoresAll;
                    return (
                    <>
                  {dsTab === "stores" && effectiveStores.length === 0 ? (
                    <div className="text-muted-foreground bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-3" style={{ fontSize: "11px" }}>
                      {dsLocalAccountFilter && !dsDataTypeFilter.length && !dsRolesFilter.length
                        ? "No linked account access found across data stores."
                        : "No data stores match the current filters."}
                    </div>
                  ) : dsTab === "destinations" && visibleUnmanaged.length === 0 ? (
                    <div className="text-muted-foreground bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-3" style={{ fontSize: "11px" }}>
                      {dsUnmanagedFilter.length
                        ? "No unmanaged destinations match the current filters."
                        : "No unmanaged destination activity on record."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* ── Data Store cards ── */}
                      {dsTab === "stores" && effectiveStores.map((sd) => {
                        const meta = getStoreMeta(nameKey, sd.name);
                        const PlatformIcon = getPlatformIcon(sd.platform ?? "");
                        const levelColor = ACCESS_LEVEL_COLOR[meta.level];
                        const h2 = strHash(sd.name + nameKey + "act");
                        const actDaysAgo = 1 + (h2 % 14);
                        const actDate = new Date(2026, 2, 20);
                        actDate.setDate(actDate.getDate() - actDaysAgo);
                        const actDateStr = actDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        return (
                          <div key={sd.name} className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                              {sd.platform === "google-drive"
                                ? <span style={{ width: 14, height: 14, flexShrink: 0, display: "inline-block" }}><LightBgGDrive /></span>
                                : <PlatformIcon size={14} style={{ color: sd.topCat ? IC_CAT_COLOR[sd.topCat] : "#64748b", flexShrink: 0 }} />}
                              <span className="text-text-bright flex-1 truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{sd.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {meta.isStale && (
                                  <span className="px-1.5 py-0.5 rounded text-pink-400" style={{ fontSize: "11px", fontWeight: 400, background: "rgb(236 72 153 / 0.1)", border: "1px solid rgb(236 72 153 / 0.25)", letterSpacing: "0.04em" }}>STALE</span>
                                )}
                                <span className="text-muted-foreground/70 px-1.5 py-0.5 bg-surface rounded" style={{ fontSize: "10px" }}>
                                  {IC_PLATFORM_LABEL[sd.platform ?? ""] ?? sd.platform}
                                </span>
                              </div>
                            </div>
                            {(() => {
                              const permHash = strHash(sd.name + nameKey + "perm");
                              const ALL_ROLES = ["Data Analyst", "Read-Only User", "DB Admin", "Data Engineer", "Analyst", "Viewer", "Schema Owner", "BI Developer"];
                              const roleCount = 2 + (permHash % 5); // 2–6 roles
                              const roles = Array.from({ length: Math.min(roleCount, ALL_ROLES.length) }, (_, i) => ALL_ROLES[(permHash + i) % ALL_ROLES.length]);
                              const visibleRoles = roles.slice(0, 3);
                              const hiddenRoles = roles.slice(3);
                              const grantHash = strHash(sd.name + nameKey + "grant");
                              const GROUPS = ["Engineering", "Data Team", "Finance", "Security", "Analytics"];
                              const useGroup = grantHash % 3 !== 0;
                              const inheritedFrom = useGroup ? GROUPS[grantHash % GROUPS.length] : null;
                              const unameHash = strHash(sd.name + nameKey + "uname");
                              const nameParts = nameKey.split(" ");
                              const first = (nameParts[0] ?? "user").toLowerCase();
                              const last = (nameParts[nameParts.length - 1] ?? "").toLowerCase();
                              const unameFormats = [
                                `${first}.${last}`,
                                `${first[0]}.${last}`,
                                `${first}_${last}`,
                                `${last}.${first[0]}`,
                                `${first[0]}${last}`,
                                `${first}.${last}${(unameHash % 90) + 10}`,
                              ];
                              const datastoreUsername = unameFormats[unameHash % unameFormats.length];
                              return (
                                <div>
                                  <div className="px-3 pt-2.5 pb-2">

                                    {/* ── 2-col grid: left = Username + Data Type | right = Direct Group + Roles ── */}
                                    <div className="grid grid-cols-2 gap-x-4 mb-2.5">

                                      {/* Left column */}
                                      <div className="flex flex-col gap-1.5 min-w-0">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                          <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Username</span>
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-text-bright font-mono truncate" title={datastoreUsername} style={{ fontSize: "11px", fontWeight: 500 }}>{datastoreUsername}</span>
                                            {datastoreUsername !== `${first}.${last}` && navId !== "unmapped-local-user" && (
                                              <span className="shrink-0 text-muted-foreground/50" style={{ fontSize: "10px" }}>Linked account</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                          <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Data type</span>
                                          <div className="flex flex-wrap gap-0.5">
                                            {meta.entityTypes.map(t => (
                                              <span key={t} className="px-1 py-0.5 rounded bg-surface-raised border border-border text-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>{t}</span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right column */}
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Direct group</span>
                                          <span className="text-foreground/90" style={{ fontSize: "9.5px" }}>
                                            {inheritedFrom
                                              ? inheritedFrom
                                              : ["Engineering-All", "Finance-Team", "Security-Group", "Analytics-Team", "IT-Ops-Group"][grantHash % 5]
                                            }
                                          </span>
                                        </div>
                                        {sd.platform !== "google-drive" && sd.platform !== "sharepoint" && (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Roles</span>
                                          <div className="flex items-center flex-wrap" style={{ gap: "0px" }}>
                                            {visibleRoles.map((r, i) => (
                                              <span
                                                key={r}
                                                className="text-foreground/90"
                                                style={{ fontSize: "10px" }}
                                              >{r}{(i < visibleRoles.length - 1 || hiddenRoles.length > 0) ? ", " : ""}</span>
                                            ))}
                                            {hiddenRoles.length > 0 && (
                                              <span className="relative group/tooltip inline-flex items-center">
                                                <span className="cursor-pointer underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground" style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8" }}>
                                                  +{hiddenRoles.length}
                                                </span>
                                                <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tooltip:flex flex-col gap-0.5 px-2 py-1.5 rounded shadow-lg z-50 pointer-events-none whitespace-nowrap" style={{ background: "var(--color-surface-overlay, #1e293b)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                                  {hiddenRoles.map((r) => (
                                                    <span key={r} className="text-white" style={{ fontSize: "10px" }}>{r}</span>
                                                  ))}
                                                  <div className="absolute top-full left-3 w-0 h-0" style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid var(--color-surface-overlay, #1e293b)" }} />
                                                </div>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        )}
                                      </div>

                                    </div>

                                    {/* ── Footer: Last active ── */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                                      <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "9.5px" }}>Last active</span>
                                      <div className="ml-auto flex items-center gap-1 min-w-0">
                                        <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>{actDateStr}</span>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}

                      {/* ── Unmanaged Destination cards ── */}
                      {dsTab === "destinations" && visibleUnmanaged.map((entry, i) => {
                        const DestIcon = entry.destType === "Website" ? Globe : Monitor;
                        const typeLabel = entry.destType === "Website" ? "Unmanaged Website" : "Unmanaged Application";
                        return (
                          <div key={i} className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                              <DestIcon size={11} style={{ color: "#0ea5e9", flexShrink: 0 }} />
                              <span className="text-text-bright flex-1 truncate" title={entry.name} style={{ fontSize: "11px", fontWeight: 500, fontFamily: entry.destType === "Website" ? "monospace" : undefined }}>{entry.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {entry.status && (
                                  <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                                    {entry.status}
                                  </span>
                                )}
                                <span className="text-muted-foreground/70 px-1.5 py-0.5 bg-surface rounded" style={{ fontSize: "10px" }}>{entry.destType === "Website" ? "Website" : "Application"}</span>
                              </div>
                            </div>
                            <div className="px-3 py-2">
                              <div className="grid grid-cols-2 gap-x-3 mb-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Data Type</span>
                                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                                    {entry.entityTypes.map(t => (
                                      <span key={t} className="px-1 py-0.5 rounded bg-surface-raised border border-border text-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>{t}</span>
                                    ))}
                                  </div>
                                </div>
                                
                              </div>
                              {/* Last sensitive activity row */}
                              {(() => {
                                const seed = entry.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                                const rng = (n: number) => { const x = Math.sin(seed * 9301 + n * 49297 + 233) * 10000; return x - Math.floor(x); };
                                const daysAgo = [1, 3, 5, 7, 10, 14, 21];
                                const days = daysAgo[Math.floor(rng(3) * daysAgo.length)];
                                const d = new Date(2026, 2, 20); d.setDate(d.getDate() - days);
                                const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                return (
                                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "9.5px" }}>Last active</span>
                                    <div className="ml-auto flex items-center gap-1 min-w-0">
                                      <span className="text-muted-foreground/70 shrink-0" style={{ fontSize: "10px" }}>{dateStr}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                    </>
                    );
                  })()}
                </div>
              </div>
            );
          })()
        ) : (
          <IdentityActivityTabContent
            subjectName={nameKey}
            dataTypes={activityDataTypes}
            storeNames={activityStoreNames}
            initialActionFilter={pendingActivityFilter}
            {...(navId === "unknown-identity" ? { restrictedActions: ["upload", "download", "create", "export"] } : {})}
          />
        )}
      </div>
    </div>

    {/* ── Map Identity Modal ── */}

    {mapModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setMapModalOpen(false)}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="relative bg-surface border border-border rounded-xl shadow-2xl w-[360px] p-5 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Map Identity</div>
              <div className="text-muted-foreground mt-0.5" style={{ fontSize: "11px" }}>
                Link <span className="text-text-bright font-mono">{mapModalField}</span> to a known identity
              </div>
            </div>
            <button
              onClick={() => setMapModalOpen(false)}
              className="text-muted-foreground hover:text-text-bright transition-colors rounded p-1 hover:bg-surface-raised"
            >
              <X size={14} />
            </button>
          </div>

          {/* Identity type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>Identity Type</label>
            <select
              className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-text-bright w-full appearance-none"
              style={{ fontSize: "11px" }}
              defaultValue=""
            >
              <option value="" disabled>Select type…</option>
              <option>Internal User</option>
              <option>External User</option>
              <option>Service Account</option>
              <option>Connected App</option>
            </select>
          </div>

          {/* Search / select identity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>Map To</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search identity by name or email…"
                className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-text-bright w-full placeholder:text-muted-foreground/50"
                style={{ fontSize: "11px" }}
              />
            </div>
          </div>

          {/* Confidence note */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
            <span className="text-blue-300" style={{ fontSize: "10px" }}>
              Mapping will link this linked account to the selected identity across all data stores and activity logs.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setMapModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-text-bright hover:border-border/80 transition-colors"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={() => setMapModalOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white transition-colors"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              Save Mapping
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function getSourceIconType(sourceType: string, sourceName: string): string {
  const lower = sourceName.toLowerCase();
  if (lower.includes("openai") || lower.includes("chatgpt")) return "openai";
  if (lower.includes("anthropic") || lower.includes("claude")) return "anthropic";
  if (lower.includes("github")) return "github-copilot";
  if (lower.includes("snowflake")) return "snowflake";
  if (sourceType === "Cloud DB (RDS)") return "s3";
  if (sourceType === "Cloud DB (Azure SQL)") return "azure-sql";
  if (sourceType === "On-Prem DB") {
    if (lower.includes("oracle")) return "oracle";
    return "postgresql";
  }
  if (sourceType === "Endpoint") return "endpoint";
  return "application";
}

function IdentityTable({ navId }: { navId: string }) {
  const config = getIdentityTableConfig(navId);
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  const [initialPanelTab, setInitialPanelTab] = useState<IdentityPanelTab>("overview");
  const [initialDataStoreFilter, setInitialDataStoreFilter] = useState<"all" | "local-account">("all");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const closePanel = useCallback(() => setActiveRowIdx(null), []);
  const [mapModalRow, setMapModalRow] = useState<Record<string, string | string[] | number> | null>(null);
  const [unmanagedDrillDown, setUnmanagedDrillDown] = useState<{ appName: string; username: string } | null>(null);

  const sortColumns = useMemo<SortColumnDef[]>(
    () => config.columns.map((col) => ({ key: col, label: col })),
    [config.columns],
  );

  const sortedRows = useMemo(() => {
    if (!sortConfig) return config.rows;
    const { key, direction } = sortConfig;
    const mul = direction === "asc" ? 1 : -1;
    return [...config.rows].sort((a, b) => {
      if (key === "Entity Data Types") {
        const aLen = Array.isArray(a[key]) ? (a[key] as string[]).length : 0;
        const bLen = Array.isArray(b[key]) ? (b[key] as string[]).length : 0;
        return mul * (aLen - bLen);
      }
      return mul * compareIdentityValues(String(a[key] ?? ""), String(b[key] ?? ""));
    });
  }, [config.rows, sortConfig]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return sortedRows;
    return sortedRows.filter((row) =>
      matchesSearch(
        searchTerm,
        ...Object.values(row).flatMap((v) => (Array.isArray(v) ? v : [String(v)])),
      ),
    );
  }, [sortedRows, searchTerm]);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);
  const pagedRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);

  const activeRow = activeRowIdx !== null ? filteredRows[activeRowIdx] : null;

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      {/* ContentHeader */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-text-bright" style={{ fontSize: "16px", fontWeight: 600 }}>
              {config.title === "Unlinked Local Users" ? "Unlinked" : config.title === "Unknown Identities" ? "Unauthenticated" : config.title}
            </h2>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: "12px" }}>
              {config.rows.length} {config.rows.length === 1 ? "record" : "records"}
              {navId === "unmapped-local-user" && (
                <span className="ml-2 text-text-dim">· The identity with linked account not yet linked to IDP</span>
              )}
            </p>
          </div>
          <div className="shrink-0 mt-0.5 flex items-center gap-2">
            <SortDropdown
              columns={sortColumns}
              sortConfig={sortConfig}
              onSort={setSortConfig}
            />
            <TableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {config.columns.filter((col) => col !== "Linked Status").map((col, _i, arr) => (
              <Fragment key={col}>
                <th
                  className="text-left px-4 py-3 text-muted-foreground"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                >
                  <button
                    className="flex items-center gap-1 hover:text-text-bright transition-colors"
                    onClick={() => setSortConfig(toggleHeaderSort(sortConfig, col))}
                  >
                    {col} <SortIcon columnKey={col} sortConfig={sortConfig} size={12} />
                  </button>
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row, idx) => {
            const globalIdx = (currentPage - 1) * pageSize + idx;
            const isActive = activeRowIdx === globalIdx;
            return (
              <tr
                key={idx}
                className={`border-b border-border transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/5"
                    : "hover:bg-foreground/[0.04]"
                }`}
                style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                onClick={() => {
                  setActiveRowIdx(globalIdx);
                  setInitialPanelTab("overview");
                  setInitialDataStoreFilter("all");
                  setPanelKey((k) => k + 1);
                }}
              >
                {config.columns.filter((col) => col !== "Linked Status").map((col, colIdx, arr) => (
                  <Fragment key={col}>
                  <td
                    className={`px-4 py-3`}
                    style={{ fontSize: "13px", fontWeight: colIdx === 0 ? 500 : 400 }}
                  >
                    {col === "IDP Status" ? (() => {
                        const status = row[col] as string;
                        return (
                          <span className="text-foreground/80" style={{ fontSize: "13px" }}>
                            {status}
                          </span>
                        );
                      })() : col === "Linked Account" ? (
                      (() => {
                        const count = row[col] as number;
                        if (count === 0) {
                          return <span className="text-muted-foreground/50 tabular-nums" style={{ fontSize: "13px" }}>—</span>;
                        }
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRowIdx(globalIdx);
                              setInitialPanelTab("overview");
                              setInitialDataStoreFilter("all");
                              setPanelKey((k) => k + 1);
                            }}
                            className="text-left rounded-md px-1.5 py-1 -mx-1.5 -my-1 hover:bg-primary/10 transition-colors"
                          >
                            <span className="tabular-nums text-primary" style={{ fontSize: "13px", fontWeight: 500 }}>{count}</span>
                          </button>
                        );
                      })()
                    ) : col === "Data Types" && Array.isArray(row[col]) ? (
                      <DataTypeTags types={row[col] as string[]} />
                    ) : col === "Name" && row["Email"] ? (
                      <div className="flex flex-col gap-0.5">
                        <HighlightText
                          text={row[col] as string}
                          query={searchTerm}
                          className="text-primary"
                        />
                        <HighlightText
                          text={row["Email"] as string}
                          query={searchTerm}
                          className="text-foreground/50"
                          style={{ fontSize: "11px", fontWeight: 400 }}
                        />
                      </div>
                    ) : col === "Source" && (navId === "unmapped-local-user" || navId === "service-account" || navId === "agentic-identity") ? (
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
                          <DataStoreIcon
                            storeType={getSourceIconType(row["Source Type"] as string, row[col] as string)}
                            size={14}
                            fallback={row["Source Type"] === "Endpoint" ? "endpoint" : "application"}
                          />
                        </span>
                        <HighlightText
                          text={row[col] as string}
                          query={searchTerm}
                          className="text-foreground"
                        />
                      </div>
                    ) : (
                      <HighlightText
                        text={row[col] as string}
                        query={searchTerm}
                        className={colIdx === 0 ? "text-primary" : "text-foreground"}
                      />
                    )}
                  </td>
                  </Fragment>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <TablePagination currentPage={currentPage} totalRows={filteredRows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />

      {/* ── Per-row side panel ── */}
      <LinkUsernameModal
        open={mapModalRow !== null}
        user={mapModalRow as any}
        onClose={() => setMapModalRow(null)}
        onSave={(_username, _linkedId, _linkedName) => {
          // Future: persist mapping via API or Supabase
          setMapModalRow(null);
        }}
      />

      <SidePanel
        open={activeRow !== null}
        onClose={closePanel}
        title={String(activeRow?.["Name"] ?? activeRow?.[config.columns[0]] ?? "")}
        uciScore={navId === "internal-user" && activeRow ? computeUciScore(String(activeRow["Name"] ?? activeRow[config.columns[0]] ?? "")) : undefined}
        subtitle={IDENTITY_TYPE_LABEL[navId] ?? config.title}
        titleBadge={(() => {
          if (!activeRow) return undefined;
          const origIdx = config.rows.findIndex((r) => r === activeRow);
          const isStale = IDENTITY_STATUS_TAGS[navId]?.[origIdx]?.includes("stale") ?? false;
          if (!isStale) return undefined;
          return (
            <span className="inline-flex items-center px-1.5 py-px rounded text-pink-400" style={{ fontSize: "11px", fontWeight: 400, background: "rgb(236 72 153 / 0.1)", border: "1px solid rgb(236 72 153 / 0.25)" }}>Stale</span>
          );
        })()}
        width="min(840px, 90vw)"
        panelType="identity"
        pushed={unmanagedDrillDown !== null}
        suspended={unmanagedDrillDown !== null}
        pushedRightOffset="min(840px, 90vw)"
      >
        {activeRow && (
          <IdentityDetailPanel
            key={panelKey}
            row={activeRow}
            navId={navId}
            initialTab={initialPanelTab}
            initialDataStoreFilter={initialDataStoreFilter}
            onOpenUnmanagedDrillDown={(appName, username) => setUnmanagedDrillDown({ appName, username })}
          />
        )}
      </SidePanel>

      {/* Stacked unmanaged destination panel */}
      {unmanagedDrillDown && activeRow && (() => {
        const destRow = UNMANAGED_DESTINATIONS.find(d => d.name === unmanagedDrillDown.appName);
        if (!destRow) return null;
        return (
          <SidePanel
            open
            onClose={() => setUnmanagedDrillDown(null)}
            onBack={() => {
              setUnmanagedDrillDown(null);
              setInitialPanelTab("data-stores");
              setPanelKey(k => k + 1);
            }}
            title={destRow.name}
            subtitle={destRow.category}
            width="min(840px, 90vw)"
            zIndex={60}
            hideBackdrop
            stacked
            panelType={destRow.destinationType === "Website" ? "website" : "app"}
          >
            <UnmanagedRowStandalonePanel
              row={destRow}
              showStatus={destRow.destinationType === "Application"}
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}

const SAAS_STORE_IDS = ["drives", "sharepoint-sites"];
const IAAS_STORE_IDS = ["s3", "azure-blob"];
const IAAS_STRUCTURED_STORE_IDS = ["rds", "azure-sql"];
const ONPREM_STRUCTURED_STORE_IDS = ["postgresql", "oracle"];

export function InventoryContent({ selectedNavId }: { selectedNavId: string }) {
  if (selectedNavId === "google-drive") {
    return <GoogleDriveDashboard />;
  }

  if (selectedNavId === "aws") {
    return <AWSDashboard />;
  }

  if (selectedNavId === "azure") {
    return <AzureDashboard />;
  }

  if (selectedNavId === "on-prem") {
    return <OnPremDashboard />;
  }

  if (selectedNavId === "sharepoint") {
    return <SharePointDashboard />;
  }

  if (DASHBOARD_IDS.includes(selectedNavId)) {
    return <DashboardPlaceholder navId={selectedNavId} />;
  }

  if (IDENTITY_IDS.includes(selectedNavId)) {
    return <IdentityTable navId={selectedNavId} />;
  }

  if (SAAS_STORE_IDS.includes(selectedNavId)) {
    return <UnstructuredDataStoreTableSaaS storeType={selectedNavId} />;
  }

  if (IAAS_STORE_IDS.includes(selectedNavId)) {
    return <UnstructuredDataStoreTableIaaS storeType={selectedNavId} />;
  }

  if (selectedNavId === "user-device") {
    return <UnstructuredDataStoreTable storeType={selectedNavId} />;
  }

  if (IAAS_STRUCTURED_STORE_IDS.includes(selectedNavId)) {
    return <StructuredDataStoreTableIaaS storeType={selectedNavId} />;
  }

  if (ONPREM_STRUCTURED_STORE_IDS.includes(selectedNavId)) {
    return <StructuredDataStoreTableOnPrem storeType={selectedNavId} />;
  }

  if (selectedNavId === "unmanaged-application") {
    return <UnmanagedDestinationsTable typeFilter="Application" />;
  }

  if (selectedNavId === "unmanaged-websites") {
    return <UnmanagedDestinationsTable typeFilter="Website" />;
  }

  if (selectedNavId === "unmanaged-device-peripheral") {
    return <UnmanagedDestinationsTable typeFilter="Device Peripheral" />;
  }

  // Default fallback — show all unmanaged destinations
  return <UnmanagedDestinationsTable />;
}