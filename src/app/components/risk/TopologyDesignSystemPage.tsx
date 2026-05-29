import { EntityBadge } from '@/app/components/topology/EntityBadge'
import { EntityCardShowcase } from '@/app/components/topology/EntityCardShowcase'
import { EntityPopoverStatic } from '@/app/components/topology/EntityPopoverStatic'
import { TopologyCanvas } from '@/app/components/topology/TopologyCanvas'
import { type EntityType, type BadgeSeverity, type TopologyDefinition, type EntityContext, type TopologyEntity } from '@/types/topology'

// Representative context for each entity type in the showcase grid
const DEMO_CONTEXT: Record<EntityType, EntityContext> = {
  'file':         { mimeType: 'text/csv', size: '2.4 MB', exposure: 'Internal', owner: 'admin@corp.com', dateCreated: '2024-01-15', lastModified: '2024-11-03' },
  'column':       { service: 'PostgreSQL', dataStore: 'analytics', table: 'users', database: 'prod_db', schema: 'public', account: 'prod.acme.com', sensitiveRecords: '14,200' },
  'chat-message': { application: 'Slack', sender: 'user@corp.com', appSuite: 'Google Workspace', appCategory: 'Collaboration', instanceName: 'acme.slack.com', exposure: 'Internal', channel: '#engineering' },
  'data-store':   { service: 'Google Drive', account: 'acme.google.com', organization: 'Acme Corporation', driveType: 'Shared Drive', owner: 'it-admin@corp.com', region: 'us-central1', dateCreated: '2020-06-01', lastDiscoveryScan: '2025-01-21' },
  'device':       { managementStatus: 'managed', platform: 'macOS', owner: 'j.smith@corp.com', serialNumber: 'C02XG2JFHTD5', clientVersion: '120.0.1', uniqueDeviceId: 'dev-00a1b2c3' },
  'identity':     { idp: 'Okta', identityType: 'user', status: 'active', group: 'Engineering', orgUnit: 'Platform', dateCreated: '2022-03-15' },
  'application':  { category: 'Cloud Storage', sanctioned: false, destinationType: 'SaaS Application', firstAccess: '2024-08-12', instanceType: 'personal', cciScore: 62 },
  'website':      { urlCategory: 'Personal Webmail', destination: 'gmail.com', destinationType: 'Website', firstAccess: '2024-09-01' },
}

// Demo entities with badges for popover showcase
const DEMO_ENTITIES: Record<EntityType, TopologyEntity> = {
  'file': {
    id: 'demo-file', type: 'file', name: 'employees.csv',
    context: DEMO_CONTEXT['file'],
    isFocal: true,
    badges: [
      { label: 'Sensitive Data Type', severity: 'critical', details: ['SSN', 'Medical Records', 'Email Addresses'] },
      { label: 'Public Access', severity: 'critical' },
    ],
  },
  'column': {
    id: 'demo-column', type: 'column', name: 'ssn',
    context: DEMO_CONTEXT['column'],
    isFocal: true,
    badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Social Security Numbers'] }],
  },
  'chat-message': {
    id: 'demo-chat', type: 'chat-message', name: 'See attached report',
    context: DEMO_CONTEXT['chat-message'],
    isFocal: true,
    badges: [{ label: 'Sensitive Data Type', severity: 'high', details: ['Financial Records', 'Private Keys'] }],
  },
  'data-store': {
    id: 'demo-store', type: 'data-store', name: 'HR Confidential',
    context: DEMO_CONTEXT['data-store'],
    badges: [{ label: 'Exposure: Anyone with Link', severity: 'critical' }],
  },
  'device': {
    id: 'demo-device', type: 'device', name: 'MacBook Pro',
    context: DEMO_CONTEXT['device'],
  },
  'identity': {
    id: 'demo-identity', type: 'identity', name: 'j.smith@corp.com',
    context: DEMO_CONTEXT['identity'],
  },
  'application': {
    id: 'demo-app', type: 'application', name: 'Dropbox',
    context: DEMO_CONTEXT['application'],
    badges: [{ label: 'Unsanctioned', severity: 'high', description: 'This application has not been approved by IT and may not meet security or compliance requirements.' }],
  },
  'website': {
    id: 'demo-website', type: 'website', name: 'gmail.com',
    context: DEMO_CONTEXT['website'],
  },
}

const ENTITY_TYPES: { type: EntityType; label: string; when: string }[] = [
  { type: 'file',         label: 'File',         when: 'A document, spreadsheet, image, or config file in any cloud or on-prem storage.' },
  { type: 'column',       label: 'Column',        when: 'A structured column in a database table or data warehouse.' },
  { type: 'chat-message', label: 'Chat Message',  when: 'A message or thread in a collaboration tool (Slack, Teams, ChatGPT, etc.).' },
  { type: 'data-store',   label: 'Data Store',    when: 'A container of data: S3 bucket, Google Drive, SharePoint site, database.' },
  { type: 'device',       label: 'Device',        when: 'An endpoint — laptop, workstation, mobile, or removable media.' },
  { type: 'identity',     label: 'Identity',      when: 'A user account, service account, or role in an IdP or SaaS application.' },
  { type: 'application',  label: 'Application',   when: 'A SaaS application (sanctioned or unsanctioned) as an upload/paste destination.' },
  { type: 'website',      label: 'Website',       when: 'An unmanaged URL or domain — a destination or source outside sanctioned apps.' },
]

const BADGE_SEVERITIES: { severity: BadgeSeverity; label: string; when: string }[] = [
  { severity: 'critical', label: 'Critical',  when: 'Immediate risk — public exposure, active credential leak, cleartext secrets.' },
  { severity: 'high',     label: 'High',      when: 'Significant risk — inactive access to sensitive data, stale credentials, policy violation.' },
  { severity: 'medium',   label: 'Medium',    when: 'Moderate concern — internal exposure, partial compliance gap, non-critical overpermission.' },
  { severity: 'info',     label: 'Info',      when: 'Contextual metadata — count, age, category label with no direct risk implication.' },
  { severity: 'neutral',  label: 'Neutral',   when: 'Descriptive classification — entity type tags, non-severity status labels.' },
]

// Focal node showcase: one per severity level
const FOCAL_SEVERITIES: BadgeSeverity[] = ['critical', 'high', 'medium', 'info', 'neutral']

// ActionNode verdict examples
const ACTION_VERDICTS: Array<{ label: string; verdict: import('@/types/topology').PolicyVerdict; severity: BadgeSeverity }> = [
  { label: 'Upload',      verdict: 'block',             severity: 'critical' },
  { label: 'Paste / Post', verdict: 'alert',            severity: 'high' },
  { label: 'Download',    verdict: 'user-alert-stop',   severity: 'critical' },
  { label: 'Upload',      verdict: 'user-alert-proceed', severity: 'medium' },
]

// ActionNode with badges example (P29-style)
const ACTION_WITH_BADGES: TopologyDefinition = {
  policyId: 'DEMO-BADGES',
  policyName: '',
  sheet: '',
  summary: '',
  severity: 'medium',
  policyVerdict: 'alert',
  entities: [
    { id: 'src', type: 'identity',   name: 'b.nguyen@corp.com', context: { idp: 'Okta', identityType: 'user', status: 'active' } },
    { id: 'dst', type: 'website',    name: '198.51.100.23',     context: { urlCategory: 'Uncategorized', destination: '198.51.100.23', destinationType: 'Website' } },
    { id: 'file', type: 'file',      name: 'db-export.sql',     context: { mimeType: 'application/sql', size: '112 MB' },
      isFocal: true,
      badges: [{ label: 'Sensitive Data Type', severity: 'medium', details: ['Passwords', 'Private Keys'] }],
    },
  ],
  actions: [
    { id: 'act', label: 'Upload', policyVerdict: 'alert', badges: [
      { label: 'Unencrypted', severity: 'medium' },
      { label: 'FTP', severity: 'medium', description: 'File Transfer Protocol transmits data without encryption.' },
    ]},
  ],
  edges: [
    { id: 'e1', source: 'src',  target: 'act' },
    { id: 'e2', source: 'act',  target: 'dst', label: 'to' },
    { id: 'e3', source: 'act',  target: 'file', sourceHandle: 'bottom', targetHandle: 'top' },
  ],
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-medium text-foreground border-b border-border pb-2 mb-6" style={{ fontSize: 'var(--widget-title)' }}>
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-medium text-foreground mb-3" style={{ fontSize: 'var(--widget-subtitle)' }}>
      {children}
    </h3>
  )
}

function RuleNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--widget-label)' }}>
      {children}
    </p>
  )
}

export function TopologyDesignSystemPage() {
  return (
    <div className="flex-1 overflow-y-auto">
    <main className="max-w-7xl mx-auto py-10 px-6 space-y-16">

      {/* Page title */}
      <div>
        <h1 className="font-medium text-text-bright" style={{ fontSize: 'var(--widget-page-title)' }}>
          Design System
        </h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--widget-page-subtitle)' }}>
          Component reference · visual language rules
        </p>
      </div>

      {/* Section 1: Entity Cards */}
      <section>
        <SectionHeading>Entity Cards</SectionHeading>

        <div className="mb-10">
          <SubHeading>Entity Types</SubHeading>
          <RuleNote>
            EntityCard is used for all first-class data entities. The shape is always a rounded rectangle.
            Left = neutral (context entity). Right = focal (the primary finding entity) — tinted by policy severity.
          </RuleNote>
          <div className="flex flex-col gap-8 mt-5">
            {ENTITY_TYPES.map(({ type, label, when }) => (
              <div key={type} className="flex items-start gap-6">
                {/* Two cards */}
                <div className="flex gap-3 shrink-0">
                  <EntityCardShowcase
                    entity={{ id: `demo-${type}`, type, name: label, context: DEMO_CONTEXT[type] }}
                    disableHover
                  />
                  <EntityCardShowcase
                    entity={{ id: `demo-${type}-focal`, type, name: label, context: DEMO_CONTEXT[type], isFocal: true }}
                    policySeverity="critical"
                    disableHover
                  />
                </div>
                {/* Popover */}
                <EntityPopoverStatic entity={DEMO_ENTITIES[type]} width={220} />
                {/* Label + description */}
                <div className="shrink-0 max-w-xs pt-1">
                  <p className="font-medium text-foreground" style={{ fontSize: 'var(--widget-label)' }}>{label}</p>
                  <RuleNote>{when}</RuleNote>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <SubHeading>Focal Node — Severity Tinting</SubHeading>
          <RuleNote>
            The focal entity's background, border, and icon color are driven by the policy's severity.
            Badge colors on all nodes are also derived from the same policy severity field.
          </RuleNote>
          <div className="flex flex-wrap gap-6 mt-5">
            {FOCAL_SEVERITIES.map((severity) => (
              <div key={severity} className="space-y-2">
                <EntityCardShowcase
                  entity={{ id: `focal-${severity}`, type: 'file', name: 'sensitive-data.csv', context: { mimeType: 'text/csv', size: '1.2 MB' }, isFocal: true,
                    badges: [{ label: 'Sensitive Data Type', severity, details: ['SSN', 'Email'] }],
                  }}
                  policySeverity={severity}
                />
                <p className="font-medium text-foreground capitalize" style={{ fontSize: 'var(--widget-label)' }}>{severity}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Action Nodes */}
      <section>
        <SectionHeading>Action Nodes</SectionHeading>

        <div className="mb-10">
          <SubHeading>Verdicts</SubHeading>
          <RuleNote>
            Use an ActionNode (circle) only when the violation is an action connecting two entities — not a property of a single entity.
            The verdict pill (Block / Alert / Allow) sits at the bottom, below any finding badges.
            Never use an ActionNode for state (e.g. "suspended" is a badge on an Identity, not an ActionNode).
          </RuleNote>
          <div className="flex flex-wrap gap-6 mt-5">
            {ACTION_VERDICTS.map(({ label, verdict, severity }) => (
              <TopologyCanvas
                key={verdict}
                definition={{
                  policyId: verdict,
                  policyName: '',
                  sheet: '',
                  summary: '',
                  severity,
                  policyVerdict: verdict,
                  entities: [],
                  actions: [{ id: 'act', label, policyVerdict: verdict }],
                  edges: [],
                }}
              />
            ))}
          </div>
        </div>

        <div className="mb-10">
          <SubHeading>ActionNode with Finding Badges</SubHeading>
          <RuleNote>
            Attributes of an action (protocol, encryption, cross-region) appear as finding badges on the ActionNode, above the verdict pill.
            Badge colors derive from the policy severity — not individually set.
          </RuleNote>
          <div className="mt-5 max-w-2xl">
            <TopologyCanvas definition={ACTION_WITH_BADGES} />
          </div>
        </div>

        <div className="mb-10">
          <SubHeading>When to use ActionNode</SubHeading>
          <div className="space-y-1 mt-2">
            <p className="text-foreground" style={{ fontSize: 'var(--widget-label)' }}>✓ <strong>Use when:</strong> exfiltration to external app, upload/download to unmanaged destination, paste/post to GenAI, git push to public repo</p>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--widget-label)' }}>✗ <strong>Do not use for:</strong> status flags (suspended, stale), policy conditions, metadata about a single entity</p>
          </div>
        </div>
      </section>

      {/* Section 3: Badges */}
      <section>
        <SectionHeading>Badges</SectionHeading>

        <div className="mb-10">
          <SubHeading>Severity Colors</SubHeading>
          <RuleNote>
            Badge colors are derived from the policy's severity field — all badges on a topology share the same color tier.
            The individual badge severity fields in data are overridden at render time by the policy-level severity.
          </RuleNote>
          <div className="flex flex-wrap gap-6 mt-5">
            {BADGE_SEVERITIES.map(({ severity, label, when }) => (
              <div key={severity} className="space-y-1">
                <EntityBadge label={label} severity={severity} />
                <RuleNote>{when}</RuleNote>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <SubHeading>Badge with Details Count</SubHeading>
          <RuleNote>
            When a badge has a details[] array, a filled count bubble appears.
            Hovering the entity card shows the popover with the full details list.
          </RuleNote>
          <div className="flex flex-wrap gap-4 mt-5">
            {BADGE_SEVERITIES.map(({ severity }) => (
              <EntityBadge key={severity} label="Sensitive Data Type" severity={severity} details={['SSN', 'Medical Records', 'Email Addresses']} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Edges */}
      <section>
        <SectionHeading>Relationship Edges</SectionHeading>
        <RuleNote>
          Every edge should have a short verb label (≤16 chars) completing the sentence: [source] [label] [target].
          For inline risk topologies (with ActionNode): omit the label on e1 (Identity → ActionNode); always include "to" or "from" on e2 (ActionNode → Destination).
          Hanging edges (ActionNode bottom → focal file) have no label and no arrowhead.
          All edges are uniform neutral color and weight.
        </RuleNote>
        <div className="flex flex-wrap gap-6 mt-5">
          {(['contains', 'shared with', 'stored in', 'has access to', 'to'] as const).map((lbl) => (
            <TopologyCanvas
              key={lbl}
              definition={{
                policyId: `edge-${lbl}`,
                policyName: '', sheet: '', summary: '', severity: 'neutral',
                entities: [
                  { id: 'a', type: 'file',       name: 'Source', context: { mimeType: 'text/csv' } },
                  { id: 'b', type: 'data-store', name: 'Target', context: { service: 'S3', account: 'prod' } },
                ],
                actions: [],
                edges: [{ id: 'e1', source: 'a', target: 'b', label: lbl }],
              }}
            />
          ))}
        </div>
      </section>

    </main>
    </div>
  )
}
