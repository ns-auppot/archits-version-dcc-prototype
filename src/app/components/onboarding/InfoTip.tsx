import { useState, useRef, type ReactNode } from "react";
import { Info } from "lucide-react";

interface InfoTipProps {
  children: ReactNode;
  size?: number;
  color?: string;
  label?: string;
}

export function InfoTip({ children, size = 12, color = "#94a3b8", label }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function compute() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popH = 90;
    const popW = 280;
    const above = r.top > popH + 16;
    const top = above ? r.top - popH - 10 : r.bottom + 10;
    const left = Math.max(8, Math.min(window.innerWidth - popW - 8, r.left + r.width / 2 - popW / 2));
    setCoords({ top, left, above });
  }

  function onEnter() {
    compute();
    setOpen(true);
  }
  function onLeave() {
    setOpen(false);
  }

  return (
    <span className="inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label || "More info"}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open ? onLeave() : onEnter();
        }}
        className="inline-flex items-center justify-center ml-1 rounded-full bg-transparent border-none cursor-help"
        style={{ width: size + 4, height: size + 4, padding: 0, color }}
      >
        <Info size={size} />
      </button>
      {open && coords && (
        <div
          className="fixed z-[350] rounded-lg border border-slate-200 bg-white p-3 text-[12px] leading-relaxed text-slate-600 shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
          style={{ top: coords.top, left: coords.left, width: 280 }}
        >
          {children}
          <span
            className={`absolute w-2.5 h-2.5 bg-white border border-slate-200 rotate-45 dark:bg-slate-800 dark:border-slate-700 ${
              coords.above
                ? "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-0 border-l-0"
                : "top-[-6px] left-1/2 -translate-x-1/2 border-b-0 border-r-0"
            }`}
          />
        </div>
      )}
    </span>
  );
}
