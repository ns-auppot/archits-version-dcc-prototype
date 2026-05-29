import React, { useState } from 'react';
import {
  Database, Network, Search, Filter, ChevronUp, ChevronDown, X,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const DAR_TYPES = [
  { name: 'Personal Names',          count: 1850, change: +12, color: '#f43f5e', platforms: ['AWS S3', 'sharepoint'],      records: '2.4M',  lastSeen: '2 min ago'  },
  { name: 'Driver Licenses',         count: 1620, change: +8,  color: '#f97316', platforms: ['AWS S3', 'GCP Storage'],     records: '1.8M',  lastSeen: '14 min ago' },
  { name: 'Financial IDs',           count: 1240, change: -3,  color: '#eab308', platforms: ['Salesforce', 'AWS S3'],      records: '980K',  lastSeen: '1h ago'     },
  { name: 'Healthcare IDs',          count:  980, change: +6,  color: '#8b5cf6', platforms: ['GCP Storage', 'Azure Blob'], records: '740K',  lastSeen: '3h ago'     },
  { name: 'Healthcare Provider IDs', count:  870, change: -1,  color: '#6366f1', platforms: ['Azure Blob', 'OneDrive'],    records: '620K',  lastSeen: '5h ago'     },
  { name: 'National IDs',            count:  720, change: +4,  color: '#3b82f6', platforms: ['sharepoint', 'AWS S3'],      records: '510K',  lastSeen: 'Yesterday'  },
  { name: 'Payment Cards',           count:  650, change: -2,  color: '#ec4899', platforms: ['Salesforce', 'OneDrive'],    records: '430K',  lastSeen: 'Yesterday'  },
  { name: 'Passports',               count:  540, change: +9,  color: '#10b981', platforms: ['AWS S3', 'Google Drive'],    records: '380K',  lastSeen: '2 days ago' },
  { name: 'Social Security Numbers', count:  460, change: -5,  color: '#06b6d4', platforms: ['AWS S3', 'sharepoint'],      records: '290K',  lastSeen: '3 days ago' },
  { name: 'Email Addresses',         count:  380, change: +15, color: '#84cc16', platforms: ['Google Drive', 'OneDrive'],  records: '1.2M',  lastSeen: '4h ago'     },
];

const DIM_TYPES = [
  { name: 'Personal Names',           count: 2100, change: +18, color: '#f43f5e', platforms: ['Chrome', 'Edge'],          records: '3.1M',  lastSeen: 'Just now'   },
  { name: 'Payment Cards',            count: 1780, change: -6,  color: '#f97316', platforms: ['Web form', 'App upload'],  records: '2.2M',  lastSeen: '8 min ago'  },
  { name: 'Email Addresses',          count: 1450, change: +22, color: '#eab308', platforms: ['Gmail', 'Outlook'],        records: '4.5M',  lastSeen: '12 min ago' },
  { name: 'Social Security Numbers',  count: 1230, change: -11, color: '#8b5cf6', platforms: ['File upload', 'API'],      records: '890K',  lastSeen: '25 min ago' },
  { name: 'Bank Account Information', count:  980, change: +7,  color: '#6366f1', platforms: ['Web form', 'App upload'],  records: '640K',  lastSeen: '1h ago'     },
  { name: 'Driver Licenses',          count:  820, change: +4,  color: '#3b82f6', platforms: ['File upload', 'Chrome'],   records: '510K',  lastSeen: '2h ago'     },
  { name: 'IP Addresses',             count:  700, change: -2,  color: '#ec4899', platforms: ['API', 'Web form'],         records: '8.9M',  lastSeen: '3h ago'     },
  { name: 'Passwords',                count:  560, change: -8,  color: '#10b981', platforms: ['Web form', 'Browser ext'], records: '320K',  lastSeen: 'Yesterday'  },
  { name: 'Private Keys',             count:  420, change: +3,  color: '#06b6d4', platforms: ['API', 'Git'],              records: '180K',  lastSeen: '2 days ago' },
  { name: 'Domain Names',             count:  350, change: -1,  color: '#84cc16', platforms: ['DNS', 'API'],              records: '2.1M',  lastSeen: '3 days ago' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DataExplorer({
  initialTab    = 'DAR',
  initialDataType = null,
}: {
  initialTab?:     'DAR' | 'DIM';
  initialDataType?: string | null;
}) {
  const [tab,          setTab]          = useState<'DAR' | 'DIM'>(initialTab);
  const [selectedType, setSelectedType] = useState<string | null>(initialDataType);
  const [search,       setSearch]       = useState('');

  const allTypes  = tab === 'DAR' ? DAR_TYPES : DIM_TYPES;
  const displayed = allTypes.filter(t =>
    (selectedType ? t.name === selectedType : true) &&
    (search       ? t.name.toLowerCase().includes(search.toLowerCase()) : true)
  );

  const accentColor = tab === 'DAR' ? 'indigo' : 'emerald';
  const accentClasses = {
    indigo:  { active: 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400', pill: 'bg-indigo-600 text-white border-indigo-600' },
    emerald: { active: 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400', pill: 'bg-emerald-600 text-white border-emerald-600' },
  }[accentColor];

  const handleTabChange = (newTab: 'DAR' | 'DIM') => {
    setTab(newTab);
    setSelectedType(null);
    setSearch('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">

      {/* ── Sticky header + tabs ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <div className="max-w-6xl mx-auto px-8 pt-6 pb-0">

          {/* Title row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Data Explorer</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Explore detected sensitive data types across your environment
              </p>
            </div>
            {/* Total badge */}
            <div className="text-right">
              <div className="text-[11px] text-gray-400 dark:text-slate-500 mb-0.5">Total detections</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">
                {allTypes.reduce((s, t) => s + t.count, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 -mb-px">
            {([
              { id: 'DAR' as const, label: 'Data at Rest',    Icon: Database },
              { id: 'DIM' as const, label: 'Data in Motion',  Icon: Network  },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? accentClasses.active
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-6 space-y-4">

          {/* ── Filter bar ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm px-4 py-3 flex items-start gap-4 flex-wrap">
            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search data types…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-44"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-gray-100 dark:bg-slate-800" />

            {/* Type pills */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600 flex items-center gap-1 shrink-0">
                <Filter className="w-2.5 h-2.5" /> Filter
              </span>

              {/* "All" pill */}
              <button
                onClick={() => setSelectedType(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  !selectedType
                    ? accentClasses.pill
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-400'
                }`}
              >
                All
              </button>

              {allTypes.map(t => (
                <button
                  key={t.name}
                  onClick={() => setSelectedType(prev => prev === t.name ? null : t.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    selectedType === t.name
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-400'
                  }`}
                  style={selectedType === t.name ? { backgroundColor: t.color, borderColor: t.color } : undefined}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedType === t.name ? 'rgba(255,255,255,0.8)' : t.color }}
                  />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Results table ── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">

            {/* Active filter callout */}
            {selectedType && (
              <div
                className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 dark:border-slate-800"
                style={{ backgroundColor: `${allTypes.find(t => t.name === selectedType)?.color}12` }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: allTypes.find(t => t.name === selectedType)?.color }}
                />
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                  Filtered by: <span className="font-semibold">{selectedType}</span>
                </span>
                <button
                  onClick={() => setSelectedType(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <table className="w-full text-xs">
              <thead className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/40">
                <tr>
                  {[
                    { label: 'Data Type',          cls: 'pl-5' },
                    { label: 'Detections',          cls: 'text-right' },
                    { label: 'Change (7d)',          cls: 'text-right' },
                    { label: 'Affected Records',    cls: 'text-right' },
                    { label: 'Top Sources',         cls: '' },
                    { label: 'Last Detected',       cls: 'pr-5' },
                  ].map(col => (
                    <th
                      key={col.label}
                      className={`py-3 px-3 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap ${col.cls}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-slate-500">
                      No data types match your filter.
                    </td>
                  </tr>
                )}
                {displayed.map((row, idx) => (
                  <tr
                    key={row.name}
                    className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Data Type */}
                    <td className="pl-5 pr-3 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                        <button
                          className="font-medium text-gray-800 dark:text-slate-200 hover:underline text-left"
                          onClick={() => setSelectedType(prev => prev === row.name ? null : row.name)}
                        >
                          {row.name}
                        </button>
                      </div>
                    </td>

                    {/* Detections */}
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      <span className="font-semibold text-gray-900 dark:text-slate-100">
                        {row.count.toLocaleString()}
                      </span>
                    </td>

                    {/* Change */}
                    <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                      <span className={`inline-flex items-center gap-0.5 font-medium ${
                        row.change > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {row.change > 0
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                        }
                        {Math.abs(row.change)}%
                      </span>
                    </td>

                    {/* Affected Records */}
                    <td className="px-3 py-3.5 text-right tabular-nums text-gray-600 dark:text-slate-300">
                      {row.records}
                    </td>

                    {/* Top Sources */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.platforms.map(p => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-[10px] font-medium"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Last Detected */}
                    <td className="pr-5 pl-3 py-3.5 text-right text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      {row.lastSeen}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/30 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-slate-500">
                Showing {displayed.length} of {allTypes.length} data types
                {tab === 'DAR' ? ' · Data at Rest' : ' · Data in Motion'}
              </span>
              <button className="text-[11px] font-medium text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                Export CSV
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
