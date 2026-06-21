import { Flame, MapPin, Sparkles } from 'lucide-react'
import type { Coordinates, Place } from '../types'
import PlaceCard from './PlaceCard'
import { distanceKm } from '../lib/geo'
import { Link } from 'react-router-dom'

type Props = { places: Place[]; location: Coordinates | null; onLike: (id: string) => void }

export default function MapDiscoveryRail({ places, location, onLike }: Props) {
  const used = new Set<string>()
  const take = (items: Place[]) => items.filter((place) => !used.has(place.id)).slice(0, 3).map((place) => { used.add(place.id); return place })
  const trending = take([...places].sort((a, b) => b.likes_count + (b.comments_count || 0) * 2 - (a.likes_count + (a.comments_count || 0) * 2)))
  const hidden = take([...places].sort((a, b) => a.likes_count - b.likes_count || (b.photos_count || 0) - (a.photos_count || 0)))
  const near = location ? take([...places].sort((a, b) => distanceKm(location, a) - distanceKm(location, b))) : []
  const sections = [
    { title: 'Trending', icon: Flame, places: trending, featured: true },
    { title: 'Hidden Gems', icon: Sparkles, places: hidden },
    { title: 'In deiner Nähe', icon: MapPin, places: near },
  ]
  return <div className="discovery-rail">{sections.map(({ title, icon: Icon, places: items, featured }) => <section className={`rail-section ${featured ? 'rail-featured' : ''}`} key={title}><div className="rail-heading"><h2><Icon/>{title}</h2><Link to="/discover">Alle</Link></div>{items.length ? <div className="rail-cards">{items.map((place) => <PlaceCard featured={featured} compact={!featured} key={`${title}-${place.id}`} place={place} userLocation={location} onLike={() => onLike(place.id)}/>)}</div> : <div className="rail-empty"><Icon/><span>{title === 'In deiner Nähe' ? 'Standort aktivieren, um reale Distanzen zu sehen.' : 'Hier erscheinen echte Community-Orte, sobald sie passen.'}</span></div>}</section>)}</div>
}
