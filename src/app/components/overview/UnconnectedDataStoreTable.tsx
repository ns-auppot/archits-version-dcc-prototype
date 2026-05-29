import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { PlugZap, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ─── Platform SVG Logos ───────────────────────────────────────────────────────

const PlatformLogo = ({ name, size = 18 }: { name: string; size?: number }) => {
  const s = size;
  switch (name) {
    case 'AWS':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#FF9900" opacity="0.12" />
          <path d="M16 6L8 10v12l8 4 8-4V10L16 6z" fill="#FF9900" opacity="0.9" />
          <path d="M16 6v16M8 10l8 4 8-4" stroke="#FF9900" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'GCP':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#4285F4" opacity="0.12" />
          <path d="M20 16a4 4 0 11-8 0 4 4 0 018 0z" fill="#4285F4" opacity="0.9" />
          <path d="M16 8v3M16 21v3M8 16h3M21 16h3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'Azure':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#0089D6" opacity="0.12" />
          <path d="M8 20l4-12 4 6 3-4 5 10H8z" fill="#0089D6" opacity="0.9" />
        </svg>
      );
    case 'Snowflake':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#29B5E8" opacity="0.12" />
          <path d="M16 8v16M8 12l8 4 8-4M8 20l8-4 8 4" stroke="#29B5E8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'Salesforce':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#00A1E0" opacity="0.12" />
          <path d="M16 8c-2.21 0-4 1.79-4 4 0 .55.11 1.07.3 1.55A3 3 0 009 17a3 3 0 003 3h9a2 2 0 000-4h-.18A4 4 0 0016 8z" fill="#00A1E0" opacity="0.9" />
        </svg>
      );
    case 'MongoDB':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#4DB33D" opacity="0.12" />
          <path d="M16 6c0 0-5 5.5-5 11 0 3.5 2 6.5 5 9 3-2.5 5-5.5 5-9 0-5.5-5-11-5-11z" fill="#4DB33D" opacity="0.9" />
        </svg>
      );
    case 'Oracle':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#F80000" opacity="0.12" />
          <ellipse cx="16" cy="16" rx="8" ry="5" stroke="#F80000" strokeWidth="1.8" fill="none" />
        </svg>
      );
    case 'Confluent':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#0078D4" opacity="0.12" />
          <path d="M8 12h16M8 16h12M8 20h8" stroke="#0078D4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#6366f1" opacity="0.15" />
          <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#6366f1">{name[0]}</text>
        </svg>
      );
  }
};

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  if (dir === 'asc')  return <ChevronUp   className="w-3 h-3 text-blue-500 shrink-0" />;
  if (dir === 'desc') return <ChevronDown  className="w-3 h-3 text-blue-500 shrink-0" />;
  return <ChevronsUpDown className="w-3 h-3 text-gray-300 shrink-0" />;
}

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface UnconnectedDataStore {
  id:         number;
  name:       string;
  platform:   string;
  account:    string;
  firstFound: string;
  region?:    string;
  endpoint:   string;
  status:     string;
}

type SortKey = keyof UnconnectedDataStore;
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; width?: number; sortable: boolean }[] = [
  { key: 'name',       label: 'Service Name', sortable: true,  width: 160 },
  { key: 'platform',   label: 'Platform',     sortable: true,  width: 110 },
  { key: 'account',    label: 'Account',      sortable: true,  width: 150 },
  { key: 'firstFound', label: 'First Found',  sortable: true,  width: 120 },
  { key: 'region',     label: 'Region',       sortable: true,  width: 130 },
  { key: 'endpoint',   label: 'Endpoint',     sortable: false, width: 280 },
  { key: 'status',     label: 'Status',       sortable: true,  width: 100 },
];

// Action column not sortable, fixed right

const INITIAL_VISIBLE = 10;
const LOAD_MORE_COUNT = 8;

// ─── Table Component ──────────────────────────────────────────────────────────

interface UnconnectedDataStoreTableProps {
  data:               UnconnectedDataStore[];
  onActionClick?:     (store: UnconnectedDataStore) => void;
}

export function UnconnectedDataStoreTable({
  data,
  onActionClick,
}: UnconnectedDataStoreTableProps) {
  const [sortKey, setSortKey]       = useState<SortKey | null>(null);
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [visibleCount, setVisible]  = useState(INITIAL_VISIBLE);
  const sentinelRef                 = useRef<HTMLDivElement>(null);
  const containerRef                = useRef<HTMLDivElement>(null);

  // Sort logic
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    if (visibleCount < sorted.length) {
      setVisible(v => Math.min(v + LOAD_MORE_COUNT, sorted.length));
    }
  }, [visibleCount, sorted.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1, rootMargin: '0px 0px 60px 0px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore]);

  // Column header click handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    // Reset visible when sort changes
    setVisible(INITIAL_VISIBLE);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Table wrapper with right-side scroll fade indicator */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          <table className="text-xs" style={{ minWidth: 1060 }}>
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width }}
                    className={`px-4 py-3 text-left border-b border-gray-100 dark:border-slate-800 ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-slate-800/60' : ''}`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {col.label}
                      </span>
                      {col.sortable && (
                        <SortIcon dir={sortKey === col.key ? sortDir : null} />
                      )}
                    </div>
                  </th>
                ))}
                {/* Action column header */}
                <th className="px-4 py-3 text-left border-b border-gray-100 dark:border-slate-800" style={{ width: 100, minWidth: 100 }}>
                  <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((store) => (
                <tr
                  key={store.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors border-b border-gray-50 dark:border-slate-800/60"
                >
                  {/* Service Name — neutral, non-clickable */}
                  <td className="px-4 py-3 whitespace-nowrap" style={{ minWidth: 160 }}>
                    <div className="flex items-center gap-2">
                      <PlatformLogo name={store.platform} size={18} />
                      <span className="text-[12px] text-gray-700 dark:text-slate-300 font-medium">
                        {store.name}
                      </span>
                    </div>
                  </td>

                  {/* Platform */}
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap text-[11px]" style={{ minWidth: 110 }}>
                    {store.platform}
                  </td>

                  {/* Account */}
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-[11px]" style={{ minWidth: 150, maxWidth: 150 }}>
                    <span className="block truncate" title={store.account}>{store.account}</span>
                  </td>

                  {/* First Found */}
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[11px]" style={{ minWidth: 120 }}>
                    {store.firstFound}
                  </td>

                  {/* Region */}
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[11px]" style={{ minWidth: 130 }}>
                    {store.region ?? <span className="text-gray-200">—</span>}
                  </td>

                  {/* Endpoint */}
                  <td className="px-4 py-3 text-gray-400 text-[11px]" style={{ minWidth: 280, maxWidth: 280 }}>
                    <span className="block truncate font-mono text-[10px]" title={store.endpoint}>
                      {store.endpoint}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap" style={{ minWidth: 100 }}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      store.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {store.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 whitespace-nowrap" style={{ minWidth: 100 }}>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors shadow-sm"
                      onClick={() => onActionClick?.(store)}
                    >
                      <PlugZap className="w-3 h-3" /> Connect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-px" />

          {/* Loading indicator */}
          {hasMore && (
            <div className="flex items-center justify-center py-4 text-[11px] text-gray-400">
              <svg className="animate-spin w-3.5 h-3.5 mr-2 text-gray-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Loading more…
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && visible.length > 0 && (
            <div className="flex items-center justify-center py-4 gap-3">
              <div className="h-px flex-1 bg-gray-100 max-w-20" />
              <span className="text-[10px] text-gray-300">Showing {visible.length} of {data.length} stores</span>
              <div className="h-px flex-1 bg-gray-100 max-w-20" />
            </div>
          )}
        </div>

        {/* Right-edge scroll shadow indicating horizontal content */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10"
          style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)' }}
        />
      </div>

      {/* Scroll hint bar */}
      <div className="shrink-0 flex items-center justify-end gap-1.5 px-4 py-1.5 border-t border-gray-50 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60">
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 16 16">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[9px] text-gray-300 select-none">Scroll right to see more columns</span>
      </div>
    </div>
  );
}
