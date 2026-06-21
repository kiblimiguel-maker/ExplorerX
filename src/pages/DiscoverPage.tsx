import { Clock3, Compass, Flame, Footprints, LocateFixed, MapPin, Sparkles, UsersRound } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import Filters from '../components/Filters'
import PlaceCard from '../components/PlaceCard'
import PremiumEmptyState from '../components/PremiumEmptyState'
import ProductHero from '../components/ProductHero'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { distanceKm, placeScore } from '../lib/geo'
import type { Category, Coordinates, Place, PlaceFeature } from '../types'

type DiscoverySection = { title: string; subtitle: string; icon: ReactNode; places: Place[]; tone: string }
const DISCOVERY_NOW = Date.now()

export default function DiscoverPage() {
  const { places, toggleLike, isLoading } = usePlaces()
  const { favoriteIds } = useSocial()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<Category | 'Alle'>('Alle')
  const [features, setFeatures] = useState<Set<PlaceFeature>>(new Set())
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locationMessage, setLocationMessage] = useState('')
  const results = useMemo(() => places.filter((place) => place.status === 'active' && (category === 'Alle' || place.category === category) && [...features].every((feature) => place.features?.includes(feature)) && (!deferredQuery || `${place.name} ${place.description} ${place.category} ${place.address || ''}`.toLowerCase().includes(deferredQuery.toLowerCase()))).sort((a, b) => placeScore(b, deferredQuery, location) - placeScore(a, deferredQuery, location)), [places, category, features, deferredQuery, location])
  const sections = useMemo<DiscoverySection[]>(() => {
    const used = new Set<string>()
    const take = (items: Place[], count: number) => items.filter((place) => !used.has(place.id)).slice(0, count).map((place) => { used.add(place.id); return place })
    const favoriteCategories = new Set(results.filter((place) => favoriteIds.has(place.id)).map((place) => place.category))
    return [
      { title: 'Trending', subtitle: 'Orte mit der stärksten echten Community-Aktivität.', icon: <Flame/>, places: take([...results].sort((a, b) => b.likes_count + (b.comments_count || 0) * 2 + (b.favorites_count || 0) - (a.likes_count + (a.comments_count || 0) * 2 + (a.favorites_count || 0))), 5), tone: 'hot' },
      { title: 'Hidden Gems', subtitle: 'Weniger bekannt, aber voller echter Perspektiven.', icon: <Sparkles/>, places: take([...results].sort((a, b) => a.likes_count - b.likes_count || (b.photos_count || 0) - (a.photos_count || 0)), 5), tone: 'gem' },
      { title: 'In deiner Nähe', subtitle: location ? 'Schnell erreichbar, direkt um dich herum.' : 'Aktiviere den Standort für eine echte Distanzsortierung.', icon: <LocateFixed/>, places: location ? take([...results].sort((a, b) => distanceKm(location, a) - distanceKm(location, b)), 5) : [], tone: 'near' },
      { title: 'Neu entdeckt', subtitle: 'Frisch von der ExplorerX Community veröffentlicht.', icon: <Clock3/>, places: take([...results].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)), 5), tone: 'new' },
      { title: 'Für dich empfohlen', subtitle: favoriteCategories.size ? 'Basierend auf den Kategorien deiner echten Favoriten.' : 'Beliebte Orte, bis deine Favoriten persönlicher werden.', icon: <Compass/>, places: take([...results].sort((a, b) => Number(favoriteCategories.has(b.category)) - Number(favoriteCategories.has(a.category)) || placeScore(b, '', location) - placeScore(a, '', location)), 5), tone: 'personal' },
    ]
  }, [favoriteIds, location, results])
  const activeExplorers = new Set(places.map((place) => place.created_by).filter(Boolean)).size
  const newThisWeek = places.filter((place) => Date.parse(place.created_at) >= DISCOVERY_NOW - 7 * 86_400_000).length
  const toggleFeature = (feature: PlaceFeature) => setFeatures((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next })
  const locate = () => {
    if (!navigator.geolocation) return setLocationMessage('Standort ist in diesem Browser nicht verfügbar.')
    navigator.geolocation.getCurrentPosition((position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationMessage('Orte in deiner Nähe sind jetzt aktiv.') }, () => setLocationMessage('Standort nicht verfügbar. Du kannst trotzdem alle echten Orte entdecken.'))
  }

  return <div className="content-page discover-page discover-product-page social-product-page">
    <ProductHero
      className="discover-product-hero"
      title="Wohin zieht es dich heute?"
      description="Entdecke echte Orte aus deiner Umgebung, empfohlen von der Community."
      action={<button className="hero-location-button" onClick={locate}><LocateFixed/> Orte in meiner Nähe</button>}
      metrics={[
        { label: 'Orte entdeckt', value: places.length, icon: <MapPin/> },
        { label: 'Explorer mit Beiträgen', value: activeExplorers, icon: <UsersRound/> },
        { label: 'Neu diese Woche', value: newThisWeek, icon: <Clock3/> },
        { label: 'Community-Besuche', value: places.reduce((sum, place) => sum + (place.visits_count || 0), 0), icon: <Footprints/> },
      ]}
    />
    <section className="discover-search-stage"><Filters query={query} onQuery={setQuery} category={category} onCategory={setCategory} features={features} onFeature={toggleFeature} places={places} placeholder="Suche nach Seen, Aussichtspunkten, Badestellen oder Städten…" quickSuggestions={[{ label: 'Trending', value: 'trending' }, { label: 'Sunset Spots', value: 'sunset' }, { label: 'Badestellen', value: 'baden' }, { label: 'Aussichtspunkte', value: 'aussicht' }]} onQuickSuggestion={(value) => { setQuery(''); setFeatures(value === 'sunset' ? new Set(['Sonnenuntergang']) : new Set()); setCategory(value === 'baden' ? 'Baden' : value === 'aussicht' || value === 'sunset' ? 'Aussicht' : 'Alle') }}/></section>
    {locationMessage && <p className="status-note discovery-status"><LocateFixed/>{locationMessage}</p>}
    {isLoading ? <div className="discovery-loading discovery-loading-premium" role="status"><span/><span/><span/></div> : results.length ? <div className="discovery-sections discovery-sections-premium">{sections.map((section) => <section className={`discovery-section discovery-product-section discovery-tone-${section.tone}`} key={section.title}><div className="discovery-heading"><div><span>{section.icon}</span><div><h2>{section.title}</h2><p>{section.subtitle}</p></div></div><small>{section.places.length ? `${section.places.length} Orte` : 'Noch keine Treffer'}</small></div>{section.places.length ? <div className="discovery-cards discovery-product-rail">{section.places.map((place, index) => <PlaceCard key={place.id} place={place} featured={index === 0} userLocation={location} onLike={() => toggleLike(place.id)}/>)}</div> : <PremiumEmptyState compact icon={section.icon} title={section.title === 'In deiner Nähe' ? 'Standort noch nicht aktiv' : 'Hier gibt es noch nichts Echtes zu zeigen'} description={section.title === 'In deiner Nähe' ? 'Aktiviere deinen Standort, damit ExplorerX reale Distanzen berechnen kann.' : 'Sobald passende Community-Orte vorhanden sind, erscheinen sie hier.'} action={section.title === 'In deiner Nähe' ? <button className="secondary-button" onClick={locate}><LocateFixed/> Standort aktivieren</button> : undefined}/>}</section>)}</div> : <PremiumEmptyState icon={<Compass/>} title="Für diese Suche gibt es noch keine Orte" description="Passe Suche oder Filter an. ExplorerX erzeugt keine künstlichen Einträge." action={<button className="secondary-button" onClick={() => { setQuery(''); setCategory('Alle'); setFeatures(new Set()) }}>Suche zurücksetzen</button>}/>} 
  </div>
}
