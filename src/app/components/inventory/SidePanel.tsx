import { useEffect, useRef } from "react";
import { X, ArrowLeft, FileText, Columns, LayoutGrid, Globe, User } from "lucide-react";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  /** Optional inline content rendered after the subtitle (e.g. a "Stale" badge) */
  subtitleExtra?: React.ReactNode;
  /** Optional extra content rendered below title/subtitle inside the header area */
  headerExtra?: React.ReactNode;
  /** Optional action buttons rendered in the header next to the close button */
  headerActions?: React.ReactNode;
  /** Optional icon rendered in a small container to the left of the title */
  titleIcon?: React.ReactNode;
  /** Optional badge rendered inline next to the title (after the UCI score) */
  titleBadge?: React.ReactNode;
  /** When set, renders a UCI score badge inline next to the panel title */
  uciScore?: number;
  /** When set, renders a generic icon for the panel type ("file" = unstructured, "column" = structured) if no titleIcon is provided */
  panelType?: "file" | "column" | "app" | "website" | "identity";
  width?: number | string;
  children: React.ReactNode;
  /** When true, disables Escape/click-outside handlers (used when a stacked panel is on top) */
  suspended?: boolean;
  /**
   * Base z-index layer. The backdrop renders at this value; the panel div renders
   * at zIndex + 5 so it always sits above its own backdrop. Default 50.
   *
   * Layering for a typical two-panel stack:
   *   First panel:   backdrop = 50, panel div = 55
   *   Stacked child: no backdrop (hideBackdrop), panel div = 65  (zIndex=60)
   * → mask (50) < first panel (55) < stacked child (65)
   */
  zIndex?: number;
  /** Hide the default backdrop (useful for stacked panels that share the parent's backdrop) */
  hideBackdrop?: boolean;
  /** When true, suppresses the built-in header (title/subtitle/close row) — use when the child renders its own header */
  hideHeader?: boolean;
  /** When true, shifts this panel left and applies a dim overlay — signals that a child panel is stacked on top */
  pushed?: boolean;
  /** When true, applies an enhanced left-side shadow — marks this as the topmost stacked panel */
  stacked?: boolean;
  /**
   * Width of the stacked child panel (e.g. "min(840px, 90vw)").
   * When provided and pushed=true, offsets this panel's right edge so exactly 24px of it
   * remains visible to the left of the stacked panel.
   */
  pushedRightOffset?: string | number;
}

export function SidePanel({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  subtitleExtra,
  headerExtra,
  headerActions,
  titleIcon,
  panelType,
  width = 420,
  children,
  suspended = false,
  zIndex = 50,
  hideBackdrop = false,
  hideHeader = false,
  pushed = false,
  stacked = false,
  uciScore,
  titleBadge,
  pushedRightOffset,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open || suspended) return;
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
  }, [open, onClose, onBack, suspended]);

  // Close on click outside
  useEffect(() => {
    if (!open || suspended) return;
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
  }, [open, onClose, suspended]);

  return (
    <>
      {/* ── Backdrop ── (zIndex = base layer, bottom of the stack) */}
      {!hideBackdrop && (
        <div
          className="fixed inset-0"
          style={{
            zIndex,
            background: "rgba(0,0,0,0.25)",
            opacity: open ? 1 : 0,
            visibility: open ? "visible" : "hidden",
            pointerEvents: open && !suspended ? "auto" : "none",
            transition: "opacity 200ms ease, visibility 200ms ease",
          }}
        />
      )}

      {/* ── Panel wrapper ── (zIndex + 5 = always above its own backdrop) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: zIndex + 5,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 150ms ease, visibility 150ms ease",
        }}
      >
        <div
          ref={panelRef}
          className="absolute top-0 right-0 h-full border-l flex flex-col pointer-events-auto"
          style={{
            background: "var(--color-background)",
            // When pushed (child panel open): use a fixed 468px width.
            width: pushed && open ? 468 : width,
            // Offset right edge so exactly 24px of this panel peeks out to the left of the stacked child.
            right:
              pushed && open && pushedRightOffset !== undefined
                ? `calc(${typeof pushedRightOffset === "number" ? pushedRightOffset + "px" : pushedRightOffset} - 420px)`
                : 0,
            transform: `translateX(${!open ? "100%" : "0"})`,
            transition:
              "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), width 250ms cubic-bezier(0.16, 1, 0.3, 1), right 250ms cubic-bezier(0.16, 1, 0.3, 1)",
            borderLeftColor: stacked ? "rgba(255,255,255,0.08)" : "var(--color-border)",
            boxShadow: stacked
              ? "-16px 0 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)"
              : "-4px 0 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Header */}
          {!hideHeader && (
          <div className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-start justify-between gap-3">
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
                {titleIcon && (
                  <div className="shrink-0 flex items-center justify-center mt-0.5">
                    {titleIcon}
                  </div>
                )}
                {!titleIcon && panelType && (
                  <div className="shrink-0 flex items-center justify-center mt-0.5 text-muted-foreground">
                    {panelType === "file" ? <FileText size={16} /> : panelType === "app" ? <LayoutGrid size={16} /> : panelType === "website" ? <Globe size={16} /> : panelType === "identity" ? <User size={16} /> : <Columns size={16} />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3
                      className="text-text-bright truncate min-w-0"
                      style={{ fontSize: "15px", fontWeight: 600 }}
                    >
                      {title}
                    </h3>
                    {(() => {
                      // UCI score is only shown for Internal User and External User identity types.
                      const isUciEligible =
                        panelType !== "identity" ||
                        subtitle?.toLowerCase() === "internal user" ||
                        subtitle?.toLowerCase() === "external user";
                      if (!isUciEligible) return null;

                      // Use explicit uciScore if provided; otherwise derive one
                      // deterministically from the title when this is an identity panel.
                      const effectiveScore = uciScore !== undefined
                        ? uciScore
                        : panelType === "identity"
                          ? (() => {
                              const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                              const rng = (i: number) => { const x = Math.sin(seed * 9301 + i * 49297 + 233) * 10000; return x - Math.floor(x); };
                              const base = 40 + Math.round(rng(0) * 45);
                              let prev = base;
                              for (let i = 0; i < 12; i++) { prev = Math.min(99, Math.max(10, prev + Math.round((rng(i + 1) - 0.42) * 14))); }
                              return prev;
                            })()
                          : undefined;
                      if (effectiveScore === undefined) return null;
                      const color = effectiveScore >= 70 ? "#22c55e" : effectiveScore >= 45 ? "#f59e0b" : "#ef4444";
                      return (
                        <span
                          className="shrink-0 tabular-nums"
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color,
                            background: `${color}18`,
                            border: `1px solid ${color}35`,
                            borderRadius: "4px",
                            padding: "1px 5px",
                            letterSpacing: "0.01em",
                          }}
                        >
                          UCI {effectiveScore}
                        </span>
                      );
                    })()}
                    {titleBadge}
                  </div>
                  {(subtitle || subtitleExtra) && (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {subtitle && (
                        <span
                          className="text-muted-foreground truncate"
                          style={{ fontSize: "12px" }}
                        >
                          {subtitle}
                        </span>
                      )}
                      {subtitleExtra}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {headerActions}
                <button
                  onClick={onClose}
                  className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-text-bright hover:bg-nav-active transition-colors"
                  aria-label="Close panel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {headerExtra && (
              <div className="mt-2.5">{headerExtra}</div>
            )}
          </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}