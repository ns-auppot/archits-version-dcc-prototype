

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ENTITY_ICONS } from '@/lib/entityIcons'
import { formatEntityContext } from '@/lib/entityContext'
import { EntityBadge } from './EntityBadge'
import { EntityPopover } from './EntityPopover'
import { useTopologyContext } from './TopologyContext'
import { type TopologyEntity, type BadgeSeverity, type EntityBadge as EntityBadgeType } from '@/types/topology'

const SEVERITY_ORDER: Record<BadgeSeverity, number> = {
  critical: 0, high: 1, medium: 2, info: 3, neutral: 4,
}

const FOCAL_STYLES: Record<BadgeSeverity, { card: string; icon: string }> = {
  critical: { card: 'bg-red-50 border-red-200',    icon: 'text-red-400' },
  high:     { card: 'bg-orange-50 border-orange-200', icon: 'text-orange-400' },
  medium:   { card: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-400' },
  info:     { card: 'bg-blue-50 border-blue-200',   icon: 'text-blue-400' },
  neutral:  { card: 'bg-gray-50 border-gray-200',   icon: 'text-gray-400' },
}

interface EntityCardInteractiveProps {
  entity: TopologyEntity
  policySeverity?: BadgeSeverity
  className?: string
  disableHover?: boolean
}

export function EntityCardInteractive({ entity, policySeverity, className, disableHover }: EntityCardInteractiveProps) {
  const effectiveBadges = (badges: EntityBadgeType[] | undefined): EntityBadgeType[] | undefined =>
    policySeverity && badges ? badges.map((b) => ({ ...b, severity: policySeverity })) : badges
  const Icon = ENTITY_ICONS[entity.type]
  const { openEntityPanel, hoveredEntityId, setHoveredEntityId } = useTopologyContext()

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const isDimmed = hoveredEntityId !== null && hoveredEntityId !== entity.id

  return (
    <>
      <div
        onMouseMove={disableHover ? undefined : (e) => setCursorPos({ x: e.clientX, y: e.clientY })}
        onMouseEnter={disableHover ? undefined : () => setHoveredEntityId(entity.id)}
        onMouseLeave={disableHover ? undefined : () => { setCursorPos(null); setHoveredEntityId(null) }}
        onClick={() => openEntityPanel(entity)}
        className={cn(
          'min-w-32 max-w-48 rounded-xl shadow-sm px-3 py-3 flex flex-col items-center text-center gap-1 cursor-pointer transition-all hover:shadow-md hover:scale-[1.03]',
          isDimmed && 'opacity-30',
          entity.isFocal
            ? `border ${FOCAL_STYLES[policySeverity ?? 'neutral'].card}`
            : 'border bg-card border-border',
          className,
        )}
      >
        <Icon
          size={22}
          className={entity.isFocal ? FOCAL_STYLES[policySeverity ?? 'neutral'].icon : 'text-text-dim'}
          strokeWidth={1.5}
        />

        <p className="text-foreground leading-tight break-words max-w-full font-medium" style={{ fontSize: 'var(--widget-body)' }}>
          {entity.name}
        </p>

        <p className="text-muted-foreground leading-tight" style={{ fontSize: 'var(--widget-meta)' }}>
          {formatEntityContext(entity)}
        </p>

        {effectiveBadges(entity.badges)?.length && (
          <div className="flex flex-wrap justify-center gap-1 mt-0.5">
            {[...effectiveBadges(entity.badges)!].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).map((b, i) => (
              <EntityBadge key={i} label={b.label} severity={b.severity} details={b.details} />
            ))}
          </div>
        )}

        {entity.metrics && entity.metrics.length > 0 && (
          <div className="mt-0.5 w-full">
            {entity.metrics.map((m, i) => (
              <p key={i} className="text-muted-foreground leading-tight" style={{ fontSize: 'var(--widget-meta)' }}>
                <span className="text-text-dim">{m.label}:</span> {m.value}
              </p>
            ))}
          </div>
        )}
      </div>

      {cursorPos && (
        <EntityPopover entity={{ ...entity, badges: effectiveBadges(entity.badges) }} cursorPos={cursorPos} />
      )}
    </>
  )
}
