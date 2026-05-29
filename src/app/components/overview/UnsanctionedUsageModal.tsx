import React from 'react';
import { X, ShieldAlert, Globe, FileText, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TRAFFIC_DATA = [
  { day: 'Sat', value: 75 },
  { day: 'Sun', value: 60 },
  { day: 'Mon', value: 65 },
  { day: 'Tue', value: 85 },
  { day: 'Wed', value: 88 },
  { day: 'Thu', value: 65 },
  { day: 'Fri', value: 300 },
];

const SENSITIVITY_DATA = [
  { name: 'Source Code', value: 45, color: '#f87171' },
  { name: 'PII', value: 25, color: '#fbbf24' },
  { name: 'General Text', value: 30, color: '#94a3b8' },
];

interface UnsanctionedUsageModalProps {
    event: any;
    onClose: () => void;
    isOpen?: boolean;
}

export function UnsanctionedUsageModal({ event, onClose, isOpen = true }: UnsanctionedUsageModalProps) {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
        <div className="w-full h-full max-w-7xl bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 shrink-0">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <AlertTriangle className="text-amber-600 dark:text-amber-500" size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{event.app || 'Unknown App'}</h2>
                            {event.isNew && (
                                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    New Discovery
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mt-1">
                            <span>{event.category || 'Productivity'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Globe size={12} /> Public SaaS</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm">
                        <ShieldAlert size={16} />
                        High Risk
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Row 1: Traffic & Risk Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Traffic Analysis */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-slate-100">Traffic Analysis</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Request volume over the last 7 days</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{event.traffic || '1.2 MB'}</div>
                            <div className="text-xs font-bold text-green-600 dark:text-green-400">+12% vs last week</div>
                        </div>
                    </div>
                    
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150}>
                            <LineChart data={TRAFFIC_DATA}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }} 
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Intelligence */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-slate-400" />
                        Risk Intelligence
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <Globe className="text-slate-400 shrink-0 mt-0.5" size={16} />
                            <div>
                                <div className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">Hosting</div>
                                <p className="text-sm text-gray-600 dark:text-slate-400 leading-snug">
                                    Servers located in <span className="font-bold text-amber-600 dark:text-amber-500">Non-GDPR Region</span> (China).
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <FileText className="text-slate-400 shrink-0 mt-0.5" size={16} />
                            <div>
                                <div className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">Terms of Service</div>
                                <p className="text-sm text-gray-600 dark:text-slate-400 leading-snug">
                                    Data sent to this API is <span className="font-bold text-red-600 dark:text-red-400">used for training</span> base models.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex gap-0.5 mt-1">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className={`w-1.5 h-4 rounded-sm ${i <= 2 ? 'bg-amber-400' : 'bg-gray-200 dark:bg-slate-600'}`} />
                                ))}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">Reputation</div>
                                <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Low Trust</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Data Sensitivity, Dept Adoption, Recommended Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Data Sensitivity */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-6">Data Sensitivity</h3>
                    <div className="flex items-center gap-6">
                        <div className="relative w-28 h-28">
                            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                <PieChart>
                                    <Pie
                                        data={SENSITIVITY_DATA}
                                        innerRadius={35}
                                        outerRadius={50}
                                        paddingAngle={2}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {SENSITIVITY_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <ShieldAlert size={20} />
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            {SENSITIVITY_DATA.map((item) => (
                                <div key={item.name} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        {item.name}
                                    </div>
                                    <div className="font-bold text-gray-900 dark:text-slate-100">{item.value}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Department Adoption */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-6">Department Adoption</h3>
                    <div className="space-y-4">
                        {[
                            { name: 'Engineering', count: 12, pct: 80, color: 'bg-indigo-500' },
                            { name: 'Marketing', count: 5, pct: 30, color: 'bg-indigo-500' },
                            { name: 'Sales', count: 2, pct: 10, color: 'bg-indigo-500' }
                        ].map(dept => (
                            <div key={dept.name}>
                                <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    <span>{dept.name}</span>
                                    <span>{dept.count} Users</span>
                                </div>
                                <div className="h-2 w-full bg-indigo-50 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${dept.color}`} style={{ width: `${dept.pct}%` }} />
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 text-center">
                            <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700">View all users</button>
                        </div>
                    </div>
                </div>

                {/* Recommended Action */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-900/30 shadow-sm flex flex-col">
                    <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-600 dark:text-blue-400"><AlertTriangle size={14} /></div>
                        Recommended Action
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-6 leading-relaxed flex-1">
                        Due to high data exfiltration risk and non-compliant hosting, we recommend blocking access immediately.
                    </p>
                    <button className="w-full py-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-lg font-bold text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        Notify User via Slack
                    </button>
                </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center mt-auto shrink-0 sticky bottom-0 z-10">
              <button className="text-sm font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200">View Full Report</button>
              <div className="flex gap-3">
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 shadow-sm">
                      <ShieldAlert size={16} /> Create Policy
                  </button>
                  <button className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-600 shadow-sm flex items-center gap-2">
                      <X size={16} /> Sanction App
                  </button>
              </div>
          </div>
        </div>
    </div>
  );
}
