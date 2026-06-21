import { Bookmark, Camera, Footprints, Heart, MapPin, MessageCircle, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { distanceKm } from '../lib/geo'
import type { Coordinates, Place } from '../types'
import CategoryIcon from './CategoryIcon'
import { useSocial } from '../context/SocialContext'
import SharePlaceButton from './SharePlaceButton'
import UserAvatar from './UserAvatar'

const APP_STARTED_AT = Date.now()

export default function PlaceCard({ place, rank, userLocation, onLike, compact = false, featured = false, score, confirmFavoriteRemoval = false }: { place: Place; rank?: number; userLocation?: Coordinates | null; onLike?: () => void; compact?: boolean; featured?: boolean; score?: number; confirmFavoriteRemoval?: boolean }) {
  const distance = userLocation ? distanceKm(userLocation, place) : null
  const { favoriteIds, friendVisitCounts, toggleFavorite } = useSocial()
  const ageDays = (APP_STARTED_AT - Date.parse(place.created_at)) / 86_400_000
  const badge = ageDays <= 7 ? 'Neu entdeckt' : place.likes_count >= 20 ? 'Trending' : place.likes_count < 5 ? 'Hidden Gem' : ''
  return <article className={`place-card ${compact ? 'place-card-compact' : ''} ${featured ? 'place-card-featured' : ''}`}>
    <Link to={`/places/${place.id}`} className="place-image-wrap">
      {rank && <span className="rank-number">{rank}</span>}{badge && <span className={`card-badge badge-${badge.toLowerCase().replace(' ', '-')}`}>{badge}</span>}<span className="place-image-fallback"><MapPin/><small>Kein Foto</small></span>{place.image_url && <img className="place-image" src={place.image_url} alt={place.name} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true }}/>} 
    </Link>
    <div className="place-card-tools"><SharePlaceButton place={place} className="card-tool-button" compact/><button type="button" className={`favorite-button ${favoriteIds.has(place.id) ? 'saved' : ''}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (confirmFavoriteRemoval && favoriteIds.has(place.id) && !window.confirm(`${place.name} aus deinen Favoriten entfernen?`)) return; void toggleFavorite(place.id) }} aria-label={`${place.name} ${favoriteIds.has(place.id) ? 'aus Favoriten entfernen' : 'speichern'}`}><Bookmark size={18} fill={favoriteIds.has(place.id) ? 'currentColor' : 'none'}/></button></div>
    <div className="place-card-body">
      <Link to={`/places/${place.id}`}><h3>{place.name}</h3></Link>
      <p className="distance"><MapPin size={14}/>{distance !== null ? `${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} entfernt` : place.address}</p>
      {!compact && <p className="place-description">{place.description}</p>}
      <div className="card-community"><span className="card-creator"><UserAvatar className="micro" url={place.creator?.avatar_url} name={place.creator?.display_name}/><span><small>Entdeckt von</small><strong>{place.creator?.display_name || 'ExplorerX Community'}</strong></span></span><div className="rating-line">{place.ratings_count ? <><Star size={14} fill="currentColor"/><strong>{place.rating_average?.toFixed(1)}</strong><span>({place.ratings_count})</span></> : <span>Neu entdeckt</span>}</div></div>
      <div className="card-social-stats" aria-label="Community-Aktivität"><span><Camera/>{place.photos_count || (place.image_url ? 1 : 0)}</span><span><MessageCircle/>{place.comments_count || 0}</span><span><Footprints/>{place.visits_count || 0}</span></div>
      {(friendVisitCounts.get(place.id) || 0) > 0 && <p className="card-friend-visits"><Footprints/>{friendVisitCounts.get(place.id)} {friendVisitCounts.get(place.id) === 1 ? 'Freund war' : 'Freunde waren'} hier</p>}
      <div className="place-meta"><span className={`category category-${place.category.toLowerCase()}`}><CategoryIcon category={place.category}/>{place.category}</span>{score !== undefined && <span className="score-label">{Math.round(score)} Punkte</span>}<button className="like-button" onClick={onLike} aria-label={`${place.name} liken`}><Heart size={18}/>{place.likes_count}</button></div>
    </div>
  </article>
}
