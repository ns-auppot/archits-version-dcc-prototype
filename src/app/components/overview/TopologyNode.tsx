import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
    Users, Bot, Box, Brain, Server, Cloud,
    Database, Wrench, Shield, Network
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
    user: Users,
    agent: Bot,
    app: Box,
    model: Cloud,
    mcp: Server,
    tool: Wrench,
    db: Database,
    resource: Network,
    waf: Shield
};

type TopologyNodeData = {
    type: keyof typeof ICONS;
    label: string;
    subLabel?: string;
    isMain?: boolean;
    isSource?: boolean;
    isTarget?: boolean;
    count?: number;
    riskCount?: number;
    stats?: { type: string; value: number; total: number };
};

type TopologyNodeType = Node<TopologyNodeData, 'custom'>;

const TopologyNode = ({ data, isConnectable }: NodeProps<TopologyNodeType>) => {
    const Icon = ICONS[data.type as keyof typeof ICONS] || Box;
    const isMain = data.isMain;

    return (
        <div className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all border min-w-[200px]",
            isMain 
                ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-900/30" 
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        )}>
            {/* Input Handle */}
            {!data.isSource && (
                <Handle 
                    type="target" 
                    position={Position.Left} 
                    isConnectable={isConnectable} 
                    className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-900"
                />
            )}

            <div className={cn(
                "p-2 rounded-lg flex items-center justify-center shrink-0",
                isMain 
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            )}>
                <Icon size={isMain ? 20 : 16} />
            </div>
            
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-sm font-bold truncate",
                        isMain ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100"
                    )}>
                        {data.label}
                    </span>
                    {data.count !== undefined && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {data.count}
                        </span>
                    )}
                    {data.riskCount !== undefined && data.riskCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 ml-1">
                            {data.riskCount}
                        </span>
                    )}
                </div>
                {data.subLabel && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {data.subLabel}
                    </span>
                )}
                
                {data.stats && (
                    <div className="mt-2 w-full min-w-[120px]">
                        <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-500 dark:text-slate-400">
                                {data.stats.type === 'sanctioned' ? 'Sanctioned' : 'Scanned'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                {Math.round((data.stats.value / data.stats.total) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "h-full rounded-full",
                                    data.stats.type === 'sanctioned' 
                                        ? "bg-emerald-500 dark:bg-emerald-400" 
                                        : "bg-blue-500 dark:bg-blue-400"
                                )}
                                style={{ width: `${(data.stats.value / data.stats.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Output Handle */}
            {!data.isTarget && (
                <Handle 
                    type="source" 
                    position={Position.Right} 
                    isConnectable={isConnectable} 
                    className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-900"
                />
            )}
        </div>
    );
};

export default memo(TopologyNode);
