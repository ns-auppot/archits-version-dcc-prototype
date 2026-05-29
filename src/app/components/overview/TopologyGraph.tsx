import React, { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Handle,
    Position,
    MarkerType,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
    User, Database, LayoutGrid, Box, Bot, MoreHorizontal, Activity, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Custom Node Component ---
const TopologyNode = ({ data }: any) => {
    const Icon = data.icon;
    
    return (
        <div className="flex flex-col items-center justify-center relative group">
            {/* Node Body */}
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl relative",
                data.isMain 
                    ? "bg-slate-800/90 border-2 border-indigo-500/50 shadow-indigo-500/10 backdrop-blur-sm" 
                    : "bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 backdrop-blur-sm"
            )}>
                {Icon && <Icon size={28} className={cn(
                    data.isMain ? "text-indigo-400" : "text-slate-500"
                )} />}
                
                {/* Risk Badge */}
                {data.badge && (
                    <div className="absolute -top-3 -right-3 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shadow-sm z-20 whitespace-nowrap">
                        {data.badge}
                    </div>
                )}
            </div>

            {/* Labels */}
            <div className="mt-3 text-center space-y-1">
                <div className="text-sm font-bold text-slate-200 drop-shadow-sm">{data.label}</div>
                {data.subLabel && (
                    <div className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded inline-block border backdrop-blur-sm",
                        data.subLabelVariant === 'blue' 
                            ? "bg-blue-950/40 text-blue-300 border-blue-800/30"
                            : "bg-slate-800/40 text-slate-400 border-slate-700/30"
                    )}>
                        {data.subLabel}
                    </div>
                )}
            </div>

            {/* Hidden Handles for React Flow Logic */}
            <Handle type="target" position={Position.Left} id="l" className="!bg-transparent !border-0" />
            <Handle type="source" position={Position.Right} id="r" className="!bg-transparent !border-0" />
            <Handle type="target" position={Position.Right} id="r-t" className="!bg-transparent !border-0" />
            <Handle type="source" position={Position.Left} id="l-s" className="!bg-transparent !border-0" />
            <Handle type="source" position={Position.Top} id="t" className="!bg-transparent !border-0" />
            <Handle type="target" position={Position.Bottom} id="b" className="!bg-transparent !border-0" />
        </div>
    );
};

const nodeTypes = {
    custom: TopologyNode,
};

interface TopologyGraphProps {
    type: string;
    appName: string;
    category: string;
    identityCount?: number;
    source?: string;
    user?: string;
    onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}

export function TopologyGraph({ type, appName, category, identityCount = 1, source, user, onNodeClick }: TopologyGraphProps) {
    const isInHouse = type === 'In-House';
    const isDataExfiltration = type === 'Data';
    const activeUserCount = identityCount;
    const potentialUserCount = Math.max(activeUserCount * 5, 20);

    const { nodes, edges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Center Node Position
        const centerX = 300;
        const centerY = 200;

        if (isDataExfiltration) {
             // --- Data Exfiltration Topology ---
             
             // 1. Source (Left)
             nodes.push({
                 id: 'source',
                 type: 'custom',
                 position: { x: centerX - 250, y: centerY },
                 data: {
                     label: source || 'Source',
                     icon: Database,
                     badge: 'Source'
                 }
             });

             // 2. User (Center)
             nodes.push({
                 id: 'user',
                 type: 'custom',
                 position: { x: centerX, y: centerY },
                 data: {
                     label: user || 'User',
                     icon: User,
                     isMain: true,
                     badge: 'Actor'
                 }
             });

             // 3. Destination (Right)
             nodes.push({
                 id: 'dest',
                 type: 'custom',
                 position: { x: centerX + 250, y: centerY },
                 data: {
                     label: appName || 'Destination',
                     icon: LayoutGrid,
                     badge: 'Destination',
                     subLabel: 'Blocked'
                 }
             });

             // Edges
             // Source -> User (Download)
             edges.push({
                 id: 'e-source-user',
                 source: 'source',
                 target: 'user',
                 sourceHandle: 'r',
                 targetHandle: 'l',
                 label: 'Download',
                 animated: true,
                 style: { stroke: '#ef4444', strokeWidth: 2 },
                 labelStyle: { fill: '#ef4444', fontWeight: 700 },
                 markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
             });

             // User -> Dest (Upload)
             edges.push({
                 id: 'e-user-dest',
                 source: 'user',
                 target: 'dest',
                 sourceHandle: 'r',
                 targetHandle: 'l',
                 label: 'Upload',
                 animated: true,
                 style: { stroke: '#ef4444', strokeWidth: 2 },
                 labelStyle: { fill: '#ef4444', fontWeight: 700 },
                 markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
             });

        } else if (!isInHouse) {
            // --- 3rd Party Topology ---
            
            // 1. Center Node (The App)
            nodes.push({
                id: 'app',
                type: 'custom',
                position: { x: centerX, y: centerY },
                data: { 
                    label: appName, 
                    icon: category === 'LLM' ? Box : LayoutGrid, 
                    isMain: true,
                    badge: 'Risk',
                },
            });

            // 2. Authorized Access (Right side, pointing to App)
            nodes.push({
                id: 'users',
                type: 'custom',
                position: { x: centerX + 250, y: centerY },
                data: { 
                    label: 'Authorized Access', 
                    subLabel: `${activeUserCount} Active vs ${potentialUserCount} Potential`,
                    subLabelVariant: 'blue',
                    icon: User 
                },
            });

            // Edge: Users -> App (Right to Left flow)
            edges.push({
                id: 'e-users-app',
                source: 'users',
                target: 'app',
                sourceHandle: 'l-s', // Left source
                targetHandle: 'r-t', // Right target
                type: 'default',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            });

            // 3. Integrations (Left side)
            // Google Drive
            nodes.push({
                id: 'gdrive',
                type: 'custom',
                position: { x: centerX - 250, y: centerY - 100 },
                data: { 
                    label: 'Google Drive', 
                    subLabel: 'Read-Only', 
                    icon: Database 
                },
            });

            // Slack
            nodes.push({
                id: 'slack',
                type: 'custom',
                position: { x: centerX - 250, y: centerY + 100 },
                data: { 
                    label: 'Slack', 
                    subLabel: 'Read-Write', 
                    icon: MoreHorizontal 
                },
            });

            // Edges: Integrations -> App
            edges.push({
                id: 'e-gdrive-app',
                source: 'gdrive',
                target: 'app',
                sourceHandle: 'r',
                targetHandle: 'l',
                type: 'default',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            });

            edges.push({
                id: 'e-slack-app',
                source: 'slack',
                target: 'app',
                sourceHandle: 'r',
                targetHandle: 'l',
                type: 'default',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            });

        } else {
            // --- In-House Topology ---
            // Similar logic but left-to-right flow for internal apps
            
            // 1. Users (Left)
            nodes.push({
                id: 'users',
                type: 'custom',
                position: { x: 50, y: centerY },
                data: { 
                    label: 'Employees', 
                    subLabel: `${activeUserCount} Active`,
                    subLabelVariant: 'blue',
                    icon: User 
                },
            });

            // 2. Center App
            nodes.push({
                id: 'app',
                type: 'custom',
                position: { x: 300, y: centerY },
                data: { 
                    label: appName, 
                    subLabel: 'v1.2',
                    icon: Bot, 
                    isMain: true,
                    badge: 'Internal'
                },
            });

            // 3. Resources (Right)
            nodes.push({
                id: 'vectordb',
                type: 'custom',
                position: { x: 550, y: centerY - 80 },
                data: { 
                    label: 'Vector DB', 
                    subLabel: 'Knowledge Base', 
                    icon: Database 
                },
            });

            nodes.push({
                id: 'llm',
                type: 'custom',
                position: { x: 550, y: centerY + 80 },
                data: { 
                    label: 'Llama 2', 
                    subLabel: 'Inference', 
                    icon: Box 
                },
            });

            // Edges
            edges.push({
                id: 'e-users-app',
                source: 'users',
                target: 'app',
                sourceHandle: 'r',
                targetHandle: 'l',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            });

            edges.push({
                id: 'e-app-vectordb',
                source: 'app',
                target: 'vectordb',
                sourceHandle: 'r',
                targetHandle: 'l',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            });

            edges.push({
                id: 'e-app-llm',
                source: 'app',
                target: 'llm',
                sourceHandle: 'r',
                targetHandle: 'l',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            });
        }

        return { nodes, edges };
    }, [isInHouse, isDataExfiltration, appName, category, activeUserCount, potentialUserCount, source, user]);

    return (
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                    <Activity size={18} className="text-blue-400" />
                    Asset Topology & Access Scope
                </h3>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-1 rounded">
                    {isDataExfiltration ? 'DATA FLOW' : (isInHouse ? 'In-House App' : '3RD PARTY')}
                </span>
            </div>

            {/* Graph Area */}
            <div className="w-full relative bg-slate-950" style={{ height: '500px', width: '100%', minWidth: '300px' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    className="w-full h-full"
                    fitViewOptions={{ padding: 0.3 }}
                    minZoom={0.5}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                    onNodeClick={onNodeClick}
                >
                    <Background 
                        color="#334155" 
                        gap={20} 
                        size={1} 
                        variant={BackgroundVariant.Dots}
                        className="opacity-40"
                    />
                </ReactFlow>

                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-800 p-3 rounded-lg backdrop-blur-sm flex flex-col gap-2 z-10 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-0.5 bg-blue-500 rounded-full" />
                        <span className="text-[10px] font-medium text-slate-400">Actual Traffic</span>
                    </div>
                    {!isInHouse && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-0.5 bg-slate-500 border-b border-dashed border-slate-500" />
                            <span className="text-[10px] font-medium text-slate-400">Permission Scope</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}