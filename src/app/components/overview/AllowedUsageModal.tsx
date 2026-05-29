import React from 'react';
import { X, CheckCircle, Clock, DollarSign, ThumbsUp, BarChart, Check, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PRODUCTIVITY_DATA = [
  { day: 'Mon', output: 95, cost: 10 },
  { day: 'Tue', output: 85, cost: 12 },
  { day: 'Wed', output: 78, cost: 8 },
  { day: 'Thu', output: 92, cost: 11 },
  { day: 'Fri', output: 78, cost: 15 },
  { day: 'Sat', output: 85, cost: 14 },
  { day: 'Sun', output: 70, cost: 12 },
];

export function AllowedUsageModal({ event, onClose }: { event: any; onClose: () => void }) {
  if (!event) return null;

  return (
    <div className="h-full flex flex-col bg-emerald-50/20 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-emerald-100 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                     <CheckCircle className="text-emerald-600 dark:text-emerald-500" size={24} />
                </div>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{event.app || 'GitHub Copilot'}</h2>
                        <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Policy Compliant
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mt-1">
                        <span>{event.user}</span>
                        <span>•</span>
                        <span>{event.activity}</span>
                    </div>
                </div>
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
            </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                     <Clock size={20} />
                 </div>
                 <div>
                     <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Time Saved</div>
                     <div className="text-xl font-bold text-gray-900 dark:text-slate-100">~4.5 hrs</div>
                 </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                     <DollarSign size={20} />
                 </div>
                 <div>
                     <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Est. Cost</div>
                     <div className="text-xl font-bold text-gray-900 dark:text-slate-100">$0.42</div>
                 </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                     <ThumbsUp size={20} />
                 </div>
                 <div>
                     <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Sentiment</div>
                     <div className="text-xl font-bold text-gray-900 dark:text-slate-100">Positive</div>
                 </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Productivity Impact Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <BarChart size={18} className="text-gray-400" /> Productivity Impact
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-medium">
                        <div className="flex items-center gap-1.5 dark:text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Output
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600" /> Avg Cost
                        </div>
                    </div>
                </div>
                
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150}>
                        <LineChart data={PRODUCTIVITY_DATA}>
                             <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                             <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }} 
                             />
                             {/* Dashed placeholder line for Avg Cost */}
                             <Line type="monotone" dataKey="cost" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 5" dot={false} className="dark:stroke-slate-700" />
                             {/* Main line for Output */}
                             <Line type="monotone" dataKey="output" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 0}} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Compliance Check */}
            <div className="bg-gray-50/50 dark:bg-slate-900/50 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText size={18} className="text-gray-400" /> Compliance Check
                </h3>
                
                <div className="space-y-4">
                    {[
                        { label: 'Data Residency', value: 'US-East', status: 'pass' },
                        { label: 'Encryption', value: 'AES-256', status: 'pass' },
                        { label: 'Access Control', value: 'SSO/MFA', status: 'pass' },
                        { label: 'Audit Log', value: 'Enabled', status: 'pass' },
                    ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-1">
                            <span className="text-sm text-gray-600 dark:text-slate-400">{item.label}</span>
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                                <CheckCircle size={14} />
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-800 mt-auto">
                    <button className="w-full py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors flex items-center justify-center gap-2">
                        <BarChart size={14} className="rotate-90" /> View Full Usage Report
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}