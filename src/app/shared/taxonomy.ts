/**
 * Canonical data sensitivity taxonomy for Netskope Data Security.
 *
 * This is the single source of truth for:
 *   - The 8 sensitivity categories (PII, SPII, PSI, PCI, PFI, PHI, PAI, BII)
 *   - Their display colors (vivid 400/500-level, works on dark navy + light backgrounds)
 *   - The full list of 57 sensitive data types the scanner detects
 *   - The mapping from each data type to its parent category
 *
 * Import from here in any page or component that needs category/type information.
 */

// ── 8 Sensitivity Categories ──────────────────────────────────────────────────

export const CATEGORIES = [
  { key: "PII",  label: "PII",  full: "Personally Identifiable Information", color: "#60a5fa" },
  { key: "SPII", label: "SPII", full: "Sensitive PII",                        color: "#f87171" },
  { key: "PSI",  label: "PSI",  full: "Personal Sensitive Information",       color: "#fb923c" },
  { key: "PCI",  label: "PCI",  full: "Payment Card Industry",                color: "#fbbf24" },
  { key: "PFI",  label: "PFI",  full: "Personal Financial Information",       color: "#34d399" },
  { key: "PHI",  label: "PHI",  full: "Protected Health Information",         color: "#22d3ee" },
  { key: "PAI",  label: "PAI",  full: "Personal Account Information",         color: "#c084fc" },
  { key: "BII",  label: "BII",  full: "Business Identifiable Information",    color: "#f472b6" },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];

// ── All 57 Sensitive Data Types ───────────────────────────────────────────────

export const ALL_DATA_TYPES: string[] = [
  // PII — direct identifiers and digital identifiers
  "Personal Names", "Email Addresses", "Telephone Numbers",
  "Postal Addresses", "Birthdates", "Gender", "Age", "Nationality",
  "IP Addresses", "MAC Addresses", "Domain Names", "URI Hosts",
  "UUIDs", "Device IDs", "Browser Fingerprints", "Geolocation Data",
  "Vehicle IDs", "Student Records", "Education IDs",
  // SPII — government-issued and highly sensitive IDs
  "Social Security Numbers", "Driver Licenses", "National IDs",
  "Passports", "Taxpayer IDs", "Voter Registration IDs",
  // PSI — sensitive personal attributes
  "Ethnicity and Race", "Marital Status", "Religious Beliefs",
  "Political Opinions", "Sexual Orientation", "Immigration Status",
  // PCI — payment card data
  "Payment Cards",
  // PFI — financial information
  "Bank Account Information", "Financial IDs", "Currency",
  "Securities IDs", "Credit Scores", "Income Information", "Tax Records",
  // PHI — health and medical data
  "Medical Records", "Medical Diagnoses", "Healthcare IDs",
  "Healthcare Provider IDs", "Health Insurance IDs",
  "Prescription Information", "Biometric Data", "Genetic Data",
  // PAI — credentials and account secrets
  "Passwords", "Private Keys", "Public Keys", "Secrets and Tokens",
  "Security Questions", "MFA Seeds",
  // BII — business and intellectual property
  "Source Code", "Company Names", "Trade Secrets", "Legal Privileges",
];

// ── Data Type → Category Mapping ──────────────────────────────────────────────

export const TYPE_TO_CATEGORY: Record<string, CategoryKey> = {
  // PII
  "Personal Names": "PII",       "Email Addresses": "PII",     "Telephone Numbers": "PII",
  "Postal Addresses": "PII",     "Birthdates": "PII",           "Gender": "PII",
  "Age": "PSI",                  "Nationality": "PII",          "IP Addresses": "PII",
  "MAC Addresses": "PII",        "Domain Names": "PII",         "URI Hosts": "PII",
  "Gender": "PSI",
  "UUIDs": "PII",                "Device IDs": "PII",           "Browser Fingerprints": "PII",
  "Geolocation Data": "PII",     "Vehicle IDs": "PII",          "Student Records": "PII",
  "Education IDs": "PII",        "Postal Codes": "PII",
  // SPII
  "Social Security Numbers": "SPII", "Driver Licenses": "SPII", "National IDs": "SPII",
  "Passports": "SPII",               "Taxpayer IDs": "SPII",    "Voter Registration IDs": "SPII",
  // PSI
  "Ethnicity and Race": "PSI",   "Marital Status": "PSI",      "Religious Beliefs": "PSI",
  "Political Opinions": "PSI",   "Sexual Orientation": "PSI",  "Immigration Status": "PSI",
  "Physical Characteristics": "PSI",
  // PCI
  "Payment Cards": "PCI",
  // PFI
  "Bank Account Information": "PFI", "Financial IDs": "PFI",   "Currency": "PFI",
  "Securities IDs": "PFI",           "Credit Scores": "PFI",   "Income Information": "PFI",
  "Tax Records": "PFI",
  // PHI
  "Medical Records": "PHI",      "Medical Diagnoses": "PHI",   "Healthcare IDs": "PHI",
  "Healthcare Provider IDs": "PHI", "Health Insurance IDs": "PHI",
  "Prescription Information": "PHI", "Biometric Data": "PHI",  "Genetic Data": "PHI",
  // PAI
  "Passwords": "PAI",            "Private Keys": "PAI",        "Public Keys": "PAI",
  "Secrets and Tokens": "PAI",   "Security Questions": "PAI",  "MFA Seeds": "PAI",
  // BII
  "Source Code": "BII",          "Company Names": "BII",
  "Trade Secrets": "BII",        "Legal Privileges": "BII",    "Corporate Tax IDs": "BII",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the category key for a given data type, defaulting to "PII". */
export function categoryOf(dataType: string): CategoryKey {
  return TYPE_TO_CATEGORY[dataType] ?? "PII";
}

/** Returns the full category definition object for a given key. */
export function categoryDef(key: CategoryKey) {
  return CATEGORIES.find(c => c.key === key)!;
}
