import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Bookmark, Camera, Footprints, Heart, MessageCircle } from 'lucide-react'
import type { Coordinates, Place } from '../types'
import { useSocial } from '../context/SocialContext'
import SharePlaceButton from './SharePlaceButton'
import UserAvatar from './UserAvatar'
import AvatarGroup from './AvatarGroup'

const categoryColors: Record<string, string> = { Sport: '#49d17d', Baden: '#1488ff', Natur: '#79d15a', Aussicht: '#a66cff', Essen: '#ffb54b', Schule: '#4f8fd8', Treffpunkt: '#ff6d5a', Abenteuer: '#12c7af', Sonstiges: '#95a2b3' }
const categoryGlyphs: Record<string, string> = {
  Sport: '<circle cx="12" cy="6" r="2"/><path d="m10 10 4 2 3-2M10 10l-3 4m7-2-2 6m0-6-3 6"/>',
  Baden: '<path d="M3 9c2 2 4 2 6 0s4-2 6 0 4 2 6 0M3 15c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/>',
  Natur: '<path d="M20 4c-8 0-13 4-13 10 0 3 2 5 5 5 6 0 8-7 8-15Z"/><path d="M7 20c2-5 5-8 10-11"/>',
  Aussicht: '<path d="m3 19 6-10 4 6 2-3 6 7Z"/><path d="m8 11 2 2 2-2"/>',
  Essen: '<path d="M6 3v8m-3-8v5c0 2 6 2 6 0V3m-3 8v10M15 3v18m0-10c5 0 6-8 2-8h-2"/>',
  Schule: '<path d="m3 10 9-6 9 6-9 6-9-6Z"/><path d="M7 13v5h10v-5M21 10v6"/>',
  Treffpunkt: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-4 2-6 5-6s5 2 5 6m-2-4c1-1 3-2 5-2 3 0 5 2 5 6"/>',
  Abenteuer: '<circle cx="12" cy="12" r="8"/><path d="m15 9-2 4-4 2 2-4Z"/>',
  Sonstiges: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
}
const iconFor = (place: Place, variant: 'default' | 'trending' | 'favorite' | 'popular' | 'selected') => L.divIcon({ className: '', html: `<span class="map-pin map-pin-${variant}" style="--pin:${categoryColors[place.category]}"><svg viewBox="0 0 24 24" aria-hidden="true">${categoryGlyphs[place.category]}</svg>${variant !== 'default' && variant !== 'selected' ? `<b class="marker-badge">${variant === 'favorite' ? '♥' : variant === 'trending' ? '↗' : '★'}</b>` : ''}</span>`, iconSize: [46, 54], iconAnchor: [23, 51] })
const clusterIcon = (count: number) => L.divIcon({ className: '', html: `<span class="map-cluster">${count}</span>`, iconSize: [48, 48], iconAnchor: [24, 24] })
const EMPTY_IDS = new Set<string>()

function Recenter({ location }: { location?: Coordinates | null }) { const map = useMap(); useEffect(() => { if (location) map.flyTo([location.latitude, location.longitude], 14) }, [location, map]); return null }
function ClickCapture({ onPick }: { onPick?: (value: Coordinates) => void }) { useMapEvents({ click: (event) => onPick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng }) }); return null }

function ClusteredMarkers({ places, onSelect, favoriteIds, trendingIds, selectedId }: { places: Place[]; onSelect?: (place: Place) => void; favoriteIds: Set<string>; trendingIds: Set<string>; selectedId?: string }) {
  const map = useMap(); const [zoom, setZoom] = useState(map.getZoom())
  const { favoriteIds: accountFavoriteIds, friendVisitCounts, friendVisitorsByPlace, toggleFavorite, visitedIds } = useSocial()
  const savedIds = favoriteIds === EMPTY_IDS ? accountFavoriteIds : favoriteIds
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const groups = useMemo(() => {
    const cell = zoom >= 15 ? 0 : zoom >= 13 ? .008 : .022
    const mapGroups = new Map<string, Place[]>()
    for (const place of places) { const key = cell ? `${Math.round(place.latitude / cell)}:${Math.round(place.longitude / cell)}` : place.id; mapGroups.set(key, [...(mapGroups.get(key) || []), place]) }
    return [...mapGroups.values()]
  }, [places, zoom])
  return <>{groups.map((group) => {
    if (group.length > 1) { const latitude = group.reduce((sum,p) => sum + p.latitude, 0) / group.length; const longitude = group.reduce((sum,p) => sum + p.longitude, 0) / group.length; return <Marker key={group.map(p => p.id).join(':')} position={[latitude, longitude]} icon={clusterIcon(group.length)} eventHandlers={{ click: () => map.flyTo([latitude, longitude], Math.min(17, zoom + 2)) }} /> }
    const place = group[0]
    const variant = selectedId === place.id ? 'selected' : savedIds.has(place.id) ? 'favorite' : trendingIds.has(place.id) ? 'trending' : place.likes_count >= 100 ? 'popular' : 'default'
    const badge = variant === 'trending' ? 'Trending' : place.likes_count < 5 ? 'Hidden Gem' : 'Community Spot'
    return <Marker key={place.id} position={[place.latitude, place.longitude]} icon={iconFor(place, variant)} eventHandlers={{ click: (event) => { onSelect?.(place); event.target.openPopup() }, mouseover: (event) => event.target.openPopup() }}><Popup><article className="map-popup-card"><div className="popup-media">{place.image_url ? <img src={place.image_url} alt={place.name} loading="lazy" decoding="async"/> : <div className="popup-image-fallback">ExplorerX</div>}<span className="popup-badge">{badge}</span><div className="popup-atmosphere"/></div><div className="popup-body"><div className="popup-title-row"><div><strong>{place.name}</strong><small>{place.address || place.category}</small></div><UserAvatar className="micro" url={place.creator?.avatar_url} name={place.creator?.display_name}/></div><div className="popup-social-stats"><span><Heart/>{place.likes_count}</span><span><Bookmark/>{place.favorites_count || 0}</span><span><Camera/>{place.photos_count || (place.image_url ? 1 : 0)}</span><span><MessageCircle/>{place.comments_count || 0}</span><span className={visitedIds.has(place.id) ? 'visited' : ''}><Footprints/>{place.visits_count || 0}</span></div>{(friendVisitCounts.get(place.id) || 0) > 0 && <div className="popup-friend-visits"><AvatarGroup profiles={friendVisitorsByPlace.get(place.id) || []} label={`${friendVisitCounts.get(place.id)} ${friendVisitCounts.get(place.id) === 1 ? 'Freund war' : 'Freunde waren'} hier`}/></div>}<div className="popup-actions"><a className="popup-route" href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`} target="_blank" rel="noreferrer">Route starten</a><SharePlaceButton place={place} className="popup-action" label="Teilen"/><Link className="popup-discover" to={`/places/${place.id}`}>Details öffnen</Link><button className={`popup-action ${savedIds.has(place.id) ? 'saved' : ''}`} onClick={() => void toggleFavorite(place.id)}><Bookmark fill={savedIds.has(place.id) ? 'currentColor' : 'none'}/>{savedIds.has(place.id) ? 'Gespeichert' : 'Speichern'}</button></div></div></article></Popup></Marker>
  })}</>
}

export default function MapView({ places, userLocation, onPick, picked, onSelect, favoriteIds = EMPTY_IDS, trendingIds = EMPTY_IDS, selectedId, className = '' }: { places: Place[]; userLocation?: Coordinates | null; onPick?: (value: Coordinates) => void; picked?: Coordinates | null; onSelect?: (place: Place) => void; favoriteIds?: Set<string>; trendingIds?: Set<string>; selectedId?: string; className?: string }) {
  return <MapContainer className={`map ${className}`} center={[47.3769, 8.5417]} zoom={13} zoomControl={false} scrollWheelZoom>
    <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
    <ClusteredMarkers places={places} onSelect={onSelect} favoriteIds={favoriteIds} trendingIds={trendingIds} selectedId={selectedId}/>
    {picked && <Marker position={[picked.latitude, picked.longitude]} />}
    <Recenter location={picked}/>
    {userLocation && <><Marker position={[userLocation.latitude, userLocation.longitude]} icon={L.divIcon({ className: '', html: '<span class="user-dot"></span>', iconSize: [28, 28], iconAnchor: [14, 14] })}/><Recenter location={userLocation}/></>}
    <ClickCapture onPick={onPick}/>
  </MapContainer>
}
