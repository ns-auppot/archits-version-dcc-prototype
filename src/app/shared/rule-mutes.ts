// Mock data for rule mute events
// When a rule is muted, it's effectively turned off and stops generating findings

import { RISK_TYPES } from "./risk-rules";
import { SCAN_HISTORY } from "./scan-history";

export interface RuleMuteEvent {
  ruleId: string;
  timestamp: Date;
  mutedBy: string; // User who muted the rule
}

// Helper to get cumulative findings for a rule from scan history
function getCumulativeFindingsForRule(ruleId: string): number {
  return SCAN_HISTORY.reduce((total, scan) => {
    const finding = scan.ruleFindings.find(rf => rf.ruleId === ruleId);
    return total + (finding?.count || 0);
  }, 0);
}

// Generate mute events for rules with and without findings
function generateMuteEvents(): RuleMuteEvent[] {
  const muteEvents: RuleMuteEvent[] = [];
  const allRules = RISK_TYPES.flatMap(rt => rt.rules);
  const now = new Date();
  
  // User names for mock data
  const users = [
    "David Chen",
    "David Martinez",
    "David Thompson",
    "David Anderson",
    "David Williams",
  ];
  
  // Find rules with findings and calculate their density
  const rulesWithFindings = allRules
    .map(rule => {
      const scans = SCAN_HISTORY.filter(scan => 
        scan.ruleFindings.some(rf => rf.ruleId === rule.id)
      );
      const totalCount = scans.reduce((sum, scan) => {
        const finding = scan.ruleFindings.find(rf => rf.ruleId === rule.id);
        return sum + (finding?.count || 0);
      }, 0);
      
      return {
        rule,
        scanCount: scans.length,
        totalCount,
        hasDensity: scans.length >= 3, // At least 3 scans with findings
      };
    })
    .filter(r => r.totalCount > 0);
  
  // Separate into high-density (good for demos) and low-density rules
  const highDensityRules = rulesWithFindings.filter(r => r.hasDensity);
  const lowDensityRules = rulesWithFindings.filter(r => !r.hasDensity);
  
  // Find rules with 0 findings
  const rulesWithZeroFindings = allRules.filter(
    rule => !rulesWithFindings.some(r => r.rule.id === rule.id)
  );
  
  // TIER 1: Mute 50% of high-density rules (these are demo-ready!)
  // Bias these to be more recent (within last 60 days)
  const highDensityToMute = highDensityRules
    .filter(() => Math.random() < 0.5)
    .slice(0, Math.min(8, highDensityRules.length)); // Cap at 8 for variety
  
  highDensityToMute.forEach((ruleData) => {
    // Find the date range of findings for this rule
    const findingDates = SCAN_HISTORY
      .filter(scan => scan.ruleFindings.some(rf => rf.ruleId === ruleData.rule.id))
      .map(scan => scan.timestamp)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (findingDates.length > 0) {
      const oldestFinding = findingDates[0];
      const newestFinding = findingDates[findingDates.length - 1];
      
      // Mute somewhere between 40% and 80% of the way through the finding history
      // This ensures plenty of findings before the mute
      const range = newestFinding.getTime() - oldestFinding.getTime();
      const muteOffset = range * (0.4 + Math.random() * 0.4);
      const muteTime = new Date(oldestFinding.getTime() + muteOffset);
      
      // Bias toward more recent mutes (50% chance to move mute to last 60 days)
      if (Math.random() < 0.5) {
        const daysAgoMax = 60;
        const daysAgoMin = 20;
        const daysAgo = daysAgoMin + Math.floor(Math.random() * (daysAgoMax - daysAgoMin));
        const recentMuteTime = new Date(now);
        recentMuteTime.setDate(recentMuteTime.getDate() - daysAgo);
        recentMuteTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
        
        // Only use recent time if it still has some findings before it
        const findingsBeforeRecent = findingDates.filter(d => d < recentMuteTime);
        if (findingsBeforeRecent.length >= 2) {
          muteTime.setTime(recentMuteTime.getTime());
        }
      }
      
      muteTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
      
      muteEvents.push({
        ruleId: ruleData.rule.id,
        timestamp: muteTime,
        mutedBy: users[Math.floor(Math.random() * users.length)],
      });
    }
  });
  
  // TIER 2: Mute some low-density rules with findings (less interesting for demos)
  const lowDensityToMute = lowDensityRules.filter(() => Math.random() < 0.15);
  
  lowDensityToMute.forEach((ruleData) => {
    const findingDates = SCAN_HISTORY
      .filter(scan => scan.ruleFindings.some(rf => rf.ruleId === ruleData.rule.id))
      .map(scan => scan.timestamp)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (findingDates.length > 0) {
      const oldestFinding = findingDates[0];
      const newestFinding = findingDates[findingDates.length - 1];
      const range = newestFinding.getTime() - oldestFinding.getTime();
      const muteOffset = range * (0.25 + Math.random() * 0.5);
      const muteTime = new Date(oldestFinding.getTime() + muteOffset);
      muteTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
      
      muteEvents.push({
        ruleId: ruleData.rule.id,
        timestamp: muteTime,
        mutedBy: users[Math.floor(Math.random() * users.length)],
      });
    }
  });
  
  // TIER 3: Mute ~75% of rules with zero findings
  const zeroFindingsToMute = rulesWithZeroFindings.filter(() => Math.random() < 0.75);
  
  zeroFindingsToMute.forEach((rule) => {
    // Rules without findings: mute randomly in past 365 days
    const daysAgo = Math.floor(Math.random() * 365) + 1;
    const muteTime = new Date(now);
    muteTime.setDate(muteTime.getDate() - daysAgo);
    muteTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
    
    muteEvents.push({
      ruleId: rule.id,
      timestamp: muteTime,
      mutedBy: users[Math.floor(Math.random() * users.length)],
    });
  });
  
  return muteEvents;
}

export const RULE_MUTES = generateMuteEvents();

// Apply mute logic to scan history:
// 1. Close all findings that occurred BEFORE the mute
// 2. Remove all findings that occurred AFTER the mute (rule stops detecting)
RULE_MUTES.forEach(mute => {
  SCAN_HISTORY.forEach(scan => {
    const findingIndex = scan.ruleFindings.findIndex(rf => rf.ruleId === mute.ruleId);
    
    if (findingIndex !== -1) {
      if (scan.timestamp <= mute.timestamp) {
        // Finding occurred before or at mute time: close it
        scan.ruleFindings[findingIndex].status = "closed";
      } else {
        // Finding occurred after mute: remove it (rule was muted, shouldn't have findings)
        scan.ruleFindings.splice(findingIndex, 1);
      }
    }
  });
});

// Helper to check if a rule is currently muted
export function isRuleMuted(ruleId: string): boolean {
  return RULE_MUTES.some(mute => mute.ruleId === ruleId);
}

// Helper to get mute event for a rule
export function getMuteEventForRule(ruleId: string): RuleMuteEvent | undefined {
  return RULE_MUTES.find(mute => mute.ruleId === ruleId);
}