import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TablePagination } from "../ui/table-pagination";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, ArrowRight, ChevronDown, ScanSearch, Upload, Download, Clock, ChevronRight, User, Users, Filter, X, Info, Activity, FileText, Search, FolderOpen, Plus, Radar, FilePlus, Share2, Pencil } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
import {
  generateSparkData,
  sumSparkData,
  formatBytes,
  formatNumber,
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
import { SidePanel } from "./SidePanel";
import { FileDetailPane, SensitiveFileDetailPane, SensitiveFileHeaderExtra, DT_TYPE_TO_CAT, DT_CAT_COLORS, generateFileAccessHistory } from "./ForensicDetailPane";
import { IdentityDetailPanel } from "./InventoryContent";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type PanelTab, makePanelTabs, PanelTabBar,
  SectionHeading, InfoRow, SparkTrend,
  SEVERITY_CONFIG, getDataTypeInfo,
  type Severity,
} from "./panel-shared";
import { IDENTITY_TYPE_CONFIG, IDENTITY_FILTER_GROUPS, type IdentityTypeName } from "./identity-shared";

// ── Types ────────────────────────────────────────────────────────────────────

type UnmanagedDestination = {
  id: string;
  name: string;
  category: string;
  instanceName?: string;
  destinationType: string;
  firstAccess: string;
  status?: "Sanctioned" | "Unsanctioned";
  uploadSparkData: number[];
  downloadSparkData: number[];
  sessionsSparkData: number[];
  dataTypes: Array<{ type: string; eventCount: number }>;
  uploadEventCount: number;
  downloadEventCount: number;
  totalSessions: number;
};

// (PanelTab → panel-shared.tsx)
type TypeFilter = "Application" | "Website" | "Device Peripheral";
type ActivityMetric = "totalBytes" | "bytesUploaded" | "bytesDownloaded" | "sessions";

// ── Activity History Types & Data ─────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  type: "upload" | "download" | "create" | "share" | "edit";
  timestamp: string;
  actor: string;
  actorEmail: string;
  identityType: string;
  bytes: number;
  dataTypes: string[];
  device: string;
  objectName?: string;
}

const MOCK_ACTORS = [
  { name: "sarah.chen", email: "sarah.chen@acme.com", identityType: "Internal user" },
  { name: "marcus.j", email: "marcus.j@acme.com", identityType: "Internal user" },
  { name: "alex.wong", email: "alex.wong@acme.com", identityType: "Internal user" },
  { name: "priya.s", email: "priya.s@acme.com", identityType: "Internal user" },
  { name: "michael.r", email: "michael.r@acme.com", identityType: "Internal user" },
  { name: "svc-backup", email: "svc-backup@acme.com", identityType: "Service Account" },
  { name: "john.external", email: "john@partner.com", identityType: "External user" },
  { name: "Anonymous", email: "anonymous@unknown", identityType: "Unauthenticated" },
  { name: "alice.chen", email: "a.chen@acme.com", identityType: "Internal user" },
];

const MOCK_DEVICES = [
  "MacBook Pro (sarah-mbp)",
  "Windows Workstation (mj-desk)",
  "MacBook Air (aw-laptop)",
  "Linux Server (ps-dev)",
  "Windows Laptop (mr-work)",
  "MacBook Pro (tk-mbp)",
  "Windows Desktop (jl-pc)",
];

const MOCK_OBJECT_NAMES = [
  "Q4_Financial_Report.xlsx",
  "customer_data_export.csv",
  "design_assets_v3.zip",
  "employee_records_2026.xlsx",
  "product_roadmap_confidential.pdf",
  "backup_database_mar2026.sql",
  "source_code_release.tar.gz",
  "marketing_campaign_assets.zip",
  "security_audit_results.pdf",
  "api_keys_and_credentials.txt",
];

function generateActivityHistory(row: UnmanagedDestination): ActivityEvent[] {
  const seed = row.name.length;
  const types = row.dataTypes.map((d) => d.type);

  const pick = <T,>(arr: T[], offset: number) => arr[(seed + offset) % arr.length];

  const raw: ActivityEvent[] = [
    {
      id: `${row.id}-act-1`,
      type: "upload",
      timestamp: "Mar 10, 2026 02:34 PM",
      actor: pick(MOCK_ACTORS, 0).name,
      actorEmail: pick(MOCK_ACTORS, 0).email,
      identityType: pick(MOCK_ACTORS, 0).identityType,
      bytes: 2.4 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(3, types.length)),
      device: pick(MOCK_DEVICES, 0),
      objectName: pick(MOCK_OBJECT_NAMES, 0),
    },
    {
      id: `${row.id}-act-2`,
      type: "download",
      timestamp: "Mar 09, 2026 11:18 AM",
      actor: pick(MOCK_ACTORS, 1).name,
      actorEmail: pick(MOCK_ACTORS, 1).email,
      identityType: pick(MOCK_ACTORS, 1).identityType,
      bytes: 5.1 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(2, types.length)),
      device: pick(MOCK_DEVICES, 1),
      objectName: pick(MOCK_OBJECT_NAMES, 1),
    },
    {
      id: `${row.id}-act-3`,
      type: "upload",
      timestamp: "Mar 07, 2026 09:45 AM",
      actor: pick(MOCK_ACTORS, 2).name,
      actorEmail: pick(MOCK_ACTORS, 2).email,
      identityType: pick(MOCK_ACTORS, 2).identityType,
      bytes: 1.8 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(2, types.length)),
      device: pick(MOCK_DEVICES, 2),
      objectName: pick(MOCK_OBJECT_NAMES, 2),
    },
    {
      id: `${row.id}-act-4`,
      type: "download",
      timestamp: "Mar 05, 2026 04:22 PM",
      actor: pick(MOCK_ACTORS, 3).name,
      actorEmail: pick(MOCK_ACTORS, 3).email,
      identityType: pick(MOCK_ACTORS, 3).identityType,
      bytes: 8.3 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(3, types.length)),
      device: pick(MOCK_DEVICES, 3),
      objectName: pick(MOCK_OBJECT_NAMES, 3),
    },
    {
      id: `${row.id}-act-5`,
      type: "upload",
      timestamp: "Feb 28, 2026 01:55 PM",
      actor: pick(MOCK_ACTORS, 4).name,
      actorEmail: pick(MOCK_ACTORS, 4).email,
      identityType: pick(MOCK_ACTORS, 4).identityType,
      bytes: 3.7 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(2, types.length)),
      device: pick(MOCK_DEVICES, 4),
      objectName: pick(MOCK_OBJECT_NAMES, 4),
    },
    {
      id: `${row.id}-act-6`,
      type: "download",
      timestamp: "Feb 22, 2026 10:07 AM",
      actor: pick(MOCK_ACTORS, 5).name,
      actorEmail: pick(MOCK_ACTORS, 5).email,
      identityType: pick(MOCK_ACTORS, 5).identityType,
      bytes: 0.9 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(1, types.length)),
      device: pick(MOCK_DEVICES, 5),
      objectName: pick(MOCK_OBJECT_NAMES, 5),
    },
    {
      id: `${row.id}-act-7`,
      type: "create",
      timestamp: "Feb 18, 2026 03:44 PM",
      actor: pick(MOCK_ACTORS, 6).name,
      actorEmail: pick(MOCK_ACTORS, 6).email,
      identityType: pick(MOCK_ACTORS, 6).identityType,
      bytes: 0.3 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(2, types.length)),
      device: pick(MOCK_DEVICES, 6),
      objectName: pick(MOCK_OBJECT_NAMES, 6),
    },
    {
      id: `${row.id}-act-8`,
      type: "share",
      timestamp: "Feb 15, 2026 09:31 AM",
      actor: pick(MOCK_ACTORS, 2).name,
      actorEmail: pick(MOCK_ACTORS, 2).email,
      identityType: pick(MOCK_ACTORS, 2).identityType,
      bytes: 0,
      dataTypes: types.slice(0, Math.min(2, types.length)),
      device: pick(MOCK_DEVICES, 2),
      objectName: pick(MOCK_OBJECT_NAMES, 7),
    },
    {
      id: `${row.id}-act-9`,
      type: "edit",
      timestamp: "Feb 10, 2026 02:15 PM",
      actor: pick(MOCK_ACTORS, 3).name,
      actorEmail: pick(MOCK_ACTORS, 3).email,
      identityType: pick(MOCK_ACTORS, 3).identityType,
      bytes: 0.1 * 1024 * 1024,
      dataTypes: types.slice(0, Math.min(1, types.length)),
      device: pick(MOCK_DEVICES, 3),
      objectName: pick(MOCK_OBJECT_NAMES, 8),
    },
  ];

  const aliceEvent: ActivityEvent = {
    id: `${row.id}-act-alice`,
    type: "upload",
    timestamp: "Mar 11, 2026 03:17 PM",
    actor: "alice.chen",
    actorEmail: "a.chen@acme.com",
    identityType: "Internal user",
    bytes: 4.2 * 1024 * 1024,
    dataTypes: types.slice(0, Math.min(2, types.length)),
    device: "MacBook Pro (alice-mbp)",
    objectName: pick(MOCK_OBJECT_NAMES, 6),
  };

  let sliced: ActivityEvent[];
  if (seed < 6)  sliced = raw.slice(0, 3);
  else if (seed < 10) sliced = raw.slice(0, 4);
  else if (seed < 16) sliced = raw.slice(0, 5);
  else sliced = raw;

  // Alice's event is always present and most recent (Mar 11)
  return [aliceEvent, ...sliced];
}

// ── Activity Timeline Node ────────────────────────────────────────────────────

function ActivityTimelineNode({
  event,
  destName,
  destType,
  isFirst,
  isLast,
}: {
  event: ActivityEvent;
  destName: string;
  destType: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const EVENT_CONFIG: Record<ActivityEvent["type"], {
    icon: React.ElementType;
    accentColor: string;
    dotBg: string;
    badgeCls: string;
    label: string;
    actionLabel: (dest: string, isDevice: boolean) => string;
  }> = {
    upload:   { icon: Upload,   accentColor: "text-amber-400",  dotBg: "bg-amber-500/20 border-amber-500/50",  badgeCls: "bg-amber-500/10 text-amber-400 border border-amber-500/20",  label: "Upload",   actionLabel: (d, dev) => dev ? "Written to device"      : `Uploaded to ${d}`    },
    download: { icon: Download, accentColor: "text-blue-400",   dotBg: "bg-blue-500/20 border-blue-500/50",    badgeCls: "bg-blue-500/10 text-blue-400 border border-blue-500/20",    label: "Download", actionLabel: (d, dev) => dev ? "Read from device"       : `Downloaded from ${d}`},
    create:   { icon: FilePlus, accentColor: "text-emerald-400",dotBg: "bg-emerald-500/20 border-emerald-500/50",badgeCls:"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",label:"Create",actionLabel: (d)      => `Created in ${d}`                                   },
    share:    { icon: Share2,   accentColor: "text-purple-400", dotBg: "bg-purple-500/20 border-purple-500/50", badgeCls: "bg-purple-500/10 text-purple-400 border border-purple-500/20", label: "Share",   actionLabel: (d)      => `Shared via ${d}`                                   },
    edit:     { icon: Pencil,   accentColor: "text-sky-400",    dotBg: "bg-sky-500/20 border-sky-500/50",      badgeCls: "bg-sky-500/10 text-sky-400 border border-sky-500/20",         label: "Edit",    actionLabel: (d)      => `Edited in ${d}`                                    },
  };

  const cfg = EVENT_CONFIG[event.type];
  const NodeIcon = cfg.icon;
  const { accentColor, dotBg, badgeCls } = cfg;

  const isDevice = destType === "Device Peripheral";
  const actionLabel = cfg.actionLabel(destName, isDevice);

  return (
    <div className="relative flex gap-0">
      {/* Timeline rail */}
      <div className="flex flex-col items-center" style={{ width: "28px", minWidth: "28px" }}>
        <div
          className={`w-px flex-none ${isFirst ? "bg-transparent" : "bg-border"}`}
          style={{ height: "8px" }}
        />
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none ${dotBg}`}>
          <NodeIcon size={8} className={accentColor} />
        </div>
        <div className={`w-px flex-1 ${isLast ? "bg-transparent" : "bg-border"}`} />
      </div>

      {/* Node content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="rounded-md px-2 py-1.5 -mx-2 -my-1.5">
          {/* Badge + timestamp */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${badgeCls}`}
              style={{ fontWeight: 600 }}
            >
              {cfg.label}
            </span>
            <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
              {event.timestamp}
            </span>
          </div>

          {/* Actor + action */}
          <div className="text-foreground/80 mt-1" style={{ fontSize: "11px" }}>
            <span className="text-text-bright">{event.actor}</span>
            {" \u2014 "}
            <span>{actionLabel}</span>
            {event.bytes > 0 && (
              <span className="text-muted-foreground ml-1">
                · {formatBytes(event.bytes)}
              </span>
            )}
          </div>

          {/* Object + Destination */}
          <div className="mt-1 space-y-0.5">
            {event.objectName && (
              <div className="flex items-center gap-1" style={{ fontSize: "10px" }}>
                <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Object:</span>
                <span className="text-foreground/70 font-mono truncate">{event.objectName}</span>
              </div>
            )}
            <div className="flex items-center gap-1" style={{ fontSize: "10px" }}>
              <span className="text-muted-foreground/60 shrink-0" style={{ minWidth: "72px" }}>Destination:</span>
              <span className="text-foreground/70">{destName}</span>
            </div>
          </div>

          {/* Data-type findings tags */}
          {event.dataTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {event.dataTypes.map((dt) => (
                <span
                  key={dt}
                  className="px-1.5 py-0.5 bg-surface-raised border border-border rounded text-text-bright"
                  style={{ fontSize: "10px" }}
                >
                  {dt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mock Data ────────────────────────────────────────────────────────────────

export const UNMANAGED_DESTINATIONS: UnmanagedDestination[] = [
  {
    id: "uapp-001",
    name: "Slack",
    category: "Collaboration",
    instanceName: "acme-workspace",
    destinationType: "Application",
    firstAccess: "2026-04-01",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(1, 30, 3 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(2, 30, 2.5 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(3, 30, 150, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 342 },
      { type: "Email Addresses", eventCount: 289 },
      { type: "Telephone Numbers", eventCount: 127 },
    ],
    uploadEventCount: 1247,
    downloadEventCount: 892,
    totalSessions: 456,
  },
  {
    id: "uapp-002",
    name: "Dropbox",
    category: "Cloud Storage",
    instanceName: "acme-business",
    destinationType: "Application",
    firstAccess: "2026-04-01",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(4, 30, 5 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(5, 30, 7 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(6, 30, 100, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 189 },
      { type: "Social Security Numbers", eventCount: 67 },
      { type: "Source Code", eventCount: 234 },
      { type: "Private Keys", eventCount: 45 },
    ],
    uploadEventCount: 856,
    downloadEventCount: 1453,
    totalSessions: 312,
  },
  {
    id: "uapp-003",
    name: "Trello",
    category: "Project Management",
    instanceName: "acme-board",
    destinationType: "Application",
    firstAccess: "2026-04-01",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(7, 30, 2 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(8, 30, 1.5 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(9, 30, 60, 0.2),
    dataTypes: [
      { type: "Email Addresses", eventCount: 445 },
      { type: "Company Names", eventCount: 210 },
    ],
    uploadEventCount: 623,
    downloadEventCount: 289,
    totalSessions: 189,
  },
  {
    id: "uapp-004",
    name: "Zoom",
    category: "Video Conferencing",
    instanceName: "acme-corp",
    destinationType: "Application",
    firstAccess: "2026-04-02",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(22, 30, 12 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(23, 30, 6 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(24, 30, 300, 0.4),
    dataTypes: [
      { type: "Email Addresses", eventCount: 678 },
      { type: "Personal Names", eventCount: 412 },
    ],
    uploadEventCount: 2345,
    downloadEventCount: 1234,
    totalSessions: 892,
  },
  {
    id: "uapp-005",
    name: "Notion",
    category: "Productivity",
    instanceName: "acme-team",
    destinationType: "Application",
    firstAccess: "2026-04-02",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(28, 30, 4 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(29, 30, 3 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(30, 30, 200, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 256 },
      { type: "Email Addresses", eventCount: 178 },
      { type: "Company Names", eventCount: 145 },
    ],
    uploadEventCount: 789,
    downloadEventCount: 612,
    totalSessions: 423,
  },
  {
    id: "uapp-006",
    name: "Asana",
    category: "Project Management",
    instanceName: "acme-projects",
    destinationType: "Application",
    firstAccess: "2026-04-02",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(31, 30, 1.5 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(32, 30, 1.2 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(33, 30, 80, 0.2),
    dataTypes: [
      { type: "Email Addresses", eventCount: 312 },
      { type: "Personal Names", eventCount: 198 },
    ],
    uploadEventCount: 456,
    downloadEventCount: 345,
    totalSessions: 167,
  },
  {
    id: "uapp-007",
    name: "Miro",
    category: "Collaboration",
    instanceName: "acme-collab",
    destinationType: "Application",
    firstAccess: "2026-04-03",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(34, 30, 6 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(35, 30, 4.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(36, 30, 120, 0.3),
    dataTypes: [
      { type: "Email Addresses", eventCount: 412 },
      { type: "Personal Names", eventCount: 298 },
      { type: "Company Names", eventCount: 134 },
    ],
    uploadEventCount: 1234,
    downloadEventCount: 987,
    totalSessions: 345,
  },
  {
    id: "uapp-008",
    name: "Monday.com",
    category: "Project Management",
    instanceName: "acme-ops",
    destinationType: "Application",
    firstAccess: "2026-04-03",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(37, 30, 2.8 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(38, 30, 2.1 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(39, 30, 95, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 234 },
      { type: "Email Addresses", eventCount: 189 },
    ],
    uploadEventCount: 678,
    downloadEventCount: 456,
    totalSessions: 234,
  },
  {
    id: "uapp-009",
    name: "Airtable",
    category: "Database",
    instanceName: "acme-db",
    destinationType: "Application",
    firstAccess: "2026-04-03",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(40, 30, 3.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(41, 30, 4.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(42, 30, 110, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 345 },
      { type: "Email Addresses", eventCount: 267 },
      { type: "Telephone Numbers", eventCount: 112 },
    ],
    uploadEventCount: 890,
    downloadEventCount: 1045,
    totalSessions: 278,
  },
  {
    id: "uapp-010",
    name: "Box",
    category: "Cloud Storage",
    instanceName: "acme-files",
    destinationType: "Application",
    firstAccess: "2026-04-04",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(43, 30, 8 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(44, 30, 6.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(45, 30, 180, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 456 },
      { type: "Email Addresses", eventCount: 378 },
      { type: "Source Code", eventCount: 201 },
    ],
    uploadEventCount: 1567,
    downloadEventCount: 1289,
    totalSessions: 456,
  },
  {
    id: "uapp-011",
    name: "Figma",
    category: "Design",
    instanceName: "acme-design",
    destinationType: "Application",
    firstAccess: "2026-04-04",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(46, 30, 15 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(47, 30, 12 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(48, 30, 250, 0.4),
    dataTypes: [
      { type: "Email Addresses", eventCount: 512 },
      { type: "Personal Names", eventCount: 389 },
    ],
    uploadEventCount: 2134,
    downloadEventCount: 1678,
    totalSessions: 567,
  },
  {
    id: "uapp-012",
    name: "Canva",
    category: "Design",
    instanceName: "acme-creative",
    destinationType: "Application",
    firstAccess: "2026-04-04",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(49, 30, 7 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(50, 30, 5.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(51, 30, 140, 0.3),
    dataTypes: [
      { type: "Email Addresses", eventCount: 298 },
      { type: "Personal Names", eventCount: 234 },
    ],
    uploadEventCount: 987,
    downloadEventCount: 756,
    totalSessions: 312,
  },
  {
    id: "uapp-013",
    name: "Microsoft Teams",
    category: "Collaboration",
    instanceName: "acme.sharepoint.com",
    destinationType: "Application",
    firstAccess: "2026-04-05",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(73, 30, 18 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(74, 30, 14 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(75, 30, 420, 0.5),
    dataTypes: [
      { type: "Personal Names", eventCount: 789 },
      { type: "Email Addresses", eventCount: 612 },
      { type: "Telephone Numbers", eventCount: 234 },
    ],
    uploadEventCount: 3456,
    downloadEventCount: 2789,
    totalSessions: 1023,
  },
  {
    id: "uapp-014",
    name: "Google Drive",
    category: "Cloud Storage",
    instanceName: "acme-drive",
    destinationType: "Application",
    firstAccess: "2026-04-05",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(76, 30, 22 * 1024 * 1024, 0.7),
    downloadSparkData: generateSparkData(77, 30, 18 * 1024 * 1024, 0.7),
    sessionsSparkData: generateSparkData(78, 30, 380, 0.4),
    dataTypes: [
      { type: "Personal Names", eventCount: 923 },
      { type: "Email Addresses", eventCount: 754 },
      { type: "Source Code", eventCount: 312 },
      { type: "Financial IDs", eventCount: 189 },
    ],
    uploadEventCount: 4123,
    downloadEventCount: 3567,
    totalSessions: 956,
  },
  {
    id: "uapp-015",
    name: "Confluence",
    category: "Documentation",
    instanceName: "acme.atlassian.net",
    destinationType: "Application",
    firstAccess: "2026-04-05",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(79, 30, 5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(80, 30, 4.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(81, 30, 210, 0.3),
    dataTypes: [
      { type: "Email Addresses", eventCount: 445 },
      { type: "Personal Names", eventCount: 312 },
      { type: "Company Names", eventCount: 198 },
    ],
    uploadEventCount: 1234,
    downloadEventCount: 987,
    totalSessions: 456,
  },
  {
    id: "uapp-016",
    name: "Jira",
    category: "Project Management",
    instanceName: "acme.atlassian.net",
    destinationType: "Application",
    firstAccess: "2026-04-06",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(82, 30, 3.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(83, 30, 2.8 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(84, 30, 290, 0.3),
    dataTypes: [
      { type: "Email Addresses", eventCount: 567 },
      { type: "Personal Names", eventCount: 423 },
    ],
    uploadEventCount: 1678,
    downloadEventCount: 1234,
    totalSessions: 678,
  },
  {
    id: "uapp-017",
    name: "Salesforce",
    category: "CRM",
    instanceName: "acme.salesforce.com",
    destinationType: "Application",
    firstAccess: "2026-04-06",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(85, 30, 9 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(86, 30, 7.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(87, 30, 310, 0.4),
    dataTypes: [
      { type: "Personal Names", eventCount: 1234 },
      { type: "Email Addresses", eventCount: 987 },
      { type: "Telephone Numbers", eventCount: 456 },
      { type: "Company Names", eventCount: 312 },
    ],
    uploadEventCount: 2890,
    downloadEventCount: 2345,
    totalSessions: 789,
  },
  {
    id: "uapp-018",
    name: "HubSpot",
    category: "CRM",
    instanceName: "acme-crm",
    destinationType: "Application",
    firstAccess: "2026-04-06",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(88, 30, 4.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(89, 30, 3.8 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(90, 30, 145, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 456 },
      { type: "Email Addresses", eventCount: 389 },
      { type: "Telephone Numbers", eventCount: 167 },
    ],
    uploadEventCount: 1123,
    downloadEventCount: 876,
    totalSessions: 312,
  },
  {
    id: "uapp-019",
    name: "GitHub",
    category: "Developer Tools",
    instanceName: "acme-org",
    destinationType: "Application",
    firstAccess: "2026-04-07",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(91, 30, 25 * 1024 * 1024, 0.7),
    downloadSparkData: generateSparkData(92, 30, 20 * 1024 * 1024, 0.7),
    sessionsSparkData: generateSparkData(93, 30, 560, 0.5),
    dataTypes: [
      { type: "Source Code", eventCount: 2345 },
      { type: "Private Keys", eventCount: 189 },
      { type: "Secrets and Tokens", eventCount: 234 },
      { type: "IP Addresses", eventCount: 145 },
    ],
    uploadEventCount: 5678,
    downloadEventCount: 4321,
    totalSessions: 1234,
  },
  {
    id: "uapp-020",
    name: "GitLab",
    category: "Developer Tools",
    instanceName: "acme.gitlab.com",
    destinationType: "Application",
    firstAccess: "2026-04-07",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(94, 30, 12 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(95, 30, 9 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(96, 30, 245, 0.4),
    dataTypes: [
      { type: "Source Code", eventCount: 1123 },
      { type: "Private Keys", eventCount: 78 },
      { type: "Secrets and Tokens", eventCount: 145 },
    ],
    uploadEventCount: 2567,
    downloadEventCount: 1890,
    totalSessions: 567,
  },
  {
    id: "uapp-021",
    name: "Postman",
    category: "Developer Tools",
    instanceName: "acme-api",
    destinationType: "Application",
    firstAccess: "2026-04-07",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(97, 30, 2.2 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(98, 30, 1.8 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(99, 30, 95, 0.2),
    dataTypes: [
      { type: "Secrets and Tokens", eventCount: 234 },
      { type: "IP Addresses", eventCount: 123 },
      { type: "Passwords", eventCount: 67 },
    ],
    uploadEventCount: 456,
    downloadEventCount: 312,
    totalSessions: 145,
  },
  {
    id: "uapp-022",
    name: "Tableau",
    category: "Analytics",
    instanceName: "acme-analytics",
    destinationType: "Application",
    firstAccess: "2026-04-01",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(100, 30, 8 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(101, 30, 6.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(102, 30, 178, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 567 },
      { type: "Email Addresses", eventCount: 423 },
      { type: "Financial IDs", eventCount: 234 },
    ],
    uploadEventCount: 1890,
    downloadEventCount: 1456,
    totalSessions: 423,
  },
  {
    id: "uapp-023",
    name: "Power BI",
    category: "Analytics",
    instanceName: "acme-bi",
    destinationType: "Application",
    firstAccess: "2026-04-02",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(103, 30, 7 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(104, 30, 5.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(105, 30, 165, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 489 },
      { type: "Email Addresses", eventCount: 356 },
      { type: "Company Names", eventCount: 178 },
      { type: "Financial IDs", eventCount: 145 },
    ],
    uploadEventCount: 1678,
    downloadEventCount: 1234,
    totalSessions: 378,
  },
  {
    id: "uapp-024",
    name: "Snowflake",
    category: "Cloud Database",
    instanceName: "acme-warehouse",
    destinationType: "Application",
    firstAccess: "2026-04-03",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(106, 30, 30 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(107, 30, 25 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(108, 30, 89, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 2345 },
      { type: "Social Security Numbers", eventCount: 567 },
      { type: "Financial IDs", eventCount: 890 },
      { type: "Medical Records", eventCount: 234 },
    ],
    uploadEventCount: 3456,
    downloadEventCount: 2890,
    totalSessions: 234,
  },
  {
    id: "uapp-025",
    name: "Zendesk",
    category: "Customer Support",
    instanceName: "acme.zendesk.com",
    destinationType: "Application",
    firstAccess: "2026-04-04",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(109, 30, 4 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(110, 30, 3.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(111, 30, 198, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 678 },
      { type: "Email Addresses", eventCount: 534 },
      { type: "Telephone Numbers", eventCount: 289 },
    ],
    uploadEventCount: 1456,
    downloadEventCount: 1123,
    totalSessions: 456,
  },
  {
    id: "uapp-026",
    name: "Intercom",
    category: "Customer Support",
    instanceName: "acme-support",
    destinationType: "Application",
    firstAccess: "2026-04-05",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(112, 30, 2.8 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(113, 30, 2.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(114, 30, 112, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 312 },
      { type: "Email Addresses", eventCount: 245 },
    ],
    uploadEventCount: 789,
    downloadEventCount: 567,
    totalSessions: 234,
  },
  {
    id: "uapp-027",
    name: "Workday",
    category: "HR Management",
    instanceName: "acme.workday.com",
    destinationType: "Application",
    firstAccess: "2026-04-06",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(115, 30, 6 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(116, 30, 4.8 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(117, 30, 145, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 1234 },
      { type: "Social Security Numbers", eventCount: 345 },
      { type: "Bank Account Information", eventCount: 178 },
      { type: "Birthdates", eventCount: 456 },
    ],
    uploadEventCount: 2123,
    downloadEventCount: 1789,
    totalSessions: 345,
  },
  {
    id: "uapp-028",
    name: "ServiceNow",
    category: "IT Service Management",
    instanceName: "acme.service-now.com",
    destinationType: "Application",
    firstAccess: "2026-04-07",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(118, 30, 3 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(119, 30, 2.5 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(120, 30, 167, 0.3),
    dataTypes: [
      { type: "Email Addresses", eventCount: 456 },
      { type: "Personal Names", eventCount: 378 },
      { type: "IP Addresses", eventCount: 234 },
    ],
    uploadEventCount: 1123,
    downloadEventCount: 867,
    totalSessions: 378,
  },
  {
    id: "uapp-029",
    name: "Webex",
    category: "Video Conferencing",
    instanceName: "acme-meetings",
    destinationType: "Application",
    firstAccess: "2026-04-01",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(121, 30, 10 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(122, 30, 7.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(123, 30, 267, 0.4),
    dataTypes: [
      { type: "Email Addresses", eventCount: 534 },
      { type: "Personal Names", eventCount: 412 },
    ],
    uploadEventCount: 1890,
    downloadEventCount: 1456,
    totalSessions: 634,
  },
  {
    id: "uapp-030",
    name: "Loom",
    category: "Video Recording",
    instanceName: "acme-videos",
    destinationType: "Application",
    firstAccess: "2026-04-02",
    status: "Sanctioned",
    uploadSparkData: generateSparkData(124, 30, 5.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(125, 30, 4 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(126, 30, 98, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 178 },
      { type: "Email Addresses", eventCount: 134 },
    ],
    uploadEventCount: 456,
    downloadEventCount: 312,
    totalSessions: 189,
  },
  {
    id: "uapp-031",
    name: "Perplexity AI",
    category: "AI Tools",
    instanceName: "personal",
    destinationType: "Application",
    firstAccess: "2026-04-03",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(130, 30, 1.2 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(131, 30, 0.8 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(132, 30, 45, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 88 },
      { type: "Source Code", eventCount: 142 },
      { type: "Internal Documents", eventCount: 67 },
    ],
    uploadEventCount: 213,
    downloadEventCount: 156,
    totalSessions: 78,
  },
  {
    id: "uapp-032",
    name: "Cursor",
    category: "Developer Tools",
    instanceName: "personal",
    destinationType: "Application",
    firstAccess: "2026-04-04",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(133, 30, 3.4 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(134, 30, 2.1 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(135, 30, 62, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 389 },
      { type: "Private Keys", eventCount: 34 },
      { type: "API Credentials", eventCount: 57 },
    ],
    uploadEventCount: 478,
    downloadEventCount: 234,
    totalSessions: 112,
  },
  {
    id: "uapp-033",
    name: "Linear",
    category: "Project Management",
    instanceName: "acme-eng",
    destinationType: "Application",
    firstAccess: "2026-04-05",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(136, 30, 0.9 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(137, 30, 0.7 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(138, 30, 38, 0.2),
    dataTypes: [
      { type: "Email Addresses", eventCount: 145 },
      { type: "Personal Names", eventCount: 98 },
      { type: "Company Names", eventCount: 76 },
    ],
    uploadEventCount: 189,
    downloadEventCount: 134,
    totalSessions: 67,
  },
  {
    id: "uapp-034",
    name: "Retool",
    category: "Developer Tools",
    instanceName: "acme-internal",
    destinationType: "Application",
    firstAccess: "2026-04-06",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(139, 30, 2.6 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(140, 30, 4.3 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(141, 30, 54, 0.3),
    dataTypes: [
      { type: "Financial Records", eventCount: 112 },
      { type: "Personal Names", eventCount: 203 },
      { type: "Email Addresses", eventCount: 167 },
    ],
    uploadEventCount: 334,
    downloadEventCount: 567,
    totalSessions: 143,
  },
  {
    id: "uapp-035",
    name: "Descript",
    category: "Video Recording",
    instanceName: "personal",
    destinationType: "Application",
    firstAccess: "2026-04-07",
    status: "Unsanctioned",
    uploadSparkData: generateSparkData(142, 30, 8.1 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(143, 30, 5.7 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(144, 30, 29, 0.2),
    dataTypes: [
      { type: "Personal Names", eventCount: 56 },
      { type: "Internal Documents", eventCount: 89 },
    ],
    uploadEventCount: 167,
    downloadEventCount: 98,
    totalSessions: 45,
  },
  {
    id: "uweb-001",
    name: "personal-cloud.example.com",
    category: "Personal Cloud",
    destinationType: "Website",
    firstAccess: "2026-04-01",
    uploadSparkData: generateSparkData(10, 30, 1.8 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(11, 30, 2.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(12, 30, 50, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 78 },
      { type: "Postal Addresses", eventCount: 156 },
      { type: "Birthdates", eventCount: 43 },
    ],
    uploadEventCount: 412,
    downloadEventCount: 567,
    totalSessions: 145,
  },
  {
    id: "uweb-002",
    name: "file-share.example.net",
    category: "File Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-01",
    uploadSparkData: generateSparkData(13, 30, 8 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(14, 30, 4.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(15, 30, 90, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 892 },
      { type: "IP Addresses", eventCount: 234 },
      { type: "Passwords", eventCount: 78 },
    ],
    uploadEventCount: 1678,
    downloadEventCount: 945,
    totalSessions: 267,
  },
  {
    id: "uweb-003",
    name: "temp-mail.example.org",
    category: "Temporary Email",
    destinationType: "Website",
    firstAccess: "2026-04-01",
    uploadSparkData: generateSparkData(25, 30, 0.5 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(26, 30, 0.6 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(27, 30, 15, 0.2),
    dataTypes: [
      { type: "Email Addresses", eventCount: 45 },
      { type: "Personal Names", eventCount: 31 },
    ],
    uploadEventCount: 89,
    downloadEventCount: 123,
    totalSessions: 34,
  },
  {
    id: "uweb-004",
    name: "chatgpt.com",
    category: "AI Assistant",
    destinationType: "Website",
    firstAccess: "2026-04-01",
    uploadSparkData: generateSparkData(52, 30, 3 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(53, 30, 2.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(54, 30, 120, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 145 },
      { type: "Email Addresses", eventCount: 98 },
      { type: "Source Code", eventCount: 234 },
    ],
    uploadEventCount: 678,
    downloadEventCount: 456,
    totalSessions: 234,
  },
  {
    id: "uweb-005",
    name: "claude.ai",
    category: "AI Assistant",
    destinationType: "Website",
    firstAccess: "2026-04-01",
    uploadSparkData: generateSparkData(55, 30, 2.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(56, 30, 2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(57, 30, 95, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 123 },
      { type: "Source Code", eventCount: 189 },
    ],
    uploadEventCount: 534,
    downloadEventCount: 389,
    totalSessions: 178,
  },
  {
    id: "uweb-006",
    name: "perplexity.ai",
    category: "AI Search",
    destinationType: "Website",
    firstAccess: "2026-04-02",
    uploadSparkData: generateSparkData(58, 30, 1.8 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(59, 30, 1.5 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(60, 30, 70, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 89 },
      { type: "Email Addresses", eventCount: 67 },
    ],
    uploadEventCount: 345,
    downloadEventCount: 289,
    totalSessions: 145,
  },
  {
    id: "uweb-007",
    name: "filetransfer.io",
    category: "File Transfer",
    destinationType: "Website",
    firstAccess: "2026-04-02",
    uploadSparkData: generateSparkData(61, 30, 12 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(62, 30, 8 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(63, 30, 85, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 456 },
      { type: "Private Keys", eventCount: 67 },
      { type: "Passwords", eventCount: 34 },
    ],
    uploadEventCount: 1234,
    downloadEventCount: 890,
    totalSessions: 198,
  },
  {
    id: "uweb-008",
    name: "wetransfer.com",
    category: "File Transfer",
    destinationType: "Website",
    firstAccess: "2026-04-02",
    uploadSparkData: generateSparkData(64, 30, 10 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(65, 30, 7 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(66, 30, 75, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 234 },
      { type: "Email Addresses", eventCount: 189 },
    ],
    uploadEventCount: 945,
    downloadEventCount: 712,
    totalSessions: 167,
  },
  {
    id: "uweb-009",
    name: "mega.nz",
    category: "Cloud Storage",
    destinationType: "Website",
    firstAccess: "2026-04-02",
    uploadSparkData: generateSparkData(67, 30, 15 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(68, 30, 12 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(69, 30, 60, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 567 },
      { type: "Private Keys", eventCount: 89 },
      { type: "Personal Names", eventCount: 178 },
    ],
    uploadEventCount: 1456,
    downloadEventCount: 1123,
    totalSessions: 145,
  },
  {
    id: "uweb-010",
    name: "pastebin.com",
    category: "Text Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-02",
    uploadSparkData: generateSparkData(70, 30, 0.8 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(71, 30, 0.6 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(72, 30, 45, 0.2),
    dataTypes: [
      { type: "Passwords", eventCount: 123 },
      { type: "Secrets and Tokens", eventCount: 89 },
      { type: "IP Addresses", eventCount: 67 },
    ],
    uploadEventCount: 234,
    downloadEventCount: 178,
    totalSessions: 89,
  },
  {
    id: "uweb-011",
    name: "github.com",
    category: "Code Hosting",
    destinationType: "Website",
    firstAccess: "2026-04-03",
    uploadSparkData: generateSparkData(127, 30, 18 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(128, 30, 14 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(129, 30, 340, 0.5),
    dataTypes: [
      { type: "Source Code", eventCount: 1890 },
      { type: "Private Keys", eventCount: 134 },
      { type: "Secrets and Tokens", eventCount: 267 },
    ],
    uploadEventCount: 3456,
    downloadEventCount: 2678,
    totalSessions: 789,
  },
  {
    id: "uweb-012",
    name: "stackoverflow.com",
    category: "Developer Forum",
    destinationType: "Website",
    firstAccess: "2026-04-03",
    uploadSparkData: generateSparkData(130, 30, 1.2 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(131, 30, 0.9 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(132, 30, 210, 0.4),
    dataTypes: [
      { type: "Source Code", eventCount: 678 },
      { type: "IP Addresses", eventCount: 123 },
    ],
    uploadEventCount: 567,
    downloadEventCount: 345,
    totalSessions: 456,
  },
  {
    id: "uweb-013",
    name: "onedrive.live.com",
    category: "Cloud Storage",
    destinationType: "Website",
    firstAccess: "2026-04-03",
    uploadSparkData: generateSparkData(133, 30, 12 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(134, 30, 9.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(135, 30, 145, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 456 },
      { type: "Email Addresses", eventCount: 345 },
      { type: "Source Code", eventCount: 234 },
    ],
    uploadEventCount: 1890,
    downloadEventCount: 1456,
    totalSessions: 312,
  },
  {
    id: "uweb-014",
    name: "icloud.com",
    category: "Cloud Storage",
    destinationType: "Website",
    firstAccess: "2026-04-03",
    uploadSparkData: generateSparkData(136, 30, 8 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(137, 30, 6.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(138, 30, 98, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 312 },
      { type: "Postal Addresses", eventCount: 189 },
      { type: "Birthdates", eventCount: 134 },
    ],
    uploadEventCount: 1234,
    downloadEventCount: 978,
    totalSessions: 234,
  },
  {
    id: "uweb-015",
    name: "anonfiles.to",
    category: "Anonymous File Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-03",
    uploadSparkData: generateSparkData(139, 30, 9 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(140, 30, 6 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(141, 30, 67, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 345 },
      { type: "Passwords", eventCount: 89 },
      { type: "Private Keys", eventCount: 56 },
    ],
    uploadEventCount: 678,
    downloadEventCount: 456,
    totalSessions: 123,
  },
  {
    id: "uweb-016",
    name: "temp.sh",
    category: "Temporary File Hosting",
    destinationType: "Website",
    firstAccess: "2026-04-04",
    uploadSparkData: generateSparkData(142, 30, 4.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(143, 30, 3.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(144, 30, 45, 0.2),
    dataTypes: [
      { type: "Source Code", eventCount: 178 },
      { type: "Secrets and Tokens", eventCount: 67 },
    ],
    uploadEventCount: 312,
    downloadEventCount: 234,
    totalSessions: 89,
  },
  {
    id: "uweb-017",
    name: "hastebin.com",
    category: "Text Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-04",
    uploadSparkData: generateSparkData(145, 30, 0.4 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(146, 30, 0.3 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(147, 30, 78, 0.2),
    dataTypes: [
      { type: "Passwords", eventCount: 89 },
      { type: "Secrets and Tokens", eventCount: 67 },
      { type: "Source Code", eventCount: 145 },
    ],
    uploadEventCount: 178,
    downloadEventCount: 134,
    totalSessions: 156,
  },
  {
    id: "uweb-018",
    name: "transfer.sh",
    category: "File Transfer",
    destinationType: "Website",
    firstAccess: "2026-04-04",
    uploadSparkData: generateSparkData(148, 30, 7 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(149, 30, 5.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(150, 30, 56, 0.2),
    dataTypes: [
      { type: "Source Code", eventCount: 289 },
      { type: "Private Keys", eventCount: 45 },
      { type: "Passwords", eventCount: 34 },
    ],
    uploadEventCount: 678,
    downloadEventCount: 489,
    totalSessions: 112,
  },
  {
    id: "uweb-019",
    name: "gemini.google.com",
    category: "AI Assistant",
    destinationType: "Website",
    firstAccess: "2026-04-04",
    uploadSparkData: generateSparkData(151, 30, 3.5 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(152, 30, 2.8 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(153, 30, 156, 0.4),
    dataTypes: [
      { type: "Personal Names", eventCount: 198 },
      { type: "Source Code", eventCount: 312 },
      { type: "Email Addresses", eventCount: 145 },
    ],
    uploadEventCount: 789,
    downloadEventCount: 567,
    totalSessions: 312,
  },
  {
    id: "uweb-020",
    name: "copilot.microsoft.com",
    category: "AI Assistant",
    destinationType: "Website",
    firstAccess: "2026-04-04",
    uploadSparkData: generateSparkData(154, 30, 2.8 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(155, 30, 2.2 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(156, 30, 134, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 156 },
      { type: "Source Code", eventCount: 267 },
    ],
    uploadEventCount: 567,
    downloadEventCount: 412,
    totalSessions: 234,
  },
  {
    id: "uweb-021",
    name: "replit.com",
    category: "Online IDE",
    destinationType: "Website",
    firstAccess: "2026-04-05",
    uploadSparkData: generateSparkData(157, 30, 5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(158, 30, 4 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(159, 30, 112, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 789 },
      { type: "Private Keys", eventCount: 45 },
      { type: "Secrets and Tokens", eventCount: 89 },
    ],
    uploadEventCount: 1234,
    downloadEventCount: 956,
    totalSessions: 267,
  },
  {
    id: "uweb-022",
    name: "codepen.io",
    category: "Online IDE",
    destinationType: "Website",
    firstAccess: "2026-04-05",
    uploadSparkData: generateSparkData(160, 30, 2.5 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(161, 30, 1.8 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(162, 30, 89, 0.2),
    dataTypes: [
      { type: "Source Code", eventCount: 456 },
      { type: "IP Addresses", eventCount: 67 },
    ],
    uploadEventCount: 567,
    downloadEventCount: 389,
    totalSessions: 167,
  },
  {
    id: "uweb-023",
    name: "sendspace.com",
    category: "File Transfer",
    destinationType: "Website",
    firstAccess: "2026-04-05",
    uploadSparkData: generateSparkData(163, 30, 6 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(164, 30, 4.5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(165, 30, 67, 0.2),
    dataTypes: [
      { type: "Personal Names", eventCount: 178 },
      { type: "Email Addresses", eventCount: 134 },
      { type: "Source Code", eventCount: 89 },
    ],
    uploadEventCount: 456,
    downloadEventCount: 345,
    totalSessions: 134,
  },
  {
    id: "uweb-024",
    name: "mediafire.com",
    category: "Cloud Storage",
    destinationType: "Website",
    firstAccess: "2026-04-05",
    uploadSparkData: generateSparkData(166, 30, 9.5 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(167, 30, 7 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(168, 30, 78, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 289 },
      { type: "Source Code", eventCount: 456 },
      { type: "Private Keys", eventCount: 67 },
    ],
    uploadEventCount: 1023,
    downloadEventCount: 789,
    totalSessions: 178,
  },
  {
    id: "uweb-025",
    name: "pcloud.com",
    category: "Cloud Storage",
    destinationType: "Website",
    firstAccess: "2026-04-05",
    uploadSparkData: generateSparkData(169, 30, 11 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(170, 30, 8.5 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(171, 30, 89, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 345 },
      { type: "Email Addresses", eventCount: 267 },
      { type: "Source Code", eventCount: 312 },
    ],
    uploadEventCount: 1234,
    downloadEventCount: 978,
    totalSessions: 198,
  },
  {
    id: "uweb-026",
    name: "ghostbin.co",
    category: "Text Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-06",
    uploadSparkData: generateSparkData(172, 30, 0.6 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(173, 30, 0.4 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(174, 30, 56, 0.2),
    dataTypes: [
      { type: "Passwords", eventCount: 78 },
      { type: "Secrets and Tokens", eventCount: 56 },
      { type: "Private Keys", eventCount: 23 },
    ],
    uploadEventCount: 145,
    downloadEventCount: 112,
    totalSessions: 89,
  },
  {
    id: "uweb-027",
    name: "dpaste.org",
    category: "Text Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-06",
    uploadSparkData: generateSparkData(175, 30, 0.3 * 1024 * 1024, 0.2),
    downloadSparkData: generateSparkData(176, 30, 0.2 * 1024 * 1024, 0.2),
    sessionsSparkData: generateSparkData(177, 30, 34, 0.2),
    dataTypes: [
      { type: "Passwords", eventCount: 45 },
      { type: "Secrets and Tokens", eventCount: 34 },
    ],
    uploadEventCount: 89,
    downloadEventCount: 67,
    totalSessions: 56,
  },
  {
    id: "uweb-028",
    name: "ideone.com",
    category: "Online IDE",
    destinationType: "Website",
    firstAccess: "2026-04-06",
    uploadSparkData: generateSparkData(178, 30, 1.5 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(179, 30, 1.1 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(180, 30, 67, 0.2),
    dataTypes: [
      { type: "Source Code", eventCount: 312 },
      { type: "IP Addresses", eventCount: 45 },
    ],
    uploadEventCount: 345,
    downloadEventCount: 256,
    totalSessions: 123,
  },
  {
    id: "uweb-029",
    name: "jsfiddle.net",
    category: "Online IDE",
    destinationType: "Website",
    firstAccess: "2026-04-06",
    uploadSparkData: generateSparkData(181, 30, 1.8 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(182, 30, 1.3 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(183, 30, 78, 0.2),
    dataTypes: [
      { type: "Source Code", eventCount: 267 },
      { type: "IP Addresses", eventCount: 34 },
    ],
    uploadEventCount: 312,
    downloadEventCount: 234,
    totalSessions: 145,
  },
  {
    id: "uweb-030",
    name: "zippyshare.net",
    category: "File Sharing",
    destinationType: "Website",
    firstAccess: "2026-04-06",
    uploadSparkData: generateSparkData(184, 30, 6.5 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(185, 30, 5 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(186, 30, 56, 0.2),
    dataTypes: [
      { type: "Personal Names", eventCount: 145 },
      { type: "Source Code", eventCount: 234 },
    ],
    uploadEventCount: 567,
    downloadEventCount: 423,
    totalSessions: 112,
  },
  {
    id: "uweb-031",
    name: "huggingface.co",
    category: "AI/ML Platform",
    destinationType: "Website",
    firstAccess: "2026-04-07",
    uploadSparkData: generateSparkData(190, 30, 4.2 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(191, 30, 3.1 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(192, 30, 62, 0.3),
    dataTypes: [
      { type: "Source Code", eventCount: 312 },
      { type: "Personal Names", eventCount: 56 },
    ],
    uploadEventCount: 289,
    downloadEventCount: 198,
    totalSessions: 87,
  },
  {
    id: "uweb-032",
    name: "airtable.com",
    category: "Database / Spreadsheet",
    destinationType: "Website",
    firstAccess: "2026-04-07",
    uploadSparkData: generateSparkData(193, 30, 2.8 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(194, 30, 1.9 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(195, 30, 48, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 178 },
      { type: "Financial Data", eventCount: 94 },
    ],
    uploadEventCount: 213,
    downloadEventCount: 145,
    totalSessions: 63,
  },
  {
    id: "uweb-033",
    name: "grammarly.com",
    category: "Writing Assistant",
    destinationType: "Website",
    firstAccess: "2026-04-07",
    uploadSparkData: generateSparkData(196, 30, 1.1 * 1024 * 1024, 0.3),
    downloadSparkData: generateSparkData(197, 30, 0.7 * 1024 * 1024, 0.3),
    sessionsSparkData: generateSparkData(198, 30, 34, 0.2),
    dataTypes: [
      { type: "Personal Names", eventCount: 201 },
      { type: "Email Addresses", eventCount: 67 },
    ],
    uploadEventCount: 178,
    downloadEventCount: 89,
    totalSessions: 42,
  },
  {
    id: "uweb-034",
    name: "transfernow.net",
    category: "File Transfer",
    destinationType: "Website",
    firstAccess: "2026-04-07",
    uploadSparkData: generateSparkData(199, 30, 18 * 1024 * 1024, 0.6),
    downloadSparkData: generateSparkData(200, 30, 11 * 1024 * 1024, 0.6),
    sessionsSparkData: generateSparkData(201, 30, 29, 0.2),
    dataTypes: [
      { type: "Source Code", eventCount: 534 },
      { type: "Passwords", eventCount: 45 },
    ],
    uploadEventCount: 456,
    downloadEventCount: 312,
    totalSessions: 38,
  },
  {
    id: "uweb-035",
    name: "notion.so",
    category: "Notes / Collaboration",
    destinationType: "Website",
    firstAccess: "2026-04-07",
    uploadSparkData: generateSparkData(202, 30, 3.4 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(203, 30, 2.6 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(204, 30, 55, 0.3),
    dataTypes: [
      { type: "Personal Names", eventCount: 143 },
      { type: "Financial Data", eventCount: 78 },
    ],
    uploadEventCount: 267,
    downloadEventCount: 189,
    totalSessions: 74,
  },
  {
    id: "udev-001",
    name: "USB Drive - Kingston 64GB",
    category: "Removable Storage",
    destinationType: "Device Peripheral",
    firstAccess: "2026-01-15",
    uploadSparkData: generateSparkData(16, 30, 2.5 * 1024 * 1024, 0.4),
    downloadSparkData: generateSparkData(17, 30, 3.5 * 1024 * 1024, 0.4),
    sessionsSparkData: generateSparkData(18, 30, 25, 0.2),
    dataTypes: [
      { type: "Payment Cards", eventCount: 234 },
      { type: "Bank Account Information", eventCount: 89 },
      { type: "Financial IDs", eventCount: 112 },
    ],
    uploadEventCount: 456,
    downloadEventCount: 789,
    totalSessions: 78,
  },
  {
    id: "udev-002",
    name: "External HDD - Seagate 2TB",
    category: "External Storage",
    destinationType: "Device Peripheral",
    firstAccess: "2026-02-03",
    uploadSparkData: generateSparkData(19, 30, 10 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(20, 30, 9 * 1024 * 1024, 0.5),
    sessionsSparkData: generateSparkData(21, 30, 50, 0.3),
    dataTypes: [
      { type: "Medical Records", eventCount: 567 },
      { type: "Healthcare IDs", eventCount: 345 },
      { type: "Personal Names", eventCount: 1234 },
      { type: "Social Security Numbers", eventCount: 298 },
      { type: "Birthdates", eventCount: 189 },
    ],
    uploadEventCount: 2145,
    downloadEventCount: 1823,
    totalSessions: 156,
  },
];

// ── Shift firstAccess dates into the "Last 7 Days" window (always relative to today) ─
{
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOffset = (n: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    return toYMD(d);
  };
  // Original seed dates Apr 1–7 map to today-6 … today
  const shift: Record<string, string> = {
    "2026-04-01": dayOffset(6),
    "2026-04-02": dayOffset(5),
    "2026-04-03": dayOffset(4),
    "2026-04-04": dayOffset(3),
    "2026-04-05": dayOffset(2),
    "2026-04-06": dayOffset(1),
    "2026-04-07": dayOffset(0),
  };
  UNMANAGED_DESTINATIONS.forEach((d) => {
    if (shift[d.firstAccess]) d.firstAccess = shift[d.firstAccess];
  });
}
// TODAY_YMD is used by "New" badge logic below
const TODAY_YMD = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); })();

// ── Filtering Logic ────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministically derive the "identities with usage" count from a row's id. */
function getIdentityCount(row: UnmanagedDestination): number {
  const seed = row.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Math.max(1, (seed % 45) + 3);
}

/** Deterministically generate a short instance ID from a row's id. */
function getInstanceId(row: UnmanagedDestination): string {
  let hash = 0;
  for (let i = 0; i < row.id.length; i++) {
    hash = (hash * 31 + row.id.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0").slice(0, 8);
  return `inst-${hex}`;
}

const TYPE_FILTER_MAP: Record<TypeFilter, string[]> = {
  "Application": ["Application"],
  "Website": ["Website"],
  "Device Peripheral": ["Device Peripheral"],
};

// Helper to check if a destination is "new" (within last 24 hours)
function isNewDestination(firstAccess: string): boolean {
  const accessDate = new Date(firstAccess);
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 86_400_000);
  return accessDate >= twentyFourHoursAgo;
}

function getTitle(filter?: TypeFilter): string {
  if (!filter) return "Unmanaged Destinations";
  switch (filter) {
    case "Application":
      return "Application";
    case "Website":
      return "Website";
    case "Device Peripheral":
      return "Unmanaged Device & Peripherals";
  }
}

function getSubtitle(filter?: TypeFilter): string {
  if (!filter) return "All unmanaged destinations";
  
  switch (filter) {
    case "Application":
      return `Applications and instances accessed by your organization · ${UNMANAGED_DESTINATIONS.filter(d => d.destinationType === "Application").length} destinations`;
    case "Website":
      return `Websites accessed by your organization · ${UNMANAGED_DESTINATIONS.filter(d => d.destinationType === "Website").length} destinations`;
    case "Device Peripheral":
      return `External devices and peripherals · ${UNMANAGED_DESTINATIONS.filter(d => d.destinationType === "Device Peripheral").length} destinations`;
  }
}

function getSubtitleExtra(filter?: TypeFilter): { text: string; count: number } | null {
  if (!filter || filter === "Device Peripheral") return null;
  
  // Count "new" destinations for the current filter
  const filteredDestinations = UNMANAGED_DESTINATIONS.filter(
    d => TYPE_FILTER_MAP[filter].includes(d.destinationType)
  );
  const newCount = filteredDestinations.filter(d => isNewDestination(d.firstAccess)).length;
  
  if (newCount === 0) return null;
  
  return {
    text: `${newCount} newly discovered in the past 24 hours`,
    count: newCount
  };
}

// ── Sort Configuration ───────────────────────────────────────────────────────

const SORT_COLUMNS_BASE: SortColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "destinationType", label: "Destination Type" },
  { key: "firstAccess", label: "First seen" },
  { key: "status", label: "Status" },
  { key: "upload", label: "Uploaded" },
  { key: "download", label: "Downloaded" },
];

// ── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UnmanagedDestination["status"] }) {
  if (!status) return null;
  return (
    <span className="text-muted-foreground" style={{ fontSize: "12px" }}>
      {status}
    </span>
  );
}

// (SparkTrend, SectionHeading, InfoRow → panel-shared.tsx)

// ── Sensitive Volume Trend Line Chart ───────────────────────────────────────────────────

// Today = March 11, 2026 → index 29; index 0 = Feb 10, 2026
function getChartDate(index: number): Date {
  const base = new Date(2026, 1, 10); // Feb 10 2026
  const d = new Date(base);
  d.setDate(base.getDate() + index);
  return d;
}

function formatChartDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatValue(value: number, isBytes: boolean): string {
  if (!isBytes) return value.toLocaleString();
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function VolumeTrendLineChart({
  data,
  height = 100,
  isBytes = true,
  label,
}: {
  data: number[];
  height?: number;
  isBytes?: boolean;
  label: string;
}) {
  const chartData = useMemo(
    () =>
      data.map((value, i) => ({
        i,
        dateStr: formatChartDate(getChartDate(i)),
        value,
      })),
    [data],
  );

  const xTicks = [0, 7, 14, 21, 29];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis
          dataKey="i"
          ticks={xTicks}
          tickFormatter={(i) => formatChartDate(getChartDate(i))}
          tick={{ fill: "#64748b", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          cursor={{ stroke: "rgba(148,163,184,0.2)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return (
              <div
                style={{
                  background: "var(--surface-raised, #1e293b)",
                  border: "1px solid var(--border, #334155)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1 }}>
                  {item.dateStr}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-bright, #f1f5f9)" }}>
                  {formatValue(item.value, isBytes)}
                </div>
              </div>
            );
          }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke="#60a5fa"
          strokeWidth={1.5}
          fill="rgba(96,165,250,0.12)"
          dot={false}
          activeDot={{ r: 3, fill: "#60a5fa", stroke: "#0f172a", strokeWidth: 1.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Sensitive Files — Severity & Data-Type Metadata ──────────────────────────

// (SEVERITY_CONFIG, DT_INFO/getDtInfo → panel-shared.tsx as SEVERITY_CONFIG / getDataTypeInfo)
type Severity = keyof typeof SEVERITY_CONFIG;

function getDtInfo(typeName: string) {
  return getDataTypeInfo(typeName);
}

// ── Sensitive Files Tab ────────────────────────────────────────────────────────

const SAMPLE_FILE_NAMES_UMD = [
  "employee_records.csv", "q4_financial_report.pdf", "customer_export.xlsx",
  "api_credentials.env", "patient_data_2026.csv", "payroll_march.xlsx",
  "contracts_signed.pdf", "user_database_backup.sql", "health_records.json",
  "tax_filing_2025.pdf", "credit_card_transactions.csv", "source_code_archive.zip",
  "hr_personnel_files.xlsx", "medical_invoices.pdf", "access_tokens.txt",
  "client_ssn_list.csv", "salary_bands.xlsx", "vendor_contracts.pdf",
  "authentication_keys.pem", "gdpr_data_export.json",
];

const ACCESS_METHODS_UMD = [
  "Browser Upload", "Desktop App", "API Transfer", "Mobile App",
  "Browser Download", "CLI Tool", "Email Attachment", "File Sync",
];

function generateUMDSensitiveFiles(row: UnmanagedDestination) {
  const dtTypes = row.dataTypes.map((d) => d.type);
  if (dtTypes.length === 0) return [];
  const totalEvents = row.dataTypes.reduce((s, d) => s + d.eventCount, 0);
  const count = Math.min(Math.max(totalEvents, 3), 40);
  const seed = (row.id.charCodeAt(row.id.length - 1) || 7) * 7 + 13;

  const files: {
    name: string; dataTypes: string; entityTypes: string[];
    modified: string; hash: string; sizeKb: number;
    actor: string; device: string; accessMethod: string; originalIdx: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const baseName = SAMPLE_FILE_NAMES_UMD[i % SAMPLE_FILE_NAMES_UMD.length];
    const cycle = Math.floor(i / SAMPLE_FILE_NAMES_UMD.length);
    const name = cycle === 0 ? baseName : baseName.replace(/(\.\w+)$/, `_${cycle}$1`);
    const hash = ((seed + i * 31) % 97);
    const numTypes = 1 + (hash % Math.min(3, dtTypes.length));
    const startIdx = (hash + i) % dtTypes.length;
    const entityTypes: string[] = [];
    for (let t = 0; t < numTypes; t++) {
      const dt = dtTypes[(startIdx + t) % dtTypes.length];
      if (!entityTypes.includes(dt)) entityTypes.push(dt);
    }
    const daysAgo = ((hash + i * 13) % 55);
    const dateObj = new Date(2026, 1, 24);
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const modified = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    // Deterministic mock hash
    const hashStr = Array.from({ length: 8 }, (_, k) =>
      ((seed * 7 + i * 31 + k * 13) % 256).toString(16).padStart(2, "0")
    ).join("") + "…";
    const sizeKb = 12 + ((hash + i * 7) % 2048);
    const actor = MOCK_ACTORS[(seed + i) % MOCK_ACTORS.length].name;
    const device = MOCK_DEVICES[(seed + i + 1) % MOCK_DEVICES.length];
    const accessMethod = ACCESS_METHODS_UMD[(hash + i) % ACCESS_METHODS_UMD.length];
    // Map to a category recognised by ForensicDetailPane
    const category = getDtInfo(entityTypes[0]).category;
    files.push({
      name, dataTypes: category, entityTypes,
      modified, hash: hashStr, sizeKb, actor, device, accessMethod, originalIdx: i,
    });
  }
  return files;
}

// ── Activity action colors ────────────────────────────────────────────────────

const ACTIVITY_ACTION_COLORS_UM: Record<string, string> = {
  Uploaded: "text-primary",
  Downloaded: "text-primary",
  Modified: "text-primary",
  Shared: "text-primary",
};

// ── File Preview Pane ────────────────────────────────��────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UnmanagedFilePreviewPane({
  file,
  row,
  onClose,
  onViewFullDetails,
}: {
  file: { name: string; entityTypes: string[]; modified: string };
  row: UnmanagedDestination;
  onClose: () => void;
  onViewFullDetails: () => void;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
  const recentActivity = useMemo(() => generateFileAccessHistory(file.name).slice(0, 3), [file.name]);

  const extColor =
    ext === "XLSX" || ext === "XLS" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" :
    ext === "PDF" ? "bg-red-600/20 text-red-400 border-red-500/30" :
    ext === "CSV" ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
    ext === "DOCX" || ext === "DOC" ? "bg-sky-600/20 text-sky-400 border-sky-500/30" :
    "bg-slate-600/20 text-slate-400 border-slate-500/30";

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${extColor}`}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.02em" }}>{ext}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-text-bright truncate" style={{ fontSize: "13px", fontWeight: 600 }}>{file.name}</div>
            <div className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "11px" }}>
              {row.name} · Data in Motion
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-surface-raised transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>File Details</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Size</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{sizeKb} KB</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Last Seen</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{file.modified}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Entity Data Types ({file.entityTypes.length})</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {file.entityTypes.map((dt) => {
              const cat = DT_TYPE_TO_CAT[dt] ?? "PII";
              const colors = DT_CAT_COLORS[cat] ?? DT_CAT_COLORS.PII;
              return (
                <div key={dt} className="flex items-center gap-3 px-3 py-2">
                  <span className={`shrink-0 inline-flex items-center justify-center rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "11px", fontWeight: 400, width: 32, height: 20 }}>{cat}</span>
                  <span className="text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Recent Activity</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {recentActivity.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <User size={12} className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-text-bright truncate" style={{ fontSize: "12px" }}>{entry.user}</span>
                <span className={`shrink-0 ${ACTIVITY_ACTION_COLORS_UM[entry.action] ?? "text-muted-foreground"}`} style={{ fontSize: "11px", fontWeight: 500 }}>{entry.action}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums" style={{ fontSize: "11px" }}>{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button type="button" onClick={onViewFullDetails} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors" style={{ fontSize: "13px", fontWeight: 600 }}>
          View Full Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function SensitiveFilesTabContent({ row, onViewFullDetails, initialDataTypeFilter }: { row: UnmanagedDestination; onViewFullDetails?: (fileIdx: number) => void; initialDataTypeFilter?: string[] }) {
  const [search, setSearch] = useState("");
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>(initialDataTypeFilter ?? []);
  const [openDropdown, setOpenDropdown] = useState<"data-type" | null>(null);
  const [hoveredBarDt, setHoveredBarDt] = useState<{ dtName: string; clientX: number; clientY: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  const files = useMemo(() => generateUMDSensitiveFiles(row), [row]);

  const totalEvents = useMemo(() => row.dataTypes.reduce((s, d) => s + d.eventCount, 0) || 1, [row]);
  const sevOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedTypes = useMemo(
    () => [...row.dataTypes].sort((a, b) => {
      const sa = getDtInfo(a.type).severity;
      const sb = getDtInfo(b.type).severity;
      if (sevOrder[sa] !== sevOrder[sb]) return sevOrder[sa] - sevOrder[sb];
      return b.eventCount - a.eventCount;
    }),
    [row],
  );

  // Per-data-type file counts
  const dtCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dt of row.dataTypes) counts[dt.type] = 0;
    for (const f of files) {
      for (const et of f.entityTypes) {
        if (et in counts) counts[et]++;
      }
    }
    return counts;
  }, [files, row.dataTypes]);

  const hasDataTypeFilter = dataTypeFilter.length > 0;
  const filteredFiles = useMemo(() => {
    let result = files;
    if (hasDataTypeFilter) {
      result = result.filter((f) =>
        dataTypeFilter.some((dt) => f.entityTypes.some((et) => et.toLowerCase() === dt.toLowerCase()))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(q) || f.entityTypes.some((et) => et.toLowerCase().includes(q))
      );
    }
    return result;
  }, [files, search, dataTypeFilter, hasDataTypeFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const openDataTypePicker = useCallback(() => {
    setOpenDropdown((prev) => (prev === "data-type" ? null : "data-type"));
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => fileListRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full">
      <div ref={fileListRef} className="flex-1 overflow-y-auto">

        {/* Summary card */}
        <div className="px-3 pt-3 pb-2.5 border-b border-border">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2.5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-bright tabular-nums" style={{ fontSize: "20px", fontWeight: 700 }}>{files.length}</span>
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Sensitive Objects</span>
              </div>
              <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{totalEvents.toLocaleString()} events</span>
            </div>
            {sortedTypes.length > 0 && (() => {
              const ALL_CATS = ["PII", "SPII", "PSI", "PCI", "PFI", "PHI", "PAI", "BII"] as const;
              type Cat = typeof ALL_CATS[number];
              const catMap: Record<Cat, Record<string, number>> = {} as Record<Cat, Record<string, number>>;
              for (const cat of ALL_CATS) catMap[cat] = {};
              for (const dt of sortedTypes) {
                const cat = (DT_TYPE_TO_CAT[dt.type] ?? "PII") as Cat;
                catMap[cat][dt.type] = (catMap[cat][dt.type] ?? 0) + dt.eventCount;
              }
              const catCounts = ALL_CATS.map((cat) => ({
                cat,
                count: Object.values(catMap[cat]).reduce((s, n) => s + n, 0),
              }));
              const presentCatCounts = catCounts.filter(({ count }) => count > 0);
              const rowTotal = presentCatCounts.reduce((s, c) => s + c.count, 0) || 1;
              return (
                <>
                  <div
                    className="flex w-full rounded-full overflow-hidden gap-px mb-2.5"
                    style={{ height: 6 }}
                    onMouseLeave={() => setHoveredBarDt(null)}
                  >
                    {presentCatCounts.map(({ cat, count }) => {
                      const colors = DT_CAT_COLORS[cat];
                      const isActive = hoveredBarDt?.dtName === cat;
                      return (
                        <div
                          key={cat}
                          className={`${colors.dot} cursor-pointer transition-opacity duration-100`}
                          style={{ flex: count / rowTotal, opacity: isActive ? 1 : 0.75 }}
                          onMouseEnter={(ev) => setHoveredBarDt({ dtName: cat, clientX: ev.clientX, clientY: ev.clientY })}
                          onMouseLeave={() => setHoveredBarDt(null)}
                        />
                      );
                    })}
                  </div>
                  {hoveredBarDt && (() => {
                    const cat = hoveredBarDt.dtName as Cat;
                    const colors = DT_CAT_COLORS[cat];
                    if (!colors) return null;
                    const typeCounts = catMap[cat] ?? {};
                    const sortedCatTypes = Object.entries(typeCounts)
                      .filter(([, n]) => n > 0)
                      .sort((a, b) => b[1] - a[1]);
                    return createPortal(
                      <div
                        className="pointer-events-none"
                        style={{ position: "fixed", zIndex: 9999, left: hoveredBarDt.clientX, top: hoveredBarDt.clientY + 10, transform: "translateX(-50%)" }}
                      >
                        <div className="flex justify-center" style={{ marginBottom: 2 }}>
                          <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "5px solid rgba(148,163,184,0.2)" }} />
                        </div>
                        <div className="border rounded-md shadow-xl" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)", minWidth: 200 }}>
                          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Objects by Data Type</span>
                            <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "10px", fontWeight: 600 }}>{cat}</span>
                          </div>
                          <div className="px-3 py-2 space-y-1.5">
                            {sortedCatTypes.length > 0 ? sortedCatTypes.map(([dtName, count]) => (
                              <div key={dtName} className="flex items-center justify-between gap-3">
                                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>{dtName}</span>
                                <span style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                              </div>
                            )) : (
                              <div style={{ fontSize: "10px", color: "#475569" }}>No objects</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 px-3 pb-2 pt-1 border-t" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                            <ArrowRight size={9} style={{ color: "#60a5fa" }} />
                            <span style={{ fontSize: "10px", color: "#60a5fa" }}>Click a segment to filter by type</span>
                          </div>
                        </div>
                      </div>,
                      document.body
                    );
                  })()}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {presentCatCounts.map(({ cat }) => {
                        const colors = DT_CAT_COLORS[cat];
                        return (
                          <span key={cat} className="inline-flex items-center gap-1" style={{ fontSize: "10px" }}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                            <span className="text-muted-foreground">{cat}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="sticky top-0 z-10 bg-background">
          <div className="px-3 pt-2.5 pb-2 space-y-2">
          {/* Search */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: "12px" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 text-muted-foreground hover:text-text-bright transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Data Type filter pill + dropdown */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-center gap-1.5 flex-wrap">
              {hasDataTypeFilter ? (
                <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                  <button
                    type="button" onClick={openDataTypePicker}
                    className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                    Data Type
                    <span className="text-primary/50 mx-0.5">|</span>
                    <span className="truncate max-w-[80px]">
                      {dataTypeFilter.length === 1 ? dataTypeFilter[0] : `${dataTypeFilter.length} selected`}
                    </span>
                    <ChevronDown size={9} className="ml-0.5 opacity-60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDataTypeFilter([]); setOpenDropdown(null); }}
                    className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                    aria-label="Clear data type filter"
                  >
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button
                  type="button" onClick={openDataTypePicker}
                  className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                    openDropdown === "data-type"
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                  }`}
                  style={{ fontSize: "10px", fontWeight: 400 }}
                >
                  <Plus size={9} />
                  Data Type
                </button>
              )}
            </div>

            {/* Data Type dropdown */}
            {openDropdown === "data-type" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 pt-2 pb-2 border-b border-border">
                  <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {row.dataTypes.map((dt) => {
                    const count = dtCounts[dt.type] ?? 0;
                    if (count === 0) return null;
                    return (
                      <label key={dt.type} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                        <input
                          type="checkbox" checked={dataTypeFilter.includes(dt.type)}
                          onChange={() => setDataTypeFilter((prev) =>
                            prev.includes(dt.type) ? prev.filter((t) => t !== dt.type) : [...prev, dt.type]
                          )}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                        />
                        <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{dt.type}</span>
                        <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Result count */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
            <FolderOpen size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {filteredFiles.length}{search || hasDataTypeFilter ? ` of ${files.length}` : ""} {files.length === 1 ? "file" : "files"}
            </span>
          </div>
        </div>

        {/* File list */}
        {filteredFiles.length > 0 ? (
          <div className="px-2 py-1">
            {filteredFiles.map((file) => (
              <button
                key={file.originalIdx} type="button"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40"
                onClick={() => onViewFullDetails?.(file.originalIdx)}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-nav-active, #1e293b)" }}>
                  <FileText size={14} className="text-muted-foreground/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 450 }}>{file.name}</div>
                  <div className="flex items-center gap-1.5 mt-0">
                    <User size={9} className="text-muted-foreground/50 shrink-0" />
                    <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{file.actor}</span>
                    <span className="text-muted-foreground opacity-30 shrink-0">&middot;</span>
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}><span className="text-muted-foreground/60">Scanned:</span> {(() => { const d = new Date(file.modified); return isNaN(d.getTime()) ? file.modified : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0 flex-wrap">
                    <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{file.entityTypes.join(", ")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (search || hasDataTypeFilter) ? (
          <div className="px-2 text-center text-muted-foreground mt-6 py-4" style={{ fontSize: "12px" }}>
            {search ? <>No files match &ldquo;{search}&rdquo;</> : <>No matching files</>}
          </div>
        ) : files.length === 0 ? (
          <div className="px-2 text-center text-muted-foreground mt-8 py-8" style={{ fontSize: "12px" }}>
            <div className="mb-2" style={{ fontSize: "14px", color: "var(--text-bright)" }}>No sensitive files detected</div>
            <div style={{ fontSize: "11px" }}>No sensitive data has been intercepted for this destination</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTabContent({ 
  row, 
  showStatus,
  onTabChange,
  onTabChangeWithFilter,
}: { 
  row: UnmanagedDestination; 
  showStatus: boolean;
  onTabChange: (tab: PanelTab) => void;
  onTabChangeWithFilter: (tab: PanelTab, filter: string[]) => void;
}) {
  const [selectedMetric, setSelectedMetric] = useState<ActivityMetric>("totalBytes");
  const [hoveredObjCat, setHoveredObjCat] = useState<{ cat: string; clientX: number; clientY: number } | null>(null);

  const totalBytes = sumSparkData(row.uploadSparkData) + sumSparkData(row.downloadSparkData);

  const totalEvents = useMemo(() => row.dataTypes.reduce((s, d) => s + d.eventCount, 0) || 1, [row]);
  // Group data types by category for bar segments
  const objCatMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const dt of row.dataTypes) {
      const cat = DT_TYPE_TO_CAT[dt.type] ?? "PII";
      if (!map[cat]) map[cat] = {};
      map[cat][dt.type] = (map[cat][dt.type] ?? 0) + dt.eventCount;
    }
    return map;
  }, [row]);
  const objCatCounts = useMemo(() =>
    Object.entries(objCatMap)
      .map(([cat, types]) => ({ cat, total: Object.values(types).reduce((s, n) => s + n, 0) }))
      .sort((a, b) => b.total - a.total),
    [objCatMap],
  );
  const objCatVisualWeights = useMemo(() => objCatCounts.map(c => Math.pow(Math.max(c.total, 1), 1.7)), [objCatCounts]);
  const totalObjCatVisualWeight = useMemo(() => objCatVisualWeights.reduce((s, w) => s + w, 0) || 1, [objCatVisualWeights]);

  const metrics: Record<ActivityMetric, { label: string; data: number[] }> = {
    totalBytes: {
      label: "Total Bytes",
      data: row.uploadSparkData.map((up, i) => up + row.downloadSparkData[i]),
    },
    bytesUploaded: {
      label: "Bytes Uploaded",
      data: row.uploadSparkData,
    },
    bytesDownloaded: {
      label: "Bytes Downloaded",
      data: row.downloadSparkData,
    },
    sessions: {
      label: "Session Count",
      data: row.sessionsSparkData,
    },
  };

  const selectedData = metrics[selectedMetric];

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Basic Information */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3.5 py-3">
        <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Basic Information</div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <InfoRow label="Category" value={row.category} />
            <InfoRow label="Destination Type" value={row.destinationType} />
          </div>
          
          <div className="w-px bg-border"></div>
          
          <div className="flex-1 space-y-2">
            <InfoRow label="First Access" value={row.firstAccess} />
            {showStatus && row.status && (
              <InfoRow label="Sanction Status" value={<StatusBadge status={row.status} />} />
            )}
          </div>
        </div>
      </div>

      {/* ── Files ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

        {/* Card header */}
        <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-border/30">
          <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>Objects</span>
          <button
            type="button"
            onClick={() => onTabChange("sensitive-files")}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
            style={{ fontSize: "11px", fontWeight: 500 }}
          >
            <span>View sensitive objects</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Card body: left KPI | divider | right bar */}
        <div className="flex items-stretch px-3.5 py-3 gap-0">

          {/* Left: sensitive files KPI */}
          <button
            type="button"
            onClick={() => onTabChange("sensitive-files")}
            className="shrink-0 pr-4 flex flex-col justify-center text-left group cursor-pointer"
            style={{ minWidth: 90 }}
          >
            <span className="text-text-bright tabular-nums group-hover:text-blue-300 transition-colors" style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1 }}>
              {formatNumber(totalEvents)}
            </span>
            <span className="text-muted-foreground group-hover:text-blue-400 mt-1 transition-colors" style={{ fontSize: "10px" }}>sensitive objects</span>
          </button>

          {/* Vertical divider */}
          <div className="w-px bg-border/50 mx-3.5 shrink-0" />

          {/* Right: segmented bar by data type category */}
          <div
            className="flex-1 min-w-0 flex flex-col justify-center gap-2"
            onMouseLeave={() => setHoveredObjCat(null)}
          >
            <div className="relative">
              <span className="text-muted-foreground mb-1 block" style={{ fontSize: "11px", letterSpacing: "0.04em" }}>Data Type Distribution</span>
              <div
                className="flex w-full rounded-full overflow-hidden"
                style={{ height: "calc(var(--spacing) * 1.5)", gap: 1 }}
              >
                {objCatCounts.map((catEntry, idx) => {
                  const colors = DT_CAT_COLORS[catEntry.cat as keyof typeof DT_CAT_COLORS] ?? DT_CAT_COLORS.PII;
                  const isHov = hoveredObjCat?.cat === catEntry.cat;
                  const isDim = hoveredObjCat !== null && !isHov;
                  return (
                    <div
                      key={catEntry.cat}
                      role="button"
                      tabIndex={0}
                      className={`${colors.dot} transition-all duration-100 cursor-pointer`}
                      style={{ flex: `${objCatVisualWeights[idx]} 1 0`, minWidth: 10, opacity: isDim ? 0.15 : isHov ? 1 : 0.82 }}
                      onMouseEnter={(e) => setHoveredObjCat({ cat: catEntry.cat, clientX: e.clientX, clientY: e.clientY })}
                      onMouseMove={(e) => setHoveredObjCat(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null)}
                      onClick={() => onTabChangeWithFilter("sensitive-files", Object.keys(objCatMap[catEntry.cat] ?? {}))}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTabChangeWithFilter("sensitive-files", Object.keys(objCatMap[catEntry.cat] ?? {})); }}
                    />
                  );
                })}
              </div>

              {/* Foot labels */}
              <div className="flex items-center justify-start mt-1" style={{ fontSize: "10px" }}>
                <span className="text-muted-foreground">
                  {objCatCounts.length} {objCatCounts.length === 1 ? "category" : "categories"}
                </span>
              </div>
            </div>
          </div>

          {/* Hover tooltip — portal, follows cursor */}
          {hoveredObjCat && (() => {
            const colors = DT_CAT_COLORS[hoveredObjCat.cat as keyof typeof DT_CAT_COLORS] ?? DT_CAT_COLORS.PII;
            const typeCounts = objCatMap[hoveredObjCat.cat] ?? {};
            const sortedCatTypes = Object.entries(typeCounts)
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1]);
            const TOOLTIP_W = 240;
            const EDGE = 8;
            const clampedLeft = Math.max(EDGE + TOOLTIP_W / 2, Math.min(window.innerWidth - EDGE - TOOLTIP_W / 2, hoveredObjCat.clientX));
            return createPortal(
              <div
                className="pointer-events-none"
                style={{ position: "fixed", zIndex: 9999, left: clampedLeft, top: hoveredObjCat.clientY + 10, transform: "translateX(-50%)" }}
              >
                <div className="flex justify-center" style={{ marginBottom: 2 }}>
                  <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "5px solid rgba(148,163,184,0.2)" }} />
                </div>
                <div className="border rounded-md shadow-xl" style={{ background: "#0c1526", borderColor: "rgba(148,163,184,0.2)", minWidth: 200 }}>
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "#94a3b8" }}>Objects by Data Type</span>
                    <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "10px", fontWeight: 600 }}>{hoveredObjCat.cat}</span>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {sortedCatTypes.length > 0 ? sortedCatTypes.map(([dtName, count]) => (
                      <div key={dtName} className="flex items-center justify-between gap-3">
                        <span style={{ fontSize: "11px", color: "#cbd5e1" }}>{dtName}</span>
                        <span style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                      </div>
                    )) : (
                      <div style={{ fontSize: "10px", color: "#475569" }}>No objects</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-3 pb-2 pt-1 border-t" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                    <ArrowRight size={9} style={{ color: "#60a5fa" }} />
                    <span style={{ fontSize: "10px", color: "#60a5fa" }}>Click a segment to filter by type</span>
                  </div>
                </div>
              </div>,
              document.body
            );
          })()}
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg px-3.5 py-3 space-y-3">
        <div className="text-muted-foreground mb-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Activity</div>
          {/* Metrics in one line */}
          <div className="flex gap-4">
            <div className="flex-1 flex items-center justify-between gap-2">
              <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Total Bytes
              </div>
              <div className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
                {formatBytes(totalBytes)}
              </div>
            </div>

            <div className="w-px bg-border"></div>

            <div className="flex-1 flex items-center justify-between gap-2">
              <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Sessions
              </div>
              <div className="text-text-bright tabular-nums" style={{ fontSize: "11px" }}>
                {row.totalSessions.toLocaleString()}
              </div>
            </div>

            <div className="w-px bg-border"></div>

            <div className="flex-1 flex items-center justify-between gap-2">
              <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Uploaded
              </div>
              <button
                onClick={() => onTabChange("activity")}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
                style={{ fontSize: "11px", fontWeight: 500 }}
              >
                <span>{row.uploadEventCount.toLocaleString()} events</span>
                <ArrowRight size={12} />
              </button>
            </div>
            
            <div className="w-px bg-border"></div>
            
            <div className="flex-1 flex items-center justify-between gap-2">
              <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Downloaded
              </div>
              <button
                onClick={() => onTabChange("activity")}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors"
                style={{ fontSize: "11px", fontWeight: 500 }}
              >
                <span>{row.downloadEventCount.toLocaleString()} events</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Sensitive Volume Trend Graph */}
          <div className="pt-2 space-y-2">
            {/* Divider */}
            <div className="h-px bg-border -mx-3.5"></div>
            
            {/* Dropdown */}
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>
                Sensitive Volume Trend
              </div>
              <div className="relative">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as ActivityMetric)}
                  className="appearance-none bg-surface-overlay rounded-md px-3 py-1.5 pr-8 text-text-bright cursor-pointer hover:bg-surface-raised transition-colors"
                  style={{ fontSize: "11px" }}
                >
                  <option value="totalBytes">Total Bytes</option>
                  <option value="bytesUploaded">Bytes Uploaded</option>
                  <option value="bytesDownloaded">Bytes Downloaded</option>
                  <option value="sessions">Session Count</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Graph */}
            <div className="bg-surface-overlay rounded-lg px-3 py-3">
              <VolumeTrendLineChart
                data={selectedData.data}
                height={112}
                isBytes={selectedMetric !== "sessions"}
                label={selectedData.label}
              />
            </div>
          </div>
        </div>
    </div>
  );
}

// ── Access Tab ────────────────────────────────────────────────────────────────

type AccessIdentity = {
  id: string;
  name: string;
  email: string | null;             // null for IP-only identities
  type: "User" | "IP";
  identityClass: IdentityTypeName | null; // null = unresolved (no managed identity match)
  lastAccess: string;
  actorKey: string | null;          // maps to MOCK_ACTORS; null for IP / unresolved entries
  eventCount: number;
};

type ActivityIdentityFilter = { name: string; actorKey: string | null };

const ACCESS_IDENTITY_POOL: AccessIdentity[] = [
  // Unified — correlated with known managed identities
  { id: "ai1",  name: "Sarah Chen",         email: "sarah.chen@company.com",        type: "User", identityClass: "internal-user",   lastAccess: "Mar 10, 2026", actorKey: "sarah.chen",  eventCount: 347 },
  { id: "ai2",  name: "Marcus Johnson",      email: "marcus.j@company.com",          type: "User", identityClass: "internal-user",   lastAccess: "Mar 09, 2026", actorKey: "marcus.j",    eventCount: 213 },
  { id: "ai4",  name: "Alex Wong",           email: "alex.wong@company.com",         type: "User", identityClass: "internal-user",   lastAccess: "Mar 08, 2026", actorKey: "alex.wong",   eventCount: 156 },
  { id: "ai5",  name: "Priya Sharma",        email: "priya.sharma@partner-corp.com", type: "User", identityClass: "external-user",   lastAccess: "Mar 07, 2026", actorKey: "priya.s",     eventCount: 278 },
  { id: "ai7",  name: "etl-pipeline-svc",    email: null,                            type: "User", identityClass: "service-account", lastAccess: "Mar 05, 2026", actorKey: "michael.r",   eventCount: 189 },
  { id: "ai10", name: "Jordan Lee",          email: "jordan.lee@acme-emea.com",      type: "User", identityClass: "external-user",   lastAccess: "Mar 02, 2026", actorKey: "jordan.lee",  eventCount: 201 },
  // Unresolved — seen activity but no managed identity match
  { id: "ai9",  name: "taylor.k",            email: "taylor.k@unknown-domain.net",   type: "User", identityClass: null,              lastAccess: "Mar 03, 2026", actorKey: "taylor.k",    eventCount: 123 },
  { id: "ai11", name: "j.morrison",          email: "j.morrison@ext-vendor.io",      type: "User", identityClass: null,              lastAccess: "Mar 01, 2026", actorKey: null,          eventCount:  88 },
  // IP-only — no user identity resolved at all
  { id: "ai3",  name: "203.0.113.47",        email: null,                            type: "IP",   identityClass: null,              lastAccess: "Mar 09, 2026", actorKey: null,          eventCount: 412 },
  { id: "ai6",  name: "198.51.100.22",       email: null,                            type: "IP",   identityClass: null,              lastAccess: "Mar 06, 2026", actorKey: null,          eventCount: 189 },
  { id: "ai8",  name: "10.20.55.134",        email: null,                            type: "IP",   identityClass: null,              lastAccess: "Mar 04, 2026", actorKey: null,          eventCount: 301 },
];

function generateAccessIdentities(row: UnmanagedDestination): AccessIdentity[] {
  const seed = row.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const count = 2 + (seed % 4); // 2–5 identities per destination
  const pool = [...ACCESS_IDENTITY_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (seed * (i + 3) + 7) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function AccessTabContent({
  row,
  onSelectIdentity,
}: {
  row: UnmanagedDestination;
  onSelectIdentity?: (identity: AccessIdentity) => void;
}) {
  const identities = useMemo(() => generateAccessIdentities(row), [row]);

  const [accessSearch, setAccessSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<IdentityTypeName[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Composition counts for dropdown
  const composition = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of identities) {
      const key = id.type === "IP" ? "unknown-identity" : (id.identityClass ?? "unmapped-local-user");
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [identities]);

  const filteredIdentities = useMemo(() => {
    let result = identities;
    if (activeFilters.length > 0) {
      result = result.filter((id) => {
        const key = id.type === "IP" ? "unknown-identity" : (id.identityClass ?? "unmapped-local-user");
        return activeFilters.includes(key as IdentityTypeName);
      });
    }
    if (accessSearch) {
      const term = accessSearch.toLowerCase();
      result = result.filter((id) =>
        id.name.toLowerCase().includes(term) || (id.email ?? "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [identities, activeFilters, accessSearch]);

  const hasActiveFilter = activeFilters.length > 0;

  return (
    <div className="flex flex-col">
      {/* Sticky search + filter bar */}
      <div className="sticky top-0 z-10 bg-background shrink-0">
      <div className="px-4 py-3 space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={accessSearch}
            onChange={(e) => setAccessSearch(e.target.value)}
            placeholder="Search identities..."
            className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-text-bright placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={{ fontSize: "12px" }}
          />
          {accessSearch && (
            <button type="button" onClick={() => setAccessSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-bright">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div ref={dropdownRef} className="relative">
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasActiveFilter ? (
              <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(true)}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                  Identity Type
                  <span className="text-primary/50 mx-0.5">|</span>
                  <span className="truncate max-w-[100px]">
                    {activeFilters.length === 1
                      ? IDENTITY_FILTER_GROUPS.find((g) => g.typeId === activeFilters[0])?.label ?? activeFilters[0]
                      : `${activeFilters.length} selected`}
                  </span>
                  <ChevronDown size={9} className="ml-0.5 opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilters([])}
                  className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                  aria-label="Clear identity type filter"
                >
                  <X size={9} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDropdownOpen(true)}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                  dropdownOpen
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "10px", fontWeight: 400 }}
              >
                <Plus size={9} />
                Identity Type
              </button>
            )}
          </div>

          {/* Identity Type dropdown */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Identity Type</span>
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {IDENTITY_FILTER_GROUPS.map((g) => {
                  const count = composition[g.typeId] ?? 0;
                  if (count === 0) return null;
                  return (
                    <label
                      key={g.typeId}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.includes(g.typeId as IdentityTypeName)}
                        onChange={() =>
                          setActiveFilters((prev) =>
                            prev.includes(g.typeId as IdentityTypeName)
                              ? prev.filter((t) => t !== g.typeId)
                              : [...prev, g.typeId as IdentityTypeName]
                          )
                        }
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.dotClass}`} />
                        <span className="text-text-bright truncate" style={{ fontSize: "12px" }}>{g.label}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums shrink-0" style={{ fontSize: "10px" }}>{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
        <div className="flex items-center px-4 py-1.5 border-b border-border">
          <Users size={12} className="text-muted-foreground mr-2" />
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
            {filteredIdentities.length}{accessSearch || hasActiveFilter ? ` of ${identities.length}` : ""} {filteredIdentities.length === 1 ? "identity" : "identities"}
          </span>
        </div>
      </div>

      {/* Identity list */}
      <div className="px-2 py-1">
        {filteredIdentities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" style={{ fontSize: "12px" }}>
            <Users size={24} className="mb-2 opacity-40" />
            No matching identities
          </div>
        ) : (
          filteredIdentities.map((identity) => {
            const typeKey = identity.type === "IP"
              ? "unknown-identity"
              : identity.identityClass ?? "unmapped-local-user";
            const cfg = IDENTITY_TYPE_CONFIG[typeKey] ?? IDENTITY_TYPE_CONFIG["internal-user"];

            const initials = identity.name
              .split(/[\s\-_.@]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join("");

            const subLabel = identity.email ?? identity.name;

            return (
              <button
                key={identity.id}
                type="button"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-md hover:bg-nav-active/40 transition-colors text-left cursor-pointer"
                onClick={() => onSelectIdentity?.(identity)}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none ${cfg.avatar}`}
                  style={{ background: "var(--color-nav-active, #1e293b)", fontSize: "11px", fontWeight: 700 }}
                >
                  {initials || <cfg.Icon size={12} />}
                </div>

                {/* Name + sub-line */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-bright truncate" style={{ fontSize: "12px", fontWeight: 500 }}>{identity.name}</span>
                    <span className={`shrink-0 px-1 py-0 rounded ${cfg.badge}`} style={{ fontSize: "9px", fontWeight: 500 }}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {subLabel && subLabel !== identity.name && <><span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{subLabel}</span><span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>·</span></>}
                    <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>Last Active:</span>
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "10px" }}>{(() => { const d = new Date(identity.lastAccess); return isNaN(d.getTime()) ? identity.lastAccess : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()}</span>
                  </div>
                </div>

                {/* Event count */}
                <span
                  className="inline-flex items-center text-muted-foreground shrink-0"
                  style={{ fontSize: "10px", fontWeight: 500 }}
                >
                  {identity.eventCount.toLocaleString()} events
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────

function ActivityTabContent({
  row,
  identityFilter,
  onClearFilter,
}: {
  row: UnmanagedDestination;
  identityFilter?: ActivityIdentityFilter | null;
  onClearFilter?: () => void;
}) {
  const history = useMemo(() => generateActivityHistory(row), [row]);

  // Extract unique identities and identity types
  const allIdentities = useMemo(() => {
    const set = new Set<string>();
    history.forEach(e => set.add(e.actor));
    return Array.from(set).sort();
  }, [history]);

  const allIdentityTypes = useMemo(() => {
    const set = new Set<string>();
    history.forEach(e => set.add(e.identityType));
    return Array.from(set).sort();
  }, [history]);

  // Extract unique data types across all events
  const allEventDataTypes = useMemo(() => {
    const set = new Set<string>();
    history.forEach(e => e.dataTypes.forEach(dt => set.add(dt)));
    return Array.from(set).sort();
  }, [history]);

  // Filter states
  const [localIdentityFilter, setLocalIdentityFilter] = useState<string[]>([]);
  const [identityTypeFilter, setIdentityTypeFilter] = useState<string[]>([]);
  const [activityTypeFilter, setActivityTypeFilter] = useState<"upload" | "download" | null>(null);
  const [dataTypeFilter, setDataTypeFilter] = useState<string[]>([]);
  const [identitySearchQuery, setIdentitySearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState<"identity" | "identity-type" | "activity-type" | "data-type" | null>(null);
  const [hoveredBarDt, setHoveredBarDt] = useState<{ dtName: string; clientX: number; clientY: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute data type breakdown for bar chart
  const dataTypeBreakdown = useMemo(() => {
    const sevOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...row.dataTypes]
      .map(dt => {
        const info = getDataTypeInfo(dt.type);
        return {
          name: dt.type,
          eventCount: dt.eventCount,
          severity: info.severity,
        };
      })
      .sort((a, b) => {
        if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
        return b.eventCount - a.eventCount;
      });
  }, [row.dataTypes]);

  const totalDataTypeEvents = useMemo(() => 
    dataTypeBreakdown.reduce((s, d) => s + d.eventCount, 0) || 1
  , [dataTypeBreakdown]);

  // Counts
  const identityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of allIdentities) counts[i] = 0;
    for (const e of history) { if (counts[e.actor] !== undefined) counts[e.actor]++; }
    return counts;
  }, [history, allIdentities]);

  const identityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of allIdentityTypes) counts[it] = 0;
    for (const e of history) { if (counts[e.identityType] !== undefined) counts[e.identityType]++; }
    return counts;
  }, [history, allIdentityTypes]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const openIdentityPicker = useCallback(() => {
    setOpenDropdown(p => p === "identity" ? null : "identity");
  }, []);

  const openIdentityTypePicker = useCallback(() => {
    setOpenDropdown(p => p === "identity-type" ? null : "identity-type");
  }, []);

  const openDataTypePicker = useCallback(() => {
    setOpenDropdown(p => p === "data-type" ? null : "data-type");
  }, []);

  const hasLocalIdentityFilter = localIdentityFilter.length > 0;
  const hasIdentityTypeFilter = identityTypeFilter.length > 0;
  const hasActivityTypeFilter = activityTypeFilter !== null;
  const hasDataTypeFilter = dataTypeFilter.length > 0;
  const hasAnyLocalFilter = hasLocalIdentityFilter || hasIdentityTypeFilter || hasActivityTypeFilter || hasDataTypeFilter;

  // Apply filtering
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Apply legacy identityFilter from Access tab navigation
    if (identityFilter && identityFilter.actorKey !== null) {
      filtered = filtered.filter((e) => e.actor === identityFilter.actorKey);
    }

    // Apply local filters
    if (hasLocalIdentityFilter) {
      filtered = filtered.filter(e => localIdentityFilter.includes(e.actor));
    }
    if (hasIdentityTypeFilter) {
      filtered = filtered.filter(e => identityTypeFilter.includes(e.identityType));
    }
    if (hasActivityTypeFilter) {
      filtered = filtered.filter(e => e.type === activityTypeFilter);
    }
    if (hasDataTypeFilter) {
      filtered = filtered.filter(e => dataTypeFilter.some(dt => e.dataTypes.includes(dt)));
    }

    return filtered;
  }, [history, identityFilter, localIdentityFilter, identityTypeFilter, activityTypeFilter, dataTypeFilter, hasLocalIdentityFilter, hasIdentityTypeFilter, hasActivityTypeFilter, hasDataTypeFilter]);

  const totalBytes = sumSparkData(row.uploadSparkData) + sumSparkData(row.downloadSparkData);

  return (
    <div className="flex flex-col h-full">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-5">
          {/* ── Legacy identity filter banner from Access tab ── */}
          {identityFilter && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised border border-border -mb-1">
              <Filter size={11} className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                Filtered: {identityFilter.name}
                {identityFilter.actorKey === null && (
                  <span className="text-muted-foreground ml-1" style={{ fontWeight: 400 }}>(all members)</span>
                )}
              </span>
              <button onClick={onClearFilter} className="text-muted-foreground hover:text-text-bright transition-colors shrink-0">
                <X size={12} />
              </button>
            </div>
          )}

          {/* ── Data Type Breakdown ── */}
          {dataTypeBreakdown.length > 0 && (
            null
          )}

          {/* ── Activity History Timeline ── */}
          <div>
            {/* Filter toolbar - sticky above Activity History */}
            {!identityFilter && (
              <div className="sticky top-0 z-10 bg-background px-3 pt-2.5 pb-2.5 border-b border-border space-y-2 -mx-5 px-5 mb-3">
                <div ref={dropdownRef} className="relative">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Activity pill */}
                    {hasActivityTypeFilter ? (
                      <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                        <button type="button" onClick={() => setOpenDropdown(p => p === "activity-type" ? null : "activity-type")}
                          className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                          style={{ fontSize: "10px", fontWeight: 500 }}>
                          <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                          Activity
                          <span className="text-primary/50 mx-0.5">|</span>
                          <span className="truncate max-w-[80px] capitalize">{activityTypeFilter}</span>
                          <ChevronDown size={9} className="ml-0.5 opacity-60" />
                        </button>
                        <button type="button" onClick={() => { setActivityTypeFilter(null); setOpenDropdown(null); }}
                          className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear activity filter">
                          <X size={9} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setOpenDropdown(p => p === "activity-type" ? null : "activity-type")}
                        className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                          openDropdown === "activity-type"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                        }`}
                        style={{ fontSize: "10px", fontWeight: 400 }}>
                        <Plus size={9} />
                        Activity
                      </button>
                    )}

                    {/* Data Type pill */}
                    {hasDataTypeFilter ? (
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
                          className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear data type filter">
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
                        Data Type
                      </button>
                    )}

                    {/* Identity Type pill */}
                    {hasIdentityTypeFilter ? (
                      <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                        <button type="button" onClick={openIdentityTypePicker}
                          className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                          style={{ fontSize: "10px", fontWeight: 500 }}>
                          <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                          Identity Type
                          <span className="text-primary/50 mx-0.5">|</span>
                          <span className="truncate max-w-[80px]">
                            {identityTypeFilter.length === 1 ? identityTypeFilter[0] : `${identityTypeFilter.length} selected`}
                          </span>
                          <ChevronDown size={9} className="ml-0.5 opacity-60" />
                        </button>
                        <button type="button" onClick={() => { setIdentityTypeFilter([]); setOpenDropdown(null); }}
                          className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear identity type filter">
                          <X size={9} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={openIdentityTypePicker}
                        className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                          openDropdown === "identity-type"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                        }`}
                        style={{ fontSize: "10px", fontWeight: 400 }}>
                        <Plus size={9} />
                        Identity Type
                      </button>
                    )}

                    {/* Identity pill */}
                    {hasLocalIdentityFilter ? (
                      <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                        <button type="button" onClick={openIdentityPicker}
                          className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                          style={{ fontSize: "10px", fontWeight: 500 }}>
                          <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                          Identity
                          <span className="text-primary/50 mx-0.5">|</span>
                          <span className="truncate max-w-[80px]">
                            {localIdentityFilter.length === 1 ? localIdentityFilter[0] : `${localIdentityFilter.length} selected`}
                          </span>
                          <ChevronDown size={9} className="ml-0.5 opacity-60" />
                        </button>
                        <button type="button" onClick={() => { setLocalIdentityFilter([]); setOpenDropdown(null); }}
                          className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear identity filter">
                          <X size={9} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={openIdentityPicker}
                        className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                          openDropdown === "identity"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                        }`}
                        style={{ fontSize: "10px", fontWeight: 400 }}>
                        <Plus size={9} />
                        Identity
                      </button>
                    )}
                  </div>

                  {/* Identity dropdown */}
                  {openDropdown === "identity" && (() => {
                    const filteredIdentities = allIdentities.filter(i => 
                      i.toLowerCase().includes(identitySearchQuery.toLowerCase())
                    );
                    return (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                        <div className="px-4 pt-2 pb-2 border-b border-border">
                          <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Identity</span>
                        </div>
                        <div className="px-3 py-2 border-b border-border">
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={identitySearchQuery}
                              onChange={(e) => setIdentitySearchQuery(e.target.value)}
                              placeholder="Search identities..."
                              className="w-full pl-8 pr-3 py-1.5 bg-surface-overlay border border-border rounded-md text-text-bright placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                              style={{ fontSize: "11px" }}
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto py-1">
                          {filteredIdentities.map(identity => {
                            const count = identityCounts[identity] ?? 0;
                            if (count === 0) return null;
                            return (
                              <label key={identity} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                                <input type="checkbox" checked={localIdentityFilter.includes(identity)}
                                  onChange={() => setLocalIdentityFilter(p => p.includes(identity) ? p.filter(x => x !== identity) : [...p, identity])}
                                  className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                                <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{identity}</span>
                                <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Identity Type dropdown */}
                  {openDropdown === "identity-type" && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="px-4 pt-2 pb-2 border-b border-border">
                        <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Identity Type</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto py-1">
                        {allIdentityTypes.map(identityType => {
                          const count = identityTypeCounts[identityType] ?? 0;
                          if (count === 0) return null;
                          return (
                            <label key={identityType} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                              <input type="checkbox" checked={identityTypeFilter.includes(identityType)}
                                onChange={() => setIdentityTypeFilter(p => p.includes(identityType) ? p.filter(x => x !== identityType) : [...p, identityType])}
                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                              <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{identityType}</span>
                              <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Activity type dropdown */}
                  {openDropdown === "activity-type" && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-48 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="px-4 pt-2 pb-2 border-b border-border">
                        <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Activity</span>
                      </div>
                      <div className="py-1">
                        {(["upload", "download"] as const).map(opt => (
                          <button key={opt} type="button"
                            onClick={() => { setActivityTypeFilter(activityTypeFilter === opt ? null : opt); setOpenDropdown(null); }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-raised ${activityTypeFilter === opt ? "text-primary" : "text-text-bright"}`}
                            style={{ fontSize: "12px" }}>
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${activityTypeFilter === opt ? "bg-primary border-primary" : "border-border"}`}>
                              {activityTypeFilter === opt && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span className="capitalize">{opt}</span>
                            <span className="ml-auto text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>
                              {history.filter(e => e.type === opt).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Type dropdown */}
                  {openDropdown === "data-type" && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="px-4 pt-2 pb-2 border-b border-border">
                        <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Data Type</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto py-1">
                        {allEventDataTypes.map(dt => {
                          const count = history.filter(e => e.dataTypes.includes(dt)).length;
                          if (count === 0) return null;
                          return (
                            <label key={dt} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                              <input type="checkbox" checked={dataTypeFilter.includes(dt)}
                                onChange={() => setDataTypeFilter(p => p.includes(dt) ? p.filter(x => x !== dt) : [...p, dt])}
                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0" />
                              <span className="flex-1 text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                              <span className="text-muted-foreground tabular-nums" style={{ fontSize: "10px" }}>{count}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Result count */}
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-primary" />
                  <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {filteredHistory.length}{hasAnyLocalFilter ? ` of ${history.length}` : ""} events
                    <span className="opacity-60"> · most recent first</span>
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-1">
              
            </div>
            <div className="text-muted-foreground mb-3" style={{ fontSize: "10px" }}>
              {filteredHistory.length} event{filteredHistory.length !== 1 ? "s" : ""} recorded — most recent first
            </div>
            <div>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((event, idx) => (
                  <ActivityTimelineNode
                    key={event.id}
                    event={event}
                    destName={row.name}
                    destType={row.destinationType}
                    isFirst={idx === 0}
                    isLast={idx === filteredHistory.length - 1}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground" style={{ fontSize: "11px" }}>
                  {hasAnyLocalFilter ? "No events match the current filters" : "No events found for this identity"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Side Panel Content ───────────────────────────────────────���────────────────

export function UnmanagedRowPanelContent({
  row,
  showStatus,
  activeTab,
  onTabChange,
  onViewFullDetails,
  onSelectIdentity,
}: {
  row: UnmanagedDestination;
  showStatus: boolean;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onViewFullDetails?: (fileIdx: number) => void;
  onSelectIdentity?: (identity: AccessIdentity) => void;
}) {
  const [sensitiveFileFilter, setSensitiveFileFilter] = useState<string[]>([]);

  const handleTabChangeWithFilter = (tab: PanelTab, filter: string[]) => {
    setSensitiveFileFilter(filter);
    onTabChange(tab);
  };

  const TABS = useMemo(() => {
    const tabs = makePanelTabs("files");
    const sf = tabs.find((t) => t.id === "sensitive-files");
    if (sf) sf.label = "Sensitive Objects";
    return tabs;
  }, []);

  return (
    <div className="flex flex-row h-full">
      {/* Tab Navigation */}
      <PanelTabBar tabs={TABS} activeTab={activeTab} onTabChange={(tab) => { setSensitiveFileFilter([]); onTabChange(tab); }} sensitiveCount={row.dataTypes.length} accessLabel="Identities with Usage" />

      {/* Tab Content */}
      <div className={`flex-1 min-h-0 ${activeTab === "sensitive-files" ? "overflow-hidden" : "overflow-auto"}`}>
        {activeTab === "overview"        && <OverviewTabContent row={row} showStatus={showStatus} onTabChange={onTabChange} onTabChangeWithFilter={handleTabChangeWithFilter} />}
        {activeTab === "sensitive-files" && <SensitiveFilesTabContent row={row} onViewFullDetails={onViewFullDetails} initialDataTypeFilter={sensitiveFileFilter} />}
        {activeTab === "access"          && <AccessTabContent row={row} onSelectIdentity={onSelectIdentity} />}
      </div>
    </div>
  );
}

// ── Timeframe Selector ────────────────────────────────────────────────────────

type TimeframeKey =
  | "24h" | "7d" | "30d" | "60d" | "90d"
  | "last-week" | "last-month" | "custom-days" | "date-range";

const TIMEFRAME_OPTIONS: Array<{ key: TimeframeKey; label: string }> = [
  { key: "24h",         label: "Last 24 Hours" },
  { key: "7d",          label: "Last 7 Days" },
  { key: "30d",         label: "Last 30 Days" },
  { key: "60d",         label: "Last 60 Days" },
  { key: "90d",         label: "Last 90 Days" },
  { key: "last-week",   label: "Last Week" },
  { key: "last-month",  label: "Last Month" },
  { key: "custom-days", label: "Last x Days" },
  { key: "date-range",  label: "Date Range" },
];

function getTimeframeRange(
  key: TimeframeKey,
  customDays: number,
  dateFrom: string,
  dateTo: string,
): [Date, Date] | null {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
  switch (key) {
    case "24h":  return [new Date(now.getTime() - 86_400_000), now];
    case "7d":   return [daysAgo(7),  now];
    case "30d":  return [daysAgo(30), now];
    case "60d":  return [daysAgo(60), now];
    case "90d":  return [daysAgo(90), now];
    case "last-week": {
      const day = now.getDay();
      const daysToLastMon = (day === 0 ? 7 : day) + 6;
      const mon = new Date(now); mon.setDate(now.getDate() - daysToLastMon); mon.setHours(0,0,0,0);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
      return [mon, sun];
    }
    case "last-month": {
      const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastLastMonth  = new Date(firstThisMonth.getTime() - 1);
      const firstLastMonth = new Date(lastLastMonth.getFullYear(), lastLastMonth.getMonth(), 1);
      return [firstLastMonth, lastLastMonth];
    }
    case "custom-days":
      return customDays > 0 ? [daysAgo(customDays), now] : null;
    case "date-range":
      return dateFrom && dateTo ? [new Date(dateFrom), new Date(dateTo + "T23:59:59")] : null;
    default: return null;
  }
}

const TIMEFRAME_SEPARATOR_BEFORE: Set<TimeframeKey> = new Set(["last-week"]);

function TimeframeSelector({
  value, onChange,
  customDays, onCustomDaysChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
}: {
  value: TimeframeKey; onChange: (key: TimeframeKey) => void;
  customDays: number; onCustomDaysChange: (n: number) => void;
  dateFrom: string; onDateFromChange: (s: string) => void;
  dateTo: string; onDateToChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = TIMEFRAME_OPTIONS.find((o) => o.key === value)?.label ?? "Last 30 Days";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-foreground hover:text-text-bright transition-colors"
        style={{ fontSize: "12px" }}
      >
        <span style={{ fontWeight: 500 }}>{activeLabel}</span>
        <ChevronDown size={12} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-surface-raised border border-border rounded-lg shadow-lg py-1 overflow-hidden">
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isActive = value === opt.key;
            return (
              <React.Fragment key={opt.key}>
                {TIMEFRAME_SEPARATOR_BEFORE.has(opt.key) && (
                  <div className="h-px bg-border mx-0 my-1" />
                )}
                <button
                  onClick={() => {
                    onChange(opt.key);
                    if (opt.key !== "custom-days" && opt.key !== "date-range") setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-primary/10 text-text-bright"
                      : "text-foreground hover:bg-foreground/[0.06]"
                  }`}
                  style={{ fontSize: "12px" }}
                >
                  {opt.label}
                </button>
                {opt.key === "custom-days" && isActive && (
                  <div className="px-3 pb-2 flex items-center gap-1.5">
                    <input
                      type="number" min={1} max={999} value={customDays}
                      onChange={(e) => onCustomDaysChange(Math.max(1, Number(e.target.value)))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 rounded bg-input-background border border-border px-2 py-1 text-text-bright text-center"
                      style={{ fontSize: "12px" }}
                    />
                    <span className="text-muted-foreground" style={{ fontSize: "12px" }}>days</span>
                  </div>
                )}
                {opt.key === "date-range" && isActive && (
                  <div className="px-3 pb-2 flex flex-col gap-1">
                    <input
                      type="date" value={dateFrom}
                      onChange={(e) => onDateFromChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded bg-input-background border border-border px-2 py-1 text-text-bright"
                      style={{ fontSize: "11px" }}
                    />
                    <input
                      type="date" value={dateTo}
                      onChange={(e) => onDateToChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded bg-input-background border border-border px-2 py-1 text-text-bright"
                      style={{ fontSize: "11px" }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Comparison Logic ─────────────────────────────────────────────────────────

function compareUnmanagedRows(
  a: UnmanagedDestination,
  b: UnmanagedDestination,
  key: string,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "category":
      return a.category.localeCompare(b.category);
    case "destinationType":
      return a.destinationType.localeCompare(b.destinationType);
    case "firstAccess":
      return new Date(a.firstAccess).getTime() - new Date(b.firstAccess).getTime();
    case "status":
      return (a.status ?? "").localeCompare(b.status ?? "");
    case "upload":
      return sumSparkData(a.uploadSparkData) - sumSparkData(b.uploadSparkData);
    case "download":
      return sumSparkData(a.downloadSparkData) - sumSparkData(b.downloadSparkData);
    default:
      return 0;
  }
}

// ── Standalone wrapper for stacked/embedded use ───────────────────────────────

export function UnmanagedRowStandalonePanel({
  row,
  showStatus,
  initialTab = "overview",
}: {
  row: UnmanagedDestination;
  showStatus: boolean;
  initialTab?: PanelTab;
}) {
  const [activeTab, setActiveTab] = useState<PanelTab>(initialTab);
  return (
    <UnmanagedRowPanelContent
      row={row}
      showStatus={showStatus}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}

export function UnmanagedDestinationsTable({
  typeFilter,
  initialRowId,
}: {
  typeFilter?: TypeFilter;
  initialRowId?: string;
}) {
  const rows = typeFilter
    ? UNMANAGED_DESTINATIONS.filter((d) =>
        TYPE_FILTER_MAP[typeFilter].includes(d.destinationType),
      )
    : UNMANAGED_DESTINATIONS;

  const showStatus = typeFilter === "Application" || !typeFilter;
  const title = getTitle(typeFilter);
  const subtitle = getSubtitle(typeFilter);
  const subtitleExtra = getSubtitleExtra(typeFilter);

  const [selectedIdentity, setSelectedIdentity] = useState<AccessIdentity | null>(null);
  const [activeRow, setActiveRow] = useState<UnmanagedDestination | null>(() => {
    if (initialRowId) return rows.find((r) => r.id === initialRowId) ?? null;
    return null;
  });
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);
  const closePanel = useCallback(() => { setActiveRow(null); setActiveTab("overview"); setFullDetailIdx(null); setSelectedIdentity(null); }, []);
  const closeFullDetail = useCallback(() => { setFullDetailIdx(null); }, []);
  const handleViewFullDetails = useCallback((fileIdx: number) => { setFullDetailIdx(fileIdx); }, []);
  const [pageTab, setPageTab] = useState<"applications" | "instances">("applications");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: "firstAccess", direction: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeKey>("7d");
  const [customDays, setCustomDays] = useState(30);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const { key, direction } = sortConfig;
    const mul = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => mul * compareUnmanagedRows(a, b, key));
  }, [rows, sortConfig]);

  const filteredRows = useMemo(() => {
    let result = sortedRows;

    // Timeframe filter on firstAccess
    const range = getTimeframeRange(timeframe, customDays, dateFrom, dateTo);
    if (range) {
      const [from, to] = range;
      result = result.filter((row) => {
        const d = new Date(row.firstAccess);
        return d >= from && d <= to;
      });
    }

    // Search filter
    if (searchTerm) {
      result = result.filter((row) =>
        matchesSearch(searchTerm, row.name, row.category, row.status ?? ""),
      );
    }

    return result;
  }, [sortedRows, searchTerm, timeframe, customDays, dateFrom, dateTo]);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);
  const pagedRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);

  // Hide "Status" column from dropdown when it's not shown
  const sortColumns = useMemo<SortColumnDef[]>(
    () => showStatus ? SORT_COLUMNS_BASE : SORT_COLUMNS_BASE.filter((c) => c.key !== "status"),
    [showStatus],
  );

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      {/* ContentHeader */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-5 pt-5 pb-0 border-b border-border">
        <div className="flex items-start justify-between gap-4 pb-3">
          <div className="min-w-0">
            <h2
              className="text-text-bright"
              style={{ fontSize: "16px", fontWeight: 600 }}
            >
              {title}
            </h2>
            <p
              className="text-muted-foreground mt-0.5"
              style={{ fontSize: "12px" }}
            >
              {subtitle}
            </p>
            {subtitleExtra && (
              <p
                className="text-unsanctioned mt-1"
                style={{ fontSize: "11px" }}
              >
                {subtitleExtra.text}
              </p>
            )}
          </div>
          <div className="shrink-0 mt-0.5 flex items-center gap-2">
            <TimeframeSelector
              value={timeframe}
              onChange={setTimeframe}
              customDays={customDays}
              onCustomDaysChange={setCustomDays}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
            />
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

        {/* Tab bar — only shown for Applications filter */}
        {typeFilter === "Application" && (
          <div className="flex items-center gap-0 -mx-5 px-5">
            {(["applications", "instances"] as const).map((tab) => {
              const isActive = pageTab === tab;
              const label = tab === "applications" ? "Applications" : "Instances";
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPageTab(tab)}
                  className={`relative px-4 py-2.5 transition-colors cursor-pointer ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-text-bright"
                  }`}
                  style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Applications Tab ── */}
      {pageTab === "applications" && <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {/* Name */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "name"))}
              >
                Name <SortIcon columnKey="name" sortConfig={sortConfig} />
              </button>
            </th>

            {/* Status — Applications only */}
            {showStatus && (
              <th
                className="text-left px-4 py-3 text-muted-foreground"
                style={{ fontSize: "11px", fontWeight: 500 }}
              >
                <button
                  className="flex items-center gap-1 hover:text-text-bright transition-colors"
                  onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "status"))}
                >
                  Tag <SortIcon columnKey="status" sortConfig={sortConfig} />
                </button>
              </th>
            )}

            {/* Transferred Sensitive Objects */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              Sensitive Objects
            </th>

            {/* Data Type */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              Data Types
            </th>

            {/* Identities with Usage */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              Identities
            </th>

            {/* Uploaded */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "upload"))}
              >
                Uploaded <SortIcon columnKey="upload" sortConfig={sortConfig} />
              </button>
            </th>

            {/* Downloaded */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "download"))}
              >
                Downloaded <SortIcon columnKey="download" sortConfig={sortConfig} />
              </button>
            </th>

            {/* First seen */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "firstAccess"))}
              >
                First Seen <SortIcon columnKey="firstAccess" sortConfig={sortConfig} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row) => {
            const isActive = activeRow?.id === row.id;
            return (
              <tr
                key={row.id}
                className={`border-b border-border cursor-pointer transition-colors ${
                  isActive ? "bg-primary/5" : "hover:bg-foreground/[0.04]"
                }`}
                style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                onClick={() => {
                  setActiveRow(row);
                  setActiveTab("overview");
                }}
              >
                {/* Name */}
                <td className="px-4 py-3" style={{ fontSize: "13px", fontWeight: 500 }}>
                  <div className="flex items-center gap-2">
                    <HighlightText text={row.name} query={searchTerm} className="text-primary" />
                    {row.firstAccess === TODAY_YMD && (
                      <span
                        className="px-1 py-0.5 rounded uppercase tracking-wide text-[#c2410c] dark:text-unsanctioned"
                        style={{
                          fontSize: "8px",
                          fontWeight: 600,
                          background: "color-mix(in srgb, var(--unsanctioned) 10%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--unsanctioned) 20%, transparent)",
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 400 }}>
                    <HighlightText text={row.category} query={searchTerm} className="text-muted-foreground" />
                  </div>
                </td>

                {/* Status — Applications only */}
                {showStatus && (
                  <td className="px-4 py-3">
                    {row.status ? (
                      <StatusBadge status={row.status} />
                    ) : (
                      <span className="text-text-dim" style={{ fontSize: "11px" }}>
                        —
                      </span>
                    )}
                  </td>
                )}

                {/* Transferred Sensitive Objects */}
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                    style={{ fontWeight: 500 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRow(row);
                      setActiveTab("sensitive-files");
                    }}
                  >
                    {generateUMDSensitiveFiles(row).length}
                  </button>
                </td>

                {/* Data Type */}
                <td className="px-4 py-3">
                  <DataTypeTags types={row.dataTypes.map((d) => d.type)} />
                </td>

                {/* Identities with Usage */}
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                    style={{ fontWeight: 500 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRow(row);
                      setActiveTab("access");
                    }}
                  >
                    {getIdentityCount(row)}
                  </button>
                </td>

                {/* Upload Sparkline */}
                <td className="px-4 py-3">
                  <SparkTrend data={row.uploadSparkData} />
                </td>

                {/* Download Sparkline */}
                <td className="px-4 py-3">
                  <SparkTrend data={row.downloadSparkData} />
                </td>

                {/* First seen */}
                <td className="px-4 py-3 text-muted-foreground tabular-nums" style={{ fontSize: "12px" }}>
                  {new Date(row.firstAccess).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>}

      {pageTab === "applications" && <TablePagination currentPage={currentPage} totalRows={filteredRows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />}

      {/* ── Instances Tab ── */}
      {pageTab === "instances" && (() => {
        const instanceRows = filteredRows.filter((r) => r.instanceName);
        const pagedInstances = instanceRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        return (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "name"))}>
                      Instance ID <SortIcon columnKey="name" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    Application
                  </th>
                  {showStatus && (
                    <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                      <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "status"))}>
                        Tag <SortIcon columnKey="status" sortConfig={sortConfig} />
                      </button>
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    Sensitive Objects
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    Data Types
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    Identities
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    <button className="flex items-center gap-1 hover:text-text-bright transition-colors" onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "firstAccess"))}>
                      First Seen <SortIcon columnKey="firstAccess" sortConfig={sortConfig} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedInstances.map((row) => {
                  const isActive = activeRow?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-border cursor-pointer transition-colors ${isActive ? "bg-primary/5" : "hover:bg-foreground/[0.04]"}`}
                      style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                      onClick={() => { setActiveRow(row); setActiveTab("overview"); }}
                    >
                      {/* Instance ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-primary hover:underline text-left font-mono"
                            style={{ fontSize: "13px", fontWeight: 500 }}
                            onClick={(e) => { e.stopPropagation(); setActiveRow(row); setActiveTab("overview"); }}
                          >
                            {getInstanceId(row)}
                          </button>
                          {row.firstAccess === TODAY_YMD && (
                            <span
                              className="px-1 py-0.5 rounded uppercase tracking-wide text-[#c2410c] dark:text-unsanctioned"
                              style={{
                                fontSize: "8px",
                                fontWeight: 600,
                                background: "color-mix(in srgb, var(--unsanctioned) 10%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--unsanctioned) 20%, transparent)",
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>
                        {row.instanceName && (
                          <div className="text-muted-foreground font-mono mt-0.5" style={{ fontSize: "11px" }}>
                            {row.instanceName}
                          </div>
                        )}
                      </td>
                      {/* Application */}
                      <td className="px-4 py-3">
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>
                          <HighlightText text={row.name} query={searchTerm} className="text-text-bright" />
                        </div>
                        <div style={{ fontSize: "11px" }}>
                          <HighlightText text={row.category} query={searchTerm} className="text-muted-foreground" />
                        </div>
                      </td>
                      {/* Status */}
                      {showStatus && (
                        <td className="px-4 py-3">
                          {row.status ? <StatusBadge status={row.status} /> : <span className="text-text-dim" style={{ fontSize: "11px" }}>—</span>}
                        </td>
                      )}
                      {/* Transferred Sensitive Objects */}
                      <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                        <button
                          className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                          style={{ fontWeight: 500 }}
                          onClick={(e) => { e.stopPropagation(); setActiveRow(row); setActiveTab("sensitive-files"); }}
                        >
                          {generateUMDSensitiveFiles(row).length}
                        </button>
                      </td>
                      {/* Data Type */}
                      <td className="px-4 py-3">
                        <DataTypeTags types={row.dataTypes.map((d) => d.type)} />
                      </td>
                      {/* Identities */}
                      <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                        <button
                          className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                          style={{ fontWeight: 500 }}
                          onClick={(e) => { e.stopPropagation(); setActiveRow(row); setActiveTab("access"); }}
                        >
                          {getIdentityCount(row)}
                        </button>
                      </td>
                      {/* First seen */}
                      <td className="px-4 py-3 text-muted-foreground tabular-nums" style={{ fontSize: "12px" }}>
                        {new Date(row.firstAccess).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination currentPage={currentPage} totalRows={instanceRows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
          </>
        );
      })()}

      {/* ── Per-row side panel ── */}
      <SidePanel
        open={activeRow !== null}
        onClose={closePanel}
        title={activeRow?.name ?? ""}
        subtitle={activeRow?.category}
        width={selectedIdentity !== null ? "min(920px, 90vw)" : "min(840px, 90vw)"}
        suspended={(fullDetailIdx !== null && activeTab === "sensitive-files") || selectedIdentity !== null}
        pushed={(fullDetailIdx !== null && activeTab === "sensitive-files") || selectedIdentity !== null}
        pushedRightOffset="min(840px, 90vw)"
        panelType={activeRow?.destinationType === "Website" ? "website" : "app"}
      >
        {activeRow && <UnmanagedRowPanelContent row={activeRow} showStatus={showStatus} activeTab={activeTab} onTabChange={setActiveTab} onViewFullDetails={handleViewFullDetails} onSelectIdentity={setSelectedIdentity} />}
      </SidePanel>

      {/* Stacked identity detail side panel */}
      {activeRow && selectedIdentity && (
        <SidePanel
          open
          onClose={() => setSelectedIdentity(null)}
          onBack={() => setSelectedIdentity(null)}
          title={selectedIdentity.name}
          subtitle={selectedIdentity.email ?? undefined}
          panelType="identity"
          width="min(840px, 90vw)"
          zIndex={60}
          hideBackdrop
          stacked
        >
          <IdentityDetailPanel
            key={selectedIdentity.id}
            row={{
              Name: selectedIdentity.name,
              Email: selectedIdentity.email ?? "",
              Username: selectedIdentity.email ? selectedIdentity.email.split("@")[0] : selectedIdentity.name,
            }}
            navId={selectedIdentity.identityClass ?? "internal-user"}
            initialTab="data-stores"
          />
        </SidePanel>
      )}

      {/* Stacked file detail side panel */}
      {activeRow && fullDetailIdx !== null && (() => {
        const files = generateUMDSensitiveFiles(activeRow);
        const file = files[fullDetailIdx];
        if (!file) return null;
        const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
        return (
          <SidePanel
            open
            onClose={closeFullDetail}
            onBack={closeFullDetail}
            title={file.name}
            subtitle={`${activeRow.name} · Data in Motion`}
            width="min(840px, 90vw)"
            zIndex={60}
            hideBackdrop
            stacked
            panelType="file"
            headerExtra={
              <SensitiveFileHeaderExtra
                name={file.name}
                store={activeRow.name}
                storeSource={activeRow.category}
                size={`${sizeKb} KB`}
              />
            }
          >
            <SensitiveFileDetailPane
              name={file.name}
              path={`${activeRow.name}/${file.name}`}
              store={activeRow.name}
              storeSource={activeRow.category}
              size={`${sizeKb} KB`}
              lastModified={file.modified}
              dataTypes={file.entityTypes}
              hideAtRestScans
              unmanagedMode
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}