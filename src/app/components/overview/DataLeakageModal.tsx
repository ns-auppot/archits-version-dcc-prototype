import React from 'react';
import { X, ShieldAlert, ArrowRight, User, Globe, FileText, Lock, ShieldCheck, Ban, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const RADAR_DATA = [
  { subject: 'PII', A: 40, fullMark: 150 },
  { subject: 'PCI', A: 30, fullMark: 150 },
  { subject: 'Secrets', A: 20, fullMark: 150 },
  { subject: 'IP', A: 50, fullMark: 150 },
  { subject: 'Health', A: 40, fullMark: 150 },
  { subject: 'Legal', A: 30, fullMark: 150 },
];

interface DataLeakageModalProps {
    event: any;
    onClose: () => void;
    isOpen?: boolean;
}

export function DataLeakageModal({ event, onClose, isOpen = true }: DataLeakageModalProps) {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
        <div className="w-full h-full max-w-7xl bg-orange-50/30 dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-orange-100 dark:border-slate-800 sticky top-0 z-10 shrink-0">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-900/30">
                        <ShieldAlert className="text-orange-600 dark:text-orange-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{event.type || 'Data Exfiltration Attempt'}</h2>
                        <div className="flex items-center gap-2 text-sm mt-1">
                            <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 text-xs font-bold px-1.5 py-0.5 rounded">DLP-RULE-294</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 dark:text-slate-400">{event.time || '10m ago'}</span>
                        </div>
                    </div>
                </div>
                
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
                    <X size={20} />
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Incident Path */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-500" /> Incident Path
                    </h3>
                    <div className="flex items-center justify-between px-4">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                <User size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900 dark:text-slate-100">{event.user?.split('@')[0] || 'charlie'}</div>
                                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wide">Internal User</div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 flex-1 px-4">
                            <div className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded text-xs font-bold flex items-center gap-1">
                                <FileText size={12} /> Source Code
                            </div>
                            <ArrowRight size={16} className="text-gray-300 dark:text-slate-600" />
                        </div>

                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                                <Globe size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900 dark:text-slate-100">Public Pastebin</div>
                                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wide">Unsanctioned Dest</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Taken */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-6 border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-lg mb-1">Action Taken: Blocked</h3>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            The transfer was successfully intercepted by the 'Code-Guard-Prod' policy.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Content Analysis */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Content Analysis</h3>
                    
                    <div className="flex-1 min-h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                                <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} />
                                <Radar
                                    name="Content"
                                    dataKey="A"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    fill="#ffedd5"
                                    fillOpacity={0.6}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="text-center text-xs text-gray-500 dark:text-slate-400 mt-2 px-4">
                        High confidence match for <span className="font-bold text-gray-700 dark:text-slate-200">Proprietary Source Code</span> and embedded secrets.
                    </div>
                </div>

                {/* Evidence Details & Remediation */}
                <div className="space-y-6">
                    {/* Evidence Details */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 font-bold text-gray-900 dark:text-slate-100">
                            Evidence Details
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm text-gray-500 dark:text-slate-400">File Name</span>
                                <span className="text-sm font-mono text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">backend_api_v2.py</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-t border-gray-50 dark:border-slate-800/50 pt-3">
                                <span className="text-sm text-gray-500 dark:text-slate-400">Size</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-slate-100">45 KB</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-t border-gray-50 dark:border-slate-800/50 pt-3">
                                <span className="text-sm text-gray-500 dark:text-slate-400">Fingerprint</span>
                                <span className="text-xs font-mono text-gray-500 dark:text-slate-400">SHA256: 8a7b...3f1c</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-t border-gray-50 dark:border-slate-800/50 pt-3">
                                <span className="text-sm text-gray-500 dark:text-slate-400">Classification</span>
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase">Confidential</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Remediation */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Remediation</h4>
                        <div className="space-y-3">
                            <button className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 shadow-sm transition-colors">
                                <Lock size={16} /> Quarantine User Endpoint
                            </button>
                            <button className="w-full py-3 px-4 bg-orange-600 border border-orange-700 rounded-xl text-white font-bold text-sm hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm transition-colors">
                                <Ban size={16} /> Block Destination Domain
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
    </div>
  );
}
