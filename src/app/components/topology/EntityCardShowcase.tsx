import { useState, useCallback } from 'react'
import { TopologyContext } from './TopologyContext'
import { EntityCardInteractive } from './EntityCardInteractive'
import { EntityDetailPanel } from './EntityDetailPanel'
import { type TopologyEntity, type BadgeSeverity } from '@/types/topology'

interface EntityCardShowcaseProps {
  entity: TopologyEntity
  policySeverity?: BadgeSeverity
  disableHover?: boolean
}

export function EntityCardShowcase({ entity, policySeverity, disableHover }: EntityCardShowcaseProps) {
  const [selectedEntity, setSelectedEntity] = useState<TopologyEntity | null>(null)

  const openEntityPanel = useCallback((e: TopologyEntity) => setSelectedEntity(e), [])

  return (
    <TopologyContext.Provider value={{ openEntityPanel, hoveredEntityId: null, setHoveredEntityId: () => {} }}>
      <EntityCardInteractive entity={entity} policySeverity={policySeverity} disableHover={disableHover} />
      {selectedEntity && (
        <EntityDetailPanel entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
      )}
    </TopologyContext.Provider>
  )
}
