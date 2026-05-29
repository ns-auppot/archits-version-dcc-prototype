import React from "react";
import { AppDashboard, type AppDashboardConfig } from "./AppDashboardBase";

function AWSLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M24.1 27.5c0 1 .1 1.8.4 2.4.2.4.5.9.8 1.5.1.2.2.4.2.5 0 .2-.1.4-.4.6l-1.2.8c-.2.1-.3.2-.5.2-.2 0-.4-.1-.6-.3-.3-.3-.5-.6-.7-1-.2-.4-.4-.8-.6-1.3-1.6 1.9-3.6 2.8-6 2.8-1.7 0-3.1-.5-4.1-1.5-1-.9-1.5-2.2-1.5-3.8 0-1.7.6-3 1.8-4.1 1.2-1 2.8-1.5 4.8-1.5.7 0 1.4 0 2.1.1.7.1 1.5.2 2.3.4v-1.5c0-1.5-.3-2.6-1-3.3-.6-.7-1.7-1-3.3-1-.7 0-1.4.1-2.2.3-.8.2-1.5.5-2.2.8-.3.1-.6.2-.7.3-.1 0-.3.1-.4.1-.3 0-.5-.2-.5-.7v-1c0-.4.1-.6.2-.8.1-.1.4-.3.8-.5.7-.4 1.6-.7 2.5-.9 1-.3 2-.4 3.1-.4 2.3 0 4 .5 5.1 1.6 1.1 1.1 1.6 2.7 1.6 4.9v6.5zm-8.3 3.1c.7 0 1.4-.1 2.1-.4.7-.3 1.4-.7 1.9-1.3.3-.4.6-.8.7-1.3.1-.5.2-1.1.2-1.8V25c-.6-.1-1.2-.2-1.9-.3-.7-.1-1.3-.1-2-.1-1.3 0-2.3.2-2.9.8-.7.5-1 1.3-1 2.3 0 1 .2 1.7.8 2.2.5.4 1.2.7 2.1.7zm16.4 2.2c-.4 0-.7-.1-.8-.2-.2-.2-.3-.5-.4-1l-4.9-16.2c-.1-.4-.2-.7-.2-.9 0-.4.2-.5.5-.5h2c.4 0 .7.1.9.2.1.2.3.5.4 1l3.5 13.9 3.3-13.9c.1-.4.2-.7.4-1 .1-.2.5-.2.9-.2h1.6c.4 0 .7.1.9.2.1.2.3.5.4 1l3.3 14 3.6-14c.1-.4.2-.7.4-1 .2-.1.5-.2.8-.2h1.9c.4 0 .5.2.5.5 0 .1 0 .2-.1.4 0 .1-.1.3-.2.6l-5 16.2c-.1.4-.3.7-.4 1-.2.2-.5.2-.8.2H41c-.4 0-.7-.1-.9-.2-.1-.2-.3-.5-.4-1l-3.2-13.5-3.2 13.5c-.1.4-.2.7-.4 1-.2.2-.5.2-.9.2h-1.8z" fill="#252f3e"/>
      <path d="M62.3 33.5c-4.4 0-6.6-2-6.6-6.1v-12c0-.4.2-.5.5-.5h2c.4 0 .5.2.5.5v11.8c0 2.8 1.1 4.2 3.6 4.2.4 0 .6.2.6.5v1c0 .4-.2.6-.6.6z" fill="#252f3e"/>
      <path d="M4 37.5c4.5 3.4 11.1 5.2 16.8 5.2 8.1 0 15.4-3 20.9-8 .5-.4 0-.9-.5-.6C35.5 38 28.5 40 21 40c-5 0-10.5-1-15.5-3.2-.8-.3-1.4.5-.5.7z" fill="#f90"/>
      <path d="M2.1 35c-.4-.5-3.8-.2-5.2 0-.4.1-.5-.3-.1-.6 2.6-1.8 6.8-1.3 7.3-.7.5.6-.1 5-2.5 7.1-.4.3-.7.1-.5-.3.5-1.3 1.7-4.9 1-5.5z" fill="#f90" transform="translate(39 0)"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AWS DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════════

const AWS_CONFIG: AppDashboardConfig = {
  title: "AWS",
  subtitle: "Cloud infrastructure — S3 object storage and RDS relational databases",
  riskLevel: "critical",
  sensitiveLabel: "finding",
  sensitiveLabelPlural: "findings",
  storeViewDesc: "Area proportional to sensitive finding count per S3 bucket or RDS instance",
  sourceFilterKey: "aws",
  appFilterKey: "aws-s3",
  hero: {
    logo: <AWSLogo />,
  },

  // ── S3 Buckets + RDS Instances ────────────────────────────────────────────
  stores: [
    {
      id: "s3-prod-data-lake",
      name: "s3://prod-data-lake",
      short: "data-lake",
      sensitiveCount: 428,
      dataTypes: [
        { name: "Personal Names",        count: 156 },
        { name: "Email Addresses",        count:  89 },
        { name: "Social Security Numbers",count:  52 },
        { name: "IP Addresses",           count:  47 },
        { name: "Financial IDs",          count:  34 },
        { name: "Healthcare IDs",         count:  28 },
        { name: "Medical Records",        count:  22 },
      ],
    },
    {
      id: "s3-ml-training",
      name: "s3://ml-training-datasets",
      short: "ml-training",
      sensitiveCount: 312,
      dataTypes: [
        { name: "Personal Names",  count: 112 },
        { name: "Email Addresses", count:  78 },
        { name: "Birthdates",      count:  56 },
        { name: "IP Addresses",    count:  42 },
        { name: "Healthcare IDs",  count:  24 },
      ],
    },
    {
      id: "s3-staging-exports",
      name: "s3://staging-data-exports",
      short: "staging-exp",
      sensitiveCount: 187,
      dataTypes: [
        { name: "Payment Cards",           count: 72 },
        { name: "Bank Account Information",count: 58 },
        { name: "Social Security Numbers", count: 34 },
        { name: "Financial IDs",           count: 23 },
      ],
    },
    {
      id: "s3-backups",
      name: "s3://backups-archive-east",
      short: "backups",
      sensitiveCount: 94,
      dataTypes: [
        { name: "Personal Names",    count: 38 },
        { name: "Email Addresses",   count: 24 },
        { name: "Telephone Numbers", count: 18 },
        { name: "Postal Addresses",  count: 14 },
      ],
    },
    {
      id: "s3-dev-sandbox",
      name: "s3://dev-sandbox-assets",
      short: "dev-sandbox",
      sensitiveCount: 23,
      dataTypes: [
        { name: "Passwords",    count: 12 },
        { name: "IP Addresses", count:  7 },
        { name: "Private Keys", count:  4 },
      ],
    },
    {
      id: "rds-prod-users",
      name: "RDS: prod-users-db",
      short: "prod-users",
      sensitiveCount: 84,
      dataTypes: [
        { name: "Personal Names",        count: 28 },
        { name: "Email Addresses",        count: 18 },
        { name: "Social Security Numbers",count: 14 },
        { name: "Telephone Numbers",      count: 10 },
        { name: "Postal Addresses",       count:  8 },
        { name: "Birthdates",             count:  6 },
      ],
    },
    {
      id: "rds-prod-orders",
      name: "RDS: prod-orders-db",
      short: "prod-orders",
      sensitiveCount: 46,
      dataTypes: [
        { name: "Payment Cards",           count: 18 },
        { name: "Bank Account Information",count: 12 },
        { name: "Financial IDs",           count:  9 },
        { name: "Personal Names",          count:  7 },
      ],
    },
    {
      id: "rds-analytics",
      name: "RDS: analytics-warehouse",
      short: "analytics",
      sensitiveCount: 127,
      dataTypes: [
        { name: "Personal Names",   count: 42 },
        { name: "Email Addresses",  count: 28 },
        { name: "IP Addresses",     count: 21 },
        { name: "Corporate Tax IDs",count: 14 },
        { name: "Company Names",    count: 12 },
        { name: "Securities IDs",   count: 10 },
      ],
    },
    {
      id: "rds-staging-hr",
      name: "RDS: staging-hr-db",
      short: "staging-hr",
      sensitiveCount: 63,
      dataTypes: [
        { name: "Social Security Numbers",count: 18 },
        { name: "Personal Names",          count: 16 },
        { name: "Birthdates",              count: 12 },
        { name: "Healthcare IDs",          count: 10 },
        { name: "Medical Records",         count:  7 },
      ],
    },
  ],

  // ── Per-store volumes (sum = 3.2 TB) ─────────────────────────────────────
  dataStoreVolumeBytes: 3_200e9,
  volumeBreakdown: [
    { label: "S3",  bytes: 2_600e9 },
    { label: "RDS", bytes:   600e9 },
  ],

  // ── IAM identity breakdown ────────────────────────────────────────────────
  identityTypes: [
    { type: "Internal User",   count: 42, color: "#60a5fa" },
    { type: "External User",   count:  7, color: "#fb923c" },
    { type: "Unmapped",        count:  4, color: "#a78bfa" },
    { type: "Unauthenticated", count:  1, color: "#f87171" },
  ],

  // ── Posture ───────────────────────────────────────────────────────────────
  postureSummary: { checked: 30, passed: 22, failed: 8 },
  failedRules: [
    {
      id: "aws-r1", severity: "critical",
      name: "S3 bucket public access block not enabled",
      scope: ["s3://staging-data-exports", "s3://dev-sandbox-assets"],
    },
    {
      id: "aws-r2", severity: "critical",
      name: "Root account activity detected — MFA not enforced",
      scope: "app",
    },
    {
      id: "aws-r3", severity: "high",
      name: "CloudTrail logging disabled in secondary region (us-west-2)",
      scope: "app",
    },
    {
      id: "aws-r4", severity: "high",
      name: "RDS instances not encrypted at rest",
      scope: ["RDS: staging-hr-db"],
    },
    {
      id: "aws-r5", severity: "high",
      name: "S3 server access logging disabled",
      scope: ["s3://prod-data-lake", "s3://ml-training-datasets", "s3://backups-archive-east"],
    },
    {
      id: "aws-r6", severity: "medium",
      name: "RDS automated backup retention below 7 days",
      scope: ["RDS: staging-hr-db"],
    },
    {
      id: "aws-r7", severity: "medium",
      name: "Amazon GuardDuty not enabled in all regions",
      scope: "app",
    },
    {
      id: "aws-r8", severity: "low",
      name: "IAM password policy does not require hardware MFA",
      scope: "app",
    },
  ],
};

export function AWSDashboard() {
  return <AppDashboard config={AWS_CONFIG} />;
}