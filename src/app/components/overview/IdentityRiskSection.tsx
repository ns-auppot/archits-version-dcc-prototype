import React from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { WidgetCard } from '../ui/WidgetCard';

// ─── Formatter ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000)   return n.toLocaleString();
  return `${n}`;
}

// ─── Data ────────────────────────────────────────────────────────────────────

interface IdentityGroup {
  key:      string;
  label:    string;
  barColor: string;
  total:    number;
  hasSens:  number;
}

const GROUPS: IdentityGroup[] = [
  { key: 'internal', label: 'Internal Users',        barColor: '#6366f1', total: 284_200, hasSens:  96_400 },
  { key: 'external', label: 'External Users',        barColor: '#3b82f6', total:   8_420, hasSens:   3_180 },
  { key: 'unmapped', label: 'Unmapped',        barColor: '#fb923c', total:  62_000, hasSens:   7_400 },
  { key: 'unknown',  label: 'Unauthenticated', barColor: '#f43f5e', total: 142_000, hasSens:  18_600 },
];

const TOTAL  = GROUPS.reduce((s, g) => s + g.total,   0);
const W_SENS = GROUPS.reduce((s, g) => s + g.hasSens, 0);

// ─── Group tile ───────────────────────────────────────────────────────────────

function GroupTile({ group, onClick }: {
  group:   IdentityGroup;
  onClick: () => void;
}) {
  const sensPct    = group.total > 0 ? (group.hasSens / group.total) : 0;
  const sensPctInt = Math.round(sensPct * 100);

  return (
    <button
      className="flex-1 min-w-0 relative flex flex-col gap-2 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer text-left group"
      onClick={onClick}
    >
      {/* Arrow — only visible on hover, centered vertically on the right */}
      <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      {/* Label */}
      <span className="text-[11px] font-medium text-gray-800 dark:text-slate-200 truncate">{group.label}</span>

      {/* Primary count — sensitive access */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[20px] font-bold tabular-nums leading-none ${group.key === 'unknown' ? 'text-rose-500 dark:text-rose-400' : 'text-gray-900 dark:text-slate-100'}`}>
          {group.hasSens > 0 ? fmt(group.hasSens) : '—'}
        </span>
        {group.hasSens > 0 && (
          <span className="text-[11px] text-gray-400 dark:text-slate-500">with sensitive access</span>
        )}
      </div>

      {/* Sub-label */}
      <div className="text-[11px] text-gray-400 dark:text-slate-500">
        {group.hasSens > 0
          ? <><span className="tabular-nums font-medium">{sensPctInt}%</span> of {fmt(group.total)} total</>
          : 'no sensitive data access'
        }
      </div>

      {/* Sensitive access bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
        <div className="h-full rounded-full"
          style={{ width: `${Math.max(4, sensPct * 100)}%`, backgroundColor: group.key === 'unknown' ? '#f43f5e' : '#3b82f6', opacity: 0.7 }} />
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IdentityRiskSection({
  onNavigate,
}: {
  onNavigate?: (tab: string, filter?: string) => void;
}) {
  const sensPct = Math.round((W_SENS / TOTAL) * 100);

  return (
    <WidgetCard className="p-5">
      {/* Card header */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Identities</h3>
        <span className="text-[11px] text-gray-400 dark:text-slate-500">
          <span className="font-medium text-gray-600 dark:text-slate-300">{fmt(W_SENS)}</span>
          {` (${sensPct}%) with sensitive data access · `}
          <span className="font-medium text-gray-600 dark:text-slate-300">{fmt(TOTAL)}</span>
          {' total'}
        </span>
      </div>

      {/* Group tiles */}
      <div className="flex items-stretch gap-2">
        {GROUPS.map(g => (
          <GroupTile
            key={g.key}
            group={g}
            onClick={() => onNavigate?.('inventory', `group:${g.key}`)}
          />
        ))}
      </div>
    </WidgetCard>
  );
}
