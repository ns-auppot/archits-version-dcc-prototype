import {
  AccessRadarDiagram, DATA_STORES, IDENTITIES as RADAR_IDENTITIES,
  IDENTITY_META, IdentityPanelFilters, EMPTY_IDENTITY_FILTERS,
  countActiveFilters, passesIdentityFilter,
  FilterSection, IdentityFilterModal,
} from "./AccessRadarDiagram";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { PanelDropdown } from "./PanelDropdown";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, Search, ShieldCheck, ShieldOff,
  Database, Wifi, X, User, Bot, Globe, SlidersHorizontal,
} from "lucide-react";
import {
  DataMotionSankey,
  MOTION_DESTINATIONS,
  MOTION_DEST_IDS_WITH_HITS,
  MOTION_IDENTITY_IDS_WITH_HITS,
  MOTION_DATA_TYPES_WITH_HITS,
} from "./DataMotionSankey";
import { UNMANAGED_DESTINATIONS as UNMANAGED_DEST_LIST } from "./UnmanagedDestinationsTable";
import {
  IDENTITY_REGISTRY,
  IDENTITY_TYPE_GROUPS,
  MACHINE_TYPES,
  IdentityType,
} from "./identityRegistry";

// ── Canonical 57 data types ───────────────────────────────────────────────────

const DATA_TYPES_WITH_HITS = new Set([
  "Personal Names", "Driver Licenses", "Financial IDs", "Healthcare IDs",
  "Healthcare Provider IDs", "National IDs", "Passports", "Social Insurance Numbers",
  "Social Security Numbers", "Taxpayer IDs", "Telephone Numbers",
  "Vehicle License Plates", "Vehicle Registration Numbers", "Voter IDs",
  "Generic Identifiers", "Payment Cards", "Bank Account Information",
  "Medical Records", "Medical Diagnoses", "Medical Procedures", "Medical Specialties",
  "Medicinal Products", "Postal Addresses", "Postal Codes", "Birthdates",
  "Expiration Dates", "Dates", "Age", "Biometric Data", "Ethnicity and Race",
  "Gender", "Personal History", "Physical Characteristics", "Passwords",
  "Private Keys", "Public Keys", "Secrets and Tokens", "MAC Addresses", "UUIDs",
  "Domain Names", "Email Addresses", "IP Addresses", "URI Hosts", "URI Schemes",
  "Source Code", "Text Encodings", "Inappropriate Language", "Sentiment",
  "Region Identifiers", "Corporate Tax IDs", "Vehicle Information",
  "Banking Institutions", "Securities IDs", "Currency", "Company Names",
  "Healthcare Providers", "Numbers",
]);

function getHitCount(dt: string): number {
  const counts: Record<string, number> = {
    "Personal Names": 4218, "Email Addresses": 3842, "Social Security Numbers": 1247,
    "Telephone Numbers": 892, "Postal Addresses": 634, "Birthdates": 518,
    "Gender": 312, "Age": 189, "Ethnicity and Race": 156,
    "Driver Licenses": 89, "National IDs": 42, "Passports": 28, "Taxpayer IDs": 215,
    "Payment Cards": 1563, "Bank Account Information": 892, "Financial IDs": 734,
    "Medical Records": 1891, "Medical Diagnoses": 423, "Healthcare IDs": 312,
    "Healthcare Provider IDs": 178, "Biometric Data": 94,
    "Passwords": 567, "Private Keys": 34, "Secrets and Tokens": 123,
    "IP Addresses": 2341, "MAC Addresses": 456, "Domain Names": 678,
    "URI Hosts": 234, "UUIDs": 891, "Source Code": 1456, "Company Names": 312,
    "Social Insurance Numbers": 180, "Vehicle License Plates": 95,
    "Vehicle Registration Numbers": 72, "Voter IDs": 38, "Generic Identifiers": 210,
    "Medical Procedures": 145, "Medical Specialties": 88, "Medicinal Products": 63,
    "Postal Codes": 290, "Expiration Dates": 410, "Dates": 620,
    "Personal History": 55, "Physical Characteristics": 47, "Public Keys": 22,
    "URI Schemes": 180, "Text Encodings": 140, "Inappropriate Language": 65,
    "Sentiment": 38, "Region Identifiers": 195, "Corporate Tax IDs": 80,
    "Vehicle Information": 115, "Banking Institutions": 130, "Securities IDs": 98,
    "Currency": 245, "Healthcare Providers": 160, "Numbers": 520,
  };
  return counts[dt] || 0;
}

// ── Category grouping ────────────────────────────────────────────────────────

interface CategoryGroup { label: string; acronym: string; types: string[]; }

const CATEGORIES: CategoryGroup[] = [
  {
    label: "Personal Identifiers", acronym: "PII",
    types: [
      "Personal Names", "Driver Licenses", "Financial IDs", "Healthcare IDs",
      "Healthcare Provider IDs", "National IDs", "Passports", "Social Insurance Numbers",
      "Social Security Numbers", "Taxpayer IDs", "Telephone Numbers",
      "Vehicle License Plates", "Vehicle Registration Numbers", "Voter IDs",
      "Generic Identifiers",
    ],
  },
  {
    label: "Financial Data", acronym: "FIN",
    types: ["Payment Cards", "Bank Account Information", "Banking Institutions", "Securities IDs", "Currency", "Corporate Tax IDs"],
  },
  {
    label: "Health & Medical", acronym: "PHI",
    types: ["Medical Records", "Medical Diagnoses", "Medical Procedures", "Medical Specialties", "Medicinal Products", "Healthcare Providers", "Biometric Data"],
  },
  {
    label: "Location & Dates", acronym: "LOC",
    types: ["Postal Addresses", "Postal Codes", "Region Identifiers", "Birthdates", "Expiration Dates", "Dates", "Age"],
  },
  {
    label: "Personal Attributes", acronym: "PAT",
    types: ["Ethnicity and Race", "Gender", "Personal History", "Physical Characteristics"],
  },
  {
    label: "Credentials & Secrets", acronym: "PAI",
    types: ["Passwords", "Private Keys", "Public Keys", "Secrets and Tokens"],
  },
  {
    label: "Network & Technical", acronym: "NET",
    types: ["MAC Addresses", "UUIDs", "Domain Names", "Email Addresses", "IP Addresses", "URI Hosts", "URI Schemes", "Text Encodings", "Numbers"],
  },
  {
    label: "Content & Business", acronym: "BII",
    types: ["Source Code", "Company Names", "Vehicle Information", "Inappropriate Language", "Sentiment"],
  },
];

const MAX_SELECTIONS = 5;

// ── Start-from types ─────────────────────────────────────────────────────────

type RestStartFrom   = "dataType" | "dataStore" | "identity";
type MotionStartFrom = "dataType" | "dataDestination" | "identity";

// ── Data Store platform groups ───────────────────────────────────────────────

interface StorePlatformGroup { platformId: string; label: string; description: string; }

const STORE_PLATFORM_GROUPS: StorePlatformGroup[] = [
  { platformId: "google-drive", label: "Google Drive",  description: "acme-corp.google.com" },
  { platformId: "sharepoint",   label: "SharePoint",    description: "acme.sharepoint.com" },
  { platformId: "aws-s3",       label: "AWS S3",        description: "Amazon Simple Storage Service" },
  { platformId: "azure-blob",   label: "Azure Blob",    description: "Azure Blob Storage" },
  { platformId: "postgresql",   label: "PostgreSQL",    description: "On-premises instances" },
  { platformId: "oracle",       label: "Oracle",        description: "On-premises instances" },
  { platformId: "aws-rds",      label: "AWS RDS",       description: "Amazon Relational Database Service" },
  { platformId: "azure-sql",    label: "Azure SQL",     description: "Azure managed databases" },
  { platformId: "endpoint",     label: "Endpoint",      description: "User devices" },
];

// Map platform → store type (for "Data Store Type" filter)
const PLATFORM_STORE_TYPE: Record<string, string> = {
  "google-drive": "Unstructured",
  "sharepoint":   "Unstructured",
  "aws-s3":       "Unstructured",
  "azure-blob":   "Unstructured",
  "postgresql":   "Structured",
  "oracle":       "Structured",
  "aws-rds":      "Structured",
  "azure-sql":    "Structured",
  "endpoint":     "Endpoint",
};

const STORE_TYPE_OPTIONS = ["Structured", "Unstructured", "Endpoint"];

interface StoreFilters { platform: string[]; storeType: string[]; }
const EMPTY_STORE_FILTERS: StoreFilters = { platform: [], storeType: [] };

function countStoreFilters(f: StoreFilters) {
  let n = 0;
  if (f.platform.length > 0) n++;
  if (f.storeType.length > 0) n++;
  return n;
}

function StoreFilterModal({ filters, onApply, onClose, anchorRect }: {
  filters: StoreFilters;
  onApply: (f: StoreFilters) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggleSection = (key: string) => setExpandedSection((p) => (p === key ? null : key));
  const update = (next: StoreFilters) => onApply(next);
  const toggleArr = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const MODAL_W = 220;
  const viewH = window.innerHeight;
  const spaceBelow = viewH - anchorRect.bottom - 8;
  const spaceAbove = anchorRect.top - 8;
  let top: number;
  if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
    top = anchorRect.bottom + 4;
  } else {
    top = anchorRect.top - Math.min(400, spaceAbove) - 4;
  }
  const left = Math.min(anchorRect.right - MODAL_W, window.innerWidth - MODAL_W - 8);

  const hasChanges = countStoreFilters(filters) > 0;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed rounded-lg border border-border shadow-xl overflow-hidden"
      style={{ left, top, width: MODAL_W, background: "var(--color-card)", zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span style={{ fontSize: "12px", fontWeight: 600 }}>Filter Data Stores</span>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button type="button" onClick={() => update(EMPTY_STORE_FILTERS)}
              className="text-primary hover:underline" style={{ fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>
              Clear
            </button>
          )}
          <button type="button" onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {/* App / Platform */}
        <FilterSection label="App / Platform" count={filters.platform.length} open={expandedSection === "platform"} onToggle={() => toggleSection("platform")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {STORE_PLATFORM_GROUPS.map(({ platformId, label }) => (
              <label key={platformId} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={filters.platform.includes(platformId)}
                  onChange={() => update({ ...filters, platform: toggleArr(filters.platform, platformId) })}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Data Store Type */}
        <FilterSection label="Data Store Type" count={filters.storeType.length} open={expandedSection === "storeType"} onToggle={() => toggleSection("storeType")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {STORE_TYPE_OPTIONS.map((t) => (
              <label key={t} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={filters.storeType.includes(t)}
                  onChange={() => update({ ...filters, storeType: toggleArr(filters.storeType, t) })}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{t}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>,
    document.body
  );
}

// IDENTITY_TYPE_GROUPS is now imported from identityRegistry — 7 canonical types
// matching the main nav, used identically for both Data-at-Rest and Data-in-Motion.

// ── Destination filters ──────────────────────────────────────────────────────

interface DestFilters { destType: string[]; category: string[]; tag: string[]; }
const EMPTY_DEST_FILTERS: DestFilters = { destType: [], category: [], tag: [] };

function countDestFilters(f: DestFilters) {
  let n = 0;
  if (f.destType.length > 0)  n++;
  if (f.category.length > 0)  n++;
  if (f.tag.length > 0)       n++;
  return n;
}

// All unique unmanaged categories (for the Category filter section)
const UNMANAGED_CATEGORIES = [...new Set(UNMANAGED_DEST_LIST.map((d) => d.category))].sort();

function DestFilterModal({ filters, onApply, onClose, anchorRect }: {
  filters: DestFilters;
  onApply: (f: DestFilters) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggleSection = (key: string) => setExpandedSection((p) => (p === key ? null : key));
  const update = (next: DestFilters) => onApply(next);
  const toggleArr = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const MODAL_W = 220;
  const viewH = window.innerHeight;
  const spaceBelow = viewH - anchorRect.bottom - 8;
  const spaceAbove = anchorRect.top - 8;
  let top: number;
  if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
    top = anchorRect.bottom + 4;
  } else {
    top = anchorRect.top - Math.min(400, spaceAbove) - 4;
  }
  const left = Math.min(anchorRect.right - MODAL_W, window.innerWidth - MODAL_W - 8);

  const hasChanges = countDestFilters(filters) > 0;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed rounded-lg border border-border shadow-xl overflow-hidden"
      style={{ left, top, width: MODAL_W, background: "var(--color-card)", zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span style={{ fontSize: "12px", fontWeight: 600 }}>Filter Destinations</span>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button type="button" onClick={() => update(EMPTY_DEST_FILTERS)}
              className="text-primary hover:underline" style={{ fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>
              Clear
            </button>
          )}
          <button type="button" onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors" style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {/* Destination Type */}
        <FilterSection label="Destination Type" count={filters.destType.length} open={expandedSection === "destType"} onToggle={() => toggleSection("destType")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {([
              ["managed",     "Managed Data Stores"],
              ["unmanaged-app",     "Unmanaged Applications"],
              ["unmanaged-website", "Unmanaged Websites"],
            ] as const).map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={filters.destType.includes(val)}
                  onChange={() => update({ ...filters, destType: toggleArr(filters.destType, val) })}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{lbl}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Category */}
        <FilterSection label="Category" count={filters.category.length} open={expandedSection === "category"} onToggle={() => toggleSection("category")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {UNMANAGED_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={filters.category.includes(cat)}
                  onChange={() => update({ ...filters, category: toggleArr(filters.category, cat) })}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{cat}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Tag */}
        <FilterSection label="Tag" count={filters.tag.length} open={expandedSection === "tag"} onToggle={() => toggleSection("tag")}>
          <p className="text-muted-foreground/60 mt-1" style={{ fontSize: "9px" }}>
            Only applicable for Unmanaged Applications
          </p>
          <div className="flex flex-col gap-0.5 pt-1">
            {(["Sanctioned", "Unsanctioned"] as const).map((val) => (
              <label key={val} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={filters.tag.includes(val)}
                  onChange={() => update({ ...filters, tag: toggleArr(filters.tag, val) })}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{val}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>,
    document.body
  );
}

// ── "Has-data" sets for context-aware left-panel filtering ──────────────────

const REST_IDENTITY_IDS_WITH_ACCESS = new Set(RADAR_IDENTITIES.map((i) => i.id));
const REST_STORE_IDS_WITH_ACCESS    = new Set(DATA_STORES.filter((s) => s.dataTypes.length > 0).map((s) => s.id));
const REST_DATA_TYPES_WITH_STORES   = new Set(DATA_STORES.flatMap((s) => s.dataTypes));

// ── Start-from option definitions ────────────────────────────────────────────

const REST_OPTIONS: { mode: RestStartFrom; label: string }[] = [
  { mode: "identity",  label: "Identity"   },
  { mode: "dataType",  label: "Data Type"  },
  { mode: "dataStore", label: "Data Store" },
];

const MOTION_OPTIONS: { mode: MotionStartFrom; label: string }[] = [
  { mode: "identity",        label: "Identity"    },
  { mode: "dataType",        label: "Data Type"   },
  { mode: "dataDestination", label: "Destination" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function DataExplorerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"rest" | "motion">(() => searchParams.get("tab") === "motion" ? "motion" : "rest");

  // ── Start-from per tab ────────────────────────────────────────────────────
  const [restStartFrom,   setRestStartFrom]   = useState<RestStartFrom>("dataType");
  const [motionStartFrom, setMotionStartFrom] = useState<MotionStartFrom>("dataType");

  // ── Selection state ───────────────────────────────────────────────────────
  // selectedTypes is shared between tabs (same taxonomy)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  // Rest-tab only
  const [selectedStores,       setSelectedStores]       = useState<string[]>([]);
  // Motion-tab only
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  // Shared across both tabs — identity list is the same regardless of active tab
  const [selectedIdentities,   setSelectedIdentities]   = useState<string[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [filterText,  setFilterText]  = useState("");
  const [hideWithoutSensitive, setHideWithoutSensitive] = useState(false);
  const [graphFocused,setGraphFocused]= useState(false);
  const [identityTypeFilter, setIdentityTypeFilter] = useState<IdentityType>(IDENTITY_TYPE_GROUPS[0].typeId);
  const [identityFilters, setIdentityFilters] = useState<IdentityPanelFilters>(EMPTY_IDENTITY_FILTERS);
  const [identityFilterOpen, setIdentityFilterOpen] = useState(false);
  const [identityFilterAnchorRect, setIdentityFilterAnchorRect] = useState<DOMRect | null>(null);
  const identityFilterBtnRef = useRef<HTMLButtonElement>(null);
  const [storeFilters, setStoreFilters] = useState<StoreFilters>(EMPTY_STORE_FILTERS);
  const [storeFilterOpen, setStoreFilterOpen] = useState(false);
  const [storeFilterAnchorRect, setStoreFilterAnchorRect] = useState<DOMRect | null>(null);
  const storeFilterBtnRef = useRef<HTMLButtonElement>(null);
  const [destFilters, setDestFilters] = useState<DestFilters>(EMPTY_DEST_FILTERS);
  const [destFilterOpen, setDestFilterOpen] = useState(false);
  const [destFilterAnchorRect, setDestFilterAnchorRect] = useState<DOMRect | null>(null);
  const destFilterBtnRef = useRef<HTMLButtonElement>(null);


  // Seed type from URL — preserved across tab/startFrom resets on initial mount
  const seedType = useRef(searchParams.get('type') ? (() => {
    const incoming = searchParams.get('type')!;
    const allTypes = CATEGORIES.flatMap(c => c.types);
    const inLower  = incoming.toLowerCase();
    return allTypes.find(t => t.toLowerCase() === inLower)
      ?? allTypes.find(t => t.toLowerCase().includes(inLower) || inLower.includes(t.toLowerCase()))
      ?? null;
  })() : null);
  // After the first user interaction clears selections, we no longer restore the seed
  const seedConsumed = useRef(false);

  // Reset graphFocused + filter + all selections when switching tabs
  useEffect(() => {
    seedConsumed.current = true;
    setSelectedTypes([]);
    setSelectedStores([]);
    setSelectedDestinations([]);
    setSelectedIdentities([]);
    setGraphFocused(false);
    setFilterText("");
    setIdentityTypeFilter(IDENTITY_TYPE_GROUPS[0].typeId);
    setStoreFilters(EMPTY_STORE_FILTERS);
    setDestFilters(EMPTY_DEST_FILTERS);
  }, [activeTab]);

  // Reset rest selections when restStartFrom changes
  useEffect(() => {
    seedConsumed.current = true;
    setSelectedTypes([]);
    setSelectedStores([]);
    setSelectedIdentities([]);
    setGraphFocused(false);
  }, [restStartFrom]);

  // Reset motion selections when motionStartFrom changes
  useEffect(() => {
    seedConsumed.current = true;
    setSelectedTypes([]);
    setSelectedDestinations([]);
    setSelectedIdentities([]);
    setGraphFocused(false);
    setDestFilters(EMPTY_DEST_FILTERS);
  }, [motionStartFrom]);

  // Apply URL-seeded type after all mount resets have fired
  useEffect(() => {
    if (seedType.current) {
      setSelectedTypes([seedType.current]);
      seedType.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset graphFocused when all active items are cleared
  useEffect(() => {
    const restItems =
      restStartFrom === "dataType"  ? selectedTypes :
      restStartFrom === "dataStore" ? selectedStores : selectedIdentities;
    const motionItems =
      motionStartFrom === "dataType"        ? selectedTypes :
      motionStartFrom === "dataDestination" ? selectedDestinations : selectedIdentities;
    if (activeTab === "rest"   && restItems.length   === 0) setGraphFocused(false);
    if (activeTab === "motion" && motionItems.length  === 0) setGraphFocused(false);
  }, [selectedTypes, selectedStores, selectedIdentities, selectedDestinations,
      restStartFrom, motionStartFrom, activeTab]);

  // ── Max-selection popover ─────────────────────────────────────────────────
  const [maxPopover, setMaxPopover] = useState<{ x: number; y: number } | null>(null);
  const popoverTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { return () => { if (popoverTimer.current) clearTimeout(popoverTimer.current); }; }, []);

  const showMaxPopover = useCallback((e: React.MouseEvent) => {
    setMaxPopover({ x: e.clientX, y: e.clientY });
    if (popoverTimer.current) clearTimeout(popoverTimer.current);
    popoverTimer.current = setTimeout(() => setMaxPopover(null), 2000);
  }, []);

  // ── Context-aware "has-data" sets ─────────────────────────────────────────
  const activeDataTypesHitSet = useMemo(
    () => activeTab === "rest" ? REST_DATA_TYPES_WITH_STORES : MOTION_DATA_TYPES_WITH_HITS,
    [activeTab],
  );
  const activeIdentityHitSet = useMemo(
    () => activeTab === "rest" ? REST_IDENTITY_IDS_WITH_ACCESS : MOTION_IDENTITY_IDS_WITH_HITS,
    [activeTab],
  );

  // ── Selection handlers ────────────────────────────────────────────────────

  const handleSelectType = useCallback((dt: string, e: React.MouseEvent) => {
    if (!activeDataTypesHitSet.has(dt)) return;
    setSelectedTypes((prev) => {
      if (prev.includes(dt)) return prev.filter((t) => t !== dt);
      if (prev.length >= MAX_SELECTIONS) { showMaxPopover(e); return prev; }
      return [...prev, dt];
    });
  }, [showMaxPopover, activeDataTypesHitSet]);

  const handleSelectStore = useCallback((id: string) => {
    if (!REST_STORE_IDS_WITH_ACCESS.has(id)) return;
    setSelectedStores((prev) => prev.includes(id) ? [] : [id]);
  }, []);

  const handleSelectIdentity = useCallback((id: string, e: React.MouseEvent) => {
    if (!activeIdentityHitSet.has(id)) return;
    setSelectedIdentities((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_SELECTIONS) { showMaxPopover(e); return prev; }
      return [...prev, id];
    });
  }, [showMaxPopover, activeIdentityHitSet]);

  const handleSelectDestination = useCallback((id: string, e: React.MouseEvent) => {
    if (!MOTION_DEST_IDS_WITH_HITS.has(id)) return;
    setSelectedDestinations((prev) => {
      if (prev.includes(id)) return prev.filter((d) => d !== id);
      if (prev.length >= MAX_SELECTIONS) { showMaxPopover(e); return prev; }
      return [...prev, id];
    });
  }, [showMaxPopover]);



  // ── Derived active items ──────────────────────────────────────────────────

  const activeRestItems: string[] =
    restStartFrom === "dataType"  ? selectedTypes :
    restStartFrom === "dataStore" ? selectedStores : selectedIdentities;

  const activeMotionItems: string[] =
    motionStartFrom === "dataType"        ? selectedTypes :
    motionStartFrom === "dataDestination" ? selectedDestinations : selectedIdentities;

  const activeChips = activeTab === "rest" ? activeRestItems : activeMotionItems;

  // Chip labels — unified identity lookup for both tabs
  const getChipLabel = useCallback((id: string) => {
    if (activeTab === "rest") {
      if (restStartFrom === "dataType")  return id;
      if (restStartFrom === "dataStore") return DATA_STORES.find((s) => s.id === id)?.name ?? id;
      return IDENTITY_REGISTRY.find((i) => i.id === id)?.name ?? id;
    } else {
      if (motionStartFrom === "dataType") return id;
      if (motionStartFrom === "dataDestination") return MOTION_DESTINATIONS.find((d) => d.id === id)?.name ?? id;
      return IDENTITY_REGISTRY.find((i) => i.id === id)?.name ?? id;
    }
  }, [activeTab, restStartFrom, motionStartFrom]);

  const getActiveChipLabel = getChipLabel;

  const removeActiveChip = useCallback((id: string) => {
    if (activeTab === "rest") {
      if (restStartFrom === "dataType")  setSelectedTypes((p) => p.filter((t) => t !== id));
      else if (restStartFrom === "dataStore") setSelectedStores((p) => p.filter((s) => s !== id));
      else setSelectedIdentities((p) => p.filter((i) => i !== id));
    } else {
      if (motionStartFrom === "dataType")        setSelectedTypes((p) => p.filter((t) => t !== id));
      else if (motionStartFrom === "dataDestination") setSelectedDestinations((p) => p.filter((d) => d !== id));
      else setSelectedIdentities((p) => p.filter((i) => i !== id));
    }
  }, [activeTab, restStartFrom, motionStartFrom]);

  const clearActiveChips = useCallback(() => {
    if (activeTab === "rest") {
      if (restStartFrom === "dataType")  setSelectedTypes([]);
      else if (restStartFrom === "dataStore") setSelectedStores([]);
      else setSelectedIdentities([]);
    } else {
      if (motionStartFrom === "dataType")        setSelectedTypes([]);
      else if (motionStartFrom === "dataDestination") setSelectedDestinations([]);
      else setSelectedIdentities([]);
    }
  }, [activeTab, restStartFrom, motionStartFrom]);

  // ── Which list is visible in the left panel ───────────────────────────────

  const showStoreList     = activeTab === "rest"   && restStartFrom   === "dataStore";
  const showIdentityList  = (activeTab === "rest" ? restStartFrom : motionStartFrom) === "identity";
  const showDestinationList = activeTab === "motion" && motionStartFrom === "dataDestination";
  const showTypeList = !showStoreList && !showIdentityList && !showDestinationList;

  // ── Filtered lists ────────────────────────────────────────────────────────

  const lc = filterText.toLowerCase();

  const filteredCategories = useMemo(() => CATEGORIES.map((cat) => {
    const matching = cat.types.filter((t) => t.toLowerCase().includes(lc));
    return { ...cat, types: matching };
  }).filter((cat) => cat.types.length > 0), [lc]);

  const filteredStoreGroups = useMemo(() =>
    STORE_PLATFORM_GROUPS.map((g) => {
      if (storeFilters.platform.length > 0 && !storeFilters.platform.includes(g.platformId)) {
        return { ...g, stores: [], noHitCount: 0 };
      }
      if (storeFilters.storeType.length > 0 && !storeFilters.storeType.includes(PLATFORM_STORE_TYPE[g.platformId] ?? "")) {
        return { ...g, stores: [], noHitCount: 0 };
      }
      const matching = DATA_STORES.filter((s) =>
        s.platform === g.platformId &&
        (s.name.toLowerCase().includes(lc) || s.subtitle.toLowerCase().includes(lc) || g.label.toLowerCase().includes(lc))
      );
      const withAccess    = matching.filter((s) => REST_STORE_IDS_WITH_ACCESS.has(s.id));
      const withoutAccess = matching.filter((s) => !REST_STORE_IDS_WITH_ACCESS.has(s.id));
      const stores = hideWithoutSensitive ? withAccess : [...withAccess, ...withoutAccess];
      return { ...g, stores, noHitCount: withoutAccess.length };
    }).filter((g) => g.stores.length > 0),
  [lc, hideWithoutSensitive, storeFilters]);

  // Unified identity groups — context-aware for Data-at-Rest vs Data-in-Motion
  const filteredIdentityGroups = useMemo(() => {
    const hasFilters = countActiveFilters(identityFilters) > 0;
    return IDENTITY_TYPE_GROUPS.map((g) => {
      // Identity type filter hides entire groups
      if (identityFilters.identityType.length > 0 && !identityFilters.identityType.includes(g.typeId)) {
        return { ...g, identities: [], noHitCount: 0 };
      }
      const matching = IDENTITY_REGISTRY.filter((i) =>
        i.identityType === g.typeId &&
        (i.name.toLowerCase().includes(lc) || i.role.toLowerCase().includes(lc) || g.label.toLowerCase().includes(lc)) &&
        (!hasFilters || passesIdentityFilter(i.id, identityFilters))
      );
      const withHits    = matching.filter((i) => activeIdentityHitSet.has(i.id));
      const withoutHits = matching.filter((i) => !activeIdentityHitSet.has(i.id));
      const identities = hideWithoutSensitive ? withHits : [...withHits, ...withoutHits];
      return { ...g, identities, noHitCount: withoutHits.length };
    }).filter((g) => g.identities.length > 0);
  }, [lc, hideWithoutSensitive, activeIdentityHitSet, identityFilters]);

  // Org units for internal-user filter modal
  const internalUserOrgUnits = useMemo(() => {
    const units = new Set<string>();
    for (const id of Object.keys(IDENTITY_META)) {
      const meta = IDENTITY_META[id];
      if (meta) units.add(meta.orgUnit);
    }
    return [...units].sort();
  }, []);

  const filteredDestGroup = useMemo(() => {
    const matching = MOTION_DESTINATIONS.filter((d) => {
      const nameMatch = d.name.toLowerCase().includes(lc) || d.category.toLowerCase().includes(lc);
      if (!nameMatch) return false;
      // Destination Type filter
      if (destFilters.destType.length > 0) {
        const dtype = d.managed ? "managed" : d.category === "Website" ? "unmanaged-website" : "unmanaged-app";
        if (!destFilters.destType.includes(dtype)) return false;
      }
      // Category filter (unmanaged only)
      if (destFilters.category.length > 0 && !d.managed) {
        if (!destFilters.category.includes(d.category)) return false;
      }
      // Tag filter — only applies to unmanaged applications
      if (destFilters.tag.length > 0 && !d.managed && d.category !== "Website") {
        const unmanagedEntry = UNMANAGED_DEST_LIST.find((u) => u.id === d.id);
        const status = unmanagedEntry?.status ?? null;
        if (!status || !destFilters.tag.includes(status)) return false;
      }
      return true;
    });
    const withHits    = matching.filter((d) => MOTION_DEST_IDS_WITH_HITS.has(d.id));
    const withoutHits = matching.filter((d) => !MOTION_DEST_IDS_WITH_HITS.has(d.id));
    const dests = hideWithoutSensitive ? withHits : [...withHits, ...withoutHits];
    return { dests, noHitCount: withoutHits.length };
  }, [lc, hideWithoutSensitive, destFilters]);

  // ── Left panel visibility ─────────────────────────────────────────────────
  const leftVisible = !graphFocused;

  // ── Colors ────────────────────────────────────────────────────────────────
  const STORE_COLOR    = "#d4952a";
  const IDENTITY_COLOR = "#0ea584";
  const DEST_COLOR     = "#d4952a";
  const UNMANAGED_COLOR= "#64748b";

  // ── Start-from header row helpers ─────────────────────────────────────────
  const currentStartFrom = activeTab === "rest" ? restStartFrom : motionStartFrom;
  const startFromOptions = activeTab === "rest" ? REST_OPTIONS : MOTION_OPTIONS;

  const handleStartFromClick = useCallback((mode: RestStartFrom | MotionStartFrom) => {
    if (activeTab === "rest") setRestStartFrom(mode as RestStartFrom);
    else setMotionStartFrom(mode as MotionStartFrom);
  }, [activeTab]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex bg-nav-bg border-b border-border shrink-0">
        {/* Left section — fixed 340px to align with left panel */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-r border-border shrink-0"
          style={{ width: 340, minWidth: 340 }}
        >
          <button
            onClick={() => navigate("/inventory")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-text-bright transition-colors cursor-pointer"
            style={{ fontSize: "13px" }}
          >
            <ArrowLeft size={14} />
            Back to Inventory
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-text-bright" style={{ fontSize: "13px", fontWeight: 500 }}>
            Data Explorer
          </span>
        </div>

        {/* Right section — tab toggle + start from */}
        <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
          {/* Tab toggle */}
          <div className="flex items-center bg-surface-raised rounded-lg p-0.5 border border-border shrink-0">
            <button
              onClick={() => setActiveTab("rest")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeTab === "rest" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              style={{ fontSize: "12px" }}
            >
              <Database size={13} />
              Data at Rest
            </button>
            <button
              onClick={() => setActiveTab("motion")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeTab === "motion" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              style={{ fontSize: "12px" }}
            >
              <Wifi size={13} />
              Data in Motion
            </button>
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Start From */}
          <span
            className="text-muted-foreground/40 shrink-0 select-none"
            style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.04em" }}
          >
            Start from
          </span>
          <div className="flex items-center gap-1">
            {startFromOptions.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => handleStartFromClick(mode)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer border ${
                  currentStartFrom === mode
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-surface-raised border-transparent"
                }`}
                style={{ fontSize: "11px" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left panel ───────────────────────────────────────────────── */}
        <div
          className="flex flex-col border-r border-border bg-nav-bg shrink-0 min-h-0"
          style={{
            width: leftVisible ? 340 : 0,
            minWidth: 0,
            overflow: "hidden",
            opacity: leftVisible ? 1 : 0,
            pointerEvents: leftVisible ? "auto" : "none",
            transition: "width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
          }}
        >
          <div className="flex flex-col min-h-0" style={{ width: 340, minWidth: 340, flex: 1 }}>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* ── Data Type list (shared for both tabs) ──────────── */}
              {showTypeList && (
                <div className="sticky top-0 bg-nav-bg/95 backdrop-blur-sm z-20">
                  <div className="px-3 py-2.5">
                    <div className="relative flex items-center bg-surface-raised border border-border rounded-lg">
                      <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Search data types…"
                        className="w-full pl-8 pr-3 py-1.5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                        style={{ fontSize: "12px" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center px-3 py-1.5">
                    <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
                      {filteredCategories.reduce((s, cat) => s + cat.types.length, 0)} items
                    </span>
                  </div>
                </div>
              )}
              {showTypeList && filteredCategories.map((cat) => (
                <div key={cat.label}>
                  <div className="px-3 pt-3 pb-1.5 sticky top-0 bg-nav-bg/95 backdrop-blur-sm z-10">
                    <div className="text-text-bright tracking-wide" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.03em" }}>
                      {cat.acronym}
                    </div>
                    <div className="text-muted-foreground/60" style={{ fontSize: "9.5px", letterSpacing: "0.01em" }}>
                      {cat.label}
                    </div>
                  </div>
                  {cat.types.map((dt) => {
                    const hasHits = activeDataTypesHitSet.has(dt);
                    const isSelected = selectedTypes.includes(dt);
                    return (
                      <button
                        key={dt}
                        onClick={(e) => handleSelectType(dt, e)}
                        className={`group/hitcount w-full relative flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                          isSelected ? "bg-primary/10 border-r-2 border-primary"
                            : hasHits ? "hover:bg-foreground/[0.04]"
                            : "opacity-50 cursor-default"
                        }`}
                      >
                        {/* Tooltip — shown on hover of the whole row */}
                        {hasHits && (() => {
                          const total = getHitCount(dt);
                          const ratio = (dt.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 40 + 30) / 100;
                          const files = Math.round(total * ratio);
                          const cols = total - files;
                          return (
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 hidden group-hover/hitcount:flex flex-col gap-1 bg-background border border-border rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap">
                              <span className="flex items-center justify-between gap-3 text-muted-foreground" style={{ fontSize: "11px" }}>
                                Files <span className="tabular-nums text-text-bright" style={{ fontWeight: 600 }}>{files.toLocaleString()}</span>
                              </span>
                              <span className="flex items-center justify-between gap-3 text-muted-foreground" style={{ fontSize: "11px" }}>
                                Columns <span className="tabular-nums text-text-bright" style={{ fontWeight: 600 }}>{cols.toLocaleString()}</span>
                              </span>
                            </span>
                          );
                        })()}
                        <div className={`shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                          isSelected ? "bg-primary border-primary"
                            : hasHits ? "border-border" : "border-border/50"
                        }`}>
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        {hasHits ? <ShieldCheck size={13} style={{ color: "#e05252" }} /> : <ShieldOff size={13} className="text-muted-foreground/40" />}
                        <span className={`flex-1 truncate ${hasHits ? "text-foreground" : "text-muted-foreground/60"}`} style={{ fontSize: "12px" }}>
                          {dt}
                        </span>
                        {hasHits ? (
                          <span className="shrink-0 text-text-dim tabular-nums" style={{ fontSize: "11px" }}>{getHitCount(dt).toLocaleString()}</span>
                        ) : (
                          <span className="shrink-0 text-muted-foreground/60 italic" style={{ fontSize: "10px" }}>No hits</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* ── Data Store list (rest / dataStore) ─────────────── */}
              {showStoreList && (
                <>
                  <div className="sticky top-0 bg-nav-bg/95 backdrop-blur-sm z-10">
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 flex items-center bg-surface-raised border border-border rounded-lg">
                          <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Search data stores…"
                            className="w-full pl-8 pr-3 py-1.5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{ fontSize: "12px" }}
                          />
                        </div>
                        {(() => {
                          const activeCount = countStoreFilters(storeFilters);
                          return (
                            <button
                              ref={storeFilterBtnRef}
                              type="button"
                              title="Filter"
                              onClick={() => {
                                const rect = storeFilterBtnRef.current?.getBoundingClientRect();
                                if (rect) setStoreFilterAnchorRect(rect);
                                setStoreFilterOpen((o) => !o);
                              }}
                              className={`shrink-0 flex items-center justify-center rounded-lg border transition-colors ${activeCount > 0 ? "text-primary bg-primary/10 border-primary/40" : "text-muted-foreground border-border hover:text-foreground hover:bg-surface-raised"}`}
                              style={{ width: 30, height: 30, background: "none", cursor: "pointer", position: "relative" }}
                            >
                              <SlidersHorizontal size={13} />
                              {activeCount > 0 && (
                                <span style={{
                                  position: "absolute", top: -5, right: -5,
                                  minWidth: 14, height: 14, borderRadius: 7,
                                  background: "var(--primary)", color: "#fff",
                                  fontSize: "9px", fontWeight: 700, lineHeight: "14px",
                                  textAlign: "center", padding: "0 3px",
                                  pointerEvents: "none",
                                }}>
                                  {activeCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                      {storeFilterOpen && storeFilterAnchorRect && (
                        <StoreFilterModal
                          filters={storeFilters}
                          onApply={(f) => setStoreFilters(f)}
                          onClose={() => setStoreFilterOpen(false)}
                          anchorRect={storeFilterAnchorRect}
                        />
                      )}
                    </div>
                    <div className="flex items-center px-3 py-1.5">
                      <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
                        {filteredStoreGroups.reduce((s, g) => s + g.stores.length, 0)} items
                      </span>
                    </div>
                  </div>
                  {filteredStoreGroups.length === 0 && (
                    <div className="px-3 py-4 text-muted-foreground/50 text-center" style={{ fontSize: "12px" }}>No stores match "{filterText}"</div>
                  )}
                  {filteredStoreGroups.map((group) => (
                    <div key={group.label}>
                      {group.stores.map((store) => {
                        const hasAccess = REST_STORE_IDS_WITH_ACCESS.has(store.id);
                        const isSelected = selectedStores.includes(store.id);
                        return (
                          <button key={store.id} onClick={() => handleSelectStore(store.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                              isSelected ? "bg-primary/10 border-r-2 border-primary"
                                : hasAccess ? "hover:bg-foreground/[0.04]"
                                : "opacity-50 cursor-default"
                            }`}
                          >
                            <div className={`shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected ? "border-primary" : hasAccess ? "border-border" : "border-border/50"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <Database size={13} style={{ color: hasAccess ? STORE_COLOR : "var(--muted-foreground)" }} />
                            <span className={`flex-1 truncate ${hasAccess ? "text-foreground" : "text-muted-foreground/60"}`} style={{ fontSize: "12px" }}>{store.name}</span>
                            {hasAccess ? (
                              <span className="shrink-0 text-text-dim tabular-nums" style={{ fontSize: "11px" }}>{store.dataTypes.length}</span>
                            ) : (
                              <span className="shrink-0 text-muted-foreground/60 italic" style={{ fontSize: "10px" }}>No sensitive data stored</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {/* ── Identity list (rest / identity) ───────────── */}
              {showIdentityList && (
                <>
                  <div className="sticky top-0 bg-nav-bg/95 backdrop-blur-sm z-10">
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 flex items-center bg-surface-raised border border-border rounded-lg">
                          <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Search identities…"
                            className="w-full pl-8 pr-3 py-1.5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{ fontSize: "12px" }}
                          />
                        </div>
                        {(() => {
                          const activeCount = countActiveFilters(identityFilters);
                          return (
                            <button
                              ref={identityFilterBtnRef}
                              type="button"
                              title="Filter"
                              onClick={() => {
                                const rect = identityFilterBtnRef.current?.getBoundingClientRect();
                                if (rect) setIdentityFilterAnchorRect(rect);
                                setIdentityFilterOpen((o) => !o);
                              }}
                              className={`shrink-0 flex items-center justify-center rounded-lg border transition-colors ${activeCount > 0 ? "text-primary bg-primary/10 border-primary/40" : "text-muted-foreground border-border hover:text-foreground hover:bg-surface-raised"}`}
                              style={{ width: 30, height: 30, background: "none", cursor: "pointer", position: "relative" }}
                            >
                              <SlidersHorizontal size={13} />
                              {activeCount > 0 && (
                                <span style={{
                                  position: "absolute", top: -5, right: -5,
                                  minWidth: 14, height: 14, borderRadius: 7,
                                  background: "var(--primary)", color: "#fff",
                                  fontSize: "9px", fontWeight: 700, lineHeight: "14px",
                                  textAlign: "center", padding: "0 3px",
                                  pointerEvents: "none",
                                }}>
                                  {activeCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                      {identityFilterOpen && identityFilterAnchorRect && (
                        <IdentityFilterModal
                          filters={identityFilters}
                          onApply={(f) => setIdentityFilters(f)}
                          onClose={() => setIdentityFilterOpen(false)}
                          identityIds={internalUserOrgUnits.length > 0 ? Object.keys(IDENTITY_META) : []}
                          anchorRect={identityFilterAnchorRect}
                        />
                      )}
                    </div>
                    <div className="flex items-center px-3 py-1.5">
                      <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
                        {filteredIdentityGroups.reduce((s, g) => s + g.identities.length, 0)} items
                      </span>
                    </div>
                  </div>
                  {filteredIdentityGroups.length === 0 && (
                    <div className="px-3 py-4 text-muted-foreground/50 text-center" style={{ fontSize: "12px" }}>No identities match</div>
                  )}
                  {filteredIdentityGroups.map((group) => (
                    <div key={group.label}>
                      {group.identities.map((identity) => {
                        const hasData = activeIdentityHitSet.has(identity.id);
                        const isSelected = selectedIdentities.includes(identity.id);
                        const isMachine = MACHINE_TYPES.has(identity.identityType);
                        return (
                          <button key={identity.id} onClick={(e) => handleSelectIdentity(identity.id, e)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                              isSelected ? "bg-primary/10 border-r-2 border-primary"
                                : hasData ? "hover:bg-foreground/[0.04]"
                                : "opacity-50 cursor-default"
                            }`}
                          >
                            <div className={`shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                              isSelected ? "bg-primary border-primary"
                                : hasData ? "border-border" : "border-border/50"
                            }`}>
                              {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            {isMachine
                              ? <Bot size={13} style={{ color: hasData ? IDENTITY_COLOR : "var(--muted-foreground)" }} />
                              : <User size={13} style={{ color: hasData ? IDENTITY_COLOR : "var(--muted-foreground)" }} />
                            }
                            <span className={`flex-1 truncate ${hasData ? "text-foreground" : "text-muted-foreground/60"}`} style={{ fontSize: "12px" }}>{identity.name}</span>
                            {hasData && identity.email ? (
                              <span className="shrink-0 text-muted-foreground/50 truncate max-w-[120px]" style={{ fontSize: "10px" }}>{identity.email}</span>
                            ) : !hasData ? (
                              <span className="shrink-0 text-muted-foreground/60 italic" style={{ fontSize: "10px" }}>No sensitive data access</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {/* ── Destination list (motion / dataDestination) ─────── */}
              {showDestinationList && (
                <>
                  <div className="sticky top-0 bg-nav-bg/95 backdrop-blur-sm z-10">
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 flex items-center bg-surface-raised border border-border rounded-lg">
                          <Search size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Search destinations…"
                            className="w-full pl-8 pr-3 py-1.5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{ fontSize: "12px" }}
                          />
                        </div>
                        {(() => {
                          const activeCount = countDestFilters(destFilters);
                          return (
                            <button
                              ref={destFilterBtnRef}
                              type="button"
                              title="Filter"
                              onClick={() => {
                                const rect = destFilterBtnRef.current?.getBoundingClientRect();
                                if (rect) setDestFilterAnchorRect(rect);
                                setDestFilterOpen((o) => !o);
                              }}
                              className={`shrink-0 flex items-center justify-center rounded-lg border transition-colors ${activeCount > 0 ? "text-primary bg-primary/10 border-primary/40" : "text-muted-foreground border-border hover:text-foreground hover:bg-surface-raised"}`}
                              style={{ width: 30, height: 30, background: "none", cursor: "pointer", position: "relative" }}
                            >
                              <SlidersHorizontal size={13} />
                              {activeCount > 0 && (
                                <span style={{
                                  position: "absolute", top: -5, right: -5,
                                  minWidth: 14, height: 14, borderRadius: 7,
                                  background: "var(--primary)", color: "#fff",
                                  fontSize: "9px", fontWeight: 700, lineHeight: "14px",
                                  textAlign: "center", padding: "0 3px",
                                  pointerEvents: "none",
                                }}>
                                  {activeCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                      {destFilterOpen && destFilterAnchorRect && (
                        <DestFilterModal
                          filters={destFilters}
                          onApply={(f) => setDestFilters(f)}
                          onClose={() => setDestFilterOpen(false)}
                          anchorRect={destFilterAnchorRect}
                        />
                      )}
                    </div>
                    <div className="flex items-center px-3 py-1.5">
                      <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
                        {filteredDestGroup.dests.length} items
                      </span>
                    </div>
                  </div>
                  {filteredDestGroup.dests.length === 0 && filteredDestGroup.noHitCount === 0 && (
                    <div className="px-3 py-4 text-muted-foreground/50 text-center" style={{ fontSize: "12px" }}>No destinations match "{filterText}"</div>
                  )}
                  {filteredDestGroup.dests.map((dest) => {
                    const hasHits = MOTION_DEST_IDS_WITH_HITS.has(dest.id);
                    const isSelected = selectedDestinations.includes(dest.id);
                    return (
                      <button key={dest.id} onClick={(e) => handleSelectDestination(dest.id, e)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                          isSelected ? "bg-primary/10 border-r-2 border-primary"
                            : hasHits ? "hover:bg-foreground/[0.04]"
                            : "opacity-50 cursor-default"
                        }`}
                      >
                        <div className={`shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                          isSelected ? "bg-primary border-primary"
                            : hasHits ? "border-border" : "border-border/50"
                        }`}>
                          {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        {dest.managed
                          ? <Database size={13} style={{ color: hasHits ? DEST_COLOR : "var(--muted-foreground)" }} />
                          : <Globe size={13} style={{ color: hasHits ? UNMANAGED_COLOR : "var(--muted-foreground)" }} />
                        }
                        <span className={`flex-1 truncate ${hasHits ? "text-foreground" : "text-muted-foreground/60"}`} style={{ fontSize: "12px" }}>{dest.name}</span>
                        {hasHits ? (
                          <span className="shrink-0 text-muted-foreground/40" style={{ fontSize: "10px" }}>{dest.category}</span>
                        ) : (
                          <span className="shrink-0 text-muted-foreground/60 italic" style={{ fontSize: "10px" }}>no events</span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sticky bottom toggle */}
            <div className="shrink-0 border-t border-border bg-nav-bg px-3 py-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideWithoutSensitive}
                  onClick={() => setHideWithoutSensitive((v) => !v)}
                  className={`relative inline-flex shrink-0 items-center rounded-full transition-colors cursor-pointer ${hideWithoutSensitive ? "bg-primary" : "bg-border"}`}
                  style={{ width: 26, height: 14 }}
                >
                  <span
                    className="inline-block rounded-full bg-white shadow transition-transform"
                    style={{ width: 10, height: 10, transform: hideWithoutSensitive ? "translateX(14px)" : "translateX(2px)" }}
                  />
                </button>
                <span className="text-muted-foreground/70" style={{ fontSize: "11px" }}>
                  {showStoreList
                    ? "Hide no sensitive data stored"
                    : showIdentityList
                    ? "Hide no sensitive data access"
                    : showDestinationList
                    ? "Hide no sensitive data events"
                    : "Hide no sensitive data"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Right panel: visualization ────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">

          {/* Header: chip row only */}
          <div className="shrink-0 border-b border-border">

            {/* Selected chips */}
            {activeChips.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-2.5 flex-wrap">
                {activeChips.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20"
                    style={{ fontSize: "11px" }}
                  >
                    <span
                      style={{ maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={getActiveChipLabel(id)}
                    >
                      {getActiveChipLabel(id)}
                    </span>
                    <button
                      onClick={() => removeActiveChip(id)}
                      className="hover:text-primary-foreground hover:bg-primary rounded-sm p-0.5 transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearActiveChips}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer border border-border/50"
                  style={{ fontSize: "11px" }}
                >
                  Clear Selections
                </button>
              </div>
            )}
          </div>

          {/* Visualization area */}
          {activeTab === "rest" ? (
            <AccessRadarDiagram
              startFrom={restStartFrom}
              selectedItems={activeRestItems}
              onGraphFocusChange={setGraphFocused}
            />
          ) : (
            <DataMotionSankey
              startFrom={motionStartFrom}
              selectedItems={activeMotionItems}
              onGraphFocusChange={setGraphFocused}
            />
          )}
        </div>
      </div>

      {/* Max selection popover */}
      {maxPopover && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground shadow-lg"
          style={{
            left: maxPopover.x + 12,
            top: maxPopover.y - 16,
            fontSize: "11px",
            fontWeight: 500,
            pointerEvents: "none",
          }}
        >
          Maximum {MAX_SELECTIONS} selections reached
        </div>
      )}
    </div>
  );
}