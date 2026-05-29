import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraphNode } from '@/data/perspectives';
import { User, LucideIcon, Plus, Globe, BarChart3, Sparkles, ArrowRight, Clock, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MaliciousAttackModal } from './MaliciousAttackModal';
import { cn } from '@/lib/utils';

interface GraphViewProps {
  center: { label: string; icon: LucideIcon };
  nodes: GraphNode[];
  onCenterClick?: () => void;
  onNodeClick?: (node: GraphNode) => void;
  centerMenu?: React.ReactNode;
  layout?: 'radial' | 'sankey' | 'grid' | 'bubble' | 'blank' | 'timeline';
  targets?: GraphNode[]; // For Sankey view
  onCreateView?: (query: string) => void;
}

export function GraphView({ center, nodes, onCenterClick, onNodeClick, centerMenu, layout = 'radial', targets, onCreateView }: GraphViewProps) {
  if (layout === 'timeline') {
    return <TimelineGraph nodes={nodes} onNodeClick={onNodeClick} />;
  }

  if (layout === 'blank') {
    return <BlankGraph onCreateView={onCreateView} />;
  }

  if (layout === 'sankey' && targets) {
    // Determine labels based on node content (simple heuristic)
    let leftLabel = 'Sources';
    let rightLabel = 'Targets';
    
    if (nodes.length > 0) {
       if (nodes[0].id === 'eng') {
          leftLabel = 'User Groups / OUs';
          rightLabel = 'Unsanctioned Entities';
       } else if (nodes[0].id === 'src-apps') {
          leftLabel = 'Source Entities';
          rightLabel = 'Risk Categories';
       } else if (nodes[0].id === 'ext-agents') {
          leftLabel = 'External Sources';
          rightLabel = 'Target Resources';
       }
    }

    return (
       <SankeyGraph 
         sources={nodes} 
         targets={targets} 
         leftLabel={leftLabel}
         rightLabel={rightLabel}
         onBack={onCenterClick} 
         onNodeClick={onNodeClick}
       />
    );
  }

  if (layout === 'grid') {
    return (
      <GridGraph 
        nodes={nodes}
        onNodeClick={onNodeClick}
      />
    );
  }

  if (layout === 'bubble') {
    return (
      <BubbleGraph 
        nodes={nodes}
        onNodeClick={onNodeClick}
      />
    );
  }

  return (
     <RadialGraph 
       center={center} 
       nodes={nodes} 
       onCenterClick={onCenterClick} 
       onNodeClick={onNodeClick}
       centerMenu={centerMenu} 
     />
  );
}

// --- Timeline Graph Implementation ---

function TimelineGraph({ nodes, onNodeClick }: { nodes: GraphNode[], onNodeClick?: (node: GraphNode) => void }) {
  // Mock data for the time-series chart
  const chartData = [2, 0, 5, 8, 3, 0, 0, 12, 15, 6, 2, 0, 4, 9, 11, 5, 0, 0, 7, 3, 1, 0, 2, 4];
  const maxVal = Math.max(...chartData);

  const [selectedAttack, setSelectedAttack] = useState<any>(null);

  const handleCardClick = (node: GraphNode) => {
      setSelectedAttack({
          id: node.id,
          source: node.attackPath?.[0]?.label || 'Unknown Source',
          type: node.label,
          severity: node.status === 'unsanctioned' ? 'Critical' : 'High',
          target: node.attackPath?.[node.attackPath.length - 1]?.label || 'Unknown Target',
          time: node.timestamp,
          attackPath: node.attackPath
      });
      if (onNodeClick) onNodeClick(node);
  };

  return (
    <>
    <div className="w-full h-full bg-white dark:bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Time Series Chart */}
        <div className="mb-10 pl-[120px] ml-8">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Attack Volume (30 Days)</h3>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total: 89</span>
            </div>
            <div className="flex items-end gap-1 h-24 border-b border-gray-200 dark:border-slate-700 pb-px">
                {chartData.map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                        <div 
                            className={cn(
                                "w-full rounded-t-sm transition-all relative",
                                val === 0 ? "h-px bg-gray-100 dark:bg-slate-800" : "bg-red-400 dark:bg-red-500/80 group-hover:bg-red-500 dark:group-hover:bg-red-500"
                            )}
                            style={{ height: val === 0 ? '1px' : `${(val / maxVal) * 100}%` }}
                        >
                             {/* Tooltip */}
                             {val > 0 && (
                                 <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-slate-800 text-white dark:text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap pointer-events-none z-20 border border-transparent dark:border-slate-700">
                                     {val} attacks
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mt-2 font-medium">
                 <span>30 days ago</span>
                 <span>Today</span>
             </div>
        </div>

        <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-[120px] top-4 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />
    
            <div className="space-y-12 pb-20">
              {nodes.map((node, index) => (
            <motion.div 
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex gap-8"
              onClick={() => handleCardClick(node)}
            >
              {/* Timestamp Column */}
              <div className="w-[120px] text-right pt-4 pr-8 shrink-0 relative z-10">
                <span className="text-sm font-semibold text-gray-500 dark:text-slate-400 block">{node.timestamp?.split(',')[0]}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">{node.timestamp?.split(',')[1]}</span>
                
                {/* Timeline Dot */}
                <div className="absolute top-5 -right-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-900 border-2 border-red-500 shadow-sm" />
              </div>

              {/* Card */}
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-6 group cursor-pointer hover:border-red-200 dark:hover:border-red-900">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <AlertTriangle size={20} />
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-900 dark:text-slate-100">{node.label}</h4>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{node.type}</span>
                     </div>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-slate-300 text-sm mb-6 leading-relaxed border-l-2 border-gray-100 dark:border-slate-700 pl-3">
                   {node.description}
                </p>

                {/* Attack Path Visualization */}
                {node.attackPath && (
                  <div className="bg-gray-50/50 dark:bg-slate-900/50 rounded-lg p-4 border border-gray-100 dark:border-slate-700">
                     <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase mb-3 tracking-wider">Attack Path</div>
                     <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {node.attackPath.map((step, idx) => (
                           <div key={step.id} className="flex items-center gap-2">
                              {/* Connector Arrow */}
                              {idx > 0 && (
                                <div className="text-gray-300 dark:text-slate-600">
                                   <ArrowRight size={16} />
                                </div>
                              )}
                              
                              {/* Step Node */}
                              <div className={cn(
                                 "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap min-w-fit",
                                 step.status === 'compromised' ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400" :
                                 step.status === 'impacted' ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400" :
                                 step.status === 'target' ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400" :
                                 "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200"
                              )}>
                                 {step.icon && React.createElement(step.icon, { size: 14 })}
                                 <span>{step.label}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      </div>
    </div>
    <AnimatePresence>
        {selectedAttack && (
            <MaliciousAttackModal 
                event={selectedAttack} 
                onClose={() => setSelectedAttack(null)} 
            />
        )}
    </AnimatePresence>
    </>
  );
}

// --- Blank Graph Implementation ---

function BlankGraph({ onCreateView }: { onCreateView?: (query: string) => void }) {
  const [showInput, setShowInput] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [showSuggestion, setShowSuggestion] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val.toLowerCase().startsWith('check')) {
        setShowSuggestion(true);
    } else {
        setShowSuggestion(false);
    }
  };

  const handleSuggestionClick = () => {
      const query = "Check all AI entities that the Designers group used in the last 30 days";
      setInputValue(query);
      setShowSuggestion(false);
      if (onCreateView) {
          onCreateView(query);
      }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative p-8">
      {!showInput ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700">
               <Sparkles className="text-gray-300 dark:text-slate-600 w-10 h-10" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Create a new perspective</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
            Explore your AI security data by creating a custom view tailored to your needs.
          </p>
          <button 
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Plus size={18} />
            Create new view
          </button>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-2xl flex flex-col items-center h-full justify-center relative"
        >
           <div className="flex-1 flex flex-col items-center justify-center opacity-50 mb-10">
              <div className="grid grid-cols-2 gap-4 w-64 h-64 opacity-20">
                 <div className="bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                 <div className="bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                 <div className="bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                 <div className="bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
              <p className="mt-8 text-gray-400 dark:text-slate-500 font-medium">Waiting for input...</p>
           </div>

           <div className="w-full relative animate-in slide-in-from-bottom-10 duration-500">
              <div className="relative">
                {showSuggestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full mb-2 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-20"
                    >
                        <button 
                            onClick={handleSuggestionClick}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-3"
                        >
                            <Sparkles size={16} className="text-blue-500" />
                            <span className="font-medium">Check all AI entities that the Designers group used in the last 30 days</span>
                        </button>
                    </motion.div>
                )}
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Describe what you want to see (e.g., 'Show me all high-risk agents in Finance')"
                  className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-xl py-4 pl-6 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all"
                  autoFocus
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                   <ArrowRight size={20} />
                </button>
              </div>
              <div className="mt-4 flex gap-2 justify-center">
                 {['High risk models', 'Usage by department', 'Data exfiltration'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-medium rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                       {tag}
                    </span>
                 ))}
              </div>
           </div>
        </motion.div>
      )}
    </div>
  );
}

// --- Grid Graph Implementation ---

function GridGraph({ nodes, onNodeClick }: { nodes: GraphNode[], onNodeClick?: (node: GraphNode) => void }) {
  const [filter, setFilter] = React.useState<'All' | 'AWS' | 'GCP' | 'Azure'>('All');

  const filteredNodes = useMemo(() => {
    if (filter === 'All') return nodes;
    return nodes.filter(node => node.provider === filter);
  }, [nodes, filter]);

  return (
    <div className="w-full h-full flex flex-col items-center p-6 overflow-hidden bg-white dark:bg-slate-900">
      {/* Filter Controls */}
      <div className="flex items-center gap-2 mb-8 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg z-10 border border-transparent dark:border-slate-700">
        {['All', 'AWS', 'GCP', 'Azure'].map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p as any)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              filter === p 
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200/50 dark:hover:bg-slate-700/50"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="w-full max-w-5xl overflow-y-auto pr-2 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode='popLayout'>
            {filteredNodes.map((node) => (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => onNodeClick && onNodeClick(node)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer flex flex-col items-start gap-3 group relative overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-700"
              >
                 {/* Provider Tag */}
                 {node.provider && (
                    <div className="absolute top-0 right-0 px-2 py-1 bg-gray-50 dark:bg-slate-700 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider rounded-bl-lg">
                        {node.provider}
                    </div>
                 )}

                 <div className="mt-1">
                    <NodeIcon node={node} />
                 </div>
                 
                 <div className="flex-1 w-full">
                    <div className="font-semibold text-gray-900 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{node.label}</div>
                    {node.subLabel && <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{node.subLabel}</div>}
                 </div>

                 <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    node.status === 'unsanctioned' ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50" :
                    node.status === 'warning' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50" :
                    "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50"
                 )}>
                    {node.status || 'Unknown'}
                 </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {filteredNodes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-500">
                <Globe className="w-12 h-12 mb-2 opacity-20" />
                <p>No assets found for {filter}</p>
            </div>
        )}
      </div>
    </div>
  );
}

// --- Bubble Graph Implementation ---

function BubbleGraph({ nodes, onNodeClick }: { nodes: GraphNode[], onNodeClick?: (node: GraphNode) => void }) {
  // Sort nodes by value descending to determine size hierarchy
  const sortedNodes = useMemo(() => [...nodes].sort((a, b) => b.value - a.value), [nodes]);
  
  // Fixed positions for 5 nodes based on user reference:
  // Center (Largest), Top-Left, Top-Right, Bottom-Left, Bottom-Right
  const positions = [
    { x: 0.5, y: 0.5 },   // Center
    { x: 0.2, y: 0.2 },   // Top Left
    { x: 0.8, y: 0.2 },   // Top Right
    { x: 0.2, y: 0.8 },   // Bottom Left
    { x: 0.8, y: 0.8 },   // Bottom Right
  ];

  const getStatusStyles = (status?: string) => {
      switch(status) {
          case 'unsanctioned': return "border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700";
          case 'warning': return "border-orange-200 dark:border-orange-900/50 bg-orange-50/10 dark:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700";
          case 'safe': 
          case 'sanctioned': 
          default: return "border-blue-200 dark:border-blue-900/50 bg-blue-50/10 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700";
      }
  };

  const getIconColor = (status?: string) => {
      switch(status) {
          case 'unsanctioned': return "text-red-600 dark:text-red-400";
          case 'warning': return "text-orange-600 dark:text-orange-400";
          case 'safe': 
          case 'sanctioned': 
          default: return "text-blue-600 dark:text-blue-400";
      }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 relative overflow-hidden select-none p-8">
       {/* Bubble Canvas */}
       <div className="relative w-full h-full max-w-2xl max-h-2xl flex items-center justify-center">
          <AnimatePresence>
            {sortedNodes.map((node, index) => {
               // Fallback for more than 5 nodes: random position around center
               const pos = positions[index] || { 
                  x: 0.5 + (Math.random() - 0.5) * 0.6, 
                  y: 0.5 + (Math.random() - 0.5) * 0.6 
               };
               
               // Scale size: Base 120px + value multiplier
               const size = 100 + (node.value * 15); 
               
               const statusClass = getStatusStyles(node.status);
               const iconColor = getIconColor(node.status);

               return (
                  <motion.div
                    key={node.id}
                    layoutId={`bubble-${node.id}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                       scale: 1, 
                       opacity: 1,
                       left: `${pos.x * 100}%`,
                       top: `${pos.y * 100}%`
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.1 }}
                    className={cn(
                        "absolute flex flex-col items-center justify-center rounded-full border-2 shadow-sm hover:shadow-md cursor-pointer transition-all z-10",
                        statusClass,
                        "bg-white dark:bg-slate-800"
                    )}
                    style={{ 
                       width: size, 
                       height: size,
                       x: "-50%", 
                       y: "-50%" 
                    }}
                    onClick={() => onNodeClick && onNodeClick(node)}
                  >
                     <div className="flex flex-col items-center text-center p-2">
                        {node.icon && React.createElement(node.icon, { size: 28, className: cn("mb-2", iconColor) })}
                        <span className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-tight">{node.label}</span>
                        {node.subLabel && <span className={cn("text-[10px] font-medium mt-0.5 uppercase tracking-wide", iconColor)}>{node.subLabel}</span>}
                     </div>
                  </motion.div>
               );
            })}
          </AnimatePresence>
       </div>

       {/* Legend */}
       <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm backdrop-blur-sm z-20">
          <div className="flex items-end gap-1 h-8">
             <div className="w-2 h-2 rounded-full border border-gray-400 dark:border-slate-500 bg-white dark:bg-slate-700 mb-1"></div>
             <div className="w-3 h-3 rounded-full border border-gray-400 dark:border-slate-500 bg-white dark:bg-slate-700 mb-0.5"></div>
             <div className="w-5 h-5 rounded-full border border-gray-400 dark:border-slate-500 bg-white dark:bg-slate-700"></div>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Circle size represents usage volume</span>
       </div>
    </div>
  );
}

// --- Radial Graph Implementation ---

function RadialGraph({ center, nodes, onCenterClick, onNodeClick, centerMenu }: GraphViewProps) {
  const radius = 250;
  const centerX = 400; 
  const centerY = 350;

  const nodePositions = useMemo(() => {
    const count = nodes.length;
    return nodes.map((node, index) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2; 
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        angle,
      };
    });
  }, [nodes]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 relative overflow-hidden select-none">
      <div className="relative w-[800px] h-[700px] scale-75 md:scale-90 lg:scale-100 transition-transform origin-center">
        
        {/* SVG Layer for Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <AnimatePresence>
            {nodePositions.map((node) => (
              <motion.line
                key={`edge-${node.id}`}
                x1={centerX}
                y1={centerY}
                x2={node.x}
                y2={node.y}
                initial={{ pathLength: 0, opacity: 0, strokeWidth: 0 }}
                animate={{ 
                  x2: node.x, 
                  y2: node.y,
                  strokeWidth: (node.value || 1) * 3, 
                  pathLength: 1, 
                  opacity: 0.3 
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                stroke="#3B82F6" 
                strokeLinecap="round"
              />
            ))}
          </AnimatePresence>
        </svg>

        {/* Center Node */}
        <motion.div
          className="absolute z-20 flex flex-col items-center justify-center"
          style={{ left: centerX, top: centerY, x: '-50%', y: '-50%' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div 
            onClick={onCenterClick}
            className={cn(
              "w-20 h-20 rounded-full bg-white dark:bg-slate-800 border-4 flex items-center justify-center shadow-lg z-10 transition-transform relative",
              center.label === 'Identities' 
                ? "border-blue-500 dark:border-blue-500 shadow-blue-900/20" 
                : "border-gray-200 dark:border-slate-700",
              onCenterClick ? "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-xl" : ""
            )}
          >
            {React.createElement(center.icon, { 
                size: 32, 
                className: center.label === 'Identities' 
                    ? "text-blue-500 dark:text-blue-400" 
                    : "text-gray-600 dark:text-slate-300" 
            })}
            
            {centerMenu && (
               <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 z-50 w-64">
                  {centerMenu}
               </div>
            )}
          </div>
          
          <div className={cn(
              "mt-3 text-sm font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-sm pointer-events-none z-0 border",
              center.label === 'Identities'
                ? "text-blue-600 dark:text-blue-200 bg-blue-50/90 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800"
                : "text-gray-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 border-gray-100 dark:border-slate-800"
          )}>
            {center.label}
          </div>
        </motion.div>

        {/* Surrounding Nodes */}
        <AnimatePresence>
          {nodePositions.map((node) => (
            <motion.div
              key={node.id}
              className="absolute z-10 flex flex-col items-center justify-center cursor-pointer group"
              initial={{ x: centerX, y: centerY, opacity: 0, scale: 0 }}
              animate={{ 
                x: node.x - 60, 
                y: node.y - 60, 
                opacity: 1, 
                scale: 1 
              }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={() => onNodeClick && onNodeClick(node)}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
              style={{ width: 120, height: 120 }} 
            >
              <div className="group-hover:scale-105 transition-transform duration-200">
                <NodeIcon node={node} />
              </div>
              
              <div className="text-center w-40 pointer-events-none group-hover:scale-105 transition-transform duration-200">
                <div className="text-sm font-medium text-gray-800 dark:text-slate-200 leading-tight">
                  {node.label}
                </div>
                {node.subLabel && (
                  <div className="text-xs font-bold text-blue-500 dark:text-blue-400 mt-1">
                    {node.subLabel}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                <div className="w-16 h-2 rounded-full bg-gradient-to-r from-blue-100 to-blue-500 opacity-50 dark:opacity-70"></div>
                <span>Usage volume</span>
            </div>
        </div>

      </div>
    </div>
  );
}

// --- Sankey Graph Implementation ---

function SankeyGraph({ sources, targets, leftLabel, rightLabel, onBack, onNodeClick }: { sources: GraphNode[], targets: GraphNode[], leftLabel: string, rightLabel: string, onBack?: () => void, onNodeClick?: (node: GraphNode) => void }) {
  const [showUciBreakdown, setShowUciBreakdown] = React.useState(false);

  // Fixed layout dimensions
  const containerWidth = 800;
  const containerHeight = 600;
  const colPadding = 50;
  const sourceX = colPadding + 60; // Left column X center
  const targetX = containerWidth - colPadding - 60; // Right column X center
  const middleX = containerWidth / 2; // Center column X center

  // Offsets for connecting lines to match icon positions
  const linkSourceX = sourceX + 88;
  const linkTargetX = targetX - 40;

  const middleLinkIncomingX = middleX - 60;
  const middleLinkOutgoingX = middleX + 60;

  // Helper: Calculate weight between source and target (Standard Logic)
  const getStandardWeight = (source: GraphNode, target: GraphNode, sIdx: number, tIdx: number) => {
     const hash = (sIdx * 7 + tIdx * 13) % 10;
     let weight = 0;
     
     // Bias logic for storytelling:
     if (source.id === 'eng') {
        if (target.id === 'models') weight = 8;
        else if (target.id === 'agents') weight = 5;
        else if (target.id === 'mcps') weight = 2;
     } 
     else if (source.id === 'marketing') {
        if (target.id === 'tools') weight = 6;
        else if (target.id === 'models') weight = 4;
     }
     else if (source.id === 'sales') {
        if (target.id === 'tools') weight = 3;
     }
     else if (source.id === 'src-agents') {
        if (target.id === 'dest-pii') weight = 9;
        else if (target.id === 'dest-gdpr') weight = 6;
     }
     else if (source.id === 'src-models') {
        if (target.id === 'dest-gdpr') weight = 7;
        else if (target.id === 'dest-nist') weight = 4;
     }
     else if (source.id === 'src-mcps') {
        if (target.id === 'dest-pii') weight = 5;
        else if (target.id === 'dest-ccpa') weight = 4;
     }
     else if (source.id === 'src-apps') {
        if (target.id === 'dest-nist') weight = 3;
        else if (target.id === 'dest-gdpr') weight = 2;
     }
     else if (source.id === 'src-tools') {
         if (target.id === 'dest-ccpa') weight = 6;
     }
     else if (source.id === 'ext-agents') {
         if (target.id === 'dest-models') weight = 8;
         else if (target.id === 'dest-agents') weight = 6;
         else if (target.id === 'dest-mcps') weight = 4;
     }
     else if (source.id === 'anon-users') {
         if (target.id === 'dest-tools') weight = 9;
         else if (target.id === 'dest-apps') weight = 5;
         else if (target.id === 'dest-models') weight = 2;
     }
     else {
        if (hash > 3) weight = hash / 2;
     }
     return weight;
  };

  const [hoveredSourceId, setHoveredSourceId] = React.useState<string | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = React.useState<string | null>(null);
  const [hoveredMiddleId, setHoveredMiddleId] = React.useState<string | null>(null);

  // Middle Nodes Definition (UCI Scores)
  const uciNodes: GraphNode[] = useMemo(() => [
      { id: 'uci-poor', label: 'Poor', subLabel: '0 - 350', type: 'risk', value: 10, status: 'unsanctioned', icon: AlertTriangle },
      { id: 'uci-fair', label: 'Fair', subLabel: '351 - 700', type: 'warning', value: 7, status: 'warning', icon: ShieldAlert },
      { id: 'uci-good', label: 'Good', subLabel: '701 - 1000', type: 'safe', value: 4, status: 'safe', icon: ShieldCheck },
  ], []);

  // Calculate vertical positions
  const sourceSpacing = containerHeight / (sources.length + 1);
  const targetSpacing = containerHeight / (targets.length + 1);
  const middleSpacing = containerHeight / (uciNodes.length + 1);

  const getSourceY = (index: number) => (index + 1) * sourceSpacing;
  const getTargetY = (index: number) => (index + 1) * targetSpacing;
  const getMiddleY = (index: number) => (index + 1) * middleSpacing;

  // Generate fake links for visualization based on values
  const links = useMemo(() => {
    const generatedLinks: any[] = [];
    
    // 1. Calculate Baseline Totals using Standard Logic
    const sourceTotals: Record<string, number> = {};
    const targetTotals: Record<string, number> = {};

    // Special logic for Designers view: Connect all sources to all targets
    const isDesignersView = sources.length > 0 && sources[0].id === 'designers';

    sources.forEach((source, sIdx) => {
        targets.forEach((target, tIdx) => {
            let weight = getStandardWeight(source, target, sIdx, tIdx);
            
            // FORCE connections for designers view
            if (isDesignersView) {
                weight = 5; // Uniform weight
            }

            if (weight > 0) {
                sourceTotals[source.id] = (sourceTotals[source.id] || 0) + weight;
                targetTotals[target.id] = (targetTotals[target.id] || 0) + weight;
                
                // Store standard link if needed (for non-UCI view)
                if (!showUciBreakdown) {
                    generatedLinks.push({
                        id: `${source.id}-${target.id}`,
                        sourceId: source.id,
                        targetId: target.id,
                        sourceX: linkSourceX,
                        sourceY: getSourceY(sIdx),
                        targetX: linkTargetX,
                        targetY: getTargetY(tIdx),
                        weight
                    });
                }
            }
        });
    });

    if (!showUciBreakdown) {
        return generatedLinks;
    }

    // 2. Generate UCI Links derived from Baseline Totals
    // Source -> UCI Links
    sources.forEach((source, sIdx) => {
        const totalWeight = sourceTotals[source.id] || 0;
        if (totalWeight === 0) return;

        const seed = sIdx * 7; 
        let poorShare = 0.5; 
        let fairShare = 0.35; 
        let goodShare = 0.15;

        if (seed % 3 === 0) { poorShare = 0.6; fairShare = 0.3; goodShare = 0.1; }
        else if (seed % 3 === 1) { poorShare = 0.4; fairShare = 0.4; goodShare = 0.2; }
        
        uciNodes.forEach((uci, uIdx) => {
            let share = 0;
            if (uIdx === 0) share = poorShare;
            else if (uIdx === 1) share = fairShare;
            else if (uIdx === 2) share = goodShare;

            const weight = totalWeight * share;
            
            if (weight > 0.1) {
                generatedLinks.push({
                    id: `${source.id}-${uci.id}`,
                    sourceId: source.id,
                    targetId: uci.id,
                    sourceX: linkSourceX,
                    sourceY: getSourceY(sIdx),
                    targetX: middleLinkIncomingX,
                    targetY: getMiddleY(uIdx),
                    weight
                });
            }
        });
    });

    // UCI -> Target Links
    targets.forEach((target, tIdx) => {
        const totalWeight = targetTotals[target.id] || 0;
        if (totalWeight === 0) return;

        const isRiskTarget = target.status === 'unsanctioned';
        
        let poorShare = 0.1;
        let fairShare = 0.2;
        let goodShare = 0.7;

        if (isRiskTarget) {
            poorShare = 0.7;
            fairShare = 0.2;
            goodShare = 0.1;
        } else if (target.status === 'warning') {
            poorShare = 0.3;
            fairShare = 0.5;
            goodShare = 0.2;
        }

        uciNodes.forEach((uci, uIdx) => {
            let share = 0;
            if (uIdx === 0) share = poorShare;
            else if (uIdx === 1) share = fairShare;
            else if (uIdx === 2) share = goodShare;

            const weight = totalWeight * share;

            if (weight > 0.1) {
                generatedLinks.push({
                    id: `${uci.id}-${target.id}`,
                    sourceId: uci.id,
                    targetId: target.id,
                    sourceX: middleLinkOutgoingX,
                    sourceY: getMiddleY(uIdx),
                    targetX: linkTargetX,
                    targetY: getTargetY(tIdx),
                    weight
                });
            }
        });
    });

    return generatedLinks;
  }, [sources, targets, showUciBreakdown, uciNodes]);

  // Determine highlighted elements based on hover state
  const { highlightedSourceIds, highlightedTargetIds, highlightedLinkIds, highlightedMiddleIds } = useMemo(() => {
    const hSourceIds = new Set<string>();
    const hTargetIds = new Set<string>();
    const hLinkIds = new Set<string>();
    const hMiddleIds = new Set<string>();

    const addLinksForNode = (nodeId: string, isMiddle = false) => {
        links.forEach(l => {
            if (l.sourceId === nodeId) {
                hLinkIds.add(l.id);
                if (isMiddle) hTargetIds.add(l.targetId);
                else if (showUciBreakdown) hMiddleIds.add(l.targetId);
                else hTargetIds.add(l.targetId);
            }
            if (l.targetId === nodeId) {
                hLinkIds.add(l.id);
                if (isMiddle) hSourceIds.add(l.sourceId);
                else if (showUciBreakdown) hMiddleIds.add(l.sourceId);
                else hSourceIds.add(l.sourceId);
            }
        });
    };

    if (hoveredSourceId) {
        hSourceIds.add(hoveredSourceId);
        addLinksForNode(hoveredSourceId);
    } 
    else if (hoveredTargetId) {
        hTargetIds.add(hoveredTargetId);
        addLinksForNode(hoveredTargetId);
    }
    else if (hoveredMiddleId) {
        hMiddleIds.add(hoveredMiddleId);
        addLinksForNode(hoveredMiddleId, true);
    }

    return { highlightedSourceIds: hSourceIds, highlightedTargetIds: hTargetIds, highlightedLinkIds: hLinkIds, highlightedMiddleIds: hMiddleIds };
  }, [hoveredSourceId, hoveredTargetId, hoveredMiddleId, links, showUciBreakdown]);

  const isInteracting = hoveredSourceId !== null || hoveredTargetId !== null || hoveredMiddleId !== null;

  // Determine if we are in the "Sensitive Data Leakage Analysis" view
  // We identify it by checking the first source node ID as per data/perspectives.ts
  const isSensitiveDataView = sources.length > 0 && sources[0].id === 'src-apps';

  // Determine if we are in the "External Exposure Analysis" view
  const isExternalExposureView = sources.length > 0 && (sources[0].id === 'ext-agents' || sources[0].id === 'anon-users');

  // Determine if we are in the "Unsanctioned AI Assets Analysis" breakdown views (User Group or OU)
  // Check for 'eng' (User Group Breakdown) or 'na-sales' (OU Breakdown) or 'human-users' (Human/NHI Breakdown)
  const isUnsanctionedBreakdownView = sources.length > 0 && (sources[0].id === 'eng' || sources[0].id === 'na-sales' || sources[0].id === 'human-users');

  return (
    <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 relative overflow-hidden select-none">
       <div className="relative w-[800px] h-[700px] scale-75 md:scale-90 lg:scale-100 transition-transform origin-center">
          
          {/* Links Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
             <AnimatePresence>
                {links.map((link, i) => {
                   const cp1x = link.sourceX + (link.targetX - link.sourceX) * 0.5;
                   const cp2x = link.targetX - (link.targetX - link.sourceX) * 0.5;
                   
                   const isHovered = highlightedLinkIds.has(link.id);
                   const isDimmed = isInteracting && !isHovered;

                   // For specific views where nodes are forced blue, we might want links to match or stay neutral
                   // Currently keeping default blue/blue-highlight
                   
                   return (
                     <motion.path
                       key={link.id}
                       d={`M ${link.sourceX} ${link.sourceY} C ${cp1x} ${link.sourceY}, ${cp2x} ${link.targetY}, ${link.targetX} ${link.targetY}`}
                       fill="none"
                       stroke={isHovered ? "#235B9F" : "#3B82F6"}
                       strokeOpacity={isHovered ? 0.6 : (isDimmed ? 0.05 : 0.15 + (link.weight / 20))}
                       initial={{ pathLength: 0, opacity: 0, strokeWidth: 0 }}
                       animate={{ 
                         pathLength: 1, 
                         opacity: isHovered ? 0.6 : (isDimmed ? 0.05 : 0.15 + (link.weight / 20)),
                         strokeWidth: link.weight * 2,
                         stroke: isHovered ? "#235B9F" : "#3B82F6"
                       }}
                       transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                     />
                   );
                })}
             </AnimatePresence>
          </svg>

          {/* Left Column: Sources (User Groups/OUs) */}
          <div className="absolute inset-0 pointer-events-none">
             {sources.map((node, index) => {
                // Override for specific views: Force sources to look Safe (Blue)
                const displayNode = (isSensitiveDataView || isExternalExposureView || isUnsanctionedBreakdownView)
                    ? { ...node, status: 'safe' as const } 
                    : node;
                
                return (
                 <motion.div
                   key={node.id}
                   className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-auto cursor-pointer"
                   style={{ top: getSourceY(index), left: sourceX }}
                   initial={{ x: -50, opacity: 0 }}
                   animate={{ 
                     x: 0, 
                     opacity: isInteracting && !highlightedSourceIds.has(node.id) ? 0.3 : 1 
                   }}
                   transition={{ delay: index * 0.1 }}
                   onMouseEnter={() => setHoveredSourceId(node.id)}
                   onMouseLeave={() => setHoveredSourceId(null)}
                 >
                    <div className="flex flex-col items-end text-right w-32 mr-16">
                       <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{node.label}</span>
                       <span className="text-xs text-gray-500 dark:text-slate-400">{node.subLabel}</span>
                    </div>
                    <div className="absolute left-[8.5rem]">
                       <NodeIcon node={displayNode} size="sm" />
                    </div>
                 </motion.div>
              )})}
          </div>

          {/* Middle Column: UCI Scores */}
          {showUciBreakdown && (
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">UCI Score</div>
                {uciNodes.map((node, index) => {
                    const isDimmed = isInteracting && !highlightedMiddleIds.has(node.id);
                    
                    // Override for specific views
                    const displayNode = (isSensitiveDataView || isExternalExposureView)
                        ? { ...node, status: 'safe' as const }
                        : node;

                    return (
                        <motion.div
                            key={node.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto cursor-pointer"
                            style={{ top: getMiddleY(index), left: middleX }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: isDimmed ? 0.3 : 1 }}
                            transition={{ delay: index * 0.1 }}
                            onMouseEnter={() => setHoveredMiddleId(node.id)}
                            onMouseLeave={() => setHoveredMiddleId(null)}
                        >
                             <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center w-32">
                                 <NodeIcon node={displayNode} size="sm" />
                                 <span className="font-bold text-sm text-gray-900 dark:text-slate-100 mt-2">{node.label}</span>
                                 <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">{node.subLabel}</span>
                             </div>
                        </motion.div>
                    );
                })}
            </div>
          )}

          {/* Right Column: Targets (Entity Types) */}
          <div className="absolute inset-0 pointer-events-none">
             {targets.map((node, index) => {
                const isDimmed = isInteracting && !highlightedTargetIds.has(node.id);
                
                // Override for specific views: Force targets to look Safe (Blue)
                const displayNode = (isSensitiveDataView || isExternalExposureView)
                    ? { ...node, status: 'safe' as const }
                    : node;

                return (
                <motion.div
                  key={node.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-auto cursor-pointer group"
                  style={{ top: getTargetY(index), left: targetX }}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ 
                    x: 0, 
                    opacity: isDimmed ? 0.3 : 1 
                  }}
                  onClick={() => onNodeClick && onNodeClick(node)}
                  onMouseEnter={() => setHoveredTargetId(node.id)}
                  onMouseLeave={() => setHoveredTargetId(null)}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                   <div className="absolute right-[8.5rem] group-hover:scale-105 transition-transform duration-200">
                      <NodeIcon node={displayNode} size="sm" />
                   </div>
                   <div className="flex flex-col items-start text-left w-32 ml-16 group-hover:scale-105 transition-transform duration-200">
                      <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{node.label}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{node.subLabel}</span>
                   </div>
                </motion.div>
             )})}
          </div>

          {/* Labels for columns */}
          <div className="absolute top-4 left-16 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{leftLabel}</div>
          <div className="absolute top-4 right-16 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{rightLabel}</div>

          {/* Add Breakdown Interaction Zone */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-24 z-30 group/add flex flex-col items-center pt-8">
             {/* Dashed vertical line indicating insertion point */}
             <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-blue-200 dark:border-blue-800 opacity-0 group-hover/add:opacity-100 transition-opacity duration-300" />
             
             {/* The Plus Button */}
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.95 }}
               className="relative z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400 flex items-center justify-center shadow-sm opacity-0 group-hover/add:opacity-100 transition-all duration-300 -translate-y-2 group-hover/add:translate-y-0"
             >
                <Plus size={16} />
             </motion.button>
             
             {/* Dropdown Menu */}
             <div className="absolute top-16 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 p-1.5 opacity-0 invisible group-hover/add:opacity-100 group-hover/add:visible transition-all duration-200 transform origin-top scale-95 group-hover/add:scale-100 pointer-events-none group-hover/add:pointer-events-auto z-40">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Insert Breakdown</div>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 rounded-md transition-colors flex items-center gap-2.5">
                   <Globe size={16} className="text-gray-400 dark:text-slate-500" />
                   Add Country Breakdown
                </button>
                <button 
                   onClick={() => setShowUciBreakdown(!showUciBreakdown)}
                   className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 rounded-md transition-colors flex items-center gap-2.5"
                >
                   <BarChart3 size={16} className="text-gray-400 dark:text-slate-500" />
                   {showUciBreakdown ? "Remove UCI Score Breakdown" : "Add UCI Score Breakdown"}
                </button>
             </div>
          </div>

       </div>
    </div>
  );
}

// --- Shared Node Icon Component ---

function NodeIcon({ node, size = 'md' }: { node: GraphNode, size?: 'sm' | 'md' }) {
  const isSmall = size === 'sm';
  const containerSize = isSmall ? 'w-12 h-12' : 'w-16 h-16';
  const iconSize = isSmall ? 20 : 24;

  const isUnsanctioned = node.status === 'unsanctioned';
  const isWarning = node.status === 'warning';
  const isSafe = node.status === 'safe' || node.status === 'sanctioned';

  return (
    <div className={cn(containerSize, "relative flex items-center justify-center mb-3")}>
       <div className={cn(
         "absolute inset-0 transition-colors bg-white dark:bg-slate-800",
         // Shape logic
         node.type === 'app' ? "rounded-xl" :
         (node.type === 'model' || node.type === 'agent' || node.type === 'data-store') ? "rounded-xl" :
         (node.type === 'mcp' || node.type === 'tool') ? "rotate-45 rounded-lg scale-75" : 
         "rounded-full",
         
         // Border & Color logic
         isUnsanctioned 
            ? "border-2 border-orange-500 dark:border-orange-500 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)] dark:shadow-[0_0_20px_-5px_rgba(249,115,22,0.5)]" 
            : (
                isWarning 
                    ? "border-2 border-amber-400 dark:border-amber-500 shadow-sm"
                    : (isSafe 
                        ? "border border-blue-200 dark:border-blue-800 shadow-sm" 
                        : "border border-gray-200 dark:border-slate-700 shadow-sm")
            )
       )} />
       
       {/* Icon inside */}
       <div className={cn("relative z-10", (node.type === 'mcp' || node.type === 'tool') ? "-rotate-45" : "")}>
          {node.icon && React.createElement(node.icon, { 
            size: iconSize, 
            className: cn(
              isUnsanctioned 
                ? "text-orange-500 dark:text-orange-500" 
                : (
                    isWarning 
                        ? "text-amber-500 dark:text-amber-500"
                        : (isSafe ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-slate-400")
                )
            )
          })}
       </div>
    </div>
  );
}