export interface SetupStep {
  id: string;
  num: number;
  title: string;
  sub: string;
  eyebrow: string;
  time: string;
  required: boolean;
  optional?: boolean;
  whenToSkip?: string;
  route: string;
}

export interface DlpProfile {
  id: string;
  name: string;
  kind: "predefined" | "custom";
  cats: string[];
  desc: string;
  defaultOn?: boolean;
}

export interface CategoryLabel {
  label: string;
  cls: string;
  full: string;
}

export type StepStatus = "todo" | "active" | "done" | "skipped";

export interface ConnectedStore {
  id: string;
  service: string;
  account: string;
  endpoint: string;
  provider: string;
  region: string;
  scanState: "queued" | "running" | "completed" | "error" | "archived";
  scanType: string;
  progress: number;
  filesScanned: number;
  filesTotal: number;
  sizeScanned: string;
  sizeTotal: string;
  lastScan: string;
  nextScan: string;
  justConnected?: boolean;
  findings: { critical: number; high: number; medium: number; low: number };
  history: Array<{ ts: string; type: string; msg: string }>;
  error?: { code: string; title: string; detail: string; remediations: string[] };
}

export interface TweakDefaults {
  hubLayout: "timeline" | "grid" | "stepper";
  density: "comfortable" | "compact";
  showFloatPill: boolean;
  demoCompletion: "fresh" | "mid" | "done";
}

export interface CoachStep {
  target: string;
  title: string;
  body: string;
}
