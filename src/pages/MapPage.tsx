import { LocateFixed, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import Filters from '../components/Filters'
import MapView from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import MapDiscoveryRail from '../components/MapDiscoveryRail'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { useLocationStatus } from '../context/LocationContext'
import { placeScore } from '../lib/geo'
import type { Category, Place, PlaceFeature } from '../types'

type SheetSnap = 'collapsed' | 'half' | 'expanded'

const initialSheetSnap = (): SheetSnap => (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 780px)').matches ? 'half' : 'expanded')
const SHEET_SNAPS: SheetSnap[] = ['collapsed', 'half', 'expanded']

export default function MapPage() {
  const { places, toggleLike, isLoading } = usePlaces()
  const { favoriteIds } = useSocial()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Alle'>('Alle')
  const [features, setFeatures] = useState<Set<PlaceFeature>>(new Set())
  const { location, status: locationStatus, error: locationError, requestLocation } = useLocationStatus()
  const [selected, setSelected] = useState<Place | null>(null)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>(initialSheetSnap)
  const [sheetDragOffset, setSheetDragOffset] = useState(0)
  const [isDraggingSheet, setIsDraggingSheet] = useState(false)
  const sheetDragStart = useRef<{ y: number; snap: SheetSnap } | null>(null)
  const lastSheetDragDistance = useRef(0)
  const filtered = useMemo(() => places.filter((place) => place.status === 'active' && (category === 'Alle' || place.category === category) && [...features].every((feature) => place.features?.includes(feature)) && (!query || `${place.name} ${place.description} ${place.category} ${place.address || ''}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => placeScore(b, query, location) - placeScore(a, query, location)), [places, category, features, query, location])
  const trendingIds = useMemo(() => new Set([...places].sort((a, b) => b.likes_count - a.likes_count).slice(0, 3).map((place) => place.id)), [places])
  const toggleFeature = (feature: PlaceFeature) => setFeatures((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next })
  const quickFilter = (value: string) => { setQuery(''); setFeatures(value === 'sunset' ? new Set(['Sonnenuntergang']) : new Set()); setCategory(value === 'baden' ? 'Baden' : value === 'schule' ? 'Schule' : value === 'aussicht' || value === 'sunset' ? 'Aussicht' : 'Alle') }
  const locate = () => { void requestLocation() }
  const cycleSheet = () => {
    if (lastSheetDragDistance.current > 8) {
      lastSheetDragDistance.current = 0
      return
    }
    setSheetSnap((current) => current === 'collapsed' ? 'half' : current === 'half' ? 'expanded' : 'collapsed')
  }
  const dragSheet = (event: PointerEvent<HTMLButtonElement>) => {
    if (!window.matchMedia?.('(max-width: 780px)').matches) return
    sheetDragStart.current = { y: event.clientY, snap: sheetSnap }
    setIsDraggingSheet(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveSheet = (event: PointerEvent<HTMLButtonElement>) => {
    if (!sheetDragStart.current) return
    const offset = Math.max(-130, Math.min(130, event.clientY - sheetDragStart.current.y))
    setSheetDragOffset(offset)
  }
  const settleSheet = (event: PointerEvent<HTMLButtonElement>) => {
    if (!sheetDragStart.current) return
    const delta = event.clientY - sheetDragStart.current.y
    lastSheetDragDistance.current = Math.abs(delta)
    const currentIndex = SHEET_SNAPS.indexOf(sheetDragStart.current.snap)
    const nextIndex = delta > 54 ? currentIndex - 1 : delta < -54 ? currentIndex + 1 : currentIndex
    setSheetSnap(SHEET_SNAPS[Math.max(0, Math.min(SHEET_SNAPS.length - 1, nextIndex))])
    sheetDragStart.current = null
    setSheetDragOffset(0)
    setIsDraggingSheet(false)
  }
  const sheetStyle = { '--sheet-drag-offset': `${sheetDragOffset}px` } as CSSProperties
  return <div className={`map-page map-sheet-${sheetSnap}`}>
    <aside className={`map-sidebar map-sidebar-product sheet-${sheetSnap} ${sheetSnap === 'collapsed' ? 'sheet-closed' : 'sheet-open'} ${isDraggingSheet ? 'sheet-dragging' : ''}`} style={sheetStyle}><button className="sheet-handle" type="button" onClick={cycleSheet} onPointerDown={dragSheet} onPointerMove={moveSheet} onPointerUp={settleSheet} onPointerCancel={settleSheet} aria-label="Kartenergebnisse umschalten" aria-expanded={sheetSnap !== 'collapsed'}><span/></button><div className="map-panel-top"><div><strong>Entdecken</strong><span>{filtered.length} echte Orte</span></div><div className="map-panel-actions"><button className={`map-locate ${locationStatus === 'allowed' ? 'active' : ''}`} onClick={locate} disabled={locationStatus === 'asked'} aria-label={locationStatus === 'allowed' ? 'Standort aktualisieren' : 'Standort aktivieren'}><LocateFixed/></button><button className="sidebar-toggle" type="button" onClick={cycleSheet} aria-label="Kartenergebnisse umschalten">{sheetSnap === 'collapsed' ? <PanelLeftOpen/> : <PanelLeftClose/>}</button></div></div><Filters query={query} onQuery={setQuery} category={category} onCategory={setCategory} features={features} onFeature={toggleFeature} places={places} compactCategories placeholder="Suche echte Orte oder Regionen…" quickSuggestions={[{ label: 'Trending', value: 'trending' }, { label: 'Sunset Spots', value: 'sunset' }, { label: 'Badestellen', value: 'baden' }, { label: 'Schulen', value: 'schule' }]} onQuickSuggestion={quickFilter}/>{locationStatus !== 'unknown' && <p className={`map-location-note location-status-${locationStatus}`}><LocateFixed/>{locationStatus === 'allowed' ? 'Standort nur für Nähe und Distanzen aktiv.' : locationError}</p>}{isLoading ? <div className="loading-state">Orte werden geladen…</div> : filtered.length ? <MapDiscoveryRail places={filtered} location={location} onLike={toggleLike}/> : <div className="empty-state compact-empty"><h2>Noch nichts gefunden</h2><p>Entferne einen Filter oder suche nach einer Stadt oder Region.</p></div>}</aside>
    <section className="map-canvas"><MapView places={filtered} userLocation={location} onSelect={(place) => { setSelected(place); if (window.matchMedia?.('(max-width: 780px)').matches) setSheetSnap('collapsed') }} favoriteIds={favoriteIds} trendingIds={trendingIds} selectedId={selected?.id}/>{selected && <div className="map-selection map-selection-product"><button className="selection-close" onClick={() => setSelected(null)} aria-label="Vorschau schliessen"><X/></button><PlaceCard featured place={selected} userLocation={location} score={placeScore(selected, query, location)} onLike={() => toggleLike(selected.id)}/></div>}</section>
  </div>
}
