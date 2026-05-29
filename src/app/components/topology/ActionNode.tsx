

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { type TopologyAction, type PolicyVerdict } from '@/types/topology'
import { EntityBadge } from './EntityBadge'
import { useTopologyContext } from './TopologyContext'

const VERDICT_PILL: Record<PolicyVerdict, { label: string; border: string; text: string }> = {
  'block':             { label: 'Block',               border: 'border-red-500',   text: 'text-red-600' },
  'user-alert-stop':   { label: 'User Alert · Stop',   border: 'border-red-500',   text: 'text-red-600' },
  'alert':             { label: 'Alert',               border: 'border-amber-500', text: 'text-amber-600' },
  'user-alert-proceed':{ label: 'User Alert · Proceed', border: 'border-amber-500', text: 'text-amber-600' },
  'allow':             { label: 'Allow',               border: 'border-gray-400',  text: 'text-gray-500' },
}

export function ActionNode({ data }: NodeProps) {
  const action = data as unknown as TopologyAction
  const p = VERDICT_PILL[action.policyVerdict] ?? VERDICT_PILL['allow']
  const { hoveredEntityId } = useTopologyContext()
  const isDimmed = hoveredEntityId !== null

  return (
    <div className="relative flex items-center justify-center transition-opacity" style={{ width: 100, height: 100, opacity: isDimmed ? 0.3 : 1 }}>
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" style={{ left: 0, top: '50%' }} />

      {/* Circle shape */}
      <div className="absolute inset-0 rounded-full border bg-card border-border" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 text-center" style={{ width: 90 }}>
        <p className="font-medium leading-tight break-words text-foreground" style={{ fontSize: 'var(--widget-body-sm)' }}>
          {action.label}
        </p>
        {action.badges?.map((badge, i) => (
          <EntityBadge key={i} label={badge.label} severity={badge.severity} />
        ))}
        <div className={`bg-transparent border rounded px-2 py-0.5 leading-tight ${p.border} ${p.text}`} style={{ fontSize: 'var(--widget-body-sm)', fontWeight: 600 }}>
          {p.label}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" style={{ right: 0, top: '50%' }} />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" style={{ bottom: 0, left: '50%' }} />
    </div>
  )
}
