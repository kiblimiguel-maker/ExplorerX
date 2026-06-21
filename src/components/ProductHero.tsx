import type { ReactNode } from 'react'

export type HeroMetric = { label: string; value: string | number; icon: ReactNode }

type Props = {
  title: string
  description: string
  className?: string
  aside?: ReactNode
  action?: ReactNode
  metrics?: HeroMetric[]
}

export default function ProductHero({ title, description, className = '', aside, action, metrics = [] }: Props) {
  return (
    <header className={`product-hero ${className}`}>
      <div className="product-hero-copy">
        <h1>{title}</h1>
        <p>{description}</p>
        {action && <div className="product-hero-action">{action}</div>}
      </div>
      {aside && <div className="product-hero-aside">{aside}</div>}
      {metrics.length > 0 && (
        <div className="product-metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.icon}</span>
              <strong>{metric.value}</strong>
              <small>{metric.label}</small>
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
