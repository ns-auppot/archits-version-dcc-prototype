import { useState, useMemo } from "react";
import {
  Search, ExternalLink, Info, Check, X, ArrowLeft,
  ArrowRight, Save, CheckCircle, AlertTriangle,
} from "lucide-react";
import { DLP_PROFILES, CATEGORY_LABELS, ALL_CATEGORIES } from "./wizard-data";

interface DiscoveryProfilePageProps {
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  savedSnapshot: string[] | null;
  onSave: (ids: string[]) => void;
  setupActive: boolean;
  onBackToHub: () => void;
}

const catColors: Record<string, string> = {
  "cat-pii": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "cat-spii": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "cat-pci": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "cat-phi": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "cat-pai": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "cat-pfi": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "cat-psi": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "cat-bii": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "cat-code": "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
  "cat-cred": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

function CategoryPill({ cat }: { cat: string }) {
  const meta = CATEGORY_LABELS[cat];
  if (!meta) return null;
  const color = catColors[meta.cls] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${color}`} title={meta.full}>
      {meta.label}
    </span>
  );
}

export function DiscoveryProfilePage({
  selectedIds, onSelectedChange, savedSnapshot, onSave,
  setupActive, onBackToHub,
}: DiscoveryProfilePageProps) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [filterKind, setFilterKind] = useState("All");
  const [openInProgress, setOpenInProgress] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const defaultIds = useMemo(() => DLP_PROFILES.filter((p) => p.defaultOn).map((p) => p.id), []);
  const [minError, setMinError] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: DLP_PROFILES.length };
    ALL_CATEGORIES.forEach((c) => { counts[c] = 0; });
    DLP_PROFILES.forEach((p) => p.cats.forEach((c) => { counts[c] = (counts[c] || 0) + 1; }));
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DLP_PROFILES.filter((p) => {
      if (activeCat !== "All" && !p.cats.includes(activeCat)) return false;
      if (filterKind === "Predefined" && p.kind !== "predefined") return false;
      if (filterKind === "Custom" && p.kind !== "custom") return false;
      if (filterKind === "Selected" && !selectedIds.includes(p.id)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.desc.toLowerCase().includes(q) && !p.cats.some((c) => c.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, activeCat, filterKind, selectedIds]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) {
        setMinError(true);
        setTimeout(() => setMinError(false), 2800);
        return;
      }
      onSelectedChange(selectedIds.filter((x) => x !== id));
    } else {
      setMinError(false);
      onSelectedChange([...selectedIds, id]);
    }
  }

  const hasChanges = useMemo(() => {
    if (!savedSnapshot) return selectedIds.length > 0;
    return [...selectedIds].sort().join(",") !== [...savedSnapshot].sort().join(",");
  }, [selectedIds, savedSnapshot]);

  function selectAllVisible() {
    const ids = new Set([...selectedIds, ...filtered.map((p) => p.id)]);
    onSelectedChange([...ids]);
  }
  function resetToDefaults() {
    onSelectedChange([...defaultIds]);
  }

  function handleSave() {
    if (selectedIds.length === 0) {
      setMinError(true);
      setTimeout(() => setMinError(false), 2800);
      return;
    }
    onSave([...selectedIds]);
    setToast(`Discovery profile saved · ${selectedIds.length} DLP profiles active`);
    setTimeout(() => setToast(null), 2800);
  }

  const coveredCats = useMemo(() => {
    const set = new Set<string>();
    selectedIds.forEach((id) => {
      const p = DLP_PROFILES.find((x) => x.id === id);
      if (p) p.cats.forEach((c) => set.add(c));
    });
    return [...set];
  }, [selectedIds]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Discovery Profile</h1>
            <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
              Choose the DLP profiles used to classify data across every connected store.
              This is a tenant-wide setting — it applies to all current and future scans.
            </p>
          </div>
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 bg-transparent cursor-pointer transition-colors dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={() => setOpenInProgress(true)}
          >
            <ExternalLink size={13} /> Manage DLP profiles in Netskope console
          </button>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 mb-4 dark:bg-blue-900/10 dark:border-blue-800/40">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
          <div className="text-[13px] text-slate-600 dark:text-slate-300">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Smart defaults applied</div>
            <strong>DLP-PII</strong>, <strong>DLP-PCI</strong> and <strong>DLP-PHI</strong> are
            pre-selected to cover the most common regulated data types. You can change this selection.
            At least one profile must remain active. Add more profiles below to broaden
            coverage — credentials, source code, regional identifiers, or your own custom profiles.
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-6 min-h-0 overflow-hidden">
        {/* Main: profile list */}
        <div className="flex-1 flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <Search size={14} className="text-slate-400" />
              <input
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder-slate-400 dark:text-slate-200"
                placeholder="Search DLP profiles by name, description, or data category…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${
                filterKind === "Selected"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                  : "bg-transparent text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
              onClick={() => setFilterKind(filterKind === "Selected" ? "All" : "Selected")}
            >
              Selected <span className="px-1 rounded bg-slate-100 text-[10px] dark:bg-slate-800">{selectedIds.length}</span>
            </button>
            <select
              className="px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 bg-transparent text-slate-600 cursor-pointer dark:text-slate-300 dark:border-slate-700 dark:bg-slate-900"
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
            >
              <option>All</option>
              <option>Predefined</option>
              <option>Custom</option>
            </select>
          </div>

          <div className="flex gap-1.5 px-4 py-2.5 border-b border-slate-100 flex-wrap dark:border-slate-800">
            <button
              className={`flex items-center gap-1 h-6 px-2.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                activeCat === "All"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                  : "bg-transparent text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700"
              }`}
              onClick={() => setActiveCat("All")}
            >
              All categories <span className="px-1 rounded bg-slate-100 text-[10px] dark:bg-slate-800">{categoryCounts.All}</span>
            </button>
            {ALL_CATEGORIES.map((c) => (
              <button
                key={c}
                className={`flex items-center gap-1 h-6 px-2.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                  activeCat === c
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                    : "bg-transparent text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700"
                }`}
                onClick={() => setActiveCat(c)}
                title={CATEGORY_LABELS[c].full}
              >
                <CategoryPill cat={c} />
                <span className="px-1 rounded bg-slate-100 text-[10px] dark:bg-slate-800">{categoryCounts[c] || 0}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center px-4 py-2 border-b border-slate-50 text-[11px] text-slate-500 dark:border-slate-800">
            <span>Showing {filtered.length} of {DLP_PROFILES.length} profiles</span>
            <span className="ml-auto flex gap-3.5">
              <button className="text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer text-[11px]" onClick={selectAllVisible}>Select all visible</button>
              <button className="text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer text-[11px]" onClick={resetToDefaults}>Clear all</button>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-[13px] text-slate-400">No DLP profiles match these filters.</div>
            )}
            {filtered.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                    isSelected ? "bg-blue-50/40 dark:bg-blue-950/10" : ""
                  }`}
                  onClick={() => toggle(p.id)}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                      isSelected
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                      {p.name}
                      {p.defaultOn && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Smart default
                        </span>
                      )}
                      {p.kind === "custom" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5 dark:text-slate-400">{p.desc}</div>
                  </div>
                  <div className="flex gap-1 shrink-0 mt-0.5">
                    {p.cats.map((c) => <CategoryPill key={c} cat={c} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary side panel */}
        <div className="w-72 shrink-0">
          <div className="sticky top-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current selection</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedIds.length}</span>
              <span className="text-[12px] text-slate-500">DLP profiles active</span>
            </div>

            <hr className="my-3 border-slate-100 dark:border-slate-800" />

            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Data coverage</div>
            <div className="flex flex-wrap gap-1">
              {coveredCats.length === 0 && <span className="text-[11px] text-slate-400">No categories yet.</span>}
              {coveredCats.map((c) => <CategoryPill key={c} cat={c} />)}
            </div>

            <hr className="my-3 border-slate-100 dark:border-slate-800" />

            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Selected profiles</div>
            <div className="max-h-64 overflow-y-auto -mx-2 px-2">
              {selectedIds.length === 0 && <div className="text-[11px] text-slate-400">None selected yet.</div>}
              {selectedIds.map((id) => {
                const p = DLP_PROFILES.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center justify-between py-1 text-[12px]">
                    <div className="flex items-center gap-1.5 min-w-0 text-slate-700 dark:text-slate-300">
                      <span className="truncate">{p.name}</span>
                    </div>
                    <button
                      className="p-0.5 rounded text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer dark:hover:text-slate-300"
                      onClick={(e) => { e.stopPropagation(); toggle(id); }}
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            <hr className="my-3 border-slate-100 dark:border-slate-800" />
            <div className="text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
              Changes apply to all data stores on the next scan. Active scans complete with the previous configuration.
            </div>
          </div>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <span className="text-[12px] text-slate-500 flex-1 dark:text-slate-400">
          {hasChanges ? (
            <><span className="text-blue-500 font-semibold">● </span>You have unsaved changes</>
          ) : savedSnapshot ? (
            "Profile saved · no changes"
          ) : (
            "Smart defaults applied · review and save to confirm"
          )}
        </span>
        {setupActive && (
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:hover:bg-slate-800"
            onClick={onBackToHub}
          >
            <ArrowLeft size={13} /> Back to Setup Guide
          </button>
        )}
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 bg-transparent cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default dark:text-slate-300 dark:border-slate-600"
          onClick={resetToDefaults}
          disabled={selectedIds.length === defaultIds.length}
        >
          Reset to defaults
        </button>
        <button
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default"
          onClick={handleSave}
          disabled={!hasChanges && !!savedSnapshot}
        >
          <Save size={13} /> Save discovery profile
        </button>
      </div>

      {openInProgress && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-[13px] shadow-lg cursor-pointer z-50"
          onClick={() => setOpenInProgress(false)}
        >
          <ExternalLink size={14} />
          <span>Opening Netskope console DLP page in a new tab… (mock)</span>
          <span className="text-[10px] text-slate-400 ml-2">click to dismiss</span>
        </div>
      )}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-[13px] shadow-lg z-50"
          style={{ bottom: openInProgress ? 76 : 24 }}
        >
          <CheckCircle size={14} className="text-green-400" />
          <span>{toast}</span>
        </div>
      )}
      {minError && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-[13px] shadow-lg z-50"
        >
          <AlertTriangle size={14} />
          <span>At least one DLP profile must be selected</span>
        </div>
      )}
    </div>
  );
}
