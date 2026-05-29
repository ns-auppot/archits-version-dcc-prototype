// ── Disabled Rules — data model, context, and helpers ───────────────────────────
import { createElement, createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { RiskRule } from "./risk-rules";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DisabledRule {
  ruleId: string;
  ruleName: string;
  ruleTypeLabel: string;
  ruleTypeFg: string;
  disabledAt: string;
  disabledBy: string;
  disableType: "full";
  conditions: [];
}

/** Tracks the most recent enable/disable action for a rule */
export interface RuleStatusChange {
  changedAt: string;
  changedBy: string;
  action: "enabled" | "disabled";
}

// ── Accepted Scan Risk ────────────────────────────────────────────────────────
// Distinct from disabling a rule: this is an explicit risk acceptance decision
// for a batch of findings from a specific scan run. It creates an audit record
// with rationale, owner, and optional expiry.

export interface AcceptedScanRisk {
  /** Composite key: `${scanId}:${riskTypeId}` */
  id: string;
  scanId: string;
  scanType: string;
  scanDate: string;
  riskTypeId: string;
  riskTypeLabel: string;
  riskTypeFg: string;
  /** Active finding count at the time of acceptance */
  findingCount: number;
  acceptedAt: string;
  acceptedBy: string;
  rationale: string;
  /** Optional ISO date string — after this date the acceptance is flagged for review */
  expiresAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNow(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const DAVID_NAMES = [
  "David Chen", "David Martinez", "David Kim", "David Osei", "David Park",
];
let davidIdx = 0;
function nextDavid() {
  return DAVID_NAMES[davidIdx++ % DAVID_NAMES.length];
}

// ── Seed mock data ────────────────────────────────────────────────────────────

const SEED_DISABLED: DisabledRule[] = [
  {
    ruleId: "r-ex-03",
    ruleName: "Exfiltration of PII to Personal Webmail",
    ruleTypeLabel: "Data Exfiltration",
    ruleTypeFg: "#ef4444",
    disabledAt: "Mar 4, 2026",
    disabledBy: "David Martinez",
    disableType: "full",
    conditions: [],
  },
  {
    ruleId: "r-cg-13",
    ruleName: "SMBv1 Protocol Enabled (Legacy)",
    ruleTypeLabel: "Compliance / Governance",
    ruleTypeFg: "#14b8a6",
    disabledAt: "Feb 25, 2026",
    disabledBy: "David Kim",
    disableType: "full",
    conditions: [],
  },
];

/** Seed the status-change log from the two pre-disabled rules */
const SEED_STATUS_CHANGES: Record<string, RuleStatusChange> = {
  "r-ex-03": { changedAt: "Mar 4, 2026",  changedBy: "David Martinez", action: "disabled" },
  "r-cg-13": { changedAt: "Feb 25, 2026", changedBy: "David Kim",      action: "disabled" },
};

const SEED_ACCEPTED_SCAN_RISKS: AcceptedScanRisk[] = [
  {
    id: "scan-001:former",
    scanId: "scan-001",
    scanType: "Discovery",
    scanDate: "Jan 15, 2026",
    riskTypeId: "former",
    riskTypeLabel: "Former Employee with Access",
    riskTypeFg: "#ef4444",
    findingCount: 4,
    acceptedAt: "Jan 17, 2026",
    acceptedBy: "David Chen",
    rationale: "All 4 former employee accounts are in the process of being offboarded by IT. Tickets are open. Accepted for 30 days pending IT completion.",
    expiresAt: "Feb 17, 2026",
  },
];

// ── Context ───────────────────────────────────────────────────────────────────

interface DisabledRulesCtxValue {
  disabledRules: DisabledRule[];
  getDisabledRule: (ruleId: string) => DisabledRule | undefined;
  isRuleFullyDisabled: (ruleId: string) => boolean;
  disableRuleFull: (rule: RiskRule, ruleTypeLabel: string, ruleTypeFg: string) => void;
  enableRule: (ruleId: string) => void;
  // Status change log
  statusChanges: Record<string, RuleStatusChange>;
  getStatusChange: (ruleId: string) => RuleStatusChange | undefined;
  // Accepted scan risks
  acceptedScanRisks: AcceptedScanRisk[];
  getAcceptedScanRisk: (id: string) => AcceptedScanRisk | undefined;
  acceptScanRisk: (risk: Omit<AcceptedScanRisk, "id" | "acceptedAt" | "acceptedBy">) => void;
  unacceptScanRisk: (id: string) => void;
}

const DisabledRulesContext = createContext<DisabledRulesCtxValue | null>(null);

export function DisabledRulesProvider({ children }: { children: ReactNode }) {
  const [disabledRules, setDisabledRules] = useState<DisabledRule[]>(SEED_DISABLED);
  const [statusChanges, setStatusChanges] = useState<Record<string, RuleStatusChange>>(SEED_STATUS_CHANGES);
  const [acceptedScanRisks, setAcceptedScanRisks] = useState<AcceptedScanRisk[]>(SEED_ACCEPTED_SCAN_RISKS);

  const getDisabledRule = (ruleId: string) =>
    disabledRules.find(m => m.ruleId === ruleId);

  const isRuleFullyDisabled = (ruleId: string) =>
    disabledRules.some(m => m.ruleId === ruleId && m.disableType === "full");

  const disableRuleFull = (rule: RiskRule, ruleTypeLabel: string, ruleTypeFg: string) => {
    const david = nextDavid();
    const now = formatNow();
    setDisabledRules(prev => {
      if (prev.some(m => m.ruleId === rule.id && m.disableType === "full")) return prev;
      const entry: DisabledRule = {
        ruleId: rule.id, ruleName: rule.name,
        ruleTypeLabel, ruleTypeFg,
        disabledAt: now, disabledBy: david,
        disableType: "full", conditions: [],
      };
      return [...prev.filter(m => m.ruleId !== rule.id), entry];
    });
    setStatusChanges(prev => ({
      ...prev,
      [rule.id]: { changedAt: now, changedBy: david, action: "disabled" },
    }));
  };

  const enableRule = (ruleId: string) => {
    const david = nextDavid();
    const now = formatNow();
    setDisabledRules(prev => prev.filter(m => m.ruleId !== ruleId));
    setStatusChanges(prev => ({
      ...prev,
      [ruleId]: { changedAt: now, changedBy: david, action: "enabled" },
    }));
  };

  const getStatusChange = (ruleId: string) => statusChanges[ruleId];

  const getAcceptedScanRisk = (id: string) =>
    acceptedScanRisks.find(r => r.id === id);

  const acceptScanRisk = (risk: Omit<AcceptedScanRisk, "id" | "acceptedAt" | "acceptedBy">) => {
    const id = `${risk.scanId}:${risk.riskTypeId}`;
    setAcceptedScanRisks(prev => {
      const filtered = prev.filter(r => r.id !== id);
      return [...filtered, {
        ...risk,
        id,
        acceptedAt: formatNow(),
        acceptedBy: nextDavid(),
      }];
    });
  };

  const unacceptScanRisk = (id: string) =>
    setAcceptedScanRisks(prev => prev.filter(r => r.id !== id));

  return createElement(
    DisabledRulesContext.Provider,
    {
      value: {
        disabledRules, getDisabledRule, isRuleFullyDisabled,
        disableRuleFull, enableRule,
        statusChanges, getStatusChange,
        acceptedScanRisks, getAcceptedScanRisk, acceptScanRisk, unacceptScanRisk,
      },
    },
    children,
  );
}

export function useDisabledRules(): DisabledRulesCtxValue {
  const ctx = useContext(DisabledRulesContext);
  if (!ctx) throw new Error("useDisabledRules must be used within DisabledRulesProvider");
  return ctx;
}