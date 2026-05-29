import { type ReactNode, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";

interface WidgetCardProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: string;
  className?: string;
}

export function WidgetCard({ children, style, padding = "0", className = "" }: WidgetCardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-700 ${className}`}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  icon?: React.ComponentType<{ size?: number }>;
  onAction?: () => void;
  actionLabel?: string;
}

export function CardHeader({ title, icon: IconCmp, onAction, actionLabel = "View all" }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
        {IconCmp && <IconCmp size={14} />}
        {title}
      </div>
      {onAction && (
        <button
          className="flex items-center gap-1 text-[12px] text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer"
          onClick={onAction}
        >
          {actionLabel} <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

interface SectionLabelProps {
  title: string;
  subtitle?: string;
}

export function SectionLabel({ title, subtitle }: SectionLabelProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </span>
      {subtitle && <span className="text-[12px] text-slate-500">{subtitle}</span>}
    </div>
  );
}

interface SeverityBadgeProps {
  severity: "Critical" | "High" | "Medium" | "Low";
  variant?: "tag" | "pill";
}

const severityStyles: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  High: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Medium: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function SeverityBadge({ severity, variant = "tag" }: SeverityBadgeProps) {
  const base = severityStyles[severity] || severityStyles.Low;
  const rounded = variant === "pill" ? "rounded-full" : "rounded";
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[11px] font-medium ${rounded} ${base}`}>
      {severity}
    </span>
  );
}

interface PillProps {
  status: "Sanctioned" | "Unsanctioned";
}

export function Pill({ status }: PillProps) {
  const cls =
    status === "Sanctioned"
      ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded-full ${cls}`}>
      {status}
    </span>
  );
}

interface StatusDotProps {
  color: string;
}

export function StatusDot({ color }: StatusDotProps) {
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
}

interface KPIProps {
  value: string | number;
  label: string;
  onClick?: () => void;
}

export function KPI({ value, label, onClick }: KPIProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-baseline gap-1.5 px-1.5 py-1 rounded-md bg-transparent border-none text-inherit font-inherit hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</span>
      <span className="text-[11px] text-slate-500">{label}</span>
      {onClick && <ArrowRight size={12} />}
    </button>
  );
}

export function fmt(n: number): string {
  if (n >= 100_000) return Math.round(n / 1000) + "K";
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}
