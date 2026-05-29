

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { EntityCardInteractive } from './EntityCardInteractive'
import { type TopologyEntity, type BadgeSeverity } from '@/types/topology'

export function EntityCard({ data }: NodeProps) {
  const { _policySeverity, ...entity } = data as unknown as TopologyEntity & { _policySeverity?: BadgeSeverity }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="target" id="top" position={Position.Top} className="!opacity-0 !w-0 !h-0" style={{ top: 0, left: '50%' }} />
      <EntityCardInteractive entity={entity} policySeverity={_policySeverity} />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
    </div>
  )
}
