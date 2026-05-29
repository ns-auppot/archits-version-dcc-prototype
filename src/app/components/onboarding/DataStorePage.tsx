// Data Store Connections — Step 4 of setup.
// Two views:
//   - List: provider tabs (AWS, GCP, Azure, ...) + Connected / Discovered / Archived sub-tabs,
//     data store table with auto-discovery info banner.
//   - Wizard: 4-step Connect a Data Store flow (Data Store -> Discovered -> Credentials -> Capabilities).
//
// AWS / IaaS flow is fully fleshed out for review. On-prem and SaaS catalog tiles exist
// but route through the same wizard with shared auth fields.

import { useState, useEffect, type ReactNode, type ComponentType, type SVGProps } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  Filter,
  Search,
  Info,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Network,
  Box,
  Sparkle,
  Settings2,
  Cloud,
  AppWindow,
  Server,
  CheckCircle,
} from "lucide-react";
import { InfoTip } from "./InfoTip";

/* ============ Connector catalog ============ */

interface Connector {
  id: string;
  name: string;
  tag: string;
}

const CONNECTORS: Record<string, Connector[]> = {
  aws: [
    { id: "redshift", name: "Amazon Redshift", tag: "AWS · Warehouse" },
    { id: "aurora-mysql", name: "Amazon Aurora MySQL", tag: "AWS · DB" },
    { id: "aurora-pg", name: "Amazon Aurora PostgreSQL", tag: "AWS · DB" },
    { id: "rds-pg", name: "Amazon RDS PostgreSQL", tag: "AWS · DB" },
    { id: "rds-mysql", name: "Amazon RDS MySQL", tag: "AWS · DB" },
    { id: "rds-mariadb", name: "Amazon RDS MariaDB", tag: "AWS · DB" },
    { id: "rds-oracle", name: "Amazon RDS Oracle", tag: "AWS · DB" },
    { id: "rds-sqlserver", name: "Amazon RDS SQL Server", tag: "AWS · DB" },
    { id: "athena", name: "Amazon Athena", tag: "AWS · Query" },
    { id: "s3", name: "Amazon S3", tag: "AWS · Object" },
    { id: "dynamodb", name: "Amazon DynamoDB", tag: "AWS · NoSQL" },
    { id: "ebs", name: "Amazon EBS", tag: "AWS · Volume" },
    { id: "efs", name: "Amazon EFS", tag: "AWS · File" },
    { id: "fsx-wfs", name: "Amazon FSx for Windows", tag: "AWS · File" },
    { id: "fsx-ontap", name: "Amazon FSx for NetApp ONTAP", tag: "AWS · File" },
  ],
  cloud: [
    { id: "snowflake", name: "Snowflake", tag: "Warehouse" },
    { id: "databricks", name: "Databricks", tag: "Lakehouse" },
    { id: "heroku-pg", name: "Heroku Postgres", tag: "DB" },
    { id: "mongodb", name: "MongoDB", tag: "NoSQL" },
  ],
  onprem: [
    { id: "op-mssql", name: "Microsoft SQL Server", tag: "DB" },
    { id: "op-pg", name: "PostgreSQL", tag: "DB" },
    { id: "op-oracle", name: "Oracle", tag: "DB" },
    { id: "op-mysql", name: "MySQL", tag: "DB" },
    { id: "op-cifs", name: "CIFS", tag: "File" },
    { id: "op-smb", name: "SMB", tag: "File" },
    { id: "op-nfs", name: "NFS", tag: "File" },
    { id: "op-db2", name: "IBM Db2", tag: "DB" },
    { id: "op-netapp", name: "NetApp", tag: "File" },
  ],
  saas: [
    { id: "m365", name: "Microsoft 365", tag: "SaaS · Email + Drive" },
    { id: "gdrive", name: "Google Drive", tag: "SaaS · File" },
    { id: "gworkspace", name: "Google Workspace", tag: "SaaS · Suite" },
    { id: "sharepoint", name: "SharePoint", tag: "SaaS · File" },
    { id: "onedrive", name: "OneDrive", tag: "SaaS · File" },
    { id: "slack", name: "Slack", tag: "SaaS · Messaging" },
    { id: "box", name: "Box", tag: "SaaS · File" },
    { id: "dropbox", name: "Dropbox", tag: "SaaS · File" },
    { id: "salesforce", name: "Salesforce", tag: "SaaS · CRM" },
    { id: "servicenow", name: "ServiceNow", tag: "SaaS · ITSM" },
    { id: "confluence", name: "Confluence", tag: "SaaS · Wiki" },
    { id: "jira", name: "Jira", tag: "SaaS · Tickets" },
  ],
};

/* ============ Mock discovered data ============ */

interface DiscoveredInsights {
  encryption: string;
  backup: string;
  publicAccess: string;
  totalSize: string;
  totalFiles: number | string;
  fileExt: string;
  classifiable: string;
  misconfig?: boolean;
}

interface DiscoveredStore {
  id: string;
  provider: string;
  service: string;
  account: string;
  firstFound: string;
  region: string;
  endpoint: string;
  status: "ok" | "unknown";
  insights: DiscoveredInsights;
  archivedOn?: string;
}

const SEED_DISCOVERED: DiscoveredStore[] = [
  {
    id: "d1", provider: "aws", service: "S3", account: "AWS Dev", firstFound: "04-14-2026 10:49:01", region: "us-west-2", endpoint: "suhas-special-char", status: "ok",
    insights: { encryption: "Enabled", backup: "Enabled", publicAccess: "Permissive Firewall", totalSize: "0 bytes", totalFiles: 0, fileExt: "None", classifiable: "None", misconfig: true },
  },
  {
    id: "d2", provider: "aws", service: "Oracle", account: "AWS Dev", firstFound: "04-14-2026 06:18:45", region: "us-west-2", endpoint: "35.162.212.154:3306", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d3", provider: "aws", service: "SQL Server", account: "AWS Dev", firstFound: "04-14-2026 06:18:45", region: "us-west-2", endpoint: "35.162.212.154:1433", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d4", provider: "aws", service: "MySQL", account: "AWS Dev", firstFound: "04-14-2026 06:18:45", region: "us-west-2", endpoint: "34.214.16.159:3306", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d5", provider: "aws", service: "Oracle", account: "AWS Dev", firstFound: "04-14-2026 06:18:45", region: "us-west-2", endpoint: "34.214.16.159:3306", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d6", provider: "aws", service: "Oracle", account: "AWS Dev", firstFound: "04-11-2026 03:49:46", region: "us-west-2", endpoint: "35.93.196.217:3306", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d7", provider: "aws", service: "SQL Server", account: "AWS Dev", firstFound: "04-11-2026 03:49:46", region: "us-west-2", endpoint: "35.93.196.217:1433", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d8", provider: "aws", service: "MySQL", account: "AWS Dev", firstFound: "04-11-2026 03:37:07", region: "us-west-2", endpoint: "172.31.17.16:3306", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d9", provider: "gcp", service: "BigQuery", account: "GCP Prod", firstFound: "04-13-2026 09:00:00", region: "us-central1", endpoint: "analytics-warehouse", status: "ok",
    insights: { encryption: "Enabled", backup: "Enabled", publicAccess: "Restricted", totalSize: "1.2 TB", totalFiles: 24500, fileExt: "parquet, csv", classifiable: "csv, parquet" },
  },
  {
    id: "d10", provider: "azure", service: "SQL Server", account: "Azure Sub 1", firstFound: "04-12-2026 12:30:00", region: "eastus", endpoint: "prod-sql.database.windows.net:1433", status: "ok",
    insights: { encryption: "Enabled", backup: "Enabled", publicAccess: "Restricted", totalSize: "480 GB", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
  {
    id: "d11", provider: "azure", service: "PostgreSQL", account: "Azure Sub 1", firstFound: "04-12-2026 12:30:00", region: "eastus", endpoint: "analytics-pg.postgres.database.azure.com:5432", status: "unknown",
    insights: { encryption: "Unknown", backup: "Unknown", publicAccess: "Unknown", totalSize: "—", totalFiles: "—", fileExt: "—", classifiable: "—" },
  },
];

/* ============ Service glyph ============ */

const GLYPH_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  S3: { bg: "#fef3c7", fg: "#d97706", label: "S3" },
  Oracle: { bg: "#fee2e2", fg: "#dc2626", label: "OR" },
  "SQL Server": { bg: "#e0e7ff", fg: "#4f46e5", label: "SQ" },
  MySQL: { bg: "#dbeafe", fg: "#2563eb", label: "My" },
  Redshift: { bg: "#fef3c7", fg: "#d97706", label: "RS" },
  PostgreSQL: { bg: "#dbeafe", fg: "#1d4ed8", label: "pg" },
  Aurora: { bg: "#fee2e2", fg: "#dc2626", label: "Au" },
  DynamoDB: { bg: "#dbeafe", fg: "#2563eb", label: "Dy" },
  Snowflake: { bg: "#dbeafe", fg: "#0891b2", label: "SF" },
  Databricks: { bg: "#fee2e2", fg: "#dc2626", label: "DB" },
  MongoDB: { bg: "#dcfce7", fg: "#16a34a", label: "Mo" },
};

interface ServiceGlyphProps {
  name: string;
  size?: number;
}

function ServiceGlyph({ name, size = 18 }: ServiceGlyphProps) {
  const m = GLYPH_MAP[name] || { bg: "#f1f5f9", fg: "#475569", label: name.slice(0, 2).toUpperCase() };
  return (
    <span
      className="inline-flex items-center justify-center rounded shrink-0 text-[9px] font-bold tracking-tight"
      style={{ width: size + 6, height: size + 6, background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

/* ============ Provider tabs ============ */

interface ProviderTab {
  id: string;
  label: string;
}

const PROVIDER_TABS: ProviderTab[] = [
  { id: "all", label: "All" },
  { id: "aws", label: "AWS" },
  { id: "gcp", label: "GCP" },
  { id: "azure", label: "Azure" },
  { id: "oci", label: "OCI" },
];

const DISCOVERED_PROVIDER_TABS: ProviderTab[] = [
  { id: "all", label: "All" },
  { id: "aws", label: "AWS" },
  { id: "gcp", label: "GCP" },
  { id: "azure", label: "Azure" },
  { id: "oci", label: "OCI" },
];

/* ============ Insight cell ============ */

interface InsightProps {
  label: string;
  value: string | number | undefined | null;
  tone?: "ok" | "warn" | "muted";
}

function Insight({ label, value, tone }: InsightProps) {
  const display = value === undefined || value === null || value === "" ? "—" : value;
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">{label}</div>
      {tone === "ok" && (
        <span className="inline-flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
          <Check size={11} /> {display}
        </span>
      )}
      {tone === "warn" && (
        <span className="inline-flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium">
          <AlertTriangle size={11} /> {display}
        </span>
      )}
      {!tone && (
        <span className="text-[12.5px] text-slate-900 font-medium dark:text-slate-100">{display}</span>
      )}
      {tone === "muted" && (
        <span className="text-[12.5px] text-slate-400">{display}</span>
      )}
    </div>
  );
}

/* ============ Toggle switch ============ */

interface ToggleSwitchProps {
  on: boolean;
}

function ToggleSwitch({ on }: ToggleSwitchProps) {
  return (
    <span
      className="relative inline-block w-8 h-[18px] rounded-full transition-colors duration-150"
      style={{ background: on ? "#3b82f6" : "#cbd5e1" }}
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-[left] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: on ? 16 : 2 }}
      />
    </span>
  );
}

/* ============ Wizard step 1: Discovered list ============ */

interface DiscoveredRowProps {
  d: DiscoveredStore;
  chosen: string | null;
  onPick: (d: DiscoveredStore) => void;
  onConnect: (d: DiscoveredStore) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}

function DiscoveredRow({ d, chosen, onPick, onConnect, expanded, setExpanded }: DiscoveredRowProps) {
  return (
    <>
      <div
        className="grid items-center px-5 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:hover:bg-slate-800/50"
        style={{ gridTemplateColumns: "28px 28px 1fr 110px 130px 1.4fr 90px 90px 100px" }}
        onClick={() => setExpanded(expanded === d.id ? null : d.id)}
      >
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 rounded bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          onClick={(e) => { e.stopPropagation(); setExpanded(expanded === d.id ? null : d.id); }}
        >
          {expanded === d.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <input
          type="radio"
          name="discovered"
          checked={chosen === d.id}
          onChange={(e) => { e.stopPropagation(); onPick(d); }}
          onClick={(e) => e.stopPropagation()}
          className="accent-blue-500"
        />
        <span className="flex items-center gap-2 text-[12.5px] text-slate-900 font-medium dark:text-slate-100">
          <ServiceGlyph name={d.service} size={16} />
          {d.service}
          {d.insights?.misconfig && (
            <span title="Misconfiguration detected"><AlertTriangle size={12} className="text-orange-500" /></span>
          )}
        </span>
        <span className="text-[12px] text-slate-800 dark:text-slate-200">{d.account}</span>
        <span className="text-[11.5px] text-slate-500">{d.firstFound.split(" ")[0]}</span>
        <span className="text-[12px] text-slate-800 font-mono truncate dark:text-slate-200">
          <span className="text-blue-500 hover:underline cursor-pointer">{d.endpoint}</span>
        </span>
        <span className="text-[11.5px] text-slate-500">{d.region}</span>
        <span>
          {d.status === "ok" ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
              <Check size={12} />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold">
              ?
            </span>
          )}
        </span>
        <button
          type="button"
          className="h-[26px] px-3 rounded-md text-[11px] font-semibold tracking-wider text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer justify-self-end"
          onClick={(e) => { e.stopPropagation(); onConnect(d); }}
        >
          CONNECT
        </button>
      </div>

      {expanded === d.id && (
        <div className="grid grid-cols-6 gap-x-6 gap-y-3.5 px-5 py-4 border-t border-black/[0.04] bg-slate-50 dark:bg-slate-800/40 dark:border-white/[0.04]">
          <Insight label="Publicly inaccessible" value={d.insights?.publicAccess} tone={d.insights?.publicAccess === "Permissive Firewall" ? "warn" : "ok"} />
          <Insight label="Encryption" value={d.insights?.encryption} tone={d.insights?.encryption === "Enabled" ? "ok" : "muted"} />
          <Insight label="Backup" value={d.insights?.backup} tone={d.insights?.backup === "Enabled" ? "ok" : "muted"} />
          <Insight label="Total size" value={d.insights?.totalSize} />
          <Insight label="Total files" value={d.insights?.totalFiles} />
          <Insight label="File extensions" value={d.insights?.fileExt} />
        </div>
      )}
    </>
  );
}

/* ============ Wizard step 1: Discovered stores ============ */

interface StepDiscoveredProps {
  chosen: string | null;
  setChosen: (id: string | null) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  discovered: DiscoveredStore[];
  onBrowseCatalog: () => void;
  onConnect?: (d: DiscoveredStore) => void;
}

function StepDiscovered({ chosen, setChosen, selected, setSelected, discovered, onBrowseCatalog, onConnect }: StepDiscoveredProps) {
  const [providerTab, setProviderTab] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  function pickDiscovered(d: DiscoveredStore) {
    setChosen(d.id);
    const lower = d.service.toLowerCase();
    const match = Object.values(CONNECTORS).flat().find((c) =>
      c.name.toLowerCase().includes(lower.split(" ")[0])
    );
    if (match) setSelected(match.id);
  }

  function connectDiscovered(d: DiscoveredStore) {
    pickDiscovered(d);
    onConnect && onConnect(d);
  }

  const filtered = discovered.filter((d) => {
    if (providerTab !== "all" && d.provider !== providerTab) return false;
    const q = query.trim().toLowerCase();
    if (q && !d.service.toLowerCase().includes(q) && !d.endpoint.toLowerCase().includes(q) && !d.account.toLowerCase().includes(q)) return false;
    return true;
  });

  const counts = DISCOVERED_PROVIDER_TABS.reduce<Record<string, number>>((m, t) => {
    m[t.id] = t.id === "all" ? discovered.length : discovered.filter((d) => d.provider === t.id).length;
    return m;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Connect from auto-discovered data stores</h2>
      <p className="text-[13px] text-slate-500 leading-relaxed dark:text-slate-400">
        We found these in your connected cloud accounts. Pick one to connect -- credentials are
        the only thing you'll need to supply. Or browse the catalog to manually connect any
        supported service.
      </p>

      {/* Provider tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {DISCOVERED_PROVIDER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium bg-transparent border-none cursor-pointer transition-colors ${
              providerTab === t.id
                ? "text-blue-600 border-b-2 border-b-blue-500 -mb-px dark:text-blue-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
            onClick={() => setProviderTab(t.id)}
          >
            <span>{t.label}</span>
            <span className="text-[11px] text-slate-400 font-medium">({counts[t.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2.5 items-center">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer min-w-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
          <Filter size={12} /> Filter <ChevronDown size={11} className="ml-0.5" />
        </button>
        <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            className="flex-1 text-[12.5px] border-none outline-none bg-transparent text-slate-800 placeholder:text-slate-400 dark:text-slate-200"
            placeholder="Search service, account, endpoint…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
        <strong className="text-slate-900 dark:text-slate-100">{filtered.length}</strong> data store{filtered.length === 1 ? "" : "s"}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <div
          className="grid items-center px-5 py-2.5"
          style={{ gridTemplateColumns: "28px 28px 1fr 110px 130px 1.4fr 90px 90px 100px" }}
        >
          <span />
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Service</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">First found</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Endpoint</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Region</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</span>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-slate-400 text-[12.5px] text-center">
            {discovered.length === 0
              ? "No auto-discovered data stores yet. Connect a cloud provider first, or browse the catalog below."
              : "No data stores match this filter."}
          </div>
        )}
        {filtered.map((d) => (
          <DiscoveredRow
            key={d.id}
            d={d}
            chosen={chosen}
            onPick={pickDiscovered}
            onConnect={connectDiscovered}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-dashed border-black/10 rounded-[10px] dark:bg-slate-800/50 dark:border-white/10">
        <Info size={14} className="text-slate-500 shrink-0" />
        <div className="flex-1 text-[12.5px] text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100">Don't see your data store?</strong>{" "}
          Browse the catalog to manually connect any supported service.
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          onClick={onBrowseCatalog}
        >
          Browse catalog <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ============ Wizard step 2: Connector catalog ============ */

interface StepCatalogProps {
  selected: string | null;
  setSelected: (id: string | null) => void;
  env?: string | null;
}

function StepCatalog({ selected, setSelected, env }: StepCatalogProps) {
  const showAws = !env || env === "cloud";
  const showCloud = !env || env === "cloud";
  const showOnprem = !env || env === "onprem";
  const showSaas = !env || env === "saas";

  function CatalogSection({ title, connectors: items }: { title: string; connectors: Connector[] }) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                selected === c.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/10"
              }`}
              onClick={() => setSelected(c.id)}
            >
              <ServiceGlyph name={c.name.replace(/^Amazon /, "").split(" ")[0]} size={20} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-slate-900 truncate dark:text-slate-100">{c.name}</div>
                <div className="text-[10.5px] text-slate-400 truncate">{c.tag}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Pick a data store to connect</h2>
      <p className="text-[13px] text-slate-500 leading-relaxed dark:text-slate-400">
        Choose from the catalog. If your cloud is already onboarded, you can connect from your
        auto-discovered list instead -- go back to the Discovered tab on the Data Stores page.
      </p>

      {showAws && <CatalogSection title="AWS" connectors={CONNECTORS.aws} />}
      {showCloud && <CatalogSection title="Cloud data platforms" connectors={CONNECTORS.cloud} />}
      {showOnprem && <CatalogSection title="On-prem" connectors={CONNECTORS.onprem} />}
      {showSaas && <CatalogSection title="SaaS apps" connectors={CONNECTORS.saas} />}
    </div>
  );
}

/* ============ Wizard step 3: Credentials & connection ============ */

interface StepCredentialsProps {
  selected: string | null;
  connectionMethod: string;
  setConnectionMethod: (v: string) => void;
  authMethod: string;
  setAuthMethod: (v: string) => void;
  accountAlias: string;
  setAccountAlias: (v: string) => void;
  storeId: string;
  setStoreId: (v: string) => void;
  endpoint: string;
  setEndpoint: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  secretArn: string;
  setSecretArn: (v: string) => void;
  scannerPool: string;
  setScannerPool: (v: string) => void;
  scanFreq: string;
  setScanFreq: (v: string) => void;
  schedule: string;
  setSchedule: (v: string) => void;
}

const SAAS_IDS = ["m365", "gdrive", "gworkspace", "sharepoint", "onedrive", "slack", "box", "dropbox", "salesforce", "servicenow", "confluence", "jira"];

function isIaasId(id: string | null): boolean {
  if (!id) return false;
  return (
    id.startsWith("rds-") ||
    id === "s3" ||
    id === "redshift" ||
    id === "dynamodb" ||
    id.startsWith("aurora") ||
    id.startsWith("fsx") ||
    id === "efs" ||
    id === "ebs" ||
    id === "athena" ||
    id.startsWith("op-")
  );
}

function StepCredentials({
  selected,
  connectionMethod, setConnectionMethod,
  authMethod, setAuthMethod,
  accountAlias, setAccountAlias,
  storeId, setStoreId, endpoint, setEndpoint,
  username, setUsername, password, setPassword,
  secretArn, setSecretArn,
  scannerPool, setScannerPool, scanFreq, setScanFreq, schedule, setSchedule,
}: StepCredentialsProps) {
  const isOnPrem = selected ? selected.startsWith("op-") : false;
  const isIaas = isIaasId(selected);
  const isSaas = selected ? SAAS_IDS.includes(selected) : false;
  const supportsSnapshot = isIaas && !isOnPrem;
  const isSnapshot = supportsSnapshot && connectionMethod === "snapshot";

  const fieldLabelCls = "text-[12px] font-semibold text-slate-700 dark:text-slate-300";
  const fieldHintCls = "text-[11px] text-slate-400 font-normal";
  const inputCls = "w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-[12.5px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200";

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Connection & credentials</h2>

      {supportsSnapshot && (
        <div className="flex flex-col gap-2">
          <span className={fieldLabelCls}>Connection method</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer transition-all ${
                connectionMethod === "direct"
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
                  : "border-slate-200 bg-white hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600"
              }`}
              onClick={() => setConnectionMethod("direct")}
            >
              <Network size={14} className="text-slate-500 shrink-0" />
              <div className="text-left">
                <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">Direct connect</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Live connection with credentials</div>
              </div>
            </button>
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer transition-all ${
                connectionMethod === "snapshot"
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
                  : "border-slate-200 bg-white hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600"
              }`}
              onClick={() => setConnectionMethod("snapshot")}
            >
              <Box size={14} className="text-slate-500 shrink-0" />
              <div className="text-left">
                <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">Snapshot-based</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Read encrypted snapshots, no creds needed</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {isSaas && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200/50 bg-blue-500/[0.04] px-4 py-3 dark:bg-blue-900/10 dark:border-blue-800/40">
          <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-slate-800 dark:text-slate-200">
            <strong>OAuth-based grant</strong> -- after you fill the admin email below and click
            <strong> Grant Access</strong>, you'll be redirected to your SaaS provider's authorization
            page. Return here once approval is complete.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelCls}>{isSaas ? "Admin email" : "Account"} <span className="text-red-500">*</span></span>
          {isSaas ? (
            <input
              className={inputCls}
              type="email"
              value={accountAlias}
              onChange={(e) => setAccountAlias(e.target.value)}
              placeholder="admin@acme.com"
            />
          ) : (
            <select className={inputCls} value={accountAlias} onChange={(e) => setAccountAlias(e.target.value)}>
              <option value="">Select cloud account</option>
              <option value="production-main">production-main (123456789012)</option>
              <option value="aws-dev">AWS Dev (987654321098)</option>
              <option value="aws-staging">AWS Staging (555666777888)</option>
            </select>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelCls}>{isSaas ? "Instance name" : "Data store identifier"} <span className="text-red-500">*</span></span>
          <input
            className={inputCls}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            placeholder={isSaas ? "acme-tenant" : "engineering"}
          />
        </label>
      </div>

      {isIaas && (
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelCls}>Data store endpoint <span className="text-red-500">*</span></span>
          <input
            className={`${inputCls} font-mono`}
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="engineering.cluster-abc.us-west-2.redshift.amazonaws.com:5439/dev"
          />
        </label>
      )}

      {isIaas && (
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelCls}>
            Scanner pool <span className={fieldHintCls}>-- optional</span>
            <InfoTip label="Scanner pool">
              <strong>Scanner pool</strong> assigns this store to an in-network scanner group instead of running scans from the Netskope tenant cloud. Use for SaaS-restricted networks, on-prem stores, or to keep data inside your perimeter.
            </InfoTip>
          </span>
          <select className={inputCls} value={scannerPool} onChange={(e) => setScannerPool(e.target.value)}>
            <option value="">Tenant cloud (scans run from Netskope cloud)</option>
            <option value="pool-eu-west">EU West Production (3 scanners)</option>
            <option value="pool-a">Standalone Scanner Pool A (single appliance)</option>
          </select>
          <span className={fieldHintCls}>If you don't choose a pool, all scanning runs from the tenant cloud.</span>
        </label>
      )}

      {isIaas && !isSnapshot && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabelCls}>Authentication method <span className="text-red-500">*</span></span>
            <select className={inputCls} value={authMethod} onChange={(e) => setAuthMethod(e.target.value)}>
              <option value="iam">AWS Identity Access Management (IAM) role</option>
              <option value="userpass">Username / Password</option>
              <option value="secrets">AWS Secrets Manager</option>
            </select>
          </label>

          {authMethod === "userpass" && (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabelCls}>Database username <span className="text-red-500">*</span></span>
                <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="netskope_dspm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabelCls}>Password <span className="text-red-500">*</span></span>
                <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            </div>
          )}

          {authMethod === "iam" && (
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelCls}>Database username <span className="text-red-500">*</span></span>
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="netskope_dspm" />
            </label>
          )}

          {authMethod === "secrets" && (
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelCls}>Secret ARN <span className="text-red-500">*</span></span>
              <input
                className={`${inputCls} font-mono`}
                value={secretArn}
                onChange={(e) => setSecretArn(e.target.value)}
                placeholder="arn:aws:secretsmanager:us-west-2:123:secret:dspm-creds"
              />
            </label>
          )}
        </>
      )}

      {isSnapshot && (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:bg-slate-800 dark:border-slate-700">
          <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
            Snapshot-based connections don't need credentials -- Netskope creates short-lived
            encrypted snapshots in your account using the IAM role granted at cloud onboarding.
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:bg-slate-800/50 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <ToggleSwitch on={true} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Auto-scan</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5 dark:text-slate-400">
              Re-scan automatically on the schedule below so classification stays current.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3.5">
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabelCls}>Scan frequency</span>
            <select className={inputCls} value={scanFreq} onChange={(e) => setScanFreq(e.target.value)}>
              <option>Daily (Recommended)</option>
              <option>Hourly</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabelCls}>Schedule</span>
            <select className={inputCls} value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option>Every 24 hours</option>
              <option>Every 12 hours</option>
              <option>At a specific time…</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ============ Wizard step 4: Capabilities ============ */

interface CapabilityToggleProps {
  title: string;
  sub: string;
  on: boolean;
  setOn: (v: boolean) => void;
  children?: ReactNode;
}

function CapabilityToggle({ title, sub, on, setOn, children }: CapabilityToggleProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="text-[12px] text-slate-500 mt-1 leading-relaxed dark:text-slate-400">{sub}</div>
        </div>
        <button type="button" onClick={() => setOn(!on)} className="bg-transparent border-none cursor-pointer p-0">
          <ToggleSwitch on={on} />
        </button>
      </div>
      {children}
    </div>
  );
}

interface StepDataStoreCapabilitiesProps {
  scanType: string;
  setScanType: (v: string) => void;
  sampleRate: string;
  setSampleRate: (v: string) => void;
  sampleRegex: string;
  setSampleRegex: (v: string) => void;
  privAnalysis: boolean;
  setPrivAnalysis: (v: boolean) => void;
  dataInUse: boolean;
  setDataInUse: (v: boolean) => void;
  shadowAnalysis: boolean;
  setShadowAnalysis: (v: boolean) => void;
  staleWindow: number;
  setStaleWindow: (v: number) => void;
  dataOwner: string;
  setDataOwner: (v: string) => void;
}

function StepDataStoreCapabilities({
  scanType, setScanType,
  sampleRate, setSampleRate,
  sampleRegex, setSampleRegex,
  privAnalysis, setPrivAnalysis,
  dataInUse, setDataInUse,
  shadowAnalysis, setShadowAnalysis,
  staleWindow, setStaleWindow,
  dataOwner, setDataOwner,
}: StepDataStoreCapabilitiesProps) {
  const fieldLabelCls = "text-[12px] font-semibold text-slate-700 dark:text-slate-300";
  const fieldHintCls = "text-[11px] text-slate-400 font-normal";
  const inputCls = "w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-[12.5px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200";

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Capabilities</h2>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              Classification
              <InfoTip label="Smart vs Deep">
                <strong>Smart scan</strong> uses AI to pick a statistically representative sample of files -- faster and lower cost.<br />
                <strong>Deep scan</strong> targets a configurable portion of the store with custom sample rate and file-type regex.
              </InfoTip>
              <a
                href="#"
                className="text-blue-500 hover:underline text-[11.5px] font-medium ml-2.5"
                onClick={(e) => e.preventDefault()}
              >
                Supported file types
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer transition-all ${
              scanType === "smart"
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
                : "border-slate-200 bg-white hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600"
            }`}
            onClick={() => setScanType("smart")}
          >
            <Sparkle size={14} className="text-slate-500 shrink-0" />
            <div className="text-left">
              <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
                Smart scan{" "}
                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  Recommended
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">AI-driven sampling for faster, lower-cost scans</div>
            </div>
          </button>
          <button
            type="button"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer transition-all ${
              scanType === "deep"
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
                : "border-slate-200 bg-white hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600"
            }`}
            onClick={() => setScanType("deep")}
          >
            <Settings2 size={14} className="text-slate-500 shrink-0" />
            <div className="text-left">
              <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">Deep scan</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Custom sample rate &amp; file regex</div>
            </div>
          </button>
        </div>

        {scanType === "deep" && (
          <div className="grid grid-cols-2 gap-4 mt-3.5">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelCls}>Sample rate <span className="text-red-500">*</span></span>
              <select className={inputCls} value={sampleRate} onChange={(e) => setSampleRate(e.target.value)}>
                <option>100%</option>
                <option>50%</option>
                <option>25%</option>
                <option>10%</option>
                <option>5%</option>
              </select>
              <span className={fieldHintCls}>Sampling rate impacts scan duration and costs.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelCls}>Sample included files only <span className={fieldHintCls}>-- regex</span></span>
              <input
                className={`${inputCls} font-mono`}
                placeholder="e.g. \.(csv|json|parquet)$"
                value={sampleRegex}
                onChange={(e) => setSampleRegex(e.target.value)}
              />
              <span className={fieldHintCls}>Only files matching the regex are sampled.</span>
            </label>
          </div>
        )}
      </div>

      <CapabilityToggle
        title="Privilege analysis"
        sub="Surface over-privileged accounts and orphaned permissions on this data store."
        on={privAnalysis}
        setOn={setPrivAnalysis}
      />

      <CapabilityToggle
        title="Data-in-use monitoring"
        sub="Track who is reading sensitive objects in real time. May incur additional costs."
        on={dataInUse}
        setOn={setDataInUse}
      />

      <CapabilityToggle
        title="Shadow data analysis"
        sub="Flag stale data sets that have not been accessed within the window below."
        on={shadowAnalysis}
        setOn={setShadowAnalysis}
      >
        {shadowAnalysis && (
          <div className="grid grid-cols-2 gap-4 mt-3.5">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelCls}>Last access time for stale data <span className="text-red-500">*</span></span>
              <input
                className={inputCls}
                type="number"
                value={staleWindow}
                onChange={(e) => setStaleWindow(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelCls}>Period <span className="text-red-500">*</span></span>
              <select className={inputCls} defaultValue="Days">
                <option>Days</option>
                <option>Weeks</option>
                <option>Months</option>
              </select>
            </label>
          </div>
        )}
      </CapabilityToggle>
    </div>
  );
}

/* ============ The wizard itself ============ */

interface WizardPrefill {
  manual?: boolean;
  fromCatalog?: boolean;
  connectorId?: string;
  service?: string;
  endpoint?: string;
  account?: string;
  provider?: string;
  region?: string;
  env?: string;
}

interface WizardStep {
  id: string;
  label: string;
  sub: string | null;
}

interface AddDataStoreWizardProps {
  onCancel: () => void;
  onComplete: (data: {
    selected: string | null;
    accountAlias: string;
    storeId: string;
    endpoint: string;
    scanType: string;
  }) => void;
  setupActive?: boolean;
  prefill: WizardPrefill | null;
}

function AddDataStoreWizard({ onCancel, onComplete, setupActive, prefill }: AddDataStoreWizardProps) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>("manual");

  const [connectionMethod, setConnectionMethod] = useState("direct");
  const [authMethod, setAuthMethod] = useState("userpass");
  const [accountAlias, setAccountAlias] = useState("");
  const [storeId, setStoreId] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretArn, setSecretArn] = useState("");
  const [scannerPool, setScannerPool] = useState("");
  const [scanFreq, setScanFreq] = useState("Daily (Recommended)");
  const [schedule, setSchedule] = useState("Every 24 hours");

  const [scanType, setScanType] = useState("smart");
  const [sampleRate, setSampleRate] = useState("100%");
  const [sampleRegex, setSampleRegex] = useState("");
  const [privAnalysis, setPrivAnalysis] = useState(true);
  const [dataInUse, setDataInUse] = useState(false);
  const [shadowAnalysis, setShadowAnalysis] = useState(true);
  const [staleWindow, setStaleWindow] = useState(30);
  const [dataOwner, setDataOwner] = useState("");

  const [tried, setTried] = useState(false);

  // Prefill from incoming payload
  useEffect(() => {
    if (!prefill) return;

    if (prefill.manual) {
      setStep(1);
      return;
    }

    if (prefill.fromCatalog && prefill.connectorId) {
      setSelected(prefill.connectorId);
      setStep(2);
      return;
    }

    if (prefill.service) {
      const lower = prefill.service.toLowerCase();
      const match = Object.values(CONNECTORS).flat().find((c) =>
        c.name.toLowerCase().includes(lower.split(" ")[0])
      );
      if (match) setSelected(match.id);
      if (prefill.endpoint) {
        setEndpoint(prefill.endpoint);
        setStoreId(prefill.endpoint.split(/[:/.]/)[0]);
      }
      if (prefill.account) {
        setAccountAlias(
          prefill.account.toLowerCase().includes("dev")
            ? "aws-dev"
            : prefill.account.toLowerCase().includes("staging")
            ? "aws-staging"
            : "production-main"
        );
      }
      setStep(2);
    }
  }, [prefill]);

  const isOnPremWiz = selected ? selected.startsWith("op-") : false;
  const isIaas = isIaasId(selected);
  const isSaas = selected ? SAAS_IDS.includes(selected) : false;
  const isSnapshot = isIaas && !isOnPremWiz && connectionMethod === "snapshot";

  const STEPS: WizardStep[] = [
    {
      id: "data-store",
      label: "Data Store",
      sub: step > 1 && selected
        ? Object.values(CONNECTORS).flat().find((c) => c.id === selected)?.name || null
        : null,
    },
    { id: "credentials", label: "Credentials", sub: step > 2 ? "Completed" : null },
    { id: "capabilities", label: "Capabilities", sub: null },
  ];

  function validation(): string | null {
    if (step === 1 && !selected) return "Pick a data store from the catalog to continue.";
    if (step === 2) {
      const errs: string[] = [];
      if (!accountAlias) errs.push(isSaas ? "an admin email" : "an account");
      if (!storeId.trim()) errs.push(isSaas ? "an instance name" : "a data store identifier");
      if (isIaas && !isSnapshot && !endpoint.trim()) errs.push("the data store endpoint");
      if (errs.length) return "Provide " + errs.join(", ") + " to continue.";
    }
    return null;
  }
  function canProceed() { return validation() === null; }

  function back() { setStep((s) => Math.max(1, s - 1)); }
  function next() {
    if (!canProceed()) { setTried(true); return; }
    setTried(false);
    setStep((s) => Math.min(3, s + 1));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Connect a Data Store</h1>
          <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
            Add a new data store. Pick from the catalog, fill in credentials, and choose what to scan.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={onCancel}
        >
          <X size={14} /> Cancel
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-stretch mx-6 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden dark:bg-slate-800/50 dark:border-slate-700">
        {STEPS.map((s, i) => {
          const num = i + 1;
          const isDone = num < step;
          const isActive = num === step;
          return (
            <button
              key={s.id}
              className={`flex items-center gap-2 px-4 py-3 flex-1 bg-transparent border-none cursor-pointer transition-colors ${
                isDone
                  ? "text-green-600 dark:text-green-400"
                  : isActive
                  ? "text-blue-600 bg-white dark:text-blue-400 dark:bg-slate-900"
                  : "text-slate-400"
              } ${!isDone && !isActive ? "cursor-not-allowed opacity-60" : ""}`}
              onClick={() => isDone && setStep(num)}
              disabled={!isDone && !isActive}
              type="button"
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold shrink-0 ${
                  isDone
                    ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                    : isActive
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                    : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                }`}
              >
                {isDone ? <Check size={13} /> : num}
              </span>
              <span className="flex flex-col items-start">
                <span className="text-[12.5px] font-semibold">{s.label}</span>
                {s.sub && <span className="text-[10.5px] text-slate-400">{s.sub}</span>}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="ml-auto text-slate-300 dark:text-slate-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Wizard body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {step === 1 && (
          <StepCatalog selected={selected} setSelected={setSelected} env={prefill?.env || prefill?.provider} />
        )}
        {step === 2 && (
          <StepCredentials
            selected={selected}
            connectionMethod={connectionMethod} setConnectionMethod={setConnectionMethod}
            authMethod={authMethod} setAuthMethod={setAuthMethod}
            accountAlias={accountAlias} setAccountAlias={setAccountAlias}
            storeId={storeId} setStoreId={setStoreId}
            endpoint={endpoint} setEndpoint={setEndpoint}
            username={username} setUsername={setUsername}
            password={password} setPassword={setPassword}
            secretArn={secretArn} setSecretArn={setSecretArn}
            scannerPool={scannerPool} setScannerPool={setScannerPool}
            scanFreq={scanFreq} setScanFreq={setScanFreq}
            schedule={schedule} setSchedule={setSchedule}
          />
        )}
        {step === 3 && (
          <StepDataStoreCapabilities
            scanType={scanType} setScanType={setScanType}
            sampleRate={sampleRate} setSampleRate={setSampleRate}
            sampleRegex={sampleRegex} setSampleRegex={setSampleRegex}
            privAnalysis={privAnalysis} setPrivAnalysis={setPrivAnalysis}
            dataInUse={dataInUse} setDataInUse={setDataInUse}
            shadowAnalysis={shadowAnalysis} setShadowAnalysis={setShadowAnalysis}
            staleWindow={staleWindow} setStaleWindow={setStaleWindow}
            dataOwner={dataOwner} setDataOwner={setDataOwner}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <span className="text-[12px] text-slate-400">Step {step} of 3</span>
        {tried && validation() && (
          <span className="text-[11.5px] text-red-600 ml-3.5 inline-flex items-center gap-1.5">
            <AlertTriangle size={11} /> {validation()}
          </span>
        )}
        <div className="flex-1" />
        {step > 1 && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={back}
          >
            <ArrowLeft size={13} /> Back
          </button>
        )}
        {step < 3 && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={next}
          >
            Continue <ArrowRight size={13} />
          </button>
        )}
        {step === 3 && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={() => onComplete({ selected, accountAlias, storeId, endpoint, scanType })}
          >
            <Check size={13} /> Save data store
          </button>
        )}
      </div>
    </div>
  );
}

/* ============ List view ============ */

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

interface EnvTab {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const ENV_TABS: EnvTab[] = [
  { id: "cloud", label: "Cloud", icon: Cloud, desc: "AWS, GCP, Azure, OCI — auto-discovered and manual" },
  { id: "saas", label: "SaaS apps", icon: AppWindow, desc: "Microsoft 365, Google Workspace, Slack, etc." },
  { id: "onprem", label: "On-prem", icon: Server, desc: "Self-hosted databases and file shares" },
];

/* ============ DataStoreListDiscoveredRow (for list page) ============ */

interface DataStoreListDiscoveredRowProps {
  d: DiscoveredStore;
  archived: boolean;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onConnect: () => void;
}

function DataStoreListDiscoveredRow({ d, archived, expanded, setExpanded, onConnect }: DataStoreListDiscoveredRowProps) {
  return (
    <>
      <div
        className="grid items-center px-5 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:hover:bg-slate-800/50"
        style={{ gridTemplateColumns: "28px 1fr 110px 130px 1.4fr 90px 90px 110px" }}
        onClick={() => setExpanded(expanded === d.id ? null : d.id)}
      >
        <button
          type="button"
          className="flex items-center justify-center w-6 h-6 rounded bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          onClick={(e) => { e.stopPropagation(); setExpanded(expanded === d.id ? null : d.id); }}
        >
          {expanded === d.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="flex items-center gap-2 text-[12.5px] text-slate-900 font-medium min-w-0 dark:text-slate-100">
          <ServiceGlyph name={d.service} size={16} />
          <span className="truncate">{d.service}</span>
          {archived && (
            <span className="inline-flex px-1.5 py-0.5 text-[9.5px] font-bold bg-slate-500/10 text-slate-600 rounded tracking-wider whitespace-nowrap dark:text-slate-400">
              PREV. CONNECTED
            </span>
          )}
          {!archived && d.insights?.misconfig && (
            <AlertTriangle size={12} className="text-orange-500" />
          )}
        </span>
        <span className="text-[12px] text-slate-800 dark:text-slate-200">{d.account}</span>
        <span className="text-[11.5px] text-slate-500">{(archived ? d.archivedOn : d.firstFound)?.split(" ")[0] || "—"}</span>
        <span className="text-[12px] text-slate-800 font-mono truncate dark:text-slate-200">
          <span className="text-blue-500 hover:underline cursor-pointer">{d.endpoint}</span>
        </span>
        <span className="text-[11.5px] text-slate-500">{d.region}</span>
        <span>
          {archived ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-white text-[13px] font-bold">&minus;</span>
          ) : d.status === "ok" ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
              <Check size={12} />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold">?</span>
          )}
        </span>
        <button
          type="button"
          className="h-[26px] px-3 rounded-md text-[11px] font-semibold tracking-wider text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer justify-self-end"
          onClick={(e) => { e.stopPropagation(); onConnect(); }}
        >
          {archived ? "RECONNECT" : "CONNECT"}
        </button>
      </div>
      {expanded === d.id && (
        <div className="grid grid-cols-6 gap-x-6 gap-y-3.5 px-5 py-4 border-t border-black/[0.04] bg-slate-50 dark:bg-slate-800/40 dark:border-white/[0.04]">
          <Insight label="Publicly inaccessible" value={d.insights?.publicAccess} tone={d.insights?.publicAccess === "Permissive Firewall" ? "warn" : "ok"} />
          <Insight label="Encryption" value={d.insights?.encryption} tone={d.insights?.encryption === "Enabled" ? "ok" : "muted"} />
          <Insight label="Backup" value={d.insights?.backup} tone={d.insights?.backup === "Enabled" ? "ok" : "muted"} />
          <Insight label="Total size" value={d.insights?.totalSize} />
          <Insight label="Total files" value={d.insights?.totalFiles} />
          <Insight label="File extensions" value={d.insights?.fileExt} />
        </div>
      )}
    </>
  );
}

/* ============ Cloud tab content (discovered + archived + provider sub-tabs) ============ */

interface CloudTabProps {
  provider: string;
  setProvider: (v: string) => void;
  view: string;
  setView_archived: (v: string) => void;
  archived: DiscoveredStore[];
  discovered: DiscoveredStore[];
  onConnectDiscovered: (d: DiscoveredStore) => void;
  onReconnect: (d: DiscoveredStore) => void;
  onAddManual: () => void;
}

function CloudTab({
  provider, setProvider, view, setView_archived,
  archived, discovered, onConnectDiscovered, onReconnect, onAddManual,
}: CloudTabProps) {
  const rowsAll = view === "archived" ? archived : discovered;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = rowsAll.filter((r) => {
    if (provider !== "all") {
      const p = r.provider || "aws";
      if (p !== provider) return false;
    }
    const q = query.trim().toLowerCase();
    if (q && !r.service.toLowerCase().includes(q) && !r.endpoint.toLowerCase().includes(q) && !r.account.toLowerCase().includes(q)) return false;
    return true;
  });

  const counts = PROVIDER_TABS.reduce<Record<string, number>>((m, t) => {
    m[t.id] = t.id === "all" ? rowsAll.length : rowsAll.filter((r) => (r.provider || "aws") === t.id).length;
    return m;
  }, {});

  return (
    <>
      <div className="flex gap-2 items-center">
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-colors ${
            view === "discovered"
              ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
          }`}
          onClick={() => { setView_archived("discovered"); setExpanded(null); }}
        >
          Discovered <span className="text-[11px] opacity-60">{discovered.length}</span>
        </button>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-colors ${
            view === "archived"
              ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
          }`}
          onClick={() => { setView_archived("archived"); setExpanded(null); }}
        >
          Archived <span className="text-[11px] opacity-60">{archived.length}</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
          onClick={onAddManual}
        >
          <Plus size={13} /> Add Data Store
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto dark:border-slate-700">
        {PROVIDER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium bg-transparent border-none cursor-pointer transition-colors ${
              provider === t.id
                ? "text-blue-600 border-b-2 border-b-blue-500 -mb-px dark:text-blue-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
            onClick={() => setProvider(t.id)}
          >
            <span>{t.label}</span>
            <span className="text-[11px] text-slate-400 font-medium">({counts[t.id] || 0})</span>
          </button>
        ))}
      </div>

      {view === "discovered" && discovered.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800/40">
          <Info size={14} className="text-blue-500 shrink-0" />
          <div className="text-[12.5px] text-slate-800 dark:text-slate-200">
            Only <strong>0/2</strong> accounts have auto-discovery enabled.{" "}
            <a href="#" className="text-blue-500 hover:underline" onClick={(e) => e.preventDefault()}>Click here</a> to enable others.
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3.5 flex gap-2.5 items-center dark:bg-slate-900 dark:border-slate-700">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer min-w-[100px] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
          <Filter size={12} /> Filter <ChevronDown size={11} className="ml-0.5" />
        </button>
        <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            className="flex-1 text-[12.5px] border-none outline-none bg-transparent text-slate-800 placeholder:text-slate-400 dark:text-slate-200"
            placeholder="Search contains…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <div className="px-5 pt-3 pb-1.5">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} {view === "archived" ? "Archived" : "Discovered"} Data {filtered.length === 1 ? "Store" : "Stores"}
          </h3>
        </div>
        <div
          className="grid items-center px-5 py-2.5"
          style={{ gridTemplateColumns: "28px 1fr 110px 130px 1.4fr 90px 90px 110px" }}
        >
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Service</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{view === "archived" ? "Archived on" : "First found"}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Endpoint</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Region</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</span>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-slate-400 text-[12.5px] text-center">
            {view === "archived"
              ? "No archived data stores yet."
              : "No discovered data stores match this filter."}
          </div>
        )}
        {filtered.map((d) => (
          <DataStoreListDiscoveredRow
            key={d.id}
            d={d}
            archived={view === "archived"}
            expanded={expanded}
            setExpanded={setExpanded}
            onConnect={() => view === "archived" ? onReconnect(d) : onConnectDiscovered(d)}
          />
        ))}
      </div>
    </>
  );
}

/* ============ Catalog tab content (SaaS / On-prem grids) ============ */

interface CatalogTabProps {
  title: string;
  subtitle: string;
  connectors: Connector[];
  onPick: (c: Connector) => void;
}

function CatalogTab({ title, subtitle, connectors, onPick }: CatalogTabProps) {
  const [query, setQuery] = useState("");
  const filtered = connectors.filter((c) => {
    const q = query.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q);
  });
  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3.5 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex items-start gap-3.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-[9px] bg-blue-500/10 text-blue-500 shrink-0">
            <Info size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold text-slate-900 m-0 dark:text-slate-100">{title}</h3>
            <p className="text-[12.5px] text-slate-500 mt-1 leading-relaxed dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3.5 flex gap-2.5 items-center dark:bg-slate-900 dark:border-slate-700">
        <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            className="flex-1 text-[12.5px] border-none outline-none bg-transparent text-slate-800 placeholder:text-slate-400 dark:text-slate-200"
            placeholder="Search connectors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all text-left dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/10"
            onClick={() => onPick(c)}
          >
            <ServiceGlyph name={c.name.split(" ")[0]} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-slate-900 truncate dark:text-slate-100">{c.name}</div>
              <div className="text-[10.5px] text-slate-400 truncate">{c.tag}</div>
            </div>
            <ArrowRight size={14} className="text-blue-500 shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full px-5 py-10 text-center text-slate-400 text-[13px]">
            No connectors match this search.
          </div>
        )}
      </div>
    </>
  );
}

/* ============ DataStoreList ============ */

interface DataStoreListProps {
  envTab: string;
  setEnvTab: (v: string) => void;
  provider: string;
  setProvider: (v: string) => void;
  view: string;
  setView_archived: (v: string) => void;
  archived: DiscoveredStore[];
  discovered: DiscoveredStore[];
  onAddNew: () => void;
  onConnectDiscovered: (d: DiscoveredStore) => void;
  onReconnect: (d: DiscoveredStore) => void;
  onConnectFromCatalog: (connectorId: string | null, env: string) => void;
}

function DataStoreList({
  envTab, setEnvTab,
  provider, setProvider, view, setView_archived, archived, discovered,
  onAddNew, onConnectDiscovered, onReconnect, onConnectFromCatalog,
}: DataStoreListProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Data Store Connections</h1>
          <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
            Connect data stores so Netskope can scan, classify, and monitor sensitive data --
            from your cloud, your SaaS apps, or your on-prem databases.
          </p>
        </div>
      </div>

      {/* Environment tabs */}
      <div className="flex gap-4 border-b border-black/[0.08] dark:border-white/[0.08]">
        {ENV_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setEnvTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-1 py-2.5 bg-transparent border-none font-inherit text-[14px] cursor-pointer whitespace-nowrap relative top-px ${
                envTab === t.id
                  ? "font-semibold text-slate-900 border-b-2 border-b-blue-500 dark:text-slate-100"
                  : "font-medium text-slate-500 border-b-2 border-b-transparent"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
        <span className="ml-auto self-center text-[11.5px] text-slate-400">
          {ENV_TABS.find((t) => t.id === envTab)?.desc}
        </span>
      </div>

      {envTab === "cloud" && (
        <CloudTab
          provider={provider} setProvider={setProvider}
          view={view} setView_archived={setView_archived}
          archived={archived} discovered={discovered}
          onConnectDiscovered={onConnectDiscovered}
          onReconnect={onReconnect}
          onAddManual={() => onConnectFromCatalog(null, "cloud")}
        />
      )}

      {envTab === "saas" && (
        <CatalogTab
          title="SaaS apps"
          subtitle="OAuth-based connection. Provide an admin email and grant access — we'll classify documents, messages, and files."
          connectors={CONNECTORS.saas}
          onPick={(c) => onConnectFromCatalog(c.id, "saas")}
        />
      )}

      {envTab === "onprem" && (
        <CatalogTab
          title="On-prem data stores"
          subtitle="Connect a self-hosted database or file share. Requires an in-network scanner pool — set one up under Scanner Administration."
          connectors={CONNECTORS.onprem}
          onPick={(c) => onConnectFromCatalog(c.id, "onprem")}
        />
      )}
    </>
  );
}

/* ============ Main page export ============ */

interface DataStorePageProps {
  setupActive?: boolean;
  onBackToHub?: () => void;
  onSaveStep?: () => void;
  status?: string;
  onConnected?: (data: {
    provider: string;
    service: string;
    account: string;
    region: string;
    endpoint: string;
  }) => void;
}

export function DataStorePage({ setupActive, onBackToHub, onSaveStep, status, onConnected }: DataStorePageProps) {
  const [view, setView] = useState<"list" | "wizard">("list");
  const [envTab, setEnvTab] = useState("cloud");
  const [provider, setProvider] = useState("all");
  const [candidateView, setCandidateView] = useState("discovered");
  const [discovered] = useState<DiscoveredStore[]>(SEED_DISCOVERED);
  const [archived, setArchived] = useState<DiscoveredStore[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<WizardPrefill | null>(null);

  function handleComplete(data: { selected: string | null; accountAlias: string; storeId: string; endpoint: string; scanType: string }) {
    onConnected && onConnected({
      provider: data.selected ? "aws" : prefill?.provider || "aws",
      service: prefill?.service || (data.selected || "").toString(),
      account: prefill?.account || data.accountAlias || "AWS Dev",
      region: prefill?.region || "us-west-2",
      endpoint: data.endpoint || data.storeId || prefill?.endpoint || "manual-entry",
    });
    setPrefill(null);
    setView("list");
  }

  return (
    <div className="p-6 flex flex-col gap-4 pb-0">
      {view === "list" && (
        <DataStoreList
          envTab={envTab} setEnvTab={setEnvTab}
          provider={provider} setProvider={setProvider}
          view={candidateView} setView_archived={setCandidateView}
          archived={archived} discovered={discovered}
          onAddNew={() => { setPrefill(null); setView("wizard"); }}
          onConnectDiscovered={(d) => {
            setPrefill(d as unknown as WizardPrefill);
            setView("wizard");
          }}
          onReconnect={(d) => {
            setPrefill({ ...d, provider: d.provider || "aws" } as unknown as WizardPrefill);
            setView("wizard");
          }}
          onConnectFromCatalog={(connectorId, env) => {
            if (!connectorId) {
              setPrefill({ fromCatalog: true, env, manual: true });
              setView("wizard");
              return;
            }
            const c = Object.values(CONNECTORS).flat().find((x) => x.id === connectorId);
            setPrefill({
              fromCatalog: true,
              connectorId,
              service: c?.name || "",
              endpoint: "",
              account: "",
              provider: env === "cloud" ? "aws" : env,
            });
            setView("wizard");
          }}
        />
      )}

      {view === "wizard" && (
        <AddDataStoreWizard
          prefill={prefill}
          onCancel={() => { setPrefill(null); setView("list"); }}
          onComplete={handleComplete}
          setupActive={setupActive}
        />
      )}

      {setupActive && view === "list" && (
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700">
          <span className="text-[12px] text-slate-400">
            Connect data stores here -- they'll appear in Scan Activity once saved
          </span>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={onBackToHub}
          >
            <ArrowLeft size={13} /> Back to Setup Summary
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] shadow-lg dark:bg-white dark:text-slate-900">
          <CheckCircle size={14} className="text-green-500" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
