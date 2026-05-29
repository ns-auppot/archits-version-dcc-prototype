import { useState, useEffect, useRef } from "react";
import { X, Search, Check, User } from "lucide-react";

// ─── IDP employee directory (mock data) ───────────────────────────────────────
const IDP_USERS = [
  { id: "alice-chen",       name: "Alice Chen",       email: "a.chen@acme.com",        dept: "Engineering",    initials: "AC", color: "#6366f1" },
  { id: "brian-kowalski",   name: "Brian Kowalski",   email: "b.kowalski@acme.com",    dept: "Finance",        initials: "BK", color: "#0ea5e9" },
  { id: "diana-reyes",      name: "Diana Reyes",      email: "d.reyes@acme.com",       dept: "Security",       initials: "DR", color: "#10b981" },
  { id: "marcus-webb",      name: "Marcus Webb",      email: "m.webb@acme.com",        dept: "Engineering",    initials: "MW", color: "#f59e0b" },
  { id: "sophie-laurent",   name: "Sophie Laurent",   email: "s.laurent@acme.com",     dept: "Legal",          initials: "SL", color: "#8b5cf6" },
  { id: "tom-nguyen",       name: "Tom Nguyen",       email: "t.nguyen@acme.com",      dept: "Engineering",    initials: "TN", color: "#ec4899" },
  { id: "priya-sharma",     name: "Priya Sharma",     email: "p.sharma@acme.com",      dept: "Data Platform",  initials: "PS", color: "#14b8a6" },
  { id: "kevin-marsh",      name: "Kevin Marsh",      email: "k.marsh@acme.com",       dept: "DevOps",         initials: "KM", color: "#f97316" },
  { id: "natalie-ford",     name: "Natalie Ford",     email: "n.ford@acme.com",        dept: "HR",             initials: "NF", color: "#06b6d4" },
  { id: "carlos-vega",      name: "Carlos Vega",      email: "c.vega@acme.com",        dept: "Sales",          initials: "CV", color: "#84cc16" },
  { id: "emily-zhang",      name: "Emily Zhang",      email: "e.zhang@acme.com",       dept: "Product",        initials: "EZ", color: "#a855f7" },
  { id: "ryan-o-brien",     name: "Ryan O'Brien",     email: "r.obrien@acme.com",      dept: "Compliance",     initials: "RO", color: "#ef4444" },
];

// ─── Service accounts for second tab ─────────────────────────────────────────
const SERVICE_ACCOUNTS = [
  { id: "svc-cicd-001",     name: "CI/CD Pipeline",   id_label: "svc-cicd-001",        dept: "DevOps",         initials: "CI", color: "#6366f1" },
  { id: "svc-dsync-014",    name: "Data Sync Bot",    id_label: "svc-dsync-014",       dept: "Data Eng",       initials: "DS", color: "#0ea5e9" },
  { id: "svc-etl-007",      name: "ETL Worker",       id_label: "svc-etl-007",         dept: "Data Eng",       initials: "EW", color: "#10b981" },
  { id: "svc-backup-003",   name: "Backup Agent",     id_label: "svc-backup-003",      dept: "Infra",          initials: "BA", color: "#f59e0b" },
  { id: "svc-report-011",   name: "Report Generator", id_label: "svc-report-011",      dept: "Analytics",      initials: "RG", color: "#8b5cf6" },
];

interface UnmappedUser {
  Username: string;
  Source: string;
  "Source Type": string;
  "Data Types": string[];
}

interface LinkUsernameModalProps {
  open: boolean;
  user: UnmappedUser | null;
  onClose: () => void;
  onSave: (username: string, linkedId: string, linkedName: string) => void;
}

type TabType = "employee" | "service";

export function LinkUsernameModal({ open, user, onClose, onSave }: LinkUsernameModalProps) {
  const [tab, setTab] = useState<TabType>("employee");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens with a new user
  useEffect(() => {
    if (open) {
      setTab("employee");
      setSearch("");
      setSelectedId(null);
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !user) return null;

  const list = tab === "employee" ? IDP_USERS : SERVICE_ACCOUNTS;
  const filtered = search.trim()
    ? list.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u as any).email?.toLowerCase().includes(search.toLowerCase()) ||
        u.dept.toLowerCase().includes(search.toLowerCase()),
      )
    : list;

  const selectedEntry = list.find((u) => u.id === selectedId);

  function handleSave() {
    if (!selectedEntry) return;
    onSave(user!.Username, selectedEntry.id, selectedEntry.name);
    onClose();
  }

  const dataTypes = Array.isArray(user["Data Types"]) ? user["Data Types"] : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[200]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-[205] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col"
        style={{
          width: "min(560px, 95vw)",
          maxHeight: "min(680px, 90vh)",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="text-text-bright" style={{ fontSize: 16, fontWeight: 600 }}>
              Link Username
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: 12 }}>
              Map{" "}
              <span className="text-foreground font-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                {user.Username}
              </span>{" "}
              to an existing IDP identity
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-text-bright hover:bg-foreground/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── User info strip ── */}
        <div
          className="mx-5 mt-4 mb-3 rounded-lg px-3.5 py-3 flex flex-col gap-2 shrink-0"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0" style={{ fontSize: 11 }}>Username</span>
              <span className="font-mono text-foreground" style={{ fontSize: 12, fontWeight: 600 }}>{user.Username}</span>
            </div>
            <div
              className="shrink-0"
              style={{ width: 1, height: 12, background: "var(--border)" }}
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0" style={{ fontSize: 11 }}>Data Store</span>
              <span className="text-foreground" style={{ fontSize: 12 }}>{user.Source}</span>
            </div>
            <div
              className="shrink-0"
              style={{ width: 1, height: 12, background: "var(--border)" }}
            />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0" style={{ fontSize: 11 }}>Type</span>
              <span className="text-foreground" style={{ fontSize: 12 }}>{user["Source Type"]}</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          className="px-5 shrink-0 flex items-center gap-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {(["employee", "service"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedId(null); setSearch(""); }}
              className="relative pb-2.5 pt-0.5 mr-5 transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: tab === t ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              {t === "employee" ? "Directory Employee Information" : "Service Account Application"}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "var(--input-background)", border: "1px solid var(--border)" }}
          >
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "employee" ? "Search by name, email or department…" : "Search service accounts…"}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
              style={{ fontSize: 12 }}
            />
          </div>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <User size={24} className="text-muted-foreground opacity-40" />
              <p className="text-muted-foreground" style={{ fontSize: 12 }}>No results found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((entry) => {
                const isSelected = selectedId === entry.id;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedId(isSelected ? null : entry.id)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                    style={{
                      background: isSelected ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                      border: isSelected ? "1px solid color-mix(in srgb, var(--primary) 35%, transparent)" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--muted)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="shrink-0 flex items-center justify-center rounded-full"
                      style={{ width: 32, height: 32, background: entry.color + "22", border: `1px solid ${entry.color}44` }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: entry.color }}>{entry.initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                        {entry.name}
                      </span>
                      <span className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                        {tab === "employee" ? (entry as any).email : (entry as any).id_label}
                        {" · "}
                        {entry.dept}
                      </span>
                    </div>

                    {/* Check */}
                    {isSelected && (
                      <div
                        className="shrink-0 flex items-center justify-center rounded-full"
                        style={{ width: 20, height: 20, background: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="min-w-0 flex-1">
            {selectedEntry ? (
              <p className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                Linking to{" "}
                <span className="text-foreground" style={{ fontWeight: 600 }}>
                  {selectedEntry.name}
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground" style={{ fontSize: 11 }}>
                Select an identity to link this username
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid var(--border)",
                background: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedId}
              className="px-4 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: 12,
                fontWeight: 600,
                background: selectedId ? "var(--primary)" : "var(--muted)",
                color: selectedId ? "var(--primary-foreground)" : "var(--muted-foreground)",
                cursor: selectedId ? "pointer" : "not-allowed",
                border: "none",
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}