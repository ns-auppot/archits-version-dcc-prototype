// ── Policies Page — all policies with enable/disable toggle ────────────────────────
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from "lucide-react";
import { RISK_TYPES } from "../../shared/risk-rules";
import type { RiskRule, RiskTypeDef } from "../../shared/risk-rules";
import { useDisabledRules } from "../../shared/disabled-rules-store";
import { DisablePolicyModal } from "./DisablePolicyModal";
import { EnablePolicyModal } from "./EnablePolicyModal";

// ── Search icon SVG paths (from Figma design system) ─────────────────────────
const SVG_SEARCH_CIRCLE = "M5.95833 10.2917C8.35157 10.2917 10.2917 8.35157 10.2917 5.95833C10.2917 3.5651 8.35157 1.625 5.95833 1.625C3.5651 1.625 1.625 3.5651 1.625 5.95833C1.625 8.35157 3.5651 10.2917 5.95833 10.2917Z";
const SVG_SEARCH_LINE   = "M11.375 11.375L9.04583 9.04583";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlatRuleEntry {
  rule: RiskRule;
  riskType: RiskTypeDef;
  globalIndex: number;
}

type SortCol = "name" | "type" | "engine" | "statusChange" | "status";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: Array<{ value: SortCol; label: string }> = [
  { value: "name",         label: "Risk Policy" },
  { value: "type",         label: "Risk Type" },
  { value: "engine",       label: "Policy Engine" },
  { value: "statusChange", label: "Last Status Change" },
  { value: "status",       label: "Status" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSortDate(str: string | undefined): number {
  if (!str) return -Infinity;
  const d = new Date(str);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
}

// ── SearchIcon — reusable Figma-matched SVG ───────────────────────────────────
function SearchIcon({ color = "#64748B" }: { color?: string }) {
  return (
    <svg className="shrink-0" width="13" height="13" fill="none" viewBox="0 0 13 13">
      <path d={SVG_SEARCH_CIRCLE} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
      <path d={SVG_SEARCH_LINE}   stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
    </svg>
  );
}

// ── Sort Dropdown ─────────────────────────────────────────────────────────────

interface SortDropdownProps {
  currentCol: SortCol;
  currentDir: SortDir;
  onSelect: (col: SortCol) => void;
}

function SortDropdown({ currentCol, currentDir, onSelect }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger — bg:#f1f5f9, border: rgba(0,0,0,0.1), as in Figma */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-1.5 px-3 rounded-md"
        style={{ height: 32, fontSize: "12px", background: "#f1f5f9", color: "#64748b" }}
      >
        <span aria-hidden="true" className="absolute inset-0 rounded-md pointer-events-none" style={{ border: "1px solid rgba(0,0,0,0.1)" }} />
        <span>Sort by</span>
        {/* Chevron — matches Figma vector */}
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="#64748B" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 rounded-lg overflow-hidden"
          style={{
            minWidth: 210,
            background: "#f1f5f9",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
            zIndex: 100,
          }}
        >
          {SORT_OPTIONS.map(opt => {
            const isActive = currentCol === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onSelect(opt.value); setOpen(false); }}
                className="w-full text-left flex items-center justify-between transition-colors hover:bg-white/60"
                style={{
                  height: 34,
                  paddingLeft: 12,
                  paddingRight: 12,
                  fontSize: "12px",
                  color: "#1e293b",
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? "rgba(255,255,255,0.45)" : "transparent",
                }}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {currentDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PoliciesPage() {
  const navigate = useNavigate();
  const { isRuleFullyDisabled, disableRuleFull, enableRule, getStatusChange } = useDisabledRules();

  // ── Modal state ──
  const [disableModal, setDisableModal] = useState<{ rule: RiskRule; riskType: RiskTypeDef } | null>(null);
  const [enableModal,  setEnableModal]  = useState<{ rule: RiskRule; riskType: RiskTypeDef } | null>(null);

  // ── Sort state ──
  const [sortCol, setSortCol] = useState<SortCol>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Search state ──
  const [searchText,     setSearchText]     = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function handleSortClick(col: SortCol) {
    if (col === sortCol) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function handleSortSelect(col: SortCol) {
    if (col === sortCol) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function handleSearchClick() {
    setSearchExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleSearchBlur() {
    if (!searchText) setSearchExpanded(false);
  }

  function handleSearchClear() {
    setSearchText("");
    setSearchExpanded(false);
  }

  // ── Build flat list of all policies ──
  const flatRules = useMemo<FlatRuleEntry[]>(() => {
    let idx = 0;
    const result: FlatRuleEntry[] = [];
    for (const rt of RISK_TYPES) {
      for (const rule of rt.rules) {
        result.push({
          rule,
          riskType: rt,
          globalIndex: idx,
        });
        idx++;
      }
    }
    return result;
  }, []);

  // ── Step 1: Sort ──
  const sorted = useMemo(() => {
    const copy = [...flatRules];
    copy.sort((a, b) => {
      let cmp = 0;
      const aDisabled = isRuleFullyDisabled(a.rule.id);
      const bDisabled = isRuleFullyDisabled(b.rule.id);
      const aSC = getStatusChange(a.rule.id);
      const bSC = getStatusChange(b.rule.id);

      switch (sortCol) {
        case "name":
          cmp = a.rule.name.localeCompare(b.rule.name); break;
        case "type":
          cmp = a.riskType.label.localeCompare(b.riskType.label); break;
        case "engine":
          cmp = a.rule.policyEngine.localeCompare(b.rule.policyEngine); break;
        case "statusChange": {
          if (!aSC && bSC) return 1;
          if (aSC && !bSC) return -1;
          cmp = parseSortDate(aSC?.changedAt) - parseSortDate(bSC?.changedAt); break;
        }
        case "status":
          cmp = Number(aDisabled) - Number(bDisabled); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [flatRules, sortCol, sortDir, isRuleFullyDisabled, getStatusChange]);

  // ── Step 2: Filter by search ──
  const displayed = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(e =>
      e.rule.name.toLowerCase().includes(q) ||
      (e.rule.description ?? "").toLowerCase().includes(q) ||
      e.riskType.label.toLowerCase().includes(q) ||
      e.rule.policyEngine.toLowerCase().includes(q)
    );
  }, [sorted, searchText]);

  const totalRules    = flatRules.length;
  const disabledCount = flatRules.filter(e => isRuleFullyDisabled(e.rule.id)).length;

  // ── Column header button ──
  function ColHeader({ col, label, pink }: { col: SortCol; label: string; pink?: boolean }) {
    const active = sortCol === col;
    const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
      <button
        onClick={() => handleSortClick(col)}
        className="flex items-center gap-1 w-full text-left px-4 py-2.5 transition-colors hover:bg-muted/60"
        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em" }}
      >
        <span style={{ color: pink ? "#f472b6" : active ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}>
          {label}
        </span>
        <Icon
          size={10}
          style={{
            color: pink ? "rgba(244,114,182,0.5)" : active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
            flexShrink: 0,
          }}
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Sub-header ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 border-b"
        style={{ height: 44, borderColor: "var(--color-border)", background: "var(--color-card)" }}
      >
        <button
          onClick={() => navigate("/risk")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <ArrowLeft size={13} />
          Back to Risk
        </button>
        <span className="text-border" style={{ fontSize: "16px" }}>|</span>
        <span style={{ fontSize: "13px", fontWeight: 500 }}>Risk Policies</span>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Toolbar: count + sort + search ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-3 px-1">

          {/* Left: n policies + disabled info */}
          <span style={{ fontSize: "12px", fontWeight: 600 }}>
            {displayed.length} polic{displayed.length !== 1 ? "ies" : "y"}
          </span>
          {disabledCount > 0 && (
            <span
              className="rounded-full px-2"
              role="status"
              aria-label={`${disabledCount} ${disabledCount === 1 ? "policy" : "policies"} disabled`}
              style={{ fontSize: "11px", background: "rgba(249,115,22,0.12)", color: "#f97316" }}
            >
              {disabledCount} Disabled
            </span>
          )}
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Disabled policies are not run and generate no new findings.
          </p>

          {/* Right: Sort + Search */}
          <div className="ml-auto flex items-center gap-1.5">

            <SortDropdown
              currentCol={sortCol}
              currentDir={sortDir}
              onSelect={handleSortSelect}
            />

            {/* Search: collapsed = button, expanded = input */}
            {searchExpanded ? (
              <div className="relative flex items-center">
                {/* Icon inside input */}
                <span className="absolute left-2.5 pointer-events-none">
                  <SearchIcon />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  onBlur={handleSearchBlur}
                  placeholder="Search"
                  className="pl-8 pr-7 rounded-md outline-none"
                  style={{
                    height: 32,
                    width: 200,
                    fontSize: "12px",
                    background: "#f1f5f9",
                    border: "1px solid rgba(0,0,0,0.1)",
                    color: "#1e293b",
                  }}
                />
                {searchText && (
                  <button
                    onMouseDown={e => { e.preventDefault(); handleSearchClear(); }}
                    className="absolute right-2"
                    style={{ color: "#64748b" }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleSearchClick}
                className="relative flex items-center gap-1.5 px-3 rounded-md"
                style={{ height: 32, fontSize: "12px", background: "#f1f5f9", color: "#64748b" }}
              >
                <span aria-hidden="true" className="absolute inset-0 rounded-md pointer-events-none" style={{ border: "1px solid rgba(0,0,0,0.1)" }} />
                <SearchIcon />
                <span>Search</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>

          {/* Column headers */}
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: "120px 3fr 1.2fr 1fr 1.4fr",
              borderColor: "var(--color-border)",
              background: "var(--color-muted)",
            }}
          >
            <ColHeader col="status"       label="Status" />
            <ColHeader col="name"         label="Risk Policy" />
            <ColHeader col="type"         label="Risk Type" />
            <ColHeader col="engine"       label="Policy Engine" pink />
            <ColHeader col="statusChange" label="Last Status Change" />
          </div>

          {/* Rows */}
          {displayed.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ background: "var(--color-card)" }}
            >
              <Search size={24} className="text-muted-foreground opacity-40" />
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                No policies match &ldquo;{searchText.trim()}&rdquo;
              </p>
              <button
                onClick={handleSearchClear}
                className="text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontSize: "12px", textDecoration: "underline" }}
              >
                Clear search
              </button>
            </div>
          ) : (
            displayed.map((entry, rowIdx) => {
              const { rule, riskType } = entry;
              const isDisabled = isRuleFullyDisabled(rule.id);
              const sc = getStatusChange(rule.id);

              return (
                <div
                  key={rule.id}
                  className="grid border-b items-center transition-colors hover:bg-muted/50"
                  style={{
                    gridTemplateColumns: "120px 3fr 1.2fr 1fr 1.4fr",
                    borderColor: "var(--color-border)",
                    opacity: isDisabled ? 0.72 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {/* Status toggle */}
                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        if (isDisabled) {
                          setEnableModal({ rule, riskType });
                        } else {
                          setDisableModal({ rule, riskType });
                        }
                      }}
                      title={isDisabled ? "Click to enable policy" : "Click to disable policy"}
                      className="relative flex-shrink-0 focus:outline-none"
                      style={{ width: 36, height: 20 }}
                    >
                      <span
                        className="absolute inset-0 rounded-full transition-colors duration-200"
                        style={{ background: isDisabled ? "var(--color-muted)" : "var(--color-primary)" }}
                      />
                      <span
                        className="absolute top-0.5 rounded-full bg-white shadow transition-all duration-200"
                        style={{ width: 16, height: 16, left: isDisabled ? 2 : "calc(100% - 18px)" }}
                      />
                    </button>
                  </div>

                  {/* Risk Policy */}
                  <div className="px-4 py-3">
                    <p style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.4 }}>{rule.name}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "10px", lineHeight: 1.5 }}>{rule.description ?? "—"}</p>
                  </div>

                  {/* Risk Type */}
                  <div className="px-4 py-3">
                    <span style={{ fontSize: "12px" }}>
                      {riskType.label}
                    </span>
                  </div>

                  {/* Policy Engine — pink */}
                  <div className="px-4 py-3">
                    <span style={{ fontSize: "12px", color: "#f472b6" }}>
                      {rule.policyEngine}
                    </span>
                  </div>

                  {/* Last Status Change */}
                  <div className="px-4 py-3">
                    {sc ? (
                      <>
                        <p style={{ fontSize: "12px", lineHeight: 1.5 }}>{sc.changedAt}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "10px" }}>
                          {sc.action === "disabled" ? "Disabled" : "Enabled"} by {sc.changedBy}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground" style={{ fontSize: "12px" }}>—</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Disable modal ──────────────────────────────────────────────────────── */}
      {disableModal && (
        <DisablePolicyModal
          mode="full"
          rule={disableModal.rule}
          riskType={disableModal.riskType}
          onConfirm={() => {
            disableRuleFull(disableModal.rule, disableModal.riskType.label, disableModal.riskType.fg);
            setDisableModal(null);
          }}
          onClose={() => setDisableModal(null)}
        />
      )}

      {/* ── Enable modal ───────────────────────────────────────────────────────── */}
      {enableModal && (
        <EnablePolicyModal
          rule={enableModal.rule}
          riskType={enableModal.riskType}
          onConfirm={() => {
            enableRule(enableModal.rule.id);
            setEnableModal(null);
          }}
          onClose={() => setEnableModal(null)}
        />
      )}
    </div>
  );
}
