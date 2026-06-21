import type { ReactNode } from 'react'

export default function PremiumEmptyState({ icon, title, description, action, compact = false }: { icon: ReactNode; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`premium-empty ${compact ? 'premium-empty-compact' : ''}`}>
      <span className="premium-empty-icon">{icon}</span>
      <div><strong>{title}</strong><p>{description}</p></div>
      {action}
    </div>
  )
}
