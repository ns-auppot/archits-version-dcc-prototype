import { CheckCircle } from "lucide-react";
import type { StepStatus } from "./types";

interface PlaceholderPageProps {
  stepId: string;
  title: string;
  summary: string;
  bullets: string[];
  status: StepStatus;
  setupActive: boolean;
  onBackToHub: () => void;
  onMarkDone: () => void;
}

export function PlaceholderPage({ title, summary, bullets, status, onBackToHub, onMarkDone }: PlaceholderPageProps) {
  const isDone = status === "done";
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">{summary}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-[14px] font-semibold text-slate-800 mb-3 dark:text-slate-200">What you'll see</h3>
        <ul className="flex flex-col gap-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-400">
              <CheckCircle size={14} className="shrink-0 mt-0.5 text-green-500" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:hover:bg-slate-800"
          onClick={onBackToHub}
        >
          Back to Setup Guide
        </button>
        <button
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium border-none cursor-pointer transition-colors ${
            isDone
              ? "text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              : "text-white bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={onMarkDone}
        >
          {isDone ? "Mark incomplete" : "Mark as done"}
        </button>
      </div>
    </div>
  );
}
