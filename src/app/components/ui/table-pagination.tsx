import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function TablePagination({ currentPage, totalRows, pageSize, onPageChange, onPageSizeChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  if (totalPages <= 1 && totalRows <= pageSize && !onPageSizeChange) return null;

  const start = Math.min((currentPage - 1) * pageSize + 1, totalRows);
  const end = Math.min(currentPage * pageSize, totalRows);

  // Build page number list with ellipsis
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
      {/* Left: rows-per-page input + count */}
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <>
            <span className="text-muted-foreground" style={{ fontSize: "12px" }}>Rows per page</span>
            <RowsPerPageInput
              value={pageSize}
              onChange={(n) => { onPageSizeChange(n); onPageChange(1); }}
            />
          </>
        )}
        <span className="text-muted-foreground" style={{ fontSize: "12px" }}>
          {totalRows === 0 ? "No results" : `${start}–${end} of ${totalRows}`}
        </span>
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-text-bright hover:bg-foreground/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="w-7 h-7 flex items-center justify-center text-muted-foreground"
              style={{ fontSize: "12px" }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 rounded-md transition-colors flex items-center justify-center ${
                p === currentPage
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-text-bright hover:bg-foreground/[0.06]"
              }`}
              style={{ fontSize: "12px", fontWeight: p === currentPage ? 600 : 400 }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-text-bright hover:bg-foreground/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function RowsPerPageInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync if parent changes pageSize externally
  useEffect(() => { setDraft(String(value)); }, [value]);

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 1) {
      onChange(Math.min(n, 1000));
    } else {
      setDraft(String(value));
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") { commit(); inputRef.current?.blur(); } if (e.key === "Escape") { setDraft(String(value)); inputRef.current?.blur(); } }}
      className="h-7 w-12 rounded-md border border-border bg-background text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
      style={{ fontSize: "12px" }}
    />
  );
}
