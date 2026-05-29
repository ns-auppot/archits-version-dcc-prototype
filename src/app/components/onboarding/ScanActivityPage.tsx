// Scan Activity — Step 5 of setup.
// Lists every CONNECTED data store with live scan progress. Click a row to open
// a side-panel drawer with two tabs: Activity (scan progress, errors, log) and
// Settings (edit credentials, scan frequency, capabilities — reuses the wizard
// shape inline).

import { useState, useEffect, type ReactNode } from "react";
import {
  Clock, RefreshCw, Check, AlertTriangle, Archive, X, Edit,
  ExternalLink, Search, Filter, ChevronDown, Database,
  ArrowRight, ArrowLeft, Activity, Info, Sparkles, Settings2,
  Save,
} from "lucide-react";
import type { ConnectedStore, StepStatus } from "./types";
import { InfoTip } from "./InfoTip";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface NotClassifiableEntry {
  count: number;
  reason: string;
}

interface HistoryEntry {
  ts: string;
  type: "ok" | "info" | "warn" | "error" | "progress";
  msg: string;
}

interface ChangeLogEntry {
  ts: string;
  by: string;
  field: string;
  from: string;
  to: string;
}

interface ScanError {
  code: string;
  title: string;
  detail: string;
  remediations: Array<{ label: string; href: string }>;
}

interface ScanStore {
  id: string;
  service: string;
  account: string;
  endpoint: string;
  provider: string;
  region: string;
  scanState: "queued" | "running" | "completed" | "error" | "archived";
  scanType: string;
  progress: number;
  filesScanned: number;
  filesTotal: number;
  classifiableFiles: number | string;
  sampledFiles: number | string;
  sensitiveFiles: number | string;
  notClassifiable: NotClassifiableEntry[];
  sizeScanned: string;
  sizeTotal: string;
  lastScan: string;
  nextScan: string;
  history: HistoryEntry[];
  changeLog: ChangeLogEntry[];
  error?: ScanError;
  justConnected?: boolean;
}

interface ScanActivityPageProps {
  setupActive: boolean;
  onBackToHub: () => void;
  onSaveStep: (markDone: boolean) => void;
  status: StepStatus;
  connectedStores: ScanStore[];
  onArchive?: (store: ScanStore) => void;
  onViewInventory?: (store: ScanStore) => void;
}

/* ------------------------------------------------------------------ */
/*  Mock seed data                                                    */
/* ------------------------------------------------------------------ */

const SCAN_SEED_STORES: ScanStore[] = [
  {
    id: "sa-1",
    service: "Redshift",
    account: "production-main",
    endpoint: "analytics.cluster-abc.us-west-2.redshift.amazonaws.com:5439/dev",
    provider: "aws",
    region: "us-west-2",
    scanState: "running",
    scanType: "smart",
    progress: 64,
    filesScanned: 12_400,
    filesTotal: 19_300,
    classifiableFiles: 18_900,
    sampledFiles: 13_900,
    sensitiveFiles: 412,
    notClassifiable: [
      { count: 240, reason: "Unsupported file type (.exe, .iso, .dmg)" },
      { count: 96, reason: "File size > 128 MB (cap)" },
      { count: 64, reason: "Encryption at rest with customer-managed key (no access)" },
    ],
    sizeScanned: "512 GB",
    sizeTotal: "780 GB",
    lastScan: "in progress",
    nextScan: "in 23h",
    history: [
      { ts: "just now", type: "progress", msg: "Scanned 12,400 of 19,300 files (64%)" },
      { ts: "8m ago", type: "info", msg: "Scan resumed on partition `events_2026_q1`" },
      { ts: "12m ago", type: "warn", msg: "4 files skipped — unsupported encoding" },
      { ts: "2h ago", type: "info", msg: "Smart Discovery sample of 13,900 files selected" },
      { ts: "2h ago", type: "info", msg: "Scan started — Smart Discovery scan, daily schedule" },
    ],
    changeLog: [
      { ts: "Apr 12, 14:02", by: "archie@billion.com", field: "Scan frequency", from: "Hourly", to: "Daily (Recommended)" },
      { ts: "Apr 10, 09:30", by: "archie@billion.com", field: "Privilege analysis", from: "Off", to: "On" },
      { ts: "Apr 08, 16:14", by: "archie@billion.com", field: "Connected", from: "—", to: "Smart scan, daily" },
    ],
  },
  {
    id: "sa-2",
    service: "S3",
    account: "production-main",
    endpoint: "acme-customer-events",
    provider: "aws",
    region: "us-west-2",
    scanState: "completed",
    scanType: "smart",
    progress: 100,
    filesScanned: 8_240,
    filesTotal: 8_240,
    classifiableFiles: 8_098,
    sampledFiles: 4_000,
    sensitiveFiles: 287,
    notClassifiable: [{ count: 142, reason: "File size > 128 MB (cap)" }],
    sizeScanned: "1.2 TB",
    sizeTotal: "1.2 TB",
    lastScan: "5h ago",
    nextScan: "in 19h",
    history: [
      { ts: "5h ago", type: "ok", msg: "Scan completed — 8,240 files classified" },
      { ts: "6h ago", type: "info", msg: "Smart Discovery sample of 4,000 files selected" },
      { ts: "6h ago", type: "info", msg: "Scan started — Smart Discovery scan, daily schedule" },
      { ts: "2d ago", type: "ok", msg: "Connection established · 8,240 files indexed" },
    ],
    changeLog: [
      { ts: "Apr 11, 11:20", by: "archie@billion.com", field: "Scan type", from: "Deep scan", to: "Smart scan" },
      { ts: "Apr 09, 08:45", by: "archie@billion.com", field: "Connected", from: "—", to: "Deep scan, daily" },
    ],
  },
  {
    id: "sa-3",
    service: "PostgreSQL",
    account: "AWS Staging",
    endpoint: "staging-pg.cluster-xyz.us-east-1.rds.amazonaws.com:5432/app",
    provider: "aws",
    region: "us-east-1",
    scanState: "error",
    scanType: "smart",
    progress: 12,
    filesScanned: 240,
    filesTotal: 0,
    classifiableFiles: "—",
    sampledFiles: "—",
    sensitiveFiles: "—",
    notClassifiable: [],
    sizeScanned: "—",
    sizeTotal: "—",
    error: {
      code: "CONN_REFUSED",
      title: "Connection refused",
      detail:
        "Scanner could not reach 10.0.18.42:5432. Check VPC peering and security group ingress for the assigned scanner pool.",
      remediations: [
        { label: "Open VPC settings in AWS", href: "#" },
        { label: "Inspect scanner pool eu-west-prod-01", href: "#" },
      ],
    },
    lastScan: "14m ago",
    nextScan: "after fix",
    history: [
      { ts: "14m ago", type: "error", msg: "Connection refused — 10.0.18.42:5432 (CONN_REFUSED)" },
      { ts: "14m ago", type: "warn", msg: "Retrying with backoff (attempt 3 of 3)" },
      { ts: "15m ago", type: "info", msg: "Scan started — daily schedule" },
    ],
    changeLog: [
      { ts: "Apr 12, 10:12", by: "archie@billion.com", field: "Connected", from: "—", to: "Smart scan, daily" },
    ],
  },
];

const SCAN_PROVIDER_TABS = [
  { id: "all", label: "All" },
  { id: "aws", label: "AWS" },
  { id: "gcp", label: "GCP" },
  { id: "azure", label: "Azure" },
  { id: "oci", label: "OCI" },
];

const SCAN_TOP_TABS = [
  { id: "connections", label: "Connections" },
  { id: "errors", label: "Errors only" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmtNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "—") return "—";
  return Number(n).toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  ServiceGlyph — small colored label box for a service name         */
/* ------------------------------------------------------------------ */

interface ServiceGlyphProps {
  name: string;
  size?: number;
}

const GLYPH_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  S3: { bg: "bg-amber-100", fg: "text-amber-600", label: "S3" },
  Oracle: { bg: "bg-red-100", fg: "text-red-600", label: "OR" },
  "SQL Server": { bg: "bg-indigo-100", fg: "text-indigo-600", label: "SQ" },
  MySQL: { bg: "bg-blue-100", fg: "text-blue-600", label: "My" },
  Redshift: { bg: "bg-amber-100", fg: "text-amber-600", label: "RS" },
  PostgreSQL: { bg: "bg-blue-100", fg: "text-blue-700", label: "pg" },
  Aurora: { bg: "bg-red-100", fg: "text-red-600", label: "Au" },
  DynamoDB: { bg: "bg-blue-100", fg: "text-blue-600", label: "Dy" },
  Snowflake: { bg: "bg-blue-100", fg: "text-cyan-600", label: "SF" },
  Databricks: { bg: "bg-red-100", fg: "text-red-600", label: "DB" },
  MongoDB: { bg: "bg-green-100", fg: "text-green-600", label: "Mo" },
};

function ServiceGlyph({ name, size = 18 }: ServiceGlyphProps) {
  const m = GLYPH_MAP[name] || { bg: "bg-slate-100", fg: "text-slate-500", label: name.slice(0, 2).toUpperCase() };
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded text-[9px] font-bold tracking-tight ${m.bg} ${m.fg}`}
      style={{ width: size + 6, height: size + 6 }}
    >
      {m.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  StateChip                                                         */
/* ------------------------------------------------------------------ */

interface StateChipProps {
  state: string;
}

function StateChip({ state }: StateChipProps) {
  const map: Record<string, { color: string; bg: string; label: string; icon: typeof Clock; spin?: boolean }> = {
    queued: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Queued", icon: Clock },
    running: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Scanning", icon: RefreshCw, spin: true },
    completed: { color: "text-green-600", bg: "bg-green-500/10", label: "Completed", icon: Check },
    error: { color: "text-red-600", bg: "bg-red-500/10", label: "Error", icon: AlertTriangle },
    archived: { color: "text-slate-500", bg: "bg-slate-500/10", label: "Archived", icon: Archive },
  };
  const m = map[state] || map.queued;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${m.bg} ${m.color} text-[11px] font-semibold whitespace-nowrap`}>
      <Icon size={11} className={m.spin ? "animate-spin" : ""} /> {m.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MiniProgress                                                      */
/* ------------------------------------------------------------------ */

interface MiniProgressProps {
  value: number;
  color?: string;
}

function MiniProgress({ value, color = "#3b82f6" }: MiniProgressProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-black/[0.06] dark:bg-white/10 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="tabular-nums text-[11px] text-slate-500 dark:text-slate-400 font-semibold min-w-[34px] text-right">
        {value}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ToggleSwitch                                                      */
/* ------------------------------------------------------------------ */

interface ToggleSwitchProps {
  on: boolean;
}

function ToggleSwitch({ on }: ToggleSwitchProps) {
  return (
    <span
      className={`relative inline-block w-8 h-[18px] rounded-full transition-colors duration-150 ${
        on ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-[left] duration-150 ease-out"
        style={{ left: on ? 16 : 2 }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  StatTile                                                          */
/* ------------------------------------------------------------------ */

interface StatTileProps {
  label: string;
  value: number | string;
  color: string;
  sub?: string;
  tooltip?: ReactNode;
}

function StatTile({ label, value, color, sub, tooltip }: StatTileProps) {
  const display = fmtNum(value);
  return (
    <div className="bg-white dark:bg-slate-900 border border-black/[0.06] dark:border-white/10 rounded-lg px-3.5 py-2.5">
      <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase inline-flex items-center">
        {label}
        {tooltip && <InfoTip label={label}>{tooltip}</InfoTip>}
      </div>
      <div className="tabular-nums text-xl font-bold mt-1 leading-none" style={{ color }}>
        {display}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StoreDetailsDrawer                                                */
/* ------------------------------------------------------------------ */

interface StoreDetailsDrawerProps {
  open: boolean;
  store: ScanStore | undefined;
  onClose: () => void;
  onArchive?: (store: ScanStore) => void;
  onUpdate?: (settings: {
    scanType: string;
    scanFreq: string;
    scannerPool: string;
    privAnalysis: boolean;
    dataInUse: boolean;
    shadowAnalysis: boolean;
  }) => void;
  onViewInventory?: (store: ScanStore) => void;
}

function StoreDetailsDrawer({ open, store, onClose, onArchive, onUpdate, onViewInventory }: StoreDetailsDrawerProps) {
  const [tab, setTab] = useState("scan-details");
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [scanType, setScanType] = useState(store?.scanType || "smart");
  const [scanFreq, setScanFreq] = useState("Daily (Recommended)");
  const [scannerPool, setScannerPool] = useState("");
  const [privAnalysis, setPrivAnalysis] = useState(true);
  const [dataInUse, setDataInUse] = useState(false);
  const [shadowAnalysis, setShadowAnalysis] = useState(true);

  useEffect(() => {
    if (open) {
      setTab("scan-details");
      setEditing(false);
      setScanType(store?.scanType || "smart");
    }
  }, [open, store?.id]);

  if (!open || !store) return null;

  const drawerTabs = [
    { id: "scan-details", label: "Scan details" },
    { id: "activity", label: "Activity log" },
    { id: "change-log", label: "Change log" },
  ];

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[520px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ServiceGlyph name={store.service} size={20} />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                {store.account} &middot; {store.region}
              </div>
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mt-0.5 leading-tight truncate">
                {store.endpoint}
              </h3>
            </div>
          </div>
          <StateChip state={store.scanState} />
          {!editing && (
            <button
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ml-1.5"
              onClick={() => setEditing(true)}
            >
              <Edit size={12} /> Edit settings
            </button>
          )}
          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs (hidden when editing) */}
        {!editing && (
          <div className="flex gap-4 px-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            {drawerTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`bg-transparent border-none py-2.5 px-0.5 text-[13px] cursor-pointer relative top-px whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "font-semibold text-slate-900 dark:text-slate-100 border-b-2 border-blue-500"
                    : "font-medium text-slate-500 dark:text-slate-400 border-b-2 border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* ========== SCAN DETAILS TAB ========== */}
          {!editing && tab === "scan-details" && (
            <>
              {/* Error block */}
              {store.error && (
                <div className="flex gap-3 p-4 rounded-lg border border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-900/10">
                  <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {store.error.title}
                      <code className="text-[10.5px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-mono">
                        {store.error.code}
                      </code>
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {store.error.detail}
                    </div>
                    <div className="flex gap-2 mt-2.5 flex-wrap">
                      {store.error.remediations.map((r, i) => (
                        <a
                          key={i}
                          href={r.href}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer no-underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          <ExternalLink size={12} /> {r.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress + file-count block */}
              {!store.error &&
                (() => {
                  const sampled =
                    store.sampledFiles && typeof store.sampledFiles === "number"
                      ? store.sampledFiles
                      : store.filesTotal;
                  const pct = sampled
                    ? Math.min(100, Math.round((store.filesScanned / sampled) * 100))
                    : store.progress || 0;
                  const remaining = Math.max(0, sampled - store.filesScanned);
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5">
                      <div className="flex justify-between items-baseline">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {store.scanState === "completed" ? "Last scan" : "Current scan"}
                        </div>
                        <div className="text-[11.5px] text-slate-500">
                          {store.scanType === "smart" ? "Smart Discovery scan" : "Deep scan"} &middot; daily
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <MiniProgress
                          value={pct}
                          color={store.scanState === "completed" ? "#16a34a" : "#3b82f6"}
                        />
                      </div>
                      <div className="tabular-nums mt-2 flex justify-between text-[12px] text-slate-500 dark:text-slate-400">
                        <span>
                          <strong className="text-slate-900 dark:text-slate-100">
                            {fmtNum(store.filesScanned)}
                          </strong>{" "}
                          scanned
                          <span className="text-slate-400"> &middot; {fmtNum(remaining)} remaining</span>
                        </span>
                        <span className="text-slate-400">
                          of {fmtNum(sampled)} files queued for DLP content scan
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 pt-2 border-t border-black/5 dark:border-white/5 flex justify-between">
                        <span>
                          {store.sizeScanned} of {store.sizeTotal}
                        </span>
                        <span>Next scan {store.nextScan}</span>
                      </div>
                    </div>
                  );
                })()}

              {/* Scan breakdown */}
              {!store.error && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Scan breakdown
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <StatTile
                      label="Sampled for DLP scan"
                      value={store.sampledFiles}
                      color="#3b82f6"
                      sub={
                        store.scanType === "smart"
                          ? "Files queued for content classification"
                          : "Full content scan target"
                      }
                      tooltip={
                        <>
                          <strong>Sampled files</strong> are the subset selected for content
                          classification by the DLP engine. For Smart scans, AI picks a representative
                          subset; for Deep scans, it covers the full classifiable set. Progress is
                          measured against this number.
                        </>
                      }
                    />
                    <StatTile
                      label="Sensitive files found"
                      value={store.sensitiveFiles}
                      color="#dc2626"
                      sub="Classified as containing sensitive data"
                    />
                  </div>
                  {/* Secondary context */}
                  <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 flex gap-6 text-[11.5px] text-slate-400">
                    <span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-300 font-medium">
                        {fmtNum(store.classifiableFiles)}
                      </span>{" "}
                      classifiable
                    </span>
                    <span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-300 font-medium">
                        {fmtNum(store.filesTotal)}
                      </span>{" "}
                      Total
                    </span>
                  </div>
                </div>
              )}

              {/* Not classifiable reasons */}
              {!store.error && store.notClassifiable && store.notClassifiable.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                    <AlertTriangle size={11} className="text-orange-500" />
                    Not classifiable
                    <span className="text-slate-400 font-medium ml-auto">
                      {fmtNum(store.notClassifiable.reduce((s, r) => s + r.count, 0))} total
                    </span>
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {store.notClassifiable.map((r, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-[12.5px]">
                        <span className="tabular-nums min-w-[62px] px-2 py-0.5 rounded bg-orange-500/[0.08] text-orange-500 text-[11.5px] font-semibold text-right">
                          {fmtNum(r.count)}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* View in Inventory CTA */}
              {!store.error && (
                <button
                  type="button"
                  onClick={() => {
                    onViewInventory && onViewInventory(store);
                    onClose();
                  }}
                  className="w-full p-3.5 cursor-pointer rounded-lg border border-blue-500/30 bg-blue-500/[0.04] dark:bg-blue-500/10 flex items-center gap-3 text-left font-inherit"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/[0.12] text-blue-500 flex items-center justify-center shrink-0">
                    <Database size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      View scan results in Inventory
                    </div>
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Browse sensitive data types, classifications, and entities discovered in this
                      store.
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-blue-500 shrink-0" />
                </button>
              )}
            </>
          )}

          {/* ========== ACTIVITY TAB ========== */}
          {!editing && tab === "activity" && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 my-1 mb-2.5">
                Scan activity
              </div>
              <ol className="list-none p-0 m-0 flex flex-col gap-2">
                {(store.history || []).map((h, i) => (
                  <li
                    key={i}
                    className="grid items-start gap-2.5 text-[12px]"
                    style={{ gridTemplateColumns: "78px 16px 1fr" }}
                  >
                    <span className="text-slate-400">{h.ts}</span>
                    <span className="inline-flex w-4 h-4 items-center justify-center">
                      {h.type === "ok" && <Check size={11} className="text-green-600" />}
                      {h.type === "info" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      )}
                      {h.type === "warn" && (
                        <AlertTriangle size={11} className="text-orange-500" />
                      )}
                      {h.type === "error" && (
                        <AlertTriangle size={11} className="text-red-600" />
                      )}
                      {h.type === "progress" && (
                        <Activity size={11} className="text-blue-500" />
                      )}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">{h.msg}</span>
                  </li>
                ))}
                {(store.history || []).length === 0 && (
                  <li className="text-[12px] text-slate-400 py-3">No scan activity recorded yet.</li>
                )}
              </ol>
            </div>
          )}

          {/* ========== CHANGE LOG TAB ========== */}
          {!editing && tab === "change-log" && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 my-1 mb-2.5">
                Configuration changes
              </div>
              {(!store.changeLog || store.changeLog.length === 0) ? (
                <div className="text-[12px] text-slate-400 py-3">No configuration changes yet.</div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                  <div
                    className="grid px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800"
                    style={{ gridTemplateColumns: "1.2fr 1.4fr 1fr 1.4fr" }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      When
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Field
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      From
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      To
                    </span>
                  </div>
                  {store.changeLog.map((c, i) => (
                    <div
                      key={i}
                      className="grid px-3.5 py-2.5 items-start border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                      style={{ gridTemplateColumns: "1.2fr 1.4fr 1fr 1.4fr" }}
                    >
                      <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                        <div>{c.ts}</div>
                        <div className="text-slate-400 text-[11px]">{c.by}</div>
                      </span>
                      <span className="text-[12px] text-slate-900 dark:text-slate-100 font-medium">
                        {c.field}
                      </span>
                      <span className="text-[12px] text-slate-400">{c.from}</span>
                      <span className="text-[12px] text-slate-800 dark:text-slate-200 font-medium">
                        {c.to}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== EDITING MODE ========== */}
          {editing && (
            <>
              {/* Info callout */}
              <div className="flex gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
                <div className="text-[12px] text-slate-500 dark:text-slate-400">
                  Changes take effect from the next scan. A change-log entry is created when you save.
                </div>
              </div>

              {/* Scan type */}
              <div className="flex flex-col gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    Scan type
                  </div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    Smart for AI-driven sampling, Deep for full content classification.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setScanType("smart")}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      scanType === "smart"
                        ? "border-blue-500 bg-blue-500/[0.06] dark:bg-blue-500/10"
                        : "border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Sparkles size={14} className={scanType === "smart" ? "text-blue-500" : "text-slate-400"} />
                    <div className="text-left">
                      <div className={`text-[12px] font-semibold ${scanType === "smart" ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                        Smart scan
                      </div>
                      <div className="text-[11px] text-slate-400">AI-driven sampling</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanType("deep")}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      scanType === "deep"
                        ? "border-blue-500 bg-blue-500/[0.06] dark:bg-blue-500/10"
                        : "border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Settings2 size={14} className={scanType === "deep" ? "text-blue-500" : "text-slate-400"} />
                    <div className="text-left">
                      <div className={`text-[12px] font-semibold ${scanType === "deep" ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                        Deep scan
                      </div>
                      <div className="text-[11px] text-slate-400">Targeted, full content</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Frequency + Scanner pool */}
              <div className="flex gap-3">
                <label className="flex flex-col gap-1.5 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Scan frequency
                  </span>
                  <select
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    value={scanFreq}
                    onChange={(e) => setScanFreq(e.target.value)}
                  >
                    <option>Daily (Recommended)</option>
                    <option>Hourly</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Scanner pool
                  </span>
                  <select
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    value={scannerPool}
                    onChange={(e) => setScannerPool(e.target.value)}
                  >
                    <option value="">Tenant cloud</option>
                    <option value="pool-eu-west">EU West Production</option>
                    <option value="pool-a">Standalone Pool A</option>
                  </select>
                </label>
              </div>

              {/* Capability toggles */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      Privilege analysis
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      Surface over-privileged accounts and orphaned permissions.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivAnalysis(!privAnalysis)}
                    className="bg-transparent border-none cursor-pointer p-0"
                  >
                    <ToggleSwitch on={privAnalysis} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      Data-in-use monitoring
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      Track who is reading sensitive objects in real time.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDataInUse(!dataInUse)}
                    className="bg-transparent border-none cursor-pointer p-0"
                  >
                    <ToggleSwitch on={dataInUse} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      Shadow data analysis
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      Flag stale data sets not accessed within your retention window.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShadowAnalysis(!shadowAnalysis)}
                    className="bg-transparent border-none cursor-pointer p-0"
                  >
                    <ToggleSwitch on={shadowAnalysis} />
                  </button>
                </div>
              </div>

              {/* Archive danger zone */}
              <div className="flex gap-3 p-4 rounded-lg border border-red-200/50 dark:border-red-500/20 bg-red-50/30 dark:bg-red-900/10">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    Archive this connection
                  </div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    Stops scans and removes the store from Scan Activity. The connection can be
                    reactivated later from Data Store Connections &rarr; Archived.
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0 self-center"
                  onClick={() => setConfirmArchive(true)}
                >
                  <Archive size={12} /> Archive
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
          {editing ? (
            <>
              <button
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
                onClick={() => {
                  onUpdate &&
                    onUpdate({ scanType, scanFreq, scannerPool, privAnalysis, dataInUse, shadowAnalysis });
                  setEditing(false);
                }}
              >
                <Save size={13} /> Save changes
              </button>
            </>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Archive confirmation dialog */}
      {confirmArchive && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 dark:bg-black/60 flex items-center justify-center"
          onClick={() => setConfirmArchive(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-3 text-[15px] font-semibold text-slate-900 dark:text-slate-100 m-0">
              <span className="inline-flex w-8 h-8 rounded-full bg-red-500/10 text-red-600 items-center justify-center shrink-0">
                <AlertTriangle size={16} />
              </span>
              Archive this connection?
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Scans will stop and findings will be removed from active dashboards. The connection can
              be reactivated later from{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                Data Store Connections &rarr; Archived
              </strong>
              .
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => setConfirmArchive(false)}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 border-none cursor-pointer"
                onClick={() => {
                  onArchive && onArchive(store);
                  setConfirmArchive(false);
                  onClose();
                }}
              >
                <Archive size={12} /> Archive connection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Scan Activity Page                                           */
/* ------------------------------------------------------------------ */

export function ScanActivityPage({
  setupActive,
  onBackToHub,
  onSaveStep,
  status,
  connectedStores,
  onArchive,
  onViewInventory,
}: ScanActivityPageProps) {
  const [provider, setProvider] = useState("all");
  const [tab, setTab] = useState("connections");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const [, setTickFlag] = useState(0);

  // Live tick -- every 1.5s nudges running rows
  useEffect(() => {
    const t = setInterval(() => setTickFlag((f) => f + 1), 1500);
    return () => clearInterval(t);
  }, []);

  // Combine prop'd recently-connected stores with seed
  const allStores: ScanStore[] = [...connectedStores, ...SCAN_SEED_STORES];

  // Apply live progress simulation to "running" rows (visual only)
  const rows = allStores.map((s) => {
    if (s.scanState !== "running") return s;
    const bumped = Math.min(100, (s.progress || 0) + 1);
    return { ...s, progress: bumped, scanState: (bumped >= 100 ? "completed" : "running") as ScanStore["scanState"] };
  });

  const filtered = rows.filter((s) => {
    if (tab === "errors" && s.scanState !== "error") return false;
    if (provider !== "all" && (s.provider || "aws") !== provider) return false;
    const q = query.trim().toLowerCase();
    if (
      q &&
      !s.service.toLowerCase().includes(q) &&
      !s.endpoint.toLowerCase().includes(q) &&
      !s.account.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const counts = SCAN_PROVIDER_TABS.reduce<Record<string, number>>((m, t) => {
    m[t.id] = t.id === "all" ? rows.length : rows.filter((r) => (r.provider || "aws") === t.id).length;
    return m;
  }, {});

  const errorCount = rows.filter((r) => r.scanState === "error").length;
  const runningCount = rows.filter((r) => r.scanState === "running").length;
  const completedCount = rows.filter((r) => r.scanState === "completed").length;
  const canMarkDone = rows.length > 0;

  const openedStore = rows.find((s) => s.id === opened);

  return (
    <div className="p-6 flex flex-col gap-4 pb-0">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Scan Activity</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Live scan status for every connected data store. Click a row to see progress and errors,
            or to edit scan settings.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
          <ExternalLink size={13} /> Configure webhook alerts
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{rows.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Connected stores</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
          <div className={`text-2xl font-bold ${runningCount > 0 ? "text-blue-500" : "text-slate-400"}`}>
            {runningCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Scanning now</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
          <div className={`text-2xl font-bold ${completedCount > 0 ? "text-green-600" : "text-slate-400"}`}>
            {completedCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Completed (last)</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
          <div className={`text-2xl font-bold ${errorCount > 0 ? "text-red-600" : "text-slate-400"}`}>
            {errorCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Errors</div>
        </div>
      </div>

      {/* Top tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {SCAN_TOP_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`bg-transparent border-none py-2.5 px-1 text-[14px] cursor-pointer relative top-px whitespace-nowrap transition-colors ${
              tab === t.id
                ? "font-semibold text-slate-900 dark:text-slate-100 border-b-2 border-blue-500"
                : "font-medium text-slate-500 dark:text-slate-400 border-b-2 border-transparent"
            }`}
          >
            {t.label}
            {t.id === "errors" && errorCount > 0 && (
              <span className="ml-2 px-1.5 py-px rounded-full bg-red-500/10 text-red-600 text-[10.5px] font-bold">
                {errorCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1">
        {SCAN_PROVIDER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setProvider(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border cursor-pointer transition-colors ${
              provider === t.id
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[11px] text-slate-400 font-medium">({counts[t.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 flex gap-2.5 items-center">
        <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-w-[100px]">
          <Filter size={12} /> Filter <ChevronDown size={11} className="ml-0.5" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
          <Search size={14} className="text-slate-400" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            placeholder="Search contains…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="px-5 pt-3 pb-1.5">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} Connected Store{filtered.length === 1 ? "" : "s"}
          </h3>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 px-5 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3.5 bg-blue-500/10 flex items-center justify-center">
              <Activity size={22} className="text-blue-500" />
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              {tab === "errors" ? "No scan errors right now" : "No connected data stores yet"}
            </h3>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 max-w-[380px] mx-auto mt-1.5">
              {tab === "errors"
                ? "When a scan fails, it appears here with diagnostics and remediation links."
                : "Once you connect a data store, scans appear here in real time."}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <>
            {/* Column headers */}
            <div
              className="grid px-5 py-2.5 border-b border-slate-100 dark:border-slate-800"
              style={{ gridTemplateColumns: "1fr 1fr 1.5fr 110px 120px 1.4fr 100px 70px" }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Service
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Account
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Endpoint
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Region
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Progress
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Last scan
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">
                Actions
              </span>
            </div>

            {/* Rows */}
            {filtered.map((s) => (
              <div
                key={s.id}
                className={`grid px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  s.justConnected ? "bg-blue-500/[0.04] dark:bg-blue-500/[0.06]" : ""
                }`}
                style={{ gridTemplateColumns: "1fr 1fr 1.5fr 110px 120px 1.4fr 100px 70px" }}
                onClick={() => setOpened(s.id)}
              >
                <span className="flex items-center gap-2 text-[12.5px] text-slate-900 dark:text-slate-100 font-medium">
                  <ServiceGlyph name={s.service} size={16} /> {s.service}
                  {s.justConnected && (
                    <span className="inline-flex px-1.5 py-0.5 text-[9.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded tracking-wider">
                      NEW
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-slate-800 dark:text-slate-200 truncate self-center">
                  {s.account}
                </span>
                <span className="text-[12px] text-slate-800 dark:text-slate-200 font-mono truncate self-center">
                  <span className="text-blue-500 hover:text-blue-600">{s.endpoint}</span>
                </span>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 self-center">
                  {s.region}
                </span>
                <span className="self-center">
                  <StateChip state={s.scanState} />
                </span>
                <span className="flex flex-col min-w-0 gap-1 self-center">
                  <MiniProgress
                    value={
                      typeof s.sampledFiles === "number" && s.sampledFiles
                        ? Math.round((s.filesScanned / s.sampledFiles) * 100)
                        : s.progress || 0
                    }
                    color={
                      s.scanState === "completed"
                        ? "#16a34a"
                        : s.scanState === "error"
                          ? "#dc2626"
                          : "#3b82f6"
                    }
                  />
                  <span className="tabular-nums text-[10.5px] text-slate-400 truncate">
                    {fmtNum(s.filesScanned)} /{" "}
                    {fmtNum(typeof s.sampledFiles === "number" ? s.sampledFiles : s.filesTotal)} files
                  </span>
                </span>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 self-center">
                  {s.lastScan || "—"}
                </span>
                <span
                  className="flex justify-end items-center gap-1 self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                    title="View in Inventory"
                    aria-label="View in Inventory"
                    onClick={() => onViewInventory && onViewInventory(s)}
                  >
                    <Database size={13} />
                  </button>
                  <button
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                    title="Edit Data Store Connection"
                    aria-label="Edit Data Store Connection"
                    onClick={() => setOpened(s.id)}
                  >
                    <Edit size={13} />
                  </button>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Drawer */}
      <StoreDetailsDrawer
        open={!!opened}
        store={openedStore}
        onClose={() => setOpened(null)}
        onArchive={onArchive}
        onUpdate={() => {}}
        onViewInventory={onViewInventory}
      />

      {/* Setup-mode footer */}
      {setupActive && (
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-end gap-3 -mx-6">
          <span className="text-[12px] text-slate-400 mr-auto">
            {canMarkDone
              ? `${rows.length} store${rows.length === 1 ? "" : "s"} scanning · scan progress is healthy`
              : "Connect a data store to see scan activity here"}
          </span>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border-none hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onBackToHub}
          >
            <ArrowLeft size={13} /> Back to Setup Summary
          </button>
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border-none cursor-pointer ${
              status === "done"
                ? "text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                : "text-white bg-blue-500 hover:bg-blue-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={() => onSaveStep(status !== "done")}
            disabled={status !== "done" && !canMarkDone}
          >
            {status === "done" ? (
              "Mark not complete"
            ) : (
              <>
                Mark step complete <Check size={13} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
