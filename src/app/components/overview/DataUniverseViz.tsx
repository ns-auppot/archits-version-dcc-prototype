import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Network, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

// ─── Type Colors & Labels ─────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  'personal-names':  '#ef4444',
  'payment-cards':   '#f97316',
  'email-addresses': '#eab308',
  'ssn':             '#8b5cf6',
  'bank-accounts':   '#6366f1',
  'ip-addresses':    '#ec4899',
  'passwords':       '#10b981',
  'private-keys':    '#06b6d4',
};

const TYPE_LABEL: Record<string, string> = {
  'personal-names':  'Personal Names',
  'payment-cards':   'Credit / Payment Cards',
  'email-addresses': 'Email Addresses',
  'ssn':             'Social Security Nos.',
  'bank-accounts':   'Bank Account Info',
  'ip-addresses':    'IP Addresses',
  'passwords':       'Passwords',
  'private-keys':    'Private Keys',
};

// ─── DAR Rankings ─────────────────────────────────────────────────────────────

const DAR_RANKED = [
  { key: 'personal-names',  count: 3_820 },
  { key: 'payment-cards',   count: 2_950 },
  { key: 'email-addresses', count: 1_450 },
  { key: 'ssn',             count: 1_230 },
  { key: 'bank-accounts',   count:   980 },
  { key: 'ip-addresses',    count:   700 },
  { key: 'passwords',       count:   560 },
  { key: 'private-keys',    count:   420 },
];

// ─── DIM Rankings ─────────────────────────────────────────────────────────────

const DIM_RANKED = [
  { key: 'passwords',       count: 4_890 }, // DAR #7 → DIM #1  ▲6  RED ALERT
  { key: 'personal-names',  count: 4_250 }, // DAR #1 → DIM #2  ▼1
  { key: 'ip-addresses',    count: 3_680 }, // DAR #6 → DIM #3  ▲3
  { key: 'email-addresses', count: 2_100 }, // DAR #3 → DIM #4  ▼1
  { key: 'private-keys',    count: 1_920 }, // DAR #8 → DIM #5  ▲3
  { key: 'payment-cards',   count: 1_540 }, // DAR #2 → DIM #6  ▼4
  { key: 'ssn',             count:   850 }, // DAR #4 → DIM #7  ▼3
  { key: 'bank-accounts',   count:   340 }, // DAR #5 → DIM #8  ▼3
];

const MAX_DAR = DAR_RANKED[0].count;
const MAX_DIM = DIM_RANKED[0].count;

const DAR_RANK: Record<string, number> = {};
DAR_RANKED.forEach((t, i) => { DAR_RANK[t.key] = i + 1; });

const DIM_RANK: Record<string, number> = {};
DIM_RANKED.forEach((t, i) => { DIM_RANK[t.key] = i + 1; });

// ─── Trend Data Generators ────────────────────────────────────────────────────

function genDARTrend(days: number) {
  const data = [];
  let sc = 1050, se = 190;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    sc = Math.max(940, Math.min(1160, sc + (Math.random() - 0.5) * 24));
    se = Math.max(140, Math.min(260,  se + (Math.random() - 0.5) * 16));
    data.push({
      date:      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      scanned:   Math.round(sc),
      sensitive: Math.round(se),
    });
  }
  return data;
}

function genDIMTrend() {
  const data = [];
  let uploads = 70, downloads = 12;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    uploads   = Math.max(40, Math.min(100, uploads   + (Math.random() - 0.5) * 20));
    downloads = Math.max(6,  Math.min(24,  downloads + (Math.random() - 0.5) * 6));
    data.push({
      date:      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      uploads:   Math.round(uploads),
      downloads: Math.round(downloads),
    });
  }
  return data;
}

// ─── Range Toggle — 7d 30d 60d 90d ───────────────────────────────────────────

type DARRange = 7 | 30 | 60 | 90;

function RangeToggle({ value, onChange }: { value: DARRange; onChange: (v: DARRange) => void }) {
  return (
    <div className="flex items-center gap-0 shrink-0">
      {([7, 30, 60, 90] as DARRange[]).map((d, i, arr) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-2 py-0.5 text-[10px] font-medium transition-all
            ${i === 0 ? 'rounded-l-md' : ''}
            ${i === arr.length - 1 ? 'rounded-r-md' : ''}
            ${value === d
              ? 'bg-gray-800 dark:bg-slate-200 text-white dark:text-slate-900'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-700'
            }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

// ─── Delta Badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none"
      style={{ backgroundColor: up ? '#dcfce7' : '#fee2e2', color: up ? '#15803d' : '#dc2626' }}
    >
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

// ─── Ranking Row ──────────────────────────────────────────────────────────────

function RankRow({
  rank, typeKey, count, maxCount,
  isHovered, isDimmed, onEnter, onLeave, animDelay,
  dimRankForHover, darRankForDelta,
}: {
  rank: number; typeKey: string; count: number; maxCount: number;
  isHovered: boolean; isDimmed: boolean;
  onEnter: () => void; onLeave: () => void; animDelay: number;
  dimRankForHover?: number; darRankForDelta?: number;
}) {
  const color = TYPE_COLOR[typeKey];
  const label = TYPE_LABEL[typeKey];
  const pct   = (count / maxCount) * 100;
  const delta = darRankForDelta !== undefined ? (darRankForDelta - rank) : undefined;
  const darDimDelta = dimRankForHover !== undefined ? (rank - dimRankForHover) : undefined;

  return (
    <motion.div
      className="relative flex items-center gap-2 rounded-lg cursor-pointer"
      style={{ height: 34, paddingLeft: 4, paddingRight: 4 }}
      animate={{ opacity: isDimmed ? 0.15 : 1 }}
      transition={{ duration: 0.13 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Hover bg */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ backgroundColor: color }}
        animate={{ opacity: isHovered ? 0.07 : 0 }}
        transition={{ duration: 0.13 }}
      />

      {/* Rank */}
      <span className="relative text-[10px] font-semibold text-gray-300 dark:text-slate-600 w-4 text-right shrink-0 tabular-nums z-10">
        {rank}
      </span>

      {/* Dot */}
      <motion.div
        className="relative rounded-full shrink-0 z-10"
        style={{ backgroundColor: color, width: 8, height: 8 }}
        animate={{ scale: isHovered ? 1.65 : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      />

      {/* Label */}
      <span className="relative w-[112px] shrink-0 text-[11px] font-medium text-gray-700 dark:text-slate-300 truncate z-10">
        {label}
      </span>

      {/* Bar track — flex-1 so it fills available space for longer bars */}
      <div className="relative flex-1 min-w-[60px] h-[8px] bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden z-10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: '0%' }}
          animate={{
            width: `${pct}%`,
            opacity: isDimmed ? 0.15 : 1,
            boxShadow: isHovered ? `0 0 8px 2px ${color}70` : 'none',
          }}
          transition={{
            width:     { duration: 0.6, delay: animDelay, ease: [0.22, 1, 0.36, 1] },
            opacity:   { duration: 0.13 },
            boxShadow: { duration: 0.15 },
          }}
        />
      </div>

      {/* Count */}
      <span
        className="relative w-[44px] text-[10px] font-bold tabular-nums text-right shrink-0 z-10"
        style={{ color }}
      >
        {count.toLocaleString()}
      </span>

      {/* DAR panel: DIM rank hint on hover */}
      {dimRankForHover !== undefined && (
        <div className="relative w-[48px] flex justify-end items-center shrink-0 z-10">
          <AnimatePresence>
            {isHovered && (
              <motion.span
                key="dim-hint"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none whitespace-nowrap"
                style={{
                  backgroundColor: darDimDelta! > 0 ? '#fee2e2' : '#dcfce7',
                  color: darDimDelta! > 0 ? '#dc2626' : '#15803d',
                }}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.16 }}
              >
                DIM #{dimRankForHover}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* DIM panel: delta badge */}
      {delta !== undefined && (
        <div className="relative w-[36px] flex justify-end items-center shrink-0 z-10">
          <motion.div animate={{ opacity: isDimmed ? 0.35 : 1 }} transition={{ duration: 0.13 }}>
            <DeltaBadge delta={delta} />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColHeader({ showDelta, showHoverHint }: { showDelta?: boolean; showHoverHint?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-0.5">
      <span className="w-4 shrink-0" />
      <span className="w-2 shrink-0" />
      <span className="w-[112px] shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gray-300 dark:text-slate-600">Type</span>
      <span className="flex-1 min-w-[60px] text-[9px] font-semibold uppercase tracking-wider text-gray-300 dark:text-slate-600 text-center">Volume</span>
      <span className="w-[44px] shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gray-300 dark:text-slate-600 text-right">Count</span>
      {showDelta     && <span className="w-[36px] shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gray-300 dark:text-slate-600 text-right">Δ DAR</span>}
      {showHoverHint && <span className="w-[48px] shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gray-300 dark:text-slate-600 text-right">DIM Rank</span>}
    </div>
  );
}

// ─── Key Insight Banner ───────────────────────────────────────────────────────

function InsightBanner({ hoveredKey }: { hoveredKey: string | null }) {
  const key = hoveredKey;
  let content: React.ReactNode;

  if (!key) {
    content = (
      <>
        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-px" />
        <span>
          <span className="font-bold text-amber-700 dark:text-amber-400">Key insight:</span>{' '}
          <span className="font-semibold text-amber-600 dark:text-amber-500">Passwords</span> rank{' '}
          <span className="font-semibold">#7 in stored data</span> but{' '}
          <span className="font-semibold text-red-600 dark:text-red-400">#1 in active transfers</span> — possible exfiltration or credential harvesting.{' '}
          Hover any type below to compare its DAR ↔ DIM rank.
        </span>
      </>
    );
  } else {
    const darR  = DAR_RANK[key];
    const dimR  = DIM_RANK[key];
    const delta = darR - dimR;
    const label = TYPE_LABEL[key];
    const color = TYPE_COLOR[key];
    content = (
      <>
        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-px" style={{ backgroundColor: color }} />
        <span>
          <span className="font-bold" style={{ color }}>{label}</span>
          {' — '}
          DAR <span className="font-semibold">#{darR}</span>
          {' · '}
          DIM <span className="font-semibold">#{dimR}</span>
          {delta !== 0 && (
            <>
              {' · '}
              <span className={`font-bold ${delta > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {delta > 0
                  ? `▲${delta} ranks higher in transfers than in storage — monitor closely`
                  : `▼${Math.abs(delta)} ranks lower in transfers than in storage`}
              </span>
            </>
          )}
        </span>
      </>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key ?? '__default__'}
        className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 text-[11px] text-amber-700 dark:text-amber-400"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.18 }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Chart tooltips ───────────────────────────────────────────────────────────

const DARTipTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const sc = payload.find((p: any) => p.dataKey === 'scanned')?.value   ?? 0;
  const se = payload.find((p: any) => p.dataKey === 'sensitive')?.value ?? 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs min-w-[175px]">
      <p className="font-semibold text-gray-700 mb-2 pb-1.5 border-b border-gray-100">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-gray-500">Scanned</span></div>
          <span className="font-medium text-gray-900">{sc.toLocaleString()} TB</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-gray-500">Sensitive</span></div>
          <span className="font-medium text-rose-600">{se.toLocaleString()} TB</span>
        </div>
      </div>
    </div>
  );
};

const DIMTipTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const up = payload.find((p: any) => p.dataKey === 'uploads')?.value   ?? 0;
  const dn = payload.find((p: any) => p.dataKey === 'downloads')?.value ?? 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs min-w-[195px]">
      <p className="font-semibold text-gray-700 mb-2 pb-1.5 border-b border-gray-100">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-gray-500">Uploads</span></div>
          <span className="font-medium text-emerald-600">{up} sensitive files</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-gray-500">Downloads</span></div>
          <span className="font-medium text-orange-500">{dn} sensitive files</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-50">
          <span className="text-gray-400">Total</span>
          <span className="font-semibold text-gray-900">{up + dn} files / day</span>
        </div>
      </div>
    </div>
  );
};

// ─── Combined (merged chart + rankings) view ──────────────────────────────────

// Scrollable list shows exactly 5 full rows + half of the 6th to hint at scroll
const ROW_H  = 34;   // px — must match RankRow height
const LIST_H = ROW_H * 5.55; // ≈ 189px

function CombinedView({ onNavigate }: { onNavigate?: (tab: string, filter?: string) => void }) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [darRange,    setDarRange]    = useState<DARRange>(30);

  const darTrend = useMemo(() => genDARTrend(darRange), [darRange]);
  const dimTrend = useMemo(() => genDIMTrend(),         []);
  const totalUp  = useMemo(() => dimTrend.reduce((s, d) => s + d.uploads,   0), [dimTrend]);
  const totalDn  = useMemo(() => dimTrend.reduce((s, d) => s + d.downloads, 0), [dimTrend]);
  const curScn   = darTrend[darTrend.length - 1]?.scanned ?? 1050;

  return (
    <div>
      {/* Key insight banner (full width) */}
      <InsightBanner hoveredKey={hoveredType} />

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-0 lg:divide-x divide-gray-100 dark:divide-slate-800">

        {/* ══════════════════════════════════════════════════════
            LEFT PANEL — Data at Rest
            ══════════════════════════════════════════════════════ */}
        <div className="lg:pr-6 flex flex-col gap-0">

          {/* Panel header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                Data at Rest
              </span>
            </div>
            <RangeToggle value={darRange} onChange={setDarRange} />
          </div>

          {/* Metric + legend */}
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none">
                {curScn}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">TB scanned</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[9.5px] text-indigo-500">Scanned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded-full bg-rose-500" />
                <span className="text-[9.5px] text-rose-500">Sensitive</span>
              </div>
            </div>
          </div>

          {/* Area chart — extra left margin so Y-axis labels aren't clipped */}
          <div style={{ height: 168 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart
                key={`dar-trend-${darRange}`}
                data={darTrend}
                margin={{ top: 8, right: 10, left: 4, bottom: 6 }}
              >
                <defs>
                  <linearGradient id="gSc3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gSe3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.9} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  minTickGap={darRange === 7 ? 20 : 26}
                  dy={3}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  width={36}
                  domain={[0, 1400]}
                  ticks={[0, 350, 700, 1050, 1400]}
                />
                <ReTooltip content={<DARTipTooltip />} />
                <Area
                  type="monotone" dataKey="scanned"
                  stroke="#6366f1" strokeWidth={2.2}
                  fill="url(#gSc3)" dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: '#6366f1' }}
                />
                <Area
                  type="monotone" dataKey="sensitive"
                  stroke="#f43f5e" strokeWidth={2.4}
                  fill="url(#gSe3)" dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#f43f5e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-slate-800 my-3" />

          {/* Summary metric */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none">
                1,050
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">TB scanned across repositories</span>
            </div>
            <button
              className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
              onClick={() => onNavigate?.('data-explorer', 'DAR')}
            >
              DAR Explorer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* "DATA TYPES RANKING" label */}
          <p className="text-[8.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">
            Data Types Ranking
          </p>

          {/* Column header */}
          <ColHeader showHoverHint />

          {/* Scrollable ranking list */}
          <div
            className="overflow-y-auto"
            style={{
              height: LIST_H,
              scrollbarWidth: 'thin',
              scrollbarColor: '#e2e8f0 transparent',
            }}
          >
            {DAR_RANKED.map((t, i) => (
              <RankRow
                key={t.key}
                rank={i + 1}
                typeKey={t.key}
                count={t.count}
                maxCount={MAX_DAR}
                isHovered={hoveredType === t.key}
                isDimmed={hoveredType !== null && hoveredType !== t.key}
                onEnter={() => setHoveredType(t.key)}
                onLeave={() => setHoveredType(null)}
                animDelay={i * 0.05}
                dimRankForHover={DIM_RANK[t.key]}
              />
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            RIGHT PANEL — Data in Motion
            ══════════════════════════════════════════════════════ */}
        <div className="lg:pl-6 flex flex-col gap-0">

          {/* Panel header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                Data in Motion
              </span>
            </div>
            <span className="text-[9px] bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 px-2.5 py-1 rounded-lg shrink-0">
              Last 7 Days
            </span>
          </div>

          {/* Metric + legend */}
          <div className="flex items-center gap-4 mb-1 flex-wrap">
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none">
                {totalUp}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">files uploaded</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none">
                {totalDn}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">files downloaded</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[9.5px] text-emerald-500">Uploads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-[9.5px] text-orange-500">Downloads</span>
              </div>
            </div>
          </div>

          {/* Stacked bar chart */}
          <div style={{ height: 168 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                key="dim-motion-combined"
                data={dimTrend}
                margin={{ top: 8, right: 10, left: 4, bottom: 6 }}
                barCategoryGap="32%"
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.9} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  dy={3}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  width={30}
                  label={{ value: 'files/day', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 8, dy: 30, dx: 14 }}
                />
                <ReTooltip content={<DIMTipTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                <Bar dataKey="downloads" stackId="a" fill="#fb923c" radius={[0, 0, 2, 2]} maxBarSize={42} isAnimationActive={false} />
                <Bar dataKey="uploads"   stackId="a" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={42} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-slate-800 my-3" />

          {/* Summary metric */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none">
                3
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">TB in motion · transfer events ranked</span>
            </div>
            <button
              className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
              onClick={() => onNavigate?.('data-explorer', 'DIM')}
            >
              DIM Explorer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* "DATA TYPES RANKING" label */}
          <p className="text-[8.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">
            Data Types Ranking · <span className="text-amber-500">Δ DAR</span> = rank shift vs stored data
          </p>

          {/* Column header */}
          <ColHeader showDelta />

          {/* Scrollable ranking list */}
          <div
            className="overflow-y-auto"
            style={{
              height: LIST_H,
              scrollbarWidth: 'thin',
              scrollbarColor: '#e2e8f0 transparent',
            }}
          >
            {DIM_RANKED.map((t, i) => (
              <RankRow
                key={t.key}
                rank={i + 1}
                typeKey={t.key}
                count={t.count}
                maxCount={MAX_DIM}
                isHovered={hoveredType === t.key}
                isDimmed={hoveredType !== null && hoveredType !== t.key}
                onEnter={() => setHoveredType(t.key)}
                onLeave={() => setHoveredType(null)}
                animDelay={i * 0.05}
                darRankForDelta={DAR_RANK[t.key]}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function DataUniverseViz({
  onNavigate,
}: {
  onNavigate?: (tab: string, filter?: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1 h-4 rounded-full bg-rose-400 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Data Finding</h3>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-3">
            Sensitive data detected across repositories and active transfers — rankings may diverge, revealing hidden risk
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <CombinedView onNavigate={onNavigate} />
      </div>
    </div>
  );
}
