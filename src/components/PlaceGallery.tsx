import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useState } from 'react'

const GALLERY_PAGE_SIZE = 24

export default function PlaceGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE)
  const safeIndex = Math.min(index, Math.max(0, images.length - 1))
  const active = images[safeIndex]

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

  const activeImage = (
    <img
      src={active}
      alt={`${name}, Bild ${safeIndex + 1} von ${images.length}`}
      decoding="async"
      fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
    />
  )

  const showImage = (itemIndex: number, expand = false) => {
    setIndex(itemIndex)
    if (expand) setFullscreen(true)
  }

  return (
    <div className="gallery-column">
      <div className="detail-photo place-gallery">
        {activeImage}
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
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${name} Galerie`}>
          <button type="button" onClick={() => setFullscreen(false)} aria-label="Vollbild schliessen">
            <X />
          </button>
          {activeImage}
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
