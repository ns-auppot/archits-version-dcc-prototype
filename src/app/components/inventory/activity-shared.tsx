/**
 * Shared activity log infrastructure for IaaS & On-Prem data store panels.
 * Reuses the same visual pattern as the SaaS/Unmanaged apps activity section.
 */

import { useState, useMemo, useId } from "react";
import {
  Plus, ChevronDown, Info,
  ArrowUpRight, ArrowDownRight, Edit2, Trash2,
  Share2, ShieldX, KeyRound,
} from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { formatBytes, sumSparkData } from "./data-store-shared";

// ── Row interface ─────────────────────────────────────────────────────────────

export interface ActivityRow {
  id: string;
  name?: string;
  dataTypes: string[];
  uploadSparkData: number[];
  downloadSparkData: number[];
}

// ── Event types ───────────────────────────────────────────────────────────────

export type ActivityEventAction =
  | "upload" | "download" | "create" | "edit"
  | "delete" | "share" | "login-failed" | "permission-change" | "export";

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  actor: string;
  actorEmail: string;
  identityType: string;
  action: ActivityEventAction;
  target: string;
  detailSegments: string[];
  sensitiveTypes: string[];
}

// ── ACTION_META ───────────────────────────────────────────────────────────────

export const ACTION_META: Record<ActivityEventAction, {
  label: string;
  badgeCls: string;
  iconCls: string;
  Icon: React.ElementType;
}> = {
  "upload":            { label: "UPLOAD",       badgeCls: "bg-primary/15 text-primary",                                   iconCls: "text-primary/70",        Icon: ArrowUpRight    },
  "download":          { label: "DOWNLOAD",      badgeCls: "bg-cyan-500/15 text-cyan-400",                                 iconCls: "text-cyan-400/70",       Icon: ArrowDownRight  },
  "create":            { label: "CREATE",        badgeCls: "bg-emerald-500/15 text-emerald-400",                           iconCls: "text-emerald-400/70",    Icon: Plus            },
  "edit":              { label: "EDIT",          badgeCls: "bg-amber-500/15 text-amber-400",                               iconCls: "text-amber-400/70",      Icon: Edit2           },
  "delete":            { label: "DELETE",        badgeCls: "bg-red-500/15 text-red-400",                                   iconCls: "text-red-400/70",        Icon: Trash2          },
  "share":             { label: "SHARE",         badgeCls: "bg-orange-500/15 text-orange-400",                             iconCls: "text-orange-400/70",     Icon: Share2          },
  "login-failed":      { label: "LOGIN FAILED",  badgeCls: "border border-red-500/40 bg-red-500/10 text-red-300",          iconCls: "text-red-400/70",        Icon: ShieldX         },
  "permission-change": { label: "PERM CHANGE",   badgeCls: "bg-violet-500/15 text-violet-400",                             iconCls: "text-violet-400/70",     Icon: KeyRound        },
  "export":            { label: "EXPORT",        badgeCls: "bg-orange-500/10 text-orange-300",                             iconCls: "text-orange-300/70",     Icon: ArrowUpRight    },
};

export const ALL_ACTIVITY_ACTIONS = Object.keys(ACTION_META) as ActivityEventAction[];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateActivityLog(row: ActivityRow): ActivityEvent[] {
  const seed = row.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRand(seed * 31 + 7);
  const storeName = row.name ?? row.id;

  const actors = [
    { name: "sarah.chen",   email: "sarah.chen@acme.com",   identityType: "Internal user" },
    { name: "marcus.j",     email: "marcus.j@acme.com",     identityType: "Internal user" },
    { name: "admin",        email: "admin@acme.com",        identityType: "Local user" },
    { name: "priya.sharma", email: "priya.sharma@acme.com", identityType: "Internal user" },
    { name: "tom.walsh",    email: "tom.walsh@acme.com",    identityType: "Internal user" },
    { name: "Anonymous",    email: "anonymous@unknown",     identityType: "Unauthenticated" },
    { name: "svc-backup",   email: "svc-backup@acme.com",   identityType: "Service Account" },
    { name: "john.external", email: "john@partner.com",     identityType: "External user" },
    { name: "192.168.1.45", email: "192.168.1.45",          identityType: "IP Address" },
  ];

  const files = [
    "prod_db_dump_20260201.sql", "customer_data_export.csv",
    "access_audit_log.csv",     "pii_scan_results.json",
    "payroll_summary_feb.xlsx", "api_credentials_backup.json",
    "health_records_batch.csv", "vendor_contracts_archive.zip",
    "compliance_report_q1.pdf", "employee_records_2026.xlsx",
  ];

  const dataTypePool = row.dataTypes.length > 0 ? row.dataTypes : ["Personal Names", "Email Addresses"];
  const now = new Date("2026-03-11T12:00:00Z");

  const actionTypes: ActivityEventAction[] = [
    "upload", "download", "create", "edit", "delete", "share", "login-failed", "permission-change", "export",
  ];
  const weights = [0.22, 0.22, 0.14, 0.14, 0.09, 0.07, 0.05, 0.04, 0.03];
  const eventCount = 12 + Math.floor(rand() * 9);
  const events: ActivityEvent[] = [];

  for (let i = 0; i < eventCount; i++) {
    const daysAgo = rand() * 30;
    const ts = new Date(now.getTime() - daysAgo * 86400000);

    let r = rand(); let cumulative = 0; let action: ActivityEventAction = "upload";
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (r <= cumulative) { action = actionTypes[j]; break; }
    }

    const actor = actors[Math.floor(rand() * actors.length)];
    const file  = files[Math.floor(rand() * files.length)];
    const hasSensitive = rand() < 0.55;
    const sensitiveCount = hasSensitive ? 1 + Math.floor(rand() * Math.min(3, dataTypePool.length)) : 0;
    const sensitiveTypes: string[] = [];
    if (sensitiveCount > 0) {
      const idxs = new Set<number>();
      while (idxs.size < Math.min(sensitiveCount, dataTypePool.length)) idxs.add(Math.floor(rand() * dataTypePool.length));
      idxs.forEach(idx => sensitiveTypes.push(dataTypePool[idx]));
    }

    const ipOpts  = ["192.168.1.45", "203.0.113.42", "198.51.100.7"];
    const fmtOpts = ["CSV", "JSON", "XLSX"];
    const pathOpts = ["secure/exports/", "backup/2026/", "audit/march/"];

    let detailSegments: string[] = [];
    switch (action) {
      case "upload":            detailSegments = ["Uploaded to store", storeName, pathOpts[Math.floor(rand() * pathOpts.length)]]; break;
      case "download":          detailSegments = rand() < 0.5 ? ["Downloaded via API", "External endpoint"] : ["Downloaded via CLI", "Local device"]; break;
      case "create":            detailSegments = ["Created new object", storeName]; break;
      case "edit":              detailSegments = rand() < 0.5 ? ["Modified via Console", storeName] : ["Modified via API", storeName]; break;
      case "delete":            detailSegments = ["Permanently deleted", storeName, "No recovery"]; break;
      case "share":             detailSegments = ["Shared externally", `${["partner-corp.io", "vendor.com", "consultant.net"][Math.floor(rand() * 3)]}`]; break;
      case "login-failed":      detailSegments = ["Failed login attempt", `IP ${ipOpts[Math.floor(rand() * ipOpts.length)]}`, `${1 + Math.floor(rand() * 4)} retries`]; break;
      case "permission-change": detailSegments = ["Permission changed", "Read → ReadWrite", storeName]; break;
      case "export":            detailSegments = [`Exported as ${fmtOpts[Math.floor(rand() * fmtOpts.length)]}`, "External destination"]; break;
    }

    events.push({ 
      id: `evt-${row.id}-${i}`, 
      timestamp: ts, 
      actor: actor.name, 
      actorEmail: actor.email, 
      identityType: actor.identityType, 
      action, 
      target: file, 
      detailSegments, 
      sensitiveTypes 
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function formatActivityDate(d: Date): string {
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function getChartDate(index: number): Date {
  const base = new Date(2026, 1, 10); // Feb 10
  const d = new Date(base);
  d.setDate(base.getDate() + index);
  return d;
}

function formatChartDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatChartValue(value: number): string {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

type VolumeMetric = "totalBytes" | "bytesUploaded" | "bytesDownloaded";

// ── VolumeTrendChart ──────────────────────────────────────────────────────────

export function VolumeTrendChart({
  uploadData, downloadData,
}: {
  uploadData: number[];
  downloadData: number[];
  gradId?: string; // kept for backward-compat; no longer used
}) {
  const uid = useId();
  const [selectedMetric, setSelectedMetric] = useState<VolumeMetric>("totalBytes");

  const metrics: Record<VolumeMetric, { label: string; data: number[] }> = {
    totalBytes:      { label: "Total Bytes",      data: uploadData.map((up, i) => up + downloadData[i]) },
    bytesUploaded:   { label: "Bytes Uploaded",   data: uploadData },
    bytesDownloaded: { label: "Bytes Downloaded", data: downloadData },
  };

  const selectedData = metrics[selectedMetric];
  const chartData = useMemo(
    () => selectedData.data.map((value, i) => ({ idx: i, dateStr: formatChartDate(getChartDate(i)), value })),
    [selectedData.data],
  );
  const xTickIndices = useMemo(() => {
    const len = chartData.length;
    if (len <= 1) return [0];
    const raw = [0, Math.round(len * 0.25), Math.round(len * 0.5), Math.round(len * 0.75), len - 1];
    // deduplicate while preserving order, ensure all within range
    return raw.filter((v, i, arr) => v < len && arr.indexOf(v) === i);
  }, [chartData.length]);

  return (
    <div className="pt-2 space-y-2">
      <div className="h-px bg-border -mx-3" />
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.04em" }}>
          Sensitive Volume Trend
        </div>
        <div className="relative">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as VolumeMetric)}
            className="appearance-none bg-surface-overlay rounded-md px-3 py-1.5 pr-8 text-text-bright cursor-pointer hover:bg-surface-raised transition-colors"
            style={{ fontSize: "11px" }}
          >
            <option value="totalBytes">Total Bytes</option>
            <option value="bytesUploaded">Bytes Uploaded</option>
            <option value="bytesDownloaded">Bytes Downloaded</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-lg px-3 py-3">
        <ResponsiveContainer width="100%" height={112}>
          <AreaChart id={uid} data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="idx"
              ticks={xTickIndices}
              tickFormatter={(idx) => formatChartDate(getChartDate(idx))}
              tick={{ fill: "#64748b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <ReTooltip
              cursor={{ stroke: "rgba(148,163,184,0.2)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div style={{ background: "var(--surface-raised,#1e293b)", border: "1px solid var(--border,#334155)", borderRadius: 4, padding: "4px 8px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                    <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1 }}>{item.dateStr}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-bright,#f1f5f9)" }}>{formatChartValue(item.value)}</div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={1.5} fill="rgba(96,165,250,0.12)" dot={false} activeDot={{ r: 3, fill: "#60a5fa", stroke: "#0f172a", strokeWidth: 1.5 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── ActivityOverviewSection ───────────────────────────────────────────────────

/**
 * The compact Activity card shown at the bottom of the Overview tab.
 * Shows Total Bytes / Upload events / Download events as static metrics
 * and the Sensitive Volume Trend chart with dropdown.
 */
export function ActivityOverviewSection({
  row, gradId,
}: {
  row: ActivityRow;
  gradId?: string;
}) {
  const seed = row.id.charCodeAt(0) + (row.id.charCodeAt(row.id.length - 1) || 0);
  const uploadEvents   = 100 + (seed * 13 + 37) % 1800;
  const downloadEvents = 80  + (seed * 17 + 19) % 1400;
  const uploadTotal    = sumSparkData(row.uploadSparkData);
  const downloadTotal  = sumSparkData(row.downloadSparkData);

  return (
    <div>
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Sensitive Transferred Data</div>
        <span className="relative group/infotip flex-shrink-0" style={{ lineHeight: 1 }}>
          <Info size={12} className="text-muted-foreground/50 cursor-default" />
          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover/infotip:block px-2 py-1 rounded shadow-lg z-50 pointer-events-none whitespace-nowrap" style={{ fontSize: "10px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}>
            Only sensitive volume counted
            <div className="absolute top-full right-2 w-0 h-0" style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #1e293b" }} />
          </div>
        </span>
      </div>

      {/* Metrics row */}
      <div className="flex gap-4">
        <div className="flex-1 flex items-center justify-between gap-2">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Total Bytes</div>
          <div className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
            {formatBytes(uploadTotal + downloadTotal)}
          </div>
        </div>

        <div className="w-px bg-border" />

        <div className="flex-1 flex items-center justify-between gap-2">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Uploaded</div>
          <span className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
            {uploadEvents.toLocaleString()} events
          </span>
        </div>

        <div className="w-px bg-border" />

        <div className="flex-1 flex items-center justify-between gap-2">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>Downloaded</div>
          <span className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
            {downloadEvents.toLocaleString()} events
          </span>
        </div>
      </div>

      <VolumeTrendChart uploadData={row.uploadSparkData} downloadData={row.downloadSparkData} gradId={gradId ?? `actOvGrad-${row.id}`} />
    </div>
    </div>
  );
}