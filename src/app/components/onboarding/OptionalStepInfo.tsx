import { Info, ChevronsRight } from "lucide-react";
import type { SetupStep } from "./types";

interface OptionalStepInfoProps {
  step: SetupStep;
  onSkip?: () => void;
}

export function OptionalStepInfo({ step, onSkip }: OptionalStepInfoProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50/60 px-4 py-3 dark:bg-yellow-900/10 dark:border-yellow-800/40">
      <Info size={14} className="shrink-0 mt-0.5 text-yellow-600" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
          This step is optional
        </div>
        {step.whenToSkip && (
          <div className="text-[12px] text-slate-600 mt-1 leading-relaxed dark:text-slate-400">
            {step.whenToSkip}
          </div>
        )}
      </div>
      {onSkip && (
        <button
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={onSkip}
        >
          Skip this step <ChevronsRight size={12} />
        </button>
      )}
    </div>
  );
}
