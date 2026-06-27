import { ArrowLeft, Bookmark, Camera, Flag, Footprints, Heart, MapPin, MessageCircle, ShieldCheck, Sparkles, Star, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CategoryIcon from '../components/CategoryIcon'
import MapView from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import Comments from '../components/Comments'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import PlaceGallery from '../components/PlaceGallery'
import RouteLinks from '../components/RouteLinks'
import CommunityPhotoUpload from '../components/CommunityPhotoUpload'
import { loadCommunityPhotos, type CommunityPhoto } from '../lib/communityPhotos'
import AvatarGroup from '../components/AvatarGroup'
import SharePlaceButton from '../components/SharePlaceButton'
import { formatFriendVisits, loadPlaceCommunity, type PlaceCommunity } from '../lib/placeCommunity'
import UserAvatar from '../components/UserAvatar'

export default function PlaceDetailPage() {
  const { id } = useParams()
  const { places, likedIds, toggleLike, reportPlace, setPlacePhotoCover, adjustSocialCount, isLoading } = usePlaces()
  const { user, favoriteIds, visitedIds, toggleFavorite, toggleVisit, recordProgress } = useSocial()
  const navigate = useNavigate()
  const place = places.find((item) => item.id === id)
  const [reported, setReported] = useState(false)
  const [reportError, setReportError] = useState('')
  const [creator, setCreator] = useState<Profile | null>(null)
  const [photos, setPhotos] = useState<CommunityPhoto[]>([])
  const [community, setCommunity] = useState<PlaceCommunity>({ contributors: [], friendVisitors: [] })
  const [galleryError, setGalleryError] = useState('')

  useEffect(() => {
    if (!id) return
    const creatorId = place?.created_by
    let active = true
    const client = supabase
    if (client) Promise.all([
      creatorId ? client.from('users').select('*').eq('id', creatorId).maybeSingle() : Promise.resolve({ data: null }),
      loadCommunityPhotos(id),
      loadPlaceCommunity(id, user?.id),
    ]).then(([creatorResult, photoRows, communityResult]) => {
      if (!active) return
      setCreator(creatorResult.data as Profile | null)
      setPhotos(photoRows)
      setCommunity(communityResult)
    }).catch(() => { if (active) setGalleryError('Die Community-Galerie konnte nicht vollständig geladen werden.') })
    return () => { active = false }
  }, [id, place?.created_by, user?.id])

  if (isLoading) return <div className="content-page loading-state" role="status">Ort wird geladen…</div>
  if (!place) return <div className="content-page empty-state"><h1>Ort nicht gefunden</h1><p>Dieser Ort wurde entfernt oder ist nicht öffentlich.</p><Link className="primary-button" to="/discover">Orte entdecken</Link></div>

  const similar = places.filter((item) => item.id !== place.id && item.category === place.category).slice(0, 3)
  const galleryImages = [...new Set([place.image_url, ...photos.map((photo) => photo.url)].filter((value): value is string => Boolean(value)))]
  const uploadedPhotos = (newPhotos: CommunityPhoto[]) => {
    setPhotos((current) => [...current, ...newPhotos])
    adjustSocialCount(place.id, 'photos_count', newPhotos.length)
    recordProgress({ photos: newPhotos.length, xp: newPhotos.length * 8 }, newPhotos.length * 8, newPhotos.length === 1 ? 'Foto hochgeladen' : 'Fotos hochgeladen')
    if (!place.image_url && newPhotos[0]) setPlacePhotoCover(place.id, newPhotos[0].url)
  }
  const deletedPhoto = (photo: CommunityPhoto) => {
    const remaining = photos.filter((item) => item.id !== photo.id)
    setPhotos(remaining)
    adjustSocialCount(place.id, 'photos_count', -1)
    recordProgress({ photos: -1 })
    if (place.image_url === photo.url) setPlacePhotoCover(place.id, remaining[0]?.url)
  }
  const report = async () => {
    if (!confirm('Diesen Ort wegen unangemessener oder falscher Inhalte melden?')) return
    setReportError('')
    try {
      await reportPlace(place.id, 'Unangemessener oder falscher Inhalt')
      setReported(true)
      navigate('/discover')
    } catch {
      setReportError('Die Meldung konnte nicht gespeichert werden. Bitte melde dich an oder versuche es später erneut.')
    }
  }
  const friendVisitMessage = formatFriendVisits(community.friendVisitors)

  return <div className="detail-page">
    <Link className="back-link" to="/map"><ArrowLeft size={18}/> Zurück zur Karte</Link>
    <section className="detail-hero">
      <PlaceGallery images={galleryImages} name={place.name} placeId={place.id}/>
      <div className="detail-info">
        <span className={`category category-${place.category.toLowerCase()}`}><CategoryIcon category={place.category}/>{place.category}</span>
        <h1>{place.name}</h1>
        <p className="detail-address"><MapPin size={18}/>{place.address || 'Öffentlicher Ort'}</p>
        <p className="detail-description">{place.description}</p>
        <div className="detail-rating"><Star fill="currentColor"/><strong>{place.rating_average?.toFixed(1) || 'Neu'}</strong><span>{place.ratings_count ? `${place.ratings_count} Bewertungen` : 'Noch keine Bewertungen'}</span></div>
        <div className="creator-row"><UserAvatar className="small" url={creator?.avatar_url} name={creator?.display_name}/><div><small>Entdeckt von</small><strong>{creator?.display_name || 'ExplorerX Community'}</strong></div><Sparkles/></div>
        <div className="detail-community-strip">
          <span><Heart/><strong>{place.likes_count}</strong><small>Likes</small></span>
          <span><Bookmark/><strong>{place.favorites_count || 0}</strong><small>Gespeichert</small></span>
          <span><Camera/><strong>{place.photos_count || photos.length}</strong><small>Fotos</small></span>
          <span><MessageCircle/><strong>{place.comments_count || 0}</strong><small>Kommentare</small></span>
          <span><Footprints/><strong>{place.visits_count || 0}</strong><small>Waren hier</small></span>
        </div>
        {(community.contributors.length > 0 || friendVisitMessage) && <div className="detail-community-people"><AvatarGroup profiles={community.contributors} label="Community-Beiträge"/>{friendVisitMessage && <p><UsersRound/>{friendVisitMessage}</p>}</div>}
        <div className="detail-actions">
          <button className={`primary-button ${likedIds.has(place.id) ? 'liked' : ''}`} onClick={() => toggleLike(place.id)}><Heart size={19} fill={likedIds.has(place.id) ? 'currentColor' : 'none'}/>{place.likes_count} {place.likes_count === 1 ? 'Like' : 'Likes'}</button>
          <RouteLinks latitude={place.latitude} longitude={place.longitude}/>
          <button className={`secondary-button ${favoriteIds.has(place.id) ? 'saved' : ''}`} onClick={() => toggleFavorite(place.id)}><Bookmark size={18} fill={favoriteIds.has(place.id) ? 'currentColor' : 'none'}/>{favoriteIds.has(place.id) ? 'Gespeichert' : 'Speichern'}</button>
          <SharePlaceButton place={place} className="secondary-button"/>
          <button className={`secondary-button visit-button ${visitedIds.has(place.id) ? 'visited' : ''}`} onClick={() => void toggleVisit(place.id)}><Footprints/>{visitedIds.has(place.id) ? 'War hier' : 'Ich war hier'}</button>
        </div>
        <CommunityPhotoUpload placeId={place.id} userId={user?.id} photos={photos} onUploaded={uploadedPhotos} onDeleted={deletedPhoto}/>
        {galleryError && <p className="form-error" role="alert">{galleryError}</p>}
        <div className="safety-note"><ShieldCheck size={19}/><span><strong>Öffentlicher Treffpunkt</strong> Teile nie deinen Live-Standort mit Unbekannten. Prüfe Treffpunkte im Zweifel mit einer erwachsenen Vertrauensperson.</span></div>
        <button className="report-button" onClick={report} disabled={reported}><Flag size={16}/>{reported ? 'Danke, Meldung gespeichert' : 'Problematischen Ort melden'}</button>
        {reportError && <p className="form-error" role="alert">{reportError}</p>}
      </div>
    </section>
    <section className="detail-map"><MapView places={[place]}/></section>
    <Comments placeId={place.id} onCountChange={(delta) => adjustSocialCount(place.id, 'comments_count', delta)}/>
    {similar.length > 0 && <section className="section"><div className="section-heading"><div><h2>Ähnliche Spots</h2><p>Mehr aus der Kategorie {place.category}.</p></div></div><div className="card-grid">{similar.map((item) => <PlaceCard key={item.id} place={item} onLike={() => toggleLike(item.id)}/>)}</div></section>}
  </div>
}
