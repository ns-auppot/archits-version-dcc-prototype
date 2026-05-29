interface VendorMarkProps {
  vendor: string;
  size?: number;
}

const VENDOR_MAP: Record<string, string> = {
  "aws-s3": "logos:aws-s3",
  aws: "logos:aws",
  azure: "logos:microsoft-azure",
  gcp: "logos:google-cloud",
  gdrive: "logos:google-drive",
  sharepoint: "simple-icons:microsoftsharepoint?color=%23038387",
  onedrive: "logos:microsoft-onedrive",
  snowflake: "logos:snowflake-icon",
  postgres: "logos:postgresql",
  oracle: "logos:oracle",
  mysql: "logos:mysql-icon",
  mongo: "logos:mongodb-icon",
  bigquery: "simple-icons:googlebigquery?color=%234285F4",
  databricks: "simple-icons:databricks?color=%23FF3621",
  salesforce: "logos:salesforce",
  box: "logos:box",
  github: "logos:github-icon",
  slack: "logos:slack-icon",
  chatgpt: "logos:openai-icon",
  claude: "logos:claude-icon",
  gemini: "logos:google-gemini",
  copilot: "simple-icons:githubcopilot?color=%2324292F",
  notion: "logos:notion-icon",
  dropbox: "logos:dropbox",
  canva: "simple-icons:canva?color=%2300C4CC",
  descript: "logos:descript",
};

export function VendorMark({ vendor, size = 20 }: VendorMarkProps) {
  const slug = VENDOR_MAP[vendor];
  const radius = Math.max(4, size / 5);

  if (!slug) {
    return (
      <div
        className="inline-flex shrink-0 items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        ?
      </div>
    );
  }

  const url = `https://api.iconify.design/${slug.replace("?", ".svg?")}${slug.includes("?") ? "" : ".svg"}`;

  return (
    <div
      className="inline-flex shrink-0 items-center justify-center bg-white border border-black/5"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <img
        src={url}
        alt={vendor}
        className="object-contain"
        style={{ width: size * 0.62, height: size * 0.62 }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}
