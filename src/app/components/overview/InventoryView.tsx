import React, { useState } from 'react';
import { 
    LayoutGrid, Bot, Box, Database, Wrench, FileCode, Search, Filter, ArrowUpDown, 
    MoreHorizontal, ShieldCheck, ShieldAlert, AlertTriangle, Users, Layers, ExternalLink, 
    Globe, Cloud, Code, MessageSquare, Briefcase, FileText, List, Cpu, Server,
    ChevronDown, ChevronRight, Terminal, AppWindow, Plug, Fingerprint, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

// --- Types ---
interface InventoryItem {
    id: string;
    name: string;
    description: string;
    category: string;
    cciScore: number;
    users: number;
    supplyChainItems: number;
    status: 'Sanctioned' | 'Unsanctioned';
    riskLevel: 'High Risk' | 'Medium Risk' | 'Low Risk';
    icon: any;
    image?: string; // For Figma assets if needed
    timestamp?: string; // For Sessions
    promptCount?: number; // For Sessions
    identity?: string; // For Sessions
}

// --- Mock Data ---
const MOCK_APPS: InventoryItem[] = [
    {
        id: '1',
        name: 'ChatGPT',
        description: 'AI-powered conversational agent for various tasks.',
        category: 'Conversational AI',
        cciScore: 85,
        users: 1250,
        supplyChainItems: 3,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    },
    {
        id: '2',
        name: 'Jasper',
        description: 'AI content generation platform for marketing.',
        category: 'Content Creation',
        cciScore: 72,
        users: 45,
        supplyChainItems: 1,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: FileCode
    },
    {
        id: '3',
        name: 'Midjourney',
        description: 'Generative artificial intelligence program and service.',
        category: 'Image Generation',
        cciScore: 45,
        users: 89,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Box
    },
    {
        id: '4',
        name: 'GitHub Copilot',
        description: 'AI pair programmer that offers autocomplete suggestions.',
        category: 'Coding Assistant',
        cciScore: 92,
        users: 800,
        supplyChainItems: 5,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: LayoutGrid
    },
    {
        id: '5',
        name: 'Notion AI',
        description: 'Integrated AI features within the Notion workspace.',
        category: 'Productivity',
        cciScore: 78,
        users: 320,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileCode
    },
    {
        id: '6',
        name: 'GrammarlyGO',
        description: 'Contextually aware AI writing assistant.',
        category: 'Writing Assistant',
        cciScore: 88,
        users: 1500,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileCode
    },
    {
        id: '7',
        name: 'Unknown PDF Tool',
        description: 'Unauthorized tool for summarizing PDF documents.',
        category: 'Document Analysis',
        cciScore: 20,
        users: 12,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: FileCode
    },
    {
        id: '8',
        name: 'Hugging Face',
        description: 'Platform for sharing machine learning models and datasets.',
        category: 'ML Platform',
        cciScore: 65,
        users: 50,
        supplyChainItems: 12,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Database
    },
    {
        id: '9',
        name: 'Runway',
        description: 'Applied AI research company shaping the next era of art.',
        category: 'Video Generation',
        cciScore: 76,
        users: 112,
        supplyChainItems: 4,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Box
    },
    {
        id: '10',
        name: 'Stable Diffusion',
        description: 'Latent text-to-image diffusion model.',
        category: 'Image Generation',
        cciScore: 68,
        users: 240,
        supplyChainItems: 8,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Box
    },
    {
        id: '11',
        name: 'Synthesia',
        description: 'AI video generation platform.',
        category: 'Video Generation',
        cciScore: 82,
        users: 65,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileCode
    },
    {
        id: '12',
        name: 'Descript',
        description: 'All-in-one audio and video editing.',
        category: 'Video Editing',
        cciScore: 89,
        users: 180,
        supplyChainItems: 3,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileCode
    },
    {
        id: '13',
        name: 'Otter.ai',
        description: 'AI meeting notes and real-time transcription.',
        category: 'Transcription',
        cciScore: 80,
        users: 450,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    },
    {
        id: '14',
        name: 'Beautiful.ai',
        description: 'Presentation software to create stunning slides.',
        category: 'Presentation',
        cciScore: 85,
        users: 120,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: LayoutGrid
    },
    {
        id: '15',
        name: 'Tome',
        description: 'AI-powered storytelling format.',
        category: 'Storytelling',
        cciScore: 55,
        users: 34,
        supplyChainItems: 1,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: FileCode
    },
    {
        id: '16',
        name: 'Gamma',
        description: 'Medium for presenting ideas, powered by AI.',
        category: 'Presentation',
        cciScore: 60,
        users: 28,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'Low Risk',
        icon: LayoutGrid
    },
    {
        id: '17',
        name: 'Perplexity AI',
        description: 'AI conversational search engine.',
        category: 'Search Engine',
        cciScore: 78,
        users: 320,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Bot
    },
    {
        id: '18',
        name: 'Claude 2',
        description: 'Next generation AI assistant by Anthropic.',
        category: 'Conversational AI',
        cciScore: 88,
        users: 140,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    },
    {
        id: '19',
        name: 'Copy.ai',
        description: 'AI marketing copy generator.',
        category: 'Content Creation',
        cciScore: 72,
        users: 95,
        supplyChainItems: 1,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: FileCode
    },
    {
        id: '20',
        name: 'Fireflies.ai',
        description: 'Automate meeting notes.',
        category: 'Transcription',
        cciScore: 70,
        users: 55,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Bot
    }
];

const MOCK_AGENTS: InventoryItem[] = [
    {
        id: 'a1',
        name: 'AutoGPT',
        description: 'Autonomous GPT-4 agent for goal achievement.',
        category: 'Autonomous Agent',
        cciScore: 50,
        users: 210,
        supplyChainItems: 5,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Bot
    },
    {
        id: 'a2',
        name: 'BabyAGI',
        description: 'Task-driven autonomous agent system.',
        category: 'Autonomous Agent',
        cciScore: 48,
        users: 150,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Bot
    },
    {
        id: 'a3',
        name: 'AgentGPT',
        description: 'Assemble, configure, and deploy autonomous AI agents.',
        category: 'Agent Platform',
        cciScore: 65,
        users: 340,
        supplyChainItems: 3,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Bot
    },
    {
        id: 'a4',
        name: 'Godmode',
        description: 'Web platform for running AutoGPT and BabyAGI.',
        category: 'Agent Platform',
        cciScore: 42,
        users: 98,
        supplyChainItems: 4,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Bot
    },
    {
        id: 'a5',
        name: 'Lindy',
        description: 'AI executive assistant for scheduling and email.',
        category: 'Personal Assistant',
        cciScore: 82,
        users: 56,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    },
    {
        id: 'a6',
        name: 'MultiOn',
        description: 'AI agent that can browse the web and act for you.',
        category: 'Browser Agent',
        cciScore: 75,
        users: 45,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Bot
    },
    {
        id: 'a7',
        name: 'HyperWrite',
        description: 'AI agent for research and writing tasks.',
        category: 'Research Agent',
        cciScore: 88,
        users: 1200,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    },
    {
        id: 'a8',
        name: 'ChemCrow',
        description: 'Agent for chemistry-related tasks.',
        category: 'Scientific Agent',
        cciScore: 90,
        users: 25,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    }
];

const MOCK_MODELS: InventoryItem[] = [
    {
        id: 'm1',
        name: 'GPT-4',
        description: 'Multimodal model by OpenAI.',
        category: 'LLM',
        cciScore: 95,
        users: 2500,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'm2',
        name: 'Claude 3 Opus',
        description: 'Anthropic\'s most powerful model.',
        category: 'LLM',
        cciScore: 92,
        users: 890,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'm3',
        name: 'Llama 3',
        description: 'Open source model by Meta.',
        category: 'Open Source LLM',
        cciScore: 85,
        users: 1450,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'm4',
        name: 'Mistral Large',
        description: 'Flagship model by Mistral AI.',
        category: 'LLM',
        cciScore: 88,
        users: 320,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'm5',
        name: 'DALL-E 3',
        description: 'Image generation model by OpenAI.',
        category: 'Image Model',
        cciScore: 90,
        users: 1100,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'm6',
        name: 'Stable Diffusion XL',
        description: 'Text-to-image model by Stability AI.',
        category: 'Image Model',
        cciScore: 65,
        users: 800,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Box
    },
    {
        id: 'm7',
        name: 'Gemini Pro',
        description: 'Google\'s multimodal AI model.',
        category: 'LLM',
        cciScore: 91,
        users: 1800,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'm8',
        name: 'Falcon 180B',
        description: 'Large open access model by TII.',
        category: 'Open Source LLM',
        cciScore: 78,
        users: 120,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Box
    }
];

const MOCK_MCPS: InventoryItem[] = [
    {
        id: 'mcp1',
        name: 'PostgreSQL Connector',
        description: 'Direct database access for AI agents via MCP.',
        category: 'Database',
        cciScore: 92,
        users: 450,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Database
    },
    {
        id: 'mcp2',
        name: 'GitHub Integration',
        description: 'Access repositories, issues, and PRs.',
        category: 'Development',
        cciScore: 88,
        users: 1200,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Code
    },
    {
        id: 'mcp3',
        name: 'Slack Messenger',
        description: 'Read and send messages in Slack channels.',
        category: 'Communication',
        cciScore: 85,
        users: 850,
        supplyChainItems: 3,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp4',
        name: 'Local Filesystem',
        description: 'Read and write access to local server files.',
        category: 'System',
        cciScore: 45,
        users: 120,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Layers
    },
    {
        id: 'mcp5',
        name: 'Google Drive',
        description: 'Access and manage files in Google Drive.',
        category: 'Storage',
        cciScore: 80,
        users: 600,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Cloud
    },
    {
        id: 'mcp6',
        name: 'Notion API',
        description: 'Read and update Notion pages and databases.',
        category: 'Productivity',
        cciScore: 82,
        users: 400,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileText
    },
    {
        id: 'mcp7',
        name: 'Stripe Payments',
        description: 'Process payments and view transaction history.',
        category: 'Finance',
        cciScore: 95,
        users: 80,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Briefcase
    },
    {
        id: 'mcp8',
        name: 'Twilio SMS',
        description: 'Send and receive SMS messages via Twilio.',
        category: 'Communication',
        cciScore: 88,
        users: 150,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp9',
        name: 'Linear Issues',
        description: 'Manage Linear issues and projects.',
        category: 'Project Management',
        cciScore: 85,
        users: 220,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Briefcase
    },
    {
        id: 'mcp10',
        name: 'Jira Cloud',
        description: 'Enterprise issue tracking integration.',
        category: 'Project Management',
        cciScore: 90,
        users: 800,
        supplyChainItems: 4,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Briefcase
    },
    {
        id: 'mcp11',
        name: 'AWS S3',
        description: 'Object storage access for AI models.',
        category: 'Storage',
        cciScore: 94,
        users: 350,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Cloud
    },
    {
        id: 'mcp12',
        name: 'Figma Design',
        description: 'Read design tokens and comments.',
        category: 'Design',
        cciScore: 78,
        users: 300,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Layers
    },
    {
        id: 'mcp13',
        name: 'Gmail Access',
        description: 'Read and draft emails via Gmail API.',
        category: 'Communication',
        cciScore: 70,
        users: 500,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp14',
        name: 'Salesforce CRM',
        description: 'Customer relationship data access.',
        category: 'Sales',
        cciScore: 92,
        users: 650,
        supplyChainItems: 3,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Briefcase
    },
    {
        id: 'mcp15',
        name: 'HubSpot',
        description: 'Marketing and sales automation platform.',
        category: 'Marketing',
        cciScore: 86,
        users: 240,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Briefcase
    },
    {
        id: 'mcp16',
        name: 'GitLab',
        description: 'DevOps and version control integration.',
        category: 'Development',
        cciScore: 85,
        users: 180,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Code
    },
    {
        id: 'mcp17',
        name: 'Brave Search',
        description: 'Privacy-focused web search for agents.',
        category: 'Search',
        cciScore: 80,
        users: 110,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Globe
    },
    {
        id: 'mcp18',
        name: 'Weather API',
        description: 'Real-time weather data fetching.',
        category: 'Utility',
        cciScore: 95,
        users: 90,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Globe
    },
    {
        id: 'mcp19',
        name: 'Python Interpreter',
        description: 'Execute Python code in a sandboxed environment.',
        category: 'Compute',
        cciScore: 60,
        users: 800,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Code
    },
    {
        id: 'mcp20',
        name: 'Calculator',
        description: 'Basic mathematical operations utility.',
        category: 'Utility',
        cciScore: 100,
        users: 50,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Wrench
    },
    {
        id: 'mcp21',
        name: 'SQL Client',
        description: 'Generic SQL query execution tool.',
        category: 'Database',
        cciScore: 75,
        users: 300,
        supplyChainItems: 1,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Database
    },
    {
        id: 'mcp22',
        name: 'GraphQL Client',
        description: 'Connect to arbitrary GraphQL endpoints.',
        category: 'Development',
        cciScore: 70,
        users: 150,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Code
    },
    {
        id: 'mcp23',
        name: 'Puppeteer Browser',
        description: 'Headless browser automation for scraping.',
        category: 'Automation',
        cciScore: 50,
        users: 85,
        supplyChainItems: 1,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Globe
    },
    {
        id: 'mcp24',
        name: 'PDF Reader',
        description: 'Extract text and metadata from PDF files.',
        category: 'Document',
        cciScore: 90,
        users: 400,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileText
    },
    {
        id: 'mcp25',
        name: 'Pinecone Vector DB',
        description: 'Semantic search and vector storage.',
        category: 'Database',
        cciScore: 88,
        users: 220,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Database
    },
    {
        id: 'mcp26',
        name: 'Redis Cache',
        description: 'In-memory data structure store access.',
        category: 'Database',
        cciScore: 85,
        users: 310,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Database
    },
    {
        id: 'mcp27',
        name: 'MongoDB',
        description: 'NoSQL document database connector.',
        category: 'Database',
        cciScore: 82,
        users: 280,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Database
    },
    {
        id: 'mcp28',
        name: 'Snowflake',
        description: 'Data warehouse query interface.',
        category: 'Database',
        cciScore: 94,
        users: 150,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Database
    },
    {
        id: 'mcp29',
        name: 'Datadog Metrics',
        description: 'Fetch system metrics and logs.',
        category: 'Monitoring',
        cciScore: 90,
        users: 180,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Layers
    },
    {
        id: 'mcp30',
        name: 'PagerDuty',
        description: 'Incident response triggering and checking.',
        category: 'Monitoring',
        cciScore: 92,
        users: 120,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: AlertTriangle
    },
    {
        id: 'mcp31',
        name: 'Zendesk Support',
        description: 'Customer ticket management integration.',
        category: 'Support',
        cciScore: 88,
        users: 200,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp32',
        name: 'Intercom',
        description: 'Customer messaging platform access.',
        category: 'Support',
        cciScore: 84,
        users: 160,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp33',
        name: 'Shopify Admin',
        description: 'E-commerce store management.',
        category: 'Commerce',
        cciScore: 90,
        users: 75,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Briefcase
    },
    {
        id: 'mcp34',
        name: 'WordPress',
        description: 'Publish posts and manage content.',
        category: 'CMS',
        cciScore: 78,
        users: 300,
        supplyChainItems: 3,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Globe
    },
    {
        id: 'mcp35',
        name: 'Twitter/X API',
        description: 'Post tweets and read timelines.',
        category: 'Social',
        cciScore: 65,
        users: 140,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Globe
    },
    {
        id: 'mcp36',
        name: 'LinkedIn API',
        description: 'Professional network posting.',
        category: 'Social',
        cciScore: 80,
        users: 90,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Globe
    },
    {
        id: 'mcp37',
        name: 'Discord Bot',
        description: 'Channel messaging and moderation.',
        category: 'Communication',
        cciScore: 72,
        users: 420,
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp38',
        name: 'SendGrid Email',
        description: 'Transactional email sending service.',
        category: 'Communication',
        cciScore: 88,
        users: 110,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'mcp39',
        name: 'Zoom Meetings',
        description: 'Schedule and manage video calls.',
        category: 'Communication',
        cciScore: 85,
        users: 550,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Globe
    },
    {
        id: 'mcp40',
        name: 'Memory Bank',
        description: 'Long-term memory storage for agents.',
        category: 'System',
        cciScore: 80,
        users: 900,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Database
    },
    {
        id: 'mcp41',
        name: 'Audio Transcriber',
        description: 'Convert audio files to text locally.',
        category: 'Media',
        cciScore: 85,
        users: 60,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: FileCode
    },
    {
        id: 'mcp42',
        name: 'Video Analyzer',
        description: 'Extract insights from video content.',
        category: 'Media',
        cciScore: 75,
        users: 40,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: FileCode
    },
    {
        id: 'mcp43',
        name: 'Time Utility',
        description: 'Get current time and convert timezones.',
        category: 'Utility',
        cciScore: 100,
        users: 1200,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Wrench
    },
    {
        id: 'mcp44',
        name: 'Image Resizer',
        description: 'Process and manipulate images.',
        category: 'Media',
        cciScore: 90,
        users: 150,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Box
    },
    {
        id: 'mcp45',
        name: 'Translation API',
        description: 'Multi-language text translation.',
        category: 'Utility',
        cciScore: 88,
        users: 330,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Globe
    }
];

const MOCK_IDENTITIES: InventoryItem[] = [
    {
        id: 'u1',
        name: 'Alice Engineering',
        description: 'alice@corp.com • Engineering',
        category: 'Internal User',
        cciScore: 85,
        users: 12,
        supplyChainItems: 3,
        status: 'Sanctioned',
        riskLevel: 'High Risk',
        icon: Users
    },
    {
        id: 'u2',
        name: 'Bob Marketing',
        description: 'bob@corp.com • Marketing',
        category: 'Internal User',
        cciScore: 65,
        users: 8,
        supplyChainItems: 1,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Users
    },
    {
        id: 'u3',
        name: 'Charlie Sales',
        description: 'charlie@corp.com • Sales',
        category: 'Internal User',
        cciScore: 92,
        users: 5,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Users
    },
    {
        id: 'eu1',
        name: '192.168.1.1',
        description: 'Unknown Location',
        category: 'External User',
        cciScore: 10,
        users: 1,
        supplyChainItems: 5,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Globe
    },
    {
        id: 'eu2',
        name: '10.0.0.1',
        description: 'USA',
        category: 'External User',
        cciScore: 20,
        users: 1,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Globe
    },
    {
        id: 'sa1',
        name: 'CI/CD Pipeline',
        description: 'Service Account',
        category: 'Service Account',
        cciScore: 90,
        users: 25,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Server
    },
    {
        id: 'sa2',
        name: 'Backup Service',
        description: 'Service Account',
        category: 'Service Account',
        cciScore: 95,
        users: 10,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Server
    },
    {
        id: 'a1',
        name: 'HR Support Bot',
        description: 'Internal Helper Bot',
        category: 'Agent',
        cciScore: 75,
        users: 150,
        supplyChainItems: 2,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: Bot
    },
    {
        id: 'a2',
        name: 'Code Review Agent',
        description: 'Automated Code Review',
        category: 'Agent',
        cciScore: 88,
        users: 45,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Bot
    },
    {
        id: 'a3',
        name: 'Customer Service AI',
        description: 'External Facing Bot',
        category: 'Agent',
        cciScore: 40,
        users: 1200,
        supplyChainItems: 8,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Bot
    }
];

const MOCK_SESSIONS: InventoryItem[] = [
    {
        id: 'sess1',
        name: 'Session #10234',
        description: 'Oct 24, 2023 • 14:30',
        category: 'Session',
        cciScore: 0,
        users: 0,
        promptCount: 42,
        identity: 'alice@corp.com',
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'sess2',
        name: 'Session #10235',
        description: 'Oct 24, 2023 • 15:15',
        category: 'Session',
        cciScore: 0,
        users: 0,
        promptCount: 128,
        identity: 'bob@corp.com',
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: MessageSquare
    },
    {
        id: 'sess3',
        name: 'Session #10236',
        description: 'Oct 24, 2023 • 16:00',
        category: 'Session',
        cciScore: 0,
        users: 0,
        promptCount: 15,
        identity: 'charlie@corp.com',
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Medium Risk',
        icon: MessageSquare
    },
    {
        id: 'sess4',
        name: 'Session #10237',
        description: 'Oct 24, 2023 • 16:45',
        category: 'Session',
        cciScore: 0,
        users: 0,
        promptCount: 200,
        identity: '192.168.1.1',
        supplyChainItems: 0,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: MessageSquare
    },
    {
        id: 'sess5',
        name: 'Session #10238',
        description: 'Oct 24, 2023 • 17:30',
        category: 'Session',
        cciScore: 0,
        users: 0,
        promptCount: 5,
        identity: 'HR Support Bot',
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    },
    {
        id: 'sess6',
        name: 'Session #10239',
        description: 'Oct 25, 2023 • 09:00',
        category: 'Session',
        cciScore: 0,
        users: 0,
        promptCount: 30,
        identity: 'alice@corp.com',
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: MessageSquare
    }
];

// ─── New Platform Mock Data ───────────────────────────────────────────────────

const MOCK_GCP_ITEMS: InventoryItem[] = [
    { id: 'gcp1', name: 'analytics-raw-data-bucket', description: 'gs://analytics-raw-data-bucket · us-central1', category: 'GCS Bucket', cciScore: 72, users: 45, supplyChainItems: 2, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
    { id: 'gcp2', name: 'ml-training-datasets', description: 'gs://ml-training-datasets · us-central1', category: 'GCS Bucket', cciScore: 68, users: 12, supplyChainItems: 1, status: 'Sanctioned', riskLevel: 'Medium Risk', icon: Cloud },
    { id: 'gcp3', name: 'analytics_dataset', description: 'bigquery://gcp-prod-001/analytics_dataset', category: 'BigQuery', cciScore: 85, users: 30, supplyChainItems: 0, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
    { id: 'gcp4', name: 'customer-exports-bucket', description: 'gs://customer-exports-bucket — PII detected', category: 'GCS Bucket', cciScore: 30, users: 8, supplyChainItems: 3, status: 'Unsanctioned', riskLevel: 'High Risk', icon: Cloud },
    { id: 'gcp5', name: 'vertex-ai-model-outputs', description: 'gs://vertex-ai-outputs · us-west1', category: 'GCS Bucket', cciScore: 78, users: 15, supplyChainItems: 0, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
];

const MOCK_ONEDRIVE_ITEMS: InventoryItem[] = [
    { id: 'od1', name: 'Finance Team Drive', description: 'Shared drive for Finance department', category: 'Team Drive', cciScore: 82, users: 35, supplyChainItems: 2, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
    { id: 'od2', name: 'HR Documents', description: 'Employee records and HR policies', category: 'Team Drive', cciScore: 78, users: 15, supplyChainItems: 1, status: 'Sanctioned', riskLevel: 'Medium Risk', icon: Cloud },
    { id: 'od3', name: 'Executive Shared', description: 'C-suite shared documents — restricted', category: 'Team Drive', cciScore: 90, users: 8, supplyChainItems: 0, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
    { id: 'od4', name: 'Engineering Docs', description: 'Technical documentation and specs', category: 'Team Drive', cciScore: 85, users: 120, supplyChainItems: 3, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
    { id: 'od5', name: 'Personal - J.Smith', description: 'Personal drive with unreviewed external shares', category: 'Personal', cciScore: 30, users: 1, supplyChainItems: 0, status: 'Unsanctioned', riskLevel: 'High Risk', icon: Cloud },
    { id: 'od6', name: 'Sales Materials', description: 'Proposals and customer presentations', category: 'Team Drive', cciScore: 75, users: 65, supplyChainItems: 2, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
    { id: 'od7', name: 'Marketing Assets', description: 'Brand assets and campaign materials', category: 'Team Drive', cciScore: 80, users: 40, supplyChainItems: 1, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Cloud },
];

const MOCK_SALESFORCE_ITEMS: InventoryItem[] = [
    { id: 'sf1', name: 'Salesforce Production', description: 'Main CRM instance with live customer data', category: 'CRM', cciScore: 90, users: 450, supplyChainItems: 5, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
    { id: 'sf2', name: 'Salesforce Sandbox', description: 'Development and staging environment', category: 'CRM', cciScore: 75, users: 25, supplyChainItems: 2, status: 'Sanctioned', riskLevel: 'Medium Risk', icon: Database },
    { id: 'sf3', name: 'Marketing Cloud', description: 'Customer engagement and campaign platform', category: 'Marketing', cciScore: 82, users: 120, supplyChainItems: 3, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
    { id: 'sf4', name: 'Service Cloud', description: 'Customer support ticketing and case mgmt', category: 'Support', cciScore: 88, users: 80, supplyChainItems: 1, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
    { id: 'sf5', name: 'Custom Analytics Org', description: 'Unauthorized org — contact data detected', category: 'Analytics', cciScore: 25, users: 5, supplyChainItems: 0, status: 'Unsanctioned', riskLevel: 'High Risk', icon: Database },
    { id: 'sf6', name: 'Revenue Cloud', description: 'CPQ and billing integration', category: 'Revenue', cciScore: 91, users: 35, supplyChainItems: 2, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
    { id: 'sf7', name: 'Experience Cloud Portal', description: 'Partner and customer self-service portal', category: 'Portal', cciScore: 70, users: 200, supplyChainItems: 4, status: 'Sanctioned', riskLevel: 'Medium Risk', icon: Database },
    { id: 'sf8', name: 'Tableau CRM', description: 'Unauthorized analytics workspace', category: 'Analytics', cciScore: 40, users: 8, supplyChainItems: 0, status: 'Unsanctioned', riskLevel: 'High Risk', icon: Database },
    { id: 'sf9', name: 'Field Service Lightning', description: 'Mobile workforce management', category: 'Operations', cciScore: 80, users: 60, supplyChainItems: 1, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
    { id: 'sf10', name: 'Commerce Cloud', description: 'E-commerce storefront data', category: 'Commerce', cciScore: 85, users: 15, supplyChainItems: 2, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Database },
];

const MOCK_GITHUB_ITEMS: InventoryItem[] = [
    { id: 'gh1', name: 'acme-corp/backend-api', description: 'Main backend API repository — Node.js', category: 'Repository', cciScore: 88, users: 45, supplyChainItems: 12, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Code },
    { id: 'gh2', name: 'acme-corp/mobile-app', description: 'iOS and Android React Native codebase', category: 'Repository', cciScore: 85, users: 20, supplyChainItems: 8, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Code },
    { id: 'gh3', name: 'acme-corp/ml-models', description: 'Machine learning model training code', category: 'Repository', cciScore: 72, users: 12, supplyChainItems: 5, status: 'Sanctioned', riskLevel: 'Medium Risk', icon: Code },
    { id: 'gh4', name: 'dev-fork/credentials-dump', description: 'Forked repo — API keys detected in commits', category: 'Repository', cciScore: 5, users: 3, supplyChainItems: 0, status: 'Unsanctioned', riskLevel: 'High Risk', icon: Code },
    { id: 'gh5', name: 'acme-corp/infrastructure', description: 'Terraform and IaC configurations', category: 'Repository', cciScore: 90, users: 8, supplyChainItems: 3, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Code },
    { id: 'gh6', name: 'acme-corp/data-pipelines', description: 'ETL and data processing workflows', category: 'Repository', cciScore: 80, users: 14, supplyChainItems: 6, status: 'Sanctioned', riskLevel: 'Low Risk', icon: Code },
    { id: 'gh7', name: 'acme-corp/legacy-crm', description: 'Deprecated CRM integration — PII in logs', category: 'Repository', cciScore: 35, users: 2, supplyChainItems: 0, status: 'Unsanctioned', riskLevel: 'High Risk', icon: Code },
];

const MOCK_SERVICES: InventoryItem[] = [
    {
        id: 's1',
        name: 'AWS Bedrock',
        description: 'Fully managed service that offers a choice of high-performing foundation models.',
        category: 'Cloud',
        cciScore: 95,
        users: 120,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Cpu
    },
    {
        id: 's2',
        name: 'Azure OpenAI',
        description: 'Cloud service to access OpenAI\'s powerful language models.',
        category: 'Cloud',
        cciScore: 95,
        users: 450,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Cpu
    },
    {
        id: 's3',
        name: 'Google Vertex AI',
        description: 'Machine learning platform that lets you train and deploy ML models and AI applications.',
        category: 'Cloud',
        cciScore: 70,
        users: 320,
        supplyChainItems: 1,
        status: 'Unsanctioned',
        riskLevel: 'Medium Risk',
        icon: Cpu
    },
    {
        id: 's4',
        name: 'Local Ollama',
        description: 'Run Llama 2, Code Llama, and other models locally.',
        category: 'On-prem',
        cciScore: 30,
        users: 15,
        supplyChainItems: 2,
        status: 'Unsanctioned',
        riskLevel: 'High Risk',
        icon: Cpu
    },
    {
        id: 's5',
        name: 'Hugging Face Inference',
        description: 'Run inference on over 100,000 public models via API.',
        category: 'Cloud',
        cciScore: 80,
        users: 85,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Cpu
    },
    {
        id: 's6',
        name: 'Private vLLM Cluster',
        description: 'High-throughput and memory-efficient LLM serving engine.',
        category: 'On-prem',
        cciScore: 90,
        users: 60,
        supplyChainItems: 0,
        status: 'Sanctioned',
        riskLevel: 'Low Risk',
        icon: Cpu
    }
];

interface InventoryViewProps {
    onItemClick?: (item: InventoryItem, type: string) => void;
    initialCategory?: string;
    initialSanctionedFilter?: 'All' | 'Sanctioned' | 'Unsanctioned';
}

export function InventoryView({ onItemClick, initialCategory = 'Drives', initialSanctionedFilter = 'All' }: InventoryViewProps) {
    const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        const defaults: Record<string, boolean> = { 'google-drive': true };
        // Auto-expand the parent group if initial category is a known sub-item
        const managedIds = ['AWS', 'Azure', 'OneDrive', 'GCP', 'Salesforce', 'Github', 'Sharepoint'];
        if (managedIds.includes(initialCategory)) defaults[initialCategory] = true;
        return defaults;
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [riskFilter, setRiskFilter] = useState<'All' | 'High Risk' | 'Medium Risk' | 'Low Risk'>('All');
    const [sanctionedFilter, setSanctionedFilter] = useState<'All' | 'Sanctioned' | 'Unsanctioned'>(initialSanctionedFilter);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const MANAGED_ITEMS = [
        { id: 'google-drive', label: 'Google Drive', count: 20, expandable: true,  children: [{ id: 'Drives', label: 'Drives' }] },
        { id: 'Sharepoint',   label: 'sharepoint',   count: 30, expandable: true,  children: [] },
        { id: 'AWS',          label: 'AWS',           count: 45, expandable: true,  children: [] },
        { id: 'Azure',        label: 'Azure',         count: 15, expandable: true,  children: [] },
        { id: 'OneDrive',     label: 'OneDrive',      count: 25, expandable: true,  children: [] },
        { id: 'GCP',          label: 'GCP Storage',   count: 5,  expandable: true,  children: [] },
        { id: 'Salesforce',   label: 'Salesforce',    count: 10, expandable: true,  children: [] },
        { id: 'Github',       label: 'Github',        count: 5,  expandable: true,  children: [] },
        { id: 'Endpoint',     label: 'Endpoint',      count: 5,  expandable: false },
        { id: 'On-Prem',      label: 'On-Prem',       count: 7,  expandable: false },
    ];
    const UNMANAGED_ITEMS = [
        { id: 'Application',       label: 'Application',       newCount: 1 },
        { id: 'Website',           label: 'Website',           newCount: 5 },
        { id: 'Device Peripheral', label: 'Device Peripheral', newCount: 0 },
    ];
    const IDENTITY_ITEMS = [
        { id: 'Internal User',   label: 'Internal User',   count: 3  },
        { id: 'External User',   label: 'External User',   count: 2  },
        { id: 'Unknown User',    label: 'Unknown User',    count: 18 },
        { id: 'Local User',      label: 'Local User',      count: 14 },
        { id: 'Service Account', label: 'Service Account', count: 2  },
        { id: 'Agent',           label: 'Agent',           count: 8  },
        { id: '3rd Party App',   label: '3rd Party App',   count: 45 },
    ];

    const getCurrentData = () => {
        switch (activeCategory) {
            // ── Managed data stores ───────────────────────────────────────────
            case 'Drives':
            case 'google-drive':
                return MOCK_MCPS.filter(i => i.category === 'Database' || i.category === 'Storage');
            case 'Sharepoint':
            case 'AWS':
            case 'Azure':
            case 'Endpoint':
            case 'On-Prem':
                return MOCK_MCPS.filter(i => i.category === 'Database' || i.category === 'Storage');
            case 'OneDrive':  return MOCK_ONEDRIVE_ITEMS;
            case 'GCP':       return MOCK_GCP_ITEMS;
            case 'Salesforce': return MOCK_SALESFORCE_ITEMS;
            case 'Github':    return MOCK_GITHUB_ITEMS;
            // ── Unmanaged destinations ────────────────────────────────────────
            case 'Application':
            case 'Device Peripheral':
                return MOCK_APPS;
            case 'Website':
                return MOCK_APPS.filter(i => i.category !== 'Conversational AI');
            // ── Identity items ────────────────────────────────────────────────
            case 'Internal User':
            case 'Local User':
                return MOCK_IDENTITIES.filter(i => i.category === 'Internal User');
            case 'External User':
                return MOCK_IDENTITIES.filter(i => i.category === 'External User');
            case 'Unknown User':
                return MOCK_IDENTITIES.filter(i => i.category === 'External User');
            case 'Service Account':
                return MOCK_IDENTITIES.filter(i => i.category === 'Service Account');
            case 'Agent':
                return MOCK_IDENTITIES.filter(i => i.category === 'Agent');
            case '3rd Party App':
                return MOCK_APPS;
            // ── Legacy ───────────────────────────────────────────────────────
            case 'Identities': return MOCK_IDENTITIES;
            case 'Employees': return MOCK_IDENTITIES.filter(i => i.category === 'Internal User');
            case 'Service Accounts': return MOCK_IDENTITIES.filter(i => i.category === 'Service Account');
            case 'External Users': return MOCK_IDENTITIES.filter(i => i.category === 'External User');

            // Assets Group
            case 'Apps': return MOCK_APPS;
            case 'Agents': return MOCK_AGENTS;
            case 'MCPs': return MOCK_MCPS;
            case 'Tools': return MOCK_MCPS.filter(i => i.category === 'Utility' || i.category === 'Media');
            case 'Models': return MOCK_MODELS;
            case 'Services': return MOCK_SERVICES;
            case 'Data Stores': return MOCK_MCPS.filter(i => i.category === 'Database' || i.category === 'Storage');
            case 'Code': return MOCK_MCPS.filter(i => i.category === 'Development');
            case 'Compute': return MOCK_MCPS.filter(i => i.category === 'Compute');
            
            // Legacy/Fallback
            case 'Sessions': return MOCK_SESSIONS;
            default: return [];
        }
    };

    const currentData = getCurrentData();

    const filteredItems = currentData.filter(item => 
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (riskFilter === 'All' || item.riskLevel === riskFilter) &&
        (sanctionedFilter === 'All' || item.status === sanctionedFilter)
    );

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High Risk': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50';
            case 'Medium Risk': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50';
            case 'Low Risk': return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/50';
            default: return 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-100 dark:border-slate-700';
        }
    };

    const handleCardClick = (item: InventoryItem) => {
        if (!onItemClick) return;
        
        let type = 'app';
        switch (activeCategory) {
            case 'Identities': type = 'identity'; break;
            case 'Sessions': type = 'session'; break;
            case 'Services': type = 'service'; break;
            case 'Apps': type = 'app'; break;
            case 'Agents': type = 'agent'; break;
            case 'Models': type = 'model'; break;
            case 'MCPs': type = 'tool'; break; 
            case 'Tools': type = 'tool'; break;
            case 'Datasets': type = 'dataset'; break;
        }
        
        onItemClick(item, type);
    }

    const renderTable = (items: InventoryItem[]) => (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">{activeCategory === 'Sessions' ? 'Identity' : 'Category'}</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Risk Level</th>
                        <th className="px-6 py-4 text-right">{activeCategory === 'Sessions' ? '# Prompts' : activeCategory === 'Identities' ? 'Risk Score' : 'CCI Score'}</th>
                        <th className="px-6 py-4 text-right">{activeCategory === 'Sessions' ? '' : activeCategory === 'Identities' ? 'Apps Accessed' : 'Users'}</th>
                        <th className="px-6 py-4 text-right">{activeCategory === 'Sessions' ? '' : activeCategory === 'Identities' ? 'Alerts' : 'Supply Chain'}</th>
                        <th className="px-6 py-4 w-[50px]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {items.map((item) => (
                        <tr 
                            key={item.id} 
                            onClick={() => handleCardClick(item)}
                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 shrink-0">
                                        <item.icon size={16} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-slate-100">{item.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-500 truncate max-w-[200px]">{item.description}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                {activeCategory === 'Sessions' ? item.identity : item.category}
                            </td>
                            <td className="px-6 py-4">
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide",
                                    item.status === 'Sanctioned' 
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50" 
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700"
                                )}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                    getRiskColor(item.riskLevel)
                                )}>
                                    {item.riskLevel === 'High Risk' && <ShieldAlert size={12} />}
                                    {item.riskLevel === 'Medium Risk' && <AlertTriangle size={12} />}
                                    {item.riskLevel === 'Low Risk' && <ShieldCheck size={12} />}
                                    {item.riskLevel}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-slate-400">
                                {activeCategory === 'Sessions' ? item.promptCount : item.cciScore}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-slate-400">
                                {activeCategory === 'Sessions' ? '' : item.users.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-slate-400">
                                {activeCategory === 'Sessions' ? '' : item.supplyChainItems}
                            </td>
                            <td className="px-6 py-4">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-slate-800" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal size={16} />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderGrid = (items: InventoryItem[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => handleCardClick(item)}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md dark:hover:bg-slate-800/80 transition-shadow flex flex-col h-full group cursor-pointer"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 shrink-0">
                                <item.icon size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 leading-tight truncate pr-2">{item.name}</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-slate-800" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal size={16} />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium border uppercase tracking-wide",
                                        item.status === 'Sanctioned' 
                                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50" 
                                            : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700"
                                    )}>
                                        {item.status}
                                    </span>
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                                        getRiskColor(item.riskLevel)
                                    )}>
                                        {item.riskLevel === 'High Risk' && <ShieldAlert size={10} />}
                                        {item.riskLevel === 'Medium Risk' && <AlertTriangle size={10} />}
                                        {item.riskLevel === 'Low Risk' && <ShieldCheck size={10} />}
                                        {item.riskLevel}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-slate-800 mt-auto">
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            {item.category} <span className="mx-1 text-gray-300 dark:text-slate-600">|</span> {activeCategory === 'Sessions' ? '# Prompts' : activeCategory === 'Identities' ? 'Risk Score' : 'CCI Score'} {activeCategory === 'Sessions' ? item.promptCount : item.cciScore} <span className="mx-1 text-gray-300 dark:text-slate-600">|</span> {activeCategory === 'Sessions' ? '' : `${item.users} ${activeCategory === 'Identities' ? 'Apps' : 'Users'}`}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex h-full w-full bg-gray-50 dark:bg-slate-950 relative">
            {/* Warning Banner */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-pink-500 text-white px-6 py-3 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-sm font-semibold">
                        This is not the Inventory design file. Please refer to the other Figma Make files.
                    </p>
                </div>
            </div>
            
            {/* Left Sidebar — matches Figma reference */}
            <div className="w-[190px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden mt-12">
                <div className="flex-1 overflow-y-auto py-3 select-none">

                    {/* ── DATA STORE/DESTINATION ───────────────────────── */}
                    <div className="mb-2">
                        <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Data Store/Destination
                        </p>

                        {/* MANAGED sub-header */}
                        <div className="flex items-center gap-1.5 px-4 py-1">
                            <div className="w-1.5 h-1.5 rounded-full border border-gray-400 shrink-0" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Managed</span>
                        </div>

                        {MANAGED_ITEMS.map(item => (
                            <div key={item.id}>
                                <button
                                    onClick={() => {
                                        if (item.expandable) {
                                            toggleGroup(item.id);
                                            if (!item.children?.length) setActiveCategory(item.id);
                                        } else {
                                            setActiveCategory(item.id);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center justify-between w-full px-4 py-1.5 text-xs transition-colors",
                                        activeCategory === item.id && !item.children?.length
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    <div className="flex items-center gap-1">
                                        {item.expandable ? (
                                            expandedGroups[item.id]
                                                ? <ChevronDown size={12} className="text-gray-400 shrink-0" />
                                                : <ChevronRight size={12} className="text-gray-400 shrink-0" />
                                        ) : (
                                            <span className="w-3 shrink-0" />
                                        )}
                                        <span>{item.label}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{item.count}</span>
                                </button>

                                {/* Sub-items (e.g., Drives under Google Drive) */}
                                {item.expandable && expandedGroups[item.id] && item.children && item.children.length > 0 && (
                                    <div className="pl-7">
                                        {item.children.map(child => (
                                            <button
                                                key={child.id}
                                                onClick={() => setActiveCategory(child.id)}
                                                className={cn(
                                                    "flex items-center w-full px-3 py-1.5 text-xs rounded-md mx-1 transition-colors",
                                                    activeCategory === child.id
                                                        ? "bg-blue-100 text-blue-700 font-medium"
                                                        : "text-gray-600 hover:bg-gray-50"
                                                )}
                                            >
                                                {child.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* UNMANAGED sub-header */}
                        <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                            <div className="w-1.5 h-1.5 rounded-full border border-gray-400 shrink-0" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Unmanaged</span>
                        </div>

                        {UNMANAGED_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveCategory(item.id)}
                                className={cn(
                                    "flex items-center justify-between w-full px-4 pl-8 py-1.5 text-xs transition-colors",
                                    activeCategory === item.id
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <span>{item.label}</span>
                                {item.newCount > 0 && (
                                    <span className="text-[10px] text-orange-500 font-medium">{item.newCount} new</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 mx-4 my-2" />

                    {/* ── IDENTITY ─────────────────────────────────────── */}
                    <div>
                        <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Identity
                        </p>
                        {IDENTITY_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveCategory(item.id)}
                                className={cn(
                                    "flex items-center justify-between w-full px-4 py-1.5 text-xs transition-colors",
                                    activeCategory === item.id
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <span>{item.label}</span>
                                <span className="text-[10px] text-gray-400">{item.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden mt-12">
                {/* Header / Filter Bar */}
                <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-6 flex flex-col gap-4 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                            <Input 
                                placeholder="Search" 
                                className="pl-9 bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1 mr-2 border border-gray-200 dark:border-slate-700">
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        viewMode === 'grid' 
                                            ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm" 
                                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                                    )}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        viewMode === 'table' 
                                            ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm" 
                                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                                    )}
                                    title="Table View"
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-normal">
                                        Sort by: Number of risks associated
                                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Number of risks associated</DropdownMenuItem>
                                    <DropdownMenuItem>Name</DropdownMenuItem>
                                    <DropdownMenuItem>Date Added</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-normal">
                                        Risk Level: {riskFilter}
                                        <Filter className="ml-2 h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setRiskFilter('All')}>All Risks</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setRiskFilter('High Risk')}>High Risk</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setRiskFilter('Medium Risk')}>Medium Risk</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setRiskFilter('Low Risk')}>Low Risk</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-normal">
                                        Sanctioned: {sanctionedFilter}
                                        <Filter className="ml-2 h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSanctionedFilter('All')}>All</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSanctionedFilter('Sanctioned')}>Sanctioned</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSanctionedFilter('Unsanctioned')}>Unsanctioned</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-normal">
                                        First Since Date:
                                        <Filter className="ml-2 h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Last 7 days</DropdownMenuItem>
                                    <DropdownMenuItem>Last 30 days</DropdownMenuItem>
                                    <DropdownMenuItem>Last 90 days</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Grid/Table Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-950/50">
                    {getCurrentData().length > 0 ? (
                        viewMode === 'grid' ? renderGrid(filteredItems) : renderTable(filteredItems)
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-600">
                            <Wrench className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-gray-500 dark:text-slate-400">No items found</h3>
                            <p>Inventory view for {activeCategory} is empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
