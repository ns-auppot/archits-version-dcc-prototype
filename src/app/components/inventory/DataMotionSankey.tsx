import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  GripVertical, Plus, X, RotateCcw,
  ChevronDown, Calendar, Shield, Columns2, PanelRight,
  Search, SlidersHorizontal, ChevronRight,
} from "lucide-react";
import {
  IDENTITY_REGISTRY,
  IDENTITY_TYPE_LABEL,
  IDENTITY_TYPE_GROUPS,
  type RegistryIdentity,
} from "./identityRegistry";
import {
  FilterSection,
  DATA_STORES,
  IdentityFilterModal,
  type IdentityPanelFilters,
  EMPTY_IDENTITY_FILTERS,
  countActiveFilters,
  passesIdentityFilter,
  IDENTITY_META,
} from "./AccessRadarDiagram";
import {
  UNMANAGED_DESTINATIONS as INVENTORY_UNMANAGED,
  UnmanagedRowPanelContent,
} from "./UnmanagedDestinationsTable";
import { generateSparkData } from "./data-store-shared";
import { SidePanel } from "./SidePanel";
import { type PanelTab } from "./panel-shared";
import { getIdentityTableConfig, IdentityDetailPanel } from "./InventoryContent";
import { SaaSRowPanelContent } from "./UnstructuredDataStoreTableSaaS";
import { IaaSRowPanelContent } from "./UnstructuredDataStoreTableIaaS";
import { OnPremStructuredRowPanelContent } from "./StructuredDataStoreTableOnPrem";
import { IaaSStructuredRowPanelContent } from "./StructuredDataStoreTableIaaS";

// ── Layout constants ────────────────────────────────────────────────────────

const MIN_WIDTH        = 700;
const MIN_HEIGHT       = 420;
const NODE_WIDTH       = 18;
const COL_PADDING_LEFT = 140;
const COL_PADDING_RIGHT= 160;
const TOP_PADDING      = 50;

/** Compute the SVG x-position of a column centre (left edge of its node rect). */
function computeColX(colIndex: number, totalCols: number, canvasWidth: number): number {
  const drawableW = canvasWidth - COL_PADDING_LEFT - COL_PADDING_RIGHT;
  const spacing   = totalCols > 1 ? drawableW / (totalCols - 1) : drawableW / 2;
  return COL_PADDING_LEFT + (totalCols === 1 ? drawableW / 2 : colIndex * spacing);
}

// ── Theme colors ────────────────────────────────────────────────────────────

const COL_COLORS: Record<string, string> = {
  identity:     "#0ea584",
  dataType:     "#e05252",
  policy:       "#7c6fb0",
  destination:  "#d4952a",
  destCategory: "#d4952a",
  browser:      "#6366f1",
  device:       "#8b5cf6",
  srcCountry:   "#0ea5e9",
  accessMethod: "#ec4899",
  userGroup:    "#14b8a6",
  identityType: "#f472b6",
  activity:     "#f97316",
};

const POLICY_COLORS: Record<string, string> = {
  allow:                 "#22c55e",
  block:                 "#ef4444",
  "user alert (stop)":   "#f59e0b",
  "user alert (proceed)":"#f97316",
};

const MANAGED_COLOR   = "#d4952a";
const UNMANAGED_COLOR = "#64748b";
const GHOST_COLOR     = "#64748b";

// ── Column definitions ──────────────────────────────────────────────────────

interface ColumnDef {
  id: string;
  label: string;
  field: keyof Transaction;
  fixed?: boolean;     // anchor position — cannot be moved or removed (Identity, Destination)
  alwaysOn?: boolean;  // always visible but draggable (Data Type)
  optional?: boolean;  // can be toggled on/off via toolbar
  draggable?: boolean; // can be reordered in the Sankey via column-header drag
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "identity",     label: "Identity",             field: "identity",     optional: true, draggable: true },
  { id: "dataType",     label: "Data Type",             field: "dataType",     optional: true, draggable: true },
  { id: "policy",       label: "Policy",                field: "policy",       optional: true, draggable: true },
  { id: "destination",  label: "Destination",           field: "destination",  optional: true, draggable: true },
  { id: "destCategory", label: "Destination Category",  field: "destCategory", optional: true, draggable: true },
  { id: "browser",      label: "Browser",               field: "browser",      optional: true, draggable: true },
  { id: "device",       label: "Device",                field: "device",       optional: true, draggable: true },
  { id: "srcCountry",   label: "Src Country",           field: "srcCountry",   optional: true, draggable: true },
  { id: "accessMethod", label: "Access Method",         field: "accessMethod", optional: true, draggable: true },
  { id: "userGroup",    label: "User Group",            field: "userGroup",    optional: true, draggable: true },
  { id: "identityType", label: "Identity Type",         field: "identityType", optional: true, draggable: true },
  { id: "activity",     label: "Activity",              field: "activity",     optional: true, draggable: true },
];

// Default active column IDs per pivot mode
const DEFAULT_OPT_IDS_IDENTITY    = ["identity",     "dataType", "activity", "destination"];
const DEFAULT_OPT_IDS_PIVOT       = ["identityType", "dataType", "activity", "destCategory"];
const DEFAULT_OPT_IDS_DESTINATION = ["identityType", "dataType", "activity", "destination"];

// ── Transaction type ────────────────────────────────────────────────────────

interface Transaction {
  identity: string;
  dataType: string;
  policy: string;
  destination: string;
  destCategory: string;
  browser: string;
  device: string;
  srcCountry: string;
  accessMethod: string;
  userGroup: string;
  identityType: string;
  activity: string;
  managed: boolean;
}

// ── Identity helpers ────────────────────────────────────────────────────────

const TRANSACTION_IDENTITY_POOL: RegistryIdentity[] = IDENTITY_REGISTRY.filter(
  (i) => i.inTransactions,
);
// Weight the pick pool so Internal and External Users dominate the graph segments
const IDENTITIES: string[] = TRANSACTION_IDENTITY_POOL.flatMap((i) => {
  const t = i.identityType;
  const weight = t === "internal-user" ? 6 : t === "external-user" ? 4 : 1;
  return Array(weight).fill(i.id);
});

function getIdentityTypeLabel(id: string): string {
  const entry = IDENTITY_REGISTRY.find((i) => i.id === id);
  return entry ? (IDENTITY_TYPE_LABEL[entry.identityType] ?? "Unknown") : "Unknown";
}
function getIdentityDepartment(id: string): string {
  return IDENTITY_REGISTRY.find((i) => i.id === id)?.department ?? "—";
}
function getIdentityName(id: string): string {
  return IDENTITY_REGISTRY.find((i) => i.id === id)?.name ?? id;
}

// ── Platform display labels ─────────────────────────────────────────────────

const PLATFORM_DISPLAY: Record<string, string> = {
  "google-drive": "Google Drive",
  "sharepoint":   "SharePoint",
  "aws-s3":       "AWS S3",
  "azure-blob":   "Azure Blob",
  "postgresql":   "PostgreSQL",
  "oracle":       "Oracle DB",
  "aws-rds":      "AWS RDS",
  "azure-sql":    "Azure SQL",
  "endpoint":     "Endpoint",
};

// ── Managed destinations derived from DATA_STORES ───────────────────────────

const MANAGED_DESTINATIONS = DATA_STORES.map((s) => ({
  name:     s.name,
  type:     s.platform,
  category: PLATFORM_DISPLAY[s.platform] ?? s.platform,
}));

// ── Unmanaged destinations: full inventory list ─────────────────────────────

const UNMANAGED_DESTINATIONS = INVENTORY_UNMANAGED;

// ── Destination category lookup (for node tooltips) ─────────────────────────

const DEST_CATEGORY_MAP: Record<string, string> = {};
for (const d of MANAGED_DESTINATIONS) DEST_CATEGORY_MAP[d.name] = d.category;
for (const d of UNMANAGED_DESTINATIONS) DEST_CATEGORY_MAP[d.name] = d.category;

const BROWSERS        = ["Chrome", "Firefox", "Safari", "Edge", "Brave"];
const DEVICES         = ["Desktop", "Mobile", "Tablet"];
const COUNTRIES       = ["US", "Canada", "UK", "Germany", "Brazil", "South Africa", "India", "Japan"];
const ACCESS_METHODS  = ["GRE", "IPSec", "NS Client", "Enterprise Browser", "Explicit Proxy"];
const ACTIVITIES      = ["Upload", "Download", "Edit", "Share", "Post"];

// ── Exported structured data for DataExplorerPage left panel ─────────────────

export interface MotionDestination {
  id: string;
  name: string;
  category: string;
  managed: boolean;
}

export const MOTION_DESTINATIONS: MotionDestination[] = [
  // Managed: every individual store from the inventory
  ...DATA_STORES.map((s) => ({
    id:       s.id,
    name:     s.name,
    category: PLATFORM_DISPLAY[s.platform] ?? s.platform,
    managed:  true,
  })),
  // Unmanaged: every application, website, and device peripheral
  ...INVENTORY_UNMANAGED.map((d) => ({
    id:   d.id,
    name: d.name,
    category:
      d.destinationType === "Application" ? "Application" :
      d.destinationType === "Website"     ? "Website"     :
                                            "Device Peripheral",
    managed: false,
  })),
];

export const MOTION_IDENTITIES = TRANSACTION_IDENTITY_POOL;

// ── Transaction generation ──────────────────────────────────────────────────

export const BASE_DATA_TYPES = [
  "Personal Names", "Email Addresses", "Social Security Numbers",
  "Payment Cards", "Medical Records", "Bank Account Information",
  "IP Addresses", "Passwords", "Source Code", "Birthdates",
  "Financial IDs", "Healthcare IDs", "Telephone Numbers",
  "Postal Addresses", "Driver Licenses",
];

type DayRange = 7 | 30 | 60 | 90;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateTransactions(selectedDataTypes: string[], dayRange: DayRange = 30): Transaction[] {
  if (selectedDataTypes.length === 0) return [];
  const rng  = seededRandom(selectedDataTypes.join(",").length * 7 + 42 + dayRange);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  // Shuffle unmanaged destinations once so every call distributes coverage differently
  // but deterministically (seeded). Each data type gets up to 8 unmanaged destinations.
  const shuffledUnmanaged = [...UNMANAGED_DESTINATIONS].sort(() => rng() - 0.5);

  const dtDestMap: Record<string, string[]> = {};
  for (const dt of selectedDataTypes) {
    const managed   = MANAGED_DESTINATIONS.filter(() => rng() > 0.4).slice(0, 3);
    if (managed.length === 0) managed.push(MANAGED_DESTINATIONS[0]);
    const unmanaged = shuffledUnmanaged.filter(() => rng() > 0.35).slice(0, 8);
    dtDestMap[dt] = [...managed.map((d) => d.name), ...unmanaged.map((d) => d.name)];
  }

  const dayMultiplier = dayRange / 30;
  const count = Math.floor((180 + Math.floor(rng() * 120)) * dayMultiplier);
  const transactions: Transaction[] = [];

  for (let i = 0; i < count; i++) {
    const dataType = pick(selectedDataTypes);
    const identity = pick(IDENTITIES);
    const destName = pick(dtDestMap[dataType] || [MANAGED_DESTINATIONS[0].name]);
    const isManaged = MANAGED_DESTINATIONS.some((d) => d.name === destName);
    const pRoll = rng();
    let policy: string;
    if      (pRoll < 0.55) policy = "allow";
    else if (pRoll < 0.75) policy = "block";
    else if (pRoll < 0.88) policy = "user alert (stop)";
    else                   policy = "user alert (proceed)";
    transactions.push({
      identity, dataType, policy,
      destination:  destName,
      destCategory: DEST_CATEGORY_MAP[destName] ?? (isManaged ? "Managed" : "Unmanaged"),
      browser:      pick(BROWSERS),
      device:       pick(DEVICES),
      srcCountry:   pick(COUNTRIES),
      accessMethod: pick(ACCESS_METHODS),
      userGroup:    getIdentityDepartment(identity),
      identityType: getIdentityTypeLabel(identity),
      activity:     pick(ACTIVITIES),
      managed:      isManaged,
    });
  }
  return transactions;
}

function generateBaseTransactions(dayRange: DayRange = 30): Transaction[] {
  const base = generateTransactions(BASE_DATA_TYPES, dayRange);

  // Supplement: ensure every unmanaged app/website has at least a few transactions
  // so destination-start mode always renders a non-empty Sankey.
  const rng  = seededRandom(dayRange * 13 + 7);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const extra: Transaction[] = [];
  for (const dest of UNMANAGED_DESTINATIONS) {
    const destTypes = dest.dataTypes.length > 0
      ? dest.dataTypes.map((dt) => dt.type)
      : BASE_DATA_TYPES;
    for (let i = 0; i < 4; i++) {
      const dataType = pick(destTypes);
      const identity = pick(IDENTITIES);
      const pRoll = rng();
      extra.push({
        identity, dataType,
        policy:       pRoll < 0.55 ? "allow" : pRoll < 0.75 ? "block" : pRoll < 0.88 ? "user alert (stop)" : "user alert (proceed)",
        destination:  dest.name,
        destCategory: DEST_CATEGORY_MAP[dest.name] ?? dest.category,
        browser:      pick(BROWSERS),
        device:       pick(DEVICES),
        srcCountry:   pick(COUNTRIES),
        accessMethod: pick(ACCESS_METHODS),
        userGroup:    getIdentityDepartment(identity),
        identityType: getIdentityTypeLabel(identity),
        activity:     pick(ACTIVITIES),
        managed:      false,
      });
    }
  }
  return [...base, ...extra];
}

// ── Pre-computed "has-data" sets for the left panel ──────────────────────────
// Generate one baseline transaction set and extract unique destination names
// so the DataExplorerPage can grey-out destinations with zero events.

const _baselineTxns = generateBaseTransactions(30);
const _baselineDestNames = new Set(_baselineTxns.map((t) => t.destination));

export const MOTION_DEST_IDS_WITH_HITS: Set<string> = new Set([
  // Transaction-derived hits (managed stores + unmanaged destinations that appear in baseline)
  ...MOTION_DESTINATIONS
    .filter((d) => _baselineDestNames.has(d.name))
    .map((d) => d.id),
  // All unmanaged applications and websites with known data activity
  ...MOTION_DESTINATIONS
    .filter((d) => !d.managed && (d.category === "Application" || d.category === "Website"))
    .map((d) => d.id),
]);

export const MOTION_IDENTITY_IDS_WITH_HITS: Set<string> = new Set(
  _baselineTxns.map((t) => t.identity),
);

export const MOTION_DATA_TYPES_WITH_HITS: Set<string> = new Set([
  ...BASE_DATA_TYPES,
  ...INVENTORY_UNMANAGED.flatMap((d) => d.dataTypes.map((dt) => dt.type)),
]);

// ── Sankey layout ────────────────────────────────────────────────────────────

interface SankeyNode {
  id:     string;
  colId:  string;
  value:  string;
  count:  number;
  x:      number;
  y:      number;
  height: number;
  color:  string;
}

interface SankeyLink {
  source:    string;
  target:    string;
  count:     number;
  sourceY:   number;
  targetY:   number;
  thickness: number;
  color:     string;
  ghost?:    boolean;
}

function computeSankeyLayout(
  transactions: Transaction[],
  activeColumns: ColumnDef[],
  width: number,
  height: number,
): { nodes: SankeyNode[]; links: SankeyLink[]; ghostLinks: SankeyLink[] } {
  if (transactions.length === 0 || activeColumns.length === 0) {
    return { nodes: [], links: [], ghostLinks: [] };
  }

  const COL_PADDING_RIGHT = 160;
  const BOTTOM_PADDING   = 30;
  const NODE_GAP         = 6;
  const MIN_NODE_HEIGHT  = 4;
  const TERMINAL_POLICIES = new Set(["block", "user alert (stop)"]);

  const drawableH = height - TOP_PADDING - BOTTOM_PADDING;
  const drawableW = width  - COL_PADDING_LEFT - COL_PADDING_RIGHT;
  const colCount  = activeColumns.length;
  const colSpacing = colCount > 1 ? drawableW / (colCount - 1) : drawableW / 2;

  // ── Count each value per column ──────────────────────────────────────────
  const colValueCounts: Map<string, number>[] = activeColumns.map(() => new Map());

  for (const tx of transactions) {
    let blocked = false;
    for (let ci = 0; ci < activeColumns.length; ci++) {
      const col = activeColumns[ci];
      const val = String(tx[col.field]);
      colValueCounts[ci].set(val, (colValueCounts[ci].get(val) ?? 0) + 1);
      if (col.field === "policy" && TERMINAL_POLICIES.has(tx.policy)) blocked = true;
      if (blocked && ci > activeColumns.findIndex((c) => c.field === "policy")) break;
    }
  }

  // ── Build nodes ──────────────────────────────────────────────────────────
  const allNodes: SankeyNode[] = [];

  for (let ci = 0; ci < activeColumns.length; ci++) {
    const col       = activeColumns[ci];
    const valCounts = colValueCounts[ci];
    const total     = Array.from(valCounts.values()).reduce((a, b) => a + b, 0);
    const colX      = computeColX(ci, colCount, width);

    // Sort entries by count descending
    const entries = Array.from(valCounts.entries()).sort((a, b) => b[1] - a[1]);
    const totalH  = drawableH;
    const totalGap= NODE_GAP * (entries.length - 1);
    const availH  = Math.max(0, totalH - totalGap);

    let curY = TOP_PADDING;
    for (const [val, count] of entries) {
      const rawH  = total > 0 ? (count / total) * availH : availH / entries.length;
      const nodeH = Math.max(MIN_NODE_HEIGHT, rawH);

      let color: string;
      if (col.field === "policy") {
        color = POLICY_COLORS[val] ?? "#64748b";
      } else if (col.field === "destination") {
        color = MANAGED_DESTINATIONS.some((d) => d.name === val) ? MANAGED_COLOR : UNMANAGED_COLOR;
      } else if (col.field === "destCategory") {
        // Managed platform categories use MANAGED_COLOR; unmanaged use UNMANAGED_COLOR
        const isManaged = MANAGED_DESTINATIONS.some((d) => d.category === val);
        color = isManaged ? MANAGED_COLOR : UNMANAGED_COLOR;
      } else {
        color = COL_COLORS[col.id] ?? "#64748b";
      }

      allNodes.push({
        id:     `${col.id}:${val}`,
        colId:  col.id,
        value:  val,
        count,
        x:      colX,
        y:      curY,
        height: nodeH,
        color,
      });
      curY += nodeH + NODE_GAP;
    }
  }

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // ── Build links ──────────────────────────────────────────────────────────
  // Track outflow/inflow offsets for link stacking
  const outflowOffset = new Map<string, number>();
  const inflowOffset  = new Map<string, number>();
  for (const n of allNodes) {
    outflowOffset.set(n.id, n.y);
    inflowOffset.set(n.id,  n.y);
  }

  const links: SankeyLink[]      = [];
  const ghostLinks: SankeyLink[] = [];

  // Count flows per adjacent column pair
  interface FlowKey { srcId: string; tgtId: string }
  const flowCounts = new Map<string, { srcId: string; tgtId: string; count: number }>();

  const policyColIdx = activeColumns.findIndex((c) => c.field === "policy");

  for (const tx of transactions) {
    for (let ci = 0; ci < activeColumns.length - 1; ci++) {
      const srcCol = activeColumns[ci];
      const tgtCol = activeColumns[ci + 1];
      const srcVal = String(tx[srcCol.field]);
      const tgtVal = String(tx[tgtCol.field]);
      const srcId  = `${srcCol.id}:${srcVal}`;
      const tgtId  = `${tgtCol.id}:${tgtVal}`;

      // Skip flows past a terminal policy
      if (policyColIdx >= 0 && ci >= policyColIdx && TERMINAL_POLICIES.has(tx.policy)) {
        // Generate a ghost link from policy to destination
        if (srcCol.field === "policy" && TERMINAL_POLICIES.has(srcVal)) {
          const key = `ghost:${srcId}→${tgtId}`;
          const ex  = flowCounts.get(key);
          if (ex) { ex.count++; } else { flowCounts.set(key, { srcId, tgtId, count: 1 }); }
        }
        continue;
      }

      const key = `${srcId}→${tgtId}`;
      const ex  = flowCounts.get(key);
      if (ex) { ex.count++; } else { flowCounts.set(key, { srcId, tgtId, count: 1 }); }
    }
  }

  const totalTx = transactions.length;

  for (const [key, flow] of flowCounts.entries()) {
    const srcNode = nodeMap.get(flow.srcId);
    const tgtNode = nodeMap.get(flow.tgtId);
    if (!srcNode || !tgtNode) continue;

    const thick = Math.max(1, (flow.count / totalTx) * (srcNode.height));
    const srcOff = outflowOffset.get(flow.srcId) ?? srcNode.y;
    const tgtOff = inflowOffset.get(flow.tgtId)  ?? tgtNode.y;

    outflowOffset.set(flow.srcId, srcOff + thick);
    inflowOffset.set(flow.tgtId,  tgtOff + thick);

    const isGhost = key.startsWith("ghost:");
    const linkObj: SankeyLink = {
      source:    flow.srcId,
      target:    flow.tgtId,
      count:     flow.count,
      sourceY:   srcOff + thick / 2,
      targetY:   tgtOff + thick / 2,
      thickness: thick,
      color:     isGhost ? GHOST_COLOR : (srcNode.color),
      ghost:     isGhost,
    };
    if (isGhost) { ghostLinks.push(linkObj); } else { links.push(linkObj); }
  }

  return { nodes: allNodes, links, ghostLinks };
}

// ── Side panel item descriptor ───────────────────────────────────────────────

type SankeyPanelItemKind = "identity" | "destination" | "dataStore";

interface SankeyPanelItem {
  kind: SankeyPanelItemKind;
  /** Raw node value (identity ID, destination name, data store name) */
  value: string;
}

/** Deterministic integer seed from a string (mirrors AccessRadarDiagram) */
function idSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Toolbar column chip (no DnD — just label + remove) ───────────────────────

function ActiveColChip({
  col, onRemove,
}: {
  col: ColumnDef;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/60 bg-surface-raised select-none"
      style={{ fontSize: "11px", color: COL_COLORS[col.id] ?? "var(--muted-foreground)" }}
    >
      <span style={{ fontWeight: 500 }}>{col.label}</span>
      <button
        onClick={() => onRemove(col.id)}
        className="ml-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
        title={`Remove ${col.label}`}
      >
        <X size={9} />
      </button>
    </div>
  );
}

// ── Sankey column-header drag handles (HTML overlay) ─────────────────────────

const HEADER_DND_TYPE = "SANKEY_HEADER";

/** Draggable column-header rendered as HTML absolutely positioned over the SVG. */
function DraggableSankeyHeader({
  col, colX, onMove,
}: {
  col: ColumnDef;
  colX: number;
  onMove: (fromId: string, toId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: HEADER_DND_TYPE,
    // Carry source colour so the drop target can tint its indicator to match
    item: { id: col.id, color: COL_COLORS[col.id] ?? "#94a3b8" },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [{ isOver, srcColor }, drop] = useDrop<
    { id: string; color: string },
    void,
    { isOver: boolean; srcColor: string | null }
  >({
    accept: HEADER_DND_TYPE,
    drop(item) {
      if (item.id !== col.id) onMove(item.id, col.id);
    },
    collect: (m) => {
      const item = m.getItem() as { id: string; color: string } | null;
      return {
        isOver: m.isOver() && item?.id !== col.id,
        srcColor: item?.color ?? null,
      };
    },
  });

  drag(drop(ref));

  const color   = COL_COLORS[col.id] ?? "var(--muted-foreground)";
  const hiColor = srcColor ?? color; // colour from the column being dragged

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 4,
        left: colX + NODE_WIDTH / 2,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        padding: "8px 12px",
        cursor: isDragging ? "grabbing" : "grab",
        // Fade dragged column to a ghost so its origin slot stays legible
        opacity: isDragging ? 0.22 : 1,
        pointerEvents: "auto",
        userSelect: "none",
        transition: isDragging ? "none" : "opacity 0.15s",
        zIndex: isOver ? 10 : 1,
      }}
    >
      {/* ── Drop-target visuals ─────────────────────────────────────────────
          • Backdrop: coloured border + glow around the header label
          • Insertion line: thin vertical bar on the left edge that extends
            DOWN into the SVG canvas (overflows the 50 px overlay; clipped
            harmlessly by the canvas's overflow:hidden)               */}
      {isOver && (
        <>
          <div
            style={{
              position: "absolute",
              inset: "-4px -10px",
              borderRadius: 6,
              background: `${hiColor}18`,
              border: `1px solid ${hiColor}55`,
              boxShadow: `0 0 10px ${hiColor}30`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -12,
              right: -14,
              width: 2,
              // Intentionally tall — overflows into SVG; clipped by canvas overflow:hidden
              height: 2000,
              background: `linear-gradient(to bottom, ${hiColor} 0%, ${hiColor}99 8%, ${hiColor}30 25%, transparent 55%)`,
              borderRadius: 1,
              boxShadow: `0 0 6px ${hiColor}55`,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Ghost dashed outline at the origin slot while dragging */}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            inset: "-4px -10px",
            borderRadius: 6,
            border: `1px dashed ${color}45`,
            pointerEvents: "none",
          }}
        />
      )}

      <GripVertical
        size={13}
        style={{
          color: isOver ? hiColor : "var(--muted-foreground)",
          opacity: isOver ? 1 : 0.5,
          transition: "color 0.15s",
          position: "relative", zIndex: 1,
        }}
      />
      <span
        style={{
          fontSize: "10px",
          fontWeight: isOver ? 700 : 600,
          color: isOver ? hiColor : color,
          opacity: isOver ? 1 : 0.85,
          transition: "color 0.15s, opacity 0.15s",
          whiteSpace: "nowrap",
          position: "relative", zIndex: 1,
        }}
      >
        {col.label}
      </span>
    </div>
  );
}

/** Static (non-draggable) column header for Identity, Policy, Destination. */
function StaticSankeyHeader({ col, colX }: { col: ColumnDef; colX: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 22,
        left: colX + NODE_WIDTH / 2,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: COL_COLORS[col.id] ?? "var(--muted-foreground)",
          opacity: 0.65,
        }}
      >
        {col.label}
      </span>
    </div>
  );
}

// ── Day range toggle ─────────────────────────────────────────────────────────

function DayRangeToggle({ value, onChange }: { value: DayRange; onChange: (v: DayRange) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-surface-raised border border-border rounded-md p-0.5">
      {([7, 30, 60, 90] as DayRange[]).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className="px-2 py-1 rounded transition-colors cursor-pointer"
          style={{
            fontSize: "11px", fontWeight: 500,
            background: value === d ? "rgba(148,163,184,0.12)" : "transparent",
            color:      value === d ? "var(--text-bright)" : "var(--muted-foreground)",
          }}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyPrompt({ startFrom }: { startFrom: string }) {
  const hint =
    startFrom === "dataType"        ? "Select a data type on the left to trace its flow" :
    startFrom === "dataDestination" ? "Select a destination on the left to see who is sending data to it" :
                                      "Select an identity on the left to see where they are sending data";
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-muted-foreground/50" style={{ minHeight: 300 }}>
      <Shield size={32} strokeWidth={1} />
      <p style={{ fontSize: "13px" }}>{hint}</p>
    </div>
  );
}

// ── Sankey SVG ───────────────────────────────────────────────────────────────

interface SankeySVGProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  ghostLinks: SankeyLink[];
  width: number;
  height: number;
  hoveredNode: string | null;
  onHoverNode: (id: string | null, pos?: { x: number; y: number }) => void;
  onNodeClick: (id: string) => void;
  onBackgroundClick: () => void;
  activeColumns: ColumnDef[];
  pinnedNodeIds: Set<string>;
  activeNodeIds: Set<string> | null; // null = everything active (no pins)
  isFocused: boolean; // true when a node is pinned and focused layout is active
}

function SankeySVG({ nodes, links, ghostLinks, width, height, hoveredNode, onHoverNode, onNodeClick, onBackgroundClick, activeColumns, pinnedNodeIds, activeNodeIds, isFocused }: SankeySVGProps) {
  const colIds = activeColumns.map((c) => c.id);
  const colXMap = new Map<string, number>();
  for (const n of nodes) {
    if (!colXMap.has(n.colId)) colXMap.set(n.colId, n.x);
  }

  const hasPins = pinnedNodeIds.size > 0;

  // Click on the SVG background (not on a node) clears the pinned selection
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).classList.contains("sankey-bg")) {
      onBackgroundClick();
    }
  }

  // Determine hover-highlighted nodes — bidirectional BFS so the full path lights up
  const hoveredNodeObj = nodes.find((n) => n.id === hoveredNode);
  const hoverHighlightIds = new Set<string>();
  if (hoveredNodeObj) {
    const allLinks = [...links, ...ghostLinks];

    const forwardQueue = [hoveredNode!];
    const forwardVisited = new Set<string>([hoveredNode!]);
    while (forwardQueue.length > 0) {
      const curr = forwardQueue.shift()!;
      for (const lk of allLinks) {
        if (lk.source === curr && !forwardVisited.has(lk.target)) {
          forwardVisited.add(lk.target);
          forwardQueue.push(lk.target);
        }
      }
    }

    const backwardQueue = [hoveredNode!];
    const backwardVisited = new Set<string>([hoveredNode!]);
    while (backwardQueue.length > 0) {
      const curr = backwardQueue.shift()!;
      for (const lk of allLinks) {
        if (lk.target === curr && !backwardVisited.has(lk.source)) {
          backwardVisited.add(lk.source);
          backwardQueue.push(lk.source);
        }
      }
    }

    for (const id of forwardVisited)  hoverHighlightIds.add(id);
    for (const id of backwardVisited) hoverHighlightIds.add(id);
  }

  const hasHover = hoveredNode !== null;
  const hasFocus = hasPins || hasHover;

  // When a node is pinned, nodes outside the active set are hidden entirely.
  // On hover-only, non-highlighted nodes are dimmed but still visible.
  function isNodeVisible(nodeId: string): boolean {
    if (hasPins && activeNodeIds && !activeNodeIds.has(nodeId)) return false;
    return true;
  }

  function isNodeHighlighted(nodeId: string): boolean {
    if (!hasFocus) return true;
    if (hasPins && activeNodeIds && !activeNodeIds.has(nodeId)) return false;
    if (hasHover && !hoverHighlightIds.has(nodeId)) {
      if (pinnedNodeIds.has(nodeId)) return true;
      return false;
    }
    return true;
  }

  function isLinkVisible(srcId: string, tgtId: string): boolean {
    if (hasPins && activeNodeIds && (!activeNodeIds.has(srcId) || !activeNodeIds.has(tgtId))) return false;
    return true;
  }

  function isLinkHighlighted(srcId: string, tgtId: string): boolean {
    if (!hasFocus) return true;
    if (hasPins && activeNodeIds && (!activeNodeIds.has(srcId) || !activeNodeIds.has(tgtId))) return false;
    if (hasHover && (!hoverHighlightIds.has(srcId) || !hoverHighlightIds.has(tgtId))) return false;
    return true;
  }

  function linkPath(x1: number, y1: number, x2: number, y2: number) {
    const cpX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${x2} ${y2}`;
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ overflow: "visible" }}
      onMouseLeave={() => onHoverNode(null)}
      onClick={handleSvgClick}
    >
      {/* Transparent background rect — catches clicks on empty space */}
      <rect
        className="sankey-bg"
        x={0} y={0} width={width} height={height}
        fill="transparent"
      />

      {/* Ghost links (blocked flows) */}
      {ghostLinks.map((lk, i) => {
        const srcNode = nodes.find((n) => n.id === lk.source);
        const tgtNode = nodes.find((n) => n.id === lk.target);
        if (!srcNode || !tgtNode) return null;
        // In focused mode all ghost links present are already relevant
        if (!isFocused && !isLinkVisible(lk.source, lk.target)) return null;
        const x1 = srcNode.x + NODE_WIDTH;
        const x2 = tgtNode.x;
        const isHL = isFocused ? true : isLinkHighlighted(lk.source, lk.target);
        return (
          <path
            key={`ghost-${i}`}
            d={linkPath(x1, lk.sourceY, x2, lk.targetY)}
            fill="none"
            stroke={GHOST_COLOR}
            strokeWidth={Math.max(0.5, lk.thickness)}
            opacity={isHL ? 0.12 : 0.04}
            strokeDasharray="3 4"
            style={{ transition: "d 0.35s cubic-bezier(0.4,0,0.2,1), stroke-width 0.35s cubic-bezier(0.4,0,0.2,1)" }}
          />
        );
      })}

      {/* Normal links */}
      {links.map((lk, i) => {
        const srcNode = nodes.find((n) => n.id === lk.source);
        const tgtNode = nodes.find((n) => n.id === lk.target);
        if (!srcNode || !tgtNode) return null;
        if (!isFocused && !isLinkVisible(lk.source, lk.target)) return null;
        const x1 = srcNode.x + NODE_WIDTH;
        const x2 = tgtNode.x;
        const isHL = isFocused ? true : isLinkHighlighted(lk.source, lk.target);
        return (
          <path
            key={`link-${i}`}
            d={linkPath(x1, lk.sourceY, x2, lk.targetY)}
            fill="none"
            stroke={lk.color}
            strokeWidth={Math.max(0.5, lk.thickness)}
            opacity={isHL ? 0.35 : 0.05}
            style={{
              transition: "opacity 0.2s, d 0.35s cubic-bezier(0.4,0,0.2,1), stroke-width 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        if (!isFocused && !isNodeVisible(node.id)) return null;
        const isHighlighted = isFocused ? true : isNodeHighlighted(node.id);
        const isHover  = node.id === hoveredNode;
        const isPinned = pinnedNodeIds.has(node.id);
        const opacity  = isHighlighted ? (isHover ? 1 : isPinned ? 1 : 0.85) : 0.15;
        const isDest   = node.colId === "destination" || node.colId === "destCategory";
        const isIdent  = node.colId === "identity";
        const labelX   = isDest ? node.x + NODE_WIDTH + 6 : node.x - 6;
        const textAnchor = isDest ? "start" : "end";

        // Resolve display label (identity IDs → human names)
        const displayValue = isIdent ? getIdentityName(node.value) : node.value;
        const maxLen = isDest ? 22 : 14;
        const label = displayValue.length > maxLen
          ? displayValue.slice(0, maxLen - 1) + "…"
          : displayValue;

        return (
          <g
            key={node.id}
            style={{ cursor: "pointer", transition: "opacity 0.2s" }}
            opacity={opacity}
            onMouseEnter={(e) => onHoverNode(node.id, { x: e.clientX, y: e.clientY })}
            onMouseLeave={() => onHoverNode(null)}
            onClick={() => onNodeClick(node.id)}
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={node.height}
              rx={3}
              fill={node.color}
              style={{ transition: "y 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)" }}
            />
            {/* Pinned indicator — bright outline ring */}
            {isPinned && (
              <rect
                x={node.x - 2}
                y={node.y - 2}
                width={NODE_WIDTH + 4}
                height={node.height + 4}
                rx={4}
                fill="none"
                stroke={node.color}
                strokeWidth={1.5}
                opacity={0.7}
                style={{ transition: "y 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)" }}
              />
            )}
            {node.height >= 8 && (
              <text
                x={labelX}
                y={node.y + node.height / 2}
                dominantBaseline="middle"
                textAnchor={textAnchor}
                fill={node.color}
                style={{
                  fontSize: "10px",
                  fontWeight: isHover || isPinned ? 600 : 400,
                  pointerEvents: "none",
                  userSelect: "none",
                  transition: "y 0.35s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {label}
              </text>
            )}
            {/* Managed indicator for destination / destCategory nodes */}
            {isDest && node.height >= 6 && (
              <circle
                cx={node.x + NODE_WIDTH + 3}
                cy={node.y + node.height / 2}
                r={2.5}
                fill={
                  node.colId === "destination"
                    ? MANAGED_DESTINATIONS.some((d) => d.name === node.value) ? "#22c55e" : "transparent"
                    : MANAGED_DESTINATIONS.some((d) => d.category === node.value) ? "#22c55e" : "transparent"
                }
                opacity={0.8}
                style={{ transition: "cy 0.35s cubic-bezier(0.4,0,0.2,1)" }}
              />
            )}
          </g>
        );
      })}

      {/* Column headers are rendered as an HTML overlay in the parent — not here */}
    </svg>
  );
}

// ── Hover tooltip ────────────────────────────────────────────────────────────

function NodeTooltip({
  node, pos, transactions, onOpenPanel, onMouseEnter, onMouseLeave,
}: {
  node: SankeyNode;
  pos: { x: number; y: number };
  transactions: Transaction[];
  onOpenPanel?: (item: SankeyPanelItem) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isDest    = node.colId === "destination";
  const isIdentity = node.colId === "identity";
  const panelKind = colIdToPanelKind(node.colId);
  const isManaged = isDest && MANAGED_DESTINATIONS.some((d) => d.name === node.value);
  const displayName = isIdentity ? getIdentityName(node.value) : node.value;
  const tipW = 220;
  const tipH = 110;
  const spaceR = window.innerWidth - pos.x - 24;
  const left   = spaceR >= tipW + 8 ? pos.x + 14 : pos.x - tipW - 14;
  let   top    = pos.y - tipH / 2;
  top = Math.max(8, Math.min(top, window.innerHeight - tipH - 8));

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed", left, top, zIndex: 9999,
        pointerEvents: panelKind ? "auto" : "none",
        width: tipW, background: "var(--card)",
        border: "1px solid var(--border)", borderRadius: 8,
        padding: "10px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: node.color, flex: 1, minWidth: 0 }}>
          {displayName}
        </span>
        {panelKind && onOpenPanel && (
          <button
            type="button"
            title="View side panel"
            className="flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
            style={{ width: 20, height: 20, flexShrink: 0, background: "none", border: "none", cursor: "pointer" }}
            onClick={() => onOpenPanel({ kind: panelKind, value: node.value })}
          >
            <PanelRight size={13} />
          </button>
        )}
      </div>
      {isIdentity && (() => {
        const entry = IDENTITY_REGISTRY.find((i) => i.id === node.value);
        return entry ? (
          <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: 4 }}>
            {entry.role} · {entry.department}
          </div>
        ) : null;
      })()}
      {isDest && (
        <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: 4 }}>
          <span style={{ color: isManaged ? "#22c55e" : "#64748b", fontWeight: 500 }}>
            {isManaged ? "Managed" : "Unmanaged"}
          </span>
          {" · "}
          {DEST_CATEGORY_MAP[node.value] || "Unknown"}
        </div>
      )}
      <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
        <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{node.count.toLocaleString()}</span> transactions
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface DataMotionSankeyProps {
  startFrom: "dataType" | "dataDestination" | "identity";
  selectedItems: string[];
  onGraphFocusChange?: (focused: boolean) => void;
}

export function DataMotionSankey({ startFrom, selectedItems, onGraphFocusChange }: DataMotionSankeyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [dayRange,   setDayRange]   = useState<DayRange>(7);

  // Active optional columns (IDs of optional cols that are on)
  const [activeOptIds, setActiveOptIds] = useState<string[]>(
    startFrom === "dataType"        ? DEFAULT_OPT_IDS_PIVOT
    : startFrom === "dataDestination" ? DEFAULT_OPT_IDS_DESTINATION
    : DEFAULT_OPT_IDS_IDENTITY
  );
  // Ordered list of all non-anchor column IDs — drives both visibility and left-to-right order.
  // identityType is included so it can be reordered when in pivot mode.
  // identity remains a fixed anchor (prepended) in identity-pivot mode.
  const [draggableOrder, setDraggableOrder] = useState<string[]>([
    "identityType", "identity", "activity", "dataType", "policy", "browser", "device",
    "srcCountry", "accessMethod", "userGroup", "destCategory", "destination",
  ]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoverPos,    setHoverPos]    = useState<{ x: number; y: number } | null>(null);
  const hoverHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addColOpen, setAddColOpen] = useState(false);
  const addColRef = useRef<HTMLDivElement>(null);

  // ── Pinned path state ─────────────────────────────────────────────────────
  const [pinnedPath, setPinnedPath] = useState<string[]>([]);
  // Column pin order — columns appended when first pinned, removed when all pins in that column are cleared
  const [colPinOrder, setColPinOrder] = useState<string[]>([]);

  // Notify parent when pin state crosses the 0 boundary
  useEffect(() => {
    onGraphFocusChange?.(pinnedPath.length > 0);
  }, [pinnedPath.length, onGraphFocusChange]);

  // Close "Add column" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addColRef.current && !addColRef.current.contains(e.target as Node)) {
        setAddColOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape key: unpin all
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pinnedPath.length > 0) {
        setPinnedPath([]);
        setColPinOrder([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pinnedPath.length]);

  // Clear pins and active optional columns when startFrom changes
  useEffect(() => {
    setPinnedPath([]);
    setColPinOrder([]);
    const nextIds = startFrom === "dataType"          ? DEFAULT_OPT_IDS_PIVOT
                  : startFrom === "dataDestination"   ? DEFAULT_OPT_IDS_DESTINATION
                  : DEFAULT_OPT_IDS_IDENTITY;
    setActiveOptIds(nextIds);
  }, [startFrom]);

  // Clear pins when selection or day range changes
  useEffect(() => {
    setPinnedPath([]);
    setColPinOrder([]);
  }, [selectedItems, dayRange]);

  const hasPinnedPanel = pinnedPath.length > 0;

  // ── Side panel state ──────────────────────────────────────────────────────
  const [sidePanelItem, setSidePanelItem] = useState<SankeyPanelItem | null>(null);

  // Respond to container size changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 10 && height > 10) setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Whether we are in a mode where Identity Type is the fixed first column
  // and Identity itself is optional (addable via toolbar)
  const identityTypePivot = startFrom === "dataType" || startFrom === "dataDestination";

  // Build the active column list — order driven entirely by draggableOrder.
  // All columns are now driven by activeOptIds; no always-on exceptions.
  const activeColumns = useMemo<ColumnDef[]>(() => {
    return draggableOrder
      .map((id) => ALL_COLUMNS.find((c) => c.id === id)!)
      .filter(Boolean)
      .filter((c) => activeOptIds.includes(c.id));
  }, [activeOptIds, draggableOrder]);

  // Build transactions based on selection
  const transactions = useMemo<Transaction[]>(() => {
    if (selectedItems.length === 0) return generateBaseTransactions(dayRange);

    if (startFrom === "dataType") {
      return generateTransactions(selectedItems, dayRange);
    }
    if (startFrom === "dataDestination") {
      // selectedItems are destination IDs; tx.destination stores the display name — map before filtering
      const destNames = new Set(
        selectedItems
          .map((id) => MOTION_DESTINATIONS.find((d) => d.id === id)?.name)
          .filter((n): n is string => n !== undefined),
      );
      const base = generateBaseTransactions(dayRange);
      return base.filter((tx) => destNames.has(tx.destination));
    }
    // identity — tx.identity stores the registry ID directly, so compare IDs to IDs
    const idSet = new Set(selectedItems);
    const base = generateBaseTransactions(dayRange);
    return base.filter((tx) => idSet.has(tx.identity));
  }, [startFrom, selectedItems, dayRange]);

  const hasSelection = selectedItems.length > 0;

  // Full layout — always built from all transactions; used for BFS and as the
  // "base" from which we derive which transactions pass through pinned nodes.
  const layout = useMemo(
    () => computeSankeyLayout(transactions, activeColumns, dimensions.width, dimensions.height),
    [transactions, activeColumns, dimensions.width, dimensions.height],
  );

  const hoveredNodeObj = layout.nodes.find((n) => n.id === hoveredNode) ?? null;

  // ── BFS reachable set (operates on full layout) ───────────────────────────
  const getReachable = useCallback((nodeId: string): Set<string> => {
    const allLinks = [...layout.links, ...layout.ghostLinks];
    const reachable = new Set<string>([nodeId]);
    const fQueue = [nodeId];
    while (fQueue.length > 0) {
      const curr = fQueue.shift()!;
      for (const lk of allLinks) {
        if (lk.source === curr && !reachable.has(lk.target)) {
          reachable.add(lk.target); fQueue.push(lk.target);
        }
      }
    }
    const bQueue = [nodeId];
    while (bQueue.length > 0) {
      const curr = bQueue.shift()!;
      for (const lk of allLinks) {
        if (lk.target === curr && !reachable.has(lk.source)) {
          reachable.add(lk.source); bQueue.push(lk.source);
        }
      }
    }
    return reachable;
  }, [layout.links, layout.ghostLinks]);

  // Intersection of reachable sets across all pins → which node IDs are "in scope"
  const { activeSet, pinnedSet } = useMemo(() => {
    const pSet = new Set(pinnedPath);
    if (pinnedPath.length === 0) return { activeSet: null as Set<string> | null, pinnedSet: pSet };
    let result: Set<string> | null = null;
    for (const pin of pinnedPath) {
      const reachable = getReachable(pin);
      result = result === null ? reachable : new Set([...result].filter((x: string) => reachable.has(x)));
      for (const p of pinnedPath) result.add(p);
    }
    return { activeSet: result!, pinnedSet: pSet };
  }, [pinnedPath, getReachable]);

  // ── Focused layout — re-layout only the transactions that pass through all
  //    pinned nodes, so surviving segments expand to fill the full canvas.
  const focusedTransactions = useMemo(() => {
    if (pinnedPath.length === 0) return null;
    return transactions.filter((tx) =>
      pinnedPath.every((pin) => {
        const [colId, ...rest] = pin.split(":");
        const val = rest.join(":");
        const col = activeColumns.find((c) => c.id === colId);
        return col ? String(tx[col.field]) === val : false;
      }),
    );
  }, [pinnedPath, transactions, activeColumns]);

  const focusedLayout = useMemo(() => {
    if (!focusedTransactions) return null;
    return computeSankeyLayout(focusedTransactions, activeColumns, dimensions.width, dimensions.height);
  }, [focusedTransactions, activeColumns, dimensions.width, dimensions.height]);

  // Use focused layout for rendering when a pin is active; fall back to full layout
  const renderLayout = focusedLayout ?? layout;

  // Click handler — accumulates pins across columns (AND drill-down), one panel per column
  const handleNodeClick = useCallback((nodeId: string) => {
    const colId = nodeId.split(":")[0];
    const isUnpin = pinnedPath.includes(nodeId);
    setPinnedPath((prev) => {
      if (isUnpin) return prev.filter((id) => id !== nodeId);
      return [...prev, nodeId];
    });
    setColPinOrder((prev) => {
      if (!isUnpin) {
        if (prev.includes(colId)) return prev;
        return [...prev, colId];
      } else {
        const remainingInCol = pinnedPath.filter((id) => id !== nodeId && id.split(":")[0] === colId);
        if (remainingInCol.length === 0) return prev.filter((c) => c !== colId);
        return prev;
      }
    });
  }, [pinnedPath]);

  const handleHoverNode = useCallback((id: string | null, pos?: { x: number; y: number }) => {
    if (hoverHideTimer.current) { clearTimeout(hoverHideTimer.current); hoverHideTimer.current = null; }
    if (id !== null) {
      setHoveredNode(id);
      setHoverPos(pos ?? null);
    } else {
      hoverHideTimer.current = setTimeout(() => { setHoveredNode(null); setHoverPos(null); }, 200);
    }
  }, []);

  const toggleOptional = useCallback((id: string) => {
    setActiveOptIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // Insert new column at second-last position in draggableOrder
      setDraggableOrder((order) => {
        const withoutId = order.filter((x) => x !== id);
        const activeInOrder = withoutId.filter((x) => prev.includes(x));
        const lastActiveId = activeInOrder[activeInOrder.length - 1];
        const insertAt = lastActiveId !== undefined
          ? withoutId.indexOf(lastActiveId)
          : withoutId.length;
        const next = [...withoutId];
        next.splice(insertAt, 0, id);
        return next;
      });
      return [...prev, id];
    });
  }, []);

  // ID-based swap — avoids the index-mismatch bug when not all draggable cols are active
  const moveColumn = useCallback((fromId: string, toId: string) => {
    setDraggableOrder((prev) => {
      const fromIdx = prev.indexOf(fromId);
      const toIdx   = prev.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      return next;
    });
  }, []);

  const removeColumn = useCallback((id: string) => {
    setActiveOptIds((prev) => prev.filter((x) => x !== id));
  }, []);

  // All columns are optional and toggleable — no always-on or fixed anchors.
  const allOptionalCols = draggableOrder
    .map((id) => ALL_COLUMNS.find((c) => c.id === id)!)
    .filter(Boolean);
  // Active cols shown as chips in the toolbar
  const activeOptionalChips = allOptionalCols.filter((c) => activeOptIds.includes(c.id));
  // Not-yet-added cols shown in the "Add column" dropdown
  const addableCols = allOptionalCols.filter((c) => !activeOptIds.includes(c.id));
  // Default IDs for this mode (used for Reset comparison)
  const defaultOptIds = startFrom === "dataType"        ? DEFAULT_OPT_IDS_PIVOT
                      : startFrom === "dataDestination" ? DEFAULT_OPT_IDS_DESTINATION
                      : DEFAULT_OPT_IDS_IDENTITY;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col flex-1 min-h-0">

        {/* ── Toolbar — only shown when something is selected ──────────────── */}
        {hasSelection && <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-nav-bg/60">

          {/* Day range */}
          <div className="flex items-center gap-1.5 mr-1">
            <Calendar size={11} className="text-muted-foreground/60" />
            <DayRangeToggle value={dayRange} onChange={setDayRange} />
          </div>

          <div className="h-3 w-px bg-border/60" />

          {/* Column controls group */}
          <div className="flex items-center gap-2">
            <Columns2 size={11} className="text-muted-foreground/50 shrink-0" />

            {/* Active optional columns — chips with × to remove */}
            {activeOptionalChips.map((col) => (
              <ActiveColChip key={col.id} col={col} onRemove={removeColumn} />
            ))}

            {/* Add column dropdown — only shows optional cols not yet active */}
            {addableCols.length > 0 && (
              <div ref={addColRef} className="relative">
                <button
                  onClick={() => setAddColOpen((v) => !v)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all cursor-pointer"
                  style={{ fontSize: "11px" }}
                >
                  <Plus size={9} />
                  Add column
                  <ChevronDown size={9} className={`transition-transform ${addColOpen ? "rotate-180" : ""}`} />
                </button>
                {addColOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 flex flex-col bg-card border border-border rounded-lg shadow-xl overflow-hidden py-1 min-w-[160px]">
                    {addableCols.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => { toggleOptional(col.id); setAddColOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-foreground/[0.04] transition-colors cursor-pointer"
                        style={{ fontSize: "11px", color: COL_COLORS[col.id] ?? "var(--foreground)" }}
                      >
                        <Plus size={9} />
                        {col.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reset — always visible */}
            <button
              onClick={() => setActiveOptIds(defaultOptIds)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
              style={{ fontSize: "11px" }}
            >
              <RotateCcw size={9} />
              Reset
            </button>
          </div>
        </div>}

        {/* ── Legend — only shown when something is selected ───────────────── */}
        {hasSelection && <div className="shrink-0 flex items-center gap-4 px-4 py-1.5 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: MANAGED_COLOR }} />
            <span className="text-muted-foreground/70" style={{ fontSize: "10px" }}>Managed destination</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: UNMANAGED_COLOR }} />
            <span className="text-muted-foreground/70" style={{ fontSize: "10px" }}>Unmanaged destination</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: GHOST_COLOR, opacity: 0.3, backgroundImage: "repeating-linear-gradient(90deg, transparent 0, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)" }} />
            <span className="text-muted-foreground/70" style={{ fontSize: "10px" }}>Blocked / stopped flow</span>
          </div>
          {pinnedPath.length > 0 && (
            <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
              Press <kbd className="font-mono">Esc</kbd> to unpin all and back to see the selection
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 text-muted-foreground/50" style={{ fontSize: "10px" }}>
            <span>
              {focusedTransactions
                ? <>{focusedTransactions.length.toLocaleString()} <span className="text-muted-foreground/30">/ {transactions.length.toLocaleString()}</span></>
                : transactions.length.toLocaleString()
              } transactions
            </span>
            {hasSelection && (
              <span className="text-muted-foreground/30"> · filtered</span>
            )}
          </div>
        </div>}

        {/* ── Sankey canvas + optional pinned panel ───────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* SVG canvas — ResizeObserver measures this div only */}
          <div ref={containerRef} className="flex-1 min-w-0 overflow-hidden relative">
            {!hasSelection ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <EmptyPrompt startFrom={startFrom} />
              </div>
            ) : (
              <>
                <SankeySVG
                  nodes={renderLayout.nodes}
                  links={renderLayout.links}
                  ghostLinks={renderLayout.ghostLinks}
                  width={dimensions.width}
                  height={dimensions.height}
                  hoveredNode={hoveredNode}
                  onHoverNode={handleHoverNode}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={() => setPinnedPath([])}
                  activeColumns={activeColumns}
                  pinnedNodeIds={pinnedSet}
                  activeNodeIds={activeSet}
                  isFocused={pinnedPath.length > 0}
                />

                {/* Column header overlay — draggable for reorderable cols, static for anchors */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: dimensions.width,
                    height: TOP_PADDING,
                    pointerEvents: "none",   // pass mouse events to SVG by default
                  }}
                >
                  {activeColumns.map((col, idx) => {
                    const x = computeColX(idx, activeColumns.length, dimensions.width);
                    return (
                      <DraggableSankeyHeader
                        key={col.id}
                        col={col}
                        colX={x}
                        onMove={moveColumn}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/*
           * Pinned selection panel — always in the DOM so its width can
           * CSS-transition in/out (260 ↔ 0) in lock-step with the left
           * panel's 0 ↔ 300px transition.  Both animate over the same
           * 350 ms so they largely cancel each other out, keeping
           * containerRef's width nearly constant and preventing the
           * ResizeObserver from ever seeing a large sudden jump that
           * would leave the SVG temporarily wider than its container.
           */}
          <div
            className="shrink-0 overflow-hidden"
            style={{
              width: hasPinnedPanel ? 260 : 0,
              minWidth: 0,
              transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
              overflowY: "visible",
            }}
          >
            {/* Inner shell keeps its natural 260px so the panel layout
                is never distorted while the outer wrapper is animating. */}
            <div style={{ width: 260, minWidth: 260 }}>
              <SankeySelectionPanel
                pinnedPath={pinnedPath}
                activeSet={activeSet}
                nodes={renderLayout.nodes}
                activeColumns={activeColumns}
                startFrom={startFrom}
                onClearAll={() => { setPinnedPath([]); setColPinOrder([]); }}
                onClearCol={(colId) => {
                  setPinnedPath((prev) => prev.filter((id) => id.split(":")[0] !== colId));
                  setColPinOrder((prev) => prev.filter((c) => c !== colId));
                }}
                onPinNode={handleNodeClick}
                onOpenPanel={setSidePanelItem}
              />
            </div>
          </div>
        </div>

        {/* ── Hover tooltip ────────────────────────────────────────────────── */}
        {hoveredNodeObj && hoverPos && (
          <NodeTooltip
            node={hoveredNodeObj}
            pos={hoverPos}
            transactions={focusedTransactions ?? transactions}
            onOpenPanel={setSidePanelItem}
            onMouseEnter={() => { if (hoverHideTimer.current) { clearTimeout(hoverHideTimer.current); hoverHideTimer.current = null; } }}
            onMouseLeave={() => { hoverHideTimer.current = setTimeout(() => { setHoveredNode(null); setHoverPos(null); }, 200); }}
          />
        )}

        {/* ── Inventory side panel ─────────────────────────────────────────── */}
        <SankeyInventoryPanel
          item={sidePanelItem}
          onClose={() => setSidePanelItem(null)}
        />
      </div>
    </DndProvider>
  );
}

// ── Sankey Selection Panel ───────────────────────────────────────────────────

interface PanelNodeEntry {
  key: string;       // node.id e.g. "identity:alice-johnson"
  label: string;     // display label
  sublabel?: string; // extra context
  color: string;
  colId: string;
}

const COL_LABEL: Record<string, string> = {
  identity:     "Identities",
  dataType:     "Data Types",
  policy:       "Policy",
  destination:  "Destinations",
  browser:      "Browsers",
  device:       "Devices",
  srcCountry:   "Countries",
  accessMethod: "Access Methods",
  userGroup:    "User Groups",
  identityType: "Identity Types",
  activity:     "Activities",
};

function colIdToPanelKind(colId: string): SankeyPanelItemKind | null {
  if (colId === "identity")    return "identity";
  if (colId === "destination") return "destination";
  return null;
}

// ── Inline filter popovers for identity / destination panels ─────────────────

function PanelFilterPopover({ anchorRect, onClose, children }: {
  anchorRect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const W = 200;
  const left = Math.min(anchorRect.right - W, window.innerWidth - W - 8);
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8;
  const top = spaceBelow >= 160 ? anchorRect.bottom + 4 : anchorRect.top - Math.min(320, anchorRect.top - 8) - 4;

  return createPortal(
    <div ref={ref} className="fixed rounded-lg border border-border shadow-xl overflow-hidden"
      style={{ left, top, width: W, background: "var(--color-card)", zIndex: 9999 }}>
      {children}
    </div>,
    document.body
  );
}

function IdentityColFilter({ anchorRect, active, onClose, onClear, onToggle }: {
  anchorRect: DOMRect;
  active: string[];
  onClose: () => void;
  onClear: () => void;
  onToggle: (val: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>("identityType");
  return (
    <PanelFilterPopover anchorRect={anchorRect} onClose={onClose}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span style={{ fontSize: "11px", fontWeight: 600 }}>Filter Identities</span>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <button type="button" onClick={onClear} className="text-primary hover:underline"
              style={{ fontSize: "10px", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          )}
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"
            style={{ background: "none", border: "none", cursor: "pointer" }}><X size={13} /></button>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
        <FilterSection label="Identity Type" count={active.length} open={expanded === "identityType"} onToggle={() => setExpanded(p => p === "identityType" ? null : "identityType")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {IDENTITY_TYPE_GROUPS.map(({ typeId, label }) => (
              <label key={typeId} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={active.includes(typeId)} onChange={() => onToggle(typeId)}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{label}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </PanelFilterPopover>
  );
}

function DestColFilter({ anchorRect, active, onClose, onClear, onToggle }: {
  anchorRect: DOMRect;
  active: string[];
  onClose: () => void;
  onClear: () => void;
  onToggle: (val: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>("destType");
  return (
    <PanelFilterPopover anchorRect={anchorRect} onClose={onClose}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span style={{ fontSize: "11px", fontWeight: 600 }}>Filter Destinations</span>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <button type="button" onClick={onClear} className="text-primary hover:underline"
              style={{ fontSize: "10px", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          )}
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"
            style={{ background: "none", border: "none", cursor: "pointer" }}><X size={13} /></button>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
        <FilterSection label="Destination Type" count={active.length} open={expanded === "destType"} onToggle={() => setExpanded(p => p === "destType" ? null : "destType")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {([
              ["managed",           "Managed Data Stores"],
              ["unmanaged-app",     "Unmanaged Applications"],
              ["unmanaged-website", "Unmanaged Websites"],
            ] as const).map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={active.includes(val)} onChange={() => onToggle(val)}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{lbl}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </PanelFilterPopover>
  );
}

function SankeyColPanel({
  colId,
  pinnedPath,
  activeSet,
  nodes,
  activeColumns,
  startFrom,
  onClearCol,
  onPinNode,
  onOpenPanel,
}: {
  colId: string;
  pinnedPath: string[];
  activeSet: Set<string> | null;
  nodes: SankeyNode[];
  activeColumns: ColumnDef[];
  startFrom: "dataType" | "dataDestination" | "identity";
  onClearCol: () => void;
  onPinNode: (nodeId: string) => void;
  onOpenPanel: (item: SankeyPanelItem) => void;
}) {
  const colDef = activeColumns.find((c) => c.id === colId);
  const colColor = COL_COLORS[colId] ?? "#64748b";
  const colLabel = COL_LABEL[colId] || colDef?.label || colId;
  const colHasPins = pinnedPath.some((id) => id.split(":")[0] === colId);

  // Identity panel: hide filter when startFrom === "identity" (it's the pivot anchor)
  // Destination panel: hide filter when startFrom === "dataDestination" (it's the pivot anchor)
  const hasSearchFilter = (colId === "identity" && startFrom !== "identity")
                       || (colId === "destination" && startFrom !== "dataDestination");

  const [search, setSearch] = useState("");
  const [identityFilters, setIdentityFilters] = useState<IdentityPanelFilters>(EMPTY_IDENTITY_FILTERS);
  const [destFilterActive, setDestFilterActive] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const colNodes = useMemo(() => {
    const sourceKeys = activeSet
      ? Array.from(activeSet).filter((k) => k.split(":")[0] === colId)
      : nodes.filter((n) => n.colId === colId).map((n) => n.id);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result: PanelNodeEntry[] = [];
    for (const key of sourceKeys) {
      const node = nodeMap.get(key);
      if (!node) continue;
      let label = node.value;
      let sublabel: string | undefined;
      if (node.colId === "identity") {
        label = getIdentityName(node.value);
        const entry = IDENTITY_REGISTRY.find((i) => i.id === node.value);
        sublabel = entry?.role;
      }
      if (node.colId === "destination") {
        const isManaged = MANAGED_DESTINATIONS.some((d) => d.name === node.value);
        sublabel = isManaged ? DEST_CATEGORY_MAP[node.value] : "Unmanaged";
      }
      result.push({ key, label, sublabel, color: node.color, colId: node.colId });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }, [colId, activeSet, nodes]);

  // For identity col: detect if all members share the same identity type → hide Identity Type section
  const identityIds = useMemo(() =>
    colId === "identity"
      ? colNodes.map((n) => n.key.split(":").slice(1).join(":"))
      : [],
  [colId, colNodes]);

  const showIdentityType = useMemo(() => {
    if (colId !== "identity" || identityIds.length === 0) return true;
    const types = new Set(identityIds.map((id) => IDENTITY_REGISTRY.find((i) => i.id === id)?.identityType));
    return types.size > 1;
  }, [colId, identityIds]);

  // Only show Last Active when all panel members are unmapped or unauthenticated
  const onlyLastActive = useMemo(() => {
    if (colId !== "identity" || identityIds.length === 0) return false;
    return identityIds.every((id) => {
      const t = IDENTITY_REGISTRY.find((i) => i.id === id)?.identityType;
      return t === "unmapped-local-user" || t === "unknown-identity";
    });
  }, [colId, identityIds]);

  const visibleNodes = useMemo(() => {
    const lc = search.toLowerCase();
    const identityHasFilter = colId === "identity" && countActiveFilters(identityFilters) > 0;
    const destHasFilter = colId === "destination" && destFilterActive.length > 0;
    return colNodes.filter((node) => {
      if (lc && !node.label.toLowerCase().includes(lc)) return false;
      if (identityHasFilter) {
        const id = node.key.split(":").slice(1).join(":");
        return passesIdentityFilter(id, identityFilters);
      }
      if (destHasFilter) {
        const name = node.key.split(":").slice(1).join(":");
        const isManaged = MANAGED_DESTINATIONS.some((d) => d.name === name);
        const unmanagedEntry = INVENTORY_UNMANAGED.find((d) => d.name === name);
        const dtype = isManaged ? "managed" : unmanagedEntry?.destinationType === "Website" ? "unmanaged-website" : "unmanaged-app";
        return destFilterActive.includes(dtype);
      }
      return true;
    });
  }, [colNodes, search, identityFilters, destFilterActive, colId]);

  return (
    <div className="rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg overflow-hidden w-full min-w-0 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground)" }}>
            {colLabel}
          </span>
          <span className="text-muted-foreground/70" style={{ fontSize: "10px" }}>
            {visibleNodes.length}
          </span>
        </div>
        {colHasPins && (
          <button
            onClick={onClearCol}
            className="transition-all"
            style={{
              fontSize: "10px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              padding: "3px 10px",
              borderRadius: "4px",
              fontWeight: 500,
              opacity: 0.85,
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}
          >
            Unpin
          </button>
        )}
      </div>

      {/* Search + filter bar (identity and destination only, hidden for pivot anchor columns) */}
      {hasSearchFilter && (
        <div className="px-2 py-1.5 border-b border-border">
          <div className="flex items-center gap-1">
            <div className="relative flex-1 flex items-center bg-surface-raised border border-border rounded-md">
              <Search size={11} className="absolute left-2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={colId === "identity" ? "Search identities…" : "Search destinations…"}
                className="w-full pl-6 pr-2 py-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                style={{ fontSize: "11px" }}
              />
            </div>
            {(() => {
              const activeCount = colId === "identity"
                ? countActiveFilters(identityFilters)
                : destFilterActive.length;
              return (
                <button
                  ref={filterBtnRef}
                  type="button"
                  onClick={() => {
                    const rect = filterBtnRef.current?.getBoundingClientRect();
                    if (rect) setFilterAnchorRect(rect);
                    setFilterOpen((o) => !o);
                  }}
                  className={`shrink-0 flex items-center justify-center rounded-md border transition-colors ${activeCount > 0 ? "text-primary bg-primary/10 border-primary/40" : "text-muted-foreground border-border hover:text-foreground hover:bg-surface-raised"}`}
                  style={{ width: 26, height: 26, background: "none", cursor: "pointer", position: "relative" }}
                >
                  <SlidersHorizontal size={11} />
                  {activeCount > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      minWidth: 13, height: 13, borderRadius: 7,
                      background: "var(--primary)", color: "#fff",
                      fontSize: "8px", fontWeight: 700, lineHeight: "13px",
                      textAlign: "center", padding: "0 2px", pointerEvents: "none",
                    }}>{activeCount}</span>
                  )}
                </button>
              );
            })()}
          </div>
          {filterOpen && filterAnchorRect && colId === "identity" && (
            <IdentityFilterModal
              anchorRect={filterAnchorRect}
              filters={identityFilters}
              onApply={(f) => setIdentityFilters(f)}
              onClose={() => setFilterOpen(false)}
              identityIds={identityIds}
              showIdentityType={showIdentityType}
              onlyLastActive={onlyLastActive}
            />
          )}
          {filterOpen && filterAnchorRect && colId === "destination" && (
            <DestColFilter
              anchorRect={filterAnchorRect}
              active={destFilterActive}
              onClose={() => setFilterOpen(false)}
              onClear={() => setDestFilterActive([])}
              onToggle={(val) => setDestFilterActive((p) => p.includes(val) ? p.filter((x) => x !== val) : [...p, val])}
            />
          )}
        </div>
      )}

      {/* Node list */}
      <div style={
        visibleNodes.length > 10
          ? { minHeight: 300, maxHeight: 500, overflowY: "auto" }
          : { minHeight: "min-content" }
      }>
        {visibleNodes.length === 0 && (search || countActiveFilters(identityFilters) > 0 || destFilterActive.length > 0) && (
          <div className="px-3 py-3 text-muted-foreground/50 text-center" style={{ fontSize: "11px" }}>No results</div>
        )}
        {visibleNodes.map((node) => {
          const isPinned = pinnedPath.includes(node.key);
          const panelKind = colIdToPanelKind(node.colId);
          return (
            <div
              key={node.key}
              className="group flex items-start gap-2 px-3 py-1.5 hover:bg-surface-raised/50 cursor-pointer"
              style={{ minHeight: "28px" }}
              onClick={() => onPinNode(node.key)}
              title={isPinned ? "Click to unpin" : "Click to pin"}
            >
              <span className="flex-shrink-0 mt-0.5" style={{
                width: 8, height: 8, borderRadius: "50%",
                border: `1.5px solid ${colColor}`,
                backgroundColor: isPinned ? colColor : `${colColor}18`,
                display: "inline-block",
              }} />
              <div className="flex-1 min-w-0" style={{ fontSize: "11px", color: colColor, fontWeight: isPinned ? 600 : 400, opacity: isPinned ? 1 : 0.85, wordBreak: "break-word" }}>
                {node.label}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
                {node.sublabel && (
                  <span className="text-muted-foreground/40" style={{ fontSize: "8px" }}>
                    {node.sublabel}
                  </span>
                )}
                {panelKind && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground text-muted-foreground/50 cursor-pointer"
                    style={{ padding: "1px 2px" }}
                    onClick={(e) => { e.stopPropagation(); onOpenPanel({ kind: panelKind, value: node.key.split(":").slice(1).join(":") }); }}
                    title={`Open ${node.label} details`}
                  >
                    <PanelRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SankeySelectionPanel({
  pinnedPath,
  activeSet,
  nodes,
  activeColumns,
  startFrom,
  onClearAll,
  onClearCol,
  onPinNode,
  onOpenPanel,
}: {
  pinnedPath: string[];
  activeSet: Set<string> | null;
  nodes: SankeyNode[];
  activeColumns: ColumnDef[];
  startFrom: "dataType" | "dataDestination" | "identity";
  onClearAll: () => void;
  onClearCol: (colId: string) => void;
  onPinNode: (nodeId: string) => void;
  onOpenPanel: (item: SankeyPanelItem) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 m-3 ml-0 overflow-y-auto overflow-x-hidden"
      style={{ maxHeight: "calc(100vh - 80px)" }}
    >
      {activeColumns.map((col) => (
        <SankeyColPanel
          key={col.id}
          colId={col.id}
          pinnedPath={pinnedPath}
          activeSet={activeSet}
          nodes={nodes}
          activeColumns={activeColumns}
          startFrom={startFrom}
          onClearCol={() => onClearCol(col.id)}
          onPinNode={onPinNode}
          onOpenPanel={onOpenPanel}
        />
      ))}
    </div>
  );
}

// ── Inventory side panel (Data Stores, Destinations, Identities) ──────────────

function SankeyInventoryPanel({
  item,
  onClose,
}: {
  item: SankeyPanelItem | null;
  onClose: () => void;
}) {
  const [destTab, setDestTab] = useState<PanelTab>("overview");

  // Reset tab when item changes
  useEffect(() => { setDestTab("overview"); }, [item?.value]);

  if (!item) return null;

  // ── Identity ────────────────────────────────────────────────────────────
  if (item.kind === "identity") {
    const reg = IDENTITY_REGISTRY.find((i) => i.id === item.value);
    if (!reg) return null;
    const navId = reg.identityType;
    const config = getIdentityTableConfig(navId);
    const name   = reg.name;
    const row    = config.rows.find((r) => r.Name === name || r[config.columns[0]] === name);

    return (
      <SidePanel
        open
        onClose={onClose}
        title={name}
        subtitle={IDENTITY_TYPE_LABEL[navId] ?? navId}
        panelType="identity"
        width="min(840px, 90vw)"
      >
        {row ? <IdentityDetailPanel row={row} navId={navId} /> : (
          <div className="px-5 py-4 text-muted-foreground" style={{ fontSize: "13px" }}>
            No detail data available.
          </div>
        )}
      </SidePanel>
    );
  }

  // ── Destination: managed data store OR unmanaged destination ──────────
  if (item.kind === "destination") {
    // Check managed first
    const store = DATA_STORES.find((s) => s.name === item.value);
    if (store) {
      const seed = idSeed(store.id);
      let panelContent: React.ReactNode = null;

      if (store.platform === "google-drive" || store.platform === "sharepoint") {
        const totalFiles    = 4000 + (seed % 96000);
        const sampledFiles  = Math.round(totalFiles * (0.55 + (seed % 40) / 100));
        const sensitiveFiles = Math.round(sampledFiles * (0.08 + (seed % 60) / 400));
        panelContent = (
          <SaaSRowPanelContent row={{
            id: store.id, name: store.name,
            appInstance: store.platform === "google-drive" ? "acme-corp.google.com" : "acme.sharepoint.com",
            sensitiveFiles, sampledFiles, totalFiles,
            dataTypes: store.dataTypes,
            uploadSparkData:   generateSparkData(seed,       30, 1.5 * 1024 * 1024, 0.45),
            downloadSparkData: generateSparkData(seed + 100, 30, 2.2 * 1024 * 1024, 0.5),
          }} />
        );
      } else if (store.platform === "aws-s3" || store.platform === "azure-blob") {
        const totalFiles     = 8000 + (seed % 192000);
        const sensitiveFiles = Math.round(totalFiles * (0.04 + (seed % 40) / 500));
        panelContent = (
          <IaaSRowPanelContent row={{
            id: store.id, name: store.name, nameSubtitle: store.subtitle,
            instanceId: store.platform === "aws-s3" ? `arn:aws:s3:::${store.id}` : `${store.id}-container`,
            account: store.platform === "aws-s3" ? "acme-prod (123456789)" : "acme-prod (sub-0011)",
            org:     store.platform === "aws-s3" ? "us-east-1" : "East US",
            sensitiveFiles, totalFiles,
            dataTypes: store.dataTypes,
            uploadSparkData:   generateSparkData(seed,       30, 3 * 1024 * 1024, 0.5),
            downloadSparkData: generateSparkData(seed + 200, 30, 5 * 1024 * 1024, 0.5),
          }} storeType={store.platform} />
        );
      } else if (store.platform === "aws-rds" || store.platform === "azure-sql") {
        const totalFields     = 300 + (seed % 2700);
        const sensitiveFields = Math.round(totalFields * (0.05 + (seed % 60) / 500));
        panelContent = (
          <IaaSStructuredRowPanelContent row={{
            id: store.id, name: store.name, nameSubtitle: store.subtitle,
            instanceId: store.platform === "aws-rds" ? `db-${store.id.toUpperCase()}` : `${store.id}-sql`,
            account: store.platform === "aws-rds" ? "acme-prod (123456789)" : "acme-prod (sub-0011)",
            org:     store.platform === "aws-rds" ? "us-east-1" : "East US",
            sensitiveFields, totalFields,
            dataTypes: store.dataTypes,
            uploadSparkData:   generateSparkData(seed,       30, 256 * 1024, 0.35),
            downloadSparkData: generateSparkData(seed + 400, 30, 400 * 1024, 0.4),
          }} storeType={store.platform} />
        );
      } else {
        const totalFields     = 200 + (seed % 1800);
        const sensitiveFields = Math.round(totalFields * (0.06 + (seed % 50) / 400));
        panelContent = (
          <OnPremStructuredRowPanelContent row={{
            id: store.id, name: store.name, nameSubtitle: store.subtitle,
            sensitiveFields, totalFields,
            dataTypes: store.dataTypes,
            uploadSparkData:   generateSparkData(seed,       30, 512 * 1024, 0.4),
            downloadSparkData: generateSparkData(seed + 300, 30, 800 * 1024, 0.45),
          }} />
        );
      }

      return (
        <SidePanel
          open
          onClose={onClose}
          title={store.name}
          subtitle={store.subtitle}
          width="min(840px, 90vw)"
        >
          {panelContent}
        </SidePanel>
      );
    }

    // Fall through to unmanaged destination
    const dest = INVENTORY_UNMANAGED.find((d) => d.name === item.value);
    if (!dest) return null;
    const showStatus = dest.destinationType === "Application";

    return (
      <SidePanel
        open
        onClose={onClose}
        title={dest.name}
        subtitle={dest.category}
        panelType="app"
        width="min(840px, 90vw)"
      >
        <UnmanagedRowPanelContent
          row={dest}
          showStatus={showStatus}
          activeTab={destTab}
          onTabChange={setDestTab}
        />
      </SidePanel>
    );
  }

  // ── Data Store (managed destination via dataType column) ────────────────
  if (item.kind === "dataStore") {
    const store = DATA_STORES.find((s) => s.name === item.value);
    if (!store) return null;

    const seed = idSeed(store.id);
    let panelContent: React.ReactNode = null;

    if (store.platform === "google-drive" || store.platform === "sharepoint") {
      const totalFiles    = 4000 + (seed % 96000);
      const sampledFiles  = Math.round(totalFiles * (0.55 + (seed % 40) / 100));
      const sensitiveFiles = Math.round(sampledFiles * (0.08 + (seed % 60) / 400));
      panelContent = (
        <SaaSRowPanelContent row={{
          id: store.id, name: store.name,
          appInstance: store.platform === "google-drive" ? "acme-corp.google.com" : "acme.sharepoint.com",
          sensitiveFiles, sampledFiles, totalFiles,
          dataTypes: store.dataTypes,
          uploadSparkData:   generateSparkData(seed,       30, 1.5 * 1024 * 1024, 0.45),
          downloadSparkData: generateSparkData(seed + 100, 30, 2.2 * 1024 * 1024, 0.5),
        }} />
      );
    } else if (store.platform === "aws-s3" || store.platform === "azure-blob") {
      const totalFiles     = 8000 + (seed % 192000);
      const sensitiveFiles = Math.round(totalFiles * (0.04 + (seed % 40) / 500));
      panelContent = (
        <IaaSRowPanelContent row={{
          id: store.id, name: store.name, nameSubtitle: store.subtitle,
          instanceId: store.platform === "aws-s3" ? `arn:aws:s3:::${store.id}` : `${store.id}-container`,
          account: store.platform === "aws-s3" ? "acme-prod (123456789)" : "acme-prod (sub-0011)",
          org:     store.platform === "aws-s3" ? "us-east-1" : "East US",
          sensitiveFiles, totalFiles,
          dataTypes: store.dataTypes,
          uploadSparkData:   generateSparkData(seed,       30, 3 * 1024 * 1024, 0.5),
          downloadSparkData: generateSparkData(seed + 200, 30, 5 * 1024 * 1024, 0.5),
        }} storeType={store.platform} />
      );
    } else if (store.platform === "aws-rds" || store.platform === "azure-sql") {
      const totalFields     = 300 + (seed % 2700);
      const sensitiveFields = Math.round(totalFields * (0.05 + (seed % 60) / 500));
      panelContent = (
        <IaaSStructuredRowPanelContent row={{
          id: store.id, name: store.name, nameSubtitle: store.subtitle,
          instanceId: store.platform === "aws-rds" ? `db-${store.id.toUpperCase()}` : `${store.id}-sql`,
          account: store.platform === "aws-rds" ? "acme-prod (123456789)" : "acme-prod (sub-0011)",
          org:     store.platform === "aws-rds" ? "us-east-1" : "East US",
          sensitiveFields, totalFields,
          dataTypes: store.dataTypes,
          uploadSparkData:   generateSparkData(seed,       30, 256 * 1024, 0.35),
          downloadSparkData: generateSparkData(seed + 400, 30, 400 * 1024, 0.4),
        }} storeType={store.platform} />
      );
    } else {
      const totalFields     = 200 + (seed % 1800);
      const sensitiveFields = Math.round(totalFields * (0.06 + (seed % 50) / 400));
      panelContent = (
        <OnPremStructuredRowPanelContent row={{
          id: store.id, name: store.name, nameSubtitle: store.subtitle,
          sensitiveFields, totalFields,
          dataTypes: store.dataTypes,
          uploadSparkData:   generateSparkData(seed,       30, 512 * 1024, 0.4),
          downloadSparkData: generateSparkData(seed + 300, 30, 800 * 1024, 0.45),
        }} />
      );
    }

    return (
      <SidePanel
        open
        onClose={onClose}
        title={store.name}
        subtitle={store.subtitle}
        width="min(840px, 90vw)"
      >
        {panelContent}
      </SidePanel>
    );
  }

  return null;
}