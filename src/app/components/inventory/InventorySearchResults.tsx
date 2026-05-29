import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Users,
  Globe,
  ChevronRight,
  ExternalLink,
  Monitor,
  AppWindow,
  Search,
  Bot,
  Database,
  Columns2,
  FileText,
  UserRound,
} from "lucide-react";
import { InventorySearchBar } from "./InventorySearchBar";
import { InventoryNav } from "./InventoryNav";
import { SidePanel } from "./SidePanel";
import { PlaceholderOutline } from "./PlaceholderOutline";
import { SensitiveFileDetailPane, SensitiveFileHeaderExtra, FileActionsMenu } from "./ForensicDetailPane";
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
import { getIdentityTableConfig, IdentityDetailPanel } from "./InventoryContent";
import { InventoryContent } from "./InventoryContent";
import { FieldDetailPane } from "./FieldDetailPane";
import { IDENTITY_TYPE_LABEL } from "./identityRegistry";

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
  | "managed-app"
  | "managed-cloud-service"
  | "google-drive"
  | "aws"
  | "sharepoint"
  | "azure"
  | "endpoint"
  | "on-prem"
  | "unstructured"
  | "structured"
  | "identity"
  | "internal-user"
  | "external-user"
  | "unknown-identity"
  | "unmapped-local-user"
  | "service-account"
  | "connected-app"
  | "identity-internal-user"
  | "identity-external-user"
  | "identity-stale"
  | "identity-active"
  | "identity-unmapped-local-user"
  | "identity-unknown-identity"
  | "identity-connected-app"
  | "identity-service-account"
  | "unmanaged-destinations"
  | "unmanaged-apps"
  | "unsanctioned-apps"
  | "sanctioned-apps"
  | "unmanaged-websites"
  | "pii" | "spii" | "psi" | "pci" | "pfi" | "phi" | "pai" | "bii"
  | "misc-not-encrypted" | "misc-not-backed-up" | "misc-publicly-accessible"
  | "slack" | "zoom" | "chatgpt" | "notion" | "trello" | "dropbox" | "github" | "figma" | "teams"
  | "monday.com" | "airtable" | "hubspot" | "intercom" | "perplexity-ai" | "cursor" | "linear" | "retool" | "descript"
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
  "managed-app":          (i) => i.navId === "drives" || i.navId === "sharepoint-sites",
  "managed-cloud-service": (i) => i.navId === "s3" || i.navId === "rds" || i.navId === "azure-blob" || i.navId === "azure-sql" || i.navId === "postgresql" || i.navId === "oracle" || i.navId === "user-device",
  "google-drive":         (i) => i.navId === "drives"                                     || (i.category === "Identity" && (i.tags?.includes("google-drive") ?? false)),
  "aws":                  (i) => i.navId === "s3" || i.navId === "rds"                    || (i.category === "Identity" && (i.tags?.includes("aws") ?? false)),
  "sharepoint":           (i) => i.navId === "sharepoint-sites"                           || (i.category === "Identity" && (i.tags?.includes("sharepoint") ?? false)),
  "azure":                (i) => i.navId === "azure-blob" || i.navId === "azure-sql"      || (i.category === "Identity" && (i.tags?.includes("azure") ?? false)),
  "endpoint":             (i) => i.navId === "user-device",
  "on-prem":              (i) => i.navId === "postgresql" || i.navId === "oracle",
  "unstructured":         (i) => i.category === "Unstructured Data Store",
  "structured":           (i) => i.category === "Structured Data Store",
  "identity":             (i) => i.category === "Identity",
  "internal-user":        (i) => i.navId === "internal-user",
  "external-user":        (i) => i.navId === "external-user",
  "unknown-identity":     (i) => i.navId === "unknown-identity",
  "unmapped-local-user":  (i) => i.navId === "unmapped-local-user",
  "service-account":      (i) => i.navId === "service-account",
  "connected-app":        (i) => i.navId === "connected-app",
  "identity-internal-user":        (i) => i.category === "Identity" && i.navId === "internal-user",
  "identity-external-user":        (i) => i.category === "Identity" && i.navId === "external-user",
  "identity-unknown-identity":     (i) => i.category === "Identity" && i.navId === "unknown-identity",
  "identity-unmapped-local-user":  (i) => i.category === "Identity" && i.navId === "unmapped-local-user",
  "identity-service-account":      (i) => i.category === "Identity" && i.navId === "service-account",
  "identity-connected-app":        (i) => i.category === "Identity" && i.navId === "connected-app",
  "identity-stale":                (i) => i.category === "Identity" && (i.tags?.includes("stale") ?? false),
  "identity-active":               (i) => i.category === "Identity" && (i.tags?.includes("active") ?? false),
  "unmanaged-destinations": (i) => i.category === "Unmanaged Destination",
  "unmanaged-apps":       (i) => i.navId === "unmanaged-application" || (i.category === "Identity" && !!(i.tags?.some((t) => ["slack","zoom","teams","notion","trello","github","figma","chatgpt","dropbox"].includes(t)))),
  "unsanctioned-apps":    (i) => i.category === "Unmanaged Destination" && (i.tags?.includes("unsanctioned") ?? false),
  "sanctioned-apps":      (i) => i.category === "Unmanaged Destination" && (i.tags?.includes("sanctioned") ?? false) && (i.tags?.includes("application") ?? false),
  "unmanaged-websites":   (i) => i.navId === "unmanaged-websites"    || (i.category === "Identity" && !!(i.tags?.some((t) => t.endsWith(".com") || t.endsWith(".io") || t.endsWith(".ai") || t.endsWith(".nz") || t.endsWith(".org")))),
  // Misconfiguration filters — match items tagged with the corresponding flag
  "misc-not-encrypted":       (i) => i.tags?.includes("not-encrypted") ?? false,
  "misc-not-backed-up":       (i) => i.tags?.includes("not-backed-up") ?? false,
  "misc-publicly-accessible": (i) => i.tags?.includes("publicly-accessible") ?? false,
  // Sensitive data type categories — match against item tags (lowercase data type names)
  "pii":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pii.includes(t)) ?? false,
  "spii": (i) => i.tags?.some((t) => CATEGORY_TYPES.spii.includes(t)) ?? false,
  "psi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.psi.includes(t)) ?? false,
  "pci":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pci.includes(t)) ?? false,
  "pfi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pfi.includes(t)) ?? false,
  "phi":  (i) => i.tags?.some((t) => CATEGORY_TYPES.phi.includes(t)) ?? false,
  "pai":  (i) => i.tags?.some((t) => CATEGORY_TYPES.pai.includes(t)) ?? false,
  "bii":  (i) => i.tags?.some((t) => CATEGORY_TYPES.bii.includes(t)) ?? false,
  // Named unmanaged apps — also match identities with access to that app
  "slack":         (i) => (i.category === "Unmanaged Destination" && i.name === "Slack")           || (i.category === "Identity" && (i.tags?.includes("slack") ?? false)),
  "zoom":          (i) => (i.category === "Unmanaged Destination" && i.name === "Zoom")            || (i.category === "Identity" && (i.tags?.includes("zoom") ?? false)),
  "chatgpt":       (i) => (i.category === "Unmanaged Destination" && i.name === "ChatGPT")         || (i.category === "Identity" && (i.tags?.includes("chatgpt") ?? false)),
  "notion":        (i) => (i.category === "Unmanaged Destination" && i.name === "Notion")          || (i.category === "Identity" && (i.tags?.includes("notion") ?? false)),
  "trello":        (i) => (i.category === "Unmanaged Destination" && i.name === "Trello")          || (i.category === "Identity" && (i.tags?.includes("trello") ?? false)),
  "dropbox":       (i) => (i.category === "Unmanaged Destination" && i.name === "Dropbox")         || (i.category === "Identity" && (i.tags?.includes("dropbox") ?? false)),
  "github":        (i) => (i.category === "Unmanaged Destination" && i.name === "GitHub")          || (i.category === "Identity" && (i.tags?.includes("github") ?? false)),
  "figma":         (i) => (i.category === "Unmanaged Destination" && i.name === "Figma")           || (i.category === "Identity" && (i.tags?.includes("figma") ?? false)),
  "teams":         (i) => (i.category === "Unmanaged Destination" && i.name === "Microsoft Teams") || (i.category === "Identity" && (i.tags?.includes("teams") ?? false)),
  "monday.com":    (i) => (i.category === "Unmanaged Destination" && i.name === "Monday.com"),
  "airtable":      (i) => (i.category === "Unmanaged Destination" && i.name === "Airtable"),
  "hubspot":       (i) => (i.category === "Unmanaged Destination" && i.name === "HubSpot"),
  "intercom":      (i) => (i.category === "Unmanaged Destination" && i.name === "Intercom"),
  "perplexity-ai": (i) => (i.category === "Unmanaged Destination" && i.name === "Perplexity AI"),
  "cursor":        (i) => (i.category === "Unmanaged Destination" && i.name === "Cursor"),
  "linear":        (i) => (i.category === "Unmanaged Destination" && i.name === "Linear"),
  "retool":        (i) => (i.category === "Unmanaged Destination" && i.name === "Retool"),
  "descript":      (i) => (i.category === "Unmanaged Destination" && i.name === "Descript"),
  // Named website domains — also match identities with observed traffic to that domain
  "filetransfer.io":  (i) => (i.category === "Unmanaged Destination" && i.name === "filetransfer.io")  || (i.category === "Identity" && (i.tags?.includes("filetransfer.io") ?? false)),
  "wetransfer.com":   (i) => (i.category === "Unmanaged Destination" && i.name === "wetransfer.com")   || (i.category === "Identity" && (i.tags?.includes("wetransfer.com") ?? false)),
  "mega.nz":          (i) => (i.category === "Unmanaged Destination" && i.name === "mega.nz")          || (i.category === "Identity" && (i.tags?.includes("mega.nz") ?? false)),
  "pastebin.com":     (i) => (i.category === "Unmanaged Destination" && i.name === "pastebin.com")     || (i.category === "Identity" && (i.tags?.includes("pastebin.com") ?? false)),
  "replit.com":       (i) => (i.category === "Unmanaged Destination" && i.name === "replit.com")       || (i.category === "Identity" && (i.tags?.includes("replit.com") ?? false)),
  "reddit.com":       (i) => (i.category === "Unmanaged Destination" && i.name === "reddit.com")       || (i.category === "Identity" && (i.tags?.includes("reddit.com") ?? false)),
  "twitter.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "twitter.com")      || (i.category === "Identity" && (i.tags?.includes("twitter.com") ?? false)),
  "linkedin.com":     (i) => (i.category === "Unmanaged Destination" && i.name === "linkedin.com")     || (i.category === "Identity" && (i.tags?.includes("linkedin.com") ?? false)),
  "youtube.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "youtube.com")      || (i.category === "Identity" && (i.tags?.includes("youtube.com") ?? false)),
  "medium.com":       (i) => (i.category === "Unmanaged Destination" && i.name === "medium.com")       || (i.category === "Identity" && (i.tags?.includes("medium.com") ?? false)),
  "protonmail.com":   (i) => (i.category === "Unmanaged Destination" && i.name === "protonmail.com")   || (i.category === "Identity" && (i.tags?.includes("protonmail.com") ?? false)),
  "chatgpt.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "chatgpt.com")      || (i.category === "Identity" + (i.tags?.includes("chatgpt.com") ?? false)),
  "claude.ai":        (i) => (i.category === "Unmanaged Destination" && i.name === "claude.ai")        || (i.category === "Identity" && (i.tags?.includes("claude.ai") ?? false)),
  "perplexity.ai":    (i) => (i.category === "Unmanaged Destination" && i.name === "perplexity.ai")    || (i.category === "Identity" && (i.tags?.includes("perplexity.ai") ?? false)),
  "canva.com":        (i) => (i.category === "Unmanaged Destination" && i.name === "canva.com")        || (i.category === "Identity" && (i.tags?.includes("canva.com") ?? false)),
  "nordvpn.com":      (i) => (i.category === "Unmanaged Destination" && i.name === "nordvpn.com")      || (i.category === "Identity" && (i.tags?.includes("nordvpn.com") ?? false)),
  "torproject.org":   (i) => (i.category === "Unmanaged Destination" && i.name === "torproject.org")   || (i.category === "Identity" && (i.tags?.includes("torproject.org") ?? false)),
  "hackerone.com":    (i) => (i.category === "Unmanaged Destination" && i.name === "hackerone.com")    || (i.category === "Identity" && (i.tags?.includes("hackerone.com") ?? false)),
  "virustotal.com":   (i) => (i.category === "Unmanaged Destination" && i.name === "virustotal.com")   || (i.category === "Identity" && (i.tags?.includes("virustotal.com") ?? false)),
};

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
  const cat = CATEGORY_CONFIG[item.category] ?? {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
  };
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
            {item.category === "Identity" ? null : (item.category !== "Unstructured Data Store" && item.category !== "Unmanaged Destination" && item.category !== "Sensitive File" && item.category !== "Sensitive Column") ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${cat.bg} ${cat.text} ${cat.border}`}
                style={{ fontSize: "11px", fontWeight: 400 }}
              >
                {item.category}
              </span>
            ) : null}
          </div>

          <div
            className={`flex items-center gap-1.5 transition-colors ${isActive ? "text-primary" : "text-text-bright group-hover:text-primary"}`}
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            {item.category === "Unstructured Data Store" && (
              <Database size={13} className="shrink-0 opacity-60" />
            )}
            {item.category === "Unmanaged Destination" && item.navId === "unmanaged-application" && (
              <AppWindow size={13} className="shrink-0 opacity-60" />
            )}
            {item.category === "Unmanaged Destination" && item.navId === "unmanaged-websites" && (
              <Globe size={13} className="shrink-0 opacity-60" />
            )}
            {item.category === "Identity" && (
              <UserRound size={13} className="shrink-0 opacity-60" />
            )}
            {item.category === "Sensitive File" && (
              <FileText size={13} className="shrink-0 opacity-60" />
            )}
            {item.category === "Sensitive Column" && (
              <Columns2 size={13} className="shrink-0 opacity-60" />
            )}
            {item.name}
            {item.category === "Identity" && (() => {
              const IDENTITY_TYPE_STYLE: Record<string, { label: string; badge: string }> = {
                "internal-user":       { label: "Internal user",   badge: "bg-blue-500/10 text-blue-400"     },
                "external-user":       { label: "External user",   badge: "bg-sky-500/10 text-sky-400"       },
                "unknown-identity":    { label: "Unauthenticated", badge: "bg-red-500/10 text-red-400"       },
                "unmapped-local-user": { label: "Unmapped",        badge: "bg-orange-500/10 text-orange-400" },
                "service-account":     { label: "Service Account", badge: "bg-violet-500/10 text-violet-400" },
                "connected-app":       { label: "Connected App",   badge: "bg-pink-500/10 text-pink-400"     },
              };
              const s = IDENTITY_TYPE_STYLE[item.navId];
              if (!s) return null;
              return (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded ${s.badge}`}
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  {s.label}
                </span>
              );
            })()}
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

      {/* Source line — only for non-sensitive-file, non-identity cards */}
      {!isSensitiveFile && item.category !== "Identity" && (
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
  "unknown-identity",
  "unmapped-local-user",
  "service-account",
  "connected-app",
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
    if (row) return (<><IdentityDetailPanel row={row} navId={item.navId} /><ViewInTableButton navId={item.navId} onNavigate={onViewInTable} /></>);
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

  if (item.category === "Sensitive Column") {
    const table = item.details["Table"] ?? "";
    const dataType = item.details["Data Type"] ?? "";
    const field = {
      name: `${table}.${item.name}`,
      dataType,
      table,
      entityTypes: [dataType],
    };
    return <FieldDetailPane field={field} />;
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
  // Data store name search (Data Store mode only)
  const dsQuery = searchParams.get("dsq") || "";
  // Filter-mode: comma-separated FilterKey values from ?filters= param
  const filtersParam = searchParams.get("filters") || "";
  const barFilters = useMemo(
    () => (filtersParam ? (filtersParam.split(",").filter(f => f.trim()) as FilterKey[]) : []),
    [filtersParam],
  );
  const isFilterMode = barFilters.length > 0 && !query;

  // "Search on" scoping — only active when mode=filter is in the URL
  const isFilterModeUrl = searchParams.get("mode") === "filter";
  // resultType is null when no category has been chosen yet (shows "Select" placeholder)
  const resultType = searchParams.get("resultType") as string | null;
  const hasResultType = !!resultType;

  const RESULT_TYPE_SCOPE: Record<string, (item: SearchableItem) => boolean> = {
    "data-stores":     (i) => i.category === "Unstructured Data Store" || i.category === "Structured Data Store",
    "destinations":    (i) => i.category === "Unmanaged Destination",
    "sensitive-files": (i) => i.category === "Sensitive File" || i.category === "Sensitive Column",
    "identities":      (i) => i.category === "Identity",
  };
  const resultTypeScope = (isFilterModeUrl && hasResultType)
    ? (RESULT_TYPE_SCOPE[resultType!] ?? (() => true))
    : () => true;

  // Show empty "select a category" state when in filter mode with no category chosen
  const showCategorySelect = isFilterModeUrl && !hasResultType && !query;

  // Show full inventory only when there's no query and we're not in filter mode at all
  const sourceParam = searchParams.get("source") as FilterKey | null;
  const showFullInventory = !query && barFilters.length === 0 && !isFilterModeUrl && !sourceParam;

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null);
  const [selectedNavId, setSelectedNavId] = useState("unmanaged-application");

  useEffect(() => {
    setActiveFilter("all");
    setSelectedItem(null);
  }, [query, filtersParam]);

  const index = useMemo(() => buildSearchIndex(), []);

  // In filter mode: start from all items and apply bar filters (OR logic)
  // When a category is selected but no filter pills: show all items of that category
  // In NL mode: use search results
  const allResults = useMemo(() => {
    if (showCategorySelect) return [];
    if (isFilterModeUrl && hasResultType) {
      const all = buildSearchIndex();
      if (barFilters.length === 0) {
        // No filter pills yet — show all items for the selected category
        return all
          .filter(resultTypeScope)
          .filter((item) => !dsQuery || item.name.toLowerCase().includes(dsQuery.toLowerCase()));
      }
      const IDENTITY_FILTER_KEYS = new Set(["identity","identity-internal-user","identity-external-user","identity-stale","identity-active","identity-unknown-identity","identity-unmapped-local-user","identity-service-account","identity-connected-app"]);
      const allFiltersAreIdentity = barFilters.length > 0 && barFilters.every(k => IDENTITY_FILTER_KEYS.has(k));
      return all
        .filter((item) => barFilters.some((key) => FILTER_PREDICATES[key]?.(item)))
        .filter(allFiltersAreIdentity ? () => true : resultTypeScope)
        .filter((item) => !dsQuery || item.name.toLowerCase().includes(dsQuery.toLowerCase()));
    }
    // If there's no query but a source param is present, show all index items
    // so the sidebar pre-selection can filter them down.
    if (!query && sourceParam) {
      return index;
    }
    if (barFilters.length > 0 && !query) {
      return index.filter((item) => barFilters.some((key) => FILTER_PREDICATES[key]?.(item))).filter(resultTypeScope);
    }
    const searched = searchInventory(query, index).filter(resultTypeScope);
    if (barFilters.length > 0) {
      return searched.filter((item) => barFilters.some((key) => FILTER_PREDICATES[key]?.(item)));
    }
    return searched;
  }, [query, index, isFilterModeUrl, hasResultType, barFilters, resultTypeScope, showCategorySelect, dsQuery, sourceParam]);


  const filteredResults = useMemo(
    () => allResults.filter(FILTER_PREDICATES[activeFilter]),
    [allResults, activeFilter],
  );

  const handleNavigateToItem = (navId: string) =>
    navigate(`/inventory?nav=${navId}`);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search bar */}
      <InventorySearchBar initialQuery={query} autoFocus />

      {/* Content area */}
      {showCategorySelect ? (
        /* Empty state — waiting for user to pick a "Search on" category */
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Search size={18} className="text-primary/60" />
            </div>
            <div className="text-foreground/70 mb-1" style={{ fontSize: "15px" }}>
              Select a category to start exploring
            </div>
            <div className="text-muted-foreground" style={{ fontSize: "13px" }}>
              Use the <span className="text-foreground/60">Search on</span> dropdown above to choose Data Store, Identities, and more
            </div>
          </div>
        </div>
      ) : showFullInventory ? (
        <div className="flex flex-1 min-h-0">
          {/* Left: Navigation Tree */}
          <InventoryNav selectedId={selectedNavId} onSelect={setSelectedNavId} />

          {/* Right: Table or Dashboard */}
          <InventoryContent selectedNavId={selectedNavId} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {(() => {
            // ── Source-based sidebar pre-selection ──────────────────────────
            // ?source= is added by dashboard KPI click-throughs so the sidebar
            // is pre-focused on the originating cloud provider / managed app.
            const sourceParam = searchParams.get("source") as FilterKey | null;
            const effectiveActiveFilter: FilterKey =
              activeFilter !== "all"
                ? activeFilter
                : (sourceParam && (FILTER_PREDICATES as Record<string, unknown>)[sourceParam]
                    ? sourceParam
                    : "all");
            return (
          <div className="flex items-start justify-center px-6 py-5">
            <div style={{ width: "760px", minWidth: 0, flexShrink: 1 }}>
              {/* Result count */}
              {(() => {
                const MAX_DISPLAY = 200;
                // ── Bar-filter fallback ──────────────────────────────────────
                // When bar filters are active but we're not in `mode=filter`
                // (e.g. a misconfiguration chip was applied without a text
                // query), `allResults` / `filteredResults` comes back empty
                // because `searchInventory("")` returns []. Apply the bar
                // filters directly against the full index so those items still
                // appear.
                const baseResults: SearchableItem[] =
                  !isFilterModeUrl && barFilters.length > 0 && !query && filteredResults.length === 0
                    ? index
                        .filter((item) =>
                          barFilters.some(
                            (key) =>
                              (FILTER_PREDICATES as Record<string, (i: SearchableItem) => boolean>)[key]?.(item) ?? false,
                          ),
                        )
                        .filter(
                          (FILTER_PREDICATES as Record<string, (i: SearchableItem) => boolean>)[activeFilter] ??
                            (() => true),
                        )
                    : filteredResults;

                // Narrow results to the source-scoped provider when the user
                // hasn't yet manually chosen a different sidebar entry.
                const displayedResults =
                  effectiveActiveFilter !== "all" && activeFilter === "all"
                    ? baseResults.filter(
                        (item) => (FILTER_PREDICATES as Record<string, (i: SearchableItem) => boolean>)[effectiveActiveFilter]?.(item) ?? true,
                      )
                    : baseResults;
                const actualCount = displayedResults.length;
                const isCapped = actualCount > MAX_DISPLAY;
                const totalCount = actualCount;
                const cappedResults = isCapped ? displayedResults.slice(0, MAX_DISPLAY) : displayedResults;

                return (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      {actualCount > 0 && (
                        <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                          <span className="text-text-bright" style={{ fontWeight: 500 }}>
                            {totalCount.toLocaleString()}
                          </span>{" "}
                          {totalCount === 1 ? "result" : "results"}
                          {effectiveActiveFilter !== "all" && (
                            <span className="text-muted-foreground"> · filtered</span>
                          )}
                        </span>
                      )}
                      {actualCount > 0 && (
                        <button
                          onClick={() => {
                            const headers = ["Name", "Category", "Source", "Subtitle", ...Array.from(new Set(cappedResults.flatMap(r => Object.keys(r.details))))];
                            const rows = cappedResults.map(r => [
                              r.name,
                              r.category,
                              r.source ?? "",
                              r.subtitle ?? "",
                              ...headers.slice(4).map(h => r.details[h] ?? ""),
                            ]);
                            const csv = [headers, ...rows]
                              .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
                              .join("\n");
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-raised hover:bg-nav-active/50 hover:border-primary/30 text-text-bright transition-colors"
                          style={{ fontSize: "12px", fontWeight: 500 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Export
                        </button>
                      )}
                    </div>

                    {/* Cap hint banner — hidden when there are no results */}
                    {actualCount > 0 && (
                      <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 rounded-lg border"
                        style={{
                          background: "rgba(212, 149, 42, 0.06)",
                          borderColor: "rgba(212, 149, 42, 0.25)",
                        }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4952a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
                          <span style={{ color: "#d4952a", fontWeight: 600 }}>
                            Showing {MAX_DISPLAY.toLocaleString()} of {totalCount.toLocaleString()} results.
                          </span>
                          <span className="text-muted-foreground">
                            {" "}Apply filters to narrow down your search results.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {cappedResults.length > 0 ? (
                      <div className="space-y-3">
                        {cappedResults.map((item) => (
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
                  </>
                );
              })()}
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {/* Side panel for item detail */}
      <SidePanel
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name ?? ""}
        subtitle={
          selectedItem?.category === "Identity"
            ? (IDENTITY_TYPE_LABEL[selectedItem.navId] ?? selectedItem.source)
            : (selectedItem?.subtitle ?? selectedItem?.source)
        }
        subtitleExtra={
          selectedItem?.category === "Identity" && selectedItem.tags?.includes("stale")
            ? (
              <span
                className="inline-flex items-center px-1.5 py-px rounded-full border bg-pink-500/10 text-pink-400 border-pink-500/20"
                style={{ fontSize: "11px", fontWeight: 400 }}
              >
                Stale
              </span>
            )
            : undefined
        }
        hideHeader={selectedItem?.category === "Sensitive Column"}
        panelType={selectedItem?.category === "Sensitive File" ? "file" : selectedItem?.category === "Identity" ? "identity" : undefined}
        headerActions={
          selectedItem?.category === "Sensitive File" ? <FileActionsMenu /> : undefined
        }
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