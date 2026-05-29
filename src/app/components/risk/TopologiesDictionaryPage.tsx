import { useState } from 'react'
import { Link } from 'react-router'
import { FindingTopology } from '@/app/components/topology/FindingTopology'
import { topologies, SHEETS } from '@/data/topologies'
import { cn } from '@/lib/utils'

const SEVERITY_CLASSES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
  neutral:  'bg-gray-100 text-gray-600 border-gray-200',
}

export function TopologiesDictionaryPage() {
  const [activeSheet, setActiveSheet] = useState(SHEETS[0])
  const sheetTopologies = topologies.filter((t) => t.sheet === activeSheet)

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="max-w-8xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-medium text-text-bright" style={{ fontSize: 'var(--widget-page-title)' }}>
          UDS Risk Policy Topology Dictionary
        </h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--widget-page-subtitle)' }}>
          {topologies.length} priority-0 policies · {SHEETS.length} risk categories
        </p>
        <Link
          to="/risk/topologies/design"
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-md text-white font-medium transition-colors"
          style={{ fontSize: 'var(--widget-body-sm)', backgroundColor: '#ec4899' }}
        >
          Design System
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-8">
        {SHEETS.map((sheet) => {
          const count = topologies.filter((t) => t.sheet === sheet).length
          const isActive = sheet === activeSheet
          return (
            <button
              key={sheet}
              onClick={() => setActiveSheet(sheet)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
              style={{ fontSize: 'var(--widget-body-sm)' }}
            >
              {sheet}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 leading-none',
                isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )} style={{ fontSize: 'var(--widget-meta)' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Topology grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {sheetTopologies.map((def, i) => (
          <div key={def.policyId}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-foreground tracking-wide font-semibold" style={{ fontSize: 'var(--widget-body-sm)' }}>
                {def.policyId} — {def.policyName}
              </p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0.5 font-semibold leading-none whitespace-nowrap capitalize',
                  SEVERITY_CLASSES[def.severity],
                )}
                style={{ fontSize: 'var(--widget-label)' }}
              >
                {def.severity}
              </span>
            </div>
            <div className="rounded-xl border border-dashed border-pink-400 p-1">
              <FindingTopology
                definition={def}
                hideHeader
                hideChrome
                summaryVariant="grid"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  )
}
