import { useState, type ReactNode } from 'react'

type Props = {
  url?: string | null
  name?: string | null
  className?: string
  imageAlt?: string
  children?: ReactNode
}

export default function UserAvatar({ url, name, className = '', imageAlt = '', children }: Props) {
  const [failedUrl, setFailedUrl] = useState('')
  const initial = (name?.trim() || 'E').slice(0, 1).toUpperCase()
  const showImage = Boolean(url && failedUrl !== url)

  return <span className={`avatar ${className}`.trim()} aria-label={name || 'Explorer'}>
    {showImage ? <img src={url || ''} alt={imageAlt} loading="lazy" decoding="async" onError={() => setFailedUrl(url || '')}/> : initial}
    {children}
  </span>
}
