// Right panel configuration content for action modals
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link, List, ListOrdered, AlertTriangle, CheckCircle2, UserX, Users } from "lucide-react";
import { InfoTooltip } from "../ui/tooltip";

// ── Shared styled select ─────────────────────────────────────────────────────
function StyledSelect({ children, value, onChange }: { children: React.ReactNode; value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="w-full px-3 py-2 rounded border appearance-none pr-8"
        style={{
          fontSize: "12px",
          borderColor: "var(--color-border)",
          background: "var(--color-input, var(--color-background))",
          color: "var(--color-foreground)",
        }}
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-muted-foreground)", marginBottom: "6px", letterSpacing: "0.02em" }}>
      {children}
    </div>
  );
}

const EMAIL_TEMPLATES = [
  "Default",
  "Test Email Template name",
  "Test Email Template name Clone",
  "Sample - Test - Shubham",
  "Template-Sample-API-New",
];

const NOTIFY_RECIPIENTS: { key: string; label: string; tooltip?: string }[] = [
  { key: "owner",          label: "Owner" },
  { key: "admin",          label: "Admin",          tooltip: "Admin specified in the application" },
  { key: "collaborators",  label: "Collaborators",  tooltip: "Users with exposure to certain content. Users are individuals or bots associated with an account in the protected application, and with (read or write) access to content in the application" },
  { key: "last-modifier",  label: "Last Modifier",  tooltip: "Last Modifier is identified on a best-effort basis. Some SaaS apps (e.g., OneDrive) may delay user data via APIs, so the user shown may be from a prior edit of the file." },
  { key: "selected-users", label: "Selected Users" },
];

function TemplateDropdown({
  id, openKey, setOpenKey, selected, setSelected,
}: {
  id: string;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  selected: string;
  setSelected: (v: string) => void;
}) {
  const open = openKey === id;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggle = () => {
    if (open) {
      setOpenKey(null);
    } else {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
      }
      setOpenKey(id);
    }
  };

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1"
        style={{ fontSize: "12px", color: "var(--color-primary, #3b82f6)", fontWeight: 500, whiteSpace: "nowrap" }}
      >
        {selected} <ChevronDown size={11} />
      </button>
      {open && createPortal(
        <div
          className="fixed rounded-lg shadow-xl border overflow-hidden"
          style={{
            top: coords.top,
            left: coords.left,
            width: 260,
            zIndex: 99999,
            background: "var(--color-card, var(--color-background))",
            borderColor: "var(--color-border)",
          }}
        >
          {EMAIL_TEMPLATES.map(t => (
            <button
              key={t}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setSelected(t); setOpenKey(null); }}
              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors"
              style={{ fontSize: "12px", color: "var(--color-foreground)" }}
            >
              {t}
            </button>
          ))}
          <div style={{ borderTop: "1px solid var(--color-border)" }}>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => setOpenKey(null)}
              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors"
              style={{ fontSize: "12px", color: "var(--color-primary, #3b82f6)" }}
            >
              + Create New
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function NotifyUsersCheckbox() {
  const [checked, setChecked] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>(
    Object.fromEntries(NOTIFY_RECIPIENTS.map(r => [r.key, "Default"]))
  );
  const [checkedRecipients, setCheckedRecipients] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFY_RECIPIENTS.map(r => [r.key, false]))
  );

  return (
    <div>
      <label className="flex items-center gap-2" style={{ fontSize: "12px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          style={{ width: "14px", height: "14px" }}
        />
        <span style={{ fontWeight: checked ? 600 : 400 }}>Notify Users</span>
      </label>

      {checked && (
        <div style={{ marginTop: "10px", paddingLeft: "22px" }}>
          {NOTIFY_RECIPIENTS.map(r => (
            <div key={r.key} style={{ marginBottom: "10px" }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!checkedRecipients[r.key]}
                onChange={e => setCheckedRecipients(prev => ({ ...prev, [r.key]: e.target.checked }))}
                style={{ width: "13px", height: "13px", flexShrink: 0 }}
              />
              {/* Label + tooltip inline */}
              <span className="flex items-center gap-1" style={{ fontSize: "12px" }}>
                {r.label}
                {r.tooltip && <InfoTooltip text={r.tooltip} />}
              </span>
              {r.key === "admin" && (
                <a href="#" style={{ fontSize: "11px", color: "var(--color-primary, #3b82f6)", display: "flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}>
                  Set up app admin emails
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M10 2H7M10 2V5M10 2L5.5 6.5M5 3H2v7h7V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
              <div style={{ marginLeft: "auto" }}>
                <TemplateDropdown
                  id={r.key}
                  openKey={openKey}
                  setOpenKey={setOpenKey}
                  selected={selectedTemplates[r.key]}
                  setSelected={v => setSelectedTemplates(prev => ({ ...prev, [r.key]: v }))}
                />
              </div>
            </div>
            {r.key === "selected-users" && checkedRecipients["selected-users"] && (
              <div style={{ marginTop: "6px", paddingLeft: "19px" }}>
                <input
                  type="email"
                  placeholder="Email address (comma separated)"
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    fontSize: "12px",
                    borderColor: "var(--color-border)",
                    background: "var(--color-input, var(--color-background))",
                    color: "var(--color-foreground)",
                  }}
                />
              </div>
            )}
            </div>
          ))}

          <div style={{ marginTop: "6px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-muted-foreground)", marginBottom: "6px" }}>
              FROM USER (OPTIONAL)
            </div>
            <input
              type="email"
              placeholder="Email address"
              className="w-full px-3 py-2 rounded border"
              style={{
                fontSize: "12px",
                borderColor: "var(--color-border)",
                background: "var(--color-input, var(--color-background))",
                color: "var(--color-foreground)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 1. Apply Sensitivity Label ───────────────────────────────────────────────
export function ApplySensitivityLabelConfig() {
  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* Vendor + Instance row */}
        <div className="flex gap-3" style={{ marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <FormLabel>Vendor</FormLabel>
            <StyledSelect>
              <option value="">Select</option>
              <option>Microsoft Purview</option>
              <option>Google Workspace</option>
              <option>Box</option>
              <option>Symantec</option>
            </StyledSelect>
          </div>
          <div style={{ flex: 1 }}>
            <FormLabel>Instance</FormLabel>
            <StyledSelect>
              <option value="">Select</option>
              <option>Production</option>
              <option>Staging</option>
              <option>Dev</option>
            </StyledSelect>
          </div>
        </div>

        {/* Sensitivity Label */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Sensitivity Label</FormLabel>
          <StyledSelect>
            <option value="">Select</option>
            <option>Highly Confidential</option>
            <option>Confidential</option>
            <option>Internal</option>
            <option>Public</option>
          </StyledSelect>
        </div>

        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 2. Quarantine ────────────────────────────────────────────────────────────
export function QuarantineConfig() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Quarantine Profile</FormLabel>
          <div className="relative">
            <select
              className="w-full px-3 py-2 rounded border appearance-none pr-8"
              style={{
                fontSize: "12px",
                borderColor: "var(--color-border)",
                background: "var(--color-input, var(--color-background))",
                color: "var(--color-foreground)",
              }}
            >
              <option value="">Profile: Select</option>
              <option>Default Quarantine</option>
              <option>HIPAA Quarantine</option>
              <option>PCI Quarantine</option>
              <option>Legal Hold Quarantine</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
          </div>
        </div>

        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 3. Restrict Access ───────────────────────────────────────────────────────
type RestrictMode =
  | "internal-users"
  | "owner"
  | "owners-domain"
  | "specific-domains"
  | "specific-domains-internal"
  | "specific-users";

const RESTRICT_MODES: { value: RestrictMode; label: string }[] = [
  { value: "internal-users",         label: "Restrict Access to Internal Users" },
  { value: "owner",                   label: "Restrict Access to Owner" },
  { value: "owners-domain",           label: "Restrict Access to Owner's Domain" },
  { value: "specific-domains",        label: "Restrict Access to Specific Domains" },
  { value: "specific-domains-internal", label: "Restrict Access to Specific Domains and Internal Users" },
  { value: "specific-users",          label: "Restrict Access to Specific Users" },
];

const MOCK_DOMAINS = ["trustedVendors", "abcd", "adad"];
const MOCK_USERS   = ["user exclusion gmail", "user exclusion email", "bmurali1"];

export function RestrictAccessConfig() {
  const [mode, setMode] = useState<RestrictMode>("internal-users");
  const [domainSearch, setDomainSearch] = useState("");
  const [userSearch, setUserSearch]     = useState("");

  const simpleMode = mode === "internal-users" || mode === "owner" || mode === "owners-domain";

  const modeLabel: Record<RestrictMode, string> = {
    "internal-users":           "internal users",
    "owner":                    "owner",
    "owners-domain":            "owner's domain",
    "specific-domains":         "specific domains",
    "specific-domains-internal":"specific domains and internal users",
    "specific-users":           "specific users",
  };

  return (
    <div className="flex flex-col h-full">
      <div style={{ marginBottom: "14px" }}>
        <div className="relative">
          <select
            value={mode}
            onChange={e => setMode(e.target.value as RestrictMode)}
            className="w-full px-3 py-2 rounded border appearance-none pr-8"
            style={{
              fontSize: "12px",
              fontWeight: 500,
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
            }}
          >
            {RESTRICT_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {simpleMode ? (
          <>
            <NotifyUsersCheckbox />
          </>
        ) : mode === "specific-domains" || mode === "specific-domains-internal" ? (
          <>
            <div style={{ marginBottom: "10px" }}>
              <FormLabel>Specify Domain Profile</FormLabel>
              <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", marginBottom: "8px" }}>
                Domains in this specific profile {mode === "specific-domains-internal" ? "in addition to internal users " : ""}will have access.
              </p>
              <div className="relative" style={{ marginBottom: "8px" }}>
                <select
                  className="w-full px-3 py-2 rounded border appearance-none pr-8"
                  style={{
                    fontSize: "12px",
                    borderColor: "var(--color-border)",
                    background: "var(--color-input, var(--color-background))",
                    color: "var(--color-foreground)",
                  }}
                >
                  <option value="">Domain: Select</option>
                  <option>TrustedVendors</option>
                  <option>PartnerDomains</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            </div>

            {/* Search + list */}
            <div
              className="rounded border"
              style={{ borderColor: "var(--color-border)", overflow: "hidden" }}
            >
              <div className="flex items-center gap-2 px-2 py-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Search size={12} style={{ color: "var(--color-muted-foreground)" }} />
                <input
                  type="text"
                  placeholder="Search"
                  value={domainSearch}
                  onChange={e => setDomainSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: "12px", color: "var(--color-foreground)" }}
                />
              </div>
              {MOCK_DOMAINS.filter(d => d.toLowerCase().includes(domainSearch.toLowerCase())).map(d => (
                <div key={d} className="px-3 py-1.5 hover:bg-muted cursor-pointer" style={{ fontSize: "12px" }}>{d}</div>
              ))}
            </div>
          </>
        ) : mode === "specific-users" ? (
          <>
            <div style={{ marginBottom: "10px" }}>
              <FormLabel>Specify User Profile</FormLabel>
              <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", marginBottom: "8px" }}>
                Users in this specific profile will have access.
              </p>
              <div className="relative" style={{ marginBottom: "8px" }}>
                <select
                  className="w-full px-3 py-2 rounded border appearance-none pr-8"
                  style={{
                    fontSize: "12px",
                    borderColor: "var(--color-border)",
                    background: "var(--color-input, var(--color-background))",
                    color: "var(--color-foreground)",
                  }}
                >
                  <option value="">User: Select</option>
                  <option>UserExclusionList</option>
                  <option>AdminUsers</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
              </div>
            </div>

            <div
              className="rounded border"
              style={{ borderColor: "var(--color-border)", overflow: "hidden" }}
            >
              <div className="flex items-center gap-2 px-2 py-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Search size={12} style={{ color: "var(--color-muted-foreground)" }} />
                <input
                  type="text"
                  placeholder="Search"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: "12px", color: "var(--color-foreground)" }}
                />
              </div>
              {MOCK_USERS.filter(u => u.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                <div key={u} className="px-3 py-1.5 hover:bg-muted cursor-pointer" style={{ fontSize: "12px" }}>{u}</div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── 4. Change Ownership ──────────────────────────────────────────────────────
export function ChangeOwnershipConfig() {
  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Change Owner to User</FormLabel>
          <input
            type="email"
            placeholder="Enter user email"
            className="w-full px-3 py-2 rounded border"
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
            }}
          />
        </div>

        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 5. Notify Owner ──────────────────────────────────────────────────────────
export function NotifyOwnerConfig() {
  const [subject] = useState("Sensitive data detected. Reference: 2B8EA432-C79A6");
  const defaultBody = `Dear developer@developers.cloudflare.com,

The following document/object has been found to have sensitive information.

< insert instructions to recipients >

Caveat
Please publish this data be removed.

Or Please ensure to include sensitive information such as credit card details.`;

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* TO */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>TO</FormLabel>
          <div
            className="px-3 py-2 rounded border"
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
            }}
          >
            developer@developers.cloudflare.com
          </div>
        </div>

        {/* EMAIL CONTENT */}
        <div style={{ marginBottom: "10px" }}>
          <div className="flex items-center justify-between">
            <FormLabel>EMAIL CONTENT</FormLabel>
            <button style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 500 }}>EDIT TEMPLATE</button>
          </div>
          <div className="relative">
            <select
              className="w-full px-3 py-2 rounded border appearance-none pr-8"
              style={{
                fontSize: "12px",
                borderColor: "var(--color-border)",
                background: "var(--color-input, var(--color-background))",
                color: "var(--color-foreground)",
              }}
            >
              <option>Policy Violation Notice</option>
              <option>Security Alert</option>
              <option>Compliance Review Required</option>
              <option>Custom Message</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
          </div>
        </div>

        {/* SUBJECT */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>SUBJECT</FormLabel>
          <input
            type="text"
            defaultValue={subject}
            className="w-full px-3 py-2 rounded border"
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
            }}
          />
        </div>

        {/* MESSAGE */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>MESSAGE</FormLabel>
          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-t border border-b-0"
            style={{ borderColor: "var(--color-border)", background: "var(--color-muted)", flexWrap: "wrap" }}
          >
            {[Bold, Italic, Underline].map((Icon, i) => (
              <button key={i} className="p-1 rounded hover:bg-muted-foreground/10">
                <Icon size={12} />
              </button>
            ))}
            <div style={{ width: "1px", height: "14px", background: "var(--color-border)", margin: "0 2px" }} />
            {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => (
              <button key={i} className="p-1 rounded hover:bg-muted-foreground/10">
                <Icon size={12} />
              </button>
            ))}
            <div style={{ width: "1px", height: "14px", background: "var(--color-border)", margin: "0 2px" }} />
            {[List, ListOrdered, Link].map((Icon, i) => (
              <button key={i} className="p-1 rounded hover:bg-muted-foreground/10">
                <Icon size={12} />
              </button>
            ))}
          </div>
          <textarea
            className="w-full px-3 py-2 rounded-b border"
            rows={7}
            defaultValue={defaultBody}
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* FROM */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>FROM</FormLabel>
          <input
            type="email"
            placeholder="From email address (optional)"
            className="w-full px-3 py-2 rounded border"
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 6. Legal Hold ────────────────────────────────────────────────────────────
export function LegalHoldConfig() {
  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Legal Hold Profile</FormLabel>
          <div className="relative">
            <select
              className="w-full px-3 py-2 rounded border appearance-none pr-8"
              style={{
                fontSize: "12px",
                borderColor: "var(--color-border)",
                background: "var(--color-input, var(--color-background))",
                color: "var(--color-foreground)",
              }}
            >
              <option value="">Profile: Select</option>
              <option>Litigation Hold</option>
              <option>Regulatory Investigation</option>
              <option>Internal Audit</option>
              <option>SEC Inquiry</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
          </div>
        </div>

        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 7. Delete ─────────────────────────────────────────────────────────────────
export function DeleteConfig() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* Warning banner */}
        <div
          className="flex items-start gap-3 rounded-lg p-3"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            marginBottom: "16px",
          }}
        >
          <AlertTriangle size={15} style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#f87171", marginBottom: "4px" }}>
              Irreversible Action
            </p>
            <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
              Deletion permanently removes the data. This action cannot be undone. Ensure you have the appropriate authorization before proceeding.
            </p>
          </div>
        </div>

        {/* Retention */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Retention Grace Period</FormLabel>
          <StyledSelect>
            <option>No grace period (immediate)</option>
            <option>24 hours (soft delete)</option>
            <option>7 days (soft delete)</option>
            <option>30 days (soft delete)</option>
          </StyledSelect>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: "12px", marginBottom: "14px" }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ width: "14px", height: "14px", marginTop: "1px", cursor: "pointer" }}
          />
          <span style={{ lineHeight: 1.6 }}>
            I confirm this data should be deleted and I have the necessary authorization
          </span>
        </label>

        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 8. Apply DLP Policy ───────────────────────────────────────────────────────
export function ApplyDLPConfig() {
  const [scope, setScope] = useState<"all" | "new-only">("all");

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* DLP Profile */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>DLP Profile</FormLabel>
          <StyledSelect>
            <option value="">Select profile</option>
            <option>PII Protection — Strict</option>
            <option>PCI-DSS Compliance</option>
            <option>HIPAA Safeguards</option>
            <option>Financial Data Controls</option>
            <option>IP & Source Code Protection</option>
            <option>Custom Profile</option>
          </StyledSelect>
        </div>

        {/* App / Instance */}
        <div className="flex gap-3" style={{ marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <FormLabel>Application</FormLabel>
            <StyledSelect>
              <option value="">Select app</option>
              <option>Google Drive</option>
              <option>SharePoint</option>
              <option>OneDrive</option>
              <option>Slack</option>
              <option>GitHub</option>
            </StyledSelect>
          </div>
          <div style={{ flex: 1 }}>
            <FormLabel>Instance</FormLabel>
            <StyledSelect>
              <option value="">Select</option>
              <option>Production</option>
              <option>Staging</option>
            </StyledSelect>
          </div>
        </div>

        {/* Action on violation */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Action on Violation</FormLabel>
          <StyledSelect>
            <option>Alert — SecOps</option>
            <option>Alert — Data Owner</option>
            <option>Block Upload</option>
            <option>Block Download</option>
            <option>Quarantine on Detection</option>
          </StyledSelect>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", marginBottom: "14px" }} />

        {/* Apply scope */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Apply To</FormLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { value: "all", label: "All existing findings + future data" },
              { value: "new-only", label: "Future data only (prospective)" },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "12px" }}>
                <input
                  type="radio"
                  name="dlp-scope"
                  value={opt.value}
                  checked={scope === opt.value}
                  onChange={() => setScope(opt.value as "all" | "new-only")}
                  style={{ width: "14px", height: "14px", cursor: "pointer" }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", marginBottom: "14px" }} />
        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 9. Request Justification ──────────────────────────────────────────────────
export function RequestJustificationConfig() {
  const defaultMsg = `Dear [owner],

Your data has been flagged during a routine data security scan. Please provide a business justification for the following:

< describe the flagged item >

Please respond within 5 business days. If no response is received, a remediation action may be taken automatically.`;

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* TO */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>TO</FormLabel>
          <div
            className="px-3 py-2 rounded border"
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-muted-foreground)",
            }}
          >
            Data Owner (resolved at execution)
          </div>
        </div>

        {/* Deadline */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>Response Deadline</FormLabel>
          <StyledSelect>
            <option>3 business days</option>
            <option>5 business days</option>
            <option>7 business days</option>
            <option>14 business days</option>
            <option>30 days</option>
          </StyledSelect>
        </div>

        {/* Action if no response */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>If No Response</FormLabel>
          <StyledSelect>
            <option value="">No automatic action</option>
            <option>Escalate to manager</option>
            <option>Apply Quarantine</option>
            <option>Revoke external sharing</option>
            <option>Alert SecOps</option>
          </StyledSelect>
        </div>

        {/* Message */}
        <div style={{ marginBottom: "10px" }}>
          <FormLabel>MESSAGE</FormLabel>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-t border border-b-0"
            style={{ borderColor: "var(--color-border)", background: "var(--color-muted)", flexWrap: "wrap" }}
          >
            {[Bold, Italic, Underline].map((Icon, i) => (
              <button key={i} className="p-1 rounded hover:bg-muted-foreground/10">
                <Icon size={12} />
              </button>
            ))}
            <div style={{ width: "1px", height: "14px", background: "var(--color-border)", margin: "0 2px" }} />
            {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => (
              <button key={i} className="p-1 rounded hover:bg-muted-foreground/10">
                <Icon size={12} />
              </button>
            ))}
          </div>
          <textarea
            className="w-full px-3 py-2 rounded-b border"
            rows={6}
            defaultValue={defaultMsg}
            style={{
              fontSize: "12px",
              borderColor: "var(--color-border)",
              background: "var(--color-input, var(--color-background))",
              color: "var(--color-foreground)",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 10. Perform Targeted Scan ─────────────────────────────────────────────────
export function PerformTargetedScanConfig() {
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">("immediate");

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* Info banner */}
        <div
          className="flex items-start gap-3 rounded-lg p-3"
          style={{
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            marginBottom: "16px",
          }}
        >
          <CheckCircle2 size={14} style={{ color: "#60a5fa", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
            A targeted scan will check all data stores implicated by this rule for new or changed sensitive data exposures.
          </p>
        </div>

        {/* DLP Policy to use */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Scan Policy</FormLabel>
          <StyledSelect>
            <option>Use current rule policy (default)</option>
            <option>PII Detection — Full</option>
            <option>Financial Data Scan</option>
            <option>Healthcare Compliance</option>
            <option>Custom Policy</option>
          </StyledSelect>
        </div>


        {/* Schedule */}
        <div style={{ marginBottom: "14px" }}>
          <FormLabel>Schedule</FormLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
            {[
              { value: "immediate", label: "Run immediately", icon: "⚡" },
              { value: "scheduled", label: "Schedule for later", icon: "🕐" },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "12px" }}>
                <input
                  type="radio"
                  name="scan-schedule"
                  value={opt.value}
                  checked={scheduleType === opt.value}
                  onChange={() => setScheduleType(opt.value as "immediate" | "scheduled")}
                  style={{ width: "14px", height: "14px", cursor: "pointer" }}
                />
                <span>{opt.icon} {opt.label}</span>
              </label>
            ))}
          </div>

          {scheduleType === "scheduled" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <FormLabel>Date</FormLabel>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    fontSize: "12px",
                    borderColor: "var(--color-border)",
                    background: "var(--color-input, var(--color-background))",
                    color: "var(--color-foreground)",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormLabel>Time</FormLabel>
                <input
                  type="time"
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    fontSize: "12px",
                    borderColor: "var(--color-border)",
                    background: "var(--color-input, var(--color-background))",
                    color: "var(--color-foreground)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 11. Revoke Public Sharing ─────────────────────────────────────────────────
export function RevokePublicSharingConfig() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex items-start gap-3 rounded-lg p-3" style={{
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          marginBottom: "16px",
        }}>
          <UserX size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
            All public "anyone with a link" sharing permissions for this file will be revoked. Anyone currently accessing via a public link will lose access immediately.
          </p>
        </div>
        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 12. Revoke External Sharing ───────────────────────────────────────────────
export function RevokeExternalSharingConfig() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex items-start gap-3 rounded-lg p-3" style={{
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          marginBottom: "16px",
        }}>
          <Users size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
            Sharing permissions for all external users and groups (outside your organization) will be removed from this file.
          </p>
        </div>
        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}

// ── 13. Revoke Company-wide Sharing ───────────────────────────────────────────
export function RevokeCompanySharingConfig() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex items-start gap-3 rounded-lg p-3" style={{
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          marginBottom: "16px",
        }}>
          <UserX size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "11px", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
            Broad "anyone in the company" sharing permissions will be removed. Only users with explicit individual or group permissions will retain access.
          </p>
        </div>
        <NotifyUsersCheckbox />
      </div>
    </div>
  );
}