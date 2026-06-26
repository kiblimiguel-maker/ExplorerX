import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

const GALLERY_PAGE_SIZE = 24

export default function PlaceGallery({ images, name, placeId }: { images: string[]; name: string; placeId?: string }) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE)
  const touchStartX = useRef<number | null>(null)
  const lightboxRef = useRef<HTMLDivElement | null>(null)
  const safeIndex = Math.min(index, Math.max(0, images.length - 1))
  const active = images[safeIndex]
  const transitionName = placeId ? `place-image-${placeId.replace(/[^a-zA-Z0-9_-]/g, '-')}` : undefined
  const activeImageStyle = transitionName ? { viewTransitionName: transitionName } as CSSProperties : undefined

  useEffect(() => {
    if (!fullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => lightboxRef.current?.focus(), 0)
    return () => { document.body.style.overflow = previousOverflow }
  }, [fullscreen])

  useEffect(() => {
    if (!active || images.length < 2) return
    const preload = new Image()
    preload.src = images[(safeIndex + 1) % images.length]
  }, [active, images, safeIndex])

  if (!active) {
    return (
      <div className="gallery-column">
        <div className="detail-photo gallery-empty">
          <img src="/icons/icon-192.png" alt="" />
          <strong>Noch kein Foto verfügbar</strong>
          <span>Der Ort wartet auf sein erstes echtes Community-Foto.</span>
        </div>
      </div>
    )
  }

  const move = (step: number) => {
    setIndex((current) => (current + step + images.length) % images.length)
  }

  const onPointerDown = (event: PointerEvent) => {
    if (images.length < 2 || event.pointerType === 'mouse') return
    touchStartX.current = event.clientX
  }

  const onPointerUp = (event: PointerEvent) => {
    if (touchStartX.current === null) return
    const delta = event.clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 42) return
    move(delta > 0 ? -1 : 1)
  }

  const renderActiveImage = (style?: CSSProperties) => (
    <img
      src={active}
      alt={`${name}, Bild ${safeIndex + 1} von ${images.length}`}
      decoding="async"
      fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
      style={style}
    />
  )

  const showImage = (itemIndex: number, expand = false) => {
    setIndex(itemIndex)
    if (expand) setFullscreen(true)
  }

  return (
    <div className="gallery-column">
      <div className="detail-photo place-gallery" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {renderActiveImage(activeImageStyle)}
        <button
          type="button"
          className="gallery-expand"
          onClick={() => setFullscreen(true)}
          aria-label="Galerie im Vollbild öffnen"
        >
          <Expand />
        </button>

        {images.length > 1 && (
          <>
            <button type="button" className="gallery-arrow previous" onClick={() => move(-1)} aria-label="Vorheriges Bild">
              <ChevronLeft />
            </button>
            <button type="button" className="gallery-arrow next" onClick={() => move(1)} aria-label="Nächstes Bild">
              <ChevronRight />
            </button>
            <span className="gallery-count">{safeIndex + 1} / {images.length}</span>
            <div className="gallery-thumbnails">
              {images.slice(0, 12).map((url, itemIndex) => (
                <button
                  type="button"
                  className={itemIndex === safeIndex ? 'active' : ''}
                  key={`${url}-${itemIndex}`}
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Bild ${itemIndex + 1} anzeigen`}
                >
                  <img src={url} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <>
          <div className="gallery-grid" role="region" aria-label={`${name} Fotogalerie`}>
            {images.slice(0, visibleCount).map((url, itemIndex) => (
              <button
                type="button"
                key={`${url}-grid-${itemIndex}`}
                onClick={() => showImage(itemIndex, true)}
                aria-label={`Bild ${itemIndex + 1} im Vollbild öffnen`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="320"
                  height="220"
                />
              </button>
            ))}
          </div>

          {visibleCount < images.length && (
            <button
              className="gallery-more"
              type="button"
              onClick={() => setVisibleCount((current) => current + GALLERY_PAGE_SIZE)}
            >
              Weitere Fotos anzeigen <span>{images.length - visibleCount}</span>
            </button>
          )}
        </>
      )}

      {fullscreen && (
        <div
          className="gallery-lightbox"
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} Galerie`}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFullscreen(false)
            if (event.key === 'ArrowLeft') move(-1)
            if (event.key === 'ArrowRight') move(1)
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <button type="button" onClick={() => setFullscreen(false)} aria-label="Vollbild schliessen">
            <X />
          </button>
          {renderActiveImage()}
          {images.length > 1 && (
            <div className="lightbox-controls">
              <button type="button" onClick={() => move(-1)} aria-label="Vorheriges Bild"><ChevronLeft /></button>
              <span>{safeIndex + 1} / {images.length}</span>
              <button type="button" onClick={() => move(1)} aria-label="Nächstes Bild"><ChevronRight /></button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
