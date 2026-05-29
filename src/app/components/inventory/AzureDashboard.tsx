import React from "react";
import { AppDashboard, type AppDashboardConfig } from "./AppDashboardBase";

function AzureLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 96 78" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="az-a" x1="58.97" y1="7.64" x2="28.98" y2="74.13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#114a8b" />
          <stop offset="1" stopColor="#0669bc" />
        </linearGradient>
        <linearGradient id="az-b" x1="60.45" y1="39.24" x2="55.03" y2="41.37" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopOpacity=".3" />
          <stop offset=".07" stopOpacity=".2" />
          <stop offset=".32" stopOpacity=".1" />
          <stop offset=".62" stopOpacity=".05" />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="az-c" x1="50.15" y1="3.32" x2="60.97" y2="72.87" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3ccbf4" />
          <stop offset="1" stopColor="#2892df" />
        </linearGradient>
      </defs>
      <path d="M33.34 2.26H56.4L32.56 73.59a4.3 4.3 0 01-4.07 2.93H8.15a4.29 4.29 0 01-4.06-5.65L27.27 5.2a4.3 4.3 0 014.07-2.93z" fill="url(#az-a)" />
      <path d="M71.17 50.02H36.63a1.93 1.93 0 00-1.32 3.34l22.28 20.86a4.34 4.34 0 012.96 1.17h24.2L71.17 50.02z" fill="url(#az-b)" />
      <path d="M33.34 2.26A4.26 4.26 0 0029.3 5.16L6.14 70.9a4.29 4.29 0 004.07 5.62h21.1a4.45 4.45 0 003.42-2.78L42 55.8l16.2 15.17a4.3 4.3 0 002.82 1.06h24.15l-10.63-21.62-27-22.7 24.4-25.45z" fill="url(#az-c)" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AZURE DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════════

const AZURE_CONFIG: AppDashboardConfig = {
  title: "Azure",
  subtitle: "Cloud infrastructure — Blob Storage containers and Azure SQL databases",
  riskLevel: "critical",
  sensitiveLabel: "finding",
  sensitiveLabelPlural: "findings",
  storeViewDesc: "Area proportional to sensitive finding count per Blob container or SQL database",
  sourceFilterKey: "azure",
  appFilterKey: "azure",
  hero: {
    logo: <AzureLogo />,
  },

  // ── Blob Storage Containers + Azure SQL Databases ─────────────────────────
  stores: [
    {
      id: "blob-prod-datalake",
      name: "acme-prod-datalake",
      short: "prod-dl",
      sensitiveCount: 518,
      dataTypes: [
        { name: "Personal Names",        count: 178 },
        { name: "Email Addresses",        count: 134 },
        { name: "Social Security Numbers",count:  72 },
        { name: "Healthcare IDs",         count:  58 },
        { name: "Payment Cards",          count:  47 },
        { name: "Financial IDs",          count:  29 },
      ],
    },
    {
      id: "blob-prod-backups",
      name: "acme-prod-backups",
      short: "prod-bkp",
      sensitiveCount: 234,
      dataTypes: [
        { name: "Personal Names",  count:  89 },
        { name: "Email Addresses", count:  65 },
        { name: "Birthdates",      count:  42 },
        { name: "Postal Addresses",count:  38 },
      ],
    },
    {
      id: "blob-emea-datalake",
      name: "acme-emea-datalake",
      short: "emea-dl",
      sensitiveCount: 156,
      dataTypes: [
        { name: "Personal Names",   count:  58 },
        { name: "Email Addresses",  count:  42 },
        { name: "IP Addresses",     count:  28 },
        { name: "Corporate Tax IDs",count:  18 },
        { name: "Company Names",    count:  10 },
      ],
    },
    {
      id: "blob-dev-sandbox",
      name: "acme-dev-sandbox",
      short: "dev-sb",
      sensitiveCount: 31,
      dataTypes: [
        { name: "Passwords",    count: 14 },
        { name: "IP Addresses", count: 10 },
        { name: "Private Keys", count:  7 },
      ],
    },
    {
      id: "sql-prod-customers",
      name: "SQL: acme-prod-customers",
      short: "prod-cust",
      sensitiveCount: 96,
      dataTypes: [
        { name: "Personal Names",    count: 32 },
        { name: "Email Addresses",   count: 24 },
        { name: "Payment Cards",     count: 20 },
        { name: "Postal Addresses",  count: 12 },
        { name: "Telephone Numbers", count:  8 },
      ],
    },
    {
      id: "sql-prod-hr",
      name: "SQL: acme-prod-hr",
      short: "prod-hr",
      sensitiveCount: 142,
      dataTypes: [
        { name: "Social Security Numbers",count: 38 },
        { name: "Personal Names",          count: 34 },
        { name: "Birthdates",              count: 28 },
        { name: "Healthcare IDs",          count: 22 },
        { name: "Gender",                  count: 12 },
        { name: "Ethnicity and Race",      count:  8 },
      ],
    },
    {
      id: "sql-analytics",
      name: "SQL: acme-analytics-dw",
      short: "analytics",
      sensitiveCount: 78,
      dataTypes: [
        { name: "Personal Names",   count: 28 },
        { name: "Email Addresses",  count: 18 },
        { name: "IP Addresses",     count: 14 },
        { name: "Corporate Tax IDs",count: 10 },
        { name: "Company Names",    count:  8 },
      ],
    },
  ],

  // ── Per-store volumes (sum = 2.4 TB) ─────────────────────────────────────
  dataStoreVolumeBytes: 2_400e9,
  volumeBreakdown: [
    { label: "Blob Storage", bytes: 1_670e9 },
    { label: "Azure SQL",    bytes:   730e9 },
  ],

  // ── Azure AD identity breakdown ───────────────────────────────────────────
  identityTypes: [
    { type: "Internal User",   count: 46, color: "#60a5fa" },
    { type: "External User",   count:  6, color: "#fb923c" },
    { type: "Unmapped",        count:  3, color: "#a78bfa" },
    { type: "Unauthenticated", count:  2, color: "#f87171" },
  ],

  // ── Posture ───────────────────────────────────────────────────────────────
  postureSummary: { checked: 26, passed: 19, failed: 7 },
  failedRules: [
    {
      id: "az-r1", severity: "critical",
      name: "Blob storage containers with anonymous public read access enabled",
      scope: ["acme-dev-sandbox"],
    },
    {
      id: "az-r2", severity: "critical",
      name: "Azure AD Privileged Identity Management (PIM) not configured",
      scope: "app",
    },
    {
      id: "az-r3", severity: "high",
      name: "Microsoft Defender for Cloud not enabled on all subscriptions",
      scope: "app",
    },
    {
      id: "az-r4", severity: "high",
      name: "Transparent Data Encryption (TDE) not enabled on all SQL databases",
      scope: ["SQL: acme-analytics-dw"],
    },
    {
      id: "az-r5", severity: "high",
      name: "Blob soft delete disabled — no recovery window configured",
      scope: ["acme-dev-sandbox", "acme-emea-datalake"],
    },
    {
      id: "az-r6", severity: "medium",
      name: "NSG inbound rules allow unrestricted access from the internet (0.0.0.0/0)",
      scope: "app",
    },
    {
      id: "az-r7", severity: "low",
      name: "Azure Monitor diagnostic alerts not configured for privileged operations",
      scope: "app",
    },
  ],
};

export function AzureDashboard() {
  return <AppDashboard config={AZURE_CONFIG} />;
}