import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Database, Network, Eye, EyeOff, ChevronRight, X } from 'lucide-react';
import { WidgetCard } from '../ui/WidgetCard';
import {
  AreaChart, Area, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { InfoTooltip } from '../ui/tooltip';
import { TYPE_TO_CATEGORY, CATEGORIES } from '../../shared/taxonomy';

type DARRange = 7 | 30 | 60 | 90;

// ─── Category chip (uses taxonomy single source of truth) ────────────────────

function CatChip({ label }: { label: string }) {
  const cat = CATEGORIES.find(c => c.key === label);
  if (!cat) return null;
  // Use 500-level color (same as bar chart) with 12% opacity background
  const color = cat.color;
  const bg = color + '1f'; // ~12% opacity hex
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px',
      borderRadius: '99px', background: bg, color,
      letterSpacing: '0.03em', display: 'inline-block', flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

// ─── Dark-mode hook ────────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Number formatter ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000)   return n.toLocaleString();
  return `${n}`;
}

// ─── Data Types ───────────────────────────────────────────────────────────────

// Colors using 500-level to match inventory legend dots on light background:
// PII=#3b82f6  SPII=#ef4444  PSI=#f97316  PCI=#eab308
// PFI=#10b981  PHI=#06b6d4  PAI=#a855f7  BII=#ec4899
const FOUND_TYPES = [
  // ── Both DAR & DIM ──
  { key: 'personal-names',       label: 'Personal Names',           color: '#3b82f6', darFiles:  42000, darCols:  28000, darChange: +5,  dimUpT:  48000, dimDownT:  18000 }, // PII
  { key: 'payment-cards',        label: 'Payment Cards',            color: '#eab308', darFiles:  28000, darCols:  18000, darChange: -9,  dimUpT:  52000, dimDownT:  24000 }, // PCI
  { key: 'email-addresses',      label: 'Email Addresses',          color: '#3b82f6', darFiles:  16000, darCols:  11000, darChange: +1,  dimUpT:  28000, dimDownT:   9000 }, // PII
  { key: 'ssn',                  label: 'Social Security Numbers',  color: '#ef4444', darFiles:  12000, darCols:   8500, darChange: -1,  dimUpT:  22000, dimDownT:   8000 }, // SPII
  { key: 'bank-accounts',        label: 'Bank Account Information', color: '#10b981', darFiles:   9800, darCols:   6600, darChange: +1,  dimUpT:  18000, dimDownT:   6500 }, // PFI
  { key: 'ip-addresses',         label: 'IP Addresses',             color: '#3b82f6', darFiles:   7200, darCols:   4800, darChange: -1,  dimUpT:  12000, dimDownT:   4200 }, // PII
  { key: 'passwords',            label: 'Passwords',                color: '#a855f7', darFiles:   5800, darCols:   3900, darChange: -10, dimUpT:   8400, dimDownT:   2800 }, // PAI
  { key: 'telephone-numbers',    label: 'Telephone Numbers',        color: '#3b82f6', darFiles:   4200, darCols:   2800, darChange: +2,  dimUpT:   5200, dimDownT:   1800 }, // PII
  { key: 'postal-addresses',     label: 'Postal Addresses',         color: '#3b82f6', darFiles:   3400, darCols:   2300, darChange:  0,  dimUpT:   4200, dimDownT:   1400 }, // PII
  { key: 'driver-licenses',      label: 'Driver Licenses',          color: '#ef4444', darFiles:   3100, darCols:   2100, darChange: -2,  dimUpT:   3800, dimDownT:   1200 }, // SPII
  { key: 'financial-ids',        label: 'Financial IDs',            color: '#10b981', darFiles:   2400, darCols:   1600, darChange: +1,  dimUpT:   3200, dimDownT:    980 }, // PFI
  { key: 'national-ids',         label: 'National IDs',             color: '#ef4444', darFiles:   1800, darCols:   1200, darChange:  0,  dimUpT:   2400, dimDownT:    720 }, // SPII
  { key: 'birthdates',           label: 'Birthdates',               color: '#3b82f6', darFiles:    980, darCols:    660, darChange:  0,  dimUpT:   1200, dimDownT:    350 }, // PII
  { key: 'healthcare-ids',       label: 'Healthcare IDs',           color: '#06b6d4', darFiles:    840, darCols:    560, darChange:  0,  dimUpT:    980, dimDownT:    280 }, // PHI
  { key: 'gender',               label: 'Gender',                   color: '#f97316', darFiles:    380, darCols:    250, darChange:  0,  dimUpT:    420, dimDownT:    110 }, // PSI
  { key: 'age',                  label: 'Age',                      color: '#f97316', darFiles:    340, darCols:    220, darChange:  0,  dimUpT:    380, dimDownT:     95 }, // PSI
  { key: 'source-code',          label: 'Source Code',              color: '#ec4899', darFiles:      0, darCols:    180, darChange:  0,  dimUpT:    120, dimDownT:     30 }, // BII
  { key: 'uuids',                label: 'UUIDs',                    color: '#3b82f6', darFiles:      0, darCols:    160, darChange:  0,  dimUpT:     90, dimDownT:     22 }, // PII
  { key: 'medical-diagnoses',    label: 'Medical Diagnoses',        color: '#06b6d4', darFiles:      0, darCols:    140, darChange:  0,  dimUpT:     80, dimDownT:     20 }, // PHI
  { key: 'physical-chars',       label: 'Physical Characteristics', color: '#f97316', darFiles:      0, darCols:    120, darChange:  0,  dimUpT:     60, dimDownT:     15 }, // PSI
  { key: 'ethnicity-race',       label: 'Ethnicity and Race',       color: '#f97316', darFiles:      0, darCols:    100, darChange:  0,  dimUpT:     50, dimDownT:     12 }, // PSI
  { key: 'corporate-tax-ids',    label: 'Corporate Tax IDs',        color: '#ec4899', darFiles:      0, darCols:     80, darChange:  0,  dimUpT:     40, dimDownT:     10 }, // BII
  // ── DAR only ──
  { key: 'private-keys',         label: 'Private Keys',             color: '#a855f7', darFiles:   1400, darCols:      0, darChange: -1,  dimUpT:      0, dimDownT:      0 }, // PAI
  { key: 'passports',            label: 'Passports',                color: '#ef4444', darFiles:   1200, darCols:      0, darChange:  0,  dimUpT:      0, dimDownT:      0 }, // SPII
  { key: 'medical-records',      label: 'Medical Records',          color: '#06b6d4', darFiles:    720, darCols:      0, darChange:  0,  dimUpT:      0, dimDownT:      0 }, // PHI
  { key: 'biometric-data',       label: 'Biometric Data',           color: '#06b6d4', darFiles:    480, darCols:      0, darChange:  0,  dimUpT:      0, dimDownT:      0 }, // PHI
  { key: 'healthcare-providers', label: 'Healthcare Provider IDs',  color: '#06b6d4', darFiles:      0, darCols:     60, darChange:  0,  dimUpT:      0, dimDownT:      0 }, // PHI
  // ── DIM only ──
  { key: 'postal-codes',         label: 'Postal Codes',             color: '#3b82f6', darFiles:      0, darCols:      0, darChange:  0,  dimUpT:    240, dimDownT:     60 }, // PII
  { key: 'domain-names',         label: 'Domain Names',             color: '#3b82f6', darFiles:      0, darCols:      0, darChange:  0,  dimUpT:    180, dimDownT:     45 }, // PII
  { key: 'mac-addresses',        label: 'MAC Addresses',            color: '#3b82f6', darFiles:      0, darCols:      0, darChange:  0,  dimUpT:    150, dimDownT:     38 }, // PII
];

const TOTAL_TYPES = 57;

const DAR_RANKED = FOUND_TYPES
  .map(t => ({ ...t, darTotal: t.darFiles + t.darCols }))
  .filter(t => t.darTotal > 0)
  .sort((a, b) => b.darTotal - a.darTotal);

const DIM_RANKED = FOUND_TYPES
  .map(t => ({ ...t, dimTotal: t.dimUpT + t.dimDownT }))
  .filter(t => t.dimTotal > 0)
  .sort((a, b) => b.dimTotal - a.dimTotal);

const DAR_GRAND_TOTAL = FOUND_TYPES.reduce((s, t) => s + t.darFiles + t.darCols, 0);
const DIM_GRAND_TOTAL = FOUND_TYPES.reduce((s, t) => s + t.dimUpT + t.dimDownT, 0);

// ─── Trend data ───────────────────────────────────────────────────────────────

function genDARTrend(days: number) {
  const data = [];
  let sc = 89_000, se = 27_400;
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    sc = Math.max(82_000, Math.min(98_000, sc + (i % 3 === 0 ? 1_200 : -800)));
    se = Math.max(22_000, Math.min(34_000, se + (i % 4 === 0 ? 900 : -580)));
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      scanned:   Math.round(sc),
      sensitive: Math.round(se),
    });
  }
  return data;
}

const DIM_TREND = (() => {
  const seeds    = [84_000, 91_000, 78_000, 96_000, 88_000, 102_000, 110_000];
  const uploads  = [38_000, 42_000, 35_000, 48_000, 41_000,  52_000,  56_000];
  const downloads= [14_000, 17_000, 12_000, 20_000, 15_000,  22_000,  24_000];
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - idx));
    return {
      date:      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      scanned:   seeds[idx],
      uploads:   uploads[idx],
      downloads: downloads[idx],
    };
  });
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSlices(items: { key: string; label: string; color: string; value: number }[], topN: number) {
  return items.slice(0, topN).map(t => ({ key: t.key, label: t.label, color: t.color, value: t.value }));
}

function ChgBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-[9px] text-gray-300 dark:text-slate-600 tabular-nums">—</span>;
  const color = value > 0 ? '#3b82f6' : '#9ca3af';
  return (
    <span className="text-[9px] font-medium tabular-nums" style={{ color }}>
      {value > 0 ? '+' : ''}{value}%
    </span>
  );
}

// ─── Range toggle ─────────────────────────────────────────────────────────────

function RangeToggle({ value, onChange, fixedLabel }: {
  value: DARRange; onChange: (v: DARRange) => void; fixedLabel?: string;
}) {
  if (fixedLabel) {
    return (
      <div className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-400 dark:text-slate-500 select-none">
        {fixedLabel}
      </div>
    );
  }
  return (
    <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
      {([7, 30, 60, 90] as DARRange[]).map(d => (
        <button key={d} onClick={() => onChange(d)}
          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
            value === d
              ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
              : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

// ─── Cursor popover ───────────────────────────────────────────────────────────

interface HovState { key: string; x: number; y: number; }

function CursorPopover({ hov, children }: { hov: HovState | null; children: (key: string) => React.ReactNode }) {
  if (!hov) return null;
  const PW = 196;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  let x = hov.x + 16, y = hov.y + 16;
  if (x + PW > vw - 8) x = hov.x - PW - 8;
  if (y + 200 > vh - 8) y = hov.y - 200 - 8;
  return (
    <div className="pointer-events-none" style={{ position: 'fixed', top: y, left: x, width: PW, zIndex: 9999 }}>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3"
        style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.16)' }}>
        {children(hov.key)}
      </div>
    </div>
  );
}

// ─── Popovers ─────────────────────────────────────────────────────────────────

function DARPopContent({ typeKey }: { typeKey: string }) {
  if (typeKey === '__other__') {
    const smallTypes = DAR_RANKED.filter(t => t.darTotal / DAR_GRAND_TOTAL < 0.03);
    const smallTotal = smallTypes.reduce((s, t) => s + t.darTotal, 0);
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-500 shrink-0" />
          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200">Other types</span>
        </div>
        <p className="text-[13px] font-black text-gray-500 dark:text-slate-400 tabular-nums mb-1">
          {fmt(smallTotal)}
        </p>
        <p className="text-[9px] text-gray-400 dark:text-slate-500">{smallTypes.length} types grouped</p>
      </div>
    );
  }
  const t = FOUND_TYPES.find(x => x.key === typeKey);
  if (!t) return null;
  const total = t.darFiles + t.darCols;
  const cat = TYPE_TO_CATEGORY[t.label];
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {cat && <CatChip label={cat} />}
        <span className="text-[11px] font-semibold text-gray-800 dark:text-slate-100">{t.label}</span>
      </div>
      <p className="text-[13px] font-black tabular-nums mb-2.5" style={{ color: t.color }}>
        {fmt(total)}
      </p>
      <div className="space-y-1.5 border-t border-gray-50 dark:border-slate-700 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 dark:text-slate-400">Files</span>
          <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-200">{fmt(t.darFiles)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 dark:text-slate-400">Columns</span>
          <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-200">{fmt(t.darCols)}</span>
        </div>
      </div>
    </div>
  );
}

function DIMPopContent({ typeKey }: { typeKey: string }) {
  if (typeKey === '__other__') {
    const smallTypes = DIM_RANKED.filter(t => t.dimTotal / DIM_GRAND_TOTAL < 0.03);
    const smallTotal = smallTypes.reduce((s, t) => s + t.dimTotal, 0);
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-500 shrink-0" />
          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200">Other types</span>
        </div>
        <p className="text-[13px] font-black text-gray-500 dark:text-slate-400 tabular-nums mb-1">
          {fmt(smallTotal)}
        </p>
        <p className="text-[9px] text-gray-400 dark:text-slate-500">{smallTypes.length} types grouped</p>
      </div>
    );
  }
  const t = FOUND_TYPES.find(x => x.key === typeKey);
  if (!t) return null;
  const total = t.dimUpT + t.dimDownT;
  const cat = TYPE_TO_CATEGORY[t.label];
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {cat && <CatChip label={cat} />}
        <span className="text-[11px] font-semibold text-gray-800 dark:text-slate-100">{t.label}</span>
      </div>
      <p className="text-[13px] font-black tabular-nums mb-2.5" style={{ color: t.color }}>
        {fmt(total)}
      </p>
      <div className="space-y-1.5 border-t border-gray-50 dark:border-slate-700 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 dark:text-slate-400">Uploaded objects</span>
          <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-200">{fmt(t.dimUpT)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 dark:text-slate-400">Downloaded objects</span>
          <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-200">{fmt(t.dimDownT)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Rank row ─────────────────────────────────────────────────────────────────

function RankRow({ rank, label, color, value, maxValue, display, change = 0, showChange = true, isActive, isDimmed, onEnter = () => {}, onMove = () => {}, onLeave = () => {}, dark }: {
  rank: number; label: string; color: string;
  value: number; maxValue: number; display: string;
  change?: number; showChange?: boolean;
  isActive: boolean; isDimmed: boolean;
  onEnter?: (e: React.MouseEvent) => void;
  onMove?:  (e: React.MouseEvent) => void;
  onLeave?: () => void;
  dark?: boolean;
}) {
  const pct = Math.max(4, (value / maxValue) * 100);
  const barBg = dark ? '#1e293b' : '#f1f5f9';
  const labelColor = isActive ? color : (dark ? '#cbd5e1' : '#374151');
  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none rounded-md"
      style={{ height: 26, paddingInline: '4px 3px', opacity: isDimmed ? 0.18 : 1, transition: 'opacity 0.12s', backgroundColor: isActive ? `${color}18` : 'transparent' }}
      onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}
    >
      <span className="text-[9px] text-gray-300 dark:text-slate-600 tabular-nums shrink-0" style={{ width: 11, textAlign: 'right' }}>{rank}</span>
      <span className="text-[10px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ width: 148, color: labelColor, fontWeight: isActive ? 600 : 400, transition: 'color 0.1s' }}>
        {label}
      </span>
      <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: barBg, minWidth: 40 }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 99, opacity: isActive ? 1 : 0.65 }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums shrink-0 whitespace-nowrap" style={{ width: 56, textAlign: 'right', color }}>{display}</span>
      <div className="shrink-0" style={{ width: 30, textAlign: 'right' }}>
        {showChange && <ChgBadge value={change} />}
      </div>
    </div>
  );
}

// ─── Card donut ───────────────────────────────────────────────────────────────

function CardDonut({ slices, centerBig, centerSub, hovKey, onSliceEnter, onSliceMove, onSliceLeave, dark }: {
  slices: { key: string; label: string; color: string; value: number }[];
  centerBig: string; centerSub: string; hovKey: string | null;
  onSliceEnter: (key: string, e: React.MouseEvent) => void;
  onSliceMove:  (key: string, e: React.MouseEvent) => void;
  onSliceLeave: () => void;
  dark?: boolean;
}) {
  const SIZE = 152;
  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <PieChart width={SIZE} height={SIZE}>
        <Pie data={slices} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={1}
          stroke="none" startAngle={90} endAngle={-270} onMouseLeave={onSliceLeave}
          animationBegin={0} animationDuration={900}>
          {slices.map(s => (
            <Cell key={s.key} fill={s.color}
              opacity={hovKey === null ? 1 : hovKey === s.key ? 1 : 0.22}
              style={{ cursor: 'pointer', outline: 'none' }}
              onMouseEnter={(e: any) => onSliceEnter(s.key, e)}
              onMouseMove={(e: any)  => onSliceMove(s.key, e)}
              onMouseLeave={onSliceLeave}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[20px] font-black tabular-nums leading-none" style={{ color: dark ? '#f1f5f9' : '#111827' }}>{centerBig}</span>
        <span className="text-[8px] mt-0.5 text-center leading-snug" style={{ maxWidth: 56, color: dark ? '#64748b' : '#9ca3af' }}>{centerSub}</span>
      </div>
    </div>
  );
}

// ─── Large donut (side panel) ─────────────────────────────────────────────────

function LargeDonut({ slices, centerBig, centerSub, hovKey, onSliceEnter, onSliceMove, onSliceLeave }: {
  slices: { key: string; label: string; color: string; value: number }[];
  centerBig: string; centerSub: string; hovKey: string | null;
  onSliceEnter: (key: string, e: React.MouseEvent) => void;
  onSliceMove:  (key: string, e: React.MouseEvent) => void;
  onSliceLeave: () => void;
}) {
  return (
    <div className="relative mx-auto" style={{ width: 196, height: 196 }}>
      <PieChart width={196} height={196}>
        <Pie data={slices} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={1}
          stroke="none" startAngle={90} endAngle={-270} onMouseLeave={onSliceLeave}
          animationBegin={0} animationDuration={900}>
          {slices.map(s => (
            <Cell key={s.key} fill={s.color}
              opacity={hovKey === null ? 1 : hovKey === s.key ? 1 : 0.18}
              style={{ cursor: 'pointer', outline: 'none' }}
              onMouseEnter={(e: any) => onSliceEnter(s.key, e)}
              onMouseMove={(e: any)  => onSliceMove(s.key, e)}
              onMouseLeave={onSliceLeave}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[26px] font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none">{centerBig}</span>
        <span className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 text-center leading-snug" style={{ maxWidth: 76 }}>{centerSub}</span>
      </div>
    </div>
  );
}

// ─── Chart tooltips ───────────────────────────────────────────────────────────

const DARChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const order = ['scanned', 'sensitive'];
  const sorted = [...payload].sort((a, b) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey));
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-lg px-3 py-2 text-[10px]">
      <p className="text-gray-500 dark:text-slate-400 mb-1.5">{label}</p>
      {sorted.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-5 mb-0.5">
          <span className="text-gray-400 dark:text-slate-500 capitalize">{p.dataKey}</span>
          <span className="font-semibold text-gray-700 dark:text-slate-200">{fmt(p.value as number)}&nbsp;B</span>
        </div>
      ))}
    </div>
  );
};

const DIMChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const order = ['scanned', 'uploads', 'downloads'];
  const sorted = [...payload].sort((a, b) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey));
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-lg px-3 py-2 text-[10px]">
      <p className="text-gray-500 dark:text-slate-400 mb-1.5">{label}</p>
      {sorted.map((p: any) => {
        const label = p.dataKey === 'uploads' ? 'Sensitive Uploads'
          : p.dataKey === 'downloads' ? 'Sensitive Downloads'
          : p.dataKey === 'scanned' ? 'Scanned' : p.dataKey;
        return (
          <div key={p.dataKey} className="flex justify-between gap-5 mb-0.5">
            <span className="text-gray-400 dark:text-slate-500">{label}</span>
            <span className="font-semibold text-gray-700 dark:text-slate-200">{fmt(p.value as number)}&nbsp;B</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── All Types Side Panel ─────────────────────────────────────────────────────

function AllTypesPanel({ kind, onClose, onNavigate }: {
  kind: 'dar' | 'dim'; onClose: () => void;
  onNavigate?: (tab: string, filter?: string) => void;
}) {
  const isDar  = kind === 'dar';
  const ranked = isDar ? DAR_RANKED : DIM_RANKED;
  const dark   = useDarkMode();
  const maxVal = isDar ? (DAR_RANKED[0]?.darTotal ?? 1) : (DIM_RANKED[0]?.dimTotal ?? 1);
  const [hov, setHov] = useState<HovState | null>(null);
  const enter = (key: string, e: React.MouseEvent) => setHov({ key, x: e.clientX, y: e.clientY });
  const move  = (key: string, e: React.MouseEvent) => setHov(h => h ? { ...h, x: e.clientX, y: e.clientY } : null);
  const leave = () => setHov(null);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl" style={{ width: 480 }}>
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-slate-100">
              {isDar ? 'Stored Data (DAR)' : 'Data in Motion (DIM)'}
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{ranked.length} of {TOTAL_TYPES} sensitive data types found</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
          <p className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500 mb-2">All Types Ranked by Volume</p>
          {ranked.map((t, i) => {
            const val  = isDar ? t.darTotal : t.dimTotal;
            const disp = fmt(val);
            return (
              <div key={t.key}
                className="rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                onClick={() => { onClose(); onNavigate?.('data-explorer', isDar ? t.label : `dim:${t.label}`); }}>
                <RankRow rank={i + 1} label={t.label} color={t.color} value={val} maxValue={maxVal}
                  display={disp} showChange={false}
                  isActive={hov?.key === t.key} isDimmed={false}
                  onEnter={e => enter(t.key, e)} onMove={e => move(t.key, e)} onLeave={leave}
                  dark={dark} />
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-center shrink-0">
          <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:underline transition-colors"
            onClick={() => { onClose(); onNavigate?.('data-explorer', kind.toUpperCase()); }}>
            Go to Data Explorer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <CursorPopover hov={hov}>
        {key => isDar ? <DARPopContent typeKey={key} /> : <DIMPopContent typeKey={key} />}
      </CursorPopover>
    </>
  );
}

// ─── Legend item ──────────────────────────────────────────────────────────────

function LegendItem({ color, shape = 'line', label, clickable, active, onClick }: {
  color: string; shape?: 'line' | 'square';
  label: string; clickable?: boolean; active?: boolean; onClick?: () => void;
}) {
  const swatch = (c: string) => shape === 'line'
    ? <div className="w-full h-[2px] rounded-full" style={{ backgroundColor: c }} />
    : <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />;

  if (clickable) {
    const col = active === false ? '#9ca3af' : color;
    return (
      <button
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-all ${
          active === false
            ? 'opacity-50'
            : 'hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
        onClick={onClick}
      >
        <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{swatch(col)}</div>
        <span className="text-[10px] text-gray-600 dark:text-slate-300 select-none">{label}</span>
        <div className={`ml-0.5 rounded p-0.5 transition-colors ${
          active === false
            ? 'text-gray-300 dark:text-slate-600'
            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
        }`}>
          {active === false
            ? <EyeOff className="w-3.5 h-3.5" />
            : <Eye    className="w-3.5 h-3.5" />
          }
        </div>
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{swatch(color)}</div>
      <span className="text-[10px] text-gray-500 dark:text-slate-400 select-none">{label}</span>
    </div>
  );
}

// ─── DAR Card ─────────────────────────────────────────────────────────────────

function DARCard({ onNavigate, solo = false }: { onNavigate?: (tab: string, filter?: string) => void; solo?: boolean }) {
  const [range, setRange]      = useState<DARRange>(30);
  const [showScanned, setShow] = useState(true);
  const [showPanel, setPanel]  = useState(false);
  const [hov, setHov]          = useState<HovState | null>(null);
  const dark   = useDarkMode();
  const animKey = `dar-${range}`;

  const trend  = useMemo(() => genDARTrend(range), [range]);
  const lastPt = trend[trend.length - 1] ?? { scanned: 91_000, sensitive: 28_400 };
  const hovKey = hov?.key ?? null;
  const enter  = (key: string, e: React.MouseEvent) => setHov({ key, x: e.clientX, y: e.clientY });
  const move   = (key: string, e: React.MouseEvent) => setHov(h => h ? { ...h, x: e.clientX, y: e.clientY } : null);
  const leave  = () => setHov(null);

  const gridStroke = dark ? '#1e293b' : '#e5e7eb';
  const tickColor  = dark ? '#475569' : '#9ca3af';

  const yDomain = useMemo<[number, number]>(() => {
    if (showScanned) return [0, 110_000];
    const maxSens = Math.max(...trend.map(d => d.sensitive));
    const top = Math.ceil(maxSens * 1.4 / 5_000) * 5_000;
    return [0, top];
  }, [showScanned, trend]);
  const yTicks = useMemo(() => {
    const [, top] = yDomain;
    return [0, Math.round(top / 2), top];
  }, [yDomain]);

  return (
    <>
      <WidgetCard className={`flex-1 min-w-0 rounded-2xl overflow-hidden ${solo ? 'flex flex-row' : 'flex flex-col'}`}>
        {/* Trend section */}
        <div className={solo ? 'flex flex-col flex-1 min-w-0 border-r border-gray-100 dark:border-slate-700' : ''}>
        {/* Header */}
        <div className="px-5 pt-4 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-[12px] font-semibold text-gray-900 dark:text-slate-100">Stored Data</span>
              <span className="text-[11px] text-gray-400 dark:text-slate-500">(Data-at-Rest)</span>
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500 mb-2 block">Trend</span>
          <div className="flex items-baseline gap-5 mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(lastPt.scanned)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Bytes scanned</span>
              <InfoTooltip text={`Cumulative volume scanned over the selected ${range}d timeframe`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(lastPt.sensitive)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Bytes sensitive</span>
              <InfoTooltip text={`Cumulative sensitive data volume detected over the selected ${range}d timeframe`} />
            </div>
          </div>
        </div>

        {/* Area chart */}
        <div className={`px-2 ${solo ? 'flex-1 min-h-0' : 'shrink-0'}`} style={solo ? {} : { height: 108 }}>
          <ResponsiveContainer width="100%" height={solo ? '100%' : 108} minWidth={0} minHeight={0}>
            <AreaChart key={animKey} data={trend} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="darGradSens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={dark ? 0.35 : 0.22} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="darGradScan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={dark ? 0.25 : 0.14} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fill: tickColor, fontSize: 8 }} minTickGap={range === 7 ? 10 : 22} dy={4} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 8 }} width={34}
                tickFormatter={v => fmt(v)} domain={yDomain} ticks={yTicks} />
              <ReTooltip content={<DARChartTip />} />
              <Area type="monotone" dataKey="sensitive" stroke="#ef4444" strokeWidth={2} fill="url(#darGradSens)"
                dot={false} animationBegin={0} animationDuration={1100} animationEasing="ease-out"
                activeDot={{ r: 3, strokeWidth: 0, fill: '#ef4444' }} />
              {showScanned && (
                <Area type="monotone" dataKey="scanned" stroke="#6366f1" strokeWidth={2.5} fill="url(#darGradScan)"
                  dot={false} animationBegin={100} animationDuration={1100} animationEasing="ease-out"
                  activeDot={{ r: 3.5, strokeWidth: 0, fill: '#6366f1' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-1 pb-3 shrink-0">
          <LegendItem color="#6366f1" shape="line" label="Scanned" clickable active={showScanned} onClick={() => setShow(v => !v)} />
          <LegendItem color="#ef4444" shape="line" label="Sensitive" />
        </div>

        {!solo && <div className="h-px bg-gray-100 dark:bg-slate-700 mx-4 shrink-0" />}
        </div>{/* end DAR trend section */}

        {/* DAR Findings section */}
        <div className={solo ? 'flex flex-col flex-1 min-w-0' : ''}>
        <div className="px-5 pt-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Findings</span>
            <div className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-400 dark:text-slate-500 select-none">Current State</div>
          </div>
          <div className="flex items-baseline gap-5 mb-3 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(DAR_GRAND_TOTAL)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects found</span>
              <InfoTooltip text="Total sensitive files and columns currently found across all connected data stores." />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{DAR_RANKED.length}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">data types</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Top 7 by object</span>
            <button onClick={() => setPanel(true)} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:underline transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {DAR_RANKED.slice(0, 7).map((t, i) => {
            return (
              <div key={t.key} onClick={() => onNavigate?.('data-explorer', t.label)}>
                <RankRow rank={i + 1} label={t.label} color={t.color} value={t.darTotal} maxValue={DAR_RANKED[0]?.darTotal ?? 1}
                  display={fmt(t.darTotal)} showChange={false}
                  isActive={hovKey === t.key} isDimmed={false}
                  onEnter={e => enter(t.key, e)} onMove={e => move(t.key, e)} onLeave={leave}
                  dark={dark} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-center px-5 py-3 mt-3 border-t border-gray-100 dark:border-slate-700 shrink-0">
          <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors"
            onClick={() => onNavigate?.('data-explorer', 'DAR')}>
            Go to Data Explorer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        </div>{/* end DAR findings section */}
      </WidgetCard>

      {showPanel && <AllTypesPanel kind="dar" onClose={() => setPanel(false)} onNavigate={onNavigate} />}
      <CursorPopover hov={hov}>{key => <DARPopContent typeKey={key} />}</CursorPopover>
    </>
  );
}

// ─── DIM Card ─────────────────────────────────────────────────────────────────

function DIMCard({ onNavigate, solo = false }: { onNavigate?: (tab: string, filter?: string) => void; solo?: boolean }) {
  const [showScanned, setShow] = useState(true);
  const [showPanel, setPanel]  = useState(false);
  const [hov, setHov]          = useState<HovState | null>(null);
  const dark = useDarkMode();

  const hovKey = hov?.key ?? null;
  const enter  = (key: string, e: React.MouseEvent) => setHov({ key, x: e.clientX, y: e.clientY });
  const move   = (key: string, e: React.MouseEvent) => setHov(h => h ? { ...h, x: e.clientX, y: e.clientY } : null);
  const leave  = () => setHov(null);

  const totalSc = DIM_TREND.reduce((s, d) => s + d.scanned,   0);
  const totalUp = DIM_TREND.reduce((s, d) => s + d.uploads,   0);
  const totalDn = DIM_TREND.reduce((s, d) => s + d.downloads, 0);

  const gridStroke = dark ? '#1e293b' : '#e5e7eb';
  const tickColor  = dark ? '#475569' : '#9ca3af';

  return (
    <>
      <WidgetCard className={`flex-1 min-w-0 rounded-2xl overflow-hidden ${solo ? 'flex flex-row' : 'flex flex-col'}`}>
        {/* DIM Trend section */}
        <div className={solo ? 'flex flex-col flex-1 min-w-0 border-r border-gray-100 dark:border-slate-700' : ''}>
        {/* Header */}
        <div className="px-5 pt-4 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-[12px] font-semibold text-gray-900 dark:text-slate-100">Transferred Data</span>
              <span className="text-[11px] text-gray-400 dark:text-slate-500">(Data-in-Motion)</span>
            </div>
            <RangeToggle value={7} onChange={() => {}} fixedLabel="Last 7 Days" />
          </div>
          <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500 mb-2 block">Trend</span>
          <div className="flex items-baseline gap-5 mb-3 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(totalSc)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Bytes scanned</span>
              <InfoTooltip text="Cumulative volume scanned over the last 7 days" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(totalUp)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Bytes sensitive uploaded</span>
              <InfoTooltip text="Cumulative sensitive data uploaded over the last 7 days" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(totalDn)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Bytes sensitive downloaded</span>
              <InfoTooltip text="Cumulative sensitive data downloaded over the last 7 days" />
            </div>
          </div>
        </div>

        {/* Stacked bar + scanned line */}
        <div className={`px-2 ${solo ? 'flex-1 min-h-0' : 'shrink-0'}`} style={solo ? {} : { height: 108 }}>
          <ResponsiveContainer width="100%" height={solo ? '100%' : 108} minWidth={0} minHeight={0}>
            <ComposedChart key="dim-trend" data={DIM_TREND} barCategoryGap="28%" margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dimGradScan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={dark ? 0.25 : 0.12} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fill: tickColor, fontSize: 8 }} dy={4} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 8 }} width={34}
                tickFormatter={v => fmt(v)} />
              <ReTooltip content={<DIMChartTip />} />
              <Bar dataKey="downloads" stackId="s" fill="#f87171" radius={[0,0,0,0]}
                animationBegin={0} animationDuration={900} animationEasing="ease-out" />
              <Bar dataKey="uploads"   stackId="s" fill="#fb923c" radius={[3,3,0,0]}
                animationBegin={0} animationDuration={900} animationEasing="ease-out" />
              {showScanned && (
                <Area type="monotone" dataKey="scanned" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#dimGradScan)" dot={false}
                  animationBegin={150} animationDuration={1100} animationEasing="ease-out"
                  activeDot={{ r: 3.5, strokeWidth: 0, fill: '#6366f1' }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-1 pb-3 shrink-0">
          <LegendItem color="#6366f1" shape="line" label="Scanned" clickable active={showScanned} onClick={() => setShow(v => !v)} />
          <LegendItem color="#fb923c" shape="square" label="Sensitive Uploads" />
          <LegendItem color="#f87171" shape="square" label="Sensitive Downloads" />
        </div>

        {!solo && <div className="h-px bg-gray-100 dark:bg-slate-700 mx-4 shrink-0" />}
        </div>{/* end DIM trend section */}

        {/* DIM Findings section */}
        <div className={solo ? 'flex flex-col flex-1 min-w-0' : ''}>
        <div className="px-5 pt-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Findings</span>
            <div className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-400 dark:text-slate-500 select-none">Current State</div>
          </div>
          <div className="flex items-baseline gap-5 mb-3 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{fmt(DIM_GRAND_TOTAL)}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">sensitive objects transferred</span>
              <InfoTooltip text="Total sensitive objects currently uploaded or downloaded across all monitored destinations." />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-gray-800 dark:text-slate-100 tabular-nums leading-none">{DIM_RANKED.length}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">data types</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8.5px] font-bold tracking-wide text-gray-400 dark:text-slate-500">Top 7 by object</span>
            <button onClick={() => setPanel(true)} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:underline transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {DIM_RANKED.slice(0, 7).map((t, i) => {
            return (
              <div key={t.key} onClick={() => onNavigate?.('data-explorer', `dim:${t.label}`)}>
                <RankRow rank={i + 1} label={t.label} color={t.color} value={t.dimTotal} maxValue={DIM_RANKED[0]?.dimTotal ?? 1}
                  display={fmt(t.dimTotal)} showChange={false}
                  isActive={hovKey === t.key} isDimmed={false}
                  onEnter={e => enter(t.key, e)} onMove={e => move(t.key, e)} onLeave={leave}
                  dark={dark} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-center px-5 py-3 mt-3 border-t border-gray-100 dark:border-slate-700 shrink-0">
          <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline transition-colors"
            onClick={() => onNavigate?.('data-explorer', 'DIM')}>
            Go to Data Explorer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        </div>{/* end DIM findings section */}
      </WidgetCard>

      {showPanel && <AllTypesPanel kind="dim" onClose={() => setPanel(false)} onNavigate={onNavigate} />}
      <CursorPopover hov={hov}>{key => <DIMPopContent typeKey={key} />}</CursorPopover>
    </>
  );
}

// ─── Group small donut slices below threshold into "Other" (grey) ──────────────

function groupSmallSlices(
  slices: { key: string; label: string; color: string; value: number }[],
  threshold = 0.03
) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return slices;
  const main  = slices.filter(s => s.value / total >= threshold);
  const small = slices.filter(s => s.value / total < threshold);
  if (small.length === 0) return main;
  return [
    ...main,
    {
      key:   '__other__',
      label: `Other (${small.length} types)`,
      color: '#d1d5db',
      value: small.reduce((s, o) => s + o.value, 0),
    },
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function DataFlowMap({ onNavigate, showDAR = true, showDIM = true }: {
  onNavigate?: (tab: string, filter?: string) => void;
  showDAR?: boolean;
  showDIM?: boolean;
}) {
  // When only one card is shown, pass solo=true so it uses a horizontal layout
  const solo = showDAR !== showDIM;
  return (
    <div className="flex gap-5">
      {showDAR && <DARCard onNavigate={onNavigate} solo={solo} />}
      {showDIM && <DIMCard onNavigate={onNavigate} solo={solo} />}
    </div>
  );
}