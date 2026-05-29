import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, HardDrive, Building2, Cloud, Layers, Database, Monitor,
  Filter, X, ChevronDown, AlertTriangle, Shield, FileText, CheckCircle2,
} from "lucide-react";
import type { ComponentType } from "react";
import { CATEGORIES, ALL_DATA_TYPES, TYPE_TO_CATEGORY, type CategoryKey } from "../../shared/taxonomy";

// ── Types ─────────────────────────────────────────────────────────────────────

type IconComp = ComponentType<{ size?: number; className?: string }>;
type Stage = 2 | 3; // Only Discovery and Ongoing
type DataStoreType = "saas" | "iaas" | "database";
type PolicyType = "Cloud & Web" | "At Rest";

interface DataStoreCard {
  id: string;
  name: string;
  stage: Stage;
  type: DataStoreType;
  platform: string;
  group: string;
  Icon: IconComp;
  
  // For SaaS
  app?: string;
  instanceId?: string;
  
  // For IaaS
  org?: string;
  account?: string;
  
  // File-based metrics
  totalFiles?: number;
  sampledFiles?: number;
  sensitiveFiles?: number;
  
  // Database metrics
  totalFields?: number;
  sampledFields?: number;
  sensitiveFields?: number;
  
  // Policy info (Stage 3 only)
  policies?: { type: PolicyType; count: number }[];
  
  // Data types detected
  dataTypes: string[];
}

// ── Icon Mapping ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, IconComp> = {
  "google-drive": HardDrive,
  "sharepoint": Building2,
  "aws": Cloud,
  "azure": Layers,
  "postgresql": Database,
  "oracle": Database,
  "endpoints": Monitor,
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const DATA_STORES: DataStoreCard[] = [
  // Stage 2: Discovery Scan Complete
  {
    id: "d3",
    name: "HR Confidential",
    stage: 2,
    type: "saas",
    platform: "Google Drive",
    group: "google-drive",
    Icon: ICON_MAP["google-drive"],
    app: "Google Workspace",
    instanceId: "acme-corp-gw-01",
    totalFiles: 12847,
    sampledFiles: 3854,
    sensitiveFiles: 892,
    dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Birthdates", "Medical Records", "Passwords"],
  },
  {
    id: "sp1",
    name: "Legal – Contracts",
    stage: 2,
    type: "saas",
    platform: "SharePoint",
    group: "sharepoint",
    Icon: ICON_MAP["sharepoint"],
    app: "Microsoft 365",
    instanceId: "acme-m365-prod",
    totalFiles: 8923,
    sampledFiles: 2677,
    sensitiveFiles: 543,
    dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Bank Account Information", "Trade Secrets"],
  },
  {
    id: "sp2",
    name: "HR – Employee Portal",
    stage: 2,
    type: "saas",
    platform: "SharePoint",
    group: "sharepoint",
    Icon: ICON_MAP["sharepoint"],
    app: "Microsoft 365",
    instanceId: "acme-m365-prod",
    totalFiles: 15234,
    sampledFiles: 4570,
    sensitiveFiles: 1204,
    dataTypes: ["Personal Names", "Social Security Numbers", "Birthdates", "Medical Records", "Health Insurance IDs", "Income Information"],
  },
  {
    id: "pg1",
    name: "PGSRV-PROD-01",
    stage: 2,
    type: "database",
    platform: "PostgreSQL",
    group: "postgresql",
    Icon: ICON_MAP["postgresql"],
    org: "Acme Corp",
    account: "aws-prod-447289",
    totalFields: 18456,
    sampledFields: 5537,
    sensitiveFields: 2145,
    dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Payment Cards", "Bank Account Information", "Passwords", "Medical Records"],
  },
  {
    id: "pg2",
    name: "PGSRV-PROD-02",
    stage: 2,
    type: "database",
    platform: "PostgreSQL",
    group: "postgresql",
    Icon: ICON_MAP["postgresql"],
    org: "Acme Corp",
    account: "aws-prod-447289",
    totalFields: 12389,
    sampledFields: 3717,
    sensitiveFields: 1523,
    dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Bank Account Information"],
  },
  {
    id: "ora1",
    name: "ORACLEDB-PROD-01",
    stage: 2,
    type: "database",
    platform: "Oracle DB",
    group: "oracle",
    Icon: ICON_MAP["oracle"],
    org: "Acme Corp",
    account: "on-prem-dc-01",
    totalFields: 34567,
    sampledFields: 10370,
    sensitiveFields: 3842,
    dataTypes: ["Personal Names", "Social Security Numbers", "Taxpayer IDs", "Bank Account Information", "Income Information", "Medical Records"],
  },
  {
    id: "asql1",
    name: "acme-prod-customers",
    stage: 2,
    type: "database",
    platform: "Azure SQL",
    group: "azure",
    Icon: ICON_MAP["azure"],
    org: "Acme Corp",
    account: "azure-prod-923811",
    totalFields: 9234,
    sampledFields: 2770,
    sensitiveFields: 1187,
    dataTypes: ["Personal Names", "Email Addresses", "Telephone Numbers", "Payment Cards", "Bank Account Information"],
  },
  {
    id: "asql2",
    name: "acme-prod-hr",
    stage: 2,
    type: "database",
    platform: "Azure SQL",
    group: "azure",
    Icon: ICON_MAP["azure"],
    org: "Acme Corp",
    account: "azure-prod-923811",
    totalFields: 14523,
    sampledFields: 4357,
    sensitiveFields: 2134,
    dataTypes: ["Personal Names", "Social Security Numbers", "Birthdates", "Medical Records", "Health Insurance IDs", "Income Information"],
  },

  // Stage 3: Ongoing Policy Protected
  {
    id: "d1",
    name: "Engineering Shared Drive",
    stage: 3,
    type: "saas",
    platform: "Google Drive",
    group: "google-drive",
    Icon: ICON_MAP["google-drive"],
    app: "Google Workspace",
    instanceId: "acme-corp-gw-01",
    sensitiveFiles: 234,
    policies: [
      { type: "Cloud & Web", count: 2 },
      { type: "At Rest", count: 1 },
    ],
    dataTypes: ["Personal Names", "Email Addresses", "Source Code", "Trade Secrets"],
  },
  {
    id: "d2",
    name: "Finance Team Drive",
    stage: 3,
    type: "saas",
    platform: "Google Drive",
    group: "google-drive",
    Icon: ICON_MAP["google-drive"],
    app: "Google Workspace",
    instanceId: "acme-corp-gw-01",
    sensitiveFiles: 156,
    policies: [
      { type: "Cloud & Web", count: 3 },
    ],
    dataTypes: ["Personal Names", "Bank Account Information", "Income Information"],
  },
  {
    id: "d4",
    name: "Marketing Assets",
    stage: 3,
    type: "saas",
    platform: "Google Drive",
    group: "google-drive",
    Icon: ICON_MAP["google-drive"],
    app: "Google Workspace",
    instanceId: "acme-corp-gw-01",
    sensitiveFiles: 42,
    policies: [
      { type: "Cloud & Web", count: 1 },
    ],
    dataTypes: ["Personal Names", "Email Addresses"],
  },
  {
    id: "sp3",
    name: "Product – Roadmap Hub",
    stage: 3,
    type: "saas",
    platform: "SharePoint",
    group: "sharepoint",
    Icon: ICON_MAP["sharepoint"],
    app: "Microsoft 365",
    instanceId: "acme-m365-prod",
    sensitiveFiles: 89,
    policies: [
      { type: "Cloud & Web", count: 1 },
    ],
    dataTypes: ["Trade Secrets", "Source Code"],
  },
  {
    id: "ora2",
    name: "ORACLEDB-PROD-02",
    stage: 3,
    type: "database",
    platform: "Oracle DB",
    group: "oracle",
    Icon: ICON_MAP["oracle"],
    org: "Acme Corp",
    account: "on-prem-dc-01",
    sensitiveFields: 1523,
    policies: [
      { type: "At Rest", count: 2 },
    ],
    dataTypes: ["Personal Names", "Bank Account Information", "Income Information"],
  },
  {
    id: "rds1",
    name: "prod-users-db",
    stage: 3,
    type: "database",
    platform: "AWS RDS",
    group: "aws",
    Icon: ICON_MAP["aws"],
    org: "Acme Corp",
    account: "aws-prod-447289",
    sensitiveFields: 2345,
    policies: [
      { type: "At Rest", count: 3 },
    ],
    dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Passwords"],
  },
  {
    id: "rds2",
    name: "prod-orders-db",
    stage: 3,
    type: "database",
    platform: "AWS RDS",
    group: "aws",
    Icon: ICON_MAP["aws"],
    org: "Acme Corp",
    account: "aws-prod-447289",
    sensitiveFields: 1834,
    policies: [
      { type: "At Rest", count: 2 },
    ],
    dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Bank Account Information"],
  },
  {
    id: "ep1",
    name: "MacBook Pro – Alice Chen",
    stage: 3,
    type: "saas",
    platform: "Endpoint",
    group: "endpoints",
    Icon: ICON_MAP["endpoints"],
    app: "Endpoint Protection",
    instanceId: "ep-acme-fleet-01",
    sensitiveFiles: 67,
    policies: [
      { type: "Cloud & Web", count: 1 },
    ],
    dataTypes: ["Personal Names", "Email Addresses", "Source Code"],
  },
  {
    id: "ep2",
    name: "ThinkPad X1 – Bob Martin",
    stage: 3,
    type: "saas",
    platform: "Endpoint",
    group: "endpoints",
    Icon: ICON_MAP["endpoints"],
    app: "Endpoint Protection",
    instanceId: "ep-acme-fleet-01",
    sensitiveFiles: 34,
    policies: [
      { type: "Cloud & Web", count: 1 },
    ],
    dataTypes: ["Personal Names", "Email Addresses"],
  },
  {
    id: "ep3",
    name: "Surface Pro – Carol Kim",
    stage: 3,
    type: "saas",
    platform: "Endpoint",
    group: "endpoints",
    Icon: ICON_MAP["endpoints"],
    app: "Endpoint Protection",
    instanceId: "ep-acme-fleet-01",
    sensitiveFiles: 45,
    policies: [
      { type: "Cloud & Web", count: 1 },
    ],
    dataTypes: ["Personal Names", "Trade Secrets"],
  },
  {
    id: "ep4",
    name: "MacBook Air – Dave Singh",
    stage: 3,
    type: "saas",
    platform: "Endpoint",
    group: "endpoints",
    Icon: ICON_MAP["endpoints"],
    app: "Endpoint Protection",
    instanceId: "ep-acme-fleet-01",
    sensitiveFiles: 28,
    policies: [
      { type: "Cloud & Web", count: 1 },
    ],
    dataTypes: ["Personal Names"],
  },
];

// ── Filter Options ────────────────────────────────────────────────────────────

const APP_OPTIONS = Array.from(new Set(DATA_STORES.map(s => s.app).filter(Boolean))) as string[];
const INFRA_OPTIONS = Array.from(new Set(DATA_STORES.map(s => s.platform)));
const DATASTORE_TYPE_OPTIONS = ["SaaS", "IaaS", "Database", "Endpoint"];

// ── Component ─────────────────────────────────────────────────────────────────

export function RiskDashboardKanban() {
  const navigate = useNavigate();
  
  // Filters
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedInfra, setSelectedInfra] = useState<string[]>([]);
  const [selectedDataStoreTypes, setSelectedDataStoreTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  
  // Detail panel
  const [selectedCard, setSelectedCard] = useState<DataStoreCard | null>(null);

  // Apply filters
  const filteredStores = DATA_STORES.filter(store => {
    if (selectedApps.length > 0 && (!store.app || !selectedApps.includes(store.app))) return false;
    if (selectedInfra.length > 0 && !selectedInfra.includes(store.platform)) return false;
    if (selectedDataStoreTypes.length > 0) {
      const storeType = store.type === "saas" && store.group === "endpoints" ? "Endpoint" 
        : store.type === "saas" ? "SaaS"
        : store.type === "iaas" ? "IaaS"
        : "Database";
      if (!selectedDataStoreTypes.includes(storeType)) return false;
    }
    if (selectedCategories.length > 0) {
      const storeCategories = Array.from(new Set(store.dataTypes.map(dt => TYPE_TO_CATEGORY[dt])));
      if (!storeCategories.some(c => selectedCategories.includes(c))) return false;
    }
    if (selectedDataTypes.length > 0) {
      if (!store.dataTypes.some(dt => selectedDataTypes.includes(dt))) return false;
    }
    return true;
  });

  const stage2Stores = filteredStores.filter(s => s.stage === 2);
  const stage3Stores = filteredStores.filter(s => s.stage === 3);
  const disconnectedCount = 12; // From RiskStagesPage mock data

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0">
        <button
          onClick={() => navigate("/risk")}
          className="flex items-center gap-2 text-text-dim hover:text-muted-foreground transition-colors"
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          Back to Risk
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "16px", fontWeight: 600 }}>Risk Dashboard Kanban</h1>
          <p className="text-text-dim" style={{ fontSize: "11px" }}>
            Track data store protection status across discovery and ongoing policy stages
          </p>
        </div>

        {/* Disconnected Data Stores Banner */}
        <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-3 w-2/5">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: "11px", fontWeight: 600 }}>Disconnected Data Stores</h3>
              <span
                className="px-1.5 py-0.5 rounded-full"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#ef4444",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                }}
              >
                {disconnectedCount}
              </span>
            </div>
            <p className="text-text-dim" style={{ fontSize: "9px", marginTop: "2px" }}>
              Data stores without scanning permissions need access granted
            </p>
          </div>
          <button
            onClick={() => navigate("/risk/stages?stage=1")}
            className="px-2.5 py-1 rounded-lg transition-colors text-white shrink-0"
            style={{
              fontSize: "10px",
              fontWeight: 600,
              backgroundColor: "#ef4444",
            }}
          >
            Grant Permissions
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        apps={APP_OPTIONS}
        infra={INFRA_OPTIONS}
        dataStoreTypes={DATASTORE_TYPE_OPTIONS}
        selectedApps={selectedApps}
        selectedInfra={selectedInfra}
        selectedDataStoreTypes={selectedDataStoreTypes}
        selectedCategories={selectedCategories}
        selectedDataTypes={selectedDataTypes}
        onAppsChange={setSelectedApps}
        onInfraChange={setSelectedInfra}
        onDataStoreTypesChange={setSelectedDataStoreTypes}
        onCategoriesChange={setSelectedCategories}
        onDataTypesChange={setSelectedDataTypes}
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden flex">
        {/* Swim Lanes */}
        <div className="flex-1 flex gap-4 p-6 overflow-x-auto">
          {/* Stage 2: Discovery Scan Complete */}
          <SwimLane
            title="Discovery Scan Complete"
            description="Sampled scan complete, but no ongoing policy protection yet"
            count={stage2Stores.length}
            color="#f59e0b"
            stores={stage2Stores}
            onCardClick={setSelectedCard}
          />

          {/* Stage 3: Ongoing Policy Protected */}
          <SwimLane
            title="Ongoing Policy Protected"
            description="Actively monitored with ongoing scans and automated responses"
            count={stage3Stores.length}
            color="#22c55e"
            stores={stage3Stores}
            onCardClick={setSelectedCard}
          />
        </div>

        {/* Detail Panel */}
        {selectedCard && (
          <DetailPanel
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </div>
    </div>
  );
}

// ── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  apps: string[];
  infra: string[];
  dataStoreTypes: string[];
  selectedApps: string[];
  selectedInfra: string[];
  selectedDataStoreTypes: string[];
  selectedCategories: CategoryKey[];
  selectedDataTypes: string[];
  onAppsChange: (apps: string[]) => void;
  onInfraChange: (infra: string[]) => void;
  onDataStoreTypesChange: (types: string[]) => void;
  onCategoriesChange: (cats: CategoryKey[]) => void;
  onDataTypesChange: (types: string[]) => void;
}

function FilterBar({
  apps, infra, dataStoreTypes,
  selectedApps, selectedInfra, selectedDataStoreTypes, selectedCategories, selectedDataTypes,
  onAppsChange, onInfraChange, onDataStoreTypesChange, onCategoriesChange, onDataTypesChange,
}: FilterBarProps) {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  const hasActiveFilters = selectedApps.length > 0 || selectedInfra.length > 0 || 
    selectedDataStoreTypes.length > 0 || selectedCategories.length > 0 || selectedDataTypes.length > 0;

  const clearAll = () => {
    onAppsChange([]);
    onInfraChange([]);
    onDataStoreTypesChange([]);
    onCategoriesChange([]);
    onDataTypesChange([]);
  };

  return (
    <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-3 flex-wrap shrink-0">
      <Filter size={14} className="text-text-dim" />
      <span className="text-text-dim" style={{ fontSize: "11px", fontWeight: 600 }}>FILTERS:</span>

      <FilterDropdown
        label="App"
        options={apps}
        selected={selectedApps}
        onChange={onAppsChange}
        isExpanded={expandedFilter === "app"}
        onToggle={() => setExpandedFilter(expandedFilter === "app" ? null : "app")}
      />

      <FilterDropdown
        label="Infra"
        options={infra}
        selected={selectedInfra}
        onChange={onInfraChange}
        isExpanded={expandedFilter === "infra"}
        onToggle={() => setExpandedFilter(expandedFilter === "infra" ? null : "infra")}
      />

      <FilterDropdown
        label="Data Store"
        options={dataStoreTypes}
        selected={selectedDataStoreTypes}
        onChange={onDataStoreTypesChange}
        isExpanded={expandedFilter === "datastore"}
        onToggle={() => setExpandedFilter(expandedFilter === "datastore" ? null : "datastore")}
      />

      <DataTypeFilter
        selectedCategories={selectedCategories}
        selectedDataTypes={selectedDataTypes}
        onCategoriesChange={onCategoriesChange}
        onDataTypesChange={onDataTypesChange}
        isExpanded={expandedFilter === "datatypes"}
        onToggle={() => setExpandedFilter(expandedFilter === "datatypes" ? null : "datatypes")}
      />

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-card border border-border hover:bg-muted/50 transition-colors"
          style={{ fontSize: "10px", fontWeight: 500 }}
        >
          <X size={12} />
          Clear all
        </button>
      )}
    </div>
  );
}

// ── Filter Dropdown ───────────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function FilterDropdown({ label, options, selected, onChange, isExpanded, onToggle }: FilterDropdownProps) {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
          selected.length > 0
            ? "bg-primary/20 border border-primary/40"
            : "bg-card border border-border hover:bg-muted/50"
        }`}
        style={{ fontSize: "11px", fontWeight: 500 }}
      >
        {label}
        {selected.length > 0 && (
          <span className="px-1 rounded-full bg-primary text-primary-foreground" style={{ fontSize: "9px" }}>
            {selected.length}
          </span>
        )}
        <ChevronDown size={12} className="text-text-dim" />
      </button>

      {isExpanded && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-48 max-h-64 overflow-auto">
            {options.map(option => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                style={{ fontSize: "11px" }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="rounded"
                />
                {option}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Data Type Filter ──────────────────────────────────────────────────────────

interface DataTypeFilterProps {
  selectedCategories: CategoryKey[];
  selectedDataTypes: string[];
  onCategoriesChange: (cats: CategoryKey[]) => void;
  onDataTypesChange: (types: string[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function DataTypeFilter({
  selectedCategories, selectedDataTypes,
  onCategoriesChange, onDataTypesChange,
  isExpanded, onToggle,
}: DataTypeFilterProps) {
  const totalSelected = selectedCategories.length + selectedDataTypes.length;

  const toggleCategory = (catKey: CategoryKey) => {
    if (selectedCategories.includes(catKey)) {
      onCategoriesChange(selectedCategories.filter(c => c !== catKey));
    } else {
      onCategoriesChange([...selectedCategories, catKey]);
    }
  };

  const toggleDataType = (dataType: string) => {
    if (selectedDataTypes.includes(dataType)) {
      onDataTypesChange(selectedDataTypes.filter(dt => dt !== dataType));
    } else {
      onDataTypesChange([...selectedDataTypes, dataType]);
    }
  };

  // Group data types by category
  const dataTypesByCategory: Record<CategoryKey, string[]> = {} as any;
  CATEGORIES.forEach(cat => {
    dataTypesByCategory[cat.key] = ALL_DATA_TYPES.filter(dt => TYPE_TO_CATEGORY[dt] === cat.key);
  });

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
          totalSelected > 0
            ? "bg-primary/20 border border-primary/40"
            : "bg-card border border-border hover:bg-muted/50"
        }`}
        style={{ fontSize: "11px", fontWeight: 500 }}
      >
        Data Types
        {totalSelected > 0 && (
          <span className="px-1 rounded-full bg-primary text-primary-foreground" style={{ fontSize: "9px" }}>
            {totalSelected}
          </span>
        )}
        <ChevronDown size={12} className="text-text-dim" />
      </button>

      {isExpanded && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 w-96 max-h-96 overflow-auto">
            <div className="p-3 space-y-3">
              {/* Categories */}
              <div>
                <div className="text-text-dim mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                  CATEGORIES
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <label
                      key={cat.key}
                      className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: cat.color,
                        backgroundColor: selectedCategories.includes(cat.key) ? cat.color + "30" : cat.color + "15",
                        border: selectedCategories.includes(cat.key) ? `1px solid ${cat.color}` : "1px solid transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.key)}
                        onChange={() => toggleCategory(cat.key)}
                        className="w-3 h-3"
                      />
                      {cat.key}
                    </label>
                  ))}
                </div>
              </div>

              {/* Data Types grouped by category */}
              <div>
                <div className="text-text-dim mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
                  ENTITY TYPES
                </div>
                <div className="space-y-2">
                  {CATEGORIES.map(cat => (
                    <div key={cat.key}>
                      <div
                        className="text-xs font-semibold mb-1"
                        style={{ color: cat.color, fontSize: "10px" }}
                      >
                        {cat.key}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {dataTypesByCategory[cat.key].map(dt => (
                          <label
                            key={dt}
                            className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 cursor-pointer rounded"
                            style={{ fontSize: "10px" }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDataTypes.includes(dt)}
                              onChange={() => toggleDataType(dt)}
                              className="w-3 h-3"
                            />
                            <span className="truncate">{dt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Swim Lane ─────────────────────────────────────────────────────────────────

interface SwimLaneProps {
  title: string;
  description: string;
  count: number;
  color: string;
  stores: DataStoreCard[];
  onCardClick: (card: DataStoreCard) => void;
}

function SwimLane({ title, description, count, color, stores, onCardClick }: SwimLaneProps) {
  return (
    <div className="flex-1 min-w-80 flex flex-col">
      {/* Lane Header */}
      <div
        className="rounded-lg p-4 mb-3"
        style={{
          backgroundColor: color + "15",
          border: `1px solid ${color}40`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <h2 style={{ fontSize: "14px", fontWeight: 600, color }}>{title}</h2>
          <span
            className="px-2 py-0.5 rounded-full"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            {count}
          </span>
        </div>
        <p className="text-text-dim" style={{ fontSize: "10px" }}>
          {description}
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {stores.map(store => (
          <StoreCard
            key={store.id}
            card={store}
            onClick={() => onCardClick(store)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Store Card ────────────────────────────────────────────────────────────────

interface StoreCardProps {
  card: DataStoreCard;
  onClick: () => void;
}

function StoreCard({ card, onClick }: StoreCardProps) {
  const isDatabase = card.type === "database";
  const isStage2 = card.stage === 2;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground shrink-0">
          <card.Icon size={14} />
        </span>
        <span style={{ fontSize: "12px", fontWeight: 600 }} className="truncate">
          {card.name}
        </span>
      </div>

      {/* App/Org info */}
      <div className="text-text-dim mb-2" style={{ fontSize: "10px" }}>
        {card.app && card.instanceId && (
          <div>{card.app} • {card.instanceId}</div>
        )}
        {card.org && card.account && (
          <div>{card.org} • {card.account}</div>
        )}
      </div>

      {/* Metrics */}
      {isStage2 && (
        <div className="space-y-1 mb-2">
          {isDatabase ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-text-dim">Fields sampled:</span>
                <span style={{ fontWeight: 600 }}>
                  {card.sampledFields?.toLocaleString()} / {card.totalFields?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-dim">Sensitive fields:</span>
                <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                  {card.sensitiveFields?.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-text-dim">Files sampled:</span>
                <span style={{ fontWeight: 600 }}>
                  {card.sampledFiles?.toLocaleString()} / {card.totalFiles?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-dim">Sensitive files:</span>
                <span style={{ fontWeight: 600, color: "#f59e0b" }}>
                  {card.sensitiveFiles?.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {!isStage2 && (
        <div className="space-y-1 mb-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-dim">{isDatabase ? "Sensitive fields:" : "Sensitive files:"}</span>
            <span style={{ fontWeight: 600, color: "#22c55e" }}>
              {isDatabase ? card.sensitiveFields?.toLocaleString() : card.sensitiveFiles?.toLocaleString()}
            </span>
          </div>
          {card.policies && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {card.policies.map((policy, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "#22c55e",
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                  }}
                >
                  {policy.count} {policy.type}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data types */}
      <div className="flex gap-1 flex-wrap">
        {card.dataTypes.slice(0, 3).map(dt => {
          const cat = CATEGORIES.find(c => c.key === TYPE_TO_CATEGORY[dt])!;
          return (
            <span
              key={dt}
              className="px-1 py-0.5 rounded"
              style={{
                fontSize: "8px",
                fontWeight: 600,
                color: cat.color,
                backgroundColor: cat.color + "20",
              }}
            >
              {TYPE_TO_CATEGORY[dt]}
            </span>
          );
        })}
        {card.dataTypes.length > 3 && (
          <span
            className="px-1 py-0.5 rounded text-text-dim"
            style={{ fontSize: "8px", fontWeight: 600 }}
          >
            +{card.dataTypes.length - 3}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  card: DataStoreCard;
  onClose: () => void;
}

function DetailPanel({ card, onClose }: DetailPanelProps) {
  return (
    <div className="shrink-0 w-96 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Data Store Details</h3>
        <button
          onClick={onClose}
          className="text-text-dim hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <div className="text-text-dim mb-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
            NAME
          </div>
          <div className="flex items-center gap-2">
            <card.Icon size={16} className="text-muted-foreground" />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{card.name}</span>
          </div>
        </div>

        {/* Platform */}
        <div>
          <div className="text-text-dim mb-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
            PLATFORM
          </div>
          <div style={{ fontSize: "12px" }}>{card.platform}</div>
        </div>

        {/* App/Org */}
        {card.app && card.instanceId && (
          <div>
            <div className="text-text-dim mb-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
              APPLICATION
            </div>
            <div style={{ fontSize: "12px" }}>{card.app}</div>
            <div className="text-text-dim" style={{ fontSize: "11px" }}>Instance: {card.instanceId}</div>
          </div>
        )}
        {card.org && card.account && (
          <div>
            <div className="text-text-dim mb-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
              ORGANIZATION
            </div>
            <div style={{ fontSize: "12px" }}>{card.org}</div>
            <div className="text-text-dim" style={{ fontSize: "11px" }}>Account: {card.account}</div>
          </div>
        )}

        {/* Stage */}
        <div>
          <div className="text-text-dim mb-1" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
            STAGE
          </div>
          <div style={{ fontSize: "12px" }}>
            {card.stage === 2 ? "Discovery Scan Complete" : "Ongoing Policy Protected"}
          </div>
        </div>

        {/* Placeholder for future details */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 text-text-dim">
            <FileText size={16} />
            <span style={{ fontSize: "11px" }}>
              Additional details coming soon...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}