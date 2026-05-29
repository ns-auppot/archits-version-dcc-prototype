import { useState, useRef, useId, useCallback, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Search, X } from "lucide-react";

// ── Entity Data Types (from the 57-type reference list) ──────────────────────

export const ALL_ENTITY_DATA_TYPES = [
  "Personal Names", "Driver Licenses", "Financial IDs", "Healthcare IDs",
  "Healthcare Provider IDs", "National IDs", "Passports", "Social Insurance Numbers",
  "Social Security Numbers", "Taxpayer IDs", "Telephone Numbers", "Vehicle License Plates",
  "Vehicle Registration Numbers", "Voter IDs", "Generic Identifiers", "Payment Cards",
  "Bank Account Information", "Medical Records", "Medical Diagnoses", "Medical Procedures",
  "Medical Specialties", "Medicinal Products", "Postal Addresses", "Postal Codes",
  "Birthdates", "Expiration Dates", "Dates", "Age", "Biometric Data",
  "Ethnicity and Race", "Gender", "Personal History", "Physical Characteristics",
  "Passwords", "Private Keys", "Public Keys", "Secrets and Tokens", "MAC Addresses",
  "UUIDs", "Domain Names", "Email Addresses", "IP Addresses", "URI Hosts",
  "URI Schemes", "Source Code", "Text Encodings", "Inappropriate Language",
  "Sentiment", "Region Identifiers", "Corporate Tax IDs", "Vehicle Information",
  "Banking Institutions", "Securities IDs", "Currency", "Company Names",
  "Healthcare Providers", "Numbers",
] as const;

// ── Byte formatter ───────────────────────────────────────────────────────────

function fmt(value: number, unit: string): string {
  const fixed1 = value.toFixed(1);
  return fixed1.endsWith(".0") ? `${Math.round(value)} ${unit}` : `${fixed1} ${unit}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return fmt(bytes / 1024, "KB");
  if (bytes < 1024 * 1024 * 1024) return fmt(bytes / (1024 * 1024), "MB");
  const gb = bytes / (1024 * 1024 * 1024);
  const fixed2 = gb.toFixed(2);
  return fixed2.endsWith(".00") ? `${Math.round(gb)} GB` : (fixed2.endsWith("0") ? `${gb.toFixed(1)} GB` : `${fixed2} GB`);
}

// ── Date label for sparkline tooltip ─────────────────────────────────────────

function getSparklineDate(dayIndex: number, totalDays: number): string {
  const today = new Date(2026, 1, 23); // Feb 23, 2026
  const date = new Date(today);
  date.setDate(today.getDate() - (totalDays - 1 - dayIndex));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Sparkline (pure SVG) with hover tooltip ──────────────────────────────────

export function Sparkline({
  data,
  color = "var(--color-primary)",
  height = 28,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMeasuredWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = measuredWidth;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.round((x / rect.width) * (data.length - 1));
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      setHoveredIndex(clamped);
    },
    [data.length]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padY = 3;
  const innerH = height - padY * 2;

  const coords = width > 0
    ? data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = padY + innerH - ((v - min) / range) * innerH;
        return { x, y };
      })
    : [];

  const points = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = width > 0 ? `0,${height} ${points} ${width},${height}` : "";

  const hovered = hoveredIndex !== null && coords[hoveredIndex] ? coords[hoveredIndex] : null;
  const hoveredValue = hoveredIndex !== null ? data[hoveredIndex] : null;

  // Position tooltip: flip to left side if near right edge
  const tooltipLeft =
    hovered && hovered.x > width * 0.65
      ? hovered.x - 6
      : hovered
        ? hovered.x + 6
        : 0;
  const tooltipAnchor =
    hovered && hovered.x > width * 0.65 ? "right" : "left";

  return (
    <div className="relative w-full" ref={containerRef} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill={`url(#${gradientId})`} />
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator dot */}
          {hovered && (
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r={3}
              fill={color}
              stroke="var(--color-background)"
              strokeWidth={1.5}
            />
          )}

          {/* Vertical guide line */}
          {hovered && (
            <line
              x1={hovered.x}
              y1={0}
              x2={hovered.x}
              y2={height}
              stroke={color}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />
          )}
        </svg>
      )}

      {/* Tooltip */}
      {hoveredIndex !== null && hoveredValue !== null && (
        <div
          className="absolute z-50 pointer-events-none bg-surface-raised border border-border rounded-md shadow-lg px-2 py-1.5"
          style={{
            bottom: "calc(100% + 6px)",
            ...(tooltipAnchor === "left"
              ? { left: tooltipLeft }
              : { right: width - tooltipLeft }),
            whiteSpace: "nowrap",
          }}
        >
          <div className="text-muted-foreground" style={{ fontSize: "10px" }}>
            {getSparklineDate(hoveredIndex, data.length)}
          </div>
          <div className="text-text-bright" style={{ fontSize: "11px", fontWeight: 600 }}>
            {formatBytes(hoveredValue)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Data Type Tags with "+n" popover ─────────────────────────────────────────

const MAX_VISIBLE_TAGS = 3;

export function DataTypeTags({ types }: { types: string[] }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = types.slice(0, MAX_VISIBLE_TAGS);
  const remaining = types.slice(MAX_VISIBLE_TAGS);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPopoverOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setPopoverOpen(false), 150);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((t) => (
        <span
          key={t}
          className="inline-flex px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground whitespace-nowrap"
          style={{ fontSize: "11px" }}
        >
          {t}
        </span>
      ))}
      {remaining.length > 0 && (
        <div
          className="relative"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <span
            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary/15 text-primary cursor-default"
            style={{ fontSize: "11px", fontWeight: 400 }}
          >
            +{remaining.length}
          </span>

          {popoverOpen && (
            <div
              className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 max-h-60 overflow-y-auto bg-surface-raised border border-border rounded-lg shadow-lg p-2"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <div className="flex flex-wrap gap-1">
                {remaining.map((t) => (
                  <span
                    key={t}
                    className="inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-foreground whitespace-nowrap"
                    style={{ fontSize: "11px" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate 30 days of sparkline data in bytes.
 * `seed` controls the deterministic shape; `baseBytes` sets the rough center
 * value (defaults to ~2 MB), and `variance` controls the amplitude.
 */
export function generateSparkData(
  seed: number,
  points = 30,
  baseBytes = 2 * 1024 * 1024,
  variance = 0.4,
): number[] {
  const data: number[] = [];
  // Deterministic per-seed scale factor so each row has a different magnitude
  const scaleFactor = 0.5 + ((seed * 7919) % 100) / 100; // 0.5–1.5x
  const center = baseBytes * scaleFactor;
  let val = center;
  for (let i = 0; i < points; i++) {
    const delta =
      Math.sin(i * 0.7 + seed) * center * variance * 0.15 +
      Math.cos(i * 0.3 + seed * 2) * center * variance * 0.1;
    val = Math.max(1024, val + delta); // at least 1 KB
    data.push(Math.round(val));
  }
  return data;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ── Sort utilities ───────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface SortColumnDef {
  key: string;
  label: string;
}

/** Sum a sparkline data array (total bytes over the 30-day window). */
export function sumSparkData(data: number[]): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i];
  return s;
}

/** Percentage change from the first half average to the second half average of a sparkline. */
export function sparkPctChange(data: number[]): number {
  if (data.length < 2) return 0;
  const mid = Math.floor(data.length / 2);
  const first = data.slice(0, mid);
  const second = data.slice(mid);
  const avgFirst  = first.reduce((s, v) => s + v, 0) / first.length;
  const avgSecond = second.reduce((s, v) => s + v, 0) / second.length;
  if (avgFirst === 0) return 0;
  return Math.round(((avgSecond - avgFirst) / avgFirst) * 100);
}

/**
 * Cycle column header: null → desc → asc → null.
 * If clicking a different column, start at desc.
 */
export function toggleHeaderSort(
  current: SortConfig | null,
  key: string,
): SortConfig | null {
  if (!current || current.key !== key) return { key, direction: "desc" };
  if (current.direction === "desc") return { key, direction: "asc" };
  return null;
}

/**
 * Dropdown sort: first select → desc, same again → asc, same again → desc, etc.
 */
export function toggleDropdownSort(
  current: SortConfig | null,
  key: string,
): SortConfig {
  if (current && current.key === key) {
    return { key, direction: current.direction === "desc" ? "asc" : "desc" };
  }
  return { key, direction: "desc" };
}

/** Sort direction icon for column headers. */
export function SortIcon({
  columnKey,
  sortConfig,
  size = 11,
}: {
  columnKey: string;
  sortConfig: SortConfig | null;
  size?: number;
}) {
  if (!sortConfig || sortConfig.key !== columnKey)
    return <ArrowUpDown size={size} />;
  return sortConfig.direction === "asc" ? (
    <ArrowUp size={size} />
  ) : (
    <ArrowDown size={size} />
  );
}

/** Reusable sort dropdown placed in ContentHeader area. */
export function SortDropdown({
  columns,
  sortConfig,
  onSort,
}: {
  columns: SortColumnDef[];
  sortConfig: SortConfig | null;
  onSort: (config: SortConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeLabel = sortConfig
    ? columns.find((c) => c.key === sortConfig.key)?.label
    : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-input-background border border-border text-foreground hover:text-text-bright transition-colors"
        style={{ fontSize: "12px" }}
      >
        {activeLabel ? (
          <>
            <span className="text-muted-foreground">Sort:</span>
            <span className="text-text-bright" style={{ fontWeight: 500 }}>
              {activeLabel}
            </span>
            {sortConfig && (
              sortConfig.direction === "asc" ? (
                <ArrowUp size={11} className="text-primary" />
              ) : (
                <ArrowDown size={11} className="text-primary" />
              )
            )}
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Sort by</span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-56 bg-surface-raised border border-border rounded-lg shadow-lg py-1 overflow-hidden"
        >
          {columns.map((col) => {
            const isActive = sortConfig?.key === col.key;
            return (
              <button
                key={col.key}
                onClick={() => {
                  onSort(toggleDropdownSort(sortConfig, col.key));
                  if (!isActive) setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  isActive
                    ? "bg-primary/10 text-text-bright"
                    : "text-foreground hover:bg-foreground/[0.06]"
                }`}
                style={{ fontSize: "12px" }}
              >
                <span>{col.label}</span>
                {isActive && sortConfig && (
                  <span className="text-primary flex items-center gap-1" style={{ fontSize: "10px", fontWeight: 600 }}>
                    {sortConfig.direction === "asc" ? (
                      <><ArrowUp size={10} /> ASC</>
                    ) : (
                      <><ArrowDown size={10} /> DESC</>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Table Search Input ───────────────────────────────────────────────────────

/** Reusable search button that expands into an input on click. */
export function TableSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus when expanded
  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  // Collapse on outside click when empty
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !value
      ) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded, value]);

  if (!expanded && !value) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-input-background border border-border text-muted-foreground hover:text-text-bright transition-colors"
        style={{ fontSize: "12px" }}
      >
        <Search size={13} />
        <span>Search</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Search
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            setExpanded(false);
          }
        }}
        placeholder="Search..."
        className="pl-8 pr-7 py-1.5 rounded-md bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        style={{ fontSize: "12px", width: "180px" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-bright transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ── Highlight Text ───────────────────────────────────────────────────────────

/**
 * Renders `text` with matching `query` substrings wrapped in a highlight mark.
 * Only highlights when query is 2+ chars. Case-insensitive.
 */
export function HighlightText({
  text,
  query,
  className,
  style,
}: {
  text: string;
  query: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return <span className={className} style={style}>{text}</span>;
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className} style={style}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/25 text-inherit rounded-sm px-px"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/**
 * Returns true if any of the given `searchableValues` contain the query
 * substring (case-insensitive). Only matches when query is 2+ chars.
 */
export function matchesSearch(query: string, ...searchableValues: string[]): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return true; // no filtering when query too short
  return searchableValues.some((v) => v.toLowerCase().includes(trimmed));
}