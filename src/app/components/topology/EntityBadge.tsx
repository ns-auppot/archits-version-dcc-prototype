import { cn } from '@/lib/utils'
import { type BadgeSeverity } from '@/types/topology'

const SEVERITY_CLASSES: Record<BadgeSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
  neutral:  'bg-gray-100 text-gray-600 border-gray-200',
}

const COUNT_BUBBLE_CLASSES: Record<BadgeSeverity, string> = {
  critical: 'bg-red-200 text-red-700',
  high:     'bg-orange-200 text-orange-700',
  medium:   'bg-yellow-200 text-yellow-700',
  info:     'bg-blue-200 text-blue-700',
  neutral:  'bg-gray-200 text-gray-600',
}

interface EntityBadgeProps {
  label: string
  severity: BadgeSeverity
  details?: string[]
  className?: string
}

export function EntityBadge({ label, severity, details, className }: EntityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap',
        SEVERITY_CLASSES[severity],
        className
      )}
    >
      {label}
      {details && details.length > 0 && (
        <span className={`rounded-full px-1.5 py-0 leading-none font-bold ${COUNT_BUBBLE_CLASSES[severity]}`}>
          {details.length}
        </span>
      )}
    </span>
  )
}
