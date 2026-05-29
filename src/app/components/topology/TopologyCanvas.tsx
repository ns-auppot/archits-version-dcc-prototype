

import { memo } from 'react'
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EntityCard } from './EntityCard'
import { ActionNode } from './ActionNode'
import { RelationshipEdge } from './RelationshipEdge'
import { buildReactFlowGraph, computeMinWidth, getDefaultViewport, getCanvasHeight } from '@/lib/topologyLayout'
import { type TopologyDefinition } from '@/types/topology'

const nodeTypes = {
  entityCard: EntityCard,
  actionNode: ActionNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

interface TopologyCanvasProps {
  definition: TopologyDefinition
}

function Canvas({ definition }: TopologyCanvasProps) {
  const { nodes, edges } = buildReactFlowGraph(definition)
  const minWidth = computeMinWidth(definition)
  const canvasHeight = getCanvasHeight(definition)
  const viewport = getDefaultViewport(definition)

  return (
    <div
      className="w-full overflow-x-auto rounded-lg"
      style={{ background: 'var(--surface-raised)' }}
    >
      <div style={{ minWidth, height: canvasHeight }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodeOrigin={[0.5, 0.5]}
          defaultViewport={viewport}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onNodeMouseEnter={() => {}}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} color="#c0c8d0" />
        </ReactFlow>
      </div>
    </div>
  )
}

export const TopologyCanvas = memo(function TopologyCanvas(props: TopologyCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
})
