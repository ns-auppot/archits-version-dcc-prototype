/**
 * Shared identity / access tab infrastructure for IaaS & On-Prem data store panels.
 * Provides the filter toolbar (search + identity type + status pills),
 * the identity card component, and related types/constants.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback, type ElementType } from "react";
import { Search, X, Plus, ChevronDown, Filter, User, Server } from "lucide-react";

// ── Identity type visual config ──────────────────────────────────────────────

export const IDENTITY_TYPE_CONFIG: Record<string, { badge: string; label: string; avatar: string; Icon: ElementType }> = {
  "internal-user":      { badge: "bg-blue-500/15 text-blue-500",       label: "Internal user",   avatar: "text-slate-500 dark:text-slate-300", Icon: User   },
  "external-user":      { badge: "bg-orange-500/15 text-orange-500",   label: "External user",   avatar: "text-slate-500 dark:text-slate-300", Icon: User   },
  "unknown-identity":   { badge: "bg-red-500/15 text-red-500",         label: "Unauthenticated", avatar: "text-slate-500 dark:text-slate-300", Icon: User   },
  "unmapped-local-user":{ badge: "bg-purple-500/15 text-purple-500",   label: "Unmapped",        avatar: "text-slate-500 dark:text-slate-300", Icon: User   },
  "service-account":    { badge: "bg-emerald-500/15 text-emerald-500", label: "Service Account", avatar: "text-slate-500 dark:text-slate-300", Icon: Server },
  "connected-app":      { badge: "bg-pink-500/15 text-pink-500",       label: "Connected App",   avatar: "text-slate-500 dark:text-slate-300", Icon: Server },
};

export const IDENTITY_FILTER_GROUPS: { typeId: string; label: string; dotClass: string }[] = [
  { typeId: "internal-user",      label: "Internal user",      dotClass: "bg-blue-400"    },
  { typeId: "external-user",      label: "External user",      dotClass: "bg-orange-400"  },
  { typeId: "unknown-identity",   label: "Unauthenticated",    dotClass: "bg-red-400"     },
  { typeId: "unmapped-local-user",label: "Unmapped",           dotClass: "bg-purple-400"  },
  { typeId: "service-account",    label: "Service Account",    dotClass: "bg-emerald-400" },
  { typeId: "connected-app",      label: "Connected App",      dotClass: "bg-pink-400"    },
];

// ── DB role & auth type configs (for structured tables) ──────────────────────

export const DB_ROLE_CONFIG: Record<string, { color: string; label: string }> = {
  superuser: { color: "text-red-400 bg-red-500/10",         label: "Superuser" },
  owner:     { color: "text-orange-400 bg-orange-500/10",   label: "Owner" },
  admin:     { color: "text-red-400 bg-red-500/10",         label: "Admin" },
  readwrite: { color: "text-sky-400 bg-sky-500/10",         label: "Read / Write" },
  readonly:  { color: "text-emerald-400 bg-emerald-500/10", label: "Read Only" },
};

export const AUTH_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  iam:    { color: "text-amber-400 bg-amber-500/10",   label: "IAM" },
  aad:    { color: "text-violet-400 bg-violet-500/10", label: "Azure AD" },
  native: { color: "text-slate-400 bg-slate-500/10",   label: "Native Auth" },
};

// ── Role member pool ─────────────────────────────────────────────────────────

export const ROLE_MEMBER_POOL = [
  { name: "Alice Chen",        email: "alice.chen@acme.com",          memberType: "user"    as const, identityKey: "internal-user" },
  { name: "James Okafor",      email: "james.okafor@acme.com",        memberType: "user"    as const, identityKey: "internal-user" },
  { name: "Margaret Sullivan", email: "margaret.sullivan@acme.com",   memberType: "user"    as const, identityKey: "internal-user" },
  { name: "David Kim",         email: "david.kim@acme.com",           memberType: "user"    as const, identityKey: "internal-user" },
  { name: "Rachel Wu",         email: "rachel.wu@acme.com",           memberType: "user"    as const, identityKey: "internal-user" },
  { name: "Priya Sharma",      email: "priya.sharma@acme.com",        memberType: "user"    as const, identityKey: "internal-user" },
  { name: "Sofia Novak",       email: "sofia.novak@acme-emea.com",    memberType: "user"    as const, identityKey: "external-user" },
  { name: "Alex Johansson",    email: "alex.johansson@acme-emea.com", memberType: "user"    as const, identityKey: "external-user" },
  { name: "Thomas Becker",     email: "t.becker@consultant.io",       memberType: "user"    as const, identityKey: "external-user" },
  { name: "ml-training-svc",              memberType: "service" as const, identityKey: "service-account" },
  { name: "sagemaker-training-svc",       memberType: "service" as const, identityKey: "service-account" },
  { name: "spark-cluster-svc",            memberType: "service" as const, identityKey: "service-account" },
  { name: "archive-ingestion-svc",        memberType: "service" as const, identityKey: "service-account" },
  { name: "analytics-pipeline-svc",       memberType: "service" as const, identityKey: "service-account" },
  { name: "lambda-data-svc",              memberType: "service" as const, identityKey: "service-account" },
  { name: "etl-pipeline-svc",             memberType: "service" as const, identityKey: "service-account" },
  { name: "reporting-agent-svc",          memberType: "service" as const, identityKey: "service-account" },
  { name: "backup-service-acct",          memberType: "service" as const, identityKey: "service-account" },
];

export function getRoleMembers(roleName: string) {
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) hash = (hash * 31 + roleName.charCodeAt(i)) & 0xffff;
  const count = 2 + (hash % 4);
  const used = new Set<number>();
  const members: typeof ROLE_MEMBER_POOL = [];
  for (let i = 0; i < count; i++) {
    let idx = (hash + i * 7) % ROLE_MEMBER_POOL.length;
    while (used.has(idx)) idx = (idx + 1) % ROLE_MEMBER_POOL.length;
    used.add(idx);
    members.push(ROLE_MEMBER_POOL[idx]);
  }
  return members;
}

// ── Classify helpers ─────────────────────────────────────────────────────────

export type IdentityTypeName = "internal-user" | "external-user" | "unknown-identity" | "unmapped-local-user" | "service-account" | "connected-app";

export function classifyCloudPrincipal(principal: string, principalType: "user" | "service", stale: boolean): IdentityTypeName {
  if (principalType === "service") return "service-account";
  // stale is tracked via the `stale` boolean field — preserve the real identity type
  if (principal.includes("@acme.com")) return "internal-user";
  if (principal.includes("@")) return "external-user";
  return "internal-user";
}

export function classifyRoleMember(identityKey: string, stale: boolean): IdentityTypeName {
  // stale is tracked via the `stale` boolean field — preserve the real identity type
  if (identityKey === "service-account") return "service-account";
  if (identityKey === "connected-app") return "connected-app";
  if (identityKey === "external-user") return "external-user";
  return "internal-user";
}

// ── Unified identity type ────────────────────────────────────────────────────

export interface UnifiedIdentity {
  key: string;
  name: string;
  email?: string;
  identityType: IdentityTypeName;
  assignedRoles: string[];
  permissions: string[];
  lastAccess: string;
  stale: boolean;
  sensitiveAccess: boolean;
  source?: "cloud" | "db";
  dbRole?: string;
  authType?: string;
}

// ── AccessFilter type ────────────────────────────────────────────────────────

export type AccessFilter = "sensitive" | "stale" | null;

// ── useIdentityFilters hook ──────────────────────────────────────────────────
/** Encapsulates all filter state for the identity tab. */

export function useIdentityFilters(allIdentities: UnifiedIdentity[], accessFilter: AccessFilter) {
  const [accessSearch, setAccessSearch] = useState("");
  const [identityTypeFilter, setIdentityTypeFilter] = useState<string[]>([]);
  const [identityTypeDropdownOpen, setIdentityTypeDropdownOpen] = useState(false);
  const identityTypeDropdownRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<"active" | "stale" | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Sync incoming accessFilter → local status
  useEffect(() => {
    if (accessFilter === "stale") setStatusFilter("stale");
  }, [accessFilter]);

  // Outside-click handlers
  useEffect(() => {
    if (!identityTypeDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (identityTypeDropdownRef.current && !identityTypeDropdownRef.current.contains(e.target as Node)) {
        setIdentityTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [identityTypeDropdownOpen]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropdownOpen]);

  const filteredIdentities = useMemo(() => {
    let result = allIdentities;
    if (accessFilter === "sensitive")    result = result.filter(id => id.sensitiveAccess);
    if (identityTypeFilter.length > 0)   result = result.filter(id => identityTypeFilter.includes(id.identityType));
    if (statusFilter === "stale")        result = result.filter(id => id.stale);
    if (statusFilter === "active")       result = result.filter(id => !id.stale);
    if (accessSearch) {
      const term = accessSearch.toLowerCase();
      result = result.filter(id => id.name.toLowerCase().includes(term) || id.identityType.toLowerCase().includes(term));
    }
    return result;
  }, [allIdentities, accessFilter, identityTypeFilter, statusFilter, accessSearch]);

  const hasAnyFilter = !!accessFilter || identityTypeFilter.length > 0 || !!statusFilter || !!accessSearch;

  return {
    accessSearch, setAccessSearch,
    identityTypeFilter, setIdentityTypeFilter,
    identityTypeDropdownOpen, setIdentityTypeDropdownOpen,
    identityTypeDropdownRef,
    statusFilter, setStatusFilter,
    statusDropdownOpen, setStatusDropdownOpen,
    statusDropdownRef,
    filteredIdentities,
    hasAnyFilter,
  };
}

// ── SensitiveAccessBanner ────────────────────────────────────────────────────

export function SensitiveAccessBanner({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-border -mb-1">
      <Filter size={11} className="text-muted-foreground" />
      <span className="flex-1 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
        Filtered: Identities with sensitive access
      </span>
      <button onClick={onClear} className="text-muted-foreground hover:text-text-bright transition-colors shrink-0">
        <X size={12} />
      </button>
    </div>
  );
}

// ── IdentityFilterToolbar ────────────────────────────────────────────────────
/** Renders the search input + Identity Type pill + Status pill + dropdowns. */

export function IdentityFilterToolbar({
  filters,
  accessFilter,
  onClearFilter,
}: {
  filters: ReturnType<typeof useIdentityFilters>;
  accessFilter: AccessFilter;
  onClearFilter: () => void;
}) {
  const {
    accessSearch, setAccessSearch,
    identityTypeFilter, setIdentityTypeFilter,
    identityTypeDropdownOpen, setIdentityTypeDropdownOpen,
    identityTypeDropdownRef,
    statusFilter, setStatusFilter,
    statusDropdownOpen, setStatusDropdownOpen,
    statusDropdownRef,
  } = filters;

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={accessSearch}
          onChange={(e) => setAccessSearch(e.target.value)}
          placeholder="Search identities..."
          className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-text-bright placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          style={{ fontSize: "12px" }}
        />
        {accessSearch && (
          <button type="button" onClick={() => setAccessSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-bright">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Identity Type */}
        <div ref={identityTypeDropdownRef} className="relative">
          {identityTypeFilter.length > 0 ? (
            <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 overflow-hidden">
              <button type="button"
                onClick={() => setIdentityTypeDropdownOpen(true)}
                className="inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] text-primary hover:bg-primary/10 transition-colors"
                style={{ fontSize: "10px", fontWeight: 500 }}>
                <span className="text-primary/60" style={{ fontSize: "10px" }}>⊗</span>
                Identity Type
                <span className="text-primary/50 mx-0.5">|</span>
                <span className="truncate max-w-[100px]">
                  {identityTypeFilter.length === 1
                    ? IDENTITY_FILTER_GROUPS.find(g => g.typeId === identityTypeFilter[0])?.label ?? identityTypeFilter[0]
                    : `${identityTypeFilter.length} selected`}
                </span>
                <ChevronDown size={9} className="ml-0.5 opacity-60" />
              </button>
              <button type="button" onClick={() => setIdentityTypeFilter([])}
                className="pl-0.5 pr-2 py-[3px] text-primary/50 hover:text-primary transition-colors" aria-label="Clear identity type filter">
                <X size={9} />
              </button>
            </div>
          ) : (
            <button type="button"
              onClick={() => setIdentityTypeDropdownOpen(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                identityTypeDropdownOpen
                  ? "border-primary/40 text-primary bg-primary/10"
                  : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
              }`}
              style={{ fontSize: "10px", fontWeight: 400 }}>
              <Plus size={9} />
              Identity Type
            </button>
          )}

          {identityTypeDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Identity Type</span>
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {IDENTITY_FILTER_GROUPS.map((g) => (
                  <label key={g.typeId} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                    <input
                      type="checkbox"
                      checked={identityTypeFilter.includes(g.typeId)}
                      onChange={() => {
                        setIdentityTypeFilter(prev =>
                          prev.includes(g.typeId) ? prev.filter(t => t !== g.typeId) : [...prev, g.typeId]
                        );
                      }}
                      className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                    />
                    <span className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.dotClass}`} />
                      <span className="text-text-bright truncate" style={{ fontSize: "12px" }}>{g.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div ref={statusDropdownRef} className="relative">
          {statusFilter ? (
            <div className={`inline-flex items-center rounded-full border overflow-hidden ${
              statusFilter === "stale" ? "border-amber-500/40 bg-amber-500/10" : "border-emerald-500/40 bg-emerald-500/10"
            }`}>
              <button type="button" onClick={() => setStatusDropdownOpen(true)}
                className={`inline-flex items-center gap-1 pl-2 pr-1.5 py-[3px] hover:opacity-80 transition-opacity ${
                  statusFilter === "stale" ? "text-amber-400" : "text-emerald-400"
                }`}
                style={{ fontSize: "10px", fontWeight: 500 }}>
                <span className="opacity-60" style={{ fontSize: "10px" }}>⊗</span>
                Status
                <span className="opacity-50 mx-0.5">|</span>
                <span>{statusFilter === "stale" ? "Stale" : "Active"}</span>
                <ChevronDown size={9} className="ml-0.5 opacity-60" />
              </button>
              <button type="button"
                onClick={() => { setStatusFilter(null); if (accessFilter === "stale") onClearFilter(); }}
                className={`pl-0.5 pr-2 py-[3px] opacity-50 hover:opacity-100 transition-opacity ${
                  statusFilter === "stale" ? "text-amber-400" : "text-emerald-400"
                }`}
                aria-label="Clear status filter">
                <X size={9} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setStatusDropdownOpen(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border transition-colors ${
                statusDropdownOpen
                  ? "border-primary/40 text-primary bg-primary/10"
                  : "border border-border text-muted-foreground hover:border-primary/40 hover:text-text-bright"
              }`}
              style={{ fontSize: "10px", fontWeight: 400 }}>
              <Plus size={9} />
              Status
            </button>
          )}

          {statusDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-44 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 pt-2 pb-2 border-b border-border">
                <span className="text-text-bright" style={{ fontSize: "12px", fontWeight: 600 }}>Filter by Status</span>
              </div>
              <div className="py-1">
                {(["active", "stale"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-raised transition-colors">
                    <input
                      type="checkbox"
                      checked={statusFilter === s}
                      onChange={() => setStatusFilter(prev => prev === s ? null : s)}
                      className="w-3.5 h-3.5 rounded accent-primary cursor-pointer shrink-0"
                    />
                    <span className="flex items-center gap-1.5 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s === "stale" ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className="text-text-bright" style={{ fontSize: "12px" }}>{s === "stale" ? "Stale" : "Active"}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── IdentityCard ─────────────────────────────────────────────────────────────
/** Renders a single identity card. Supports optional dbRole/authType extras. */

export function IdentityCard({ id }: { id: UnifiedIdentity }) {
  const cfg = IDENTITY_TYPE_CONFIG[id.identityType] ?? IDENTITY_TYPE_CONFIG["internal-user"];
  const { Icon } = cfg;

  // Stable hash from key for deterministic generation
  const nameHash = id.key.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);

  const username = id.name.includes("@") ? id.name.split("@")[0] : id.name;
  const domain   = id.name.includes("@") ? id.name.split("@")[1] : undefined;
  const showGroup = id.identityType === "internal-user" || id.identityType === "unmapped-local-user";

  // Direct group (for right column — covers all identity types)
  const directGroupPool: Record<string, string[]> = {
    "internal-user":       ["Engineering-All", "Finance-Team", "HR-Group", "Analytics-Team", "Security-Group", "IT-Ops-Group", "Data-Engineering"],
    "external-user":       ["External-Contractors", "Partner-Access", "Vendor-Group", "External-Contractors", "Partner-Access", "Vendor-Group", "External-Contractors"],
    "service-account":     ["SvcAcct-Group", "IT-Ops-Group", "Security-Team", "SvcAcct-Group", "IT-Ops-Group", "Security-Team", "SvcAcct-Group"],
    "connected-app":       ["OAuth-Apps", "Admin-Console-Group", "Connected-Apps", "IT-Ops-Group", "OAuth-Apps", "Admin-Console-Group", "Connected-Apps"],
    "unknown-identity":    ["Unresolved-Group", "Unknown-Principals", "Unresolved-Group", "Unknown-Principals", "Unresolved-Group", "Unknown-Principals", "Unresolved-Group"],
    "unmapped-local-user": ["Local-Users", "Unmapped-Accounts", "Local-Users", "Unmapped-Accounts", "Local-Users", "Unmapped-Accounts", "Local-Users"],
  };
  const directGroupOptions = directGroupPool[id.identityType] ?? directGroupPool["internal-user"];
  const directGroup = directGroupOptions[nameHash % directGroupOptions.length];

  // Left-column Direct group (for internal-user / unmapped-local-user)
  const groupPool = ["Engineering-All", "Finance-Team", "Marketing-Members", "HR-All", "Legal-Group", "Sales-Team", "DevOps-Group"];
  const primaryGroup = groupPool[nameHash % groupPool.length];
  const extraGroupPool: string[][] = [["Engineering-Leads", "Data-Platform"], ["Finance-Leads", "Audit-Group"], ["Marketing-Leads", "Growth-Team"], ["HR-Leads", "People-Ops"]];
  const showExtraGroups = (nameHash % 5) < 2;
  const hiddenGroups = showExtraGroups ? extraGroupPool[nameHash % 4] : [];

  // Data type pills (deterministic)
  const dataTypePool = ["Passport", "DOB", "Address", "IP Addr", "SSN", "Credit Card", "Email", "Phone"];
  const dtCount = 2 + (nameHash % 3);
  const dataTypes = Array.from({ length: dtCount }, (_, i) => dataTypePool[(nameHash + i) % dataTypePool.length]);

  // Roles
  const primaryRole = id.assignedRoles[0] ?? (id.dbRole ? (DB_ROLE_CONFIG[id.dbRole]?.label ?? id.dbRole) : "Viewer");
  const extraRolePool = ["Data Engineer", "Analyst", "Schema Owner", "Report Viewer", "Data Consumer", "Contributor", "Reviewer", "Reporter"];
  const extraRoles = id.assignedRoles.length > 1
    ? id.assignedRoles.slice(1)
    : Array.from({ length: nameHash % 3 }, (_, i) => extraRolePool[(nameHash + i) % extraRolePool.length]);
  const shownExtras  = extraRoles.slice(0, 2);
  const hiddenRoles  = extraRoles.slice(2);

  // Footer last access detail
  const actionPool = ["Export", "Download", "Copy", "Export"];
  const filePool   = ["customer_pii_export.csv", "sensitive_records.csv", "user_data_export.csv", "pii_report.csv"];
  const action = actionPool[nameHash % 4];
  const file   = filePool[nameHash % 4];

  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-lg">

      {/* ── Header: avatar · name · stale ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${cfg.avatar}`} style={{ background: "var(--color-nav-active, #1e293b)" }}>
          <Icon size={12} />
        </div>
        <span className="text-text-bright flex-1 truncate min-w-0" style={{ fontSize: "11px" }}>{id.name}</span>
        {id.stale && (
          <span className="relative group/tooltip shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 cursor-default" style={{ fontSize: "10px", fontWeight: 500 }}>Stale</span>
            <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover/tooltip:flex px-2 py-1 rounded shadow-lg z-50 pointer-events-none whitespace-nowrap" style={{ background: "var(--color-surface-overlay, #1e293b)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-white" style={{ fontSize: "10px" }}>Identity not accessed the data store in the past 90 days</span>
            </div>
          </span>
        )}
      </div>

      {/* ── Body: left column | right column ── */}
      <div className="flex divide-x divide-border/30">

        {/* Left: Username + Direct group / Domain + Data types */}
        <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1.5">
          <div className="flex gap-6">
            <div className="flex flex-col gap-0.5 shrink-0">
              <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Username</span>
              <span className="text-text-bright truncate" title={username} style={{ fontSize: "11px" }}>{username}</span>
            </div>
            {showGroup ? (
              null
            ) : domain ? (
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Domain</span>
                <span className="text-foreground/70 font-mono truncate" title={domain} style={{ fontSize: "10px" }}>{domain}</span>
              </div>
            ) : null}
          </div>

          {/* Data type pills */}
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Data type</span>
            <div className="flex items-center gap-1 flex-wrap">
              {dataTypes.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Direct group + Roles */}
        <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Direct group</span>
            <div style={{ fontSize: "9.5px" }}>
              {(() => {
                const count = (nameHash % 3) + 1;
                const groups = Array.from({ length: count }, (_, i) =>
                  directGroupOptions[(nameHash + i * 2) % directGroupOptions.length]
                ).filter((g, i, arr) => arr.indexOf(g) === i);
                const [first, ...rest] = groups;
                return (
                  <span className="flex items-center gap-1 flex-wrap">
                    <span className="text-foreground/80">{first}</span>
                    {rest.length > 0 && (
                      <span className="relative group/tooltip self-center">
                        <span className="cursor-default text-muted-foreground/60" style={{ fontSize: "10px", fontWeight: 600 }}>+{rest.length}</span>
                        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tooltip:flex flex-col gap-0.5 px-2 py-1.5 rounded shadow-lg z-50 pointer-events-none whitespace-nowrap" style={{ background: "var(--color-surface-overlay, #1e293b)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {rest.map((g) => (
                            <span key={g} className="text-white" style={{ fontSize: "10px" }}>{g}</span>
                          ))}
                        </div>
                      </span>
                    )}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground" style={{ fontSize: "9.5px" }}>Roles</span>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-foreground/90" style={{ fontSize: "10px" }}>{primaryRole}</span>
              {shownExtras.map(r => (
                <span key={r} className="text-foreground/90" style={{ fontSize: "10px" }}>{r}</span>
              ))}
              {hiddenRoles.length > 0 && (
                <span className="relative group/tooltip self-center">
                  <span className="cursor-default text-muted-foreground/60" style={{ fontSize: "10px", fontWeight: 600 }}>+{hiddenRoles.length}</span>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tooltip:flex flex-col gap-0.5 px-2 py-1.5 rounded shadow-lg z-50 pointer-events-none whitespace-nowrap" style={{ background: "var(--color-surface-overlay, #1e293b)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {hiddenRoles.map((r) => (
                      <span key={r} className="text-white" style={{ fontSize: "10px" }}>{r}</span>
                    ))}
                  </div>
                </span>
              )}
              
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer: last active ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-border/40">
        <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "9.5px" }}>Last active</span>
        <div className="flex items-center gap-1 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0" style={{ fontSize: "10px", fontWeight: 600 }}>{action}</span>
          <span className="text-muted-foreground/40 shrink-0" style={{ fontSize: "10px" }}>·</span>
          <span className="text-foreground/70 font-mono truncate min-w-0" title={file} style={{ fontSize: "10px" }}>{file}</span>
          <span className="text-muted-foreground/40 shrink-0" style={{ fontSize: "10px" }}>·</span>
          <span className="text-muted-foreground/60 shrink-0" style={{ fontSize: "10px" }}>{id.lastAccess}</span>
        </div>
      </div>
    </div>
  );
}

// ── IdentityList ─────────────────────────────────────────────────────────────

export function IdentityList({ identities }: { identities: UnifiedIdentity[] }) {
  return (
    <div className="space-y-1.5">
      {identities.map((id) => (
        <IdentityCard key={id.key} id={id} />
      ))}
      {identities.length === 0 && (
        <div className="text-center text-muted-foreground py-4" style={{ fontSize: "12px" }}>No matching identities</div>
      )}
    </div>
  );
}