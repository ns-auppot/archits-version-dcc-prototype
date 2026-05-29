import React from 'react';
import { 
    X, User, FileText, Laptop, Database, 
    Activity, HardDrive, Smartphone, Tablet
} from 'lucide-react';

interface TimelineObjectPanelProps {
    data: {
        type: 'user' | 'file' | 'device' | 'datastore';
        name: string;
    };
    onClose: () => void;
}

export function TimelineObjectPanel({ data, onClose }: TimelineObjectPanelProps) {
    const { type, name } = data;

    // Mock Data Generators
    const getDetails = () => {
        switch (type) {
            case 'user':
                return {
                    icon: User,
                    color: 'text-indigo-600 dark:text-indigo-400',
                    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
                    subtitle: 'Employee Profile',
                    sections: [
                        { label: 'Role', value: 'QE Engineer' },
                        { label: 'Department', value: 'Quality Assurance' },
                        { label: 'Manager', value: 'Sarah Connor' },
                        { label: 'Location', value: 'San Francisco, CA' },
                        { label: 'Risk Score', value: 'High (85/100)', highlight: true }
                    ]
                };
            case 'file':
                return {
                    icon: FileText,
                    color: 'text-amber-600 dark:text-amber-400',
                    bg: 'bg-amber-100 dark:bg-amber-900/30',
                    subtitle: 'File Metadata',
                    sections: [
                        { label: 'Classification', value: 'Confidential / PII', highlight: true },
                        { label: 'Owner', value: 'HR Alice' },
                        { label: 'Size', value: '24.5 MB' },
                        { label: 'Created', value: 'Oct 12, 2023' },
                        { label: 'Last Modified', value: '20 min ago' }
                    ]
                };
            case 'device':
                return {
                    icon: Laptop,
                    color: 'text-slate-600 dark:text-slate-400',
                    bg: 'bg-slate-100 dark:bg-slate-800',
                    subtitle: 'Device Inventory',
                    sections: [
                        { label: 'Status', value: 'Managed / Compliant' },
                        { label: 'OS Version', value: 'macOS Sonoma 14.2' },
                        { label: 'Serial', value: 'C02XV0...', fontMono: true },
                        { label: 'Last Sync', value: '5 min ago' },
                        { label: 'DLP Agent', value: 'Active (v4.5.2)' }
                    ]
                };
            case 'datastore':
                return {
                    icon: Database,
                    color: 'text-blue-600 dark:text-blue-400',
                    bg: 'bg-blue-100 dark:bg-blue-900/30',
                    subtitle: 'Data Resource',
                    sections: [
                        { label: 'Type', value: name.includes('Personal') ? 'Personal Cloud' : 'Enterprise Storage' },
                        { label: 'Access Level', value: name.includes('Personal') ? 'Public / Private' : 'Restricted' },
                        { label: 'URL', value: name.includes('Drive') ? 'drive.google.com' : 'onedrive.live.com', fontMono: true },
                        { label: 'Compliance', value: name.includes('Personal') ? 'Non-Compliant' : 'SOC2 / ISO27001', highlight: name.includes('Personal') }
                    ]
                };
            default:
                return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-100', subtitle: 'Details', sections: [] };
        }
    };

    const details = getDetails();
    const Icon = details.icon;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-start bg-gray-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${details.bg} ${details.color}`}>
                        <Icon size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{name}</h2>
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{details.subtitle}</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Key Attributes */}
                <div className="grid grid-cols-2 gap-4">
                    {details.sections.map((section, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{section.label}</div>
                            <div className={`text-sm font-medium ${section.highlight ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-slate-200'} ${section.fontMono ? 'font-mono text-xs' : ''}`}>
                                {section.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Log Mockup */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                        <Activity size={16} className="text-slate-400" /> Recent Activity
                    </h3>
                    <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-1.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="relative pl-6">
                                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600"></div>
                                <div className="text-xs text-slate-500 mb-0.5">{i * 15} mins ago</div>
                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                    Activity detected related to {name}.
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}