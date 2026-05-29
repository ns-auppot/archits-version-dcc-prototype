import React, { useState, useMemo } from 'react';
import { PlugZap } from 'lucide-react';
import {
  SortIcon,
  SortDropdown,
  TableSearchInput,
  toggleHeaderSort,
  matchesSearch,
  type SortConfig,
  type SortColumnDef,
} from '../app/components/inventory/data-store-shared';

// ─── Platform SVG Logos ───────────────────────────────────────────────────────

const PlatformLogo = ({ name, size = 18 }: { name: string; size?: number }) => {
  const s = size;
  switch (name) {
    case 'AWS S3':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#FF9900" opacity="0.12" />
          <path d="M16 6L8 10v12l8 4 8-4V10L16 6z" fill="#FF9900" opacity="0.9" />
          <path d="M16 6v16M8 10l8 4 8-4" stroke="#FF9900" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'OneDrive':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#0078D4" opacity="0.12" />
          <path d="M7 20c0-2.76 2.24-5 5-5 .34 0 .68.03 1 .1A5 5 0 0121 16a3 3 0 010 6H9a2 2 0 01-2-2z" fill="#0078D4" opacity="0.9" />
        </svg>
      );
    case 'GCP Storage':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#4285F4" opacity="0.12" />
          <path d="M16 8a8 8 0 100 16A8 8 0 0016 8z" fill="#4285F4" opacity="0.15" />
          <path d="M20 16a4 4 0 11-8 0 4 4 0 018 0z" fill="#4285F4" opacity="0.9" />
          <path d="M16 8v3M16 21v3M8 16h3M21 16h3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'sharepoint':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#0078D4" opacity="0.12" />
          <circle cx="14" cy="14" r="6" fill="#0078D4" opacity="0.9" />
          <circle cx="14" cy="14" r="3" fill="white" opacity="0.8" />
          <rect x="17" y="17" width="10" height="10" rx="2" fill="#0078D4" opacity="0.7" />
        </svg>
      );
    case 'Google Drive':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#34A853" opacity="0.12" />
          <path d="M12 22H7l5-9 2.5 4.5L12 22z" fill="#FBBC04" />
          <path d="M20 22l5-9-5-4-2.5 4.5L20 22z" fill="#4285F4" />
          <path d="M12 22h8l-2.5-4.5h-3L12 22z" fill="#34A853" />
          <path d="M14.5 9h3L22 17.5H10L14.5 9z" fill="#EA4335" opacity="0.8" />
        </svg>
      );
    case 'Azure Blob':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#0089D6" opacity="0.12" />
          <path d="M8 20l4-12 4 6 3-4 5 10H8z" fill="#0089D6" opacity="0.9" />
        </svg>
      );
    case 'Salesforce':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#00A1E0" opacity="0.12" />
          <path d="M16 8c-2.21 0-4 1.79-4 4 0 .55.11 1.07.3 1.55A3 3 0 009 17a3 3 0 003 3h9a2 2 0 000-4h-.18A4 4 0 0016 8z" fill="#00A1E0" opacity="0.9" />
        </svg>
      );
    case 'Github':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#24292F" opacity="0.12" />
          <path fillRule="evenodd" clipRule="evenodd" d="M16 7a9 9 0 00-2.845 17.54c.45.083.615-.195.615-.433l-.011-1.517c-2.503.544-3.032-1.206-3.032-1.206-.41-1.04-1-1.317-1-1.317-.817-.559.062-.547.062-.547.903.063 1.379.927 1.379.927.803 1.376 2.107.978 2.62.748.082-.582.314-.978.57-1.202-1.997-.227-4.098-1-4.098-4.448 0-.983.35-1.787.927-2.417-.093-.228-.402-1.143.088-2.383 0 0 .756-.242 2.477.923A8.624 8.624 0 0116 11.53c.765.003 1.535.103 2.254.302 1.72-1.165 2.476-.923 2.476-.923.49 1.24.181 2.155.089 2.383.578.63.926 1.434.926 2.417 0 3.457-2.104 4.219-4.107 4.441.323.278.611.827.611 1.667l-.011 2.47c0 .24.163.52.62.433A9.001 9.001 0 0016 7z" fill="#24292F" />
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

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface UnconnectedDataStore {
  id: number;
  name: string;
  platform: string;
  account: string;
  firstFound: string;
  region?: string;
  endpoint: string;
  status: string;
}

// ─── Table Component ──────────────────────────────────────────────────────────

interface UnconnectedDataStoreTableProps {
  data: UnconnectedDataStore[];
  currentPage?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onActionClick?: (store: UnconnectedDataStore) => void;
  onServiceNameClick?: (store: UnconnectedDataStore) => void;
  /** Controlled sort state lifted to the parent (e.g. for headerActions) */
  sortConfig?: SortConfig | null;
  onSortChange?: (config: SortConfig | null) => void;
  /** Controlled search term lifted to the parent */
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export function UnconnectedDataStoreTable({
  data,
  currentPage = 1,
  rowsPerPage = 5,
  onPageChange,
  onActionClick,
  onServiceNameClick,
  sortConfig: sortConfigProp,
  onSortChange,
  searchTerm: searchTermProp,
  onSearchChange,
}: UnconnectedDataStoreTableProps) {
  // Fall back to internal state when no controlled props are provided
  const [sortConfigInternal, setSortConfigInternal] = useState<SortConfig | null>(null);
  const [searchTermInternal, setSearchTermInternal] = useState('');

  const sortConfig  = sortConfigProp  !== undefined ? sortConfigProp  : sortConfigInternal;
  const searchTerm  = searchTermProp  !== undefined ? searchTermProp  : searchTermInternal;
  const setSortConfig = (cfg: SortConfig | null) => {
    if (onSortChange) onSortChange(cfg);
    else setSortConfigInternal(cfg);
  };
  const setSearchTerm = (t: string) => {
    if (onSearchChange) onSearchChange(t);
    else setSearchTermInternal(t);
  };

  const SORT_COLUMNS: SortColumnDef[] = [
    { key: 'Service Name', label: 'Service Name' },
    { key: 'Platform',     label: 'Platform' },
    { key: 'Account',      label: 'Account' },
    { key: 'First Found',  label: 'First Found' },
    { key: 'Region',       label: 'Region' },
    { key: 'Status',       label: 'Status' },
  ];

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    const mul = direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const map: Record<string, string> = {
        'Service Name': a.name,
        'Platform':     a.platform,
        'Account':      a.account,
        'First Found':  a.firstFound,
        'Region':       a.region ?? '',
        'Status':       a.status,
      };
      const mapB: Record<string, string> = {
        'Service Name': b.name,
        'Platform':     b.platform,
        'Account':      b.account,
        'First Found':  b.firstFound,
        'Region':       b.region ?? '',
        'Status':       b.status,
      };
      return mul * (map[key] ?? '').localeCompare(mapB[key] ?? '');
    });
  }, [data, sortConfig]);

  const filteredData = useMemo(() => {
    return sortedData.filter((s) =>
      matchesSearch(searchTerm, s.name, s.platform, s.account, s.region ?? '', s.endpoint, s.status)
    );
  }, [sortedData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageSlice = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(toggleHeaderSort(sortConfig, key));
    onPageChange?.(1);
  };

  return (
    <>
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
            <tr>
              {[
                { label: 'Service Name', cls: '' },
                { label: 'Platform',     cls: '' },
                { label: 'Account',      cls: '' },
                { label: 'First Found',  cls: '' },
                { label: 'Region',       cls: '' },
                { label: 'Endpoint',     cls: '' },
                { label: 'Status',       cls: '' },
                { label: 'Action',       cls: '' },
              ].map(h => (
                <th
                  key={h.label}
                  className={`px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap border-b border-gray-100 dark:border-slate-800 ${h.cls}`}
                  onClick={h.label !== 'Action' ? () => handleSort(h.label) : undefined}
                  style={h.label !== 'Action' ? { cursor: 'pointer' } : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {h.label}
                    {h.label !== 'Action' && (
                      <SortIcon columnKey={h.label} sortConfig={sortConfig} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors border-b border-gray-50 dark:border-slate-800/60">
                {/* Service Name — blue link */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <PlatformLogo name={store.platform === 'AWS' ? 'AWS S3' : store.platform === 'GCP' ? 'GCP Storage' : store.platform === 'Azure' ? 'Azure Blob' : store.name} size={18} />
                    <button 
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      onClick={() => onServiceNameClick?.(store)}
                    >
                      {store.name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-nowrap">{store.platform}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-[110px] truncate" title={store.account}>{store.account}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{store.firstFound}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{store.region ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                  <span className="block truncate font-mono text-[10px]" title={store.endpoint}>{store.endpoint}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {store.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button 
                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                    onClick={() => onActionClick?.(store)}
                  >
                    <PlugZap className="w-3 h-3" /> Connect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
          <span>Rows per page</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">{rowsPerPage}</span>
          <span className="ml-3">
            {filteredData.length === 0
              ? '0–0 of 0'
              : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, filteredData.length)} of ${filteredData.length}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 text-gray-500 transition-colors"
          >‹</button>
          {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange?.(p)}
              className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-medium transition-colors ${
                currentPage === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >{p}</button>
          ))}
          {totalPages > 4 && <span className="text-gray-400 px-1 text-[11px]">…</span>}
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 text-gray-500 transition-colors"
          >›</button>
        </div>
      </div>
    </>
  );
}