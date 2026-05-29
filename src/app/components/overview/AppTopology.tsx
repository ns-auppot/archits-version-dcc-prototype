import React, { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    MarkerType,
    ConnectionLineType,
    type ProOptions
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TopologyNode from './TopologyNode';
import { useTheme } from 'next-themes';

const nodeTypes = {
    custom: TopologyNode,
};

const proOptions: ProOptions = { hideAttribution: true };

interface AppTopologyProps {
    appName?: string;
    appType?: string;
    showRisks?: boolean;
    mode?: 'permissive' | 'actual';
}

export function AppTopology({ appName = 'App', appType, showRisks = false, mode = 'actual' }: AppTopologyProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { nodes, edges } = useMemo(() => {
        if (mode === 'permissive') {
            const col1X = 250;
            const col2X = 650;
            
            const startY = 50;
            const spacing = 140;
            const totalHeight = (4 - 1) * spacing; // 3 gaps * 140 = 420
            const centerY = startY + (totalHeight / 2);

            const _nodes: Node[] = [
                // --- Main Entity Column ---
                {
                    id: 'perm-main',
                    type: 'custom',
                    position: { x: col1X, y: centerY },
                    data: { 
                        label: 'ChatGPT', // Explicitly requested "ChatGPT"
                        type: 'app', 
                        isMain: true,
                        isSource: true // In this view, it acts as the source
                    },
                },

                // --- Destination Column ---
                {
                    id: 'perm-agents',
                    type: 'custom',
                    position: { x: col2X, y: startY },
                    data: { 
                        label: 'Agents', 
                        type: 'agent', 
                        count: 18,
                        isTarget: true,
                        stats: { type: 'sanctioned', value: 12, total: 18 }, // Example ratio: 12/18
                        riskCount: 3
                    },
                },
                {
                    id: 'perm-models',
                    type: 'custom',
                    position: { x: col2X, y: startY + spacing },
                    data: { 
                        label: 'Models', 
                        type: 'model', 
                        count: 15,
                        isTarget: true,
                        stats: { type: 'sanctioned', value: 15, total: 15 } // Example: 100%
                    },
                },
                {
                    id: 'perm-mcps',
                    type: 'custom',
                    position: { x: col2X, y: startY + (spacing * 2) },
                    data: { 
                        label: 'MCPs', 
                        type: 'mcp', 
                        count: 29,
                        isTarget: true,
                        stats: { type: 'sanctioned', value: 20, total: 29 }
                    },
                },
                {
                    id: 'perm-datastores',
                    type: 'custom',
                    position: { x: col2X, y: startY + (spacing * 3) },
                    data: { 
                        label: 'Data Stores', 
                        type: 'db', 
                        count: 33,
                        isTarget: true,
                        stats: { type: 'scanned', value: 28, total: 33 }
                    },
                },
            ];

            const _edges: Edge[] = [
                { id: 'p1', source: 'perm-main', target: 'perm-agents', animated: true },
                { id: 'p2', source: 'perm-main', target: 'perm-models', animated: true },
                { id: 'p3', source: 'perm-main', target: 'perm-mcps', animated: true },
                { id: 'p4', source: 'perm-main', target: 'perm-datastores', animated: true },
            ];

            const styledEdges = _edges.map(edge => ({
                ...edge,
                type: 'smoothstep',
                style: { 
                    stroke: isDark ? '#475569' : '#cbd5e1',
                    strokeWidth: 2,
                    strokeDasharray: '5,5', // Distinguish permissive edges
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isDark ? '#475569' : '#cbd5e1',
                },
            }));

            return { nodes: _nodes, edges: styledEdges };
        }

        // --- ACTUAL TRAFFIC TOPOLOGY ---
        
        // Configuration for layout
        const col1X = 50;
        const col2X = 450;
        const col3X = 850;
        
        const startY = 50;
        
        // Calculate vertical centers based on the tallest column (Destination: 5 items)
        const destSpacing = 120;
        const destHeight = (5 - 1) * destSpacing; // 480
        const centerY = startY + (destHeight / 2); // 50 + 240 = 290

        // Source Column Layout (2 items)
        const sourceSpacing = 130;
        const sourceStart = centerY - (sourceSpacing / 2);

        const _nodes: Node[] = [
            // --- Source Column ---
            {
                id: 'source-users',
                type: 'custom',
                position: { x: col1X, y: sourceStart }, // 225
                style: { width: 260 },
                data: { 
                    label: 'Internal Users', 
                    type: 'user', 
                    count: 208,
                    isSource: true,
                    riskCount: 15
                },
            },
            {
                id: 'source-agents',
                type: 'custom',
                position: { x: col1X, y: sourceStart + sourceSpacing }, // 355
                style: { width: 260 },
                data: { 
                    label: 'Agents', 
                    type: 'agent', 
                    count: 19,
                    isSource: true
                },
            },

            // --- Main Entity Column ---
            {
                id: 'main-app',
                type: 'custom',
                position: { x: col2X, y: centerY }, // 290
                data: { 
                    label: appName, 
                    type: 'app', 
                    isMain: true 
                },
            },

            // --- Destination Column ---
            {
                id: 'dest-agents',
                type: 'custom',
                position: { x: col3X, y: startY },
                data: { 
                    label: 'Agents', 
                    type: 'agent', 
                    count: 29,
                    isTarget: true,
                    riskCount: 4
                },
            },
            {
                id: 'dest-models',
                type: 'custom',
                position: { x: col3X, y: startY + destSpacing },
                data: { 
                    label: 'Models', 
                    type: 'model', 
                    count: 8,
                    isTarget: true
                },
            },
            {
                id: 'dest-mcps',
                type: 'custom',
                position: { x: col3X, y: startY + (destSpacing * 2) },
                data: { 
                    label: 'MCPs', 
                    type: 'mcp', 
                    count: 53,
                    isTarget: true,
                    riskCount: 8
                },
            },
            {
                id: 'dest-tools',
                type: 'custom',
                position: { x: col3X, y: startY + (destSpacing * 3) },
                data: { 
                    label: 'Tools', 
                    type: 'tool', 
                    count: 108,
                    isTarget: true
                },
            },
            {
                id: 'dest-datastores',
                type: 'custom',
                position: { x: col3X, y: startY + (destSpacing * 4) },
                data: { 
                    label: 'Data Stores', 
                    type: 'db', 
                    count: 53,
                    isTarget: true
                },
            },
        ];

        const _edges: Edge[] = [
            // Sources -> Main
            { id: 'e1', source: 'source-users', target: 'main-app', animated: false },
            { id: 'e2', source: 'source-agents', target: 'main-app', animated: false },

            // Main -> Destinations
            { id: 'e3', source: 'main-app', target: 'dest-agents', animated: false },
            { id: 'e4', source: 'main-app', target: 'dest-models', animated: false },
            { id: 'e5', source: 'main-app', target: 'dest-mcps', animated: false },
            { id: 'e6', source: 'main-app', target: 'dest-tools', animated: false },
            { id: 'e7', source: 'main-app', target: 'dest-datastores', animated: false },
        ];

        // Style edges
        const styledEdges = _edges.map(edge => ({
            ...edge,
            type: 'smoothstep', // or bezier
            style: { 
                stroke: isDark ? '#475569' : '#cbd5e1',
                strokeWidth: 2,
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isDark ? '#475569' : '#cbd5e1',
            },
        }));

        return { nodes: _nodes, edges: styledEdges };
    }, [mode, appName, isDark]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-950 
            [&_.react-flow__controls]:!bg-white dark:[&_.react-flow__controls]:!bg-slate-900 
            [&_.react-flow__controls]:!border-slate-200 dark:[&_.react-flow__controls]:!border-slate-800 
            [&_.react-flow__controls]:!shadow-sm
            [&_.react-flow__controls-button]:!bg-transparent
            [&_.react-flow__controls-button]:!border-slate-100 dark:[&_.react-flow__controls-button]:!border-slate-800
            [&_.react-flow__controls-button_svg]:!fill-slate-500 dark:[&_.react-flow__controls-button_svg]:!fill-slate-400
            [&_.react-flow__controls-button:hover]:!bg-slate-50 dark:[&_.react-flow__controls-button:hover]:!bg-slate-800
        ">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                proOptions={proOptions}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.5}
                maxZoom={2}
                defaultEdgeOptions={{ type: 'smoothstep' }}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                panOnScroll={false}
                panOnDrag={false}
                preventScrolling={false}
            >
                <Background color={isDark ? '#334155' : '#e2e8f0'} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}
