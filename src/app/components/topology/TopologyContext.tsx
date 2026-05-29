

import { createContext, useContext } from 'react'
import { type TopologyEntity } from '@/types/topology'

interface TopologyContextValue {
  openEntityPanel: (entity: TopologyEntity) => void
  hoveredEntityId: string | null
  setHoveredEntityId: (id: string | null) => void
}

export const TopologyContext = createContext<TopologyContextValue>({
  openEntityPanel: () => {},
  hoveredEntityId: null,
  setHoveredEntityId: () => {},
})

export function useTopologyContext() {
  return useContext(TopologyContext)
}
