import { Bookmark, Camera, Footprints, Heart, MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { distanceKm } from '../lib/geo'
import type { Coordinates, Place } from '../types'
import CategoryIcon from './CategoryIcon'
import { useSocial } from '../context/SocialContext'
import SharePlaceButton from './SharePlaceButton'
import UserAvatar from './UserAvatar'
import AvatarGroup from './AvatarGroup'

const APP_STARTED_AT = Date.now()

export default function PlaceCard({ place, rank, userLocation, onLike, compact = false, featured = false, score, confirmFavoriteRemoval = false }: { place: Place; rank?: number; userLocation?: Coordinates | null; onLike?: () => void; compact?: boolean; featured?: boolean; score?: number; confirmFavoriteRemoval?: boolean }) {
  const distance = userLocation ? distanceKm(userLocation, place) : null
  const { favoriteIds, friendVisitCounts, friendVisitorsByPlace, toggleFavorite } = useSocial()
  const ageDays = (APP_STARTED_AT - Date.parse(place.created_at)) / 86_400_000
  const badge = ageDays <= 7 ? 'Neu entdeckt' : place.likes_count >= 20 ? 'Trending' : ''
  return <article className={`place-card ${compact ? 'place-card-compact' : ''} ${featured ? 'place-card-featured' : ''}`}>
    <Link to={`/places/${place.id}`} className="place-image-wrap">
      {rank && <span className="rank-number">{rank}</span>}{badge && <span className={`card-badge badge-${badge.toLowerCase().replace(' ', '-')}`}>{badge}</span>}<span className="place-image-fallback"><MapPin/><small>Kein Foto</small></span>{place.image_url && <img className="place-image" src={place.image_url} alt={place.name} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true }}/>} 
    </Link>
    <div className="place-card-tools"><SharePlaceButton place={place} className="card-tool-button" compact/><button type="button" className={`favorite-button ${favoriteIds.has(place.id) ? 'saved' : ''}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (confirmFavoriteRemoval && favoriteIds.has(place.id) && !window.confirm(`${place.name} aus deinen Favoriten entfernen?`)) return; void toggleFavorite(place.id) }} aria-label={`${place.name} ${favoriteIds.has(place.id) ? 'aus Favoriten entfernen' : 'speichern'}`}><Bookmark size={18} fill={favoriteIds.has(place.id) ? 'currentColor' : 'none'}/></button></div>
    <div className="place-card-body">
      <Link to={`/places/${place.id}`}><h3>{place.name}</h3></Link>
      <p className="distance"><MapPin size={14}/>{distance !== null ? `${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} entfernt` : place.address}</p>
      <div className="card-community"><span className="card-creator"><UserAvatar className="micro" url={place.creator?.avatar_url} name={place.creator?.display_name}/><span><small>Entdeckt von</small><strong>{place.creator?.display_name || 'Community'}</strong></span></span>{Boolean(place.ratings_count) && <div className="rating-line"><strong>{place.rating_average?.toFixed(1)}</strong><span>({place.ratings_count})</span></div>}</div>
      {Boolean((place.photos_count || place.image_url) || place.comments_count || place.visits_count || place.favorites_count) && <div className="card-social-stats" aria-label="Community-Aktivität">{Boolean(place.favorites_count) && <span><Bookmark/>{place.favorites_count}</span>}{Boolean(place.photos_count || place.image_url) && <span><Camera/>{place.photos_count || 1}</span>}{Boolean(place.comments_count) && <span><MessageCircle/>{place.comments_count}</span>}{Boolean(place.visits_count) && <span><Footprints/>{place.visits_count}</span>}</div>}
      {(friendVisitCounts.get(place.id) || 0) > 0 && <div className="card-friend-visits"><AvatarGroup profiles={friendVisitorsByPlace.get(place.id) || []} label={`${friendVisitCounts.get(place.id)} ${friendVisitCounts.get(place.id) === 1 ? 'Freund war' : 'Freunde waren'} hier`}/></div>}
      <div className="place-meta"><span className={`category category-${place.category.toLowerCase()}`}><CategoryIcon category={place.category}/>{place.category}</span>{score !== undefined && <span className="score-label">{Math.round(score)} Punkte</span>}{onLike ? <button className="like-button" onClick={onLike} aria-label={`${place.name} liken`}><Heart size={18}/>{place.likes_count}</button> : <span className="like-count"><Heart size={16}/>{place.likes_count}</span>}</div>
    </div>
  </article>
}
