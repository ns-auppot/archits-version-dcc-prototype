import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface PanelDropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface PanelDropdownProps {
  value: string;
  options: PanelDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function PanelDropdown({ value, options, onChange, className = "" }: PanelDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded border transition-colors cursor-pointer text-left ${
          open
            ? "bg-white/8 border-primary/40 text-foreground"
            : "bg-white/5 border-border/40 text-foreground/80 hover:bg-white/[0.07] hover:border-border/60"
        }`}
        style={{ fontSize: "11px" }}
      >
        <span className="flex-1 truncate">{selected?.label ?? "Select…"}</span>
        <ChevronDown
          size={11}
          className={`shrink-0 text-muted-foreground/60 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover list */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-border bg-surface-raised shadow-2xl z-50 overflow-hidden"
          style={{ minWidth: "100%" }}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
                }`}
                style={{ fontSize: "12px" }}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {isActive && <Check size={11} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
