

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { TopologyCanvas } from './TopologyCanvas'
import { FindingDetailBar } from './FindingDetailBar'
import { EntityDetailPanel } from './EntityDetailPanel'
import { TopologyContext } from './TopologyContext'
import { type TopologyDefinition } from '@/types/topology'
import { type TopologyEntity } from '@/types/topology'

interface FindingTopologyProps {
  definition: TopologyDefinition
  findingId?: string
  detectedAt?: string
  onClose?: () => void
  hideHeader?: boolean
  hideChrome?: boolean
  summaryVariant?: 'inline' | 'grid'
}

export function FindingTopology({
  definition,
  findingId = 'FND-2024-0001',
  detectedAt = '1 hour ago',
  onClose,
  hideHeader,
  hideChrome,
  summaryVariant,
}: FindingTopologyProps) {
  const [selectedEntity, setSelectedEntity] = useState<TopologyEntity | null>(null)
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null)

  const openEntityPanel = useCallback((entity: TopologyEntity) => {
    setSelectedEntity(entity)
  }, [])

  return (
    <TopologyContext.Provider value={{ openEntityPanel, hoveredEntityId, setHoveredEntityId }}>
      <div className={hideChrome ? 'overflow-x-hidden' : 'rounded-xl border border-border bg-card shadow-sm overflow-x-hidden'}>
        {/* Header */}
        {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground" style={{ fontSize: 'var(--widget-body)' }}>{findingId}</span>
            <span className="text-text-dim">·</span>
            <span className="text-muted-foreground" style={{ fontSize: 'var(--widget-body)' }}>Detected {detectedAt}</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        )}

        {/* Canvas */}
        <div className="p-4">
          <TopologyCanvas definition={definition} />
        </div>

        {/* Detail bar */}
        <div className="border-t border-border">
          <FindingDetailBar summary={definition.summary} variant={summaryVariant} />
        </div>
      </div>

      {selectedEntity && (
        <EntityDetailPanel
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </TopologyContext.Provider>
  )
}
