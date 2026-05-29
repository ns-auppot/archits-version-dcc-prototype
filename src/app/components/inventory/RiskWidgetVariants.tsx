import React, { useState, useMemo, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { RISK_TYPES, type RiskTypeDef, type RiskRule } from "../../shared/risk-rules";
import { RiskTypeIcon } from "../ui/RiskTypeIcon";
import { WidgetCard } from "../ui/WidgetCard";


interface RiskRow {
  id: string;
  label: string;
  fg: string;
  bg: string;
  sevCounts: Record<string, number>;
  total: number;
}

function useRiskRows(appFilterKey?: string, emptyRisks?: boolean): RiskRow[] {
  return useMemo(() => {
    return RISK_TYPES.map((rt: RiskTypeDef) => {
      const sevCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      let total = 0;
      for (const rule of rt.rules as RiskRule[]) {
        if (appFilterKey && !rule.dataStoreGroups.includes(appFilterKey)) continue;
        sevCounts[rule.severity] = (sevCounts[rule.severity] ?? 0) + rule.findings;
        total += rule.findings;
      }
      return { id: rt.id, label: rt.label, fg: rt.fg, bg: rt.bg, sevCounts, total };
    }).filter((r) => r.total > 0 && !emptyRisks);
  }, [appFilterKey, emptyRisks]);
}

// ═════════════════════════════════════════════════════════════════════════════
//  RisksHero — generic hero header for any managed data store dashboard
// ═════════════════════════════════════════════════════════════════════════════

export interface RisksHeroProps {
  appFilterKey?: string;
  emptyRisks?: boolean;
  pageTitle: string;
  pageSubtitle: string;
  /** Logo element rendered before the title */
  logo: ReactNode;
}

export function RisksHero({
  appFilterKey, emptyRisks, pageTitle, pageSubtitle,
  logo,
}: RisksHeroProps) {
  const navigate = useNavigate();
  const riskRows = useRiskRows(appFilterKey, emptyRisks);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const criticalData = riskRows.slice(0, 5);
  const hoveredCrit = hoveredId ? criticalData.find(r => r.id === hoveredId) ?? null : null;

  const shadowTint = "rgba(100,116,139,";
  const shadowNormal = `0 2px 10px ${shadowTint}0.07), 0 1px 3px ${shadowTint}0.04)`;
  const shadowHover  = `0 8px 20px ${shadowTint}0.12), 0 2px 6px ${shadowTint}0.06)`;

  return (
    <>
      {/* Page header: logo (in bounding box) + title + CTA right-aligned */}
      <div className="flex items-center gap-3 mb-6">
        <div style={{
          width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}>
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-text-bright" style={{ fontSize: "var(--widget-page-title)", fontWeight: 600, lineHeight: 1.2 }}>
            {pageTitle}
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: "var(--widget-page-subtitle)", marginTop: 1 }}>
            {pageSubtitle}
          </p>
        </div>
        <button
          onClick={() => navigate("/risk")}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 hover:underline transition-colors cursor-pointer shrink-0"
          style={{ padding: 0, background: "none", border: "none" }}
        >
          Go to Risk page <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Risk cards or empty placeholder (matched height so dashboard content doesn't shift) */}
      {criticalData.length === 0 ? (
        <div className="mb-10 rounded-xl flex items-center" style={{ padding: "12px 14px", minHeight: 46 }}>
          <span style={{ fontSize: "var(--widget-body)", fontWeight: 500, color: "#64748b" }}>
            No critical risk findings.
          </span>
        </div>
      ) : (
        <div
          className="mb-10"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${criticalData.length}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {criticalData.map((row, i) => {
            const isHov = hoveredId === row.id;

            return (
              <WidgetCard
                key={row.id}
                className="flex items-center gap-3 cursor-pointer border"
                style={{
                  padding: "12px 14px",
                  minWidth: 0,
                  borderColor: isHov ? "var(--primary)" : "var(--border)",
                  boxShadow: isHov ? shadowHover : shadowNormal,
                  transition: "border-color 150ms, box-shadow 200ms, transform 200ms, opacity 400ms",
                  opacity: mounted ? 1 : 0,
                  transform: mounted
                    ? isHov ? "translateY(-2px)" : "translateY(0)"
                    : "translateY(8px)",
                  transitionDelay: mounted ? `${i * 50}ms` : "0ms",
                }}
                onMouseEnter={() => setHoveredId(row.id)}
                onMouseLeave={() => { setHoveredId(null); setCursorPos(null); }}
                onMouseMove={e => setCursorPos({ x: e.clientX, y: e.clientY })}
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("riskType", row.id);
                  if (appFilterKey) params.set("app", appFilterKey);
                  navigate(`/risk?${params.toString()}`);
                }}
              >
                <RiskTypeIcon riskTypeId={row.id} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block text-text-bright" style={{ fontSize: "var(--widget-body)", fontWeight: 500 }}>
                    {row.label}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {row.total > 0 && (
                    <span className="tabular-nums text-text-bright" style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1 }}>
                      {row.total}
                    </span>
                  )}
                </div>
              </WidgetCard>
            );
          })}
        </div>
      )}

      {/* Popover — critical count + new-in-24h explanation */}
      {hoveredCrit && cursorPos && (
        <div
          className="bg-surface-raised border border-border rounded-lg"
          style={{
            position: "fixed",
            left: cursorPos.x + 12,
            top: cursorPos.y + 12,
            zIndex: 9999,
            pointerEvents: "none",
            padding: "7px 10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            minWidth: 160,
          }}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: "var(--color-muted-foreground)" }} />
              <span className="text-muted-foreground" style={{ fontSize: "var(--widget-meta)" }}>Total findings</span>
            </div>
            <span className="text-text-bright tabular-nums" style={{ fontSize: "var(--widget-meta)", fontWeight: 600 }}>
              {hoveredCrit.total}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
