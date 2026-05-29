/**
 * Identity-specific activity tab content.
 *
 * Separate from activity-shared.tsx so that data store and unmanaged
 * destination panels are never affected by identity-centric changes.
 *
 * Only self-actions (things done BY the subject) are shown.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Activity, Plus, X, ChevronDown, ChevronRight,
  ArrowUpRight, ArrowDownRight, Edit2, Trash2,
  Share2, ShieldX, Search, Database,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type IdentityEventAction =
  | "upload" | "download" | "create" | "edit" | "delete"
  | "share"  | "export"  | "login-failed" | "query";

interface IdentityActivityEvent {
  id: string;
  timestamp: Date;
  action: IdentityEventAction;
  // Self-action fields
  dataStore: string;
  file: string;
  // Shared
  sensitiveTypes: string[];
  detailSegments: string[];   // human-readable breadcrumb chain
}

// ── ACTION_META ───────────────────────────────────────────────────────────────

export const ACTION_META: Record<IdentityEventAction, {
  label: string;
  badgeCls: string;
  iconCls: string;
  dotCls: string;
  Icon: React.ElementType;
}> = {
  "upload":       { label: "UPLOAD",       badgeCls: "bg-primary/15 text-primary",                           iconCls: "text-primary/70",     dotCls: "bg-primary/20 border-primary/50",          Icon: ArrowUpRight  },
  "download":     { label: "DOWNLOAD",     badgeCls: "bg-cyan-500/15 text-cyan-400",                         iconCls: "text-cyan-400/70",    dotCls: "bg-cyan-500/20 border-cyan-500/50",        Icon: ArrowDownRight},
  "create":       { label: "CREATE",       badgeCls: "bg-emerald-500/15 text-emerald-400",                   iconCls: "text-emerald-400/70", dotCls: "bg-emerald-500/20 border-emerald-500/50",  Icon: Plus          },
  "edit":         { label: "EDIT",         badgeCls: "bg-amber-500/15 text-amber-400",                       iconCls: "text-amber-400/70",   dotCls: "bg-amber-500/20 border-amber-500/50",      Icon: Edit2         },
  "delete":       { label: "DELETE",       badgeCls: "bg-red-500/15 text-red-400",                           iconCls: "text-red-400/70",     dotCls: "bg-red-500/20 border-red-500/50",          Icon: Trash2        },
  "share":        { label: "SHARE",        badgeCls: "bg-orange-500/15 text-orange-400",                     iconCls: "text-orange-400/70",  dotCls: "bg-orange-500/20 border-orange-500/50",    Icon: Share2        },
  "export":       { label: "EXPORT",       badgeCls: "bg-orange-500/10 text-orange-300",                     iconCls: "text-orange-300/70",  dotCls: "bg-orange-500/20 border-orange-500/50",    Icon: ArrowUpRight  },
  "login-failed": { label: "LOGIN FAILED", badgeCls: "border border-red-500/40 bg-red-500/10 text-red-300", iconCls: "text-red-400/70",     dotCls: "bg-red-500/20 border-red-500/50",          Icon: ShieldX       },
  "query":        { label: "QUERY",        badgeCls: "bg-violet-400/15 text-violet-400",                     iconCls: "text-violet-400/70",  dotCls: "bg-violet-400/20 border-violet-400/50",    Icon: Search        },
};

const ALL_ACTIONS = Object.keys(ACTION_META) as IdentityEventAction[];

// ── Helpers ───────────────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function formatIdentityDate(d: Date): string {
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

// ── Log generator ─────────────────────────────────────────────────────────────

export function generateIdentityActivityLog(
  subjectName: string,
  dataTypes: string[],
  storeNames: string[],
): IdentityActivityEvent[] {
  const seed = subjectName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRand(seed * 31 + 7);

  const dataTypePool = dataTypes.length > 0 ? dataTypes : ["Personal Names", "Email Addresses"];
  const stores = storeNames.length > 0 ? storeNames : ["corp-data-store"];

  const files = [
    "prod_db_dump_20260201.sql", "customer_data_export.csv",
    "access_audit_log.csv",     "pii_scan_results.json",
    "payroll_summary_feb.xlsx", "api_credentials_backup.json",
    "health_records_batch.csv", "employee_records_2026.xlsx",
  ];

  const tables = [
    "users", "customers", "employees", "orders", "payments",
    "health_records", "audit_logs", "identity_events", "transactions", "subscriptions",
  ];

  const ipOpts     = ["192.168.1.45", "203.0.113.42", "198.51.100.7"];
  const fmtOpts    = ["CSV", "JSON", "XLSX"];
  const pathOpts   = ["secure/exports/", "backup/2026/", "audit/march/"];
  const extDomains = ["partner-corp.io", "vendor.com", "consultant.net"];

  const now = new Date("2026-03-11T12:00:00Z");

  const selfActions: IdentityEventAction[] = [
    "upload", "download", "create", "edit", "delete", "share", "export", "login-failed", "query",
  ];
  const selfWeights = [0.22, 0.22, 0.13, 0.11, 0.07, 0.06, 0.05, 0.02, 0.12];

  const totalEvents = 14 + Math.floor(rand() * 7);
  const events: IdentityActivityEvent[] = [];

  for (let i = 0; i < totalEvents; i++) {
    const daysAgo = rand() * 30;
    const ts = new Date(now.getTime() - daysAgo * 86400000);

    const dataStore = stores[Math.floor(rand() * stores.length)];
    const file      = files[Math.floor(rand() * files.length)];
    let detailSegments: string[] = [];

    // Pick weighted self-action
    let r = rand(); let cumulative = 0;
    let action: IdentityEventAction = selfActions[selfActions.length - 1];
    for (let j = 0; j < selfWeights.length; j++) {
      cumulative += selfWeights[j];
      if (r <= cumulative) { action = selfActions[j]; break; }
    }

    switch (action) {
      case "upload":
        detailSegments = ["Uploaded to store", dataStore, pathOpts[Math.floor(rand() * pathOpts.length)]];
        break;
      case "download":
        detailSegments = rand() < 0.5
          ? ["Downloaded via API", "External endpoint"]
          : ["Downloaded via CLI", "Local device"];
        break;
      case "create":
        detailSegments = ["Created new object", dataStore];
        break;
      case "edit":
        detailSegments = rand() < 0.5
          ? ["Modified via Console", dataStore]
          : ["Modified via API", dataStore];
        break;
      case "delete":
        detailSegments = ["Permanently deleted from", dataStore];
        break;
      case "share":
        detailSegments = ["Shared externally", extDomains[Math.floor(rand() * extDomains.length)]];
        break;
      case "export":
        detailSegments = [`Exported as ${fmtOpts[Math.floor(rand() * fmtOpts.length)]}`, "External destination"];
        break;
      case "login-failed":
        detailSegments = [
          "Failed login attempt",
          `IP ${ipOpts[Math.floor(rand() * ipOpts.length)]}`,
          `${1 + Math.floor(rand() * 4)} retries`,
        ];
        break;
      case "query": {
        const table = tables[Math.floor(rand() * tables.length)];
        detailSegments = ["Queried structured data", dataStore, table];
        break;
      }
    }

    // Sensitive types (only for actions that touch data)
    const sensitiveTypes: string[] = [];
    const actionsThatTouchData: IdentityEventAction[] = [
      "upload", "download", "create", "edit", "delete", "share", "export", "query",
    ];
    if (actionsThatTouchData.includes(action) && rand() < 0.5) {
      const count = 1 + Math.floor(rand() * Math.min(2, dataTypePool.length));
      const idxs = new Set<number>();
      while (idxs.size < Math.min(count, dataTypePool.length)) {
        idxs.add(Math.floor(rand() * dataTypePool.length));
      }
      idxs.forEach(idx => sensitiveTypes.push(dataTypePool[idx]));
    }

    events.push({
      id: `idact-${seed}-${i}`,
      timestamp: ts,
      action,
      dataStore,
      file,
      sensitiveTypes,
      detailSegments,
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IdentityActivityTabContent({
  subjectName,
  dataTypes,
  storeNames,
  initialActionFilter = [],
  restrictedActions,
}: {
  subjectName: string;
  dataTypes: string[];
  storeNames: string[];
  initialActionFilter?: string[];
  /** When provided, only these action types are ever shown (events with other actions are hidden). */
  restrictedActions?: IdentityEventAction[];
}) {
  const allEvents = useMemo(() => {
    const events = generateIdentityActivityLog(subjectName, dataTypes, storeNames);
    if (!restrictedActions || restrictedActions.length === 0) return events;
    return events.filter(e => restrictedActions.includes(e.action));
  }, [subjectName, dataTypes, storeNames, restrictedActions]);

  const allDataTypes = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach(e => e.sensitiveTypes.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [allEvents]);

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of ALL_ACTIONS) counts[a] = 0;
    for (const e of allEvents) counts[e.action]++;
    return counts;
  }, [allEvents]);

  const dataTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allDataTypes) counts[t] = 0;
    for (const e of allEvents) {
      e.sensitiveTypes.forEach(t => { if (counts[t] !== undefined) counts[t]++; });
    }
    return counts;
  }, [allEvents, allDataTypes]);

  // ── Filter state ────────────────────────────────────────────────────────────

  const [actionFilter,   setActionFilter]   = useState<IdentityEventAction[]>(
    (initialActionFilter as IdentityEventAction[]).filter(a => a in ACTION_META)
  );
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);
  const [openDropdown,   setOpenDropdown]   = useState<"action" | "data-type" | null>(null);
  const [pendingAction,   setPendingAction]   = useState<IdentityEventAction[]>([]);
  const [pendingDataType, setPendingDataType] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const openActionPicker   = useCallback(() => { setPendingAction([...actionFilter]);     setOpenDropdown(p => p === "action"    ? null : "action");    }, [actionFilter]);
  const openDataTypePicker = useCallback(() => { setPendingDataType([...dataTypeFilter]); setOpenDropdown(p => p === "data-type" ? null : "data-type"); }, [dataTypeFilter]);

  const applyAction   = useCallback(() => { setActionFilter(pendingAction);     setOpenDropdown(null); }, [pendingAction]);
  const applyDataType = useCallback(() => { setDataTypeFilter(pendingDataType); setOpenDropdown(null); }, [pendingDataType]);

  const togglePendingAction   = useCallback((a: IdentityEventAction) =>
    setPendingAction(p   => p.includes(a) ? p.filter(x => x !== a) : [...p, a]), []);
  const togglePendingDataType = useCallback((t: string) =>
    setPendingDataType(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]), []);

  const hasActionFilter   = actionFilter.length > 0;
  const hasDataTypeFilter = dataTypeFilter.length > 0;
  const hasAnyFilter      = hasActionFilter || hasDataTypeFilter;

  const filteredEvents = useMemo(() => allEvents.filter(e => {
    if (hasActionFilter   && !actionFilter.includes(e.action)) return false;
    if (hasDataTypeFilter && !dataTypeFilter.some(t => e.sensitiveTypes.includes(t))) return false;
    return true;
  }), [allEvents, actionFilter, dataTypeFilter, hasActionFilter, hasDataTypeFilter]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Filter toolbar ── */}
      <div className="shrink-0 px-3 pt-2.5 pb-2.5 border-b border-border space-y-2">
        <div ref={dropdownRef} className="relative">
          <div className="flex items-center gap-1.5 flex-wrap">

            {/* Activity Type pill */}
            {hasActionFilter ? (
              <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                <button type="button" onClick={openActionPicker}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                  style={{ fontSize: "10px", fontWeight: 500 }}>
                  <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                  Activity
                  <span className="text-primary/50 mx-0.5">|</span>
                  <span className="truncate max-w-[80px]">
                    {actionFilter.length === 1 ? (ACTION_META[actionFilter[0] as IdentityEventAction]?.label ?? actionFilter[0].toUpperCase()) : `${actionFilter.length} selected`}
                  </span>
                  <ChevronDown size={9} className="ml-0.5 opacity-60" />
                </button>
                <button type="button" onClick={() => { setActionFilter([]); setOpenDropdown(null); }}
                  className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                  <X size={9} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={openActionPicker}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                  openDropdown === "action"
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "10px", fontWeight: 400 }}>
                <Plus size={9} />
                Activity Type
              </button>
            )}

            {/* Sensitive Data Type pill */}
            {allDataTypes.length > 0 && (
              hasDataTypeFilter ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button type="button" onClick={openDataTypePicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "10px", fontWeight: 500 }}>
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Data Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {dataTypeFilter.length === 1 ? dataTypeFilter[0] : `${dataTypeFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button type="button" onClick={() => { setDataTypeFilter([]); setOpenDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear">
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={openDataTypePicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                    openDropdown === "data-type"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}>
                  <Plus size={9} />
                  Sensitive Data Type
                </button>
              )
            )}
          </div>

          {/* ── Activity Type dropdown ── */}
          {openDropdown === "action" && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Activity Type</span>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {ALL_ACTIONS.map(action => {
                  const count = actionCounts[action] ?? 0;
                  if (count === 0) return null;
                  const m = ACTION_META[action];
                  const checked = pendingAction.includes(action);
                  return (
                    <label key={action} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                      <input type="checkbox" checked={checked} onChange={() => togglePendingAction(action)}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                      <span className={`inline-flex items-center rounded px-1.5 py-[2px] ${m.badgeCls}`}
                        style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>{m.label}</span>
                      <span className="flex-1" />
                      <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                    </label>
                  );
                })}
              </div>
              <div className="px-3 py-2.5 border-t border-border">
                <button type="button" onClick={applyAction}
                  className="w-full py-1.5 rounded-lg bg-primary text-white transition-opacity hover:opacity-90"
                  style={{ fontSize: "12px", fontWeight: 600 }}>Apply</button>
              </div>
            </div>
          )}

          {/* ── Sensitive Data Type dropdown ── */}
          {openDropdown === "data-type" && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Sensitive Data Type</span>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {allDataTypes.map(t => {
                  const count = dataTypeCounts[t] ?? 0;
                  if (count === 0) return null;
                  const checked = pendingDataType.includes(t);
                  return (
                    <label key={t} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                      <input type="checkbox" checked={checked} onChange={() => togglePendingDataType(t)}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                      <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{t}</span>
                      <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                    </label>
                  );
                })}
              </div>
              <div className="px-3 py-2.5 border-t border-border">
                <button type="button" onClick={applyDataType}
                  className="w-full py-1.5 rounded-lg bg-primary text-white transition-opacity hover:opacity-90"
                  style={{ fontSize: "12px", fontWeight: 600 }}>Apply</button>
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-primary" />
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
            {filteredEvents.length}{hasAnyFilter ? ` of ${allEvents.length}` : ""} events
            <span className="opacity-60"> · most recent first</span>
          </span>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Activity size={20} className="opacity-30" />
            <span style={{ fontSize: "12px" }}>No events match the current filters</span>
            <button type="button"
              onClick={() => { setActionFilter([]); setDataTypeFilter([]); }}
              className="text-primary hover:text-primary/80 transition-colors" style={{ fontSize: "11px" }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="px-5 py-2">
            <div className="space-y-0">
              {filteredEvents.map((event, idx, arr) => {
                const meta    = ACTION_META[event.action];
                const Icon    = meta.Icon;
                const isFirst = idx === 0;
                const isLast  = idx === arr.length - 1;

                return (
                  <div key={event.id} className="relative flex gap-0">

                    {/* Timeline rail */}
                    <div className="flex flex-col items-center" style={{ width: "28px", minWidth: "28px" }}>
                      <div className={`w-px flex-none ${isFirst ? "bg-transparent" : "bg-border"}`} style={{ height: "8px" }} />
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none ${meta.dotCls}`}>
                        <Icon size={8} className={meta.iconCls} />
                      </div>
                      <div className={`w-px flex-1 min-h-[8px] ${isLast ? "bg-transparent" : "bg-border"}`} />
                    </div>

                    {/* Node content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="group rounded-md px-2 py-1.5 -mx-2 -my-1.5 hover:bg-surface-raised border border-transparent hover:border-border transition-all">
                        <details className="group/details">
                          <summary className="list-none cursor-pointer">
                            <div className="flex items-start gap-1">
                              <div className="flex-1 min-w-0">

                                {/* Badge + timestamp */}
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${meta.badgeCls}`} style={{ fontWeight: 600 }}>
                                    {meta.label}
                                  </span>
                                  <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                                    {formatIdentityDate(event.timestamp)}
                                  </span>
                                </div>

                                {/* ── Action chain ── */}
                                <div className="mt-1" style={{ fontSize: "11px" }}>
                                  <span className="text-foreground/80">
                                    {event.detailSegments.map((seg, j) => (
                                      <span key={j}>
                                        {j > 0 && (
                                          <span className="mx-1 text-muted-foreground/35" style={{ fontSize: "10px" }}>→</span>
                                        )}
                                        {/* Highlight the data store segment (index 1 for most actions) */}
                                        {j === 1 && seg === event.dataStore ? (
                                          <span className="inline-flex items-center gap-0.5 text-text-bright" style={{ fontWeight: 500 }}>
                                            <Database size={9} className="text-primary/60 shrink-0" />
                                            {seg}
                                          </span>
                                        ) : j === 0 ? (
                                          <span className="text-text-bright" style={{ fontWeight: 500 }}>{seg}</span>
                                        ) : (
                                          <span className="text-foreground/70">{seg}</span>
                                        )}
                                      </span>
                                    ))}
                                  </span>
                                </div>

                                {/* File name */}
                                <div className="text-muted-foreground/50 mt-0.5 truncate text-[#64748bb3]" style={{ fontSize: "10px" }}>
                                  {event.action === "query" ? event.detailSegments[2] : event.file}
                                </div>

                                {/* Sensitive type tags */}
                                {event.sensitiveTypes.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {event.sensitiveTypes.map(t => (
                                      <span key={t}
                                        className={`px-1.5 py-0.5 bg-surface-raised border rounded transition-colors ${
                                          hasDataTypeFilter && dataTypeFilter.includes(t)
                                            ? "border-primary/50 bg-primary/10 text-primary"
                                            : "border-border text-text-bright"
                                        }`}
                                        style={{ fontSize: "10px" }}>
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Expand chevron */}
                              <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground/70 transition-colors">
                                <ChevronRight size={12} className="group-open/details:rotate-90 transition-transform duration-150" />
                              </div>
                            </div>
                          </summary>

                          {/* ── Expanded detail rows ── */}
                          <div className="mt-2 ml-0.5 space-y-0.5 pb-1">
                            <div className="flex gap-2" style={{ fontSize: "10px" }}>
                              <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Actor</span>
                              <span className="text-foreground/70">
                                {subjectName}
                                <span className="text-muted-foreground/50 ml-1">(self)</span>
                              </span>
                            </div>
                            <div className="flex gap-2" style={{ fontSize: "10px" }}>
                              <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Action</span>
                              <span className="text-foreground/70">{event.detailSegments.join(" → ")}</span>
                            </div>
                            <div className="flex gap-2" style={{ fontSize: "10px" }}>
                              <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Data Store</span>
                              <span className="text-foreground/70">{event.dataStore}</span>
                            </div>
                            {event.action === "query" ? (
                              <div className="flex gap-2" style={{ fontSize: "10px" }}>
                                <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Table</span>
                                <span className="text-foreground/70 break-all">{event.detailSegments[2]}</span>
                              </div>
                            ) : (
                              <div className="flex gap-2" style={{ fontSize: "10px" }}>
                                <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>File</span>
                                <span className="text-foreground/70 break-all">{event.file}</span>
                              </div>
                            )}
                            <div className="flex gap-2" style={{ fontSize: "10px" }}>
                              <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Timestamp</span>
                              <span className="text-foreground/70">
                                {event.timestamp.toLocaleString("en-US", {
                                  month: "short", day: "numeric", year: "numeric",
                                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}