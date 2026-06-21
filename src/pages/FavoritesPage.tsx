import { Bookmark, Compass, Grid2X2, Heart, LocateFixed, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PlaceCard from '../components/PlaceCard'
import PremiumEmptyState from '../components/PremiumEmptyState'
import ProductHero from '../components/ProductHero'
import SegmentedControl from '../components/SegmentedControl'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { distanceKm } from '../lib/geo'
import { supabase } from '../lib/supabase'
import type { Category, Coordinates } from '../types'

type FavoriteCategory = 'Alle' | Extract<Category, 'Baden' | 'Aussicht' | 'Essen' | 'Natur' | 'Abenteuer'>
type FavoriteSort = 'recent' | 'liked' | 'near' | 'alpha'
const categories: FavoriteCategory[] = ['Alle', 'Baden', 'Aussicht', 'Essen', 'Natur', 'Abenteuer']

export default function FavoritesPage() {
  const { places, toggleLike } = usePlaces()
  const { favoriteIds, user } = useSocial()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FavoriteCategory>('Alle')
  const [sort, setSort] = useState<FavoriteSort>('recent')
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locationMessage, setLocationMessage] = useState('')
  const favoriteOrder = useMemo(() => new Map([...favoriteIds].map((id, index) => [id, index])), [favoriteIds])
  const favorites = useMemo(() => places.filter((place) => favoriteIds.has(place.id)), [favoriteIds, places])
  const categoryCounts = useMemo(() => favorites.reduce((counts, place) => counts.set(place.category, (counts.get(place.category) || 0) + 1), new Map<Category, number>()), [favorites])
  const popularCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Noch offen'
  const visibleFavorites = useMemo(() => {
    const filtered = favorites.filter((place) => (category === 'Alle' || place.category === category) && (!query.trim() || `${place.name} ${place.category} ${place.address || ''}`.toLowerCase().includes(query.trim().toLowerCase())))
    return filtered.sort((a, b) => {
      if (sort === 'liked') return b.likes_count - a.likes_count
      if (sort === 'near' && location) return distanceKm(location, a) - distanceKm(location, b)
      if (sort === 'alpha') return a.name.localeCompare(b.name, 'de')
      return (favoriteOrder.get(b.id) || 0) - (favoriteOrder.get(a.id) || 0)
    })
  }, [category, favoriteOrder, favorites, location, query, sort])
  const locate = () => {
    if (!navigator.geolocation) return setLocationMessage('Standort ist in diesem Browser nicht verfügbar.')
    navigator.geolocation.getCurrentPosition((position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationMessage('Nach Entfernung sortiert.') }, () => setLocationMessage('Standortfreigabe wurde nicht erteilt.'))
  }
  const changeSort = (value: FavoriteSort) => { setSort(value); if (value === 'near' && !location) locate() }

  return <div className="content-page favorites-page social-product-page">
    <ProductHero
      className="favorites-product-hero"
      title="Deine Favoriten"
      description="Deine persönliche Sammlung für Tage, an denen du einfach raus willst. Gespeichert von dir, empfohlen von der Community."
      aside={<div className="saved-visual"><Bookmark/><span>{favorites.length}</span><small>Lieblingsorte</small></div>}
      metrics={[
        { label: 'Gespeicherte Orte', value: favorites.length, icon: <Bookmark/> },
        { label: 'Kategorien', value: categoryCounts.size, icon: <Grid2X2/> },
        { label: 'Beliebteste Kategorie', value: popularCategory, icon: <Heart/> },
        { label: 'Community-Likes', value: favorites.reduce((sum, place) => sum + place.likes_count, 0), icon: <Sparkles/> },
      ]}
    />

    {favorites.length ? <>
      <section className="collection-toolbar">
        <label className="collection-search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Favoriten durchsuchen…" aria-label="Favoriten durchsuchen"/></label>
        <SegmentedControl value={sort} onChange={changeSort} label="Favoriten sortieren" options={[{ value: 'recent', label: 'Zuletzt gespeichert' }, { value: 'liked', label: 'Meist geliked' }, { value: 'near', label: 'Nächstgelegen' }, { value: 'alpha', label: 'A–Z' }]}/>
      </section>
      {locationMessage && <p className="status-note"><LocateFixed/>{locationMessage}</p>}
      <div className="collection-categories" aria-label="Favoriten nach Kategorie filtern">{categories.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}<span>{item === 'Alle' ? favorites.length : categoryCounts.get(item) || 0}</span></button>)}</div>
      {visibleFavorites.length ? <div className="saved-places-grid">{visibleFavorites.map((place) => <PlaceCard key={place.id} place={place} userLocation={location} confirmFavoriteRemoval onLike={() => toggleLike(place.id)}/>)}</div> : <PremiumEmptyState icon={<Search/>} title="Keine Favoriten gefunden" description="Passe Suche oder Kategorie an, ohne deine Sammlung zu verändern." action={<button className="secondary-button" onClick={() => { setQuery(''); setCategory('Alle') }}>Filter zurücksetzen</button>}/>} 
    </> : <PremiumEmptyState icon={<Compass/>} title={user || !supabase ? 'Noch keine Lieblingsorte gespeichert' : 'Melde dich für Favoriten an'} description="Tippe bei einem echten Ort auf das Lesezeichen. Deine Sammlung erscheint dann genau hier." action={<Link className="primary-button" to={user || !supabase ? '/discover' : '/login'}>{user || !supabase ? 'Orte entdecken' : 'Anmelden'}</Link>}/>} 
  </div>
}
