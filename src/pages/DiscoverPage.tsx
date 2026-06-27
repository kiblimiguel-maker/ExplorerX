import { Clock3, Compass, Flame, LocateFixed, Mountain, Sparkles } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import Filters from '../components/Filters'
import PlaceCard from '../components/PlaceCard'
import PremiumEmptyState from '../components/PremiumEmptyState'
import { usePlaces } from '../context/PlacesContext'
import { useLocationStatus } from '../context/LocationContext'
import { distanceKm, placeScore } from '../lib/geo'
import type { Category, Place, PlaceFeature } from '../types'

type DiscoverySection = { title: string; subtitle: string; icon: ReactNode; places: Place[]; tone: string }
export default function DiscoverPage() {
  const { places, toggleLike, isLoading } = usePlaces()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<Category | 'Alle'>('Alle')
  const [features, setFeatures] = useState<Set<PlaceFeature>>(new Set())
  const { location, status: locationStatus, error: locationError, requestLocation } = useLocationStatus()
  const results = useMemo(() => places.filter((place) => place.status === 'active' && (category === 'Alle' || place.category === category) && [...features].every((feature) => place.features?.includes(feature)) && (!deferredQuery || `${place.name} ${place.description} ${place.category} ${place.address || ''}`.toLowerCase().includes(deferredQuery.toLowerCase()))).sort((a, b) => placeScore(b, deferredQuery, location) - placeScore(a, deferredQuery, location)), [places, category, features, deferredQuery, location])
  const sections = useMemo<DiscoverySection[]>(() => {
    const used = new Set<string>()
    const take = (items: Place[], count: number) => {
      const selected = items.filter((place) => !used.has(place.id)).slice(0, count)
      selected.forEach((place) => used.add(place.id))
      return selected
    }
    return [
      { title: 'Trending', subtitle: 'Orte, über die gerade gesprochen wird.', icon: <Flame/>, places: take([...results].sort((a, b) => b.likes_count + (b.comments_count || 0) * 2 + (b.favorites_count || 0) - (a.likes_count + (a.comments_count || 0) * 2 + (a.favorites_count || 0))), 6), tone: 'hot' },
      { title: 'In deiner Nähe', subtitle: 'Nach deiner aktuellen Distanz sortiert.', icon: <LocateFixed/>, places: location ? take([...results].sort((a, b) => distanceKm(location, a) - distanceKm(location, b)), 6) : [], tone: 'near' },
      { title: 'Baden', subtitle: 'Badestellen und Orte am Wasser.', icon: <Sparkles/>, places: take(results.filter((place) => place.category === 'Baden'), 6), tone: 'water' },
      { title: 'Natur', subtitle: 'Ruhige Orte draussen.', icon: <Sparkles/>, places: take(results.filter((place) => place.category === 'Natur'), 6), tone: 'nature' },
      { title: 'Schulen', subtitle: 'Öffentliche Orte rund um Schulen.', icon: <Mountain/>, places: take(results.filter((place) => place.category === 'Schule'), 6), tone: 'school' },
      { title: 'Sunset Spots', subtitle: 'Orte für spätes Licht und Aussicht.', icon: <Mountain/>, places: take(results.filter((place) => place.features?.includes('Sonnenuntergang')), 6), tone: 'sunset' },
      { title: 'Neu entdeckt', subtitle: 'Frisch von der Community veröffentlicht.', icon: <Clock3/>, places: take([...results].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)), 6), tone: 'new' },
    ]
  }, [location, results])
  const showNearbyPrompt = !location && category === 'Alle' && features.size === 0 && !deferredQuery.trim()
  const visibleSections = useMemo(() => sections.filter((section) => section.places.length || (section.title === 'In deiner Nähe' && showNearbyPrompt)), [sections, showNearbyPrompt])
  const toggleFeature = (feature: PlaceFeature) => setFeatures((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next })
  const locate = () => { void requestLocation() }

  return <div className="content-page discover-page discover-product-page social-product-page">
    <header className="discover-ios-intro">
      <div>
        <h1>Wohin zieht es dich heute?</h1>
        <p>Entdecke echte Orte, empfohlen von deiner Community.</p>
      </div>
      <button className="hero-location-button" onClick={locate} disabled={locationStatus === 'asked'}><LocateFixed/> {locationStatus === 'allowed' ? 'Aktualisieren' : locationStatus === 'asked' ? 'Sucht…' : 'Standort'}</button>
    </header>

    <section className="discover-search-stage">
      <Filters
        compactCategories
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
        features={features}
        onFeature={toggleFeature}
        places={places}
        placeholder="Suche nach Orten, Schulen oder Städten…"
        quickSuggestions={[{ label: 'Trending', value: 'trending' }, { label: 'Sunset Spots', value: 'sunset' }, { label: 'Badestellen', value: 'baden' }, { label: 'Schulen', value: 'schule' }]}
        onQuickSuggestion={(value) => {
          setQuery('')
          setFeatures(value === 'sunset' ? new Set(['Sonnenuntergang']) : new Set())
          setCategory(value === 'baden' ? 'Baden' : value === 'schule' ? 'Schule' : value === 'aussicht' || value === 'sunset' ? 'Aussicht' : 'Alle')
        }}
      />
    </section>

    <p className={`status-note discovery-status location-status-${locationStatus}`}>
      <LocateFixed/>
      {locationStatus === 'allowed' ? 'Dein Standort wird nur verwendet, um Distanzen und Orte in deiner Nähe zu zeigen.' : locationError || 'Freiwillig: ExplorerX speichert deine Live-Position nicht in Supabase.'}
    </p>

    {isLoading ? <div className="discovery-loading discovery-loading-premium" role="status"><span/><span/><span/></div> : results.length ? <div className="discovery-sections discovery-sections-premium">
      {visibleSections.map((section) => <section className={`discovery-section discovery-product-section discovery-tone-${section.tone}`} key={section.title}>
        <div className="discovery-heading">
          <div><span>{section.icon}</span><div><h2>{section.title}</h2><p>{section.subtitle}</p></div></div>
          <small>{section.places.length ? `${section.places.length} Orte` : 'Noch keine Treffer'}</small>
        </div>
        {section.places.length ? <div className="discovery-cards discovery-product-rail">
          {section.places.map((place) => <PlaceCard key={place.id} place={place} userLocation={location} onLike={() => toggleLike(place.id)}/>)}
        </div> : <PremiumEmptyState
          compact
          icon={section.icon}
          title={section.title === 'In deiner Nähe' ? 'Standort noch nicht aktiv' : 'Hier gibt es noch nichts Echtes zu zeigen'}
          description={section.title === 'In deiner Nähe' ? 'Aktiviere deinen Standort, damit ExplorerX reale Distanzen berechnen kann.' : 'Sobald passende Community-Orte vorhanden sind, erscheinen sie hier.'}
          action={section.title === 'In deiner Nähe' ? <button className="secondary-button" onClick={locate}><LocateFixed/> Standort aktivieren</button> : undefined}
        />}
      </section>)}
    </div> : <PremiumEmptyState
      icon={<Compass/>}
      title="Für diese Suche gibt es noch keine Orte"
      description="Passe Suche oder Filter an. ExplorerX erzeugt keine künstlichen Einträge."
      action={<button className="secondary-button" onClick={() => { setQuery(''); setCategory('Alle'); setFeatures(new Set()) }}>Suche zurücksetzen</button>}
    />}
  </div>
}
