import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import {
  Sparkles, X, Clock, ArrowUpRight, Lightbulb, FlaskConical,
  Search, SlidersHorizontal, Plus, ChevronDown, ArrowLeft, ArrowRight,
  Database, HardDrive, Users, Globe, FileText, Server,
  Monitor, AppWindow, MapPin, Tags,
  User, UserCheck, Bot, ShieldOff, Activity, Layers,
} from "lucide-react";
import {
  buildSearchIndex,
  searchInventory,
  type FilterKey,
  type ResultType,
  FILTER_PREDICATES,
  RESULT_TYPE_CATEGORY_FILTER,
} from "./inventory-search-data";

// ── Filter types — shared from inventory-search-data ─────────────────────────
// FilterKey, ResultType, FILTER_PREDICATES, RESULT_TYPE_CATEGORY_FILTER are imported above.

interface FilterOption {
  key: FilterKey;
  label: string;
  icon: React.ReactNode;
}

// ── Inline SVG icons ─────────────────────────��────────────────────────────────

function AppLetterIcon({ letter, color, dark }: { letter: string; color: string; dark?: boolean }) {
  return (
    <div
      className="w-3 h-3 rounded flex items-center justify-center shrink-0"
      style={{ background: color }}
    >
      <span style={{ color: dark ? "#000" : "#fff", fontSize: "6px", fontWeight: 800 }}>{letter}</span>
    </div>
  );
}

function GoogleDriveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L2.5 12H5.5L8 8L10.5 12H13.5L8 2Z" fill="#4285F4" />
      <path d="M2.5 12L5.5 12L4 9.5L2.5 12Z" fill="#0F9D58" />
      <path d="M13.5 12L10.5 12L12 9.5L13.5 12Z" fill="#F4B400" />
    </svg>
  );
}

function AWSIcon() {
  return (
    <div className="w-3 h-3 rounded flex items-center justify-center shrink-0" style={{ background: "#FF9900" }}>
      <span style={{ color: "#fff", fontSize: "5px", fontWeight: 800, letterSpacing: "-0.5px" }}>AWS</span>
    </div>
  );
}

function SharePointIcon() {
  return (
    <div className="w-3 h-3 rounded flex items-center justify-center shrink-0" style={{ background: "#0078D4" }}>
      <span style={{ color: "#fff", fontSize: "6px", fontWeight: 800 }}>S</span>
    </div>
  );
}

function AzureIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M7 2L3 13h3l1.5-2.5L9.5 13H13L7 2Z" fill="#0078D4" opacity="0.85" />
      <path d="M9.5 13H13L10 7.5L9.5 13Z" fill="#0078D4" />
    </svg>
  );
}

interface AppGroup {
  label: string;
  options: FilterOption[];
}

const APPLICATION_GROUPS: AppGroup[] = [
  {
    label: "Managed",
    options: [
      { key: "google-drive", label: "Google Drive", icon: <GoogleDriveIcon /> },
      { key: "sharepoint",   label: "SharePoint",   icon: <SharePointIcon /> },
      { key: "aws",          label: "AWS",           icon: <AWSIcon /> },
      { key: "azure",        label: "Azure",         icon: <AzureIcon /> },
    ],
  },
];

const APPLICATION_OPTIONS: FilterOption[] = APPLICATION_GROUPS.flatMap((g) => g.options);

interface DestGroup {
  label: string;
  key: FilterKey;
  options: FilterOption[];
}

const DESTINATION_GROUPS: DestGroup[] = [
  {
    label: "Unsanctioned Applications",
    key: "unsanctioned-apps",
    options: [
      { key: "chatgpt", label: "ChatGPT", icon: <AppLetterIcon letter="G" color="#10A37F" /> },
      { key: "dropbox", label: "Dropbox", icon: <AppLetterIcon letter="D" color="#0061FF" /> },
    ],
  },
  {
    label: "Sanctioned Applications",
    key: "sanctioned-apps",
    options: [
      { key: "slack",   label: "Slack",           icon: <AppLetterIcon letter="S" color="#4A154B" /> },
      { key: "zoom",    label: "Zoom",            icon: <AppLetterIcon letter="Z" color="#2D8CFF" /> },
      { key: "teams",   label: "Microsoft Teams", icon: <AppLetterIcon letter="M" color="#5558AF" /> },
      { key: "notion",  label: "Notion",          icon: <AppLetterIcon letter="N" color="#ffffff" dark /> },
      { key: "trello",  label: "Trello",          icon: <AppLetterIcon letter="T" color="#0052CC" /> },
      { key: "github",  label: "GitHub",          icon: <AppLetterIcon letter="G" color="#24292F" /> },
      { key: "figma",   label: "Figma",           icon: <AppLetterIcon letter="F" color="#F24E1E" /> },
    ],
  },
  {
    label: "Websites",
    key: "unmanaged-websites",
    options: [
      { key: "filetransfer.io",  label: "filetransfer.io"  },
      { key: "wetransfer.com",   label: "wetransfer.com"   },
      { key: "mega.nz",          label: "mega.nz"          },
      { key: "pastebin.com",     label: "pastebin.com"     },
      { key: "reddit.com",       label: "reddit.com"       },
      { key: "twitter.com",      label: "twitter.com"      },
      { key: "protonmail.com",   label: "protonmail.com"   },
      { key: "chatgpt.com",      label: "chatgpt.com"      },
      { key: "claude.ai",        label: "claude.ai"        },
      { key: "perplexity.ai",    label: "perplexity.ai"    },
      { key: "nordvpn.com",      label: "nordvpn.com"      },
      { key: "torproject.org",   label: "torproject.org"   },
      { key: "hackerone.com",    label: "hackerone.com"    },
      { key: "virustotal.com",   label: "virustotal.com"   },
      { key: "linkedin.com",     label: "linkedin.com"     },
      { key: "youtube.com",      label: "youtube.com"      },
      { key: "medium.com",       label: "medium.com"       },
      { key: "canva.com",        label: "canva.com"        },
      { key: "replit.com",       label: "replit.com"       },
    ],
  },
];

const DESTINATION_OPTIONS: FilterOption[] = [
  ...DESTINATION_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  ...DESTINATION_GROUPS.flatMap((g) => g.options),
];

const IDENTITY_OPTIONS: FilterOption[] = [
  { key: "identity",                       label: "All Identities",       icon: null },
  { key: "identity-internal-user",         label: "Internal User",        icon: null },
  { key: "identity-external-user",         label: "External User",        icon: null },
  { key: "identity-stale",                 label: "Stale Account",        icon: null },
  { key: "identity-active",                label: "Active",               icon: null },
  { key: "identity-unknown-identity",      label: "Unauthenticated",      icon: null },
  { key: "identity-unmapped-local-user",   label: "Unmapped",             icon: null },
  { key: "identity-service-account",       label: "Service Account",      icon: null },
  { key: "identity-connected-app",         label: "Connected App",        icon: null },
];

const OBJECT_TYPE_OPTIONS: FilterOption[] = [
  { key: "sensitive-file",   label: "File",   icon: <FileText size={12} className="text-muted-foreground" /> },
  { key: "sensitive-column", label: "Column", icon: <Database size={12} className="text-muted-foreground" /> },
  { key: "sensitive-others", label: "Others", icon: <HardDrive size={12} className="text-muted-foreground" /> },
];

const OTHER_GROUPS: { label: string; icon: React.ReactNode; options: FilterOption[]; hasSearch?: boolean }[] = [
  { label: "Identity Type",          icon: <Users size={12} className="text-muted-foreground" />,     options: IDENTITY_OPTIONS },
  { label: "Managed Application",   icon: <AppWindow size={12} className="text-muted-foreground" />, options: APPLICATION_OPTIONS, hasSearch: true },
  { label: "Unmanaged Destination", icon: <Globe size={12} className="text-muted-foreground" />,     options: DESTINATION_OPTIONS, hasSearch: true },
];

const SENSITIVE_OBJECTS_OTHER_GROUPS: { label: string; icon: React.ReactNode; options: FilterOption[]; hasSearch?: boolean }[] = [
  { label: "Object type", icon: <Layers size={12} className="text-muted-foreground" />, options: OBJECT_TYPE_OPTIONS },
  ...OTHER_GROUPS,
];

const IDENTITY_NAMES: string[] = [
  "Alice Johnson", "Bob Smith", "Carol White", "David Lee",
  "Emma Wilson", "Frank Chen", "Grace Kim", "Henry Brown",
  "Isabella Martinez", "James Taylor", "Karen Davis", "Liam Anderson",
  "Mia Thompson", "Noah Garcia", "Olivia Harris", "Peter Jackson",
  "Quinn Roberts", "Rachel Turner", "Samuel Clark", "Tina Lewis",
];

const OTHER_ALL_KEY_SET = new Set<FilterKey>([
  ...OTHER_GROUPS.flatMap(g => g.options.map(o => o.key)),
  ...OBJECT_TYPE_OPTIONS.map(o => o.key),
]);

function DataTypeBadge({ acronym, color }: { acronym: string; color: string }) {
  return (
    <div
      className="w-[18px] h-[14px] rounded flex items-center justify-center shrink-0"
      style={{ background: color }}
    >
      <span style={{ color: "#fff", fontSize: "6px", fontWeight: 800, letterSpacing: "-0.3px" }}>{acronym}</span>
    </div>
  );
}

// ── Sensitive Data Type hierarchy ─────────────────────────────────────────────

function toSubKey(name: string): FilterKey {
  return ("sdt-" + name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) as FilterKey;
}

interface SdtCategory { acronym: string; label: string; color: string; types: string[]; }

const SDT_CATEGORIES: SdtCategory[] = [
  { acronym: "PII",  label: "Personally Identifiable Information",          color: "#3b82f6",
    types: ["Personal Names","Email Addresses","Telephone Numbers","Postal Addresses","Birthdates","Gender","Age","Nationality","IP Addresses","MAC Addresses","Domain Names","URI Hosts","UUIDs","Device IDs","Browser Fingerprints","Geolocation Data","Vehicle IDs","Student Records","Education IDs"] },
  { acronym: "SPII", label: "Sensitive Personally Identifiable Information", color: "#ef4444",
    types: ["Social Security Numbers","Driver Licenses","National IDs","Passports","Taxpayer IDs","Voter Registration IDs"] },
  { acronym: "PSI",  label: "Personal Sensitive Information",                color: "#f97316",
    types: ["Ethnicity and Race","Marital Status","Religious Beliefs","Political Opinions","Sexual Orientation","Immigration Status"] },
  { acronym: "PCI",  label: "Payment Card Industry Data",                    color: "#eab308",
    types: ["Payment Cards"] },
  { acronym: "PFI",  label: "Personal Financial Information",                color: "#22c55e",
    types: ["Bank Account Information","Financial IDs","Currency","Securities IDs","Credit Scores","Income Information","Tax Records"] },
  { acronym: "PHI",  label: "Protected Health Information",                  color: "#a855f7",
    types: ["Medical Records","Medical Diagnoses","Healthcare IDs","Healthcare Provider IDs","Health Insurance IDs","Prescription Information","Biometric Data","Genetic Data"] },
  { acronym: "PAI",  label: "Personal Account Information",                  color: "#ec4899",
    types: ["Passwords","Private Keys","Public Keys","Secrets and Tokens","Security Questions","MFA Seeds"] },
  { acronym: "BII",  label: "Business Identifiable Information",             color: "#64748b",
    types: ["Source Code","Company Names","Trade Secrets","Legal Privileges"] },
];

const SDT_CAT_KEYS = new Set<FilterKey>(["pii","spii","psi","pci","pfi","phi","pai","bii"]);
const SDT_SUB_KEY_SET = new Set<FilterKey>(SDT_CATEGORIES.flatMap(cat => cat.types.map(t => toSubKey(t))));

// Flat options for active-chip display
const SDT_ALL_OPTIONS: FilterOption[] = [
  ...SDT_CATEGORIES.map(cat => ({
    key: cat.acronym.toLowerCase() as FilterKey,
    label: cat.acronym,
    icon: <DataTypeBadge acronym={cat.acronym} color={cat.color} />,
  })),
  ...SDT_CATEGORIES.flatMap(cat =>
    cat.types.map(t => ({
      key: toSubKey(t),
      label: t,
      icon: <DataTypeBadge acronym={cat.acronym} color={cat.color} />,
    }))
  ),
];

// All options flat (for lookup)
const ALL_FILTER_OPTIONS: FilterOption[] = [
  ...APPLICATION_OPTIONS,
  ...DESTINATION_OPTIONS,
  ...SDT_ALL_OPTIONS,
  ...IDENTITY_OPTIONS,
];

// ── Result type tabs (filter mode only) ───────────────────────────────────────

const RESULT_TYPE_TABS: { key: ResultType; label: string; icon: React.ReactNode }[] = [
  { key: "data-stores",     label: "Data Store",    icon: <Database size={12} /> },
  { key: "destinations",    label: "Destination",   icon: <Globe size={12} /> },
  { key: "sensitive-files", label: "Sensitive Objects", icon: <Layers size={12} /> },
  { key: "identities",      label: "Identity",      icon: <Users size={12} /> },
];

// ── Sensitive Data Type dropdown ──────────────────────────────────────────────

function SensitiveDataTypeDropdown({
  activeFilters,
  onToggle,
  onBatchSet,
}: {
  activeFilters: FilterKey[];
  onToggle: (key: FilterKey) => void;
  onBatchSet: (add: FilterKey[], remove: FilterKey[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const lowerSearch = search.toLowerCase();

  const isCatActive = (cat: SdtCategory) => activeFilters.includes(cat.acronym.toLowerCase() as FilterKey);

  const isSubChecked = (cat: SdtCategory, sub: string) =>
    isCatActive(cat) || activeFilters.includes(toSubKey(sub));

  const catStatus = (cat: SdtCategory): "checked" | "indeterminate" | "unchecked" => {
    if (isCatActive(cat)) return "checked";
    const checked = cat.types.filter(t => activeFilters.includes(toSubKey(t))).length;
    if (checked === 0) return "unchecked";
    if (checked === cat.types.length) return "checked";
    return "indeterminate";
  };

  const handleCatToggle = (cat: SdtCategory) => {
    const catKey = cat.acronym.toLowerCase() as FilterKey;
    const status = catStatus(cat);
    if (status === "unchecked") {
      const subKeysToRemove = cat.types.map(t => toSubKey(t)).filter(k => activeFilters.includes(k));
      onBatchSet([catKey], subKeysToRemove);
    } else {
      const toRemove = ([catKey, ...cat.types.map(t => toSubKey(t))] as FilterKey[]).filter(k => activeFilters.includes(k));
      onBatchSet([], toRemove);
    }
  };

  const handleSubToggle = (cat: SdtCategory, sub: string) => {
    const catKey = cat.acronym.toLowerCase() as FilterKey;
    const subKey = toSubKey(sub);
    if (isCatActive(cat)) {
      const otherSubs = cat.types.filter(t => t !== sub).map(t => toSubKey(t));
      onBatchSet(otherSubs, [catKey]);
    } else {
      onToggle(subKey);
    }
  };

  const toggleExpand = (acronym: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(acronym) ? n.delete(acronym) : n.add(acronym); return n; });

  const filtered = lowerSearch
    ? SDT_CATEGORIES.map(cat => {
        const catMatch = cat.acronym.toLowerCase().includes(lowerSearch) || cat.label.toLowerCase().includes(lowerSearch);
        const subMatches = cat.types.filter(t => t.toLowerCase().includes(lowerSearch));
        if (!catMatch && subMatches.length === 0) return null;
        return { cat, subs: catMatch ? cat.types : subMatches };
      }).filter(Boolean) as { cat: SdtCategory; subs: string[] }[]
    : SDT_CATEGORIES.map(cat => ({ cat, subs: expanded.has(cat.acronym) ? cat.types : [] }));

  return (
    <div className="flex flex-col" style={{ maxHeight: "340px" }}>
      {/* Search */}
      <div className="px-2.5 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-raised border border-border rounded-lg">
          <Search size={11} className="text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search data types…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ fontSize: "11px" }}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-text-bright transition-colors">
              <X size={10} />
            </button>
          )}
        </div>
      </div>
      {/* List */}
      <div className="overflow-y-auto flex-1 py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-muted-foreground text-center" style={{ fontSize: "11px" }}>
            No results for "{search}"
          </div>
        ) : filtered.map(({ cat, subs }) => {
          const status = catStatus(cat);
          const isExp = !!lowerSearch || expanded.has(cat.acronym);
          return (
            <div key={cat.acronym}>
              {/* Category row */}
              <div className="flex items-start gap-2 px-3 py-[5px] hover:bg-surface-raised transition-colors cursor-default">
                <button
                  type="button"
                  onClick={() => !lowerSearch && toggleExpand(cat.acronym)}
                  className={`shrink-0 mt-0.5 text-muted-foreground transition-colors ${lowerSearch ? "opacity-30 cursor-default" : "hover:text-text-bright"}`}
                  tabIndex={lowerSearch ? -1 : 0}
                >
                  <ChevronDown size={10} className={`transition-transform duration-150 ${isExp ? "" : "-rotate-90"}`} />
                </button>
                <input
                  type="checkbox"
                  checked={status === "checked"}
                  ref={el => { if (el) el.indeterminate = status === "indeterminate"; }}
                  onChange={() => handleCatToggle(cat)}
                  className="w-3 h-3 mt-0.5 rounded accent-primary cursor-pointer shrink-0"
                />
                <span className="flex-1 text-foreground flex items-baseline gap-0" style={{ fontSize: "12px" }}>
                  <span className="font-medium shrink-0 inline-block" style={{ width: "30px" }}>{cat.acronym}</span>
                  <span className="text-muted-foreground">{cat.label}</span>
                </span>
                <span className="text-muted-foreground shrink-0 mt-0.5" style={{ fontSize: "10px" }}>{cat.types.length}</span>
              </div>
              {/* Sub-type rows */}
              {isExp && subs.map(sub => (
                <label
                  key={sub}
                  className="flex items-center gap-2 pr-3 py-1 cursor-pointer hover:bg-surface-raised transition-colors" style={{ paddingLeft: "50px" }}
                >
                  <input
                    type="checkbox"
                    checked={isSubChecked(cat, sub)}
                    onChange={() => handleSubToggle(cat, sub)}
                    className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-foreground/80" style={{ fontSize: "11px" }}>{sub}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Filter pill row (shown in filter mode) ────────────────────────────────────

function FilterPillRow({
  activeFilters,
  onToggle,
  onClearAll,
  onBatchSet,
  resultType,
}: {
  activeFilters: FilterKey[];
  onToggle: (key: FilterKey) => void;
  onClearAll: () => void;
  onBatchSet: (add: FilterKey[], remove: FilterKey[]) => void;
  resultType: ResultType;
}) {
  // For "Data Store" result type, only show Application (Managed only) in Other filters
  const isDataStore = resultType === "data-stores";
  const isDestination = resultType === "destinations";
  const isSensitiveData = resultType === "sensitive-files";
  const isIdentity = resultType === "identities";
  // All modes that use standalone pills instead of the "Other" aggregate grouping
  const isStandaloneMode = isDataStore || isDestination || isSensitiveData || isIdentity;

  const managedAppGroup = APPLICATION_GROUPS[0];
  const dataStoreOtherGroups = [
    { label: "Identity Type", icon: <Users size={12} className="text-muted-foreground" />, options: IDENTITY_OPTIONS },
  ];
  const destinationOtherGroups = [
    { label: "Identity Type", icon: <Users size={12} className="text-muted-foreground" />, options: IDENTITY_OPTIONS },
    { label: "Unmanaged Destination", icon: <Globe size={12} className="text-muted-foreground" />, options: DESTINATION_OPTIONS, hasSearch: true },
  ];
  const sensitiveDataOtherGroups = SENSITIVE_OBJECTS_OTHER_GROUPS;
  const effectiveOtherGroups = isDataStore
    ? dataStoreOtherGroups
    : isDestination
    ? destinationOtherGroups
    : isSensitiveData
    ? sensitiveDataOtherGroups
    : OTHER_GROUPS; // identities use the full OTHER_GROUPS
  const effectiveApplicationGroups = APPLICATION_GROUPS;
  const [sdtOpen, setSdtOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherSearch, setOtherSearch] = useState("");
  const [selectedOtherGroup, setSelectedOtherGroup] = useState<string | null>(null);
  // Standalone pill state (data-store / destination / sensitive-data / identity modes)
  const [standaloneOpen, setStandaloneOpen] = useState<string | null>(null);
  const [standaloneSearch, setStandaloneSearch] = useState("");
  // Identity Name pill state
  const [identityNameOpen, setIdentityNameOpen] = useState(false);
  const [identityNameSearch, setIdentityNameSearch] = useState("");
  const [selectedIdentityName, setSelectedIdentityName] = useState<string | null>(null);
  // Stale Account state
  const [staleAccountValue, setStaleAccountValue] = useState<"yes" | "no" | null>(null);
  // IDP Status state
  const [idpStatusValues, setIdpStatusValues] = useState<string[]>([]);
  // Add filter chip state
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [addFilterSection, setAddFilterSection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSdtOpen(false);
        setOtherOpen(false);
        setOtherSearch("");
        setSelectedOtherGroup(null);
        setStandaloneOpen(null);
        setStandaloneSearch("");
        setIdentityNameOpen(false);
        setIdentityNameSearch("");
        setAddFilterOpen(false);
        setAddFilterSection(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggleSdt = () => {
    setOtherOpen(false);
    setOtherSearch("");
    setSelectedOtherGroup(null);
    setStandaloneOpen(null);
    setStandaloneSearch("");
    setIdentityNameOpen(false);
    setIdentityNameSearch("");
    setAddFilterOpen(false);
    setAddFilterSection(null);
    setSdtOpen((v) => !v);
  };

  const handleToggleStandalone = (label: string) => {
    setSdtOpen(false);
    setOtherOpen(false);
    setOtherSearch("");
    setSelectedOtherGroup(null);
    setIdentityNameOpen(false);
    setIdentityNameSearch("");
    setAddFilterOpen(false);
    setAddFilterSection(null);
    if (standaloneOpen === label) {
      setStandaloneOpen(null);
      setStandaloneSearch("");
    } else {
      setStandaloneOpen(label);
      setStandaloneSearch("");
    }
  };

  const handleToggleOther = () => {
    setSdtOpen(false);
    setStandaloneOpen(null);
    setStandaloneSearch("");
    setIdentityNameOpen(false);
    setIdentityNameSearch("");
    setAddFilterOpen(false);
    setAddFilterSection(null);
    if (otherOpen && selectedOtherGroup === null) {
      setOtherOpen(false);
      setOtherSearch("");
    } else {
      setOtherOpen(true);
      setSelectedOtherGroup(null);
      setOtherSearch("");
    }
  };

  const handleOpenOtherAtGroup = (groupLabel: string) => {
    setSdtOpen(false);
    setStandaloneOpen(null);
    setStandaloneSearch("");
    setIdentityNameOpen(false);
    setIdentityNameSearch("");
    setAddFilterOpen(false);
    setAddFilterSection(null);
    if (otherOpen && selectedOtherGroup === groupLabel) {
      setOtherOpen(false);
      setOtherSearch("");
      setSelectedOtherGroup(null);
    } else {
      setSelectedOtherGroup(groupLabel);
      setOtherOpen(true);
      setOtherSearch("");
    }
  };

  const handleToggleIdentityName = () => {
    setSdtOpen(false);
    setOtherOpen(false);
    setOtherSearch("");
    setSelectedOtherGroup(null);
    setStandaloneOpen(null);
    setStandaloneSearch("");
    setAddFilterOpen(false);
    setAddFilterSection(null);
    setIdentityNameOpen((v) => !v);
    setIdentityNameSearch("");
  };

  const handleToggleAddFilter = () => {
    setSdtOpen(false);
    setOtherOpen(false);
    setOtherSearch("");
    setSelectedOtherGroup(null);
    setStandaloneOpen(null);
    setStandaloneSearch("");
    setIdentityNameOpen(false);
    setIdentityNameSearch("");
    if (addFilterOpen && addFilterSection === null) {
      setAddFilterOpen(false);
    } else {
      setAddFilterOpen(true);
      setAddFilterSection(null);
    }
  };

  const IDP_STATUS_OPTIONS = [
    { key: "Active" },
    { key: "Suspended" },
    { key: "Deprovisioned" },
    { key: "Locked Out" },
    { key: "Password Expired" },
    { key: "Recovery" },
  ];

  // SDT active count: category keys + sub-type keys
  const sdtActiveCount = activeFilters.filter(k => SDT_CAT_KEYS.has(k) || SDT_SUB_KEY_SET.has(k)).length;

  // Per-group Other data with smart display labels
  const otherGroupData = useMemo(() => {
    return effectiveOtherGroups.map((group) => {
      const activeOptions = group.options.filter(o => activeFilters.includes(o.key));
      const activeKeys = activeOptions.map(o => o.key);
      const count = activeKeys.length;
      let displayLabel = "";
      if (count === 1) {
        displayLabel = activeOptions[0].label;
      } else if (count > 1) {
        if (group.label === "Managed Application") {
          const matchingSg = effectiveApplicationGroups.find(sg => {
            const sgKeys = sg.options.map(o => o.key);
            return sgKeys.length === count && activeKeys.every(k => sgKeys.includes(k));
          });
          displayLabel = matchingSg ? matchingSg.label : `${count} selected`;
        } else if (group.label === "Unmanaged Destination") {
          const matchingDg = DESTINATION_GROUPS.find(dg => {
            const dgAllKeys = [dg.key, ...dg.options.map(o => o.key)];
            return activeKeys.every(k => dgAllKeys.includes(k)) && dgAllKeys.every(k => activeKeys.includes(k));
          });
          displayLabel = matchingDg ? matchingDg.label : `${count} selected`;
        } else {
          displayLabel = `${count} selected`;
        }
      }
      return { group, activeKeys, count, displayLabel };
    });
  }, [activeFilters, effectiveOtherGroups, effectiveApplicationGroups]);

  const groupsWithActive = otherGroupData.filter(g => g.count > 0);
  const groupsWithoutActive = otherGroupData.filter(g => g.count === 0);

  return (
    <div ref={dropdownRef} className="relative flex items-center gap-1.5 flex-wrap py-1.5 px-1 min-h-[36px]">
      {/* Active filter chips — suppress SDT and Other keys (shown as aggregate pills) */}
      {activeFilters.map((key) => {
        const opt = ALL_FILTER_OPTIONS.find((o) => o.key === key);
        if (!opt) return null;
        if (SDT_CAT_KEYS.has(key) || SDT_SUB_KEY_SET.has(key)) return null;
        if (OTHER_ALL_KEY_SET.has(key)) return null;
        return (
          <div
            key={key}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-[3px] rounded-full border border-primary/40 bg-primary/10 text-primary shrink-0"
            style={{ fontSize: "12px", fontWeight: 500 }}
          >
            <span className="shrink-0 flex items-center">{opt.icon}</span>
            <span className="ml-0.5">{opt.label}</span>
            <button
              type="button"
              onClick={() => onToggle(key)}
              className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
            >
              <X size={9} />
            </button>
          </div>
        );
      })}

      {/* Picker buttons — outside scroll container so dropdowns aren't clipped */}
      {/* Sensitive Data Type pill */}
      <div className="relative">
        {sdtActiveCount === 0 ? (
          <button
            type="button"
            onClick={handleToggleSdt}
            className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
              sdtOpen
                ? "border-primary/40 text-primary bg-primary/10"
                : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
            }`}
            style={{ fontSize: "12px", fontWeight: 400 }}
          >
            <Plus size={10} />
            Data Type
            <ChevronDown size={10} className={`ml-0.5 opacity-60 transition-transform ${sdtOpen ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
            <button
              type="button"
              onClick={handleToggleSdt}
              className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
              Data Type
              <span className="text-primary/50 mx-0.5">|</span>
              <span className="truncate max-w-[120px]">
                {sdtActiveCount === 1
                  ? (SDT_ALL_OPTIONS.find(o => (SDT_CAT_KEYS.has(o.key) || SDT_SUB_KEY_SET.has(o.key)) && activeFilters.includes(o.key))?.label ?? `${sdtActiveCount} selected`)
                  : `${sdtActiveCount} selected`}
              </span>
              <ChevronDown size={9} className={`ml-0.5 opacity-60 transition-transform ${sdtOpen ? "rotate-180" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => onBatchSet([], activeFilters.filter(k => SDT_CAT_KEYS.has(k) || SDT_SUB_KEY_SET.has(k)))}
              className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
              aria-label="Clear sensitive data type filter"
            >
              <X size={9} />
            </button>
          </div>
        )}

        {sdtOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-96 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-1.5 border-b border-border flex items-center gap-1.5">
              <Tags size={12} className="text-muted-foreground shrink-0" />
              <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Data Type</span>
            </div>
            <SensitiveDataTypeDropdown
              activeFilters={activeFilters}
              onToggle={onToggle}
              onBatchSet={onBatchSet}
            />
          </div>
        )}
      </div>

      {/* Other filters area — standalone pills (data-store / destination / sensitive-data / identity) or aggregate+"+Other" */}
      {isStandaloneMode ? (
        /* ── Standalone mode: all filters as individual standalone pills ── */
        <div className="flex items-center gap-1.5">
          {/* Pass 1: Identity Type only — before Identity Name */}
          {otherGroupData.filter(({ group }) => group.label === "Identity Type").map(({ group, activeKeys, count, displayLabel }) => {
            const isOpen = standaloneOpen === group.label;
            return (
              <div key={group.label} className="relative">
                {count === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleToggleStandalone(group.label)}
                    className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                      isOpen
                        ? "border-primary/40 text-primary bg-primary/10"
                        : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                    }`}
                    style={{ fontSize: "12px", fontWeight: 400 }}
                  >
                    <Plus size={10} />
                    {group.label}
                    <ChevronDown size={10} className={`ml-0.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleToggleStandalone(group.label)}
                      className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      <span className="shrink-0 flex items-center">{group.icon}</span>
                      {group.label}
                      <span className="text-primary/50 mx-0.5">|</span>
                      <span className="truncate max-w-[120px]">{displayLabel}</span>
                      <ChevronDown size={9} className={`ml-0.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBatchSet([], activeKeys)}
                      className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                      aria-label={`Clear ${group.label} filter`}
                    >
                      <X size={9} />
                    </button>
                  </div>
                )}

                {/* Standalone dropdown */}
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
                      <span className="flex items-center gap-1.5 text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>
                        <span className="flex items-center">{group.icon}</span>
                        {group.label}
                      </span>
                    </div>
                    {/* Search (Application only) */}
                    {group.hasSearch && (
                      <div className="px-2.5 pt-2 pb-1">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-raised border border-border rounded-lg">
                          <Search size={11} className="text-muted-foreground shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search…"
                            value={standaloneSearch}
                            onChange={(e) => setStandaloneSearch(e.target.value)}
                            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{ fontSize: "11px" }}
                          />
                          {standaloneSearch && (
                            <button type="button" onClick={() => setStandaloneSearch("")} className="text-muted-foreground hover:text-text-bright transition-colors">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Options */}
                    <div className="py-1 max-h-52 overflow-y-auto">
                      {group.label === "Managed Application" ? (() => {
                        const lowerSearch = standaloneSearch.toLowerCase();
                        const allOptions = effectiveApplicationGroups.flatMap((grp) => grp.options);
                        const filtered = lowerSearch ? allOptions.filter((o) => o.label.toLowerCase().includes(lowerSearch)) : allOptions;
                        if (filtered.length === 0) {
                          return <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>No results for "{standaloneSearch}"</div>;
                        }
                        return filtered.map((opt) => {
                          const checked = activeFilters.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className="flex items-center gap-2.5 px-3 cursor-pointer hover:bg-surface-raised transition-colors"
                              style={{ paddingTop: "5px", paddingBottom: "5px" }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(opt.key)}
                                className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                              />
                              {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                              <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                            </label>
                          );
                        });
                      })() : group.label === "Unmanaged Destination" ? (() => {
                        const lowerSearch = standaloneSearch.toLowerCase();
                        const filteredGroups = DESTINATION_GROUPS.map((grp) => ({
                          ...grp,
                          options: lowerSearch ? grp.options.filter((o) => o.label.toLowerCase().includes(lowerSearch)) : grp.options,
                        })).filter((grp) => grp.options.length > 0);
                        if (filteredGroups.length === 0) {
                          return <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>No results for "{standaloneSearch}"</div>;
                        }
                        return filteredGroups.map((grp) => {
                          const groupKey = grp.key;
                          const childKeys = grp.options.map((o) => o.key);
                          const groupChecked = activeFilters.includes(groupKey);
                          const allChildChecked = childKeys.every((k) => activeFilters.includes(k));
                          const someChecked = groupChecked || childKeys.some((k) => activeFilters.includes(k));
                          const isIndeterminate = !groupChecked && someChecked && !allChildChecked;
                          return (
                            <div key={grp.label}>
                              <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-surface-raised transition-colors">
                                <input
                                  type="checkbox"
                                  checked={groupChecked || allChildChecked}
                                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                                  onChange={() => {
                                    if (groupChecked || allChildChecked) {
                                      const toRemove = ([groupKey, ...childKeys] as FilterKey[]).filter((k) => activeFilters.includes(k));
                                      onBatchSet([], toRemove);
                                    } else {
                                      const toRemove = childKeys.filter((k) => activeFilters.includes(k));
                                      onBatchSet([groupKey], toRemove);
                                    }
                                  }}
                                  className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                                />
                                <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
                                  {grp.label}
                                </span>
                              </label>
                              {grp.options.map((opt) => {
                                const checked = groupChecked || activeFilters.includes(opt.key);
                                return (
                                  <label
                                    key={opt.key}
                                    className="flex items-center gap-2.5 cursor-pointer hover:bg-surface-raised transition-colors"
                                    style={{ paddingLeft: "28px", paddingRight: "12px", paddingTop: "5px", paddingBottom: "5px" }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        if (groupChecked) {
                                          const otherChildren = childKeys.filter((k) => k !== opt.key);
                                          onBatchSet(otherChildren, [groupKey]);
                                        } else {
                                          onToggle(opt.key);
                                        }
                                      }}
                                      className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                                    />
                                    {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                                    <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        });
                      })() : (
                        /* Identity and others: flat list */
                        group.options.map((opt) => {
                          const checked = activeFilters.includes(opt.key);
                          if (opt.label === "All Identities" || opt.label === "Stale Account" || opt.label === "Active") return null;
                          const isPink = opt.key === "sensitive-others";
                          return (
                            <label
                              key={opt.key}
                              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-raised transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(opt.key)}
                                className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                              />
                              {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                              <span className={isPink ? "text-pink-400" : "text-foreground"} style={{ fontSize: "12px" }}>{opt.label}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* Identity Name pill — after Identity Type, before app/destination groups */}
          {!isIdentity && <div className="relative">
            {selectedIdentityName === null ? (
              <button
                type="button"
                onClick={handleToggleIdentityName}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                  identityNameOpen
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "12px", fontWeight: 400 }}
              >
                <Plus size={10} />
                Identity Name
                <ChevronDown size={10} className={`ml-0.5 opacity-60 transition-transform ${identityNameOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                <button
                  type="button"
                  onClick={handleToggleIdentityName}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                >
                  <User size={11} className="text-muted-foreground shrink-0" />
                  Identity Name
                  <span className="text-primary/50 mx-0.5">|</span>
                  <span className="truncate max-w-[120px]">{selectedIdentityName}</span>
                  <ChevronDown size={9} className={`ml-0.5 opacity-60 transition-transform ${identityNameOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIdentityName(null)}
                  className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                  aria-label="Clear identity name filter"
                >
                  <X size={9} />
                </button>
              </div>
            )}
            {identityNameOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
                  <span className="flex items-center gap-1.5 text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>
                    <User size={12} className="text-muted-foreground" />
                    Identity Name
                  </span>
                </div>
                <div className="px-2.5 pt-2 pb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-raised border border-border rounded-lg">
                    <Search size={11} className="text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search…"
                      value={identityNameSearch}
                      onChange={(e) => setIdentityNameSearch(e.target.value)}
                      className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                      style={{ fontSize: "11px" }}
                    />
                    {identityNameSearch && (
                      <button type="button" onClick={() => setIdentityNameSearch("")} className="text-muted-foreground hover:text-text-bright transition-colors">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="py-1 max-h-52 overflow-y-auto">
                  {(() => {
                    const lower = identityNameSearch.toLowerCase().trim();
                    const filtered = lower
                      ? IDENTITY_NAMES.filter((n) => n.toLowerCase().includes(lower))
                      : IDENTITY_NAMES;
                    const visible = filtered.slice(0, 10);
                    if (visible.length === 0) {
                      return (
                        <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>
                          No results for "{identityNameSearch}"
                        </div>
                      );
                    }
                    return visible.map((name) => {
                      const isSelected = selectedIdentityName === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedIdentityName(isSelected ? null : name);
                            setIdentityNameOpen(false);
                            setIdentityNameSearch("");
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left ${
                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-raised text-foreground"
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-primary bg-primary" : "border-border"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                          </div>
                          <span style={{ fontSize: "12px" }}>{name}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>}
          {/* Pass 2: Object type, Managed Application, Unmanaged Destination — after Identity Name */}
          {otherGroupData.filter(({ group }) => group.label !== "Identity Type").map(({ group, activeKeys, count, displayLabel }) => {
            const isOpen = standaloneOpen === group.label;
            return (
              <div key={group.label} className="relative">
                {count === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleToggleStandalone(group.label)}
                    className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                      isOpen
                        ? "border-primary/40 text-primary bg-primary/10"
                        : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                    }`}
                    style={{ fontSize: "12px", fontWeight: 400 }}
                  >
                    <Plus size={10} />
                    {group.label}
                    <ChevronDown size={10} className={`ml-0.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleToggleStandalone(group.label)}
                      className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      <span className="shrink-0 flex items-center">{group.icon}</span>
                      {group.label}
                      <span className="text-primary/50 mx-0.5">|</span>
                      <span className="truncate max-w-[120px]">{displayLabel}</span>
                      <ChevronDown size={9} className={`ml-0.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBatchSet([], activeKeys)}
                      className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
                      aria-label={`Clear ${group.label} filter`}
                    >
                      <X size={9} />
                    </button>
                  </div>
                )}
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
                      <span className="flex items-center gap-1.5 text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>
                        <span className="flex items-center">{group.icon}</span>
                        {group.label}
                      </span>
                    </div>
                    {group.hasSearch && (
                      <div className="px-2.5 pt-2 pb-1">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-raised border border-border rounded-lg">
                          <Search size={11} className="text-muted-foreground shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search…"
                            value={standaloneSearch}
                            onChange={(e) => setStandaloneSearch(e.target.value)}
                            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{ fontSize: "11px" }}
                          />
                          {standaloneSearch && (
                            <button type="button" onClick={() => setStandaloneSearch("")} className="text-muted-foreground hover:text-text-bright transition-colors">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="py-1 max-h-52 overflow-y-auto">
                      {group.label === "Managed Application" ? (() => {
                        const lowerSearch = standaloneSearch.toLowerCase();
                        const allOptions = effectiveApplicationGroups.flatMap((grp) => grp.options);
                        const filtered = lowerSearch ? allOptions.filter((o) => o.label.toLowerCase().includes(lowerSearch)) : allOptions;
                        if (filtered.length === 0) {
                          return <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>No results for "{standaloneSearch}"</div>;
                        }
                        return filtered.map((opt) => {
                          const checked = activeFilters.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className="flex items-center gap-2.5 px-3 cursor-pointer hover:bg-surface-raised transition-colors"
                              style={{ paddingTop: "5px", paddingBottom: "5px" }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(opt.key)}
                                className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                              />
                              {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                              <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                            </label>
                          );
                        });
                      })() : group.label === "Unmanaged Destination" ? (() => {
                        const lowerSearch = standaloneSearch.toLowerCase();
                        const filteredGroups = DESTINATION_GROUPS.map((grp) => ({
                          ...grp,
                          options: lowerSearch ? grp.options.filter((o) => o.label.toLowerCase().includes(lowerSearch)) : grp.options,
                        })).filter((grp) => grp.options.length > 0);
                        if (filteredGroups.length === 0) {
                          return <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>No results for "{standaloneSearch}"</div>;
                        }
                        return filteredGroups.map((grp) => {
                          const groupKey = grp.key;
                          const childKeys = grp.options.map((o) => o.key);
                          const groupChecked = activeFilters.includes(groupKey);
                          const allChildChecked = childKeys.every((k) => activeFilters.includes(k));
                          const someChecked = groupChecked || childKeys.some((k) => activeFilters.includes(k));
                          const isIndeterminate = !groupChecked && someChecked && !allChildChecked;
                          return (
                            <div key={grp.label}>
                              <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-surface-raised transition-colors">
                                <input
                                  type="checkbox"
                                  checked={groupChecked || allChildChecked}
                                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                                  onChange={() => {
                                    if (groupChecked || allChildChecked) {
                                      const toRemove = ([groupKey, ...childKeys] as FilterKey[]).filter((k) => activeFilters.includes(k));
                                      onBatchSet([], toRemove);
                                    } else {
                                      const toRemove = childKeys.filter((k) => activeFilters.includes(k));
                                      onBatchSet([groupKey], toRemove);
                                    }
                                  }}
                                  className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                                />
                                <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
                                  {grp.label}
                                </span>
                              </label>
                              {grp.options.map((opt) => {
                                const checked = groupChecked || activeFilters.includes(opt.key);
                                return (
                                  <label
                                    key={opt.key}
                                    className="flex items-center gap-2.5 cursor-pointer hover:bg-surface-raised transition-colors"
                                    style={{ paddingLeft: "28px", paddingRight: "12px", paddingTop: "5px", paddingBottom: "5px" }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        if (groupChecked) {
                                          const otherChildren = childKeys.filter((k) => k !== opt.key);
                                          onBatchSet(otherChildren, [groupKey]);
                                        } else {
                                          onToggle(opt.key);
                                        }
                                      }}
                                      className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                                    />
                                    {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                                    <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        });
                      })() : group.options.map((opt) => {
                        const checked = activeFilters.includes(opt.key);
                        const isPink = opt.key === "sensitive-others";
                        return (
                          <label
                            key={opt.key}
                            className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-raised transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggle(opt.key)}
                              className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                            />
                            {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                            <span className={isPink ? "text-pink-400" : "text-foreground"} style={{ fontSize: "12px" }}>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* Active pink value chips for Stale Account / IDP Status */}
          {staleAccountValue !== null && (
            <div className="inline-flex items-center rounded-full border border-pink-400/40 bg-pink-400/10 overflow-hidden">
              <button
                type="button"
                onClick={handleToggleAddFilter}
                className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-pink-400 hover:bg-pink-400/10 transition-colors"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <Clock size={11} className="text-pink-400/60 shrink-0" />
                Stale Account
                <span className="text-pink-400/50 mx-0.5">|</span>
                <span className="truncate max-w-[60px]">{staleAccountValue === "yes" ? "Yes" : "No"}</span>
              </button>
              <button
                type="button"
                onClick={() => setStaleAccountValue(null)}
                className="pl-0.5 pr-2 py-[3px] text-pink-400/50 hover:text-pink-400 transition-colors"
                aria-label="Clear stale account filter"
              >
                <X size={9} />
              </button>
            </div>
          )}
          {idpStatusValues.length > 0 && (
            <div className="inline-flex items-center rounded-full border border-pink-400/40 bg-pink-400/10 overflow-hidden">
              <button
                type="button"
                onClick={handleToggleAddFilter}
                className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-pink-400 hover:bg-pink-400/10 transition-colors"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <Activity size={11} className="text-pink-400/60 shrink-0" />
                IDP Status
                <span className="text-pink-400/50 mx-0.5">|</span>
                <span className="truncate max-w-[100px]">
                  {idpStatusValues.length === 1 ? idpStatusValues[0] : `${idpStatusValues.length} selected`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIdpStatusValues([])}
                className="pl-0.5 pr-2 py-[3px] text-pink-400/50 hover:text-pink-400 transition-colors"
                aria-label="Clear IDP status filter"
              >
                <X size={9} />
              </button>
            </div>
          )}

          {/* Add filter chip — only shown on non-Destination standalone modes */}
          {!isDestination && (
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleAddFilter}
                className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                  addFilterOpen
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
                }`}
                style={{ fontSize: "12px", fontWeight: 400 }}
              >
                <Plus size={10} />
                Add filter
                <ChevronDown size={10} className={`ml-0.5 opacity-60 transition-transform ${addFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {addFilterOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                  {addFilterSection === null ? (
                    <>
                      <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
                        <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Add filter</span>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => setAddFilterSection("stale")}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-raised transition-colors text-left"
                        >
                          <span className="text-pink-400" style={{ fontSize: "12px" }}>Stale Account</span>
                          <ChevronDown size={10} className="opacity-40 -rotate-90 shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddFilterSection("idp")}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-raised transition-colors text-left"
                        >
                          <span className="text-pink-400" style={{ fontSize: "12px" }}>IDP Status</span>
                          <ChevronDown size={10} className="opacity-40 -rotate-90 shrink-0" />
                        </button>
                      </div>
                    </>
                  ) : addFilterSection === "stale" ? (
                    <>
                      <div className="px-2 pt-2 pb-1.5 border-b border-border flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAddFilterSection(null)}
                          className="p-0.5 rounded hover:bg-surface-raised text-muted-foreground hover:text-text-bright transition-colors"
                        >
                          <ChevronDown size={12} className="rotate-90" />
                        </button>
                        <span className="flex items-center gap-1.5 text-pink-400" style={{ fontSize: "12px", fontWeight: 600 }}>
                          <Clock size={12} className="text-pink-400/60" />
                          Stale Account
                        </span>
                      </div>
                      <div className="py-1">
                        {(["yes", "no"] as const).map((val) => {
                          const isSelected = staleAccountValue === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setStaleAccountValue(isSelected ? null : val);
                                setAddFilterOpen(false);
                                setAddFilterSection(null);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left ${
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-raised text-foreground"
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-primary bg-primary" : "border-border"
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                              </div>
                              <span style={{ fontSize: "12px" }}>{val === "yes" ? "Yes" : "No"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-2 pt-2 pb-1.5 border-b border-border flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAddFilterSection(null)}
                          className="p-0.5 rounded hover:bg-surface-raised text-muted-foreground hover:text-text-bright transition-colors"
                        >
                          <ChevronDown size={12} className="rotate-90" />
                        </button>
                        <span className="flex items-center gap-1.5 text-pink-400" style={{ fontSize: "12px", fontWeight: 600 }}>
                          <Activity size={12} className="text-pink-400/60" />
                          IDP Status
                        </span>
                      </div>
                      <div className="py-1">
                        {IDP_STATUS_OPTIONS.map(({ key }) => {
                          const isChecked = idpStatusValues.includes(key);
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-raised transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setIdpStatusValues((prev) =>
                                    isChecked ? prev.filter((v) => v !== key) : [...prev, key]
                                  )
                                }
                                className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                              />
                              <span className="text-foreground" style={{ fontSize: "12px" }}>{key}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
      /* ── Other modes: aggregate pills + "+Other" + shared dropdown ── */
      <div className="relative flex items-center gap-1.5">
        {/* Aggregate pill per active Other group */}
        {groupsWithActive.map(({ group, activeKeys, displayLabel }) => (
          <div key={group.label} className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
            <button
              type="button"
              onClick={() => handleOpenOtherAtGroup(group.label)}
              className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              <span className="shrink-0 flex items-center">{group.icon}</span>
              {group.label}
              <span className="text-primary/50 mx-0.5">|</span>
              <span className="truncate max-w-[120px]">{displayLabel}</span>
              <ChevronDown size={9} className={`ml-0.5 opacity-60 transition-transform ${otherOpen && selectedOtherGroup === group.label ? "rotate-180" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => onBatchSet([], activeKeys)}
              className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors"
              aria-label={`Clear ${group.label} filter`}
            >
              <X size={9} />
            </button>
          </div>
        ))}

        {/* "+Other" pill — only shown if groups remain without active filters */}
        {groupsWithoutActive.length > 0 && (
          <button
            type="button"
            onClick={handleToggleOther}
            className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
              otherOpen && selectedOtherGroup === null
                ? "border-primary/40 text-primary bg-primary/10"
                : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
            }`}
            style={{ fontSize: "12px", fontWeight: 400 }}
          >
            <Plus size={10} />
            Other
            <ChevronDown size={10} className={`ml-0.5 opacity-60 transition-transform ${otherOpen && selectedOtherGroup === null ? "rotate-180" : ""}`} />
          </button>
        )}

        {/* Shared dropdown */}
        {otherOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
            {/* Level 1: only groups without active filters */}
            {selectedOtherGroup === null ? (
              <>
                <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
                  <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Other Filters</span>
                </div>
                <div className="py-1">
                  {groupsWithoutActive.map(({ group }) => (
                    <button
                      key={group.label}
                      type="button"
                      onClick={() => { setSelectedOtherGroup(group.label); setOtherSearch(""); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-raised transition-colors text-left"
                    >
                      <span className="shrink-0 flex items-center w-4 justify-center">{group.icon}</span>
                      <span className="flex-1 text-foreground" style={{ fontSize: "12px" }}>{group.label}</span>
                      <ChevronDown size={10} className="opacity-40 -rotate-90 shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Level 2: sub-options for selected group */
              (() => {
                const group = effectiveOtherGroups.find((g) => g.label === selectedOtherGroup)!;
                const visibleOptions = group.hasSearch && otherSearch
                  ? group.options.filter((o) => o.label.toLowerCase().includes(otherSearch.toLowerCase()))
                  : group.options;
                return (
                  <>
                    <div className="px-2 pt-2 pb-1.5 border-b border-border flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (groupsWithoutActive.length === 0) {
                            setOtherOpen(false);
                            setSelectedOtherGroup(null);
                            setOtherSearch("");
                          } else {
                            setSelectedOtherGroup(null);
                            setOtherSearch("");
                          }
                        }}
                        className="p-0.5 rounded hover:bg-surface-raised text-muted-foreground hover:text-text-bright transition-colors"
                      >
                        <ChevronDown size={12} className="rotate-90" />
                      </button>
                      <span className="flex items-center gap-1.5 text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>
                        <span className="flex items-center">{group.icon}</span>
                        {group.label}
                      </span>
                    </div>
                    {group.hasSearch && (
                      <div className="px-2.5 pt-2 pb-1">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-raised border border-border rounded-lg">
                          <Search size={11} className="text-muted-foreground shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search…"
                            value={otherSearch}
                            onChange={(e) => setOtherSearch(e.target.value)}
                            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{ fontSize: "11px" }}
                          />
                          {otherSearch && (
                            <button type="button" onClick={() => setOtherSearch("")} className="text-muted-foreground hover:text-text-bright transition-colors">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="py-1 max-h-52 overflow-y-auto">
                      {/* Managed Application group: render with parent-layer grouping */}
                      {selectedOtherGroup === "Managed Application" ? (() => {
                        const lowerSearch = otherSearch.toLowerCase();
                        const allOptions = effectiveApplicationGroups.flatMap((grp) => grp.options);
                        const filtered = lowerSearch ? allOptions.filter((o) => o.label.toLowerCase().includes(lowerSearch)) : allOptions;
                        if (filtered.length === 0) {
                          return (
                            <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>
                              No results for "{otherSearch}"
                            </div>
                          );
                        }
                        return filtered.map((opt) => {
                          const checked = activeFilters.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className="flex items-center gap-2.5 px-3 cursor-pointer hover:bg-surface-raised transition-colors"
                              style={{ paddingTop: "5px", paddingBottom: "5px" }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(opt.key)}
                                className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                              />
                              {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                              <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                            </label>
                          );
                        });
                      })() : selectedOtherGroup === "Unmanaged Destination" ? (() => {
                        const lowerSearch = otherSearch.toLowerCase();
                        const filteredGroups = DESTINATION_GROUPS.map((grp) => ({
                          ...grp,
                          options: lowerSearch
                            ? grp.options.filter((o) => o.label.toLowerCase().includes(lowerSearch))
                            : grp.options,
                        })).filter((grp) => grp.options.length > 0 || grp.label.toLowerCase().includes(lowerSearch));

                        if (filteredGroups.length === 0) {
                          return (
                            <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "11px" }}>
                              No results for "{otherSearch}"
                            </div>
                          );
                        }

                        return filteredGroups.map((grp) => {
                          const groupKey = grp.key;
                          const childKeys = grp.options.map((o) => o.key);
                          const groupChecked = activeFilters.includes(groupKey);
                          const allChildChecked = childKeys.every((k) => activeFilters.includes(k));
                          const someChecked = groupChecked || childKeys.some((k) => activeFilters.includes(k));
                          const isIndeterminate = !groupChecked && someChecked && !allChildChecked;
                          return (
                            <div key={grp.label}>
                              {/* Parent group header row — selectable */}
                              <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-surface-raised transition-colors">
                                <input
                                  type="checkbox"
                                  checked={groupChecked || allChildChecked}
                                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                                  onChange={() => {
                                    if (groupChecked || allChildChecked) {
                                      // deselect group key + all children
                                      const toRemove = ([groupKey, ...childKeys] as FilterKey[]).filter((k) => activeFilters.includes(k));
                                      onBatchSet([], toRemove);
                                    } else {
                                      // select group key, clear partial children
                                      const toRemove = childKeys.filter((k) => activeFilters.includes(k));
                                      onBatchSet([groupKey], toRemove);
                                    }
                                  }}
                                  className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                                />
                                <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
                                  {grp.label}
                                </span>
                              </label>
                              {/* Child rows */}
                              {grp.options.map((opt) => {
                                const checked = groupChecked || activeFilters.includes(opt.key);
                                return (
                                  <label
                                    key={opt.key}
                                    className="flex items-center gap-2.5 cursor-pointer hover:bg-surface-raised transition-colors"
                                    style={{ paddingLeft: "28px", paddingRight: "12px", paddingTop: "5px", paddingBottom: "5px" }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        if (groupChecked) {
                                          // expand group to individual selections minus this one
                                          const otherChildren = childKeys.filter((k) => k !== opt.key);
                                          onBatchSet(otherChildren, [groupKey]);
                                        } else {
                                          onToggle(opt.key);
                                        }
                                      }}
                                      className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                                    />
                                    {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                                    <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        });
                      })() : (
                        /* All other groups: flat list */
                        visibleOptions.length > 0 ? visibleOptions.map((opt) => {
                          const checked = activeFilters.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-raised transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(opt.key)}
                                className="w-3 h-3 rounded accent-primary cursor-pointer shrink-0"
                              />
                              {opt.icon && <span className="shrink-0 flex items-center w-4 justify-center">{opt.icon}</span>}
                              <span className="text-foreground" style={{ fontSize: "12px" }}>{opt.label}</span>
                            </label>
                          );
                        }) : (
                          <div className="px-3 py-2 text-muted-foreground text-center" style={{ fontSize: "11px" }}>
                            No results for "{otherSearch}"
                          </div>
                        )
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>
      )} {/* end isDataStore ternary */}

      {/* Clear all — rightmost, only when filters active */}
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-0.5 px-1.5 py-[3px] rounded-full text-muted-foreground hover:text-text-bright transition-colors shrink-0"
          style={{ fontSize: "12px" }}
        >
          <X size={10} /> Clear
        </button>
      )}
    </div>
  );
}

// ── NL Search suggestion data ────────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  "databases with SSN",
  "unsanctioned applications",
  "agents using GPT",
  "drives with medical records",
  "generative AI apps",
  "all identities",
  "data stores with passwords",
  "websites for file sharing",
];

const RECENT_SEARCHES_KEY = "inventory-recent-searches";
const MAX_RECENT = 6;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecentSearches().filter((q) => q !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function removeRecentSearch(query: string) {
  const recent = getRecentSearches().filter((q) => q !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

// ── Per-type name-search recents ──────────────────────────────────────────────

const RECENT_NAME_KEYS: Record<ResultType, string> = {
  "data-stores":     "inventory-recent-ds-names",
  "destinations":    "inventory-recent-dest-names",
  "identities":      "inventory-recent-identity-names",
  "sensitive-files": "inventory-recent-sd-names",
};
const MAX_RECENT_NAMES = 3;

function getRecentNameSearches(type: ResultType): string[] {
  try {
    const stored = localStorage.getItem(RECENT_NAME_KEYS[type]);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentNameSearch(type: ResultType, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const recent = getRecentNameSearches(type).filter((q) => q !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_NAME_KEYS[type], JSON.stringify(recent.slice(0, MAX_RECENT_NAMES)));
}

// ── Main component ────────────────────────────────────────────────────────────

export function InventorySearchBar({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const [searchParams] = useSearchParams();

  // Restore filter mode & active filters from URL on mount
  const urlFilters = useMemo(() => {
    const param = searchParams.get("filters") || "";
    return param ? (param.split(",") as FilterKey[]) : [];
  }, [searchParams]);

  const [query, setQuery] = useState(initialQuery);
  const [dsQuery, setDsQuery] = useState(searchParams.get("dsq") || "");
  const [destQuery, setDestQuery] = useState(searchParams.get("destq") || "");
  const [identityQuery, setIdentityQuery] = useState(searchParams.get("idq") || "");
  const [sdQuery, setSdQuery] = useState(searchParams.get("sdq") || "");
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [mode, setMode] = useState<"nl" | "filter">(
    searchParams.get("mode") === "nl" ? "nl" : "filter"
  );
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>(urlFilters);
  const [resultTypeOpen, setResultTypeOpen] = useState(false);
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [localNameInputFocused, setLocalNameInputFocused] = useState(false);
  // Local state for the non-search-page search bar (defaults to Data Store, navigates only on submit)
  const [localResultType, setLocalResultType] = useState<ResultType>("data-stores");
  const [localQuery, setLocalQuery] = useState("");
  const resultTypeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname.includes("/search");

  // Sync local state when initialQuery prop changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Sync name-search queries from URL (e.g. when navigating back/forward)
  useEffect(() => {
    setDsQuery(searchParams.get("dsq") || "");
    setDestQuery(searchParams.get("destq") || "");
    setIdentityQuery(searchParams.get("idq") || "");
    setSdQuery(searchParams.get("sdq") || "");
  }, [searchParams]);

  // Build index for preview count
  const index = useMemo(() => buildSearchIndex(), []);

  // Autocomplete name lists per result type
  const allNamesMap = useMemo<Record<ResultType, string[]>>(() => ({
    "data-stores":     [...new Set(index.filter(i => i.category === "Unstructured Data Store" || i.category === "Structured Data Store").map(i => i.name))],
    "destinations":    [...new Set(index.filter(i => i.category === "Unmanaged Destination").map(i => i.name))],
    "identities":      IDENTITY_NAMES,
    "sensitive-files": [...new Set(index.filter(i => i.category === "Sensitive File").map(i => i.name))],
  }), [index]);

  // Live preview count
  const previewCount = useMemo(() => {
    if (!query.trim()) return null;
    return searchInventory(query, index).length;
  }, [query, index]);

  // Per-tab result counts (filter mode only) — used to dim/disable empty tabs
  const tabCounts = useMemo<Record<ResultType, number>>(() => {
    if (activeFilters.length === 0) {
      return { "data-stores": 0, "destinations": 0, "sensitive-files": 0, "identities": 0 };
    }
    const all = buildSearchIndex();
    const barFiltered = all.filter((item) =>
      activeFilters.some((key) => FILTER_PREDICATES[key]?.(item)),
    );
    return {
      "data-stores":     barFiltered.filter(RESULT_TYPE_CATEGORY_FILTER["data-stores"]).length,
      "destinations":    barFiltered.filter(RESULT_TYPE_CATEGORY_FILTER["destinations"]).length,
      "sensitive-files": barFiltered.filter(RESULT_TYPE_CATEGORY_FILTER["sensitive-files"]).length,
      "identities":      barFiltered.filter(RESULT_TYPE_CATEGORY_FILTER["identities"]).length,
    };
  }, [activeFilters]);

  // Show dropdown when focused and input is empty (recents + suggestions)
  const hasRecents = recentSearches.length > 0;
  const showDropdown = focused && !query.trim() && mode === "nl";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
      if (resultTypeRef.current && !resultTypeRef.current.contains(e.target as Node)) {
        setResultTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === "filter") {
        if (activeFilters.length === 0) return;
        navigate(`/inventory/search?filters=${activeFilters.join(",")}`);
        return;
      }
      if (!query.trim()) return;
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
      setFocused(false);
      navigate(`/inventory/search?q=${encodeURIComponent(query.trim())}`);
    },
    [query, mode, activeFilters, navigate],
  );

  const handleSelectItem = useCallback(
    (q: string) => {
      setQuery(q);
      saveRecentSearch(q);
      setRecentSearches(getRecentSearches());
      setFocused(false);
      navigate(`/inventory/search?q=${encodeURIComponent(q)}`);
    },
    [navigate],
  );

  const handleRemoveRecent = useCallback((e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    removeRecentSearch(q);
    setRecentSearches(getRecentSearches());
  }, []);

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleToggleFilter = useCallback((key: FilterKey) => {
    const rt = (searchParams.get("resultType") || "data-stores");
    const next = activeFilters.includes(key)
      ? activeFilters.filter((k) => k !== key)
      : [...activeFilters, key];
    setActiveFilters(next);
    if (next.length > 0) {
      navigate(`/inventory/search?filters=${next.join(",")}&resultType=${rt}&mode=filter`);
    } else {
      navigate(`/inventory/search?mode=filter&resultType=${rt}`);
    }
  }, [navigate, searchParams, activeFilters]);

  const handleBatchSet = useCallback((add: FilterKey[], remove: FilterKey[]) => {
    const rt = (searchParams.get("resultType") || "data-stores");
    const cleaned = activeFilters.filter(k => !remove.includes(k));
    const next = [...cleaned, ...add.filter(k => !cleaned.includes(k))];
    setActiveFilters(next);
    if (next.length > 0) {
      navigate(`/inventory/search?filters=${next.join(",")}&resultType=${rt}&mode=filter`);
    } else {
      navigate(`/inventory/search?mode=filter&resultType=${rt}`);
    }
  }, [navigate, searchParams, activeFilters]);

  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    const rt = searchParams.get("resultType") || "data-stores";
    navigate(`/inventory/search?mode=filter&resultType=${rt}`);
  }, [navigate, searchParams]);

  const handleDsQueryChange = useCallback((value: string) => {
    setDsQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("dsq", value.trim());
    } else {
      params.delete("dsq");
    }
    navigate(`/inventory/search?${params.toString()}`);
  }, [navigate, searchParams]);

  const handleDestQueryChange = useCallback((value: string) => {
    setDestQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("destq", value.trim());
    } else {
      params.delete("destq");
    }
    navigate(`/inventory/search?${params.toString()}`);
  }, [navigate, searchParams]);

  const handleIdentityQueryChange = useCallback((value: string) => {
    setIdentityQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("idq", value.trim());
    } else {
      params.delete("idq");
    }
    navigate(`/inventory/search?${params.toString()}`);
  }, [navigate, searchParams]);

  const handleSdQueryChange = useCallback((value: string) => {
    setSdQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("sdq", value.trim());
    } else {
      params.delete("sdq");
    }
    navigate(`/inventory/search?${params.toString()}`);
  }, [navigate, searchParams]);

  // Suggestions: show examples not already in recents
  const suggestions = useMemo(() => {
    const recentSet = new Set(recentSearches);
    return EXAMPLE_QUERIES.filter((q) => !recentSet.has(q)).slice(0, 8);
  }, [recentSearches]);

  const isFilterMode = mode === "filter";

  // Result type — derived from URL param (filter mode only); null = no category chosen yet
  const resultType = (searchParams.get("resultType") || null) as ResultType | null;

  const isDataStore = resultType === "data-stores";

  // Auto-open the "Search on" dropdown when arriving at search page with no category selected
  useEffect(() => {
    if (isSearchPage && isFilterMode && !resultType) {
      setResultTypeOpen(true);
    }
  }, [isSearchPage, isFilterMode, resultType]);

  const handleSetResultType = useCallback((rt: ResultType) => {
    // Clear dsq when switching away from data-store mode
    if (rt !== "data-stores") {
      setDsQuery("");
    }
    if (activeFilters.length > 0) {
      navigate(`/inventory/search?filters=${activeFilters.join(",")}&resultType=${rt}&mode=filter`);
    } else {
      navigate(`/inventory/search?resultType=${rt}&mode=filter`);
    }
    setResultTypeOpen(false);
  }, [activeFilters, navigate]);

  // Submit handler for the search-results-page bar — re-navigates with updated query
  const handleResultsBarSubmit = useCallback(() => {
    if (!resultType) return;
    const params = new URLSearchParams();
    params.set("resultType", resultType);
    params.set("mode", "filter");
    if (activeFilters.length > 0) params.set("filters", activeFilters.join(","));
    const currentQuery =
      resultType === "data-stores" ? dsQuery
      : resultType === "destinations" ? destQuery
      : resultType === "identities" ? identityQuery
      : sdQuery;
    if (currentQuery.trim()) {
      const paramKey =
        resultType === "data-stores" ? "dsq"
        : resultType === "destinations" ? "destq"
        : resultType === "identities" ? "idq"
        : "sdq";
      params.set(paramKey, currentQuery.trim());
    }
    navigate(`/inventory/search?${params.toString()}`);
  }, [resultType, dsQuery, destQuery, identityQuery, sdQuery, activeFilters, navigate]);

  // Submit handler for the non-search-page bar — navigates to search results
  const handleInventoryBarSubmit = useCallback(() => {
    const params = new URLSearchParams();
    params.set("resultType", localResultType);
    params.set("mode", "filter");
    if (localQuery.trim()) {
      const paramKey =
        localResultType === "data-stores" ? "dsq"
        : localResultType === "destinations" ? "destq"
        : localResultType === "identities" ? "idq"
        : "sdq";
      params.set(paramKey, localQuery.trim());
    }
    navigate(`/inventory/search?${params.toString()}`);
  }, [localResultType, localQuery, navigate]);

  // ── Name-search dropdown: recents + autocomplete suggestions ─────────────────
  const renderNameDropdown = (
    focused: boolean,
    type: ResultType | null,
    currentVal: string,
    onSelect: (name: string) => void,
    onClose: () => void,
  ) => {
    if (!focused || !type) return null;
    const lower = currentVal.toLowerCase().trim();
    const names = allNamesMap[type] ?? [];
    if (!lower) {
      const recents = getRecentNameSearches(type);
      if (recents.length === 0) return null;
      return (
        <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden" style={{ width: "100%", minWidth: "220px" }}>
          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
            <Clock size={10} />
            Recent
          </div>
          {recents.map((r) => (
            <button
              key={r}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(r); saveRecentNameSearch(type, r); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface-raised transition-colors"
            >
              <Clock size={11} className="text-muted-foreground shrink-0" />
              <span className="text-foreground truncate" style={{ fontSize: "12px" }}>{r}</span>
            </button>
          ))}
        </div>
      );
    }
    const matches = names.filter((n) => n.toLowerCase().includes(lower)).slice(0, 6);
    if (matches.length === 0) return null;
    return (
      <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden" style={{ width: "100%", minWidth: "220px" }}>
        <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>
          <Search size={10} />
          Suggestions
        </div>
        {matches.map((m) => (
          <button
            key={m}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(m); saveRecentNameSearch(type, m); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface-raised transition-colors"
          >
            <Search size={11} className="text-muted-foreground shrink-0" />
            <span className="text-foreground truncate" style={{ fontSize: "12px" }}>{m}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div ref={wrapperRef} className="relative shrink-0">
    <div className="flex items-center gap-3 px-4 py-2.5 bg-nav-bg border-b border-border">
      {isSearchPage && isFilterMode && (
        <button
          type="button"
          onClick={() => navigate("/inventory")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors shrink-0"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      )}
      <form onSubmit={handleSubmit} className={isFilterMode ? "w-fit shrink-0" : "w-full max-w-lg"}>
        {/* Search container */}
        <div
          className={`relative flex items-center transition-all ${
            focused && !isFilterMode ? "ring-1 ring-primary" : ""
          } ${isFilterMode ? "w-fit shrink-0" : "bg-surface-raised border border-border rounded-lg"}`}
        >
          {/* Left icon — clickable mode toggle */}
          {!isFilterMode && (
            <button
              type="button"
              onClick={() => {
                setMode("filter");
                setFocused(false);
                const rt = searchParams.get("resultType") || "data-stores";
                navigate(`/inventory/search?mode=filter&resultType=${rt}`);
              }}
              className="absolute left-2.5 z-10 p-0.5 rounded text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
              title="Switch to structured filter mode"
            >
              <Sparkles size={14} />
            </button>
          )}
          {isFilterMode && isSearchPage && (
            null
          )}

          {/* NL input OR filter pill row */}
          {!isFilterMode ? (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              autoFocus={autoFocus}
              placeholder="Ask anything about your inventory..."
              className="w-full pl-9 pr-8 py-2 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ fontSize: "13px" }}
            />
          ) : (
            <div className="flex items-center min-h-[40px]">
              {!isSearchPage ? (
                <button
                  type="button"
                  onClick={handleInventoryBarSubmit}
                  className="flex items-center gap-1.5 px-3 h-[32px] rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 transition-colors shrink-0 text-[12px]"
                  title="Global Search"
                >
                  <Search size={13} />
                  Global Search
                </button>
              ) : (
                <div className="flex items-center gap-2">
                <div className="relative flex items-center w-[400px] bg-surface-raised border border-border rounded-lg min-h-[32px]">
                  {/* "Search on" dropdown — shown on search results page */}
                  <div className="flex items-center gap-2 shrink-0 pr-2">
                    <div className="relative" ref={resultTypeRef}>
                      <button
                        type="button"
                        onClick={() => setResultTypeOpen((o) => !o)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-surface-raised transition-colors cursor-pointer"
                        style={{ fontSize: "11px" }}
                      >
                        <span className={`flex items-center gap-1.5 ${resultType ? "text-foreground/80" : "text-muted-foreground/50"}`}>
                          {resultType && RESULT_TYPE_TABS.find((t) => t.key === resultType)?.icon}
                          {resultType ? (
                            resultType === "data-stores" ? "Managed Data Store"
                            : resultType === "destinations" ? "Unmanaged Destination"
                            : RESULT_TYPE_TABS.find((t) => t.key === resultType)?.label
                          ) : "Select"}
                        </span>
                        <ChevronDown size={11} className="text-muted-foreground ml-0.5" />
                      </button>
                      {resultTypeOpen && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-surface-raised border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                          {RESULT_TYPE_TABS.map((tab) => {
                            const isActive = resultType === tab.key;
                            return (
                              <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleSetResultType(tab.key)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-primary/10 ${
                                  isActive ? "text-primary bg-primary/5" : "text-foreground/70"
                                }`}
                                style={{ fontSize: "11px" }}
                              >
                                {tab.icon}
                                {tab.key === "data-stores" ? "Managed Data Store"
                                  : tab.key === "destinations" ? "Unmanaged Destination"
                                  : tab.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* All modes: show a name-search text input after a result type is chosen */}
                  {resultType && (
                    <>
                      <div className="h-5 w-px bg-border/60 shrink-0" />
                      <div className="flex items-center flex-1 min-w-0 px-2">
                        <Search size={13} className="text-muted-foreground shrink-0 mr-2" />
                        <input
                          type="text"
                          value={
                            isDataStore ? dsQuery
                            : resultType === "destinations" ? destQuery
                            : resultType === "identities" ? identityQuery
                            : sdQuery
                          }
                          onChange={(e) => {
                            if (isDataStore) handleDsQueryChange(e.target.value);
                            else if (resultType === "destinations") handleDestQueryChange(e.target.value);
                            else if (resultType === "identities") handleIdentityQueryChange(e.target.value);
                            else handleSdQueryChange(e.target.value);
                          }}
                          onFocus={() => setNameInputFocused(true)}
                          onBlur={() => {
                            setNameInputFocused(false);
                            const val = (isDataStore ? dsQuery : resultType === "destinations" ? destQuery : resultType === "identities" ? identityQuery : sdQuery).trim();
                            if (val && resultType) saveRecentNameSearch(resultType, val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setNameInputFocused(false);
                          }}
                          placeholder={
                            isDataStore ? "Search by data store name..."
                            : resultType === "destinations" ? "Search by destination name..."
                            : resultType === "identities" ? "Search by identity name or email..."
                            : "Search by sensitive data name..."
                          }
                          className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                          style={{ fontSize: "12px" }}
                          autoFocus={autoFocus}
                        />
                        {(isDataStore ? dsQuery : resultType === "destinations" ? destQuery : resultType === "identities" ? identityQuery : sdQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isDataStore) handleDsQueryChange("");
                              else if (resultType === "destinations") handleDestQueryChange("");
                              else if (resultType === "identities") handleIdentityQueryChange("");
                              else handleSdQueryChange("");
                            }}
                            className="ml-1 text-muted-foreground hover:text-text-bright transition-colors shrink-0"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {renderNameDropdown(
                    nameInputFocused,
                    resultType,
                    isDataStore ? dsQuery : resultType === "destinations" ? destQuery : resultType === "identities" ? identityQuery : sdQuery,
                    (name) => {
                      if (isDataStore) handleDsQueryChange(name);
                      else if (resultType === "destinations") handleDestQueryChange(name);
                      else if (resultType === "identities") handleIdentityQueryChange(name);
                      else handleSdQueryChange(name);
                    },
                    () => setNameInputFocused(false),
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleResultsBarSubmit}
                  className="flex items-center justify-center w-[38px] h-[32px] rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
                  title="Search"
                >
                  <Search size={13} />
                </button>
                </div>
              )}
            </div>
          )}

          {/* Clear button (NL mode only) */}
          {!isFilterMode && query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 text-muted-foreground hover:text-text-bright transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {/* Data Explorer button */}
      <button
        type="button"
        onClick={() => navigate("/inventory/data-explorer")}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised border border-border rounded-lg text-muted-foreground hover:text-text-bright hover:border-primary/30 transition-colors cursor-pointer shrink-0"
        style={{ fontSize: "12px" }}
      >
        <FlaskConical size={13} />
        Data Explorer
      </button>

    </div>{/* end inner search row */}

    {/* Filter pills row — shown below the search bar for all result types */}
    {isSearchPage && isFilterMode && resultType && (
      <div className="flex items-center gap-1.5 px-4 py-2">
        <FilterPillRow
          activeFilters={activeFilters}
          onToggle={handleToggleFilter}
          onClearAll={handleClearFilters}
          onBatchSet={handleBatchSet}
          resultType={resultType}
        />
      </div>
    )}

      {/* NL mode dropdown: recent searches + suggestions */}
      {showDropdown && (
        <div className="absolute left-4 top-full mt-0 w-full max-w-lg bg-surface-raised border border-border rounded-lg shadow-lg z-30 py-1.5">
          {/* Recent searches */}
          {hasRecents && (
            <>
              <div
                className="px-3 py-1.5 text-muted-foreground flex items-center gap-1.5"
                style={{ fontSize: "11px", fontWeight: 500 }}
              >
                <Clock size={11} />
                Recent searches
              </div>
              {recentSearches.map((q) => (
                <button
                  key={`recent-${q}`}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-foreground/[0.06] transition-colors group"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectItem(q); }}
                >
                  <Clock size={13} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 text-foreground truncate" style={{ fontSize: "13px" }}>{q}</span>
                  <ArrowUpRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  <span
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-text-bright transition-all shrink-0 p-0.5 rounded hover:bg-foreground/10"
                    onMouseDown={(e) => handleRemoveRecent(e, q)}
                  >
                    <X size={12} />
                  </span>
                </button>
              ))}
            </>
          )}

          {hasRecents && suggestions.length > 0 && (
            <div className="border-t border-border my-1" />
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-muted-foreground flex items-center gap-1.5"
                style={{ fontSize: "11px", fontWeight: 500 }}
              >
                <Lightbulb size={11} />
                Try searching for
              </div>
              {suggestions.map((q) => (
                <button
                  key={`suggestion-${q}`}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-foreground/[0.06] transition-colors group"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectItem(q); }}
                >
                  <Sparkles size={13} className="text-primary/50 shrink-0" />
                  <span className="flex-1 text-foreground/80 truncate" style={{ fontSize: "13px" }}>{q}</span>
                  <ArrowUpRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}