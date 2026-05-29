import React from "react";
import { AppDashboard, type AppDashboardConfig } from "./AppDashboardBase";

function DatabaseLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="10" rx="16" ry="6" fill="#64748b" opacity="0.3" />
      <ellipse cx="24" cy="10" rx="16" ry="6" fill="none" stroke="#475569" strokeWidth="2" />
      <path d="M8 10v28c0 3.3 7.2 6 16 6s16-2.7 16-6V10" fill="none" stroke="#475569" strokeWidth="2" />
      <ellipse cx="24" cy="22" rx="16" ry="6" fill="none" stroke="#475569" strokeWidth="2" opacity="0.5" />
      <ellipse cx="24" cy="34" rx="16" ry="6" fill="none" stroke="#475569" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ON-PREM DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════════

const ONPREM_CONFIG: AppDashboardConfig = {
  title: "On-Prem",
  subtitle: "On-premises relational databases — PostgreSQL and Oracle instances",
  riskLevel: "high",
  sensitiveLabel: "column",
  sensitiveLabelPlural: "columns",
  storeViewDesc: "Area proportional to sensitive column count per database instance",
  sourceFilterKey: "on-prem",
  appFilterKey: "postgresql",
  emptyRisks: true,
  hero: {
    logo: <DatabaseLogo />,
  },

  // ── PostgreSQL + Oracle Instances ─────────────────────────────────────────
  stores: [
    {
      id: "pg-prod-users",
      name: "PGPROD-USERS-01",
      short: "PG-Users",
      sensitiveCount: 312,
      dataTypes: [
        { name: "Personal Names",        count: 102 },
        { name: "Email Addresses",        count:  78 },
        { name: "Social Security Numbers",count:  48 },
        { name: "Telephone Numbers",      count:  34 },
        { name: "Postal Addresses",       count:  28 },
        { name: "Birthdates",             count:  22 },
      ],
    },
    {
      id: "pg-prod-orders",
      name: "PGPROD-ORDERS-02",
      short: "PG-Orders",
      sensitiveCount: 198,
      dataTypes: [
        { name: "Payment Cards",           count:  72 },
        { name: "Bank Account Information",count:  58 },
        { name: "Financial IDs",           count:  38 },
        { name: "Personal Names",          count:  20 },
        { name: "Postal Addresses",        count:  10 },
      ],
    },
    {
      id: "pg-analytics",
      name: "PGPROD-ANALYTICS-03",
      short: "PG-Analytics",
      sensitiveCount: 278,
      dataTypes: [
        { name: "Personal Names",   count:  92 },
        { name: "Email Addresses",  count:  68 },
        { name: "IP Addresses",     count:  42 },
        { name: "Corporate Tax IDs",count:  32 },
        { name: "Company Names",    count:  24 },
        { name: "Securities IDs",   count:  20 },
      ],
    },
    {
      id: "pg-staging-hr",
      name: "PGSTAGE-HR-04",
      short: "PG-HR-Stage",
      sensitiveCount: 185,
      dataTypes: [
        { name: "Social Security Numbers",count:  48 },
        { name: "Personal Names",          count:  42 },
        { name: "Birthdates",              count:  36 },
        { name: "Healthcare IDs",          count:  28 },
        { name: "Medical Records",         count:  18 },
        { name: "Gender",                  count:   8 },
        { name: "Ethnicity and Race",      count:   5 },
      ],
    },
    {
      id: "ora-prod-erp",
      name: "ORA-PROD-ERP-01",
      short: "ORA-ERP",
      sensitiveCount: 487,
      dataTypes: [
        { name: "Personal Names",          count: 142 },
        { name: "Financial IDs",           count: 118 },
        { name: "Bank Account Information",count:  92 },
        { name: "Taxpayer IDs",            count:  68 },
        { name: "Payment Cards",           count:  42 },
        { name: "Postal Addresses",        count:  25 },
      ],
    },
    {
      id: "ora-prod-risk",
      name: "ORA-PROD-RISK-02",
      short: "ORA-Risk",
      sensitiveCount: 312,
      dataTypes: [
        { name: "Personal Names",        count:  98 },
        { name: "Social Security Numbers",count:  72 },
        { name: "Financial IDs",         count:  64 },
        { name: "Securities IDs",        count:  42 },
        { name: "Corporate Tax IDs",     count:  36 },
      ],
    },
    {
      id: "ora-legacy-hr",
      name: "ORA-LEGACY-HR",
      short: "ORA-Legacy",
      sensitiveCount: 234,
      dataTypes: [
        { name: "Personal Names",        count:  78 },
        { name: "Social Security Numbers",count:  58 },
        { name: "Birthdates",            count:  42 },
        { name: "Healthcare IDs",        count:  28 },
        { name: "Medical Records",       count:  18 },
        { name: "Gender",                count:   8 },
        { name: "Ethnicity and Race",    count:   2 },
      ],
    },
  ],

  // ── Per-instance volumes (sum = 480 GB) ───────────────────────────────────
  dataStoreVolumeBytes: 480e9,
  volumeBreakdown: [
    { label: "PostgreSQL", bytes: 297e9 },
    { label: "Oracle",     bytes: 183e9 },
  ],

  // ── DB identity breakdown ─────────────────────────────────────────────────
  identityTypes: [
    { type: "Internal User",   count: 44, color: "#60a5fa" },
    { type: "External User",   count:  4, color: "#fb923c" },
    { type: "Unmapped",        count:  9, color: "#a78bfa" },
    { type: "Unauthenticated", count:  3, color: "#f87171" },
  ],

  // ── Posture ───────────────────────────────────────────────────────────────
  postureSummary: { checked: 22, passed: 14, failed: 8 },
  failedRules: [
    {
      id: "op-r1", severity: "critical",
      name: "SSL/TLS not enforced on database connections",
      scope: ["PGSTAGE-HR-04", "ORA-LEGACY-HR"],
    },
    {
      id: "op-r2", severity: "critical",
      name: "PostgreSQL superuser accessible from remote hosts",
      scope: ["PGPROD-USERS-01", "PGPROD-ANALYTICS-03"],
    },
    {
      id: "op-r3", severity: "high",
      name: "Database servers not patched — 3+ months behind latest release",
      scope: ["ORA-LEGACY-HR", "ORA-PROD-RISK-02"],
    },
    {
      id: "op-r4", severity: "high",
      name: "Automated backups disabled or retention under 7 days",
      scope: ["PGSTAGE-HR-04", "ORA-LEGACY-HR"],
    },
    {
      id: "op-r5", severity: "high",
      name: "No database audit logging configured",
      scope: ["ORA-LEGACY-HR"],
    },
    {
      id: "op-r6", severity: "medium",
      name: "Default database credentials detected in use",
      scope: ["ORA-LEGACY-HR"],
    },
    {
      id: "op-r7", severity: "medium",
      name: "Database port exposed to all internal subnets — no network segmentation",
      scope: ["PGSTAGE-HR-04"],
    },
    {
      id: "op-r8", severity: "low",
      name: "Connection idle timeout not configured — sessions persist indefinitely",
      scope: ["PGPROD-ANALYTICS-03", "ORA-PROD-ERP-01"],
    },
  ],
};

export function OnPremDashboard() {
  return <AppDashboard config={ONPREM_CONFIG} />;
}