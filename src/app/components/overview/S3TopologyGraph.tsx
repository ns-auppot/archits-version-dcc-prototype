import React, { useMemo, useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Handle,
    Position,
    MarkerType,
    type Node,
    type Edge,
    type ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
    Bot, Database, HardDrive, BrainCircuit, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Custom Node Component ---
const TopologyNode = ({ data }: any) => {
    const Icon = data.icon;
    const isRisk = data.isS3 || data.isSalesforce || data.isSharepoint;
    
    return (
        <div className="flex flex-col items-center justify-center relative group">
            {/* Node Body */}
            <div className={cn(
                "min-w-[120px] min-h-[64px] py-2 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg relative border",
                isRisk 
                    ? "bg-red-900/20 border-red-500/50 shadow-red-500/10" 
                    : data.isKnowledgeBase
                        ? "bg-indigo-900/20 border-indigo-500/50 shadow-indigo-500/10"
                        : "bg-slate-900 border-slate-700 hover:border-slate-600"
            )}>
                {Icon && <Icon size={20} className={cn(
                    isRisk ? "text-red-400" : data.isKnowledgeBase ? "text-indigo-400" : "text-slate-400"
                )} />}
                
                <div className="flex flex-col items-start justify-center">
                    <span className={cn(
                        "text-sm font-bold",
                        isRisk ? "text-red-100" : data.isKnowledgeBase ? "text-indigo-100" : "text-slate-200"
                    )}>
                        {data.label}
                    </span>
                    
                    {/* File Name & Tags (Timeline Specific) */}
                    {data.fileName && (
                        <div className="flex items-center gap-1.5 mt-1">
                             <span className="text-[10px] text-slate-400 font-mono">
                                {data.fileName}
                            </span>
                             {data.tags && data.tags.map((tag: string, i: number) => (
                                <span key={i} className="px-1 py-[1px] rounded text-[8px] font-bold bg-amber-950/50 text-amber-400 border border-amber-800/60 leading-tight">
                                    {tag}
                                </span>
                             ))}
                        </div>
                    )}
                </div>

                {/* Badges Container */}
                <div className="absolute -top-3 -right-3 flex flex-col items-end gap-1 z-20">
                    {/* Badge for S3 (PII) */}
                    {data.isS3 && (
                        <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            PII
                        </div>
                    )}
                    
                    {/* Badge for PCI */}
                    {data.isPCI && (
                        <div className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            PCI
                        </div>
                    )}

                    {/* Badge for Salesforce */}
                    {data.isSalesforce && (
                        <div className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            Sales Data
                        </div>
                    )}

                    {/* Badge for Sharepoint */}
                    {data.isSharepoint && (
                        <div className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            Sensitive
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Handles for React Flow Logic */}
            <Handle type="target" position={Position.Left} id="l" className="!bg-transparent !border-0" />
            <Handle type="source" position={Position.Right} id="r" className="!bg-transparent !border-0" />
        </div>
    );
};

const nodeTypes = {
    custom: TopologyNode,
};

export function S3TopologyGraph({ customNodes, customEdges }: { customNodes?: Node[], customEdges?: Edge[] }) {
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

    const defaultData = useMemo(() => {
        const nodes: Node[] = [
            // Left Column
            {
                id: 'auto-agent',
                type: 'custom',
                width: 200, height: 80,
                position: { x: 50, y: 50 },
                data: { label: 'AutoAgent', icon: Bot },
            },
            {
                id: 'copilot-agent',
                type: 'custom',
                width: 200, height: 80,
                position: { x: 50, y: 250 },
                data: { label: 'Copilot Agent', icon: Bot },
            },
            // Center
            {
                id: 'knowledge-base',
                type: 'custom',
                width: 200, height: 80,
                position: { x: 350, y: 150 },
                data: { label: 'Knowledge Base', icon: BrainCircuit, isKnowledgeBase: true },
            },
            // Right
            {
                id: 's3',
                type: 'custom',
                width: 200, height: 80,
                position: { x: 650, y: 150 },
                data: { label: 'S3', icon: HardDrive, isS3: true },
            },
        ];

        const edges: Edge[] = [
            {
                id: 'e1',
                source: 'auto-agent',
                target: 'knowledge-base',
                label: 'Connects',
                type: 'default',
                animated: true,
                style: { stroke: '#64748b', strokeWidth: 1.5 },
                labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 500 },
                labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
            },
            {
                id: 'e2',
                source: 'copilot-agent',
                target: 'knowledge-base',
                label: 'Connects',
                type: 'default',
                animated: true,
                style: { stroke: '#64748b', strokeWidth: 1.5 },
                labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 500 },
                labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
            },
            {
                id: 'e3',
                source: 'knowledge-base',
                target: 's3',
                label: 'Integrates',
                type: 'default',
                animated: true,
                style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 4' },
                labelStyle: { fill: '#ef4444', fontSize: 11, fontWeight: 700 },
                labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
            },
        ];

        return { nodes, edges };
    }, []);

    const nodes = customNodes || defaultData.nodes;
    const edges = customEdges || defaultData.edges;

    useEffect(() => {
        if (rfInstance && nodes.length > 0) {
            window.requestAnimationFrame(() => {
                rfInstance.fitView({ padding: 0.2, duration: 200 });
            });
        }
    }, [rfInstance, nodes]);

    return (
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                    <Activity size={18} className="text-purple-400" />
                    Topology
                </h3>

            </div>
            <div className="w-full relative bg-slate-950" style={{ height: '400px', width: '100%', minWidth: '300px' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onInit={setRfInstance}
                    fitView
                    className="w-full h-full"
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    maxZoom={2.0}
                    zoomOnScroll={true}
                    zoomOnPinch={true}
                    zoomOnDoubleClick={true}
                    panOnDrag={true}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background 
                        color="#334155" 
                        gap={24} 
                        size={1} 
                        variant={BackgroundVariant.Dots}
                        className="opacity-20"
                    />
                </ReactFlow>
            </div>
        </div>
    );
}
