

import { getStraightPath, type EdgeProps } from '@xyflow/react'
import { useTopologyContext } from './TopologyContext'

export function RelationshipEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const { hoveredEntityId } = useTopologyContext()
  const isDimmed = hoveredEntityId !== null

  const d = data as { label?: string; noArrow?: boolean; trimTarget?: boolean }
  const label = d?.label
  const noArrow = d?.noArrow ?? false
  const edgeColor = 'var(--muted-foreground)'
  const edgeWidth = 1.5

  // When the target is an ActionNode (diamond), pull the path end back so the
  // arrowhead lands in front of the rotated square rather than underneath it.
  // The diamond's corner-to-center is ACTION_SIZE/2 * sin(45°) ≈ 39px; 14px setback
  // clears the visual boundary comfortably without a large gap.
  const TRIM = 0
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.hypot(dx, dy)
  const trimX = (d?.trimTarget && !noArrow && len > 0) ? (dx / len) * TRIM : 0
  const trimY = (d?.trimTarget && !noArrow && len > 0) ? (dy / len) * TRIM : 0

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX: targetX - trimX,
    targetY: targetY - trimY,
  })

  // Label always at the true midpoint of the full edge
  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  // ReactFlow's built-in MarkerType.Arrow rendered inline via the SVG marker spec
  const markerId = `rf-arrow-${sourceX}-${sourceY}-${targetX}-${targetY}`

  return (
    <g style={{ opacity: isDimmed ? 0.3 : 1, transition: 'opacity 150ms' }}>
      {!noArrow && (
        <defs>
          <marker
            id={markerId}
            markerWidth="12.5"
            markerHeight="12.5"
            refX="6.5"
            refY="4"
            orient="auto-start-reverse"
          >
            <polyline
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,0 6,4 0,8"
              style={{ fill: 'none', stroke: edgeColor, strokeWidth: 1 }}
            />
          </marker>
        </defs>
      )}
      <path
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={edgeWidth}
        markerEnd={noArrow ? undefined : `url(#${markerId})`}
      />
      {label && (() => {
        const CHAR_W = 5.4
        const PAD_X = 8
        const MAX_W = 72
        const LINE_H = 11

        // Split into at most 2 lines at the last word boundary before MAX_W
        const words = label.split(' ')
        let line1 = ''
        let line2 = ''
        for (let i = 0; i < words.length; i++) {
          const candidate = line1 ? `${line1} ${words[i]}` : words[i]
          if (!line2 && candidate.length * CHAR_W + PAD_X * 2 > MAX_W && line1) {
            line2 = words.slice(i).join(' ')
            break
          }
          line1 = candidate
        }

        const twoLine = !!line2
        const pillW = Math.min(
          Math.max(
            line1.length * CHAR_W + PAD_X * 2,
            twoLine ? line2.length * CHAR_W + PAD_X * 2 : 0,
          ),
          MAX_W + PAD_X * 2,
        )
        const pillH = twoLine ? LINE_H * 2 + 6 : LINE_H + 6

        return (
          <g>
            <rect
              x={labelX - pillW / 2}
              y={labelY - pillH / 2}
              width={pillW}
              height={pillH}
              rx={pillH / 2}
              style={{ fill: 'var(--muted-foreground)' }}
            />
            <text
              x={labelX}
              textAnchor="middle"
              style={{ fontSize: 9, fontWeight: 600, fontFamily: 'inherit', fill: 'var(--background)' }}
            >
              {twoLine ? (
                <>
                  <tspan x={labelX} y={labelY - LINE_H / 2} dominantBaseline="central">{line1}</tspan>
                  <tspan x={labelX} y={labelY + LINE_H / 2} dominantBaseline="central">{line2}</tspan>
                </>
              ) : (
                <tspan x={labelX} y={labelY} dominantBaseline="central">{line1}</tspan>
              )}
            </text>
          </g>
        )
      })()}
    </g>
  )
}
