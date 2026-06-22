import { LocateFixed, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import Filters from '../components/Filters'
import MapView from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import MapDiscoveryRail from '../components/MapDiscoveryRail'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { useLocationStatus } from '../context/LocationContext'
import { placeScore } from '../lib/geo'
import type { Category, Place, PlaceFeature } from '../types'

export default function MapPage() {
  const { places, toggleLike, isLoading } = usePlaces()
  const { favoriteIds } = useSocial()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Alle'>('Alle')
  const [features, setFeatures] = useState<Set<PlaceFeature>>(new Set())
  const { location, status: locationStatus, error: locationError, requestLocation } = useLocationStatus()
  const [selected, setSelected] = useState<Place | null>(null)
  const [sheetOpen, setSheetOpen] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 780px)').matches))
  const filtered = useMemo(() => places.filter((place) => place.status === 'active' && (category === 'Alle' || place.category === category) && [...features].every((feature) => place.features?.includes(feature)) && (!query || `${place.name} ${place.description} ${place.category} ${place.address || ''}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => placeScore(b, query, location) - placeScore(a, query, location)), [places, category, features, query, location])
  const trendingIds = useMemo(() => new Set([...places].sort((a, b) => b.likes_count - a.likes_count).slice(0, 3).map((place) => place.id)), [places])
  const toggleFeature = (feature: PlaceFeature) => setFeatures((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next })
  const quickFilter = (value: string) => { setQuery(''); setFeatures(value === 'sunset' ? new Set(['Sonnenuntergang']) : new Set()); setCategory(value === 'baden' ? 'Baden' : value === 'schule' ? 'Schule' : value === 'aussicht' || value === 'sunset' ? 'Aussicht' : 'Alle') }
  const locate = () => { void requestLocation() }
  return <div className="map-page">
    <aside className={`map-sidebar map-sidebar-product ${sheetOpen ? 'sheet-open' : 'sheet-closed'}`}><button className="sheet-handle" type="button" onClick={() => setSheetOpen((current) => !current)} aria-label={sheetOpen ? 'Ergebnisse einklappen' : 'Ergebnisse öffnen'}><span/></button><div className="map-panel-top"><div><strong>Entdecken</strong><span>{filtered.length} echte Orte</span></div><div className="map-panel-actions"><button className={`map-locate ${locationStatus === 'allowed' ? 'active' : ''}`} onClick={locate} disabled={locationStatus === 'asked'} aria-label={locationStatus === 'allowed' ? 'Standort aktualisieren' : 'Standort aktivieren'}><LocateFixed/></button><button className="sidebar-toggle" type="button" onClick={() => setSheetOpen((current) => !current)} aria-label={sheetOpen ? 'Seitenleiste einklappen' : 'Seitenleiste öffnen'}>{sheetOpen ? <PanelLeftClose/> : <PanelLeftOpen/>}</button></div></div><Filters query={query} onQuery={setQuery} category={category} onCategory={setCategory} features={features} onFeature={toggleFeature} places={places} compactCategories placeholder="Suche echte Orte oder Regionen…" quickSuggestions={[{ label: 'Trending', value: 'trending' }, { label: 'Sunset Spots', value: 'sunset' }, { label: 'Badestellen', value: 'baden' }, { label: 'Schulen', value: 'schule' }]} onQuickSuggestion={quickFilter}/>{locationStatus !== 'unknown' && <p className={`map-location-note location-status-${locationStatus}`}><LocateFixed/>{locationStatus === 'allowed' ? 'Standort nur für Nähe und Distanzen aktiv.' : locationError}</p>}{isLoading ? <div className="loading-state">Orte werden geladen…</div> : filtered.length ? <MapDiscoveryRail places={filtered} location={location} onLike={toggleLike}/> : <div className="empty-state compact-empty"><h2>Noch nichts gefunden</h2><p>Entferne einen Filter oder suche nach einer Stadt oder Region.</p></div>}</aside>
    <section className="map-canvas"><MapView places={filtered} userLocation={location} onSelect={(place) => { setSelected(place); if (window.matchMedia?.('(max-width: 780px)').matches) setSheetOpen(false) }} favoriteIds={favoriteIds} trendingIds={trendingIds} selectedId={selected?.id}/>{selected && <div className="map-selection map-selection-product"><button className="selection-close" onClick={() => setSelected(null)} aria-label="Vorschau schliessen"><X/></button><PlaceCard featured place={selected} userLocation={location} score={placeScore(selected, query, location)} onLike={() => toggleLike(selected.id)}/></div>}</section>
  </div>
}
