import { useEffect, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  width?: number | string;
  children: React.ReactNode;
}

export function SidePanel({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  width = 420,
  children,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (onBack) {
          onBack();
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, onBack]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay to avoid the same click that opened the panel from closing it
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      style={{
        opacity: open ? 1 : 0,
        visibility: open ? "visible" : "hidden",
        transition: "opacity 150ms ease, visibility 150ms ease",
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          background: "rgba(0,0,0,0.25)",
          opacity: open ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute top-0 right-0 h-full bg-background border-l border-border flex flex-col pointer-events-auto shadow-2xl"
        style={{
          width,
          transform: open ? "translateX(0)" : `translateX(100%)`,
          transition:
            "transform 200ms cubic-bezier(0.16, 1, 0.3, 1), width 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start gap-2 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-nav-active transition-colors mt-0.5"
                aria-label="Back"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div className="min-w-0">
              <h3
                className="text-text-bright truncate"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  className="text-muted-foreground mt-0.5 truncate"
                  style={{ fontSize: "12px" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-nav-active transition-colors"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}