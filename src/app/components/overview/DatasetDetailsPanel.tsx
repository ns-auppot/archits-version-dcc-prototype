import React from 'react';
import { motion } from 'motion/react';
import { 
    X, Database, Shield, Eye, Lock, Globe, FileText, 
    HardDrive, AlertTriangle, ArrowRight, Share2, Server, Activity, GitBranch, Box
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

interface DatasetDetailsPanelProps {
    dataset: any;
    onClose: () => void;
}

// --- Mock Data ---

const SENSITIVE_DATA_DISTRIBUTION = [
    { name: 'PII (Email, Phone)', value: 45, color: '#ef4444' }, // Red
    { name: 'Financial (PCI)', value: 25, color: '#f97316' }, // Orange
    { name: 'PHI (Health)', value: 15, color: '#eab308' }, // Yellow
    { name: 'Non-Sensitive', value: 15, color: '#10b981' }, // Green
];

const EGRESS_DESTINATIONS = [
    { name: 'Fine-tuning (Internal)', count: 450 },
    { name: 'RAG Pipeline', count: 320 },
    { name: 'Public Analytics', count: 120 },
    { name: 'External Partner', count: 50 },
];

const MOCK_EVENTS = [
    { id: 1, time: '11:20 AM', user: 'alice@corp.com', action: 'Bulk Download', volume: '12 GB', status: 'Blocked' },
    { id: 2, time: '10:05 AM', user: 'S3-Replication', action: 'Mirroring', volume: '2 TB', status: 'Allowed' },
    { id: 3, time: '09:45 AM', user: 'bob@marketing', action: 'Query (PII)', volume: '50 MB', status: 'Flagged' },
];

export function DatasetDetailsPanel({ dataset, onClose }: DatasetDetailsPanelProps) {
    if (!dataset) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-[60%] h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between shrink-0">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-xl bg-pink-50 dark:bg-pink-900/30 border border-pink-100 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-sm">
                            <Database size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dataset.name}</h2>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border",
                                    dataset.type === 'Sensitive' ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50" : 
                                    dataset.type === 'Public' ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50" :
                                    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                                )}>
                                    {dataset.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <HardDrive size={14} /> {dataset.size}
                                </span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span className="flex items-center gap-1.5">
                                    <Server size={14} /> {dataset.location}
                                </span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span className="flex items-center gap-1.5">
                                    <FileText size={14} /> Parquet / JSON
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Security Controls Grid */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Encryption</div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Lock size={16} className="text-emerald-500" /> AES-256
                                </div>
                            </div>
                            <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Shield size={20} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Access Level</div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Eye size={16} className="text-orange-500" /> Restricted
                                </div>
                            </div>
                            <div className="h-10 w-10 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <AlertTriangle size={20} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Last Scan</div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">2 hours ago</div>
                            </div>
                            <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Activity size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Charts: Sensitivity & Egress */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Sensitive Data Distribution */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                <Shield size={16} className="text-red-500" />
                                Sensitive Data Composition
                            </h3>
                            <div className="h-64 flex items-center">
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                        <PieChart>
                                            <Pie
                                                data={SENSITIVE_DATA_DISTRIBUTION}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {SENSITIVE_DATA_DISTRIBUTION.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-3 pl-4">
                                    {SENSITIVE_DATA_DISTRIBUTION.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Egress Destinations */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                <Share2 size={16} className="text-blue-500" />
                                Data Egress Flow (Top Destinations)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                    <BarChart data={EGRESS_DESTINATIONS} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#94a3b8'}} interval={0} />
                                        <Tooltip 
                                            cursor={{fill: '#f1f5f9'}}
                                            contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                                        />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Data Lineage Hint */}
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-6 text-white border border-slate-800">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <GitBranch size={16} /> Simplified Lineage
                        </h3>
                        <div className="flex items-center justify-between max-w-2xl">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-slate-800 dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                                    <Database size={20} className="text-pink-400" />
                                </div>
                                <span className="text-xs text-slate-400">Raw Source</span>
                            </div>
                            <ArrowRight className="text-slate-600" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-slate-800 dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-500 ring-2 ring-pink-500/50">
                                    <Database size={20} className="text-white" />
                                </div>
                                <span className="text-xs text-white font-bold">{dataset.name}</span>
                            </div>
                            <ArrowRight className="text-slate-600" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-slate-800 dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                                    <Box size={20} className="text-indigo-400" />
                                </div>
                                <span className="text-xs text-slate-400">Training Model</span>
                            </div>
                        </div>
                    </div>

                    {/* Access Log Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Eye size={16} /> Recent Access Logs
                            </h3>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3">Time</th>
                                    <th className="px-6 py-3">User/System</th>
                                    <th className="px-6 py-3">Action</th>
                                    <th className="px-6 py-3">Volume</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {MOCK_EVENTS.map((event) => (
                                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{event.time}</td>
                                        <td className="px-6 py-3 text-slate-900 dark:text-slate-100 font-medium">{event.user}</td>
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{event.action}</td>
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono">{event.volume}</td>
                                        <td className="px-6 py-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                                event.status === 'Blocked' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                                                event.status === 'Flagged' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                                                "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                            )}>
                                                {event.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}