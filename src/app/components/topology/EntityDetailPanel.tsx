

import { X, ExternalLink } from 'lucide-react'
import { ENTITY_ICONS } from '@/lib/entityIcons'
import { formatEntityContext, getContextFields } from '@/lib/entityContext'
import { EntityBadge } from './EntityBadge'
import { type TopologyEntity } from '@/types/topology'

const ENTITY_TYPE_LABELS: Record<string, string> = {
  'file': 'File',
  'column': 'Column',
  'chat-message': 'Chat Message',
  'data-store': 'Data Store',
  'device': 'Device',
  'identity': 'Identity',
  'application': 'Application',
  'website': 'Website',
}

interface EntityDetailPanelProps {
  entity: TopologyEntity
  onClose: () => void
}

export function EntityDetailPanel({ entity, onClose }: EntityDetailPanelProps) {
  const Icon = ENTITY_ICONS[entity.type]
  const typeLabel = ENTITY_TYPE_LABELS[entity.type] ?? entity.type

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-[10001] w-96 bg-card border-4 border-pink-400 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className={`flex items-start gap-3 px-5 py-4 border-b border-border ${entity.isFocal ? 'bg-red-50' : 'bg-muted/30'}`}>
          <div className={`p-2 rounded-lg ${entity.isFocal ? 'bg-red-100' : 'bg-muted'}`}>
            <Icon
              size={18}
              className={entity.isFocal ? 'text-red-500' : 'text-muted-foreground'}
              strokeWidth={1.5}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate" style={{ fontSize: 'var(--widget-title)' }}>
              {entity.name}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--widget-body)' }}>{typeLabel}</p>
            <p className="text-text-dim mt-0.5 truncate" style={{ fontSize: 'var(--widget-meta)' }}>
              {formatEntityContext(entity)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Placeholder notice */}
          <p className="text-pink-500 font-medium" style={{ fontSize: 'var(--widget-body)' }}>
            Use corresponding entity side panel from Inventory.
          </p>

          {/* Context */}
          {(() => {
            const contextFields = getContextFields(entity)
            return contextFields.length > 0 ? (
              <section>
                <p className="text-text-dim uppercase tracking-wide font-medium mb-2" style={{ fontSize: 'var(--widget-label)' }}>
                  Context
                </p>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {contextFields.map((f, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2">
                      <span className="text-muted-foreground" style={{ fontSize: 'var(--widget-body)' }}>{f.label}</span>
                      <span className="font-medium text-foreground text-right" style={{ fontSize: 'var(--widget-body)' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null
          })()}

          {/* Findings / Badges */}
          {entity.badges && entity.badges.length > 0 && (
            <section>
              <p className="text-text-dim uppercase tracking-wide font-medium mb-2" style={{ fontSize: 'var(--widget-label)' }}>
                Findings
              </p>
              <div className="flex flex-wrap gap-1.5">
                {entity.badges.map((b, i) => (
                  <EntityBadge key={i} label={b.label} severity={b.severity} details={b.details} />
                ))}
              </div>
              {entity.badges.map((b, i) =>
                b.details && b.details.length > 0 ? (
                  <div key={i} className="mt-3 rounded-lg border border-border divide-y divide-border">
                    <div className="px-3 py-2 bg-muted/30">
                      <p className="font-medium text-foreground" style={{ fontSize: 'var(--widget-body)' }}>{b.label}</p>
                    </div>
                    {b.details.map((d, j) => (
                      <div key={j} className="px-3 py-1.5">
                        <span className="text-foreground" style={{ fontSize: 'var(--widget-body)' }}>{d}</span>
                      </div>
                    ))}
                  </div>
                ) : null
              )}
            </section>
          )}

          {/* Metrics */}
          {entity.metrics && entity.metrics.length > 0 && (
            <section>
              <p className="text-text-dim uppercase tracking-wide font-medium mb-2" style={{ fontSize: 'var(--widget-label)' }}>
                Metrics
              </p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {entity.metrics.map((m, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2">
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--widget-body)' }}>{m.label}</span>
                    <span className="font-medium text-foreground" style={{ fontSize: 'var(--widget-body)' }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Placeholder sections */}
          <section>
            <p className="text-text-dim uppercase tracking-wide font-medium mb-2" style={{ fontSize: 'var(--widget-label)' }}>
              Activity (placeholder)
            </p>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <p className="text-muted-foreground" style={{ fontSize: 'var(--widget-body)' }}>
                Activity timeline for this {typeLabel.toLowerCase()} will appear here.
              </p>
            </div>
          </section>

          <section>
            <p className="text-text-dim uppercase tracking-wide font-medium mb-2" style={{ fontSize: 'var(--widget-label)' }}>
              Related policies (placeholder)
            </p>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <p className="text-muted-foreground" style={{ fontSize: 'var(--widget-body)' }}>
                Policies referencing this {typeLabel.toLowerCase()} will appear here.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20">
          <button
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors py-2 text-foreground font-medium"
            style={{ fontSize: 'var(--widget-body)' }}
          >
            <ExternalLink size={13} strokeWidth={1.5} />
            Open full {typeLabel} profile
          </button>
        </div>
      </div>
    </>
  )
}
