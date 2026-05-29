import LightBgGDrive from "../../../imports/LightBgGDrive";
import LightBgSharePoint from "../../../imports/LightBgSharePoint";
import awsSvgPaths from "../../../imports/svg-nw553jfgsu";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  HardDrive,
  Cloud,
  Monitor,
  Database,
  Server,
  FileText,
} from "lucide-react";
import { InfoTooltip } from "../ui/tooltip";

// AWS icon sized to match nav icons, dark-nav–friendly colours
function AwsNavIcon() {
  return (
    <svg width="14" height="9" viewBox="0 0 109.733 65.6319" fill="none" style={{ display: "block", flexShrink: 0 }}>
      <g transform="translate(0,65.6319) scale(1,-1)">
        <path d={awsSvgPaths.p188c35f0} fill="currentColor" />
        <path d={awsSvgPaths.p3f867800} fill="currentColor" />
        <path d={awsSvgPaths.pce5e7c0}  fill="currentColor" />
        <path d={awsSvgPaths.p1c80000}  fill="#FF9900" />
        <path d={awsSvgPaths.p4d2900}   fill="#FF9900" />
      </g>
    </svg>
  );
}

interface NavItem {
  id: string;
  label: string;
  groupLabel?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: { label: string; color: string };
  children?: NavItem[];
}

interface NavSection {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: "data-stores",
    label: "Data Store/Destination",
    children: [
      {
        id: "managed-group",
        label: "Managed Data Store",
        groupLabel: true,
        tooltip: "Managed by IT and connected to Netskope SPM or CASB API.\nIncludes inline result if available.",
        children: [
          {
            id: "google-drive",
            label: "Google Drive",
            icon: <div style={{ width: 13, height: 13 }}><LightBgGDrive /></div>,
            count: 4,
            children: [
              { id: "drives", label: "Drives" },
            ],
          },
          {
            id: "sharepoint",
            label: "SharePoint",
            icon: <div style={{ width: 13, height: 13 }}><LightBgSharePoint /></div>,
            count: 3,
            children: [
              { id: "sharepoint-sites", label: "Sites" },
            ],
          },
          {
            id: "aws",
            label: "AWS",
            icon: <AwsNavIcon />,
            count: 7,
            children: [
              { id: "s3", label: "S3" },
              { id: "rds", label: "RDS" },
            ],
          },
          {
            id: "azure",
            label: "Azure",
            icon: <Cloud size={13} />,
            count: 6,
            children: [
              { id: "azure-blob", label: "Blob Storage" },
              { id: "azure-sql", label: "SQL Database" },
            ],
          },
          {
            id: "on-prem",
            label: "On-Prem",
            icon: <Server size={13} />,
            count: 7,
            children: [
              { id: "postgresql", label: "PostgreSQL" },
              { id: "oracle", label: "Oracle" },
            ],
          },
          {
            id: "endpoint",
            label: "Endpoint",
            icon: <Monitor size={13} />,
            count: 5,
            children: [
              { id: "user-device", label: "User Device" },
            ],
          },
        ],
      },
      {
        id: "unmanaged-group",
        label: "Unmanaged Destination",
        groupLabel: true,
        tooltip: "Not connected to SSPM/CSPM, DSPM, or CASB API.\nInline-only visibility, and may be marked as sanctioned or unsanctioned by IT.",
        children: [
          {
            id: "unmanaged-application",
            label: "Application",
            badge: { label: "1 new", color: "bg-unsanctioned" },
          },
          {
            id: "unmanaged-websites",
            label: "Website",
            badge: { label: "5 new", color: "bg-unsanctioned" },
          },
          {
            id: "unmanaged-device-peripheral",
            label: "Device Peripheral",
          },
        ],
      },
    ],
  },
  {
    id: "identities",
    label: "Identity",
    children: [
      {
        id: "human-identity-group",
        label: "Human Identity",
        groupLabel: true,
        children: [
          { id: "internal-user", label: "Internal User", count: 3 },
          { id: "external-user", label: "External User", count: 2 },
        ],
      },
      {
        id: "non-human-identities-group",
        label: "Non-Human Identities",
        groupLabel: true,
        children: [
          { id: "service-account", label: "Service Account", count: 2 },
          { id: "connected-app", label: "Connected App", count: 20 },
          { id: "agentic-identity", label: "Agentic Identity", count: 8 },
        ],
      },
      {
        id: "unknown-identity-group",
        label: "Unauthenticated",
        groupLabel: true,
        children: [
          { id: "unknown-identity", label: "Unauthenticated", count: 18 },
          { id: "unmapped-local-user", label: "Unlinked", count: 14 },
        ],
      },
    ],
  },
];

function NavItemRow({
  item,
  depth = 0,
  selectedId,
  onSelect,
}: {
  item: NavItem;
  depth?: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  // ── Group label — non-interactive divider with a label ──────────────────────
  if (item.groupLabel) {
    return (
      <div>
        {item.label !== "Human Identity" && item.label !== "Non-Human Identities" && item.label !== "Unauthenticated" && (
          <div
            className="text-text-dim px-2 pt-3 pb-1 flex items-center gap-1"
            style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}
          >
            {item.label}
            {item.tooltip && <InfoTooltip text={item.tooltip} />}
          </div>
        )}
        {item.children?.map(child => (
          <NavItemRow
            key={child.id}
            item={child}
            depth={depth}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  /** Recursively check if any descendant matches selectedId */
  function hasSelectedDescendant(node: NavItem, targetId: string): boolean {
    if (!node.children) return false;
    return node.children.some(
      (child) => child.id === targetId || hasSelectedDescendant(child, targetId),
    );
  }

  const [expanded, setExpanded] = useState(
    hasSelectedDescendant(item, selectedId),
  );
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedId === item.id;

  return (
    <div>
      <div
        className={`w-full flex items-center rounded-md transition-colors group ${
          isSelected
            ? "bg-nav-active text-text-bright"
            : "text-muted-foreground hover:bg-nav-active/50 hover:text-text-bright"
        }`}
        style={{ fontSize: "12px" }}
      >
        {/* Chevron toggle — separate click zone */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 flex items-center justify-center w-5 h-6 hover:text-text-bright transition-colors"
            style={{ marginLeft: `${depth * 12 + 4}px` }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        ) : (
          <span
            className="shrink-0 w-5"
            style={{ marginLeft: `${depth * 12 + 4}px` }}
          />
        )}

        {/* Selectable area — icon, label, count/badge */}
        <button
          onClick={() => onSelect(item.id)}
          className="flex-1 flex items-center gap-1.5 py-1 pr-2 min-w-0 cursor-pointer"
        >
          {/* Icon — render when defined */}
          {item.icon && (
            <span className="shrink-0">{item.icon}</span>
          )}

          {/* Label */}
          <span className={`truncate ${item.label === "Endpoint" || item.label === "Device Peripheral" || item.label === "Connected App" || item.label === "Service Account" || item.label === "Agentic Identity" || item.label === "Unauthenticated" ? "text-pink-400" : ""}`}>{item.label}</span>

          {/* Count / Badge */}
          {item.badge ? (
            <span
              className="ml-auto shrink-0 text-unsanctioned"
              style={{ fontSize: "11px" }}
            >
              {item.badge.label}
            </span>
          ) : item.count !== undefined ? (
            <span
              className="ml-auto shrink-0 text-text-dim"
              style={{ fontSize: "11px" }}
            >
              {item.count}
            </span>
          ) : null}
        </button>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {item.children!.map((child) => (
            <NavItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ section }: { section: NavSection }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-1 pb-1">
      <span
        className="text-text-bright"
        style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em" }}
      >
        {section.label}
      </span>
    </div>
  );
}

export function InventoryNav({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-60 shrink-0 overflow-y-auto pt-6 pb-3 pl-2 pr-4 border-r border-border bg-white dark:bg-slate-900">
      <div className="flex flex-col gap-0.5">
        {navSections.map((section, idx) => (
          <div key={section.id} className={idx > 0 ? "mt-5" : ""}>
            <SectionHeader section={section} />
            <div className="flex flex-col gap-0.5 mt-0.5">
              {section.children.map((item) => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

