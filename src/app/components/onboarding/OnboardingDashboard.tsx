import { useState } from "react";
import {
  AlertTriangle, ArrowRight, ChevronRight, Eye, UserMinus,
  HardDrive, Network, Users, Database, Globe, AppWindow,
} from "lucide-react";
import { CoachMark } from "./CoachMark";
import type { CoachStep } from "./types";

const CRITICAL_RISKS = [
  { sev: "critical" as const, policy: "Cleartext Credentials Stored in Cloud & SaaS Environments", type: "Over-Exposed Sensitive Data", typeIcon: "Eye", findings: 11, when: "5h ago" },
  { sev: "critical" as const, policy: "Sensitive Data Exposed in ChatGPT Conversations", type: "Data Exfiltration", typeIcon: "AlertTriangle", findings: 4, when: "1h ago" },
  { sev: "critical" as const, policy: "High-Risk User Downloading Sensitive Data", type: "Former Employee with Access", typeIcon: "UserMinus", findings: 4, when: "1d ago" },
];

const STORED_TOP = [
  { rank: 1, label: "Personal Names", n: 70_000, color: "#3b82f6" },
  { rank: 2, label: "Payment Cards", n: 46_000, color: "#eab308" },
  { rank: 3, label: "Email Addresses", n: 27_000, color: "#3b82f6" },
  { rank: 4, label: "Social Security Numbers", n: 20_500, color: "#ef4444" },
  { rank: 5, label: "Bank Account Information", n: 16_400, color: "#22c55e" },
  { rank: 6, label: "IP Addresses", n: 12_000, color: "#3b82f6" },
  { rank: 7, label: "Passwords", n: 9_700, color: "#a855f7" },
];
const TRANSFERRED_TOP = [
  { rank: 1, label: "Payment Cards", n: 76_000, color: "#eab308" },
  { rank: 2, label: "Personal Names", n: 66_000, color: "#3b82f6" },
  { rank: 3, label: "Email Addresses", n: 37_000, color: "#3b82f6" },
  { rank: 4, label: "Social Security Numbers", n: 30_000, color: "#ef4444" },
  { rank: 5, label: "Bank Account Information", n: 24_500, color: "#22c55e" },
  { rank: 6, label: "IP Addresses", n: 16_200, color: "#3b82f6" },
  { rank: 7, label: "Passwords", n: 11_200, color: "#a855f7" },
];

const IDENTITY_GROUPS = [
  { label: "Internal Users", primary: 96_400, of: 284_000, pct: 34, color: "#3b82f6" },
  { label: "External Users", primary: 3_180, of: 8_420, pct: 38, color: "#3b82f6" },
  { label: "Unmapped", primary: 7_400, of: 62_000, pct: 12, color: "#3b82f6" },
  { label: "Unauthenticated", primary: 18_600, of: 142_000, pct: 13, color: "#ef4444" },
];

const MANAGED_STORES = [
  { name: "AWS S3", stores: 840, unconnected: 5_200, sensitive: 8_200, glyph: "aws-s3" },
  { name: "OneDrive", stores: 620, unconnected: null, sensitive: 5_400, glyph: "onedrive" },
  { name: "GCP Storage", stores: 380, unconnected: 4_800, sensitive: 3_100, glyph: "gcs" },
  { name: "SharePoint", stores: 510, unconnected: null, sensitive: 4_700, glyph: "sharepoint" },
  { name: "Google Drive", stores: 290, unconnected: null, sensitive: 2_300, glyph: "gdrive" },
  { name: "Azure Blob", stores: 140, unconnected: 2_500, sensitive: 1_800, glyph: "azure-blob" },
  { name: "Salesforce", stores: 42, unconnected: null, sensitive: 610, glyph: "salesforce" },
];

const UNMANAGED_APPS = {
  sanctioned: [
    { name: "Google Drive", tag: "File Storage", sensitive: 24_600, glyph: "gdrive" },
    { name: "OneDrive", tag: "File Storage", sensitive: 18_200, glyph: "onedrive" },
    { name: "Slack", tag: "Collaboration", sensitive: 11_400, glyph: "slack" },
  ],
  unsanctioned: [
    { name: "ChatGPT", tag: "AI Assistant", sensitive: 12_400, glyph: "chatgpt" },
    { name: "Descript", tag: "Video Recording", sensitive: 4_800, glyph: "descript" },
    { name: "Dropbox", tag: "File Storage", sensitive: 2_200, glyph: "dropbox" },
  ],
};

const GLYPH_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  "aws-s3": { bg: "bg-amber-100", fg: "text-amber-600", label: "S3" },
  onedrive: { bg: "bg-blue-100", fg: "text-blue-600", label: "OD" },
  gcs: { bg: "bg-red-100", fg: "text-red-600", label: "GS" },
  sharepoint: { bg: "bg-emerald-100", fg: "text-cyan-600", label: "SP" },
  gdrive: { bg: "bg-emerald-100", fg: "text-green-600", label: "GD" },
  "azure-blob": { bg: "bg-blue-100", fg: "text-blue-600", label: "Az" },
  salesforce: { bg: "bg-blue-100", fg: "text-blue-600", label: "SF" },
  slack: { bg: "bg-amber-100", fg: "text-pink-600", label: "SL" },
  chatgpt: { bg: "bg-emerald-100", fg: "text-green-600", label: "GPT" },
  descript: { bg: "bg-red-100", fg: "text-red-600", label: "DS" },
  dropbox: { bg: "bg-blue-100", fg: "text-blue-600", label: "DB" },
};

function VendorGlyph({ kind, size = 28 }: { kind: string; size?: number }) {
  const m = GLYPH_MAP[kind] || { bg: "bg-slate-100", fg: "text-slate-500", label: "??" };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md shrink-0 text-[10px] font-bold ${m.bg} ${m.fg}`}
      style={{ width: size, height: size, fontSize: size > 24 ? 11 : 10 }}
    >
      {m.label}
    </span>
  );
}

function OvSevPill({ sev }: { sev: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    critical: { color: "text-red-600", bg: "bg-red-100", label: "Critical" },
    high: { color: "text-orange-600", bg: "bg-orange-100", label: "High" },
    medium: { color: "text-yellow-600", bg: "bg-yellow-100", label: "Medium" },
    low: { color: "text-green-600", bg: "bg-green-100", label: "Low" },
  };
  const m = map[sev] || map.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold ${m.bg} ${m.color}`}>
      {m.label}
    </span>
  );
}

function LineChart({ scanned, sensitive }: { scanned: number[]; sensitive: number[] }) {
  const width = 460, height = 130;
  const pad = { top: 10, right: 8, bottom: 22, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(...scanned, ...sensitive);
  const xs = (i: number) => pad.left + (i / (scanned.length - 1)) * w;
  const ys = (v: number) => pad.top + h - (v / max) * h;
  const pathScanned = scanned.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i)} ${ys(v)}`).join(" ");
  const pathSens = sensitive.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i)} ${ys(v)}`).join(" ");
  const area = `${pathScanned} L${xs(scanned.length - 1)} ${pad.top + h} L${xs(0)} ${pad.top + h} Z`;
  const dates = ["Apr 7", "Apr 10", "Apr 13", "Apr 16", "Apr 19", "Apr 22", "Apr 25", "Apr 28", "May 1", "May 4"];
  const yTicks = [110_000, 55_000, 0];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      {yTicks.map((t, i) => {
        const y = pad.top + (i / 2) * h;
        return (
          <g key={t}>
            <line x1={pad.left} y1={y} x2={pad.left + w} y2={y} stroke="rgba(0,0,0,0.04)" strokeDasharray="2 3" />
            <text x={pad.left - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#94a3b8" fontFamily="Inter, sans-serif">
              {t >= 1000 ? `${(t / 1000).toFixed(0)}K` : t}
            </text>
          </g>
        );
      })}
      <path d={area} fill="#3b82f6" fillOpacity="0.05" />
      <path d={pathScanned} fill="none" stroke="#3b82f6" strokeWidth="1.6" />
      <path d={pathSens} fill="none" stroke="#ef4444" strokeWidth="1.6" />
      {dates.map((d, i) => (
        <text key={d} x={xs(i)} y={height - 6} fontSize="9" textAnchor="middle" fill="#94a3b8" fontFamily="Inter, sans-serif">{d}</text>
      ))}
    </svg>
  );
}

function StackedBars() {
  const width = 460, height = 130;
  const pad = { top: 10, right: 8, bottom: 22, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = 120_000;
  const data = [
    { label: "Apr 28", uploads: 56, downloads: 22, scanned: 78 },
    { label: "Apr 29", uploads: 50, downloads: 18, scanned: 70 },
    { label: "Apr 30", uploads: 42, downloads: 16, scanned: 62 },
    { label: "May 1", uploads: 64, downloads: 20, scanned: 86 },
    { label: "May 2", uploads: 56, downloads: 18, scanned: 76 },
    { label: "May 3", uploads: 62, downloads: 22, scanned: 86 },
    { label: "May 4", uploads: 72, downloads: 26, scanned: 96 },
  ];
  const barW = (w / data.length) * 0.55;
  const xs = (i: number) => pad.left + (i / data.length) * w + ((w / data.length) - barW) / 2;
  const toY = (v: number) => pad.top + h - ((v * 1000) / max) * h;
  const sp = data.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i) + barW / 2} ${toY(d.scanned)}`).join(" ");
  const sArea = `${sp} L${xs(data.length - 1) + barW / 2} ${pad.top + h} L${xs(0) + barW / 2} ${pad.top + h} Z`;
  const yTicks = [120_000, 90_000, 60_000, 30_000, 0];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      {yTicks.map((t, i) => {
        const y = pad.top + (i / (yTicks.length - 1)) * h;
        return (
          <g key={t}>
            <line x1={pad.left} y1={y} x2={pad.left + w} y2={y} stroke="rgba(0,0,0,0.04)" strokeDasharray="2 3" />
            <text x={pad.left - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#94a3b8" fontFamily="Inter, sans-serif">
              {(t / 1000).toFixed(0)}K
            </text>
          </g>
        );
      })}
      <path d={sArea} fill="#3b82f6" fillOpacity="0.05" />
      <path d={sp} fill="none" stroke="#3b82f6" strokeWidth="1.6" />
      {data.map((d, i) => {
        const x = xs(i);
        const upH = ((d.uploads * 1000) / max) * h;
        const dnH = ((d.downloads * 1000) / max) * h;
        return (
          <g key={d.label}>
            <rect x={x} y={pad.top + h - upH} width={barW} height={upH} fill="#f97316" rx="1" />
            <rect x={x} y={pad.top + h - upH - dnH} width={barW} height={dnH} fill="#ef4444" rx="1" />
            <text x={x + barW / 2} y={height - 6} fontSize="9" textAnchor="middle" fill="#94a3b8" fontFamily="Inter, sans-serif">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TopByObject({ data }: { data: typeof STORED_TOP }) {
  const max = Math.max(...data.map((d) => d.n));
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.label} className="grid items-center gap-2.5 text-[12px]" style={{ gridTemplateColumns: "20px 1.4fr 2fr 70px" }}>
          <span className="text-right text-slate-400">{d.rank}</span>
          <span className="text-slate-800 truncate dark:text-slate-200">{d.label}</span>
          <div className="h-[5px] bg-black/5 rounded-full overflow-hidden dark:bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${(d.n / max) * 100}%`, background: d.color }} />
          </div>
          <span className="tabular-nums text-right font-semibold" style={{ color: d.color }}>
            {d.n.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function IdentityTile({ group }: { group: (typeof IDENTITY_GROUPS)[0] }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-medium text-slate-500 mb-1.5">{group.label}</div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="tabular-nums text-[22px] font-bold leading-none" style={{ color: group.color }}>
          {group.primary.toLocaleString()}
        </span>
        <span className="text-[11px] text-slate-400">with sensitive access</span>
      </div>
      <div className="text-[11px] text-slate-400 mb-1.5">
        {group.pct}% of {group.of.toLocaleString()} total
      </div>
      <div className="h-1 bg-black/5 rounded-full overflow-hidden dark:bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${group.pct}%`, background: group.color }} />
      </div>
    </div>
  );
}

function UnmgRow({ app, isFirst }: { app: { name: string; tag: string; sensitive: number; glyph: string }; isFirst: boolean }) {
  return (
    <div className={`grid items-center gap-2.5 py-2.5 ${isFirst ? "" : "border-t border-black/5 dark:border-white/5"}`} style={{ gridTemplateColumns: "30px 1fr auto" }}>
      <VendorGlyph kind={app.glyph} size={28} />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{app.name}</div>
        <div className="text-[11px] text-slate-400">{app.tag}</div>
      </div>
      <div className="text-right">
        <div className="tabular-nums text-[13px] font-bold text-slate-800 dark:text-slate-200">
          {app.sensitive.toLocaleString()}
        </div>
        <div className="text-[10.5px] text-slate-400">sensitive objects</div>
      </div>
    </div>
  );
}

interface OnboardingDashboardProps {
  tourActive: boolean;
  onTourClose: () => void;
  onTourFinish: () => void;
  tourStartIndex?: number;
  onToggleEmptyState?: () => void;
}

export function OnboardingDashboard({ tourActive, onTourClose, onTourFinish, tourStartIndex = 0, onToggleEmptyState }: OnboardingDashboardProps) {
  const scanned = [70_000, 71_000, 72_000, 73_000, 72_500, 74_000, 73_500, 74_500, 73_000, 72_800];
  const sensitive = [21_000, 21_400, 21_600, 21_900, 21_800, 22_100, 22_000, 22_200, 22_150, 22_320];
  const [unmTab, setUnmTab] = useState<"apps" | "sites">("apps");

  const tourSteps: CoachStep[] = [
    { target: '[data-tour="critical-risks"]', title: "Critical risks first", body: "Top-severity risk policies with new findings in the last 7 days. Click any row to drill into the policy detail and remediation steps." },
    { target: '[data-tour="data-findings"]', title: "Stored and transferred sensitive data", body: "Two views of your sensitive data: at-rest in connected stores, and in-motion across SaaS uploads and downloads. Top 7 data types per side, ranked independently." },
    { target: '[data-tour="identities"]', title: "Who has access", body: "Identity coverage across internal users, external partners, unmapped, and unauthenticated accounts — with the count and percentage that touch sensitive data." },
    { target: '[data-tour="data-coverage"]', title: "Coverage and the long tail", body: "On the left: managed stores you have already connected (and the unconnected ones you have not). On the right: unmanaged SaaS apps and websites where data flows externally." },
  ];

  const linkBtn = "flex items-center gap-1 text-[12px] text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer font-medium";

  return (
    <div className="p-6 pb-8 max-w-[1320px] mx-auto overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Overview</h1>
        <div className="flex gap-2.5">
          <span className="inline-flex px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 text-[11px] font-semibold">Inline only</span>
          <span className="inline-flex px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 text-[11px] font-semibold">DSPM &amp; CASB only</span>
          <button
            onClick={onToggleEmptyState}
            className="inline-flex px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-pink-100 transition-colors"
          >
            Empty state
          </button>
        </div>
      </div>

      {/* Section 1: Critical Risks */}
      <div className="flex items-baseline justify-between gap-3 mt-4 mb-1.5">
        <div>
          <span className="text-[13px] font-semibold text-slate-600 mr-2.5">Insights</span>
          <span className="text-[11.5px] text-slate-400">Critical risk policies with new findings in the last 7 days</span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" data-tour="critical-risks">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
            <AlertTriangle size={14} className="text-red-600" /> Critical Risks
          </div>
          <button className={linkBtn}>Go to Risk page <ArrowRight size={11} /></button>
        </div>
        <div className="grid items-center px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-400" style={{ gridTemplateColumns: "90px 1fr 280px 90px 110px 16px" }}>
          <span>Severity</span><span>Policy</span><span>Policy Type</span><span>Findings</span><span>Last Detected</span><span />
        </div>
        {CRITICAL_RISKS.map((r, i) => (
          <div key={i} className="grid items-center px-5 py-3 border-t border-slate-50 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30 cursor-pointer" style={{ gridTemplateColumns: "90px 1fr 280px 90px 110px 16px" }}>
            <OvSevPill sev={r.sev} />
            <span className="text-[12.5px] font-medium text-slate-800 truncate dark:text-slate-200">{r.policy}</span>
            <span className="text-[12px] text-slate-600 inline-flex items-center gap-1.5 dark:text-slate-400">
              {r.typeIcon === "Eye" && <Eye size={12} className="text-slate-400" />}
              {r.typeIcon === "AlertTriangle" && <AlertTriangle size={12} className="text-slate-400" />}
              {r.typeIcon === "UserMinus" && <UserMinus size={12} className="text-slate-400" />}
              {r.type}
            </span>
            <span className="tabular-nums text-[13px] font-bold text-slate-800 dark:text-slate-200">{r.findings}</span>
            <span className="text-[11.5px] text-slate-400">{r.when}</span>
            <ArrowRight size={12} className="text-slate-300" />
          </div>
        ))}
        <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800">
          <button className={linkBtn}>Show more policies <ChevronRight size={11} /></button>
        </div>
      </div>

      {/* Section 2: Data Findings */}
      <div className="flex items-baseline justify-between gap-3 mt-6 mb-1.5">
        <div>
          <span className="text-[13px] font-semibold text-slate-600 mr-2.5">Data Findings</span>
          <span className="text-[11.5px] text-slate-400">Sensitive data types detected in storage and in transit, ranked independently</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4" data-tour="data-findings">
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3.5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              <HardDrive size={14} /> Stored Data <span className="text-slate-400 font-normal">(Data-at-Rest)</span>
            </div>
            <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
              {["7d", "30d", "60d", "90d"].map((p) => (
                <button key={p} className={`px-2 py-0.5 rounded text-[11px] font-medium border-none cursor-pointer transition-colors ${p === "30d" ? "bg-white shadow-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200" : "bg-transparent text-slate-500 hover:text-slate-700"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider mb-1">TREND</div>
            <div className="flex items-baseline gap-4">
              <span><span className="tabular-nums text-[22px] font-bold text-slate-800 dark:text-slate-200">85,000</span> <span className="text-[11.5px] text-slate-400">TB scanned</span></span>
              <span><span className="tabular-nums text-[22px] font-bold text-red-600">22,320</span> <span className="text-[11.5px] text-slate-400">TB sensitive</span></span>
            </div>
            <LineChart scanned={scanned} sensitive={sensitive} />
            <div className="flex justify-center gap-4 text-[11px] text-slate-600 mt-1.5 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-blue-500" /> Scanned <Eye size={10} className="text-slate-400" /></span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-red-500" /> Sensitive</span>
            </div>
          </div>
          <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-bold text-slate-400 tracking-wider">FINDINGS</div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium dark:bg-slate-800">Current State</span>
            </div>
            <div className="flex items-baseline gap-4 mb-3.5">
              <span><span className="tabular-nums text-[22px] font-bold text-slate-800 dark:text-slate-200">235K</span> <span className="text-[11.5px] text-slate-400">sensitive objects found</span></span>
              <span><span className="tabular-nums text-[22px] font-bold text-slate-800 dark:text-slate-200">27</span> <span className="text-[11.5px] text-slate-400">data types</span></span>
            </div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Top 7 by object</div>
              <button className={linkBtn}>View all <ArrowRight size={11} /></button>
            </div>
            <TopByObject data={STORED_TOP} />
          </div>
          <div className="text-center border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <button className={linkBtn}>Go to Data Explorer <ArrowRight size={11} /></button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3.5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              <Network size={14} /> Transferred Data <span className="text-slate-400 font-normal">(Data-in-Motion)</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium dark:bg-slate-800">Last 7 Days</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider mb-1">TREND</div>
            <div className="flex items-baseline gap-3.5 flex-wrap">
              <span><span className="tabular-nums text-[20px] font-bold text-slate-800 dark:text-slate-200">649K</span> <span className="text-[11px] text-slate-400">TB scanned</span></span>
              <span><span className="tabular-nums text-[20px] font-bold text-orange-500">312K</span> <span className="text-[11px] text-slate-400">TB sensitive uploaded</span></span>
              <span><span className="tabular-nums text-[20px] font-bold text-red-500">124K</span> <span className="text-[11px] text-slate-400">TB sensitive downloaded</span></span>
            </div>
            <StackedBars />
            <div className="flex justify-center gap-3.5 text-[11px] text-slate-600 mt-1.5 flex-wrap dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-blue-500" /> Scanned <Eye size={10} className="text-slate-400" /></span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-500 rounded-sm" /> Sensitive Uploads</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> Sensitive Downloads</span>
            </div>
          </div>
          <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-bold text-slate-400 tracking-wider">FINDINGS</div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium dark:bg-slate-800">Current State</span>
            </div>
            <div className="flex items-baseline gap-4 mb-3.5">
              <span><span className="tabular-nums text-[22px] font-bold text-slate-800 dark:text-slate-200">291K</span> <span className="text-[11.5px] text-slate-400">sensitive objects transferred</span></span>
              <span><span className="tabular-nums text-[22px] font-bold text-slate-800 dark:text-slate-200">25</span> <span className="text-[11.5px] text-slate-400">data types</span></span>
            </div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Top 7 by object</div>
              <button className={linkBtn}>View all <ArrowRight size={11} /></button>
            </div>
            <TopByObject data={TRANSFERRED_TOP} />
          </div>
          <div className="text-center border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <button className={linkBtn}>Go to Data Explorer <ArrowRight size={11} /></button>
          </div>
        </div>
      </div>

      {/* Section 3: Identities */}
      <div className="flex items-baseline gap-3 mt-6 mb-1.5">
        <span className="text-[13px] font-semibold text-slate-600 mr-2.5">Identities</span>
        <span className="text-[11.5px] text-slate-400">Coverage across internal, external, and unmanaged user accounts</span>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" data-tour="identities">
        <div className="flex items-center gap-2.5 mb-4">
          <Users size={14} className="text-slate-800 dark:text-slate-200" />
          <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Identities</span>
          <span className="text-[11.5px] text-slate-600 dark:text-slate-400">
            <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">126K (25%)</span> with sensitive data access ·{" "}
            <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">497K</span> total
          </span>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {IDENTITY_GROUPS.map((g) => <IdentityTile key={g.label} group={g} />)}
        </div>
      </div>

      {/* Section 4: Data Coverage */}
      <div className="flex items-baseline gap-3 mt-6 mb-1.5">
        <span className="text-[13px] font-semibold text-slate-600 mr-2.5">Data Coverage</span>
        <span className="text-[11.5px] text-slate-400">Managed stores and unmanaged external destinations</span>
      </div>
      <div className="grid grid-cols-2 gap-4" data-tour="data-coverage">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
            <Database size={14} /> Managed Data Stores
          </div>
          <div className="flex items-baseline gap-4 mb-4">
            <span className="inline-flex items-baseline gap-1"><span className="tabular-nums text-[20px] font-bold text-slate-800 dark:text-slate-200">2,840</span><span className="text-[12px] text-slate-400 ml-1">connected</span></span>
            <span className="inline-flex items-baseline gap-1"><span className="tabular-nums text-[20px] font-bold text-slate-800 dark:text-slate-200">12,500</span><span className="text-[12px] text-slate-400 ml-1">unconnected</span></span>
          </div>
          <div className="flex flex-col">
            {MANAGED_STORES.map((s, i) => (
              <div key={s.name} className={`grid items-center gap-3 py-2.5 ${i > 0 ? "border-t border-black/5 dark:border-white/5" : ""}`} style={{ gridTemplateColumns: "36px 1fr auto" }}>
                <VendorGlyph kind={s.glyph} size={32} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{s.name}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium dark:bg-slate-800 dark:text-slate-400">{s.stores} stores</span>
                  </div>
                  {s.unconnected != null && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <span className="tabular-nums">{s.unconnected.toLocaleString()}</span> unconnected
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="tabular-nums text-[13px] font-bold text-slate-800 dark:text-slate-200">{s.sensitive.toLocaleString()}</div>
                  <div className="text-[10.5px] text-slate-400">sensitive objects</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center border-t border-slate-100 pt-3.5 mt-2.5 dark:border-slate-800">
            <button className={linkBtn}>View all in Inventory <ArrowRight size={11} /></button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
            <Globe size={14} /> Unmanaged Destinations
          </div>
          <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-lg dark:bg-slate-800">
            {(["apps", "sites"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setUnmTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[12px] border-none cursor-pointer transition-colors font-inherit ${
                  unmTab === tab
                    ? "bg-white shadow-sm font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    : "bg-transparent font-medium text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "apps" ? <AppWindow size={12} /> : <Globe size={12} />}
                {tab === "apps" ? "Applications" : "Websites"}
                <span className="text-slate-400 font-normal">{tab === "apps" ? "6,460" : "11,050"}</span>
              </button>
            ))}
          </div>

          {unmTab === "apps" && (
            <>
              <div className="text-[11.5px] text-slate-400 mb-2">
                Sanctioned <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">(1,840)</span>
              </div>
              {UNMANAGED_APPS.sanctioned.map((a, i) => <UnmgRow key={a.name} app={a} isFirst={i === 0} />)}
              <div className="text-[11.5px] text-slate-400 mt-4 mb-2">
                Unsanctioned <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">(4,620)</span>
              </div>
              {UNMANAGED_APPS.unsanctioned.map((a, i) => <UnmgRow key={a.name} app={a} isFirst={i === 0} />)}
            </>
          )}
          {unmTab === "sites" && (
            <div className="py-12 text-center text-[13px] text-slate-400">Website coverage data appears here.</div>
          )}
          <div className="text-center border-t border-slate-100 pt-3.5 mt-4 dark:border-slate-800">
            <button className={linkBtn}>View all in Inventory <ArrowRight size={11} /></button>
          </div>
        </div>
      </div>

      <CoachMark
        active={tourActive}
        initialStep={tourStartIndex}
        onClose={onTourClose}
        onFinish={onTourFinish}
        steps={tourSteps}
      />
    </div>
  );
}
