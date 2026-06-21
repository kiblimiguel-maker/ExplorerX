export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function PageSkeleton() {
  return <div className="content-page skeleton-page" role="status" aria-label="Inhalt wird geladen"><Skeleton className="skeleton-title"/><div className="card-grid"><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card"/></div></div>
}
