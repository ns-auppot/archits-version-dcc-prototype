import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Users } from 'lucide-react';

interface RiskEntityCardProps {
    name: string;
    icon: React.ElementType;
    iconColors: string; // e.g. "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400"
    severity: string; // "Critical", "High", "Medium", "Low"
    reasons: string[];
    cci?: number | string | null;
    identities: number;
    firstSeen: string;
    onClick?: () => void;
    isSelected?: boolean;
}

export function RiskEntityCard({
    name,
    icon: Icon,
    iconColors,
    severity,
    reasons,
    cci,
    identities,
    firstSeen,
    onClick,
    isSelected
}: RiskEntityCardProps) {
    const isSanctioned = severity === 'Sanctioned' || severity === 'Resolved';
    
    // Determine severity styles
    const isHigh = severity === 'High' || severity === 'Critical';
    const severityColor = isSanctioned
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
        : (isHigh ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-900/50" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50");
    const RiskIcon = isSanctioned ? CheckCircle : AlertTriangle;

    // Determine CCI color
    const cciVal = typeof cci === 'number' ? cci : parseInt(String(cci).replace(/\D/g, '') || '0');
    const cciColor = cciVal < 60 ? "text-amber-600 dark:text-amber-500" : (cciVal < 80 ? "text-yellow-600 dark:text-yellow-500" : "text-emerald-600 dark:text-emerald-500");

    return (
        <div 
            onClick={onClick}
            className={cn(
                "p-4 border rounded-xl bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-4 group",
                isSelected
                    ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                    : "border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
            )}
        >
            {/* Row 1: Header with Icon, Name, Reasons, Severity */}
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconColors)}>
                    <Icon size={16} />
                </div>
                
                {/* Right Content */}
                <div className="flex-1 min-w-0">
                    {/* Header Row: Name */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h5 className="font-bold text-gray-900 dark:text-slate-100 text-sm pr-1 leading-snug">{name}</h5>
                    </div>
                    
                    {/* Reasons List */}
                    {!isSanctioned && (
                        <ul className="list-disc list-outside ml-3.5 space-y-0.5">
                            {reasons && reasons.length > 0 ? (
                                reasons.map((reason: string, idx: number) => (
                                    <li key={idx} className="text-xs text-slate-500 dark:text-slate-400 pl-0.5 leading-snug">
                                        {reason}
                                    </li>
                                ))
                            ) : (
                                <li className="text-xs text-slate-500 dark:text-slate-400 pl-0.5 leading-snug">Unsanctioned AI usage</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>

            {/* Separator */}
            {!isSanctioned && (
                <div className="h-px bg-slate-100 dark:bg-slate-700 w-full group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors" />
            )}

            {/* Row 3: Metrics Footer */}
            {!isSanctioned && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                     {/* Col 1: Risk Level (Swapped from Center) */}
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Risk Level</span>
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 border w-fit", severityColor)}>
                            <RiskIcon size={12} />
                            <span>{severity}</span>
                        </div>
                    </div>
                    {/* Col 2: CCI (Swapped from Left) */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">CCI</span>
                        <span className={cn("font-bold text-sm", cciColor)}>
                            {cci || 'N/A'}
                        </span>
                    </div>
                    {/* Col 3: First Seen (Right Aligned) */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">First Seen</span>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{firstSeen}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
