import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TablePagination } from "../ui/table-pagination";
import { FolderOpen, Search, X, User, ArrowRight } from "lucide-react";
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
import { FileDetailPane, SensitiveFileDetailPane, SensitiveFileHeaderExtra, FileActionsMenu, DT_TYPE_TO_CAT, DT_CAT_COLORS, generateFileAccessHistory } from "./ForensicDetailPane";
import { useVirtualizer } from "@tanstack/react-virtual";

// ── Mock data by store type ──────────────────────────────────────────────────

export interface UnstructuredDataRow {
  id: string;
  name: string;
  nameSubtitle?: string;
  sensitiveFiles: number;
  totalFiles: number;
  dataTypes: string[];
  uploadSparkData: number[];
  downloadSparkData: number[];
}

interface StoreTableConfig {
  title: string;
  subtitle: string;
  nameColumnLabel: string;
  rows: UnstructuredDataRow[];
}

export function getUnstructuredStoreConfig(storeType: string): StoreTableConfig {
  switch (storeType) {
    case "drives":
      return {
        title: "Drives",
        subtitle: "Google Drive instances with unstructured data",
        nameColumnLabel: "Drive Name",
        rows: [
          {
            id: "d1",
            name: "Engineering Shared Drive",
            sensitiveFiles: 142,
            totalFiles: 1203,
            dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Source Code", "Passwords", "Private Keys"],
            uploadSparkData: generateSparkData(10),
            downloadSparkData: generateSparkData(14),
          },
          {
            id: "d2",
            name: "Finance Team Drive",
            sensitiveFiles: 89,
            totalFiles: 456,
            dataTypes: ["Financial IDs", "Bank Account Information", "Payment Cards", "Social Security Numbers", "Taxpayer IDs"],
            uploadSparkData: generateSparkData(20),
            downloadSparkData: generateSparkData(25),
          },
          {
            id: "d3",
            name: "HR Confidential",
            sensitiveFiles: 234,
            totalFiles: 892,
            dataTypes: ["Personal Names", "Social Security Numbers", "Birthdates", "Medical Records", "Postal Addresses", "Telephone Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race"],
            uploadSparkData: generateSparkData(30),
            downloadSparkData: generateSparkData(35),
          },
          {
            id: "d4",
            name: "Marketing Assets",
            sensitiveFiles: 12,
            totalFiles: 2105,
            dataTypes: ["Email Addresses", "Personal Names", "Company Names"],
            uploadSparkData: generateSparkData(40),
            downloadSparkData: generateSparkData(45),
          },
        ],
      };
    case "s3":
      return {
        title: "S3 Buckets",
        subtitle: "AWS S3 buckets with unstructured data",
        nameColumnLabel: "Bucket Name",
        rows: [
          {
            id: "s1",
            name: "prod-data-lake",
            sensitiveFiles: 1205,
            totalFiles: 45200,
            dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Financial IDs", "Healthcare IDs", "Birthdates", "Telephone Numbers", "Postal Addresses"],
            uploadSparkData: generateSparkData(50),
            downloadSparkData: generateSparkData(55),
          },
          {
            id: "s2",
            name: "analytics-staging",
            sensitiveFiles: 340,
            totalFiles: 12800,
            dataTypes: ["IP Addresses", "MAC Addresses", "UUIDs", "Domain Names", "URI Hosts"],
            uploadSparkData: generateSparkData(60),
            downloadSparkData: generateSparkData(65),
          },
          {
            id: "s3",
            name: "ml-training-data",
            sensitiveFiles: 892,
            totalFiles: 8400,
            dataTypes: ["Personal Names", "Biometric Data", "Medical Records", "Healthcare Provider IDs", "Medical Diagnoses", "Gender", "Age", "Ethnicity and Race"],
            uploadSparkData: generateSparkData(70),
            downloadSparkData: generateSparkData(75),
          },
        ],
      };
    case "user-device":
      return {
        title: "User Devices",
        subtitle: "Endpoint devices with unstructured data",
        nameColumnLabel: "Device Name",
        rows: [
          {
            id: "ud1",
            name: "LAPTOP-DC-4201",
            nameSubtitle: "David Chen",
            sensitiveFiles: 78,
            totalFiles: 3200,
            dataTypes: ["Source Code", "Private Keys", "Passwords", "Secrets and Tokens", "IP Addresses", "Email Addresses"],
            uploadSparkData: generateSparkData(80),
            downloadSparkData: generateSparkData(85),
          },
          {
            id: "ud2",
            name: "LAPTOP-AR-1105",
            nameSubtitle: "Alice Reyes",
            sensitiveFiles: 45,
            totalFiles: 1890,
            dataTypes: ["Financial IDs", "Payment Cards", "Personal Names", "Bank Account Information"],
            uploadSparkData: generateSparkData(90),
            downloadSparkData: generateSparkData(95),
          },
          {
            id: "ud3",
            name: "DESKTOP-BK-3302",
            nameSubtitle: "Brian Kim",
            sensitiveFiles: 112,
            totalFiles: 5670,
            dataTypes: ["Medical Records", "Healthcare IDs", "Personal Names", "Social Security Numbers", "Birthdates", "Postal Addresses", "Telephone Numbers"],
            uploadSparkData: generateSparkData(100),
            downloadSparkData: generateSparkData(105),
          },
          {
            id: "ud4",
            name: "LAPTOP-MJ-2208",
            nameSubtitle: "Maya Johnson",
            sensitiveFiles: 23,
            totalFiles: 980,
            dataTypes: ["Email Addresses", "Company Names", "Domain Names"],
            uploadSparkData: generateSparkData(110),
            downloadSparkData: generateSparkData(115),
          },
          {
            id: "ud5",
            name: "DESKTOP-TP-5501",
            nameSubtitle: "Tom Park",
            sensitiveFiles: 67,
            totalFiles: 2340,
            dataTypes: ["Source Code", "Private Keys", "Public Keys", "Secrets and Tokens", "IP Addresses", "MAC Addresses", "UUIDs"],
            uploadSparkData: generateSparkData(120),
            downloadSparkData: generateSparkData(125),
          },
        ],
      };
    default:
      return { title: "", subtitle: "", nameColumnLabel: "Name", rows: [] };
  }
}

// ── Placeholder file names for cell panel ────────────────────────────────────

const SAMPLE_FILE_NAMES = [
  "employee_records_2026.xlsx", "quarterly_financials_q4.pdf", "user_data_export.csv",
  "customer_contacts.xlsx", "payroll_summary_feb.xlsx", "health_benefits_enrollment.docx",
  "ssn_verification_batch.csv", "tax_forms_w2_2025.pdf", "insurance_claims_log.csv",
  "vendor_payment_details.xlsx", "candidate_applications.pdf", "performance_reviews_2025.docx",
  "salary_adjustments.xlsx", "client_nda_signed.pdf", "api_credentials_backup.json",
  "prod_db_dump_20260201.sql", "access_audit_log.csv", "pii_scan_results.json",
  "compliance_report_feb.pdf", "incident_response_notes.docx", "encrypted_keys_archive.zip",
  "marketing_leads_export.csv", "board_meeting_minutes.docx", "patent_filing_draft.pdf",
  "customer_feedback_raw.csv", "support_tickets_export.json", "billing_invoices_q1.xlsx",
  "user_sessions_analytics.csv", "gdpr_data_request_log.xlsx", "partner_contracts.pdf",
];

function generatePlaceholderFiles(count: number, parentDataTypes: string[]) {
  const files: { name: string; dataTypes: string; entityTypes: string[]; modified: string }[] = [];
  const categories = ["PII", "Financial", "PCI", "Secrets", "PHI", "Credentials"];
  // Seeded-ish pseudo-random based on count to keep it deterministic per row
  const seed = count * 7 + 13;
  for (let i = 0; i < count; i++) {
    const baseName = SAMPLE_FILE_NAMES[i % SAMPLE_FILE_NAMES.length];
    const cycle = Math.floor(i / SAMPLE_FILE_NAMES.length);
    const name = cycle === 0 ? baseName : baseName.replace(/(\.\w+)$/, `_${cycle}$1`);

    // Pick 1–3 entity types from the parent row's actual data types
    const hash = ((seed + i * 31) % 97);
    const numTypes = 1 + (hash % Math.min(3, parentDataTypes.length));
    const startIdx = (hash + i) % parentDataTypes.length;
    const entityTypes: string[] = [];
    for (let t = 0; t < numTypes; t++) {
      const dt = parentDataTypes[(startIdx + t) % parentDataTypes.length];
      if (!entityTypes.includes(dt)) entityTypes.push(dt);
    }

    // Vary modified dates more naturally across Jan–Feb 2026
    const daysAgo = ((hash + i * 13) % 55); // 0–54 days back from Feb 24
    const dateObj = new Date(2026, 1, 24); // Feb 24, 2026
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const modified = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    files.push({
      name,
      dataTypes: categories[i % categories.length], // kept for ForensicDetailPane
      entityTypes,
      modified,
    });
  }
  return files;
}

// ── Panel state ──────────────────────────────────────────────────────────────

type PanelState =
  | null
  | { type: "row"; row: UnstructuredDataRow }
  | { type: "cell"; row: UnstructuredDataRow };

// ── Row Panel Placeholder ────────────────────────────────────────────────────

export function UnstructuredRowPanelContent({ row }: { row: UnstructuredDataRow }) {
  return (
    <div className="px-5 py-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-3">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Sensitive Files
          </div>
          <div className="text-text-bright" style={{ fontSize: "20px", fontWeight: 600 }}>
            {formatNumber(row.sensitiveFiles)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-3">
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Total Files
          </div>
          <div className="text-text-bright" style={{ fontSize: "20px", fontWeight: 600 }}>
            {formatNumber(row.totalFiles)}
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

      {/* Placeholder sections */}
      <div className="space-y-4">
        {["Permissions", "Recent Activity", "Compliance Status"].map((section) => (
          <PlaceholderOutline key={section} label="Needs design">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-4">
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

// ── Activity action colors ────────────────────────────────────────────────────

const ACTIVITY_ACTION_COLORS: Record<string, string> = {
  Uploaded: "text-primary",
  Downloaded: "text-primary",
  Modified: "text-primary",
  Shared: "text-primary",
};

// ── File Preview Pane ─────────────────────────────────────────────────────────

function FilePreviewPane({
  file,
  row,
  onClose,
  onViewFullDetails,
}: {
  file: { name: string; entityTypes: string[]; modified: string };
  row: UnstructuredDataRow;
  onClose: () => void;
  onViewFullDetails: () => void;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
  const recentActivity = useMemo(() => generateFileAccessHistory(file.name).slice(0, 3), [file.name]);

  const extColor =
    ext === "XLSX" || ext === "XLS" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" :
    ext === "PDF" ? "bg-red-600/20 text-red-400 border-red-500/30" :
    ext === "CSV" ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
    ext === "DOCX" || ext === "DOC" ? "bg-sky-600/20 text-sky-400 border-sky-500/30" :
    "bg-slate-600/20 text-slate-400 border-slate-500/30";

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${extColor}`}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.02em" }}>{ext}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-text-bright truncate" style={{ fontSize: "13px", fontWeight: 600 }}>{file.name}</div>
            <div className="text-muted-foreground truncate mt-0.5" style={{ fontSize: "11px" }}>
              {row.name}{row.nameSubtitle ? ` · ${row.nameSubtitle}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-surface-raised transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>File Details</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Size</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{sizeKb} KB</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Last Modified</span>
              <span className="text-text-bright tabular-nums" style={{ fontSize: "12px", fontWeight: 500 }}>{file.modified}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Entity Data Types ({file.entityTypes.length})</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {file.entityTypes.map((dt) => {
              const cat = DT_TYPE_TO_CAT[dt] ?? "PII";
              const colors = DT_CAT_COLORS[cat] ?? DT_CAT_COLORS.PII;
              return (
                <div key={dt} className="flex items-center gap-3 px-3 py-2">
                  <span className={`shrink-0 inline-flex items-center justify-center rounded ${colors.bg} ${colors.text}`} style={{ fontSize: "11px", fontWeight: 400, width: 32, height: 20 }}>{cat}</span>
                  <span className="text-text-bright" style={{ fontSize: "12px" }}>{dt}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em" }}>Recent Activity</div>
          <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
            {recentActivity.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <User size={12} className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-text-bright truncate" style={{ fontSize: "12px" }}>{entry.user}</span>
                <span className={`shrink-0 ${ACTIVITY_ACTION_COLORS[entry.action] ?? "text-muted-foreground"}`} style={{ fontSize: "11px", fontWeight: 500 }}>{entry.action}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums" style={{ fontSize: "11px" }}>{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button type="button" onClick={onViewFullDetails} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors" style={{ fontSize: "13px", fontWeight: 600 }}>
          View Full Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Cell Panel: Sensitive Files List ─────────────────────────────────────────

function CellPanelContent({
  row,
  onViewFullDetails,
}: {
  row: UnstructuredDataRow;
  onViewFullDetails?: (fileIdx: number) => void;
}) {
  const [search, setSearch] = useState("");
  const files = useMemo(
    () => generatePlaceholderFiles(row.sensitiveFiles, row.dataTypes),
    [row.sensitiveFiles, row.dataTypes],
  );

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files.map((f, i) => ({ ...f, originalIdx: i }));
    const q = search.toLowerCase();
    return files
      .map((f, i) => ({ ...f, originalIdx: i }))
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.entityTypes.some((et) => et.toLowerCase().includes(q)),
      );
  }, [files, search]);

  const fileListRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => fileListRef.current,
    estimateSize: () => 46,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full">
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
            placeholder="Filter files..."
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
          <FolderOpen size={12} className="text-primary" />
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
            {filteredFiles.length}
            {search ? ` of ${formatNumber(row.sensitiveFiles)}` : ""} sensitive{" "}
            {row.sensitiveFiles === 1 ? "file" : "files"}
          </span>
        </div>
      </div>

      {/* File list — virtualized */}
      <div ref={fileListRef} className="flex-1 overflow-y-auto px-2 py-1">
        {filteredFiles.length > 0 ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const file = filteredFiles[virtualRow.index];
              return (
                <button
                  key={file.originalIdx}
                  type="button"
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left hover:bg-nav-active/40"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onViewFullDetails?.(file.originalIdx)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-nav-active, #1e293b)" }}>
                    <FileText size={14} className="text-muted-foreground/50" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-text-bright truncate"
                      style={{ fontSize: "12px", fontWeight: 450 }}
                    >
                      {file.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className="text-muted-foreground truncate"
                        style={{ fontSize: "10px" }}
                      >
                        {file.entityTypes.join(", ")}
                      </span>
                      <span className="text-muted-foreground opacity-40 shrink-0">
                        ·
                      </span>
                      <span
                        className="text-muted-foreground shrink-0"
                        style={{ fontSize: "10px" }}
                      >
                        <span className="text-muted-foreground/60">Scanned:</span> {(() => { const d = new Date(file.modified); return isNaN(d.getTime()) ? file.modified : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()}
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
            No files match &ldquo;{search}&rdquo;
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const SORT_COLUMNS: SortColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "sensitiveFiles", label: "# Sensitive Files" },
  { key: "totalFiles",     label: "Total Files" },
  { key: "dataTypes", label: "Entity Data Types" },
  { key: "uploaded", label: "Sensitive Uploaded (30d)" },
  { key: "downloaded", label: "Sensitive Downloaded (30d)" },
];

function compareRows(
  a: UnstructuredDataRow,
  b: UnstructuredDataRow,
  key: string,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "sensitiveFiles":
      return a.sensitiveFiles - b.sensitiveFiles;
    case "totalFiles":
      return a.totalFiles - b.totalFiles;
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

export function UnstructuredDataStoreTable({ storeType }: { storeType: string }) {
  const config = getUnstructuredStoreConfig(storeType);
  const [panel, setPanel] = useState<PanelState>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fullDetailIdx, setFullDetailIdx] = useState<number | null>(null);

  const closePanel = useCallback(() => {
    setPanel(null);
    setFullDetailIdx(null);
  }, []);
  const closeFullDetail = useCallback(() => { setFullDetailIdx(null); }, []);
  const handleViewFullDetails = useCallback((fileIdx: number) => { setFullDetailIdx(fileIdx); }, []);

  const openRowPanel = useCallback(
    (row: UnstructuredDataRow) => setPanel({ type: "row", row }),
    [],
  );

  const openCellPanel = useCallback(
    (e: React.MouseEvent, row: UnstructuredDataRow) => {
      e.stopPropagation();
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

  // dynamic label for the Name column
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
    <div className="flex-1 overflow-auto" style={{ background: "var(--color-background)" }}>
      {/* ContentHeader */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3 border-b border-border" style={{ background: "var(--color-background)" }}>
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

            {/* Sensitive / Total */}
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "sensitiveFiles"))}
              >
                Sensitive Files <SortIcon columnKey="sensitiveFiles" sortConfig={sortConfig} />
              </button>
            </th>
            <th
              className="text-left px-4 py-3 text-muted-foreground"
              style={{ fontSize: "11px", fontWeight: 500 }}
            >
              <button
                className="flex items-center gap-1 hover:text-text-bright transition-colors"
                onClick={() => setSortConfig(toggleHeaderSort(sortConfig, "totalFiles"))}
              >
                Scanned / Total Files <SortIcon columnKey="totalFiles" sortConfig={sortConfig} />
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
                Data Types <SortIcon columnKey="dataTypes" sortConfig={sortConfig} />
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

                {/* Sensitive / Total */}
                <td className="px-4 py-3" style={{ fontSize: "13px" }}>
                  <button
                    onClick={(e) => openCellPanel(e, row)}
                    className="text-primary rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-primary/10 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {formatNumber(row.sensitiveFiles)}
                  </button>
                </td>

                {/* Scanned / Total Files */}
                <td className="px-4 py-3">
                  {(() => {
                    const scanned = Math.max(row.sensitiveFiles, Math.round(row.totalFiles * (0.30 + (row.sensitiveFiles % 7) * 0.02)));
                    const pct = row.totalFiles > 0 ? Math.round((scanned / row.totalFiles) * 100) : 0;
                    return (
                      <div>
                        <span className="tabular-nums text-text-bright" style={{ fontSize: "13px", fontWeight: 500 }}>{pct}%</span>
                        <div className="text-muted-foreground" style={{ fontSize: "11px" }}>of {formatNumber(row.totalFiles)}</div>
                      </div>
                    );
                  })()}
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
        {panel?.type === "row" && <UnstructuredRowPanelContent row={panel.row} />}
      </SidePanel>

      {/* ── Per-cell side panel (sensitive files) ── */}
      <SidePanel
        open={panel?.type === "cell"}
        onClose={closePanel}
        title={panel?.type === "cell" ? `Sensitive Files` : ""}
        subtitle={panel?.type === "cell" ? panel.row.name : undefined}
        width={420}
        suspended={fullDetailIdx !== null}
        pushed={fullDetailIdx !== null}
        pushedRightOffset="min(840px, 90vw)"
      >
        {panel?.type === "cell" && (
          <CellPanelContent
            row={panel.row}
            onViewFullDetails={handleViewFullDetails}
          />
        )}
      </SidePanel>

      {/* Stacked file detail side panel */}
      {panel?.type === "cell" && fullDetailIdx !== null && (() => {
        const files = generatePlaceholderFiles(panel.row.sensitiveFiles, panel.row.dataTypes);
        const file = files[fullDetailIdx];
        if (!file) return null;
        const sizeKb = ((file.name.length * 17 + 42) % 900 + 100);
        const filePath = `/${panel.row.name}/${file.name}`;
        return (
          <SidePanel
            open
            onClose={closeFullDetail}
            onBack={closeFullDetail}
            title={file.name}
            subtitle={filePath}
            width="min(840px, 90vw)"
            zIndex={60}
            hideBackdrop
            stacked
            panelType="file"
            headerActions={<FileActionsMenu />}
            headerExtra={
              <SensitiveFileHeaderExtra
                name={file.name}
                store={panel.row.name}
                storeSource="Endpoint"
                size={`${sizeKb} KB`}
              />
            }
          >
            <SensitiveFileDetailPane
              name={file.name}
              path={filePath}
              store={panel.row.name}
              storeSource="Endpoint"
              size={`${sizeKb} KB`}
              lastModified={file.modified}
              dataTypes={file.entityTypes}
            />
          </SidePanel>
        );
      })()}
    </div>
  );
}