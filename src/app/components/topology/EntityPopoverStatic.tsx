import { getContextFields } from '@/lib/entityContext'
import { type TopologyEntity, type BadgeSeverity } from '@/types/topology'

const SEVERITY_ORDER: Record<BadgeSeverity, number> = {
  critical: 0, high: 1, medium: 2, info: 3, neutral: 4,
}

const SEVERITY_TEXT: Record<BadgeSeverity, string> = {
  critical: 'text-red-700',
  high:     'text-orange-700',
  medium:   'text-yellow-700',
  info:     'text-blue-700',
  neutral:  'text-gray-600',
}

interface EntityPopoverStaticProps {
  entity: TopologyEntity
  width?: number
}

export function EntityPopoverStatic({ entity, width = 220 }: EntityPopoverStaticProps) {
  const contextFields = getContextFields(entity)
  const sortedBadges = entity.badges
    ? [...entity.badges]
        .filter((b) => (b.details && b.details.length > 0) || b.description)
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : []

  if (contextFields.length === 0 && sortedBadges.length === 0) return null

  return (
    <div style={{ width }} className="bg-popover border border-border rounded-xl shadow-lg overflow-hidden self-start shrink-0">
      <div className={`px-3 py-2 border-b border-border ${entity.isFocal ? 'bg-red-50' : 'bg-muted/40'}`}>
        <p className="font-semibold text-foreground truncate" style={{ fontSize: 'var(--widget-body)' }}>
          {entity.name}
        </p>
      </div>
      <div className="px-3 py-2 space-y-2">
        {contextFields.length > 0 && (
          <div>
            {contextFields.map((f, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-muted-foreground" style={{ fontSize: 'var(--widget-meta)' }}>{f.label}</span>
                <span className="text-foreground font-medium break-all text-right" style={{ fontSize: 'var(--widget-meta)' }}>{f.value}</span>
              </div>
            ))}
          </div>
        )}
        {sortedBadges.length > 0 && (
          <div className="space-y-1">
            {sortedBadges.map((b, i) => (
              <p key={i} style={{ fontSize: 'var(--widget-meta)' }}>
                <span className={`font-semibold ${SEVERITY_TEXT[b.severity]}`}>{b.label}</span>
                {b.details && b.details.length > 0 && (
                  <span className="text-muted-foreground"> — {b.details.join(', ')}</span>
                )}
                {!b.details && b.description && (
                  <span className="text-muted-foreground"> — {b.description}</span>
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
