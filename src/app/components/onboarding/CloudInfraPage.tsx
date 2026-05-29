// Infrastructure Connections — Step 3 of setup.
// Connect a Cloud Service Provider (CSP) so data stores can be auto-discovered & monitored.

import { useState, useEffect } from "react";
import {
  Check, ChevronRight, ChevronDown, X, ShieldCheck, AlertTriangle,
  CheckCircle, Info, Save, ExternalLink, FileText, Box, Building,
  Edit3, Plus, Search, Filter, ArrowLeft, ArrowRight, Cloud,
  Activity, Database, RefreshCw, Clock, MoreVertical,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { SETUP_STEPS } from "./wizard-data";
import type { StepStatus } from "./types";
import { InfoTip } from "./InfoTip";
import { OptionalStepInfo } from "./OptionalStepInfo";

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

interface CspProvider {
  id: string;
  name: string;
  vendor: string;
  enabled: boolean;
  full: string;
}

const CSP_PROVIDERS: CspProvider[] = [
  { id: "aws", name: "AWS", vendor: "aws", enabled: true, full: "Amazon Web Services" },
  { id: "gcp", name: "GCP", vendor: "gcp", enabled: false, full: "Google Cloud Platform" },
  { id: "azure", name: "Azure", vendor: "azure", enabled: false, full: "Microsoft Azure" },
  { id: "oci", name: "OCI", vendor: "oci", enabled: false, full: "Oracle Cloud Infrastructure" },
];

interface PermissionGroup {
  service: string;
  actions: string[];
}

interface AwsCapability {
  id: string;
  title: string;
  desc: string;
  defaultOn: boolean;
  elevated: boolean;
  permissions: PermissionGroup[];
  note: string;
}

const AWS_CAPABILITIES: AwsCapability[] = [
  {
    id: "auto-discover",
    title: "Auto-discover data stores & org members",
    desc: "Enumerate all supported data stores and organizational members across the connected environment.",
    defaultOn: true,
    elevated: false,
    permissions: [
      { service: "S3", actions: ["s3:ListAllMyBuckets", "s3:GetBucketLocation", "s3:GetBucketTagging"] },
      { service: "RDS", actions: ["rds:DescribeDBInstances", "rds:DescribeDBClusters"] },
      { service: "DynamoDB", actions: ["dynamodb:ListTables", "dynamodb:DescribeTable"] },
      { service: "Redshift", actions: ["redshift:DescribeClusters"] },
      { service: "IAM", actions: ["iam:ListUsers", "iam:ListRoles", "iam:GetAccountSummary"] },
      { service: "Organizations", actions: ["organizations:ListAccounts", "organizations:DescribeOrganization"] },
    ],
    note: "Granted via the baseline IAM policy on stack launch.",
  },
  {
    id: "tag-ingestion",
    title: "Tag ingestion",
    desc: "Ingest resource tags to enrich data classification, ownership attribution, and compliance context.",
    defaultOn: true,
    elevated: false,
    permissions: [
      { service: "Resource Groups Tagging", actions: ["tag:GetResources", "tag:GetTagKeys", "tag:GetTagValues"] },
      { service: "S3", actions: ["s3:GetBucketTagging", "s3:GetObjectTagging"] },
    ],
    note: "Read-only across all taggable resources in the account.",
  },
  {
    id: "auto-connect",
    title: "Auto-connect discovered data stores",
    desc: "Automatically initiate connections and scans on newly discovered assets upon detection.",
    defaultOn: true,
    elevated: false,
    permissions: [
      { service: "S3", actions: ["s3:GetObject", "s3:ListBucket", "s3:GetBucketPolicyStatus"] },
      { service: "RDS", actions: ["rds:DescribeDBSnapshots", "rds:RestoreDBInstanceFromDBSnapshot"] },
      { service: "KMS", actions: ["kms:Decrypt", "kms:DescribeKey"] },
    ],
    note: "Used at scan-time to read store contents for classification.",
  },
  {
    id: "snapshot-based",
    title: "Snapshot-based connections",
    desc: "Create and access encrypted snapshots of data stores for deep content inspection without network access.",
    defaultOn: false,
    elevated: true,
    permissions: [
      { service: "EC2 / EBS", actions: ["ec2:CreateSnapshot", "ec2:CopySnapshot", "ec2:DeleteSnapshot", "ec2:DescribeSnapshots", "ec2:ModifySnapshotAttribute"] },
      { service: "RDS", actions: ["rds:CreateDBSnapshot", "rds:CopyDBSnapshot", "rds:DeleteDBSnapshot"] },
      { service: "KMS", actions: ["kms:CreateGrant", "kms:Decrypt", "kms:GenerateDataKey"] },
    ],
    note: "Snapshots are short-lived and torn down after each scan. May incur AWS storage costs.",
  },
  {
    id: "infra-deploy",
    title: "Infrastructure deployment for volume mounting/scanning",
    desc: "Deploy temporary compute resources inside your environment to mount and scan attached volumes for sensitive data.",
    defaultOn: false,
    elevated: true,
    permissions: [
      { service: "EC2", actions: ["ec2:RunInstances", "ec2:TerminateInstances", "ec2:DescribeInstances", "ec2:CreateTags"] },
      { service: "VPC", actions: ["ec2:CreateSecurityGroup", "ec2:AuthorizeSecurityGroupIngress", "ec2:DescribeSubnets"] },
      { service: "IAM", actions: ["iam:PassRole"] },
    ],
    note: "Temporary EC2 instances run only during active scans. May incur AWS compute costs.",
  },
];

const SEED_ACCOUNTS: Account[] = [];

interface VerificationRow {
  capability: string;
  status: "ok" | "error";
  permissions?: number;
  error?: string;
  failedActions?: string[];
}

const SAMPLE_VERIFICATION: VerificationRow[] = [
  { capability: "Auto-discover data stores & org members", status: "ok", permissions: 8 },
  { capability: "Tag ingestion", status: "ok", permissions: 4 },
  { capability: "Auto-connect discovered data stores", status: "ok", permissions: 6 },
];

const SAMPLE_VERIFICATION_ERROR: VerificationRow = {
  capability: "Auto-connect discovered data stores",
  status: "error",
  error: "Unexpected error: The security token included in the request is invalid. (Service: Sts, Status Code: 403, Request ID: 126fe8df-f1f2-40d9-b978-88a5e319f6e1) (SDK Attempt Count: 1)",
  failedActions: ["sts:AssumeRole", "sts:GetCallerIdentity"],
};

interface Account {
  id: string;
  name: string;
  accountId: string;
  storesDiscovered: number;
  unmanaged: number;
  storesConnected: number;
  ingestTags: boolean;
  autoDiscovery: boolean;
  autoConnect: boolean;
  verificationFailed: boolean;
  provider?: string;
}

const SAMPLE_AFTER_SAVE_ACCOUNT: Account = {
  id: "acc-new",
  name: "production-main",
  accountId: "123456789012",
  storesDiscovered: 14,
  unmanaged: 0,
  storesConnected: 6,
  ingestTags: true,
  autoDiscovery: true,
  autoConnect: true,
  verificationFailed: false,
};

const SAMPLE_FAILED_ACCOUNT: Account = {
  id: "acc-failed",
  name: "aws-staging",
  accountId: "987654321098",
  storesDiscovered: 8,
  unmanaged: 1,
  storesConnected: 2,
  ingestTags: true,
  autoDiscovery: false,
  autoConnect: true,
  verificationFailed: true,
  provider: "aws",
};

/* ------------------------------------------------------------------ */
/*  Cloud-provider glyph                                              */
/* ------------------------------------------------------------------ */

interface ProviderGlyphProps {
  vendor: string;
  size?: number;
}

function ProviderGlyph({ vendor, size = 26 }: ProviderGlyphProps) {
  const s = size;
  if (vendor === "aws") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M8.3 14.7c0 .3.1.5.2.6.1.1.3.2.4.3l.2-.3c-.1-.1-.2-.2-.3-.3 0-.1-.1-.3-.1-.5v-.7c0-.3-.1-.5-.2-.6-.2-.2-.4-.3-.8-.3.3-.1.6-.2.7-.4.2-.2.3-.4.3-.7 0-.4-.2-.7-.5-.9-.3-.2-.7-.3-1.3-.3H5.8v5h.8v-2h1c.4 0 .6.1.7.3v1.8zm-.5-2.1H6.6v-1.7h1.3c.3 0 .6.1.8.2.2.1.3.3.3.6 0 .3-.1.5-.3.6-.2.2-.5.3-.9.3zm5.2.6c-.2-.1-.5-.3-.9-.4l-.6-.2c-.2-.1-.3-.1-.4-.2-.1-.1-.1-.2-.1-.3 0-.2.1-.3.2-.4.2-.1.4-.2.6-.2.3 0 .6.1.9.3l.3-.5c-.4-.3-.8-.4-1.2-.4-.4 0-.8.1-1 .3-.3.2-.4.5-.4.8 0 .4.2.7.7.9l.9.3c.2.1.3.1.4.2.1.1.1.2.1.3 0 .2-.1.3-.2.4-.2.1-.4.2-.7.2-.2 0-.5-.1-.7-.1-.2-.1-.4-.2-.5-.3l-.3.5c.2.2.4.3.7.4.3.1.5.2.8.2.5 0 .8-.1 1.1-.3.3-.2.4-.5.4-.9 0-.3-.1-.5-.2-.6zM18 15.3l-1-4.4h-.8l-1 4.4-.9-4.4h-.8l1.3 5h.8l1-4.3 1 4.3h.8l1.3-5h-.8l-.9 4.4z" fill="#FF9900"/>
      <path d="M14.5 17.5c-2.2.8-4 1.2-5.8 1.2-2.7 0-5.2-1-7.1-2.6-.1-.1-.2 0-.1.2 2 2.3 4.5 3.6 7.3 3.6 2 0 4.2-.7 5.8-2 .3-.2.1-.5-.1-.4z" fill="#FF9900"/>
      <path d="M15.3 16.8c-.2-.2-.5-.1-.4.1.5.6 1 .9 1.4 1 .2 0 .3-.1.2-.3-.3-.5-1-1.1-1.2-1.3v.5z" fill="#FF9900"/>
      <path d="M6.5 8.5c0-.4.1-.7.3-1 .2-.3.5-.4.8-.5.4-.1.7-.1 1.1 0 .3.1.6.3.8.5l.5-.5c-.3-.3-.6-.5-1-.7-.4-.1-.8-.2-1.3-.1-.5.1-.9.3-1.2.6-.3.3-.5.8-.5 1.4v.1c0 .6.2 1.1.5 1.4.3.3.7.6 1.2.7.5.1.9.1 1.3 0 .4-.1.7-.4 1-.7l-.5-.5c-.2.3-.5.4-.8.5-.3.1-.7.1-1 0-.4-.1-.6-.3-.8-.6-.2-.3-.3-.6-.4-1v-.6z" fill="#252F3E"/>
    </svg>
  );
  if (vendor === "gcp") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M15.65 8.35h1.15l3.3-3.3.16-1.4A11.06 11.06 0 0 0 2 8.72h.71l3.76-.62.27.02A6.28 6.28 0 0 1 15.65 8.35z" fill="#EA4335"/>
      <path d="M20.49 8.72A11.06 11.06 0 0 0 2 8.72 11.06 11.06 0 0 0 6.74 8.12l3.56 3.56A3.39 3.39 0 0 1 12 11c1.7 0 3.1 1.25 3.37 2.88l5.12-5.16z" fill="#4285F4"/>
      <path d="M6.74 15.28A6.28 6.28 0 0 1 5.91 12c0-1.21.35-2.34.94-3.3L2.89 4.73A11 11 0 0 0 1.49 12c0 2.4.77 4.62 2.08 6.43l3.17-3.15z" fill="#FBBC05"/>
      <path d="M12 18.37a6.28 6.28 0 0 1-5.26-3.09l-3.17 3.15A11 11 0 0 0 12 23a10.85 10.85 0 0 0 7.49-2.98l-3.05-2.92A6.21 6.21 0 0 1 12 18.37z" fill="#34A853"/>
      <path d="M20.26 8.72l-4.82 4.82A3.4 3.4 0 0 1 12 17a3.38 3.38 0 0 1-2.93-1.72l-3.33 3.15A10.76 10.76 0 0 0 12 23a10.85 10.85 0 0 0 8.51-4.14A11.07 11.07 0 0 0 23 12c0-1.14-.2-2.25-.51-3.28h-2.23z" fill="#4285F4"/>
    </svg>
  );
  if (vendor === "azure") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M9.1 4h5.4L8.6 20H3.2L9.1 4z" fill="#0078D4"/>
      <path d="M16.3 7.3l-4.1 12.2H8.6L12.7 7.3h3.6z" fill="#0078D4" fillOpacity=".7"/>
      <path d="M18.1 4L14.5 20h-2.3L15.8 4h2.3z" fill="#0078D4" fillOpacity=".5"/>
      <path d="M20.8 4L17.2 20h-2.3L18.5 4h2.3z" fill="#0078D4" fillOpacity=".3"/>
    </svg>
  );
  if (vendor === "oci") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill="#F80000"/>
    </svg>
  );
  return null;
}

/* ------------------------------------------------------------------ */
/*  Wizard stepper (4-step chevron arrow design)                      */
/* ------------------------------------------------------------------ */

interface StepperStep {
  id: string;
  label: string;
  sub?: string | null;
}

interface InfraStepperProps {
  steps: StepperStep[];
  current: number;
  onStepClick?: (n: number) => void;
}

function InfraStepper({ steps, current, onStepClick }: InfraStepperProps) {
  return (
    <div className="flex items-stretch rounded-lg border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-700">
      {steps.map((s, i) => {
        const num = i + 1;
        const isDone = num < current;
        const isActive = num === current;
        return (
          <button
            key={s.id}
            className={`flex items-center gap-2.5 flex-1 px-4 py-3 border-none cursor-pointer transition-colors ${
              isDone
                ? "bg-green-50/60 dark:bg-green-900/10"
                : isActive
                  ? "bg-blue-50/60 dark:bg-blue-900/10"
                  : "bg-transparent opacity-50"
            } ${isDone ? "hover:bg-green-50 dark:hover:bg-green-900/20" : ""}`}
            onClick={() => isDone && onStepClick?.(num)}
            disabled={!isDone && !isActive}
            type="button"
          >
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 ${
                isDone
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {isDone ? <Check size={13} /> : num}
            </span>
            <span className="flex flex-col items-start min-w-0">
              <span className={`text-[12px] font-semibold truncate ${
                isDone
                  ? "text-green-700 dark:text-green-400"
                  : isActive
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
              }`}>
                {s.label}
              </span>
              {s.sub && (
                <span className="text-[10.5px] text-slate-500 truncate dark:text-slate-400">
                  {s.sub}
                </span>
              )}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="ml-auto text-slate-300 shrink-0 dark:text-slate-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verification drawer                                               */
/* ------------------------------------------------------------------ */

interface VerificationDrawerProps {
  open: boolean;
  account: Account | null;
  onClose: () => void;
}

function VerificationDrawer({ open, account, onClose }: VerificationDrawerProps) {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { if (open) setCopied(null); }, [open]);
  if (!open || !account) return null;

  const rows: VerificationRow[] = account.verificationFailed
    ? [...SAMPLE_VERIFICATION.slice(0, 2), SAMPLE_VERIFICATION_ERROR]
    : SAMPLE_VERIFICATION;

  const allOk = rows.every((r) => r.status === "ok");
  const errorRows = rows.filter((r) => r.status === "error");

  function copyText(key: string, text: string) {
    try { navigator.clipboard?.writeText(text); } catch { /* noop */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  function shareableReport() {
    const header = `Permission Verification — ${account!.name} (${account!.accountId})\n${new Date().toISOString()}\n\n`;
    const body = rows.map((r) => {
      if (r.status === "ok") return `[OK] ${r.capability} — ${r.permissions} permissions verified`;
      return `[ERROR] ${r.capability}\n  Error: ${r.error}\n  Failed actions: ${r.failedActions?.join(", ")}`;
    }).join("\n\n");
    return header + body;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-[480px] max-w-full flex flex-col bg-white shadow-xl dark:bg-slate-900">
        {/* Head */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                allOk
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {allOk ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Permission Verification
              </div>
              <h3 className="text-[15px] font-semibold text-slate-900 mt-0.5 leading-tight truncate dark:text-slate-100">
                {account.name}{" "}
                <span className="text-slate-400 font-medium">({account.accountId})</span>
              </h3>
            </div>
          </div>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Overall banner */}
          {allOk ? (
            <div className="flex items-start gap-3 rounded-lg border border-green-200/50 bg-green-50/30 px-4 py-3 dark:bg-green-900/10 dark:border-green-800/30">
              <CheckCircle size={14} className="shrink-0 mt-0.5 text-green-600" />
              <div>
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                  All permissions verified successfully
                </div>
                <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">
                  {rows.reduce((s, r) => s + (r.permissions || 0), 0)} IAM actions across {rows.length} capabilities check out for the DCC_ServiceRole.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-red-200/50 bg-red-50/30 px-4 py-3 dark:bg-red-900/10 dark:border-red-800/30">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                  {errorRows.length} capabilit{errorRows.length === 1 ? "y" : "ies"} failed verification
                </div>
                <div className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">
                  Auto-discovery and auto-connect won't run for affected capabilities until this is resolved. The first error is shown below — copy or share for support.
                </div>
              </div>
              <button
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => copyText("report", shareableReport())}
              >
                {copied === "report" ? <><Check size={12} /> Copied</> : <><Save size={12} /> Copy report</>}
              </button>
            </div>
          )}

          {/* Per-capability rows */}
          {rows.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${
                r.status === "error"
                  ? "border-red-200/40 bg-red-50/20 dark:border-red-800/30 dark:bg-red-900/5"
                  : "border-slate-200/60 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {r.status === "ok" ? (
                  <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-green-500 text-white shrink-0 mt-0.5">
                    <Check size={12} />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-red-600 text-white shrink-0 mt-0.5">
                    <X size={12} />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {r.capability}
                  </div>
                  <div className={`text-[11.5px] font-medium mt-0.5 ${
                    r.status === "error" ? "text-red-600" : "text-green-600"
                  }`}>
                    {r.status === "error"
                      ? `Failed · ${r.failedActions!.length} IAM action${r.failedActions!.length === 1 ? "" : "s"} blocked`
                      : `Verified · ${r.permissions} IAM actions`}
                  </div>

                  {r.status === "error" && (
                    <>
                      {/* Error block */}
                      <div className="mt-2.5 rounded-lg border border-red-200/30 bg-white overflow-hidden dark:bg-slate-900 dark:border-red-800/20">
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50/40 border-b border-red-200/30 dark:bg-red-900/10 dark:border-red-800/20">
                          <span className="text-[10.5px] font-bold text-red-600 tracking-wider uppercase">
                            Error message
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                              title="Copy error message"
                              aria-label="Copy error message"
                              onClick={() => copyText("err-" + i, r.error!)}
                            >
                              {copied === "err-" + i ? <Check size={12} /> : <Save size={12} />}
                            </button>
                            <button
                              className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                              title="Open support ticket"
                              aria-label="Open support ticket"
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="px-3 py-2.5 font-mono text-[11.5px] text-slate-900 leading-relaxed select-text break-words dark:text-slate-200">
                          {r.error}
                        </div>
                      </div>

                      {/* Blocked IAM actions */}
                      <div className="mt-2.5">
                        <div className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                          Blocked IAM actions
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {r.failedActions!.map((a) => (
                            <code
                              key={a}
                              className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-600 font-mono dark:bg-red-900/20"
                            >
                              {a}
                            </code>
                          ))}
                        </div>
                      </div>

                      {/* Remediation links */}
                      <div className="flex gap-2 flex-wrap mt-3">
                        <a
                          href="#"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 no-underline dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
                          onClick={(e) => e.preventDefault()}
                        >
                          <ExternalLink size={12} /> Open IAM in AWS console
                        </a>
                        <a
                          href="#"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 no-underline dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
                          onClick={(e) => e.preventDefault()}
                        >
                          <FileText size={12} /> Required policy JSON
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 mt-1">
            <Clock size={11} />
            Last verified just now &middot; Role{" "}
            <code className="font-mono text-slate-500">
              arn:aws:iam::{account.accountId}:role/DCC_ServiceRole
            </code>
          </div>
        </div>

        {/* Foot */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={() => copyText("report", shareableReport())}
          >
            {copied === "report" ? <><Check size={13} /> Copied report</> : <><Save size={13} /> Copy full report</>}
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={onClose}
          >
            <RefreshCw size={13} /> Re-verify
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Permissions drawer                                                */
/* ------------------------------------------------------------------ */

interface PermissionsDrawerProps {
  open: boolean;
  capability: AwsCapability | null;
  onClose: () => void;
}

function PermissionsDrawer({ open, capability, onClose }: PermissionsDrawerProps) {
  if (!open || !capability) return null;
  const allActions = capability.permissions.reduce((sum, g) => sum + g.actions.length, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-[420px] max-w-full flex flex-col bg-white shadow-xl dark:bg-slate-900">
        {/* Head */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-blue-500/10 text-blue-500">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Required permissions
              </div>
              <h3 className="text-[15px] font-semibold text-slate-900 mt-0.5 leading-tight dark:text-slate-100">
                {capability.title}
              </h3>
            </div>
          </div>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer text-slate-400 hover:bg-slate-100 ml-auto dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <p className="text-[13px] text-slate-500 leading-relaxed m-0 dark:text-slate-400">
            {capability.desc}
          </p>

          <div className="flex items-center gap-2 -mt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              IAM permissions by service
            </span>
            <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              {allActions} permission{allActions === 1 ? "" : "s"} &middot; {capability.permissions.length} services
            </span>
          </div>

          {capability.permissions.map((g) => (
            <div key={g.service} className="rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{g.service}</span>
                <span className="text-[11px] text-slate-400">
                  {g.actions.length} permission{g.actions.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="list-none m-0 p-0">
                {g.actions.map((a) => (
                  <li key={a} className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-50 last:border-b-0 dark:border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <code className="text-[12px] font-mono text-slate-700 dark:text-slate-300">{a}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {capability.note && (
            <div className="flex items-start gap-3 rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-3 dark:bg-slate-800/50 dark:border-slate-700">
              <Info size={14} className="shrink-0 mt-0.5 text-slate-500" />
              <div className="text-[12px] text-slate-500 dark:text-slate-400">{capability.note}</div>
            </div>
          )}
        </div>

        {/* Foot */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={() => {
              const json = JSON.stringify(
                capability.permissions.map((g) => ({ [g.service]: g.actions })),
                null, 2,
              );
              try { navigator.clipboard?.writeText(json); } catch { /* noop */ }
            }}
          >
            <Save size={13} /> Copy JSON
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: Cloud Provider                                            */
/* ------------------------------------------------------------------ */

interface StepProviderProps {
  provider: string;
  setProvider: (id: string) => void;
  type: string;
  setType: (t: string) => void;
}

function StepProvider({ provider, setProvider, type, setType }: StepProviderProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">Cloud Provider</h2>
        <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
          Pick the provider where your data stores live and how you want to onboard it.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {CSP_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              provider === p.id
                ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10"
                : p.enabled
                  ? "border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600"
                  : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700"
            }`}
            onClick={() => p.enabled && setProvider(p.id)}
            disabled={!p.enabled}
            title={!p.enabled ? `${p.full} — coming soon` : p.full}
          >
            <ProviderGlyph vendor={p.vendor} />
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
            {!p.enabled && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-500 dark:bg-slate-700">
                SOON
              </span>
            )}
            <span
              className={`w-4 h-4 rounded-full border-2 mt-1 ${
                provider === p.id
                  ? "border-blue-500 bg-blue-500"
                  : "border-slate-300 dark:border-slate-600"
              }`}
            >
              {provider === p.id && (
                <span className="block w-full h-full rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </span>
          </button>
        ))}
      </div>

      <h3 className="text-[13px] font-bold text-slate-900 mt-2 dark:text-slate-100">Type</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            type === "account"
              ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10"
              : "border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600"
          }`}
          onClick={() => setType("account")}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Box size={20} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Account</div>
            <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Onboard a specific AWS Account
            </div>
          </div>
          <span
            className={`w-4 h-4 rounded-full border-2 shrink-0 ${
              type === "account"
                ? "border-blue-500 bg-blue-500"
                : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {type === "account" && (
              <span className="block w-full h-full rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </span>
        </button>
        <button
          type="button"
          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            type === "organization"
              ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10"
              : "border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600"
          }`}
          onClick={() => setType("organization")}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Building size={20} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Organization</div>
            <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Onboard your AWS Organization including all its Accounts
            </div>
          </div>
          <span
            className={`w-4 h-4 rounded-full border-2 shrink-0 ${
              type === "organization"
                ? "border-blue-500 bg-blue-500"
                : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {type === "organization" && (
              <span className="block w-full h-full rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Capabilities                                              */
/* ------------------------------------------------------------------ */

interface StepCapabilitiesProps {
  selected: string[];
  toggle: (id: string) => void;
  openPerms: (cap: AwsCapability) => void;
  autoConnectPool: string;
  setAutoConnectPool: (v: string) => void;
}

function StepCapabilities({ selected, toggle, openPerms, autoConnectPool, setAutoConnectPool }: StepCapabilitiesProps) {
  const elevated = AWS_CAPABILITIES.filter((c) => c.elevated && selected.includes(c.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-2.5 mb-1.5">
        <h2 className="text-[18px] font-bold text-slate-900 m-0 dark:text-slate-100">Capabilities</h2>
        <span className="text-[12.5px] text-slate-500 dark:text-slate-400">
          — select capabilities for your AWS environment
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {AWS_CAPABILITIES.map((c) => {
          const isOn = selected.includes(c.id);
          return (
            <div
              key={c.id}
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                isOn
                  ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
              onClick={() => toggle(c.id)}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 mt-0.5 transition-colors ${
                    isOn
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {isOn && <Check size={12} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-slate-900 m-0 dark:text-slate-100">
                      {c.title}
                    </h4>
                    {c.elevated && (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          ELEVATED PERMS
                        </span>
                        <InfoTip label="Elevated permissions">
                          <strong>Elevated permissions</strong> mean the capability requires write or compute access in your AWS account — beyond read-only describe/list. These may incur AWS storage or compute costs.
                        </InfoTip>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-[11px] text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer p-0 mt-1 font-medium"
                    onClick={(e) => { e.stopPropagation(); openPerms(c); }}
                  >
                    View permissions
                  </button>
                  <p className="text-[12px] text-slate-500 mt-1 m-0 leading-relaxed dark:text-slate-400">
                    {c.desc}
                  </p>

                  {/* Auto-connect: optional scanner pool selector */}
                  {c.id === "auto-connect" && isOn && (
                    <div
                      className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center">
                        Scanner pool{" "}
                        <span className="text-slate-400 font-normal ml-1">— optional</span>
                        <InfoTip label="Scanner pool">
                          <strong>Scanner pool</strong> directs scans for auto-connected stores through an in-network scanner group instead of the Netskope tenant cloud. Useful when data must stay inside your perimeter.
                        </InfoTip>
                      </span>
                      <select
                        className="w-full mt-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-[13px] text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        value={autoConnectPool}
                        onChange={(e) => setAutoConnectPool(e.target.value)}
                      >
                        <option value="">Tenant cloud (scans run from Netskope cloud)</option>
                        <option value="pool-eu-west">EU West Production (3 scanners)</option>
                        <option value="pool-a">Standalone Scanner Pool A (single appliance)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {elevated.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200/50 bg-orange-50/30 px-4 py-3 dark:bg-orange-900/10 dark:border-orange-800/30">
          <Info size={14} className="shrink-0 mt-0.5 text-orange-600" />
          <div className="text-[12.5px] text-slate-800 dark:text-slate-200">
            <strong>Heads up:</strong> capabilities marked{" "}
            <span className="text-orange-600 font-semibold">elevated perms</span> require
            additional IAM actions and may incur AWS costs. Click <strong>View permissions</strong> on
            any row to inspect what gets granted.
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Service Account                                           */
/* ------------------------------------------------------------------ */

interface ServiceMethod {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const SERVICE_METHODS: ServiceMethod[] = [
  { id: "cloudformation", name: "CloudFormation", icon: "◇", desc: "Use the AWS CloudFormation template to provision all AWS resources necessary for connecting to resources within your AWS VPC." },
  { id: "terraform", name: "Terraform", icon: "▲", desc: "Use the AWS Terraform module to provision all AWS resources necessary for connecting to resources within your AWS VPC." },
  { id: "manual", name: "Manually Configured", icon: "⚙", desc: "Use this if you have already provisioned all AWS resources necessary for connecting to resources per the template within your AWS VPC." },
];

interface StepServiceAccountProps {
  method: string;
  setMethod: (m: string) => void;
  accountName: string;
  setAccountName: (v: string) => void;
  accountId: string;
  setAccountId: (v: string) => void;
  externalId: string;
  roleName: string;
  tried: boolean;
}

function StepServiceAccount({
  method, setMethod, accountName, setAccountName,
  accountId, setAccountId, externalId, roleName, tried,
}: StepServiceAccountProps) {
  const nameErr = tried && !accountName.trim();
  const idErr = tried && accountId.trim().length !== 12;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">Choose Service</h2>
      <div className="grid grid-cols-3 gap-3">
        {SERVICE_METHODS.map((m) => {
          const glyphCls =
            m.id === "cloudformation"
              ? "bg-orange-50 text-amber-600 dark:bg-orange-900/20"
              : m.id === "terraform"
                ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800";
          return (
            <button
              key={m.id}
              type="button"
              className={`flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer text-left transition-colors ${
                method === m.id
                  ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
              onClick={() => setMethod(m.id)}
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-[16px] ${glyphCls}`}>
                  {m.icon}
                </span>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                <span
                  className={`w-4 h-4 rounded-full border-2 ml-auto shrink-0 ${
                    method === m.id
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {method === m.id && (
                    <span className="block w-full h-full rounded-full border-2 border-white dark:border-slate-900" />
                  )}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed m-0 dark:text-slate-400">
                {m.desc}
              </p>
            </button>
          );
        })}
      </div>

      <h3 className="text-[13px] font-bold text-slate-900 mt-2 dark:text-slate-100">Fill Service Information</h3>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Account Name <span className="text-red-500">*</span>
          </span>
          <input
            className={`w-full px-3 py-2 rounded-md border text-[13px] text-slate-800 bg-white placeholder-slate-400 outline-none transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 ${
              nameErr ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-400"
            }`}
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. production-main"
          />
          {nameErr && <span className="text-[11px] text-red-500">Required.</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Account ID <span className="text-red-500">*</span>
          </span>
          <input
            className={`w-full px-3 py-2 rounded-md border text-[13px] text-slate-800 bg-white placeholder-slate-400 outline-none transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 ${
              idErr ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-400"
            }`}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="123456789012"
            maxLength={12}
          />
          {idErr && (
            <span className="text-[11px] text-red-500">
              {accountId.trim().length === 0
                ? "Required."
                : `Must be 12 digits (currently ${accountId.trim().length}).`}
            </span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Service Account Role <span className="text-red-500">*</span>
          </span>
          <div className="flex items-center justify-between px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-[13px] text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
            <span>{roleName}</span>
            <Edit3 size={12} className="text-blue-500" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center">
            External ID <span className="text-red-500 ml-0.5">*</span>
            <InfoTip label="External ID">
              <strong>External ID</strong> is a unique value AWS requires when one account assumes a role in another. Provide it exactly as shown when creating the trust policy on the service-account role.
            </InfoTip>
          </span>
          <div className="flex items-center justify-between px-3 py-2 rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
            <span className="font-mono text-[12px] text-slate-700 dark:text-slate-300">{externalId}</span>
            <button
              type="button"
              className="flex items-center justify-center w-[22px] h-[22px] rounded-md bg-transparent border-none cursor-pointer text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => { try { navigator.clipboard?.writeText(externalId); } catch { /* noop */ } }}
              title="Copy External ID"
            >
              <Save size={11} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-blue-500 mt-1">
        Ensure the service account has the right roles and access to connect.{" "}
        <a
          href="#"
          className="text-blue-500 hover:text-blue-600 underline"
          onClick={(e) => e.preventDefault()}
        >
          Click here to see the instructions.
        </a>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4: Review                                                    */
/* ------------------------------------------------------------------ */

interface StepReviewProps {
  provider: string;
  type: string;
  method: string;
  accountName: string;
  accountId: string;
  externalId: string;
  roleName: string;
  selectedCaps: string[];
}

function StepReview({ provider, type, method, accountName, accountId, externalId, roleName, selectedCaps }: StepReviewProps) {
  const provName = CSP_PROVIDERS.find((p) => p.id === provider)?.full || provider.toUpperCase();
  const methodName = SERVICE_METHODS.find((m) => m.id === method)?.name || method;
  const roleArn = `arn:aws:iam::${accountId || "------------"}:role/${roleName}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 dark:bg-blue-900/10 dark:border-blue-800/40">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
        <div className="text-[13px] text-slate-600 dark:text-slate-300">
          <div className="font-semibold text-slate-800 dark:text-slate-200">You are almost there!</div>
          Please make sure you have created the Service Account User with the right permissions
          before continuing to <strong>Save</strong>.
        </div>
      </div>

      <h2 className="text-[16px] font-bold text-slate-900 mt-1 dark:text-slate-100">Summary Info</h2>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cloud Provider</div>
          <div className="text-[13px] font-medium text-slate-800 mt-1 dark:text-slate-200">{provName}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</div>
          <div className="text-[13px] font-medium text-slate-800 mt-1 capitalize dark:text-slate-200">{type}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Service Account</div>
          <div className="text-[13px] font-medium text-slate-800 mt-1 dark:text-slate-200">{methodName}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account Name</div>
          <div className="text-[13px] font-medium text-slate-800 mt-1 dark:text-slate-200">
            {accountName || <span className="text-slate-400">&mdash;</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account ID</div>
          <div className="text-[13px] font-medium text-slate-800 mt-1 tabular-nums dark:text-slate-200">
            {accountId || <span className="text-slate-400">&mdash;</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">External ID</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="font-mono text-[12px] text-slate-800 dark:text-slate-200">{externalId}</span>
            <button
              type="button"
              className="flex items-center justify-center w-[22px] h-[22px] rounded-md bg-transparent border-none cursor-pointer text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => { try { navigator.clipboard?.writeText(externalId); } catch { /* noop */ } }}
              title="Copy External ID"
            >
              <Save size={11} />
            </button>
          </div>
        </div>
        <div className="col-span-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role ARN</div>
          <div className="font-mono text-[12px] text-slate-800 mt-1 dark:text-slate-200">{roleArn}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Capabilities enabled ({selectedCaps.length})
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {selectedCaps.length === 0 && (
            <span className="text-[12px] text-slate-400">None selected.</span>
          )}
          {selectedCaps.map((id) => {
            const cap = AWS_CAPABILITIES.find((c) => c.id === id);
            if (!cap) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Check size={11} className="text-green-600" /> {cap.title}
                {cap.elevated && (
                  <span className="px-1 rounded text-[9px] font-bold uppercase bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    elevated
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Infrastructure Wizard                                         */
/* ------------------------------------------------------------------ */

interface WizardCompleteData {
  provider: string;
  type: string;
  method: string;
  accountName: string;
  accountId: string;
  externalId: string;
  selectedCaps: string[];
}

interface AddInfrastructureWizardProps {
  onCancel: () => void;
  onComplete: (data: WizardCompleteData) => void;
  setupActive: boolean;
  onSkipStep?: () => void;
}

function AddInfrastructureWizard({ onCancel, onComplete, setupActive, onSkipStep }: AddInfrastructureWizardProps) {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState("aws");
  const [type, setType] = useState("account");
  const [selectedCaps, setSelectedCaps] = useState<string[]>(
    AWS_CAPABILITIES.filter((c) => c.defaultOn).map((c) => c.id),
  );
  const [autoConnectPool, setAutoConnectPool] = useState("");
  const [method, setMethod] = useState("cloudformation");
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [permsDrawer, setPermsDrawer] = useState<AwsCapability | null>(null);
  const [tried, setTried] = useState(false);

  const roleName = "DCC_ServiceRole";
  const externalId = "5402ed7e-7ac9-3f23-a57b-7f56ebc807b6";

  const STEPS: StepperStep[] = [
    { id: "provider", label: "Cloud Provider", sub: step > 1 ? `${provider.toUpperCase()} · ${type === "account" ? "Account" : "Organization"}` : null },
    { id: "capabilities", label: "Capabilities", sub: step > 2 ? `${selectedCaps.length} selected` : null },
    { id: "service", label: "Service Account", sub: step > 3 ? SERVICE_METHODS.find((m) => m.id === method)!.name : null },
    { id: "review", label: "Review" },
  ];

  function toggleCap(id: string) {
    setSelectedCaps((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function back() { setStep((s) => Math.max(1, s - 1)); }

  function validation(): string | null {
    if (step === 1 && !provider) return "Pick a cloud provider to continue.";
    if (step === 1 && !type) return "Pick a type — Account or Organization.";
    if (step === 2 && selectedCaps.length === 0) return "Select at least one capability to continue.";
    if (step === 3) {
      const errs: string[] = [];
      if (!method) errs.push("a deployment method");
      if (!accountName.trim()) errs.push("Account Name");
      if (accountId.trim().length !== 12) errs.push("a 12-digit Account ID");
      if (errs.length) return "Provide " + errs.join(", ") + " to continue.";
    }
    return null;
  }

  function canProceed() { return validation() === null; }

  function next() {
    if (!canProceed()) { setTried(true); return; }
    setTried(false);
    setStep((s) => Math.min(4, s + 1));
  }

  const cspStep = SETUP_STEPS.find((s) => s.id === "csp");

  return (
    <div className="flex flex-col gap-4">
      {/* Wizard page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Infrastructure</h1>
          <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
            Connect a cloud account, data store, or SaaS app. Each section saves as you go.
          </p>
        </div>
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={onCancel}
        >
          <X size={14} /> Cancel
        </button>
      </div>

      {setupActive && cspStep && (
        <OptionalStepInfo step={cspStep} onSkip={onSkipStep} />
      )}

      <InfraStepper steps={STEPS} current={step} onStepClick={(n) => setStep(n)} />

      {/* Step content */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-700">
        {step === 1 && (
          <StepProvider provider={provider} setProvider={setProvider} type={type} setType={setType} />
        )}
        {step === 2 && (
          <StepCapabilities
            selected={selectedCaps}
            toggle={toggleCap}
            openPerms={(c) => setPermsDrawer(c)}
            autoConnectPool={autoConnectPool}
            setAutoConnectPool={setAutoConnectPool}
          />
        )}
        {step === 3 && (
          <StepServiceAccount
            method={method} setMethod={setMethod}
            accountName={accountName} setAccountName={setAccountName}
            accountId={accountId} setAccountId={setAccountId}
            externalId={externalId} roleName={roleName}
            tried={tried}
          />
        )}
        {step === 4 && (
          <StepReview
            provider={provider} type={type} method={method}
            accountName={accountName} accountId={accountId}
            externalId={externalId} roleName={roleName}
            selectedCaps={selectedCaps}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="text-[12px] text-slate-400">Step {step} of 4</span>
        {tried && validation() && (
          <span className="text-[11.5px] text-red-600 ml-3 inline-flex items-center gap-1.5">
            <AlertTriangle size={11} /> {validation()}
          </span>
        )}
        <div className="flex-1" />
        {step === 3 && method !== "manual" && (
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800">
            <FileText size={13} /> Download template
          </button>
        )}
        {step === 3 && method !== "manual" && (
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800">
            <ExternalLink size={13} /> Launch in AWS
          </button>
        )}
        {step > 1 && (
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={back}
          >
            <ArrowLeft size={13} /> Back
          </button>
        )}
        {step < 4 && (
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
            onClick={next}
          >
            Continue <ArrowRight size={13} />
          </button>
        )}
        {step === 4 && (
          <>
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onCancel}
            >
              I'll do it later
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
              onClick={() => onComplete({ provider, type, method, accountName, accountId, externalId, selectedCaps })}
            >
              <Check size={13} /> Save connection
            </button>
          </>
        )}
      </div>

      <PermissionsDrawer
        open={!!permsDrawer}
        capability={permsDrawer}
        onClose={() => setPermsDrawer(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Validating overlay                                                */
/* ------------------------------------------------------------------ */

interface ValidatingOverlayProps {
  onComplete: () => void;
}

function ValidatingOverlay({ onComplete }: ValidatingOverlayProps) {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Verifying baseline IAM policy…",
    "Checking S3 list permissions…",
    "Checking RDS describe permissions…",
    "Checking IAM read permissions…",
    "Checking organization access…",
    "Establishing connection to AWS…",
  ];

  useEffect(() => {
    if (phase < phases.length) {
      const t = setTimeout(() => setPhase((p) => p + 1), 550);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onComplete, 500);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
      <div className="flex flex-col items-center text-center p-8 max-w-sm">
        <div className="animate-spin text-blue-500">
          <RefreshCw size={32} />
        </div>
        <h3 className="text-[16px] font-semibold text-slate-900 mt-3.5 dark:text-slate-100">
          Validating service account&hellip;
        </h3>
        <p className="text-[13px] text-slate-500 mt-1 mb-4 dark:text-slate-400">
          We're confirming each requested capability and its required permissions.
        </p>
        <ul className="flex flex-col gap-2 text-left list-none m-0 p-0">
          {phases.map((p, i) => (
            <li
              key={p}
              className={`flex items-center gap-2 text-[12.5px] ${
                i < phase
                  ? "text-green-600"
                  : i === phase
                    ? "text-blue-600 font-medium"
                    : "text-slate-400"
              }`}
            >
              {i < phase ? (
                <Check size={12} />
              ) : i === phase ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <span className="inline-block w-3" />
              )}
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Discovered data-store strip                                       */
/* ------------------------------------------------------------------ */

interface DiscoveredStripProps {
  count: number;
}

function DiscoveredStrip({ count }: DiscoveredStripProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/40 px-4 py-3 dark:bg-blue-900/10 dark:border-blue-800/40">
      <div className="flex items-center gap-2.5">
        <RefreshCw size={14} className="animate-spin text-blue-500" />
        <span className="text-[13px] text-slate-800 font-medium dark:text-slate-200">
          Auto-discovering data stores&hellip;{" "}
          <span className="tabular-nums text-slate-900 font-bold dark:text-slate-100">{count}</span> found so far
        </span>
      </div>
      <button className="flex items-center gap-1 text-[12px] text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer">
        View in Data Stores <ArrowRight size={11} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Coverage row                                                      */
/* ------------------------------------------------------------------ */

interface CoverageRowProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

function CoverageRow({ label, value, max, color }: CoverageRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 text-[11.5px] text-slate-500 font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`,
            background: color,
          }}
        />
      </div>
      <span className="tabular-nums text-[12px] text-slate-900 font-semibold min-w-[36px] text-right dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                     */
/* ------------------------------------------------------------------ */

interface ToggleSwitchProps {
  on: boolean;
}

function ToggleSwitch({ on }: ToggleSwitchProps) {
  return (
    <span
      className={`relative inline-block w-8 h-[18px] rounded-full transition-colors ${
        on ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all"
        style={{ left: on ? 16 : 2 }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Connections list view                                              */
/* ------------------------------------------------------------------ */

interface ConnectionsListProps {
  accounts: Account[];
  onAddNew: () => void;
  recentDiscoveryCount: number;
  setupActive: boolean;
  onSkipStep?: () => void;
  onVerify?: (account: Account) => void;
}

function ConnectionsList({ accounts, onAddNew, recentDiscoveryCount, setupActive, onSkipStep, onVerify }: ConnectionsListProps) {
  const [tab, setTab] = useState("aws");
  const [query, setQuery] = useState("");

  const tabs = [
    { id: "aws", label: "AWS", count: accounts.filter((a) => a.provider === "aws").length },
    { id: "gcp", label: "GCP", count: 0 },
    { id: "azure", label: "Azure", count: 0 },
    { id: "oci", label: "OCI", count: 0 },
  ];

  const filtered = accounts.filter((a) => {
    if (a.provider !== tab) return false;
    const q = query.trim().toLowerCase();
    if (q && !a.name.toLowerCase().includes(q) && !a.accountId.includes(q)) return false;
    return true;
  });

  const totalDiscovered = accounts.reduce((s, a) => s + a.storesDiscovered, 0);
  const totalConnected = accounts.reduce((s, a) => s + a.storesConnected, 0);
  const totalUnmanaged = accounts.reduce((s, a) => s + (a.unmanaged || 0), 0);
  const autoDisabledCount = accounts.filter((a) => !a.autoDiscovery).length;
  const noStoresCount = accounts.filter((a) => a.storesConnected === 0).length;

  const cspStep = SETUP_STEPS.find((s) => s.id === "csp");

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Infrastructure Connections</h1>
          <p className="text-[13px] text-slate-500 mt-1 dark:text-slate-400">
            Connect AWS, GCP, Azure, and OCI accounts so data stores can be auto-discovered,
            classified and monitored.
          </p>
        </div>
        <button
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
          onClick={onAddNew}
        >
          <Plus size={13} /> Add Infrastructure
        </button>
      </div>

      {setupActive && cspStep && (
        <OptionalStepInfo step={cspStep} onSkip={onSkipStep} />
      )}

      {recentDiscoveryCount > 0 && <DiscoveredStrip count={recentDiscoveryCount} />}

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Provider bar chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Cloud size={11} /> Infrastructure by provider
          </div>
          <div className="flex items-end gap-3.5 mt-3 h-20">
            {tabs.map((t) => (
              <div key={t.id} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: t.count > 0 ? `${Math.min(80, t.count * 20)}%` : "4px",
                      background: t.count > 0 ? "#3b82f6" : "rgba(0,0,0,0.06)",
                    }}
                  />
                </div>
                <span className="text-[10.5px] text-slate-500 font-medium">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3.5 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Activity size={11} /> Insights
          </div>
          <div className="flex gap-4 flex-1 items-center">
            <div className="flex-1 text-center">
              <div className={`text-[22px] font-bold tabular-nums ${autoDisabledCount > 0 ? "text-orange-500" : "text-slate-400"}`}>
                {autoDisabledCount}
              </div>
              <div className="text-[10.5px] text-slate-500 mt-1 leading-tight">
                Accounts with<br />auto-discovery disabled
              </div>
            </div>
            <span className="w-px self-stretch bg-slate-100 dark:bg-slate-800" />
            <div className="flex-1 text-center">
              <div className={`text-[22px] font-bold tabular-nums ${noStoresCount > 0 ? "text-orange-500" : "text-slate-400"}`}>
                {noStoresCount}
              </div>
              <div className="text-[10.5px] text-slate-500 mt-1 leading-tight">
                Accounts with<br />no data stores connected
              </div>
            </div>
          </div>
        </div>

        {/* Coverage */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Database size={11} /> Coverage
          </div>
          <div className="flex flex-col gap-2 mt-2.5">
            <CoverageRow label="Discovered" value={totalDiscovered} max={totalDiscovered || 1} color="#a855f7" />
            <CoverageRow label="Connected" value={totalConnected} max={totalDiscovered || 1} color="#3b82f6" />
            <CoverageRow label="Unmanaged" value={totalUnmanaged} max={totalDiscovered || 1} color="#f97316" />
          </div>
        </div>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 bg-transparent cursor-pointer transition-colors ${
              tab === t.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
            onClick={() => setTab(t.id)}
            type="button"
          >
            <ProviderGlyph vendor={t.id} size={16} />
            <span>{t.label} ({t.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-700">
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer min-w-[100px] dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800">
            <Filter size={12} /> Filter <ChevronDown size={11} className="ml-0.5" />
          </button>
          <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
            <Search size={14} className="text-slate-400" />
            <input
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder-slate-400 dark:text-slate-200"
              placeholder="Search contains…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center px-5 py-2.5">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} Account{filtered.length === 1 ? "" : "s"}
          </h3>
        </div>

        {/* Column headers */}
        <div
          className="grid items-center px-5 py-2.5 border-b border-slate-100 dark:border-slate-800"
          style={{ gridTemplateColumns: "1.3fr 1fr 110px 110px 110px 80px 90px 40px" }}
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Account</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Account ID</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 text-right">Stores Discovered</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 text-right">Unmanaged</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 text-right">Stores Connected</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Ingest Tags</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Auto-Discovery</span>
          <span />
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3.5 bg-blue-50 flex items-center justify-center dark:bg-blue-900/20">
              <Cloud size={22} className="text-blue-500" />
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              No {tab.toUpperCase()} accounts connected
            </h3>
            <p className="text-[12.5px] text-slate-500 max-w-[380px] mx-auto mt-1.5 mb-4 dark:text-slate-400">
              Onboard your first {tab.toUpperCase()} account so we can start discovering and classifying data stores.
            </p>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer"
              onClick={onAddNew}
            >
              <Plus size={13} /> Add {tab.toUpperCase()} account
            </button>
          </div>
        )}

        {/* Rows */}
        {filtered.map((a) => (
          <div
            key={a.id}
            className="grid items-center px-5 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors dark:border-slate-800 dark:hover:bg-slate-800/50"
            style={{ gridTemplateColumns: "1.3fr 1fr 110px 110px 110px 80px 90px 40px" }}
          >
            <div className="min-w-0">
              <div className="text-[13px] text-slate-900 font-medium truncate dark:text-slate-100">{a.name}</div>
              <button
                className="text-[11px] text-blue-500 hover:text-blue-600 bg-transparent border-none p-0 cursor-pointer inline-flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); onVerify?.(a); }}
              >
                {a.verificationFailed ? (
                  <>
                    <AlertTriangle size={10} className="text-red-600" />
                    <span className="text-red-600">Inspect Permissions</span>
                  </>
                ) : (
                  <>Inspect Permissions</>
                )}
              </button>
            </div>
            <span className="tabular-nums text-[12.5px] text-slate-800 dark:text-slate-200">{a.accountId}</span>
            <button className="text-[12.5px] text-blue-500 tabular-nums bg-transparent border-none p-0 cursor-pointer text-right">
              {a.storesDiscovered}
            </button>
            <span className={`tabular-nums text-[12.5px] text-right ${a.unmanaged > 0 ? "text-orange-500" : "text-slate-400"}`}>
              {a.unmanaged}
            </span>
            <button className="text-[12.5px] text-blue-500 tabular-nums bg-transparent border-none p-0 cursor-pointer text-right">
              {a.storesConnected}
            </button>
            <ToggleSwitch on={a.ingestTags} />
            <ToggleSwitch on={a.autoDiscovery} />
            <MoreVertical size={13} className="text-slate-400 cursor-pointer justify-self-end" />
          </div>
        ))}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2.5 px-5 py-3 border-t border-slate-100 text-[12px] text-slate-500 dark:border-slate-800">
            <button className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none text-slate-400 cursor-not-allowed" disabled>
              <ChevronsLeft size={12} />
            </button>
            <button className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none text-slate-400 cursor-not-allowed" disabled>
              <ArrowLeft size={12} />
            </button>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[11px] font-semibold">
              1
            </span>
            <button className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none text-slate-400 hover:bg-slate-100 cursor-pointer dark:hover:bg-slate-800">
              <ArrowRight size={12} />
            </button>
            <button className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none text-slate-400 hover:bg-slate-100 cursor-pointer dark:hover:bg-slate-800">
              <ChevronsRight size={12} />
            </button>
            <span className="ml-auto">1 of 1 pages</span>
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page export                                                  */
/* ------------------------------------------------------------------ */

interface CloudInfraPageProps {
  setupActive: boolean;
  onBackToHub: () => void;
  onSaveStep: (done: boolean) => void;
  onSkipStep: () => void;
  status: StepStatus;
}

export function CloudInfraPage({ setupActive, onBackToHub, onSaveStep, onSkipStep, status }: CloudInfraPageProps) {
  const [view, setView] = useState<"wizard" | "list">(setupActive ? "wizard" : "list");
  const [accounts, setAccounts] = useState<Account[]>(SEED_ACCOUNTS);
  const [validating, setValidating] = useState(false);
  const [verifyAccount, setVerifyAccount] = useState<Account | null>(null);
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const isDone = status === "done";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function handleWizardComplete(_data: WizardCompleteData) {
    setValidating(true);
  }

  function finishValidation() {
    setValidating(false);
    const newAcc: Account = { ...SAMPLE_AFTER_SAVE_ACCOUNT, provider: "aws" };
    setAccounts((prev) => [...prev, newAcc, SAMPLE_FAILED_ACCOUNT]);
    setView("list");
    showToast(`Connection saved · ${newAcc.name} (${newAcc.accountId})`);

    // Simulate discovery counting up
    let n = 0;
    const tick = () => {
      n += Math.floor(Math.random() * 3) + 1;
      setDiscoveryCount(Math.min(14, n));
      if (n < 14) setTimeout(tick, 600);
    };
    setTimeout(tick, 400);
  }

  const canMarkDone = accounts.length > 0;

  return (
    <div className="p-6 pb-0 flex flex-col gap-4">
      {view === "list" && (
        <ConnectionsList
          accounts={accounts}
          onAddNew={() => setView("wizard")}
          recentDiscoveryCount={discoveryCount}
          setupActive={setupActive}
          onSkipStep={onSkipStep}
          onVerify={(a) => setVerifyAccount(a)}
        />
      )}

      {view === "wizard" && (
        <AddInfrastructureWizard
          onCancel={() => setView("list")}
          onComplete={handleWizardComplete}
          setupActive={setupActive}
          onSkipStep={onSkipStep}
        />
      )}

      {validating && <ValidatingOverlay onComplete={finishValidation} />}

      <VerificationDrawer
        open={!!verifyAccount}
        account={verifyAccount}
        onClose={() => setVerifyAccount(null)}
      />

      {/* Setup-mode footer */}
      {setupActive && view === "list" && (
        <div className="sticky bottom-0 flex items-center gap-3 px-6 py-3 -mx-6 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700">
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            {canMarkDone
              ? `${accounts.length} cloud account${accounts.length === 1 ? "" : "s"} connected · ready to continue`
              : "Connect a cloud account, or skip this step if you only have SaaS / on-prem stores"}
          </span>
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onBackToHub}
          >
            <ArrowLeft size={13} /> Back to Setup Summary
          </button>
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 cursor-pointer dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={onSkipStep}
          >
            Skip this step
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium border-none cursor-pointer disabled:opacity-40 disabled:cursor-default ${
              isDone
                ? "text-slate-600 border border-slate-300 bg-transparent hover:bg-slate-50 dark:text-slate-300 dark:border-slate-600"
                : "text-white bg-blue-500 hover:bg-blue-600"
            }`}
            onClick={() => onSaveStep(!isDone)}
            disabled={!isDone && !canMarkDone}
          >
            {isDone ? "Mark not complete" : <>Mark step complete <Check size={13} /></>}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-[13px] shadow-lg z-50">
          <CheckCircle size={14} className="text-green-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
