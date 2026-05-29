import { useState, useEffect } from "react";
import { Sparkles, ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { CoachStep } from "./types";

interface CoachMarkProps {
  steps: CoachStep[];
  active: boolean;
  onClose?: () => void;
  onFinish?: () => void;
  initialStep?: number;
}

export function CoachMark({ steps, active, onClose, onFinish, initialStep = 0 }: CoachMarkProps) {
  const [idx, setIdx] = useState(initialStep);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) return;
    function update() {
      const step = steps[idx];
      if (!step) return setRect(null);
      const el = document.querySelector(step.target);
      if (!el) return setRect(null);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setRect(el.getBoundingClientRect());
      }, 200);
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [idx, active, steps]);

  useEffect(() => {
    if (active) setIdx(initialStep);
  }, [active, initialStep]);

  if (!active || !steps[idx]) return null;

  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const isFirst = idx === 0;

  function next() {
    if (isLast) {
      onFinish?.();
      onClose?.();
    } else {
      setIdx((i) => i + 1);
    }
  }
  function back() {
    if (!isFirst) setIdx((i) => i - 1);
  }

  const padding = 8;
  const sx = rect ? rect.left - padding : 0;
  const sy = rect ? rect.top - padding : 0;
  const sw = rect ? rect.width + padding * 2 : 0;
  const sh = rect ? rect.height + padding * 2 : 0;

  const tooltipWidth = 360;
  const tooltipMinH = 200;
  const margin = 16;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  let topPos = vh - tooltipMinH - margin;
  let leftPos = vw - tooltipWidth - margin;
  let arrow: "top" | "bottom" | null = null;

  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height) - margin;
    const spaceAbove = rect.top - margin;
    if (spaceBelow >= tooltipMinH) {
      topPos = rect.top + rect.height + 12;
      leftPos = Math.max(margin, Math.min(vw - tooltipWidth - margin, rect.left + rect.width / 2 - tooltipWidth / 2));
      arrow = "top";
    } else if (spaceAbove >= tooltipMinH) {
      topPos = rect.top - tooltipMinH - 12;
      leftPos = Math.max(margin, Math.min(vw - tooltipWidth - margin, rect.left + rect.width / 2 - tooltipWidth / 2));
      arrow = "bottom";
    }
  }

  return (
    <div className="fixed inset-0 z-[500]">
      <svg className="absolute inset-0" width={vw} height={vh}>
        <defs>
          <mask id="coach-mask">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            {rect && (
              <rect x={sx} y={sy} width={sw} height={sh} rx="12" ry="12" fill="black" />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width={vw} height={vh}
          fill="rgba(15,23,42,0.55)"
          mask="url(#coach-mask)"
          className="transition-all duration-300"
        />
        {rect && (
          <rect
            x={sx} y={sy} width={sw} height={sh}
            rx="12" ry="12"
            fill="none" stroke="#3b82f6" strokeWidth="2"
            className="transition-all duration-300"
          />
        )}
      </svg>

      <div
        className="fixed z-[501] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:bg-slate-800 dark:border-slate-700"
        style={{ top: topPos, left: leftPos, width: tooltipWidth }}
      >
        <div className="flex items-center gap-1 mb-3">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i === idx ? "bg-blue-500" : i < idx ? "bg-blue-300" : "bg-slate-200 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2">
          <Sparkles size={11} /> Guided tour · Step {idx + 1} of {steps.length}
        </div>
        <h3 className="text-[16px] font-semibold text-slate-800 mb-1.5 dark:text-slate-200">
          {step.title}
        </h3>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-4 dark:text-slate-400">
          {step.body}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:hover:bg-slate-700"
            onClick={() => onClose?.()}
          >
            Skip tour
          </button>
          <div className="flex-1" />
          {!isFirst && (
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 bg-transparent cursor-pointer transition-colors dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={back}
            >
              <ArrowLeft size={12} /> Back
            </button>
          )}
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
            onClick={next}
          >
            {isLast ? (
              <>Finish tour <Check size={12} /></>
            ) : (
              <>Next <ArrowRight size={12} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
