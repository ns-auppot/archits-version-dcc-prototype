import { Sparkles, ArrowLeft, ArrowRight, X, CheckCircle } from "lucide-react";
import type { SetupStep, StepStatus } from "./types";

interface SetupBannerProps {
  steps: SetupStep[];
  currentStepId: string;
  statuses: Record<string, StepStatus>;
  onBackToHub: () => void;
  onContinue: () => void;
  onSkip: (() => void) | null;
  dismissed: boolean;
  onDismiss: () => void;
}

export function SetupBanner({
  steps,
  currentStepId,
  statuses,
  onBackToHub,
  onContinue,
  onSkip,
  dismissed,
  onDismiss,
}: SetupBannerProps) {
  if (dismissed) return null;
  const idx = steps.findIndex((s) => s.id === currentStepId);
  if (idx < 0) return null;
  const step = steps[idx];
  const nextStep = steps[idx + 1];
  const isDone = statuses[currentStepId] === "done";

  return (
    <div className="sticky top-0 z-30 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-2 dark:from-blue-950/30 dark:to-slate-900 dark:border-blue-900/40">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-500">
          <Sparkles size={11} /> SETUP MODE
        </span>

        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold text-slate-800 truncate dark:text-slate-200">
            Step {step.num} of {steps.length} · {step.title}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {step.eyebrow} · {step.time}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2" role="progressbar" aria-label="Setup progress">
          {steps.map((s, i) => {
            const st = statuses[s.id];
            const dotCls =
              st === "done"
                ? "bg-green-500"
                : st === "skipped"
                  ? "bg-slate-300 dark:bg-slate-600"
                  : i === idx
                    ? "bg-blue-500"
                    : "bg-slate-200 dark:bg-slate-700";
            return (
              <span
                key={s.id}
                className={`w-2 h-2 rounded-full ${dotCls}`}
                title={`${s.num}. ${s.title}`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onBackToHub}
          >
            <ArrowLeft size={13} /> Setup Guide
          </button>

          {isDone && nextStep && (
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
              onClick={onContinue}
            >
              Continue: {nextStep.title} <ArrowRight size={13} />
            </button>
          )}
          {isDone && !nextStep && (
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
              onClick={onBackToHub}
            >
              Finish setup <CheckCircle size={13} />
            </button>
          )}
          {!isDone && step.optional && onSkip && (
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 bg-transparent cursor-pointer transition-colors dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={onSkip}
            >
              Skip step
            </button>
          )}

          <button
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Dismiss setup mode"
            onClick={onDismiss}
            title="Hide setup banner — you can resume from the Overview page"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
