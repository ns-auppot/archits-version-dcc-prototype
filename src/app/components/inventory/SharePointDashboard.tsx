import React from "react";
import { AppDashboard, type AppDashboardConfig } from "./AppDashboardBase";

function SharePointLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="16" r="12" fill="#038387" />
      <circle cx="16" cy="28" r="10" fill="#05a6a6" />
      <circle cx="24" cy="36" r="8" fill="#37c6d0" />
      <rect x="8" y="8" width="18" height="32" rx="2" fill="#036c70" />
      <text x="17" y="29" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="Segoe UI, sans-serif">S</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHAREPOINT DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SHAREPOINT_CONFIG: AppDashboardConfig = {
  title: "SharePoint",
  subtitle: "Microsoft 365 collaboration platform — sites, document libraries, and shared content",
  riskLevel: "high",
  sensitiveLabel: "document",
  sensitiveLabelPlural: "documents",
  storeViewDesc: "Area proportional to sensitive document count per SharePoint site",
  hideNotConnected: true,
  appFilterKey: "sharepoint",
  hero: {
    logo: <SharePointLogo />,
  },

  // ── SharePoint Sites ──────────────────────────────────────────────────────
  stores: [
    {
      id: "sp-hr-intranet",
      name: "HR Intranet Portal",
      short: "HR",
      sensitiveCount: 234,
      dataTypes: [
        { name: "Personal Names",        count:  82 },
        { name: "Social Security Numbers",count:  48 },
        { name: "Birthdates",            count:  38 },
        { name: "Medical Records",       count:  28 },
        { name: "Healthcare IDs",        count:  18 },
        { name: "Postal Addresses",      count:  12 },
        { name: "Gender",                count:   8 },
      ],
    },
    {
      id: "sp-finance",
      name: "Finance & Compliance Hub",
      short: "Finance",
      sensitiveCount: 187,
      dataTypes: [
        { name: "Financial IDs",           count:  62 },
        { name: "Bank Account Information",count:  48 },
        { name: "Payment Cards",           count:  38 },
        { name: "Taxpayer IDs",            count:  24 },
        { name: "Personal Names",          count:  15 },
      ],
    },
    {
      id: "sp-legal",
      name: "Legal & Contracts Library",
      short: "Legal",
      sensitiveCount: 156,
      dataTypes: [
        { name: "Personal Names",          count:  58 },
        { name: "Financial IDs",           count:  42 },
        { name: "Legal Privileges",        count:  28 },
        { name: "Company Names",           count:  16 },
        { name: "Bank Account Information",count:  12 },
      ],
    },
    {
      id: "sp-exec",
      name: "Executive Leadership Site",
      short: "Exec",
      sensitiveCount: 142,
      dataTypes: [
        { name: "Personal Names",        count:  52 },
        { name: "Financial IDs",         count:  38 },
        { name: "Social Security Numbers",count:  28 },
        { name: "Bank Account Information",count: 14 },
        { name: "Taxpayer IDs",          count:  10 },
      ],
    },
    {
      id: "sp-sales",
      name: "Sales & Customer CRM",
      short: "Sales",
      sensitiveCount: 78,
      dataTypes: [
        { name: "Personal Names",    count: 32 },
        { name: "Email Addresses",   count: 22 },
        { name: "Telephone Numbers", count: 14 },
        { name: "Postal Addresses",  count: 10 },
      ],
    },
    {
      id: "sp-engineering",
      name: "Engineering Wiki",
      short: "Eng",
      sensitiveCount: 45,
      dataTypes: [
        { name: "Source Code",  count: 18 },
        { name: "IP Addresses", count: 12 },
        { name: "Passwords",    count:  9 },
        { name: "Private Keys", count:  6 },
      ],
    },
    {
      id: "sp-partner",
      name: "Partner Extranet",
      short: "Partner",
      sensitiveCount: 32,
      dataTypes: [
        { name: "Company Names",   count: 12 },
        { name: "Email Addresses", count: 10 },
        { name: "Personal Names",  count:  8 },
        { name: "Financial IDs",   count:  2 },
      ],
    },
  ],

  // ── Per-site volumes (sum = 780 GB) ──────────────────────────────────────
  dataStoreVolumeBytes: 780e9,

  // ── Microsoft 365 identity breakdown ─────────────────────────────────────
  identityTypes: [
    { type: "Internal User",   count: 162, color: "#60a5fa" },
    { type: "External User",   count:  40, color: "#fb923c" },
    { type: "Unmapped",        count:  14, color: "#a78bfa" },
    { type: "Unauthenticated", count:   3, color: "#f87171" },
  ],

  // ── Posture ───────────────────────────────────────────────────────────────
  postureSummary: { checked: 28, passed: 20, failed: 8 },
  failedRules: [
    {
      id: "sp-r1", severity: "critical",
      name: "\"Anyone\" sharing links enabled on sites containing sensitive documents",
      scope: ["Finance & Compliance Hub", "Legal & Contracts Library", "HR Intranet Portal"],
    },
    {
      id: "sp-r2", severity: "critical",
      name: "External guest sharing not restricted by domain allowlist",
      scope: "app",
    },
    {
      id: "sp-r3", severity: "high",
      name: "Microsoft Purview DLP policies not applied to sensitive site collections",
      scope: ["Engineering Wiki", "Sales & Customer CRM"],
    },
    {
      id: "sp-r4", severity: "high",
      name: "SharePoint audit logs not exported to Sentinel / SIEM",
      scope: "app",
    },
    {
      id: "sp-r5", severity: "medium",
      name: "Sensitivity labels not enforced on document upload or classification",
      scope: "app",
    },
    {
      id: "sp-r6", severity: "medium",
      name: "Conditional access policy does not apply to B2B guest accounts",
      scope: "app",
    },
    {
      id: "sp-r7", severity: "low",
      name: "Site collections without version history enabled — no rollback capability",
      scope: ["Partner Extranet"],
    },
    {
      id: "sp-r8", severity: "low",
      name: "Guest access expiry not set — external users retain access indefinitely",
      scope: "app",
    },
  ],
};

export function SharePointDashboard() {
  return <AppDashboard config={SHAREPOINT_CONFIG} />;
}