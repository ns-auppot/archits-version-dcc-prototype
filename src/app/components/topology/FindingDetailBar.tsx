interface FindingDetailBarProps {
  summary: string
  variant?: 'inline' | 'grid'
}

function parseSummaryPairs(summary: string): { key: string; value: string }[] {
  return summary.split(' · ').map((segment) => {
    const idx = segment.indexOf(': ')
    if (idx === -1) return { key: '', value: segment.trim() }
    return { key: segment.slice(0, idx).trim(), value: segment.slice(idx + 2).trim() }
  })
}

export function FindingDetailBar({ summary, variant = 'inline' }: FindingDetailBarProps) {
  if (variant === 'grid') {
    const pairs = parseSummaryPairs(summary)
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 px-4 py-2.5" style={{ fontSize: 'var(--widget-meta)' }}>
        {pairs.map((p, i) => (
          <div key={i} className="flex justify-between gap-3">
            <span className="text-muted-foreground whitespace-nowrap">{p.key}</span>
            <span className="text-foreground font-medium text-right">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <p className="text-xs text-muted-foreground text-center leading-relaxed px-4 py-3">
      {summary}
    </p>
  )
}
