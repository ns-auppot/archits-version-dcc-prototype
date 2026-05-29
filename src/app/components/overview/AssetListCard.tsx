import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, Box, Wrench, Bot, Database } from 'lucide-react';
import { RiskEntityCard } from './RiskEntityCard';

interface AssetListCardProps {
    item: any;
    onClick: () => void;
    type?: 'app' | 'model' | 'tool' | 'agent' | 'mcp' | 'dataset';
}

export function AssetListCard({ item, onClick, type = 'app' }: AssetListCardProps) {
    
    const getIcon = () => {
        if (item.icon) return item.icon;
        switch(type) {
            case 'app': return LayoutGrid;
            case 'model': return Box;
            case 'tool': return Wrench;
            case 'agent': return Bot;
            case 'mcp': return Database;
            default: return LayoutGrid;
        }
    };
    
    const Icon = getIcon();

    // Determine badge style based on risk level
    // Normalize input (could be 'critical', 'Critical', 'High Risk', etc.)
    let rawRisk = item.riskLevel || (item.status === 'unsanctioned' ? 'High' : 'Medium');
    if (rawRisk.includes('High')) rawRisk = 'High';
    else if (rawRisk.includes('Medium')) rawRisk = 'Medium';
    else if (rawRisk.includes('Low')) rawRisk = 'Low';
    
    const severity = rawRisk.charAt(0).toUpperCase() + rawRisk.slice(1).toLowerCase(); // Title Case

    // CCI Score logic (Mock if not present)
    const cciScore = item.cciScore || item.cci || (severity === 'Critical' ? 45 : severity === 'High' ? 55 : severity === 'Medium' ? 75 : 88);

    // Risk factors logic
    const riskFactors = [];
    // Heuristics based on data available
    const isNew = item.isNew || (item.discoveryDate && new Date(item.discoveryDate) > new Date('2025-12-01'));
    
    if (isNew) {
        riskFactors.push("Newly discovered AI usage");
    }
    
    const isUnsafe = cciScore < 60 || ['Critical', 'High'].includes(severity);
    if (isUnsafe) {
        riskFactors.push("Unsafe AI usage");
    }
    
    if (item.status === 'unsanctioned' || item.status === 'Unsanctioned') {
        riskFactors.push("Unsanctioned AI usage");
    }
    
    // Fallback
    if (riskFactors.length === 0) {
        riskFactors.push("Shadow AI usage");
    }

    const identities = item.users || 1;
    
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Jan 6, 2026';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return dateStr; // fallback or specific mock date
        }
    };

    // Use the purple style from the screenshot/reference
    const iconColors = "bg-purple-100 dark:bg-[#2e1065]/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30";

    return (
        <RiskEntityCard
            name={item.name}
            icon={Icon}
            iconColors={iconColors}
            severity={severity}
            reasons={riskFactors}
            cci={cciScore}
            identities={identities}
            firstSeen={formatDate(item.discoveryDate || item.firstSeen)}
            onClick={onClick}
        />
    );
}
