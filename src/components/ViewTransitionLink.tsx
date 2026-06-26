import { Link, useNavigate, type LinkProps } from 'react-router-dom'
import type { MouseEvent } from 'react'

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void
}

export default function ViewTransitionLink({ to, onClick, target, children, ...props }: LinkProps) {
  const navigate = useNavigate()

  const navigateWithTransition = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      target ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) return

    const transitionDocument = document as ViewTransitionDocument
    if (!transitionDocument.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    event.preventDefault()
    transitionDocument.startViewTransition(() => navigate(to))
  }

  return <Link to={to} target={target} onClick={navigateWithTransition} {...props}>{children}</Link>
}
