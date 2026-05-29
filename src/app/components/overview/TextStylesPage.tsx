import React from 'react';
import { AlertTriangle, Database, Users, Globe, ArrowRight, Eye, Shield } from 'lucide-react';

// ─── Style token definitions ──────────────────────────────────────────────────

interface StyleSpec {
  name: string;
  usage: string;
  tailwind: string;
  example: React.ReactNode;
}

const pageLevel: StyleSpec[] = [
  {
    name: 'Page Title',
    usage: 'Top-level page heading (e.g., "Overview")',
    tailwind: 'text-2xl font-bold text-gray-900 dark:text-slate-100',
    example: <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">Overview</span>,
  },
  {
    name: 'Section Label',
    usage: 'Compact section divider above each card group (e.g., "CRITICAL RISKS")',
    tailwind: 'text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500',
    example: <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Critical Risks</span>,
  },
  {
    name: 'Section Subtitle',
    usage: 'Descriptive annotation beside a section label',
    tailwind: 'text-[11px] text-gray-400 dark:text-slate-600',
    example: <span className="text-[11px] text-gray-400">Coverage across internal, external, and unmanaged user accounts</span>,
  },
];

const cardLevel: StyleSpec[] = [
  {
    name: 'Card Title',
    usage: 'Primary title inside a card header',
    tailwind: 'text-sm font-semibold text-gray-900 dark:text-slate-100',
    example: <span className="text-sm font-semibold text-gray-900">Managed Data Stores</span>,
  },
  {
    name: 'Card Title — Accent (DAR)',
    usage: 'Colored card title for Data Findings section',
    tailwind: 'text-[12px] font-semibold text-indigo-600 dark:text-indigo-400',
    example: <span className="text-[12px] font-semibold text-indigo-600">Stored Data Trends</span>,
  },
  {
    name: 'Card Title — Accent (DIM)',
    usage: 'Colored card title for Transferred Data',
    tailwind: 'text-[12px] font-semibold text-emerald-600 dark:text-emerald-400',
    example: <span className="text-[12px] font-semibold text-emerald-600">Transferred Data Trends</span>,
  },
  {
    name: 'Card Subtitle / Description',
    usage: 'Short description below a card title',
    tailwind: 'text-[11px] text-gray-400 dark:text-slate-500',
    example: <span className="text-[11px] text-gray-400">Connected and discovered stores across cloud platforms</span>,
  },
  {
    name: 'Side Panel Title',
    usage: 'Primary title in slide-over panels',
    tailwind: 'text-[13px] font-semibold (accent color)',
    example: <span className="text-[13px] font-semibold text-indigo-600">Stored Data (DAR) — All Data Types</span>,
  },
  {
    name: 'Side Panel Subtitle',
    usage: 'Supplementary info below panel title',
    tailwind: 'text-[10px] text-gray-400 dark:text-slate-500',
    example: <span className="text-[10px] text-gray-400">27 of 57 types found</span>,
  },
  {
    name: 'Panel Header (Unconnected stores)',
    usage: 'Title in the unconnected data stores panel',
    tailwind: 'text-[15px] font-semibold text-gray-900 dark:text-slate-100',
    example: <span className="text-[15px] font-semibold text-gray-900">Unconnected Data Stores</span>,
  },
];

const dataAndMetrics: StyleSpec[] = [
  {
    name: 'Metric XL (36px)',
    usage: 'Hero number — total findings / data volume',
    tailwind: 'text-[36px] font-black tabular-nums leading-none text-gray-900 dark:text-slate-100',
    example: <span className="text-[36px] font-black tabular-nums leading-none text-gray-900">197,000</span>,
  },
  {
    name: 'Metric Large (20–22px)',
    usage: 'Summary numbers in card headers or identity tiles',
    tailwind: 'text-[20px] font-black tabular-nums leading-none text-gray-800 dark:text-slate-100',
    example: <span className="text-[20px] font-black tabular-nums leading-none text-gray-800">91,000</span>,
  },
  {
    name: 'Metric Medium (StatBlock)',
    usage: 'Connected / Unconnected count in StatBlock',
    tailwind: 'text-2xl font-bold tabular-nums text-gray-900 dark:text-slate-100',
    example: <span className="text-2xl font-bold tabular-nums text-gray-900">2,840</span>,
  },
  {
    name: 'Metric Unit Label',
    usage: '"TB scanned", "sensitive files found" etc.',
    tailwind: 'text-[10px] text-gray-400 dark:text-slate-500',
    example: <span className="text-[10px] text-gray-400">TB scanned</span>,
  },
  {
    name: 'Metric Emphasis (color)',
    usage: 'Sensitive count colored to signal risk',
    tailwind: 'text-[20px] font-black tabular-nums leading-none text-rose-500',
    example: <span className="text-[20px] font-black tabular-nums leading-none text-rose-500">28,400</span>,
  },
  {
    name: 'StatBlock Label',
    usage: 'Small uppercase label above StatBlock number',
    tailwind: 'text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500',
    example: <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Connected</span>,
  },
];

const tableAndList: StyleSpec[] = [
  {
    name: 'Column Header',
    usage: 'Table/grid column header labels',
    tailwind: 'text-[8.5px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600',
    example: <span className="text-[8.5px] font-bold uppercase tracking-widest text-gray-300">Risk Category</span>,
  },
  {
    name: 'Sub-Section Label',
    usage: 'Small section label inside a card (e.g., "TOP 5 BY VOLUME")',
    tailwind: 'text-[8px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600',
    example: <span className="text-[8px] font-bold uppercase tracking-widest text-gray-300">Top 5 by Volume</span>,
  },
  {
    name: 'Row Primary Text',
    usage: 'Main row content — rule name, data type, platform name',
    tailwind: 'text-[11px] text-gray-700 dark:text-slate-200',
    example: <span className="text-[11px] text-gray-700">MFA Disabled for Administrative Accounts</span>,
  },
  {
    name: 'Row Primary Text (bold)',
    usage: 'Active/hovered row or emphasized row value',
    tailwind: 'text-[11px] font-semibold text-gray-800 dark:text-slate-200',
    example: <span className="text-[11px] font-semibold text-gray-800">Personal Names</span>,
  },
  {
    name: 'Row Secondary Text',
    usage: 'Row sub-labels — category, platform type, region',
    tailwind: 'text-[10px] text-gray-400 dark:text-slate-500',
    example: <span className="text-[10px] text-gray-400">Over-Privileged Identity</span>,
  },
  {
    name: 'Row Tertiary / Caption',
    usage: 'Smallest text — sub-category, caption under row name',
    tailwind: 'text-[9px] text-gray-400 dark:text-slate-500',
    example: <span className="text-[9px] text-gray-400">AI Assistant</span>,
  },
  {
    name: 'Rank Number',
    usage: 'Rank index in DAR/DIM bar ranking rows',
    tailwind: 'text-[9px] text-gray-300 dark:text-slate-600 tabular-nums',
    example: <span className="text-[9px] text-gray-300 tabular-nums">1</span>,
  },
  {
    name: 'Numeric Delta (increase)',
    usage: 'Finding count delta — new or increased',
    tailwind: 'text-[9px] font-semibold text-rose-500 tabular-nums',
    example: <span className="text-[9px] font-semibold text-rose-500 tabular-nums">+3</span>,
  },
  {
    name: 'Timestamp / Detected At',
    usage: 'Relative time label in risk rows',
    tailwind: 'text-[10px] text-gray-400 dark:text-slate-500 tabular-nums',
    example: <span className="text-[10px] text-gray-400 tabular-nums">2d ago</span>,
  },
  {
    name: 'Identity Sub-label',
    usage: 'Sensitive access count + % under identity tile bar',
    tailwind: 'text-[9px] text-gray-500 dark:text-slate-400 (combined)',
    example: <span className="text-[9px] text-gray-500">96,400 <span className="text-gray-400">(34%) with sensitive data access</span></span>,
  },
];

const badgesAndControls: StyleSpec[] = [
  {
    name: 'Severity Badge — Critical',
    usage: 'Critical risk severity indicator',
    tailwind: 'text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 px-1.5 py-px rounded',
    example: <span className="text-[8.5px] font-bold uppercase tracking-wide bg-rose-100 text-rose-600 px-1.5 py-px rounded">New</span>,
  },
  {
    name: 'Badge — Newly Detected',
    usage: 'Pulsing badge in section header for new risks',
    tailwind: 'text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 dark:bg-rose-950/50 dark:border-rose-900/30',
    example: <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />2 newly detected</span>,
  },
  {
    name: 'Badge — Period Tag (Last 7 Days)',
    usage: 'Small neutral time period badge inside card header',
    tailwind: 'text-[9px] font-medium text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 rounded px-1.5 py-0.5',
    example: <span className="text-[9px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Last 7 Days</span>,
  },
  {
    name: 'Chart Axis Tick',
    usage: 'X/Y axis labels in recharts area and bar charts',
    tailwind: 'fontSize: 8, fill: #9ca3af (light) / #475569 (dark) — inline SVG prop',
    example: <span className="text-[8px] text-gray-400">Apr 12</span>,
  },
  {
    name: 'Chart Tooltip Label',
    usage: 'Date label at top of chart tooltip',
    tailwind: 'text-[10px] text-gray-500 dark:text-slate-400',
    example: <span className="text-[10px] text-gray-500">Apr 12</span>,
  },
  {
    name: 'Chart Tooltip Value',
    usage: 'Data value row inside chart tooltip',
    tailwind: 'text-[10px] font-semibold text-gray-700 dark:text-slate-200',
    example: <span className="text-[10px] font-semibold text-gray-700">91,000 TB</span>,
  },
  {
    name: 'Legend Label',
    usage: 'Chart legend text beside line/square swatch',
    tailwind: 'text-[10px] text-gray-600 dark:text-slate-300 (clickable) / text-gray-500 (static)',
    example: <span className="text-[10px] text-gray-600">Scanned</span>,
  },
  {
    name: 'Link / Action Button',
    usage: 'Inline text links — "View all", "Go to Data Explorer"',
    tailwind: 'text-[11px] font-semibold (accent color) hover:underline',
    example: <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">Go to Data Explorer <ArrowRight className="w-3 h-3" /></span>,
  },
  {
    name: 'Tab Label (active)',
    usage: 'Active tab in Applications / Websites switcher',
    tailwind: 'text-[8.5px] font-bold uppercase tracking-widest text-gray-600 border-b-2 border-gray-600 dark:text-slate-200 dark:border-slate-300',
    example: <span className="text-[8.5px] font-bold uppercase tracking-widest text-gray-600 border-b-2 border-gray-600 pb-0.5">Applications</span>,
  },
  {
    name: 'Tab Label (inactive)',
    usage: 'Inactive tab',
    tailwind: 'text-[8.5px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600',
    example: <span className="text-[8.5px] font-bold uppercase tracking-widest text-gray-300">Websites</span>,
  },
  {
    name: 'Range Toggle (active)',
    usage: 'Selected range button in DAR trend toggle',
    tailwind: 'text-[10px] font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-700 shadow-sm rounded-md',
    example: <span className="text-[10px] font-semibold text-gray-800 bg-white shadow-sm rounded px-2.5 py-1">30d</span>,
  },
  {
    name: 'Range Toggle (inactive)',
    usage: 'Unselected range button',
    tailwind: 'text-[10px] font-semibold text-gray-400 dark:text-slate-500',
    example: <span className="text-[10px] font-semibold text-gray-400">7d</span>,
  },
];

// ─── Single style row ─────────────────────────────────────────────────────────

function StyleRow({ spec }: { spec: StyleSpec }) {
  return (
    <div className="grid gap-4 items-start py-3 border-b border-gray-50 dark:border-slate-800 last:border-0"
      style={{ gridTemplateColumns: '180px 1fr 1fr' }}>
      <div>
        <p className="text-[11px] font-semibold text-gray-800 dark:text-slate-200">{spec.name}</p>
        <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5 leading-snug">{spec.usage}</p>
      </div>
      <div className="flex items-center min-h-6">{spec.example}</div>
      <div>
        <code className="text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded break-all font-mono">
          {spec.tailwind}
        </code>
      </div>
    </div>
  );
}

function StyleGroup({ title, icon, items }: { title: string; icon: React.ReactNode; items: StyleSpec[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden mb-5">
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
        <span className="text-gray-400 dark:text-slate-500">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">{title}</h3>
        <span className="ml-auto text-[9px] text-gray-300 dark:text-slate-600">{items.length} styles</span>
      </div>
      {/* Column headers */}
      <div className="grid gap-4 px-5 pt-2 pb-1 border-b border-gray-100 dark:border-slate-800"
        style={{ gridTemplateColumns: '180px 1fr 1fr' }}>
        <span className="text-[8.5px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600">Token Name</span>
        <span className="text-[8.5px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600">Preview</span>
        <span className="text-[8.5px] font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600">Tailwind Classes</span>
      </div>
      <div className="px-5">
        {items.map(s => <StyleRow key={s.name} spec={s} />)}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TextStylesPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Text Style Reference</h2>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            All typography tokens used across the Overview page — including cards, side panels, and inline controls.
          </p>
        </div>

        {/* Summary pill */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { label: 'Page-level', count: pageLevel.length },
            { label: 'Card-level', count: cardLevel.length },
            { label: 'Data & Metrics', count: dataAndMetrics.length },
            { label: 'Tables & Lists', count: tableAndList.length },
            { label: 'Badges & Controls', count: badgesAndControls.length },
          ].map(g => (
            <span key={g.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[10px] font-semibold text-gray-500 dark:text-slate-400">
              {g.label}
              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold flex items-center justify-center">{g.count}</span>
            </span>
          ))}
        </div>

        <StyleGroup title="Page Level" icon={<Shield className="w-3.5 h-3.5" />} items={pageLevel} />
        <StyleGroup title="Card Level" icon={<Database className="w-3.5 h-3.5" />} items={cardLevel} />
        <StyleGroup title="Data & Metrics" icon={<AlertTriangle className="w-3.5 h-3.5" />} items={dataAndMetrics} />
        <StyleGroup title="Tables & List Rows" icon={<Users className="w-3.5 h-3.5" />} items={tableAndList} />
        <StyleGroup title="Badges, Controls & Chart Labels" icon={<Eye className="w-3.5 h-3.5" />} items={badgesAndControls} />

        {/* Design principles note */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Design Principles</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              ['Hierarchy', 'Three clear levels: 36px hero → 20–22px summary → 11px row. Avoid intermediate sizes that blur the hierarchy.'],
              ['Color for Emphasis', 'Gray-900 for primary content; Gray-400–500 for secondary. Use color (rose, indigo, emerald) only for semantic signals — risk, DAR, DIM.'],
              ['Tabular Numerals', 'All numeric values use tabular-nums to prevent layout shifts.'],
              ['Uppercase Labels', 'Section/column headers use uppercase + tracking-widest at ≤ 8.5px. Never use uppercase on body copy.'],
              ['Dark Mode Parity', 'Every light token has a paired dark: gray-N → slate-N. Colors maintain the same semantic role across modes.'],
              ['Singular / Plural', 'Cards use singular where they represent a grouped concept ("Managed Data Store"); sections use plural where content is a collection ("Data Findings", "Identities").'],
            ].map(([title, desc]) => (
              <div key={title}>
                <p className="text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-0.5">{title}</p>
                <p className="text-[9px] text-gray-400 dark:text-slate-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
