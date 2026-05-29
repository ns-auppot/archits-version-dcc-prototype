// Scanner Administration — Step 2 of setup.
// Single table of Scanner Pools (one row per pool) with drawer flows:
//   - Add Single Appliance: 3-step wizard (Platform → Assign/Download → Deployment + License)
//   - Add Scanner Pool: pool configuration with auth token + IaC
//   - Pool Details: overview, scanner list, upgrade schedule, upgrade history
//   - Edit Upgrade Schedule: week + day + time
//
// Step is OPTIONAL — admin can skip if scans running from tenant cloud are acceptable.

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Check,
  Lock,
  Save,
  Filter,
  ChevronDown,
  FileText,
  Info,
  ShieldCheck,
  Activity,
  RefreshCw,
  Edit,
  Trash,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Network,
  CheckCircle,
  AlertTriangle,
  Box,
} from "lucide-react";
import { SETUP_STEPS } from "./wizard-data";
import { OptionalStepInfo } from "./OptionalStepInfo";
import type { StepStatus } from "./types";

/* ── Interfaces ─────────────────────────────────────────────────── */

interface ScannerPool {
  id: string;
  name: string;
  status: "active" | "warning" | "disabled";
  dlpVersion: string;
  scannerVersion: string;
  hostName: string;
  hostId: string;
  removable: boolean;
  type: "single" | "pool";
  versionWarning?: boolean;
}

interface Platform {
  id: string;
  name: string;
  action: "assign" | "download";
  vendor: string;
}

interface UpgradeSchedule {
  week: string;
  day: string;
  time: string;
}

interface ScannerAdminPageProps {
  setupActive: boolean;
  onBackToHub: () => void;
  onSaveStep: (markDone: boolean) => void;
  onSkipStep: () => void;
  status: StepStatus;
}

interface AddSingleApplianceDrawerProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { platform: Platform | null; accountId: string; region: string }) => void;
}

interface AddScannerPoolDrawerProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { name: string; region: string; size: number; authToken: string | null }) => void;
}

interface EditUpgradeScheduleDrawerProps {
  open: boolean;
  onClose: () => void;
  pool: ScannerPool | null;
  onSave: (schedule: UpgradeSchedule) => void;
  current: UpgradeSchedule;
}

interface PoolDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  pool: ScannerPool | null;
  onEditSchedule: () => void;
  schedule: UpgradeSchedule;
}

interface FeatureTileProps {
  icon: React.ElementType;
  title: string;
  sub: string;
  color: string;
}

interface PlatformGlyphProps {
  vendor: string;
  size?: number;
}

interface PoolStatusIconProps {
  status: "active" | "warning" | "disabled";
}

interface WizardStepperProps {
  steps: string[];
  current: number;
}

/* ── Mock data ──────────────────────────────────────────────────── */

const SEED_POOLS_LIST: ScannerPool[] = [
  { id: "pool-a", name: "Standalone Scanner Pool A", status: "active", dlpVersion: "135.0.24", scannerVersion: "12.2.0.26", hostName: "Single_appliance", hostId: "FF06118FFBA9DDCC0", removable: true, type: "single" },
  { id: "pool-b", name: "Standalone Scanner Pool B", status: "warning", dlpVersion: "135.0.24", scannerVersion: "Multiple Versions", hostName: "Dlpod_appliance", hostId: "FF06118FF2A3C8E51", removable: true, type: "pool", versionWarning: true },
  { id: "pool-c", name: "FF06118FFBA9DDCC0_pool", status: "warning", dlpVersion: "135.0.24", scannerVersion: "12.2.0.26", hostName: "Single_appliance", hostId: "FF06118FF1BEF707A", removable: false, type: "single" },
  { id: "pool-d", name: "Standalone Scanner Pool C", status: "active", dlpVersion: "135.0.24", scannerVersion: "12.2.0.26", hostName: "Single_appliance", hostId: "FF06118FF4669B6F4", removable: true, type: "single" },
  { id: "pool-e", name: "Standalone Scanner Pool D", status: "disabled", dlpVersion: "-", scannerVersion: "-", hostName: "-", hostId: "-", removable: true, type: "pool" },
];

const PLATFORMS: Platform[] = [
  { id: "aws", name: "AWS AMI", action: "assign", vendor: "aws" },
  { id: "gcp", name: "GCP Machine Image", action: "assign", vendor: "gcp" },
  { id: "azure", name: "Azure VM Image", action: "download", vendor: "azure" },
  { id: "esxi", name: "ESXi", action: "download", vendor: "esxi" },
  { id: "hyperv", name: "Hyper-V Image", action: "download", vendor: "hyperv" },
  { id: "kvm", name: "KVM Image", action: "download", vendor: "kvm" },
];

const AWS_REGIONS = [
  "us-east-1 (N. Virginia)",
  "us-east-2 (Ohio)",
  "us-west-1 (N. California)",
  "us-west-2 (Oregon)",
  "eu-west-1 (Ireland)",
  "eu-central-1 (Frankfurt)",
  "ap-southeast-1 (Singapore)",
  "ap-northeast-1 (Tokyo)",
];

/* ── Scanner / vendor glyphs (lightweight inline marks) ─────────── */

function PlatformGlyph({ vendor, size = 22 }: PlatformGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (vendor === "aws")
    return (
      <svg {...common} stroke="#ff9900">
        <path d="M3 14c1 2 4 3 9 3s8-1 9-3M5 11c.5-3 3-5 7-5s6 2 6.5 5" />
        <circle cx="12" cy="9" r="1.2" fill="#ff9900" />
      </svg>
    );
  if (vendor === "gcp")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.4" stroke="#4285f4" fill="none" />
        <path d="M12 4.5l3.2 5.6h-6.4z" stroke="#ea4335" />
        <path d="M19.5 12l-5.6 3.2v-6.4z" stroke="#fbbc05" />
        <path d="M12 19.5l-3.2-5.6h6.4z" stroke="#34a853" />
      </svg>
    );
  if (vendor === "azure")
    return (
      <svg {...common} stroke="#0078d4">
        <path d="m9 5-7 14h7l5-14H9z M11 9l3 10h7L13 7z" fill="#0078d4" fillOpacity=".18" />
      </svg>
    );
  if (vendor === "esxi")
    return (
      <svg {...common} stroke="#5e9c2c">
        <rect x="3" y="4" width="8" height="8" rx="1" />
        <rect x="13" y="4" width="8" height="8" rx="1" />
        <rect x="3" y="14" width="8" height="6" rx="1" />
        <rect x="13" y="14" width="8" height="6" rx="1" />
      </svg>
    );
  if (vendor === "hyperv")
    return (
      <svg {...common} stroke="#00a4ef">
        <rect x="3" y="4" width="18" height="13" rx="1.5" />
        <path d="M8 8v5M16 8v5M8 10.5h8M3 20h18" />
      </svg>
    );
  if (vendor === "kvm")
    return (
      <svg {...common} stroke="#c8243a">
        <circle cx="12" cy="12" r="8" />
        <path d="M8 10v4M16 10v4M12 8v8M9 12h6" />
      </svg>
    );
  return <Box size={size} />;
}

/* ── Status icon (matches screenshot semantics) ─────────────────── */

function PoolStatusIcon({ status }: PoolStatusIconProps) {
  if (status === "active") {
    return (
      <span title="Active" className="inline-flex">
        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-green-500 text-white">
          <Check size={11} />
        </span>
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span title="Attention required" className="inline-flex text-orange-500">
        <AlertTriangle size={18} />
      </span>
    );
  }
  if (status === "disabled") {
    return (
      <span title="Disabled" className="inline-flex">
        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-slate-300 text-white text-[12px] font-bold">
          &minus;
        </span>
      </span>
    );
  }
  return null;
}

/* ── Wizard stepper (used in Add Single Appliance drawer) ───────── */

function WizardStepper({ steps, current }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {steps.map((label, i) => {
        const num = i + 1;
        const isDone = num < current;
        const isActive = num === current;
        return (
          <div
            key={label}
            className={`flex items-center gap-2 flex-1 ${
              i < steps.length - 1 ? "after:content-[''] after:flex-1 after:h-px after:bg-slate-200 dark:after:bg-slate-700" : ""
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0 ${
                isDone
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {isDone ? <Check size={12} /> : num}
            </span>
            <span
              className={`text-[12px] whitespace-nowrap ${
                isActive ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Add Single Appliance drawer (3-step wizard) ────────────────── */

function AddSingleApplianceDrawer({ open, onClose, onComplete }: AddSingleApplianceDrawerProps) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [accountId, setAccountId] = useState("");
  const [region, setRegion] = useState("");
  const [licenseKey, setLicenseKey] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setPlatform(null);
      setAccountId("");
      setRegion("");
      setLicenseKey("");
    }
  }, [open]);

  if (!open) return null;

  function selectPlatform(p: Platform) {
    setPlatform(p);
    setStep(2);
  }

  function submitStep2() {
    setLicenseKey("EF7D0D85-70272F7E-58828D6E7-5026814-40D196D4-0X00FF-64656D6F2D6D6367-FB5F322E");
    setStep(3);
  }

  function finish() {
    onComplete({ platform, accountId, region });
    onClose();
  }

  const needsAssign = platform?.action === "assign";

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">Add Single Appliance</h3>
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <WizardStepper steps={["Platform", "Assign / Download", "Deployment"]} current={step} />

          {step === 1 && (
            <>
              {/* Current info block */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 p-4">
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Current Single Appliance Information
                </div>
                <div className="grid grid-cols-3 gap-y-2 gap-x-6 text-[12px]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Versions:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">DLP 135.0.24, Scanner 12.2.0.26</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Size:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">2.4 GB</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Release Date:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">March 15, 2026</strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-1">1. Select Platform</h4>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-4">
                  Download the image based on your hypervisor or provide details to have images assigned to your public cloud instance.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500"
                      onClick={() => selectPlatform(p)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                        <PlatformGlyph vendor={p.vendor} size={22} />
                      </div>
                      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {p.action === "assign" ? (
                          <>
                            <Network size={12} /> Assign
                          </>
                        ) : (
                          <>
                            <ArrowRight size={12} className="rotate-90" /> Download
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h4 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-1">
                2. {needsAssign ? "Assign to Instance" : "Download Image"}
              </h4>
              {needsAssign ? (
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-4">
                  Provide your {platform!.name.replace(" Machine Image", "").replace(" AMI", "")} account details so the appliance image
                  can be assigned to your tenant.
                </p>
              ) : (
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-4">
                  Download the {platform!.name} and import it into your hypervisor before continuing.
                </p>
              )}

              {needsAssign && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      Account ID <span className="text-red-500">*</span>
                    </span>
                    <input
                      className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      placeholder="Enter Account ID"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      Region <span className="text-red-500">*</span>
                    </span>
                    <select
                      className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      <option value="">Select Region</option>
                      {AWS_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {!needsAssign && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 dark:bg-blue-900/10 dark:border-blue-800/40">
                  <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                  <div className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">Image download</div>
                    The {platform!.name} (~2.4 GB) is downloading. Once imported, click Continue to receive your License Key.
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h4 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-1">
                3. Follow Instructions to Deploy the Appliance
              </h4>
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-4">
                After {needsAssign ? "assigning" : "importing"} the image, follow the{" "}
                <a
                  href="#"
                  className="text-blue-500 hover:text-blue-600 underline"
                  onClick={(e) => e.preventDefault()}
                >
                  install instructions
                </a>{" "}
                to deploy the appliance with your License Key.
              </p>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">License Key</span>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-black/5 dark:border-slate-700 rounded-lg px-3 py-2.5 font-mono text-[12px] text-slate-900 dark:text-slate-100">
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{licenseKey}</span>
                  <button
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(licenseKey);
                      } catch {}
                    }}
                    title="Copy License Key"
                  >
                    <Save size={13} />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <AlertTriangle size={11} className="text-orange-500 -mt-px" /> Store this key securely. It uniquely identifies this
                  appliance and pairs it to your tenant.
                </span>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 mt-2 dark:bg-blue-900/10 dark:border-blue-800/40">
                <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-500" />
                <div className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                    Pre-flight checks run automatically on first boot
                  </div>
                  The Guided Install Wizard validates networking, certificates, proxy, DNS, compute and version compatibility before the
                  appliance comes online. Errors surface with remediation links.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Foot */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
          {step === 1 && (
            <button
              className="px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
          {step === 2 && (
            <>
              <button
                className="px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={submitStep2}
                disabled={needsAssign && (!accountId.trim() || !region)}
              >
                Submit
              </button>
            </>
          )}
          {step === 3 && (
            <button
              className="px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
              onClick={finish}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Add Scanner Pool drawer ────────────────────────────────────── */

function AddScannerPoolDrawer({ open, onClose, onComplete }: AddScannerPoolDrawerProps) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("us-east-1 (N. Virginia)");
  const [size, setSize] = useState(3);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setRegion("us-east-1 (N. Virginia)");
      setSize(3);
      setAuthToken(null);
    }
  }, [open]);

  if (!open) return null;

  function handleCreate() {
    if (!name.trim()) return;
    const tok = "plt_tk_" + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
    setAuthToken(tok);
  }

  function handleDone() {
    onComplete({ name: name.trim(), region, size, authToken });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">Add Scanner Pool</h3>
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 dark:bg-blue-900/10 dark:border-blue-800/40">
            <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
            <div className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                Pools are for horizontal scale &amp; high availability
              </div>
              Multiple scanner instances share one auth token. Scans are load-balanced across pool members.
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
              Pool Name <span className="text-red-500">*</span>
            </span>
            <input
              className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:disabled:bg-slate-800/50"
              placeholder="e.g. EU West Production"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={!!authToken}
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Region</span>
              <select
                className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:disabled:bg-slate-800/50"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={!!authToken}
              >
                {AWS_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                Expected Size <span className="text-[11px] text-slate-400 font-normal">(scanners)</span>
              </span>
              <input
                type="number"
                min={1}
                max={50}
                className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:disabled:bg-slate-800/50"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                disabled={!!authToken}
              />
            </label>
          </div>

          {authToken && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Auth Token <span className="text-[11px] text-slate-400 font-normal">&mdash; shown once</span>
                </span>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-black/5 dark:border-slate-700 rounded-lg px-3 py-2.5 font-mono text-[12px] text-slate-900 dark:text-slate-100">
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{authToken}</span>
                  <button
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(authToken);
                      } catch {}
                    }}
                    title="Copy auth token"
                  >
                    <Save size={13} />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} className="text-orange-500 -mt-px" /> Cannot be retrieved later. Pass it to your DevOps team
                  along with the IaC bundle below.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Deploy with Infrastructure-as-Code
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <ExternalLink size={12} /> Terraform module
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <ExternalLink size={12} /> Helm chart
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <FileText size={12} /> Container image guide
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Foot */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            className="px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onClose}
          >
            {authToken ? "Close" : "Cancel"}
          </button>
          {!authToken && (
            <button
              className="px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create pool &amp; generate token
            </button>
          )}
          {authToken && (
            <button
              className="px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
              onClick={handleDone}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Edit Upgrade Schedule drawer ───────────────────────────────── */

function EditUpgradeScheduleDrawer({ open, onClose, pool, onSave, current }: EditUpgradeScheduleDrawerProps) {
  const [week, setWeek] = useState("first");
  const [day, setDay] = useState("Sunday");
  const [time, setTime] = useState("12:00 AM");

  useEffect(() => {
    if (open) {
      setWeek(current?.week || "first");
      setDay(current?.day || "Sunday");
      setTime(current?.time || "12:00 AM");
    }
  }, [open, current]);

  if (!open) return null;

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const TIMES = Array.from({ length: 24 }, (_, h) =>
    ["00", "30"].map((m) => {
      const period = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${m} ${period}`;
    }),
  ).flat();

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Upgrade Schedule
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Edit Upgrade Schedule &mdash; {pool?.hostId}
            </h3>
          </div>
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <p className="text-[12.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Edit the upgrade schedule this appliance will follow. You can refer to the{" "}
            <a
              href="#"
              className="text-blue-500 hover:text-blue-600 underline"
              onClick={(e) => e.preventDefault()}
            >
              Appliance Upgrade
            </a>{" "}
            article to learn more.
          </p>

          {/* Week selection */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              1. Choose what week after an upgrade is released to apply it.
            </span>
            <div className="flex flex-col gap-2 mt-1.5">
              {[
                { id: "first", label: "Within the first week after release" },
                { id: "second", label: "Within the second week after release" },
                { id: "third", label: "Within the third week after release" },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 cursor-pointer transition-colors ${
                      week === opt.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300 bg-transparent dark:border-slate-600"
                    }`}
                    onClick={() => setWeek(opt.id)}
                  >
                    {week === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="text-[12.5px] text-slate-800 dark:text-slate-200">
                    Within the <strong>{opt.id} week</strong> after release
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Day + time selection */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              2. Select the day and time (in the appliance&apos;s local timezone) when the upgrade should be performed.
            </span>
            <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1">
              Appliance timezone: <span className="text-slate-600 dark:text-slate-400 font-medium">Etc/UTC</span>
            </div>
            <div className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mt-2.5 mb-2">Day of the Week</div>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] border cursor-pointer transition-colors ${
                    day === d
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                  onClick={() => setDay(d)}
                >
                  <span
                    className={`inline-flex items-center justify-center w-3 h-3 rounded-full border-2 shrink-0 ${
                      day === d
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300 bg-transparent dark:border-slate-600"
                    }`}
                  >
                    {day === d && <span className="w-1 h-1 rounded-full bg-white" />}
                  </span>
                  {d}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5 mt-3.5">
              <span className="text-[12px] text-slate-600 dark:text-slate-400 font-medium">Start the upgrade at:</span>
              <select
                className="h-9 w-[140px] px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Example schedule callout */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:bg-slate-800/50 dark:border-slate-700">
            <Info size={16} className="shrink-0 mt-0.5 text-slate-500" />
            <div className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Example schedule</div>
              If the upgrade is released on Wednesday, Apr 15 2026 at 4:00 AM, it will be applied within the{" "}
              <strong>{week}</strong> week on{" "}
              <strong>{day === "Sunday" ? "Saturday, Apr 18 2026" : day + " close to that week"}</strong> at{" "}
              <strong>{time}</strong>.
            </div>
          </div>
        </div>

        {/* Foot */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            className="px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={() => {
              onSave({ week, day, time });
              onClose();
            }}
          >
            Save Schedule
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Pool Details drawer ────────────────────────────────────────── */

function PoolDetailsDrawer({ open, onClose, pool, onEditSchedule, schedule }: PoolDetailsDrawerProps) {
  if (!open || !pool) return null;

  const scanners =
    pool.type === "pool"
      ? [
          { id: "s1", name: pool.name + "-01", status: "active" as const, version: "10.7.8.12", lastSeen: "3 mins ago", createdBy: "contact@brightwave.io", createdAt: "03-31-2026 15:58:29" },
          { id: "s2", name: pool.name + "-02", status: "active" as const, version: "10.7.8.12", lastSeen: "4 mins ago", createdBy: "contact@brightwave.io", createdAt: "03-31-2026 15:58:29" },
          { id: "s3", name: pool.name + "-03", status: "warning" as const, version: "10.7.8.11", lastSeen: "12 mins ago", createdBy: "contact@brightwave.io", createdAt: "03-31-2026 15:58:29" },
        ]
      : [
          { id: "s1", name: pool.name, status: pool.status, version: "10.7.8.12", lastSeen: "3 mins ago", createdBy: "contact@brightwave.io", createdAt: "03-31-2026 15:58:29" },
        ];

  const history = [
    { status: "completed", timestamp: "04-10-2026 15:58:29", trigger: "Auto update", desc: "Full Upgrade, v135.0.24" },
    { status: "cancelled", timestamp: "04-08-2026 15:58:29", trigger: "Auto update", desc: "Component Upgrade, v134.0.21" },
    { status: "completed", timestamp: "04-04-2026 15:58:29", trigger: "Auto update", desc: "Full Upgrade, v134.0.21" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {pool.type === "pool" ? "Scanner Pool Details" : "Single Appliance Details"}
          </h3>
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <h4 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-2">Overview Details</h4>

          {/* Pool information card */}
          <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Pool Information</div>
              <button className="flex items-center gap-1 text-[12px] text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer">
                <Edit size={11} /> Edit Pool
              </button>
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[12px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Pool Name:</span>{" "}
                  <strong className="text-slate-900 dark:text-slate-100">{pool.name}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>{" "}
                  <PoolStatusIcon status={pool.status} />{" "}
                  <strong className="text-slate-900 dark:text-slate-100 ml-1">
                    {pool.status === "active" ? "Active" : pool.status === "warning" ? "Attention" : "Disabled"}
                  </strong>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 mb-2">DLP Appliance Information</div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[12px]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Host Name:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {pool.hostName} ({pool.hostId})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Uptime:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">14 days, 8 hours</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">DLP Version:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">{pool.dlpVersion}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Memory Usage:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">23%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">IP Address:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">10.0.24.156</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Avg CPU Load:</span>{" "}
                    <strong className="text-slate-900 dark:text-slate-100">18%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scanners table */}
          <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                {scanners.length} Scanner{scanners.length === 1 ? "" : "s"}
              </div>
              <div className="flex gap-1.5">
                <button
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500"
                  title="Run health check"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500"
                  title="View diagnostics"
                >
                  <Activity size={13} />
                </button>
              </div>
            </div>
            <div className="text-[12px]">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Version</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Seen</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created By</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created Date</span>
              </div>
              {scanners.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-b-0 items-center"
                >
                  <span className="text-slate-900 dark:text-slate-100 font-medium truncate" title={s.name}>
                    {s.name}
                  </span>
                  <PoolStatusIcon status={s.status} />
                  <span className="tabular-nums text-slate-700 dark:text-slate-300">{s.version}</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.lastSeen}</span>
                  <span className="text-slate-500 dark:text-slate-400 truncate">{s.createdBy}</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.createdAt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade & schedule */}
          <h4 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mt-1.5 mb-2">Upgrade and Schedule</h4>

          <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                Automatic Upgrade Schedule for {pool.type === "pool" ? "Pool" : "Single Appliance"}
              </div>
              <button
                className="flex items-center gap-1 text-[12px] text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer"
                onClick={onEditSchedule}
              >
                <Edit size={11} /> Edit Schedule
              </button>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2 text-[12px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Current Schedule:</span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {" "}
                  (Default) {schedule.day}, {schedule.time} (Etc/UTC), within the {schedule.week} week after release
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Next Automatic Upgrade:</span>
                <strong className="text-slate-900 dark:text-slate-100">Apr 30 2026, 0:00:00 PM</strong>
                <button className="text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer font-inherit text-[12px] ml-2.5">
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>

          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mt-1.5 mb-2">
            {pool.type === "pool" ? "Pool" : "Single Appliance"} Upgrade History
          </div>
          <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 overflow-hidden">
            <div className="text-[12px]">
              <div className="grid gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50" style={{ gridTemplateColumns: "130px 180px 130px 1fr" }}>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trigger</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</span>
              </div>
              {history.map((h, i) => (
                <div
                  key={i}
                  className="grid gap-2 px-4 py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-b-0 items-center"
                  style={{ gridTemplateColumns: "130px 180px 130px 1fr" }}
                >
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-800 dark:text-slate-200">
                    {h.status === "completed" ? (
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-green-500 text-white">
                        <Check size={9} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-400 text-white">
                        <X size={9} />
                      </span>
                    )}
                    {h.status === "completed" ? "Completed" : "Cancelled"}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">{h.timestamp}</span>
                  <span className="text-slate-600 dark:text-slate-400">{h.trigger}</span>
                  <span className="text-slate-600 dark:text-slate-400">{h.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Foot */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            className="px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Feature tile (bottom of page) ──────────────────────────────── */

function FeatureTile({ icon: Icon, title, sub, color }: FeatureTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3.5 flex gap-3 items-start">
      <div
        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0"
        style={{ background: color + "1a", color }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{sub}</div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */

export function ScannerAdminPage({ setupActive, onBackToHub, onSaveStep, onSkipStep, status }: ScannerAdminPageProps) {
  const [pools, setPools] = useState<ScannerPool[]>(SEED_POOLS_LIST);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [addApplOpen, setAddApplOpen] = useState(false);
  const [addPoolOpen, setAddPoolOpen] = useState(false);
  const [detailsPool, setDetailsPool] = useState<ScannerPool | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState<UpgradeSchedule>({ week: "first", day: "Saturday", time: "12:00 AM" });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const isDone = status === "done";

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2400);
  }

  const filtered = pools.filter((p) => {
    if (filterStatus !== "All" && p.status !== filterStatus.toLowerCase()) return false;
    const q = query.trim().toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.hostName.toLowerCase().includes(q) && !p.hostId.toLowerCase().includes(q))
      return false;
    return true;
  });

  function handleApplianceComplete(_data: { platform: Platform | null; accountId: string; region: string }) {
    const idx = pools.length + 1;
    const id = `pool-new-${Date.now()}`;
    const hostId = "FF06118FF" + Math.random().toString(16).slice(2, 11).toUpperCase();
    const newPool: ScannerPool = {
      id,
      name: `Standalone Scanner Pool ${String.fromCharCode(65 + idx - 1)}`,
      status: "active",
      dlpVersion: "135.0.24",
      scannerVersion: "12.2.0.26",
      hostName: "Single_appliance",
      hostId,
      removable: true,
      type: "single",
    };
    setPools((prev) => [newPool, ...prev]);
    showToast(`Single appliance added · ${newPool.name}`);
  }

  function handlePoolComplete(data: { name: string; region: string; size: number; authToken: string | null }) {
    const id = `pool-new-${Date.now()}`;
    const hostId = "FF06118FF" + Math.random().toString(16).slice(2, 11).toUpperCase();
    const newPool: ScannerPool = {
      id,
      name: data.name,
      status: "active",
      dlpVersion: "135.0.24",
      scannerVersion: "12.2.0.26",
      hostName: "Dlpod_appliance",
      hostId,
      removable: true,
      type: "pool",
    };
    setPools((prev) => [newPool, ...prev]);
    showToast(`Scanner pool created · ${data.name}`);
  }

  function deletePool(id: string) {
    setPools((prev) => prev.filter((p) => p.id !== id));
    showToast("Scanner pool removed", false);
  }

  const activeCount = pools.filter((p) => p.status === "active").length;
  const canMarkDone = activeCount > 0;

  return (
    <div className="p-6 flex flex-col gap-4 pb-0">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Scanner Administration</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            In-network scanners classify data without it leaving your perimeter.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            onClick={() => setAddPoolOpen(true)}
          >
            <Plus size={13} /> Add Scanner Pool
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={() => setAddApplOpen(true)}
          >
            <Plus size={13} /> Add Single Appliance
          </button>
        </div>
      </div>

      {setupActive && (
        <OptionalStepInfo
          step={SETUP_STEPS.find((s) => s.id === "scanners")!}
          onSkip={onSkipStep}
        />
      )}

      {/* Filter + search row */}
      <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-4 py-3.5 flex gap-2.5 items-center">
        <div className="relative">
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border cursor-pointer min-w-[110px] ${
              filterOpen
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500"
                : "border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter size={12} /> Filter
            <ChevronDown size={11} className="ml-0.5" />
          </button>
          {filterOpen && (
            <div className="absolute top-[calc(100%+6px)] left-0 z-30 bg-white dark:bg-slate-800 border border-black/10 dark:border-slate-700 rounded-lg shadow-lg p-2 min-w-[160px]">
              {["All", "Active", "Warning", "Disabled"].map((s) => (
                <button
                  key={s}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-transparent border-none cursor-pointer text-left"
                  onClick={() => {
                    setFilterStatus(s);
                    setFilterOpen(false);
                  }}
                >
                  {filterStatus === s ? (
                    <Check size={12} className="text-blue-500" />
                  ) : (
                    <span className="inline-block w-3" />
                  )}
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 bg-slate-50 dark:bg-slate-800 rounded-md px-3 h-9 border border-slate-200 dark:border-slate-700">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            placeholder="Search contains..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          title="Export as CSV"
        >
          <FileText size={14} />
        </button>
      </div>

      {/* Main table */}
      <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center">
          <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} Scanner Pool{filtered.length === 1 ? "" : "s"}
          </h3>
        </div>

        {/* Column headers */}
        <div
          className="grid gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
          style={{ gridTemplateColumns: "1.4fr 80px 110px 130px 1.6fr 120px" }}
        >
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Scanner Pool Name</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DLP Version</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Scanner Version</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Host Name</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 px-5 text-center text-slate-400 text-[13px]">No scanner pools match these filters.</div>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className="grid gap-2 px-5 py-3 border-b border-slate-50 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 items-center"
            style={{ gridTemplateColumns: "1.4fr 80px 110px 130px 1.6fr 120px" }}
          >
            <button
              className="text-blue-500 hover:text-blue-600 truncate bg-transparent border-none text-left cursor-pointer p-0 font-inherit text-[12.5px] font-medium"
              onClick={() => setDetailsPool(p)}
              title={p.name}
            >
              {p.name}
            </button>
            <PoolStatusIcon status={p.status} />
            <span
              className={`tabular-nums text-[12px] ${
                p.dlpVersion === "-" ? "text-slate-400" : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {p.dlpVersion}
            </span>
            <span
              className={`tabular-nums text-[12px] ${
                p.versionWarning
                  ? "text-orange-500 font-medium"
                  : p.scannerVersion === "-"
                    ? "text-slate-400"
                    : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {p.scannerVersion}
            </span>
            <span
              className={`text-[12px] truncate ${
                p.hostName === "-" ? "text-slate-400" : "text-slate-800 dark:text-slate-200"
              }`}
              title={`${p.hostName} (${p.hostId})`}
            >
              {p.hostName === "-" ? (
                "-"
              ) : (
                <>
                  {p.hostName} <span className="text-slate-400">({p.hostId})</span>
                </>
              )}
            </span>
            <span className="flex gap-1 justify-end">
              <button
                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500"
                title="Edit pool"
                onClick={() => setDetailsPool(p)}
              >
                <Edit size={13} />
              </button>
              <button
                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500"
                title="Run health check"
              >
                <RefreshCw size={13} />
              </button>
              <button
                className={`inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none ${
                  p.removable
                    ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500"
                    : "cursor-not-allowed text-slate-300 dark:text-slate-600"
                }`}
                title={p.removable ? "Delete" : "Cannot delete this pool"}
                onClick={() => p.removable && deletePool(p.id)}
                disabled={!p.removable}
              >
                <Trash size={13} />
              </button>
            </span>
          </div>
        ))}

        {/* Pagination footer */}
        <div className="flex items-center gap-2.5 px-5 py-3 text-[12px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <button
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none text-slate-400 cursor-not-allowed"
            disabled
          >
            <ChevronsLeft size={12} />
          </button>
          <button
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none text-slate-400 cursor-not-allowed"
            disabled
          >
            <ArrowLeft size={12} />
          </button>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[11px] font-semibold">
            1
          </span>
          <button className="bg-transparent border-none cursor-pointer text-slate-600 dark:text-slate-400 text-[12px] font-inherit px-1.5 py-1">
            2
          </button>
          <button className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ArrowRight size={12} />
          </button>
          <button className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ChevronsRight size={12} />
          </button>
          <span className="ml-auto flex items-center gap-2">
            <select className="h-7 px-2 rounded-md border border-slate-300 bg-white text-[12px] text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            Results per page
            <span className="ml-6">1 of 2 pages</span>
          </span>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-3">
        <FeatureTile
          icon={ShieldCheck}
          title="Pre-flight checks"
          sub="Networking, certs, DNS, proxy, compute and version compatibility validated before pairing."
          color="#3b82f6"
        />
        <FeatureTile
          icon={Activity}
          title="Health & diagnostics"
          sub="Real-time appliance status with actionable error codes and remediation links."
          color="#16a34a"
        />
        <FeatureTile
          icon={RefreshCw}
          title="Auto upgrades with rollback"
          sub="Scheduled upgrades you can defer or force, with automatic rollback on failure."
          color="#9333ea"
        />
      </div>

      {/* Sticky footer (setup-mode only) */}
      {setupActive && (
        <div className="sticky bottom-0 z-20 -mx-6 px-6 py-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3 backdrop-blur-sm">
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            {canMarkDone
              ? `${activeCount} active scanner pool${activeCount === 1 ? "" : "s"} · ready to continue`
              : "Add at least one appliance or pool, or skip if scanning from tenant cloud is acceptable"}
          </span>
          <button
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-transparent border-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onBackToHub}
          >
            <ArrowLeft size={13} /> Back to Setup Summary
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            onClick={onSkipStep}
          >
            Skip this step
          </button>
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDone
                ? "text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                : "text-white bg-blue-500 hover:bg-blue-600 border-none"
            }`}
            onClick={() => onSaveStep(!isDone)}
            disabled={!isDone && !canMarkDone}
          >
            {isDone ? (
              "Mark not complete"
            ) : (
              <>
                Mark step complete <Check size={13} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Drawers */}
      <AddSingleApplianceDrawer open={addApplOpen} onClose={() => setAddApplOpen(false)} onComplete={handleApplianceComplete} />
      <AddScannerPoolDrawer open={addPoolOpen} onClose={() => setAddPoolOpen(false)} onComplete={handlePoolComplete} />
      <PoolDetailsDrawer
        open={!!detailsPool}
        pool={detailsPool}
        schedule={schedule}
        onClose={() => setDetailsPool(null)}
        onEditSchedule={() => setScheduleOpen(true)}
      />
      <EditUpgradeScheduleDrawer
        open={scheduleOpen}
        pool={detailsPool}
        current={schedule}
        onClose={() => setScheduleOpen(false)}
        onSave={(s) => {
          setSchedule(s);
          showToast("Upgrade schedule saved");
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] shadow-lg dark:bg-slate-100 dark:text-slate-900">
          {toast.ok ? (
            <CheckCircle size={14} className="text-green-400" />
          ) : (
            <Info size={14} className="text-blue-400" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
