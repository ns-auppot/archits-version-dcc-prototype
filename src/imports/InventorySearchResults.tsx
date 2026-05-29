import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Database,
  HardDrive,
  Users,
  Globe,
  FileText,
  ChevronRight,
  ExternalLink,
  Server,
  Monitor,
  AppWindow,
  Search,
} from "lucide-react";
import { InventorySearchBar } from "./InventorySearchBar";
import { SidePanel } from "./SidePanel";
import { PlaceholderOutline } from "./PlaceholderOutline";
import { SensitiveFileDetailPane, SensitiveFileHeaderExtra } from "./ForensicDetailPane";
import { SensitiveFilePanelContent } from "./SensitiveFilePanelContent";
import {
  buildSearchIndex,
  searchInventory,
  type SearchableItem,
  type ItemCategory,
} from "./inventory-search-data";
import {
  getUnstructuredStoreConfig,
  UnstructuredRowPanelContent,
} from "./UnstructuredDataStoreTable";
import {
  getSaaSStoreConfig,
  SaaSRowPanelContent,
} from "./UnstructuredDataStoreTableSaaS";
import {
  getIaaSStoreConfig,
  IaaSRowPanelContent,
} from "./UnstructuredDataStoreTableIaaS";
import {
  getOnPremStructuredStoreConfig,
  OnPremStructuredRowPanelContent,
} from "./StructuredDataStoreTableOnPrem";
import {
  getIaaSStructuredStoreConfig,
  IaaSStructuredRowPanelContent,
} from "./StructuredDataStoreTableIaaS";
import {
  UNMANAGED_DESTINATIONS,
  UnmanagedRowPanelContent,
} from "./UnmanagedDestinationsTable";
import { getIdentityTableConfig } from "./InventoryContent";

// ── Category badge styling (still used by result cards) ──────────────────────

const CATEGORY_CONFIG: Record<
  ItemCategory,
  { bg: string; text: string; border: string }
> = {
  "Unstructured Data Store": {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  "Structured Data Store": {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
  },
  Identity: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  "Unmanaged Destination": {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  "Sensitive File": {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
};

// ── Service mini-icons ────────────────────────────────────────────────────────

function GoogleDriveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L2.5 12H5.5L8 8L10.5 12H13.5L8 2Z" fill="#4285F4" />
      <path d="M2.5 12L5.5 12L4 9.5L2.5 12Z" fill="#0F9D58" />
      <path d="M13.5 12L10.5 12L12 9.5L13.5 12Z" fill="#F4B400" />
    </svg>
  );
}

function AWSIcon() {
  return (
    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: "#FF9900" }}>
      <span style={{ color: "#fff", fontSize: "7px", fontWeight: 800, letterSpacing: "-0.5px" }}>AWS</span>
    </div>
  );
}

function SharePointIcon() {
  return (
    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: "#0078D4" }}>
      <span style={{ color: "#fff", fontSize: "8px", fontWeight: 800 }}>S</span>
    </div>
  );
}

function AzureIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M7 2L3 13h3l1.5-2.5L9.5 13H13L7 2Z" fill="#0078D4" opacity="0.85" />
      <path d="M9.5 13H13L10 7.5L9.5 13Z" fill="#0078D4" />
    </svg>
  );
}

function EndpointIcon() {
  return (
    <Monitor size={12} className="text-slate-400 shrink-0" />
  );
}

/** Map storeSource string → icon + display label for platform chip */
function PlatformChip({ platform }: { platform: string }) {
  const map: Record<string, { icon: ReactNode; label: string }> = {
    "Google Drive": { icon: <GoogleDriveIcon />, label: "Google Drive" },
    "AWS S3":       { icon: <AWSIcon />, label: "AWS S3" },
    "SharePoint":   { icon: <SharePointIcon />, label: "SharePoint" },
    "Azure Blob":   { icon: <AzureIcon />, label: "Azure Blob" },
    "Endpoint":     { icon: <EndpointIcon />, label: "Endpoint" },
  };
  const entry = map[platform];
  if (!entry) return <span className="text-foreground" style={{ fontSize: "11px" }}>{platform}</span>;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap">
      <span className="shrink-0 flex items-center" style={{ width: 12, height: 12 }}>{entry.icon}</span>
      <span style={{ fontSize: "10px" }}>{entry.label}</span>
    </span>
  );
}

// ── Filter system ─────────────────────────────────────────────────────────────

type FilterKey =
  | "all"
  | "managed-destinations"
  | "google-drive"
  | "aws"
  | "sharepoint"
  | "azure"
  | "endpoint"
  | "on-prem"
  | "unstructured"
  | "structured"
  | "identity"
  | "unmanaged-apps"
  | "unmanaged-websites"
  | "pii" | "spii" | "psi" | "pci" | "pfi" | "phi" | "pai" | "bii"
  | "slack" | "zoom" | "chatgpt" | "notion" | "trello" | "dropbox" | "github" | "figma" | "teams"
  // Website domains
  | "filetransfer.io" | "wetransfer.com" | "mega.nz" | "pastebin.com"
  | "replit.com" | "reddit.com" | "twitter.com" | "linkedin.com"
  | "youtube.com" | "medium.com" | "protonmail.com"
  | "chatgpt.com" | "claude.ai" | "perplexity.ai" | "canva.com"
  | "nordvpn.com" | "torproject.org" | "hackerone.com" | "virustotal.com";

// ── Data type category maps (mirrors DataExplorerPage) ────────────────────────
const CATEGORY_TYPES: Record<string, string[]> = {
  pii:  ["personal names","email addresses","telephone numbers","postal addresses","birthdates","gender","age","nationality","ip addresses","mac addresses","domain names","uri hosts","uuids","device ids","browser fingerprints","geolocation data","vehicle ids","student records","education ids"],
  spii: ["social security numbers","driver licenses","national ids","passports","taxpayer ids","voter registration ids"],
  psi:  ["ethnicity and race","marital status","religious beliefs","political opinions","sexual orientation","immigration status"],
  pci:  ["payment cards"],
  pfi:  ["bank account information","financial ids","currency","securities ids","credit scores","income information","tax records"],
  phi:  ["medical records","medical diagnoses","healthcare ids","healthcare provider ids","health insurance ids","prescription information","biometric data","genetic data"],
  pai:  ["passwords","private keys","public keys","secrets and tokens","security questions","mfa seeds"],
  bii:  ["source code","company names","trade secrets","legal privileges"],
};

const FILTER_PREDICATES: Record<FilterKey, (item: SearchableItem) => boolean> = {
  "all":                  () => true,
  "managed-destinations": (i) => i.category === "Unstructured Data Store" || i.category === "Structured Data Store",
  "google-drive":         (i) => i.navId === "drives",
  "aws":                  (i) => i.navId === "s3" || i.navId === "rds",
  "sharepoint":           (i) => i.navId === "sharepoint-sites",
  "azure":                (i) => i.navId === "azure-blob" || i.navId === "azure-sql",
  "endpoint":             (i) => i.navId === "user-device",
  "on-prem":              (i) => i.navId === "postgresql" || i.navId === "oracle",
  "unstructured":         (i) => i.category === "Unstructured Data Store",
  "structured":           (i) => i.category === "Structured Data Store",
  "identity":             (i) => i.category === "Identity",
  "unmanaged-apps":       (i) => i.navId === "unmanaged-application",
  "unmanaged-websites":   (i) => i.navId === "unmanaged-websites",
  // Sensitive data type categories — match against item tags (lowercase data type names)
  "pii":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pii.includes(t)) ?? false,
  "spii": (i) => i.tags?.some((t) => CATEGORY_TYPES.spii.includes(t)) ?? false,
  "psi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.psi.includes(t)) ?? false,
  "pci":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pci.includes(t)) ?? false,
  "pfi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pfi.includes(t)) ?? false,
  "phi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.phi.includes(t)) ?? false,
  "pai":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pai.includes(t)) ?? false,
  "bii":  (i) => i.tags?.some((t) => CATEGORY_TYPES.bii.includes(t)) ?? false,
  // Named unmanaged apps
  "slack":    (i) => i.category === "Unmanaged Destination" && i.name === "Slack",
  "zoom":     (i) => i.category === "Unmanaged Destination" && i.name === "Zoom",
  "chatgpt":  (i) => i.category === "Unmanaged Destination" && i.name === "ChatGPT",
  "notion":   (i) => i.category === "Unmanaged Destination" && i.name === "Notion",
  "trello":   (i) => i.category === "Unmanaged Destination" && i.name === "Trello",
  "dropbox":  (i) => i.category === "Unmanaged Destination" && i.name === "Dropbox",
  "github":   (i) => i.category === "Unmanaged Destination" && i.name === "GitHub",
  "figma":    (i) => i.category === "Unmanaged Destination" && i.name === "Figma",
  "teams":    (i) => i.category === "Unmanaged Destination" && i.name === "Microsoft Teams",
  // Named website domains
  "filetransfer.io":  (i) => i.category === "Unmanaged Destination" && i.name === "filetransfer.io",
  "wetransfer.com":   (i) => i.category === "Unmanaged Destination" && i.name === "wetransfer.com",
  "mega.nz":          (i) => i.category === "Unmanaged Destination" && i.name === "mega.nz",
  "pastebin.com":     (i) => i.category === "Unmanaged Destination" && i.name === "pastebin.com",
  "replit.com":       (i) => i.category === "Unmanaged Destination" && i.name === "replit.com",
  "reddit.com":       (i) => i.category === "Unmanaged Destination" && i.name === "reddit.com",
  "twitter.com":      (i) => i.category === "Unmanaged Destination" && i.name === "twitter.com",
  "linkedin.com":     (i) => i.category === "Unmanaged Destination" && i.name === "linkedin.com",
  "youtube.com":      (i) => i.category === "Unmanaged Destination" && i.name === "youtube.com",
  "medium.com":       (i) => i.category === "Unmanaged Destination" && i.name === "medium.com",
  "protonmail.com":   (i) => i.category === "Unmanaged Destination" && i.name === "protonmail.com",
  "chatgpt.com":      (i) => i.category === "Unmanaged Destination" && i.name === "chatgpt.com",
  "claude.ai":        (i) => i.category === "Unmanaged Destination" && i.name === "claude.ai",
  "perplexity.ai":    (i) => i.category === "Unmanaged Destination" && i.name === "perplexity.ai",
  "canva.com":        (i) => i.category === "Unmanaged Destination" && i.name === "canva.com",
  "nordvpn.com":      (i) => i.category === "Unmanaged Destination" && i.name === "nordvpn.com",
  "torproject.org":   (i) => i.category === "Unmanaged Destination" && i.name === "torproject.org",
  "hackerone.com":    (i) => i.category === "Unmanaged Destination" && i.name === "hackerone.com",
  "virustotal.com":   (i) => i.category === "Unmanaged Destination" && i.name === "virustotal.com",
};

interface FilterEntry {
  key: FilterKey;
  label: string;
  icon: ReactNode;
  /** px left indent for child items */
  indent?: number;
}

interface FilterGroup {
  heading?: string;
  items: FilterEntry[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    items: [
      {
        key: "all",
        label: "All",
        icon: <Search size={13} className="text-primary" />,
      },
    ],
  },
  {
    heading: "Managed",
    items: [
      {
        key: "managed-destinations",
        label: "Managed Destinations",
        icon: <Server size={13} className="text-slate-400" />,
      },
      {
        key: "google-drive",
        label: "Google Drive",
        icon: <GoogleDriveIcon />,
        indent: 12,
      },
      {
        key: "aws",
        label: "AWS",
        icon: <AWSIcon />,
        indent: 12,
      },
      {
        key: "sharepoint",
        label: "SharePoint",
        icon: <SharePointIcon />,
        indent: 12,
      },
      {
        key: "azure",
        label: "Azure",
        icon: <AzureIcon />,
        indent: 12,
      },
      {
        key: "endpoint",
        label: "Endpoint",
        icon: <Monitor size={13} className="text-slate-400" />,
        indent: 12,
      },
      {
        key: "on-prem",
        label: "On-Prem",
        icon: <HardDrive size={13} className="text-slate-400" />,
        indent: 12,
      },
    ],
  },
  {
    heading: "Identity",
    items: [
      {
        key: "identity",
        label: "Identity",
        icon: <Users size={13} className="text-emerald-400" />,
      },
    ],
  },
  {
    heading: "Unmanaged",
    items: [
      {
        key: "unmanaged-apps",
        label: "Unmanaged Apps",
        icon: <AppWindow size={13} className="text-amber-400" />,
      },
      {
        key: "unmanaged-websites",
        label: "Unmanaged Websites",
        icon: <Globe size={13} className="text-amber-400" />,
      },
    ],
  },
  {
    heading: "Data",
    items: [
      {
        key: "pii",
        label: "PII",
        icon: <FileText size={13} className="text-rose-400" />,
      },
      {
        key: "spii",
        label: "SPII",
        icon: <Database size={13} className="text-violet-400" />,
      },
      {
        key: "psi",
        label: "PSI",
        icon: <Database size={13} className="text-violet-400" />,
      },
      {
        key: "pci",
        label: "PCI",
        icon: <Database size={13} className="text-violet-400" />,
      },
      {
        key: "pfi",
        label: "PFI",
        icon: <Database size={13} className="text-violet-400" />,
      },
      {
        key: "phi",
        label: "PHI",
        icon: <Database size={13} className="text-violet-400" />,
      },
      {
        key: "pai",
        label: "PAI",
        icon: <Database size={13} className="text-violet-400" />,
      },
      {
        key: "bii",
        label: "BII",
        icon: <Database size={13} className="text-violet-400" />,
      },
    ],
  },
];

// ── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  item,
  isActive,
  onSelect,
}: {
  item: SearchableItem;
  isActive: boolean;
  onSelect: (item: SearchableItem) => void;
}) {
  const cat = CATEGORY_CONFIG[item.category];
  const isSensitiveFile = item.category === "Sensitive File";
  const exposure = isSensitiveFile ? item.details["Exposure"] : undefined;
  const isRiskyExposure = exposure === "External" || exposure === "Anyone with link";
  const storeName = isSensitiveFile ? item.details["Store"] : undefined;
  const platform = isSensitiveFile ? item.source : undefined;

  return (
    <div
      className={`group border rounded-lg px-3.5 py-3 transition-all cursor-pointer ${
        isActive
          ? "bg-primary/5 border-primary/40"
          : "bg-surface-raised border-border hover:border-primary/40"
      }`}
      style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
      onClick={() => onSelect(item)}
    >
      {/* Header: badge + name + chevron */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${cat.bg} ${cat.text} ${cat.border}`}
              style={{ fontSize: "10px", fontWeight: 600 }}
            >
              {item.category}
            </span>
          </div>

          <div
            className={`transition-colors ${isActive ? "text-primary" : "text-text-bright group-hover:text-primary"}`}
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            {item.name}
          </div>

          {/* Path (subtitle) — truncated from the middle for long paths */}
          {item.subtitle && (
            <div className="text-muted-foreground mt-0.5 truncate" style={{ fontSize: "11px" }} title={item.subtitle}>
              {item.subtitle}
            </div>
          )}
        </div>

        <div
          className={`shrink-0 mt-1 text-muted-foreground transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <ChevronRight size={14} />
        </div>
      </div>

      {/* Source line — only for non-sensitive-file cards */}
      {!isSensitiveFile && (
        <div className="text-muted-foreground mb-1.5" style={{ fontSize: "11px" }}>
          {item.source}
        </div>
      )}

      {/* Key-value details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
        {/* Data Store: store name + platform chip (sensitive files only) */}
        {isSensitiveFile && storeName && platform && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
              Data Store:
            </span>
            <span className="text-foreground" style={{ fontSize: "11px" }}>
              {storeName}
            </span>
            <PlatformChip platform={platform} />
          </div>
        )}
        {/* Other detail fields — skip Store & Exposure for sensitive files */}
        {Object.entries(item.details)
          .filter(([key]) => !(isSensitiveFile && (key === "Store" || key === "Exposure")))
          .map(([key, value]) => {
            const displayValue = value.length > 80 ? value.slice(0, 80) + "…" : value;
            return (
              <div key={key} className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
                  {key}:
                </span>
                <span className="text-foreground" style={{ fontSize: "11px" }}>
                  {displayValue}
                </span>
              </div>
            );
          })}
        {/* Exposure as a key-value pair inline with other details */}
        {isSensitiveFile && exposure && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
              Exposure:
            </span>
            <span
              className={isRiskyExposure ? "text-warning" : "text-foreground"}
              style={{ fontSize: "11px" }}
            >
              {exposure}
            </span>
          </div>
        )}
      </div>

      {/* Sensitive Data Type — flat chip list */}
      {isSensitiveFile && item.dataTypesArray && item.dataTypesArray.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 mt-1.5">
          <span className="text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
            Sensitive Data Type:
          </span>
          {item.dataTypesArray.map((dt) => (
            <span
              key={dt}
              className="inline-flex px-1.5 py-px rounded bg-background border border-border text-foreground whitespace-nowrap"
              style={{ fontSize: "10px" }}
            >
              {dt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Side Panel Content for search results ────────────────────────────────────

const UNSTRUCTURED_NAV_IDS = ["user-device"];
const SAAS_NAV_IDS = ["drives", "sharepoint-sites"];
const IAAS_NAV_IDS = ["s3", "azure-blob"];
const IAAS_STRUCTURED_NAV_IDS = ["rds", "azure-sql"];
const ONPREM_STRUCTURED_NAV_IDS = ["postgresql", "oracle"];
const IDENTITY_NAV_IDS = [
  "internal-user",
  "external-user",
  "unauthenticated-user",
  "local-user",
  "service-account",
  "agent",
  "3rd-party-app",
];

function ResolvedPanelContent({
  item,
  onViewInTable,
}: {
  item: SearchableItem;
  onViewInTable: (navId: string) => void;
}) {
  if (item.category === "Unstructured Data Store" && UNSTRUCTURED_NAV_IDS.includes(item.navId)) {
    const config = getUnstructuredStoreConfig(item.navId);
    const rawId = item.id.replace(/^unstructured-/, "");
    const row = config.rows.find((r) => r.id === rawId);
    if (row) return (<><UnstructuredRowPanelContent row={row} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
  }

  if (item.category === "Unstructured Data Store" && SAAS_NAV_IDS.includes(item.navId)) {
    const config = getSaaSStoreConfig(item.navId);
    const rawId = item.id.replace(/^unstructured-/, "");
    const row = config.rows.find((r) => r.id === rawId);
    if (row) return (<><SaaSRowPanelContent row={row} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
  }

  if (item.category === "Unstructured Data Store" && IAAS_NAV_IDS.includes(item.navId)) {
    const config = getIaaSStoreConfig(item.navId);
    const rawId = item.id.replace(/^unstructured-/, "");
    const row = config.rows.find((r) => r.id === rawId);
    if (row) return (<><IaaSRowPanelContent row={row} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
  }

  if (item.category === "Structured Data Store" && ONPREM_STRUCTURED_NAV_IDS.includes(item.navId)) {
    const config = getOnPremStructuredStoreConfig(item.navId);
    const rawId = item.id.replace(/^structured-/, "");
    const row = config.rows.find((r) => r.id === rawId);
    if (row) return (<><OnPremStructuredRowPanelContent row={row} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
  }

  if (item.category === "Structured Data Store" && IAAS_STRUCTURED_NAV_IDS.includes(item.navId)) {
    const config = getIaaSStructuredStoreConfig(item.navId);
    const rawId = item.id.replace(/^structured-/, "");
    const row = config.rows.find((r) => r.id === rawId);
    if (row) return (<><IaaSStructuredRowPanelContent row={row} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
  }

  if (item.category === "Identity" && IDENTITY_NAV_IDS.includes(item.navId)) {
    const config = getIdentityTableConfig(item.navId);
    const row = config.rows.find((r) => r.Name === item.name || r[config.columns[0]] === item.name);
    if (row) return (<><IdentityPanelContent columns={config.columns} row={row} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
  }

  if (item.category === "Unmanaged Destination") {
    const dest = UNMANAGED_DESTINATIONS.find((d) => d.name === item.name);
    if (dest) {
      const showStatus = dest.destinationType === "Application";
      const [activeTab, setActiveTab] = useState<"overview" | "access" | "activity">("overview");
      return (
        <>
          <UnmanagedRowPanelContent row={dest} showStatus={showStatus} activeTab={activeTab} onTabChange={setActiveTab} />
          <ViewInTableButton navId={item.navId} onNavigate={onViewInTable} />
        </>
      );
    }
  }

  if (item.category === "Sensitive File") {
    return <SensitiveFilePanelContent item={item} />;
  }

  return <FallbackPanelContent item={item} onViewInTable={onViewInTable} />;
}

function ViewInTableButton({ navId, onNavigate }: { navId: string; onNavigate: (navId: string) => void }) {
  return (
    <div className="px-5 pb-5">
      <button
        onClick={() => onNavigate(navId)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface-raised hover:bg-nav-active/50 hover:border-primary/30 text-text-bright transition-colors"
        style={{ fontSize: "13px", fontWeight: 500 }}
      >
        <ExternalLink size={14} />
        View in Inventory Table
      </button>
    </div>
  );
}

function IdentityPanelContent({ columns, row }: { columns: string[]; row: Record<string, string> }) {
  return (
    <div className="px-5 py-4">
      <div className="space-y-3 mb-5">
        {columns.map((col) => (
          <div key={col} className="bg-surface-raised border border-border rounded-lg p-3">
            <div className="text-muted-foreground" style={{ fontSize: "11px" }}>{col}</div>
            <div className="text-text-bright mt-0.5" style={{ fontSize: "13px", fontWeight: 450 }}>{row[col]}</div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {["Data Access History", "Risk Assessment", "Associated Policies"].map((section) => (
          <PlaceholderOutline key={section} label="Needs design">
            <div className="bg-surface-raised border border-border rounded-lg p-4">
              <div className="text-text-bright mb-1" style={{ fontSize: "12px", fontWeight: 500 }}>{section}</div>
              <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Placeholder — detail view coming soon</div>
            </div>
          </PlaceholderOutline>
        ))}
      </div>
    </div>
  );
}

function FallbackPanelContent({ item, onViewInTable }: { item: SearchableItem; onViewInTable: (navId: string) => void }) {
  return (
    <div className="px-5 py-4">
      <div className="space-y-3 mb-5">
        {Object.entries(item.details).map(([key, value]) => (
          <div key={key} className="bg-surface-raised border border-border rounded-lg p-3">
            <div className="text-muted-foreground" style={{ fontSize: "11px" }}>{key}</div>
            <div className="text-text-bright mt-0.5" style={{ fontSize: "13px", fontWeight: 450 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function InventorySearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  // Filter-mode: comma-separated FilterKey values from ?filters= param
  const filtersParam = searchParams.get("filters") || "";
  const barFilters = useMemo(
    () => (filtersParam ? (filtersParam.split(",") as FilterKey[]) : []),
    [filtersParam],
  );
  const isFilterMode = barFilters.length > 0 && !query;

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null);

  useEffect(() => {
    setActiveFilter("all");
    setSelectedItem(null);
  }, [query, filtersParam]);

  const index = useMemo(() => buildSearchIndex(), []);

  // In filter mode: start from all items and apply bar filters (OR logic)
  // In NL mode: use search results
  const allResults = useMemo(() => {
    if (isFilterMode) {
      const all = buildSearchIndex();
      return all.filter((item) =>
        barFilters.some((key) => FILTER_PREDICATES[key]?.(item)),
      );
    }
    return searchInventory(query, index);
  }, [query, index, isFilterMode, barFilters]);

  // Compute count for every filter key against unfiltered results
  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterKey, number>> = { all: allResults.length };
    for (const [key, pred] of Object.entries(FILTER_PREDICATES) as [FilterKey, (i: SearchableItem) => boolean][]) {
      if (key !== "all") counts[key] = allResults.filter(pred).length;
    }
    return counts;
  }, [allResults]);

  const filteredResults = useMemo(
    () => allResults.filter(FILTER_PREDICATES[activeFilter]),
    [allResults, activeFilter],
  );

  const handleNavigateToItem = (navId: string) => {
    navigate(`/inventory?nav=${navId}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search bar */}
      <InventorySearchBar initialQuery={query} autoFocus />

      {/* Content area: results + right filter sidebar */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-start justify-center gap-12 px-6 py-5">

          {/* ── Results list ── */}
          <div style={{ width: "760px", minWidth: 0, flexShrink: 1 }}>
            {/* Back + result count */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => navigate("/inventory")}
                className="flex items-center gap-2 text-muted-foreground hover:text-text-bright transition-colors"
                style={{ fontSize: "13px" }}
              >
                <ArrowLeft size={16} />
                Back to Inventory
              </button>

              {query && (
                <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  <span className="text-text-bright" style={{ fontWeight: 500 }}>
                    {filteredResults.length}
                  </span>{" "}
                  {filteredResults.length === 1 ? "result" : "results"}
                  {activeFilter !== "all" && (
                    <span className="text-muted-foreground"> · filtered</span>
                  )}
                </span>
              )}
            </div>

            {/* Results */}
            {filteredResults.length > 0 ? (
              <div className="space-y-3">
                {filteredResults.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    isActive={selectedItem?.id === item.id}
                    onSelect={setSelectedItem}
                  />
                ))}
              </div>
            ) : query || isFilterMode ? (
              <div className="text-center py-16">
                <div className="text-muted-foreground mb-2" style={{ fontSize: "15px" }}>
                  No results found
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  {isFilterMode ? "Try selecting different filters" : (
                    <>
                      Try a different query, e.g.{" "}
                      <span className="text-primary">"databases with SSN"</span> or{" "}
                      <span className="text-primary">"unsanctioned apps"</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-muted-foreground" style={{ fontSize: "15px" }}>
                  Type a query to search across your entire inventory
                </div>
              </div>
            )}
          </div>

          {/* ── Right filter sidebar ── */}
          <div className="shrink-0 sticky top-5" style={{ width: "208px" }}>
            <div className="rounded-xl border border-border/60 bg-card shadow-md overflow-hidden">
              {FILTER_GROUPS.map((group, gi) => {
                // pre-filter items to only those with count > 0
                const visibleItems = group.items.filter(entry => (filterCounts[entry.key] ?? 0) > 0);
                if (visibleItems.length === 0) return null;

                // Hide the "Data" group when every result is already a Sensitive File
                // (the query is scoped to sensitive files — both sub-filters equal "All")
                const allAreSensitiveFiles =
                  allResults.length > 0 &&
                  (filterCounts["sensitive-file"] ?? 0) === allResults.length;
                if (group.heading === "Data" && allAreSensitiveFiles) return null;

                return (
                <div key={gi}>
                  {/* Section heading */}
                  {group.heading && (
                    <div
                      className="px-4 pt-3 pb-1 text-muted-foreground"
                      style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
                    >
                      {group.heading}
                    </div>
                  )}

                  {/* Filter items */}
                  {visibleItems.map((entry) => {
                    const count = filterCounts[entry.key] ?? 0;
                    const isActive = activeFilter === entry.key;

                    if (entry.key === "managed-destinations") return null;

                    return (
                      <button
                        key={entry.key}
                        onClick={() => setActiveFilter(entry.key)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 transition-colors text-left ${
                          isActive
                            ? "bg-primary/10 text-text-bright border-l-2 border-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-text-bright border-l-2 border-transparent"
                        }`}
                        style={{ paddingLeft: entry.indent ? `${16 + entry.indent}px` : undefined }}
                      >
                        {/* Icon */}
                        <span className="shrink-0 flex items-center justify-center w-4 h-4">
                          {entry.icon}
                        </span>

                        {/* Label */}
                        <span
                          className="flex-1 truncate"
                          style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
                        >
                          {entry.label}
                        </span>

                        {/* Count */}
                        <span
                          className={`shrink-0 tabular-nums ${isActive ? "text-primary" : "text-muted-foreground"}`}
                          style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Side panel for item detail */}
      <SidePanel
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name ?? ""}
        subtitle={selectedItem?.subtitle ?? selectedItem?.source}
        headerExtra={
          selectedItem?.category === "Sensitive File" ? (
            <SensitiveFileHeaderExtra
              name={selectedItem.name}
              store={selectedItem.details["Store"] ?? ""}
              storeSource={selectedItem.source}
              size={selectedItem.details["Size"] ?? ""}
            />
          ) : undefined
        }
        width="min(840px, 90vw)"
      >
        {selectedItem && (
          <ResolvedPanelContent
            item={selectedItem}
            onViewInTable={handleNavigateToItem}
          />
        )}
      </SidePanel>
    </div>
  );
}