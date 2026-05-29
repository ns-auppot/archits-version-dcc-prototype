import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, User, Server, Bot, AlertTriangle, ShieldAlert, Zap, CheckCircle, LayoutGrid, Box, Database, Wrench, ChevronRight, ChevronDown, Home, X, Calendar, Shield, ShieldCheck, ShieldX, Building2, Globe, Eye, EyeOff, Lock, FileWarning, AlertOctagon, Activity, ArrowRight, ArrowLeft, Sparkles, Cpu, Workflow, Cloud, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Data Definitions ---

const sources = [
  { id: 'internal-users', label: 'Internal Users', count: 15, color: 'bg-slate-500', icon: Users },
  { id: 'external-users', label: 'External Users', count: 9, color: 'bg-sky-500', icon: User },
  { id: 'service-accounts', label: 'Service Accounts', count: 8, color: 'bg-teal-500', icon: Server },
];

const risks = [
  { id: 'data-exfiltration', label: 'Data Exfiltration', subLabel: 'Unauthorized data transfer detected.', type: 'critical', icon: ShieldAlert, count: 4 },
  { id: 'over-exposed', label: 'Over-Exposed Sensitive Data', subLabel: 'Sensitive data with excessive access.', type: 'critical', icon: Eye, count: 10 },
  { id: 'over-privileged', label: 'Over Privilege Identity', subLabel: 'Excessive permissions granted.', type: 'warning', icon: Lock, count: 8 },
  { id: 'stale-data', label: 'Stale Sensitive Data', subLabel: 'Outdated sensitive information.', type: 'warning', icon: FileWarning, count: 6 },
  { id: 'former-employee', label: 'Former employee', subLabel: 'Access from former employees.', type: 'critical', icon: AlertTriangle, count: 5 },
];

const drillDownRisks = [
    { id: 'newly-discovered', label: 'Access Newly Discovered AI Assets', subLabel: 'Monitoring Shadow AI usage', type: 'warning', icon: AlertTriangle, count: 6, category: 'Unsanctioned Usage' },
    { id: 'access-unsanctioned', label: 'Access Unsanctioned AI Assets', subLabel: 'Admin unsanctioned entities', type: 'warning', icon: AlertTriangle, count: 2, category: 'Unsanctioned Usage' },
    { id: 'access-unsafe', label: 'Access Unsafe AI Assets', subLabel: 'Low confidence AI usage', type: 'warning', icon: AlertTriangle, count: 1, category: 'Unsanctioned Usage' }
];

const postureRisks = [
    { id: 'public-posture', label: 'Public Posture', subLabel: 'Resources exposed publicly', type: 'critical', icon: AlertOctagon, count: 3, category: 'Posture Vulnerabilities' },
    { id: 'unencrypted-artifacts', label: 'Unencrypted Artifacts', subLabel: 'Data stored without encryption', type: 'high', icon: AlertOctagon, count: 2, category: 'Posture Vulnerabilities' },
    { id: 'vulnerable-dependencies', label: 'Vulnerable Dependencies', subLabel: 'Libraries with known CVEs', type: 'critical', icon: AlertOctagon, count: 4, category: 'Posture Vulnerabilities' },
    { id: 'over-privileged', label: 'Over-Privileged Identity', subLabel: 'Excessive permissions granted', type: 'warning', icon: AlertOctagon, count: 2, category: 'Posture Vulnerabilities' },
    { id: 'insecure-defaults', label: 'Insecure Default Configs', subLabel: 'Factory settings not changed', type: 'warning', icon: AlertOctagon, count: 1, category: 'Posture Vulnerabilities' }
];

const dataLeakageRisks = [
    { id: 'sensitive-disclosure', label: 'Sensitive Information Disclosure', subLabel: 'PII exposed in models', type: 'critical', icon: ShieldAlert, count: 1, category: 'Data Exfiltration' },
    { id: 'ip-disclosure', label: 'Intellectual Property Disclosure', subLabel: 'Proprietary code leaked', type: 'critical', icon: ShieldAlert, count: 1, category: 'Data Exfiltration' },
    { id: 'secret-disclosure', label: 'Secret & Credential Disclosure', subLabel: 'Secrets and keys exposed', type: 'critical', icon: ShieldAlert, count: 1, category: 'Data Exfiltration' }
];

const maliciousRisks = [
    { id: 'supply-chain', label: 'Supply Chain Poisoning', subLabel: 'Compromised models or dependencies', type: 'critical', icon: Zap, count: 1, category: 'Malicious Attack' },
    { id: 'jailbreak', label: 'Jailbreak Success', subLabel: 'Safety guardrails bypassed', type: 'critical', icon: Zap, count: 1, category: 'Malicious Attack' },
    { id: 'prompt-injection', label: 'Prompt Injection', subLabel: 'Manipulating AI behavior', type: 'critical', icon: Zap, count: 2, category: 'Malicious Attack' },
    { id: 'data-exfiltration', label: 'Data Exfiltration', subLabel: 'Unauthorized data transfer', type: 'critical', icon: ShieldAlert, count: 2, category: 'Malicious Attack' }
];

const destinations = [
  { 
    id: 'ai-apps', 
    label: 'Applications', 
    count: 12, 
    icon: LayoutGrid,
    color: 'text-fuchsia-400',
    stats: [
        { label: 'Sanctioned', value: 7, color: 'bg-blue-500' },
        { label: 'Unsanctioned', value: 5, color: 'bg-yellow-500' }
    ],
    statLabel: 'Sanctioned vs Unsanctioned'
  },
  { 
    id: 'datasets', 
    label: 'Data Store', 
    count: 15, 
    icon: Database,
    color: 'text-pink-400',
    stats: [
        { label: 'Risk Profile', value: 10, color: 'bg-red-500', total: 15, bg: 'bg-emerald-500' }
    ],
    statLabel: 'Risky'
  },
  { 
    id: 'endpoints', 
    label: 'Endpoints', 
    count: 18, 
    icon: Globe,
    color: 'text-cyan-400',
    stats: [
        { label: 'Secure', value: 10, color: 'bg-emerald-500' },
        { label: 'At Risk', value: 8, color: 'bg-red-500' }
    ],
    statLabel: 'Security Status'
  },
];

// Links: Source Index -> Risk Index -> Destination Index
const links = [
    // Source -> Risk
    
    // Data Exfiltration (3)
    { from: 'internal-users', to: 'data-exfiltration', opacity: 0.8, value: 1 },
    { from: 'external-users', to: 'data-exfiltration', opacity: 0.8, value: 1 },
    { from: 'service-accounts', to: 'data-exfiltration', opacity: 0.7, value: 1 },
    
    // Over-Exposed Sensitive Data (10)
    { from: 'internal-users', to: 'over-exposed', opacity: 0.7, value: 5 },
    { from: 'external-users', to: 'over-exposed', opacity: 0.8, value: 3 },
    { from: 'service-accounts', to: 'over-exposed', opacity: 0.6, value: 2 },
    
    // Over Privilege Identity (8)
    { from: 'internal-users', to: 'over-privileged', opacity: 0.6, value: 4 },
    { from: 'service-accounts', to: 'over-privileged', opacity: 0.7, value: 3 },
    { from: 'external-users', to: 'over-privileged', opacity: 0.5, value: 1 },
    
    // Stale Sensitive Data (6)
    { from: 'internal-users', to: 'stale-data', opacity: 0.5, value: 3 },
    { from: 'service-accounts', to: 'stale-data', opacity: 0.6, value: 2 },
    { from: 'external-users', to: 'stale-data', opacity: 0.5, value: 1 },
    
    // Former employee (5)
    { from: 'external-users', to: 'former-employee', opacity: 0.8, value: 3 },
    { from: 'internal-users', to: 'former-employee', opacity: 0.7, value: 2 },
    
    // Risk -> Destination
    
    // Data Exfiltration (3)
    { from: 'data-exfiltration', to: 'datasets', opacity: 0.8, value: 1 },
    { from: 'data-exfiltration', to: 'endpoints', opacity: 0.7, value: 1 },
    { from: 'data-exfiltration', to: 'ai-apps', opacity: 0.7, value: 1 },

    // Over-Exposed Sensitive Data (10)
    { from: 'over-exposed', to: 'datasets', opacity: 0.7, value: 5 },
    { from: 'over-exposed', to: 'endpoints', opacity: 0.6, value: 3 },
    { from: 'over-exposed', to: 'ai-apps', opacity: 0.6, value: 2 },
    
    // Over Privilege Identity (8)
    { from: 'over-privileged', to: 'ai-apps', opacity: 0.6, value: 4 },
    { from: 'over-privileged', to: 'endpoints', opacity: 0.6, value: 3 },
    { from: 'over-privileged', to: 'datasets', opacity: 0.5, value: 1 },
    
    // Stale Sensitive Data (6)
    { from: 'stale-data', to: 'datasets', opacity: 0.6, value: 4 },
    { from: 'stale-data', to: 'endpoints', opacity: 0.5, value: 1 },
    { from: 'stale-data', to: 'ai-apps', opacity: 0.5, value: 1 },

    // Former employee (5)
    { from: 'former-employee', to: 'ai-apps', opacity: 0.7, value: 2 },
    { from: 'former-employee', to: 'datasets', opacity: 0.7, value: 2 },
    { from: 'former-employee', to: 'endpoints', opacity: 0.6, value: 1 },
];

const drillDownLinks = [
    // Source -> DrillDown Risks
    { from: 'internal-users', to: 'newly-discovered', opacity: 0.7, value: 8 },
    { from: 'internal-users', to: 'access-unsanctioned', opacity: 0.5, value: 4 },
    { from: 'internal-users', to: 'access-unsafe', opacity: 0.6, value: 1 },
    { from: 'service-accounts', to: 'access-unsanctioned', opacity: 0.6, value: 1 },
    { from: 'agents', to: 'newly-discovered', opacity: 0.6, value: 1 },
    
    // DrillDown Risks -> Destination
    { from: 'newly-discovered', to: 'ai-apps', opacity: 0.8, value: 8 },
    { from: 'newly-discovered', to: 'tools', opacity: 0.4, value: 2 },
    { from: 'newly-discovered', to: 'ai-models', opacity: 0.5, value: 2 },
    { from: 'access-unsanctioned', to: 'ai-apps', opacity: 0.7, value: 3 },
    { from: 'access-unsanctioned', to: 'tools', opacity: 0.7, value: 1 },
    { from: 'access-unsafe', to: 'ai-apps', opacity: 0.6, value: 1 },
];

const postureLinks = [
    // Source -> DrillDown Risks
    { from: 'internal-users', to: 'public-posture', opacity: 0.7, value: 2 },
    { from: 'internal-users', to: 'vulnerable-dependencies', opacity: 0.7, value: 2 },
    { from: 'internal-users', to: 'over-privileged', opacity: 0.6, value: 2 },
    { from: 'service-accounts', to: 'unencrypted-artifacts', opacity: 0.6, value: 2 },
    { from: 'service-accounts', to: 'insecure-defaults', opacity: 0.6, value: 1 },
    { from: 'agents', to: 'vulnerable-dependencies', opacity: 0.7, value: 2 },
    { from: 'external-users', to: 'public-posture', opacity: 0.8, value: 1 },

    // DrillDown Risks -> Destination
    { from: 'public-posture', to: 'ai-models', opacity: 0.7, value: 3 },
    { from: 'unencrypted-artifacts', to: 'datasets', opacity: 0.7, value: 2 },
    { from: 'vulnerable-dependencies', to: 'tools', opacity: 0.7, value: 4 },
    { from: 'over-privileged', to: 'ai-apps', opacity: 0.6, value: 2 },
    { from: 'insecure-defaults', to: 'tools', opacity: 0.6, value: 1 },
];

const dataLeakageLinks = [
    // Source -> DrillDown Risks
    { from: 'service-accounts', to: 'sensitive-disclosure', opacity: 0.8, value: 1 },
    
    { from: 'internal-users', to: 'ip-disclosure', opacity: 0.8, value: 1 },

    { from: 'external-users', to: 'secret-disclosure', opacity: 0.8, value: 1 },

    // DrillDown Risks -> Destination
    { from: 'sensitive-disclosure', to: 'datasets', opacity: 0.8, value: 1 },
    { from: 'ip-disclosure', to: 'endpoints', opacity: 0.8, value: 1 },
    { from: 'secret-disclosure', to: 'ai-apps', opacity: 0.8, value: 1 },
];

const maliciousLinks = [
    // Source -> DrillDown Risks
    { from: 'external-users', to: 'supply-chain', opacity: 0.7, value: 1 },
    { from: 'external-users', to: 'prompt-injection', opacity: 0.8, value: 1 },
    { from: 'internal-users', to: 'jailbreak', opacity: 0.6, value: 1 },
    { from: 'service-accounts', to: 'data-exfiltration', opacity: 0.8, value: 2 },
    { from: 'agents', to: 'prompt-injection', opacity: 0.7, value: 1 },
    
    // DrillDown Risks -> Destination
    { from: 'supply-chain', to: 'ai-models', opacity: 0.7, value: 1 },
    { from: 'prompt-injection', to: 'ai-apps', opacity: 0.7, value: 1 },
    { from: 'prompt-injection', to: 'ai-models', opacity: 0.7, value: 1 },
    { from: 'jailbreak', to: 'ai-apps', opacity: 0.6, value: 1 },
    { from: 'data-exfiltration', to: 'datasets', opacity: 0.8, value: 2 },
];

const harmfulContentRisks = [
    { id: 'hate-speech', label: 'Hate Speech', subLabel: 'Generation of hate speech.', type: 'critical', icon: FileWarning, count: 2, category: 'Harmful Content' },
    { id: 'violence', label: 'Violence', subLabel: 'Content promoting violence.', type: 'critical', icon: FileWarning, count: 1, category: 'Harmful Content' },
    { id: 'self-harm', label: 'Self-Harm', subLabel: 'Content encouraging self-harm.', type: 'critical', icon: FileWarning, count: 1, category: 'Harmful Content' }
];

const harmfulContentLinks = [
    // Source -> DrillDown Risks
    { from: 'internal-users', to: 'hate-speech', opacity: 0.8, value: 1 },
    { from: 'internal-users', to: 'violence', opacity: 0.8, value: 1 },
    { from: 'external-users', to: 'hate-speech', opacity: 0.8, value: 1 },
    { from: 'external-users', to: 'self-harm', opacity: 0.8, value: 1 },
    
    // DrillDown Risks -> Destination
    { from: 'hate-speech', to: 'ai-models', opacity: 0.8, value: 2 },
    { from: 'violence', to: 'ai-apps', opacity: 0.8, value: 1 },
    { from: 'self-harm', to: 'ai-apps', opacity: 0.8, value: 1 },
];

const protections = [
    { id: 'access-policies', label: 'Access Control', count: 5, subLabel: '5 Access Control Policies', type: 'safe', icon: ShieldCheck },
    { id: 'data-protection', label: 'Data Protection', count: 3, subLabel: '3 Data Protection Policies', type: 'safe', icon: Lock },
    { id: 'threat-policies', label: 'Threat Protection', count: 3, subLabel: '3 Threat Protection Policies', type: 'critical', icon: AlertOctagon },
    { id: 'posture-mgmt', label: 'Posture Management', count: 3, subLabel: '3 Posture Management Policies', type: 'warning', icon: FileWarning },
    { id: 'not-protected', label: 'Not Protected', count: 3, subLabel: 'Entities without active protection', type: 'critical', icon: ShieldX }
];

const protectionLinks = [
    // Source -> Protection
    { from: 'internal-users', to: 'access-policies', opacity: 0.6, value: 4 },
    { from: 'internal-users', to: 'data-protection', opacity: 0.5, value: 3 },
    { from: 'internal-users', to: 'not-protected', opacity: 0.4, value: 3 },
    { from: 'external-users', to: 'threat-policies', opacity: 0.8, value: 2 },
    { from: 'external-users', to: 'posture-mgmt', opacity: 0.7, value: 1 },
    { from: 'service-accounts', to: 'access-policies', opacity: 0.6, value: 1 },
    { from: 'service-accounts', to: 'not-protected', opacity: 0.4, value: 1 },
    { from: 'agents', to: 'threat-policies', opacity: 0.6, value: 1 },
    { from: 'agents', to: 'posture-mgmt', opacity: 0.5, value: 2 },
    
    // Protection -> Destination
    { from: 'access-policies', to: 'ai-apps', opacity: 0.7, value: 3 },
    { from: 'access-policies', to: 'tools', opacity: 0.6, value: 2 },
    { from: 'data-protection', to: 'datasets', opacity: 0.8, value: 3 },
    { from: 'threat-policies', to: 'ai-models', opacity: 0.6, value: 2 },
    { from: 'threat-policies', to: 'ai-apps', opacity: 0.5, value: 1 },
    { from: 'posture-mgmt', to: 'tools', opacity: 0.5, value: 2 },
    { from: 'posture-mgmt', to: 'ai-models', opacity: 0.6, value: 1 },
    { from: 'not-protected', to: 'ai-apps', opacity: 0.4, value: 3 },
    { from: 'not-protected', to: 'ai-models', opacity: 0.4, value: 1 },
];

// --- Mock Data for Drawer ---
const MOCK_APPS = [
    { id: '1', name: 'ChatGPT', vendor: 'OpenAI', type: '3rd Party', status: 'unsanctioned', ccl: 88, firstSeen: '2023-01-15', lastSeen: '2 mins ago', icon: Bot, isNew: true },
    { id: '2', name: 'Jasper AI', vendor: 'Jasper', type: '3rd Party', status: 'unsanctioned', ccl: 75, firstSeen: '2023-03-10', lastSeen: '1 hour ago', icon: Zap, isNew: true },
    { id: '3', name: 'Claude 2', vendor: 'Anthropic', type: '3rd Party', status: 'sanctioned', ccl: 90, firstSeen: '2023-05-01', lastSeen: '10 mins ago', icon: Sparkles, isNew: false },
    { id: '5', name: 'Midjourney', vendor: 'Midjourney Inc', type: '3rd Party', status: 'unsanctioned', ccl: 55, firstSeen: 'Jan 6, 2026', lastSeen: '1 day ago', icon: Box, isNew: true },
    { id: '6', name: 'GitHub Copilot', vendor: 'GitHub', type: '3rd Party', status: 'sanctioned', ccl: 95, firstSeen: '2022-11-01', lastSeen: 'Just now', icon: Bot, isNew: false },
    { id: '7', name: 'Intercom AI', vendor: 'Intercom', type: '3rd Party', status: 'sanctioned', ccl: 85, firstSeen: '2023-01-20', lastSeen: '30 mins ago', icon: Zap, isNew: false },
    { id: '8', name: 'Customer-Bot', vendor: 'Internal', type: 'In-House', status: 'unsanctioned', ccl: 45, firstSeen: '2024-06-15', lastSeen: '4 hours ago', icon: Bot, isNew: false },
    { id: '9', name: 'HR-Assistant', vendor: 'Internal', type: 'In-House', status: 'sanctioned', ccl: 80, firstSeen: '2024-02-10', lastSeen: '5 mins ago', icon: Bot, isNew: false }
];

const MOCK_USERS = [
    { id: 'u1', name: 'Alice Engineering', email: 'alice@corp.com', dept: 'Engineering', risk: 'High', activity: 'Data Exfiltration attempt' },
    { id: 'u2', name: 'Bob Marketing', email: 'bob@corp.com', dept: 'Marketing', risk: 'Medium', activity: 'Unsanctioned App Usage' },
    { id: 'u3', name: 'Charlie Sales', email: 'charlie@corp.com', dept: 'Sales', risk: 'Low', activity: 'Normal Usage' },
    { id: 'u4', name: 'Dave Product', email: 'dave@corp.com', dept: 'Product', risk: 'Medium', activity: 'Shadow IT Usage' },
    { id: 'u5', name: 'Eve HR', email: 'eve@corp.com', dept: 'HR', risk: 'Low', activity: 'Policy Violation' },
    { id: 'u6', name: 'Frank Finance', email: 'frank@corp.com', dept: 'Finance', risk: 'High', activity: 'Sensitive Data Access' },
    { id: 'u7', name: 'Grace Legal', email: 'grace@corp.com', dept: 'Legal', risk: 'Low', activity: 'Routine Check' },
    { id: 'u8', name: 'Heidi Ops', email: 'heidi@corp.com', dept: 'Operations', risk: 'Medium', activity: 'Misconfigured Tool' },
    { id: 'u9', name: 'Ivan IT', email: 'ivan@corp.com', dept: 'IT', risk: 'Low', activity: 'Admin Access' },
    { id: 'u10', name: 'Mike Research', email: 'mike@corp.com', dept: 'Research', risk: 'Low', activity: 'Research' },
    { id: 'u11', name: 'Dev Team', email: 'dev-team', dept: 'Engineering', risk: 'Low', activity: 'Dev' },
    { id: 'u12', name: 'Data Sci', email: 'data-sci', dept: 'Research', risk: 'Low', activity: 'Research' },
    { id: 'u13', name: 'Dev Ops', email: 'dev-ops', dept: 'Operations', risk: 'Low', activity: 'Ops' },
    { id: 'u14', name: 'Researcher', email: 'researcher', dept: 'Research', risk: 'Low', activity: 'Research' }
];

const MOCK_AGENTS = [
    { id: 'a1', name: 'HR Support Bot', type: 'Internal', risk: 'Medium', activity: 'Jailbreak attempt detected', isNew: false, status: 'unsanctioned', ccl: 65, icon: Bot },
    { id: 'a2', name: 'Code Review Agent', type: 'Internal', risk: 'Low', activity: 'Routine scan', isNew: false, status: 'sanctioned', ccl: 90, icon: Bot },
    { id: 'a3', name: 'Customer Service AI', type: 'External', risk: 'High', activity: 'Prompt Injection Suspected', isNew: true, status: 'unsanctioned', ccl: 40, icon: Bot },
    { id: 'a4', name: 'Sales Assistant', type: 'Internal', risk: 'Low', activity: 'Lead qualification', isNew: false, status: 'sanctioned', ccl: 85, icon: Bot },
    { id: 'a5', name: 'IT Helpdesk Bot', type: 'Internal', risk: 'Low', activity: 'Ticket triage', isNew: false, status: 'sanctioned', ccl: 88, icon: Bot },
    { id: 'a6', name: 'Marketing Copy Agent', type: 'External', risk: 'Medium', activity: 'Generating campaigns', isNew: true, status: 'unsanctioned', ccl: 60, icon: Bot }
];

const MOCK_AI_SERVICES = [
    { id: 's1', name: 'AWS Bedrock', type: 'Cloud', risk: 'Low', activity: 'Normal', isNew: false, status: 'sanctioned', ccl: 95, icon: Cloud },
    { id: 's2', name: 'Azure OpenAI', type: 'Cloud', risk: 'Low', activity: 'Normal', isNew: false, status: 'sanctioned', ccl: 95, icon: Cloud },
    { id: 's3', name: 'Google Vertex AI', type: 'Cloud', risk: 'Medium', activity: 'Misconfiguration detected', isNew: true, status: 'unsanctioned', ccl: 70, icon: Cloud },
    { id: 's4', name: 'Local Ollama', type: 'On-prem', risk: 'High', activity: 'Unsanctioned access', isNew: true, status: 'unsanctioned', ccl: 30, icon: Server },
    { id: 's5', name: 'HuggingFace Inference', type: 'Cloud', risk: 'Low', activity: 'Normal', isNew: false, status: 'sanctioned', ccl: 80, icon: Cloud },
    { id: 's6', name: 'Private vLLM Cluster', type: 'On-prem', risk: 'Low', activity: 'Normal', isNew: false, status: 'sanctioned', ccl: 90, icon: Server }
];

const MOCK_MCPS = [
    { id: 'mcp1', name: 'GitHub MCP', type: 'Connected', risk: 'Low', activity: 'Code sync', isNew: false, status: 'sanctioned', ccl: 92, icon: Workflow },
    { id: 'mcp2', name: 'Slack MCP', type: 'Connected', risk: 'Medium', activity: 'Message reading', isNew: false, status: 'sanctioned', ccl: 78, icon: Workflow },
    { id: 'mcp3', name: 'Notion MCP', type: 'Connected', risk: 'Low', activity: 'Doc retrieval', isNew: false, status: 'sanctioned', ccl: 85, icon: Workflow },
    { id: 'mcp4', name: 'Jira MCP', type: 'Disconnected', risk: 'High', activity: 'Auth failure', isNew: true, status: 'unsanctioned', ccl: 45, icon: Workflow }
];

const MOCK_AI_MODELS = [
    { id: 'm1', name: 'Llama 2 70B', type: 'Public', risk: 'Medium', params: '70B', hosted: 'External', flows: ['unsanctioned', 'access-unsanctioned', 'newly-discovered'], isNew: true, status: 'unsanctioned' },
    { id: 'm2', name: 'GPT-4 Fine-tune', type: 'Private', risk: 'Low', params: 'Unknown', hosted: 'Azure', flows: ['allowed'], isNew: false, status: 'sanctioned' },
    { id: 'm3', name: 'Internal Embedding v3', type: 'Private', risk: 'Low', params: '1.2B', hosted: 'On-prem', flows: ['allowed'], isNew: false, status: 'sanctioned' },
    { id: 'm4', name: 'Mistral 7B Uncensored', type: 'Public', risk: 'Critical', params: '7B', hosted: 'Local', flows: ['malicious', 'supply-chain', 'newly-discovered'], isNew: true, status: 'unsanctioned' }
];

const MOCK_TOOLS = [
    { id: 't1', name: 'LangChain', category: 'Orchestration', risk: 'Low', usage: 'High', flows: ['allowed', 'newly-discovered'], isNew: true },
    { id: 't2', name: 'Pinecone', category: 'Vector DB', risk: 'Medium', usage: 'Medium', flows: ['allowed', 'newly-discovered'], isNew: true },
    { id: 't3', name: 'Zapier', category: 'Automation', risk: 'High', usage: 'Low', flows: ['unsanctioned'], isNew: false },
    { id: 't4', name: 'AutoGPT Script', category: 'Agent', risk: 'Critical', usage: 'Rare', flows: ['malicious', 'jailbreak'], isNew: false },
    { id: 't5', name: 'ImaGen-X', category: 'Image Generation', risk: 'Medium', usage: 'Medium', flows: ['unsanctioned'], isNew: false }
];

const MOCK_DATASETS = [
    { id: 'd1', name: 'Customer PII v1', type: 'Sensitive', risk: 'High', size: '50GB', location: 'S3-West', flows: ['data-leakage', 'sensitive-disclosure'] },
    { id: 'd2', name: 'Public Training Data', type: 'Public', risk: 'Low', size: '2TB', location: 'Hugging Face', flows: ['allowed'] },
    { id: 'd3', name: 'Financial Records 2024', type: 'Sensitive', risk: 'Critical', size: '120GB', location: 'On-prem', flows: ['malicious', 'jailbreak'] },
    { id: 'd4', name: 'S3-Bucket', type: 'Sensitive', risk: 'Critical', size: 'Unknown', location: 'AWS', flows: ['malicious', 'data-exfiltration'] }
];

const MOCK_UNSANCTIONED_EVENTS = [
    // ChatGPT (13 Identities)
    { id: 'u1', user: 'alice@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '2m ago', type: 'App', isNew: true, traffic: '1.2 MB', category: 'Productivity' },
    { id: 'u9', user: 'Customer Service AI', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '1h ago', type: 'App', isNew: true, traffic: '50 MB', category: 'Chatbot' },
    { id: 'cg3', user: 'bob@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '5m ago', type: 'App', isNew: true, traffic: '1 MB', category: 'Productivity' },
    { id: 'cg4', user: 'charlie@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '10m ago', type: 'App', isNew: true, traffic: '2.1 MB', category: 'Productivity' },
    { id: 'cg5', user: 'dave@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '12m ago', type: 'App', isNew: true, traffic: '800 KB', category: 'Productivity' },
    { id: 'cg6', user: 'eve@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '20m ago', type: 'App', isNew: true, traffic: '500 KB', category: 'Productivity' },
    { id: 'cg7', user: 'frank@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '25m ago', type: 'App', isNew: true, traffic: '1.5 MB', category: 'Productivity' },
    { id: 'cg8', user: 'grace@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '30m ago', type: 'App', isNew: true, traffic: '900 KB', category: 'Productivity' },
    { id: 'cg9', user: 'heidi@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '40m ago', type: 'App', isNew: true, traffic: '1.1 MB', category: 'Productivity' },
    { id: 'cg10', user: 'ivan@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '45m ago', type: 'App', isNew: true, traffic: '2 MB', category: 'Productivity' },
    { id: 'cg11', user: 'mike@corp.com', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '50m ago', type: 'App', isNew: true, traffic: '3 MB', category: 'Productivity' },
    { id: 'cg12', user: 'dev-team', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '1h ago', type: 'App', isNew: true, traffic: '10 MB', category: 'Productivity' },
    { id: 'cg13', user: 'data-sci', identityCount: 1, app: 'ChatGPT', risk: 'High', time: '1h ago', type: 'App', isNew: true, traffic: '5 MB', category: 'Productivity' },
    
    // Malicious Attack specific mock for investigation
    { 
        id: 'malicious-pii-exfil-1', 
        user: 'Anonymous User', 
        identityCount: 1, 
        app: 'ChatGPT', 
        risk: 'Critical', 
        time: '1h ago', 
        type: 'Prompt Injection Causing PII Exfiltration', 
        target: 'Support-Bot-v2',
        isNew: true, 
        traffic: 'High', 
        category: 'Malicious Attack',
        severity: 'Critical',
        source: 'External', 
        groupType: 'malicious'
    },

    // Jasper AI (8 Identities)
    { id: 'u3', user: 'dev-team', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '1h ago', type: 'App', isNew: true, traffic: '5.8 MB', category: 'Development' },
    { id: 'ja2', user: 'alice@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '2h ago', type: 'App', isNew: true, traffic: '2 MB', category: 'Development' },
    { id: 'ja3', user: 'bob@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '2h ago', type: 'App', isNew: true, traffic: '1.5 MB', category: 'Development' },
    { id: 'ja4', user: 'charlie@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '3h ago', type: 'App', isNew: true, traffic: '3 MB', category: 'Development' },
    { id: 'ja5', user: 'dave@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '3h ago', type: 'App', isNew: true, traffic: '1 MB', category: 'Development' },
    { id: 'ja6', user: 'eve@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '4h ago', type: 'App', isNew: true, traffic: '2.5 MB', category: 'Development' },
    { id: 'ja7', user: 'frank@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '4h ago', type: 'App', isNew: true, traffic: '1.2 MB', category: 'Development' },
    { id: 'ja8', user: 'grace@corp.com', identityCount: 1, app: 'Jasper AI', risk: 'High', time: '5h ago', type: 'App', isNew: true, traffic: '4 MB', category: 'Development' },

    // Customer-Bot (5 Identities)
    { id: 'u11', user: 'dev-team', identityCount: 1, app: 'Customer-Bot', risk: 'High', time: '4h ago', type: 'App', isNew: false, traffic: '500 MB', category: 'Chatbot' },
    { id: 'cb2', user: 'alice@corp.com', identityCount: 1, app: 'Customer-Bot', risk: 'High', time: '4h ago', type: 'App', isNew: false, traffic: '100 MB', category: 'Chatbot' },
    { id: 'cb3', user: 'bob@corp.com', identityCount: 1, app: 'Customer-Bot', risk: 'High', time: '5h ago', type: 'App', isNew: false, traffic: '200 MB', category: 'Chatbot' },
    { id: 'cb4', user: 'charlie@corp.com', identityCount: 1, app: 'Customer-Bot', risk: 'High', time: '5h ago', type: 'App', isNew: false, traffic: '150 MB', category: 'Chatbot' },
    { id: 'cb5', user: 'dave@corp.com', identityCount: 1, app: 'Customer-Bot', risk: 'High', time: '6h ago', type: 'App', isNew: false, traffic: '50 MB', category: 'Chatbot' },

    // Other Events
    { id: 'u2', user: 'bob@corp.com', identityCount: 5, app: 'ImaGen-X', risk: 'Medium', time: '15m ago', type: 'Tool', isNew: false, traffic: '450 KB', category: 'Image Generation' },
    { id: 'u4', user: 'mike@corp.com', identityCount: 3, app: 'LangChain', risk: 'Low', time: '3h ago', type: 'Tool', isNew: true, traffic: '200 KB', category: 'Orchestration' },
    { id: 'u5', user: 'data-sci', identityCount: 15, app: 'Llama 2 70B', risk: 'Medium', time: '4h ago', type: 'Model', isNew: true, traffic: '12 GB', category: 'LLM' },
    { id: 'u6', user: 'dev-ops', identityCount: 4, app: 'Pinecone', risk: 'Medium', time: '5h ago', type: 'Tool', isNew: true, traffic: '500 KB', category: 'Vector DB' },
    { id: 'u7', user: 'researcher', identityCount: 2, app: 'Mistral 7B Uncensored', risk: 'Critical', time: '6h ago', type: 'Model', isNew: true, traffic: '8 GB', category: 'LLM' },
    { id: 'u8', user: 'CI/CD Pipeline', identityCount: 1, app: 'Zapier', risk: 'High', time: '10m ago', type: 'Tool', isNew: false, traffic: '2 MB', category: 'Automation' },
    { id: 'u10', user: 'eve@corp.com', identityCount: 1, app: 'Midjourney', risk: 'Low', time: '2h ago', type: 'App', isNew: true, traffic: '300 MB', category: 'Image Generation' },
    { id: 'sa-u1', user: 'CI/CD Pipeline', identityCount: 1, app: 'Jasper AI', risk: 'Medium', time: '3h ago', type: 'App', isNew: false, traffic: '1.5 GB', category: 'Development' },
    { id: 'sa-u2', user: 'CI/CD Pipeline', identityCount: 1, app: 'Zapier', risk: 'High', time: '4h ago', type: 'Tool', isNew: false, traffic: '10 MB', category: 'Automation' },
    // Add Agent usage of Tools
    { id: 'ag-u1', user: 'Code Review Agent', identityCount: 1, app: 'Pinecone', risk: 'Low', time: '5h ago', type: 'Tool', isNew: true, traffic: '1 MB', category: 'Vector DB' }
];

const MOCK_MALICIOUS_EVENTS = [
    { id: 'm1', source: 'Ext IP 88.2.1.1', type: 'Prompt Injection Causing PII Exfiltration', severity: 'Critical', target: 'Customer-Bot', time: 'Just now' },
    { id: 'm2', source: 'internal-user', type: 'Jailbreak', severity: 'High', target: 'HR-Assistant', time: '5m ago' },
    { id: 'm3', source: 'Service Acct', type: 'Data Exfiltration', severity: 'Critical', target: 'S3-Bucket', time: '1h ago' },
    { id: 'm4', source: 'Customer Service AI', type: 'Prompt Injection', severity: 'Critical', target: 'Llama 2 70B', time: '20m ago' },
    { id: 'm5', source: 'Backup Service', type: 'Data Exfiltration', severity: 'High', target: 'Financial Records 2024', time: '2h ago' },
    { id: 'm6', source: 'Ext IP 45.33.12.8', type: 'Supply Chain Poisoning', severity: 'Critical', target: 'Mistral 7B Uncensored', time: '15m ago' },
    { id: 'm7', source: 'Service Acct', type: 'Prompt Injection', severity: 'High', target: 'Llama 2 70B', time: '30m ago' },
    { id: 'm8', source: 'Backup Service', type: 'Jailbreak', severity: 'Critical', target: 'Customer-Bot', time: '45m ago' },
    { id: 'm9', source: 'internal-user', type: 'Jailbreak', severity: 'Critical', target: 'AutoGPT Script', time: '1h ago' },
    // New events to populate Tools view for External Users and Agents
    { id: 'm10', source: 'Ext IP 192.168.1.50', type: 'Jailbreak', severity: 'Critical', target: 'AutoGPT Script', time: '2h ago' },
    { id: 'm11', source: 'HR Support Bot', type: 'Prompt Injection', severity: 'High', target: 'LangChain', time: '3h ago' }
];

const MOCK_HARMFUL_EVENTS = [
    { id: 'h1', source: 'internal-user', type: 'Hate Speech', severity: 'Critical', target: 'Llama 2 70B', time: '10m ago' },
    { id: 'h2', source: 'external-user', type: 'Violence', severity: 'High', target: 'ChatGPT', time: '1h ago' },
    { id: 'h3', source: 'external-user', type: 'Self-Harm', severity: 'Critical', target: 'Claude 2', time: '2h ago' },
    { id: 'h4', source: 'internal-user', type: 'Hate Speech', severity: 'High', target: 'Llama 2 70B', time: '3h ago' }
];

const MOCK_POSTURE_EVENTS = [
    { id: 'p1', label: 'Public Posture', subLabel: 'Publicly Accessible Model', count: 1, type: 'critical', severity: 'Critical', source: 'external-users', target: 'Llama 2 70B', category: 'Posture Vulnerabilities', time: '10m ago' },
    { id: 'p2', label: 'Unencrypted Artifacts', subLabel: 'S3 Bucket Unencrypted', count: 1, type: 'high', severity: 'High', source: 'service-accounts', target: 'S3-Bucket', category: 'Posture Vulnerabilities', time: '1h ago' },
    { id: 'p3', label: 'Vulnerable Dependencies', subLabel: 'LangChain CVE-2023-1234', count: 1, type: 'critical', severity: 'Critical', source: 'internal-users', target: 'LangChain', category: 'Posture Vulnerabilities', time: '2h ago' },
    { id: 'p4', label: 'Over-Privileged Identity', subLabel: 'Admin Access to Chatbot', count: 1, type: 'warning', severity: 'Medium', source: 'internal-users', target: 'Customer-Bot', category: 'Posture Vulnerabilities', time: '3h ago' },
    { id: 'p5', label: 'Insecure Default Configs', subLabel: 'Default API Key in Code', count: 1, type: 'warning', severity: 'Medium', source: 'service-accounts', target: 'Zapier', category: 'Posture Vulnerabilities', time: '4h ago' },
    { id: 'p6', label: 'Vulnerable Dependencies', subLabel: 'Old Python Lib in Agent', count: 1, type: 'critical', severity: 'Critical', source: 'agents', target: 'Code Review Agent', category: 'Posture Vulnerabilities', time: '5h ago' }
];

const MOCK_DLP_EVENTS = [
    { id: 'd1', user: 'Engineer', data: 'Customer PII', dest: 'Personal Dropbox', action: 'Blocked', time: '10m ago', subRisk: 'sensitive-disclosure', type: 'Data', name: 'Personal Dropbox' },
    { id: 'd2', user: 'Engineer', data: 'Source Code', dest: 'Mega.nz', action: 'Blocked', time: '15m ago', subRisk: 'ip-disclosure', type: 'Data', name: 'Mega.nz' },
    { id: 'd3', user: 'Analyst', data: 'Financial Report', dest: 'Google Drive (Personal)', action: 'Flagged', time: '1h ago', subRisk: 'sensitive-disclosure', type: 'Data', name: 'Google Drive (Personal)' },
    { 
        id: 'd4', 
        user: 'Engineer', 
        data: 'Customer PII', 
        dest: 'Personal Cloud', 
        source: 'Google Drive', 
        action: 'Blocked', 
        time: '5m ago', 
        subRisk: 'sensitive-disclosure', 
        type: 'Data', 
        name: 'Personal Cloud',
        details: 'User downloaded PII from Google Drive and uploaded to Personal Cloud' 
    }
];

const MOCK_OVER_EXPOSED_EVENTS = [
    { id: 'oe1', name: 'HR Payroll 2025', user: 'Everyone', risk: 'Critical', time: '10m ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Shared with Everyone' },
    { id: 'oe2', name: 'Employee Salaries', user: 'Public Link', risk: 'Critical', time: '20m ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Publicly Accessible' },
    { id: 'oe3', name: 'Customer PII v2', user: 'Everyone', risk: 'High', time: '1h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Shared with Everyone' },
    { id: 'oe4', name: 'Patient Records', user: 'Public Link', risk: 'Critical', time: '2h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Publicly Accessible' },
    { id: 'oe5', name: 'Q4 Financials', user: 'Everyone', risk: 'High', time: '3h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Shared with Everyone' },
    { id: 'oe6', name: 'Strategy Doc', user: 'Everyone', risk: 'Medium', time: '4h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Shared with Everyone' },
    { id: 'oe7', name: 'Interview Notes', user: 'Public Link', risk: 'High', time: '5h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Publicly Accessible' },
    { id: 'oe8', name: 'VPN Config', user: 'Everyone', risk: 'Critical', time: '6h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Shared with Everyone' },
    { id: 'oe9', name: 'Admin Keys', user: 'Public Link', risk: 'Critical', time: '7h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Publicly Accessible' },
    { id: 'oe10', name: 'Source Code Backup', user: 'Everyone', risk: 'High', time: '8h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Shared with Everyone' }
];

const MOCK_OVER_PRIVILEGED_EVENTS = [
    { id: 'op1', name: 'HR Reporting Service', user: 'Service Account', risk: 'Critical', time: '5m ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Access to HR Data' },
    { id: 'op2', name: 'Finance Reporting Service', user: 'Service Account', risk: 'Critical', time: '15m ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Access to Finance Data' },
    { id: 'op3', name: 'Backup Job', user: 'Service Account', risk: 'High', time: '1h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Full Admin Access' },
    { id: 'op4', name: 'Analytics Bot', user: 'Service Account', risk: 'High', time: '2h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Access to PII' },
    { id: 'op5', name: 'CI/CD Runner', user: 'Service Account', risk: 'Medium', time: '3h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Write Access to Prod' },
    { id: 'op6', name: 'Monitoring Tool', user: 'Service Account', risk: 'Medium', time: '4h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Access to Secrets' },
    { id: 'op7', name: 'Log Collector', user: 'Service Account', risk: 'Low', time: '5h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Broad Read Access' },
    { id: 'op8', name: 'Legacy App', user: 'Service Account', risk: 'High', time: '6h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Root Privileges' }
];

const MOCK_STALE_DATA_EVENTS = [
    { id: 'sd1', name: 'PCI Dataset 2023', user: 'System', risk: 'High', time: '1y ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Unused > 1 year' },
    { id: 'sd2', name: 'Customer Logs 2022', user: 'System', risk: 'Medium', time: '2y ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Unused > 2 years' },
    { id: 'sd3', name: 'Legacy Backup', user: 'System', risk: 'High', time: '18m ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Unused > 18 months' },
    { id: 'sd4', name: 'Old Marketing List', user: 'System', risk: 'Low', time: '1y ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Unused > 1 year' },
    { id: 'sd5', name: 'Test Data v1', user: 'System', risk: 'Low', time: '3y ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Unused > 3 years' },
    { id: 'sd6', name: 'Archived Emails', user: 'System', risk: 'Medium', time: '2y ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Unused > 2 years' }
];

const MOCK_FORMER_EMPLOYEE_EVENTS = [
    { id: 'fe1', name: 'jdoe@corp.com', user: 'Terminated User', risk: 'Critical', time: 'Active Now', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Accessing CRM' },
    { id: 'fe2', name: 'asmith@corp.com', user: 'Terminated User', risk: 'High', time: '1h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Accessing Email' },
    { id: 'fe3', name: 'bbrown@corp.com', user: 'Terminated User', risk: 'Critical', time: '2h ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'API Key Usage' },
    { id: 'fe4', name: 'cwhite@corp.com', user: 'Terminated User', risk: 'Medium', time: '1d ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Login Attempt' },
    { id: 'fe5', name: 'dgreen@corp.com', user: 'Terminated User', risk: 'High', time: '2d ago', type: 'Posture', category: 'Posture Vulnerabilities', subLabel: 'Accessing Code Repo' }
];

const MOCK_ALLOWED_EVENTS = [
    { id: 'a1', user: 'eng-lead', app: 'GitHub Copilot', activity: 'Code Completion', status: 'Approved', time: '1m ago' },
    { id: 'a2', user: 'marketing', app: 'Claude 2', activity: 'Content Gen', status: 'Monitored', time: '12m ago' },
    { id: 'a3', user: 'support', app: 'Intercom AI', activity: 'Response Draft', status: 'Approved', time: '1h ago' },
    { id: 'a4', user: 'data-sci', app: 'Public Training Data', activity: 'Model Training', status: 'Approved', time: '2h ago', type: 'Data' }
];

const MOCK_SERVICE_ACCOUNTS = [
    { id: 'sa1', name: 'CI/CD Pipeline', type: 'Service Account', risk: 'High', activity: 'Unusual Volume' },
    { id: 'sa2', name: 'Backup Service', type: 'Service Account', risk: 'Low', activity: 'Routine' }
];

const MOCK_EXTERNAL_USERS = [
    { id: 'eu1', ip: '192.168.1.1', location: 'Unknown', risk: 'Critical', activity: 'Brute Force' },
    { id: 'eu2', ip: '10.0.0.1', location: 'USA', risk: 'High', activity: 'Data Exfiltration' },
    { id: 'eu3', ip: '172.16.0.1', location: 'China', risk: 'Medium', activity: 'Port Scanning' },
    { id: 'eu4', ip: '45.33.12.8', location: 'Russia', risk: 'Critical', activity: 'Supply Chain Poisoning' },
    { id: 'eu5', ip: '88.2.1.1', location: 'Unknown', risk: 'Critical', activity: 'Prompt Injection' }
];

// --- Risk Insights Data --- (Kept for compatibility, though not explicitly used in main render loop here)
const RISK_INSIGHTS = [
    { 
        id: 'r1', 
        title: 'Supply Chain Poisoning', 
        count: 1, 
        severity: 'critical',
        relatedNodeIds: ['datasets', 'malicious'],
        items: []
    }
];

import { RiskDetailsPanel } from './RiskDetailsPanel';
import { AllowedUsageModal } from './AllowedUsageModal';
import { AppDetailsPanel } from './AppDetailsPanel';
import { ModelDetailsPanel } from './ModelDetailsPanel';
import { DatasetDetailsPanel } from './DatasetDetailsPanel';
import { ToolDetailsPanel } from './ToolDetailsPanel';
import { RiskEntityCard } from './RiskEntityCard';
import { AssetListCard } from './AssetListCard';
import { Button } from '@/app/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Filter } from 'lucide-react';

interface OverviewSankeyProps {
    onNavigate?: (viewId: string, filter?: string) => void;
    viewMode?: 'risk' | 'protection';
    initialRiskFilter?: 'all' | 'critical' | 'high' | 'medium' | 'low';
    initialFocusPath?: string[];
    initialSelectedEventId?: string | null;
}

export function OverviewSankey({ 
    onNavigate, 
    viewMode = 'risk', 
    initialRiskFilter = 'all',
    initialFocusPath = [],
    initialSelectedEventId = null
}: OverviewSankeyProps) {
    const [focusPath, setFocusPath] = useState<string[]>(initialFocusPath);
    const [showFocusInfo, setShowFocusInfo] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

    // Sync initial props to state when they change
    useEffect(() => {
        if (initialFocusPath.length > 0) {
            setFocusPath(initialFocusPath);
        }
    }, [initialFocusPath]);

    useEffect(() => {
        if (initialSelectedEventId) {
            // Find the event in mock data
            // We search in MOCK_UNSANCTIONED_EVENTS (which now includes malicious events)
            const event = MOCK_UNSANCTIONED_EVENTS.find(e => e.id === initialSelectedEventId);
            if (event) {
                setSelectedEvent(event);
                setSelectedEventType(event.groupType === 'malicious' ? 'Malicious Attack' : 'Unsanctioned Usage');
            }
        }
    }, [initialSelectedEventId]);
    const [showRisks, setShowRisks] = useState(true);
    const [activeRiskFilter, setActiveRiskFilter] = useState<string | null>(null);
    const [riskLevelFilter, setRiskLevelFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>(initialRiskFilter);
    const [activeTab, setActiveTab] = useState<'risks' | 'identities' | 'assets'>('risks');
    const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
    
    // New State for Drill Down
    // const [drillDownView, setDrillDownView] = useState<string | null>(null);

    // Selection states for side panels
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [selectedDataset, setSelectedDataset] = useState<any>(null);
    const [selectedTool, setSelectedTool] = useState<any>(null);

    // Sanctioned Events State
    const [sanctionedIds, setSanctionedIds] = useState<Set<string>>(new Set());

    const handleSanction = () => {
        if (!selectedEvent) return;
        
        // Identify the key to sanction (Group Name for Apps, or ID for others)
        let keyToSanction = selectedEvent.id;
        
        // If it's an App group event, we want to sanction the App Name
        if (selectedEvent.app || selectedEvent.target || selectedEvent.dest) {
            const name = selectedEvent.app || selectedEvent.target || selectedEvent.dest;
            // Check if this name corresponds to a known App/Tool/Model
            if (MOCK_APPS.some(a => a.name === name) || MOCK_TOOLS.some(t => t.name === name) || MOCK_AI_MODELS.some(m => m.name === name)) {
                keyToSanction = name;
            }
        }

        setSanctionedIds(prev => {
            const next = new Set(prev);
            next.add(keyToSanction);
            return next;
        });

        toast.success(`${keyToSanction} has been sanctioned`);

        // Find the next unsanctioned item to focus on
        // We must sort by Severity (Critical -> Low) to match the visual list order
        const allEvents = MOCK_UNSANCTIONED_EVENTS;
        
        // Group by App to determine max severity for sorting
        const appSeverities: Record<string, number> = {};
        
        allEvents.forEach(e => {
            if (!e.app) return;
            // Calculate severity value: Critical=4, High=3, Medium=2, Low=1
            let val = 1;
            const s = e.risk || e.severity || 'Low';
            const lower = String(s).toLowerCase();
            if (lower.includes('critical')) val = 4;
            else if (lower.includes('high')) val = 3;
            else if (lower.includes('medium')) val = 2;
            
            if (!appSeverities[e.app] || val > appSeverities[e.app]) {
                appSeverities[e.app] = val;
            }
        });

        const uniqueAppNames = Array.from(new Set(allEvents.map(e => e.app))).filter(Boolean);
        
        // Sort by Severity Descending
        uniqueAppNames.sort((a, b) => {
            const valA = appSeverities[a] || 0;
            const valB = appSeverities[b] || 0;
            return valB - valA; // Descending
        });
        
        // Find current index
        const currentIndex = uniqueAppNames.indexOf(keyToSanction);
        
        let nextAppToSelect = null;
        
        // Look forward from current index
        if (currentIndex !== -1) {
            for (let i = currentIndex + 1; i < uniqueAppNames.length; i++) {
                const appName = uniqueAppNames[i];
                if (!sanctionedIds.has(appName) && appName !== keyToSanction) {
                    nextAppToSelect = appName;
                    break;
                }
            }
        }
        
        // If not found forward, finding anything available that isn't sanctioned (Wrap around)
        if (!nextAppToSelect) {
             nextAppToSelect = uniqueAppNames.find(app => app !== keyToSanction && !sanctionedIds.has(app));
        }

        if (nextAppToSelect) {
            const nextEvent = allEvents.find(e => e.app === nextAppToSelect);
            if (nextEvent) {
                // Determine event type for the panel
                let nextType = 'unsanctioned'; 
                if (MOCK_AI_MODELS.some(m => m.name === nextAppToSelect)) nextType = 'model';
                else if (MOCK_TOOLS.some(t => t.name === nextAppToSelect)) nextType = 'tool';
                
                setSelectedEvent(nextEvent);
                setSelectedEventType(nextType);
                return;
            }
        }

        // If no next item found, close the panel
        setSelectedEvent(null);
        setSelectedEventType(null);
    };

    const getMiddleNodes = () => {
        return viewMode === 'risk' ? risks : protections;
    };

    const getLinks = () => {
        return viewMode === 'risk' ? links : protectionLinks;
    };

    const currentMiddleNodes = getMiddleNodes();
    const currentLinks = getLinks();

    // Fixed layout dimensions
    const containerHeight = 700;
    const col1X = 20;   
    const col2X = 400;  
    const col3X = 800;  

    // Calculate Y positions
    const getSourceY = (i: number) => {
        const step = 113; // Reduced spacing to 70% of 161
        const nodeHeight = 64;
        const visualHeight = (sources.length - 1) * step + nodeHeight;
        const topY = Math.max(20, (containerHeight - visualHeight) / 2);
        // Returns the center Y coordinate (rendering subtracts 32)
        return topY + i * step + (nodeHeight / 2);
    };
    
    const getRiskY = (i: number) => {
        const step = viewMode === 'risk' ? 110 : 135;
        const nodeHeight = 80;
        
        if (currentMiddleNodes.length === 0) return 0;

        const visualHeight = (currentMiddleNodes.length - 1) * step + nodeHeight;
        const topY = Math.max(20, (containerHeight - visualHeight) / 2);
        
        return topY + i * step;
    };

    const getDestY = (i: number) => {
        const step = 100;
        const nodeHeight = 64;
        
        if (destinations.length === 0) return 0;

        const visualHeight = (destinations.length - 1) * step + nodeHeight;
        const topY = Math.max(20, (containerHeight - visualHeight) / 2);
        return topY + i * step;
    };

    // Helper to get coordinates
    const getCoords = (id: string) => {
        const sIndex = sources.findIndex(s => s.id === id);
        // Corrected x-coordinate to be the right edge of the centered source node
        // Node container is shifted left by col1X (20px) and is 240px wide.
        // Content is card style. Right edge at 240px.
        // Absolute X = col1X + 240.
        if (sIndex !== -1) return { x: col1X + 240, y: getSourceY(sIndex) }; 

        const rIndex = currentMiddleNodes.findIndex(r => r.id === id);
        if (rIndex !== -1) return { x: col2X + 30, y: getRiskY(rIndex) + 40 };

        const dIndex = destinations.findIndex(d => d.id === id);
        if (dIndex !== -1) return { x: col3X + 30, y: getDestY(dIndex) + 32 };

        return { x: 0, y: 0 };
    };

    // Right side of risk cards for outgoing links
    const getRiskRightCoords = (id: string) => {
        const rIndex = currentMiddleNodes.findIndex(r => r.id === id);
        if (rIndex !== -1) return { x: col2X + 280, y: getRiskY(rIndex) + 40 };
        return { x: 0, y: 0 };
    };

    // --- Panning & Zooming Logic ---
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [zoom, setZoom] = useState(1);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => setZoom(1);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setScrollLeft(containerRef.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX); 
        containerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // --- Filtering Logic ---

    const getNodeLabel = (id: string) => {
        const item = [...sources, ...risks, ...drillDownRisks, ...dataLeakageRisks, ...maliciousRisks, ...protections, ...destinations].find(x => x.id === id);
        return item ? item.label : id;
    };

    const isConnected = (from: string, to: string) => {
        return currentLinks.some(l => l.from === from && l.to === to);
    };

    const { filteredLinks, activeNodeIds } = useMemo(() => {
        // Filter Middle Nodes based on Risk Level
        let filteredMiddleNodes = currentMiddleNodes;
        if (riskLevelFilter !== 'all') {
            filteredMiddleNodes = currentMiddleNodes.filter(node => {
                if (riskLevelFilter === 'critical') return node.type === 'critical';
                if (riskLevelFilter === 'high') return node.type === 'high';
                if (riskLevelFilter === 'medium') return node.type === 'warning';
                if (riskLevelFilter === 'low') return node.type === 'neutral' || node.type === 'safe';
                return true;
            });
        }
        
        const validMiddleNodeIds = new Set(filteredMiddleNodes.map(n => n.id));

        if (focusPath.length === 0) {
            // Apply risk level filter to global view
            const activeLinks = currentLinks.filter(l => {
                if (currentMiddleNodes.some(r => r.id === l.to)) {
                    return validMiddleNodeIds.has(l.to);
                }
                if (currentMiddleNodes.some(r => r.id === l.from)) {
                    return validMiddleNodeIds.has(l.from);
                }
                return true;
            });

            return { 
                filteredLinks: activeLinks, 
                activeNodeIds: new Set([
                    ...sources.map(s => s.id), 
                    ...filteredMiddleNodes.map(m => m.id), 
                    ...destinations.map(d => d.id)
                ]) 
            };
        }

        // --- Unified Filtering Logic (Constraint-Based) ---
        
        // 1. Initial Candidates based on Selection & Global Filters
        let candidateSources = new Set(sources.map(s => s.id));
        let candidateRisks = validMiddleNodeIds; 
        let candidateDests = new Set(destinations.map(d => d.id));

        const selSource = focusPath.find(id => sources.some(s => s.id === id));
        if (selSource) candidateSources = new Set([selSource]);

        const selRisk = focusPath.find(id => currentMiddleNodes.some(r => r.id === id));
        if (selRisk) {
             if (candidateRisks.has(selRisk)) candidateRisks = new Set([selRisk]);
             else candidateRisks = new Set(); // Selected risk is hidden by global filter
        }

        const selDest = focusPath.find(id => destinations.some(d => d.id === id));
        if (selDest) candidateDests = new Set([selDest]);

        // 2. Backward Propagation (Dest -> Risk -> Source)
        // Restrict Risks to those that feed into Candidate Dests
        // Note: We use currentLinks to find connections
        const risksToDests = new Set(currentLinks.filter(l => candidateDests.has(l.to) && (l.value || 0) > 0).map(l => l.from));
        // Valid risks must be in candidates AND connect to valid dests
        let validRisks = new Set([...candidateRisks].filter(r => risksToDests.has(r)));

        // Restrict Sources to those that feed into Valid Risks (from previous step)
        const sourcesToRisks = new Set(currentLinks.filter(l => validRisks.has(l.to) && (l.value || 0) > 0).map(l => l.from));
        let validSources = new Set([...candidateSources].filter(s => sourcesToRisks.has(s)));

        // 3. Forward Propagation (Source -> Risk -> Dest)
        // Restrict Risks to those reachable from Valid Sources
        const risksFromSources = new Set(currentLinks.filter(l => validSources.has(l.from) && (l.value || 0) > 0).map(l => l.to));
        validRisks = new Set([...validRisks].filter(r => risksFromSources.has(r)));

        // Restrict Dests to those reachable from Valid Risks
        const destsFromRisks = new Set(currentLinks.filter(l => validRisks.has(l.from) && (l.value || 0) > 0).map(l => l.to));
        let validDests = new Set([...candidateDests].filter(d => destsFromRisks.has(d)));

        // 4. Custom Story Override
        // Ensure "Data Exfiltration -> Agents" specifically highlights "Internal Users"
        if (focusPath.includes('data-leakage') && focusPath.includes('dst-agents')) {
             validSources = new Set(['internal-users']);
             // Re-verify connectivity forward from the forced source
             // But strictly speaking, the user wants to SEE Internal Users. The links will exist if validRisks/validDests allow.
             // data-leakage is in validRisks (since it's selected).
             // dst-agents is in validDests (since it's selected).
             // internal-users -> data-leakage link exists.
        }

        const activeLinks = currentLinks.filter(l => {
            if (sources.some(s => s.id === l.from)) {
                return validSources.has(l.from) && validRisks.has(l.to);
            }
            if (currentMiddleNodes.some(r => r.id === l.from)) {
                return validRisks.has(l.from) && validDests.has(l.to);
            }
            return false;
        });

        const activeNodes = new Set<string>(focusPath);

        activeLinks.forEach(l => {
            activeNodes.add(l.from);
            activeNodes.add(l.to);
        });

        return { filteredLinks: activeLinks, activeNodeIds: activeNodes };
    }, [focusPath, currentLinks, currentMiddleNodes, riskLevelFilter]);

    const { totalIncoming, totalOutgoing } = useMemo(() => {
        const inc: Record<string, number> = {};
        const out: Record<string, number> = {};
        currentLinks.forEach(l => {
            out[l.from] = (out[l.from] || 0) + (l.value || 0);
            inc[l.to] = (inc[l.to] || 0) + (l.value || 0);
        });
        return { totalIncoming: inc, totalOutgoing: out };
    }, [currentLinks]);

    const { activeIncoming, activeOutgoing } = useMemo(() => {
        const inc: Record<string, number> = {};
        const out: Record<string, number> = {};
        filteredLinks.forEach(l => {
            out[l.from] = (out[l.from] || 0) + (l.value || 0);
            inc[l.to] = (inc[l.to] || 0) + (l.value || 0);
        });
        return { activeIncoming: inc, activeOutgoing: out };
    }, [filteredLinks]);

    const handleNodeClick = (id: string) => {
        setPopupPanel(null); // Close popup if open
        if (focusPath.includes(id)) {
            setFocusPath(prev => prev.filter(p => p !== id));
            // Keep panel open even when deselecting (reverting to global view)
            setShowRisks(true);
        } else {
            const item = [...sources, ...currentMiddleNodes, ...destinations].find(x => x.id === id);
            
            // Set Default Tab based on Node Type
            setActiveTab('risks');

            // Handle Drill Down Navigation
            const isSource = sources.some(s => s.id === id);
            const isRisk = currentMiddleNodes.some(r => r.id === id);
            const isDest = destinations.some(d => d.id === id);

            let newPath = [...focusPath];
            if (isSource) newPath = newPath.filter(p => !sources.some(s => s.id === p));
            if (isRisk) newPath = newPath.filter(p => !currentMiddleNodes.some(r => r.id === p));
            if (isDest) newPath = newPath.filter(p => !destinations.some(d => d.id === p));
            
            setFocusPath([...newPath, id]);
            setShowRisks(true);
        }
    };

    const handleClearFocus = () => {
        setPopupPanel(null);
        setFocusPath([]);
        setShowRisks(true);
    };

    const handlePopFocus = () => {
        setFocusPath(prev => prev.slice(0, -1));
    };

    // --- Sankey Calculation Logic (Applied to Filtered Links) ---
    const LINK_SCALE = 2.5; 
    
    // Calculate node totals (Only for active links to ensure proper stacking)
    const nodeOutgoing: Record<string, number> = {};
    const nodeIncoming: Record<string, number> = {};

    filteredLinks.forEach(link => {
        const width = (link.value || 0) * LINK_SCALE;
        nodeOutgoing[link.from] = (nodeOutgoing[link.from] || 0) + width;
        nodeIncoming[link.to] = (nodeIncoming[link.to] || 0) + width;
    });

    const currentOutgoing: Record<string, number> = {};
    const currentIncoming: Record<string, number> = {};

    // --- Drawer Render Logic ---
    const activeNodeId = focusPath.length > 0 ? focusPath[focusPath.length - 1] : null;

    // Helper to classify events by source type (Defined outside useMemo to be accessible in render scope)
    const getSourceType = (identity: string) => {
        if (!identity) return 'unknown';
        if (identity.includes('@corp.com') || ['dev-team', 'data-sci', 'dev-ops', 'researcher', 'internal-user', 'eng-lead', 'marketing', 'support'].includes(identity)) return 'internal-users';
        if (identity.includes('Ext IP') || identity.includes('External')) return 'external-users';
        if (identity === 'Service Acct' || identity.includes('Pipeline') || identity.includes('Backup')) return 'service-accounts';
        if (identity.toLowerCase().includes('agent') || identity.toLowerCase().includes('bot') || identity === 'Customer Service AI') return 'agents';
        return 'unknown';
    };

    // --- Popup Panel State ---
    const [popupPanel, setPopupPanel] = useState<{
        isOpen: boolean;
        type: 'identities' | 'assets';
        nodeId: string;
        title: string;
    } | null>(null);

    // --- Data Aggregation Logic (Lifted for Sync) ---
    const { relatedEvents, relatedRiskListEvents, identityCount, assetCount, riskCounts } = useMemo(() => {
        // 1. Determine the Universe of Events
        let universeEvents: any[] = [
            ...MOCK_UNSANCTIONED_EVENTS,
            ...MOCK_MALICIOUS_EVENTS,
            ...MOCK_DLP_EVENTS,
            ...MOCK_POSTURE_EVENTS,
            ...MOCK_HARMFUL_EVENTS,
            ...MOCK_ALLOWED_EVENTS,
            ...MOCK_OVER_EXPOSED_EVENTS,
            ...MOCK_OVER_PRIVILEGED_EVENTS,
            ...MOCK_STALE_DATA_EVENTS,
            ...MOCK_FORMER_EMPLOYEE_EVENTS
        ];

        // 2. Filter Universe by Focus Path (Intersection)
        let filteredEvents = universeEvents;
        let riskListEvents = universeEvents;
        
        // Apply Risk Level Filter
        if (riskLevelFilter !== 'all') {
             const filterFn = (e: any) => {
                 let severity = e.risk || e.severity || e.action || 'Medium';
                 
                 // Heuristic for App Groups which might not have explicit severity on the event if it's just usage
                 // But wait, events usually have 'risk'.
                 // If it is an event that doesn't have explicit severity, we might need to derive it.
                 if (e.action === 'Blocked') severity = 'Critical';
                 else if (e.action === 'Flagged') severity = 'High';
                 
                 const severityLower = String(severity).toLowerCase();
                 
                 if (riskLevelFilter === 'critical') return severityLower.includes('critical') || severityLower.includes('blocked');
                 if (riskLevelFilter === 'high') return severityLower.includes('high') || severityLower.includes('flagged');
                 if (riskLevelFilter === 'medium') return severityLower.includes('medium') || severityLower.includes('warning');
                 if (riskLevelFilter === 'low') return severityLower.includes('low') || severityLower.includes('approved') || severityLower.includes('monitored');
                 return false;
             };
             filteredEvents = filteredEvents.filter(filterFn);
             riskListEvents = riskListEvents.filter(filterFn);
        }

        // Apply Source/Dest Node Filters from Focus Path
        // We need to check if the current focusPath implies filtering by specific nodes
        if (focusPath.length > 0) {
            const hasSourceConstraint = focusPath.some(id => sources.some(s => s.id === id));
            // Check if focusPath has any destination category OR any specific asset (which is neither source nor risk)
            const hasDestConstraint = focusPath.some(id => 
                destinations.some(d => d.id === id) || 
                (!sources.some(s => s.id === id) && !currentMiddleNodes.some(r => r.id === id))
            );
            const hasRiskConstraint = focusPath.some(id => currentMiddleNodes.some(r => r.id === id));

            if (hasSourceConstraint) {
                const fn = (e: any) => {
                    const id = e.user || e.source || e.id;
                    const type = getSourceType(id);
                    return focusPath.includes(type);
                };
                filteredEvents = filteredEvents.filter(fn);
                riskListEvents = riskListEvents.filter(fn);
            }

            if (hasRiskConstraint) {
                const activeRiskId = focusPath.find(id => currentMiddleNodes.some(r => r.id === id));
                const fn = (e: any) => {
                    if (activeRiskId === 'unsanctioned') return MOCK_UNSANCTIONED_EVENTS.some(u => u.id === e.id);
                    if (activeRiskId === 'data-leakage' || activeRiskId === 'data-exfiltration') return MOCK_DLP_EVENTS.some(d => d.id === e.id);
                    if (activeRiskId === 'over-exposed') return MOCK_OVER_EXPOSED_EVENTS.some(o => o.id === e.id);
                    if (activeRiskId === 'over-privileged') return MOCK_OVER_PRIVILEGED_EVENTS.some(o => o.id === e.id);
                    if (activeRiskId === 'stale-data') return MOCK_STALE_DATA_EVENTS.some(s => s.id === e.id);
                    if (activeRiskId === 'former-employee') return MOCK_FORMER_EMPLOYEE_EVENTS.some(f => f.id === e.id);
                    if (activeRiskId === 'malicious') return MOCK_MALICIOUS_EVENTS.some(m => m.id === e.id);
                    if (activeRiskId === 'posture-risk') return MOCK_POSTURE_EVENTS.some(p => p.id === e.id);
                    if (activeRiskId === 'allowed') return MOCK_ALLOWED_EVENTS.some(a => a.id === e.id);
                    return true;
                };
                filteredEvents = filteredEvents.filter(fn);
                riskListEvents = riskListEvents.filter(fn);
            }

            if (hasDestConstraint) {
                // Strict Filtering for Stats/Identities
                filteredEvents = filteredEvents.filter(e => {
                    // Normalize target identification: Priority to Data for datasets, then others
                    const target = e.data || e.app || e.target || e.dest;
                    
                    const isApp = MOCK_APPS.some(a => a.name === target) || e.type === 'App';
                    const isModel = MOCK_AI_MODELS.some(m => m.name === target) || e.type === 'Model' || e.category === 'LLM';
                    const isTool = MOCK_TOOLS.some(t => t.name === target) || e.type === 'Tool';
                    const isDataset = !!e.data || MOCK_DATASETS.some(d => d.name === target) || e.type === 'Data';

                    // Check for specific item selection (e.g., "Midjourney")
                    // If a specific leaf node is selected, priority should be given to it over the category wildcard
                    const categories = ['ai-apps', 'ai-models', 'tools', 'datasets'];
                    // We can identify specific targets as those that are not categories, sources, or risk nodes
                    const specificTargets = focusPath.filter(p => 
                        !categories.includes(p) && 
                        !sources.some(s => s.id === p) && 
                        !currentMiddleNodes.some(n => n.id === p)
                    );
                    
                    if (specificTargets.length > 0) {
                        return specificTargets.includes(target);
                    }

                    if (focusPath.includes('ai-apps') && isApp) return true;
                    if (focusPath.includes('ai-models') && isModel) return true;
                    if (focusPath.includes('tools') && isTool) return true;
                    if (focusPath.includes('datasets') && isDataset) return true;
                    return false;
                });

                // Relaxed Filtering for Risk List (Show Siblings)
                riskListEvents = riskListEvents.filter(e => {
                    const target = e.app || e.target || e.dest || e.data;
                    const isApp = MOCK_APPS.some(a => a.name === target) || e.type === 'App';
                    const isModel = MOCK_AI_MODELS.some(m => m.name === target) || e.type === 'Model' || e.category === 'LLM';
                    const isTool = MOCK_TOOLS.some(t => t.name === target) || e.type === 'Tool';
                    const isDataset = MOCK_DATASETS.some(d => d.name === target) || e.type === 'Data';

                    // Check if any explicit category is selected in the path
                    // If a category (like 'ai-apps') is selected, we filter to show only items of that category.
                    // If NO category is selected (e.g. only a specific leaf node like 'Midjourney' is selected), 
                    // we show ALL items (preserving the full list context).
                    const activeCategories = ['ai-apps', 'ai-models', 'tools', 'datasets'].filter(c => focusPath.includes(c));
                    
                    if (activeCategories.length === 0) return true;

                    if (activeCategories.includes('ai-apps') && isApp) return true;
                    if (activeCategories.includes('ai-models') && isModel) return true;
                    if (activeCategories.includes('tools') && isTool) return true;
                    if (activeCategories.includes('datasets') && isDataset) return true;
                    
                    return false;
                });
            }
        }

        // Calculate specific counts for Graph Nodes based on these filtered events
        const identityCounts: Record<string, number> = {};
        
        // Internal Users
        const internalUserEvents = filteredEvents.filter(e => getSourceType(e.user || e.source) === 'internal-users');
        const uniqueInternalUsers = new Set(internalUserEvents.map(e => e.user || e.source));
        // If Global View (no drill down, no focus), show total. 
        // If Drill Down, show unique participants.
        // Special case: If "Internal Users" is selected at top level, we might want to show Inventory size (9).
        // But if we are in "Unsanctioned" drill down, we want to show only those involved (7).
        if (focusPath.length === 0) {
             identityCounts['internal-users'] = 14; // Static Inventory Size
             identityCounts['external-users'] = 3;
             identityCounts['service-accounts'] = 2;
             identityCounts['agents'] = 3;
        } else {
            identityCounts['internal-users'] = uniqueInternalUsers.size;
            
            const uniqueExternal = new Set(filteredEvents.filter(e => getSourceType(e.user || e.source) === 'external-users').map(e => e.user || e.source));
            identityCounts['external-users'] = uniqueExternal.size;

            const uniqueService = new Set(filteredEvents.filter(e => getSourceType(e.user || e.source) === 'service-accounts').map(e => e.user || e.source));
            identityCounts['service-accounts'] = uniqueService.size;

            const uniqueAgents = new Set(filteredEvents.filter(e => getSourceType(e.user || e.source) === 'agents').map(e => e.user || e.source));
            identityCounts['agents'] = uniqueAgents.size;

            // Fix for "Jumping Counts" when selecting a source node
            // If we are strictly viewing a Source Category (Global View), show Inventory Count
            // This prevents the count from dropping from "Inventory Size" to "Active Event Size" when clicked.
            if (focusPath.length === 1) {
                if (focusPath[0] === 'internal-users') identityCounts['internal-users'] = 14;
                if (focusPath[0] === 'external-users') identityCounts['external-users'] = 3;
                if (focusPath[0] === 'service-accounts') identityCounts['service-accounts'] = 2;
                if (focusPath[0] === 'agents') identityCounts['agents'] = 3;
            }
        }
        
        // Assets
        // Calculate asset counts based on the filtered events to match side panel
        const assetCounts: Record<string, number> = {};
        
        if (focusPath.length === 0) {
            // Global View (Default) - Show Total Inventory Counts
            assetCounts['ai-apps'] = MOCK_APPS.length;
            assetCounts['ai-models'] = MOCK_AI_MODELS.length;
            assetCounts['tools'] = MOCK_TOOLS.length;
            assetCounts['datasets'] = MOCK_DATASETS.length;
        } else if (focusPath.length === 1 && destinations.some(d => d.id === focusPath[0])) {
            // Global View (Node Selected) - Stick to Inventory Counts
            assetCounts['ai-apps'] = MOCK_APPS.length;
            assetCounts['ai-models'] = MOCK_AI_MODELS.length;
            assetCounts['tools'] = MOCK_TOOLS.length;
            assetCounts['datasets'] = MOCK_DATASETS.length;
        } else {
            // Drill Down / Event Filtered View - Show Unique Items in Events
            // Note: Side panel derives assets from filteredEvents. We must do the exact same counting.
            
            // Helper to check if event matches a destination category
            // DLP Events: 'data' field is the primary asset for Datasets
            const getAssetName = (e: any) => e.data || e.app || e.target || e.dest;

            const isApp = (e: any) => MOCK_APPS.some(a => a.name === getAssetName(e)) || e.type === 'App';
            const isModel = (e: any) => MOCK_AI_MODELS.some(m => m.name === getAssetName(e)) || e.type === 'Model' || e.category === 'LLM';
            const isTool = (e: any) => MOCK_TOOLS.some(t => t.name === getAssetName(e)) || e.type === 'Tool' || e.category === 'Orchestration' || e.category === 'Vector DB' || e.category === 'Automation';
            const isDataset = (e: any) => !!e.data || MOCK_DATASETS.some(d => d.name === getAssetName(e)) || e.type === 'Data';

            const uniqueApps = new Set(filteredEvents.filter(isApp).map(getAssetName));
            assetCounts['ai-apps'] = uniqueApps.size;

            const uniqueModels = new Set(filteredEvents.filter(isModel).map(getAssetName));
            assetCounts['ai-models'] = uniqueModels.size;

            const uniqueTools = new Set(filteredEvents.filter(isTool).map(getAssetName));
            assetCounts['tools'] = uniqueTools.size;

            const uniqueDatasets = new Set(filteredEvents.filter(isDataset).map(getAssetName));
            assetCounts['datasets'] = uniqueDatasets.size;
        }

        // 3. Calculate Dynamic Risk Node Counts (Middle Layer)
        const riskCounts: Record<string, number> = {};
        
        // Helper to check event against risk categories
        const isUnsanctioned = (e: any) => MOCK_UNSANCTIONED_EVENTS.some(u => u.id === e.id);
        const isDLP = (e: any) => MOCK_DLP_EVENTS.some(d => d.id === e.id);
        const isMalicious = (e: any) => MOCK_MALICIOUS_EVENTS.some(m => m.id === e.id);
        const isPosture = (e: any) => MOCK_POSTURE_EVENTS.some(p => p.id === e.id);
        const isAllowed = (e: any) => MOCK_ALLOWED_EVENTS.some(a => a.id === e.id);

        const getGroupKey = (e: any) => {
             // For Unsanctioned/Allowed -> Group by App
             if (e.app) return e.app;
             // For Malicious -> Group by Type + Target
             if (isMalicious(e)) return `malicious-${e.type}-${e.target}`;
             // For DLP -> Group by Dest
             if (isDLP(e)) return e.dest;
             // For Posture -> Group by Label
             if (isPosture(e)) return e.label;
             return e.id;
        };

        // Standard counts
        riskCounts['unsanctioned'] = new Set(filteredEvents.filter(isUnsanctioned).map(getGroupKey)).size;
        riskCounts['data-leakage'] = new Set(filteredEvents.filter(isDLP).map(getGroupKey)).size;
        riskCounts['malicious'] = new Set(filteredEvents.filter(isMalicious).map(getGroupKey)).size;
        riskCounts['posture-risk'] = new Set(filteredEvents.filter(isPosture).map(getGroupKey)).size;
        riskCounts['allowed'] = new Set(filteredEvents.filter(isAllowed).map(getGroupKey)).size;

        return { relatedEvents: filteredEvents, relatedRiskListEvents: riskListEvents, identityCount: identityCounts, assetCount: assetCounts, riskCounts };
    }, [focusPath, sources, currentMiddleNodes, destinations]);

    const getDeepDiveAction = (nodeId: string | null) => {
        if (!nodeId) return null;
        
        // Context-aware deep dive based on drill down view or active node
        const contextId = nodeId;
        
        switch (contextId) {
            case 'external-users':
                return { label: "Deep dive to external exposure analysis view", viewId: "external-exposure" };
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full bg-white dark:bg-slate-950 relative overflow-hidden flex">
            {/* Warning Banner */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-pink-500 text-white px-6 py-3 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-sm font-semibold">
                        This is not the Risk design file. Please refer to the other Figma Make files.
                    </p>
                </div>
            </div>
            
            <motion.div 
                animate={{ 
                    width: selectedEvent ? 0 : "100%",
                    opacity: selectedEvent ? 0 : 1,
                    flexGrow: selectedEvent ? 0.00001 : 1 // Use flexGrow instead of flex to avoid unitless string interpolation issues
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col h-full overflow-hidden relative min-w-0"
            >
            {/* Header / Breadcrumb / Toggle */}
            <div className="w-full px-8 pt-6 pb-2 z-20 flex items-center gap-3 shrink-0 h-[68px] mt-12">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-4 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                            <Filter size={14} />
                            {riskLevelFilter === 'all' ? 'All Risks' : 
                                riskLevelFilter === 'critical' ? 'Critical Risks' :
                                riskLevelFilter === 'high' ? 'High Risks' :
                                riskLevelFilter === 'medium' ? 'Medium Risks' : 'Low Risks'}
                            <ChevronDown size={14} className="opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setRiskLevelFilter('all')}>
                            All Risks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRiskLevelFilter('critical')}>
                            Critical Risks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRiskLevelFilter('high')}>
                            High Risks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRiskLevelFilter('medium')}>
                            Medium Risks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRiskLevelFilter('low')}>
                            Low Risks
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {(focusPath.length > 0) && (
                    <div className="flex items-center gap-3 px-4 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Focused:</span>
                            <div className="flex items-center gap-2">
                                {focusPath.map(id => (
                                    <button
                                        key={id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNodeClick(id);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/30 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/30 group"
                                    >
                                        {getNodeLabel(id)}
                                        <X size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                            <button 
                                onClick={handleClearFocus}
                                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors px-1"
                            >
                                Clear
                            </button>
                    </div>
                )}
            </div>

                {/* Main Sankey Area */}
                <div 
                    ref={containerRef} 
                    className="flex-1 relative h-full overflow-hidden cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    <div 
                        className="mx-auto relative h-full"
                        style={{
                            width: `${1200 * zoom}px`,
                            minWidth: `${1200 * zoom}px`,
                        }}
                    >
                        <div 
                            className="absolute top-0 left-0 h-full w-[1200px]"
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left',
                            }}
                        >
                    {/* SVG Connections */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {filteredLinks.map((link, i) => {
                            let startBase, endBase;
                            
                            // Identify start/end points
                            const sIndex = sources.findIndex(s => s.id === link.from);
                            if (sIndex !== -1) {
                                startBase = { x: col1X + 240, y: getSourceY(sIndex) };
                                endBase = getCoords(link.to);
                            } else {
                                startBase = getRiskRightCoords(link.from);
                                endBase = getCoords(link.to);
                            }

                            if (!startBase || (startBase.x === 0 && startBase.y === 0)) return null;
                            if (!endBase || (endBase.x === 0 && endBase.y === 0)) return null;

                            // Calculate width
                            const width = (link.value || 0) * LINK_SCALE;
                            
                            if (width <= 0) return null;

                            // Calculate offsets to stack lines
                            const startTotal = nodeOutgoing[link.from] || 0;
                            const endTotal = nodeIncoming[link.to] || 0;

                            const startOffset = (currentOutgoing[link.from] || 0) - (startTotal / 2) + (width / 2);
                            const endOffset = (currentIncoming[link.to] || 0) - (endTotal / 2) + (width / 2);

                            // Update accumulators
                            currentOutgoing[link.from] = (currentOutgoing[link.from] || 0) + width;
                            currentIncoming[link.to] = (currentIncoming[link.to] || 0) + width;

                            // Apply offsets
                            const start = { x: startBase.x, y: startBase.y + startOffset };
                            const end = { x: endBase.x, y: endBase.y + endOffset };

                            // Bezier Control Points
                            const dist = end.x - start.x;
                            const cp1 = { x: start.x + dist * 0.4, y: start.y };
                            const cp2 = { x: end.x - dist * 0.4, y: end.y };

                            const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

                            return (
                                <motion.path
                                    key={`${link.from}-${link.to}`} // Stable key
                                    d={d}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.6 }}
                                    transition={{ duration: 0.5 }}
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth={width}
                                    strokeLinecap="butt"
                                    className="hover:stroke-blue-400 cursor-pointer transition-colors duration-300"
                                    onClick={() => {
                                        handleNodeClick(link.from);
                                    }}
                                />
                            );
                        })}
                    </svg>

                    {/* Source Column */}
                    <div className="absolute top-0 left-0 bottom-0 w-[260px] flex flex-col justify-start gap-14 pt-[80px] pointer-events-none">
                        {sources.map((source, i) => {
                            const active = activeOutgoing[source.id] || 0;
                            const total = totalOutgoing[source.id] || 1;
                            const adjustedCount = Math.round(active * (source.count / total)) || 0;
                            
                            // Prefer calculated identity counts from filtered events if available
                            const calculatedCount = identityCount[source.id] !== undefined ? identityCount[source.id] : source.count;
                            // Determine faintness: If the calculated count is 0, make it faint.
                            const isFaint = calculatedCount === 0;
                            // Lower opacity significantly if count is 0, regardless of active state
                            const opacity = activeNodeIds.has(source.id) ? 1 : (isFaint ? 0.3 : 0.25);
                            const isLastClicked = focusPath.length > 0 && focusPath[focusPath.length - 1] === source.id;

                            return (
                                <motion.div
                                    key={source.id}
                                    animate={{ opacity }}
                                    className={cn(
                                        "bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-md border border-gray-200 dark:border-slate-800 w-[240px] relative transition-all duration-300 cursor-pointer pointer-events-auto",
                                        activeNodeIds.has(source.id) && !isFaint && "hover:scale-105",
                                        isLastClicked && "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400 scale-105"
                                    )}
                                    onClick={() => handleNodeClick(source.id)}
                                    style={{ position: 'absolute', top: getSourceY(i) - 40, left: col1X }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">
                                                <source.icon size={18} className="text-gray-600 dark:text-slate-400" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-gray-900 dark:text-slate-100 font-bold text-sm leading-tight">{source.label}</h3>
                                                    <span 
                                                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPopupPanel({
                                                                isOpen: true,
                                                                type: 'identities',
                                                                nodeId: source.id,
                                                                title: source.label
                                                            });
                                                        }}
                                                    >
                                                        {calculatedCount}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-none pt-0.5">
                                                    {total} Risks
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Risk Column */}
                    <div className="absolute top-0 bottom-0 w-[350px] flex flex-col justify-start pt-[80px] pointer-events-none">
                        {currentMiddleNodes.map((risk, i) => {
                            const count = riskCounts[risk.id] !== undefined ? riskCounts[risk.id] : (risk as any).count;
                            const isFaint = count === 0;
                            const opacity = activeNodeIds.has(risk.id) ? 1 : (isFaint ? 0.3 : 0.25);
                            const isLastClicked = focusPath.length > 0 && focusPath[focusPath.length - 1] === risk.id;
                            
                            return (
                                <motion.div
                                    key={risk.id}
                                    animate={{ opacity }}
                                    className={cn(
                                        "bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-md border border-gray-200 dark:border-slate-800 w-[280px] relative group cursor-pointer transition-all duration-300 pointer-events-auto",
                                        activeNodeIds.has(risk.id) && !isFaint && "hover:scale-105",
                                        isLastClicked && "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400 scale-105"
                                    )}
                                    onClick={() => handleNodeClick(risk.id)}
                                    style={{ position: 'absolute', top: getRiskY(i), left: col2X }}
                                >

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg border bg-white dark:bg-slate-950 shadow-sm mt-1",
                                                risk.type === 'critical' ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500' :
                                                risk.type === 'warning' ? 'border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-500' :
                                                risk.type === 'neutral' ? 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' :
                                                'border-green-200 dark:border-emerald-900/50 text-green-600 dark:text-emerald-500'
                                            )}>
                                                <risk.icon size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                {(risk as any).category && (
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 tracking-wider leading-none">
                                                        {(risk as any).category}
                                                    </div>
                                                )}
                                                <h3 className="text-gray-900 dark:text-slate-100 font-bold text-sm leading-tight mb-0.5">{risk.label}</h3>
                                                {risk.id !== 'allowed' && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                                                        {count} Risks
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Destination Column */}
                    <div className="absolute top-0 bottom-0 w-[300px] flex flex-col justify-start pt-[80px] pointer-events-none">
                        {destinations.map((dest, i) => {
                            const active = activeIncoming[dest.id] || 0;
                            const total = totalIncoming[dest.id] || 1;
                            
                            // Use the unified assetCount if available
                            let finalCount = 0;
                            if (assetCount[dest.id] !== undefined) {
                                finalCount = assetCount[dest.id];
                            } else {
                                // Fallback
                                const ratio = total > 0 ? (active / total) : 0;
                                finalCount = Math.round(dest.count * ratio) || 0;
                            }

                            const isFaint = finalCount === 0;
                            const opacity = activeNodeIds.has(dest.id) ? 1 : (isFaint ? 0.3 : 0.25);
                            const isLastClicked = focusPath.length > 0 && focusPath[focusPath.length - 1] === dest.id;



                            // Dynamic "New" count calculation
                            let newCount = 0;
                            if (focusPath.length === 0) {
                                switch (dest.id) {
                                    case 'ai-apps': newCount = MOCK_APPS.filter(x => x.isNew).length; break;
                                    case 'ai-models': newCount = MOCK_AI_MODELS.filter(x => x.isNew).length; break;
                                    case 'tools': newCount = MOCK_TOOLS.filter(x => x.isNew).length; break;
                                }
                            } else {
                                // Filtered Context "New" Counts
                                const uniqueNewItems = new Set();
                                relatedEvents.filter(e => e.isNew).forEach(e => {
                                     const name = e.app || e.target || e.dest;
                                     let belongs = false;
                                     if (dest.id === 'ai-apps' && (MOCK_APPS.some(a => a.name === name) || e.type === 'App')) belongs = true;
                                     if (dest.id === 'ai-models' && (MOCK_AI_MODELS.some(m => m.name === name) || e.type === 'Model')) belongs = true;
                                     if (dest.id === 'tools' && (MOCK_TOOLS.some(t => t.name === name) || e.type === 'Tool')) belongs = true;
                                     if (belongs) uniqueNewItems.add(name);
                                });
                                newCount = uniqueNewItems.size;
                            }

                            // Visual adjustment for badge
                            const adjustedNewCount = newCount;
                            
                            // Compatibility alias for rendering logic
                            const adjustedCount = finalCount;

                            return (
                                <motion.div
                                    key={dest.id}
                                    animate={{ opacity }}
                                    className={cn(
                                        "bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-md border border-gray-200 dark:border-slate-800 w-[280px] relative transition-all duration-300 cursor-pointer pointer-events-auto",
                                        activeNodeIds.has(dest.id) && !isFaint && "hover:scale-105",
                                        isLastClicked && "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400 scale-105"
                                    )}
                                    onClick={() => handleNodeClick(dest.id)}
                                    style={{ position: 'absolute', top: getDestY(i), left: col3X }}
                                >

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">
                                                <dest.icon size={18} className="text-gray-600 dark:text-slate-400" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-gray-900 dark:text-slate-100 font-bold text-sm leading-tight">{dest.label}</h3>
                                                    <span 
                                                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPopupPanel({
                                                                isOpen: true,
                                                                type: 'assets',
                                                                nodeId: dest.id,
                                                                title: dest.label
                                                            });
                                                        }}
                                                    >
                                                        {adjustedCount}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-none pt-0.5">
                                                    {total} Risks
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
                        <button 
                            onClick={handleZoomIn}
                            className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={20} />
                        </button>
                        <button 
                            onClick={handleResetZoom}
                            className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            title="Reset Zoom"
                        >
                            <RotateCcw size={20} />
                        </button>
                        <button 
                            onClick={handleZoomOut}
                            className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
            </motion.div>

                {/* Risk Panel (Right Side) */}
                <AnimatePresence>
                    {popupPanel && popupPanel.isOpen && (
                        <motion.div 
                            key={popupPanel.nodeId}
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute right-0 top-0 bottom-0 h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col shrink-0 shadow-2xl z-40 w-96"
                        >
                            <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{popupPanel.title}</h3>
                                <button 
                                    onClick={() => setPopupPanel(null)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {popupPanel.type === 'identities' && (
                                    <>
                                        {(() => {
                                            // Derive Identities for Popup
                                            // If global view (no filters), return inventory.
                                            // Else, return derived from active filters.
                                            let popupIdentities: any[] = [];
                                            const isGlobal = focusPath.length === 0;

                                            if (isGlobal) {
                                                const sourceType = popupPanel.nodeId;
                                                if (sourceType === 'internal-users') popupIdentities = MOCK_USERS.map(u => ({...u, _source: 'internal-users'})); 
                                                else if (sourceType === 'agents') popupIdentities = MOCK_AGENTS.map(a => ({...a, _source: 'agents'}));
                                                else if (sourceType === 'service-accounts') popupIdentities = MOCK_SERVICE_ACCOUNTS.map(s => ({...s, _source: 'service-accounts'}));
                                                else if (sourceType === 'external-users') popupIdentities = MOCK_EXTERNAL_USERS.map(e => ({ name: e.ip, dept: 'External', risk: e.risk, _source: 'external-users' }));
                                            } else {
                                                // Filter relatedEvents by Source Type of the popup node
                                                const filteredBySource = relatedEvents.filter(e => getSourceType(e.user || e.source) === popupPanel.nodeId);
                                                const uniqueUserIds = Array.from(new Set(filteredBySource.map(e => e.user || e.source)));
                                                
                                                popupIdentities = uniqueUserIds.map(id => {
                                                    const user = MOCK_USERS.find(u => u.email === id || u.name === id || u.id === id);
                                                    if (user) return { ...user, _source: 'internal-users' };
                                                    const agent = MOCK_AGENTS.find(a => a.name === id || a.id === id);
                                                    if (agent) return { ...agent, dept: 'Agent', _source: 'agents' };
                                                    const sa = MOCK_SERVICE_ACCOUNTS.find(s => s.name === id || s.id === id);
                                                    if (sa) return { ...sa, dept: 'Service Account', _source: 'service-accounts' };
                                                    const ext = MOCK_EXTERNAL_USERS.find(e => e.ip === id);
                                                    if (ext) return { name: ext.ip, dept: 'External', risk: ext.risk, _source: 'external-users' };
                                                    return { name: id, dept: 'Unknown', risk: 'Unknown', _source: getSourceType(id) };
                                                });
                                            }

                                            return popupIdentities.map((id, idx) => {
                                                const getIdentityStyle = (source: string) => {
                                                    switch (source) {
                                                        case 'internal-users': return { icon: Users, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
                                                        case 'agents': return { icon: Bot, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' };
                                                        case 'service-accounts': return { icon: Server, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' };
                                                        case 'external-users': return { icon: User, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' };
                                                        default: return { icon: User, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
                                                    }
                                                };
                                                const style = getIdentityStyle(id._source);
                                                const Icon = style.icon;

                                                return (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => {
                                                            if (id._source === 'agents') {
                                                                const agent = MOCK_AGENTS.find(a => a.name === id.name) || id;
                                                                setSelectedApp(agent);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "p-4 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all",
                                                            id._source === 'agents' ? "cursor-pointer hover:shadow-md" : ""
                                                        )}
                                                    >
                                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", style.color, style.bg)}>
                                                            <Icon size={16} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h5 className="font-bold text-sm text-gray-900 dark:text-slate-100">{id.name}</h5>
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-slate-400">{id.dept}</div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </>
                                )}

                                {popupPanel.type === 'assets' && (
                                    <>
                                        {(() => {
                                            // Derive Assets for Popup
                                            let popupAssets: any[] = [];
                                            const isGlobal = focusPath.length === 0;
                                            
                                            // Helper to check type
                                            const getAssetType = (name: string) => {
                                                if (MOCK_APPS.some(a => a.name === name)) return 'ai-apps';
                                                if (MOCK_AI_MODELS.some(a => a.name === name)) return 'ai-models';
                                                if (MOCK_DATASETS.some(a => a.name === name)) return 'datasets';
                                                if (MOCK_TOOLS.some(a => a.name === name)) return 'tools';
                                                if (MOCK_AGENTS.some(a => a.name === name)) return 'dst-agents';
                                                if (MOCK_AI_SERVICES.some(a => a.name === name)) return 'ai-services';
                                                if (MOCK_MCPS.some(a => a.name === name)) return 'mcps';
                                                return 'unknown';
                                            };

                                            if (isGlobal) {
                                                if (popupPanel.nodeId === 'ai-apps') popupAssets = MOCK_APPS;
                                                else if (popupPanel.nodeId === 'ai-models') popupAssets = MOCK_AI_MODELS;
                                                else if (popupPanel.nodeId === 'tools') popupAssets = MOCK_TOOLS;
                                                else if (popupPanel.nodeId === 'datasets') popupAssets = MOCK_DATASETS;
                                                else if (popupPanel.nodeId === 'dst-agents') popupAssets = MOCK_AGENTS;
                                                else if (popupPanel.nodeId === 'ai-services') popupAssets = MOCK_AI_SERVICES;
                                                else if (popupPanel.nodeId === 'mcps') popupAssets = MOCK_MCPS;
                                            } else {
                                                // Filter relatedEvents by destination matching current node
                                                const uniqueAssetNames = Array.from(new Set(relatedEvents.map(e => e.data || e.app || e.target || e.dest)));
                                                popupAssets = uniqueAssetNames.map(name => {
                                                     const type = getAssetType(name);
                                                     if (type !== popupPanel.nodeId) return null; // Filter to this node type

                                                     const fullApp = [...MOCK_APPS, ...MOCK_TOOLS, ...MOCK_AI_MODELS, ...MOCK_DATASETS, ...MOCK_AGENTS, ...MOCK_AI_SERVICES, ...MOCK_MCPS].find(a => a.name === name);
                                                     const event = relatedEvents.find(e => (e.data || e.app || e.target || e.dest) === name);
                                                     
                                                     return { 
                                                        name, 
                                                        type: fullApp?.type || event?.type || 'Unknown',
                                                        category: (fullApp as any)?.vendor || (fullApp as any)?.category || event?.category || 'Unknown',
                                                        isNew: (fullApp as any)?.isNew || event?.isNew || false,
                                                        icon: (fullApp as any)?.icon || (event?.type === 'App' ? LayoutGrid : event?.type === 'Model' ? Box : Wrench),
                                                        status: (fullApp as any)?.status,
                                                        _original: fullApp
                                                    };
                                                }).filter(Boolean);
                                            }

                                            if (popupAssets.length === 0) return <p className="text-sm text-gray-400 italic">No assets found.</p>;

                                            return popupAssets.map((asset, idx) => {
                                                const getAssetStyle = (name: string, type: string, category: string) => {
                                                    const defaults = { color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', icon: Box };
                                                    
                                                    // 1. Direct Lookup in Mock Data
                                                    if (MOCK_APPS.some(a => a.name === name)) return { color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', icon: LayoutGrid };
                                                    if (MOCK_AI_MODELS.some(m => m.name === name)) return { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Box };
                                                    if (MOCK_TOOLS.some(t => t.name === name)) return { color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: Wrench };
                                                    if (MOCK_DATASETS.some(d => d.name === name)) return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Database };
                                                    if (MOCK_AGENTS.some(a => a.name === name)) return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Bot };
                                                    if (MOCK_AI_SERVICES.some(s => s.name === name)) return { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: Cpu };
                                                    if (MOCK_MCPS.some(m => m.name === name)) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Workflow };

                                                    // 2. Heuristic Fallback
                                                    if (type === 'App' || category === 'LLM' || category === 'Chatbot') return { color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', icon: LayoutGrid }; 
                                                    if (type === 'Model') return { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Box };
                                                    if (type === 'Tool') return { color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: Wrench };
                                                    if (type === 'Data' || type === 'Dataset') return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Database };
                                                    if (category === 'Agent') return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Bot };
                                                    if (category === 'Cloud' || category === 'On-prem') return { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: Cpu };
                                                    
                                                    return defaults;
                                                };
                                                const style = getAssetStyle(asset.name, asset.type, asset.category);
                                                const Icon = style.icon;

                                                return (
                                                    <div 
                                                        key={asset.id || idx} 
                                                        onClick={() => {
                                                            const item = (asset as any)._original || asset;
                                                            if (MOCK_APPS.some(a => a.name === item.name)) setSelectedApp(item);
                                                            else if (MOCK_AI_MODELS.some(m => m.name === item.name)) setSelectedModel(item);
                                                            else if (MOCK_DATASETS.some(d => d.name === item.name)) setSelectedDataset(item);
                                                            else if (MOCK_TOOLS.some(t => t.name === item.name)) setSelectedTool(item);
                                                            else if (MOCK_AGENTS.some(a => a.name === item.name)) setSelectedApp(item);
                                                        }}
                                                        className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer shadow-sm hover:shadow-md transition-all"
                                                    >
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                                            style.color,
                                                            style.bg
                                                        )}>
                                                            <Icon size={16} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h5 className="font-bold text-sm text-gray-900 dark:text-slate-100">{asset.name}</h5>
                                                                {asset.isNew && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                        NEW
                                                                    </span>
                                                                )}
                                                                {asset.status === 'unsanctioned' && (
                                                                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                                        Unsanctioned
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-slate-400">{asset.category || asset.type} • {asset.type}</div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {showRisks && (
                        <div 
                            className="h-full border-l border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col shrink-0 shadow-xl z-30 w-96"
                        >
                            <div className={cn("flex-1", !activeNodeId && riskLevelFilter === 'all' ? "" : "overflow-y-auto")}>
                                {!selectedEvent && (
                                    <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-900 z-20 shrink-0">
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Risks</h3>
                                    </div>
                                )}
                                {selectedEvent && (
                                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 sticky top-0 bg-slate-50 dark:bg-slate-900 z-20 shrink-0">
                                        <button 
                                            onClick={() => {
                                                setSelectedEvent(null); 
                                                setSelectedEventType(null); 
                                            }}
                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                                        >
                                            <ArrowRight className="rotate-180" size={16} />
                                        </button>
                                        <div className="flex items-center gap-2 flex-1 min-w-0 relative">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap shrink-0">Investigate Risk</h3>
                                            <div 
                                                onClick={() => setShowFocusInfo(!showFocusInfo)}
                                                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all truncate min-w-0 select-none shadow-sm"
                                            >
                                                {(() => {
                                                    const parts = [];
                                                    if (focusPath.length > 0) {
                                                        parts.push(...focusPath.map(id => getNodeLabel(id)));
                                                    }
                                                    return parts.length > 0 ? parts.join(' → ') : 'Global View';
                                                })()}
                                            </div>
                                            
                                            {showFocusInfo && (
                                                <div className="absolute top-full left-0 mt-2 w-64 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 text-xs animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">Investigation Scope</span>
                                                        <button onClick={() => setShowFocusInfo(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    
                                                    {(focusPath.length > 0 || riskLevelFilter !== 'all') ? (
                                                        <div className="space-y-2 relative">
                                                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800" />
                                                            {riskLevelFilter !== 'all' && (
                                                                <div className="flex items-center gap-3 relative z-10">
                                                                     <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                                                        F
                                                                     </div>
                                                                     <span className="py-1 px-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium block flex-1 capitalize">
                                                                        {riskLevelFilter} Risks
                                                                     </span>
                                                                </div>
                                                            )}
                                                            {focusPath.map((id, idx) => (
                                                                <div key={idx} className="flex items-center gap-3 relative z-10">
                                                                     <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                                                        {idx + 1}
                                                                     </div>
                                                                     <span className="py-1 px-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium block flex-1">
                                                                        {getNodeLabel(id)}
                                                                     </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 text-slate-500 text-center italic">
                                                            Viewing all traffic (Global Scope)
                                                        </div>
                                                    )}
                                                    

                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {(() => {
                                    const action = getDeepDiveAction(activeNodeId);
                                    // Hide deep dive action in header for external-users, as it's shown in Risks tab
                                    if (action && activeNodeId !== 'external-users') {
                                        return (
                                            <div className="p-6 pb-0">
                                                <button
                                                    onClick={() => onNavigate(action.viewId)}
                                                    className="w-full mb-6 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 group"
                                                >
                                                    {action.label}
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                
                                {(activeNodeId || riskLevelFilter !== 'all') && (
                                    <div className="h-full">
                                        {/* Hidden Title */}
                                        
                            {(() => {
                                // Use the lifted relatedEvents instead of re-deriving
                                
                                // 2. Derive Identities (using lifted logic results)
                                let identities: any[] = [];
                                
                                const isGlobalSourceSelection = focusPath.length === 1 && sources.some(s => s.id === focusPath[0]);

                                if (isGlobalSourceSelection) {
                                    // Show all identities of that type (Inventory View)
                                    // Use a subset of MOCK_USERS to match the hardcoded inventory count (9) if needed, 
                                    // or just show all if we want 14. 
                                    // To match the Global Graph "9 users", we should slice MOCK_USERS to 9.
                                    const sourceType = focusPath[0];
                                    if (sourceType === 'internal-users') identities = MOCK_USERS.map(u => ({...u, _source: 'internal-users'})); 
                                    else if (sourceType === 'agents') identities = MOCK_AGENTS.map(a => ({...a, _source: 'agents'}));
                                    else if (sourceType === 'service-accounts') identities = MOCK_SERVICE_ACCOUNTS.map(s => ({...s, _source: 'service-accounts'}));
                                    else if (sourceType === 'external-users') identities = MOCK_EXTERNAL_USERS.map(e => ({ name: e.ip, dept: 'External', risk: e.risk, _source: 'external-users' }));
                                } else {
                                    // Derive from filtered events
                                    const uniqueUserIds = Array.from(new Set(relatedEvents.map(e => e.user || e.source)));
                                    identities = uniqueUserIds.map(id => {
                                        // Try to find in static lists
                                        const user = MOCK_USERS.find(u => u.email === id || u.name === id || u.id === id);
                                        if (user) return { ...user, _source: 'internal-users' };
                                        
                                        const agent = MOCK_AGENTS.find(a => a.name === id || a.id === id);
                                        if (agent) return { ...agent, dept: 'Agent', _source: 'agents' };

                                        const sa = MOCK_SERVICE_ACCOUNTS.find(s => s.name === id || s.id === id);
                                        if (sa) return { ...sa, dept: 'Service Account', _source: 'service-accounts' };

                                        const ext = MOCK_EXTERNAL_USERS.find(e => e.ip === id);
                                        if (ext) return { name: ext.ip, dept: 'External', risk: ext.risk, _source: 'external-users' };

                                        return { name: id, dept: 'Unknown', risk: 'Unknown', _source: getSourceType(id) };
                                    });
                                }

                                // Sort Identities: Entity Type order then Alphabetical
                                const sourceOrder = ['internal-users', 'external-users', 'service-accounts', 'agents'];
                                identities.sort((a, b) => {
                                    const scoreA = sourceOrder.indexOf(a._source);
                                    const scoreB = sourceOrder.indexOf(b._source);
                                    if (scoreA !== scoreB) return scoreA - scoreB;
                                    return a.name.localeCompare(b.name);
                                });

                                // 3. Derive Assets
                                let assets: any[] = [];
                                
                                // Inventory View Logic
                                if (focusPath.length === 1 && destinations.some(d => d.id === focusPath[0])) {
                                    if (focusPath[0] === 'ai-apps') assets = MOCK_APPS;
                                    else if (focusPath[0] === 'ai-models') assets = MOCK_AI_MODELS;
                                    else if (focusPath[0] === 'tools') assets = MOCK_TOOLS;
                                    else if (focusPath[0] === 'datasets') assets = MOCK_DATASETS;
                                } 
                                // Global View (Default) Logic - Show ALL assets if no specific filter
                                else if (focusPath.length === 0) {
                                     assets = [...MOCK_APPS, ...MOCK_AI_MODELS, ...MOCK_TOOLS, ...MOCK_DATASETS];
                                }
                                // Filtered Event Logic
                                else {
                                    const uniqueAssetNames = Array.from(new Set(relatedEvents.map(e => e.data || e.app || e.target || e.dest)));
                                    assets = uniqueAssetNames.map(name => {
                                        const fullApp = [...MOCK_APPS, ...MOCK_TOOLS, ...MOCK_AI_MODELS, ...MOCK_DATASETS].find(a => a.name === name);
                                        const event = relatedEvents.find(e => (e.data || e.app || e.target || e.dest) === name);
                                        
                                        // Special handling for DLP Data items
                                        if (event?.data === name) {
                                            return {
                                                name,
                                                type: 'Data',
                                                category: 'Sensitive Data',
                                                isNew: false,
                                                icon: Database,
                                                status: 'Critical',
                                                _original: null
                                            };
                                        }

                                        return { 
                                            name, 
                                            type: fullApp?.type || event?.type || 'Unknown',
                                            category: (fullApp as any)?.vendor || (fullApp as any)?.category || event?.category || 'Unknown',
                                            isNew: (fullApp as any)?.isNew || event?.isNew || false,
                                            icon: (fullApp as any)?.icon || (event?.type === 'App' ? LayoutGrid : event?.type === 'Model' ? Box : Wrench),
                                            status: (fullApp as any)?.status,
                                            _original: fullApp
                                        };
                                    }).filter(a => a.name);
                                }

                                // Sort Assets: Entity Type order then Alphabetical
                                const assetOrder = ['ai-apps', 'ai-models', 'datasets', 'tools'];
                                const getAssetType = (name: string) => {
                                    if (MOCK_APPS.some(a => a.name === name)) return 'ai-apps';
                                    if (MOCK_AI_MODELS.some(a => a.name === name)) return 'ai-models';
                                    if (MOCK_DATASETS.some(a => a.name === name)) return 'datasets';
                                    if (MOCK_TOOLS.some(a => a.name === name)) return 'tools';
                                    
                                    // Ad-hoc DLP Data check
                                    if (MOCK_DLP_EVENTS.some(e => e.data === name)) return 'datasets';
                                    
                                    return 'unknown';
                                };
                                
                                assets.sort((a, b) => {
                                    const typeA = getAssetType(a.name);
                                    const typeB = getAssetType(b.name);
                                    const scoreA = assetOrder.indexOf(typeA);
                                    const scoreB = assetOrder.indexOf(typeB);
                                    if (scoreA !== scoreB) return scoreA - scoreB;
                                    return a.name.localeCompare(b.name);
                                });

                                // 4. Derive Risks (Lifted Logic for Summary)
                                const { groupedEvents, otherEvents } = relatedRiskListEvents.reduce((acc: any, event: any) => {
                                    // Custom Filtering for Focus Path App Context
                                    const appFilter = focusPath.find(id => MOCK_APPS.some(a => a.name === id));
                                    if (appFilter && event.app && event.app !== appFilter) {
                                        return acc;
                                    }
                                    
                                    const isAppType = event.type === 'App' || event.type === 'Tool' || event.type === 'Model';
                                    const isDlpType = (event.data && event.dest && event.action);
                                    const isMaliciousType = (event.type && ['Jailbreak', 'Prompt Injection', 'Data Exfiltration', 'Supply Chain Poisoning'].includes(event.type)) || MOCK_MALICIOUS_EVENTS.some(m => m.id === event.id);
                                    const eventType = (event.category === 'Posture Vulnerabilities') ? 'posture-risk' : null;

                                    if (isAppType && !eventType) {
                                        const name = event.app || event.target || event.dest;
                                        if (!acc.groupedEvents[name]) {
                                            acc.groupedEvents[name] = {
                                                name,
                                                events: [],
                                                maxSeverity: 'Low',
                                                isNew: false,
                                                identityCount: 0,
                                                lastSeen: event.time,
                                                type: event.type,
                                                groupType: 'app',
                                                reasons: new Set<string>()
                                            };
                                        }
                                        const group = acc.groupedEvents[name];
                                        group.events.push(event);
                                        
                                        const severity = event.risk || 'Medium';
                                        const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
                                        if (severityLevels.indexOf(severity) > severityLevels.indexOf(group.maxSeverity)) {
                                            group.maxSeverity = severity;
                                        }
                                        
                                        if (event.isNew) {
                                            group.isNew = true;
                                            group.reasons.add("Newly discovered AI usage");
                                        }

                                        const appEntity = MOCK_APPS.find(a => a.name === group.name);
                                        if (appEntity && (appEntity.ccl || 100) < 60) {
                                            group.reasons.add("Unsafe AI usage");
                                        }
                                        
                                        group.reasons.add("Unsanctioned AI usage");
                                        group.identityCount += (event.identityCount || 1);

                                    } else if (isMaliciousType) {
                                        const name = event.type || "Unknown Attack";
                                        const groupKey = `malicious-${event.type}-${event.target}`;
                                        
                                        if (!acc.groupedEvents[groupKey]) {
                                            acc.groupedEvents[groupKey] = {
                                                name,
                                                events: [],
                                                maxSeverity: event.severity || event.risk || 'High',
                                                isNew: false,
                                                identityCount: 0,
                                                lastSeen: event.time,
                                                type: event.type,
                                                target: event.target,
                                                source: event.source,
                                                groupType: 'malicious',
                                                reasons: new Set<string>()
                                            };
                                        }
                                        const group = acc.groupedEvents[groupKey];
                                        group.events.push(event);

                                        if (event.source && (event.source.includes('Ext') || event.source.includes('External'))) {
                                            group.reasons.add("Public Exposure");
                                        }
                                        
                                        if (event.severity === 'Critical') {
                                                group.reasons.add("High Traffic");
                                        }

                                        const isSuccess = event.severity === 'Critical' || (event.type && event.type.includes("Success"));
                                        if (isSuccess) {
                                            group.reasons.add("Attack Successful");
                                        } else {
                                            group.reasons.add("Attack Failed");
                                        }

                                        group.identityCount += 1;

                                    } else if (isDlpType) {
                                        const name = event.dest || "Unknown Destination";
                                        if (!acc.groupedEvents[name]) {
                                            acc.groupedEvents[name] = {
                                                name,
                                                events: [],
                                                maxSeverity: 'Low',
                                                isNew: false,
                                                identityCount: 0,
                                                lastSeen: event.time,
                                                type: 'Data',
                                                groupType: 'dlp',
                                                reasons: new Set<string>()
                                            };
                                        }
                                        const group = acc.groupedEvents[name];
                                        group.events.push(event);

                                        let severity = 'Medium';
                                        if (event.action === 'Blocked') severity = 'Critical';
                                        else if (event.action === 'Flagged') severity = 'High';
                                        
                                        const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
                                        if (severityLevels.indexOf(severity) > severityLevels.indexOf(group.maxSeverity)) {
                                            group.maxSeverity = severity;
                                        }

                                        if (event.dest && (event.dest.includes('Public') || event.dest.includes('External'))) {
                                            group.reasons.add("Public Exposure");
                                        }
                                        
                                        if (event.mode === 'Rest') {
                                            group.reasons.add("At-rest Scan Violation");
                                        } else {
                                            group.reasons.add("Data-in-motion Detected");
                                        }
                                        
                                        if (event.dest && event.dest.includes('Pastebin')) {
                                            group.reasons.add("Posture Vulnerability");
                                        }

                                        group.identityCount += 1;
                                    } else if (eventType === 'posture-risk') {
                                        const name = event.subLabel || "Posture Issue";
                                        if (!acc.groupedEvents[name]) {
                                            acc.groupedEvents[name] = {
                                                name,
                                                events: [],
                                                maxSeverity: 'High',
                                                isNew: false,
                                                identityCount: event.count || 1,
                                                lastSeen: 'Just now',
                                                type: 'Posture',
                                                groupType: 'posture-risk',
                                                reasons: new Set<string>()
                                            };
                                        }
                                        const group = acc.groupedEvents[name];
                                        group.events.push(event);
                                        group.reasons.add(event.label);
                                    } else {
                                        acc.otherEvents.push(event);
                                    }
                                    return acc;
                                }, { groupedEvents: {}, otherEvents: [] });

                                const consolidatedGroups = Object.values(groupedEvents);
                                
                                consolidatedGroups.forEach((g: any) => {
                                    if (g.groupType === 'app') {
                                        const reasons = g.reasons as Set<string>;
                                        const isUnsafe = reasons.has("Unsafe AI usage");
                                        const isUnsanctioned = reasons.has("Unsanctioned AI usage");
                                        const isNew = reasons.has("Newly discovered AI usage");
                                        
                                        if (isUnsafe && isUnsanctioned && isNew) {
                                            g.maxSeverity = 'Critical';
                                        } else if (isUnsafe) {
                                            if (['Low', 'Medium'].includes(g.maxSeverity)) {
                                                g.maxSeverity = 'High';
                                            }
                                        }
                                    }
                                });

                                const renderItems = [
                                    ...consolidatedGroups.map((g: any) => ({ ...g, _isGroup: true, reasons: Array.from(g.reasons) })),
                                    ...otherEvents.map((e: any) => ({ ...e, _isGroup: false }))
                                ];

                                const getSeverityValue = (item: any) => {
                                    const s = item._isGroup ? item.maxSeverity : (item.risk || item.severity || item.action);
                                    const lower = String(s).toLowerCase();
                                    if (lower.includes('critical') || lower.includes('blocked')) return 4;
                                    if (lower.includes('high') || lower.includes('flagged')) return 3;
                                    if (lower.includes('medium')) return 2;
                                    if (lower.includes('low') || lower.includes('approved') || lower.includes('monitored')) return 1;
                                    return 0;
                                };

                                renderItems.sort((a, b) => {
                                    const valA = getSeverityValue(a);
                                    const valB = getSeverityValue(b);
                                    if (valA !== valB) return valB - valA;
                                    
                                    const reasonsA = a.reasons ? a.reasons.length : 0;
                                    const reasonsB = b.reasons ? b.reasons.length : 0;
                                    return reasonsB - reasonsA;
                                });

                                const riskItems = renderItems.filter((item: any) => {
                                    // 1. Existing Logic: Group Type filtering
                                    let shouldShow = true;
                                    if (item.groupType === 'app') {
                                        const reasons = item.reasons || [];
                                        const isHighSeverity = item.maxSeverity === 'High' || item.maxSeverity === 'Critical';
                                        
                                        const isUnsanctioned = reasons.includes("Unsanctioned AI usage");
                                        const isUnsafe = reasons.includes("Unsafe AI usage");
                                        const isNew = reasons.includes("Newly discovered AI usage");
                                        
                                        shouldShow = isUnsanctioned || isUnsafe || isNew || isHighSeverity;
                                    } else if (!item._isGroup) {
                                        if (item.status === 'Approved' || item.status === 'Monitored') shouldShow = false;
                                    }

                                    if (!shouldShow) return false;

                                    // 2. New Logic: Apply Risk Level Filter
                                    if (riskLevelFilter === 'all') return true;
                                    
                                    const severity = item._isGroup ? item.maxSeverity : (item.risk || item.severity || item.action);
                                    const severityLower = String(severity).toLowerCase();
                                    
                                    if (riskLevelFilter === 'critical') return severityLower.includes('critical') || severityLower.includes('blocked');
                                    if (riskLevelFilter === 'high') return severityLower.includes('high') || severityLower.includes('flagged');
                                    if (riskLevelFilter === 'medium') return severityLower.includes('medium') || severityLower.includes('warning');
                                    if (riskLevelFilter === 'low') return severityLower.includes('low') || severityLower.includes('approved') || severityLower.includes('monitored');
                                    
                                    return false;
                                });

                                // 5. Generate Summary Text
                                let summaryText = "";
                                if (activeTab === 'identities') {
                                    const counts = identities.reduce((acc: any, item: any) => {
                                        const type = item._source === 'internal-users' ? 'Internal Users' :
                                                     item._source === 'agents' ? 'Agents' :
                                                     item._source === 'service-accounts' ? 'Service Accounts' : 'External Users';
                                        acc[type] = (acc[type] || 0) + 1;
                                        return acc;
                                    }, {});
                                    summaryText = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
                                } else if (activeTab === 'assets') {
                                    let activeAssetsForSummary = assets;
                                    const currentFocusId = focusPath.length > 0 ? focusPath[focusPath.length - 1] : null;

                                    if (currentFocusId) {
                                        if (currentFocusId === 'dst-agents') activeAssetsForSummary = MOCK_AGENTS;
                                        else if (currentFocusId === 'ai-services') activeAssetsForSummary = MOCK_AI_SERVICES;
                                        else if (currentFocusId === 'mcps') activeAssetsForSummary = MOCK_MCPS;
                                        else if (currentFocusId === 'ai-apps') activeAssetsForSummary = MOCK_APPS;
                                        else if (currentFocusId === 'ai-models') activeAssetsForSummary = MOCK_AI_MODELS;
                                        else if (currentFocusId === 'tools') activeAssetsForSummary = MOCK_TOOLS;
                                        else if (currentFocusId === 'datasets') activeAssetsForSummary = MOCK_DATASETS;
                                    }

                                    const counts = activeAssetsForSummary.reduce((acc: any, item: any) => {
                                        let label = 'Tools';
                                        // Try to detect type from item properties or helper
                                        const rawType = getAssetType(item.name);
                                        
                                        if (rawType === 'ai-apps') label = 'AI Apps';
                                        else if (rawType === 'ai-models') label = 'AI Models';
                                        else if (rawType === 'datasets') label = 'Datasets';
                                        
                                        // Specific overrides based on focus context
                                        if (currentFocusId === 'dst-agents') label = 'Agents';
                                        else if (currentFocusId === 'ai-services') label = 'AI Services';
                                        else if (currentFocusId === 'mcps') label = 'MCPs';
                                        else if (currentFocusId === 'ai-apps') label = 'AI Apps';
                                        
                                        acc[label] = (acc[label] || 0) + 1;
                                        return acc;
                                    }, {});
                                    
                                    // Sort order
                                    const order = ['AI Apps', 'AI Models', 'Datasets', 'Tools', 'Agents', 'AI Services', 'MCPs'];
                                    summaryText = order.filter(k => counts[k]).map(k => `${counts[k]} ${k}`).join(', ');
                                } else if (activeTab === 'risks') {
                                    const counts = riskItems.reduce((acc: any, item: any) => {
                                        const severity = item._isGroup ? item.maxSeverity : (item.risk || item.severity || (item.action === 'Blocked' ? 'Critical' : 'Medium'));
                                        // Standardize
                                        let label = severity;
                                        if (label === 'Flagged') label = 'High';
                                        if (label === 'Blocked') label = 'Critical';
                                        if (!['Critical', 'High', 'Medium', 'Low'].includes(label)) label = 'Medium';
                                        
                                        acc[label] = (acc[label] || 0) + 1;
                                        return acc;
                                    }, {});
                                    const order = ['Critical', 'High', 'Medium', 'Low'];
                                    summaryText = order.filter(k => counts[k]).map(k => `${counts[k]} ${k}`).join(', ');
                                }

                                return (
                                    <div>
                                        {/* Hidden Description */}

                                        {/* Tabs Removed as per request, defaulting to Risks view essentially */}

                                        {/* Tab Content */}
                                        <div className="space-y-3 px-6 pb-6 pt-4">
                                            {/* Summary Text (Simple) */}
                                            {summaryText && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                                                    {summaryText}
                                                </p>
                                            )}
                                            
                                            {/* We only render Risks if activeTab is 'risks', which is default. 
                                                Technically the state could change if logic elsewhere changes it, 
                                                but we removed the buttons.
                                            */}
                                            
                                            {activeTab === 'identities' && (
                                                <>
                                                    {identities.length === 0 && <p className="text-sm text-gray-400 italic">No identities found.</p>}
                                                    {identities.map((id, idx) => {
                                                        const getIdentityStyle = (source: string) => {
                                                            switch (source) {
                                                                case 'internal-users': return { icon: Users, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
                                                                case 'agents': return { icon: Bot, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' };
                                                                case 'service-accounts': return { icon: Server, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' };
                                                                case 'external-users': return { icon: User, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' };
                                                                default: return { icon: User, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
                                                            }
                                                        };
                                                        const style = getIdentityStyle(id._source);
                                                        const Icon = style.icon;

                                                        return (
                                                            <div key={idx} className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700">
                                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", style.color, style.bg)}>
                                                                    <Icon size={16} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <h5 className="font-bold text-sm text-gray-900 dark:text-slate-100">{id.name}</h5>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-slate-400">{id.dept}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}

                                            {activeTab === 'risks' && (
                                                <>
                                                    {/* Deep Dive Action Banner - REMOVED PER USER REQUEST */}
                                                    {(() => {
                                                        // logic removed
                                                        return null;
                                                    })()}

                                                    {(() => {
                                                        // If viewing "Allowed" traffic, show no risks
                                                        if (focusPath.includes('allowed')) {
                                                             return (
                                                                <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mb-4">
                                                                        <CheckCircle size={24} />
                                                                    </div>
                                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">No Risks Detected</h3>
                                                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
                                                                        Traffic in this category is allowed and unmonitored.
                                                                    </p>
                                                                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-all hover:shadow-lg">
                                                                        <Sparkles size={14} className="text-blue-100" />
                                                                        View Recommendations
                                                                    </button>
                                                                </div>
                                                             );
                                                        }

                                                        // Consolidate Risk Events (Use Lifted Logic)
                                                        const filteredItems = riskItems;

                                                        if (filteredItems.length === 0) return <p className="text-sm text-gray-400 italic">No risk events found.</p>;

                                                        return filteredItems.map((item: any, i) => {
                                                            if (item._isGroup) {
                                                                // Render Consolidated Card
                                                                const eventName = item.name;
                                                                const isSanctioned = sanctionedIds.has(eventName);
                                                                
                                                                // --- Shared Logic ---
                                                                let severity = item.maxSeverity;
                                                                if (isSanctioned) severity = 'Resolved';
                                                                
                                                                const isHigh = severity === 'High' || severity === 'Critical';
                                                                const severityColor = isSanctioned
                                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    : (isHigh ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400");
                                                                const RiskIcon = isSanctioned ? CheckCircle : AlertTriangle;

                                                                // --- Posture Vulnerabilities Specific Render Logic ---
                                                                if (item.groupType === 'posture-risk') {
                                                                    const isSelected = selectedEvent && item.events.some((e: any) => e.id === selectedEvent.id);
                                                                    
                                                                    // Title Logic
                                                                    const displayTitle = item.name;

                                                                    return (
                                                                        <div 
                                                                            key={`group-posture-${item.name}`}
                                                                            onClick={() => {
                                                                                setSelectedEvent(item.events[0]);
                                                                                setSelectedEventType('posture-risk');
                                                                            }}
                                                                            className={cn(
                                                                                "p-4 border rounded-xl shadow-sm transition-all cursor-pointer flex flex-col gap-3 group",
                                                                                isSelected 
                                                                                    ? "border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400 bg-blue-50/10 dark:bg-blue-900/10" 
                                                                                    : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md"
                                                                            )}
                                                                        >
                                                                            {/* Row 1: Risk Level & Timestamp */}
                                                                            <div className="flex items-center justify-between">
                                                                                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0", severityColor)}>
                                                                                    <RiskIcon size={12} />
                                                                                    <span>{severity}</span>
                                                                                </div>
                                                                                <span className="text-xs text-slate-400 font-medium">1 hour ago</span>
                                                                            </div>

                                                                            {/* Row 2: Title */}
                                                                            <h5 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                                                                                {displayTitle}
                                                                            </h5>

                                                                            {/* Row 3: Topic Bullet Points */}
                                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                                {item.reasons && item.reasons.length > 0 ? (
                                                                                    item.reasons.map((reason: string, idx: number) => (
                                                                                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                                            {reason}
                                                                                        </span>
                                                                                    ))
                                                                                ) : (
                                                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Posture Issue</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                // --- DLP Specific Render Logic ---
                                                                if (item.groupType === 'dlp') {
                                                                     const dataName = item.events[0].data || '';
                                                                     // Find matching dataset to get enriched info
                                                                     const dataset = MOCK_DATASETS.find(d => d.name === dataName) || {
                                                                        location: 'AWS US-East',
                                                                        type: 'Training Data',
                                                                        risk: 'High'
                                                                     };
                                                                     
                                                                     // Footer Metrics for DLP
                                                                     // Location Heuristics (Realistic Cloud/On-prem)
                                                                     let location = "On-prem";
                                                                     if (eventName.includes("Proprietary")) location = "GCP";
                                                                     else if (eventName.includes("PII")) location = "AWS";
                                                                     else if (eventName.includes("Keys") || eventName.includes("Secret")) location = "Local";
                                                                     else if (eventName.includes("Cloud") || eventName.includes("Drive") || eventName.includes("Dropbox") || eventName.includes("Mega")) location = "Cloud";

                                                                     // Diversify Types (Realistic mappings)
                                                                     let type = "Intellectual Property";
                                                                     if (dataName.includes("PII")) type = "Customer Data";
                                                                     else if (dataName.includes("Keys") || dataName.includes("Secret")) type = "Credentials";
                                                                     else if (dataName.includes("Proprietary Code")) type = "Training Data";
                                                                     else if (dataName.includes("Docs") || dataName.includes("Wiki")) type = "Knowledge Base";
                                                                     else if (dataset.type) type = dataset.type;

                                                                     // Method
                                                                     let method = "Policy";
                                                                     if (dataName.includes("PII") || dataName.includes("Keys")) method = "Watchlist";

                                                                     // Determine title based on mode (Motion vs Rest)
                                                                     const motionEvent = item.events.find((e: any) => e.mode === 'Motion');
                                                                     const restEvent = item.events.find((e: any) => e.mode === 'Rest');
                                                                     const primaryEvent = motionEvent || restEvent || item.events[0];
                                                                     
                                                                     let displayTitle = `${dataName} detected in ${item.name}`;
                                                                     if (primaryEvent.mode === 'Motion') {
                                                                         displayTitle = `${primaryEvent.user || 'User'} leaked sensitive data in ${item.name}`;
                                                                     }

                                                                     const isSelected = selectedEvent && item.events.some((e: any) => e.id === selectedEvent.id);

                                                                     // Custom Title for the first/demo card, otherwise fallback
                                                                     const titleText = (i === 0 && item.groupType === 'dlp' && item.events.length > 2) 
                                                                         ? "Sales-Support-Agent has unrestricted Access to sensitive data in 3 data stores"
                                                                         : displayTitle;

                                                                     return (
                                                                        <div 
                                                                            key={`group-dlp-${item.name}`}
                                                                            onClick={() => {
                                                                                setSelectedEvent(item.events[0]);
                                                                                setSelectedEventType('data-leakage');
                                                                            }}
                                                                            className={cn(
                                                                                "p-4 border rounded-xl shadow-sm transition-all cursor-pointer flex flex-col gap-3 group",
                                                                                isSelected 
                                                                                    ? "border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400 bg-blue-50/10 dark:bg-blue-900/10" 
                                                                                    : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md"
                                                                            )}
                                                                        >
                                                                            {/* Row 1: Risk Level & Timestamp */}
                                                                            <div className="flex items-center justify-between">
                                                                                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0", severityColor)}>
                                                                                    <RiskIcon size={12} />
                                                                                    <span>{severity}</span>
                                                                                </div>
                                                                                <span className="text-xs text-slate-400 font-medium">1 hour ago</span>
                                                                            </div>

                                                                            {/* Row 2: Title */}
                                                                            <h5 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                                                                                {titleText}
                                                                            </h5>

                                                                            {/* Row 3: Topic Bullet Points */}
                                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Excessive permission</span>
                                                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Sensitive PII exposure</span>
                                                                            </div>
                                                                        </div>
                                                                     );
                                                                }
                                                                
                                                                // --- Malicious Specific Render Logic ---
                                                                if (item.groupType === 'malicious') {
                                                                    // Footer Metrics for Malicious
                                                                    const affectedAsset = item.target || "Unknown Asset";
                                                                    const status = item.reasons.includes("Attack Successful") ? "Done" : "Failed";
                                                                    const actor = item.source ? (item.source.includes("Ext") ? "External" : "Internal") : "Unknown";

                                                                    const isSelected = selectedEvent && item.events.some((e: any) => e.id === selectedEvent.id);
                                                                    
                                                                    const displayTitle = item.name;

                                                                    return (
                                                                       <div 
                                                                           key={`group-malicious-${item.name}-${affectedAsset}`}
                                                                           onClick={() => {
                                                                               setSelectedEvent(item.events[0]);
                                                                               setSelectedEventType('malicious');
                                                                           }}
                                                                           className={cn(
                                                                               "p-4 border rounded-xl shadow-sm transition-all cursor-pointer flex flex-col gap-3 group",
                                                                               isSelected 
                                                                                   ? "border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400 bg-blue-50/10 dark:bg-blue-900/10" 
                                                                                   : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md"
                                                                           )}
                                                                       >
                                                                           {/* Row 1: Risk Level & Timestamp */}
                                                                           <div className="flex items-center justify-between">
                                                                                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0", severityColor)}>
                                                                                    <RiskIcon size={12} />
                                                                                    <span>{severity}</span>
                                                                                </div>
                                                                                <span className="text-xs text-slate-400 font-medium">1 hour ago</span>
                                                                            </div>

                                                                            {/* Row 2: Title */}
                                                                            <h5 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                                                                                {displayTitle}
                                                                            </h5>

                                                                            {/* Row 3: Topic Bullet Points */}
                                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                                {item.reasons && item.reasons.length > 0 ? (
                                                                                    item.reasons.map((reason: string, idx: number) => (
                                                                                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                                            {reason}
                                                                                        </span>
                                                                                    ))
                                                                                ) : (
                                                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Malicious Activity</span>
                                                                                )}
                                                                            </div>
                                                                       </div>
                                                                    );
                                                               }

                                                                // --- Unsanctioned App Logic (Existing) ---
                                                                const foundEntity = MOCK_APPS.find(a => a.name === eventName) || 
                                                                                    MOCK_AI_MODELS.find(m => m.name === eventName) || 
                                                                                    MOCK_TOOLS.find(t => t.name === eventName);
                                                                
                                                                const appData = foundEntity ? { ...foundEntity } : { 
                                                                    name: eventName, 
                                                                    ccl: null, 
                                                                    firstSeen: item.lastSeen 
                                                                };
                                                                
                                                                // Realistic First Seen Date Logic
                                                                const isNew = item.reasons.includes("Newly discovered AI usage");
                                                                if (isNew) {
                                                                    // Should be within the last 30 days (Today is Jan 18, 2026)
                                                                    // Generate a date between Jan 1 and Jan 17 based on name length
                                                                    const dayOffset = (eventName.length % 15) + 2; 
                                                                    appData.firstSeen = `Jan ${18 - dayOffset}, 2026`;
                                                                } else {
                                                                    // Should NOT be within the last 30 days
                                                                    const olderMonths = ["Nov", "Oct", "Sep", "Aug"];
                                                                    const month = olderMonths[eventName.length % 4];
                                                                    const day = (eventName.length % 28) + 1;
                                                                    appData.firstSeen = `${month} ${day}, 2025`;
                                                                }
                                                                
                                                                // Entity Icon Logic - Updated to use Warning Icon for Unsanctioned Risk
                                                                let EntityIcon = AlertTriangle;
                                                                let entityColor = "text-amber-600 dark:text-amber-400";
                                                                let entityBg = "bg-amber-100 dark:bg-amber-900/30";

                                                                // Keep the original entity type logic commented out or unused if we strictly want the warning icon
                                                                // OR: Only use specific icons if it's NOT unsanctioned (which shouldn't happen in this view if filtered correctly)
                                                                
                                                                /* Original Entity Logic (preserved but overridden)
                                                                const isModel = MOCK_AI_MODELS.some(m => m.name === appData.name) || item.type === 'Model';
                                                                const isTool = MOCK_TOOLS.some(t => t.name === appData.name) || item.type === 'Tool';
                                                                const isDataset = MOCK_DATASETS.some(d => d.name === appData.name) || item.type === 'Data';

                                                                if (isModel) {
                                                                    EntityIcon = Box;
                                                                    entityColor = "text-indigo-600 dark:text-indigo-400";
                                                                    entityBg = "bg-indigo-100 dark:bg-indigo-900/30";
                                                                } else if (isTool) {
                                                                    EntityIcon = Wrench;
                                                                    entityColor = "text-cyan-600 dark:text-cyan-400";
                                                                    entityBg = "bg-cyan-100 dark:bg-cyan-900/30";
                                                                } else if (isDataset) {
                                                                    EntityIcon = Database;
                                                                    entityColor = "text-purple-600 dark:text-purple-400";
                                                                    entityBg = "bg-purple-100 dark:bg-purple-900/30";
                                                                }
                                                                */

                                                                    const isSelected = selectedEvent && (
                                                                        selectedEvent.id === item.name || 
                                                                        (item.events && item.events.some((e: any) => e.id === selectedEvent.id))
                                                                    );
                                                                    
                                                                    // Title for Unsanctioned
                                                                    const displayTitle = `${item.identityCount} Identities accessed unsanctioned ${item.name}`;

                                                                    return (
                                                                        <div 
                                                                            key={`group-${item.name}`}
                                                                            onClick={() => {
                                                                                // Construct a rich event object for the details panel
                                                                                // This combines the aggregated group info with static app data
                                                                                const panelEvent = {
                                                                                    ...item.events[0], // Base props
                                                                                    // Overrides
                                                                                    name: appData.name,
                                                                                    app: appData.name,
                                                                                    category: (appData as any).category || item.events[0].category || 'Unknown',
                                                                                    type: (appData as any).type || item.events[0].type || 'Unknown',
                                                                                    vendor: (appData as any).vendor || 'Unknown Vendor',
                                                                                    ccl: (appData as any).ccl,
                                                                                    firstSeen: appData.firstSeen,
                                                                                    lastSeen: item.lastSeen,
                                                                                    isNew: isNew, // Group-level isNew
                                                                                    status: 'unsanctioned',
                                                                                    risk: item.maxSeverity, // Group-level severity
                                                                                    traffic: item.events[0].traffic, // Or sum it up if needed
                                                                                    identityCount: item.identityCount,
                                                                                    id: item.name, // Use name as ID for sanctioning logic
                                                                                    icon: (foundEntity as any)?.icon || EntityIcon
                                                                                };
                                                                                
                                                                                setSelectedEvent(panelEvent);
                                                                                setSelectedEventType('unsanctioned');
                                                                            }}
                                                                            className={cn(
                                                                                "p-4 border rounded-xl shadow-sm transition-all cursor-pointer flex flex-col gap-3 group",
                                                                                isSelected 
                                                                                    ? "border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400 bg-blue-50/10 dark:bg-blue-900/10" 
                                                                                    : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md"
                                                                            )}
                                                                        >
                                                                            {/* Row 1: Risk Level & Timestamp */}
                                                                            <div className="flex items-center justify-between">
                                                                                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0", severityColor)}>
                                                                                    <AlertTriangle size={12} />
                                                                                    <span>{severity}</span>
                                                                                </div>
                                                                                <span className="text-xs text-slate-400 font-medium">1 hour ago</span>
                                                                            </div>

                                                                            {/* Row 2: Title */}
                                                                            <h5 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                                                                                {displayTitle}
                                                                            </h5>

                                                                            {/* Row 3: Topic Bullet Points */}
                                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                                {item.reasons && item.reasons.length > 0 ? (
                                                                                    Array.from(item.reasons).map((reason: any, idx: number) => (
                                                                                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                                            {reason}
                                                                                        </span>
                                                                                    ))
                                                                                ) : (
                                                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Unsanctioned App</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                            } else {

                                                                // Render Standard Event Card (Malicious, DLP, etc.)
                                                                const event = item;
                                                                const isSelected = selectedEvent && selectedEvent.id === event.id;
                                                                
                                                                // Derive title
                                                                const displayTitle = (() => {
                                                                     const isPosturRisk = item.groupType === 'posture-risk' || event.category === 'Posture Vulnerabilities';
                                                                     if (isPosturRisk) {
                                                                         return `${event.label || 'Posture Issue'}: ${event.subLabel || 'Vulnerability detected'}`;
                                                                     }
                                                                     if (MOCK_DLP_EVENTS.some(e => e.id === event.id)) {
                                                                         return `${event.user || 'User'} leaked sensitive data when using ${event.app || 'App'}`;
                                                                     }
                                                                     if (MOCK_MALICIOUS_EVENTS.some(e => e.id === event.id)) {
                                                                         return `Prompt Injection Causing PII Exfiltration`;
                                                                     }
                                                                     return event.app || event.type || event.data;
                                                                })();
                                                                
                                                                // Derive severity color
                                                                const cardSeverity = event.risk || event.severity || event.action || 'Medium';
                                                                const cardSeverityColor = (cardSeverity === 'High' || cardSeverity === 'Critical' || cardSeverity === 'Blocked')
                                                                     ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                                     : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
                                                                
                                                                // Derive Icon
                                                                const CardIcon = (MOCK_MALICIOUS_EVENTS.some(e => e.id === event.id) || event.severity === 'Critical') ? Zap : 
                                                                                 event.action ? ShieldAlert : AlertTriangle;

                                                                return (
                                                                    <div 
                                                                        key={event.id || i} 
                                                                        onClick={() => {
                                                                            setSelectedEvent(event);
                                                                            if (MOCK_MALICIOUS_EVENTS.some(e => e.id === event.id)) setSelectedEventType('malicious');
                                                                            else if (MOCK_DLP_EVENTS.some(e => e.id === event.id)) setSelectedEventType('data-leakage');
                                                                            else setSelectedEventType('unsanctioned');
                                                                        }}
                                                                        className={cn(
                                                                            "p-4 border rounded-xl shadow-sm transition-all cursor-pointer flex flex-col gap-3 group",
                                                                            isSelected
                                                                                ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                                                                                : "border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md bg-white dark:bg-slate-800"
                                                                        )}
                                                                    >
                                                                         {/* Row 1: Risk Level & Timestamp */}
                                                                         <div className="flex items-center justify-between">
                                                                            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0", cardSeverityColor)}>
                                                                                <CardIcon size={12} />
                                                                                <span>{cardSeverity}</span>
                                                                            </div>
                                                                            <span className="text-xs text-slate-400 font-medium">1 hour ago</span>
                                                                        </div>

                                                                        {/* Row 2: Title */}
                                                                        <h5 className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                                                                            {displayTitle}
                                                                        </h5>

                                                                        {/* Row 3: Topic Bullet Points (simulated for fallback) */}
                                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                                             {event.isNew && (
                                                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">New Discovery</span>
                                                                             )}
                                                                             <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                                {event.type || 'Risk Event'}
                                                                             </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        });
                                                    })()}
                                                </>
                                            )}

                                            {activeTab === 'assets' && (
                                                <>
                                                    {(() => {
                                                        let activeAssets = assets;
                                                        const focusedId = activeNodeId || (focusPath.length > 0 ? focusPath[focusPath.length - 1] : null);
                                                        let title = "Assets";
                                                        
                                                        if (focusedId) {
                                                            if (focusedId === 'dst-agents') { activeAssets = MOCK_AGENTS; title = "Agents"; }
                                                            else if (focusedId === 'ai-services') { activeAssets = MOCK_AI_SERVICES; title = "AI Services"; }
                                                            else if (focusedId === 'mcps') { activeAssets = MOCK_MCPS; title = "MCPs"; }
                                                            else if (focusedId === 'ai-apps') { activeAssets = MOCK_APPS; title = "AI Apps"; }
                                                            else if (focusedId === 'ai-models') { activeAssets = MOCK_AI_MODELS; title = "AI Models"; }
                                                            else if (focusedId === 'tools') { activeAssets = MOCK_TOOLS; title = "Tools"; }
                                                            else if (focusedId === 'datasets') { activeAssets = MOCK_DATASETS; title = "Datasets"; }
                                                        }

                                                        if (activeAssets.length === 0) return <p className="text-sm text-gray-400 italic">No assets found.</p>;

                                                        return (
                                                            <div className="flex flex-col gap-3">
                                                                {/* Header removed per user request (handled by summaryText) */}
                                                                {activeAssets.map((asset, idx) => {
                                                                    const getAssetStyle = (name: string, type: string, category: string) => {
                                                                        const defaults = { color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', icon: Box };
                                                                        
                                                                        // 1. Direct Lookup in Mock Data
                                                                        if (MOCK_APPS.some(a => a.name === name)) return { color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', icon: LayoutGrid };
                                                                        if (MOCK_AI_MODELS.some(m => m.name === name)) return { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Box };
                                                                        if (MOCK_TOOLS.some(t => t.name === name)) return { color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: Wrench };
                                                                        if (MOCK_DATASETS.some(d => d.name === name)) return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Database };
                                                                        if (MOCK_AGENTS.some(a => a.name === name)) return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Bot };
                                                                        if (MOCK_AI_SERVICES.some(s => s.name === name)) return { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: Cpu };
                                                                        if (MOCK_MCPS.some(m => m.name === name)) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Workflow };

                                                                        // 2. Heuristic Fallback
                                                                        if (type === 'App' || category === 'LLM' || category === 'Chatbot') return { color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', icon: LayoutGrid }; 
                                                                        if (type === 'Model') return { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Box };
                                                                        if (type === 'Tool') return { color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: Wrench };
                                                                        if (type === 'Data' || type === 'Dataset') return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Database };
                                                                        if (category === 'Agent') return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Bot };
                                                                        if (category === 'Cloud' || category === 'On-prem') return { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: Cpu };
                                                                        
                                                                        return defaults;
                                                                    };
                                                                    const style = getAssetStyle(asset.name, asset.type, asset.category);
                                                                    const Icon = style.icon;

                                                                    return (
                                                                        <div 
                                                                            key={idx} 
                                                                            onClick={() => {
                                                                                const item = (asset as any)._original || asset;
                                                                                if (MOCK_APPS.some(a => a.name === item.name)) setSelectedApp(item);
                                                                                else if (MOCK_AI_MODELS.some(m => m.name === item.name)) setSelectedModel(item);
                                                                                else if (MOCK_DATASETS.some(d => d.name === item.name)) setSelectedDataset(item);
                                                                                else if (MOCK_TOOLS.some(t => t.name === item.name)) setSelectedTool(item);
                                                                            }}
                                                                            className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer shadow-sm hover:shadow-md transition-all"
                                                                        >
                                                                            <div className={cn(
                                                                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                                                                style.color,
                                                                                style.bg
                                                                            )}>
                                                                                <Icon size={16} />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <h5 className="font-bold text-sm text-gray-900 dark:text-slate-100">{asset.name}</h5>
                                                                                    {asset.isNew && (
                                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                                            NEW
                                                                                        </span>
                                                                                    )}
                                                                                    {asset.status === 'unsanctioned' && (
                                                                                         <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                                                            Unsanctioned
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 dark:text-slate-400">{asset.category || asset.type} • {asset.type}</div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                                    </div>
                                )}
                                
                                {!activeNodeId && riskLevelFilter === 'all' && (
                                    <div className="p-6 flex flex-col h-full">
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                                Select any node from the graph to view the detailed risk analysis or choose a topic below to view the related risks.
                                            </p>
                                            <div className="space-y-3">
                                                <button 
                                                    onClick={() => {
                                                        setRiskLevelFilter('critical');
                                                    }}
                                                    className="w-full py-2 px-4 bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-700 text-white dark:text-slate-200 rounded-lg font-medium text-sm transition-all shadow-sm border border-slate-700 dark:border-slate-700 flex items-center justify-center gap-2"
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                    View Critical Risks
                                                </button>
                                                <button 
                                                    className="w-full py-2 px-4 bg-transparent border border-slate-700 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-300 dark:hover:text-slate-300 hover:border-slate-600 dark:hover:border-slate-700 rounded-lg font-medium text-sm transition-all"
                                                >
                                                    + Create Topic
                                                </button>
                                            </div>

                                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 hidden">
                                                <div className="text-center mb-1">
                                                    <button className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-300 dark:border-slate-600 pb-0.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">View All Risks</button>
                                                </div>
                                                
                                                {(() => {
                                                    const { groupedEvents, otherEvents } = relatedRiskListEvents.reduce((acc: any, event: any) => {
                                                        const isAppType = event.type === 'App' || event.type === 'Tool' || event.type === 'Model';
                                                        const isDlpType = (event.data && event.dest && event.action);
                                                        const isMaliciousType = (event.type && ['Jailbreak', 'Prompt Injection', 'Data Exfiltration', 'Supply Chain Poisoning'].includes(event.type)) || MOCK_MALICIOUS_EVENTS.some(m => m.id === event.id);
                                                        const eventType = (event.category === 'Posture Vulnerabilities') ? 'posture-risk' : null;

                                                        if (isAppType && !eventType) {
                                                            const name = event.app || event.target || event.dest;
                                                            if (!acc.groupedEvents[name]) {
                                                                acc.groupedEvents[name] = {
                                                                    name,
                                                                    events: [],
                                                                    maxSeverity: 'Low',
                                                                    isNew: false,
                                                                    identityCount: 0,
                                                                    lastSeen: event.time,
                                                                    type: event.type,
                                                                    groupType: 'app',
                                                                    reasons: new Set<string>()
                                                                };
                                                            }
                                                            const group = acc.groupedEvents[name];
                                                            group.events.push(event);
                                                            
                                                            const severity = event.risk || 'Medium';
                                                            const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
                                                            if (severityLevels.indexOf(severity) > severityLevels.indexOf(group.maxSeverity)) {
                                                                group.maxSeverity = severity;
                                                            }
                                                            
                                                            if (event.isNew) {
                                                                group.isNew = true;
                                                                group.reasons.add("Newly discovered AI usage");
                                                            }

                                                            const appEntity = MOCK_APPS.find(a => a.name === group.name);
                                                            if (appEntity && (appEntity.ccl || 100) < 60) {
                                                                group.reasons.add("Unsafe AI usage");
                                                            }
                                                            
                                                            group.reasons.add("Unsanctioned AI usage");
                                                            group.identityCount += (event.identityCount || 1);

                                                        } else if (isMaliciousType) {
                                                            const name = event.type || "Unknown Attack";
                                                            const groupKey = `malicious-${event.type}-${event.target}`;
                                                            
                                                            if (!acc.groupedEvents[groupKey]) {
                                                                acc.groupedEvents[groupKey] = {
                                                                    name,
                                                                    events: [],
                                                                    maxSeverity: event.severity || event.risk || 'High',
                                                                    isNew: false,
                                                                    identityCount: 0,
                                                                    lastSeen: event.time,
                                                                    type: event.type,
                                                                    groupType: 'malicious',
                                                                    target: event.target,
                                                                    reasons: new Set<string>()
                                                                };
                                                            }
                                                            const group = acc.groupedEvents[groupKey];
                                                            group.events.push(event);
                                                            group.identityCount += (event.identityCount || 1);
                                                            if (event.reasons) event.reasons.forEach((r: string) => group.reasons.add(r));
                                                            else if (event.type === 'Jailbreak') group.reasons.add("Attack Successful");

                                                        } else if (isDlpType) {
                                                            const name = event.app || event.dest || "Unknown Destination";
                                                            const groupKey = `dlp-${name}`;
                                                            
                                                            if (!acc.groupedEvents[groupKey]) {
                                                                acc.groupedEvents[groupKey] = {
                                                                    name,
                                                                    events: [],
                                                                    maxSeverity: 'Critical',
                                                                    isNew: false,
                                                                    identityCount: 0,
                                                                    lastSeen: event.time,
                                                                    type: 'Data Leakage',
                                                                    groupType: 'dlp',
                                                                    reasons: new Set<string>()
                                                                };
                                                            }
                                                            const group = acc.groupedEvents[groupKey];
                                                            group.events.push(event);
                                                            group.identityCount += (event.identityCount || 1);
                                                            if (event.reasons) event.reasons.forEach((r: string) => group.reasons.add(r));
                                                            else {
                                                                if (event.data) group.reasons.add(`Sensitive Data: ${event.data}`);
                                                            }
                                                        } else if (eventType === 'posture-risk') {
                                                            const name = event.name || "Configuration Issue";
                                                            const groupKey = `posture-${name}`;

                                                            if (!acc.groupedEvents[groupKey]) {
                                                                acc.groupedEvents[groupKey] = {
                                                                    name,
                                                                    events: [],
                                                                    maxSeverity: event.severity || 'Medium',
                                                                    isNew: false,
                                                                    identityCount: 0,
                                                                    lastSeen: event.time,
                                                                    type: 'Posture',
                                                                    groupType: 'posture-risk',
                                                                    reasons: new Set<string>()
                                                                };
                                                            }
                                                            const group = acc.groupedEvents[groupKey];
                                                            group.events.push(event);
                                                            if (event.reasons) event.reasons.forEach((r: string) => group.reasons.add(r));

                                                        } else {
                                                            acc.otherEvents.push(event);
                                                        }
                                                        return acc;
                                                    }, { groupedEvents: {}, otherEvents: [] });

                                                    Object.values(groupedEvents).forEach((group: any) => {
                                                        group.reasons = Array.from(group.reasons);
                                                    });

                                                    const renderItems = [
                                                        ...Object.values(groupedEvents).map((g: any) => ({ ...g, _isGroup: true })),
                                                        ...otherEvents.map((e: any) => ({ ...e, _isGroup: false }))
                                                    ];

                                                    renderItems.sort((a: any, b: any) => {
                                                        const sevA = a.maxSeverity || a.risk || a.severity || 'Low';
                                                        const sevB = b.maxSeverity || b.risk || b.severity || 'Low';
                                                        const levels = ['Low', 'Medium', 'High', 'Critical'];
                                                        return levels.indexOf(sevB) - levels.indexOf(sevA);
                                                    });

                                                    const counts = renderItems.reduce((acc: any, item: any) => {
                                                        const severity = item._isGroup ? item.maxSeverity : (item.risk || item.severity || (item.action === 'Blocked' ? 'Critical' : 'Medium'));
                                                        let label = severity;
                                                        if (label === 'Flagged') label = 'High';
                                                        if (label === 'Blocked') label = 'Critical';
                                                        if (!['Critical', 'High', 'Medium', 'Low'].includes(label)) label = 'Medium';
                                                        
                                                        acc[label] = (acc[label] || 0) + 1;
                                                        return acc;
                                                    }, {});
                                                    const order = ['Critical', 'High', 'Medium', 'Low'];
                                                    const summaryText = order.filter(k => counts[k]).map(k => `${counts[k]} ${k}`).join(', ');

                                                    return (
                                                        <div className="mt-4">
                                                            {summaryText && (
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 text-center font-medium">
                                                                    {summaryText}
                                                                </p>
                                                            )}
                                                            <div className="space-y-3 pb-8">
                                                                {renderItems.map((item: any, idx: number) => {
                                                                    const severity = item._isGroup ? item.maxSeverity : (item.risk || item.severity || 'Medium');
                                                                    const isSanctioned = sanctionedIds.has(item.name) || sanctionedIds.has(item.id);
                                                                    const isHigh = severity === 'High' || severity === 'Critical';
                                                                    const severityColor = isSanctioned
                                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                        : (isHigh ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400");
                                                                    const RiskIcon = isSanctioned ? CheckCircle : AlertTriangle;

                                                                    const title = item.groupType === 'dlp' 
                                                                        ? `${item.name} has risky data` 
                                                                        : (item.groupType === 'malicious' 
                                                                            ? item.name 
                                                                            : `${item.identityCount} Identities accessed ${item.name}`);

                                                                    const cci = item.groupType === 'app' ? 55 : 'N/A';
                                                                    const cciColor = cci < 60 ? "text-amber-600 dark:text-amber-500" : "text-slate-500";
                                                                    const date = "Jan 6, 2026";

                                                                    return (
                                                                        <div 
                                                                            key={`global-risk-${idx}`}
                                                                            className="p-4 border border-gray-100 dark:border-slate-800 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer group"
                                                                            onClick={() => {
                                                                                 if (item.events && item.events[0]) {
                                                                                     setSelectedEvent(item.events[0]);
                                                                                     setSelectedEventType(item.groupType === 'dlp' ? 'data-leakage' : (item.groupType === 'malicious' ? 'malicious' : 'unsanctioned'));
                                                                                 }
                                                                            }}
                                                                        >
                                                                            <div className="flex items-start gap-3 mb-4">
                                                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", severityColor)}>
                                                                                    <RiskIcon size={16} />
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <h5 className="font-bold text-slate-200 text-sm mb-2 leading-tight">{title}</h5>
                                                                                    <ul className="space-y-1">
                                                                                        {(item.reasons || []).slice(0, 3).map((r: string, i: number) => (
                                                                                            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                                                                                <span className="mt-1 w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                                                                                                {r}
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">RISK LEVEL</span>
                                                                                    <div className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase w-fit", severityColor)}>
                                                                                        <RiskIcon size={10} />
                                                                                        {severity}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">CCI</span>
                                                                                    <span className={cn("text-xs font-bold", cciColor)}>{cci}</span>
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5 items-end">
                                                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">FIRST SEEN</span>
                                                                                    <span className="text-xs font-bold text-slate-400">{date}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Details Panel */}
                <AnimatePresence>
                    {selectedEvent && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1, flex: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="h-full overflow-hidden bg-white dark:bg-slate-950 shadow-none z-20 border-l border-slate-200 dark:border-slate-800"
                        >
                            <RiskDetailsPanel 
                                event={selectedEvent} 
                                type={selectedEventType} 
                                onClose={() => { 
                                    if (selectedEvent) {
                                        const target = (selectedEvent as any).name || selectedEvent.app || selectedEvent.type || selectedEvent.data;
                                        if (target) setFocusPath(prev => prev.filter(p => p !== target));
                                    }
                                    setSelectedEvent(null); 
                                    setSelectedEventType(null); 
                                }} 
                                onSanction={handleSanction}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modals & Panels */}
                <AppDetailsPanel 
                    isOpen={!!selectedApp} 
                    onClose={() => setSelectedApp(null)} 
                    app={selectedApp} 
                />
                <ModelDetailsPanel
                    isOpen={!!selectedModel}
                    onClose={() => setSelectedModel(null)}
                    model={selectedModel}
                />
                <DatasetDetailsPanel
                    isOpen={!!selectedDataset}
                    onClose={() => setSelectedDataset(null)}
                    dataset={selectedDataset}
                />
                <ToolDetailsPanel
                    isOpen={!!selectedTool}
                    onClose={() => setSelectedTool(null)}
                    tool={selectedTool}
                />
        </div>
    );
}