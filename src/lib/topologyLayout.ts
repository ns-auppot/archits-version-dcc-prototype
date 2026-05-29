import { type Node, type Edge } from '@xyflow/react'

type AnyRecord = Record<string, unknown>
import { type TopologyDefinition } from '@/types/topology'

export const NODE_WIDTH = 192 // matches max-w-48
const ACTION_SIZE = 100
const H_GAP = 100
const V_GAP = 60             // visual gap between ActionNode bottom edge and entity top edge
const ENTITY_CARD_HEIGHT = 104 // approximate height for hanging node y-offset calculation
export const CANVAS_HEIGHT = 208
const CANVAS_HEIGHT_WITH_HANGING = 380
const CANVAS_PADDING = 40 // px on each side

// A "hanging" entity is one connected from an action node via the bottom handle
// (i.e., the edge sourceHandle is 'bottom'). These are positioned below the action node
// rather than in the horizontal chain.
function getHangingEntityIds(def: TopologyDefinition): Set<string> {
  const hanging = new Set<string>()
  const actionIds = new Set(def.actions.map((a) => a.id))

  def.edges.forEach((e) => {
    if (actionIds.has(e.source) && e.sourceHandle === 'bottom') {
      hanging.add(e.target)
    }
  })
  return hanging
}

// nodeOrigin={[0.5, 0.5]} is set on the ReactFlow canvas, so position = center point of node.
// All nodes share y=0 to guarantee perfect vertical alignment regardless of card height.

export function computeMinWidth(def: TopologyDefinition): number {
  const hangingIds = getHangingEntityIds(def)
  const actionCount = def.actions.length
  const entityCount = def.entities.filter((e) => !hangingIds.has(e.id)).length
  const nodeCount = entityCount + actionCount
  const totalWidth = entityCount * NODE_WIDTH + actionCount * ACTION_SIZE + (nodeCount - 1) * H_GAP
  return totalWidth + 2 * CANVAS_PADDING
}

export function hasHangingNodes(def: TopologyDefinition): boolean {
  return getHangingEntityIds(def).size > 0
}

// Returns the fixed viewport (zoom=1) that left-aligns content with CANVAS_PADDING from the left.
// The first node is always an entity (nodeOrigin=[0.5,0.5], centered at x=0),
// so its left edge is at -NODE_WIDTH/2; we shift the viewport right by that plus padding.
// For topologies with hanging nodes, the horizontal row sits at y=0 in graph space; we position
// it ~1/3 from the top so the hanging node below fits comfortably.
export function getDefaultViewport(def?: TopologyDefinition) {
  const hasHanging = def && hasHangingNodes(def)
  const rowY = hasHanging ? Math.round(CANVAS_HEIGHT_WITH_HANGING * 0.35) : CANVAS_HEIGHT / 2
  return { x: NODE_WIDTH / 2 + CANVAS_PADDING, y: rowY, zoom: 1 as const }
}

export function getCanvasHeight(def: TopologyDefinition): number {
  return hasHangingNodes(def) ? CANVAS_HEIGHT_WITH_HANGING : CANVAS_HEIGHT
}

export function buildReactFlowGraph(def: TopologyDefinition): { nodes: Node[]; edges: Edge[] } {
  const hangingIds = getHangingEntityIds(def)
  const actionIds = new Set(def.actions.map((a) => a.id))

  const allNodeIds = [
    ...def.entities.filter((e) => !hangingIds.has(e.id)).map((e) => e.id),
    ...def.actions.map((a) => a.id),
  ]

  const orderedIds = orderNodes(allNodeIds, def.edges.filter((e) => !hangingIds.has(e.target)))

  const positions: Record<string, { x: number; y: number }> = {}
  // Track the right edge of the last placed node so every edge is exactly H_GAP wide,
  // regardless of whether adjacent nodes are different widths (entity vs action).
  let rightEdge = 0
  orderedIds.forEach((id, idx) => {
    const isAction = def.actions.some((a) => a.id === id)
    const width = isAction ? ACTION_SIZE : NODE_WIDTH
    const center = idx === 0 ? 0 : rightEdge + H_GAP + width / 2
    positions[id] = { x: center, y: 0 }
    rightEdge = center + width / 2
  })

  // Position hanging entities below their action node
  def.edges.forEach((e) => {
    if (e.sourceHandle === 'bottom' && hangingIds.has(e.target)) {
      const actionPos = positions[e.source]
      if (actionPos) {
        positions[e.target] = {
          x: actionPos.x,
          y: ACTION_SIZE / 2 + V_GAP + ENTITY_CARD_HEIGHT / 2,
        }
      }
    }
  })

  const nodes: Node[] = [
    ...def.entities.map((entity) => ({
      id: entity.id,
      type: 'entityCard' as const,
      position: positions[entity.id] ?? { x: 0, y: 0 },
      data: {
        ...entity,
        _policySeverity: def.severity,
      } as unknown as AnyRecord,
      draggable: false,
    })),
    ...def.actions.map((action) => ({
      id: action.id,
      type: 'actionNode' as const,
      position: positions[action.id] ?? { x: 0, y: 0 },
      data: action as unknown as AnyRecord,
      draggable: false,
    })),
  ]

  const edges: Edge[] = def.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'relationshipEdge',
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: {
      label: e.label,
      noArrow: e.sourceHandle === 'bottom' && hangingIds.has(e.target),
      trimTarget: actionIds.has(e.target),
    },
    animated: false,
  }))

  return { nodes, edges }
}

function orderNodes(allIds: string[], edges: { source: string; target: string }[]): string[] {
  // Build adjacency for ordering
  const inDegree: Record<string, number> = {}
  const outEdges: Record<string, string[]> = {}
  allIds.forEach((id) => { inDegree[id] = 0; outEdges[id] = [] })
  edges.forEach(({ source, target }) => {
    if (inDegree[target] !== undefined) inDegree[target]++
    if (outEdges[source]) outEdges[source].push(target)
  })

  const queue = allIds.filter((id) => inDegree[id] === 0)
  const result: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    outEdges[node]?.forEach((next) => {
      inDegree[next]--
      if (inDegree[next] === 0) queue.push(next)
    })
  }

  // Append any remaining (cycles / disconnected)
  allIds.forEach((id) => { if (!result.includes(id)) result.push(id) })
  return result
}
