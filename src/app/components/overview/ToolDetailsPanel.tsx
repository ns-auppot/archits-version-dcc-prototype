import React from 'react';
import { motion } from 'motion/react';
import { 
    X, Wrench, Terminal, AlertOctagon, Activity, 
    CheckCircle, XCircle, Code, Layers, Zap
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

interface ToolDetailsPanelProps {
    tool: any;
    onClose: () => void;
}

// --- Mock Data ---

const API_CALL_VOLUME = Array.from({ length: 14 }).map((_, i) => ({
    date: `Nov ${i + 1}`,
    success: Math.floor(Math.random() * 800) + 200,
    error: Math.floor(Math.random() * 50),
}));

const ACTION_DISTRIBUTION = [
    { name: 'Vector Search', count: 4500 },
    { name: 'Upsert', count: 1200 },
    { name: 'Delete', count: 50 },
    { name: 'Describe Index', count: 300 },
];

const MOCK_LOGS = [
    { id: 1, time: '12:05 PM', agent: 'Customer-Support-Bot', action: 'Vector Search', status: 'Success', latency: '45ms' },
    { id: 2, time: '12:04 PM', agent: 'Analyst-Agent', action: 'Delete Record', status: 'Denied', latency: '12ms' },
    { id: 3, time: '11:58 AM', agent: 'RAG-Pipeline', action: 'Upsert (Batch)', status: 'Success', latency: '210ms' },
];

export function ToolDetailsPanel({ tool, onClose }: ToolDetailsPanelProps) {
    if (!tool) return null;

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
                        <div className="w-16 h-16 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-900/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                            <Wrench size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tool.name}</h2>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border",
                                    tool.risk === 'Critical' ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50" : 
                                    tool.risk === 'High' ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50" :
                                    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                                )}>
                                    {tool.risk} Risk
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <Layers size={14} /> {tool.category}
                                </span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span className="flex items-center gap-1.5">
                                    <Activity size={14} /> Usage: {tool.usage}
                                </span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span className="flex items-center gap-1.5">
                                    <Code size={14} /> v2.4.0
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Operational Stats */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Success Rate</div>
                            <div className="font-mono text-2xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                99.8% <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">+0.2%</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Avg Response Time</div>
                            <div className="font-mono text-2xl text-slate-900 dark:text-slate-100">45ms</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Permission Scope</div>
                            <div className="flex gap-1 mt-1">
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold border border-green-200 dark:border-green-900/50">READ</span>
                                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-bold border border-yellow-200 dark:border-yellow-900/50">WRITE</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts: Usage & Actions */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* API Call Volume (Success vs Error) */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                <Activity size={16} className="text-blue-500 dark:text-blue-400" />
                                API Execution Volume
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150}>
                                    <AreaChart data={API_CALL_VOLUME}>
                                        <defs>
                                            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" name="Success" />
                                        <Area type="monotone" dataKey="error" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorError)" name="Errors" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Action Distribution */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                <Terminal size={16} className="text-slate-500 dark:text-slate-400" />
                                Top Actions Performed
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150}>
                                    <BarChart data={ACTION_DISTRIBUTION} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#94a3b8'}} interval={0} />
                                        <Tooltip 
                                            cursor={{fill: '#f1f5f9'}}
                                            contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                                        />
                                        <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Execution Log Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Terminal size={16} /> Recent Executions
                            </h3>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3">Time</th>
                                    <th className="px-6 py-3">Agent/User</th>
                                    <th className="px-6 py-3">Action</th>
                                    <th className="px-6 py-3">Latency</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {MOCK_LOGS.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{log.time}</td>
                                        <td className="px-6 py-3 text-slate-900 dark:text-slate-100 font-medium">{log.agent}</td>
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{log.action}</td>
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono">{log.latency}</td>
                                        <td className="px-6 py-3">
                                            {log.status === 'Success' ? (
                                                <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-bold text-xs">
                                                    <CheckCircle size={14} /> Success
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold text-xs">
                                                    <XCircle size={14} /> {log.status}
                                                </span>
                                            )}
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