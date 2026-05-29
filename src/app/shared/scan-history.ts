// Mock data for scan history
// Each scan can detect findings for multiple rules

import { RISK_TYPES } from "./risk-rules";

export interface ScanEvent {
  scanId: string;
  timestamp: Date;
  ruleFindings: {
    ruleId: string;
    count: number;
    status: "open" | "closed"; // Track if findings are still active
  }[];
}

// Generate scan events over the past 12 months (365 days)
// Scans occur every 3-4 days
// NOTE: This will be called BEFORE rule-mutes.ts processes mute logic
function generateScanHistory(): ScanEvent[] {
  const scans: ScanEvent[] = [];
  const now = new Date();
  const allRuleIds = RISK_TYPES.flatMap(rt => rt.rules.map(r => r.id));
  
  // Generate scans every 3-4 days over 365 days
  let currentDaysAgo = 0;
  let scanIndex = 0;
  
  while (currentDaysAgo < 365) {
    const scanTime = new Date(now);
    scanTime.setDate(scanTime.getDate() - currentDaysAgo);
    scanTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
    
    // Each scan finds issues for 3-8 different rules
    const rulesInThisScan = Math.floor(Math.random() * 6) + 3;
    const selectedRules = [...allRuleIds]
      .sort(() => Math.random() - 0.5)
      .slice(0, rulesInThisScan);
    
    const ruleFindings = selectedRules.map(ruleId => ({
      ruleId,
      count: Math.floor(Math.random() * 25) + 1, // 1-25 findings per rule
      status: "open" as const, // All start as open
    }));
    
    scans.push({
      scanId: `scan-${String(scanIndex + 1).padStart(4, '0')}`,
      timestamp: scanTime,
      ruleFindings,
    });
    
    // Move to next scan (3-4 days)
    currentDaysAgo += 3 + Math.floor(Math.random() * 2); // 3 or 4 days
    scanIndex++;
  }
  
  // Sort by timestamp descending (most recent first)
  scans.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return scans;
}

export const SCAN_HISTORY = generateScanHistory();

// Helper to get scan events for a specific rule within a time range
export function getScanEventsForRule(
  ruleId: string,
  daysBack: number = 90
): Array<{ scanId: string; timestamp: Date; count: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  return SCAN_HISTORY
    .filter(scan => scan.timestamp >= cutoffDate)
    .map(scan => {
      const finding = scan.ruleFindings.find(rf => rf.ruleId === ruleId);
      if (!finding) return null;
      return {
        scanId: scan.scanId,
        timestamp: scan.timestamp,
        count: finding.count,
      };
    })
    .filter((event): event is { scanId: string; timestamp: Date; count: number } => event !== null);
}

// Helper to format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'Just now';
}

// Format timestamp for display
export function formatScanTime(date: Date): string {
  const now = new Date();
  const showYear = date.getFullYear() !== now.getFullYear();
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: showYear ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}