// ── Scan data for David's policy-effectiveness visualizations ─────────────────
// Each ScanInstance is a snapshot of the data security program at scan time.
// `currentFindings` is the active finding count per risk type at that moment
// (open + in-review, not yet remediated). Bubbles grow when drift occurs and
// shrink when owners remediate — giving David a true posture picture over time.

export type ScanType = "Discovery" | "Targeted" | "Ongoing";

export interface ScanInstance {
  id: string;
  type: ScanType;
  /** Short human-readable timestamp */
  timestamp: string;
  /** ISO date for sorting */
  date: string;
  /** Optional scope annotation */
  scope?: string;
  /**
   * Active (non-remediated) finding count per risk type at the time this scan
   * completed. This is what drives bubble size in the timeline.
   */
  currentFindings: Record<string, number>;
  /**
   * Net-new findings discovered in this scan that weren't present in the
   * previous scan (new resource, new violation pattern on existing resource).
   */
  added: Record<string, number>;
  /**
   * Findings that were present in the previous scan but are now gone —
   * either remediated, expired, or de-scoped.
   */
  remediatedSince: Record<string, number>;
}

// ── Narrative ─────────────────────────────────────────────────────────────────
//
//  Jan 15 — Discovery (full environment baseline): First-ever scan establishes
//            the total active risk posture across all six categories.
//
//  Feb 3  — Targeted (prod-data-lake focused): A scoped deep-dive requested by
//            the compliance team. Surfaces stale and over-privilege findings in
//            the data lake that the discovery scan missed at depth.
//
//  Feb 20 — Ongoing (full environment, scheduled): Some owners acted on the
//            discovery report. Overexposed and Stale improve. But Over-Privilege
//            and Compliance are compounding — a signal David needs to investigate.
//
//  Mar 5  — Ongoing (full environment, scheduled): Stale continues to decline
//            (retention policies are working). Over-Privilege reaches its highest
//            point — almost certainly a miscalibrated rule or unresponsive owner.

export const SCAN_HISTORY: ScanInstance[] = [
  {
    id: "scan-001",
    type: "Discovery",
    timestamp: "Jan 15, 2026  09:14",
    date: "2026-01-15",
    scope: "Full environment",
    currentFindings: {
      overexposed:   18,
      exfil:         12,
      overprivilege:  9,
      stale:         14,
      former:         4,
      compliance:    10,
    },
    added: {
      overexposed:   18,
      exfil:         12,
      overprivilege:  9,
      stale:         14,
      former:         4,
      compliance:    10,
    },
    remediatedSince: {
      overexposed:   0,
      exfil:         0,
      overprivilege: 0,
      stale:         0,
      former:        0,
      compliance:    0,
    },
  },
  {
    id: "scan-002",
    type: "Targeted",
    timestamp: "Feb 3, 2026  14:30",
    date: "2026-02-03",
    scope: "prod-data-lake (files modified ≤ 30d)",
    currentFindings: {
      overexposed:   22,
      exfil:         15,
      overprivilege: 13,
      stale:         19,
      former:         4,
      compliance:    12,
    },
    added: {
      overexposed:    7,
      exfil:          4,
      overprivilege:  5,
      stale:          7,
      former:         1,
      compliance:     3,
    },
    remediatedSince: {
      overexposed:    3,
      exfil:          1,
      overprivilege:  1,
      stale:          2,
      former:         1,
      compliance:     1,
    },
  },
  {
    id: "scan-003",
    type: "Ongoing",
    timestamp: "Feb 20, 2026  03:00",
    date: "2026-02-20",
    scope: "Full environment (scheduled)",
    currentFindings: {
      overexposed:   19,
      exfil:         14,
      overprivilege: 17,
      stale:         16,
      former:         3,
      compliance:    14,
    },
    added: {
      overexposed:    2,
      exfil:          1,
      overprivilege:  5,
      stale:          1,
      former:         0,
      compliance:     3,
    },
    remediatedSince: {
      overexposed:    5,
      exfil:          2,
      overprivilege:  1,
      stale:          4,
      former:         1,
      compliance:     1,
    },
  },
  {
    id: "scan-004",
    type: "Ongoing",
    timestamp: "Mar 5, 2026  03:00",
    date: "2026-03-05",
    scope: "Full environment (scheduled)",
    currentFindings: {
      overexposed:   17,
      exfil:         13,
      overprivilege: 21,
      stale:         13,
      former:         3,
      compliance:    16,
    },
    added: {
      overexposed:    1,
      exfil:          0,
      overprivilege:  5,
      stale:          0,
      former:         1,
      compliance:     3,
    },
    remediatedSince: {
      overexposed:    3,
      exfil:          1,
      overprivilege:  1,
      stale:          3,
      former:         1,
      compliance:     1,
    },
  },
];

// ── Running totals per scan for posture trend chart ───────────────────────────

export function computeRunningTotals(
  scans: ScanInstance[],
  riskTypeIds: string[],
): Array<Record<string, string | number>> {
  return scans.map(scan => ({
    scanId: scan.id,
    shortLabel:
      scan.type === "Discovery" ? "Discovery" :
      scan.type === "Targeted"  ? "Targeted"  :
      scan.timestamp.split("  ")[0],
    type: scan.type,
    ...Object.fromEntries(riskTypeIds.map(id => [id, scan.currentFindings[id] ?? 0])),
  }));
}
