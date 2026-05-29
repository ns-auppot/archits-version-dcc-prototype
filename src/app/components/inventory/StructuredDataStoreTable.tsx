import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TablePagination } from "../ui/table-pagination";
import { Database, Search, X } from "lucide-react";
import {
  Sparkline,
  DataTypeTags,
  generateSparkData,
  formatNumber,
  sumSparkData,
  SortIcon,
  SortDropdown,
  toggleHeaderSort,
  TableSearchInput,
  HighlightText,
  matchesSearch,
  type SortConfig,
  type SortColumnDef,
} from "./data-store-shared";
import { SidePanel } from "./SidePanel";
import { DataStoreIcon } from "./data-store-icons";
import { PlaceholderOutline } from "./PlaceholderOutline";
import { FieldDetailPane } from "./FieldDetailPane";
import { IdentityDetailPanel } from "./InventoryContent";
import { useVirtualizer } from "@tanstack/react-virtual";

// ── Mock data by structured store type ───────────────────────────────────────

export interface StructuredDataRow {
  id: string;
  name: string;
  nameSubtitle?: string;
  sensitiveFields: number;
  totalFields: number;
  dataTypes: string[];
  uploadSparkData: number[];
  downloadSparkData: number[];
}

interface StructuredStoreConfig {
  title: string;
  subtitle: string;
  nameColumnLabel: string;
  rows: StructuredDataRow[];
}

export function getStructuredStoreConfig(storeType: string): StructuredStoreConfig {
  switch (storeType) {
    case "rds":
      return {
        title: "RDS Instances",
        subtitle: "AWS RDS relational database instances",
        nameColumnLabel: "Instance Name",
        rows: [
          {
            id: "rds1",
            name: "prod-users-db",
            nameSubtitle: "PostgreSQL 15.4 · us-east-1",
            sensitiveFields: 84,
            totalFields: 312,
            dataTypes: [
              "Personal Names", "Email Addresses", "Social Security Numbers",
              "Telephone Numbers", "Postal Addresses", "Birthdates",
              "Passwords", "Payment Cards",
            ],
            uploadSparkData: generateSparkData(130),
            downloadSparkData: generateSparkData(135),
          },
          {
            id: "rds2",
            name: "prod-orders-db",
            nameSubtitle: "MySQL 8.0 · us-east-1",
            sensitiveFields: 46,
            totalFields: 198,
            dataTypes: [
              "Payment Cards", "Bank Account Information", "Financial IDs",
              "Personal Names", "Postal Addresses", "Telephone Numbers",
            ],
            uploadSparkData: generateSparkData(140),
            downloadSparkData: generateSparkData(145),
          },
          {
            id: "rds3",
            name: "analytics-warehouse",
            nameSubtitle: "PostgreSQL 15.4 · us-west-2",
            sensitiveFields: 127,
            totalFields: 540,
            dataTypes: [
              "Personal Names", "Email Addresses", "IP Addresses",
              "Domain Names", "Company Names", "Region Identifiers",
              "Corporate Tax IDs", "Securities IDs",
            ],
            uploadSparkData: generateSparkData(150),
            downloadSparkData: generateSparkData(155),
          },
          {
            id: "rds4",
            name: "staging-hr-db",
            nameSubtitle: "PostgreSQL 15.4 · us-east-1",
            sensitiveFields: 63,
            totalFields: 185,
            dataTypes: [
              "Social Security Numbers", "Personal Names", "Birthdates",
              "Gender", "Ethnicity and Race", "Postal Addresses",
              "Healthcare IDs", "Medical Records",
            ],
            uploadSparkData: generateSparkData(160),
            downloadSparkData: generateSparkData(165),
          },
        ],
      };
    case "sql":
      return {
        title: "SQL Instances",
        subtitle: "On-premises SQL Server databases",
        nameColumnLabel: "Instance Name",
        rows: [
          {
            id: "sql1",
            name: "SQLSRV-PROD-01",
            nameSubtitle: "SQL Server 2022 · dc-east-rack4",
            sensitiveFields: 156,
            totalFields: 620,
            dataTypes: [
              "Personal Names", "Social Security Numbers", "Financial IDs",
              "Payment Cards", "Bank Account Information", "Taxpayer IDs",
              "Postal Addresses", "Telephone Numbers", "Email Addresses",
            ],
            uploadSparkData: generateSparkData(170),
            downloadSparkData: generateSparkData(175),
          },
          {
            id: "sql2",
            name: "SQLSRV-PROD-02",
            nameSubtitle: "SQL Server 2022 · dc-east-rack4",
            sensitiveFields: 92,
            totalFields: 410,
            dataTypes: [
              "Medical Records", "Healthcare IDs", "Healthcare Provider IDs",
              "Medical Diagnoses", "Medical Procedures", "Personal Names",
              "Birthdates", "Gender",
            ],
            uploadSparkData: generateSparkData(180),
            downloadSparkData: generateSparkData(185),
          },
          {
            id: "sql3",
            name: "SQLSRV-DEV-01",
            nameSubtitle: "SQL Server 2019 · dc-west-rack2",
            sensitiveFields: 38,
            totalFields: 275,
            dataTypes: [
              "Personal Names", "Email Addresses", "Passwords",
              "Source Code", "IP Addresses",
            ],
            uploadSparkData: generateSparkData(190),
            downloadSparkData: generateSparkData(195),
          },
          {
            id: "sql4",
            name: "SQLSRV-LEGACY",
            nameSubtitle: "SQL Server 2016 · dc-east-rack1",
            sensitiveFields: 210,
            totalFields: 880,
            dataTypes: [
              "Personal Names", "Social Security Numbers", "Driver Licenses",
              "National IDs", "Passports", "Voter IDs", "Financial IDs",
              "Payment Cards", "Postal Addresses", "Telephone Numbers",
              "Birthdates",
            ],
            uploadSparkData: generateSparkData(200),
            downloadSparkData: generateSparkData(205),
          },
        ],
      };
    default:
      return { title: "", subtitle: "", nameColumnLabel: "Name", rows: [] };
  }
}

// ── Placeholder field names for cell panel ────────────────────────────────────

const SAMPLE_FIELD_NAMES = [
  "users.email", "users.full_name", "users.ssn", "users.phone_number",
  "users.date_of_birth", "users.postal_address", "orders.billing_address",
  "orders.credit_card_number", "orders.cvv", "orders.cardholder_name",
  "employees.salary", "employees.bank_account", "employees.tax_id",
  "patients.medical_record_id", "patients.diagnosis_code", "patients.insurance_id",
  "contacts.home_phone", "contacts.mobile", "contacts.emergency_contact",
  "accounts.password_hash", "accounts.security_question", "accounts.recovery_email",
  "transactions.amount", "transactions.merchant_id", "transactions.ip_address",
  "profiles.gender", "profiles.ethnicity", "profiles.nationality",
  "audit_log.user_agent", "audit_log.source_ip",
];

// Maps a column name keyword to its most natural entity data type(s).
// First entry is the primary match; second (if present) is a rare secondary.
const FIELD_TO_ENTITY_MAP: Record<string, string[]> = {
  email: ["Email Addresses"],
  recovery_email: ["Email Addresses"],
  full_name: ["Personal Names"],
  cardholder_name: ["Personal Names"],
  emergency_contact: ["Personal Names"],
  ssn: ["Social Security Numbers"],
  tax_id: ["Taxpayer IDs", "Social Security Numbers"],
  phone_number: ["Telephone Numbers"],
  home_phone: ["Telephone Numbers"],
  mobile: ["Telephone Numbers"],
  date_of_birth: ["Birthdates"],
  postal_address: ["Postal Addresses"],
  billing_address: ["Postal Addresses"],
  credit_card_number: ["Payment Cards"],
  cvv: ["Payment Cards"],
  salary: ["Financial IDs"],
  amount: ["Financial IDs"],
  bank_account: ["Bank Account Information"],
  merchant_id: ["Financial IDs"],
  medical_record_id: ["Medical Records", "Healthcare IDs"],
  diagnosis_code: ["Medical Diagnoses"],
  insurance_id: ["Healthcare IDs"],
  password_hash: ["Passwords"],
  security_question: ["Secrets and Tokens"],
  ip_address: ["IP Addresses"],
  source_ip: ["IP Addresses"],
  gender: ["Gender"],
  ethnicity: ["Ethnicity and Race"],
  nationality: ["National IDs"],
  user_agent: ["Domain Names"],
};

function generatePlaceholderFields(count: number, parentDataTypes: string[]) {
  const fields: { name: string; dataType: string; entityTypes: string[]; table: string; lastQueried: string }[] = [];
  const categories = ["PII", "Financial", "PCI", "Secrets", "PHI", "Credentials"];
  const seed = count * 7 + 13;
  for (let i = 0; i < count; i++) {
    const baseName = SAMPLE_FIELD_NAMES[i % SAMPLE_FIELD_NAMES.length];
    const cycle = Math.floor(i / SAMPLE_FIELD_NAMES.length);
    const fieldName = cycle === 0 ? baseName : baseName.replace(/\./, `_${cycle}.`);
    const tableName = fieldName.split(".")[0];
    const colName = fieldName.split(".").pop() || fieldName;

    // Derive entity type from column name → prefer type that exists in parent row
    const mappedTypes = FIELD_TO_ENTITY_MAP[colName] || [];
    const entityTypes: string[] = [];

    // Try primary mapped type first, fall back to any available parent type
    for (const mt of mappedTypes) {
      if (parentDataTypes.includes(mt) && !entityTypes.includes(mt)) {
        entityTypes.push(mt);
        break; // usually just one
      }
    }

    // If no mapped type matched the parent's list, pick the closest parent type
    if (entityTypes.length === 0 && parentDataTypes.length > 0) {
      const hash = ((seed + i * 31) % 97);
      entityTypes.push(parentDataTypes[hash % parentDataTypes.length]);
    }

    // ~12% chance of a secondary entity type (structured fields rarely match >1)
    const hash = ((seed + i * 31) % 97);
    if (hash % 8 === 0 && parentDataTypes.length > 1) {
      const secondary = parentDataTypes[(hash + 3) % parentDataTypes.length];
      if (!entityTypes.includes(secondary)) {
        entityTypes.push(secondary);
      }
    }

    // Vary dates naturally across Jan–Feb 2026
    const daysAgo = ((hash + i * 13) % 55);
    const dateObj = new Date(2026, 1, 24);
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const lastQueried = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    fields.push({
      name: fieldName,
      dataType: categories[i % categories.length], // kept for ForensicDetailPane compat
      entityTypes,
      table: tableName,
      lastQueried,
    });
  }
  return fields;
}

// ── Panel state ──────────────────────────────────────────────────────────────

type PanelState =
  | null
  | { type: "row"; row: StructuredDataRow }
  | { type: "cell"; row: StructuredDataRow };

// ── Row Panel Placeholder ────────────────────────────────────────────────────

export function StructuredRowPanelContent({ row }: { row: StructuredDataRow }) {
  return (
    <div className="px-5 py-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-raised border border-border rounded-lg p-3">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Sensitive Columns
          </div>
          <div className="text-text-bright" style={{ fontSize: "20px", fontWeight: 600 }}>
            {formatNumber(row.sensitiveFields)}
          </div>
        </div>
        <div className="bg-surface-raised border border-border rounded-lg p-3">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Total Fields
          </div>
          <div className="text-text-bright" style={{ fontSize: "20px", fontWeight: 600 }}>
            {formatNumber(row.totalFields)}
          </div>
        </div>
      </div>

      {/* Data types */}
      <div className="mb-5">
        <div
          className="text-muted-foreground mb-2"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}
        >
          Entity Data Types
        </div>
        <div className="flex flex-wrap gap-1.5">
          {row.dataTypes.map((dt) => (
            <span
              key={dt}
              className="px-2 py-1 bg-surface-raised border border-border rounded text-text-bright"
              style={{ fontSize: "11px" }}
            >
              {dt}
            </span>
          ))}
        </div>
      </div>

      {/* Activity placeholder */}
      {/* Placeholder sections */}
      <div className="space-y-4">
        {["Schema Overview", "Access Permissions", "Compliance Status"].map((section) => (
          <PlaceholderOutline key={section} label="Needs design">
            <div className="bg-surface-raised border border-border rounded-lg p-4">
              <div className="text-text-bright mb-1" style={{ fontSize: "12px", fontWeight: 500 }}>
                {section}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Placeholder — detail view coming soon
              </div>
            </div>
          </PlaceholderOutline>
        ))}
      </div>
    </div>
  );
}

// ── Cell Panel: Sensitive Columns List ─────────────────────────────────────────

function CellPanelContent({
  row,
  selectedIdx,
  onSelect,
  onSelectIdentity,
}: {
  row: StructuredDataRow;
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
  onSelectIdentity?: (identity: { username: string; role: string; identityType: string }) => void;
}) {
  const [search, setSearch] = useState("");
  const fields = useMemo(
    () => generatePlaceholderFields(row.sensitiveFields, row.dataTypes),
    [row.sensitiveFields, row.dataTypes],
  );

  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields.map((f, i) => ({ ...f, originalIdx: i }));
    const q = search.toLowerCase();
    return fields
      .map((f, i) => ({ ...f, originalIdx: i }))
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.entityTypes.some((et) => et.toLowerCase().includes(q)) ||
          f.table.toLowerCase().includes(q),
      );
  }, [fields, search]);

  const selectedField =
    selectedIdx !== null && selectedIdx < fields.length ? fields[selectedIdx] : null;

  const fieldListRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredFields.length,
    getScrollElement: () => fieldListRef.current,
    estimateSize: () => 46,
    overscan: 10,
  });

  return (
    <div className="flex h-full">
      {/* Left: field list nav */}
      <div
        className="flex flex-col shrink-0 border-r border-border"
        style={{ width: selectedField ? 320 : "100%" }}
      >
        {/* Search */}
        <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute left-2.5 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter fields..."
              className="w-full pl-8 pr-8 py-1.5 bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: "12px" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 text-muted-foreground hover:text-text-bright transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Database size={12} className="text-primary" />
            <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {filteredFields.length}
              {search ? ` of ${formatNumber(row.sensitiveFields)}` : ""} sensitive{" "}
              {row.sensitiveFields === 1 ? "column" : "columns"}
            </span>
          </div>
        </div>

        {/* Field list — virtualized */}
        <div ref={fieldListRef} className="flex-1 overflow-y-auto px-2 py-1">
          {filteredFields.length > 0 ? (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const field = filteredFields[virtualRow.index];
                const isActive = selectedIdx === field.originalIdx;
                return (
                  <button
                    key={field.originalIdx}
                    type="button"
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left ${
                      isActive
                        ? "bg-primary/10"
                        : "hover:bg-foreground/[0.04]"
                    }`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      ...(isActive
                        ? { boxShadow: "inset 3px 0 0 var(--primary)" }
                        : {}),
                    }}
                    onClick={() =>
                      onSelect(isActive ? null : field.originalIdx)
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-text-bright truncate font-mono"
                        style={{ fontSize: "12px", fontWeight: 450 }}
                      >
                        {field.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className="text-muted-foreground truncate"
                          style={{ fontSize: "10px" }}
                        >
                          {field.entityTypes.join(", ")}
                        </span>
                        <span className="text-muted-foreground opacity-40 shrink-0">
                          ·
                        </span>
                        <span
                          className="text-muted-foreground shrink-0"
                          style={{ fontSize: "10px" }}
                        >
                          Scanned {field.lastQueried}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : search ? (
            <div
              className="text-center text-muted-foreground mt-6 py-4"
              style={{ fontSize: "12px" }}
            >
              No fields match &ldquo;{search}&rdquo;
            </div>
          ) : null}
        </div>
      </div>

      {/* Right: detail pane */}
      {selectedField && (
        <div className="flex-1 overflow-y-auto min-w-0">
          <FieldDetailPane field={selectedField} onSelectIdentity={onSelectIdentity} />
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const SORT_COLUMNS: SortColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "sensitiveFields", label: "# Sensitive Columns" },
  { key: "dataTypes", label: "Entity Data Types" },
  { key: "uploaded", label: "Sensitive Uploaded (30d)" },
  { key: "downloaded", label: "Sensitive Downloaded (30d)" },
];

function compareRows(
  a: StructuredDataRow,
  b: StructuredDataRow,
  key: string,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "sensitiveFields":
      return a.sensitiveFields - b.sensitiveFields;
    case "dataTypes":
      return a.dataTypes.length - b.dataTypes.length;
    case "uploaded":
      return sumSparkData(a.uploadSparkData) - sumSparkData(b.uploadSparkData);
    case "downloaded":
      return sumSparkData(a.downloadSparkData) - sumSparkData(b.downloadSparkData);
    default:
      return 0;
  }
}

export function StructuredDataStoreTable({ storeType }: { storeType: string }) {
  const config = getStructuredStoreConfig(storeType);
  const [panel, setPanel] = useState<PanelState>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cellSelectedIdx, setCellSelectedIdx] = useState<number | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<{ username: string; role: string; identityType: string } | null>(null);

  const closePanel = useCallback(() => {
    setPanel(null);
    setCellSelectedIdx(null);
    setSelectedIdentity(null);
  }, []);

  const openRowPanel = useCallback(
    (row: StructuredDataRow) => setPanel({ type: "row", row }),
    [],
  );

  const openCellPanel = useCallback(
    (e: React.MouseEvent, row: StructuredDataRow) => {
      e.stopPropagation();
      setCellSelectedIdx(null);
      setPanel({ type: "cell", row });
    },
    [],
  );

  const sortedRows = useMemo(() => {
    if (!sortConfig) return config.rows;
    const { key, direction } = sortConfig;
    const mul = direction === "asc" ? 1 : -1;
    return [...config.rows].sort((a, b) => mul * compareRows(a, b, key));
  }, [config.rows, sortConfig]);

  const sortColumns = useMemo<SortColumnDef[]>(
    () => SORT_COLUMNS.map((c) =>
      c.key === "name" ? { ...c, label: config.nameColumnLabel } : c,
    ),
    [config.nameColumnLabel],
  );

  const filteredRows = useMemo(() => {
    if (!searchTerm) return sortedRows;
    return sortedRows.filter((row) =>
      matchesSearch(searchTerm, row.name, row.nameSubtitle ?? "", ...row.dataTypes),
    );
  }, [sortedRows, searchTerm]);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => { setCurrentPage(1); }, [filteredRows]);
  const pagedRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);

  return (
    <div className="flex-1 overflow-auto">
      {/* ContentHeader */}
      <div className="sticky top-0 z-10 bg-background px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="text-text-bright"
              style={{ fontSize: "16px", fontWeight: 600 }}
            >
              {config.title}
            </h2>
            <p
              className="text-muted-foreground mt-0.5"
              style={{ fontSize: "12px" }}
            >
              {config.subtitle} &middot; {config.rows.length}{" "}
              {config.rows.length === 1 ? "record" : "records"}
            </p>
          </div>
          <div className="shrink-0 mt-0.5 flex items-center gap-2">
            <SortDropdown
              columns={sortColumns}
              sortConfig={sortConfig}
              onSort={setSortConfig}
            />
            <TableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {/* Name */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "name"))}
              >
                {config.nameColumnLabel} <SortIcon columnKey="name" sortConfig={sortConfig} />
              </button>
            </th>

            {/* Sensitive Fields / Total Fields */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "sensitiveFields"))}
              >
                # Sensitive / Total Fields <SortIcon columnKey="sensitiveFields" sortConfig={sortConfig} />
              </button>
            </th>

            {/* Entity Data Types */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500, minWidth: 220 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "dataTypes"))}
              >
                Entity Data Types <SortIcon columnKey="dataTypes" sortConfig={sortConfig} />
              </button>
            </th>

            {/* Uploads sparkline */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "uploaded"))}
              >
                Sensitive Uploaded (30d) <SortIcon columnKey="uploaded" sortConfig={sortConfig} />
              </button>
            </th>

            {/* Downloads sparkline */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "downloaded"))}
              >
                Sensitive Downloaded (30d) <SortIcon columnKey="downloaded" sortConfig={sortConfig} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row) => {
            const isActive = panel !== null && panel.row.id === row.id;
            return (
              <tr
                key={row.id}
                className={`border-b border-border transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/5"
                    : "hover:bg-foreground/[0.04]"
                }`}
                style={isActive ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
                onClick={() => openRowPanel(row)}
              >
                {/* Name */}
                <td
                  className="px-4 py-3"
                  style={{ fontSize: "13px", fontWeight: 500 }}
                >
                  <HighlightText text={row.name} query={searchTerm} className="text-primary" />
                  {row.nameSubtitle && (
                    <div style={{ fontSize: "11px", fontWeight: 400 }}>
                      <HighlightText text={row.nameSubtitle} query={searchTerm} className="text-muted-foreground" />
                    </div>
                  )}
                </td>

                {/* Sensitive / Total Fields */}
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button
                    onClick={(e) => openCellPanel(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {formatNumber(row.sensitiveFields)}
                  </button>
                  <span className="text-muted-foreground">
                    {" "}/ {formatNumber(row.totalFields)}
                  </span>
                </td>

                {/* Data Types */}
                <td className="px-4 py-3">
                  <DataTypeTags types={row.dataTypes} />
                </td>

                {/* Upload Sparkline */}
                <td className="px-4 py-3">
                  <Sparkline
                    data={row.uploadSparkData}
                    color="var(--color-primary)"
                  />
                </td>

                {/* Download Sparkline */}
                <td className="px-4 py-3">
                  <Sparkline
                    data={row.downloadSparkData}
                    color="#06b6d4"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <TablePagination currentPage={currentPage} totalRows={filteredRows.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />

      {/* ── Per-row side panel ── */}
      <SidePanel
        open={panel?.type === "row"}
        onClose={closePanel}
        title={panel?.type === "row" ? panel.row.name : ""}
        subtitle={panel?.type === "row" ? panel.row.nameSubtitle : undefined}
        titleIcon={<DataStoreIcon storeType={storeType} size={20} />}
      >
        {panel?.type === "row" && <StructuredRowPanelContent row={panel.row} />}
      </SidePanel>

      {/* ── Per-cell side panel (sensitive columns / identity) ── */}
      <SidePanel
        open={panel?.type === "cell"}
        onClose={closePanel}
        onBack={selectedIdentity ? () => setSelectedIdentity(null) : undefined}
        title={
          selectedIdentity
            ? selectedIdentity.username
            : panel?.type === "cell" ? "Sensitive Columns" : ""
        }
        subtitle={
          selectedIdentity
            ? undefined
            : panel?.type === "cell" ? panel.row.name : undefined
        }
        panelType={selectedIdentity ? "identity" : undefined}
        width={!selectedIdentity && cellSelectedIdx !== null ? 920 : 420}
      >
        {panel?.type === "cell" && (
          selectedIdentity ? (
            <IdentityDetailPanel
              key={selectedIdentity.username}
              row={{
                Name: selectedIdentity.username,
                Email: selectedIdentity.username.includes("@")
                  ? selectedIdentity.username
                  : `${selectedIdentity.username}@acme.com`,
                Username: selectedIdentity.username.split("@")[0],
                Domain: "acme.com",
                "Access Level": selectedIdentity.role,
              }}
              navId={selectedIdentity.identityType}
            />
          ) : (
            <CellPanelContent
              row={panel.row}
              selectedIdx={cellSelectedIdx}
              onSelect={setCellSelectedIdx}
              onSelectIdentity={setSelectedIdentity}
            />
          )
        )}
      </SidePanel>
    </div>
  );
}