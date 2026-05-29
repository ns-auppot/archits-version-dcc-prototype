import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { GraphNode } from '@/data/perspectives';
import { AlertTriangle, Box, ShieldAlert, ShieldCheck, Users, Wrench, LayoutGrid, Bot, Database, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { RiskDetailsPanel } from './RiskDetailsPanel';

interface UnsanctionedSankeyProps {
  items: any[];
  type: string;
  onBack: () => void;
  onDrillDown?: (view: 'user-group' | 'ou' | 'human-nhi') => void;
}

export function UnsanctionedSankey({ items, type, onBack, onDrillDown }: UnsanctionedSankeyProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isSourceHovered, setIsSourceHovered] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // 1. Process Data
  const { targets } = useMemo(() => {
    // Sort items by user count (descending)
    const sorted = [...items].sort((a, b) => b.users - a.users);
    
    // Take top 4 (changed from 5)
    const topItems = sorted.slice(0, 4);
    const remaining = sorted.slice(4);
    
    const mappedTargets: any[] = topItems.map((item, idx) => ({
      id: `target-${idx}`,
      label: item.name,
      subLabel: `${item.users} Users`,
      type: type as any,
      value: Math.max(2, Math.min(10, Math.ceil(item.users / 10))), // scale value
      status: item.riskLevel === 'critical' ? 'unsanctioned' : item.riskLevel === 'high' ? 'warning' : 'safe',
      icon: type === 'model' ? Box : type === 'app' ? LayoutGrid : type === 'agent' ? Bot : type === 'mcp' ? Database : Wrench,
      originalItem: item
    }));

    if (remaining.length > 0) {
      const totalRemainingUsers = remaining.reduce((acc, curr) => acc + curr.users, 0);
      const otherVal = Math.max(2, Math.min(10, Math.ceil(totalRemainingUsers / 10)));
      mappedTargets.push({
        id: 'target-other',
        label: `Other ${type}s`,
        subLabel: `${remaining.length} items`,
        type: 'safe', // usually less risky or aggregated
        value: otherVal,
        status: 'warning',
        icon: type === 'model' ? Box : type === 'app' ? LayoutGrid : type === 'agent' ? Bot : type === 'mcp' ? Database : Wrench,
        originalItem: null
      });
    }

    return { targets: mappedTargets };
  }, [items, type]);

  const sourceNode: GraphNode = {
    id: 'users',
    label: 'Users',
    type: 'user',
    value: 10,
    status: 'unsanctioned',
    icon: Users
  };

  // 2. Layout Constants
  const containerWidth = 800;
  const containerHeight = 600;
  const colPadding = 50;
  const sourceX = colPadding + 60;
  const targetX = containerWidth - colPadding - 60;
  
  // Link offsets
  const linkSourceX = sourceX + 60; // Right side of source node
  const linkTargetX = targetX - 60; // Left side of target node

  const sourceY = containerHeight / 2;
  const targetSpacing = containerHeight / (targets.length + 1);

  return (
    <>
      <div className="w-full h-full flex flex-col relative bg-white dark:bg-slate-900 overflow-hidden select-none">
         {/* Back Button */}
         <div className="absolute top-6 left-6 z-20">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100">
               <ArrowLeft size={16} />
               Back to Graph
            </Button>
         </div>

         {/* Labels */}
         <div className="absolute top-16 left-0 w-full flex justify-between px-[110px] text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider z-10">
            <span>Source</span>
            <span>Unsanctioned {type}s</span>
         </div>

         <div className="flex-1 flex items-center justify-center relative">
            <div className="relative" style={{ width: containerWidth, height: containerHeight }}>
               <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  {targets.map((target, idx) => {
                     const targetY = (idx + 1) * targetSpacing;
                     const startY = sourceY;
                     const endY = targetY;
                     const isHovered = hoveredNode === target.id;
                     
                     // Bezier curve
                     const path = `M ${linkSourceX} ${startY} C ${linkSourceX + 150} ${startY}, ${linkTargetX - 150} ${endY}, ${linkTargetX} ${endY}`;
                     
                     return (
                        <motion.path
                          key={`link-${idx}`}
                          d={path}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ 
                             pathLength: 1, 
                             opacity: isHovered ? 0.8 : 0.2, // Highlight if hovered, dim if not (or dim by default)
                             stroke: isHovered ? (target.status === 'unsanctioned' ? '#dc2626' : target.status === 'warning' ? '#ea580c' : '#235B9F') : '#94a3b8'
                          }}
                          transition={{ duration: 0.8, delay: idx * 0.05 }}
                          fill="none"
                          strokeWidth={Math.max(2, target.value)}
                          className={cn("transition-colors duration-300", !isHovered && "dark:stroke-slate-600")}
                        />
                     );
                  })}
               </svg>

               {/* Source Node */}
               <motion.div
                  className="absolute z-10 flex flex-col items-center justify-center w-[120px] cursor-pointer group"
                  style={{ left: sourceX, top: sourceY }}
                  initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                  animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
                  onMouseEnter={() => setIsSourceHovered(true)}
                  onMouseLeave={() => setIsSourceHovered(false)}
               >
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 flex items-center justify-center shadow-lg mb-2 relative z-10">
                     <Users size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-slate-100 relative z-10">Identities</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 relative z-10">All Sources</div>

                  {/* Hover Menu */}
                  {isSourceHovered && onDrillDown && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-1.5 z-50 w-64 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex flex-col gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDrillDown('user-group'); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={14} /> Break down by User Group
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDrillDown('ou'); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={14} /> Break down by OU
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDrillDown('human-nhi'); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={14} /> Break down by human and NHIs
                            </button>
                          </div>
                      </div>
                  )}
               </motion.div>

               {/* Target Nodes */}
               {targets.map((target, idx) => {
                  const targetY = (idx + 1) * targetSpacing;
                  
                  const statusColor = 
                      target.status === 'unsanctioned' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-500' :
                      target.status === 'warning' ? 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-500' :
                      'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-500';

                  return (
                     <motion.div
                        key={target.id}
                        className={cn(
                          "absolute z-10 flex flex-col items-center justify-center w-[120px]",
                          target.originalItem ? "cursor-pointer" : "cursor-default"
                        )}
                        style={{ left: targetX, top: targetY }}
                        initial={{ x: '-30%', y: '-50%', opacity: 0 }}
                        animate={{ x: '-50%', y: '-50%', opacity: 1 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        onMouseEnter={() => setHoveredNode(target.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => {
                          if (target.originalItem) {
                            setSelectedApp(target.originalItem);
                          }
                        }}
                     >
                        <div className={cn("w-12 h-12 rounded-lg border-2 flex items-center justify-center shadow-md mb-1 transition-transform duration-200", statusColor, hoveredNode === target.id ? "scale-110" : "")}>
                           {React.createElement(target.icon || Box, { size: 20 })}
                        </div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 text-center leading-tight line-clamp-2 w-full px-1">
                           {target.label}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                           {target.subLabel}
                        </div>
                     </motion.div>
                  );
               })}
            </div>
         </div>
      </div>

      {selectedApp && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-200">
                  <RiskDetailsPanel 
                      event={{...selectedApp, isNew: true}} 
                      type={selectedApp.type || 'unsanctioned'} 
                      onClose={() => setSelectedApp(null)} 
                  />
              </div>
          </div>
      )}
    </>
  );
}
