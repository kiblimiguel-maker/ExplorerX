import { CloudSun, LocateFixed, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import Filters from '../components/Filters'
import MapView from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import MapDiscoveryRail from '../components/MapDiscoveryRail'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { placeScore } from '../lib/geo'
import type { Category, Coordinates, Place, PlaceFeature } from '../types'

const savedLocation = () => { try { return JSON.parse(sessionStorage.getItem('explorerx.location') || 'null') as Coordinates | null } catch { return null } }

export default function MapPage() {
  const { places, toggleLike, isLoading } = usePlaces()
  const { favoriteIds } = useSocial()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Alle'>('Alle')
  const [features, setFeatures] = useState<Set<PlaceFeature>>(new Set())
  const [location, setLocation] = useState<Coordinates | null>(savedLocation)
  const [locationError, setLocationError] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)
  const [sheetOpen, setSheetOpen] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 780px)').matches))
  const filtered = useMemo(() => places.filter((place) => place.status === 'active' && (category === 'Alle' || place.category === category) && [...features].every((feature) => place.features?.includes(feature)) && (!query || `${place.name} ${place.description} ${place.category} ${place.address || ''}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => placeScore(b, query, location) - placeScore(a, query, location)), [places, category, features, query, location])
  const trendingIds = useMemo(() => new Set([...places].sort((a, b) => b.likes_count - a.likes_count).slice(0, 3).map((place) => place.id)), [places])
  const toggleFeature = (feature: PlaceFeature) => setFeatures((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next })
  const quickFilter = (value: string) => { setQuery(''); setFeatures(value === 'sunset' ? new Set(['Sonnenuntergang']) : new Set()); setCategory(value === 'baden' ? 'Baden' : value === 'aussicht' || value === 'sunset' ? 'Aussicht' : 'Alle') }
  const locate = () => { setLocationError(''); if (!navigator.geolocation) return setLocationError('Standortfreigabe wird von diesem Browser nicht unterstützt.'); navigator.geolocation.getCurrentPosition((position) => { const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }; setLocation(next); sessionStorage.setItem('explorerx.location', JSON.stringify(next)) }, () => setLocationError('Standort nicht verfügbar. Prüfe die Browserfreigabe.')) }
  return <div className="map-page">
    <aside className={`map-sidebar map-sidebar-product ${sheetOpen ? 'sheet-open' : 'sheet-closed'}`}><button className="sheet-handle" type="button" onClick={() => setSheetOpen((current) => !current)} aria-label={sheetOpen ? 'Ergebnisse einklappen' : 'Ergebnisse öffnen'}><span/></button><div className="map-panel-top"><div><strong>Entdecken</strong><span>{filtered.length} echte Orte</span></div><button className="map-locate" onClick={locate} aria-label="Orte in deiner Nähe"><LocateFixed/></button></div><Filters query={query} onQuery={setQuery} category={category} onCategory={setCategory} features={features} onFeature={toggleFeature} places={places} compactCategories placeholder="Suche nach Seen, Aussichtspunkten, Badestellen oder Städten…" quickSuggestions={[{ label: 'Trending', value: 'trending' }, { label: 'Sunset', value: 'sunset' }, { label: 'Badestellen', value: 'baden' }, { label: 'Aussicht', value: 'aussicht' }]} onQuickSuggestion={quickFilter}/>{locationError && <p className="form-error" role="alert">{locationError}</p>}{isLoading ? <div className="loading-state">Orte werden geladen…</div> : filtered.length ? <MapDiscoveryRail places={filtered} location={location} onLike={toggleLike}/> : <div className="empty-state compact-empty"><h2>Noch nichts gefunden</h2><p>Entferne einen Filter oder suche nach einem neuen Abenteuer.</p></div>}</aside>
    <section className="map-canvas"><MapView places={filtered} userLocation={location} onSelect={(place) => { setSelected(place); setSheetOpen(false) }} favoriteIds={favoriteIds} trendingIds={trendingIds} selectedId={selected?.id}/>{selected && <div className="map-selection map-selection-product"><button className="selection-close" onClick={() => setSelected(null)} aria-label="Vorschau schliessen"><X/></button><PlaceCard featured place={selected} userLocation={location} score={placeScore(selected, query, location)} onLike={() => toggleLike(selected.id)}/><div className="map-weather-placeholder"><CloudSun/><span><strong>Wetter</strong><small>Noch nicht verbunden</small></span></div></div>}</section>
  </div>
}
