import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { PanelRight, Search, SlidersHorizontal, X, ChevronDown, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

// ── Mock relationship data ──────────────────────────────────────────────────

import { IDENTITY_REGISTRY, type RegistryIdentity } from "./identityRegistry";

// ── Inventory panel content components ──────────────────────────────────────
import { SidePanel } from "./SidePanel";
import { SaaSRowPanelContent, type SaaSUnstructuredDataRow }   from "./UnstructuredDataStoreTableSaaS";
import { IaaSRowPanelContent, type IaaSUnstructuredDataRow }   from "./UnstructuredDataStoreTableIaaS";
import { OnPremStructuredRowPanelContent, type OnPremStructuredDataRow } from "./StructuredDataStoreTableOnPrem";
import { IaaSStructuredRowPanelContent, type IaaSStructuredDataRow }   from "./StructuredDataStoreTableIaaS";
import { IdentityDetailPanel, getIdentityTableConfig } from "./InventoryContent";
import { generateSparkData } from "./data-store-shared";

interface DataStoreNode {
  id: string;
  name: string;
  platform: string;   // e.g. "google-drive", "aws-s3", "postgresql"
  subtitle: string;   // secondary text shown on node and in the list
  dataTypes: string[];
}

// IdentityNode is now sourced from the unified registry.
// Only identities with known data-store access appear as radar nodes.
type IdentityNode = RegistryIdentity;

export const IDENTITIES: IdentityNode[] = IDENTITY_REGISTRY.filter(
  (i) => i.dataStores.length > 0,
);

// ── Mock per-identity metadata (for panel filters) ────────────────────────────
export interface IdentityMeta {
  uciScore: number;       // 0–100
  idpStatus: "Active" | "Suspended" | "Disabled";
  orgUnit: string;
  localAccount: boolean;
  lastActiveDaysAgo: number;
}

export const IDENTITY_META: Record<string, IdentityMeta> = {
  "alice-chen":     { uciScore: 82, idpStatus: "Active",    orgUnit: "Engineering",  localAccount: false, lastActiveDaysAgo: 1  },
  "brian-kowalski": { uciScore: 71, idpStatus: "Active",    orgUnit: "Finance",      localAccount: false, lastActiveDaysAgo: 3  },
  "diana-reyes":    { uciScore: 94, idpStatus: "Active",    orgUnit: "Security",     localAccount: true,  lastActiveDaysAgo: 2  },
  "tom-hargrove":   { uciScore: 65, idpStatus: "Active",    orgUnit: "DevOps",       localAccount: true,  lastActiveDaysAgo: 5  },
  "nina-volkov":    { uciScore: 78, idpStatus: "Active",    orgUnit: "Engineering",  localAccount: false, lastActiveDaysAgo: 0  },
  "marcus-webb":    { uciScore: 43, idpStatus: "Suspended", orgUnit: "Engineering",  localAccount: false, lastActiveDaysAgo: 45 },
  "sarah-okonkwo":  { uciScore: 88, idpStatus: "Active",    orgUnit: "Design",       localAccount: false, lastActiveDaysAgo: 7  },
  "lisa-park":      { uciScore: 55, idpStatus: "Active",    orgUnit: "HR",           localAccount: false, lastActiveDaysAgo: 12 },
  "kevin-marsh":    { uciScore: 67, idpStatus: "Active",    orgUnit: "Sales",        localAccount: false, lastActiveDaysAgo: 4  },
  "omar-farouk":    { uciScore: 59, idpStatus: "Active",    orgUnit: "Legal",        localAccount: false, lastActiveDaysAgo: 20 },
  "chloe-dupont":   { uciScore: 76, idpStatus: "Active",    orgUnit: "Product",      localAccount: false, lastActiveDaysAgo: 8  },
  "raj-patel":      { uciScore: 91, idpStatus: "Active",    orgUnit: "Engineering",  localAccount: true,  lastActiveDaysAgo: 1  },
  "yuki-tanaka":    { uciScore: 83, idpStatus: "Active",    orgUnit: "Analytics",    localAccount: false, lastActiveDaysAgo: 6  },
  // external users — no UCI / no local account
  "james-thornton": { uciScore: 30, idpStatus: "Active",    orgUnit: "Partner Inc.",      localAccount: false, lastActiveDaysAgo: 15 },
  "priya-nair":     { uciScore: 28, idpStatus: "Active",    orgUnit: "VendorCorp",         localAccount: false, lastActiveDaysAgo: 33 },
  "stefan-brauer":  { uciScore: 22, idpStatus: "Disabled",  orgUnit: "VendorGmbH",         localAccount: false, lastActiveDaysAgo: 95 },
  "carlos-rivera":  { uciScore: 35, idpStatus: "Active",    orgUnit: "Partner Inc.",      localAccount: false, lastActiveDaysAgo: 10 },
  "amara-osei":     { uciScore: 41, idpStatus: "Active",    orgUnit: "Audit Associates",   localAccount: false, lastActiveDaysAgo: 28 },
  "luke-hennessy":  { uciScore: 19, idpStatus: "Active",    orgUnit: "Consult Group",      localAccount: false, lastActiveDaysAgo: 62 },
  "mei-lin":        { uciScore: 38, idpStatus: "Active",    orgUnit: "VendorCorp",         localAccount: false, lastActiveDaysAgo: 40 },
};

export const DATA_STORES: DataStoreNode[] = [
  // ── Google Drive ─────────────────────────────────────────────────────────
  { id: "d1",    name: "Engineering Shared Drive",   platform: "google-drive", subtitle: "Google Drive",
    dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Source Code", "Passwords", "Private Keys"] },
  { id: "d2",    name: "Finance Team Drive",          platform: "google-drive", subtitle: "Google Drive",
    dataTypes: ["Financial IDs", "Bank Account Information", "Payment Cards", "Social Security Numbers", "Taxpayer IDs"] },
  { id: "d3",    name: "HR Confidential",             platform: "google-drive", subtitle: "Google Drive",
    dataTypes: ["Personal Names", "Social Security Numbers", "Birthdates", "Medical Records", "Postal Addresses", "Telephone Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race"] },
  { id: "d4",    name: "Marketing Assets",            platform: "google-drive", subtitle: "Google Drive",
    dataTypes: ["Email Addresses", "Personal Names", "Company Names"] },

  // ── SharePoint ───────────────────────────────────────────────────────────
  { id: "sp1",   name: "Legal \u2013 Contracts",      platform: "sharepoint",   subtitle: "SharePoint",
    dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Company Names", "Postal Addresses", "Taxpayer IDs"] },
  { id: "sp2",   name: "HR \u2013 Employee Portal",   platform: "sharepoint",   subtitle: "SharePoint",
    dataTypes: ["Personal Names", "Birthdates", "Social Security Numbers", "Healthcare IDs", "Gender", "Ethnicity and Race", "Postal Addresses"] },
  { id: "sp3",   name: "Product \u2013 Roadmap Hub",  platform: "sharepoint",   subtitle: "SharePoint",
    dataTypes: ["Email Addresses", "Company Names", "Source Code"] },

  // ── AWS S3 ───────────────────────────────────────────────────────────────
  { id: "s1",    name: "prod-data-lake",              platform: "aws-s3",       subtitle: "S3 Bucket",
    dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Financial IDs", "Healthcare IDs", "Birthdates", "Telephone Numbers", "Postal Addresses"] },
  { id: "s2",    name: "analytics-staging",           platform: "aws-s3",       subtitle: "S3 Bucket",
    dataTypes: ["IP Addresses", "MAC Addresses", "UUIDs", "Domain Names", "URI Hosts"] },
  { id: "s3",    name: "ml-training-data",            platform: "aws-s3",       subtitle: "S3 Bucket",
    dataTypes: ["Personal Names", "Biometric Data", "Medical Records", "Healthcare Provider IDs", "Medical Diagnoses", "Gender", "Age", "Ethnicity and Race"] },

  // ── Azure Blob ───────────────────────────────────────────────────────────
  { id: "ab1",   name: "compliance-archive",          platform: "azure-blob",   subtitle: "Blob Container",
    dataTypes: ["Personal Names", "Social Security Numbers", "Taxpayer IDs", "Financial IDs", "Postal Addresses", "Passports"] },
  { id: "ab2",   name: "customer-uploads",            platform: "azure-blob",   subtitle: "Blob Container",
    dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Telephone Numbers", "Company Names"] },
  { id: "ab3",   name: "research-datasets",           platform: "azure-blob",   subtitle: "Blob Container",
    dataTypes: ["Medical Records", "Healthcare IDs", "Biometric Data", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race"] },

  // ── PostgreSQL ───────────────────────────────────────────────────────────
  { id: "pg1",   name: "PGSRV-PROD-01",               platform: "postgresql",   subtitle: "PostgreSQL 16.2 \u00B7 dc-east-rack4",
    dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Payment Cards", "Bank Account Information", "Taxpayer IDs", "Postal Addresses", "Telephone Numbers", "Email Addresses"] },
  { id: "pg2",   name: "PGSRV-PROD-02",               platform: "postgresql",   subtitle: "PostgreSQL 16.2 \u00B7 dc-east-rack4",
    dataTypes: ["Medical Records", "Healthcare IDs", "Healthcare Provider IDs", "Medical Diagnoses", "Personal Names", "Birthdates", "Gender"] },
  { id: "pg3",   name: "PGSRV-DEV-01",                platform: "postgresql",   subtitle: "PostgreSQL 15.4 \u00B7 dc-west-rack2",
    dataTypes: ["Personal Names", "Email Addresses", "Passwords", "Source Code", "IP Addresses"] },
  { id: "pg4",   name: "PGSRV-LEGACY",                platform: "postgresql",   subtitle: "PostgreSQL 13.8 \u00B7 dc-east-rack1",
    dataTypes: ["Personal Names", "Social Security Numbers", "Driver Licenses", "National IDs", "Passports", "Financial IDs", "Payment Cards", "Postal Addresses", "Telephone Numbers", "Birthdates"] },

  // ── Oracle ───────────────────────────────────────────────────────────────
  { id: "ora1",  name: "ORACLEDB-PROD-01",            platform: "oracle",       subtitle: "Oracle 19c \u00B7 dc-east-rack3",
    dataTypes: ["Personal Names", "Social Security Numbers", "Financial IDs", "Payment Cards", "Bank Account Information", "Email Addresses", "Postal Addresses", "Telephone Numbers"] },
  { id: "ora2",  name: "ORACLEDB-PROD-02",            platform: "oracle",       subtitle: "Oracle 19c \u00B7 dc-east-rack3",
    dataTypes: ["Medical Records", "Healthcare IDs", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race"] },
  { id: "ora3",  name: "ORACLEDB-LEGACY",             platform: "oracle",       subtitle: "Oracle 12c \u00B7 dc-west-rack1",
    dataTypes: ["Personal Names", "Social Security Numbers", "Driver Licenses", "Passports", "Financial IDs", "Payment Cards", "Taxpayer IDs", "Postal Addresses", "Telephone Numbers", "Birthdates", "National IDs"] },

  // ── AWS RDS ──────────────────────────────────────────────────────────────
  { id: "rds1",  name: "prod-users-db",               platform: "aws-rds",      subtitle: "PostgreSQL 15.4 \u00B7 us-east-1",
    dataTypes: ["Personal Names", "Email Addresses", "Social Security Numbers", "Telephone Numbers", "Postal Addresses", "Birthdates", "Passwords", "Payment Cards"] },
  { id: "rds2",  name: "prod-orders-db",              platform: "aws-rds",      subtitle: "MySQL 8.0 \u00B7 us-east-1",
    dataTypes: ["Payment Cards", "Bank Account Information", "Financial IDs", "Personal Names", "Postal Addresses", "Telephone Numbers"] },
  { id: "rds3",  name: "analytics-warehouse",         platform: "aws-rds",      subtitle: "PostgreSQL 15.4 \u00B7 us-west-2",
    dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Domain Names", "Company Names"] },
  { id: "rds4",  name: "staging-hr-db",               platform: "aws-rds",      subtitle: "PostgreSQL 15.4 \u00B7 us-east-1",
    dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race", "Postal Addresses", "Healthcare IDs", "Medical Records"] },

  // ── Azure SQL ────────────────────────────────────────────────────────────
  { id: "asql1", name: "acme-prod-customers",         platform: "azure-sql",    subtitle: "Azure SQL \u00B7 East US",
    dataTypes: ["Personal Names", "Email Addresses", "Payment Cards", "Postal Addresses", "Telephone Numbers", "Birthdates"] },
  { id: "asql2", name: "acme-prod-hr",                platform: "azure-sql",    subtitle: "Azure SQL \u00B7 East US",
    dataTypes: ["Social Security Numbers", "Personal Names", "Birthdates", "Gender", "Ethnicity and Race", "Healthcare IDs", "Postal Addresses", "Telephone Numbers"] },
  { id: "asql3", name: "acme-analytics-dw",           platform: "azure-sql",    subtitle: "Azure SQL \u00B7 West Europe",
    dataTypes: ["Personal Names", "Email Addresses", "IP Addresses", "Company Names"] },

  // ── Endpoint ─────────────────────────────────────────────────────────────
  { id: "ep1",   name: "MacBook Pro \u2013 Alice Chen",  platform: "endpoint",     subtitle: "User Device \u00B7 macOS 14.3",
    dataTypes: ["Source Code", "Private Keys", "Passwords", "Email Addresses", "Personal Names"] },
  { id: "ep2",   name: "ThinkPad X1 \u2013 Bob Martin",  platform: "endpoint",     subtitle: "User Device \u00B7 Windows 11",
    dataTypes: ["Source Code", "Email Addresses", "Personal Names", "Company Names"] },
  { id: "ep3",   name: "Surface Pro \u2013 Carol Kim",   platform: "endpoint",     subtitle: "User Device \u00B7 Windows 11",
    dataTypes: ["Personal Names", "Social Security Numbers", "Payment Cards", "Medical Records"] },
  { id: "ep4",   name: "MacBook Air \u2013 Dave Singh",  platform: "endpoint",     subtitle: "User Device \u00B7 macOS 13.6",
    dataTypes: ["Email Addresses", "Passwords", "Secrets and Tokens", "Personal Names"] },
  { id: "ep5",   name: "Dell Latitude \u2013 Eve Lopez", platform: "endpoint",     subtitle: "User Device \u00B7 Windows 11",
    dataTypes: ["Personal Names", "Email Addresses", "Financial IDs", "Bank Account Information"] },
  { id: "ep6",   name: "HP EliteBook \u2013 Frank Wu",   platform: "endpoint",     subtitle: "User Device \u00B7 Windows 11",
    dataTypes: [] },
  { id: "ep7",   name: "MacBook Pro \u2013 Grace Hall",  platform: "endpoint",     subtitle: "User Device \u00B7 macOS 14.3",
    dataTypes: [] },

  // \u2500\u2500 Google Drive (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "d5",    name: "Design Team Drive",           platform: "google-drive", subtitle: "Google Drive",
    dataTypes: [] },
  { id: "d6",    name: "Dev Ops Runbooks",            platform: "google-drive", subtitle: "Google Drive",
    dataTypes: [] },

  // \u2500\u2500 SharePoint (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "sp4",   name: "IT \u2013 Policies & Docs",   platform: "sharepoint",   subtitle: "SharePoint",
    dataTypes: [] },
  { id: "sp5",   name: "Sales \u2013 Collateral",     platform: "sharepoint",   subtitle: "SharePoint",
    dataTypes: [] },

  // \u2500\u2500 AWS S3 (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "s4",    name: "app-logs-archive",            platform: "aws-s3",       subtitle: "S3 Bucket",
    dataTypes: [] },
  { id: "s5",    name: "static-assets",               platform: "aws-s3",       subtitle: "S3 Bucket",
    dataTypes: [] },

  // \u2500\u2500 Azure Blob (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "ab4",   name: "infra-backups",               platform: "azure-blob",   subtitle: "Blob Container",
    dataTypes: [] },
  { id: "ab5",   name: "media-processing",            platform: "azure-blob",   subtitle: "Blob Container",
    dataTypes: [] },

  // \u2500\u2500 PostgreSQL (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "pg5",   name: "PGSRV-DEV-02",                platform: "postgresql",   subtitle: "PostgreSQL 15.4 \u00B7 dc-west-rack2",
    dataTypes: [] },
  { id: "pg6",   name: "PGSRV-METRICS",               platform: "postgresql",   subtitle: "PostgreSQL 16.1 \u00B7 dc-east-rack2",
    dataTypes: [] },

  // \u2500\u2500 Oracle (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "ora4",  name: "ORACLEDB-AUDIT",              platform: "oracle",       subtitle: "Oracle 19c \u00B7 dc-east-rack3",
    dataTypes: [] },

  // \u2500\u2500 AWS RDS (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "rds5",  name: "feature-flags-db",            platform: "aws-rds",      subtitle: "MySQL 8.0 \u00B7 us-east-1",
    dataTypes: [] },
  { id: "rds6",  name: "session-cache-db",            platform: "aws-rds",      subtitle: "PostgreSQL 15.4 \u00B7 us-west-2",
    dataTypes: [] },

  // \u2500\u2500 Azure SQL (no sensitive data) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  { id: "asql4", name: "acme-config-db",              platform: "azure-sql",    subtitle: "Azure SQL \u00B7 West Europe",
    dataTypes: [] },
  { id: "asql5", name: "acme-event-log",              platform: "azure-sql",    subtitle: "Azure SQL \u00B7 East US",
    dataTypes: [] },
];

// ── Bridge: radar DataStoreNode → Inventory row types ───────────────────────

type RadarPlatformKind = "saas" | "iaas-unstructured" | "iaas-structured" | "onprem-structured" | "endpoint";

function getPlatformKind(platform: string): RadarPlatformKind {
  if (platform === "google-drive" || platform === "sharepoint") return "saas";
  if (platform === "aws-s3" || platform === "azure-blob") return "iaas-unstructured";
  if (platform === "aws-rds" || platform === "azure-sql") return "iaas-structured";
  if (platform === "postgresql" || platform === "oracle") return "onprem-structured";
  return "endpoint";
}

/** Deterministic seed from a string id */
function idSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function makeSaaSRow(store: DataStoreNode): SaaSUnstructuredDataRow {
  const seed = idSeed(store.id);
  const totalFiles = 4000 + (seed % 96000);
  const sampledFiles = Math.round(totalFiles * (0.55 + (seed % 40) / 100));
  const sensitiveFiles = Math.round(sampledFiles * (0.08 + (seed % 60) / 400));
  return {
    id: store.id,
    name: store.name,
    appInstance: store.platform === "google-drive" ? "acme-corp.google.com" : "acme.sharepoint.com",
    sensitiveFiles,
    sampledFiles,
    totalFiles,
    dataTypes: store.dataTypes,
    uploadSparkData:   generateSparkData(seed,       30, 1.5 * 1024 * 1024, 0.45),
    downloadSparkData: generateSparkData(seed + 100, 30, 2.2 * 1024 * 1024, 0.5),
  };
}

function makeIaaSUnstructuredRow(store: DataStoreNode): IaaSUnstructuredDataRow {
  const seed = idSeed(store.id);
  const totalFiles = 8000 + (seed % 192000);
  const sensitiveFiles = Math.round(totalFiles * (0.04 + (seed % 40) / 500));
  return {
    id: store.id,
    name: store.name,
    nameSubtitle: store.subtitle,
    instanceId: store.platform === "aws-s3" ? `arn:aws:s3:::${store.id}` : `${store.id}-container`,
    account: store.platform === "aws-s3" ? "acme-prod (123456789)" : "acme-prod (sub-0011)",
    org: store.platform === "aws-s3" ? "us-east-1" : "East US",
    sensitiveFiles,
    totalFiles,
    dataTypes: store.dataTypes,
    uploadSparkData:   generateSparkData(seed,       30, 3 * 1024 * 1024, 0.5),
    downloadSparkData: generateSparkData(seed + 200, 30, 5 * 1024 * 1024, 0.5),
  };
}

function makeOnPremStructuredRow(store: DataStoreNode): OnPremStructuredDataRow {
  const seed = idSeed(store.id);
  const totalFields = 200 + (seed % 1800);
  const sensitiveFields = Math.round(totalFields * (0.06 + (seed % 50) / 400));
  return {
    id: store.id,
    name: store.name,
    nameSubtitle: store.subtitle,
    sensitiveFields,
    totalFields,
    dataTypes: store.dataTypes,
    uploadSparkData:   generateSparkData(seed,       30, 512 * 1024, 0.4),
    downloadSparkData: generateSparkData(seed + 300, 30, 800 * 1024, 0.45),
  };
}

function makeIaaSStructuredRow(store: DataStoreNode): IaaSStructuredDataRow {
  const seed = idSeed(store.id);
  const totalFields = 300 + (seed % 2700);
  const sensitiveFields = Math.round(totalFields * (0.05 + (seed % 60) / 500));
  return {
    id: store.id,
    name: store.name,
    nameSubtitle: store.subtitle,
    instanceId: store.platform === "aws-rds" ? `db-${store.id.toUpperCase()}` : `${store.id}-sql`,
    account: store.platform === "aws-rds" ? "acme-prod (123456789)" : "acme-prod (sub-0011)",
    org: store.platform === "aws-rds" ? "us-east-1" : "East US",
    sensitiveFields,
    totalFields,
    dataTypes: store.dataTypes,
    uploadSparkData:   generateSparkData(seed,       30, 256 * 1024, 0.35),
    downloadSparkData: generateSparkData(seed + 400, 30, 400 * 1024, 0.4),
  };
}

// ── Color definitions ───────────────────────────────────────────────────────

const THEME = {
  dataType: "#e05252",
  dataStore: "#d4952a",
  identity: "#0ea584",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function positionOnRing(index: number, total: number, cx: number, cy: number, radius: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

// ── Clustering ──────────────────────────────────────────────────────────────

const CLUSTER_NODE_THRESHOLD = 15; // auto-cluster a ring when it has ≥ this many nodes

// Human-readable labels for each data store platform
const PLATFORM_LABELS: Record<string, string> = {
  "google-drive": "Google Drive",
  "sharepoint":   "SharePoint",
  "aws-s3":       "AWS S3",
  "azure-blob":   "Azure Blob",
  "postgresql":   "PostgreSQL",
  "oracle":       "Oracle",
  "aws-rds":      "AWS RDS",
  "azure-sql":    "Azure SQL",
  "endpoint":     "Endpoint",
};

// Human-readable labels for identity types
const IDENTITY_TYPE_LABELS: Record<string, string> = {
  "internal-user":       "Internal User",
  "external-user":       "External User",
  "unknown-identity":    "Unauthenticated",
  "unmapped-local-user": "Unmapped",
  "service-account":     "Service Account",
  "connected-app":       "Connected App",
};

interface ClusterGroup {
  clusterId: string;
  memberIds: string[];
  x: number;
  y: number;
  count: number;
  label: string;
}

/** Cluster data types by their category acronym (PII, SPII, PSI, …). */
function buildDataTypeClusters(
  items: { id: string }[],
  ringCx: number,
  ringCy: number,
  radius: number,
): { clusters: ClusterGroup[]; mapping: Map<string, string> } | null {
  if (items.length < CLUSTER_NODE_THRESHOLD) return null;

  const groups = new Map<string, string[]>();
  for (const item of items) {
    const cat = DATA_TYPE_CATEGORY[item.id] || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item.id);
  }

  const clusters: ClusterGroup[] = [];
  const mapping = new Map<string, string>();
  const groupEntries = Array.from(groups.entries());
  const total = groupEntries.length;

  groupEntries.forEach(([acronym, memberIds], i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / total;
    const x = ringCx + radius * Math.cos(angle);
    const y = ringCy + radius * Math.sin(angle);
    const clusterId = `cluster-dt-${acronym}`;
    clusters.push({ clusterId, memberIds, x, y, count: memberIds.length, label: acronym });
    for (const id of memberIds) mapping.set(id, clusterId);
  });

  return { clusters, mapping };
}

/** Cluster data stores by their platform (Google Drive, AWS S3, …). */
function buildStoreClusters(
  items: DataStoreNode[],
  ringCx: number,
  ringCy: number,
  radius: number,
): { clusters: ClusterGroup[]; mapping: Map<string, string> } | null {
  if (items.length < CLUSTER_NODE_THRESHOLD) return null;

  const groups = new Map<string, string[]>();
  for (const store of items) {
    if (!groups.has(store.platform)) groups.set(store.platform, []);
    groups.get(store.platform)!.push(store.id);
  }

  const clusters: ClusterGroup[] = [];
  const mapping = new Map<string, string>();
  const groupEntries = Array.from(groups.entries());
  const total = groupEntries.length;

  groupEntries.forEach(([platform, memberIds], i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / total;
    const x = ringCx + radius * Math.cos(angle);
    const y = ringCy + radius * Math.sin(angle);
    const clusterId = `cluster-ds-${platform}`;
    clusters.push({ clusterId, memberIds, x, y, count: memberIds.length, label: PLATFORM_LABELS[platform] || platform });
    for (const id of memberIds) mapping.set(id, clusterId);
  });

  return { clusters, mapping };
}

/** Cluster identities by their identity type (Internal User, Service Account, …). */
function buildIdentityClusters(
  items: IdentityNode[],
  ringCx: number,
  ringCy: number,
  radius: number,
): { clusters: ClusterGroup[]; mapping: Map<string, string> } | null {
  if (items.length < CLUSTER_NODE_THRESHOLD) return null;

  const groups = new Map<string, string[]>();
  for (const identity of items) {
    const t = identity.identityType;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(identity.id);
  }

  const clusters: ClusterGroup[] = [];
  const mapping = new Map<string, string>();
  const groupEntries = Array.from(groups.entries());
  const total = groupEntries.length;

  groupEntries.forEach(([type, memberIds], i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / total;
    const x = ringCx + radius * Math.cos(angle);
    const y = ringCy + radius * Math.sin(angle);
    const clusterId = `cluster-id-${type}`;
    clusters.push({ clusterId, memberIds, x, y, count: memberIds.length, label: IDENTITY_TYPE_LABELS[type] || type });
    for (const id of memberIds) mapping.set(id, clusterId);
  });

  return { clusters, mapping };
}

interface AggEdge {
  key: string;
  sourceId: string;
  targetId: string;
  x1: number; y1: number;
  x2: number; y2: number;
  weight: number;
  color: string;
}

/**
 * Generic aggregated-edge builder for cluster mode.
 * Draws edges from every innerItem to its mapped outerItems,
 * collapsing both endpoints to their cluster representative when present.
 */
function buildAggEdgesBetween(
  innerItems: { id: string; x: number; y: number }[],
  outerItems: { id: string; x: number; y: number }[],
  innerToOuter: Record<string, string[]>,
  innerClusters: { clusters: ClusterGroup[]; mapping: Map<string, string> } | null,
  outerClusters: { clusters: ClusterGroup[]; mapping: Map<string, string> } | null,
  color: string,
  clusterPosMap: Map<string, { x: number; y: number }>,
  keyPrefix: string,
): AggEdge[] {
  const outerPosMap = new Map(outerItems.map((p) => [p.id, p]));
  const edgeCounts = new Map<string, { sourceId: string; targetId: string; x1: number; y1: number; x2: number; y2: number; weight: number; color: string }>();

  for (const inner of innerItems) {
    let sourceKey = inner.id;
    let sourcePos: { x: number; y: number } = inner;
    if (innerClusters) {
      const cId = innerClusters.mapping.get(inner.id);
      if (cId) { sourceKey = cId; sourcePos = clusterPosMap.get(cId) || inner; }
    }
    for (const outerId of (innerToOuter[inner.id] || [])) {
      let targetKey = outerId;
      let targetPos: { x: number; y: number } | undefined = outerPosMap.get(outerId);
      if (outerClusters) {
        const cId = outerClusters.mapping.get(outerId);
        if (cId) { targetKey = cId; targetPos = clusterPosMap.get(cId); }
      }
      if (!targetPos) continue;
      const eKey = `${keyPrefix}:${sourceKey}→${targetKey}`;
      const ex = edgeCounts.get(eKey);
      if (ex) { ex.weight++; } else {
        edgeCounts.set(eKey, { sourceId: sourceKey, targetId: targetKey, x1: sourcePos.x, y1: sourcePos.y, x2: targetPos.x, y2: targetPos.y, weight: 1, color });
      }
    }
  }
  return Array.from(edgeCounts.entries()).map(([key, v]) => ({ key, ...v }));
}

// ── Data type → category mapping ────────────────────────────────────────────

const DATA_TYPE_CATEGORY: Record<string, string> = {};
const CATEGORY_ENTRIES: { acronym: string; types: string[] }[] = [
  { acronym: "PII", types: ["Personal Names", "Email Addresses", "Telephone Numbers", "Postal Addresses", "Birthdates", "Gender", "Age", "Nationality", "IP Addresses", "MAC Addresses", "Domain Names", "URI Hosts", "UUIDs", "Device IDs", "Browser Fingerprints", "Geolocation Data", "Vehicle IDs", "Student Records", "Education IDs"] },
  { acronym: "SPII", types: ["Social Security Numbers", "Driver Licenses", "National IDs", "Passports", "Taxpayer IDs", "Voter Registration IDs"] },
  { acronym: "PSI", types: ["Ethnicity and Race", "Marital Status", "Religious Beliefs", "Political Opinions", "Sexual Orientation", "Immigration Status"] },
  { acronym: "PCI", types: ["Payment Cards"] },
  { acronym: "PFI", types: ["Bank Account Information", "Financial IDs", "Currency", "Securities IDs", "Credit Scores", "Income Information", "Tax Records"] },
  { acronym: "PHI", types: ["Medical Records", "Medical Diagnoses", "Healthcare IDs", "Healthcare Provider IDs", "Health Insurance IDs", "Prescription Information", "Biometric Data", "Genetic Data"] },
  { acronym: "PAI", types: ["Passwords", "Private Keys", "Public Keys", "Secrets and Tokens", "Security Questions", "MFA Seeds"] },
  { acronym: "BII", types: ["Source Code", "Company Names", "Trade Secrets", "Legal Privileges"] },
];
for (const cat of CATEGORY_ENTRIES) {
  for (const t of cat.types) DATA_TYPE_CATEGORY[t] = cat.acronym;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

function getStoreHitCount(storeId: string, selectedTypes: string[], store: DataStoreNode): number {
  const matching = store.dataTypes.filter((dt) => selectedTypes.includes(dt));
  return (storeId.charCodeAt(storeId.length - 1) * 347 + matching.length * 891) % 4000 + 500;
}

// ── Node state type ────────────────────────────────────────────────────────��

// "focused" = intersected but not manually pinned: 100% opacity, no outer ring
type NodeState = "normal" | "hover" | "selected" | "focused" | "indirect" | "dimmed";

// ── SVG mini-icons ──────────────────────────────────────────────────────────

function ShieldIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - 7}, ${y - 8})`}>
      <path d="M7 1L1 4v4.5c0 4 2.5 6.5 6 7.5 3.5-1 6-3.5 6-7.5V4L7 1z"
        fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 8l2 2 3-3.5" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function DatabaseIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - 7}, ${y - 8})`}>
      <ellipse cx="7" cy="3.5" rx="5.5" ry="2.5" fill="none" stroke={color} strokeWidth="1.3" />
      <path d="M1.5 3.5v7c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-7" fill="none" stroke={color} strokeWidth="1.3" />
      <path d="M1.5 7c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" fill="none" stroke={color} strokeWidth="1.3" />
    </g>
  );
}

function UserIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - 7}, ${y - 7})`}>
      <circle cx="7" cy="5" r="3" fill="none" stroke={color} strokeWidth="1.3" />
      <path d="M1.5 14c0-2.5 2.5-4.5 5.5-4.5s5.5 2 5.5 4.5" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

function BotIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - 7}, ${y - 7})`}>
      <rect x="2" y="5" width="10" height="8" rx="2" fill="none" stroke={color} strokeWidth="1.3" />
      <circle cx="5.5" cy="9" r="1" fill={color} />
      <circle cx="8.5" cy="9" r="1" fill={color} />
      <line x1="7" y1="2" x2="7" y2="5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="1.5" r="1" fill={color} />
    </g>
  );
}

// ── CircleNode ──────────────────────────────────────────────────────────────

interface CircleNodeProps {
  x: number;
  y: number;
  color: string;
  outerR: number;
  innerR: number;
  label: string;
  sublabel?: string;
  badge?: string;
  icon: "shield" | "database" | "user" | "bot";
  state: NodeState;
  interactive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function CircleNode({
  x, y, color, outerR, innerR, label, sublabel, badge, icon,
  state, interactive, onMouseEnter, onMouseLeave, onClick,
}: CircleNodeProps) {
  const pulseId = `pulse-${label.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;

  const ringStrokeW = 1.8;
  const secondRingR = outerR + 8;

  // Opacity per state
  let nodeOpacity = 0.7;
  let labelOpacity = 0.75;
  let showSecondRing = false;
  let secondRingPulse = false;
  let secondRingStrokeW = 1;
  let fillTintOpacity = 0; // subtle color wash inside the circle

  switch (state) {
    case "normal":
      nodeOpacity = 0.7;
      labelOpacity = 0.7;
      break;
    case "hover":
      nodeOpacity = 1;
      labelOpacity = 1;
      showSecondRing = true;
      secondRingPulse = true;
      secondRingStrokeW = 1;
      fillTintOpacity = 0.15;
      break;
    case "selected":
      nodeOpacity = 1;
      labelOpacity = 1;
      showSecondRing = true;
      secondRingPulse = false;
      secondRingStrokeW = ringStrokeW;
      fillTintOpacity = 0.15;
      break;
    case "focused":
      nodeOpacity = 1;
      labelOpacity = 1;
      break;
    case "indirect":
      nodeOpacity = 0.85;
      labelOpacity = 0.85;
      fillTintOpacity = 0.1;
      break;
    case "dimmed":
      nodeOpacity = 0.12;
      labelOpacity = 0.15;
      break;
  }

  return (
    <g
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? "pointer" : (state === "dimmed" ? "default" : "pointer") }}
    >
      {/* Pulsing / solid second ring — only on hover or selected */}
      {showSecondRing && (
        <>
          <circle
            cx={x} cy={y} r={secondRingR}
            fill="none" stroke={color}
            strokeWidth={secondRingStrokeW}
            opacity={state === "selected" ? 1 : 0.6}
            style={secondRingPulse ? {
              animation: `${pulseId} 2s ease-in-out infinite`,
            } : { transition: "opacity 0.3s" }}
          />
          {secondRingPulse && (
            <style>{`
              @keyframes ${pulseId} {
                0%, 100% { opacity: 0.15; r: ${secondRingR}px; }
                50% { opacity: 0.55; r: ${secondRingR + 4}px; }
              }
            `}</style>
          )}
        </>
      )}

      {/* Single base circle — filled with background, stroked with node color */}
      <circle cx={x} cy={y} r={outerR}
        fill="var(--background)" stroke={color}
        strokeWidth={ringStrokeW}
        opacity={nodeOpacity}
        style={{ transition: "opacity 0.3s" }}
      />

      {/* Subtle color fill for "indirect" state */}
      {fillTintOpacity > 0 && (
        <circle cx={x} cy={y} r={outerR - ringStrokeW / 2}
          fill={color} opacity={fillTintOpacity}
          style={{ transition: "opacity 0.3s" }} />
      )}

      {/* Icon */}
      <g opacity={nodeOpacity} style={{ transition: "opacity 0.3s" }}>
        {icon === "shield" && <ShieldIcon x={x} y={y} color={color} />}
        {icon === "database" && <DatabaseIcon x={x} y={y} color={color} />}
        {icon === "user" && <UserIcon x={x} y={y} color={color} />}
        {icon === "bot" && <BotIcon x={x} y={y} color={color} />}
      </g>

      {/* Hit-count badge */}
      {badge && (
        <g opacity={Math.max(nodeOpacity, 0.3)} style={{ transition: "opacity 0.3s" }}>
          <rect x={x + outerR - 12} y={y - outerR - 6}
            width={badge.length * 6 + 8} height={14} rx={7} fill={color} />
          <text x={x + outerR - 12 + (badge.length * 6 + 8) / 2} y={y - outerR + 4}
            textAnchor="middle" fill="#fff"
            style={{ fontSize: "8px", fontWeight: 600, pointerEvents: "none" }}>
            {badge}
          </text>
        </g>
      )}

      {/* Label */}
      <text x={x} y={y + outerR + 14} textAnchor="middle"
        fill={color} opacity={labelOpacity}
        style={{ fontSize: "10px", fontWeight: 600, pointerEvents: "none", transition: "opacity 0.3s" }}>
        {truncate(label, 18)}
      </text>

      {/* Sublabel */}
      {sublabel && (
        <text x={x} y={y + outerR + 25} textAnchor="middle"
          fill={color} opacity={labelOpacity * 0.55}
          style={{ fontSize: "8px", fontWeight: 400, pointerEvents: "none", transition: "opacity 0.3s" }}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

// ── Cluster node ────────────────────────────────────────────────────────────

function ClusterNodeSVG({ x, y, color, outerR, count, label, state, onClick, onMouseEnter, onMouseLeave }: {
  x: number; y: number; color: string; outerR: number; count: number; label: string;
  state: NodeState; onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  let opacity = 0.7;
  let labelOpacity = 0.75;
  switch (state) {
    case "hover": opacity = 1; labelOpacity = 1; break;
    case "selected": opacity = 1; labelOpacity = 1; break;
    case "focused": opacity = 1; labelOpacity = 1; break;
    case "indirect": opacity = 0.85; labelOpacity = 0.85; break;
    case "dimmed": opacity = 0.12; labelOpacity = 0.15; break;
  }

  const r = outerR * 1.3;
  const s = 3; // stack offset
  const isSelected = state === "selected";

  return (
    <g style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Selected state: outer ring border */}
      {isSelected && (
        <circle cx={x} cy={y} r={r + 7} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35}
          strokeDasharray="none"
          style={{ transition: "opacity 0.3s" }} />
      )}
      {isSelected && (
        <circle cx={x} cy={y} r={r + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.6}
          style={{ transition: "opacity 0.3s" }} />
      )}
      {/* Stacked circle illusion */}
      <circle cx={x + s} cy={y + s} r={r} fill="none" stroke={color} strokeWidth={1} opacity={opacity * 0.2}
        style={{ transition: "opacity 0.3s" }} />
      <circle cx={x + s * 0.5} cy={y + s * 0.5} r={r} fill="none" stroke={color} strokeWidth={1} opacity={opacity * 0.35}
        style={{ transition: "opacity 0.3s" }} />
      {/* Main circle */}
      <circle cx={x} cy={y} r={r} fill="var(--background)" stroke={color} strokeWidth={2} opacity={opacity}
        style={{ transition: "opacity 0.3s" }} />
      <circle cx={x} cy={y} r={r - 1} fill={color} opacity={isSelected ? 0.12 : opacity * 0.08}
        style={{ transition: "opacity 0.3s" }} />
      {/* Count */}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} opacity={opacity}
        style={{ fontSize: "12px", fontWeight: 700, pointerEvents: "none", transition: "opacity 0.3s" }}>
        {count}
      </text>
      {/* Label */}
      <text x={x} y={y + r + 14} textAnchor="middle" fill={color} opacity={labelOpacity}
        style={{ fontSize: "10px", fontWeight: 600, pointerEvents: "none", transition: "opacity 0.3s" }}>
        {truncate(label, 18)}
      </text>
    </g>
  );
}

// ── Aggregated edge (for cluster mode) ──────────────────────────────────────

function AggregatedEdge({ x1, y1, x2, y2, cx: centerX, cy: centerY, weight: _weight, color, highlighted, background, suppressed }: {
  x1: number; y1: number; x2: number; y2: number; cx: number; cy: number;
  weight: number; color: string; highlighted?: boolean; background?: boolean; suppressed?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const controlX = centerX + (mx - centerX) * 0.75;
  const controlY = centerY + (my - centerY) * 0.75;
  const opacity = suppressed ? 0 : background ? 0.1 : highlighted ? 1.0 : 0.28;

  return (
    <path
      d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
      fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round"
      opacity={opacity} strokeDasharray="none"
      style={{ transition: "opacity 0.3s" }}
    />
  );
}

// ── Edge drawing ────────────────────────────────────────────────────────────

function CurvedEdge({ x1, y1, x2, y2, cx: centerX, cy: centerY, state, color }: {
  x1: number; y1: number; x2: number; y2: number; cx: number; cy: number;
  state: "active" | "indirect" | "normal" | "dimmed"; color?: string;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const controlX = centerX + (mx - centerX) * 0.75;
  const controlY = centerY + (my - centerY) * 0.75;

  let strokeColor: string;
  let opacity: number;
  let width: number;
  let dasharray: string;

  switch (state) {
    case "active":
      strokeColor = color || "var(--primary)";
      opacity = 0.7;
      width = 1.8;
      dasharray = "none";
      break;
    case "indirect":
      strokeColor = color || "var(--primary)";
      opacity = 0.35;
      width = 1.8;
      dasharray = "none";
      break;
    case "dimmed":
      strokeColor = "var(--border)";
      opacity = 0.06;
      width = 0.6;
      dasharray = "2 4";
      break;
    default: // normal
      strokeColor = "var(--border)";
      opacity = 0;
      width = 0.8;
      dasharray = "3 4";
      break;
  }

  return (
    <path
      d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
      fill="none" stroke={strokeColor} strokeWidth={width} strokeLinecap="round"
      opacity={opacity} strokeDasharray={dasharray}
      style={{ transition: "stroke 0.3s, opacity 0.3s, stroke-width 0.3s" }}
    />
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface AccessRadarDiagramProps {
  startFrom: "dataType" | "dataStore" | "identity";
  selectedItems: string[];
  onGraphFocusChange?: (focused: boolean) => void;
}

export function AccessRadarDiagram({ startFrom, selectedItems, onGraphFocusChange }: AccessRadarDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 700 });
  const [hoveredNode, setHoveredNode] = useState<{ type: "dataType" | "dataStore" | "identity"; id: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pinnedPath, setPinnedPath] = useState<string[]>([]);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  // Per-ring pinned cluster: at most one cluster pinned per ring independently
  const [pinnedClusterIds, setPinnedClusterIds] = useState<Map<string, string>>(new Map());
  // Global pin sequence: cluster IDs and node keys in the order they were pinned
  const [pinnedOrder, setPinnedOrder] = useState<string[]>([]);
  // Ring panel stacking order — rings appended when first pinned, removed when ring cleared
  const [ringPinOrder, setRingPinOrder] = useState<Array<"dataType" | "dataStore" | "identity">>([]);
  // Which ring panel is currently expanded in the sidebar
  const [activeRingPanel, setActiveRingPanel] = useState<"dataType" | "dataStore" | "identity" | null>(null);
  // Derived: first pinned cluster (for legacy single-cluster logic like BFS dimming)
  const pinnedClusterId = pinnedClusterIds.size > 0 ? pinnedClusterIds.values().next().value as string : null;

  // Notify parent when pin state crosses the 0 boundary
  useEffect(() => {
    onGraphFocusChange?.(pinnedPath.length > 0 || pinnedClusterIds.size > 0);
  }, [pinnedPath.length, pinnedClusterIds.size, onGraphFocusChange]);

  // Reset pinnedOrder and ringPinOrder when all pins are cleared
  useEffect(() => {
    if (pinnedPath.length === 0 && pinnedClusterIds.size === 0) {
      setPinnedOrder([]);
      setRingPinOrder([]);
    }
  }, [pinnedPath.length, pinnedClusterIds.size]);

  // Pan / drag state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 3.0;
  const ZOOM_STEP = 0.08;
  const ZOOM_BUTTON_STEP = 0.15;
  const autoOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escape key: unpin all
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinnedPath([]);
        setPinnedClusterIds(new Map());
        setActiveRingPanel(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Clear pins when the source selection changes (new items or new mode)
  useEffect(() => {
    setPinnedPath([]);
    setPinnedClusterIds(new Map());
    setPinnedOrder([]);
    setActiveRingPanel(null);
  }, [selectedItems, startFrom]);

  // Reset manual pan when pins change
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  }, [pinnedPath.length]);

  // Clear cluster hover on zoom changes
  useEffect(() => {
    setHoveredClusterId(null);
  }, [zoomLevel]);

  // Scroll-wheel zoom (cursor-centered)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!scrollZoomEnabled) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Mouse position relative to the container
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoomLevel((prevZoom) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prevZoom + delta * prevZoom));
        const scaleFactor = newZoom / prevZoom;

        // Adjust pan so the point under the cursor stays fixed
        setPanOffset((prevPan) => ({
          x: mouseX - scaleFactor * (mouseX - prevPan.x),
          y: mouseY - scaleFactor * (mouseY - prevPan.y),
        }));

        return newZoom;
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [scrollZoomEnabled]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only start drag on background clicks (not on nodes)
    if ((e.target as Element).closest("g[style*='cursor']")) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  }, [panOffset]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPanOffset({
        x: dragRef.current.startPanX + dx,
        y: dragRef.current.startPanY + dy,
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Compute active data types + relevant stores & identities based on startFrom mode
  const { activeDataTypes, relevantStores, relevantIdentities, dtToStores, storesToIdentities, storeToDTs, idToStores } = useMemo(() => {
    let activeDataTypes: string[];
    let relevantStores: DataStoreNode[];
    let relevantIdentities: IdentityNode[];

    if (startFrom === "dataType") {
      // User picked data types → derive stores → derive identities
      const selectedSet = new Set(selectedItems);
      activeDataTypes = selectedItems;
      relevantStores = DATA_STORES.filter((ds) => ds.dataTypes.some((dt) => selectedSet.has(dt)));
      const storeIds = new Set(relevantStores.map((s) => s.id));
      relevantIdentities = IDENTITIES.filter((id) => id.dataStores.some((dsId) => storeIds.has(dsId)));
    } else if (startFrom === "dataStore") {
      // User picked stores → derive data types (all in those stores) → derive identities
      const selectedStoreIds = new Set(selectedItems);
      relevantStores = DATA_STORES.filter((s) => selectedStoreIds.has(s.id));
      const dtSet = new Set(relevantStores.flatMap((s) => s.dataTypes));
      activeDataTypes = Array.from(dtSet).sort();
      const storeIds = new Set(relevantStores.map((s) => s.id));
      relevantIdentities = IDENTITIES.filter((id) => id.dataStores.some((dsId) => storeIds.has(dsId)));
    } else {
      // User picked identities → derive stores → derive data types
      const selectedIdentityIds = new Set(selectedItems);
      relevantIdentities = IDENTITIES.filter((i) => selectedIdentityIds.has(i.id));
      const storeIds = new Set(relevantIdentities.flatMap((i) => i.dataStores));
      relevantStores = DATA_STORES.filter((s) => storeIds.has(s.id));
      const dtSet = new Set(relevantStores.flatMap((s) => s.dataTypes));
      activeDataTypes = Array.from(dtSet).sort();
    }

    // DT → [store IDs that contain it]
    const dtToStores: Record<string, string[]> = {};
    for (const dt of activeDataTypes) {
      dtToStores[dt] = relevantStores.filter((s) => s.dataTypes.includes(dt)).map((s) => s.id);
    }
    // Store → [identity IDs that have access]
    const storesToIdentities: Record<string, string[]> = {};
    for (const s of relevantStores) {
      storesToIdentities[s.id] = relevantIdentities.filter((id) => id.dataStores.includes(s.id)).map((id) => id.id);
    }

    // In dataType mode: every store must have ≥2 identities (users must exist to access data).
    // Patch any gaps by borrowing from the full IDENTITIES list deterministically.
    if (startFrom === "dataType") {
      const MIN_IDENTITIES_PER_STORE = 2;
      const extraIdentityIds = new Set<string>();
      for (const s of relevantStores) {
        const needed = MIN_IDENTITIES_PER_STORE - storesToIdentities[s.id].length;
        if (needed > 0) {
          // Pick fallback identities not already assigned, seeded by store id
          const seed = idSeed(s.id);
          const pool = IDENTITIES.filter((i) => !storesToIdentities[s.id].includes(i.id));
          let picked = 0;
          for (let k = 0; picked < needed; k++) {
            const candidate = pool[(seed + k * 7) % pool.length];
            if (!storesToIdentities[s.id].includes(candidate.id)) {
              storesToIdentities[s.id] = [...storesToIdentities[s.id], candidate.id];
              extraIdentityIds.add(candidate.id);
              picked++;
            }
          }
        }
      }
      // Merge any newly introduced identities into relevantIdentities
      if (extraIdentityIds.size > 0) {
        const existing = new Set(relevantIdentities.map((i) => i.id));
        for (const id of extraIdentityIds) {
          if (!existing.has(id)) {
            const identity = IDENTITIES.find((i) => i.id === id);
            if (identity) relevantIdentities = [...relevantIdentities, identity];
          }
        }
      }
    }

    // Store → [DT names found in that store] (reverse of dtToStores)
    const storeToDTs: Record<string, string[]> = {};
    for (const store of relevantStores) {
      storeToDTs[store.id] = activeDataTypes.filter((dt) => store.dataTypes.includes(dt));
    }
    // Identity → [store IDs it has access to, intersected with relevantStores]
    const idToStores: Record<string, string[]> = {};
    for (const identity of relevantIdentities) {
      // Include both registry-declared stores and any patched assignments
      const patchedStores = relevantStores
        .filter((s) => storesToIdentities[s.id]?.includes(identity.id))
        .map((s) => s.id);
      idToStores[identity.id] = Array.from(new Set([
        ...identity.dataStores.filter((sId) => relevantStores.some((s) => s.id === sId)),
        ...patchedStores,
      ]));
    }
    return { activeDataTypes, relevantStores, relevantIdentities, dtToStores, storesToIdentities, storeToDTs, idToStores };
  }, [startFrom, selectedItems]);

  // Compute the "reachable set" from a single node key
  const getReachable = useCallback((nodeKey: string) => {
    const [type, ...rest] = nodeKey.split(":");
    const id = rest.join(":");
    const reachable = new Set<string>();
    reachable.add(nodeKey);

    if (type === "dt") {
      for (const sId of (dtToStores[id] || [])) {
        reachable.add(`ds:${sId}`);
        for (const iId of (storesToIdentities[sId] || [])) {
          reachable.add(`id:${iId}`);
        }
      }
    } else if (type === "ds") {
      for (const dt of activeDataTypes) {
        if ((dtToStores[dt] || []).includes(id)) {
          reachable.add(`dt:${dt}`);
        }
      }
      for (const iId of (storesToIdentities[id] || [])) {
        reachable.add(`id:${iId}`);
      }
    } else if (type === "id") {
      for (const sId of (idToStores[id] || [])) {
        reachable.add(`ds:${sId}`);
        for (const dt of activeDataTypes) {
          if ((dtToStores[dt] || []).includes(sId)) {
            reachable.add(`dt:${dt}`);
          }
        }
      }
    }
    return reachable;
  }, [dtToStores, storesToIdentities, idToStores, activeDataTypes, relevantStores, relevantIdentities]);

  // Compute active set:
  //   - union within the same ring (multiple pins on same ring expand the view)
  //   - intersection across rings (pins on different rings narrow to their overlap)
  const { activeSet, pinnedSet } = useMemo(() => {
    const pSet = new Set(pinnedPath);
    if (pinnedPath.length === 0) {
      return { activeSet: null, pinnedSet: pSet }; // null = everything visible
    }

    // Group pins by ring prefix ("dt", "ds", "id")
    const byRing: Record<string, string[]> = {};
    for (const pin of pinnedPath) {
      const prefix = pin.split(":")[0];
      if (!byRing[prefix]) byRing[prefix] = [];
      byRing[prefix].push(pin);
    }

    // Per-ring union of reachable sets
    const ringReachableSets = Object.values(byRing).map((pins) => {
      const s = new Set<string>();
      for (const pin of pins) for (const key of getReachable(pin)) s.add(key);
      return s;
    });

    // Intersect across rings (single ring = just that set)
    const [first, ...rest] = ringReachableSets;
    const intersection = rest.length === 0
      ? first
      : new Set<string>([...first].filter((k) => rest.every((s) => s.has(k))));

    // Always keep the pinned nodes themselves visible
    for (const pin of pinnedPath) intersection.add(pin);

    return { activeSet: intersection, pinnedSet: pSet };
  }, [pinnedPath, getReachable]);

  // Build active edges based on activeSet
  const activeEdges = useMemo(() => {
    const edges = new Set<string>();
    if (!activeSet) return edges; // no pins = no active edges (normal state)
    // An edge is active if both endpoints are in the activeSet
    for (const dt of activeDataTypes) {
      const dtKey = `dt:${dt}`;
      if (!activeSet.has(dtKey)) continue;
      for (const sId of (dtToStores[dt] || [])) {
        const dsKey = `ds:${sId}`;
        if (activeSet.has(dsKey)) {
          edges.add(`dt:${dt}|ds:${sId}`);
        }
      }
    }
    for (const store of relevantStores) {
      const dsKey = `ds:${store.id}`;
      if (!activeSet.has(dsKey)) continue;
      for (const iId of (storesToIdentities[store.id] || [])) {
        const idKey = `id:${iId}`;
        if (activeSet.has(idKey)) {
          edges.add(`ds:${store.id}|id:${iId}`);
        }
      }
    }
    return edges;
  }, [activeSet, activeDataTypes, dtToStores, storesToIdentities, relevantStores]);

  // Edges that every pinned node can individually reach — shown at 100% opacity.
  // Union-only edges (reachable from some pins but not all) stay at indirect opacity.
  const intersectionActiveEdges = useMemo(() => {
    if (pinnedPath.length === 0) return new Set<string>();

    const reachableEdgesForPin = (nodeKey: string): Set<string> => {
      const [type, ...rest] = nodeKey.split(":");
      const id = rest.join(":");
      const edges = new Set<string>();
      if (type === "dt") {
        for (const sId of (dtToStores[id] || [])) {
          edges.add(`dt:${id}|ds:${sId}`);
          for (const iId of (storesToIdentities[sId] || [])) {
            edges.add(`ds:${sId}|id:${iId}`);
          }
        }
      } else if (type === "ds") {
        for (const dt of activeDataTypes) {
          if ((dtToStores[dt] || []).includes(id)) edges.add(`dt:${dt}|ds:${id}`);
        }
        for (const iId of (storesToIdentities[id] || [])) {
          edges.add(`ds:${id}|id:${iId}`);
        }
      } else if (type === "id") {
        for (const sId of (idToStores[id] || [])) {
          edges.add(`ds:${sId}|id:${id}`);
          for (const dt of activeDataTypes) {
            if ((dtToStores[dt] || []).includes(sId)) edges.add(`dt:${dt}|ds:${sId}`);
          }
        }
      }
      return edges;
    };

    const perPin = pinnedPath.map(reachableEdgesForPin);
    const [first, ...rest] = perPin;
    if (rest.length === 0) return first;
    return new Set([...first].filter((e) => rest.every((s) => s.has(e))));
  }, [pinnedPath, activeDataTypes, dtToStores, storesToIdentities, idToStores]);

  // Build hover highlight sets (only when no pins, or within the active set)
  const {
    hoverActiveEdges, hoverIndirectEdges,
    hoverDirectKeys, hoverIndirectKeys,
  } = useMemo(() => {
    const aEdges = new Set<string>();
    const iEdges = new Set<string>();
    const directKeys = new Set<string>();
    const indirectKeys = new Set<string>();

    if (!hoveredNode) return { hoverActiveEdges: aEdges, hoverIndirectEdges: iEdges, hoverDirectKeys: directKeys, hoverIndirectKeys: indirectKeys };

    const nodeKey = hoveredNode.type === "dataType" ? `dt:${hoveredNode.id}` :
                    hoveredNode.type === "dataStore" ? `ds:${hoveredNode.id}` : `id:${hoveredNode.id}`;

    // If there are pins and the hovered node isn't in the active set, don't highlight
    if (activeSet && !activeSet.has(nodeKey)) {
      return { hoverActiveEdges: aEdges, hoverIndirectEdges: iEdges, hoverDirectKeys: directKeys, hoverIndirectKeys: indirectKeys };
    }

    directKeys.add(nodeKey);

    if (hoveredNode.type === "dataType") {
      for (const sId of (dtToStores[hoveredNode.id] || [])) {
        const k = `ds:${sId}`;
        if (!activeSet || activeSet.has(k)) {
          indirectKeys.add(k);
          aEdges.add(`dt:${hoveredNode.id}|ds:${sId}`);
          // Use idToStores (actual connections) to find identities for this store
          for (const [iId, stores] of Object.entries(idToStores)) {
            if (stores.includes(sId)) {
              const k2 = `id:${iId}`;
              if (!activeSet || activeSet.has(k2)) {
                indirectKeys.add(k2);
                iEdges.add(`ds:${sId}|id:${iId}`);
              }
            }
          }
        }
      }
    } else if (hoveredNode.type === "dataStore") {
      for (const dt of activeDataTypes) {
        if ((dtToStores[dt] || []).includes(hoveredNode.id)) {
          const k = `dt:${dt}`;
          if (!activeSet || activeSet.has(k)) {
            indirectKeys.add(k);
            aEdges.add(`dt:${dt}|ds:${hoveredNode.id}`);
          }
        }
      }
      // Use idToStores (actual connections) instead of storesToIdentities (includes patches)
      for (const [iId, stores] of Object.entries(idToStores)) {
        if (stores.includes(hoveredNode.id)) {
          const k = `id:${iId}`;
          if (!activeSet || activeSet.has(k)) {
            indirectKeys.add(k);
            aEdges.add(`ds:${hoveredNode.id}|id:${iId}`);
          }
        }
      }
    } else if (hoveredNode.type === "identity") {
      const identity = relevantIdentities.find((i) => i.id === hoveredNode.id);
      if (identity) {
        for (const sId of (idToStores[identity.id] || [])) {
          const k = `ds:${sId}`;
          if (relevantStores.some((s) => s.id === sId) && (!activeSet || activeSet.has(k))) {
            indirectKeys.add(k);
            aEdges.add(`ds:${sId}|id:${hoveredNode.id}`);
            for (const dt of activeDataTypes) {
              if ((dtToStores[dt] || []).includes(sId)) {
                const k2 = `dt:${dt}`;
                if (!activeSet || activeSet.has(k2)) {
                  indirectKeys.add(k2);
                  iEdges.add(`dt:${dt}|ds:${sId}`);
                }
              }
            }
          }
        }
      }
    }

    return { hoverActiveEdges: aEdges, hoverIndirectEdges: iEdges, hoverDirectKeys: directKeys, hoverIndirectKeys: indirectKeys };
  }, [hoveredNode, activeSet, activeDataTypes, dtToStores, storesToIdentities, idToStores, relevantStores, relevantIdentities]);

  const hasPins = pinnedPath.length > 0;
  const hasHover = hoveredNode !== null;
  const hasFocus = hasPins || hasHover;

  // True when pinned nodes span more than one ring — cross-ring filter mode.
  // In this mode no node should appear fully "selected"; everything stays "indirect".
  const isCrossRingPinMode = useMemo(() => {
    if (pinnedClusterIds.size > 1) return true;
    // Mixed mode: cluster pin(s) + individual pin(s) on a different ring
    if (pinnedClusterIds.size > 0 && pinnedPath.length > 0) {
      const clusterRings = new Set(pinnedClusterIds.keys());
      const individualRings = new Set(pinnedPath.map((k) => {
        const p = k.split(":")[0];
        return p === "dt" ? "dataType" : p === "ds" ? "dataStore" : "identity";
      }));
      if ([...individualRings].some((r) => !clusterRings.has(r))) return true;
    }
    if (pinnedPath.length < 2) return false;
    const prefixes = new Set(pinnedPath.map((k) => k.split(":")[0]));
    return prefixes.size > 1;
  }, [pinnedPath, pinnedClusterIds]);

  // Click handler
  const handleNodeClick = useCallback((nodeKey: string) => {
    const prefix = nodeKey.split(":")[0];
    const ring = prefix === "dt" ? "dataType" : prefix === "ds" ? "dataStore" : "identity";
    const isUnpin = pinnedPath.includes(nodeKey);
    setPinnedPath((prev) => {
      const idx = prev.indexOf(nodeKey);
      if (idx >= 0) return prev.filter((k) => k !== nodeKey);
      return [...prev, nodeKey];
    });
    setPinnedOrder((prev) => {
      if (prev.includes(nodeKey)) return prev; // keep stable on unpin
      return [...prev, nodeKey];
    });
    setRingPinOrder((prev) => {
      if (!isUnpin) {
        // Pinning: add ring if not already tracked (first pin of this ring)
        if (prev.includes(ring)) return prev;
        return [...prev, ring];
      } else {
        // Unpinning: remove ring only if this was the last individual pin and no cluster pin for this ring
        const remainingInRing = pinnedPath.filter((k) => k !== nodeKey && k.startsWith(prefix + ":"));
        const hasClusterForRing = pinnedClusterIds.has(ring);
        if (remainingInRing.length === 0 && !hasClusterForRing) {
          return prev.filter((r) => r !== ring);
        }
        return prev;
      }
    });
    setActiveRingPanel(ring);
  }, [pinnedPath, pinnedClusterIds]);

  // Helper: which cluster does a node belong to?
  function nodeClusterId(nodeType: "dataType" | "dataStore" | "identity", nodeId: string): string | null {
    if (nodeType === "dataType") return dtClustering?.mapping.get(nodeId) ?? null;
    if (nodeType === "dataStore") return storeClustering?.mapping.get(nodeId) ?? null;
    return identityClustering?.mapping.get(nodeId) ?? null;
  }

  // Derive a node's visual state
  function getNodeState(nodeKey: string, nodeType: "dataType" | "dataStore" | "identity", nodeId: string): NodeState {
    const isPinned = pinnedSet.has(nodeKey);
    const isHovered = hoveredNode?.type === nodeType && hoveredNode?.id === nodeId;
    const isInActiveSet = !activeSet || activeSet.has(nodeKey);
    const isHoverDirect = hoverDirectKeys.has(nodeKey);
    const isHoverIndirect = hoverIndirectKeys.has(nodeKey);

    // Cluster-pin mode: dim any individual node whose cluster (or raw ID) is not connected.
    // When clusters span multiple rings, use intersection (not union) so only nodes reachable
    // from ALL pinned clusters remain visible on the unpinned rings.
    if (hasClusterPin) {
      // Individual nodes on the same ring as a pinned cluster are always dimmed (unless pinned themselves).
      const nPrefix = nodeKey.split(":")[0];
      const nRing = nPrefix === "dt" ? "dataType" : nPrefix === "ds" ? "dataStore" : "identity";
      if (pinnedClusterIds.has(nRing) && !isPinned) return "dimmed";
      const cId = nodeClusterId(nodeType, nodeId);
      const connectedSet = isCrossRingPinMode ? pinnedClusterIntersectionConnectedIds : pinnedClusterConnectedIds;
      const isConnected = (cId && connectedSet.has(cId)) || connectedSet.has(nodeId);
      if (!isConnected) return "dimmed";
      // If individual pins are also active, further restrict to their intersection.
      if (activeSet && !activeSet.has(nodeKey)) return "dimmed";
      // Same-ring non-pinned individual nodes are always dimmed.
      if (hasPins) {
        const isSameRingAsAnyPin = pinnedPath.some((k) => k.split(":")[0] === nPrefix);
        if (isSameRingAsAnyPin && !isPinned) return "dimmed";
      }
      if (isHovered) return "hover";
      if (isPinned) return "selected";
      return "focused";
    }

    // Map node prefix ("dt","ds","id") to ring name for cluster-pin lookup
    const nodePrefix = nodeKey.split(":")[0];
    const nodeRing = nodePrefix === "dt" ? "dataType" : nodePrefix === "ds" ? "dataStore" : "identity";
    const isSameRingAsClusterPin = pinnedClusterIds.has(nodeRing);
    const isSameRingAsIndividualPin = pinnedPath.some((k) => k.split(":")[0] === nodePrefix);
    const isSameRingAsAnyPinOrCluster = isSameRingAsClusterPin || isSameRingAsIndividualPin;

    if (isHovered && (!hasPins || isInActiveSet)) {
      if (!isSameRingAsAnyPinOrCluster) return "hover";
    }

    if (isPinned) return "selected";

    if (hasPins) {
      if (!isInActiveSet) return "dimmed";
      // Same-ring non-pinned nodes are always dimmed.
      if (isSameRingAsIndividualPin && !isPinned) return "dimmed";
      // While hovering, dim nodes not directly connected to the hovered node.
      if (hasHover && !hoverIndirectKeys.has(nodeKey)) return "dimmed";
      return "focused";
    }

    // Cluster hover mode — dim individual nodes not connected to the hovered cluster
    if (hoveredClusterId) {
      const cId = nodeClusterId(nodeType, nodeId);
      const isConnected = (cId && clusterConnectedIds.has(cId)) || clusterConnectedIds.has(nodeId);
      if (!isConnected) return "dimmed";
      return "indirect";
    }

    // No pins — pure hover mode
    if (!hasHover) return "normal";
    if (isHoverDirect) return "selected";
    if (isHoverIndirect) return "indirect";
    return "dimmed";
  }

  // Returns true if either endpoint of a non-clustered edge should suppress the line.
  // Only "dimmed" endpoints hide the line, regardless of pin state.
  function isEdgeEndpointNotFull(edgeKey: string, _anyPin: boolean): boolean {
    const bar = edgeKey.indexOf("|");
    if (bar < 0) return false;
    const srcKey = edgeKey.slice(0, bar);
    const dstKey = edgeKey.slice(bar + 1);
    const notFull = (nk: string) => {
      const colon = nk.indexOf(":");
      const prefix = nk.slice(0, colon);
      const id = nk.slice(colon + 1);
      const type = prefix === "dt" ? "dataType" : prefix === "ds" ? "dataStore" : "identity";
      return getNodeState(nk, type, id) === "dimmed";
    };
    return notFull(srcKey) || notFull(dstKey);
  }

  // Returns true if a clustered-edge endpoint should suppress the line.
  // Only "dimmed" endpoints hide the line, regardless of pin state.
  function isAggEndpointNotFull(rawId: string, _anyPin: boolean): boolean {
    const s = clusterLookup.has(rawId)
      ? getClusterState(rawId)
      : activeDataTypes.includes(rawId)
        ? getNodeState(`dt:${rawId}`, "dataType", rawId)
        : relevantStores.some((r) => r.id === rawId)
          ? getNodeState(`ds:${rawId}`, "dataStore", rawId)
          : getNodeState(`id:${rawId}`, "identity", rawId);
    return s === "dimmed";
  }

  function getEdgeState(edgeKey: string): "active" | "indirect" | "normal" | "dimmed" {
    if (hasClusterPin && !hasPins) {
      if (!pinnedClusterIntersectionEdgeKeys.has(edgeKey)) return "normal";
      if (isEdgeEndpointNotFull(edgeKey, true)) return "normal";
      return "active";
    }
    if (hasPins) {
      if (!intersectionActiveEdges.has(edgeKey)) return "normal";
      if (isEdgeEndpointNotFull(edgeKey, true)) return "normal";
      return "active";
    }
    if (hasClusterPin) {
      return "normal";
    }
    // No pins — pure hover mode. Hide edges touching dimmed endpoints.
    if (isEdgeEndpointNotFull(edgeKey, false)) return "normal";
    if (hoverActiveEdges.has(edgeKey)) return "active";
    if (hoverIndirectEdges.has(edgeKey)) return "indirect";
    if (!hasHover) return "normal";
    return "dimmed";
  }

  // Can this node be clicked (pinned)?
  function isClickable(nodeKey: string): boolean {
    const [prefix, ...rest] = nodeKey.split(":");
    const id = rest.join(":");
    const nodeType = prefix === "dt" ? "dataType" : prefix === "ds" ? "dataStore" : "identity";
    return getNodeState(nodeKey, nodeType, id) !== "dimmed";
  }

  function isClusterClickable(clusterId: string): boolean {
    return getClusterState(clusterId) !== "dimmed";
  }

  // Layout
  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const minDim = Math.min(dimensions.width, dimensions.height);
  const r1 = minDim * 0.13;
  const r2 = minDim * 0.30;
  const r3 = minDim * 0.44;

  // ── Ring-to-node-type mapping based on startFrom ──────────────────────────
  // Each mode assigns a different node type to each concentric ring:
  //   dataType  : r1=DT(red),    r2=DS(yellow), r3=ID(green)
  //   dataStore : r1=DS(yellow), r2=DT(red),    r3=ID(green)
  //   identity  : r1=ID(green),  r2=DS(yellow), r3=DT(red)
  const ringSeq =
    startFrom === "dataType"  ? ["dataType",  "dataStore", "identity"] as const :
    startFrom === "dataStore" ? ["dataStore", "dataType",  "identity"] as const :
                                ["identity",  "dataStore", "dataType"] as const;

  const ringGuideColors = [THEME[ringSeq[0]], THEME[ringSeq[1]], THEME[ringSeq[2]]];
  const ringGuideLabels = ringSeq.map((t) =>
    t === "dataType" ? "Data Types" : t === "dataStore" ? "Data Stores" : "Identities"
  );

  // Which physical ring radius does each node type occupy?
  const dtRingRadius = startFrom === "dataType"  ? r1 : startFrom === "dataStore" ? r2 : r3;
  const dsRingRadius = startFrom === "dataType"  ? r2 : startFrom === "dataStore" ? r1 : r2;
  const idRingRadius = startFrom === "dataType"  ? r3 : startFrom === "dataStore" ? r3 : r1;

  const dtOuter = Math.max(15, minDim * 0.028);
  const dtInner = dtOuter * 0.6;
  const dsOuter = dtOuter;
  const dsInner = dtInner;
  const idOuter = dtOuter;
  const idInner = dtInner;

  const dtPositions = activeDataTypes.map((dt, i) => ({
    id: dt, ...positionOnRing(i, activeDataTypes.length, cx, cy, dtRingRadius),
  }));
  const storePositions = relevantStores.map((s, i) => ({
    ...s, ...positionOnRing(i, relevantStores.length, cx, cy, dsRingRadius),
  }));
  const identityPositions = relevantIdentities.map((id, i) => ({
    ...id, ...positionOnRing(i, relevantIdentities.length, cx, cy, idRingRadius),
  }));

  // ── Clustering computation ──────────────────────────────────────────────
  // Each ring auto-clusters when it has ≥ CLUSTER_NODE_THRESHOLD nodes,
  // grouped semantically: data types by category, stores by platform, identities by type.

  const dtClustering = useMemo(() =>
    buildDataTypeClusters(activeDataTypes.map((dt) => ({ id: dt })), cx, cy, dtRingRadius),
    [activeDataTypes, cx, cy, dtRingRadius],
  );
  const storeClustering = useMemo(() =>
    buildStoreClusters(relevantStores, cx, cy, dsRingRadius),
    [relevantStores, cx, cy, dsRingRadius],
  );
  const identityClustering = useMemo(() =>
    buildIdentityClusters(relevantIdentities, cx, cy, idRingRadius),
    [relevantIdentities, cx, cy, idRingRadius],
  );

  const isClustered = dtClustering !== null || storeClustering !== null || identityClustering !== null;

  const aggregatedEdges = useMemo(() => {
    if (!isClustered) return [];

    // Build shared cluster position lookup
    const clusterPosMap = new Map<string, { x: number; y: number }>();
    if (dtClustering)       for (const c of dtClustering.clusters)       clusterPosMap.set(c.clusterId, c);
    if (storeClustering)    for (const c of storeClustering.clusters)    clusterPosMap.set(c.clusterId, c);
    if (identityClustering) for (const c of identityClustering.clusters) clusterPosMap.set(c.clusterId, c);

    const dtPosList = dtPositions.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const dsPosList = storePositions.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const idPosList = identityPositions.map((p) => ({ id: p.id, x: p.x, y: p.y }));

    // Always use idToStores (real declared connections) for the identity↔store direction
    // so that cluster hover counts reflect actual access, not patched fallbacks.
    if (startFrom === "dataType") {
      return [
        ...buildAggEdgesBetween(dtPosList, dsPosList, dtToStores, dtClustering, storeClustering, THEME.dataType,  clusterPosMap, "dt-ds"),
        ...buildAggEdgesBetween(idPosList, dsPosList, idToStores,  identityClustering, storeClustering, THEME.dataStore, clusterPosMap, "ds-id"),
      ];
    } else if (startFrom === "dataStore") {
      return [
        ...buildAggEdgesBetween(dsPosList, dtPosList, storeToDTs,  storeClustering, dtClustering, THEME.dataStore, clusterPosMap, "ds-dt"),
        ...buildAggEdgesBetween(idPosList, dsPosList, idToStores,  identityClustering, storeClustering, THEME.dataStore, clusterPosMap, "ds-id"),
      ];
    } else {
      return [
        ...buildAggEdgesBetween(idPosList, dsPosList, idToStores,  identityClustering, storeClustering, THEME.identity,  clusterPosMap, "id-ds"),
        ...buildAggEdgesBetween(dsPosList, dtPosList, storeToDTs,  storeClustering,    dtClustering,    THEME.dataStore, clusterPosMap, "ds-dt"),
      ];
    }
  }, [isClustered, startFrom, dtToStores, storesToIdentities, storeToDTs, idToStores,
      dtPositions, storePositions, identityPositions, dtClustering, storeClustering, identityClustering]);

  // When individual pins are active in clustered view, compute which aggregated edge keys
  // survive the intersection. An aggregated edge passes if both its endpoints (sourceId,
  // ── Cluster hover: edges & connected clusters ──────────────────────────────
  const { clusterHoverEdges, clusterConnectedIds } = useMemo(() => {
    if (!hoveredClusterId || !isClustered) {
      return { clusterHoverEdges: [] as AggEdge[], clusterConnectedIds: new Set<string>() };
    }
    const hoveredRingSet = new Set<string>();
    if (dtClustering?.clusters.some((c) => c.clusterId === hoveredClusterId)) {
      for (const c of dtClustering.clusters) hoveredRingSet.add(c.clusterId);
    } else if (storeClustering?.clusters.some((c) => c.clusterId === hoveredClusterId)) {
      for (const c of storeClustering.clusters) hoveredRingSet.add(c.clusterId);
    } else if (identityClustering?.clusters.some((c) => c.clusterId === hoveredClusterId)) {
      for (const c of identityClustering.clusters) hoveredRingSet.add(c.clusterId);
    }
    const hop1Edges = aggregatedEdges.filter(
      (e) => e.sourceId === hoveredClusterId || e.targetId === hoveredClusterId,
    );
    const connected = new Set<string>();
    connected.add(hoveredClusterId);
    for (const e of hop1Edges) { connected.add(e.sourceId); connected.add(e.targetId); }
    const hop1Ids = new Set(connected);
    const hop2Edges = aggregatedEdges.filter((e) => {
      if (hop1Edges.includes(e)) return false;
      if (connected.has(e.sourceId) && connected.has(e.targetId)) return true;
      const srcInHop1 = hop1Ids.has(e.sourceId) && e.sourceId !== hoveredClusterId;
      const dstInHop1 = hop1Ids.has(e.targetId) && e.targetId !== hoveredClusterId;
      if (srcInHop1 && !connected.has(e.targetId) && !hoveredRingSet.has(e.targetId)) return true;
      if (dstInHop1 && !connected.has(e.sourceId) && !hoveredRingSet.has(e.sourceId)) return true;
      return false;
    });
    for (const e of hop2Edges) { connected.add(e.sourceId); connected.add(e.targetId); }
    return { clusterHoverEdges: [...hop1Edges, ...hop2Edges], clusterConnectedIds: connected };
  }, [hoveredClusterId, isClustered, aggregatedEdges, dtClustering, storeClustering, identityClustering]);

  // ── Cluster lookup: clusterId → { cluster, ring } ──────────────────────
  const clusterLookup = useMemo(() => {
    const map = new Map<string, { cluster: ClusterGroup; ring: "dataType" | "dataStore" | "identity" }>();
    if (dtClustering) for (const c of dtClustering.clusters) map.set(c.clusterId, { cluster: c, ring: "dataType" });
    if (storeClustering) for (const c of storeClustering.clusters) map.set(c.clusterId, { cluster: c, ring: "dataStore" });
    if (identityClustering) for (const c of identityClustering.clusters) map.set(c.clusterId, { cluster: c, ring: "identity" });
    return map;
  }, [dtClustering, storeClustering, identityClustering]);

  // ── Pinned clusters: edges & connected clusters (union across all pinned clusters) ──
  const { pinnedClusterEdges, pinnedClusterEdgeKeys, pinnedClusterIntersectionEdgeKeys, pinnedClusterConnectedIds, pinnedClusterIntersectionConnectedIds } = useMemo(() => {
    if (pinnedClusterIds.size === 0 || !isClustered) {
      return { pinnedClusterEdges: [] as AggEdge[], pinnedClusterEdgeKeys: new Set<string>(), pinnedClusterIntersectionEdgeKeys: new Set<string>(), pinnedClusterConnectedIds: new Set<string>(), pinnedClusterIntersectionConnectedIds: new Set<string>() };
    }

    const allEdges: AggEdge[] = [];
    const allEdgeKeys = new Set<string>();
    const allConnected = new Set<string>();
    // Per-cluster edge key sets and connected ID sets, used to compute intersections below
    const perClusterEdgeKeys: Set<string>[] = [];
    const perClusterConnectedIds: Set<string>[] = [];

    for (const cId of pinnedClusterIds.values()) {
      const pinnedRingSet = new Set<string>();
      if (dtClustering?.clusters.some((c) => c.clusterId === cId)) {
        for (const c of dtClustering.clusters) pinnedRingSet.add(c.clusterId);
      } else if (storeClustering?.clusters.some((c) => c.clusterId === cId)) {
        for (const c of storeClustering.clusters) pinnedRingSet.add(c.clusterId);
      } else if (identityClustering?.clusters.some((c) => c.clusterId === cId)) {
        for (const c of identityClustering.clusters) pinnedRingSet.add(c.clusterId);
      }

      const hop1Edges = aggregatedEdges.filter(
        (e) => e.sourceId === cId || e.targetId === cId,
      );
      const connected = new Set<string>();
      connected.add(cId);
      for (const e of hop1Edges) { connected.add(e.sourceId); connected.add(e.targetId); }

      const hop1Ids = new Set(connected);
      const hop2Edges = aggregatedEdges.filter((e) => {
        if (hop1Edges.includes(e)) return false;
        if (connected.has(e.sourceId) && connected.has(e.targetId)) return true;
        const srcInHop1 = hop1Ids.has(e.sourceId) && e.sourceId !== cId;
        const dstInHop1 = hop1Ids.has(e.targetId) && e.targetId !== cId;
        if (srcInHop1 && !connected.has(e.targetId) && !pinnedRingSet.has(e.targetId)) return true;
        if (dstInHop1 && !connected.has(e.sourceId) && !pinnedRingSet.has(e.sourceId)) return true;
        return false;
      });
      for (const e of hop2Edges) { connected.add(e.sourceId); connected.add(e.targetId); }

      const clusterKeys = new Set<string>();
      for (const e of [...hop1Edges, ...hop2Edges]) {
        clusterKeys.add(e.key);
        if (!allEdgeKeys.has(e.key)) { allEdges.push(e); allEdgeKeys.add(e.key); }
      }
      perClusterEdgeKeys.push(clusterKeys);
      perClusterConnectedIds.push(new Set(connected));
      for (const id of connected) allConnected.add(id);
    }

    // Intersection: edges reachable from every pinned cluster
    const [firstEdgeSet, ...restEdgeSets] = perClusterEdgeKeys;
    const intersectionKeys = restEdgeSets.length === 0
      ? new Set(firstEdgeSet)
      : new Set([...firstEdgeSet].filter((k) => restEdgeSets.every((s) => s.has(k))));

    // Intersection: connected IDs reachable from every pinned cluster
    const [firstIdSet, ...restIdSets] = perClusterConnectedIds;
    const intersectionConnectedIds = restIdSets.length === 0
      ? new Set(firstIdSet)
      : new Set([...firstIdSet].filter((k) => restIdSets.every((s) => s.has(k))));

    return { pinnedClusterEdges: allEdges, pinnedClusterEdgeKeys: allEdgeKeys, pinnedClusterIntersectionEdgeKeys: intersectionKeys, pinnedClusterConnectedIds: allConnected, pinnedClusterIntersectionConnectedIds: intersectionConnectedIds };
  }, [pinnedClusterIds, isClustered, aggregatedEdges, dtClustering, storeClustering, identityClustering]);

  const hasClusterPin = pinnedClusterIds.size > 0;

  // Aggregated edge keys that survive all active pin constraints (individual + cluster).
  // null = no pins at all, show everything.
  const activeAggEdgeKeys = useMemo((): Set<string> | null => {
    const hasIndividualPins = activeSet !== null;
    const hasClusterPinsActive = pinnedClusterEdgeKeys.size > 0;
    if (!hasIndividualPins && !hasClusterPinsActive) return null;

    const inActiveSet = (id: string): boolean => {
      if (!activeSet) return true;
      const dtC = dtClustering?.clusters.find((c) => c.clusterId === id);
      if (dtC) return dtC.memberIds.some((m) => activeSet.has(`dt:${m}`));
      const dsC = storeClustering?.clusters.find((c) => c.clusterId === id);
      if (dsC) return dsC.memberIds.some((m) => activeSet.has(`ds:${m}`));
      const idC = identityClustering?.clusters.find((c) => c.clusterId === id);
      if (idC) return idC.memberIds.some((m) => activeSet.has(`id:${m}`));
      return activeSet.has(`dt:${id}`) || activeSet.has(`ds:${id}`) || activeSet.has(`id:${id}`);
    };

    const keys = new Set<string>();
    for (const aggEdge of aggregatedEdges) {
      const passesIndividual = inActiveSet(aggEdge.sourceId) && inActiveSet(aggEdge.targetId);
      const passesCluster = !hasClusterPinsActive || pinnedClusterEdgeKeys.has(aggEdge.key);
      if (passesIndividual && passesCluster) keys.add(aggEdge.key);
    }
    return keys;
  }, [activeSet, pinnedClusterEdgeKeys, aggregatedEdges, dtClustering, storeClustering, identityClustering]);

  // When nodes are pinned, compute how many members of each cluster are reachable.
  // This drives the count shown on cluster nodes (e.g. "2" instead of "4" internal users).
  // When clusters are pinned (no individual pins), compute the set of individual node keys
  // reachable from the pinned clusters — intersection across rings, union within each ring.
  // This is used to filter member lists in tooltips and pinned panels for non-pinned clusters.
  const clusterPinReachableSet = useMemo((): Set<string> | null => {
    if (!hasClusterPin || activeSet) return null; // not applicable in individual-pin mode

    const clusteringByRing = new Map<string, { clustering: typeof dtClustering; prefix: string }>([
      ["dataType",  { clustering: dtClustering,      prefix: "dt" }],
      ["dataStore", { clustering: storeClustering,   prefix: "ds" }],
      ["identity",  { clustering: identityClustering, prefix: "id" }],
    ]);

    const perPinReachable: Set<string>[] = [];
    for (const [ring, cId] of pinnedClusterIds) {
      const entry = clusteringByRing.get(ring);
      if (!entry?.clustering) continue;
      const clusterGroup = entry.clustering.clusters.find((c) => c.clusterId === cId);
      if (!clusterGroup) continue;
      const ringReachable = new Set<string>();
      for (const mid of clusterGroup.memberIds) {
        for (const key of getReachable(`${entry.prefix}:${mid}`)) ringReachable.add(key);
      }
      perPinReachable.push(ringReachable);
    }

    if (perPinReachable.length === 0) return new Set();
    const [first, ...rest] = perPinReachable;
    return rest.length === 0
      ? first
      : new Set([...first].filter((k) => rest.every((s) => s.has(k))));
  }, [hasClusterPin, activeSet, pinnedClusterIds, dtClustering, storeClustering, identityClustering, getReachable]);

  const clusterDisplayCounts = useMemo((): Map<string, number> => {
    const m = new Map<string, number>();

    // The effective filter set: individual-pin activeSet takes priority; cluster-pin reachable set as fallback.
    const filterSet = activeSet ?? clusterPinReachableSet;
    if (!filterSet) return m;

    const pairs: [typeof dtClustering, string][] = [
      [dtClustering,       "dt"],
      [storeClustering,    "ds"],
      [identityClustering, "id"],
    ];
    const pinnedClusters = new Set(pinnedClusterIds.values());
    for (const [clustering, prefix] of pairs) {
      if (!clustering) continue;
      for (const c of clustering.clusters) {
        if (clusterPinReachableSet && pinnedClusters.has(c.clusterId)) continue; // pinned cluster keeps full count
        const n = c.memberIds.filter((mid) => filterSet.has(`${prefix}:${mid}`)).length;
        if (n < c.count) m.set(c.clusterId, n);
      }
    }
    return m;
  }, [activeSet, clusterPinReachableSet, pinnedClusterIds, dtClustering, storeClustering, identityClustering]);

  // Pre-compute highlighted aggregated edges for individual-node hover in clustered view.
  // Returns both the edge list and the set of all reachable cluster IDs (for node state).
  const { nodeHoverHighlightedEdges, nodeHoverReachableIds } = useMemo((): { nodeHoverHighlightedEdges: AggEdge[]; nodeHoverReachableIds: Set<string> } => {
    const empty = { nodeHoverHighlightedEdges: [] as AggEdge[], nodeHoverReachableIds: new Set<string>() };
    if (!isClustered || !hoveredNode || hoveredClusterId) return empty;
    const rawId = hoveredNode.id;
    const filteredAgg = aggregatedEdges.filter(
      (e) => !(startFrom === "dataStore" && e.key.startsWith("ds-id:")),
    );

    const nodeDirectClusterIds = new Set<string>();
    const selfClusteringForType = hoveredNode.type === "dataType" ? dtClustering : hoveredNode.type === "dataStore" ? storeClustering : identityClustering;
    const selfClusterId = selfClusteringForType?.mapping.get(rawId) ?? rawId;
    nodeDirectClusterIds.add(selfClusterId);

    if (hoveredNode.type === "dataType") {
      for (const sId of (dtToStores[rawId] || [])) {
        nodeDirectClusterIds.add(storeClustering?.mapping.get(sId) ?? sId);
      }
    } else if (hoveredNode.type === "dataStore") {
      for (const [iId, stores] of Object.entries(idToStores)) {
        if (stores.includes(rawId)) nodeDirectClusterIds.add(identityClustering?.mapping.get(iId) ?? iId);
      }
      for (const dt of activeDataTypes) {
        if ((dtToStores[dt] || []).includes(rawId)) nodeDirectClusterIds.add(dtClustering?.mapping.get(dt) ?? dt);
      }
    } else {
      for (const sId of (idToStores[rawId] || [])) {
        nodeDirectClusterIds.add(storeClustering?.mapping.get(sId) ?? sId);
      }
    }

    // Hop-1: edges between self-cluster and its directly-connected neighbors
    const hop1Edges = filteredAgg.filter(
      (e) => nodeDirectClusterIds.has(e.sourceId) && nodeDirectClusterIds.has(e.targetId),
    );
    const connected = new Set(nodeDirectClusterIds);
    const hop1Ids = new Set(connected);

    // Hop-2: edges where one endpoint is a hop-1 neighbor (not selfCluster) and
    // the other is a new node not on the same ring as selfCluster.
    const selfRingSet = new Set<string>();
    const selfRingClustering =
      hoveredNode.type === "dataType" ? dtClustering :
      hoveredNode.type === "dataStore" ? storeClustering : identityClustering;
    if (selfRingClustering) for (const c of selfRingClustering.clusters) selfRingSet.add(c.clusterId);

    const hop2Edges = filteredAgg.filter((e) => {
      if (hop1Edges.includes(e)) return false;
      if (connected.has(e.sourceId) && connected.has(e.targetId)) return true;
      const srcInHop1 = hop1Ids.has(e.sourceId) && e.sourceId !== selfClusterId;
      const dstInHop1 = hop1Ids.has(e.targetId) && e.targetId !== selfClusterId;
      if (srcInHop1 && !connected.has(e.targetId) && !selfRingSet.has(e.targetId)) return true;
      if (dstInHop1 && !connected.has(e.sourceId) && !selfRingSet.has(e.sourceId)) return true;
      return false;
    });
    for (const e of hop2Edges) { connected.add(e.sourceId); connected.add(e.targetId); }

    return { nodeHoverHighlightedEdges: [...hop1Edges, ...hop2Edges], nodeHoverReachableIds: connected };
  }, [isClustered, hoveredNode, hoveredClusterId, aggregatedEdges, startFrom,
      dtToStores, idToStores, dtClustering, storeClustering, identityClustering, activeDataTypes]);

  function getClusterState(clusterId: string): NodeState {
    // If the display count for this cluster is 0, it has no active members — always dim it
    if (clusterDisplayCounts.get(clusterId) === 0) return "dimmed";

    // Resolve the ring this cluster belongs to
    const clusterRing = clusterLookup.get(clusterId)?.ring ?? null;

    // Pinned cluster mode
    if (hasClusterPin) {
      if ([...pinnedClusterIds.values()].includes(clusterId)) {
        return clusterId === hoveredClusterId ? "hover" : "selected";
      }
      // Same-ring non-pinned clusters are always dimmed.
      if (clusterRing && pinnedClusterIds.has(clusterRing)) return "dimmed";
      // When clusters span multiple rings use intersection so only clusters reachable
      // from ALL pinned clusters stay visible on the unpinned rings.
      const connectedSet = isCrossRingPinMode ? pinnedClusterIntersectionConnectedIds : pinnedClusterConnectedIds;
      if (connectedSet.has(clusterId)) {
        if (clusterId === hoveredClusterId) return "hover";
        return "focused";
      }
      return "dimmed";
    }
    // Individual node pin mode — dim clusters whose members are outside the active set
    if (hasPins && activeSet) {
      // Same-ring clusters are always dimmed when any individual pin exists on that ring.
      if (clusterRing) {
        const ringPrefix = clusterRing === "dataType" ? "dt" : clusterRing === "dataStore" ? "ds" : "id";
        const isSameRingAsAnyPin = pinnedPath.some((k) => k.split(":")[0] === ringPrefix);
        if (isSameRingAsAnyPin) return "dimmed";
      }
      const entry = clusterLookup.get(clusterId);
      if (entry) {
        const prefix = entry.ring === "dataType" ? "dt:" : entry.ring === "dataStore" ? "ds:" : "id:";
        const anyMemberActive = entry.cluster.memberIds.some((mid) => activeSet.has(`${prefix}${mid}`));
        if (!anyMemberActive) return "dimmed";
        if (clusterId === hoveredClusterId) return "hover";
        return "focused";
      }
      return "dimmed";
    }
    // No pin — pure hover mode
    // Individual node hovered (not a cluster): use nodeHoverReachableIds for all-ring dimming
    if (!hoveredClusterId && hoveredNode) {
      if (nodeHoverReachableIds.size === 0) return "normal";
      if (nodeHoverReachableIds.has(clusterId)) return "indirect";
      return "dimmed";
    }
    if (!hoveredClusterId) return "normal";
    if (clusterId === hoveredClusterId) return "hover";
    if (clusterConnectedIds.has(clusterId)) return "indirect";
    return "dimmed";
  }

  // Click a cluster → pin/unpin for that ring only, preserving other rings' pins
  const handleClusterClick = useCallback((cluster: ClusterGroup, ring: "dataType" | "dataStore" | "identity") => {
    const prefix = ring === "dataType" ? "dt:" : ring === "dataStore" ? "ds:" : "id:";
    const isUnpin = pinnedClusterIds.get(ring) === cluster.clusterId;
    setPinnedClusterIds((prev) => {
      const next = new Map(prev);
      if (next.get(ring) === cluster.clusterId) {
        next.delete(ring);
      } else {
        next.set(ring, cluster.clusterId);
      }
      return next;
    });
    // Only clear individual pins for this ring, not other rings
    setPinnedPath((prev) => prev.filter((k) => !k.startsWith(prefix)));
    setPinnedOrder((prev) => {
      // Remove all same-ring pins (cluster + members) then add cluster if pinning
      const withoutRing = prev.filter((k) => !k.startsWith(prefix) && k !== cluster.clusterId);
      return isUnpin ? withoutRing : [...withoutRing, cluster.clusterId];
    });
    setRingPinOrder((prev) => {
      if (!isUnpin) {
        // Pinning cluster: add ring if not already tracked (first pin of this ring)
        if (prev.includes(ring)) return prev;
        return [...prev, ring];
      } else {
        // Unpinning cluster: remove ring only if no individual pins remain for this ring
        const remainingIndividual = pinnedPath.filter((k) => k.startsWith(prefix));
        if (remainingIndividual.length === 0) {
          return prev.filter((r) => r !== ring);
        }
        return prev;
      }
    });
    setActiveRingPanel(ring);
  }, [pinnedClusterIds, pinnedPath]);

  const clearHover = useCallback(() => setHoveredNode(null), []);

  // ── Popover & side-panel state ─────────────────────────────────────────────
  const [popoverNode, setPopoverNode] = useState<{ type: "dataType" | "dataStore" | "identity"; id: string } | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const popoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelNode, setPanelNode] = useState<{ type: "dataType" | "dataStore" | "identity"; id: string } | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const handleNodeMouseEnter = useCallback((type: "dataType" | "dataStore" | "identity", id: string) => {
    if (popoverTimerRef.current) { clearTimeout(popoverTimerRef.current); popoverTimerRef.current = null; }
    setHoveredNode({ type, id });
    setPopoverNode({ type, id });
    setPopoverPos({ ...mousePosRef.current });
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
    popoverTimerRef.current = setTimeout(() => { setPopoverNode(null); popoverTimerRef.current = null; }, 300);
  }, []);

  const handlePopoverEnter = useCallback(() => {
    if (popoverTimerRef.current) { clearTimeout(popoverTimerRef.current); popoverTimerRef.current = null; }
  }, []);

  const handlePopoverLeave = useCallback(() => {
    popoverTimerRef.current = setTimeout(() => { setPopoverNode(null); popoverTimerRef.current = null; }, 150);
  }, []);

  // Compute auto-center + auto-zoom: when pins are active, fit all active nodes
  // into the usable viewport (left of the drill-down panel) without overflow.
  const { autoOffset, autoZoom } = useMemo(() => {
    if (!activeSet || activeSet.size === 0) return { autoOffset: { x: 0, y: 0 }, autoZoom: 1 };

    const PANEL_WIDTH = 276; // 260 + 16 margin
    const PADDING = 48; // breathing room around the bounding box
    const allPositions = [
      ...dtPositions.map((p) => ({ key: `dt:${p.id}`, x: p.x, y: p.y })),
      ...storePositions.map((p) => ({ key: `ds:${p.id}`, x: p.x, y: p.y })),
      ...identityPositions.map((p) => ({ key: `id:${p.id}`, x: p.x, y: p.y })),
    ];

    const activePositions = allPositions.filter((p) => activeSet.has(p.key));
    if (activePositions.length === 0) return { autoOffset: { x: 0, y: 0 }, autoZoom: 1 };

    // Bounding box of active nodes
    const minX = Math.min(...activePositions.map((p) => p.x));
    const maxX = Math.max(...activePositions.map((p) => p.x));
    const minY = Math.min(...activePositions.map((p) => p.y));
    const maxY = Math.max(...activePositions.map((p) => p.y));
    const bboxW = Math.max(maxX - minX, 1);
    const bboxH = Math.max(maxY - minY, 1);
    const centroidX = (minX + maxX) / 2;
    const centroidY = (minY + maxY) / 2;

    // Usable viewport (left of the panel)
    const usableW = dimensions.width - PANEL_WIDTH - PADDING * 2;
    const usableH = dimensions.height - PADDING * 2;
    const usableCenterX = PADDING + usableW / 2;
    const usableCenterY = PADDING + usableH / 2;

    // Scale to fit bounding box; cap at 1 so we never zoom in beyond natural size
    const scale = Math.min(1, usableW / bboxW, usableH / bboxH);

    return {
      autoOffset: {
        x: usableCenterX - centroidX * scale,
        y: usableCenterY - centroidY * scale,
      },
      autoZoom: scale,
    };
  }, [activeSet, dtPositions, storePositions, identityPositions, dimensions]);

  // Keep ref in sync for wheel handler
  autoOffsetRef.current = autoOffset;

  // Total transform = auto-center/zoom + manual pan/zoom
  const totalOffsetX = autoOffset.x + panOffset.x;
  const totalOffsetY = autoOffset.y + panOffset.y;
  const totalZoom = autoZoom * zoomLevel;

  if (selectedItems.length === 0) {
    const emptyCx = dimensions.width / 2;
    const emptyCy = dimensions.height / 2;
    const emptyMin = Math.min(dimensions.width, dimensions.height);
    const emptyR1 = emptyMin * 0.13;
    const emptyR2 = emptyMin * 0.30;
    const emptyR3 = emptyMin * 0.44;

    const emptyLine1 =
      startFrom === "dataType" ? "Select up to 5 data types to map access" :
      startFrom === "dataStore" ? "Select up to 5 data stores to map access" :
      "Select up to 5 identities to map access";
    const emptyLine2 =
      startFrom === "dataType" ? "Click data types in the left panel to visualize" :
      startFrom === "dataStore" ? "Click data stores in the left panel to visualize" :
      "Click identities in the left panel to visualize";
    const emptyLine3 =
      startFrom === "dataType" ? "where they are stored and who has access" :
      startFrom === "dataStore" ? "their data types and the identities with access" :
      "which stores they can reach and what data is there";

    return (
      <div ref={containerRef} className="flex-1 min-h-0 relative overflow-hidden">
        <svg width={dimensions.width} height={dimensions.height} className="absolute inset-0">
          {/* Empty concentric ring guides — colors match node types for current startFrom mode */}
          <circle cx={emptyCx} cy={emptyCy} r={emptyR3} fill="none" stroke={ringGuideColors[2]} strokeWidth={1} opacity={0.15} strokeDasharray="4 4" />
          <circle cx={emptyCx} cy={emptyCy} r={emptyR2} fill="none" stroke={ringGuideColors[1]} strokeWidth={1} opacity={0.15} strokeDasharray="4 4" />
          <circle cx={emptyCx} cy={emptyCy} r={emptyR1} fill="none" stroke={ringGuideColors[0]} strokeWidth={1} opacity={0.15} strokeDasharray="4 4" />

          {/* CTA message in center */}
          <text x={emptyCx} y={emptyCy - 8} textAnchor="middle"
            fill="var(--foreground)" opacity={0.6}
            style={{ fontSize: "15px", fontWeight: 500 }}>
            {emptyLine1}
          </text>
          <text x={emptyCx} y={emptyCy + 14} textAnchor="middle"
            fill="var(--muted-foreground)" opacity={0.45}
            style={{ fontSize: "12px" }}>
            {emptyLine2}
          </text>
          <text x={emptyCx} y={emptyCy + 30} textAnchor="middle"
            fill="var(--muted-foreground)" opacity={0.45}
            style={{ fontSize: "12px" }}>
            {emptyLine3}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0 relative overflow-hidden"
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          mousePosRef.current = pos;
          setMousePos(pos);
        }
      }}
    >
      <svg width={dimensions.width} height={dimensions.height} className="absolute inset-0"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}>
        <g transform={`translate(${totalOffsetX}, ${totalOffsetY}) scale(${totalZoom})`}
          style={{ transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        {/* Ring guides — colored to match node type per current startFrom mode */}
        <circle cx={cx} cy={cy} r={r3} fill="none" stroke={ringGuideColors[2]} strokeWidth={1} opacity={0.2} strokeDasharray="4 4" />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={ringGuideColors[1]} strokeWidth={1} opacity={0.2} strokeDasharray="4 4" />
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={ringGuideColors[0]} strokeWidth={1} opacity={0.2} strokeDasharray="4 4" />

        {/* Ring labels — positioned 30° clockwise from top (so they avoid nodes at 12 o'clock) */}
        {(() => {
          const labelAngle = -Math.PI / 2 + Math.PI / 6; // -90° + 30° = -60°
          const labelOffset = 14;
          return (
            <>
              <text
                x={cx + (r1 + labelOffset) * Math.cos(labelAngle)}
                y={cy + (r1 + labelOffset) * Math.sin(labelAngle)}
                textAnchor="start" fill={ringGuideColors[0]} opacity={0.4}
                style={{ fontSize: "8px", fontWeight: 500 }}>
                {ringGuideLabels[0]}
              </text>
              <text
                x={cx + (r2 + labelOffset) * Math.cos(labelAngle)}
                y={cy + (r2 + labelOffset) * Math.sin(labelAngle)}
                textAnchor="start" fill={ringGuideColors[1]} opacity={0.4}
                style={{ fontSize: "8px", fontWeight: 500 }}>
                {ringGuideLabels[1]}
              </text>
              <text
                x={cx + (r3 + labelOffset) * Math.cos(labelAngle)}
                y={cy + (r3 + labelOffset) * Math.sin(labelAngle)}
                textAnchor="start" fill={ringGuideColors[2]} opacity={0.4}
                style={{ fontSize: "8px", fontWeight: 500 }}>
                {ringGuideLabels[2]}
              </text>
            </>
          );
        })()}

        {/* ── Edges ─────────────────────────────────────────────────── */}
        {isClustered ? (
          /* In cluster mode, show all edges as background then highlight active ones */
          <>
            {/* Background: only rendered when hovering or pinned, intersection-only when pinned */}
            {(() => {
              const anyPin = hasClusterPin || hasPins;
              const anyHover = hoveredClusterId !== null || hoveredNode !== null;
              if (!anyHover && !anyPin) return null;
              // Only hide ds-id edges in hover-only mode (no pins). When pinned, intersection
              // edges between 100% visible nodes should always show regardless of startFrom.
              const dsIdFilter = (e: AggEdge) => !(startFrom === "dataStore" && e.key.startsWith("ds-id:"));
              if (anyPin) {
                // Pins active: only intersection edges where both endpoints are 100% visible.
                const intersectionKeys = hasClusterPin && !hasPins
                  ? pinnedClusterIntersectionEdgeKeys
                  : intersectionActiveEdges;
                return aggregatedEdges.map((e) => (
                  <AggregatedEdge key={`bg-${e.key}`}
                    x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    cx={cx} cy={cy} weight={e.weight} color={e.color} background
                    suppressed={
                      !intersectionKeys.has(e.key) ||
                      isAggEndpointNotFull(e.sourceId, true) || isAggEndpointNotFull(e.targetId, true)
                    } />
                ));
              }
              // No pins — hover-driven background
              const filteredClusterHoverKeys = new Set(clusterHoverEdges.map((e) => e.key));
              const filteredNodeHoverKeys = new Set(nodeHoverHighlightedEdges.map((e) => e.key));
              const activeHoverKeys = new Set([...filteredClusterHoverKeys, ...filteredNodeHoverKeys]);
              return aggregatedEdges.filter(dsIdFilter).map((e) => (
                <AggregatedEdge key={`bg-${e.key}`}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  cx={cx} cy={cy} weight={e.weight} color={e.color} background
                  suppressed={
                    isAggEndpointNotFull(e.sourceId, false) || isAggEndpointNotFull(e.targetId, false) ||
                    (anyHover && !activeHoverKeys.has(e.key))
                  } />
              ));
            })()}
            {/* Pinned cluster edges — intersection only, both endpoints must be 100% */}
            {(hasClusterPin || hasPins) && pinnedClusterEdges
              .filter((e) => pinnedClusterIntersectionEdgeKeys.has(e.key))
              .filter((e) => !isAggEndpointNotFull(e.sourceId, true) && !isAggEndpointNotFull(e.targetId, true))
              .map((e) => (
                <AggregatedEdge key={`pin-${e.key}`}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  cx={cx} cy={cy} weight={e.weight} color={e.color}
                  highlighted />
              ))}
            {/* Cluster hover edges — only when no pins active, hide edges to non-full endpoints */}
            {!hasClusterPin && !hasPins && clusterHoverEdges
              .filter((e) => !(startFrom === "dataStore" && e.key.startsWith("ds-id:")))
              .filter((e) => !isAggEndpointNotFull(e.sourceId, false) && !isAggEndpointNotFull(e.targetId, false))
              .map((e) => (
                <AggregatedEdge key={`hov-${e.key}`}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  cx={cx} cy={cy} weight={e.weight} color={e.color} highlighted />
              ))}
            {/* Pinned individual nodes in clustered view — draw CurvedEdges resolved to cluster positions */}
            {hasPins && (() => {
              // Resolve a node ID to its visual position (cluster center or individual position)
              const resolvePos = (type: "dt" | "ds" | "id", nodeId: string): { x: number; y: number } | null => {
                if (type === "dt") {
                  if (dtClustering) {
                    const cId = dtClustering.mapping.get(nodeId);
                    if (cId) { const c = dtClustering.clusters.find((cl) => cl.clusterId === cId); if (c) return { x: c.x, y: c.y }; }
                  }
                  const p = dtPositions.find((d) => d.id === nodeId); return p ? { x: p.x, y: p.y } : null;
                } else if (type === "ds") {
                  if (storeClustering) {
                    const cId = storeClustering.mapping.get(nodeId);
                    if (cId) { const c = storeClustering.clusters.find((cl) => cl.clusterId === cId); if (c) return { x: c.x, y: c.y }; }
                  }
                  const p = storePositions.find((s) => s.id === nodeId); return p ? { x: p.x, y: p.y } : null;
                } else {
                  if (identityClustering) {
                    const cId = identityClustering.mapping.get(nodeId);
                    if (cId) { const c = identityClustering.clusters.find((cl) => cl.clusterId === cId); if (c) return { x: c.x, y: c.y }; }
                  }
                  const p = identityPositions.find((i) => i.id === nodeId); return p ? { x: p.x, y: p.y } : null;
                }
              };

              const result: React.ReactElement[] = [];
              // Deduplicate by visual endpoint pair (cluster-level dedup)
              const seenPairs = new Set<string>();
              const addEdge = (x1: number, y1: number, x2: number, y2: number, edgeKey: string, color: string) => {
                const pairKey = `${Math.round(x1)},${Math.round(y1)}->${Math.round(x2)},${Math.round(y2)}`;
                if (seenPairs.has(pairKey)) return;
                seenPairs.add(pairKey);
                result.push(
                  <CurvedEdge key={`cp-${edgeKey}-${pairKey}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    cx={cx} cy={cy} state={getEdgeState(edgeKey)} color={color} />
                );
              };

              for (const nodeKey of pinnedPath) {
                const [type, ...rest] = nodeKey.split(":");
                const id = rest.join(":");

                if (type === "dt") {
                  const src = resolvePos("dt", id);
                  if (!src) continue;
                  for (const sId of (dtToStores[id] || [])) {
                    const dst = resolvePos("ds", sId);
                    if (!dst) continue;
                    addEdge(src.x, src.y, dst.x, dst.y, `dt:${id}|ds:${sId}`, THEME.dataType);
                    for (const iId of (storesToIdentities[sId] || [])) {
                      const idDst = resolvePos("id", iId);
                      if (!idDst) continue;
                      addEdge(dst.x, dst.y, idDst.x, idDst.y, `ds:${sId}|id:${iId}`, THEME.dataStore);
                    }
                  }
                } else if (type === "ds") {
                  const src = resolvePos("ds", id);
                  if (!src) continue;
                  for (const dt of (storeToDTs[id] || [])) {
                    const dst = resolvePos("dt", dt);
                    if (!dst) continue;
                    addEdge(src.x, src.y, dst.x, dst.y, `dt:${dt}|ds:${id}`, startFrom === "dataType" ? THEME.dataType : THEME.dataStore);
                  }
                  for (const iId of (storesToIdentities[id] || [])) {
                    const dst = resolvePos("id", iId);
                    if (!dst) continue;
                    addEdge(src.x, src.y, dst.x, dst.y, `ds:${id}|id:${iId}`, THEME.dataStore);
                  }
                } else if (type === "id") {
                  const src = resolvePos("id", id);
                  if (!src) continue;
                  for (const sId of (idToStores[id] || [])) {
                    const dst = resolvePos("ds", sId);
                    if (!dst) continue;
                    addEdge(src.x, src.y, dst.x, dst.y, `ds:${sId}|id:${id}`, THEME.identity);
                    for (const dt of (storeToDTs[sId] || [])) {
                      const dtDst = resolvePos("dt", dt);
                      if (!dtDst) continue;
                      addEdge(dst.x, dst.y, dtDst.x, dtDst.y, `dt:${dt}|ds:${sId}`, THEME.dataStore);
                    }
                  }
                }
              }
              return result;
            })()}
            {/* Individual node hover in clustered view — suppressed when any pin is active, hide edges to non-full endpoints */}
            {!hasClusterPin && !hasPins && hoveredNode && !hoveredClusterId && nodeHoverHighlightedEdges
              .filter((e) => !isAggEndpointNotFull(e.sourceId, false) && !isAggEndpointNotFull(e.targetId, false))
              .map((e) => (
                <AggregatedEdge key={`node-hover-${e.key}`}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  cx={cx} cy={cy} weight={e.weight} color={e.color} highlighted />
              ))}
          </>
        ) : (
          <>
            {startFrom === "dataType" && (
              <>
                {/* dataType mode: DT(r1) → DS(r2) → ID(r3) chain */}
                {dtPositions.map((dt) => {
                  if (getNodeState(`dt:${dt.id}`, "dataType", dt.id) === "dimmed") return null;
                  return (dtToStores[dt.id] || []).map((sId) => {
                    const store = storePositions.find((s) => s.id === sId);
                    if (!store) return null;
                    const key = `dt:${dt.id}|ds:${sId}`;
                    return <CurvedEdge key={key} x1={dt.x} y1={dt.y} x2={store.x} y2={store.y}
                      cx={cx} cy={cy} state={getEdgeState(key)} color={THEME.dataType} />;
                  });
                })}
                {storePositions.map((store) => {
                  if (getNodeState(`ds:${store.id}`, "dataStore", store.id) === "dimmed") return null;
                  return (storesToIdentities[store.id] || []).map((iId) => {
                    const identity = identityPositions.find((i) => i.id === iId);
                    if (!identity) return null;
                    const key = `ds:${store.id}|id:${iId}`;
                    return <CurvedEdge key={key} x1={store.x} y1={store.y} x2={identity.x} y2={identity.y}
                      cx={cx} cy={cy} state={getEdgeState(key)} color={THEME.dataStore} />;
                  });
                })}
              </>
            )}
            {startFrom === "dataStore" && (
              <>
                {/* dataStore mode: DS(r1) → DT(r2) inner→middle only */}
                {storePositions.map((store) => {
                  const storeState = getNodeState(`ds:${store.id}`, "dataStore", store.id);
                  if (storeState === "dimmed") return null;
                  return (storeToDTs[store.id] || []).map((dt) => {
                    const dtNode = dtPositions.find((d) => d.id === dt);
                    if (!dtNode) return null;
                    const key = `dt:${dt}|ds:${store.id}`;
                    return <CurvedEdge key={key} x1={store.x} y1={store.y} x2={dtNode.x} y2={dtNode.y}
                      cx={cx} cy={cy} state={getEdgeState(key)} color={THEME.dataStore} />;
                  });
                })}
                {/* DT(r2) → ID(r3) middle→outer only — no direct DS→ID cross-ring connections */}
                {dtPositions.map((dt) => {
                  const dtState = getNodeState(`dt:${dt.id}`, "dataType", dt.id);
                  if (dtState === "dimmed") return null;
                  const identityMap = new Map<string, string>(); // iId → first bridging sId
                  for (const sId of (dtToStores[dt.id] || [])) {
                    for (const iId of (storesToIdentities[sId] || [])) {
                      if (!identityMap.has(iId)) identityMap.set(iId, sId);
                    }
                  }
                  return Array.from(identityMap.entries()).map(([iId, bridgeSId]) => {
                    const identity = identityPositions.find((i) => i.id === iId);
                    if (!identity) return null;
                    const proxyKey = `ds:${bridgeSId}|id:${iId}`;
                    return <CurvedEdge key={`dt:${dt.id}|id:${iId}`}
                      x1={dt.x} y1={dt.y} x2={identity.x} y2={identity.y}
                      cx={cx} cy={cy} state={getEdgeState(proxyKey)} color={THEME.dataStore} />;
                  });
                })}
              </>
            )}
            {startFrom === "identity" && (
              <>
                {/* identity mode: ID(r1) → DS(r2) → DT(r3) chain */}
                {identityPositions.map((identity) => {
                  if (getNodeState(`id:${identity.id}`, "identity", identity.id) === "dimmed") return null;
                  return (idToStores[identity.id] || []).map((sId) => {
                    const store = storePositions.find((s) => s.id === sId);
                    if (!store) return null;
                    const key = `ds:${sId}|id:${identity.id}`;
                    return <CurvedEdge key={key} x1={identity.x} y1={identity.y} x2={store.x} y2={store.y}
                      cx={cx} cy={cy} state={getEdgeState(key)} color={THEME.identity} />;
                  });
                })}
                {storePositions.map((store) => {
                  if (getNodeState(`ds:${store.id}`, "dataStore", store.id) === "dimmed") return null;
                  return (storeToDTs[store.id] || []).map((dt) => {
                    const dtNode = dtPositions.find((d) => d.id === dt);
                    if (!dtNode) return null;
                    const key = `dt:${dt}|ds:${store.id}`;
                    return <CurvedEdge key={key} x1={store.x} y1={store.y} x2={dtNode.x} y2={dtNode.y}
                      cx={cx} cy={cy} state={getEdgeState(key)} color={THEME.dataStore} />;
                  });
                })}
              </>
            )}
          </>
        )}

        {/* ── Data Type nodes / clusters ───────────────────────── */}
        {dtClustering ? (
          dtClustering.clusters.flatMap((c) => {
            const pinnedMemberIds = c.memberIds.filter((mid) => pinnedSet.has(`dt:${mid}`));
            if (pinnedMemberIds.length === 1) {
              const pinnedMemberId = pinnedMemberIds[0];
              const nodeKey = `dt:${pinnedMemberId}`;
              return [<CircleNode key={nodeKey} x={c.x} y={c.y}
                color={THEME.dataType} outerR={dtOuter} innerR={dtInner}
                label={pinnedMemberId} icon="shield"
                state={getNodeState(nodeKey, "dataType", pinnedMemberId)}
                interactive={isClickable(nodeKey)}
                onMouseEnter={() => handleNodeMouseEnter("dataType", pinnedMemberId)}
                onMouseLeave={handleNodeMouseLeave}
                onClick={() => handleNodeClick(nodeKey)} />];
            }
            if (pinnedMemberIds.length > 1) {
              return [<ClusterNodeSVG key={c.clusterId} x={c.x} y={c.y}
                color={THEME.dataType} outerR={dtOuter}
                count={pinnedMemberIds.length} label={c.label}
                state="selected"
                onClick={() => handleClusterClick(c, "dataType")}
                onMouseEnter={() => setHoveredClusterId(c.clusterId)}
                onMouseLeave={() => setHoveredClusterId(null)} />];
            }
            return [<ClusterNodeSVG key={c.clusterId} x={c.x} y={c.y}
              color={THEME.dataType} outerR={dtOuter}
              count={clusterDisplayCounts.get(c.clusterId) ?? c.count} label={c.label}
              state={getClusterState(c.clusterId)}
              onClick={isClusterClickable(c.clusterId) ? () => handleClusterClick(c, "dataType") : undefined}
              onMouseEnter={isClusterClickable(c.clusterId) ? () => setHoveredClusterId(c.clusterId) : undefined}
              onMouseLeave={isClusterClickable(c.clusterId) ? () => setHoveredClusterId(null) : undefined} />];
          })
        ) : (
          dtPositions.map((dt) => {
            const nodeKey = `dt:${dt.id}`;
            const clickable = isClickable(nodeKey);
            return (
              <CircleNode key={nodeKey} x={dt.x} y={dt.y}
                color={THEME.dataType} outerR={dtOuter} innerR={dtInner}
                label={dt.id} icon="shield"
                state={getNodeState(nodeKey, "dataType", dt.id)}
                interactive={clickable}
                onMouseEnter={() => handleNodeMouseEnter("dataType", dt.id)}
                onMouseLeave={handleNodeMouseLeave}
                onClick={() => handleNodeClick(nodeKey)} />
            );
          })
        )}

        {/* ── Data Store nodes / clusters ─────────────────────────── */}
        {storeClustering ? (
          storeClustering.clusters.flatMap((c) => {
            const pinnedMemberIds = c.memberIds.filter((mid) => pinnedSet.has(`ds:${mid}`));
            if (pinnedMemberIds.length === 1) {
              const pinnedMemberId = pinnedMemberIds[0];
              const store = relevantStores.find((s) => s.id === pinnedMemberId);
              const nodeKey = `ds:${pinnedMemberId}`;
              return [<CircleNode key={nodeKey} x={c.x} y={c.y}
                color={THEME.dataStore} outerR={dsOuter} innerR={dsInner}
                label={store?.name ?? pinnedMemberId} sublabel={store?.subtitle}
                icon="database"
                state={getNodeState(nodeKey, "dataStore", pinnedMemberId)}
                interactive={isClickable(nodeKey)}
                onMouseEnter={() => handleNodeMouseEnter("dataStore", pinnedMemberId)}
                onMouseLeave={handleNodeMouseLeave}
                onClick={() => handleNodeClick(nodeKey)} />];
            }
            if (pinnedMemberIds.length > 1) {
              return [<ClusterNodeSVG key={c.clusterId} x={c.x} y={c.y}
                color={THEME.dataStore} outerR={dsOuter}
                count={pinnedMemberIds.length} label={c.label}
                state="selected"
                onClick={() => handleClusterClick(c, "dataStore")}
                onMouseEnter={() => setHoveredClusterId(c.clusterId)}
                onMouseLeave={() => setHoveredClusterId(null)} />];
            }
            return [<ClusterNodeSVG key={c.clusterId} x={c.x} y={c.y}
              color={THEME.dataStore} outerR={dsOuter}
              count={clusterDisplayCounts.get(c.clusterId) ?? c.count} label={c.label}
              state={getClusterState(c.clusterId)}
              onClick={isClusterClickable(c.clusterId) ? () => handleClusterClick(c, "dataStore") : undefined}
              onMouseEnter={isClusterClickable(c.clusterId) ? () => setHoveredClusterId(c.clusterId) : undefined}
              onMouseLeave={isClusterClickable(c.clusterId) ? () => setHoveredClusterId(null) : undefined} />];
          })
        ) : (
          storePositions.map((store) => {
            const nodeKey = `ds:${store.id}`;
            const clickable = isClickable(nodeKey);
            return (
              <CircleNode key={nodeKey} x={store.x} y={store.y}
                color={THEME.dataStore} outerR={dsOuter} innerR={dsInner}
                label={store.name} sublabel={store.subtitle}
                icon="database"
                state={getNodeState(nodeKey, "dataStore", store.id)}
                interactive={clickable}
                onMouseEnter={() => handleNodeMouseEnter("dataStore", store.id)}
                onMouseLeave={handleNodeMouseLeave}
                onClick={() => handleNodeClick(nodeKey)} />
            );
          })
        )}

        {/* ── Identity nodes / clusters ──────────────────────────── */}
        {identityClustering ? (
          identityClustering.clusters.flatMap((c) => {
            const pinnedMemberIds = c.memberIds.filter((mid) => pinnedSet.has(`id:${mid}`));
            if (pinnedMemberIds.length === 1) {
              const pinnedMemberId = pinnedMemberIds[0];
              const identity = relevantIdentities.find((i) => i.id === pinnedMemberId);
              const nodeKey = `id:${pinnedMemberId}`;
              return [<CircleNode key={nodeKey} x={c.x} y={c.y}
                color={THEME.identity} outerR={idOuter} innerR={idInner}
                label={identity?.name ?? pinnedMemberId} sublabel={identity?.email ?? identity?.role}
                icon={(identity?.identityType === "service-account" || identity?.identityType === "connected-app") ? "bot" : "user"}
                state={getNodeState(nodeKey, "identity", pinnedMemberId)}
                interactive={isClickable(nodeKey)}
                onMouseEnter={() => handleNodeMouseEnter("identity", pinnedMemberId)}
                onMouseLeave={handleNodeMouseLeave}
                onClick={() => handleNodeClick(nodeKey)} />];
            }
            if (pinnedMemberIds.length > 1) {
              return [<ClusterNodeSVG key={c.clusterId} x={c.x} y={c.y}
                color={THEME.identity} outerR={idOuter}
                count={pinnedMemberIds.length} label={c.label}
                state="selected"
                onClick={() => handleClusterClick(c, "identity")}
                onMouseEnter={() => setHoveredClusterId(c.clusterId)}
                onMouseLeave={() => setHoveredClusterId(null)} />];
            }
            return [<ClusterNodeSVG key={c.clusterId} x={c.x} y={c.y}
              color={THEME.identity} outerR={idOuter}
              count={clusterDisplayCounts.get(c.clusterId) ?? c.count} label={c.label}
              state={getClusterState(c.clusterId)}
              onClick={isClusterClickable(c.clusterId) ? () => handleClusterClick(c, "identity") : undefined}
              onMouseEnter={isClusterClickable(c.clusterId) ? () => setHoveredClusterId(c.clusterId) : undefined}
              onMouseLeave={isClusterClickable(c.clusterId) ? () => setHoveredClusterId(null) : undefined} />];
          })
        ) : (
          identityPositions.map((identity) => {
            const nodeKey = `id:${identity.id}`;
            const clickable = isClickable(nodeKey);
            return (
              <CircleNode key={nodeKey} x={identity.x} y={identity.y}
                color={THEME.identity} outerR={idOuter} innerR={idInner}
                label={identity.name} sublabel={identity.email ?? identity.role}
                icon={(identity.identityType === "service-account" || identity.identityType === "connected-app") ? "bot" : "user"}
                state={getNodeState(nodeKey, "identity", identity.id)}
                interactive={clickable}
                onMouseEnter={() => handleNodeMouseEnter("identity", identity.id)}
                onMouseLeave={handleNodeMouseLeave}
                onClick={() => handleNodeClick(nodeKey)} />
            );
          })
        )}
        </g>

      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-3 px-3 py-2.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border"
        style={{ fontSize: "10px" }}>
        {/* Node types */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${THEME.dataType}`, display: "inline-block" }} />
            <span style={{ color: THEME.dataType }}>Data Type</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${THEME.dataStore}`, display: "inline-block" }} />
            <span style={{ color: THEME.dataStore }}>Data Store</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${THEME.identity}`, display: "inline-block" }} />
            <span style={{ color: THEME.identity }}>Identity</span>
          </div>
        </div>
        {/* Interaction hint */}
        <div className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
          {isClustered
            ? <>Auto-clustered (&ge;{CLUSTER_NODE_THRESHOLD} nodes) &middot; Click to pin &middot; Pin members from panel</>
            : <>Click to select &middot; Drag to pan{scrollZoomEnabled ? <> &middot; Scroll to zoom</> : null}</>
          }
        </div>
      </div>

      {/* Zoom controls — separate from legend */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-card/80 backdrop-blur-sm border border-border"
        style={{ fontSize: "10px" }}>
        <button
          onClick={() => {
            setZoomLevel((prev) => {
              const next = Math.max(ZOOM_MIN, prev - ZOOM_BUTTON_STEP * prev);
              const scaleFactor = next / prev;
              const centerX = dimensions.width / 2;
              const centerY = dimensions.height / 2;
              setPanOffset((p) => ({
                x: centerX - scaleFactor * (centerX - p.x),
                y: centerY - scaleFactor * (centerY - p.y),
              }));
              return next;
            });
          }}
          disabled={zoomLevel <= ZOOM_MIN}
          className="flex items-center justify-center rounded transition-colors hover:bg-surface-raised disabled:opacity-25 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
          style={{ width: 26, height: 26, background: "none", border: "none", cursor: "pointer" }}
          title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <span
          className="text-muted-foreground/70 tabular-nums select-none"
          style={{ fontSize: "10px", minWidth: "36px", textAlign: "center" }}>
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => {
            setZoomLevel((prev) => {
              const next = Math.min(ZOOM_MAX, prev + ZOOM_BUTTON_STEP * prev);
              const scaleFactor = next / prev;
              const centerX = dimensions.width / 2;
              const centerY = dimensions.height / 2;
              setPanOffset((p) => ({
                x: centerX - scaleFactor * (centerX - p.x),
                y: centerY - scaleFactor * (centerY - p.y),
              }));
              return next;
            });
          }}
          disabled={zoomLevel >= ZOOM_MAX}
          className="flex items-center justify-center rounded transition-colors hover:bg-surface-raised disabled:opacity-25 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
          style={{ width: 26, height: 26, background: "none", border: "none", cursor: "pointer" }}
          title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        {zoomLevel !== 1 && (
          <>
            <span className="text-border" style={{ fontSize: "12px", padding: "0 2px" }}>|</span>
            <button
              onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
              className="text-muted-foreground/60 hover:text-foreground transition-colors"
              style={{
                fontSize: "10px", background: "none", border: "none",
                cursor: "pointer", padding: "2px 4px", whiteSpace: "nowrap",
              }}>
              Reset
            </button>
          </>
        )}
      </div>

      {/* Esc hint — top left corner, only when something is pinned */}
      {(hasClusterPin || pinnedPath.length > 0) && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
            Press <kbd className="font-mono">Esc</kbd> to unpin all and back to see the selection
          </span>
        </div>
      )}

      {/* Ring panels — one collapsible card per ring that has pins */}
      {(hasClusterPin || pinnedPath.length > 0) && (
        <RingPanelStack
          pinnedPath={pinnedPath}
          pinnedClusterIds={pinnedClusterIds}
          ringPinOrder={ringPinOrder}
          clusterLookup={clusterLookup}
          clusterDisplayCounts={clusterDisplayCounts}
          activeSet={activeSet}
          clusterPinReachableSet={clusterPinReachableSet}
          stores={relevantStores}
          identities={relevantIdentities}
          isClustered={isClustered}
          onTogglePin={(nodeKey) => handleNodeClick(nodeKey)}
          onClearRing={(ring) => {
            const prefix = ring === "dataType" ? "dt:" : ring === "dataStore" ? "ds:" : "id:";
            setPinnedPath((prev) => prev.filter((k) => !k.startsWith(prefix)));
            setPinnedClusterIds((prev) => { const next = new Map(prev); next.delete(ring); return next; });
            setPinnedOrder((prev) => prev.filter((k) => !k.startsWith(prefix) && !clusterLookup.has(k)));
            setRingPinOrder((prev) => prev.filter((r) => r !== ring));
          }}
          onOpenPanel={(nodeKey) => {
            const [type, ...rest] = nodeKey.split(":");
            const id = rest.join(":");
            const t = type === "dt" ? "dataType" : type === "ds" ? "dataStore" : "identity";
            setPanelNode({ type: t as "dataType" | "dataStore" | "identity", id });
          }}
        />
      )}

      {/* Cluster hover tooltip — shows on hover in cluster mode */}
      {hoveredClusterId && isClustered && (() => {
        const entry = clusterLookup.get(hoveredClusterId);
        if (!entry) return null;
        const TOOLTIP_W = 260;
        const OFFSET = 14;
        const flipX = mousePos.x + OFFSET + TOOLTIP_W > dimensions.width;
        const left = flipX ? mousePos.x - OFFSET - TOOLTIP_W : mousePos.x + OFFSET;
        const top = Math.max(4, mousePos.y - 40);
        return (
          <div
            className="absolute px-3 py-2.5 rounded-lg bg-card border border-border shadow-lg"
            style={{ left, top, width: TOOLTIP_W, pointerEvents: "none", zIndex: 10 }}
          >
            <ClusterTooltipContent
              cluster={entry.cluster}
              ring={entry.ring}
              stores={relevantStores}
              identities={relevantIdentities}
              connectedIds={hasClusterPin ? pinnedClusterConnectedIds : clusterConnectedIds}
              clusterLookup={clusterLookup}
              hoveredClusterId={hoveredClusterId}
              activeSet={activeSet ?? clusterPinReachableSet}
            />
          </div>
        );
      })()}

      {/* ── Action popover — two-button menu on individual node hover ─────── */}
      {popoverNode && (() => {
        const POPOVER_W = 200;
        const nodeKey =
          popoverNode.type === "dataType" ? `dt:${popoverNode.id}` :
          popoverNode.type === "dataStore" ? `ds:${popoverNode.id}` : `id:${popoverNode.id}`;
        const isNodePinned = pinnedPath.includes(nodeKey);

        let nodeTitle = "";
        let nodeSubtitle = "";
        let nodeColor = THEME.dataType;
        if (popoverNode.type === "dataType") {
          nodeTitle = popoverNode.id;
          nodeSubtitle = DATA_TYPE_CATEGORY[popoverNode.id] || "Data Type";
          nodeColor = THEME.dataType;
        } else if (popoverNode.type === "dataStore") {
          const store = relevantStores.find((s) => s.id === popoverNode.id);
          nodeTitle = store?.name || popoverNode.id;
          nodeSubtitle = store?.subtitle || "Data Store";
          nodeColor = THEME.dataStore;
        } else {
          const identity = relevantIdentities.find((i) => i.id === popoverNode.id);
          nodeTitle = identity?.name || popoverNode.id;
          nodeSubtitle = IDENTITY_TYPE_LABELS[identity?.identityType || ""] || identity?.email || identity?.role || "Identity";
          nodeColor = THEME.identity;
        }

        const flipX = popoverPos.x + 18 + POPOVER_W > dimensions.width;
        const left = flipX ? popoverPos.x - 10 - POPOVER_W : popoverPos.x + 18;
        const top = Math.max(4, Math.min(popoverPos.y - 24, dimensions.height - 100 - 8));

        return (
          <div
            className="absolute rounded-xl border border-border shadow-2xl overflow-hidden"
            style={{ left, top, width: POPOVER_W, background: "var(--card)", zIndex: 25, pointerEvents: "auto" }}
            onMouseEnter={handlePopoverEnter}
            onMouseLeave={handlePopoverLeave}
          >
            {/* Node info header — title + optional details button on same row */}
            <div className="px-3 pt-2.5 pb-2.5">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: nodeColor, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                  {truncate(nodeTitle, 22)}
                </span>
                {popoverNode.type !== "dataType" && (
                  <button
                    type="button"
                    title="View side panel"
                    className="flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                    style={{ width: 20, height: 20, flexShrink: 0, background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => { setPanelNode({ type: popoverNode.type, id: popoverNode.id }); setPopoverNode(null); }}
                  >
                    <PanelRight size={13} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>
                {nodeSubtitle}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Node detail side panel — rendered via portal at page level ──── */}
      {typeof document !== "undefined" && createPortal(
        <RadarNodeSidePanel
          panelNode={panelNode}
          onClose={() => setPanelNode(null)}
          relevantStores={relevantStores}
          relevantIdentities={relevantIdentities}
        />,
        document.body,
      )}
    </div>
  );
}

// ── Hover tooltip content ───────────────────────────────────────────────────

function HoverTooltipContent({ node, stores, identities, dtToStores, storesToIdentities, selectedDataTypes }: {
  node: { type: string; id: string };
  stores: DataStoreNode[];
  identities: IdentityNode[];
  dtToStores: Record<string, string[]>;
  storesToIdentities: Record<string, string[]>;
  selectedDataTypes: string[];
}) {
  let title = "";
  let details: string[] = [];
  let color = THEME.dataType;

  if (node.type === "dataType") {
    title = node.id;
    color = THEME.dataType;
    const storeIds = dtToStores[node.id] || [];
    details = [`Found in ${storeIds.length} data store${storeIds.length !== 1 ? "s" : ""}`];
    const accessIds = new Set<string>();
    for (const sId of storeIds) for (const iId of (storesToIdentities[sId] || [])) accessIds.add(iId);
    details.push(`Accessible by ${accessIds.size} identit${accessIds.size !== 1 ? "ies" : "y"}`);
  } else if (node.type === "dataStore") {
    const store = stores.find((s) => s.id === node.id);
    title = store?.name || node.id;
    color = THEME.dataStore;
    const dtCount = selectedDataTypes.filter((dt) => (dtToStores[dt] || []).includes(node.id)).length;
    details.push(`Contains ${dtCount} selected type${dtCount !== 1 ? "s" : ""}`);
    const idCount = (storesToIdentities[node.id] || []).length;
    details.push(`${idCount} identit${idCount !== 1 ? "ies" : "y"} with access`);
  } else {
    const identity = identities.find((i) => i.id === node.id);
    title = identity?.name || node.id;
    color = THEME.identity;
    if (identity) details.push(identity.email ?? identity.role);
    const storeCount = identity?.dataStores.filter((sId) => stores.some((s) => s.id === sId)).length || 0;
    details.push(`Access to ${storeCount} data store${storeCount !== 1 ? "s" : ""}`);
  }

  return (
    <>
      <div style={{ fontSize: "12px", fontWeight: 600, color }}>{title}</div>
      {details.map((d, i) => (
        <div key={i} className="text-muted-foreground" style={{ fontSize: "10.5px", marginTop: 2 }}>{d}</div>
      ))}
    </>
  );
}

// ── Selection panel (pinned) ────────────────────────────────────────────────

interface NodeEntry {
  key: string;
  label: string;
  sublabel?: string;
  color: string;
  ring: "dataType" | "dataStore" | "identity";
}

// ── Unified ring panel stack ─────────────────────────────────────────────────

// ── Identity filter state for the pinned panel ───────────────────────────────
export interface IdentityPanelFilters {
  identityType: string[];
  uciScoreMin: number | null;
  uciScoreMax: number | null;
  idpStatus: string[];
  orgUnit: string[];
  localAccount: string[];
  lastActive: "7d" | "30d" | "60d" | "90d" | "over90d" | null;
}

export const EMPTY_IDENTITY_FILTERS: IdentityPanelFilters = {
  identityType: [],
  uciScoreMin: null, uciScoreMax: null,
  idpStatus: [], orgUnit: [], localAccount: [], lastActive: null,
};

export function hasActiveFilters(f: IdentityPanelFilters): boolean {
  return f.identityType.length > 0 ||
    f.uciScoreMin !== null || f.uciScoreMax !== null ||
    f.idpStatus.length > 0 || f.orgUnit.length > 0 ||
    f.localAccount.length > 0 || f.lastActive !== null;
}

export function countActiveFilters(f: IdentityPanelFilters): number {
  let n = 0;
  if (f.identityType.length > 0) n++;
  if (f.uciScoreMin !== null || f.uciScoreMax !== null) n++;
  if (f.idpStatus.length > 0) n++;
  if (f.orgUnit.length > 0) n++;
  if (f.localAccount.length > 0) n++;
  if (f.lastActive !== null) n++;
  return n;
}

export function passesIdentityFilter(id: string, f: IdentityPanelFilters): boolean {
  if (f.identityType.length > 0) {
    const reg = IDENTITY_REGISTRY.find((i) => i.id === id);
    if (!reg || !f.identityType.includes(reg.identityType)) return false;
  }
  const meta = IDENTITY_META[id];
  if (!meta) return true;
  if (f.uciScoreMin !== null && meta.uciScore < f.uciScoreMin) return false;
  if (f.uciScoreMax !== null && meta.uciScore > f.uciScoreMax) return false;
  if (f.idpStatus.length > 0 && !f.idpStatus.includes(meta.idpStatus)) return false;
  if (f.orgUnit.length > 0 && !f.orgUnit.includes(meta.orgUnit)) return false;
  if (f.localAccount.length > 0) {
    const wantMapped = f.localAccount.includes("mapped");
    const wantNonLocal = f.localAccount.includes("non-local");
    if (wantMapped && !wantNonLocal && !meta.localAccount) return false;
    if (wantNonLocal && !wantMapped && meta.localAccount) return false;
  }
  if (f.lastActive) {
    const d = meta.lastActiveDaysAgo;
    if (f.lastActive === "7d"     && d > 7)   return false;
    if (f.lastActive === "30d"    && d > 30)  return false;
    if (f.lastActive === "60d"    && d > 60)  return false;
    if (f.lastActive === "90d"    && d > 90)  return false;
    if (f.lastActive === "over90d" && d <= 90) return false;
  }
  return true;
}


// ── Identity Filter Modal ─────────────────────────────────────────────────────
export function FilterSection({ label, count, open, onToggle, children }: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "11px", fontWeight: 600 }}>{label}</span>
          {count > 0 && (
            <span
              style={{
                fontSize: "10px", fontWeight: 600, lineHeight: "16px",
                minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px",
                background: "var(--primary)", color: "#fff", textAlign: "center",
                display: "inline-block",
              }}
            >
              {count}
            </span>
          )}
        </div>
        <ChevronRight
          size={12}
          className="text-muted-foreground"
          style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }}
        />
      </button>
      {open && (
        <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="px-3 py-2">{children}</div>
        </div>
      )}
    </div>
  );
}

export function IdentityFilterModal({ filters, onApply, onClose, identityIds, anchorRect, showIdentityType = true, onlyLastActive = false }: {
  filters: IdentityPanelFilters;
  onApply: (f: IdentityPanelFilters) => void;
  onClose: () => void;
  identityIds: string[];
  anchorRect: DOMRect;
  showIdentityType?: boolean;
  onlyLastActive?: boolean;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: string) =>
    setExpandedSection((prev) => (prev === key ? null : key));

  const update = (next: IdentityPanelFilters) => { onApply(next); };

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Position to the left of the anchor button
  const MODAL_W = 240;
  const left = Math.max(8, anchorRect.left - MODAL_W - 4);
  const top = anchorRect.top;

  // Collect available org units from visible identities
  const orgUnits = useMemo(() => {
    const units = new Set<string>();
    for (const id of identityIds) {
      const meta = IDENTITY_META[id];
      if (meta) units.add(meta.orgUnit);
    }
    return [...units].sort();
  }, [identityIds]);

  const toggleArr = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const hasChanges = JSON.stringify(filters) !== JSON.stringify(EMPTY_IDENTITY_FILTERS);

  // Per-section counts
  const identityTypeCount = filters.identityType.length;
  const uciCount    = (filters.uciScoreMin !== null || filters.uciScoreMax !== null) ? 1 : 0;
  const idpCount    = filters.idpStatus.length;
  const orgCount    = filters.orgUnit.length;
  const localCount  = filters.localAccount.length;
  const activeCount = filters.lastActive !== null ? 1 : 0;

  const internalExternalHint = showIdentityType ? (
    <p className="text-muted-foreground/60 mt-1" style={{ fontSize: "9px" }}>
      Only applicable for Internal User &amp; External User
    </p>
  ) : null;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed rounded-lg border border-border shadow-xl overflow-hidden"
      style={{ left, top, width: MODAL_W, background: "var(--color-card)", zIndex: 9999 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span style={{ fontSize: "12px", fontWeight: 700 }}>Filter Identities</span>
        <div className="flex items-center gap-1">
          {hasChanges && (
            <button
              type="button"
              onClick={() => update(EMPTY_IDENTITY_FILTERS)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontSize: "10px", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
            >
              Clear
            </button>
          )}
          <button type="button" onClick={onClose}
            className="flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
            style={{ width: 20, height: 20, background: "none", border: "none", cursor: "pointer" }}>
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>

        {/* Identity Type */}
        {showIdentityType && (
          <FilterSection label="Identity Type" count={identityTypeCount} open={expandedSection === "identityType"} onToggle={() => toggleSection("identityType")}>
            <div className="flex flex-col gap-0.5 pt-1">
              {([
                ["internal-user",       "Internal User"],
                ["external-user",       "External User"],
                ["unmapped-local-user", "Unmapped"],
                ["unknown-identity",    "Unauthenticated"],
              ] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <input type="checkbox" checked={filters.identityType.includes(val)}
                    onChange={() => update({ ...filters, identityType: toggleArr(filters.identityType, val) })}
                    className="accent-primary" style={{ width: 12, height: 12 }} />
                  <span style={{ fontSize: "11px" }}>{lbl}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* UCI Score */}
        {!onlyLastActive && (
          <FilterSection label="UCI Score" count={uciCount} open={expandedSection === "uciScore"} onToggle={() => toggleSection("uciScore")}>
            {internalExternalHint}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number" min={0} max={100} placeholder="Min"
                value={filters.uciScoreMin ?? ""}
                onChange={(e) => update({ ...filters, uciScoreMin: e.target.value === "" ? null : Number(e.target.value) })}
                className="border border-border rounded bg-background text-foreground text-center"
                style={{ width: 58, fontSize: "11px", padding: "3px 4px" }}
              />
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>–</span>
              <input
                type="number" min={0} max={100} placeholder="Max"
                value={filters.uciScoreMax ?? ""}
                onChange={(e) => update({ ...filters, uciScoreMax: e.target.value === "" ? null : Number(e.target.value) })}
                className="border border-border rounded bg-background text-foreground text-center"
                style={{ width: 58, fontSize: "11px", padding: "3px 4px" }}
              />
            </div>
          </FilterSection>
        )}

        {/* IDP Status */}
        {!onlyLastActive && (
          <FilterSection label="IDP Status" count={idpCount} open={expandedSection === "idpStatus"} onToggle={() => toggleSection("idpStatus")}>
            {internalExternalHint}
            <div className="flex flex-col gap-0.5 pt-1">
              {(["Active", "Suspended", "Disabled"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <input type="checkbox" checked={filters.idpStatus.includes(s)}
                    onChange={() => update({ ...filters, idpStatus: toggleArr(filters.idpStatus, s) })}
                    className="accent-primary" style={{ width: 12, height: 12 }} />
                  <span style={{ fontSize: "11px" }}>{s}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Org Unit */}
        {!onlyLastActive && orgUnits.length > 0 && (
          <FilterSection label="Org Unit" count={orgCount} open={expandedSection === "orgUnit"} onToggle={() => toggleSection("orgUnit")}>
            {internalExternalHint}
            <div className="flex flex-col gap-0.5 pt-1">
              {orgUnits.map((u) => (
                <label key={u} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <input type="checkbox" checked={filters.orgUnit.includes(u)}
                    onChange={() => update({ ...filters, orgUnit: toggleArr(filters.orgUnit, u) })}
                    className="accent-primary" style={{ width: 12, height: 12 }} />
                  <span style={{ fontSize: "11px" }}>{u}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Local Account */}
        {!onlyLastActive && (
          <FilterSection label="Local Account" count={localCount} open={expandedSection === "localAccount"} onToggle={() => toggleSection("localAccount")}>
            <div className="flex flex-col gap-0.5 pt-1">
              {([["mapped", "Local account mapped"], ["non-local", "Non-local account"]] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <input type="checkbox" checked={filters.localAccount.includes(val)}
                    onChange={() => update({ ...filters, localAccount: filters.localAccount.includes(val) ? filters.localAccount.filter(x => x !== val) : [...filters.localAccount, val] })}
                    className="accent-primary" style={{ width: 12, height: 12 }} />
                  <span style={{ fontSize: "11px" }}>{lbl}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Last Active */}
        <FilterSection label="Last Active" count={activeCount} open={expandedSection === "lastActive"} onToggle={() => toggleSection("lastActive")}>
          <div className="flex flex-col gap-0.5 pt-1">
            {([
              ["7d",     "In 7 days"],
              ["30d",    "In 30 days"],
              ["60d",    "In 60 days"],
              ["90d",    "In 90 days"],
              ["over90d","Over 90 days"],
            ] as const).map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="radio" name="lastActive" checked={filters.lastActive === val}
                  onChange={() => update({ ...filters, lastActive: filters.lastActive === val ? null : val })}
                  className="accent-primary" style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: "11px" }}>{lbl}</span>
              </label>
            ))}
          </div>
        </FilterSection>

      </div>
    </div>,
    document.body,
  );
}

// ── Single ring panel (extracted so it can hold its own search/filter state) ──
function RingPanel({ ring, label, color, prefix, cluster, pinnedMemberKeys, clusterDisplayCounts, activeSet, identities, stores, isClustered, anyFilterOpen, onTogglePin, onClearRing, onOpenPanel, onFilterOpenChange }: {
  ring: "dataType" | "dataStore" | "identity";
  label: string;
  color: string;
  prefix: string;
  cluster: ClusterGroup | null;
  pinnedMemberKeys: string[];
  clusterDisplayCounts: Map<string, number>;
  activeSet: Set<string> | null;
  identities: IdentityNode[];
  stores: DataStoreNode[];
  isClustered: boolean;
  anyFilterOpen: boolean;
  onTogglePin: (nodeKey: string) => void;
  onClearRing: (ring: "dataType" | "dataStore" | "identity") => void;
  onOpenPanel: (nodeKey: string) => void;
  onFilterOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<IdentityPanelFilters>(EMPTY_IDENTITY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const selectedCount = pinnedMemberKeys.length;

  const canShowPanel = ring !== "dataType";

  // True when every pinned identity in this panel is unmapped-local-user
  const isUnmappedPanel = ring === "identity" && (() => {
    // Cluster pin: check all cluster member ids
    if (cluster && cluster.memberIds.length > 0) {
      return cluster.memberIds.every(
        (mid) => IDENTITY_REGISTRY.find((i) => i.id === mid)?.identityType === "unmapped-local-user"
      );
    }
    // Individual pins
    return pinnedMemberKeys.length > 0 && pinnedMemberKeys.every((k) => {
      const id = k.split(":").slice(1).join(":");
      return IDENTITY_REGISTRY.find((i) => i.id === id)?.identityType === "unmapped-local-user";
    });
  })();

  // For unmapped panel only Last Active filter is shown; exclude other counts from badge
  const visibleFilters = isUnmappedPanel
    ? { ...EMPTY_IDENTITY_FILTERS, lastActive: filters.lastActive }
    : { ...filters, identityType: [] };
  const isActiveFilter = hasActiveFilters(visibleFilters);
  const activeFilterCount = countActiveFilters(visibleFilters);

  function resolveName(id: string): { name: string; sub?: string } {
    if (ring === "dataType") return { name: id, sub: DATA_TYPE_CATEGORY[id] };
    if (ring === "dataStore") {
      const s = stores.find((st) => st.id === id);
      return { name: s?.name || id, sub: s?.subtitle };
    }
    const ident = identities.find((i) => i.id === id);
    return { name: ident?.name || id, sub: ident?.email ?? ident?.role };
  }

  // Build the list of member IDs to show (active-set filtered, then search + identity filters)
  const getVisibleMemberIds = (memberIds: string[]): string[] => {
    return memberIds.filter((mid) => {
      const nodeKey = `${prefix}:${mid}`;
      if (activeSet && !activeSet.has(nodeKey)) return false;
      const { name } = resolveName(mid);
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
      if (ring === "identity" && isActiveFilter && !passesIdentityFilter(mid, filters)) return false;
      return true;
    });
  };

  // For non-cluster mode: filter pinnedMemberKeys
  const getVisibleMemberKeys = (keys: string[]): string[] => {
    return keys.filter((nodeKey) => {
      const id = nodeKey.split(":").slice(1).join(":");
      const { name } = resolveName(id);
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
      if (ring === "identity" && isActiveFilter && !passesIdentityFilter(id, filters)) return false;
      return true;
    });
  };

  // Collect identity IDs present in this panel for the filter modal's org unit list
  const allMemberIds = cluster
    ? cluster.memberIds.filter((mid) => !activeSet || activeSet.has(`${prefix}:${mid}`))
    : pinnedMemberKeys.map((k) => k.split(":").slice(1).join(":"));

  const totalMembers = allMemberIds.length;
  const showSearchAndFilter = totalMembers > 1 && ring !== "dataType";

  return (
    <div
      className="rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg flex-shrink-0"
      style={{ position: "relative" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-foreground" style={{ fontSize: "11px", fontWeight: 700 }}>{label}</span>
        <button
          onClick={() => onClearRing(ring)}
          className="transition-all"
          style={{ fontSize: "10px", background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", padding: "3px 10px", borderRadius: "4px", fontWeight: 500, opacity: 0.85 }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}>
          Unpin
        </button>
      </div>

      {/* Search bar — hidden when only 1 member */}
      {showSearchAndFilter && <div className="px-2.5 pt-2 pb-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5" style={{ position: "relative" }}>
          <div className="flex items-center flex-1 gap-1.5 px-2 rounded-md border border-border/60 bg-background/50"
            style={{ height: 26 }}>
            <Search size={11} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="flex-1 bg-transparent text-foreground outline-none placeholder-muted-foreground/50"
              style={{ fontSize: "11px", minWidth: 0 }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                <X size={10} />
              </button>
            )}
          </div>

          {/* Filter icon — only for identity ring */}
          {ring === "identity" && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                ref={filterBtnRef}
                type="button"
                title="Filter identities"
                onClick={() => {
                  const rect = filterBtnRef.current?.getBoundingClientRect();
                  if (rect) setFilterAnchorRect(rect);
                  setFilterOpen((o) => { onFilterOpenChange(!o); return !o; });
                }}
                className={`flex items-center justify-center rounded transition-colors ${isActiveFilter ? "text-primary bg-primary/15" : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"}`}
                style={{ width: 26, height: 26, background: "none", cursor: "pointer", border: `1px solid ${isActiveFilter ? "var(--primary)" : "var(--border)"}`, position: "relative" }}
              >
                <SlidersHorizontal size={12} />
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      position: "absolute", top: -5, right: -5,
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: "var(--primary)", color: "#fff",
                      fontSize: "9px", fontWeight: 700, lineHeight: "14px",
                      textAlign: "center", padding: "0 3px",
                      pointerEvents: "none",
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filterOpen && filterAnchorRect && (
                <IdentityFilterModal
                  filters={filters}
                  onApply={(f) => setFilters(f)}
                  onClose={() => { setFilterOpen(false); onFilterOpenChange(false); }}
                  identityIds={allMemberIds}
                  anchorRect={filterAnchorRect}
                  showIdentityType={false}
                  onlyLastActive={isUnmappedPanel}
                />
              )}
            </div>
          )}

        </div>
      </div>}

      <div className="overflow-y-auto" style={{ minHeight: "28.5px", maxHeight: "350px" }}>
        {/* Cluster row */}
        {cluster && (
          <div
            className={`flex items-center gap-2 px-3 py-2 ${selectedCount > 0 ? "hover:bg-surface-raised/50 cursor-pointer" : "cursor-default"}`}
            style={{ minHeight: "32px" }}
            title={selectedCount > 0 ? "Click to unpin selected members" : undefined}
            onClick={() => {
              if (selectedCount > 0) {
                pinnedMemberKeys.forEach((nodeKey) => onTogglePin(nodeKey));
              }
            }}
          >
            <span className="flex-shrink-0 rounded-full"
              style={{ width: 8, height: 8, backgroundColor: color, flexShrink: 0 }} />
            <span className="flex items-baseline gap-1.5 min-w-0">
              <span className="truncate" style={{ fontSize: "11px", color, fontWeight: 600 }}>
                {cluster.label}
              </span>
              {selectedCount > 0
                ? <span style={{ fontSize: "10px", color, fontWeight: 400 }}>· {selectedCount} selected</span>
                : <span className="text-muted-foreground/70" style={{ fontSize: "10px" }}>{clusterDisplayCounts.get(cluster.clusterId) ?? cluster.count}</span>
              }
            </span>
          </div>
        )}

        {/* Member rows */}
        {cluster && getVisibleMemberIds(cluster.memberIds).length === 0 && (isActiveFilter || search) && (
          <div className="px-3 py-3 text-muted-foreground/50 text-center" style={{ fontSize: "11px" }}>
            No identities match
          </div>
        )}
        {cluster
          ? getVisibleMemberIds(cluster.memberIds).map((mid) => {
              const nodeKey = `${prefix}:${mid}`;
              const isPinned = pinnedMemberKeys.includes(nodeKey);
              const { name, sub } = resolveName(mid);
              return (
                <div key={mid}
                  className="group flex items-center gap-2 hover:bg-surface-raised/50 cursor-pointer"
                  style={{ minHeight: "28px", paddingLeft: 28, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}
                  title={isPinned ? "Click to unpin" : "Click to pin"}
                  onClick={() => onTogglePin(nodeKey)}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${color}`, backgroundColor: isPinned ? color : `${color}18`, display: "inline-block", flexShrink: 0 }} />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="truncate" style={{ fontSize: "10.5px", color, fontWeight: isPinned ? 600 : 400, opacity: isPinned ? 1 : 0.75 }}>{name}</span>
                    {sub && <span className="flex-shrink-0 text-muted-foreground/40" style={{ fontSize: "8px" }}>{sub}</span>}
                  </div>
                  {canShowPanel && (
                    <button type="button" title="View side panel"
                      onClick={(e) => { e.stopPropagation(); onOpenPanel(nodeKey); }}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                      style={{ width: 20, height: 20, background: "none", border: "none", cursor: "pointer" }}>
                      <PanelRight size={12} />
                    </button>
                  )}
                </div>
              );
            })
          : !cluster && getVisibleMemberKeys(pinnedMemberKeys).length === 0 && (isActiveFilter || search)
            ? [<div key="__empty" className="px-3 py-3 text-muted-foreground/50 text-center" style={{ fontSize: "11px" }}>No results matched</div>]
            : getVisibleMemberKeys(pinnedMemberKeys).map((nodeKey) => {
              const id = nodeKey.split(":").slice(1).join(":");
              const { name, sub } = resolveName(id);
              return (
                <div key={nodeKey}
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-surface-raised/50 cursor-pointer"
                  style={{ minHeight: "32px" }}
                  title="Click to unpin"
                  onClick={() => onTogglePin(nodeKey)}>
                  <span className="flex-shrink-0 rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: color, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="truncate" style={{ fontSize: "11px", color, fontWeight: 600 }}>{name}</span>
                    {sub && <span className="flex-shrink-0 text-muted-foreground/40" style={{ fontSize: "8px" }}>{sub}</span>}
                  </div>
                  {canShowPanel && (
                    <button type="button" title="View side panel"
                      onClick={(e) => { e.stopPropagation(); onOpenPanel(nodeKey); }}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                      style={{ width: 20, height: 20, background: "none", border: "none", cursor: "pointer" }}>
                      <PanelRight size={12} />
                    </button>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

function RingPanelStack({ pinnedPath, pinnedClusterIds, ringPinOrder, clusterLookup, clusterDisplayCounts, activeSet, clusterPinReachableSet, stores, identities, isClustered,
  onTogglePin, onClearRing, onOpenPanel }: {
  pinnedPath: string[];
  pinnedClusterIds: Map<string, string>;
  ringPinOrder: Array<"dataType" | "dataStore" | "identity">;
  clusterLookup: Map<string, { cluster: ClusterGroup; ring: "dataType" | "dataStore" | "identity" }>;
  clusterDisplayCounts: Map<string, number>;
  activeSet: Set<string> | null;
  clusterPinReachableSet: Set<string> | null;
  stores: DataStoreNode[];
  identities: IdentityNode[];
  isClustered: boolean;
  onTogglePin: (nodeKey: string) => void;
  onClearRing: (ring: "dataType" | "dataStore" | "identity") => void;
  onOpenPanel: (nodeKey: string) => void;
}) {
  const [filterOpenRing, setFilterOpenRing] = useState<string | null>(null);
  const anyFilterOpen = filterOpenRing !== null;

  const RING_META: Record<string, { prefix: string; label: string; color: string }> = {
    identity: { prefix: "id", label: "Identities", color: THEME.identity },
    dataStore: { prefix: "ds", label: "Data Stores", color: THEME.dataStore },
    dataType:  { prefix: "dt", label: "Data Types",  color: THEME.dataType  },
  };
  const RINGS = ringPinOrder.map((ring) => ({ ring, ...RING_META[ring] }));

  const ringPanels = RINGS.map(({ ring, prefix, label, color }) => {
    const ringClusterId = pinnedClusterIds.get(ring) ?? null;
    const clusterEntry = ringClusterId ? clusterLookup.get(ringClusterId) : null;
    const memberKeys = pinnedPath.filter((k) => k.startsWith(`${prefix}:`));
    const hasCluster = ringClusterId !== null && isClustered && clusterEntry !== null;
    if (!hasCluster && memberKeys.length === 0) return null;
    return { ring, prefix, label, color, hasCluster, clusterEntry, ringClusterId, memberKeys };
  }).filter(Boolean) as {
    ring: "dataType" | "dataStore" | "identity";
    prefix: string; label: string; color: string;
    hasCluster: boolean;
    clusterEntry: { cluster: ClusterGroup; ring: "dataType" | "dataStore" | "identity" } | null;
    ringClusterId: string | null;
    memberKeys: string[];
  }[];

  if (ringPanels.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2" style={{ width: "260px", maxHeight: "calc(100vh - 80px)", zIndex: 5, overflowY: "auto" }}>
      {ringPanels.map(({ ring, prefix, label, color, hasCluster, clusterEntry: ringClusterEntry, memberKeys }) => {
        const cluster = hasCluster && ringClusterEntry ? ringClusterEntry.cluster : null;
        return (
          <RingPanel
            key={ring}
            ring={ring}
            label={label}
            color={color}
            prefix={prefix}
            cluster={cluster}
            pinnedMemberKeys={memberKeys}
            clusterDisplayCounts={clusterDisplayCounts}
            activeSet={activeSet ?? clusterPinReachableSet}
            identities={identities}
            stores={stores}
            isClustered={isClustered}
            anyFilterOpen={anyFilterOpen}
            onTogglePin={onTogglePin}
            onClearRing={onClearRing}
            onOpenPanel={onOpenPanel}
            onFilterOpenChange={(open) => setFilterOpenRing(open ? ring : null)}
          />
        );
      })}
    </div>
  );
}

function SelectionPanel({
  pinnedPath, activeSet, stores, identities, dtToStores, storesToIdentities, selectedDataTypes,
  onClearAll, onUnpin, onOpenPanel,
}: {
  pinnedPath: string[];
  activeSet: Set<string> | null;
  stores: DataStoreNode[];
  identities: IdentityNode[];
  dtToStores: Record<string, string[]>;
  storesToIdentities: Record<string, string[]>;
  selectedDataTypes: string[];
  onClearAll: () => void;
  onUnpin: (nodeKey: string) => void;
  onOpenPanel: (nodeKey: string) => void;
}) {
  // Build the hierarchical list: pinned path (in order) + remaining active nodes grouped by ring
  const { pinned, activeByRing } = useMemo(() => {
    const pinnedKeys = new Set(pinnedPath);

    // Helper to create a node entry
    function makeEntry(key: string): NodeEntry | null {
      const [type, ...rest] = key.split(":");
      const id = rest.join(":");
      if (type === "dt") {
        return { key, label: id, sublabel: DATA_TYPE_CATEGORY[id], color: THEME.dataType, ring: "dataType" };
      } else if (type === "ds") {
        const store = stores.find((s) => s.id === id);
        return { key, label: store?.name || id, sublabel: store?.subtitle, color: THEME.dataStore, ring: "dataStore" };
      } else if (type === "id") {
        const identity = identities.find((i) => i.id === id);
        return { key, label: identity?.name || id, sublabel: identity?.email ?? identity?.role, color: THEME.identity, ring: "identity" };
      }
      return null;
    }

    // Pinned nodes in path order (this IS the drill-down breadcrumb)
    const pinnedNodes: NodeEntry[] = [];
    for (const nodeKey of pinnedPath) {
      const entry = makeEntry(nodeKey);
      if (entry) pinnedNodes.push(entry);
    }

    // Remaining active nodes (not pinned), grouped by ring type
    const remaining: NodeEntry[] = [];
    if (activeSet) {
      for (const key of activeSet) {
        if (!pinnedKeys.has(key)) {
          const entry = makeEntry(key);
          if (entry) remaining.push(entry);
        }
      }
    }

    // Sort: data types → data stores → identities
    const ringOrder = { dataType: 0, dataStore: 1, identity: 2 };
    remaining.sort((a, b) => ringOrder[a.ring] - ringOrder[b.ring] || a.label.localeCompare(b.label));

    // Group by ring
    const byRing: { ring: "dataType" | "dataStore" | "identity"; label: string; color: string; nodes: NodeEntry[] }[] = [];
    const ringGroups = [
      { ring: "dataType" as const, label: "Data Types", color: THEME.dataType },
      { ring: "dataStore" as const, label: "Data Stores", color: THEME.dataStore },
      { ring: "identity" as const, label: "Identities", color: THEME.identity },
    ];
    for (const rg of ringGroups) {
      const nodes = remaining.filter((n) => n.ring === rg.ring);
      if (nodes.length > 0) {
        byRing.push({ ...rg, nodes });
      }
    }

    return { pinned: pinnedNodes, activeByRing: byRing };
  }, [pinnedPath, activeSet, stores, identities]);

  const ringLabel = (ring: "dataType" | "dataStore" | "identity") =>
    ring === "dataType" ? "Data Type" : ring === "dataStore" ? "Data Store" : "Identity";

  return (
    <div className="absolute top-3 right-3 rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg flex flex-col"
      style={{ width: "260px", maxHeight: "calc(100% - 24px)", zIndex: 5, overflow: "hidden" }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>
            Pinned
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="transition-all"
          style={{
            fontSize: "10px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            padding: "3px 10px",
            borderRadius: "4px",
            fontWeight: 500,
            opacity: 0.85,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}>
          Clear Path
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Drill-down path (breadcrumb) */}
        <div className="border-b border-border">
          <div className="px-3 py-1.5" style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 500 }}>
            Pinned Path ({pinned.length})
          </div>
          {pinned.map((node, idx) => (
            <div key={node.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-raised/50 group cursor-pointer"
              style={{ minHeight: "28px" }}
              onClick={() => onUnpin(node.key)}>
              {/* Step number */}
              <span className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: 16, height: 16,
                  backgroundColor: `${node.color}22`,
                  border: `1.5px solid ${node.color}`,
                  fontSize: "8px", fontWeight: 700, color: node.color,
                }}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0 truncate" style={{ fontSize: "11px", color: node.color, fontWeight: 500 }}>
                {node.label}
              </div>
              {node.sublabel && (
                <span className="flex-shrink-0 text-muted-foreground/40 group-hover:hidden" style={{ fontSize: "8px" }}>
                  {node.sublabel}
                </span>
              )}
              <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  title="View side panel"
                  onClick={(e) => { e.stopPropagation(); onOpenPanel(node.key); }}
                  className="flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                  style={{ width: 20, height: 20 }}
                >
                  <PanelRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active set grouped by ring */}
        {activeByRing.map((group) => (
          <div key={group.ring} className="border-b border-border last:border-b-0">
            <div className="px-3 py-1.5" style={{ fontSize: "10px", color: group.color, fontWeight: 500, opacity: 0.6 }}>
              {group.label} ({group.nodes.length})
            </div>
            {group.nodes.map((node) => (
              <div key={node.key} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-surface-raised/50 cursor-pointer"
                style={{ minHeight: "26px" }}
                onClick={() => onUnpin(node.key)}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  border: `1.5px solid ${node.color}`,
                  backgroundColor: `${node.color}18`,
                  display: "inline-block", flexShrink: 0,
                }} />
                <div className="flex-1 min-w-0 truncate" style={{ fontSize: "10.5px", color: node.color, fontWeight: 400, opacity: 0.85 }}>
                  {node.label}
                </div>
                {node.sublabel && (
                  <span className="flex-shrink-0 text-muted-foreground/40 group-hover:hidden" style={{ fontSize: "8px" }}>
                    {node.sublabel}
                  </span>
                )}
                <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    title="View side panel"
                    onClick={(e) => { e.stopPropagation(); onOpenPanel(node.key); }}
                    className="flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                    style={{ width: 20, height: 20 }}
                  >
                    <PanelRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cluster tooltip content ─────────────────────────────────────────────────

function ClusterTooltipContent({ cluster, ring, stores, identities, connectedIds, clusterLookup, hoveredClusterId, activeSet }: {
  cluster: ClusterGroup;
  ring: "dataType" | "dataStore" | "identity";
  stores: DataStoreNode[];
  identities: IdentityNode[];
  connectedIds: Set<string>;
  clusterLookup: Map<string, { cluster: ClusterGroup; ring: "dataType" | "dataStore" | "identity" }>;
  hoveredClusterId: string;
  activeSet: Set<string> | null;
}) {
  const color = ring === "dataType" ? THEME.dataType : ring === "dataStore" ? THEME.dataStore : THEME.identity;
  const ringLabel = ring === "dataType" ? "Data Types" : ring === "dataStore" ? "Data Stores" : "Identities";
  const prefix = ring === "dataType" ? "dt" : ring === "dataStore" ? "ds" : "id";

  const visibleMemberIds = activeSet
    ? cluster.memberIds.filter((mid) => activeSet.has(`${prefix}:${mid}`))
    : cluster.memberIds;

  const memberNames = visibleMemberIds.map((mid) => {
    if (ring === "dataType") return mid;
    if (ring === "dataStore") {
      const s = stores.find((st) => st.id === mid);
      return s?.name || mid;
    }
    const id = identities.find((i) => i.id === mid);
    return id?.name || mid;
  });

  const connectedByRing: Record<string, number> = { dataType: 0, dataStore: 0, identity: 0 };
  for (const cId of connectedIds) {
    if (cId === hoveredClusterId) continue;
    const entry = clusterLookup.get(cId);
    if (entry) connectedByRing[entry.ring]++;
  }

  const MAX_SHOW = 6;
  const shown = memberNames.slice(0, MAX_SHOW);
  const rest = memberNames.length - MAX_SHOW;

  return (
    <>
      <div style={{ fontSize: "12px", fontWeight: 600, color }}>{memberNames.length} {ringLabel}</div>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {shown.map((name, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              border: `1.5px solid ${color}`,
              backgroundColor: `${color}18`,
              display: "inline-block", flexShrink: 0,
            }} />
            <span style={{ fontSize: "10.5px", color, opacity: 0.85 }}>{truncate(name, 28)}</span>
          </div>
        ))}
        {rest > 0 && (
          <div className="text-muted-foreground/50" style={{ fontSize: "10px", paddingLeft: 12 }}>
            +{rest} more
          </div>
        )}
      </div>
      <div className="border-t border-border mt-2 pt-1.5 flex flex-col gap-0.5">
        {connectedByRing.dataType > 0 && ring !== "dataType" && (
          <div className="text-muted-foreground" style={{ fontSize: "10px" }}>
            Connected to <span style={{ color: THEME.dataType, fontWeight: 500 }}>{connectedByRing.dataType} type cluster{connectedByRing.dataType !== 1 ? "s" : ""}</span>
          </div>
        )}
        {connectedByRing.dataStore > 0 && ring !== "dataStore" && (
          <div className="text-muted-foreground" style={{ fontSize: "10px" }}>
            Connected to <span style={{ color: THEME.dataStore, fontWeight: 500 }}>{connectedByRing.dataStore} store cluster{connectedByRing.dataStore !== 1 ? "s" : ""}</span>
          </div>
        )}
        {connectedByRing.identity > 0 && ring !== "identity" && (
          <div className="text-muted-foreground" style={{ fontSize: "10px" }}>
            Connected to <span style={{ color: THEME.identity, fontWeight: 500 }}>{connectedByRing.identity} identity cluster{connectedByRing.identity !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
      <div className="text-muted-foreground/40 mt-1.5" style={{ fontSize: "10px" }}>
        Click to focus · Esc to unfocus
      </div>
    </>
  );
}

// ── RadarNodeSidePanel — maps radar node → real Inventory side panel ─────────

function RadarNodeSidePanel({
  panelNode,
  onClose,
  relevantStores,
  relevantIdentities,
}: {
  panelNode: { type: "dataType" | "dataStore" | "identity"; id: string } | null;
  onClose: () => void;
  relevantStores: DataStoreNode[];
  relevantIdentities: IdentityNode[];
}) {
  const open = panelNode !== null;

  let title = "";
  let subtitle = "";
  let panelType: "file" | "column" | "app" | "website" | "identity" | undefined;
  let content: React.ReactNode = null;

  if (panelNode) {
    if (panelNode.type === "dataStore") {
      const store = relevantStores.find((s) => s.id === panelNode.id);
      title    = store?.name    ?? panelNode.id;
      subtitle = store?.subtitle ?? "Data Store";
      const kind = getPlatformKind(store?.platform ?? "");

      if (kind === "saas") {
        panelType = "file";
        content = <SaaSRowPanelContent row={makeSaaSRow(store!)} storeType={store!.platform} />;
      } else if (kind === "iaas-unstructured") {
        panelType = "file";
        content = <IaaSRowPanelContent row={makeIaaSUnstructuredRow(store!)} storeType={store!.platform} />;
      } else if (kind === "iaas-structured") {
        panelType = "column";
        content = <IaaSStructuredRowPanelContent row={makeIaaSStructuredRow(store!)} storeType={store!.platform} />;
      } else if (kind === "onprem-structured") {
        panelType = "column";
        content = <OnPremStructuredRowPanelContent row={makeOnPremStructuredRow(store!)} />;
      } else {
        panelType = "file";
        content = <IaaSRowPanelContent row={makeIaaSUnstructuredRow(store!)} storeType={store!.platform} />;
      }
    } else if (panelNode.type === "identity") {
      const identity = relevantIdentities.find((i) => i.id === panelNode.id);
      const identityNavId = identity?.identityType ?? "internal-user";
      title     = identity?.name ?? panelNode.id;
      subtitle  = IDENTITY_TYPE_LABELS[identityNavId] ?? "Identity";
      panelType = "identity";
      const config = getIdentityTableConfig(identityNavId);
      const row = config.rows.find((r) => r.Name === title || r[config.columns[0]] === title)
        ?? { Name: title, Role: identity?.role ?? "", Type: subtitle };
      content = <IdentityDetailPanel row={row} navId={identityNavId} />;
    } else {
      // dataType — no dedicated Inventory panel; brief info card
      title     = panelNode.id;
      subtitle  = DATA_TYPE_CATEGORY[panelNode.id] ?? "Data Type";
      panelType = "file";
      content = (
        <div className="px-5 py-4">
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>
            Classified as{" "}
            <strong className="text-foreground">{DATA_TYPE_CATEGORY[panelNode.id] ?? "Other"}</strong>.
            Select a Data Store or Identity node to open its full detail panel.
          </p>
        </div>
      );
    }
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      panelType={panelType}
      width="min(840px, 90vw)"
      zIndex={60}
    >
      {content}
    </SidePanel>
  );
}

// ── Extra-ring panels (nodes pinned from rings other than the cluster's ring) ─

function ExtraRingPanels({ pinnedClusterId, clusterLookup, stores, identities, pinnedPath, pinnedOrder, onUnpin, onOpenPanel }: {
  pinnedClusterId: string;
  clusterLookup: Map<string, { cluster: ClusterGroup; ring: "dataType" | "dataStore" | "identity" }>;
  stores: DataStoreNode[];
  identities: IdentityNode[];
  pinnedPath: string[];
  pinnedOrder: string[];
  onUnpin: (nodeKey: string) => void;
  onOpenPanel: (nodeKey: string) => void;
}) {
  const pinnedEntry = clusterLookup.get(pinnedClusterId);
  if (!pinnedEntry) return null;
  const { ring: pinnedRing } = pinnedEntry;

  function toRingPrefix(ring: string): string {
    if (ring === "dataType") return "dt";
    if (ring === "dataStore") return "ds";
    return "id";
  }

  function resolveName(mid: string, ring: "dataType" | "dataStore" | "identity"): { name: string; sub?: string } {
    if (ring === "dataType") return { name: mid, sub: DATA_TYPE_CATEGORY[mid] };
    if (ring === "dataStore") {
      const s = stores.find((st) => st.id === mid);
      return { name: s?.name || mid, sub: s?.subtitle };
    }
    const id = identities.find((i) => i.id === mid);
    return { name: id?.name || mid, sub: id?.email ?? id?.role };
  }

  const ringLabelMap: Record<string, string> = { dataType: "Data Types", dataStore: "Data Stores", identity: "Identities" };
  const ringColorMap: Record<string, string> = { dataType: THEME.dataType, dataStore: THEME.dataStore, identity: THEME.identity };
  const canShowPanel = (ring: string) => ring !== "dataType";

  const globalPinOrderMapExtra = new Map<string, number>();
  pinnedOrder.forEach((k, i) => globalPinOrderMapExtra.set(k, i + 1));

  const groups: { ring: "dataType" | "dataStore" | "identity"; label: string; color: string; items: { nodeKey: string; name: string; sub?: string; pinOrder: number }[] }[] = [];
  for (const r of (["dataType", "dataStore", "identity"] as const)) {
    if (r === pinnedRing) continue;
    const prefix = toRingPrefix(r);
    const items = pinnedPath
      .filter((k) => k.startsWith(`${prefix}:`))
      .map((k) => {
        const id = k.slice(prefix.length + 1);
        return { nodeKey: k, pinOrder: globalPinOrderMapExtra.get(k)!, ...resolveName(id, r) };
      });
    if (items.length > 0) groups.push({ ring: r, label: ringLabelMap[r], color: ringColorMap[r], items });
  }

  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((group) => (
        <div key={group.ring} className="rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-foreground" style={{ fontSize: "13px", fontWeight: 700 }}>
              {group.label}
            </span>
            <button
              onClick={() => group.items.forEach((item) => onUnpin(item.nodeKey))}
              className="transition-all"
              style={{
                fontSize: "10px",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                padding: "3px 10px",
                borderRadius: "4px",
                fontWeight: 500,
                opacity: 0.85,
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}>
              Unpin
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
            {group.items.map(({ nodeKey, name, sub, pinOrder }) => (
              <div key={nodeKey}
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-raised/50 cursor-pointer"
                style={{ minHeight: "32px" }}
                title="Click to unpin"
                onClick={() => onUnpin(nodeKey)}>
                <span className="flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 16, height: 16, backgroundColor: `${group.color}22`, border: `1.5px solid ${group.color}`, fontSize: "8px", fontWeight: 700, color: group.color }}>
                  {pinOrder}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="truncate" style={{ fontSize: "11px", color: group.color, fontWeight: 600 }}>
                    {name}
                  </span>
                  {sub && (
                    <span className="flex-shrink-0 text-muted-foreground/40" style={{ fontSize: "8px" }}>
                      {sub}
                    </span>
                  )}
                </div>
                {canShowPanel(group.ring) && (
                  <button
                    type="button"
                    title="View side panel"
                    onClick={(e) => { e.stopPropagation(); onOpenPanel(nodeKey); }}
                    className="flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                    style={{ width: 20, height: 20, background: "none", border: "none", cursor: "pointer" }}
                  >
                    <PanelRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Cluster selection panel (pinned cluster) ────────────────────────────────

function ClusterSelectionPanel({ pinnedClusterId, clusterLookup, stores, identities, pinnedPath, pinnedOrder, onClearAll, onTogglePin, onOpenPanel }: {
  pinnedClusterId: string;
  clusterLookup: Map<string, { cluster: ClusterGroup; ring: "dataType" | "dataStore" | "identity" }>;
  stores: DataStoreNode[];
  identities: IdentityNode[];
  pinnedPath: string[];
  pinnedOrder: string[];
  onClearAll: () => void;
  onTogglePin: (nodeKey: string) => void;
  onOpenPanel: (nodeKey: string) => void;
}) {
  const pinnedEntry = clusterLookup.get(pinnedClusterId);
  if (!pinnedEntry) return null;

  const { cluster: pinnedCluster, ring: pinnedRing } = pinnedEntry;
  const pinnedColor = pinnedRing === "dataType" ? THEME.dataType : pinnedRing === "dataStore" ? THEME.dataStore : THEME.identity;
  const pinnedRingLabel = pinnedRing === "dataType" ? "Data Types" : pinnedRing === "dataStore" ? "Data Stores" : "Identities";

  function resolveName(mid: string, ring: "dataType" | "dataStore" | "identity"): { name: string; sub?: string } {
    if (ring === "dataType") return { name: mid, sub: DATA_TYPE_CATEGORY[mid] };
    if (ring === "dataStore") {
      const s = stores.find((st) => st.id === mid);
      return { name: s?.name || mid, sub: s?.subtitle };
    }
    const id = identities.find((i) => i.id === mid);
    return { name: id?.name || mid, sub: id?.email ?? id?.role };
  }

  function toRingPrefix(ring: string): string {
    if (ring === "dataType") return "dt";
    if (ring === "dataStore") return "ds";
    return "id";
  }

  const globalPinOrderMap = new Map<string, number>();
  pinnedOrder.forEach((k, i) => globalPinOrderMap.set(k, i + 1));

  const canShowPanel = (ring: string) => ring !== "dataType";

  const clusterPrefix = toRingPrefix(pinnedRing);
  const pinnedMemberKeys = pinnedPath.filter((k) => k.startsWith(`${clusterPrefix}:`));
  const pinnedMemberCount = pinnedMemberKeys.length;

  // Collapse member list when extra-ring nodes are pinned (other ring panel visible)
  const hasExtraRingPins = pinnedPath.some((k) => !k.startsWith(`${clusterPrefix}:`));
  const [expanded, setExpanded] = useState(!hasExtraRingPins);

  // Auto-collapse when extra-ring pins appear, auto-expand when they're all removed
  const prevHasExtra = useRef(hasExtraRingPins);
  if (prevHasExtra.current !== hasExtraRingPins) {
    prevHasExtra.current = hasExtraRingPins;
    if (hasExtraRingPins) setExpanded(false);
    else setExpanded(true);
  }

  const showMembers = expanded;

  return (
    <div className="rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg overflow-hidden">
      {/* Header — title is the ring label, button is "Unpin" */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-foreground" style={{ fontSize: "13px", fontWeight: 700 }}>
          {pinnedRingLabel}
        </span>
        <button
          onClick={onClearAll}
          className="transition-all"
          style={{
            fontSize: "10px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            padding: "3px 10px",
            borderRadius: "4px",
            fontWeight: 500,
            opacity: 0.85,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}>
          Unpin
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div>
          {/* Cluster row — badge shows global pin order, toggles member list expand/collapse */}
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-surface-raised/50 cursor-pointer"
            style={{ minHeight: "32px" }}
            title={showMembers ? "Click to collapse" : "Click to expand"}
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ width: 16, height: 16, backgroundColor: `${pinnedColor}22`, border: `1.5px solid ${pinnedColor}`, fontSize: "8px", fontWeight: 700, color: pinnedColor }}>
              {globalPinOrderMap.get(pinnedClusterId)}
            </span>
            <span className="flex-1 min-w-0 truncate" style={{ fontSize: "11px", color: pinnedColor, fontWeight: 600 }}>
              {pinnedCluster.label}
              {pinnedMemberCount > 0
                ? ` · ${pinnedMemberCount} selected`
                : ` (${pinnedCluster.count})`}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: showMembers ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Member rows — shown when expanded */}
          {showMembers && pinnedCluster.memberIds.map((mid) => {
            const { name, sub } = resolveName(mid, pinnedRing);
            const nodeKey = `${clusterPrefix}:${mid}`;
            const pinOrder = globalPinOrderMap.get(nodeKey);
            const isPinned = pinnedMemberKeys.includes(nodeKey);
            return (
              <div key={mid}
                className="flex items-center gap-2 hover:bg-surface-raised/50 cursor-pointer"
                style={{ minHeight: "28px", paddingLeft: 28, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}
                title={isPinned ? "Click to unpin" : "Click to pin"}
                onClick={() => onTogglePin(nodeKey)}>
                {isPinned ? (
                  <span className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ width: 16, height: 16, backgroundColor: `${pinnedColor}22`, border: `1.5px solid ${pinnedColor}`, fontSize: "8px", fontWeight: 700, color: pinnedColor }}>
                    {pinOrder}
                  </span>
                ) : (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${pinnedColor}`, backgroundColor: `${pinnedColor}18`, display: "inline-block", flexShrink: 0 }} />
                )}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="truncate" style={{ fontSize: "10.5px", color: pinnedColor, fontWeight: isPinned ? 600 : 400, opacity: isPinned ? 1 : 0.75 }}>
                    {name}
                  </span>
                  {sub && (
                    <span className="flex-shrink-0 text-muted-foreground/40" style={{ fontSize: "8px" }}>
                      {sub}
                    </span>
                  )}
                </div>
                {isPinned && canShowPanel(pinnedRing) && (
                  <button
                    type="button"
                    title="View side panel"
                    onClick={(e) => { e.stopPropagation(); onOpenPanel(nodeKey); }}
                    className="flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                    style={{ width: 20, height: 20, background: "none", border: "none", cursor: "pointer" }}
                  >
                    <PanelRight size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}