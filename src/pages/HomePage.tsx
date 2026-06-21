import { ArrowRight, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import MapView from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import { usePlaces } from '../context/PlacesContext'

export default function HomePage() {
  const { places, toggleLike, isLoading } = usePlaces()
  const popular = [...places].sort((a, b) => b.likes_count - a.likes_count).slice(0, 3)
  return <div className="home-page">
    <section className="home-hero">
      <div className="hero-copy"><h1>Deine Stadt wartet<br/><span>draussen.</span></h1><p>Entdecke besondere Orte in deiner Nähe, teile deine Lieblingsspots und mach mehr aus deiner freien Zeit.</p><div className="hero-actions"><Link className="primary-button" to="/map"><MapPin size={19}/> Orte entdecken</Link><Link className="text-link" to="/add">Eigenen Spot teilen <ArrowRight size={18}/></Link></div><div className="trust-line"><ShieldCheck size={18}/> Keine Live-Standorte. Community-geprüfte Orte.</div></div>
      <div className="hero-map"><MapView places={places.slice(0, 7)}/><div className="map-callout"><Sparkles size={18}/><span><strong>{isLoading ? 'Orte laden…' : `${places.length} Spots`}</strong>{!isLoading && ' warten auf dich'}</span></div></div>
    </section>
    <section className="section popular-preview"><div className="section-heading"><div><h2>Gerade beliebt</h2><p>Die meistgelikten Orte aus der Community.</p></div><Link to="/popular">Alle ansehen <ArrowRight size={17}/></Link></div><div className="card-grid">{popular.map((place, index) => <PlaceCard key={place.id} place={place} rank={index + 1} onLike={() => toggleLike(place.id)}/>)}</div>{!isLoading && !popular.length && <div className="empty-state"><h2>Noch keine Orte</h2><p>Sei die erste Person, die einen öffentlichen Ort teilt.</p><Link className="primary-button" to="/add">Ort hinzufügen</Link></div>}</section>
  </div>
}
