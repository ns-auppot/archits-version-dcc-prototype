import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GraphView } from './GraphView';
import { perspectives as initialPerspectives, drillDownPerspectives, GraphNode, Perspective } from '@/data/perspectives';
import { Button } from '@/app/components/ui/button';
import { Sparkles, ArrowLeft, Plus, X, Loader2, AlertTriangle, Users, Activity, LayoutGrid, Bot, Box, Database, Wrench } from 'lucide-react';
import { cn } from "@/lib/utils"

import { OverviewSankey } from './OverviewSankey';
import { HomeDashboard } from './HomeDashboard';
import { AssetListCard } from './AssetListCard';
import { AppDetailsPanel } from './AppDetailsPanel';
import { ModelDetailsPanel } from './ModelDetailsPanel';
import { ToolDetailsPanel } from './ToolDetailsPanel';
import { DatasetDetailsPanel } from './DatasetDetailsPanel';
import { UnsanctionedSankey } from './UnsanctionedSankey';
import { RiskDetailsPanel } from './RiskDetailsPanel';
import { Toaster } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function OverviewSection() {
  const navigate = useNavigate();
  const [isOverviewMode, setIsOverviewMode] = useState(true);
  const [perspectives, setPerspectives] = useState(initialPerspectives);
  const [activePerspectiveIndex, setActivePerspectiveIndex] = useState(0);
  const [drillDownView, setDrillDownView] = useState<null | 'user-group' | 'ou' | 'human-nhi'>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedInsightEvent, setSelectedInsightEvent] = useState<any | null>(null);
  const [selectedInsightList, setSelectedInsightList] = useState<any | null>(null);
  const [sankeyDrillDown, setSankeyDrillDown] = useState<{ type: string; items: any[] } | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [initialRiskFilter, setInitialRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [initialFocusPath, setInitialFocusPath] = useState<string[]>([]);
  const [initialSelectedEventId, setInitialSelectedEventId] = useState<string | null>(null);
  const [showRiskSankey, setShowRiskSankey] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (drillDownView) return;
      const scrollPosition = container.scrollTop;
      const sectionHeight = container.clientHeight;
      const index = Math.round(scrollPosition / sectionHeight);

      if (index >= 0 && index < perspectives.length && index !== activePerspectiveIndex) {
        setActivePerspectiveIndex(index);
        setIsMenuOpen(false);
        setSelectedNode(null);
        setSelectedItem(null);
        setSelectedInsightEvent(null);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activePerspectiveIndex, drillDownView, perspectives.length, isOverviewMode]);

  const handleReorderPerspectives = (newOrder: typeof perspectives) => {
    setTimeout(() => {
      setIsReordering(true);
      setTimeout(() => {
        setPerspectives(newOrder);
        setIsReordering(false);
        setActivePerspectiveIndex(0);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 1000);
    }, 2500);
  };

  const handleSelectPerspective = (index: number) => {
    setIsOverviewMode(false);
    setActivePerspectiveIndex(index);
    setDrillDownView(null);
    setSankeyDrillDown(null);
    setIsMenuOpen(false);
    setSelectedNode(null);
    setSelectedItem(null);
    setSelectedInsightEvent(null);
    setSelectedInsightList(null);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: index * scrollContainerRef.current.clientHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleDrillDown = (view: 'user-group' | 'ou' | 'human-nhi') => {
    setDrillDownView(view);
    setSankeyDrillDown(null);
    setIsMenuOpen(false);
    setSelectedNode(null);
    setSelectedItem(null);
    setSelectedInsightEvent(null);
    setSelectedInsightList(null);
  };

  const handleBackToOverview = () => {
    setDrillDownView(null);
    setSankeyDrillDown(null);
    setSelectedNode(null);
    setSelectedItem(null);
    setSelectedInsightEvent(null);
    setSelectedInsightList(null);
    setActivePerspectiveIndex(0);
  };

  const handleNavigateFromOverview = (viewId: string, filter?: string) => {
    if (viewId === 'risk') {
      if (filter?.startsWith('rule:')) {
        const policyId = filter.slice(5);
        navigate(`/risk?policy=${encodeURIComponent(policyId)}`);
      } else if (filter?.startsWith('category:')) {
        navigate(`/risk`);
      } else {
        navigate('/risk');
      }
      return;
    }

    if (viewId === 'inventory') {
      if (filter === 'managed-connected') {
        navigate('/inventory/search?mode=filter&resultType=managed-destinations');
      } else {
        navigate('/inventory');
      }
      return;
    }

    if (viewId === 'data-explorer') {
      if (filter === 'DIM') {
        navigate('/inventory/data-explorer?tab=motion');
      } else if (filter?.startsWith('dim:')) {
        navigate(`/inventory/data-explorer?tab=motion&type=${encodeURIComponent(filter.slice(4))}`);
      } else if (filter && filter !== 'DAR') {
        navigate(`/inventory/data-explorer?type=${encodeURIComponent(filter)}`);
      } else {
        navigate('/inventory/data-explorer');
      }
      return;
    }

    setIsOverviewMode(false);
    const index = perspectives.findIndex(p => p.id === viewId);
    if (index !== -1) {
      setActivePerspectiveIndex(index);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: index * scrollContainerRef.current.clientHeight,
            behavior: 'auto'
          });
        }
      }, 50);
    }
  };

  const handleInvestigateRisk = (context: { appName: string, riskType: string }) => {
    let riskId = 'malicious';
    if (context.riskType === 'Malicious Attack') riskId = 'malicious';

    setShowRiskSankey(true);
    setInitialFocusPath([context.appName, riskId]);
    if (context.riskType === 'Malicious Attack') {
      setInitialSelectedEventId('malicious-pii-exfil-1');
    } else {
      setInitialSelectedEventId(null);
    }

    setSelectedItem(null);
    setSelectedInsightEvent(null);
  };

  const handleNodeClick = (node: GraphNode) => {
    if (activePerspective.id === 'designers-ai-usage') {
      if (node.id === 'apps') {
        const updatedPerspectives = [...perspectives];
        const designersPerspective = updatedPerspectives.find(p => p.id === 'designers-ai-usage');

        if (designersPerspective) {
          designersPerspective.graph.targets = [
            { id: 'figma', label: 'Figma', type: 'app', value: 8, status: 'safe', icon: LayoutGrid, items: [] },
            { id: 'gemini', label: 'Gemini', type: 'model', value: 6, status: 'safe', icon: Box, items: [] },
            { id: 'chatgpt', label: 'ChatGPT', type: 'app', value: 9, status: 'unsanctioned', icon: Bot, items: [
              { name: 'ChatGPT', status: 'unsanctioned', type: 'app', riskLevel: 'high' }
            ] },
            { id: 'cursor', label: 'Cursor', type: 'tool', value: 7, status: 'safe', icon: Wrench, items: [] }
          ];
          setPerspectives(updatedPerspectives);
        }
        return;
      }

      if (node.id === 'chatgpt') {
        const event = {
          id: 'chatgpt',
          app: 'ChatGPT',
          category: 'Productivity',
          isNew: false,
          status: 'unsanctioned',
          risk: 'High',
          traffic: '1.2 TB',
          identityCount: 450,
          vendor: 'OpenAI',
          firstSeen: '2023-01-15',
          lastSeen: 'Just now',
          ccl: 65,
          type: '3rd Party',
          icon: Bot
        };
        setSelectedInsightEvent(event);
        return;
      }
    }

    if (activePerspectiveIndex === 0 && !drillDownView && ['models', 'apps', 'agents', 'tools', 'mcps'].includes(node.id)) {
      setSankeyDrillDown({
        type: node.type,
        items: node.items || []
      });
      return;
    }

    if ((activePerspectiveIndex === 0 || drillDownView) && node.items) {
      setSelectedNode(node);
      setSelectedItem(null);
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
  };

  const handleInsightClick = (insight: any) => {
    if (insight.items && insight.items.length > 0) {
      setSelectedInsightList(insight);
      setSelectedInsightEvent(null);
    } else {
      setSelectedInsightEvent(insight.event);
      setSelectedInsightList(null);
    }
  };

  const handleInsightItemClick = (item: any, type: string) => {
    const event = {
      id: item.name,
      app: item.name,
      category: type === 'model' ? 'Model' : 'Tool',
      isNew: item.status === 'unsanctioned',
      status: item.status,
      risk: item.riskLevel === 'critical' ? 'Critical' : item.riskLevel === 'high' ? 'High' : 'Medium',
      traffic: item.dataVolume30d,
      identityCount: item.users,
      vendor: item.provider,
      firstSeen: item.discoveryDate,
      lastSeen: 'Just now',
      ccl: item.riskLevel === 'critical' ? 30 : item.riskLevel === 'high' ? 50 : 70,
      type: '3rd Party',
      icon: item.icon
    };
    setSelectedInsightEvent(event);
  };

  const handleCreateView = (query: string) => {
    if (query === "Check all AI entities that the Designers group used in the last 30 days") {
      const newPerspective: Perspective = {
        id: 'designers-ai-usage',
        title: 'Designers Group AI Usage',
        summary: {
          title: 'Designers Group AI Usage',
          content: 'Analysis of AI tools, models, and agents used by the Designers group over the last 30 days.',
          insights: [
            'High usage of image generation models.',
            'Unsanctioned vector tools detected.',
            'Frequent data transfers to external storage.'
          ]
        },
        graph: {
          layout: 'sankey',
          center: { label: 'Designers', icon: Users },
          nodes: [
            { id: 'designers', label: 'Designers', type: 'user', value: 10, status: 'safe', icon: Users }
          ],
          targets: [
            { id: 'apps', label: 'Apps', type: 'app', value: 8, status: 'warning', icon: LayoutGrid, items: [] },
            { id: 'agents', label: 'Agents', type: 'agent', value: 5, status: 'unsanctioned', icon: Bot, items: [] },
            { id: 'models', label: 'Models', type: 'model', value: 7, status: 'unsanctioned', icon: Box, items: [] },
            { id: 'mcps', label: 'MCPs', type: 'mcp', value: 3, status: 'warning', icon: Database, items: [] },
            { id: 'tools', label: 'Tools', type: 'tool', value: 6, status: 'safe', icon: Wrench, items: [] }
          ]
        }
      };

      const existingIndex = perspectives.findIndex(p => p.id === 'designers-ai-usage');
      let newPerspectives = [...perspectives];

      if (existingIndex !== -1) {
        newPerspectives[existingIndex] = newPerspective;
      } else {
        newPerspectives.splice(newPerspectives.length - 1, 0, newPerspective);
      }

      setPerspectives(newPerspectives);
      const newIndex = existingIndex !== -1 ? existingIndex : newPerspectives.length - 2;

      setTimeout(() => {
        setActivePerspectiveIndex(newIndex);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: newIndex * scrollContainerRef.current.clientHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const activePerspective = perspectives[activePerspectiveIndex];
  const graphPerspective = drillDownView ? drillDownPerspectives[drillDownView] : activePerspective;
  const isCreateNew = activePerspective?.id === 'create-new';

  if (!activePerspective) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const canDrillDown = activePerspectiveIndex === 0 && !drillDownView;

  if (showRiskSankey) {
    return (
      <div className="flex flex-1 overflow-hidden relative">
        <OverviewSankey
          onNavigate={handleNavigateFromOverview}
          viewMode="risk"
          initialRiskFilter={initialRiskFilter}
          initialFocusPath={initialFocusPath}
          initialSelectedEventId={initialSelectedEventId}
        />
        <button
          onClick={() => setShowRiskSankey(false)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Overview
        </button>
      </div>
    );
  }

  return (
    <>
    <Toaster position="top-center" />
    <DndProvider backend={HTML5Backend}>
      {isReordering && (
        <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
           <p className="text-lg font-medium text-gray-700 dark:text-slate-300">Updating perspectives...</p>
        </div>
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden relative">
        {isOverviewMode ? (
            <HomeDashboard
                onNavigate={handleNavigateFromOverview}
                onInvestigate={handleInvestigateRisk}
            />
        ) : (
            <>
            <div className={cn(
                "h-full bg-white dark:bg-slate-900 relative flex items-center justify-center border-r border-gray-100 dark:border-slate-800 shadow-[inset_-10px_0_20px_-10px_rgba(0,0,0,0.05)]",
                isCreateNew ? "w-full" : "w-[60%]"
            )}>

               {drillDownView && (
                 <Button
                   variant="ghost"
                   className="absolute top-8 left-8 z-30 flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
                   onClick={handleBackToOverview}
                 >
                   <ArrowLeft size={20} />
                   <span>Back</span>
                 </Button>
               )}

               {sankeyDrillDown ? (
                  <UnsanctionedSankey
                      items={sankeyDrillDown.items}
                      type={sankeyDrillDown.type}
                      onBack={() => setSankeyDrillDown(null)}
                      onDrillDown={handleDrillDown}
                  />
               ) : (
               <GraphView
                 center={graphPerspective.graph.center}
                 nodes={graphPerspective.graph.nodes}
                 layout={graphPerspective.graph.layout}
                 targets={graphPerspective.graph.targets}
                 onCenterClick={canDrillDown ? () => setIsMenuOpen(!isMenuOpen) : undefined}
                 onNodeClick={handleNodeClick}
                 onCreateView={isCreateNew ? handleCreateView : undefined}
                 centerMenu={isMenuOpen ? (
                    <div className="flex flex-col gap-2 min-w-[240px]">
                       <button
                         onClick={(e) => { e.stopPropagation(); handleDrillDown('user-group'); }}
                         className="bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-md border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-nowrap"
                       >
                          <Plus size={16} /> Break down by User Group
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); handleDrillDown('ou'); }}
                         className="bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-md border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-nowrap"
                       >
                          <Plus size={16} /> Break down by OU
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); handleDrillDown('human-nhi'); }}
                         className="bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-md border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-nowrap"
                       >
                          <Plus size={16} /> Break down by human and NHIs
                       </button>
                    </div>
                 ) : undefined}
               />
               )}
            </div>

            <div
              className={cn("h-full relative transition-all duration-500 ease-in-out", isCreateNew ? "w-0 overflow-hidden opacity-0" : "w-[40%] opacity-100")}
            >
              <div
                ref={scrollContainerRef}
                className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
              >
              {
                perspectives.map((perspective, index) => (
                <section
                  key={perspective.id}
                  className="h-full w-full snap-start flex flex-col justify-center p-12 relative"
                >
                  <div className="absolute bottom-8 right-8 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-lg transition-all hover:scale-105">
                          <Plus className="h-6 w-6" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          Add to report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8">
                      <div className="flex items-center gap-2 mb-4 text-orange-500 dark:text-orange-400 font-medium">
                        <Sparkles className="w-5 h-5" />
                        <span>{perspective.summary.title}</span>
                      </div>

                      {perspective.id !== 'unsanctioned-assets' && (
                          <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-lg mb-6">
                            {perspective.summary.content}
                          </p>
                      )}

                      {perspective.summary.insights && (
                        <div className={cn(
                            "mb-6 rounded-lg",
                            typeof perspective.summary.insights[0] === 'string'
                                ? "bg-orange-50/50 dark:bg-orange-900/20 border border-orange-100/50 dark:border-orange-900/30 p-5"
                                : "bg-transparent border-none p-0"
                        )}>
                          <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 text-sm uppercase tracking-wide">Key Insights</h4>

                          {typeof perspective.summary.insights[0] === 'string' ? (
                              <ul className="space-y-3">
                                {(perspective.summary.insights as string[]).map((insight, idx) => (
                                  <li key={idx} className="flex gap-3 text-gray-700 dark:text-slate-300 items-start">
                                    <span className="flex-shrink-0 w-5 h-5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <span className="text-base">{insight}</span>
                                  </li>
                                ))}
                              </ul>
                          ) : (
                              <div className="space-y-3">
                                {(perspective.summary.insights as any[]).map((insight, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => handleInsightClick(insight)}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 hover:ring-2 hover:ring-orange-50 dark:hover:ring-orange-900/20 transition-all cursor-pointer group"
                                  >
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed mt-1">
                                        {insight.summary}
                                    </p>

                                    <div className="flex items-center gap-4 pt-3 border-t border-gray-50 dark:border-slate-700">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                                            <Users size={14} className="text-gray-400 dark:text-slate-500" />
                                            <span>{insight.users} Users</span>
                                        </div>
                                        <div className="w-px h-3 bg-gray-200 dark:bg-slate-700" />
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                                            <Activity size={14} className="text-gray-400 dark:text-slate-500" />
                                            <span>{insight.traffic} Traffic</span>
                                        </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-400">
                      Perspective {index + 1} of {perspectives.length}
                      <br/>
                      Scroll for next view
                    </div>
                  </div>
                </section>
              ))}
              </div>

              {((selectedNode && !isOverviewMode) || selectedInsightList) && (
                 <div className="absolute inset-0 bg-white dark:bg-slate-900 z-40 animate-in slide-in-from-right duration-300 shadow-xl border-l border-gray-100 dark:border-slate-800 flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                            {selectedNode ? (
                               React.createElement(selectedNode.icon, { size: 20, className: "text-gray-700 dark:text-slate-200" })
                            ) : (
                               <AlertTriangle size={20} className="text-gray-700 dark:text-slate-200" />
                            )}
                          </div>
                          <div>
                             <h2 className="font-semibold text-lg text-gray-900 dark:text-slate-100">
                                 {selectedNode ? selectedNode.label : selectedInsightList?.entity}
                             </h2>
                             <p className="text-sm text-gray-500 dark:text-slate-400">
                                 {selectedNode ? 'Inventory Details' : 'Unsanctioned Items Detected'}
                             </p>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => { setSelectedNode(null); setSelectedInsightList(null); }}>
                          <X size={20} className="text-gray-500 dark:text-slate-400" />
                       </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                       {(selectedNode?.items || selectedInsightList?.items) ? (
                          <div className="space-y-3">
                             {(selectedNode?.items || selectedInsightList?.items).map((item: any, idx: number) => (
                                <AssetListCard
                                   key={idx}
                                   item={item}
                                   onClick={() => {
                                       if (selectedNode) {
                                           handleItemClick(item);
                                       } else {
                                           handleInsightItemClick(item, selectedInsightList?.entity?.toLowerCase().includes('model') ? 'model' : 'tool');
                                       }
                                   }}
                                   type={selectedNode?.type || (selectedInsightList?.entity?.toLowerCase().includes('model') ? 'model' : 'tool')}
                                />
                             ))}
                          </div>
                       ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                             <AlertTriangle size={32} className="mb-2 opacity-50" />
                             <p>No item details available</p>
                          </div>
                       )}
                    </div>
                 </div>
              )}
            </div>
            </>
        )}

          {selectedItem && (
             <>
               {selectedNode?.type === 'app' && <AppDetailsPanel app={selectedItem} onClose={() => setSelectedItem(null)} onInvestigate={handleInvestigateRisk} />}
               {selectedNode?.type === 'model' && <ModelDetailsPanel model={selectedItem} onClose={() => setSelectedItem(null)} />}
               {selectedNode?.type === 'tool' && <ToolDetailsPanel tool={selectedItem} onClose={() => setSelectedItem(null)} />}
               {(selectedNode?.type === 'data-store' || selectedNode?.type === 'dataset') && <DatasetDetailsPanel dataset={selectedItem} onClose={() => setSelectedItem(null)} />}
               {selectedNode?.type === 'agent' && <AppDetailsPanel app={selectedItem} onClose={() => setSelectedItem(null)} onInvestigate={handleInvestigateRisk} />}

               {!['app', 'model', 'tool', 'data-store', 'dataset', 'agent'].includes(selectedNode?.type || '') && (
                   <div className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex items-center justify-center">
                       <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700">
                           <p className="mb-4 text-gray-600 dark:text-slate-300">Detail view not implemented for {selectedNode?.type}</p>
                           <Button onClick={() => setSelectedItem(null)}>Close</Button>
                       </div>
                   </div>
               )}
             </>
          )}

          {selectedInsightEvent && (
              selectedInsightEvent.id === 'chatgpt' ? (
                  <AppDetailsPanel
                      app={{
                          name: 'ChatGPT',
                          status: 'Unsanctioned',
                          type: '3rd Party',
                          category: 'Productivity',
                          domain: 'chatgpt.com',
                          cciScore: 65,
                          firstSeen: 'Jan 15, 2023',
                          lastSeen: 'Just now',
                          icon: Bot
                      }}
                      onClose={() => setSelectedInsightEvent(null)}
                      onInvestigate={handleInvestigateRisk}
                  />
              ) : (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-200">
                        <RiskDetailsPanel
                            event={selectedInsightEvent}
                            type="Unsanctioned Usage"
                            onClose={() => setSelectedInsightEvent(null)}
                        />
                    </div>
                </div>
              )
          )}
      </div>
      </div>
    </DndProvider>
    </>
  );
}
