import React from 'react';
import { motion } from 'motion/react';
import { 
    X, Shield, Server, Calendar, Activity, Users, 
    FileText, ArrowUp, ArrowDown, Info, Tag, Layers,
    Globe, Lock, AlertTriangle, CheckCircle, ExternalLink,
    Search, Filter, Download, Network, ShieldCheck, FileCheck, BarChart3,
    AlertOctagon, Eye, LayoutGrid, AlertCircle, MoreHorizontal, ChevronDown, ChevronRight,
    FileLock, Zap, Settings, Database, Bot, Wrench, FileKey, Box, Brain, Cloud
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

import { AppTopology } from './AppTopology';
import { RiskDetailsPanel } from './RiskDetailsPanel';

interface AppDetailsPanelProps {
    app: any;
    onClose: () => void;
    onInvestigate?: (context: { appName: string, riskType: string }) => void;
}

// --- Mock Data Generators ---

const generateTimeSeriesData = (days: number) => {
    return Array.from({ length: days }).map((_, i) => ({
        date: `Nov ${i + 1}`,
        users: Math.floor(Math.random() * 150) + 50,
        requests: Math.floor(Math.random() * 5000) + 1000,
        responses: Math.floor(Math.random() * 4800) + 900,
        upload: Math.floor(Math.random() * 500) + 100, // MB
        download: Math.floor(Math.random() * 2000) + 500, // MB
    }));
};

const USER_GROUPS = [
    { name: 'Engineering', value: 45, color: '#3b82f6' },
    { name: 'Marketing', value: 25, color: '#f43f5e' },
    { name: 'Sales', value: 20, color: '#10b981' },
    { name: 'HR', value: 10, color: '#f59e0b' },
];

const INTENTIONS = [
    { type: 'Code Generation', count: 1245, trend: '+12%' },
    { type: 'Text Summarization', count: 850, trend: '-5%' },
    { type: 'Data Analysis', count: 620, trend: '+8%' },
    { type: 'Creative Writing', count: 340, trend: '+2%' },
];

const MOCK_EVENTS = [
    { id: 1, time: 'Today, 10:23 AM', user: 'alice@corp.com', action: 'Prompt Injection', status: 'Blocked', risk: 'Critical' },
    { id: 2, time: 'Today, 09:45 AM', user: 'bob@corp.com', action: 'Data Upload (PII)', status: 'Flagged', risk: 'High' },
    { id: 3, time: 'Yesterday, 16:20 PM', user: 'charlie@corp.com', action: 'Code Generation', status: 'Allowed', risk: 'Low' },
    { id: 4, time: 'Yesterday, 14:15 PM', user: 'dev-team-svc', action: 'API Request', status: 'Allowed', risk: 'Low' },
    { id: 5, time: 'Nov 12, 11:30 AM', user: 'dave@corp.com', action: 'Large Download', status: 'Monitored', risk: 'Medium' },
];

export function AppDetailsPanel({ app, onClose, onInvestigate }: AppDetailsPanelProps) {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [topologyMode, setTopologyMode] = React.useState<'permissive' | 'actual'>('actual');
    const [selectedRisk, setSelectedRisk] = React.useState<any>(null);
    const [expandedPolicies, setExpandedPolicies] = React.useState<string[]>([]);
    const [activeTab, setActiveTab] = React.useState("relations");
    const data = generateTimeSeriesData(14);

    if (!app) return null;

    // Use name as ID for ChatGPT if app.id is missing or generic
    const appId = app.id || app.name;
    const isChatGPT = (app.name || '').toLowerCase().includes('chatgpt');
    
    // Ensure we can click the malicious risk card for ChatGPT demo
    const handleInvestigate = (riskType: string) => {
        if (onInvestigate) {
            onInvestigate({ 
                appName: app.name || 'ChatGPT', // Fallback for safety
                riskType 
            });
        }
    };

    const togglePolicy = (id: string) => {
        setExpandedPolicies(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const POLICY_DATA = [
        {
            id: 'access',
            title: 'Access Control',
            icon: Lock,
            count: 2,
            hits: 2,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-100 dark:border-blue-900/30',
            policies: [
                { name: 'Block Logins from Non-Corporate Devices', status: 'Active', hits: 1 },
                { name: 'Require MFA for Admin Access', status: 'Active', hits: 1 }
            ]
        },
        {
            id: 'dlp',
            title: 'Data Protection (DLP)',
            icon: FileLock,
            count: 3,
            hits: 3,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-purple-100 dark:border-purple-900/30',
            policies: [
                { name: 'Block Credit Card Numbers (PCI-DSS)', status: 'Active', hits: 2 },
                { name: 'Detect Source Code Uploads', status: 'Active', hits: 1 },
                { name: 'PII Pattern Matching - Global', status: 'Monitor', hits: 0 }
            ]
        },
        {
            id: 'threat',
            title: 'Threat Protection',
            icon: Zap,
            count: 1,
            hits: 0,
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            border: 'border-orange-100 dark:border-orange-900/30',
            policies: [
                { name: 'Malware & Ransomware Heuristics', status: 'Active', hits: 0 }
            ]
        },
        {
            id: 'posture',
            title: 'Posture Management',
            icon: Settings,
            count: 2,
            hits: 1,
            color: 'text-slate-500',
            bg: 'bg-slate-50 dark:bg-slate-900/20',
            border: 'border-slate-100 dark:border-slate-800',
            policies: [
                { name: 'Enforce Enterprise Tagging', status: 'Active', hits: 1 },
                { name: 'CIS Benchmark Compliance', status: 'Warning', hits: 0 }
            ]
        }
    ];

    // Derived / Mock Data for new fields
    const cciScore = app.cciScore || 85;
    const domain = app.domain || `${app.name?.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const isThirdParty = app.type !== 'In-House';
    const firstSeen = app.firstSeen || 'Jan 15, 2023';
    const lastSeen = '1 min ago';
    const category = app.category || 'Productivity';

    const riskEvents = [
        { id: 1, type: 'Unsanctioned Usage', message: `10 users accessed ${app.name} that is unsanctioned.`, date: 'Oct 24, 2024', severity: 'High Risk' },
        { id: 2, type: 'Data Exfiltration', message: `Amy@company.com leaks sensitive data when using ${app.name}.`, date: 'Oct 22, 2024', severity: 'High Risk' },
        { id: 3, type: 'Malicious Attack', message: `Prompt injection attempt detected from internal user.`, date: 'Oct 20, 2024', severity: 'Medium Risk' }
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
                    <div className="px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border",
                                    "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                )}>
                                    {(() => {
                                        const name = (app.name || '').toLowerCase();
                                        // Override for specific apps to use the correct App icon (LayoutGrid)
                                        if (name.includes('chatgpt') || name.includes('midjourney')) {
                                            return <LayoutGrid size={20} />;
                                        }
                                        return app.icon ? React.createElement(app.icon, { size: 20 }) : <LayoutGrid size={20} />;
                                    })()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{app.name}</h2>
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
                                                {(app.status?.toLowerCase() === 'sanctioned') ? 'Mark as Unsanctioned' : 'Mark as Sanctioned'}
                                            </button>
                                            <button 
                                                className="px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                View CCI Details
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

                        {/* Metadata Section */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-4 mb-8">
                            {[
                                { label: 'Asset Type', value: 'Application' },
                                { label: 'Category', value: category },
                                { label: 'Detection Engine', value: 'AI-SPM' },
                                { label: 'Ownership', value: isThirdParty ? '3rd Party' : 'In-House' },
                                { label: 'Status', value: app.status || 'Unsanctioned', isStatus: true },
                                { label: 'CCI Score', value: cciScore },
                                { label: 'Domain', value: domain },
                                { label: 'First Seen', value: firstSeen },
                                { label: 'Last Seen', value: lastSeen },
                            ].map((item, index) => (
                                <div key={index} className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
                                    {item.isStatus ? (
                                        <span className={cn(
                                            "inline-flex self-start items-center px-2 py-0.5 rounded text-xs font-bold border",
                                            (item.value?.toString().toLowerCase() === 'sanctioned') 
                                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50" 
                                                : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                                        )}>
                                            {item.value}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.value?.toString()}>
                                            {item.value}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* Risk Section - Redesigned Grid */}
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                Risks
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {[
                                    { label: 'Shadow AI Usage', count: 0, icon: Eye },
                                    { label: 'Misconfiguration', count: 1, icon: Wrench },
                                    { label: 'Data Exfiltration', count: 3, icon: ArrowUp },
                                    { label: 'Malicious Attack', count: 1, icon: Zap },
                                    { label: 'Harmful Content', count: 0, icon: AlertOctagon },
                                    { label: 'Supply Chain Risk', count: 0, icon: Box },
                                ].map((risk, index) => (
                                    <div 
                                        key={index} 
                                        onClick={() => {
                                            if (risk.count > 0) {
                                                handleInvestigate(risk.label);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                            risk.count > 0 
                                                ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700"
                                                : "bg-slate-50 dark:bg-slate-900/50 border-transparent cursor-default"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            risk.count > 0 
                                                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" 
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                        )}>
                                            <risk.icon size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-xs font-medium",
                                                risk.count > 0 ? "text-slate-900 dark:text-slate-200" : "text-slate-500 dark:text-slate-500"
                                            )}>
                                                {risk.label}
                                            </span>
                                            <span className={cn(
                                                "text-sm font-bold",
                                                risk.count > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-600"
                                            )}>
                                                {risk.count} {risk.count === 1 ? 'Risk' : 'Risks'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tabs Section */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                            <div className="border-b border-slate-200 dark:border-slate-800 mb-3 bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 pt-2 -mt-2">
                                <TabsList className="bg-transparent h-auto p-0 gap-8">
                                    <TabsTrigger 
                                        value="relations" 
                                        className="rounded-none border-0 border-b-2 border-transparent px-0 py-3 data-[state=active]:border-b-blue-600 dark:data-[state=active]:border-b-blue-400 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Network size={16} />
                                            Relations
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="protection" 
                                        className="rounded-none border-0 border-b-2 border-transparent px-0 py-3 data-[state=active]:border-b-blue-600 dark:data-[state=active]:border-b-blue-400 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileCheck size={16} />
                                            Protection
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="usage" 
                                        className="rounded-none border-0 border-b-2 border-transparent px-0 py-3 data-[state=active]:border-b-blue-600 dark:data-[state=active]:border-b-blue-400 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-blue-600 dark:text-slate-400 dark:data-[state=active]:text-blue-400 font-medium"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={16} />
                                            Usage
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="min-h-[600px]">
                                <TabsContent value="relations" className="mt-0 flex flex-col gap-6">
                                    <div className="h-[500px] relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm shrink-0">
                                     <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
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
                                     </div>

                                     <div className="absolute inset-0">
                                        <AppTopology appName={app.name} appType={app.type} mode={topologyMode} />
                                     </div>
                                    </div>


                                </TabsContent>
                                
                                <TabsContent value="protection" className="mt-0 h-[600px] overflow-hidden flex flex-col">
                                    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-1 space-y-4">
                                        {POLICY_DATA.map((category) => (
                                            <div key={category.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                                {/* Category Header */}
                                                <div 
                                                    onClick={() => togglePolicy(category.id)}
                                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-2 rounded-lg", category.bg, category.color)}>
                                                            <category.icon size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{category.title}</h3>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{category.count} policies active</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4">
                                                        {category.hits > 0 ? (
                                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer" onClick={(e) => { e.stopPropagation(); /* Handle click */ }}>
                                                                <AlertCircle size={12} />
                                                                {category.hits} Policy Hit{category.hits !== 1 ? 's' : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                                                <CheckCircle size={12} />
                                                                No Hits
                                                            </span>
                                                        )}
                                                        
                                                        <div className="text-slate-400">
                                                            {expandedPolicies.includes(category.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {expandedPolicies.includes(category.id) && (
                                                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {category.policies.map((policy, idx) => (
                                                                <div key={idx} className="p-4 pl-[72px] flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{policy.name}</span>
                                                                        <div className="flex items-center gap-2">
                                                                             <span className={cn(
                                                                                "text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider",
                                                                                policy.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30" : 
                                                                                policy.status === 'Monitor' ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30" :
                                                                                "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"
                                                                            )}>
                                                                                {policy.status}
                                                                            </span>
                                                                            {policy.hits > 0 && (
                                                                                <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                                                                                    • {policy.hits} matches found
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg transition-colors">
                                                                        View Details
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="usage" className="space-y-6 mt-0">
                                    {activeTab === 'usage' && (
                                    <>
                                    {/* Charts Row 1: Users & Groups */}
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Users Time Series */}
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                                <Users size={16} className="text-blue-500 dark:text-blue-400" />
                                                User Access Trend
                                            </h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150} debounce={50}>
                                                    <AreaChart data={data}>
                                                        <defs>
                                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                            itemStyle={{ color: '#3b82f6' }}
                                                        />
                                                        <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* User Group Breakdown Pie */}
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                                <Layers size={16} className="text-purple-500 dark:text-purple-400" />
                                                Department Breakdown
                                            </h3>
                                            <div className="h-64 flex items-center">
                                                <div className="w-1/2 h-full">
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={150} minHeight={150} debounce={50}>
                                                        <PieChart>
                                                            <Pie
                                                                data={USER_GROUPS}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={60}
                                                                outerRadius={80}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {USER_GROUPS.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="w-1/2 space-y-3 pl-4">
                                                    {USER_GROUPS.map((group) => (
                                                        <div key={group.name} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                                                                <span className="text-sm text-slate-600 dark:text-slate-400">{group.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{group.value}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Charts Row 2: Requests & Intentions */}
                                    <div className="grid grid-cols-3 gap-6">
                                        {/* Request/Response Volume */}
                                        <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                                <Activity size={16} className="text-indigo-500 dark:text-indigo-400" />
                                                Traffic Volume (Requests vs Responses)
                                            </h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150} debounce={50}>
                                                    <LineChart data={data}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                        <Legend />
                                                        <Line type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} dot={false} name="Requests" />
                                                        <Line type="monotone" dataKey="responses" stroke="#ec4899" strokeWidth={2} dot={false} name="Responses" />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Intention Summary */}
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                                <FileText size={16} className="text-slate-500 dark:text-slate-400" />
                                                Top Intentions
                                            </h3>
                                            <div className="space-y-4">
                                                {INTENTIONS.map((intent, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{intent.type}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{intent.count} events</div>
                                                        </div>
                                                        <span className={cn(
                                                            "text-xs font-bold",
                                                            intent.trend.startsWith('+') ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                                                        )}>
                                                            {intent.trend}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Events Table - Moved here from original */}
                                     <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                <Activity size={16} /> Recent Events
                                            </h3>
                                            <div className="flex gap-2">
                                                <button className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                                    <Search size={16} />
                                                </button>
                                                <button className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                                    <Filter size={16} />
                                                </button>
                                                <button className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-6 py-3">Time</th>
                                                    <th className="px-6 py-3">User</th>
                                                    <th className="px-6 py-3">Activity</th>
                                                    <th className="px-6 py-3">Status</th>
                                                    <th className="px-6 py-3">Risk Level</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {MOCK_EVENTS.map((event) => (
                                                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{event.time}</td>
                                                        <td className="px-6 py-3 text-slate-900 dark:text-slate-100 font-medium">{event.user}</td>
                                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{event.action}</td>
                                                        <td className="px-6 py-3">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                                                event.status === 'Blocked' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                                                event.status === 'Allowed' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                                                                "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                            )}>
                                                                {event.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "w-2 h-2 rounded-full",
                                                                    event.risk === 'Critical' ? "bg-red-500" :
                                                                    event.risk === 'High' ? "bg-orange-500" :
                                                                    event.risk === 'Medium' ? "bg-yellow-500" :
                                                                    "bg-green-500"
                                                                )} />
                                                                <span className="text-slate-700 dark:text-slate-300">{event.risk}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </motion.div>

            {selectedRisk && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-200">
                        <RiskDetailsPanel 
                            event={{...app, ...selectedRisk}} 
                            type={selectedRisk.type} 
                            onClose={() => setSelectedRisk(null)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}