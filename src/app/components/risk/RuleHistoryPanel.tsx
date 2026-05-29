import { useState, useMemo } from "react";
import { X, Search, TrendingUp, Eye, AlertTriangle, Lock, Clock, UserMinus, ShieldCheck, BellOff, Check } from "lucide-react";
import { RISK_TYPES } from "../../shared/risk-rules";
import type { RiskRule } from "../../shared/risk-rules";
import { SCAN_HISTORY, getScanEventsForRule, formatScanTime } from "../../shared/scan-history";
import { isRuleMuted, getMuteEventForRule } from "../../shared/rule-mutes";

interface RuleHistoryPanelProps {
  onClose: () => void;
  initialSelectedRuleIds?: string[];
}

const SWIMLANE_COLORS = [
  { line: "#f97316", fill: "rgba(249, 115, 22, 0.2)", hover: "rgba(249, 115, 22, 0.4)" }, // Orange
  { line: "#ec4899", fill: "rgba(236, 72, 153, 0.2)", hover: "rgba(236, 72, 153, 0.4)" }, // Pink
  { line: "#eab308", fill: "rgba(234, 179, 8, 0.2)", hover: "rgba(234, 179, 8, 0.4)" },   // Yellow
];

// Age breakdown for findings
interface AgeBucket {
  label: string;
  range: string;
  count: number;
}

interface AgeBreakdown {
  total: number;
  buckets: AgeBucket[];
}

// Get age bucket definitions based on time range
function getAgeBuckets(timeRange: 90 | 180 | 270 | 365): Array<{ label: string; range: string; minDays: number; maxDays: number }> {
  if (timeRange === 90) {
    // 3 months: finer granularity
    return [
      { label: "Recent", range: "0-30 days", minDays: 0, maxDays: 30 },
      { label: "Moderate", range: "31-60 days", minDays: 31, maxDays: 60 },
      { label: "Aged", range: "61-90 days", minDays: 61, maxDays: 90 },
    ];
  } else if (timeRange === 180) {
    // 6 months: medium granularity
    return [
      { label: "Recent", range: "0-60 days", minDays: 0, maxDays: 60 },
      { label: "Moderate", range: "61-120 days", minDays: 61, maxDays: 120 },
      { label: "Aged", range: "121-180 days", minDays: 121, maxDays: 180 },
    ];
  } else if (timeRange === 270) {
    // 9 months: coarser granularity
    return [
      { label: "Recent", range: "0-90 days", minDays: 0, maxDays: 90 },
      { label: "Moderate", range: "91-180 days", minDays: 91, maxDays: 180 },
      { label: "Aged", range: "181-270 days", minDays: 181, maxDays: 270 },
    ];
  } else {
    // 12 months: coarsest granularity
    return [
      { label: "Recent", range: "0-120 days", minDays: 0, maxDays: 120 },
      { label: "Moderate", range: "121-240 days", minDays: 121, maxDays: 240 },
      { label: "Aged", range: "241-365 days", minDays: 241, maxDays: 365 },
    ];
  }
}

// Calculate age breakdown for a rule within a time range (OPEN findings only for current state)
function getAgeBreakdownForRule(ruleId: string, timeRange: 90 | 180 | 270 | 365): AgeBreakdown {
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeRange);
  
  const bucketDefs = getAgeBuckets(timeRange);
  const buckets: AgeBucket[] = bucketDefs.map(def => ({
    label: def.label,
    range: def.range,
    count: 0,
  }));
  
  SCAN_HISTORY
    .filter(scan => scan.timestamp >= cutoffDate)
    .forEach(scan => {
      const finding = scan.ruleFindings.find(rf => rf.ruleId === ruleId && rf.status === "open");
      if (!finding) return;
      
      const ageInDays = Math.floor((now.getTime() - scan.timestamp.getTime()) / (1000 * 60 * 60 * 24));
      
      // Find which bucket this age falls into
      for (let i = 0; i < bucketDefs.length; i++) {
        if (ageInDays >= bucketDefs[i].minDays && ageInDays <= bucketDefs[i].maxDays) {
          buckets[i].count += finding.count;
          break;
        }
      }
    });
  
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  
  return { total, buckets };
}

// Helper to calculate cumulative OPEN findings for a rule from scan history (for sorting)
function getCumulativeFindingsForRule(ruleId: string): number {
  return SCAN_HISTORY.reduce((total, scan) => {
    const finding = scan.ruleFindings.find(rf => rf.ruleId === ruleId && rf.status === "open");
    return total + (finding?.count || 0);
  }, 0);
}

// Icon map for risk types
const RISK_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  overexposed:   Eye,
  exfil:         AlertTriangle,
  overprivilege: Lock,
  stale:         Clock,
  former:        UserMinus,
  compliance:    ShieldCheck,
};

export function PolicyHistoryPanel({ onClose, initialSelectedRuleIds = [] }: RuleHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(initialSelectedRuleIds.slice(0, 3));
  const [timeRange, setTimeRange] = useState<90 | 180 | 270 | 365>(90);
  const [hoveredScanId, setHoveredScanId] = useState<string | null>(null);
  const [hoveredBlip, setHoveredBlip] = useState<{ ruleId: string; scanId: string } | null>(null);
  const [showHiddenByRiskType, setShowHiddenByRiskType] = useState<Record<string, boolean>>({});
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showLimitTooltip, setShowLimitTooltip] = useState(false);
  const [limitTooltipPos, setLimitTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Sort rules alphabetically
  const sortedRules = useMemo(() => {
    const allRules = RISK_TYPES.flatMap(rt => rt.rules);
    return [...allRules].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filter rules by search query
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return sortedRules;
    const query = searchQuery.toLowerCase();
    return sortedRules.filter(rule =>
      rule.name.toLowerCase().includes(query) ||
      rule.id.toLowerCase().includes(query)
    );
  }, [sortedRules, searchQuery]);

  const handleRuleToggle = (ruleId: string, event?: React.MouseEvent) => {
    if (selectedRuleIds.includes(ruleId)) {
      setSelectedRuleIds(prev => prev.filter(id => id !== ruleId));
    } else {
      if (selectedRuleIds.length < 3) {
        setSelectedRuleIds(prev => [...prev, ruleId]);
      } else {
        // Show limit tooltip
        if (event) {
          setLimitTooltipPos({ x: event.clientX, y: event.clientY });
          setShowLimitTooltip(true);
          // Auto-hide after 2 seconds
          setTimeout(() => setShowLimitTooltip(false), 2000);
        }
      }
    }
  };

  // Get scan data for selected rules
  const selectedRulesData = useMemo(() => {
    return selectedRuleIds.map((ruleId, index) => {
      const rule = RISK_TYPES.flatMap(rt => rt.rules).find(r => r.id === ruleId);
      const events = getScanEventsForRule(ruleId, timeRange);
      return {
        rule: rule!,
        events,
        color: SWIMLANE_COLORS[index],
      };
    });
  }, [selectedRuleIds, timeRange]);

  // Get all unique scan IDs in the time range for the timeline
  const allScansInRange = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    return SCAN_HISTORY.filter(scan => scan.timestamp >= cutoffDate);
  }, [timeRange]);

  return (
    <div
      className="fixed inset-0 flex"
      style={{ zIndex: 100, background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto h-full bg-card border-l flex flex-col"
        style={{ width: "85vw", maxWidth: 1400, borderColor: "var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Full width */}
        <div
          className="shrink-0 px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 style={{ fontSize: "14px", fontWeight: 600 }}>Rule History</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Main content - Two column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Rule selection */}
          <div
            className="flex flex-col border-r"
            style={{ width: 340, borderColor: "var(--color-border)" }}
          >
            {/* Search box */}
            <div className="shrink-0 p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                  }}
                />
              </div>
            </div>

            {/* Rule list */}
            <div className="flex-1 overflow-y-auto">{searchQuery.trim() ? (
                // When searching, show flat list with all rules sorted by findings count
                filteredRules
                  .sort((a, b) => getCumulativeFindingsForRule(b.id) - getCumulativeFindingsForRule(a.id))
                  .map((rule) => {
                  const isSelected = selectedRuleIds.includes(rule.id);
                  const selectedIndex = selectedRuleIds.indexOf(rule.id);
                  const findingsCount = getCumulativeFindingsForRule(rule.id);

                  return (
                    <button
                      key={rule.id}
                      onClick={(e) => handleRuleToggle(rule.id, e)}
                      className="w-full text-left px-3 border-b transition-colors flex items-center gap-2 hover:bg-muted/30"
                      style={{
                        height: 34,
                        borderColor: "var(--color-border)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        className="shrink-0 flex items-center justify-center transition-all"
                        style={{
                          width: 14,
                          height: 14,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                          background: isSelected ? "var(--color-primary)" : "transparent",
                          borderRadius: 4,
                        }}
                      >
                        {isSelected && (
                          <Check size={10} style={{ color: "white", strokeWidth: 3 }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "12px", fontWeight: 400, lineHeight: "18px" }}>
                          {rule.name}
                          {isRuleMuted(rule.id) && (
                            <span style={{ color: "var(--color-muted-foreground)", opacity: 0.7, marginLeft: 4 }}>
                              (Muted)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400, lineHeight: "16.5px" }}>
                          {findingsCount.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                // When not searching, show grouped by risk type with show/hide functionality
                RISK_TYPES.map((riskType) => {
                  const visibleRules = riskType.rules.filter(r => getCumulativeFindingsForRule(r.id) > 0);
                  const hiddenRules = riskType.rules.filter(r => getCumulativeFindingsForRule(r.id) === 0);
                  const showHidden = showHiddenByRiskType[riskType.id] || false;
                  const rulesToShow = showHidden ? riskType.rules : visibleRules;
                  const Icon = RISK_ICON_MAP[riskType.id];

                  return (
                    <div key={riskType.id}>
                      {/* Risk type header */}
                      <div
                        className="sticky top-0 px-4 py-2.5 flex items-center gap-2"
                        style={{
                          background: "var(--color-card)",
                          zIndex: 1,
                        }}
                      >
                        {Icon && <Icon size={12} style={{ color: "var(--color-muted-foreground)" }} />}
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-foreground)", letterSpacing: "0.02em" }}>
                          {riskType.label}
                        </p>
                      </div>

                      {/* Rules in this risk type, sorted by findings count descending */}
                      {rulesToShow
                        .sort((a, b) => getCumulativeFindingsForRule(b.id) - getCumulativeFindingsForRule(a.id))
                        .map((rule) => {
                        const isSelected = selectedRuleIds.includes(rule.id);
                        const selectedIndex = selectedRuleIds.indexOf(rule.id);
                        const findingsCount = getCumulativeFindingsForRule(rule.id);

                        return (
                          <button
                            key={rule.id}
                            onClick={(e) => handleRuleToggle(rule.id, e)}
                            className="w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 hover:bg-muted/30"
                            style={{
                              cursor: "pointer",
                            }}
                          >
                            <div
                              className="shrink-0 rounded flex items-center justify-center transition-all"
                              style={{
                                width: 14,
                                height: 14,
                                borderWidth: 1.5,
                                borderStyle: "solid",
                                borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                                background: isSelected ? "var(--color-primary)" : "transparent",
                              }}
                            >
                              {isSelected && (
                                <Check size={10} style={{ color: "white", strokeWidth: 3 }} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: "12px", fontWeight: 400, lineHeight: "1.4" }}>
                                {rule.name}
                                {isRuleMuted(rule.id) && (
                                  <span style={{ color: "var(--color-muted-foreground)", opacity: 0.7, marginLeft: 4 }}>
                                    (Muted)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="shrink-0">
                              <span style={{ fontSize: "11px", color: "var(--color-muted-foreground)", fontWeight: 400 }}>
                                {findingsCount.toLocaleString()}
                              </span>
                            </div>
                          </button>
                        );
                      })}

                      {/* Show hidden toggle */}
                      {hiddenRules.length > 0 && (
                        <button
                          onClick={() => setShowHiddenByRiskType(prev => ({ ...prev, [riskType.id]: !showHidden }))}
                          className="w-full px-4 py-2 flex items-center justify-end gap-2 transition-colors hover:bg-muted/20"
                          style={{
                            color: "var(--color-muted-foreground)",
                            opacity: 0.5,
                          }}
                        >
                          <Eye size={11} />
                          <span style={{ fontSize: "10px", fontWeight: 400 }}>
                            {showHidden ? `${hiddenRules.length} less` : `${hiddenRules.length} more`}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right side - Timeline */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header with selected pills and time range selector */}
            {selectedRuleIds.length > 0 && (
              <div
                className="shrink-0 px-5 py-3 border-b flex items-center justify-between gap-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                {/* Left: Selected rule pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedRuleIds.map((ruleId, index) => {
                    const rule = RISK_TYPES.flatMap(rt => rt.rules).find(r => r.id === ruleId);
                    if (!rule) return null;
                    
                    const color = SWIMLANE_COLORS[index];
                    
                    return (
                      <div
                        key={ruleId}
                        className="flex items-center gap-2 px-2 pr-1.5 rounded-md"
                        style={{
                          height: 22.5,
                          background: `${color.line}26`, // 15% opacity
                          border: `1px solid ${color.line}33`, // 20% opacity
                        }}
                      >
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: 400,
                            lineHeight: "16.5px",
                            color: color.line,
                          }}
                        >
                          {rule.name}
                        </p>
                        <button
                          onClick={() => handleRuleToggle(ruleId)}
                          className="flex items-center justify-center rounded transition-colors"
                          style={{
                            width: 14,
                            height: 14,
                            padding: 2,
                          }}
                          aria-label={`Remove ${rule.name}`}
                        >
                          <X size={10} style={{ color: color.line }} />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* Clear selections button */}
                  {selectedRuleIds.length > 0 && (
                    <button
                      onClick={() => setSelectedRuleIds([])}
                      className="flex items-center justify-center px-2 rounded-md transition-colors hover:bg-muted/50"
                      style={{
                        height: 22.5,
                        border: "1px solid rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          fontWeight: 400,
                          lineHeight: "16.5px",
                          color: "#64748b",
                          textAlign: "center",
                        }}
                      >
                        Clear Selections
                      </p>
                    </button>
                  )}
                </div>

                {/* Right: Time range toggle */}
                <div
                  className="flex items-center gap-0.5 px-[3px] py-px rounded-md"
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {([
                    { days: 90, label: "3m" },
                    { days: 180, label: "6m" },
                    { days: 270, label: "9m" },
                    { days: 365, label: "12m" },
                  ] as const).map((option) => (
                    <button
                      key={option.days}
                      onClick={() => setTimeRange(option.days)}
                      className="rounded transition-colors"
                      style={{
                        width: "auto",
                        minWidth: "36.805px",
                        height: "24.5px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: timeRange === option.days ? "rgba(148, 163, 184, 0.12)" : "transparent",
                        color: timeRange === option.days ? "#0f172a" : "#64748b",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline content */}
            <div className="flex-1 overflow-y-auto p-5">
              {selectedRuleIds.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)" }}>
                    Select up to 3 rules to view their scan history
                  </p>
                </div>
              ) : (
                <VerticalTimeline
                  rulesData={selectedRulesData}
                  allScans={allScansInRange}
                  timeRange={timeRange}
                  hoveredScanId={hoveredScanId}
                  onHoverScan={setHoveredScanId}
                  hoveredBlip={hoveredBlip}
                  onHoverBlip={setHoveredBlip}
                  cursorPos={cursorPos}
                  onCursorMove={setCursorPos}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Limit tooltip */}
      {showLimitTooltip && limitTooltipPos && (
        <div
          className="fixed whitespace-nowrap px-3 py-2 rounded border pointer-events-none"
          style={{
            left: limitTooltipPos.x + 12,
            top: limitTooltipPos.y + 12,
            background: "#991b1b",
            borderColor: "#dc2626",
            color: "white",
            fontSize: "11px",
            fontWeight: 500,
            zIndex: 10001,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          Maximum of 3 rules reached
        </div>
      )}
    </div>
  );
}

// Vertical timeline component
interface VerticalTimelineProps {
  rulesData: Array<{
    rule: RiskRule;
    events: Array<{ scanId: string; timestamp: Date; count: number }>;
    color: typeof SWIMLANE_COLORS[0];
  }>;
  allScans: Array<{ scanId: string; timestamp: Date }>;
  timeRange: number;
  hoveredScanId: string | null;
  onHoverScan: (scanId: string | null) => void;
  hoveredBlip: { ruleId: string; scanId: string } | null;
  onHoverBlip: (blip: { ruleId: string; scanId: string } | null) => void;
  cursorPos: { x: number; y: number } | null;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
}

function VerticalTimeline({
  rulesData,
  allScans,
  timeRange,
  hoveredScanId,
  onHoverScan,
  hoveredBlip,
  onHoverBlip,
  cursorPos,
  onCursorMove,
}: VerticalTimelineProps) {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  const [hoveredCurrentBlip, setHoveredCurrentBlip] = useState<string | null>(null);

  // Calculate vertical position for a timestamp (0 = now/top, 1 = oldest/bottom)
  const getYPosition = (timestamp: Date): number => {
    const totalMs = now.getTime() - startDate.getTime();
    const elapsedMs = now.getTime() - timestamp.getTime();
    return elapsedMs / totalMs;
  };

  // Timeline height scales with time range to prevent overcrowding
  // Base height of 600px for 90 days, scales proportionally
  const baseTimelineHeight = 600;
  const timelineHeight = (timeRange / 90) * baseTimelineHeight;
  const currentStateHeight = 120; // Height for current state section
  const gapHeight = 20; // Gap between current and historical
  const swimlaneWidth = 140;
  const leftMargin = 100; // For time labels
  
  const totalHeight = currentStateHeight + gapHeight + timelineHeight;

  return (
    <div className="relative" style={{ height: totalHeight + 20, paddingLeft: leftMargin }}>
      {/* "Now" label for current state */}
      <div 
        className="absolute"
        style={{ 
          left: 0,
          top: currentStateHeight / 2,
          width: leftMargin,
          transform: "translateY(-50%)",
        }}
      >
        <div className="absolute right-3 -translate-y-1/2" style={{ top: "50%" }}>
          <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", textAlign: "right" }}>
            Now
          </p>
        </div>
      </div>

      {/* Current State Section */}
      <div className="flex" style={{ height: currentStateHeight }}>
        {rulesData.map((ruleData, index) => {
          const ageBreakdown = getAgeBreakdownForRule(ruleData.rule.id, timeRange);
          const isMuted = isRuleMuted(ruleData.rule.id);
          const muteEvent = isMuted ? getMuteEventForRule(ruleData.rule.id) : undefined;
          
          return (
            <div key={`current-${ruleData.rule.id}`} style={{ width: swimlaneWidth }}>
              <div
                className="relative border-r h-full flex items-center justify-center"
                style={{
                  borderColor: "var(--color-border)",
                  borderLeftColor: index === 0 ? "var(--color-border)" : "transparent",
                  borderLeftWidth: index === 0 ? 1 : 0,
                  borderLeftStyle: "solid",
                  background: index % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent",
                }}
              >
                {ageBreakdown.total > 0 ? (
                  <CurrentStateBlip
                    ruleId={ruleData.rule.id}
                    ageBreakdown={ageBreakdown}
                    color={ruleData.color}
                    swimlaneWidth={swimlaneWidth}
                    isHovered={hoveredCurrentBlip === ruleData.rule.id}
                    onHover={setHoveredCurrentBlip}
                    cursorPos={cursorPos}
                    onCursorMove={onCursorMove}
                  />
                ) : isMuted && muteEvent ? (
                  <div
                    className="flex flex-col items-center justify-center gap-1 px-2"
                    style={{
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 600, opacity: 0.8 }}>
                      Muted
                    </div>
                    <div style={{ fontSize: "9px", opacity: 0.6, textAlign: "center" }}>
                      {formatScanTime(muteEvent.timestamp)}
                    </div>
                    <div style={{ fontSize: "9px", opacity: 0.6 }}>
                      By {muteEvent.mutedBy}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Gap with "snapped off" indicators */}
      <div className="flex" style={{ height: gapHeight }}>
        {rulesData.map((ruleData, index) => (
          <div key={`gap-${ruleData.rule.id}`} style={{ width: swimlaneWidth }}>
            <div
              className="relative h-full"
              style={{
                borderRight: "1px solid var(--color-border)",
                borderLeft: index === 0 ? "1px solid var(--color-border)" : "none",
              }}
            >
              {/* Dashed center line */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  width: 2,
                  height: "100%",
                  borderLeft: `2px dashed ${ruleData.color.line}`,
                  opacity: 0.3,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Time axis labels */}
      <div 
        className="absolute left-0" 
        style={{ 
          width: leftMargin, 
          height: timelineHeight,
          top: currentStateHeight + gapHeight,
        }}
      >
        <TimeAxisLabels startDate={startDate} endDate={now} height={timelineHeight} />
      </div>

      {/* Historical Timeline Swimlanes */}
      <div className="flex">
        {rulesData.map((ruleData, index) => {
          const isMuted = isRuleMuted(ruleData.rule.id);
          const muteEvent = isMuted ? getMuteEventForRule(ruleData.rule.id) : undefined;
          
          // Calculate mute position if applicable
          let muteYPos: number | null = null;
          let muteYPx: number | null = null;
          if (muteEvent) {
            if (muteEvent.timestamp < startDate) {
              // Mute is before timeline, entire line should be dashed
              muteYPos = 1.0;
              muteYPx = timelineHeight;
            } else if (muteEvent.timestamp <= now) {
              muteYPos = getYPosition(muteEvent.timestamp);
              muteYPx = muteYPos * timelineHeight;
            }
          }
          
          return (
            <div key={ruleData.rule.id} style={{ width: swimlaneWidth }}>
              {/* Vertical timeline track */}
              <div 
                className="relative border-r" 
                style={{ 
                  height: timelineHeight,
                  borderColor: "var(--color-border)",
                  borderLeftColor: index === 0 ? "var(--color-border)" : "transparent",
                  borderLeftWidth: index === 0 ? 1 : 0,
                  borderLeftStyle: "solid",
                  background: index % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent",
                }}
              >
                {/* Colored center line - solid before mute, dashed after */}
                {muteYPx !== null ? (
                  <>
                    {/* Dashed line from top (now) to mute point (AFTER mute event) */}
                    {muteYPx > 0 && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          width: 2,
                          height: muteYPx,
                          top: 0,
                          borderLeft: `2px dashed ${ruleData.color.line}`,
                          opacity: 0.4,
                        }}
                      />
                    )}
                    {/* Solid line from mute point to bottom (BEFORE mute event) */}
                    {muteYPx < timelineHeight && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          width: 2,
                          height: timelineHeight - muteYPx,
                          top: muteYPx,
                          background: ruleData.color.line,
                          opacity: 0.4,
                        }}
                      />
                    )}
                  </>
                ) : (
                  /* No mute event - solid line throughout */
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                      width: 2,
                      height: "100%",
                      background: ruleData.color.line,
                      opacity: 0.4,
                    }}
                  />
                )}

                {/* Scan blips (equalizer style) */}
                {ruleData.events.map((event) => {
                  const yPos = getYPosition(event.timestamp);
                  const yPx = yPos * timelineHeight;
                  
                  // Calculate bar heights based on count - create 5 vertical bars with varying heights
                  const baseHeight = Math.min(40, Math.max(20, 16 + event.count / 1.5));
                  const bars = [
                    { height: baseHeight * 0.4, width: 3 },
                    { height: baseHeight * 0.7, width: 3 },
                    { height: baseHeight, width: 3 },
                    { height: baseHeight * 0.7, width: 3 },
                    { height: baseHeight * 0.4, width: 3 },
                  ];
                  
                  const isHovered = hoveredBlip?.ruleId === ruleData.rule.id && hoveredBlip?.scanId === event.scanId;
                  const isScanHovered = hoveredScanId === event.scanId;
                  // Dim if there's a hovered scan and this isn't it
                  const shouldDim = hoveredScanId !== null && !isScanHovered;

                  // Convert hex to rgba for transparent fill
                  const hexToRgba = (hex: string, alpha: number) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };

                  return (
                    <div
                      key={event.scanId}
                      className="absolute left-1/2"
                      style={{
                        top: yPx,
                        transform: "translate(-50%, -50%)",
                        cursor: "pointer",
                        zIndex: isHovered ? 10 : 1,
                      }}
                      onMouseEnter={() => {
                        onHoverScan(event.scanId);
                        onHoverBlip({ ruleId: ruleData.rule.id, scanId: event.scanId });
                      }}
                      onMouseMove={(e) => {
                        onCursorMove({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => {
                        onHoverScan(null);
                        onHoverBlip(null);
                        onCursorMove(null);
                      }}
                    >
                      {/* Equalizer bars */}
                      <div className="flex items-center gap-0.5">
                        {bars.map((bar, barIndex) => (
                          <div
                            key={barIndex}
                            className="rounded-full transition-all"
                            style={{
                              width: bar.width,
                              height: isHovered ? bar.height * 1.2 : bar.height,
                              border: `1px solid ${hexToRgba(ruleData.color.line, shouldDim ? 0.15 : isScanHovered ? 1 : 0.6)}`,
                              background: hexToRgba(ruleData.color.line, shouldDim ? 0.04 : isScanHovered ? 0.38 : 0.15),
                              transition: "background 0.14s ease, height 0.14s ease, border-color 0.14s ease",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Mute marker (if rule is muted) */}
                <MuteMarker
                  ruleId={ruleData.rule.id}
                  color={ruleData.color}
                  getYPosition={getYPosition}
                  timelineHeight={timelineHeight}
                  timeRange={timeRange}
                  cursorPos={cursorPos}
                  onCursorMove={onCursorMove}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover line that skewers all blips from the same scan */}
      {hoveredScanId && (
        <HoverSkewer
          scanId={hoveredScanId}
          rulesData={rulesData}
          getYPosition={getYPosition}
          timelineHeight={timelineHeight}
          currentStateHeight={currentStateHeight}
          gapHeight={gapHeight}
          leftMargin={leftMargin}
          swimlaneWidth={swimlaneWidth}
          swimlaneCount={rulesData.length}
        />
      )}

      {/* Cursor-following tooltip */}
      {hoveredBlip && cursorPos && (
        <BlipTooltip
          hoveredBlip={hoveredBlip}
          rulesData={rulesData}
          cursorPos={cursorPos}
        />
      )}
    </div>
  );
}

// Time axis labels
function TimeAxisLabels({ startDate, endDate, height }: { startDate: Date; endDate: Date; height: number }) {
  // Show 5 time markers
  const markers = [0, 0.25, 0.5, 0.75, 1];
  const now = new Date();

  return (
    <div className="relative" style={{ height }}>
      {markers.map((fraction, index) => {
        const timestamp = new Date(endDate.getTime() - (endDate.getTime() - startDate.getTime()) * fraction);
        const yPx = fraction * height;
        
        // Show year only on the oldest marker (bottom) if it's different from current year
        const showYear = index === markers.length - 1 && timestamp.getFullYear() !== now.getFullYear();

        return (
          <div
            key={fraction}
            className="absolute right-3 -translate-y-1/2"
            style={{ top: yPx }}
          >
            <p style={{ fontSize: "10px", color: "var(--color-muted-foreground)", textAlign: "right" }}>
              {timestamp.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: showYear ? 'numeric' : undefined,
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal line that skewers blips from the same scan
interface HoverSkewerProps {
  scanId: string;
  rulesData: VerticalTimelineProps["rulesData"];
  getYPosition: (timestamp: Date) => number;
  timelineHeight: number;
  currentStateHeight: number;
  gapHeight: number;
  leftMargin: number;
  swimlaneWidth: number;
  swimlaneCount: number;
}

function HoverSkewer({
  scanId,
  rulesData,
  getYPosition,
  timelineHeight,
  currentStateHeight,
  gapHeight,
  leftMargin,
  swimlaneWidth,
  swimlaneCount,
}: HoverSkewerProps) {
  // Find the scan timestamp from any rule that has it
  const scanEvent = rulesData
    .flatMap(rd => rd.events)
    .find(e => e.scanId === scanId);

  if (!scanEvent) return null;

  const yPos = getYPosition(scanEvent.timestamp);
  const yPx = yPos * timelineHeight;
  
  // Add offset for current state section and gap
  const offsetYPx = currentStateHeight + gapHeight + yPx;

  // Calculate width to span all swimlanes from left edge to right edge
  const totalWidth = swimlaneCount * swimlaneWidth;

  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          left: leftMargin,
          top: offsetYPx,
          transform: "translateY(-50%)",
          width: totalWidth,
          height: 2,
          background: "var(--color-foreground)",
          opacity: 0.6,
          zIndex: 5,
        }}
      />
      {/* Timestamp label */}
      <div
        className="absolute pointer-events-none px-2 py-1 rounded border"
        style={{
          left: leftMargin - 10,
          top: offsetYPx,
          transform: "translate(-100%, -50%)",
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
          fontSize: "9px",
          fontWeight: 500,
          color: "var(--color-muted-foreground)",
          whiteSpace: "nowrap",
          zIndex: 6,
        }}
      >
        {formatScanTime(scanEvent.timestamp)}
      </div>
    </>
  );
}

// Cursor-following tooltip for blips
interface BlipTooltipProps {
  hoveredBlip: { ruleId: string; scanId: string };
  rulesData: VerticalTimelineProps["rulesData"];
  cursorPos: { x: number; y: number };
}

function BlipTooltip({ hoveredBlip, rulesData, cursorPos }: BlipTooltipProps) {
  const ruleData = rulesData.find(rd => rd.rule.id === hoveredBlip.ruleId);
  const event = ruleData?.events.find(e => e.scanId === hoveredBlip.scanId);

  if (!ruleData || !event) return null;

  return (
    <div
      className="fixed whitespace-nowrap px-2 py-1.5 rounded border pointer-events-none"
      style={{
        left: cursorPos.x + 12,
        top: cursorPos.y + 12,
        background: "var(--color-card)",
        borderColor: ruleData.color.line,
        fontSize: "10px",
        fontWeight: 500,
        zIndex: 1000,
      }}
    >
      <div style={{ color: ruleData.color.line, fontWeight: 700 }}>
        {event.count} finding{event.count !== 1 ? "s" : ""}
      </div>
      <div style={{ color: "var(--color-muted-foreground)", fontSize: "9px", marginTop: 2 }}>
        {formatScanTime(event.timestamp)}
      </div>
    </div>
  );
}

// Current state blip component
interface CurrentStateBlipProps {
  ruleId: string;
  ageBreakdown: AgeBreakdown;
  color: typeof SWIMLANE_COLORS[0];
  swimlaneWidth: number;
  isHovered: boolean;
  onHover: (ruleId: string | null) => void;
  cursorPos: { x: number; y: number } | null;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
}

function CurrentStateBlip({
  ruleId,
  ageBreakdown,
  color,
  swimlaneWidth,
  isHovered,
  onHover,
  cursorPos,
  onCursorMove,
}: CurrentStateBlipProps) {
  // Convert hex to rgba for transparent fill
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Calculate size for each age layer
  // Max width is 90% of swimlane width (leaving some margin)
  const maxWidth = Math.min(swimlaneWidth * 0.9, 120);
  
  // Use more bars for better granularity (9 bars)
  const barCount = 9;
  const barGap = 1;
  
  // Calculate base height proportional to total findings
  const baseHeight = Math.min(80, Math.max(40, 30 + ageBreakdown.total / 2));
  
  // Create layers from youngest to oldest (rendered back to front)
  const layers = [
    {
      label: "Recent",
      range: "0-30 days",
      count: ageBreakdown.buckets[0].count,
      opacity: 0.25, // Lightest (youngest)
      scale: 1.0, // Largest
    },
    {
      label: "Moderate", 
      range: "31-60 days",
      count: ageBreakdown.buckets[1].count,
      opacity: 0.45, // Medium
      scale: 0.75, // Medium size
    },
    {
      label: "Aged",
      range: "61-90 days", 
      count: ageBreakdown.buckets[2].count,
      opacity: 0.7, // Darkest (oldest)
      scale: 0.5, // Smallest
    },
  ].filter(layer => layer.count > 0); // Only show layers with findings
  
  // If no layers, don't render
  if (layers.length === 0) return null;

  return (
    <div
      className="relative"
      style={{ 
        width: swimlaneWidth,
        height: baseHeight + 20,
        cursor: "pointer",
      }}
      onMouseEnter={() => onHover(ruleId)}
      onMouseMove={(e) => onCursorMove({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => {
        onHover(null);
        onCursorMove(null);
      }}
    >
      {/* Render layers from back to front (youngest to oldest) */}
      {layers.reverse().map((layer, layerIndex) => {
        const layerHeight = baseHeight * layer.scale;
        const barWidth = 3;
        
        // Create equalizer bars with varying heights
        const bars = Array.from({ length: barCount }, (_, i) => {
          const centerIndex = Math.floor(barCount / 2);
          const distanceFromCenter = Math.abs(i - centerIndex);
          const heightFactor = 1 - (distanceFromCenter / centerIndex) * 0.6; // Center is tallest
          return {
            height: layerHeight * heightFactor,
            width: barWidth,
          };
        });
        
        const totalWidth = bars.length * barWidth + (bars.length - 1) * barGap;

        return (
          <div
            key={layer.label}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-0.5"
            style={{
              zIndex: layerIndex, // Oldest on top
            }}
          >
            {bars.map((bar, barIndex) => (
              <div
                key={barIndex}
                className="rounded-full transition-all"
                style={{
                  width: bar.width,
                  height: isHovered ? bar.height * 1.15 : bar.height,
                  border: `1px solid ${color.line}`,
                  background: hexToRgba(color.line, layer.opacity),
                }}
              />
            ))}
          </div>
        );
      })}

      {/* Tooltip */}
      {isHovered && cursorPos && (
        <div
          className="fixed whitespace-nowrap px-3 py-2 rounded border pointer-events-none"
          style={{
            left: cursorPos.x + 12,
            top: cursorPos.y + 12,
            background: "var(--color-card)",
            borderColor: color.line,
            fontSize: "11px",
            fontWeight: 500,
            zIndex: 1000,
          }}
        >
          <div style={{ color: color.line, fontWeight: 700, marginBottom: 4 }}>
            {ageBreakdown.total} total finding{ageBreakdown.total !== 1 ? "s" : ""}
          </div>
          {ageBreakdown.buckets.map((bucket) => (
            bucket.count > 0 && (
              <div key={bucket.label} style={{ color: "var(--color-muted-foreground)", fontSize: "10px", marginTop: 2 }}>
                {bucket.range}: {bucket.count}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// Mute marker component
interface MuteMarkerProps {
  ruleId: string;
  color: typeof SWIMLANE_COLORS[0];
  getYPosition: (timestamp: Date) => number;
  timelineHeight: number;
  timeRange: number;
  cursorPos: { x: number; y: number } | null;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
}

function MuteMarker({
  ruleId,
  color,
  getYPosition,
  timelineHeight,
  timeRange,
  cursorPos,
  onCursorMove,
}: MuteMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const muteEvent = getMuteEventForRule(ruleId);

  if (!muteEvent) return null;

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  // If mute is older than timeRange, place it at the very beginning (bottom)
  let yPos: number;
  if (muteEvent.timestamp < startDate) {
    yPos = 1.0; // Bottom of timeline
  } else {
    yPos = getYPosition(muteEvent.timestamp);
  }
  
  const yPx = yPos * timelineHeight;
  
  // Clamp to timeline bounds
  const clampedYPx = Math.max(0, Math.min(timelineHeight, yPx));

  return (
    <>
      <div
        className="absolute left-1/2"
        style={{
          top: clampedYPx,
          transform: "translate(-50%, -50%)",
          cursor: "pointer",
          pointerEvents: "auto",
          zIndex: 20,
        }}
        onMouseEnter={(e) => {
          setIsHovered(true);
          onCursorMove({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          onCursorMove({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onCursorMove(null);
        }}
      >
        {/* Circle background */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            background: color.line,
          }}
        >
          {/* Bell with slash icon */}
          <BellOff size={12} style={{ color: "white" }} />
        </div>
      </div>

      {/* Tooltip - render outside to avoid z-index issues */}
      {isHovered && cursorPos && (
        <div
          className="fixed whitespace-nowrap px-3 py-2 rounded border pointer-events-none"
          style={{
            left: cursorPos.x + 12,
            top: cursorPos.y + 12,
            background: "var(--color-card)",
            borderColor: color.line,
            fontSize: "11px",
            fontWeight: 500,
            zIndex: 10000,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ color: color.line, fontWeight: 700, marginBottom: 4 }}>
            Policy Disabled
          </div>
          <div style={{ color: "var(--color-muted-foreground)", fontSize: "10px", marginTop: 2 }}>
            {formatScanTime(muteEvent.timestamp)}
          </div>
          <div style={{ color: "var(--color-muted-foreground)", fontSize: "10px" }}>
            By {muteEvent.mutedBy}
          </div>
        </div>
      )}
    </>
  );
}