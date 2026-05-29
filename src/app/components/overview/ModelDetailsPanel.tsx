import React from 'react';
import { motion } from 'motion/react';
import { 
    X, Box, Cpu, Zap, Activity, ShieldAlert, 
    GitBranch, Clock, Database, Lock, Search, 
    Filter, Download, AlertTriangle, FileCode,
    MoreHorizontal, Tag, Globe, ShieldCheck, Calendar,
    Network, FileCheck, BarChart3, AlertCircle, CheckCircle,
    Layers, Settings, FileLock, Eye, AlertOctagon
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AppTopology } from './AppTopology';

interface ModelDetailsPanelProps {
    model: any;
    onClose: () => void;
}

// --- Mock Data ---

const TOKEN_USAGE_DATA = Array.from({ length: 14 }).map((_, i) => ({
    date: `Nov ${i + 1}`,
    prompt: Math.floor(Math.random() * 500000) + 100000,
    completion: Math.floor(Math.random() * 300000) + 50000,
    latency: Math.floor(Math.random() * 200) + 50, // ms
}));

const SAFETY_SCORES = [
    { subject: 'Bias Resistance', A: 85, fullMark: 100 },
    { subject: 'Jailbreak Safety', A: 65, fullMark: 100 },
    { subject: 'PII Protection', A: 90, fullMark: 100 },
    { subject: 'Code Safety', A: 75, fullMark: 100 },
    { subject: 'Toxicity', A: 95, fullMark: 100 },
    { subject: 'Hallucination', A: 60, fullMark: 100 },
];

export function ModelDetailsPanel({ model, onClose }: ModelDetailsPanelProps) {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [showRisks, setShowRisks] = React.useState(true);
    const [topologyMode, setTopologyMode] = React.useState<'permissive' | 'actual'>('permissive');
    const [selectedRisk, setSelectedRisk] = React.useState<any>(null);

    if (!model) return null;

    // Derived / Mock Data
    const cciScore = model.ccl || 85; // Using ccl from model object if available
    const hosted = model.hosted || 'External';
    const params = model.params || 'Unknown';
    const type = model.type || 'Public';
    const firstSeen = model.firstSeen || 'Jan 15, 2023';
    const lastSeen = model.lastSeen || 'Just now';
    
    // Model-specific Risk Events
    const riskEvents = [
        { id: 1, type: 'Adversarial Attack', message: `Adversarial suffix detected in prompt targeting ${model.name}.`, date: 'Today, 09:15 AM', severity: 'Critical Risk' },
        { id: 2, type: 'Data Exfiltration', message: `Sensitive PII detected in training data/fine-tuning set.`, date: 'Yesterday, 2:30 PM', severity: 'High Risk' },
        { id: 3, type: 'Model Inversion', message: `Repeated queries suggesting model inversion attempt.`, date: 'Oct 24, 2024', severity: 'Medium Risk' }
    ];

    // Model-specific Posture Rules
    const postureRules = [
        { status: 'Passed', rule: 'Model weights must be encrypted at rest.' },
        { status: 'Passed', rule: 'Inference endpoints must require mutual TLS.' },
        { status: 'Failed', rule: 'Model card must be complete and up-to-date.' },
        { status: 'Passed', rule: 'Input validation enabled for all prompts.' },
        { status: 'Warning', rule: 'Regular bias testing schedule established.' },
        { status: 'Passed', rule: 'Output content filtering enabled.' },
    ];

    const POLICY_DATA = [
        {
            id: 'access',
            title: 'Access Control',
            icon: Lock,
            count: 2,
            hits: 15,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-100 dark:border-blue-900/30',
            policies: [
                { name: 'Restrict Fine-tuning Access', status: 'Active', hits: 5 },
                { name: 'API Key Rotation Policy', status: 'Active', hits: 10 }
            ]
        },
        {
            id: 'security',
            title: 'AI Security',
            icon: ShieldAlert,
            count: 3,
            hits: 8,
            color: 'text-red-500',
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-100 dark:border-red-900/30',
            policies: [
                { name: 'Prompt Injection Defense', status: 'Active', hits: 6 },
                { name: 'Jailbreak Detection', status: 'Active', hits: 2 },
                { name: 'Model Serialization Check', status: 'Monitor', hits: 0 }
            ]
        },
        {
            id: 'compliance',
            title: 'Compliance',
            icon: FileCheck,
            count: 2,
            hits: 0,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-100 dark:border-emerald-900/30',
            policies: [
                { name: 'EU AI Act Compliance', status: 'Active', hits: 0 },
                { name: 'Data Provenance Tracking', status: 'Active', hits: 0 }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-[60%] h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"
            >
                {/* 1. Fixed Header (Sticky) */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-sm relative">
                    <div className="px-8 py-6 pb-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-5">
                                <div className={cn(
                                    "w-16 h-16 rounded-xl flex items-center justify-center shadow-sm border",
                                    (model.status?.toLowerCase() === 'sanctioned') ? "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400"
                                )}>
                                    <Box size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{model.name}</h2>
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border",
                                            (model.status?.toLowerCase() === 'sanctioned') ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                                        )}>
                                            {model.status || 'Unsanctioned'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400 mt-2">
                                        <div className="flex items-center gap-2">
                                            <Tag size={14} />
                                            <span>{type} Model</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Cpu size={14} />
                                            <span>{params} Params</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={14} />
                                            <span>CCI: <span className="font-semibold text-slate-700 dark:text-slate-300">{cciScore}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Database size={14} />
                                            <span>Hosted: {hosted}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            <span>First: {firstSeen}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} />
                                            <span>Last: {lastSeen}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <MoreHorizontal size={24} />
                                    </button>
                                    
                                    {isMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 flex flex-col py-1">
                                            <button 
                                                className="px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                {(model.status?.toLowerCase() === 'sanctioned') ? 'Mark as Unsanctioned' : 'Mark as Sanctioned'}
                                            </button>
                                            <button 
                                                className="px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                View Model Card
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                    <div className="px-8 py-6">
                        
                        {/* Risk Section */}
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <AlertCircle size={14} />
                                Risks
                            </h3>
                            <div className="space-y-3">
                                {riskEvents.map(event => (
                                    <div 
                                        key={event.id} 
                                        onClick={() => setSelectedRisk(event)}
                                        className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group shadow-sm cursor-pointer"
                                    >
                                        <div className={cn(
                                            "mt-1.5 w-2 h-2 rounded-full shrink-0",
                                            event.severity === 'High Risk' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                            event.severity === 'Critical Risk' ? "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]" :
                                            "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <p className="text-sm text-slate-900 dark:text-slate-200 font-medium leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {event.message}
                                                </p>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap pt-0.5">
                                                    {event.date}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={cn(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                                                    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                                )}>
                                                    {event.type}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded border font-semibold",
                                                    event.severity === 'High Risk' ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30" :
                                                    event.severity === 'Critical Risk' ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800" :
                                                    "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30"
                                                )}>
                                                    {event.severity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tabs Section */}
                        <Tabs defaultValue="topology" className="flex flex-col">
                            <div className="border-b border-slate-200 dark:border-slate-800 mb-6 bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 pt-2 -mt-2">
                                <TabsList className="bg-transparent h-auto p-0 gap-8">
                                    <TabsTrigger 
                                        value="topology" 
                                        className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Network size={16} />
                                            Topology
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="posture" 
                                        className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={16} />
                                            Posture
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="policy" 
                                        className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileCheck size={16} />
                                            Policy
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="usage" 
                                        className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={16} />
                                            Usage & Safety
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="min-h-[600px]">
                                {/* Topology Tab */}
                                <TabsContent value="topology" className="mt-0 flex flex-col gap-6">
                                    <div className="h-[500px] relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm shrink-0">
                                     <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
                                        <button
                                            onClick={() => setTopologyMode('permissive')}
                                            className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                topologyMode === 'permissive' 
                                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm" 
                                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            Permissive Scope
                                        </button>
                                        <button
                                            onClick={() => setTopologyMode('actual')}
                                            className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                topologyMode === 'actual' 
                                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm" 
                                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            Actual Traffic
                                        </button>
                                     </div>

                                     <div className="absolute top-4 right-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Show Risks</span>
                                        <button
                                            onClick={() => setShowRisks(!showRisks)}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                                                showRisks ? "bg-red-500" : "bg-slate-200 dark:bg-slate-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm",
                                                    showRisks ? "translate-x-4.5" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                     </div>
                                     <div className="absolute inset-0">
                                        {/* Reusing AppTopology for Model - assuming it can handle generic graph structure */}
                                        <AppTopology appName={model.name} appType="Model" showRisks={showRisks} mode={topologyMode} />
                                     </div>
                                    </div>
                                    
                                    {/* Supply Chain Table */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                <Network size={16} className="text-slate-500" />
                                                Upstream Dependencies
                                            </h3>
                                        </div>
                                        <div className="p-6 text-sm text-slate-500 text-center italic">
                                            No external dependencies detected for this model.
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Posture Tab */}
                                <TabsContent value="posture" className="mt-0">
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                                <ShieldCheck size={16} className="text-emerald-500" />
                                                Model Security Posture
                                            </h3>
                                            <div className="space-y-3">
                                                {postureRules.map((item, i) => (
                                                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <div className={cn(
                                                            "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                                            item.status === 'Passed' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                                                            item.status === 'Failed' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                                            "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                                        )}>
                                                            {item.status === 'Passed' ? <CheckCircle size={12} /> : 
                                                             item.status === 'Failed' ? <AlertCircle size={12} /> : 
                                                             <AlertTriangle size={12} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{item.rule}</p>
                                                        </div>
                                                        <span className={cn(
                                                            "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                                            item.status === 'Passed' ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20" : 
                                                            item.status === 'Failed' ? "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20" :
                                                            "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20"
                                                        )}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Policy Tab */}
                                <TabsContent value="policy" className="mt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {POLICY_DATA.map(policy => (
                                            <div key={policy.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                                                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", policy.bg, policy.color)}>
                                                            <policy.icon size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{policy.title}</h3>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{policy.count} Policies Active</p>
                                                        </div>
                                                    </div>
                                                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full", policy.bg, policy.color)}>
                                                        {policy.hits} Hits
                                                    </span>
                                                </div>
                                                <div className="p-4 space-y-2 flex-1 bg-slate-50/50 dark:bg-slate-900/30">
                                                    {policy.policies.map((p, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", 
                                                                    p.status === 'Active' ? "bg-emerald-500" : "bg-slate-300"
                                                                )} />
                                                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={p.name}>{p.name}</span>
                                                            </div>
                                                            {p.hits > 0 && (
                                                                <span className="text-[10px] font-mono text-slate-400">{p.hits}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* Usage & Safety Tab (Original Content moved here) */}
                                <TabsContent value="usage" className="mt-0 space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-4 gap-6">
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Context Window</div>
                                            <div className="font-mono text-slate-700 dark:text-slate-300 text-lg">32k Tokens</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Avg Latency</div>
                                            <div className="font-mono text-slate-700 dark:text-slate-300 text-lg">145ms</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Training Cutoff</div>
                                            <div className="font-mono text-slate-700 dark:text-slate-300 text-lg">Dec 2023</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">License</div>
                                            <div className="font-mono text-slate-700 dark:text-slate-300 text-lg">Apache 2.0</div>
                                        </div>
                                    </div>

                                    {/* Charts: Usage & Safety */}
                                    <div className="grid grid-cols-3 gap-6">
                                        {/* Token Usage Stacked Bar */}
                                        <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                                <Zap size={16} className="text-yellow-500" />
                                                Token Consumption (Prompt vs Completion)
                                            </h3>
                                            <div className="h-72">
                                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                                                    <BarChart data={TOKEN_USAGE_DATA} stacked>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                                                            cursor={{fill: '#f1f5f9'}}
                                                        />
                                                        <Legend />
                                                        <Bar dataKey="prompt" stackId="a" fill="#6366f1" name="Prompt Tokens" radius={[0, 0, 4, 4]} />
                                                        <Bar dataKey="completion" stackId="a" fill="#a855f7" name="Completion Tokens" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Safety Radar Chart */}
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                                <ShieldAlert size={16} className="text-red-500" />
                                                Safety Scorecard
                                            </h3>
                                            <div className="h-72">
                                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={SAFETY_SCORES}>
                                                        <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                        <Radar
                                                            name="Safety Score"
                                                            dataKey="A"
                                                            stroke="#ef4444"
                                                            strokeWidth={2}
                                                            fill="#ef4444"
                                                            fillOpacity={0.2}
                                                        />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Latency Chart */}
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                            <Clock size={16} className="text-emerald-500" />
                                            Inference Latency Trend
                                        </h3>
                                        <div className="h-60">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150}>
                                                <AreaChart data={TOKEN_USAGE_DATA}>
                                                    <defs>
                                                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} unit="ms" />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                                                    />
                                                    <Area type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} fill="url(#colorLatency)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
