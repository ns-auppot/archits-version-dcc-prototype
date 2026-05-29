import { Fragment } from "react";
import {
  CheckCircle, Check, Sparkles, ArrowRight, Clock,
  ChevronsRight, CircleDot,
} from "lucide-react";
import type { SetupStep, StepStatus } from "./types";

interface SetupGuideProps {
  steps: SetupStep[];
  statuses: Record<string, StepStatus>;
  activeStepId: string;
  onStepClick: (s: SetupStep) => void;
  onResume: (s: SetupStep) => void;
  layout?: "timeline" | "grid" | "stepper";
  onSkipAll?: () => void;
  allDone?: boolean;
  onGoToOverview?: () => void;
}

function StatusPill({ status, optional }: { status: StepStatus; optional?: boolean }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Check size={10} /> Done
      </span>
    );
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <CircleDot size={10} /> In progress
      </span>
    );
  if (status === "skipped")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <ChevronsRight size={10} /> Skipped
      </span>
    );
  if (optional)
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        Optional
      </span>
    );
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Not started
    </span>
  );
}

function SetupGuideHeader({
  statuses,
  steps,
  allDone,
  onGoToOverview,
}: {
  statuses: Record<string, StepStatus>;
  steps: SetupStep[];
  allDone: boolean;
  onGoToOverview?: () => void;
}) {
  const done = steps.filter((s) => statuses[s.id] === "done").length;
  const skipped = steps.filter((s) => statuses[s.id] === "skipped").length;
  const required = steps.filter((s) => s.required).length;
  const requiredDone = steps.filter((s) => s.required && statuses[s.id] === "done").length;
  const pct = Math.round((done / steps.length) * 100);

  if (allDone) {
    return (
      <div className="mb-6">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-green-600 bg-green-50 mb-2 dark:bg-green-900/20">
          <CheckCircle size={11} /> Setup complete
        </span>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Setup summary</h1>
        <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
          All required steps are configured. Use this page to revisit any setting later, or head to
          the Overview to see your data security posture.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: pct + "%" }} />
          </div>
          <span className="text-[12px] text-slate-500 whitespace-nowrap">{done} of {steps.length} complete</span>
          {skipped > 0 && (
            <>
              <span className="text-[11px] text-slate-400">·</span>
              <span className="text-[11px] text-slate-500 whitespace-nowrap">{skipped} skipped</span>
            </>
          )}
          <button
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
            onClick={onGoToOverview}
          >
            Go to Overview <ArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-blue-600 bg-blue-50 mb-2 dark:bg-blue-900/20">
        <Sparkles size={11} /> First-time setup
      </span>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Welcome to DataSec Command Center
      </h1>
      <p className="text-[13px] text-slate-500 mt-1 max-w-2xl dark:text-slate-400">
        Complete these global prerequisites to start discovering sensitive data across your cloud and
        SaaS environments to improve your data security posture.
      </p>
      <div className="flex items-center gap-3 mt-4">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: pct + "%" }} />
        </div>
        <span className="text-[12px] text-slate-500 whitespace-nowrap">{done} of {steps.length} complete</span>
        <span className="text-[11px] text-slate-400">·</span>
        <span className="text-[11px] text-slate-500 whitespace-nowrap">
          {requiredDone}/{required} required
          {skipped > 0 && ` · ${skipped} skipped`}
        </span>
      </div>
    </div>
  );
}

function TimelineLayout({
  steps, statuses, activeStepId, onStepClick, onResume,
}: {
  steps: SetupStep[];
  statuses: Record<string, StepStatus>;
  activeStepId: string;
  onStepClick: (s: SetupStep) => void;
  onResume: (s: SetupStep) => void;
}) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
      {steps.map((s) => {
        const st = statuses[s.id];
        const isActive = s.id === activeStepId;
        const dotBg =
          st === "done" ? "bg-green-500 text-white" :
          isActive ? "bg-blue-500 text-white" :
          st === "skipped" ? "bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-300" :
          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";

        return (
          <div key={s.id} className="relative mb-3">
            <div className={`absolute -left-8 top-4 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold z-10 ${dotBg}`}>
              {st === "done" ? <Check size={12} /> : s.num}
            </div>
            <div
              className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                isActive
                  ? "border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/20"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
              onClick={() => onStepClick(s)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {s.eyebrow} · {s.time}
                  </div>
                  <div className="text-[14px] font-semibold text-slate-800 mt-0.5 dark:text-slate-200">
                    {s.title}
                    {s.optional && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800">
                        Optional
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">{s.sub}</div>
                </div>
                <StatusPill status={st} optional={s.optional} />
              </div>
              {isActive && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px] mb-3">
                    {s.id === "discovery-profile" && (
                      <>
                        <span className="text-slate-400 font-medium">Smart default</span>
                        <span className="text-slate-600 dark:text-slate-300">DLP-PII, DLP-PCI, DLP-PHI pre-selected</span>
                        <span className="text-slate-400 font-medium">Scope</span>
                        <span className="text-slate-600 dark:text-slate-300">Tenant-wide — applies to every scan</span>
                      </>
                    )}
                    {s.optional && s.whenToSkip && (
                      <>
                        <span className="text-slate-400 font-medium">When to skip</span>
                        <span className="text-slate-600 dark:text-slate-300">{s.whenToSkip}</span>
                      </>
                    )}
                    {s.id === "csp" && (
                      <>
                        <span className="text-slate-400 font-medium">Best with</span>
                        <span className="text-slate-600 dark:text-slate-300">Cloud admin or DevOps support to run the IaC</span>
                      </>
                    )}
                    {s.id === "data-store" && (
                      <>
                        <span className="text-slate-400 font-medium">Best with</span>
                        <span className="text-slate-600 dark:text-slate-300">Cloud admin or DevOps for IaaS / on-prem stores</span>
                      </>
                    )}
                    {(s.id === "scan" || s.id === "overview") && (
                      <>
                        <span className="text-slate-400 font-medium">Heads up</span>
                        <span className="text-slate-600 dark:text-slate-300">First scan can take minutes to hours depending on store size</span>
                      </>
                    )}
                  </div>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
                    onClick={(e) => { e.stopPropagation(); onResume(s); }}
                  >
                    {st === "done" ? "Reconfigure" : "Start step"} <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridLayout({
  steps, statuses, activeStepId, onResume,
}: {
  steps: SetupStep[];
  statuses: Record<string, StepStatus>;
  activeStepId: string;
  onStepClick: (s: SetupStep) => void;
  onResume: (s: SetupStep) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {steps.map((s) => {
        const st = statuses[s.id];
        const isActive = s.id === activeStepId;
        return (
          <div
            key={s.id}
            className={`flex flex-col gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              st === "done"
                ? "border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10"
                : isActive
                  ? "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/10"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            }`}
            onClick={() => onResume(s)}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                  st === "done" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {st === "done" ? <Check size={14} /> : s.num}
              </div>
              <StatusPill status={st} optional={s.optional} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {s.eyebrow}
              </div>
              <div className="text-[14px] font-semibold text-slate-800 mt-0.5 dark:text-slate-200">
                {s.title}
              </div>
              <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">{s.sub}</div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {s.time}
              </span>
              <span className="flex items-center gap-1 text-blue-500 hover:text-blue-600">
                {st === "done" ? "Reconfigure" : isActive ? "Resume" : "Open"} <ArrowRight size={12} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepperLayout({
  steps, statuses, activeStepId, onStepClick, onResume,
}: {
  steps: SetupStep[];
  statuses: Record<string, StepStatus>;
  activeStepId: string;
  onStepClick: (s: SetupStep) => void;
  onResume: (s: SetupStep) => void;
}) {
  const active = steps.find((s) => s.id === activeStepId) || steps[0];
  return (
    <>
      <div className="flex items-center gap-0 mb-4">
        {steps.map((s, i) => {
          const st = statuses[s.id];
          const isActive = s.id === activeStepId;
          return (
            <Fragment key={s.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  isActive ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                onClick={() => onStepClick(s)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                    st === "done"
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {st === "done" ? <Check size={12} /> : s.num}
                </div>
                <span className={`text-[12px] truncate ${isActive ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-500"}`}>
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px ${st === "done" ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </Fragment>
          );
        })}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {active.eyebrow} · {active.time}
            </div>
            <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{active.title}</div>
            <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">{active.sub}</div>
          </div>
          <StatusPill status={statuses[active.id]} optional={active.optional} />
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[12px] text-slate-500 mb-3 dark:text-slate-400">
            Click{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {statuses[active.id] === "done" ? "Reconfigure" : "Start step"}
            </strong>{" "}
            to open the {active.title} screen with the setup banner pinned to the top.
          </p>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
            onClick={() => onResume(active)}
          >
            {statuses[active.id] === "done" ? "Reconfigure" : "Start step"} <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
}

export function SetupGuide({
  steps,
  statuses,
  activeStepId,
  onStepClick,
  onResume,
  layout = "timeline",
  onSkipAll,
  allDone: allDoneProp,
  onGoToOverview,
}: SetupGuideProps) {
  const allDone = allDoneProp ?? steps.every((s) => statuses[s.id] === "done" || statuses[s.id] === "skipped");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <SetupGuideHeader steps={steps} statuses={statuses} allDone={allDone} onGoToOverview={onGoToOverview} />

      {layout === "timeline" && (
        <TimelineLayout steps={steps} statuses={statuses} activeStepId={activeStepId} onStepClick={onStepClick} onResume={onResume} />
      )}
      {layout === "grid" && (
        <GridLayout steps={steps} statuses={statuses} activeStepId={activeStepId} onStepClick={onStepClick} onResume={onResume} />
      )}
      {layout === "stepper" && (
        <StepperLayout steps={steps} statuses={statuses} activeStepId={activeStepId} onStepClick={onStepClick} onResume={onResume} />
      )}

      {allDone && (
        <div className="flex items-start gap-3 mt-6 rounded-lg border border-green-200 bg-green-50/60 px-4 py-3 dark:bg-green-900/10 dark:border-green-800/40">
          <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600" />
          <div className="flex-1 text-[13px] text-slate-600 dark:text-slate-300">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Setup complete</div>
            All required steps are configured. The Overview dashboard is ready — head over to see your data security posture.
          </div>
          <button
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer transition-colors"
            onClick={onGoToOverview}
          >
            Open Overview <ArrowRight size={13} />
          </button>
        </div>
      )}

      {!allDone && (
        <div className="mt-8 flex items-center gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex-1 text-[12px] text-slate-500 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">Tip:</strong> the setup banner
            stays pinned to the top of each step screen so you can jump back here anytime.
          </div>
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:hover:bg-slate-800"
            onClick={onSkipAll}
          >
            Dismiss for now
          </button>
        </div>
      )}
    </div>
  );
}
