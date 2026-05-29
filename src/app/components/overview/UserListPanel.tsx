import React, { useState } from 'react';
import { 
    X, User, ShieldCheck, AlertTriangle, Search, Filter, 
    ArrowUpDown, ChevronRight, Mail, Building, Activity, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Mock Data ---
const MOCK_USERS = [
    { id: 1, name: "Alice Chen", email: "alice.chen@company.com", department: "Engineering", role: "Senior Developer", traffic: "1.2 GB", risk: "Low", status: "Active", lastActive: "2 mins ago" },
    { id: 2, name: "Bob Smith", email: "bob.smith@company.com", department: "Product", role: "Product Manager", traffic: "450 MB", risk: "Medium", status: "Active", lastActive: "15 mins ago" },
    { id: 3, name: "Charlie Davis", email: "charlie.davis@company.com", department: "Marketing", role: "Marketing Specialist", traffic: "890 MB", risk: "Low", status: "Active", lastActive: "1 hour ago" },
    { id: 4, name: "Diana Prince", email: "diana.prince@company.com", department: "Legal", role: "Legal Counsel", traffic: "120 MB", risk: "High", status: "Flagged", lastActive: "3 hours ago" },
    { id: 5, name: "Evan Wright", email: "evan.wright@company.com", department: "Sales", role: "Sales Director", traffic: "2.1 GB", risk: "Low", status: "Active", lastActive: "5 mins ago" },
    { id: 6, name: "Fiona Gallagher", email: "fiona.g@company.com", department: "HR", role: "HR Manager", traffic: "50 MB", risk: "Low", status: "Active", lastActive: "1 day ago" },
    { id: 7, name: "George Miller", email: "george.m@company.com", department: "Engineering", role: "DevOps Engineer", traffic: "5.6 GB", risk: "Critical", status: "Suspended", lastActive: "Just now" },
    { id: 8, name: "Hannah Lee", email: "hannah.lee@company.com", department: "Data Science", role: "Data Scientist", traffic: "3.4 GB", risk: "Medium", status: "Active", lastActive: "30 mins ago" },
];

interface UserListPanelProps {
    onClose: () => void;
    context?: {
        appName?: string;
        userCount?: number;
    };
}

export function UserListPanel({ onClose, context }: UserListPanelProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRisk, setFilterRisk] = useState<string | null>(null);

    const filteredUsers = MOCK_USERS.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRisk = filterRisk ? user.risk === filterRisk : true;
        return matchesSearch && matchesRisk;
    });

    const getRiskBadge = (risk: string) => {
        switch (risk) {
            case 'Critical': return <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 dark:border-red-800">CRITICAL</span>;
            case 'High': return <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800">HIGH</span>;
            case 'Medium': return <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">MEDIUM</span>;
            case 'Low': return <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">LOW</span>;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-950">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <User size={24} className="text-blue-600 dark:text-blue-400" />
                        Authorized Access
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Users accessing {context?.appName || 'this application'}
                    </p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex gap-3 shrink-0">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search users by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                     <select 
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        onChange={(e) => setFilterRisk(e.target.value || null)}
                     >
                        <option value="">All Risks</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <button className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <Filter size={16} />
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">User Identity</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">Department</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">Traffic</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">Risk Level</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-slate-700">
                                                {user.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900 dark:text-slate-100">{user.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Mail size={10} /> {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{user.department}</span>
                                            <span className="text-xs text-gray-500 dark:text-slate-400">{user.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-slate-400" />
                                            <span className="text-sm font-mono text-gray-700 dark:text-slate-300">{user.traffic}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getRiskBadge(user.risk)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100">
                                            <ChevronRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="text-gray-300 dark:text-slate-600" />
                                        <p>No users found matching your filters</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 shrink-0 flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
                <span>Showing {filteredUsers.length} of {MOCK_USERS.length} users</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Previous</button>
                    <button className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Next</button>
                </div>
            </div>
        </div>
    );
}