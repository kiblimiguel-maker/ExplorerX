import { Check, Share2 } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { sharePlace } from '../lib/share'
import type { Place } from '../types'

type Props = {
  place: Pick<Place, 'id' | 'name' | 'description'>
  className?: string
  label?: string
  compact?: boolean
}

export default function SharePlaceButton({ place, className = '', label = 'Teilen', compact = false }: Props) {
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const share = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      setFeedback(await sharePlace(place))
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setFeedback('Teilen nicht möglich.')
    }
  }

  return (
    <span className={`share-control ${compact ? 'share-control-compact' : ''}`}>
      <button type="button" className={className} onClick={(event) => void share(event)} aria-label={`${place.name} teilen`}>
        {feedback ? <Check size={18} /> : <Share2 size={18} />}
        {!compact && (feedback || label)}
      </button>
      {compact && feedback && <span className="share-feedback" role="status">{feedback}</span>}
    </span>
  )
}
