import LightBgGDrive from "../../../imports/LightBgGDrive";
import LightBgSharePoint from "../../../imports/LightBgSharePoint";
import svgAwsPaths from "../../../imports/svg-nw553jfgsu";
import { Database, HardDrive, AppWindow, Monitor, Globe, Usb } from "lucide-react";

// Fixed-size square container for imported SVG wordmarks (prevents wide logos like AWS from overflowing)
function LogoBox({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <div style={{
      width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

// ── Branded SVG icons ─────────────────────────────────────────────────────────

function GoogleDriveIcon({ size }: { size: number }) {
  return (
    <LogoBox size={size}>
      <LightBgGDrive />
    </LogoBox>
  );
}

function SharePointIcon({ size }: { size: number }) {
  return (
    <LogoBox size={size}>
      <LightBgSharePoint />
    </LogoBox>
  );
}

function AWSS3Icon({ size }: { size: number }) {
  // Render AWS paths directly so the logo scales cleanly inside a square container.
  // The original Figma export applied scaleY(-1) to correct for an inverted coordinate
  // system — replicate that here via an SVG transform on the group.
  // viewBox is 109.733 × 65.632; pad vertically to center in a square.
  return (
    <svg width={size} height={size} viewBox="-5 -22 120 110" preserveAspectRatio="xMidYMid meet" fill="none">
      <g transform="translate(0, 65.6319) scale(1, -1)">
        <path d={svgAwsPaths.p188c35f0} fill="#232F3E" />
        <path d={svgAwsPaths.p3f867800} fill="#232F3E" />
        <path d={svgAwsPaths.pce5e7c0}  fill="#232F3E" />
        <path d={svgAwsPaths.p1c80000}  fill="#FF9900" />
        <path d={svgAwsPaths.p4d2900}   fill="#FF9900" />
      </g>
    </svg>
  );
}

function AzureIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="azureGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="100%" stopColor="#50D9FF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#azureGrad)" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="8"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
      >
        Az
      </text>
    </svg>
  );
}

function PostgreSQLIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#336791" />
      <ellipse cx="12" cy="8" rx="6" ry="2.5" fill="#fff" fillOpacity="0.85" />
      <path
        d="M6 8v7c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V8"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M6 12c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </svg>
  );
}

function OracleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#C74634" />
      <ellipse cx="12" cy="8" rx="6" ry="2.5" fill="#fff" fillOpacity="0.85" />
      <path
        d="M6 8v7c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V8"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M6 12c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </svg>
  );
}

function MySQLIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#00758F" />
      <ellipse cx="12" cy="8" rx="6" ry="2.5" fill="#fff" fillOpacity="0.85" />
      <path
        d="M6 8v7c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V8"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M6 12c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </svg>
  );
}

function SQLServerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#CC2927" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
      >
        SQL
      </text>
    </svg>
  );
}

function AWSRDSIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF9900" />
      <ellipse cx="12" cy="8" rx="6" ry="2.2" fill="#fff" fillOpacity="0.85" />
      <path
        d="M6 8v7c0 1.28 2.69 2.2 6 2.2s6-0.92 6-2.2V8"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M6 12c0 1.28 2.69 2.2 6 2.2s6-0.92 6-2.2" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </svg>
  );
}

function AzureSQLIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="azureSQLGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="100%" stopColor="#50D9FF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#azureSQLGrad)" />
      <ellipse cx="12" cy="8" rx="6" ry="2.2" fill="#fff" fillOpacity="0.85" />
      <path
        d="M6 8v7c0 1.28 2.69 2.2 6 2.2s6-0.92 6-2.2V8"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M6 12c0 1.28 2.69 2.2 6 2.2s6-0.92 6-2.2" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </svg>
  );
}

function SnowflakeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#29B5E8" />
      <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="8.5" x2="19" y2="15.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="19" y1="8.5" x2="5" y2="15.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BigQueryIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#4285F4" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
      >
        BQ
      </text>
    </svg>
  );
}

// ChatGPT / OpenAI — green hex logo
function ChatGPTIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#10A37F" />
      {/* OpenAI mark simplified: outer ring + inner knot */}
      <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2" fill="white" />
    </svg>
  );
}

// Claude / Anthropic — warm sand/orange brand color
function ClaudeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#D97757" />
      {/* Stylized "A" / diamond mark */}
      <path d="M12 6 L16.5 18 H7.5 Z" fill="white" fillOpacity="0.9" />
      <path d="M9.5 14 H14.5" stroke="#D97757" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Gemini / Google — blue gradient, G-inspired mark
function GeminiIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="geminiGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B59F5" />
          <stop offset="100%" stopColor="#EA4335" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#geminiGrad)" />
      {/* Star / sparkle shape */}
      <path d="M12 5 C12 5 13 10 18 12 C13 14 12 19 12 19 C12 19 11 14 6 12 C11 10 12 5 12 5Z" fill="white" fillOpacity="0.9" />
    </svg>
  );
}

// GitHub Copilot — dark background with Copilot goggles mark
function GitHubCopilotIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#24292F" />
      {/* Simplified Copilot "goggles" — two circles connected */}
      <circle cx="9" cy="13" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="15" cy="13" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M11.5 13 H12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 10 C9 8 10.5 7 12 7 C13.5 7 15 8 15 10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export type FallbackVariant = "application" | "endpoint" | "website" | "peripheral" | "store";

/**
 * Returns a branded icon for the given data store type.
 * Designed to be rendered inside the SidePanel header's `titleIcon` slot (28×28 container).
 */
export function DataStoreIcon({
  storeType,
  size = 16,
  fallback = "store",
}: {
  storeType: string;
  size?: number;
  fallback?: FallbackVariant;
}) {
  switch (storeType) {
    // SaaS Unstructured
    case "drives":
      return <GoogleDriveIcon size={size} />;
    case "sharepoint-sites":
      return <SharePointIcon size={size} />;

    // IaaS Unstructured
    case "s3":
      return <AWSS3Icon size={size} />;
    case "azure-blob":
      return <AzureIcon size={size} />;

    // On-Prem Structured
    case "postgresql":
      return <PostgreSQLIcon size={size} />;
    case "oracle":
      return <OracleIcon size={size} />;
    case "mysql":
      return <MySQLIcon size={size} />;
    case "sqlserver":
      return <SQLServerIcon size={size} />;

    // IaaS Structured
    case "rds":
      return <AWSRDSIcon size={size} />;
    case "azure-sql":
      return <AzureSQLIcon size={size} />;
    case "snowflake":
      return <SnowflakeIcon size={size} />;
    case "bigquery":
      return <BigQueryIcon size={size} />;

    // AI Services
    case "chatgpt":
    case "openai":
      return <ChatGPTIcon size={size} />;
    case "claude":
    case "anthropic":
      return <ClaudeIcon size={size} />;
    case "gemini":
      return <GeminiIcon size={size} />;
    case "github-copilot":
      return <GitHubCopilotIcon size={size} />;

    // Generic hardware/endpoint
    case "endpoint":
    case "gcs":
      return <HardDrive size={size} className="text-muted-foreground" />;

    default:
      switch (fallback) {
        case "application": return <AppWindow size={size} className="text-muted-foreground" />;
        case "endpoint":    return <Monitor size={size} className="text-muted-foreground" />;
        case "website":     return <Globe size={size} className="text-muted-foreground" />;
        case "peripheral":  return <Usb size={size} className="text-muted-foreground" />;
        default:            return <Database size={size} className="text-muted-foreground" />;
      }
  }
}
