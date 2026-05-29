import { useState, useMemo, useRef, useCallback } from "react";
import {
  GitBranch,
  Monitor,
  Cloud,
  ArrowRight,
  User,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  MoveVertical,
  Info,
  Settings,
  RefreshCw,
  Sparkles,
  Download,
  X,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ChevronDown,
} from "lucide-react";
import { SidePanel } from "./SidePanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineageNode {
  id: string;
  label: string;
  fullLabel: string;
  sublabel: string;
  type: "origin" | "destination";
  icon: "cloud" | "device";
  hasAlert: boolean;
  policyActions: number;
  alertCount: number;
  blockCount: number;
  userName?: string;
  deviceName?: string;
}

interface LineageEdge {
  id: string;
  from: string;
  to: string;
  action: string;
  blocked: boolean;
  timestamp: string;
  user: string;
}

interface LineageData {
  originNode: LineageNode;
  destinations: LineageNode[];
  edges: LineageEdge[];
  totalActivities: number;
  blockedCount: number;
  alertCount: number;
}

interface ActivityEvent {
  id: string;
  activity: string;
  timestamp: string;
  user: string;
  policyAction: string;
  policyName: string;
  blocked: boolean;
}

// ── Deterministic data generation ─────────────────────────────────────────────

const DEVICE_NAMES = [
  "DESKTOP-NSFB1U8",
  "DESKTOP-QP3K2V9",
  "LAPTOP-7XM4WD2",
  "MACBOOK-A3F1R9",
  "WORKSTATION-E5T2",
];

const USER_POOL = [
  "vli+qa01",
  "data-lineage-user",
  "john.smith",
  "sarah.chen",
  "admin",
  "etl-pipeline",
];

const USER_DOMAINS = [
  "netskope.com",
  "netskope.com",
  "acme.com",
  "acme.com",
  "acme.com",
  "acme.com",
];

const POLICY_NAMES = [
  "Alert policy for ericlei",
  "DLP - Sensitive Data Transfer",
  "Block external sharing",
  "Audit trail - high risk files",
  "PCI compliance policy",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function generateLineageData(
  fileName: string,
  filePath: string,
  store: string,
  storeSource: string,
): LineageData {
  const seed = hashStr(fileName + store);
  const originLabel =
    filePath.length > 22 ? filePath.slice(0, 20) + "..." : filePath;

  const destCount = 2 + (seed % 4);
  const destinations: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  const actions = ["Download", "Download", "Download", "Upload", "Share"];
  const timestamps = [
    "Dec 3 2025, 4:55 PM",
    "Dec 3 2025, 4:55 PM",
    "Dec 3 2025, 4:58 PM",
    "Dec 3 2025, 4:59 PM",
    "Dec 3 2025, 4:59 PM",
    "Dec 5 2025, 2:31 PM",
    "Dec 15 2025, 10:08 AM",
    "Dec 15 2025, 10:09 AM",
    "Dec 15 2025, 10:44 AM",
    "Dec 15 2025, 2:45 PM",
    "Mar 17 2026, 11:02 AM",
  ];

  let totalBlocked = 0;
  let totalAlerts = 0;

  for (let i = 0; i < destCount; i++) {
    const userIdx = (seed + i) % USER_POOL.length;
    const deviceIdx = (seed + i) % DEVICE_NAMES.length;
    const userName = USER_POOL[userIdx];
    const userDomain = USER_DOMAINS[userIdx];
    const device = DEVICE_NAMES[deviceIdx];

    // More edges per destination for richer timeline
    const edgeCount = 2 + ((seed + i) % 4);
    let nodeAlerts = 0;
    let nodeBlocks = 0;

    for (let j = 0; j < edgeCount; j++) {
      const actionIdx = (seed + i + j) % actions.length;
      const tsIdx = (seed + i + j) % timestamps.length;
      const blocked = (seed + i + j) % 3 === 0;
      if (blocked) {
        nodeBlocks++;
        totalBlocked++;
      } else {
        nodeAlerts++;
        totalAlerts++;
      }

      edges.push({
        id: `edge-${i}-${j}`,
        from: "origin",
        to: `dest-${i}`,
        action: actions[actionIdx],
        blocked,
        timestamp: timestamps[tsIdx],
        user: `${userName}@${userDomain}`,
      });
    }

    const hasAlert = nodeAlerts > 0 || nodeBlocks > 0;

    destinations.push({
      id: `dest-${i}`,
      label: `${filePath.length > 16 ? filePath.slice(0, 14) + "..." : filePath}`,
      fullLabel: filePath,
      sublabel: `${userName}'s Device`,
      type: "destination",
      icon: "device",
      hasAlert,
      policyActions: edgeCount,
      alertCount: nodeAlerts,
      blockCount: nodeBlocks,
      userName: `${userName}@${userDomain}`,
      deviceName: device,
    });
  }

  const totalPolicyActions = edges.length;
  const originNode: LineageNode = {
    id: "origin",
    label: originLabel,
    fullLabel: filePath,
    sublabel: storeSource,
    type: "origin",
    icon: "cloud",
    hasAlert: totalPolicyActions > 0,
    policyActions: totalPolicyActions,
    alertCount: totalAlerts,
    blockCount: totalBlocked,
  };

  return {
    originNode,
    destinations,
    edges,
    totalActivities: totalPolicyActions,
    blockedCount: totalBlocked,
    alertCount: totalAlerts,
  };
}

function generateNodeActivities(
  node: LineageNode,
  edges: LineageEdge[],
  fileName: string,
): ActivityEvent[] {
  const seed = hashStr(node.id + fileName);
  const nodeEdges = edges.filter(
    (e) => e.from === node.id || e.to === node.id,
  );
  return nodeEdges.map((edge, i) => {
    const policyIdx = (seed + i) % POLICY_NAMES.length;
    return {
      id: `act-${node.id}-${i}`,
      activity: edge.action,
      timestamp: edge.timestamp,
      user: edge.user,
      policyAction: edge.blocked ? "Blocked" : "Alerted",
      policyName: POLICY_NAMES[policyIdx],
      blocked: edge.blocked,
    };
  });
}

// ── Node Hover Tooltip (HTML overlay) ─────────────────────────────────────────

function NodeTooltip({
  node,
  storeSource,
  anchorRect,
  containerRect,
}: {
  node: LineageNode;
  storeSource: string;
  anchorRect: { x: number; y: number; w: number; h: number };
  containerRect: DOMRect | null;
}) {
  if (!containerRect) return null;
  const isOrigin = node.type === "origin";
  const tooltipW = 230;
  let left = anchorRect.x + anchorRect.w / 2 - tooltipW / 2;
  let placeBelow = false;
  const top = anchorRect.y - 8;
  if (left < 4) left = 4;
  if (left + tooltipW > containerRect.width - 4) left = containerRect.width - tooltipW - 4;
  if (top < 100) placeBelow = true;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left,
        top: placeBelow ? anchorRect.y + anchorRect.h + 8 : undefined,
        bottom: placeBelow ? undefined : containerRect.height - top,
        width: tooltipW,
      }}
    >
      <div className="bg-[#f8f9fa] rounded-lg shadow-xl border border-gray-200 px-3.5 py-3" style={{ color: "#1a1a1a" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{node.fullLabel}</span>
          {node.hasAlert && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "#f97316" }} />}
        </div>
        <div className="flex items-center gap-1.5 mb-0.5">
          {isOrigin ? (
            <><Cloud size={13} color="#4285f4" /><span style={{ fontSize: "12px", color: "#444" }}>{storeSource}</span></>
          ) : (
            <><Monitor size={13} color="#555" /><span style={{ fontSize: "12px", color: "#444" }}>{node.sublabel}</span></>
          )}
        </div>
        {!isOrigin && node.deviceName && (
          <div style={{ fontSize: "11px", color: "#888", marginLeft: 20, marginBottom: 4 }}>{node.deviceName}</div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: 20, height: 20, background: "#f97316", color: "white", fontSize: "10px", fontWeight: 700 }}>
            {node.policyActions}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}>Policy Actions</span>
        </div>
        <div className="flex items-center gap-4 mt-1 ml-7">
          {node.alertCount > 0 && <span style={{ fontSize: "11px", color: "#666" }}>Alert: {node.alertCount}</span>}
          {node.blockCount > 0 && <span style={{ fontSize: "11px", color: "#666" }}>Block: {node.blockCount}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Shared SVG Node ──────────────────────────────────────────────────────────

function SvgLineageNode({
  x, y, node, isOrigin, isHovered, isSelected, w, h, onHover, onLeave, onClick,
}: {
  x: number; y: number; node: LineageNode; isOrigin: boolean;
  isHovered: boolean; isSelected?: boolean; w: number; h: number;
  onHover: () => void; onLeave: () => void; onClick?: () => void;
}) {
  const rx = x - w / 2;
  const ry = y - h / 2;
  const hasClick = !!onClick;

  return (
    <g
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: hasClick ? "pointer" : "default" }}
    >
      <rect
        x={rx} y={ry} width={w} height={h} rx={6}
        fill={isSelected ? "rgba(96,165,250,0.15)" : isHovered ? "rgba(96,165,250,0.08)" : "var(--surface-raised, #1e293b)"}
        stroke={isSelected ? "rgba(96,165,250,0.6)" : isHovered ? "rgba(96,165,250,0.4)" : "var(--border, #334155)"}
        strokeWidth={isSelected ? 1.5 : 1}
      />
      {/* Play button left */}
      {hasClick && (
        <>
          <circle cx={rx - 4} cy={ry + h / 2} r={6} fill="rgba(96,165,250,0.15)" stroke="rgba(96,165,250,0.3)" strokeWidth={0.5} />
          <polygon points={`${rx - 6},${ry + h / 2 - 3} ${rx - 6},${ry + h / 2 + 3} ${rx - 2},${ry + h / 2}`} fill="#60a5fa" />
        </>
      )}
      {isOrigin ? (
        <foreignObject x={rx + 7} y={ry + (h - 14) / 2} width={14} height={14}><Cloud size={13} color="#60a5fa" /></foreignObject>
      ) : (
        <foreignObject x={rx + 7} y={ry + (h - 14) / 2} width={14} height={14}><Monitor size={13} color="#94a3b8" /></foreignObject>
      )}
      <text x={rx + 24} y={ry + h * 0.35} fill="var(--text-bright, #f1f5f9)" fontSize={9} fontWeight={500} fontFamily="Inter, sans-serif">{node.label}</text>
      <text x={rx + 24} y={ry + h * 0.7} fill="var(--muted-foreground, #64748b)" fontSize={8} fontFamily="Inter, sans-serif">{node.sublabel}</text>
      {node.hasAlert && <circle cx={rx + w - 8} cy={ry + 10} r={3.5} fill="#f97316" />}
      {/* Connection dot right */}
      {isOrigin && <circle cx={rx + w + 2} cy={ry + h / 2} r={3.5} fill="rgba(96,165,250,0.4)" stroke="rgba(96,165,250,0.7)" strokeWidth={0.5} />}
    </g>
  );
}

// ── Shared graph rendering logic ─────────────────────────────────────────────

function renderGraphEdges(
  visibleDests: LineageNode[],
  data: LineageData,
  originX: number, originY: number, destX: number,
  topPad: number, rowH: number,
  hoveredNode: string | null,
  selectedNodeId: string | null,
) {
  return visibleDests.map((dest, i) => {
    const destY = topPad + i * rowH + rowH / 2;
    const nodeW_origin = 130;
    const nodeW_dest = 118;
    const startX = originX + nodeW_origin / 2 + 3;
    const endX = destX - nodeW_dest / 2;
    const midX = (startX + endX) / 2;
    const path = `M ${startX} ${originY} C ${midX} ${originY}, ${midX} ${destY}, ${endX} ${destY}`;
    const edgesForDest = data.edges.filter((e) => e.to === dest.id);
    const hasBlocked = edgesForDest.some((e) => e.blocked);
    const isHL = hoveredNode === dest.id || hoveredNode === "origin" || selectedNodeId === dest.id;

    return (
      <g key={dest.id}>
        <path d={path} fill="none"
          stroke={hasBlocked ? (isHL ? "rgba(249,115,22,0.5)" : "rgba(249,115,22,0.2)") : (isHL ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.15)")}
          strokeWidth={isHL ? 1.5 : 1} strokeDasharray={hasBlocked ? "4 3" : undefined}
        />
        <rect x={midX - 24} y={(originY + destY) / 2 - 7} width={48} height={14} rx={3}
          fill="var(--background, #0f172a)" stroke={hasBlocked ? "rgba(249,115,22,0.25)" : "rgba(96,165,250,0.15)"} strokeWidth={0.5}
        />
        <text x={midX} y={(originY + destY) / 2 + 3} textAnchor="middle"
          fill={hasBlocked ? "#f97316" : "#60a5fa"} fontSize={7.5} fontWeight={500} fontFamily="Inter, sans-serif"
        >{edgesForDest[0]?.action ?? "Download"}</text>
        <polygon
          points={`${endX - 1},${destY} ${endX - 5},${destY - 3} ${endX - 5},${destY + 3}`}
          fill={hasBlocked ? "rgba(249,115,22,0.4)" : "rgba(96,165,250,0.35)"}
        />
      </g>
    );
  });
}

// ── Mini Lineage Graph (hover-only, for file panel) ──────────────────────────

function MiniLineageGraph({ data, storeSource }: { data: LineageData; storeSource: string }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleDests = data.destinations.slice(0, 4);
  const moreCount = data.destinations.length - visibleDests.length;
  const svgW = 340;
  const originX = 70;
  const destX = 270;
  const topPad = 24;
  const rowH = visibleDests.length <= 2 ? 48 : 42;
  const svgH = Math.max(topPad + visibleDests.length * rowH + (moreCount > 0 ? 20 : 8), 100);
  const originY = svgH / 2;

  const getNodeRect = (x: number, y: number, isOrigin: boolean) => {
    if (!containerRef.current) return { x: 0, y: 0, w: 0, h: 0 };
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return { x: 0, y: 0, w: 0, h: 0 };
    const svgRect = svg.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    const scale = svgRect.width / svgW;
    const w = (isOrigin ? 130 : 118) * scale;
    const h = 36 * scale;
    return { x: svgRect.left - cRect.left + (x - (isOrigin ? 65 : 59)) * scale, y: svgRect.top - cRect.top + (y - 18) * scale, w, h };
  };

  const hoveredNodeObj = hoveredNode === "origin" ? data.originNode : data.destinations.find((d) => d.id === hoveredNode) ?? null;
  const hoveredRect = hoveredNode
    ? hoveredNode === "origin"
      ? getNodeRect(originX, originY, true)
      : (() => { const idx = visibleDests.findIndex((d) => d.id === hoveredNode); return idx < 0 ? null : getNodeRect(destX, topPad + idx * rowH + rowH / 2, false); })()
    : null;

  return (
    <div ref={containerRef} className="relative">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="block" style={{ maxHeight: 200 }}>
        {renderGraphEdges(visibleDests, data, originX, originY, destX, topPad, rowH, hoveredNode, null)}
        <SvgLineageNode x={originX} y={originY} node={data.originNode} isOrigin w={130} h={36}
          isHovered={hoveredNode === "origin"} onHover={() => setHoveredNode("origin")} onLeave={() => setHoveredNode(null)} />
        {visibleDests.map((dest, i) => (
          <SvgLineageNode key={dest.id} x={destX} y={topPad + i * rowH + rowH / 2} node={dest} isOrigin={false} w={118} h={36}
            isHovered={hoveredNode === dest.id} onHover={() => setHoveredNode(dest.id)} onLeave={() => setHoveredNode(null)} />
        ))}
        {moreCount > 0 && (
          <text x={destX} y={svgH - 6} textAnchor="middle" fill="var(--muted-foreground, #64748b)" fontSize={8.5} fontFamily="Inter, sans-serif">+{moreCount} more</text>
        )}
      </svg>
      {hoveredNodeObj && hoveredRect && (
        <NodeTooltip node={hoveredNodeObj} storeSource={storeSource} anchorRect={hoveredRect} containerRect={containerRef.current?.getBoundingClientRect() ?? null} />
      )}
    </div>
  );
}

// ── Full-size interactive graph (for detail panel) ───────────────────────────

function FullLineageGraph({
  data, storeSource, selectedNodeId, onNodeClick, zoom,
}: {
  data: LineageData; storeSource: string; selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void; zoom: number;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleDests = data.destinations.slice(0, 5);
  const moreCount = data.destinations.length - visibleDests.length;
  const svgW = 380;
  const originX = 80;
  const destX = 300;
  const topPad = 28;
  const rowH = 52;
  const svgH = Math.max(topPad + visibleDests.length * rowH + (moreCount > 0 ? 28 : 10), 180);
  const originY = svgH / 2;
  const nodeW = 140;
  const nodeH = 40;

  const getNodeRect = (x: number, y: number, isO: boolean) => {
    if (!containerRef.current) return { x: 0, y: 0, w: 0, h: 0 };
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return { x: 0, y: 0, w: 0, h: 0 };
    const svgRect = svg.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    const scale = svgRect.width / svgW * (zoom / 100);
    const w = nodeW * scale;
    const h = nodeH * scale;
    const offsetX = (svgRect.width - svgRect.width * (zoom / 100)) / 2;
    return {
      x: svgRect.left - cRect.left + (x - nodeW / 2) * (svgRect.width / svgW) * (zoom / 100) + offsetX,
      y: svgRect.top - cRect.top + (y - nodeH / 2) * (svgRect.height / svgH) * (zoom / 100),
      w, h,
    };
  };

  const hoveredNodeObj = hoveredNode === "origin" ? data.originNode : data.destinations.find((d) => d.id === hoveredNode) ?? null;
  const hoveredRect = hoveredNode
    ? hoveredNode === "origin"
      ? getNodeRect(originX, originY, true)
      : (() => { const idx = visibleDests.findIndex((d) => d.id === hoveredNode); return idx < 0 ? null : getNodeRect(destX, topPad + idx * rowH + rowH / 2, false); })()
    : null;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}>
        {/* Edges */}
        {visibleDests.map((dest, i) => {
          const destY = topPad + i * rowH + rowH / 2;
          const startX = originX + nodeW / 2 + 3;
          const endX = destX - nodeW / 2;
          const midX = (startX + endX) / 2;
          const path = `M ${startX} ${originY} C ${midX} ${originY}, ${midX} ${destY}, ${endX} ${destY}`;
          const edgesForDest = data.edges.filter((e) => e.to === dest.id);
          const hasBlocked = edgesForDest.some((e) => e.blocked);
          const isHL = hoveredNode === dest.id || hoveredNode === "origin" || selectedNodeId === dest.id;
          return (
            <g key={dest.id}>
              <path d={path} fill="none"
                stroke={hasBlocked ? (isHL ? "rgba(249,115,22,0.5)" : "rgba(249,115,22,0.2)") : (isHL ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.15)")}
                strokeWidth={isHL ? 1.5 : 1} strokeDasharray={hasBlocked ? "4 3" : undefined} />
              <rect x={midX - 28} y={(originY + destY) / 2 - 8} width={56} height={16} rx={3.5}
                fill="var(--background, #0f172a)" stroke={hasBlocked ? "rgba(249,115,22,0.25)" : "rgba(96,165,250,0.15)"} strokeWidth={0.5} />
              <text x={midX} y={(originY + destY) / 2 + 3} textAnchor="middle"
                fill={hasBlocked ? "#f97316" : "#60a5fa"} fontSize={8.5} fontWeight={500} fontFamily="Inter, sans-serif">
                {edgesForDest[0]?.action ?? "Download"}
              </text>
              <polygon points={`${endX - 1},${destY} ${endX - 5},${destY - 3} ${endX - 5},${destY + 3}`}
                fill={hasBlocked ? "rgba(249,115,22,0.4)" : "rgba(96,165,250,0.35)"} />
            </g>
          );
        })}
        <SvgLineageNode x={originX} y={originY} node={data.originNode} isOrigin w={nodeW} h={nodeH}
          isHovered={hoveredNode === "origin"} isSelected={selectedNodeId === "origin"}
          onHover={() => setHoveredNode("origin")} onLeave={() => setHoveredNode(null)} onClick={() => onNodeClick("origin")} />
        {visibleDests.map((dest, i) => (
          <SvgLineageNode key={dest.id} x={destX} y={topPad + i * rowH + rowH / 2} node={dest} isOrigin={false} w={nodeW} h={nodeH}
            isHovered={hoveredNode === dest.id} isSelected={selectedNodeId === dest.id}
            onHover={() => setHoveredNode(dest.id)} onLeave={() => setHoveredNode(null)} onClick={() => onNodeClick(dest.id)} />
        ))}
        {moreCount > 0 && (
          <>
            <line x1={destX} y1={topPad + visibleDests.length * rowH} x2={destX} y2={topPad + visibleDests.length * rowH + 10} stroke="var(--border, #334155)" strokeWidth={1} />
            <rect x={destX - 32} y={svgH - 22} width={64} height={18} rx={4} fill="var(--surface-raised, #1e293b)" stroke="var(--border, #334155)" strokeWidth={0.5} />
            <text x={destX} y={svgH - 10} textAnchor="middle" fill="var(--muted-foreground, #64748b)" fontSize={9} fontFamily="Inter, sans-serif">{moreCount} more</text>
          </>
        )}
      </svg>
      {hoveredNodeObj && hoveredRect && (
        <NodeTooltip node={hoveredNodeObj} storeSource={storeSource} anchorRect={hoveredRect} containerRect={containerRef.current?.getBoundingClientRect() ?? null} />
      )}
    </div>
  );
}

// ── Zoom Controls ────────────────────────────────────────────────────────────

function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: {
  zoom: number; onZoomIn: () => void; onZoomOut: () => void; onReset: () => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 bg-surface-raised border border-border rounded-lg p-1.5 z-10" style={{ backdropFilter: "blur(8px)" }}>
      <div className="text-muted-foreground mb-1 text-center" style={{ fontSize: "10px" }}>Zoom: {zoom}%</div>
      <div className="grid grid-cols-2 gap-1">
        {[
          { icon: ZoomIn, action: onZoomIn, title: "Zoom In" },
          { icon: ZoomOut, action: onZoomOut, title: "Zoom Out" },
          { icon: Maximize2, action: onReset, title: "Reset" },
          { icon: Minimize2, action: () => {}, title: "Fit" },
          { icon: MoveHorizontal, action: () => {}, title: "Fit H" },
          { icon: MoveVertical, action: () => {}, title: "Fit V" },
        ].map(({ icon: Icon, action, title }) => (
          <button key={title} onClick={action} className="w-8 h-8 rounded flex items-center justify-center border border-border hover:bg-primary/10 transition-colors cursor-pointer" title={title}>
            <Icon size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── File Version Details Right Panel ─────────────────────────────────────────

function FileVersionDetailsPanel({
  activity, fileName, filePath, fileSize, onClose,
}: {
  activity: ActivityEvent | null; fileName: string; filePath: string; fileSize: string; onClose: () => void;
}) {
  const md5Seed = hashStr(fileName);
  const md5Chars = "0123456789abcdef";
  let md5 = "";
  for (let i = 0; i < 32; i++) md5 += md5Chars[(md5Seed + i * 7) % 16];
  if (!activity) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>File Version Details</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Activity Details */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <GitBranch size={12} className="text-muted-foreground" />
            <span style={{ fontSize: "11px", fontWeight: 600 }} className="text-text-bright">Activity Details</span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <div className="space-y-2.5 ml-0.5">
            <div>
              <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Activity:</div>
              <div className="text-text-bright flex items-center gap-1" style={{ fontSize: "11px", fontWeight: 500 }}>
                <Download size={11} /> {activity.activity}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Timestamp:</div>
              <div className="text-text-bright" style={{ fontSize: "11px", fontWeight: 500 }}>{activity.timestamp}</div>
            </div>
            <div>
              <div className="text-muted-foreground" style={{ fontSize: "10px" }}>User:</div>
              <div className="text-text-bright" style={{ fontSize: "11px", fontWeight: 500 }}>{activity.user}</div>
            </div>
            <div>
              <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Policy Action:</div>
              <div className="text-text-bright" style={{ fontSize: "11px", fontWeight: 500 }}>{activity.policyAction}</div>
            </div>
            <div>
              <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Policy Name:</div>
              <div className="text-text-bright" style={{ fontSize: "11px", fontWeight: 500 }}>{activity.policyName}</div>
            </div>
          </div>
        </div>

        {/* Compared To */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-text-bright" style={{ fontSize: "11px", fontWeight: 600 }}>Compared To</span>
            <Info size={10} className="text-muted-foreground" />
          </div>
          <div className="relative">
            <select className="w-full appearance-none bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-text-bright pr-7 cursor-pointer" style={{ fontSize: "11px" }} defaultValue="">
              <option value="">Select</option>
              <option value="prev">Previous Version</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* File Details */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 mb-2.5">
            <FileText size={12} className="text-muted-foreground" />
            <span style={{ fontSize: "11px", fontWeight: 600 }} className="text-text-bright">File Details</span>
          </div>
          <div className="space-y-2.5 ml-0.5">
            {([
              ["File Name:", filePath],
              ["File Size:", fileSize],
              ["DLP Profile:", "Detect Top Secret"],
              ["Incident ID:", `${3070664041810615624 + md5Seed}`],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <div className="text-muted-foreground" style={{ fontSize: "10px" }}>{label}</div>
                <div className="text-text-bright break-all" style={{
                  fontSize: "11px", fontWeight: 500,
                  ...(label === "Incident ID:" ? { textDecoration: "underline", cursor: "pointer" } : {}),
                }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Summary Overlay ───────────────────────────────────────────────────────

function AISummaryOverlay({ filePath, storeSource, onClose }: {
  filePath: string; storeSource: string; onClose: () => void;
}) {
  return (
    <div className="absolute top-14 right-4 z-50 w-80 bg-surface-raised border border-border rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-400" />
          <span className="text-text-bright" style={{ fontSize: "13px", fontWeight: 600 }}>AI Summary</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"><X size={14} /></button>
      </div>
      <div className="px-4 py-3">
        <div className="text-text-bright mb-2" style={{ fontSize: "13px", fontWeight: 600 }}>Data Context and File Origin</div>
        <div className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.6 }}>
          A file download pattern from <span className="text-text-bright" style={{ fontWeight: 600 }}>{storeSource}</span> to{" "}
          <span className="text-text-bright" style={{ fontWeight: 600 }}>Win11_VM</span> (NotConfigured) by user{" "}
          <span className="text-text-bright" style={{ fontWeight: 600 }}>data-lineage@netskope.com</span>{" "}
          triggered multiple DLP alerts and blocks. The file was repeatedly downloaded through the{" "}
          <span className="text-text-bright" style={{ fontWeight: 600 }}>{storeSource}</span> client, matching the{" "}
          &ldquo;<span className="text-text-bright" style={{ fontWeight: 600 }}>Detect Top Secret</span>&rdquo; profile,
          suggesting potential data exfiltration attempts. Multiple blocked attempts followed by successful downloads
          of the same file indicate persistence in accessing sensitive data. Additional users{" "}
          <span className="text-text-bright" style={{ fontWeight: 600 }}>data-lineage-userD@netskope.com</span> and{" "}
          <span className="text-text-bright" style={{ fontWeight: 600 }}>vli+qa01@netskope.com</span> also accessed the file from multiple devices.
        </div>
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
          <button className="text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"><Copy size={13} /></button>
          <button className="text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"><ThumbsUp size={13} /></button>
          <button className="text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"><ThumbsDown size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Lineage Detail Side Panel Content (3-column layout) ──────────────────────

function LineageDetailPanelContent({
  data, fileName, filePath, fileSize, storeSource,
}: {
  data: LineageData; fileName: string; filePath: string; fileSize: string; storeSource: string;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [zoom, setZoom] = useState(88);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "origin" | "selected">("all");
  const [expandAll, setExpandAll] = useState(true);

  const allNodes = useMemo(() => [data.originNode, ...data.destinations], [data]);

  // Generate all activities
  const allActivities = useMemo(() => {
    const result: (ActivityEvent & { nodeId: string; nodeType: string })[] = [];
    const originActs = generateNodeActivities(data.originNode, data.edges, fileName);
    originActs.forEach((a) => result.push({ ...a, nodeId: "origin", nodeType: "origin" }));
    data.destinations.forEach((dest) => {
      const destActs = generateNodeActivities(dest, data.edges, fileName);
      destActs.forEach((a) => result.push({ ...a, nodeId: dest.id, nodeType: "destination" }));
    });
    return result;
  }, [data, fileName]);

  const filteredActivities = useMemo(() => {
    if (timelineFilter === "origin") return allActivities.filter((a) => a.nodeType === "origin");
    if (timelineFilter === "selected" && selectedNodeId)
      return allActivities.filter((a) => a.nodeId === selectedNodeId);
    return allActivities;
  }, [allActivities, timelineFilter, selectedNodeId]);

  const selectedActivity = allActivities.find((a) => a.id === selectedActivityId) ?? null;
  const selectedNode = allNodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setTimelineFilter("selected");
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Top toolbar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground mb-1.5" style={{ fontSize: "12px" }}>
          <span>Viewing the lineage graph and timeline for</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-border">
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Origin File:</span>
            <span className="text-text-bright" style={{ fontSize: "11px", fontWeight: 600 }}>{filePath}</span>
          </span>
          <ArrowRight size={11} className="text-muted-foreground/50" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-border">
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Selected File:</span>
              <span className="text-text-bright" style={{ fontSize: "11px", fontWeight: 600 }}>{filePath}</span>
            </span>
            <button className="text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"><RefreshCw size={12} /></button>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-text-bright transition-colors cursor-pointer" style={{ fontSize: "11px" }}>
              <Info size={12} /> Instructions
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-text-bright transition-colors cursor-pointer" style={{ fontSize: "11px" }}>
              <Settings size={12} /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* 3-column content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT: Graph */}
        <div className="flex-none border-r border-border relative" style={{ width: showFileDetails ? "35%" : "40%" }}>
          <FullLineageGraph
            data={data} storeSource={storeSource} selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick} zoom={zoom}
          />
          <ZoomControls zoom={zoom}
            onZoomIn={() => setZoom((z) => Math.min(200, z + 15))}
            onZoomOut={() => setZoom((z) => Math.max(30, z - 15))}
            onReset={() => setZoom(88)}
          />
        </div>

        {/* MIDDLE: Timeline */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${showFileDetails ? "border-r border-border" : ""}`}>
          <div className="flex-1 overflow-y-auto">
            {/* Origin file header */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(96,165,250,0.15)" }}>
                  <Cloud size={13} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-text-bright truncate" style={{ fontSize: "13px", fontWeight: 600 }}>{filePath}</span>
                    <span className="text-blue-400 shrink-0" style={{ fontSize: "10px", fontWeight: 600 }}>Origin File</span>
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: "11px" }}>{storeSource}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground ml-9" style={{ fontSize: "10px" }}>
                <span>Dec 3 2025, 4:55 PM</span>
                <span className="flex items-center gap-1"><User size={9} /> data-lineage@netskope.com</span>
              </div>
            </div>

            {/* Selected destination header */}
            {selectedNode && selectedNode.type === "destination" && (
              <div className="px-4 py-2 border-t border-border/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(148,163,184,0.15)" }}>
                    <Monitor size={13} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-bright truncate" style={{ fontSize: "13px", fontWeight: 600 }}>{filePath}</span>
                      <span className="text-blue-400 shrink-0" style={{ fontSize: "10px", fontWeight: 600 }}>Selected File</span>
                    </div>
                    <div className="text-muted-foreground" style={{ fontSize: "11px" }}>{selectedNode.sublabel}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground ml-9" style={{ fontSize: "10px" }}>
                  <span>Mar 17 2026, 11:02 AM</span>
                  <span className="flex items-center gap-1"><User size={9} /> {selectedNode.userName}</span>
                </div>
              </div>
            )}

            {/* Activity timeline */}
            <div className="relative px-2">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              {filteredActivities.map((act) => {
                const isActive = selectedActivityId === act.id;
                return (
                  <button
                    key={act.id}
                    onClick={() => { setSelectedActivityId(act.id); setShowFileDetails(true); }}
                    className={`w-full text-left pl-8 pr-3 py-2.5 relative transition-colors cursor-pointer rounded-r-lg ${
                      isActive ? "bg-primary/5" : "hover:bg-surface-raised/60"
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-3 top-4 w-3.5 h-3.5 rounded-full border-2"
                      style={{
                        borderColor: act.blocked ? "#f97316" : "#60a5fa",
                        background: isActive ? (act.blocked ? "#f97316" : "#60a5fa") : "var(--background, #0f172a)",
                      }}
                    />
                    <div>
                      <span style={{
                        fontSize: "12px", fontWeight: 500,
                        color: act.blocked ? "#f97316" : "var(--text-bright, #f1f5f9)",
                      }}>
                        [{act.policyAction}] {act.activity}ed
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground mt-0.5" style={{ fontSize: "10px" }}>
                      <span>{act.timestamp}</span>
                      <span className="flex items-center gap-1 truncate">
                        <User size={9} />
                        {act.user.length > 24 ? act.user.slice(0, 22) + "..." : act.user}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* End marker */}
              {filteredActivities.length > 0 && (
                <div className="pl-8 py-2 relative">
                  <div className="absolute left-3.5 top-3 w-2.5 h-2.5 rounded-full" style={{ background: "var(--border, #334155)" }} />
                  <span className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                    {filteredActivities[filteredActivities.length - 1]?.activity}ed
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: File Version Details */}
        {showFileDetails && selectedActivity && (
          <div className="flex-none" style={{ width: "28%" }}>
            <FileVersionDetailsPanel
              activity={selectedActivity} fileName={fileName} filePath={filePath} fileSize={fileSize}
              onClose={() => { setShowFileDetails(false); setSelectedActivityId(null); }}
            />
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 flex items-center justify-center gap-1 px-4 py-2 border-t border-border">
        {(["all", "origin", "selected"] as const).map((filter) => {
          const label = filter === "all" ? "All Events" : filter === "origin" ? "Origin File" : "Selected File";
          const isActive = timelineFilter === filter;
          return (
            <button key={filter} onClick={() => setTimelineFilter(filter)}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                isActive ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-text-bright border border-transparent"
              }`} style={{ fontSize: "11px", fontWeight: isActive ? 600 : 400 }}>
              {label}
            </button>
          );
        })}
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => setExpandAll(true)}
          className={`px-3 py-1 rounded transition-colors cursor-pointer ${expandAll ? "text-text-bright border border-border" : "text-muted-foreground border border-transparent hover:text-text-bright"}`}
          style={{ fontSize: "11px", fontWeight: expandAll ? 600 : 400 }}>Expand All</button>
        <button onClick={() => setExpandAll(false)}
          className={`px-3 py-1 rounded transition-colors cursor-pointer ${!expandAll ? "text-text-bright border border-border" : "text-muted-foreground border border-transparent hover:text-text-bright"}`}
          style={{ fontSize: "11px", fontWeight: !expandAll ? 600 : 400 }}>Collapse All</button>
      </div>

      {/* Summarize floating button */}
      <button onClick={() => setShowAISummary((v) => !v)}
        className="absolute top-14 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-raised hover:bg-primary/10 transition-colors cursor-pointer"
        style={{ fontSize: "11px", fontWeight: 500 }}>
        <Sparkles size={13} className="text-blue-400" />
        <span className="text-text-bright">Summarize</span>
      </button>

      {showAISummary && <AISummaryOverlay filePath={filePath} storeSource={storeSource} onClose={() => setShowAISummary(false)} />}
    </div>
  );
}

// ── Main Export: DataLineageSection ──────────────────────────────────────────

export function DataLineageSection({
  fileName, filePath, store, storeSource, fileSize,
}: {
  fileName: string; filePath: string; store: string; storeSource: string; fileSize: string;
}) {
  const [lineagePanelOpen, setLineagePanelOpen] = useState(false);

  const lineageData = useMemo(
    () => generateLineageData(fileName, filePath, store, storeSource),
    [fileName, filePath, store, storeSource],
  );

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
          <GitBranch size={11} />
          Data Lineage
        </div>
      </div>

      {/* Origin file description line */}
      <div className="flex items-center gap-2 flex-wrap text-muted-foreground mb-2" style={{ fontSize: "11px" }}>
        <span>Viewing the lineage graph and timeline for</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-border">
          <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Origin File:</span>
          <span className="text-text-bright" style={{ fontSize: "10px", fontWeight: 600 }}>{filePath}</span>
        </span>
        <ArrowRight size={11} className="text-muted-foreground/50" />
      </div>

      {/* Mini graph (hover-only, non-interactive) */}
      <div className="bg-surface-raised border border-border rounded-lg p-2 relative overflow-visible">
        <MiniLineageGraph data={lineageData} storeSource={storeSource} />
      </div>

      {/* View full file lineage CTA */}
      <div className="mt-3">
        <button type="button" onClick={() => setLineagePanelOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          style={{ fontSize: "12px", fontWeight: 600 }}>
          View full file lineage
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Full Lineage Side Panel */}
      <SidePanel
        open={lineagePanelOpen}
        onClose={() => setLineagePanelOpen(false)}
        title="Data Lineage Graph"
        subtitle={fileName}
        headerExtra={
          <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Graph</div>
        }
        width="min(1100px, 95vw)"
        zIndex={70}
      >
        <LineageDetailPanelContent
          data={lineageData} fileName={fileName} filePath={filePath} fileSize={fileSize} storeSource={storeSource}
        />
      </SidePanel>
    </div>
  );
}